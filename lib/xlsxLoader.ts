import {
  getForesightSupabaseAnonKey,
  getForesightSupabaseUrl,
} from './foresightSupabaseEnv';

export interface XlsxRecord {
  업종: string;
  목표: string;
  최적화목표: string;
  노출위치: string;
  소재형태: string;
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

const VALID_INDUSTRIES = new Set([
  '건설',
  '게임',
  '공공기관',
  '교육',
  '금융',
  '보험',
  '기관/단체',
  '방송통신',
  '병의원',
  '부동산',
  '뷰티',
  '생활/잡화',
  '서비스',
  '관광/레저',
  '수송',
  '식음료',
  '앱/사이트',
  '엔터테인먼트',
  '의약/건강식',
  '전자',
  '주류',
  '주택/가구',
  '패션',
  '기타',
]);

// 업종명 정규화 맵 (유사 업종 통합)
const INDUSTRY_NORMALIZE: Record<string, string> = {
  '기관.ver2':           '기관/단체',
  '생활잡화':            '생활/잡화',
  '생활잡화 공구':       '생활/잡화',
  '생화잡화':            '생활/잡화',
  '생활잡화/안마의자':   '생활/잡화',
  '반려동물':            '생활/잡화',
  '펫':                  '생활/잡화',
  '생활용품':            '생활/잡화',
  '식음료(에너지바)':    '식음료',
  '식품':                '식음료',
  '음료':                '식음료',
  '외식':                '식음료',
  '푸드':                '식음료',
  '음식':                '식음료',
  '의약':                '의약/건강식',
  '의약/건기식':         '의약/건강식',
  '의료/건강':           '의약/건강식',
  '의료/건강(건강기능식품)': '의약/건강식',
  '의약품':              '의약/건강식',
  '건강기능식품':        '의약/건강식',
  '건강식품':            '의약/건강식',
  '헬스케어':            '의약/건강식',
  '건강뷰티':            '뷰티',
  '화장품':              '뷰티',
  '화장품(스킨케어)':    '뷰티',
  '화장품/생활':         '뷰티',
  '코스메틱':            '뷰티',
  '헤어':                '뷰티',
  '기타기관':            '기관/단체',
  '단체':                '기관/단체',
  '기관':                '기관/단체',
  '협회':                '기관/단체',
  '재단':                '기관/단체',
  '공공기관':            '공공기관',
  '정부기관':            '공공기관',
  '정부광고':            '공공기관',
  '지자체':              '공공기관',
  '문화예술':            '엔터테인먼트',
  '문화/예술':           '엔터테인먼트',
  '영화':                '엔터테인먼트',
  '박람회':              '엔터테인먼트',
  '음악':                '엔터테인먼트',
  '스포츠':              '엔터테인먼트',
  '공연':                '엔터테인먼트',
  '웹툰':                '엔터테인먼트',
  '출판':                '엔터테인먼트',
  '생활/잡화':           '생활/잡화',
  '앱서비스':            '앱/사이트',
  '앱':                  '앱/사이트',
  '플랫폼':              '앱/사이트',
  '커머스':              '앱/사이트',
  '금융서비스':          '금융',
  '증권':                '금융',
  '은행':                '금융',
  '카드':                '금융',
  '핀테크':              '금융',
  '투자':                '금융',
  '보험서비스':          '보험',
  '건설/분양':           '건설',
  '건설분양':            '건설',
  '시공':                '건설',
  '가전':                '전자',
  '가전제품':            '전자',
  '컴퓨터/기술':         '전자',
  '제조':                '전자',
  'IT':                  '전자',
  '스마트폰':            '전자',
  '반도체':              '전자',
  '패션':                '패션',
  '패션/의류':           '패션',
  '패션/잡화':           '패션',
  '의류':                '패션',
  '잡화':                '패션',
  '액세서리':            '패션',
  '신발':                '패션',
  '공공기관 (신규)':     '공공기관',
  '교육 (신규)':         '교육',
  '학원':                '교육',
  '이러닝':              '교육',
  'e러닝':               '교육',
  '유아교육':            '교육',
  '말레이시아':          '기타',
  '태국':                '기타',
  '모마2':               '기타',
  '모마':                '기타',
  '광고쿠폰':            '기타',
  '주택가구':            '주택/가구',
  '가구':                '주택/가구',
  '인테리어':            '주택/가구',
  '홈인테리어':          '주택/가구',
  '부동산/건설':         '부동산',
  '부동산/임대':         '부동산',
  '임대':                '부동산',
  '병원':                '병의원',
  '의료기기':            '병의원',
  '의료':                '병의원',
  '한의원':              '병의원',
  '치과':                '병의원',
  '성형':                '병의원',
  '언론':                '방송통신',
  '통신':                '방송통신',
  '미디어':              '방송통신',
  'OTT':                 '방송통신',
  '방송':                '방송통신',
  '여행':                '관광/레저',
  '관광':                '관광/레저',
  '레저':                '관광/레저',
  '숙박':                '관광/레저',
  '리조트':              '관광/레저',
  '호텔':                '관광/레저',
  '렌탈':                '서비스',
  '육아':                '서비스',
  '배달':                '서비스',
  '물류':                '서비스',
  '청소':                '서비스',
  '결혼':                '서비스',
  '자동차':              '수송',
  '운수':                '수송',
  '항공':                '수송',
  '자동차/수송':         '수송',
  '주류/음료':           '주류',
  '맥주':                '주류',
  '소주':                '주류',
  '와인':                '주류',
  '막걸리':              '주류',
  '기타(에너지)':        '기타',
  '기타(국방업)':        '기타',
  '쇼핑':                '기타',
  '에너지':              '기타',
};

export function normalizeIndustryName(raw: string | null | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '기타';
  const mapped = INDUSTRY_NORMALIZE[value] ?? value;
  return VALID_INDUSTRIES.has(mapped) ? mapped : '기타';
}

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
  if (!accountName) return '기타';
  const parts = accountName.trim().split('_').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return '기타';

