# Foresight Design QA 10 Access Copy No-Session Production Smoke v1

Date: 2026-05-12 KST
Gate: Foresight-Design-QA-10
Status: no-session production smoke complete for login and protected-route redirects
Repo: admate-foresight
Production URL: `https://foresight.admate.ai.kr`

## Purpose

Continue after local closure `1de2059 docs: close Foresight access copy no-session track`
with the next safe artifact.

This gate records only public, unauthenticated production reachability and
protected-route redirect behavior. It does not validate authenticated account
states, entitlement states, Core-to-Foresight positive handoff, or production
data behavior.

## Scope

Allowed checks:

- unauthenticated GET requests to public login URLs
- unauthenticated GET requests to protected Foresight routes
- HTTP status code and redirect target observation

Disallowed checks not performed:

- real login
- positive handoff
- SQL execution
- Auth/DB mutation
- environment changes
- Meta API calls
- Python retrain
- benchmark import/upload
- production data mutation
- cookie, token, session, browser storage, secret, or environment inspection
- redirect following into authenticated flows
- commit, push, or PR creation

## Method

Command shape:

```text
curl.exe --ssl-no-revoke -sS --max-time 20 -o NUL -w "%{http_code} %{redirect_url}" <url>
```

Notes:

- Requests were no-session and did not use a cookie jar.
- Redirects were not followed.
- Response headers, cookies, tokens, sessions, and browser storage were not
  inspected.
- The first curl attempt without `--ssl-no-revoke` returned HTTP `000` because
  Windows Schannel could not complete certificate revocation checking from this
  worker environment. The retry changed only the client transport revocation
  check behavior and did not add authentication or inspect private state.

## Production Smoke Result

| Path | Observed result | Decision |
| --- | --- | --- |
| `/login` | `200` | pass |
| `/login?state=session_expired&next=%2Ftrends` | `200` | pass |
| `/login?state=session_invalid&next=%2Finsights` | `200` | pass |
| `/login?handoff=expired&next=%2Faccount` | `200` | pass |
| `/login?handoff=invalid&next=%2Faccount` | `200` | pass |
| `/login?handoff=disabled` | `200` | pass |
| `/login?logout=complete` | `200` | pass |
| `/account` | `307` to `https://foresight.admate.ai.kr/login?next=%2Faccount` | pass |
| `/` | `307` to `https://foresight.admate.ai.kr/login?next=%2F` | pass |
| `/trends` | `307` to `https://foresight.admate.ai.kr/login?next=%2Ftrends` | pass |
| `/insights` | `307` to `https://foresight.admate.ai.kr/login?next=%2Finsights` | pass |
| `/competitor` | `307` to `https://foresight.admate.ai.kr/login?next=%2Fcompetitor` | pass |

## Result

The production URL is publicly reachable for the unauthenticated login surface,
and protected routes fail closed to login with sanitized `next` destinations.

This result closes only the no-session login/protected-route redirect smoke.
Authenticated account access copy, entitlement-disabled copy, role-pending copy,
workspace-unavailable copy, and positive handoff remain out of scope until a
separate approved authenticated session/evidence policy is provided.

## Verification

Completed from `D:\Projects\AdMate\admate-foresight`.

- `git status --short`: clean before this docs-only artifact
- no-session production smoke for login/protected-route redirects: pass
- `git diff --check`: pass
- new-file no-index whitespace check: pass
  - Git reported an LF-to-CRLF normalization warning only; no whitespace errors.
- `npm run lint`: pass
- docs-only changed-file boundary scan: pass
