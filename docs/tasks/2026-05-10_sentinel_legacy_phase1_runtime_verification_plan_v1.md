# Sentinel Legacy Phase 1 Runtime Verification Plan v1

Date: 2026-05-10
Gate: Sentinel-Legacy-4
Repo: `D:\Projects\AdMate\admate-sentinel-legacy`
Status: docs-only runtime verification plan; no code, API, DB, schema, migration, environment, runtime probing, production call, provider call, commit, or push action.

## 1. Purpose

This gate defines the next approved verification shape after
`docs/tasks/2026-05-10_sentinel_legacy_phase1_p0_static_closure_audit_v1.md`.

The goal is to plan local, production-like runtime checks for the Phase 1
hardening surfaces without executing them in this gate. The plan is intended to
prove behavior that static review could not prove:

- `/api/debug` production blocking and auth behavior.
- Settings/media stored credential non-exposure.
- Role mutation authorization boundaries.
- Token-bearing URL redaction.
- Safe provider error logging.
- No-production and no-secret controls for the verification run.

This document is not an implementation report and is not evidence that runtime
checks have already passed.

## 2. Source Material

This plan is based on:

- `docs/security-phase1-hardening-plan.md`
- `docs/tasks/2026-05-10_sentinel_legacy_phase1_p0_static_closure_audit_v1.md`
- `docs/tasks/2026-05-07_sentinel_legacy_readonly_inventory_v1.md`
- `docs/tasks/2026-05-07_sentinel_legacy_agent_core_event_contract_mapping_v1.md`

The static closure audit found:

- `/api/debug` appears production-gated and admin-gated in source, but runtime
  proof remains required.
- Sidebar self role mutation appears removed from current source, but remaining
  role mutation flows still require authorization verification.
- Settings/media stored credential values appear not selected or default-rendered
  in the current source, but runtime HTML/RSC/client-payload/log proof remains
  required.

## 3. Verification Boundary

This future runtime verification gate must be local only.

Allowed for the future gate, after explicit approval:

- Start the app locally in production-like mode against a non-production,
  disposable configuration.
- Use mocked, seeded, or local-only test identities.
- Use fake credential sentinels that are not valid provider credentials.
- Inspect local HTTP responses, rendered HTML, RSC/client payloads, browser
  state, and local logs.
- Stub provider failures locally or intercept provider requests so no external
  provider call is made.

Forbidden in this gate and in the future runtime gate unless separately
approved:

- Production Sentinel URLs.
- Production Supabase projects.
- Production databases or RLS policy changes.
- Meta, Google Ads, or other provider calls.
- Real access tokens, refresh tokens, app secrets, developer tokens, service
  role keys, cookies, or session values.
- Reading, printing, or documenting environment variable values.
- Schema changes, migrations, code changes, commits, or pushes.

## 4. No-production Controls

Before any future runtime check starts, the operator must confirm and document:

- Target base URL is local only, such as `http://localhost:<port>`.
- Network calls to `graph.facebook.com`, `googleads.googleapis.com`,
  `googleapis.com`, production Supabase hosts, and production Sentinel hosts are
  blocked, stubbed, or otherwise impossible.
- Test credential strings are synthetic markers only and are not accepted by
  Meta, Google Ads, Supabase, or any production system.
- Test users and roles are local/disposable only.
- No `.env` values are printed, copied into docs, or used as proof.
- Local logs are captured only for redaction assertions and do not include
  secret values.

Suggested synthetic marker values for future local-only checks:

- `SENTINEL_FAKE_ACCESS_TOKEN_SHOULD_NOT_APPEAR`
- `SENTINEL_FAKE_REFRESH_TOKEN_SHOULD_NOT_APPEAR`
- `SENTINEL_FAKE_APP_SECRET_SHOULD_NOT_APPEAR`
- `SENTINEL_FAKE_DEVELOPER_TOKEN_SHOULD_NOT_APPEAR`
- `SENTINEL_FAKE_SERVICE_ROLE_SHOULD_NOT_APPEAR`
- `SENTINEL_FAKE_COOKIE_SHOULD_NOT_APPEAR`

These markers must never be real credentials.

## 5. Planned Checks

### 5.1 `/api/debug` statuses

Purpose:

- Prove the route does not expose user, team, or account mapping data in
  production-like mode.
- Prove non-production access, if any, is still authenticated and admin-bound.

Planned local-production-like setup:

- Start a local production build or production-mode server with non-production
  data only.
- Use no real production session, cookie, token, or Supabase project.
- Prepare three local-only request states:
  - unauthenticated request
  - authenticated non-admin request
  - authenticated admin or super-admin request

Expected statuses:

| Scenario | Expected status | Expected body rule |
| --- | --- | --- |
| Production-like unauthenticated `GET /api/debug` | `404` preferred; `401` acceptable only if environment gate is intentionally not active in the local test harness | No user/team/account mapping data |
| Production-like authenticated non-admin `GET /api/debug` | `404` preferred; `403` acceptable only if environment gate is intentionally not active in the local test harness | No user/team/account mapping data |
| Production-like authenticated admin `GET /api/debug` | `404` | No user/team/account mapping data |
| Development-mode unauthenticated `GET /api/debug`, if separately checked | `401` | No user/team/account mapping data |
| Development-mode authenticated non-admin `GET /api/debug`, if separately checked | `403` | No user/team/account mapping data |
| Development-mode authenticated admin `GET /api/debug`, if separately checked | `200` | Development-only data allowed; no secrets |

