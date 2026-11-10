import type { Request, Response } from 'express';

import type { ListActivityQuery } from '../../validators/admin/activity.validators.js';

import { listActivity } from '../../services/admin/activity.service.js';
import { ok } from '../../utils/http.js';

export async function getActivity(req: Request, res: Response): Promise<void> {
  // validate() replaced req.query with the parsed value at runtime.
  const query = req.query as unknown as ListActivityQuery;
  ok(res, await listActivity(query));
}
