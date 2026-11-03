import type { Paginated, SafeUser } from '../../types/index.js';
import type { ListQuery } from '../../utils/pagination.js';

import { ApiError } from '../../lib/ApiError.js';
import * as adminUserQueries from '../../queries/admin/user.queries.js';
import { buildPaginationMeta } from '../../utils/pagination.js';

export async function getUser(userId: string): Promise<SafeUser> {
  const user = await adminUserQueries.findAdminViewUserById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user;
}

export async function listUsers(query: ListQuery): Promise<Paginated<SafeUser>> {
  const where = adminUserQueries.buildUserSearchWhere(query.search);
  const [items, total] = await Promise.all([
    adminUserQueries.listUsers(query, where),
    adminUserQueries.countUsers(where),
  ]);
  return { items, meta: buildPaginationMeta(total, query) };
}

/** Grants or revokes ADMIN. Takes effect on the target's next request
 *  (authenticate re-reads the role from the database every time). */
export async function setUserRole(
  actorId: string,
  targetId: string,
  role: 'ADMIN' | 'USER',
): Promise<SafeUser> {
  const target = await adminUserQueries.findAdminViewUserById(targetId);
  if (!target) {
    throw ApiError.notFound('User not found');
  }
  if (actorId === targetId && role !== 'ADMIN') {
    throw ApiError.conflict('You cannot remove your own admin access');
  }
  if (role !== 'ADMIN' && target.role === 'ADMIN') {
    await assertNotLastAdmin(targetId);
  }
  return adminUserQueries.setUserRole(targetId, role);
}

export async function setUserStatus(
  actorId: string,
  targetId: string,
  isActive: boolean,
): Promise<SafeUser> {
  const target = await adminUserQueries.findAdminViewUserById(targetId);
  if (!target) {
    throw ApiError.notFound('User not found');
  }
  if (actorId === targetId && !isActive) {
    throw ApiError.conflict('You cannot deactivate your own account');
  }
  if (!isActive && target.role === 'ADMIN') {
    await assertNotLastAdmin(targetId);
  }
  return adminUserQueries.setUserActive(targetId, isActive);
}

/** The site must always keep one active admin — never lock everyone out. */
async function assertNotLastAdmin(targetId: string): Promise<void> {
  const others = await adminUserQueries.countUsers({
    id: { not: targetId },
    isActive: true,
    role: 'ADMIN',
  });
  if (others === 0) {
    throw ApiError.conflict('At least one active admin must remain');
  }
}
