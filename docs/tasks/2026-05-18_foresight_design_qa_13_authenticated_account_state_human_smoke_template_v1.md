# Foresight Design QA 13 Authenticated Account State Human Smoke Template v1

Date: 2026-05-18 KST
Gate: Foresight-Design-QA-13
Status: docs-only human-gated evidence template
Repo: admate-foresight

## Purpose

Provide the sanitized evidence template for a human-operated authenticated
Foresight account-state review across desktop and mobile viewports.

This template is documentation only. It does not authorize the agent to run
auth, inspect browser storage, inspect tokens, inspect cookies, inspect
sessions, perform live authenticated capture, execute SQL, mutate Auth/DB,
read environment values, call production APIs, upload benchmark data, call
Meta/provider APIs, deploy, commit, or push.

## Human Gate

The actual smoke may begin only after a human operator explicitly approves the
authenticated account-state review and provides an already-authenticated
visible browser session or sanitized observations.

Recommended approval phrase:

```text
Foresight authenticated account state smoke is approved.
The operator will provide an already-authenticated visible session and sanitized
UI evidence only. Do not inspect cookies, tokens, sessions, localStorage,
sessionStorage, auth headers, credentials, environment values, secrets, DB rows,
SQL output, provider payloads, or private identifiers.
```

If denied, disabled, pending, or workspace-unavailable account states are
included, the approval must name the human owner responsible for provisioning
those states. The agent must not grant, revoke, mutate, infer, or inspect
product access directly.

## Target Routes

Primary route:

```text
https://foresight.admate.ai.kr/account
```

Supporting routes, only after the same human gate:

```text
https://foresight.admate.ai.kr/trends
https://foresight.admate.ai.kr/insights
https://foresight.admate.ai.kr/
https://foresight.admate.ai.kr/login
```

## Allowed Sanitized Evidence Fields

Record only the fields below. Redact or omit any value that can identify a
private user, workspace, campaign, provider account, token, session, cookie,
credential, or secret.

Desktop account-state evidence:

| Field | Value |
| --- | --- |
| Evidence owner | `<human operator name or role>` |
| Evidence timestamp | `<YYYY-MM-DD HH:MM KST>` |
| Viewport | `<width>x<height>` |
| Route path | `/account` |
| Account state observed | `<active / denied / disabled / pending / workspace unavailable / other safe label>` |
| Visible page title | `<sanitized visible title>` |
| Visible state copy | `<sanitized visible body copy>` |
| Visible actions | `<sanitized action labels only>` |
| Protected analytics visible? | `<yes / no / not applicable>` |
| Recovery or logout available? | `<yes / no>` |
| Layout notes | `<overlap, clipping, overflow, or none observed>` |
| Forbidden evidence visible? | `<yes / no; if yes, fail and describe category only>` |
| Screenshot reference | `<sanitized screenshot filename or not captured>` |

Mobile account-state evidence:

| Field | Value |
| --- | --- |
| Evidence owner | `<human operator name or role>` |
| Evidence timestamp | `<YYYY-MM-DD HH:MM KST>` |
| Viewport | `<width>x<height>` |
| Route path | `/account` |
| Account state observed | `<active / denied / disabled / pending / workspace unavailable / other safe label>` |
| Visible page title | `<sanitized visible title>` |
| Visible state copy | `<sanitized visible body copy>` |
| Visible actions | `<sanitized action labels only>` |
| Navigation state | `<menu visible / account link visible / logout visible / other safe label>` |
| Protected analytics visible? | `<yes / no / not applicable>` |
| Recovery or logout available? | `<yes / no>` |
| Layout notes | `<overlap, clipping, horizontal overflow, or none observed>` |
| Forbidden evidence visible? | `<yes / no; if yes, fail and describe category only>` |
| Screenshot reference | `<sanitized screenshot filename or not captured>` |

Supporting surface evidence, if reviewed:

| Surface | Viewport | Route path | State type | Visible empty/data-poor copy | Primary action labels | Layout pass? | Forbidden evidence visible? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Trends | Desktop | `/trends` | `<empty / data-poor / data-backed>` | `<sanitized copy>` | `<labels>` | `<pass / fail>` | `<yes / no>` |
| Trends | Mobile | `/trends` | `<empty / data-poor / data-backed>` | `<sanitized copy>` | `<labels>` | `<pass / fail>` | `<yes / no>` |
| Insights | Desktop | `/insights` | `<empty / data-poor / data-backed>` | `<sanitized copy>` | `<labels>` | `<pass / fail>` | `<yes / no>` |
| Insights | Mobile | `/insights` | `<empty / data-poor / data-backed>` | `<sanitized copy>` | `<labels>` | `<pass / fail>` | `<yes / no>` |

## Forbidden Evidence

Do not collect, paste, screenshot, transcribe, export, infer, or summarize:

- tokens, refresh tokens, access tokens, ID tokens, handoff codes, code hashes,
  signed URLs, credentials, or password material
- cookies, sessions, session IDs, session payloads, or cookie jars
- localStorage dumps, sessionStorage dumps, IndexedDB dumps, cache dumps, or
  browser profile data
- raw auth headers, authorization bearer values, request headers, response
  headers, raw API payloads, or decoded auth/provider payloads
- environment values, secret values, API keys, service-role keys, project
  keys, connection strings, or deployment configuration values
- unredacted user PII, email addresses, account IDs, user IDs, workspace IDs,
  campaign IDs, provider account IDs, customer names, raw role claims, policy
  names, DB table rows, SQL output, or private customer data
- browser devtools panels, network inspectors, application/storage panels,
  console logs containing private data, stack traces with secrets, or debug
  overlays exposing internal state

Any appearance of forbidden evidence is an automatic fail for this smoke. The
result should record only the forbidden category, not the underlying value.

## Human-Gated Steps

1. Human operator confirms the approval phrase and owns the authenticated
   session setup.
2. Human operator opens the desktop viewport with an already valid Foresight
   session.
3. Navigate to `/account` without exposing browser storage, devtools, cookies,
   tokens, sessions, auth headers, environment values, or private identifiers.
4. Record only the desktop sanitized account-state fields listed above.
5. Repeat `/account` on a mobile/narrow viewport and record only the mobile
   sanitized account-state fields.
6. If explicitly included, navigate to `/trends` and record only visible
   desktop/mobile empty, data-poor, or data-backed UI state fields.
7. If explicitly included, navigate to `/insights` and record only visible
   desktop/mobile empty, data-poor, or data-backed UI state fields.
8. If logout is included, use the visible logout control and confirm the login
   shell appears without recording session material.
9. Attempt protected navigation after logout only through normal visible UI or
   direct route entry, then record whether access fails closed to the login
   shell.
10. Before accepting screenshots, verify that browser chrome, private account
    details, private workspace/campaign/provider identifiers, and all forbidden
    evidence are excluded or redacted.

## Pass/Fail Checklist

Account page desktop:

| Check | Pass/Fail | Notes |
| --- | --- | --- |
| `/account` renders with an authenticated account state. | `<pass / fail>` | `<sanitized notes>` |
| Visible state label and body copy are product-safe. | `<pass / fail>` | `<sanitized notes>` |
| Copy does not expose auth, DB, provider, session, entitlement, or policy internals. | `<pass / fail>` | `<sanitized notes>` |
| Recovery, navigation, or logout action is visible where expected. | `<pass / fail>` | `<sanitized notes>` |
| Layout has no obvious overlap, clipping, or horizontal overflow. | `<pass / fail>` | `<sanitized notes>` |
| No forbidden evidence is visible. | `<pass / fail>` | `<category only if fail>` |

Account page mobile:

| Check | Pass/Fail | Notes |
| --- | --- | --- |
| `/account` renders with an authenticated account state. | `<pass / fail>` | `<sanitized notes>` |
| Account copy remains readable in the mobile viewport. | `<pass / fail>` | `<sanitized notes>` |
| Navigation, recovery, or logout remains reachable. | `<pass / fail>` | `<sanitized notes>` |
| No text collision, clipped controls, or incoherent card overlap is observed. | `<pass / fail>` | `<sanitized notes>` |
| No horizontal overflow is observed. | `<pass / fail>` | `<sanitized notes>` |
| No forbidden evidence is visible. | `<pass / fail>` | `<category only if fail>` |

