# AdMate Foresight Security Surface Review v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Security-1 debug and Meta API route hardening review

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 AdMate Foresight repo의 debug, export, retrain, Meta sync, external ads lookup, prediction API surface를 업로드/benchmark 구현 전에 read-only로 점검하고, 먼저 닫아야 할 위험을 정리한다.

이번 Gate는 문서화만 수행한다. 코드, API route, DB schema, env, token, import/export, migration, Meta API 호출은 변경하거나 실행하지 않는다.

검토 기준:

```text
Benchmark upload and dry-run must not inherit unsafe debug, sync, export, or retrain surfaces.
High-impact routes must fail closed before raw upload parsing or benchmark promotion is exposed.
```

## 2. Scope and Non-scope

### 2.1 Scope

- `app/api/**/route.ts`의 route inventory
- `lib/security.ts`, `lib/rateLimit.ts`, `lib/metaSync.ts`의 guard/write/external-call surface
- `lib/xlsxLoader.ts`의 Supabase aggregate loading surface
- Python FastAPI `python/main.py`의 predict/retrain/model-info surface
- root `scripts/`의 debug, export, upload, scrape, cache rebuild risk
- benchmark upload implementation 전 blocker 정의

참고: 요청의 `src/app/api/**` 경로와 달리 현재 repo의 route는 `app/api/**` 아래에 있다. `/api/prediction/benchmark` route는 현재 발견되지 않았고, 가까운 benchmark/prediction surface는 `/api/predict`, `/api/predict-range`, `/api/regression-summary`다.

### 2.2 Non-scope

- code/API/DB/env 수정
- DB connection, import, export, migration 실행
- Meta API 호출 또는 direct pull 실행
- token/env/secret 값 열람 또는 출력
- raw Excel/CSV/model artifact 추가
- commit, push, PR 생성

## 3. Current Guard Primitives

현재 공통 보안 helper는 `lib/security.ts`에 있다.

| Helper | Current behavior | Review note |
| --- | --- | --- |
| `requireInternalKey(req)` | configured internal key가 없으면 503, header mismatch는 403 | fail-closed 형태는 좋다. 호출 route에는 audit, rate limit, operator identity가 추가로 필요하다. |
| `blockProductionDebugRoute()` | `NODE_ENV` 또는 `VERCEL_ENV`가 production이면 404 | production debug 차단은 있으나 staging/public preview/local tunnel에는 열릴 수 있다. |
| `sanitizeError()` | token/key/secret query-like string과 bearer token 형태를 일부 redaction | 모든 error response에 일관 적용되어 있지는 않다. |
| `maskIdentifier()` | 짧은 identifier는 전체 mask, 긴 identifier는 앞/뒤 일부만 노출 | route log에는 사용되지만 report/LLM payload에는 identifier 자체를 보내지 않는 정책이 별도로 필요하다. |

`lib/rateLimit.ts`는 process-local in-memory bucket이다. 단일 runtime 안에서는 유용하지만 serverless multi-instance, cold start, distributed abuse에는 충분하지 않다.

## 4. Route Inventory

Static source review 기준이며 실제 HTTP 요청, DB 연결, Meta API 호출은 수행하지 않았다.

