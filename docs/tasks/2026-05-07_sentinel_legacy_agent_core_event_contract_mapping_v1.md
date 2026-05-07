# Sentinel Legacy Agent Core Event Contract Mapping v1

Date: 2026-05-07
Gate: Sentinel-Legacy-2
Repo: `D:\Projects\AdMate\admate-sentinel-legacy`
Target integration repo: `D:\Projects\AdMate\admate-agent-core`
Status: design contract only; no code, API, DB, schema, migration, commit, or push action.

## 1. Purpose

This document maps the legacy AdMate Sentinel Pre-launch Validation lifecycle to sanitized Agent Core events.

The goal is to preserve the useful pre-launch validation operating model from `admate-sentinel-legacy` while keeping production ownership in `admate-agent-core`.

This contract is intentionally not an implementation. It does not create an ingest endpoint, table, migration, API route, scheduler, or emitter.

## 2. Source And Target Boundary

Legacy source:

- `admate-sentinel-legacy`
- Scope: media-mix Excel planning data compared with Meta or Google Ads setup before launch.
- Source of truth: approved media-mix Excel file.
- Actual state: platform API configuration.

Agent Core target:

- `admate-agent-core`
- Scope: shared identity, auth, operator actions, audit logs, Command Center summaries, Sentinel Live Monitoring, Hermes learning governance.
- Production Sentinel owner: Agent Core.

Integration principle:

- Use sanitized validation events and summaries.
- Do not merge legacy UI, parser, schema, credential handling, raw diffs, or debug surfaces.

## 3. Legacy Validation Lifecycle

Recommended lifecycle model:

1. `upload_received`
   - A planner or operator submits a media-mix file for validation.
2. `validation_started`
   - A validation run begins after basic file and permission checks.
3. `field_compared`
   - A planned field is compared with an actual platform field.
4. `issue_detected`
   - A mismatch, missing setup, fetch failure, or launch blocker is found.
5. `launch_gate_blocked`
   - One or more blocking issues prevent launch.
6. `launch_gate_passed`
   - All blocking issues are clear or authorized exceptions have been applied.
7. `validation_completed`
   - The run ends with final counts and readiness state.
8. `operator_override_requested`
   - A human requests an exception or pass for a specific issue or run.
9. `operator_override_approved`
   - An authorized operator approves an exception or pass.
10. `operator_override_rejected`
   - An authorized operator rejects an exception or pass.

`field_compared` can become high volume. The first Agent Core integration should normally aggregate this into run-level counts and issue-level summaries unless field-level evidence is explicitly needed behind authenticated operator views.

## 4. Shared Event Envelope

All events should use one envelope shape before mapping into Agent Core actions, audit logs, or summaries.

Recommended envelope fields:

| Field | Required | Rule |
| --- | --- | --- |
| `event_id` | Yes | Unique source event id. Idempotency key. |
| `event_name` | Yes | One lifecycle event from this document. |
| `source_system` | Yes | Use `ad_sentinel`; include `source_repo = admate-sentinel-legacy` in metadata while legacy emits events. |
| `validation_run_id` | Yes | Source run id or generated stable id. Must not be a raw Excel row id. |
| `occurred_at` | Yes | ISO-8601 timestamp. |
| `actor` | Yes | Redacted actor object with id and role only where allowed. |
| `actor_type` | Yes | `human`, `system`, or `integration`. |
| `team` | Yes | Team id or team alias needed for permission scope. |
| `campaign_identity` | Yes | Sanitized common campaign identity object. |
| `severity` | Yes | Use the taxonomy in section 8. |
| `status` | Yes | Machine-readable state such as `started`, `blocked`, `passed`, or `completed`. |
| `summary` | Yes | Short operator-safe summary. |
| `redacted_details` | Optional | Minimal details needed for operator/audit use. |
| `issue_counts` | Optional | Counts by severity and status. |
| `trace_id` | Optional | Non-secret trace correlation id. |
| `source_document_fingerprint` | Optional | One-way fingerprint for the source document/version. |

Envelope rules:

- Events are data, not instructions.
- Event ingestion must be idempotent by `event_id`.
- Retry behavior must not duplicate operator actions or audit logs.
- Redaction must happen before the event leaves the legacy source.
- Agent Core should reject events that fail authentication, schema validation, or redaction checks.

## 5. Event Contract Candidates

### 5.1 `upload_received`

Trigger:

