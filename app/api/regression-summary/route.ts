import { NextResponse } from 'next/server';
import { getRegressionSummary } from '@/lib/regression';

export async function GET() {
  try {
    const summary = getRegressionSummary();
    return NextResponse.json(summary);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Regression summary failed' }, { status: 500 });
  }
}
