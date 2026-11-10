import { prisma } from '../../lib/prisma.js';

export interface DailyCountRow {
  count: number;
  date: string;
}

export interface UserCounts {
  active: number;
  admins: number;
  total: number;
}

/** Daily registration counts for the admin chart, grouped in JS from a
 *  bounded fetch (users created since the window start) — MongoDB has no
 *  date_trunc, and the window is small enough that client-side grouping is
 *  exact and cheap. Dates are UTC YYYY-MM-DD. */
export async function getDailyRegistrations(days: number): Promise<DailyCountRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
    where: { createdAt: { gte: since } },
  });

  const byDay = new Map<string, number>();
  for (const { createdAt } of users) {
    const date = createdAt.toISOString().slice(0, 10);
    byDay.set(date, (byDay.get(date) ?? 0) + 1);
  }
  return [...byDay.entries()]
    .map(([date, count]) => ({ count, date }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getUserCounts(): Promise<UserCounts> {
  const [total, active, admins] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
  ]);
  return { active, admins, total };
}

/** Tip-off days of games played in [since, until): everything not cancelled
 *  whose tip-off has passed. Friendly matches count too once they are
 *  stored as games. One row per game. */
export async function getPlayedGameDays(since: Date, until: Date): Promise<DailyCountRow[]> {
  const games = await prisma.game.findMany({
    select: { tipsAt: true },
    where: { status: { not: 'CANCELLED' }, tipsAt: { gte: since, lt: until } },
  });
  return games.map(({ tipsAt }) => ({ count: 1, date: tipsAt.toISOString().slice(0, 10) }));
}
