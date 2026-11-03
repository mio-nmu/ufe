"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { adminStatsService } from "@/services/admin/stats.service";
import { adminUsersService } from "@/services/admin/users.service";
import { useAuth } from "@/providers/auth-provider";
import type { ListQuery } from "@/types/api";

export const adminKeys = {
  all: ["admin"] as const,
  stats: () => [...adminKeys.all, "stats"] as const,
  users: (query: ListQuery) => [...adminKeys.all, "users", query] as const,
};

export function useAdminStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: adminStatsService.getStats,
    enabled: user?.role === "ADMIN",
  });
}

export function useAdminUsers(query: ListQuery) {
  return useQuery({
    queryKey: adminKeys.users(query),
    queryFn: () => adminUsersService.listUsers(query),
    placeholderData: keepPreviousData,
  });
}

export function useSetUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminUsersService.setUserStatus(id, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: "ADMIN" | "USER" }) =>
      adminUsersService.setUserRole(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}
