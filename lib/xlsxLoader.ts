import path from 'path';
import * as XLSX from 'xlsx';

export interface XlsxRecord {
  업종: string;
  캠페인이름: string;
  목표: string;
  최적화목표: string;
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
  '문화예술':            '엔터테인먼트',
  '문화/예술':           '엔터테인먼트',
  '언론':                '방송통신',
  '에너지':              '기타',
  '기타(에너지)':        '기타',
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

let cachedXlsxData: XlsxRecord[] | null = null;
let initPromise: Promise<void> | null = null;

/** 서버 시작 시 Supabase에서 로드한 데이터를 메모리에 주입 */
export function setXlsxData(data: XlsxRecord[]): void {
  cachedXlsxData = data;
}

/** 첫 요청 시 자동으로 Supabase 로딩 (lazy init) */
export async function ensureDataLoaded(): Promise<void> {
  if (cachedXlsxData !== null) return;
  if (!initPromise) {
    initPromise = loadFromSupabase().then((data) => {
      cachedXlsxData = data;
      // 회귀 모델도 즉시 피팅
      import('./regression').then(({ fitRegressionModels }) => fitRegressionModels());
    }).catch((e) => {
      console.error('[xlsxLoader] Supabase 로딩 실패:', e);
      initPromise = null; // 실패 시 재시도 허용
    });
  }
  await initPromise;
}

// Supabase row → XlsxRecord 변환
function fromSupabaseRow(row: Record<string, unknown>): XlsxRecord {
  return {
    업종:       (row['업종']      as string) ?? '',
    캠페인이름: (row['캠페인이름'] as string) ?? '',
    목표:       (row['목표']      as string) ?? '',
    최적화목표: (row['최적화목표'] as string) ?? '',
    성별:       (row['성별']      as string) ?? '',
    연령:       (row['연령']      as string) ?? '',
    도달:       (row['도달']      as number) ?? 0,
    노출:       (row['노출']      as number) ?? 0,
    지출금액:   (row['지출금액']  as number) ?? 0,
    빈도:       (row['빈도']      as number) ?? 0,
    CPM:        (row['cpm']       as number) ?? 0,
    CPC:        (row['cpc']       as number) ?? 0,
    CPC링크:    (row['cpc_link']  as number) ?? 0,
    영상조회수: (row['영상조회수'] as number) ?? 0,
    영상조회비용:(row['영상조회비용'] as number) ?? 0,
    날짜:       (row['날짜']      as string) ?? '',
  };
}

/** Supabase에서 전체 데이터를 페이지 단위로 가져옴 */
export async function loadFromSupabase(): Promise<XlsxRecord[]> {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Supabase 기본 최대 행 수는 1000. 총 행 수를 먼저 파악 후 병렬 로딩
  const PAGE = 1_000;

  // 1) 총 행 수 조회
  const { count, error: cntErr } = await client
    .from('ad_data')
    .select('*', { count: 'exact', head: true });
  if (cntErr) throw new Error(`Supabase count 오류: ${cntErr.message}`);
  const total = count ?? 0;
  console.log(`[xlsxLoader] Supabase 총 행 수: ${total}`);

  // 2) 페이지 목록 생성 후 병렬 로딩 (10개씩 묶음)
  const pages: number[] = [];
  for (let from = 0; from < total; from += PAGE) pages.push(from);

  const BATCH = 10;
  const all: XlsxRecord[] = new Array(total);
  let loadedCount = 0;

  for (let i = 0; i < pages.length; i += BATCH) {
    const batch = pages.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((from) =>
        client.from('ad_data').select('*').range(from, from + PAGE - 1)
      )
    );
    for (let j = 0; j < results.length; j++) {
      const { data, error } = results[j];
      if (error) throw new Error(`Supabase 오류: ${error.message}`);
      if (data) {
        const from = batch[j];
        for (let k = 0; k < data.length; k++) all[from + k] = fromSupabaseRow(data[k] as Record<string, unknown>);
        loadedCount += data.length;
      }
    }
    console.log(`[xlsxLoader] 로딩 중... ${loadedCount}/${total}`);
  }

  const filtered = all.slice(0, loadedCount).filter(r => r && r.도달 > 0 && r.노출 > 0 && r.CPM > 0);
  console.log(`[xlsxLoader] Supabase 로딩 완료 (${loadedCount}행, 필터 후 ${filtered.length}행)`);
  return filtered;
}

/** 메모리 캐시에서 데이터 반환 (instrumentation.ts에서 Supabase 로드 후 setXlsxData로 주입) */
export function loadXlsxData(): XlsxRecord[] {
  return cachedXlsxData ?? [];
}

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
