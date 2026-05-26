import { NextRequest, NextResponse } from 'next/server';
import { noStoreJson } from './security';

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  return forwarded || realIp || 'unknown';
}

export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions,
): NextResponse | null {
  const now = Date.now();
  const bucketKey = `${options.key}:${getClientId(req)}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (current.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return noStoreJson(
      { error: 'Too many requests.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  current.count += 1;
  return null;
}
