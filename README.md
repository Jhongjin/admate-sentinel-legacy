# AdMate Sentinel Pre-launch Validation

Ad-Sentinel is the dedicated repository for AdMate Sentinel Pre-launch
Validation. It prevents campaign setup accidents before launch by comparing the
approved media-mix Excel file with the actual settings configured in Meta and
Google Ads.

This repo is not the Openclaw repo and must not be directly merged into
Openclaw without a separately approved integration plan.

## Product Definition

AdMate Sentinel Pre-launch Validation is a launch gate for campaign setup.
Media planners upload the standard media-mix Excel file, and the system checks
whether platform settings match the approved plan before campaigns begin
spending.

The media-mix Excel file is the source of truth. Meta and Google Ads APIs are
used as the actual configured state.

## Product Boundary

This repo owns pre-launch validation:

- Planned setup ingestion from media-mix Excel
- Actual setup fetch from Meta and Google Ads
- Plan-vs-actual comparison
- Issue severity classification
- Validation audit history
- Candidate events for Openclaw integration

Openclaw and Sentinel Live Monitoring own post-launch operations:

- Spend and pacing monitoring
- Performance anomaly detection
- Ongoing campaign health monitoring
- Incident routing and operator workflows after launch

## Current Implementation Status

The current app is a Next.js and Supabase MVP.

Implemented or partially implemented:

- Supabase Auth based login and dashboard access
- Team, member, and account mapping screens
- Media settings screens for Meta and Google credentials
- Excel upload and parsing in the audit screen
- Meta campaign/ad set/ad comparison logic in the audit server action
- Audit history with pass/override handling
- Basic active dashboard view

Known gaps before production:

- Google validation is not yet implemented at parity with Meta.
- README and PRD were previously incomplete.
- Phase 1 security hardening must be completed before production.
- Database documentation and actual migrations need reconciliation before any
  schema work is approved.

## Core Validation Flow

1. A planner uploads the standard media-mix Excel file.
2. The browser parses the first worksheet into normalized rows.
3. The server fetches actual campaign settings from Meta or Google Ads.
4. The system compares the Excel plan with platform state.
5. Results are classified as `PASS`, `WARNING`, or `FAIL` in the UI.
6. Audit history is stored for review and operator follow-up.
7. Candidate validation/operator events can be sent to Openclaw later.

## Validation Fields

The validation scope includes:

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

## Issue Severity Taxonomy

The product-level severity taxonomy is:

- `CRITICAL`: Must block launch. Examples: wrong landing URL, missing required
  conversion ID, unauthorized account, campaign not found.
- `HIGH`: Should block launch unless an authorized operator explicitly passes
  the issue. Examples: budget materially different, date mismatch, wrong
  objective.
- `MEDIUM`: Needs review before launch. Examples: UTM mismatch, optimization
  or billing setting mismatch.
- `LOW`: Non-blocking cleanup or consistency issue. Examples: naming whitespace
  mismatch after normalization.
- `INFO`: Context-only result. Examples: platform fetch completed, no active
  rows found, validation run metadata.

## Candidate Validation Events

Candidate events for internal audit or Openclaw integration:

- `media_mix_uploaded`
- `media_mix_parse_failed`
- `validation_started`
- `platform_settings_fetched`
- `platform_api_error`
- `issue_detected`
- `validation_completed`
- `operator_override_applied`
- `all_issues_passed`
- `launch_gate_passed`
- `launch_gate_blocked`
- `account_mapping_changed`
- `platform_connection_tested`
- `user_role_changed`

Event payloads must never include secrets, API keys, tokens, refresh tokens, app
secrets, service role keys, or environment variable values.

## Security Rules

Do not print or expose secret, API key, token, refresh token, app secret,
service role key, or environment variable values.

Do not include real secret values in logs, API responses, screenshots, docs, or
error messages.

Environment variable names may be documented, but values must be omitted or
redacted.

## Phase 1 Hardening Gate

Before production use, this repo must complete Phase 1 hardening:

- Block `/api/debug` in production or remove it.
- Remove the Sidebar role switcher or make it development-only.
- Stop re-exposing saved tokens and secrets in settings UI.
- Replace token-in-URL-query platform API calls.
- Mask external API errors and logs.
- Reconfirm media settings server action authorization.
- Review `next.config.ts` build and lint ignore policy.
- Clean up root-level debug and test scripts.

See `docs/security-phase1-hardening-plan.md`.

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Run verification:

```bash
npm run build
npm run lint
```

Required environment variable names are intentionally not documented with
values. Use project-approved secret management and never commit `.env*` files.

## Change Control

Database schema changes require explicit approval before implementation.

Openclaw repository merges require explicit approval before any merge or
cross-repo change.

Feature development should not start until documentation and Phase 1 security
hardening scope are approved.
