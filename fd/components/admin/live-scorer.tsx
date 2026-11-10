"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import {
  foulSlot,
  formatClock,
  periodLabel,
  periodSeconds,
  secondsLeft,
  useLiveClock,
  useLiveGameStream,
} from "@/hooks/use-live-game";
import { revalidatePublicTag } from "@/lib/admin/revalidate";
import { serverNow } from "@/lib/server-clock";
import {
  liveGamesService,
  type LiveGameEvent,
  type LiveGameState,
} from "@/services/live-games.service";
import type { GameRow, PlayerRow } from "@/types/content";

/** All scorer times are shown in Ulaanbaatar time, never the browser's. */
const ubTime = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  timeZone: "Asia/Ulaanbaatar",
});
const ubDay = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Ulaanbaatar",
});

/** Finished games kept in the picker for corrections after the buzzer. */
const RECENT_FINAL_LIMIT = 20;

export function LiveScorer() {
  const [upcomingGames, setUpcomingGames] = useState<GameRow[]>([]);
  const [finishedGames, setFinishedGames] = useState<GameRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [gameId, setGameId] = useState("");
  const [state, setState] = useState<LiveGameState | null>(null);
  const [events, setEvents] = useState<LiveGameEvent[]>([]);
  const [newOpponent, setNewOpponent] = useState("");
  const [newTipsAt, setNewTipsAt] = useState("");
  const [clockInput, setClockInput] = useState("");

  // Burst guard: the operator taps faster than the server answers. Only the
  // most recently issued action may land its authoritative state — an older
  // response resolving late (basket, then and-one, on a slow connection)
  // would otherwise revert the score the operator already saw.
  const lastActionSeq = useRef(0);
  const actionsInFlight = useRef(0);
  const gameIdRef = useRef("");

  /** Server state fetched by GETs (ensure, SSE refresh, error resync) may
   *  only land when no action is in flight: a pending action's projection
   *  is newer than anything a GET can return. */
  const applyServerState = useCallback((next: LiveGameState | null): void => {
    if (!next || actionsInFlight.current > 0) return;
    setState(next);
  }, []);

  useEffect(() => {
    // Upcoming soonest-first and recent results newest-first: a plain list
    // is oldest-first and capped, so new games would fall off its end.
    void Promise.all([
      api.get<{ items: GameRow[] }>(
        "/api/v1/content/games?status=SCHEDULED&limit=100",
      ),
      api.get<{ items: GameRow[] }>(
        `/api/v1/content/games?status=FINAL&limit=${RECENT_FINAL_LIMIT}`,
      ),
      api.get<{ items: PlayerRow[] }>("/api/v1/content/players?role=PLAYER"),
    ])
      .then(([upcomingResult, finishedResult, playerResult]) => {
        const upcomingIds = new Set(upcomingResult.items.map((g) => g.id));
        setUpcomingGames(upcomingResult.items);
        setFinishedGames(
          finishedResult.items.filter((g) => !upcomingIds.has(g.id)),
        );
        setPlayers(playerResult.items);
        const initial =
          closestGame(upcomingResult.items, Date.now()) ??
          finishedResult.items[0];
        if (initial) setGameId(initial.id);
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Could not load scorer data",
        ),
      );
  }, []);

  useEffect(() => {
    if (!gameId) return;
    let active = true;
    gameIdRef.current = gameId;
    void liveGamesService
      .ensure(gameId)
      .then(({ state: next }) => {
        if (active) applyServerState(next);
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Could not load live game",
        ),
      );
    void liveGamesService
      .events(gameId)
      .then(({ events: next }) => {
        if (active) setEvents(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [gameId, applyServerState]);

  // Pushed state on every scorer change; a full resync on stream (re)open. A
  // response for a game the operator has since switched away from is dropped.
  useLiveGameStream(gameId, (pushed) => {
    if (pushed) {
      if (gameIdRef.current === gameId) applyServerState(pushed);
      return;
    }
    void liveGamesService
      .get(gameId)
      .then(({ state: next }) => {
        if (gameIdRef.current === gameId) applyServerState(next);
      })
      .catch(() => undefined);
  });

  const selectedGame = useMemo(
    () =>
      [...upcomingGames, ...finishedGames].find((game) => game.id === gameId),
    [upcomingGames, finishedGames, gameId],
  );
  const selectedLineup = state?.lineup ?? [];

  const displayClock = useLiveClock(state);

  async function createGame() {
    if (!newOpponent.trim() || !newTipsAt) return;
    try {
      const result = await api.post<{ game: GameRow }>(
        "/api/v1/content/games",
        {
          opponent: newOpponent.trim(),
          // The picker's value is Ulaanbaatar wall time — anchor it to
          // +08:00 instead of the admin's machine timezone.
          tipsAt: new Date(`${newTipsAt}:00+08:00`).toISOString(),
        },
      );
      setUpcomingGames((current) =>
        [...current, result.game].sort((a, b) =>
          a.tipsAt.localeCompare(b.tipsAt),
        ),
      );
      setGameId(result.game.id);
      setNewOpponent("");
      setNewTipsAt("");
      toast.success("Game created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create game",
      );
    }
  }

  function action(payload: Record<string, unknown>) {
    if (!gameId) return;
    // Reflect the action locally first so every control reacts instantly;
    // the last action's response replaces the projections when it lands.
    // Stamp the tap in server time: the server freezes or starts the clock
    // at this moment, not when the request happens to arrive.
    const tapAt = serverNow();
    const seq = ++lastActionSeq.current;
    setState((current) =>
      current ? projectAction(current, payload, tapAt) : current,
    );
    actionsInFlight.current += 1;
    let failed = false;
    liveGamesService
      .action(gameId, { ...payload, at: Math.round(tapAt) })
      .then(({ event, reversedEventId, state: next }) => {
        // End / reset change the schedule row: refresh the public pages now.
        if (payload.type === "end" || payload.type === "reset") {
          void revalidatePublicTag("games");
        }
        if (gameIdRef.current !== gameId) return;
        // The server serialises actions per game, so the NEWEST response
        // carries every queued effect. Anything older is dropped rather than
        // reverting the score on screen.
        if (seq === lastActionSeq.current) setState(next);
        // Every response still lands its history entry, newest first.
        setEvents((current) =>
          [
            event,
            ...current.map((row) =>
              row.id === reversedEventId ? { ...row, reversed: true } : row,
            ),
          ].slice(0, 100),
        );
      })
      .catch((error) => {
        failed = true;
        toast.error(error instanceof Error ? error.message : "Action failed");
      })
      .finally(() => {
        actionsInFlight.current = Math.max(0, actionsInFlight.current - 1);
        if (failed) {
          // Resync so a failed action rolls the projection back to reality
          // instead of leaving a phantom local change.
          void liveGamesService
            .get(gameId)
            .then(({ state: fresh }) => {
              if (gameIdRef.current === gameId) applyServerState(fresh);
            })
            .catch(() => undefined);
        }
      });
  }

  function setCustomClock() {
    const max = periodSeconds(state?.period ?? 1);
    const seconds = parseClock(clockInput, max);
    if (seconds === null) {
      toast.error(
        `Enter the time as m:ss, e.g. 4:30 (max ${formatClock(max)})`,
      );
      return;
    }
    action({ running: false, seconds, type: "clock" });
    setClockInput("");
  }

  function togglePlayer(id: string) {
    const next = selectedLineup.includes(id)
      ? selectedLineup.filter((playerId) => playerId !== id)
      : [...selectedLineup, id];
    if (next.length <= 5) void action({ type: "lineup", playerIds: next });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Live scorer</h1>
        <p className="text-muted-foreground">
          Operate the selected game from a phone or tablet.
        </p>
      </div>
      <select
        className="border-input bg-background h-10 w-full rounded-md border px-3"
        value={gameId}
        onChange={(event) => setGameId(event.target.value)}
      >
        <option value="">Select a game</option>
        {upcomingGames.length ? (
          <optgroup label="Upcoming">
            {upcomingGames.map((game) => (
              <option key={game.id} value={game.id}>
                {game.opponent} · {ubStamp(game.tipsAt)}
              </option>
            ))}
          </optgroup>
        ) : null}
        {finishedGames.length ? (
          <optgroup label="Finished">
            {finishedGames.map((game) => (
              <option key={game.id} value={game.id}>
                {game.opponent} · {ubStamp(game.tipsAt)}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {state && selectedGame ? (
        <>
          <section className="bg-card grid gap-4 rounded-xl border p-4 shadow-sm md:grid-cols-3">
            <div className="flex items-center justify-between md:col-span-3">
              <span className="text-muted-foreground">
                {periodLabel(state.period)} · {state.status}
              </span>
              <strong className="text-4xl tabular-nums">
                {formatClock(displayClock)}
              </strong>
            </div>
            <div className="bg-brand rounded-lg p-4 text-center text-white">
              <p className="text-sm">UFE</p>
              <strong className="text-5xl">{state.teamScore}</strong>
              <p>Fouls: {state.teamFouls[foulSlot(state.period)] ?? 0}</p>
            </div>
            <div className="bg-paper-soft rounded-lg p-4 text-center">
              <p className="text-sm">{selectedGame.opponent}</p>
              <strong className="text-5xl">{state.opponentScore}</strong>
              <p>Fouls: {state.opponentFouls[foulSlot(state.period)] ?? 0}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                className="col-span-2 h-14 text-lg"
                variant={state.clockRunning ? "destructive" : "default"}
                disabled={state.status === "LIVE" && displayClock <= 0}
                onClick={() => action(clockToggleAction(state))}
              >
                {clockToggleLabel(state)}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => void action({ type: "halftime" })}
              >
                Halftime
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => {
                  if (window.confirm("End this game?"))
                    void action({ type: "end" });
                }}
              >
                End game
              </Button>
            </div>
            <div className="bg-muted/40 grid gap-2 rounded-lg p-3 md:col-span-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Clock</span>
                <Input
                  aria-label="Custom clock time"
                  className="w-24"
                  inputMode="numeric"
                  placeholder="7:43"
                  value={clockInput}
                  onChange={(event) => setClockInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setCustomClock();
                  }}
                />
                <Button size="lg" variant="outline" onClick={setCustomClock}>
                  Set time
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() =>
                    void action({
                      running: false,
                      seconds: periodSeconds(state.period),
                      type: "clock",
                    })
                  }
                >
                  Reset {formatClock(periodSeconds(state.period))}
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Reset the whole game? Score, fouls, timeouts, lineup and the clock are cleared.",
                      )
                    )
                      void action({ type: "reset" });
                  }}
                >
                  Reset game
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Set time stops the clock at the entered time — press Start clock
                to run it. Reset game wipes everything back to a fresh pre-tip
                state.
              </p>
            </div>
          </section>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border p-4 md:col-span-2">
              <h2 className="font-semibold">Score controls</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    label: "UFE",
                    side: "team" as const,
                    score: state.teamScore,
                    fouls: state.teamFouls[foulSlot(state.period)] ?? 0,
                  },
                  {
                    label: selectedGame.opponent,
                    side: "opponent" as const,
                    score: state.opponentScore,
                    fouls: state.opponentFouls[foulSlot(state.period)] ?? 0,
                  },
                ].map((team) => (
                  <div
                    key={team.side}
                    className="bg-muted/40 space-y-3 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{team.label}</h3>
                      <span className="text-2xl font-bold tabular-nums">
                        {team.score}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((points) => (
                        <Button
                          size="lg"
                          key={`plus-${points}`}
                          onClick={() =>
                            void action({
                              type: "score",
                              side: team.side,
                              points,
                            })
                          }
                        >
                          +{points}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((points) => (
                        <Button
                          size="lg"
                          key={`minus-${points}`}
                          variant="outline"
                          onClick={() =>
                            void action({
                              type: "adjust_score",
                              side: team.side,
                              amount: -points,
                            })
                          }
                        >
                          -{points}
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">Team fouls: {team.fouls}</span>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() =>
                          void action({
                            type: "foul",
                            side: team.side,
                            amount: 1,
                            period: state.period,
                          })
                        }
                      >
                        +1 foul
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() =>
                          void action({
                            type: "foul",
                            side: team.side,
                            amount: -1,
                            period: state.period,
                          })
                        }
                      >
                        -1 foul
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {[
                  {
                    label: "UFE",
                    side: "team" as const,
                    remaining: state.timeouts[0] ?? 0,
                  },
                  {
                    label: "Opponent",
                    side: "opponent" as const,
                    remaining: state.timeouts[1] ?? 0,
                  },
                ].map((team) => (
                  <div
                    key={team.side}
                    className="flex items-center justify-between gap-2 rounded-md border p-2"
                  >
                    <span className="text-sm">
                      {team.label} timeouts: <strong>{team.remaining}</strong>
                    </span>
                    <span className="flex gap-1">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() =>
                          void action({
                            type: "timeout",
                            side: team.side,
                            amount: 1,
                          })
                        }
                      >
                        +1
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() =>
                          void action({
                            type: "timeout",
                            side: team.side,
                            amount: -1,
                          })
                        }
                      >
                        -1
                      </Button>
                    </span>
                  </div>
                ))}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => void action({ type: "undo" })}
                >
                  Undo last
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4].map((period) => (
                  <Button
                    size="lg"
                    key={period}
                    variant={state.period === period ? "default" : "outline"}
                    onClick={() => void action({ type: "period", period })}
                  >
                    Q{period}
                  </Button>
                ))}
                {/* Overtime: the current OT when in one, else the next. */}
                <Button
                  size="lg"
                  variant={state.period > 4 ? "default" : "outline"}
                  disabled={state.period >= 8}
                  onClick={() =>
                    void action({
                      type: "period",
                      period: Math.max(state.period, 4) + 1,
                    })
                  }
                >
                  {state.period > 4 ? `${periodLabel(state.period)} +` : "OT"}
                </Button>
              </div>
            </div>
            <div className="space-y-3 rounded-xl border p-4">
              <h2 className="font-semibold">
                Players on floor ({selectedLineup.length}/5)
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {players.map((player) => (
                  <Button
                    size="lg"
                    key={player.id}
                    variant={
                      selectedLineup.includes(player.id) ? "default" : "outline"
                    }
                    onClick={() => togglePlayer(player.id)}
                  >
                    {player.number ?? "—"} · {player.name}
                  </Button>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-xl border p-4">
            <h2 className="mb-3 font-semibold">Event history</h2>
            <div className="max-h-48 space-y-1 overflow-auto text-sm">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="text-muted-foreground border-b py-1"
                >
                  {event.type} · {ubTime.format(new Date(event.createdAt))}
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="max-w-xl space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">Create a scheduled game</h2>
          <p className="text-muted-foreground text-sm">
            No game exists yet. Create the Sunday game here, then select it to
            start scoring.
          </p>
          <Input
            value={newOpponent}
            onChange={(event) => setNewOpponent(event.target.value)}
            placeholder="Opponent name"
          />
          <Input
            value={newTipsAt}
            onChange={(event) => setNewTipsAt(event.target.value)}
            type="datetime-local"
          />
          <Button
            size="lg"
            onClick={() => void createGame()}
            disabled={!newOpponent.trim() || !newTipsAt}
          >
            Create game
          </Button>
        </section>
      )}
    </div>
  );
}

/**
 * Instant local projection of a scorer action so the controls react on
 * click, before the server confirms. Server state always wins when the
 * POST resolves; undo (which depends on server history) skips the
 * projection and simply awaits. Exported for unit tests.
 */
export function projectAction(
  current: LiveGameState,
  payload: Record<string, unknown>,
  atServerMs: number = serverNow(),
): LiveGameState {
  // Re-anchor at the tap: the exact clock the scorer saw at that moment
  // becomes the new snapshot, so the display never jumps.
  const next: LiveGameState = {
    ...current,
    clockSeconds: secondsLeft(current, atServerMs),
    serverTime: new Date(atServerMs).toISOString(),
  };
  const foulKey = (side: string) =>
    side === "team" ? "teamFouls" : "opponentFouls";
  const timeoutIndex = (side: string) => (side === "team" ? 0 : 1);

  switch (payload.type) {
    case "start":
      next.status = "LIVE";
      next.clockRunning = next.clockSeconds > 0;
      break;
    case "clock": {
      const seconds =
        payload.seconds === undefined
          ? next.clockSeconds
          : Math.max(
              0,
              Math.min(periodSeconds(next.period), Number(payload.seconds)),
            );
      next.clockSeconds = seconds;
      next.clockRunning = Boolean(payload.running) && seconds > 0;
      break;
    }
    case "reset": {
      next.status = "NOT_STARTED";
      next.period = 1;
      next.clockSeconds =
        payload.seconds === undefined
          ? periodSeconds(1)
          : Math.max(0, Math.min(periodSeconds(1), Number(payload.seconds)));
      next.clockRunning = false;
      next.teamScore = 0;
      next.opponentScore = 0;
      next.teamFouls = [0, 0, 0, 0];
      next.opponentFouls = [0, 0, 0, 0];
      next.timeouts = [6, 6];
      next.lineup = [];
      next.startedAt = null;
      next.endedAt = null;
      break;
    }
    case "halftime":
      next.status = "HALFTIME";
      next.clockRunning = false;
      break;
    case "end":
      next.status = "FINAL";
      next.clockRunning = false;
      break;
    case "period":
      // Mirrors the server: a new period stops the clock at its full length.
      next.period = Number(payload.period ?? next.period);
      next.clockSeconds = periodSeconds(next.period);
      next.clockRunning = false;
      break;
    case "score": {
      const points = Number(payload.points ?? 0);
      if (payload.side === "team") next.teamScore += points;
      else next.opponentScore += points;
      break;
    }
    case "adjust_score": {
      const amount = Number(payload.amount ?? 0);
      if (payload.side === "team")
        next.teamScore = Math.max(0, next.teamScore + amount);
      else next.opponentScore = Math.max(0, next.opponentScore + amount);
      break;
    }
    case "foul": {
      const key = foulKey(String(payload.side));
      const slot = foulSlot(Number(payload.period ?? next.period));
      const fouls = [...next[key]];
      fouls[slot] = Math.max(
        0,
        (fouls[slot] ?? 0) + Number(payload.amount ?? 0),
      );
      next[key] = fouls;
      break;
    }
    case "timeout": {
      const index = timeoutIndex(String(payload.side));
      const timeouts = [...next.timeouts];
      timeouts[index] = Math.max(
        0,
        (timeouts[index] ?? 0) + Number(payload.amount ?? 0),
      );
      next.timeouts = timeouts;
      break;
    }
    case "lineup":
      next.lineup = (payload.playerIds as string[]) ?? next.lineup;
      break;
    default:
      return current;
  }
  return next;
}

/** The scheduled game whose tip-off is nearest to `now` — tonight's game,
 *  not the oldest one never marked final. */
function closestGame(games: GameRow[], now: number): GameRow | undefined {
  const distance = (game: GameRow) =>
    Math.abs(new Date(game.tipsAt).getTime() - now);
  return games.reduce<GameRow | undefined>(
    (best, game) => (!best || distance(game) < distance(best) ? game : best),
    undefined,
  );
}

/** The one clock button: tip off, resume after a break, or stop/start
 *  the running game clock. */
function clockToggleAction(state: LiveGameState): Record<string, unknown> {
  if (state.status !== "LIVE") return { type: "start" };
  return { running: !state.clockRunning, type: "clock" };
}

function clockToggleLabel(state: LiveGameState): string {
  if (state.status === "NOT_STARTED") return "Start game";
  if (state.status !== "LIVE") return "Resume game";
  return state.clockRunning ? "Stop clock" : "Start clock";
}

/** "7:43" → 463 seconds; null when it isn't a valid m:ss within `max`. */
function parseClock(value: string, max: number): number | null {
  const match = value.trim().match(/^(\d{1,2}):([0-5]?\d)$/);
  if (!match) return null;
  const seconds = Number(match[1]) * 60 + Number(match[2]);
  return seconds <= max ? seconds : null;
}

function ubStamp(iso: string): string {
  return `${ubDay.format(new Date(iso))} · ${ubTime.format(new Date(iso))}`;
}
