import type {
  DataSufficiency,
  DataSufficiencyBasis,
  DataSufficiencyStatus,
} from './predictor';

export type ForecastRangeConfirmationState =
  | 'accepted_for_operator_review'
  | 'blocked_by_sufficiency'
  | 'blocked_by_current_range'
  | 'rejected_invalid_range';

export interface ForecastRangeConfirmationPoint {
  budget: number;
  reach: number;
  cpm: number;
  cpc: number;
  dataSufficiency?: DataSufficiency;
}

export interface ForecastRangeConfirmationInput {
  range: unknown;
  currentBudget?: number;
}

export interface ForecastRangeReadiness {
  operatorReviewReady: boolean;
  llmReady: false;
  persistenceReady: false;
  reportReady: false;
  exportReady: false;
  promotionReady: false;
  applyReady: false;
}

export interface ForecastRangeSideEffectSummary {
  llmCalls: 0;
  databaseReads: 0;
  databaseWrites: 0;
  pythonRuns: 0;
  metaCalls: 0;
  exportWrites: 0;
  promotionApplyCalls: 0;
}

export interface ForecastRangeAggregateSummary {
  pointCount: number;
  currentBudget: number | null;
  currentBudgetPresent: boolean;
  minBudget: number | null;
  maxBudget: number | null;
  budgets: number[];
  aggregateFields: Array<keyof ForecastRangeConfirmationPoint>;
  sourceRowsIncluded: false;
  rawRecordsIncluded: false;
}

export interface ForecastRangeSufficiencySummary {
  status: DataSufficiencyStatus | 'missing';
  basis: DataSufficiencyBasis | 'mixed' | 'missing';
  statuses: Array<DataSufficiencyStatus | 'missing'>;
  bases: Array<DataSufficiencyBasis | 'missing'>;
  minimumMatchedCount: number;
  minimumRequired: number;
  warningCodes: string[];
  blockedByInsufficientData: boolean;
}

export interface ForecastRangeTerminology {
  rangeLabel: 'Forecast range';
  reviewLabel: 'Operator review';
  basisLabel: 'Aggregate sufficiency';
  description: string;
}

export interface ForecastRangeConfirmation {
  state: ForecastRangeConfirmationState;
  acceptedForReview: boolean;
  aggregateOnly: true;
  range: ForecastRangeAggregateSummary;
  sufficiency: ForecastRangeSufficiencySummary;
  readiness: ForecastRangeReadiness;
  sideEffectSummary: ForecastRangeSideEffectSummary;
  terminology: ForecastRangeTerminology;
  warningCodes: string[];
  rejectionReasons: string[];
  blockedActions: string[];
}

export interface ForecastRangeResponseNormalization {
  rangeData: ForecastRangeConfirmationPoint[] | null;
  confirmation: ForecastRangeConfirmation | null;
}

const DATA_SUFFICIENCY_STATUSES: DataSufficiencyStatus[] = [
  'sufficient',
  'relaxed',
  'insufficient',
];

const DATA_SUFFICIENCY_BASES: DataSufficiencyBasis[] = [
  'exact_cohort',
  'relaxed_demographic',
  'relaxed_industry_objective',
  'date_window_only',
  'global_fallback',
  'invalid_month_range',
];

const AGGREGATE_FIELDS: Array<keyof ForecastRangeConfirmationPoint> = [
  'budget',
  'reach',
  'cpm',
  'cpc',
  'dataSufficiency',
];

const BLOCKED_ACTIONS = [
  'llm_generation',
  'persistence_write',
  'report_generation',
  'export_write',
  'promotion_apply',
];

const FORECAST_RANGE_CONFIRMATION_STATES: ForecastRangeConfirmationState[] = [
  'accepted_for_operator_review',
  'blocked_by_sufficiency',
  'blocked_by_current_range',
  'rejected_invalid_range',
];

const SUFFICIENCY_SUMMARY_STATUSES: ForecastRangeSufficiencySummary['status'][] = [
  ...DATA_SUFFICIENCY_STATUSES,
  'missing',
];

