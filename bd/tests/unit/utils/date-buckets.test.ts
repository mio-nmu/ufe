import { describe, expect, it } from 'vitest';

import { bucketStarts, countIntoBuckets } from '../../../src/utils/date-buckets.js';

// Wednesday 2026-11-04, mid-day UTC.
const NOW = new Date('2026-11-04T12:00:00Z');

describe('bucketStarts', () => {
  it('returns Monday-start weeks ending with the current week', () => {
    expect(bucketStarts('week', 3, NOW)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
  });

  it('returns first-of-month starts across a year boundary', () => {
    expect(bucketStarts('month', 3, new Date('2026-01-15T00:00:00Z'))).toEqual([
      '2025-11-01',
      '2025-12-01',
      '2026-01-01',
    ]);
  });
});

describe('countIntoBuckets', () => {
  it('sums rows into the bucket they fall in and drops rows before the first', () => {
    const starts = ['2026-09-01', '2026-10-01', '2026-11-01'];
    expect(
      countIntoBuckets(starts, [
        { count: 9, date: '2026-08-31' },
        { count: 1, date: '2026-09-01' },
        { count: 2, date: '2026-10-15' },
        { count: 3, date: '2026-10-31' },
        { count: 4, date: '2026-11-04' },
      ]),
    ).toEqual([1, 5, 4]);
  });
});
