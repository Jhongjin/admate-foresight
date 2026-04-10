/**
 * instrumentation.ts
 * Next.js 서버 시작 시 1회 실행
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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
