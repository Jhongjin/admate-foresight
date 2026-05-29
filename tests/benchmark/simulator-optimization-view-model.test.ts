import { describe, expect, it } from 'vitest';

import {
  buildForesightSimulatorOptimizationViewModel,
  type BuildForesightSimulatorOptimizationViewModelInput,
  type ForesightSimulatorOptimizationViewModel,
} from '../../lib/foresightSimulatorOptimizationViewModel';

function baseInput(
  overrides: Partial<BuildForesightSimulatorOptimizationViewModelInput> = {},
): BuildForesightSimulatorOptimizationViewModelInput {
  return {
    result: null,
    rangeData: [],
    scenarios: [],
    scenarioLoading: false,
    scenarioError: false,
    loading: false,
    isCalculated: false,
    monthlyBudget: 10_000_000,
    campaignBudget: 10_000_000,
    durationFactor: 1,
    totalReach: 0,
    confidenceScore: null,
    confidenceGateStatus: '미산정',
    confidenceGateTone: 'idle',
    ...overrides,
  };
}

function expandableInput(
  overrides: Partial<BuildForesightSimulatorOptimizationViewModelInput> = {},
): BuildForesightSimulatorOptimizationViewModelInput {
  return baseInput({
    result: {
      cpm: 5_000,
      reach: 100_000,
      frequency: 1.2,
      predictionMethod: 'regression',
    },
    rangeData: [
      { budget: 10_000_000, reach: 100_000 },
      { budget: 12_000_000, reach: 125_000 },
      { budget: 40_000_000, reach: 500_000 },
    ],
    scenarios: [
      {
        label: '성별 전체 확장',
        cpm: 4_800,
        reach: 130_000,
        vtr: 24,
        cpc: 520,
      },
    ],
    isCalculated: true,
    totalReach: 100_000,
    confidenceScore: 89,
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

function expectNoSourceOrSecretLeak(viewModel: ForesightSimulatorOptimizationViewModel) {
  const json = JSON.stringify(viewModel);
  const forbiddenKeyPatterns = [
    /raw/i,
    /source/i,
    /^account/i,
    /^campaign(?!Budget$)/i,
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
  expect(json).not.toMatch(/act_123|campaign-123|ad-123|meta-provider-id|secret-token|session-cookie|private-secret|source-row/);
}

function collectOperatorCopy(viewModel: ForesightSimulatorOptimizationViewModel): string {
  return JSON.stringify({
    title: viewModel.title,
    description: viewModel.description,
    expansion: viewModel.expansion
      ? {
          title: viewModel.expansion.title,
          description: viewModel.expansion.description,
          actionLead: viewModel.expansion.actionLead,
          actionValue: viewModel.expansion.actionValue,
          actionSuffix: viewModel.expansion.actionSuffix,
        }
      : null,
    scenario: {
      title: viewModel.scenario.title,
      description: viewModel.scenario.description,
      rows: viewModel.scenario.rows.map((row) => ({
        label: row.label,
        detail: row.detail,
        statusLabel: row.statusLabel,
      })),
    },
  });
}

function expectNoPromiseCopy(viewModel: ForesightSimulatorOptimizationViewModel) {
  expect(collectOperatorCopy(viewModel)).not.toMatch(/보장|확정 성과|promise|certainty/i);
}

describe('foresight simulator optimization guide view model', () => {
  it('shows positive budget and target guidance only for reviewable performance evidence', () => {
    const viewModel = buildForesightSimulatorOptimizationViewModel(expandableInput());

    expect(viewModel.shouldRender).toBe(true);
    expect(viewModel.evidenceReady).toBe(true);
    expect(viewModel.expansion).toMatchObject({
      tone: 'positive',
      title: '추가 확보 가능 성과',
      description: '현재 설정한 타겟 시장에 광고가 아직 충분히 노출되지 않아, 성과를 더 키울 수 있는 여유가 있습니다.',
      actionLead: '예산을 20% 늘리면 약',
      actionValue: '25,000명',
      actionSuffix: '의 고객에게 추가로 도달할 수 있습니다.',
      actionMuted: '(+₩2,000,000)',
      additionalReach: 25_000,
      additionalBudget: 2_000_000,
    });
    expect(viewModel.scenario.currentTarget).toEqual({
      title: '현재 타겟 기준',
      detail: 'CPM ₩5,000 · 도달 100,000명',
      badgeLabel: '기준값',
    });
    expect(viewModel.scenario.rows).toEqual([
      expect.objectContaining({
        label: '성별 전체 확장',
        detail: 'CPM ₩4,800 · 도달 130,000명',
        statusLabel: '효율 개선',
        tone: 'positive',
        cpmBetter: true,
        reachMore: true,
      }),
    ]);
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('keeps low-readiness expansion guidance evidence-limited even when range math has upside', () => {
    const viewModel = buildForesightSimulatorOptimizationViewModel(expandableInput({
      result: {
        cpm: 5_000,
        reach: 100_000,
        frequency: 1.2,
        predictionMethod: 'fallback',
      },
      confidenceScore: null,
      confidenceGateStatus: '근거 보강',
      confidenceGateTone: 'watch',
    }));

    expect(viewModel.shouldRender).toBe(true);
    expect(viewModel.evidenceReady).toBe(false);
    expect(viewModel.expansion).toMatchObject({
      tone: 'watch',
      title: '확장 판단 근거 확인',
      description: '도달 여지는 보이지만, 근거 보강 후 증액 여부를 확인하세요.',
      actionLead: '예산 20% 확대 기준 약',
      actionValue: '25,000명',
      actionSuffix: '의 추가 도달 가능성으로만 참고하세요.',
    });
    expect(viewModel.scenario.rows[0]).toMatchObject({
      statusLabel: '근거 확인',
      tone: 'watch',
    });
    expect(collectOperatorCopy(viewModel)).not.toContain('성과를 더 키울 수 있는 여유');
    expectNoPromiseCopy(viewModel);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('stays hidden for missing results or neutral performance evidence without inventing guidance', () => {
    const missingResult = buildForesightSimulatorOptimizationViewModel(baseInput({
      scenarioLoading: true,
      scenarioError: true,
    }));
    const neutralResult = buildForesightSimulatorOptimizationViewModel(baseInput({
      result: {
        cpm: 5_000,
        reach: 100_000,
        frequency: 1.8,
        predictionMethod: 'regression',
      },
      rangeData: [
        { budget: 10_000_000, reach: 100_000 },
        { budget: 20_000_000, reach: 180_000 },
      ],
      isCalculated: true,
      totalReach: 100_000,
      confidenceScore: 82,
      confidenceGateStatus: '검토 가능',
      confidenceGateTone: 'ok',
    }));

    expect(missingResult).toMatchObject({
      shouldRender: false,
      expansion: null,
    });
    expect(missingResult.scenario.visible).toBe(false);
    expect(neutralResult).toMatchObject({
      shouldRender: false,
      expansion: null,
    });
    expect(neutralResult.scenario.visible).toBe(false);
    expectNoPromiseCopy(missingResult);
    expectNoPromiseCopy(neutralResult);
    expectNoSourceOrSecretLeak(missingResult);
    expectNoSourceOrSecretLeak(neutralResult);
  });

  it('keeps loading and partial scenario errors as display state without leaking raw inputs', () => {
    const viewModel = buildForesightSimulatorOptimizationViewModel(expandableInput({
      scenarioLoading: false,
      scenarioError: true,
      rangeData: [
        {
          budget: 10_000_000,
          reach: 100_000,
          sourceRows: [{ id: 'source-row' }],
          accountId: 'act_123',
          campaignId: 'campaign-123',
          adId: 'ad-123',
          providerId: 'meta-provider-id',
          url: 'https://example.test',
          token: 'secret-token',
          cookie: 'session-cookie',
          secret: 'private-secret',
        } as never,
        { budget: 12_000_000, reach: 125_000 },
        { budget: 40_000_000, reach: 500_000 },
      ],
      scenarios: [
        {
          label: '연령 전체 확장',
          cpm: 5_200,
          reach: 90_000,
          vtr: 20,
          cpc: 540,
          sourceRows: [{ id: 'source-row' }],
          accountId: 'act_123',
          campaignId: 'campaign-123',
          providerId: 'meta-provider-id',
          token: 'secret-token',
          secret: 'private-secret',
        } as never,
      ],
    }));

    expect(viewModel.scenario.visible).toBe(true);
    expect(viewModel.scenario.showInlineError).toBe(true);
    expect(viewModel.scenario.showEmptyError).toBe(false);
    expect(viewModel.scenario.rows[0]).toMatchObject({
      label: '연령 전체 확장',
      statusLabel: '변화 없음',
      tone: 'neutral',
    });
    expectNoSourceOrSecretLeak(viewModel);
  });
});
