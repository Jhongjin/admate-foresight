'use client';

import { useState, useEffect } from 'react';
import StatePanel from '@/components/StatePanel';

/* ─── 타입 ─── */
interface MetaAd {
  id: string;
  page_name: string;
  body: string;
  title: string;
  caption: string;
  cta: string;
  snapshot_url: string;
  start_date: string;
  image_url: string;
  profile_image: string;
}

/* ─── 상수 ─── */
const ALL_LABEL = '전체';
const PRODUCT_SAFE_ERROR = '현재 광고 소재 데이터를 불러올 수 없습니다.';
const SENSITIVE_LOOKUP_PATTERN =
  /(access[_-]?token|sessionid|cookie=|bearer\s+|secret|api[_-]?key|x-admate-internal-key|[A-Za-z0-9._~+/=-]{32,})/i;
const INDUSTRIES = [
  ALL_LABEL,
  '식음료', '뷰티', '패션', '생활/잡화', '주류', '전자',
  '의약/건강식', '병의원',
  '금융', '보험', '앱/사이트', '서비스', '관광/레저', '방송통신',
  '건설', '부동산', '주택/가구',
  '수송',
  '공공기관', '기관/단체', '교육',
  '엔터테인먼트',
  '게임',
  '기타',
];

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

function isDisplaySafeLookupText(value: string): boolean {
  return Boolean(value.trim()) && !SENSITIVE_LOOKUP_PATTERN.test(value);
}

function toDisplaySafeLookupText(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return isDisplaySafeLookupText(trimmed) ? trimmed : fallback;
}

/* ─── Meta 카드 ─── */
function MetaCard({ ad }: { ad: MetaAd }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {ad.image_url ? (
        <div className="h-44 w-full overflow-hidden bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-[#fbfaf6]">
          <svg className="h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 3h18" />
          </svg>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex min-w-0 items-center gap-2">
          {ad.profile_image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={ad.profile_image} alt="" className="h-6 w-6 shrink-0 rounded-md border border-slate-100 object-cover" />
            : <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-50 text-xs font-bold text-teal-700">{ad.page_name?.[0] || '?'}</div>
          }
          <p className="truncate text-sm font-semibold text-slate-900">{ad.page_name || '알 수 없는 페이지'}</p>
        </div>
        {ad.body && <p className="line-clamp-3 break-words text-xs leading-relaxed text-slate-600">{ad.body}</p>}
        {ad.title && <p className="line-clamp-2 break-words rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800">{ad.title}</p>}
        <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex flex-col gap-0.5">
            {ad.caption && <span className="break-words text-xs text-slate-400">{ad.caption}</span>}
            {ad.start_date && <span className="text-xs text-slate-400">집행 시작 {ad.start_date}</span>}
          </div>
          {ad.cta && <span className="max-w-full shrink-0 break-words rounded-md border border-teal-100 bg-teal-50 px-2 py-0.5 text-center text-xs font-semibold text-teal-800">{ad.cta}</span>}
        </div>
        <a href={ad.snapshot_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Meta에서 보기
        </a>
      </div>
    </div>
  );
}

/* ─── 로딩 스켈레톤 ─── */
function Skeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="h-44 bg-stone-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-2/3 rounded bg-slate-100" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
      </div>
    </div>
  );
}

