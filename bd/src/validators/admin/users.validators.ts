import { z } from 'zod';

import { USER_SORT_FIELDS } from '../../config/constants.js';
import { listQuerySchema } from '../../utils/pagination.js';
import { idParamSchema } from '../shared.js';

export const listUsersQuerySchema = listQuerySchema(USER_SORT_FIELDS, 'createdAt');

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'USER']),
});

export const userIdParamSchema = idParamSchema;

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