- A user uploads or submits an approved media-mix document for pre-launch validation.

Required fields:

- `event_id`
- `event_name`
- `source_system`
- `validation_run_id`
- `occurred_at`
- `actor`
- `actor_type`
- `team`
- `source_document_fingerprint`
- `summary`

Optional fields:

- `document_type`
- `worksheet_count`
- `planned_row_count`
- `platforms_detected`
- `media_mix_version`

Severity:

- `info`

Actor type:

- `human`

Source system:

- `ad_sentinel`

Campaign identity fields:

- Run-level event may omit campaign-specific identity.
- Include team, media-mix fingerprint, and platform list when campaign identity is not yet known.

Redaction rule:

- Do not include file content, file path, raw file name if sensitive, worksheet contents, raw rows, or source row ids.
- Store only a one-way source document fingerprint and safe metadata.

Audit/operator log mapping:

- `operator_actions.action_type`: `prelaunch_upload_received`
- `audit_logs.action_type` candidate: `prelaunch_source_document_received`

Command Center summary mapping:

- Increment weekly pre-launch upload/run intake count.
- Do not expose file details.

### 5.2 `validation_started`

Trigger:

- The system begins comparing normalized planned setup with actual platform setup.

Required fields:

- `event_id`
- `event_name`
- `source_system`
- `validation_run_id`
- `occurred_at`
- `actor`
- `actor_type`
- `team`
- `campaign_identity`
- `summary`

Optional fields:

- `platform`
- `supported_platform`
- `planned_entity_count`
- `validation_scope`
- `source_document_fingerprint`

Severity:

- `info`

Actor type:

- `human` when manually triggered.
- `system` when scheduled or automatically triggered after upload.

Source system:

- `ad_sentinel`

Campaign identity fields:

- `campaign_id` when already mapped to Agent Core.
- Otherwise platform plus campaign name plus team-scoped identity.

Redaction rule:

- Do not include raw planned rows, raw actual settings, credentials, or provider request metadata.

Audit/operator log mapping:

- `operator_actions.action_type`: `prelaunch_validation_started`
- `audit_logs.action_type` candidate: `prelaunch_validation_run_started`

Command Center summary mapping:

- Count as a validation run started for the week.

### 5.3 `field_compared`

Trigger:

- A single planned field is compared with a platform actual field.

Required fields:

- `event_id`
- `event_name`
- `source_system`
- `validation_run_id`
- `occurred_at`
- `actor_type`
- `team`
- `campaign_identity`
- `field_code`
- `comparison_status`
- `summary`

Optional fields:

- `normalized_planned_present`
- `normalized_actual_present`
- `comparison_method`
- `tolerance_code`
- `issue_code`

Severity:

- `info` for match.
- `warning` or `needs_review` for non-blocking mismatch.
- `blocked` only when the field result blocks launch.

Actor type:

- `system`

Source system:

- `ad_sentinel`

Campaign identity fields:

- Include sanitized campaign, ad set/group, and ad identity only when required for the compared field.

Redaction rule:

- Do not send raw planned value and raw actual value by default.
- Send field code, match status, mismatch category, and redacted value class only.
- URL checks should send normalized domain/path summary only when needed, not full URL.

Audit/operator log mapping:

- No default `operator_actions` row for every field comparison.
- `audit_logs.action_type` candidate only for persisted issue evidence: `prelaunch_field_compared`.

Command Center summary mapping:

- Aggregate only. Do not display field-level rows.

### 5.4 `issue_detected`

Trigger:

- A mismatch, missing platform entity, unsupported platform state, API failure, or launch blocker is found.

Required fields:

- `event_id`
- `event_name`
- `source_system`
- `validation_run_id`
- `occurred_at`
- `actor_type`
- `team`
- `campaign_identity`
- `issue_id`
- `issue_code`
- `severity`
- `summary`

Optional fields:

- `field_code`
- `issue_category`
- `blocking`
- `remediation_hint`
- `redacted_details`
- `source_issue_ref`

Severity:

- `warning`
- `needs_review`
- `blocked`

Actor type:

- `system`

Source system:

- `ad_sentinel`

Campaign identity fields:

- Include the narrowest required identity: campaign only, ad set/group, or ad.

Redaction rule:

