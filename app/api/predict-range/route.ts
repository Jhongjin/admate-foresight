import { NextRequest, NextResponse } from 'next/server';
import { predict } from '@/lib/predictor';
import { ensureDataLoaded } from '@/lib/xlsxLoader';

const BUDGET_LEVELS = [
  1_000_000,
  5_000_000,
  10_000_000,
  30_000_000,
  100_000_000,
  300_000_000,
  500_000_000,
  1_000_000_000,
  3_000_000_000,
  5_000_000_000,
];

export async function POST(req: NextRequest) {
  try {
    await ensureDataLoaded();
    const body = await req.json();
    const {
      industries = [],
      genders = [],
      ageRanges = [],
      objectives = [],
      monthFrom,
      monthTo,
    } = body;

    const results = BUDGET_LEVELS.map((budget) => {
      const r = predict({ industries, genders, ageRanges, objectives, budget, monthFrom, monthTo });
      return { budget, reach: r.reach, cpm: r.cpm, cpc: r.cpc };
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 });
  }
}