  // 뒤에서부터 유효한 업종 파트 탐색
  for (let i = parts.length - 1; i >= 0; i--) {
    const raw = parts[i];
    if (isValidIndustryPart(raw)) {
      return normalizeIndustryName(raw);
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
// count 함수 호출 없이 페이지가 빌 때까지 순차 로딩
// (count RPC가 GROUP BY 전체 스캔으로 타임아웃 나는 문제 방지)
async function fetchRpcAllPages<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  fnNames: string | string[],
  args: Record<string, unknown> = {},
): Promise<T[]> {
  const candidates = Array.isArray(fnNames) ? fnNames : [fnNames];
  let missingRpcError: Error | null = null;
  for (const fnName of candidates) {
    try {
      return await fetchRpcAllPagesForFunction<T>(client, fnName, args);
    } catch (error) {
      if (isMissingRpcError(error) && candidates.length > 1) {
        missingRpcError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
      throw error;
    }
  }

  throw missingRpcError ?? new Error(`RPC ${candidates.join(', ')} 오류`);
}

function isMissingRpcError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /PGRST202|could not find.*function|function .* does not exist/i.test(message);
}

async function fetchRpcAllPagesForFunction<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  fnName: string,
  args: Record<string, unknown> = {},
): Promise<T[]> {
  const PAGE = 1_000;
  const count = await tryFetchRpcCount(client, fnName, args);
  if (count !== null) {
    return fetchRpcPagesByCount<T>(client, fnName, args, PAGE, count);
  }

  const allRows: T[] = [];
  let offset = 0;

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.rpc as any)(fnName, { ...args, p_limit: PAGE, p_offset: offset });
    if (error) throw new Error(`RPC ${fnName} 오류: ${error.message}`);
    const rows = (data ?? []) as T[];
    for (const row of rows) allRows.push(row);
    console.log(`[xlsxLoader] ${fnName} 로딩 중... ${allRows.length}행`);
    if (rows.length < PAGE) break; // 마지막 페이지
    offset += PAGE;
  }

  return allRows;
}

async function tryFetchRpcCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  fnName: string,
  args: Record<string, unknown>,
): Promise<number | null> {
  if (!fnName.endsWith('_fast') || Object.keys(args).length > 0) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.rpc as any)(`${fnName}_count`);
    if (error) throw new Error(`RPC ${fnName}_count 오류: ${error.message}`);
    const count = Number(data);
    return Number.isFinite(count) && count >= 0 ? count : null;
  } catch (error) {
    if (isMissingRpcError(error)) return null;
    throw error;
  }
}

async function fetchRpcPagesByCount<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  fnName: string,
  args: Record<string, unknown>,
  page: number,
  count: number,
): Promise<T[]> {
  if (count === 0) return [];

  const PARALLELISM = 10;
  const offsets = Array.from({ length: Math.ceil(count / page) }, (_, i) => i * page);
  const chunks: T[][] = new Array(offsets.length);

  for (let i = 0; i < offsets.length; i += PARALLELISM) {
    const batch = offsets.slice(i, i + PARALLELISM);
    await Promise.all(batch.map(async (offset, batchIndex) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client.rpc as any)(fnName, { ...args, p_limit: page, p_offset: offset });
      if (error) throw new Error(`RPC ${fnName} 오류: ${error.message}`);
      chunks[i + batchIndex] = (data ?? []) as T[];
    }));
    const loaded = Math.min(count, (i + batch.length) * page);
    console.log(`[xlsxLoader] ${fnName} 병렬 로딩 중... ${loaded}/${count}행`);
  }

  return chunks.flat();
}

