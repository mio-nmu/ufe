import type { RequestHandler } from 'express';

import type { Role } from '../types/index.js';

import { ApiError } from '../lib/ApiError.js';
import { authenticate } from './authenticate.js';

/**
 * Role gate for sensitive areas. Must run after `authenticate`, which has
 * just loaded the CURRENT user record from the database — so a demoted or
 * deactivated account already loses access on its next request, and no
 * second lookup is needed here.
 */
export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }
    next(req.user.role === role ? undefined : ApiError.forbidden());
  };
}

/** The standard admin guard pair. Apply at the ROUTER level where possible
 *  (see routes/admin/index.ts) so new routes can never be accidentally public. */
export const requireAdmin: RequestHandler[] = [authenticate, requireRole('ADMIN')];
