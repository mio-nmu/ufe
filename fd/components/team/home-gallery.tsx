import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/team/reveal";
import { routes } from "@/config/routes";
import { getAlbums } from "@/lib/content";

/**
 * Home photo strip: a fixed mosaic of the same albums that power /photos —
 * first image (or cover) per album, up to six tiles. No filters, no
 * pagination; the header link hands off to the full gallery.
 */

export interface GalleryTile {
  id: string;
  title: string;
  url: null | string;
  /** Real image count for the corner chip (0 hides it). */
  count: number;
}

export function HomeGallery({ tiles }: { tiles: GalleryTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <section
      aria-labelledby="home-gallery-title"
      className="border-line bg-paper-soft border-y"
    >
      <div className="team-shell py-12 md:py-16">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="eyebrow">ГАЛЕРЕЙ</p>
              <h2
                id="home-gallery-title"
                className="font-display text-ink mt-2 text-[clamp(30px,4vw,40px)] leading-none font-bold tracking-[0.02em] uppercase"
              >
                Зурагнууд
              </h2>
            </div>
            <Link
              href={routes.site.media}
              className="group text-mute hover:text-ink flex min-h-11 items-center gap-1.5 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors"
            >
              Бүх зургийг үзэх
              <ArrowUpRight
                className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <div className="grid grid-flow-dense auto-rows-[140px] grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-4">
            {tiles.map((tile, index) => (
              <GalleryTileLink
                key={tile.id}
                tile={tile}
                index={index}
                total={tiles.length}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function GalleryTileLink({
  tile,
  index,
  total,
}: {
  tile: GalleryTile;
  index: number;
  total: number;
}) {
  return (
    <Link
      href={routes.site.media}
      aria-label={`${tile.title} — галерейг үзэх`}
      className={`team-focus border-line bg-paper group relative overflow-hidden rounded-lg border ${tileSpans(index, total)}`}
    >
      {tile.url ? (
        <Image
          src={tile.url}
          alt={tile.title}
          fill
          sizes="(min-width: 1024px) 35vw, (min-width: 640px) 50vw, 90vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <span className="font-display text-mute/40 flex h-full w-full items-center justify-center px-4 text-center text-sm tracking-[0.12em] uppercase">
          {tile.title}
        </span>
      )}
      {tile.count > 0 ? (
        <span className="bg-ink text-paper absolute right-2 bottom-2 rounded-full px-2 py-0.5 text-[12px] font-semibold tracking-[0.06em]">
          {tile.count} фото
        </span>
      ) : null}
      <span className="bg-ink text-paper absolute top-3 right-3 z-10 px-2 py-1 text-[12px] font-semibold tracking-[0.12em] uppercase opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        Галерей <ArrowUpRight className="inline size-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

/** Mosaic span pattern: first tile 2×2, sixth tile full-row, rest 1×1. */
function tileSpans(index: number, total: number): string {
  if (index === 0) return "col-span-2 row-span-2";
  if (index === total - 1 && total >= 6) return "col-span-2 md:col-span-4";
  return "";
}

export async function getHomeGallery(count = 6): Promise<GalleryTile[]> {
  const albums = await getAlbums();
  return albums.slice(0, count).map((album) => ({
    id: album.id,
    title: album.title,
    url: album.images.find((image) => image.url)?.url ?? album.coverImage,
    count: album.images.length,
  }));
}
