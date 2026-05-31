import { describe, expect, it } from 'vitest';

import {
  buildForecastRangeConfirmation,
  normalizeForecastRangeData,
  normalizeForecastRangeResponse,
} from '../../lib/forecastRangeConfirmation';
import type { DataSufficiency } from '../../lib/predictor';

const dataSufficiency: DataSufficiency = {
  status: 'relaxed',
  basis: 'relaxed_demographic',
  matchedCount: 14,
  minimumRequired: 10,
  warningCodes: ['RELAXED_DEMOGRAPHIC_MATCH'],
};

const range = [
  {
    budget: 1_000_000,
    reach: 12_000,
    cpm: 5_000,
    cpc: 700,
    dataSufficiency,
  },
  {
    budget: 5_000_000,
    reach: 56_000,
    cpm: 5_200,
    cpc: 720,
    dataSufficiency,
  },
];

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

function expectNoUnsafeConfirmationFields(value: unknown) {
  const json = JSON.stringify(value);
  const keys = collectKeys(value);
  const forbiddenKeyPatterns = [
    /^raw(?!RecordsIncluded$)/i,
    /^source(?!RowsIncluded$)/i,
    /^account/i,
    /^campaign/i,
    /^ad[_-]?id$/i,
    /^provider/i,
    /url/i,
    /token/i,
    /cookie/i,
    /session/i,
    /credential/i,
    /secret/i,
  ];
  const forbiddenValuePatterns = [
    /raw-row/i,
    /source-row/i,
    /account-/i,
    /campaign-/i,
    /ad-/i,
    /provider-/i,
    /https?:\/\//i,
    /token/i,
    /cookie/i,
    /session/i,
    /credential/i,
    /secret/i,
  ];

  expect(keys.some((key) => forbiddenKeyPatterns.some((pattern) => pattern.test(key)))).toBe(false);
  expect(forbiddenValuePatterns.some((pattern) => pattern.test(json))).toBe(false);
}

