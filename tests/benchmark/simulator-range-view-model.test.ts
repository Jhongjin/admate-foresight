import { describe, expect, it } from 'vitest';

import {
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
});
