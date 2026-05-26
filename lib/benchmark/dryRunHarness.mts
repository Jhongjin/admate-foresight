export type SourceValue = string | number | boolean | null | undefined;
export type SourceRow = Record<string, SourceValue>;

export type SourceType = 'dashboard_export' | 'meta_api_export';
export type MappingConfidence = 'exact' | 'alias' | 'derived' | 'missing' | 'rejected';
export type ValidationStatus = 'passed' | 'warning' | 'failed' | 'security_failed';
export type ApprovalStatus = 'validated' | 'warning' | 'rejected' | 'security_review_required';

export type CanonicalField =
  | 'platform'
  | 'source_type'
  | 'date_start'
  | 'date_stop'
  | 'objective'
  | 'optimization_goal'
  | 'spend'
  | 'currency'
  | 'impressions'
  | 'clicks'
  | 'reach'
  | 'frequency'
  | 'cpm'
  | 'cpc'
  | 'ctr';

export interface BenchmarkDryRunMetadata {
  platform?: string;
  source_type?: SourceType;
  exported_at?: string;
  date_range?: {
    start?: string;
    stop?: string;
  };
  timezone?: string;
  currency?: string;
  net_or_gross?: 'net' | 'gross' | 'unknown';
  markup_policy?: 'included' | 'excluded' | 'manual_rate' | 'unknown';
  aggregation_level?: string;
  breakdown?: string[];
  uploader?: string;
  reviewer?: string;
  approval_status?: string;
}

export interface BenchmarkSheetInput {
  name: string;
  visibility?: 'visible' | 'hidden' | 'very_hidden';
  rows: SourceRow[];
}

export interface BenchmarkDryRunInput {
  case_name: string;
  file_name: string;
  file_type: 'inline_mock' | 'csv' | 'xlsx';
  as_of_date: string;
  metadata: BenchmarkDryRunMetadata;
  sheets: BenchmarkSheetInput[];
}

export interface AcceptedColumn {
  source_sheet: string;
  source_column_masked_or_label: string;
  normalized_source_column: string;
  canonical_field: CanonicalField;
  mapping_confidence: MappingConfidence;
  parsed_value_type: 'metadata' | 'string' | 'number' | 'mixed' | 'empty';
  required_field: boolean;
}

export interface RejectedColumn {
  source_sheet: string;
  source_column_masked_or_label: string;
  reason_code:
    | 'empty_or_layout_artifact'
    | 'duplicate_conflict'
    | 'unsupported_metric'
    | 'unknown_semantics'
    | 'invalid_type'
    | 'secret_or_session_like'
    | 'unsafe_identifier_for_output';
  severity: 'info' | 'warning' | 'reject';
  reviewer_action_required: boolean;
}

export interface MissingRequiredField {
  canonical_field: CanonicalField;
  required_for: 'storage_and_benchmark_promotion';
  detected_aliases: string[];
  remediation_hint: string;
  blocks_storage: boolean;
}

export interface DryRunWarning {
  warning_code:
    | 'missing_reach'
    | 'mixed_currency'
    | 'unknown_net_or_gross'
    | 'unknown_markup_policy'
    | 'short_period'
    | 'low_sample_size'
    | 'long_term_only'
    | 'mixed_recent_and_long_term'
    | 'zero_denominator'
    | 'suspicious_metric'
    | 'identifier_columns_present';
  severity: 'warning' | 'review_required';
  affected_field: string;
  affected_sheet: string;
  affected_count_bucket: string;
  reviewer_decision_required: boolean;
  limitation_text_candidate: string;
}

export interface DerivedMetricPreview {
  cpm_status: string;
  cpc_status: string;
  ctr_status: string;
  frequency_status: string;
  zero_division_findings: string[];
  suspicious_metric_findings: string[];
  metric_reconciliation_status: 'not_evaluated' | 'calculated' | 'blocked';
  aggregate_preview: {
    cpm?: number | null;
    cpc?: number | null;
    ctr?: number | null;
    frequency?: number | null;
  };
}

export interface PrivacyFindings {
  identifier_columns_detected: boolean;
  identifier_column_groups: string[];
  advertiser_or_brand_columns_detected: boolean;
  raw_identifier_in_output_risk: boolean;
  secret_like_value_detected: boolean;
  url_like_value_detected: boolean;
  llm_boundary_status: 'safe_aggregate_only' | 'blocked_security_review' | 'safe_only_if_aggregate';
  recommended_action: string;
}

export interface ReviewerAction {
  action_type:
    | 'confirm_approval'
    | 'provide_missing_metadata'
    | 'select_sheet'
    | 'confirm_header_row'
    | 'confirm_reach_semantics'
    | 'split_mixed_currency'
    | 'split_recent_and_long_term'
    | 'remove_or_mask_identifier_output'
    | 'reject_and_request_new_export'
    | 'approve_trend_only'
    | 'security_review';
  reason: string;
  blocking: boolean;
  suggested_owner: 'uploader' | 'reviewer' | 'security' | 'data_owner';
}

export interface NormalizedPreviewSample {
  row_pattern: string;
  platform: string;
  source_type: string;
  date_grain: string;
  date_start_pattern: 'YYYY-MM-DD' | 'missing_or_unparseable';
  date_stop_pattern: 'YYYY-MM-DD' | 'missing_or_unparseable';
  objective_mapping_status: 'mapped' | 'missing';
  optimization_goal_mapping_status: 'mapped' | 'missing';
  currency: string;
  net_or_gross: string;
  impressions_present: boolean;
  clicks_present: boolean;
  spend_present: boolean;
  reach_status: 'present' | 'missing_or_unconfirmed';
  derived_metric_status: string;
  warning_codes: string[];
}

export interface BenchmarkDryRunReport {
  case_name: string;
  file_summary: {
    source_reference: string;
    source_hash: string;
    file_type: BenchmarkDryRunInput['file_type'];
    file_size_bucket: 'inline_mock';
    detected_workbook_type: string;
    sheet_count: number;
    visible_sheet_count: number;
    hidden_sheet_count: number;
    parser_profile_candidates: string[];
    preflight_status: ValidationStatus;
  };
  sheet_summary: Array<{
    sheet_reference: string;
    visibility: 'visible' | 'hidden' | 'very_hidden';
    estimated_rows: number;
    estimated_columns: number;
    header_row_index: number | null;
    header_detection_confidence: 'high' | 'medium' | 'low' | 'none';
    selected_for_mapping: boolean;
    ignored_reason: string | null;
  }>;
  mapping_report: {
    parser_profile: string;
    source_type: SourceType | 'missing';
    schema_mapping_version: 'benchmark_column_mapping_v1';
    canonical_field_status: Record<CanonicalField, MappingConfidence>;
    mapping_confidence_summary: Record<MappingConfidence, number>;
    metric_reconciliation_status: 'not_evaluated' | 'calculated' | 'blocked';
    validation_status: ValidationStatus;
    approval_status: ApprovalStatus;
    approval_blockers: string[];
    window_policy: 'recent_6_months' | 'long_term_trend' | 'mixed_window' | 'date_unparseable';
    excluded_from_default_benchmark: boolean;
  };
  accepted_columns: AcceptedColumn[];
  rejected_columns: RejectedColumn[];
  missing_required_fields: MissingRequiredField[];
  warnings: DryRunWarning[];
  derived_metric_preview: DerivedMetricPreview;
  privacy_findings: PrivacyFindings;
  reviewer_action_required: ReviewerAction[];
  normalized_preview_sample: NormalizedPreviewSample[];
}

