# Foresight-Handoff-5 Callback Session Production-Safe Smoke Result

Date: 2026-05-09
Repo: admate-foresight
Gate: Foresight-Handoff-5
Status: fail
Basis: committed Foresight-Handoff-4 production-safe smoke plan

## Result

Fail.

The smoke stayed within the committed Handoff-4 safety boundaries and did not expose sensitive evidence, but the production host did not demonstrate the expected deployed Foresight surfaces. The unauthenticated `/login?next=/` request returned `404` instead of a login render, and the handoff callback checks also returned `404` rather than observable callback fail-closed redirect behavior.

The protected no-session pages also returned `404`, which is fail-closed for protected content access, but it does not prove the committed product guards are deployed and working.

## Local Commit Gate

Local `origin/main` ancestry checks:

| Commit | Expected | Result |
| --- | --- | --- |
| `be8ce17` | included in `origin/main` | pass |
| `d9d9678` | included in `origin/main` | pass |

No independent deployed revision check was performed because this execution was limited to the explicitly allowed unauthenticated production GETs.

## Exact Safe Request List

All production requests used GET, no request cookies, no product credential, no valid handoff code, no authenticated Core start, and redirects disabled.

| Count | Request | Query keys reported | Purpose |
| ---: | --- | --- | --- |
| 2 | `https://foresight.admate.ai.kr/login?next=/` | `next` | login no-session check |
| 1 | `https://foresight.admate.ai.kr/auth/handoff` | none | missing-code callback check |
| 1 | `https://foresight.admate.ai.kr/auth/handoff?code=<invalid-placeholder>&next=<path>` | `code`, `next` | invalid-code callback check |
| 1 | `https://foresight.admate.ai.kr/` | none | protected root no-session check |
| 1 | `https://foresight.admate.ai.kr/trends` | none | protected trends no-session check |
| 1 | `https://foresight.admate.ai.kr/insights` | none | protected insights no-session check |
| 1 | `https://foresight.admate.ai.kr/competitor` | none | protected competitor no-session check |
| 1 | `https://foresight.admate.ai.kr/account` | none | protected account no-session check |

Execution note: the login URL count is `2` because an initial safe summarizer run reached that allowed unauthenticated GET before failing locally while formatting cookie-header presence. It did not print body content or cookie values.

## Sanitized Evidence

No `Location` header was present in any response. `Set-Cookie` values were not printed; only presence or absence is reported.

| Check | Status | Location summary | Set-Cookie | Cache-Control | Referrer-Policy | Sensitive marker scan | Result |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| login no session | 404 | absent | absent | `public, must-revalidate, max-age=0` | absent | pass | fail |
| handoff missing code | 404 | absent | absent | `public, must-revalidate, max-age=0` | absent | pass | pass as fail-closed, but callback behavior not observed |
| handoff invalid placeholder | 404 | absent | absent | `public, must-revalidate, max-age=0` | absent | pass | pass as fail-closed, but callback behavior not observed |
| protected root no session | 404 | absent | absent | `public, must-revalidate, max-age=0` | absent | pass | pass as fail-closed |
| protected trends no session | 404 | absent | absent | `public, must-revalidate, max-age=0` | absent | pass | pass as fail-closed |
| protected insights no session | 404 | absent | absent | `public, must-revalidate, max-age=0` | absent | pass | pass as fail-closed |
| protected competitor no session | 404 | absent | absent | `public, must-revalidate, max-age=0` | absent | pass | pass as fail-closed |
| protected account no session | 404 | absent | absent | `public, must-revalidate, max-age=0` | absent | pass | pass as fail-closed |

Sanitization rules applied:

- response bodies were not printed
- raw cookie values were not printed
- redirect query values were not printed
- only redirect host, path, and query-key summaries were allowed; all were absent
- the response body plus sanitized header summary was scanned for secret-like handoff/session/auth markers, with no matches in the completed smoke evidence

## Forbidden Actions Not Performed

The execution did not perform:

- valid handoff flow
- Core authenticated start
- product credential use
- handoff row creation
- handoff row consume
- SQL execution
- DB mutation
- Auth mutation
- Meta API call
- Python retrain
- benchmark import
- benchmark upload
- token output
- cookie value output
- session output
- raw handoff code output
- sensitive query value output
- raw provider response output

No env files or secret stores were read.

## Residual Risk

- The production deployment revision was not independently confirmed. Local `origin/main` includes the required commits, but the allowed call list did not include deployment metadata or a version endpoint.
- Uniform `404` responses suggest the production host may not be serving the committed Foresight app routes at this origin, or routing may differ from the expected deployment. This prevents proving that the callback session implementation is active in production.
- The callback checks did not create a session and did not expose sensitive evidence, but because the route returned `404`, they only prove fail-closed behavior at the edge reached by these requests.
- The absent `Referrer-Policy` and lack of `no-store` on these `404` responses do not prove the committed callback response headers are safe, because the committed callback route behavior was not observed.

## Next Gate Suggestion

Before another production smoke, add or identify a no-auth, no-secret deployed revision confirmation method for `d9d9678` or a descendant, such as deployment metadata available outside the app request path or a pre-existing safe version endpoint. Then rerun the same no-cookie, no-credential, invalid-code-only matrix after confirming the production origin is serving the Foresight routes.
