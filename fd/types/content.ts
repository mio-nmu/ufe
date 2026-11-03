/**
 * Entity shapes returned by the bd/ content API (JSON-serialized: dates
 * arrive as ISO strings). Shared by public pages and the admin CMS.
 */

export type GameStatus = "SCHEDULED" | "FINAL" | "CANCELLED";

export interface GameRow {
  id: string;
  competition: string;
  round: string | null;
  opponent: string;
  opponentShort: string | null;
  opponentLogo: string | null;
  /** Opponent brand colour (#RRGGBB) set in the admin; null → ink. */
  opponentColor?: string | null;
  isHome: boolean;
  tipsAt: string;
  venue: string;
  status: GameStatus;
  teamScore: number | null;
  opponentScore: number | null;
  note: string | null;
  streamUrl: string | null;
  ticketUrl: string | null;
}

export type AlbumCategory = "GAMES" | "COMMUNITY" | "EVENTS";

export interface AlbumImage {
  url: string;
  caption?: string | null;
}

export interface MediaAlbumRow {
  id: string;
  title: string;
  slug: string;
  category: AlbumCategory;
  coverImage: string | null;
  images: AlbumImage[];
  eventDate: string | null;
  sortOrder: number;
}

/**
 * One /history archive photo. `folder` is the year group ("1996",
 * "1997-2000", "2026") the era track and moments gallery key off; `url` is
 * the Cloudinary asset.
 */
export interface HistoryPhotoRow {
  id: string;
  folder: string;
  url: string;
  publicId: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type VideoCategory =
  "HIGHLIGHTS" | "INTERVIEWS" | "BEHIND_THE_SCENES" | "PRESS";

export interface VideoRow {
  id: string;
  title: string;
  slug: string;
  category: VideoCategory;
  thumbnail: string | null;
  videoUrl: string | null;
  youtubeId: string | null;
  durationSec: number | null;
  isFeatured: boolean;
  publishedAt: string;
}

export type ShopCategory =
  "JERSEYS" | "TEES" | "HOODIES" | "HATS" | "KIDS" | "GEAR";

export interface ShopProductRow {
  id: string;
  name: string;
  slug: string;
  category: ShopCategory;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  url: string | null;
  sizes: string[];
  badge: string | null;
}

/** One row of SiteContent.data for a page/section pair. */
export type PageCopy = Record<string, unknown>;

export interface NewsPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt: string;
}

export type PlayerRole = "PLAYER" | "COACH" | "STAFF";

/**
 * Roster-card extras that only exist for display (years on team, motto,
 * achievements…). Stored as the Player.profile JSON blob in bd/ and edited
 * as JSON in the admin panel.
 */
export interface PlayerProfileExtras {
  roleLabel?: string;
  yearsOnTeam?: string;
  yearsPlaying?: string;
  major?: string;
  achievements?: string[];
  motto?: string;
  pregame?: string;
  reason?: string;
}

export interface PlayerRow {
  id: string;
  name: string;
  slug: string;
  number: number | null;
  role: PlayerRole;
  position: string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthYear: number | null;
  hometown: string | null;
  photo: string | null;
  actionPhoto: string | null;
  /** Vertical framing of `photo`, 0 (top) – 100 (bottom); null = default. */
  photoPosition: number | null;
  /** Rendered size of `photo`, 40 (shrunken) – 150 (zoomed); null = 100. */
  photoScale: number | null;
  bio: string | null;
  academicYear: string | null;
  isCaptain: boolean;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  profile: PlayerProfileExtras | null;
}

export type ExecutiveGroup =
  "OWNERSHIP" | "OPERATIONS" | "BUSINESS" | "COACHES" | "STAFF";

/** Bio-drawer detail sections on the /staff cards ({ heading, text?, list? }). */
export interface StaffSection {
  heading: string;
  text?: string;
  list?: string[];
}

export interface Executive {
  id: string;
  name: string;
  slug: string;
  group: ExecutiveGroup;
  title: string;
  photo: string | null;
  bio: string | null;
  bullets: string[];
  /** Bio-drawer detail sections (STAFF-group rows); null/absent when none. */
  sections?: StaffSection[] | null;
  sortOrder: number;
}

export interface ContactInfo {
  address: string;
  phones: string[];
  footerPhones: string[];
  email: string;
  web: string;
  webUrl: string;
  slogan: string;
}
