export const SIMULATOR_PRODUCT_SAFE_ERRORS = {
  filters: {
    title: '필터 정보를 불러오지 못했습니다',
    description: '조건 선택지는 현재 표시 가능한 기본 범위로 유지됩니다. 잠시 후 새로고침하거나 전체 기준으로 실행하세요.',
    ledgerLabel: '필터 기준선',
    nextAction: '필터 목록이 비어 있으면 전체 조건으로 시뮬레이션을 먼저 확인하세요.',
  },
  prediction: {
    title: '기본 예측을 불러오지 못했습니다',
    description: 'KPI 기준선이 확정되지 않아 새 결과를 표시하지 않습니다. 조건을 넓히거나 다시 실행하세요.',
    ledgerLabel: '기본 예측',
    nextAction: '예산, 목표, 타겟 조건을 확인한 뒤 시뮬레이션을 다시 실행하세요.',
  },
  range: {
    title: '예산 구간을 불러오지 못했습니다',
    description: '예산별 도달 곡선과 비교표는 계산된 구간이 있을 때만 표시됩니다.',
    ledgerLabel: '예산 구간',
    nextAction: '단일 KPI를 먼저 검토하고, 구간 판단은 재계산 후 확인하세요.',
  },
  scenario: {
    title: '타겟 확장 시나리오를 불러오지 못했습니다',
    description: '성별 또는 연령 확장 비교가 준비되지 않아 현재 타겟 기준만 유지합니다.',
    ledgerLabel: '타겟 확장',
    nextAction: '현재 타겟 기준을 먼저 검토하고 필요하면 조건을 단순화해 다시 확인하세요.',
  },
  mlBaseline: {
    title: '보조 기준선을 불러오지 못했습니다',
    description: '보조 기준선은 참고 지표입니다. 기본 예측과 예산 구간을 우선 검토하세요.',
    ledgerLabel: '보조 기준선',
    nextAction: '기본 예측 결과가 있으면 해당 기준으로 검토를 이어가세요.',
  },
} as const;

export type SimulatorProductSafeErrorKey = keyof typeof SIMULATOR_PRODUCT_SAFE_ERRORS;
export type SimulatorProductSafeLedgerTone = 'risk';

export interface SimulatorProductSafeErrorLedgerItem {
  label: string;
  value: string;
  detail: string;
  tone: SimulatorProductSafeLedgerTone;
}

export interface SimulatorProductSafeErrorPanelViewModel {
  title: string;
  description: string;
  ledger: SimulatorProductSafeErrorLedgerItem[];
  nextActions: string[];
}

export const SIMULATOR_PRODUCT_SAFE_ERROR_KEYS = Object.freeze(
  Object.keys(SIMULATOR_PRODUCT_SAFE_ERRORS) as SimulatorProductSafeErrorKey[],
);

const SAFE_DETAIL_BY_KEY: Record<SimulatorProductSafeErrorKey, readonly string[]> = {
  filters: ['조건 선택지 로드 실패'],
  prediction: ['이전 정상 결과 유지', '새 예측 결과 없음'],
  range: ['이전 예산 구간 유지', '예산 구간 없음'],
  scenario: ['일부 시나리오만 표시', '확장 비교 없음'],
  mlBaseline: ['기본 예측 우선 검토', '보조 기준선 없음'],
};

const FALLBACK_DETAIL_BY_KEY: Record<SimulatorProductSafeErrorKey, string> = {
  filters: '필터 기준 확인 필요',
  prediction: '예측 기준 확인 필요',
  range: '예산 구간 확인 필요',
  scenario: '확장 비교 확인 필요',
  mlBaseline: '보조 기준선 확인 필요',
};

function sanitizeSimulatorErrorDetail(
  key: SimulatorProductSafeErrorKey,
  detail: unknown,
): string {
  if (typeof detail !== 'string') return FALLBACK_DETAIL_BY_KEY[key];

  const trimmed = detail.trim();
  if (SAFE_DETAIL_BY_KEY[key].includes(trimmed)) return trimmed;

  return FALLBACK_DETAIL_BY_KEY[key];
}

export function buildSimulatorErrorPanel(
  key: SimulatorProductSafeErrorKey,
  detail: unknown,
): SimulatorProductSafeErrorPanelViewModel {
  const error = SIMULATOR_PRODUCT_SAFE_ERRORS[key];

  return {
    title: error.title,
    description: error.description,
    ledger: [
      {
        label: error.ledgerLabel,
        value: '확인 필요',
        detail: sanitizeSimulatorErrorDetail(key, detail),
        tone: 'risk',
      },
    ],
    nextActions: [error.nextAction],
  };
}
