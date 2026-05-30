import { describe, expect, it } from 'vitest';

import {
  normalizeMarketAvg,
  normalizePredictResult,
  type MarketAvg,
  type PredictResult,
} from '../../lib/foresightSimulatorPredictResultContract';

function marketAvg(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    cpm: 5_000,
    cpc: 520,
    cpcLink: 760,
    cpv: 24,
    vtr: 31.25,
    count: 240,
    score: 88,
    grade: 'A',
    cpmDiff: -12.5,
    cpcDiff: -8.2,
    cpcLinkDiff: -6.4,
    cpvDiff: -10,
    vtrDiff: 9.2,
    top20pctCpm: 4_200,
    top20pctCpc: 410,
    industrySelected: true,
    ...overrides,
  };
}

function predictResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    reach: 120_000,
    cpm: 4_400,
    cpc: 480,
    cpcLink: 690,
    cpv: 22,
    vtr: 33.8,
    frequency: 1.42,
    matchedCount: 180,
    r2Cpm: 0.82,
    r2Cpc: 0.77,
    r2Vtr: 0.8,
    predictionMethod: 'regression',
    marketAvg: marketAvg(),
    insights: ['Stable aggregate cost trend.'],
    seasonalityMultiplier: 1.08,
    seasonalityReason: 'Spring demand pattern.',
    qualityIndex: 91,
    qualityPenaltyPct: 3,
    saturationWarning: false,
    ...overrides,
  };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

function expectNoRawIdentifierOrSecretLeak(value: PredictResult | MarketAvg) {
  const forbiddenKeyPatterns = [
    /raw/i,
    /source/i,
    /^account/i,
    /^campaign/i,
    /^ad[_-]?id$/i,
    /^adset/i,
    /^provider/i,
    /url/i,
    /token/i,
    /cookie/i,
    /session/i,
    /secret/i,
    /credential/i,
  ];
  const forbiddenValuePattern =
    /act_123|campaign-123|adset-123|ad-123|provider-123|https:\/\/example\.test|opaque-token-value|opaque-cookie-value|opaque-session-value|opaque-secret-value|source-row/i;

  expect(collectKeys(value).some((key) => (
    forbiddenKeyPatterns.some((pattern) => pattern.test(key))
  ))).toBe(false);
  expect(JSON.stringify(value)).not.toMatch(forbiddenValuePattern);
}

describe('foresight simulator predict result contract', () => {
  it('normalizes /api/predict output into the existing aggregate display shape', () => {
    const result = normalizePredictResult(predictResponse());

    expect(result).toEqual({
      reach: 120_000,
      cpm: 4_400,
      cpc: 480,
      cpcLink: 690,
      cpv: 22,
      vtr: 33.8,
      frequency: 1.42,
      matchedCount: 180,
      r2Cpm: 0.82,
      r2Cpc: 0.77,
      r2Vtr: 0.8,
      predictionMethod: 'regression',
      marketAvg: marketAvg(),
      insights: ['Stable aggregate cost trend.'],
      seasonalityMultiplier: 1.08,
      seasonalityReason: 'Spring demand pattern.',
      qualityIndex: 91,
      qualityPenaltyPct: 3,
      saturationWarning: false,
    });
    expectNoRawIdentifierOrSecretLeak(result!);
  });

  it('allow-lists aggregate fields and drops raw rows, identifiers, URLs, and secret-like copy', () => {
    const result = normalizePredictResult(predictResponse({
      sourceRows: [{ id: 'source-row' }],
      rawRecords: [{ accountId: 'act_123' }],
      accountId: 'act_123',
      campaignId: 'campaign-123',
      adsetId: 'adset-123',
      adId: 'ad-123',
      providerId: 'provider-123',
      url: 'https://example.test/path',
      token: 'opaque-token-value',
      cookie: 'opaque-cookie-value',
      session: 'opaque-session-value',
      secret: 'opaque-secret-value',
      insights: [
        'Budget pressure remains stable.',
        'https://example.test/path',
        'campaign-123',
        'opaque-token-value',
      ],
      seasonalityReason: 'opaque-session-value',
      marketAvg: marketAvg({
        rawRows: [{ id: 'source-row' }],
        providerAccountId: 'act_123',
        cookie: 'opaque-cookie-value',
      }),
    }));

    expect(result).toMatchObject({
      reach: 120_000,
      cpm: 4_400,
      insights: ['Budget pressure remains stable.'],
    });
    expect(result).not.toHaveProperty('seasonalityReason');
    expectNoRawIdentifierOrSecretLeak(result!);
  });

  it('fails closed for malformed required numbers without parsing numeric strings', () => {
    expect(normalizePredictResult(predictResponse({ reach: Number.POSITIVE_INFINITY }))).toBeNull();
    expect(normalizePredictResult(predictResponse({ cpm: Number.NaN }))).toBeNull();
    expect(normalizePredictResult(predictResponse({ cpc: -1 }))).toBeNull();
    expect(normalizePredictResult(predictResponse({ matchedCount: '180' }))).toBeNull();
  });

  it('keeps the result usable while omitting malformed optional aggregate fields', () => {
    const result = normalizePredictResult(predictResponse({
      r2Cpm: Number.NEGATIVE_INFINITY,
      qualityPenaltyPct: -4,
      predictionMethod: 'provider_live_read',
      marketAvg: marketAvg({ cpm: Number.NaN }),
    }));

    expect(result).toMatchObject({
      reach: 120_000,
      cpm: 4_400,
      matchedCount: 180,
    });
    expect(result).not.toHaveProperty('r2Cpm');
    expect(result).not.toHaveProperty('qualityPenaltyPct');
    expect(result).not.toHaveProperty('predictionMethod');
    expect(result).not.toHaveProperty('marketAvg');
    expectNoRawIdentifierOrSecretLeak(result!);
  });

  it('normalizes market averages as aggregate-only data and rejects incomplete market data', () => {
    const normalized = normalizeMarketAvg(marketAvg({
      rawRows: [{ id: 'source-row' }],
      campaignId: 'campaign-123',
      accessToken: 'opaque-token-value',
    }));

    expect(normalized).toEqual(marketAvg());
    expectNoRawIdentifierOrSecretLeak(normalized!);
    expect(normalizeMarketAvg(marketAvg({ top20pctCpc: undefined }))).toBeUndefined();
    expect(normalizeMarketAvg(marketAvg({ grade: 'S' }))).toBeUndefined();
  });
});
