import { loadXlsxData, XlsxRecord } from './xlsxLoader';

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

function filterData(
  data: XlsxRecord[],
  industries: string[],
  genders: string[],
  ageRanges: string[],
  objectives: string[],
): XlsxRecord[] {
  let filtered = data;
  if (objectives.length > 0) filtered = filtered.filter((r) => objectives.includes(r.목표));
  if (industries.length > 0) filtered = filtered.filter((r) => industries.includes(r.업종));
  if (genders.length > 0) filtered = filtered.filter((r) => genders.includes(r.성별));
  if (ageRanges.length > 0) filtered = filtered.filter((r) => ageRanges.includes(r.연령));
  return filtered;
}

// CTR 집계: clicks = spend / CPC (CPC>0인 행만)
function aggregateMonthRecords(records: XlsxRecord[]): Omit<TrendPoint, 'month'> {
  const totalImpressions = records.reduce((s, r) => s + r.노출, 0);
  const totalSpend = records.reduce((s, r) => s + r.지출금액, 0);
  const totalReach = records.reduce((s, r) => s + r.도달, 0);

  // 가중평균 CPM (노출 기준)
  const avgCPM = totalImpressions > 0
    ? records.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImpressions
    : 0;

  // 가중평균 CPC (지출 기준, CPC>0 행만)
  const clickRecs = records.filter((r) => r.CPC > 0);
  const clickSpend = clickRecs.reduce((s, r) => s + r.지출금액, 0);
  const avgCPC = clickSpend > 0
    ? clickRecs.reduce((s, r) => s + r.CPC * r.지출금액, 0) / clickSpend
    : 0;

  // CTR = 총클릭 / 총노출 (클릭 = spend / CPC)
  const totalClicks = clickRecs.reduce((s, r) => s + r.지출금액 / r.CPC, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return {
    avgCPM: Math.round(avgCPM),
    avgCPC: Math.round(avgCPC),
    avgCTR: parseFloat(avgCTR.toFixed(4)),
    totalReach,
    count: records.length,
  };
}

export function getTrends(
  industries: string[] = [],
  genders: string[] = [],
  ageRanges: string[] = [],
  objectives: string[] = [],
): IndustryTrend[] {
  const data = loadXlsxData();
  const filtered = filterData(data, [], genders, ageRanges, objectives);

  const allIndustries = industries.length > 0
    ? industries
    : [...new Set(filtered.map((r) => r.업종))].sort();

  return allIndustries.map((ind) => {
    const indData = filtered.filter((r) => r.업종 === ind);

    const monthMap = new Map<string, XlsxRecord[]>();
    for (const r of indData) {
      const month = r.날짜.slice(0, 7);
      if (!month) continue;
      if (!monthMap.has(month)) monthMap.set(month, []);
      monthMap.get(month)!.push(r);
    }

    const trends: TrendPoint[] = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, records]) => ({ month, ...aggregateMonthRecords(records) }));

    return { industry: ind, trends };
  });
}

export interface BreakdownRow {
  group: string;
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

export function getBreakdown(
  industries: string[] = [],
  genders: string[] = [],
  ageRanges: string[] = [],
  objectives: string[] = [],
): {
  byGender: BreakdownRow[];
  byAge: BreakdownRow[];
  efficiencyRanks: EfficiencyRank[];
} {
  const data = loadXlsxData();
  const filtered = filterData(data, industries, genders, ageRanges, objectives);

  const allIndustries = [...new Set(filtered.map((r) => r.업종))];

  const byGender: BreakdownRow[] = [];
  const byAge: BreakdownRow[] = [];

  for (const ind of allIndustries) {
    const indData = filtered.filter((r) => r.업종 === ind);

    for (const g of [...new Set(indData.map((r) => r.성별))]) {
      const recs = indData.filter((r) => r.성별 === g);
      if (recs.length > 0) {
        byGender.push({ group: g, industry: ind, ...aggregateMonthRecords(recs) });
      }
    }
    for (const a of [...new Set(indData.map((r) => r.연령))]) {
      const recs = indData.filter((r) => r.연령 === a);
      if (recs.length > 0) {
        byAge.push({ group: a, industry: ind, ...aggregateMonthRecords(recs) });
      }
    }
  }

  // 효율 순위: objectives 필터 적용 (전체 업종 기준)
  const rankData = filterData(data, [], [], [], objectives);
  const allIndustriesForRank = [...new Set(rankData.map((r) => r.업종))];
  const indStats = allIndustriesForRank.map((ind) => {
    const recs = rankData.filter((r) => r.업종 === ind);
    const agg = aggregateMonthRecords(recs);
    return { industry: ind, ...agg };
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
  const data = loadXlsxData();

  const groupMap = new Map<string, XlsxRecord[]>();
  for (const r of data) {
    const month = r.날짜.slice(0, 7);
    if (!month) continue;
    const key = `${month}__${r.업종}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(r);
  }

  return [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, records]) => {
      const [month, industry] = key.split('__');
      const agg = aggregateMonthRecords(records);
      const totalSpend = records.reduce((s, r) => s + r.지출금액, 0);
      return { month, industry, totalSpend, ...agg };
    });
}
