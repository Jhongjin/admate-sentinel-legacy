# Security Phase 1 Hardening Plan

## 1. Goal

Phase 1 hardening defines the minimum security work required before
Ad-Sentinel can be treated as the AdMate Sentinel Pre-launch Validation
production candidate.

This plan is documentation only until implementation is separately approved.
No database schema changes are included in Phase 1 without explicit approval.

## 2. Non-Negotiable Rules

- Do not print, log, return, or document secret values.
- Do not expose API keys, access tokens, refresh tokens, app secrets, service
  role keys, or environment variable values.
- Do not merge this repo into Openclaw.
- Do not change database schema without explicit approval.
- Do not add new product features while performing Phase 1 hardening.

## 3. Risk Priority

| Priority | Risk | Impact | Primary files |
| --- | --- | --- | --- |
| P0 | `/api/debug` can expose sensitive user/team/account data. | Data exposure and RLS bypass risk. | `src/app/api/debug/route.ts` |
| P0 | Sidebar test role switcher can mutate real user roles. | Privilege escalation risk. | `src/components/Sidebar.tsx` |
| P0 | Saved platform tokens/secrets are re-exposed in settings UI. | Credential leakage risk. | `src/app/(dashboard)/settings/media/page.tsx`, `TokenInput.tsx`, test buttons |
| P1 | Tokens are placed in URL query strings for provider calls. | Token leakage through logs, traces, and provider/debug tooling. | `audit/actions.ts`, `active/page.tsx`, `settings/accounts/page.tsx`, `settings/media/actions.ts` |
| P1 | External API errors/logs may include sensitive context. | Secret or account metadata leakage. | `audit/actions.ts`, `settings/media/actions.ts` |
| P1 | Role changes need a strict admin/internal boundary. | Unauthorized privilege changes. | `Sidebar.tsx`, `settings/users/page.tsx`, `settings/members/actions.ts` |
| P2 | Build and lint errors are ignored in production builds. | Broken or unsafe code can ship. | `next.config.ts` |
| P2 | Root debug/test scripts are mixed into the production repo. | Accidental secret usage or unsafe execution. | `fetch_meta_debug.py`, `test*.js`, `test*.mjs` |

## 4. Required Hardening Items

### 4.1 Block `/api/debug` in production

Plan:

- Remove the route or gate it behind both development environment checks and
  admin authentication.
- Ensure it never uses service role credentials in a public request path.
- Ensure responses do not include sensitive account mapping data unless
  explicitly authorized.

Acceptance:

- Production requests cannot access `/api/debug`.
- Unauthenticated users receive no data.
- No secret-bearing client is initialized for public debug output.

### 4.2 Remove or dev-only Sidebar role switcher

Plan:

- Remove the test role switcher from production UI.
- If retained for local development, gate it behind a development-only flag and
  prevent production builds from rendering it.
- Role updates must go through admin or super admin flows only.

Acceptance:

- Normal users cannot mutate their own role from the Sidebar.
- Production UI contains no role switcher test control.
- Role mutation paths require admin or super admin authorization.

### 4.3 Stop token/secret UI re-exposure

Plan:

- Do not pass stored token, refresh token, app secret, or developer token values
  back to client components as `defaultValue` props.
- Show only status metadata such as configured/not configured and last updated
  time.
- Allow replacement values to be submitted without revealing the previous
  values.

Acceptance:

- Saved credential values are not visible in page HTML, React props, browser dev
  tools, or screenshots.
- Credential fields render empty placeholders for replacement.
- Connection tests run server-side without passing credential values to clients.

### 4.4 Remove token URL query calls

Plan:

- Replace provider requests that append tokens to URL query strings.
- Prefer `Authorization` headers where the provider supports them.
- Where a provider requires query parameters, isolate the call server-side,
  prevent URL logging, and redact request metadata.

Acceptance:

- Application logs do not contain token-bearing URLs.
- Error messages do not include token-bearing URLs.
- Provider fetch helpers centralize redaction behavior.

### 4.5 Mask Meta API errors/logs

