export type ForesightPredictionMethod = 'regression' | 'weighted_avg' | 'fallback';
export type ForesightPredictionEvidenceTone = 'ok' | 'watch' | 'idle';

export interface ForesightPredictionEvidenceInput {
  predictionMethod?: ForesightPredictionMethod;
  r2Cpm?: number;
  r2Cpc?: number;
  r2Vtr?: number;
  matchedCount: number;
  marketSelected: boolean;
  loading: boolean;
  isCalculated: boolean;
}

export interface ForesightPredictionEvidenceViewModel {
  score: number | null;
  averageR2: number | null;
  basisLabel: string;
  scoreLabel: string;
  display: string;
  gateStatus: '검토 가능' | '근거 보강' | '최근 데이터 기준' | '미산정';
  gateTone: ForesightPredictionEvidenceTone;
  textToneClassName: string;
}

function averageFiniteValues(values: Array<number | undefined>): number | null {
  const finiteValues = values.filter((value): value is number => (
    typeof value === 'number' && Number.isFinite(value)
  ));

  if (finiteValues.length === 0) return null;

  return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
}

export function buildForesightPredictionEvidenceViewModel(
  input: ForesightPredictionEvidenceInput,
): ForesightPredictionEvidenceViewModel {
  const averageR2 = input.predictionMethod
    ? averageFiniteValues([input.r2Cpm, input.r2Cpc, input.r2Vtr])
    : null;
  const score = input.predictionMethod === 'regression' && averageR2 != null
    ? Math.min(
        96,
        Math.max(
          42,
          Math.round(
            (averageR2 * 70)
            + (Math.min(input.matchedCount, 200) / 200) * 20
            + (input.marketSelected ? 6 : 0),
          ),
        ),
      )
    : null;
  const basisLabel = input.predictionMethod === 'regression'
    ? averageR2 == null ? '근거 점수 확인 전' : '근거 점수'
    : input.predictionMethod === 'weighted_avg'
      ? '최근 데이터 기준'
      : input.predictionMethod === 'fallback'
        ? '근거 보강'
        : '실행 전';
  const scoreLabel = input.loading
    ? '계산 중'
    : score == null
      ? basisLabel
      : score >= 82
        ? '근거 강함'
        : score >= 66
          ? '근거 보통'
          : '근거 보강';
  const display = score == null ? scoreLabel : `${score}% · ${scoreLabel}`;
  const gateStatus = score == null
    ? input.predictionMethod === 'fallback'
      ? '근거 보강'
      : input.predictionMethod
        ? '최근 데이터 기준'
        : '미산정'
    : score >= 66
      ? '검토 가능'
      : '근거 보강';
  const gateTone = score == null
    ? input.predictionMethod === 'fallback'
      ? 'watch'
      : 'idle'
    : score >= 66
      ? 'ok'
      : 'watch';
  const textToneClassName = score == null
    ? 'text-gray-500'
    : score >= 82
      ? 'text-emerald-700'
      : score >= 66
        ? 'text-sky-700'
        : 'text-amber-700';

  return {
    score,
    averageR2,
    basisLabel,
    scoreLabel,
    display,
    gateStatus,
    gateTone,
    textToneClassName,
  };
}
