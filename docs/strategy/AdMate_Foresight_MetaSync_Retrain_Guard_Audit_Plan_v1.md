# AdMate Foresight Meta Sync and Retrain Guard Audit Plan v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Security-4 meta-sync and py-retrain guard/audit plan

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 AdMate Foresight의 `/api/meta-sync`와 `/api/py-retrain` 계열 route를 실제 수정하기 전에 operation guard, audit/operator logging, rate limit, dry-run, rollback 정책으로 정리한다.

이번 Gate는 문서화만 수행한다. 코드, API route, DB schema, env, import/export, migration, Meta API 호출, Python retrain 실행은 변경하거나 수행하지 않는다.

핵심 원칙:

```text
High-impact operations must be explicit, audited, rate-limited, and dry-run first.
Meta sync must not write by default.
Retrain must not run from unreviewed or unaudited data.
```

## 2. Scope and Non-scope

### 2.1 Scope

- `/api/meta-sync` route inventory and operation risk
- `/api/py-retrain` route inventory and operation risk
- linked helper/function/Python path inventory
- required guard model
- audit/operator logging model
- rate limit, kill-switch, rollback policy
- implementation order for a later implementation Gate
- benchmark dry-run harness relationship

### 2.2 Non-scope

- code/API/DB/schema/env 수정
- DB connection, import, export, migration 실행
- Meta API direct pull 또는 sync 호출
- Python `/retrain` 실행
- token/env/secret 값 열람 또는 출력
- raw Excel/CSV/model artifact 추가
- commit, push, PR 생성

## 3. Route Inventory

Static source review 기준이며 실제 route 호출, DB 연결, Meta API 호출, Python retrain 실행은 수행하지 않았다.

| Route | Method | Purpose | Current guard | Linked helper/function/script path |
| --- | --- | --- | --- | --- |
| `/api/meta-sync` | `POST` | Meta Marketing API insights를 legacy `ad_data` shape로 변환하고 Supabase에 insert | `requireInternalKey(req)` fail-closed. Missing configured key returns 503, invalid/missing header returns 403 | `app/api/meta-sync/route.ts`, `lib/security.ts`, `lib/metaSync.ts`, `@supabase/supabase-js` dynamic import |
| `/api/py-retrain` | `POST` | Next.js에서 Python FastAPI `/retrain`으로 model retrain proxy 호출 | `requireInternalKey(req)` fail-closed, configured internal key forwarded to Python | `app/api/py-retrain/route.ts`, `lib/security.ts`, `python/main.py`, `python/data_loader.py`, `python/model.py` |
| Python `/retrain` | `POST` | Supabase aggregate data load, model train, model artifact write, model reload | `_require_internal_key()` fail-closed in `python/main.py` | `python/main.py`, `python/data_loader.py`, `python/model.py` |

Related helper behavior:

| Helper | Current behavior | Planning implication |
| --- | --- | --- |
| `requireInternalKey(req)` | requires one configured internal key name and timing-safe header match | Keep as baseline, add operation-level guard around it later |
| `getConfiguredInternalKey()` | finds configured internal key value for forwarding | Never log result or derived value |
| `sanitizeError()` | redacts common credential-like text in error strings | Use consistently in any later route logs and client-safe errors |
| `maskIdentifier()` | masks account/business identifiers for logs | Keep identifier masking, but do not treat masking as full audit policy |

## 4. Current Operation Flow

### 4.1 `/api/meta-sync`

Current source-level flow:

```text
POST /api/meta-sync
→ requireInternalKey(req)
→ read server-side Meta and target configuration
→ parse optional body date/target overrides
→ syncMetaToSupabase()
→ fetch Meta ad accounts or insights
→ transform campaign-level rows
→ insert rows into Supabase ad_data
→ return inserted/accounts/errors counts
```

Current high-impact behavior:

- external Meta API call
- campaign-level data transformation
- Supabase insert into legacy table
- body-level target override
- potentially long-running account pagination
- result and error count response

### 4.2 `/api/py-retrain`

Current source-level flow:

```text
POST /api/py-retrain
→ requireInternalKey(req)
→ read Python API base configuration
→ forward configured internal key to Python /retrain
→ Python /retrain requires internal key
→ Python loads Supabase aggregate rows
→ model.train(df)
→ write model artifact and metadata
→ reload model in memory
→ return model metrics and sample count
```

