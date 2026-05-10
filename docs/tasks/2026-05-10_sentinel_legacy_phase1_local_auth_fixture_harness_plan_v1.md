# Sentinel Legacy Phase 1 Local Auth Fixture Harness Plan

Date: 2026-05-10

Gate: Sentinel-Legacy-6 local auth fixture harness plan

## Background

The previous local runtime verification confirmed:

- `/api/debug` returns a production-mode `404` before debug data exposure.
- `/settings/media` no-session access redirects to `/login`.
- `/login` renders locally.
- Checked responses did not expose secret, token, cookie, session, provider, or credential markers.

The authenticated role matrix remains blocked because the repo does not yet have
an approved local seeded auth/database fixture harness.

This document defines the harness contract before implementation.

## Goal

Create a local-only verification harness that can exercise authenticated Sentinel
legacy authorization boundaries without using production Supabase, real provider
credentials, real user sessions, or external provider APIs.

The harness should allow repeatable checks for:

- role-based page access
- settings/media credential non-exposure
- role mutation authorization boundaries
- provider test action authorization boundaries
- debug route production-mode block

## Non-Goals

This gate does not approve:

- production traffic
- production Supabase access
- real login/session reuse
- DB/schema migration
- provider API calls
- invite/delete/update of real users
- credential save/test against real Meta or Google accounts
- secret, token, cookie, session, provider response, or credential output

## Proposed Harness Shape

The recommended implementation is a local fixture server plus deterministic
request runner.

### Local Auth Fixture Server

The fixture server should run on a loopback address only.

Responsibilities:

- emulate the minimum Supabase auth endpoints needed by server components
- return deterministic users for named fixture sessions
- expose no real tokens, cookies, or provider credentials
- serve a minimal data response set for `users`, `teams`, `maps`,
  `platform_credentials`, and role lookup queries if needed by the app

The fixture server must use synthetic IDs and synthetic emails only.

### Fixture Sessions

Required fixture roles:

| Fixture | Role | Intended Checks |
| --- | --- | --- |
| `no-session` | none | login redirect and safe denial |
| `member` | member/operator-equivalent | denied admin/settings access |
| `team-manager` | manager-equivalent | scoped team checks and denied privilege escalation |
| `admin` | admin | settings/media read surface and allowed lower-scope admin actions |
| `super-admin` | super admin | approved top-level admin boundary |

Role names must map to the app's existing role checks exactly enough to exercise
the current code paths. Any aliasing must be documented.

### Synthetic Data

Allowed synthetic data:

- fake user IDs
- fake team IDs
- fake account IDs
- fake platform names
- fake non-secret app or business IDs
- fake stored credential marker labels that are never returned to the browser

Forbidden synthetic data:

- real access tokens
- real refresh tokens
- real app secrets
- real developer tokens
- real client secrets
- real provider account IDs from production
- real customer or advertiser names
- raw provider payloads

## Target Matrix

### Debug Route

| Scenario | Expected |
| --- | --- |
| production-mode `/api/debug` no-session | `404`, no `users` / `teams` / `maps` payload |
| production-mode `/api/debug` admin fixture | `404`, no debug payload |
| development-mode `/api/debug` no-session | safe denial |
| development-mode `/api/debug` non-admin fixture | safe denial |
| development-mode `/api/debug` admin fixture | sanitized debug payload only if explicitly enabled for local harness |

### Settings Media

| Scenario | Expected |
| --- | --- |
| no-session opens `/settings/media` | redirect or safe denial |
| member opens `/settings/media` | safe denial |
| team-manager opens `/settings/media` | safe denial unless product policy explicitly allows |
| admin opens `/settings/media` | page renders without stored secret values |
| super-admin opens `/settings/media` | page renders without stored secret values |
| admin submits blank credential fields | no stored credential values are echoed |
| admin submits replacement fake marker values | fake marker values are not echoed in HTML or logs |

### Provider Test Actions

| Scenario | Expected |
| --- | --- |
| no-session triggers provider test | safe denial before provider request |
| member triggers provider test | safe denial before provider request |
| team-manager triggers provider test | safe denial before provider request |
| admin triggers provider test with local mock provider disabled | safe failure without provider call |
| admin triggers provider test with local mock provider enabled | local mock response only, no real provider call |

### Role Mutation

| Scenario | Expected |
| --- | --- |
| no-session attempts role mutation | safe denial |
| member attempts self-promotion | safe denial |
| team-manager attempts admin/super-admin promotion | safe denial |
| admin attempts super-admin assignment | safe denial unless explicitly allowed by policy |
| super-admin performs approved local-only role update | success only against local fixture data |

## Forbidden Output Markers

The harness runner should fail if any browser-facing response, server response,
or captured log includes:

- access token markers
- refresh token markers
- app secret markers
- developer token markers
- client secret markers
- service-role key markers
- authorization header values
- cookie/session values
- Meta Graph raw URLs with credentials
- Google Ads or OAuth raw credential payloads
- raw provider responses
- production account identifiers

## Implementation Candidates

Candidate files:

- `scripts/sentinel-local-auth-fixture.mjs`
- `scripts/check-sentinel-local-auth-matrix.mjs`
- `package.json`
- optional `docs/tasks/...result...md` for the execution result

The harness should avoid app code changes unless the current code cannot be
tested without a small test-only seam. If a seam is required, stop and write a
separate implementation plan first.

## Verification Plan

Required local commands after implementation:

- fixture runner command for the role matrix
- `npm run build`
- `git diff --check`
- targeted secret-like scan over new harness files and result docs

Known existing issue:

- `npm run lint` currently has legacy lint debt and should not be treated as a
  new blocker for this harness unless the implementation changes linted code.

## Stop Conditions

Stop immediately if:

- production Supabase credentials would be required
- real user login is required
- any provider API would be called
- any real token/cookie/session value would need to be read or printed
- any SQL migration or DB mutation is needed
- role mutation cannot be confined to local synthetic fixture data
- the fixture server would need to persist secrets to disk

## Pass Criteria

The harness implementation is acceptable when:

- role fixtures are deterministic and synthetic
- no production network dependency is required
- no provider call is made
- settings/media credential values are not echoed
- unauthorized role mutations fail safely
- `/api/debug` remains blocked in production-like mode
- forbidden marker scan returns zero hits
- implementation and result docs can be reverted without touching product data

## Next Gate

Recommended next gate:

Sentinel-Legacy-7 local auth fixture harness implementation.

That gate may add test-only scripts and package scripts, but should still avoid
production traffic, real auth sessions, SQL execution, provider calls, and app
behavior changes.
