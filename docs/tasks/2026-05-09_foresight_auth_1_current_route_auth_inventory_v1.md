# Foresight-Auth-1 Current Route Auth Inventory v1

Date: 2026-05-09
Status: read-only inventory completed
Repo: admate-foresight
Product: AdMate Foresight
Owner context: Agent Core auth/product-login rollout

## 1. Goal

Inventory the current AdMate Foresight route, API, auth, session, and no-session behavior before introducing a product-local login/account surface.

This Gate is read-only except for this documentation artifact.

Explicitly not performed:

- No code modification.
- No Auth or DB mutation.
- No benchmark import, upload, sync, or production data write.
- No Meta API call.
- No Python retrain execution.
- No DB schema or environment change.
- No stage, commit, or push.
- No environment, secret, token, credential, cookie, session, provider raw response, or raw campaign data output.

## 2. Read-Only Method

Reviewed:

- current working directory: `D:\Projects\AdMate\admate-foresight`
- `AGENTS.md`
- `README.md`
- `package.json`
- current `app/**/page.tsx`
- current `app/api/**/route.ts`
- `components/Navigation.tsx`
- `lib/security.ts`
- `lib/rateLimit.ts`
- `lib/supabase.ts`
- `lib/xlsxLoader.ts`
- `lib/metaSync.ts`
- `scripts/benchmark-dry-run.mjs`

No application route, API route, DB, Auth provider, Python service, Meta API, or Supabase mutation was called during the inventory.

Repo boundary:

- This artifact was created under the Foresight repo only.
- No Agent Core repo file was created or modified.
- No central docs repo file was created or modified.

## 3. Current Route / Page Structure

Current page routes:

| Route | File | Current access state |
| --- | --- | --- |
| `/` | `app/page.tsx` | public; no detected auth guard |
| `/trends` | `app/trends/page.tsx` | public; no detected auth guard |
| `/insights` | `app/insights/page.tsx` | public; no detected auth guard |
| `/competitor` | `app/competitor/page.tsx` | public; no detected auth guard |

Current global app files:

| File | Note |
| --- | --- |
| `app/layout.tsx` | global layout |
| `app/globals.css` | global styles |
| `components/Navigation.tsx` | main product navigation |

Current navigation label:

```text
Ad-Planner AI
```

Assessment:

```text
foresight_product_routes_public_no_login_shell_detected
```

## 4. Auth / Account Route Existence

Current route existence:

| Route | Exists? | Evidence |
| --- | --- | --- |
| `/login` | no | no `app/login/page.tsx` detected |
| `/reset-password` | no | no `app/reset-password/page.tsx` detected |
| `/account` | no | no `app/account/page.tsx` detected |
| `/profile` | no | no `app/profile/page.tsx` detected |
| `/access-request` | no | no local page detected |

Recommended first route contract:

```text
/login?next=<path>
/reset-password
/account
/profile -> /account
external access request link
```

Recommended external access request target:

```text
https://home.admate.ai.kr/access-request?product=foresight
```

Fallback target while Homepage integration is still being aligned:

```text
https://sentinel.admate.ai.kr/access-request
```

## 5. Middleware / Protected Page Guard

Current state:

- No root `middleware.ts` detected.
- No root `proxy.ts` detected.
- No product route guard detected in page files.
- No no-session redirect to `/login?next=...` detected.

No-session behavior inferred from current code:

```text
Unauthenticated user can render current primary product pages.
```

This applies to:

- `/`
- `/trends`
- `/insights`
- `/competitor`

Risk:

```text
high_for_product_login_rollout
```

Reason:

- Product UI and planning tools are currently reachable before identity or product access is checked.
- No product-local login shell exists to preserve Foresight context.

## 6. Supabase / Auth / Session Helper State

Detected Supabase usage:

| File | Usage |
| --- | --- |
| `package.json` | depends on `@supabase/supabase-js` |
| `lib/supabase.ts` | exports basic Supabase client using public/anon env names |
| `lib/xlsxLoader.ts` | loads aggregate benchmark data through Supabase RPC |
| `lib/metaSync.ts` | writes synced Meta rows to Supabase when execution path is allowed |

