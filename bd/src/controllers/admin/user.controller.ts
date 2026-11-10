import type { Request, Response } from 'express';

import type { ListUsersQuery } from '../../validators/admin/users.validators.js';

import { ApiError } from '../../lib/ApiError.js';
import { recordActivity } from '../../services/admin/activity.service.js';
import * as adminUserService from '../../services/admin/user.service.js';
import { ok } from '../../utils/http.js';

export async function getUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as { id: string };
  const user = await adminUserService.getUser(id);
  ok(res, { user });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  // validate() replaced req.query with the parsed value at runtime.
  const query = req.query as unknown as ListUsersQuery;
  const result = await adminUserService.listUsers(query);
  ok(res, result);
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const { id } = req.params as unknown as { id: string };
  const user = await adminUserService.setUserRole(req.user.id, id, req.body.role);
  await recordActivity(req.user, {
    action: 'UPDATED',
    entity: 'user',
    entityId: user.id,
    label: `${user.email} → ${user.role}`,
  });
  ok(res, { user });
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const { id } = req.params as unknown as { id: string };
  const user = await adminUserService.setUserStatus(req.user.id, id, req.body.isActive);
  await recordActivity(req.user, {
    action: 'UPDATED',
    entity: 'user',
    entityId: user.id,
    label: `${user.email} ${user.isActive ? 'activated' : 'deactivated'}`,
  });
  ok(res, { user });
}
