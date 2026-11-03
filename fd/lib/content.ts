import { env } from "@/lib/env";
import { CONTENT_TAG } from "@/lib/cache-tags";
import {
  frontOfficeFallback,
  photosFallback,
  scheduleFallback,
  shopFallback,
  videosFallback,
} from "@/content/pages";
import { thanks as thanksFallback } from "@/content/site";
import type { TuuhPhotos } from "@/components/team/history-experience";
import type {
  ContactInfo,
  Executive,
  GameRow,
  HistoryPhotoRow,
  MediaAlbumRow,
  NewsPostRow,
  PageCopy,
  PlayerRow,
  ShopProductRow,
  VideoRow,
} from "@/types/content";

/**
 * Server-side reads from the bd/ content API. Every helper is tagged for
 * on-demand revalidation (POST /api/revalidate) and degrades to the seeded
 * fallback when the API is unreachable (build time, backend down), so public
 * pages always render.
 */

const BASE = `${env.apiUrl}/api/v1/content`;

interface Envelope<T> {
  success: boolean;
  data?: T;
}

/** Header/footer branding + social links from the admin «Ерөнхий мэдээлэл». */
export interface SiteBrand {
  logo: string | null;
  siteName: string | null;
  facebook: string | null;
  instagram: string | null;
}

export async function getSiteBrand(): Promise<SiteBrand> {
  const data = await getJson<{
    sections: Partial<Record<"brand" | "contact", Record<string, unknown>>>;
  }>("/site-content/general", "site-content");
  const brand = data?.sections?.brand ?? {};
  const social = data?.sections?.contact ?? {};
  const name = typeof brand.siteName === "string" ? brand.siteName.trim() : "";
  return {
    facebook: safeUrl(social.facebook),
    instagram: safeUrl(social.instagram),
    // next/image only loads Cloudinary remotely (next.config.ts) — any other
    // host would break every page, so it falls back to the bundled logo.
    logo: /^(https:\/\/res\.cloudinary\.com\/|\/)/.test(
      safeUrl(brand.logo, true) ?? "",
    )
      ? safeUrl(brand.logo, true)
      : null,
    siteName: name || null,
  };
}

/** An admin-entered URL we may render: https (or a site-relative path). */
function safeUrl(value: unknown, allowRelative = false): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (/^https:\/\/\S+$/i.test(url)) return url;
  return allowRelative && /^\/[^/]\S*$/.test(url) ? url : null;
}

/**
 * Contact details for the site footer: the contact/info copy blob merged
 * over the static defaults so missing keys keep rendering.
 */
export async function getContactInfo(
  fallback: ContactInfo,
): Promise<ContactInfo> {
  const copy = await getPageCopy("contact", "info");
  return { ...fallback, ...pickStrings(copy, fallback) };
}

export interface ThanksCopy {
  heading: string;
  paragraphOne: string;
  paragraphTwo: string;
  sponsors: string[];
}

/**
 * The thank-you band and sponsor list (admin: Нүүр → Талархлын хэсэг),
 * shared by the home page and /sponsors. Edited keys win over the static
 * copy; a malformed or empty sponsor list keeps the default one.
 */
export async function getThanks(): Promise<ThanksCopy> {
  const copy = await getPageCopy("home", "thanks");
  const text = (key: "heading" | "paragraphOne" | "paragraphTwo") =>
    typeof copy?.[key] === "string" && copy[key] !== ""
      ? (copy[key] as string)
      : thanksFallback[key];
  const sponsors = Array.isArray(copy?.sponsors)
    ? copy.sponsors.filter(
        (name): name is string =>
          typeof name === "string" && name.trim() !== "",
      )
    : [];
  return {
    heading: text("heading"),
    paragraphOne: text("paragraphOne"),
    paragraphTwo: text("paragraphTwo"),
    sponsors: sponsors.length ? sponsors : [...thanksFallback.sponsors],
  };
}

function pickStrings(
  copy: PageCopy | null,
  base: ContactInfo,
): Partial<ContactInfo> {
  if (!copy) return {};
  const picked: Partial<ContactInfo> = {};
  for (const key of Object.keys(base) as Array<keyof ContactInfo>) {
    const value = copy[key];
    if (key === "phones" || key === "footerPhones") {
      if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
        picked[key] = value as string[];
      }
    } else if (typeof value === "string" && value.length > 0) {
      picked[key] = value;
    }
  }
  return picked;
}

export async function getPageCopy(
  page: string,
  section = "page",
): Promise<PageCopy | null> {
  const data = await getJson<{
    page: string;
    sections: Record<string, PageCopy>;
  }>(`/site-content/${page}`, "site-content");
  return data?.sections?.[section] ?? null;
}

