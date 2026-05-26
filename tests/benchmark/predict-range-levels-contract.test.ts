import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildPredictRangeLevels } from '../../lib/predictRangeLevels';

const BASE_LEVELS = [
  1_000_000,
  3_000_000,
  5_000_000,
  10_000_000,
  20_000_000,
  30_000_000,
  50_000_000,
  100_000_000,
];

const HIGHER_LEVELS = [
  200_000_000,
  300_000_000,
  500_000_000,
  1_000_000_000,
  2_000_000_000,
  3_000_000_000,
  5_000_000_000,
];

const BLOCKED_IO_TERMS = [
  'fetch(',
  'XMLHttpRequest',
  'createClient',
  'supabase',
  'insert(',
  'upsert(',
  'update(',
  'delete(',
  'writeFile',
  'appendFile',
  'promises.writeFile',
  'spawn(',
  'exec(',
  'predict(',
  'generate',
  'persistence',
  'promotion',
  'exportReady',
  'export_write',
  'report',
  'apply',
];

function expectSortedUnique(levels: number[]) {
  expect(levels).toEqual([...levels].sort((a, b) => a - b));
  expect(new Set(levels).size).toBe(levels.length);
}

describe('predict-range levels contract', () => {
  it.each([
    1_000_000,
    4_000_000,
    100_000_000,
    100_000_001,
    250_000_000,
    5_500_000_000,
  ])('is deterministic, sorted, unique, and includes positive current budget %i', (budget) => {
    const first = buildPredictRangeLevels(budget);
    const second = buildPredictRangeLevels(budget);

    expect(first).toEqual(second);
    expectSortedUnique(first);
    expect(first).toContain(budget);
  });

  it('uses only the base ladder plus current budget at or below 100,000,000', () => {
    expect(buildPredictRangeLevels(0)).toEqual(BASE_LEVELS);
    expect(buildPredictRangeLevels(5_000_000)).toEqual(BASE_LEVELS);
    expect(buildPredictRangeLevels(6_000_000)).toEqual(
      [...BASE_LEVELS, 6_000_000].sort((a, b) => a - b),
    );
    expect(buildPredictRangeLevels(100_000_000)).toEqual(BASE_LEVELS);
  });

  it('includes only higher tiers below current budget for budgets above 100,000,000', () => {
    const budget = 1_500_000_000;
    const levels = buildPredictRangeLevels(budget);

    expect(levels).toEqual([
      ...BASE_LEVELS,
      ...HIGHER_LEVELS.filter((level) => level < budget),
      budget,
    ]);
    expect(levels).not.toContain(2_000_000_000);
    expect(levels).not.toContain(3_000_000_000);
    expect(levels).not.toContain(5_000_000_000);
  });

  it('has no generation, persistence, export, promotion, apply, or IO surface', () => {
    const source = readFileSync(
      join(process.cwd(), 'lib', 'predictRangeLevels.ts'),
      'utf8',
    );

    for (const term of BLOCKED_IO_TERMS) {
      expect(source).not.toContain(term);
    }
    expect(Object.keys({ buildPredictRangeLevels })).toEqual(['buildPredictRangeLevels']);
  });

  it('keeps predict-range route integrated with the helper', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', 'api', 'predict-range', 'route.ts'),
      'utf8',
    );

    expect(source).toContain("import { buildPredictRangeLevels } from '@/lib/predictRangeLevels'");
    expect(source).toContain('buildPredictRangeLevels(currentMonthlyBudget)');
    expect(source).not.toMatch(/\bfunction\s+buildLevels\b/);
    expect(source).not.toMatch(/\bconst\s+BASE_LEVELS\b/);
    expect(source).not.toMatch(/\bconst\s+HIGHER_LEVELS\b/);
  });
});
