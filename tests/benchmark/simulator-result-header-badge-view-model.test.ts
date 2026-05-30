import { describe, expect, it } from 'vitest';

import {
  buildForesightSimulatorResultHeaderBadgeViewModel,
  type BuildForesightSimulatorResultHeaderBadgeViewModelInput,
  type ForesightSimulatorResultHeaderBadgeViewModel,
} from '../../lib/foresightSimulatorResultHeaderBadgeViewModel';

function baseInput(
  overrides: Partial<BuildForesightSimulatorResultHeaderBadgeViewModelInput> = {},
): BuildForesightSimulatorResultHeaderBadgeViewModelInput {
  return {
    hasResult: false,
    loading: false,
    isCalculated: false,
    marketSelected: false,
    matchedSampleCount: 0,
    ...overrides,
  };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (!value || typeof value !== 'object') return [];

  return Object.values(value).flatMap(collectStringValues);
}

function expectNoSourceOrSecretLeak(viewModel: ForesightSimulatorResultHeaderBadgeViewModel) {
  const json = JSON.stringify(viewModel);
  const forbiddenKeyPatterns = [
    /raw/i,
    /source/i,
    /^provider/i,
    /^account/i,
    /^campaign/i,
    /^ad$/i,
    /^ad[_-]?id$/i,
    /^adset/i,
    /url/i,
    /token/i,
    /cookie/i,
    /session/i,
    /secret/i,
    /credential/i,
  ];

  expect(collectKeys(viewModel).some((key) => (
    forbiddenKeyPatterns.some((pattern) => pattern.test(key))
  ))).toBe(false);
  expect(json).not.toMatch(
    /raw-source-row|source-row|act_123|campaign-123|adset-123|ad-123|meta-provider-id|https:\/\/example\.test|secret-token|session-cookie|private-secret|credential-value/,
  );
}

function expectNoPromiseCopy(viewModel: ForesightSimulatorResultHeaderBadgeViewModel) {
  expect(collectStringValues(viewModel).join(' ')).not.toMatch(/성과 보장|보장|확신|certainty|promise/i);
}

function expectAllowedSampleStatusDetail(viewModel: ForesightSimulatorResultHeaderBadgeViewModel) {
  expect(viewModel.sampleStatus.detail).toMatch(
    /^(계산 중|실행 전|전체 기준|매칭 없음|매칭 [0-9,]+건)$/,
  );
}

