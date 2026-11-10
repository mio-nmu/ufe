import { Router } from 'express';

import * as statsController from '../../controllers/admin/stats.controller.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { visitStatsQuerySchema } from '../../validators/admin/stats.validators.js';

export const adminStatsRouter = Router();

adminStatsRouter.get('/', asyncHandler(statsController.getAdminStats));
adminStatsRouter.get(
  '/visits',
  validate({ query: visitStatsQuerySchema }),
  asyncHandler(statsController.getVisitStats),
);
adminStatsRouter.get('/games', asyncHandler(statsController.getGameStats));
