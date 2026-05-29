import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SIMULATOR_ERROR_COPY = [
  '필터 정보를 불러오지 못했습니다',
  '기본 예측을 불러오지 못했습니다',
  '예산 구간을 불러오지 못했습니다',
  '타겟 확장 시나리오를 불러오지 못했습니다',
  '보조 기준선을 불러오지 못했습니다',
];

const RAW_ERROR_SNIPPETS = [
  '.message}',
  '.message)',
  'String(error',
  'String(err',
  'JSON.stringify(error',
  'JSON.stringify(err',
  'response.statusText',
  'response.text()',
  'error.stack',
  'err.stack',
];

describe('simulator product-safe error states', () => {
  const source = readFileSync(
    join(process.cwd(), 'app', 'SimulatorPageClient.tsx'),
    'utf8',
  );
  const helperSource = readFileSync(
    join(process.cwd(), 'lib', 'foresightSimulatorProductSafeErrorViewModel.ts'),
    'utf8',
  );

  it('keeps every simulator fetch failure on bounded Korean copy', () => {
    expect(source).toContain("from '@/lib/foresightSimulatorProductSafeErrorViewModel'");
    expect(source).toContain('buildSimulatorErrorPanel');
    expect(source).toContain('SIMULATOR_PRODUCT_SAFE_ERRORS');
    expect(source).not.toContain('const SIMULATOR_PRODUCT_SAFE_ERRORS = {');
    expect(source).not.toContain('function buildSimulatorErrorPanel');
    expect(helperSource).toContain('export const SIMULATOR_PRODUCT_SAFE_ERRORS');
    expect(helperSource).toContain('export function buildSimulatorErrorPanel');
    expect(source).toContain('setFiltersError(true)');
    expect(source).toContain('setPredictionError(true)');
    expect(source).toContain('setRangeError(true)');
    expect(source).toContain('setScenarioError(true)');
    expect(source).toContain('setMlError(SIMULATOR_PRODUCT_SAFE_ERRORS.mlBaseline.title)');

    for (const copy of SIMULATOR_ERROR_COPY) {
      expect(helperSource).toContain(copy);
    }
  });

  it('renders simulator errors through small StatePanel ledgers', () => {
    expect(source).toContain('ledger={filtersErrorPanel.ledger}');
    expect(source).toContain('ledger={predictionErrorPanel.ledger}');
    expect(source).toContain('ledger={rangeErrorPanel.ledger}');
    expect(source).toContain('ledger={scenarioErrorPanel.ledger}');
    expect(source).toContain('ledger={mlErrorPanel.ledger}');
    expect(source).toContain('variant="error"');
  });

  it('does not expose raw error details in simulator UI contracts', () => {
    for (const snippet of RAW_ERROR_SNIPPETS) {
      expect(source).not.toContain(snippet);
    }

    expect(source).not.toContain('console.error');
  });
});
