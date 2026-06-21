import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Foresight demographic aggregate fast RPC contract', () => {
  const xlsxLoader = readFileSync(join(process.cwd(), 'lib', 'xlsxLoader.ts'), 'utf8');
  const pythonLoader = readFileSync(join(process.cwd(), 'python', 'data_loader.py'), 'utf8');
  const sql = readFileSync(join(process.cwd(), 'supabase', 'get_demographic_aggregates_fast.sql'), 'utf8');

  it('prefers the fast demographic RPC while preserving legacy fallback', () => {
    expect(xlsxLoader).toContain("['get_demographic_aggregates_fast', 'get_demographic_aggregates']");
    expect(xlsxLoader).toContain('gender?: string');
    expect(xlsxLoader).toContain('textValue(r.성별, r.gender)');
    expect(xlsxLoader).toContain('numberValue(r.sum_도달, r.sum_reach)');
    expect(pythonLoader).toContain('("get_demographic_aggregates_fast", "get_demographic_aggregates")');
    expect(pythonLoader).toContain('"gender": "성별"');
    expect(pythonLoader).toContain('"age_range": "연령"');
  });

  it('defines a windowed demographic cache without exposing refresh to anon clients', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS foresight_demographic_aggregates_cache/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION refresh_foresight_demographic_aggregates_window/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION get_demographic_aggregates_fast/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION get_demographic_aggregates_fast_count/i);
    expect(sql).toMatch(/U&"\\C131\\BCC4"/i);
    expect(sql).toMatch(/U&"\\C5F0\\B839"/i);
    expect(sql).toMatch(/cpm_sum/i);
    expect(sql).toMatch(/cpm_count/i);
    expect(sql).toMatch(/sum_inferred_clicks/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS sum_inferred_clicks/i);
    expect(sql).toMatch(/SUM\(CASE WHEN cpc > 0 THEN U&"\\C9C0\\CD9C\\AE08\\C561" \/ cpc ELSE 0 END\)/i);
    expect(sql).toMatch(/COALESCE\(SUM\(sum_spend\) \/ NULLIF\(SUM\(sum_impressions\), 0\) \* 1000, 0\) AS avg_cpm/i);
    expect(sql).toMatch(/SUM\(sum_spend\) \/ NULLIF\(SUM\(sum_inferred_clicks\), 0\)/i);
    expect(sql).toMatch(/SUM\(cpc_sum\) \/ NULLIF\(SUM\(cpc_count\), 0\)/i);
    expect(sql).toMatch(/SECURITY INVOKER/i);
    expect(sql).toMatch(/SECURITY DEFINER/i);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION refresh_foresight_demographic_aggregates_window\(TEXT, TEXT\) FROM PUBLIC, anon, authenticated/i);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION get_demographic_aggregates_fast\(INT, INT\) TO anon, authenticated/i);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION get_demographic_aggregates_fast_count\(\) TO anon, authenticated/i);
    expect(sql).not.toMatch(/[가-힣]/);
    expect(sql).not.toMatch(/\bDROP\b|\bTRUNCATE\b|\bUPDATE\b/i);
  });
});
