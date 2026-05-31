import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

const validRequestBody = {
  industries: ['뷰티'],
  genders: ['female'],
  ageRanges: ['25-34'],
  objectives: ['OUTCOME_TRAFFIC'],
  budget: 5_000_000,
  monthFrom: '2025-06',
  monthTo: '2025-07',
};

const validRangePrediction = {
  reach: 120_000,
  cpm: 4_400,
  cpc: 480,
  dataSufficiency: {
    status: 'sufficient',
    basis: 'exact_cohort',
    matchedCount: 180,
    minimumRequired: 10,
    warningCodes: [],
  },
};

function requestWithJson(body: unknown) {
  return {
    json: vi.fn(async () => body),
  };
}

function loadLocalTsModule(pathParts: string[]) {
  const filePath = join(process.cwd(), ...pathParts);
  const source = readFileSync(filePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const localModule = {
    exports: {},
  };

  new Function('require', 'module', 'exports', outputText)(
    (id: string) => {
      throw new Error(`Unexpected helper dependency: ${id}`);
    },
    localModule,
    localModule.exports,
  );

  return localModule.exports;
}

async function importPredictRangeRouteWithPredictResult(predictResult: unknown) {
  const predict = vi.fn((input: unknown) => {
    void input;
    return predictResult;
  });
  const routePath = join(process.cwd(), 'app', 'api', 'predict-range', 'route.ts');
  const predictionRequest = loadLocalTsModule(['lib', 'predictionRequest.ts']);
  const predictRangeLevels = loadLocalTsModule(['lib', 'predictRangeLevels.ts']);
  const forecastRangeConfirmation = loadLocalTsModule(['lib', 'forecastRangeConfirmation.ts']);
  const source = readFileSync(routePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const routeModule = {
    exports: {} as { POST?: (req: Request) => Promise<Response> },
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
      return {
        ensureDataLoaded: vi.fn(async () => undefined),
        loadXlsxData: vi.fn(() => [{ 날짜: '2025-06-01' }]),
      };
    }
    if (id === '@/lib/predictor') return { predict };
    if (id === '@/lib/predictionRequest') return predictionRequest;
    if (id === '@/lib/predictRangeLevels') return predictRangeLevels;
    if (id === '@/lib/forecastRangeConfirmation') return forecastRangeConfirmation;
    throw new Error(`Unexpected route dependency: ${id}`);
  };

  new Function('require', 'module', 'exports', outputText)(
    requireMock,
    routeModule,
    routeModule.exports,
  );

  if (!routeModule.exports.POST) {
    throw new Error('Missing POST export for predict-range route');
  }
  return { POST: routeModule.exports.POST, predict };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

describe('simulator predict-range route output contract', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns only the normalized aggregate range envelope', async () => {
    const { POST, predict } = await importPredictRangeRouteWithPredictResult({
      ...validRangePrediction,
      accountId: 'act_123',
      campaignId: 'campaign-123',
      adsetId: 'adset-123',
      adId: 'ad-123',
      providerId: 'provider-123',
      sourceRows: [{ id: 'source-row' }],
      rawRecords: [{ accountId: 'act_123' }],
      url: 'https://example.test/path',
      token: 'opaque-token-value',
      cookie: 'opaque-cookie-value',
      session: 'opaque-session-value',
      secret: 'opaque-secret-value',
      dataSufficiency: {
        ...validRangePrediction.dataSufficiency,
        warningCodes: [
          'RELAXED_DATA_SUFFICIENCY',
          'TOKEN_LEAK',
          'https://example.test/path',
        ],
        rawRows: [{ token: 'opaque-token-value' }],
      },
    });

    const response = await POST(requestWithJson(validRequestBody) as unknown as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(predict).toHaveBeenCalledTimes(8);
    expect(Object.keys(responseBody)).toEqual(['range', 'confirmation']);
    expect(responseBody.range).toHaveLength(8);
    expect(responseBody.range[0]).toEqual({
      budget: 1_000_000,
      reach: 120_000,
      cpm: 4_400,
      cpc: 480,
      dataSufficiency: {
        status: 'sufficient',
        basis: 'exact_cohort',
        matchedCount: 180,
        minimumRequired: 10,
        warningCodes: ['RELAXED_DATA_SUFFICIENCY'],
      },
    });
    expect(responseBody.confirmation).toMatchObject({
      aggregateOnly: true,
      readiness: {
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
        rangeLabel: '예상 구간',
        reviewLabel: '운영자 검토',
        basisLabel: '집계 충분성',
        description:
          '집계 기반 예상 구간은 운영자 검토용입니다. 보고서, 내보내기, 승격, 적용은 후속 게이트 전까지 차단됩니다.',
      },
    });

    const serialized = JSON.stringify(responseBody);
    const keys = collectKeys(responseBody);
    const forbiddenKeyPatterns = [
      /^raw(?!RecordsIncluded$)/i,
      /^source(?!RowsIncluded$)/i,
      /^account/i,
      /^campaign/i,
      /^adset/i,
      /^ad[_-]?id$/i,
      /^provider/i,
      /url/i,
      /token/i,
      /cookie/i,
      /session/i,
      /secret/i,
    ];
    expect(keys.some((key) => forbiddenKeyPatterns.some((pattern) => pattern.test(key)))).toBe(false);
    expect(serialized).not.toMatch(/act_123|campaign-123|adset-123|ad-123|provider-123|source-row|https:\/\/example\.test|opaque-token-value|opaque-cookie-value|opaque-session-value|opaque-secret-value|TOKEN_LEAK/i);
    expect(serialized).not.toMatch(/Forecast range|Operator review|Aggregate sufficiency/i);
  });

  it('fails closed with a bounded error when range output is malformed', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { POST, predict } = await importPredictRangeRouteWithPredictResult({
      ...validRangePrediction,
      reach: Number.POSITIVE_INFINITY,
      accountId: 'act_123',
      rawRecords: [{ id: 'source-row' }],
      token: 'opaque-token-value',
    });

    const response = await POST(requestWithJson(validRequestBody) as unknown as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(responseBody).toEqual({ error: 'Prediction failed' });
    expect(predict).toHaveBeenCalledTimes(8);
    expect(JSON.stringify(responseBody)).not.toMatch(/act_123|source-row|opaque-token-value|Infinity/i);
    expect(consoleSpy).toHaveBeenCalledWith('[predict-range] invalid range response');
  });
});
