#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createSentinelLocalAuthFixtureServer } from './sentinel-local-auth-fixture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOOPBACK_HOST = '127.0.0.1';
const NEXT_READY_TIMEOUT_MS = 90000;
const args = new Set(process.argv.slice(2));
const useNextStart = args.has('--next-start');

const checks = [];
const captures = [];
let nextProcess;
let fixture;

try {
    assertNoEnvLocal();

    fixture = createSentinelLocalAuthFixtureServer();
    const fixtureOrigin = await fixture.listen(0);
    recordPass(`fixture server bound to ${fixtureOrigin}`);

    await fetchJson(`${fixtureOrigin}/fixture/health`);
    recordPass('fixture health endpoint returned deterministic metadata');

    const nextPort = await freePort();
    nextProcess = startNextServer({ port: nextPort, fixtureOrigin, mode: useNextStart ? 'start' : 'dev' });
    const appOrigin = `http://${LOOPBACK_HOST}:${nextPort}`;

    await waitForHttp(`${appOrigin}/login`);
    recordPass(`Next ${useNextStart ? 'start' : 'dev'} server responded on ${appOrigin}`);

    await checkLoginPage(appOrigin);
    await checkNoSessionSettingsMedia(appOrigin);
    await checkSettingsMediaRoleMatrix(appOrigin);
    await checkNoSessionDebug(appOrigin);
    await checkDebugRoleMatrix(appOrigin);
    await checkSyntheticProviderActionMatrix(fixtureOrigin);

    scanCapturesForForbiddenMarkers(captures);
    recordPass('forbidden marker scan over responses and captured logs returned zero hits');

    recordBlocked('role mutation actions', 'Fixture denies REST mutations; no local-only action harness exists yet.');

    printSummary();
} catch (error) {
    recordFail(error.message || String(error));
    printSummary();
    process.exitCode = 1;
} finally {
    if (nextProcess) await stopChild(nextProcess);
    if (fixture) await fixture.close().catch(() => {});
}

function startNextServer({ port, fixtureOrigin, mode }) {
    const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
    if (!fs.existsSync(nextBin)) {
        throw new Error(`Next CLI not found at ${nextBin}`);
    }
    if (mode === 'start' && !fs.existsSync(path.join(ROOT, '.next'))) {
        throw new Error('Cannot run next start before .next exists.');
    }

    const child = spawn(process.execPath, [nextBin, mode, '--hostname', LOOPBACK_HOST, '--port', String(port)], {
        cwd: ROOT,
        env: sanitizedNextEnv(fixtureOrigin, mode),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
    });

    child.stdout.on('data', (chunk) => captures.push({ source: 'next stdout', text: chunk.toString('utf8') }));
    child.stderr.on('data', (chunk) => captures.push({ source: 'next stderr', text: chunk.toString('utf8') }));
    child.on('exit', (code, signal) => {
        if (code !== null && code !== 0 && process.exitCode !== 1) {
            captures.push({ source: 'next exit', text: `next exited with code ${code}` });
        }
        if (signal) {
            captures.push({ source: 'next exit', text: `next exited with signal ${signal}` });
        }
    });

    return child;
}

function sanitizedNextEnv(fixtureOrigin, mode) {
    const keep = [
        'ALLUSERSPROFILE',
        'APPDATA',
        'COMSPEC',
        'HOME',
        'HOMEDRIVE',
        'HOMEPATH',
        'LOCALAPPDATA',
        'PATH',
        'Path',
        'PATHEXT',
        'PROCESSOR_ARCHITECTURE',
        'ProgramData',
        'ProgramFiles',
        'ProgramFiles(x86)',
        'SystemDrive',
        'SystemRoot',
        'TEMP',
        'TMP',
        'USERPROFILE',
        'WINDIR',
    ];
    const env = {};
    for (const key of keep) {
        if (process.env[key]) env[key] = process.env[key];
    }

    env.CI = '1';
    env.NEXT_TELEMETRY_DISABLED = '1';
    env.NEXT_PUBLIC_SUPABASE_URL = fixtureOrigin;
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sentinel-local-anon-key';
    env.SUPABASE_SERVICE_ROLE_KEY = 'sentinel-local-service-role-disabled';
    env.SENTINEL_LOCAL_AUTH_FIXTURE = '1';
    if (mode === 'start') env.NODE_ENV = 'production';
    return env;
}

