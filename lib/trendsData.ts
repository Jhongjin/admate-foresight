import { loadXlsxData, loadDemoData, XlsxRecord } from './xlsxLoader';

export interface TrendPoint {
  month: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
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
    totalSpend: records.reduce((s, r) => s + r.지출금액, 0),
    totalImpressions,
    totalClicks: Math.round(totalClicks),
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
  const data = loadDemoData();  // 성별/연령 전용 캐시
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

// ── 시즈널리티 분석 ────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 정의된 시즌 이벤트 목록 */
const SEASONAL_EVENTS = [
  {
    id: 'seollal_2026',
    name: '설명절',
    emoji: '🧧',
    eventStart: '2026-02-14',
    eventEnd: '2026-02-18',
    description: '음력 설날 연휴',
  },
  {
    id: 'valentine_2026',
    name: '밸런타인데이',
    emoji: '💝',
    eventStart: '2026-02-14',
    eventEnd: '2026-02-14',
    description: '초콜릿·선물 시즌',
  },
];

const WINDOW_DAYS = 14;

function aggregateWindow(records: XlsxRecord[]) {
  if (records.length === 0) {
    return { avgCPM: 0, avgCPC: 0, avgCTR: 0, avgVTR: 0, totalSpend: 0, totalReach: 0, count: 0 };
  }
  const totalImpressions = records.reduce((s, r) => s + r.노출, 0);
  const totalSpend       = records.reduce((s, r) => s + r.지출금액, 0);
  const totalReach       = records.reduce((s, r) => s + r.도달, 0);

  const avgCPM = totalImpressions > 0
    ? records.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImpressions : 0;

  const clickRecs  = records.filter((r) => r.CPC > 0);
  const clickSpend = clickRecs.reduce((s, r) => s + r.지출금액, 0);
  const avgCPC = clickSpend > 0
    ? clickRecs.reduce((s, r) => s + r.CPC * r.지출금액, 0) / clickSpend : 0;

  const totalClicks = clickRecs.reduce((s, r) => s + r.지출금액 / r.CPC, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const videoRecs       = records.filter((r) => r.영상조회수 > 0 && r.노출 > 0);
  const videoImpressions = videoRecs.reduce((s, r) => s + r.노출, 0);
  const videoViews       = videoRecs.reduce((s, r) => s + r.영상조회수, 0);
  const avgVTR = videoImpressions > 0 ? (videoViews / videoImpressions) * 100 : 0;

  return {
    avgCPM:    Math.round(avgCPM),
    avgCPC:    Math.round(avgCPC),
    avgCTR:    parseFloat(avgCTR.toFixed(3)),
    avgVTR:    parseFloat(avgVTR.toFixed(3)),
    totalSpend,
    totalReach,
    count: records.length,
  };
}

export interface SeasonalityWindow {
  dateRange: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  avgVTR: number;
  totalSpend: number;
  totalReach: number;
  count: number;
}

export interface SeasonalityEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  eventStart: string;
  eventEnd: string;
  before: SeasonalityWindow;
  during: SeasonalityWindow;
  after: SeasonalityWindow;
  // 전 대비 변화율 (%)
  cpmChange: number | null;
  cpcChange: number | null;
  ctrChange: number | null;
  vtrChange: number | null;
}

function pctChange(before: number, during: number): number | null {
  if (before === 0) return null;
  return parseFloat((((during - before) / before) * 100).toFixed(1));
}

export function getSeasonalityInsights(industries: string[] = []): SeasonalityEvent[] {
  const data = loadXlsxData();
  const filtered = industries.length > 0
    ? data.filter((r) => industries.includes(r.업종))
    : data;

  return SEASONAL_EVENTS.map((event) => {
    const beforeStart = addDays(event.eventStart, -WINDOW_DAYS);
    const beforeEnd   = addDays(event.eventStart, -1);
    const afterStart  = addDays(event.eventEnd, 1);
    const afterEnd    = addDays(event.eventEnd, WINDOW_DAYS);

    // 날짜가 YYYY-MM 월별 집계일 경우 앞 7자리(월)로 비교
    const toMonth = (d: string) => d.substring(0, 7);
    const rMonth  = (r: XlsxRecord) => r.날짜.length === 7 ? r.날짜 : r.날짜.substring(0, 7);
    const usesMonthly = filtered.length > 0 && filtered[0].날짜.length === 7;

    const beforeData = usesMonthly
      ? filtered.filter((r) => rMonth(r) >= toMonth(beforeStart) && rMonth(r) <= toMonth(beforeEnd))
      : filtered.filter((r) => r.날짜 >= beforeStart && r.날짜 <= beforeEnd);
    const duringData = usesMonthly
      ? filtered.filter((r) => rMonth(r) >= toMonth(event.eventStart) && rMonth(r) <= toMonth(event.eventEnd))
      : filtered.filter((r) => r.날짜 >= event.eventStart && r.날짜 <= event.eventEnd);
    const afterData = usesMonthly
      ? filtered.filter((r) => rMonth(r) >= toMonth(afterStart) && rMonth(r) <= toMonth(afterEnd))
      : filtered.filter((r) => r.날짜 >= afterStart && r.날짜 <= afterEnd);

    const before = { dateRange: `${beforeStart} ~ ${beforeEnd}`, ...aggregateWindow(beforeData) };
    const during = { dateRange: `${event.eventStart} ~ ${event.eventEnd}`, ...aggregateWindow(duringData) };
    const after  = { dateRange: `${afterStart} ~ ${afterEnd}`,  ...aggregateWindow(afterData) };

    return {
      id: event.id,
      name: event.name,
      emoji: event.emoji,
      description: event.description,
      eventStart: event.eventStart,
      eventEnd: event.eventEnd,
      before,
      during,
      after,
      cpmChange: pctChange(before.avgCPM, during.avgCPM),
      cpcChange: pctChange(before.avgCPC, during.avgCPC),
      ctrChange: pctChange(before.avgCTR, during.avgCTR),
      vtrChange: pctChange(before.avgVTR, during.avgVTR),
    };
  });
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
      return { month, industry, ...agg };
    });
}
