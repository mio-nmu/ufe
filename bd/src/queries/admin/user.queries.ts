import type { Prisma } from '../../generated/prisma/client.js';
import type { SafeUser } from '../../types/index.js';
import type { ListQuery } from '../../utils/pagination.js';

import { prisma } from '../../lib/prisma.js';
import { SAFE_USER_SELECT } from '../user/user.queries.js';

type UserOrderByInput = Prisma.UserOrderByWithRelationInput;
type UserWhereInput = Prisma.UserWhereInput;

/** NOTE: MongoDB string matching is case-sensitive (Prisma's
 *  `mode: 'insensitive'` is a PostgreSQL-only feature), so the admin search
 *  matches the exact typed case. */
export function buildUserSearchWhere(search?: string): UserWhereInput {
  if (!search) return {};
  return {
    OR: [{ email: { contains: search } }, { name: { contains: search } }],
  };
}

export function countUsers(where: UserWhereInput = {}): Promise<number> {
  return prisma.user.count({ where });
}

export async function findAdminViewUserById(id: string): Promise<null | SafeUser> {
  return (await prisma.user.findUnique({
    select: SAFE_USER_SELECT,
    where: { id },
  })) as null | SafeUser;
}

export async function listUsers(query: ListQuery, where: UserWhereInput = {}): Promise<SafeUser[]> {
  return (await prisma.user.findMany({
    orderBy: { [query.sortBy]: query.sortOrder } as UserOrderByInput,
    select: SAFE_USER_SELECT,
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    where,
  })) as SafeUser[];
}

export async function setUserActive(id: string, isActive: boolean): Promise<SafeUser> {
  return (await prisma.user.update({
    data: { isActive },
    select: SAFE_USER_SELECT,
    where: { id },
  })) as SafeUser;
}

export async function setUserRole(id: string, role: 'ADMIN' | 'USER'): Promise<SafeUser> {
  return (await prisma.user.update({
    data: { role },
    select: SAFE_USER_SELECT,
    where: { id },
  })) as SafeUser;
}
