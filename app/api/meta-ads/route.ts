import { NextRequest } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { checkRateLimit } from '@/lib/rateLimit';
import { noStoreJson } from '@/lib/security';

const META_API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const NOT_CONFIGURED_ERROR = 'External ads lookup is not configured.';
const LOOKUP_FAILED_ERROR = 'External ads lookup failed.';

// 업종 → Meta 광고 라이브러리 검색 키워드 매핑
const INDUSTRY_KEYWORDS: Record<string, string> = {
  '식음료':       '음료 식품',
  '의약/건강식':  '건강기능식품 영양제',
  '의약/건기식':  '건강기능식품 영양제',
  '패션':         '패션 의류',
  '뷰티':         '화장품 뷰티',
  '생활/잡화':    '생활용품',
  '기관/단체':    '공공기관',
  '공공기관':     '공공기관',
  '교육':         '교육 학원',
  '금융':         '금융 보험',
  '보험':         '보험',
  '관광/레저':    '여행 호텔 리조트',
  '여행':         '여행 호텔',
  '게임':         '게임',
  '부동산':       '부동산 아파트',
  '수송':         '자동차 항공 운송',
  '자동차':       '자동차',
  '엔터테인먼트': '엔터테인먼트 공연 영화',
  '엔터':         '엔터테인먼트',
  '전자':         '가전 전자',
  '가전':         '가전 전자',
  '유통':         '쇼핑 유통',
  '주류':         '주류 맥주 와인',
  '주택/가구':    '가구 인테리어',
  '방송통신':     '방송 통신 미디어',
  '서비스':       '서비스',
  '기타':         '브랜드',
};

type MetaAdsArchiveItem = {
  id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  ad_snapshot_url?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  publisher_platforms?: string[];
  languages?: string[];
  ad_reached_countries?: string[];
};

function boundedProviderFailureStatus(status: number): 502 | 503 {
  return status === 429 || status >= 500 ? 503 : 502;
}

function safeMetaSnapshotUrl(raw: unknown, id: string): string {
  const safeId = /^\d{1,32}$/.test(id) ? id : '';
  if (!safeId) return '';

  try {
    const url = typeof raw === 'string'
      ? new URL(raw)
      : new URL(`https://www.facebook.com/ads/library/?id=${safeId}`);
    if (url.protocol !== 'https:') return '';
    if (url.hostname !== 'www.facebook.com' && url.hostname !== 'facebook.com') {
      return '';
    }
    return `https://www.facebook.com/ads/library/?id=${safeId}`;
  } catch {
    return `https://www.facebook.com/ads/library/?id=${safeId}`;
  }
}

function toSafeMetaAd(ad: MetaAdsArchiveItem) {
  const id = typeof ad.id === 'string' ? ad.id : '';
  return {
    id,
    page_name: typeof ad.page_name === 'string' ? ad.page_name : '',
    ad_creative_bodies: Array.isArray(ad.ad_creative_bodies) ? ad.ad_creative_bodies : [],
    ad_creative_link_titles: Array.isArray(ad.ad_creative_link_titles) ? ad.ad_creative_link_titles : [],
    ad_creative_link_descriptions: Array.isArray(ad.ad_creative_link_descriptions)
      ? ad.ad_creative_link_descriptions
      : [],
    ad_snapshot_url: safeMetaSnapshotUrl(ad.ad_snapshot_url, id),
    ad_delivery_start_time: typeof ad.ad_delivery_start_time === 'string'
      ? ad.ad_delivery_start_time
      : '',
    ad_delivery_stop_time: typeof ad.ad_delivery_stop_time === 'string'
      ? ad.ad_delivery_stop_time
      : '',
    publisher_platforms: Array.isArray(ad.publisher_platforms) ? ad.publisher_platforms : [],
    languages: Array.isArray(ad.languages) ? ad.languages : [],
    ad_reached_countries: Array.isArray(ad.ad_reached_countries) ? ad.ad_reached_countries : [],
  };
}

export async function GET(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  const limited = checkRateLimit(req, {
    key: 'meta-ads',
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '9'), 20);
  const after = searchParams.get('after') || ''; // 페이지네이션 커서

  const userToken = process.env.META_ACCESS_TOKEN;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  const accessToken = userToken || (appId && appSecret ? `${appId}|${appSecret}` : null);

  if (!accessToken) {
    return noStoreJson(
      { error: NOT_CONFIGURED_ERROR },
      { status: 503 }
    );
  }

  const searchTerm = INDUSTRY_KEYWORDS[industry] || industry || '브랜드';

  // 전 세계 주요 국가 코드 (Meta API는 ad_reached_countries 필수)
  const ALL_COUNTRIES = JSON.stringify([
    'KR','US','JP','CN','GB','DE','FR','IN','BR','AU',
    'CA','SG','TH','VN','ID','MY','PH','TW','HK','MX',
    'IT','ES','NL','SE','NO','DK','FI','PL','RU','ZA',
    'AE','SA','TR','AR','CL','CO','PE','EG','NG','KE',
  ]);

  const params = new URLSearchParams({
    access_token: accessToken,
    search_terms: searchTerm,
    ad_reached_countries: ALL_COUNTRIES,
    ad_type: 'ALL',
    ad_active_status: 'ALL', // 진행 중 + 종료 광고 모두 포함
    fields: [
      'id',
      'page_name',
      'ad_creative_bodies',
      'ad_creative_link_titles',
      'ad_creative_link_descriptions',
      'ad_snapshot_url',
      'ad_delivery_start_time',
      'ad_delivery_stop_time',
      'publisher_platforms',
      'languages',
      'ad_reached_countries',
    ].join(','),
    limit: String(limit),
  });

  // 페이지네이션 커서가 있으면 추가
  if (after) params.set('after', after);

  try {
    const res = await fetch(`${BASE_URL}/ads_archive?${params}`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.warn('[meta-ads] lookup failed: provider_non_ok');
      return noStoreJson(
        { error: LOOKUP_FAILED_ERROR },
        { status: boundedProviderFailureStatus(res.status) }
      );
    }

    const data = await res.json() as {
      data?: MetaAdsArchiveItem[];
      paging?: { cursors?: { after?: string } };
    };

    return noStoreJson({
      ads: (data.data ?? []).map(toSafeMetaAd),
      nextCursor: data.paging?.cursors?.after ?? null,
      industry,
      searchTerm,
    });
  } catch {
    console.error('[meta-ads] lookup failed: request_failed');
    return noStoreJson(
      { error: LOOKUP_FAILED_ERROR },
      { status: 502 }
    );
  }
}
