# Foresight-Auth-4 Protected Surface Guard Plan v1

Date: 2026-05-09
Status: implementation plan only
Repo: admate-foresight
Depends on: `Foresight-Auth-3 minimal auth foundation implementation`

## 1. Goal

Plan which Foresight page and API surfaces should be protected, in what order, after the Auth-3 login shell foundation.

This Gate is documentation only.

Explicitly not performed:

- No code implementation.
- No API modification.
- No Auth mutation.
- No DB mutation.
- No SQL execution.
- No benchmark import or upload.
- No Meta API call.
- No Python retrain execution.
- No stage, commit, or push.
- No environment, secret, token, credential, cookie, session, provider raw response, or raw campaign data output.

## 2. Current Auth-3 Foundation

Auth-3 added:

| File | Current purpose |
| --- | --- |
| `lib/auth/foresightAuth.ts` | safe `next` sanitizer, login path builder, access/reset links, minimal JSON error body |
| `app/login/page.tsx` | product-local login shell |
| `app/reset-password/page.tsx` | reset-password shell linking to external account lifecycle path |
| `app/account/page.tsx` | read-only account placeholder shell |

Auth-3 did not protect existing product pages or APIs yet.

Current important helper behavior:

- `sanitizeForesightNextPath()` allows only known page routes.
- `/api` paths are rejected as `next` targets.
- sensitive query keys are dropped.
- invalid or unsafe `next` falls back to `/`.
- current no-session JSON helper returns `{ "error": "Authentication required." }`.

## 3. Page Guard Decision

### 3.1 Product Pages

| Route | Guard decision | Reason |
| --- | --- | --- |
| `/` | protect | primary Foresight planning/simulation surface |
| `/trends` | protect | benchmark trend surface |
| `/insights` | protect | benchmark insight surface |
| `/competitor` | protect | external lookup UI and provider/network cost surface |

Decision:

```text
All current product pages should require a Foresight product session.
```

Expected no-session behavior:

| Request | Expected redirect |
| --- | --- |
| `GET /` | `/login?next=%2F` |
| `GET /trends` | `/login?next=%2Ftrends` |
| `GET /insights` | `/login?next=%2Finsights` |
| `GET /competitor` | `/login?next=%2Fcompetitor` |

### 3.2 Account Page

| Route | Guard decision | Reason |
| --- | --- | --- |
| `/account` | protect after shell is wired to session | account/access status should not be public |

Expected no-session behavior:

```text
GET /account -> /login?next=%2Faccount
```

MVP nuance:

- Auth-3 currently provides a read-only placeholder.
- Auth-4 recommends protecting `/account` at the same time as product pages, or immediately after the page guard helper exists.
- If a temporary public account placeholder is kept during rollout, it must not display user/account/provider details.

### 3.3 Public Pages

Keep public:

| Route | Reason |
| --- | --- |
| `/login` | no-session entry |
| `/reset-password` | account recovery shell |
| static assets | app rendering |
| not-found route | generic app behavior |

Do not use `/login` or `/reset-password` as benchmark, account detail, provider, or data preview surfaces.

## 4. Page Guard Implementation Strategy

Recommended strategy:

```text
page guard first, API guard second
```

Rationale:

- It immediately stops casual unauthenticated browser access to product UX.
- It avoids touching many API routes in the first guard implementation.
- It keeps failure mode easy to inspect: page routes redirect to the existing login shell.
- It reduces risk before protecting data APIs route by route.

Recommended first implementation files:

| Candidate file | Purpose |
| --- | --- |
| `lib/auth/foresightAuth.ts` | extend with minimal session placeholder/check and page redirect helper |
| `app/page.tsx` | add page guard |
| `app/trends/page.tsx` | add page guard |
| `app/insights/page.tsx` | add page guard |
| `app/competitor/page.tsx` | add page guard |
| `app/account/page.tsx` | add page guard |

Preferred behavior:

- Page guard is server-side where possible.
- If a protected page is currently a client component, use a small server wrapper or a route-level guard pattern that does not force broad rewrites.
- Do not convert large client pages unless necessary.
- Do not introduce a global `middleware.ts` until route matching, static asset exclusions, and App Router behavior are reviewed.

## 5. API Guard Decision

API guards should follow after page guard, unless external lookup API cost/risk forces an earlier API pass.

Expected no-session JSON error shape:

```json
{
  "error": "Authentication required."
}
```

Recommended headers:

```text
Cache-Control: no-store
```

Recommended status codes:

| Case | Status |
| --- | --- |
| missing session | `401` |
| invalid/expired session | `401` |
| valid session without Foresight access | `403` |
| auth service unavailable | `503` with generic message |

Response must not include:

- provider names.
- env names or values.
- cookie/session names.
- token values.
- raw user/account provider object.
- raw campaign rows.
- benchmark row previews.
- internal role model names.

