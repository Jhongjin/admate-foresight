import { NextResponse } from 'next/server';
import { getRegressionSummary } from '@/lib/regression';
import { ensureDataLoaded } from '@/lib/xlsxLoader';

export async function GET() {
  try {
    await ensureDataLoaded();
    const summary = getRegressionSummary();
    return NextResponse.json(summary);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Regression summary failed' }, { status: 500 });
  }
}
