export type SimulatorMlBaselineModelType = 'random_forest' | 'linear_regression' | 'unknown';
export type SimulatorMlBaselineEvidenceTone = 'strong' | 'watch' | 'low';

export interface ForesightSimulatorMlBaselineResult {
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  reach: number | null;
  r2Cpm: number | null;
  r2Ctr: number | null;
  cvR2: number | null;
  modelType: SimulatorMlBaselineModelType;
  sampleCount: number | null;
}

export interface SimulatorMlBaselineBadgeViewModel {
  label: string;
  className: string;
}

export interface SimulatorMlBaselineEvidenceViewModel {
  label: string;
  indicator: string;
  indicatorClassName: string;
  tone: SimulatorMlBaselineEvidenceTone;
}

export interface SimulatorMlBaselineMetricCardViewModel {
  label: string;
  value: string;
  evidence: SimulatorMlBaselineEvidenceViewModel | null;
}

export interface ForesightSimulatorMlBaselineViewModel {
  shouldRender: boolean;
  eyebrow: string;
  title: string;
  modelBadge: SimulatorMlBaselineBadgeViewModel | null;
  summaryLabel: string | null;
  loading: {
    visible: boolean;
    label: string;
  };
  error: {
    visible: boolean;
    detail: string;
  };
  metrics: {
    visible: boolean;
    cards: SimulatorMlBaselineMetricCardViewModel[];
  };
  footer: {
    visible: boolean;
    label: string;
  };
}

export interface BuildForesightSimulatorMlBaselineViewModelInput {
  result: ForesightSimulatorMlBaselineResult | null;
  loading: boolean;
  errorMessage: string;
  isCalculated: boolean;
  hasPrimaryPrediction: boolean;
}

const BADGE_BASE_CLASS = 'text-[11px] font-medium px-2 py-0.5 rounded-full';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readNonNegativeNumber(value: unknown): number | null {
  const numberValue = readFiniteNumber(value);
  return numberValue != null && numberValue >= 0 ? numberValue : null;
}

function readNonNegativeInteger(value: unknown): number | null {
  const numberValue = readNonNegativeNumber(value);
  return numberValue == null ? null : Math.round(numberValue);
}

function normalizeModelType(value: unknown): SimulatorMlBaselineModelType {
  if (value === 'random_forest' || value === 'linear_regression') return value;
  return 'unknown';
}

function formatCurrency(value: number | null): string {
  return value == null ? '—' : `₩${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(2)}%`;
}

function formatPeople(value: number | null): string {
  return value == null ? '—' : `${Math.round(value).toLocaleString()}명`;
}

function formatEvidenceScore(value: number): string {
  return value.toFixed(3);
}

function buildModelBadge(
  result: ForesightSimulatorMlBaselineResult | null,
): SimulatorMlBaselineBadgeViewModel | null {
  if (!result) return null;

  if (result.modelType === 'random_forest') {
    return {
      label: '보수 기준선',
      className: `${BADGE_BASE_CLASS} bg-teal-50 text-teal-700`,
    };
  }

  if (result.modelType === 'linear_regression') {
    return {
      label: '추세 기준선',
      className: `${BADGE_BASE_CLASS} bg-sky-50 text-sky-700`,
    };
  }

  return {
    label: '모델 확인 필요',
    className: `${BADGE_BASE_CLASS} bg-amber-50 text-amber-700`,
  };
}

function buildSummaryLabel(result: ForesightSimulatorMlBaselineResult | null): string | null {
  if (!result) return null;

  const parts = [];
  if (result.sampleCount != null) parts.push(`기준 데이터 ${result.sampleCount.toLocaleString()}건`);
  if (result.cvR2 != null) parts.push(`설명력 ${formatEvidenceScore(result.cvR2)}`);

  return parts.length > 0 ? parts.join(' · ') : null;
}

function buildEvidence(value: number | null): SimulatorMlBaselineEvidenceViewModel | null {
  if (value == null) return null;

  if (value >= 0.7) {
    return {
      label: `근거 점수 ${formatEvidenceScore(value)}`,
      indicator: '●',
      indicatorClassName: 'text-emerald-500',
      tone: 'strong',
    };
  }

  if (value >= 0.5) {
    return {
      label: `근거 점수 ${formatEvidenceScore(value)}`,
      indicator: '◐',
      indicatorClassName: 'text-amber-500',
      tone: 'watch',
    };
  }

  return {
    label: `근거 점수 ${formatEvidenceScore(value)}`,
    indicator: '○',
    indicatorClassName: 'text-red-400',
    tone: 'low',
  };
}

function buildMetricCards(
  result: ForesightSimulatorMlBaselineResult | null,
): SimulatorMlBaselineMetricCardViewModel[] {
  if (!result) return [];

  return [
    { label: 'CPM', value: formatCurrency(result.cpm), evidence: buildEvidence(result.r2Cpm) },
    { label: 'CTR', value: formatPercent(result.ctr), evidence: buildEvidence(result.r2Ctr) },
    { label: 'CPC', value: formatCurrency(result.cpc), evidence: null },
    { label: '예상 도달', value: formatPeople(result.reach), evidence: null },
  ];
}

export function normalizeForesightSimulatorMlBaselineResponse(
  value: unknown,
): ForesightSimulatorMlBaselineResult | null {
  if (!isRecord(value)) return null;

  const cpm = readNonNegativeNumber(value.cpm);
  const ctr = readNonNegativeNumber(value.ctr);
  const cpc = readNonNegativeNumber(value.cpc);
  const reach = readNonNegativeNumber(value.reach);

  if ([cpm, ctr, cpc, reach].every((metric) => metric == null)) return null;

  return {
    cpm,
    ctr,
    cpc,
    reach,
    r2Cpm: readFiniteNumber(value.r2_cpm),
    r2Ctr: readFiniteNumber(value.r2_ctr),
    cvR2: readFiniteNumber(value.cv_r2),
    modelType: normalizeModelType(value.model_type),
    sampleCount: readNonNegativeInteger(value.n_samples),
  };
}

export function buildForesightSimulatorMlBaselineViewModel(
  input: BuildForesightSimulatorMlBaselineViewModelInput,
): ForesightSimulatorMlBaselineViewModel {
  const showLoading = input.isCalculated && input.loading;
  const showError = input.isCalculated && !input.loading && input.errorMessage.trim().length > 0;
  const showMetrics = input.isCalculated && !showLoading && !showError && input.result != null;
  const shouldRender = input.isCalculated && (showLoading || showError || input.result != null);

  return {
    shouldRender,
    eyebrow: '보조 기준',
    title: '보조 기준선 검토',
    modelBadge: showMetrics ? buildModelBadge(input.result) : null,
    summaryLabel: showMetrics ? buildSummaryLabel(input.result) : null,
    loading: {
      visible: showLoading,
      label: '보조 기준선을 계산하고 있습니다...',
    },
    error: {
      visible: showError,
      detail: input.hasPrimaryPrediction ? '기본 예측 우선 검토' : '보조 기준선 없음',
    },
    metrics: {
      visible: showMetrics,
      cards: showMetrics ? buildMetricCards(input.result) : [],
    },
    footer: {
      visible: shouldRender && !showLoading,
      label: '추가 예측 기준은 AdMate 기준 데이터로 확인합니다.',
    },
  };
}