export interface MockRunResult {
  reports: BenchmarkDryRunReport[];
  summary: Array<{
    case_name: string;
    validation_status: ValidationStatus;
    approval_status: ApprovalStatus;
    warning_codes: string[];
    missing_required_fields: CanonicalField[];
    privacy_status: PrivacyFindings['llm_boundary_status'];
    reviewer_actions: ReviewerAction['action_type'][];
  }>;
  expectation_failures: string[];
}

const SCHEMA_MAPPING_VERSION = 'benchmark_column_mapping_v1' as const;
const ALLOWED_SOURCE_TYPES = ['dashboard_export', 'meta_api_export'] as const;
const METADATA_ACCEPTED_SOURCE_COLUMNS = ['platform', 'source_type', 'currency'] as const;

const REQUIRED_FIELDS: CanonicalField[] = [
  'platform',
  'source_type',
  'date_start',
  'date_stop',
  'objective',
  'optimization_goal',
  'spend',
  'currency',
  'impressions',
  'clicks',
];

const CANONICAL_FIELDS: CanonicalField[] = [
  ...REQUIRED_FIELDS,
  'reach',
  'frequency',
  'cpm',
  'cpc',
  'ctr',
];

const ALIASES: Record<CanonicalField, string[]> = {
  platform: ['platform', '매체', '플랫폼', '광고매체', '미디어', 'publisher_platform'],
  source_type: ['source_type'],
  date_start: ['date_start', 'date', 'day', '날짜', '일자', '시작일', '집행시작일'],
  date_stop: ['date_stop', 'date', 'day', '날짜', '일자', '종료일', '집행종료일'],
  objective: ['objective', 'campaign_objective', '목표', '캠페인목표', '광고목표'],
  optimization_goal: ['optimization_goal', 'optimization goal', '최적화목표', '최적화 목표', '입찰최적화'],
  spend: ['spend', 'amount_spent', 'cost', 'media_cost', '지출금액', '지출 금액', '광고비', '비용', '집행금액'],
  currency: ['currency', 'currency_code', 'account_currency', '통화', '화폐'],
  impressions: ['impressions', 'imps', 'imps.', 'impression_count', '노출', '노출수', '노출 횟수'],
  clicks: ['clicks', 'all_clicks', 'click', '클릭', '클릭수'],
  reach: ['reach', 'unique_impressions', 'unique_imps', 'unique imps.', 'unique imps', '도달', '도달수', '순도달'],
  frequency: ['frequency', 'avg_frequency', '빈도', '평균빈도'],
  cpm: ['cpm', 'cost_per_1000_impressions', '노출당비용'],
  cpc: ['cpc', 'cost_per_click', '클릭당비용'],
  ctr: ['ctr', 'click_through_rate', '클릭률'],
};

const IDENTIFIER_ALIASES: Record<string, string[]> = {
  account: ['account_id', 'account_name', 'ad_account_id', '계정id', '광고계정id', '계정명', '광고계정명'],
  campaign: ['campaign_id', 'campaign_name', '캠페인id', '캠페인명', '캠페인이름'],
  adset: ['adset_id', 'adset_name', 'ad_group_id', 'ad_group_name', '광고세트id', '광고세트명', '광고그룹id', '광고그룹명'],
  ad: ['ad_id', 'ad_name', 'creative_id', 'creative_name', '광고id', '광고명', '소재id', '소재명'],
  advertiser: ['advertiser', 'brand', 'client', '광고주', '브랜드', '클라이언트'],
};

const SECRET_OR_SESSION_MARKERS = [
  'access_token',
  'api_key',
  'apikey',
  'authorization',
  'bearer',
  'cookie',
  'credential',
  'secret',
  'session',
  'signed_url',
  'signedurl',
  'token_marker',
  'credential_marker',
  'session_param',
];

const URL_PATTERN = /^https?:\/\//i;

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s._/-]+/g, '');
}

function isAllowedSourceType(value: unknown): value is SourceType {
  return typeof value === 'string' && (ALLOWED_SOURCE_TYPES as readonly string[]).includes(value);
}

function getAllowedMetadataSourceType(metadata: BenchmarkDryRunMetadata): SourceType | null {
  return isAllowedSourceType(metadata.source_type) ? metadata.source_type : null;
}

function isAcceptedMetadataSourceColumn(column: string): boolean {
  return (METADATA_ACCEPTED_SOURCE_COLUMNS as readonly string[]).includes(column);
}

function sanitizeColumnLabel(column: string): string {
  const normalized = normalizeLabel(column);
  for (const aliases of Object.values(IDENTIFIER_ALIASES)) {
    if (aliases.some((alias) => normalizeLabel(alias) === normalized)) {
      return '[identifier_column]';
    }
  }
  if (SECRET_OR_SESSION_MARKERS.some((marker) => normalized.includes(normalizeLabel(marker)))) {
    return '[security_sensitive_column]';
  }
  return column || '[blank_column]';
}

function getHeaders(rows: SourceRow[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) seen.add(key);
    }
  }
  return [...seen];
}

function getValueType(rows: SourceRow[], sourceColumn: string): AcceptedColumn['parsed_value_type'] {
  const present = rows.map((row) => row[sourceColumn]).filter((value) => value !== null && value !== undefined && value !== '');
  if (present.length === 0) return 'empty';
  const hasNumber = present.some((value) => typeof value === 'number');
  const hasString = present.some((value) => typeof value === 'string');
  if (hasNumber && !hasString) return 'number';
  if (hasString && !hasNumber) return 'string';
  return 'mixed';
}

function stableHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `inline_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function parseNumber(value: SourceValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, '').replace(/%$/, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function valuePresent(value: SourceValue): boolean {
  return value !== null && value !== undefined && value !== '';
}

function parseDate(value: SourceValue): Date | null {
  if (typeof value !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const date = new Date(`${value.trim()}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function subtractMonths(date: Date, months: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCMonth(copy.getUTCMonth() - months);
  return copy;
}

