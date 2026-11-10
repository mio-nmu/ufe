import { Router } from 'express';

import { requireAdmin } from '../../middleware/requireRole.js';
import { adminActivityRouter } from './activity.routes.js';
import { adminMediaRouter } from './media.routes.js';
import { adminStatsRouter } from './stats.routes.js';
import { adminUsersRouter } from './users.routes.js';

const adminRouter = Router();

// Router-level guard: EVERY route mounted below requires an authenticated
// user whose ADMIN role is re-verified against the database. A new admin
// route added under this router can never be accidentally public.
adminRouter.use(requireAdmin);

adminRouter.use('/users', adminUsersRouter);
adminRouter.use('/stats', adminStatsRouter);
adminRouter.use('/media', adminMediaRouter);
adminRouter.use('/activity', adminActivityRouter);

export { adminRouter };
