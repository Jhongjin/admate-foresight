export interface FiltersRouteOutput {
  industries: string[];
  ageRanges: string[];
  genders: string[];
  objectives: string[];
  months: string[];
  placements: string[];
  creativeTypes: string[];
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ALLOWED_GENDERS = new Set(['male', 'female', 'unknown']);
const COMMON_AGE_RANGE_PATTERN = /^(?:1[89]|[2-6]\d)-(?:2[0-4]|3[0-4]|4[0-4]|5[0-4]|6[0-4])$|^65\+$/;
const EMPTY_FILTERS_OUTPUT: FiltersRouteOutput = {
  industries: [],
  ageRanges: [],
  genders: [],
  objectives: [],
  months: [],
  placements: [],
  creativeTypes: [],
};

const FORBIDDEN_LABEL_PATTERNS = [
  /https?:\/\//i,
  /\bwww\./i,
  /[/?#@=]/,
  /(?:^|[_\-\s])(?:raw|source|token|cookie|session|secret|credential)(?:$|[_\-\s])/i,
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
  /\b\d{8,}\b/,
  /\b[A-Za-z0-9_-]{32,}\b/,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeLabelText(label: string, maxLength: number): boolean {
  return Boolean(label) &&
    label.length <= maxLength &&
    !/[\u0000-\u001f\u007f]/.test(label) &&
    !FORBIDDEN_LABEL_PATTERNS.some((pattern) => pattern.test(label));
}

function readSafeDisplayLabel(value: unknown, maxLength = 80): string | null {
  if (typeof value !== 'string') return null;

  const label = value.trim();
  return isSafeLabelText(label, maxLength) ? label : null;
}

function normalizeSafeLabels(value: unknown, maxLength = 80): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => readSafeDisplayLabel(item, maxLength))
    .filter((item): item is string => item !== null);
}

function normalizeAgeRanges(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const label = readSafeDisplayLabel(item, 32);
      if (!label) return null;

      return COMMON_AGE_RANGE_PATTERN.test(label) || isSafeLabelText(label, 32)
        ? label
        : null;
    })
    .filter((item): item is string => item !== null);
}

function normalizeGenders(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
    .filter((item) => ALLOWED_GENDERS.has(item));
}

function normalizeMonths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => MONTH_PATTERN.test(item));
}

export function normalizeFiltersRouteOutput(value: unknown): FiltersRouteOutput {
  if (!isRecord(value)) return { ...EMPTY_FILTERS_OUTPUT };

  return {
    industries: normalizeSafeLabels(value.industries),
    ageRanges: normalizeAgeRanges(value.ageRanges),
    genders: normalizeGenders(value.genders),
    objectives: normalizeSafeLabels(value.objectives),
    months: normalizeMonths(value.months),
    placements: normalizeSafeLabels(value.placements),
    creativeTypes: normalizeSafeLabels(value.creativeTypes),
  };
}
