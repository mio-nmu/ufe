import type { GameTimeline } from '../../types/index.js';

import { GAME_TIMELINE_MONTHS } from '../../config/constants.js';
import { getPlayedGameDays } from '../../queries/admin/stats.queries.js';
import { bucketStarts, countIntoBuckets } from '../../utils/date-buckets.js';

/** Games played per month over the last GAME_TIMELINE_MONTHS (current month included). */
export async function getGameTimeline(now = new Date()): Promise<GameTimeline> {
  const starts = bucketStarts('month', GAME_TIMELINE_MONTHS, now);
  const since = new Date(`${starts[0]}T00:00:00.000Z`);
  const counts = countIntoBuckets(starts, await getPlayedGameDays(since, now));
  return { months: starts.map((start, i) => ({ count: counts[i] ?? 0, start })) };
}
