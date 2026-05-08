# AdMate Foresight Benchmark Production Migration Readiness Decision v1

작성일: 2026-05-08

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 `Admate_AI_MMP` non-production schema dry-run pass 결과를 바탕으로 Foresight benchmark schema draft가 production AdMate Data Core migration으로 넘어갈 준비가 되었는지 판단한다.

이번 Gate는 readiness decision 문서화만 수행한다. SQL 실행, DB 연결, schema/migration 적용, production env 변경, 코드/API/env 수정, Meta API 호출, Python retrain, LLM 호출은 수행하지 않는다.

## 2. Inputs

Reviewed inputs:

- Gate 19B MMP schema dry-run result review.
- Schema draft and verify expectation notes from prior Gates.
- Human-operated dry-run summary:
  - schema draft pass.
  - verify pass.
  - rollback rehearsal pass.
  - post-rollback residue pass.
  - all draft table row counts `0`.
  - broad anon policy count `0`.
  - production migration not yet approved.

## 3. Readiness Decision

Overall decision:

```text
conditional_go_to_production_preflight_planning
production_migration_execution_blocked
```

Meaning:

- The MMP dry-run result is accepted as sufficient evidence that the current schema draft can be applied and rolled back in a non-production Supabase target.
- The team may proceed to a production preflight and production migration runbook Gate.
- Direct production migration execution remains blocked until the prerequisites in this document are closed and separately approved.

Production migration is not approved by this Gate.

## 4. Index Count Variance Decision

Observed variance:

```text
plan expected: 23 indexes
verify actual: 29 indexes
```

Review finding:

- The schema draft contains 23 explicit `CREATE INDEX` / `CREATE UNIQUE INDEX` statements.
- PostgreSQL also creates implicit indexes for primary key and unique constraints.
- The dry-run table design includes five primary keys and one explicit table-level unique constraint.
- The verify query counted objects from `pg_indexes`, so the 29 count is consistent with:

```text
23 explicit draft indexes
+ 5 primary key implicit indexes
+ 1 unique constraint implicit index
= 29 total pg_indexes rows matching the benchmark/normalized index name patterns
```

Decision:

```text
not_a_production_blocker
```

Required follow-up:

- Update production verify expectations to distinguish explicit index count (`23`) from total matching `pg_indexes` count (`29`).
- Keep this as a documentation/verify-query expectation correction before any production execution.

## 5. Readiness Matrix

| Area | Status | Decision |
| --- | --- | --- |
| Non-production schema apply | pass | accepted |
| Non-production verify | pass with index-count note | accepted |
| Rollback rehearsal | pass | accepted |
| Post-rollback residue | pass | accepted |
| Row-count guard | all `0` | accepted |
| Broad anon policy | count `0` | accepted |
| Production target decision | unresolved | blocker |
| Production preflight | not run | required |
| Production backup/rollback | not approved | blocker |
| RLS policy model | not implemented | blocker for app access |
| Actor/auth reference source | soft UUID draft only | approval required |
| Retention/raw boundary | proposal only | approval required |
| Operator approvals | not recorded for production | blocker |

## 6. Unresolved Blockers

Production migration execution remains blocked by:

1. AdMate Data Core target schema ownership and namespace decision.
2. Production read-only preflight not yet executed.
3. Production backup/export or restore point plan not approved.
4. Production rollback runbook not approved.
5. RLS policy strategy not finalized beyond RLS enablement.
6. Reviewer/uploader/admin/data steward role source not finalized.
7. Actor/auth reference strategy not approved for production.
8. Raw file retention and source evidence policy not finalized.
9. Production operator approval not recorded.
10. Security/data governance approval not recorded.
11. Verify expectation must be updated for explicit `23` vs total `29` index count.

These blockers do not invalidate the MMP dry-run. They prevent production execution.

## 7. Production Migration Prerequisites

Before production migration execution, the team must complete:

- Data Core owner approval for target project and schema namespace.
- Security approval for no broad anon/public access.
- Data steward approval for raw retention and normalized benchmark boundary.
- Operator confirmation that production target is correct.
- Read-only production preflight result capture.
- Backup/export or restore point plan.
- Rollback rehearsal expectation translated to production runbook.
- Production verify SQL expectation update for index count.
- RLS policy decision:
  - either default-deny tables only until API/policy Gate,
  - or separately approved RLS policies before app usage.
- Actor/auth strategy approval:
  - keep soft UUID references for migration,
  - defer direct `auth.users` FK unless Agent Core/Data Core approve.
- Change window and communication plan.

## 8. RLS / Policy Readiness

Current schema draft readiness:

- RLS enablement was verified in MMP.
- No broad anonymous policy was observed.
- The draft intentionally creates no RLS policies.

Production interpretation:

- The migration can only create default-deny protected tables unless policies are separately approved.
- Ordinary users should have no direct table access.
- Report/API serving views and access policies remain separate future work.

Decision:

```text
schema_rls_enablement_ready
production_access_policy_not_ready
```

## 9. Actor / Auth Reference Readiness

Current draft:

- Actor columns use soft UUID references.
- No direct FK to `auth.users` is created.
- This avoids coupling Foresight schema migration to unresolved Agent Core/auth ownership.

Production interpretation:

- Soft UUID references are acceptable for schema dry-run evidence.
- Production migration requires explicit approval that soft references are acceptable for the first migration.
- Direct `auth.users` FK should remain deferred unless Data Core and Agent Core approve it.

Decision:

```text
soft_uuid_strategy_conditionally_ready
direct_auth_fk_not_approved
```

## 10. Production Preflight Requirement

Production read-only preflight is required before any production schema apply.

Required checks:

- target project identity and environment classification.
- existing `foresight` schema/table/object conflicts.
- existing policies/grants for ordinary roles.
- `auth.users` availability.
- extension availability.
- production-looking warning and manual confirmation.
- backup/rollback readiness.
- SQL Editor warning/error status.

The MMP preflight and dry-run do not replace production preflight.

Decision:

```text
production_preflight_required
```

## 11. Production Backup / Rollback Expectation

Before production apply:

- capture read-only object inventory.
- record row count baseline for target objects.
- confirm backup/export or restore point.
- confirm rollback SQL targets only expected draft tables.
- confirm rollback decision authority.
- require a stop if any existing production object conflict appears.

Rollback expectation:

- rollback draft may be used only after production-specific review.
- production rollback must not be improvised from the MMP rehearsal.
- rollback must not drop unrelated schemas, storage, functions, policies, public documents/chunks, or shared Data Core objects.

## 12. Required Operator Approval

Production migration needs recorded approval from:

- Data Core owner.
- Foresight product/data owner.
- Security/governance reviewer.
- Supabase/DB operator.
- Rollback approver.
- Reviewer role/source owner.

Approval must include:

- exact production target.
- exact SQL files.
- execution order.
- preflight result.
- backup/rollback plan.
- stop conditions.
- sanitized reporting boundary.

## 13. Go / Conditional Go / Blocked

| Path | Decision |
| --- | --- |
| Production migration execution now | blocked |
| Production preflight planning | go |
| Production preflight execution after approval | conditional go |
| SQL draft expectation update for index count | go |
| Production schema apply after preflight and approvals | conditional go in later Gate only |

Final decision:

```text
go_to_production_preflight_and_index_expectation_update
blocked_for_production_schema_apply
```

## 14. Recommended Next Gate

Recommended next Gate:

```text
Foresight-Benchmark-21 production preflight and migration runbook preparation
```

Include:

- production read-only preflight SQL/runbook.
- index count expectation correction.
- backup/rollback checklist.
- approval checklist.
- exact stop conditions.
- production result capture template.

Optional parallel note:

```text
Foresight-Benchmark-20A verify expectation correction for index count
```

Use this if the team wants a small targeted doc/SQL review before the broader production runbook Gate.

## 15. Final Boundary

This decision accepts the MMP dry-run as non-production evidence only.

It does not authorize:

- production SQL execution.
- production schema/migration apply.
- production env changes.
- DB import/export automation.
- raw benchmark upload or promotion.
- Meta API sync.
- Python retrain.
- LLM processing of raw campaign-level data.
