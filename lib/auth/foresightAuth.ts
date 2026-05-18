import { isProductionRuntime } from '@/lib/security';

export const FORESIGHT_ACCESS_REQUEST_URL =
  'https://sentinel.admate.ai.kr/access-request?product=foresight';

export const FORESIGHT_ACCESS_REQUEST_FALLBACK_URL =
  'https://sentinel.admate.ai.kr/access-request';

export const FORESIGHT_RESET_PASSWORD_URL =
  'https://sentinel.admate.ai.kr/reset-password';

export const FORESIGHT_PRODUCT_ID = 'foresight';

const FORESIGHT_NEXT_ORIGIN = 'https://foresight.admate.ai.kr';
const DEFAULT_NEXT_PATH = '/';
const MAX_NEXT_LENGTH = 512;
const CORE_PRODUCT_START_PATH = '/auth/product/start';

const ALLOWED_NEXT_PATHS = new Set([
  '/',
  '/trends',
  '/insights',
  '/competitor',
  '/account',
]);

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'api_key',
  'apikey',
  'secret',
  'password',
  'code',
  'otp',
  'session',
  'provider',
  'state',
]);

function firstQueryValue(raw: unknown): string | undefined {
  if (Array.isArray(raw)) {
    return typeof raw[0] === 'string' ? raw[0] : undefined;
  }
  return typeof raw === 'string' ? raw : undefined;
}

export function sanitizeForesightNextPath(raw: unknown): string {
  const value = firstQueryValue(raw);
  if (!value) return DEFAULT_NEXT_PATH;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_NEXT_LENGTH) return DEFAULT_NEXT_PATH;
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return DEFAULT_NEXT_PATH;
  if (trimmed.includes('\\')) return DEFAULT_NEXT_PATH;

  try {
    const parsed = new URL(trimmed, FORESIGHT_NEXT_ORIGIN);
    if (parsed.origin !== FORESIGHT_NEXT_ORIGIN) return DEFAULT_NEXT_PATH;
    if (parsed.pathname === '/api' || parsed.pathname.startsWith('/api/')) {
      return DEFAULT_NEXT_PATH;
    }
    if (!ALLOWED_NEXT_PATHS.has(parsed.pathname)) return DEFAULT_NEXT_PATH;

    const search = parsed.searchParams;
    for (const key of Array.from(search.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) search.delete(key);
    }

    const query = search.toString();
    return query ? `${parsed.pathname}?${query}` : parsed.pathname;
  } catch {
    return DEFAULT_NEXT_PATH;
  }
}

export function buildForesightLoginPath(rawNext: unknown): string {
  const next = sanitizeForesightNextPath(rawNext);
  return `/login?next=${encodeURIComponent(next)}`;
}

export function isForesightHandoffEnabled(): boolean {
  return process.env.FORESIGHT_AUTH_HANDOFF_ENABLED === 'true';
}

export function getAdMateCoreBaseUrl(): URL | null {
  const raw = process.env.ADMATE_CORE_BASE_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (isProductionRuntime() && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function buildForesightCoreStartUrl(rawNext: unknown): string | null {
  if (!isForesightHandoffEnabled()) return null;

  const coreBaseUrl = getAdMateCoreBaseUrl();
  if (!coreBaseUrl) return null;

  const next = sanitizeForesightNextPath(rawNext);
  const url = new URL(CORE_PRODUCT_START_PATH, coreBaseUrl);
  url.searchParams.set('product', FORESIGHT_PRODUCT_ID);
  url.searchParams.set('next', next);
  return url.toString();
}

export function getForesightAuthRequiredResponse() {
  return {
    error: 'Authentication required.',
  };
}
