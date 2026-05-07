# AdMate Foresight Benchmark Schema Draft Review v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-11 schema draft SQL preparation

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 Foresight normalized benchmark schema proposal과 readiness review를 바탕으로 작성한 review용 SQL draft, rollback draft, 그리고 후속 검토 기준을 정리한다.

이번 Gate는 review artifact 작성만 수행한다. DB 연결, SQL 실행, migration 적용, production env 변경, 코드/API 수정, raw Excel/CSV/model artifact 추가, Meta API 호출, Python retrain은 수행하지 않는다.

작성 파일:

- `docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql`
- `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql`
- `docs/strategy/AdMate_Foresight_Benchmark_Schema_Draft_Review_v1.md`

핵심 판정:

```text
The draft is ready for review.
The draft is not ready for execution.
The draft is not a migration.
```

## 2. Draft Scope

### 2.1 Included

- proposal namespace candidate: `foresight`
- five candidate tables
- candidate check constraints
- candidate indexes
- candidate RLS enable statements
- soft UUID actor reference notes
- raw data exclusion notes
- rollback draft in reverse dependency order
- production and preflight blocker comments

### 2.2 Not Included

- executable migration file
- DB connection or schema application
- seed data
- raw campaign data storage
- raw upload file content storage
- raw campaign/account/ad identifier columns
- RLS policy bodies
- auth provider binding
- report-safe serving view
- API route implementation
- production env changes

## 3. Generated Table Summary

| Table | Purpose | Draft readiness | Execution readiness |
| --- | --- | --- | --- |
| `foresight.benchmark_uploads` | sanitized upload metadata and source fingerprint | ready for review | blocked by retention/RLS |
| `foresight.benchmark_dry_run_reports` | sanitized dry-run report evidence | ready for review | blocked by redaction tests/report retention |
| `foresight.benchmark_review_events` | audit/operator event linkage | ready for review | blocked by Agent Core actor policy |
| `foresight.normalized_benchmark_rows` | approved aggregate canonical benchmark rows | ready for review | blocked by grain/Data Core/RLS decisions |
| `foresight.benchmark_dataset_versions` | dataset release and rollback metadata | ready for review | blocked by activation ownership/version scope |

## 4. Constraint Summary

The SQL draft uses check constraint candidates instead of database enum types. This keeps the draft reviewable while status ownership remains unresolved.

Constraint families:

- source type: `dashboard_export`, `meta_api_export`
- platform: `meta`
- upload file type: `csv`, `xlsx`, `xls`, `inline_mock`, `future`
- raw retention policy
- upload status
- dataset version status
- dry-run validation and approval status
- dry-run window policy
- review event type and actor role
- review decision
- normalized row date order
- normalized period granularity
- normalized Net/Gross and markup policy
- nonnegative metric values
- benchmark window: `recent_6m`, `long_term`
- reviewer status
- privacy boundary and identifier policy

Notable design choice:

- `raw_file_storage_ref` exists only as a disabled candidate and is constrained to null in the draft.
- normalized rows intentionally exclude raw campaign/account/ad identifiers.
- `net_or_gross` excludes unknown in normalized rows because unknown basis should not become default benchmark fact.

## 5. Index Summary

Index candidates cover:

- upload source fingerprint
- upload status and upload time
- uploader actor reference
- dataset version status and benchmark window
- one active dataset per draft `dataset_scope`
- dry-run report upload/version lookup
- dry-run validation/approval lookup
- review event upload/report/dataset linkage
- review event trace id and actor lookup
- normalized benchmark dataset/version lookup
- normalized source upload/report/fingerprint lookup
- normalized core benchmark dimensions
- normalized date window
- normalized breakdown signature
- report-safe normalized row lookup

The one-active-dataset index is a proposal only. Final version scope must be reviewed before any migration.

## 6. RLS Summary

The SQL draft includes:

```text
ALTER TABLE ... ENABLE ROW LEVEL SECURITY
```

It does not create RLS policies.

Reason:

- actor source of truth is unresolved.
- reviewer assignment model is unresolved.
- ordinary user report-safe serving path is unresolved.
- service role/internal actor boundary must align with Security and Agent Core.

Required future policy groups:

- uploader own sanitized upload status only
- reviewer assigned sanitized reports and review events
- admin/data steward taxonomy, retention, and version activation controls
- internal actor guarded dry-run/report generation and future controlled promotion
- ordinary user no direct access to upload/report/review tables

## 7. FK and Actor Reference Summary

The draft uses relational references between proposed benchmark tables:

- dry-run report to upload
- review event to upload/report/dataset version
- normalized row to dataset version/upload/report

Actor fields use soft UUID references:

- `uploaded_by`
- `generated_by`
- `actor_id`
- `approved_by`
- `activated_by`
- `created_by`
- `reviewed_by`

The draft intentionally does not use direct `auth.users` foreign keys. This remains blocked until Agent Core/auth/reviewer role ownership is decided.

## 8. Raw Data and Privacy Summary

The draft preserves the Benchmark-3 through Benchmark-10 privacy boundary:

- no raw file content column
- no raw campaign row table
- no raw account id/name field
- no raw campaign id/name field
- no raw ad/adset id/name field
- no raw advertiser/client/brand name field
- no raw provider response field
- no token/session/credential field
- no ordinary user direct access path

Allowed lineage fields are sanitized:

- `source_fingerprint`
- `input_fingerprint`
- `breakdown_signature`
- `identifier_policy`
- `privacy_boundary_status`
- sanitized JSON report/audit payloads

## 9. Rollback Draft Summary

Rollback draft file:

- `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql`

It contains reverse-order table removal candidates only. It is review-only and is not approved for production use.

Before any rollback rehearsal:

- confirm row counts.
- confirm backup/export availability.
- confirm affected dataset versions.
- confirm audit event ownership.
- confirm RLS policy impact.
- confirm the environment is non-production unless a later Gate explicitly approves otherwise.

## 10. Remaining Blockers

The following remain blockers before production migration:

| Blocker | Why it matters |
| --- | --- |
| AdMate Data Core target schema decision | table namespace and ownership may change |
| non-production dry-run environment | schema cannot be safely tested yet |
| backup/export plan | rollback cannot be trusted without recovery evidence |
| reviewer role source | RLS and self-approval prevention cannot be implemented |
| migration rollback strategy | failed migration could leave partial state |
| status enum/check seed ownership | status extension and compatibility are unresolved |
| raw retention policy | raw storage ref must remain disabled |
| hash/fingerprint policy | source/identifier lineage needs owner and scope |
| report-safe serving view/API | ordinary user access boundary is not designed |
| metric precision/scale | deterministic metrics need numeric standard |
| confidence thresholds | sample sufficiency is still policy-defined |

## 11. Production Migration Prerequisites

Before any production migration, require:

1. Data Core approves target schema and table ownership.
2. Security approves RLS policy model.
3. Agent Core or auth owner approves actor reference model.
4. Data steward approves canonical objective/optimization_goal taxonomy.
5. Retention owner approves raw file handling and storage ref policy.
6. Non-production dry-run migration completes with synthetic/sanitized data only.
7. Backup/export and rollback rehearsal complete.
8. Route/API implementation plan confirms no raw data exposure.
9. LLM/report-safe field list is finalized.
10. Migration verification commands and acceptance criteria are written.

## 12. Non-production Dry-run Need

The next migration-oriented Gate should use non-production only.

Required dry-run checks:

- create schema draft in non-production only after approval.
- verify RLS default-deny behavior.
- verify ordinary users cannot read upload/report/review tables.
- verify mock/smoke source types cannot become active benchmark rows.
- verify `raw_file_storage_ref` remains unavailable until policy changes.
- verify normalized rows cannot store unknown Net/Gross basis.
- verify long-term rows cannot appear in default recent benchmark query.
- verify rollback rehearsal can remove proposed objects after backup/export.

No production DB should be touched by this Gate.

## 13. Rollback Rehearsal Criteria

Rollback rehearsal should be considered acceptable only when:

- it runs in non-production.
- row count and backup/export checks are recorded before rollback.
- dependency order succeeds.
- no raw artifacts are created.
- no active production dataset is affected.
- RLS and index removal impact is understood.
- post-rollback schema inventory confirms proposed objects are absent.
- recovery path from backup/export is documented.

## 14. Review Questions

1. Should `foresight` remain the namespace, or should Data Core own the schema?
2. Are check constraints enough for draft, or should status lookup tables be preferred?
3. Should `benchmark_dry_run_reports` store JSON report payloads or split into child tables?
4. Should `raw_file_storage_ref` be omitted entirely until retention policy exists?
5. What is the approved numeric precision for spend, CPM, CPC, CTR, and frequency?
6. Should normalized row `ctr` always be ratio, or should percent value be stored separately?
7. Should long-term trend rows share the normalized row table?
8. What is the one-active-dataset scope?
9. Which service owns actor references and reviewer assignments?
10. What report-safe view will ordinary users use later?

## 15. Follow-up Gates

### Foresight-Benchmark-12: Nonprod Dry-run Migration Plan

Scope candidate:

- define non-production migration rehearsal.
- include backup/export, rollback, RLS tests, synthetic-only verification, and no production execution.

### Foresight-Benchmark-13: Dry-run Report API Implementation Plan

Scope candidate:

- plan guarded dry-run/report API after schema/report storage review.
- include auth, audit, rate limit, no-store response, request size limit, and redaction.

### Foresight-Security-6: Audit and Rate-limit Implementation Plan

Scope candidate:

- align benchmark upload/dry-run/review events with operation audit and rate-limit controls.
- keep raw rows and provider responses out of logs.

## 16. Final Recommendation

Benchmark-11 recommends:

```text
1. Treat the SQL files as review artifacts only.
2. Review table responsibilities, checks, indexes, RLS enable candidates,
   and rollback order with Data Core and Security.
3. Keep all DB execution blocked until non-production migration planning,
   RLS actor source, retention policy, backup/export, and rollback rehearsal
   are approved.
```
