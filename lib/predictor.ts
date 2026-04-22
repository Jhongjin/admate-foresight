import { loadAdData } from './csvLoader';
import { XlsxRecord, loadXlsxData, loadDemoData } from './xlsxLoader';
import { predictByRegression } from './regression';

export interface PredictInput {
  industries: string[];
  genders: string[];
  ageRanges: string[];
  objectives: string[];
  budget: number;
  monthFrom?: string;     // YYYY-MM, 기간 시작
  monthTo?: string;       // YYYY-MM, 기간 종료
}

export interface MarketAvg {
  cpm: number;
  cpc: number;
  vtr: number;
  count: number;
  score: number;           // 0-100 종합 점수
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  cpmDiff: number;         // 업종 평균 대비 % (음수 = 더 저렴)
  cpcDiff: number;
  vtrDiff: number;
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
  // 회귀 모델 정보
  r2Cpm?: number;
  r2Cpc?: number;
  r2Vtr?: number;
  predictionMethod: 'regression' | 'weighted_avg' | 'fallback';
  marketAvg: MarketAvg;
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
  monthFrom?: string,     // YYYY-MM, 기간 시작
  monthTo?: string,       // YYYY-MM, 기간 종료
): XlsxRecord[] {
  return data.filter((r) => {
    const rowMonth = r.날짜.substring(0, 7);
    if (monthFrom && rowMonth < monthFrom) return false;
    if (monthTo && rowMonth > monthTo) return false;
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

// ── 도달 계산 (CPM 값 주입 방식) ─────────────────────
// cpmVal: 회귀 or 가중평균으로 결정된 CPM
function calcReachFromCPM(
  cpmVal: number,
  baseFreq: number,
  budget: number,
): { reach: number; frequency: number } {
  const adjustedFreq = baseFreq * Math.pow(budget / REF_BUDGET, FREQ_GAMMA);

  if (cpmVal === 0 || adjustedFreq === 0) {
    return { reach: 0, frequency: Math.round(adjustedFreq * 100) / 100 };
  }

  const linearReach = (budget / cpmVal) * 1000 / adjustedFreq;
  const diminishingFactor = budget > 0 ? Math.pow(budget / REF_BUDGET, BETA - 1) : 1;

  return {
    reach: Math.round(linearReach * diminishingFactor),
    frequency: Math.round(adjustedFreq * 100) / 100,
  };
}

// ── 가중평균 기반 전체 계산 (폴백용) ────────────────
function calcFromRecords(records: XlsxRecord[], budget: number): {
  cpm: number; cpc: number; cpcLink: number; cpv: number; vtr: number;
  reach: number; frequency: number;
} {
  const cpm     = weightedCPM(records);
  const cpc     = weightedCPC(records);
  const cpcLink = weightedCPCLink(records);
  const cpv     = weightedCPV(records);
  const vtr     = calcVTR(records);
  const baseFreq = weightedFrequency(records);
  const { reach, frequency } = calcReachFromCPM(cpm, baseFreq, budget);

  return {
    cpm: Math.round(cpm),
    cpc: Math.round(cpc),
    cpcLink: Math.round(cpcLink),
    cpv: Math.round(cpv * 10) / 10,
    vtr: Math.round(vtr * 100) / 100,
    reach,
    frequency,
  };
}

// ── XLSX 폴백 체인 ────────────────────────────────────
function getMatchedXlsx(
  data: XlsxRecord[],
  industries: string[],
  genders: string[],
  ageRanges: string[],
  objectives: string[],
  monthFrom?: string,
  monthTo?: string,
): XlsxRecord[] {
  // ── Phase 1: 기간 필터 포함 ──
  if (monthFrom || monthTo) {
    let m = filterXlsx(data, industries, genders, ageRanges, objectives, monthFrom, monthTo);
    if (m.length >= 10) return m;

    m = filterXlsx(data, industries, genders, [], objectives, monthFrom, monthTo);
    if (m.length >= 10) return m;

    m = filterXlsx(data, industries, [], [], objectives, monthFrom, monthTo);
    if (m.length >= 10) return m;

    m = filterXlsx(data, [], [], [], objectives, monthFrom, monthTo);
    if (m.length >= 10) return m;

    m = filterXlsx(data, [], [], [], [], monthFrom, monthTo);
    if (m.length >= 10) return m;
  }

  // ── Phase 2: 기간 필터 제거 폴백 ──
  let matched = filterXlsx(data, industries, genders, ageRanges, objectives);
  if (matched.length >= 10) return matched;

  matched = filterXlsx(data, industries, genders, [], objectives);
  if (matched.length >= 10) return matched;

  matched = filterXlsx(data, industries, [], [], objectives);
  if (matched.length >= 10) return matched;

  matched = filterXlsx(data, [], [], [], objectives);
  if (matched.length >= 10) return matched;

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
  const { industries, genders, ageRanges, objectives, budget, monthFrom, monthTo } = input;
  const xlsxData = loadXlsxData();

  // ── 폴백: 가중평균 기반 매칭된 레코드 ──
  const matched = getMatchedXlsx(xlsxData, industries, genders, ageRanges, objectives, monthFrom, monthTo);

  // 회귀 예측 기준 월: 기간 종료월 사용 (가장 최근 데이터 기준)
  const selMonth = monthTo ?? monthFrom;

  // ── 1차: Ridge 회귀 예측 ──
  let cpm: number, cpc: number, cpcLink: number, cpv: number, vtr: number;
  let predictionMethod: PredictResult['predictionMethod'];
  let r2Cpm: number | undefined, r2Cpc: number | undefined, r2Vtr: number | undefined;

  let regResult: ReturnType<typeof predictByRegression> | null = null;
  try {
    regResult = predictByRegression(industries, genders, ageRanges, selMonth);
  } catch (e) {
    // 회귀 실패 시 무시하고 가중평균으로 폴백
  }

  if (regResult && regResult.cpm > 0) {
    // 회귀 성공: CPM/CPC는 회귀값, VTR/CPV/CPCLink는 필터링된 가중평균
    // (VTR은 회귀 계수가 Ridge로 수렴해 필터 변화에 둔감 → 가중평균이 더 정확)
    cpm     = regResult.cpm;
    cpc     = regResult.cpc;
    cpcLink = regResult.cpcLink > 0 ? regResult.cpcLink : Math.round(weightedCPCLink(matched));
    cpv     = Math.round(weightedCPV(matched) * 10) / 10;
    // VTR 계산: 성별/연령 → 데모 데이터, 목표/업종 → 월간 데이터, 폴백 → 회귀
    const demoData = loadDemoData();
    const demoVideoRecs = demoData.filter(r => {
      if (r.영상조회수 <= 0 || r.노출 <= 0) return false;
      if (industries.length > 0 && !industries.includes(r.업종)) return false;
      if (objectives.length > 0 && !objectives.includes(r.목표)) return false;
      if (genders.length > 0 && !genders.includes(r.성별)) return false;
      if (ageRanges.length > 0 && !ageRanges.includes(r.연령)) return false;
      return true;
    });
    const allVideoRecs = xlsxData.filter(r => r.영상조회수 > 0 && r.노출 > 0);
    const videoMatched = matched.filter(r => r.영상조회수 > 0 && r.노출 > 0);
    const hasGenderAge = genders.length > 0 || ageRanges.length > 0;
    if (hasGenderAge && demoVideoRecs.length > 0) {
      vtr = Math.round(calcVTR(demoVideoRecs) * 100) / 100;
    } else if (videoMatched.length > 0) {
      vtr = Math.round(calcVTR(videoMatched) * 100) / 100;
    } else if (allVideoRecs.length > 0) {
      vtr = Math.round(calcVTR(allVideoRecs) * 100) / 100;
    } else {
      vtr = regResult.vtr;
    }
    r2Cpm   = regResult.r2Cpm;
    r2Cpc   = regResult.r2Cpc;
    r2Vtr   = regResult.r2VTR;
    predictionMethod = 'regression';
  } else if (matched.length > 0) {
    // 가중평균 폴백
    const avg = calcFromRecords(matched, budget);
    ({ cpm, cpc, cpcLink, cpv, vtr } = avg);
    predictionMethod = 'weighted_avg';
  } else {
    // CSV 레거시 폴백
    const fallback = calcReachFromCsv(budget);
    ({ cpm, cpc, cpcLink, cpv, vtr } = fallback);
    predictionMethod = 'fallback';
  }

  // ── 도달 계산: 회귀 CPM 기반 ──
  const baseFreq = weightedFrequency(matched.length > 0 ? matched : xlsxData);
  const { reach, frequency } = calcReachFromCPM(cpm, baseFreq, budget);

  // ── 전월 대비 비교 (기간 종료월 기준) ──
  let prevMonthStr: string;
  if (selMonth) {
    const [y, mo] = selMonth.split('-').map(Number);
    const prevDate = new Date(y, mo - 2, 1);
    prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  } else {
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  }

  let reachChange: number | null = null;
  let cpmChange:   number | null = null;
  let cpcChange:   number | null = null;

  try {
    // 전월도 회귀 예측으로 비교 (method 일관성)
    const prevReg = predictByRegression(industries, genders, ageRanges, prevMonthStr);
    if (prevReg.cpm > 0) {
      const prevMatched = getMatchedXlsx(xlsxData, industries, genders, ageRanges, objectives)
        .filter(r => r.날짜.startsWith(prevMonthStr));
      const prevBaseFreq = weightedFrequency(prevMatched.length > 0 ? prevMatched : xlsxData);
      const { reach: prevReach } = calcReachFromCPM(prevReg.cpm, prevBaseFreq, budget);

      if (prevReach > 0) reachChange = ((reach - prevReach) / prevReach) * 100;
      if (prevReg.cpm > 0) cpmChange = ((cpm - prevReg.cpm) / prevReg.cpm) * 100;
      if (prevReg.cpc > 0 && cpc > 0) cpcChange = ((cpc - prevReg.cpc) / prevReg.cpc) * 100;
    }
  } catch {
    // 전월 회귀 실패: change null 유지
  }

  // ── 시장 비교 (동일 업종 평균 대비) ─────────────────────
  const industryData = industries.length > 0
    ? xlsxData.filter((r) => industries.includes(r.업종))
    : xlsxData;
  const industryVideoData = industryData.filter((r) => r.영상조회수 > 0 && r.노출 > 0);

  const mktCpm = weightedCPM(industryData);
  const mktCpc = weightedCPC(industryData);
  const mktVtr = calcVTR(industryVideoData);

  // 각 지표별 차이 (음수 = 예측치가 더 낮음(좋음), VTR은 양수=좋음)
  const cpmDiff = mktCpm > 0 ? ((cpm - mktCpm) / mktCpm) * 100 : 0;
  const cpcDiff = mktCpc > 0 && cpc > 0 ? ((cpc - mktCpc) / mktCpc) * 100 : 0;
  const vtrDiff = mktVtr > 0 && vtr > 0 ? ((vtr - mktVtr) / mktVtr) * 100 : 0;

  // 종합 점수: CPM 절감 40%, VTR 우수 30%, CPC 절감 30%
  // 50점 기준 → 각 지표 개선률(%)의 절반을 가감
  const rawScore = 50 + (-cpmDiff * 0.4 + vtrDiff * 0.3 + -cpcDiff * 0.3) * 0.5;
  const marketScore = Math.round(Math.min(100, Math.max(0, rawScore)));
  const marketGrade: MarketAvg['grade'] =
    marketScore >= 80 ? 'A' : marketScore >= 65 ? 'B' : marketScore >= 50 ? 'C' : marketScore >= 35 ? 'D' : 'F';

  const marketAvg: MarketAvg = {
    cpm: Math.round(mktCpm),
    cpc: Math.round(mktCpc),
    vtr: Math.round(mktVtr * 100) / 100,
    count: industryData.length,
    score: marketScore,
    grade: marketGrade,
    cpmDiff: Math.round(cpmDiff * 10) / 10,
    cpcDiff: Math.round(cpcDiff * 10) / 10,
    vtrDiff: Math.round(vtrDiff * 10) / 10,
  };

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
    r2Cpm,
    r2Cpc,
    r2Vtr,
    predictionMethod,
    marketAvg,
  };
}