async function checkLoginPage(appOrigin) {
    const response = await fetchWithCapture(`${appOrigin}/login`, { redirect: 'manual' }, 'GET /login');
    assert(response.status === 200, `/login expected 200, got ${response.status}`);
    assert(response.body.includes('Ad-Sentinel'), '/login did not render expected app name');
    recordPass('/login renders for no-session');
}

async function checkNoSessionSettingsMedia(appOrigin) {
    const response = await fetchWithCapture(`${appOrigin}/settings/media`, { redirect: 'manual' }, 'GET /settings/media no-session');
    const location = response.headers.get('location') ?? '';
    const redirectedToLogin = [303, 307, 308].includes(response.status) && location.includes('/login');
    const safeDenied = [401, 403].includes(response.status);
    assert(redirectedToLogin || safeDenied, `/settings/media no-session expected login redirect or safe denial, got ${response.status} ${location}`);
    recordPass('/settings/media no-session redirects or denies safely');
}

async function checkSettingsMediaRoleMatrix(appOrigin) {
    for (const fixtureName of ['member', 'team-manager']) {
        const response = await fetchWithCapture(
            `${appOrigin}/settings/media`,
            { redirect: 'manual', headers: fixtureHeaders(fixtureName) },
            `GET /settings/media ${fixtureName}`
        );
        assert(response.status === 200, `/settings/media ${fixtureName} expected safe 200 denial, got ${response.status}`);
        assert(response.body.includes('권한이 부족합니다'), `/settings/media ${fixtureName} did not render the insufficient-permission boundary`);
        assertNoCredentialEcho(response.body, `/settings/media ${fixtureName}`);
    }
    recordPass('/settings/media member and team-manager fixtures render safe denial');

    for (const fixtureName of ['admin', 'super-admin']) {
        const response = await fetchWithCapture(
            `${appOrigin}/settings/media`,
            { redirect: 'manual', headers: fixtureHeaders(fixtureName) },
            `GET /settings/media ${fixtureName}`
        );
        assert(response.status === 200, `/settings/media ${fixtureName} expected 200, got ${response.status}`);
        assert(response.body.includes('매체 연동 관리'), `/settings/media ${fixtureName} did not render the admin media settings surface`);
        assertNoCredentialEcho(response.body, `/settings/media ${fixtureName}`);
    }
    recordPass('/settings/media admin and super-admin fixtures render without credential echo');
}

async function checkNoSessionDebug(appOrigin) {
    const response = await fetchWithCapture(`${appOrigin}/api/debug`, { redirect: 'manual' }, 'GET /api/debug no-session');
    const expected = useNextStart ? response.status === 404 : [401, 404].includes(response.status);
    assert(expected, `/api/debug no-session expected ${useNextStart ? '404' : '401/404'}, got ${response.status}`);
    assert(!response.body.includes('"users"'), '/api/debug response exposed users key');
    assert(!response.body.includes('"teams"'), '/api/debug response exposed teams key');
    assert(!response.body.includes('"maps"'), '/api/debug response exposed maps key');
    recordPass(`/api/debug no-session returns safe ${response.status}`);
}

