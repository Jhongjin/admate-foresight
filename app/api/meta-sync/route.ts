import { NextRequest, NextResponse } from 'next/server';
import { syncMetaToSupabase } from '@/lib/metaSync';

/**
 * POST /api/meta-sync
 *
 * Body (선택):
 *   { datePreset?: string, since?: string, until?: string }
 *
 * 예) 최근 90일:  POST /api/meta-sync
 * 예) 특정 범위:  POST /api/meta-sync  { "since": "2025-01-01", "until": "2025-03-31" }
 */
export async function POST(req: NextRequest) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  // 단일 계정 또는 비즈니스 ID (환경변수 우선, body로 덮어쓰기 가능)
  const envAccountId  = process.env.META_AD_ACCOUNT_ID;
  const envBusinessId = process.env.META_BUSINESS_ID;

  if (!accessToken) {
    return NextResponse.json({ error: 'META_ACCESS_TOKEN 환경변수 없음' }, { status: 400 });
  }
  if (!envAccountId && !envBusinessId) {
    return NextResponse.json(
      { error: 'META_AD_ACCOUNT_ID 또는 META_BUSINESS_ID 환경변수 필요' },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({})) as {
    datePreset?:  string;
    since?:       string;
    until?:       string;
    adAccountId?: string;
    businessId?:  string;
  };

  const adAccountId = body.adAccountId ?? envAccountId;
  const businessId  = body.businessId  ?? envBusinessId;

  console.log('[meta-sync] 동기화 시작:', { adAccountId, businessId, ...body });

  try {
    const result = await syncMetaToSupabase({
      accessToken,
      adAccountId,
      businessId,
      datePreset: body.datePreset,
      since:      body.since,
      until:      body.until,
    });

    console.log('[meta-sync] 완료:', result);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[meta-sync] 예외:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
