import {
  fanClubFallback,
  frontOfficeHeroFallback,
  mediaHeroFallback,
  scheduleHeroFallback,
} from "@/content/pages";
import {
  contact,
  featuredNews,
  hero,
  history,
  homeTimeline,
  players,
  stats,
  thanks,
  timeline,
} from "@/content/site";

/**
 * Prefill registry for the page-copy JSON editor: for every editable
 * page/section this mirrors the static default the public page renders when
 * the blob is empty, so a never-edited section shows its real starting
 * values instead of a blank textarea. Sections without a static mirror
 * (fanmail, footer/social) return null and stay free-form.
 */
export function siteContentDefault(
  page: string,
  section: string,
): Record<string, unknown> | null {
  const defaults: Record<string, Record<string, unknown> | undefined> = {
    "contact/info": {
      address: contact.address,
      email: contact.email,
      footerPhones: [...contact.footerPhones],
      phones: [...contact.phones],
      slogan: contact.slogan,
      web: contact.web,
      webUrl: contact.webUrl,
    },
    "fan-club/page": fanClubFallback as unknown as Record<string, unknown>,
    "front-office/hero": { ...frontOfficeHeroFallback },
    "history/page": {
      intro: history.intro,
      timeline,
      title: history.title,
    },
    "home/hero": { ...hero, aubl: { ...hero.aubl } },
    "home/news": {
      heading: featuredNews.heading,
      label: featuredNews.label,
      lead: featuredNews.lead,
    },
    "home/stats": {
      items: stats.map((stat) => ({ label: stat.label, value: stat.value })),
    },
    "home/timeline": {
      ...homeTimeline,
      items: homeTimeline.items.map((item) => ({ ...item })),
    },
    "home/thanks": {
      heading: thanks.heading,
      paragraphOne: thanks.paragraphOne,
      paragraphTwo: thanks.paragraphTwo,
      sponsors: thanks.sponsors.map((sponsor) => sponsor),
    },
    "media/hero": { ...mediaHeroFallback },
    "players/page": { subtitle: players.subtitle, title: players.title },
    "schedule/hero": { ...scheduleHeroFallback },
  };
  return defaults[`${page}/${section}`] ?? null;
}
