import {
  buildCampaignRangePoint,
  type MonthlyRangePoint,
} from './foresightBudgetBasis';

export interface SimulatorRangeChartRow {
  budget: number;
  monthlyBudget: number;
  reach: number;
  monthlyReach: number;
  cpm: number;
  cpc: number;
  impressions: number;
  clicks: number;
  reachEfficiency: number;
  label: string;
}

export interface SimulatorRangeTrendBriefItem {
  label: string;
  value: string;
  detail: string;
}

export interface SimulatorRangeViewModel {
  chartData: SimulatorRangeChartRow[];
  rangeTrendBrief: SimulatorRangeTrendBriefItem[];
}

export function formatSimulatorBudget(value: number): string {
  if (value >= 100_000_000) return `${value / 100_000_000}억`;
  return `${value / 10_000}만`;
}

export function buildSimulatorRangeViewModel(input: {
  rangeData: MonthlyRangePoint[];
  campaignDays: number;
  selectedBudget: number;
}): SimulatorRangeViewModel {
  const chartData = input.rangeData.map((point) => {
    const campaignPoint = buildCampaignRangePoint(point, input.campaignDays);
    return {
      ...campaignPoint,
      label: formatSimulatorBudget(campaignPoint.budget),
    };
  });

  if (chartData.length === 0) {
    return {
      chartData,
      rangeTrendBrief: [],
    };
  }

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const selected = chartData.find((row) => row.budget === input.selectedBudget)
    ?? chartData.reduce((closest, row) => (
      Math.abs(row.budget - input.selectedBudget) < Math.abs(closest.budget - input.selectedBudget)
        ? row
        : closest
    ), first);
  const reachLiftPct = first.reach > 0
    ? Math.round(((last.reach - first.reach) / first.reach) * 100)
    : null;
  const efficiencySignal = last.reachEfficiency < first.reachEfficiency
    ? '효율 체감'
    : last.reachEfficiency > first.reachEfficiency
      ? '효율 개선'
      : '효율 유지';

  return {
    chartData,
    rangeTrendBrief: [
      {
        label: '예산 범위',
        value: `${first.label} → ${last.label}`,
        detail: reachLiftPct == null ? '도달 증분 계산 대기' : `도달 +${reachLiftPct.toLocaleString()}%`,
      },
      {
        label: '선택 예산',
        value: `₩${selected.budget.toLocaleString()}`,
        detail: `만원당 ${selected.reachEfficiency.toLocaleString()}명 도달`,
      },
      {
        label: '한계 효율 신호',
        value: efficiencySignal,
        detail: `구간 끝 CPM ₩${last.cpm.toLocaleString()}`,
      },
    ],
  };
}
