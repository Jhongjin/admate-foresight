import {
  buildForesightPredictionEvidenceViewModel,
  type ForesightPredictionEvidenceTone,
  type ForesightPredictionMethod,
} from './foresightPredictionEvidenceViewModel';

export interface BuildForesightSimulatorResultHeaderBadgeViewModelInput {
  hasResult: boolean;
  loading: boolean;
  isCalculated: boolean;
  marketSelected: boolean;
  matchedSampleCount: number;
  predictionMethod?: ForesightPredictionMethod;
  r2Cpm?: number;
  r2Cpc?: number;
  r2Vtr?: number;
}

export interface SimulatorResultHeaderBadgeSampleStatus {
  label: string;
  detail: string;
  tone: string;
}

export interface ForesightSimulatorResultHeaderBadgeViewModel {
  readinessTone: string;
  readinessLabel: string;
  confidenceScore: number | null;
  evidenceBasisLabel: string;
  confidenceDisplay: string;
  confidenceGateStatus: '검토 가능' | '근거 보강' | '최근 데이터 기준' | '미산정';
  confidenceGateTone: ForesightPredictionEvidenceTone;
  confidenceTone: string;
  sampleStatus: SimulatorResultHeaderBadgeSampleStatus;
  sampleStatusLegend: Array<{ label: string; detail: string }>;
}

export function buildForesightSimulatorResultHeaderBadgeViewModel(
  input: BuildForesightSimulatorResultHeaderBadgeViewModelInput,
): ForesightSimulatorResultHeaderBadgeViewModel {
  const predictionEvidence = buildForesightPredictionEvidenceViewModel({
    predictionMethod: input.predictionMethod,
    r2Cpm: input.r2Cpm,
    r2Cpc: input.r2Cpc,
    r2Vtr: input.r2Vtr,
    matchedCount: input.matchedSampleCount,
    marketSelected: input.marketSelected,
    loading: input.loading,
    isCalculated: input.isCalculated,
  });

  const readinessTone = input.loading
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : !input.isCalculated
      ? 'border-gray-200 bg-gray-50 text-gray-600'
      : input.hasResult
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-amber-200 bg-amber-50 text-amber-700';
  const readinessLabel = input.loading
    ? '계산 중'
    : !input.isCalculated
      ? '설정 대기'
      : input.hasResult
        ? '예측 준비'
        : '결과 대기';
  const sampleStatus = !input.hasResult || input.loading
    ? { label: '주의', detail: input.loading ? '계산 중' : '실행 전', tone: 'border-amber-200 bg-amber-50 text-amber-800' }
    : predictionEvidence.gateStatus === '근거 보강' || input.matchedSampleCount < 20
      ? { label: '부족', detail: input.matchedSampleCount > 0 ? `매칭 ${input.matchedSampleCount.toLocaleString()}건` : '매칭 없음', tone: 'border-red-200 bg-red-50 text-red-700' }
      : input.marketSelected && input.matchedSampleCount >= 50 && (predictionEvidence.score == null || predictionEvidence.score >= 66)
        ? { label: '데이터 충분', detail: `매칭 ${input.matchedSampleCount.toLocaleString()}건`, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
        : { label: '주의', detail: input.matchedSampleCount > 0 ? `매칭 ${input.matchedSampleCount.toLocaleString()}건` : '전체 기준', tone: 'border-amber-200 bg-amber-50 text-amber-800' };
  const sampleStatusLegend = [
    { label: '데이터 충분', detail: '업종 매칭과 기준 점수가 안정적일 때 표시합니다.' },
    { label: '주의', detail: '전체 기준 또는 일부 근거만으로 검토할 때 표시합니다.' },
    { label: '확인 필요', detail: '데이터가 적거나 보강이 필요할 때 표시합니다.' },
  ];

  return {
    readinessTone,
    readinessLabel,
    confidenceScore: predictionEvidence.score,
    evidenceBasisLabel: predictionEvidence.basisLabel,
    confidenceDisplay: predictionEvidence.display,
    confidenceGateStatus: predictionEvidence.gateStatus,
    confidenceGateTone: predictionEvidence.gateTone,
    confidenceTone: predictionEvidence.textToneClassName,
    sampleStatus,
    sampleStatusLegend,
  };
}
