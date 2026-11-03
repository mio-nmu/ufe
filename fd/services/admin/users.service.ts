import { api } from "@/lib/api-client";
import type { ListQuery, Paginated, User } from "@/types/api";

function toQueryString(query: ListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

/** Admin-only user management. */
export const adminUsersService = {
  listUsers(query: ListQuery = {}): Promise<Paginated<User>> {
    return api.get<Paginated<User>>(
      `/api/v1/admin/users${toQueryString(query)}`,
    );
  },

  getUser(id: string): Promise<{ user: User }> {
    return api.get<{ user: User }>(`/api/v1/admin/users/${id}`);
  },

  setUserRole(id: string, role: "ADMIN" | "USER"): Promise<{ user: User }> {
    return api.patch<{ user: User }>(`/api/v1/admin/users/${id}/role`, {
      role,
    });
  },

  setUserStatus(id: string, isActive: boolean): Promise<{ user: User }> {
    return api.patch<{ user: User }>(`/api/v1/admin/users/${id}/status`, {
      isActive,
    });
  },
};
