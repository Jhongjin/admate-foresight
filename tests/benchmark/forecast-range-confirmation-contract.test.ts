import { describe, expect, it } from 'vitest';

import {
  buildForecastRangeConfirmation,
  type ForecastRangeConfirmation,
  type ForecastRangeConfirmationPoint,
} from '../../lib/forecastRangeConfirmation';
import type { DataSufficiency } from '../../lib/predictor';

const NO_SIDE_EFFECTS = {
  llmCalls: 0,
  databaseReads: 0,
  databaseWrites: 0,
  pythonRuns: 0,
  metaCalls: 0,
  exportWrites: 0,
  promotionApplyCalls: 0,
};

const BLOCKED_READINESS = {
  llmReady: false,
  persistenceReady: false,
  reportReady: false,
  exportReady: false,
  promotionReady: false,
  applyReady: false,
};

function sufficiency(overrides: Partial<DataSufficiency> = {}): DataSufficiency {
  return {
    status: 'sufficient',
    basis: 'exact_cohort',
    matchedCount: 12,
    minimumRequired: 10,
    warningCodes: [],
    ...overrides,
  };
}

function point(
  budget: number,
  overrides: Partial<ForecastRangeConfirmationPoint> = {},
): ForecastRangeConfirmationPoint {
  return {
    budget,
    reach: Math.round(budget / 100),
    cpm: 5_000,
    cpc: 500,
    dataSufficiency: sufficiency(),
    ...overrides,
  };
}

function expectNoSideEffectReadiness(result: ForecastRangeConfirmation) {
  expect(result.aggregateOnly).toBe(true);
  expect(result.sideEffectSummary).toEqual(NO_SIDE_EFFECTS);
  expect(result.readiness).toMatchObject(BLOCKED_READINESS);
  expect(result.blockedActions).toEqual(
    expect.arrayContaining([
      'llm_generation',
      'persistence_write',
      'report_generation',
      'export_write',
      'promotion_apply',
    ]),
  );
}

describe('forecast range confirmation contract', () => {
  it('accepts a sufficient current range for operator review only', () => {
    const result = buildForecastRangeConfirmation({
      currentBudget: 5_000_000,
      range: [
        point(1_000_000),
        point(5_000_000),
        point(10_000_000),
      ],
    });

    expect(result.state).toBe('accepted_for_operator_review');
    expect(result.acceptedForReview).toBe(true);
    expect(result.readiness.operatorReviewReady).toBe(true);
    expect(result.range).toMatchObject({
      pointCount: 3,
      currentBudget: 5_000_000,
      currentBudgetPresent: true,
      minBudget: 1_000_000,
      maxBudget: 10_000_000,
      sourceRowsIncluded: false,
      rawRecordsIncluded: false,
    });
    expect(result.sufficiency).toMatchObject({
      status: 'sufficient',
      basis: 'exact_cohort',
      minimumMatchedCount: 12,
      minimumRequired: 10,
      blockedByInsufficientData: false,
    });
    expect(result.warningCodes).toEqual([]);
    expect(result.rejectionReasons).toEqual([]);
    expectNoSideEffectReadiness(result);
  });

  it('warns on insufficient data and blocks review readiness', () => {
    const insufficient = sufficiency({
      status: 'insufficient',
      basis: 'global_fallback',
      matchedCount: 4,
      warningCodes: ['GLOBAL_FALLBACK_USED', 'INSUFFICIENT_MATCHED_DATA'],
    });

    const result = buildForecastRangeConfirmation({
      currentBudget: 5_000_000,
      range: [
        point(1_000_000, { dataSufficiency: insufficient }),
        point(5_000_000, { dataSufficiency: insufficient }),
      ],
    });

    expect(result.state).toBe('blocked_by_sufficiency');
    expect(result.acceptedForReview).toBe(false);
    expect(result.readiness.operatorReviewReady).toBe(false);
    expect(result.sufficiency).toMatchObject({
      status: 'insufficient',
      basis: 'global_fallback',
      minimumMatchedCount: 4,
      minimumRequired: 10,
      blockedByInsufficientData: true,
    });
    expect(result.warningCodes).toEqual(
      expect.arrayContaining([
        'GLOBAL_FALLBACK_USED',
        'INSUFFICIENT_MATCHED_DATA',
        'INSUFFICIENT_DATA_SUFFICIENCY',
      ]),
    );
    expect(result.rejectionReasons).toEqual([]);
    expectNoSideEffectReadiness(result);
  });

  it.each([
    ['empty range', []],
    ['malformed numeric field', [{ budget: 0, reach: 1, cpm: 1, cpc: 1 }]],
    [
      'non-aggregate field',
      [{ budget: 5_000_000, reach: 100, cpm: 1, cpc: 1, campaignId: 'raw' }],
    ],
  ])('rejects %s', (_label, range) => {
    const result = buildForecastRangeConfirmation({
      currentBudget: 5_000_000,
      range,
    });

    expect(result.state).toBe('rejected_invalid_range');
    expect(result.acceptedForReview).toBe(false);
    expect(result.readiness.operatorReviewReady).toBe(false);
    expect(result.rejectionReasons.length).toBeGreaterThan(0);
    expect(result.warningCodes).toContain('FORECAST_RANGE_REJECTED');
    expectNoSideEffectReadiness(result);
    expect(JSON.stringify(result)).not.toMatch(/campaignId|"raw"/i);
  });

  it('keeps every outcome detached from generation, persistence, export, and apply paths', () => {
    const accepted = buildForecastRangeConfirmation({
      currentBudget: 5_000_000,
      range: [point(5_000_000)],
    });
    const blocked = buildForecastRangeConfirmation({
      currentBudget: 5_000_000,
      range: [
        point(5_000_000, {
          dataSufficiency: sufficiency({
            status: 'insufficient',
            basis: 'invalid_month_range',
            matchedCount: 0,
            warningCodes: ['REVERSED_MONTH_RANGE'],
          }),
        }),
      ],
    });
    const rejected = buildForecastRangeConfirmation({
      currentBudget: 5_000_000,
      range: [],
    });

    for (const result of [accepted, blocked, rejected]) {
      expectNoSideEffectReadiness(result);
      expect(result.readiness.reportReady).toBe(false);
      expect(result.readiness.exportReady).toBe(false);
      expect(result.readiness.promotionReady).toBe(false);
      expect(result.readiness.applyReady).toBe(false);
    }
  });

  it('uses range terminology without certainty claims', () => {
    const outcomes = [
      buildForecastRangeConfirmation({
        currentBudget: 5_000_000,
        range: [point(5_000_000)],
      }),
      buildForecastRangeConfirmation({
        currentBudget: 5_000_000,
        range: [
          point(5_000_000, {
            dataSufficiency: sufficiency({
              status: 'insufficient',
              basis: 'global_fallback',
              matchedCount: 0,
              warningCodes: ['INSUFFICIENT_MATCHED_DATA'],
            }),
          }),
        ],
      }),
      buildForecastRangeConfirmation({
        currentBudget: 5_000_000,
        range: [],
      }),
    ];

    for (const result of outcomes) {
      const serialized = JSON.stringify(result);

      expect(result.terminology.rangeLabel).toBe('Forecast range');
      expect(serialized).not.toMatch(/confidence/i);
      expect(serialized).not.toMatch(/statistical/i);
      expect(serialized).not.toMatch(/interval/i);
      expect(serialized).not.toMatch(/95%/i);
    }
  });
});
