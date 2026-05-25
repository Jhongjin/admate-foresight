import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { XlsxRecord } from '../../lib/xlsxLoader';

function record(overrides: Partial<XlsxRecord>): XlsxRecord {
  return {
    업종: '뷰티',
    목표: 'OUTCOME_AWARENESS',
    최적화목표: '',
    노출위치: '',
    소재형태: '',
    성별: '',
    연령: '',
    도달: 10_000,
    노출: 100_000,
    지출금액: 100_000,
    빈도: 1,
    CPM: 1_000,
    CPC: 100,
    CPC링크: 80,
    영상조회수: 1_000,
    영상조회비용: 10,
    날짜: '2025-06-01',
    ...overrides,
  };
}

describe('regression objectives contract', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('includes objectives in fitted features and prediction rows', async () => {
    vi.resetModules();
    const { setDemoData, setXlsxData } = await import('../../lib/xlsxLoader');
    setXlsxData([
      record({ 목표: 'OUTCOME_AWARENESS', CPM: 1_000, CPC: 100, CPC링크: 80 }),
      record({ 목표: 'OUTCOME_TRAFFIC', CPM: 9_000, CPC: 900, CPC링크: 720 }),
    ]);
    setDemoData([]);

    const { fitRegressionModels, predictByRegression } = await import('../../lib/regression');
    const bundle = fitRegressionModels();

    expect(bundle.cats.objectives).toEqual(['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC']);
    expect(bundle.cpm.featureNames).toContain('obj_OUTCOME_TRAFFIC');

    const awareness = predictByRegression(
      ['뷰티'],
      [],
      [],
      ['OUTCOME_AWARENESS'],
      '2025-06',
    );
    const traffic = predictByRegression(
      ['뷰티'],
      [],
      [],
      ['OUTCOME_TRAFFIC'],
      '2025-06',
    );

    expect(traffic.cpm).toBeGreaterThan(awareness.cpm);
    expect(traffic.cpc).toBeGreaterThan(awareness.cpc);
  });

  it('passes objectives to current and previous month regression predictions', () => {
    const source = readFileSync(
      join(process.cwd(), 'lib', 'predictor.ts'),
      'utf8',
    ).replace(/\s+/g, ' ');

    expect(source).toContain(
      'predictByRegression(industries, genders, ageRanges, objectives, selMonth)',
    );
    expect(source).toContain(
      'predictByRegression(industries, genders, ageRanges, objectives, prevMonthStr)',
    );
    expect(source).not.toContain(
      'predictByRegression(industries, genders, ageRanges, selMonth)',
    );
    expect(source).not.toContain(
      'predictByRegression(industries, genders, ageRanges, prevMonthStr)',
    );
  });
});
