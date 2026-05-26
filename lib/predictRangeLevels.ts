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

export function buildPredictRangeLevels(monthlyBudget: number): number[] {
  const levels = monthlyBudget <= 100_000_000
    ? [...BASE_LEVELS]
    : [...BASE_LEVELS, ...HIGHER_LEVELS.filter((level) => level < monthlyBudget)];

  if (monthlyBudget > 0 && !levels.includes(monthlyBudget)) levels.push(monthlyBudget);
  return levels.sort((a, b) => a - b);
}
