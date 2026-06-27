#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const DEFAULT_BASE_URL = 'https://foresight.admate.ai.kr';
const MAX_WINDOW_DAYS = 14;

const args = new Set(process.argv.slice(2));
const values = parseValues(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  printUsage();
  process.exit(0);
}

const apply = args.has('--apply');
const refreshAggregates = args.has('--refresh-aggregates');
const insecureTls = args.has('--insecure-tls');
const since = values.since;
const until = values.until;
const baseUrl = (values['base-url'] || DEFAULT_BASE_URL).replace(/\/$/, '');
const accountId = values['account-id'] || process.env.FORESIGHT_META_SYNC_ACCOUNT_ID || '';
const internalKey = process.env.FORESIGHT_INTERNAL_KEY || '';
const reasonPrefix = values['reason-prefix'] || 'batch sync live account';

if (!apply) {
  fail('missing --apply. This runner calls the production sync endpoint.');
}

if (!since || !until) {
  fail('missing required --since and --until dates');
}

if (!internalKey) {
  fail('FORESIGHT_INTERNAL_KEY environment variable is required');
}

if (!accountId) {
  fail('missing --account-id or FORESIGHT_META_SYNC_ACCOUNT_ID environment variable');
}

const windows = buildInclusiveWindows(since, until, MAX_WINDOW_DAYS);
const summary = {
  windows: windows.length,
  inserted: 0,
  collected: 0,
  skippedDuplicates: 0,
  errorCount: 0,
};

console.log(`[foresight-meta-sync-runner] baseUrl=${baseUrl}`);
console.log(`[foresight-meta-sync-runner] account=${maskIdentifier(accountId)} windows=${windows.length}`);
console.log(`[foresight-meta-sync-runner] refreshAggregates=${refreshAggregates}`);

for (const window of windows) {
  console.log(`[foresight-meta-sync-runner] sync ${window.since} -> ${window.until}`);
  const response = await callMetaSync({
    baseUrl,
    internalKey,
    body: {
      dryRun: false,
      execute: true,
      reason: `${reasonPrefix}: ${window.since} to ${window.until}`,
      since: window.since,
      until: window.until,
      adAccountIds: [accountId],
    },
    insecureTls,
  });

  if (response.status !== 'execution_completed') {
    throw new Error(`unexpected sync status for ${window.since} -> ${window.until}: ${response.status}`);
  }

  const inserted = numberValue(response.inserted);
  const collected = numberValue(response.collected);
  const skippedDuplicates = numberValue(response.skippedDuplicates);
  const errorCount = numberValue(response.errorCount);
  summary.inserted += inserted;
  summary.collected += collected;
  summary.skippedDuplicates += skippedDuplicates;
  summary.errorCount += errorCount;

  console.log(
    `[foresight-meta-sync-runner] result inserted=${inserted} collected=${collected} skippedDuplicates=${skippedDuplicates} errorCount=${errorCount}`,
  );

  if (errorCount > 0) {
    throw new Error(`sync reported ${errorCount} errors for ${window.since} -> ${window.until}`);
  }

  if (refreshAggregates) {
    refreshDailyAggregateWindows(window.since, addDaysYmd(window.until, 1), insecureTls);
  }
}

console.log('[foresight-meta-sync-runner] completed');
console.log(JSON.stringify(summary, null, 2));

async function callMetaSync({ baseUrl, internalKey, body, insecureTls }) {
  if (insecureTls) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const res = await fetch(`${baseUrl}/api/meta-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admate-internal-key': internalKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`sync returned non-json response ${res.status}: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`sync failed ${res.status}: ${JSON.stringify(parsed).slice(0, 300)}`);
  }

  return parsed;
}

function refreshDailyAggregateWindows(startInclusive, endExclusive, insecureTls) {
  let cursor = parseDate(startInclusive, 'refresh start');
  const end = parseDate(endExclusive, 'refresh end');

  while (cursor < end) {
    const dayStart = formatDate(cursor);
    const dayEnd = formatDate(addDays(cursor, 1));
    console.log(`[foresight-meta-sync-runner] refresh aggregates ${dayStart} -> ${dayEnd}`);

    const child = spawnSync(process.execPath, [
      join('scripts', 'refresh-foresight-aggregate-caches.mjs'),
      '--since',
      dayStart,
      '--until',
      dayEnd,
      '--apply',
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...(insecureTls ? { NODE_TLS_REJECT_UNAUTHORIZED: '0' } : {}),
      },
      encoding: 'utf8',
      stdio: 'inherit',
    });

    if (child.status !== 0) {
      throw new Error(`aggregate refresh failed for ${dayStart} -> ${dayEnd}`);
    }

    cursor = addDays(cursor, 1);
  }
}

function buildInclusiveWindows(since, until, maxDays) {
  const start = parseDate(since, '--since');
  const end = parseDate(until, '--until');
  if (start > end) {
    fail('--since must be on or before --until');
  }

  const windows = [];
  let cursor = start;
  while (cursor <= end) {
    const chunkEnd = minDate(addDays(cursor, maxDays - 1), end);
    windows.push({
      since: formatDate(cursor),
      until: formatDate(chunkEnd),
    });
    cursor = addDays(chunkEnd, 1);
  }
  return windows;
}

function parseValues(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    if (!rawKey || ['apply', 'help', 'refresh-aggregates', 'insecure-tls'].includes(rawKey)) continue;

    const value = inlineValue ?? argv[i + 1];
    if (!value || value.startsWith('--')) {
      fail(`missing value for --${rawKey}`);
    }

    parsed[rawKey] = value;
    if (inlineValue === undefined) i += 1;
  }
  return parsed;
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

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addDaysYmd(value, days) {
  return formatDate(addDays(parseDate(value, 'date'), days));
}

function minDate(a, b) {
  return a < b ? a : b;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function maskIdentifier(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 6) return '***';
  return `${trimmed.slice(0, 3)}***${trimmed.slice(-2)}`;
}

function printUsage() {
  console.log(`Usage:
  FORESIGHT_INTERNAL_KEY=... FORESIGHT_META_SYNC_ACCOUNT_ID=act_... npm run run:meta-sync-batches -- --since 2026-01-15 --until 2026-06-23 --apply

Options:
  --since YYYY-MM-DD          Inclusive sync start date
  --until YYYY-MM-DD          Inclusive sync end date
  --account-id act_...        Meta ad account ID. Defaults to FORESIGHT_META_SYNC_ACCOUNT_ID
  --base-url URL              Defaults to ${DEFAULT_BASE_URL}
  --reason-prefix TEXT        Audit reason prefix for each sync call
  --refresh-aggregates        Refresh aggregate caches one day at a time after each successful sync window
  --insecure-tls              Set NODE_TLS_REJECT_UNAUTHORIZED=0 for local certificate-chain issues
  --apply                     Required. Executes production sync calls`);
}

function fail(message) {
  console.error(`[foresight-meta-sync-runner] ${message}`);
  printUsage();
  process.exit(1);
}
