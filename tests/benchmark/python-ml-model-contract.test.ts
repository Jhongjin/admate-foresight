import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('python ML model contract', () => {
  const source = readFileSync(join(process.cwd(), 'python', 'model.py'), 'utf8');
  const mainSource = readFileSync(join(process.cwd(), 'python', 'main.py'), 'utf8');
  const proxyRouteSource = readFileSync(join(process.cwd(), 'app', 'api', 'py-predict', 'route.ts'), 'utf8');

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

  it('keeps Python prediction traffic behind the same internal key boundary', () => {
    expect(proxyRouteSource).toContain('getConfiguredInternalKey');
    expect(proxyRouteSource).toContain('INTERNAL_KEY_HEADER');
    expect(proxyRouteSource).toContain('[INTERNAL_KEY_HEADER]: internalKey');
    expect(proxyRouteSource).toContain('ML 서비스 인증 미설정');

    expect(mainSource).toContain('INTERNAL_KEY_HEADER = "x-admate-internal-key"');
    expect(mainSource).toContain('allow_headers=["Content-Type", "Authorization", INTERNAL_KEY_HEADER]');
    expect(mainSource).toContain('x_admate_internal_key: Optional[str] = Header(default=None)');
    expect(mainSource).toContain('_require_internal_key(x_admate_internal_key)');
  });
});
