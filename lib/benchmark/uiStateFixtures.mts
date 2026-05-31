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

const FORBIDDEN_USER_FACING_COPY_PATTERNS = [
  /confidence/i,
  /신뢰도/i,
  /확신/i,
  /확정/i,
  /보장/i,
  /promise/i,
  /certainty/i,
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
  const currency = previewCurrency && previewCurrency !== 'missing' ? previewCurrency : '검토자 확인 필요';
  return `${currency}, 순매체비 기준, 마크업 정책 포함`;
}

function formatAggregateMetric(preview: DerivedMetricPreview): string {
  const cpm = preview.aggregate_preview.cpm;
  if (typeof cpm !== 'number') return '계산 제한';
  return `CPM ${Math.round(cpm).toLocaleString('en-US')}`;
}

function baseBasis(report: BenchmarkDryRunReport, overrides: Partial<BenchmarkUiStateFixture['basis']> = {}): BenchmarkUiStateFixture['basis'] {
  return {
    platform: 'Meta',
    objective: '트래픽 / 링크 클릭',
    metric: 'CPM',
    date_window: report.mapping_report.window_policy === 'long_term_trend'
      ? '최근 6개월 기준보다 오래된 기간'
      : '최근 6개월 기준 기간',
    recent_data_policy: report.mapping_report.excluded_from_default_benchmark
      ? '기본 벤치마크 기준에서 제외'
      : '최근 벤치마크 검토 가능',
    sample_or_coverage: `예시 집계 행 ${report.sheet_summary[0]?.estimated_rows ?? 0}건`,
    currency_basis: formatCurrencyBasis(report),
    mock_status: 'synthetic_local_fixture',
    ...overrides,
  };
}

function reviewerActionLabels(report: BenchmarkDryRunReport): string[] {
  return report.reviewer_action_required.map((action) => action.action_type);
}

