import { describe, expect, it } from 'vitest';

import { extractIndustry, normalizeIndustryName } from '../../lib/xlsxLoader';

describe('xlsx loader industry normalization contract', () => {
  it('folds legacy health-food labels into the current canonical industry', () => {
    expect(normalizeIndustryName('의약/건기식')).toBe('의약/건강식');
    expect(normalizeIndustryName('의료/건강(건강기능식품)')).toBe('의약/건강식');
    expect(normalizeIndustryName('건강기능식품')).toBe('의약/건강식');
  });

  it('splits travel and lodging aliases into the tourism and leisure industry', () => {
    expect(normalizeIndustryName('여행')).toBe('관광/레저');
    expect(normalizeIndustryName('호텔')).toBe('관광/레저');
    expect(normalizeIndustryName('리조트')).toBe('관광/레저');
  });

  it('preserves supported existing industries while closing unknown labels to 기타', () => {
    expect(normalizeIndustryName('보험')).toBe('보험');
    expect(normalizeIndustryName('전자')).toBe('전자');
    expect(normalizeIndustryName('unknown-raw-source-token')).toBe('기타');
    expect(normalizeIndustryName('')).toBe('기타');
  });

  it('extracts a normalized industry from account names without leaking brand fragments', () => {
    expect(extractIndustry('2026_브랜드명_호텔')).toBe('관광/레저');
    expect(extractIndustry('본부_마케팅팀_화장품')).toBe('뷰티');
    expect(extractIndustry('LGE_Total')).toBe('기타');
  });
});
