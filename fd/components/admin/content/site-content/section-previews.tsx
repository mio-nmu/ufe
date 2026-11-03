"use client";

import { Eye } from "lucide-react";

import { FanClubShop } from "@/components/team/fan-club-shop";
import type { FanClubContent } from "@/components/team/fan-club-shop";
import { Hero } from "@/components/team/hero";
import type { HeroCopy } from "@/components/team/hero";
import { HistoryExperience } from "@/components/team/history-experience";
import { NewsGrid } from "@/components/team/news-grid";
import type { NewsItem } from "@/components/team/news-grid";
import { PageHero } from "@/components/team/page-hero";
import { SiteFooter } from "@/components/team/site-footer";
import { fanClubFallback } from "@/content/pages";
import { contact, featuredNews, hero, history, timeline } from "@/content/site";
import type { TimelineEntry } from "@/content/site";
import { mergeCopy } from "@/lib/copy";
import type { ContactInfo, ShopProductRow } from "@/types/content";
import type { SiteSectionDef } from "@/components/admin/content/site-content/sections";

/**
 * Live previews for the page-copy editor. Each one mounts the actual
 * public-site component with the in-progress values (over the static
 * fallback, exactly like the public page resolves copy), so the preview
 * is the real render, not a mockup.
 */

export interface PreviewSupport {
  /** Live NewsPost rows mapped to grid cards (static fallback on failure). */
  newsItems: NewsItem[];
  /** Live shop products (static fallback on failure). */
  shopProducts: ShopProductRow[];
  /** Resolved history intro (home hero's third slide shows it). */
  historyIntro: string;
}

export function SectionPreview({
  def,
  data,
  support,
}: {
  def: SiteSectionDef;
  data: Record<string, unknown>;
  support: PreviewSupport;
}) {
  return (
    // Editorial preview frame: hairline border + the hero card's offset
    // shadow, so the "live site artifact" reads like the public site.
    <div className="border-line bg-paper border shadow-[8px_8px_0_var(--line)]">
      <div className="border-line bg-paper-soft text-mute flex items-center gap-1.5 border-b px-3 py-2 text-[12px] font-semibold tracking-[0.12em] uppercase">
        <Eye className="size-3.5" aria-hidden="true" />
        Шууд харагдац
      </div>
      <div className="bg-paper text-ink max-h-[720px] overflow-x-clip overflow-y-auto">
        <PreviewBody def={def} data={data} support={support} />
      </div>
    </div>
  );
}

