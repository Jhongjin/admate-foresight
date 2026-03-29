import { NextResponse } from 'next/server';
import { getSeasonInsights } from '@/lib/trendsData';

export async function GET() {
  try {
    const data = getSeasonInsights();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 });
  }
}
