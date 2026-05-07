-- AdMate Foresight benchmark schema draft
-- Gate: Foresight-Benchmark-11 schema draft SQL preparation
-- Date: 2026-05-07
--
-- REVIEW ONLY. DO NOT EXECUTE.
--
-- This file is a SQL draft for review. It is not a migration file and must not
-- be applied to any database until a later approved Gate resolves the blockers
-- below.
--
-- Preflight blockers before any execution:
-- 1. AdMate Data Core target schema decision.
-- 2. Non-production database target and dry-run plan.
-- 3. Backup/export and rollback rehearsal plan.
-- 4. RLS actor and reviewer role source.
-- 5. Raw retention and approved storage policy.
-- 6. Status enum/check seed ownership.
-- 7. Report-safe serving view/API boundary.
--
-- Namespace note:
-- The `foresight` schema is a proposal namespace only. Production placement
-- must wait for the AdMate Data Core target schema decision.
--
-- Actor FK note:
-- Actor columns in this draft use soft UUID references. They intentionally do
-- not reference `auth.users` directly because Agent Core/auth ownership and
-- reviewer role source are unresolved.
--
-- Raw data boundary:
-- This draft does not create raw file content columns and does not create raw
-- campaign/account/ad identifier columns. Identifier lineage must remain
-- fingerprinted, masked, aggregated, or review-only by future policy.

CREATE SCHEMA IF NOT EXISTS foresight;

CREATE TABLE foresight.benchmark_uploads (
  upload_id uuid PRIMARY KEY,
  source_type text NOT NULL,
  platform text NOT NULL,
  source_fingerprint text NOT NULL,
  source_name_masked text,
  file_type text NOT NULL,
  file_size_bucket text,
  raw_file_retention_policy text NOT NULL DEFAULT 'do_not_store',
  raw_file_storage_ref text,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  upload_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT benchmark_uploads_source_type_check
    CHECK (source_type IN ('dashboard_export', 'meta_api_export')),
  CONSTRAINT benchmark_uploads_platform_check
    CHECK (platform IN ('meta')),
  CONSTRAINT benchmark_uploads_file_type_check
    CHECK (file_type IN ('csv', 'xlsx', 'xls', 'inline_mock', 'future')),
  CONSTRAINT benchmark_uploads_retention_policy_check
    CHECK (raw_file_retention_policy IN (
      'do_not_store',
      'temporary_restricted_hold',
      'restricted_source_evidence',
      'security_hold'
    )),
  CONSTRAINT benchmark_uploads_raw_file_ref_disabled_check
    CHECK (raw_file_storage_ref IS NULL),
  CONSTRAINT benchmark_uploads_status_check
    CHECK (status IN (
      'draft',
      'dry_run_completed',
      'review_requested',
      'rejected',
      'approved_for_normalization',
      'revoked'
    )),
  CONSTRAINT benchmark_uploads_source_fingerprint_not_blank_check
    CHECK (length(trim(source_fingerprint)) > 0)
);

COMMENT ON TABLE foresight.benchmark_uploads IS
  'Review draft. Sanitized upload metadata only. No raw file content or raw campaign rows.';
COMMENT ON COLUMN foresight.benchmark_uploads.raw_file_storage_ref IS
  'Disabled candidate. Must remain null until retention and restricted storage policy are approved.';
COMMENT ON COLUMN foresight.benchmark_uploads.uploaded_by IS
  'Soft UUID actor reference candidate. No direct auth.users FK in this draft.';

