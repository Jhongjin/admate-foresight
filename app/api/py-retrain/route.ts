import { NextRequest, NextResponse } from 'next/server';
import {
  getConfiguredInternalKey,
  INTERNAL_KEY_HEADER,
  requireInternalKey,
  sanitizeError,
} from '@/lib/security';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
};

const OPERATION = 'py_retrain';

interface PyRetrainRequestBody {
  operation?: string;
  dryRun?: boolean;
  execute?: boolean;
  reason?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function withNoStore(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

function isEnabled(name: string): boolean {
  return process.env[name] === 'true';
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

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
  if (blocked) return withNoStore(blocked);

  const body = await req.json().catch(() => ({})) as PyRetrainRequestBody;
  const operation = cleanString(body.operation) ?? OPERATION;
  if (operation !== OPERATION) {
    return jsonResponse({ error: 'Invalid operation.' }, 400);
  }

  const dryRun = body.dryRun !== false;
  if (dryRun) {
    return jsonResponse({
      status: 'dry_run',
      operation: OPERATION,
      dryRun: true,
      executionEnabled: false,
      wouldCallPythonRetrain: false,
      wouldMutateModelArtifact: false,
    });
  }

  const reason = cleanString(body.reason);
  if (body.execute !== true || !reason) {
    return jsonResponse({ error: 'Execution requires explicit approval.' }, 403);
  }

  if (!isEnabled('FORESIGHT_RETRAIN_EXECUTE_ENABLED')) {
    return jsonResponse({ error: 'Model retrain execution is disabled.' }, 403);
  }

  const PY_API = process.env.PYTHON_API_URL;

  if (!PY_API) {
    return jsonResponse({ error: 'ML service is not configured.' }, 503);
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
      return jsonResponse({ error: 'Model retrain failed.' }, res.status);
    }

    return jsonResponse({
      status: 'execution_completed',
      operation: OPERATION,
      modelType: data?.model_type ?? 'unknown',
      sampleCount: data?.n_samples ?? null,
    });
  } catch (err) {
    console.error('[py-retrain] failed:', sanitizeError(err));
    return jsonResponse({ error: 'ML service request failed.' }, 503);
  }
}