const SUFFICIENCY_SUMMARY_BASES: ForecastRangeSufficiencySummary['basis'][] = [
  ...DATA_SUFFICIENCY_BASES,
  'mixed',
  'missing',
];

const SUFFICIENCY_STATUS_ENTRIES: Array<DataSufficiencyStatus | 'missing'> = [
  ...DATA_SUFFICIENCY_STATUSES,
  'missing',
];

const SUFFICIENCY_BASIS_ENTRIES: Array<DataSufficiencyBasis | 'missing'> = [
  ...DATA_SUFFICIENCY_BASES,
  'missing',
];

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const FORBIDDEN_POINT_KEY_PATTERNS: RegExp[] = [
  /^account/i,
  /^advertiser/i,
  /^campaign/i,
  /^adset/i,
  /^ad[_-]?id$/i,
  /^creative/i,
  /^row/i,
  /token/i,
  /cookie/i,
  /session/i,
  /url/i,
];

const FORBIDDEN_CONFIRMATION_STRING_PATTERNS: RegExp[] = [
  /raw/i,
  /source/i,
  /^act_/i,
  /^account/i,
  /account[-_]/i,
  /^campaign/i,
  /campaign[-_]/i,
  /^ad[-_]/i,
  /^provider/i,
  /provider[-_]/i,
  /https?:\/\//i,
  /url/i,
  /token/i,
  /cookie/i,
  /session/i,
  /credential/i,
  /secret/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isSafeDisplayCode(value: string): boolean {
  return (
    SAFE_CODE_PATTERN.test(value) &&
    !FORBIDDEN_CONFIRMATION_STRING_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function normalizeSafeCodeArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === 'string')) return null;

  return unique(value.filter(isSafeDisplayCode));
}

function isOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
): value is T {
  return typeof value === 'string' && options.includes(value as T);
}

function normalizeEnumArray<T extends string>(
  value: unknown,
  options: readonly T[],
): T[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return null;
  if (!value.every((item): item is T => isOneOf(item, options))) return null;

  return [...value];
}

function hasForbiddenPointKey(point: Record<string, unknown>): boolean {
  return Object.keys(point).some((key) =>
    FORBIDDEN_POINT_KEY_PATTERNS.some((pattern) => pattern.test(key)),
  );
}

function normalizeDataSufficiency(value: unknown): DataSufficiency | null {
  if (!isRecord(value)) return null;
  if (!DATA_SUFFICIENCY_STATUSES.includes(value.status as DataSufficiencyStatus)) {
    return null;
  }
  if (!DATA_SUFFICIENCY_BASES.includes(value.basis as DataSufficiencyBasis)) {
    return null;
  }
  if (!isNonNegativeNumber(value.matchedCount)) return null;
  if (!isPositiveNumber(value.minimumRequired)) return null;

  const warningCodes = normalizeSafeCodeArray(value.warningCodes);
  if (warningCodes === null) return null;

  return {
    status: value.status as DataSufficiencyStatus,
    basis: value.basis as DataSufficiencyBasis,
    matchedCount: value.matchedCount,
    minimumRequired: value.minimumRequired,
    warningCodes,
  };
}

function normalizeRangePoint(value: unknown): ForecastRangeConfirmationPoint | null {
  if (!isRecord(value) || hasForbiddenPointKey(value)) return null;
  if (!isPositiveNumber(value.budget)) return null;
  if (!isNonNegativeNumber(value.reach)) return null;
  if (!isNonNegativeNumber(value.cpm)) return null;
  if (!isNonNegativeNumber(value.cpc)) return null;

  let dataSufficiency: DataSufficiency | undefined;
  if (value.dataSufficiency !== undefined) {
    const normalizedDataSufficiency = normalizeDataSufficiency(value.dataSufficiency);
    if (normalizedDataSufficiency === null) return null;
    dataSufficiency = normalizedDataSufficiency;
  }

  return {
    budget: value.budget,
    reach: value.reach,
    cpm: value.cpm,
    cpc: value.cpc,
    dataSufficiency,
  };
}

