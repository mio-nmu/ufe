import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createTestUser } from '../setup/factories.js';
import { API, app, login } from './helpers.js';

describe('admin route protection', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get(`${API}/admin/users`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a USER-role token with 403 (role denial)', async () => {
    const user = await createTestUser();
    const session = await login(user.email, user.password);

    const res = await request(app)
      .get(`${API}/admin/users`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/v1/admin/users (as ADMIN)', () => {
  it('lists users in the paginated envelope', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const target = await createTestUser({ email: `listed-${randomUUID()}@ufeedu.test` });
    const session = await login(admin.email, admin.password);

    const res = await request(app)
      .get(`${API}/admin/users?search=listed-`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.meta).toMatchObject({
      page: 1,
      pageSize: 20,
      total: expect.any(Number),
    });
    const emails: string[] = res.body.data.items.map((u: { email: string }) => u.email);
    expect(emails).toContain(target.email);
    // The safe shape never includes the password hash.
    for (const item of res.body.data.items) {
      expect(item).not.toHaveProperty('passwordHash');
    }
  });

  it('honours pagination params', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    await createTestUser();
    await createTestUser();
    const session = await login(admin.email, admin.password);

    const res = await request(app)
      .get(`${API}/admin/users?page=1&pageSize=1&sortBy=email&sortOrder=asc`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.meta.pageSize).toBe(1);
    expect(res.body.data.meta.total).toBeGreaterThanOrEqual(3);
  });

  it('fetches a single user by id', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const target = await createTestUser();
    const session = await login(admin.email, admin.password);

    const res = await request(app)
      .get(`${API}/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: target.email, id: target.id });
  });

  it('rejects a malformed id with 400', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const session = await login(admin.email, admin.password);

    const res = await request(app)
      .get(`${API}/admin/users/not-a-uuid`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/v1/admin/users/:id/status', () => {
  it('deactivates a user, who can then no longer log in', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const target = await createTestUser();
    const session = await login(admin.email, admin.password);

    const patch = await request(app)
      .patch(`${API}/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ isActive: false });

    expect(patch.status).toBe(200);
    expect(patch.body.data.user.isActive).toBe(false);

    const blockedLogin = await request(app)
      .post(`${API}/user/auth/login`)
      .send({ identifier: target.email, password: target.password });
    expect(blockedLogin.status).toBe(401);

    const reactivate = await request(app)
      .patch(`${API}/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ isActive: true });
    expect(reactivate.body.data.user.isActive).toBe(true);
  });

  it('refuses to let an admin deactivate their own account', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const session = await login(admin.email, admin.password);

    const res = await request(app)
      .patch(`${API}/admin/users/${admin.id}/status`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 404 for an unknown user', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const session = await login(admin.email, admin.password);

    const res = await request(app)
      .patch(`${API}/admin/users/ffffffffffffffffffffffff/status`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/v1/admin/stats', () => {
  it('returns user totals and a zero-filled daily registration series', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const session = await login(admin.email, admin.password);

    const res = await request(app)
      .get(`${API}/admin/stats`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users).toMatchObject({
      active: expect.any(Number),
      admins: expect.any(Number),
      total: expect.any(Number),
    });
    expect(res.body.data.registrations).toHaveLength(14);
    for (const day of res.body.data.registrations) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(day.count).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('user profile area stays reachable for plain users', () => {
  it('lets a USER read their own profile', async () => {
    const user = await createTestUser({ name: 'Profile Peek' });
    const session = await login(user.email, user.password);

    const res = await request(app)
      .get(`${API}/user/profile`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Profile Peek');
  });
});

describe('PATCH /api/v1/admin/users/:id/role', () => {
  it('grants and revokes admin access', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const target = await createTestUser();
    const bearer = `Bearer ${(await login(admin.email, admin.password)).accessToken}`;

    const grant = await request(app)
      .patch(`${API}/admin/users/${target.id}/role`)
      .set('Authorization', bearer)
      .send({ role: 'ADMIN' });
    expect(grant.status).toBe(200);
    expect(grant.body.data.user.role).toBe('ADMIN');

    const revoke = await request(app)
      .patch(`${API}/admin/users/${target.id}/role`)
      .set('Authorization', bearer)
      .send({ role: 'USER' });
    expect(revoke.body.data.user.role).toBe('USER');
  });

  it('refuses to remove your own admin access', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const bearer = `Bearer ${(await login(admin.email, admin.password)).accessToken}`;
    const res = await request(app)
      .patch(`${API}/admin/users/${admin.id}/role`)
      .set('Authorization', bearer)
      .send({ role: 'USER' });
    expect(res.status).toBe(409);
  });
});
