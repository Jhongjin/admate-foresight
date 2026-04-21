import { NextResponse } from 'next/server';
import { ensureDataLoaded } from '@/lib/xlsxLoader';
import { getSeasonInsights } from '@/lib/trendsData';

export async function GET() {
  try {
    await ensureDataLoaded();
    const data = getSeasonInsights();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 });
  }
}
