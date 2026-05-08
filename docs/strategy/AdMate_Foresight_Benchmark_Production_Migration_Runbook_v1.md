# AdMate Foresight Benchmark Production Migration Runbook v1

작성일: 2026-05-08

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 Foresight benchmark schema를 AdMate Data Core production에 적용하기 전 필요한 운영 runbook을 정의한다.

이번 Gate는 runbook 문서화만 수행한다. SQL 실행, DB 연결, schema/migration 적용, production env 변경, 코드/API/env 수정, Meta API 호출, Python retrain, LLM 호출은 수행하지 않는다.

## 2. Current Readiness Context

Known state:

- MMP schema dry-run passed.
- MMP verify passed.
- MMP rollback rehearsal passed.
- MMP post-rollback residue check passed.
- Production read-only preflight is conditionally accepted.
- Production schema apply is not yet approved.
- Dashboard target manual confirmation remains required.
- Existing `broad_anon_public_policy_count = 10` is classified as existing public/storage security debt, not Foresight residue.
- Index expectation is corrected:
  - explicit draft indexes: `23`.
  - total matching `pg_indexes` rows after apply: `29`.

This runbook does not grant execution approval. It prepares the approval and execution checklist for a later Gate.

## 3. Operator Approval Checklist

Production schema apply requires explicit approval before execution.

| Approval | Required status |
| --- | --- |
| Data Core owner approval | required |
| Foresight product/data owner approval | required |
| Security/governance acknowledgment | required |
| Supabase/DB operator assigned | required |
| Rollback approver assigned | required |
| Execution window approved | required |
| Production preflight accepted | required |
| Backup/restore expectation approved | required |
| Exact SQL files approved | required |
| Stop conditions accepted | required |
| Sanitized result reporting boundary accepted | required |

If any approval is missing, do not execute schema apply.

## 4. Target Confirmation

Before any SQL runs, the operator must confirm:

| Target check | Required value |
| --- | --- |
| Supabase Dashboard project | AdMate Data Core |
| SQL Editor top project | AdMate Data Core |
| Not MMP | yes |
| Not local/staging/disposable project | yes |
| Production preflight intent | intentionally selected and approved |
| Schema apply approval | explicitly recorded for this Gate |

Stop if:

- target is uncertain.
- target is `Admate_AI_MMP`.
- target is another project.
- operator cannot distinguish project identity from database name alone.
- SQL Editor shows a blocking warning/error.

## 5. Execution Before Apply: Re-preflight Checklist

Immediately before schema apply, rerun production read-only preflight.

Required re-preflight checks:

- current database/schema/role/server version captured.
- Dashboard and SQL Editor target confirmed.
- `foresight_schema_count` remains `0` or is explicitly reviewed.
- existing draft table conflict count remains `0`.
- `auth.users` is available.
- extension availability remains acceptable.
- `openclaw` account model baseline remains compatible.
- `foresight` policy/grant residue remains no rows.
- broad public/storage policy baseline is recorded as separate security debt.
- production preflight summary has no stop result.

If re-preflight differs from Gate 23 in a material way, stop and review before schema apply.

## 6. Allowed SQL Execution Order

Allowed order for a later approved production execution Gate:

| Step | Action | File/source | Notes |
| --- | --- | --- | --- |
| 1 | Production preflight re-run | `docs/sql/2026-05-08_foresight_benchmark_production_preflight.sql` | read-only only |
| 2 | Schema draft SQL | `docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql` | apply only after approvals |
| 3 | Production verify SQL | approved production verify query set | must use corrected index expectations |
| 4 | Rollback go/no-go decision | operator and rollback approver | do not auto-rollback by default |
| 5 | Rollback only if approved | `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql` or production-specific rollback draft | emergency or explicitly approved rehearsal only |

No code/API integration, raw benchmark data import, Meta API sync, Python retrain, or LLM workflow may run in this Gate.

## 7. Rollback Rehearsal Policy In Production

Default decision:

```text
do_not_auto_rollback_after_successful_production_apply
```

Reason:

- MMP rollback rehearsal already passed.
- Production apply is intended to create the actual schema objects.
- Automatic rollback would remove the newly approved production schema and increase operational risk.

Rollback in production is allowed only if:

- emergency rollback is required because a stop condition appears after apply.
- rollback rehearsal in production was explicitly approved as a separate operation.
- rollback approver confirms row count and object scope.
- rollback target is limited to expected draft tables.
- backup/restore expectation is understood.

If apply and verify pass, preserve the schema and proceed to post-apply documentation.

## 8. Production Verify Expectations