Trends desktop/mobile, if reviewed:

| Check | Pass/Fail | Notes |
| --- | --- | --- |
| `/trends` is accessible only in the authenticated state. | `<pass / fail>` | `<sanitized notes>` |
| Empty or data-poor chart states use product-safe copy. | `<pass / fail>` | `<sanitized notes>` |
| Metric/filter controls remain visible and usable. | `<pass / fail>` | `<sanitized notes>` |
| Data-poor states do not imply false precision or hidden benchmark readiness. | `<pass / fail>` | `<sanitized notes>` |
| Mobile layout has no obvious overlap, clipping, or horizontal overflow. | `<pass / fail>` | `<sanitized notes>` |
| No forbidden evidence is visible. | `<pass / fail>` | `<category only if fail>` |

Insights desktop/mobile, if reviewed:

| Check | Pass/Fail | Notes |
| --- | --- | --- |
| `/insights` is accessible only in the authenticated state. | `<pass / fail>` | `<sanitized notes>` |
| Empty or data-poor seasonal insight states use product-safe copy. | `<pass / fail>` | `<sanitized notes>` |
| Insight cards, comparisons, and filters remain readable. | `<pass / fail>` | `<sanitized notes>` |
| Data-poor states avoid exposing provider, DB, or internal model details. | `<pass / fail>` | `<sanitized notes>` |
| Mobile layout has no obvious overlap, clipping, or horizontal overflow. | `<pass / fail>` | `<sanitized notes>` |
| No forbidden evidence is visible. | `<pass / fail>` | `<category only if fail>` |

Logout and fail-closed behavior, if reviewed:

| Check | Pass/Fail | Notes |
| --- | --- | --- |
| Logout returns to the Foresight login shell. | `<pass / fail>` | `<sanitized notes>` |
| Login shell copy is product-safe and does not expose internals. | `<pass / fail>` | `<sanitized notes>` |
| Protected route access after logout fails closed to login. | `<pass / fail>` | `<sanitized notes>` |
| No forbidden evidence is visible. | `<pass / fail>` | `<category only if fail>` |

## Result Summary Template

Use this section only after a human-gated smoke has been completed with
sanitized evidence.

```text
Decision: <pass / fail / blocked>
Evidence source: <human operator role/name>
Desktop account state: <pass / fail / blocked>
Mobile account state: <pass / fail / blocked>
Trends empty/data-poor state: <pass / fail / not reviewed / blocked>
Insights empty/data-poor state: <pass / fail / not reviewed / blocked>
Logout fail-closed state: <pass / fail / not reviewed / blocked>
Forbidden evidence observed: <no / yes category only>
Follow-up required: <none / sanitized issue summary>
```

## No-Touch Confirmation

This template creation did not perform:

- authenticated browsing
- login, logout, handoff execution, or live authenticated capture
- cookie, token, session, localStorage, sessionStorage, auth header, browser
  profile, environment, secret, credential, SQL, DB, provider payload, or
  private identifier inspection
- production API calls, Meta/provider calls, benchmark import/upload, Python
  model execution or retrain
- runtime, package, lockfile, Vercel, database, or auth edits
- staging, commit, or push

## Verification

Safe local verification for this docs-only artifact:

```text
git diff --check -- docs/tasks/2026-05-18_foresight_design_qa_13_authenticated_account_state_human_smoke_template_v1.md
git diff -- docs/tasks/2026-05-18_foresight_design_qa_13_authenticated_account_state_human_smoke_template_v1.md
```

## Changed File

- `docs/tasks/2026-05-18_foresight_design_qa_13_authenticated_account_state_human_smoke_template_v1.md`

## Rollback

This is a docs-only QA template. Rollback is removing this file or reverting
the docs-only change that adds it.
