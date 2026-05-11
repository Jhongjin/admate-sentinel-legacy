# Sentinel Legacy Phase 1 Local Auth Fixture Harness Result

Date: 2026-05-11

## Scope

Advanced the local-only auth fixture harness for the Sentinel legacy repo to cover
deterministic authenticated role checks through a guarded app seam.

Changed files:

- `scripts/sentinel-local-auth-fixture.mjs`
- `scripts/check-sentinel-local-auth-matrix.mjs`
- `src/utils/supabase/local-auth-fixture.ts`
- `src/utils/supabase/server.ts`
- `src/utils/supabase/middleware.ts`
- `docs/tasks/2026-05-11_sentinel_legacy_phase1_local_auth_fixture_harness_result_v1.md`

## Pass

- Fixture server binds to `127.0.0.1` only.
- Fixture server exposes deterministic synthetic users, teams, account maps, and platform settings.
- Fixture server does not include real provider credentials, production Supabase values, SQL, migrations, provider calls, or persisted state.
- Matrix runner starts the fixture server and a local Next server with sanitized synthetic Supabase environment values.
- Matrix runner verifies no-session `/login`, `/settings/media`, and `/api/debug` behavior.
- A test-only server Supabase seam is enabled only when `SENTINEL_LOCAL_AUTH_FIXTURE=1`
  and `NEXT_PUBLIC_SUPABASE_URL` is loopback-only.
- The seam accepts a synthetic `x-sentinel-fixture` request header and maps it to
  deterministic local fixture auth without real cookies, JWTs, or production Supabase.
- Middleware bypasses Supabase session refresh only under that same explicit local
  fixture guard.
- Matrix runner verifies authenticated role behavior:
  - `/settings/media` member and team-manager fixtures render the insufficient-permission boundary.
  - `/settings/media` admin and super-admin fixtures render without credential echo.
  - development-mode `/api/debug` no-session returns `401`.
  - development-mode `/api/debug` member and team-manager fixtures return `403`.
  - development-mode `/api/debug` admin and super-admin fixtures return sanitized local fixture data.
- Matrix runner scans captured browser-facing responses and local server logs for forbidden markers.

## Blocked

Provider test actions remain blocked because the current server actions call real Meta and Google endpoints after admin authorization. The runner does not trigger those actions.

Role mutation actions remain blocked because the fixture server denies REST mutations and no local-only action harness exists yet.

## Verification

Commands run for this gate:

- `npm run sentinel:local-auth-matrix`
  - Result: pass.
  - Summary: 11 pass, 2 blocked.
- `npm run build`
  - Result: pass with synthetic local-only Supabase environment values and `SENTINEL_LOCAL_AUTH_FIXTURE=1`.
- `npx tsc --noEmit`
  - Result: existing failure remains in `next.config.ts` for unsupported `eslint` config key.
  - New seam files do not add TypeScript errors after that existing blocker is excluded.
- `git diff --check`
  - Result: pass.
- targeted secret-like scan over authored files
  - Result: pass. No secret-like values found.