- Do not include raw Excel row, raw diff payload, raw external API response, token-bearing URL, full landing URL, or credential metadata.
- Use redacted mismatch categories such as `budget_mismatch`, `date_mismatch`, `landing_url_mismatch`, `utm_mismatch`, `pixel_or_conversion_mismatch`, `objective_mismatch`, `optimization_goal_mismatch`, or `billing_event_mismatch`.

Audit/operator log mapping:

- `operator_actions.action_type`: `prelaunch_issue_detected`
- `audit_logs.action_type` candidate: `prelaunch_issue_detected`

Command Center summary mapping:

- Increment blocker or review count by severity and issue category.
- Top blocker categories may include the sanitized `issue_category`.

### 5.5 `launch_gate_blocked`

Trigger:

- Validation determines the campaign or run is not safe to launch.

Required fields:

- `event_id`
- `event_name`
- `source_system`
- `validation_run_id`
- `occurred_at`
- `actor_type`
- `team`
- `campaign_identity`
- `severity`
- `issue_counts`
- `summary`

Optional fields:

- `blocking_issue_ids`
- `top_issue_categories`
- `next_action_hint`
- `ready_after_override_possible`

Severity:

- `blocked`

Actor type:

- `system`

Source system:

- `ad_sentinel`

Campaign identity fields:

- Prefer Agent Core `campaign_id` when mapped.
- Otherwise include platform, account alias/hash, campaign name, team, period, and source document fingerprint.

Redaction rule:

- Do not include raw issue details, raw diff payloads, or uploaded file contents.
- `blocking_issue_ids` should be source issue ids, not raw Excel row ids.

Audit/operator log mapping:

- `operator_actions.action_type`: `prelaunch_launch_gate_blocked`
- `audit_logs.action_type` candidate: `prelaunch_launch_readiness_changed`

Command Center summary mapping:

- Increment launch-blocked campaign count.
- Include category counts only, not row-level evidence.

### 5.6 `launch_gate_passed`

Trigger:

- Validation determines the campaign or run is ready to launch after all blocking issues are clear or authorized exceptions are applied.

Required fields:

- `event_id`
- `event_name`
- `source_system`
- `validation_run_id`
- `occurred_at`
- `actor_type`
- `team`
- `campaign_identity`
- `severity`
- `summary`

Optional fields:

- `issue_counts`
- `override_count`
- `ready_to_live_monitoring`
- `validated_platforms`

Severity:

- `passed`

Actor type:

- `system` when computed.
- `human` when manually marked after review.

Source system:

- `ad_sentinel`

Campaign identity fields:

- Include campaign identity sufficient to connect to Live Monitoring.

Redaction rule:

- Do not include raw pass evidence or full comparison table.
- Summarize resolved issue counts and authorized exception count.

Audit/operator log mapping:

- `operator_actions.action_type`: `prelaunch_launch_gate_passed`
- `audit_logs.action_type` candidate: `prelaunch_launch_readiness_changed`

Command Center summary mapping:

- Increment launch-ready count.
- Candidate count for campaigns ready to enter Live Monitoring.

### 5.7 `validation_completed`

Trigger:

- A validation run ends successfully or with a final blocked/review state.

Required fields:

- `event_id`
- `event_name`
- `source_system`
- `validation_run_id`
- `occurred_at`
- `actor_type`
- `team`
- `campaign_identity`
- `status`
- `severity`
- `issue_counts`
- `summary`

Optional fields:

- `duration_ms`
- `platforms_validated`
- `platforms_skipped`
- `unsupported_platforms`
- `ready_to_launch`
- `source_document_fingerprint`

Severity:

- `passed`
- `needs_review`
- `blocked`
- `warning`
- `info`

Actor type:

- `system`

Source system:

- `ad_sentinel`

Campaign identity fields:

- Run-level event may include multiple campaign identities by reference. For MVP, prefer one event per campaign or a run summary with counts.

Redaction rule:

- Include issue counts and readiness state only.
- Do not include raw row list, raw platform response, or raw diff table.

Audit/operator log mapping:

- `operator_actions.action_type`: `prelaunch_validation_completed`
- `audit_logs.action_type` candidate: `prelaunch_validation_result_created`

Command Center summary mapping:

- Update weekly validation run count, passed/blocked/review counts, and latest validation timestamp.

### 5.8 `operator_override_requested`

Trigger:

- A user asks for an exception, pass, or waiver for a validation issue or run.

Required fields:

- `event_id`
- `event_name`
- `source_system`
- `validation_run_id`
- `occurred_at`
- `actor`
- `actor_type`
- `team`
- `campaign_identity`
- `issue_id`
- `severity`
- `summary`

