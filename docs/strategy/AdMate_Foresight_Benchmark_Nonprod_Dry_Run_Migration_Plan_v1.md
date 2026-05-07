# AdMate Foresight Benchmark Nonprod Dry-run Migration Plan v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-12 non-production dry-run migration plan

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 Foresight benchmark schema draft를 production에 적용하기 전에, non-production 환경에서 dry-run migration을 어떻게 수행하고 검증할지 계획한다.

이번 Gate는 계획 문서화만 수행한다. DB 연결, SQL 실행, migration 적용, production env 변경, 코드/API 수정, raw Excel/CSV/model artifact 추가, Meta API 호출, Python retrain은 수행하지 않는다.

핵심 원칙:

```text
Plan the non-production rehearsal.
Do not connect to DB in this Gate.
Do not execute SQL in this Gate.
Do not apply schema in this Gate.
Do not touch production.
```

## 2. Reference Drafts

Review targets:

- `docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql`
- `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql`
- `docs/strategy/AdMate_Foresight_Benchmark_Schema_Draft_Review_v1.md`
- `docs/strategy/AdMate_Foresight_Normalized_Benchmark_Schema_Proposal_v1.md`

The SQL draft is review-only and not an approved migration. The rollback draft is also review-only and not approved for production execution.

## 3. Dry-run Objectives

The non-production dry-run should verify whether the review SQL draft can safely move toward a real migration plan.

Objectives:

1. Confirm schema draft syntax in a non-production database only.
2. Confirm table creation order and FK dependency order.
3. Confirm check constraints are valid and express the intended policy.
4. Confirm RLS can be enabled on all candidate tables.
5. Confirm index creation succeeds without unexpected name conflicts.
6. Confirm rollback draft order works after row count and backup/export guards.
7. Confirm no production-only object, grant, policy, or raw-data path is introduced.
8. Confirm remaining production blockers are explicit after the rehearsal.

Non-objectives:

- no production migration.
- no production data access.
- no raw Excel/CSV/model artifact loading.
- no seed data unless a later Gate approves synthetic-only fixtures.
- no API route or application code changes.
- no Meta API, DB import/export automation, Python retrain, or LLM call.

## 4. Non-production Environment Candidates

### 4.1 Separate Supabase Project

Description:

- a dedicated Supabase project created for Foresight schema rehearsal.
- no production data.
- no production storage buckets.
- no production secrets shared with the dry-run.

Pros:

- closest to hosted Supabase behavior.
- can test RLS enablement, policies later, and metadata inventory.
- can be discarded or reset.

Risks:

- requires explicit secret-safe connection handling.
- must not use production service credentials.
- project naming and access must make non-production status obvious.

Recommended use:

```text
Preferred if the team needs Supabase-hosted behavior before migration planning.
```

### 4.2 Local Supabase

Description:

- local Supabase stack used only for schema rehearsal.
- no external data.
- no production env file reuse.

Pros:

- low blast radius.
- easy reset.
- suitable for syntax, table, index, FK, and rollback rehearsal.

Risks:

- may differ from hosted Supabase extensions/settings.
- auth schema behavior may be different if local auth is not initialized.
- Windows/local runtime setup may add tooling variance.

Recommended use:

```text
Preferred for first rehearsal if local Supabase is already available and clean.
```

### 4.3 Disposable Schema in Non-critical Project

Description:

- create a temporary schema namespace in an existing non-critical non-production database.
- no production data and no production application traffic.

Pros:

- fastest if a non-critical database already exists.
- can test object-name conflicts and rollback.

Risks:

- existing schemas may create name collisions.
- grants/policies may be broader than expected.
- accidental dependency on a shared non-production project can obscure rollback results.

Recommended use:

```text
Allowed only when the project is explicitly non-production and disposable.
```

### 4.4 Production Direct Apply

Decision:

```text
Forbidden.
```

Production must not be used for this dry-run. If target identification is uncertain, stop.

## 5. Preflight Plan

Preflight must be read-only and must run before any schema draft apply in a later approved Gate.

This section lists candidate checks. They are not executed in this Gate.

### 5.1 Target Confirmation

Required confirmations:

- target project/environment is explicitly non-production.
- target contains no production data.
- target is approved for destructive rollback rehearsal.
- operator has written approval for this dry-run Gate execution.
- connection details are handled outside chat and never printed.

Stop if:

- project name, URL, owner, or environment tag is ambiguous.
- target could be production.
- production service credentials would be used.
- raw data or production storage is attached.

### 5.2 Schema and Table Existence

Read-only inventory candidate:

