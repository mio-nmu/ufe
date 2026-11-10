import { incrementVisitDay } from '../../queries/analytics/visits.queries.js';

/** Counts one render/refresh of the public homepage against today (UTC). */
export async function recordHomeVisit(): Promise<void> {
  await incrementVisitDay(new Date().toISOString().slice(0, 10));
}
