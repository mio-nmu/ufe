import { api } from "@/lib/api-client";

export interface LiveGameState {
  id: string;
  gameId: string;
  status: "FINAL" | "HALFTIME" | "LIVE" | "NOT_STARTED";
  period: number;
  clockSeconds: number;
  clockRunning: boolean;
  teamScore: number;
  opponentScore: number;
  opponentFouls: number[];
  teamFouls: number[];
  timeouts: number[];
  lineup: string[];
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
}

export interface LiveGameEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  reversed: boolean;
  createdAt: string;
}

export const liveGamesService = {
  get: (gameId: string) =>
    api.get<{ state: LiveGameState | null }>(`/api/v1/live-games/${gameId}`),
  ensure: (gameId: string) =>
    api.post<{ state: LiveGameState }>(`/api/v1/live-games/${gameId}/ensure`),
  events: (gameId: string) =>
    api.get<{ events: LiveGameEvent[] }>(`/api/v1/live-games/${gameId}/events`),
  /** The new state plus the history entry it recorded (and, for undo, the
   *  event it reversed) — the scorer updates its log without a refetch. */
  action: (gameId: string, action: Record<string, unknown>) =>
    api.post<{
      event: LiveGameEvent;
      reversedEventId?: string;
      state: LiveGameState;
    }>(`/api/v1/live-games/${gameId}/action`, action),
};
