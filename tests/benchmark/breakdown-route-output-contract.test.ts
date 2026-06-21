import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as breakdownRouteOutputContract from '../../lib/foresightBreakdownRouteOutputContract';

function loadBreakdownRouteWithBreakdown(breakdownResult: unknown) {
  const getBreakdown = vi.fn(() => breakdownResult);
  const routePath = join(process.cwd(), 'app', 'api', 'breakdown', 'route.ts');
  const source = readFileSync(routePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const routeModule = {
    exports: {} as { GET?: (req: Request) => Promise<Response> },
  };

  const requireMock = (id: string) => {
    if (id === 'next/server') {
      return {
        NextResponse: {
          json: (body: unknown, init?: ResponseInit) => {
            const headers = new Headers(init?.headers);
            headers.set('content-type', 'application/json');

            return new Response(JSON.stringify(body), {
              ...init,
              headers,
            });
          },
        },
      };
    }
    if (id === '@/lib/auth/foresightApiGuard') {
      return { requireForesightApiSession: vi.fn(async () => null) };
    }
    if (id === '@/lib/xlsxLoader') {
      return { ensureDataLoaded: vi.fn(async () => undefined) };
    }
    if (id === '@/lib/trendsData') return { getBreakdown };
    if (id === '@/lib/foresightBreakdownRouteOutputContract') {
      return breakdownRouteOutputContract;
    }
    throw new Error(`Unexpected route dependency: ${id}`);
  };

  new Function('require', 'module', 'exports', outputText)(
    requireMock,
    routeModule,
    routeModule.exports,
  );

  if (!routeModule.exports.GET) throw new Error('Missing GET export for breakdown route');
  return { GET: routeModule.exports.GET, getBreakdown };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

describe('breakdown route output contract', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns only aggregate-safe breakdown rows and efficiency ranks', async () => {
    const unsafeQueryLabel = 'https://example.test/?token=opaque-token-value';
    const { GET, getBreakdown } = loadBreakdownRouteWithBreakdown({
      byGender: [
        {
          group: 'female',
          industry: '뷰티',
          avgCPM: 4400,
          avgCPC: 480,
          avgCTR: 1.42,
          avgVTR: 22.4,
          totalReach: 120000,
          count: 18,
          sourceRows: [{ id: 'source-row' }],
          rawRecords: [{ cookie: 'opaque-cookie-value' }],
          campaignId: 'campaign-123',
          url: 'https://example.test/path',
          token: 'opaque-token-value',
        },
        {
          group: 'male',
          industry: '패션',
          avgCPM: Number.POSITIVE_INFINITY,
          avgCPC: 500,
          avgCTR: 1.2,
          avgVTR: 19.2,
          totalReach: 100000,
          count: 10,
        },
        {
          group: unsafeQueryLabel,
          industry: '뷰티',
          avgCPM: 4400,
          avgCPC: 480,
          avgCTR: 1.42,
          avgVTR: 22.4,
          totalReach: 120000,
          count: 18,
        },
      ],
      byAge: [
        {
          group: '25-34',
          industry: '뷰티',
          avgCPM: 4300,
          avgCPC: 470,
          avgCTR: 1.35,
          avgVTR: 21.1,
          totalReach: 110000,
          count: 0,
          providerSecret: 'opaque-secret-value',
        },
        {
          group: '65+',
          industry: 'campaign-123',
          avgCPM: 4300,
          avgCPC: 470,
          avgCTR: 1.35,
          avgVTR: 21.1,
          totalReach: 110000,
          count: 9,
        },
      ],
      efficiencyRanks: [
        {
          industry: '뷰티',
          avgCPM: 4400,
          avgCPC: 480,
          avgCTR: 1.42,
          avgVTR: 22.4,
          totalReach: 120000,
          cpmRank: 1,
          cpcRank: 2,
          ctrRank: 3,
          vtrRank: 1,
          accountId: 'act_123456789',
          session: 'opaque-session-value',
        },
        {
          industry: '패션',
          avgCPM: 5000,
          avgCPC: 520,
          avgCTR: 1.3,
          avgVTR: 18.5,
          totalReach: 90000,
          cpmRank: 0,
          cpcRank: 1,
          ctrRank: 2,
          vtrRank: 2,
        },
      ],
      rawRows: [{ cookie: 'opaque-cookie-value' }],
      provider: 'unsafe-provider',
    });

    const response = await GET(
      new Request(`https://admate.test/api/breakdown?industries=${encodeURIComponent(unsafeQueryLabel)}&genders=female&ageRanges=25-34&objectives=OUTCOME_SALES`),
    );
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(getBreakdown).toHaveBeenCalledWith(
      [unsafeQueryLabel],
      ['female'],
      ['25-34'],
      ['OUTCOME_SALES'],
    );
    expect(responseBody).toEqual({
      byGender: [
        {
          group: 'female',
          industry: '뷰티',
          avgCPM: 4400,
          avgCPC: 480,
          avgCTR: 1.42,
          avgVTR: 22.4,
          totalReach: 120000,
          count: 18,
        },
      ],
      byAge: [
        {
          group: '25-34',
          industry: '뷰티',
          avgCPM: 4300,
          avgCPC: 470,
          avgCTR: 1.35,
          avgVTR: 21.1,
          totalReach: 110000,
        },
      ],
      efficiencyRanks: [
        {
          industry: '뷰티',
          avgCPM: 4400,
          avgCPC: 480,
          avgCTR: 1.42,
          avgVTR: 22.4,
          totalReach: 120000,
          cpmRank: 1,
          cpcRank: 2,
          ctrRank: 3,
          vtrRank: 1,
        },
      ],
    });

    const serialized = JSON.stringify(responseBody);
    const keyPaths = collectKeys(responseBody).join('\n');
    expect(keyPaths).not.toMatch(/raw|source|account|campaign|adset|adId|provider|url|token|cookie|session|secret/i);
    expect(serialized).not.toMatch(/https:\/\/example\.test|opaque-token-value|opaque-cookie-value|opaque-session-value|opaque-secret-value|source-row|campaign-123|Infinity/i);
  });

  it('returns an empty aggregate envelope instead of echoing malformed helper output', async () => {
    const { GET } = loadBreakdownRouteWithBreakdown({
      byGender: 'unsafe-session-value',
      byAge: null,
      efficiencyRanks: [
        {
          industry: 'https://example.test/?token=opaque-token-value',
          avgCPM: 4400,
          avgCPC: 480,
          avgCTR: 1.42,
          avgVTR: 22.4,
          totalReach: 120000,
          cpmRank: 1,
          cpcRank: 2,
          ctrRank: 3,
          vtrRank: 1,
        },
      ],
    });

    const response = await GET(new Request('https://admate.test/api/breakdown'));
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(responseBody).toEqual({
      byGender: [],
      byAge: [],
      efficiencyRanks: [],
    });
    expect(JSON.stringify(responseBody)).not.toMatch(/unsafe-session-value|opaque-token-value/);
  });
});
