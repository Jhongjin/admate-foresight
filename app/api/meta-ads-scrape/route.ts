import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const INDUSTRY_KEYWORDS: Record<string, string> = {
  '식음료':      '식음료',
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
  '기타':        '브랜드',
};

interface AdCard {
  body?: string;
  title?: string;
  link_url?: string;
  cta_type?: string;
  resized_image_url?: string;
  original_image_url?: string;
}

interface AdSnapshot {
  page_name?: string;
  page_profile_picture_url?: string;
  caption?: string;
  cta_text?: string;
  body?: { markup?: { __html?: string }; text?: string };
  cards?: AdCard[];
  images?: { resized_image_url?: string; original_image_url?: string }[];
  videos?: { video_preview_image_url?: string }[];
  start_date?: number;
  end_date?: number;
}

interface RawAdNode {
  ad_archive_id?: string;
  page_id?: string;
  start_date?: number;
  end_date?: number;
  snapshot?: AdSnapshot;
}

function extractAdsFromHtml(html: string, limit: number) {
  // HTML 내 embedded JSON에서 ad_archive_id 블록들을 추출
  const results: {
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
  }[] = [];

  // 1) 모든 ad_archive_id 위치 수집 (중복 제거)
  const allMatches: { id: string; index: number }[] = [];
  const seenForPos = new Set<string>();
  {
    const re = /"ad_archive_id":"(\d+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      if (!seenForPos.has(m[1])) {
        seenForPos.add(m[1]);
        allMatches.push({ id: m[1], index: m.index });
      }
    }
  }

  const seenIds = new Set<string>();

  for (let i = 0; i < allMatches.length && results.length < limit; i++) {
    const { id: archiveId, index: matchIndex } = allMatches[i];
    if (seenIds.has(archiveId)) continue;
    seenIds.add(archiveId);

    // 다음 ad 시작점까지만 청크로 사용 (없으면 +25000)
    const nextIndex = allMatches[i + 1]?.index ?? matchIndex + 25000;
    const chunk = html.substring(Math.max(0, matchIndex - 200), nextIndex);

    // page_name 추출
    const pageNameMatch = chunk.match(/"page_name":"([^"]+)"/);
    const pageName = pageNameMatch ? decodeUnicode(pageNameMatch[1]) : '';

    // body 텍스트 추출
    // 구조: "body":{"text":"..."}  또는  "cards":[{"body":"..."}]
    const bodyObjMatch = chunk.match(/"body":\{"text":"([^"]+)"/);
    const cardBodyMatch = chunk.match(/"cards":\[.*?"body":"([^"]{5,}?)"/s);
    const body = decodeUnicode(
      (bodyObjMatch?.[1] || cardBodyMatch?.[1] || '').replace(/\\n/g, ' ').replace(/\\t/g, ' ')
    );

    // 타이틀 (cards 안 title, null이 아닌 경우만)
    const cardTitleMatch = chunk.match(/"cards":\[.*?"title":"([^"]{3,}?)"/s);
    const simpleTitleMatch = chunk.match(/"title":"([^"]{3,2000})"/);
    const title = decodeUnicode(cardTitleMatch?.[1] || simpleTitleMatch?.[1] || '');

    // caption (도메인)
    const captionMatch = chunk.match(/"caption":"([^"]{3,200})"/);
    const caption = decodeUnicode(captionMatch?.[1] || '');

    // CTA 텍스트
    const ctaMatch = chunk.match(/"cta_text":"([^"]+)"/);
    const cta = decodeUnicode(ctaMatch?.[1] || '');

    // 이미지 URL
    const imgMatch = chunk.match(/"resized_image_url":"(https:\\\/\\\/[^"]+)"/);
    const imgMatch2 = chunk.match(/"original_image_url":"(https:\\\/\\\/[^"]+)"/);
    const videoThumbMatch = chunk.match(/"video_preview_image_url":"(https:\\\/\\\/[^"]+)"/);
    const imageUrl = unescapeUrl(imgMatch?.[1] || imgMatch2?.[1] || videoThumbMatch?.[1] || '');

    // 프로필 이미지
    const profileMatch = chunk.match(/"page_profile_picture_url":"(https:\\\/\\\/[^"]+)"/);
    const profileImage = unescapeUrl(profileMatch?.[1] || '');

    // 시작일 (start_date는 멀리 있으므로 넓은 범위 탐색)
    const startDateMatch = chunk.match(/"start_date":(\d{9,10})/);
    const startDate = startDateMatch
      ? new Date(parseInt(startDateMatch[1]) * 1000).toISOString().slice(0, 10)
      : '';

    const snapshotUrl = `https://www.facebook.com/ads/library/?id=${archiveId}`;

    if (pageName || body) {
      results.push({ id: archiveId, page_name: pageName, body, title, caption, cta, snapshot_url: snapshotUrl, start_date: startDate, image_url: imageUrl, profile_image: profileImage });
    }
  }
  return results;
}