function PreviewBody({
  def,
  data,
  support,
}: {
  def: SiteSectionDef;
  data: Record<string, unknown>;
  support: PreviewSupport;
}) {
  switch (`${def.page}/${def.section}`) {
    case "home/hero": {
      const copy = mergeCopy(
        { ...hero, aubl: { ...hero.aubl } },
        data,
      ) as unknown as HeroCopy;
      return <Hero copy={copy} historyIntro={support.historyIntro} />;
    }
    case "home/news": {
      const meta = mergeCopy(
        {
          heading: featuredNews.heading,
          label: featuredNews.label,
          lead: featuredNews.lead,
        },
        data,
      );
      return (
        <section className="bg-paper team-shell py-12">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="font-display text-ink text-[clamp(24px,3vw,36px)] leading-none font-bold tracking-[0.02em] uppercase">
              {meta.heading}
            </h2>
            <span className="eyebrow">Бүх мэдээ</span>
          </div>
          <NewsGrid items={support.newsItems} latestGame={null} />
        </section>
      );
    }
    case "home/stats": {
      const items = toArray(data.items)
        .map((item) => ({
          value: str(item.value, ""),
          label: str(item.label, ""),
        }))
        .filter((item) => item.value || item.label);
      return (
        <section className="border-line bg-paper-soft border-y">
          <div className="team-shell grid grid-cols-2 gap-y-8 py-12 md:grid-cols-4 md:py-16">
            {items.map((item) => (
              <div key={`${item.label}-${item.value}`} className="md:pl-6">
                <p className="font-display text-ink text-[clamp(28px,4vw,44px)] leading-none font-bold tracking-[0.02em]">
                  {item.value}
                </p>
                <p className="text-mute mt-2 max-w-[180px] text-[12px] leading-[1.5]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "home/thanks": {
      const merged = mergeCopy(
        {
          heading: "",
          paragraphOne: "",
          paragraphTwo: "",
          sponsors: [] as string[],
        },
        data,
      );
      const sponsors = Array.isArray(merged.sponsors)
        ? merged.sponsors.filter((s): s is string => typeof s === "string")
        : [];
      return (
        <section className="border-line team-shell grid gap-8 border-t py-12 md:grid-cols-2">
          <div>
            <p className="eyebrow">Талархал</p>
            <h2 className="font-display text-ink mt-3 text-[clamp(22px,3vw,32px)] leading-[1.05] font-bold tracking-[0.02em] uppercase">
              {merged.heading}
            </h2>
            <p className="text-mute mt-4 text-sm leading-[1.75]">
              {merged.paragraphOne}
            </p>
            <p className="text-mute mt-3 text-sm leading-[1.75]">
              {merged.paragraphTwo}
            </p>
          </div>
          <div className="border-line bg-paper-soft flex h-full flex-col justify-center gap-3 border p-6">
            <p className="eyebrow">Ивээн тэтгэгч, хамтран ажиллагчид</p>
            <p className="font-display text-ink text-lg leading-snug font-semibold tracking-[0.02em] uppercase">
              {sponsors.join(" · ")}
            </p>
          </div>
        </section>
      );
    }
    case "history/page": {
      const copy = mergeCopy(
        { intro: history.intro, title: history.title },
        data,
      );
      const entries = timelineEntries(data);
      return (
        <>
          <section className="bg-ink flex min-h-[280px] flex-col items-center justify-center px-4 py-12 text-center text-white">
            <h2 className="font-display text-[clamp(26px,4vw,44px)] leading-none font-bold tracking-[0.02em] uppercase">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-[520px] text-sm leading-[1.55] text-white/70">
              {copy.intro}
            </p>
          </section>
          {/* Text-only render: era photos are discovered from disk on the
              public page (client previews can't scan the archive). */}
          <HistoryExperience entries={entries} photosByFolder={{}} />
        </>
      );
    }
    case "players/page":
      return (
        <PageHero
          breadcrumb="Тоглогчид"
          title={str(data.title, "Тоглогчид")}
          subtitle={str(data.subtitle, "")}
        />
      );
    case "fan-club/page":
      return (
        <FanClubShop
          products={support.shopProducts}
          content={fanClubContent(data)}
        />
      );
    case "contact/info":
      return (
        <SiteFooter
          info={contactInfo(data)}
          brand={{
            facebook: null,
            instagram: null,
            logo: null,
            siteName: null,
          }}
        />
      );
    default:
      if (def.preview) {
        return (
          <PageHero
            breadcrumb={def.preview.breadcrumb}
            title={def.preview.title}
            subtitle={str(data.intro, "")}
          />
        );
      }
      return null;
  }
}

function timelineEntries(data: Record<string, unknown>): TimelineEntry[] {
  const entries = toArray(data.timeline)
    .map((entry) => ({
      period: str(entry.period, ""),
      text: typeof entry.text === "string" ? entry.text : undefined,
      bullets: Array.isArray(entry.bullets)
        ? entry.bullets.filter(
            (bullet): bullet is string => typeof bullet === "string",
          )
        : undefined,
      highlightLabel:
        typeof entry.highlightLabel === "string" && entry.highlightLabel
          ? entry.highlightLabel
          : undefined,
    }))
    .filter((entry) => entry.period.length > 0);
  return entries.length ? entries : [...timeline];
}

function fanClubContent(data: Record<string, unknown>): FanClubContent {
  return {
    cta: str(data.cta, fanClubFallback.cta),
    heroImage: str(data.heroImage, ""),
    orderEmail: contact.email,
    promos: strArray(data.promos, [...fanClubFallback.promos]),
    subtitle: str(data.subtitle, fanClubFallback.subtitle),
    title: str(data.title, fanClubFallback.title),
  };
}

function strArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as string[])
    : fallback;
}

function contactInfo(data: Record<string, unknown>): ContactInfo {
  const base: ContactInfo = {
    address: contact.address,
    email: contact.email,
    footerPhones: [...contact.footerPhones],
    phones: [...contact.phones],
    slogan: contact.slogan,
    web: contact.web,
    webUrl: contact.webUrl,
  };
  // Same pick rules as the public layout: only non-empty strings and
  // all-string arrays ever override the defaults.
  const picked: ContactInfo = { ...base };
  for (const key of Object.keys(base) as Array<keyof ContactInfo>) {
    const value = data[key];
    if (key === "phones" || key === "footerPhones") {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((v) => typeof v === "string")
      ) {
        picked[key] = value as string[];
      }
    } else if (typeof value === "string" && value.length > 0) {
      picked[key] = value;
    }
  }
  return picked;
}

function toArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];
}

// ── Preview normalization (mirrors the public page routes) ───────────────────

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}
