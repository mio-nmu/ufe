import { z } from 'zod';

import { emailSchema, passwordSchema } from '../shared.js';

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(100).optional(),
  password: passwordSchema,
});

/**
 * Login by identifier — the username of a named staff account (manager /
 * editor / edumanager) or, as a fallback, an account's email address.
 * Passwords are short by request for now (the staff pass is 4 digits), so
 * only presence is enforced on this route; registration keeps the strong
 * policy.
 */
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Username is required').max(255),
  password: z.string().min(1, 'Password is required').max(72),
});

export const pinLoginSchema = z.object({
  code: z.string().regex(/^\d{4,8}$/, 'PIN code must be 4–8 digits'),
});