Optional fields:

- `override_reason_code`
- `operator_note_summary`
- `requested_until`
- `reviewer_role_required`

Severity:

- `needs_review`

Actor type:

- `human`

Source system:

- `ad_sentinel`

Campaign identity fields:

- Include issue-level campaign identity. Do not include raw Excel row id.

Redaction rule:

- Operator notes must be summarized and redacted.
- Do not include pasted raw URLs, credentials, raw provider responses, or customer-sensitive detail.

Audit/operator log mapping:

- `operator_actions.action_type`: `prelaunch_override_requested`
- `audit_logs.action_type` candidate: `prelaunch_issue_override_requested`

Command Center summary mapping:

- Optional aggregate count of pending override requests.
- Do not show request notes in executive display.

### 5.9 `operator_override_approved`

Trigger:

- An authorized reviewer/admin approves an exception or pass.

Required fields:

- `event_id`
- `event_name`
- `source_system`
- `validation_run_id`
- `occurred_at`
- `actor`
- `actor_type`
- `team`
- `campaign_identity`
- `issue_id`
- `approval_scope`
- `severity`
- `summary`

Optional fields:

- `override_reason_code`
- `expires_at`
- `review_note_summary`
- `previous_gate_status`
- `new_gate_status`

Severity:

- `suppressed`
- `overridden`
- `passed` when the approval clears the final blocker.

Actor type:

- `human`

Source system:

- `ad_sentinel`

Campaign identity fields:

- Include issue-level campaign identity and validation run id.

Redaction rule:

- Do not include raw issue details beyond sanitized issue code and category.
- Store review note summary only.

Audit/operator log mapping:

- `operator_actions.action_type`: `prelaunch_override_approved`
- `audit_logs.action_type` candidate: `prelaunch_issue_exception_approved`

Command Center summary mapping:

- Increment overridden/suppressed count.
- If this changes readiness, update launch-ready or blocked counts.

### 5.10 `operator_override_rejected`

Trigger:

- An authorized reviewer/admin rejects an exception or pass request.

Required fields:

- `event_id`
- `event_name`
- `source_system`
- `validation_run_id`
- `occurred_at`
- `actor`
- `actor_type`
- `team`
- `campaign_identity`
- `issue_id`
- `severity`
- `summary`

Optional fields:

- `rejection_reason_code`
- `review_note_summary`
- `previous_gate_status`
- `new_gate_status`

Severity:

- `blocked` if launch remains blocked.
- `needs_review` if further action is still needed.

Actor type:

- `human`

Source system:

- `ad_sentinel`

Campaign identity fields:

- Include issue-level campaign identity and validation run id.

Redaction rule:

- Review notes must be redacted and summarized.
- Do not include raw data or full diff evidence.

Audit/operator log mapping:

- `operator_actions.action_type`: `prelaunch_override_rejected`
- `audit_logs.action_type` candidate: `prelaunch_issue_exception_rejected`

Command Center summary mapping:

- Increment rejected override count only in operator-safe views.
- Executive summaries should show the campaign remains blocked or needs review, not rejection detail.

## 6. Agent Core Mapping

### 6.1 `operator_actions` Action Type Candidates

Recommended action types:

| Legacy event | Agent Core `operator_actions.action_type` candidate | Actor |
| --- | --- | --- |
| `upload_received` | `prelaunch_upload_received` | human |
| `validation_started` | `prelaunch_validation_started` | human or system |
| `field_compared` | no default row; aggregate only | system |
| `issue_detected` | `prelaunch_issue_detected` | system |
| `launch_gate_blocked` | `prelaunch_launch_gate_blocked` | system |
| `launch_gate_passed` | `prelaunch_launch_gate_passed` | system or human |
| `validation_completed` | `prelaunch_validation_completed` | system |
| `operator_override_requested` | `prelaunch_override_requested` | human |
| `operator_override_approved` | `prelaunch_override_approved` | human |
| `operator_override_rejected` | `prelaunch_override_rejected` | human |

Payload guidance:

- Store `source_system = ad_sentinel` in request/result metadata.
- Store `source_repo = admate-sentinel-legacy` while the legacy repo is the emitter.
- Use existing Agent Core action source values until a DB migration explicitly approves `ad_sentinel` as a first-class source.
- Store only redacted `request_payload`, `result_payload`, and `error_message`.

