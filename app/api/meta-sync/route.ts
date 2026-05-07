import { NextRequest, NextResponse } from 'next/server';
import { syncMetaToSupabase } from '@/lib/metaSync';
import { maskIdentifier, requireInternalKey, sanitizeError } from '@/lib/security';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
};

const OPERATION = 'meta_sync';

interface MetaSyncRequestBody {
  operation?: string;
  dryRun?: boolean;
  execute?: boolean;
  reason?: string;
  datePreset?: string;
  since?: string;
  until?: string;
  adAccountId?: string;
  businessId?: string;
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

/**
 * POST /api/meta-sync
 *
 * Body (선택):
 *   { datePreset?: string, since?: string, until?: string }
 *
 * 예) 최근 90일:  POST /api/meta-sync
 * 예) 특정 범위:  POST /api/meta-sync  { "since": "2025-01-01", "until": "2025-03-31" }
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

  const accessToken = process.env.META_ACCESS_TOKEN;
  const envAccountId = process.env.META_AD_ACCOUNT_ID;
  const envBusinessId = process.env.META_BUSINESS_ID;

  if (!accessToken) {
    return jsonResponse({ error: 'Meta sync is not configured.' }, 503);
  }
  if (!envAccountId && !envBusinessId) {
    return jsonResponse({ error: 'Meta sync target is not configured.' }, 503);
  }

  const adAccountId = body.adAccountId ?? envAccountId;
  const businessId  = body.businessId  ?? envBusinessId;

  console.log('[meta-sync] requested:', {
    adAccountId: maskIdentifier(adAccountId),
    businessId:  maskIdentifier(businessId),
    datePreset:  body.datePreset,
    since:       body.since,
    until:       body.until,
    overrideAccount: !!body.adAccountId,
    overrideBusiness: !!body.businessId,
  });

  try {
    const result = await syncMetaToSupabase({
      accessToken,
      adAccountId,
      businessId,
      datePreset: body.datePreset,
      since:      body.since,
      until:      body.until,
    });

    console.log('[meta-sync] completed:', {
      inserted: result.inserted,
      accounts: result.accounts,
      errors: result.errors.length,
    });
    return jsonResponse({
      status: 'execution_completed',
      operation: OPERATION,
      inserted: result.inserted,
      accounts: result.accounts,
      errorCount: result.errors.length,
    });
  } catch (e) {
    console.error('[meta-sync] failed:', sanitizeError(e));
    return jsonResponse({ error: 'Meta sync failed.' }, 500);
  }
}