CREATE TABLE foresight.benchmark_dataset_versions (
  dataset_version_id uuid PRIMARY KEY,
  dataset_scope text NOT NULL DEFAULT 'default',
  version_label text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  benchmark_window_start date NOT NULL,
  benchmark_window_end date NOT NULL,
  contains_long_term_rows boolean NOT NULL DEFAULT false,
  row_count integer NOT NULL DEFAULT 0,
  source_upload_count integer NOT NULL DEFAULT 0,
  approved_by uuid,
  activated_by uuid,
  activated_at timestamptz,
  deprecated_at timestamptz,
  deprecation_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes_sanitized jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT benchmark_dataset_versions_status_check
    CHECK (status IN ('draft', 'active', 'deprecated', 'revoked')),
  CONSTRAINT benchmark_dataset_versions_window_order_check
    CHECK (benchmark_window_start <= benchmark_window_end),
  CONSTRAINT benchmark_dataset_versions_row_count_check
    CHECK (row_count >= 0),
  CONSTRAINT benchmark_dataset_versions_upload_count_check
    CHECK (source_upload_count >= 0),
  CONSTRAINT benchmark_dataset_versions_scope_not_blank_check
    CHECK (length(trim(dataset_scope)) > 0),
  CONSTRAINT benchmark_dataset_versions_label_not_blank_check
    CHECK (length(trim(version_label)) > 0)
);

COMMENT ON TABLE foresight.benchmark_dataset_versions IS
  'Review draft. Dataset release metadata for approved normalized benchmark rows.';
COMMENT ON COLUMN foresight.benchmark_dataset_versions.approved_by IS
  'Soft UUID actor reference candidate. Final FK policy depends on Agent Core/Data Core.';
COMMENT ON COLUMN foresight.benchmark_dataset_versions.notes_sanitized IS
  'Sanitized notes only. No raw upload details, raw provider response, or raw identifiers.';

CREATE TABLE foresight.benchmark_dry_run_reports (
  report_id uuid PRIMARY KEY,
  upload_id uuid NOT NULL REFERENCES foresight.benchmark_uploads(upload_id),
  report_version integer NOT NULL DEFAULT 1,
  schema_mapping_version text NOT NULL,
  parser_profile text,
  validation_status text NOT NULL,
  approval_status text NOT NULL,
  window_policy text NOT NULL,
  excluded_from_default_benchmark boolean NOT NULL DEFAULT true,
  blocker_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  missing_required_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  mapping_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  accepted_columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejected_columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  derived_metric_preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  privacy_findings jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_preview_sample jsonb NOT NULL DEFAULT '[]'::jsonb,
  side_effects jsonb NOT NULL DEFAULT '{
    "db_write": false,
    "meta_api_call": false,
    "llm_call": false,
    "python_retrain": false,
    "raw_file_created": false
  }'::jsonb,
  generated_by uuid NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT benchmark_dry_run_reports_version_check
    CHECK (report_version >= 1),
  CONSTRAINT benchmark_dry_run_reports_validation_status_check
    CHECK (validation_status IN ('passed', 'warning', 'failed', 'security_failed')),
  CONSTRAINT benchmark_dry_run_reports_approval_status_check
    CHECK (approval_status IN ('validated', 'warning', 'rejected', 'security_review_required')),
  CONSTRAINT benchmark_dry_run_reports_window_policy_check
    CHECK (window_policy IN (
      'recent_6_months',
      'long_term_trend',
      'mixed_window',
      'date_unparseable'
    )),
  CONSTRAINT benchmark_dry_run_reports_counts_check
    CHECK (blocker_count >= 0 AND warning_count >= 0),
  CONSTRAINT benchmark_dry_run_reports_security_preview_check
    CHECK (validation_status <> 'security_failed' OR normalized_preview_sample = '[]'::jsonb),
  CONSTRAINT benchmark_dry_run_reports_side_effects_check
    CHECK (side_effects = '{
      "db_write": false,
      "meta_api_call": false,
      "llm_call": false,
      "python_retrain": false,
      "raw_file_created": false
    }'::jsonb),
  CONSTRAINT benchmark_dry_run_reports_unique_version
    UNIQUE (upload_id, report_version)
);

COMMENT ON TABLE foresight.benchmark_dry_run_reports IS
  'Review draft. Sanitized dry-run evidence only. JSON fields must not contain raw rows or unsafe values.';
COMMENT ON COLUMN foresight.benchmark_dry_run_reports.generated_by IS
  'Soft UUID internal actor reference candidate.';
