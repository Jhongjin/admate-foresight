import { describe, expect, it } from 'vitest';

import { buildForecastRangeConfirmation } from '../../lib/forecastRangeConfirmation';
import type { ForecastRangeConfirmationPoint } from '../../lib/forecastRangeConfirmation';
import {
  buildForesightBudgetBasis,
  monthlyBudgetToCampaignBudget,
} from '../../lib/foresightBudgetBasis';
import { buildSimulatorRangeViewModel } from '../../lib/foresightRangeViewModel';
import { buildPredictRangeLevels } from '../../lib/predictRangeLevels';
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

const BLOCKED_LATER_READINESS = {
  reportReady: false,
  exportReady: false,
  promotionReady: false,
  applyReady: false,
};

function sufficientData(overrides: Partial<DataSufficiency> = {}): DataSufficiency {
  return {
    status: 'sufficient',
    basis: 'exact_cohort',
    matchedCount: 14,
    minimumRequired: 10,
    warningCodes: [],
    ...overrides,
  };
}

function aggregatePoint(
  budget: number,
  dataSufficiency: DataSufficiency = sufficientData(),
): ForecastRangeConfirmationPoint {
  return {
    budget,
    reach: Math.round(budget / 100),
    cpm: 5_000,
    cpc: 500,
    dataSufficiency,
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

function expectAggregateOnlyOutput(value: unknown) {
  const json = JSON.stringify(value);
  const keys = collectKeys(value);
  const forbiddenKeyPatterns = [
    /^raw(?!RecordsIncluded$)/i,
    /^source(?!RowsIncluded$)/i,
    /^account/i,
    /^campaign(?!Budget$|Days$)/i,
    /^ad[_-]?id$/i,
    /^provider/i,
    /url/i,
    /token/i,
    /cookie/i,
    /session/i,
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
    /secret/i,
  ];

  expect(keys.some((key) => forbiddenKeyPatterns.some((pattern) => pattern.test(key)))).toBe(false);
  expect(forbiddenValuePatterns.some((pattern) => pattern.test(json))).toBe(false);
}

describe('simulator performance flow confirmation contract', () => {
  it('confirms the campaign budget can move through monthly range review and back to selected campaign rows', () => {
    const campaignBudget = 14_000_000;
    const campaignDays = 14;
    const basis = buildForesightBudgetBasis(campaignBudget, campaignDays);
    const levels = buildPredictRangeLevels(basis.monthlyBudget);
    const aggregateRange = levels.map((level) => aggregatePoint(level));

    const confirmation = buildForecastRangeConfirmation({
      currentBudget: basis.monthlyBudget,
      range: aggregateRange,
    });
    const viewModel = buildSimulatorRangeViewModel({
      rangeData: aggregateRange,
      campaignDays: basis.campaignDays,
      selectedBudget: basis.campaignBudget,
    });
    const selectedCampaignRow = viewModel.chartData.find(
      (row) => row.budget === campaignBudget,
    );
    const serializedContract = {
      monthlyBudget: basis.monthlyBudget,
      levels,
      confirmation,
      viewModel,
    };

    expect(basis).toMatchObject({
      campaignBudget,
      campaignDays,
      monthlyBudget: 30_000_000,
    });
    expect(monthlyBudgetToCampaignBudget(basis.monthlyBudget, campaignDays)).toBe(campaignBudget);
    expect(levels).toContain(basis.monthlyBudget);

    expect(confirmation.state).toBe('accepted_for_operator_review');
    expect(confirmation.acceptedForReview).toBe(true);
    expect(confirmation.readiness.operatorReviewReady).toBe(true);
    expect(confirmation.readiness).toMatchObject(BLOCKED_LATER_READINESS);
    expect(confirmation.sideEffectSummary).toEqual(NO_SIDE_EFFECTS);
    expect(confirmation.range).toMatchObject({
      currentBudget: basis.monthlyBudget,
      currentBudgetPresent: true,
      pointCount: levels.length,
      sourceRowsIncluded: false,
      rawRecordsIncluded: false,
    });

    expect(selectedCampaignRow).toMatchObject({
      budget: campaignBudget,
      monthlyBudget: basis.monthlyBudget,
      reach: 140_000,
      monthlyReach: 300_000,
      cpm: 5_000,
      cpc: 500,
      impressions: 2_800_000,
      clicks: 28_000,
      reachEfficiency: 100,
    });
    expect(viewModel.rangeTrendBrief).toEqual(
      expect.arrayContaining([
        {
          label: '선택 예산',
          value: '₩14,000,000',
          detail: '만원당 100명 도달',
        },
      ]),
    );
    expectAggregateOnlyOutput(serializedContract);
  });

  it('blocks operator review when the current monthly budget is not confirmed in the aggregate range', () => {
    const basis = buildForesightBudgetBasis(14_000_000, 14);
    const rangeWithoutCurrentBudget = buildPredictRangeLevels(basis.monthlyBudget)
      .filter((level) => level !== basis.monthlyBudget)
      .map((level) => aggregatePoint(level));

    const confirmation = buildForecastRangeConfirmation({
      currentBudget: basis.monthlyBudget,
      range: rangeWithoutCurrentBudget,
    });

    expect(confirmation.state).toBe('blocked_by_current_range');
    expect(confirmation.acceptedForReview).toBe(false);
    expect(confirmation.readiness.operatorReviewReady).toBe(false);
    expect(confirmation.readiness).toMatchObject(BLOCKED_LATER_READINESS);
    expect(confirmation.sideEffectSummary).toEqual(NO_SIDE_EFFECTS);
    expect(confirmation.range.currentBudgetPresent).toBe(false);
    expect(confirmation.warningCodes).toContain('CURRENT_BUDGET_NOT_CONFIRMED');
    expectAggregateOnlyOutput(confirmation);
  });

  it('blocks operator review when the current monthly budget has insufficient supporting data', () => {
    const basis = buildForesightBudgetBasis(14_000_000, 14);
    const insufficient = sufficientData({
      status: 'insufficient',
      basis: 'global_fallback',
      matchedCount: 3,
      warningCodes: ['GLOBAL_FALLBACK_USED', 'INSUFFICIENT_MATCHED_DATA'],
    });
    const rangeWithInsufficientData = buildPredictRangeLevels(basis.monthlyBudget)
      .map((level) => aggregatePoint(level, insufficient));

    const confirmation = buildForecastRangeConfirmation({
      currentBudget: basis.monthlyBudget,
      range: rangeWithInsufficientData,
    });

    expect(confirmation.state).toBe('blocked_by_sufficiency');
    expect(confirmation.acceptedForReview).toBe(false);
    expect(confirmation.readiness.operatorReviewReady).toBe(false);
    expect(confirmation.readiness).toMatchObject(BLOCKED_LATER_READINESS);
    expect(confirmation.sideEffectSummary).toEqual(NO_SIDE_EFFECTS);
    expect(confirmation.range.currentBudgetPresent).toBe(true);
    expect(confirmation.sufficiency).toMatchObject({
      status: 'insufficient',
      basis: 'global_fallback',
      minimumMatchedCount: 3,
      minimumRequired: 10,
      blockedByInsufficientData: true,
    });
    expect(confirmation.warningCodes).toEqual(
      expect.arrayContaining([
        'GLOBAL_FALLBACK_USED',
        'INSUFFICIENT_MATCHED_DATA',
        'INSUFFICIENT_DATA_SUFFICIENCY',
      ]),
    );
    expectAggregateOnlyOutput(confirmation);
  });
});
