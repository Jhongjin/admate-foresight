import { NextRequest, NextResponse } from 'next/server';
import { predict } from '@/lib/predictor';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      industries = [],
      genders = [],
      ageRanges = [],
      objectives = [],
      budget = 10_000_000,
      month,
    } = body;

    const result = predict({ industries, genders, ageRanges, objectives, budget, month });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 });
  }
}
