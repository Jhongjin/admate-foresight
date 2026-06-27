/**
 * lib/metaSync.ts
 *
 * Meta Marketing API → Supabase 직접 동기화
 *
 * 두 번의 Insights 호출:
 *   1) breakdowns=publisher_platform,platform_position,impression_device  → 노출위치
 *   2) breakdowns=age,gender                                              → 성별/연령
 * 한 번의 Creative 호출:
 *   3) /ads?fields=creative{object_type}                                  → 소재형태
 */

import { extractIndustry } from './xlsxLoader';
import {
  getForesightSupabaseUrl,
  getForesightSupabaseWriteKey,
} from './foresightSupabaseEnv';
import { maskIdentifier, sanitizeError } from './security';

const GRAPH_API = 'https://graph.facebook.com/v21.0';
const DEFAULT_SYNC_CHUNK_DAYS = 31;
export const MAX_SYNC_WINDOW_DAYS = 186;
export const DEFAULT_ACCOUNT_BATCH_LIMIT = 1;
export const MAX_ACCOUNT_BATCH_LIMIT = 10;

// ── 매핑 테이블 ──────────────────────────────────────────
const PLACEMENT_MAP: Record<string, Record<string, string>> = {
  facebook:         { feed: 'FB 피드', right_hand_column: 'FB 우측 컬럼', story: 'FB 스토리',
                      reels: 'FB 릴스', video_feeds: 'FB 동영상 피드', search: 'FB 검색',
                      marketplace: 'FB 마켓플레이스', groups_feed: 'FB 그룹 피드' },
  instagram:        { stream: 'IG 피드', story: 'IG 스토리', reels: 'IG 릴스',
                      explore: 'IG 탐색 탭', explore_home: 'IG 탐색 홈', profile_feed: 'IG 프로필 피드' },
  audience_network: { classic: 'AN 네이티브', rewarded_video: 'AN 리워드 동영상', instream_video: 'AN 인스트림' },
  messenger:        { messenger_home: 'MSG 홈', story: 'MSG 스토리', sponsored_messages: 'MSG 스폰서' },
};

const DEVICE_MAP: Record<string, string> = {
  desktop: 'PC', mobile_app: 'MO', mobile_web: 'MO', tablet: 'TB',
};

const OPT_GOAL_MAP: Record<string, string> = {
  NONE: '자동최적화',
  IMPRESSIONS: '노출', REACH: '도달', LINK_CLICKS: '링크클릭',
  LANDING_PAGE_VIEWS: '랜딩페이지조회', THRUPLAY: '스루플레이',
  TWO_SECOND_CONTINUOUS_VIDEO_VIEWS: '2초동영상조회',
  POST_ENGAGEMENT: '게시물참여', OFFSITE_CONVERSIONS: '전환',
  RETURN_ON_AD_SPEND: '광고수익률', LEAD_GENERATION: '리드',
  QUALITY_LEAD: '양질의리드', APP_INSTALLS: '앱설치',
  ENGAGED_USERS: '앱참여', VALUE: '구매가치', CONVERSATIONS: '대화',
  REPLIES: '답장', REMINDERS_SET: '리마인더설정',
  VISIT_INSTAGRAM_PROFILE: 'IG프로필방문',
};

const FORMAT_MAP: Record<string, string> = {
  SHARE: '이미지', LINK: '이미지', PHOTO: '이미지',
  VIDEO: '동영상', CAROUSEL: '슬라이드',
  COLLECTION: '컬렉션', STORE_CATALOG_SEGMENT: '컬렉션', CANVAS: '컬렉션',
  LEAD_GENERATION: '리드폼',
};

// ── 헬퍼 ────────────────────────────────────────────────
function buildPlacement(platform = '', position = '', device = ''): string {
  const base = PLACEMENT_MAP[platform]?.[position]
    ?? (platform && position ? `${platform}/${position}` : platform);
  const dev  = DEVICE_MAP[device] ?? '';
  return base && dev ? `${base} (${dev})` : base;
}

function actionVal(
  list: Array<{ action_type: string; value: string }> | undefined,
  type: string,
): number {
  return parseFloat(list?.find(a => a.action_type === type)?.value ?? '0') || 0;
}

