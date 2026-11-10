import { Router } from 'express';

import * as historyPhotos from '../../controllers/content/history-photos.controller.js';
import * as siteContent from '../../controllers/content/site-content.controller.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { prisma } from '../../lib/prisma.js';
import { publicReadCache } from '../../middleware/publicReadCache.js';
import { requireAdmin } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { extractYouTubeId, youTubeThumbUrl } from '../../utils/youtube.js';
import {
  createAlbumSchema,
  createExecutiveSchema,
  createGameSchema,
  createHistoryPhotoSchema,
  createNewsSchema,
  createPlayerSchema,
  createShopProductSchema,
  createVideoSchema,
  idParamSchema,
  listAlbumsQuerySchema,
  listExecutivesQuerySchema,
  listGamesQuerySchema,
  listNewsQuerySchema,
  listPlayersQuerySchema,
  listShopQuerySchema,
  listVideosQuerySchema,
  pageParamSchema,
  sectionParamSchema,
  siteContentPutSchema,
  updateAlbumSchema,
  updateExecutiveSchema,
  updateGameSchema,
  updateHistoryPhotoSchema,
  updateNewsSchema,
  updatePlayerSchema,
  updateShopProductSchema,
  updateVideoSchema,
} from '../../validators/content/content.validators.js';
import { mountCrud, when } from './crud-router.js';

/**
 * Team site content surface, mounted at /api/v1/content.
 *
 * Public side only ever GETs (unauthenticated, ISR-cached upstream). Every
 * write verb is guarded by authenticate + requireRole('ADMIN') — the same
 * resource path serves both sides; the verb decides the auth. Plain
 * collections go through mountCrud(); history photos (Cloudinary-backed) and
 * site copy (page/section blobs) keep dedicated handlers.
 */

export const contentRouter = Router();

// Public GETs (no Authorization header) are browser/CDN-cacheable for 60s;
// writes and authed reads are never cached.
contentRouter.use(publicReadCache);

// ── News (мэдээ) ─────────────────────────────────────────────────────────────
mountCrud(contentRouter, '/news', {
  activity: { entity: 'newsPost', label: (row) => String(row.title) },
  key: 'post',
  list: (query, hidden) => ({
    orderBy: { publishedAt: 'desc' },
    take: (query.limit as number | undefined) ?? 50,
    where: {
      ...(hidden ? {} : { isPublished: true }),
      ...when('category', query.category),
      ...when('isFeatured', query.featured),
    },
  }),
  listQuery: listNewsQuerySchema,
  model: 'newsPost',
  schemas: { create: createNewsSchema, update: updateNewsSchema },
  slug: { notFound: 'News post not found', where: { isPublished: true } },
  supportsHidden: true,
});

// ── Players (багийн бүрэлдэхүүн) ─────────────────────────────────────────────
mountCrud(contentRouter, '/players', {
  activity: { entity: 'player', label: (row) => String(row.name) },
  key: 'player',
  list: (query, hidden) => ({
    orderBy: [{ sortOrder: 'asc' }, { number: 'asc' }],
    where: { ...(hidden ? {} : { isPublic: true }), ...when('role', query.role) },
  }),
  listQuery: listPlayersQuerySchema,
  model: 'player',
  schemas: { create: createPlayerSchema, update: updatePlayerSchema },
  slug: { notFound: 'Player not found', where: { isPublic: true } },
  supportsHidden: true,
});

// ── Games (хуваарь & үр дүн) ─────────────────────────────────────────────────
// Scheduled games list soonest-first, finished games most-recent-first;
// month=YYYY-MM narrows to that calendar month.
mountCrud(contentRouter, '/games', {
  activity: { entity: 'game', label: (row) => `vs ${String(row.opponent)}` },
  // A deleted game takes its live scoreboard and event history with it.
  beforeDelete: (gameId) =>
    prisma.$transaction([
      prisma.liveGameEvent.deleteMany({ where: { gameId } }),
      prisma.liveGame.deleteMany({ where: { gameId } }),
    ]),
  key: 'game',
  list: (query) => {
    const month = query.month as string | undefined;
    const start = month ? new Date(`${month}-01T00:00:00.000Z`) : null;
    const end = start ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1)) : null;
    return {
      orderBy: { tipsAt: query.status === 'FINAL' ? 'desc' : 'asc' },
      take: (query.limit as number | undefined) ?? 100,
      where: {
        ...when('status', query.status),
        ...(start && end ? { tipsAt: { gte: start, lt: end } } : {}),
      },
    };
  },
  listQuery: listGamesQuerySchema,
  model: 'game',
  schemas: { create: createGameSchema, update: updateGameSchema },
});

