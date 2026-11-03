import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { ParallaxLayer } from "@/components/team/parallax";
import { WaveField } from "@/components/team/wave-field";
import { TeamButton, teamButtonClass } from "@/components/team/button";
import { HistoryExperience } from "@/components/team/history-experience";
import { HistoryExtras } from "@/components/team/history-extras";
import { routes } from "@/config/routes";
import { hero, history, type TimelineEntry } from "@/content/site";
import { mergeCopy } from "@/lib/copy";
import { getHistoryPhotos, getPageCopy } from "@/lib/content";
import type { PageCopy } from "@/types/content";

export const metadata: Metadata = {
  description:
    "СЭЗИС-ийн сагсан бөмбөгийн шигшээ багийн түүх — 1992 оноос өнөөдрийг хүртэлх замнал, аваргын цолууд.",
  title: "Түүх",
};

export const revalidate = 60;

/**
 * Season-celebration history page: 720px ink hero with the outlined season
 * numeral over a parallax texture layer, then the sticky year rail +
 * paired era rows with photo mosaics (HistoryExperience) and the honour roll /
 * moments gallery / CTA band (HistoryExtras). Copy and timeline entries
 * come from the site-content history/page blob over static defaults; photos
 * come from the Cloudinary-backed history-photos content API, managed in
 * /admin → Хуудасны текст → Түүх.
 */
export default async function HistoryPage() {
  const [pageCopy, heroCopy, photos] = await Promise.all([
    getPageCopy("history", "page"),
    getPageCopy("home", "hero"),
    getHistoryPhotos(),
  ]);

  const copy = mergeCopy(
    { intro: history.intro, title: history.title },
    pageCopy,
  );
  const aublCopy =
    heroCopy?.aubl !== null &&
    typeof heroCopy?.aubl === "object" &&
    !Array.isArray(heroCopy.aubl)
      ? (heroCopy.aubl as PageCopy)
      : null;
  const aubl = mergeCopy({ ...hero.aubl }, aublCopy);
  const entries = timelineEntries(pageCopy);

  return (
    <>
      <section className="bg-ink relative flex min-h-[560px] flex-col items-center justify-center overflow-hidden text-center text-white md:min-h-[720px]">
        <ParallaxLayer speed={0.4}>
          <WaveField height={720} opacityRange={[0.05, 0.14]} />
        </ParallaxLayer>

        <div className="relative flex flex-col items-center px-4 py-20 sm:px-6">
          <nav
            aria-label="Breadcrumb"
            className="text-mute mb-4 flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] uppercase"
          >
            <Link href="/" className="transition-colors hover:text-white">
              Нүүр
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-white">Түүх</span>
          </nav>

          <span
            aria-hidden="true"
            className="font-display text-[clamp(150px,28vw,320px)] leading-[0.85] font-bold text-transparent select-none [-webkit-text-stroke:3px_#ffffff]"
          >
            35
          </span>

          <h1 className="font-display mt-4 text-[clamp(36px,6vw,56px)] leading-[1.18] font-bold tracking-[0.02em] uppercase">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-[560px] text-[16px] leading-[1.55] text-white/70 md:text-[18px]">
            {copy.intro}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#timeline"
              className={teamButtonClass({ variant: "inverse" })}
            >
              Цаг хугацааны тууз
            </a>
            <TeamButton variant="inverse-outline" href={routes.site.roster}>
              Тоглогчид
            </TeamButton>
          </div>

          <div
            aria-hidden="true"
            className="mt-12 hidden items-center gap-2 text-[12px] font-medium tracking-[0.12em] text-white/50 uppercase md:flex"
          >
            <ChevronDown className="animate-bounce" />
            Доош гүйлгэх
          </div>
        </div>
      </section>

      <div id="timeline" className="scroll-mt-32" aria-hidden="true" />

      <HistoryExperience entries={entries} photosByFolder={photos} />
      <HistoryExtras aubl={aubl} photosByFolder={photos} />
    </>
  );
}

/** Sanitizes the CMS-edited timeline array from the history/page blob. */
function timelineEntries(copy: PageCopy | null): TimelineEntry[] {
  const raw = copy?.timeline;
  if (!Array.isArray(raw)) return [];
  const entries: TimelineEntry[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.period !== "string" || entry.period === "") continue;
    entries.push({
      bullets: Array.isArray(entry.bullets)
        ? entry.bullets.filter((b): b is string => typeof b === "string")
        : undefined,
      highlightLabel:
        typeof entry.highlightLabel === "string"
          ? entry.highlightLabel
          : undefined,
      period: entry.period,
      text: typeof entry.text === "string" ? entry.text : undefined,
    });
  }
  return entries;
}
