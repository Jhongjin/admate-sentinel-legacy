import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const boundaryPath = path.join(root, 'src/lib/auth/sentinel-profile-boundary.ts');
const routePath = path.join(root, 'src/app/api/session/profile/route.ts');
const sidebarPath = path.join(root, 'src/components/Sidebar.tsx');

const boundary = await readFile(boundaryPath, 'utf8');
const route = await readFile(routePath, 'utf8');
const sidebar = await readFile(sidebarPath, 'utf8');

assert.match(boundary, /import 'server-only'/);
assert.match(boundary, /auth\.getUser\(\)/);
assert.match(boundary, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(boundary, /\.from\('users'\)/);
assert.match(boundary, /profileRows\.length !== 1/);
assert.match(boundary, /organizationRows\.length !== 1/);
assert.match(boundary, /sentinel_organization_membership_required/);
assert.match(route, /buildBrowserSafeSentinelProfile/);
assert.doesNotMatch(route, /\b(?:email|user_id|team_id|SUPABASE_SERVICE_ROLE_KEY)\b/);
assert.match(sidebar, /fetch\('\/api\/session\/profile'/);
assert.doesNotMatch(sidebar, /\.from\('users'\)/);

const sourceFiles = await collectSourceFiles(path.join(root, 'src'));
const directConsumers = [];
for (const file of sourceFiles) {
    if (file === boundaryPath) continue;
    const source = await readFile(file, 'utf8');
    if (/\.from\(['"]users['"]\)/.test(source)) directConsumers.push(path.relative(root, file));
}
assert.deepEqual(directConsumers, [], 'public.users direct access must stay inside the server boundary');

console.log('public users server boundary contract: PASS');

async function collectSourceFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await collectSourceFiles(absolute));
        else if (/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name)) files.push(absolute);
    }
    return files;
}
