import { NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { ensureDataLoaded } from '@/lib/xlsxLoader';
import { getSeasonInsights } from '@/lib/trendsData';

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
    return jsonNoStore(data);
  } catch {
    console.error('[insights] failed');
    return jsonNoStore({ error: 'Failed to load insights' }, { status: 500 });
  }
}
