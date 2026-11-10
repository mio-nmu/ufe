import { Router } from 'express';

import { adminRouter } from './admin/index.js';
import { analyticsRouter } from './analytics.routes.js';
import { contentRouter } from './content/content.routes.js';
import { liveGamesRouter } from './live-games.routes.js';
import { userRouter } from './user/index.js';

/** Mounted at /api/v1 in app.ts. User, admin and content surfaces stay separate. */
export const apiRouter = Router();

apiRouter.use('/user', userRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/content', contentRouter);
apiRouter.use('/live-games', liveGamesRouter);
