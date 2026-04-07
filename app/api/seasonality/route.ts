import { NextRequest, NextResponse } from 'next/server';
import { getSeasonalityInsights } from '@/lib/trendsData';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const industriesParam = searchParams.get('industries');
    const industries = industriesParam ? industriesParam.split(',').filter(Boolean) : [];

    const data = getSeasonalityInsights(industries);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load seasonality data' }, { status: 500 });
  }
}