describe('foresight simulator result header badge view model', () => {
  it('keeps the pre-run header and evidence badges inert', () => {
    const viewModel = buildForesightSimulatorResultHeaderBadgeViewModel(baseInput());

    expect(viewModel).toMatchObject({
      readinessTone: 'border-gray-200 bg-gray-50 text-gray-600',
      readinessLabel: '설정 대기',
      confidenceScore: null,
      evidenceBasisLabel: '실행 전',
      confidenceDisplay: '실행 전',
      confidenceGateStatus: '미산정',
      confidenceGateTone: 'idle',
      confidenceTone: 'text-gray-500',
      sampleStatus: {
        label: '주의',
        detail: '실행 전',
        tone: 'border-amber-200 bg-amber-50 text-amber-800',
      },
    });
    expect(viewModel.sampleStatusLegend).toEqual([
      { label: '데이터 충분', detail: '업종 매칭과 기준 점수가 안정적일 때 표시합니다.' },
      { label: '주의', detail: '전체 기준 또는 일부 근거만으로 검토할 때 표시합니다.' },
      { label: '확인 필요', detail: '데이터가 적거나 보강이 필요할 때 표시합니다.' },
    ]);
    expectAllowedSampleStatusDetail(viewModel);
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('keeps loading copy deterministic without inventing evidence', () => {
    const viewModel = buildForesightSimulatorResultHeaderBadgeViewModel(baseInput({
      loading: true,
    }));

    expect(viewModel).toMatchObject({
      readinessTone: 'border-sky-200 bg-sky-50 text-sky-700',
      readinessLabel: '계산 중',
      confidenceScore: null,
      evidenceBasisLabel: '실행 전',
      confidenceDisplay: '계산 중',
      confidenceGateStatus: '미산정',
      confidenceGateTone: 'idle',
      sampleStatus: {
        label: '주의',
        detail: '계산 중',
      },
    });
    expectAllowedSampleStatusDetail(viewModel);
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('keeps no-result after calculate in the waiting state', () => {
    const viewModel = buildForesightSimulatorResultHeaderBadgeViewModel(baseInput({
      isCalculated: true,
      marketSelected: true,
      matchedSampleCount: 12,
    }));

    expect(viewModel).toMatchObject({
      readinessTone: 'border-amber-200 bg-amber-50 text-amber-700',
      readinessLabel: '결과 대기',
      confidenceScore: null,
      confidenceDisplay: '실행 전',
      confidenceGateStatus: '미산정',
      sampleStatus: {
        label: '주의',
        detail: '실행 전',
      },
    });
    expectAllowedSampleStatusDetail(viewModel);
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('preserves strong market regression status and evidence display', () => {
    const viewModel = buildForesightSimulatorResultHeaderBadgeViewModel(baseInput({
      hasResult: true,
      isCalculated: true,
      marketSelected: true,
      matchedSampleCount: 200,
      predictionMethod: 'regression',
      r2Cpm: 0.92,
      r2Cpc: 0.88,
      r2Vtr: 0.9,
    }));

    expect(viewModel).toMatchObject({
      readinessTone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      readinessLabel: '예측 준비',
      confidenceScore: 89,
      evidenceBasisLabel: '근거 점수',
      confidenceDisplay: '89% · 근거 강함',
      confidenceGateStatus: '검토 가능',
      confidenceGateTone: 'ok',
      confidenceTone: 'text-emerald-700',
      sampleStatus: {
        label: '데이터 충분',
        detail: '매칭 200건',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      },
    });
    expectAllowedSampleStatusDetail(viewModel);
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('keeps fallback, low-sample, no-market output conservative', () => {
    const viewModel = buildForesightSimulatorResultHeaderBadgeViewModel(baseInput({
      hasResult: true,
      isCalculated: true,
      marketSelected: false,
      matchedSampleCount: 8,
      predictionMethod: 'fallback',
    }));

    expect(viewModel).toMatchObject({
      readinessLabel: '예측 준비',
      confidenceScore: null,
      evidenceBasisLabel: '근거 보강',
      confidenceDisplay: '근거 보강',
      confidenceGateStatus: '근거 보강',
      confidenceGateTone: 'watch',
      confidenceTone: 'text-gray-500',
      sampleStatus: {
        label: '부족',
        detail: '매칭 8건',
        tone: 'border-red-200 bg-red-50 text-red-700',
      },
    });
    expectAllowedSampleStatusDetail(viewModel);
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('does not copy raw, source, identifier, URL, or secret-like unsafe input fields', () => {
    const viewModel = buildForesightSimulatorResultHeaderBadgeViewModel({
      ...baseInput({
        hasResult: true,
        isCalculated: true,
        marketSelected: true,
        matchedSampleCount: 120,
        predictionMethod: 'weighted_avg',
      }),
      rawRows: [{ id: 'raw-source-row' }],
      sourceRows: [{ id: 'source-row' }],
      providerId: 'meta-provider-id',
      accountId: 'act_123',
      campaignId: 'campaign-123',
      adsetId: 'adset-123',
      adId: 'ad-123',
      url: 'https://example.test',
      token: 'secret-token',
      cookie: 'session-cookie',
      session: 'session-cookie',
      secret: 'private-secret',
      credential: 'credential-value',
    } as never);

    expect(viewModel).toMatchObject({
      confidenceScore: null,
      confidenceDisplay: '최근 데이터 기준',
      confidenceGateStatus: '최근 데이터 기준',
      sampleStatus: {
        label: '데이터 충분',
        detail: '매칭 120건',
      },
    });
    expectAllowedSampleStatusDetail(viewModel);
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });
});
