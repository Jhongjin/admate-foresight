import { NextRequest, NextResponse } from 'next/server';
import {
  getConfiguredInternalKey,
  INTERNAL_KEY_HEADER,
  requireInternalKey,
  sanitizeError,
} from '@/lib/security';

/**
 * POST /api/py-retrain
 *
 * Python FastAPI /retrain 엔드포인트 프록시.
 * 호출하면 Supabase 최신 데이터로 모델을 재학습시킵니다.
 *
 * 응답 예시:
 *   {
 *     message: "모델 갱신 완료 — 5,240개 샘플, R²(CPM)=0.7832",
 *     model_type: "random_forest",
 *     r2_cpm: 0.7832,
 *     r2_ctr: 0.6541,
 *     cv_r2: 0.7210,
 *     n_samples: 5240,
 *     trained_at: "2025-04-27T10:23:45Z"
 *   }
 */
export async function POST(req: NextRequest) {
  const blocked = requireInternalKey(req);
  if (blocked) return blocked;

  const PY_API = process.env.PYTHON_API_URL;

  if (!PY_API) {
    return NextResponse.json(
      { error: 'ML service is not configured.' },
      { status: 503 },
    );
  }

  try {
    const internalKey = getConfiguredInternalKey();
    const res = await fetch(`${PY_API}/retrain`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(internalKey ? { [INTERNAL_KEY_HEADER]: internalKey } : {}),
      },
      signal:  AbortSignal.timeout(120_000), // 재학습은 최대 2분
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Model retrain failed.' },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[py-retrain] failed:', sanitizeError(err));
    return NextResponse.json(
      { error: 'ML service request failed.' },
      { status: 503 },
    );
  }
}
