import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROUTES = [
  join(process.cwd(), 'app', 'api', 'meta-ads', 'route.ts'),
  join(process.cwd(), 'app', 'api', 'google-ads', 'route.ts'),
  join(process.cwd(), 'app', 'api', 'meta-ads-scrape', 'route.ts'),
];

const FORBIDDEN_PROVIDER_DETAIL_SNIPPETS = [
  'status: res.status',
  'status: response.status',
  'HTTP ${res.status}',
  'HTTP ${response.status}',
  'data.error?.message',
  'response.statusText',
  'response.text()',
  'return blocked;',
  'return requireInternalKey(req)',
];

function readRouteSource(path: string) {
  return readFileSync(path, 'utf8');
}

describe('external lookup fail-closed contract', () => {
  it('keeps external lookup routes on no-store bounded responses', () => {
    for (const route of ROUTES) {
      const source = readRouteSource(route);

      expect(source).toContain('noStoreJson(');
      expect(source).toContain('External ads lookup failed.');
      expect(source).not.toMatch(/status\s*:\s*(res|response)\.status/);

      for (const snippet of FORBIDDEN_PROVIDER_DETAIL_SNIPPETS) {
        expect(source).not.toContain(snippet);
      }
    }
  });

  it('keeps Meta configuration failures fixed to 503 configured copy', () => {
    for (const route of [
      join(process.cwd(), 'app', 'api', 'meta-ads', 'route.ts'),
      join(process.cwd(), 'app', 'api', 'meta-ads-scrape', 'route.ts'),
    ]) {
      const source = readRouteSource(route);

      expect(source).toContain('External ads lookup is not configured.');
      expect(source).toContain('{ status: 503 }');
    }
  });

  it('does not pass raw internal-key gate responses through the public lookup route', () => {
    const source = readRouteSource(
      join(process.cwd(), 'app', 'api', 'meta-ads-scrape', 'route.ts'),
    );

    expect(source).toContain('requireInternalKey(req)');
    expect(source).toContain('Playwright fallback blocked for public production request');
    expect(source).not.toContain('return blocked;');
  });

  it('keeps external lookup success URLs behind explicit allowlist helpers', () => {
    const metaSource = readRouteSource(
      join(process.cwd(), 'app', 'api', 'meta-ads', 'route.ts'),
    );
    const scrapeSource = readRouteSource(
      join(process.cwd(), 'app', 'api', 'meta-ads-scrape', 'route.ts'),
    );
    const googleSource = readRouteSource(
      join(process.cwd(), 'app', 'api', 'google-ads', 'route.ts'),
    );

    expect(metaSource).toContain('function safeMetaSnapshotUrl');
    expect(metaSource).toContain('ad_snapshot_url: safeMetaSnapshotUrl');
    expect(metaSource).toContain('^\\d{1,32}$');
    expect(scrapeSource).toContain('function safeMetaExternalUrl');
    expect(scrapeSource).toContain('function safeMetaSnapshotUrl');
    expect(scrapeSource).toContain('snapshot_url:  safeMetaSnapshotUrl');
    expect(scrapeSource).toContain('image_url: safeMetaExternalUrl(imageUrl)');
    expect(scrapeSource).toContain('profile_image: safeMetaExternalUrl(profileImage)');
    expect(googleSource).toContain('function safeExternalUrl');
    expect(googleSource).toContain('imageUrl: safeExternalUrl');
    expect(googleSource).toContain('previewUrl: safeExternalUrl');
  });

  it('keeps external lookup keyword maps aligned with canonical Foresight industries', () => {
    for (const route of ROUTES) {
      const source = readRouteSource(route);

      expect(source).toContain("'의약/건강식'");
      expect(source).toContain("'관광/레저'");
      expect(source).toContain("'수송'");
      expect(source).toContain("'전자'");
      expect(source).toContain("'방송통신'");
    }
  });

  it('keeps the competitor UI from rendering token-like lookup text or raw error bodies', () => {
    const source = readFileSync(
      join(process.cwd(), 'app', 'competitor', 'CompetitorPageClient.tsx'),
      'utf8',
    );

    expect(source).toContain('readJsonOrNull');
    expect(source).toContain('toDisplaySafeLookupText');
    expect(source).toContain("'의약/건강식'");
    expect(source).toContain("'관광/레저'");
    expect(source).toContain("'엔터테인먼트'");
    expect(source).not.toContain("'의약/건기식'");
    expect(source).not.toContain('const data = await res.json()');
    expect(source).not.toContain('response.statusText');
  });
});
