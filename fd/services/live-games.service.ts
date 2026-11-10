import { api } from "@/lib/api-client";
import { noteServerTime } from "@/lib/server-clock";

export interface LiveGameState {
  id: string;
  gameId: string;
  status: "FINAL" | "HALFTIME" | "LIVE" | "NOT_STARTED";
  period: number;
  /** Seconds left as of `serverTime` (fractional). */
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
  /** When the server produced this snapshot — the running clock counts
   *  down from here. */
  serverTime: string;
  updatedAt: string;
}

export interface LiveGameEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  reversed: boolean;
  createdAt: string;
}

export interface LiveGameActionResult {
  event: LiveGameEvent;
  reversedEventId?: string;
  state: LiveGameState;
}

export const liveGamesService = {
  get: (gameId: string) =>
    timed(() =>
      api.get<{ state: LiveGameState | null }>(`/api/v1/live-games/${gameId}`),
    ),
  ensure: (gameId: string) =>
    timed(() =>
      api.post<{ state: LiveGameState }>(`/api/v1/live-games/${gameId}/ensure`),
    ),
  events: (gameId: string) =>
    api.get<{ events: LiveGameEvent[] }>(`/api/v1/live-games/${gameId}/events`),
  /** The new state plus the history entry it recorded (and, for undo, the
   *  event it reversed) — the scorer updates its log without a refetch. */
  action: (gameId: string, action: Record<string, unknown>) =>
    timed(() =>
      api.post<LiveGameActionResult>(
        `/api/v1/live-games/${gameId}/action`,
        action,
      ),
    ),
};

/** Every response carrying a state is also a server-clock sample. */
async function timed<T extends { state: LiveGameState | null }>(
  request: () => Promise<T>,
): Promise<T> {
  const sentAt = Date.now();
  const result = await request();
  if (result.state) noteServerTime(result.state.serverTime, sentAt, Date.now());
  return result;
}
