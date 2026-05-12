import type {
  BenchmarkTrustState,
  BenchmarkUiStateFixture,
} from './uiStateFixtures.mts';

export const BENCHMARK_UI_TRUST_STATES: BenchmarkTrustState[] = [
  'benchmark-ready',
  'low-confidence',
  'long-term-trend-only',
  'validation-error',
  'security-review-required',
  'raw-identifier-risk',
  'no-benchmark-data',
];

export interface BenchmarkUiStateViewModel {
  state: BenchmarkTrustState;
  surface: BenchmarkUiStateFixture['primary_surface'];
  statusLabel: string;
  metricLabel: string;
  metricValue: string;
  confidenceLabel: string;
  basisLines: string[];
  visibleCopy: string[];
  blockedOutputs: string[];
  redactionExpectations: string[];
  syntheticContextLabel: string;
  reportReady: boolean;
  promotionReady: boolean;
}

export function buildBenchmarkUiStateViewModel(
  fixture: BenchmarkUiStateFixture,
): BenchmarkUiStateViewModel {
  const metric = fixture.metric;

  return {
    state: fixture.state,
    surface: fixture.primary_surface,
    statusLabel: fixture.status_label,
    metricLabel: metric?.label ?? fixture.basis.metric,
    metricValue: metric?.value_label ?? '검토 전 표시 제한',
    confidenceLabel: metric?.confidence_label ?? fixture.status_label,
    basisLines: [
      `플랫폼: ${fixture.basis.platform}`,
      `목표: ${fixture.basis.objective}`,
      `지표: ${fixture.basis.metric}`,
      `기간: ${fixture.basis.date_window}`,
      `검토 기준: ${fixture.basis.recent_data_policy}`,
      `표본 범위: ${fixture.basis.sample_or_coverage}`,
      `통화 기준: ${fixture.basis.currency_basis}`,
    ],
    visibleCopy: fixture.visible_copy,
    blockedOutputs: fixture.blocked_outputs,
    redactionExpectations: fixture.redaction_expectations,
    syntheticContextLabel: '로컬 검증용 예시 데이터',
    reportReady: false,
    promotionReady: false,
  };
}

export function buildBenchmarkUiStateViewModels(
  fixtures: BenchmarkUiStateFixture[],
): BenchmarkUiStateViewModel[] {
  return fixtures.map(buildBenchmarkUiStateViewModel);
}
