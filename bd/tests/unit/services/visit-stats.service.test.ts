import { describe, expect, it } from 'vitest';

import { summarise } from '../../../src/services/admin/visit-stats.service.js';
import { bucketStarts } from '../../../src/utils/date-buckets.js';

// Wednesday 2026-11-04, mid-day UTC.
const NOW = new Date('2026-11-04T12:00:00Z');

describe('summarise', () => {
  it('sums days into buckets and splits charted vs previous period', () => {
    const starts = bucketStarts('week', 10, NOW); // month range = 5 charted + 5 previous
    const series = summarise('month', starts, [
      { count: 4, date: '2026-08-20' }, // before the window — ignored
      { count: 7, date: '2026-09-28' }, // previous period, first bucket
      { count: 2, date: '2026-10-05' }, // first charted bucket (Monday)
      { count: 3, date: '2026-10-11' }, // same bucket (Sunday)
      { count: 5, date: '2026-11-04' }, // current, partial week
    ]);

    expect(series.buckets.map((b) => b.start)).toEqual([
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ]);
    expect(series.buckets.map((b) => b.count)).toEqual([5, 0, 0, 0, 5]);
    expect(series.total).toBe(10);
    expect(series.previousTotal).toBe(7);
    expect(series.bucket).toBe('week');
  });
});
