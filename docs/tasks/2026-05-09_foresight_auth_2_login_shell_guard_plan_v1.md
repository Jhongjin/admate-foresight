# Foresight-Auth-2 Login Shell And Guard Implementation Plan v1

Date: 2026-05-09
Status: implementation plan only
Repo: admate-foresight
Product: AdMate Foresight
Previous gate: `Foresight-Auth-1 current route auth inventory`

## 1. Goal

Plan the introduction of a product-local login/account surface and minimum protected route/API guard for AdMate Foresight before implementation.

This Gate is documentation only.

Explicitly not performed:

- No code implementation.
- No Auth mutation.
- No DB mutation.
- No SQL execution.
- No benchmark import, upload, or DB write.
- No Meta API call.
- No Python retrain execution.
- No DB schema or environment change.
- No stage, commit, or push.
- No environment, secret, token, credential, cookie, session, provider raw response, or raw campaign data output.

## 2. Current Auth Baseline

Baseline from Auth-1:

| Surface | Current state |
| --- | --- |
| `/` | public; no detected session guard |
| `/trends` | public; no detected session guard |
| `/insights` | public; no detected session guard |
| `/competitor` | public; no detected session guard |
| `/login` | missing |
| `/reset-password` | missing |
| `/account` | missing |
| `/profile` | missing |
| `/access-request` | missing local route |
| `middleware.ts` / `proxy.ts` | missing |
| product session helper | missing |
| `next` sanitizer | missing |
| prediction/aggregate APIs | mostly public |
| `/api/meta-sync` | internal-key gated; dry-run default |
| `/api/py-retrain` | internal-key gated; dry-run default |
| `/api/export` | disabled |
| `/api/debug-env` / `/api/debug-data` | disabled |

Primary gap:

```text
Foresight has a functional product surface but no product-local login/account shell and no session-aware page guard.
```

## 3. Implementation Principles

The first implementation should be conservative:

- Protect product surfaces before adding new data workflows.
- Do not expand benchmark upload/import behavior.
- Do not weaken existing `meta-sync` or `py-retrain` internal-key execution guards.
- Do not re-enable export/debug routes.
- Use a single shared `next` sanitizer.
- Use generic, product-facing copy only.
- Keep provider/Auth internals out of user-facing copy.
- Fail closed when session or product access is unknown.
- Preserve raw campaign data and provider response boundaries.

## 4. Login Route Plan

Recommended route:

```text
/login?next=<path>
```

Purpose:

- Provide a Foresight-local login shell.
- Preserve the product route the user originally attempted to open.
- Avoid sending users directly to an internal provider/Auth route without Foresight context.

Required behavior:

| Case | Expected behavior |
| --- | --- |
| no `next` | default to `/` after login |
| safe relative `next` | preserve sanitized path |
| unsafe `next` | fall back to `/` |
| already authenticated | redirect to sanitized `next` or `/` |
| login failure | show generic failure state without provider details |
| missing product access | show access request CTA, not raw auth internals |

Required login copy:

```text
AdMate Foresight 로그인
```

```text
성과 예측과 기준 데이터 검토를 이용하려면 AdMate 계정으로 로그인하세요
```

Recommended support copy:

```text
로그인 후 현재 보려던 Foresight 화면으로 돌아갑니다.
접근 권한이 없다면 이용 신청을 진행해주세요.
```

## 5. Reset Password Route Plan

Recommended route:

```text
/reset-password
```

MVP plan:

- Provide a Foresight-local page or redirect shell.
- Link to the central AdMate/Sentinel reset-password path until account lifecycle ownership is finalized.
- Preserve Foresight copy and context.
- Do not expose provider-specific recovery wording.

Candidate external target:

```text
https://sentinel.admate.ai.kr/reset-password
```

Open decision:

- Whether Homepage/Agent Core will own the final reset-password path.
- Whether Foresight should provide only an external link or a lightweight local wrapper.

## 6. Account / Profile Route Plan

Recommended MVP routes:

