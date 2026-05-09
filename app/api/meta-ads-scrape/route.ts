import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { requireForesightApiSession } from '@/lib/auth/foresightApiGuard';
import { checkRateLimit } from '@/lib/rateLimit';
import { isProductionRuntime, requireInternalKey, sanitizeError } from '@/lib/security';

// Vercel serverless 환경 timeout (Pro 300s, Hobby 60s)
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

export interface AdResult {
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

// ══════════════════════════════════════════════════════════════
// 1. Meta Ad Library API (공식) — 브라우저 불필요, 빠름
// ══════════════════════════════════════════════════════════════
const META_API_VERSION = 'v21.0';

async function scrapeViaMetaAPI(keyword: string, limit: number): Promise<AdResult[]> {
  const userToken = process.env.META_ACCESS_TOKEN;
  const appId     = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const accessToken = userToken || (appId && appSecret ? `${appId}|${appSecret}` : null);

  if (!accessToken) throw new Error('META_ACCESS_TOKEN 없음');

  const ALL_COUNTRIES = JSON.stringify([
    'KR','US','JP','CN','GB','DE','FR','IN','BR','AU',
    'CA','SG','TH','VN','ID','MY','PH','TW','HK','MX',
    'IT','ES','NL','SE','NO','DK','FI','PL','ZA',
    'AE','SA','TR','AR','CL','CO','EG','NG','KE',
  ]);

  const params = new URLSearchParams({
    access_token:        accessToken,
    search_terms:        keyword,
    ad_reached_countries: ALL_COUNTRIES,
    ad_type:             'ALL',
    ad_active_status:    'ALL',
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
    ].join(','),
    limit: String(Math.min(limit, 20)),
  });

  const res = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/ads_archive?${params}`,
    { signal: AbortSignal.timeout(15000) },
  );
  const data = await res.json() as {
    data?: Array<{
      id: string;
      page_name?: string;
      ad_creative_bodies?: string[];
      ad_creative_link_titles?: string[];
      ad_creative_link_descriptions?: string[];
      ad_snapshot_url?: string;
      ad_delivery_start_time?: string;
    }>;
    error?: { message: string; code: number };
  };

  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `HTTP ${res.status}`);
  }

  return (data.data ?? []).map((ad) => ({
    id:            ad.id,
    page_name:     ad.page_name ?? '',
    body:          ad.ad_creative_bodies?.[0] ?? '',
    title:         ad.ad_creative_link_titles?.[0] ?? '',
    caption:       ad.ad_creative_link_descriptions?.[0] ?? '',
    cta:           '',
    snapshot_url:  ad.ad_snapshot_url ?? `https://www.facebook.com/ads/library/?id=${ad.id}`,
    start_date:    ad.ad_delivery_start_time?.slice(0, 10) ?? '',
    image_url:     '',
    profile_image: '',
  }));
}

// ══════════════════════════════════════════════════════════════
// 2. HTML 파싱 헬퍼 (Playwright 공통)
// ══════════════════════════════════════════════════════════════
function decodeUnicode(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );
}
function unescapeUrl(str: string): string {
  return str
    .replace(/\\\//g, '/')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function extractAdsFromHtml(html: string, limit: number): AdResult[] {
  const results: AdResult[] = [];
  const allMatches: { id: string; index: number }[] = [];
  const seenForPos = new Set<string>();

  const re = /"ad_archive_id":"(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (!seenForPos.has(m[1])) {
      seenForPos.add(m[1]);
      allMatches.push({ id: m[1], index: m.index });
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

    const bodyObjMatch  = chunk.match(/"body":\{"text":"([^"]+)"/);
    const cardBodyMatch = chunk.match(/"cards":\[[\s\S]*?"body":"([^"]{5,}?)"/);
    const body = decodeUnicode(
      (bodyObjMatch?.[1] || cardBodyMatch?.[1] || '').replace(/\\n/g, ' ').replace(/\\t/g, ' ')
    );

    const cardTitleMatch   = chunk.match(/"cards":\[[\s\S]*?"title":"([^"]{3,}?)"/);
    const simpleTitleMatch = chunk.match(/"title":"([^"]{3,2000})"/);
    const title = decodeUnicode(cardTitleMatch?.[1] || simpleTitleMatch?.[1] || '');

    const captionMatch = chunk.match(/"caption":"([^"]{3,200})"/);
    const caption = decodeUnicode(captionMatch?.[1] || '');

    const ctaMatch = chunk.match(/"cta_text":"([^"]+)"/);
    const cta = decodeUnicode(ctaMatch?.[1] || '');

    const imgMatch        = chunk.match(/"resized_image_url":"(https:\\\/\\\/[^"]+)"/);
    const imgMatch2       = chunk.match(/"original_image_url":"(https:\\\/\\\/[^"]+)"/);
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
      results.push({
        id: archiveId, page_name: pageName, body, title, caption, cta,
        snapshot_url: snapshotUrl, start_date: startDate,
        image_url: imageUrl, profile_image: profileImage,
      });
    }
  }
  return results;
}