Pass criteria:

- Production-like mode returns `404` before exposing debug payloads.
- No production-like response includes `users`, `teams`, `maps`, account mapping
  rows, cookies, tokens, service-role references, or secret-bearing values.
- No public request path initializes or exposes a service-role/admin client for
  debug output.

Failure criteria:

- Any production-like response body includes debug mapping data.
- Any unauthenticated production-like request receives user, team, account, or
  session data.
- Any debug response or log includes a secret marker.

### 5.2 Settings/media credential non-exposure

Purpose:

- Prove stored media credential values are not sent back to the browser through
  HTML, React/RSC payloads, client props, screenshots, browser state, or local
  logs.

Planned local-production-like setup:

- Seed or stub local-only stored platform settings using fake marker values.
- Render the settings/media page as an authorized admin using local-only auth.
- Inspect the initial HTML, streamed/RSC payloads, network responses, browser
  DOM, input values, screenshots, and local logs.

Expected statuses:

| Scenario | Expected status | Expected body/UI rule |
| --- | --- | --- |
| Admin opens settings/media | `200` | Page renders metadata and empty credential replacement fields |
| Non-admin opens settings/media | `403`, redirect, or equivalent safe denial | No credential metadata beyond safe denial |
| Unauthenticated opens settings/media | `401`, redirect, or equivalent safe denial | No credential metadata |
| Admin submits blank secret fields | `200`, redirect, or success state depending on existing app behavior | Existing stored values are preserved server-side and not shown |
| Admin submits replacement fake marker values | `200`, redirect, or success state depending on existing app behavior | New values are never echoed back |

Pass criteria:

- Password/secret inputs render empty or placeholder-only.
- Stored `access_token`, `refresh_token`, `app_secret`, and `developer_token`
  marker values do not appear in HTML, RSC payloads, client props, DOM, browser
  dev tools output, screenshots, local logs, or local error messages.
- Non-secret identifiers such as app/client ID or account ID are shown only as
  intentionally allowed metadata.

Failure criteria:

- Any fake credential marker appears outside the server-side local-only store.
- Any credential field uses a stored value as `defaultValue`, visible value, or
  client prop.
- Any connection-test response echoes a stored credential value.

### 5.3 Role mutation authorization

Purpose:

- Prove normal users cannot self-promote or mutate roles through Sidebar,
  settings/users, settings/members, or any role update action.

Planned local-production-like setup:

- Use local-only users representing member, manager, admin, and super admin.
- Attempt role changes through available UI/actions using local disposable
  identities.
- Do not use production identities or production data.

Expected statuses:

| Actor | Target mutation | Expected result |
| --- | --- | --- |
| Unauthenticated | Any role change | `401`, redirect, or safe denial |
| Member | Self-promote to manager/admin/super admin | `403` or safe denial |
| Member | Change another user's role | `403` or safe denial |
| Manager | Promote self or another user to admin/super admin | `403` or safe denial |
| Admin | Change permitted lower-scope roles | Success only if allowed by product policy |
| Admin | Create or assign super admin | `403` unless explicitly allowed by product policy |
| Super admin | Approved role administration | Success with audit-safe output |

Pass criteria:

- No Sidebar production UI renders a role switcher test control.
- Self-promotion fails for all non-super-admin users.
- Unauthorized attempts return safe denial without changing data.
- Authorized role changes do not log secrets or expose session/cookie values.

Failure criteria:

- Any non-admin or manager can elevate their own role.
- Any role mutation succeeds without the expected admin/super-admin boundary.
- Role mutation output exposes raw session, cookie, token, or environment data.

### 5.4 Token URL redaction

Purpose:

- Prove application logs and UI errors do not contain token-bearing provider
  URLs, including cases where provider APIs require token query parameters.

Planned local-production-like setup:

- Use fake marker credentials only.
- Intercept or stub provider requests locally.
- Trigger code paths that construct provider requests without allowing network
  egress to Meta, Google Ads, or Google APIs.
- Capture local server logs and UI-visible errors.

Expected output:

- Logs may include provider name, operation purpose, status code, and redacted
  endpoint category.
- Logs must not include raw request URLs containing `access_token`,
  `refresh_token`, `app_secret`, `developer_token`, `client_secret`, `key`,
  `code`, `cookie`, or session-bearing query parameters.
- UI errors must be short safe messages and must not include provider request
  URLs.

Pass criteria:

- Token-bearing URLs are absent from logs, thrown errors, rendered UI, network
  response bodies, and screenshots.
- Redacted placeholders are used where request context is necessary, such as
  `[REDACTED]` or equivalent.
- Provider fetch helpers centralize or consistently apply redaction behavior.

