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
});