// ══════════════════════════════════════════════════════════════
// 3. Playwright 스크래핑 — Vercel 서버리스 (sparticuz/chromium)
// ══════════════════════════════════════════════════════════════

// @sparticuz/chromium 패키지 버전과 반드시 일치해야 함
// npm ls @sparticuz/chromium 으로 확인 후 업데이트
const CHROMIUM_PACK_VER = process.env.CHROMIUM_PACK_VER ?? '147.0.1';
const CHROMIUM_REMOTE_URL =
  process.env.CHROMIUM_REMOTE_URL ??
  `https://github.com/Sparticuz/chromium/releases/download/v${CHROMIUM_PACK_VER}/chromium-v${CHROMIUM_PACK_VER}-pack.tar`;

async function scrapeOnVercel(url: string, limit: number): Promise<AdResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any;
  try {
    const { chromium } = await import('playwright-core');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sparticuzMod = await import('@sparticuz/chromium') as any;
    const ChromiumClass = sparticuzMod.default ?? sparticuzMod;

    console.log('[meta-ads-scrape] Vercel: resolving chromium executablePath...');
    const t0 = Date.now();

    // 1) 번들 내장 경로 시도 → 없으면 원격 다운로드
    let execPath: string;
    try {
      execPath = await ChromiumClass.executablePath();
      if (!execPath) throw new Error('empty path');
      console.log('[meta-ads-scrape] Vercel: local chromium executable resolved');
    } catch {
      console.log('[meta-ads-scrape] Vercel: downloading chromium package...');
      execPath = await ChromiumClass.executablePath(CHROMIUM_REMOTE_URL);
      console.log(`[meta-ads-scrape] Vercel: downloaded in ${Date.now() - t0}ms`);
    }

    const browserArgs: string[] = [
      ...(ChromiumClass.args ?? []),
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--single-process',
    ];

    browser = await chromium.launch({ args: browserArgs, executablePath: execPath, headless: true });
    console.log(`[meta-ads-scrape] Vercel: browser launched in ${Date.now() - t0}ms`);

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ko-KR',
      viewport: { width: 1280, height: 900 },
    });

    const page = await context.newPage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.route('**/*.{woff,woff2,ttf,png,jpg,jpeg,gif,webp,svg,ico,css,mp4,mp3,wav}', (route: any) => route.abort());
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1000);

    const html: string = await page.content();
    console.log(`[meta-ads-scrape] Vercel: scraped in ${Date.now() - t0}ms, html=${html.length}chars`);
    await browser.close();

    return extractAdsFromHtml(html, limit);
  } catch (err) {
    if (browser) await browser.close().catch(() => null);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════
// 4. Playwright 스크래핑 — 로컬 개발
// ══════════════════════════════════════════════════════════════
async function scrapeLocal(url: string, limit: number): Promise<AdResult[]> {
  const workerPath = path.join(process.cwd(), 'scripts', 'scrape_worker.js');

  function findChromiumPath(): string {
    // Windows: LOCALAPPDATA/ms-playwright
    const bases = [
      process.env.LOCALAPPDATA || '',
      process.env.APPDATA || '',
      path.join(process.env.HOME || '', '.cache'),
    ].filter(Boolean);

    for (const base of bases) {
      const playwrightDir = path.join(base, 'ms-playwright');
      if (!fs.existsSync(playwrightDir)) continue;
      const dirs = fs.readdirSync(playwrightDir);

      // headless-shell 우선
      for (const dir of dirs) {
        if (!dir.startsWith('chromium_headless_shell')) continue;
        for (const exe of [
          path.join(playwrightDir, dir, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
          path.join(playwrightDir, dir, 'chrome-headless-shell-linux', 'chrome-headless-shell'),
          path.join(playwrightDir, dir, 'chrome-headless-shell-mac_arm', 'chrome-headless-shell'),
        ]) {
          if (fs.existsSync(exe)) return exe;
        }
      }

      // full chromium fallback
      for (const dir of dirs) {
        if (!dir.startsWith('chromium-') || dir.includes('headless')) continue;
        for (const exe of [
          path.join(playwrightDir, dir, 'chrome-win64', 'chrome.exe'),
          path.join(playwrightDir, dir, 'chrome-linux', 'chrome'),
          path.join(playwrightDir, dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        ]) {
          if (fs.existsSync(exe)) return exe;
        }
      }
    }
    return '';
  }

  const chromiumPath = findChromiumPath();
  console.log('[meta-ads-scrape] local chromium:', chromiumPath ? 'custom' : 'default');

  return new Promise((resolve, reject) => {
    let stdout = '';
    const workerArgs = [workerPath, url, String(limit * 4)];
    if (chromiumPath) workerArgs.push(chromiumPath);

    const child = spawn(process.execPath, workerArgs, {
      timeout: 55000,
      windowsHide: true,
      env: { ...process.env },
    });
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', () => null);
    child.on('close', (code: number) => {
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) return reject(new Error(parsed.error));
        resolve(parsed.ads || []);
      } catch {
        reject(new Error(`scrape_worker failed exit=${code}`));
      }
    });
    child.on('error', reject);
  });
}

// ══════════════════════════════════════════════════════════════
// 5. GET 핸들러 — Meta API 우선, Playwright 폴백
// ══════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const authResponse = await requireForesightApiSession();
  if (authResponse) return authResponse;

  const limited = checkRateLimit(req, {
    key: 'meta-ads-scrape',
    limit: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry') || '';
  const kw       = searchParams.get('keyword')  || '';
  const limit    = Math.min(parseInt(searchParams.get('limit') || '30'), 60);

  const isPageSearch   = !industry && !!kw;
  const searchKeyword  = kw || INDUSTRY_KEYWORDS[industry] || industry || '브랜드';
  const libraryUrl     = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(searchKeyword)}&search_type=keyword_unordered`;

  console.log('[meta-ads-scrape] requested:', {
    hasIndustry: !!industry,
    hasKeyword:  !!kw,
    limit,
    env: isVercel ? 'vercel' : 'local',
  });

  let rawAds: AdResult[] = [];
  let method = '';

  // ── 1순위: Meta Ad Library API (공식, 빠름) ──
  try {
    rawAds = await scrapeViaMetaAPI(searchKeyword, limit);
    method = 'meta_api';
    console.log(`[meta-ads-scrape] Meta API 성공 — ${rawAds.length}건`);
  } catch (apiErr) {
    console.warn('[meta-ads-scrape] Meta API failed:', sanitizeError(apiErr, 160));

    if (isProductionRuntime()) {
      const blocked = requireInternalKey(req);
      if (blocked) {
        console.warn('[meta-ads-scrape] Playwright fallback blocked for public production request');
        return blocked;
      }
    }

    // ── 2순위: Playwright 스크래핑 ──
    try {
      rawAds = isVercel
        ? await scrapeOnVercel(libraryUrl, limit * 4)
        : await scrapeLocal(libraryUrl, limit);
      method = 'playwright';
      console.log(`[meta-ads-scrape] Playwright 성공 — ${rawAds.length}건`);
    } catch (scrapeErr) {
      console.error('[meta-ads-scrape] Playwright failed:', sanitizeError(scrapeErr));

      return NextResponse.json(
        { error: 'External ads lookup failed.' },
        { status: 500 }
      );
    }
  }

  // ── 페이지명 검색 시 우선순위 정렬 ──
  let ads: AdResult[];
  if (isPageSearch) {
    const kwNorm = searchKeyword.toLowerCase().replace(/\s+/g, '');
    const exact   = rawAds.filter(ad => ad.page_name.toLowerCase().replace(/\s+/g, '') === kwNorm);
    const partial = rawAds.filter(ad => {
      const pn = ad.page_name.toLowerCase().replace(/\s+/g, '');
      return pn !== kwNorm && pn.includes(kwNorm);
    });
    const rest    = rawAds.filter(ad => !ad.page_name.toLowerCase().replace(/\s+/g, '').includes(kwNorm));
    const prioritized = [...exact, ...partial];
    ads = (prioritized.length >= limit ? prioritized : [...prioritized, ...rest]).slice(0, limit);
  } else {
    ads = rawAds.slice(0, limit);
  }

  return NextResponse.json({
    ads,
    industry,
    searchTerm: searchKeyword,
    total: ads.length,
    method,
  });
}
