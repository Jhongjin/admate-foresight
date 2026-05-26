import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

const localPrediction = {
  reach: 12_345,
  cpm: 1_200,
  cpc: 120,
  cpcLink: 90,
  cpv: 15,
  vtr: 2.5,
  frequency: 1.2,
  reachChange: null,
  cpmChange: null,
  cpcChange: null,
  matchedCount: 12,
  predictionMethod: 'weighted_avg',
  marketAvg: {
    cpm: 1_200,
    cpc: 120,
    cpcLink: 90,
    cpv: 15,
    vtr: 2.5,
    count: 12,
    score: 80,
    grade: 'A',
    cpmDiff: 0,
    cpcDiff: 0,
    cpcLinkDiff: 0,
    cpvDiff: 0,
    vtrDiff: 0,
    top20pctCpm: 1_000,
    top20pctCpc: 100,
    industrySelected: true,
  },
  seasonalityMultiplier: 1,
  seasonalityReason: '',
  qualityIndex: 80,
  qualityPenaltyPct: 0,
  saturationWarning: false,
  insights: [],
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

async function importRouteWithLocalPredictor(route: 'predict' | 'predict-range') {
  const predict = vi.fn((input: unknown) => {
    void input;
    return localPrediction;
  });
  const routePath = join(process.cwd(), 'app', 'api', route, 'route.ts');
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
          json: (body: unknown, init?: ResponseInit) =>
            new Response(JSON.stringify(body), {
              ...init,
              headers: { 'content-type': 'application/json', ...init?.headers },
            }),
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
    throw new Error(`Unexpected route dependency: ${id}`);
  };

  new Function('require', 'module', 'exports', outputText)(
    requireMock,
    routeModule,
    routeModule.exports,
  );

  if (!routeModule.exports.POST) throw new Error(`Missing POST export for ${route}`);
  return { POST: routeModule.exports.POST, predict };
}

async function expectBadPredictionRequest(route: 'predict' | 'predict-range', body: unknown) {
  const { POST, predict } = await importRouteWithLocalPredictor(route);

  const response = await POST(requestWithJson(body) as unknown as Request);
  const responseBody = await response.json();

  expect(response.status).toBe(400);
  expect(responseBody).toEqual({ error: expect.any(String) });
  expect(predict).not.toHaveBeenCalled();
}

describe('prediction route objectives contract', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('passes POST /api/predict objectives through to lib/predictor', async () => {
    const { POST, predict } = await importRouteWithLocalPredictor('predict');

    const objectives = ['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC'];
    const response = await POST(requestWithJson({
      industries: ['뷰티'],
      genders: ['female'],
      ageRanges: ['25-34'],
      objectives,
      budget: 10_000_000,
      monthFrom: '2025-06',
      monthTo: '2025-07',
    }) as unknown as Request);

    expect(response.status).toBe(200);
    expect(predict).toHaveBeenCalledTimes(1);
    expect(predict).toHaveBeenCalledWith({
      industries: ['뷰티'],
      genders: ['female'],
      ageRanges: ['25-34'],
      objectives,
      budget: 10_000_000,
      monthFrom: '2025-06',
      monthTo: '2025-07',
    });
  });

  it('passes POST /api/predict-range objectives through on every budget prediction', async () => {
    const { POST, predict } = await importRouteWithLocalPredictor('predict-range');

    const objectives = ['OUTCOME_TRAFFIC'];
    const response = await POST(requestWithJson({
      industries: ['교육'],
      genders: [],
      ageRanges: ['35-44'],
      objectives,
      budget: 5_000_000,
      monthFrom: '2025-06',
      monthTo: '2025-06',
    }) as unknown as Request);

    expect(response.status).toBe(200);
    expect(predict).toHaveBeenCalledTimes(8);
    expect(predict.mock.calls.map(([input]) => input)).toEqual([
      expect.objectContaining({ objectives, budget: 1_000_000 }),
      expect.objectContaining({ objectives, budget: 3_000_000 }),
      expect.objectContaining({ objectives, budget: 5_000_000 }),
      expect.objectContaining({ objectives, budget: 10_000_000 }),
      expect.objectContaining({ objectives, budget: 20_000_000 }),
      expect.objectContaining({ objectives, budget: 30_000_000 }),
      expect.objectContaining({ objectives, budget: 50_000_000 }),
      expect.objectContaining({ objectives, budget: 100_000_000 }),
    ]);
  });

  it.each([
    ['predict' as const],
    ['predict-range' as const],
  ])('rejects malformed objectives for POST /api/%s', async (route) => {
    await expectBadPredictionRequest(route, {
      industries: ['교육'],
      genders: [],
      ageRanges: ['35-44'],
      objectives: ['OUTCOME_TRAFFIC', 123],
      budget: 5_000_000,
      monthFrom: '2025-06',
      monthTo: '2025-06',
    });
  });

  it.each([
    ['predict' as const, Number.NaN],
    ['predict-range' as const, -1],
  ])('rejects malformed budget for POST /api/%s', async (route, budget) => {
    await expectBadPredictionRequest(route, {
      industries: ['교육'],
      genders: [],
      ageRanges: ['35-44'],
      objectives: ['OUTCOME_TRAFFIC'],
      budget,
      monthFrom: '2025-06',
      monthTo: '2025-06',
    });
  });

  it.each([
    ['predict' as const, { monthFrom: '2025-6', monthTo: '2025-06' }],
    ['predict-range' as const, { monthFrom: '2025-06', monthTo: '2025-13' }],
  ])('rejects malformed months for POST /api/%s', async (route, months) => {
    await expectBadPredictionRequest(route, {
      industries: ['교육'],
      genders: [],
      ageRanges: ['35-44'],
      objectives: ['OUTCOME_TRAFFIC'],
      budget: 5_000_000,
      ...months,
    });
  });
});
