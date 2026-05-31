import { NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { ensureDataLoaded } from '@/lib/xlsxLoader';
import { getSeasonInsights } from '@/lib/trendsData';
import { normalizeInsightsRouteOutput } from '@/lib/foresightInsightsRouteOutputContract';

function jsonNoStore(body: unknown, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

export async function GET() {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  try {
    await ensureDataLoaded();
    const data = getSeasonInsights();
    const normalizedData = normalizeInsightsRouteOutput(data);
    return jsonNoStore(normalizedData);
  } catch {
    console.error('[insights] failed');
    return jsonNoStore({ error: 'Failed to load insights' }, { status: 500 });
  }
}
