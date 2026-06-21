import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Foresight aggregate refresh script contract', () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  const script = readFileSync(join(process.cwd(), 'scripts', 'refresh-foresight-aggregate-caches.mjs'), 'utf8');
  const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');

  it('wires an explicit operator script that is dry-run by default', () => {
    expect(packageJson.scripts['refresh:foresight-aggregate-caches']).toBe(
      'node scripts/refresh-foresight-aggregate-caches.mjs',
    );
    expect(script).toContain("const apply = args.has('--apply')");
    expect(script).toContain('dry run');
    expect(script).toContain('add --apply to execute refresh RPCs');
    expect(script).toContain('FORESIGHT_SUPABASE_SERVICE_ROLE_KEY is required for --apply');
    expect(script).toContain("function readEnv(name)");
    expect(script).toContain('[Environment]::GetEnvironmentVariable');
  });

  it('refreshes only approved aggregate cache RPCs and never logs secret values', () => {
    expect(script).toContain('refresh_foresight_monthly_aggregates_window');
    expect(script).toContain('refresh_foresight_demographic_aggregates_window');
    expect(script).toContain('get_monthly_aggregates_fast_count');
    expect(script).toContain('get_demographic_aggregates_fast_count');
    expect(script).toContain("const host = new URL(supabaseUrl).host");
    expect(script).not.toMatch(/console\.log\([^)]*serviceRoleKey/);
    expect(script).not.toMatch(/console\.log\([^)]*FORESIGHT_SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('documents the dry-run and apply commands next to aggregate cache operations', () => {
    expect(readme).toContain('npm run refresh:foresight-aggregate-caches -- --since 2026-03-01 --until 2026-04-01');
    expect(readme).toContain('npm run refresh:foresight-aggregate-caches -- --since 2026-03-01 --until 2026-04-01 --apply');
    expect(readme).toContain('dry-run by default');
  });
});
