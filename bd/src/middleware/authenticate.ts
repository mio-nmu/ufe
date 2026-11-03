import type { RequestHandler } from 'express';

import type { AuthUser } from '../types/index.js';

import { ApiError } from '../lib/ApiError.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { findUserAuthById } from '../queries/user/user.queries.js';

/**
 * Resolves the Bearer token to the CURRENT user record: verifies the JWT
 * signature, then loads the user so a deleted/deactivated account's token
 * dies immediately, even before it expires. Returns null when no Bearer
 * header was sent or the user is gone/inactive; throws on a bad token.
 */
async function resolveUser(header: string | undefined): Promise<AuthUser | null> {
  if (!header?.startsWith('Bearer ')) return null;
  const claims = verifyAccessToken(header.slice('Bearer '.length));
  const user = await findUserAuthById(claims.sub);
  if (!user?.isActive) return null;
  // MongoDB stores roles as plain strings — narrow to the union, failing
  // closed (non-admin) on anything unexpected.
  return { email: user.email, id: user.id, role: user.role === 'ADMIN' ? 'ADMIN' : 'USER' };
}

/** Required Bearer authentication — 401 unless a live user is resolved. */
export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req.headers.authorization);
  if (!user) {
    throw ApiError.unauthorized('Authentication required');
  }
  req.user = user;
  next();
});

/**
 * Optional Bearer auth for public content reads. Never rejects: a missing,
 * stale or invalid token just means the request continues anonymous (public
 * rows only). The admin panel attaches its token to list calls so editors
 * can preview unpublished rows.
 */
export const optionalAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  try {
    const user = await resolveUser(req.headers.authorization);
    if (user) req.user = user;
  } catch {
    // Anonymous on any token problem — public reads must not 401.
  }
  next();
});
