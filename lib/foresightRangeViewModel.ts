import {
  buildCampaignRangePoint,
  type MonthlyRangePoint,
} from './foresightBudgetBasis';
import type { ForecastRangeConfirmation } from './forecastRangeConfirmation';

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

export type SimulatorRangeReviewTone = 'ok' | 'watch' | 'risk' | 'idle';

export interface SimulatorRangeReviewCopy {
  label: string;
  detail: string;
  tone: SimulatorRangeReviewTone;
  nextAction: string;
}

export function formatSimulatorBudget(value: number): string {
  if (value >= 100_000_000) return `${value / 100_000_000}억`;
  return `${value / 10_000}만`;
}

export function buildSimulatorRangeReviewCopy(input: {
  confirmation: ForecastRangeConfirmation | null;
  isCalculated: boolean;
  loading: boolean;
}): SimulatorRangeReviewCopy {
  if (!input.isCalculated) {
    return {
      label: '실행 전',
      detail: '구간 결과가 들어오면 운영자 검토 상태를 표시합니다.',
      tone: 'idle',
      nextAction: '시뮬레이션 실행 후 예산 구간을 확인합니다.',
    };
  }

  if (input.loading) {
    return {
      label: '구간 계산 중',
      detail: '예산별 결과를 확인하고 있습니다.',
      tone: 'watch',
      nextAction: '계산 완료 후 운영자 검토 가능 여부를 확인합니다.',
    };
  }

  const { confirmation } = input;
  if (!confirmation) {
    return {
      label: '구간 확인 대기',
      detail: '구간 결과가 들어오면 운영자 검토 상태를 표시합니다.',
      tone: 'idle',
      nextAction: '예산 구간 결과를 다시 요청합니다.',
    };
  }

  const detail = `${confirmation.range.pointCount}개 구간 · 최소 매칭 ${confirmation.sufficiency.minimumMatchedCount.toLocaleString()}건`;

  if (confirmation.state === 'accepted_for_operator_review') {
    return {
      label: '운영자 검토 가능',
      detail,
      tone: 'ok',
      nextAction: '운영자가 집계 구간과 근거를 검토합니다.',
    };
  }

  if (confirmation.state === 'blocked_by_sufficiency') {
    return {
      label: '근거 보강 필요',
      detail,
      tone: 'risk',
      nextAction: '검토 전 집계 근거를 보강합니다.',
    };
  }

  if (confirmation.state === 'blocked_by_current_range') {
    return {
      label: '현재 예산 확인 필요',
      detail,
      tone: 'risk',
      nextAction: '현재 예산이 검토 구간에 포함되는지 확인합니다.',
    };
  }

  return {
    label: '구간 재계산 필요',
    detail,
    tone: 'risk',
    nextAction: '유효한 집계 구간으로 재계산합니다.',
  };
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
