import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as trendsRouteOutputContract from '../../lib/foresightTrendRouteOutputContract';

function loadTrendsRouteWithTrends(trendsResult: unknown) {
  const getTrends = vi.fn(() => trendsResult);
  const routePath = join(process.cwd(), 'app', 'api', 'trends', 'route.ts');
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
    if (id === '@/lib/trendsData') return { getTrends };
    if (id === '@/lib/foresightTrendRouteOutputContract') {
      return trendsRouteOutputContract;
    }
    throw new Error(`Unexpected route dependency: ${id}`);
  };

  new Function('require', 'module', 'exports', outputText)(
    requireMock,
    routeModule,
    routeModule.exports,
  );

  if (!routeModule.exports.GET) throw new Error('Missing GET export for trends route');
  return { GET: routeModule.exports.GET, getTrends };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

describe('trends route output contract', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns only aggregate-safe trend rows and drops unsafe or unmatched query labels', async () => {
    const unsafeQueryLabel = 'https://example.test/?token=opaque-token-value';
    const { GET, getTrends } = loadTrendsRouteWithTrends([
      {
        industry: '뷰티',
        sourceRows: [{ id: 'source-row' }],
        rawRecords: [{ cookie: 'opaque-cookie-value' }],
        trends: [
          {
            month: '2025-06',
            avgCPM: 4400,
            avgCPC: 480,
            avgCTR: 1.42,
            avgVTR: 22.4,
            totalReach: 120000,
            totalSpend: 980000,
            totalImpressions: 220000,
            totalClicks: 2042,
            count: 18,
            campaignId: 'campaign-123',
            url: 'https://example.test/path',
            token: 'opaque-token-value',
          },
          {
            month: '2025-07',
            avgCPM: Number.POSITIVE_INFINITY,
            avgCPC: 500,
            avgCTR: 1.2,
            avgVTR: 19.2,
            totalReach: 100000,
            totalSpend: 800000,
            totalImpressions: 200000,
            totalClicks: 1600,
            count: 10,
          },
        ],
      },
      {
        industry: unsafeQueryLabel,
        trends: [],
      },
      {
        industry: 'campaign-123',
        trends: [
          {
            month: '2025-06',
            avgCPM: 4400,
            avgCPC: 480,
            avgCTR: 1.42,
            avgVTR: 22.4,
            totalReach: 120000,
            totalSpend: 980000,
            totalImpressions: 220000,
            totalClicks: 2042,
            count: 18,
          },
        ],
      },
    ]);

    const response = await GET(
      new Request(`https://admate.test/api/trends?industries=${encodeURIComponent(unsafeQueryLabel)}`),
    );
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(getTrends).toHaveBeenCalledWith([unsafeQueryLabel], [], [], []);
    expect(responseBody).toEqual([
      {
        industry: '뷰티',
        trends: [
          {
            month: '2025-06',
            avgCPM: 4400,
            avgCPC: 480,
            avgCTR: 1.42,
            avgVTR: 22.4,
            totalReach: 120000,
            totalSpend: 980000,
            totalImpressions: 220000,
            totalClicks: 2042,
            count: 18,
          },
        ],
      },
    ]);

    const serialized = JSON.stringify(responseBody);
    const keyPaths = collectKeys(responseBody).join('\n');
    expect(keyPaths).not.toMatch(/raw|source|account|campaign|adset|adId|provider|url|token|cookie|session|secret/i);
    expect(serialized).not.toMatch(/https:\/\/example\.test|opaque-token-value|opaque-cookie-value|source-row|campaign-123|Infinity/i);
  });

  it('returns an empty aggregate response instead of echoing query-only labels', async () => {
    const unsafeQueryLabel = 'opaque-session-value';
    const { GET } = loadTrendsRouteWithTrends([
      {
        industry: unsafeQueryLabel,
        trends: [],
      },
    ]);

    const response = await GET(
      new Request(`https://admate.test/api/trends?industries=${encodeURIComponent(unsafeQueryLabel)}`),
    );
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(responseBody).toEqual([]);
    expect(JSON.stringify(responseBody)).not.toContain(unsafeQueryLabel);
  });
});
