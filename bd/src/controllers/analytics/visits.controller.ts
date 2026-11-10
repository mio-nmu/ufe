import type { Response } from 'express';

import { recordHomeVisit } from '../../services/analytics/visits.service.js';
import { ok } from '../../utils/http.js';

export async function postHomeVisit(_req: unknown, res: Response): Promise<void> {
  await recordHomeVisit();
  ok(res, { recorded: true }, 201);
}