```sql
-- Candidate only. Do not run in this Gate.
select table_schema, table_name
from information_schema.tables
where table_schema = 'foresight'
order by table_name;
```

Expected before apply:

- either no `foresight` schema exists, or it is approved as disposable.
- none of the five draft table names exist unless the rehearsal is a reset/retry with explicit cleanup approval.

Stop if:

- any production-like table or non-disposable `foresight` object exists.
- existing table names conflict.
- existing schema ownership is unclear.

### 5.3 Auth/User Reference Strategy

Current draft strategy:

- actor fields are soft UUID references.
- no direct FK to `auth.users`.
- final actor source belongs to Agent Core/auth ownership decision.

Preflight check:

- confirm whether `auth` schema exists only for context.
- confirm no direct `auth.users` FK is expected in this draft.
- confirm reviewer/uploader/admin actor references will remain soft UUID in the rehearsal.

Stop if:

- reviewers expect direct `auth.users` FK in this dry-run.
- RLS tests require real users before actor model is approved.

### 5.4 Required Extensions

Current draft:

- no UUID generation default is used.
- UUID values are supplied as soft references.
- `jsonb`, `timestamptz`, and RLS are PostgreSQL/Supabase basics.

Candidate extension inventory:

```sql
-- Candidate only. Do not run in this Gate.
select extname
from pg_extension
order by extname;
```

Expected:

- no required extension for the current draft.
- if a later migration adds `gen_random_uuid()`, `pgcrypto` must be reviewed explicitly.

Stop if:

- SQL draft is modified to depend on an unapproved extension.
- extension install would require elevated production-like permission.

### 5.5 Existing `foresight` Schema Conflict

Conflict checks:

- existing `foresight` schema owner.
- existing tables, indexes, policies, grants, functions, triggers.
- whether rollback draft would affect non-draft objects.

Candidate inventory:

```sql
-- Candidate only. Do not run in this Gate.
select n.nspname as schema_name, c.relname as object_name, c.relkind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'foresight'
order by c.relkind, c.relname;
```

Stop if:

- schema contains non-disposable objects.
- rollback would remove objects not created by this dry-run.

### 5.6 Backup and Export Need

Before apply:

- if target is empty/disposable, document reset path.
- if target has any existing object, document backup/export.
- record preflight inventory output as sanitized artifact outside this repo unless approved.

Minimum backup/export decision:

| Target state | Required action |
| --- | --- |
| brand-new disposable target | record target id/name and reset path |
| existing non-critical schema with no data | schema inventory and owner confirmation |
| existing tables or rows | backup/export required before apply |
| any production-like data | stop |

### 5.7 Service Role and Connection Secret-safe Handling

Rules:

- never paste connection strings, service role values, tokens, or passwords into chat or docs.
- never commit env files.
- prefer a local operator-run command outside this Gate.
- store command transcript only after redacting credentials and project URL if needed.
- use least privilege where possible.
- revoke or rotate temporary dry-run credentials after rehearsal if issued.

Stop if:

- the only available credential is production.
- a command or log would print secret values.
- a service role credential would be reused in a public or shared environment.

## 6. Execution Order Candidate

This is the proposed sequence for a later approved execution Gate. It is not executed now.

### 6.1 Step 1: Preflight Read-only

Actions:

- confirm target is non-production.
- inventory existing schema/table/index/policy/grant state.
- confirm no production data.
- confirm soft UUID actor strategy.
- confirm extension requirements.
- confirm backup/export/reset path.

Expected output:

- sanitized preflight report.
- environment classification.
- proceed/stop decision.

### 6.2 Step 2: Schema Draft Apply

Actions:

- apply `docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql` in non-production only.
- do not insert rows.
- do not attach production data.
- do not create RLS policies beyond RLS enable statements in the draft.

Expected output:

- schema objects created.
- RLS enabled.
- indexes created.
- no rows in candidate tables.

### 6.3 Step 3: Verify SQL

Actions:

- run read-only verification queries.
- confirm table count, RLS state, index count, constraints, FK/soft reference assumptions, row counts, grants/policies.

Expected output:

- sanitized verification report.
- pass/fail per check.

### 6.4 Step 4: Rollback Rehearsal

Actions:

- confirm row count guard.
- confirm backup/export guard.
- run rollback draft in reverse order.
- do not drop schema namespace unless separately approved.

Expected output:

- candidate tables removed.
- no unexpected objects remain.
- rollback result report.

### 6.5 Step 5: Post-rollback Verify

Actions:

- verify candidate tables are absent.
- verify schema namespace state is expected.
- verify no orphan indexes/policies remain.
- verify target can be reset cleanly.

