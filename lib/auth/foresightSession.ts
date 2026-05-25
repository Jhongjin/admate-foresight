import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import {
  FORESIGHT_PRODUCT_ID,
  getAdMateCoreBaseUrl,
  isForesightHandoffEnabled,
  sanitizeForesightNextPath,
} from '@/lib/auth/foresightAuth';
import { isProductionRuntime } from '@/lib/security';

export const FORESIGHT_SESSION_COOKIE_NAME = 'admate_foresight_session';

const SESSION_VERSION = 1;
const MAX_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
const HANDOFF_REDEEM_PATH = '/api/auth/handoff/redeem';
const HANDOFF_CALLBACK_PATH = '/auth/handoff';
const DEFAULT_HANDOFF_CALLBACK_URL = 'https://foresight.admate.ai.kr/auth/handoff';
const HANDOFF_CODE_PATTERN = /^[A-Za-z0-9._~-]{16,512}$/;
const DEFAULT_ADMIN_NAVIGATION: ForesightAdminNavigation = {
  canManageAccessRequests: false,
  canManageOrganizations: false,
  canManageUsers: false,
};

interface ForesightSessionPayload {
  version: 1;
  product: typeof FORESIGHT_PRODUCT_ID;
  subject: string;
  expiresAt: number;
  profile?: ForesightSessionProfile | null;
  adminNavigation?: ForesightAdminNavigation;
}

export interface ForesightSessionProfile {
  displayName: string | null;
  email: string | null;
  accessLabel: string | null;
}

export interface ForesightAdminNavigation {
  canManageAccessRequests: boolean;
  canManageOrganizations: boolean;
  canManageUsers: boolean;
}

export interface ForesightSession {
  subject: string;
  expiresAt: number;
  profile: ForesightSessionProfile | null;
  adminNavigation: ForesightAdminNavigation;
}

interface RedeemedForesightSession {
  subject: string;
  expiresAt: number;
  returnPath: string;
  profile: ForesightSessionProfile | null;
  adminNavigation: ForesightAdminNavigation;
}

type JsonRecord = Record<string, unknown>;

