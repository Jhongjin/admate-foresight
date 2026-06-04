import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildForesightSentinelPredictionEvidenceManifest,
  FORESIGHT_SENTINEL_PREDICTION_EVIDENCE_MANIFEST_CONTRACT_VERSION,
  type ForesightSentinelPredictionEvidenceManifest,
  type ForesightSentinelPredictionEvidenceManifestSafetyFlags,
} from '../../lib/foresightSentinelPredictionEvidenceManifest';
import type { ForesightPredictionEvidenceViewModel } from '../../lib/foresightPredictionEvidenceViewModel';

const SAFETY_FLAG_KEYS: Array<keyof ForesightSentinelPredictionEvidenceManifestSafetyFlags> = [
  'localOnly',
  'reportOnly',
  'noDbWrite',
  'noProviderCall',
  'noAuthHandoff',
  'noSentinelIngestCall',
  'noCampaignMutation',
  'noRawIdentifier',
];

const SUPPORTED_PREDICTION_EVIDENCE_STATUSES = [
  'review_ready',
  'needs_evidence',
  'recent_data_only',
  'not_calculated',
];

const SUPPORTED_BASELINE_STATUSES = [
  'baseline_available',
  'baseline_limited',
  'baseline_missing',
];

const SUPPORTED_FORECAST_RANGE_STATUSES = [
  'range_ready',
  'range_needs_review',
  'range_unavailable',
];

const SUPPORTED_EVIDENCE_GATE_STATUSES = [
  'operator_review_ready',
  'operator_review_hold',
  'not_ready',
];