Not detected:

- authenticated user session helper
- login submit helper
- logout helper
- account read helper
- product membership helper
- Foresight-specific session cookie helper
- Agent Core account API consumer

Assessment:

```text
supabase_data_client_exists_auth_session_layer_missing
```

## 7. Current API Inventory And Guard State

### 7.1 Prediction / Benchmark Read APIs

| API | Method | Current guard state | Notes |
| --- | --- | --- | --- |
| `/api/filters` | GET | public | loads available filters and months |
| `/api/predict` | POST | public | calls `ensureDataLoaded()` then deterministic prediction |
| `/api/predict-range` | POST | public | returns budget range projections |
| `/api/regression-summary` | GET | public | returns regression summary |
| `/api/trends` | GET | public | returns trend data |
| `/api/breakdown` | GET | public | returns breakdown data |
| `/api/insights` | GET | public | returns seasonal insight data |
| `/api/seasonality` | GET | public | returns seasonality data |

Current implication:

```text
No-session users can call prediction and benchmark read APIs unless upstream infrastructure blocks them.
```

Risk:

```text
medium
```

Reason:

- These APIs read aggregate/benchmark-style data, but they are still product data surfaces and should align with product access policy.

### 7.2 Python ML APIs

| API | Method | Current guard state | Notes |
| --- | --- | --- | --- |
| `/api/py-predict` | POST | public | proxies to Python `/predict` if `PYTHON_API_URL` is configured |
| `/api/py-retrain` | POST | internal-key gated | dry-run by default; execution requires internal key, explicit body, reason, execute flag, and `FORESIGHT_RETRAIN_EXECUTE_ENABLED=true` |

`/api/py-retrain` guard assessment:

```text
stronger_than_other_routes_for_execution_boundary
```

Notes:

- It requires `x-admate-internal-key` through `requireInternalKey`.
- If no internal key is configured, it fails closed with `503`.
- If the key is missing or wrong, it fails closed with `403`.
- Dry-run default avoids Python retrain.
- Actual retrain path is disabled unless an explicit environment flag is set.

UI note:

- `app/page.tsx` currently renders a `모델 재학습` button that posts to `/api/py-retrain`.
- For no-session users, the button is visible because the page itself is public.
- The API guard should block execution, but the UX is confusing and should be hidden behind an authenticated/admin state.

### 7.3 External Ads / Meta / Google APIs

| API | Method | Current guard state | Notes |
| --- | --- | --- | --- |
| `/api/meta-ads` | GET | public + rate limit | uses Meta env token if configured |
| `/api/meta-ads-scrape` | GET | public + rate limit for first path; production fallback requires internal key | tries Meta API first, then Playwright fallback |
| `/api/google-ads` | GET | public + rate limit | calls Google Ads Transparency endpoints |
| `/api/meta-sync` | POST | internal-key gated | dry-run by default; execution requires explicit approval and `FORESIGHT_META_SYNC_WRITE_ENABLED=true` |

`/api/meta-sync` guard assessment:

```text
execution_guarded_but_endpoint_exists
```

Notes:

- It requires internal key.
- Dry-run defaults to no Meta API and no DB write.
- Actual sync requires explicit execute, reason, environment enable flag, and configured target.

`/api/meta-ads` and `/api/meta-ads-scrape` risk:

```text
medium_high
```

Reason:

- They are callable without user session.
- They may call external services if configured.
- They rely on rate limiting and provider/environment configuration rather than product authentication.

### 7.4 Export / Debug APIs

| API | Method | Current guard state | Notes |
| --- | --- | --- | --- |
| `/api/export` | POST | disabled | always returns `403 Export is disabled.` |
| `/api/debug-env` | GET | disabled | returns `404 Not found` |
| `/api/debug-data` | GET | disabled | returns `404 Not found` |

Assessment:

```text
debug_export_currently_safe_disabled
```

## 8. Benchmark Upload / Dry-Run / Admin Surface

Detected script surfaces:

