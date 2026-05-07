# Sentinel Legacy Read-only Inventory v1

Date: 2026-05-07
Gate: Sentinel-Legacy-1
Repo: `D:\Projects\AdMate\admate-sentinel-legacy`
Related Agent Core repo: `D:\Projects\AdMate\admate-agent-core`
Status: read-only inventory; no code, API, DB, schema, migration, commit, or push action.

## 1. Repo Purpose

`admate-sentinel-legacy` is the legacy AdMate Sentinel Pre-launch Validation MVP.

Its product role is a launch gate before spend begins:

- The approved media-mix Excel file is the source of truth.
- Meta and Google Ads platform APIs represent actual configured state.
- Planned campaign settings are compared with actual platform settings.
- Validation results are recorded for audit history and operator review.
- Candidate validation/operator events can later be mapped into Agent Core.

This repo is not the production owner of `sentinel.admate.ai.kr`.
Production Sentinel / Agent Core operations are owned by `admate-agent-core`.
This repo must not be merged directly into Agent Core without a separately approved integration plan.

## 2. Functional Inventory

### 2.1 Documentation

Observed docs:

- `README.md`: product boundary, MVP state, local verification commands, hardening gate.
- `AGENTS.md`: source-of-truth rule, Openclaw boundary, security and change-control rules.
- `docs/PRD-prelaunch-validation.md`: product definition, validation fields, severity taxonomy, event candidates, Openclaw integration candidates.
- `docs/security-phase1-hardening-plan.md`: P0/P1/P2 hardening candidates and acceptance criteria.
- `docs/standard_media_mix.md`: standard media-mix hierarchy and required columns.
- `docs/db_schema.md`: legacy schema description.
- `docs/*.sql`: schema and policy reference snippets. These are reference artifacts only; do not run as migrations during this gate.

### 2.2 Excel Upload And Parser

Primary files:

- `src/app/(dashboard)/audit/AuditClientUI.tsx`
- `src/app/(dashboard)/audit/actions.ts`
- `src/app/(dashboard)/audit/page.tsx`

Observed behavior:

- Client-side audit UI parses the first worksheet from an uploaded Excel file.
- Parser helper candidates include budget and date normalization.
- Parsed rows are sent into a server action for platform comparison.
- UI renders result states such as pass, warning, and fail.
- A sample/reference data surface exists in the audit client UI.

Important boundary:

- Parser shape and validation rules are useful as legacy domain knowledge.
- Raw Excel row payloads and uploaded worksheet contents must not be migrated into Agent Core summaries.

### 2.3 Validation And Audit UI

Primary files:

- `src/app/(dashboard)/audit/AuditClientUI.tsx`
- `src/app/(dashboard)/audit/actions.ts`
- `src/app/(dashboard)/history/HistoryClientUI.tsx`
- `src/app/(dashboard)/history/actions.ts`
- `src/app/(dashboard)/history/page.tsx`

Observed behavior:

- `crosscheckApiAction` performs the main server-side comparison path.
- Meta validation appears more complete than Google parity.
- Audit history can show validation outcomes and issue details.
- History actions include individual pass and pass-all operations.
- Supabase table references include `users`, `platform_settings`, and `audit_logs`.

Useful concepts:

- Validation run status.
- Field-level issue summary.
- Operator pass / override behavior.
- Audit history and resolution state.

Do not migrate directly:

- Raw diff payloads.
- Raw campaign-level comparison payloads.
- Full provider responses.
- Full uploaded file contents.

### 2.4 Campaign, Account, And Media Settings

Primary files:

- `src/app/(dashboard)/settings/accounts/*`
- `src/app/(dashboard)/settings/media/*`
- `src/app/(dashboard)/settings/members/*`
- `src/app/(dashboard)/settings/teams/*`
- `src/app/(dashboard)/settings/users/page.tsx`

Observed behavior:

- Account mapping uses `team_account_map` and platform account metadata.
- Media settings use `platform_settings`.
- Team and member screens manage `teams` and `users`.
- Role surfaces include admin, manager, and member concepts.
- Media settings and connection-test paths reference provider credentials by name.

Useful concepts:

- Team-to-platform-account mapping.
- Role model and permission intent.
- Platform connection status metadata.

Do not migrate directly:

- Credential/token UI.
- Legacy credential storage shape.
- Any client-side credential value binding.
- Local role mutation patterns without Agent Core authorization review.

### 2.5 History And Active Views

Primary files:

- `src/app/(dashboard)/history/*`
- `src/app/(dashboard)/active/*`

Observed behavior:

- History reads `audit_logs` and supports pass/override review flows.
- Active view reads users, audit logs, account mappings, and platform settings.
- Active view contains platform fetch and token-query hardening candidates.

