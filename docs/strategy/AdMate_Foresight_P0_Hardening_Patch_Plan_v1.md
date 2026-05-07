# AdMate Foresight P0 Hardening Patch Plan v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Security-2 P0 hardening patch plan

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 `AdMate_Foresight_Security_Surface_Review_v1.md`에서 P0/P1로 분류한 위험 API surface를 실제 코드 수정 전에 patch plan으로 정리한다.

이번 Gate는 구현이 아니라 패치 계획 문서화다. 코드, API route, DB schema, env, import/export, migration, Meta API 호출은 변경하거나 실행하지 않는다.

기준 원칙:

```text
Disable high-risk behavior first.
Do not expand behavior while hardening.
Keep benchmark upload dry-run blocked until P0 surfaces are closed.
```

참고: 요청의 `src/app/api/**` 경로와 달리 현재 repo의 route는 `app/api/**` 아래에 있다.

## 2. Scope and Non-scope

### 2.1 Scope

- P0/P1 대상 route 목록과 현재 위험 정리
- route별 patch strategy와 patch order 정의
- 구현 후보 파일과 shared helper 후보 정의
- verification, smoke, rollback 계획 정의
- benchmark upload dry-run 구현 전 blocker 명시

### 2.2 Non-scope

- code/API/DB/schema/env 수정
- DB connection, import, export, migration 실행
- Meta API direct pull 또는 sync 호출
- token/env/secret 값 열람 또는 출력
- raw Excel/CSV/model artifact 추가
- commit, push, PR 생성

## 3. P0/P1 Target Inventory

| Target | File path | Current priority | Why included |
| --- | --- | --- | --- |
| `/api/export` | `app/api/export/route.ts` | P0 | unauthenticated Python spawn and Excel export surface |
| `/api/debug-env` | `app/api/debug-env/route.ts` | P0/P2 | env presence and deployment fingerprint surface |
| `/api/debug-data` | `app/api/debug-data/route.ts` | P1/P2 | internal aggregate distribution exposure |
| `/api/py-retrain` | `app/api/py-retrain/route.ts` | P0/P1 | model retrain proxy with downstream Supabase read/model artifact write |
| `/api/meta-sync` | `app/api/meta-sync/route.ts` | P0/P1 | Meta API read plus Supabase insert path |
| `/api/meta-ads` | `app/api/meta-ads/route.ts` | P1/P2 | external Meta lookup using server-side credentials |
| `/api/meta-ads-scrape` | `app/api/meta-ads-scrape/route.ts` | P1/P2 | Meta lookup plus Playwright fallback and heavy runtime surface |
| `/api/google-ads` | `app/api/google-ads/route.ts` | P1/P2 | external lookup and advertiser metadata output |
| Python `/retrain` | `python/main.py` | P0/P1 | direct retrain endpoint if Python service is reachable |
| Python `/predict` and `/model-info` | `python/main.py` | P1/P2 | model output and metadata exposure if reachable |
| DB/cache/debug scripts | `scripts/*.py`, `scripts/*.js`, `scripts/test_input.json` | P0/P1 | local import/cache/export/scrape tools must not become runtime paths |

Related lower-priority benchmark exposure surfaces:

| Route | File path | Current priority | Plan |
| --- | --- | --- | --- |
| `/api/predict` | `app/api/predict/route.ts` | P1/P2 | rate limit and aggregate-only contract after P0 patch |
| `/api/predict-range` | `app/api/predict-range/route.ts` | P1/P2 | rate limit and body cap after P0 patch |
| `/api/regression-summary` | `app/api/regression-summary/route.ts` | P1/P2 | internal/admin policy decision after P0 patch |
| `/api/filters`, `/api/trends`, `/api/breakdown`, `/api/seasonality`, `/api/insights` | `app/api/*/route.ts` | P1/P2 | decide public product boundary, then rate limit/redact logs |

## 4. Current Route Risks

