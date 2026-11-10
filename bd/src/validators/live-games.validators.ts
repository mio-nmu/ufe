import { z } from 'zod';

import { LIVE_PERIOD_SECONDS } from '../config/constants.js';

/** One scorer action; the per-type requirements are enforced below. */
export const liveGameActionSchema = z
  .object({
    amount: z.number().int().min(-300).max(300).optional(),
    /** The tap moment in server time (epoch ms), from the scorer's
     *  offset-corrected clock; the service bounds how far back it trusts it. */
    at: z.number().int().positive().optional(),
    period: z.number().int().min(1).max(8).optional(), // 5–8 = OT1–OT4
    playerIds: z.array(z.string().min(1)).max(5).optional(),
    points: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    running: z.boolean().optional(),
    seconds: z.number().int().min(0).max(LIVE_PERIOD_SECONDS).optional(),
    side: z.enum(['team', 'opponent']).optional(),
    type: z.enum([
      'score',
      'adjust_score',
      'foul',
      'timeout',
      'clock',
      'period',
      'lineup',
      'halftime',
      'start',
      'end',
      'reset',
      'undo',
    ]),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'score' && (!value.side || !value.points))
      ctx.addIssue({
        code: 'custom',
        message: 'Score actions require side and points',
        path: ['side'],
      });
    if (value.type === 'adjust_score' && (!value.side || value.amount === undefined))
      ctx.addIssue({
        code: 'custom',
        message: 'Adjustments require side and amount',
        path: ['side'],
      });
    if (value.type === 'timeout' && (!value.side || (value.amount !== 1 && value.amount !== -1)))
      ctx.addIssue({
        code: 'custom',
        message: 'Timeout actions require a side and +/-1 amount',
        path: ['amount'],
      });
    if (value.type === 'foul' && (!value.side || (value.amount !== 1 && value.amount !== -1)))
      ctx.addIssue({
        code: 'custom',
        message: 'Foul actions require a side and +/-1 amount',
        path: ['amount'],
      });
    if (value.type === 'clock' && value.running === undefined)
      ctx.addIssue({ code: 'custom', message: 'Clock actions require running', path: ['running'] });
    if (value.type === 'period' && value.period === undefined)
      ctx.addIssue({ code: 'custom', message: 'Period actions require period', path: ['period'] });
    if (value.type === 'lineup' && !value.playerIds)
      ctx.addIssue({
        code: 'custom',
        message: 'Lineup actions require playerIds',
        path: ['playerIds'],
      });
  });
