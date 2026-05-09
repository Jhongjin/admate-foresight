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

export async function GET(request: NextRequest) {
  const nextPath = sanitizeForesightNextPath(request.nextUrl.searchParams.get('next'));
  const code = request.nextUrl.searchParams.get('code');

  if (!isForesightHandoffConfigured()) {
    return redirectToLogin(request, nextPath, 'disabled');
  }

  if (!isValidForesightHandoffCode(code)) {
    return redirectToLogin(request, nextPath, 'invalid');
  }

  const session = await redeemForesightHandoffCode(code);
  if (!session) {
    return redirectToLogin(request, nextPath, 'expired');
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  if (!setForesightSessionCookie(response, session)) {
    return redirectToLogin(request, nextPath, 'invalid');
  }

  return applyHandoffRedirectHeaders(response);
}
