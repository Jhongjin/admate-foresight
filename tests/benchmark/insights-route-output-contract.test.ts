import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as insightsRouteOutputContract from '../../lib/foresightInsightsRouteOutputContract';

function loadInsightsRouteWithInsights(insightsResult: unknown) {
  const getSeasonInsights = vi.fn(() => insightsResult);
  const routePath = join(process.cwd(), 'app', 'api', 'insights', 'route.ts');
  const source = readFileSync(routePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const routeModule = {
    exports: {} as { GET?: () => Promise<Response> },
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
    if (id === '@/lib/trendsData') return { getSeasonInsights };
    if (id === '@/lib/foresightInsightsRouteOutputContract') {
      return insightsRouteOutputContract;
    }
    throw new Error(`Unexpected route dependency: ${id}`);
  };

  new Function('require', 'module', 'exports', outputText)(
    requireMock,
    routeModule,
    routeModule.exports,
  );

  if (!routeModule.exports.GET) throw new Error('Missing GET export for insights route');
  return { GET: routeModule.exports.GET, getSeasonInsights };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

describe('insights route output contract', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns only aggregate-safe insight rows and drops unsafe labels or malformed values', async () => {
    const { GET, getSeasonInsights } = loadInsightsRouteWithInsights([
      {
        month: '2025-06',
        industry: '뷰티',
        avgCPM: 4400,
        avgCPC: 480,
        avgCTR: 1.42,
        totalReach: 120000,
        totalSpend: 980000,
        count: 18,
        sourceRows: [{ id: 'source-row' }],
        rawRecords: [{ cookie: 'opaque-cookie-value' }],
        campaignId: 'campaign-123',
        url: 'https://example.test/path',
        token: 'opaque-token-value',
      },
      {
        month: '2025-07',
        industry: '패션',
        avgCPM: Number.POSITIVE_INFINITY,
        avgCPC: 500,
        avgCTR: 1.2,
        totalReach: 100000,
        totalSpend: 800000,
        count: 10,
      },
      {
        month: '2025-06',
        industry: 'https://example.test/?token=opaque-token-value',
        avgCPM: 4400,
        avgCPC: 480,
        avgCTR: 1.42,
        totalReach: 120000,
        totalSpend: 980000,
        count: 18,
      },
      {
        month: '2025-06',
        industry: 'campaign-123',
        avgCPM: 4400,
        avgCPC: 480,
        avgCTR: 1.42,
        totalReach: 120000,
        totalSpend: 980000,
        count: 18,
      },
    ]);

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(getSeasonInsights).toHaveBeenCalledOnce();
    expect(responseBody).toEqual([
      {
        month: '2025-06',
        industry: '뷰티',
        avgCPM: 4400,
        avgCPC: 480,
        avgCTR: 1.42,
        totalReach: 120000,
        totalSpend: 980000,
        count: 18,
      },
    ]);

    const serialized = JSON.stringify(responseBody);
    const keyPaths = collectKeys(responseBody).join('\n');
    expect(keyPaths).not.toMatch(/raw|source|account|campaign|adset|adId|provider|url|token|cookie|session|secret/i);
    expect(serialized).not.toMatch(/https:\/\/example\.test|opaque-token-value|opaque-cookie-value|source-row|campaign-123|Infinity/i);
  });

  it('returns an empty aggregate response instead of echoing unsafe helper labels', async () => {
    const unsafeLabel = 'opaque-session-value';
    const { GET } = loadInsightsRouteWithInsights([
      {
        month: '2025-06',
        industry: unsafeLabel,
        avgCPM: 4400,
        avgCPC: 480,
        avgCTR: 1.42,
        totalReach: 120000,
        totalSpend: 980000,
        count: 18,
      },
    ]);

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(responseBody).toEqual([]);
    expect(JSON.stringify(responseBody)).not.toContain(unsafeLabel);
  });
});
