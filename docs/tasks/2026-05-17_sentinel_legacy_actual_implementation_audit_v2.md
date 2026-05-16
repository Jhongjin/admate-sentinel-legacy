# Sentinel Legacy actual implementation audit v2

Date: 2026-05-17

## Commander Verdict

Sentinel Legacy is an executable Next.js/Supabase MVP and useful reference
implementation. It should not become the production Sentinel site.

Production ownership should remain in `admate-agent-core`, where Sentinel is
already integrated with Core auth, RBAC, redaction, prelaunch ingest/status,
campaign monitoring, logs, and operator workflows.

## What is actually implemented

- Supabase login/session wiring and dashboard layout.
- Team, member, user, account mapping, and media settings surfaces.
- Media credential save/update flows with server actions.
- Meta connection test and partial Google credential/connectivity test logic.
- Browser-side media-mix Excel upload/parsing with `xlsx`.
- Meta-focused cross-check server action for campaign/ad set/ad/budget/date,
  objective, buying type, optimization, billing, pixel, landing URL, and UTM
  comparison.
- Audit history insertion, history view, and pass/override actions.
- Active dashboard view that can read recent audits and mapped platform state.
- Local auth fixture and role/action matrix harness.

## What remains missing or unsafe

- Google validation is not implemented at parity with Meta.
- `/api/sync` and `/api/audit` still include mock/demo style flows.
- No production Core/Sentinel event emitter exists in this repo.
- Supabase migrations and app expectations appear drifted; the initial
  migration and current audit UI/actions do not describe the same audit shape.
- Phase 1 hardening is still required before any standalone production use.
- `next.config.ts` still contains an unsupported `eslint` key for the current
  Next.js version and build-time TypeScript/ESLint ignore policy risk.
- Root debug/test scripts remain.
- Legacy implementation still includes direct provider/credential management
  surfaces that should not be ported directly into Core.

## Verification on 2026-05-17

Run from `D:\Projects\AdMate\admate-sentinel-legacy`.

- `npm run sentinel:local-auth-matrix`: passed.
  - 13 PASS.
  - No credential echo was detected by the fixture harness.
  - This improves on the previous v1 note where `/settings/media` no-session
    handling was not green.
- `npm run lint`: failed.
  - 28 errors and 14 warnings.
  - Main blockers are explicit `any`, unused variables, React immutability,
    unescaped entities, and root debug/test script lint violations.
- `npm run build`: failed.
  - The app compiled first.
  - Page-data collection then failed for `/api/audit` because local Supabase
    URL/anon key environment variables were not configured.
  - Build also reported the unsupported `eslint` config key and deprecated
    `middleware` convention warning.

## Integration decision

Do not publish this repo as `sentinel.admate.ai.kr`.

Do not directly merge Legacy app surfaces, schema, credential UI, mock routes,
or raw diff payloads into Core.

Use Legacy only as read-only reference material for:

- media-mix parsing rules;
- platform-neutral validation field codes;
- issue and severity taxonomy;
- launch gate pass/block rules;
- operator override UX;
- sanitized audit/event shapes.

## Recommended next Core-native actions

1. Continue Core/Sentinel as the production owner.
2. Rebuild needed Legacy concepts behind Core auth, RBAC, redaction, no-secret
   output, and audit boundaries.
3. Treat Legacy Meta comparison logic as reference only; rewrite it with typed
   provider adapters.
4. Decide whether Google validation is in scope now. If yes, implement Core
   parity. If no, avoid user-facing claims of Google parity.
5. Keep this repo archived/read-only unless a separate hardening project is
   explicitly approved.

