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

const GRAPH_API = 'https://graph.facebook.com/v21.0';

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

/** Meta API 페이지네이션 전체 수집 */
async function fetchPages<T>(url: string): Promise<T[]> {
  const all: T[] = [];
  let next: string | null = url;

  while (next) {
    const res: Response = await fetch(next);
    const json: { data?: T[]; paging?: { next?: string }; error?: { message: string } } = await res.json();

    // 응답 구조 디버그 로그 (서버 콘솔에서 확인)
    if (!res.ok || json.error) {
      console.error('[metaSync] API 오류:', JSON.stringify(json.error ?? json));
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
    업종: '',
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

// ── 메인 동기화 함수 ─────────────────────────────────────
export interface SyncOptions {
  accessToken:  string;
  adAccountId:  string; // act_xxxxxxxxx 형식
  datePreset?:  string; // 'last_30_days' | 'last_90_days' | ...
  since?:       string; // YYYY-MM-DD
  until?:       string; // YYYY-MM-DD
}

export interface SyncResult {
  inserted: number;
  errors:   string[];
}

export async function syncMetaToSupabase(opts: SyncOptions): Promise<SyncResult> {
  const { accessToken, datePreset = 'last_90_days', since, until } = opts;
  const accountId = opts.adAccountId.startsWith('act_')
    ? opts.adAccountId
    : `act_${opts.adAccountId}`;

  const errors: string[] = [];
  const rows: SupabaseRow[] = [];

  // 공통 파라미터
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

  // ── 1) 노출위치 breakdown ──────────────────────────────
  console.log('[metaSync] 노출위치 breakdown 요청 시작');
  try {
    const p = new URLSearchParams(base);
    p.set('breakdowns', 'publisher_platform,platform_position,impression_device');
    const data = await fetchPages<InsightRow>(`${GRAPH_API}/${accountId}/insights?${p}`);
    console.log('[metaSync] 노출위치 원본 샘플:', JSON.stringify(data[0] ?? {}));

    for (const r of data) {
      rows.push(toRow(r, {
        노출위치: buildPlacement(r.publisher_platform, r.platform_position, r.impression_device),
      }));
    }
    console.log(`[metaSync] 노출위치 행 수집: ${data.length}건`);
  } catch (e) {
    const msg = `노출위치 fetch 실패: ${e}`;
    console.error('[metaSync]', msg);
    errors.push(msg);
  }

  // ── 2) 성별/연령 breakdown ─────────────────────────────
  console.log('[metaSync] 성별/연령 breakdown 요청 시작');
  try {
    const p = new URLSearchParams(base);
    p.set('breakdowns', 'age,gender');
    const data = await fetchPages<InsightRow>(`${GRAPH_API}/${accountId}/insights?${p}`);
    console.log('[metaSync] 성별/연령 원본 샘플:', JSON.stringify(data[0] ?? {}));

    for (const r of data) {
      rows.push(toRow(r, {
        성별: r.gender ?? '',
        연령: r.age    ?? '',
      }));
    }
    console.log(`[metaSync] 성별/연령 행 수집: ${data.length}건`);
  } catch (e) {
    const msg = `성별/연령 fetch 실패: ${e}`;
    console.error('[metaSync]', msg);
    errors.push(msg);
  }

  // ── 3) 소재형태 (Ad Creative) ──────────────────────────
  console.log('[metaSync] 소재형태 요청 시작');
  try {
    const creativeUrl = `${GRAPH_API}/${accountId}/ads`
      + `?fields=campaign_id,campaign%7Bname%7D,creative%7Bobject_type%7D`
      + `&limit=500&access_token=${accessToken}`;

    const ads = await fetchPages<{
      campaign?: { name: string };
      creative?: { object_type: string };
    }>(creativeUrl);

    console.log('[metaSync] 소재 원본 샘플:', JSON.stringify(ads[0] ?? {}));

    // 캠페인명 → 소재형태 맵 (첫 번째 hit 사용)
    const fmtMap = new Map<string, string>();
    for (const ad of ads) {
      const name   = ad.campaign?.name ?? '';
      const format = FORMAT_MAP[ad.creative?.object_type ?? ''] ?? ad.creative?.object_type ?? '';
      if (name && format && !fmtMap.has(name)) fmtMap.set(name, format);
    }

    for (const row of rows) {
      if (!row.소재형태) {
        row.소재형태 = fmtMap.get(row.캠페인이름) ?? '';
      }
    }
    console.log(`[metaSync] 소재형태 매핑 완료: ${fmtMap.size}개 캠페인`);
  } catch (e) {
    // 소재 API 실패해도 전체 중단 없이 진행
    const msg = `소재형태 fetch 실패 (fallback 빈값): ${e}`;
    console.warn('[metaSync]', msg);
    errors.push(msg);
  }

  if (rows.length === 0) {
    console.warn('[metaSync] 수집된 행 없음');
    return { inserted: 0, errors };
  }

  // ── 4) Supabase 저장 ───────────────────────────────────
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY
      ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ?? process.env.SUPABASE_ANON_KEY)!,
  );

  let inserted = 0;
  const BATCH = 500;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('ad_data').insert(batch);
    if (error) {
      const msg = `Supabase insert 오류 (배치 ${i}~${i + batch.length}): ${error.message}`;
      console.error('[metaSync]', msg);
      errors.push(msg);
    } else {
      inserted += batch.length;
      console.log(`[metaSync] Supabase 저장: ${inserted}/${rows.length}건`);
    }
  }

  return { inserted, errors };
}
