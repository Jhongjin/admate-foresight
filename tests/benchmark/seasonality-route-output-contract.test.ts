import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as seasonalityRouteOutputContract from '../../lib/foresightSeasonalityRouteOutputContract';

function loadSeasonalityRouteWithInsights(seasonalityResult: unknown) {
  const getSeasonalityInsights = vi.fn(() => seasonalityResult);
  const routePath = join(process.cwd(), 'app', 'api', 'seasonality', 'route.ts');
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
    if (id === '@/lib/trendsData') return { getSeasonalityInsights };
    if (id === '@/lib/foresightSeasonalityRouteOutputContract') {
      return seasonalityRouteOutputContract;
    }
    throw new Error(`Unexpected route dependency: ${id}`);
  };

  new Function('require', 'module', 'exports', outputText)(
    requireMock,
    routeModule,
    routeModule.exports,
  );

  if (!routeModule.exports.GET) throw new Error('Missing GET export for seasonality route');
  return { GET: routeModule.exports.GET, getSeasonalityInsights };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

const windowFixture = {
  dateRange: '2026-01-31 ~ 2026-02-13',
  avgCPM: 4400,
  avgCPC: 480,
  avgCTR: 1.42,
  avgVTR: 22.4,
  totalSpend: 980000,
  totalReach: 120000,
  count: 18,
};

describe('seasonality route output contract', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns only aggregate-safe seasonality events and drops unsafe helper fields', async () => {
    const unsafeQueryLabel = 'https://example.test/?token=opaque-token-value';
    const { GET, getSeasonalityInsights } = loadSeasonalityRouteWithInsights([
      {
        id: 'seollal_2026',
        name: '설명절',
        emoji: 'gift',
        description: '음력 설날 연휴',
        eventStart: '2026-02-14',
        eventEnd: '2026-02-18',
        before: windowFixture,
        during: {
          ...windowFixture,
          dateRange: '2026-02-14 ~ 2026-02-18',
          count: 0,
        },
        after: {
          ...windowFixture,
          dateRange: '2026-02-19 ~ 2026-03-04',
        },
        cpmChange: 12.3,
        cpcChange: null,
        ctrChange: -4.5,
        vtrChange: 2,
        sourceRows: [{ id: 'source-row' }],
        rawRecords: [{ cookie: 'opaque-cookie-value' }],
        campaignId: 'campaign-123',
        url: 'https://example.test/path',
        token: 'opaque-token-value',
      },
      {
        id: 'valentine_2026',
        name: '밸런타인데이',
        emoji: 'gift',
        description: '초콜릿 선물 시즌',
        eventStart: '2026-02-14',
        eventEnd: '2026-02-14',
        before: windowFixture,
        during: {
          ...windowFixture,
          dateRange: '2026-02-14 ~ 2026-02-14',
          avgCPM: Number.POSITIVE_INFINITY,
        },
        after: {
          ...windowFixture,
          dateRange: '2026-02-15 ~ 2026-02-28',
        },
        cpmChange: 1,
        cpcChange: 2,
        ctrChange: 3,
        vtrChange: 4,
      },
      {
        id: 'summer_2026',
        name: '여름 시즌',
        emoji: 'summer',
        description: 'https://example.test/?token=opaque-token-value',
        eventStart: '2026-07-01',
        eventEnd: '2026-07-15',
        before: windowFixture,
        during: windowFixture,
        after: windowFixture,
        cpmChange: 1,
        cpcChange: 2,
        ctrChange: 3,
        vtrChange: 4,
      },
    ]);

    const response = await GET(
      new Request(`https://admate.test/api/seasonality?industries=${encodeURIComponent(unsafeQueryLabel)}`),
    );
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(getSeasonalityInsights).toHaveBeenCalledWith([unsafeQueryLabel]);
    expect(responseBody).toEqual([
      {
        id: 'seollal_2026',
        name: '설명절',
        emoji: 'gift',
        description: '음력 설날 연휴',
        eventStart: '2026-02-14',
        eventEnd: '2026-02-18',
        before: windowFixture,
        during: {
          ...windowFixture,
          dateRange: '2026-02-14 ~ 2026-02-18',
          count: 0,
        },
        after: {
          ...windowFixture,
          dateRange: '2026-02-19 ~ 2026-03-04',
        },
        cpmChange: 12.3,
        cpcChange: null,
        ctrChange: -4.5,
        vtrChange: 2,
      },
    ]);

    const serialized = JSON.stringify(responseBody);
    const keyPaths = collectKeys(responseBody).join('\n');
    expect(keyPaths).not.toMatch(/raw|source|account|campaign|adset|adId|provider|url|token|cookie|session|secret/i);
    expect(serialized).not.toMatch(/https:\/\/example\.test|opaque-token-value|opaque-cookie-value|source-row|campaign-123|Infinity/i);
  });

  it('drops events with unsafe identifiers or non-finite change values', async () => {
    const { GET } = loadSeasonalityRouteWithInsights([
      {
        id: 'campaign-123',
        name: '안전 이름',
        emoji: 'gift',
        description: '안전 설명',
        eventStart: '2026-02-14',
        eventEnd: '2026-02-18',
        before: windowFixture,
        during: windowFixture,
        after: windowFixture,
        cpmChange: 1,
        cpcChange: null,
        ctrChange: 2,
        vtrChange: 3,
      },
      {
        id: 'safe_event_2026',
        name: '안전 이름',
        emoji: 'gift',
        description: '안전 설명',
        eventStart: '2026-02-14',
        eventEnd: '2026-02-18',
        before: windowFixture,
        during: windowFixture,
        after: windowFixture,
        cpmChange: Number.NaN,
        cpcChange: null,
        ctrChange: 2,
        vtrChange: 3,
      },
    ]);

    const response = await GET(new Request('https://admate.test/api/seasonality'));
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(responseBody).toEqual([]);
  });
});
