import { describe, expect, it } from 'vitest';

import {
  buildForesightSimulatorKpiBenchmarkViewModel,
  type BuildForesightSimulatorKpiBenchmarkViewModelInput,
  type ForesightSimulatorKpiBenchmarkViewModel,
} from '../../lib/foresightSimulatorKpiBenchmarkViewModel';

function baseInput(
  overrides: Partial<BuildForesightSimulatorKpiBenchmarkViewModelInput> = {},
): BuildForesightSimulatorKpiBenchmarkViewModelInput {
  return {
    result: null,
    loading: false,
    isCalculated: false,
    campaignDays: 7,
    totalReach: 0,
    applySeasonBoost: false,
    peakCpmMultiplier: 1.3,
    chartDataLength: 0,
    confidenceDisplay: '실행 전',
    marketSampleCount: 0,
    matchedSampleCount: 0,
    objectiveLabel: '전체',
    genderLabel: '전체',
    ageLabel: '전체',
    ...overrides,
  };
}

function strongMarketInput(
  overrides: Partial<BuildForesightSimulatorKpiBenchmarkViewModelInput> = {},
): BuildForesightSimulatorKpiBenchmarkViewModelInput {
  return baseInput({
    result: {
      cpm: 4_000,
      cpc: 520,
      cpcLink: 780,
      cpv: 24,
      vtr: 35.25,
      matchedCount: 180,
      marketAvg: {
        cpm: 5_000,
        cpc: 620,
        cpcLink: 910,
        cpv: 30,
        vtr: 31.1,
        count: 240,
        cpmDiff: -20,
        cpcDiff: -16.1,
        cpcLinkDiff: -14.3,
        cpvDiff: -20,
        vtrDiff: 13.3,
        industrySelected: true,
      },
    },
    isCalculated: true,
    campaignDays: 10,
    totalReach: 100_000,
    chartDataLength: 4,
    confidenceDisplay: '89% · 근거 강함',
    marketSampleCount: 240,
    matchedSampleCount: 180,
    objectiveLabel: '인지도',
    genderLabel: '여성',
    ageLabel: '25-34',
    ...overrides,
  });
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

function expectNoSourceOrSecretLeak(viewModel: ForesightSimulatorKpiBenchmarkViewModel) {
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

function expectNoPromiseCopy(viewModel: ForesightSimulatorKpiBenchmarkViewModel) {
  expect(JSON.stringify(viewModel)).not.toMatch(/성과 보장|보장|promise|certainty/i);
}

describe('foresight simulator KPI benchmark card view model', () => {
  it('keeps pre-result KPI cards inert with bounded benchmark output', () => {
    const viewModel = buildForesightSimulatorKpiBenchmarkViewModel(baseInput());

    expect(viewModel.cards).toHaveLength(6);
    expect(viewModel.cards[0]).toMatchObject({
      title: '예상 도달 (7일)',
      value: '—',
      icon: 'Reach',
      marketLabel: undefined,
      diff: null,
      lowerBetter: false,
      benchmarkStatusLabel: '시뮬레이션 후 기준 확인',
      benchmarkEvidenceLabel: '실행 전',
      benchmarkSyntheticContextLabel: '최근 6개월 · KRW Net',
      benchmarkVisibleCopy: ['예산 구간: 계산 대기'],
      benchmarkBasisLines: [
        '데이터: 매칭 0건',
        '필터: 전체 · 전체 · 전체',
        '용도: 확정 성과가 아닌 매체 집행 확인',
      ],
      benchmarkBlockedOutputs: ['업종 특화 평균처럼 표시하지 않음'],
    });
    expect(viewModel.cards.slice(1).every((card) => card.benchmarkBasisLines.length === 0)).toBe(true);
    expect(viewModel.cards.slice(1).every((card) => card.benchmarkBlockedOutputs.length === 0)).toBe(true);
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('builds strong market benchmark labels, values, deltas, and basis copy', () => {
    const viewModel = buildForesightSimulatorKpiBenchmarkViewModel(strongMarketInput());

    expect(viewModel.cards.map((card) => card.title)).toEqual([
      '예상 도달 (10일)',
      '예상 CPM',
      'CPC(전체)',
      'CPC(링크)',
      '동영상 3초 조회당 비용',
      'VTR(3s)',
    ]);
    expect(viewModel.cards[0]).toMatchObject({
      value: '100,000 명',
      marketLabel: '80,000 명',
      diff: 25,
      benchmarkStatusLabel: '업종 매칭 벤치마크',
      benchmarkEvidenceLabel: '89% · 근거 강함',
      benchmarkVisibleCopy: ['예산 구간: 예산 곡선과 같은 실행 결과'],
      benchmarkBasisLines: [
        '데이터: 240건 / 매칭 180건',
        '필터: 인지도 · 여성 · 25-34',
        '용도: 확정 성과가 아닌 매체 집행 확인',
      ],
      benchmarkBlockedOutputs: [],
    });
    expect(viewModel.cards[1]).toMatchObject({
      value: '₩4,000',
      marketLabel: '₩5,000',
      diff: -20,
      lowerBetter: true,
    });
    expect(viewModel.cards[5]).toMatchObject({
      value: '35.25%',
      marketLabel: '31.10%',
      diff: 13.3,
      lowerBetter: false,
    });
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('falls back to aggregate benchmark display when no market is selected', () => {
    const viewModel = buildForesightSimulatorKpiBenchmarkViewModel(baseInput({
      result: {
        cpm: 7_000,
        cpc: 0,
        cpcLink: 850,
        cpv: 0,
        vtr: 0,
        matchedCount: 8,
        marketAvg: {
          cpm: 6_500,
          cpc: 540,
          cpcLink: 800,
          cpv: 26,
          vtr: 28,
          count: 120,
          cpmDiff: 7.7,
          cpcDiff: 0,
          cpcLinkDiff: 6.3,
          cpvDiff: 0,
          vtrDiff: 0,
          industrySelected: false,
        },
      },
      isCalculated: true,
      totalReach: 45_000,
      confidenceDisplay: '근거 보강',
      matchedSampleCount: 8,
      objectiveLabel: '전체',
      genderLabel: '전체',
      ageLabel: '전체',
    }));

    expect(viewModel.cards[0]).toMatchObject({
      value: '45,000 명',
      marketLabel: '-',
      diff: null,
      benchmarkStatusLabel: '전체 기준 벤치마크',
      benchmarkBasisLines: [
        '데이터: 매칭 8건',
        '필터: 전체 · 전체 · 전체',
        '용도: 확정 성과가 아닌 매체 집행 확인',
      ],
      benchmarkBlockedOutputs: ['업종 특화 평균처럼 표시하지 않음'],
    });
    expect(viewModel.cards[1]).toMatchObject({
      value: '₩7,000',
      marketLabel: '-',
      diff: null,
    });
    expect(viewModel.cards[2].value).toBe('—');
    expect(viewModel.cards[4].value).toBe('—');
    expect(viewModel.cards[5].value).toBe('—');
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('keeps raw source, identifier, URL, and secret-like inputs out of the display model', () => {
    const viewModel = buildForesightSimulatorKpiBenchmarkViewModel(strongMarketInput({
      result: {
        ...strongMarketInput().result!,
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
      } as never,
      objectiveLabel: 'campaign-123',
      genderLabel: 'https://example.test?access_token=secret-token',
      ageLabel: 'session-cookie',
      confidenceDisplay: 'secret-token',
    }));

    expect(viewModel.cards[0].benchmarkBasisLines).toContain('필터: 확인 필요 · 확인 필요 · 확인 필요');
    expect(viewModel.cards[0].benchmarkEvidenceLabel).toBe('근거 확인 전');
    expectNoSourceOrSecretLeak(viewModel);
  });
});