### 6.2 `audit_logs` Event Type Candidates

Recommended audit candidates:

| Legacy event | Agent Core `audit_logs.action_type` candidate | Target |
| --- | --- | --- |
| `upload_received` | `prelaunch_source_document_received` | validation run |
| `validation_started` | `prelaunch_validation_run_started` | validation run |
| `field_compared` | `prelaunch_field_compared` only when persisted evidence is needed | validation issue |
| `issue_detected` | `prelaunch_issue_detected` | validation issue |
| `launch_gate_blocked` | `prelaunch_launch_readiness_changed` | campaign or validation run |
| `launch_gate_passed` | `prelaunch_launch_readiness_changed` | campaign or validation run |
| `validation_completed` | `prelaunch_validation_result_created` | validation run |
| `operator_override_requested` | `prelaunch_issue_override_requested` | validation issue |
| `operator_override_approved` | `prelaunch_issue_exception_approved` | validation issue |
| `operator_override_rejected` | `prelaunch_issue_exception_rejected` | validation issue |

Audit guidance:

- Audit entries should be append-only.
- Before/after snapshots must be redacted.
- State changes should link to operator action ids when both are created.
- Debug route payloads and raw legacy table rows must not become audit snapshots.

### 6.3 Command Center Weekly / Update Summary Candidates

Executive-safe summary fields:

- `prelaunch_validation_runs_count`
- `prelaunch_launch_ready_count`
- `prelaunch_launch_blocked_count`
- `prelaunch_needs_review_count`
- `prelaunch_unresolved_blocker_count`
- `prelaunch_override_approved_count`
- `prelaunch_top_blocker_categories`
- `prelaunch_latest_validation_at`
- `prelaunch_ready_for_live_monitoring_count`
- `prelaunch_weekly_summary_text`

Recommended summary copy shape:

```text
Sentinel pre-launch completed {run_count} validation runs. {ready_count} campaigns are launch-ready, {blocked_count} remain blocked, and {needs_review_count} need operator review.
```

Command Center display rules:

- Show counts, status, and top issue categories.
- Do not show raw validation rows, account secrets, raw URLs, full diffs, or detailed Excel contents.
- Keep executive display read-only.

### 6.4 Hermes Learning Candidate Signals

Signals that may be considered as sanitized Hermes learning candidates after approval:

- Repeated issue categories by platform and objective.
- Field mismatch frequency by sanitized field code.
- Override approval/rejection rates by issue code.
- Launch gate blocked-to-passed resolution patterns.
- Non-secret remediation hint effectiveness.
- Platform-specific validation coverage gaps.

Learning governance:

- Do not train Hermes directly from ordinary user actions.
- Do not use smoke/test/sample events.
- Use `learning_candidate -> reviewer/admin approval -> applied knowledge`.
- Keep campaign-level sensitive data out of LLM prompts.

### 6.5 Data That Must Never Be Sent To Hermes Or Agent Core Summaries

Never send:

- Raw Excel rows.
- Raw worksheet contents.
- Raw validation diffs.
- Full landing URLs when a domain/path category is sufficient.
- Credentials, tokens, refresh tokens, app secrets, service keys, cookies, or session values.
- Raw platform API responses.
- Debug route payloads.
- Actual campaign performance rows.
- Customer-sensitive notes copied into operator comments.
- Local environment variable values.

## 7. Common Campaign Identity

Recommended `campaign_identity` object:

| Field | Required | Redaction / Matching Rule |
| --- | --- | --- |
| `campaign_id` | Optional | Prefer Agent Core internal campaign id when available. |
| `platform` | Yes | Controlled value such as `meta` or `google`. |
| `platform_campaign_id` | Optional | Use only if operationally required and permitted. |
| `account_alias` | Yes | Use a human-safe account alias or masked/hash identifier. |
| `account_id_hash` | Recommended | One-way hash for matching. Do not expose raw account secret. |
| `campaign_name` | Conditional | Allowed in operator views; summarize or mask if sensitive for public display. |
| `adset_or_group_name` | Optional | Include only for issue-level matching. |
| `ad_name` | Optional | Include only for ad-level URL/UTM checks. |
| `advertiser_alias` | Optional | Use alias or masked display name. |
| `brand_alias` | Optional | Use alias or masked display name. |
| `period` | Recommended | Start/end date or month-level range. Avoid raw row context. |
| `objective` | Recommended | Controlled objective category. |
| `owner_team` | Yes | Agent Core team or project scope. |
| `owner_user_id` | Optional | Internal actor id only; do not expose personal details publicly. |
| `source_document_fingerprint` | Recommended | One-way fingerprint for source document/version. |
| `validation_run_id` | Yes | Stable run id. |

