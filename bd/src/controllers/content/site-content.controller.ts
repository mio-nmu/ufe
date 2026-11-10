import type { Request, Response } from 'express';

import type { SiteContentPutInput } from '../../validators/content/content.validators.js';

import { SITE_CONTENT_MAX_JSON_LENGTH, SITE_CONTENT_PAGES } from '../../config/constants.js';
import { ApiError } from '../../lib/ApiError.js';
import { prisma } from '../../lib/prisma.js';
import { recordActivity } from '../../services/admin/activity.service.js';
import { ok } from '../../utils/http.js';

/**
 * Singleton marketing copy, addressed by page/section. Reads return a
 * { page: { section: data } } map merged over nothing (the frontend keeps its
 * own bundled defaults); writes are allowlisted against SITE_CONTENT_PAGES.
 */

export async function getAllSiteContent(_req: Request, res: Response): Promise<void> {
  const rows = await prisma.siteContent.findMany();
  const pages: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    pages[row.page] = { ...(pages[row.page] ?? {}), [row.section]: row.data };
  }
  ok(res, { pages });
}

export async function getPageSiteContent(req: Request, res: Response): Promise<void> {
  const { page } = req.params as unknown as { page: string };
  const rows = await prisma.siteContent.findMany({ where: { page } });
  const sections = Object.fromEntries(rows.map((row) => [row.section, row.data]));
  ok(res, { page, sections });
}

export async function putSiteContent(req: Request, res: Response): Promise<void> {
  const { page, section } = req.params as unknown as { page: string; section: string };
  const { data } = req.body as unknown as SiteContentPutInput;

  const sections: readonly string[] | undefined =
    SITE_CONTENT_PAGES[page as keyof typeof SITE_CONTENT_PAGES];
  if (!sections || !sections.includes(section)) {
    throw ApiError.badRequest(`Unknown site-content page/section: ${page}/${section}`);
  }
  if (JSON.stringify(data).length > SITE_CONTENT_MAX_JSON_LENGTH) {
    throw ApiError.badRequest('Section data exceeds the maximum allowed size');
  }

  const row = await prisma.siteContent.upsert({
    create: { data: data as object, page, section },
    update: { data: data as object },
    where: { page_section: { page, section } },
  });
  await recordActivity(req.user, {
    action: 'UPDATED',
    entity: 'siteContent',
    entityId: `${page}/${section}`,
    label: `${page} / ${section}`,
  });
  ok(res, { row });
}