// ── Media albums (галерей) ───────────────────────────────────────────────────
mountCrud(contentRouter, '/media', {
  activity: { entity: 'mediaAlbum', label: (row) => String(row.title) },
  key: 'album',
  list: (query, hidden) => ({
    orderBy: { sortOrder: 'asc' },
    where: { ...(hidden ? {} : { isPublished: true }), ...when('category', query.category) },
  }),
  listQuery: listAlbumsQuerySchema,
  model: 'mediaAlbum',
  schemas: { create: createAlbumSchema, update: updateAlbumSchema },
  slug: { notFound: 'Album not found', where: { isPublished: true } },
  supportsHidden: true,
});

// ── Executives (front office) ────────────────────────────────────────────────
mountCrud(contentRouter, '/executives', {
  activity: { entity: 'executive', label: (row) => String(row.name) },
  key: 'executive',
  list: (query, hidden) => ({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    where: { ...(hidden ? {} : { isPublic: true }), ...when('group', query.group) },
  }),
  listQuery: listExecutivesQuerySchema,
  model: 'executive',
  schemas: { create: createExecutiveSchema, update: updateExecutiveSchema },
  supportsHidden: true,
});

// ── Videos (видео сан) ───────────────────────────────────────────────────────
mountCrud(contentRouter, '/videos', {
  activity: { entity: 'video', label: (row) => String(row.title) },
  key: 'video',
  list: (query, hidden) => ({
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    take: (query.limit as number | undefined) ?? 100,
    where: {
      ...(hidden ? {} : { isPublished: true }),
      ...when('category', query.category),
      ...(query.featured ? { isFeatured: true } : {}),
    },
  }),
  listQuery: listVideosQuerySchema,
  model: 'video',
  prepare: normalizeVideoBody,
  schemas: { create: createVideoSchema, update: updateVideoSchema },
  slug: { notFound: 'Video not found', where: { isPublished: true } },
  supportsHidden: true,
});

// ── Shop products (фэн клаб) ─────────────────────────────────────────────────
mountCrud(contentRouter, '/shop', {
  activity: { entity: 'shopProduct', label: (row) => String(row.name) },
  key: 'product',
  list: (query, hidden) => ({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    where: { ...(hidden ? {} : { isVisible: true }), ...when('category', query.category) },
  }),
  listQuery: listShopQuerySchema,
  model: 'shopProduct',
  schemas: { create: createShopProductSchema, update: updateShopProductSchema },
  supportsHidden: true,
});

// ── History photos (/history era archive, Cloudinary-backed) ─────────────────
contentRouter.get('/history-photos', asyncHandler(historyPhotos.listHistoryPhotos));
contentRouter.post(
  '/history-photos',
  ...requireAdmin,
  validate({ body: createHistoryPhotoSchema }),
  asyncHandler(historyPhotos.createHistoryPhoto),
);
contentRouter.patch(
  '/history-photos/:id',
  ...requireAdmin,
  validate({ body: updateHistoryPhotoSchema, params: idParamSchema }),
  asyncHandler(historyPhotos.updateHistoryPhoto),
);
contentRouter.delete(
  '/history-photos/:id',
  ...requireAdmin,
  validate({ params: idParamSchema }),
  asyncHandler(historyPhotos.deleteHistoryPhoto),
);

// ── Site content (singleton copy) ────────────────────────────────────────────
contentRouter.get('/site-content', asyncHandler(siteContent.getAllSiteContent));
contentRouter.get(
  '/site-content/:page',
  validate({ params: pageParamSchema }),
  asyncHandler(siteContent.getPageSiteContent),
);
contentRouter.put(
  '/site-content/:page/:section',
  ...requireAdmin,
  validate({ body: siteContentPutSchema, params: sectionParamSchema }),
  asyncHandler(siteContent.putSiteContent),
);

/**
 * `youtubeId` may arrive as a pasted watch/shorts/embed URL — store the bare
 * ID, and derive the standard poster when no thumbnail came along.
 */
function normalizeVideoBody(body: Record<string, unknown>): Record<string, unknown> {
  const next = { ...body };
  if (typeof next.youtubeId === 'string' && next.youtubeId.trim()) {
    const id = extractYouTubeId(next.youtubeId);
    if (id) {
      next.youtubeId = id;
      if (!next.thumbnail) next.thumbnail = youTubeThumbUrl(id);
    }
  }
  return next;
}