function classifyWindow(input: BenchmarkDryRunInput, mapping: MappingState): BenchmarkDryRunReport['mapping_report']['window_policy'] {
  const rows = getSelectedRows(input);
  const asOfDate = parseDate(input.as_of_date);
  if (!asOfDate || !mapping.date_start || !mapping.date_stop) return 'date_unparseable';
  const recentStart = subtractMonths(asOfDate, 6);

  let recentCount = 0;
  let longTermCount = 0;
  let invalidCount = 0;

  for (const row of rows) {
    const start = parseDate(readMappedValue(row, input.metadata, mapping.date_start));
    const stop = parseDate(readMappedValue(row, input.metadata, mapping.date_stop));
    if (!start || !stop || stop < start) {
      invalidCount += 1;
      continue;
    }
    if (stop < recentStart) {
      longTermCount += 1;
    } else if (start >= recentStart) {
      recentCount += 1;
    } else {
      recentCount += 1;
      longTermCount += 1;
    }
  }

  if (invalidCount > 0) return 'date_unparseable';
  if (recentCount > 0 && longTermCount > 0) return 'mixed_window';
  if (longTermCount > 0) return 'long_term_trend';
  return 'recent_6_months';
}

interface FieldMapping {
  source_sheet: string;
  source_column: string;
  canonical_field: CanonicalField;
  confidence: MappingConfidence;
  from_metadata: boolean;
}

type MappingState = Partial<Record<CanonicalField, FieldMapping>>;

function findMappingForField(
  field: CanonicalField,
  headers: string[],
  sheetName: string,
  metadata: BenchmarkDryRunMetadata,
): FieldMapping | null {
  if (field === 'source_type' && metadata.source_type !== undefined) {
    if (!getAllowedMetadataSourceType(metadata)) return null;
    return {
      source_sheet: 'upload_metadata',
      source_column: 'source_type',
      canonical_field: field,
      confidence: 'exact',
      from_metadata: true,
    };
  }
  if (field === 'platform' && metadata.platform) {
    return {
      source_sheet: 'upload_metadata',
      source_column: 'platform',
      canonical_field: field,
      confidence: 'exact',
      from_metadata: true,
    };
  }
  if (field === 'currency' && metadata.currency) {
    return {
      source_sheet: 'upload_metadata',
      source_column: 'currency',
      canonical_field: field,
      confidence: 'exact',
      from_metadata: true,
    };
  }

  const canonicalLabel = normalizeLabel(field);
  const exact = headers.find((header) => normalizeLabel(header) === canonicalLabel);
  if (exact) {
    return {
      source_sheet: sheetName,
      source_column: exact,
      canonical_field: field,
      confidence: 'exact',
      from_metadata: false,
    };
  }

  const aliases = ALIASES[field].map(normalizeLabel);
  const alias = headers.find((header) => aliases.includes(normalizeLabel(header)));
  if (alias) {
    return {
      source_sheet: sheetName,
      source_column: alias,
      canonical_field: field,
      confidence: 'alias',
      from_metadata: false,
    };
  }

  return null;
}

function readMappedValue(row: SourceRow, metadata: BenchmarkDryRunMetadata, mapping: FieldMapping): SourceValue {
  if (mapping.from_metadata) {
    return metadata[mapping.source_column as keyof BenchmarkDryRunMetadata] as SourceValue;
  }
  return row[mapping.source_column];
}

function getSelectedSheet(input: BenchmarkDryRunInput): BenchmarkSheetInput | null {
  return input.sheets.find((sheet) => (sheet.visibility ?? 'visible') === 'visible' && sheet.rows.length > 0) ?? null;
}

function getSelectedRows(input: BenchmarkDryRunInput): SourceRow[] {
  return getSelectedSheet(input)?.rows ?? [];
}

function buildMappings(input: BenchmarkDryRunInput): {
  mapping: MappingState;
  acceptedColumns: AcceptedColumn[];
  rejectedColumns: RejectedColumn[];
  identifierGroups: string[];
  advertiserOrBrandDetected: boolean;
  securityColumnDetected: boolean;
} {
  const selectedSheet = getSelectedSheet(input);
  const rows = selectedSheet?.rows ?? [];
  const sheetName = selectedSheet?.name ?? 'no_selected_sheet';
  const headers = getHeaders(rows);
  const acceptedColumns: AcceptedColumn[] = [];
  const rejectedColumns: RejectedColumn[] = [];
  const mappedSourceColumns = new Set<string>();
  const mapping: MappingState = {};

  for (const field of CANONICAL_FIELDS) {
    const fieldMapping = findMappingForField(field, headers, sheetName, input.metadata);
    if (!fieldMapping) continue;
    if (fieldMapping.from_metadata && !isAcceptedMetadataSourceColumn(fieldMapping.source_column)) continue;
    mapping[field] = fieldMapping;
    if (!fieldMapping.from_metadata) mappedSourceColumns.add(fieldMapping.source_column);
    acceptedColumns.push({
      source_sheet: fieldMapping.source_sheet,
      source_column_masked_or_label: fieldMapping.from_metadata
        ? `upload_metadata.${fieldMapping.source_column}`
        : sanitizeColumnLabel(fieldMapping.source_column),
      normalized_source_column: normalizeLabel(fieldMapping.source_column),
      canonical_field: field,
      mapping_confidence: fieldMapping.confidence,
      parsed_value_type: fieldMapping.from_metadata ? 'metadata' : getValueType(rows, fieldMapping.source_column),
      required_field: REQUIRED_FIELDS.includes(field),
    });
  }

  const identifierGroups = new Set<string>();
  let advertiserOrBrandDetected = false;
  let securityColumnDetected = false;

  for (const header of headers) {
    const normalized = normalizeLabel(header);
    const isEmpty = normalized.length === 0;
    let headerWasRejectedForIdentifier = false;
    let headerWasRejectedForSecurity = false;
    const headerIsKnownAlias = Object.values(ALIASES).some((aliases) =>
      aliases.some((alias) => normalizeLabel(alias) === normalized)
    );
    if (isEmpty) {
      rejectedColumns.push({
        source_sheet: sheetName,
        source_column_masked_or_label: '[blank_column]',
        reason_code: 'empty_or_layout_artifact',
        severity: 'info',
        reviewer_action_required: false,
      });
      continue;
    }

    for (const [group, aliases] of Object.entries(IDENTIFIER_ALIASES)) {
      if (aliases.some((alias) => normalizeLabel(alias) === normalized)) {
        identifierGroups.add(group);
        if (group === 'advertiser') advertiserOrBrandDetected = true;
        headerWasRejectedForIdentifier = true;
        rejectedColumns.push({
          source_sheet: sheetName,
          source_column_masked_or_label: '[identifier_column]',
          reason_code: 'unsafe_identifier_for_output',
          severity: 'warning',
          reviewer_action_required: true,
        });
      }
    }

    if (SECRET_OR_SESSION_MARKERS.some((marker) => normalized.includes(normalizeLabel(marker)))) {
      securityColumnDetected = true;
      headerWasRejectedForSecurity = true;
      rejectedColumns.push({
        source_sheet: sheetName,
        source_column_masked_or_label: '[security_sensitive_column]',
        reason_code: 'secret_or_session_like',
        severity: 'reject',
        reviewer_action_required: true,
      });
    }

    if (
      !mappedSourceColumns.has(header)
      && !headerWasRejectedForIdentifier
      && !headerWasRejectedForSecurity
      && !headerIsKnownAlias
    ) {
      rejectedColumns.push({
        source_sheet: sheetName,
        source_column_masked_or_label: sanitizeColumnLabel(header),
        reason_code: 'unsupported_metric',
        severity: 'info',
        reviewer_action_required: false,
      });
    }
  }

  return {
    mapping,
    acceptedColumns,
    rejectedColumns,
    identifierGroups: [...identifierGroups],
    advertiserOrBrandDetected,
    securityColumnDetected,
  };
}

