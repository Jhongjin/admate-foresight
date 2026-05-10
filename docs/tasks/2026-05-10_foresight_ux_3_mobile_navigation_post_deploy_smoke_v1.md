# Foresight-UX-3 Mobile Navigation Post-Deploy Smoke v1

Date: 2026-05-10
Status: pass
Scope: Foresight production mobile navigation post-deploy smoke

## Target

Production domain:

```text
https://foresight.admate.ai.kr
```

Expected implementation commit:

```text
d941180 fix: polish Foresight mobile navigation
```

Documentation commit:

```text
4405ce6 docs: record Foresight mobile navigation polish
```

## Deployment Metadata

Vercel connected app deployment metadata could not be listed due to scope access
403. No Vercel environment values or secrets were queried.

Deployment presence was verified by production behavior:

- `/login?next=%2Ftrends` returned 200
- production HTML contained the new `메뉴` navigation marker
- production HTML contained `AdMate Foresight 로그인`
- production HTML did not contain visible logout copy on the login surface
- `/trends` no-session returned 307 to `/login?next=%2Ftrends`

## Browser Smoke

Production browser smoke used Chrome CDP headless mode with an isolated
temporary local profile.

Mobile viewport:

```text
390x844
```

Mobile results:

- current path stayed `/login?next=%2Ftrends`
- page scroll width was 390 before opening the menu
- viewport width was 390
- one visible `메뉴` button was present
- no visible logout button was present on the login surface
- after opening the menu, page scroll width was 375
- visible menu links included the four Foresight product nav links
- login actions remained visible

Desktop viewport:

```text
1440x900
```

Desktop results:

- page scroll width was 1440
- viewport width was 1440
- no visible mobile `메뉴` button was present
- no visible logout button was present on the login surface

## Cleanup

The temporary Chrome profile and CDP process were removed after the smoke.

## No-Touch Confirmation

This smoke did not perform:

- authenticated product flow
- logout click
- handoff code generation or redemption
- SQL execution
- DB/Auth mutation
- benchmark import/upload
- Meta API execution
- Python retrain execution
- product code changes

No password, token, cookie value, session value, handoff code, product
credential, or raw provider response was printed or stored.

## Verdict

PASS.

The production deployment is serving the mobile navigation polish and preserves
the no-session protected route redirect behavior.
