import type { LiveGame, LiveGameEvent } from '../generated/prisma/index.js';

import { LIVE_PERIOD_SECONDS } from '../config/constants.js';
import { ApiError } from '../lib/ApiError.js';
import { emitLiveGameChanged } from '../lib/live-game-events.js';
import { prisma } from '../lib/prisma.js';
import { publishLiveGameState } from '../lib/realtime.js';

/** FIBA timing: four 10-minute quarters, then up to four 5-minute overtimes
 *  (period 5 = OT1). */
const PERIOD_SECONDS = LIVE_PERIOD_SECONDS;
const OVERTIME_SECONDS = 5 * 60;
const REGULATION_PERIODS = 4;
const MAX_PERIOD = 8;
const MAX_TIMEOUTS = 6;
const MAX_ON_FLOOR = 5;

/** How far in the past a tap's own timestamp is trusted. Older (a request
 *  stuck offline) falls back to this bound rather than rewinding the clock. */
const MAX_TAP_AGE_MS = 5000;

/** Attempts per action when another server instance wrote the same game
 *  between our read and our write. */
const MAX_WRITE_ATTEMPTS = 5;

/** The only events undo can reverse: clock, period, lineup and status
 *  changes are re-done by pressing the control again, never undone. */
const UNDOABLE_TYPES = ['score', 'adjust_score', 'foul', 'timeout'];

/** Per-instance FIFO so one scorer's burst applies in tap order without
 *  retry churn; cross-instance safety comes from the write check. */
const actionQueues = new Map<string, Promise<void>>();

/** What a scorer action returns: the new state plus the history entry it
 *  recorded (and, for undo, the event it reversed) so the scorer can update
 *  its log without refetching it. */
export interface ActionResult {
  event: LiveGameEvent;
  /** Set when the action moved the game to a new phase worth logging:
   *  the first tip-off (not a clock resume) or the final buzzer. */
  milestone?: 'FINISHED' | 'STARTED';
  reversedEventId?: string;
  state: LiveGameState;
}

/** Schedule-row change that rides along an end or reset. */
interface GameSync {
  opponentScore: null | number;
  status: 'FINAL' | 'SCHEDULED';
  teamScore: null | number;
}

/** Live state as clients see it: the clock is projected to `serverTime`. */
export interface LiveGameState extends ScoreboardFields {
  gameId: string;
  id: string;
  /** When the server produced this snapshot; clients count the running
   *  clock down from here (after correcting for their own clock offset). */
  serverTime: Date;
  updatedAt: Date;
}

type Action =
  | { amount: -1 | 1; period?: number; side: Side; type: 'foul' }
  | { amount: -1 | 1; side: Side; type: 'timeout' }
  | { amount: number; side: Side; type: 'adjust_score' }
  | { period: number; type: 'period' }
  | { playerIds: string[]; type: 'lineup' }
  | { points: 1 | 2 | 3; side: Side; type: 'score' }
  | { running: boolean; seconds?: number; type: 'clock' }
  | { seconds?: number; type: 'reset' }
  | { type: 'end' }
  | { type: 'halftime' }
  | { type: 'start' }
  | { type: 'undo' };

/** Every action may carry `at`: the tap moment in server time (ms). */
type TimedAction = Action & { at?: number };

/** The persisted scoreboard, minus identity and bookkeeping columns. */
interface ScoreboardFields {
  clockRunning: boolean;
  clockSeconds: number;
  endedAt: Date | null;
  lineup: string[];
  opponentFouls: number[];
  opponentScore: number;
  period: number;
  startedAt: Date | null;
  status: string;
  teamFouls: number[];
  teamScore: number;
  timeouts: number[];
}

type Side = 'opponent' | 'team';

/** Thrown inside the write transaction when the row changed since we read it. */
class StaleWriteError extends Error {}

