import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('trends UI guardrails contract', () => {
  it('keeps the multi-month reach and frequency interpretation guard visible', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', 'trends', 'TrendsPageClient.tsx'),
      'utf8',
    );

    expect(source).toContain('다중 월 도달과 빈도는 단순 합산하지 않습니다');
    expect(source).toContain('사용자 중복 때문에 단순 합산 시 부풀려질 수 있습니다');
    expect(source).toContain('단일 월 또는 승인된 dedupe 기준');
  });

  it('exposes VTR as a first-class trend metric without treating it as a cost metric', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', 'trends', 'TrendsPageClient.tsx'),
      'utf8',
    );

    expect(source).toContain("key: 'avgVTR'");
    expect(source).toContain("label: 'VTR (%)'");
    expect(source).toContain("metric === 'avgCTR' || metric === 'avgVTR' || metric === 'totalReach'");
  });
});
