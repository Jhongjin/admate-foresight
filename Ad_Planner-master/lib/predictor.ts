import { loadAdData } from './csvLoader';
import { XlsxRecord, loadXlsxData } from './xlsxLoader';

export interface PredictInput {
  industries: string[];
  genders: string[];
  ageRanges: string[];
  objectives: string[];   // 신규: 캠페인 목표
  budget: number;
}

export interface PredictResult {
  reach: number;
  cpm: number;
  cpc: number;          // CPC(전체)
  cpcLink: number;      // CPC(링크)
  cpv: number;          // 동영상 3초 조회당 비용
  vtr: number;          // VTR(3s) %
  frequency: number;
  reachChange: number | null;
  cpmChange: number | null;
  cpcChange: number | null;
  matchedCount: number;
}

// ── 상수 ──────────────────────────────────────────────
// BETA: diminishing returns 지수 (0.864)
// FREQ_GAMMA: 빈도(frequency)의 예산 탄력성 (0.044, 132개 캠페인 log-log 회귀, R²=0.024)
// 총 도달 지수 = BETA - FREQ_GAMMA = 0.864 - 0.044 = 0.820 (지출 구간 데이터 피팅값 유지)
const BETA = 0.864;
const FREQ_GAMMA = 0.044;
const REF_BUDGET = 1_000_000; // 100만원 기준

// ── XLSX 필터 ─────────────────────────────────────────
function filterXlsx(
  data: XlsxRecord[],
  industries: string[],
  genders: string[],
  ageRanges: string[],
  objectives: string[],
): XlsxRecord[] {
  return data.filter((r) => {
    if (objectives.length > 0 && !objectives.includes(r.목표)) return false;
    if (industries.length > 0 && !industries.includes(r.업종)) return false;
    if (genders.length > 0 && !genders.includes(r.성별)) return false;
    if (ageRanges.length > 0 && !ageRanges.includes(r.연령)) return false;
    return true;
  });
}

// ── 가중평균 계산 ─────────────────────────────────────
function weightedCPM(records: XlsxRecord[]): number {
  const totalImp = records.reduce((s, r) => s + r.노출, 0);
  if (totalImp === 0) return 0;
  return records.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImp;
}

function weightedCPC(records: XlsxRecord[]): number {
  // CPC가 0인 행(클릭 없는 인지도 캠페인)은 제외
  const clickRecs = records.filter((r) => r.CPC > 0);
  if (clickRecs.length === 0) return 0;
  const clickSpend = clickRecs.reduce((s, r) => s + r.지출금액, 0);
  if (clickSpend === 0) return 0;
  return clickRecs.reduce((s, r) => s + r.CPC * r.지출금액, 0) / clickSpend;
}

function weightedCPCLink(records: XlsxRecord[]): number {
  const recs = records.filter((r) => r.CPC링크 > 0);
  if (recs.length === 0) return 0;
  const totalSpend = recs.reduce((s, r) => s + r.지출금액, 0);
  if (totalSpend === 0) return 0;
  return recs.reduce((s, r) => s + r.CPC링크 * r.지출금액, 0) / totalSpend;
}

function weightedCPV(records: XlsxRecord[]): number {
  const recs = records.filter((r) => r.영상조회비용 > 0);
  if (recs.length === 0) return 0;
  const totalSpend = recs.reduce((s, r) => s + r.지출금액, 0);
  if (totalSpend === 0) return 0;
  return recs.reduce((s, r) => s + r.영상조회비용 * r.지출금액, 0) / totalSpend;
}

function calcVTR(records: XlsxRecord[]): number {
  const totalImp = records.reduce((s, r) => s + r.노출, 0);
  const totalViews = records.reduce((s, r) => s + r.영상조회수, 0);
  if (totalImp === 0) return 0;
  return (totalViews / totalImp) * 100;
}

// frequency를 reach 가중치로 평균
// 수학적으로: Σ(freq_i × reach_i) / Σ(reach_i) = Σ(impressions_i) / Σ(reach_i)
// = 집계 빈도와 동일
function weightedFrequency(records: XlsxRecord[]): number {
  const totalReach = records.reduce((s, r) => s + r.도달, 0);
  if (totalReach === 0) return 1;
  return records.reduce((s, r) => s + r.빈도 * r.도달, 0) / totalReach;
}