export async function getNews(
  filter: { featured?: boolean; limit?: number } = {},
): Promise<NewsPostRow[]> {
  const params = new URLSearchParams();
  if (filter.featured !== undefined) {
    params.set("featured", String(filter.featured));
  }
  if (filter.limit !== undefined) {
    params.set("limit", String(filter.limit));
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await getJson<{ items: NewsPostRow[] }>(
    `/news${suffix}`,
    "news",
  );
  return data?.items ?? [];
}

/** One published news post by slug, for /news/[slug]; null when missing. */
export async function getNewsPost(slug: string): Promise<NewsPostRow | null> {
  const data = await getJson<{ post: NewsPostRow }>(
    `/news/slug/${encodeURIComponent(slug)}`,
    "news",
  );
  return data?.post ?? null;
}

export async function getGames(): Promise<GameRow[]> {
  const data = await getJson<{ items: GameRow[] }>("/games?limit=100", "games");
  return data?.items?.length ? data.items : scheduleFallback;
}

/**
 * The public roster (and the home-page teaser): PLAYER rows only — coaches
 * and staff never mix into the roster grid; the server filters by role.
 */
export async function getPlayers(): Promise<PlayerRow[]> {
  const data = await getJson<{ items: PlayerRow[] }>(
    "/players?role=PLAYER",
    "players",
  );
  return (data?.items ?? []).map((player) => ({
    ...player,
    profile: playerExtras(player.profile),
  }));
}

/** One roster player by slug, for the /players/[slug] detail page. */
export async function getPlayerRowBySlug(
  slug: string,
): Promise<PlayerRow | null> {
  const data = await getJson<{ player: PlayerRow }>(
    `/players/slug/${encodeURIComponent(slug)}`,
    "players",
  );
  return data?.player
    ? { ...data.player, profile: playerExtras(data.player.profile) }
    : null;
}

/** Player.profile is a Json column: normalize to the extras shape. */
function playerExtras(raw: unknown): PlayerRow["profile"] {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    return null;
  return raw as PlayerRow["profile"];
}

export async function getExecutives(): Promise<Executive[]> {
  // STAFF-group rows belong to /staff, not the front-office directory.
  const data = await getJson<{ items: Executive[] }>(
    "/executives",
    "executives",
  );
  const items = (data?.items ?? []).filter((item) => item.group !== "STAFF");
  return items.length ? items : frontOfficeFallback;
}

export async function getAlbums(): Promise<MediaAlbumRow[]> {
  const data = await getJson<{ items: MediaAlbumRow[] }>("/media", "albums");
  if (!data?.items?.length) return photosFallback;
  return data.items.map((album) => ({
    ...album,
    images: albumImages(album.images),
  }));
}

/** MediaAlbum.images is a Json column: normalize to AlbumImage[]. */
function albumImages(raw: unknown): MediaAlbumRow["images"] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is MediaAlbumRow["images"][number] =>
      typeof item === "object" && item !== null && typeof item.url === "string",
  );
}

/**
 * /history archive photos grouped into the year folders the era track and
 * moments gallery key off. The API already returns folders in chronological
 * order and photos in sortOrder order, so grouping preserves both. An empty
 * or unreachable backend leaves every era text-only.
 */
export async function getHistoryPhotos(): Promise<TuuhPhotos> {
  const data = await getJson<{ items: HistoryPhotoRow[] }>(
    "/history-photos",
    "history-photos",
  );
  return groupHistoryPhotos(data?.items ?? []);
}

/** HistoryPhotoRow[] → { folder: [url, …] } in API order. */
export function groupHistoryPhotos(items: HistoryPhotoRow[]): TuuhPhotos {
  const byFolder: TuuhPhotos = {};
  for (const photo of items) {
    if (typeof photo?.url !== "string" || photo.url === "") continue;
    (byFolder[photo.folder] ??= []).push(photo.url);
  }
  return byFolder;
}

export async function getVideos(): Promise<VideoRow[]> {
  const data = await getJson<{ items: VideoRow[] }>(
    "/videos?limit=100",
    "videos",
  );
  return data?.items?.length ? data.items : videosFallback;
}

export async function getShopProducts(): Promise<ShopProductRow[]> {
  const data = await getJson<{ items: ShopProductRow[] }>("/shop", "shop");
  return data?.items?.length ? data.items : shopFallback;
}

async function getJson<T>(path: string, tag: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      next: { revalidate: 60, tags: [CONTENT_TAG, tag] },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Envelope<T>;
    return body.success && body.data !== undefined ? body.data : null;
  } catch {
    return null; // backend down — caller falls back to static content
  }
}
