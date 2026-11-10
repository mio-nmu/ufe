import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../../src/lib/prisma.js';
import { createTestUser } from '../setup/factories.js';
import { API, app, login } from './helpers.js';

let bearer = '';
let gameId = '';

const act = (body: object) =>
  request(app).post(`${API}/live-games/${gameId}/action`).set('Authorization', bearer).send(body);

beforeAll(async () => {
  const admin = await createTestUser({ role: 'ADMIN' });
  bearer = `Bearer ${(await login(admin.email, admin.password)).accessToken}`;
  const game = await request(app)
    .post(`${API}/content/games`)
    .set('Authorization', bearer)
    .send({ opponent: 'Rival', tipsAt: '2092-01-10T11:00:00Z' });
  gameId = game.body.data.game.id as string;
  await request(app).post(`${API}/live-games/${gameId}/ensure`).set('Authorization', bearer);
});

describe('POST /live-games/:id/action', () => {
  it('returns the new state together with the event it recorded', async () => {
    const res = await act({ points: 3, side: 'team', type: 'score' });
    expect(res.status).toBe(200);
    expect(res.body.data.state).toMatchObject({ gameId, teamScore: 3 });
    expect(res.body.data.event).toMatchObject({ reversed: false, type: 'score' });
  });

  it('undo names the event it reversed', async () => {
    const scored = await act({ points: 2, side: 'team', type: 'score' });
    const res = await act({ type: 'undo' });
    expect(res.body.data.state.teamScore).toBe(3);
    expect(res.body.data.event.type).toBe('undo');
    expect(res.body.data.reversedEventId).toBe(scored.body.data.event.id);
  });

  it('rejects anonymous scorer actions', async () => {
    const res = await request(app)
      .post(`${API}/live-games/${gameId}/action`)
      .send({ type: 'start' });
    expect(res.status).toBe(401);
  });
});

/** A fresh game per test, so no test depends on another's scoreboard. */
async function freshGame() {
  const created = await request(app)
    .post(`${API}/content/games`)
    .set('Authorization', bearer)
    .send({ opponent: 'Fresh', tipsAt: '2092-03-01T11:00:00Z' });
  const id = created.body.data.game.id as string;
  // Open it the way the scorer page does, so the live record (and its clock
  // anchor) exists before any test takes a tap timestamp.
  await request(app).post(`${API}/live-games/${id}/ensure`).set('Authorization', bearer);
  const send = (body: object) =>
    request(app).post(`${API}/live-games/${id}/action`).set('Authorization', bearer).send(body);
  return { id, send };
}

describe('undo', () => {
  it('skips clock, period and lineup events to reach the last score', async () => {
    const { send } = await freshGame();
    await send({ points: 2, side: 'team', type: 'score' });
    await send({ running: false, type: 'clock' });
    await send({ period: 2, type: 'period' });
    await send({ playerIds: [], type: 'lineup' });

    const res = await send({ type: 'undo' });
    expect(res.status).toBe(200);
    expect(res.body.data.state.teamScore).toBe(0);
  });

  it('walks back one score per press instead of trying to undo the undo', async () => {
    const { send } = await freshGame();
    await send({ points: 2, side: 'team', type: 'score' });
    await send({ points: 3, side: 'team', type: 'score' });

    expect((await send({ type: 'undo' })).body.data.state.teamScore).toBe(2);
    expect((await send({ type: 'undo' })).body.data.state.teamScore).toBe(0);
    expect((await send({ type: 'undo' })).status).toBe(400);
  });

  it('never reaches back past a reset', async () => {
    const { send } = await freshGame();
    await send({ points: 3, side: 'team', type: 'score' });
    await send({ type: 'reset' });
    expect((await send({ type: 'undo' })).status).toBe(400);
  });
});

describe('ended games', () => {
  it('reject scoreboard changes until reset, so the schedule result stays true', async () => {
    const { id, send } = await freshGame();
    await send({ type: 'start' });
    await send({ points: 2, side: 'team', type: 'score' });
    await send({ type: 'end' });

    for (const body of [
      { points: 3, side: 'team', type: 'score' },
      { type: 'undo' },
      { type: 'end' },
      { type: 'start' },
    ]) {
      expect((await send(body)).status).toBe(409);
    }
    const row = await prisma.game.findUnique({ where: { id } });
    expect(row).toMatchObject({ status: 'FINAL', teamScore: 2 });
    expect((await send({ type: 'reset' })).status).toBe(200);
  });
});

describe('activity milestones', () => {
  it('logs the first tip-off once — resuming the clock is not a new start', async () => {
    const { id, send } = await freshGame();
    await send({ type: 'start' });
    await send({ running: false, type: 'clock' });
    await send({ type: 'start' });
    await send({ type: 'end' });

    const actions = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'asc' },
      select: { action: true },
      where: { entity: 'liveGame', entityId: id },
    });
    expect(actions.map((row) => row.action)).toEqual(['STARTED', 'FINISHED']);
  });
});

describe('clock limits', () => {
  it('caps a manually set time at the current period length', async () => {
    const { send } = await freshGame();
    await send({ period: 5, type: 'period' });
    const res = await send({ running: false, seconds: 600, type: 'clock' });
    expect(res.body.data.state.clockSeconds).toBe(300);
  });

  it('quarters are 10 minutes and nothing longer is accepted', async () => {
    const { send } = await freshGame();
    expect((await send({ type: 'reset' })).body.data.state.clockSeconds).toBe(600);
    expect((await send({ running: false, seconds: 601, type: 'clock' })).status).toBe(400);
  });
});

