import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildForecastRangeConfirmation } from '../../lib/forecastRangeConfirmation';
import type { DataSufficiency } from '../../lib/predictor';

const BLOCKED_READY_FLAGS = [
  'reportReady',
  'exportReady',
  'promotionReady',
  'applyReady',
] as const;

function sufficiency(overrides: Partial<DataSufficiency> = {}): DataSufficiency {
  return {
    status: 'sufficient',
    basis: 'exact_cohort',
    matchedCount: 12,
    minimumRequired: 10,
    warningCodes: [],
    ...overrides,
  };
}

function forecastPoint(dataSufficiency: DataSufficiency = sufficiency()) {
  return {
    budget: 5_000_000,
    reach: 1000,
    cpm: 5000,
    cpc: 500,
    dataSufficiency,
  };
}

describe('simulator forecast readiness contract', () => {
  it('keeps simulator static markers review-only and removes stale export-allowed copy', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', 'SimulatorPageClient.tsx'),
      'utf8',
    );

    expect(source).toContain('보고서 출력은 검토용');
    expect(source).toContain('리포트/내보내기/승격/적용 준비 false');
    expect(source).toContain('확정 성과 표현 금지 원칙');
    expect(source).not.toContain('내보내기 허용');

    for (const flag of BLOCKED_READY_FLAGS) {
      expect(source).not.toMatch(new RegExp(`${flag}\\s*:\\s*true`));
    }
  });

  it('keeps forecast range confirmation report, export, promotion, and apply readiness blocked', () => {
    const outcomes = [
      buildForecastRangeConfirmation({
        currentBudget: 5_000_000,
        range: [forecastPoint()],
      }),
      buildForecastRangeConfirmation({
        currentBudget: 5_000_000,
        range: [
          forecastPoint(
            sufficiency({
              status: 'insufficient',
              basis: 'global_fallback',
              matchedCount: 2,
              warningCodes: ['INSUFFICIENT_MATCHED_DATA'],
            }),
          ),
        ],
      }),
      buildForecastRangeConfirmation({
        currentBudget: 5_000_000,
        range: [],
      }),
    ];

    for (const outcome of outcomes) {
      expect(outcome.terminology).toEqual({
        rangeLabel: '예상 구간',
        reviewLabel: '운영자 검토',
        basisLabel: '집계 충분성',
        description:
          '집계 기반 예상 구간은 운영자 검토용입니다. 보고서, 내보내기, 승격, 적용은 후속 게이트 전까지 차단됩니다.',
      });

      for (const flag of BLOCKED_READY_FLAGS) {
        expect(outcome.readiness[flag]).toBe(false);
      }
    }
  });

  it('does not advertise enabled report, export, promotion, or apply readiness in the forecast range source', () => {
    const source = readFileSync(
      join(process.cwd(), 'lib', 'forecastRangeConfirmation.ts'),
      'utf8',
    );

    expect(source).not.toContain('내보내기 허용');
    for (const flag of BLOCKED_READY_FLAGS) {
      expect(source).toContain(`${flag}: false`);
      expect(source).not.toMatch(new RegExp(`${flag}\\s*:\\s*true`));
    }
  });
});