function detectSecretLikeValues(input: BenchmarkDryRunInput): {
  secretLike: boolean;
  urlLike: boolean;
  affectedColumns: Set<string>;
} {
  const affectedColumns = new Set<string>();
  let secretLike = false;
  let urlLike = false;

  for (const sheet of input.sheets) {
    for (const row of sheet.rows) {
      for (const [column, value] of Object.entries(row)) {
        if (typeof value !== 'string') continue;
        const normalized = normalizeLabel(value);
        if (URL_PATTERN.test(value)) urlLike = true;
        const markerDetected = SECRET_OR_SESSION_MARKERS.some((marker) => normalized.includes(normalizeLabel(marker)));
        const credentialUrlDetected = URL_PATTERN.test(value) && markerDetected;
        if (markerDetected || credentialUrlDetected) {
          secretLike = true;
          affectedColumns.add(column);
        }
      }
    }
  }

  return { secretLike, urlLike, affectedColumns };
}

function buildMissingRequiredFields(mapping: MappingState): MissingRequiredField[] {
  return REQUIRED_FIELDS
    .filter((field) => !mapping[field])
    .map((field) => ({
      canonical_field: field,
      required_for: 'storage_and_benchmark_promotion',
      detected_aliases: ALIASES[field],
      remediation_hint: `Provide ${field} as a source column or approved upload metadata.`,
      blocks_storage: true,
    }));
}

function buildCanonicalFieldStatus(mapping: MappingState): Record<CanonicalField, MappingConfidence> {
  return Object.fromEntries(
    CANONICAL_FIELDS.map((field) => [field, mapping[field]?.confidence ?? 'missing'])
  ) as Record<CanonicalField, MappingConfidence>;
}

function buildConfidenceSummary(status: Record<CanonicalField, MappingConfidence>): Record<MappingConfidence, number> {
  const summary: Record<MappingConfidence, number> = {
    exact: 0,
    alias: 0,
    derived: 0,
    missing: 0,
    rejected: 0,
  };
  for (const confidence of Object.values(status)) summary[confidence] += 1;
  return summary;
}

function collectCurrencyValues(rows: SourceRow[], metadata: BenchmarkDryRunMetadata, mapping: MappingState): string[] {
  if (!mapping.currency) return [];
  return rows
    .map((row) => readMappedValue(row, metadata, mapping.currency!))
    .filter(valuePresent)
    .map((value) => String(value).trim().toUpperCase())
    .filter(Boolean);
}

function addWarning(warnings: DryRunWarning[], warning: DryRunWarning): void {
  if (warnings.some((existing) => existing.warning_code === warning.warning_code && existing.affected_field === warning.affected_field)) {
    return;
  }
  warnings.push(warning);
}

function bucketCount(count: number): string {
  if (count === 0) return '0';
  if (count === 1) return '1';
  if (count <= 10) return '2-10';
  if (count <= 100) return '11-100';
  return '100+';
}

function buildWarnings(
  input: BenchmarkDryRunInput,
  mapping: MappingState,
  identifierGroups: string[],
  windowPolicy: BenchmarkDryRunReport['mapping_report']['window_policy'],
): DryRunWarning[] {
  const rows = getSelectedRows(input);
  const warnings: DryRunWarning[] = [];
  const selectedSheet = getSelectedSheet(input);
  const sheetName = selectedSheet?.name ?? 'no_selected_sheet';

  if (!mapping.reach) {
    addWarning(warnings, {
      warning_code: 'missing_reach',
      severity: 'review_required',
      affected_field: 'reach',
      affected_sheet: sheetName,
      affected_count_bucket: bucketCount(rows.length),
      reviewer_decision_required: true,
      limitation_text_candidate: 'Reach and frequency preview are unavailable until reach semantics are confirmed.',
    });
  }

  const currencies = new Set(collectCurrencyValues(rows, input.metadata, mapping));
  if (currencies.size > 1) {
    addWarning(warnings, {
      warning_code: 'mixed_currency',
      severity: 'review_required',
      affected_field: 'currency',
      affected_sheet: sheetName,
      affected_count_bucket: bucketCount(rows.length),
      reviewer_decision_required: true,
      limitation_text_candidate: 'Split currencies or attach an approved exchange policy before approval.',
    });
  }

  if (!input.metadata.net_or_gross || input.metadata.net_or_gross === 'unknown') {
    addWarning(warnings, {
      warning_code: 'unknown_net_or_gross',
      severity: 'review_required',
      affected_field: 'net_or_gross',
      affected_sheet: 'upload_metadata',
      affected_count_bucket: bucketCount(rows.length),
      reviewer_decision_required: true,
      limitation_text_candidate: 'Net/Gross basis is unknown; automatic benchmark approval is blocked.',
    });
  }

  if (!input.metadata.markup_policy || input.metadata.markup_policy === 'unknown') {
    addWarning(warnings, {
      warning_code: 'unknown_markup_policy',
      severity: 'review_required',
      affected_field: 'markup_policy',
      affected_sheet: 'upload_metadata',
      affected_count_bucket: bucketCount(rows.length),
      reviewer_decision_required: true,
      limitation_text_candidate: 'Markup policy is unknown; commercial metric interpretation requires review.',
    });
  }

  if (rows.length < 2) {
    addWarning(warnings, {
      warning_code: 'low_sample_size',
      severity: 'warning',
      affected_field: 'row_count',
      affected_sheet: sheetName,
      affected_count_bucket: bucketCount(rows.length),
      reviewer_decision_required: true,
      limitation_text_candidate: 'Sample size is below the dry-run mock threshold.',
    });
  }

  if (windowPolicy === 'long_term_trend') {
    addWarning(warnings, {
      warning_code: 'long_term_only',
      severity: 'review_required',
      affected_field: 'date_range',
      affected_sheet: sheetName,
      affected_count_bucket: bucketCount(rows.length),
      reviewer_decision_required: true,
      limitation_text_candidate: 'Data is older than the recent 6-month benchmark window and should be trend-only.',
    });
  }

  if (windowPolicy === 'mixed_window') {
    addWarning(warnings, {
      warning_code: 'mixed_recent_and_long_term',
      severity: 'review_required',
      affected_field: 'date_range',
      affected_sheet: sheetName,
      affected_count_bucket: bucketCount(rows.length),
      reviewer_decision_required: true,
      limitation_text_candidate: 'Recent and long-term rows must be split before approval.',
    });
  }

  if (identifierGroups.length > 0) {
    addWarning(warnings, {
      warning_code: 'identifier_columns_present',
      severity: 'review_required',
      affected_field: 'identifier_columns',
      affected_sheet: sheetName,
      affected_count_bucket: bucketCount(identifierGroups.length),
      reviewer_decision_required: true,
      limitation_text_candidate: 'Identifier columns must remain raw-zone or review-only metadata.',
    });
  }

  return warnings;
}

