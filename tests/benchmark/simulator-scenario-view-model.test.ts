import { describe, expect, it } from 'vitest';

import {
  buildForesightSimulatorScenarioViewModel,
  type BuildForesightSimulatorScenarioViewModelInput,
  type ForesightSimulatorScenarioViewModel,
} from '../../lib/foresightSimulatorScenarioViewModel';

function baseInput(
  overrides: Partial<BuildForesightSimulatorScenarioViewModelInput> = {},
): BuildForesightSimulatorScenarioViewModelInput {
  return {
    result: null,
    scenarios: [],
    scenarioLoading: false,
    scenarioError: false,
    loading: false,
    isCalculated: false,
    durationFactor: 1,
    totalReach: 0,
    confidenceScore: null,
    confidenceGateStatus: '미산정',
    confidenceGateTone: 'idle',
    ...overrides,
  };
}

function calculatedInput(
  overrides: Partial<BuildForesightSimulatorScenarioViewModelInput> = {},
): BuildForesightSimulatorScenarioViewModelInput {
  return baseInput({
    result: {
      cpm: 5_000,
      reach: 100_000,
    },
    isCalculated: true,
    durationFactor: 1,
    totalReach: 100_000,
    confidenceScore: 88,
    confidenceGateStatus: '검토 가능',
    confidenceGateTone: 'ok',
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

function expectNoSourceOrSecretLeak(viewModel: ForesightSimulatorScenarioViewModel) {
  const json = JSON.stringify(viewModel);
  const forbiddenKeyPatterns = [
    /raw/i,
    /source/i,
    /^id$/i,
    /^account/i,
    /^campaign/i,
    /^ad[_-]?id$/i,
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
  expect(json).not.toMatch(/act_123|campaign-123|ad-123|meta-provider-id|secret-token|session-cookie|private-secret|source-row|https:\/\/example\.test/);
}

describe('foresight simulator scenario view model', () => {
  it('keeps pre-run state inert', () => {
    const viewModel = buildForesightSimulatorScenarioViewModel(baseInput());

    expect(viewModel).toMatchObject({
      visible: false,
      title: '타겟 범위 확장 시 효율 변화',
      description: '성별 또는 연령 타겟을 전체로 넓혔을 때 예상 성과를 비교합니다',
      loading: false,
      loadingLabel: '시나리오 계산 중...',
      showEmptyError: false,
      showInlineError: false,
      currentTarget: null,
      rows: [],
    });
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('shows the deterministic loading state with current target context', () => {
    const viewModel = buildForesightSimulatorScenarioViewModel(calculatedInput({
      scenarioLoading: true,
    }));

    expect(viewModel.visible).toBe(true);
    expect(viewModel.loading).toBe(true);
    expect(viewModel.loadingLabel).toBe('시나리오 계산 중...');
    expect(viewModel.currentTarget).toEqual({
      title: '현재 타겟 기준',
      detail: 'CPM ₩5,000 · 도달 100,000명',
      badgeLabel: '기준값',
    });
    expect(viewModel.rows).toEqual([]);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('distinguishes a scenario error with no rows as an empty error', () => {
    const viewModel = buildForesightSimulatorScenarioViewModel(calculatedInput({
      scenarioError: true,
    }));

    expect(viewModel.visible).toBe(true);
    expect(viewModel.showEmptyError).toBe(true);
    expect(viewModel.showInlineError).toBe(false);
    expect(viewModel.rows).toEqual([]);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('keeps partial scenario errors inline when rows are available', () => {
    const viewModel = buildForesightSimulatorScenarioViewModel(calculatedInput({
      scenarioError: true,
      scenarios: [
        {
          label: '연령 전체 확장',
          cpm: 5_200,
          reach: 90_000,
          vtr: 20,
          cpc: 540,
        },
      ],
    }));

    expect(viewModel.visible).toBe(true);
    expect(viewModel.showEmptyError).toBe(false);
    expect(viewModel.showInlineError).toBe(true);
    expect(viewModel.rows).toEqual([
      expect.objectContaining({
        label: '연령 전체 확장',
        detail: 'CPM ₩5,200 · 도달 90,000명',
        statusLabel: '변화 없음',
        tone: 'neutral',
        cpmBetter: false,
        reachMore: false,
      }),
    ]);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('marks positive CPM or reach deltas as efficiency improvements for reviewable evidence', () => {
    const viewModel = buildForesightSimulatorScenarioViewModel(calculatedInput({
      durationFactor: 2,
      totalReach: 200_000,
      scenarios: [
        {
          label: '성별 전체 확장',
          cpm: 4_800,
          reach: 95_000,
          vtr: 24,
          cpc: 520,
        },
        {
          label: '연령 전체 확장',
          cpm: 5_100,
          reach: 105_000,
          vtr: 21,
          cpc: 530,
        },
      ],
    }));

    expect(viewModel.rows).toEqual([
      expect.objectContaining({
        label: '성별 전체 확장',
        detail: 'CPM ₩4,800 · 도달 190,000명',
        statusLabel: '효율 개선',
        tone: 'positive',
        cpmBetter: true,
        reachMore: false,
        shellClassName: 'bg-emerald-50 border-emerald-100',
        statusClassName: 'bg-emerald-600 text-white border-emerald-600',
      }),
      expect.objectContaining({
        label: '연령 전체 확장',
        detail: 'CPM ₩5,100 · 도달 210,000명',
        statusLabel: '효율 개선',
        tone: 'positive',
        cpmBetter: false,
        reachMore: true,
      }),
    ]);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('keeps negative deltas neutral and low-readiness positive deltas as evidence checks', () => {
    const neutralViewModel = buildForesightSimulatorScenarioViewModel(calculatedInput({
      scenarios: [
        {
          label: '성별 전체 확장',
          cpm: 5_200,
          reach: 90_000,
          vtr: 18,
          cpc: 570,
        },
      ],
    }));
    const watchViewModel = buildForesightSimulatorScenarioViewModel(calculatedInput({
      confidenceScore: null,
      confidenceGateStatus: '근거 보강',
      confidenceGateTone: 'watch',
      scenarios: [
        {
          label: '연령 전체 확장',
          cpm: 4_900,
          reach: 120_000,
          vtr: 23,
          cpc: 510,
        },
      ],
    }));

    expect(neutralViewModel.rows[0]).toMatchObject({
      statusLabel: '변화 없음',
      tone: 'neutral',
      cpmBetter: false,
      reachMore: false,
      shellClassName: 'bg-white border-gray-100',
      statusClassName: 'bg-gray-100 text-gray-500 border-gray-200',
    });
    expect(watchViewModel.rows[0]).toMatchObject({
      statusLabel: '근거 확인',
      tone: 'watch',
      cpmBetter: true,
      reachMore: true,
      shellClassName: 'bg-amber-50 border-amber-100',
      statusClassName: 'bg-amber-100 text-amber-800 border-amber-200',
    });
    expectNoSourceOrSecretLeak(neutralViewModel);
    expectNoSourceOrSecretLeak(watchViewModel);
  });

  it('does not leak sensitive source fields or unsafe labels into output', () => {
    const viewModel = buildForesightSimulatorScenarioViewModel(calculatedInput({
      scenarios: [
        {
          label: 'act_123 campaign-123 https://example.test secret-token',
          cpm: 4_700,
          reach: 130_000,
          vtr: 24,
          cpc: 510,
          sourceRows: [{ id: 'source-row' }],
          id: 'ad-123',
          accountId: 'act_123',
          campaignId: 'campaign-123',
          providerId: 'meta-provider-id',
          url: 'https://example.test',
          token: 'secret-token',
          cookie: 'session-cookie',
          secret: 'private-secret',
        } as never,
      ],
    }));

    expect(viewModel.rows[0]).toMatchObject({
      label: '타겟 확장 시나리오',
      statusLabel: '효율 개선',
      tone: 'positive',
    });
    expectNoSourceOrSecretLeak(viewModel);
  });
});