export async function applyAction(gameId: string, action: TimedAction): Promise<ActionResult> {
  const previous = actionQueues.get(gameId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  actionQueues.set(gameId, queued);
  await previous;
  try {
    const result = await applyWithRetry(gameId, action);
    await broadcast(gameId, result.state);
    return result;
  } finally {
    release();
    if (actionQueues.get(gameId) === queued) actionQueues.delete(gameId);
  }
}

export async function ensureState(gameId: string): Promise<LiveGameState> {
  return toClientState(await ensureRow(gameId), Date.now());
}

/** Opponent name for activity-log labels; null when the game is gone. */
export async function getGameOpponent(gameId: string): Promise<null | string> {
  const game = await prisma.game.findUnique({ select: { opponent: true }, where: { id: gameId } });
  return game?.opponent ?? null;
}

export async function getState(gameId: string): Promise<LiveGameState | null> {
  const row = await prisma.liveGame.findUnique({ where: { gameId } });
  return row ? toClientState(row, Date.now()) : null;
}

export async function listEvents(gameId: string) {
  return prisma.liveGameEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    where: { gameId },
  });
}

/**
 * Optimistic concurrency: read, compute, then write only if the row is
 * unchanged (its updatedAt is the version). Another instance winning the
 * race makes us re-read and re-apply on top of its write — no lost taps.
 */
async function applyWithRetry(gameId: string, action: TimedAction): Promise<ActionResult> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await applyOnce(gameId, action);
    } catch (error) {
      if (!(error instanceof StaleWriteError) || attempt >= MAX_WRITE_ATTEMPTS) throw error;
    }
  }
}

async function applyOnce(gameId: string, action: TimedAction): Promise<ActionResult> {
  const row = await ensureRow(gameId);
  // Everything happens at the tap moment: a pause freezes the clock where
  // the scorer saw it, not where it was when the request arrived.
  const at = tapTime(action.at, anchorOf(row), Date.now());
  const before = projectClock(row, at);

  // An ended game is published on the schedule; changing the scoreboard
  // afterwards would make the two disagree. Reset reopens it.
  if (before.status === 'FINAL' && action.type !== 'reset') {
    throw ApiError.conflict('The game has ended — reset it to keep scoring');
  }

  if (action.type === 'undo') {
    const target = await findUndoableEvent(gameId);
    if (!target) throw ApiError.badRequest('Nothing to undo');
    const next = reduce(before, inverseOf(target.payload as unknown as Action));
    const { event, state } = await persist(row, next, at, {
      event: { payload: { eventId: target.id }, type: 'undo' },
      reverses: target.id,
    });
    return { event, reversedEventId: target.id, state };
  }

  const next = reduce(before, action);
  const { event, state } = await persist(row, next, at, {
    event: { payload: action, type: action.type },
    gameSync: scheduleSyncFor(action, before, next),
  });
  return { event, milestone: milestoneOf(action, before), state };
}

async function ensureRow(gameId: string): Promise<LiveGame> {
  const existing = await prisma.liveGame.findUnique({ where: { gameId } });
  if (existing) return existing;
  const game = await prisma.game.findUnique({ select: { id: true }, where: { id: gameId } });
  if (!game) throw ApiError.notFound('Game not found');
  return prisma.liveGame.upsert({
    create: {
      clockAnchorAt: new Date(),
      gameId,
      lineup: [],
      opponentFouls: emptyFouls(),
      teamFouls: emptyFouls(),
    },
    update: {},
    where: { gameId },
  });
}

/** The tap moment, bounded to [max(anchor, now - MAX_TAP_AGE_MS), now]:
 *  never in the future, never before the last recorded change. */
function tapTime(at: number | undefined, anchor: number, now: number): number {
  const earliest = Math.max(anchor, now - MAX_TAP_AGE_MS);
  return Math.min(now, Math.max(earliest, at ?? now));
}

function anchorOf(row: LiveGame): number {
  return (row.clockAnchorAt ?? row.updatedAt).getTime();
}

/** The stored scoreboard with a running clock wound forward to `at`. */
function projectClock(row: LiveGame, at: number): ScoreboardFields {
  const elapsed = row.clockRunning ? Math.max(0, (at - anchorOf(row)) / 1000) : 0;
  // Capped at the period length: rows saved under the old 12-minute
  // quarters read as a full 10:00 instead of an impossible 12:00.
  const stored = Math.min(row.clockSeconds, periodSeconds(row.period));
  const clockSeconds = Math.max(0, stored - elapsed);
  return {
    clockRunning: row.clockRunning && clockSeconds > 0,
    clockSeconds,
    endedAt: row.endedAt,
    lineup: [...row.lineup],
    opponentFouls: withFoulSlots(row.opponentFouls),
    opponentScore: row.opponentScore,
    period: row.period,
    startedAt: row.startedAt,
    status: row.status,
    teamFouls: withFoulSlots(row.teamFouls),
    teamScore: row.teamScore,
    timeouts: [...row.timeouts],
  };
}

