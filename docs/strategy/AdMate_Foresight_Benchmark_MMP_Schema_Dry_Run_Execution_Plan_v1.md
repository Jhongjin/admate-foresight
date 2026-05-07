# AdMate Foresight Benchmark MMP Schema Dry-run Execution Plan v1

작성일: 2026-05-07

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 `Admate_AI_MMP` disposable schema fallback에서 Foresight benchmark schema draft를 non-production dry-run으로 적용하기 위한 실행 계획을 정의한다.

이번 Gate는 계획 문서화만 수행한다. SQL 실행, DB 연결, schema/migration 적용, rollback 실행, production env 변경, 코드/API 수정, commit/push는 수행하지 않는다.

## 2. Preconditions

Gate 17C 판정:

```text
proceed_to_schema_dry_run_plan
```

Required manual confirmations before any later execution Gate:

| Confirmation | Required value |
| --- | --- |
| Supabase project | `Admate_AI_MMP` |
| Not AdMate Data Core | yes |
| SQL Editor target checked | yes |
| Blocking SQL Editor warning/error | none |
| Preflight result | clean |
| `foresight` schema count | `0` |
| Existing draft table count | `0` |
| `pgcrypto` / `uuid-ossp` | available |
| `auth.users` availability | available |
| Policy/grant risk rows | none for `foresight` scope |

If any confirmation is missing, stop and return to target confirmation review. Production AdMate Data Core remains forbidden.

## 3. Files In Scope For Later Execution

These files are execution candidates for a future approved Gate only:

| Step | File | Type |
| --- | --- | --- |
| 1 | `docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql` | schema dry-run draft |
| 2 | `docs/sql/2026-05-07_foresight_benchmark_nonprod_verify.sql` | read-only verify |
| 3 | operator decision | rollback rehearsal go/no-go |
| 4 | `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql` | rollback rehearsal draft |
| 5 | `docs/sql/2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql` | read-only post-rollback verify |

Do not run any API, import/export, raw upload, Meta sync, Python retrain, LLM process, or production migration as part of this dry-run.

## 4. Execution Order For Next Gate

This section describes the later execution Gate. It is not executed now.

### Step 0: Final Manual Target Confirmation

Before any SQL is run:

1. Confirm Supabase Dashboard project is `Admate_AI_MMP`.
2. Confirm it is not AdMate Data Core production.
3. Confirm SQL Editor target is the same project.
4. Confirm there is no blocking SQL Editor warning/error.
5. Confirm no production env, service credential, provider token, session URL, or raw data is copied into the report.
6. Confirm Gate 17C preflight result is the current result and no schema objects have been created since that preflight.

Expected result:

```text
manual_target_confirmation = pass
```

Stop if any target or authority signal is ambiguous.

### Step 1: Schema Draft SQL Execution

File:

```text
docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql
```

Expected effect in `Admate_AI_MMP` fallback target:

- create proposal schema namespace `foresight` if absent.
- create five draft tables:
  - `foresight.benchmark_uploads`
  - `foresight.benchmark_dataset_versions`
  - `foresight.benchmark_dry_run_reports`
  - `foresight.benchmark_review_events`
  - `foresight.normalized_benchmark_rows`
- enable RLS on all five tables.
- create index candidates.
- create check/foreign-key/unique constraints.
- insert no rows.
- create no RLS policies.
- store no raw files, raw campaign rows, API tokens, provider responses, or model artifacts.

Expected result:

```text
schema_draft_execution = success
created_table_count_candidate = 5
```

Stop if:

- SQL Editor target is uncertain.
- create SQL errors.
- existing table conflict appears.
- schema creation affects a non-disposable object.
- any operator is tempted to patch SQL ad hoc in the editor.

### Step 2: Nonprod Verify SQL Execution

File:

```text
docs/sql/2026-05-07_foresight_benchmark_nonprod_verify.sql
```

Expected verify results:

| Check | Expected result |
| --- | --- |
| expected table count | `5` |
| RLS enabled count | `5` |
| draft index count | `23` candidate indexes |
| constraints | primary/check/FK/unique constraints present for all draft tables |
| FK/soft reference status | no direct FK to `auth.users`; actor fields remain soft UUID references |
| row counts | all five candidate tables have `0` rows |
| policy list | no broad anonymous policy |
| broad anon policy count | `0` |
| column existence | required column candidates are present |
| verify summary | no `STOP` result |

Expected result:

```text
verify_summary = verify results require reviewer signoff
```

Stop if:

- table count is not `5`.
- RLS enabled count is not `5`.
- expected indexes are missing or unexpected broad indexes appear.
- constraints are missing or unexpected.
- FK references unexpectedly point to `auth.users`.
- any row count is nonzero before planned rollback review.
- broad anonymous/public policy appears.
- verify summary returns `STOP`.

### Step 3: Rollback Rehearsal Go/No-go Decision

Rollback rehearsal should normally run in the same approved dry-run execution Gate after verify results are captured, because the MMP fallback objects are rehearsal-only.

Before rollback:

| Guard | Required result |
| --- | --- |
| Target still `Admate_AI_MMP` | yes |
| Not AdMate Data Core production | yes |
| Candidate table row counts | all `0` |
| Non-draft object risk | none |
| Backup/export needed | no, if row counts are `0` and objects are dry-run only |
| Operator notes sanitized | yes |