| Route path | Method | Purpose | Auth/guard | Env/secret access 가능성 | DB write 가능성 | Meta API 호출 가능성 | Raw data exposure 가능성 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/debug-env` | GET | Supabase env presence diagnostics | `blockProductionDebugRoute()` only | env presence boolean 노출 | No | No | Low, but env/config fingerprint exposure |
| `/api/debug-data` | GET | loaded aggregate count/distribution diagnostics | `blockProductionDebugRoute()` only | Supabase aggregate loader env names used indirectly | No direct write | No | P1/P2: industry/objective distributions and aggregate counts |
| `/api/py-retrain` | POST | Next.js to Python `/retrain` proxy | `requireInternalKey()` fail-closed | `PYTHON_API_URL`, internal key forwarding | No Next.js write, but model artifact write in Python | No | P1: model sample count/metrics returned |
| `/api/meta-sync` | POST | Meta Marketing API sync into Supabase | `requireInternalKey()` fail-closed | Meta token and target account/business env names | Yes, via `syncMetaToSupabase()` insert into `ad_data` | Yes | P1: campaign-level Meta rows transformed; result counts/errors returned |
| `/api/export` | POST | Excel report generation | No route guard observed | child process inherits env | No DB write | No | P1/P2: unauthenticated Excel export from request body; temp file generated |
| `/api/predict` | POST | TypeScript prediction | No route guard observed | Supabase aggregate loader env names used indirectly | No | No | Aggregate prediction result; possible benchmark surface exposure |
| `/api/predict-range` | POST | Budget range prediction | No route guard observed | Supabase aggregate loader env names used indirectly | No | No | Aggregate prediction result; possible compute abuse |
| `/api/py-predict` | POST | Python `/predict` proxy | No route guard observed | `PYTHON_API_URL`; error detail may expose internal service info | No | No | Model metrics and prediction output; error detail exposure risk |
| `/api/regression-summary` | GET | Regression summary | No route guard observed | Supabase aggregate loader env names used indirectly | No | No | Aggregate model summary exposure |
| `/api/filters` | GET | UI filters from CSV and Supabase aggregates | No route guard observed | Supabase aggregate loader env names used indirectly | No | No | Industry/objective/month lists; server logs may include industry list |
| `/api/trends` | GET | Trend data | No route guard observed | Supabase aggregate loader env names used indirectly | No | No | Aggregate trend exposure |
| `/api/breakdown` | GET | Breakdown data | No route guard observed | Supabase aggregate loader env names used indirectly | No | No | Aggregate segment exposure |
| `/api/seasonality` | GET | Seasonality insights | No route guard observed | Supabase aggregate loader env names used indirectly | No | No | Aggregate seasonality exposure |
| `/api/insights` | GET | Season insights | No route guard observed | Supabase aggregate loader env names used indirectly | No | No | Aggregate insight exposure |
| `/api/meta-ads` | GET | Meta Ad Library lookup | In-memory rate limit only | Meta token/app credential env names used server-side | No | Yes | Public ad library data; quota/token abuse risk |
| `/api/meta-ads-scrape` | GET | Meta API first, Playwright scrape fallback | In-memory rate limit; production Playwright fallback requires internal key after API failure | Meta/chromium env names used server-side | No | Yes | Public ad library data, page names/ad body output; browser automation cost risk |
| `/api/google-ads` | GET | Google Ads Transparency lookup | In-memory rate limit only | No repo secret env observed | No | No Meta; calls Google external endpoint | Public ads data; advertiser names/creative metadata output |

## 5. Library and Python Surface

### 5.1 `lib/metaSync.ts`

`syncMetaToSupabase()` performs Meta Marketing API reads and Supabase `ad_data` inserts. It maps campaign-level `campaign_name`, objective, optimization goal, placement, age/gender, reach, impressions, spend, frequency, CPM, CPC, video action values, and date into legacy rows.

Current risks:

- write path exists behind `/api/meta-sync`
- body can override account or business target
- default date preset can pull a broad window unless capped by policy
- no route-level rate limit or operator audit log
- no dry-run mode before insert
- raw campaign name is used for industry extraction and is stored into legacy shape
- Supabase client can use service role key fallback if configured

### 5.2 `lib/xlsxLoader.ts`

`ensureDataLoaded()` lazily calls Supabase RPC aggregate functions and caches monthly/demographic aggregate rows. It is read-oriented, but many public prediction/trend routes trigger it.

Current risks:

- public route traffic can cause aggregate loading and regression fitting
- logs include aggregate load progress and partial URL prefix behavior in source
- aggregate fields are safer than raw campaign rows but still internal benchmark data

### 5.3 Python FastAPI

Python `main.py` exposes:

| Python route | Method | Purpose | Guard | Risk |
| --- | --- | --- | --- | --- |
| `/predict` | POST | ML prediction | No internal key requirement | Public exposure risk if Python service is reachable directly |
| `/retrain` | POST | Supabase data load and model training | internal key required | High-impact model retrain and model artifact write |
| `/model-info` | GET | model metadata | No internal key requirement | Model quality/sample metadata exposure |
| `/health` | GET | healthcheck | No internal key requirement | Low, but service fingerprinting |

Python startup may train from Supabase if no saved model is present. This is useful for local PoC but should be reviewed before public deployment because service startup can become an implicit data read/model write event.

## 6. Root Script Surface

| File | Purpose | Current risk | Recommendation |
| --- | --- | --- | --- |
| `scripts/generate_excel.py` | Generate XLSX report from stdin JSON | Used by unauthenticated `/api/export`; trusts request-shaped input; creates workbook output | Guard route, validate schema, cap output size, or move to local-only/report-worker path |
| `scripts/upload_to_supabase.py` | Read local cache and POST rows to Supabase | DB import script; reads local env file if present; uses anon key env names; disables TLS verification | Mark as local-only/manual; do not expose through API; require explicit approval before any use or replacement |
| `scripts/rebuild_cache.py` | Read raw XLSX under `data/` and write JSON cache | Raw data and cache artifact risk; legacy campaign-name-derived industry mapping | Do not run in benchmark Gates; replace later with dry-run validation and approved normalized dataset flow |
| `scripts/scrape_worker.js` | Playwright scrape worker for Meta Ad Library fallback | Browser automation, stdout ad JSON, local browser path discovery | Keep local-only or admin-gated; sanitize errors; cap timeout and output |
| `scripts/test_input.json` | Example export input | Contains sample report payload and a non-canonical local output path | Treat as old local fixture only; do not use as benchmark/data fixture |

These scripts are not automatically unsafe just by existing, but they should not become upload, sync, or benchmark automation without a separate approved hardening Gate.

## 7. Risk Classification

### P0: Secret/env/token exposure

Current findings:

- `/api/debug-env` returns env presence booleans. It does not output values, but it reveals deployment/config state in non-production environments.
- `/api/py-predict` returns raw-ish error detail from proxy exceptions and can expose internal service information.
- `/api/export` logs raw error objects and child process inherits full server env.
- Meta lookup routes build external API requests with server-side tokens; response handling does not return token values, but logs/errors must remain redacted.

Required hardening:

- disable debug routes outside local development or require internal/admin key everywhere
- standardize `sanitizeError()` on all route error logs/responses
- never include request URLs with credential-bearing query params in logs or responses
- avoid returning internal service URL, path, or raw exception strings to clients

### P0: Unauthenticated DB write/import/export/retrain

Current findings:

- `/api/meta-sync` has internal key guard and is fail-closed, but it writes to Supabase and calls Meta API.
- `/api/py-retrain` has internal key guard and forwards the internal key to Python `/retrain`.
- Python `/retrain` also requires internal key, but Python service must not be publicly reachable without network/auth protection.
- `/api/export` is unauthenticated and spawns Python to generate an Excel file.
- `scripts/upload_to_supabase.py` is a DB import script and must remain manual/local-only.

Required hardening:

- add auth, audit, rate limit, and operator log to all write/retrain/export surfaces
- keep `/api/meta-sync` disabled in production until account allowlist, date cap, and dry-run mode exist
- require explicit approval before any DB import/export/migration automation
- move legacy import scripts out of runtime paths or mark them local-only with clear guardrails

### P1: Raw campaign-level data exposure

Current findings:

- `metaSync.ts` handles campaign-level names and metrics before inserting legacy rows.
- `/api/debug-data` returns internal aggregate distributions.
- prediction/trend routes expose internal benchmark aggregate outputs without auth.
- external ads lookup routes return advertiser/page/ad creative data from public libraries.

Required hardening:

- ensure all LLM/report-ready surfaces receive only aggregate canonical benchmark fields
- prevent raw campaign/account/ad identifiers from entering response payloads except restricted reviewer metadata
- mask or remove advertiser/page/campaign names in any future upload dry-run preview
- keep debug distribution routes local-only or admin-gated

### P1: Meta API sync without audit/rate limit

Current findings:

- `/api/meta-sync` can override account/business target via request body.
- It has no observed rate limit, no dry-run default, and no durable operator audit event.
- It logs masked account/business identifiers and inserted/error counts, but no reviewer/operator approval model exists.

Required hardening:

- add account/business allowlist and disallow arbitrary body override by default
- cap date ranges and reject mixed long-term pulls unless explicitly approved
- default to dry-run until reviewer approval
- add distributed rate limit and audit events
- return sanitized count/status only; do not return raw row samples

### P2: Debug-only route left in production

Current findings:

- `/api/debug-env` and `/api/debug-data` are blocked only when runtime flags equal production.
- Preview, staging, tunnel, or mis-set runtime may expose diagnostics.

Required hardening:

- remove debug routes before production or require internal/admin key in every non-local runtime
- return 404 by default unless an explicit local-development flag is set
- do not expose env presence details to browser clients

### P2: Oversized file/upload or heavy runtime risk

Current findings:

- No benchmark upload route exists yet.
- `/api/export` can generate workbook output from request body without observed schema or size cap.
- `/api/meta-ads-scrape` can run browser automation and remote chromium resolution with only in-memory rate limiting.
- prediction range and regression summary can trigger aggregate loading/regression fitting.

Required hardening:

- define request body limits, file size caps, method allowlists, and timeout caps before upload dry-run API work
- prefer local CLI dry-run harness for MVP before any API upload route
- keep Playwright scrape fallback admin-gated or local-only
- use distributed rate limiting for heavy endpoints

## 8. Hardening Recommendations

Recommended route policy:

| Surface | Recommendation | Priority |
| --- | --- | --- |
| Debug routes | Remove or local-only; otherwise internal/admin key guard in every non-local runtime | P0/P2 |
| `/api/meta-sync` | Disabled by default in production; internal/admin guard, allowlist targets, dry-run default, audit log, distributed rate limit | P0/P1 |
| `/api/py-retrain` and Python `/retrain` | Internal/admin guard, distributed rate limit, audit log, operator reason, explicit model artifact policy | P0 |
| `/api/export` | Add auth/guard, schema validation, output size cap, method allowlist, sanitized error handling; consider local-only worker | P0/P2 |
| `/api/py-predict` | Redact error detail, guard if model output is internal-only, validate body | P1/P2 |
| Prediction/trend routes | Decide public vs internal product boundary; add rate limit and aggregate-only response contract | P1/P2 |
| External ads lookup routes | Keep tokens server-only, add distributed rate limit, sanitize errors, consider admin guard for scraping fallback | P1/P2 |
| Root DB/cache scripts | Keep manual/local-only; require separate approval before use; never wire to API without new Gate | P0 |

Recommended control set:

1. Production disablement: debug, sync, retrain, import/cache rebuild, and scrape fallback should be off unless explicitly enabled.
2. Admin/internal key guard: high-impact routes should require fail-closed guard and operator identity.
3. Method allowlist: only expected methods should exist; unsupported methods should fail cleanly.
4. Request validation: body/query params should be schema-validated before work starts.
5. Response redaction: return generic user-safe errors; log sanitized detail only.
6. Audit/operator log: record actor, route, action type, date range, target reference, result counts, and reason without raw rows or secrets.
7. Rate limit: use distributed limits for Meta calls, retrain, export, scrape, upload dry-run.
8. Dry-run only mode: sync/import/upload paths should dry-run by default until a reviewer approves promotion.
9. Local-only scripts: legacy DB upload and cache rebuild scripts should not be exposed through runtime APIs.

## 9. Benchmark Upload Implementation Blockers

Before `Foresight-Benchmark-6 dry-run harness implementation` or any upload API can proceed, the following blockers should be resolved or explicitly accepted:

1. Decide whether benchmark dry-run remains CLI/local first. This review recommends CLI/local first.
2. Lock debug routes to local-only or internal/admin-only in all non-local runtimes.
3. Protect `/api/export` or move it out of unauthenticated runtime surface.
4. Keep `/api/meta-sync` disabled for production benchmark work until dry-run, target allowlist, date cap, audit, and rate limit are in place.
5. Keep `/api/py-retrain` and Python `/retrain` admin-only with audit/rate limit before allowing upload-derived benchmark data near model training.
6. Define future upload route requirements before implementation: max file size, parser timeout, no raw persistence, no LLM forwarding, reviewer-only masked preview, and fail-closed secret scan.
7. Confirm raw campaign/account/ad identifiers are blocked from LLM/report-ready output by contract, not only by convention.
8. Confirm root import/cache rebuild scripts are not used for new benchmark ingestion.

## 10. Follow-up Gates

### Foresight-Security-2: P0 Hardening Patch

Scope candidate:

- guard or remove debug routes in non-local runtime
- guard `/api/export`
- redact `/api/py-predict` error detail
- add rate limit/audit skeleton for retrain and meta-sync
- no DB migration unless separately approved

### Foresight-Benchmark-6: Dry-run Harness Implementation

Scope candidate:

- implement local CLI dry-run harness first
- validate source structure without DB write/import/export
- produce sanitized mapping/validation report
- use synthetic or sanitized fixtures only after approval

### Foresight-DB-2: Legacy DB Live Read-only Inventory Retry

Scope candidate:

- retry metadata-only live inventory with valid read-only path
- inspect schema/table/column/RLS/index/function/storage/auth metadata
- count rows without raw row output
- no import/export/migration

## 11. Final Recommendation

Security-1 recommends this order:

```text
1. Patch P0 route hardening first.
2. Keep benchmark upload dry-run local/CLI before API exposure.
3. Keep Meta sync and legacy DB scripts out of the MVP upload path.
4. Promote only validated, reviewer-approved, normalized aggregate benchmark data.
5. Send only anonymized aggregate summaries to LLM/report layers.
```