Current high-impact behavior:

- proxy to internal ML service
- Supabase aggregate read inside Python
- model artifact mutation
- model metadata mutation
- long-running task up to current route timeout
- output includes model quality/sample metadata

## 5. Operation Risk

### 5.1 DB Write Risk

`/api/meta-sync` currently reaches a Supabase insert path through `syncMetaToSupabase()`.

Risk details:

- repeated execution can duplicate or pollute `ad_data`
- wrong account/business override can insert unexpected account data
- broad date range can mix recent benchmark and long-term trend data
- service role key fallback can widen write power if configured
- no current row lineage or reversible batch id is visible at route level

Required policy:

- production write disabled by default
- explicit dry-run mode first
- write mode only with admin approval, target allowlist, date cap, audit event, and rollback reference

### 5.2 External Meta API Call Risk

`/api/meta-sync` can call Meta account and insights endpoints.

Risk details:

- external quota/rate cost
- large pagination
- provider error or partial failure
- token scope overreach
- provider response containing details that must not be logged raw

Required policy:

- operation type allowlist
- target account/business allowlist
- date preset/date range allowlist
- provider error category logging only
- no raw provider response in client response or audit event

### 5.3 Rate Limit and Cost Risk

Both routes are high-cost compared with normal read APIs.

Risk details:

- `/api/meta-sync` can perform many external requests and DB writes
- `/api/py-retrain` can run long CPU/memory work and write artifacts
- current in-memory rate limiter is not applied to these routes
- serverless/multi-instance rate limits need durable backing later

Required policy:

- per-actor daily cap
- per-operation cooldown
- global emergency cap
- operator reason required
- reject repeated runs with same input fingerprint unless explicitly approved

### 5.4 Token Scope and Secret Handling Risk

The routes use server-side credentials and internal keys by name, but values must never be output.

Risk details:

- `meta-sync` uses server-side Meta token and target identifiers
- `py-retrain` forwards internal key to Python
- error logs can accidentally include provider URLs or exception detail

Required policy:

- never log token value, internal key value, provider request URL, raw auth header, or raw response
- audit should record credential family only as configuration status/category, not values
- client response must stay generic

### 5.5 Model Artifact Mutation Risk

Python retrain writes model and metadata artifacts.

Risk details:

- retrain can replace a working model with lower-quality model
- artifact write can fail halfway
- metadata can drift from artifact
- startup auto-train can implicitly mutate model when no artifact exists

Required policy:

- artifact backup or versioned model directory before approved execution
- minimum quality gate before promotion
- rollback path to previous artifact
- no retrain from unreviewed upload or raw campaign rows

### 5.6 Stale or Poisoned Training Data Risk

Python retrain loads aggregate rows from Supabase RPC outputs.

Risk details:

- stale aggregate source can train outdated model
- polluted `ad_data` can poison training
- recent benchmark and long-term trend mixing can change model behavior
- sample imbalance by objective/industry can degrade predictions

Required policy:

- training data as-of date and source fingerprint required
- minimum sample and freshness checks
- exclude unapproved upload batches from retrain
- require reviewer-approved normalized benchmark dataset policy before upload-derived retrain

### 5.7 Unaudited Execution Risk

Current high-impact routes log basic console messages but do not persist an operation audit trail.

Risk details:

- cannot identify actor/reason from durable audit
- cannot prove dry-run vs write mode after the fact
- cannot correlate execution to inserted rows or model artifact

Required policy:

- durable audit model before write/retrain enablement
- trace id returned and logged for every request
- rejected requests audited without secrets
- execution completion and failure states recorded

### 5.8 Long-running Task Failure Risk

Both operations can run longer than normal request/response flows.

Risk details:

- timeout after partial Meta fetch or partial insert
- Python retrain timeout after model artifact write
- process crash without completion event
- client retry can duplicate work

Required policy:

- idempotency key or input fingerprint
- explicit status transitions
- retry policy only after audit review
- future background worker only with durable job/audit model

## 6. Required Guard Model

### 6.1 Guard Summary