### 4.1 `/api/export`

Current risks:

- unauthenticated `POST`
- spawns Python process through `scripts/generate_excel.py`
- child process inherits server env
- request body is trusted enough to generate workbook output
- no observed schema validation, body size cap, rate limit, audit log, or operator identity
- raw error object is logged in catch block
- creates a temp file and returns a downloadable workbook

Patch objective:

- P0 disable-first or guard-first.
- Export must not be reachable anonymously before benchmark upload dry-run work starts.

### 4.2 `/api/debug-env`

Current risks:

- debug endpoint returns env presence booleans
- production-only block can miss preview, staging, tunnel, or misconfigured runtime
- reveals deployment/config fingerprint even without secret values
- no internal/admin guard for non-production runtime

Patch objective:

- local-only by default or internal/admin-only in every non-local runtime.
- fail-closed response with no env presence payload unless explicitly allowed for local troubleshooting.

### 4.3 `/api/debug-data`

Current risks:

- debug endpoint returns internal aggregate counts and distributions
- triggers `ensureDataLoaded()`
- production-only block can miss preview/staging
- may expose objective/industry distribution and sample shape
- no audit/rate limit

Patch objective:

- local-only by default or internal/admin-only.
- never return raw rows; keep aggregate diagnostics redacted and reviewer/admin scoped.

### 4.4 `/api/py-retrain`

Current risks:

- internal key guard exists and is fail-closed, but route triggers high-impact downstream retrain
- forwards internal key to Python service
- no observed route-level rate limit, audit log, operator reason, or model artifact approval record
- Python retrain loads Supabase data and writes model artifacts
- retrain output includes model/sample metadata

Patch objective:

- preserve existing fail-closed guard.
- add rate limit, audit/operator log candidate, explicit production enablement policy, and sanitized response shape.

### 4.5 `/api/meta-sync`

Current risks:

- internal key guard exists and is fail-closed, but route triggers Meta API read and Supabase insert
- request body can override account/business target
- no observed dry-run default
- no observed account/business allowlist, date cap, rate limit, or durable audit log
- raw campaign-level Meta insights are transformed before insert
- response can include inserted/errors/accounts counts

Patch objective:

- disable-first for production sync.
- require dry-run by default before any DB write.
- require allowlisted target, bounded date range, rate limit, audit event, and sanitized response before enabling write mode.

### 4.6 External lookup/scrape routes

Targets:

- `/api/meta-ads`
- `/api/meta-ads-scrape`
- `/api/google-ads`

Current risks:

- external requests are reachable through GET routes
- in-memory rate limit is not durable across serverless instances
- Meta lookup uses server-side credentials but should never expose credential values
- scrape fallback can run Playwright/browser automation and remote chromium resolution
- output includes public advertiser/page/ad creative metadata
- logs/errors need consistent redaction

Patch objective:

- keep external lookup from becoming an upload/benchmark ingestion path.
- add stronger rate limit and stricter fallback guard.
- make scrape fallback local-only or admin-only.

### 4.7 Root DB/cache/debug scripts

Targets:

- `scripts/generate_excel.py`
- `scripts/upload_to_supabase.py`
- `scripts/rebuild_cache.py`
- `scripts/scrape_worker.js`
- `scripts/test_input.json`

Current risks:

- `upload_to_supabase.py` is a DB import script and must remain manual/local-only
- `rebuild_cache.py` reads a raw XLSX path and writes a JSON cache
- `generate_excel.py` is reachable indirectly through `/api/export`
- `scrape_worker.js` supports browser automation output
- `test_input.json` is an old local fixture, not a benchmark-safe fixture

Patch objective:

- do not delete or rewrite scripts in P0 unless needed to remove runtime exposure.
- document local-only status and prevent route wiring from using DB/cache scripts.

## 5. Patch Strategy

### 5.1 Disable-first Controls

High-risk routes should fail closed before adding richer behavior.

Recommended disable-first targets:

| Target | Disable behavior candidate | Reason |
| --- | --- | --- |
| `/api/export` | require internal/admin guard before any workbook generation | unauthenticated Python spawn/export |
| `/api/debug-env` | return 404 outside explicit local development or require internal key | env/config fingerprint |
| `/api/debug-data` | return 404 outside explicit local development or require internal key | internal aggregate diagnostics |
| `/api/meta-sync` | production write disabled unless explicit safe flag and admin key are present | DB write and Meta API sync |
| `/api/meta-ads-scrape` Playwright fallback | admin-only or local-only fallback | browser automation cost and scrape risk |

Disable-first must not introduce DB writes, Meta calls, or new upload behavior.

### 5.2 Internal/Admin Guard

Candidate shared helper direction:

- keep `requireInternalKey(req)` as the base fail-closed primitive
- add a stricter helper candidate such as `requireAdminOperation(req, operationName)`
- return generic `403` or `404` without leaking configuration detail
- never echo provided key/header values
- keep admin/operator identity separate from the secret value

Candidate guard classes:

| Guard | Candidate use | Notes |
| --- | --- | --- |
| `localOnlyOrInternal` | debug routes | local dev allowed, all other runtimes require internal/admin guard |
| `requireInternalKey` | retrain, export initial patch | existing helper can be reused |
| `requireAdminOperation` | meta-sync write, retrain, future upload approval | future helper with audit context |
| `blockProductionUnlessExplicitlyEnabled` | meta-sync write, scrape fallback | route-specific feature gate |

### 5.3 Fail-closed Responses

Fail-closed response policy:

- `404` for disabled debug routes
- `403` for missing or invalid internal key when route existence is acceptable
- `503` for configured operation disabled or internal access not configured
- generic client error text only
- sanitized server log only

Avoid:

- returning env presence booleans to non-local clients
- returning internal service URL, local path, raw exception string, or upstream error detail
- returning raw row samples or raw identifier values

### 5.4 Dry-run Only Mode

Dry-run mode should be mandatory before any new benchmark upload or Meta sync promotion path.

Candidate behavior:

| Surface | Dry-run policy |
| --- | --- |
| `/api/meta-sync` | default to no insert; report target/date/count estimate only if implementation supports safe preflight |
| future benchmark upload parser | local CLI dry-run first; no API route until guards/file caps/audit exist |
| root DB/cache scripts | no dry-run wrapper through runtime API in this patch |

Important distinction:

```text
Hardening patch may disable or guard sync.
Hardening patch should not implement new sync dry-run behavior unless separately approved.
```

### 5.5 Response Redaction

Candidate changes:

- use `sanitizeError()` consistently in route catch blocks
- remove raw `detail` values from client responses
- replace internal service setup hints in public API responses with generic messages
- redact request URLs, external API errors, and path-like strings from client-facing payloads
- keep logs useful but sanitized

### 5.6 Method Allowlist

Next route files already export specific method handlers, but patch tests should explicitly check:

- expected method works or fails for guard reasons
- unexpected methods do not invoke route work
- no route accepts GET when write/retrain/export requires POST
- future upload route accepts only the planned method

### 5.7 Audit Log Candidate

Do not implement a DB-backed audit table in the P0 patch without separate approval. Define an audit event shape first.

Candidate event fields:

```text
event_type
route_path
operation
actor_reference
request_id
runtime_environment
target_reference_masked
date_range
dry_run
result_status
result_count_bucket
error_category
created_at
```

Disallowed audit contents:

- secret values
- raw request headers
- raw campaign rows
- raw campaign/account/ad identifiers
- raw file path from user machine

Short-term P0 patch can use sanitized server logs as a stopgap, with a follow-up Gate for durable Agent Core audit integration.

### 5.8 Rate Limit Candidate

Current `checkRateLimit()` is in-memory only. P0 patch can use it for immediate route-level dampening, but durable rate limiting should be designed separately.