function normalizeAggregateFields(
  value: unknown,
): Array<keyof ForecastRangeConfirmationPoint> | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((field) => typeof field === 'string')) return null;

  return unique(
    value.filter((field): field is keyof ForecastRangeConfirmationPoint =>
      AGGREGATE_FIELDS.includes(field as keyof ForecastRangeConfirmationPoint),
    ),
  );
}

function normalizeNullablePositiveNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (isPositiveNumber(value)) return value;
  return undefined;
}

function normalizeRangeSummary(value: unknown): ForecastRangeAggregateSummary | null {
  if (!isRecord(value)) return null;
  if (!isNonNegativeInteger(value.pointCount)) return null;
  if (typeof value.currentBudgetPresent !== 'boolean') return null;
  if (value.sourceRowsIncluded !== false) return null;
  if (value.rawRecordsIncluded !== false) return null;
  if (!Array.isArray(value.budgets)) return null;
  if (!value.budgets.every(isPositiveNumber)) return null;

  const currentBudget = normalizeNullablePositiveNumber(value.currentBudget);
  const minBudget = normalizeNullablePositiveNumber(value.minBudget);
  const maxBudget = normalizeNullablePositiveNumber(value.maxBudget);
  const aggregateFields = normalizeAggregateFields(value.aggregateFields);
  if (currentBudget === undefined || minBudget === undefined || maxBudget === undefined) {
    return null;
  }
  if (aggregateFields === null) return null;

  return {
    pointCount: value.pointCount,
    currentBudget,
    currentBudgetPresent: value.currentBudgetPresent,
    minBudget,
    maxBudget,
    budgets: [...value.budgets],
    aggregateFields,
    sourceRowsIncluded: false,
    rawRecordsIncluded: false,
  };
}

function normalizeSufficiencySummary(value: unknown): ForecastRangeSufficiencySummary | null {
  if (!isRecord(value)) return null;
  if (!isOneOf(value.status, SUFFICIENCY_SUMMARY_STATUSES)) return null;
  if (!isOneOf(value.basis, SUFFICIENCY_SUMMARY_BASES)) return null;
  if (!isNonNegativeNumber(value.minimumMatchedCount)) return null;
  if (!isNonNegativeNumber(value.minimumRequired)) return null;
  if (typeof value.blockedByInsufficientData !== 'boolean') return null;

  const statuses = normalizeEnumArray(value.statuses, SUFFICIENCY_STATUS_ENTRIES);
  const bases = normalizeEnumArray(value.bases, SUFFICIENCY_BASIS_ENTRIES);
  const warningCodes = normalizeSafeCodeArray(value.warningCodes);
  if (statuses === null || bases === null || warningCodes === null) return null;

  return {
    status: value.status,
    basis: value.basis,
    statuses,
    bases,
    minimumMatchedCount: value.minimumMatchedCount,
    minimumRequired: value.minimumRequired,
    warningCodes,
    blockedByInsufficientData: value.blockedByInsufficientData,
  };
}

function normalizeForecastRangeConfirmation(value: unknown): ForecastRangeConfirmation | null {
  if (!isRecord(value)) return null;
  if (typeof value.acceptedForReview !== 'boolean') return null;
  if (!isRecord(value.readiness) || typeof value.readiness.operatorReviewReady !== 'boolean') return null;
  if (!isOneOf(value.state, FORECAST_RANGE_CONFIRMATION_STATES)) return null;
  if (value.aggregateOnly !== true) return null;

  const acceptedForReview = value.state === 'accepted_for_operator_review';
  if (value.acceptedForReview !== acceptedForReview) return null;
  if (value.readiness.operatorReviewReady !== acceptedForReview) return null;

  const range = normalizeRangeSummary(value.range);
  const sufficiency = normalizeSufficiencySummary(value.sufficiency);
  const warningCodes = normalizeSafeCodeArray(value.warningCodes);
  const rejectionReasons = normalizeSafeCodeArray(value.rejectionReasons);
  if (
    range === null ||
    sufficiency === null ||
    warningCodes === null ||
    rejectionReasons === null
  ) {
    return null;
  }

  return {
    state: value.state,
    acceptedForReview,
    aggregateOnly: true,
    range,
    sufficiency,
    readiness: buildReadiness(acceptedForReview),
    sideEffectSummary: buildSideEffectSummary(),
    terminology: buildTerminology(),
    warningCodes,
    rejectionReasons,
    blockedActions: [...BLOCKED_ACTIONS],
  };
}