function userFacingCopyForFixture(fixture: BenchmarkUiStateFixture): string[] {
  return [
    fixture.status_label,
    fixture.metric?.label,
    fixture.metric?.value_label,
    fixture.metric?.confidence_label,
    fixture.metric?.basis_label,
    fixture.basis.platform,
    fixture.basis.objective,
    fixture.basis.metric,
    fixture.basis.date_window,
    fixture.basis.recent_data_policy,
    fixture.basis.sample_or_coverage,
    fixture.basis.currency_basis,
    ...fixture.visible_copy,
    ...fixture.redaction_expectations,
    ...fixture.blocked_outputs,
  ].filter((value): value is string => typeof value === 'string');
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
      status_label: '검토자 승인 대기',
      primary_surface: 'kpi_card',
      metric: {
        label: '예시 벤치마크 CPM',
        value_label: formatAggregateMetric(good.derived_metric_preview),
        confidence_label: '검토 근거 충분',
        basis_label: '최근 집계 예시, KRW 순매체비 기준 명시',
      },
      basis: baseBasis(good),
      visible_copy: [
        '지표와 함께 벤치마크 기준을 표시합니다.',
        '로컬 검증용 예시 데이터입니다.',
      ],
      reviewer_actions: reviewerActionLabels(good),
      redaction_expectations: [
        '캠페인, 계정, 광고주, 행 단위 값은 표시하지 않습니다.',
      ],
      blocked_outputs: [
        '벤치마크 가져오기',
        '데이터베이스 반영',
        '외부 생성 요청',
      ],
    },
    {
      state: 'low-confidence',
      source_case: 'synthetic_low_confidence_overlay',
      status_label: '운영자 검토 필요',
      primary_surface: 'forecast_panel',
      metric: {
        label: '예시 예측 CPM',
        value_label: 'CPM 범위 표시 제한',
        confidence_label: '검토 근거 부족: 표본 범위 부족',
        basis_label: '지표 옆 표본 범위 주의 안내',
      },
      basis: baseBasis(good, {
        sample_or_coverage: '예시 표본 범위 부족',
      }),
      visible_copy: [
        '이 범위의 벤치마크 기준은 제한적입니다.',
        '보고서 또는 내보내기 전에 검토 근거 부족 사유를 표시합니다.',
      ],
      reviewer_actions: ['review_basis_before_export'],
      redaction_expectations: [
        '실제 볼륨, 지출, 전환, 매출, 비공개 벤치마크 값은 표시하지 않습니다.',
      ],
      blocked_outputs: [
        '성과 단정 표현',
        '검토 근거 사유 없는 보고서 내보내기',
      ],
    },
    {
      state: 'long-term-trend-only',
      source_case: longTerm.case_name,
      status_label: '장기 추세 참고 전용',
      primary_surface: 'trend_table',
      metric: {
        label: '예시 과거 CPM',
        value_label: formatAggregateMetric(longTerm.derived_metric_preview),
        confidence_label: '추세 참고 전용',
        basis_label: '기본 벤치마크에서 제외된 과거 기간',
      },
      basis: baseBasis(longTerm),
      visible_copy: [
        '장기 추세 참고용으로만 사용합니다.',
        '최근 벤치마크와 추세 참고 데이터는 분리해 표시합니다.',
      ],
      reviewer_actions: reviewerActionLabels(longTerm),
      redaction_expectations: [
        '오래된 데이터를 현재 벤치마크 근거로 표시하지 않습니다.',
      ],
      blocked_outputs: [
        '기본 벤치마크 적용',
        '최근 기준과 오래된 기준을 섞은 카드',
      ],
    },
    {
      state: 'validation-error',
      source_case: missingSpend.case_name,
      status_label: '검증 오류',
      primary_surface: 'upload_mapping_panel',
      basis: baseBasis(missingSpend, {
        metric: 'CPM / CPC',
        sample_or_coverage: '필수 지출 항목 누락',
      }),
      visible_copy: [
        '필수 항목인 지출 값이 누락되었습니다.',
        '수정된 메타데이터 또는 새 예시 내보내기를 요청하세요.',
      ],
      reviewer_actions: reviewerActionLabels(missingSpend),
      redaction_expectations: [
        '표준 필드명과 조치 안내만 표시합니다.',
      ],
      blocked_outputs: [
        '저장',
        '벤치마크 반영',
        '모델 사용',
        '보고서 표시',
      ],
    },
    {
      state: 'security-review-required',
      source_case: security.case_name,
      status_label: '보안 검토 필요',
      primary_surface: 'blocked_promotion_panel',
      basis: baseBasis(security, {
        metric: '전체 지표 제한',
        sample_or_coverage: '보호 대상 값 마스킹됨',
      }),
      visible_copy: [
        '반영 전 보안 검토가 필요합니다.',
        '보호 대상 원천 값은 마스킹되어 제한되었습니다.',
      ],
      reviewer_actions: reviewerActionLabels(security),
      redaction_expectations: [
        'URL, 인증정보 유사 값, 원본 행은 표시하지 않습니다.',
      ],
      blocked_outputs: [
        '정규화 미리보기',
        '벤치마크 반영',
        '보고서 내보내기',
        '외부 생성 요청',
      ],
    },
    {
      state: 'raw-identifier-risk',
      source_case: identifiers.case_name,
      status_label: '원본 식별자 위험',
      primary_surface: 'report_preview',
      metric: {
        label: '예시 집계 CPM',
        value_label: formatAggregateMetric(identifiers.derived_metric_preview),
        confidence_label: '집계 기준만 표시',
        basis_label: '보고서 표시에서 식별자 제외',
      },
      basis: baseBasis(identifiers, {
        sample_or_coverage: '식별자 열 감지, 집계 출력만 허용',
      }),
      visible_copy: [
        '원본 식별자는 보고서 표시에서 제외되었습니다.',
        '집계 기준 표시만 가능하다는 확인이 필요합니다.',
      ],
      reviewer_actions: reviewerActionLabels(identifiers),
      redaction_expectations: [
        '계정, 캠페인, 광고 세트, 광고, 광고주 식별자는 UI 문구에 표시하지 않습니다.',
      ],
      blocked_outputs: [
        '원본 식별자 표시',
        '식별자를 포함한 외부 생성 요청',
      ],
    },
    {
      state: 'no-benchmark-data',
      source_case: 'synthetic_empty_scope',
      status_label: '사용 가능한 벤치마크 없음',
      primary_surface: 'empty_benchmark_table',
      basis: {
        platform: 'Meta',
        objective: '좁은 예시 목표',
        metric: 'CPM',
        date_window: '최근 6개월 기준 기간 확인',
        recent_data_policy: '기본 벤치마크 근거 없음',
        sample_or_coverage: '예시 집계 행 0건',
        currency_basis: '데이터 확보 전 적용 불가',
        mock_status: 'synthetic_local_fixture',
      },
      visible_copy: [
        '이 선택 조건에는 사용할 수 있는 집계 벤치마크가 없습니다.',
        '필터를 조정하거나 검토된 집계 벤치마크 소스를 요청하세요.',
      ],
      reviewer_actions: ['adjust_filters_or_request_reviewed_source'],
      redaction_expectations: [
        '빈 범위에서 예측을 임의 생성하지 않습니다.',
      ],
      blocked_outputs: [
        '예측 임의 생성',
        '빈 소스를 근거처럼 표시',
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
    const userFacingCopy = userFacingCopyForFixture(fixture).join(' ');
    for (const pattern of FORBIDDEN_USER_FACING_COPY_PATTERNS) {
      if (pattern.test(userFacingCopy)) {
        sanitizer_failures.push(`${fixture.state} contains forbidden user-facing copy pattern ${pattern}`);
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