const FORBIDDEN_MANIFEST_VALUE_PATTERNS = [
  /https?:/i,
  /\bwww\./i,
  /\b[a-z0-9.-]+\.(?:com|net|org|io|co|kr|dev|test)\b/i,
  /(?:^|["\s])[a-z]:\\/i,
  /(?:^|["\s])\/[a-z0-9._-]+(?:\/[a-z0-9._-]+)+/i,
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
];

const FORBIDDEN_OPERATOR_SUMMARY_COPY = [
  /[{[\]}]/,
  /\b(?:confidence|certainty|promise|guarantee)\b/i,
  /신뢰|확신|보장|약속/,
];

function evidenceViewModel(
  overrides: Partial<ForesightPredictionEvidenceViewModel> = {},
): ForesightPredictionEvidenceViewModel {
  return {
    score: 74,
    averageR2: 0.72,
    basisLabel: '근거 점수',
    scoreLabel: '근거 보통',
    display: '74% · 근거 보통',
    gateStatus: '검토 가능',
    gateTone: 'ok',
    textToneClassName: 'text-sky-700',
    ledgerRows: [
      {
        key: 'basis_method',
        status: '확인됨',
        tone: 'ok',
        title: '산정 방식',
        summary: '설명력 점수와 매칭 규모를 함께 반영했습니다.',
      },
    ],
    ...overrides,
  };
}

function collectKeys(value: unknown, path: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectKeys(item, [...path, String(index)]));
  }

  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => {
    const nextPath = [...path, key];

    return [
      nextPath.join('.'),
      ...collectKeys(nested, nextPath),
    ];
  });
}

function expectManifestIsOperatorSafe(manifest: ForesightSentinelPredictionEvidenceManifest) {
  expect(manifest.contractVersion).toBe(
    FORESIGHT_SENTINEL_PREDICTION_EVIDENCE_MANIFEST_CONTRACT_VERSION,
  );
  expect(manifest.sourceProduct).toBe('foresight');
  expect(manifest.handoffTarget).toBe('sentinel_prelaunch');
  expect(SUPPORTED_PREDICTION_EVIDENCE_STATUSES).toContain(manifest.predictionEvidenceStatus);
  expect(SUPPORTED_BASELINE_STATUSES).toContain(manifest.baselineStatus);
  expect(SUPPORTED_FORECAST_RANGE_STATUSES).toContain(manifest.forecastRangeStatus);
  expect(SUPPORTED_EVIDENCE_GATE_STATUSES).toContain(manifest.evidenceGateStatus);

  for (const flag of SAFETY_FLAG_KEYS) {
    expect(manifest.safetyFlags[flag]).toBe(true);
  }

  const keyPaths = collectKeys(manifest);
  for (const flag of SAFETY_FLAG_KEYS) {
    expect(keyPaths.filter((path) => path.endsWith(flag))).toEqual([`safetyFlags.${flag}`]);
  }

  const manifestJson = JSON.stringify(manifest);
  for (const pattern of FORBIDDEN_MANIFEST_VALUE_PATTERNS) {
    expect(manifestJson).not.toMatch(pattern);
  }

  for (const pattern of FORBIDDEN_OPERATOR_SUMMARY_COPY) {
    expect(manifest.operatorSafeSummary).not.toMatch(pattern);
  }
}

describe('sentinel prediction evidence manifest contract', () => {
  it('builds a local-only sanitized manifest for Sentinel prelaunch review', () => {
    const manifest = buildForesightSentinelPredictionEvidenceManifest({
      predictionEvidence: evidenceViewModel(),
      baselineStatus: 'baseline_available',
      forecastRangeStatus: 'range_ready',
    });

    expect(manifest).toEqual({
      contractVersion: FORESIGHT_SENTINEL_PREDICTION_EVIDENCE_MANIFEST_CONTRACT_VERSION,
      sourceProduct: 'foresight',
      handoffTarget: 'sentinel_prelaunch',
      predictionEvidenceStatus: 'review_ready',
      baselineStatus: 'baseline_available',
      forecastRangeStatus: 'range_ready',
      evidenceGateStatus: 'operator_review_ready',
      operatorSafeSummary:
        '예측 근거, 기준선, 예상 구간이 운영자 검토용으로 준비되었습니다.',
      reasonCodes: [
        'prediction_evidence_ready',
        'baseline_available',
        'forecast_range_ready',
        'sentinel_review_handoff_blocked_until_manual_review',
      ],
      safetyFlags: {
        localOnly: true,
        reportOnly: true,
        noDbWrite: true,
        noProviderCall: true,
        noAuthHandoff: true,
        noSentinelIngestCall: true,
        noCampaignMutation: true,
        noRawIdentifier: true,
      },
    });
    expectManifestIsOperatorSafe(manifest);
  });

  it('maps prediction evidence statuses without carrying score internals or ledger copy', () => {
    const needsEvidence = buildForesightSentinelPredictionEvidenceManifest({
      predictionEvidence: evidenceViewModel({ gateStatus: '근거 보강', gateTone: 'watch' }),
      baselineStatus: 'baseline_limited',
      forecastRangeStatus: 'range_needs_review',
    });
    const recentDataOnly = buildForesightSentinelPredictionEvidenceManifest({
      predictionEvidence: evidenceViewModel({ gateStatus: '최근 데이터 기준', gateTone: 'idle' }),
      baselineStatus: 'baseline_available',
      forecastRangeStatus: 'range_needs_review',
    });
    const notCalculated = buildForesightSentinelPredictionEvidenceManifest({
      predictionEvidence: null,
      baselineStatus: 'baseline_missing',
      forecastRangeStatus: 'range_unavailable',
    });

    expect(needsEvidence).toMatchObject({
      predictionEvidenceStatus: 'needs_evidence',
      evidenceGateStatus: 'operator_review_hold',
    });
    expect(recentDataOnly).toMatchObject({
      predictionEvidenceStatus: 'recent_data_only',
      evidenceGateStatus: 'operator_review_hold',
    });
    expect(notCalculated).toMatchObject({
      predictionEvidenceStatus: 'not_calculated',
      evidenceGateStatus: 'not_ready',
    });

    for (const manifest of [needsEvidence, recentDataOnly, notCalculated]) {
      expect(manifest).not.toHaveProperty('score');
      expect(manifest).not.toHaveProperty('averageR2');
      expect(manifest).not.toHaveProperty('ledgerRows');
      expectManifestIsOperatorSafe(manifest);
    }
  });

  it('drops hostile raw fields, identifiers, URLs, diagnostics, and secrets from inputs', () => {
    const manifest = buildForesightSentinelPredictionEvidenceManifest({
      predictionEvidence: {
        ...evidenceViewModel(),
        rawCampaignId: 'campaign-123',
        accountId: 'act_123456789012345',
        providerAdId: 'ad-123',
        sourceUrl: 'https://provider.example.test/campaigns/123',
        runtimeDiagnostics: { requestPayload: { bearer: 'Bearer secret-token' } },
        executionId: '98765432109876543210',
      } as unknown as ForesightPredictionEvidenceViewModel,
      baselineStatus: 'baseline_available',
      forecastRangeStatus: 'range_ready',
      operatorSafeSummary:
        '{"accountId":"act_123456789012345","url":"https://provider.example.test/path"}',
      reasonCodes: [
        'prediction_evidence_ready',
        'raw_payload_dump',
        'token=secret-token',
      ],
    });

    expect(manifest.operatorSafeSummary).toBe(
      '예측 근거, 기준선, 예상 구간이 운영자 검토용으로 준비되었습니다.',
    );
    expect(manifest.reasonCodes).toEqual([
      'prediction_evidence_ready',
      'baseline_available',
      'forecast_range_ready',
      'sentinel_review_handoff_blocked_until_manual_review',
    ]);
    expectManifestIsOperatorSafe(manifest);
  });

  it('fails closed for unsupported enum input and keeps safety flags in one place', () => {
    const manifest = buildForesightSentinelPredictionEvidenceManifest({
      predictionEvidence: evidenceViewModel({ gateStatus: 'unreviewed' as never }),
      baselineStatus: 'provider_live_baseline' as never,
      forecastRangeStatus: 'sentinel_ingest_ready' as never,
    });

    expect(manifest).toMatchObject({
      predictionEvidenceStatus: 'not_calculated',
      baselineStatus: 'baseline_missing',
      forecastRangeStatus: 'range_unavailable',
      evidenceGateStatus: 'not_ready',
    });
    expectManifestIsOperatorSafe(manifest);
  });

  it('keeps the contract source free of routes, storage, provider, auth, env, and workflow calls', () => {
    const source = readFileSync(
      join(process.cwd(), 'lib', 'foresightSentinelPredictionEvidenceManifest.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/supabase|sql|insert|update|upsert|delete|select\s*\(/i);
    expect(source).not.toMatch(/n8n|workflow|activate/i);
    expect(source).not.toMatch(/\bproviderCall\s*\(/i);
    expect(source).not.toMatch(/\bsentinelIngest\s*\(/i);
    expect(source).not.toMatch(/process\.env|NEXT_PUBLIC_|SERVICE_ROLE|ANON_KEY/i);
    expect(source).not.toMatch(/cookies?\s*\(|headers?\s*\(|auth\s*\(/i);
  });
});
