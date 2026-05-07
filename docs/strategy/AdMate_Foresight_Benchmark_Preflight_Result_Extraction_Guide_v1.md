# AdMate Foresight Benchmark Preflight Result Extraction Guide v1

작성일: 2026-05-07

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 `docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql` 실행 결과가 `preflight_summary` 한 줄만 수집되는 문제를 해결하기 위한 extraction guide다.

이번 Gate는 SQL 파일 검토와 결과 추출 가이드 작성만 수행한다. DB 연결, SQL 실행, schema draft 실행, verify 실행, rollback 실행, migration/schema 적용, 코드/API 수정, commit/push는 수행하지 않는다.

## 2. Finding

`2026-05-07_foresight_benchmark_nonprod_preflight.sql`은 단일 결과표 SQL이 아니라 read-only `SELECT` 12개로 구성되어 있다.

Result groups:

1. current database/schema
2. production-looking target warning
3. `foresight` schema count
4. `foresight` table list
5. existing draft table conflict count
6. `foresight` object inventory
7. extension availability
8. `auth.users` availability
9. policy baseline
10. grant baseline
11. `foresight` column count
12. preflight summary

Supabase SQL Editor에서 전체 파일을 한 번에 실행하면 UI 상태, result tab 선택, copy 방식에 따라 마지막 결과 grid만 보거나 복사할 수 있다. 현재 받은 `preflight_summary` 한 줄은 마지막 `SELECT` 결과만 수집된 상태로 보며, full 판정에는 부족하다.

## 3. Extraction Rule

For the next human-operated capture:

1. Open the existing preflight SQL in Supabase SQL Editor.
2. Select one query block at a time, including the final semicolon.
3. Run only the selected block.
4. Copy the sanitized result for that block.
5. Repeat for all 12 blocks below.
6. Do not run schema draft, verify SQL, rollback SQL, or ad hoc follow-up SQL.

If SQL Editor still shows only one grid, use the `check_group` value from each block below to label the copied result.

## 4. Split Read-only Query Blocks

The following blocks are read-only `SELECT` candidates copied from the existing preflight intent with explicit `check_group` labels. They are provided for manual block-by-block execution in a later approved human-operated Gate only.

### 4.1 Current Database / Schema

```sql
select
  'current_database_schema' as check_group,
  current_database() as current_database_name,
  current_schema() as current_schema_name,
  current_user as current_role_name,
  current_setting('server_version') as server_version;
```

Capture fields:

- current database name
- current schema name
- current role category/name if safe
- server version

### 4.2 Production-looking Target Warning

```sql
select
  'production_looking_warning' as check_group,
  current_database() as target_name,
  case
    when lower(current_database()) similar to '%(prod|production|live)%'
      then 'STOP: target name looks production-like'
    else 'review target name manually'
  end as target_warning;
```

Capture fields:

- target warning
- manual confirmation that the SQL Editor target is `Admate_AI_MMP`
- manual confirmation that target is not AdMate Data Core production

### 4.3 `foresight` Schema Count

```sql
select
  'foresight_schema_count' as check_group,
  count(*) as foresight_schema_count
from information_schema.schemata
where schema_name = 'foresight';
```

Capture fields:

- `foresight` schema count
- owner-approved disposable status if count is greater than zero

### 4.4 `foresight` Table List

```sql
select
  'foresight_table_list' as check_group,
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'foresight'
order by table_name;
```

Capture fields:

- table count/list
- whether any table is shared, non-disposable, or unexpected

If no rows are returned, report:

```text
foresight_table_list: no rows
```

### 4.5 Existing Draft Table Conflict Count

```sql
select
  'existing_draft_table_count' as check_group,
  count(*) as existing_draft_table_count
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

Capture fields:

- existing draft table count

Expected clean result:

```text
0
```

### 4.6 `foresight` Object Inventory

```sql
select
  'foresight_object_inventory' as check_group,
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'foresight'
order by c.relkind, c.relname;
```

Capture fields:

- object count by kind
- sanitized object names only when needed for conflict review

If no rows are returned, report:

```text
foresight_object_inventory: no rows
```

### 4.7 Extension Availability

```sql
select
  'extension_availability' as check_group,
  extname as extension_name,
  extversion as extension_version
from pg_extension
where extname in ('pgcrypto', 'uuid-ossp')
order by extname;
```

Capture fields:

- `pgcrypto` present yes/no
- `uuid-ossp` present yes/no
- version only if safe

Current draft note:

- Missing extension is not automatically blocking for the current draft because UUID values are supplied by the caller.
- If a later draft depends on extension-backed UUID defaults, re-review is required.

### 4.8 `auth.users` Availability

```sql
select
  'auth_users_availability' as check_group,
  count(*) as auth_users_table_count
from information_schema.tables
where table_schema = 'auth'
  and table_name = 'users';
```

Capture fields:

- `auth.users` table count
- whether direct `auth.users` FK is required
- whether soft UUID actor strategy remains acceptable

### 4.9 Policy Baseline

```sql
select
  'policy_baseline' as check_group,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'foresight'
