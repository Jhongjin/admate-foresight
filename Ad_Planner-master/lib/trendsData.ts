import { loadAdData } from './csvLoader';

export interface TrendPoint {
  month: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  count: number;
}

export interface IndustryTrend {
  industry: string;
  trends: TrendPoint[];
}

export interface SeasonInsight {
  month: string;
  industry: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  totalSpend: number;
  count: number;
}

export function getTrends(
  industries: string[] = [],
  genders: string[] = [],
  ageRanges: string[] = [],
): IndustryTrend[] {
  const data = loadAdData();

  let filtered = data;
  if (genders.length > 0) filtered = filtered.filter((r) => genders.includes(r.성별));
  if (ageRanges.length > 0) filtered = filtered.filter((r) => ageRanges.includes(r.연령));

  const allIndustries = industries.length > 0
    ? industries
    : [...new Set(filtered.map((r) => r.업종))];

  return allIndustries.map((ind) => {
    const indData = filtered.filter((r) => r.업종 === ind);

    // Group by month (보고종료 기준)
    const monthMap = new Map<string, typeof indData>();
    for (const r of indData) {
      const month = r.보고종료.slice(0, 7); // YYYY-MM
      if (!month) continue;
      if (!monthMap.has(month)) monthMap.set(month, []);
      monthMap.get(month)!.push(r);
    }

    const trends: TrendPoint[] = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, records]) => {
        const totalImpressions = records.reduce((s, r) => s + r.노출, 0);
        const totalClicks = records.reduce((s, r) => s + r.클릭, 0);
        const avgCPM = totalImpressions > 0
          ? records.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImpressions
          : 0;
        const avgCPC = totalClicks > 0
          ? records.reduce((s, r) => s + r.CPC * r.클릭, 0) / totalClicks
          : 0;
        const avgCTR = records.length > 0
          ? records.reduce((s, r) => s + r.CTR, 0) / records.length * 100
          : 0;
        const totalReach = records.reduce((s, r) => s + r.도달, 0);

        return {
          month,
          avgCPM: Math.round(avgCPM),
          avgCPC: Math.round(avgCPC),
          avgCTR: parseFloat(avgCTR.toFixed(4)),
          totalReach,
          count: records.length,
        };
      });

    return { industry: ind, trends };
  });
}

export interface BreakdownRow {
  group: string;       // gender or ageRange value
  industry: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  count: number;
}

export interface EfficiencyRank {
  industry: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  cpmRank: number;
  cpcRank: number;
  ctrRank: number;
}

