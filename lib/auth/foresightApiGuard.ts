import 'server-only';

import { NextResponse } from 'next/server';
import { hasValidForesightSession } from '@/lib/auth/foresightSession';

export async function requireForesightApiSession(): Promise<NextResponse | null> {
  if (await hasValidForesightSession()) return null;

  return NextResponse.json(
    { error: 'Authentication required.' },
    {
      status: 401,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
