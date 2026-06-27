import { NextRequest, NextResponse } from 'next/server';
import {
  MAX_ACCOUNT_BATCH_LIMIT,
  normalizeMetaAdAccountIds,
  syncMetaToSupabase,
  validateApprovedSyncDateWindow,
} from '@/lib/metaSync';
import { maskIdentifier, requireInternalKey, sanitizeError } from '@/lib/security';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
};

const OPERATION = 'meta_sync';
const MAX_EXECUTION_WINDOW_DAYS = 14;

interface MetaSyncRequestBody {
  operation?: string;
  dryRun?: boolean;
  execute?: boolean;
  reason?: string;
  datePreset?: string;
  since?: string;
  until?: string;
  adAccountId?: string;
  adAccountIds?: string[];
  businessId?: string;
  accountOffset?: number | string;
  accountLimit?: number | string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function withNoStore(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

function isEnabled(name: string): boolean {
  return process.env[name] === 'true';
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function cleanStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(cleanString)
    .filter((item): item is string => Boolean(item));
}

function cleanInteger(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

function wasProvided(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

/**
 * POST /api/meta-sync
 *
 * Body (선택):
 *   { since?: string, until?: string, accountOffset?: number, accountLimit?: number }
 *
 * dry-run은 기본값이며 Meta API/DB를 호출하지 않는다.
 * 실행 시에는 execute=true, reason, 명시 since/until, write-enabled env가 모두 필요하다.
 * HTTP 실행 단위는 함수 timeout/중복 위험을 줄이기 위해 짧은 날짜 배치로 제한한다.
 */
export async function POST(req: NextRequest) {
  const blocked = requireInternalKey(req);
  if (blocked) return withNoStore(blocked);

  const body = await req.json().catch(() => ({})) as MetaSyncRequestBody;
  const operation = cleanString(body.operation) ?? OPERATION;
  if (operation !== OPERATION) {
    return jsonResponse({ error: 'Invalid operation.' }, 400);
  }

  const dryRun = body.dryRun !== false;
  if (dryRun) {
    return jsonResponse({
      status: 'dry_run',
      operation: OPERATION,
      dryRun: true,
      executionEnabled: false,
      wouldCallMetaApi: false,
      wouldWriteDb: false,
    });
  }

  const reason = cleanString(body.reason);
  if (body.execute !== true || !reason) {
    return jsonResponse({ error: 'Execution requires explicit approval.' }, 403);
  }

  if (!isEnabled('FORESIGHT_META_SYNC_WRITE_ENABLED')) {
    return jsonResponse({ error: 'Meta sync execution is disabled.' }, 403);
  }

  const dateWindow = validateApprovedSyncDateWindow(body.since, body.until, MAX_EXECUTION_WINDOW_DAYS);
  if (!dateWindow.ok) {
    return jsonResponse({ error: dateWindow.error }, 400);
  }

  const accountOffset = cleanInteger(body.accountOffset);
  if (wasProvided(body.accountOffset) && accountOffset === undefined) {
    return jsonResponse({ error: 'accountOffset must be a non-negative integer.' }, 400);
  }

  const accountLimit = cleanInteger(body.accountLimit);
  if (wasProvided(body.accountLimit) && accountLimit === undefined) {
    return jsonResponse({ error: 'accountLimit must be a positive integer.' }, 400);
  }
  if (accountLimit !== undefined && (accountLimit < 1 || accountLimit > MAX_ACCOUNT_BATCH_LIMIT)) {
    return jsonResponse({ error: `accountLimit must be between 1 and ${MAX_ACCOUNT_BATCH_LIMIT}.` }, 400);
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const envAccountId = process.env.META_AD_ACCOUNT_ID;
  const envBusinessId = process.env.META_BUSINESS_ID;
  const requestedAdAccountIds = normalizeMetaAdAccountIds(cleanStringList(body.adAccountIds));

  if (!accessToken) {
    return jsonResponse({ error: 'Meta sync is not configured.' }, 503);
  }

  if (Array.isArray(body.adAccountIds) && body.adAccountIds.length > 0 && requestedAdAccountIds.length === 0) {
    return jsonResponse({ error: 'adAccountIds must contain valid Meta ad account IDs.' }, 400);
  }

  const requestedAdAccountId = cleanString(body.adAccountId);
  const requestedBusinessId = cleanString(body.businessId);
  const adAccountId = requestedAdAccountIds.length > 0
    ? undefined
    : requestedBusinessId
      ? undefined
      : requestedAdAccountId ?? (envBusinessId ? undefined : envAccountId);
  const businessId = requestedAdAccountIds.length > 0 || requestedAdAccountId
    ? undefined
    : requestedBusinessId ?? envBusinessId;

  if (!adAccountId && !businessId && requestedAdAccountIds.length === 0) {
    return jsonResponse({ error: 'Meta sync target is not configured.' }, 503);
  }

  console.log('[meta-sync] requested:', {
    adAccountId: maskIdentifier(adAccountId),
    adAccountIds: requestedAdAccountIds.length,
    businessId:  maskIdentifier(businessId),
    since:       body.since,
    until:       body.until,
    days:        dateWindow.days,
    accountOffset,
    accountLimit,
    overrideAccount: !!body.adAccountId,
    overrideAccountList: requestedAdAccountIds.length > 0,
    overrideBusiness: !!body.businessId,
  });

  try {
    const result = await syncMetaToSupabase({
      accessToken,
      adAccountId,
      adAccountIds: requestedAdAccountIds,
      businessId,
      datePreset: body.datePreset,
      since:      body.since,
      until:      body.until,
      accountOffset,
      accountLimit,
    });

    console.log('[meta-sync] completed:', {
      inserted: result.inserted,
      collected: result.collected,
      skippedDuplicates: result.skippedDuplicates,
      accounts: result.accounts,
      accountTotal: result.accountTotal,
      accountOffset: result.accountOffset,
      accountLimit: result.accountLimit,
      errors: result.errors.length,
      rollbackPolicy: result.rollbackPolicy,
    });
    return jsonResponse({
      status: 'execution_completed',
      operation: OPERATION,
      inserted: result.inserted,
      collected: result.collected,
      skippedDuplicates: result.skippedDuplicates,
      accounts: result.accounts,
      accountTotal: result.accountTotal,
      accountOffset: result.accountOffset,
      accountLimit: result.accountLimit,
      errorCount: result.errors.length,
      rollbackPolicy: result.rollbackPolicy,
    });
  } catch (e) {
    console.error('[meta-sync] failed:', sanitizeError(e));
    return jsonResponse({ error: 'Meta sync failed.' }, 500);
  }
}
