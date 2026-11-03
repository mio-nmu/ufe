import type { LiveGameEvent } from '../generated/prisma/index.js';

import { ApiError } from '../lib/ApiError.js';
import { emitLiveGameChanged } from '../lib/live-game-events.js';
import { prisma } from '../lib/prisma.js';

const PERIOD_SECONDS = 12 * 60;
/** Four quarters, then up to four 5-minute overtimes (period 5 = OT1). */
const REGULATION_PERIODS = 4;
const MAX_PERIOD = 8;
const OVERTIME_SECONDS = 5 * 60;

const actionQueues = new Map<string, Promise<void>>();

/** What a scorer action returns: the new state plus the history entry it
 *  recorded (and, for undo, the event it reversed) so the scorer can update
 *  its log without refetching it. */
export interface ActionResult {
  event: LiveGameEvent;
  reversedEventId?: string;
  state: LiveGameState;
}

export interface LiveGameState {
  clockRunning: boolean;
  clockSeconds: number;
  endedAt: Date | null;
  gameId: string;
  id: string;
  lineup: string[];
  opponentFouls: number[];
  opponentScore: number;
  period: number;
  startedAt: Date | null;
  status: string;
  teamFouls: number[];
  teamScore: number;
  timeouts: number[];
  updatedAt: Date;
}

type Action =
  | { amount: -1 | 1; period: number; side: 'opponent' | 'team'; type: 'foul' }
  | { amount: -1 | 1; side: 'opponent' | 'team'; type: 'timeout' }
  | { amount: number; side: 'opponent' | 'team'; type: 'adjust_score' }
  | { period: number; type: 'period' }
  | { playerIds: string[]; type: 'lineup' }
  | { points: 1 | 2 | 3; side: 'opponent' | 'team'; type: 'score' }
  | { running: boolean; seconds?: number; type: 'clock' }
  | { seconds?: number; type: 'reset' }
  | { type: 'end' }
  | { type: 'halftime' }
  | { type: 'start' }
  | { type: 'undo' };