/* ─── 메인 페이지 ─── */
export default function CompetitorPage() {
  const [industry, setIndustry] = useState<string>(ALL_LABEL);
  const [keyword, setKeyword]   = useState('');

  const [ads, setAds]           = useState<MetaAd[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [searchLabel, setSearchLabel] = useState('');
  const [searchTerm, setSearchTerm]   = useState('');

  async function fetchMeta(ind: string, kw: string) {
    setLoading(true);
    setError('');
    setAds([]);
    try {
      const params = new URLSearchParams({ limit: '30' });
      // 전체 선택 시 industry 파라미터 생략 → API 기본값(브랜드) 사용
      if (ind && ind !== ALL_LABEL) params.set('industry', ind);
      if (kw) params.set('keyword', kw);
      const res  = await fetch(`/api/meta-ads-scrape?${params}`);
      const data = await readJsonOrNull(res);
      if (!res.ok || !isRecord(data)) { setError(PRODUCT_SAFE_ERROR); return; }
      setAds(Array.isArray(data.ads) ? data.ads as MetaAd[] : []);
      setSearchTerm(typeof data.searchTerm === 'string'
        ? toDisplaySafeLookupText(data.searchTerm, '')
        : '');
    } catch {
      setError(PRODUCT_SAFE_ERROR);
    } finally {
      setLoading(false);
    }
  }

  // 페이지 진입 시 전체업종 자동 로드
  useEffect(() => {
    setSearchLabel(ALL_LABEL);
    fetchMeta(ALL_LABEL, '');
  }, []);

  function handleIndustryClick(ind: string) {
    if (industry === ind) return; // 같은 업종 클릭 시 무시
    setIndustry(ind);
    setKeyword('');
    setSearchLabel(ind);
    fetchMeta(ind, '');
  }

  function handleKeywordSearch() {
    const kw = keyword.trim();
    if (!kw) return;
    setIndustry('');
    setSearchLabel(toDisplaySafeLookupText(kw, '직접 입력 검색어'));
    fetchMeta('', kw);
  }

  const activeScope = searchLabel || (industry === ALL_LABEL ? '전체업종' : industry || '캡처 범위 대기');
  const isKeywordScope = Boolean(searchLabel && searchLabel !== ALL_LABEL && industry === '');
  const visibleScope = isKeywordScope ? '직접 입력 검색어' : activeScope === ALL_LABEL ? '전체업종' : activeScope;
  const captureMode = isKeywordScope ? '키워드 직접 캡처' : '업종 기준 캡처';
  const safeSearchTermForLink = searchTerm && isDisplaySafeLookupText(searchTerm) ? searchTerm : '';
  const captureLedger = [
    {
      label: '캡처 범위',
      value: visibleScope,
      detail: loading ? '소재 흐름 수집 중' : error ? '연결 상태 확인 필요' : '현재 검토 기준',
    },
    {
      label: '검토 모드',
      value: captureMode,
      detail: searchTerm ? 'Meta 검색어 기준' : '업종/브랜드 신호 기준',
    },
    {
      label: '확인 상태',
      value: loading ? '수집 중' : ads.length > 0 ? `${ads.length}개 소재 확보` : error ? '보류' : '관찰 행 대기',
      detail: ads.length > 0 ? '카피, CTA, 시작일 비교 가능' : '검색 범위를 조정해 증거를 확보',
    },
  ];
  const competitorStateChecks = ['업종 범위', '키워드', '소재 증거'];
  const emptyActions = [
    '브랜드명을 더 짧게 입력하거나 대표 제품명으로 다시 검색합니다.',
    '업종 기준 탐색으로 범위를 넓힌 뒤 반복되는 카피와 CTA를 확인합니다.',
  ];
  const errorActions = [
    '잠시 후 같은 조건으로 다시 시도합니다.',
    '문제가 반복되면 운영 담당자에게 Meta 소재 수집 연결 상태 확인을 요청합니다.',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-md border border-slate-200 bg-[#f8f6f0] p-5 shadow-sm sm:p-6">
        <p className="inline-flex rounded-md border border-teal-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-800">
          소재 시장 관제
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-950 sm:text-3xl">경쟁 소재 관제 보드</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Meta 광고 라이브러리의 실제 집행 소재를 업종과 키워드 기준으로 확인해 벤치마크 수치 뒤의 메시지 흐름을 읽습니다.
        </p>
      </section>

      {/* 검색 패널 */}
      <div className="space-y-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

        {/* 키워드 검색 */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">브랜드 · 키워드 직접 검색</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleKeywordSearch()}
              placeholder="예: 올리브영, 설화수, 다이슨..."
              className="min-w-0 flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-200"
            />
            <button
              type="button"
              onClick={handleKeywordSearch}
              disabled={!keyword.trim() || loading}
              className="rounded-md bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-40 sm:w-auto"
            >
              소재 검색
            </button>
          </div>
        </div>

        {/* 업종 빠른 선택 */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">업종별 빠른 탐색</label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => {
              const isAll = ind === ALL_LABEL;
              const isActive = industry === ind && !keyword.trim();
              return (
                <button
                  key={ind}
                  type="button"
                  onClick={() => handleIndustryClick(ind)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? isAll
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-teal-700 bg-teal-700 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                  }`}
                >
                  {isAll ? '전체업종' : ind}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-md border border-stone-200 bg-[#fbfaf7]">
        <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="border-b border-stone-200 bg-[#f6f4ee] px-4 py-4 sm:px-5 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">소재 캡처 준비도</p>
            <h2 className="mt-2 text-base font-bold text-slate-950">시장 증거 확인 장부</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              검색 조건이 어떤 소재 증거로 이어지는지 먼저 고정합니다.
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

      {/* 로딩 */}
      {loading && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-100 border-t-teal-700" />
            <span className="text-xs font-semibold text-teal-700">
              소재 보드 수집 중
              {searchLabel && searchLabel !== ALL_LABEL ? ` — ${searchLabel}` : ' (전체업종)'}
              ...
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        </div>
      )}

      {/* 결과 */}
      {!loading && ads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {searchLabel === ALL_LABEL
                  ? <span className="text-slate-700">전체업종</span>
                  : <span className="text-teal-700">{isKeywordScope ? '직접 검색' : searchLabel}</span>
                }
                {' '}광고 소재
                <span className="ml-2 text-sm font-normal text-slate-400">{ads.length}개</span>
              </h2>
            </div>
            {safeSearchTermForLink && (
              <a
                href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(safeSearchTermForLink)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50"
              >
                Meta 라이브러리에서 전체 보기 →
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map(ad => <MetaCard key={ad.id} ad={ad} />)}
          </div>
        </div>
      )}

      {/* 결과 없음 */}
      {!loading && !error && ads.length === 0 && searchLabel && (
        <StatePanel
          variant="empty"
          title={isKeywordScope ? '직접 입력 검색어 소재 기준선이 비어 있습니다' : `"${toDisplaySafeLookupText(searchLabel, '선택한 범위')}" 소재 기준선이 비어 있습니다`}
          description="다른 키워드로 검색하거나 업종을 변경해 현재 시장에서 관찰 가능한 소재 흐름을 다시 확인해 보세요."
          eyebrow="소재 캡처 대기"
          checks={competitorStateChecks}
          ledger={captureLedger.map((item) => ({
            ...item,
            tone: item.label === '확인 상태' ? ('watch' as const) : ('neutral' as const),
          }))}
          nextActions={emptyActions}
          className="min-h-64"
        />
      )}

      {/* 에러 */}
      {!loading && error && (
        <StatePanel
          variant="error"
          title="소재 수집 연결 상태를 확인하고 있습니다"
          description={PRODUCT_SAFE_ERROR}
          eyebrow="소재 수집 보류"
          checks={['연결 확인', '화면 확인', '재시도']}
          ledger={captureLedger.map((item) => ({
            ...item,
            tone: item.label === '확인 상태' ? ('risk' as const) : ('watch' as const),
          }))}
          nextActions={errorActions}
          className="min-h-64"
        />
      )}
    </div>
  );
}
