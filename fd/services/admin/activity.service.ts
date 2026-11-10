import { api } from "@/lib/api-client";
import type { ActivityEntry, Paginated } from "@/types/api";

/** Admin write history (activity log), newest first. */
export const adminActivityService = {
  list(page: number, pageSize: number): Promise<Paginated<ActivityEntry>> {
    return api.get<Paginated<ActivityEntry>>(
      `/api/v1/admin/activity?page=${page}&pageSize=${pageSize}`,
    );
  },
};
