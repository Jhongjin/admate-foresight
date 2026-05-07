-- AdMate Foresight benchmark nonprod post-rollback verify SQL
-- Gate: Foresight-Benchmark-13
-- Review only. Run only after an approved non-production rollback rehearsal.
-- Every statement in this file is read-only.

select
  table_schema,
  table_name
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

select
  count(*) as remaining_draft_table_count
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
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'foresight'
order by tablename, policyname;

select
  schemaname,
  indexname
from pg_indexes
where schemaname = 'foresight'
  and (
    indexname like 'benchmark_%'
    or indexname like 'normalized_benchmark_%'
  )
order by indexname;

select
  table_schema,
  count(*) as table_count
from information_schema.tables
where table_schema not in ('foresight', 'information_schema', 'pg_catalog')
group by table_schema
order by table_schema;

select
  'post_rollback_summary' as check_group,
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
      then 'STOP: draft tables still present'
    when exists (
      select 1
      from pg_indexes
      where schemaname = 'foresight'
        and (
          indexname like 'benchmark_%'
          or indexname like 'normalized_benchmark_%'
        )
    )
      then 'STOP: draft indexes still present'
    else 'post-rollback review required'
  end as recommended_action;
