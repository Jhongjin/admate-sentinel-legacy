# Sentinel Legacy Phase 1 P0 Static Closure Audit v1

Date: 2026-05-10
Gate: Sentinel-Legacy-3
Repo: `D:\Projects\AdMate\admate-sentinel-legacy`
Status: docs-only static closure audit; no code, API, DB, schema, migration, environment, asset, commit, or push action.

## 1. Purpose

This gate performs a read-only static audit of the known Phase 1 P0 hardening
surfaces in the legacy Sentinel repo.

The goal is to document whether the current local code appears to satisfy the
P0 acceptance direction from `docs/security-phase1-hardening-plan.md`, without
performing implementation, runtime probing, production requests, database
queries, provider calls, or secret inspection.

This is not a security certification. It is a static closure checkpoint for the
currently visible local files.

## 2. Source Material Reviewed

Local documentation reviewed:

- `docs/security-phase1-hardening-plan.md`
- `docs/tasks/2026-05-07_sentinel_legacy_readonly_inventory_v1.md`
- `docs/tasks/2026-05-07_sentinel_legacy_agent_core_event_contract_mapping_v1.md`

Local code/config surfaces reviewed:

- `src/app/api/debug/route.ts`
- `src/components/Sidebar.tsx`
- `src/app/(dashboard)/settings/media/page.tsx`
- `src/app/(dashboard)/settings/media/actions.ts`
- `src/app/(dashboard)/settings/media/TokenInput.tsx`
- `src/app/(dashboard)/settings/media/TestMetaButton.tsx`
- `src/app/(dashboard)/settings/media/TestGoogleButton.tsx`
- `src/app/(dashboard)/audit/actions.ts`
- `src/app/(dashboard)/active/page.tsx`
- `src/app/(dashboard)/settings/accounts/page.tsx`
- `src/app/(dashboard)/settings/users/page.tsx`
- `src/app/(dashboard)/settings/members/actions.ts`
- `next.config.ts`
- Root debug/test helpers by filename and static references:
  `fetch_meta_debug.py`, `test_adset.js`, `test_meta_campaign.js`,
  `test_meta.mjs`, `test.mjs`

## 3. Current Known Phase 1 P0 Surfaces

The Phase 1 hardening plan identifies three P0 risks.

### 3.1 `/api/debug` sensitive data exposure

Plan risk:

- `/api/debug` can expose sensitive user, team, and account mapping data.

Current static observation:

- `src/app/api/debug/route.ts` now returns `404` when
  `process.env.NODE_ENV === 'production'`.
- The route requires an authenticated Supabase user.
- The route checks the local `users.role` value and only allows `SUPER_ADMIN`
  or `ADMIN`.
- The route comment states it is development-only and should not use a service
  role client.
- The returned development payload still includes user/team/account mapping
  data: `users`, `teams`, and `maps`.

Static closure status:

- P0 appears partially closed for production exposure by environment gate plus
  auth/admin checks.
- Static review cannot prove the deployed runtime environment sets
  `NODE_ENV=production`.
- Static review cannot prove RLS policy behavior, session behavior, or absence
  of deployment rewrites/proxies exposing this route.
- Because the route still exists and returns sensitive operational mappings in
  development, it should remain a monitored surface until runtime verification
  confirms production `404`, unauthenticated `401`, non-admin `403`, and no
  service-role use in request handling.

### 3.2 Sidebar test role switcher / self role mutation

Plan risk:

- Sidebar test role switcher can mutate real user roles.

Current static observation:

- `src/components/Sidebar.tsx` reads the current user and fetches role from the
  `users` table.
- It uses the role to filter menu visibility and render a role badge.
- No role switcher UI or role mutation handler was observed in the current
  Sidebar file.
- Role mutation surfaces still exist elsewhere:
  `src/app/(dashboard)/settings/users/page.tsx` and
  `src/app/(dashboard)/settings/members/actions.ts`.

Static closure status:

- P0 Sidebar-specific self-mutation path appears closed in the current local
  Sidebar source.
- Static review cannot prove that all production bundles, caches, deployments,
  or alternate UI paths no longer contain a role switcher.
- Remaining role mutation paths are outside this exact Sidebar P0 but still
  require separate authorization review under Phase 1 role-boundary items.

### 3.3 Stored platform token/secret UI re-exposure

Plan risk:

- Saved platform tokens/secrets are re-exposed in settings UI.

Current static observation:

- `src/app/(dashboard)/settings/media/page.tsx` selects only
  `platform, app_id, business_id, updated_at` from `platform_settings`.
- Stored `app_secret`, `access_token`, and `refresh_token` values are not
  selected for rendering in the media settings page.
- Secret fields render empty password inputs with `autoComplete="off"`.
- The Meta `TokenInput` component has no `defaultValue` prop and only reveals
  newly typed input client-side.
- Google refresh token and developer token fields have no `defaultValue`.
- UI text states stored token values are not shown again and blank fields keep
  existing values.
