#!/usr/bin/env node

import http from 'node:http';
import { URL } from 'node:url';
import { fileURLToPath } from 'node:url';

const LOOPBACK_HOST = '127.0.0.1';

const FIXTURE_USERS = Object.freeze({
    member: {
        id: '00000000-0000-4000-8000-000000000101',
        email: 'member.fixture@example.invalid',
        role: 'MEMBER',
        team_id: '00000000-0000-4000-8000-000000000201',
        full_name: 'Fixture Member',
        created_at: '2026-05-11T00:00:00.000Z',
    },
    'team-manager': {
        id: '00000000-0000-4000-8000-000000000102',
        email: 'team-manager.fixture@example.invalid',
        role: 'TEAM_MANAGER',
        team_id: '00000000-0000-4000-8000-000000000201',
        full_name: 'Fixture Team Manager',
        created_at: '2026-05-11T00:00:00.000Z',
    },
    admin: {
        id: '00000000-0000-4000-8000-000000000103',
        email: 'admin.fixture@example.invalid',
        role: 'ADMIN',
        team_id: '00000000-0000-4000-8000-000000000202',
        full_name: 'Fixture Admin',
        created_at: '2026-05-11T00:00:00.000Z',
    },
    'super-admin': {
        id: '00000000-0000-4000-8000-000000000104',
        email: 'super-admin.fixture@example.invalid',
        role: 'SUPER_ADMIN',
        team_id: '00000000-0000-4000-8000-000000000202',
        full_name: 'Fixture Super Admin',
        created_at: '2026-05-11T00:00:00.000Z',
    },
});

const FIXTURE_TEAMS = Object.freeze([
    { id: '00000000-0000-4000-8000-000000000201', name: 'Fixture Team One' },
    { id: '00000000-0000-4000-8000-000000000202', name: 'Fixture Team Two' },
]);

const FIXTURE_TEAM_ACCOUNT_MAP = Object.freeze([
    {
        id: '00000000-0000-4000-8000-000000000301',
        team_id: '00000000-0000-4000-8000-000000000201',
        account_id: 'fixture-account-001',
        ad_account_id: 'fixture-account-001',
        platform: 'META',
        created_at: '2026-05-11T00:00:00.000Z',
    },
    {
        id: '00000000-0000-4000-8000-000000000302',
        team_id: '00000000-0000-4000-8000-000000000202',
        account_id: 'fixture-account-002',
        ad_account_id: 'fixture-account-002',
        platform: 'GOOGLE_ADS',
        created_at: '2026-05-11T00:00:00.000Z',
    },
]);

const FIXTURE_PLATFORM_SETTINGS = Object.freeze([
    {
        platform: 'META',
        app_id: 'fixture-meta-app-id',
        business_id: 'fixture-meta-business-id',
        updated_at: '2026-05-11T00:00:00.000Z',
    },
    {
        platform: 'GOOGLE_ADS',
        app_id: 'fixture-google-client-id',
        business_id: 'fixture-google-manager-id',
        updated_at: '2026-05-11T00:00:00.000Z',
    },
]);

const SYNTHETIC_PROVIDER_RESULTS = Object.freeze({
    'synthetic-success': {
        ok: true,
        status: 'synthetic_success',
        message: 'Synthetic provider connection succeeded.',
        retryable: false,
    },
    'synthetic-retryable-failure': {
        ok: false,
        status: 'synthetic_retryable_failure',
        message: 'Synthetic provider connection failed temporarily.',
        retryable: true,
    },
    'synthetic-config-missing': {
        ok: false,
        status: 'synthetic_config_missing',
        message: 'Synthetic provider configuration is missing.',
        retryable: false,
    },
});

export const fixtureRoles = Object.freeze({
    'no-session': null,
    member: 'MEMBER',
    'team-manager': 'TEAM_MANAGER',
    admin: 'ADMIN',
    'super-admin': 'SUPER_ADMIN',
});

