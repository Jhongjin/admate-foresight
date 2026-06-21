import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as filtersRouteOutputContract from '../../lib/foresightFiltersRouteOutputContract';

interface FiltersRouteMockData {
  csvIndustries?: unknown;
  xlsxIndustries?: unknown;
  ageRanges?: unknown;
  objectives?: unknown;
  months?: unknown;
  placements?: unknown;
  creativeTypes?: unknown;
}

function loadFiltersRouteWithData(data: FiltersRouteMockData) {
  const ensureDataLoaded = vi.fn(async () => undefined);
  const getIndustries = vi.fn(() => data.csvIndustries ?? []);
  const getXlsxIndustries = vi.fn(() => data.xlsxIndustries ?? []);
  const getAgeRanges = vi.fn(() => data.ageRanges ?? []);
  const getObjectives = vi.fn(() => data.objectives ?? []);
  const getAvailableMonths = vi.fn(() => data.months ?? []);
  const getPlacements = vi.fn(() => data.placements ?? []);
  const getCreativeFormats = vi.fn(() => data.creativeTypes ?? []);
  const routePath = join(process.cwd(), 'app', 'api', 'filters', 'route.ts');
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
    if (id === '@/lib/csvLoader') {
      return { getIndustries, getAgeRanges };
    }
    if (id === '@/lib/xlsxLoader') {
      return {
        ensureDataLoaded,
        getObjectives,
        getXlsxIndustries,
        getAvailableMonths,
        getPlacements,
        getCreativeFormats,
        normalizeIndustryName: (value: string | null | undefined) => {
          const normalized: Record<string, string> = {
            '의약/건기식': '의약/건강식',
            '호텔': '관광/레저',
            '여행': '관광/레저',
          };
          const trimmed = (value ?? '').trim();
          return normalized[trimmed] ?? trimmed;
        },
      };
    }
    if (id === '@/lib/foresightFiltersRouteOutputContract') {
      return filtersRouteOutputContract;
    }
    throw new Error(`Unexpected route dependency: ${id}`);
  };

  new Function('require', 'module', 'exports', outputText)(
    requireMock,
    routeModule,
    routeModule.exports,
  );

  if (!routeModule.exports.GET) throw new Error('Missing GET export for filters route');
  return { GET: routeModule.exports.GET, ensureDataLoaded };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

describe('filters route output contract', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns only the normalized filters envelope and drops unsafe labels', async () => {
    const { GET } = loadFiltersRouteWithData({
      csvIndustries: [
        '기타',
        '패션',
        '식음료',
        'https://example.test/?token=opaque-token-value',
        'campaign-123',
        'raw_source_data',
        '',
      ],
      xlsxIndustries: [
        '뷰티',
        '1234567890',
        'opaque-session-value',
      ],
      ageRanges: [
        '18-24',
        '25-34',
        '65+',
        'custom adult',
        'https://example.test/age',
        'account_id',
        'abcdefghijklmnopqrstuvwxyz1234567890',
      ],
      objectives: [
        'OUTCOME_SALES',
        'Brand Awareness',
        'campaign-123',
        'https://example.test/objective',
        'secret_objective',
        'abcdefghijklmnopqrstuvwxyz1234567890',
      ],
      months: [
        '2025-06',
        '2025-13',
        '2025-6',
        '2025-07',
        'https://example.test/month',
      ],
      placements: [
        'Instagram 피드',
        'Facebook 스토리',
        'act_123',
        'creative_id',
      ],
      creativeTypes: [
        '이미지',
        '동영상',
        'campaign-123',
        'https://example.test/creative',
      ],
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(responseBody).toEqual({
      industries: ['식음료', '뷰티', '패션', '기타'],
      ageRanges: ['18-24', '25-34', '65+', 'custom adult'],
      genders: ['male', 'female'],
      objectives: ['OUTCOME_SALES', 'Brand Awareness'],
      months: ['2025-06', '2025-07'],
      placements: ['Instagram 피드', 'Facebook 스토리'],
      creativeTypes: ['이미지', '동영상'],
    });

    const serialized = JSON.stringify(responseBody);
    const keyPaths = collectKeys(responseBody).join('\n');
    expect(Object.keys(responseBody)).toEqual([
      'industries',
      'ageRanges',
      'genders',
      'objectives',
      'months',
      'placements',
      'creativeTypes',
    ]);
    expect(keyPaths).not.toMatch(/raw|source|account|campaign|adset|provider|url|token|cookie|session|secret/i);
    expect(serialized).not.toMatch(/https:\/\/example\.test|opaque-token-value|opaque-session-value|campaign-123|1234567890|secret_objective|act_123|creative_id/);
  });

  it('normalizes legacy and alias industry labels before returning filters', async () => {
    const { GET } = loadFiltersRouteWithData({
      csvIndustries: [
        '식음료',
        '의약/건기식',
        '호텔',
      ],
      xlsxIndustries: [
        '관광/레저',
        '의약/건강식',
        '기타',
      ],
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.industries).toEqual([
      '식음료',
      '의약/건강식',
      '관광/레저',
      '기타',
    ]);
    expect(responseBody.industries).not.toContain('의약/건기식');
    expect(responseBody.industries).not.toContain('호텔');
  });

  it('returns empty arrays for malformed helper output instead of echoing it', async () => {
    const { GET } = loadFiltersRouteWithData({
      csvIndustries: 'unsafe-session-value',
      xlsxIndustries: null,
      ageRanges: { rawRows: [{ cookie: 'opaque-cookie-value' }] },
      objectives: 'OUTCOME_SALES',
      months: [
        '2025-00',
        'not-a-month',
      ],
      placements: { rawRows: [{ token: 'opaque-token-value' }] },
      creativeTypes: '이미지',
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(responseBody).toEqual({
      industries: [],
      ageRanges: [],
      genders: ['male', 'female'],
      objectives: [],
      months: [],
      placements: [],
      creativeTypes: [],
    });
    expect(JSON.stringify(responseBody)).not.toMatch(/unsafe-session-value|opaque-cookie-value|opaque-token-value|OUTCOME_SALES|not-a-month|이미지/);
  });

  it('allows only supported gender values when normalizing the contract directly', () => {
    expect(filtersRouteOutputContract.normalizeFiltersRouteOutput({
      industries: [],
      ageRanges: [],
      genders: ['male', 'Female', 'UNKNOWN', 'admin', 'session'],
      objectives: [],
      months: [],
      placements: [],
      creativeTypes: [],
      rawRows: [{ cookie: 'opaque-cookie-value' }],
    })).toEqual({
      industries: [],
      ageRanges: [],
      genders: ['male', 'female', 'unknown'],
      objectives: [],
      months: [],
      placements: [],
      creativeTypes: [],
    });
  });
});
