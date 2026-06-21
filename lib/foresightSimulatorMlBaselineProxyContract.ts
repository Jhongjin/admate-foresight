export type ForesightSimulatorMlBaselineProxyModelType =
  | 'random_forest'
  | 'hist_gradient_boosting'
  | 'linear_regression'
  | 'ridge';

export interface ForesightSimulatorMlBaselineProxyRequest {
  업종: string;
  목표: string;
  성별: string;
  연령: string;
  노출위치: string[];
  소재형태: string;
  예산: number;
  기간: number;
}

export interface ForesightSimulatorMlBaselineProxySuccessResponse {
  cpm?: number;
  ctr?: number;
  cpc?: number;
  reach?: number;
  frequency?: number;
  seasonality_multiplier?: number;
  seasonality_reason?: string;
  saturation_warning?: boolean;
  is_cross_estimate?: boolean;
  placement_factor?: number;
  demo_factor?: number;
  creative_factor?: number;
  is_creative_fallback?: boolean;
  lw_ensemble_active?: boolean;
  lw_cpm?: number;
  lw_rf_weight?: number;
  r2_cpm?: number;
  r2_ctr?: number;
  cv_r2?: number;
  model_type?: ForesightSimulatorMlBaselineProxyModelType;
  n_samples?: number;
}

export interface ForesightSimulatorMlBaselineProxyInvalidResponse {
  error: typeof FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_ERROR;
}

export type ForesightSimulatorMlBaselineProxyContractResult =
  | {
      ok: true;
      body: ForesightSimulatorMlBaselineProxySuccessResponse;
    }
  | {
      ok: false;
      status: 502;
      body: ForesightSimulatorMlBaselineProxyInvalidResponse;
    };

export const FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_ERROR =
  'ML service returned an invalid prediction.';

export const FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_REQUEST_ERROR =
  'ML baseline prediction request is invalid.';

export class ForesightSimulatorMlBaselineProxyRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForesightSimulatorMlBaselineProxyRequestValidationError';
  }
}

const AGGREGATE_METRIC_KEYS = ['cpm', 'ctr', 'cpc', 'reach'] as const;
const OPTIONAL_AGGREGATE_NUMBER_KEYS = [
  'frequency',
  'seasonality_multiplier',
  'placement_factor',
  'demo_factor',
  'creative_factor',
  'lw_cpm',
  'lw_rf_weight',
] as const;
const OPTIONAL_AGGREGATE_BOOLEAN_KEYS = [
  'saturation_warning',
  'is_cross_estimate',
  'is_creative_fallback',
  'lw_ensemble_active',
] as const;
const R2_KEYS = ['r2_cpm', 'r2_ctr', 'cv_r2'] as const;
const MAX_REQUEST_STRING_LENGTH = 120;
const MAX_REQUEST_ARRAY_LENGTH = 8;
const DEFAULT_REQUEST_BUDGET = 10_000_000;
const DEFAULT_REQUEST_DURATION = 30;

const FORBIDDEN_REQUEST_VALUE_PATTERNS = [
  /https?:\/\//i,
  /\bwww\./i,
  /\bact_\d+\b/i,
  /\b(?:account|campaign|adset|provider|creative)\b/i,
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
] as const;

type RequestStringKey = '업종' | '목표' | '성별' | '연령' | '소재형태';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readNonNegativeNumber(value: unknown): number | null {
  const numberValue = readFiniteNumber(value);
  return numberValue !== null && numberValue >= 0 ? numberValue : null;
}

function readNonNegativeInteger(value: unknown): number | null {
  const numberValue = readNonNegativeNumber(value);
  return numberValue === null ? null : Math.round(numberValue);
}

