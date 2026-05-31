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

export interface SimulatorRangeDecisionCue {
  key:
    | 'current_budget_anchor'
    | 'range_spread_coverage'
    | 'marginal_efficiency'
    | 'basis_status'
    | 'no_single_kpi_decision';
  tone: SimulatorRangeReviewTone;
  title: string;
  summary: string;
}

export interface SimulatorRangeViewModel {
  chartData: SimulatorRangeChartRow[];
  rangeTrendBrief: SimulatorRangeTrendBriefItem[];
  decisionCues: SimulatorRangeDecisionCue[];
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

function buildCurrentBudgetCue(input: {
  confirmation: ForecastRangeConfirmation | null;
  selected: SimulatorRangeChartRow;
  selectedBudgetExact: boolean;
}): SimulatorRangeDecisionCue {
  if (input.confirmation?.state === 'blocked_by_current_range') {
    return {
      key: 'current_budget_anchor',
      tone: 'risk',
      title: '현재 예산 기준점 확인',
      summary: '현재 예산이 검토 구간에 없어 증감 판단 전 범위를 다시 맞춥니다.',
    };
  }

  if (input.confirmation?.range.currentBudget === null) {
    return {
      key: 'current_budget_anchor',
      tone: 'watch',
      title: '현재 예산 기준점 대기',
      summary: '현재 예산 기준이 확인되면 구간 안의 위치를 함께 봅니다.',
    };
  }

  if (!input.selectedBudgetExact) {
    return {
      key: 'current_budget_anchor',
      tone: 'watch',
      title: '가까운 예산 기준',
      summary: `${input.selected.label} 구간을 선택 예산과 가장 가까운 기준으로 봅니다.`,
    };
  }

  return {
    key: 'current_budget_anchor',
    tone: 'ok',
    title: '현재 예산 기준점',
    summary: `${input.selected.label} 예산을 구간 안의 비교 기준으로 봅니다.`,
  };
}

function buildRangeSpreadCue(input: {
  confirmation: ForecastRangeConfirmation | null;
  first: SimulatorRangeChartRow;
  last: SimulatorRangeChartRow;
  pointCount: number;
}): SimulatorRangeDecisionCue {
  const tone: SimulatorRangeReviewTone = input.confirmation?.state === 'rejected_invalid_range'
    ? 'risk'
    : input.pointCount >= 3
      ? 'ok'
      : 'watch';

  return {
    key: 'range_spread_coverage',
    tone,
    title: '구간 폭 확인',
    summary: `${input.first.label}~${input.last.label}, ${input.pointCount}개 예산대를 비교 범위로 봅니다.`,
  };
}

function buildMarginalEfficiencyCue(input: {
  first: SimulatorRangeChartRow;
  last: SimulatorRangeChartRow;
  efficiencySignal: string;
}): SimulatorRangeDecisionCue {
  if (input.last.reachEfficiency < input.first.reachEfficiency) {
    return {
      key: 'marginal_efficiency',
      tone: 'watch',
      title: '한계 효율 체감',
      summary: '예산이 커질수록 만원당 도달은 낮아지는 흐름입니다.',
    };
  }

  if (input.last.reachEfficiency > input.first.reachEfficiency) {
    return {
      key: 'marginal_efficiency',
      tone: 'ok',
      title: '한계 효율 개선',
      summary: '예산 상단에서 만원당 도달이 더 나은 흐름입니다.',
    };
  }

  return {
    key: 'marginal_efficiency',
    tone: 'idle',
    title: input.efficiencySignal,
    summary: '구간 안에서 만원당 도달 흐름이 크게 달라지지 않습니다.',
  };
}

function buildBasisCue(
  confirmation: ForecastRangeConfirmation | null,
): SimulatorRangeDecisionCue {
  if (!confirmation) {
    return {
      key: 'basis_status',
      tone: 'idle',
      title: '근거 상태 대기',
      summary: '구간 결과가 들어오면 근거 충분 여부를 함께 표시합니다.',
    };
  }

  const matchedCount = confirmation.sufficiency.minimumMatchedCount.toLocaleString();
  const requiredCount = confirmation.sufficiency.minimumRequired.toLocaleString();

  if (confirmation.state === 'accepted_for_operator_review') {
    return {
      key: 'basis_status',
      tone: 'ok',
      title: '근거 상태 충분',
      summary: `최소 매칭 ${matchedCount}건으로 구간 검토가 가능합니다.`,
    };
  }

  if (confirmation.state === 'blocked_by_sufficiency') {
    return {
      key: 'basis_status',
      tone: 'risk',
      title: '근거 보강 필요',
      summary: `최소 매칭 ${matchedCount}건, 기준 ${requiredCount}건으로 보강 후 봅니다.`,
    };
  }

  if (confirmation.state === 'blocked_by_current_range') {
    return {
      key: 'basis_status',
      tone: confirmation.sufficiency.blockedByInsufficientData ? 'risk' : 'watch',
      title: confirmation.sufficiency.blockedByInsufficientData ? '근거 보강 필요' : '근거 상태 확인',
      summary: `최소 매칭 ${matchedCount}건이며 현재 예산 포함 여부를 먼저 맞춥니다.`,
    };
  }

  return {
    key: 'basis_status',
    tone: 'risk',
    title: '구간 근거 없음',
    summary: '유효한 예산 구간이 없어 재계산 후 검토합니다.',
  };
}

function buildGuardrailCue(): SimulatorRangeDecisionCue {
  return {
    key: 'no_single_kpi_decision',
    tone: 'watch',
    title: '단일 KPI 판단 금지',
    summary: '도달, 비용, 근거 상태를 함께 보고 예산 결정을 검토합니다.',
  };
}

export function buildSimulatorRangeViewModel(input: {
  rangeData: MonthlyRangePoint[];
  campaignDays: number;
  selectedBudget: number;
  confirmation?: ForecastRangeConfirmation | null;
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
      decisionCues: [],
    };
  }

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const selectedBudgetExact = chartData.some((row) => row.budget === input.selectedBudget);
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
    decisionCues: [
      buildCurrentBudgetCue({
        confirmation: input.confirmation ?? null,
        selected,
        selectedBudgetExact,
      }),
      buildRangeSpreadCue({
        confirmation: input.confirmation ?? null,
        first,
        last,
        pointCount: chartData.length,
      }),
      buildMarginalEfficiencyCue({
        first,
        last,
        efficiencySignal,
      }),
      buildBasisCue(input.confirmation ?? null),
      buildGuardrailCue(),
    ],
  };
}