function buildDerivedMetricPreview(
  rows: SourceRow[],
  metadata: BenchmarkDryRunMetadata,
  mapping: MappingState,
): DerivedMetricPreview {
  const zeroDivisionFindings: string[] = [];
  const suspiciousMetricFindings: string[] = [];
  const requiredForCore = [mapping.spend, mapping.impressions, mapping.clicks].every(Boolean);
  if (!requiredForCore) {
    return {
      cpm_status: 'blocked_missing_inputs',
      cpc_status: 'blocked_missing_inputs',
      ctr_status: 'blocked_missing_inputs',
      frequency_status: mapping.reach ? 'blocked_missing_inputs' : 'blocked_missing_or_zero_reach',
      zero_division_findings: zeroDivisionFindings,
      suspicious_metric_findings: suspiciousMetricFindings,
      metric_reconciliation_status: 'blocked',
      aggregate_preview: {
        cpm: null,
        cpc: null,
        ctr: null,
        frequency: null,
      },
    };
  }

  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let reach = 0;
  let invalidNumericRows = 0;
  let negativeRows = 0;
  let clickOverImpressionRows = 0;
  let reachOverImpressionRows = 0;

  for (const row of rows) {
    const spendValue = parseNumber(readMappedValue(row, metadata, mapping.spend!));
    const impressionValue = parseNumber(readMappedValue(row, metadata, mapping.impressions!));
    const clickValue = parseNumber(readMappedValue(row, metadata, mapping.clicks!));
    const reachValue = mapping.reach ? parseNumber(readMappedValue(row, metadata, mapping.reach)) : null;

    if (spendValue === null || impressionValue === null || clickValue === null) {
      invalidNumericRows += 1;
      continue;
    }
    if (spendValue < 0 || impressionValue < 0 || clickValue < 0 || (reachValue !== null && reachValue < 0)) {
      negativeRows += 1;
    }
    if (clickValue > impressionValue) clickOverImpressionRows += 1;
    if (reachValue !== null && reachValue > impressionValue) reachOverImpressionRows += 1;

    spend += spendValue;
    impressions += impressionValue;
    clicks += clickValue;
    if (reachValue !== null) reach += reachValue;
  }

  if (invalidNumericRows > 0) suspiciousMetricFindings.push('non_numeric_core_metric_rows');
  if (negativeRows > 0) suspiciousMetricFindings.push('negative_core_metric_rows');
  if (clickOverImpressionRows > 0) suspiciousMetricFindings.push('clicks_greater_than_impressions');
  if (reachOverImpressionRows > 0) suspiciousMetricFindings.push('reach_greater_than_impressions');

  const cpm = impressions > 0 ? (spend / impressions) * 1000 : null;
  const cpc = clicks > 0 ? spend / clicks : null;
  const ctr = impressions > 0 ? clicks / impressions : null;
  const frequency = mapping.reach && reach > 0 ? impressions / reach : null;

  if (impressions <= 0) zeroDivisionFindings.push('impressions_zero_or_missing');
  if (clicks <= 0) zeroDivisionFindings.push('clicks_zero_or_missing');
  if (!mapping.reach || reach <= 0) zeroDivisionFindings.push('reach_missing_or_zero');

  return {
    cpm_status: cpm === null ? 'blocked_zero_impressions' : 'calculable',
    cpc_status: cpc === null ? 'blocked_zero_clicks' : 'calculable',
    ctr_status: ctr === null ? 'blocked_zero_impressions' : 'calculable',
    frequency_status: frequency === null ? 'blocked_missing_or_zero_reach' : 'calculable',
    zero_division_findings: zeroDivisionFindings,
    suspicious_metric_findings: suspiciousMetricFindings,
    metric_reconciliation_status: suspiciousMetricFindings.length > 0 ? 'blocked' : 'calculated',
    aggregate_preview: {
      cpm: cpm === null ? null : roundMetric(cpm),
      cpc: cpc === null ? null : roundMetric(cpc),
      ctr: ctr === null ? null : roundMetric(ctr),
      frequency: frequency === null ? null : roundMetric(frequency),
    },
  };
}

