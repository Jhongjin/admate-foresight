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
    metricValue: metric?.value_label ?? 'blocked until reviewer action',
    confidenceLabel: metric?.confidence_label ?? fixture.status_label,
    basisLines: [
      `Platform: ${fixture.basis.platform}`,
      `Objective: ${fixture.basis.objective}`,
      `Metric: ${fixture.basis.metric}`,
      `Window: ${fixture.basis.date_window}`,
      `Policy: ${fixture.basis.recent_data_policy}`,
      `Coverage: ${fixture.basis.sample_or_coverage}`,
      `Currency: ${fixture.basis.currency_basis}`,
    ],
    visibleCopy: fixture.visible_copy,
    blockedOutputs: fixture.blocked_outputs,
    redactionExpectations: fixture.redaction_expectations,
    syntheticContextLabel: 'synthetic local fixture only',
    reportReady: false,
    promotionReady: false,
  };
}

export function buildBenchmarkUiStateViewModels(
  fixtures: BenchmarkUiStateFixture[],
): BenchmarkUiStateViewModel[] {
  return fixtures.map(buildBenchmarkUiStateViewModel);
}
