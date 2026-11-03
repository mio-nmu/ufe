import type { Prisma } from '../../generated/prisma/client.js';
import type { Role, SafeUser } from '../../types/index.js';

import { prisma } from '../../lib/prisma.js';

/** Fields safe to return to clients — passwordHash is deliberately absent.
 *  `role` is typed `string` by Prisma (MongoDB has no enums) and cast to the
 *  app's Role union here: every write path stores a validated literal. */
export const SAFE_USER_SELECT = {
  createdAt: true,
  email: true,
  id: true,
  isActive: true,
  name: true,
  role: true,
  updatedAt: true,
  username: true,
} satisfies Prisma.UserSelect;

export interface CreateUserData {
  createdAt?: Date;
  email: string;
  name?: null | string;
  passwordHash: string;
  role?: Role;
  username?: null | string;
}

export async function createUser(data: CreateUserData): Promise<SafeUser> {
  return (await prisma.user.create({ data, select: SAFE_USER_SELECT })) as SafeUser;
}

/** Oldest active admin — the account PIN login signs in as. */
export async function findFirstActiveAdmin(): Promise<null | SafeUser> {
  return (await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: SAFE_USER_SELECT,
    where: { isActive: true, role: 'ADMIN' },
  })) as null | SafeUser;
}

/** Auth lookups: includes passwordHash — only the auth service may call these. */
export function findUserAuthByEmail(email: string) {
  return prisma.user.findUnique({
    select: {
      email: true,
      id: true,
      isActive: true,
      passwordHash: true,
      role: true,
      username: true,
    },
    where: { email },
  });
}

export function findUserAuthById(id: string) {
  return prisma.user.findUnique({
    select: { email: true, id: true, isActive: true, role: true, username: true },
    where: { id },
  });
}

/** Named staff logins (manager / editor / edumanager) authenticate by
 *  username. Not a schema-level unique key (most users have none) — the
 *  partial unique index `username_unique_partial` guarantees at most one
 *  match among real usernames. */
export function findUserAuthByUsername(username: string) {
  return prisma.user.findFirst({
    select: {
      email: true,
      id: true,
      isActive: true,
      passwordHash: true,
      role: true,
      username: true,
    },
    where: { username },
  });
}

export async function findUserById(id: string): Promise<null | SafeUser> {
  return (await prisma.user.findUnique({
    select: SAFE_USER_SELECT,
    where: { id },
  })) as null | SafeUser;
}

export async function updateUserProfile(
  id: string,
  data: { name?: null | string },
): Promise<SafeUser> {
  return (await prisma.user.update({
    data,
    select: SAFE_USER_SELECT,
    where: { id },
  })) as SafeUser;
}