- `savePlatformSettingsAction` treats blank secret fields as "keep existing
  stored value".
- `testMetaConnectionAction` and `testGoogleConnectionAction` load stored
  credentials server-side after `requireAdmin()` rather than accepting stored
  secret values from client props.

Static closure status:

- P0 credential re-exposure through the media settings render path appears
  closed in the current local source for stored token, refresh token, app
  secret, and developer token values.
- Non-secret identifiers such as app/client ID and business/manager account ID
  are still rendered as defaults.
- Static review cannot prove that generated HTML, React payloads, screenshots,
  browser dev tools, telemetry, or server logs never contain stored secret
  values.
- Connection test actions still perform external provider calls if executed;
  this audit did not execute them.

## 4. Static Checks Performed

Commands/checks performed locally:

- `git status --short`
  - Result before edit: clean working tree.
- File enumeration with PowerShell after `rg --files` was blocked by the
  Windows app execution path.
- Static read of Phase 1 plan and previous read-only task notes.
- Static read of current P0 candidate files listed above.
- Narrow static searches for:
  - role and role mutation references
  - token/query/fetch/log references
  - root debug/test helper environment and provider-call references
- No production URL, local dev server, database, Supabase project, Meta API, or
  Google Ads API request was executed.

Notable non-P0 Phase 1 observations from static search:

- `next.config.ts` still has `typescript.ignoreBuildErrors: true` and
  `eslint.ignoreDuringBuilds: true`, matching the documented P2 policy risk.
- Root debug/test helpers still reference `.env.local`, service-role or token
  concepts, provider fetch/request calls, and console/print output. These
  remain P2 cleanup/classification candidates.
- Token-in-query candidates remain visible in audit, active, settings/accounts,
  and root helper surfaces. These are P1/P2 follow-up candidates, not closed by
  this P0 static gate.

## 5. No-touch Boundaries Honored

This gate did not:

- Modify code.
- Modify environment files or read/print environment values.
- Modify SQL, migrations, Supabase schema, RLS policies, or production data.
- Start a development server.
- Execute app runtime paths, server actions, API routes, scripts, or provider
  connection tests.
- Call Meta, Google Ads, Supabase, production Sentinel, Agent Core, or any
  external production service.
- Change assets.
- Commit or push.

Only this markdown task document was added.

## 6. Remaining Unknowns Requiring Separate Approval

The following items require a separately approved implementation or runtime
verification gate:

- Runtime verification that `/api/debug` returns `404` in production-like mode,
  `401` for unauthenticated requests, and `403` for authenticated non-admin
  users.
- Deployment verification that `NODE_ENV` and hosting configuration cannot
  accidentally expose development debug output.
- Confirmation that `/api/debug` and other public request paths never initialize
  or expose a service-role/admin client.
- Browser/runtime verification that settings/media page HTML, RSC payloads,
  client props, screenshots, and dev tools do not contain stored credential
  values.
- Log verification for provider failures without including raw token-bearing
  URLs, raw provider responses, access tokens, refresh tokens, app secrets,
  developer tokens, service keys, cookies, or session values.
- Authorization review for role mutation surfaces outside the Sidebar:
  users, members, teams, and account-management flows.
- Resolution of P1 token URL query usage in audit, active dashboard,
  settings/accounts, and root helper scripts.
- Decision on root debug/test scripts: remove, relocate, or mark local-only
  with redacted output rules.
- Build policy decision for `next.config.ts` ignored TypeScript and ESLint
  production build failures.
- Any DB/schema/RLS verification, migration, or production data inspection.

## 7. Next Gate Suggestion

Recommended next gate:

`Sentinel-Legacy-4 Phase 1 runtime verification plan`

Scope:

- Documentation-only plan first, then separately approved runtime checks.
- Define production-like local verification for `/api/debug`, settings/media
  credential non-exposure, role mutation authorization, token URL redaction,
  and safe provider error logging.
- Include exact commands, required mock/stub boundaries, expected HTTP statuses,
  forbidden-output markers, and explicit "no production calls" controls.

Alternative implementation gate, only after explicit approval:

`Sentinel-Legacy-4 Phase 1 P1/P2 remediation implementation`

Scope:

- Remove token-in-query patterns where possible.
- Normalize provider error logging.
- Decide and apply build policy.
- Remove/relocate/document root debug scripts.
- Keep DB schema and production service calls out of scope unless separately
  approved.

## 8. Gate Result

Static P0 closure summary:

- `/api/debug`: appears production-gated and admin-gated in source, but runtime
  proof remains required.
- Sidebar role switcher: no current Sidebar self role mutation UI observed.
- Credential UI re-exposure: stored secret/token values are not selected or
  default-rendered in the media settings page source reviewed.

This gate is complete as a docs-only/read-only static audit.

No code, env, production, DB, API, asset, commit, or push action was performed.
