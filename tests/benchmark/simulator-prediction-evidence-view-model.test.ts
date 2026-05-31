import { describe, expect, it } from 'vitest';

import {
  buildForesightPredictionEvidenceViewModel,
  type ForesightPredictionEvidenceViewModel,
} from '../../lib/foresightPredictionEvidenceViewModel';

function collectOperatorCopy(viewModel: ForesightPredictionEvidenceViewModel): string {
  return [
    viewModel.basisLabel,
    viewModel.scoreLabel,
    viewModel.display,
    viewModel.gateStatus,
    ...viewModel.ledgerRows.flatMap((row) => [
      row.status,
      row.title,
      row.summary,
    ]),
  ].join(' ');
}

function expectNoForbiddenPromiseCopy(viewModel: ForesightPredictionEvidenceViewModel) {
  expect(collectOperatorCopy(viewModel)).not.toMatch(/confidence|certainty|promise|신뢰|확신|보장/i);
}

function expectNoProtectedEvidenceLeak(viewModel: ForesightPredictionEvidenceViewModel) {
  const json = JSON.stringify(viewModel);

  expect(json).not.toMatch(/campaign|advertiser|account|provider|token|secret|env|raw/i);
  expect(json).not.toMatch(/act_123|campaign-123|ad-123|secret-token|private-secret/);
}

