import {
  buildForesightSimulatorResultHeaderBadgeViewModel,
  type SimulatorResultHeaderBadgeSampleStatus,
} from './foresightSimulatorResultHeaderBadgeViewModel';
import {
  buildSimulatorRangeReviewCopy,
  type SimulatorRangeReviewTone,
} from './foresightRangeViewModel';
import type { ForecastRangeConfirmation } from './forecastRangeConfirmation';

export type SimulatorDecisionGateTone = 'ok' | 'watch' | 'risk' | 'idle';

export interface SimulatorDecisionResultInput {
  cpm: number;
  frequency: number;
  matchedCount: number;
  predictionMethod?: 'regression' | 'weighted_avg' | 'fallback';
  r2Cpm?: number;
  r2Cpc?: number;
  r2Vtr?: number;
  saturationWarning?: boolean;
}

export interface SimulatorDecisionCopyRow {
  label: string;
  value: string;
  detail: string;
}

export interface SimulatorDecisionStatusRow {
  label: string;
  status: string;
  detail: string;
  tone: SimulatorDecisionGateTone | SimulatorRangeReviewTone;
}

export interface SimulatorReadinessCheck {
  label: string;
  value: string;
}

export type SimulatorSampleStatus = SimulatorResultHeaderBadgeSampleStatus;

export interface SimulatorEvidencePanelTone {
  shell: string;
  label: string;
  badge: string;
  cell: string;
  cellLabel: string;
}

export interface SimulatorForecastEmptyStage {
  label: string;
  status: string;
}

export interface ForesightSimulatorDecisionViewModel {
  readinessTone: string;
  readinessLabel: string;
  benchmarkLabel: string;
  benchmarkDetail: string;
  actionHint: string;
  confidenceScore: number | null;
  evidenceBasisLabel: string;
  confidenceDisplay: string;
  confidenceGateStatus: string;
  confidenceGateTone: 'ok' | 'watch' | 'idle';
  confidenceTone: string;
  sampleStatus: SimulatorSampleStatus;
  sampleStatusLegend: Array<{ label: string; detail: string }>;
  rangeReviewLabel: string;
  rangeReviewDetail: string;
  rangeReviewTone: SimulatorRangeReviewTone;
  predictionRangeSpread: number | null;
  nextActionTitle: string;
  forecastPreview: SimulatorDecisionCopyRow[];
  readinessChecks: SimulatorReadinessCheck[];
  planningBasis: SimulatorDecisionCopyRow[];
  predictionRangeRows: SimulatorDecisionCopyRow[];
  truthBandLabel: string;
  decisionGateRows: SimulatorDecisionStatusRow[];
  evidencePanelTone: SimulatorEvidencePanelTone;
  forecastGuardrails: Array<{ label: string; detail: string }>;
  dataSufficiencyStatus: string;
  dataSufficiencyToneClassName: string;
  dataSufficiencyLedger: SimulatorDecisionCopyRow[];
  forecastEmptySignals: SimulatorDecisionCopyRow[];
  forecastEmptyStages: SimulatorForecastEmptyStage[];
}

export interface BuildForesightSimulatorDecisionViewModelInput {
  result: SimulatorDecisionResultInput | null;
  loading: boolean;
  isCalculated: boolean;
  rangeLoading: boolean;
  rangeConfirmation: ForecastRangeConfirmation | null;
  selectedTargetCount: number;
  marketSelected: boolean;
  marketSampleCount: number;
  matchedSampleCount: number;
  campaignDays: number;
  durationLabel: string;
  budget: number;
  totalReach: number;
  applySeasonBoost: boolean;
  peakCpmMultiplier: number;
  chartDataLength: number;
  objectiveLabel: string;
  genderLabel: string;
  ageLabel: string;
}

function formatCurrency(value: number): string {
  return `₩${value.toLocaleString()}`;
}

function buildEvidencePanelTone(
  confidenceGateTone: 'ok' | 'watch' | 'idle',
): SimulatorEvidencePanelTone {
  if (confidenceGateTone === 'ok') {
    return {
      shell: 'border-teal-100 bg-teal-50/70 text-teal-950',
      label: 'text-teal-700',
      badge: 'border-teal-200 bg-white text-teal-800',
      cell: 'border-teal-100 bg-white/80',
      cellLabel: 'text-teal-700',
    };
  }

  if (confidenceGateTone === 'watch') {
    return {
      shell: 'border-amber-200 bg-amber-50/80 text-amber-950',
      label: 'text-amber-800',
      badge: 'border-amber-300 bg-white text-amber-800',
      cell: 'border-amber-100 bg-white/85',
      cellLabel: 'text-amber-800',
    };
  }

  return {
    shell: 'border-stone-200 bg-[#fbfaf6] text-slate-950',
    label: 'text-stone-500',
    badge: 'border-stone-200 bg-white text-stone-600',
    cell: 'border-stone-200 bg-white/85',
    cellLabel: 'text-stone-500',
  };
}

