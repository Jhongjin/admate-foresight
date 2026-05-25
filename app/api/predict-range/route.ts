import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { predict } from '@/lib/predictor';
import { ensureDataLoaded, loadXlsxData } from '@/lib/xlsxLoader';

// 기본 구간 (1억 이하)
const BASE_LEVELS = [
  1_000_000,
  3_000_000,
  5_000_000,
  10_000_000,
  20_000_000,
  30_000_000,
  50_000_000,
  100_000_000,
];

// 1억 초과 구간 후보
const HIGHER_LEVELS = [
  200_000_000,
  300_000_000,
  500_000_000,
  1_000_000_000,
  2_000_000_000,
  3_000_000_000,
  5_000_000_000,
];

function buildLevels(budget: number): number[] {
  const levels = budget <= 100_000_000
    ? [...BASE_LEVELS]
    : [...BASE_LEVELS, ...HIGHER_LEVELS.filter((l) => l < budget)];

  if (budget > 0 && !levels.includes(budget)) levels.push(budget);
  return levels.sort((a, b) => a - b);
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
    const {
      industries = [],
      genders = [],
      ageRanges = [],
      objectives = [],
      budget: currentMonthlyBudget = 0,
      monthFrom,
      monthTo,
    } = body;

    // /api/predict와 동일하게 월 환산 예산을 기준으로 구간을 계산한다.
    const levels = buildLevels(currentMonthlyBudget);

    const results = levels.map((monthlyBudget) => {
      const r = predict({ industries, genders, ageRanges, objectives, budget: monthlyBudget, monthFrom, monthTo });
      return { budget: monthlyBudget, reach: r.reach, cpm: r.cpm, cpc: r.cpc };
    });

    const dataLoaded = loadXlsxData().length > 0;
    console.log(`[predict-range] 완료: ${results.length}구간, 데이터로딩=${dataLoaded}, 첫 reach=${results[0]?.reach}`);

    return NextResponse.json(results);
  } catch (err) {
    console.error('[predict-range] 오류:', err);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 });
  }
}
