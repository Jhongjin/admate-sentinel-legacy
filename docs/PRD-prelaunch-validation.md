# PRD: AdMate Sentinel Pre-launch Validation

## 1. Purpose

AdMate Sentinel Pre-launch Validation prevents campaign launch accidents by
checking approved media plans against the actual settings configured in Meta and
Google Ads before spend begins.

The product provides a launch gate for media planners, operators, and admins.
It answers one question: "Does the platform setup match the approved plan?"

## 2. Product Definition

AdMate Sentinel Pre-launch Validation is the pre-launch setup validation module
for AdMate Sentinel.

The system ingests the standard media-mix Excel file, fetches actual settings
from Meta and Google Ads, compares plan-vs-actual fields, records audit
history, and prepares validation/operator events for downstream systems such as
Openclaw.

## 3. Source of Truth

The media-mix Excel file is the source of truth.

Platform APIs represent actual configured state. If actual platform settings do
not match the Excel plan, the result must be reported as a validation issue
unless an authorized operator explicitly passes or overrides it.

## 4. Users

- Media planner: uploads or supplies the approved media-mix Excel file.
- Campaign operator: reviews validation issues and fixes platform setup.
- Team manager: reviews team-level validation history and approvals.
- Admin or super admin: manages platform credentials, teams, account mapping,
  user roles, and production readiness.

## 5. Scope

In scope:

- Excel upload and parsing
- Planned setting normalization
- Meta actual setting fetch
- Google Ads actual setting fetch
- Plan-vs-actual comparison
- Issue severity classification
- Audit history
- Operator pass or override records
- Candidate event integration with Openclaw

Out of scope:

- Post-launch spend monitoring
- Performance anomaly monitoring
- Automated campaign mutation or self-healing
- Openclaw repository merge
- Database schema changes without explicit approval
- Secret management redesign beyond approved hardening tasks

## 6. Boundary With Openclaw and Sentinel Live Monitoring

Pre-launch Validation owns checks before campaign launch:

- Is the right campaign configured?
- Are the right budgets, dates, names, URLs, UTMs, and conversion identifiers
  configured?
- Should launch be blocked until an issue is fixed or approved?

Openclaw and Sentinel Live Monitoring own checks after campaign launch:

- Spend pacing
- Budget burn anomalies
- Performance anomalies
- Runtime status and incident detection
- Ongoing operator workflows

Integration should happen through events and documented contracts, not direct
repo merging.

## 7. Core Flow

1. Upload: user uploads the standard media-mix Excel file.
2. Parse: the app parses the first worksheet into validation rows.
3. Normalize: campaign, ad set/ad group, ad, budget, date, URL, UTM, and
   conversion fields are normalized.
4. Fetch actuals: the server fetches actual settings from Meta or Google Ads.
5. Compare: planned values are compared with platform actuals.
6. Classify: issues receive severity and result status.
7. Audit: the validation run and issue details are written to audit history.
8. Operate: authorized users review, fix, or pass issues.
9. Integrate: candidate events can be sent to Openclaw after an integration
   contract is approved.

## 8. Validation Fields

Required product-level validation fields:

| Field | Description |
| --- | --- |
| Budget | Campaign-level or ad set/ad group-level budget. |
| Flight dates | Start and end dates. |
| Campaign name | Planned campaign name matched to actual campaign name. |
| Ad set or ad group name | Meta ad set or Google ad group name. |
| Ad name | Ad-level identifier for creative, URL, and UTM checks. |
| Landing URL | Final landing URL, normalized without irrelevant query variance. |
| UTM | Required tracking parameters. |
| Pixel or conversion ID | Meta pixel/event or Google conversion action identifier. |
| Objective | Campaign objective. |
| Buying type | Buying type such as auction or reserve. |
| Optimization goal | Delivery optimization target. |
| Billing event | Billing basis such as impressions or clicks. |

## 9. Matching Strategy

The first matching key is:

- Platform
- Ad account ID
- Campaign name
- Ad set or ad group name
- Ad name, when ad-level checks are required

Name matching may normalize whitespace and casing, but material differences
should be surfaced. If a matching platform entity cannot be found, the issue is
blocking by default.

## 10. Meta Comparison Structure

Meta actual fetch should collect:

- Account currency
- Campaign ID, name, objective, buying type, status
- Campaign daily or lifetime budget
- Campaign start and stop time
- Ad set ID, name, status
- Ad set daily or lifetime budget
- Optimization goal
- Billing event
- Promoted object, pixel ID, and event type
- Ad ID and name
- Creative landing URL
- URL tags or UTM parameters

The comparison engine should produce field-level diffs without exposing tokens
or raw secret-bearing URLs.

## 11. Google Ads Comparison Structure

Google Ads actual fetch should collect equivalent setup fields where available:

- Customer or account ID
- Campaign ID, name, objective or advertising channel metadata
- Campaign budget
- Start and end dates
- Ad group ID and name
- Ad ID or asset/ad name
- Final URLs
- Tracking template or final URL suffix
- Conversion action ID or name
- Bidding or optimization settings

Google parity with Meta is a product requirement, but implementation may be
phased after Phase 1 security hardening.

## 12. Issue Severity Taxonomy

`CRITICAL`

Must block launch. Examples include missing platform campaign, wrong account,
wrong landing URL, missing conversion ID for conversion campaigns, or actual
setup that cannot be fetched securely.

`HIGH`

Should block launch unless an authorized operator passes it. Examples include
material budget mismatch, start/end date mismatch, wrong campaign objective, or
wrong pixel/conversion ID.

`MEDIUM`

Requires review before launch. Examples include UTM mismatch, optimization goal
mismatch, billing event mismatch, or buying type mismatch.

`LOW`

Non-blocking consistency issue. Examples include normalized naming differences
that do not affect launch safety but should be cleaned up.

`INFO`

Context-only result. Examples include validation started, platform fetch
completed, no rows found, or all checks passed.

## 13. Validation Event Candidates

- `media_mix_uploaded`
- `media_mix_parse_failed`
- `validation_started`
- `validation_row_normalized`
- `platform_settings_fetch_started`
- `platform_settings_fetched`
- `platform_api_error`
- `issue_detected`
- `issue_resolved_by_recheck`
- `operator_override_applied`
- `operator_override_revoked`
- `validation_completed`
- `launch_gate_passed`
- `launch_gate_blocked`

Event payloads should include actor, team, platform, account ID, validation run
ID, campaign/adset/ad identifiers, issue code, severity, and redacted error
metadata. Payloads must not include secrets.

## 14. Openclaw Integration Candidates

Openclaw can consume:

- Validation run status
- Launch gate result
- Issue count by severity
- Blocking issue details
- Operator override events
- Platform API failure events
- Account mapping change events
- User role change events

Integration should be event-based or API-contract-based. Direct repo merging is
not allowed without explicit approval.

## 15. Security and Change Control Requirements

- Do not print secret, API key, token, refresh token, app secret, service role
  key, or environment variable values.
- Do not expose stored credentials in UI.
- Do not return raw provider errors that may contain sensitive request context.
- Do not put tokens in URL query strings.
- Do not change database schema without explicit approval.
- Do not merge this repo into Openclaw without explicit approval.

## 16. Success Criteria

The module is ready for production hardening completion when:

- Phase 1 security hardening is complete and verified.
- Standard media-mix Excel fields are documented and implemented consistently.
- Meta validation produces auditable field-level results.
- Google validation scope is documented, even if implementation is phased.
- Operator pass/override behavior is auditable.
- Openclaw integration events are documented without secret leakage.
