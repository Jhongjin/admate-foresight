# Foresight-Handoff-10 Production Routing Recovery Smoke

Date: 2026-05-09
Repo: admate-foresight
Gate: Foresight-Handoff-10
Status: pass

## Scope

This gate verified the production routing recovery after the Vercel build/deployment settings fix. It used unauthenticated no-cookie browser-style HTTP checks only.

No login, Core authenticated start, valid handoff flow, product credential, handoff code creation/use, SQL execution, DB/Auth mutation, Meta API call, Python retrain, benchmark import/upload, environment value readout, token/cookie/session output, deploy, promotion, or code change was performed in this gate.

## Background

The production host previously returned uniform Vercel edge `404` responses even though local source/build contained the expected routes. The investigation found two deployment-side blockers:

- `vercel.json` contained a `functions` override that failed Vercel builds for the App Router route pattern.
- The current production deployment was still using the old Vercel framework setting, while project settings were updated to `Next.js` and then redeployed.

The code-side fix committed before this smoke was:

```text
eee4e39 fix: remove invalid Vercel function override
```

A later docs-only deployment also occurred:

```text
d6b69f0 docs: review Foresight deployment alias 404
```

The user confirmed the latest Vercel production deployment was redeployed after project settings were changed to `Next.js`, and the public browser view showed the Foresight login shell.

## Production Smoke Results

Host under test:

```text
https://foresight.admate.ai.kr
```

| Path | Expected | Observed | Result |
| --- | --- | --- | --- |
| `/` | no-session redirect to login | `307`, `Location: /login?next=%2F` | pass |
| `/login?next=%2F` | public login shell | `200`, HTML contains `AdMate Foresight 로그인` | pass |
| `/trends` | no-session redirect to login | `307`, `Location: /login?next=%2Ftrends` | pass |
| `/insights` | no-session redirect to login | `307`, `Location: /login?next=%2Finsights` | pass |
| `/competitor` | no-session redirect to login | `307`, `Location: /login?next=%2Fcompetitor` | pass |
| `/account` | no-session redirect to login | `307`, `Location: /login?next=%2Faccount` | pass |
| `/auth/handoff` without code/config | fail-closed to login | `307`, `Location: https://foresight.admate.ai.kr/login?next=%2F&handoff=disabled` | pass |

Confirmed login shell copy/signals:

- `AdMate Foresight 로그인`
- `Ad-Planner AI`
- `AdMate 계정으로 계속`

## Classification

Production routing recovery is confirmed for the no-session surface. The previous Vercel edge `404` blocker is resolved for the checked paths.

The remaining expected state is intentional:

- Protected pages fail closed to `/login?next=...` without a product-local session.
- `/auth/handoff` without a valid handoff setup fails closed to login with `handoff=disabled`.
- The continue/login button remains disabled until Core/Foresight handoff configuration is enabled.

## Remaining Work

Follow-up gates should remain separate:

- Core/Foresight positive handoff flow with approved product credential and isolated browser session.
- Foresight API guard rollout for data/action surfaces.
- Logout/session expiry UX if product-local session is enabled.

## Validation

| Check | Result |
| --- | --- |
| production no-session route smoke | pass |
| secret/token/cookie/session/raw provider output | none recorded |
| code/config changes in this gate | none |
| SQL/DB/Auth mutation | none |
