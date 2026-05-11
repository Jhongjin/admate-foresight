# Foresight Design QA 4 Auth Shell Account Post-Deploy Safe Smoke Plan v1

Date: 2026-05-11
Gate: Foresight-Design-QA-4
Status: docs-only post-deploy smoke plan
Repo: admate-foresight

## Purpose

Plan the production-safe verification for the auth shell and account polish in
commit `1f85bf1 fix: polish Foresight auth shell account UI` after that commit
has been deployed.

This artifact is a plan only. It does not run production, browser, login,
handoff, SQL, DB/Auth mutation, API mutation, secret inspection, cookie
inspection, browser storage inspection, benchmark import/upload, Meta API calls,
Python retraining, or product configuration changes.

## Target

Verification target after deployment:

- commit: `1f85bf1`
- commit subject: `fix: polish Foresight auth shell account UI`
- expected deployment surface: Foresight production domain after deploy
- gate type: no-session, read-only, post-deploy smoke

Do not execute this smoke until deployment ownership confirms that `1f85bf1` is
the deployed Foresight version.

## Source Context

Primary predecessor:

- `docs/tasks/2026-05-11_foresight_design_qa_2_auth_shell_account_access_states_plan_v1.md`

Related context:

- `docs/tasks/2026-05-11_foresight_design_qa_1_readonly_ui_design_readiness_audit_v1.md`
- `docs/tasks/2026-05-11_foresight_status_next_gate_ui_auth_handoff_kpi_v1.md`
- `docs/tasks/2026-05-11_foresight_ux_2_no_session_navigation_smoke_v1.md`

## Smoke Preconditions

Required before any post-deploy check:

- Deployment owner confirms `1f85bf1` is live.
- Tester uses a no-session context only.
- Tester does not log in through Foresight or Core.
- Tester does not run positive handoff.
- Tester does not inspect, copy, decode, export, or record cookies, session
  values, tokens, credentials, environment variables, request secrets, local
  storage, session storage, IndexedDB, or browser profile data.
- Tester records only route status, redirect destination, and visible UI
  expectations.

If the tester cannot guarantee a no-session context, stop and request a human
gate before continuing.

## Safe No-Session Route Checks

Public auth routes:

- `GET /login`
  - Expected: public route is reachable.
  - Expected: quiet auth shell is visible.
  - Expected: no protected analytical navigation is visible.
  - Expected: no simulator, trends, insights, competitor, or account nav link is
    presented as protected navigation.
  - Expected: no token, cookie, session, handoff code, code hash, env value,
    internal permission field, or raw identifier appears in user-visible copy.

- `GET /reset-password`
  - Expected: public route is reachable.
  - Expected: quiet auth shell is visible.
  - Expected: no protected analytical navigation is visible.
  - Expected: reset-password content remains secondary to safe account recovery
    copy and does not imply an active Foresight session.
  - Expected: no token, cookie, session, handoff code, code hash, env value,
    internal permission field, or raw identifier appears in user-visible copy.

Account no-session route:

- `GET /account`
  - Expected: no account hub content is exposed without a valid Foresight
    product-local session.
  - Expected: route redirects to the login shell with a sanitized return target,
    such as `/login?next=%2Faccount`.
  - Expected: no account role, product access, workspace, email, user ID,
    session expiry, internal permission, or protected nav state is disclosed.

Protected route fail-closed checks:

- `GET /`
- `GET /trends`
- `GET /insights`
- `GET /competitor`

Expected for each protected route:

- No protected analytical content is rendered to a no-session user.
- Route redirects to `/login` with a sanitized same-origin `next` value.
- Redirect target does not include absolute external URLs, tokens, handoff codes,
  code hashes, secrets, raw cookies, or internal IDs.
- Failure mode remains closed if the route cannot be reached.

## Desktop Visual Expectations

For `/login` and `/reset-password` at a desktop viewport:

- Public auth shell reads as quiet and focused.
- Product identity is visible without exposing protected product navigation.
- Primary action is clear and not visually crowded by analytical nav links.
- Secondary recovery/access actions are available only where product-approved.
- Layout has no overlapping text, clipped action labels, horizontal overflow, or
  card nesting that makes the shell look like a protected app surface.

For `/account` without a session:

- Account content is not visible before redirect.
- The visible final state is the login shell with an account-safe return path.

## Mobile Visual Expectations

For `/login` and `/reset-password` at a mobile viewport:

- Public auth shell stacks cleanly with no horizontal scroll.
- No protected hamburger/menu/drawer entries are available.
- Form controls and actions remain tappable without overlap.
- Product identity, primary action, secondary action, and footer/support copy fit
  within the viewport.
- No browser zoom, storage prompt, debug panel, internal route text, or raw
  identifier is needed to understand the state.

For `/account` without a session:

- The mobile final state is the login shell with a sanitized account return
  target.
- No protected account status, role, workspace, or analytical navigation flashes
  or persists as visible content.

## Account Positive Path Boundary

The account positive path remains human-gated.

Do not verify active `/account` behavior in this safe smoke. Specifically, do
not:

- log in
- run Core-to-Foresight handoff
- reuse an existing authenticated browser profile
- inspect an active session
- inspect cookies or browser storage
- record user/account/workspace identifiers
- validate active role or entitlement details

Positive account verification requires a separate approved gate with an
authorized operator, explicit session handling boundaries, and a result artifact.

## Evidence To Record After Deployment

When this plan is executed after deployment, record only:

- deployed commit confirmation source
- timestamp of no-session smoke
- route status or redirect result for each checked route
- sanitized final URL path/query shape
- brief desktop visual pass/fail notes
- brief mobile visual pass/fail notes
- any user-visible copy issue that does not include secrets or identifiers
- confirmation that no login, handoff, cookie inspection, session inspection, or
  browser storage inspection occurred

Do not attach screenshots if they include account, user, workspace, cookie,
session, token, credential, secret, env, handoff, provider, or raw browser
storage information.

## Pass Criteria

PASS only if all are true:

- `/login` is public and uses the quiet auth shell with no protected nav.
- `/reset-password` is public and uses the quiet auth shell with no protected
  nav.
- `/account` without a session redirects to login with a sanitized account
  return target.
- Protected routes remain fail-closed without a session.
- Desktop and mobile public-auth layouts show no protected nav exposure,
  overlap, clipping, or horizontal overflow.
- No secret, session, cookie, token, handoff, env, internal permission, raw ID,
  browser storage, or authenticated account data is inspected or recorded.
- Account positive path is left for a separate human-gated verification.

## Stop Conditions

Stop and escalate instead of continuing if:

- deployed commit cannot be confirmed as `1f85bf1`
- any route requires login to complete the safe no-session smoke
- `/account` exposes account content without a valid session
- protected routes render analytical content without a session
- public auth shell exposes protected nav
- any check would require cookie, session, token, credential, secret, env, or
  browser storage inspection
- a browser profile appears to have an existing authenticated session

## No-Touch Confirmation For This Artifact

This planning artifact did not perform:

- production smoke execution
- browser execution
- login
- positive handoff
- cookie/session inspection
- browser storage inspection
- SQL execution
- DB/Auth mutation
- API mutation
- benchmark import/upload
- Meta API call
- Python retrain
- product code changes
- secret or environment inspection
