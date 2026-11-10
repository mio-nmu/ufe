import type { Request, Response } from 'express';

import type {
  CreateHistoryPhotoInput,
  UpdateHistoryPhotoInput,
} from '../../validators/content/content.validators.js';

import { assetLabel, recordActivity } from '../../services/admin/activity.service.js';
import * as historyPhotos from '../../services/content/history-photos.service.js';
import { ok } from '../../utils/http.js';

/**
 * /history archive photos, mounted at /api/v1/content/history-photos.
 * Public side only ever GETs; writes are guarded router-level by the
 * content router's adminWrite pair.
 */

export async function createHistoryPhoto(req: Request, res: Response): Promise<void> {
  const input = req.body as unknown as CreateHistoryPhotoInput;
  const photo = await historyPhotos.createHistoryPhoto({
    caption: input.caption,
    folder: input.folder,
    publicId: input.publicId,
    sortOrder: input.sortOrder,
  });
  await recordPhoto(req, 'CREATED', photo);
  ok(res, { photo }, 201);
}

export async function deleteHistoryPhoto(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as { id: string };
  const result = await historyPhotos.removeHistoryPhoto(id);
  await recordPhoto(req, 'DELETED', { caption: null, id, publicId: result.publicId });
  ok(res, result);
}

export async function listHistoryPhotos(_req: Request, res: Response): Promise<void> {
  ok(res, await historyPhotos.listHistoryPhotos());
}

export async function updateHistoryPhoto(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as { id: string };
  const input = req.body as unknown as UpdateHistoryPhotoInput;
  const photo = await historyPhotos.updateHistoryPhoto(id, {
    caption: input.caption,
    folder: input.folder,
    publicId: input.publicId,
    sortOrder: input.sortOrder,
  });
  await recordPhoto(req, 'UPDATED', photo);
  ok(res, { photo });
}

function recordPhoto(
  req: Request,
  action: 'CREATED' | 'DELETED' | 'UPDATED',
  photo: { caption: null | string; id: string; publicId: string },
): Promise<void> {
  return recordActivity(req.user, {
    action,
    entity: 'historyPhoto',
    entityId: photo.id,
    label: assetLabel(photo.caption, photo.publicId),
  });
}