function decodeUnicode(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );
}

function unescapeUrl(str: string): string {
  return str.replace(/\\\//g, '/').replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry') || '';
  const kw       = searchParams.get('keyword')  || '';
  const limit    = Math.min(parseInt(searchParams.get('limit') || '30'), 60);

  const isPageSearch = !industry && !!kw;
  const searchKeyword = kw || INDUSTRY_KEYWORDS[industry] || industry || '브랜드';

  // 항상 keyword_unordered로 시작 (page 타입은 페이지 선택 UI를 보여줘서 자동화 불가)
  const url = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(searchKeyword)}&search_type=keyword_unordered`;

  // Next.js 번들링 환경에서 playwright가 chromium 경로를 못 찾는 문제 우회:
  // 독립 Node.js 프로세스(scrape_worker.js)를 child_process로 실행
  const workerPath = path.join(process.cwd(), 'scripts', 'scrape_worker.js');

  // Next.js 프로세스에서 chromium 경로를 미리 탐색해서 worker에 전달
  // (worker 내부에서 fs.existsSync가 실패하는 문제 우회)
  function findChromiumPath(): string {
    const localAppData = process.env.LOCALAPPDATA || '';
    const playwrightDir = path.join(localAppData, 'ms-playwright');
    if (fs.existsSync(playwrightDir)) {
      const dirs = fs.readdirSync(playwrightDir);
      for (const dir of dirs) {
        if (dir.startsWith('chromium_headless_shell')) {
          const candidate = path.join(playwrightDir, dir, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
          if (fs.existsSync(candidate)) return candidate;
        }
      }
      for (const dir of dirs) {
        if (dir.startsWith('chromium-') && !dir.includes('headless')) {
          const candidate = path.join(playwrightDir, dir, 'chrome-win64', 'chrome.exe');
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    }
    return '';
  }
  const chromiumPath = findChromiumPath();

  try {
    type AdResult = { id: string; page_name: string; body: string; title: string; caption: string; cta: string; snapshot_url: string; start_date: string; image_url: string; profile_image: string };
    const rawAds: AdResult[] = await new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      const workerArgs = [workerPath, url, String(limit * 4)];
      if (chromiumPath) workerArgs.push(chromiumPath);
      const child = spawn(process.execPath, workerArgs, {
        timeout: 55000,
        windowsHide: true,
        env: { ...process.env },
      });
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('close', (code: number) => {
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.error) return reject(new Error(parsed.error));
          resolve(parsed.ads || []);
        } catch {
          reject(new Error(`exit=${code} stderr=${stderr.substring(0, 400)} stdout=${stdout.substring(0, 200)}`));
        }
      });
      child.on('error', reject);
    });

    let ads;
    if (isPageSearch) {
      const kwNorm = searchKeyword.toLowerCase().replace(/\s+/g, '');
      const exact   = rawAds.filter(ad => ad.page_name.toLowerCase().replace(/\s+/g, '') === kwNorm);
      const partial = rawAds.filter(ad => {
        const pn = ad.page_name.toLowerCase().replace(/\s+/g, '');
        return pn !== kwNorm && pn.includes(kwNorm);
      });
      const rest = rawAds.filter(ad => !ad.page_name.toLowerCase().replace(/\s+/g, '').includes(kwNorm));
      const prioritized = [...exact, ...partial];
      ads = (prioritized.length >= limit ? prioritized : [...prioritized, ...rest]).slice(0, limit);
    } else {
      ads = rawAds.slice(0, limit);
    }

    return NextResponse.json({ ads, industry, searchTerm: searchKeyword, url, total: ads.length });
  } catch (err) {
    console.error('[meta-ads-scrape] error:', err);
    return NextResponse.json(
      { error: '스크래핑 중 오류가 발생했습니다.', detail: String(err) },
      { status: 500 }
    );
  }
}
