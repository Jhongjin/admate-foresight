import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readRepoFiles(dir: string, extensions: Set<string>): Array<{ path: string; source: string }> {
  const results: Array<{ path: string; source: string }> = [];
  for (const entry of readdirSync(dir)) {
    if (
      entry === 'node_modules' ||
      entry === '.git' ||
      entry === '.next' ||
      entry === '.vercel' ||
      entry === 'tests'
    ) {
      continue;
    }
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...readRepoFiles(fullPath, extensions));
      continue;
    }
    if (!extensions.has(fullPath.split('.').pop() ?? '')) continue;
    results.push({
      path: relative(root, fullPath).replace(/\\/g, '/'),
      source: readFileSync(fullPath, 'utf8'),
    });
  }
  return results;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*#.*$/gm, '');
}

describe('external Foresight porting guardrails', () => {
  it('keeps public debug and export surfaces disabled', () => {
    const debugEnv = readFileSync(join(root, 'app', 'api', 'debug-env', 'route.ts'), 'utf8');
    const debugData = readFileSync(join(root, 'app', 'api', 'debug-data', 'route.ts'), 'utf8');
    const exportRoute = readFileSync(join(root, 'app', 'api', 'export', 'route.ts'), 'utf8');

    expect(debugEnv).toMatch(/status:\s*404/);
    expect(debugData).toMatch(/status:\s*404/);
    expect(exportRoute).toMatch(/Export is disabled\./);
    expect(exportRoute).toMatch(/status:\s*403/);

    for (const source of [debugEnv, debugData, exportRoute]) {
      expect(source).toMatch(/Cache-Control['"]?:\s*['"]no-store/);
      expect(source).not.toMatch(/process\.env|sample_row|stack|spawn|generate_excel/i);
    }
  });

  it('does not reintroduce TLS verification bypasses from external scripts', () => {
    const files = readRepoFiles(root, new Set(['ts', 'tsx', 'js', 'mjs', 'py']));
    const unsafePatterns = [
      /verify\s*=\s*False/,
      /disable_warnings\s*\(/,
      /ssl\._create_unverified_context/,
      /CERT_NONE/,
      /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/,
    ];

    const offenders = files.flatMap(({ path, source }) =>
      unsafePatterns
        .filter((pattern) => pattern.test(stripComments(source)))
        .map((pattern) => `${path}: ${pattern}`),
    );

    expect(offenders).toEqual([]);
  });
});