Candidate rate policy:

| Surface | Short-term limit candidate | Later durable policy |
| --- | --- | --- |
| `/api/export` | low per-IP and internal/admin only | operator-scoped distributed limit |
| `/api/py-retrain` | very low per-operator | admin workflow limit and approval record |
| `/api/meta-sync` | very low per-operator | account-scoped distributed limit |
| `/api/meta-ads` | keep existing, review thresholds | distributed external API quota protection |
| `/api/meta-ads-scrape` | keep strict limit, admin-only fallback | distributed browser runtime budget |
| future upload dry-run | file-size and request-count cap | reviewer-scoped queue/budget |

### 5.9 Local-only Script Candidates

Recommended script policy:

- keep `scripts/upload_to_supabase.py` local-only and never route-callable
- keep `scripts/rebuild_cache.py` out of benchmark Gates
- allow `scripts/generate_excel.py` only behind guarded `/api/export` or move to a local/report worker later
- keep `scripts/scrape_worker.js` local-only unless admin-gated fallback is explicitly approved
- replace `scripts/test_input.json` with sanitized synthetic fixtures only in a later test Gate

## 6. Patch Order

### Phase 0: Pre-patch Safety

1. Confirm working tree is clean or only intended patch files are changed.
2. Confirm no DB connection/import/export/migration command is needed.
3. Confirm no Meta API call is needed.
4. Record current route behavior from source only.
5. Decide exact routes included in the implementation Gate.

### Phase 1: P0 Disable/Guard Patch

Patch order:

1. Guard or disable `/api/export`.
2. Lock `/api/debug-env` and `/api/debug-data` to local-only or internal/admin-only.
3. Redact `/api/py-predict` client-facing setup/error details if included in the same implementation Gate.
4. Add explicit safe failure helpers if needed.

Rationale:

- closes unauthenticated export and debug leakage first
- low behavior expansion
- does not touch DB write paths

### Phase 2: P0/P1 High-impact Operation Patch

Patch order:

1. Add rate limit and audit-log candidate to `/api/py-retrain`.
2. Add stricter production disable/allowlist/date cap strategy to `/api/meta-sync`.
3. Keep Meta sync write mode disabled until a separate approved implementation can verify no unwanted insert.
4. Verify Python `/retrain` direct exposure policy, but do not change deployment/env without approval.

Rationale:

- high-impact operations already have a guard, so add operation controls after unauthenticated P0 surfaces are closed
- avoid accidental behavior change in sync/retrain while planning DB-safe checks

### Phase 3: External Lookup/Scrape Patch

Patch order:

1. Preserve external lookup behavior only if needed for current product screens.
2. Make Playwright scrape fallback admin-only or local-only.
3. Improve redaction and rate limit behavior.
4. Confirm external lookup outputs are not treated as benchmark source of truth.

### Phase 4: Benchmark Upload Blocker Review

Before `Foresight-Benchmark-6`:

1. `/api/export` is no longer anonymously reachable.
2. debug routes are local-only or guarded.
3. Meta sync is disabled or dry-run only by default.
4. retrain route has guard plus rate/audit policy.
5. raw identifier and secret-like scan boundaries are implemented for dry-run harness.
6. root DB/cache scripts are confirmed out of the upload path.

## 7. Implementation Candidate Files

### 7.1 Route Files

| File | Candidate patch |
| --- | --- |
| `app/api/export/route.ts` | add internal/admin guard, schema cap, sanitized error, possibly rate limit |
| `app/api/debug-env/route.ts` | replace production-only block with local-only or guarded access |
| `app/api/debug-data/route.ts` | replace production-only block with local-only or guarded access, reduce diagnostics if needed |
| `app/api/py-predict/route.ts` | remove client-facing internal setup detail and raw exception detail |
| `app/api/py-retrain/route.ts` | add rate limit and audit/log candidate around existing guard |
| `app/api/meta-sync/route.ts` | add production disable, body override restrictions, date cap, dry-run/write policy guard |
| `app/api/meta-ads/route.ts` | strengthen redaction/rate policy after P0 |
| `app/api/meta-ads-scrape/route.ts` | gate Playwright fallback and sanitize logs |
| `app/api/google-ads/route.ts` | review rate/redaction after P0 |