function getSessionSecret(): string | null {
  const value = process.env.FORESIGHT_SESSION_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

function getProductSecret(): string | null {
  const value =
    process.env.FORESIGHT_HANDOFF_PRODUCT_SECRET?.trim() ||
    process.env.ADMATE_AUTH_HANDOFF_FORESIGHT_KEY?.trim();
  return value || null;
}

function hasSafeHandoffCallbackProtocol(url: URL): boolean {
  if (isProductionRuntime()) return url.protocol === 'https:';
  return url.protocol === 'https:' || url.protocol === 'http:';
}

function buildHandoffCallbackUrl(rawValue: string | undefined): string | null {
  const value = rawValue?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!hasSafeHandoffCallbackProtocol(url)) return null;

    url.username = '';
    url.password = '';
    url.pathname = HANDOFF_CALLBACK_PATH;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function getHandoffCallbackUrl(): string {
  return (
    buildHandoffCallbackUrl(process.env.FORESIGHT_HANDOFF_CALLBACK_URL) ??
    buildHandoffCallbackUrl(process.env.NEXT_PUBLIC_FORESIGHT_BASE_URL) ??
    DEFAULT_HANDOFF_CALLBACK_URL
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isPlainRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseExpiry(payload: JsonRecord): number | null {
  const now = Math.floor(Date.now() / 1000);
  const session = isPlainRecord(payload.session) ? payload.session : {};
  const expiresIn =
    readNumber(session.ttl_seconds) ??
    readNumber(session.ttlSeconds) ??
    readNumber(session.ttl) ??
    readNumber(payload.expiresInSeconds) ??
    readNumber(payload.expiresIn) ??
    readNumber(payload.sessionMaxAgeSeconds);
  if (expiresIn !== undefined) {
    const ttlSeconds = Math.floor(expiresIn);
    if (ttlSeconds <= 0) return null;
    return now + Math.min(ttlSeconds, MAX_SESSION_MAX_AGE_SECONDS);
  }

  const expiresAtRaw =
    readString(payload.expiresAt) ??
    readString(payload.sessionExpiresAt) ??
    readString(payload.expires_at);
  if (expiresAtRaw) {
    const millis = Date.parse(expiresAtRaw);
    if (Number.isFinite(millis)) {
      const seconds = Math.floor(millis / 1000);
      if (seconds > now) return Math.min(seconds, now + MAX_SESSION_MAX_AGE_SECONDS);
    }
  }

  return null;
}

function parseSessionProfile(value: unknown): ForesightSessionProfile | null {
  if (!isPlainRecord(value)) return null;

  const displayName = readString(value.displayName) ?? readString(value.display_name) ?? null;
  const email = readString(value.email) ?? null;
  const accessLabel = readString(value.accessLabel) ?? readString(value.access_label) ?? null;

  if (!displayName && !email && !accessLabel) return null;
  return { displayName, email, accessLabel };
}

function parseAdminNavigation(value: unknown): ForesightAdminNavigation {
  if (!isPlainRecord(value)) return DEFAULT_ADMIN_NAVIGATION;

  return {
    canManageAccessRequests: Boolean(
      value.can_manage_access_requests ?? value.canManageAccessRequests,
    ),
    canManageOrganizations: Boolean(
      value.can_manage_organizations ?? value.canManageOrganizations,
    ),
    canManageUsers: Boolean(value.can_manage_users ?? value.canManageUsers),
  };
}

function hasForesightAccess(payload: JsonRecord): boolean {
  const product = isPlainRecord(payload.product) ? payload.product : null;
  if (product) {
    const productSlug = readString(product.product_slug) ?? readString(product.slug);
    const productStatus = readString(product.status)?.toLowerCase();
    if (productSlug !== FORESIGHT_PRODUCT_ID) return false;
    return productStatus === 'active' || productStatus === 'enabled' || productStatus === 'ok';
  }

  if (payload.product === FORESIGHT_PRODUCT_ID && payload.access === true) return true;
  if (payload.product === FORESIGHT_PRODUCT_ID && payload.authorized === true) return true;
  if (payload.product === FORESIGHT_PRODUCT_ID && payload.hasAccess === true) return true;

  const productAccess = isPlainRecord(payload.productAccess) ? payload.productAccess : null;
  if (!productAccess) return false;

  return (
    productAccess.product === FORESIGHT_PRODUCT_ID &&
    (productAccess.access === true ||
      productAccess.authorized === true ||
      productAccess.hasAccess === true ||
      productAccess.status === 'active')
  );
}

function parseRedeemPayload(payload: unknown): RedeemedForesightSession | null {
  if (!isPlainRecord(payload) || !hasForesightAccess(payload)) {
    return null;
  }

  const account = isPlainRecord(payload.account) ? payload.account : {};
  const profile = isPlainRecord(payload.profile) ? payload.profile : {};
  const product = isPlainRecord(payload.product) ? payload.product : {};
  const session = isPlainRecord(payload.session) ? payload.session : {};
  const user = isPlainRecord(payload.user) ? payload.user : {};
  const subject =
    readString(payload.subject) ??
    readString(payload.sub) ??
    readString(profile.subject) ??
    readString(account.subject) ??
    readString(user.subject);

  if (!subject) return null;

  const expiresAt = parseExpiry(payload);
  if (!expiresAt) return null;

  return {
    subject,
    expiresAt,
    returnPath: sanitizeForesightNextPath(
      readString(payload.return_path) ??
        readString(payload.returnPath) ??
        readString(session.return_path) ??
        readString(session.returnPath),
    ),
    profile: {
      displayName:
        readString(profile.display_name) ??
        readString(profile.displayName) ??
        readString(profile.name) ??
        readString(account.display_name) ??
        readString(account.displayName) ??
        readString(user.name) ??
        null,
      email: readString(profile.email) ?? readString(account.email) ?? readString(user.email) ?? null,
      accessLabel:
        readString(product.access_label) ??
        readString(product.accessLabel) ??
        readString(product.label) ??
        'Foresight 사용 권한',
    },
    adminNavigation: parseAdminNavigation(payload.admin_navigation ?? payload.adminNavigation),
  };
}

function createSignedSessionCookie(session: RedeemedForesightSession): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt <= now) return null;

  const payload: ForesightSessionPayload = {
    version: SESSION_VERSION,
    product: FORESIGHT_PRODUCT_ID,
    subject: session.subject,
    expiresAt: session.expiresAt,
    profile: session.profile,
    adminNavigation: session.adminNavigation,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

export function isValidForesightHandoffCode(code: string | null): code is string {
  return typeof code === 'string' && HANDOFF_CODE_PATTERN.test(code);
}

export function isForesightHandoffConfigured(): boolean {
  return (
    isForesightHandoffEnabled() &&
    getAdMateCoreBaseUrl() !== null &&
    getProductSecret() !== null &&
    getSessionSecret() !== null
  );
}

export function readForesightSessionCookie(rawCookie: string | undefined): ForesightSession | null {
  const secret = getSessionSecret();
  if (!secret || !rawCookie) return null;

  const [encodedPayload, signature, extra] = rawCookie.split('.');
  if (!encodedPayload || !signature || extra !== undefined) return null;
  if (!safeEqual(signature, signPayload(encodedPayload, secret))) return null;

  const decoded = base64UrlDecode(encodedPayload);
  if (!decoded) return null;

  try {
    const payload = JSON.parse(decoded) as unknown;
    if (!isPlainRecord(payload)) return null;
    if (payload.version !== SESSION_VERSION || payload.product !== FORESIGHT_PRODUCT_ID) return null;
    const subject = readString(payload.subject);
    if (!subject) return null;

    const expiresAt = readNumber(payload.expiresAt);
    if (!expiresAt || expiresAt <= Math.floor(Date.now() / 1000)) return null;

    return {
      subject,
      expiresAt,
      profile: parseSessionProfile(payload.profile),
      adminNavigation: parseAdminNavigation(payload.adminNavigation),
    };
  } catch {
    return null;
  }
}

export function verifyForesightSessionCookie(rawCookie: string | undefined): boolean {
  return readForesightSessionCookie(rawCookie) !== null;
}

export async function getForesightSession(): Promise<ForesightSession | null> {
  const cookieStore = await cookies();
  return readForesightSessionCookie(cookieStore.get(FORESIGHT_SESSION_COOKIE_NAME)?.value);
}

export async function hasValidForesightSession(): Promise<boolean> {
  return (await getForesightSession()) !== null;
}

export function setForesightSessionCookie(
  response: NextResponse,
  session: RedeemedForesightSession,
): boolean {
  const cookieValue = createSignedSessionCookie(session);
  if (!cookieValue) return false;

  const now = Math.floor(Date.now() / 1000);
  response.cookies.set(FORESIGHT_SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: isProductionRuntime(),
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(1, session.expiresAt - now),
  });

  return true;
}

export function clearForesightSessionCookie(response: NextResponse): void {
  response.cookies.set(FORESIGHT_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProductionRuntime(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function redeemForesightHandoffCode(
  code: string,
): Promise<RedeemedForesightSession | null> {
  if (!isForesightHandoffConfigured()) return null;

  const coreBaseUrl = getAdMateCoreBaseUrl();
  const productSecret = getProductSecret();
  if (!coreBaseUrl || !productSecret) return null;

  try {
    const redeemUrl = new URL(HANDOFF_REDEEM_PATH, coreBaseUrl);
    const response = await fetch(redeemUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admate-product-handoff-key': productSecret,
      },
      body: JSON.stringify({
        product_slug: FORESIGHT_PRODUCT_ID,
        code,
        callback_url: getHandoffCallbackUrl(),
      }),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    return parseRedeemPayload(payload);
  } catch {
    return null;
  }
}
