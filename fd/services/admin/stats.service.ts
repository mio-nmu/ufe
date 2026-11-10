import { api } from "@/lib/api-client";
import type { GameTimeline, VisitRange, VisitSeries } from "@/types/api";

/** Admin-only dashboard statistics. */
export const adminStatsService = {
  getGameTimeline(): Promise<GameTimeline> {
    return api.get<GameTimeline>("/api/v1/admin/stats/games");
  },
  getVisits(range: VisitRange): Promise<VisitSeries> {
    return api.get<VisitSeries>(`/api/v1/admin/stats/visits?range=${range}`);
  },
};
