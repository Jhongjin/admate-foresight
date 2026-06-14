import { NextRequest, NextResponse } from 'next/server';
import { buildForesightLoginPath, sanitizeForesightNextPath } from '@/lib/auth/foresightAuth';
import {
  clearForesightSessionCookie,
  isForesightHandoffConfigured,
  isValidForesightHandoffCode,
  redeemForesightHandoffCode,
  setForesightSessionCookie,
} from '@/lib/auth/foresightSession';

export const dynamic = 'force-dynamic';

function applyHandoffRedirectHeaders(response: NextResponse): NextResponse {
  response.headers.set('cache-control', 'no-store, no-cache, max-age=0, must-revalidate');
  response.headers.set('pragma', 'no-cache');
  response.headers.set('expires', '0');
  response.headers.set('referrer-policy', 'no-referrer');
  return response;
}

function redirectToLogin(
  request: NextRequest,
  nextPath: string,
  status: 'disabled' | 'invalid' | 'expired',
) {
  const response = NextResponse.redirect(
    new URL(`${buildForesightLoginPath(nextPath)}&handoff=${status}`, request.url),
  );
  clearForesightSessionCookie(response);
  return applyHandoffRedirectHeaders(response);
}

function hasExactlyOneCodeQuery(searchParams: URLSearchParams): boolean {
  const keys = Array.from(searchParams.keys());
  return keys.length === 1 && keys[0] === 'code';
}

function resolveSiteSwitchReturnPath(request: NextRequest, returnPath: string): string | null {
  try {
    const target = new URL(returnPath, request.nextUrl.origin);
    if (target.origin !== request.nextUrl.origin) return null;
    if (target.searchParams.get('admate_entry') !== 'site-switch') return null;

    target.searchParams.delete('admate_entry');
    const query = target.searchParams.toString();
    return `${target.pathname}${query ? `?${query}` : ''}${target.hash}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const fallbackNextPath = sanitizeForesightNextPath(undefined);
  const codeValues = request.nextUrl.searchParams.getAll('code');
  const code = codeValues[0] ?? null;

  if (!isForesightHandoffConfigured()) {
    return redirectToLogin(request, fallbackNextPath, 'disabled');
  }

  if (codeValues.length !== 1 || !hasExactlyOneCodeQuery(request.nextUrl.searchParams) || !isValidForesightHandoffCode(code)) {
    return redirectToLogin(request, fallbackNextPath, 'invalid');
  }

  const session = await redeemForesightHandoffCode(code);
  if (!session) {
    return redirectToLogin(request, fallbackNextPath, 'expired');
  }

  const siteSwitchReturnPath = resolveSiteSwitchReturnPath(request, session.returnPath);
  if (siteSwitchReturnPath) {
    const response = NextResponse.redirect(new URL(siteSwitchReturnPath, request.url));
    if (!setForesightSessionCookie(response, session)) {
      return redirectToLogin(request, session.returnPath, 'invalid');
    }

    return applyHandoffRedirectHeaders(response);
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', session.returnPath);
  loginUrl.searchParams.set('auth', 'success');
  const response = NextResponse.redirect(loginUrl);
  if (!setForesightSessionCookie(response, session)) {
    return redirectToLogin(request, session.returnPath, 'invalid');
  }

  return applyHandoffRedirectHeaders(response);
}
