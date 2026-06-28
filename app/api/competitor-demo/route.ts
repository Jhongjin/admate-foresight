import { NextRequest } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { checkRateLimit } from '@/lib/rateLimit';
import { noStoreJson } from '@/lib/security';
import { resolveCompetitorCreativeDemo } from '@/lib/competitorCreativeDemo';

export async function GET(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  const limited = checkRateLimit(req, {
    key: 'competitor-demo',
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry') ?? '';
  const keyword = searchParams.get('keyword') ?? '';
  const limit = Number.parseInt(searchParams.get('limit') ?? '9', 10);

  return noStoreJson({
    ...resolveCompetitorCreativeDemo({ industry, keyword, limit }),
    source: 'safe_demo_fallback',
    externalLookup: 'disabled_until_commander_approval',
  });
}
