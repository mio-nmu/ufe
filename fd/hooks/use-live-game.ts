"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { env } from "@/lib/env";
import {
  liveGamesService,
  type LiveGameState,
} from "@/services/live-games.service";

/**
 * Read-only live state for one game (public pages). `mode` sets the cost:
 * "live" fetches and keeps an SSE stream open, "once" fetches a single time,
 * "off" does nothing. `refresh` is returned for callers that add a poll.
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
  return { displayClock: useLiveClock(current), refresh, state: current };
}

/**
 * Subscribes to a game's live SSE stream (no-op for an empty `gameId`).
 * `onChange` receives the pushed state on every scorer change, and is called
 * WITHOUT a state on every (re)connect — reconnects (proxy timeout, phone
 * sleep/wake) replay nothing the client missed, so the caller resyncs.
 * The latest `onChange` is always used without reopening the stream.
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
    const stream = new EventSource(
      `${env.apiUrl}/api/v1/live-games/${gameId}/stream`,
    );
    stream.onopen = () => callback.current();
    stream.addEventListener("state_changed", (event) => {
      let state: LiveGameState | undefined;
      try {
        state = (
          JSON.parse((event as MessageEvent<string>).data) as {
            state?: LiveGameState;
          }
        ).state;
      } catch {
        // Malformed payload — fall back to a resync.
      }
      callback.current(state);
    });
    return () => stream.close();
  }, [gameId]);
}

/** Seconds left on the game clock, ticking locally once a second while it
 *  runs (the server only stores the value at the last change). */
export function useLiveClock(state: LiveGameState | null): number {
  const [displayClock, setDisplayClock] = useState(0);

  useEffect(() => {
    if (!state) return;
    const update = () => {
      const elapsed = state.clockRunning
        ? Math.floor((Date.now() - new Date(state.updatedAt).getTime()) / 1000)
        : 0;
      setDisplayClock(Math.max(0, state.clockSeconds - elapsed));
    };
    update();
    if (!state.clockRunning) return;
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [state]);

  return displayClock;
}

/** 1–4 → "Q1"…"Q4", 5+ → "OT1"… (four 12-minute quarters, 5-minute OTs). */
export function periodLabel(period: number): string {
  return period > 4 ? `OT${period - 4}` : `Q${period}`;
}

/** 463 → "07:43". */
export function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
