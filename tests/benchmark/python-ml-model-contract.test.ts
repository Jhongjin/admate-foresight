import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('python ML model contract', () => {
  const source = readFileSync(join(process.cwd(), 'python', 'model.py'), 'utf8');

  it('keeps the sklearn boosting candidate optional and dependency-light', () => {
    expect(source).toContain('HistGradientBoostingRegressor');
    expect(source).toContain('"hist_gradient_boosting"');
    expect(source).toContain('if n >= 80:');
    expect(source).toContain('early_stopping=True');
    expect(source).toContain('validation_fraction=0.2');
    expect(source).not.toMatch(/\bimport\s+xgboost\b|\bimport\s+lightgbm\b/i);
  });

  it('winsorizes training targets without changing raw input rows in place', () => {
    expect(source).toContain('def _winsorize_series(');
    expect(source).toContain('0.01');
    expect(source).toContain('0.99');
    expect(source).toContain('0.03');
    expect(source).toContain('0.97');
    expect(source).toContain('work = df.copy()');
  });
});
