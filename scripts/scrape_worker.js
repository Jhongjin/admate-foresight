/**
 * Playwright 스크래핑 워커 (Next.js 번들링 우회용 독립 Node.js 스크립트)
 * 사용: node scripts/scrape_worker.js <URL> <limit> [chromiumPath]
 * 결과: JSON을 stdout으로 출력
 */

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const url             = process.argv[2];
const limit           = parseInt(process.argv[3] || '30');
const preComputedPath = process.argv[4] || '';

if (!url) {
  process.stdout.write(JSON.stringify({ error: 'URL 인수 없음' }));
  process.exit(1);
}

function decodeUnicode(str) {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );
}

function unescapeUrl(str) {
  return str
    .replace(/\\\//g, '/')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function extractAdsFromHtml(html, limit) {
  const results = [];
  const allMatches = [];
  const seenForPos = new Set();

  const re = /"ad_archive_id":"(\d+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!seenForPos.has(m[1])) {
      seenForPos.add(m[1]);
      allMatches.push({ id: m[1], index: m.index });
    }
  }

  const seenIds = new Set();

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

function findChromiumPath() {
  // 1) 인수로 받은 경로 사용
  if (preComputedPath && fs.existsSync(preComputedPath)) return preComputedPath;

  // 2) ms-playwright 디렉토리 탐색 (Windows / macOS / Linux)
  const bases = [
    process.env.LOCALAPPDATA || '',                    // Windows
    process.env.APPDATA || '',                         // Windows alt
    path.join(process.env.HOME || '', '.cache'),       // Linux/macOS
    path.join(process.env.HOME || '', 'Library', 'Caches'), // macOS
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
        path.join(playwrightDir, dir, 'chrome-headless-shell-mac', 'chrome-headless-shell'),
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
        path.join(playwrightDir, dir, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      ]) {
        if (fs.existsSync(exe)) return exe;
      }
    }
  }

  // 3) playwright 내장 경로 (설치 시 자동 설정)
  try { return chromium.executablePath(); } catch (_) { return ''; }
}

(async () => {
  let browser;
  try {
    const executablePath = findChromiumPath();
    if (!executablePath) {
      throw new Error(
        'Playwright Chromium을 찾을 수 없습니다. "npx playwright install chromium"을 실행하세요.\n' +
        'LOCALAPPDATA=' + (process.env.LOCALAPPDATA || '(없음)')
      );
    }

    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ko-KR',
      viewport: { width: 1280, height: 900 },
    });

    const page = await context.newPage();
    await page.route('**/*.{woff,woff2,ttf,png,jpg,jpeg,gif,webp,svg,ico,css,mp4,mp3,wav}', (route) => route.abort());
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1000);

    const html = await page.content();
    await browser.close();

    const ads = extractAdsFromHtml(html, limit * 4);
    process.stdout.write(JSON.stringify({ ads, total: ads.length }));
  } catch (err) {
    if (browser) await browser.close().catch(() => null);
    process.stdout.write(JSON.stringify({ error: String(err.message || err) }));
    process.exit(1);
  }
})();
