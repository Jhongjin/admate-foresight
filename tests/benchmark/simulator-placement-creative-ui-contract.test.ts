import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('simulator placement and creative UI contract', () => {
  const source = readFileSync(
    join(process.cwd(), 'app', 'SimulatorPageClient.tsx'),
    'utf8',
  ).replace(/\s+/g, ' ');

  it('loads placement and creative filter options from the shared filters envelope', () => {
    expect(source).toContain('setAvailablePlacements(Array.isArray(f.placements)');
    expect(source).toContain('setAvailableCreativeTypes(Array.isArray(f.creativeTypes)');
    expect(source).toContain('label="노출 위치"');
    expect(source).toContain('label="소재 형태"');
  });

  it('passes placement and creative selections to every simulator prediction family call', () => {
    expect(source).toContain(
      'fetchPrediction({ industries, genders, ageRanges, objectives, placements, creativeTypes, budget: monthlyBudget });',
    );
    expect(source).toContain(
      'fetchRange({ industries, genders, ageRanges, objectives, placements, creativeTypes, budget: monthlyBudget });',
    );
    expect(source).toContain('placements, creativeTypes, monthlyBudget');
  });

  it('keeps the Python ML baseline on the same placement axis without inventing multi-creative input', () => {
    expect(source).toContain('노출위치: params.placements');
    expect(source).toContain("소재형태: params.creativeTypes.length === 1 ? params.creativeTypes[0] : ''");
  });
});