```text
/account
/profile -> /account
```

MVP behavior:

- `/account` shows minimal product account/access status.
- `/profile` redirects to `/account` for compatibility.
- Ordinary users can view their own product account shell only.
- Product access management remains owned by Agent Core/Homepage/Sentinel until a formal contract is defined.

Candidate account external fallback:

```text
https://sentinel.admate.ai.kr/account
```

Recommended account copy:

```text
AdMate 계정
접근 가능한 제품과 권한 상태를 확인합니다.
```

Do not implement:

- role editing.
- product access approval.
- user lifecycle mutation.
- provider profile mutation.
- raw account provider object display.

## 7. Access Request Plan

Foresight should not implement product access approval locally in the first pass.

Recommended access request CTA:

```text
접근 권한이 없다면 이용 신청
```

Recommended target:

```text
https://home.admate.ai.kr/access-request?product=foresight
```

Fallback target:

```text
https://sentinel.admate.ai.kr/access-request
```

Plan:

- Use an external link from the login/account shell.
- Do not create a local approval workflow in this Gate.
- Do not create DB tables for access requests in Foresight.
- Do not write audit or approval events until Agent Core contract is defined.

## 8. Public vs Protected Surface Classification

### 8.1 Public Surface To Keep Public

| Surface | Recommendation | Reason |
| --- | --- | --- |
| `/login` | public | entry point for no-session users |
| `/reset-password` | public | account recovery entry |
| static assets | public | app rendering |
| disabled debug/export responses | public but disabled | must remain fail-closed |
| health-like static route, if added later | public | only if it returns no product data |

No product benchmark, planning, external lookup, or account details should be exposed through a public route.

### 8.2 Product Pages To Protect

| Route | Recommendation | Rationale |
| --- | --- | --- |
| `/` | protect | primary planning/simulator surface |
| `/trends` | protect | benchmark/trend surface |
| `/insights` | protect | product insight surface |
| `/competitor` | protect | external ads lookup UI and provider-cost risk |

No-session behavior after implementation:

```text
GET /protected-path -> 302 /login?next=<sanitized-path>
```

### 8.3 Future Benchmark Surfaces To Protect

Potential future surfaces:

| Candidate | Recommendation |
| --- | --- |
| `/benchmark/upload` | reviewer/uploader role required |
| `/benchmark/dry-run` | authenticated uploader/reviewer required |
| `/benchmark/reports/[id]` | reviewer/admin or owning uploader required |
| `/benchmark/reports/[id]/review` | reviewer/admin required |
| `/benchmark/datasets` | reviewer/admin/data steward required |

These are candidates only. Benchmark upload/dry-run/reviewer routes must not be implemented until their own Gate.

## 9. Page Guard Strategy

Recommended first implementation:

- Add a server-side session/access helper.
- Protect current page routes with a shared guard.
- Use redirects for page routes, not JSON errors.
- Preserve sanitized `next`.

Candidate guard helper:

```text
requireForesightPageSession(requestedPath): session-or-redirect
```

Expected behavior:

| State | Page behavior |
| --- | --- |
| valid session and Foresight access | render protected page |
| no session | redirect to `/login?next=<path>` |
| invalid/expired session | redirect to `/login?next=<path>` |
| session exists but no product access | render access-request state or redirect to `/login` access panel |
| session check error | fail closed to login or generic unavailable state |

Open implementation choice:

- Page-level guards are the safest first pass because no global middleware exists.
- Middleware/proxy can be introduced later after route matching and static asset exclusions are tested.

## 10. API Guard Strategy

API guards should return sanitized JSON and `no-store` headers.

Recommended helper:

```text
requireForesightApiSession(req): session-or-json-error
```

Recommended failure response:

```json
{ "error": "Authentication required." }
```

Recommended status:

- `401` for missing/invalid session.
- `403` for valid session without Foresight product access.
- `503` only for auth infrastructure unavailable, without revealing internals.

Do not return:

