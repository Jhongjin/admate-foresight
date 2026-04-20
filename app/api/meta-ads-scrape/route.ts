import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Vercel serverless 환경에서 timeout 설정 (60초 = Hobby 최대, Pro는 300초까지 가능)
export const maxDuration = 60;

const isVercel = !!process.env.VERCEL;

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

interface AdResult {
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

function extractAdsFromHtml(html: string, limit: number): AdResult[] {
  const results: AdResult[] = [];

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

    const nextIndex = allMatches[i + 1]?.index ?? matchIndex + 25000;
    const chunk = html.substring(Math.max(0, matchIndex - 200), nextIndex);

    const pageNameMatch = chunk.match(/"page_name":"([^"]+)"/);
    const pageName = pageNameMatch ? decodeUnicode(pageNameMatch[1]) : '';

    const bodyObjMatch = chunk.match(/"body":\{"text":"([^"]+)"/);
    const cardBodyMatch = chunk.match(/"cards":\[[\s\S]*?"body":"([^"]{5,}?)"/);
    const body = decodeUnicode(
      (bodyObjMatch?.[1] || cardBodyMatch?.[1] || '').replace(/\\n/g, ' ').replace(/\\t/g, ' ')
    );

    const cardTitleMatch = chunk.match(/"cards":\[[\s\S]*?"title":"([^"]{3,}?)"/);
    const simpleTitleMatch = chunk.match(/"title":"([^"]{3,2000})"/);
    const title = decodeUnicode(cardTitleMatch?.[1] || simpleTitleMatch?.[1] || '');

    const captionMatch = chunk.match(/"caption":"([^"]{3,200})"/);
    const caption = decodeUnicode(captionMatch?.[1] || '');

    const ctaMatch = chunk.match(/"cta_text":"([^"]+)"/);
    const cta = decodeUnicode(ctaMatch?.[1] || '');

    const imgMatch = chunk.match(/"resized_image_url":"(https:\\\/\\\/[^"]+)"/);
    const imgMatch2 = chunk.match(/"original_image_url":"(https:\\\/\\\/[^"]+)"/);
    const videoThumbMatch = chunk.match(/"video_preview_image_url":"(https:\\\/\\\/[^"]+)"/);
    const imageUrl = unescapeUrl(imgMatch?.[1] || imgMatch2?.[1] || videoThumbMatch?.[1] || '');

    const profileMatch = chunk.match(/"page_profile_picture_url":"(https:\\\/\\\/[^"]+)"/);
    const profileImage = unescapeUrl(profileMatch?.[1] || '');

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

// Vercel에서 @sparticuz/chromium bin 폴더가 배포에 포함되지 않는 문제 우회:
// 런타임에 GitHub Releases에서 Chromium 바이너리를 /tmp로 다운로드하는 방식 사용.
// 환경변수 CHROMIUM_REMOTE_URL을 Vercel 프로젝트 설정에 추가하면 해당 URL 사용,
// 없으면 기본 v147 URL 사용 (/tmp/chromium에 캐시되므로 두 번째 요청부터 빠름).
const CHROMIUM_REMOTE_URL =
  process.env.CHROMIUM_REMOTE_URL ??
  'https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.tar';

/** Vercel 서버리스: playwright-core + @sparticuz/chromium 런타임 다운로드 방식 */
async function scrapeOnVercel(url: string, limit: number): Promise<AdResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any;
  try {
    const { chromium } = await import('playwright-core');

    // @sparticuz/chromium CJS 패키지: module.exports = Chromium 클래스 자체
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sparticuzMod = await import('@sparticuz/chromium') as any;
    const ChromiumClass = sparticuzMod.default ?? sparticuzMod;

    // /tmp/chromium 이미 있으면 재사용(warm start), 없으면 GitHub에서 다운로드
    console.log('[meta-ads-scrape] Vercel: resolving chromium executablePath via remote URL...');
    const t0 = Date.now();
    const execPath: string = await ChromiumClass.executablePath(CHROMIUM_REMOTE_URL);
    console.log(`[meta-ads-scrape] Vercel: execPath resolved in ${Date.now() - t0}ms → ${String(execPath).slice(0, 80)}`);

    const browserArgs: string[] = ChromiumClass.args ?? [];

    browser = await chromium.launch({
      args: [
        ...browserArgs,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
      executablePath: execPath,
      headless: true,
    });
    console.log(`[meta-ads-scrape] Vercel: browser launched in ${Date.now() - t0}ms`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ko-KR',
      viewport: { width: 1280, height: 900 },
    });

    const page = await context.newPage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.route('**/*.{woff,woff2,ttf,png,jpg,jpeg,gif,webp,svg,ico,css,mp4,mp3,wav}', (route: any) => route.abort());
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1500);

    // 스크롤로 더 많은 광고 로드
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(800);

    const html: string = await page.content();
    console.log(`[meta-ads-scrape] Vercel: page scraped in ${Date.now() - t0}ms, html length: ${html.length}`);
    await browser.close();

    return extractAdsFromHtml(html, limit);
  } catch (err) {
    if (browser) await browser.close().catch(() => null);
    throw err;
  }
}

/** 로컬 개발: child_process spawn으로 scrape_worker.js 실행 */
async function scrapeLocal(url: string, limit: number): Promise<AdResult[]> {
  const workerPath = path.join(process.cwd(), 'scripts', 'scrape_worker.js');

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

  return new Promise((resolve, reject) => {
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
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry') || '';
  const kw       = searchParams.get('keyword')  || '';
  const limit    = Math.min(parseInt(searchParams.get('limit') || '30'), 60);

  const isPageSearch = !industry && !!kw;
  const searchKeyword = kw || INDUSTRY_KEYWORDS[industry] || industry || '브랜드';

  const url = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(searchKeyword)}&search_type=keyword_unordered`;

  try {
    console.log(`[meta-ads-scrape] env=Vercel:${isVercel} industry="${industry}" kw="${kw}" → keyword="${searchKeyword}"`);

    const rawAds = isVercel
      ? await scrapeOnVercel(url, limit * 4)
      : await scrapeLocal(url, limit);

    let ads: AdResult[];
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
    const errStr = String(err);
    console.error('[meta-ads-scrape] error:', errStr);
    return NextResponse.json(
      {
        error: '스크래핑 중 오류가 발생했습니다.',
        detail: errStr,
        env: isVercel ? 'vercel' : 'local',
        tip: isVercel
          ? 'Vercel: @sparticuz/chromium 실행 실패. Vercel 함수 로그를 확인하세요.'
          : '로컬: scrape_worker.js 실행 실패. playwright chromium이 설치되어 있는지 확인하세요.',
      },
      { status: 500 }
    );
  }
}
