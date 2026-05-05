import { NextResponse } from 'next/server';
import { blockProductionDebugRoute, sanitizeError } from '@/lib/security';
import { ensureDataLoaded, loadXlsxData, loadDemoData } from '@/lib/xlsxLoader';

export async function GET() {
  const blocked = blockProductionDebugRoute();
  if (blocked) return blocked;

  try {
    await ensureDataLoaded();
    const monthly = loadXlsxData();
    const demo    = loadDemoData();

    // 업종 분포 (상위 30개)
    const industryCount: Record<string, number> = {};
    for (const r of monthly) {
      const k = r.업종 || '(empty)';
      industryCount[k] = (industryCount[k] ?? 0) + 1;
    }
    const topIndustries = Object.entries(industryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([k, v]) => ({ industry: k, count: v }));

    // 목표 분포
    const objectiveCount: Record<string, number> = {};
    for (const r of monthly) {
      const k = r.목표 || '(empty)';
      objectiveCount[k] = (objectiveCount[k] ?? 0) + 1;
    }

    return NextResponse.json({
      monthly_count:    monthly.length,
      demo_count:       demo.length,
      cpm_nonzero:      monthly.filter(r => r.CPM > 0).length,
      industry_unique:  Object.keys(industryCount).length,
      top_industries:   topIndustries,
      objective_dist:   objectiveCount,
    });
  } catch (err) {
    console.error('[debug-data] failed:', sanitizeError(err));
    return NextResponse.json({ error: 'Failed to load debug data' }, { status: 500 });
  }
}
