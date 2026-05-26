import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { buildPredictRangeLevels } from '@/lib/predictRangeLevels';
import { predict } from '@/lib/predictor';
import { normalizePredictionRequest, PredictionRequestValidationError } from '@/lib/predictionRequest';
import { ensureDataLoaded, loadXlsxData } from '@/lib/xlsxLoader';

function jsonNoStore(body: unknown, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

export async function POST(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  try {
    await ensureDataLoaded();

    // 데이터 로딩 실패 시 1회 재시도
    if (loadXlsxData().length === 0) {
      console.warn('[predict-range] 데이터 로딩 실패, 재시도...');
      await ensureDataLoaded();
    }

    const body = await req.json();
    const input = normalizePredictionRequest(body);
    const { budget: currentMonthlyBudget } = input;

    // /api/predict와 동일하게 월 환산 예산을 기준으로 구간을 계산한다.
    const levels = buildPredictRangeLevels(currentMonthlyBudget);

    const results = levels.map((monthlyBudget) => {
      const r = predict({ ...input, budget: monthlyBudget });
      return {
        budget: monthlyBudget,
        reach: r.reach,
        cpm: r.cpm,
        cpc: r.cpc,
        dataSufficiency: r.dataSufficiency,
      };
    });

    const dataLoaded = loadXlsxData().length > 0;
    console.log(`[predict-range] 완료: ${results.length}구간, 데이터로딩=${dataLoaded}, 첫 reach=${results[0]?.reach}`);

    return jsonNoStore(results);
  } catch (err) {
    if (err instanceof PredictionRequestValidationError) {
      return jsonNoStore({ error: 'Invalid prediction request.' }, { status: 400 });
    }
    console.error('[predict-range] failed');
    return jsonNoStore({ error: 'Prediction failed' }, { status: 500 });
  }
}
