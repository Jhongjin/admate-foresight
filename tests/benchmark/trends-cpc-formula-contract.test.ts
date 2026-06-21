import { afterEach, describe, expect, it } from 'vitest';

import { getBreakdown, getTrends } from '../../lib/trendsData';
import { setDemoData, setXlsxData, type XlsxRecord } from '../../lib/xlsxLoader';

function record(overrides: Partial<XlsxRecord> = {}): XlsxRecord {
  return {
    업종: '교육',
    목표: 'OUTCOME_TRAFFIC',
    최적화목표: '',
    노출위치: 'Instagram 피드',
    소재형태: '이미지',
    성별: 'female',
    연령: '25-34',
    도달: 1_000,
    노출: 10_000,
    지출금액: 1_000,
    빈도: 1,
    CPM: 100,
    CPC: 100,
    CPC링크: 0,
    영상조회수: 0,
    영상조회비용: 0,
    날짜: '2025-06-01',
    ...overrides,
  };
}

describe('trends CPC formula contract', () => {
  afterEach(() => {
    setXlsxData([]);
    setDemoData([]);
  });

  it('uses summed spend over inferred clicks for trends and breakdown CPC', () => {
    const rows = [
      ...Array.from({ length: 5 }, () => record({ 지출금액: 1_000, CPC: 100 })),
      ...Array.from({ length: 5 }, () => record({ 지출금액: 9_000, CPC: 900 })),
    ];
    setXlsxData(rows);
    setDemoData(rows);

    const trends = getTrends(['교육'], [], [], ['OUTCOME_TRAFFIC']);
    expect(trends[0]?.trends[0]).toMatchObject({
      month: '2025-06',
      avgCPC: 500,
      totalSpend: 50_000,
      totalClicks: 100,
    });

    const breakdown = getBreakdown(['교육'], [], [], ['OUTCOME_TRAFFIC']);
    expect(breakdown.byGender[0]).toMatchObject({
      group: 'female',
      avgCPC: 500,
    });
    expect(breakdown.efficiencyRanks[0]).toMatchObject({
      industry: '교육',
      avgCPC: 500,
    });
  });
});
