# Sentinel Legacy Phase 1 Action Harness 2 Local Provider Action Harness Design v1

Date: 2026-05-11
Gate: Sentinel-Legacy-Phase1-Action-Harness-2
Status: docs-only design
Repo: admate-sentinel-legacy

## Scope

Design a local-only provider action harness boundary for Sentinel legacy
settings/media flows. This gate does not implement fixture code, trigger
provider actions, call provider APIs, mutate roles, execute SQL, or change
environment variables.

## Baseline

The local auth fixture matrix already verifies page and API authorization
boundaries for no-session, member, team-manager, admin, and super-admin
fixtures.

The intentionally blocked area is provider action testing. Existing app actions
may call real Meta or Google endpoints after authorization, so the current
matrix must not click or submit those actions.

## Harness Design Goal

The future provider action harness should prove only this:

```text
Sentinel shows the right authorized, denied, success, and failure states
without touching real provider systems.
```

It must not prove provider integration correctness. Real provider integration
testing belongs in a separately approved sandbox gate.

## Local-only Enablement

The harness should be enabled only when all of these are true:

- `SENTINEL_LOCAL_AUTH_FIXTURE=1`
- fixture server is bound to `127.0.0.1`
- browser URL is loopback
- Supabase URL used by the fixture is loopback or synthetic
- provider adapter mode is synthetic
- network egress to Meta, Google, production Supabase, and other provider hosts
  is blocked or not wired

If any condition is missing, provider action cases should remain blocked.

## Synthetic Provider Adapter Contract

Future synthetic adapters should return deterministic results:

| Adapter case | Meaning | Expected UI outcome |
| --- | --- | --- |
| `synthetic-success` | Authorized user triggers a provider test action and local adapter succeeds. | Safe success notice with no provider payload. |
| `synthetic-retryable-failure` | Local adapter simulates temporary provider failure. | Retryable error copy and no raw provider body. |
| `synthetic-permission-denied` | User role cannot trigger provider action. | Denied copy and no provider attempt. |
| `synthetic-config-missing` | Synthetic config is intentionally absent. | Configuration-needed copy, no secret name/value output. |

The adapter output should include stable test labels only. It should not include
provider tokens, account IDs, raw API responses, request headers, or private
URLs.

## Role Expectations

| Fixture role | Provider action access |
| --- | --- |
| no-session | redirect or denied before action surface |
| member | denied |
| team-manager | denied unless explicitly scoped in a later product decision |
| admin | allowed for synthetic read/test actions only |
| super-admin | allowed for synthetic read/test actions only |

Role mutation actions remain out of scope for this gate and should keep their
existing blocked status until a separate local role-mutation harness is
approved.

## Matrix Additions For Future Implementation

Future `scripts/check-sentinel-local-auth-matrix.mjs` cases should include:

- member provider test button/action denied
- team-manager provider test button/action denied
- admin synthetic success
- admin synthetic retryable failure
- super-admin synthetic success
- synthetic config missing
- forbidden marker scan over action responses and logs
- assertion that no external provider host was contacted

The matrix should reset fixture state between cases and keep all action state
in memory.

## Failure And Stop Conditions

Stop implementation if the harness requires:

- real Meta or Google credentials
- real provider API calls
- raw provider response inspection
- real Supabase auth cookies or JWTs
- SQL execution
- production DB writes
- production environment variables
- persisted role/account mutation
- disabling auth or middleware outside fixture-only guards

## Verification Plan

For this docs-only design gate:

```text
git diff --check -- docs/tasks/2026-05-11_sentinel_legacy_phase1_action_harness_2_local_provider_action_harness_design_v1.md
npm run sentinel:local-auth-matrix
```

For a future implementation gate:

```text
npm run sentinel:local-auth-matrix
npm run build with synthetic local-only Supabase environment values
git diff --check
```

## No-Touch Confirmation

This gate does not perform:

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

Recommended next gate:

```text
Sentinel-Legacy-Phase1-Action-Harness-3 local synthetic provider fixture plan
```

That gate should decide whether to stay docs-only or explicitly authorize a
local-only fixture implementation.
