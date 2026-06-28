'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import StatePanel from '@/components/StatePanel';
import {
  CompetitorCreativeDemoAd,
  resolveCompetitorCreativeDemo,
  toSafeCompetitorLookupText,
} from '@/lib/competitorCreativeDemo';

const ALL_LABEL = '전체업종';
const PRODUCT_SAFE_ERROR = '실시간 소재 조회는 운영 승인 전 자동 실행하지 않습니다. 안전 데모 기준선을 표시합니다.';
const INDUSTRIES = [
  ALL_LABEL,
  '식음료', '뷰티', '패션', '생활/잡화', '주류', '전자',
  '의약/건강식', '금융', '보험', '서비스', '관광/레저', '방송통신',
  '부동산', '주택/가구', '수송', '공공기관', '교육', '엔터테인먼트',
  '게임', '기타',
];

type DemoMode = 'industry_demo' | 'keyword_demo' | 'broadened_demo';

interface DemoApiResponse {
  ads?: CompetitorCreativeDemoAd[];
  searchTerm?: string;
  searchLabel?: string;
  mode?: DemoMode;
  total?: number;
}

async function readJsonOrNull(res: Response): Promise<unknown | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDemoMode(value: unknown): value is DemoMode {
  return value === 'industry_demo' || value === 'keyword_demo' || value === 'broadened_demo';
}

function getLocalDemo(industry: string, keyword: string): Required<Pick<DemoApiResponse, 'ads' | 'searchTerm' | 'searchLabel' | 'mode' | 'total'>> {
  return resolveCompetitorCreativeDemo({ industry, keyword, limit: 9 });
}

function CreativeCard({ ad }: { ad: CompetitorCreativeDemoAd }) {
  return (
    <article className="flex min-h-[336px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-36 flex-col justify-between bg-[#f8f6f0] p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-md border border-teal-200 bg-white px-2 py-1 text-[11px] font-semibold text-teal-800">
            {ad.category}
          </span>
          <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-600">
            {ad.format}
          </span>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">Demo advertiser</p>
          <h3 className="mt-1 line-clamp-2 break-words text-base font-bold text-slate-950">{ad.advertiser}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="line-clamp-4 break-words text-sm leading-6 text-slate-700">{ad.message}</p>
        <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">소재 흐름 신호</p>
          <p className="mt-1 break-words text-xs leading-5 text-slate-700">{ad.flowSignal}</p>
        </div>

        <div className="mt-auto grid gap-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
              CTA: {ad.cta}
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
              {ad.observedWindow}
            </span>
          </div>
          <div className="flex flex-col gap-1 text-[11px] leading-5 text-slate-500">
            <span>{ad.sourceLabel}</span>
            <span>{ad.evidenceLevel} · 원문/계정/성과 데이터 미포함</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="h-36 bg-stone-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-100" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
        <div className="h-16 rounded bg-stone-100" />
      </div>
    </div>
  );
}

