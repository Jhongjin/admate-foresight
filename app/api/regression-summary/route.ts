import { NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { getRegressionSummary } from '@/lib/regression';
import { ensureDataLoaded } from '@/lib/xlsxLoader';

export async function GET() {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  try {
    await ensureDataLoaded();
    const summary = getRegressionSummary();
    return NextResponse.json(summary);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Regression summary failed' }, { status: 500 });
  }
}
