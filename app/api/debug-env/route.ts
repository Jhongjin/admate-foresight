import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

  return NextResponse.json({
    url_prefix: url.slice(0, 20),
    url_length: url.length,
    key_prefix: key.slice(0, 10),
    key_length: key.length,
    has_next_public_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_next_public_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    has_url: !!process.env.SUPABASE_URL,
    has_key: !!process.env.SUPABASE_ANON_KEY,
  });
}