describe('simulator prediction evidence view model', () => {
  it('preserves the existing regression score formula for strong evidence', () => {
    const viewModel = buildForesightPredictionEvidenceViewModel({
      predictionMethod: 'regression',
      r2Cpm: 0.92,
      r2Cpc: 0.88,
      r2Vtr: 0.9,
      matchedCount: 200,
      marketSelected: true,
      loading: false,
      isCalculated: true,
    });

    expect(viewModel.score).toBe(89);
    expect(viewModel.averageR2).toBeCloseTo(0.9);
    expect(viewModel.display).toBe('89% · 근거 강함');
    expect(viewModel.gateStatus).toBe('검토 가능');
    expect(viewModel.gateTone).toBe('ok');
    expect(viewModel.textToneClassName).toBe('text-emerald-700');
    expect(viewModel.ledgerRows).toEqual([
      {
        key: 'basis_method',
        status: '확인됨',
        tone: 'ok',
        title: '산정 방식',
        summary: '설명력 점수와 매칭 규모를 함께 반영했습니다.',
      },
      {
        key: 'matched_data_size',
        status: '확인됨',
        tone: 'ok',
        title: '매칭 데이터',
        summary: '최근 조건과 맞는 데이터 200건을 사용했습니다.',
      },
      {
        key: 'model_quality',
        status: '확인됨',
        tone: 'ok',
        title: '예측 상태',
        summary: '설명력 지표가 검토 가능한 범위입니다.',
      },
      {
        key: 'benchmark_market_match',
        status: '확인됨',
        tone: 'ok',
        title: '비교 기준',
        summary: '선택 업종 기준과 비교해 해석합니다.',
      },
      {
        key: 'sharing_guardrail',
        status: '확인됨',
        tone: 'ok',
        title: '공유 기준',
        summary: '예상 범위와 함께 검토용으로 공유할 수 있습니다.',
      },
    ]);
    expectNoForbiddenPromiseCopy(viewModel);
    expectNoProtectedEvidenceLeak(viewModel);
  });

  it('preserves lower bound and review gate behavior for weak evidence', () => {
    const viewModel = buildForesightPredictionEvidenceViewModel({
      predictionMethod: 'regression',
      r2Cpm: 0.42,
      r2Cpc: 0.45,
      r2Vtr: 0.48,
      matchedCount: 20,
      marketSelected: false,
      loading: false,
      isCalculated: true,
    });

    expect(viewModel.score).toBe(42);
    expect(viewModel.averageR2).toBeCloseTo(0.45);
    expect(viewModel.display).toBe('42% · 근거 보강');
    expect(viewModel.gateStatus).toBe('근거 보강');
    expect(viewModel.gateTone).toBe('watch');
    expect(viewModel.textToneClassName).toBe('text-amber-700');
    expect(viewModel.ledgerRows).toMatchObject([
      {
        key: 'basis_method',
        status: '주의',
        tone: 'watch',
      },
      {
        key: 'matched_data_size',
        status: '주의',
        tone: 'watch',
        summary: '매칭 20건으로 보수 검토가 필요합니다.',
      },
      {
        key: 'model_quality',
        status: '주의',
        tone: 'watch',
        summary: '설명력 지표가 낮아 근거 보강이 필요합니다.',
      },
      {
        key: 'benchmark_market_match',
        status: '주의',
        tone: 'watch',
        summary: '업종 기준이 없어 전체 기준으로만 표시합니다.',
      },
      {
        key: 'sharing_guardrail',
        status: '주의',
        tone: 'watch',
      },
    ]);
    expectNoForbiddenPromiseCopy(viewModel);
    expectNoProtectedEvidenceLeak(viewModel);
  });

  it('keeps the market-selected bonus out of no-market score math', () => {
    const baseInput = {
      predictionMethod: 'regression' as const,
      r2Cpm: 0.8,
      r2Cpc: 0.8,
      r2Vtr: 0.8,
      matchedCount: 80,
      loading: false,
      isCalculated: true,
    };

    const noMarket = buildForesightPredictionEvidenceViewModel({
      ...baseInput,
      marketSelected: false,
    });
    const withMarket = buildForesightPredictionEvidenceViewModel({
      ...baseInput,
      marketSelected: true,
    });

    expect(noMarket.score).toBe(64);
    expect(withMarket.score).toBe(70);
    expect(noMarket.gateStatus).toBe('근거 보강');
    expect(withMarket.gateStatus).toBe('검토 가능');
    expectNoForbiddenPromiseCopy(noMarket);
    expectNoForbiddenPromiseCopy(withMarket);
    expectNoProtectedEvidenceLeak(noMarket);
    expectNoProtectedEvidenceLeak(withMarket);
  });

  it('returns loading and uncalculated display states without inventing a score', () => {
    expect(buildForesightPredictionEvidenceViewModel({
      matchedCount: 0,
      marketSelected: false,
      loading: true,
      isCalculated: false,
    })).toMatchObject({
      score: null,
      averageR2: null,
      basisLabel: '실행 전',
      scoreLabel: '계산 중',
      display: '계산 중',
      gateStatus: '미산정',
      gateTone: 'idle',
      ledgerRows: [
        {
          key: 'basis_method',
          status: '대기',
          tone: 'idle',
          title: '산정 방식',
          summary: '예측값과 근거를 계산하고 있습니다.',
        },
        {
          key: 'matched_data_size',
          status: '대기',
          tone: 'idle',
          title: '매칭 데이터',
          summary: '계산 완료 후 매칭 규모를 표시합니다.',
        },
        {
          key: 'model_quality',
          status: '대기',
          tone: 'idle',
          title: '예측 상태',
          summary: '설명력 지표를 확인하는 중입니다.',
        },
        {
          key: 'benchmark_market_match',
          status: '대기',
          tone: 'idle',
          title: '비교 기준',
          summary: '선택 조건에 맞는 기준을 준비하고 있습니다.',
        },
        {
          key: 'sharing_guardrail',
          status: '대기',
          tone: 'idle',
          title: '공유 기준',
          summary: '결과 확정 전에는 공유 판단을 보류합니다.',
        },
      ],
    });

    expect(buildForesightPredictionEvidenceViewModel({
      matchedCount: 0,
      marketSelected: false,
      loading: false,
      isCalculated: false,
    })).toMatchObject({
      score: null,
      averageR2: null,
      basisLabel: '실행 전',
      scoreLabel: '실행 전',
      display: '실행 전',
      gateStatus: '미산정',
      gateTone: 'idle',
      ledgerRows: [
        {
          key: 'basis_method',
          status: '대기',
          tone: 'idle',
          title: '산정 방식',
          summary: '시뮬레이션 실행 후 예측 근거를 표시합니다.',
        },
        {
          key: 'matched_data_size',
          status: '대기',
          tone: 'idle',
          title: '매칭 데이터',
          summary: '아직 비교할 매칭 규모가 없습니다.',
        },
        {
          key: 'model_quality',
          status: '대기',
          tone: 'idle',
          title: '예측 상태',
          summary: '실행 전에는 설명력 점수를 만들지 않습니다.',
        },
        {
          key: 'benchmark_market_match',
          status: '대기',
          tone: 'idle',
          title: '비교 기준',
          summary: '업종 선택 여부는 실행 후 근거에 반영됩니다.',
        },
        {
          key: 'sharing_guardrail',
          status: '대기',
          tone: 'idle',
          title: '공유 기준',
          summary: '임의 예측값 없이 실행 결과만 공유합니다.',
        },
      ],
    });
  });

  it('uses recent-data and evidence-reinforcement copy for non-regression methods', () => {
    const weightedAverage = buildForesightPredictionEvidenceViewModel({
      predictionMethod: 'weighted_avg',
      matchedCount: 42,
      marketSelected: true,
      loading: false,
      isCalculated: true,
    });
    const fallback = buildForesightPredictionEvidenceViewModel({
      predictionMethod: 'fallback',
      matchedCount: 0,
      marketSelected: false,
      loading: false,
      isCalculated: true,
    });

    expect(weightedAverage).toMatchObject({
      score: null,
      basisLabel: '최근 데이터 기준',
      display: '최근 데이터 기준',
      gateStatus: '최근 데이터 기준',
      gateTone: 'idle',
    });
    expect(fallback).toMatchObject({
      score: null,
      basisLabel: '근거 보강',
      display: '근거 보강',
      gateStatus: '근거 보강',
      gateTone: 'watch',
    });
    expect(weightedAverage.ledgerRows).toMatchObject([
      {
        key: 'basis_method',
        status: '주의',
        tone: 'watch',
        summary: '근거 점수 대신 최근 데이터 평균으로 표시합니다.',
      },
      {
        key: 'matched_data_size',
        status: '주의',
        tone: 'watch',
        summary: '매칭 42건으로 보수 검토가 필요합니다.',
      },
      {
        key: 'model_quality',
        status: '주의',
        tone: 'watch',
        summary: '근거 점수 없이 최근 데이터 기준으로 표시합니다.',
      },
      {
        key: 'benchmark_market_match',
        status: '확인됨',
        tone: 'ok',
        summary: '선택 업종 기준과 비교해 해석합니다.',
      },
      {
        key: 'sharing_guardrail',
        status: '주의',
        tone: 'watch',
        summary: '확정 성과가 아닌 최근 데이터 기준으로만 공유합니다.',
      },
    ]);
    expect(fallback.ledgerRows).toMatchObject([
      {
        key: 'basis_method',
        status: '주의',
        tone: 'watch',
        summary: '충분한 예측 근거가 없어 보수 기준을 적용합니다.',
      },
      {
        key: 'matched_data_size',
        status: '주의',
        tone: 'watch',
        summary: '매칭 데이터가 없어 보수 기준으로만 봅니다.',
      },
      {
        key: 'model_quality',
        status: '주의',
        tone: 'watch',
        summary: '근거 점수 없이 보수 기준으로 표시합니다.',
      },
      {
        key: 'benchmark_market_match',
        status: '주의',
        tone: 'watch',
        summary: '업종 기준이 없어 전체 기준으로만 표시합니다.',
      },
      {
        key: 'sharing_guardrail',
        status: '주의',
        tone: 'watch',
        summary: '공유 전 근거 보강 사유를 함께 남깁니다.',
      },
    ]);
    expectNoForbiddenPromiseCopy(weightedAverage);
    expectNoForbiddenPromiseCopy(fallback);
    expectNoProtectedEvidenceLeak(weightedAverage);
    expectNoProtectedEvidenceLeak(fallback);
  });
});
