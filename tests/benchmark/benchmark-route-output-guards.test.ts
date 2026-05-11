import { describe, expect, it } from 'vitest';

import {
  buildForesightBenchmarkUiStateFixtures,
  type BenchmarkTrustState,
} from '../../lib/benchmark/uiStateFixtures.mts';
import { buildBenchmarkRouteOutputGuardResults } from '../../lib/benchmark/routeOutputGuards';

const REQUIRED_BLOCKED_OUTPUTS: Record<BenchmarkTrustState, string[]> = {
  'benchmark-ready': [
    'benchmark import',
    'DB promotion',
    'LLM prompt payload',
  ],
  'low-confidence': [
    'overclaiming forecast copy',
    'report export without confidence reason',
  ],
  'long-term-trend-only': [
    'default benchmark use',
    'mixed recent and stale benchmark card',
  ],
  'validation-error': [
    'storage',
    'benchmark promotion',
    'model use',
    'report-ready output',
  ],
  'security-review-required': [
    'normalized preview',
    'benchmark promotion',
    'report export',
    'LLM prompt payload',
  ],
  'raw-identifier-risk': [
    'raw identifier display',
    'LLM prompt payload with identifiers',
  ],
  'no-benchmark-data': [
    'forecast fabrication',
    'empty source shell shown as evidence',
  ],
};

const FORBIDDEN_RENDERED_OUTPUTS = [
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
];

describe('benchmark route output guards', () => {
  it('keeps every route-facing fixture output aggregate-only and local', () => {
    const results = buildBenchmarkRouteOutputGuardResults(
      buildForesightBenchmarkUiStateFixtures(),
    );

    for (const result of results) {
      const serialized = JSON.stringify(result.safeOutput);

      expect(result.reportReady).toBe(false);
      expect(result.promotionReady).toBe(false);
      expect(result.unsafeFindings).toEqual([]);
      expect(result.safeOutput.syntheticContextLabel).toBe(
        'synthetic local fixture only',
      );

      for (const pattern of FORBIDDEN_RENDERED_OUTPUTS) {
        expect(serialized).not.toMatch(pattern);
      }
    }
  });

  it('preserves the approved blocked-output concepts for each trust state', () => {
    const results = buildBenchmarkRouteOutputGuardResults(
      buildForesightBenchmarkUiStateFixtures(),
    );

    for (const result of results) {
      expect(result.safeOutput.blockedOutputs).toEqual(
        expect.arrayContaining(REQUIRED_BLOCKED_OUTPUTS[result.state]),
      );
    }
  });

  it('keeps high-risk states explicitly blocked from preview, LLM, or fabrication paths', () => {
    const results = new Map(
      buildBenchmarkRouteOutputGuardResults(
        buildForesightBenchmarkUiStateFixtures(),
      ).map((result) => [result.state, result]),
    );

    expect(results.get('security-review-required')?.safeOutput.blockedOutputs)
      .toEqual(expect.arrayContaining(['normalized preview', 'LLM prompt payload']));
    expect(results.get('raw-identifier-risk')?.safeOutput.blockedOutputs)
      .toEqual(expect.arrayContaining(['raw identifier display']));
    expect(results.get('no-benchmark-data')?.safeOutput.blockedOutputs)
      .toEqual(expect.arrayContaining(['forecast fabrication']));
  });
});