async function checkDebugRoleMatrix(appOrigin) {
    for (const fixtureName of ['member', 'team-manager']) {
        const response = await fetchWithCapture(
            `${appOrigin}/api/debug`,
            { redirect: 'manual', headers: fixtureHeaders(fixtureName) },
            `GET /api/debug ${fixtureName}`
        );
        const expectedStatus = useNextStart ? 404 : 403;
        assert(response.status === expectedStatus, `/api/debug ${fixtureName} expected ${expectedStatus}, got ${response.status}`);
        assert(!response.body.includes('"users"'), `/api/debug ${fixtureName} exposed users key`);
        assert(!response.body.includes('"teams"'), `/api/debug ${fixtureName} exposed teams key`);
        assert(!response.body.includes('"maps"'), `/api/debug ${fixtureName} exposed maps key`);
    }
    recordPass(`/api/debug non-admin fixtures return safe ${useNextStart ? 404 : 403}`);

    for (const fixtureName of ['admin', 'super-admin']) {
        const response = await fetchWithCapture(
            `${appOrigin}/api/debug`,
            { redirect: 'manual', headers: fixtureHeaders(fixtureName) },
            `GET /api/debug ${fixtureName}`
        );
        if (useNextStart) {
            assert(response.status === 404, `/api/debug ${fixtureName} production mode expected 404, got ${response.status}`);
            assert(!response.body.includes('"users"'), `/api/debug ${fixtureName} production mode exposed users key`);
            continue;
        }
        assert(response.status === 200, `/api/debug ${fixtureName} expected 200, got ${response.status}`);
        assert(response.body.includes('"users"'), `/api/debug ${fixtureName} did not return local debug users`);
        assert(response.body.includes('"teams"'), `/api/debug ${fixtureName} did not return local debug teams`);
        assert(response.body.includes('"maps"'), `/api/debug ${fixtureName} did not return local debug maps`);
        assertNoCredentialEcho(response.body, `/api/debug ${fixtureName}`);
    }
    recordPass(`/api/debug admin fixtures ${useNextStart ? 'stay production-blocked' : 'return sanitized local debug payload'}`);
}

async function checkSyntheticProviderActionMatrix(fixtureOrigin) {
    for (const fixtureName of ['member', 'team-manager']) {
        const response = await fetchWithCapture(
            `${fixtureOrigin}/fixture/provider-action?provider=meta&case=synthetic-success`,
            { method: 'POST', redirect: 'manual', headers: fixtureHeaders(fixtureName) },
            `POST /fixture/provider-action ${fixtureName}`
        );
        assert(response.status === 403, `synthetic provider action ${fixtureName} expected 403, got ${response.status}`);
        assertNoCredentialEcho(response.body, `synthetic provider action ${fixtureName}`);
    }

    for (const fixtureName of ['admin', 'super-admin']) {
        const success = await fetchSyntheticProviderCase(fixtureOrigin, fixtureName, 'meta', 'synthetic-success');
        assert(success.ok === true, `synthetic provider action ${fixtureName} success case did not return ok=true`);
        assert(success.external_provider_called === false, `synthetic provider action ${fixtureName} success case reported provider call`);
        assert(success.persisted === false, `synthetic provider action ${fixtureName} success case reported persistence`);

        const retryable = await fetchSyntheticProviderCase(fixtureOrigin, fixtureName, 'google', 'synthetic-retryable-failure');
        assert(retryable.ok === false, `synthetic provider action ${fixtureName} retryable case did not return ok=false`);
        assert(retryable.retryable === true, `synthetic provider action ${fixtureName} retryable case did not return retryable=true`);
        assert(retryable.external_provider_called === false, `synthetic provider action ${fixtureName} retryable case reported provider call`);

        const missingConfig = await fetchSyntheticProviderCase(fixtureOrigin, fixtureName, 'google', 'synthetic-config-missing');
        assert(missingConfig.ok === false, `synthetic provider action ${fixtureName} missing-config case did not return ok=false`);
        assert(missingConfig.retryable === false, `synthetic provider action ${fixtureName} missing-config case did not return retryable=false`);
        assert(missingConfig.persisted === false, `synthetic provider action ${fixtureName} missing-config case reported persistence`);
    }

    recordPass('provider test actions use local synthetic fixture without external calls');
}

async function fetchSyntheticProviderCase(fixtureOrigin, fixtureName, provider, caseName) {
    const response = await fetchWithCapture(
        `${fixtureOrigin}/fixture/provider-action?provider=${provider}&case=${caseName}`,
        { method: 'POST', redirect: 'manual', headers: fixtureHeaders(fixtureName) },
        `POST /fixture/provider-action ${fixtureName} ${provider} ${caseName}`
    );
    assert(response.status === 200, `synthetic provider action ${fixtureName} ${caseName} expected 200, got ${response.status}`);
    assertNoCredentialEcho(response.body, `synthetic provider action ${fixtureName} ${caseName}`);
    return JSON.parse(response.body);
}

async function fetchWithCapture(url, init, label) {
    const response = await fetch(url, init);
    const body = await response.text();
    const setCookie = response.headers.get('set-cookie');
    const location = response.headers.get('location');
    captures.push({
        source: label,
        text: [
            `status=${response.status}`,
            location ? `location=${location}` : '',
            setCookie ? `set-cookie=${setCookie}` : '',
            body,
        ].filter(Boolean).join('\n'),
    });
    return { response, status: response.status, headers: response.headers, body };
}

