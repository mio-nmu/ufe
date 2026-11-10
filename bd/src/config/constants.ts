export const API_PREFIX = '/api/v1';

export const JWT_ISSUER = 'ufeedu-api';

export const REFRESH_TOKEN_COOKIE = 'uf_refresh';
export const SESSION_COOKIE = 'uf_session';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const REGISTRATION_CHART_DAYS = 14;

/**
 * Admin "Website visitors" ranges: how many buckets of which size each one
 * charts. The current (partial) bucket is the last point; the "vs prev"
 * comparison uses the same number of buckets immediately before.
 */
export const VISIT_RANGES = {
  month: { bucket: 'week', count: 5 },
  quarter: { bucket: 'week', count: 13 },
  year: { bucket: 'month', count: 12 },
} as const satisfies Record<string, { bucket: 'month' | 'week'; count: number }>;

/** FIBA quarter length; overtimes are 5 minutes (see live-games.service). */
export const LIVE_PERIOD_SECONDS = 10 * 60;

/** Months of games on the admin "Game timeline" chart. */
export const GAME_TIMELINE_MONTHS = 6;

// ─── Admin activity log ──────────────────────────────────────────────────────

export const ACTIVITY_ACTIONS = ['CREATED', 'UPDATED', 'DELETED', 'STARTED', 'FINISHED'] as const;

/** Every admin-managed subject that writes to the activity log. */
export const ACTIVITY_ENTITIES = [
  'executive',
  'game',
  'historyPhoto',
  'liveGame',
  'media',
  'mediaAlbum',
  'newsPost',
  'player',
  'shopProduct',
  'siteContent',
  'user',
  'video',
] as const;

export const USER_SORT_FIELDS = ['createdAt', 'updatedAt', 'email', 'name', 'role'] as const;

/**
 * Site-content allowlist: the only page/section pairs the singleton copy
 * store accepts. The future admin copy editor is generated from this map —
 * free-form JSON outside these keys is rejected server-side.
 */
export const SITE_CONTENT_PAGES = {
  contact: ['info'],
  'fan-club': ['page'],
  footer: ['social'],
  'front-office': ['hero'],
  general: ['brand', 'contact'],
  history: ['page'],
  home: ['fanmail', 'hero', 'news', 'stats', 'thanks', 'timeline'],
  photos: ['hero'],
  players: ['page'],
  schedule: ['hero'],
  videos: ['hero'],
} as const satisfies Record<string, readonly string[]>;

export const SITE_CONTENT_MAX_JSON_LENGTH = 8000;

// ─── Media uploads (Cloudinary) ──────────────────────────────────────────────

/** Verified from magic bytes — the client MIME/extension is never trusted. */
export const MEDIA_MIME_ALLOWLIST = [
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Optional upload subfolder inside the Cloudinary folder. */
export const MEDIA_FOLDER_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;

export const MEDIA_ALT_MAX_LENGTH = 200;

export const MEDIA_LIST_MAX_LIMIT = 100;

// ─── History photos (/history era archive) ───────────────────────────────────

/**
 * Year folders the /history page groups photos by: a plain year or a year
 * range ("1996", "1997-2000", "2026") — the keys the frontend era track
 * maps onto its panels.
 */
export const HISTORY_PHOTO_FOLDER_PATTERN = /^\d{4}(-\d{4})?$/;

export const HISTORY_PHOTO_CAPTION_MAX_LENGTH = 200;

export const HISTORY_PHOTO_SORT_MAX = 999;
