import { AdRecord, loadAdData } from './csvLoader';

export interface PredictInput {
  industries: string[];  // [] = 전체
  genders: string[];     // [] = 전체
  ageRanges: string[];   // [] = 전체
  budget: number;
}

export interface PredictResult {
  reach: number;
  cpm: number;
  cpc: number;
  reachChange: number | null;
  cpmChange: number | null;
  cpcChange: number | null;
  matchedCount: number;
}

function filterRecords(
  data: AdRecord[],
  industries: string[],
  genders: string[],
  ageRanges: string[],
): AdRecord[] {
  return data.filter((r) => {
    if (industries.length > 0 && !industries.includes(r.업종)) return false;
    if (genders.length > 0 && !genders.includes(r.성별)) return false;
    if (ageRanges.length > 0 && !ageRanges.includes(r.연령)) return false;
    return true;
  });
}

function weightedAvgCPM(records: AdRecord[]): number {
  const totalImpressions = records.reduce((s, r) => s + r.노출, 0);
  if (totalImpressions === 0) return 0;
  return records.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImpressions;
}

function weightedAvgCPC(records: AdRecord[]): number {
  const totalClicks = records.reduce((s, r) => s + r.클릭, 0);
  if (totalClicks === 0) return 0;
  return records.reduce((s, r) => s + r.CPC * r.클릭, 0) / totalClicks;
}

function calcReach(records: AdRecord[], budget: number): number {
  const totalSpend = records.reduce((s, r) => s + r.지출금액, 0);
  const totalReach = records.reduce((s, r) => s + r.도달, 0);
  if (totalSpend === 0) return 0;
  return Math.round((totalReach / totalSpend) * budget);
}

export function predict(input: PredictInput): PredictResult {
  const data = loadAdData();
  const { industries, genders, ageRanges, budget } = input;

  // Primary match
  let matched = filterRecords(data, industries, genders, ageRanges);

  // Fallback: drop age filter
  if (matched.length === 0) {
    matched = filterRecords(data, industries, genders, []);
  }
  // Fallback: drop gender filter too
  if (matched.length === 0) {
    matched = filterRecords(data, industries, [], []);
  }
  // Fallback: all data
  if (matched.length === 0) {
    matched = data;
  }

  const reach = calcReach(matched, budget);
  const cpm = weightedAvgCPM(matched);
  const cpc = weightedAvgCPC(matched);

  // Previous month comparison
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const prevMatched = matched.filter((r) => r.보고종료.startsWith(prevMonthStr));

  let reachChange: number | null = null;
  let cpmChange: number | null = null;
  let cpcChange: number | null = null;

  if (prevMatched.length > 0) {
    const prevReach = calcReach(prevMatched, budget);
    const prevCPM = weightedAvgCPM(prevMatched);
    const prevCPC = weightedAvgCPC(prevMatched);
    if (prevReach > 0) reachChange = ((reach - prevReach) / prevReach) * 100;
    if (prevCPM > 0) cpmChange = ((cpm - prevCPM) / prevCPM) * 100;
    if (prevCPC > 0) cpcChange = ((cpc - prevCPC) / prevCPC) * 100;
  }

  return {
    reach,
    cpm: Math.round(cpm),
    cpc: Math.round(cpc),
    reachChange,
    cpmChange,
    cpcChange,
    matchedCount: matched.length,
  };
}