describe('simulator range normalization contract', () => {
  it('keeps legacy raw array responses usable and preserves data sufficiency', () => {
    const normalized = normalizeForecastRangeData(range);

    expect(normalized).toHaveLength(2);
    expect(normalized?.[0]).toMatchObject({
      budget: 1_000_000,
      reach: 12_000,
      dataSufficiency,
    });
  });

  it('unwraps the predict-range envelope and keeps confirmation separately', () => {
    const confirmation = buildForecastRangeConfirmation({
      range,
      currentBudget: 5_000_000,
    });

    const normalized = normalizeForecastRangeResponse({ range, confirmation });

    expect(normalized.rangeData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          budget: 5_000_000,
          dataSufficiency,
        }),
      ]),
    );
    expect(normalized.confirmation).toMatchObject({
      state: 'accepted_for_operator_review',
      acceptedForReview: true,
      readiness: {
        operatorReviewReady: true,
        llmReady: false,
        persistenceReady: false,
        reportReady: false,
        exportReady: false,
        promotionReady: false,
        applyReady: false,
      },
      sideEffectSummary: {
        llmCalls: 0,
        databaseReads: 0,
        databaseWrites: 0,
        pythonRuns: 0,
        metaCalls: 0,
        exportWrites: 0,
        promotionApplyCalls: 0,
      },
    });
  });

  it('rebuilds confirmation through an allowlist before simulator state stores it', () => {
    const confirmation = buildForecastRangeConfirmation({
      range,
      currentBudget: 5_000_000,
    });
    const contaminatedConfirmation = {
      ...confirmation,
      rawRows: [{ token: 'secret-token' }],
      sourceRows: [{ campaignId: 'campaign-123' }],
      providerId: 'provider-meta',
      accountId: 'account-123',
      campaignId: 'campaign-123',
      adId: 'ad-123',
      reportUrl: 'https://example.test/report',
      sessionCookie: 'session-cookie',
      credentialSecret: 'private-secret',
      readiness: {
        ...confirmation.readiness,
        llmReady: true,
        persistenceReady: true,
        reportReady: true,
        exportReady: true,
        promotionReady: true,
        applyReady: true,
        token: 'secret-token',
      },
      sideEffectSummary: {
        llmCalls: 4,
        databaseReads: 3,
        databaseWrites: 2,
        pythonRuns: 1,
        metaCalls: 5,
        exportWrites: 6,
        promotionApplyCalls: 7,
        providerSession: 'session-id',
      },
      range: {
        ...confirmation.range,
        aggregateFields: [
          ...confirmation.range.aggregateFields,
          'campaignId',
          'rawRows',
        ],
        rawRows: [{ value: 'raw-row-1' }],
        sourceRows: [{ value: 'source-row-1' }],
        providerUrl: 'https://example.test/provider',
      },
      sufficiency: {
        ...confirmation.sufficiency,
        warningCodes: [
          ...confirmation.sufficiency.warningCodes,
          'SECRET_TOKEN',
        ],
        sourceRecord: 'source-row-1',
      },
      terminology: {
        ...confirmation.terminology,
        description: 'secret-token https://example.test',
      },
      warningCodes: [
        ...confirmation.warningCodes,
        'TOKEN_LEAK',
      ],
      rejectionReasons: ['SECRET_TOKEN'],
      blockedActions: [
        ...confirmation.blockedActions,
        'apply_with_secret_token',
      ],
    };

    const normalized = normalizeForecastRangeResponse({
      range,
      confirmation: contaminatedConfirmation,
    });

    expect(normalized.confirmation).toMatchObject({
      state: 'accepted_for_operator_review',
      acceptedForReview: true,
      aggregateOnly: true,
      readiness: {
        operatorReviewReady: true,
        llmReady: false,
        persistenceReady: false,
        reportReady: false,
        exportReady: false,
        promotionReady: false,
        applyReady: false,
      },
      sideEffectSummary: {
        llmCalls: 0,
        databaseReads: 0,
        databaseWrites: 0,
        pythonRuns: 0,
        metaCalls: 0,
        exportWrites: 0,
        promotionApplyCalls: 0,
      },
      warningCodes: [
        'RELAXED_DEMOGRAPHIC_MATCH',
        'RELAXED_DATA_SUFFICIENCY',
      ],
      rejectionReasons: [],
      blockedActions: [
        'llm_generation',
        'persistence_write',
        'report_generation',
        'export_write',
        'promotion_apply',
      ],
    });
    expect(normalized.confirmation?.warningCodes).not.toContain('TOKEN_LEAK');
    expect(normalized.confirmation?.sufficiency.warningCodes).not.toContain('SECRET_TOKEN');
    expect(normalized.confirmation?.range.aggregateFields).toEqual([
      'budget',
      'reach',
      'cpm',
      'cpc',
      'dataSufficiency',
    ]);
    expect(normalized.confirmation?.terminology.description).toBe(
      '집계 기반 예상 구간은 운영자 검토용입니다. 보고서, 내보내기, 승격, 적용은 후속 게이트 전까지 차단됩니다.',
    );
    expectNoUnsafeConfirmationFields(normalized.confirmation);
  });

  it.each([
    ['unknown state', { state: 'ready_to_apply' }],
    ['mismatched readiness', { readiness: { operatorReviewReady: false } }],
    ['malformed range summary', { range: { pointCount: '2' } }],
    ['malformed sufficiency summary', { sufficiency: { status: 'provider_ready' } }],
    ['malformed warning code list', { warningCodes: ['SAFE_CODE', 42] }],
  ])('fails closed for %s in confirmation normalization', (_label, override) => {
    const confirmation = buildForecastRangeConfirmation({
      range,
      currentBudget: 5_000_000,
    });

    const normalized = normalizeForecastRangeResponse({
      range,
      confirmation: {
        ...confirmation,
        ...override,
      },
    });

    expect(normalized.confirmation).toBeNull();
  });
});
