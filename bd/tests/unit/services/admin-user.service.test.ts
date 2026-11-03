import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SafeUser } from '../../../src/types/index.js';

import * as adminUserQueries from '../../../src/queries/admin/user.queries.js';
import * as adminUserService from '../../../src/services/admin/user.service.js';

vi.mock('../../../src/queries/admin/user.queries.js');

const queries = vi.mocked(adminUserQueries);

const admin = (id: string) => ({ id, isActive: true, role: 'ADMIN' }) as unknown as SafeUser;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('last active admin safeguard', () => {
  it('refuses to demote the only remaining active admin', async () => {
    queries.findAdminViewUserById.mockResolvedValue(admin('target'));
    queries.countUsers.mockResolvedValue(0);
    await expect(adminUserService.setUserRole('script', 'target', 'USER')).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(queries.setUserRole).not.toHaveBeenCalled();
  });

  it('refuses to deactivate the only remaining active admin', async () => {
    queries.findAdminViewUserById.mockResolvedValue(admin('target'));
    queries.countUsers.mockResolvedValue(0);
    await expect(adminUserService.setUserStatus('script', 'target', false)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(queries.setUserActive).not.toHaveBeenCalled();
  });

  it('allows demotion while another active admin remains', async () => {
    queries.findAdminViewUserById.mockResolvedValue(admin('target'));
    queries.countUsers.mockResolvedValue(1);
    queries.setUserRole.mockResolvedValue({ ...admin('target'), role: 'USER' } as SafeUser);
    await adminUserService.setUserRole('actor', 'target', 'USER');
    expect(queries.setUserRole).toHaveBeenCalledWith('target', 'USER');
  });
});
