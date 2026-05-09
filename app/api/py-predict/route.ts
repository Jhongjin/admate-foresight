import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';

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
 *   { cpm, ctr, cpc, reach, r2_cpm, r2_ctr, cv_r2, model_type, trained_at, n_samples }
 */
export async function POST(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  const PY_API = process.env.PYTHON_API_URL;

  if (!PY_API) {
    return NextResponse.json(
      {
        error: 'ML 서비스 미설정',
        detail: 'PYTHON_API_URL 환경변수를 설정하세요. (예: http://localhost:8000)',
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문 파싱 오류' }, { status: 400 });
  }

  try {
    const res = await fetch(`${PY_API}/predict`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10_000), // 10초 타임아웃
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? 'ML 서비스 오류', status: res.status },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = String(err);
    const isTimeout = msg.includes('TimeoutError') || msg.includes('AbortError');
    return NextResponse.json(
      {
        error: isTimeout ? 'ML 서비스 응답 시간 초과' : 'ML 서비스 연결 실패',
        detail: msg,
        tip: 'python/ 디렉토리에서 "uvicorn main:app --port 8000" 으로 서버를 시작하세요.',
      },
      { status: 503 },
    );
  }
}
