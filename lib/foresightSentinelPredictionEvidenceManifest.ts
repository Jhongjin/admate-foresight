import type {
  ForesightPredictionEvidenceViewModel,
} from './foresightPredictionEvidenceViewModel';

export const FORESIGHT_SENTINEL_PREDICTION_EVIDENCE_MANIFEST_CONTRACT_VERSION =
  'Foresight-Sentinel-Prelaunch-Prediction-Evidence-Manifest-Contract-1';

export type ForesightSentinelPredictionEvidenceStatus =
  | 'review_ready'
  | 'needs_evidence'
  | 'recent_data_only'
  | 'not_calculated';

export type ForesightSentinelBaselineStatus =
  | 'baseline_available'
  | 'baseline_limited'
  | 'baseline_missing';

export type ForesightSentinelForecastRangeStatus =
  | 'range_ready'
  | 'range_needs_review'
  | 'range_unavailable';

export type ForesightSentinelEvidenceGateStatus =
  | 'operator_review_ready'
  | 'operator_review_hold'
  | 'not_ready';

export type ForesightSentinelReasonCode =
  | 'prediction_evidence_ready'
  | 'prediction_evidence_needs_review'
  | 'prediction_recent_data_only'
  | 'prediction_not_calculated'
  | 'baseline_available'
  | 'baseline_limited'
  | 'baseline_missing'
  | 'forecast_range_ready'
  | 'forecast_range_needs_review'
  | 'forecast_range_unavailable'
  | 'sentinel_review_handoff_blocked_until_manual_review';

export interface ForesightSentinelPredictionEvidenceManifestSafetyFlags {
  localOnly: true;
  reportOnly: true;
  noDbWrite: true;
  noProviderCall: true;
  noAuthHandoff: true;
  noSentinelIngestCall: true;
  noCampaignMutation: true;
  noRawIdentifier: true;
}

export interface ForesightSentinelPredictionEvidenceManifest {
  contractVersion: typeof FORESIGHT_SENTINEL_PREDICTION_EVIDENCE_MANIFEST_CONTRACT_VERSION;
  sourceProduct: 'foresight';
  handoffTarget: 'sentinel_prelaunch';
  predictionEvidenceStatus: ForesightSentinelPredictionEvidenceStatus;
  baselineStatus: ForesightSentinelBaselineStatus;
  forecastRangeStatus: ForesightSentinelForecastRangeStatus;
  evidenceGateStatus: ForesightSentinelEvidenceGateStatus;
  operatorSafeSummary: string;
  reasonCodes: ForesightSentinelReasonCode[];
  safetyFlags: ForesightSentinelPredictionEvidenceManifestSafetyFlags;
}

export interface ForesightSentinelPredictionEvidenceManifestInput {
  predictionEvidence?: ForesightPredictionEvidenceViewModel | null;
  baselineStatus?: ForesightSentinelBaselineStatus;
  forecastRangeStatus?: ForesightSentinelForecastRangeStatus;
  operatorSafeSummary?: string;
  reasonCodes?: string[];
}

const SAFETY_FLAGS: ForesightSentinelPredictionEvidenceManifestSafetyFlags = {
  localOnly: true,
  reportOnly: true,
  noDbWrite: true,
  noProviderCall: true,
  noAuthHandoff: true,
  noSentinelIngestCall: true,
  noCampaignMutation: true,
  noRawIdentifier: true,
};

const BASELINE_STATUSES = [
  'baseline_available',
  'baseline_limited',
  'baseline_missing',
] as const;

const FORECAST_RANGE_STATUSES = [
  'range_ready',
  'range_needs_review',
  'range_unavailable',
] as const;

const REASON_CODES = [
  'prediction_evidence_ready',
  'prediction_evidence_needs_review',
  'prediction_recent_data_only',
  'prediction_not_calculated',
  'baseline_available',
  'baseline_limited',
  'baseline_missing',
  'forecast_range_ready',
  'forecast_range_needs_review',
  'forecast_range_unavailable',
  'sentinel_review_handoff_blocked_until_manual_review',
] as const;

const FORBIDDEN_OPERATOR_SUMMARY_PATTERNS = [
  /https?:/i,
  /\bwww\./i,
  /\b[a-z0-9.-]+\.(?:com|net|org|io|co|kr|dev|test)\b/i,
  /(?:^|\s)[a-z]:\\/i,
  /(?:^|\s)\/[a-z0-9._-]+(?:\/[a-z0-9._-]+)+/i,
  /\b[a-z0-9._-]+\/[a-z0-9._/-]+\b/i,
  /\bact_\d+\b/i,
  /\b(?:account|campaign|adset|provider|creative|ad)[_-]?[a-z0-9]{3,}\b/i,
  /\b\d{10,}\b/,
  /\b(?:access|refresh|id)?[_-]?token\b/i,
  /\bbearer\s+\S+/i,
  /\bcookie\b/i,
  /\bsession\b/i,
  /\bsecret\b/i,
  /\bcredential\b/i,
  /\bauth\b/i,
  /\benv\b/i,
  /\bpassword\b/i,
  /\b(?:raw|runtime|diagnostic|payload|dump|request|execution|event|hash|model)\b/i,
  /[{[\]}]/,
  /\b(?:confidence|certainty|promise|guarantee)\b/i,
  /신뢰|확신|보장|약속/,
];

function readBaselineStatus(value: unknown): ForesightSentinelBaselineStatus {
  return BASELINE_STATUSES.includes(value as ForesightSentinelBaselineStatus)
    ? value as ForesightSentinelBaselineStatus
    : 'baseline_missing';
}

