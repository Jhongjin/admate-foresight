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
    expect(xlsxLoader).toContain('get_monthly_aggregates_fast');
    expect(xlsxLoader).toContain('fetchRpcPagesByCount');
    expect(xlsxLoader).toContain('PARALLELISM = 6');
    expect(pythonLoader).toContain('"industry": "업종"');
    expect(pythonLoader).toContain('page=5000');
    expect(xlsxLoader).toMatch(/PGRST202|could not find.*function/i);
    expect(pythonLoader).toContain('("get_monthly_aggregates_fast", "get_monthly_aggregates")');
    expect(pythonLoader).toContain('PGRST202');
  });

  it('defines an explicit windowed aggregate cache path without raw data exposure', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS ad_data_foresight_metric_date_idx/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS foresight_monthly_aggregates_cache/i);
    expect(sql).toMatch(/PRIMARY KEY \(industry, objective, optimization_goal, placement, creative_format, metric_date\)/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION refresh_foresight_monthly_aggregates_window/i);
    expect(sql).toMatch(/p_start_date TEXT/i);
    expect(sql).toMatch(/p_end_date\s+TEXT/i);
    expect(sql).toMatch(/U&"\\C5C5\\C885"/i);
    expect(sql).toMatch(/U&"\\B0A0\\C9DC"/i);
    expect(sql).toMatch(/\bindustry\b/i);
    expect(sql).toMatch(/\bmetric_date\b/i);
    expect(sql).toMatch(/DELETE FROM foresight_monthly_aggregates_cache/i);
    expect(sql).toMatch(/INSERT INTO foresight_monthly_aggregates_cache/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION get_monthly_aggregates_fast/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION get_monthly_aggregates_fast_count/i);
    expect(sql).toMatch(/SELECT COUNT\(\*\) FROM foresight_monthly_aggregates_cache/i);
    expect(sql).toMatch(/FROM foresight_monthly_aggregates_cache/i);
    expect(sql).toMatch(/SECURITY INVOKER/i);
    expect(sql).toMatch(/SECURITY DEFINER/i);
    expect(sql).toMatch(/SET search_path = public/i);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION refresh_foresight_monthly_aggregates_window\(TEXT, TEXT\) FROM PUBLIC, anon, authenticated/i);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION get_monthly_aggregates_fast\(INT, INT\) TO anon, authenticated/i);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION get_monthly_aggregates_fast_count\(\) TO anon, authenticated/i);
    expect(sql).toMatch(/LIMIT GREATEST\(0, LEAST\(p_limit, 5000\)\)/i);
    expect(sql).not.toMatch(/[가-힣]/);
    expect(sql).not.toMatch(/\bDROP\b|\bTRUNCATE\b|\bUPDATE\b/i);
  });
});
