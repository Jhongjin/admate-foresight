/**
 * instrumentation.ts
 * Next.js 서버 시작 시 1회 실행
 * 항상 Supabase에서 데이터 로드
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 기업 네트워크 SSL 인증서 우회 (가장 이른 시점에 설정)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const { loadFromSupabase, setXlsxData } = await import('./lib/xlsxLoader');
    const { fitRegressionModels } = await import('./lib/regression');

    console.log('[Warmup] Supabase에서 데이터 로딩 중...');
    try {
      const data = await loadFromSupabase();
      setXlsxData(data);
      console.log(`[Warmup] Supabase 로딩 완료 (${data.length}행)`);
    } catch (e) {
      console.error('[Warmup] Supabase 로딩 실패:', e);
    }

    console.log('[Warmup] 회귀 모델 피팅 중...');
    fitRegressionModels();
    console.log('[Warmup] 완료');
  }
}