- provider names.
- session cookie names.
- user provider raw object.
- token values.
- internal role internals.
- raw campaign rows.

## 11. Prediction / Aggregate Read API Policy

Current public APIs:

| API | Recommendation |
| --- | --- |
| `/api/filters` | protect with product session |
| `/api/predict` | protect with product session |
| `/api/predict-range` | protect with product session |
| `/api/regression-summary` | protect with product session |
| `/api/trends` | protect with product session |
| `/api/breakdown` | protect with product session |
| `/api/insights` | protect with product session |
| `/api/seasonality` | protect with product session |
| `/api/py-predict` | protect with product session |

Policy decision:

```text
Protect by default.
```

Rationale:

- Even aggregate benchmark APIs are product data surfaces.
- Prediction APIs reflect Foresight product value.
- Protecting APIs aligns browser and API no-session behavior.

Allowed public exception:

- A future static marketing/availability endpoint may stay public only if it returns no benchmark, prediction, account, provider, or campaign-derived data.

## 12. External Lookup API Policy

Current external lookup APIs:

| API | Recommendation |
| --- | --- |
| `/api/meta-ads` | protect with product session plus existing rate limit |
| `/api/meta-ads-scrape` | protect with product session plus existing rate limit and production fallback guard |
| `/api/google-ads` | protect with product session plus existing rate limit |

Policy decision:

```text
Session guard first, rate limit second.
```

Rationale:

- These endpoints can trigger external network/provider work.
- Public no-session users should not trigger product competitor lookup costs or provider calls.
- Existing rate limits are still useful after session guard.

## 13. Meta Sync / Py Retrain Guard Preservation

Existing routes:

| API | Existing guard | Auth-2 rule |
| --- | --- | --- |
| `/api/meta-sync` | internal-key gated, dry-run default, explicit execution flag, kill-switch flag | preserve existing guard; do not loosen |
| `/api/py-retrain` | internal-key gated, dry-run default, explicit execution flag, kill-switch flag | preserve existing guard; do not loosen |

Implementation rule:

- Do not replace internal-key execution guard with ordinary user session.
- Optional future improvement may add an admin session precheck in addition to internal key, but never instead of it.
- Keep dry-run default.
- Keep no-store response.
- Keep sanitized response payloads.
- Do not call Meta API or Python retrain during auth implementation verification.

UX note:

- Hide or gate the visible `모델 재학습` button behind an admin state in a later UI pass.
- The execution API guard remains the source of truth for retrain safety.

## 14. Export / Debug Disabled Preservation

Existing routes:

| API | Current state | Auth-2 rule |
| --- | --- | --- |
| `/api/export` | disabled `403` | keep disabled |
| `/api/debug-env` | disabled `404` | keep disabled |
| `/api/debug-data` | disabled `404` | keep disabled |

Do not:

- re-enable debug routes for authenticated users.
- expose env names/values through debug UI.
- expose raw data samples.
- add export behavior as part of login work.

## 15. Next Sanitizer Criteria

Recommended helper:

```text
sanitizeForesightNextPath(raw: unknown): string
```

Minimum criteria:

- accept only string input.
- trim whitespace.
- enforce length limit.
- require path to begin with `/`.
- reject `//`.
- reject backslashes.
- reject absolute URLs.
- reject executable or non-web schemes.
- parse against the final Foresight origin or a fixed placeholder origin.
- require same origin after parse.
- reject `/api` and `/api/...`.
- allow only known Foresight page routes at first.
- preserve query string only after path validation.
- drop sensitive query keys.
- default to `/`.

Initial allowlist:

```text
/
/trends
/insights
/competitor
/account
```

Sensitive query keys to drop:

```text
token
access_token
refresh_token
id_token
api_key
apikey
secret
password
code
otp
session
provider
state
```

Suggested tests:

| Input | Expected |
| --- | --- |
| `/trends` | `/trends` |
| `/competitor?industry=beauty` | `/competitor?industry=beauty` |
| `https://example.com` | `/` |
| `//example.com` | `/` |
| `/api/predict` | `/` |
| `/login?next=/api/predict` | `/login` or `/` after route-specific handling |
| `/trends?access_token=abc` | `/trends` |
| `javascript:alert(1)` | `/` |
| `\trends` | `/` |

## 16. User-Facing Copy Rules

Required login copy:

```text
AdMate Foresight 로그인
```

```text
성과 예측과 기준 데이터 검토를 이용하려면 AdMate 계정으로 로그인하세요
```

Recommended supporting copy:

```text
로그인 후 현재 보려던 Foresight 화면으로 돌아갑니다.
접근 권한이 없다면 이용 신청을 진행해주세요.
```

Forbidden copy in product-facing UI:

```text
Openclaw
Hermes
Supabase Auth
Supabase recovery
auth.users
service role
provider token
session cookie
JWT
internal key
system role
```

Allowed internal documentation/code comments:

- Auth provider implementation notes may appear in developer-only docs or code comments when necessary.
- User-facing screens must use product language: `AdMate`, `AdMate 계정`, `AdMate Foresight`.

## 17. Candidate Implementation Files

### 17.1 New Files

| Candidate file | Purpose |
| --- | --- |
| `lib/auth/foresight-session.ts` | server-side session/access helpers and `next` sanitizer |
| `lib/auth/foresight-session.test.ts` or equivalent | sanitizer and guard unit tests if test setup exists |
| `app/login/page.tsx` | Foresight login page |
| `app/login/LoginShell.tsx` | client-side login shell, if needed |
| `app/reset-password/page.tsx` | reset-password redirect/shell |
| `app/account/page.tsx` | minimal account/access shell |
| `app/profile/page.tsx` | redirect to `/account` |
| `app/api/auth/login/route.ts` | optional product-local login API, if required by chosen auth contract |
| `app/api/auth/logout/route.ts` | optional product-local logout API |

### 17.2 Existing Page Files To Touch

| File | Planned change |
| --- | --- |
| `app/page.tsx` | add page guard; optionally hide admin/retrain UI for non-admin |
| `app/trends/page.tsx` | add page guard |
| `app/insights/page.tsx` | add page guard |
| `app/competitor/page.tsx` | add page guard |
| `components/Navigation.tsx` | update product label and account/logout affordance |

### 17.3 Existing API Route Files To Touch

Protect with session:

- `app/api/filters/route.ts`
- `app/api/predict/route.ts`
- `app/api/predict-range/route.ts`
- `app/api/py-predict/route.ts`
- `app/api/meta-ads/route.ts`
- `app/api/meta-ads-scrape/route.ts`
- `app/api/google-ads/route.ts`
- `app/api/trends/route.ts`
- `app/api/breakdown/route.ts`
- `app/api/insights/route.ts`
- `app/api/seasonality/route.ts`
- `app/api/regression-summary/route.ts`

Preserve stronger execution guard:

- `app/api/meta-sync/route.ts`
- `app/api/py-retrain/route.ts`

Keep disabled:

- `app/api/export/route.ts`
- `app/api/debug-env/route.ts`
- `app/api/debug-data/route.ts`

## 18. Open Contract Decisions Before Code

Before implementation, decide:

| Decision | Needed before |
| --- | --- |
| final auth/session source | login API and guard implementation |
| product access claim/source | product access enforcement |
| logout behavior | Navigation/account implementation |
| reset-password owner URL | `/reset-password` implementation |
| access-request final URL | login/account CTA implementation |
| account data ownership | `/account` detail scope |
| whether middleware is allowed | global route protection |
| whether API guard should protect all aggregate reads immediately | API guard rollout |

Default if undecided:

```text
Fail closed for protected product pages and product APIs.
Use external links for account lifecycle actions.
Do not mutate Auth or DB state from Foresight.
```

## 19. Recommended Implementation Order

Recommended next gates:

1. `Foresight-Auth-3 next sanitizer and session helper design`
2. `Foresight-Auth-4 login/account shell implementation`
3. `Foresight-Auth-5 page guard implementation`
4. `Foresight-Auth-6 protected API guard implementation`
5. `Foresight-Auth-7 no-session smoke and forbidden copy review`
6. `Foresight-Auth-8 account/access request integration review`

Implementation order inside code Gates:

1. Add `next` sanitizer with tests or deterministic smoke.
2. Add minimal session helper.
3. Add `/login`, `/reset-password`, `/account`, `/profile`.
4. Protect page routes.
5. Protect aggregate/prediction APIs.
6. Protect external lookup APIs.
7. Confirm `meta-sync`, `py-retrain`, export/debug behavior unchanged.
8. Run no-session smoke.

## 20. Verification Plan

Static verification:

- `git diff --check`
- TypeScript check if code is modified.
- Build if page/API code is modified.
- secret pattern scan.
- forbidden copy scan for user-facing login/account files.

No-session page smoke:

| Request | Expected |
| --- | --- |
| `/` | redirect to `/login?next=%2F` |
| `/trends` | redirect to `/login?next=%2Ftrends` |
| `/insights` | redirect to `/login?next=%2Finsights` |
| `/competitor` | redirect to `/login?next=%2Fcompetitor` |
| `/login` | renders login shell |
| `/reset-password` | renders or redirects to reset shell |
| `/account` without session | redirect to `/login?next=%2Faccount` |
| `/profile` without session | redirect to `/login?next=%2Faccount` or `/login?next=%2Fprofile` then safe account |

No-session API smoke:

| Request | Expected |
| --- | --- |
| `/api/predict` | `401` sanitized JSON |
| `/api/predict-range` | `401` sanitized JSON |
| `/api/filters` | `401` sanitized JSON |
| `/api/trends` | `401` sanitized JSON |
| `/api/breakdown` | `401` sanitized JSON |
| `/api/insights` | `401` sanitized JSON |
| `/api/seasonality` | `401` sanitized JSON |
| `/api/regression-summary` | `401` sanitized JSON |
| `/api/py-predict` | `401` sanitized JSON |
| `/api/meta-ads` | `401` before provider call |
| `/api/meta-ads-scrape` | `401` before provider/scrape call |
| `/api/google-ads` | `401` before external call |
| `/api/meta-sync` | existing `403`/`503` internal-key fail-closed behavior |
| `/api/py-retrain` | existing `403`/`503` internal-key fail-closed behavior |
| `/api/export` | `403` disabled |
| `/api/debug-env` | `404` disabled |
| `/api/debug-data` | `404` disabled |

Authenticated smoke:

- valid session can render protected pages.
- valid session can call aggregate read APIs.
- user without Foresight access receives `403` or access-request state.
- `next` redirects only to allowed Foresight paths.
- login page copy matches required wording.
- forbidden copy does not appear in product-facing UI.

Safety verification:

- No DB write during auth smoke.
- No benchmark import/upload.
- No Meta API call for no-session external lookup smoke.
- No Python retrain.
- No raw campaign data exposure.
- No secret/env/token value in logs or responses.

## 21. Rollback Plan For Future Implementation

If a later implementation causes issues:

- Revert login/account shell commit.
- Revert page guard commit.
- Revert API guard commit separately if split.
- Confirm export/debug remain disabled.
- Confirm `meta-sync` and `py-retrain` internal-key guards remain unchanged.
- Confirm no Auth/DB state mutation was introduced by rollback.

Rollback should not:

- run SQL.
- mutate DB schema.
- import benchmark data.
- call Meta API.
- trigger Python retrain.
- alter production env.

## 22. Final Recommendation

Proceed to implementation planning for the sanitizer/session helper first.

Recommended default stance:

```text
Product pages and product APIs are protected.
Login/account lifecycle is product-local shell plus external account/access-request links.
Meta sync and Python retrain keep stronger internal execution guards.
Export/debug stay disabled.
Benchmark upload/reviewer surfaces are protected future work, not part of first login implementation.
```
