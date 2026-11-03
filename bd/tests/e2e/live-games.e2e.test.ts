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
  it('reports a running clock so viewers do not subtract elapsed time twice', async () => {
    await act({ type: 'reset' });
    await act({ running: true, seconds: 720, type: 'clock' });
    // Pretend the last scorer action was 60s ago (raw write: Prisma's
    // @updatedAt would otherwise stamp "now").
    await prisma.$runCommandRaw({
      update: 'LiveGame',
      updates: [
        {
          q: { gameId: { $oid: gameId } },
          u: { $set: { updatedAt: { $date: new Date(Date.now() - 60_000).toISOString() } } },
        },
      ],
    });

    const res = await request(app).get(`${API}/live-games/${gameId}`);
    const state = res.body.data.state as { clockSeconds: number; updatedAt: string };
    // What a viewer shows: clockSeconds minus the time since updatedAt.
    const shown =
      state.clockSeconds - Math.floor((Date.now() - new Date(state.updatedAt).getTime()) / 1000);
    expect(shown).toBeGreaterThanOrEqual(658);
    expect(shown).toBeLessThanOrEqual(661);
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