Expected output:

- post-rollback verification report.

### 6.6 Step 6: Result Report

Report should include:

- target classification, without secrets.
- preflight result.
- apply result.
- verify result.
- rollback result.
- blocker list.
- recommended next Gate decision.

Do not include:

- connection string.
- service credentials.
- raw project URL if treated as sensitive.
- raw data rows.
- production metadata.

## 7. Verify SQL Candidates

These queries are candidates for a later non-production execution Gate only. Do not run them in this Gate.

### 7.1 Table Count

```sql
-- Candidate only. Do not run in this Gate.
select count(*) as draft_table_count
from information_schema.tables
where table_schema = 'foresight'
  and table_name in (
    'benchmark_uploads',
    'benchmark_dry_run_reports',
    'benchmark_review_events',
    'normalized_benchmark_rows',
    'benchmark_dataset_versions'
  );
```

Expected:

```text
draft_table_count = 5
```

### 7.2 RLS Enabled Count

```sql
-- Candidate only. Do not run in this Gate.
select count(*) as rls_enabled_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'foresight'
  and c.relname in (
    'benchmark_uploads',
    'benchmark_dry_run_reports',
    'benchmark_review_events',
    'normalized_benchmark_rows',
    'benchmark_dataset_versions'
  )
  and c.relrowsecurity = true;
```

Expected:

```text
rls_enabled_count = 5
```

### 7.3 Index Count

```sql
-- Candidate only. Do not run in this Gate.
select count(*) as draft_index_count
from pg_indexes
where schemaname = 'foresight'
  and indexname like 'benchmark_%'
   or indexname like 'normalized_benchmark_%';
```

Expected:

- count should match the index candidates in the SQL draft.
- review exact index list, not count only.

Note:

- final query should wrap the `or` predicates before execution review.

### 7.4 Constraint Count

```sql
-- Candidate only. Do not run in this Gate.
select table_name, constraint_type, count(*) as constraint_count
from information_schema.table_constraints
where table_schema = 'foresight'
group by table_name, constraint_type
order by table_name, constraint_type;
```

Expected:

- primary key constraints on all five tables.
- check constraints for status, privacy, metric, and policy fields.
- FK constraints only between proposed benchmark tables.

### 7.5 FK and Soft Reference Confirmation

```sql
-- Candidate only. Do not run in this Gate.
select
  tc.table_name,
  tc.constraint_name,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table
from information_schema.table_constraints tc
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'foresight'
  and tc.constraint_type = 'FOREIGN KEY'
order by tc.table_name, tc.constraint_name;
```

Expected:

- FK references should point only to the proposed benchmark tables.
- no FK to `auth.users`.
- actor fields remain soft UUID references.

### 7.6 Row Count Zero

```sql
-- Candidate only. Do not run in this Gate.
select 'benchmark_uploads' as table_name, count(*) as row_count from foresight.benchmark_uploads
union all
select 'benchmark_dry_run_reports', count(*) from foresight.benchmark_dry_run_reports
union all
select 'benchmark_review_events', count(*) from foresight.benchmark_review_events
union all
select 'normalized_benchmark_rows', count(*) from foresight.normalized_benchmark_rows
union all
select 'benchmark_dataset_versions', count(*) from foresight.benchmark_dataset_versions;
```

Expected:

```text
all row_count values = 0
```

### 7.7 No Broad Anonymous Policy

```sql
-- Candidate only. Do not run in this Gate.
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'foresight'
order by tablename, policyname;
```

Expected:

- no broad anonymous policy.
- because draft only enables RLS and does not create policies, policy count should be zero unless target has existing objects.

Stop if:

- any policy grants broad read/write to anonymous or ordinary users.
- any policy existed before dry-run and conflicts with default-deny expectations.

## 8. Rollback Rehearsal Plan

Rollback draft:

- `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql`

### 8.1 Reverse-order Drop

Rollback order:

1. `foresight.normalized_benchmark_rows`
2. `foresight.benchmark_review_events`
3. `foresight.benchmark_dry_run_reports`
4. `foresight.benchmark_dataset_versions`
5. `foresight.benchmark_uploads`

Reason:

- remove dependent fact rows first.
- remove event/report dependencies before upload.
- leave proposal namespace handling to Data Core decision.

### 8.2 Row Count Guard

Before rollback:

- confirm all candidate table row counts.
- if rows exist, confirm they are synthetic/dry-run only.
- if any row may be production-like, stop.

Rollback should not proceed if:

- row count is unexpected.
- source data cannot be classified as synthetic/non-production.
- backup/export was required but not completed.

### 8.3 Backup/Export Guard

