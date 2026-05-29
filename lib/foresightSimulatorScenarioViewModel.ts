export type SimulatorScenarioTone = 'positive' | 'watch' | 'neutral';
export type SimulatorScenarioGateTone = 'ok' | 'watch' | 'idle';

export interface SimulatorScenarioResultInput {
  cpm: number;
  reach: number;
}

export interface SimulatorScenarioInput {
  label: string;
  cpm: number;
  reach: number;
  vtr: number;
  cpc: number;
}

export interface SimulatorScenarioRow {
  label: string;
  detail: string;
  statusLabel: string;
  tone: SimulatorScenarioTone;
  cpm: number;
  reach: number;
  cpmBetter: boolean;
  reachMore: boolean;
  shellClassName: string;
  statusClassName: string;
}

export interface ForesightSimulatorScenarioViewModel {
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
  rows: SimulatorScenarioRow[];
}

export interface BuildForesightSimulatorScenarioViewModelInput {
  result: SimulatorScenarioResultInput | null;
  scenarios: SimulatorScenarioInput[];
  scenarioLoading: boolean;
  scenarioError: boolean;
  loading: boolean;
  isCalculated: boolean;
  durationFactor: number;
  totalReach: number;
  confidenceScore: number | null;
  confidenceGateStatus: string;
  confidenceGateTone: SimulatorScenarioGateTone;
}

const SAFE_SCENARIO_LABELS = new Set([
  '성별 전체 확장',
  '연령 전체 확장',
]);

function formatCurrency(value: number): string {
  return `₩${Math.round(value).toLocaleString()}`;
}

function formatPeople(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString()}명`;
}

function readFiniteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function sanitizeScenarioLabel(label: string): string {
  return SAFE_SCENARIO_LABELS.has(label) ? label : '타겟 확장 시나리오';
}

function hasReviewableEvidence(input: BuildForesightSimulatorScenarioViewModelInput): boolean {
  return input.isCalculated
    && !input.loading
    && input.confidenceGateStatus === '검토 가능'
    && input.confidenceGateTone === 'ok'
    && (input.confidenceScore == null || input.confidenceScore >= 66);
}

function buildScenarioRowClassName(tone: SimulatorScenarioTone): string {
  if (tone === 'positive') return 'bg-emerald-50 border-emerald-100';
  if (tone === 'watch') return 'bg-amber-50 border-amber-100';
  return 'bg-white border-gray-100';
}

function buildScenarioStatusClassName(tone: SimulatorScenarioTone): string {
  if (tone === 'positive') return 'bg-emerald-600 text-white border-emerald-600';
  if (tone === 'watch') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-gray-100 text-gray-500 border-gray-200';
}

export function buildForesightSimulatorScenarioViewModel(
  input: BuildForesightSimulatorScenarioViewModelInput,
): ForesightSimulatorScenarioViewModel {
  const emptyViewModel: ForesightSimulatorScenarioViewModel = {
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

  if (!input.result) return emptyViewModel;

  const evidenceReady = hasReviewableEvidence(input);
  const currentCpm = readFiniteNumber(input.result.cpm);
  const currentReach = Math.max(0, Math.round(readFiniteNumber(input.totalReach)));
  const durationFactor = Number.isFinite(input.durationFactor) ? input.durationFactor : 0;
  const rows = input.scenarios.map((scenario) => {
    const cpm = readFiniteNumber(scenario.cpm);
    const reach = readFiniteNumber(scenario.reach);
    const campaignReach = Math.max(0, Math.round(reach * durationFactor));
    const cpmBetter = cpm > 0 && currentCpm > 0 && cpm < currentCpm;
    const reachMore = campaignReach > currentReach;
    const overallBetter = cpmBetter || reachMore;
    const tone: SimulatorScenarioTone = evidenceReady && overallBetter
      ? 'positive'
      : !evidenceReady && overallBetter
        ? 'watch'
        : 'neutral';

    return {
      label: sanitizeScenarioLabel(scenario.label),
      detail: `CPM ${formatCurrency(cpm)} · 도달 ${formatPeople(campaignReach)}`,
      statusLabel: tone === 'positive' ? '효율 개선' : tone === 'watch' ? '근거 확인' : '변화 없음',
      tone,
      cpm,
      reach,
      cpmBetter,
      reachMore,
      shellClassName: buildScenarioRowClassName(tone),
      statusClassName: buildScenarioStatusClassName(tone),
    };
  });
  const visible = input.scenarioLoading || rows.length > 0 || input.scenarioError;

  return {
    ...emptyViewModel,
    visible,
    showEmptyError: !input.scenarioLoading && input.scenarioError && rows.length === 0,
    showInlineError: !input.scenarioLoading && input.scenarioError && rows.length > 0,
    currentTarget: visible
      ? {
          title: '현재 타겟 기준',
          detail: `CPM ${formatCurrency(currentCpm)} · 도달 ${formatPeople(currentReach)}`,
          badgeLabel: '기준값',
        }
      : null,
    rows,
  };
}
