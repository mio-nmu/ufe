import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import type { AuthUser, SafeUser } from '../../types/index.js';

import { env } from '../../config/env.js';
import { ApiError } from '../../lib/ApiError.js';
import { signAccessToken } from '../../lib/jwt.js';
import { hashPassword, verifyDummyPassword, verifyPassword } from '../../lib/password.js';
import { generateRefreshToken, hashRefreshToken } from '../../lib/tokens.js';
import * as tokenQueries from '../../queries/user/refreshToken.queries.js';
import * as userQueries from '../../queries/user/user.queries.js';

// Deliberately generic — identical for unknown account and wrong password.
export const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

export async function register(input: {
  email: string;
  name?: string;
  password: string;
}): Promise<AuthResult> {
  const existing = await userQueries.findUserAuthByEmail(input.email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }
  const passwordHash = await hashPassword(input.password);
  const user = await userQueries.createUser({
    email: input.email,
    name: input.name ?? null,
    passwordHash,
  });
  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

/**
 * Login by identifier: the named staff accounts (manager / editor /
 * edumanager) authenticate by username; an email address keeps working so
 * legacy and registered accounts are not locked out.
 */
export async function login(input: { identifier: string; password: string }): Promise<AuthResult> {
  const trimmed = input.identifier.trim();
  const user =
    (await userQueries.findUserAuthByUsername(trimmed)) ??
    (await userQueries.findUserAuthByEmail(trimmed.toLowerCase()));
  // Compare against a dummy hash when the account doesn't exist so both
  // failure paths cost the same — no enumeration via timing.
  const passwordOk = user
    ? await verifyPassword(input.password, user.passwordHash)
    : await verifyDummyPassword(input.password);

  if (!user || !passwordOk || !user.isActive) {
    throw ApiError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  const tokens = await issueTokens(safeUser as AuthUser);
  return { user: safeUser as SafeUser, ...tokens };
}

/**
 * Admin-only login with a short numeric code (dev convenience — see
 * ADMIN_PIN_CODE). The comparison is constant-time and the only distinguishing
 * signal is accept/reject: there is a single shared code, nothing to enumerate.
 */
export async function loginWithPin(code: string): Promise<AuthResult> {
  if (env.ADMIN_PIN_CODE === '') {
    // PIN login disabled — answer exactly as if the route did not exist.
    throw ApiError.notFound('Not found');
  }
  if (!safeEqualSha256(code, env.ADMIN_PIN_CODE)) {
    throw ApiError.unauthorized('Invalid PIN code');
  }

  const admin = (await userQueries.findFirstActiveAdmin()) ?? (await provisionAdmin());
  const tokens = await issueTokens({ email: admin.email, id: admin.id, role: admin.role });
  return { user: admin, ...tokens };
}

/** Fixed-length digests make the comparison constant-time regardless of input. */
function safeEqualSha256(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a).digest();
  const digestB = createHash('sha256').update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

/** PIN login needs one active admin to exist; create one with an unguessable
 * random password so the password-login surface stays closed for it. */
async function provisionAdmin(): Promise<SafeUser> {
  try {
    return await userQueries.createUser({
      email: 'provisioned-admin@ufeedu.local',
      name: 'Provisioned Admin',
      passwordHash: await hashPassword(randomBytes(32).toString('hex')),
      role: 'ADMIN',
    });
  } catch (error) {
    // Lost a simultaneous first-login race (or the email is taken) — fall
    // back to an existing admin if one appeared, otherwise surface the error.
    const existing = await userQueries.findFirstActiveAdmin();
    if (existing) return existing;
    throw error;
  }
}

export async function refresh(refreshToken: string | undefined): Promise<AuthResult> {
  if (!refreshToken) {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  const tokenHash = hashRefreshToken(refreshToken);
  const record = await tokenQueries.findRefreshTokenWithUserByHash(tokenHash);
  const now = new Date();
  if (!record || record.revokedAt || record.expiresAt < now || !record.user.isActive) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const next = generateRefreshToken();
  await tokenQueries.rotateRefreshToken({
    expiresAt: refreshTokenExpiry(),
    newTokenHash: next.tokenHash,
    oldTokenHash: tokenHash,
    userId: record.user.id,
  });
  const accessToken = signAccessToken(record.user);
  return { accessToken, refreshToken: next.token, user: record.user };
}

export async function me(userId: string): Promise<SafeUser> {
  const user = await userQueries.findUserById(userId);
  if (!user) {
    throw ApiError.unauthorized('Authentication required');
  }
  return user;
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  try {
    await tokenQueries.deleteRefreshTokenByHash(hashRefreshToken(refreshToken));
  } catch {
    // Token already deleted (e.g. double logout) — nothing to do.
  }
}

async function issueTokens(user: AuthUser): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken(user);
  const { token, tokenHash } = generateRefreshToken();
  await tokenQueries.createRefreshToken({
    expiresAt: refreshTokenExpiry(),
    tokenHash,
    userId: user.id,
  });
  return { accessToken, refreshToken: token };
}

function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
