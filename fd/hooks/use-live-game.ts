"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { env } from "@/lib/env";
import {
  LIVE_GAME_EVENT,
  liveGameChannel,
  liveRealtimeClient,
} from "@/lib/realtime-client";
import { serverNow } from "@/lib/server-clock";
import {
  liveGamesService,
  type LiveGameState,
} from "@/services/live-games.service";

/** Safety-net resync while a game is in progress. Pushes normally arrive
 *  within a second; this only heals a dropped connection or a missed push. */
const LIVE_RESYNC_MS = 15_000;

/** Clock repaint rate: fast enough that each second flips on time. */
const CLOCK_TICK_MS = 200;

const REGULATION_PERIODS = 4;

/**
 * Read-only live state for one game (public pages). `mode` sets the cost:
 * "live" fetches, subscribes to pushes and resyncs while the game is on;
 * "once" fetches a single time; "off" does nothing. `refresh` is returned
 * for callers that add their own poll.
 */
export function useLiveGame(
  gameId: string,
  mode: "live" | "once" | "off" = "live",
) {
  const [state, setState] = useState<LiveGameState | null>(null);

  const refresh = useCallback(() => {
    void liveGamesService
      .get(gameId)
      .then(({ state: next }) => {
        if (next) setState(next);
      })
      .catch(() => undefined);
  }, [gameId]);

  useEffect(() => {
    if (mode !== "off") refresh();
  }, [mode, refresh]);
  useLiveGameStream(mode === "live" ? gameId : "", (next) => {
    if (next) setState(next);
    else refresh();
  });

  // A response for a previous gameId never leaks into the current one.
  const current = state?.gameId === gameId ? state : null;
  const inProgress =
    current?.status === "LIVE" || current?.status === "HALFTIME";
  useLiveResync(mode === "live" && inProgress, refresh);

  return { displayClock: useLiveClock(current), refresh, state: current };
}

/**
 * Subscribes to a game's live pushes (no-op for an empty `gameId`):
 * Supabase Realtime when configured — it reaches every viewer whichever
 * server instance handled the tap — else the API's own stream. `onChange`
 * receives each pushed state, and is called WITHOUT a state on every
 * (re)connect: reconnects replay nothing missed, so the caller resyncs.
 * The latest `onChange` is used without resubscribing.
 */
export function useLiveGameStream(
  gameId: string,
  onChange: (state?: LiveGameState) => void,
) {
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });

  useEffect(() => {
    if (!gameId) return;
    const notify = (state?: LiveGameState) => callback.current(state);
    const realtime = liveRealtimeClient();
    return realtime
      ? subscribeRealtime(realtime, gameId, notify)
      : subscribeApiStream(gameId, notify);
  }, [gameId]);
}

/** Seconds left on the game clock (whole seconds, rounded up the way a
 *  scoreboard shows them), repainting while it runs. */
export function useLiveClock(state: LiveGameState | null): number {
  const [displayClock, setDisplayClock] = useState(0);

  useEffect(() => {
    if (!state) return;
    const update = () =>
      setDisplayClock(Math.ceil(secondsLeft(state, serverNow())));
    update();
    if (!state.clockRunning) return;
    const interval = window.setInterval(update, CLOCK_TICK_MS);
    return () => window.clearInterval(interval);
  }, [state]);

  return displayClock;
}

/** Exact seconds left at `atServerMs`: the snapshot's clock minus the time
 *  since the server took it (running clocks only). */
export function secondsLeft(state: LiveGameState, atServerMs: number): number {
  if (!state.clockRunning) return state.clockSeconds;
  const anchor = new Date(state.serverTime ?? state.updatedAt).getTime();
  return Math.max(0, state.clockSeconds - (atServerMs - anchor) / 1000);
}

/** 1–4 → "Q1"…"Q4", 5+ → "OT1"… */
export function periodLabel(period: number): string {
  return period > REGULATION_PERIODS
    ? `OT${period - REGULATION_PERIODS}`
    : `Q${period}`;
}

/** Full length of a period in seconds: 10:00 quarters (FIBA), 5:00 OTs. */
export function periodSeconds(period: number): number {
  return period > REGULATION_PERIODS ? 300 : 600;
}

/** Team-foul slot for a period — FIBA: overtime carries on from Q4. */
export function foulSlot(period: number): number {
  return Math.min(period, REGULATION_PERIODS) - 1;
}

/** 463 → "07:43". */
export function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

/** While `active`: resync every LIVE_RESYNC_MS, and at once when the tab
 *  comes back (a phone waking up has missed everything since it slept). */
function useLiveResync(active: boolean, refresh: () => void): void {
  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(refresh, LIVE_RESYNC_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, refresh]);
}

/** Private broadcast channel: viewers may only receive (the channel
 *  policy), so nobody but the API can push a score. */
function subscribeRealtime(
  realtime: NonNullable<ReturnType<typeof liveRealtimeClient>>,
  gameId: string,
  notify: (state?: LiveGameState) => void,
): () => void {
  const channel = realtime.channel(liveGameChannel(gameId), {
    config: { private: true },
  });
  channel
    .on("broadcast", { event: LIVE_GAME_EVENT }, (message) => {
      notify((message.payload as { state?: LiveGameState } | undefined)?.state);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") notify();
    });
  return () => {
    void realtime.removeChannel(channel);
  };
}

/** The API's own SSE stream — local dev and the no-Supabase fallback. */
function subscribeApiStream(
  gameId: string,
  notify: (state?: LiveGameState) => void,
): () => void {
  const stream = new EventSource(
    `${env.apiUrl}/api/v1/live-games/${gameId}/stream`,
  );
  stream.onopen = () => notify();
  stream.addEventListener("state_changed", (event) => {
    notify(
      safeJson<{ state?: LiveGameState }>((event as MessageEvent<string>).data)
        ?.state,
    );
  });
  return () => stream.close();
}

/** Malformed payloads parse to undefined — the caller then resyncs. */
function safeJson<T>(raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}
