import { NextRequest, NextResponse } from 'next/server';
import { predict } from '@/lib/predictor';

const BUDGET_LEVELS = [
  1_000_000,
  3_000_000,
  5_000_000,
  10_000_000,
  20_000_000,
  30_000_000,
  50_000_000,
  100_000_000,
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      industries = [],
      genders = [],
      ageRanges = [],
    } = body;

    const results = BUDGET_LEVELS.map((budget) => {
      const r = predict({ industries, genders, ageRanges, budget });
      return { budget, reach: r.reach, cpm: r.cpm, cpc: r.cpc };
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 });
  }
}
