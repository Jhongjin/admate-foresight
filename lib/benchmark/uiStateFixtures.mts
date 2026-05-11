import {
  type BenchmarkDryRunReport,
  type DerivedMetricPreview,
  runBenchmarkDryRunMockCases,
} from './dryRunHarness.mts';

export type BenchmarkTrustState =
  | 'benchmark-ready'
  | 'low-confidence'
  | 'long-term-trend-only'
  | 'validation-error'
  | 'security-review-required'
  | 'raw-identifier-risk'
  | 'no-benchmark-data';

export interface BenchmarkUiMetricFixture {
  label: string;
  value_label: string;
  confidence_label: string;
  basis_label: string;
}

export interface BenchmarkUiStateFixture {
  state: BenchmarkTrustState;
  source_case: string;
  status_label: string;
  primary_surface: 'kpi_card' | 'forecast_panel' | 'trend_table' | 'upload_mapping_panel' | 'blocked_promotion_panel' | 'report_preview' | 'empty_benchmark_table';
  metric?: BenchmarkUiMetricFixture;
  basis: {
    platform: string;
    objective: string;
    metric: string;
    date_window: string;
    recent_data_policy: string;
    sample_or_coverage: string;
    currency_basis: string;
    mock_status: 'synthetic_local_fixture';
  };
  visible_copy: string[];
  reviewer_actions: string[];
  redaction_expectations: string[];
  blocked_outputs: string[];
}

export interface BenchmarkUiFixtureValidation {
  expected_states: BenchmarkTrustState[];
  missing_states: BenchmarkTrustState[];
  sanitizer_failures: string[];
}

const EXPECTED_STATES: BenchmarkTrustState[] = [
  'benchmark-ready',
  'low-confidence',
  'long-term-trend-only',
  'validation-error',
  'security-review-required',
  'raw-identifier-risk',
  'no-benchmark-data',
];

const FORBIDDEN_OUTPUT_PATTERNS = [
  /acct_mock/i,
  /campaign_mock/i,
  /adset_mock/i,
  /ad_mock/i,
  /advertiser_mock/i,
  /credential_marker/i,
  /access[_-]?token/i,
  /sessionid/i,
  /cookie=/i,
  /https?:\/\//i,
];

function getReport(reports: BenchmarkDryRunReport[], caseName: string): BenchmarkDryRunReport {
  const report = reports.find((candidate) => candidate.case_name === caseName);
  if (!report) {
    throw new Error(`Missing benchmark dry-run mock report: ${caseName}`);
  }
  return report;
}

function formatCurrencyBasis(report: BenchmarkDryRunReport): string {
  const previewCurrency = report.normalized_preview_sample[0]?.currency;
  const currency = previewCurrency && previewCurrency !== 'missing' ? previewCurrency : 'requires reviewer confirmation';
  return `${currency}, net basis, markup policy included`;
}

function formatAggregateMetric(preview: DerivedMetricPreview): string {
  const cpm = preview.aggregate_preview.cpm;
  if (typeof cpm !== 'number') return 'calculation blocked';
  return `CPM ${Math.round(cpm).toLocaleString('en-US')}`;
}

function baseBasis(report: BenchmarkDryRunReport, overrides: Partial<BenchmarkUiStateFixture['basis']> = {}): BenchmarkUiStateFixture['basis'] {
  return {
    platform: 'Meta',
    objective: 'Traffic / link clicks',
    metric: 'CPM',
    date_window: report.mapping_report.window_policy === 'long_term_trend'
      ? 'Older than recent six-month benchmark window'
      : 'Recent six-month benchmark window',
    recent_data_policy: report.mapping_report.excluded_from_default_benchmark
      ? 'Excluded from default benchmark'
      : 'Eligible for default recent benchmark review',
    sample_or_coverage: `${report.sheet_summary[0]?.estimated_rows ?? 0} synthetic aggregate rows`,
    currency_basis: formatCurrencyBasis(report),
    mock_status: 'synthetic_local_fixture',
    ...overrides,
  };
}

function reviewerActionLabels(report: BenchmarkDryRunReport): string[] {
  return report.reviewer_action_required.map((action) => action.action_type);
}

