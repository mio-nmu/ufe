import { z } from 'zod';

import {
  HISTORY_PHOTO_CAPTION_MAX_LENGTH,
  HISTORY_PHOTO_FOLDER_PATTERN,
  HISTORY_PHOTO_SORT_MAX,
} from '../../config/constants.js';
import { idParamSchema } from '../shared.js';

export { idParamSchema };

// ── Shared field builders ────────────────────────────────────────────────────
// Contract: a MISSING key stays missing (Prisma column default / untouched
// PATCH field). An EMPTY STRING normalises to null for nullable text columns.
// No `.default()` here — the database owns the defaults, so a PATCH payload
// can never silently reset a field.

const text = (max: number) => z.string().trim().min(1).max(max);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value === '' || value === null ? null : value));

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.number().int().min(min).max(max).optional(),
  );

const optionalFloat = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.number().min(min).max(max).optional(),
  );

const optionalDate = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.coerce.date().optional(),
);

const boolFlag = z.preprocess((value) => {
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return value;
}, z.boolean());

// Accepts a comma-separated string or a real array of tags.
const stringList = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
      : value,
  // 300 matches the player-achievement budget — seeded executive bullets
  // run 60–85 chars, and the old 48 cap made any edit of those rows fail.
  z.array(z.string().trim().min(1).max(300)).max(12).optional(),
);

const optionalBool = boolFlag.optional();

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(140),
});

// ── News ─────────────────────────────────────────────────────────────────────
const newsFields = {
  category: z.string().trim().min(1).max(60).optional(),
  content: text(50_000),
  coverImage: optionalText(600),
  excerpt: text(600),
  isFeatured: optionalBool,
  isPublished: optionalBool,
  publishedAt: optionalDate,
  slug: text(140),
  sortOrder: optionalInt(0, 9999),
  tags: stringList,
  title: text(200),
};

export const createNewsSchema = z.object(newsFields);

// ── Update variants: everything optional (essentials included) ───────────────
export const updateNewsSchema = createNewsSchema.partial();

export const listNewsQuerySchema = z.object({
  category: z.string().trim().min(1).max(60).optional(),
  featured: boolFlag.optional(),
  // ADMIN-only: include unpublished rows (requires a valid admin bearer).
  includeHidden: boolFlag.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// ── Players ──────────────────────────────────────────────────────────────────
const playerRoleEnum = z.enum(['COACH', 'PLAYER', 'STAFF']);

/** Roster-card display extras stored as the Player.profile JSON blob. */
const playerProfileSchema = z.object({
  achievements: z.array(text(300)).max(30).optional(),
  major: optionalText(80),
  motto: optionalText(160),
  pregame: optionalText(300),
  reason: optionalText(160),
  roleLabel: optionalText(80),
  yearsOnTeam: optionalText(40),
  yearsPlaying: optionalText(40),
});

const playerFields = {
  academicYear: optionalText(40),
  actionPhoto: optionalText(600),
  apg: optionalFloat(0, 30),
  bio: optionalText(5000),
  birthYear: optionalInt(1950, 2015),
  heightCm: optionalInt(120, 250),
  hometown: optionalText(80),
  isCaptain: optionalBool,
  isPublic: optionalBool,
  name: text(80),
  number: optionalInt(0, 99),
  photo: optionalText(600),
  photoPosition: optionalInt(0, 100),
  photoScale: optionalInt(40, 150),
  position: optionalText(60),
  ppg: optionalFloat(0, 60),
  profile: playerProfileSchema.nullish(),
  role: playerRoleEnum.optional(),
  rpg: optionalFloat(0, 30),
  slug: text(140),
  sortOrder: optionalInt(0, 9999),
  weightKg: optionalInt(40, 200),
};

export const createPlayerSchema = z.object(playerFields);

export const updatePlayerSchema = createPlayerSchema.partial();

export const listPlayersQuerySchema = z.object({
  includeHidden: boolFlag.optional(), // ADMIN-only
  role: playerRoleEnum.optional(),
});

// ── Games ────────────────────────────────────────────────────────────────────
const gameStatusEnum = z.enum(['CANCELLED', 'FINAL', 'SCHEDULED']);

const gameFields = {
  competition: z.string().trim().min(1).max(160).optional(),
  isHome: optionalBool,
  note: optionalText(500),
  opponent: text(120),
  // #RRGGBB only — it is written into a style attribute on the public site.
  // Absent → untouched (PATCH); '' or null → cleared.
  opponentColor: z.preprocess(
    (value) => (value === '' ? null : value),
    z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'opponentColor must be a #RRGGBB hex colour')
      .nullish(),
  ),
  opponentLogo: optionalText(600),
  opponentScore: optionalInt(0, 300),
  opponentShort: optionalText(12),
  round: optionalText(80),
  sortOrder: optionalInt(0, 9999),
  status: gameStatusEnum.optional(),
  streamUrl: optionalText(600),
  teamScore: optionalInt(0, 300),
  ticketUrl: optionalText(600),
  tipsAt: z.coerce.date(),
  venue: z.string().trim().min(1).max(120).optional(),
};

export const createGameSchema = z.object(gameFields);

export const updateGameSchema = createGameSchema.partial();

export const listGamesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM')
    .optional(),
  status: gameStatusEnum.optional(),
});

