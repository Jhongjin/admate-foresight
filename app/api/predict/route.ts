import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { predict } from '@/lib/predictor';
import { normalizePredictionRequest, PredictionRequestValidationError } from '@/lib/predictionRequest';
import { ensureDataLoaded } from '@/lib/xlsxLoader';

export async function POST(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  try {
    await ensureDataLoaded();
    const body = await req.json();
    const input = normalizePredictionRequest(body, { defaultBudget: 10_000_000 });

    const result = predict(input);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PredictionRequestValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 });
  }
}
