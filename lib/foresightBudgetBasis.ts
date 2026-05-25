export const FORESIGHT_MONTHLY_BUDGET_DAYS = 30;

function normalizeCampaignDays(campaignDays: number): number {
  return Number.isFinite(campaignDays) && campaignDays > 0
    ? campaignDays
    : FORESIGHT_MONTHLY_BUDGET_DAYS;
}

export function getForesightDurationFactor(campaignDays: number): number {
  return normalizeCampaignDays(campaignDays) / FORESIGHT_MONTHLY_BUDGET_DAYS;
}

export function buildForesightBudgetBasis(
  campaignBudget: number,
  campaignDays: number,
) {
  const normalizedCampaignDays = normalizeCampaignDays(campaignDays);
  const durationFactor = getForesightDurationFactor(normalizedCampaignDays);

  return {
    campaignBudget,
    campaignDays: normalizedCampaignDays,
    durationFactor,
    monthlyBudget: Math.round(campaignBudget / durationFactor),
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