describe('clock stops at the tap', () => {
  it('freezes the clock where the scorer tapped, not when the request arrived', async () => {
    const { send } = await freshGame();
    // Both taps carry their own moment, so the result is exact however slow
    // the server is: the clock ran from startAt to stopAt — 0.5s.
    const startAt = Date.now();
    await send({ at: startAt, type: 'start' });
    await new Promise((resolve) => setTimeout(resolve, 800));
    const res = await send({ at: startAt + 500, running: false, type: 'clock' });

    expect(res.body.data.state.clockSeconds).toBeCloseTo(599.5, 2);
    expect(res.body.data.state.clockRunning).toBe(false);
  });

  it('keeps fractions of a second across many stoppages', async () => {
    const { send } = await freshGame();
    // Four explicit 0.3s runs; real time must pass first so no tap is in the future.
    const base = Date.now();
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await send({ at: base + i * 400, type: 'start' });
      await send({ at: base + i * 400 + 300, running: false, type: 'clock' });
    }
    const res = await send({ running: false, type: 'clock' });
    // 1.2s ran in total; whole-second rounding would have left 600 or 599.
    expect(res.body.data.state.clockSeconds).toBeCloseTo(598.8, 1);
  });

  it('never trusts a tap time from the future or more than 5s back', async () => {
    const { send } = await freshGame();
    await send({ type: 'start' });
    const future = await send({ at: Date.now() + 60_000, running: false, type: 'clock' });
    expect(future.body.data.state.clockSeconds).toBeLessThanOrEqual(600);
    await send({ type: 'start' });
    const stale = await send({ at: Date.now() - 60_000, running: false, type: 'clock' });
    expect(stale.body.data.state.clockSeconds).toBeGreaterThan(594);
  });
});

describe('overtime fouls', () => {
  it('carry on from the 4th quarter count (FIBA)', async () => {
    const { send } = await freshGame();
    await send({ period: 4, type: 'period' });
    await send({ amount: 1, period: 4, side: 'team', type: 'foul' });
    await send({ period: 5, type: 'period' });
    const res = await send({ amount: 1, period: 5, side: 'team', type: 'foul' });
    expect(res.body.data.state.teamFouls).toEqual([0, 0, 0, 2]);
  });
});

describe('game result sync', () => {
  const gameRow = async () =>
    (await request(app).get(`${API}/content/games?limit=100`)).body.data.items.find(
      (g: { id: string }) => g.id === gameId,
    ) as { opponentScore: null | number; status: string; teamScore: null | number };

  it('ending the game publishes the final score on the schedule row', async () => {
    await act({ type: 'reset' });
    await act({ type: 'start' });
    await act({ points: 3, side: 'team', type: 'score' });
    await act({ points: 2, side: 'opponent', type: 'score' });
    await act({ type: 'end' });
    expect(await gameRow()).toMatchObject({ opponentScore: 2, status: 'FINAL', teamScore: 3 });
  });

  it('resetting an ended game reopens the schedule row', async () => {
    await act({ type: 'reset' });
    expect(await gameRow()).toMatchObject({
      opponentScore: null,
      status: 'SCHEDULED',
      teamScore: null,
    });
  });

  it('overtime periods start a 5-minute clock', async () => {
    const res = await act({ period: 5, type: 'period' });
    expect(res.status).toBe(200);
    expect(res.body.data.state).toMatchObject({ clockSeconds: 300, period: 5 });
    expect((await act({ period: 9, type: 'period' })).status).toBe(400);
  });
});

describe('GET /live-games/:id clock', () => {
  it('projects a running clock to serverTime so viewers count down from there', async () => {
    const { id, send } = await freshGame();
    await send({ running: true, seconds: 600, type: 'clock' });
    // Pretend the clock started 60s ago (raw write — Prisma would stamp now).
    await prisma.$runCommandRaw({
      update: 'LiveGame',
      updates: [
        {
          q: { gameId: { $oid: id } },
          u: { $set: { clockAnchorAt: { $date: new Date(Date.now() - 60_000).toISOString() } } },
        },
      ],
    });

    const res = await request(app).get(`${API}/live-games/${id}`);
    const state = res.body.data.state as { clockSeconds: number; serverTime: string };
    // What a viewer shows: clockSeconds minus the time since serverTime.
    const shown = state.clockSeconds - (Date.now() - new Date(state.serverTime).getTime()) / 1000;
    expect(shown).toBeGreaterThan(539);
    expect(shown).toBeLessThanOrEqual(540.5);
  });

  it('reads a row saved under 12-minute quarters as a full 10:00', async () => {
    const { id, send } = await freshGame();
    await send({ type: 'reset' });
    await prisma.liveGame.update({ data: { clockSeconds: 720 }, where: { gameId: id } });
    const res = await request(app).get(`${API}/live-games/${id}`);
    expect(res.body.data.state.clockSeconds).toBe(600);
  });
});

describe('DELETE /content/games/:id', () => {
  it('removes the game together with its live scoreboard and events', async () => {
    const created = await request(app)
      .post(`${API}/content/games`)
      .set('Authorization', bearer)
      .send({ opponent: 'Doomed', tipsAt: '2092-02-01T11:00:00Z' });
    const id = created.body.data.game.id as string;
    await request(app).post(`${API}/live-games/${id}/ensure`).set('Authorization', bearer);
    await request(app)
      .post(`${API}/live-games/${id}/action`)
      .set('Authorization', bearer)
      .send({ type: 'start' });

    const res = await request(app)
      .delete(`${API}/content/games/${id}`)
      .set('Authorization', bearer);
    expect(res.status).toBe(200);
    expect(await prisma.liveGame.count({ where: { gameId: id } })).toBe(0);
    expect(await prisma.liveGameEvent.count({ where: { gameId: id } })).toBe(0);
  });
});
