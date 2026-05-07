# AdMate Foresight Benchmark MMP Human-operated Schema Dry-run Result Capture v1

작성일: 2026-05-07

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 운영자가 Supabase Dashboard에서 직접 `Admate_AI_MMP` target을 확인하고, Foresight benchmark schema dry-run SQL을 실행한 뒤 sanitized result를 제출하기 위한 체크리스트와 결과 템플릿이다.

Codex는 이 Gate에서 SQL을 실행하지 않는다. DB 연결, schema/migration 적용, rollback 실행, production env 변경, 코드/API/env 수정, Meta API 호출, Python retrain, LLM 호출도 수행하지 않는다.

## 2. Execution Boundary

Allowed only for the human operator in Supabase SQL Editor after target confirmation:

1. `docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql`
2. `docs/sql/2026-05-07_foresight_benchmark_nonprod_verify.sql`
3. `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql`
4. `docs/sql/2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql`

Forbidden:

- running against AdMate Data Core production.
- running against an ambiguous Supabase project.
- editing SQL ad hoc in SQL Editor.
- running unapproved SQL.
- loading raw Excel/CSV/model artifacts.
- running Meta API, Python retrain, LLM, app API routes, import/export automation, or production migration.
- copying secrets, env values, tokens, credential-bearing URLs, raw rows, raw provider responses, or advertiser/campaign/account/ad identifiers into reports.

## 3. Pre-execution Target Checklist

The operator must complete this checklist before any SQL runs.

| Check | Required answer | Operator answer |
| --- | --- | --- |
| Supabase Dashboard project is `Admate_AI_MMP` | yes |  |
| SQL Editor top project name is `Admate_AI_MMP` | yes |  |
| Target is not AdMate Data Core production | yes |  |
| Target is non-critical fallback/disposable target | yes |  |
| No blocking SQL Editor warning/error before execution | yes |  |
| Gate 17C preflight result remains current | yes |  |
| `foresight_schema_count` was `0` in preflight | yes |  |
| `existing_draft_table_count` was `0` in preflight | yes |  |
| `auth.users` was available in preflight | yes |  |
| `pgcrypto` / `uuid-ossp` were available in preflight | yes |  |
| Policy/grant risk rows for `foresight` were absent | yes |  |

Stop if any answer is not `yes`.

## 4. Execution Order

Run the approved SQL files in this order only.

| Step | Action | File | Continue only if |
| --- | --- | --- | --- |
| 1 | Schema draft execution | `docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql` | execution succeeds without target/object errors |
| 2 | Verify execution | `docs/sql/2026-05-07_foresight_benchmark_nonprod_verify.sql` | table/RLS/row/policy checks pass |
| 3 | Rollback go/no-go | operator decision | all candidate row counts are `0` |
| 4 | Rollback rehearsal | `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql` | rollback targets only the five draft tables |
| 5 | Post-rollback verify | `docs/sql/2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql` | remaining draft table count is `0` |

Do not continue manually after a stop condition. Record the sanitized stop reason and return for review.

## 5. Schema Draft Result Submission

After Step 1, submit this table.

| Result field | Expected value | Operator result |
| --- | --- | --- |
| SQL file executed | `2026-05-07_foresight_benchmark_schema_draft.sql` |  |
| execution status | `success` |  |
| created schema | `foresight` |  |
| created table count | `5` |  |
| created tables | five expected draft tables only |  |
| RLS enable attempted | yes |  |
| index creation attempted | yes |  |
| constraints created | yes |  |
| rows inserted | `0` / none |  |
| RLS policies created | none |  |
| errors/warnings | none or sanitized non-blocking |  |

Expected draft tables:

- `foresight.benchmark_uploads`
- `foresight.benchmark_dataset_versions`
- `foresight.benchmark_dry_run_reports`
- `foresight.benchmark_review_events`
- `foresight.normalized_benchmark_rows`

Stop if:

- create/alter/RLS/index/constraint error occurs.
- an unexpected existing object conflict appears.
- any raw data row or artifact is created.
- operator modifies SQL manually.

## 6. Verify SQL Result Submission

After Step 2, submit this table.

| Verify field | Expected value | Operator result |
| --- | --- | --- |
| SQL file executed | `2026-05-07_foresight_benchmark_nonprod_verify.sql` |  |
| expected table count | `5` |  |
| RLS enabled count | `5` |  |
| draft index count | matches expected index candidates |  |
| constraint summary | primary/check/FK/unique constraints present |  |
| FK/soft reference status | no direct FK to `auth.users` |  |
| candidate row counts | all `0` |  |
| broad anon policy count | `0` |  |
| policy list | no broad anon/public policy |  |
| column existence status | expected columns present |  |
| verify summary | no `STOP` result |  |
| errors/warnings | none or sanitized non-blocking |  |

Stop if:

- table count is not `5`.
- RLS enabled count is not `5`.
- row count is not zero for any candidate table.
- broad anon/public policy exists.
- verify summary returns `STOP`.
- constraint/index/FK mismatch appears.

## 7. Rollback Go/No-go Criteria

Rollback rehearsal is allowed only if every guard passes.

