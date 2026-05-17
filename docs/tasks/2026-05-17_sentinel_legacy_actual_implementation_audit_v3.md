# Sentinel Legacy Actual Implementation Audit v3

Date: 2026-05-17
Repo: admate-sentinel-legacy
Status: reference implementation, not production owner

## Commander Verdict

Sentinel Legacy is a real executable Next.js/Supabase MVP with useful launch
validation reference material. It should not be published as the production
`sentinel.admate.ai.kr` site.

Production Sentinel ownership should remain in `admate-agent-core`, where the
current Core/Sentinel path already owns auth, RBAC, redaction, prelaunch
ingest/status, campaign monitoring, logs, and operator workflows.

## Current Implementation State

Implemented and useful as reference:

- login/session wiring and dashboard layout
- team/member/user/account mapping surfaces
- media credential save/update UI and server actions
- Meta credential connectivity test
- partial Google connectivity test
- browser-side media-mix Excel upload/parsing through `xlsx`
- Meta-focused campaign/ad set/ad/budget/date/objective/buying type/billing,
  optimization, pixel, landing URL, and UTM comparison logic
- audit history insertion and history view
- active dashboard view for recent audit/platform state
- local synthetic auth and role/action matrix harness

Still missing or unsafe for standalone production:

- Google validation is not implemented at Meta parity.
- `/api/sync` and `/api/audit` still include mock/demo style flows.
- no production Core/Sentinel event emitter exists in this repo
- migration/schema expectations appear drifted from the current audit action shape
- `next.config.ts` keeps TypeScript and ESLint production build ignores
- `next.config.ts` contains an `eslint` key unsupported by the current Next.js version
- deprecated `middleware` convention warning remains
- root debug/test scripts remain in lint scope
- direct credential/provider management surfaces should not be ported directly into Core

## Deployment Status

No repo-local standalone deployment target was found:

- no `vercel.json`
- no `Dockerfile`
- no `.env.example`
- no `.env.local`

There is no repo-local evidence that this app is configured as the production
`sentinel.admate.ai.kr` deployment target.

## Verification on 2026-05-17

Run from `D:\Projects\AdMate\admate-sentinel-legacy`.

- `npm run sentinel:local-auth-matrix`: passed.
  - 13 PASS.
  - no credential echo detected by fixture harness
- `npm run lint`: failed.
  - 28 errors and 14 warnings.
  - blockers include explicit `any`, unused variables, React immutability,
    unescaped entities, and root debug/test scripts.
- `npm run build`: failed.
  - app compiled first
  - page-data collection failed for `/api/audit` because local Supabase public
    URL/anon key environment variables were not configured
  - build also warned about unsupported `eslint` config and deprecated
    `middleware` convention

No secret values were printed or recorded in this audit.

## Integration Decision

Do not publish this repo as a standalone production Sentinel site.

Use this repo only as read-only reference material for Core-native Sentinel:

- media-mix parsing rules
- validation field codes
- severity taxonomy
- launch gate pass/block rules
- operator override semantics
- sanitized audit/event payload shape

Any needed behavior should be rebuilt inside `admate-agent-core` behind Core
auth, RBAC, redaction, provider adapters, no-secret-output rules, and explicit
operator apply/approval boundaries.

## Next Safe Queue

Recommended next work is not standalone hardening of this repo. The safer next
queue is a Core-native extraction plan:

1. define typed launch validation event payloads in Core/Sentinel
2. map Legacy comparison fields into Core-safe validation codes
3. decide whether Google validation parity is in scope now
4. implement only approved pieces behind Core provider adapters
5. keep Legacy archived/read-only unless a separate standalone hardening project
   is explicitly approved
