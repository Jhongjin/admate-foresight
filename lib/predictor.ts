import { loadAdData } from './csvLoader';
import { XlsxRecord, loadXlsxData, loadDemoData } from './xlsxLoader';
import { predictByRegression } from './regression';

export interface PredictInput {
  industries: string[];
  genders: string[];
  ageRanges: string[];
  objectives: string[];
  placements?: string[];
  creativeTypes?: string[];
  budget: number;
  monthFrom?: string;
  monthTo?: string;
}

export type DataSufficiencyStatus = 'sufficient' | 'relaxed' | 'insufficient';

export type DataSufficiencyBasis =
  | 'exact_cohort'
  | 'relaxed_demographic'
  | 'relaxed_industry_objective'
  | 'date_window_only'
  | 'global_fallback'
  | 'invalid_month_range';

export interface DataSufficiency {
  status: DataSufficiencyStatus;
  basis: DataSufficiencyBasis;
  matchedCount: number;
  minimumRequired: number;
  warningCodes: string[];
}

export interface MarketAvg {
  cpm: number;
  cpc: number;
  cpcLink: number;
  cpv: number;
  vtr: number;
  count: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  cpmDiff: number;
  cpcDiff: number;
  cpcLinkDiff: number;
  cpvDiff: number;
  vtrDiff: number;
  top20pctCpm: number;
  top20pctCpc: number;
  industrySelected: boolean;
}

export interface PredictResult {
  reach: number;
  cpm: number;
  cpc: number;
  cpcLink: number;
  cpv: number;
  vtr: number;
  frequency: number;
  reachChange: number | null;
  cpmChange: number | null;
  cpcChange: number | null;
  matchedCount: number;
  dataSufficiency: DataSufficiency;
  r2Cpm?: number;
  r2Cpc?: number;
  r2Vtr?: number;
  predictionMethod: 'regression' | 'weighted_avg' | 'fallback';
  marketAvg: MarketAvg;
  // 고도화 필드
  seasonalityMultiplier: number;
  seasonalityReason: string;
  qualityIndex: number;      // 0-100
  qualityPenaltyPct: number; // 적용된 CPC 패널티 %
  saturationWarning: boolean;
  insights: string[];        // 전략적 조언 3줄
}

// ════════════════════════════════════════════════════════════
// 상수
// ════════════════════════════════════════════════════════════
const BETA = 0.864;
const FREQ_GAMMA = 0.044;
const REF_BUDGET = 1_000_000;
const SAT_FREQ_THRESHOLD = 2.0;   // 포화 시작 빈도
const SAT_CPM_RATE = 0.25;        // 빈도 초과분당 CPM 할증률
const MINIMUM_MATCHED_RECORDS = 10;

// ════════════════════════════════════════════════════════════
// 1. 시즌성 가중치 (Seasonality)
// ════════════════════════════════════════════════════════════
function getSeasonality(): { multiplier: number; reason: string } {
  const now = new Date();
  const m = now.getMonth() + 1; // 1-12
  const d = now.getDate();

  if (m === 12) return { multiplier: 1.4, reason: '연말 성수기 (12월)' };
  if (m === 11) return { multiplier: 1.3, reason: '블랙프라이데이 시즌 (11월)' };
  // 설날: 대체로 1월 말 ~ 2월 초
  if ((m === 1 && d >= 22) || (m === 2 && d <= 16))
    return { multiplier: 1.2, reason: '설날 연휴 시즌' };
  // 추석: 대체로 9월 중순 ~ 10월 초
  if ((m === 9 && d >= 15) || (m === 10 && d <= 10))
    return { multiplier: 1.2, reason: '추석 연휴 시즌' };

  return { multiplier: 1.0, reason: '' };
}

// ════════════════════════════════════════════════════════════
// 2. 포화 모델 (Saturation — frequency 기반 CPM 할증)
// ════════════════════════════════════════════════════════════
function applySaturation(baseCpm: number, frequency: number): number {
  if (frequency <= SAT_FREQ_THRESHOLD) return baseCpm;
  // 빈도 2.0 초과분에 비례 할증, 최대 70%
  const overRatio = (frequency - SAT_FREQ_THRESHOLD) / SAT_FREQ_THRESHOLD;
  const surcharge = 1 + overRatio * SAT_CPM_RATE;
  return baseCpm * Math.min(surcharge, 1.7);
}

