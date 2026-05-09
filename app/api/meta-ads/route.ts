import { NextRequest, NextResponse } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { checkRateLimit } from '@/lib/rateLimit';
import { sanitizeError } from '@/lib/security';

const META_API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// 업종 → Meta 광고 라이브러리 검색 키워드 매핑
const INDUSTRY_KEYWORDS: Record<string, string> = {
  '식음료':       '음료 식품',
  '의약/건기식':  '건강기능식품 영양제',
  '패션':         '패션 의류',
  '뷰티':         '화장품 뷰티',
  '생활/잡화':    '생활용품',
  '기관/단체':    '공공기관',
  '교육':         '교육 학원',
  '금융':         '금융 보험',
  '여행':         '여행 호텔',
  '게임':         '게임',
  '부동산':       '부동산 아파트',
  '자동차':       '자동차',
  '엔터':         '엔터테인먼트',
  '가전':         '가전 전자',
  '유통':         '쇼핑 유통',
  '기타':         '브랜드',
};

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
    return NextResponse.json(
      { error: 'External ads lookup is not configured.' },
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
    const data = await res.json();

    if (!res.ok) {
      console.error('[meta-ads] API error:', {
        status: res.status,
        code: data.error?.code,
        type: data.error?.type,
      });
      return NextResponse.json(
        { error: 'External ads lookup failed.' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      ads: data.data ?? [],
      paging: data.paging ?? null,
      nextCursor: data.paging?.cursors?.after ?? null,
      industry,
      searchTerm,
    });
  } catch (err) {
    console.error('[meta-ads] request failed:', sanitizeError(err));
    return NextResponse.json(
      { error: '광고 데이터를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}