COMMENT ON COLUMN foresight.benchmark_dry_run_reports.normalized_preview_sample IS
  'Masked/aggregate preview only. Must be empty for security_failed reports.';

CREATE TABLE foresight.benchmark_review_events (
  event_id uuid PRIMARY KEY,
  upload_id uuid REFERENCES foresight.benchmark_uploads(upload_id),
  report_id uuid REFERENCES foresight.benchmark_dry_run_reports(report_id),
  dataset_version_id uuid REFERENCES foresight.benchmark_dataset_versions(dataset_version_id),
  event_type text NOT NULL,
  actor_id uuid NOT NULL,
  actor_role text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT now(),
  decision text,
  reason_code text,
  reason_text_sanitized text,
  accepted_warning_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  correction_required_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  trace_id text NOT NULL,
  input_fingerprint text,
  audit_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT benchmark_review_events_type_check
    CHECK (event_type IN (
      'benchmark_upload_submitted',
      'benchmark_dry_run_completed',
      'benchmark_review_requested',
      'benchmark_approved',
      'benchmark_rejected',
      'benchmark_correction_requested',
      'benchmark_promoted_to_normalized_dataset',
      'benchmark_dataset_version_activated',
      'benchmark_dataset_version_deprecated',
      'benchmark_raw_file_retention_expired',
      'benchmark_security_review_requested'
    )),
  CONSTRAINT benchmark_review_events_actor_role_check
    CHECK (actor_role IN ('uploader', 'reviewer', 'admin', 'data_steward', 'internal')),
  CONSTRAINT benchmark_review_events_decision_check
    CHECK (decision IS NULL OR decision IN (
      'approve',
      'approve_with_warning',
      'reject',
      'request_correction',
      'trend_only',
      'aggregate_only'
    )),
  CONSTRAINT benchmark_review_events_trace_not_blank_check
    CHECK (length(trim(trace_id)) > 0)
);

COMMENT ON TABLE foresight.benchmark_review_events IS
  'Review draft. Append-oriented audit event candidate. Payloads must be sanitized.';
COMMENT ON COLUMN foresight.benchmark_review_events.actor_id IS
  'Soft UUID actor reference candidate. No direct auth.users FK in this draft.';
COMMENT ON COLUMN foresight.benchmark_review_events.reason_text_sanitized IS
  'Sanitized reviewer rationale only. No raw advertiser, campaign, account, or unsafe source detail.';