Plan:

- Normalize external API errors into safe internal error objects.
- Log provider, status code, endpoint purpose, and redacted account identifier.
- Do not log raw request URLs, raw token values, or raw provider responses when
  they may contain sensitive context.

Acceptance:

- Audit errors are useful for diagnosis without exposing secrets.
- UI messages show safe failure reasons.
- Console logs and server logs use redacted metadata only.

### 4.6 Reconfirm `settings/media` authorization

Plan:

- Keep credential save/update server actions restricted to `SUPER_ADMIN` and
  `ADMIN`.
- Ensure connection test actions do not accept secret values from client props.
- Prefer server-side lookup of saved credentials after authorization.

Acceptance:

- Non-admin users cannot read, write, or test platform credentials.
- Client components never receive stored credential values.
- Failed authorization returns safe messages.

### 4.7 Review `next.config.ts` ignore policy

Plan:

- Remove or justify `typescript.ignoreBuildErrors`.
- Remove or justify `eslint.ignoreDuringBuilds`.
- If temporary exceptions remain, document an owner and removal condition.

Acceptance:

- Production build policy is explicit.
- Type and lint failures cannot silently ship without documented approval.

### 4.8 Restrict role changes

Plan:

- Ensure role changes are available only to admin/super admin flows or approved
  internal provisioning.
- Confirm team managers cannot assign elevated roles.
- Log role change candidate events without exposing secrets.

Acceptance:

- Users cannot self-promote.
- Role changes are auditable.
- Unauthorized role change attempts fail safely.

### 4.9 Block env/secret response and log exposure

Plan:

- Review API routes, server actions, debug scripts, and console logs.
- Replace raw error output with redacted summaries.
- Document allowed environment variable names without values.

Acceptance:

- No API response includes secret values.
- No logs include secret values.
- Debug output uses `[REDACTED]` where sensitive values might appear.

### 4.10 Clean up debug/test scripts

Plan:

- Decide whether root debug/test scripts are removed, moved under a clearly
  marked local-only directory, or documented as non-production utilities.
- Ensure scripts do not print sensitive data.
- Ensure scripts cannot be mistaken for production validation entrypoints.

Acceptance:

- Production repo root is not cluttered with unsafe debug entrypoints.
- Any retained script has a clear local-only warning.
- Script output is redacted.

## 5. Validation Plan

Run after Phase 1 implementation:

```bash
git diff --check
npm run build
npm run lint
```

Manual checks:

- Request `/api/debug` as unauthenticated user in production-like mode.
- Confirm Sidebar has no production role switcher.
- Inspect settings/media HTML and browser props for saved credential values.
- Trigger platform connection tests and verify no credential value appears in
  client payloads.
- Force provider API failure and confirm logs/UI are redacted.
- Attempt role change as member, team manager, admin, and super admin.
- Search changed files for token-in-query patterns.
- Search logs for known redaction markers and absence of secret values.

## 6. Phase 1 Implementation Candidate Files

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
- `fetch_meta_debug.py`
- `test_adset.js`
- `test_meta_campaign.js`
- `test_meta.mjs`
- `test.mjs`

## 7. Completion Criteria

Phase 1 is complete when:

- P0 items are fixed and verified.
- P1 items are fixed or have explicitly approved compensating controls.
- Credential values are not re-exposed through UI, logs, or responses.
- Role changes are restricted to authorized flows.
- Build/lint policy is explicit.
- Debug/test scripts are removed, relocated, or documented as local-only.
- Verification results are documented in the final implementation report.

## 8. First Implementation Approval Phrase

Use this phrase to approve Phase 1 implementation:

`승인: Phase 1 hardening 구현을 진행해라. /api/debug 차단, Sidebar role switcher 제거 또는 dev-only 처리, token/secret UI 재노출 차단, token URL query 제거 후보 정리, Meta API error/log 마스킹, settings/media 권한 확인, next.config.ts 정책 점검, debug/test script 정리를 코드 변경으로 진행해라. DB schema 변경과 Openclaw 병합은 하지 마라.`