// ── Media albums ─────────────────────────────────────────────────────────────
const albumCategoryEnum = z.enum(['COMMUNITY', 'EVENTS', 'GAMES']);

const albumImageSchema = z.object({
  caption: optionalText(200),
  url: z.string().trim().min(1).max(600),
});

const albumFields = {
  category: albumCategoryEnum.optional(),
  coverImage: optionalText(600),
  eventDate: optionalDate,
  images: z.array(albumImageSchema).max(80).optional(),
  isPublished: optionalBool,
  slug: text(140),
  sortOrder: optionalInt(0, 9999),
  title: text(160),
};

export const createAlbumSchema = z.object(albumFields);

export const updateAlbumSchema = createAlbumSchema.partial();

export const listAlbumsQuerySchema = z.object({
  category: albumCategoryEnum.optional(),
  includeHidden: boolFlag.optional(), // ADMIN-only
});

// ── History photos (/history era archive) ────────────────────────────────────

const historyPhotoFields = {
  caption: optionalText(HISTORY_PHOTO_CAPTION_MAX_LENGTH),
  folder: z.string().trim().regex(HISTORY_PHOTO_FOLDER_PATTERN, {
    message: 'folder must be a year or year range (e.g. "1996", "1997-2000")',
  }),
  /** A publicId already registered in the media library — url is read from
   *  that row, so a photo row can never carry a fabricated URL. */
  publicId: z.string().trim().min(1).max(300),
  sortOrder: optionalInt(0, HISTORY_PHOTO_SORT_MAX),
};

export const createHistoryPhotoSchema = z.object(historyPhotoFields);

export const updateHistoryPhotoSchema = createHistoryPhotoSchema.partial();

export type CreateHistoryPhotoInput = z.infer<typeof createHistoryPhotoSchema>;

export type UpdateHistoryPhotoInput = z.infer<typeof updateHistoryPhotoSchema>;

// ── Executives (front office tabs + /staff team-staff cards) ─────────────────
const executiveGroupEnum = z.enum(['BUSINESS', 'COACHES', 'OPERATIONS', 'OWNERSHIP', 'STAFF']);

/** Bio-drawer detail sections on the /staff cards. */
const staffSectionsSchema = z
  .array(
    z.object({
      heading: text(80),
      list: z.array(text(300)).max(20).optional(),
      text: optionalText(2000),
    }),
  )
  .max(12)
  .nullish();

const executiveFields = {
  bio: optionalText(5000),
  bullets: stringList,
  group: executiveGroupEnum.optional(),
  isPublic: optionalBool,
  name: text(120),
  photo: optionalText(600),
  sections: staffSectionsSchema,
  slug: text(140),
  sortOrder: optionalInt(0, 9999),
  title: text(160),
};

export const createExecutiveSchema = z.object(executiveFields);

export const updateExecutiveSchema = createExecutiveSchema.partial();

export const listExecutivesQuerySchema = z.object({
  group: executiveGroupEnum.optional(),
  includeHidden: boolFlag.optional(), // ADMIN-only
});

// ── Videos ───────────────────────────────────────────────────────────────────
const videoCategoryEnum = z.enum(['BEHIND_THE_SCENES', 'HIGHLIGHTS', 'INTERVIEWS', 'PRESS']);

const videoFields = {
  category: videoCategoryEnum.optional(),
  durationSec: optionalInt(0, 36_000),
  isFeatured: optionalBool,
  isPublished: optionalBool,
  publishedAt: optionalDate,
  slug: text(140),
  sortOrder: optionalInt(0, 9999),
  thumbnail: optionalText(600),
  title: text(200),
  videoUrl: optionalText(600),
  // Accepts a full URL too — the controller normalizes it to the 11-char ID.
  youtubeId: optionalText(600),
};

export const createVideoSchema = z.object(videoFields);

export const updateVideoSchema = createVideoSchema.partial();

export const listVideosQuerySchema = z.object({
  category: videoCategoryEnum.optional(),
  featured: boolFlag.optional(),
  includeHidden: boolFlag.optional(), // ADMIN-only
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// ── Shop products (fan club) ─────────────────────────────────────────────────
const shopCategoryEnum = z.enum(['GEAR', 'HATS', 'HOODIES', 'JERSEYS', 'KIDS', 'TEES']);

const shopFields = {
  badge: optionalText(40),
  category: shopCategoryEnum.optional(),
  compareAtPrice: optionalInt(0, 100_000_000),
  image: optionalText(600),
  isVisible: optionalBool,
  name: text(200),
  price: z.coerce.number().int().min(0).max(100_000_000),
  sizes: stringList,
  slug: text(140),
  sortOrder: optionalInt(0, 9999),
  url: optionalText(600),
};

export const createShopProductSchema = z.object(shopFields);

export const updateShopProductSchema = createShopProductSchema.partial();

export const listShopQuerySchema = z.object({
  category: shopCategoryEnum.optional(),
  includeHidden: boolFlag.optional(), // ADMIN-only
});

// ── Site content (singleton copy, allowlisted by page/section) ───────────────
export const siteContentPutSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

export type SiteContentPutInput = z.infer<typeof siteContentPutSchema>;

export const pageParamSchema = z.object({
  page: z.string().trim().min(1).max(40),
});

export const sectionParamSchema = z.object({
  page: z.string().trim().min(1).max(40),
  section: z.string().trim().min(1).max(40),
});