// ════════════════════════════════════════════════════════════
// 3. 품질 지수 (Quality Index) — 타겟 좁음 + CTR 이력
// ════════════════════════════════════════════════════════════
function computeQuality(
  genders: string[],
  ageRanges: string[],
  industries: string[],
  matched: XlsxRecord[],
  baseline: XlsxRecord[],
): { index: number; penaltyMultiplier: number; penaltyPct: number; reason: string } {
  const filterDims =
    (genders.length > 0 ? 1 : 0) +
    (ageRanges.length > 0 ? 1 : 0) +
    (industries.length > 0 ? 1 : 0);
  const isNarrow = filterDims >= 2 && matched.length < 100;

  // CTR 추정: CPM / (CPC × 1000)
  const baseCpm = weightedCPM(baseline);
  const baseCpc = weightedCPC(baseline);
  const baseCtr = baseCpc > 0 ? baseCpm / (baseCpc * 1000) : 0;

  const mCpm = weightedCPM(matched);
  const mCpc = weightedCPC(matched);
  const matchCtr = mCpc > 0 && matched.length > 0 ? mCpm / (mCpc * 1000) : baseCtr;

  const ctrRatio = baseCtr > 0 ? matchCtr / baseCtr : 1;

  let penalty = 1.0;
  let reason = '';
  if (isNarrow && ctrRatio < 0.75) {
    penalty = 1.25; reason = '좁은 타겟 + 낮은 CTR 이력';
  } else if (isNarrow) {
    penalty = 1.12; reason = '좁은 타겟 설정';
  } else if (ctrRatio < 0.7) {
    penalty = 1.18; reason = '낮은 CTR 이력 조합';
  }

  const rawIndex = Math.round(
    Math.min(100, Math.max(0, 50 + (ctrRatio - 1) * 60 + (isNarrow ? -8 : 0)))
  );
  return {
    index: rawIndex,
    penaltyMultiplier: penalty,
    penaltyPct: Math.round((penalty - 1) * 100),
    reason,
  };
}

// ════════════════════════════════════════════════════════════
// 기존 헬퍼
// ════════════════════════════════════════════════════════════
function filterXlsx(
  data: XlsxRecord[],
  industries: string[],
  genders: string[],
  ageRanges: string[],
  objectives: string[],
  placements: string[] = [],
  creativeTypes: string[] = [],
  monthFrom?: string,
  monthTo?: string,
): XlsxRecord[] {
  return data.filter((r) => {
    const rowMonth = r.날짜.substring(0, 7);
    if (monthFrom && rowMonth < monthFrom) return false;
    if (monthTo && rowMonth > monthTo) return false;
    if (objectives.length > 0 && !objectives.includes(r.목표)) return false;
    if (industries.length > 0 && !industries.includes(r.업종)) return false;
    if (genders.length > 0 && !genders.includes(r.성별)) return false;
    if (ageRanges.length > 0 && !ageRanges.includes(r.연령)) return false;
    if (placements.length > 0 && !placements.includes(r.노출위치)) return false;
    if (creativeTypes.length > 0 && !creativeTypes.includes(r.소재형태)) return false;
    return true;
  });
}

function weightedCPM(records: XlsxRecord[]): number {
  const totalImp = records.reduce((s, r) => s + r.노출, 0);
  if (totalImp === 0) return 0;
  return records.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImp;
}