Failure criteria:

- Any local output contains a fake credential marker.
- Any local output contains a provider URL with a token-like query parameter.
- Any raw provider response body is surfaced to the UI or logs without
  sanitization.

### 5.5 Safe provider error logging

Purpose:

- Prove provider failure handling remains useful for diagnosis without exposing
  credential values, raw responses, account secrets, or token-bearing URLs.

Planned local-production-like setup:

- Stub Meta and Google failure responses locally.
- Include fake marker values in stored credentials and in stubbed raw provider
  error bodies to prove they are stripped.
- Trigger Meta and Google connection-test failure paths as an authorized local
  admin.
- Do not allow any external provider request.

Expected statuses:

| Scenario | Expected status/result | Expected log/UI rule |
| --- | --- | --- |
| Meta connection test failure | Safe failure result | Provider/status/purpose allowed; no raw token URL or raw provider body |
| Google connection test failure | Safe failure result | Provider/status/purpose allowed; no raw token URL or raw provider body |
| Provider timeout or network block | Safe failure result | Network failure summarized without credentials |
| Unauthorized connection test | `401`/`403` or safe denial | No provider request attempted |

Pass criteria:

- Local logs include enough context for diagnosis: provider, operation, status
  code, safe account alias/hash if needed, and trace id if present.
- UI messages do not expose raw provider response bodies or token-bearing URLs.
- Unauthorized users cannot trigger provider connection tests.

Failure criteria:

- Logs or UI include fake markers, raw token-bearing URLs, raw provider bodies,
  service-role values, cookies, or session values.
- A provider request is attempted before authorization succeeds.
- A local failure path requires real provider credentials to verify.

## 6. Forbidden Output Markers

The future verification report must explicitly search all captured outputs for
these forbidden markers and record pass/fail results:

- `SENTINEL_FAKE_ACCESS_TOKEN_SHOULD_NOT_APPEAR`
- `SENTINEL_FAKE_REFRESH_TOKEN_SHOULD_NOT_APPEAR`
- `SENTINEL_FAKE_APP_SECRET_SHOULD_NOT_APPEAR`
- `SENTINEL_FAKE_DEVELOPER_TOKEN_SHOULD_NOT_APPEAR`
- `SENTINEL_FAKE_SERVICE_ROLE_SHOULD_NOT_APPEAR`
- `SENTINEL_FAKE_COOKIE_SHOULD_NOT_APPEAR`
- `access_token=`
- `refresh_token=`
- `app_secret=`
- `developer_token=`
- `client_secret=`
- `service_role`
- `sb_service_role`
- `SUPABASE_SERVICE_ROLE_KEY`
- `Cookie:`
- `Set-Cookie:`
- `Authorization: Bearer`
- `graph.facebook.com`
- `googleads.googleapis.com`
- Raw `users`, `teams`, or `maps` debug payloads in production-like responses.

Finding one marker in a captured output is a verification failure unless the
marker appears only in the verification checklist itself, not in app output.

## 7. Evidence To Capture In Future Gate

The future runtime verification report should include:

- Local base URL and confirmation it is not production.
- Redacted command list, without environment values.
- For each check:
  - actor used, described by role only
  - route or action exercised
  - expected status
  - actual status
  - pass/fail result
  - redacted evidence summary
- Confirmation that no provider, production DB, production Supabase, or
  production Sentinel call occurred.
- Confirmation that forbidden marker search was performed on captured local
  outputs.
- Any unresolved unknowns or checks deferred for separate approval.

The report must not paste full response bodies if they contain operational
mapping data. Summaries and narrow redacted snippets are preferred.

## 8. Exit Criteria

The future runtime verification gate can pass only when:

- `/api/debug` production-like requests return the expected safe status and no
  debug payload.
- Settings/media stored credential markers never appear in browser-facing or
  local log outputs.
- Unauthorized role mutations fail safely.
- Token-bearing URLs are absent from logs, UI, responses, and screenshots.
- Provider error output is redacted and safe.
- No production, DB, provider, or real credential call was made.
- Any deviations are documented with severity, owner, and next action.

## 9. Next Gate

Recommended next gate:

`Sentinel-Legacy-5 Phase 1 local runtime verification report`

Scope:

- Execute this plan only after explicit approval.
- Use local-only production-like runtime setup.
- Capture expected versus actual statuses.
- Search captured outputs for forbidden markers.
- Document pass/fail results and remaining unknowns.
- Do not perform production calls, DB/provider calls, schema changes, code
  changes, commits, or pushes unless separately approved.

Alternative later gate after runtime verification:

`Sentinel-Legacy-6 Phase 1 P1/P2 remediation implementation`

Scope:

- Implement approved fixes for token URL handling, provider error redaction,
  role authorization gaps, build policy, and debug/test script classification.
- Keep DB schema, production calls, and Agent Core integration out of scope
  unless separately approved.

## 10. Gate Result

Sentinel-Legacy-4 is complete as a documentation-only runtime verification
plan.

No code, environment, runtime probing, production request, database request,
provider request, schema change, migration, asset change, commit, or push action
was performed.