export function buildForesightBenchmarkUiStateFixtures(): BenchmarkUiStateFixture[] {
  const reports = runBenchmarkDryRunMockCases().reports;
  const good = getReport(reports, 'good_sample');
  const missingSpend = getReport(reports, 'missing_spend');
  const security = getReport(reports, 'token_bearing_url');
  const longTerm = getReport(reports, 'long_term_data');
  const identifiers = getReport(reports, 'raw_identifier_heavy_sample');

  return [
    {
      state: 'benchmark-ready',
      source_case: good.case_name,
      status_label: 'Ready for reviewer approval',
      primary_surface: 'kpi_card',
      metric: {
        label: 'Synthetic benchmark CPM',
        value_label: formatAggregateMetric(good.derived_metric_preview),
        confidence_label: 'High confidence fixture',
        basis_label: 'Recent aggregate mock, explicit KRW/net basis',
      },
      basis: baseBasis(good),
      visible_copy: [
        'Benchmark basis is visible with the metric.',
        'Synthetic fixture only.',
      ],
      reviewer_actions: reviewerActionLabels(good),
      redaction_expectations: [
        'No campaign, account, advertiser, or row-level values are displayed.',
      ],
      blocked_outputs: [
        'benchmark import',
        'DB promotion',
        'LLM prompt payload',
      ],
    },
    {
      state: 'low-confidence',
      source_case: 'synthetic_low_confidence_overlay',
      status_label: 'Low confidence',
      primary_surface: 'forecast_panel',
      metric: {
        label: 'Synthetic forecast CPM',
        value_label: 'CPM range withheld',
        confidence_label: 'Low confidence: low sample coverage',
        basis_label: 'Synthetic coverage warning near metric',
      },
      basis: baseBasis(good, {
        sample_or_coverage: 'Low synthetic coverage',
      }),
      visible_copy: [
        'Benchmark basis is limited for this scope.',
        'Low confidence reason is shown before report/export action.',
      ],
      reviewer_actions: ['review_basis_before_export'],
      redaction_expectations: [
        'No real volume, spend, conversion, revenue, or private benchmark value is present.',
      ],
      blocked_outputs: [
        'overclaiming forecast copy',
        'report export without confidence reason',
      ],
    },
    {
      state: 'long-term-trend-only',
      source_case: longTerm.case_name,
      status_label: 'Long-term trend reference only',
      primary_surface: 'trend_table',
      metric: {
        label: 'Synthetic historical CPM',
        value_label: formatAggregateMetric(longTerm.derived_metric_preview),
        confidence_label: 'Trend-only fixture',
        basis_label: 'Older period excluded from default benchmark',
      },
      basis: baseBasis(longTerm),
      visible_copy: [
        'Long-term trend reference only.',
        'Recent benchmark and trend-only data are separated.',
      ],
      reviewer_actions: reviewerActionLabels(longTerm),
      redaction_expectations: [
        'No stale data is labeled as current benchmark evidence.',
      ],
      blocked_outputs: [
        'default benchmark use',
        'mixed recent and stale benchmark card',
      ],
    },
    {
      state: 'validation-error',
      source_case: missingSpend.case_name,
      status_label: 'Validation error',
      primary_surface: 'upload_mapping_panel',
      basis: baseBasis(missingSpend, {
        metric: 'CPM / CPC',
        sample_or_coverage: 'Required spend field missing',
      }),
      visible_copy: [
        'Missing required field: spend.',
        'Request corrected metadata or a new synthetic export.',
      ],
      reviewer_actions: reviewerActionLabels(missingSpend),
      redaction_expectations: [
        'Only canonical field names and remediation are shown.',
      ],
      blocked_outputs: [
        'storage',
        'benchmark promotion',
        'model use',
        'report-ready output',
      ],
    },
    {
      state: 'security-review-required',
      source_case: security.case_name,
      status_label: 'Security review required',
      primary_surface: 'blocked_promotion_panel',
      basis: baseBasis(security, {
        metric: 'All metrics blocked',
        sample_or_coverage: 'Guarded value redacted',
      }),
      visible_copy: [
        'Security review is required before promotion.',
        'Guarded source value was redacted and blocked.',
      ],
      reviewer_actions: reviewerActionLabels(security),
      redaction_expectations: [
        'No URL, credential-like value, or raw row is displayed.',
      ],
      blocked_outputs: [
        'normalized preview',
        'benchmark promotion',
        'report export',
        'LLM prompt payload',
      ],
    },
    {
      state: 'raw-identifier-risk',
      source_case: identifiers.case_name,
      status_label: 'Raw identifier risk',
      primary_surface: 'report_preview',
      metric: {
        label: 'Synthetic aggregate CPM',
        value_label: formatAggregateMetric(identifiers.derived_metric_preview),
        confidence_label: 'Aggregate-only fixture',
        basis_label: 'Identifiers excluded from report-ready output',
      },
      basis: baseBasis(identifiers, {
        sample_or_coverage: 'Identifier columns detected; aggregate output only',
      }),
      visible_copy: [
        'Raw identifiers were excluded from report-ready output.',
        'Aggregate-only confirmation is required.',
      ],
      reviewer_actions: reviewerActionLabels(identifiers),
      redaction_expectations: [
        'Account, campaign, ad set, ad, and advertiser identifiers stay out of UI copy.',
      ],
      blocked_outputs: [
        'raw identifier display',
        'LLM prompt payload with identifiers',
      ],
    },
    {
      state: 'no-benchmark-data',
      source_case: 'synthetic_empty_scope',
      status_label: 'No usable benchmark data',
      primary_surface: 'empty_benchmark_table',
      basis: {
        platform: 'Meta',
        objective: 'Synthetic narrow objective',
        metric: 'CPM',
        date_window: 'Recent six-month benchmark window checked',
        recent_data_policy: 'No default benchmark evidence available',
        sample_or_coverage: '0 synthetic aggregate rows',
        currency_basis: 'Not applicable until data exists',
        mock_status: 'synthetic_local_fixture',
      },
      visible_copy: [
        'No usable aggregate benchmark exists for this selection.',
        'Adjust filters or request a reviewed aggregate benchmark source.',
      ],
      reviewer_actions: ['adjust_filters_or_request_reviewed_source'],
      redaction_expectations: [
        'No forecast is fabricated from an empty scope.',
      ],
      blocked_outputs: [
        'forecast fabrication',
        'empty source shell shown as evidence',
      ],
    },
  ];
}

export function validateForesightBenchmarkUiStateFixtures(fixtures = buildForesightBenchmarkUiStateFixtures()): BenchmarkUiFixtureValidation {
  const presentStates = new Set(fixtures.map((fixture) => fixture.state));
  const missing_states = EXPECTED_STATES.filter((state) => !presentStates.has(state));
  const sanitizer_failures: string[] = [];

  for (const fixture of fixtures) {
    const serialized = JSON.stringify(fixture);
    for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
      if (pattern.test(serialized)) {
        sanitizer_failures.push(`${fixture.state} contains forbidden output pattern ${pattern}`);
      }
    }
    if (fixture.basis.mock_status !== 'synthetic_local_fixture') {
      sanitizer_failures.push(`${fixture.state} is not labeled synthetic_local_fixture`);
    }
  }

  return {
    expected_states: EXPECTED_STATES,
    missing_states,
    sanitizer_failures,
  };
}
