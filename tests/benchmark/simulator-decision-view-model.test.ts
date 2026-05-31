import { describe, expect, it } from 'vitest';

import {
  buildForesightSimulatorDecisionViewModel,
  type BuildForesightSimulatorDecisionViewModelInput,
  type ForesightSimulatorDecisionViewModel,
} from '../../lib/foresightSimulatorDecisionViewModel';
import type {
  ForecastRangeConfirmation,
  ForecastRangeConfirmationState,
} from '../../lib/forecastRangeConfirmation';

function baseInput(
  overrides: Partial<BuildForesightSimulatorDecisionViewModelInput> = {},
): BuildForesightSimulatorDecisionViewModelInput {
  return {
    result: null,
    loading: false,
    isCalculated: false,
    rangeLoading: false,
    rangeConfirmation: null,
    selectedTargetCount: 0,
    marketSelected: false,
    marketSampleCount: 0,
    matchedSampleCount: 0,
    campaignDays: 7,
    durationLabel: '7일',
    budget: 10_000_000,
    totalReach: 0,
    applySeasonBoost: false,
    peakCpmMultiplier: 1.3,
    chartDataLength: 0,
    objectiveLabel: '전체',
    genderLabel: '전체',
    ageLabel: '전체',
    ...overrides,
  };
}

