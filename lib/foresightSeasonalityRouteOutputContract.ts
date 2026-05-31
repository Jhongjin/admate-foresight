export interface SeasonalityRouteWindow {
  dateRange: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  avgVTR: number;
  totalSpend: number;
  totalReach: number;
  count: number;
}

export interface SeasonalityRouteEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  eventStart: string;
  eventEnd: string;
  before: SeasonalityRouteWindow;
  during: SeasonalityRouteWindow;
  after: SeasonalityRouteWindow;
  cpmChange: number | null;
  cpcChange: number | null;
  ctrChange: number | null;
  vtrChange: number | null;
}

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DATE_RANGE_PATTERN = new RegExp(
  `^${DATE_PATTERN.source.slice(1, -1)} ~ ${DATE_PATTERN.source.slice(1, -1)}$`,
);
const SAFE_ID_PATTERN = /^[a-z][a-z0-9_-]{0,39}$/;
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
const INVALID_CHANGE = Symbol('invalid-change');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonNegativeFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function readNonNegativeInteger(value: unknown): number | null {
  const count = readNonNegativeFiniteNumber(value);
  return count !== null && Number.isInteger(count) ? count : null;
}

function hasUnsafeLabelContent(label: string): boolean {
  return (
    /[\u0000-\u001f\u007f]/.test(label) ||
    FORBIDDEN_LABEL_PATTERNS.some((pattern) => pattern.test(label))
  );
}

function readSafeLabel(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;

  const label = value.trim();
  if (!label || label.length > maxLength || hasUnsafeLabelContent(label)) {
    return null;
  }

  return label;
}

function readSafeId(value: unknown): string | null {
  const id = readSafeLabel(value, 40);
  return id && SAFE_ID_PATTERN.test(id) ? id : null;
}

function readSafeEmoji(value: unknown): string | null {
  return readSafeLabel(value, 16);
}

function readIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const date = value.trim();
  return DATE_PATTERN.test(date) ? date : null;
}

function readDateRange(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const dateRange = value.trim();
  return DATE_RANGE_PATTERN.test(dateRange) ? dateRange : null;
}

function readNullableFiniteChange(value: unknown): number | null | typeof INVALID_CHANGE {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : INVALID_CHANGE;
}

function normalizeWindow(value: unknown): SeasonalityRouteWindow | null {
  if (!isRecord(value)) return null;

  const dateRange = readDateRange(value.dateRange);
  const avgCPM = readNonNegativeFiniteNumber(value.avgCPM);
  const avgCPC = readNonNegativeFiniteNumber(value.avgCPC);
  const avgCTR = readNonNegativeFiniteNumber(value.avgCTR);
  const avgVTR = readNonNegativeFiniteNumber(value.avgVTR);
  const totalSpend = readNonNegativeFiniteNumber(value.totalSpend);
  const totalReach = readNonNegativeFiniteNumber(value.totalReach);
  const count = readNonNegativeInteger(value.count);

  if (
    !dateRange ||
    avgCPM === null ||
    avgCPC === null ||
    avgCTR === null ||
    avgVTR === null ||
    totalSpend === null ||
    totalReach === null ||
    count === null
  ) {
    return null;
  }

  return {
    dateRange,
    avgCPM,
    avgCPC,
    avgCTR,
    avgVTR,
    totalSpend,
    totalReach,
    count,
  };
}

function normalizeEvent(value: unknown): SeasonalityRouteEvent | null {
  if (!isRecord(value)) return null;

  const id = readSafeId(value.id);
  const name = readSafeLabel(value.name, 80);
  const emoji = readSafeEmoji(value.emoji);
  const description = readSafeLabel(value.description, 160);
  const eventStart = readIsoDate(value.eventStart);
  const eventEnd = readIsoDate(value.eventEnd);
  const before = normalizeWindow(value.before);
  const during = normalizeWindow(value.during);
  const after = normalizeWindow(value.after);
  const cpmChange = readNullableFiniteChange(value.cpmChange);
  const cpcChange = readNullableFiniteChange(value.cpcChange);
  const ctrChange = readNullableFiniteChange(value.ctrChange);
  const vtrChange = readNullableFiniteChange(value.vtrChange);

  if (
    !id ||
    !name ||
    !emoji ||
    !description ||
    !eventStart ||
    !eventEnd ||
    !before ||
    !during ||
    !after ||
    cpmChange === INVALID_CHANGE ||
    cpcChange === INVALID_CHANGE ||
    ctrChange === INVALID_CHANGE ||
    vtrChange === INVALID_CHANGE
  ) {
    return null;
  }

  return {
    id,
    name,
    emoji,
    description,
    eventStart,
    eventEnd,
    before,
    during,
    after,
    cpmChange,
    cpcChange,
    ctrChange,
    vtrChange,
  };
}

export function normalizeSeasonalityRouteOutput(value: unknown): SeasonalityRouteEvent[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeEvent)
    .filter((event): event is SeasonalityRouteEvent => event !== null);
}