/** Supabase RPC 두 함수를 병렬 로딩 */
export async function loadFromSupabase(): Promise<{ monthly: XlsxRecord[]; demo: XlsxRecord[] }> {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(
    getForesightSupabaseUrl(),
    getForesightSupabaseAnonKey(),
  );

  type MonthRow = {
    업종?: string; 목표?: string; 최적화목표?: string; 노출위치?: string; 소재형태?: string; 날짜?: string;
    industry?: string; objective?: string; optimization_goal?: string; placement?: string; creative_format?: string; metric_date?: string;
    avg_cpm?: number | string; avg_cpc?: number | string; avg_cpc_link?: number | string;
    avg_영상조회비용?: number | string; avg_video_view_cost?: number | string;
    sum_도달?: number | string; sum_reach?: number | string;
    sum_노출?: number | string; sum_impressions?: number | string;
    sum_지출금액?: number | string; sum_spend?: number | string;
    avg_빈도?: number | string; avg_frequency?: number | string;
    sum_영상조회수?: number | string; sum_video_views?: number | string;
  };
  type DemoRow  = {
    업종?: string; 목표?: string; 최적화목표?: string; 성별?: string; 연령?: string;
    industry?: string; objective?: string; optimization_goal?: string; gender?: string; age_range?: string;
    avg_cpm?: number | string; avg_cpc?: number | string;
    sum_도달?: number | string; sum_reach?: number | string;
    sum_노출?: number | string; sum_impressions?: number | string;
    sum_지출금액?: number | string; sum_spend?: number | string;
    sum_영상조회수?: number | string; sum_video_views?: number | string;
  };

  const supaUrl = getForesightSupabaseUrl() || '(없음)';
  console.log('[xlsxLoader] 집계 데이터 병렬 로딩 시작... URL:', supaUrl.slice(0, 30));
  const [monthRows, demoRows] = await Promise.all([
    fetchRpcAllPages<MonthRow>(client, ['get_monthly_aggregates_fast', 'get_monthly_aggregates']),
    fetchRpcAllPages<DemoRow>(client, ['get_demographic_aggregates_fast', 'get_demographic_aggregates']),
  ]);
  console.log(`[xlsxLoader] 로딩 완료 — monthly:${monthRows.length}행, demo:${demoRows.length}행`);

  const textValue = (...values: Array<string | null | undefined>): string =>
    values.find((value) => (value ?? '').trim() !== '')?.trim() ?? '';
  const numberValue = (...values: Array<number | string | null | undefined>): number => {
    const found = values.find((value) => value !== null && value !== undefined && `${value}`.trim() !== '');
    return Number(found) || 0;
  };

  const monthly: XlsxRecord[] = monthRows.map((r) => ({
    업종: normalizeIndustryName(textValue(r.업종, r.industry)),
    목표: textValue(r.목표, r.objective),
    최적화목표: textValue(r.최적화목표, r.optimization_goal),
    노출위치: textValue(r.노출위치, r.placement),
    소재형태: textValue(r.소재형태, r.creative_format),
    성별: '', 연령: '', 날짜: textValue(r.날짜, r.metric_date),
    CPM: numberValue(r.avg_cpm), CPC: numberValue(r.avg_cpc),
    CPC링크: numberValue(r.avg_cpc_link), 영상조회비용: numberValue(r.avg_영상조회비용, r.avg_video_view_cost),
    도달: numberValue(r.sum_도달, r.sum_reach), 노출: numberValue(r.sum_노출, r.sum_impressions),
    지출금액: numberValue(r.sum_지출금액, r.sum_spend), 빈도: numberValue(r.avg_빈도, r.avg_frequency),
    영상조회수: numberValue(r.sum_영상조회수, r.sum_video_views),
  }));

  const demo: XlsxRecord[] = demoRows.map((r) => ({
    업종: normalizeIndustryName(textValue(r.업종, r.industry)),
    목표: textValue(r.목표, r.objective),
    최적화목표: textValue(r.최적화목표, r.optimization_goal),
    노출위치: '', 소재형태: '',
    성별: textValue(r.성별, r.gender), 연령: textValue(r.연령, r.age_range), 날짜: '',
    CPM: numberValue(r.avg_cpm), CPC: numberValue(r.avg_cpc),
    CPC링크: 0, 영상조회비용: 0,
    도달: numberValue(r.sum_도달, r.sum_reach), 노출: numberValue(r.sum_노출, r.sum_impressions),
    지출금액: numberValue(r.sum_지출금액, r.sum_spend), 빈도: 0,
    영상조회수: numberValue(r.sum_영상조회수, r.sum_video_views),
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

export function getOptimizationGoals(objective?: string): string[] {
  const data = loadXlsxData();
  const filtered = objective ? data.filter((r) => r.목표 === objective) : data;
  return [...new Set(filtered.map((r) => r.최적화목표).filter(Boolean))].sort();
}

export function getPlacements(): string[] {
  const data = loadXlsxData();
  return [...new Set(data.map((r) => r.노출위치).filter(Boolean))].sort();
}

export function getCreativeFormats(): string[] {
  const data = loadXlsxData();
  return [...new Set(data.map((r) => r.소재형태).filter(Boolean))].sort();
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
