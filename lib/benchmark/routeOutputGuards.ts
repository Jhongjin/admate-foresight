import type {
  BenchmarkTrustState,
  BenchmarkUiStateFixture,
} from './uiStateFixtures.mts';
import { buildBenchmarkUiStateViewModel } from './uiStateViewModel';

export interface BenchmarkRouteOutputGuardResult {
  state: BenchmarkTrustState;
  safeOutput: {
    statusLabel: string;
    metricLabel: string;
    metricValue: string;
    confidenceLabel: string;
    basisLines: string[];
    visibleCopy: string[];
    blockedOutputs: string[];
    redactionExpectations: string[];
    syntheticContextLabel: string;
  };
  reportReady: false;
  promotionReady: false;
  unsafeFindings: string[];
}

const UNSAFE_OUTPUT_PATTERNS: RegExp[] = [
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
  /[A-Z]:\\/,
  /\/home\//i,
  /\/users\//i,
  /row[_ -]?\d+/i,
];

function collectUnsafeFindings(output: unknown): string[] {
  const serialized = JSON.stringify(output);

  return UNSAFE_OUTPUT_PATTERNS
    .filter((pattern) => pattern.test(serialized))
    .map((pattern) => `Unsafe route output pattern matched: ${pattern}`);
}

export function buildBenchmarkRouteOutputGuardResult(
  fixture: BenchmarkUiStateFixture,
): BenchmarkRouteOutputGuardResult {
  const viewModel = buildBenchmarkUiStateViewModel(fixture);
  const safeOutput = {
    statusLabel: viewModel.statusLabel,
    metricLabel: viewModel.metricLabel,
    metricValue: viewModel.metricValue,
    confidenceLabel: viewModel.confidenceLabel,
    basisLines: viewModel.basisLines,
    visibleCopy: viewModel.visibleCopy,
    blockedOutputs: viewModel.blockedOutputs,
    redactionExpectations: viewModel.redactionExpectations,
    syntheticContextLabel: viewModel.syntheticContextLabel,
  };

  return {
    state: viewModel.state,
    safeOutput,
    reportReady: false,
    promotionReady: false,
    unsafeFindings: collectUnsafeFindings(safeOutput),
  };
}

export function buildBenchmarkRouteOutputGuardResults(
  fixtures: BenchmarkUiStateFixture[],
): BenchmarkRouteOutputGuardResult[] {
  return fixtures.map(buildBenchmarkRouteOutputGuardResult);
}
