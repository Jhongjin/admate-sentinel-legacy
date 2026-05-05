# Ad-Sentinel Agent Guide

## Mission

This repository is the dedicated AdMate Sentinel Pre-launch Validation repository.
Its job is to prevent campaign launch accidents before spend begins by comparing
the media planner's approved media-mix Excel file with the actual campaign
settings configured in Meta and Google Ads.

The media-mix Excel file is the source of truth. Platform APIs are treated as
actual state. Validation work must preserve that boundary.

## Product Boundary

AdMate Sentinel Pre-launch Validation covers pre-launch setup checks:

- Budget
- Flight dates
- Campaign name
- Ad set or ad group name
- Ad name
- Landing URL
- UTM parameters
- Pixel or conversion ID
- Objective
- Buying type
- Optimization goal
- Billing event

Openclaw and Sentinel Live Monitoring are adjacent systems, not this repo's
implementation target. They cover post-launch monitoring, spend pacing,
performance anomaly detection, ongoing status checks, and incident workflows.

Do not merge this repository directly into Openclaw. Integration should happen
through documented validation, audit, and operator events unless a separate
merge plan is explicitly approved.

## Core Flow

The intended validation flow is:

1. User uploads the standard media-mix Excel file.
2. The app parses rows into normalized planned campaign settings.
3. The app fetches actual settings from Meta or Google Ads for mapped accounts.
4. Planned settings are compared with actual platform settings.
5. The validation result is written to audit history.
6. Candidate validation/operator events are emitted or prepared for Openclaw.

## Security Rules

Never print, reveal, log, return, summarize, or include the value of any secret,
API key, token, refresh token, app secret, service role key, or environment
variable value.

Allowed in docs and code review:

- Environment variable names, without values
- Redacted examples such as `[REDACTED]`
- Descriptions of where secrets are used

Not allowed:

- Real token values
- Partial token prefixes or suffixes
- Raw external API URLs containing token query parameters
- Console output that includes secret values

## Change Control

Do not change database schema without explicit approval. This includes creating,
dropping, renaming, or altering tables, columns, policies, functions, triggers,
or migrations.

Do not perform feature development when the approved task is documentation,
planning, review, or security scoping.

Do not change Openclaw repositories or attempt repository merges from this repo
unless explicitly instructed.

Do not touch unrelated files. Keep changes scoped to the approved task.

## Phase 1 Hardening Priorities

Before production use, Phase 1 hardening must address:

1. Block or remove `/api/debug` in production.
2. Remove the Sidebar test role switcher or make it dev-only.
3. Stop re-exposing saved tokens and secrets in settings UI.
4. Remove or replace token-in-URL-query platform API calls.
5. Mask Meta and Google API errors and logs.
6. Reconfirm `settings/media` server action authorization.
7. Review `next.config.ts` build and lint ignore policy.
8. Restrict role changes to admin, super admin, or approved internal flows.
9. Prevent environment values and secrets from appearing in responses or logs.
10. Clean up root-level debug and test scripts before production.

## Event Naming Guidance

Use explicit event names that describe validation and operator activity:

- `media_mix_uploaded`
- `validation_started`
- `platform_settings_fetched`
- `issue_detected`
- `validation_completed`
- `operator_override_applied`
- `all_issues_passed`
- `launch_gate_passed`
- `launch_gate_blocked`
- `platform_api_error`
- `account_mapping_changed`
- `user_role_changed`

Event payloads must not contain secrets. Prefer stable identifiers, team IDs,
platform names, account IDs, campaign/adset/ad names, issue codes, severity,
redacted error metadata, actor IDs, and timestamps.
