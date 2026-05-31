import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import {
  FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_ERROR,
  FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_REQUEST_ERROR,
  normalizeForesightSimulatorMlBaselineProxyRequest,
  normalizeForesightSimulatorMlBaselineProxySuccessResponse,
} from '@/lib/foresightSimulatorMlBaselineProxyContract';

function jsonNoStore(body: unknown, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

/**
 * POST /api/py-predict
 *
 * Next.js → Python FastAPI ML 서비스 프록시.
 * 환경변수 PYTHON_API_URL 이 설정되지 않으면 503 반환.
 *
 * Body:
 *   { 업종, 목표, 성별, 연령, 예산, 기간 }
 *
 * Response (Python 서비스가 정상일 때):
 *   { cpm, ctr, cpc, reach, r2_cpm, r2_ctr, cv_r2, model_type, n_samples }
 */
export async function POST(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  const PY_API = process.env.PYTHON_API_URL;

  if (!PY_API) {
    return jsonNoStore(
      {
        error: 'ML 서비스 미설정',
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: '요청 본문 파싱 오류' }, { status: 400 });
  }

  let predictionRequest: ReturnType<typeof normalizeForesightSimulatorMlBaselineProxyRequest>;
  try {
    predictionRequest = normalizeForesightSimulatorMlBaselineProxyRequest(body);
  } catch {
    return jsonNoStore(
      { error: FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_REQUEST_ERROR },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${PY_API}/predict`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(predictionRequest),
      signal:  AbortSignal.timeout(10_000), // 10초 타임아웃
    });

    if (!res.ok) {
      return jsonNoStore(
        { error: 'ML 서비스 오류' },
        { status: 502 },
      );
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return jsonNoStore(
        { error: FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_ERROR },
        { status: 502 },
      );
    }

    const safePrediction = normalizeForesightSimulatorMlBaselineProxySuccessResponse(data);
    if (!safePrediction.ok) {
      return jsonNoStore(safePrediction.body, { status: safePrediction.status });
    }

    return jsonNoStore(safePrediction.body);
  } catch (err) {
    const isTimeout = err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return jsonNoStore(
      {
        error: isTimeout ? 'ML 서비스 응답 시간 초과' : 'ML 서비스 연결 실패',
      },
      { status: 503 },
    );
  }
}
