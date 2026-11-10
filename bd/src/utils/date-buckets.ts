/** Calendar bucketing for admin charts. All dates are UTC; days are
 *  YYYY-MM-DD strings, which sort lexically in date order. */

export type BucketSize = 'month' | 'week';

/** UTC start days of the last `n` buckets, oldest first, ending with the
 *  bucket that contains `now`. Weeks start on Monday. */
export function bucketStarts(bucket: BucketSize, n: number, now: Date): string[] {
  const starts: string[] = [];
  if (bucket === 'week') {
    const mondayOffset = (now.getUTCDay() + 6) % 7;
    const monday = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - mondayOffset,
    );
    for (let i = n - 1; i >= 0; i--) {
      starts.push(isoDate(new Date(monday - i * 7 * 24 * 60 * 60 * 1000)));
    }
  } else {
    for (let i = n - 1; i >= 0; i--) {
      starts.push(isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
    }
  }
  return starts;
}

/** Sums each row into the last bucket starting on or before its day; rows
 *  older than the first bucket are ignored. One total per start. */
export function countIntoBuckets(
  starts: string[],
  rows: { count: number; date: string }[],
): number[] {
  const counts = starts.map(() => 0);
  for (const row of rows) {
    const index = starts.findLastIndex((start) => start <= row.date);
    if (index >= 0) counts[index] = (counts[index] ?? 0) + row.count;
  }
  return counts;
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
