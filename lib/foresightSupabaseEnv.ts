function hasDedicatedForesightSupabaseEnv(): boolean {
  return Boolean(
    process.env.FORESIGHT_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_FORESIGHT_SUPABASE_URL ||
      process.env.FORESIGHT_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_FORESIGHT_SUPABASE_ANON_KEY ||
      process.env.FORESIGHT_SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getForesightSupabaseUrl(): string {
  if (hasDedicatedForesightSupabaseEnv()) {
    return (
      process.env.FORESIGHT_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_FORESIGHT_SUPABASE_URL ||
      ''
    );
  }

  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
}

export function getForesightSupabaseAnonKey(): string {
  if (hasDedicatedForesightSupabaseEnv()) {
    return (
      process.env.FORESIGHT_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_FORESIGHT_SUPABASE_ANON_KEY ||
      ''
    );
  }

  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
}

export function getForesightSupabaseWriteKey(): string {
  if (hasDedicatedForesightSupabaseEnv()) {
    return (
      process.env.FORESIGHT_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.FORESIGHT_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_FORESIGHT_SUPABASE_ANON_KEY ||
      ''
    );
  }

  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  );
}
