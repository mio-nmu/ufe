import { z } from 'zod';

import { VISIT_RANGES } from '../../config/constants.js';

const visitRanges = Object.keys(VISIT_RANGES) as [keyof typeof VISIT_RANGES];

export const visitStatsQuerySchema = z.object({
  range: z.enum(visitRanges).default('month'),
});
