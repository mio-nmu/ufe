"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/team/reveal";
import { routes } from "@/config/routes";
import { timeline, type TimelineEntry } from "@/content/site";
import { cn } from "@/lib/utils";

/**
 * Which archive folders each era draws its photos from. An era shows up to
 * five photos; slots an era has no photo for are filled with a year tile so
 * every mosaic keeps at least two cells.
 */
const ERA_FOLDERS: Record<string, string[]> = {
  "1992": [],
  "1996": ["1996"],
  "1997-2006": ["1997-2000", "2006"],
  "2017-2018": ["2018"],
  "2018-2019": ["2019"],
  "2019-2020": ["2020"],
  "2021-2022": ["2021"],
  "2022-2023": ["2022"],
  "2023-2024": ["2023"],
  "2024-2025": ["2024"],
  "2025-2026": ["2025"],
  "2026-2027": ["2026"],
};

/**
 * Every year folder an era can draw from, oldest first — the folder picker
 * in the admin history-photos manager offers exactly this set.
 */
export const HISTORY_PHOTO_FOLDERS: readonly string[] = [
  ...new Set(Object.values(ERA_FOLDERS).flat()),
].sort((a, b) => Number(a.slice(0, 4)) - Number(b.slice(0, 4)));

/** Sticky chrome: site header (72px) + year rail (56px). */
const TOP_OFFSET = 128;

const MAX_PHOTOS = 5;
const MIN_TILES = 2;

/**
 * Mosaic cell spans on a 4×2 grid, by tile count: the first photo always
 * leads at 2×2, the rest share the right half.
 */
const TILE_SPANS: Record<number, string[]> = {
  2: ["col-span-2 row-span-2", "col-span-2 row-span-2"],
  3: ["col-span-2 row-span-2", "col-span-2", "col-span-2"],
  4: ["col-span-2 row-span-2", "col-span-2", "", ""],
  5: ["col-span-2 row-span-2", "", "", "", ""],
};

let tweenTimer = 0;

/**
 * Chronicle-style history: eras travel in pairs, one row per pair. On
 * desktop each row is 60% of the visible height, so the next pair always
 * peeks in from the bottom of the screen and invites the next scroll.
 * Inside a row the two eras share a subgrid — titles, photo mosaics and
 * copy line up across the pair. The sticky year rail is a scroll-spy:
 * both years of the row in view light up, and a click jumps to its era.
 *
 * Narrative copy comes from content/site.ts layered under the CMS-edited
 * timeline; only the era titles and photo folders are defined here.
 */

interface Era {
  id: string;
  navLabel: string;
  title: string;
  /** Up to MAX_PHOTOS photo URLs — empty slots render as year tiles. */
  photos: string[];
  highlight?: boolean;
  entry: TimelineEntry;
}

/**
 * Photos for each era, keyed by year folder. Sourced from the
 * Cloudinary-backed history-photos content API (managed in /admin →
 * Хуудасны текст → Түүх).
 */
export type TuuhPhotos = Record<string, string[]>;