function readForecastRangeStatus(value: unknown): ForesightSentinelForecastRangeStatus {
  return FORECAST_RANGE_STATUSES.includes(value as ForesightSentinelForecastRangeStatus)
    ? value as ForesightSentinelForecastRangeStatus
    : 'range_unavailable';
}

function readReasonCodes(value: unknown): ForesightSentinelReasonCode[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is ForesightSentinelReasonCode => (
    REASON_CODES.includes(item as ForesightSentinelReasonCode)
  ));
}

function predictionStatusFromEvidence(
  predictionEvidence: ForesightPredictionEvidenceViewModel | null | undefined,
): ForesightSentinelPredictionEvidenceStatus {
  if (!predictionEvidence) return 'not_calculated';

  if (predictionEvidence.gateStatus === '검토 가능') return 'review_ready';
  if (predictionEvidence.gateStatus === '최근 데이터 기준') return 'recent_data_only';
  if (predictionEvidence.gateStatus === '근거 보강') return 'needs_evidence';

  return 'not_calculated';
}

function evidenceGateStatusFromManifestStatuses(
  predictionEvidenceStatus: ForesightSentinelPredictionEvidenceStatus,
  baselineStatus: ForesightSentinelBaselineStatus,
  forecastRangeStatus: ForesightSentinelForecastRangeStatus,
): ForesightSentinelEvidenceGateStatus {
  if (
    predictionEvidenceStatus === 'review_ready' &&
    baselineStatus === 'baseline_available' &&
    forecastRangeStatus === 'range_ready'
  ) {
    return 'operator_review_ready';
  }

  if (
    predictionEvidenceStatus === 'not_calculated' ||
    baselineStatus === 'baseline_missing' ||
    forecastRangeStatus === 'range_unavailable'
  ) {
    return 'not_ready';
  }

  return 'operator_review_hold';
}

function defaultReasonCodes(
  predictionEvidenceStatus: ForesightSentinelPredictionEvidenceStatus,
  baselineStatus: ForesightSentinelBaselineStatus,
  forecastRangeStatus: ForesightSentinelForecastRangeStatus,
): ForesightSentinelReasonCode[] {
  const predictionReasonCode: Record<
    ForesightSentinelPredictionEvidenceStatus,
    ForesightSentinelReasonCode
  > = {
    review_ready: 'prediction_evidence_ready',
    needs_evidence: 'prediction_evidence_needs_review',
    recent_data_only: 'prediction_recent_data_only',
    not_calculated: 'prediction_not_calculated',
  };
  const baselineReasonCode: Record<ForesightSentinelBaselineStatus, ForesightSentinelReasonCode> = {
    baseline_available: 'baseline_available',
    baseline_limited: 'baseline_limited',
    baseline_missing: 'baseline_missing',
  };
  const forecastRangeReasonCode: Record<
    ForesightSentinelForecastRangeStatus,
    ForesightSentinelReasonCode
  > = {
    range_ready: 'forecast_range_ready',
    range_needs_review: 'forecast_range_needs_review',
    range_unavailable: 'forecast_range_unavailable',
  };

  return [
    predictionReasonCode[predictionEvidenceStatus],
    baselineReasonCode[baselineStatus],
    forecastRangeReasonCode[forecastRangeStatus],
    'sentinel_review_handoff_blocked_until_manual_review',
  ];
}

function buildDefaultOperatorSummary(
  evidenceGateStatus: ForesightSentinelEvidenceGateStatus,
): string {
  if (evidenceGateStatus === 'operator_review_ready') {
    return '예측 근거, 기준선, 예상 구간이 운영자 검토용으로 준비되었습니다.';
  }

  if (evidenceGateStatus === 'operator_review_hold') {
    return 'Sentinel 사전 검수로 넘기기 전에 예측 근거를 운영자가 한 번 더 확인해야 합니다.';
  }

  return 'Sentinel 사전 검수로 넘길 예측 근거가 아직 준비되지 않았습니다.';
}

function readOperatorSafeSummary(
  value: unknown,
  evidenceGateStatus: ForesightSentinelEvidenceGateStatus,
): string {
  if (typeof value !== 'string') return buildDefaultOperatorSummary(evidenceGateStatus);

  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.length > 220) return buildDefaultOperatorSummary(evidenceGateStatus);
  if (FORBIDDEN_OPERATOR_SUMMARY_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return buildDefaultOperatorSummary(evidenceGateStatus);
  }

  return trimmed;
}

export function buildForesightSentinelPredictionEvidenceManifest(
  input: ForesightSentinelPredictionEvidenceManifestInput = {},
): ForesightSentinelPredictionEvidenceManifest {
  const predictionEvidenceStatus = predictionStatusFromEvidence(input.predictionEvidence);
  const baselineStatus = readBaselineStatus(input.baselineStatus);
  const forecastRangeStatus = readForecastRangeStatus(input.forecastRangeStatus);
  const evidenceGateStatus = evidenceGateStatusFromManifestStatuses(
    predictionEvidenceStatus,
    baselineStatus,
    forecastRangeStatus,
  );
  const reasonCodes = Array.from(new Set([
    ...defaultReasonCodes(predictionEvidenceStatus, baselineStatus, forecastRangeStatus),
    ...readReasonCodes(input.reasonCodes),
  ]));

  return {
    contractVersion: FORESIGHT_SENTINEL_PREDICTION_EVIDENCE_MANIFEST_CONTRACT_VERSION,
    sourceProduct: 'foresight',
    handoffTarget: 'sentinel_prelaunch',
    predictionEvidenceStatus,
    baselineStatus,
    forecastRangeStatus,
    evidenceGateStatus,
    operatorSafeSummary: readOperatorSafeSummary(input.operatorSafeSummary, evidenceGateStatus),
    reasonCodes,
    safetyFlags: { ...SAFETY_FLAGS },
  };
}