order by tablename, policyname;
```

Capture fields:

- policy count
- roles summary
- command summary
- broad `anon`, `public`, or ordinary-user exposure risk

If no rows are returned, report:

```text
policy_baseline: no rows
```

### 4.10 Grant Baseline

```sql
select
  'grant_baseline' as check_group,
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'foresight'
  and grantee in ('anon', 'authenticated', 'public')
order by table_name, grantee, privilege_type;
```

Capture fields:

- grant count
- grantee summary
- privilege summary
- broad read/write risk

If no rows are returned, report:

```text
grant_baseline: no rows
```

### 4.11 `foresight` Column Count

```sql
select
  'foresight_column_count' as check_group,
  table_schema,
  table_name,
  count(*) as column_count
from information_schema.columns
where table_schema = 'foresight'
group by table_schema, table_name
order by table_name;
```

Capture fields:

- table-level column count summary
- conflict with expected draft table shape if any

If no rows are returned, report:

```text
foresight_column_count: no rows
```

### 4.12 Preflight Summary

```sql
select
  'preflight_summary' as check_group,
  case
    when exists (
      select 1
      from information_schema.tables
      where table_schema = 'foresight'
        and table_name in (
          'benchmark_uploads',
          'benchmark_dry_run_reports',
          'benchmark_review_events',
          'normalized_benchmark_rows',
          'benchmark_dataset_versions'
        )
    )
      then 'STOP: draft table conflict exists'
    when lower(current_database()) similar to '%(prod|production|live)%'
      then 'STOP: target name looks production-like'
    else 'preflight review required before apply rehearsal'
  end as recommended_action;
```

Capture fields:

- recommended action
- any `STOP` result

## 5. Required Final Capture Bundle

After block-by-block extraction, the user should return one sanitized bundle:

```text
project_confirmation:
  project_label: Admate_AI_MMP
  sql_editor_target_confirmed:
  not_admate_data_core_production:
  sql_executed_block_by_block:
  schema_draft_executed:
  verify_executed:
  rollback_executed:

current_database_schema:
  current_database_name:
  current_schema_name:
  current_role_category:
  server_version:

production_warning:
  target_warning:
  manual_target_review:

schema_table_conflict:
  foresight_schema_count:
  foresight_table_list:
  existing_draft_table_count:
  foresight_object_inventory:
  foresight_column_count:

extension_availability:
  pgcrypto:
  uuid_ossp:
  extension_blocker:

auth_users_availability:
  auth_users_table_count:
  direct_fk_required:
  soft_uuid_strategy_acceptable:

policy_grant_baseline:
  policy_baseline:
  grant_baseline:
  broad_policy_or_grant_risk:

sql_error_warning:
  sql_editor_error:
  sql_editor_warning:
  output_redacted:

preflight_summary:
  recommended_action:
```

Allowed values:

- yes/no
- counts
- `no rows`
- sanitized object names only when needed for conflict review
- sanitized warning/error summaries

Forbidden values:

- connection strings
- credential-bearing URLs
- secret values
- service credentials
- session values
- raw campaign rows
- raw provider responses
- advertiser, account, campaign, ad set, or ad identifiers

## 6. Decision Logic After Extraction

Proceed remains forbidden until all required result groups are present.

### 6.1 Proceed Candidate

Proceed to an MMP schema dry-run execution plan only if:

- all 12 split blocks are captured.
- target is confirmed as `Admate_AI_MMP`.
- target is confirmed not production.
- schema draft, verify, and rollback were not executed.
- `target_warning` is not `STOP`.
- `preflight_summary` is not `STOP`.
- existing draft table count is `0`.
- no non-disposable `foresight` objects exist.
- policy/grant baseline has no broad ordinary-user risk.
- SQL Editor error/warning status is clean or non-blocking.

### 6.2 Blocked

Remain blocked if:

- any block is missing.
- SQL Editor target is unclear.
- production exclusion is missing.
- conflict inventory is incomplete.
- policy/grant baseline is missing.
- SQL warning/error status is missing.

### 6.3 Needs Revision

Mark needs revision if:

- MMP fallback is still viable but the `foresight` schema name conflicts.
- extension assumptions changed.
- soft UUID actor strategy needs review.
- split extraction shows an object naming conflict that can be solved by a disposable schema name change.

### 6.4 Fallback Rejected

Reject MMP fallback if:

- target appears production-like or ambiguous.
- draft table conflict exists.
- `foresight` has shared/non-disposable objects.
- broad ordinary-user policy/grant risk exists.
- SQL Editor errors indicate unsafe or unsupported target state.
- sanitized result capture is not possible.

## 7. Next Gate Recommendation

After the user returns the full extracted bundle:

- `Foresight-Benchmark-17C MMP extracted preflight result review`

Possible outcomes:

- clean: `Foresight-Benchmark-18 MMP schema dry-run execution plan`
- incomplete: repeat extraction using this guide
- conflict/risk: `Foresight-Benchmark-18 MMP fallback rejection or SQL draft revision review`

Do not proceed directly from this guide to schema draft execution.