export function HistoryExperience({
  entries,
  photosByFolder,
}: {
  entries: TimelineEntry[];
  photosByFolder: TuuhPhotos;
}) {
  const eras = buildEras(makeLookup(entries), photosByFolder);
  const rows = pairUp(eras);
  const [activeId, setActiveId] = useState(eras[0].id);
  const barRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);

  const activeRow = rows.findIndex((row) =>
    row.some((era) => era.id === activeId),
  );

  useEffect(() => {
    const clamp = (v: number, min: number, max: number) =>
      Math.min(max, Math.max(min, v));

    let lastScrollY = Number.NaN;
    const update = () => {
      lastScrollY = window.scrollY;
      const wrap = sectionsRef.current;
      if (!wrap) return;

      // An era is "current" once its top crosses the upper third of the
      // area below the sticky chrome.
      const mark = TOP_OFFSET + (window.innerHeight - TOP_OFFSET) * 0.3;
      let current = eras[0].id;
      for (const era of eras) {
        const el = document.getElementById(era.id);
        if (el && el.getBoundingClientRect().top <= mark) current = era.id;
      }

      const start = wrap.getBoundingClientRect().top + window.scrollY;
      const end = start + wrap.offsetHeight - window.innerHeight;
      const ratio =
        end > start ? clamp((window.scrollY - start) / (end - start), 0, 1) : 0;

      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`;
      setActiveId((prev) => (prev === current ? prev : current));
    };

    // Scroll events are browser-coalesced and update() only writes one
    // style, so call it directly — rAF-gating stalls in webviews where
    // requestAnimationFrame is paused. Some webviews also drop scroll
    // events entirely (compositor-side scrolling), so a slow interval acts
    // as a self-healing fallback — but only when the position moved.
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const interval = window.setInterval(() => {
      if (window.scrollY !== lastScrollY) update();
    }, 250);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the active year visible when the rail overflows (phones).
  useEffect(() => {
    const rail = railRef.current;
    const link = rail?.querySelector<HTMLElement>(`[data-era="${activeId}"]`);
    if (!rail || !link || rail.scrollWidth <= rail.clientWidth) return;
    rail.scrollLeft =
      link.offsetLeft - rail.clientWidth / 2 + link.clientWidth / 2;
  }, [activeId]);

  const jumpTo = (era: Era) => {
    const el = document.getElementById(era.id);
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    tweenScrollTo(
      el.getBoundingClientRect().top + window.scrollY - TOP_OFFSET - 32,
      reduced,
    );
  };

  return (
    <>
      {/* Sticky year rail — scroll-spy + reading progress, in the nav blue.
          Docks directly below the pinned 72px site header. */}
      <nav
        aria-label="Он цэс"
        className="bg-brand sticky top-[72px] z-30 h-14 border-b border-white/20"
      >
        <div className="team-shell flex h-full items-center">
          {/* mx-auto centers the years when they fit; auto margins collapse
              to zero on narrower viewports, where the rail scrolls instead. */}
          <ul
            ref={railRef}
            className="no-scrollbar mx-auto flex h-full items-center gap-1 overflow-x-auto md:gap-4"
          >
            {eras.map((era, index) => {
              const active = era.id === activeId;
              // On desktop both years of the row in view light up.
              const pairActive = !active && Math.floor(index / 2) === activeRow;
              return (
                <li key={era.id}>
                  <a
                    href={`#${era.id}`}
                    data-era={era.id}
                    aria-current={active ? "true" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      jumpTo(era);
                    }}
                    className={cn(
                      "font-display team-focus flex h-14 shrink-0 items-center border-b-2 px-3 text-[15px] font-semibold tracking-[0.12em] uppercase transition-colors [--focus-ring:#fff] md:px-4",
                      active
                        ? "border-white text-white"
                        : "border-transparent text-white/70 hover:text-white",
                      pairActive && "lg:border-white lg:text-white",
                    )}
                  >
                    {era.navLabel}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <div
          ref={barRef}
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-white"
          style={{ transform: "scaleX(0)" }}
        />
      </nav>

      <div ref={sectionsRef}>
        {rows.map((row, index) => (
          <EraRow key={row[0].id} eras={row} index={index} />
        ))}
      </div>

      {/* Continue exploring — roster & staff */}
      <section className="border-line bg-paper-soft border-t">
        <div className="team-shell grid gap-4 py-12 sm:grid-cols-2 md:py-16">
          {[
            { href: routes.site.roster, label: "Тоглогчид" },
            { href: routes.site.management, label: "Удирдлага" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="group border-line bg-paper hover:border-ink flex min-h-11 items-center justify-between rounded-lg border px-6 py-5 transition-colors"
            >
              <span className="font-display text-ink text-lg font-semibold tracking-[0.06em] uppercase">
                {label}
              </span>
              <ArrowRight
                className="text-ink size-5 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

/**
 * Lookup of timeline entries keyed by period: CMS-edited entries (from the
 * site-content history/page blob) layered over the static defaults, so an
 * admin can reword any era without the era structure needing every entry.
 */
function makeLookup(
  entries: TimelineEntry[],
): (period: string) => TimelineEntry {
  const merged = new Map(timeline.map((entry) => [entry.period, entry]));
  for (const entry of entries) {
    if (entry && typeof entry.period === "string") {
      merged.set(entry.period, entry);
    }
  }
  return (period: string): TimelineEntry => {
    const entry = merged.get(period);
    if (!entry) throw new Error(`Missing timeline entry: ${period}`);
    return entry;
  };
}

function buildEras(
  byPeriod: (period: string) => TimelineEntry,
  photos: TuuhPhotos,
): Era[] {
  return [
    {
      id: "1992",
      navLabel: "1992",
      title: "Аварга баг",
      photos: photosFor(photos, "1992"),
      entry: byPeriod("1992"),
    },
    {
      id: "1996",
      navLabel: "1996",
      title: "Үндсэн суурь",
      photos: photosFor(photos, "1996"),
      entry: byPeriod("1996"),
    },
    {
      id: "1997-2006",
      navLabel: "1997",
      title: "Медалийн жилүүд",
      photos: photosFor(photos, "1997-2006"),
      entry: byPeriod("1997–2006"),
    },
    {
      id: "2017-2018",
      navLabel: "2017",
      title: "Мөнгөн медаль",
      photos: photosFor(photos, "2017-2018"),
      entry: byPeriod("2017–2018"),
    },
    {
      id: "2018-2019",
      navLabel: "2018",
      title: "Elite 8",
      photos: photosFor(photos, "2018-2019"),
      entry: byPeriod("2018–2019"),
    },
    {
      id: "2019-2020",
      navLabel: "2019",
      title: "Elite 8",
      photos: photosFor(photos, "2019-2020"),
      entry: byPeriod("2019–2020"),
    },
    {
      id: "2021-2022",
      navLabel: "2021",
      title: "Шөвгийн дөрөв",
      photos: photosFor(photos, "2021-2022"),
      entry: byPeriod("2021–2022"),
    },
    {
      id: "2022-2023",
      navLabel: "2022",
      title: "Шөвгийн дөрөв",
      photos: photosFor(photos, "2022-2023"),
      entry: byPeriod("2022–2023"),
    },
    {
      id: "2023-2024",
      navLabel: "2023",
      title: "Sweet 16",
      photos: photosFor(photos, "2023-2024"),
      entry: byPeriod("2023–2024"),
    },
    {
      id: "2024-2025",
      navLabel: "2024",
      title: "Хүрэл медаль",
      photos: photosFor(photos, "2024-2025"),
      entry: byPeriod("2024–2025"),
    },
    {
      id: "2025-2026",
      navLabel: "2025",
      title: "Аварга",
      photos: photosFor(photos, "2025-2026"),
      highlight: true,
      entry: byPeriod("2025–2026"),
    },
    {
      id: "2026-2027",
      navLabel: "2026",
      title: "AUBL",
      photos: photosFor(photos, "2026-2027"),
      entry: byPeriod("2026–2027"),
    },
  ];
}

const photosFor = (photos: TuuhPhotos, eraId: string): string[] =>
  (ERA_FOLDERS[eraId] ?? [])
    .flatMap((folder) => photos[folder] ?? [])
    .slice(0, MAX_PHOTOS);

/** Eras in chronological pairs — one row each. */
function pairUp(eras: Era[]): Era[][] {
  const rows: Era[][] = [];
  for (let i = 0; i < eras.length; i += 2) rows.push(eras.slice(i, i + 2));
  return rows;
}

/** Timeout-driven eased scroll — programmatic "smooth" scrolling is
 *  unsupported in some webviews, and this lands identically everywhere. */
function tweenScrollTo(target: number, instant: boolean) {
  window.clearTimeout(tweenTimer);
  const start = window.scrollY;
  const delta = target - start;
  if (instant || Math.abs(delta) < 2) {
    window.scrollTo(0, target);
    return;
  }
  const duration = 650;
  const t0 = performance.now();
  const step = () => {
    const t = Math.min(1, (performance.now() - t0) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    window.scrollTo(0, start + delta * eased);
    if (t < 1) tweenTimer = window.setTimeout(step, 16);
  };
  step();
}

/**
 * One pair of eras. Desktop: 60% of the area under the sticky chrome, two
 * columns on a shared [header / mosaic / copy] subgrid so both halves line
 * up. Rows alternate white and soft gray so the peeking next row reads as
 * a new chapter; the champion row turns ink.
 */
function EraRow({ eras, index }: { eras: Era[]; index: number }) {
  const dark = eras.some((era) => era.highlight);

  return (
    <section
      className={cn(
        "border-t",
        dark
          ? "bg-ink border-white/10 text-white"
          : index % 2 === 0
            ? "border-line bg-paper"
            : "border-line bg-paper-soft",
      )}
    >
      <div className="team-shell grid gap-y-14 py-10 lg:min-h-[calc((100svh-128px)*0.6)] lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-x-10 lg:gap-y-5 lg:py-8 xl:gap-x-14">
        {eras.map((era, column) => (
          <Reveal
            key={era.id}
            id={era.id}
            as="article"
            delay={column * 80}
            className={cn(
              "relative flex scroll-mt-32 flex-col gap-5 lg:row-span-3 lg:grid lg:grid-rows-subgrid",
              // Hairline centred in the column gap, so both halves stay equal.
              column === 1 &&
                "lg:before:absolute lg:before:inset-y-0 lg:before:-left-5 lg:before:w-px xl:before:-left-7",
              column === 1 && (dark ? "before:bg-white/10" : "before:bg-line"),
            )}
          >
            <EraHeader era={era} dark={dark} />
            <EraMosaic era={era} dark={dark} />
            <EraCopy entry={era.entry} dark={dark} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Period eyebrow, era title and an outlined year numeral on the right. */
function EraHeader({ era, dark }: { era: Era; dark: boolean }) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p
            className={cn(
              "text-[12px] font-semibold tracking-[0.12em] uppercase",
              dark ? "text-white/60" : "text-mute",
            )}
          >
            {era.entry.period}
          </p>
          {era.entry.highlightLabel ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[12px] font-semibold tracking-[0.12em] uppercase",
                dark ? "bg-paper text-ink" : "bg-ink text-paper",
              )}
            >
              {era.entry.highlightLabel}
            </span>
          ) : null}
        </div>
        <h2
          className={cn(
            "font-display mt-2 text-[clamp(28px,3vw,40px)] leading-[1.05] font-bold tracking-[0.02em] uppercase",
            dark ? "text-white" : "text-ink",
          )}
        >
          {era.title}
        </h2>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "font-display shrink-0 text-[clamp(48px,5vw,72px)] leading-[0.8] font-bold text-transparent select-none",
          dark
            ? "[-webkit-text-stroke:1.5px_rgba(255,255,255,0.28)]"
            : "[-webkit-text-stroke:1.5px_rgba(11,21,38,0.16)]",
        )}
      >
        {era.navLabel}
      </span>
    </header>
  );
}

/**
 * 2–5 tile mosaic on a 4×2 grid: the lead photo takes the left half, the
 * rest split the right. Missing photos become outlined year tiles so an
 * era with one (or no) photo still reads as a deliberate composition.
 */
function EraMosaic({ era, dark }: { era: Era; dark: boolean }) {
  const tiles: (string | null)[] = [...era.photos];
  while (tiles.length < MIN_TILES) tiles.push(null);
  const spans = TILE_SPANS[tiles.length];

  return (
    <div className="grid aspect-[16/10] grid-cols-4 grid-rows-2 gap-2 lg:aspect-auto lg:min-h-[200px]">
      {tiles.map((src, i) => {
        const lead = i === 0;
        const frame = cn(
          "relative overflow-hidden rounded-md border",
          dark ? "border-white/15" : "border-line",
          spans[i],
        );
        return src ? (
          <div key={src} className={cn(frame, "group")}>
            <Image
              src={src}
              alt={`СЭЗИС-ийн шигшээ баг, ${era.entry.period}`}
              fill
              sizes={
                lead
                  ? "(min-width: 1024px) 24vw, 50vw"
                  : "(min-width: 1024px) 12vw, 25vw"
              }
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
        ) : (
          <div
            key={`tile-${i}`}
            aria-hidden="true"
            className={cn(
              frame,
              "flex items-center justify-center",
              dark ? "bg-white/5" : "bg-paper-muted",
            )}
          >
            <span
              className={cn(
                "font-display text-[clamp(40px,5vw,72px)] leading-none font-bold text-transparent select-none",
                dark
                  ? "[-webkit-text-stroke:1.5px_rgba(255,255,255,0.22)]"
                  : "[-webkit-text-stroke:1.5px_rgba(11,21,38,0.14)]",
              )}
            >
              {lead ? era.navLabel : "СЭЗИС"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EraCopy({ entry, dark }: { entry: TimelineEntry; dark: boolean }) {
  const tone = dark ? "text-white/75" : "text-mute";

  return (
    <div className="max-w-xl space-y-2 text-[15px] leading-[1.6]">
      {entry.text ? <p className={tone}>{entry.text}</p> : null}
      {entry.bullets ? (
        <ul className="space-y-1.5">
          {entry.bullets.map((bullet) => (
            <li key={bullet} className={cn("flex gap-2.5", tone)}>
              <span
                aria-hidden="true"
                className={cn(
                  "mt-2.5 size-1.5 shrink-0 rounded-full",
                  dark ? "bg-white/50" : "bg-brand/50",
                )}
              />
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