### 7.2 Shared Guard/Helper Candidates

| File | Candidate patch |
| --- | --- |
| `lib/security.ts` | add local-only guard, operation disable helper, safer client error helper |
| `lib/rateLimit.ts` | keep short-term in-memory limiter; document limitation in code comments only if implementing |
| `lib/audit.ts` or `lib/securityAudit.ts` | future sanitized audit event helper; no DB-backed audit in P0 without approval |
| `lib/requestLimits.ts` | future body size/schema guard helper for export/upload |

### 7.3 Python Candidates

| File | Candidate patch |
| --- | --- |
| `python/main.py` | verify `/retrain` guard remains fail-closed; optionally guard `/model-info` if service is public |
| `python/model.py` | no P0 patch planned unless retrain artifact policy requires it |
| `python/data_loader.py` | no P0 patch planned; do not change DB loading behavior in hardening patch without approval |

### 7.4 Script Candidates

| File | Candidate patch |
| --- | --- |
| `scripts/generate_excel.py` | no direct patch unless export schema requires input hardening |
| `scripts/upload_to_supabase.py` | mark local-only or move out of runtime docs later; do not run |
| `scripts/rebuild_cache.py` | mark legacy/local-only later; do not run |
| `scripts/scrape_worker.js` | no direct patch unless scrape fallback is retained |
| `scripts/test_input.json` | do not use for benchmark fixture; future synthetic fixture replacement only |

### 7.5 Docs Update Candidates

| File | Candidate update |
| --- | --- |
| `README.md` | update after implementation to document protected debug/export/sync behavior |
| `AGENTS.md` | update only if operating rules change |
| `docs/strategy/AdMate_Foresight_Security_Surface_Review_v1.md` | keep as historical review; do not rewrite unless follow-up finding requires |
| `docs/strategy/AdMate_Foresight_Benchmark_Dry_Run_Harness_Design_v1.md` | update only if upload blocker policy changes |

## 8. Verification Plan

No verification in this Gate should call DB, Meta API, or Python retrain. The following is the implementation Gate verification plan.

### 8.1 Static Checks

Commands:

```powershell
npm run lint
npm run build
```

Expected:

- TypeScript route changes compile.
- Lint does not introduce unsafe unused helpers or accidental client imports.

If missing env causes build/runtime warnings, report without printing values.

### 8.2 Route-level No-auth Smoke

No-auth smoke should verify fail-closed behavior only.

Candidate checks:

| Route | No-auth expected result after patch |
| --- | --- |
| `/api/export` | 403, 404, or 503 before Python spawn |
| `/api/debug-env` | 404 outside explicit local allowed context |
| `/api/debug-data` | 404 outside explicit local allowed context |
| `/api/py-retrain` | 403 or 503 before Python proxy call |
| `/api/meta-sync` | 403, 404, or 503 before Meta call/DB write |
| `/api/meta-ads-scrape` fallback | public request cannot trigger Playwright fallback in production-like mode |

Smoke tests must not include valid internal keys, must not call Meta API, and must not call DB import/export.

### 8.3 Secret Redaction Check

Candidate checks:

- route catch blocks return generic messages
- client responses do not include internal service URL, local filesystem path, raw stack, request URL with credential, or token-like value
- logs use `sanitizeError()` where practical
- docs/tests include only env variable names, not values

### 8.4 Dry-run Mode Check

Candidate checks:

- `/api/meta-sync` cannot write by default in production-like config
- future benchmark dry-run can generate report without DB write, model training, Meta call, LLM forwarding, or raw file persistence
- dry-run report contains category-level findings, not raw secret-like values or raw campaign rows