Decision:

```text
rollback_rehearsal = proceed
```

Stop if:

- any candidate table contains rows.
- any object appears non-dry-run.
- target identity changes.
- rollback file would affect unexpected objects.
- operator cannot produce a sanitized row-count report.

If stopped before rollback, do not leave the state unreviewed. Record the blocker and request a separate cleanup plan.

### Step 4: Rollback Draft Execution

File:

```text
docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql
```

Expected effect:

- drop only the five draft tables in reverse dependency order:
  - `foresight.normalized_benchmark_rows`
  - `foresight.benchmark_review_events`
  - `foresight.benchmark_dry_run_reports`
  - `foresight.benchmark_dataset_versions`
  - `foresight.benchmark_uploads`
- leave the proposal schema namespace handling to the later AdMate Data Core decision.
- do not touch production.
- do not touch unrelated schemas or objects.

Expected result:

```text
rollback_execution = success
```

Stop if:

- row count guard failed.
- target is uncertain.
- rollback SQL errors.
- any drop appears to target objects outside the five draft tables.
- schema namespace cleanup is attempted without separate approval.

### Step 5: Post-rollback Verify SQL Execution

File:

```text
docs/sql/2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql
```

Expected post-rollback results:

| Check | Expected result |
| --- | --- |
| target draft tables list | no rows |
| remaining draft table count | `0` |
| draft indexes | no rows |
| broad policies | no rows for draft objects |
| unrelated schemas | unchanged summary only |
| post rollback summary | no `STOP` result |

Expected result:

```text
post_rollback_summary = post-rollback review required
```

Stop if:

- any draft table remains.
- any draft index remains.
- `post_rollback_summary` returns `STOP`.
- unrelated schema/object changes appear.

## 5. Expected Result Matrix

| Phase | Expected pass signal | Failure signal |
| --- | --- | --- |
| Pre-execution confirmation | target confirmed as `Admate_AI_MMP`, not production | target unclear or production-adjacent |
| Schema draft | five tables created, no rows inserted | create error or object conflict |
| Verify | table count `5`, RLS count `5`, row counts `0`, broad anon count `0` | count mismatch, row count nonzero, broad policy |
| Rollback decision | row counts `0`, draft-only objects | nonzero rows or non-draft object risk |
| Rollback | five draft tables removed | rollback error or unexpected target |
| Post rollback verify | remaining draft table count `0`, no draft indexes | draft table/index remains |

## 6. Stop Conditions

Stop immediately and do not continue manually if:

- target project is uncertain.
- target is AdMate Data Core production or production-adjacent.
- SQL Editor warning/error indicates unsafe target state.
- schema draft execution errors.
- unexpected table conflict appears.
- RLS count is not `5`.
- index or constraint verification mismatches.
- FK references unexpectedly target `auth.users`.
- broad anonymous/public policy appears.
- any candidate row count is nonzero before rollback.
- rollback file target does not match the five draft tables.
- rollback verify reports remaining draft tables or draft indexes.
- sanitized reporting cannot be produced.

## 7. Result Reporting Template

Use this template after the later execution Gate.

```text
Gate Foresight-Benchmark-19 MMP schema dry-run execution result

target_confirmation:
  project_label: Admate_AI_MMP
  not_admate_data_core_production:
  sql_editor_target_confirmed:
  blocking_sql_editor_warning_error:

schema_draft_result:
  file:
  execution_status:
  created_table_count:
  created_index_count:
  rls_enable_status:
  errors_sanitized:

verify_result:
  expected_table_count:
  rls_enabled_count:
  draft_index_count:
  constraint_summary:
  fk_soft_reference_status:
  row_count_zero_status:
  broad_anon_policy_count:
  verify_summary:

rollback_decision:
  row_count_guard:
  backup_export_required:
  rollback_rehearsal_decision:
  blocker_if_any:

rollback_result:
  file:
  execution_status:
  dropped_draft_tables:
  errors_sanitized:

post_rollback_verify_result:
  remaining_draft_table_count:
  draft_index_remaining_status:
  unrelated_schema_status:
  post_rollback_summary:

decision:
  ready_for_result_review:
  blockers:
  follow_up:
```

Do not include:

- connection strings.
- service role values.
- credential-bearing project URLs.
- provider tokens.
- session URLs.
- raw campaign rows.
- raw provider responses.
- advertiser, account, campaign, ad set, or ad identifiers.

## 8. Rollback / Cleanup Principles

The MMP dry-run objects are rehearsal objects and should be removed after the dry-run unless a later explicit Gate approves leaving evidence objects in place.

Principles:

- Rollback is part of the non-production rehearsal, not a production cleanup.
- Rollback is not an AdMate Data Core rollback.
- Row count must be checked before rollback.
- If any row exists, stop and review whether the row is synthetic, accidental, or unsafe.
- Do not drop the `foresight` schema namespace unless separately approved.
- Do not touch unrelated schemas, storage buckets, functions, policies, or public document/chunk objects.
- Store only sanitized result summaries in repo docs.

## 9. Next Gate Recommendations

1. `Foresight-Benchmark-19 MMP schema dry-run execution`
2. `Foresight-Benchmark-20 dry-run result review`
3. `Foresight-Benchmark-21 production readiness review`

The next Gate should be an explicit execution Gate. This plan alone does not authorize SQL execution.
