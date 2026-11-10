import type { Request, Response } from 'express';

import type { VisitRange } from '../../types/index.js';

import { getGameTimeline } from '../../services/admin/game-stats.service.js';
import { getStats } from '../../services/admin/stats.service.js';
import { getVisitSeries } from '../../services/admin/visit-stats.service.js';
import { ok } from '../../utils/http.js';

export async function getAdminStats(_req: unknown, res: Response): Promise<void> {
  const stats = await getStats();
  ok(res, stats);
}

export async function getVisitStats(req: Request, res: Response): Promise<void> {
  // validate() replaced req.query with the parsed value at runtime.
  const { range } = req.query as unknown as { range: VisitRange };
  ok(res, await getVisitSeries(range));
}

export async function getGameStats(_req: unknown, res: Response): Promise<void> {
  ok(res, await getGameTimeline());
}