function buildConfirmation(
  state: ForecastRangeConfirmationState,
): ForecastRangeConfirmation {
  const acceptedForReview = state === 'accepted_for_operator_review';

  return {
    state,
    acceptedForReview,
    aggregateOnly: true,
    range: {
      pointCount: 3,
      currentBudget: 20_000_000,
      currentBudgetPresent: acceptedForReview,
      minBudget: 10_000_000,
      maxBudget: 30_000_000,
      budgets: [10_000_000, 20_000_000, 30_000_000],
      aggregateFields: ['budget', 'reach', 'cpm', 'cpc', 'dataSufficiency'],
      sourceRowsIncluded: false,
      rawRecordsIncluded: false,
    },
    sufficiency: {
      status: acceptedForReview ? 'sufficient' : 'insufficient',
      basis: 'exact_cohort',
      statuses: [acceptedForReview ? 'sufficient' : 'insufficient'],
      bases: ['exact_cohort'],
      minimumMatchedCount: 42,
      minimumRequired: 20,
      warningCodes: acceptedForReview ? [] : ['CHECK_RANGE_BASIS'],
      blockedByInsufficientData: state === 'blocked_by_sufficiency',
    },
    readiness: {
      operatorReviewReady: acceptedForReview,
      llmReady: false,
      persistenceReady: false,
      reportReady: false,
      exportReady: false,
      promotionReady: false,
      applyReady: false,
    },
    sideEffectSummary: {
      llmCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      pythonRuns: 0,
      metaCalls: 0,
      exportWrites: 0,
      promotionApplyCalls: 0,
    },
    terminology: {
      rangeLabel: '예상 구간',
      reviewLabel: '운영자 검토',
      basisLabel: '집계 충분성',
      description: '집계 검토 테스트 값.',
    },
    warningCodes: acceptedForReview ? [] : ['CHECK_RANGE_BASIS'],
    rejectionReasons: state === 'rejected_invalid_range' ? ['MALFORMED_FORECAST_RANGE_POINT'] : [],
    blockedActions: [
      'llm_generation',
      'persistence_write',
      'report_generation',
      'export_write',
      'promotion_apply',
    ],
  };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

function expectNoSourceOrSecretLeak(viewModel: ForesightSimulatorDecisionViewModel) {
  const json = JSON.stringify(viewModel);
  const forbiddenKeyPatterns = [
    /raw/i,
    /source/i,
    /^account/i,
    /^campaign/i,
    /^ad[_-]?id$/i,
    /^provider/i,
    /url/i,
    /token/i,
    /cookie/i,
    /session/i,
    /secret/i,
  ];

  expect(collectKeys(viewModel).some((key) => (
    forbiddenKeyPatterns.some((pattern) => pattern.test(key))
  ))).toBe(false);
  expect(json).not.toMatch(/act_123|campaign-123|ad-123|meta-provider-id|secret-token|session-cookie|private-secret/);
}

describe('foresight simulator decision view model', () => {
  it('keeps pre-run readiness, preview, empty signals, and ledgers inert', () => {
    const viewModel = buildForesightSimulatorDecisionViewModel(baseInput());

    expect(viewModel.readinessLabel).toBe('설정 대기');
    expect(viewModel.benchmarkLabel).toBe('시뮬레이션 후 확인');
    expect(viewModel.actionHint).toBe('조건을 정한 뒤 시뮬레이션을 실행하세요.');
    expect(viewModel.forecastPreview).toEqual([
      { label: '예상 도달', value: '-', detail: '시뮬레이션 후 표시' },
      { label: '예상 CPM', value: '-', detail: '기준 확인 전' },
      { label: '예상 빈도', value: '-', detail: '노출 압력 대기' },
    ]);
    expect(viewModel.dataSufficiencyStatus).toBe('계산 전');
    expect(viewModel.dataSufficiencyLedger).toEqual([]);
    expect(viewModel.forecastEmptyStages).toEqual([
      { label: '입력 고정', status: '타겟 열림' },
      { label: '기준선 호출', status: '최근 6개월 기준선' },
      { label: '예측 확인', status: 'KPI와 구간 동시 확인' },
      { label: '결과 확인', status: '검토 / 수정 / 확장' },
    ]);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('builds the stable review surface for strong market-matched regression evidence', () => {
    const viewModel = buildForesightSimulatorDecisionViewModel(baseInput({
      result: {
        cpm: 5_000,
        frequency: 1.28,
        matchedCount: 200,
        predictionMethod: 'regression',
        r2Cpm: 0.92,
        r2Cpc: 0.88,
        r2Vtr: 0.9,
      },
      isCalculated: true,
      selectedTargetCount: 3,
      marketSelected: true,
      marketSampleCount: 240,
      matchedSampleCount: 200,
      campaignDays: 10,
      durationLabel: '10일',
      budget: 20_000_000,
      totalReach: 123_456,
      applySeasonBoost: true,
      chartDataLength: 3,
      objectiveLabel: '인지도',
      genderLabel: '여성',
      ageLabel: '25-34',
    }));

    expect(viewModel.readinessLabel).toBe('예측 준비');
    expect(viewModel.benchmarkDetail).toBe('업종 데이터 240건 · 매칭 200건');
    expect(viewModel.confidenceScore).toBe(89);
    expect(viewModel.sampleStatus).toMatchObject({
      label: '데이터 충분',
      detail: '매칭 200건',
    });
    expect(viewModel.forecastPreview).toEqual([
      { label: '예상 도달', value: '123,456명', detail: '10일 환산' },
      { label: '예상 CPM', value: '₩6,500', detail: '시즌 할증 포함' },
      { label: '예상 빈도', value: '1.28', detail: '노출 압력' },
    ]);
    expect(viewModel.predictionRangeRows[0]).toEqual({
      label: '도달 예상 범위',
      value: '113,580~133,332명',
      detail: '10일 환산 · ±8%',
    });
    expect(viewModel.decisionGateRows.map((row) => row.status)).toEqual([
      '업종 매칭',
      '검토 가능',
      '범위 내',
      '구간 확인 대기',
    ]);
    expect(viewModel.dataSufficiencyStatus).toBe('검토 가능');
    expect(viewModel.forecastGuardrails).toEqual([]);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('keeps fallback or no-market results bounded by guardrails and conservative status copy', () => {
    const viewModel = buildForesightSimulatorDecisionViewModel(baseInput({
      result: {
        cpm: 7_000,
        frequency: 2.4,
        matchedCount: 8,
        predictionMethod: 'fallback',
        saturationWarning: true,
      },
      isCalculated: true,
      selectedTargetCount: 2,
      matchedSampleCount: 8,
      totalReach: 50_000,
    }));

    expect(viewModel.benchmarkLabel).toBe('전체 기준 사용');
    expect(viewModel.confidenceScore).toBeNull();
    expect(viewModel.confidenceDisplay).toBe('근거 보강');
    expect(viewModel.sampleStatus).toMatchObject({
      label: '부족',
      detail: '매칭 8건',
    });
    expect(viewModel.predictionRangeRows[0]).toMatchObject({
      value: '38,000~62,000명',
      detail: '7일 환산 · ±24%',
    });
    expect(viewModel.decisionGateRows[2]).toMatchObject({
      status: '포화 주의',
      detail: '빈도 2.40',
      tone: 'risk',
    });
    expect(viewModel.dataSufficiencyStatus).toBe('근거 보강 필요');
    expect(viewModel.forecastGuardrails.map((item) => item.label)).toEqual([
      '업종 특화 평균처럼 표시하지 않음',
      '공유 전 근거 상태 확인',
      '확정 성과 표현 금지',
      '예산 곡선 없는 단일 KPI 판단 금지',
    ]);
    expectNoSourceOrSecretLeak(viewModel);
  });

  it('lets range confirmation status drive data sufficiency and scenario gate copy', () => {
    const viewModel = buildForesightSimulatorDecisionViewModel(baseInput({
      result: {
        cpm: 5_000,
        frequency: 1.1,
        matchedCount: 70,
        predictionMethod: 'regression',
        r2Cpm: 0.8,
        r2Cpc: 0.8,
        r2Vtr: 0.8,
      },
      isCalculated: true,
      rangeConfirmation: buildConfirmation('blocked_by_current_range'),
      selectedTargetCount: 1,
      marketSelected: true,
      marketSampleCount: 90,
      matchedSampleCount: 70,
      totalReach: 80_000,
      chartDataLength: 3,
    }));

    expect(viewModel.dataSufficiencyStatus).toBe('현재 예산 확인 필요');
    expect(viewModel.dataSufficiencyToneClassName).toBe('border-amber-200 bg-amber-50 text-amber-800');
    expect(viewModel.decisionGateRows[3]).toEqual({
      label: '시나리오 구간',
      status: '현재 예산 확인 필요',
      detail: '3개 구간 · 최소 매칭 42건',
      tone: 'risk',
    });
    expect(viewModel.dataSufficiencyLedger[2]).toEqual({
      label: '예산 구간',
      value: '현재 예산 확인 필요',
      detail: '3개 구간 · 최소 매칭 42건',
    });
    expectNoSourceOrSecretLeak(viewModel);
  });
});