// ── 핵심 도달 계산 ────────────────────────────────────
function calcReach(records: XlsxRecord[], budget: number): {
  reach: number;
  cpm: number;
  cpc: number;
  cpcLink: number;
  cpv: number;
  vtr: number;
  frequency: number;
} {
  const cpm = weightedCPM(records);
  const cpc = weightedCPC(records);
  const cpcLink = weightedCPCLink(records);
  const cpv = weightedCPV(records);
  const vtr = calcVTR(records);
  const baseFreq = weightedFrequency(records);

  // 예산 반영 빈도: 예산이 클수록 동일인에게 더 자주 노출됨 (γ=0.044)
  const adjustedFreq = baseFreq * Math.pow(budget / REF_BUDGET, FREQ_GAMMA);

  if (cpm === 0 || adjustedFreq === 0) return { reach: 0, cpm: 0, cpc: 0, cpcLink, cpv, vtr, frequency: Math.round(adjustedFreq * 100) / 100 };

  // 메타 공식: 도달 = (예산 / CPM × 1000) / 예산반영빈도
  const linearReach = (budget / cpm) * 1000 / adjustedFreq;

  // Diminishing returns 보정 (BETA=0.864, 총 지수 = 0.864-0.044 = 0.820 유지)
  const diminishingFactor = budget > 0
    ? Math.pow(budget / REF_BUDGET, BETA - 1)
    : 1;

  return {
    reach: Math.round(linearReach * diminishingFactor),
    cpm: Math.round(cpm),
    cpc: Math.round(cpc),
    cpcLink: Math.round(cpcLink),
    cpv: Math.round(cpv * 10) / 10,
    vtr: Math.round(vtr * 100) / 100,
    frequency: Math.round(adjustedFreq * 100) / 100,
  };
}

// ── XLSX 폴백 체인 ────────────────────────────────────
// 조건을 점진적으로 완화하여 충분한 데이터 확보
function getMatchedXlsx(
  data: XlsxRecord[],
  industries: string[],
  genders: string[],
  ageRanges: string[],
  objectives: string[],
): XlsxRecord[] {
  // 1. 전체 조건
  let matched = filterXlsx(data, industries, genders, ageRanges, objectives);
  if (matched.length >= 10) return matched;

  // 2. 연령 제거
  matched = filterXlsx(data, industries, genders, [], objectives);
  if (matched.length >= 10) return matched;

  // 3. 성별 제거
  matched = filterXlsx(data, industries, [], [], objectives);
  if (matched.length >= 10) return matched;

  // 4. 업종 제거 (objective만)
  matched = filterXlsx(data, [], [], [], objectives);
  if (matched.length >= 10) return matched;

  // 5. 전체 데이터
  return data;
}

// ── CSV 폴백 (XLSX 데이터가 없는 경우 레거시) ─────────
function calcReachFromCsv(budget: number): { reach: number; cpm: number; cpc: number; cpcLink: number; cpv: number; vtr: number; frequency: number } {
  const csvData = loadAdData();
  const totalReach = csvData.reduce((s, r) => s + r.도달, 0);
  const totalImp = csvData.reduce((s, r) => s + r.노출, 0);
  const totalClicks = csvData.reduce((s, r) => s + r.클릭, 0);

  const cpm = totalImp > 0
    ? csvData.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImp : 0;
  const cpc = totalClicks > 0
    ? csvData.reduce((s, r) => s + r.CPC * r.클릭, 0) / totalClicks : 0;
  const frequency = totalReach > 0 ? totalImp / totalReach : 1;
  const linearReach = cpm > 0 ? (budget / cpm) * 1000 / frequency : 0;
  const diminishingFactor = budget > 0
    ? Math.pow(budget / REF_BUDGET, BETA - 1) : 1;

  return {
    reach: Math.round(linearReach * diminishingFactor),
    cpm: Math.round(cpm),
    cpc: Math.round(cpc),
    cpcLink: 0,
    cpv: 0,
    vtr: 0,
    frequency: Math.round(frequency * 100) / 100,
  };
}

// ── 메인 predict 함수 ─────────────────────────────────
export function predict(input: PredictInput): PredictResult {
  const { industries, genders, ageRanges, objectives, budget } = input;
  const xlsxData = loadXlsxData();

  const matched = getMatchedXlsx(xlsxData, industries, genders, ageRanges, objectives);
  const { reach, cpm, cpc, cpcLink, cpv, vtr, frequency } = matched.length > 0
    ? calcReach(matched, budget)
    : calcReachFromCsv(budget);

  // 전월 대비 비교 (날짜 기준)
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const prevMatched = matched.filter((r) => r.날짜.startsWith(prevMonthStr));

  let reachChange: number | null = null;
  let cpmChange: number | null = null;
  let cpcChange: number | null = null;

  if (prevMatched.length >= 5) {
    const prev = calcReach(prevMatched, budget);
    if (prev.reach > 0) reachChange = ((reach - prev.reach) / prev.reach) * 100;
    if (prev.cpm > 0) cpmChange = ((cpm - prev.cpm) / prev.cpm) * 100;
    if (prev.cpc > 0 && cpc > 0) cpcChange = ((cpc - prev.cpc) / prev.cpc) * 100;
  }

  return {
    reach,
    cpm,
    cpc,
    cpcLink,
    cpv,
    vtr,
    frequency,
    reachChange,
    cpmChange,
    cpcChange,
    matchedCount: matched.length,
  };
}
