import { describe, expect, it } from 'vitest';

import type {
  ForecastRangeConfirmation,
  ForecastRangeConfirmationState,
} from '../../lib/forecastRangeConfirmation';
import {
  buildSimulatorRangeReviewCopy,
  buildSimulatorRangeViewModel,
  formatSimulatorBudget,
} from '../../lib/foresightRangeViewModel';

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

function buildConfirmation(
  state: ForecastRangeConfirmationState,
  overrides: Partial<ForecastRangeConfirmation> = {},
): ForecastRangeConfirmation {
  const acceptedForReview = state === 'accepted_for_operator_review';

  return {
    state,
    acceptedForReview,
    aggregateOnly: true,
    range: {
      pointCount: 3,
      currentBudget: 20_000_000,
      currentBudgetPresent: acceptedForReview,
      minBudget: 10_000_000,
      maxBudget: 30_000_000,
      budgets: [10_000_000, 20_000_000, 30_000_000],
      aggregateFields: ['budget', 'reach', 'cpm', 'cpc', 'dataSufficiency'],
      sourceRowsIncluded: false,
      rawRecordsIncluded: false,
    },
    sufficiency: {
      status: acceptedForReview ? 'sufficient' : 'insufficient',
      basis: 'exact_cohort',
      statuses: [acceptedForReview ? 'sufficient' : 'insufficient'],
      bases: ['exact_cohort'],
      minimumMatchedCount: 42,
      minimumRequired: 20,
      warningCodes: acceptedForReview ? [] : ['CHECK_RANGE_BASIS'],
      blockedByInsufficientData: state === 'blocked_by_sufficiency',
    },
    readiness: {
      operatorReviewReady: acceptedForReview,
      llmReady: false,
      persistenceReady: false,
      reportReady: false,
      exportReady: false,
      promotionReady: false,
      applyReady: false,
    },
    sideEffectSummary: {
      llmCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      pythonRuns: 0,
      metaCalls: 0,
      exportWrites: 0,
      promotionApplyCalls: 0,
    },
    terminology: {
      rangeLabel: 'Forecast range',
      reviewLabel: 'Operator review',
      basisLabel: 'Aggregate sufficiency',
      description: 'Aggregate review fixture.',
    },
    warningCodes: acceptedForReview ? [] : ['CHECK_RANGE_BASIS'],
    rejectionReasons: state === 'rejected_invalid_range' ? ['MALFORMED_FORECAST_RANGE_POINT'] : [],
    blockedActions: [
      'llm_generation',
      'persistence_write',
      'report_generation',
      'export_write',
      'promotion_apply',
    ],
    ...overrides,
  };
}

