import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildCampaignRangePoint,
  buildForesightBudgetBasis,
  buildForesightPredictionFamilyBudgetBasis,
  FORESIGHT_BUDGET_BASIS_KINDS,
  FORESIGHT_PREDICTION_FAMILY_BUDGET_BASIS_CONTRACT,
  monthlyBudgetToCampaignBudget,
  normalizeForesightBudgetBasisKind,
} from '../../lib/foresightBudgetBasis';

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

function expectBudgetBasisSafe(value: unknown) {
  const json = JSON.stringify(value);
  const forbiddenKeyPatterns = [
    /raw/i,
    /source/i,
    /^account/i,
    /^campaign(?!Budget$|Days$)/i,
    /^ad[_-]?id$/i,
    /^adset/i,
    /^provider/i,
    /url/i,
    /token/i,
    /cookie/i,
    /session/i,
    /secret/i,
  ];

  expect(collectKeys(value).some((key) => (
    forbiddenKeyPatterns.some((pattern) => pattern.test(key))
  ))).toBe(false);
  expect(json).not.toMatch(/act_123|campaign-123|adset-123|ad-123|meta-provider-id|https:\/\/example\.test|secret-token|session-cookie|private-secret|source-row/);
}

describe('foresight simulator budget basis', () => {
  it('derives one monthly budget for both prediction APIs from the campaign budget', () => {
    const basis = buildForesightBudgetBasis(10_000_000, 7);

    expect(basis.durationFactor).toBeCloseTo(7 / 30);
    expect(basis.monthlyBudget).toBe(42_857_143);
    expect(monthlyBudgetToCampaignBudget(basis.monthlyBudget, 7)).toBe(10_000_000);
    expect(basis.budgetBasisKind).toBe('derived');
    expect(basis.predictionFamilyBudgetBasis).toMatchObject({
      contract: FORESIGHT_PREDICTION_FAMILY_BUDGET_BASIS_CONTRACT,
      budgetBasis: 'derived',
      predictionBudget: 'monthly_budget',
      rangeBudget: 'monthly_budget',
      inputPayloadIncluded: false,
      sensitiveValueIncluded: false,
    });
    expect(basis.predictionFamilyBudgetBasis.operatorCopy).toContain('월 기준 예산');
    expectBudgetBasisSafe(basis);
  });

  it('converts range rows back to the selected campaign period for display', () => {
    const point = buildCampaignRangePoint(
      { budget: 30_000_000, reach: 300_000, cpm: 5_000, cpc: 500 },
      10,
    );

    expect(point.monthlyBudget).toBe(30_000_000);
    expect(point.budget).toBe(10_000_000);
    expect(point.monthlyReach).toBe(300_000);
    expect(point.reach).toBe(100_000);
    expect(point.impressions).toBe(2_000_000);
    expect(point.clicks).toBe(20_000);
    expect(point.reachEfficiency).toBe(100);
  });

  it('exposes a bounded prediction-family budget basis classification', () => {
    expect(FORESIGHT_BUDGET_BASIS_KINDS).toEqual([
      'daily',
      'lifetime',
      'derived',
      'unknown',
    ]);

    for (const budgetBasis of FORESIGHT_BUDGET_BASIS_KINDS) {
      const contract = buildForesightPredictionFamilyBudgetBasis(budgetBasis);

      expect(contract).toMatchObject({
        contract: FORESIGHT_PREDICTION_FAMILY_BUDGET_BASIS_CONTRACT,
        budgetBasis,
        predictionBudget: 'monthly_budget',
        rangeBudget: 'monthly_budget',
        inputPayloadIncluded: false,
        sensitiveValueIncluded: false,
      });
      expect(contract.operatorLabel.length).toBeGreaterThan(0);
      expect(contract.operatorCopy.length).toBeGreaterThan(0);
      expectBudgetBasisSafe(contract);
    }
  });

  it('normalizes external budget-basis aliases without inventing new states', () => {
    expect(normalizeForesightBudgetBasisKind('daily_budget')).toBe('daily');
    expect(normalizeForesightBudgetBasisKind('lifetime_budget')).toBe('lifetime');
    expect(normalizeForesightBudgetBasisKind('campaign_period_derived')).toBe('derived');
    expect(normalizeForesightBudgetBasisKind('weekly_budget')).toBe('unknown');
    expect(normalizeForesightBudgetBasisKind(null)).toBe('unknown');

    expect(buildForesightBudgetBasis(30_000_000, 30, {
      budgetBasis: 'lifetime_budget',
    }).predictionFamilyBudgetBasis).toMatchObject({
      budgetBasis: 'lifetime',
      operatorLabel: '전체 기간 예산 기준',
    });
  });

  it('keeps predict and predict-range calls on the shared monthly budget variable', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', 'SimulatorPageClient.tsx'),
      'utf8',
    ).replace(/\s+/g, ' ');

    expect(source).toContain(
      'fetchPrediction({ industries, genders, ageRanges, objectives, placements, creativeTypes, budget: monthlyBudget });',
    );
    expect(source).toContain(
      'fetchRange({ industries, genders, ageRanges, objectives, placements, creativeTypes, budget: monthlyBudget });',
    );
    expect(source).not.toContain(
      'fetchRange({ industries, genders, ageRanges, objectives, placements, creativeTypes, budget });',
    );
  });
});
