import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { predict } from '@/lib/predictor';
import { normalizePredictionRequest, PredictionRequestValidationError } from '@/lib/predictionRequest';
import { ensureDataLoaded } from '@/lib/xlsxLoader';

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
    const body = await req.json();
    const input = normalizePredictionRequest(body, { defaultBudget: 10_000_000 });

    const result = predict(input);
    return jsonNoStore(result);
  } catch (err) {
    if (err instanceof PredictionRequestValidationError) {
      return jsonNoStore({ error: 'Invalid prediction request.' }, { status: 400 });
    }
    console.error('[predict] failed');
    return jsonNoStore({ error: 'Prediction failed' }, { status: 500 });
  }
}
