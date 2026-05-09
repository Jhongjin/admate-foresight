import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { predict } from '@/lib/predictor';
import { ensureDataLoaded } from '@/lib/xlsxLoader';

export async function POST(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  try {
    await ensureDataLoaded();
    const body = await req.json();
    const {
      industries = [],
      genders = [],
      ageRanges = [],
      objectives = [],
      budget = 10_000_000,
      monthFrom,
      monthTo,
    } = body;

    const result = predict({ industries, genders, ageRanges, objectives, budget, monthFrom, monthTo });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 });
  }
}