Rules:

- Raw Excel row id is internal-only and must not be exposed outside the legacy validation service.
- If a row reference is needed for source traceability, use a source issue id or opaque source ref that cannot reconstruct row contents.
- If matching confidence is low, keep the event as `needs_mapping` rather than attaching it to the wrong Agent Core campaign.
- Advertiser and brand should be masked or aliased in executive display unless explicitly approved for that audience.

## 8. Severity Taxonomy

Recommended Agent Core pre-launch severity/status taxonomy:

| Severity | Meaning | Launch effect |
| --- | --- | --- |
| `info` | Context-only event such as upload or start. | No launch effect. |
| `warning` | Non-blocking mismatch or partial validation concern. | Operator-visible but does not block by itself. |
| `needs_review` | Human review needed before launch decision. | Launch should wait unless policy allows continuation. |
| `blocked` | Must block launch until fixed or explicitly overridden. | Launch gate blocked. |
| `passed` | Validation passed or readiness confirmed. | Launch gate passed. |
| `suppressed` | Issue hidden or muted under approved rule. | Must retain audit trail. |
| `overridden` | Authorized exception applied. | May allow launch, but remains auditable. |

Mapping from legacy product severity:

- `INFO` -> `info`
- `LOW` -> `warning`
- `MEDIUM` -> `needs_review`
- `HIGH` -> `blocked` unless explicitly overridden
- `CRITICAL` -> `blocked`
- legacy `PASS` -> `passed`
- legacy `WARNING` -> `warning` or `needs_review` depending on issue code
- legacy `FAIL` -> `blocked`

## 9. Do-not-migrate Boundary

The following must not move into Agent Core implementation or public/executive summaries:

- Raw Excel row.
- Raw Excel/CSV/data artifact.
- Raw validation diff.
- Raw campaign-level actual state payload.
- Credential, token, refresh token, app secret, service key, cookie, or session value.
- Raw media account secret.
- Local Supabase schema or migration as-is.
- `/api/debug` payloads.
- Root debug/test script behavior.
- Full external API request URLs.
- Raw external API response bodies.
- Actual campaign performance rows.
- Unredacted advertiser/brand/customer-sensitive notes.

Legacy schema and parser code may be read as reference only. Future Agent Core DB/API work requires a separate design, migration proposal, rollback plan, RLS/auth review, and explicit approval.

## 10. Later Intake Design Notes

For a future Agent Core intake gate, the safest shape is:

1. Receive sanitized pre-launch events through a dedicated authenticated server-to-server path.
2. Validate envelope schema and idempotency key.
3. Reject events with forbidden fields or raw-data markers.
4. Store operator action and audit log entries using approved current Agent Core write paths.
5. Update read-only summary material only after redaction.
6. Emit Hermes learning candidates only as reviewable proposals.

Open design questions:

- Whether Agent Core needs first-class `prelaunch_validation_runs` and `prelaunch_validation_issues` tables.
- Whether `ad_sentinel` becomes an allowed `action_source` enum value.
- How long pre-launch issue evidence is retained.
- Whether field-level compared events are stored or only aggregated.
- How source document fingerprints are generated and rotated.

These questions are DB/API design topics and are outside this gate.

## 11. Follow-up Gate Recommendations

1. `Sentinel-Legacy-3 hardening status report`
   - Read-only status report for `/api/debug`, role switching, token query use, credential UI, debug scripts, and export surfaces.

2. `Sentinel-Legacy-4 validation taxonomy extraction`
   - Extract platform-neutral field codes, issue codes, severity mapping, launch gate rules, and redaction rules from the legacy MVP.

3. `AgentCore-Sentinel-1 event contract intake design`
   - Design the Agent Core ingest route, validation schema, idempotency behavior, operator/audit writes, and DB/API risk before any implementation.

## 12. Gate Result

Sentinel-Legacy-2 completed as a documentation-only event contract mapping.

No code merge was performed.
No DB/schema/migration was executed.
No API or environment value was opened or printed.
No raw Excel/CSV/campaign data was added.
No commit or push was performed.
