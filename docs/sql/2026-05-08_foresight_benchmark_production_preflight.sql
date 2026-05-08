-- AdMate Foresight benchmark production preflight SQL
-- Gate: Foresight-Benchmark-22
-- Review only. Run only in the approved AdMate Data Core production target.
-- Every statement in this file is read-only.

select
  'current_database_schema' as check_group,
  current_database() as current_database_name,
  current_schema() as current_schema_name,
  current_user as current_role_name,
  current_setting('server_version') as server_version;

select
  'production_target_warning' as check_group,
  current_database() as target_name,
  case
    when lower(current_database()) similar to '%(prod|production|live|core)%'
      then 'production-looking target; manual confirmation required'
    else 'target name is not production-looking; manual confirmation still required'
  end as target_warning;

select
  'foresight_schema_count' as check_group,
  count(*) as foresight_schema_count
from information_schema.schemata
where schema_name = 'foresight';

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

select
  'existing_foresight_object_inventory' as check_group,
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'foresight'
order by c.relkind, c.relname;

select
  'extension_availability' as check_group,
  extname as extension_name,
  extversion as extension_version
from pg_extension
where extname in ('pgcrypto', 'uuid-ossp')
order by extname;

select
  'auth_users_availability' as check_group,
  count(*) as auth_users_table_count
from information_schema.tables
where table_schema = 'auth'
  and table_name = 'users';

select
  'openclaw_schema_table_baseline' as check_group,
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'openclaw'
order by table_name;

select
  'openclaw_account_model_candidates' as check_group,
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'openclaw'
  and lower(table_name) similar to '%(account|tenant|user|member|workspace|organization|org|profile)%'
order by table_name;

select
  'broad_anon_public_policy_count' as check_group,
  count(*) as broad_anon_public_policy_count
from pg_policies
where schemaname not in ('pg_catalog', 'information_schema')
  and roles::text similar to '%(anon|public)%';

select
  'broad_anon_public_policy_baseline' as check_group,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname not in ('pg_catalog', 'information_schema')
  and roles::text similar to '%(anon|public)%'
order by schemaname, tablename, policyname;

select
  'broad_grants_baseline' as check_group,
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema not in ('pg_catalog', 'information_schema')
  and grantee in ('anon', 'authenticated', 'public')
order by table_schema, table_name, grantee, privilege_type;

select
  'existing_foresight_policy_residue' as check_group,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'foresight'
order by tablename, policyname;

select
  'existing_foresight_grant_residue' as check_group,
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'foresight'
  and grantee in ('anon', 'authenticated', 'public')
order by table_name, grantee, privilege_type;

select
  'production_preflight_summary' as check_group,
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
    when exists (
      select 1
      from pg_policies
      where schemaname = 'foresight'
        and roles::text similar to '%(anon|public)%'
    )
      then 'STOP: broad foresight policy risk exists'
    when exists (
      select 1
      from information_schema.role_table_grants
      where table_schema = 'foresight'
        and grantee in ('anon', 'authenticated', 'public')
    )
      then 'STOP: broad foresight grant risk exists'
    else 'production preflight review required before migration runbook'
  end as recommended_action;
