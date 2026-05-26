import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { ensureDataLoaded } from '@/lib/xlsxLoader';
import { getSeasonalityInsights } from '@/lib/trendsData';

function jsonNoStore(body: unknown, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

export async function GET(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(req.url);
    const industriesParam = searchParams.get('industries');
    const industries = industriesParam ? industriesParam.split(',').filter(Boolean) : [];

    await ensureDataLoaded();
    const data = getSeasonalityInsights(industries);
    return jsonNoStore(data);
  } catch {
    console.error('[seasonality] failed');
    return jsonNoStore({ error: 'Failed to load seasonality data' }, { status: 500 });
  }
}