| Requirement | `/api/meta-sync` | `/api/py-retrain` |
| --- | --- | --- |
| admin/internal-only | Required | Required |
| `dryRun=true` default | Required before any Meta fetch/write implementation change | Required as metadata-only or blocked no-op preview before actual retrain |
| production write disabled by default | Required | Required for artifact mutation |
| operation type allowlist | Required: dry-run, validate-target, execute-write | Required: dry-run, validate-source, execute-retrain |
| request size limit | Required | Required |
| method allowlist | `POST` only | `POST` only |
| no-store response | Required | Required |
| secret/env redaction | Required | Required |
| fail-closed missing authority | Required | Required |

### 6.2 Authority Model

Minimum future authority check:

```text
1. Route exists but high-impact operation starts disabled.
2. Request must pass internal/admin guard.
3. Request must include operation type and reason.
4. Operation type must be allowed for current runtime.
5. Write/retrain execution must require explicit approval state.
6. Missing or ambiguous authority returns fail-closed response before side effects.
```

Do not use missing configuration as implicit allow.

### 6.3 Dry-run Default

Dry-run should be the default request mode.

Meta sync dry-run candidate:

- validate target selection without allowing arbitrary override
- validate date range and operation type
- estimate planned account/date window if safely possible
- do not call Meta API unless a later Gate explicitly allows safe metadata-only preflight
- do not insert DB rows
- do not return raw row samples

Retrain dry-run candidate:

- validate retrain request shape
- validate current model metadata availability if local read is safe
- report intended operation category
- do not call Python `/retrain`
- do not load Supabase
- do not write model artifacts

### 6.4 Production Write Disable

Candidate kill-switch names for a later implementation may include env variable names only, never values.

Candidate toggles:

| Toggle candidate | Purpose |
| --- | --- |
| `FORESIGHT_META_SYNC_ENABLED` | allows meta-sync route handling beyond fail-closed dry-run |
| `FORESIGHT_META_SYNC_WRITE_ENABLED` | allows actual Supabase insert path |
| `FORESIGHT_RETRAIN_ENABLED` | allows retrain route handling beyond fail-closed dry-run |
| `FORESIGHT_RETRAIN_EXECUTE_ENABLED` | allows actual Python retrain proxy call |

Default should be disabled when unset.

### 6.5 Request Limits

Request body policy:

- content type must be JSON
- maximum body size should be small for operation command payloads
- unknown fields should be rejected or ignored with audit note
- date range must be bounded
- business/account override must be blocked unless allowlisted
- reason is required for any non-dry-run operation

### 6.6 Response Policy

Response requirements:

- `Cache-Control: no-store`
- generic `error` messages
- trace id included when available
- no token/env/provider response
- no raw campaign rows
- no raw DB rows
- no raw account/business/campaign/ad identifiers
- counts only in buckets or sanitized numeric summaries

## 7. Audit and Operator Logging Model

### 7.1 Event Types

Required event lifecycle:

| Event type | Meaning |
| --- | --- |
| `requested` | request received and assigned trace id |
| `rejected` | request failed guard, policy, rate, shape, runtime, or allowlist checks |
| `dry_run_completed` | dry-run finished without side effects |
| `execution_started` | approved side-effecting operation began |
| `execution_completed` | side-effecting operation completed |
| `execution_failed` | side-effecting operation failed or timed out |

### 7.2 Audit Fields

Candidate fields:

```text
trace_id
route_path
operation_type
mode
actor_reference
operator_reason
runtime_environment
request_time
input_fingerprint
target_reference_masked
date_range_policy
rate_limit_bucket
approval_reference
result_status
row_count_bucket
account_count_bucket
model_artifact_reference
error_category
duration_bucket
```

Allowed values:

- actor reference, not secret
- reason text after redaction
- input fingerprint/hash, not raw request body
- masked target reference
- row count only, not raw rows
- model artifact reference/version, not file contents

Never log:

- token value
- internal key value
- raw auth header
- provider request URL containing credentials
- raw provider response
- raw DB row
- raw campaign-level data
- raw advertiser/account/campaign/ad identifiers
- raw Excel/CSV/model artifact content

### 7.3 Rejected Request Audit

Rejected requests should be auditable because repeated rejected attempts can signal abuse or misconfiguration.

