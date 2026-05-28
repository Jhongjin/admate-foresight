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
  ].join(' ');
}

function expectNoForbiddenPromiseCopy(viewModel: ForesightPredictionEvidenceViewModel) {
  expect(collectOperatorCopy(viewModel)).not.toMatch(/confidence|certainty|promise|신뢰|확신|보장/i);
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
    expectNoForbiddenPromiseCopy(viewModel);
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
    expectNoForbiddenPromiseCopy(viewModel);
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
    expectNoForbiddenPromiseCopy(weightedAverage);
    expectNoForbiddenPromiseCopy(fallback);
  });
});