function fixtureHeaders(fixtureName) {
    return { 'x-sentinel-fixture': fixtureName };
}

function assertNoCredentialEcho(body, label) {
    const forbidden = [
        /fixture-[a-z-]*(secret|token)/i,
        /"access_token"\s*:\s*"[^"]+"/i,
        /"refresh_token"\s*:\s*"[^"]+"/i,
        /"app_secret"\s*:\s*"[^"]+"/i,
        /name="(?:appSecret|refreshToken|accessToken)"\s+value="[^"]+"/i,
    ];

    for (const pattern of forbidden) {
        assert(!pattern.test(body), `${label} echoed a credential-like value`);
    }
}

async function fetchJson(url) {
    const response = await fetch(url, { redirect: 'manual' });
    const body = await response.text();
    captures.push({ source: `GET ${url}`, text: body });
    assert(response.ok, `${url} returned ${response.status}`);
    return JSON.parse(body);
}

async function waitForHttp(url) {
    const started = Date.now();
    let lastError;
    while (Date.now() - started < NEXT_READY_TIMEOUT_MS) {
        if (nextProcess.exitCode !== null) {
            throw new Error(`Next server exited before readiness with code ${nextProcess.exitCode}`);
        }
        try {
            const response = await fetch(url, { redirect: 'manual' });
            await response.arrayBuffer();
            if (response.status < 500) return;
        } catch (error) {
            lastError = error;
        }
        await delay(1000);
    }
    throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? 'no response'}`);
}

async function stopChild(child) {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');
    const closed = await Promise.race([
        once(child, 'close').then(() => true),
        delay(3000).then(() => false),
    ]);
    if (!closed && child.exitCode === null) {
        child.kill('SIGKILL');
        await Promise.race([once(child, 'close'), delay(3000)]);
    }
}

async function freePort() {
    const server = http.createServer();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, LOOPBACK_HOST, () => {
            server.off('error', reject);
            resolve();
        });
    });
    const address = server.address();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    return address.port;
}

function scanCapturesForForbiddenMarkers(items) {
    const patterns = [
        { name: 'authorization bearer value', regex: /authorization:\s*bearer\s+\S+/i },
        { name: 'set-cookie value', regex: /set-cookie=.+/i },
        { name: 'jwt-like value', regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
        { name: 'Meta credential URL', regex: /graph\.facebook\.com\/[^\s"'<>]*(access_token|appsecret_proof|client_secret)/i },
        { name: 'Google OAuth credential payload', regex: /oauth2\.googleapis\.com\/token[^\n]*(client_secret|refresh_token)/i },
        { name: 'Google Ads credential header', regex: /googleads\.googleapis\.com[^\n]*(developer-token|authorization)/i },
        { name: 'service role key assignment', regex: /service[_-]?role[_-]?key\s*[:=]\s*\S+/i },
    ];

    for (const item of items) {
        for (const pattern of patterns) {
            if (pattern.regex.test(item.text)) {
                throw new Error(`Forbidden marker found in ${item.source}: ${pattern.name}`);
            }
        }
    }
}

function assertNoEnvLocal() {
    const envLocalPath = path.join(ROOT, '.env.local');
    assert(!fs.existsSync(envLocalPath), 'Refusing to run local auth matrix while .env.local exists.');
}

function recordPass(message) {
    checks.push({ status: 'PASS', message });
    console.log(`[PASS] ${message}`);
}

function recordBlocked(message, reason) {
    checks.push({ status: 'BLOCKED', message: `${message}: ${reason}` });
    console.log(`[BLOCKED] ${message}: ${reason}`);
}

function recordFail(message) {
    checks.push({ status: 'FAIL', message });
    console.error(`[FAIL] ${message}`);
}

function printSummary() {
    const totals = checks.reduce((acc, check) => {
        acc[check.status] = (acc[check.status] ?? 0) + 1;
        return acc;
    }, {});
    console.log(`\nSentinel local auth matrix summary: ${JSON.stringify(totals)}`);
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
