export type Role = "USER" | "ADMIN";

/** Mirrors bd/src/queries/user/user.queries.ts SAFE_USER_SELECT. */
export interface User {
  id: string;
  email: string;
  /** Named staff login (manager / editor / edumanager); null for plain accounts. */
  username: null | string;
  name: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export type ActivityAction =
  "CREATED" | "UPDATED" | "DELETED" | "STARTED" | "FINISHED";

export type ActivityEntity =
  | "executive"
  | "game"
  | "historyPhoto"
  | "liveGame"
  | "media"
  | "mediaAlbum"
  | "newsPost"
  | "player"
  | "shopProduct"
  | "siteContent"
  | "user"
  | "video";

/** One admin write from the activity log, newest first. */
export interface ActivityEntry {
  id: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string | null;
  /** Subject name snapshot taken at write time. */
  label: string;
  actorEmail: string | null;
  createdAt: string;
}

/** Games per calendar month for the dashboard "Game timeline". */
export interface GameTimeline {
  /** Oldest first; `start` is the month's first UTC day (YYYY-MM-DD). */
  months: { start: string; count: number }[];
}

export type VisitRange = "month" | "quarter" | "year";

/** Homepage visits per bucket for one admin dashboard range. */
export interface VisitSeries {
  range: VisitRange;
  bucket: "week" | "month";
  /** Oldest first; `start` is the bucket's first UTC day (YYYY-MM-DD). */
  buckets: { start: string; count: number }[];
  total: number;
  /** Same number of buckets immediately before the charted ones. */
  previousTotal: number;
}

export interface AuthPayload {
  user: User;
  accessToken: string;
}

/** The one error shape the API ever returns: { success: false, error: {...} } */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Array<{ path: string; message: string }>;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}
