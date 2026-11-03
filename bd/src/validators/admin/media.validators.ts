import { z } from 'zod';

import {
  MEDIA_ALT_MAX_LENGTH,
  MEDIA_FOLDER_PATTERN,
  MEDIA_LIST_MAX_LIMIT,
} from '../../config/constants.js';

const idSchema = z.string().regex(/^[0-9a-f]{24}$/, 'must be a valid id'); // MongoDB ObjectId

export const listMediaQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MEDIA_LIST_MAX_LIMIT).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const mediaAltPatchSchema = z.object({
  alt: z.string().trim().min(1, 'alt text is required').max(MEDIA_ALT_MAX_LENGTH),
});

export const mediaIdParamSchema = z.object({ id: idSchema });

/**
 * Multipart text fields — parsed in the controller (express.json does not
 * run on multipart bodies, so the validate middleware cannot be used here).
 */
export const mediaUploadFieldsSchema = z.object({
  alt: z.string().trim().min(1).max(MEDIA_ALT_MAX_LENGTH).optional(),
  folder: z
    .string()
    .regex(MEDIA_FOLDER_PATTERN, {
      message: 'folder must be 1–32 chars of lowercase letters, digits and dashes',
    })
    .default('uploads'),
});

/** Body for POST /admin/media/direct-params — subfolder is optional. */
export const mediaDirectParamsSchema = z.object({
  folder: z
    .string()
    .regex(MEDIA_FOLDER_PATTERN, {
      message: 'folder must be 1–32 chars of lowercase letters, digits and dashes',
    })
    .default('uploads'),
});

/** Cloudinary public_id of an already-direct-uploaded image (`folder/name`). */
export const mediaRegisterSchema = z.object({
  alt: z.string().trim().min(1).max(MEDIA_ALT_MAX_LENGTH).optional(),
  publicId: z.string().trim().min(3).max(300),
});
