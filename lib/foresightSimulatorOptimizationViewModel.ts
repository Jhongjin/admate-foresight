import type { ForesightPredictionEvidenceViewModel } from './foresightPredictionEvidenceViewModel';

const DIMINISHING_RETURNS_BETA = 0.864;

export type SimulatorOptimizationTone = 'positive' | 'watch' | 'neutral';

export interface SimulatorOptimizationResultInput {
  cpm: number;
  reach: number;
  frequency: number;
  predictionMethod?: 'regression' | 'weighted_avg' | 'fallback';
}

export interface SimulatorOptimizationRangePoint {
  budget: number;
  reach: number;
}

export interface SimulatorOptimizationScenarioInput {
  label: string;
  cpm: number;
  reach: number;
  vtr: number;
  cpc: number;
}

export interface SimulatorOptimizationExpansionViewModel {
  tone: SimulatorOptimizationTone;
  title: string;
  description: string;
  badgeLabel: string;
  actionLead: string;
  actionValue: string;
  actionSuffix: string;
  actionMuted: string;
  additionalReach: number;
  additionalBudget: number;
  frequency: number;
  reachRate: number;
  shellClassName: string;
  badgeClassName: string;
  valueClassName: string;
}

export interface SimulatorOptimizationScenarioRow {
  label: string;
  detail: string;
  statusLabel: string;
  tone: SimulatorOptimizationTone;
  cpm: number;
  reach: number;
  cpmBetter: boolean;
  reachMore: boolean;
  shellClassName: string;
  statusClassName: string;
}

export interface SimulatorOptimizationScenarioSectionViewModel {
  visible: boolean;
  title: string;
  description: string;
  loading: boolean;
  loadingLabel: string;
  showEmptyError: boolean;
  showInlineError: boolean;
  currentTarget: {
    title: string;
    detail: string;
    badgeLabel: string;
  } | null;
  rows: SimulatorOptimizationScenarioRow[];
}

export interface ForesightSimulatorOptimizationViewModel {
  shouldRender: boolean;
  title: string;
  description: string;
  evidenceReady: boolean;
  expansion: SimulatorOptimizationExpansionViewModel | null;
  scenario: SimulatorOptimizationScenarioSectionViewModel;
}

export interface BuildForesightSimulatorOptimizationViewModelInput {
  result: SimulatorOptimizationResultInput | null;
  rangeData: SimulatorOptimizationRangePoint[];
  scenarios: SimulatorOptimizationScenarioInput[];
  scenarioLoading: boolean;
  scenarioError: boolean;
  loading: boolean;
  isCalculated: boolean;
  monthlyBudget: number;
  campaignBudget: number;
  durationFactor: number;
  totalReach: number;
  confidenceScore: number | null;
  confidenceGateStatus: string;
  confidenceGateTone: ForesightPredictionEvidenceViewModel['gateTone'];
}

function formatCurrency(value: number): string {
  return `₩${Math.round(value).toLocaleString()}`;
}