export function normalizeForecastRangeData(value: unknown): ForecastRangeConfirmationPoint[] | null {
  const range = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.range)
      ? value.range
      : null;

  if (!range) return null;

  const points = range.map(normalizeRangePoint);
  if (points.some((point) => point === null)) return null;
  return points.filter((point): point is ForecastRangeConfirmationPoint => point !== null);
}

export function normalizeForecastRangeResponse(value: unknown): ForecastRangeResponseNormalization {
  return {
    rangeData: normalizeForecastRangeData(value),
    confirmation: isRecord(value)
      ? normalizeForecastRangeConfirmation(value.confirmation)
      : null,
  };
}

function buildReadiness(operatorReviewReady: boolean): ForecastRangeReadiness {
  return {
    operatorReviewReady,
    llmReady: false,
    persistenceReady: false,
    reportReady: false,
    exportReady: false,
    promotionReady: false,
    applyReady: false,
  };
}

function buildSideEffectSummary(): ForecastRangeSideEffectSummary {
  return {
    llmCalls: 0,
    databaseReads: 0,
    databaseWrites: 0,
    pythonRuns: 0,
    metaCalls: 0,
    exportWrites: 0,
    promotionApplyCalls: 0,
  };
}

function buildTerminology(): ForecastRangeTerminology {
  return {
    rangeLabel: 'Forecast range',
    reviewLabel: 'Operator review',
    basisLabel: 'Aggregate sufficiency',
    description:
      'Directional aggregate forecast range for operator review; later gates are required before reports, exports, promotion, or apply actions.',
  };
}

function buildEmptySufficiencySummary(): ForecastRangeSufficiencySummary {
  return {
    status: 'missing',
    basis: 'missing',
    statuses: ['missing'],
    bases: ['missing'],
    minimumMatchedCount: 0,
    minimumRequired: 0,
    warningCodes: ['MISSING_DATA_SUFFICIENCY'],
    blockedByInsufficientData: true,
  };
}

function buildSufficiencySummary(
  points: ForecastRangeConfirmationPoint[],
): ForecastRangeSufficiencySummary {
  const sufficiencies = points.map((point) => point.dataSufficiency);
  const missingCount = sufficiencies.filter((item) => item === undefined).length;
  const present = sufficiencies.filter((item): item is DataSufficiency => item !== undefined);

  if (present.length === 0) return buildEmptySufficiencySummary();

  const statuses = unique([
    ...present.map((item) => item.status),
    ...(missingCount > 0 ? ['missing' as const] : []),
  ]);
  const bases = unique([
    ...present.map((item) => item.basis),
    ...(missingCount > 0 ? ['missing' as const] : []),
  ]);
  const warningCodes = unique([
    ...present.flatMap((item) => item.warningCodes),
    ...(present.some((item) => item.status === 'relaxed')
      ? ['RELAXED_DATA_SUFFICIENCY']
      : []),
    ...(missingCount > 0 ? ['MISSING_DATA_SUFFICIENCY'] : []),
    ...(present.some((item) => item.status === 'insufficient')
      ? ['INSUFFICIENT_DATA_SUFFICIENCY']
      : []),
  ]);
  const minimumMatchedCount = Math.min(...present.map((item) => item.matchedCount));
  const minimumRequired = Math.max(...present.map((item) => item.minimumRequired));
  const hasLowMatchedCount = present.some(
    (item) => item.matchedCount < item.minimumRequired,
  );
  const blockedByInsufficientData =
    missingCount > 0 ||
    hasLowMatchedCount ||
    present.some((item) => item.status === 'insufficient');
  const status: ForecastRangeSufficiencySummary['status'] = blockedByInsufficientData
    ? 'insufficient'
    : statuses.includes('relaxed')
      ? 'relaxed'
      : 'sufficient';

  return {
    status,
    basis: bases.length === 1 ? bases[0] : 'mixed',
    statuses,
    bases,
    minimumMatchedCount,
    minimumRequired,
    warningCodes,
    blockedByInsufficientData,
  };
}