function weightedCPC(records: XlsxRecord[]): number {
  const clickRecs = records.filter((r) => r.CPC > 0);
  if (clickRecs.length === 0) return 0;
  const totalSpend = clickRecs.reduce((s, r) => s + r.지출금액, 0);
  const totalClicks = clickRecs.reduce((s, r) => s + r.지출금액 / r.CPC, 0);
  if (totalClicks === 0) return 0;
  return totalSpend / totalClicks;
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

function weightedFrequency(records: XlsxRecord[]): number {
  const totalReach = records.reduce((s, r) => s + r.도달, 0);
  if (totalReach === 0) return 1;
  return records.reduce((s, r) => s + r.빈도 * r.도달, 0) / totalReach;
}

function calcReachFromCPM(
  cpmVal: number,
  baseFreq: number,
  budget: number,
): { reach: number; frequency: number } {
  const adjustedFreq = baseFreq * Math.pow(budget / REF_BUDGET, FREQ_GAMMA);
  if (cpmVal === 0 || adjustedFreq === 0)
    return { reach: 0, frequency: Math.round(adjustedFreq * 100) / 100 };

  const linearReach = (budget / cpmVal) * 1000 / adjustedFreq;
  const diminishingFactor = budget > 0 ? Math.pow(budget / REF_BUDGET, BETA - 1) : 1;

  return {
    reach: Math.round(linearReach * diminishingFactor),
    frequency: Math.round(adjustedFreq * 100) / 100,
  };
}

function calcFromRecords(records: XlsxRecord[], budget: number) {
  const cpm     = weightedCPM(records);
  const cpc     = weightedCPC(records);
  const cpcLink = weightedCPCLink(records);
  const cpv     = weightedCPV(records);
  const vtr     = calcVTR(records);
  const baseFreq = weightedFrequency(records);
  const { reach, frequency } = calcReachFromCPM(cpm, baseFreq, budget);
  return {
    cpm: Math.round(cpm), cpc: Math.round(cpc),
    cpcLink: Math.round(cpcLink), cpv: Math.round(cpv * 10) / 10,
    vtr: Math.round(vtr * 100) / 100, reach, frequency,
  };
}

function buildDataSufficiency(
  basis: DataSufficiencyBasis,
  matchedCount: number,
): DataSufficiency {
  const warningCodes: string[] = [];
  let status: DataSufficiencyStatus = 'sufficient';

  if (basis === 'invalid_month_range') {
    status = 'insufficient';
    warningCodes.push('REVERSED_MONTH_RANGE', 'INSUFFICIENT_MATCHED_DATA');
  } else if (basis !== 'exact_cohort') {
    status = basis === 'global_fallback' ? 'insufficient' : 'relaxed';
    warningCodes.push('RELAXED_COHORT_MATCH');
    if (basis === 'global_fallback') warningCodes.push('GLOBAL_FALLBACK_USED');
  }

  if (matchedCount < MINIMUM_MATCHED_RECORDS && basis !== 'invalid_month_range') {
    status = 'insufficient';
    warningCodes.push('INSUFFICIENT_MATCHED_DATA');
  }

  return {
    status,
    basis,
    matchedCount,
    minimumRequired: MINIMUM_MATCHED_RECORDS,
    warningCodes: [...new Set(warningCodes)],
  };
}

function getMatchedXlsxWithSufficiency(
  data: XlsxRecord[],
  industries: string[], genders: string[], ageRanges: string[], objectives: string[],
  placements: string[] = [], creativeTypes: string[] = [],
  monthFrom?: string, monthTo?: string,
): { matched: XlsxRecord[]; dataSufficiency: DataSufficiency } {
  if (monthFrom && monthTo && monthFrom > monthTo) {
    return {
      matched: [],
      dataSufficiency: buildDataSufficiency('invalid_month_range', 0),
    };
  }

  if (monthFrom || monthTo) {
    let m = filterXlsx(data, industries, genders, ageRanges, objectives, placements, creativeTypes, monthFrom, monthTo);
    if (m.length >= MINIMUM_MATCHED_RECORDS) {
      return { matched: m, dataSufficiency: buildDataSufficiency('exact_cohort', m.length) };
    }
    m = filterXlsx(data, industries, genders, [], objectives, placements, creativeTypes, monthFrom, monthTo);
    if (m.length >= MINIMUM_MATCHED_RECORDS) {
      return { matched: m, dataSufficiency: buildDataSufficiency('relaxed_demographic', m.length) };
    }
    m = filterXlsx(data, industries, [], [], objectives, placements, creativeTypes, monthFrom, monthTo);
    if (m.length >= MINIMUM_MATCHED_RECORDS) {
      return { matched: m, dataSufficiency: buildDataSufficiency('relaxed_demographic', m.length) };
    }
    m = filterXlsx(data, [], [], [], objectives, placements, creativeTypes, monthFrom, monthTo);
    if (m.length >= MINIMUM_MATCHED_RECORDS) {
      return { matched: m, dataSufficiency: buildDataSufficiency('relaxed_industry_objective', m.length) };
    }
    m = filterXlsx(data, [], [], [], [], placements, creativeTypes, monthFrom, monthTo);
    if (m.length >= MINIMUM_MATCHED_RECORDS) {
      return { matched: m, dataSufficiency: buildDataSufficiency('date_window_only', m.length) };
    }
  }
  let matched = filterXlsx(data, industries, genders, ageRanges, objectives, placements, creativeTypes);
  if (matched.length >= MINIMUM_MATCHED_RECORDS) {
    return { matched, dataSufficiency: buildDataSufficiency('exact_cohort', matched.length) };
  }
  matched = filterXlsx(data, industries, genders, [], objectives, placements, creativeTypes);
  if (matched.length >= MINIMUM_MATCHED_RECORDS) {
    return { matched, dataSufficiency: buildDataSufficiency('relaxed_demographic', matched.length) };
  }
  matched = filterXlsx(data, industries, [], [], objectives, placements, creativeTypes);
  if (matched.length >= MINIMUM_MATCHED_RECORDS) {
    return { matched, dataSufficiency: buildDataSufficiency('relaxed_demographic', matched.length) };
  }
  matched = filterXlsx(data, [], [], [], objectives, placements, creativeTypes);
  if (matched.length >= MINIMUM_MATCHED_RECORDS) {
    return { matched, dataSufficiency: buildDataSufficiency('relaxed_industry_objective', matched.length) };
  }
  return {
    matched: data,
    dataSufficiency: buildDataSufficiency('global_fallback', data.length),
  };
}

function getMatchedXlsx(
  data: XlsxRecord[],
  industries: string[], genders: string[], ageRanges: string[], objectives: string[],
  placements: string[] = [], creativeTypes: string[] = [],
  monthFrom?: string, monthTo?: string,
): XlsxRecord[] {
  return getMatchedXlsxWithSufficiency(
    data,
    industries,
    genders,
    ageRanges,
    objectives,
    placements,
    creativeTypes,
    monthFrom,
    monthTo,
  ).matched;
}

function calcReachFromCsv(budget: number) {
  const csvData = loadAdData();
  const totalReach = csvData.reduce((s, r) => s + r.도달, 0);
  const totalImp = csvData.reduce((s, r) => s + r.노출, 0);
  const totalClicks = csvData.reduce((s, r) => s + r.클릭, 0);
  const csvCpm = totalImp > 0 ? csvData.reduce((s, r) => s + r.CPM * r.노출, 0) / totalImp : 0;
  const csvCpc = totalClicks > 0 ? csvData.reduce((s, r) => s + r.CPC * r.클릭, 0) / totalClicks : 0;
  const csvFrequency = totalReach > 0 ? totalImp / totalReach : 0;

  // CSV 없거나 값이 0이면 한국 Meta 광고 시장 평균값으로 대체
  const cpm       = csvCpm       > 0 ? csvCpm       : 4_500;  // 한국 평균 CPM ≈ ₩4,500
  const cpc       = csvCpc       > 0 ? csvCpc       : 350;    // 한국 평균 CPC ≈ ₩350
  const frequency = csvFrequency > 0 ? csvFrequency : 1.5;    // 평균 빈도 ≈ 1.5회

  const linearReach = (budget / cpm) * 1000 / frequency;
  const diminishingFactor = budget > 0 ? Math.pow(budget / REF_BUDGET, BETA - 1) : 1;
  return {
    reach: Math.round(linearReach * diminishingFactor),
    cpm: Math.round(cpm), cpc: Math.round(cpc),
    cpcLink: 0, cpv: 0, vtr: 0,
    frequency: Math.round(frequency * 100) / 100,
  };
}

// ════════════════════════════════════════════════════════════
// 4. 인사이트 텍스트 생성
// ════════════════════════════════════════════════════════════
function generateInsights(p: {
  cpm: number; cpc: number; frequency: number; budget: number;
  seasonality: { multiplier: number; reason: string };
  quality: { index: number; penaltyPct: number; reason: string };
  genders: string[]; ageRanges: string[]; industries: string[];
  mktAvgCpm: number; top20pctCpm: number;
  saturationWarning: boolean;
}): string[] {
  const insights: string[] = [];

  // ① 예산 효율 / 포화도
  if (p.saturationWarning) {
    insights.push(
      `타겟 모수 대비 예산이 과다하게 설정되어 있습니다. 빈도(${p.frequency.toFixed(1)}회)가 ${SAT_FREQ_THRESHOLD}회를 넘어 CPM 할증이 적용되었습니다. 타겟 확장 또는 예산 20% 축소를 검토하세요.`
    );
  } else if (p.frequency < 1.3) {
    insights.push(
      `현재 예산 규모는 타겟 모수 대비 여유가 있습니다. 빈도(${p.frequency.toFixed(1)}회)가 낮아 효율 저하 없이 예산을 20% 증액해 도달을 확대할 수 있습니다.`
    );
  } else {
    insights.push(
      `현재 예산 규모는 타겟 모수 대비 적정합니다. 빈도(${p.frequency.toFixed(1)}회)가 안정적인 구간으로 예측됩니다.`
    );
  }

  // ② 시즌성
  if (p.seasonality.multiplier > 1.0) {
    const pct = Math.round((p.seasonality.multiplier - 1) * 100);
    insights.push(
      `${p.seasonality.reason} 영향으로 CPM을 ${pct}% 상향 조정하여 보수적으로 예측했습니다. 실제 집행 시 예비 예산을 ${pct}% 이상 확보하는 것을 권장합니다.`
    );
  } else {
    insights.push(
      `현재는 비성수기로 CPM 시즌 보정이 적용되지 않았습니다. 11~12월 집행 예정이라면 CPM을 30~40% 높게 책정하여 예산 계획을 세우세요.`
    );
  }

  // ③ 타겟 품질 / 세분화 가이드
  const hasTargeting = p.genders.length > 0 || p.ageRanges.length > 0 || p.industries.length > 0;
  const hasIndustry  = p.industries.length > 0;

  if (!hasTargeting) {
    // 아무 조건도 선택 안 한 경우 → 세분화 권유
    insights.push(
      `현재 광범위한 타겟 설정 상태입니다. 성별·연령·업종 중 하나 이상 선택해 타겟을 세분화하면 CPM 효율을 높일 수 있습니다.`
    );
  } else if (hasIndustry && p.mktAvgCpm > 0 && p.cpm > p.mktAvgCpm) {
    // 타겟은 있지만 CPM이 업종 평균 초과 → 목표 최적화 권유
    insights.push(
      `현재 타겟의 예측 CPM(₩${p.cpm.toLocaleString()})이 업종 평균(₩${p.mktAvgCpm.toLocaleString()})보다 높습니다. 캠페인 목표 최적화(전환·트래픽 등)를 통해 비용 효율을 개선하세요.`
    );
  } else if (hasIndustry && p.top20pctCpm > 0 && p.cpm <= p.top20pctCpm) {
    // 업종 있고 CPM이 상위 20% 이하 → 칭찬
    insights.push(
      `예측 CPM(₩${p.cpm.toLocaleString()})이 업종 상위 20% 효율선(₩${p.top20pctCpm.toLocaleString()}) 이하입니다. 현재 타겟·목표 설정이 매우 효율적입니다.`
    );
  } else if (hasIndustry) {
    // 업종 있고 평균 수준
    insights.push(
      `예측 CPM(₩${p.cpm.toLocaleString()})은 업종 평균(₩${p.mktAvgCpm.toLocaleString()}) 수준입니다. 상위 20% 효율선(₩${p.top20pctCpm.toLocaleString()})에 진입하려면 목표 최적화 또는 소재 개선을 검토하세요.`
    );
  } else {
    // 업종 미선택, 그 외 타겟만 있는 경우
    insights.push(
      `업종을 선택하면 업종별 CPM 벤치마크와 맞춤 효율 조언을 제공할 수 있습니다.`
    );
  }

  return insights;
}

// ════════════════════════════════════════════════════════════
// MAIN predict 함수
// ════════════════════════════════════════════════════════════
export function predict(input: PredictInput): PredictResult {
  const {
    industries,
    genders,
    ageRanges,
    objectives,
    placements = [],
    creativeTypes = [],
    budget,
    monthFrom,
    monthTo,
  } = input;
  const xlsxData = loadXlsxData();

  // ── 매칭 데이터 ──
  const { matched, dataSufficiency } = getMatchedXlsxWithSufficiency(
    xlsxData,
    industries,
    genders,
    ageRanges,
    objectives,
    placements,
    creativeTypes,
    monthFrom,
    monthTo,
  );
  const selMonth = monthTo ?? monthFrom;

  // ── 1차: Ridge 회귀 예측 ──
  let cpm: number, cpc: number, cpcLink: number, cpv: number, vtr: number;
  let predictionMethod: PredictResult['predictionMethod'];
  let r2Cpm: number | undefined, r2Cpc: number | undefined, r2Vtr: number | undefined;
  let regResult: ReturnType<typeof predictByRegression> | null = null;

  try { regResult = predictByRegression(industries, genders, ageRanges, objectives, selMonth); } catch {}

  // cpm <= 100이면 nObs=0 빈 모델(exp(0)=1)이므로 weighted avg로 fallback
  if (regResult && regResult.cpm > 100) {
    cpm     = regResult.cpm;
    cpc     = regResult.cpc;
    cpcLink = regResult.cpcLink > 0 ? regResult.cpcLink : Math.round(weightedCPCLink(matched));
    cpv     = Math.round(weightedCPV(matched) * 10) / 10;
    const demoData = loadDemoData();
    const demoVideoRecs = demoData.filter(r => {
      if (r.영상조회수 <= 0 || r.노출 <= 0) return false;
      if (industries.length > 0 && !industries.includes(r.업종)) return false;
      if (objectives.length > 0 && !objectives.includes(r.목표)) return false;
      if (genders.length > 0 && !genders.includes(r.성별)) return false;
      if (ageRanges.length > 0 && !ageRanges.includes(r.연령)) return false;
      if (placements.length > 0 && !placements.includes(r.노출위치)) return false;
      if (creativeTypes.length > 0 && !creativeTypes.includes(r.소재형태)) return false;
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
    r2Cpm = regResult.r2Cpm; r2Cpc = regResult.r2Cpc; r2Vtr = regResult.r2VTR;
    predictionMethod = 'regression';
  } else if (matched.length > 0) {
    const avg = calcFromRecords(matched, budget);
    ({ cpm, cpc, cpcLink, cpv, vtr } = avg);
    predictionMethod = 'weighted_avg';
  } else {
    const fallback = calcReachFromCsv(budget);
    ({ cpm, cpc, cpcLink, cpv, vtr } = fallback);
    predictionMethod = 'fallback';
  }

  // ── 시즌성 가중치 적용 ──────────────────────────────────
  const seasonality = getSeasonality();
  cpm = Math.round(cpm * seasonality.multiplier);

  // ── 도달 계산 (포화 모델 포함) ──────────────────────────
  const baseFreq = weightedFrequency(matched.length > 0 ? matched : xlsxData);
  const { reach: rawReach, frequency } = calcReachFromCPM(cpm, baseFreq, budget);

  // 포화 할증: frequency > SAT_FREQ_THRESHOLD 시 effective CPM 상승 → reach 감소
  const saturatedCpm = applySaturation(cpm, frequency);
  const saturationWarning = saturatedCpm > cpm;
  const reach = saturationWarning
    ? Math.round(rawReach * (cpm / saturatedCpm))
    : rawReach;

  // ── 품질 지수 ───────────────────────────────────────────
  let baselineData = filterXlsx(xlsxData, industries, [], [], objectives, placements, creativeTypes);
  if (baselineData.length < 10) {
    baselineData = industries.length > 0
      ? xlsxData.filter((r) => industries.includes(r.업종))
      : xlsxData;
  }
  const quality = computeQuality(genders, ageRanges, industries, matched, baselineData);
  cpc     = Math.round(cpc * quality.penaltyMultiplier);
  cpcLink = cpcLink > 0 ? Math.round(cpcLink * quality.penaltyMultiplier) : 0;

  // ── 전월 대비 (내부 참고용, UI 미표시) ─────────────────
  let reachChange: number | null = null;
  let cpmChange:   number | null = null;
  let cpcChange:   number | null = null;
  try {
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
    const prevReg = predictByRegression(industries, genders, ageRanges, objectives, prevMonthStr);
    if (prevReg.cpm > 0) {
      const prevBaseFreq = weightedFrequency(
        getMatchedXlsx(xlsxData, industries, genders, ageRanges, objectives, placements, creativeTypes)
          .filter(r => r.날짜.startsWith(prevMonthStr))
          .length > 0
          ? getMatchedXlsx(xlsxData, industries, genders, ageRanges, objectives, placements, creativeTypes)
              .filter(r => r.날짜.startsWith(prevMonthStr))
          : xlsxData
      );
      const { reach: prevReach } = calcReachFromCPM(prevReg.cpm, prevBaseFreq, budget);
      if (prevReach > 0) reachChange = ((reach - prevReach) / prevReach) * 100;
      if (prevReg.cpm > 0) cpmChange = ((cpm - prevReg.cpm) / prevReg.cpm) * 100;
      if (prevReg.cpc > 0 && cpc > 0) cpcChange = ((cpc - prevReg.cpc) / prevReg.cpc) * 100;
    }
  } catch {}

  // ── 시장 비교 (Top 20% 포함) ────────────────────────────
  const baselineVideoData = baselineData.filter((r) => r.영상조회수 > 0 && r.노출 > 0);
  const mktCpm     = weightedCPM(baselineData);
  const mktCpc     = weightedCPC(baselineData);
  const mktCpcLink = weightedCPCLink(baselineData);
  const mktCpv     = weightedCPV(baselineData);
  const mktVtr     = calcVTR(baselineVideoData);

  // Top 20% 효율선 (CPM·CPC 낮을수록 효율적 → 하위 20th percentile)
  const sortedCpms = baselineData.map(r => r.CPM).filter(v => v > 0).sort((a, b) => a - b);
  const top20pctCpm = sortedCpms[Math.floor(sortedCpms.length * 0.2)] ?? 0;
  const sortedCpcs = baselineData.map(r => r.CPC).filter(v => v > 0).sort((a, b) => a - b);
  const top20pctCpc = sortedCpcs[Math.floor(sortedCpcs.length * 0.2)] ?? 0;

  const cpmDiff     = mktCpm     > 0 && cpm     > 0 ? ((cpm     - mktCpm)     / mktCpm)     * 100 : 0;
  const cpcDiff     = mktCpc     > 0 && cpc     > 0 ? ((cpc     - mktCpc)     / mktCpc)     * 100 : 0;
  const cpcLinkDiff = mktCpcLink > 0 && cpcLink > 0 ? ((cpcLink - mktCpcLink) / mktCpcLink) * 100 : 0;
  const cpvDiff     = mktCpv     > 0 && cpv     > 0 ? ((cpv     - mktCpv)     / mktCpv)     * 100 : 0;
  const vtrDiff     = mktVtr     > 0 && vtr     > 0 ? ((vtr     - mktVtr)     / mktVtr)     * 100 : 0;
  const rawScore = 50 + (-cpmDiff * 0.4 + vtrDiff * 0.3 + -cpcDiff * 0.3) * 0.5;
  const marketScore = Math.round(Math.min(100, Math.max(0, rawScore)));
  const marketGrade: MarketAvg['grade'] =
    marketScore >= 80 ? 'A' : marketScore >= 65 ? 'B' : marketScore >= 50 ? 'C' : marketScore >= 35 ? 'D' : 'F';

  const marketAvg: MarketAvg = {
    cpm: Math.round(mktCpm), cpc: Math.round(mktCpc),
    cpcLink: Math.round(mktCpcLink),
    cpv: Math.round(mktCpv * 10) / 10,
    vtr: Math.round(mktVtr * 100) / 100,
    count: baselineData.length,
    score: marketScore, grade: marketGrade,
    cpmDiff:     Math.round(cpmDiff     * 10) / 10,
    cpcDiff:     Math.round(cpcDiff     * 10) / 10,
    cpcLinkDiff: Math.round(cpcLinkDiff * 10) / 10,
    cpvDiff:     Math.round(cpvDiff     * 10) / 10,
    vtrDiff:     Math.round(vtrDiff     * 10) / 10,
    top20pctCpm: Math.round(top20pctCpm),
    top20pctCpc: Math.round(top20pctCpc),
    industrySelected: industries.length > 0,
  };

  // ── 인사이트 생성 ─────────────────────────────────────
  const insights = generateInsights({
    cpm, cpc, frequency, budget, seasonality, quality,
    genders, ageRanges, industries,
    mktAvgCpm: Math.round(mktCpm),
    top20pctCpm: Math.round(top20pctCpm),
    saturationWarning,
  });

  return {
    reach, cpm, cpc, cpcLink, cpv, vtr, frequency,
    reachChange, cpmChange, cpcChange,
    matchedCount: matched.length,
    dataSufficiency,
    r2Cpm, r2Cpc, r2Vtr,
    predictionMethod,
    marketAvg,
    seasonalityMultiplier: seasonality.multiplier,
    seasonalityReason: seasonality.reason,
    qualityIndex: quality.index,
    qualityPenaltyPct: quality.penaltyPct,
    saturationWarning,
    insights,
  };
}
