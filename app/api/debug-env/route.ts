import { NextResponse } from 'next/server';
import { blockProductionDebugRoute } from '@/lib/security';

export async function GET() {
  const blocked = blockProductionDebugRoute();
  if (blocked) return blocked;

  return NextResponse.json({
    has_next_public_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_next_public_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    has_url: !!process.env.SUPABASE_URL,
    has_key: !!process.env.SUPABASE_ANON_KEY,
  });
}