async function findUndoableEvent(gameId: string): Promise<LiveGameEvent | null> {
  // Events from before a reset belong to a scoreboard that no longer exists.
  const lastReset = await prisma.liveGameEvent.findFirst({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { createdAt: true },
    where: { gameId, type: 'reset' },
  });
  return prisma.liveGameEvent.findFirst({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    where: {
      gameId,
      reversed: false,
      type: { in: UNDOABLE_TYPES },
      ...(lastReset ? { createdAt: { gt: lastReset.createdAt } } : {}),
    },
  });
}

/**
 * The game rules, as one pure step: scoreboard + action → next scoreboard.
 * Undo runs through here too (with the inverse action), so no rule is
 * written twice.
 */
function reduce(state: ScoreboardFields, action: Action): ScoreboardFields {
  const next: ScoreboardFields = {
    ...state,
    lineup: [...state.lineup],
    opponentFouls: [...state.opponentFouls],
    teamFouls: [...state.teamFouls],
    timeouts: [...state.timeouts],
  };
  switch (action.type) {
    case 'adjust_score':
      addPoints(next, action.side, action.amount);
      break;
    case 'clock':
      if (typeof action.seconds === 'number') {
        next.clockSeconds = clamp(action.seconds, 0, periodSeconds(next.period));
      }
      next.clockRunning = action.running && next.clockSeconds > 0;
      break;
    case 'end':
      next.status = 'FINAL';
      next.clockRunning = false;
      next.endedAt = new Date();
      break;
    case 'foul': {
      const fouls = action.side === 'team' ? next.teamFouls : next.opponentFouls;
      const slot = foulSlot(action.period ?? next.period);
      fouls[slot] = Math.max(0, (fouls[slot] ?? 0) + action.amount);
      break;
    }
    case 'halftime':
      next.status = 'HALFTIME';
      next.clockRunning = false;
      break;
    case 'lineup':
      // Any size up to five is legal: the scorer builds the floor tap-by-tap
      // and an empty list clears it.
      if (action.playerIds.length > MAX_ON_FLOOR) {
        throw ApiError.badRequest('At most five players can be on the floor');
      }
      next.lineup = action.playerIds;
      break;
    case 'period':
      next.period = clamp(action.period, 1, MAX_PERIOD);
      next.clockSeconds = periodSeconds(next.period);
      next.clockRunning = false;
      break;
    case 'reset':
      // Full manual reset — the escape hatch for a game started (or scored)
      // by mistake: everything returns to a clean pre-tip state.
      return {
        clockRunning: false,
        clockSeconds: clamp(action.seconds ?? PERIOD_SECONDS, 0, PERIOD_SECONDS),
        endedAt: null,
        lineup: [],
        opponentFouls: emptyFouls(),
        opponentScore: 0,
        period: 1,
        startedAt: null,
        status: 'NOT_STARTED',
        teamFouls: emptyFouls(),
        teamScore: 0,
        timeouts: [MAX_TIMEOUTS, MAX_TIMEOUTS],
      };
    case 'score':
      addPoints(next, action.side, action.points);
      break;
    case 'start':
      next.status = 'LIVE';
      next.clockRunning = next.clockSeconds > 0;
      next.startedAt = state.startedAt ?? new Date();
      break;
    case 'timeout': {
      const index = action.side === 'team' ? 0 : 1;
      next.timeouts[index] = clamp((next.timeouts[index] ?? 0) + action.amount, 0, MAX_TIMEOUTS);
      break;
    }
    case 'undo':
      throw ApiError.badRequest('Undo is resolved before the rules run');
  }
  return next;
}

