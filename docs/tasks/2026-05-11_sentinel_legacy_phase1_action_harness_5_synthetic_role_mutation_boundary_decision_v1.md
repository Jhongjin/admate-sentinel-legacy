# Sentinel Legacy Phase 1 Action Harness 5 Synthetic Role Mutation Boundary Decision v1

Date: 2026-05-11
Gate: Sentinel-Legacy-Phase1-Action-Harness-5
Status: docs-only boundary decision
Repo: admate-sentinel-legacy

## Purpose

Record the boundary decision for the single remaining Sentinel local auth matrix
row after provider action coverage was converted to deterministic local
synthetic coverage.

This gate does not implement role mutation coverage. It explains why role
mutation remains blocked and what would be required before any future
synthetic-only role mutation harness is approved.

## Current Baseline

The latest provider fixture result closed the provider action blocked row:

```text
PASS=12
BLOCKED=1
```

Remaining blocked row:

```text
role mutation actions
```

The row remains blocked because the current fixture server denies REST
mutations and no approved synthetic role mutation gate exists. That is the
correct current state.

## Decision

Decision: KEEP ROLE MUTATION MATRIX ROW BLOCKED

The Sentinel legacy auth harness may continue to verify local page, API,
debug, provider-action, and credential-redaction boundaries. It must not
exercise role mutation behavior until a separate approval explicitly authorizes
a synthetic-only role mutation harness.

This decision protects against accidental testing of real account, team, or
role state. Role mutation behavior is higher risk than provider action display
states because even a test path can be mistaken for authorization to update
real user permissions.

## Why The Row Stays Blocked

Role mutation remains blocked because:

- current local fixture REST mutation requests are denied by design
- no in-memory synthetic role mutation store has been approved
- no reset/isolation contract has been approved for mutation cases
- no exact actor/target role matrix has been approved
- no UI or response redaction contract has been approved for mutation output
- no proof exists that role mutation coverage can run without real Supabase,
  Auth, SQL, production environment, or persistent fixture state

Until those conditions are resolved, blocked status is safer than partial or
ambiguous test coverage.

## Future Synthetic-only Approval Requirements

A future implementation may be considered only if an explicit approval names a
synthetic-only role mutation harness and confirms all of the following:

- role mutation cases use in-memory fixture data only
- fixture state resets between every case
- no request reaches real Supabase Auth, REST, SQL, or production services
- no real user, team, account, workspace, advertiser, customer, or provider
  identifier is used
- member and team-manager fixtures remain denied
- admin and super-admin behavior is scoped to synthetic cases only
- role transition cases are enumerated before implementation
- mutation responses contain safe status labels only
- logs and captured outputs are scanned for forbidden markers
- implementation can be disabled by default outside the local fixture harness
- failure mode is fail-closed when any local-only guard is missing

The approval should also identify the exact files allowed for the future gate
and the validation commands to run.

## Candidate Future Scope

If approved later, a synthetic-only implementation could consider:

```text
scripts/sentinel-local-auth-fixture.mjs
scripts/check-sentinel-local-auth-matrix.mjs
```

Possible future matrix cases:

| Case | Expected result |
| --- | --- |
| no-session role mutation | denied |
| member role mutation | denied |
| team-manager role mutation | denied |
| admin synthetic role update | allowed only if approved by matrix |
| super-admin synthetic role update | allowed only if approved by matrix |
| fixture guard missing | blocked |
| non-loopback fixture URL | blocked |
| reset between cases | verified |

This document does not approve those changes.

## Stop Conditions

Stop and keep the row blocked if any future role mutation proposal requires:

- real Supabase Auth or REST mutation
- SQL execution
- DB/Auth mutation
- production traffic
- production environment variables
- real cookies, JWTs, sessions, or service-role keys
- persisted fixture role/account mutation
- real user, team, account, campaign, advertiser, customer, or provider data
- provider API calls
- disabling auth or middleware outside local fixture guards
- raw token, cookie, credential, signed URL, private URL, or provider payload
  inspection

## No-Touch Boundary

This docs-only gate does not perform:

- script or product code changes
- role mutation execution
- provider action execution
- SQL execution
- DB/Auth mutation
- schema changes
- environment reads or changes
- production traffic
- Meta or Google API calls
- real Supabase calls
- secret, env, token, cookie, session, credential, signed URL, private URL, or
  raw provider output

## Validation

Run:

```text
git diff --check -- docs/tasks/2026-05-11_sentinel_legacy_phase1_action_harness_5_synthetic_role_mutation_boundary_decision_v1.md
```

Expected result:

```text
pass
```

## Final State

Result: BLOCKED BY DESIGN

The Sentinel local auth matrix should continue to report the role mutation row
as blocked until a separate, explicit, synthetic-only role mutation approval is
granted.
