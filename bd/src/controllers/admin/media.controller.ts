import type { Request, Response } from 'express';

import { ApiError } from '../../lib/ApiError.js';
import { assetLabel, recordActivity } from '../../services/admin/activity.service.js';
import * as mediaService from '../../services/media/media.service.js';
import { signDirectUpload } from '../../services/media/storage.service.js';
import { ok } from '../../utils/http.js';
import { mediaUploadFieldsSchema } from '../../validators/admin/media.validators.js';

/**
 * Media library HTTP surface (admin-only, mounted at /api/v1/admin/media).
 * The binary handling lives in middleware/upload.ts + services/media; this
 * layer only maps HTTP to service calls.
 */

/**
 * Step 1 of the direct-upload path: hands the browser signed Cloudinary
 * params so the image bytes can travel browser → Cloudinary without passing
 * through bd (Vercel caps function bodies at 4.5 MB).
 */
export async function directUploadParams(req: Request, res: Response): Promise<void> {
  requireUser(req);
  const { folder } = req.body as { folder: string };
  ok(res, { params: signDirectUpload(folder) });
}

export async function listMedia(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as { limit: number; offset: number };
  ok(res, await mediaService.listMedia(query));
}

/** Step 2: persists the already-uploaded asset as a media row. */
export async function registerDirectMedia(req: Request, res: Response): Promise<void> {
  const admin = requireUser(req);
  const { alt, publicId } = req.body as { alt?: string; publicId: string };

  const media = await mediaService.registerDirectMedia({
    adminId: admin.id,
    altText: alt,
    publicId,
  });
  await recordMedia(req, 'CREATED', media);
  ok(res, { media }, 201);
}

export async function removeMedia(req: Request, res: Response): Promise<void> {
  requireUser(req);
  const { id } = req.params as { id: string };
  const result = await mediaService.removeMedia(id);
  await recordMedia(req, 'DELETED', { altText: null, id, publicId: result.publicId });
  ok(res, result);
}

export async function updateMediaAltText(req: Request, res: Response): Promise<void> {
  requireUser(req);
  const { id } = req.params as { id: string };
  const { alt } = req.body as { alt: string };
  const media = await mediaService.updateMediaAltText(id, alt);
  await recordMedia(req, 'UPDATED', media);
  ok(res, { media });
}

export async function uploadMedia(req: Request, res: Response): Promise<void> {
  const admin = requireUser(req);
  if (!req.file?.buffer) {
    throw ApiError.badRequest('An "image" file is required (multipart/form-data)');
  }
  // Text fields ride along the multipart body — validated here, not by the
  // JSON validate middleware.
  const fields = mediaUploadFieldsSchema.parse(req.body);

  const media = await mediaService.uploadMedia({
    adminId: admin.id,
    altText: fields.alt,
    buffer: req.file.buffer,
    folder: fields.folder,
  });
  await recordMedia(req, 'CREATED', media);
  ok(res, { media }, 201);
}

function recordMedia(
  req: Request,
  action: 'CREATED' | 'DELETED' | 'UPDATED',
  media: { altText: null | string; id: string; publicId: string },
): Promise<void> {
  return recordActivity(req.user, {
    action,
    entity: 'media',
    entityId: media.id,
    label: assetLabel(media.altText, media.publicId),
  });
}

function requireUser(req: Request) {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  return req.user;
}
