# Sentinel Legacy Phase 1 Blocked Action Harness Plan v1

Date: 2026-05-11

## Scope

Docs-only plan for the two blocked areas left after the local auth fixture
matrix:

- provider test actions
- role mutation actions

This gate does not implement code, does not trigger server actions, does not
call provider APIs, and does not mutate auth, DB, or fixture state.

## Current Baseline

The current local fixture harness verifies:

- local fixture server is loopback-only
- `SENTINEL_LOCAL_AUTH_FIXTURE=1` is required
- fixture mode requires a loopback `NEXT_PUBLIC_SUPABASE_URL`
- no-session `/login`, `/settings/media`, and `/api/debug` behavior
- member and team-manager denial boundaries
- admin and super-admin access to `/settings/media`
- development-only `/api/debug` role behavior
- forbidden marker scans over browser-facing responses and captured logs

The remaining blocked rows are intentional:

- provider test actions are not triggered because current app actions can call
  real Meta or Google endpoints after admin authorization
- role mutation actions are not triggered because the fixture server denies REST
  mutations and no local-only action harness exists yet

## Recommended Next Harness Boundary

The next safe harness should be local-only and action-specific:

- expose synthetic provider action targets only when
  `SENTINEL_LOCAL_AUTH_FIXTURE=1`
- keep fixture backend bound to `127.0.0.1`
- require loopback Supabase URL before enabling any test seam
- replace provider clients with deterministic local adapters
- deny all network egress to Meta, Google, Supabase production, and other
  provider hosts during local action tests
- keep role mutation tests in memory or in a disposable local fixture server
  store only
- assert sanitized UI and response states without recording credentials

## Provider Action Harness Plan

Provider test action coverage should verify only app authorization and UI/error
state behavior.

Allowed local-only outcomes:

- member and team-manager fixtures cannot trigger provider tests
- admin and super-admin fixtures can reach a synthetic provider test path
- synthetic provider success renders a safe success state
- synthetic provider failure renders a safe retry/error state
- no provider credential value is echoed
- no provider raw response is shown

Disallowed:

- real Meta API call
- real Google API call
- reading real provider credentials
- sending real tokens to a provider endpoint
- recording raw provider payloads
- persisting action output to production or real Supabase state

Implementation candidates for a future gate:

- `src/utils/supabase/local-auth-fixture.ts`
- `scripts/sentinel-local-auth-fixture.mjs`
- `scripts/check-sentinel-local-auth-matrix.mjs`
- provider action files under `src/app/(dashboard)/settings/media`

## Role Mutation Harness Plan

Role mutation coverage should verify authorization and sanitization without
changing real account state.

Allowed local-only outcomes:

- member and team-manager fixtures cannot mutate role state
- admin fixture can attempt only the synthetic mutation cases allowed by the
  fixture
- super-admin fixture can attempt synthetic role update cases
- fixture state is reset between cases
- browser-facing output never includes raw user identifiers beyond synthetic
  fixture labels

Disallowed:

- real Supabase REST mutation
- real account/team/member role update
- SQL execution
- production DB write
- persisted fixture state outside the local runner process

Implementation candidates for a future gate:

- add a fixture-only mutation endpoint in `scripts/sentinel-local-auth-fixture.mjs`
- add matrix cases to `scripts/check-sentinel-local-auth-matrix.mjs`
- add explicit reset between test cases
- add forbidden marker scans for role mutation responses and logs

## Stop Conditions

Stop and split a separate review if implementation requires:

- real provider credentials
- real provider API calls
- real Supabase session cookies or JWTs
- SQL execution
- DB/schema changes
- production environment variables
- persisted role/account mutation
- provider raw payload inspection
- disabling auth or middleware outside the local fixture guard

## Verification Plan

For this docs-only gate:

```text
git diff --check -- docs/tasks/2026-05-11_sentinel_legacy_phase1_blocked_action_harness_plan_v1.md
npm run sentinel:local-auth-matrix
npm run build with synthetic local-only Supabase environment values
```

Known note:

`npx tsc --noEmit` currently has a pre-existing `next.config.ts` unsupported
`eslint` config-key failure in this repo and is not required for this docs-only
plan.

`npm run build` also requires synthetic local-only Supabase environment values
for this legacy repo. Running it without those values stops while collecting
page data for Supabase-backed routes and is not a product behavior regression.

## No-Touch Confirmation

This gate did not perform:

- code changes
- provider action execution
- role mutation execution
- SQL execution
- DB/Auth mutation
- schema or env changes
- production traffic
- Meta or Google API calls
- real Supabase calls
- secret, env, token, cookie, session, credential, signed URL, or raw provider
  output

## Next Gate

`Sentinel-Legacy-Phase1-Action-Harness-2 local provider action harness design`

Keep the next gate design-first unless a separate implementation approval
explicitly authorizes local-only fixture code changes.