function formatPeople(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString()}명`;
}

function hasReviewableEvidence(input: BuildForesightSimulatorOptimizationViewModelInput): boolean {
  return input.isCalculated
    && !input.loading
    && input.confidenceGateStatus === '검토 가능'
    && input.confidenceGateTone === 'ok'
    && (input.confidenceScore == null || input.confidenceScore >= 66);
}

function calculateReachAtBudget(
  rangeData: SimulatorOptimizationRangePoint[],
  targetBudget: number,
): number {
  const lower = [...rangeData].reverse().find((point) => point.budget <= targetBudget);
  const upper = rangeData.find((point) => point.budget > targetBudget);

  if (lower && upper) {
    if (upper.budget === lower.budget) return lower.reach;
    const ratio = (targetBudget - lower.budget) / (upper.budget - lower.budget);
    return lower.reach + ratio * (upper.reach - lower.reach);
  }

  if (lower && lower.budget > 0) {
    return lower.reach * Math.pow(targetBudget / lower.budget, DIMINISHING_RETURNS_BETA);
  }

  return 0;
}

function buildExpansionViewModel(
  input: BuildForesightSimulatorOptimizationViewModelInput,
  evidenceReady: boolean,
): SimulatorOptimizationExpansionViewModel | null {
  if (!input.result) return null;

  const frequency = Number.isFinite(input.result.frequency) ? input.result.frequency : 0;
  const currentReach = Number.isFinite(input.result.reach) ? input.result.reach : 0;
  const maxMonthlyReach = input.rangeData.length > 0
    ? input.rangeData[input.rangeData.length - 1]?.reach ?? 0
    : 0;
  const reachRate = maxMonthlyReach > 0 ? currentReach / maxMonthlyReach : 1;
  const canExpand = frequency < 1.5 && reachRate <= 0.3;

  if (!canExpand) return null;

  const targetBudget = input.monthlyBudget * 1.2;
  const reachAtTargetBudget = calculateReachAtBudget(input.rangeData, targetBudget);
  const additionalReach = Math.max(
    0,
    Math.round((reachAtTargetBudget - currentReach) * input.durationFactor),
  );
  const additionalBudget = Math.round(input.campaignBudget * 0.2);
  const hasAdditionalReachEstimate = additionalReach > 0;
  const positive = evidenceReady && hasAdditionalReachEstimate;

  if (positive) {
    return {
      tone: 'positive',
      title: '추가 확보 가능 성과',
      description: '현재 설정한 타겟 시장에 광고가 아직 충분히 노출되지 않아, 성과를 더 키울 수 있는 여유가 있습니다.',
      badgeLabel: '+20%',
      actionLead: '예산을 20% 늘리면 약',
      actionValue: formatPeople(additionalReach),
      actionSuffix: '의 고객에게 추가로 도달할 수 있습니다.',
      actionMuted: `(+${formatCurrency(additionalBudget)})`,
      additionalReach,
      additionalBudget,
      frequency,
      reachRate,
      shellClassName: 'rounded-md p-4 border-l-4 border-emerald-400 bg-emerald-50',
      badgeClassName: 'rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700',
      valueClassName: 'text-emerald-700',
    };
  }

  return {
    tone: 'watch',
    title: hasAdditionalReachEstimate ? '확장 판단 근거 확인' : '추가 도달 산정 확인',
    description: hasAdditionalReachEstimate
      ? '도달 여지는 보이지만, 근거 보강 후 증액 여부를 확인하세요.'
      : '노출 여지는 보이지만, 추가 도달 규모가 아직 충분히 계산되지 않았습니다.',
    badgeLabel: '+20%',
    actionLead: hasAdditionalReachEstimate ? '예산 20% 확대 기준 약' : '예산 20% 확대 기준',
    actionValue: hasAdditionalReachEstimate ? formatPeople(additionalReach) : '추가 도달 산정 대기',
    actionSuffix: hasAdditionalReachEstimate ? '의 추가 도달 가능성으로만 참고하세요.' : '입니다.',
    actionMuted: `(+${formatCurrency(additionalBudget)})`,
    additionalReach,
    additionalBudget,
    frequency,
    reachRate,
    shellClassName: 'rounded-md p-4 border-l-4 border-amber-400 bg-amber-50',
    badgeClassName: 'rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700',
    valueClassName: 'text-amber-700',
  };
}

function buildScenarioRowClassName(tone: SimulatorOptimizationTone): string {
  if (tone === 'positive') return 'bg-emerald-50 border-emerald-100';
  if (tone === 'watch') return 'bg-amber-50 border-amber-100';
  return 'bg-white border-gray-100';
}

function buildScenarioStatusClassName(tone: SimulatorOptimizationTone): string {
  if (tone === 'positive') return 'bg-emerald-600 text-white border-emerald-600';
  if (tone === 'watch') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-gray-100 text-gray-500 border-gray-200';
}

function buildScenarioSection(
  input: BuildForesightSimulatorOptimizationViewModelInput,
  evidenceReady: boolean,
): SimulatorOptimizationScenarioSectionViewModel {
  const emptySection: SimulatorOptimizationScenarioSectionViewModel = {
    visible: false,
    title: '타겟 범위 확장 시 효율 변화',
    description: '성별 또는 연령 타겟을 전체로 넓혔을 때 예상 성과를 비교합니다',
    loading: input.scenarioLoading,
    loadingLabel: '시나리오 계산 중...',
    showEmptyError: false,
    showInlineError: false,
    currentTarget: null,
    rows: [],
  };

  if (!input.result) return emptySection;

  const rows = input.scenarios.map((scenario) => {
    const campaignReach = Math.max(0, Math.round(scenario.reach * input.durationFactor));
    const cpmBetter = scenario.cpm > 0 && input.result!.cpm > 0 && scenario.cpm < input.result!.cpm;
    const reachMore = campaignReach > input.totalReach;
    const overallBetter = cpmBetter || reachMore;
    const tone: SimulatorOptimizationTone = evidenceReady && overallBetter
      ? 'positive'
      : !evidenceReady && overallBetter
        ? 'watch'
        : 'neutral';

    return {
      label: scenario.label,
      detail: `CPM ${formatCurrency(scenario.cpm)} · 도달 ${formatPeople(campaignReach)}`,
      statusLabel: tone === 'positive' ? '효율 개선' : tone === 'watch' ? '근거 확인' : '변화 없음',
      tone,
      cpm: scenario.cpm,
      reach: scenario.reach,
      cpmBetter,
      reachMore,
      shellClassName: buildScenarioRowClassName(tone),
      statusClassName: buildScenarioStatusClassName(tone),
    };
  });
  const visible = input.scenarioLoading || rows.length > 0 || input.scenarioError;

  return {
    ...emptySection,
    visible,
    showEmptyError: !input.scenarioLoading && input.scenarioError && rows.length === 0,
    showInlineError: !input.scenarioLoading && input.scenarioError && rows.length > 0,
    currentTarget: visible
      ? {
          title: '현재 타겟 기준',
          detail: `CPM ${formatCurrency(input.result.cpm)} · 도달 ${formatPeople(input.totalReach)}`,
          badgeLabel: '기준값',
        }
      : null,
    rows,
  };
}

export function buildForesightSimulatorOptimizationViewModel(
  input: BuildForesightSimulatorOptimizationViewModelInput,
): ForesightSimulatorOptimizationViewModel {
  const evidenceReady = hasReviewableEvidence(input);
  const expansion = buildExpansionViewModel(input, evidenceReady);
  const scenario = buildScenarioSection(input, evidenceReady);

  return {
    shouldRender: Boolean(input.result && (expansion || scenario.visible)),
    title: '캠페인 최적화 가이드',
    description: '지금 더 투자해도 좋은지, 현재 설정을 유지할지 확인하세요',
    evidenceReady,
    expansion,
    scenario,
  };
}
