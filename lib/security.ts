import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const INTERNAL_KEY_HEADER = 'x-admate-internal-key';

const INTERNAL_KEY_ENV_NAMES = [
  'ADMATE_INTERNAL_KEY',
  'FORESIGHT_INTERNAL_KEY',
  'INTERNAL_API_KEY',
];

export function getConfiguredInternalKey(): string | null {
  for (const name of INTERNAL_KEY_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function requireInternalKey(req: NextRequest): NextResponse | null {
  const expected = getConfiguredInternalKey();
  if (!expected) {
    return NextResponse.json(
      { error: 'Internal access is not configured.' },
      { status: 503 },
    );
  }

  const provided = req.headers.get(INTERNAL_KEY_HEADER) ?? '';
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

export function blockProductionDebugRoute(): NextResponse | null {
  if (!isProductionRuntime()) return null;
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export function maskIdentifier(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 6) return '***';
  return `${trimmed.slice(0, 3)}***${trimmed.slice(-2)}`;
}

export function redactSensitive(input: string): string {
  return input
    .replace(/access_token=([^&\s]+)/gi, 'access_token=[REDACTED]')
    .replace(/\b(token|key|secret)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]');
}

export function sanitizeError(err: unknown, maxLength = 300): string {
  const message = err instanceof Error ? err.message : String(err);
  return redactSensitive(message).slice(0, maxLength);
}
