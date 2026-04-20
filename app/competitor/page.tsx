'use client';

import { useState, useEffect } from 'react';

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
const INDUSTRIES = [
  '식음료', '의약/건기식', '패션', '뷰티', '생활/잡화', '기관/단체',
  '교육', '금융', '여행', '게임', '부동산', '자동차', '엔터', '가전제품', '유통', '화장품', '서비스',
];

/* ─── Meta 카드 ─── */
function MetaCard({ ad }: { ad: MetaAd }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {ad.image_url ? (
        <div className="w-full h-44 bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 3h18" />
          </svg>
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          {ad.profile_image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={ad.profile_image} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100" />
            : <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 text-xs font-bold">{ad.page_name?.[0] || '?'}</div>
          }
          <p className="text-sm font-semibold text-gray-800 truncate">{ad.page_name || '알 수 없는 페이지'}</p>
        </div>
        {ad.body && <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{ad.body}</p>}
        {ad.title && <p className="text-xs font-semibold text-gray-800 line-clamp-2 bg-gray-50 rounded-lg px-2.5 py-1.5">{ad.title}</p>}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <div className="flex flex-col gap-0.5">
            {ad.caption && <span className="text-xs text-gray-400">{ad.caption}</span>}
            {ad.start_date && <span className="text-xs text-gray-400">📅 {ad.start_date}</span>}
          </div>
          {ad.cta && <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded-lg shrink-0">{ad.cta}</span>}
        </div>
        <a href={ad.snapshot_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-xs font-medium rounded-xl transition-colors border border-gray-100 hover:border-blue-200">
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
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
      </div>
    </div>
  );
}

/* ─── 메인 페이지 ─── */
export default function CompetitorPage() {
  const [industry, setIndustry] = useState('');
  const [keyword, setKeyword]   = useState('');

  const [ads, setAds]           = useState<MetaAd[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [searchLabel, setSearchLabel] = useState('');
  const [searchTerm, setSearchTerm]   = useState('');

  // 페이지 진입 시 기본 업종(식음료) 자동 로드
  useEffect(() => {
    setIndustry('식음료');
    setSearchLabel('식음료');
    fetchMeta('식음료', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMeta(ind: string, kw: string) {
    setLoading(true);
    setError('');
    setAds([]);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (ind) params.set('industry', ind);
      if (kw)  params.set('keyword', kw);
      const res  = await fetch(`/api/meta-ads-scrape?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || '오류가 발생했습니다.'); return; }
      setAds(data.ads ?? []);
      setSearchTerm(data.searchTerm ?? '');
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function search(ind: string, kw: string) {
    if (!ind && !kw.trim()) return;
    setSearchLabel(ind || kw.trim());
    fetchMeta(ind, kw);
  }

  function handleIndustryClick(ind: string) {
    const next = industry === ind ? '' : ind;
    setIndustry(next);
    setKeyword('');
    if (next) search(next, '');
    else { setAds([]); setSearchLabel(''); }
  }

  function handleKeywordSearch() {
    setIndustry('');
    search('', keyword.trim());
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">경쟁사 모니터링</h1>
        <p className="text-sm text-gray-500 mt-1">Meta 광고 라이브러리에서 실제 집행 소재를 탐색합니다.</p>
      </div>

      {/* 검색 패널 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

        {/* 키워드 검색 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">브랜드 · 키워드 직접 검색</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleKeywordSearch()}
              placeholder="예: 올리브영, 설화수, 다이슨..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
            />
            <button
              type="button"
              onClick={handleKeywordSearch}
              disabled={!keyword.trim() || loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40"
            >
              검색
            </button>
          </div>
        </div>

        {/* 업종 빠른 선택 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">업종별 빠른 탐색</label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <button key={ind} type="button" onClick={() => handleIndustryClick(ind)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  industry === ind
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}>
                {ind}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 초기 안내 */}
      {!loading && ads.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6H14c-.55 0-1 .45-1 1v1.5h2.5l-.5 2.5H13V19h-2.5v-6H9v-2.5h1.5V9c0-1.93 1.57-3.5 3.5-3.5h1.5V8z"/>
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">업종을 선택하거나 키워드를 검색하세요</p>
          <p className="text-gray-400 text-xs">Meta 광고 라이브러리에서 실제 집행 중인 소재를 불러옵니다</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-xs text-blue-500">Meta 광고 소재 수집 중...</span>
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
              <h2 className="text-base font-semibold text-gray-800">
                <span className="text-indigo-600">{searchLabel}</span> 광고 소재
                <span className="ml-2 text-sm font-normal text-gray-400">{ads.length}개</span>
              </h2>
            </div>
            {searchTerm && (
              <a
                href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(searchTerm)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
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

      {/* 에러 */}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-500">{error}</div>
      )}
    </div>
  );
}
