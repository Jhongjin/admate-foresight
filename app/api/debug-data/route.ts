import { NextResponse } from 'next/server';
import { ensureDataLoaded, loadXlsxData, loadDemoData } from '@/lib/xlsxLoader';

export async function GET() {
  try {
    await ensureDataLoaded();
    const monthly = loadXlsxData();
    const demo    = loadDemoData();

    const sample = monthly[0] ?? null;

    return NextResponse.json({
      monthly_count: monthly.length,
      demo_count:    demo.length,
      sample_row:    sample,
      cpm_nonzero:   monthly.filter(r => r.CPM > 0).length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
