import { describe, expect, it } from 'vitest';

import { buildSyncDateRanges } from '../../lib/metaSync';

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
});
