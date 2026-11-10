import type { Prisma } from '../../generated/prisma/client.js';

import { ApiError } from '../../lib/ApiError.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { deleteImage } from '../media/storage.service.js';

/**
 * /history archive photos. Rows always point at a media-library asset (the
 * create/replace input is a publicId whose url is read from Media), so the
 * stored URL can never be fabricated client-side. Deleting or replacing a
 * row destroys the superseded Cloudinary asset and its Media row too —
 * best-effort, reported, never silently orphaned.
 */

/** Fields safe to return to clients. */
const PHOTO_SELECT = {
  caption: true,
  createdAt: true,
  folder: true,
  id: true,
  publicId: true,
  sortOrder: true,
  updatedAt: true,
  url: true,
} satisfies Prisma.HistoryPhotoSelect;

export async function createHistoryPhoto(input: {
  caption?: null | string | undefined;
  folder: string;
  publicId: string;
  sortOrder?: number | undefined;
}) {
  const asset = await requireMediaAsset(input.publicId);
  try {
    return await prisma.historyPhoto.create({
      data: {
        caption: input.caption ?? null,
        folder: input.folder,
        publicId: asset.publicId,
        sortOrder: input.sortOrder ?? 0,
        url: asset.url,
      },
      select: PHOTO_SELECT,
    });
  } catch (error) {
    throw dupePublicId(error);
  }
}

export async function listHistoryPhotos() {
  const items = await prisma.historyPhoto.findMany({
    orderBy: [{ folder: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: PHOTO_SELECT,
  });
  return { items };
}

export async function removeHistoryPhoto(
  id: string,
): Promise<{ assetDeleted: boolean; deleted: true; id: string; publicId: string }> {
  const existing = await prisma.historyPhoto.findUnique({
    select: { publicId: true },
    where: { id },
  });
  if (!existing) {
    throw ApiError.notFound('History photo not found');
  }

  await prisma.historyPhoto.delete({ where: { id } });
  const assetDeleted = await destroyAsset(existing.publicId);
  return { assetDeleted, deleted: true, id, publicId: existing.publicId };
}

export async function updateHistoryPhoto(
  id: string,
  input: {
    caption?: null | string | undefined;
    folder?: string | undefined;
    publicId?: string | undefined;
    sortOrder?: number | undefined;
  },
) {
  const existing = await prisma.historyPhoto.findUnique({
    select: { publicId: true },
    where: { id },
  });
  if (!existing) {
    throw ApiError.notFound('History photo not found');
  }

  // Replace flow: swap in a different registered asset, then clean up the
  // one being superseded (Cloudinary asset + its media-library row).
  const newPublicId =
    input.publicId !== undefined && input.publicId !== existing.publicId ? input.publicId : null;
  const asset = newPublicId ? await requireMediaAsset(newPublicId) : null;

  let photo;
  try {
    photo = await prisma.historyPhoto.update({
      data: {
        ...(input.caption !== undefined ? { caption: input.caption } : {}),
        ...(input.folder !== undefined ? { folder: input.folder } : {}),
        ...(asset ? { publicId: asset.publicId, url: asset.url } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
      select: PHOTO_SELECT,
      where: { id },
    });
  } catch (error) {
    throw dupePublicId(error);
  }

  if (asset) {
    await destroyAsset(existing.publicId);
  }
  return photo;
}

/**
 * Removes the Cloudinary asset and its media-library row. Failures are
 * logged and reported (false) — the row deletion itself already succeeded.
 */
async function destroyAsset(publicId: string): Promise<boolean> {
  let deleted = true;
  try {
    await deleteImage(publicId);
  } catch (error) {
    deleted = false;
    logger.error(
      { err: error, publicId },
      'Cloudinary delete failed — history-photo asset is orphaned, remove it in the dashboard',
    );
  }
  await prisma.media
    .delete({ where: { publicId } })
    .catch((error) => logger.warn({ err: error, publicId }, 'Media row already gone'));
  return deleted;
}

/** Maps Prisma unique-publicId clashes to a friendly 400. */
function dupePublicId(error: unknown): unknown {
  const prismaError = error as Prisma.PrismaClientKnownRequestError;
  if (prismaError?.code === 'P2002') {
    return ApiError.badRequest('That image is already used by another history photo');
  }
  return error;
}

/** Resolves a publicId to its verified media-library url. */
async function requireMediaAsset(publicId: string) {
  const media = await prisma.media.findUnique({
    select: { publicId: true, url: true },
    where: { publicId },
  });
  if (!media) {
    throw ApiError.badRequest('Unknown publicId — upload the image first');
  }
  return media;
}
