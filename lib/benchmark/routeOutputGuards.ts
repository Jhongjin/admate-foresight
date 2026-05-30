import type {
  BenchmarkTrustState,
  BenchmarkUiStateFixture,
} from './uiStateFixtures.mts';
import {
  buildBenchmarkUiStateViewModel,
  type BenchmarkUiStateViewModel,
} from './uiStateViewModel';

export interface BenchmarkRouteSafeOutput {
  statusLabel: string;
  metricLabel: string;
  metricValue: string;
  confidenceLabel: string;
  basisLines: string[];
  visibleCopy: string[];
  blockedOutputs: string[];
  redactionExpectations: string[];
  syntheticContextLabel: string;
}

export const BENCHMARK_ROUTE_SAFE_OUTPUT_KEYS = [
  'statusLabel',
  'metricLabel',
  'metricValue',
  'confidenceLabel',
  'basisLines',
  'visibleCopy',
  'blockedOutputs',
  'redactionExpectations',
  'syntheticContextLabel',
] as const satisfies readonly (keyof BenchmarkRouteSafeOutput)[];

export type BenchmarkRouteSafeOutputKey =
  (typeof BENCHMARK_ROUTE_SAFE_OUTPUT_KEYS)[number];

export interface BenchmarkRouteOutputGuardResult {
  state: BenchmarkTrustState;
  safeOutput: BenchmarkRouteSafeOutput;
  reportReady: false;
  promotionReady: false;
  unsafeFindings: string[];
}

const BENCHMARK_ROUTE_SAFE_OUTPUT_KEY_SET = new Set<string>(
  BENCHMARK_ROUTE_SAFE_OUTPUT_KEYS,
);

const UNSAFE_OUTPUT_VALUE_PATTERNS: RegExp[] = [
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
  /bearer\s+[a-z0-9._-]+/i,
  /api[_-]?key\s*[:=]/i,
  /secret\s*[:=]/i,
];

const UNSAFE_OUTPUT_KEY_PATTERNS: RegExp[] = [
  /source[_-]?case/i,
  /reviewer[_-]?actions/i,
  /primary[_-]?surface/i,
  /(?:raw|source)[_-]?(?:rows?|records?|data)/i,
  /url/i,
  /provider/i,
  /token/i,
  /session/i,
  /cookie/i,
  /secret/i,
  /credential/i,
];

function collectSafeOutputShapeFindings(output: unknown): string[] {
  if (output === null || typeof output !== 'object' || Array.isArray(output)) {
    return ['Safe route output must be an aggregate-only object'];
  }

  const outputKeys = Object.keys(output);
  const missingKeys = BENCHMARK_ROUTE_SAFE_OUTPUT_KEYS.filter(
    (key) => !outputKeys.includes(key),
  );
  const unexpectedKeys = outputKeys.filter(
    (key) => !BENCHMARK_ROUTE_SAFE_OUTPUT_KEY_SET.has(key),
  );
  const findings: string[] = [];

  if (missingKeys.length > 0) {
    findings.push(`Safe route output missing keys: ${missingKeys.join(', ')}`);
  }

  if (unexpectedKeys.length > 0) {
    findings.push(
      `Safe route output has non-route-safe keys: ${unexpectedKeys.join(', ')}`,
    );
  }

  return findings;
}

function collectUnsafeKeyFindings(
  output: unknown,
  path = 'safeOutput',
): string[] {
  if (output === null || typeof output !== 'object') {
    return [];
  }

  if (Array.isArray(output)) {
    return output.flatMap((item, index) =>
      collectUnsafeKeyFindings(item, `${path}[${index}]`),
    );
  }

  return Object.entries(output as Record<string, unknown>).flatMap(
    ([key, value]) => {
      const keyPath = `${path}.${key}`;
      const ownFindings = UNSAFE_OUTPUT_KEY_PATTERNS
        .filter((pattern) => pattern.test(key))
        .map(
          (pattern) =>
            `Unsafe route output key matched ${pattern}: ${keyPath}`,
        );

      return [
        ...ownFindings,
        ...collectUnsafeKeyFindings(value, keyPath),
      ];
    },
  );
}

function collectUnsafeFindings(output: unknown): string[] {
  const serialized = JSON.stringify(output) ?? '';
  const valueFindings = UNSAFE_OUTPUT_VALUE_PATTERNS
    .filter((pattern) => pattern.test(serialized))
    .map((pattern) => `Unsafe route output value pattern matched: ${pattern}`);

  return [
    ...collectSafeOutputShapeFindings(output),
    ...collectUnsafeKeyFindings(output),
    ...valueFindings,
  ];
}

function buildBenchmarkRouteSafeOutput(
  viewModel: BenchmarkUiStateViewModel,
): BenchmarkRouteSafeOutput {
  return {
    statusLabel: viewModel.statusLabel,
    metricLabel: viewModel.metricLabel,
    metricValue: viewModel.metricValue,
    confidenceLabel: viewModel.confidenceLabel,
    basisLines: viewModel.basisLines,
    visibleCopy: viewModel.visibleCopy,
    blockedOutputs: viewModel.blockedOutputs,
    redactionExpectations: viewModel.redactionExpectations,
    syntheticContextLabel: viewModel.syntheticContextLabel,
  } satisfies BenchmarkRouteSafeOutput;
}

export function buildBenchmarkRouteOutputGuardResult(
  fixture: BenchmarkUiStateFixture,
): BenchmarkRouteOutputGuardResult {
  const viewModel = buildBenchmarkUiStateViewModel(fixture);
  const safeOutput = buildBenchmarkRouteSafeOutput(viewModel);

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
