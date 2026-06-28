'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import StatePanel from '@/components/StatePanel';
import {
  CompetitorCreativeDemoAd,
  resolveCompetitorCreativeDemo,
  toSafeCompetitorLookupText,
} from '@/lib/competitorCreativeDemo';

const ALL_LABEL = '전체업종';
const PRODUCT_SAFE_ERROR = '실시간 소재 조회는 운영 승인 전 자동 실행하지 않습니다. 익명화된 소재 기준선을 표시합니다.';
const INDUSTRIES = [
  ALL_LABEL,
  '식음료', '뷰티', '패션', '생활/잡화', '주류', '전자',
  '의약/건강식', '금융', '보험', '서비스', '관광/레저', '방송통신',
  '부동산', '주택/가구', '수송', '공공기관', '교육', '엔터테인먼트',
  '게임', '기타',
];

type DemoMode = 'industry_demo' | 'keyword_demo' | 'broadened_demo';
type AssetStatus = 'checking' | 'connected' | 'fallback';

interface DemoApiResponse {
  ads?: CompetitorCreativeDemoAd[];
  searchTerm?: string;
  searchLabel?: string;
  mode?: DemoMode;
  total?: number;
}

interface GoogleCreativeResponse {
  ads?: Array<{
    imageUrl?: unknown;
    previewUrl?: unknown;
    format?: unknown;
  }>;
}

interface PublicCreativeAsset {
  id: string;
  imageUrl: string;
  source: string;
  format: string;
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

function isSafeCreativeImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && [
      'adstransparency.google.com',
      'tpc.googlesyndication.com',
      'lh3.googleusercontent.com',
      'www.gstatic.com',
      'facebook.com',
      'www.facebook.com',
    ].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function toPublicCreativeCards(creativeAssets: PublicCreativeAsset[], scope: string): CompetitorCreativeDemoAd[] {
  return creativeAssets.map((asset, index) => ({
    id: `public-creative-${index + 1}`,
    advertiser: '공개 소재 이미지',
    category: scope,
    message: `검색 기준 "${scope}"에서 확인된 공개 소재 이미지입니다.`,
    cta: '이미지 확인',
    format: asset.format,
    sourceLabel: asset.source,
    observedWindow: '공개 소재 경로',
    flowSignal: '이미지 전체 비율을 우선 확인합니다.',
    evidenceLevel: 'Public creative image',
    assetUrl: asset.imageUrl,
    assetSource: asset.source,
    visual: {
      headline: '',
      subcopy: '',
      background: '#f8fafc',
      surface: '#ffffff',
      accent: '#334155',
      ink: '#0f172a',
      motif: 'grid',
    },
  }));
}

async function fetchPublicCreativeAssets(ind: string, kw: string): Promise<PublicCreativeAsset[]> {
  const params = new URLSearchParams({ limit: '9' });
  if (ind && ind !== ALL_LABEL) params.set('industry', ind);
  const safeKeyword = toSafeCompetitorLookupText(kw);
  if (safeKeyword) params.set('keyword', safeKeyword);

  const res = await fetch(`/api/google-ads?${params}`);
  const data = await readJsonOrNull(res);
  if (!res.ok || !isRecord(data)) return [];

  const response = data as GoogleCreativeResponse;
  const ads = Array.isArray(response.ads) ? response.ads : [];
  return ads
    .map((ad, index) => ({
      id: `google-creative-${index + 1}`,
      imageUrl: ad.imageUrl,
      source: 'Google Ads Transparency',
      format: typeof ad.format === 'number' ? `Format ${ad.format}` : 'Image creative',
    }))
    .filter((asset): asset is PublicCreativeAsset => isSafeCreativeImageUrl(asset.imageUrl))
    .map((asset) => ({
      ...asset,
      imageUrl: asset.imageUrl,
    }));
}

function CreativePreview({ ad }: { ad: CompetitorCreativeDemoAd }) {
  const visual = ad.visual;
  const motifColor = visual.accent;
  const mutedInk = `${visual.ink}cc`;

  return (
    <div
      className={`relative overflow-hidden border-b border-slate-200 ${
        ad.assetUrl ? 'aspect-square bg-slate-50 p-3' : 'aspect-[4/3] min-h-56 p-4'
      }`}
      style={{ backgroundColor: ad.assetUrl ? '#f8fafc' : visual.background, color: visual.ink }}
    >
      {ad.assetUrl ? (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.assetUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: motifColor }} />
      <div className="relative z-10 flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <span
            className="rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{
              borderColor: ad.assetUrl ? '#cbd5e1' : motifColor,
              backgroundColor: ad.assetUrl ? '#ffffff' : visual.surface,
              color: ad.assetUrl ? '#334155' : motifColor,
            }}
          >
            {ad.assetUrl ? '공개 소재 이미지' : '익명 소재 프리뷰'}
          </span>
          <span
            className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white"
            style={{ backgroundColor: motifColor }}
          >
            {ad.format}
          </span>
        </div>

