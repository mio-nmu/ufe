import type { Request, RequestHandler, Response, Router } from 'express';
import type { ZodType } from 'zod';

import type { ActivityEntity } from '../../types/index.js';

import { ApiError } from '../../lib/ApiError.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { prisma } from '../../lib/prisma.js';
import { optionalAuth } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { recordActivity } from '../../services/admin/activity.service.js';
import { compact } from '../../utils/content-payloads.js';
import { ok } from '../../utils/http.js';
import { idParamSchema, slugParamSchema } from '../../validators/content/content.validators.js';

/** Prisma models served through the generic content CRUD surface. */
export type ContentModel =
  'executive' | 'game' | 'mediaAlbum' | 'newsPost' | 'player' | 'shopProduct' | 'video';

export interface CrudResource {
  /** Activity-log subject: which entity this is and how a row is named. */
  activity: { entity: ActivityEntity; label: (row: Row) => string };
  /** Removes rows that belong to this one, before it is deleted. */
  beforeDelete?: (id: string) => Promise<unknown>;
  /** Envelope key for single-row responses: `{ [key]: row }`. */
  key: string;
  /** Builds the public list query from the validated `req.query`. `hidden`
   *  is true only for a verified ADMIN that asked for `includeHidden`. */
  list: (query: Row, hidden: boolean) => FindManyArgs;
  /** Zod schema for the list query (filters, limit, includeHidden). */
  listQuery?: ZodType;
  model: ContentModel;
  /** Normalizes create/update bodies before they reach Prisma. */
  prepare?: (body: Row) => Row;
  schemas: { create: ZodType; update: ZodType };
  /** Enables `GET /slug/:slug`, restricted to rows matching this filter. */
  slug?: { notFound: string; where: Row };
  /** Honour `includeHidden` for verified admins (runs optionalAuth on the
   *  list) — for resources with a visibility flag. */
  supportsHidden?: boolean;
}

export interface FindManyArgs {
  orderBy?: Row | Row[];
  take?: number;
  where?: Row;
}

/** The slice of a Prisma model delegate the CRUD handlers use. */
interface ContentDelegate {
  create(args: { data: Row }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  findFirst(args: { where: Row }): Promise<unknown>;
  findMany(args: FindManyArgs): Promise<unknown[]>;
  update(args: { data: Row; where: { id: string } }): Promise<unknown>;
}

type Row = Record<string, unknown>;

/**
 * Mounts the standard content routes for one resource on `router` at `path`:
 * public `GET path` (+ optional `GET path/slug/:slug`) and ADMIN-only
 * `POST path`, `PATCH path/:id`, `DELETE path/:id`. Absent PATCH keys stay
 * untouched (compact() drops undefined values).
 */
export function mountCrud(router: Router, path: string, resource: CrudResource): void {
  const model = (prisma as unknown as Record<ContentModel, ContentDelegate>)[resource.model];
  const prepare = (body: Row) => compact(resource.prepare ? resource.prepare(body) : body);

  const listGuards: RequestHandler[] = resource.listQuery
    ? [...(resource.supportsHidden ? [optionalAuth] : []), validate({ query: resource.listQuery })]
    : [];
  router.get(
    path,
    ...listGuards,
    asyncHandler(async (req: Request, res: Response) => {
      const query = req.query as Row;
      const hidden =
        resource.supportsHidden === true &&
        query.includeHidden === true &&
        req.user?.role === 'ADMIN';
      ok(res, { items: await model.findMany(resource.list(query, hidden)) });
    }),
  );

  if (resource.slug) {
    const { notFound, where } = resource.slug;
    router.get(
      `${path}/slug/:slug`,
      validate({ params: slugParamSchema }),
      asyncHandler(async (req: Request, res: Response) => {
        const { slug } = req.params as { slug: string };
        const row = await model.findFirst({ where: { ...where, slug } });
        if (!row) throw ApiError.notFound(notFound);
        ok(res, { [resource.key]: row });
      }),
    );
  }

  const recordWrite = (req: Request, action: 'CREATED' | 'DELETED' | 'UPDATED', row: Row) =>
    recordActivity(req.user, {
      action,
      entity: resource.activity.entity,
      entityId: String(row.id),
      label: resource.activity.label(row),
    });

  router.post(
    path,
    ...requireAdmin,
    validate({ body: resource.schemas.create }),
    asyncHandler(async (req: Request, res: Response) => {
      const row = (await model.create({ data: prepare(req.body as Row) })) as Row;
      await recordWrite(req, 'CREATED', row);
      ok(res, { [resource.key]: row }, 201);
    }),
  );

  router.patch(
    `${path}/:id`,
    ...requireAdmin,
    validate({ body: resource.schemas.update, params: idParamSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      const row = (await model.update({ data: prepare(req.body as Row), where: { id } })) as Row;
      await recordWrite(req, 'UPDATED', row);
      ok(res, { [resource.key]: row });
    }),
  );

  router.delete(
    `${path}/:id`,
    ...requireAdmin,
    validate({ params: idParamSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params as { id: string };
      // Read first: the log keeps the row's name after it is gone.
      const row = (await model.findFirst({ where: { id } })) as null | Row;
      await resource.beforeDelete?.(id);
      await model.delete({ where: { id } });
      if (row) await recordWrite(req, 'DELETED', row);
      ok(res, { deleted: true });
    }),
  );
}

/** `{ field: value }` when value is set, else `{}` — for optional list filters. */
export function when(field: string, value: unknown): Row {
  return value === undefined || value === null || value === '' ? {} : { [field]: value };
}
