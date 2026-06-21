import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('seasonality demographic fallback RPC artifact', () => {
  const source = readFileSync(
    join(process.cwd(), 'supabase', 'get_demographic_fallback_season.sql'),
    'utf8',
  );

  it('defines a date-bounded stable RPC without destructive DDL', () => {
    expect(source).toMatch(/CREATE OR REPLACE FUNCTION get_demographic_fallback_season/i);
    expect(source).toMatch(/p_since\s+TEXT/i);
    expect(source).toMatch(/p_until\s+TEXT/i);
    expect(source).toMatch(/breakdown_type\s*=\s*'demographic'/i);
    expect(source).toMatch(/날짜\s*>=\s*p_since/i);
    expect(source).toMatch(/날짜\s*<=\s*p_until/i);
    expect(source).toMatch(/LANGUAGE SQL/i);
    expect(source).toMatch(/STABLE/i);
    expect(source).toMatch(/SECURITY INVOKER/i);
    expect(source).toMatch(/SET search_path = public/i);
    expect(source).not.toMatch(/\bDROP\b|\bALTER\b|\bTRUNCATE\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b/i);
  });

  it('keeps pagination bounded for Supabase RPC reads', () => {
    expect(source).toMatch(/p_limit\s+INT DEFAULT 5000/i);
    expect(source).toMatch(/p_offset\s+INT DEFAULT 0/i);
    expect(source).toMatch(/LIMIT GREATEST\(0, LEAST\(p_limit, 5000\)\)/i);
    expect(source).toMatch(/OFFSET GREATEST\(0, p_offset\)/i);
  });
});
