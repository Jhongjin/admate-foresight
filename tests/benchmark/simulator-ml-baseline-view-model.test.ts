import { describe, expect, it } from 'vitest';

import {
  buildForesightSimulatorMlBaselineViewModel,
  normalizeForesightSimulatorMlBaselineResponse,
  type BuildForesightSimulatorMlBaselineViewModelInput,
  type ForesightSimulatorMlBaselineResult,
  type ForesightSimulatorMlBaselineViewModel,
} from '../../lib/foresightSimulatorMlBaselineViewModel';

function buildViewModel(
  overrides: Partial<BuildForesightSimulatorMlBaselineViewModelInput> = {},
): ForesightSimulatorMlBaselineViewModel {
  return buildForesightSimulatorMlBaselineViewModel({
    result: null,
    loading: false,
    errorMessage: '',
    isCalculated: true,
    hasPrimaryPrediction: true,
    ...overrides,
  });
}

function normalizeOrThrow(value: unknown): ForesightSimulatorMlBaselineResult {
  const result = normalizeForesightSimulatorMlBaselineResponse(value);
  if (!result) throw new Error('Expected normalized ML baseline result');
  return result;
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

function expectNoSourceOrSecretLeak(viewModel: ForesightSimulatorMlBaselineViewModel) {
  const json = JSON.stringify(viewModel);
  const forbiddenKeyPatterns = [
    /raw/i,
    /source/i,
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
    /act_123|campaign-123|adset-123|ad-123|meta-provider-id|https:\/\/example\.test|secret-token|session-cookie|private-secret|source-row/,
  );
}

describe('foresight simulator ML baseline view model', () => {
  it('renders a strong random forest result with bounded badge, summary, cards, and evidence', () => {
    const result = normalizeOrThrow({
      cpm: 5120,
      ctr: 1.735,
      cpc: 294,
      reach: 154321,
      r2_cpm: 0.82,
      r2_ctr: 0.74,
      cv_r2: 0.8124,
      model_type: 'random_forest',
      n_samples: 2480,
    });
    const viewModel = buildViewModel({ result });

    expect(viewModel.shouldRender).toBe(true);
    expect(viewModel.modelBadge).toEqual({
      label: '보수 기준선',
      className: 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700',
    });
    expect(viewModel.summaryLabel).toBe('기준 데이터 2,480건 · 설명력 0.812');
    expect(viewModel.metrics.cards).toEqual([
      {
        label: 'CPM',
        value: '₩5,120',
        evidence: {
          label: '근거 점수 0.820',
          indicator: '●',
          indicatorClassName: 'text-emerald-500',
          tone: 'strong',
        },
      },
      {
        label: 'CTR',
        value: '1.74%',
        evidence: {
          label: '근거 점수 0.740',
          indicator: '●',
          indicatorClassName: 'text-emerald-500',
          tone: 'strong',
        },
      },
      { label: 'CPC', value: '₩294', evidence: null },
      { label: '예상 도달', value: '154,321명', evidence: null },
    ]);
    expect(viewModel.loading.visible).toBe(false);
    expect(viewModel.error.visible).toBe(false);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('keeps a known linear regression result as a trend baseline without inventing strength', () => {
    const result = normalizeOrThrow({
      cpm: '4300.4',
      ctr: '0.61',
      cpc: '705.2',
      reach: '88000',
      r2_cpm: 0.58,
      r2_ctr: 0.49,
      cv_r2: 0.5129,
      model_type: 'linear_regression',
      n_samples: '640',
    });
    const viewModel = buildViewModel({ result });

    expect(viewModel.modelBadge).toEqual({
      label: '추세 기준선',
      className: 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700',
    });
    expect(viewModel.summaryLabel).toBe('기준 데이터 640건 · 설명력 0.513');
    expect(viewModel.metrics.cards[0]).toMatchObject({
      label: 'CPM',
      value: '₩4,300',
      evidence: {
        label: '근거 점수 0.580',
        indicator: '◐',
        indicatorClassName: 'text-amber-500',
        tone: 'watch',
      },
    });
    expect(viewModel.metrics.cards[1]).toMatchObject({
      label: 'CTR',
      value: '0.61%',
      evidence: {
        label: '근거 점수 0.490',
        indicator: '○',
        indicatorClassName: 'text-red-400',
        tone: 'low',
      },
    });
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('handles unknown and malformed model responses without falling back to trend copy or crashing formatters', () => {
    const result = normalizeOrThrow({
      cpm: 'not-a-number',
      ctr: null,
      cpc: Number.POSITIVE_INFINITY,
      reach: '12345',
      r2_cpm: 'bad-score',
      r2_ctr: 0.42,
      cv_r2: 'NaN',
      model_type: 'secret-token-model',
      n_samples: 'unknown',
      sourceRows: [{ id: 'source-row' }],
      accountId: 'act_123',
      campaignId: 'campaign-123',
      adsetId: 'adset-123',
      adId: 'ad-123',
      providerId: 'meta-provider-id',
      url: 'https://example.test',
      token: 'secret-token',
      cookie: 'session-cookie',
      secret: 'private-secret',
    });
    const viewModel = buildViewModel({ result });

    expect(viewModel.modelBadge).toEqual({
      label: '모델 확인 필요',
      className: 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700',
    });
    expect(JSON.stringify(viewModel)).not.toContain('추세 기준선');
    expect(viewModel.summaryLabel).toBeNull();
    expect(viewModel.metrics.cards).toEqual([
      { label: 'CPM', value: '—', evidence: null },
      {
        label: 'CTR',
        value: '—',
        evidence: {
          label: '근거 점수 0.420',
          indicator: '○',
          indicatorClassName: 'text-red-400',
          tone: 'low',
        },
      },
      { label: 'CPC', value: '—', evidence: null },
      { label: '예상 도달', value: '12,345명', evidence: null },
    ]);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('keeps loading, error, and no-result display decisions deterministic', () => {
    const loading = buildViewModel({
      loading: true,
      isCalculated: true,
      hasPrimaryPrediction: false,
    });
    const errorWithPrimaryPrediction = buildViewModel({
      errorMessage: '보조 기준선을 불러오지 못했습니다',
      hasPrimaryPrediction: true,
    });
    const errorWithoutPrimaryPrediction = buildViewModel({
      errorMessage: '보조 기준선을 불러오지 못했습니다',
      hasPrimaryPrediction: false,
    });
    const noResult = buildViewModel({
      result: null,
      loading: false,
      errorMessage: '',
      isCalculated: true,
    });
    const beforeSimulation = buildViewModel({
      result: normalizeOrThrow({ reach: 1000 }),
      isCalculated: false,
    });

    expect(loading).toMatchObject({
      shouldRender: true,
      loading: {
        visible: true,
        label: '보조 기준선을 계산하고 있습니다...',
      },
      metrics: {
        visible: false,
        cards: [],
      },
      footer: {
        visible: false,
      },
    });
    expect(errorWithPrimaryPrediction).toMatchObject({
      shouldRender: true,
      error: {
        visible: true,
        detail: '기본 예측 우선 검토',
      },
      metrics: {
        visible: false,
        cards: [],
      },
      footer: {
        visible: true,
      },
    });
    expect(errorWithoutPrimaryPrediction.error.detail).toBe('보조 기준선 없음');
    expect(noResult.shouldRender).toBe(false);
    expect(beforeSimulation.shouldRender).toBe(false);
    expectNoSourceOrSecretLeak(loading);
    expectNoSourceOrSecretLeak(errorWithPrimaryPrediction);
    expectNoSourceOrSecretLeak(noResult);
  });

  it('rejects fully malformed non-aggregate responses instead of building raw display output', () => {
    expect(normalizeForesightSimulatorMlBaselineResponse(null)).toBeNull();
    expect(normalizeForesightSimulatorMlBaselineResponse({
      cpm: 'bad',
      ctr: undefined,
      cpc: -10,
      reach: Number.NaN,
      model_type: 'random_forest',
      token: 'secret-token',
    })).toBeNull();
  });
});
