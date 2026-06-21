#!/usr/bin/env node
import { URL } from 'node:url';

const MONTHLY_REFRESH_RPC = 'refresh_foresight_monthly_aggregates_window';
const DEMOGRAPHIC_REFRESH_RPC = 'refresh_foresight_demographic_aggregates_window';
const MONTHLY_COUNT_RPC = 'get_monthly_aggregates_fast_count';
const DEMOGRAPHIC_COUNT_RPC = 'get_demographic_aggregates_fast_count';

const args = new Set(process.argv.slice(2));
const values = parseValues(process.argv.slice(2));

const since = values.since;
const until = values.until;
const kind = values.kind ?? 'both';
const apply = args.has('--apply');

if (args.has('--help') || args.has('-h')) {
  printUsage();
  process.exit(0);
}

if (!since || !until) {
  fail('missing required --since and --until date arguments');
}

if (!['monthly', 'demographic', 'both'].includes(kind)) {
  fail(`invalid --kind "${kind}". Expected monthly, demographic, or both`);
}

const windows = buildMonthWindows(since, until);
const refreshRpcs = kind === 'both'
  ? [MONTHLY_REFRESH_RPC, DEMOGRAPHIC_REFRESH_RPC]
  : kind === 'monthly'
    ? [MONTHLY_REFRESH_RPC]
    : [DEMOGRAPHIC_REFRESH_RPC];

if (!apply) {
  console.log('[foresight-cache-refresh] dry run');
  console.log('[foresight-cache-refresh] add --apply to execute refresh RPCs');
  console.log(`[foresight-cache-refresh] kind=${kind} windows=${windows.length}`);
  for (const [start, end] of windows) {
    console.log(`[foresight-cache-refresh] ${start} -> ${end}: ${refreshRpcs.join(', ')}`);
  }
  process.exit(0);
}

const supabaseUrl =
  process.env.FORESIGHT_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_FORESIGHT_SUPABASE_URL ||
  '';
const serviceRoleKey = process.env.FORESIGHT_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  fail('FORESIGHT_SUPABASE_URL is required for --apply');
}

if (!serviceRoleKey) {
  fail('FORESIGHT_SUPABASE_SERVICE_ROLE_KEY is required for --apply');
}

const host = new URL(supabaseUrl).host;
console.log(`[foresight-cache-refresh] applying kind=${kind} windows=${windows.length} host=${host}`);

for (const [start, end] of windows) {
  for (const rpc of refreshRpcs) {
    const result = await callRpc(supabaseUrl, serviceRoleKey, rpc, {
      p_start_date: start,
      p_end_date: end,
    });
    console.log(`[foresight-cache-refresh] ${rpc} ${start} -> ${end}: ${result}`);
  }
}

if (kind === 'monthly' || kind === 'both') {
  const count = await callRpc(supabaseUrl, serviceRoleKey, MONTHLY_COUNT_RPC, {});
  console.log(`[foresight-cache-refresh] ${MONTHLY_COUNT_RPC}: ${count}`);
}

if (kind === 'demographic' || kind === 'both') {
  const count = await callRpc(supabaseUrl, serviceRoleKey, DEMOGRAPHIC_COUNT_RPC, {});
  console.log(`[foresight-cache-refresh] ${DEMOGRAPHIC_COUNT_RPC}: ${count}`);
}

function parseValues(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    if (!rawKey || rawKey === 'apply' || rawKey === 'help') continue;

    const value = inlineValue ?? argv[i + 1];
    if (!value || value.startsWith('--')) {
      fail(`missing value for --${rawKey}`);
    }

    parsed[rawKey] = value;
    if (inlineValue === undefined) i += 1;
  }
  return parsed;
}

function buildMonthWindows(start, end) {
  const startDate = parseDate(start, '--since');
  const endDate = parseDate(end, '--until');

  if (startDate >= endDate) {
    fail('--since must be earlier than --until');
  }

  const windows = [];
  let cursor = startDate;
  while (cursor < endDate) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const windowEnd = next < endDate ? next : endDate;
    windows.push([formatDate(cursor), formatDate(windowEnd)]);
    cursor = windowEnd;
  }
  return windows;
}

function parseDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${label} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || formatDate(date) !== value) {
    fail(`${label} is not a valid calendar date`);
  }

  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

async function callRpc(baseUrl, key, rpc, body) {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${rpc} failed with ${response.status}: ${text.slice(0, 500)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function printUsage() {
  console.log(`Usage:
  npm run refresh:foresight-aggregate-caches -- --since 2026-03-01 --until 2026-04-01
  npm run refresh:foresight-aggregate-caches -- --since 2026-03-01 --until 2026-04-01 --kind monthly --apply

Options:
  --since YYYY-MM-DD      Inclusive start date
  --until YYYY-MM-DD      Exclusive end date
  --kind both|monthly|demographic
  --apply                Execute RPC calls. Omit for dry run.`);
}

function fail(message) {
  console.error(`[foresight-cache-refresh] ${message}`);
  printUsage();
  process.exit(1);
}