export function createSentinelLocalAuthFixtureServer() {
    const requests = [];

    const server = http.createServer(async (request, response) => {
        const startedAt = Date.now();
        const url = new URL(request.url ?? '/', `http://${request.headers.host ?? LOOPBACK_HOST}`);
        const body = await readRequestBody(request);
        const fixtureName = fixtureNameFromRequest(request);
        const user = fixtureName ? FIXTURE_USERS[fixtureName] : null;

        try {
            await routeRequest({ request, response, url, body, user, fixtureName });
        } catch (error) {
            writeJson(response, 500, { error: 'fixture_server_error' });
        } finally {
            requests.push({
                method: request.method,
                path: url.pathname,
                search: url.search,
                status: response.statusCode,
                elapsed_ms: Date.now() - startedAt,
                fixture: fixtureName ?? 'no-session',
            });
        }
    });

    return {
        requests,
        server,
        async listen(port = 0) {
            await new Promise((resolve, reject) => {
                server.once('error', reject);
                server.listen(port, LOOPBACK_HOST, () => {
                    server.off('error', reject);
                    resolve();
                });
            });
            const address = server.address();
            if (!address || typeof address === 'string' || address.address !== LOOPBACK_HOST) {
                throw new Error('Fixture server did not bind to loopback.');
            }
            return `http://${LOOPBACK_HOST}:${address.port}`;
        },
        async close() {
            await new Promise((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        },
    };
}

async function routeRequest({ request, response, url, user, fixtureName }) {
    if (request.method === 'GET' && url.pathname === '/fixture/health') {
        writeJson(response, 200, {
            ok: true,
            loopback_only: true,
            fixtures: Object.keys(fixtureRoles),
        });
        return;
    }

    if (url.pathname === '/fixture/provider-action') {
        routeSyntheticProviderAction({ request, response, url, user });
        return;
    }

    if (url.pathname === '/auth/v1/user') {
        if (request.method !== 'GET') {
            writeJson(response, 405, { error: 'method_not_allowed' });
            return;
        }
        if (!user) {
            writeJson(response, 401, { error: 'local_fixture_no_session' });
            return;
        }
        writeJson(response, 200, {
            id: user.id,
            aud: 'authenticated',
            role: 'authenticated',
            email: user.email,
            app_metadata: { provider: 'sentinel-local-fixture' },
            user_metadata: { fixture: fixtureName },
            created_at: '2026-05-11T00:00:00.000Z',
        });
        return;
    }

    if (url.pathname === '/auth/v1/token' || url.pathname === '/auth/v1/signup') {
        writeJson(response, 400, { error: 'local_fixture_interactive_auth_disabled' });
        return;
    }

    if (url.pathname.startsWith('/rest/v1/')) {
        routeRestRequest({ request, response, url, user });
        return;
    }

    writeJson(response, 404, { error: 'fixture_not_found' });
}

function routeSyntheticProviderAction({ request, response, url, user }) {
    if (request.method !== 'POST') {
        writeJson(response, 405, { error: 'method_not_allowed' });
        return;
    }

    if (!user) {
        writeJson(response, 401, { error: 'local_fixture_no_session' });
        return;
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        writeJson(response, 403, { error: 'local_fixture_provider_action_forbidden' });
        return;
    }

    const provider = url.searchParams.get('provider');
    if (!['meta', 'google'].includes(provider ?? '')) {
        writeJson(response, 400, { error: 'local_fixture_unknown_provider' });
        return;
    }

    const caseName = url.searchParams.get('case') || 'synthetic-success';
    const result = SYNTHETIC_PROVIDER_RESULTS[caseName];
    if (!result) {
        writeJson(response, 400, { error: 'local_fixture_unknown_provider_case' });
        return;
    }

    writeJson(response, 200, {
        fixture: 'sentinel-local-provider-action',
        provider,
        ...result,
        external_provider_called: false,
        persisted: false,
    });
}

function routeRestRequest({ request, response, url, user }) {
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
        writeJson(response, 403, { error: 'local_fixture_mutation_disabled' });
        return;
    }

    const table = decodeURIComponent(url.pathname.replace('/rest/v1/', '').split('/')[0] ?? '');
    let rows;

    if (table === 'users') {
        rows = Object.values(FIXTURE_USERS).map(({ id, email, role, team_id, full_name, created_at }) => ({
            id,
            email,
            role,
            team_id,
            full_name,
            created_at,
        }));
    } else if (table === 'teams') {
        rows = [...FIXTURE_TEAMS];
    } else if (table === 'team_account_map' || table === 'maps') {
        rows = [...FIXTURE_TEAM_ACCOUNT_MAP];
    } else if (table === 'platform_settings' || table === 'platform_credentials') {
        rows = [...FIXTURE_PLATFORM_SETTINGS];
    } else {
        writeJson(response, 404, { error: 'fixture_table_not_found' });
        return;
    }

    rows = filterRows(url, rows, user);
    rows = projectRows(url, rows);

    const wantsObject = String(request.headers.accept ?? '').includes('application/vnd.pgrst.object+json');
    if (wantsObject) {
        if (rows.length === 1) {
            writeJson(response, 200, rows[0]);
        } else {
            writeJson(response, 406, { code: 'PGRST116', details: 'Fixture expected one row.' });
        }
        return;
    }

    writeJson(response, 200, rows);
}

function filterRows(url, rows, user) {
    let filtered = rows;
    for (const [key, value] of url.searchParams.entries()) {
        if (!value.startsWith('eq.')) continue;
        const expected = value.slice(3);
        filtered = filtered.filter((row) => String(row[key]) === expected);
    }

    const inPlatform = url.searchParams.get('platform');
    if (inPlatform?.startsWith('in.(')) {
        const allowed = new Set(inPlatform.slice(4, -1).split(','));
        filtered = filtered.filter((row) => allowed.has(String(row.platform)));
    }

    if (user && filtered.length === 0 && url.pathname.endsWith('/users') && url.searchParams.get('id') === `eq.${user.id}`) {
        return [{ id: user.id, email: user.email, role: user.role, team_id: user.team_id }];
    }

    return filtered;
}

function projectRows(url, rows) {
    const select = url.searchParams.get('select');
    if (!select || select === '*') return rows;

    const fields = splitSelectFields(select)
        .map((field) => field.trim())
        .filter(Boolean);

    return rows.map((row) => {
        const projected = fields.includes('*') ? { ...row } : {};

        for (const field of fields) {
            if (field === '*') continue;

            if (field === 'teams(name)') {
                projected.teams = teamRelationForRow(row);
                continue;
            }

            projected[field] = row[field] ?? null;
        }

        return projected;
    });
}

function splitSelectFields(select) {
    const fields = [];
    let depth = 0;
    let start = 0;

    for (let index = 0; index < select.length; index += 1) {
        const char = select[index];
        if (char === '(') depth += 1;
        if (char === ')') depth = Math.max(0, depth - 1);
        if (char === ',' && depth === 0) {
            fields.push(select.slice(start, index));
            start = index + 1;
        }
    }

    fields.push(select.slice(start));
    return fields;
}

function teamRelationForRow(row) {
    const team = FIXTURE_TEAMS.find((candidate) => candidate.id === row.team_id);
    return team ? { name: team.name } : null;
}

function fixtureNameFromRequest(request) {
    const explicit = request.headers['x-sentinel-fixture'];
    if (typeof explicit === 'string' && FIXTURE_USERS[explicit]) return explicit;

    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string') return null;

    const match = authorization.match(/^Bearer sentinel-local-fixture:([a-z-]+)$/);
    const fixtureName = match?.[1];
    return fixtureName && FIXTURE_USERS[fixtureName] ? fixtureName : null;
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        request.on('data', (chunk) => chunks.push(chunk));
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        request.on('error', reject);
    });
}

function writeJson(response, status, payload) {
    response.statusCode = status;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('cache-control', 'no-store');
    response.end(JSON.stringify(payload));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const fixture = createSentinelLocalAuthFixtureServer();
    const origin = await fixture.listen(Number(process.env.PORT || 0));
    console.log(`sentinel local auth fixture listening on ${origin}`);
}