Before rollback:

- if target is disposable and empty, record reset path.
- if target has any rows, export or backup according to approved plan.
- if target has non-draft objects, stop unless exclusion is proven.

No backup/export command is executed in this Gate.

### 8.4 Post-rollback Empty Check

Candidate check:

```sql
-- Candidate only. Do not run in this Gate.
select table_name
from information_schema.tables
where table_schema = 'foresight'
  and table_name in (
    'benchmark_uploads',
    'benchmark_dry_run_reports',
    'benchmark_review_events',
    'normalized_benchmark_rows',
    'benchmark_dataset_versions'
  )
order by table_name;
```

Expected:

```text
no rows returned
```

### 8.5 Rollback Result Report

Rollback report should include:

- pre-rollback row counts.
- backup/export decision.
- rollback execution status.
- post-rollback inventory.
- unexpected object list.
- final recommendation.

Do not include:

- connection secrets.
- raw data rows.
- production object metadata.

## 9. Stop Conditions

Stop the dry-run immediately if any condition below is true.

| Stop condition | Reason |
| --- | --- |
| target is production or unclear | production direct apply is forbidden |
| existing table conflict | rollback could remove non-draft objects |
| `auth.users` strategy mismatch | actor model is not approved |
| RLS cannot be enabled | default-deny posture cannot be validated |
| rollback rehearsal fails | migration cannot be trusted |
| unexpected grants or policies | ordinary user exposure risk |
| production service credential required | secret and blast-radius risk |
| raw data is present | raw campaign data must not be used in this rehearsal |
| draft needs unapproved extension | environment dependency not reviewed |
| schema owner is unknown | namespace/Data Core ownership unresolved |

If stopped:

- do not continue manually.
- record sanitized reason.
- return to planning Gate.

## 10. Production Readiness Conditions

Production migration remains blocked until all conditions below are met.

1. Non-production dry-run apply succeeds.
2. Non-production verification queries pass.
3. Rollback rehearsal succeeds.
4. Backup/export plan is approved and rehearsed.
5. Data Core target schema decision is finalized.
6. Reviewer role source is finalized.
7. Auth/actor reference policy is finalized.
8. RLS policies and tests are designed.
9. Raw retention policy is finalized.
10. Source fingerprint/hash policy is finalized.
11. Status enum/check/lookup strategy is finalized.
12. Metric precision and derived metric policy are finalized.
13. Report-safe serving view/API boundary is finalized.
14. Benchmark upload/dry-run/review API implementation plan is separated from migration.
15. Production rollback strategy is approved.

Production readiness does not include:

- importing real raw files.
- training models.
- syncing Meta API.
- forwarding raw rows to LLM.
- enabling public upload routes.

## 11. Result Report Template

A later execution Gate should produce a report with this shape:

```text
environment:
  target_classification:
  target_owner:
  production_exclusion_confirmed:

preflight:
  schema_conflict_status:
  auth_strategy_status:
  extension_status:
  backup_export_status:
  secret_handling_status:

apply:
  schema_draft_file:
  apply_status:
  errors_sanitized:

verify:
  table_count:
  rls_enabled_count:
  index_count:
  constraint_summary:
  fk_soft_reference_status:
  row_count_status:
  anon_policy_status:

rollback:
  pre_rollback_row_counts:
  backup_export_guard:
  rollback_status:
  post_rollback_empty_status:

decision:
  blockers:
  ready_for_next_gate:
  production_ready:
```

## 12. Follow-up Gates

### Foresight-Benchmark-13: Nonprod Preflight SQL Preparation

Scope candidate:

- prepare read-only preflight SQL bundle.
- include schema/table/index/RLS/policy/grant inventory.
- no DB connection or execution unless separately approved.

### Foresight-Benchmark-14: Nonprod Dry-run Execution

Scope candidate:

- execute approved dry-run in selected non-production target.
- apply draft, verify, rollback rehearsal, and post-rollback verify.
- no production target, no raw data, no API/code changes.

### Foresight-Benchmark-15: Production Readiness Review

Scope candidate:

- review non-production results.
- decide remaining production blockers.
- confirm whether a real migration plan can be prepared.

## 13. Final Recommendation

Benchmark-12 recommends:

```text
1. Use non-production only.
2. Treat production, unclear target, raw data, or credential exposure as stop conditions.
3. Run read-only preflight before any apply in a later Gate.
4. Apply the schema draft only after explicit approval.
5. Verify table/RLS/index/constraint/FK/row-count/policy state.
6. Rehearse rollback before any production readiness claim.
7. Keep API implementation and real data promotion in separate Gates.
```
