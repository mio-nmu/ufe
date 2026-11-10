import { RealtimeClient } from "@supabase/realtime-js";

import { env } from "@/lib/env";

/** Must match the backend's channel naming and event (bd lib/realtime.ts). */
export const LIVE_GAME_EVENT = "state_changed";

let client: RealtimeClient | null = null;

/** Topic of a game's private live-score channel. */
export function liveGameChannel(gameId: string): string {
  return `live-game:${gameId}`;
}

/**
 * One shared Supabase Realtime connection per page (every live card's
 * channel multiplexes over it), opened on first use. Null when Supabase
 * is not configured.
 */
export function liveRealtimeClient(): RealtimeClient | null {
  if (!env.supabaseUrl || !env.supabasePublishableKey) return null;
  client ??= new RealtimeClient(
    `${env.supabaseUrl.replace(/^http/u, "ws")}/realtime/v1`,
    { params: { apikey: env.supabasePublishableKey } },
  );
  return client;
}