function buildDataSufficiencyToneClassName(status: string): string {
  if (status === '검토 가능' || status === '운영자 검토 가능') {
    return 'border-teal-200 bg-teal-50 text-teal-800';
  }

  if (
    status === '근거 보강 필요' ||
    status === '구간 보강 필요' ||
    status === '현재 예산 확인 필요' ||
    status === '구간 재계산 필요'
  ) {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  return 'border-stone-200 bg-stone-50 text-stone-600';
}

export function buildForesightSimulatorDecisionViewModel(
  input: BuildForesightSimulatorDecisionViewModelInput,
): ForesightSimulatorDecisionViewModel {
  const resultHeaderBadge = buildForesightSimulatorResultHeaderBadgeViewModel({
    hasResult: Boolean(input.result),
    loading: input.loading,
    isCalculated: input.isCalculated,
    marketSelected: input.marketSelected,
    matchedSampleCount: input.matchedSampleCount,
    predictionMethod: input.result?.predictionMethod,
    r2Cpm: input.result?.r2Cpm,
    r2Cpc: input.result?.r2Cpc,
    r2Vtr: input.result?.r2Vtr,
  });
  const {
    readinessTone,
    readinessLabel,
    confidenceScore,
    evidenceBasisLabel,
    confidenceDisplay,
    confidenceGateStatus,
    confidenceGateTone,
    confidenceTone,
    sampleStatus,
    sampleStatusLegend,
  } = resultHeaderBadge;
  const benchmarkLabel = !input.isCalculated
    ? '시뮬레이션 후 확인'
    : input.loading
      ? '기준 확인 중'
      : input.marketSelected
        ? '선택 업종 기준 사용'
        : '전체 기준 사용';
  const benchmarkDetail = !input.isCalculated
    ? '업종을 선택하면 평균 비교가 더 선명해집니다.'
    : input.marketSelected
      ? `업종 데이터 ${input.marketSampleCount.toLocaleString()}건 · 매칭 ${input.matchedSampleCount.toLocaleString()}건`
      : input.matchedSampleCount > 0
        ? `매칭 ${input.matchedSampleCount.toLocaleString()}건 · 업종 평균 미선택`
        : '비교 기준을 확인하려면 조건을 넓혀 보세요.';
  const actionHint = input.loading
    ? '예측값과 예산 구간을 계산하고 있습니다.'
    : !input.isCalculated
      ? '조건을 정한 뒤 시뮬레이션을 실행하세요.'
      : input.result
        ? '결과를 검토하고 필요하면 예산/타겟을 조정하세요.'
        : '조건을 넓히거나 다시 실행해 결과를 확인하세요.';
  const rangeReviewCopy = buildSimulatorRangeReviewCopy({
    confirmation: input.rangeConfirmation,
    isCalculated: input.isCalculated,
    loading: input.rangeLoading,
  });
  const rangeReviewLabel = rangeReviewCopy.label;
  const rangeReviewDetail = rangeReviewCopy.detail;
  const rangeReviewTone = rangeReviewCopy.tone;
  const predictionRangeSpread = input.result
    ? confidenceScore == null
      ? input.result.predictionMethod === 'fallback'
        ? 0.24
        : 0.18
      : confidenceScore >= 82
        ? 0.08
        : confidenceScore >= 66
          ? 0.14
          : 0.22
    : null;
  const nextActionTitle = input.loading
    ? '예측 계산 중'
    : !input.isCalculated
      ? '시뮬레이션 시작'
      : input.result
        ? '성과 확인'
        : '다시 시뮬레이션';
  const effectiveCpm = input.result
    ? input.applySeasonBoost
      ? Math.round(input.result.cpm * input.peakCpmMultiplier)
      : input.result.cpm
    : 0;
  const forecastPreview = input.result
    ? [
        { label: '예상 도달', value: `${input.totalReach.toLocaleString()}명`, detail: `${input.campaignDays}일 환산` },
        { label: '예상 CPM', value: formatCurrency(effectiveCpm), detail: input.applySeasonBoost ? '시즌 할증 포함' : '현재 조건 기준' },
        { label: '예상 빈도', value: input.result.frequency > 0 ? input.result.frequency.toFixed(2) : '-', detail: input.result.saturationWarning ? '포화 주의' : '노출 압력' },
      ]
    : [
        { label: '예상 도달', value: input.loading ? '계산 중' : '-', detail: '시뮬레이션 후 표시' },
        { label: '예상 CPM', value: input.loading ? '계산 중' : '-', detail: '기준 확인 전' },
        { label: '예상 빈도', value: input.loading ? '계산 중' : '-', detail: '노출 압력 대기' },
      ];
  const readinessChecks = [
    { label: '입력 조건', value: input.selectedTargetCount > 0 ? `${input.selectedTargetCount}개 조건` : '전체 기준' },
    { label: '비교 기준', value: benchmarkLabel },
    { label: '근거 상태', value: confidenceDisplay },
    { label: '구간 검토', value: rangeReviewLabel },
  ];
  const planningBasis = [
    { label: '기준 기간', value: '최근 6개월', detail: benchmarkLabel },
    { label: '비용 기준', value: 'KRW · Net', detail: 'VAT/수수료 제외 매체비 기준' },
    { label: '보정 규칙', value: '보수적 보정', detail: '성수기·포화·CPC 압력은 별도 배지로 표시' },
    {
      label: '데이터 매칭',
      value: input.marketSelected ? `${input.matchedSampleCount}/${input.marketSampleCount || '-'}` : `${input.marketSampleCount || '-'}건`,
      detail: input.marketSelected ? '선택 업종과 맞는 최근 데이터' : '전체 업종 기준',
    },
    { label: '적용 필터', value: `${input.selectedTargetCount}개`, detail: `${input.objectiveLabel} · ${input.genderLabel} · ${input.ageLabel}` },
    { label: '활용 범위', value: '조건 비교', detail: '확정 성과가 아닌 조건별 예상 범위' },
  ];
  const predictionRangeRows = input.result && predictionRangeSpread != null
    ? [
        {
          label: '도달 예상 범위',
          value: `${Math.max(0, Math.round(input.totalReach * (1 - predictionRangeSpread))).toLocaleString()}~${Math.round(input.totalReach * (1 + predictionRangeSpread)).toLocaleString()}명`,
          detail: `${input.campaignDays}일 환산 · ±${Math.round(predictionRangeSpread * 100)}%`,
        },
        {
          label: 'CPM 예상 범위',
          value: `${formatCurrency(Math.max(0, Math.round(effectiveCpm * (1 - predictionRangeSpread))))}~${formatCurrency(Math.round(effectiveCpm * (1 + predictionRangeSpread)))}`,
          detail: input.applySeasonBoost ? '시즌 보정 CPM 기준' : '현재 조건 CPM 기준',
        },
        {
          label: '범위 근거',
          value: input.chartDataLength > 0 ? '예산 곡선 기반 범위' : '단일 결과 범위',
          detail: input.chartDataLength > 0 ? `${input.chartDataLength}개 예산 구간과 함께 검토` : '예산 곡선 대기',
        },
      ]
    : [];
  const truthBandLabel = confidenceScore == null ? evidenceBasisLabel : confidenceDisplay;
  const decisionGateRows: SimulatorDecisionStatusRow[] = [
    {
      label: '기준선 범위',
      status: input.marketSelected ? '업종 매칭' : input.isCalculated ? '전체 기준선' : '실행 대기',
      detail: input.marketSelected
        ? `${input.marketSampleCount.toLocaleString()}건 데이터`
        : input.isCalculated
          ? '업종 평균 미선택'
          : '시뮬레이션 후 확정',
      tone: input.marketSelected ? 'ok' : input.isCalculated ? 'watch' : 'idle',
    },
    {
      label: '예측 근거',
      status: confidenceGateStatus,
      detail: confidenceDisplay,
      tone: confidenceGateTone,
    },
    {
      label: '집행 압력',
      status: input.result?.saturationWarning ? '포화 주의' : input.result ? '범위 내' : '미측정',
      detail: input.result ? `빈도 ${input.result.frequency > 0 ? input.result.frequency.toFixed(2) : '-'}` : '결과 대기',
      tone: input.result?.saturationWarning ? 'risk' : input.result ? 'ok' : 'idle',
    },
    {
      label: '시나리오 구간',
      status: input.chartDataLength > 0 ? rangeReviewLabel : input.rangeLoading ? '계산 중' : '구간 대기',
      detail: input.chartDataLength > 0 ? rangeReviewDetail : '예산 구간 대기',
      tone: input.chartDataLength > 0 ? rangeReviewTone : input.rangeLoading ? 'watch' : 'idle',
    },
  ];
  const evidencePanelTone = buildEvidencePanelTone(confidenceGateTone);
  const forecastGuardrails = input.result
    ? [
        !input.marketSelected
          ? {
              label: '업종 특화 평균처럼 표시하지 않음',
              detail: '선택 업종 기준이 없으면 전체 기준으로만 표기합니다.',
            }
          : null,
        confidenceGateStatus === '근거 보강'
          ? {
              label: '공유 전 근거 상태 확인',
              detail: '보고서나 공유 전 데이터 보강이 필요한 이유를 함께 남깁니다.',
            }
          : null,
        input.result.predictionMethod !== 'regression'
          ? {
              label: '확정 성과 표현 금지',
              detail: `${evidenceBasisLabel} 결과는 조건 비교 범위로만 사용합니다.`,
            }
          : null,
        input.chartDataLength === 0
          ? {
              label: '예산 곡선 없는 단일 KPI 판단 금지',
              detail: '구간 계산 전에는 증액/감액 결정을 확정하지 않습니다.',
            }
          : null,
      ].filter((item): item is { label: string; detail: string } => Boolean(item))
    : [];
  const dataSufficiencyStatus = input.rangeConfirmation
    ? rangeReviewLabel
    : !input.result
      ? '계산 전'
      : confidenceGateStatus === '근거 보강'
        ? '근거 보강 필요'
        : !input.marketSelected
          ? '전체 기준 상태'
          : input.chartDataLength === 0
            ? '구간 보강 필요'
            : '검토 가능';
  const dataSufficiencyLedger = input.result
    ? [
        {
          label: '데이터 매칭',
          value: input.marketSelected
            ? `${input.matchedSampleCount.toLocaleString()}건 매칭`
            : '전체 기준으로 표시',
          detail: input.marketSelected
            ? `업종 데이터 ${input.marketSampleCount.toLocaleString()}건 기준`
            : '선택 업종 평균처럼 보이지 않도록 전체 기준으로만 표기합니다.',
        },
        {
          label: '예측 기준 확인',
          value: confidenceScore == null ? evidenceBasisLabel : confidenceDisplay,
          detail: confidenceScore == null
            ? '설명력 점수 없이 보수적인 기준 또는 최근 데이터 기준으로 표시합니다.'
            : '설명력, 데이터 수, 업종 매칭 여부를 합산한 근거 점수입니다.',
        },
        {
          label: '예산 구간',
          value: input.rangeConfirmation ? rangeReviewLabel : input.chartDataLength > 0 ? `${input.chartDataLength}개 구간` : '예산 곡선 대기',
          detail: input.chartDataLength > 0
            ? rangeReviewDetail
            : '단일 KPI만으로 증액/감액 결정을 확정하지 않습니다.',
        },
        {
          label: '표시 상태',
          value: confidenceGateStatus === '근거 보강' || input.chartDataLength === 0
            ? '보고서 저장 대기'
            : '기준 확인 후 표시',
          detail: '확정 성과처럼 보이지 않도록 결과 범위를 함께 표시합니다.',
        },
      ]
    : [];
  const forecastEmptySignals = [
    {
      label: '기준선 근거',
      value: '최근 6개월 · KRW Net',
      detail: '시뮬레이션 후 업종/목표 필터와 데이터 매칭을 공개합니다.',
    },
    {
      label: '입력 조건',
      value: input.selectedTargetCount > 0 ? `${input.selectedTargetCount}개 조건 선택` : '전체 기준 대기',
      detail: `${input.durationLabel} · 총 예산 ${formatCurrency(input.budget)}`,
    },
    {
      label: '결과 표시',
      value: '임의 결과 없음',
      detail: `${truthBandLabel} 상태에서는 KPI, 도달 곡선, 비교표를 임의로 채우지 않습니다.`,
    },
  ];
  const forecastEmptyStages = [
    { label: '입력 고정', status: input.selectedTargetCount > 0 ? `필터 ${input.selectedTargetCount}개 적용` : '타겟 열림' },
    { label: '기준선 호출', status: '최근 6개월 기준선' },
    { label: '예측 확인', status: 'KPI와 구간 동시 확인' },
    { label: '결과 확인', status: '검토 / 수정 / 확장' },
  ];

  return {
    readinessTone,
    readinessLabel,
    benchmarkLabel,
    benchmarkDetail,
    actionHint,
    confidenceScore,
    evidenceBasisLabel,
    confidenceDisplay,
    confidenceGateStatus,
    confidenceGateTone,
    confidenceTone,
    sampleStatus,
    sampleStatusLegend,
    rangeReviewLabel,
    rangeReviewDetail,
    rangeReviewTone,
    predictionRangeSpread,
    nextActionTitle,
    forecastPreview,
    readinessChecks,
    planningBasis,
    predictionRangeRows,
    truthBandLabel,
    decisionGateRows,
    evidencePanelTone,
    forecastGuardrails,
    dataSufficiencyStatus,
    dataSufficiencyToneClassName: buildDataSufficiencyToneClassName(dataSufficiencyStatus),
    dataSufficiencyLedger,
    forecastEmptySignals,
    forecastEmptyStages,
  };
}
