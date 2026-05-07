-- AdMate Foresight benchmark nonprod preflight SQL
-- Gate: Foresight-Benchmark-13
-- Review only. Run only in an approved non-production target.
-- Every statement in this file is read-only.

select
  current_database() as current_database_name,
  current_schema() as current_schema_name,
  current_user as current_role_name,
  current_setting('server_version') as server_version;

select
  current_database() as target_name,
  case
    when lower(current_database()) similar to '%(prod|production|live)%'
      then 'STOP: target name looks production-like'
    else 'review target name manually'
  end as target_warning;

select
  count(*) as foresight_schema_count
from information_schema.schemata
where schema_name = 'foresight';

select
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'foresight'
order by table_name;

select
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
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'foresight'
order by c.relkind, c.relname;

select
  extname as extension_name,
  extversion as extension_version
from pg_extension
where extname in ('pgcrypto', 'uuid-ossp')
order by extname;

select
  count(*) as auth_users_table_count
from information_schema.tables
where table_schema = 'auth'
  and table_name = 'users';

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'foresight'
order by tablename, policyname;

select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'foresight'
  and grantee in ('anon', 'authenticated', 'public')
order by table_name, grantee, privilege_type;

select
  table_schema,
  table_name,
  count(*) as column_count
from information_schema.columns
where table_schema = 'foresight'
group by table_schema, table_name
order by table_name;

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
