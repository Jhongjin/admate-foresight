import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as predictResultContract from '../../lib/foresightSimulatorPredictResultContract';

const validRequestBody = {
  industries: ['뷰티'],
  genders: ['female'],
  ageRanges: ['25-34'],
  objectives: ['OUTCOME_TRAFFIC'],
  budget: 10_000_000,
  monthFrom: '2025-06',
  monthTo: '2025-07',
};

const validPredictResult = {
  reach: 120_000,
  cpm: 4_400,
  cpc: 480,
  cpcLink: 690,
  cpv: 22,
  vtr: 33.8,
  frequency: 1.42,
  reachChange: 4.2,
  cpmChange: -2.1,
  cpcChange: 1.4,
  matchedCount: 180,
  dataSufficiency: {
    status: 'sufficient',
    basis: 'exact_cohort',
    matchedCount: 180,
    minimumRequired: 10,
    warningCodes: [],
  },
  r2Cpm: 0.82,
  r2Cpc: 0.77,
  r2Vtr: 0.8,
  predictionMethod: 'regression',
  marketAvg: {
    cpm: 5_000,
    cpc: 520,
    cpcLink: 760,
    cpv: 24,
    vtr: 31.25,
    count: 240,
    score: 88,
    grade: 'A',
    cpmDiff: -12.5,
    cpcDiff: -8.2,
    cpcLinkDiff: -6.4,
    cpvDiff: -10,
    vtrDiff: 9.2,
    top20pctCpm: 4_200,
    top20pctCpc: 410,
    industrySelected: true,
  },
  insights: ['Stable aggregate cost trend.'],
  seasonalityMultiplier: 1.08,
  seasonalityReason: 'Spring demand pattern.',
  qualityIndex: 91,
  qualityPenaltyPct: 3,
  saturationWarning: false,
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

async function importPredictRouteWithPredictResult(predictResult: unknown) {
  const predict = vi.fn((input: unknown) => {
    void input;
    return predictResult;
  });
  const routePath = join(process.cwd(), 'app', 'api', 'predict', 'route.ts');
  const predictionRequest = loadLocalTsModule(['lib', 'predictionRequest.ts']);
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
    if (id === '@/lib/foresightSimulatorPredictResultContract') {
      return predictResultContract;
    }
    if (id === '@/lib/predictor') return { predict };
    if (id === '@/lib/predictionRequest') return predictionRequest;
    if (id === '@/lib/xlsxLoader') {
      return { ensureDataLoaded: vi.fn(async () => undefined) };
    }
    throw new Error(`Unexpected route dependency: ${id}`);
  };

  new Function('require', 'module', 'exports', outputText)(
    requireMock,
    routeModule,
    routeModule.exports,
  );

  if (!routeModule.exports.POST) throw new Error('Missing POST export for predict route');
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

describe('simulator predict route output contract', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns only the explicit aggregate prediction allowlist', async () => {
    const { POST, predict } = await importPredictRouteWithPredictResult({
      ...validPredictResult,
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
      insights: [
        'Budget pressure remains stable.',
        'https://example.test/path',
        'campaign-123',
        'opaque-token-value',
      ],
      seasonalityReason: 'opaque-session-value',
      marketAvg: {
        ...validPredictResult.marketAvg,
        rawRows: [{ id: 'source-row' }],
        providerAccountId: 'act_123',
        cookie: 'opaque-cookie-value',
      },
    });

    const response = await POST(requestWithJson(validRequestBody) as unknown as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(predict).toHaveBeenCalledTimes(1);
    expect(Object.keys(responseBody)).toEqual([
      'reach',
      'cpm',
      'cpc',
      'cpcLink',
      'cpv',
      'vtr',
      'frequency',
      'matchedCount',
      'r2Cpm',
      'r2Cpc',
      'r2Vtr',
      'seasonalityMultiplier',
      'qualityIndex',
      'qualityPenaltyPct',
      'predictionMethod',
      'marketAvg',
      'insights',
      'saturationWarning',
    ]);
    expect(responseBody.insights).toEqual(['Budget pressure remains stable.']);
    expect(responseBody).not.toHaveProperty('seasonalityReason');
    expect(responseBody).not.toHaveProperty('reachChange');
    expect(responseBody).not.toHaveProperty('cpmChange');
    expect(responseBody).not.toHaveProperty('cpcChange');
    expect(responseBody).not.toHaveProperty('dataSufficiency');

    const serialized = JSON.stringify(responseBody);
    const keyPaths = collectKeys(responseBody).join('\n');
    expect(keyPaths).not.toMatch(/raw|source|account|campaign|adset|adId|provider|url|token|cookie|session|secret/i);
    expect(serialized).not.toMatch(/act_123|campaign-123|adset-123|ad-123|provider-123|source-row|https:\/\/example\.test|opaque-token-value|opaque-cookie-value|opaque-session-value|opaque-secret-value/i);
  });

  it('fails closed with a bounded error when predictor output is malformed', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { POST, predict } = await importPredictRouteWithPredictResult({
      ...validPredictResult,
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
    expect(predict).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(responseBody)).not.toMatch(/act_123|source-row|opaque-token-value|Infinity/i);
    expect(consoleSpy).toHaveBeenCalledWith('[predict] invalid prediction result');
  });
});