| Guard | Required value | Operator result |
| --- | --- | --- |
| Target still `Admate_AI_MMP` | yes |  |
| Target still not AdMate Data Core production | yes |  |
| All five candidate row counts | `0` |  |
| Objects are draft-only | yes |  |
| Backup/export required | no, if row counts are `0` |  |
| Rollback file targets only expected draft tables | yes |  |
| Sanitized report can be produced | yes |  |

Decision:

```text
rollback_rehearsal_decision: proceed / stop
```

Stop before rollback if:

- any row exists.
- any object appears non-dry-run or shared.
- target identity is uncertain.
- rollback SQL would affect objects outside the five draft tables.

## 8. Rollback Result Submission

After Step 4, submit this table.

| Result field | Expected value | Operator result |
| --- | --- | --- |
| SQL file executed | `2026-05-07_foresight_benchmark_schema_rollback_draft.sql` |  |
| execution status | `success` |  |
| dropped draft tables | five expected draft tables |  |
| schema namespace dropped | no |  |
| unrelated schemas touched | no |  |
| public documents/chunks touched | no |  |
| storage/functions/policies touched | no unrelated changes |  |
| errors/warnings | none or sanitized non-blocking |  |

Expected dropped tables:

- `foresight.normalized_benchmark_rows`
- `foresight.benchmark_review_events`
- `foresight.benchmark_dry_run_reports`
- `foresight.benchmark_dataset_versions`
- `foresight.benchmark_uploads`

## 9. Post-rollback Verify Submission

After Step 5, submit this table.

| Verify field | Expected value | Operator result |
| --- | --- | --- |
| SQL file executed | `2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql` |  |
| remaining draft table count | `0` |  |
| draft table list | no rows |  |
| draft index remaining status | no rows |  |
| policy remaining status | no rows for draft objects |  |
| unrelated schema summary | unchanged / review only |  |
| post rollback summary | no `STOP` result |  |
| errors/warnings | none or sanitized non-blocking |  |

Stop if:

- remaining draft table count is not `0`.
- draft indexes remain.
- post rollback summary returns `STOP`.
- unrelated schema/object changes appear.

## 10. Sanitized Result Template

The operator can paste this completed template into the next Gate.

```text
Gate Foresight-Benchmark-19A MMP human-operated schema dry-run result

target_confirmation:
  project_label: Admate_AI_MMP
  dashboard_target_confirmed:
  sql_editor_target_confirmed:
  not_admate_data_core_production:
  blocking_warning_error_before_execution:

schema_draft_result:
  file:
  execution_status:
  created_schema:
  created_table_count:
  created_tables:
  rls_enable_status:
  created_index_count:
  constraint_summary:
  rows_inserted:
  rls_policies_created:
  errors_sanitized:

verify_result:
  file:
  expected_table_count:
  rls_enabled_count:
  draft_index_count:
  constraint_summary:
  fk_soft_reference_status:
  row_count_zero_status:
  broad_anon_policy_count:
  verify_summary:
  errors_sanitized:

rollback_go_no_go:
  target_reconfirmed:
  row_count_guard:
  objects_draft_only:
  backup_export_required:
  decision:
  blocker_if_any:

rollback_result:
  file:
  execution_status:
  dropped_draft_tables:
  schema_namespace_dropped:
  unrelated_objects_touched:
  errors_sanitized:

post_rollback_verify_result:
  file:
  remaining_draft_table_count:
  draft_table_list_status:
  draft_index_remaining_status:
  policy_remaining_status:
  unrelated_schema_status:
  post_rollback_summary:
  errors_sanitized:

final_operator_note:
  ready_for_codex_result_review:
  blockers:
  sanitized_notes:
```

## 11. Stop Conditions

Stop immediately if any condition appears.

| Stop condition | Required response |
| --- | --- |
| Target is uncertain | do not run SQL |
| Target is AdMate Data Core production | do not run SQL |
| SQL Editor project name is not `Admate_AI_MMP` | do not run SQL |
| Blocking warning/error appears before execution | do not run SQL |
| Schema draft create/alter/RLS/index/constraint error | stop before verify unless error is reviewed |
| Unexpected object conflict | stop and report sanitized conflict |
| Broad anon/public policy appears | stop before rollback decision |
| Any candidate row count is not `0` | stop before rollback |
| Rollback file would affect unexpected objects | stop before rollback |
| Post-rollback verify mismatch | stop and report blocker |
| Secret/env/token/raw data would be exposed | stop and redact |

## 12. Reporting Safety

Never include:

- connection strings.
- service role values.
- credential-bearing URLs.
- passwords.
- provider tokens.
- session URLs.
- raw Excel/CSV/model artifacts.
- raw campaign-level rows.
- raw provider responses.
- advertiser, account, campaign, ad set, ad, or personal identifiers.

Allowed reporting:

- yes/no confirmations.
- counts.
- sanitized object names for the five draft tables.
- sanitized SQL Editor error/warning summaries.
- no-rows statements.
- pass/stop decisions.

## 13. Next Gate Recommendation

After the operator returns the completed sanitized result:

- `Foresight-Benchmark-20 MMP schema dry-run result review`

Possible outcomes:

- dry-run and rollback rehearsal accepted.
- dry-run accepted with warnings.
- dry-run blocked by verification mismatch.
- rollback cleanup follow-up required.
- production readiness remains blocked until a separate production review.
