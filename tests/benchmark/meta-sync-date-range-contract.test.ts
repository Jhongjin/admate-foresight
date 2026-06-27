import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ACCOUNT_BATCH_LIMIT,
  MAX_ACCOUNT_BATCH_LIMIT,
  buildSyncDateRanges,
  buildSupabaseRowFingerprint,
  filterDuplicateSupabaseRows,
  normalizeMetaAdAccountId,
  normalizeMetaAdAccountIds,
  selectMetaAccountBatch,
  type SupabaseRow,
  validateApprovedSyncDateWindow,
} from '../../lib/metaSync';

describe('meta sync date range chunk contract', () => {
  it('splits long approved date ranges into bounded sequential chunks', () => {
    expect(buildSyncDateRanges('2026-01-01', '2026-03-15', 31)).toEqual([
      { since: '2026-01-01', until: '2026-01-31' },
      { since: '2026-02-01', until: '2026-03-03' },
      { since: '2026-03-04', until: '2026-03-15' },
    ]);
  });

  it('keeps single short ranges unchanged', () => {
    expect(buildSyncDateRanges('2026-02-01', '2026-02-28', 31)).toEqual([
      { since: '2026-02-01', until: '2026-02-28' },
    ]);
  });

  it('does not invent dates for invalid operator input', () => {
    expect(buildSyncDateRanges('bad-date', '2026-02-28', 31)).toEqual([
      { since: 'bad-date', until: '2026-02-28' },
    ]);
    expect(buildSyncDateRanges('2026-03-01', '2026-02-28', 31)).toEqual([
      { since: '2026-03-01', until: '2026-02-28' },
    ]);
  });

  it('requires explicit approved execution windows within the 6 month cap', () => {
    expect(validateApprovedSyncDateWindow(undefined, '2026-02-28').ok).toBe(false);
    expect(validateApprovedSyncDateWindow('2026-03-01', '2026-02-28').ok).toBe(false);
    expect(validateApprovedSyncDateWindow('2026-01-01', '2026-07-05')).toEqual({
      ok: true,
      days: 186,
    });
    expect(validateApprovedSyncDateWindow('2026-01-01', '2026-07-06').ok).toBe(false);
  });

  it('supports shorter HTTP execution windows for serverless sync batches', () => {
    expect(validateApprovedSyncDateWindow('2026-01-01', '2026-01-14', 14)).toEqual({
      ok: true,
      days: 14,
    });
    expect(validateApprovedSyncDateWindow('2026-01-01', '2026-01-15', 14).ok).toBe(false);
  });

  it('normalizes and deduplicates explicit Meta ad account IDs', () => {
    expect(normalizeMetaAdAccountId('1234567890')).toBe('act_1234567890');
    expect(normalizeMetaAdAccountId('act_9876543210')).toBe('act_9876543210');
    expect(normalizeMetaAdAccountId('act_not_numeric')).toBeNull();
    expect(normalizeMetaAdAccountIds(['123', 'act_123', ' 456 ', 'bad'])).toEqual([
      'act_123',
      'act_456',
    ]);
  });

  it('selects bounded ad account batches for business portfolio syncs', () => {
    const accounts = Array.from({ length: 12 }, (_, index) => `act_${index + 1}`);

    expect(selectMetaAccountBatch(accounts)).toEqual({
      accountIds: accounts.slice(0, DEFAULT_ACCOUNT_BATCH_LIMIT),
      accountTotal: 12,
      accountOffset: 0,
      accountLimit: DEFAULT_ACCOUNT_BATCH_LIMIT,
    });

    expect(selectMetaAccountBatch(accounts, 2, 3)).toEqual({
      accountIds: ['act_3', 'act_4', 'act_5'],
      accountTotal: 12,
      accountOffset: 2,
      accountLimit: 3,
    });

    const capped = selectMetaAccountBatch(accounts, 0, MAX_ACCOUNT_BATCH_LIMIT + 5);
    expect(capped.accountIds).toHaveLength(MAX_ACCOUNT_BATCH_LIMIT);
    expect(capped.accountLimit).toBe(MAX_ACCOUNT_BATCH_LIMIT);
  });

  it('builds stable exact-row fingerprints for legacy duplicate guards', () => {
    const row: SupabaseRow = {
      업종: '식음료',
      캠페인이름: 'campaign',
      목표: 'REACH',
      최적화목표: '도달',
      노출위치: 'FB 피드',
      소재형태: '이미지',
      성별: '',
      연령: '',
      도달: 10,
      노출: 20,
      지출금액: 30,
      빈도: 2,
      cpm: 1500,
      cpc: 0,
      cpc_link: 0,
      영상조회수: 0,
      영상조회비용: 0,
      날짜: '2026-01-01',
    };

    expect(buildSupabaseRowFingerprint(row)).toBe(
      buildSupabaseRowFingerprint({ ...row, 도달: '10' as unknown as number }),
    );
    expect(buildSupabaseRowFingerprint(row)).not.toBe(
      buildSupabaseRowFingerprint({ ...row, 날짜: '2026-01-02' }),
    );
  });

  it('skips rows already present in the legacy ad_data duplicate set', () => {
    const first: SupabaseRow = {
      업종: '식음료',
      캠페인이름: 'campaign-a',
      목표: 'REACH',
      최적화목표: '도달',
      노출위치: 'FB 피드',
      소재형태: '',
      성별: '',
      연령: '',
      도달: 1,
      노출: 2,
      지출금액: 3,
      빈도: 1,
      cpm: 1500,
      cpc: 0,
      cpc_link: 0,
      영상조회수: 0,
      영상조회비용: 0,
      날짜: '2026-01-01',
    };
    const second = { ...first, 캠페인이름: 'campaign-b' };
    const result = filterDuplicateSupabaseRows(
      [first, first, second],
      new Set([buildSupabaseRowFingerprint(first)]),
    );

    expect(result.skippedDuplicates).toBe(2);
    expect(result.rows).toEqual([second]);
  });
});
