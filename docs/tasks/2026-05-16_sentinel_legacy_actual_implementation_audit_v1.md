# Sentinel Legacy actual implementation audit v1

Date: 2026-05-16

## Verdict

Sentinel Legacy is an executable Next.js/Supabase MVP and reference
implementation. It is not ready to be treated as an independent production
Sentinel site.

The production ownership path should remain Core/Sentinel. Legacy should be
kept as a reference/archive for parser, platform comparison, audit history, and
operator override UX until those features are rebuilt through Core-native
contracts.

## Evidence

- The repository has real App Router surfaces for login, dashboard, live audit,
  history, media settings, account mapping, teams, members, and users.
- The audit server action includes partial Meta Graph API comparison logic for
  campaign, ad set, ad, budget, dates, objective, billing, optimization, pixel,
  landing URL, and UTM checks.
- Google validation is not implemented at parity with Meta.
- `/api/sync` and `/api/audit` still contain mock/demo-style flows.
- The README describes the app as a Next.js/Supabase MVP and requires Phase 1
  hardening before production use.
- Core/Sentinel already owns the production-facing Sentinel path for live
  monitoring plus prelaunch ingest/status:
  - prelaunch ingest API
  - prelaunch status API
  - ingest storage helper
  - dashboard status panel
  - alert ingest, campaign management, logs, delivery/audit surfaces
- Core does not yet productionize Legacy's raw Excel/media-mix parser, live
  platform comparison, audit history override, account/team mapping, or
  credential UI as direct ports. Existing Core bridge work classifies much of
  that surface as rewrite-required, port-later, defer, or reject-direct-port.

## Local Verification

Run from this repository:

- `npm run sentinel:local-auth-matrix` passed.
  - 13 checks passed.
  - No-session, member, team-manager, admin, and super-admin fixture paths
    behaved as expected.
  - Credential echo scan over captured responses/logs returned zero hits.
- `npm run lint` failed.
  - Main blockers: explicit `any`, unused variables, root debug/test script
    lint violations, and one React immutability rule violation.
- `npm run build` failed without local Supabase environment.
  - The build compiled first, then failed during page-data collection for an
    API route because Supabase URL/anon key were not configured locally.
  - The build also reported invalid/deprecated config warnings around the
    current Next.js version.

## Production Gate

Do not publish this repo as a standalone production Sentinel site until these
items are resolved:

- Reconcile app code with the actual Supabase migrations and production schema.
- Remove or replace mock/demo API flows.
- Decide whether Google validation is in scope, then implement it at parity or
  explicitly remove the claim.
- Remove production reliance on ignored TypeScript/ESLint errors.
- Complete Phase 1 hardening items from `docs/security-phase1-hardening-plan.md`.
- Move required parser/comparison/history behavior into Core-native Sentinel
  contracts instead of directly merging Legacy surfaces.

## Commander Decision

Legacy is useful as a reference, not as a launch target. The safe next product
direction is:

1. Keep Core/Sentinel as the production owner.
2. Treat Legacy parser/comparison/history UX as source material.
3. Rebuild only the needed pieces behind Core's auth, RBAC, redaction,
   no-secret-output, prelaunch ingest/status, and operator audit boundaries.