export default function CompetitorPage() {
  const initialDemo = useMemo(() => getLocalDemo(ALL_LABEL, ''), []);
  const [industry, setIndustry] = useState<string>(ALL_LABEL);
  const [keyword, setKeyword] = useState('');
  const [ads, setAds] = useState<CompetitorCreativeDemoAd[]>(initialDemo.ads);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [searchLabel, setSearchLabel] = useState(initialDemo.searchLabel);
  const [searchTerm, setSearchTerm] = useState(initialDemo.searchTerm);
  const [mode, setMode] = useState<DemoMode>(initialDemo.mode);

  const loadDemo = useCallback(async (ind: string, kw: string) => {
    const localFallback = getLocalDemo(ind, kw);
    setLoading(true);
    setNotice('');

    try {
      const params = new URLSearchParams({ limit: '9' });
      if (ind && ind !== ALL_LABEL) params.set('industry', ind);
      const safeKeyword = toSafeCompetitorLookupText(kw);
      if (safeKeyword) params.set('keyword', safeKeyword);

      const res = await fetch(`/api/competitor-demo?${params}`);
      const data = await readJsonOrNull(res);
      if (!res.ok || !isRecord(data)) {
        setAds(localFallback.ads);
        setSearchLabel(localFallback.searchLabel);
        setSearchTerm(localFallback.searchTerm);
        setMode(localFallback.mode);
        setNotice(PRODUCT_SAFE_ERROR);
        return;
      }

      const response = data as DemoApiResponse;
      setAds(Array.isArray(response.ads) ? response.ads : localFallback.ads);
      setSearchLabel(typeof response.searchLabel === 'string' ? response.searchLabel : localFallback.searchLabel);
      setSearchTerm(typeof response.searchTerm === 'string' ? response.searchTerm : localFallback.searchTerm);
      setMode(isDemoMode(response.mode) ? response.mode : localFallback.mode);
    } catch {
      setAds(localFallback.ads);
      setSearchLabel(localFallback.searchLabel);
      setSearchTerm(localFallback.searchTerm);
      setMode(localFallback.mode);
      setNotice(PRODUCT_SAFE_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDemo(ALL_LABEL, '');
  }, [loadDemo]);

  function handleIndustryClick(ind: string) {
    if (industry === ind && !keyword.trim()) return;
    setIndustry(ind);
    setKeyword('');
    loadDemo(ind, '');
  }

  function handleKeywordSearch() {
    const safeKeyword = toSafeCompetitorLookupText(keyword, '');
    if (!safeKeyword) {
      setNotice('검색어는 demo/anonymized 기준으로만 표시됩니다. 민감한 값처럼 보이는 입력은 사용하지 않습니다.');
      return;
    }
    setIndustry('');
    loadDemo('', safeKeyword);
  }

  const visibleScope = searchLabel === '직접 입력 검색어'
    ? `직접 입력 검색어: ${searchTerm}`
    : searchLabel;
  const captureLedger = [
    {
      label: '탐색 범위',
      value: visibleScope,
      detail: mode === 'broadened_demo' ? '일치 항목이 없어 안전 데모 범위로 확장' : '현재 검토 기준',
      tone: mode === 'broadened_demo' ? ('watch' as const) : ('ready' as const),
    },
    {
      label: '데이터 모드',
      value: 'Anonymized demo fallback',
      detail: '외부 API와 스크래핑 자동 호출 없음',
      tone: 'ready' as const,
    },
    {
      label: '확인 상태',
      value: `${ads.length}개 소재 흐름`,
      detail: '광고주명, 계정 ID, 성과, 예산 원문 미포함',
      tone: 'ready' as const,
    },
  ];

  const emptyActions = [
    '업종 버튼을 눌러 더 넓은 소재 흐름을 확인합니다.',
    '보고에서는 실제 집행 확정이 아니라 경쟁 소재 흐름 참고 기준이라고 설명합니다.',
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-[#f8f6f0] p-5 shadow-sm sm:p-6">
        <p className="inline-flex rounded-md border border-teal-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-800">
          소재 시장 관제
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-950 sm:text-3xl">경쟁사 소재 흐름 확인</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Meta 광고 라이브러리 기반 흐름을 보고하기 위한 안전 데모 화면입니다. 현재 카드는 익명화된 예시이며 실제 광고주,
          캠페인, 계정 ID, 성과, 예산을 포함하지 않습니다.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">브랜드 · 키워드 데모 검색</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleKeywordSearch()}
                placeholder="예: 뷰티, 여행, 게임"
                className="min-w-0 flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-200"
              />
              <button
                type="button"
                onClick={handleKeywordSearch}
                disabled={loading}
                className="rounded-md bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-40 sm:w-auto"
              >
                소재 흐름 보기
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              실제 브랜드명 입력 없이 업종/일반 키워드로 데모 흐름을 확인합니다.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">업종별 빠른 탐색</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((ind) => {
                const isActive = industry === ind && !keyword.trim();
                return (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => handleIndustryClick(ind)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                    }`}
                  >
                    {ind}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="rounded-md border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">운영 안전 장치</p>
          <h2 className="mt-2 text-sm font-bold text-slate-950">라이브 외부 조회 보류</h2>
          <p className="mt-2 text-xs leading-5 text-amber-900">
            Commander 승인 전 production 화면에서 Meta API, Google Ads Transparency, Playwright 스크래핑을 자동 실행하지 않습니다.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 opacity-75"
          >
            라이브 조회 준비 중
          </button>
        </aside>
      </section>

      <section className="overflow-hidden rounded-md border border-stone-200 bg-[#fbfaf7]">
        <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="border-b border-stone-200 bg-[#f6f4ee] px-4 py-4 sm:px-5 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">소재 캡처 준비도</p>
            <h2 className="mt-2 text-base font-bold text-slate-950">시장 증거 확인 장부</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              검색 조건이 어떤 소재 흐름 기준으로 이어지는지 먼저 고정합니다.
            </p>
          </div>
          <div className="grid divide-y divide-stone-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {captureLedger.map((item) => (
              <div key={item.label} className="min-w-0 px-4 py-3 sm:px-5 sm:py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-500">{item.label}</p>
                <p className="mt-1 break-words text-sm font-bold text-slate-950">{item.value}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {notice && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {notice}
        </div>
      )}

      {loading && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-100 border-t-teal-700" />
            <span className="text-xs font-semibold text-teal-700">안전 데모 소재 흐름 구성 중...</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        </div>
      )}

      {!loading && ads.length > 0 && (
        <section>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">Demo creative cards</p>
              <h2 className="mt-1 text-base font-semibold text-slate-800">
                {visibleScope} 소재 흐름
                <span className="ml-2 text-sm font-normal text-slate-400">{ads.length}개</span>
              </h2>
            </div>
            <span className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
              참고/검토 기준 · 성과 보장 아님
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad) => <CreativeCard key={ad.id} ad={ad} />)}
          </div>
        </section>
      )}

      {!loading && ads.length === 0 && (
        <StatePanel
          variant="empty"
          title="표시할 데모 소재 흐름이 없습니다"
          description="업종 또는 일반 키워드로 범위를 넓혀 안전 데모 기준선을 다시 확인해 보세요."
          eyebrow="소재 흐름 대기"
          checks={['업종 범위', '키워드', '데모 기준선']}
          ledger={captureLedger}
          nextActions={emptyActions}
          className="min-h-64"
        />
      )}
    </div>
  );
}
