import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { XlsxRecord } from '../../lib/xlsxLoader';

const regressionFallback = {
  cpm: 0,
  cpc: 0,
  cpcLink: 0,
  vtr: 0,
  r2Cpm: 0,
  r2Cpc: 0,
  r2VTR: 0,
};

function record(overrides: Partial<XlsxRecord> = {}): XlsxRecord {
  return {
    업종: '교육',
    목표: 'OUTCOME_TRAFFIC',
    최적화목표: '',
    노출위치: '',
    소재형태: '',
    성별: 'female',
    연령: '25-34',
    도달: 1_000,
    노출: 2_000,
    지출금액: 10_000,
    빈도: 2,
    CPM: 5_000,
    CPC: 500,
    CPC링크: 400,
    영상조회수: 100,
    영상조회비용: 100,
    날짜: '2025-06-01',
    ...overrides,
  };
}

function records(count: number, overrides: Partial<XlsxRecord> = {}): XlsxRecord[] {
  return Array.from({ length: count }, () => record(overrides));
}

async function predictWithData(data: XlsxRecord[]) {
  vi.resetModules();
  vi.doMock('../../lib/regression', () => ({
    predictByRegression: vi.fn(() => regressionFallback),
  }));

  const loader = await import('../../lib/xlsxLoader');
  loader.setXlsxData(data);
  loader.setDemoData([]);

  const { predict } = await import('../../lib/predictor');
  return predict;
}

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

async function importPredictRangeRouteWithPrediction(localPrediction: Record<string, unknown>) {
  const predict = vi.fn(() => localPrediction);
  const routePath = join(process.cwd(), 'app', 'api', 'predict-range', 'route.ts');
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

  if (!routeModule.exports.POST) throw new Error('Missing POST export for predict-range');
  return routeModule.exports.POST;
}

describe('prediction data sufficiency contract', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('marks exact cohort matches as sufficient aggregate provenance', async () => {
    const predict = await predictWithData(records(10));

    const result = predict({
      industries: ['교육'],
      genders: ['female'],
      ageRanges: ['25-34'],
      objectives: ['OUTCOME_TRAFFIC'],
      budget: 10_000_000,
      monthFrom: '2025-06',
      monthTo: '2025-06',
    });

    expect(result.dataSufficiency).toEqual({
      status: 'sufficient',
      basis: 'exact_cohort',
      matchedCount: 10,
      minimumRequired: 10,
      warningCodes: [],
    });
  });

  it('reports demographic relaxation when exact age data is sparse', async () => {
    const predict = await predictWithData([
      ...records(5),
      ...records(10, { 연령: '35-44' }),
    ]);

    const result = predict({
      industries: ['교육'],
      genders: ['female'],
      ageRanges: ['25-34'],
      objectives: ['OUTCOME_TRAFFIC'],
      budget: 10_000_000,
    });

    expect(result.dataSufficiency).toMatchObject({
      status: 'relaxed',
      basis: 'relaxed_demographic',
      matchedCount: 15,
      minimumRequired: 10,
      warningCodes: ['RELAXED_COHORT_MATCH'],
    });
  });

  it('reports industry/objective relaxation before falling back globally', async () => {
    const predict = await predictWithData([
      ...records(4),
      ...records(10, { 업종: '뷰티' }),
    ]);

    const result = predict({
      industries: ['교육'],
      genders: ['female'],
      ageRanges: ['25-34'],
      objectives: ['OUTCOME_TRAFFIC'],
      budget: 10_000_000,
    });

    expect(result.dataSufficiency).toMatchObject({
      status: 'relaxed',
      basis: 'relaxed_industry_objective',
      matchedCount: 14,
      warningCodes: ['RELAXED_COHORT_MATCH'],
    });
  });

  it('uses date-window-only provenance when only the requested month window is sufficiently populated', async () => {
    const predict = await predictWithData(records(10, { 목표: 'OUTCOME_AWARENESS' }));

    const result = predict({
      industries: ['교육'],
      genders: ['female'],
      ageRanges: ['25-34'],
      objectives: ['OUTCOME_TRAFFIC'],
      budget: 10_000_000,
      monthFrom: '2025-06',
      monthTo: '2025-06',
    });

    expect(result.dataSufficiency).toMatchObject({
      status: 'relaxed',
      basis: 'date_window_only',
      matchedCount: 10,
      warningCodes: ['RELAXED_COHORT_MATCH'],
    });
  });

  it('marks global fallback and reversed ranges without exposing source details', async () => {
    const predict = await predictWithData(records(12, { 목표: 'OUTCOME_AWARENESS' }));

    const global = predict({
      industries: ['금융'],
      genders: ['male'],
      ageRanges: ['45-54'],
      objectives: ['OUTCOME_TRAFFIC'],
      budget: 10_000_000,
    });
    const reversed = predict({
      industries: ['교육'],
      genders: ['female'],
      ageRanges: ['25-34'],
      objectives: ['OUTCOME_TRAFFIC'],
      budget: 10_000_000,
      monthFrom: '2025-07',
      monthTo: '2025-06',
    });

    expect(global.dataSufficiency).toMatchObject({
      status: 'insufficient',
      basis: 'global_fallback',
      matchedCount: 12,
      warningCodes: ['RELAXED_COHORT_MATCH', 'GLOBAL_FALLBACK_USED'],
    });
    expect(reversed.dataSufficiency).toEqual({
      status: 'insufficient',
      basis: 'invalid_month_range',
      matchedCount: 0,
      minimumRequired: 10,
      warningCodes: ['REVERSED_MONTH_RANGE', 'INSUFFICIENT_MATCHED_DATA'],
    });

    const serialized = JSON.stringify({ global, reversed });
    expect(serialized).not.toMatch(/https?:\/\//i);
    expect(serialized).not.toMatch(/account|campaign|adset|token|cookie|session/i);
  });

  it('propagates aggregate sufficiency through predict-range without confidence fabrication', async () => {
    const dataSufficiency = {
      status: 'insufficient',
      basis: 'global_fallback',
      matchedCount: 12,
      minimumRequired: 10,
      warningCodes: ['RELAXED_COHORT_MATCH', 'GLOBAL_FALLBACK_USED'],
    };
    const POST = await importPredictRangeRouteWithPrediction({
      reach: 12_345,
      cpm: 1_200,
      cpc: 120,
      dataSufficiency,
    });

    const response = await POST(requestWithJson({
      industries: ['교육'],
      genders: [],
      ageRanges: ['35-44'],
      objectives: ['OUTCOME_TRAFFIC'],
      budget: 5_000_000,
      monthFrom: '2025-06',
      monthTo: '2025-06',
    }) as unknown as Request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(8);
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          budget: 1_000_000,
          dataSufficiency,
        }),
      ]),
    );
    expect(JSON.stringify(body)).not.toMatch(/confidence/i);
  });
});