function roundMetric(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function hasNonNumericCoreRows(rows: SourceRow[], metadata: BenchmarkDryRunMetadata, mapping: MappingState): boolean {
  const fields: CanonicalField[] = ['spend', 'impressions', 'clicks'];
  return fields.some((field) => {
    const fieldMapping = mapping[field];
    if (!fieldMapping) return false;
    return rows.some((row) => valuePresent(readMappedValue(row, metadata, fieldMapping)) && parseNumber(readMappedValue(row, metadata, fieldMapping)) === null);
  });
}

function hasInvalidDates(rows: SourceRow[], metadata: BenchmarkDryRunMetadata, mapping: MappingState): boolean {
  if (!mapping.date_start || !mapping.date_stop) return false;
  return rows.some((row) => {
    const start = parseDate(readMappedValue(row, metadata, mapping.date_start!));
    const stop = parseDate(readMappedValue(row, metadata, mapping.date_stop!));
    return !start || !stop || stop < start;
  });
}

function buildPrivacyFindings(
  identifierGroups: string[],
  advertiserOrBrandDetected: boolean,
  secretLikeValueDetected: boolean,
  urlLikeValueDetected: boolean,
  securityColumnDetected: boolean,
): PrivacyFindings {
  const securityDetected = secretLikeValueDetected || securityColumnDetected;
  if (securityDetected) {
    return {
      identifier_columns_detected: identifierGroups.length > 0,
      identifier_column_groups: identifierGroups,
      advertiser_or_brand_columns_detected: advertiserOrBrandDetected,
      raw_identifier_in_output_risk: identifierGroups.length > 0,
      secret_like_value_detected: true,
      url_like_value_detected: urlLikeValueDetected,
      llm_boundary_status: 'blocked_security_review',
      recommended_action: 'Stop dry-run preview and request a new export without credential-bearing fields.',
    };
  }
  if (identifierGroups.length > 0) {
    return {
      identifier_columns_detected: true,
      identifier_column_groups: identifierGroups,
      advertiser_or_brand_columns_detected: advertiserOrBrandDetected,
      raw_identifier_in_output_risk: true,
      secret_like_value_detected: false,
      url_like_value_detected: urlLikeValueDetected,
      llm_boundary_status: 'safe_only_if_aggregate',
      recommended_action: 'Keep identifiers in raw zone or review-only metadata and mask report-ready output.',
    };
  }
  return {
    identifier_columns_detected: false,
    identifier_column_groups: [],
    advertiser_or_brand_columns_detected: false,
    raw_identifier_in_output_risk: false,
    secret_like_value_detected: false,
    url_like_value_detected: urlLikeValueDetected,
    llm_boundary_status: 'safe_aggregate_only',
    recommended_action: 'Report-ready output may use aggregate canonical fields only.',
  };
}

function buildReviewerActions(
  missing: MissingRequiredField[],
  warnings: DryRunWarning[],
  privacy: PrivacyFindings,
  validationStatus: ValidationStatus,
): ReviewerAction[] {
  const actions: ReviewerAction[] = [];

  if (privacy.secret_like_value_detected) {
    actions.push({
      action_type: 'security_review',
      reason: 'Secret-like or credential-bearing source field detected.',
      blocking: true,
      suggested_owner: 'security',
    });
    actions.push({
      action_type: 'reject_and_request_new_export',
      reason: 'Credential-bearing exports cannot be promoted or previewed.',
      blocking: true,
      suggested_owner: 'reviewer',
    });
  }

  if (missing.length > 0) {
    actions.push({
      action_type: 'provide_missing_metadata',
      reason: `Missing required fields: ${missing.map((field) => field.canonical_field).join(', ')}.`,
      blocking: true,
      suggested_owner: 'uploader',
    });
  }

  if (warnings.some((warning) => warning.warning_code === 'mixed_currency')) {
    actions.push({
      action_type: 'split_mixed_currency',
      reason: 'Mixed currency rows must not be silently aggregated.',
      blocking: true,
      suggested_owner: 'reviewer',
    });
  }

  if (warnings.some((warning) => warning.warning_code === 'mixed_recent_and_long_term')) {
    actions.push({
      action_type: 'split_recent_and_long_term',
      reason: 'Recent benchmark and long-term trend windows must be separated.',
      blocking: true,
      suggested_owner: 'reviewer',
    });
  }

  if (warnings.some((warning) => warning.warning_code === 'long_term_only')) {
    actions.push({
      action_type: 'approve_trend_only',
      reason: 'Long-term data must be labeled trend-only before use.',
      blocking: false,
      suggested_owner: 'reviewer',
    });
  }

  if (privacy.identifier_columns_detected) {
    actions.push({
      action_type: 'remove_or_mask_identifier_output',
      reason: 'Identifier columns must stay out of LLM and report-ready output.',
      blocking: true,
      suggested_owner: 'data_owner',
    });
  }

  if (warnings.some((warning) => warning.warning_code === 'missing_reach')) {
    actions.push({
      action_type: 'confirm_reach_semantics',
      reason: 'Reach is missing or unavailable; frequency is blocked.',
      blocking: false,
      suggested_owner: 'reviewer',
    });
  }

  if (actions.length === 0 && validationStatus === 'passed') {
    actions.push({
      action_type: 'confirm_approval',
      reason: 'Dry-run passed; reviewer can decide whether to promote to a separate normalization flow.',
      blocking: false,
      suggested_owner: 'reviewer',
    });
  }

  return actions;
}

function buildNormalizedPreviewSample(
  input: BenchmarkDryRunInput,
  mapping: MappingState,
  warnings: DryRunWarning[],
  derived: DerivedMetricPreview,
  privacy: PrivacyFindings,
): NormalizedPreviewSample[] {
  if (privacy.secret_like_value_detected) return [];
  const rows = getSelectedRows(input).slice(0, 2);
  const warningCodes = warnings.map((warning) => warning.warning_code);

  return rows.map((row, index) => {
    const dateStart = mapping.date_start ? parseDate(readMappedValue(row, input.metadata, mapping.date_start)) : null;
    const dateStop = mapping.date_stop ? parseDate(readMappedValue(row, input.metadata, mapping.date_stop)) : null;
    const platform = mapping.platform ? readMappedValue(row, input.metadata, mapping.platform) : 'missing';
    const sourceType = mapping.source_type ? readMappedValue(row, input.metadata, mapping.source_type) : 'missing';
    const currency = mapping.currency ? readMappedValue(row, input.metadata, mapping.currency) : 'missing';

    return {
      row_pattern: `row_${index + 1}`,
      platform: valuePresent(platform) ? String(platform).toLowerCase() : 'missing',
      source_type: valuePresent(sourceType) ? String(sourceType) : 'missing',
      date_grain: input.metadata.aggregation_level ?? 'unknown',
      date_start_pattern: dateStart ? 'YYYY-MM-DD' : 'missing_or_unparseable',
      date_stop_pattern: dateStop ? 'YYYY-MM-DD' : 'missing_or_unparseable',
      objective_mapping_status: mapping.objective ? 'mapped' : 'missing',
      optimization_goal_mapping_status: mapping.optimization_goal ? 'mapped' : 'missing',
      currency: valuePresent(currency) ? String(currency).toUpperCase() : 'missing',
      net_or_gross: input.metadata.net_or_gross ?? 'unknown',
      impressions_present: Boolean(mapping.impressions && valuePresent(readMappedValue(row, input.metadata, mapping.impressions))),
      clicks_present: Boolean(mapping.clicks && valuePresent(readMappedValue(row, input.metadata, mapping.clicks))),
      spend_present: Boolean(mapping.spend && valuePresent(readMappedValue(row, input.metadata, mapping.spend))),
      reach_status: mapping.reach && valuePresent(readMappedValue(row, input.metadata, mapping.reach)) ? 'present' : 'missing_or_unconfirmed',
      derived_metric_status: derived.metric_reconciliation_status,
      warning_codes: warningCodes,
    };
  });
}

function buildSheetSummary(input: BenchmarkDryRunInput): BenchmarkDryRunReport['sheet_summary'] {
  return input.sheets.map((sheet, index) => {
    const headers = getHeaders(sheet.rows);
    const visibility = sheet.visibility ?? 'visible';
    const aliasHits = headers.filter((header) => {
      const normalized = normalizeLabel(header);
      return Object.values(ALIASES).some((aliases) => aliases.some((alias) => normalizeLabel(alias) === normalized));
    }).length;
    const selected = getSelectedSheet(input) === sheet;
    return {
      sheet_reference: `sheet_${index + 1}`,
      visibility,
      estimated_rows: sheet.rows.length,
      estimated_columns: headers.length,
      header_row_index: sheet.rows.length > 0 ? 1 : null,
      header_detection_confidence: aliasHits >= 6 ? 'high' : aliasHits >= 3 ? 'medium' : aliasHits > 0 ? 'low' : 'none',
      selected_for_mapping: selected,
      ignored_reason: selected ? null : visibility === 'visible' ? 'not_selected_first_candidate_sheet' : 'hidden_sheet_not_parsed',
    };
  });
}

export function runBenchmarkDryRun(input: BenchmarkDryRunInput): BenchmarkDryRunReport {
  const selectedSheet = getSelectedSheet(input);
  const selectedRows = selectedSheet?.rows ?? [];
  const mappingResult = buildMappings(input);
  const missingRequiredFields = buildMissingRequiredFields(mappingResult.mapping);
  const secretScan = detectSecretLikeValues(input);
  const windowPolicy = classifyWindow(input, mappingResult.mapping);
  const warnings = buildWarnings(input, mappingResult.mapping, mappingResult.identifierGroups, windowPolicy);
  const derivedMetricPreview = buildDerivedMetricPreview(selectedRows, input.metadata, mappingResult.mapping);

  if (derivedMetricPreview.zero_division_findings.length > 0) {
    addWarning(warnings, {
      warning_code: 'zero_denominator',
      severity: 'warning',
      affected_field: 'derived_metrics',
      affected_sheet: selectedSheet?.name ?? 'no_selected_sheet',
      affected_count_bucket: bucketCount(derivedMetricPreview.zero_division_findings.length),
      reviewer_decision_required: true,
      limitation_text_candidate: 'One or more derived metrics are blocked by zero or missing denominators.',
    });
  }

  if (derivedMetricPreview.suspicious_metric_findings.length > 0) {
    addWarning(warnings, {
      warning_code: 'suspicious_metric',
      severity: 'review_required',
      affected_field: 'core_metrics',
      affected_sheet: selectedSheet?.name ?? 'no_selected_sheet',
      affected_count_bucket: bucketCount(derivedMetricPreview.suspicious_metric_findings.length),
      reviewer_decision_required: true,
      limitation_text_candidate: 'Core metric values require review before benchmark promotion.',
    });
  }

  const privacyFindings = buildPrivacyFindings(
    mappingResult.identifierGroups,
    mappingResult.advertiserOrBrandDetected,
    secretScan.secretLike,
    secretScan.urlLike,
    mappingResult.securityColumnDetected,
  );

  const typeFailure = hasNonNumericCoreRows(selectedRows, input.metadata, mappingResult.mapping);
  const dateFailure = hasInvalidDates(selectedRows, input.metadata, mappingResult.mapping) || windowPolicy === 'date_unparseable';
  const securityFailure = privacyFindings.secret_like_value_detected;
  const blockerFailure = missingRequiredFields.length > 0 || typeFailure || dateFailure;
  const validationStatus: ValidationStatus = securityFailure
    ? 'security_failed'
    : blockerFailure
      ? 'failed'
      : warnings.length > 0
        ? 'warning'
        : 'passed';
  const approvalStatus: ApprovalStatus = validationStatus === 'security_failed'
    ? 'security_review_required'
    : validationStatus === 'failed'
      ? 'rejected'
      : validationStatus === 'warning'
        ? 'warning'
        : 'validated';

  const reviewerActions = buildReviewerActions(missingRequiredFields, warnings, privacyFindings, validationStatus);
  const normalizedPreviewSample = buildNormalizedPreviewSample(
    input,
    mappingResult.mapping,
    warnings,
    derivedMetricPreview,
    privacyFindings,
  );

  const canonicalFieldStatus = buildCanonicalFieldStatus(mappingResult.mapping);
  const approvalBlockers = [
    ...missingRequiredFields.map((field) => `missing_required_field:${field.canonical_field}`),
    ...(typeFailure ? ['non_numeric_core_metric'] : []),
    ...(dateFailure ? ['invalid_or_unparseable_date_range'] : []),
    ...(securityFailure ? ['secret_or_session_like_value'] : []),
    ...(windowPolicy === 'mixed_window' ? ['mixed_recent_and_long_term_window'] : []),
  ];

  return {
    case_name: input.case_name,
    file_summary: {
      source_reference: `inline_mock:${input.case_name}`,
      source_hash: stableHash(`${input.case_name}:${input.file_name}:${input.sheets.length}:${selectedRows.length}`),
      file_type: input.file_type,
      file_size_bucket: 'inline_mock',
      detected_workbook_type: input.file_type,
      sheet_count: input.sheets.length,
      visible_sheet_count: input.sheets.filter((sheet) => (sheet.visibility ?? 'visible') === 'visible').length,
      hidden_sheet_count: input.sheets.filter((sheet) => (sheet.visibility ?? 'visible') !== 'visible').length,
      parser_profile_candidates: ['meta_compatible_internal_full_export'],
      preflight_status: validationStatus,
    },
    sheet_summary: buildSheetSummary(input),
    mapping_report: {
      parser_profile: 'inline_mock_profile_v1',
      source_type: getAllowedMetadataSourceType(input.metadata) ?? 'missing',
      schema_mapping_version: SCHEMA_MAPPING_VERSION,
      canonical_field_status: canonicalFieldStatus,
      mapping_confidence_summary: buildConfidenceSummary(canonicalFieldStatus),
      metric_reconciliation_status: derivedMetricPreview.metric_reconciliation_status,
      validation_status: validationStatus,
      approval_status: approvalStatus,
      approval_blockers: approvalBlockers,
      window_policy: windowPolicy,
      excluded_from_default_benchmark: windowPolicy !== 'recent_6_months',
    },
    accepted_columns: mappingResult.acceptedColumns,
    rejected_columns: mappingResult.rejectedColumns,
    missing_required_fields: missingRequiredFields,
    warnings,
    derived_metric_preview: derivedMetricPreview,
    privacy_findings: privacyFindings,
    reviewer_action_required: reviewerActions,
    normalized_preview_sample: normalizedPreviewSample,
  };
}

function baseMetadata(overrides: Partial<BenchmarkDryRunMetadata> = {}): BenchmarkDryRunMetadata {
  return {
    platform: 'meta',
    source_type: 'dashboard_export',
    exported_at: '2026-05-07',
    timezone: 'Asia/Seoul',
    net_or_gross: 'net',
    markup_policy: 'included',
    aggregation_level: 'daily',
    uploader: 'mock_uploader',
    approval_status: 'draft',
    ...overrides,
  };
}

function baseRows(): SourceRow[] {
  return [
    {
      platform: 'meta',
      date_start: '2026-04-01',
      date_stop: '2026-04-07',
      objective: 'traffic',
      optimization_goal: 'link_clicks',
      spend: 120000,
      currency: 'KRW',
      impressions: 80000,
      clicks: 1600,
      reach: 52000,
    },
    {
      platform: 'meta',
      date_start: '2026-04-08',
      date_stop: '2026-04-14',
      objective: 'traffic',
      optimization_goal: 'link_clicks',
      spend: 130000,
      currency: 'KRW',
      impressions: 85000,
      clicks: 1700,
      reach: 55000,
    },
  ];
}

function omitSourceField(row: SourceRow, field: string): SourceRow {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => key !== field)
  );
}

