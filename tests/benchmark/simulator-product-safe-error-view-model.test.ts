import { describe, expect, it } from 'vitest';

import {
  buildSimulatorErrorPanel,
  SIMULATOR_PRODUCT_SAFE_ERROR_KEYS,
  SIMULATOR_PRODUCT_SAFE_ERRORS,
  type SimulatorProductSafeErrorKey,
  type SimulatorProductSafeErrorPanelViewModel,
} from '../../lib/foresightSimulatorProductSafeErrorViewModel';

const EXPECTED_ERROR_COPY: Record<SimulatorProductSafeErrorKey, {
  title: string;
  description: string;
  ledgerLabel: string;
  nextAction: string;
  safeDetail: string;
  fallbackDetail: string;
}> = {
  filters: {
    title: '필터 정보를 불러오지 못했습니다',
    description: '조건 선택지는 현재 표시 가능한 기본 범위로 유지됩니다. 잠시 후 새로고침하거나 전체 기준으로 실행하세요.',
    ledgerLabel: '필터 기준선',
    nextAction: '필터 목록이 비어 있으면 전체 조건으로 시뮬레이션을 먼저 확인하세요.',
    safeDetail: '조건 선택지 로드 실패',
    fallbackDetail: '필터 기준 확인 필요',
  },
  prediction: {
    title: '기본 예측을 불러오지 못했습니다',
    description: 'KPI 기준선이 확정되지 않아 새 결과를 표시하지 않습니다. 조건을 넓히거나 다시 실행하세요.',
    ledgerLabel: '기본 예측',
    nextAction: '예산, 목표, 타겟 조건을 확인한 뒤 시뮬레이션을 다시 실행하세요.',
    safeDetail: '새 예측 결과 없음',
    fallbackDetail: '예측 기준 확인 필요',
  },
  range: {
    title: '예산 구간을 불러오지 못했습니다',
    description: '예산별 도달 곡선과 비교표는 계산된 구간이 있을 때만 표시됩니다.',
    ledgerLabel: '예산 구간',
    nextAction: '단일 KPI를 먼저 검토하고, 구간 판단은 재계산 후 확인하세요.',
    safeDetail: '이전 예산 구간 유지',
    fallbackDetail: '예산 구간 확인 필요',
  },
  scenario: {
    title: '타겟 확장 시나리오를 불러오지 못했습니다',
    description: '성별 또는 연령 확장 비교가 준비되지 않아 현재 타겟 기준만 유지합니다.',
    ledgerLabel: '타겟 확장',
    nextAction: '현재 타겟 기준을 먼저 검토하고 필요하면 조건을 단순화해 다시 확인하세요.',
    safeDetail: '일부 시나리오만 표시',
    fallbackDetail: '확장 비교 확인 필요',
  },
  mlBaseline: {
    title: '보조 기준선을 불러오지 못했습니다',
    description: '보조 기준선은 참고 지표입니다. 기본 예측과 예산 구간을 우선 검토하세요.',
    ledgerLabel: '보조 기준선',
    nextAction: '기본 예측 결과가 있으면 해당 기준으로 검토를 이어가세요.',
    safeDetail: '기본 예측 우선 검토',
    fallbackDetail: '보조 기준선 확인 필요',
  },
};

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

function expectOnlyDisplayFields(viewModel: SimulatorProductSafeErrorPanelViewModel) {
  expect(Object.keys(viewModel).sort()).toEqual([
    'description',
    'ledger',
    'nextActions',
    'title',
  ]);
  expect(viewModel.ledger).toHaveLength(1);
  expect(Object.keys(viewModel.ledger[0]).sort()).toEqual([
    'detail',
    'label',
    'tone',
    'value',
  ]);
}

function expectNoSourceOrSecretLeak(viewModel: SimulatorProductSafeErrorPanelViewModel) {
  const json = JSON.stringify(viewModel);
  const forbiddenKeyPatterns = [
    /raw/i,
    /source/i,
    /^id$/i,
    /^account/i,
    /^campaign/i,
    /^ad[_-]?id$/i,
    /^adset/i,
    /^provider/i,
    /url/i,
    /token/i,
    /cookie/i,
    /session/i,
    /secret/i,
  ];

  expect(collectKeys(viewModel).some((key) => (
    forbiddenKeyPatterns.some((pattern) => pattern.test(key))
  ))).toBe(false);
  expect(json).not.toMatch(
    /act_123|campaign-123|adset-123|ad-123|meta-provider-id|https:\/\/example\.test|secret-token|session-cookie|session-id|private-secret|source-row/,
  );
}

describe('foresight simulator product-safe error view model', () => {
  it('covers every current simulator error key with preserved Korean operator copy', () => {
    expect(SIMULATOR_PRODUCT_SAFE_ERROR_KEYS).toEqual([
      'filters',
      'prediction',
      'range',
      'scenario',
      'mlBaseline',
    ]);

    for (const key of SIMULATOR_PRODUCT_SAFE_ERROR_KEYS) {
      const expected = EXPECTED_ERROR_COPY[key];
      expect(SIMULATOR_PRODUCT_SAFE_ERRORS[key]).toMatchObject({
        title: expected.title,
        description: expected.description,
        ledgerLabel: expected.ledgerLabel,
        nextAction: expected.nextAction,
      });

      const viewModel = buildSimulatorErrorPanel(key, expected.safeDetail);

      expect(viewModel).toEqual({
        title: expected.title,
        description: expected.description,
        ledger: [
          {
            label: expected.ledgerLabel,
            value: '확인 필요',
            detail: expected.safeDetail,
            tone: 'risk',
          },
        ],
        nextActions: [expected.nextAction],
      });
      expectOnlyDisplayFields(viewModel);
      expectNoSourceOrSecretLeak(viewModel);
    }
  });

  it('preserves every current bounded detail phrase used by the simulator page', () => {
    expect(buildSimulatorErrorPanel('prediction', '이전 정상 결과 유지').ledger[0].detail)
      .toBe('이전 정상 결과 유지');
    expect(buildSimulatorErrorPanel('prediction', '새 예측 결과 없음').ledger[0].detail)
      .toBe('새 예측 결과 없음');
    expect(buildSimulatorErrorPanel('range', '예산 구간 없음').ledger[0].detail)
      .toBe('예산 구간 없음');
    expect(buildSimulatorErrorPanel('scenario', '확장 비교 없음').ledger[0].detail)
      .toBe('확장 비교 없음');
    expect(buildSimulatorErrorPanel('mlBaseline', '보조 기준선 없음').ledger[0].detail)
      .toBe('보조 기준선 없음');
  });

  it('replaces unknown, oversized, or unsafe detail with a bounded per-section fallback', () => {
    const unsafeDetails: Array<[SimulatorProductSafeErrorKey, unknown]> = [
      ['filters', 'act_123 campaign-123 https://example.test secret-token'.repeat(6)],
      ['prediction', 'provider=meta-provider-id token=secret-token cookie=session-cookie'],
      ['range', { rawRows: [{ source: 'source-row' }], url: 'https://example.test' }],
      ['scenario', ['campaign-123', 'ad-123', 'private-secret']],
      ['mlBaseline', undefined],
    ];

    for (const [key, unsafeDetail] of unsafeDetails) {
      const viewModel = buildSimulatorErrorPanel(key, unsafeDetail);

      expect(viewModel.ledger[0].detail).toBe(EXPECTED_ERROR_COPY[key].fallbackDetail);
      expect(viewModel.ledger[0].detail.length).toBeLessThanOrEqual(20);
      expectOnlyDisplayFields(viewModel);
      expectNoSourceOrSecretLeak(viewModel);
    }
  });
});
