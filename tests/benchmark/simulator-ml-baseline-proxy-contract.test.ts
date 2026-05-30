import { describe, expect, it } from 'vitest';

import {
  FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_ERROR,
  allowlistForesightSimulatorMlBaselineProxySuccessResponse,
  normalizeForesightSimulatorMlBaselineProxySuccessResponse,
  type ForesightSimulatorMlBaselineProxySuccessResponse,
} from '../../lib/foresightSimulatorMlBaselineProxyContract';

function successBody(value: unknown): ForesightSimulatorMlBaselineProxySuccessResponse {
  const result = normalizeForesightSimulatorMlBaselineProxySuccessResponse(value);
  if (!result.ok) throw new Error('Expected valid aggregate ML baseline proxy body');
  return result.body;
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

function expectNoSourceIdentifierOrSecretLeak(value: unknown) {
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
    /act_123|campaign-123|adset-123|ad-123|provider-123|https:\/\/example\.test|opaque-token-value|opaque-cookie-value|opaque-session-value|opaque-secret-value|source-row|trained-at-row/i;

  expect(collectKeys(value).some((key) => (
    forbiddenKeyPatterns.some((pattern) => pattern.test(key))
  ))).toBe(false);
  expect(JSON.stringify(value)).not.toMatch(forbiddenValuePattern);
}

describe('foresight simulator ML baseline proxy contract', () => {
  it('allow-lists only aggregate ML baseline success fields', () => {
    const body = successBody({
      cpm: 5120,
      ctr: 1.735,
      cpc: 294,
      reach: 154321,
      r2_cpm: 0.82,
      r2_ctr: 0.74,
      cv_r2: 0.8124,
      model_type: 'random_forest',
      n_samples: 2480,
      trained_at: 'trained-at-row',
      rawRows: [{ id: 'source-row' }],
    });

    expect(body).toEqual({
      cpm: 5120,
      ctr: 1.735,
      cpc: 294,
      reach: 154321,
      r2_cpm: 0.82,
      r2_ctr: 0.74,
      cv_r2: 0.8124,
      model_type: 'random_forest',
      n_samples: 2480,
    });
    expect(Object.keys(body)).toEqual([
      'cpm',
      'ctr',
      'cpc',
      'reach',
      'r2_cpm',
      'r2_ctr',
      'cv_r2',
      'model_type',
      'n_samples',
    ]);
    expectNoSourceIdentifierOrSecretLeak(body);
  });

  it('normalizes finite numeric strings while omitting malformed aggregate fields', () => {
    const body = successBody({
      cpm: '4300.4',
      ctr: '0.61',
      cpc: 'bad-cpc',
      reach: '88000',
      r2_cpm: '0.58',
      r2_ctr: '-0.12',
      cv_r2: '0.5129',
      model_type: 'linear_regression',
      n_samples: '640.4',
    });

    expect(body).toEqual({
      cpm: 4300.4,
      ctr: 0.61,
      reach: 88000,
      r2_cpm: 0.58,
      r2_ctr: -0.12,
      cv_r2: 0.5129,
      model_type: 'linear_regression',
      n_samples: 640,
    });
  });

  it('omits unsafe fields, identifiers, URLs, secret-like values, and unapproved model types', () => {
    const body = successBody({
      reach: 12345,
      r2_cpm: Number.POSITIVE_INFINITY,
      model_type: 'provider_live_model',
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
      credential: 'opaque-secret-value',
    });

    expect(body).toEqual({ reach: 12345 });
    expectNoSourceIdentifierOrSecretLeak(body);
  });

  it('fails closed for empty or fully malformed success responses', () => {
    for (const value of [
      null,
      [],
      {},
      {
        cpm: -1,
        ctr: Number.NaN,
        cpc: Number.POSITIVE_INFINITY,
        reach: 'not-a-number',
        r2_cpm: 0.91,
        model_type: 'random_forest',
        n_samples: 100,
      },
    ]) {
      expect(allowlistForesightSimulatorMlBaselineProxySuccessResponse(value)).toBeNull();
      expect(normalizeForesightSimulatorMlBaselineProxySuccessResponse(value)).toEqual({
        ok: false,
        status: 502,
        body: { error: FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_ERROR },
      });
    }
  });

  it('does not leak secret, source, provider, or identifier markers from malformed mixed payloads', () => {
    const result = normalizeForesightSimulatorMlBaselineProxySuccessResponse({
      cpm: 'bad',
      ctr: null,
      cpc: -10,
      reach: Number.NaN,
      accountId: 'act_123',
      campaignId: 'campaign-123',
      adsetId: 'adset-123',
      adId: 'ad-123',
      providerId: 'provider-123',
      sourceRows: [{ id: 'source-row' }],
      url: 'https://example.test/path',
      token: 'opaque-token-value',
      cookie: 'opaque-cookie-value',
      session: 'opaque-session-value',
      secret: 'opaque-secret-value',
    });

    expect(result).toEqual({
      ok: false,
      status: 502,
      body: { error: FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_ERROR },
    });
    expectNoSourceIdentifierOrSecretLeak(result.body);
  });
});