export function getBreakdown(industries: string[] = [], genders: string[] = [], ageRanges: string[] = []): {
  byGender: BreakdownRow[];
  byAge: BreakdownRow[];
  efficiencyRanks: EfficiencyRank[];
} {
  const data = loadAdData();
  let filtered = industries.length > 0 ? data.filter((r) => industries.includes(r.업종)) : data;
  if (genders.length > 0) filtered = filtered.filter((r) => genders.includes(r.성별));
  if (ageRanges.length > 0) filtered = filtered.filter((r) => ageRanges.includes(r.연령));

  const allIndustries = [...new Set(filtered.map((r) => r.업종))];

  function aggregate(
    records: typeof data,
    groupKey: (r: typeof data[0]) => string,
    ind: string,
  ): BreakdownRow {
    const totalImpressions = records.reduce((s, r) => s + r.노출, 0);
    const totalClicks = records.reduce((s, r) => s + r.클릭, 0);
    const avgCPM = totalImpressions > 0
      ? records.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImpressions : 0;
    const avgCPC = totalClicks > 0
      ? records.reduce((s, r) => s + r.CPC * r.클릭, 0) / totalClicks : 0;
    const avgCTR = records.length > 0
      ? records.reduce((s, r) => s + r.CTR, 0) / records.length * 100 : 0;
    return {
      group: groupKey(records[0]),
      industry: ind,
      avgCPM: Math.round(avgCPM),
      avgCPC: Math.round(avgCPC),
      avgCTR: parseFloat(avgCTR.toFixed(4)),
      totalReach: records.reduce((s, r) => s + r.도달, 0),
      count: records.length,
    };
  }

  const byGender: BreakdownRow[] = [];
  const byAge: BreakdownRow[] = [];

  for (const ind of allIndustries) {
    const indData = filtered.filter((r) => r.업종 === ind);
    const indGenders = [...new Set(indData.map((r) => r.성별))];
    const ages = [...new Set(indData.map((r) => r.연령))];

    for (const g of indGenders) {
      const recs = indData.filter((r) => r.성별 === g);
      if (recs.length > 0) byGender.push(aggregate(recs, () => g, ind));
    }
    for (const a of ages) {
      const recs = indData.filter((r) => r.연령 === a);
      if (recs.length > 0) byAge.push(aggregate(recs, () => a, ind));
    }
  }

  // Efficiency ranks (all industries, no gender/age filter)
  const allIndustriesForRank = [...new Set(data.map((r) => r.업종))];
  const indStats = allIndustriesForRank.map((ind) => {
    const recs = data.filter((r) => r.업종 === ind);
    const totalImpressions = recs.reduce((s, r) => s + r.노출, 0);
    const totalClicks = recs.reduce((s, r) => s + r.클릭, 0);
    return {
      industry: ind,
      avgCPM: Math.round(totalImpressions > 0 ? recs.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImpressions : 0),
      avgCPC: Math.round(totalClicks > 0 ? recs.reduce((s, r) => s + r.CPC * r.클릭, 0) / totalClicks : 0),
      avgCTR: parseFloat((recs.length > 0 ? recs.reduce((s, r) => s + r.CTR, 0) / recs.length * 100 : 0).toFixed(4)),
      totalReach: recs.reduce((s, r) => s + r.도달, 0),
    };
  });

  const sortedByCPM = [...indStats].sort((a, b) => a.avgCPM - b.avgCPM);
  const sortedByCPC = [...indStats].sort((a, b) => a.avgCPC - b.avgCPC);
  const sortedByCTR = [...indStats].sort((a, b) => b.avgCTR - a.avgCTR);

  const efficiencyRanks: EfficiencyRank[] = indStats.map((s) => ({
    ...s,
    cpmRank: sortedByCPM.findIndex((x) => x.industry === s.industry) + 1,
    cpcRank: sortedByCPC.findIndex((x) => x.industry === s.industry) + 1,
    ctrRank: sortedByCTR.findIndex((x) => x.industry === s.industry) + 1,
  }));

  const AGE_ORDER = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  byAge.sort((a, b) => AGE_ORDER.indexOf(a.group) - AGE_ORDER.indexOf(b.group));

  return { byGender, byAge, efficiencyRanks };
}

export function getSeasonInsights(): SeasonInsight[] {
  const data = loadAdData();

  const groupMap = new Map<string, typeof data>();
  for (const r of data) {
    const month = r.보고종료.slice(0, 7);
    if (!month) continue;
    const key = `${month}__${r.업종}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(r);
  }

  return [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, records]) => {
      const [month, industry] = key.split('__');
      const totalImpressions = records.reduce((s, r) => s + r.노출, 0);
      const totalClicks = records.reduce((s, r) => s + r.클릭, 0);
      const avgCPM = totalImpressions > 0
        ? records.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImpressions
        : 0;
      const avgCPC = totalClicks > 0
        ? records.reduce((s, r) => s + r.CPC * r.클릭, 0) / totalClicks
        : 0;
      const avgCTR = records.length > 0
        ? records.reduce((s, r) => s + r.CTR, 0) / records.length * 100
        : 0;
      const totalReach = records.reduce((s, r) => s + r.도달, 0);
      const totalSpend = records.reduce((s, r) => s + r.지출금액, 0);

      return {
        month,
        industry,
        avgCPM: Math.round(avgCPM),
        avgCPC: Math.round(avgCPC),
        avgCTR: parseFloat(avgCTR.toFixed(4)),
        totalReach,
        totalSpend,
        count: records.length,
      };
    });
}
