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
  matchedCount: number;
  r2Cpm?: number;
  r2Cpc?: number;
  r2Vtr?: number;
  predictionMethod?: 'regression' | 'weighted_avg' | 'fallback';
  marketAvg?: MarketAvg;
  insights?: string[];
  seasonalityMultiplier?: number;
  seasonalityReason?: string;
  qualityIndex?: number;
  qualityPenaltyPct?: number;
  saturationWarning?: boolean;
}

type PredictionMethod = NonNullable<PredictResult['predictionMethod']>;

const SAFE_PREDICTION_METHODS = ['regression', 'weighted_avg', 'fallback'] as const;
const SAFE_MARKET_GRADES = ['A', 'B', 'C', 'D', 'F'] as const;

const FORBIDDEN_DISPLAY_COPY_PATTERNS = [
  /https?:\/\//i,
  /\bwww\./i,
  /\bact_\d+\b/i,
  /\b(?:account|campaign|adset|provider|creative)[_-]?(?:id|token|secret|cookie|session)\b/i,
  /\bad[_-]?id\b/i,
  /\b(?:account|campaign|adset|provider|creative)[_-][a-z0-9][a-z0-9_-]{2,}\b/i,
  /\bad[_-][a-z0-9][a-z0-9_-]{2,}\b/i,
  /\b(?:access|refresh|id)?[_-]?token\b/i,
  /\bbearer\s+\S+/i,
  /\bcookie\b/i,
  /\bsession\b/i,
  /\bsecret\b/i,
  /\bcredential\b/i,
  /\b(?:raw|source)[_-]?(?:row|rows|record|records|data)?\b/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readNonNegativeFiniteNumber(value: unknown): number | null {
  const numberValue = readFiniteNumber(value);
  return numberValue !== null && numberValue >= 0 ? numberValue : null;
}

function readPredictionMethod(value: unknown): PredictResult['predictionMethod'] | undefined {
  if (typeof value !== 'string') return undefined;

  return SAFE_PREDICTION_METHODS.includes(value as PredictionMethod)
    ? value as PredictionMethod
    : undefined;
}

function readMarketGrade(value: unknown): MarketAvg['grade'] | null {
  return SAFE_MARKET_GRADES.includes(value as MarketAvg['grade'])
    ? value as MarketAvg['grade']
    : null;
}

function sanitizeDisplayString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (FORBIDDEN_DISPLAY_COPY_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return null;
  }

  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength).trimEnd()}...` : trimmed;
}

export function normalizeMarketAvg(value: unknown): MarketAvg | undefined {
  if (!isRecord(value)) return undefined;

  const cpm = readNonNegativeFiniteNumber(value.cpm);
  const cpc = readNonNegativeFiniteNumber(value.cpc);
  const cpcLink = readNonNegativeFiniteNumber(value.cpcLink);
  const cpv = readNonNegativeFiniteNumber(value.cpv);
  const vtr = readNonNegativeFiniteNumber(value.vtr);
  const count = readNonNegativeFiniteNumber(value.count);
  const score = readFiniteNumber(value.score);
  const cpmDiff = readFiniteNumber(value.cpmDiff);
  const cpcDiff = readFiniteNumber(value.cpcDiff);
  const cpcLinkDiff = readFiniteNumber(value.cpcLinkDiff);
  const cpvDiff = readFiniteNumber(value.cpvDiff);
  const vtrDiff = readFiniteNumber(value.vtrDiff);
  const top20pctCpm = readNonNegativeFiniteNumber(value.top20pctCpm);
  const top20pctCpc = readNonNegativeFiniteNumber(value.top20pctCpc);
  const grade = readMarketGrade(value.grade);
  const industrySelected = typeof value.industrySelected === 'boolean'
    ? value.industrySelected
    : null;

  if (
    cpm === null || cpc === null || cpcLink === null || cpv === null || vtr === null ||
    count === null || score === null || grade === null || cpmDiff === null ||
    cpcDiff === null || cpcLinkDiff === null || cpvDiff === null || vtrDiff === null ||
    top20pctCpm === null || top20pctCpc === null || industrySelected === null
  ) {
    return undefined;
  }

  return {
    cpm,
    cpc,
    cpcLink,
    cpv,
    vtr,
    count,
    score,
    grade,
    cpmDiff,
    cpcDiff,
    cpcLinkDiff,
    cpvDiff,
    vtrDiff,
    top20pctCpm,
    top20pctCpc,
    industrySelected,
  };
}

export function normalizePredictResult(value: unknown): PredictResult | null {
  if (!isRecord(value)) return null;

  const reach = readNonNegativeFiniteNumber(value.reach);
  const cpm = readNonNegativeFiniteNumber(value.cpm);
  const cpc = readNonNegativeFiniteNumber(value.cpc);
  const cpcLink = readNonNegativeFiniteNumber(value.cpcLink);
  const cpv = readNonNegativeFiniteNumber(value.cpv);
  const vtr = readNonNegativeFiniteNumber(value.vtr);
  const frequency = readNonNegativeFiniteNumber(value.frequency);
  const matchedCount = readNonNegativeFiniteNumber(value.matchedCount);

  if (
    reach === null || cpm === null || cpc === null || cpcLink === null ||
    cpv === null || vtr === null || frequency === null || matchedCount === null
  ) {
    return null;
  }

  const result: PredictResult = {
    reach,
    cpm,
    cpc,
    cpcLink,
    cpv,
    vtr,
    frequency,
    matchedCount,
  };

  const r2Cpm = readFiniteNumber(value.r2Cpm);
  if (r2Cpm !== null) result.r2Cpm = r2Cpm;
  const r2Cpc = readFiniteNumber(value.r2Cpc);
  if (r2Cpc !== null) result.r2Cpc = r2Cpc;
  const r2Vtr = readFiniteNumber(value.r2Vtr);
  if (r2Vtr !== null) result.r2Vtr = r2Vtr;
  const seasonalityMultiplier = readFiniteNumber(value.seasonalityMultiplier);
  if (seasonalityMultiplier !== null) result.seasonalityMultiplier = seasonalityMultiplier;
  const qualityIndex = readFiniteNumber(value.qualityIndex);
  if (qualityIndex !== null) result.qualityIndex = qualityIndex;
  const qualityPenaltyPct = readNonNegativeFiniteNumber(value.qualityPenaltyPct);
  if (qualityPenaltyPct !== null) result.qualityPenaltyPct = qualityPenaltyPct;

  const predictionMethod = readPredictionMethod(value.predictionMethod);
  if (predictionMethod) result.predictionMethod = predictionMethod;
  const marketAvg = normalizeMarketAvg(value.marketAvg);
  if (marketAvg) result.marketAvg = marketAvg;
  if (Array.isArray(value.insights)) {
    const insights = value.insights
      .map((item) => sanitizeDisplayString(item, 180))
      .filter((item): item is string => item !== null);
    if (insights.length > 0) result.insights = insights;
  }
  const seasonalityReason = sanitizeDisplayString(value.seasonalityReason, 240);
  if (seasonalityReason !== null) result.seasonalityReason = seasonalityReason;
  if (typeof value.saturationWarning === 'boolean') result.saturationWarning = value.saturationWarning;

  return result;
}