CREATE TABLE foresight.normalized_benchmark_rows (
  benchmark_row_id uuid PRIMARY KEY,
  dataset_version_id uuid NOT NULL REFERENCES foresight.benchmark_dataset_versions(dataset_version_id),
  source_upload_id uuid NOT NULL REFERENCES foresight.benchmark_uploads(upload_id),
  source_report_id uuid NOT NULL REFERENCES foresight.benchmark_dry_run_reports(report_id),
  source_fingerprint text NOT NULL,
  platform text NOT NULL,
  source_type text NOT NULL,
  date_start date NOT NULL,
  date_stop date NOT NULL,
  period_granularity text NOT NULL,
  objective text NOT NULL,
  optimization_goal text NOT NULL,
  currency text NOT NULL,
  net_or_gross text NOT NULL,
  markup_policy text NOT NULL,
  impressions numeric NOT NULL,
  clicks numeric NOT NULL,
  reach numeric,
  spend numeric NOT NULL,
  cpm numeric,
  cpc numeric,
  ctr numeric,
  frequency numeric,
  industry text,
  age_range text,
  gender text,
  device text,
  placement text,
  creative_format text,
  region text,
  breakdown_signature text,
  aggregation_level text,
  sample_size integer NOT NULL,
  confidence_bucket text NOT NULL,
  benchmark_window text NOT NULL,
  reviewer_status text NOT NULL,
  warning_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitation_notes_sanitized jsonb NOT NULL DEFAULT '{}'::jsonb,
  metric_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  privacy_boundary_status text NOT NULL DEFAULT 'aggregate_only',
  identifier_policy text NOT NULL DEFAULT 'aggregate_only',
  llm_eligible boolean NOT NULL DEFAULT false,
  report_eligible boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  reviewed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NOT NULL,
  CONSTRAINT normalized_benchmark_rows_source_type_check
    CHECK (source_type IN ('dashboard_export', 'meta_api_export')),
  CONSTRAINT normalized_benchmark_rows_platform_check
    CHECK (platform IN ('meta')),
  CONSTRAINT normalized_benchmark_rows_date_order_check
    CHECK (date_start <= date_stop),
  CONSTRAINT normalized_benchmark_rows_period_granularity_check
    CHECK (period_granularity IN ('daily', 'weekly', 'monthly', 'campaign_total', 'cohort')),
  CONSTRAINT normalized_benchmark_rows_net_or_gross_check
    CHECK (net_or_gross IN ('net', 'gross')),
  CONSTRAINT normalized_benchmark_rows_markup_policy_check
    CHECK (markup_policy IN ('included', 'excluded', 'manual_rate')),
  CONSTRAINT normalized_benchmark_rows_nonnegative_metrics_check
    CHECK (
      impressions >= 0
      AND clicks >= 0
      AND spend >= 0
      AND (reach IS NULL OR reach >= 0)
      AND (cpm IS NULL OR cpm >= 0)
      AND (cpc IS NULL OR cpc >= 0)
      AND (ctr IS NULL OR (ctr >= 0 AND ctr <= 1))
      AND (frequency IS NULL OR frequency >= 0)
    ),
  CONSTRAINT normalized_benchmark_rows_sample_size_check
    CHECK (sample_size >= 1),
  CONSTRAINT normalized_benchmark_rows_confidence_bucket_check
    CHECK (confidence_bucket IN ('high', 'medium', 'low', 'review_required')),
  CONSTRAINT normalized_benchmark_rows_benchmark_window_check
    CHECK (benchmark_window IN ('recent_6m', 'long_term')),
  CONSTRAINT normalized_benchmark_rows_reviewer_status_check
    CHECK (reviewer_status IN (
      'approved',
      'approved_with_warning',
      'trend_only',
      'aggregate_only'
    )),
  CONSTRAINT normalized_benchmark_rows_privacy_boundary_check
    CHECK (privacy_boundary_status IN ('aggregate_only', 'report_safe', 'restricted_review')),
  CONSTRAINT normalized_benchmark_rows_identifier_policy_check
    CHECK (identifier_policy IN (
      'none_detected',
      'raw_zone_only',
      'review_only_hash',
      'aggregate_only'
    )),
  CONSTRAINT normalized_benchmark_rows_source_fingerprint_not_blank_check
    CHECK (length(trim(source_fingerprint)) > 0),
  CONSTRAINT normalized_benchmark_rows_objective_not_blank_check
    CHECK (length(trim(objective)) > 0),
  CONSTRAINT normalized_benchmark_rows_optimization_goal_not_blank_check
    CHECK (length(trim(optimization_goal)) > 0)
);

COMMENT ON TABLE foresight.normalized_benchmark_rows IS
  'Review draft. Approved aggregate/canonical benchmark facts only. No raw campaign-level data.';
COMMENT ON COLUMN foresight.normalized_benchmark_rows.identifier_policy IS
  'Policy marker only. Raw account, campaign, adset, ad, advertiser, or brand identifiers are not stored in this table.';
COMMENT ON COLUMN foresight.normalized_benchmark_rows.llm_eligible IS
  'True only for aggregate/report-safe rows after privacy boundary review.';
COMMENT ON COLUMN foresight.normalized_benchmark_rows.created_by IS
  'Soft UUID internal actor reference candidate.';
COMMENT ON COLUMN foresight.normalized_benchmark_rows.reviewed_by IS
  'Soft UUID reviewer actor reference candidate.';

