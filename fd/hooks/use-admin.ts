"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { adminActivityService } from "@/services/admin/activity.service";
import { adminStatsService } from "@/services/admin/stats.service";
import { adminUsersService } from "@/services/admin/users.service";
import { useAuth } from "@/providers/auth-provider";
import type { ListQuery, VisitRange } from "@/types/api";

/** Dashboard cards marked "Live" poll at this interval. */
const LIVE_REFETCH_MS = 30_000;

export const adminKeys = {
  all: ["admin"] as const,
  activity: (page: number, pageSize: number) =>
    [...adminKeys.all, "activity", page, pageSize] as const,
  games: () => [...adminKeys.all, "stats", "games"] as const,
  visits: (range: VisitRange) =>
    [...adminKeys.all, "stats", "visits", range] as const,
  users: (query: ListQuery) => [...adminKeys.all, "users", query] as const,
};

/** Polled every 30s ("Live" badge). Switching ranges keeps the previous
 *  series on screen until the next one lands, so the chart morphs between
 *  them instead of flashing a skeleton. */
export function useAdminVisits(range: VisitRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: adminKeys.visits(range),
    queryFn: () => adminStatsService.getVisits(range),
    enabled: user?.role === "ADMIN",
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useAdminGameTimeline() {
  const { user } = useAuth();
  return useQuery({
    queryKey: adminKeys.games(),
    queryFn: adminStatsService.getGameTimeline,
    enabled: user?.role === "ADMIN",
    refetchInterval: LIVE_REFETCH_MS,
  });
}

/** Activity log page. Polled so the dashboard feed and the history page pick
 *  up other admins' changes; paging keeps the old page until the next lands. */
export function useAdminActivity(page: number, pageSize: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: adminKeys.activity(page, pageSize),
    queryFn: () => adminActivityService.list(page, pageSize),
    enabled: user?.role === "ADMIN",
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFETCH_MS,
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
