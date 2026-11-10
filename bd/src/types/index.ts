import type { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES } from '../config/constants.js';

/** One admin write, newest first in the dashboard feed. */
export interface ActivityEntry {
  action: ActivityAction;
  actorEmail: null | string;
  createdAt: Date;
  entity: ActivityEntity;
  entityId: null | string;
  id: string;
  label: string;
}

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export type ActivityEntity = (typeof ACTIVITY_ENTITIES)[number];

export interface AdminStats {
  registrations: DailyCount[];
  users: {
    active: number;
    admins: number;
    total: number;
  };
}

/** Authenticated principal attached by the `authenticate` middleware. */
export interface AuthUser {
  email: string;
  id: string;
  role: Role;
}

export interface DailyCount {
  count: number;
  date: string; // YYYY-MM-DD
}

/** Games per calendar month for the dashboard "Game timeline". */
export interface GameTimeline {
  /** Oldest first; `start` is the month's first UTC day (YYYY-MM-DD). */
  months: { count: number; start: string }[];
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  hasNext: boolean;
  hasPrev: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type Role = 'ADMIN' | 'USER';

/** User shape safe to send to clients — never includes passwordHash. */
export interface SafeUser {
  createdAt: Date;
  email: string;
  id: string;
  isActive: boolean;
  name: null | string;
  role: Role;
  updatedAt: Date;
  /** Named staff login (manager / editor / edumanager); null for plain accounts. */
  username: null | string;
}

export type VisitRange = 'month' | 'quarter' | 'year';

/** Homepage visits per bucket for one admin dashboard range. */
export interface VisitSeries {
  bucket: 'month' | 'week';
  /** Oldest first; `start` is the bucket's first UTC day (YYYY-MM-DD). */
  buckets: { count: number; start: string }[];
  /** Same number of buckets immediately before the charted ones. */
  previousTotal: number;
  range: VisitRange;
  total: number;
}