After schema apply, production verify must check:

| Verify item | Expected value |
| --- | --- |
| Table count | `5` |
| RLS enabled count | `5` |
| Explicit draft index count | `23` |
| Total matching `pg_indexes` count | `29` |
| Primary/check/FK/unique constraints | present |
| Direct FK to `auth.users` | none |
| Draft table row counts | all `0` |
| Broad anon/public policy newly added by Foresight | `0` |
| `foresight` ordinary-role grants | none unless separately approved |
| Required columns | present |
| Verify summary | no stop result |

Existing public/storage broad policies must not be counted as Foresight-added access. Record them as existing security debt only.

## 9. Stop Conditions

Stop before or during execution if:

- target project is uncertain.
- target is MMP or another non-production project.
- production schema apply approval is missing.
- re-preflight shows existing `foresight` draft table conflict.
- `foresight` objects appear unexpectedly.
- `auth.users` or actor strategy is no longer acceptable.
- openclaw/account model now requires schema changes first.
- SQL Editor warning/error indicates unsafe target state.
- schema draft errors.
- table count is not `5` after apply.
- RLS count is not `5`.
- explicit index count or total index count is unexplained.
- any draft table row count is not `0`.
- a broad Foresight anon/public policy or grant appears.
- sanitized reporting cannot be produced.

Stop means:

- do not improvise SQL.
- do not modify app code.
- do not import data.
- record sanitized blocker.
- request review.

## 10. Rollback Conditions

Rollback may be considered only when:

- apply fails after creating partial Foresight objects.
- verify reports a blocker that cannot be accepted.
- a broad Foresight access policy/grant appears.
- expected tables or RLS state cannot be made safe without rollback.
- operator and rollback approver both approve rollback.

Rollback must not:

- touch public/storage/openclaw objects.
- remove unrelated Data Core objects.
- remove raw data.
- rely on ad hoc SQL.
- run without row count and object scope confirmation.

## 11. Post-apply Documentation Requirements

After successful apply and verify, record:

- target confirmation.
- preflight re-run result.
- schema apply result.
- verify result.
- table count.
- RLS count.
- explicit index count `23`.
- total `pg_indexes` count `29`.
- row count all `0`.
- broad Foresight policy/grant status.
- rollback decision, usually `not executed after successful apply`.
- blockers or warnings.
- named operator and approver.
- timestamp and sanitized execution notes.

Do not record:

- connection strings.
- service credential values.
- credential-bearing URLs.
- passwords.
- provider credential values.
- raw benchmark rows.
- raw provider responses.
- advertiser, campaign, account, ad set, ad, or personal identifiers.

## 12. Scope Separation

Not included in schema apply:

- code/API integration.
- reviewer UI or workflow implementation.
- benchmark upload parser implementation.
- raw benchmark data import.
- normalized benchmark data promotion.
- Meta API sync.
- Python retrain.
- LLM processing of raw campaign-level data.

These must remain separate future Gates after production schema apply is reviewed.

## 13. Result Capture Template

Use this template after a later approved execution Gate.

```text
Gate Foresight-Benchmark-25 production schema apply result

target_confirmation:
  dashboard_project:
  sql_editor_project:
  not_mmp:
  execution_window:
  operator:
  approver:

re_preflight:
  target_confirmed:
  foresight_schema_count:
  existing_draft_table_count:
  auth_users_available:
  extensions_available:
  openclaw_compatibility:
  foresight_policy_grant_residue:
  summary:

schema_apply:
  file:
  execution_status:
  errors_sanitized:

verify:
  table_count:
  rls_enabled_count:
  explicit_index_count:
  pg_indexes_total_count:
  constraint_summary:
  fk_auth_users_status:
  row_count_zero_status:
  broad_foresight_policy_grant_status:
  verify_summary:

rollback_decision:
  rollback_executed:
  reason:
  rollback_approver:

final_decision:
  production_schema_apply_status:
  blockers:
  warnings:
  next_gate:
```

## 14. Recommended Next Gate

Recommended next Gate:

```text
Foresight-Benchmark-25 production schema apply approval and execution
```

Only proceed if all approvals and re-preflight checks are complete.

Alternative blocker Gates:

- `Foresight-Benchmark-24B production runbook approval blocker review`
- `Foresight-Security-6 production public policy baseline review`
- `Foresight-Benchmark-20A verify expectation correction for index count`

## 15. Final Boundary

This runbook does not authorize execution by itself.

Production schema apply remains forbidden until a later explicit approval Gate names the operator, target, SQL files, execution window, rollback authority, and result capture requirement.