describe('simulator range view model', () => {
  it('converts monthly range points to campaign display rows without changing table math', () => {
    const viewModel = buildSimulatorRangeViewModel({
      rangeData: [
        { budget: 30_000_000, reach: 300_000, cpm: 5_000, cpc: 500 },
        { budget: 60_000_000, reach: 510_000, cpm: 5_500, cpc: 600 },
      ],
      campaignDays: 10,
      selectedBudget: 10_000_000,
    });

    expect(viewModel.chartData).toEqual([
      {
        budget: 10_000_000,
        monthlyBudget: 30_000_000,
        reach: 100_000,
        monthlyReach: 300_000,
        cpm: 5_000,
        cpc: 500,
        impressions: 2_000_000,
        clicks: 20_000,
        reachEfficiency: 100,
        label: '1000만',
      },
      {
        budget: 20_000_000,
        monthlyBudget: 60_000_000,
        reach: 170_000,
        monthlyReach: 510_000,
        cpm: 5_500,
        cpc: 600,
        impressions: 3_636_364,
        clicks: 33_333,
        reachEfficiency: 85,
        label: '2000만',
      },
    ]);
  });

  it('keeps the existing trend brief labels and selected-budget fallback behavior', () => {
    const viewModel = buildSimulatorRangeViewModel({
      rangeData: [
        { budget: 30_000_000, reach: 300_000, cpm: 5_000, cpc: 500 },
        { budget: 60_000_000, reach: 510_000, cpm: 5_500, cpc: 600 },
      ],
      campaignDays: 10,
      selectedBudget: 11_000_000,
    });

    expect(viewModel.rangeTrendBrief).toEqual([
      {
        label: '예산 범위',
        value: '1000만 → 2000만',
        detail: '도달 +70%',
      },
      {
        label: '선택 예산',
        value: '₩10,000,000',
        detail: '만원당 100명 도달',
      },
      {
        label: '한계 효율 신호',
        value: '효율 체감',
        detail: '구간 끝 CPM ₩5,500',
      },
    ]);
  });

  it('returns aggregate display rows only and does not expose source identifiers or secrets', () => {
    const viewModel = buildSimulatorRangeViewModel({
      rangeData: [
        {
          budget: 30_000_000,
          reach: 300_000,
          cpm: 5_000,
          cpc: 500,
          sourceRows: [{ campaignId: 'campaign-123', url: 'https://example.test' }],
          accountId: 'act_123',
          providerId: 'meta-provider-id',
          adId: 'ad-123',
          token: 'secret-token',
          cookie: 'session-cookie',
          session: 'session-id',
          secret: 'private-secret',
        } as never,
      ],
      campaignDays: 10,
      selectedBudget: 10_000_000,
    });
    const json = JSON.stringify(viewModel);
    const keys = collectKeys(viewModel);
    const forbiddenKeyPatterns = [
      /raw/i,
      /^sourceRows$/i,
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

    expect(keys.some((key) => forbiddenKeyPatterns.some((pattern) => pattern.test(key)))).toBe(false);
    expect(json).not.toContain('campaign-123');
    expect(json).not.toContain('https://example.test');
    expect(json).not.toContain('act_123');
    expect(json).not.toContain('meta-provider-id');
    expect(json).not.toContain('ad-123');
    expect(json).not.toContain('secret-token');
    expect(json).not.toContain('session-cookie');
    expect(json).not.toContain('session-id');
    expect(json).not.toContain('private-secret');
  });

  it('keeps empty range output aggregate-only and inert', () => {
    expect(buildSimulatorRangeViewModel({
      rangeData: [],
      campaignDays: 7,
      selectedBudget: 10_000_000,
    })).toEqual({
      chartData: [],
      rangeTrendBrief: [],
    });
  });

  it('formats budget labels the same way as the simulator chart reference line', () => {
    expect(formatSimulatorBudget(10_000_000)).toBe('1000만');
    expect(formatSimulatorBudget(100_000_000)).toBe('1억');
  });

  it('builds deterministic operator review copy for every confirmation state', () => {
    expect(buildSimulatorRangeReviewCopy({
      confirmation: buildConfirmation('accepted_for_operator_review'),
      isCalculated: true,
      loading: false,
    })).toEqual({
      label: '운영자 검토 가능',
      detail: '3개 구간 · 최소 매칭 42건',
      tone: 'ok',
      nextAction: '운영자가 집계 구간과 근거를 검토합니다.',
    });

    expect(buildSimulatorRangeReviewCopy({
      confirmation: buildConfirmation('blocked_by_sufficiency'),
      isCalculated: true,
      loading: false,
    })).toEqual({
      label: '근거 보강 필요',
      detail: '3개 구간 · 최소 매칭 42건',
      tone: 'risk',
      nextAction: '검토 전 집계 근거를 보강합니다.',
    });

    expect(buildSimulatorRangeReviewCopy({
      confirmation: buildConfirmation('blocked_by_current_range'),
      isCalculated: true,
      loading: false,
    })).toEqual({
      label: '현재 예산 확인 필요',
      detail: '3개 구간 · 최소 매칭 42건',
      tone: 'risk',
      nextAction: '현재 예산이 검토 구간에 포함되는지 확인합니다.',
    });

    expect(buildSimulatorRangeReviewCopy({
      confirmation: buildConfirmation('rejected_invalid_range'),
      isCalculated: true,
      loading: false,
    })).toEqual({
      label: '구간 재계산 필요',
      detail: '3개 구간 · 최소 매칭 42건',
      tone: 'risk',
      nextAction: '유효한 집계 구간으로 재계산합니다.',
    });
  });

  it('builds loading and pre-run fallback operator review copy', () => {
    expect(buildSimulatorRangeReviewCopy({
      confirmation: null,
      isCalculated: false,
      loading: false,
    })).toEqual({
      label: '실행 전',
      detail: '구간 결과가 들어오면 운영자 검토 상태를 표시합니다.',
      tone: 'idle',
      nextAction: '시뮬레이션 실행 후 예산 구간을 확인합니다.',
    });

    expect(buildSimulatorRangeReviewCopy({
      confirmation: null,
      isCalculated: true,
      loading: true,
    })).toEqual({
      label: '구간 계산 중',
      detail: '예산별 결과를 확인하고 있습니다.',
      tone: 'watch',
      nextAction: '계산 완료 후 운영자 검토 가능 여부를 확인합니다.',
    });

    expect(buildSimulatorRangeReviewCopy({
      confirmation: null,
      isCalculated: true,
      loading: false,
    })).toEqual({
      label: '구간 확인 대기',
      detail: '구간 결과가 들어오면 운영자 검토 상태를 표시합니다.',
      tone: 'idle',
      nextAction: '예산 구간 결과를 다시 요청합니다.',
    });
  });

  it('keeps serialized operator review copy bounded to service copy only', () => {
    const copy = buildSimulatorRangeReviewCopy({
      confirmation: {
        ...buildConfirmation('blocked_by_sufficiency'),
        accountId: 'act_123',
        campaignId: 'campaign-123',
        adId: 'ad-123',
        providerId: 'meta-provider-id',
        url: 'https://example.test',
        token: 'secret-token',
        cookie: 'session-cookie',
        session: 'session-id',
        secret: 'private-secret',
        rawRows: [{ source: 'source-row-1' }],
      } as never,
      isCalculated: true,
      loading: false,
    });
    const json = JSON.stringify(copy);
    const keys = collectKeys(copy);
    const forbiddenKeyPatterns = [
      /raw/i,
      /source/i,
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

    expect(keys.some((key) => forbiddenKeyPatterns.some((pattern) => pattern.test(key)))).toBe(false);
    expect(json).not.toContain('act_123');
    expect(json).not.toContain('campaign-123');
    expect(json).not.toContain('ad-123');
    expect(json).not.toContain('meta-provider-id');
    expect(json).not.toContain('https://example.test');
    expect(json).not.toContain('secret-token');
    expect(json).not.toContain('session-cookie');
    expect(json).not.toContain('session-id');
    expect(json).not.toContain('private-secret');
    expect(json).not.toContain('source-row-1');
  });
});
