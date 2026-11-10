import type { Prisma } from '../../generated/prisma/client.js';
import type { DailyCountRow } from '../admin/stats.queries.js';

import { prisma } from '../../lib/prisma.js';

/** Adds one view to the given UTC day. The first view of a day races to
 *  create the row; a concurrent loser hits the unique index (P2002) and
 *  retries as a plain increment of the row the winner just inserted. */
export async function incrementVisitDay(date: string): Promise<void> {
  try {
    await prisma.siteVisitDay.upsert({
      create: { count: 1, date },
      update: { count: { increment: 1 } },
      where: { date },
    });
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError)?.code !== 'P2002') throw error;
    await prisma.siteVisitDay.update({ data: { count: { increment: 1 } }, where: { date } });
  }
}

/** Day rows on or after `sinceDate` (YYYY-MM-DD compares lexically). */
export async function getVisitDaysSince(sinceDate: string): Promise<DailyCountRow[]> {
  return prisma.siteVisitDay.findMany({
    orderBy: { date: 'asc' },
    select: { count: true, date: true },
    where: { date: { gte: sinceDate } },
  });
}
