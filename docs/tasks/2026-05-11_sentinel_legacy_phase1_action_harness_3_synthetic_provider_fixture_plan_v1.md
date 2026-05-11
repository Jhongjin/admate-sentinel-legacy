# Sentinel Legacy Phase 1 Action Harness 3 Synthetic Provider Fixture Plan v1

Date: 2026-05-11
Gate: Sentinel-Legacy-Phase1-Action-Harness-3
Status: docs-only implementation plan
Repo: admate-sentinel-legacy

## Scope

Plan a local-only synthetic provider fixture implementation for Sentinel legacy
media settings actions. This gate does not implement code, trigger provider
actions, call provider APIs, mutate roles, execute SQL, or change environment
variables.

## Implementation Goal

Add enough local fixture behavior to let the auth matrix verify provider action
authorization and safe UI states without contacting real providers.

The future implementation should prove:

```text
Authorized Sentinel operators can exercise synthetic provider action states.
Unauthorized roles are denied before any provider action path.
No real provider credential, request, or response participates in the test.
```

## Candidate Files

Likely future write set:

```text
scripts/sentinel-local-auth-fixture.mjs
scripts/check-sentinel-local-auth-matrix.mjs
src/utils/supabase/local-auth-fixture.ts
src/app/(dashboard)/settings/media/*
```

The implementation should avoid package, lockfile, SQL, schema, env, and
production configuration changes.

## Fixture Adapter Shape

Candidate local adapter interface:

```text
provider: meta | google
case: synthetic-success | synthetic-retryable-failure | synthetic-config-missing
actorRole: admin | super_admin
result: safe status label only
```

The adapter should return only deterministic labels and safe UI copy. It should
not include provider account identifiers, headers, access tokens, raw request
bodies, raw responses, private URLs, or secret names.

## Matrix Cases

Future matrix additions:

| Case | Expected result |
| --- | --- |
| member provider action | denied before action execution |
| team-manager provider action | denied before action execution |
| admin synthetic success | safe success state |
| admin synthetic retryable failure | safe retry copy |
| admin synthetic config missing | safe configuration-needed copy |
| super-admin synthetic success | safe success state |
| no fixture flag | provider action harness disabled |
| non-loopback Supabase URL | provider action harness disabled |

## Network Boundary

Future implementation should include a local assertion that no external
provider host was contacted.

Acceptable approaches:

- do not construct real provider clients in fixture mode
- route synthetic cases through an in-process adapter
- collect attempted provider host labels from the fixture adapter and assert the
  list is empty

Do not rely on production firewall or Vercel settings for this local harness.

## Output Redaction

Forbidden in logs, UI, fixture responses, and captured harness output:

- provider access tokens
- request headers
- raw provider response bodies
- provider account IDs
- real customer or advertiser labels
- Supabase service-role values
- cookies or sessions
- private URLs

Fixture labels should be synthetic and stable.

## Verification Plan

Required future implementation checks:

```text
npm run sentinel:local-auth-matrix
git diff --check
```

Optional if synthetic local-only Supabase values are available:

```text
npm run build
```

Known baseline: `npm run sentinel:local-auth-matrix` currently reports 11 PASS
and 2 intentionally BLOCKED cases. The implementation should convert provider
action blocked cases into local synthetic PASS cases while keeping role mutation
blocked unless separately approved.

## Stop Conditions

Stop and split a new review if implementation requires:

- real Meta or Google API calls
- real provider credentials
- real Supabase cookies or JWTs
- SQL execution
- DB/Auth mutation
- production environment variables
- persisted fixture role/account mutation
- production traffic

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
Sentinel-Legacy-Phase1-Action-Harness-4 local synthetic provider fixture implementation
```

Implementation should stay local-only and must keep role mutation actions
blocked unless a separate gate explicitly authorizes synthetic role mutation
coverage.
