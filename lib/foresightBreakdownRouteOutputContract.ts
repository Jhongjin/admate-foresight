export interface BreakdownRouteRow {
  group: string;
  industry: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  count?: number;
}

export interface BreakdownRouteEfficiencyRank {
  industry: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  cpmRank: number;
  cpcRank: number;
  ctrRank: number;
}

export interface BreakdownRouteOutput {
  byGender: BreakdownRouteRow[];
  byAge: BreakdownRouteRow[];
  efficiencyRanks: BreakdownRouteEfficiencyRank[];
}

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

const EMPTY_BREAKDOWN_OUTPUT: BreakdownRouteOutput = {
  byGender: [],
  byAge: [],
  efficiencyRanks: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonNegativeFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

function readSafeLabel(value: unknown): string | null {
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

function normalizeBreakdownRow(value: unknown): BreakdownRouteRow | null {
  if (!isRecord(value)) return null;

  const group = readSafeLabel(value.group);
  const industry = readSafeLabel(value.industry);
  const avgCPM = readNonNegativeFiniteNumber(value.avgCPM);
  const avgCPC = readNonNegativeFiniteNumber(value.avgCPC);
  const avgCTR = readNonNegativeFiniteNumber(value.avgCTR);
  const totalReach = readNonNegativeFiniteNumber(value.totalReach);

  if (
    !group ||
    !industry ||
    avgCPM === null ||
    avgCPC === null ||
    avgCTR === null ||
    totalReach === null
  ) {
    return null;
  }

  const row: BreakdownRouteRow = {
    group,
    industry,
    avgCPM,
    avgCPC,
    avgCTR,
    totalReach,
  };
  const count = readPositiveInteger(value.count);
  if (count !== null) row.count = count;

  return row;
}

function normalizeEfficiencyRank(value: unknown): BreakdownRouteEfficiencyRank | null {
  if (!isRecord(value)) return null;

  const industry = readSafeLabel(value.industry);
  const avgCPM = readNonNegativeFiniteNumber(value.avgCPM);
  const avgCPC = readNonNegativeFiniteNumber(value.avgCPC);
  const avgCTR = readNonNegativeFiniteNumber(value.avgCTR);
  const totalReach = readNonNegativeFiniteNumber(value.totalReach);
  const cpmRank = readPositiveInteger(value.cpmRank);
  const cpcRank = readPositiveInteger(value.cpcRank);
  const ctrRank = readPositiveInteger(value.ctrRank);

  if (
    !industry ||
    avgCPM === null ||
    avgCPC === null ||
    avgCTR === null ||
    totalReach === null ||
    cpmRank === null ||
    cpcRank === null ||
    ctrRank === null
  ) {
    return null;
  }

  return {
    industry,
    avgCPM,
    avgCPC,
    avgCTR,
    totalReach,
    cpmRank,
    cpcRank,
    ctrRank,
  };
}

function normalizeRows(value: unknown): BreakdownRouteRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeBreakdownRow)
    .filter((row): row is BreakdownRouteRow => row !== null);
}

function normalizeRanks(value: unknown): BreakdownRouteEfficiencyRank[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeEfficiencyRank)
    .filter((rank): rank is BreakdownRouteEfficiencyRank => rank !== null);
}

export function normalizeBreakdownRouteOutput(value: unknown): BreakdownRouteOutput {
  if (!isRecord(value)) return { ...EMPTY_BREAKDOWN_OUTPUT };

  return {
    byGender: normalizeRows(value.byGender),
    byAge: normalizeRows(value.byAge),
    efficiencyRanks: normalizeRanks(value.efficiencyRanks),
  };
}