/** The action that cancels an undoable one (same side, same period). */
function inverseOf(action: Action): Action {
  switch (action.type) {
    case 'adjust_score':
      return { amount: -action.amount, side: action.side, type: 'adjust_score' };
    case 'foul':
      return {
        amount: -action.amount as -1 | 1,
        period: action.period,
        side: action.side,
        type: 'foul',
      };
    case 'score':
      return { amount: -action.points, side: action.side, type: 'adjust_score' };
    case 'timeout':
      return { amount: -action.amount as -1 | 1, side: action.side, type: 'timeout' };
    default:
      throw ApiError.badRequest('This event cannot be undone automatically');
  }
}

/** The scoreboard and the schedule are one game: ending it publishes the
 *  result on the Game row; resetting a game that had ended reopens it. */
function scheduleSyncFor(
  action: Action,
  before: ScoreboardFields,
  next: ScoreboardFields,
): GameSync | undefined {
  if (action.type === 'end') {
    return { opponentScore: next.opponentScore, status: 'FINAL', teamScore: next.teamScore };
  }
  if (action.type === 'reset' && before.status === 'FINAL') {
    return { opponentScore: null, status: 'SCHEDULED', teamScore: null };
  }
  return undefined;
}

/** "Start" doubles as clock resume, so only the first tip-off is a milestone. */
function milestoneOf(action: Action, before: ScoreboardFields): ActionResult['milestone'] {
  if (action.type === 'start' && before.status === 'NOT_STARTED') return 'STARTED';
  if (action.type === 'end') return 'FINISHED';
  return undefined;
}

/**
 * Writes the next scoreboard (anchored at the tap moment), its history
 * event and any schedule change in one transaction — but only if nobody
 * else wrote the row since `row` was read.
 */
async function persist(
  row: LiveGame,
  next: ScoreboardFields,
  at: number,
  write: {
    event: { payload: object; type: string };
    gameSync?: GameSync;
    reverses?: string;
  },
): Promise<{ event: LiveGameEvent; state: LiveGameState }> {
  const [event, updated] = await prisma.$transaction(async (tx) => {
    const { count } = await tx.liveGame.updateMany({
      data: { ...next, clockAnchorAt: new Date(at) },
      where: { gameId: row.gameId, updatedAt: row.updatedAt },
    });
    if (count === 0) throw new StaleWriteError();
    if (write.reverses) {
      await tx.liveGameEvent.update({ data: { reversed: true }, where: { id: write.reverses } });
    }
    const created = await tx.liveGameEvent.create({
      data: { gameId: row.gameId, payload: write.event.payload, type: write.event.type },
    });
    if (write.gameSync) {
      await tx.game.update({ data: write.gameSync, where: { id: row.gameId } });
    }
    return [created, await tx.liveGame.findUniqueOrThrow({ where: { gameId: row.gameId } })];
  });
  return { event, state: toClientState(updated, Date.now()) };
}

/** Local stream (same-instance viewers) and hosted push (everyone else). */
async function broadcast(gameId: string, state: LiveGameState): Promise<void> {
  emitLiveGameChanged(gameId, state);
  await publishLiveGameState(gameId, state);
}

function toClientState(row: LiveGame, now: number): LiveGameState {
  return {
    ...projectClock(row, now),
    gameId: row.gameId,
    id: row.id,
    serverTime: new Date(now),
    updatedAt: row.updatedAt,
  };
}

function addPoints(state: ScoreboardFields, side: Side, points: number): void {
  if (side === 'team') state.teamScore = Math.max(0, state.teamScore + points);
  else state.opponentScore = Math.max(0, state.opponentScore + points);
}

/** FIBA: overtime team fouls carry on from the 4th quarter's count. */
function foulSlot(period: number): number {
  return Math.min(period, REGULATION_PERIODS) - 1;
}

function periodSeconds(period: number): number {
  return period > REGULATION_PERIODS ? OVERTIME_SECONDS : PERIOD_SECONDS;
}

function withFoulSlots(fouls: number[]): number[] {
  return Array.from({ length: REGULATION_PERIODS }, (_, i) => fouls[i] ?? 0);
}

function emptyFouls(): number[] {
  return Array.from({ length: REGULATION_PERIODS }, () => 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
