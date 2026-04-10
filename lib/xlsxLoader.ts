import path from 'path';
import * as XLSX from 'xlsx';

export interface XlsxRecord {
  업종: string;
  목표: string;
  성별: string;
  연령: string;
  도달: number;
  노출: number;
  지출금액: number;
  빈도: number;
  CPM: number;
  CPC: number;       // CPC(전체) = spend / clicks(all)
  CPC링크: number;   // CPC(링크) = cost_per_action_type.link_click
  영상조회수: number; // video_view (3초 조회수)
  영상조회비용: number; // cost_per_action_type.video_view (3초 조회당 비용)
  날짜: string;
}

/** Python 스타일 단따옴표 JSON 파싱 */
function parseActionMap(str: string | undefined): Record<string, number> {
  if (!str || str === 'nan') return {};
  try {
    const fixed = str.replace(/'/g, '"');
    const arr = JSON.parse(fixed) as Array<{ action_type: string; value: string }>;
    const map: Record<string, number> = {};
    for (const item of arr) map[item.action_type] = parseFloat(item.value) || 0;
    return map;
  } catch {
    return {};
  }
}

// 업종명 정규화 맵 (유사 업종 통합)
const INDUSTRY_NORMALIZE: Record<string, string> = {
  '기관.ver2':           '기관/단체',
  '생활잡화':            '생활/잡화',
  '생활잡화 공구':       '생활/잡화',
  '식음료(에너지바)':    '식음료',
  '의약':                '의약/건기식',
  '의료/건강':           '의약/건기식',
  '의료/건강(건강기능식품)': '의약/건기식',
  '의약품':              '의약/건기식',
  '건강뷰티':            '뷰티',
  '화장품':              '뷰티',
  '기타기관':            '기관/단체',
  '단체':                '기관/단체',
  '기관':                '기관/단체',
  '공공기관':            '공공기관',
  '문화예술':            '문화/예술',
  '생활/잡화':           '생활/잡화',
  '앱서비스':            '앱/사이트',
  '금융서비스':          '금융',
  '건설/분양':           '건설',
  '건설분양':            '건설',
  '가전':                '전자',
  '가전제품':            '전자',
  '패션':                '패션',
  '패션/의류':           '패션',
  '패션/잡화':           '패션',
  '의류':                '패션',
  '공공기관 (신규)':     '공공기관',
  '교육 (신규)':         '교육',
  '말레이시아':          '기타',
  '태국':                '기타',
  '모마2':               '기타',
  '모마':                '기타',
  '광고쿠폰':            '기타',
  '생화잡화':            '생활/잡화',
  '생활잡화/안마의자':   '생활/잡화',
  '주택가구':            '주택/가구',
  '화장품(스킨케어)':    '뷰티',
  '화장품/생활':         '뷰티',
  '정부기관':            '공공기관',
  '정부광고':            '공공기관',
  '부동산/건설':         '건설',
  '기타(에너지)':        '에너지',
  '기타(국방업)':        '기타',
  '쇼핑':                '기타',
  '컴퓨터/기술':         '전자',
  '박람회':              '엔터테인먼트',
  '영화':                '엔터테인먼트',
  '문화/예술':           '엔터테인먼트',
  '언론':                '방송통신',
  '에너지':              '기타',
  '의료기기':            '병의원',
  '제조':                '전자',
};

// 유효한 업종 파트인지 판별
// - 한글 포함, 팀명/브랜드명/숫자/회사명 아님
function isValidIndustryPart(s: string): boolean {
  if (!s || s.length > 20) return false;
  if (/^\d+$/.test(s)) return false;                       // 순수 숫자 (예: "2")
  if (s === 'Total') return false;                          // LGE 집계
  if (/팀|본부/.test(s)) return false;                     // 팀/본부 이름
  if (s.includes('협력광고') || s.includes('Collaborative')) return false;
  if (s.includes('홍보')) return false;                    // "VOD 홍보" 등 마케팅 용어
  if (!/[가-힣]/.test(s)) return false;                    // 한글 없는 영문 브랜드
  // 회사명 패턴: 한글회사명(영문) 형태 → 업종이 아닌 클라이언트명
  if (/[가-힣]+\([A-Za-z]/.test(s)) return false;
  return true;
}

export function extractIndustry(accountName: string): string {
  if (!accountName) return '';
  const parts = accountName.trim().split('_').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';

  // 뒤에서부터 유효한 업종 파트 탐색
  for (let i = parts.length - 1; i >= 0; i--) {
    const raw = parts[i];
    if (isValidIndustryPart(raw)) {
      return INDUSTRY_NORMALIZE[raw] ?? raw;
    }
  }

  return '기타';
}

// ── 캐시 ────────────────────────────────────────────────────────────────────
// monthly: 트렌드·예측·시즌용 (업종 × 목표 × 날짜)
// demo   : 성별/연령 브레이크다운용 (업종 × 목표 × 성별 × 연령)
let cachedXlsxData: XlsxRecord[] | null = null;   // monthly
let cachedDemoData: XlsxRecord[] | null = null;    // demographic
let initPromise: Promise<void> | null = null;

export function setXlsxData(data: XlsxRecord[]): void { cachedXlsxData = data; }
export function setDemoData(data: XlsxRecord[]): void  { cachedDemoData = data; }

/** 첫 요청 시 자동으로 Supabase 로딩 (lazy init) */
export async function ensureDataLoaded(): Promise<void> {
  if (cachedXlsxData !== null && cachedDemoData !== null) return;
  if (!initPromise) {
    initPromise = loadFromSupabase().then(({ monthly, demo }) => {
      cachedXlsxData = monthly;
      cachedDemoData = demo;
      import('./regression').then(({ fitRegressionModels }) => fitRegressionModels());
    }).catch((e) => {
      console.error('[xlsxLoader] Supabase 로딩 실패:', e);
      initPromise = null;
    });
  }
  await initPromise;
}

// ── RPC 헬퍼 ─────────────────────────────────────────────────────────────────
async function fetchRpcAllPages<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  fnName: string,
  args: Record<string, unknown> = {},
): Promise<T[]> {
  // 1) 총 행 수를 먼저 확인하기 위해 첫 페이지 요청 (count 헤더)
  const PAGE = 1_000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = await (client.rpc as any)(fnName, { ...args, p_limit: PAGE, p_offset: 0 });
  if (first.error) throw new Error(`RPC ${fnName} 오류: ${first.error.message}`);
  const firstRows = (first.data ?? []) as T[];

  if (firstRows.length < PAGE) return firstRows; // 한 페이지면 끝

  // 2) 나머지 페이지 수 파악 후 병렬 로딩 (BATCH=30 → Cloudflare 502 방지)
  // 총 행 수를 카운트 RPC로 가져옴
  const cntFn = fnName + '_count';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cntData, error: cntErr } = await (client.rpc as any)(cntFn);
  const total = cntErr ? firstRows.length : (Number(cntData) || firstRows.length);

  const offsets: number[] = [];
  for (let i = PAGE; i < total; i += PAGE) offsets.push(i);

  const BATCH = 30;
  const allRows: T[] = [...firstRows];
  for (let i = 0; i < offsets.length; i += BATCH) {
    const batch = offsets.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((offset) => (client.rpc as any)(fnName, { ...args, p_limit: PAGE, p_offset: offset }))
    );
    for (const { data, error } of results) {
      if (error) throw new Error(`RPC ${fnName} 오류: ${error.message}`);
      for (const row of (data ?? []) as T[]) allRows.push(row);
    }
    console.log(`[xlsxLoader] ${fnName} 로딩 중... ${allRows.length}/${total}`);
  }
  return allRows;
}

