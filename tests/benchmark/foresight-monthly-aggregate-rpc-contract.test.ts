import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Foresight monthly aggregate fast RPC contract', () => {
  const xlsxLoader = readFileSync(join(process.cwd(), 'lib', 'xlsxLoader.ts'), 'utf8');
  const pythonLoader = readFileSync(join(process.cwd(), 'python', 'data_loader.py'), 'utf8');
  const sql = readFileSync(join(process.cwd(), 'supabase', 'get_monthly_aggregates_fast.sql'), 'utf8');

  it('prefers the fast aggregate RPC while preserving legacy fallback', () => {
    expect(xlsxLoader).toContain("['get_monthly_aggregates_fast', 'get_monthly_aggregates']");
    expect(xlsxLoader).toContain('industry?: string');
    expect(xlsxLoader).toContain('textValue(r.업종, r.industry)');
    expect(pythonLoader).toContain('"industry": "업종"');
    expect(xlsxLoader).toMatch(/PGRST202|could not find.*function/i);
    expect(pythonLoader).toContain('("get_monthly_aggregates_fast", "get_monthly_aggregates")');
    expect(pythonLoader).toContain('PGRST202');
  });

  it('defines an explicit materialized aggregate read path without raw data exposure', () => {
    expect(sql).toMatch(/CREATE MATERIALIZED VIEW IF NOT EXISTS foresight_monthly_aggregates_mv/i);
    expect(sql).toMatch(/to_jsonb\(d\)/i);
    expect(sql).toMatch(/U&'\\C5C5\\C885'/i);
    expect(sql).toMatch(/\bindustry\b/i);
    expect(sql).toMatch(/\bmetric_date\b/i);
    expect(sql).toMatch(/WITH NO DATA/i);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS foresight_monthly_aggregates_mv_order_idx/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION refresh_foresight_monthly_aggregates/i);
    expect(sql).toMatch(/REFRESH MATERIALIZED VIEW foresight_monthly_aggregates_mv/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION get_monthly_aggregates_fast/i);
    expect(sql).toMatch(/SECURITY INVOKER/i);
    expect(sql).toMatch(/SET search_path = public/i);
    expect(sql).toMatch(/LIMIT GREATEST\(0, LEAST\(p_limit, 5000\)\)/i);
    expect(sql).not.toMatch(/[가-힣]/);
    expect(sql).not.toMatch(/\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b/i);
  });
});
