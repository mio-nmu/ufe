import type { NewActivity } from '../../queries/admin/activity.queries.js';
import type { ActivityEntry, AuthUser, Paginated } from '../../types/index.js';
import type { ListQuery } from '../../utils/pagination.js';

import { logger } from '../../lib/logger.js';
import * as activityQueries from '../../queries/admin/activity.queries.js';
import { buildPaginationMeta } from '../../utils/pagination.js';

/** Labels are snapshots for display; long free text is cut to keep rows small. */
const LABEL_MAX_LENGTH = 160;

export type ActivityInput = Omit<NewActivity, 'actorEmail' | 'actorId'>;

/**
 * Appends one admin write to the activity log. Called AFTER the write has
 * succeeded; a logging failure is reported but never fails the request the
 * admin already saw succeed.
 */
export async function recordActivity(
  actor: AuthUser | undefined,
  input: ActivityInput,
): Promise<void> {
  try {
    await activityQueries.insertActivity({
      ...input,
      actorEmail: actor?.email,
      actorId: actor?.id,
      label: truncate(input.label.trim() || '—'),
    });
  } catch (error) {
    logger.warn({ err: error, input }, 'Could not record admin activity');
  }
}

export async function listActivity(
  query: Pick<ListQuery, 'page' | 'pageSize'>,
): Promise<Paginated<ActivityEntry>> {
  const [items, total] = await Promise.all([
    activityQueries.listActivity((query.page - 1) * query.pageSize, query.pageSize),
    activityQueries.countActivity(),
  ]);
  return { items, meta: buildPaginationMeta(total, query) };
}

/** Name for an uploaded image: its caption/alt text, else the file part of
 *  the storage publicId ("ufeedu/history/1996-team" → "1996-team"). */
export function assetLabel(name: null | string | undefined, publicId: string): string {
  return name?.trim() || (publicId.split('/').at(-1) ?? publicId);
}

function truncate(label: string): string {
  return label.length > LABEL_MAX_LENGTH ? `${label.slice(0, LABEL_MAX_LENGTH - 1)}…` : label;
}
