import type { Request, Response } from 'express';

import { subscribeLiveGameEvents } from '../lib/live-game-events.js';
import { recordActivity } from '../services/admin/activity.service.js';
import * as liveGames from '../services/live-games.service.js';
import { ok } from '../utils/http.js';

export async function action(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await liveGames.applyAction(id, req.body);
  // Scorer clicks are too granular for the activity feed — only the
  // milestones (first tip-off, final buzzer) are logged.
  if (result.milestone) await recordMilestone(req, result.milestone, result.state);
  ok(res, result);
}

export async function ensureState(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  ok(res, { state: await liveGames.ensureState(id) });
}

export async function getState(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const state = await liveGames.getState(id);
  ok(res, { state });
}

export async function listEvents(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  ok(res, { events: await liveGames.listEvents(id) });
}

export function stream(req: Request, res: Response): void {
  const { id } = req.params as { id: string };
  res.status(200);
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Content-Type', 'text/event-stream');
  res.flushHeaders();
  res.write(`event: ready\ndata: ${JSON.stringify({ gameId: id })}\n\n`);

  const unsubscribe = subscribeLiveGameEvents((event) => {
    if (event.gameId === id) res.write(`event: state_changed\ndata: ${JSON.stringify(event)}\n\n`);
  });
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

async function recordMilestone(
  req: Request,
  action: 'FINISHED' | 'STARTED',
  state: liveGames.LiveGameState,
): Promise<void> {
  const opponent = (await liveGames.getGameOpponent(state.gameId)) ?? 'opponent';
  const score = action === 'FINISHED' ? ` ${state.teamScore}–${state.opponentScore}` : '';
  await recordActivity(req.user, {
    action,
    entity: 'liveGame',
    entityId: state.gameId,
    label: `vs ${opponent}${score}`,
  });
}