ALTER TABLE foresight.benchmark_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE foresight.benchmark_dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE foresight.benchmark_dry_run_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE foresight.benchmark_review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE foresight.normalized_benchmark_rows ENABLE ROW LEVEL SECURITY;

-- RLS policy candidates are intentionally not created in this draft.
-- Required later policy groups:
-- 1. uploader: own sanitized upload status only.
-- 2. reviewer: assigned sanitized reports and review event writes only.
-- 3. admin/data_steward: taxonomy, retention exception, and dataset activation paths.
-- 4. internal actor: guarded dry-run/report generation and future controlled promotion.
-- 5. ordinary user: no direct access to upload/report/review tables; report-safe aggregate output only.

CREATE INDEX benchmark_uploads_source_fingerprint_idx
  ON foresight.benchmark_uploads (source_fingerprint);
CREATE INDEX benchmark_uploads_status_uploaded_at_idx
  ON foresight.benchmark_uploads (status, uploaded_at);
CREATE INDEX benchmark_uploads_uploaded_by_idx
  ON foresight.benchmark_uploads (uploaded_by);

CREATE INDEX benchmark_dataset_versions_status_idx
  ON foresight.benchmark_dataset_versions (status);
CREATE INDEX benchmark_dataset_versions_window_idx
  ON foresight.benchmark_dataset_versions (benchmark_window_start, benchmark_window_end);
CREATE UNIQUE INDEX benchmark_dataset_versions_one_active_scope_idx
  ON foresight.benchmark_dataset_versions (dataset_scope)
  WHERE status = 'active';

CREATE INDEX benchmark_dry_run_reports_upload_version_idx
  ON foresight.benchmark_dry_run_reports (upload_id, report_version);
CREATE INDEX benchmark_dry_run_reports_validation_idx
  ON foresight.benchmark_dry_run_reports (validation_status, approval_status);
CREATE INDEX benchmark_dry_run_reports_generated_at_idx
  ON foresight.benchmark_dry_run_reports (generated_at);

CREATE INDEX benchmark_review_events_upload_idx
  ON foresight.benchmark_review_events (upload_id);
CREATE INDEX benchmark_review_events_report_idx
  ON foresight.benchmark_review_events (report_id);
CREATE INDEX benchmark_review_events_dataset_version_idx
  ON foresight.benchmark_review_events (dataset_version_id);
CREATE INDEX benchmark_review_events_type_time_idx
  ON foresight.benchmark_review_events (event_type, event_at);
CREATE INDEX benchmark_review_events_trace_idx
  ON foresight.benchmark_review_events (trace_id);
CREATE INDEX benchmark_review_events_actor_idx
  ON foresight.benchmark_review_events (actor_id, actor_role);

CREATE INDEX normalized_benchmark_rows_dataset_idx
  ON foresight.normalized_benchmark_rows (dataset_version_id);
CREATE INDEX normalized_benchmark_rows_source_upload_idx
  ON foresight.normalized_benchmark_rows (source_upload_id);
CREATE INDEX normalized_benchmark_rows_source_report_idx
  ON foresight.normalized_benchmark_rows (source_report_id);
CREATE INDEX normalized_benchmark_rows_fingerprint_idx
  ON foresight.normalized_benchmark_rows (source_fingerprint);
CREATE INDEX normalized_benchmark_rows_core_dimensions_idx
  ON foresight.normalized_benchmark_rows (
    platform,
    objective,
    optimization_goal,
    benchmark_window,
    currency,
    net_or_gross
  );
CREATE INDEX normalized_benchmark_rows_date_window_idx
  ON foresight.normalized_benchmark_rows (date_start, date_stop);
CREATE INDEX normalized_benchmark_rows_breakdown_signature_idx
  ON foresight.normalized_benchmark_rows (breakdown_signature);
CREATE INDEX normalized_benchmark_rows_report_safe_idx
  ON foresight.normalized_benchmark_rows (dataset_version_id, benchmark_window)
  WHERE report_eligible = true;
