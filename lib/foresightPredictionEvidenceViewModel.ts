export type ForesightPredictionMethod = 'regression' | 'weighted_avg' | 'fallback';
export type ForesightPredictionEvidenceTone = 'ok' | 'watch' | 'idle';
export type ForesightPredictionEvidenceLedgerKey =
  | 'basis_method'
  | 'matched_data_size'
  | 'model_quality'
  | 'benchmark_market_match'
  | 'sharing_guardrail';

export interface ForesightPredictionEvidenceLedgerRow {
  key: ForesightPredictionEvidenceLedgerKey;
  status: '확인됨' | '주의' | '대기';
  tone: ForesightPredictionEvidenceTone;
  title: string;
  summary: string;
}

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
  ledgerRows: ForesightPredictionEvidenceLedgerRow[];
}

function averageFiniteValues(values: Array<number | undefined>): number | null {
  const finiteValues = values.filter((value): value is number => (
    typeof value === 'number' && Number.isFinite(value)
  ));

  if (finiteValues.length === 0) return null;

  return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
}

function buildForesightPredictionEvidenceLedgerRows(
  input: ForesightPredictionEvidenceInput,
  score: number | null,
  averageR2: number | null,
  gateStatus: ForesightPredictionEvidenceViewModel['gateStatus'],
  gateTone: ForesightPredictionEvidenceTone,
): ForesightPredictionEvidenceLedgerRow[] {
  if (input.loading) {
    return [
      {
        key: 'basis_method',
        status: '대기',
        tone: 'idle',
        title: '산정 방식',
        summary: '예측값과 근거를 계산하고 있습니다.',
      },
      {
        key: 'matched_data_size',
        status: '대기',
        tone: 'idle',
        title: '매칭 데이터',
        summary: '계산 완료 후 매칭 규모를 표시합니다.',
      },
      {
        key: 'model_quality',
        status: '대기',
        tone: 'idle',
        title: '예측 상태',
        summary: '설명력 지표를 확인하는 중입니다.',
      },
      {
        key: 'benchmark_market_match',
        status: '대기',
        tone: 'idle',
        title: '비교 기준',
        summary: '선택 조건에 맞는 기준을 준비하고 있습니다.',
      },
      {
        key: 'sharing_guardrail',
        status: '대기',
        tone: 'idle',
        title: '공유 기준',
        summary: '결과 확정 전에는 공유 판단을 보류합니다.',
      },
    ];
  }

  if (!input.isCalculated || !input.predictionMethod) {
    return [
      {
        key: 'basis_method',
        status: '대기',
        tone: 'idle',
        title: '산정 방식',
        summary: '시뮬레이션 실행 후 예측 근거를 표시합니다.',
      },
      {
        key: 'matched_data_size',
        status: '대기',
        tone: 'idle',
        title: '매칭 데이터',
        summary: '아직 비교할 매칭 규모가 없습니다.',
      },
      {
        key: 'model_quality',
        status: '대기',
        tone: 'idle',
        title: '예측 상태',
        summary: '실행 전에는 설명력 점수를 만들지 않습니다.',
      },
      {
        key: 'benchmark_market_match',
        status: '대기',
        tone: 'idle',
        title: '비교 기준',
        summary: '업종 선택 여부는 실행 후 근거에 반영됩니다.',
      },
      {
        key: 'sharing_guardrail',
        status: '대기',
        tone: 'idle',
        title: '공유 기준',
        summary: '임의 예측값 없이 실행 결과만 공유합니다.',
      },
    ];
  }

  const methodRow: ForesightPredictionEvidenceLedgerRow =
    input.predictionMethod === 'regression'
      ? {
          key: 'basis_method',
          status: score != null && score >= 66 ? '확인됨' : '주의',
          tone: score != null && score >= 66 ? 'ok' : 'watch',
          title: '산정 방식',
          summary: '설명력 점수와 매칭 규모를 함께 반영했습니다.',
        }
      : input.predictionMethod === 'weighted_avg'
        ? {
            key: 'basis_method',
            status: '주의',
            tone: 'watch',
            title: '산정 방식',
            summary: '근거 점수 대신 최근 데이터 평균으로 표시합니다.',
          }
        : {
            key: 'basis_method',
            status: '주의',
            tone: 'watch',
            title: '산정 방식',
            summary: '충분한 예측 근거가 없어 보수 기준을 적용합니다.',
          };

  const matchedRow: ForesightPredictionEvidenceLedgerRow =
    input.matchedCount >= 50
      ? {
          key: 'matched_data_size',
          status: '확인됨',
          tone: 'ok',
          title: '매칭 데이터',
          summary: `최근 조건과 맞는 데이터 ${input.matchedCount.toLocaleString()}건을 사용했습니다.`,
        }
      : input.matchedCount >= 20
        ? {
            key: 'matched_data_size',
            status: '주의',
            tone: 'watch',
            title: '매칭 데이터',
            summary: `매칭 ${input.matchedCount.toLocaleString()}건으로 보수 검토가 필요합니다.`,
          }
        : {
            key: 'matched_data_size',
            status: '주의',
            tone: 'watch',
            title: '매칭 데이터',
            summary: input.matchedCount > 0
              ? `매칭 ${input.matchedCount.toLocaleString()}건이라 조건 확대를 권장합니다.`
              : '매칭 데이터가 없어 보수 기준으로만 봅니다.',
          };

  const modelRow: ForesightPredictionEvidenceLedgerRow =
    input.predictionMethod === 'regression'
      ? averageR2 == null
        ? {
            key: 'model_quality',
            status: '주의',
            tone: 'watch',
            title: '예측 상태',
            summary: '설명력 지표가 없어 근거 점수를 만들지 않습니다.',
          }
        : {
            key: 'model_quality',
            status: score != null && score >= 66 ? '확인됨' : '주의',
            tone: score != null && score >= 66 ? 'ok' : 'watch',
            title: '예측 상태',
            summary: score != null && score >= 66
              ? '설명력 지표가 검토 가능한 범위입니다.'
              : '설명력 지표가 낮아 근거 보강이 필요합니다.',
          }
      : {
          key: 'model_quality',
          status: '주의',
          tone: 'watch',
          title: '예측 상태',
          summary: input.predictionMethod === 'weighted_avg'
            ? '근거 점수 없이 최근 데이터 기준으로 표시합니다.'
            : '근거 점수 없이 보수 기준으로 표시합니다.',
        };

  const benchmarkRow: ForesightPredictionEvidenceLedgerRow = input.marketSelected
    ? {
        key: 'benchmark_market_match',
        status: '확인됨',
        tone: 'ok',
        title: '비교 기준',
        summary: '선택 업종 기준과 비교해 해석합니다.',
      }
    : {
        key: 'benchmark_market_match',
        status: '주의',
        tone: 'watch',
        title: '비교 기준',
        summary: '업종 기준이 없어 전체 기준으로만 표시합니다.',
      };

  const sharingRow: ForesightPredictionEvidenceLedgerRow = gateTone === 'ok'
    ? {
        key: 'sharing_guardrail',
        status: '확인됨',
        tone: 'ok',
        title: '공유 기준',
        summary: '예상 범위와 함께 검토용으로 공유할 수 있습니다.',
      }
    : {
        key: 'sharing_guardrail',
        status: '주의',
        tone: 'watch',
        title: '공유 기준',
        summary: gateStatus === '최근 데이터 기준'
          ? '확정 성과가 아닌 최근 데이터 기준으로만 공유합니다.'
          : '공유 전 근거 보강 사유를 함께 남깁니다.',
      };

  return [
    methodRow,
    matchedRow,
    modelRow,
    benchmarkRow,
    sharingRow,
  ];
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
  const ledgerRows = buildForesightPredictionEvidenceLedgerRows(
    input,
    score,
    averageR2,
    gateStatus,
    gateTone,
  );

  return {
    score,
    averageR2,
    basisLabel,
    scoreLabel,
    display,
    gateStatus,
    gateTone,
    textToneClassName,
    ledgerRows,
  };
}
