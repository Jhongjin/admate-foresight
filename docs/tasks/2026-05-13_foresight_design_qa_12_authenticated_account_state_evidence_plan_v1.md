# Foresight Design QA 12 Authenticated Account State Evidence Plan v1

Date: 2026-05-13
Repo: admate-foresight
Status: docs-only evidence plan

## Purpose

Prepare the next authenticated Foresight account-state QA gate after the
production `/trends` visual smoke passed.

This artifact does not authorize login, browser session inspection, SQL,
Auth/DB mutation, product access changes, benchmark import/upload, Meta API
calls, Python retrain, environment readback, deployment changes, or production
data mutation.

## Current Baseline

Closed evidence from the latest human smoke:

- authenticated `/trends` renders usable desktop and mobile empty states
- logout returns to the Foresight login shell
- protected access after logout fails closed to login
- no token, session, cookie, handoff code, credential, environment value,
  provider payload, or debug marker was visible in supplied screenshots

Remaining account/auth evidence:

- active `/account` positive path
- account state copy after valid product-local session
- denied/disabled/pending/workspace-unavailable copy, if those states can be
  produced by an operator-owned fixture
- data-backed chart states remain separate and are not covered by this plan

## Commander Decision

The next safe Foresight step is an evidence policy for authenticated account
state review, not an immediate authenticated browser run.

The actual account-state smoke remains human-gated because it may require a
real login, product-local session, role/entitlement state, or visible account
copy. The agent must record only sanitized UI evidence supplied by the operator
or collected under a separate approval.

## Target Routes

Primary route:

```text
https://foresight.admate.ai.kr/account
```

Supporting routes, only if explicitly approved:

```text
https://foresight.admate.ai.kr/
https://foresight.admate.ai.kr/trends
https://foresight.admate.ai.kr/insights
https://foresight.admate.ai.kr/competitor
https://foresight.admate.ai.kr/login
```

## State Matrix

| State | Required owner action | Allowed evidence | Expected user-visible behavior |
| --- | --- | --- | --- |
| Active access | Operator opens `/account` with an already valid Foresight session. | Route, visible title/body copy, visible account state label, available actions, viewport size. | Account state is positive and does not expose session or internal auth detail. |
| Logout complete | Operator clicks logout or opens the logged-out state. | Route, login shell copy, safe return target copy, primary/secondary action labels. | Login shell explains logout and offers AdMate login continuation. |
| Access denied | Operator-provisioned access-denied fixture only. | State label, denied copy, available recovery action, viewport size. | Copy explains that access is not active without showing internal role or policy names. |
| Entitlement disabled | Operator-provisioned disabled entitlement fixture only. | State label, disabled copy, recovery action, viewport size. | Copy distinguishes disabled product access from expired login. |
| Role pending | Operator-provisioned pending-role fixture only. | State label, pending copy, recovery action, viewport size. | Copy tells the user role setup is needed without exposing claims. |
| Workspace unavailable | Operator-provisioned workspace-unavailable fixture only. | State label, safe fallback copy, recovery action, viewport size. | Copy avoids raw workspace identifiers and keeps protected analytics hidden. |

## Evidence Rules

Allowed:

- route path without sensitive query values
- viewport size
- visible product title and state labels
- visible title/body/action copy
- whether protected analytical content is visible or hidden
- pass/fail notes
- screenshots only after account, workspace, campaign, private identifiers, and
  browser chrome are excluded or redacted

Forbidden:

- cookies, tokens, sessions, browser storage, handoff codes, code hashes,
  signed URLs, credentials, secret values, environment values, or decoded auth
  payloads
- account IDs, user IDs, workspace IDs, campaign IDs, provider IDs, raw table
  names, role claims, entitlement rows, SQL output, or DB readback
- Meta/provider responses, benchmark import rows, Python retrain output, raw
  files, or private customer data
- screenshots that reveal private account, workspace, campaign, provider,
  storage, token, session, or credential information

## Human Approval Needed For The Actual Smoke

Recommended approval phrase:

```text
Foresight authenticated account state smoke is approved.
The operator will provide an already-authenticated visible session and sanitized
UI evidence only. Do not inspect cookies, tokens, sessions, browser storage,
handoff codes, credentials, environment values, DB rows, SQL output, provider
payloads, or private identifiers.
```

If denied/disabled/pending states are included, the approval must name the
human owner responsible for provisioning those states. The agent must not grant,
revoke, mutate, or inspect product access directly.

## Acceptance Criteria

For an active-account smoke to pass:

- `/account` opens in an authenticated state
- the visible state is positive or clearly active
- account copy does not expose raw auth, provider, DB, session, or entitlement
  internals
- primary navigation back to an analytical surface is visible
- logout or recovery path remains available
- desktop and mobile viewports do not show obvious text overlap or horizontal
  overflow
- no forbidden marker is visible

For negative account states to pass:

- the state is distinguishable from missing session
- protected analytical data is hidden
- recovery action is visible and product-safe
- no internal role, policy, table, claim, or identifier is exposed
- no forbidden marker is visible

## No-Touch Confirmation

This gate did not perform login, authenticated browsing, handoff execution,
SQL, DB/Auth readback or mutation, product access mutation, benchmark
import/upload, Meta/provider calls, Python retrain, code changes, environment
readback, secret inspection, staging, commit, or push.

## Next Gate

Recommended next Foresight gate:

```text
Foresight-Design-QA-13 Authenticated Account State Human Smoke
```

That gate should be run only after the human approval above and should record
sanitized visible UI evidence, not raw auth or data-layer evidence.
