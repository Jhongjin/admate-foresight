import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildCampaignRangePoint,
  buildForesightBudgetBasis,
  monthlyBudgetToCampaignBudget,
} from '../../lib/foresightBudgetBasis';

describe('foresight simulator budget basis', () => {
  it('derives one monthly budget for both prediction APIs from the campaign budget', () => {
    const basis = buildForesightBudgetBasis(10_000_000, 7);

    expect(basis.durationFactor).toBeCloseTo(7 / 30);
    expect(basis.monthlyBudget).toBe(42_857_143);
    expect(monthlyBudgetToCampaignBudget(basis.monthlyBudget, 7)).toBe(10_000_000);
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

  it('keeps predict and predict-range calls on the shared monthly budget variable', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', 'SimulatorPageClient.tsx'),
      'utf8',
    ).replace(/\s+/g, ' ');

    expect(source).toContain(
      'fetchPrediction({ industries, genders, ageRanges, objectives, budget: monthlyBudget });',
    );
    expect(source).toContain(
      'fetchRange({ industries, genders, ageRanges, objectives, budget: monthlyBudget });',
    );
    expect(source).not.toContain(
      'fetchRange({ industries, genders, ageRanges, objectives, budget });',
    );
  });
});
