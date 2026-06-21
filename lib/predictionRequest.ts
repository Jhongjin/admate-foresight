import type { PredictInput } from './predictor';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type StringArrayField =
  | 'industries'
  | 'genders'
  | 'ageRanges'
  | 'objectives'
  | 'placements'
  | 'creativeTypes';

export class PredictionRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PredictionRequestValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStringArray(
  body: Record<string, unknown>,
  field: StringArrayField,
): string[] {
  const value = body[field];
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new PredictionRequestValidationError(`${field} must be an array of strings`);
  }
  if (!value.every((item) => typeof item === 'string')) {
    throw new PredictionRequestValidationError(`${field} must contain only strings`);
  }
  return value;
}

function normalizeBudget(body: Record<string, unknown>, defaultBudget?: number): number {
  const value = body.budget === undefined ? defaultBudget : body.budget;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new PredictionRequestValidationError('budget must be a finite positive number');
  }
  return value;
}

function normalizeMonth(body: Record<string, unknown>, field: 'monthFrom' | 'monthTo') {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !MONTH_PATTERN.test(value)) {
    throw new PredictionRequestValidationError(`${field} must use YYYY-MM format`);
  }
  return value;
}

export function normalizePredictionRequest(
  body: unknown,
  options: { defaultBudget?: number } = {},
): PredictInput {
  if (!isRecord(body)) {
    throw new PredictionRequestValidationError('request body must be an object');
  }

  return {
    industries: normalizeStringArray(body, 'industries'),
    genders: normalizeStringArray(body, 'genders'),
    ageRanges: normalizeStringArray(body, 'ageRanges'),
    objectives: normalizeStringArray(body, 'objectives'),
    placements: normalizeStringArray(body, 'placements'),
    creativeTypes: normalizeStringArray(body, 'creativeTypes'),
    budget: normalizeBudget(body, options.defaultBudget),
    monthFrom: normalizeMonth(body, 'monthFrom'),
    monthTo: normalizeMonth(body, 'monthTo'),
  };
}
