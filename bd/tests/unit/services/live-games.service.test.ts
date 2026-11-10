import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as liveGames from '../../../src/services/live-games.service.js';

// Persistence and both broadcast channels mocked wholesale: these tests pin
// the cross-instance write race, which one in-process queue can never show.
const tx = {
  game: { update: vi.fn() },
  liveGame: { findUniqueOrThrow: vi.fn(), updateMany: vi.fn() },
  liveGameEvent: { create: vi.fn(), update: vi.fn() },
};
vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((work: (client: typeof tx) => unknown) => work(tx)),
    game: { findUnique: vi.fn() },
    liveGame: { findUnique: vi.fn(), upsert: vi.fn() },
    liveGameEvent: { findFirst: vi.fn() },
  },
}));
vi.mock('../../../src/lib/realtime.js', () => ({ publishLiveGameState: vi.fn() }));
vi.mock('../../../src/lib/live-game-events.js', () => ({ emitLiveGameChanged: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { publishLiveGameState } = await import('../../../src/lib/realtime.js');

const mockedLiveGame = vi.mocked(prisma.liveGame);

/** A stored LiveGame row, as another instance may have just rewritten it. */
function row(teamScore: number, updatedAt: string) {
  return {
    clockAnchorAt: null,
    clockRunning: false,
    clockSeconds: 600,
    createdAt: new Date('2026-11-04T10:00:00Z'),
    endedAt: null,
    gameId: 'g1',
    id: 'l1',
    lineup: [],
    opponentFouls: [0, 0, 0, 0],
    opponentScore: 0,
    period: 1,
    startedAt: null,
    status: 'LIVE',
    teamFouls: [0, 0, 0, 0],
    teamScore,
    timeouts: [6, 6],
    updatedAt: new Date(updatedAt),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.liveGameEvent.create.mockResolvedValue({ id: 'e1', type: 'score' });
});

describe('applyAction write race', () => {
  it('re-reads and re-applies when another instance wrote first, losing no points', async () => {
    // Our first read sees 10; another instance then writes 12 before us.
    mockedLiveGame.findUnique
      .mockResolvedValueOnce(row(10, '2026-11-04T10:00:00.000Z') as never)
      .mockResolvedValueOnce(row(12, '2026-11-04T10:00:01.000Z') as never);
    tx.liveGame.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    tx.liveGame.findUniqueOrThrow.mockResolvedValue(row(13, '2026-11-04T10:00:02.000Z'));

    const result = await liveGames.applyAction('g1', { points: 1, side: 'team', type: 'score' });

    expect(tx.liveGame.updateMany).toHaveBeenCalledTimes(2);
    // The retry is built on the winner's 12, guarded by the winner's version.
    expect(tx.liveGame.updateMany).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ teamScore: 13 }),
      where: { gameId: 'g1', updatedAt: new Date('2026-11-04T10:00:01.000Z') },
    });
    expect(tx.liveGameEvent.create).toHaveBeenCalledTimes(1);
    expect(result.state.teamScore).toBe(13);
    expect(publishLiveGameState).toHaveBeenCalledWith('g1', result.state);
  });

  it('gives up after repeated conflicts instead of looping forever', async () => {
    mockedLiveGame.findUnique.mockResolvedValue(row(10, '2026-11-04T10:00:00.000Z') as never);
    tx.liveGame.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      liveGames.applyAction('g1', { points: 2, side: 'team', type: 'score' }),
    ).rejects.toThrow();
    expect(tx.liveGame.updateMany).toHaveBeenCalledTimes(5);
    expect(publishLiveGameState).not.toHaveBeenCalled();
  });
});
