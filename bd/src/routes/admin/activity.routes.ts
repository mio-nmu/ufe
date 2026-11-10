import { Router } from 'express';

import * as activityController from '../../controllers/admin/activity.controller.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { listActivityQuerySchema } from '../../validators/admin/activity.validators.js';

/** Admin write history, newest first. Mounted at /api/v1/admin/activity. */
export const adminActivityRouter = Router();

adminActivityRouter.get(
  '/',
  validate({ query: listActivityQuerySchema }),
  asyncHandler(activityController.getActivity),
);
