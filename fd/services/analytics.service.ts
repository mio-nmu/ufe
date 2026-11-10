import { api } from "@/lib/api-client";

/** Public, anonymous audience-reach beacon. */
export const analyticsService = {
  recordHomeVisit(): Promise<{ recorded: boolean }> {
    return api.post<{ recorded: boolean }>("/api/v1/analytics/visits");
  },
};
