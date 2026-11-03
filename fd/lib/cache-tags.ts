/**
 * Cache-tag registry — the one shared constant surface between the public
 * fetchers (lib/content.ts) and the on-demand purge route
 * (app/api/revalidate/route.ts).
 *
 * Every public content fetch is tagged; after an admin save the browser
 * POSTs /api/revalidate with the affected tag so the next public request
 * refetches fresh data instead of waiting out the 60s ISR window. Adding a
 * new managed resource means adding its tag here AND using it on the fetch —
 * a tag that is fetched but missing from ALLOWED_TAGS (or vice versa) is the
 * classic bug.
 */

/** Wholesale tag carried by every public content fetch. */
export const CONTENT_TAG = "content";

/** Copy blobs edited through /admin content → "Хуудасны текст". */
export const SITE_CONTENT_TAG = "site-content";

/** Tags addressable through POST /api/revalidate. */
export const ALLOWED_TAGS = [
  CONTENT_TAG,
  SITE_CONTENT_TAG,
  "games",
  "news",
  "players",
  "executives",
  "albums",
  "history-photos",
  "videos",
  "shop",
] as const;

export type AllowedTag = (typeof ALLOWED_TAGS)[number];

export function isAllowedTag(tag: string): tag is AllowedTag {
  return (ALLOWED_TAGS as readonly string[]).includes(tag);
}

/**
 * Admin REST endpoint base (without /api/v1) → public cache tag, for the
 * generic collection manager's post-save purge. Endpoints with no public
 * face return null — nothing to purge.
 */
export function tagForEndpoint(endpoint: string): AllowedTag | null {
  const map: Record<string, AllowedTag> = {
    "/content/executives": "executives",
    "/content/games": "games",
    "/content/history-photos": "history-photos",
    "/content/media": "albums",
    "/content/news": "news",
    "/content/players": "players",
    "/content/shop": "shop",
    "/content/videos": "videos",
  };
  return map[endpoint] ?? null;
}