## 6. Prediction / Aggregate Read API Policy

Policy decision:

```text
Protect prediction and aggregate read APIs by default.
```

API classification:

| API | Guard decision | Notes |
| --- | --- | --- |
| `/api/filters` | protect | product filter metadata |
| `/api/predict` | protect | prediction value surface |
| `/api/predict-range` | protect | budget/reach projection surface |
| `/api/py-predict` | protect | ML prediction proxy surface |
| `/api/regression-summary` | protect | model/benchmark summary surface |
| `/api/trends` | protect | aggregate benchmark trend surface |
| `/api/breakdown` | protect | aggregate breakdown surface |
| `/api/insights` | protect | insight surface |
| `/api/seasonality` | protect | seasonal benchmark surface |

Reason:

- These APIs are derived from benchmark/product data.
- They are not raw campaign data, but they are still Foresight product surfaces.
- Browser page protection alone does not stop direct API calls.

Recommended rollout:

1. Add shared `requireForesightApiSession()` helper.
2. Protect low-risk read APIs first: filters, trends, breakdown, insights, seasonality, regression-summary.
3. Protect prediction APIs: predict, predict-range, py-predict.
4. Confirm no raw data or provider internals are added to error responses.

## 7. External Lookup API Policy

External lookup APIs should be protected early because they can trigger network/provider work.

| API | Guard decision | Required ordering |
| --- | --- | --- |
| `/api/meta-ads` | protect | session guard before rate limit/provider call |
| `/api/meta-ads-scrape` | protect | session guard before rate limit, Meta API attempt, or Playwright fallback |
| `/api/google-ads` | protect | session guard before rate limit/external call |

Recommended rule:

```text
No-session request must fail before external provider or scraping work can start.
```

Keep existing rate limits after session guard.

## 8. Benchmark Dry-Run / Upload / Reviewer Guard Priority

No benchmark upload/reviewer API exists in the current app route inventory.

Future guard priorities:

| Future surface | Guard priority | Required access |
| --- | --- | --- |
| benchmark dry-run API | high | authenticated uploader/reviewer |
| benchmark upload API | highest | uploader/reviewer plus fail-closed parser |
| benchmark report detail API | high | reviewer/admin or owning uploader |
| benchmark review action API | highest | reviewer/admin only |
| normalized dataset promotion API | highest | data steward/admin only |

Guard requirements for future benchmark surfaces:

- no raw file storage unless approved.
- no raw campaign-level rows to LLM.
- no DB promotion until reviewer approval.
- no upload/import side effects during dry-run.
- no ordinary user direct promotion.
- audit/rate-limit plan before write-capable APIs.

Auth-4 recommendation:

```text
Do not implement benchmark upload/dry-run/reviewer API guards in the page guard Gate.
Record candidate files and require a separate Benchmark/Auth implementation Gate.
```

## 9. Meta Sync / Py Retrain Guard Preservation

Existing high-risk operation routes:

| API | Current guard | Auth-4 decision |
| --- | --- | --- |
| `/api/meta-sync` | internal key, dry-run default, explicit execution flag, kill-switch flag | preserve unchanged |
| `/api/py-retrain` | internal key, dry-run default, explicit execution flag, kill-switch flag | preserve unchanged |

Rules:

- Do not replace internal-key guard with ordinary user session.
- Do not loosen dry-run default.
- Do not call Meta API during auth guard verification.
- Do not trigger Python retrain during auth guard verification.
- A future admin-session check may be additive only, not a substitute for internal execution authority.

## 10. Export / Debug Disabled Preservation

Current disabled routes:

| API | Current behavior | Auth-4 decision |
| --- | --- | --- |
| `/api/export` | `403 Export is disabled.` | keep disabled |
| `/api/debug-env` | `404 Not found` | keep disabled |
| `/api/debug-data` | `404 Not found` | keep disabled |

Rules:

- Do not make debug/export available to logged-in users.
- Do not add account/session exceptions.
- Do not expose env, token, secret, or raw data diagnostics.
- Keep `no-store` responses.

## 11. Rollout Order

Recommended rollout:

1. `Foresight-Auth-5 page guard implementation`
2. `Foresight-Auth-6 no-session page smoke and copy review`
3. `Foresight-Auth-7 aggregate/prediction API guard implementation`
4. `Foresight-Auth-8 external lookup API guard implementation`
5. `Foresight-Auth-9 benchmark reviewer/upload guard design`
6. `Foresight-Auth-10 authenticated happy-path smoke`

Why page guard first:

- Current user-visible product pages are public.
- Login shell already exists.
- Page redirects are easier to verify without exercising external APIs.
- It reduces exposure while leaving complex API behavior untouched for a focused Gate.

When API guard may move earlier:

- If external lookup endpoints are exposed publicly in production and provider/cost risk is urgent.
- If API direct calls are a known abuse path.
- If upstream infrastructure cannot restrict no-session API traffic.