Reject categories:

- `missing_authority`
- `operation_disabled`
- `invalid_operation_type`
- `rate_limited`
- `invalid_request_shape`
- `target_not_allowlisted`
- `date_range_not_allowed`
- `dry_run_required`
- `runtime_not_allowed`
- `provider_unavailable`

Do not include rejected secret/header values.

### 7.4 Temporary Logging vs Durable Audit

Short-term implementation can use sanitized server logs only for dry-run smoke, but side-effecting write/retrain execution should wait for durable audit storage or Agent Core audit integration.

If durable audit is not ready:

```text
Allowed: dry-run validation.
Not allowed: production write/retrain execution.
```

## 8. Rate Limit, Rollback, and Kill-switch

### 8.1 Rate Limit Candidates

Initial policy candidates:

| Operation | Per-actor candidate | Global candidate | Notes |
| --- | --- | --- | --- |
| `meta_sync_dry_run` | 10/day | 100/day | no external call by default |
| `meta_sync_execute` | 1/day | 3/day | requires approval and kill-switch enabled |
| `retrain_dry_run` | 10/day | 100/day | no Python retrain call |
| `retrain_execute` | 1/day | 2/day | requires approval, model backup, and quality gate |

Cooldown candidates:

- meta sync execute: 6 hours per target reference
- retrain execute: 12-24 hours per model family
- repeated same input fingerprint: reject unless override approved

### 8.2 Kill-switch

Kill-switch policy:

- default disabled when unset
- route checks kill-switch before side effects
- emergency disable should happen before any Meta call, DB insert, or Python retrain proxy call
- disabled operation should return generic fail-closed response
- disabled attempts should be audited as `rejected`

Candidate kill-switch layers:

1. route-level operation disabled
2. write/retrain execution disabled
3. target allowlist disabled
4. provider/API call disabled
5. artifact promotion disabled

### 8.3 Emergency Disable-first Rollback

Emergency rollback for either route:

1. Disable operation with kill-switch or route-level fail-closed patch.
2. Stop new side effects first.
3. Preserve logs/audit records.
4. Identify trace id and input fingerprint of last successful execution.
5. Decide whether data/artifact rollback is required.

Do not roll back by weakening guards or enabling anonymous execution.

### 8.4 Model Artifact Rollback

Retrain execution must define artifact rollback before execution is enabled.

Candidate artifact policy:

- save previous model artifact reference before retrain
- save previous metadata reference before retrain
- write new artifact to staging path first
- promote only after quality checks pass
- retain previous artifact for rollback window
- audit artifact reference and quality summary

Rollback triggers:

- model quality below threshold
- training data source rejected after execution
- artifact load failure
- prediction smoke failure
- manual operator rollback request

### 8.5 DB Written Rows Rollback

Meta sync execution must define row rollback before write mode is enabled.

Candidate data policy:

- every write execution receives `sync_batch_id`
- rows include source fingerprint, operation trace id, date range, and target reference hash
- no partial batch becomes benchmark-approved automatically
- written rows remain quarantine/staging until reviewer approval
- rollback deletes or marks rows by `sync_batch_id`, not by ad hoc date/account filters

Rollback triggers:

- wrong target account/business
- wrong date range
- provider partial failure
- duplicate batch
- raw campaign identifier policy violation
- reviewer rejection

If current legacy table cannot support batch rollback safely, write mode must remain disabled.

## 9. Implementation Order

### Phase 1: Dry-run Only Guard

First implementation Gate should:

- add operation type parsing
- require internal/admin guard
- default to dry-run
- add kill-switch check
- add no-store generic responses
- block write/retrain execution by default
- add request shape and size limits
- add no-auth smoke tests

Expected result:

```text
No Meta API call.
No DB write.
No Python retrain call.
No model artifact mutation.
```

### Phase 2: Audit-only Smoke

Second implementation Gate should:

- add sanitized audit event helper
- produce `requested`, `rejected`, and `dry_run_completed`
- use synthetic request payloads only
- verify no secret/raw data in audit output
- keep side-effect execution disabled

Expected result:

```text
Audit path works for dry-run and rejected operations.
Side-effect operations still blocked.
```

### Phase 3: Admin-approved Execution

