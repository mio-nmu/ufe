import { describe, expect, it } from 'vitest';

import { compact } from '../../../src/utils/content-payloads.js';
import {
  createGameSchema,
  updateGameSchema,
} from '../../../src/validators/content/content.validators.js';

/** What the admin "new game" form sends when only the required fields are filled. */
const BLANK_FORM = {
  competition: null,
  isHome: true,
  note: null,
  opponent: 'NUM Falcons',
  opponentColor: null,
  opponentLogo: null,
  opponentScore: null,
  opponentShort: null,
  round: null,
  status: null,
  streamUrl: null,
  teamScore: null,
  ticketUrl: null,
  tipsAt: '2026-11-20T11:00:00.000Z',
  venue: null,
};

describe('createGameSchema', () => {
  it('accepts the blank admin form, leaving status to the database default', () => {
    const parsed = compact(createGameSchema.parse(BLANK_FORM));

    expect(parsed).not.toHaveProperty('status');
    expect(parsed).not.toHaveProperty('venue');
    expect(parsed).not.toHaveProperty('competition');
  });

  it('rejects an unknown status', () => {
    expect(createGameSchema.safeParse({ ...BLANK_FORM, status: 'LIVE' }).success).toBe(false);
  });
});

describe('updateGameSchema', () => {
  it('clears scores sent as null instead of dropping them', () => {
    const parsed = compact(updateGameSchema.parse({ opponentScore: null, teamScore: null }));

    expect(parsed).toEqual({ opponentScore: null, teamScore: null });
  });

  it('keeps the stored status when the select is left on "—"', () => {
    expect(compact(updateGameSchema.parse({ status: null }))).toEqual({});
  });

  it('saves entered scores and status', () => {
    const parsed = updateGameSchema.parse({ opponentScore: 65, status: 'FINAL', teamScore: 72 });

    expect(parsed).toEqual({ opponentScore: 65, status: 'FINAL', teamScore: 72 });
  });
});