function buildRangeSummary(
  points: ForecastRangeConfirmationPoint[],
  currentBudget: number | null,
): ForecastRangeAggregateSummary {
  const budgets = points.map((point) => point.budget).sort((a, b) => a - b);
  const currentBudgetPresent = currentBudget === null
    ? false
    : budgets.some((budget) => Math.abs(budget - currentBudget) < Number.EPSILON);

  return {
    pointCount: points.length,
    currentBudget,
    currentBudgetPresent,
    minBudget: budgets[0] ?? null,
    maxBudget: budgets.at(-1) ?? null,
    budgets,
    aggregateFields: AGGREGATE_FIELDS,
    sourceRowsIncluded: false,
    rawRecordsIncluded: false,
  };
}

function buildRejectedConfirmation(rejectionReasons: string[]): ForecastRangeConfirmation {
  const readiness = buildReadiness(false);

  return {
    state: 'rejected_invalid_range',
    acceptedForReview: false,
    aggregateOnly: true,
    range: buildRangeSummary([], null),
    sufficiency: buildEmptySufficiencySummary(),
    readiness,
    sideEffectSummary: buildSideEffectSummary(),
    terminology: buildTerminology(),
    warningCodes: ['FORECAST_RANGE_REJECTED'],
    rejectionReasons,
    blockedActions: BLOCKED_ACTIONS,
  };
}

export function buildForecastRangeConfirmation(
  input: ForecastRangeConfirmationInput,
): ForecastRangeConfirmation {
  if (!Array.isArray(input.range)) {
    return buildRejectedConfirmation(['FORECAST_RANGE_NOT_ARRAY']);
  }
  if (input.range.length === 0) {
    return buildRejectedConfirmation(['EMPTY_FORECAST_RANGE']);
  }

  const points = input.range.map(normalizeRangePoint);
  if (points.some((point) => point === null)) {
    return buildRejectedConfirmation(['MALFORMED_FORECAST_RANGE_POINT']);
  }

  const normalizedPoints = points as ForecastRangeConfirmationPoint[];
  const currentBudget = isPositiveNumber(input.currentBudget)
    ? input.currentBudget
    : null;
  const range = buildRangeSummary(normalizedPoints, currentBudget);
  const sufficiency = buildSufficiencySummary(normalizedPoints);
  const warningCodes = unique([
    ...sufficiency.warningCodes,
    ...(range.currentBudgetPresent ? [] : ['CURRENT_BUDGET_NOT_CONFIRMED']),
  ]);
  const state: ForecastRangeConfirmationState = sufficiency.blockedByInsufficientData
    ? 'blocked_by_sufficiency'
    : range.currentBudgetPresent
      ? 'accepted_for_operator_review'
      : 'blocked_by_current_range';
  const acceptedForReview = state === 'accepted_for_operator_review';

  return {
    state,
    acceptedForReview,
    aggregateOnly: true,
    range,
    sufficiency,
    readiness: buildReadiness(acceptedForReview),
    sideEffectSummary: buildSideEffectSummary(),
    terminology: buildTerminology(),
    warningCodes,
    rejectionReasons: [],
    blockedActions: BLOCKED_ACTIONS,
  };
}