Useful concepts:

- Recent validation summary.
- Unresolved issue counts.
- Team/account scoped visibility.
- Launch readiness view candidates.

### 2.6 API Surfaces

Observed API routes:

- `GET /api/accounts`
  - Reads `team_account_map`.
  - Authenticated account lookup surface.
- `POST /api/audit`
  - Uses `planned_campaigns`, `platform_settings`, and `audit_logs`.
  - Legacy validation/audit write surface.
- `GET /api/debug`
  - Debug surface reading user/team/account mapping data.
  - Must remain a hardening candidate; do not expose in production.
- `POST /api/sync`
  - Writes or updates `planned_campaigns`.
  - Legacy plan ingestion/sync surface.

Do not migrate directly:

- API route implementations as-is.
- Debug route behavior.
- Legacy sync route semantics before Agent Core source-of-truth review.

### 2.7 Supabase Schema / Migration Reference

Observed migration:

- `supabase/migrations/00000_init.sql`

Observed legacy tables:

- `public.teams`
- `public.users`
- `public.team_account_map`
- `public.planned_campaigns`
- `public.live_campaign_settings`
- `public.audit_logs`

Observed schema intent:

- Teams and users establish local authorization scope.
- Team account maps connect teams to platform accounts.
- Planned campaigns represent media-mix source-of-truth rows.
- Live campaign settings represent fetched platform state.
- Audit logs record validation issue/diff/resolution state.

Important boundary:

- This schema is reference only.
- Do not run or port the migration as-is.
- Any future Agent Core DB work requires a separate migration proposal, rollback plan, RLS review, and explicit approval.

### 2.8 Root Debug / Test Scripts

Observed root scripts by filename and purpose only:

- `fetch_meta_debug.py`: local Meta debug helper candidate.
- `test_adset.js`: local Meta ad set test helper candidate.
- `test_meta_campaign.js`: local Meta campaign test helper candidate.
- `test_meta.mjs`: local Meta test helper candidate.
- `test.mjs`: local environment/test helper candidate.

These scripts reference environment or credential concepts and external API call paths. They are not production entrypoints and should not be migrated.

## 3. Candidates To Carry Into Agent Core

Carry these as knowledge, event contracts, or summary patterns, not as raw code.

### 3.1 Validation Events

Recommended Agent Core event candidates:

- `validation_started`
- `validation_completed`
- `issue_detected`
- `launch_gate_blocked`
- `launch_gate_passed`

Additional useful legacy candidates:

- `media_mix_uploaded`
- `media_mix_parse_failed`
- `platform_settings_fetched`
- `platform_api_error`
- `operator_override_applied`
- `all_issues_passed`
- `account_mapping_changed`
- `user_role_changed`

Event payload rule:

- Send only sanitized, minimal operational fields.
- Include stable IDs, team scope, platform, campaign identity, issue code, severity, status, actor ID, timestamps, and redacted error metadata.
- Do not send secrets, credential values, raw external API responses, raw Excel rows, full uploaded files, or raw diff payloads.

### 3.2 Operator Action Candidates

Potential Agent Core `operator_actions` concepts:

- `prelaunch_validation_started`
- `prelaunch_validation_completed`
- `prelaunch_issue_detected`
- `prelaunch_issue_resolved`
- `prelaunch_launch_blocked`
- `prelaunch_launch_passed`
- `prelaunch_override_applied`

Initial implementation should use an approved existing Agent Core action source or metadata field. Adding a first-class source enum is a DB migration candidate and needs separate approval.

### 3.3 Audit Log Candidates

Potential Agent Core audit concepts:

- Validation run created.
- Validation result updated.
- Issue state changed.
- Operator override applied or revoked.
- Account mapping changed.
- User role changed.
- Platform API validation failure recorded with redacted metadata.

Audit payloads should store before/after summaries only when needed and always redacted.

### 3.4 Command Center Summary Candidates

Executive-safe weekly or current-state fields:

- Pre-launch validation runs count.
- Launch-ready campaigns count.
- Launch-blocked campaigns count.
- Unresolved critical/high issue counts.
- Top blocker categories.
- Campaigns ready to enter Live Monitoring.
- Latest validation timestamp.
- Short owner-written weekly narrative.

Command Center must not display raw validation diffs, raw Excel data, credential references, or provider response bodies.

### 3.5 Common Campaign Identity Candidates

Candidate matching fields:

- `platform`
- `platform_campaign_id`
- `platform_account_id_hash`
- `campaign_name`
- `adset_or_group_name`
- `ad_name`
- `team_id`
- `media_mix_reference`
- `validation_run_id`

