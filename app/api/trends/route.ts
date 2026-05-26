import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { ensureDataLoaded } from '@/lib/xlsxLoader';
import { getTrends } from '@/lib/trendsData';

function jsonNoStore(body: unknown, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

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
    const data = getTrends(industries, genders, ageRanges, objectives);
    return jsonNoStore(data);
  } catch {
    console.error('[trends] failed');
    return jsonNoStore({ error: 'Failed to load trends' }, { status: 500 });
  }
}
