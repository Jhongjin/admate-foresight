import { NextResponse } from 'next/server';
import { clearForesightSessionCookie } from '@/lib/auth/foresightSession';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    { status: 200, headers: NO_STORE_HEADERS },
  );
  clearForesightSessionCookie(response);
  return response;
}