### 8.5 No DB Write Check

Candidate checks:

- no implementation test should call `syncMetaToSupabase()` with write behavior
- no script should run `upload_to_supabase.py`
- no script should run `rebuild_cache.py`
- no Python `/retrain` request should be made with valid internal credentials
- source review confirms write paths are behind disabled/guarded branches

### 8.6 Git Safety Checks

Before commit in implementation Gate:

```powershell
git status --short
git diff --stat
git diff --check
git diff --cached --check
```

Additional checks:

- staged files are only approved files
- no `.env*` files staged
- no raw Excel/CSV/cache/model artifact staged
- secret pattern scan passes

## 9. Rollback Plan

### 9.1 Route Disable Rollback

If a disable-first patch blocks a required internal workflow:

1. Revert only the specific route guard commit.
2. Keep any redaction improvements if they are independent and safe.
3. Re-run route-level no-auth smoke.
4. Do not replace a disabled high-risk route with anonymous access.

### 9.2 Guard Rollback

If a guard helper causes false positives:

1. Revert the helper call at the affected route.
2. Keep route-specific fail-closed behavior until a corrected guard lands.
3. Avoid broad rollback of all routes unless shared helper is the root cause.

### 9.3 Env Requirement Rollback Caution

Do not roll back by weakening env/guard requirements in production.

Avoid:

- adding fallback anonymous access
- accepting missing internal key as success
- exposing debug output when a key is misconfigured
- enabling Meta sync write mode by default
- allowing Python retrain without internal/admin guard

Preferred rollback:

- revert to disabled route
- preserve generic error response
- document operator workaround if a local manual process is needed

### 9.4 Data and Artifact Rollback

The planned P0 patch should not create DB writes, exports, imports, migrations, raw files, cache files, or model artifacts. If any implementation accidentally creates such output, stop and report before cleanup; do not run destructive cleanup commands without an explicit approved path.

## 10. Benchmark Upload Blocker Statement

`Foresight-Benchmark-6 dry-run harness implementation` should remain blocked until:

1. `/api/export` is guarded or disabled for anonymous clients.
2. `/api/debug-env` and `/api/debug-data` are local-only or internal/admin-only.
3. `/api/meta-sync` cannot write to DB by default and cannot override target account/business without approval.
4. `/api/py-retrain` remains guarded and has rate/audit policy.
5. external scrape fallback cannot be triggered anonymously in production-like runtime.
6. root DB/cache scripts are confirmed local-only and not part of benchmark upload flow.
7. future upload parser has file size, method, redaction, privacy scan, and no-raw-LLM constraints.

## 11. Next Gate Proposals

### Foresight-Security-3: P0 Export/Debug Route Hardening Implementation

Scope candidate:

- guard or disable `/api/export`
- lock `/api/debug-env` and `/api/debug-data`
- redact `/api/py-predict` client-facing details if included
- add smoke checks for no-auth fail-closed behavior
- no DB write/import/export/migration
- no Meta API call

### Foresight-Benchmark-6: Dry-run Harness Implementation

Scope candidate:

- implement local CLI dry-run harness first
- no API upload route until Security-3 blockers are closed
- no DB write/import/export
- no Meta API call
- no raw campaign row LLM forwarding

### Foresight-DB-2: Legacy DB Live Read-only Inventory Retry

Scope candidate:

- retry metadata-only live inventory with a valid read-only path
- inspect schema/table/column/RLS/index/function/storage/auth metadata
- count rows without raw row output
- no import/export/migration

## 12. Final Recommendation

Security-2 recommends the following implementation order:

```text
1. Implement P0 export/debug fail-closed patch first.
2. Then harden retrain/meta-sync operation controls without enabling new behavior.
3. Then tighten external lookup/scrape fallback and public aggregate surfaces.
4. Keep benchmark upload dry-run local-only until those blockers are closed.
```
