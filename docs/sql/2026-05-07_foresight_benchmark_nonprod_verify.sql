-- AdMate Foresight benchmark nonprod verify SQL
-- Gate: Foresight-Benchmark-13
-- Review only. Run only after an approved non-production draft rehearsal.
-- Every statement in this file is read-only.

select
  count(*) as expected_table_count
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
  count(*) as rls_enabled_count
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

select
  indexname
from pg_indexes
where schemaname = 'foresight'
  and (
    indexname like 'benchmark_%'
    or indexname like 'normalized_benchmark_%'
  )
order by indexname;

select
  count(*) as draft_index_count
from pg_indexes
where schemaname = 'foresight'
  and (
    indexname like 'benchmark_%'
    or indexname like 'normalized_benchmark_%'
  );

select
  table_name,
  constraint_type,
  count(*) as constraint_count
from information_schema.table_constraints
where table_schema = 'foresight'
  and table_name in (
    'benchmark_uploads',
    'benchmark_dry_run_reports',
    'benchmark_review_events',
    'normalized_benchmark_rows',
    'benchmark_dataset_versions'
  )
group by table_name, constraint_type
order by table_name, constraint_type;

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

select 'benchmark_uploads' as table_name, count(*) as row_count from foresight.benchmark_uploads
union all
select 'benchmark_dry_run_reports', count(*) from foresight.benchmark_dry_run_reports
union all
select 'benchmark_review_events', count(*) from foresight.benchmark_review_events
union all
select 'normalized_benchmark_rows', count(*) from foresight.normalized_benchmark_rows
union all
select 'benchmark_dataset_versions', count(*) from foresight.benchmark_dataset_versions;

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
  count(*) as broad_anon_policy_count
from pg_policies
where schemaname = 'foresight'
  and roles::text similar to '%(anon|public)%';

select
  expected.table_name,
  expected.column_name,
  case
    when actual.column_name is null then 'missing'
    else 'present'
  end as column_status
from (
  select 'benchmark_uploads' as table_name, 'upload_id' as column_name
  union all select 'benchmark_uploads', 'source_type'
  union all select 'benchmark_uploads', 'platform'
  union all select 'benchmark_uploads', 'source_fingerprint'
  union all select 'benchmark_uploads', 'raw_file_retention_policy'
  union all select 'benchmark_uploads', 'raw_file_storage_ref'
  union all select 'benchmark_uploads', 'uploaded_by'
  union all select 'benchmark_uploads', 'status'
  union all select 'benchmark_dry_run_reports', 'report_id'
  union all select 'benchmark_dry_run_reports', 'upload_id'
  union all select 'benchmark_dry_run_reports', 'report_version'
  union all select 'benchmark_dry_run_reports', 'validation_status'
  union all select 'benchmark_dry_run_reports', 'approval_status'
  union all select 'benchmark_dry_run_reports', 'window_policy'
  union all select 'benchmark_review_events', 'event_id'
  union all select 'benchmark_review_events', 'upload_id'
  union all select 'benchmark_review_events', 'report_id'
  union all select 'benchmark_review_events', 'event_type'
  union all select 'benchmark_review_events', 'actor_id'
  union all select 'benchmark_review_events', 'actor_role'
  union all select 'normalized_benchmark_rows', 'benchmark_row_id'
  union all select 'normalized_benchmark_rows', 'dataset_version_id'
  union all select 'normalized_benchmark_rows', 'source_upload_id'
  union all select 'normalized_benchmark_rows', 'source_report_id'
  union all select 'normalized_benchmark_rows', 'source_fingerprint'
  union all select 'normalized_benchmark_rows', 'platform'
  union all select 'normalized_benchmark_rows', 'objective'
  union all select 'normalized_benchmark_rows', 'optimization_goal'
  union all select 'normalized_benchmark_rows', 'currency'
  union all select 'normalized_benchmark_rows', 'net_or_gross'
  union all select 'normalized_benchmark_rows', 'impressions'
  union all select 'normalized_benchmark_rows', 'clicks'
  union all select 'normalized_benchmark_rows', 'spend'
  union all select 'normalized_benchmark_rows', 'benchmark_window'
  union all select 'benchmark_dataset_versions', 'dataset_version_id'
  union all select 'benchmark_dataset_versions', 'dataset_scope'
  union all select 'benchmark_dataset_versions', 'version_label'
  union all select 'benchmark_dataset_versions', 'status'
  union all select 'benchmark_dataset_versions', 'row_count'
) expected
left join information_schema.columns actual
  on actual.table_schema = 'foresight'
  and actual.table_name = expected.table_name
  and actual.column_name = expected.column_name
order by expected.table_name, expected.column_name;

select
  'verify_summary' as check_group,
  case
    when (
      select count(*)
      from information_schema.tables
      where table_schema = 'foresight'
        and table_name in (
          'benchmark_uploads',
          'benchmark_dry_run_reports',
          'benchmark_review_events',
          'normalized_benchmark_rows',
          'benchmark_dataset_versions'
        )
    ) <> 5
      then 'STOP: table count mismatch'
    when (
      select count(*)
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
        and c.relrowsecurity = true
    ) <> 5
      then 'STOP: RLS count mismatch'
    when exists (
      select 1
      from pg_policies
      where schemaname = 'foresight'
        and roles::text similar to '%(anon|public)%'
    )
      then 'STOP: broad anon policy present'
    else 'verify results require reviewer signoff'
  end as recommended_action;
