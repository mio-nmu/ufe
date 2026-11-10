import type { ActivityAction, ActivityEntity, ActivityEntry } from '../../types/index.js';

import { prisma } from '../../lib/prisma.js';

export interface NewActivity {
  action: ActivityAction;
  actorEmail?: string;
  actorId?: string;
  entity: ActivityEntity;
  entityId?: string;
  label: string;
}

export async function insertActivity(data: NewActivity): Promise<void> {
  await prisma.activityLog.create({ data });
}

export async function listActivity(skip: number, take: number): Promise<ActivityEntry[]> {
  const rows = await prisma.activityLog.findMany({
    // ObjectIds grow monotonically — the tiebreak for writes in the same millisecond.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      action: true,
      actorEmail: true,
      createdAt: true,
      entity: true,
      entityId: true,
      id: true,
      label: true,
    },
    skip,
    take,
  });
  // Stored as validated strings (Mongo has no enums); written only via NewActivity.
  return rows as ActivityEntry[];
}

export async function countActivity(): Promise<number> {
  return prisma.activityLog.count();
}