## 12. Implementation Notes For Page Guard Gate

Candidate page guard helper:

```text
requireForesightPageSession(path: string)
```

Temporary no-session behavior if no session provider contract exists:

- fail closed for protected pages.
- redirect to `/login?next=<sanitized path>`.
- do not attempt Auth mutation.
- do not infer a session from query parameters.

Potential wrapper pattern:

```text
app/page.tsx server wrapper
-> guard
-> render client component
```

Risk:

- Existing main pages are client components.
- Moving large page bodies can create churn.

Lower-churn alternative:

- Add route-level middleware/proxy only after route matcher is verified.
- Or split each page into `PageClient.tsx` plus server `page.tsx` wrapper in a focused refactor.

Recommendation:

```text
Prefer a low-churn server wrapper split only for protected pages in Auth-5.
Avoid global middleware until smoke coverage exists.
```

## 13. Verification Plan

Static verification:

- `git diff --check`
- `npx tsc --noEmit`
- `npm run build`
- secret pattern scan
- forbidden copy scan for user-facing login/account guard surfaces
- staged file scope check before commit

No-session page smoke after page guard:

| Request | Expected |
| --- | --- |
| `/` | redirect to `/login?next=%2F` |
| `/trends` | redirect to `/login?next=%2Ftrends` |
| `/insights` | redirect to `/login?next=%2Finsights` |
| `/competitor` | redirect to `/login?next=%2Fcompetitor` |
| `/account` | redirect to `/login?next=%2Faccount` |
| `/login` | renders login shell |
| `/reset-password` | renders reset shell |

No-session API smoke after API guard:

| Request | Expected |
| --- | --- |
| `/api/filters` | `401` JSON `{ "error": "Authentication required." }` |
| `/api/predict` | `401` JSON `{ "error": "Authentication required." }` |
| `/api/predict-range` | `401` JSON `{ "error": "Authentication required." }` |
| `/api/py-predict` | `401` JSON `{ "error": "Authentication required." }` |
| `/api/trends` | `401` JSON `{ "error": "Authentication required." }` |
| `/api/breakdown` | `401` JSON `{ "error": "Authentication required." }` |
| `/api/insights` | `401` JSON `{ "error": "Authentication required." }` |
| `/api/seasonality` | `401` JSON `{ "error": "Authentication required." }` |
| `/api/regression-summary` | `401` JSON `{ "error": "Authentication required." }` |
| `/api/meta-ads` | `401` before provider call |
| `/api/meta-ads-scrape` | `401` before provider/scrape call |
| `/api/google-ads` | `401` before external call |

High-risk route regression smoke:

| Request | Expected |
| --- | --- |
| `/api/meta-sync` without internal key | existing `403`/`503` fail-closed behavior |
| `/api/py-retrain` without internal key | existing `403`/`503` fail-closed behavior |
| `/api/export` | `403` disabled |
| `/api/debug-env` | `404` disabled |
| `/api/debug-data` | `404` disabled |

Benchmark safety smoke:

- `npm run benchmark:dry-run`
- confirm `db_write=false`
- confirm `meta_api_call=false`
- confirm `llm_call=false`
- confirm `python_retrain=false`
- confirm `raw_file_created=false`

## 14. Stop Conditions For Implementation Gates

Stop if:

- page guard requires Auth/DB mutation to verify.
- page guard exposes provider/Auth internals in UI.
- no-session API smoke would call Meta, Google, Python, or DB.
- `meta-sync` or `py-retrain` guard behavior changes unexpectedly.
- export/debug routes become available.
- build requires env values.
- benchmark dry-run attempts raw file creation or DB write.
- forbidden copy appears in product-facing UI.

## 15. Rollback Plan For Future Guard Implementation

Rollback should be split by Gate:

| Gate | Rollback unit |
| --- | --- |
| page guard | revert page wrapper/guard helper changes |
| API guard | revert shared API guard and route changes |
| external lookup guard | revert lookup route guard placement |
| benchmark guard | revert benchmark-specific API guard changes |

Rollback must preserve:

- `/login` shell unless it is the broken change.
- safe `next` sanitizer unless it is the broken change.
- `meta-sync` and `py-retrain` internal-key guards.
- export/debug disabled behavior.

Rollback must not:

- run SQL.
- mutate DB/Auth state.
- import benchmark data.
- call Meta API.
- trigger Python retrain.
- alter env.

## 16. Final Decision

Auth-4 recommends this sequence:

```text
1. Protect product pages first.
2. Protect /account with the same no-session redirect.
3. Protect aggregate/prediction APIs next.
4. Protect external lookup APIs before provider calls.
5. Keep benchmark upload/reviewer guards as a separate future Gate.
6. Preserve meta-sync, py-retrain, export, and debug behavior unchanged.
```
