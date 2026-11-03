import type { SafeUser } from '../../types/index.js';

import { prisma } from '../../lib/prisma.js';
import { SAFE_USER_SELECT } from './user.queries.js';

export interface RefreshTokenRecord {
  expiresAt: Date;
  id: string;
  revokedAt: Date | null;
  tokenHash: string;
  user: SafeUser;
  userId: string;
}

export function createRefreshToken(data: { expiresAt: Date; tokenHash: string; userId: string }) {
  return prisma.refreshToken.create({ data });
}

export function deleteRefreshTokenByHash(tokenHash: string) {
  return prisma.refreshToken.delete({ where: { tokenHash } });
}

export function findRefreshTokenWithUserByHash(tokenHash: string) {
  return prisma.refreshToken.findUnique({
    include: { user: { select: SAFE_USER_SELECT } },
    where: { tokenHash },
  }) as Promise<null | RefreshTokenRecord>;
}

/**
 * Refresh-token rotation: revoke the old token and persist the new one in ONE
 * transaction, so a partially-completed rotation can never leave two live tokens.
 *
 * MongoDB transactions conflict (P2034) when two writers touch the same
 * document concurrently — e.g. two tabs refreshing the same cookie. The
 * loser retries: on retry its token hash is usually gone (the winner already
 * rotated it), which correctly surfaces as an auth error to that caller.
 */
const TRANSACTION_CONFLICT = 'P2034';
const ROTATION_ATTEMPTS = 3;

export async function rotateRefreshToken(params: {
  expiresAt: Date;
  newTokenHash: string;
  oldTokenHash: string;
  userId: string;
}): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= ROTATION_ATTEMPTS; attempt++) {
    try {
      await prisma.$transaction([
        prisma.refreshToken.update({
          data: { revokedAt: new Date() },
          where: { tokenHash: params.oldTokenHash },
        }),
        prisma.refreshToken.create({
          data: {
            expiresAt: params.expiresAt,
            tokenHash: params.newTokenHash,
            userId: params.userId,
          },
        }),
      ]);
      return;
    } catch (error) {
      lastError = error;
      if ((error as { code?: string }).code !== TRANSACTION_CONFLICT) throw error;
      if (attempt < ROTATION_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
      }
    }
  }
  throw lastError;
}
