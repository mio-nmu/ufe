import { Router } from 'express';

import * as visitsController from '../controllers/analytics/visits.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';

/** Public audience-reach beacon, mounted at /api/v1/analytics. Anonymous —
 *  every homepage load counts; only the global API limiter applies. */
export const analyticsRouter = Router();

analyticsRouter.post('/visits', asyncHandler(visitsController.postHomeVisit));
