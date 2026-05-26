import { NextRequest } from 'next/server';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { checkRateLimit } from '@/lib/rateLimit';
import { noStoreJson } from '@/lib/security';

const BASE = 'https://adstransparency.google.com/anji/_/rpc';
const LOOKUP_FAILED_ERROR = 'External ads lookup failed.';
const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Origin': 'https://adstransparency.google.com',
  'Referer': 'https://adstransparency.google.com/?region=KR',
  'X-Same-Domain': '1',
  'X-Framework-Xsrf-Token': '',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

type ExternalLookupReason =
  | 'advertiser_provider_non_ok'
  | 'creative_provider_non_ok'
  | 'request_failed';

class ExternalLookupError extends Error {
  constructor(readonly reason: ExternalLookupReason) {
    super(reason);
  }
}

function safeExternalUrl(raw: string, allowedHosts: string[]): string {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !allowedHosts.includes(url.hostname)) return '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

const INDUSTRY_KEYWORDS: Record<string, string> = {
  '식음료':      '식음료 음식',
  '의약/건기식': '건강기능식품',
  '패션':        '패션 의류',
  '뷰티':        '화장품 뷰티',
  '생활/잡화':   '생활용품',
  '기관/단체':   '공공기관',
  '교육':        '교육',
  '금융':        '금융 보험',
  '여행':        '여행',
  '게임':        '게임',
  '부동산':      '부동산',
  '자동차':      '자동차',
  '엔터':        '엔터테인먼트',
  '가전제품':    '가전',
  '유통':        '쇼핑',
  '화장품':      '화장품',
  '서비스':      '서비스',
};

function fReq(obj: unknown) {
  return 'f.req=' + encodeURIComponent(JSON.stringify(obj));
}

// 1단계: 키워드로 광고주 검색
async function searchAdvertisers(keyword: string, limit = 5): Promise<{ id: string; name: string; country: string }[]> {
  const body = fReq({ '1': keyword, '2': limit, '3': limit, '4': [2410], '5': { '1': 1 } });
  const res = await fetch(`${BASE}/SearchService/SearchSuggestions?authuser=`, {
    method: 'POST', headers: HEADERS, body,
  });
  if (!res.ok) throw new ExternalLookupError('advertiser_provider_non_ok');
  const data = await res.json();
  const items = data['1'] ?? [];
  return items.map((item: Record<string, Record<string, string>>) => ({
    id: item['1']?.['2'] ?? '',
    name: item['1']?.['1'] ?? '',
    country: item['1']?.['3'] ?? '',
  })).filter((a: { id: string }) => a.id);
}

// 2단계: 광고주 ID로 소재 검색
async function searchCreatives(advertiserIds: string[], limit = 12): Promise<{
  id: string;
  advertiserId: string;
  advertiserName: string;
  previewUrl: string;
  format: number;
  startDate: string;
  endDate: string;
}[]> {
  const body = fReq({
    '2': limit,
    '3': {
      '12': { '1': '', '2': true },
      '13': { '1': advertiserIds },
    },
    '7': { '1': 1, '2': 0, '3': limit },
  });
  const res = await fetch(`${BASE}/SearchService/SearchCreatives?authuser=`, {
    method: 'POST', headers: HEADERS, body,
  });
  if (!res.ok) throw new ExternalLookupError('creative_provider_non_ok');
  const data = await res.json();
  const items: Record<string, unknown>[] = data['1'] ?? [];

  function toDate(raw?: Record<string, string>) {
    if (!raw) return '';
    const sec = parseInt(raw['1'] ?? '0');
    return sec ? new Date(sec * 1000).toISOString().slice(0, 10) : '';
  }

  function extractImageUrl(html: string): string {
    const m = html.match(/src="([^"]+)"/);
    return m?.[1] ?? '';
  }

  return items.map((item) => {
    const creative = item as Record<string, unknown>;
    const startRaw = creative['6'] as Record<string, string> | undefined;
    const endRaw   = creative['7'] as Record<string, string> | undefined;
    const inner    = creative['3'] as Record<string, unknown> | undefined;

    // format 1 (디스플레이): "3"."3"."2" 안에 <img> HTML
    const displayHtml = (inner?.['3'] as Record<string, string> | undefined)?.[  '2'] ?? '';
    const imageUrl = displayHtml ? extractImageUrl(displayHtml) : '';

    // format 3 (텍스트/반응형): "3"."1"."4" 안에 preview URL
    const innerOne = inner?.['1'] as Record<string, unknown> | undefined;
    const previewUrl = (innerOne?.['4'] as string) ?? '';

    const advertiserId = (creative['1'] as string) ?? '';
    const creativeId   = (creative['2'] as string) ?? '';

    return {
      id:             creativeId,
      advertiserId,
      advertiserName: (creative['12'] as string) ?? '',
      imageUrl: safeExternalUrl(imageUrl, [
        'adstransparency.google.com',
        'tpc.googlesyndication.com',
        'lh3.googleusercontent.com',
        'www.gstatic.com',
      ]),
      previewUrl: safeExternalUrl(previewUrl, ['adstransparency.google.com']),
      detailUrl: advertiserId && creativeId
        ? `https://adstransparency.google.com/advertiser/${advertiserId}/creative/${creativeId}`
        : '',
      format:    (creative['4'] as number) ?? 0,
      startDate: toDate(startRaw),
      endDate:   toDate(endRaw),
      count:     (creative['13'] as number) ?? 0,
    };
  }).filter((c) => c.id);
}

export async function GET(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  const limited = checkRateLimit(req, {
    key: 'google-ads',
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry') ?? '';
  const keyword  = searchParams.get('keyword')  ?? '';
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '12'), 20);

  const searchKeyword = INDUSTRY_KEYWORDS[industry] || keyword || industry || '브랜드';

  try {
    // 1) 광고주 목록 가져오기
    const advertisers = await searchAdvertisers(searchKeyword, 5);
    if (!advertisers.length) {
      return noStoreJson({ ads: [], searchKeyword, advertisers: [] });
    }

    // 2) 소재 가져오기
    const advertiserIds = advertisers.map((a) => a.id);
    const creatives = await searchCreatives(advertiserIds, limit);

    // 광고주 이름 매핑
    const advertiserMap = Object.fromEntries(advertisers.map((a) => [a.id, a]));
    const ads = creatives.map((c) => ({
      ...c,
      advertiserName: c.advertiserName || advertiserMap[c.advertiserId]?.name || '',
      country: advertiserMap[c.advertiserId]?.country || '',
    }));

    return noStoreJson({
      ads,
      searchKeyword,
      advertisers,
      total: ads.length,
    });
  } catch (err) {
    const reason = err instanceof ExternalLookupError ? err.reason : 'request_failed';
    console.error(`[google-ads] lookup failed: ${reason}`);
    return noStoreJson({ error: LOOKUP_FAILED_ERROR }, { status: 502 });
  }
}
