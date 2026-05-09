import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { ensureDataLoaded } from '@/lib/xlsxLoader';
import { getBreakdown } from '@/lib/trendsData';

function parseList(val: string | null): string[] {
  if (!val) return [];
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(req.url);
    const industries = parseList(searchParams.get('industries'));
    const genders    = parseList(searchParams.get('genders'));
    const ageRanges  = parseList(searchParams.get('ageRanges'));
    const objectives = parseList(searchParams.get('objectives'));

    await ensureDataLoaded();
    const data = getBreakdown(industries, genders, ageRanges, objectives);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