export function buildBenchmarkDryRunMockCases(): BenchmarkDryRunInput[] {
  return [
    {
      case_name: 'good_sample',
      file_name: 'good_sample.inline',
      file_type: 'inline_mock',
      as_of_date: '2026-05-07',
      metadata: baseMetadata(),
      sheets: [{ name: 'benchmark_upload', rows: baseRows() }],
    },
    {
      case_name: 'missing_spend',
      file_name: 'missing_spend.inline',
      file_type: 'inline_mock',
      as_of_date: '2026-05-07',
      metadata: baseMetadata(),
      sheets: [{
        name: 'benchmark_upload',
        rows: baseRows().map((row) => omitSourceField(row, 'spend')),
      }],
    },
    {
      case_name: 'mixed_currency',
      file_name: 'mixed_currency.inline',
      file_type: 'inline_mock',
      as_of_date: '2026-05-07',
      metadata: baseMetadata({ currency: undefined }),
      sheets: [{
        name: 'benchmark_upload',
        rows: baseRows().map((row, index) => ({
          ...row,
          currency: index === 0 ? 'KRW' : 'USD',
        })),
      }],
    },
    {
      case_name: 'token_bearing_url',
      file_name: 'token_bearing_url.inline',
      file_type: 'inline_mock',
      as_of_date: '2026-05-07',
      metadata: baseMetadata(),
      sheets: [{
        name: 'benchmark_upload',
        rows: baseRows().map((row) => ({
          ...row,
          landing_url: 'https://example.invalid/export?credential_marker=present',
        })),
      }],
    },
    {
      case_name: 'long_term_data',
      file_name: 'long_term_data.inline',
      file_type: 'inline_mock',
      as_of_date: '2026-05-07',
      metadata: baseMetadata(),
      sheets: [{
        name: 'benchmark_upload',
        rows: baseRows().map((row, index) => ({
          ...row,
          date_start: index === 0 ? '2025-01-01' : '2025-02-01',
          date_stop: index === 0 ? '2025-01-31' : '2025-02-28',
        })),
      }],
    },
    {
      case_name: 'raw_identifier_heavy_sample',
      file_name: 'raw_identifier_heavy_sample.inline',
      file_type: 'inline_mock',
      as_of_date: '2026-05-07',
      metadata: baseMetadata(),
      sheets: [{
        name: 'benchmark_upload',
        rows: baseRows().map((row, index) => ({
          ...row,
          account_id: `acct_mock_${index + 1}`,
          campaign_name: `campaign_mock_${index + 1}`,
          adset_name: `adset_mock_${index + 1}`,
          ad_name: `ad_mock_${index + 1}`,
          advertiser: `advertiser_mock_${index + 1}`,
        })),
      }],
    },
  ];
}

