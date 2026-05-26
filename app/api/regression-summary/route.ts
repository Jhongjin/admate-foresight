import { NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { getRegressionSummary } from '@/lib/regression';
import { ensureDataLoaded } from '@/lib/xlsxLoader';

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
    const summary = getRegressionSummary();
    return jsonNoStore(summary);
  } catch {
    console.error('[regression-summary] failed');
    return jsonNoStore({ error: 'Regression summary failed' }, { status: 500 });
  }
}