/** Supabase RPC 두 함수를 병렬 로딩 */
export async function loadFromSupabase(): Promise<{ monthly: XlsxRecord[]; demo: XlsxRecord[] }> {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY)!,
  );

  type MonthRow = { 업종:string; 목표:string; 날짜:string;
    avg_cpm:number; avg_cpc:number; avg_cpc_link:number; avg_영상조회비용:number;
    sum_도달:number; sum_노출:number; sum_지출금액:number; avg_빈도:number; sum_영상조회수:number; };
  type DemoRow  = { 업종:string; 목표:string; 성별:string; 연령:string;
    avg_cpm:number; avg_cpc:number; sum_도달:number; sum_노출:number; sum_지출금액:number; };

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '(없음)';
  console.log('[xlsxLoader] 집계 데이터 병렬 로딩 시작... URL:', supaUrl.slice(0, 30));
  const [monthRows, demoRows] = await Promise.all([
    fetchRpcAllPages<MonthRow>(client, 'get_monthly_aggregates'),
    fetchRpcAllPages<DemoRow>(client,  'get_demographic_aggregates'),
  ]);
  console.log(`[xlsxLoader] 로딩 완료 — monthly:${monthRows.length}행, demo:${demoRows.length}행`);

  const monthly: XlsxRecord[] = monthRows.map((r) => ({
    업종: r.업종 ?? '', 목표: r.목표 ?? '', 성별: '', 연령: '', 날짜: r.날짜 ?? '',
    CPM: Number(r.avg_cpm) || 0, CPC: Number(r.avg_cpc) || 0,
    CPC링크: Number(r.avg_cpc_link) || 0, 영상조회비용: Number(r.avg_영상조회비용) || 0,
    도달: Number(r.sum_도달) || 0, 노출: Number(r.sum_노출) || 0,
    지출금액: Number(r.sum_지출금액) || 0, 빈도: Number(r.avg_빈도) || 0,
    영상조회수: Number(r.sum_영상조회수) || 0,
  }));

  const demo: XlsxRecord[] = demoRows.map((r) => ({
    업종: r.업종 ?? '', 목표: r.목표 ?? '', 성별: r.성별 ?? '', 연령: r.연령 ?? '', 날짜: '',
    CPM: Number(r.avg_cpm) || 0, CPC: Number(r.avg_cpc) || 0,
    CPC링크: 0, 영상조회비용: 0,
    도달: Number(r.sum_도달) || 0, 노출: Number(r.sum_노출) || 0,
    지출금액: Number(r.sum_지출금액) || 0, 빈도: 0, 영상조회수: 0,
  }));

  console.log(`[xlsxLoader] 완료 — monthly:${monthly.length}행, demo:${demo.length}행`);
  return { monthly, demo };
}

/** 트렌드·예측·시즌 용도 (날짜 있음, 성별/연령 없음) */
export function loadXlsxData(): XlsxRecord[] { return cachedXlsxData ?? []; }
/** 성별/연령 브레이크다운 전용 */
export function loadDemoData(): XlsxRecord[]  { return cachedDemoData ?? []; }

export function getObjectives(): string[] {
  const data = loadXlsxData();
  const objectives = [...new Set(data.map((r) => r.목표).filter(Boolean))];
  return objectives.sort();
}

export function getXlsxIndustries(): string[] {
  const data = loadXlsxData();
  const industries = [...new Set(data.map((r) => r.업종).filter(Boolean))];
  return industries.sort();
}

/** 데이터에 존재하는 월 목록 (최신순, YYYY-MM 형식) */
export function getAvailableMonths(): string[] {
  const data = loadXlsxData();
  const months = [...new Set(
    data.map((r) => r.날짜.substring(0, 7)).filter((m) => /^\d{4}-\d{2}$/.test(m))
  )];
  return months.sort().reverse();
}