function readModelType(value: unknown): ForesightSimulatorMlBaselineProxyModelType | null {
  if (
    value === 'random_forest' ||
    value === 'hist_gradient_boosting' ||
    value === 'linear_regression' ||
    value === 'ridge'
  ) {
    return value;
  }
  return null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function hasForbiddenRequestValue(value: string): boolean {
  return FORBIDDEN_REQUEST_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function readOptionalRequestString(
  body: Record<string, unknown>,
  key: RequestStringKey,
): string {
  const value = body[key];
  if (value === undefined || value === null) return '';

  if (typeof value !== 'string') {
    throw new ForesightSimulatorMlBaselineProxyRequestValidationError(`${key} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.length > MAX_REQUEST_STRING_LENGTH) {
    throw new ForesightSimulatorMlBaselineProxyRequestValidationError(
      `${key} must be at most ${MAX_REQUEST_STRING_LENGTH} characters`,
    );
  }

  if (hasForbiddenRequestValue(trimmed)) {
    throw new ForesightSimulatorMlBaselineProxyRequestValidationError(
      `${key} must not contain source identifiers or secrets`,
    );
  }

  return trimmed;
}

function readOptionalRequestStringArray(
  body: Record<string, unknown>,
  key: '노출위치',
): string[] {
  const value = body[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new ForesightSimulatorMlBaselineProxyRequestValidationError(
      `${key} must be an array of strings`,
    );
  }
  if (value.length > MAX_REQUEST_ARRAY_LENGTH) {
    throw new ForesightSimulatorMlBaselineProxyRequestValidationError(
      `${key} must contain at most ${MAX_REQUEST_ARRAY_LENGTH} values`,
    );
  }

  return value.flatMap((item) => {
    if (typeof item !== 'string') {
      throw new ForesightSimulatorMlBaselineProxyRequestValidationError(
        `${key} must contain only strings`,
      );
    }
    const trimmed = item.trim();
    if (!trimmed) return [];
    if (trimmed.length > MAX_REQUEST_STRING_LENGTH) {
      throw new ForesightSimulatorMlBaselineProxyRequestValidationError(
        `${key} values must be at most ${MAX_REQUEST_STRING_LENGTH} characters`,
      );
    }
    if (hasForbiddenRequestValue(trimmed)) {
      throw new ForesightSimulatorMlBaselineProxyRequestValidationError(
        `${key} must not contain source identifiers or secrets`,
      );
    }
    return [trimmed];
  });
}

function readSafeResponseString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_REQUEST_STRING_LENGTH) return null;
  if (hasForbiddenRequestValue(trimmed)) return null;
  return trimmed;
}

function readBoundedRequestNumber(
  body: Record<string, unknown>,
  key: '예산' | '기간',
  bounds: {
    defaultValue: number;
    min: number;
    max?: number;
  },
): number {
  const value = body[key];
  if (value === undefined || value === null) return bounds.defaultValue;

  const numberValue = readFiniteNumber(value);
  if (numberValue === null) {
    throw new ForesightSimulatorMlBaselineProxyRequestValidationError(
      `${key} must be a finite number`,
    );
  }

  if (numberValue < bounds.min || (bounds.max !== undefined && numberValue > bounds.max)) {
    const message = bounds.max === undefined
      ? `${key} must be greater than or equal to ${bounds.min}`
      : `${key} must be between ${bounds.min} and ${bounds.max}`;
    throw new ForesightSimulatorMlBaselineProxyRequestValidationError(message);
  }

  return numberValue;
}

export function normalizeForesightSimulatorMlBaselineProxyRequest(
  value: unknown,
): ForesightSimulatorMlBaselineProxyRequest {
  if (!isRecord(value)) {
    throw new ForesightSimulatorMlBaselineProxyRequestValidationError(
      'request body must be an object',
    );
  }

  return {
    업종: readOptionalRequestString(value, '업종'),
    목표: readOptionalRequestString(value, '목표'),
    성별: readOptionalRequestString(value, '성별'),
    연령: readOptionalRequestString(value, '연령'),
    노출위치: readOptionalRequestStringArray(value, '노출위치'),
    소재형태: readOptionalRequestString(value, '소재형태'),
    예산: readBoundedRequestNumber(value, '예산', {
      defaultValue: DEFAULT_REQUEST_BUDGET,
      min: 1_000,
    }),
    기간: readBoundedRequestNumber(value, '기간', {
      defaultValue: DEFAULT_REQUEST_DURATION,
      min: 1,
      max: 365,
    }),
  };
}

export function allowlistForesightSimulatorMlBaselineProxySuccessResponse(
  value: unknown,
): ForesightSimulatorMlBaselineProxySuccessResponse | null {
  if (!isRecord(value)) return null;

  const response: ForesightSimulatorMlBaselineProxySuccessResponse = {};
  let hasValidAggregateMetric = false;

  for (const key of AGGREGATE_METRIC_KEYS) {
    const metric = readNonNegativeNumber(value[key]);
    if (metric !== null) {
      response[key] = metric;
      hasValidAggregateMetric = true;
    }
  }

  if (!hasValidAggregateMetric) return null;

  for (const key of OPTIONAL_AGGREGATE_NUMBER_KEYS) {
    const metric = readNonNegativeNumber(value[key]);
    if (metric !== null) response[key] = metric;
  }

  for (const key of OPTIONAL_AGGREGATE_BOOLEAN_KEYS) {
    const flag = readBoolean(value[key]);
    if (flag !== null) response[key] = flag;
  }

  const seasonalityReason = readSafeResponseString(value.seasonality_reason);
  if (seasonalityReason !== null) response.seasonality_reason = seasonalityReason;

  for (const key of R2_KEYS) {
    const score = readFiniteNumber(value[key]);
    if (score !== null) response[key] = score;
  }

  const modelType = readModelType(value.model_type);
  if (modelType !== null) response.model_type = modelType;

  const sampleCount = readNonNegativeInteger(value.n_samples);
  if (sampleCount !== null) response.n_samples = sampleCount;

  return response;
}

export function normalizeForesightSimulatorMlBaselineProxySuccessResponse(
  value: unknown,
): ForesightSimulatorMlBaselineProxyContractResult {
  const body = allowlistForesightSimulatorMlBaselineProxySuccessResponse(value);

  if (body === null) {
    return {
      ok: false,
      status: 502,
      body: { error: FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_ERROR },
    };
  }

  return { ok: true, body };
}
