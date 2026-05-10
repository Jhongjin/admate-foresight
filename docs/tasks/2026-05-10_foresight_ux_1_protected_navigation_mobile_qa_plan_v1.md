# Foresight-UX-1 Protected Navigation Mobile QA Plan v1

Date: 2026-05-10
Status: docs-only QA plan
Scope: protected navigation and mobile layout after auth/handoff MVP closure

## Purpose

Foresight auth and Core handoff MVP is closed for the current production scope.
The next safe product queue is a UI-only QA pass for protected navigation and
mobile layout behavior.

This plan defines what to verify before any UI polish implementation. It does
not run production traffic, modify code, mutate sessions, call APIs, import
benchmark data, call Meta APIs, or run Python retrain.

## Current Baseline

Current production-auth closure documents confirm:

- no-session protected pages redirect to the Foresight login shell
- no-session protected APIs return `401`
- approved Core account handoff can open protected Foresight pages
- protected `/trends` renders after handoff
- logout button appears on protected surfaces
- logout returns the user to the login shell
- protected navigation after logout returns to login

The current protected page set is:

- `/`
- `/trends`
- `/insights`
- `/competitor`
- `/account`

The public page set remains:

- `/login`
- `/reset-password`

## QA Matrix

### Desktop Authenticated

Verify in one authenticated session:

- top navigation is visible
- active nav state matches the current route
- `성과 예측 시뮬레이터`, `업종별 트렌드`, `시즌 인사이트`,
  `경쟁사 모니터링` labels remain visible and do not overlap
- logout button is visible
- page content starts below the navigation and is not hidden by the header
- route changes do not drop the product-local session

### Mobile Authenticated

Verify in one authenticated session:

- navigation remains reachable without horizontal overflow
- active route indication is visible
- logout remains reachable
- content cards and filters stay within viewport width
- long Korean labels wrap or compress cleanly
- no route requires desktop-only hover interaction

### No-Session

Verify without a Foresight product session:

- `/` redirects to `/login?next=%2F`
- `/trends` redirects to `/login?next=%2Ftrends`
- `/insights` redirects to `/login?next=%2Finsights`
- `/competitor` redirects to `/login?next=%2Fcompetitor`
- `/account` redirects to `/login?next=%2Faccount`
- `/login` remains public
- `/reset-password` remains public

### Logout Recovery

Verify after logout:

- protected navigation attempts return to login
- login copy explains that the user will return to the requested Foresight
  screen after AdMate login
- no stale authenticated UI remains visible after logout
- no cookie, token, handoff code, code hash, or session value is displayed

## Copy Boundaries

Allowed public/product copy:

- `AdMate Foresight 로그인`
- `AdMate 계정으로 계속`
- `로그아웃`
- `성과 예측 시뮬레이터`
- `업종별 트렌드`
- `시즌 인사이트`
- `경쟁사 모니터링`

Avoid:

- implementation names
- cookie/session/token details
- product credentials
- service-role wording
- Core raw endpoint payloads
- DB or table names
- handoff code or code hash wording in UI copy

## Evidence Policy

QA evidence may include:

- sanitized screenshots
- viewport size
- route path
- pass/fail observations
- sanitized redirect target summary

QA evidence must not include:

- cookie values
- session values
- raw handoff codes
- code hashes
- product credentials
- service-role keys
- env values
- browser storage dumps
- raw provider payloads

## No-Touch Boundary

This gate must not perform:

- code changes
- SQL execution
- DB/schema changes
- Auth/DB data mutation
- benchmark import or upload
- Meta API calls
- Python retrain
- external LLM calls
- production positive handoff execution
- cleanup/delete/revoke actions

## Stop Conditions

Stop and split a separate gate if QA finds:

- a protected page visible without a session
- an API mutation needed to continue
- a DB/session cleanup requirement
- a cookie/token/handoff code shown in UI
- mobile overflow that requires non-trivial navigation redesign
- any need for production credentials, SQL, Meta API, or retrain execution

## Verification Plan

For this docs-only plan, run:

```text
git diff --check -- docs/tasks/2026-05-10_foresight_ux_1_protected_navigation_mobile_qa_plan_v1.md
```

Optional local checks before closing:

```text
npx tsc --noEmit
npm run build
npm run benchmark:dry-run
```

The optional checks must remain side-effect free.

## Next Gate

`Foresight-UX-2 protected navigation mobile read-only QA`

Run authenticated and no-session viewport checks only after the operator
provides or confirms an approved browser session. Keep production data mutation,
benchmark import/upload, Meta API, Python retrain, SQL, and cleanup out of
scope.