Matching priority should prefer Agent Core campaign primary key when present, then platform campaign ID, then scoped name matching. Low-confidence matches should remain unmapped rather than attached to the wrong campaign.

### 3.6 Severity Taxonomy Candidates

Legacy taxonomy worth preserving:

- `CRITICAL`: must block launch.
- `HIGH`: should block launch unless authorized override is applied.
- `MEDIUM`: needs review before launch.
- `LOW`: cleanup or non-blocking consistency issue.
- `INFO`: context-only status.

Agent Core may map this to its own alert or operator severity system, but the pre-launch launch-gate meaning should remain explicit.

## 4. Things Not To Carry Into Agent Core

Do not migrate:

- Raw Excel rows.
- Raw campaign-level diff payloads.
- Uploaded media-mix file contents.
- Credential/token UI.
- Stored credential value exposure patterns.
- Legacy Supabase schema or migrations as-is.
- `/api/debug`.
- Root debug/test scripts.
- Local `.env` or secret references.
- Raw external API request URLs.
- Raw provider errors or full provider response bodies.
- Legacy client-side role switch or role mutation patterns without Agent Core authorization review.

## 5. Preserve / Reference / Migrate / Do Not Migrate Classification

### Preserve

- README and AGENTS product boundary.
- PRD pre-launch validation domain model.
- Standard media-mix column model.
- Validation field list.
- Issue severity taxonomy.
- Event naming guidance.
- Phase 1 hardening plan.

### Reference Only

- Supabase schema and SQL snippets.
- Parser implementation and normalization helpers.
- Meta comparison flow.
- Audit/history UI behavior.
- Account mapping concepts.
- Role model intent.

### Migrate Later

- Sanitized validation event contract.
- Operator action mapping.
- Audit log mapping.
- Command Center summary fields.
- Common campaign identity mapping.
- Redaction rules for pre-launch events.

### Do Not Migrate

- Credentials and credential UI.
- Debug API behavior.
- Debug/test scripts.
- Raw Excel data.
- Raw campaign-level diffs.
- Raw provider responses.
- Legacy DB schema/migration files as direct production migrations.

## 6. Hardening Check Candidates For Later Gates

This gate did not modify code. The following are status-check candidates for a later hardening report.

### `/api/debug`

- Route exists at `src/app/api/debug/route.ts`.
- Read-only scan flags it as a debug JSON response surface with account/user/team data references.
- Later gate should verify production blocking, auth boundary, and absence of service/admin client exposure in public paths.

### Role Switcher / Role Mutation

- Role and permission surfaces exist in `src/components/Sidebar.tsx`, users, members, teams, accounts, and media settings screens.
- Later gate should verify whether any test role switcher or self-promotion path remains reachable in production.

### Token-in-query

- Token-query candidates were detected in:
  - `src/app/(dashboard)/audit/actions.ts`
  - `src/app/(dashboard)/active/page.tsx`
  - `src/app/(dashboard)/settings/accounts/page.tsx`
  - `src/app/(dashboard)/settings/media/actions.ts`
- Later gate should inspect provider fetch helpers and replace or isolate token query usage without logging raw URLs.

### Token UI / Credential Re-exposure

- Credential references and client value-binding candidates were detected in media settings surfaces.
- Later gate should verify that stored credential values are never sent back to client props, HTML, screenshots, logs, or API responses.

### Test / Debug Scripts

- Root debug/test scripts remain present.
- Later gate should classify them as remove, archive, or local-only with redacted output rules.

### Storage / Export / Download Surfaces

- No Supabase storage bucket usage was detected in the read-only pattern scan.
- Runtime download/export candidate was detected in the audit client UI.
- Later gate should verify whether any export/download includes raw Excel rows, raw diffs, or credential-bearing data.

## 7. Recommended Next Gates

1. `Sentinel-Legacy-2 Agent Core event contract mapping`
   - Map sanitized legacy validation events to Agent Core operator actions, audit logs, and Command Center summary fields.

2. `Sentinel-Legacy-3 hardening status report`
   - Produce a read-only hardening status report for `/api/debug`, role switching, token query use, credential UI, debug scripts, and export surfaces.

3. `Sentinel-Legacy-4 pre-launch validation domain taxonomy extraction`
   - Extract platform-neutral issue codes, severity rules, field taxonomy, matching identity, and launch gate decision rules.

## 8. Gate Result

Sentinel-Legacy-1 completed as an inventory document only.

No code merge was performed.
No DB/schema/migration was executed.
No API or environment value was opened or printed.
No raw Excel or campaign data was added.
No commit or push was performed.