export async function applyAction(gameId: string, action: Action): Promise<ActionResult> {
  const previous = actionQueues.get(gameId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  actionQueues.set(gameId, queued);
  await previous;
  try {
    return await applyActionInQueue(gameId, action);
  } finally {
    release();
    if (actionQueues.get(gameId) === queued) actionQueues.delete(gameId);
  }
}

async function applyActionInQueue(gameId: string, action: Action): Promise<ActionResult> {
  // The row normally exists (the scorer calls /ensure when opening a game);
  // fall back to ensureState only on first use.
  const existing = await prisma.liveGame.findUnique({ where: { gameId } });
  const state = existing ? normalise(existing as LiveGameState) : await ensureState(gameId);
  if (action.type === 'undo') {
    const event = await prisma.liveGameEvent.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { gameId, reversed: false },
    });
    if (!event) throw ApiError.badRequest('No event to undo');
    const payload = event.payload as Partial<Action>;
    const inverse = { ...state };
    if (payload.type === 'score' && payload.side && payload.points) {
      if (payload.side === 'team')
        inverse.teamScore = Math.max(0, inverse.teamScore - payload.points);
      else inverse.opponentScore = Math.max(0, inverse.opponentScore - payload.points);
    } else if (payload.type === 'adjust_score' && payload.side && payload.amount !== undefined) {
      if (payload.side === 'team')
        inverse.teamScore = Math.max(0, inverse.teamScore - payload.amount);
      else inverse.opponentScore = Math.max(0, inverse.opponentScore - payload.amount);
    } else if (payload.type === 'foul' && payload.side && payload.amount) {
      const fouls = payload.side === 'team' ? inverse.teamFouls : inverse.opponentFouls;
      fouls[(payload.period ?? inverse.period) - 1] = Math.max(
        0,
        (fouls[(payload.period ?? inverse.period) - 1] ?? 0) - payload.amount,
      );
    } else if (payload.type === 'timeout' && payload.side) {
      const index = payload.side === 'team' ? 0 : 1;
      inverse.timeouts[index] = Math.max(
        0,
        Math.min(6, (inverse.timeouts[index] ?? 0) - (payload.amount ?? -1)),
      );
    } else {
      throw ApiError.badRequest('This event cannot be undone automatically');
    }
    const [created, updated] = await prisma.$transaction(async (tx) => {
      await tx.liveGameEvent.update({ data: { reversed: true }, where: { id: event.id } });
      const undoEvent = await tx.liveGameEvent.create({
        data: { gameId, payload: { eventId: event.id }, type: 'undo' },
      });
      const row = await tx.liveGame.update({
        data: {
          opponentFouls: inverse.opponentFouls,
          opponentScore: inverse.opponentScore,
          teamFouls: inverse.teamFouls,
          teamScore: inverse.teamScore,
          timeouts: inverse.timeouts,
        },
        where: { gameId },
      });
      return [undoEvent, row] as const;
    });
    const next = normalise(updated as LiveGameState);
    emitLiveGameChanged(gameId, next);
    return { event: created, reversedEventId: event.id, state: next };
  }
  const data: Record<string, unknown> = {};
  let status = state.status;
  let period = state.period;
  let clockSeconds = state.clockSeconds;
  let clockRunning = state.clockRunning;
  let teamScore = state.teamScore;
  let opponentScore = state.opponentScore;
  let teamFouls = [...state.teamFouls];
  let opponentFouls = [...state.opponentFouls];
  let timeouts = [...state.timeouts];
  let lineup = [...state.lineup];

  if (action.type === 'score') {
    if (action.side === 'team') teamScore += action.points;
    else opponentScore += action.points;
  } else if (action.type === 'adjust_score') {
    if (action.side === 'team') teamScore = Math.max(0, teamScore + action.amount);
    else opponentScore = Math.max(0, opponentScore + action.amount);
  } else if (action.type === 'foul') {
    const fouls = action.side === 'team' ? teamFouls : opponentFouls;
    fouls[period - 1] = Math.max(0, (fouls[period - 1] ?? 0) + action.amount);
  } else if (action.type === 'timeout') {
    const index = action.side === 'team' ? 0 : 1;
    timeouts[index] = Math.max(0, Math.min(6, (timeouts[index] ?? 0) + action.amount));
  } else if (action.type === 'clock') {
    if (typeof action.seconds === 'number')
      clockSeconds = Math.max(0, Math.min(PERIOD_SECONDS, action.seconds));
    clockRunning = action.running && clockSeconds > 0;
  } else if (action.type === 'period') {
    period = Math.max(1, Math.min(MAX_PERIOD, action.period));
    clockSeconds = periodSeconds(period);
    clockRunning = false;
  } else if (action.type === 'lineup') {
    // Any size up to five is legal: the scorer builds the floor tap-by-tap
    // (1st..5th player each send an interim lineup) and an empty list
    // clears it — demanding exactly five would reject every step but the last.
    if (action.playerIds.length > 5)
      throw ApiError.badRequest('At most five players can be on the floor');
    lineup = action.playerIds;
  } else if (action.type === 'halftime') {
    status = 'HALFTIME';
    clockRunning = false;
  } else if (action.type === 'start') {
    status = 'LIVE';
    clockRunning = true;
    data.startedAt = state.startedAt ?? new Date();
  } else if (action.type === 'end') {
    status = 'FINAL';
    clockRunning = false;
    data.endedAt = new Date();
  } else if (action.type === 'reset') {
    // Full manual reset — the scorer's escape hatch for a game started (or
    // scored) by mistake: everything returns to a clean pre-tip state.
    status = 'NOT_STARTED';
    period = 1;
    clockSeconds =
      typeof action.seconds === 'number'
        ? Math.max(0, Math.min(PERIOD_SECONDS, action.seconds))
        : PERIOD_SECONDS;
    clockRunning = false;
    teamScore = 0;
    opponentScore = 0;
    teamFouls = [0, 0, 0, 0];
    opponentFouls = [0, 0, 0, 0];
    timeouts = [6, 6];
    lineup = [];
    data.startedAt = null;
    data.endedAt = null;
  }

  const [created, updated] = await prisma.$transaction(async (tx) => {
    const event = await tx.liveGameEvent.create({
      data: { gameId, payload: action, type: action.type },
    });
    // The scoreboard and the schedule are one game: ending it publishes the
    // result on the Game row; resetting a game the scorer had ended reopens it.
    if (action.type === 'end') {
      await tx.game.update({
        data: { opponentScore, status: 'FINAL', teamScore },
        where: { id: gameId },
      });
    } else if (action.type === 'reset' && state.status === 'FINAL') {
      await tx.game.update({
        data: { opponentScore: null, status: 'SCHEDULED', teamScore: null },
        where: { id: gameId },
      });
    }
    const row = await tx.liveGame.update({
      data: {
        ...data,
        clockRunning,
        clockSeconds,
        lineup,
        opponentFouls,
        opponentScore,
        period,
        status,
        teamFouls,
        teamScore,
        timeouts,
      },
      where: { gameId },
    });
    return [event, row] as const;
  });
  const next = normalise(updated as LiveGameState);
  emitLiveGameChanged(gameId, next);
  return { event: created, state: next };
}

const periodSeconds = (period: number) =>
  period > REGULATION_PERIODS ? OVERTIME_SECONDS : PERIOD_SECONDS;

export async function ensureState(gameId: string): Promise<LiveGameState> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw ApiError.notFound('Game not found');
  const state = await prisma.liveGame.upsert({
    create: { gameId, lineup: [], teamFouls: [0, 0, 0, 0] },
    update: {},
    where: { gameId },
  });
  return normalise(state as LiveGameState);
}

export async function getState(gameId: string): Promise<LiveGameState | null> {
  const state = await prisma.liveGame.findUnique({ where: { gameId } });
  return state ? normalise(state as LiveGameState) : null;
}

export async function listEvents(gameId: string) {
  return prisma.liveGameEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    where: { gameId },
  });
}

/**
 * Projects a stored row to "now": a running clock has `clockSeconds` as of
 * `updatedAt`, so the elapsed whole seconds are burned in AND `updatedAt`
 * moves forward by the same amount — clients tick down from `updatedAt`, so
 * leaving the old timestamp would subtract the elapsed time twice.
 */
function normalise(state: LiveGameState): LiveGameState {
  const now = Date.now();
  const elapsed =
    state.clockRunning && state.updatedAt
      ? Math.max(0, Math.floor((now - state.updatedAt.getTime()) / 1000))
      : 0;
  return {
    ...state,
    clockRunning: state.clockRunning && state.clockSeconds - elapsed > 0,
    clockSeconds: Math.max(0, state.clockSeconds - elapsed),
    opponentFouls: state.opponentFouls ?? [0, 0, 0, 0],
    teamFouls: state.teamFouls ?? [0, 0, 0, 0],
    updatedAt: elapsed > 0 ? new Date(state.updatedAt.getTime() + elapsed * 1000) : state.updatedAt,
  };
}
