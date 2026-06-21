import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  getForesightSupabaseAnonKey,
  getForesightSupabaseUrl,
  getForesightSupabaseWriteKey,
} from '../../lib/foresightSupabaseEnv';

const ORIGINAL_ENV = { ...process.env };

function resetSupabaseEnv() {
  for (const key of Object.keys(process.env)) {
    if (
      key.includes('SUPABASE_URL') ||
      key.includes('SUPABASE_ANON_KEY') ||
      key.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      key === 'SUPABASE_KEY'
    ) {
      delete process.env[key];
    }
  }
}

describe('Foresight Supabase data-plane environment contract', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('uses dedicated Foresight Supabase env before legacy Core Supabase env', () => {
    resetSupabaseEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://core.example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'core-anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'core-service';
    process.env.FORESIGHT_SUPABASE_URL = 'https://foresight.example.supabase.co';
    process.env.FORESIGHT_SUPABASE_ANON_KEY = 'foresight-anon';
    process.env.FORESIGHT_SUPABASE_SERVICE_ROLE_KEY = 'foresight-service';

    expect(getForesightSupabaseUrl()).toBe('https://foresight.example.supabase.co');
    expect(getForesightSupabaseAnonKey()).toBe('foresight-anon');
    expect(getForesightSupabaseWriteKey()).toBe('foresight-service');
  });

  it('does not mix a Core service-role key with a dedicated Foresight data-plane URL', () => {
    resetSupabaseEnv();
    process.env.FORESIGHT_SUPABASE_URL = 'https://foresight.example.supabase.co';
    process.env.FORESIGHT_SUPABASE_ANON_KEY = 'foresight-anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'core-service';

    expect(getForesightSupabaseUrl()).toBe('https://foresight.example.supabase.co');
    expect(getForesightSupabaseAnonKey()).toBe('foresight-anon');
    expect(getForesightSupabaseWriteKey()).toBe('foresight-anon');
  });

  it('preserves legacy Supabase fallback when no dedicated Foresight env exists', () => {
    resetSupabaseEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://legacy.example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy-anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service';

    expect(getForesightSupabaseUrl()).toBe('https://legacy.example.supabase.co');
    expect(getForesightSupabaseAnonKey()).toBe('legacy-anon');
    expect(getForesightSupabaseWriteKey()).toBe('legacy-service');
  });

  it('keeps Python data scripts on the same no-cross-plane-key-mixing rule', () => {
    const pythonLoader = readFileSync(join(process.cwd(), 'python', 'data_loader.py'), 'utf8');
    const uploadScript = readFileSync(join(process.cwd(), 'scripts', 'upload_to_supabase.py'), 'utf8');

    expect(pythonLoader).toContain('def _has_dedicated_foresight_env()');
    expect(pythonLoader).toContain('if _has_dedicated_foresight_env():');
    expect(uploadScript).toContain('DEDICATED_FORESIGHT_ENV = any');
    expect(uploadScript).toContain('if DEDICATED_FORESIGHT_ENV:');

    const dedicatedUploadBranch = uploadScript
      .split('if DEDICATED_FORESIGHT_ENV:')[1]
      .split('else:')[0];
    expect(dedicatedUploadBranch).not.toMatch(/(?<!FORESIGHT_)SUPABASE_SERVICE_ROLE_KEY/);
    expect(dedicatedUploadBranch).not.toMatch(/(?<!FORESIGHT_)NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
