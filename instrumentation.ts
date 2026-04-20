/**
 * instrumentation.ts
 * Next.js 서버 시작 시 1회 실행
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // NODE_TLS_REJECT_UNAUTHORIZED = '0' 제거:
    // Supabase는 정식 SSL 인증서를 사용하므로 TLS 검증 비활성화 불필요.
    // 비활성화 시 프로세스 전체의 HTTPS 인증서 검증이 꺼져 보안 위험 발생.
    const { loadFromSupabase, setXlsxData, setDemoData } = await import('./lib/xlsxLoader');
    const { fitRegressionModels } = await import('./lib/regression');

    console.log('[Warmup] Supabase 집계 데이터 로딩 중...');
    try {
      const { monthly, demo } = await loadFromSupabase();
      setXlsxData(monthly);
      setDemoData(demo);
      console.log(`[Warmup] 로딩 완료 — monthly:${monthly.length}행, demo:${demo.length}행`);
    } catch (e) {
      console.error('[Warmup] Supabase 로딩 실패:', e);
    }

    console.log('[Warmup] 회귀 모델 피팅 중...');
    fitRegressionModels();
    console.log('[Warmup] 완료');
  }
}