function parseYmd(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function inclusiveDayCount(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function validateApprovedSyncDateWindow(
  since?: string,
  until?: string,
  maxDays = MAX_SYNC_WINDOW_DAYS,
): { ok: true; days: number } | { ok: false; error: string } {
  const start = parseYmd(since);
  const end = parseYmd(until);
  if (!since || !until) {
    return { ok: false, error: 'Execution requires explicit since and until dates.' };
  }
  if (!start || !end || start > end) {
    return { ok: false, error: 'Execution date range must be valid YYYY-MM-DD dates.' };
  }

  const days = inclusiveDayCount(start, end);
  if (days > maxDays) {
    return { ok: false, error: `Execution date range must be ${maxDays} days or less.` };
  }

  return { ok: true, days };
}

export function normalizeMetaAdAccountId(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const numeric = trimmed.startsWith('act_') ? trimmed.slice(4) : trimmed;
  if (!/^\d+$/.test(numeric)) return null;
  return `act_${numeric}`;
}

export function normalizeMetaAdAccountIds(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const id = normalizeMetaAdAccountId(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
}

export interface MetaAccountBatchSelection {
  accountIds: string[];
  accountTotal: number;
  accountOffset: number;
  accountLimit: number;
}

export function selectMetaAccountBatch(
  accountIds: readonly string[],
  accountOffset = 0,
  accountLimit = DEFAULT_ACCOUNT_BATCH_LIMIT,
): MetaAccountBatchSelection {
  const total = accountIds.length;
  const offset = Number.isInteger(accountOffset) && accountOffset > 0
    ? accountOffset
    : 0;
  const requestedLimit = Number.isInteger(accountLimit) && accountLimit > 0
    ? accountLimit
    : DEFAULT_ACCOUNT_BATCH_LIMIT;
  const limit = Math.min(requestedLimit, MAX_ACCOUNT_BATCH_LIMIT);

  return {
    accountIds: accountIds.slice(offset, offset + limit),
    accountTotal: total,
    accountOffset: offset,
    accountLimit: limit,
  };
}

export function buildSyncDateRanges(
  since?: string,
  until?: string,
  chunkDays = DEFAULT_SYNC_CHUNK_DAYS,
): Array<{ since?: string; until?: string }> {
  const start = parseYmd(since);
  const end = parseYmd(until);
  if (!start || !end || start > end || chunkDays < 1) {
    return [{ since, until }];
  }

  const ranges: Array<{ since: string; until: string }> = [];
  let cursor = start;
  while (cursor <= end) {
    const chunkEnd = addDays(cursor, chunkDays - 1);
    const boundedEnd = chunkEnd < end ? chunkEnd : end;
    ranges.push({ since: formatYmd(cursor), until: formatYmd(boundedEnd) });
    cursor = addDays(boundedEnd, 1);
  }

  return ranges;
}

/** Meta API 페이지네이션 전체 수집 */
async function fetchPages<T>(url: string): Promise<T[]> {
  const all: T[] = [];
  let next: string | null = url;

  while (next) {
    const res: Response = await fetch(next);
    const json: { data?: T[]; paging?: { next?: string }; error?: { message: string } } = await res.json();

    // 응답 구조 디버그 로그 (서버 콘솔에서 확인)
    if (!res.ok || json.error) {
      console.error('[metaSync] API error:', sanitizeError(JSON.stringify(json.error ?? json)));
      throw new Error(json.error?.message ?? `HTTP ${res.status}`);
    }

    console.log(`[metaSync] 페이지 수신: ${json.data?.length ?? 0}건`);
    all.push(...(json.data ?? []));
    next = json.paging?.next ?? null;
  }

  return all;
}

// ── 인사이트 행 타입 ─────────────────────────────────────
interface InsightRow {
  campaign_name: string;
  objective: string;
  optimization_goal?: string;
  publisher_platform?: string;
  platform_position?: string;
  impression_device?: string;
  age?: string;
  gender?: string;
  reach: string;
  impressions: string;
  spend: string;
  frequency: string;
  cpm: string;
  cpc: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  date_start: string;
}

interface SupabaseRow {
  업종: string; 캠페인이름: string; 목표: string; 최적화목표: string;
  노출위치: string; 소재형태: string; 성별: string; 연령: string;
  도달: number; 노출: number; 지출금액: number; 빈도: number;
  cpm: number; cpc: number; cpc_link: number; 영상조회수: number; 영상조회비용: number;
  날짜: string;
}

function toRow(
  r: InsightRow,
  overrides: Partial<SupabaseRow>,
): SupabaseRow {
  const optGoal = OPT_GOAL_MAP[r.optimization_goal ?? ''] ?? r.optimization_goal ?? '';
  return {
    업종: extractIndustry(r.campaign_name),
    캠페인이름:   r.campaign_name,
    목표:         r.objective,
    최적화목표:   optGoal,
    노출위치:     '',
    소재형태:     '',
    성별:         '',
    연령:         '',
    도달:         parseFloat(r.reach)       || 0,
    노출:         parseFloat(r.impressions) || 0,
    지출금액:     parseFloat(r.spend)       || 0,
    빈도:         parseFloat(r.frequency)   || 0,
    cpm:          parseFloat(r.cpm)         || 0,
    cpc:          parseFloat(r.cpc)         || 0,
    cpc_link:     actionVal(r.cost_per_action_type, 'link_click'),
    영상조회수:   actionVal(r.actions,             'video_view'),
    영상조회비용: actionVal(r.cost_per_action_type, 'video_view'),
    날짜:         r.date_start,
    ...overrides,
  };
}

// ── 비즈니스 하위 광고계정 목록 조회 ────────────────────
export async function fetchAdAccounts(businessId: string, accessToken: string): Promise<string[]> {
  const url = `${GRAPH_API}/${businessId}/owned_ad_accounts?fields=id&limit=200&access_token=${accessToken}`;
  try {
    const accounts = await fetchPages<{ id: string }>(url);
    if (accounts.length > 0) return accounts.map(a => a.id);
  } catch {
    // owned 실패 시 client 계정도 시도
  }
  const clientUrl = `${GRAPH_API}/${businessId}/client_ad_accounts?fields=id&limit=200&access_token=${accessToken}`;
  const clients = await fetchPages<{ id: string }>(clientUrl);
  return clients.map(a => a.id);
}

// ── 메인 동기화 함수 ─────────────────────────────────────
export interface SyncOptions {
  accessToken:  string;
  adAccountId?: string; // 단일 계정 (act_xxxxxxxxx 형식)
  adAccountIds?: string[]; // 명시 계정 목록
  businessId?:  string; // 비즈니스 ID → 하위 전체 계정 자동 조회
  datePreset?:  string; // 'last_30_days' | 'last_90_days' | ...
  since?:       string; // YYYY-MM-DD
  until?:       string; // YYYY-MM-DD
  chunkDays?:   number; // since/until 장기 범위 분할 단위
  accountOffset?: number; // business/adAccountIds 배치 시작 위치
  accountLimit?:  number; // business/adAccountIds 배치 크기
}

export interface SyncResult {
  inserted: number;
  errors:   string[];
  accounts: number;     // 처리된 광고계정 수
  accountTotal: number; // 선택 가능한 광고계정 수
  accountOffset: number;
  accountLimit: number;
}

// 단일 광고계정 동기화 내부 함수
async function syncOneAccount(accountId: string, accessToken: string, datePreset: string, since?: string, until?: string): Promise<{ rows: SupabaseRow[]; errors: string[] }> {
  const errors: string[] = [];
  const rows: SupabaseRow[] = [];

  const base = new URLSearchParams({
    access_token:   accessToken,
    level:          'campaign',
    time_increment: '1',
    limit:          '500',
    fields: [
      'campaign_name', 'objective', 'optimization_goal',
      'reach', 'impressions', 'spend', 'frequency', 'cpm', 'cpc',
      'actions', 'cost_per_action_type',
    ].join(','),
  });
  if (since && until) {
    base.set('time_range', JSON.stringify({ since, until }));
  } else {
    base.set('date_preset', datePreset);
  }

  // 1) 노출위치 breakdown
  try {
    const p = new URLSearchParams(base);
    p.set('breakdowns', 'publisher_platform,platform_position,impression_device');
    const data = await fetchPages<InsightRow>(`${GRAPH_API}/${accountId}/insights?${p}`);
    for (const r of data) {
      rows.push(toRow(r, {
        노출위치: buildPlacement(r.publisher_platform, r.platform_position, r.impression_device),
      }));
    }
    console.log(`[metaSync] ${maskIdentifier(accountId)} 노출위치 ${data.length}건`);
  } catch (e) { errors.push(`${maskIdentifier(accountId)} 노출위치 fetch 실패: ${sanitizeError(e)}`); }

  // 2) 성별/연령 breakdown
  try {
    const p = new URLSearchParams(base);
    p.set('breakdowns', 'age,gender');
    const data = await fetchPages<InsightRow>(`${GRAPH_API}/${accountId}/insights?${p}`);
    for (const r of data) {
      rows.push(toRow(r, { 성별: r.gender ?? '', 연령: r.age ?? '' }));
    }
    console.log(`[metaSync] ${maskIdentifier(accountId)} 성별/연령 ${data.length}건`);
  } catch (e) { errors.push(`${maskIdentifier(accountId)} 성별/연령 fetch 실패: ${sanitizeError(e)}`); }

  // 3) 소재형태
  try {
    const creativeUrl = `${GRAPH_API}/${accountId}/ads`
      + `?fields=campaign_id,campaign%7Bname%7D,creative%7Bobject_type%7D`
      + `&limit=500&access_token=${accessToken}`;
    const ads = await fetchPages<{ campaign?: { name: string }; creative?: { object_type: string } }>(creativeUrl);
    const fmtMap = new Map<string, string>();
    for (const ad of ads) {
      const name   = ad.campaign?.name ?? '';
      const format = FORMAT_MAP[ad.creative?.object_type ?? ''] ?? ad.creative?.object_type ?? '';
      if (name && format && !fmtMap.has(name)) fmtMap.set(name, format);
    }
    for (const row of rows) {
      if (!row.소재형태) row.소재형태 = fmtMap.get(row.캠페인이름) ?? '';
    }
  } catch (e) { errors.push(`${maskIdentifier(accountId)} 소재형태 fetch 실패 (fallback 빈값): ${sanitizeError(e)}`); }

  return { rows, errors };
}

export async function syncMetaToSupabase(opts: SyncOptions): Promise<SyncResult> {
  const { accessToken, datePreset = 'last_90_days', since, until } = opts;
  const dateRanges = since && until
    ? buildSyncDateRanges(since, until, opts.chunkDays ?? DEFAULT_SYNC_CHUNK_DAYS)
    : [{ since: undefined, until: undefined }];

  // 광고계정 목록 결정
  let accountIds: string[] = [];
  let accountTotal = 0;
  let accountOffset = 0;
  let accountLimit = 1;

  if (opts.adAccountIds && opts.adAccountIds.length > 0) {
    const normalized = normalizeMetaAdAccountIds(opts.adAccountIds);
    const explicitLimit = opts.accountLimit ?? Math.min(normalized.length, MAX_ACCOUNT_BATCH_LIMIT);
    const selection = selectMetaAccountBatch(normalized, opts.accountOffset, explicitLimit);
    accountIds = selection.accountIds;
    accountTotal = selection.accountTotal;
    accountOffset = selection.accountOffset;
    accountLimit = selection.accountLimit;
  } else if (opts.adAccountId) {
    const id = normalizeMetaAdAccountId(opts.adAccountId);
    accountIds = id ? [id] : [];
    accountTotal = accountIds.length;
    accountLimit = accountIds.length;
  } else if (opts.businessId) {
    console.log(`[metaSync] 비즈니스 ${maskIdentifier(opts.businessId)} 하위 계정 조회 중...`);
    const fetchedAccountIds = normalizeMetaAdAccountIds(await fetchAdAccounts(opts.businessId, accessToken));
    const selection = selectMetaAccountBatch(
      fetchedAccountIds,
      opts.accountOffset,
      opts.accountLimit ?? DEFAULT_ACCOUNT_BATCH_LIMIT,
    );
    accountIds = selection.accountIds;
    accountTotal = selection.accountTotal;
    accountOffset = selection.accountOffset;
    accountLimit = selection.accountLimit;
    console.log(
      `[metaSync] 광고계정 ${accountTotal}개 발견, 배치 ${accountOffset}~${accountOffset + accountIds.length}`,
    );
  } else {
    return {
      inserted: 0,
      errors: ['adAccountId 또는 businessId 필요'],
      accounts: 0,
      accountTotal: 0,
      accountOffset: 0,
      accountLimit: 0,
    };
  }

  if (accountIds.length === 0) {
    return {
      inserted: 0,
      errors: ['조회된 광고계정 없음'],
      accounts: 0,
      accountTotal,
      accountOffset,
      accountLimit,
    };
  }

  const allErrors: string[] = [];
  const allRows: SupabaseRow[] = [];

  // 계정별 순차 동기화
  for (const accountId of accountIds) {
    console.log(`[metaSync] 계정 동기화 시작: ${maskIdentifier(accountId)}`);
    let accountRows = 0;
    for (const range of dateRanges) {
      if (range.since && range.until && dateRanges.length > 1) {
        console.log(
          `[metaSync] ${maskIdentifier(accountId)} 청크 ${range.since}~${range.until}`,
        );
      }
      const { rows, errors } = await syncOneAccount(
        accountId,
        accessToken,
        datePreset,
        range.since,
        range.until,
      );
      accountRows += rows.length;
      allRows.push(...rows);
      allErrors.push(...errors);
    }
    console.log(`[metaSync] 계정 ${maskIdentifier(accountId)} 완료: ${accountRows}행`);
  }

  if (allRows.length === 0) {
    console.warn('[metaSync] 수집된 행 없음');
    return {
      inserted: 0,
      errors: allErrors,
      accounts: accountIds.length,
      accountTotal,
      accountOffset,
      accountLimit,
    };
  }

  // ── Supabase 저장 ────────────────────────────────────────
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    getForesightSupabaseUrl(),
    getForesightSupabaseWriteKey(),
  );

  let inserted = 0;
  const BATCH = 500;

  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    const { error } = await supabase.from('ad_data').insert(batch);
    if (error) {
      const msg = `Supabase insert 오류 (배치 ${i}~${i + batch.length}): ${error.message}`;
      console.error('[metaSync]', msg);
      allErrors.push(msg);
    } else {
      inserted += batch.length;
      console.log(`[metaSync] Supabase 저장: ${inserted}/${allRows.length}건`);
    }
  }

  return {
    inserted,
    errors: allErrors,
    accounts: accountIds.length,
    accountTotal,
    accountOffset,
    accountLimit,
  };
}