export function validateMockExpectations(reports: BenchmarkDryRunReport[]): string[] {
  const byName = new Map(reports.map((report) => [report.case_name, report]));
  const failures: string[] = [];

  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  const good = byName.get('good_sample');
  expect(good?.mapping_report.validation_status === 'passed', 'good_sample should pass validation');
  expect(good?.missing_required_fields.length === 0, 'good_sample should not miss required fields');

  const missingSpend = byName.get('missing_spend');
  expect(missingSpend?.mapping_report.validation_status === 'failed', 'missing_spend should fail validation');
  expect(
    Boolean(missingSpend?.missing_required_fields.some((field) => field.canonical_field === 'spend')),
    'missing_spend should report missing spend',
  );

  const mixedCurrency = byName.get('mixed_currency');
  expect(
    Boolean(mixedCurrency?.warnings.some((warning) => warning.warning_code === 'mixed_currency')),
    'mixed_currency should warn about mixed currency',
  );
  expect(
    Boolean(mixedCurrency?.reviewer_action_required.some((action) => action.action_type === 'split_mixed_currency')),
    'mixed_currency should require split_mixed_currency action',
  );

  const tokenUrl = byName.get('token_bearing_url');
  expect(tokenUrl?.mapping_report.validation_status === 'security_failed', 'token_bearing_url should fail security validation');
  expect(tokenUrl?.privacy_findings.secret_like_value_detected === true, 'token_bearing_url should detect secret-like value');
  expect(tokenUrl?.normalized_preview_sample.length === 0, 'token_bearing_url should not generate normalized preview');

  const longTerm = byName.get('long_term_data');
  expect(longTerm?.mapping_report.window_policy === 'long_term_trend', 'long_term_data should be long_term_trend');
  expect(
    Boolean(longTerm?.warnings.some((warning) => warning.warning_code === 'long_term_only')),
    'long_term_data should warn long_term_only',
  );

  const identifiers = byName.get('raw_identifier_heavy_sample');
  expect(identifiers?.privacy_findings.identifier_columns_detected === true, 'raw_identifier_heavy_sample should detect identifiers');
  expect(
    Boolean(identifiers?.reviewer_action_required.some((action) => action.action_type === 'remove_or_mask_identifier_output')),
    'raw_identifier_heavy_sample should require identifier masking',
  );
  expect(
    identifiers?.privacy_findings.llm_boundary_status === 'safe_only_if_aggregate',
    'raw_identifier_heavy_sample should be safe only if aggregate',
  );

  return failures;
}

export function runBenchmarkDryRunMockCases(): MockRunResult {
  const reports = buildBenchmarkDryRunMockCases().map(runBenchmarkDryRun);
  const expectation_failures = validateMockExpectations(reports);
  return {
    reports,
    summary: reports.map((report) => ({
      case_name: report.case_name,
      validation_status: report.mapping_report.validation_status,
      approval_status: report.mapping_report.approval_status,
      warning_codes: report.warnings.map((warning) => warning.warning_code),
      missing_required_fields: report.missing_required_fields.map((field) => field.canonical_field),
      privacy_status: report.privacy_findings.llm_boundary_status,
      reviewer_actions: report.reviewer_action_required.map((action) => action.action_type),
    })),
    expectation_failures,
  };
}
