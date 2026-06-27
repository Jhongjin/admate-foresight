import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('meta sync batch runner contract', () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const script = readFileSync(
    join(process.cwd(), 'scripts', 'run-foresight-meta-sync-batches.mjs'),
    'utf8',
  );

  it('wires the operator runner through npm scripts', () => {
    expect(packageJson.scripts['run:meta-sync-batches']).toBe(
      'node scripts/run-foresight-meta-sync-batches.mjs',
    );
  });

  it('requires explicit production approval inputs and bounded sync windows', () => {
    expect(script).toContain('const MAX_WINDOW_DAYS = 14');
    expect(script).toContain("args.has('--apply')");
    expect(script).toContain('FORESIGHT_INTERNAL_KEY');
    expect(script).toContain('FORESIGHT_META_SYNC_ACCOUNT_ID');
    expect(script).toContain("'x-admate-internal-key': internalKey");
    expect(script).not.toContain('console.log(internalKey');
  });

  it('captures duplicate-skip telemetry and refreshes aggregate caches only when requested', () => {
    expect(script).toContain('skippedDuplicates');
    expect(script).toContain("args.has('--refresh-aggregates')");
    expect(script).toContain('refresh-foresight-aggregate-caches.mjs');
    expect(script).toContain('--insecure-tls');
  });
});
