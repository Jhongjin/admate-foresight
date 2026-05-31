import { NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { getIndustries, getAgeRanges } from '@/lib/csvLoader';
import { getObjectives, getXlsxIndustries, getAvailableMonths, ensureDataLoaded } from '@/lib/xlsxLoader';
import { normalizeFiltersRouteOutput } from '@/lib/foresightFiltersRouteOutputContract';

// 업종 그룹 순서 정의 (비슷한 업종끼리 묶음, 기타는 맨 마지막)
const INDUSTRY_ORDER: string[] = [
  // 소비재
  '식음료', '뷰티', '패션', '생활/잡화', '주류', '전자',
  // 건강/의료
  '의약/건기식', '병의원',
  // 금융/서비스/디지털
  '금융', '보험', '앱/사이트', '서비스', '방송통신',
  // 건설/부동산/주거
  '건설', '부동산', '주택/가구',
  // 교통
  '수송',
  // 공공/교육
  '공공기관', '기관/단체', '교육',
  // 문화/엔터
  '엔터테인먼트',
  // 게임
  '게임',
  // 기타 (맨 마지막)
  '기타',
];

function jsonNoStore(body: unknown, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

function sortIndustries(industries: string[]): string[] {
  const remaining = new Set(industries);
  const result: string[] = [];

  // 1) INDUSTRY_ORDER에 정의된 것 순서대로 (기타 제외)
  for (const ind of INDUSTRY_ORDER) {
    if (ind === '기타') continue;
    if (remaining.has(ind)) {
      result.push(ind);
      remaining.delete(ind);
    }
  }

  // 2) 정의에 없는 나머지는 가나다순 (기타 제외)
  const extra = [...remaining].filter(i => i !== '기타').sort();
  result.push(...extra);

  // 3) 기타는 항상 맨 마지막
  if (remaining.has('기타') || industries.includes('기타')) {
    result.push('기타');
  }

  return result;
}

function stringArrayOrEmpty(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export async function GET() {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  try {
    await ensureDataLoaded();
    const csvIndustries = stringArrayOrEmpty(getIndustries());
    const xlsxIndustries = stringArrayOrEmpty(getXlsxIndustries());
    const allIndustries = sortIndustries([...new Set([...csvIndustries, ...xlsxIndustries])]);
    const ageRanges = stringArrayOrEmpty(getAgeRanges());
    const genders = ['male', 'female'];
    const objectives = stringArrayOrEmpty(getObjectives());
    const months = stringArrayOrEmpty(getAvailableMonths());

    // 진단 로그는 집계 카운터/불리언만 남긴다.
    const hasXlsxIndustries = xlsxIndustries.length > 0;
    console.log(`[filters] loaded: csvIndustryCount=${csvIndustries.length}, xlsxIndustryCount=${xlsxIndustries.length}, totalIndustryCount=${allIndustries.length}, ageRangeCount=${ageRanges.length}, objectiveCount=${objectives.length}, monthCount=${months.length}, hasXlsxIndustries=${hasXlsxIndustries}`);
    if (xlsxIndustries.length > 0) {
      console.log('[filters] xlsx industry source available');
    } else {
      console.warn('[filters] ⚠️  Supabase 업종 데이터 없음 — xlsxIndustries 비어있음');
    }

    const normalizedFilters = normalizeFiltersRouteOutput({
      industries: allIndustries,
      ageRanges,
      genders,
      objectives,
      months,
    });

    return jsonNoStore(normalizedFilters);
  } catch {
    console.error('[filters] failed');
    return jsonNoStore({ error: 'Failed to load filters' }, { status: 500 });
  }
}
