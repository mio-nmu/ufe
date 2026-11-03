import { Router } from 'express';

import * as liveGames from '../controllers/live-games.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAdmin } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { liveGameActionSchema } from '../validators/live-games.validators.js';
import { idParamSchema } from '../validators/shared.js';

/** Live scorer surface, mounted at /api/v1/live-games: public state + stream,
 *  ADMIN-only scorer actions. */
export const liveGamesRouter = Router();

liveGamesRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(liveGames.getState));
liveGamesRouter.get('/:id/stream', validate({ params: idParamSchema }), liveGames.stream);
liveGamesRouter.get(
  '/:id/events',
  ...requireAdmin,
  validate({ params: idParamSchema }),
  asyncHandler(liveGames.listEvents),
);
liveGamesRouter.post(
  '/:id/ensure',
  ...requireAdmin,
  validate({ params: idParamSchema }),
  asyncHandler(liveGames.ensureState),
);
liveGamesRouter.post(
  '/:id/action',
  ...requireAdmin,
  validate({ body: liveGameActionSchema, params: idParamSchema }),
  asyncHandler(liveGames.action),
);
