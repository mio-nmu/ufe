import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero, type HeroCopy } from "@/components/team/hero";
import { HomeGallery, getHomeGallery } from "@/components/team/home-gallery";
import {
  HomeSpotlight,
  getHomeSpotlight,
} from "@/components/team/home-spotlight";
import { HomeTimeline } from "@/components/team/home-timeline";
import { HomeVisitBeacon } from "@/components/team/home-visit-beacon";
import { NewsGrid, type NewsItem } from "@/components/team/news-grid";
import { Reveal } from "@/components/team/reveal";
import { ScheduleStrip } from "@/components/team/schedule-strip";
import { ThanksSection } from "@/components/team/thanks-section";
import { routes } from "@/config/routes";
import {
  featuredNews,
  hero,
  history,
  homeTimeline,
  stats,
} from "@/content/site";
import { mergeCopy } from "@/lib/copy";
import { getGames, getNews, getPageCopy, getThanks } from "@/lib/content";
import type { NewsPostRow, PageCopy } from "@/types/content";

export const revalidate = 60;

interface StatItem {
  value: string;
  label: string;
}

export default async function HomePage() {
  const [
    heroCopy,
    statsCopy,
    newsCopy,
    historyCopy,
    timelineCopy,
    newsRows,
    gameRows,
    spotlight,
    gallery,
    thanks,
  ] = await Promise.all([
    getPageCopy("home", "hero"),
    getPageCopy("home", "stats"),
    getPageCopy("home", "news"),
    getPageCopy("history", "page"),
    getPageCopy("home", "timeline"),
    getNews({ limit: 12 }),
    getGames(),
    getHomeSpotlight(),
    getHomeGallery(),
    getThanks(),
  ]);

  const heroData: HeroCopy = mergeCopy(
    { ...hero, aubl: { ...hero.aubl } },
    heroCopy,
  );
  const historyIntro =
    typeof historyCopy?.intro === "string" && historyCopy.intro
      ? historyCopy.intro
      : history.intro;

  const numbers = statItems(statsCopy);

  const newsMeta = mergeCopy(
    {
      heading: featuredNews.heading,
      label: featuredNews.label,
      lead: featuredNews.lead,
    },
    newsCopy,
  );
  const newsItems: NewsItem[] = newsRows.length
    ? toNewsItems(newsRows)
    : featuredNews.items.map((item) => ({
        body: item.body,
        kicker: item.kicker,
        title: item.title,
      }));

  const played = gameRows
    .filter((game) => game.status === "FINAL")
    .sort((a, b) => b.tipsAt.localeCompare(a.tipsAt));
  const latestGame = played[0] ?? null;
  const upcoming = gameRows
    .filter((game) => game.status === "SCHEDULED")
    .sort((a, b) => a.tipsAt.localeCompare(b.tipsAt));
  const selectedGames = [...played.slice(0, 3), ...upcoming.slice(0, 5)];
  if (selectedGames.length < 8) {
    selectedGames.push(...played.slice(3, 3 + (8 - selectedGames.length)));
  }

  return (
    <>
      <HomeVisitBeacon />
      <ScheduleStrip
        games={selectedGames.sort((a, b) => a.tipsAt.localeCompare(b.tipsAt))}
      />
      <Hero copy={heroData} historyIntro={historyIntro} />

      {/* Latest news — featured card + stacked cards */}
      <section aria-label={newsMeta.label} className="bg-paper">
        <div className="team-shell py-12 md:py-16">
          <Reveal>
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="font-display text-brand text-[clamp(30px,4vw,40px)] leading-none font-bold tracking-[0.02em] uppercase">
                {newsMeta.heading}
              </h2>
              <Link
                href={routes.site.news}
                className="group text-brand hover:text-brand-2 team-focus flex min-h-11 items-center gap-1.5 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors"
              >
                Бүх мэдээ
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <NewsGrid items={newsItems} latestGame={latestGame} />
          </Reveal>
        </div>
      </section>

      {/* Numbers rail — big condensed stats, centered with breathing room */}
      <section aria-label="Тоонууд" className="border-brand bg-brand border-y">
        <div className="team-shell grid grid-cols-2 gap-x-12 gap-y-10 py-12 md:grid-cols-4 md:gap-x-16 md:py-16">
          {numbers.map((stat, index) => (
            <Reveal
              key={stat.label}
              delay={index * 60}
              className="flex flex-col items-center text-center"
            >
              <p className="font-display text-[clamp(40px,5vw,56px)] leading-none font-bold tracking-[0.02em] text-white">
                {stat.value}
              </p>
              <p className="mt-3 max-w-[180px] text-[13px] leading-[1.5] text-white/75">
                {stat.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <HomeTimeline copy={mergeCopy(homeTimeline, timelineCopy)} />

      {/* Team leaders (captain + coaches), the photo mosaic and the
          gratitude band close out the page above the footer. */}
      {spotlight.length > 0 ? <HomeSpotlight members={spotlight} /> : null}
      <HomeGallery tiles={gallery} />
      <ThanksSection thanks={thanks} tone="paper" />
    </>
  );
}

function statItems(copy: PageCopy | null): StatItem[] {
  const items = copy?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return stats.map((stat) => ({ label: stat.label, value: stat.value }));
  }
  return items.filter(
    (item): item is StatItem =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as StatItem).value === "string" &&
      typeof (item as StatItem).label === "string",
  );
}

/** NewsPost rows (newest first from the API) → home grid cards: featured
 *  posts first, then newest, max 3, each linking to its article. */
function toNewsItems(rows: NewsPostRow[]): NewsItem[] {
  return [...rows]
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
    .slice(0, 3)
    .map((row) => ({
      body: row.excerpt,
      image: row.coverImage,
      kicker: row.category,
      publishedAt: row.publishedAt,
      slug: row.slug,
      title: row.title,
    }));
}
