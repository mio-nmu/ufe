import type { PlayerProfile } from "@/content/site";

/** Player + resolved photo path, as prepared by the /players page. */
export type RosterPlayer = Omit<PlayerProfile, "photo"> & {
  photo: null | string;
  /** URL slug — links to /players/<slug>. Static fallback uses player-<n>. */
  slug: string;
  birthYear?: null | number;
  weightKg?: null | number;
  /** Admin-set vertical framing of the photo, 0 (top) – 100 (bottom). */
  photoPosition?: null | number;
  /** Admin-set rendered size, 40 (shrunken) – 150 (zoomed). */
  photoScale?: null | number;
};

/** Age from a birth year (render-time; drifts at most one revalidate). */
export function playerAge(birthYear?: null | number): null | number {
  if (!birthYear) return null;
  const age = new Date().getFullYear() - birthYear;
  return age >= 0 && age < 100 ? age : null;
}

/** Detail-page href for a roster player. */
export function playerHref(player: Pick<RosterPlayer, "slug">): string {
  return `/players/${player.slug}`;
}

/** Position group for the filter pills ("Point Guard" → "guard"). */
export function positionGroup(
  position: string,
): "guard" | "forward" | "center" {
  const base = basePosition(position).toLowerCase();
  if (base.includes("guard")) return "guard";
  if (base.includes("forward")) return "forward";
  return "center";
}

/** Uppercase base position ("Center · Double-double machine" → "CENTER"). */
export function basePosition(position: string) {
  return position.split("·")[0]!.trim();
}

/** Stacked Mongolian name: first word over the rest, NBA-card style. */
export function splitName(name: string): [string, string] {
  const [first = "", ...rest] = name.split(" ");
  return [first, rest.join(" ")];
}

/**
 * Splits a roster list into fixed-size pages. The grid shows 15 players per
 * page (3 rows × 5 columns); the requested page is clamped into range so a
 * shrunken list (search, data refresh) can never point past the last page.
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): { items: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    totalPages,
  };
}
