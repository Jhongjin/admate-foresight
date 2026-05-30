export type ForesightSimulatorMlBaselineProxyModelType =
  | 'random_forest'
  | 'linear_regression';

export interface ForesightSimulatorMlBaselineProxySuccessResponse {
  cpm?: number;
  ctr?: number;
  cpc?: number;
  reach?: number;
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

const AGGREGATE_METRIC_KEYS = ['cpm', 'ctr', 'cpc', 'reach'] as const;
const R2_KEYS = ['r2_cpm', 'r2_ctr', 'cv_r2'] as const;

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
  if (value === 'random_forest' || value === 'linear_regression') return value;
  return null;
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
