# AdMate Foresight Benchmark Production Apply Approval Checklist v1

작성일: 2026-05-08

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 Foresight benchmark schema를 AdMate Data Core production에 실제 apply하기 전, 운영자가 확인하고 승인해야 하는 최종 체크리스트를 정의한다.

이번 Gate는 approval checklist 문서화만 수행한다. SQL 실행, DB 연결, schema/migration 적용, production env 변경, 코드/API/env 수정, Meta API 호출, Python retrain, LLM 호출은 수행하지 않는다.

## 2. Current Preconditions

Known state:

- MMP schema dry-run passed.
- MMP rollback rehearsal passed.
- MMP post-rollback residue check passed.
- Production read-only preflight is conditionally accepted.
- Production migration runbook is ready.
- Production schema apply is not yet approved.

Production apply may proceed only after a later execution Gate records explicit approval, target confirmation, operator assignment, and result capture requirements.

## 3. Required Explicit Approval Phrase

The production schema apply requires this exact approval phrase:

```text
AdMate-Data-Core production에 Foresight benchmark schema apply를 승인한다.
```

Approval is invalid if:

- the phrase is paraphrased ambiguously.
- the target project is not named.
- the approver cannot confirm the target is AdMate Data Core production.
- approval is mixed with unrelated data import, API integration, Meta sync, retrain, or LLM work.
- rollback authority is not assigned.

## 4. Required Participants

At minimum, the following roles must be present or explicitly represented:

| Role | Required responsibility |
| --- | --- |
| Data Core owner | approves production schema apply target |
| Foresight product/data owner | confirms benchmark schema purpose and scope |
| Supabase/DB operator | executes only approved SQL in approved order |
| Rollback approver | approves emergency rollback if needed |
| Security/governance reviewer | acknowledges RLS, public policy, and data boundary expectations |
| Recorder | captures sanitized evidence and final decision |

One person may cover multiple roles only if the operating policy permits it. The execution record must still identify which responsibilities were covered.

## 5. Pre-execution Checklist

All items must be checked before any production apply SQL is run.

| Check | Required value |
| --- | --- |
| Explicit approval phrase recorded | yes |
| Supabase Dashboard target | AdMate Data Core |
| SQL Editor top project | AdMate Data Core |
| Not MMP | confirmed |
| Not local/staging/disposable project | confirmed |
| Latest production migration runbook reviewed | yes |
| Production preflight will be re-run immediately before apply | yes |
| No concurrent DB/schema work | confirmed |
| Rollback SQL available | yes, emergency-only by default |
| Rollback approver assigned | yes |
| Execution window accepted | yes |
| Sanitized result capture owner assigned | yes |
| Raw benchmark data import excluded | yes |
| Code/API integration excluded | yes |

If any item is missing, do not execute schema apply.

## 6. Expected Verify Counts

The operator must confirm these expected values before apply:

| Verify item | Expected value |
| --- | --- |
| Table count | `5` |
| RLS enabled count | `5` |
| Explicit draft index count | `23` |
| Total matching `pg_indexes` count | `29` |
| Draft table row counts | all `0` |
| Newly added broad public/anon Foresight policy count | `0` |
| Direct FK to `auth.users` | none |
| Required columns | present |

Existing public/storage broad policies remain separate security debt and must not be treated as newly added Foresight access.

## 7. Stop Conditions

Stop before execution if:

- explicit approval phrase is absent.
- target project is uncertain.
- target is `Admate_AI_MMP`.
- target is any project other than AdMate Data Core production.
- SQL Editor shows a blocking warning/error.
- production preflight is not re-run.
- production preflight differs materially from the accepted Gate 23 result.
- existing Foresight schema or draft table conflict appears.
- required extension/auth/openclaw baseline is unavailable.
- concurrent DB/schema work is active or suspected.
- rollback approver is not assigned.
- exact SQL files are not approved.

Stop after apply if:

- schema draft SQL errors.
- table count is not `5`.
- RLS enabled count is not `5`.
- explicit index count `23` or total index count `29` cannot be explained.
- any draft table row count is not `0`.
- any newly added broad public/anon Foresight policy or grant appears.
- required columns or constraints are missing.
- sanitized evidence cannot be captured.

Stop means:

- do not improvise SQL.
- do not run data import.
- do not modify code/API/env.
- do not run Meta sync or Python retrain.
- record a sanitized blocker and request review.

## 8. Approval Record Template

Use this template before execution.

```text
production_apply_approval:
  explicit_phrase:
  approver_name_or_role:
  approval_timestamp:
  target_project_confirmed:
  sql_editor_project_confirmed:
  not_mmp_confirmed:
  latest_runbook_reviewed:
  production_preflight_rerun_planned:
  no_concurrent_db_schema_work:
  rollback_approver:
  operator:
  recorder:
  execution_window:
  approved_sql_files:
  excluded_work_confirmed:
```

Do not include secrets, tokens, connection strings, credential-bearing URLs, raw benchmark rows, raw provider responses, or campaign/account/ad identifiers.

## 9. Post-apply Evidence Required

After a later approved apply Gate, the recorder must capture:

- approval phrase and approver role.
- target confirmation.
- production preflight re-run result.
- schema draft execution result.
- production verify result.
- table count.
- RLS enabled count.
- explicit index count `23`.
- total `pg_indexes` count `29`.
- row count all `0`.
- newly added broad Foresight policy/grant count `0`.
- rollback decision and approver, if rollback is considered.
- sanitized blocker/warning list.
- final decision.

Evidence must be sanitized. Do not record credential values, raw rows, provider responses, or advertiser/campaign/account/ad identifiers.

## 10. Rollback Approval Requirements

Rollback is emergency-only by default after production apply.

Rollback requires:

- rollback approver confirmation.
- operator confirmation of target project.
- row count and object scope confirmation.
- confirmation that rollback affects only Foresight draft schema objects.
- sanitized reason for rollback.
- confirmation that public/storage/openclaw objects are not touched.

Rollback must not be used to rehearse routinely in production unless a separate explicit approval states that production rollback rehearsal is intended.

## 11. Work Explicitly Excluded

The approval checklist does not approve:

- raw benchmark data import.
- normalized benchmark data promotion.
- benchmark upload or dry-run API implementation.
- reviewer UI/API integration.
- public prediction route changes.
- Meta API sync.
- Python retrain.
- LLM processing of raw campaign-level data.
- production env changes.
- app deployment.

Each item requires a separate future Gate.

## 12. Next Gate Recommendation

Recommended next Gate:

```text
Foresight-Benchmark-26 production schema apply execution
```

Only proceed if the exact approval phrase is recorded and all pre-execution checklist items are satisfied.

Alternative blocker Gates:

- `Foresight-Benchmark-25B production approval blocker review`
- `Foresight-Security-6 production public policy baseline review`
- `Foresight-Benchmark-26A production preflight re-run result review`

## 13. Final Boundary

This document is not execution approval by itself.

Production schema apply remains forbidden until a later Gate records the required explicit approval phrase, target confirmation, operator, rollback authority, execution window, approved SQL files, and sanitized result capture plan.