| Surface | State |
| --- | --- |
| `scripts/benchmark-dry-run.mjs` | local inline mock-only dry run |
| `lib/benchmark/dryRunHarness.mts` | mock dry-run harness with secret/session-like field checks |
| `scripts/upload_to_supabase.py` | Supabase upload script; not executed in this Gate |

`benchmark:dry-run` script behavior from static read:

```text
mode: local_inline_mock_only
db_write: false
meta_api_call: false
llm_call: false
python_retrain: false
raw_file_created: false
```

Assessment:

```text
benchmark_dry_run_safe_to_run_as_validation
```

Important boundary:

- `scripts/upload_to_supabase.py` is a DB write/upload utility and must not be run during auth inventory or login shell planning.

## 9. No-Session Behavior Summary

No live product API calls were made in this Gate. The following behavior is inferred from static route/API code.

| Surface | No-session expected behavior |
| --- | --- |
| `/` | renders app page |
| `/trends` | renders trends page |
| `/insights` | renders insights page |
| `/competitor` | renders competitor page |
| `/api/filters` | callable |
| `/api/predict` | callable |
| `/api/predict-range` | callable |
| `/api/py-predict` | callable if Python URL is configured |
| `/api/py-retrain` | fails closed without internal key / approval |
| `/api/meta-ads` | callable and may call Meta if configured |
| `/api/meta-ads-scrape` | callable, rate-limited, may call Meta API first |
| `/api/google-ads` | callable and may call external Google transparency endpoint |
| `/api/meta-sync` | fails closed without internal key / approval |
| `/api/export` | disabled 403 |
| `/api/debug-env` | disabled 404 |
| `/api/debug-data` | disabled 404 |

High-priority auth gaps:

- main product pages are public
- prediction APIs are public
- competitor external lookup APIs are public
- no product-local login route exists
- no account/profile route exists
- no shared `next` sanitizer exists

## 10. Foresight Login Shell Candidate Files

Likely implementation candidates:

| Candidate | Purpose |
| --- | --- |
| `app/login/page.tsx` | Foresight-local login route |
| `app/login/LoginShell.tsx` | client login form/shell if using server page wrapper |
| `lib/auth/foresight-session.ts` | server-side session helper and `next` sanitizer |
| `lib/auth/foresight-session-client.ts` | optional client helper if needed |
| `app/api/auth/login/route.ts` | product-local login API if using Lens-style cookie handoff |
| `app/api/auth/logout/route.ts` | product-local logout route |
| `app/page.tsx` | protect main simulator page |
| `app/trends/page.tsx` | protect trends page |
| `app/insights/page.tsx` | protect insights page |
| `app/competitor/page.tsx` | protect competitor page |
| `components/Navigation.tsx` | update product label and account/logout affordance |
| `app/account/page.tsx` | optional Foresight-local account link/shell |
| `app/profile/page.tsx` | optional redirect to `/account` |

Candidate API guard files:

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

Routes already stronger-gated and should be preserved:

- `app/api/py-retrain/route.ts`
- `app/api/meta-sync/route.ts`

## 11. Recommended Login Copy

Recommended title:

```text
AdMate Foresight 로그인
```

Recommended description:

```text
성과 예측과 기준 데이터 검토를 이용하려면 AdMate 계정으로 로그인하세요.
```

Recommended support copy:

```text
로그인 후 현재 보려던 Foresight 화면으로 돌아갑니다.
접근 권한이 없다면 이용 신청을 진행해주세요.
```

Recommended access request CTA:

```text
접근 권한이 없다면 이용 신청
```

Recommended account copy:

```text
AdMate 계정
접근 가능한 제품과 권한 상태를 확인합니다.
```

## 12. Forbidden Copy Scan

Searched current source files for raw auth/internal wording.

No dedicated login/account surface exists, so no Foresight login copy currently exposes:

```text
Openclaw 로그인
Hermes 로그인
Supabase Auth
Supabase recovery
Hermes reviewer
Agent Core 검토
```

However, implementation-oriented wording does appear in developer/API/data context:

- `Supabase` appears in data-loading code and README-level environment documentation.
- `META_ACCESS_TOKEN` appears in code and UI help copy on `/competitor`.
- `Ad-Planner AI` remains as the product shell label.

Assessment:

```text
login_forbidden_copy_not_present_because_login_surface_missing
product_naming_cleanup_needed
```

User-facing Foresight login/account work should not introduce:

```text
Openclaw
Hermes
Supabase Auth
Supabase recovery
system_role
membership
auth.users
openclaw.users
provider token
service role
```

## 13. Next Sanitizer Candidate

Recommended helper:

```text
sanitizeForesightNextPath(raw: unknown): string
```

Minimum behavior:

- accept only string input
- trim and length-limit
- require relative path beginning with `/`
- reject `//`
- reject backslashes
- reject absolute URLs
- reject executable schemes such as `javascript:`
- parse against `https://foresight.admate.ai.kr` or the final Foresight production origin
- require same origin after parse
- reject `/api` and `/api/...`
- allow only known page paths initially
- preserve query string only after path validation
- drop sensitive query keys
- fallback to `/`

Initial page allowlist:

```text
/
/trends
/insights
/competitor
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
```

## 14. Agent Core External Link Candidates

Access request:

```text
https://home.admate.ai.kr/access-request?product=foresight
```

Fallback:

```text
https://sentinel.admate.ai.kr/access-request
```

Account:

```text
https://sentinel.admate.ai.kr/account
```

Reset password:

```text
https://sentinel.admate.ai.kr/reset-password
```

Design note:

- Foresight can start with product-local login and external account/reset/access-request links.
- A richer Foresight-local `/account` should wait until product authorization and account read ownership are explicitly designed.

## 15. Risk Assessment

| Area | Risk | Reason |
| --- | --- | --- |
| Pages public without auth | high | Product planning surfaces render without session. |
| Prediction APIs public | medium | Aggregate benchmark APIs are callable without product authorization. |
| Competitor external lookups public | medium-high | External provider calls can be triggered without login if env is configured. |
| Retrain button visible | medium | API guard blocks execution, but unauthenticated UX exposes an admin-like action. |
| Meta sync / retrain execution | medium-low | Internal-key and explicit execution gates exist. |
| Debug/export | low | Currently disabled. |
| Product naming | medium | UI still presents `Ad-Planner AI`, not AdMate Foresight. |

## 16. Recommended Implementation Order

Recommended next gates:

1. `Foresight-Auth-2 product login shell implementation plan`
2. `Foresight-Auth-3 next sanitizer and auth session helper implementation`
3. `Foresight-Auth-4 product login shell implementation`
4. `Foresight-Auth-5 API guard implementation plan`
5. `Foresight-Auth-6 API guard implementation`
6. `Foresight-Auth-7 production no-session smoke`
7. `Foresight-Auth-8 account/access request link integration`

Implementation should prioritize:

- login shell and page protection first
- external lookup and prediction API guard second
- account/profile surface third
- product naming cleanup alongside shell work

## 17. Verification Plan For Future Implementation

Future implementation should verify:

- no-session `/` redirects to `/login?next=%2F`
- no-session `/trends`, `/insights`, `/competitor` preserve safe `next`
- invalid `next` values fall back to `/`
- `/api/predict`, `/api/predict-range`, `/api/py-predict`, and external lookup APIs fail closed without session
- `/api/py-retrain` and `/api/meta-sync` keep existing internal-key execution gates
- login page renders Foresight copy without raw provider/internal wording
- access request link opens Agent Core/Homepage path
- benchmark dry-run remains local mock-only

## 18. Closure

Foresight currently has a functional planning/benchmark product surface but no product login/account shell.

The first implementation should follow the proven product-local pattern:

```text
protected Foresight path
-> /login?next=<safe same-origin path>
-> AdMate Foresight login shell
-> successful login
-> sanitized return path
```

This should be introduced without touching benchmark import, Meta sync, Python retrain, DB schema, Auth lifecycle mutation, or Agent Core account lifecycle flows.
