import { NextResponse } from 'next/server';

const DISABLED_HEADERS = {
  'Cache-Control': 'no-store',
};

export async function POST() {
  return NextResponse.json(
    { error: 'Export is disabled.' },
    { status: 403, headers: DISABLED_HEADERS },
  );
}
