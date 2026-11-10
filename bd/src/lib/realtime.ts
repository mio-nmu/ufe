import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Hosted real-time push (Supabase Realtime Broadcast) for live scores. The
 * backend runs as serverless functions, so an in-memory event bus only
 * reaches viewers on the same instance; broadcasting through Supabase
 * reaches every viewer. Disabled (a no-op) until SUPABASE_URL and
 * SUPABASE_SECRET_KEY are set.
 *
 * Channels are PRIVATE: viewers may only receive (see
 * supabase/live-game-realtime.sql); the secret key acts as the service
 * role, which is exempt from those policies, so only this server can send.
 */

/** A slow broadcast must never hold up the scorer's response for long. */
const PUBLISH_TIMEOUT_MS = 1500;

export const LIVE_GAME_EVENT = 'state_changed';

export function liveGameChannel(gameId: string): string {
  return `live-game:${gameId}`;
}

/** Broadcasts the new state; failures are logged, never thrown — viewers
 *  heal on their next resync poll. */
export async function publishLiveGameState(gameId: string, state: unknown): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return;
  try {
    const res = await fetch(broadcastUrl(gameId), {
      body: JSON.stringify({ gameId, state }),
      headers: authHeaders(env.SUPABASE_SECRET_KEY),
      method: 'POST',
      signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS),
    });
    if (res.status !== 202) {
      logger.warn({ gameId, status: res.status }, 'Supabase broadcast was rejected');
    }
  } catch (error) {
    logger.warn({ err: error, gameId }, 'Supabase broadcast failed');
  }
}

/** The REST broadcast endpoint realtime-js itself uses (httpSend). */
function broadcastUrl(gameId: string): string {
  const url = new URL('/realtime/v1/api/broadcast', env.SUPABASE_URL);
  url.pathname += `/${encodeURIComponent(liveGameChannel(gameId))}`;
  url.pathname += `/events/${encodeURIComponent(LIVE_GAME_EVENT)}`;
  url.searchParams.set('private', 'true');
  return url.toString();
}

/** New `sb_secret_…` keys go in `apikey` only; a legacy service-role key is
 *  a JWT and is also sent as the bearer token. */
function authHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    'Content-Type': 'application/json',
    ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }),
  };
}
