import { NextRequest, NextResponse } from 'next/server';

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
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 20);

  const userToken = process.env.META_ACCESS_TOKEN;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  // User Access Token 우선 사용, 없으면 App Access Token 사용
  const accessToken = userToken || (appId && appSecret ? `${appId}|${appSecret}` : null);

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Meta API 인증 정보가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }
  const searchTerm = INDUSTRY_KEYWORDS[industry] || industry || '브랜드';

  const params = new URLSearchParams({
    access_token: accessToken,
    search_terms: searchTerm,
    ad_reached_countries: '["KR"]',
    ad_type: 'ALL',
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
    ].join(','),
    limit: String(limit),
  });

  try {
    const res = await fetch(`${BASE_URL}/ads_archive?${params}`, {
      next: { revalidate: 300 }, // 5분 캐시
    });
    const data = await res.json();

    if (!res.ok) {
      console.error('[meta-ads] API error:', JSON.stringify(data.error));
      return NextResponse.json(
        {
          error: data.error?.message || 'Meta API 오류가 발생했습니다.',
          code: data.error?.code,
          subcode: data.error?.error_subcode,
          type: data.error?.type,
          tokenType: userToken ? 'user_token' : 'app_token',
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      ads: data.data ?? [],
      paging: data.paging ?? null,
      industry,
      searchTerm,
    });
  } catch (err) {
    console.error('[meta-ads] fetch error:', err);
    return NextResponse.json(
      { error: '광고 데이터를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}
