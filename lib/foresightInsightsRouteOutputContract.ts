export interface InsightsRouteRow {
  month: string;
  industry: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  totalSpend: number;
  count: number;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const FORBIDDEN_LABEL_PATTERNS = [
  /https?:\/\//i,
  /\bwww\./i,
  /[/?#@=]/,
  /\b(?:raw|source)[_-]?(?:row|rows|record|records|data)?\b/i,
  /\b(?:access|refresh|id)?[_-]?token\b/i,
  /\bbearer\s+\S+/i,
  /\bcookie\b/i,
  /\bsession\b/i,
  /\bsecret\b/i,
  /\bcredential\b/i,
  /\b(?:account|campaign|adset|provider|creative)[_-]?(?:id|token|secret|cookie|session)\b/i,
  /\b(?:act|acct|account|campaign|adset|ad|provider|creative)[_-][a-z0-9][a-z0-9_-]{2,}\b/i,
  /\b[a-f0-9]{24,}\b/i,
  /\b[A-Za-z0-9_-]{32,}\b/,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonNegativeFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function readPositiveCount(value: unknown): number | null {
  const count = readNonNegativeFiniteNumber(value);
  return count !== null && Number.isInteger(count) && count > 0 ? count : null;
}

function readSafeIndustryLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const label = value.trim();
  if (!label || label.length > 80 || /[\u0000-\u001f\u007f]/.test(label)) {
    return null;
  }
  if (FORBIDDEN_LABEL_PATTERNS.some((pattern) => pattern.test(label))) {
    return null;
  }

  return label;
}

function normalizeInsightsRouteRow(value: unknown): InsightsRouteRow | null {
  if (!isRecord(value) || typeof value.month !== 'string') return null;

  const month = value.month.trim();
  const industry = readSafeIndustryLabel(value.industry);
  const avgCPM = readNonNegativeFiniteNumber(value.avgCPM);
  const avgCPC = readNonNegativeFiniteNumber(value.avgCPC);
  const avgCTR = readNonNegativeFiniteNumber(value.avgCTR);
  const totalReach = readNonNegativeFiniteNumber(value.totalReach);
  const totalSpend = readNonNegativeFiniteNumber(value.totalSpend);
  const count = readPositiveCount(value.count);

  if (
    !MONTH_PATTERN.test(month) ||
    !industry ||
    avgCPM === null ||
    avgCPC === null ||
    avgCTR === null ||
    totalReach === null ||
    totalSpend === null ||
    count === null
  ) {
    return null;
  }

  return {
    month,
    industry,
    avgCPM,
    avgCPC,
    avgCTR,
    totalReach,
    totalSpend,
    count,
  };
}

export function normalizeInsightsRouteOutput(value: unknown): InsightsRouteRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeInsightsRouteRow)
    .filter((row): row is InsightsRouteRow => row !== null);
}
