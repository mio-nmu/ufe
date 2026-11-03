import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { routes } from "@/config/routes";
import type { GameRow } from "@/types/content";

const dateFormat = new Intl.DateTimeFormat("mn-MN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Ulaanbaatar",
});

/** One story card in the grid (from bd/ NewsPost rows or the static fallback). */
export interface NewsItem {
  kicker: string;
  title: string;
  body: string;
  /** Article link target — absent for the static fallback stories. */
  slug?: string;
  image?: string | null;
  publishedAt?: string;
}

/**
 * 12-column news grid: the top story (featured first, then newest) fills 8
 * columns with its cover image; the next two stories and a latest-result
 * card (schedule link when no game has finished) stack in the other 4.
 */
export function NewsGrid({
  items,
  latestGame,
}: {
  items: NewsItem[];
  latestGame: GameRow | null;
}) {
  const [lead, ...rest] = items;
  const opponent = latestGame?.opponentShort ?? latestGame?.opponent;
  const hasScore =
    latestGame !== null &&
    latestGame.teamScore !== null &&
    latestGame.opponentScore !== null;
  const result =
    hasScore && latestGame
      ? latestGame.teamScore! > latestGame.opponentScore!
        ? "Ялалт"
        : latestGame.teamScore! < latestGame.opponentScore!
          ? "Хожигдол"
          : "Тэнцээ"
      : null;

  return (
    <div className="grid gap-6 md:grid-cols-12">
      {lead ? (
        <StoryLink
          item={lead}
          className="group bg-ink card-lift relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-lg p-8 text-white md:col-span-8 md:min-h-[480px]"
        >
          <Image
            src={lead.image || "/season-welcome.png"}
            alt=""
            fill
            sizes="(min-width: 768px) 66vw, 100vw"
            className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="from-ink/90 via-ink/45 absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t to-transparent"
          />
          <div className="relative z-10 max-w-[560px]">
            <p className="text-[12px] font-semibold tracking-[0.12em] text-white/70 uppercase">
              {lead.kicker}
              {lead.publishedAt ? ` · ${formatDate(lead.publishedAt)}` : ""}
            </p>
            <h3 className="font-display mt-3 text-[clamp(26px,3.4vw,40px)] leading-[1.05] font-bold tracking-[0.02em] uppercase">
              {lead.title}
            </h3>
            <p className="mt-3 line-clamp-2 text-[15px] leading-[1.6] text-white/80">
              {lead.body}
            </p>
            {lead.slug && (
              <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.06em] uppercase">
                Унших
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            )}
          </div>
        </StoryLink>
      ) : null}

      <div className="flex flex-col gap-6 md:col-span-4">
        {rest.slice(0, 2).map((item) => (
          <StoryLink
            key={item.slug ?? item.title}
            item={item}
            className="border-line bg-paper card-lift relative flex rounded-lg border p-5"
          >
            <div className="min-w-0">
              <p className="eyebrow text-ink/65">{item.kicker}</p>
              <h3 className="font-display text-ink mt-1.5 text-[22px] leading-[1.1] font-semibold tracking-[0.02em] uppercase">
                {item.title}
              </h3>
              <p className="text-ink/65 mt-2 line-clamp-3 text-[13px] leading-[1.6]">
                {item.body}
              </p>
            </div>
          </StoryLink>
        ))}

        {latestGame && hasScore ? (
          <Link
            href={routes.site.game(latestGame.id)}
            className="team-focus group border-line bg-paper card-lift flex flex-col gap-1 rounded-lg border p-5"
          >
            <p className="eyebrow text-ink/65">Сүүлийн тоглолт</p>
            <p className="font-display text-ink text-[28px] leading-none font-bold tabular-nums">
              {latestGame.teamScore} – {latestGame.opponentScore}
            </p>
            <p className="text-ink/65 flex items-center gap-2 text-[13px]">
              {result} · СЭЗИС vs {opponent} · {formatDate(latestGame.tipsAt)}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </p>
          </Link>
        ) : (
          <Link
            href={routes.site.schedule}
            className="team-focus group border-line bg-paper card-lift flex min-h-24 flex-col justify-center gap-1 rounded-lg border p-5"
          >
            <p className="eyebrow text-ink/65">Тоглолтууд</p>
            <p className="font-display text-ink flex items-center gap-2 text-[22px] leading-none font-semibold tracking-[0.02em] uppercase">
              Хуваарь харах
              <ArrowRight
                className="size-5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </p>
            <p className="text-ink/65 text-[13px]">Шинэ тоглолтууд</p>
          </Link>
        )}
      </div>
    </div>
  );
}

/** Wraps a card in an article link when the story has one. */
function StoryLink({
  item,
  className,
  children,
}: {
  item: NewsItem;
  className: string;
  children: React.ReactNode;
}) {
  return item.slug ? (
    <Link
      href={routes.site.newsPost(item.slug)}
      className={`team-focus ${className}`}
    >
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

function formatDate(value: string) {
  return dateFormat.format(new Date(value));
}
