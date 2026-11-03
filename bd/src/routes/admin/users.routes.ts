import { Router } from 'express';

import * as userController from '../../controllers/admin/user.controller.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import {
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from '../../validators/admin/users.validators.js';

export const adminUsersRouter = Router();

adminUsersRouter.get(
  '/',
  validate({ query: listUsersQuerySchema }),
  asyncHandler(userController.listUsers),
);

adminUsersRouter.get(
  '/:id',
  validate({ params: userIdParamSchema }),
  asyncHandler(userController.getUser),
);

adminUsersRouter.patch(
  '/:id/role',
  validate({ body: updateUserRoleSchema, params: userIdParamSchema }),
  asyncHandler(userController.updateUserRole),
);

adminUsersRouter.patch(
  '/:id/status',
  validate({ body: updateUserStatusSchema, params: userIdParamSchema }),
  asyncHandler(userController.updateUserStatus),
);
