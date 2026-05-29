export const FORESIGHT_MONTHLY_BUDGET_DAYS = 30;
export const FORESIGHT_PREDICTION_FAMILY_BUDGET_BASIS_CONTRACT =
  'foresight-simulator-prediction-family-budget-basis.v1';

export const FORESIGHT_BUDGET_BASIS_KINDS = [
  'daily',
  'lifetime',
  'derived',
  'unknown',
] as const;

export type ForesightBudgetBasisKind = typeof FORESIGHT_BUDGET_BASIS_KINDS[number];
export type ForesightPredictionBudgetKind = 'monthly_budget';

export interface ForesightPredictionFamilyBudgetBasis {
  contract: typeof FORESIGHT_PREDICTION_FAMILY_BUDGET_BASIS_CONTRACT;
  budgetBasis: ForesightBudgetBasisKind;
  predictionBudget: ForesightPredictionBudgetKind;
  rangeBudget: ForesightPredictionBudgetKind;
  operatorLabel: string;
  operatorCopy: string;
  inputPayloadIncluded: false;
  sensitiveValueIncluded: false;
}

export interface ForesightBudgetBasisOptions {
  budgetBasis?: unknown;
}

function normalizeCampaignDays(campaignDays: number): number {
  return Number.isFinite(campaignDays) && campaignDays > 0
    ? campaignDays
    : FORESIGHT_MONTHLY_BUDGET_DAYS;
}

export function normalizeForesightBudgetBasisKind(
  value: unknown,
): ForesightBudgetBasisKind {
  if (value === 'daily' || value === 'daily_budget') return 'daily';
  if (value === 'lifetime' || value === 'lifetime_budget') return 'lifetime';
  if (value === 'derived' || value === 'campaign_period_derived') return 'derived';
  if (value === 'unknown') return 'unknown';
  return 'unknown';
}

function buildBudgetBasisCopy(kind: ForesightBudgetBasisKind) {
  if (kind === 'daily') {
    return {
      operatorLabel: '일 예산 기준',
      operatorCopy: '입력 예산을 하루 기준으로 보고 월 기준 예측값에 맞춰 해석합니다.',
    };
  }

  if (kind === 'lifetime') {
    return {
      operatorLabel: '전체 기간 예산 기준',
      operatorCopy: '입력 예산을 캠페인 전체 기간 기준으로 보고 월 기준 예측값에 맞춰 해석합니다.',
    };
  }

  if (kind === 'derived') {
    return {
      operatorLabel: '기간 환산 예산 기준',
      operatorCopy: '입력한 총 예산과 기간을 월 기준 예산으로 환산해 예측과 예산 구간을 함께 해석합니다.',
    };
  }

  return {
    operatorLabel: '예산 기준 확인 필요',
    operatorCopy: '예산 기준이 확인되지 않아 월 기준 예측값과 선택 기간 표시값을 분리해 검토합니다.',
  };
}

export function buildForesightPredictionFamilyBudgetBasis(
  budgetBasis: unknown = 'derived',
): ForesightPredictionFamilyBudgetBasis {
  const normalizedBudgetBasis = normalizeForesightBudgetBasisKind(budgetBasis);
  const copy = buildBudgetBasisCopy(normalizedBudgetBasis);

  return {
    contract: FORESIGHT_PREDICTION_FAMILY_BUDGET_BASIS_CONTRACT,
    budgetBasis: normalizedBudgetBasis,
    predictionBudget: 'monthly_budget',
    rangeBudget: 'monthly_budget',
    ...copy,
    inputPayloadIncluded: false,
    sensitiveValueIncluded: false,
  };
}

export function getForesightDurationFactor(campaignDays: number): number {
  return normalizeCampaignDays(campaignDays) / FORESIGHT_MONTHLY_BUDGET_DAYS;
}

export function buildForesightBudgetBasis(
  campaignBudget: number,
  campaignDays: number,
  options: ForesightBudgetBasisOptions = {},
) {
  const normalizedCampaignDays = normalizeCampaignDays(campaignDays);
  const durationFactor = getForesightDurationFactor(normalizedCampaignDays);
  const predictionFamilyBudgetBasis = buildForesightPredictionFamilyBudgetBasis(
    options.budgetBasis ?? 'derived',
  );

  return {
    campaignBudget,
    campaignDays: normalizedCampaignDays,
    durationFactor,
    monthlyBudget: Math.round(campaignBudget / durationFactor),
    budgetBasisKind: predictionFamilyBudgetBasis.budgetBasis,
    predictionFamilyBudgetBasis,
  };
}

export interface MonthlyRangePoint {
  budget: number;
  reach: number;
  cpm: number;
  cpc: number;
}

export function monthlyBudgetToCampaignBudget(
  monthlyBudget: number,
  campaignDays: number,
): number {
  return Math.round(monthlyBudget * getForesightDurationFactor(campaignDays));
}

export function buildCampaignRangePoint(
  point: MonthlyRangePoint,
  campaignDays: number,
) {
  const campaignBudget = monthlyBudgetToCampaignBudget(point.budget, campaignDays);
  const durationFactor = getForesightDurationFactor(campaignDays);
  const campaignReach = Math.round(point.reach * durationFactor);

  return {
    budget: campaignBudget,
    monthlyBudget: point.budget,
    reach: campaignReach,
    monthlyReach: point.reach,
    cpm: point.cpm,
    cpc: point.cpc,
    impressions: point.cpm > 0 ? Math.round(campaignBudget / point.cpm * 1000) : 0,
    clicks: point.cpc > 0 ? Math.round(campaignBudget / point.cpc) : 0,
    reachEfficiency: campaignReach > 0 && campaignBudget > 0
      ? Math.round(campaignReach / (campaignBudget / 10_000))
      : 0,
  };
}