Only after dry-run and audit are verified:

- allow admin-approved execution in a controlled environment
- require explicit kill-switch enablement
- require target/date/model source allowlist
- require rollback reference
- require quality/data checks
- require durable audit

Meta sync execution must write only to an approved staging/quarantine path unless rollback-safe legacy write is confirmed.

Retrain execution must stage artifacts and pass quality gates before promotion.

### Phase 4: Scheduled Automation, If Ever

Scheduled automation is not part of MVP.

If ever considered:

- Agent Core-owned schedule
- durable audit and approval model
- rate/cost budget
- kill-switch
- dry-run preview before execution
- no automatic retrain from unreviewed uploads
- no background cron without operator visibility

### Benchmark Dry-run Harness Relationship

`Foresight-Benchmark-6` should remain local/CLI-first and independent of Meta sync/retrain execution.

Relationship rules:

- benchmark dry-run may validate upload structure
- benchmark dry-run must not trigger `/api/meta-sync`
- benchmark dry-run must not trigger `/api/py-retrain`
- accepted dry-run output does not imply DB write
- approved normalized benchmark data must be separate from raw Meta sync rows
- retrain from upload-derived data requires another approval Gate

## 10. Do-not-do List

The following must remain prohibited:

- no automatic Meta sync on page load
- no automatic Meta sync from dashboard view open
- no retrain from unreviewed upload
- no retrain from raw campaign-level rows
- no raw campaign-level data to LLM
- no token, provider request, provider response, or auth header in logs
- no raw DB rows in audit events
- no background cron without audit
- no write mode when kill-switch is unset
- no target account/business override without allowlist
- no broad date range without reviewer approval
- no model artifact overwrite without rollback reference
- no DB written rows without batch rollback policy

## 11. Verification Plan for Future Implementation

No implementation verification in this Gate should call DB, Meta, or Python retrain. For a later implementation Gate:

### Static checks

```powershell
npx tsc --noEmit
npm run build
```

`npm run lint` remains useful but current repo has unrelated lint baseline issues documented in earlier Gates.

### No-auth smoke

Expected no-auth behavior:

- `/api/meta-sync` rejects before Meta API call or DB write
- `/api/py-retrain` rejects before Python proxy call
- responses contain no secret/env/raw-data patterns
- responses include no-store header when implemented

### Dry-run smoke

Expected dry-run behavior with authorized test stub:

- no Meta API call
- no DB insert
- no Python `/retrain` call
- no model artifact write
- audit event contains trace id, operation type, actor reference, input fingerprint, and status only

### Side-effect guard review

Source review must confirm:

- `syncMetaToSupabase()` is unreachable unless write mode is explicitly approved
- Python `/retrain` proxy is unreachable unless execute mode is explicitly approved
- operation disabled branch occurs before provider or DB client creation
- secret and raw row values are not serialized

## 12. Follow-up Gates

### Foresight-Security-5: Meta-sync/Py-retrain Dry-run Guard Implementation

Scope candidate:

- add dry-run default guard for `/api/meta-sync` and `/api/py-retrain`
- add operation type allowlist
- add fail-closed kill-switch checks
- add no-store generic responses
- no DB write
- no Meta API call
- no Python retrain execution

### Foresight-Benchmark-6: Dry-run Harness Implementation

Scope candidate:

- implement local CLI dry-run harness
- validate upload file structure without DB write/import/export
- no Meta API call
- no LLM raw row forwarding
- no automatic retrain

### Foresight-Lint-1: Existing Lint Baseline Cleanup Plan

Scope candidate:

- document and clean unrelated lint baseline in `app/competitor/page.tsx`, `app/insights/page.tsx`, `app/trends/page.tsx`, and `scripts/scrape_worker.js`
- keep separate from security route behavior changes
- no DB/Meta/retrain work

## 13. Final Recommendation

Security-4 recommends this sequence:

```text
1. Implement dry-run-only operation guards first.
2. Add sanitized audit for requested/rejected/dry_run_completed.
3. Keep execute mode disabled until rollback-safe DB/model policies exist.
4. Do not connect benchmark upload dry-run to sync or retrain.
5. Treat scheduled automation as a future Agent Core-owned workflow, not MVP behavior.
```
