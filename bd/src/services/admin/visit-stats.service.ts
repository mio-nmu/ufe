import type { DailyCountRow } from '../../queries/admin/stats.queries.js';
import type { VisitRange, VisitSeries } from '../../types/index.js';

import { VISIT_RANGES } from '../../config/constants.js';
import { getVisitDaysSince } from '../../queries/analytics/visits.queries.js';
import { bucketStarts, countIntoBuckets, isoDate } from '../../utils/date-buckets.js';

/** Homepage visits for one dashboard range, plus the previous period's total. */
export async function getVisitSeries(range: VisitRange, now = new Date()): Promise<VisitSeries> {
  const { bucket, count } = VISIT_RANGES[range];
  // Twice the charted buckets: the older half is the "vs prev" period.
  const starts = bucketStarts(bucket, count * 2, now);
  const rows = await getVisitDaysSince(starts[0] ?? isoDate(now));
  return summarise(range, starts, rows);
}

/** Pure bucketing step — exported for unit tests. */
export function summarise(range: VisitRange, starts: string[], rows: DailyCountRow[]): VisitSeries {
  const { bucket, count } = VISIT_RANGES[range];
  const counts = countIntoBuckets(starts, rows);
  const previousCount = starts.length - count;

  const buckets = starts.slice(previousCount).map((start, i) => ({
    count: counts[previousCount + i] ?? 0,
    start,
  }));

  return {
    bucket,
    buckets,
    previousTotal: sum(counts.slice(0, previousCount)),
    range,
    total: sum(buckets.map((entry) => entry.count)),
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