        {!ad.assetUrl && (
          <div className="grid min-h-28 grid-cols-[minmax(0,1fr)_88px] items-end gap-4">
            <div className="min-w-0 rounded-md p-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: mutedInk }}>
                {ad.category} creative flow
              </p>
              <p className="mt-2 line-clamp-2 break-words text-2xl font-black leading-tight" style={{ color: visual.ink }}>
                {visual.headline}
              </p>
              <p className="mt-2 line-clamp-2 break-words text-sm font-semibold" style={{ color: mutedInk }}>
                {visual.subcopy}
              </p>
            </div>
            <div
              className="relative h-28 overflow-hidden rounded-md border shadow-sm"
              style={{ borderColor: `${motifColor}55`, backgroundColor: visual.surface }}
              aria-hidden="true"
            >
              {visual.motif === 'routine' && (
                <div className="grid h-full grid-cols-3 gap-1.5 p-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex flex-col justify-end rounded-sm bg-white/70 p-1">
                      <span className="mb-1 h-7 rounded-sm" style={{ backgroundColor: `${motifColor}${step === 2 ? 'cc' : '88'}` }} />
                      <span className="text-center text-[10px] font-black" style={{ color: motifColor }}>{step}</span>
                    </div>
                  ))}
                </div>
              )}
              {visual.motif === 'product' && (
                <div className="flex h-full items-center justify-center p-3">
                  <div className="h-20 w-14 rounded-t-full rounded-b-md border-4 bg-white" style={{ borderColor: motifColor }} />
                  <div className="-ml-3 h-14 w-10 rounded-md" style={{ backgroundColor: `${motifColor}aa` }} />
                </div>
              )}
              {visual.motif === 'trust' && (
                <div className="grid h-full gap-2 p-3">
                  <div className="h-5 rounded-sm" style={{ backgroundColor: `${motifColor}cc` }} />
                  <div className="h-3 w-10/12 rounded-sm bg-slate-200" />
                  <div className="h-3 w-8/12 rounded-sm bg-slate-200" />
                  <div className="mt-auto h-7 rounded-sm border-2" style={{ borderColor: motifColor }} />
                </div>
              )}
              {visual.motif === 'travel' && (
                <div className="h-full p-3">
                  <div className="h-full rounded-md" style={{ backgroundColor: `${motifColor}33` }}>
                    <div className="h-12 rounded-t-md" style={{ backgroundColor: `${motifColor}aa` }} />
                    <div className="mx-auto mt-4 h-8 w-16 rounded-t-full bg-white/80" />
                  </div>
                </div>
              )}
              {visual.motif === 'grid' && (
                <div className="grid h-full grid-cols-2 gap-2 p-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="rounded-sm bg-white/85">
                      <div className="h-8 rounded-t-sm" style={{ backgroundColor: item % 2 ? `${motifColor}88` : `${motifColor}cc` }} />
                      <div className="m-1 h-2 rounded-sm bg-slate-200" />
                    </div>
                  ))}
                </div>
              )}
              {visual.motif === 'lead' && (
                <div className="flex h-full flex-col gap-2 p-3">
                  <div className="h-4 rounded-sm" style={{ backgroundColor: `${motifColor}bb` }} />
                  <div className="h-4 rounded-sm bg-white" />
                  <div className="h-4 rounded-sm bg-white" />
                  <div className="mt-auto h-7 rounded-sm" style={{ backgroundColor: motifColor }} />
                </div>
              )}
              {visual.motif === 'device' && (
                <div className="flex h-full items-center justify-center p-3">
                  <div className="h-24 w-14 rounded-lg border-4 bg-white" style={{ borderColor: motifColor }}>
                    <div className="mx-auto mt-2 h-10 w-8 rounded-sm" style={{ backgroundColor: `${motifColor}88` }} />
                    <div className="mx-auto mt-3 h-2 w-7 rounded-sm bg-slate-200" />
                  </div>
                </div>
              )}
              {visual.motif === 'play' && (
                <div className="flex h-full items-center justify-center p-3">
                  <div className="relative h-20 w-20 rounded-md" style={{ backgroundColor: `${motifColor}33` }}>
                    <div className="absolute left-6 top-5 h-0 w-0 border-y-[20px] border-l-[30px] border-y-transparent" style={{ borderLeftColor: motifColor }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span
            className="max-w-[62%] truncate rounded-md px-2 py-1 text-xs font-bold"
            style={{
              color: ad.assetUrl ? '#334155' : mutedInk,
              backgroundColor: ad.assetUrl ? '#ffffff' : 'transparent',
            }}
          >
            {ad.assetUrl ? ad.assetSource : '익명 소재 기준'}
          </span>
          <span
            className="rounded-md px-3 py-1.5 text-xs font-black text-white"
            style={{ backgroundColor: motifColor }}
          >
            {ad.cta}
          </span>
        </div>
      </div>
    </div>
  );
}

function CreativeCard({ ad }: { ad: CompetitorCreativeDemoAd }) {
  const isPublicImageCard = Boolean(ad.assetUrl);

  return (
    <article className="flex min-h-[520px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CreativePreview ad={ad} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        {isPublicImageCard ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">공개 소재 이미지</p>
            <h3 className="mt-1 line-clamp-2 break-words text-base font-bold text-slate-950">{ad.category}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">기존 공개 소재 경로에서 확인된 이미지를 전체 비율로 표시합니다.</p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">익명 브랜드</p>
              <h3 className="mt-1 line-clamp-2 break-words text-base font-bold text-slate-950">{ad.advertiser}</h3>
            </div>
            <p className="line-clamp-4 break-words text-sm leading-6 text-slate-700">{ad.message}</p>
          </>
        )}
        <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">소재 흐름 신호</p>
          <p className="mt-1 break-words text-xs leading-5 text-slate-700">{ad.flowSignal}</p>
        </div>

        <div className="mt-auto grid gap-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
              {ad.cta}
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
              {ad.observedWindow}
            </span>
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
  const [assetStatus, setAssetStatus] = useState<AssetStatus>('checking');

  const loadDemo = useCallback(async (ind: string, kw: string) => {
    const localFallback = getLocalDemo(ind, kw);
    setLoading(true);
    setNotice('');
    setAssetStatus('checking');

    try {
      const params = new URLSearchParams({ limit: '9' });
      if (ind && ind !== ALL_LABEL) params.set('industry', ind);
      const safeKeyword = toSafeCompetitorLookupText(kw);
      if (safeKeyword) params.set('keyword', safeKeyword);

      const res = await fetch(`/api/competitor-demo?${params}`);
      const data = await readJsonOrNull(res);
      const applyBaseAds = async (baseAds: CompetitorCreativeDemoAd[]) => {
        setAds(baseAds);
        const assets = await fetchPublicCreativeAssets(ind, kw);
        if (assets.length > 0) {
          const scope = toSafeCompetitorLookupText(kw) || (ind && ind !== ALL_LABEL ? ind : ALL_LABEL);
          setAds(toPublicCreativeCards(assets, scope));
          setAssetStatus('connected');
        } else {
          setAssetStatus('fallback');
        }
      };

      if (!res.ok || !isRecord(data)) {
        await applyBaseAds(localFallback.ads);
        setSearchLabel(localFallback.searchLabel);
        setSearchTerm(localFallback.searchTerm);
        setMode(localFallback.mode);
        setNotice(PRODUCT_SAFE_ERROR);
        return;
      }

      const response = data as DemoApiResponse;
      await applyBaseAds(Array.isArray(response.ads) ? response.ads : localFallback.ads);
      setSearchLabel(typeof response.searchLabel === 'string' ? response.searchLabel : localFallback.searchLabel);
      setSearchTerm(typeof response.searchTerm === 'string' ? response.searchTerm : localFallback.searchTerm);
      setMode(isDemoMode(response.mode) ? response.mode : localFallback.mode);
    } catch {
      setAds(localFallback.ads);
      setAssetStatus('fallback');
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
      setNotice('검색어는 익명화 기준으로만 표시됩니다. 민감한 값처럼 보이는 입력은 사용하지 않습니다.');
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
      detail: mode === 'broadened_demo' ? '일치 항목이 적어 익명 기준선으로 확장' : '현재 검토 기준',
      tone: mode === 'broadened_demo' ? ('watch' as const) : ('ready' as const),
    },
    {
      label: '데이터 모드',
      value: '익명 소재 프리뷰',
      detail: '외부 API와 스크래핑 자동 호출 없음',
      tone: 'ready' as const,
    },
    {
      label: '확인 상태',
      value: `${ads.length}개 소재 흐름`,
      detail: '광고주명, 계정 ID, 성과, 예산 원문 미포함',
      tone: 'ready' as const,
    },
    {
      label: '이미지 상태',
      value: assetStatus === 'checking'
        ? '연결 확인 중'
        : assetStatus === 'connected'
          ? '공개 이미지 연결'
          : '익명 프리뷰 표시',
      detail: assetStatus === 'connected'
        ? '기존 공개 소재 경로 이미지 사용'
        : '이미지가 없거나 연결 실패 시 시각 프리뷰 유지',
      tone: assetStatus === 'connected' ? ('ready' as const) : ('watch' as const),
    },
  ];

  const emptyActions = [
    '업종 버튼을 눌러 더 넓은 소재 흐름을 확인합니다.',
    '실제 집행 확정이 아니라 경쟁 소재 흐름 참고 기준으로 확인합니다.',
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-[#f8f6f0] p-5 shadow-sm sm:p-6">
        <p className="inline-flex rounded-md border border-teal-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-800">
          소재 시장 관제
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-950 sm:text-3xl">경쟁사 소재 흐름 확인</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Meta 광고 라이브러리에서 확인할 수 있는 소재 흐름을 기획 검토용으로 정리합니다. 현재 카드는 익명화된 예시이며 실제 광고주,
          캠페인, 계정 ID, 성과, 예산을 포함하지 않습니다.
        </p>
        <div className="mt-3 inline-flex rounded-md border border-teal-200 bg-white/80 px-2.5 py-1 text-xs font-semibold text-teal-800">
          익명화된 예시 · 원문/계정/성과 미포함
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            성과 예측으로 돌아가기
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">브랜드 · 키워드 검색</label>
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
              일반 업종/카테고리 키워드로 익명화된 소재 흐름을 확인합니다.
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

        <aside className="rounded-md border border-teal-200 bg-teal-50 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-800">소재 이미지 연결</p>
          <h2 className="mt-2 text-sm font-bold text-slate-950">
            {assetStatus === 'connected' ? '공개 이미지 우선 표시' : '익명 프리뷰 우선 표시'}
          </h2>
          <p className="mt-2 text-xs leading-5 text-teal-900">
            기존 공개 소재 경로에서 이미지가 확인되면 카드 상단에 먼저 표시하고, 없으면 익명화된 시각 프리뷰를 유지합니다.
          </p>
          <div className="mt-4 rounded-md border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-900">
            {assetStatus === 'checking'
              ? '이미지 연결 확인 중'
              : assetStatus === 'connected'
                ? '이미지 연결됨'
                : '시각 프리뷰 표시 중'}
          </div>
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
          <div className="grid divide-y divide-stone-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
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
            <span className="text-xs font-semibold text-teal-700">익명화 소재 흐름 구성 중...</span>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">Creative previews</p>
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
          title="표시할 소재 흐름이 없습니다"
          description="업종 또는 일반 키워드로 범위를 넓혀 익명 기준선을 다시 확인해 보세요."
          eyebrow="소재 흐름 대기"
          checks={['업종 범위', '키워드', '익명 기준선']}
          ledger={captureLedger}
          nextActions={emptyActions}
          className="min-h-64"
        />
      )}
    </div>
  );
}
