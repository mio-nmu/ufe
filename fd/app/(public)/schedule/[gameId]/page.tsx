import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LiveScoreCenter } from "@/components/team/live-score-display";
import { PageHero } from "@/components/team/page-hero";
import { routes } from "@/config/routes";
import { getGames } from "@/lib/content";
import { gameOpponentLogo, UFE_LOGO_SRC } from "@/lib/team-logos";
import type { GameRow } from "@/types/content";

export const revalidate = 60;

export default async function GameDetailsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = (await getGames()).find((item) => item.id === gameId);
  if (!game) notFound();

  const isFinal = game.status === "FINAL";
  const won =
    isFinal &&
    game.teamScore !== null &&
    game.opponentScore !== null &&
    game.teamScore > game.opponentScore;
  const opponentLogo = gameOpponentLogo(game);

  return (
    <>
      <PageHero
        breadcrumb="Тоглолтын дэлгэрэнгүй"
        title="Box score"
        subtitle={`${game.competition}${game.round ? ` · ${game.round}` : ""}`}
      />
      <div className="team-shell py-8 md:py-16">
        <Link
          href={routes.site.schedule}
          className="team-focus text-mute hover:text-ink inline-flex min-h-11 items-center text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors"
        >
          ← Бүх тоглолт руу буцах
        </Link>

        <section
          aria-label={`${gameTitle(game)} тоглолтын үр дүн`}
          className="bg-navy shadow-card mt-4 rounded-lg"
        >
          <div className="grid items-center gap-10 px-6 py-8 sm:grid-cols-[1fr_auto_1fr] sm:px-14 md:py-10">
            <div>
              <Image
                src={UFE_LOGO_SRC}
                alt="UFE Broncos"
                width={192}
                height={192}
                className="mx-auto h-[clamp(64px,10vw,96px)] w-auto sm:translate-y-2"
              />
            </div>

            <LiveScoreCenter
              dateLabel={gameDate(game.tipsAt)}
              gameId={game.id}
              rowIsFinal={isFinal}
              rowLabel={
                isFinal ? (won ? "FINAL · WIN" : "FINAL · LOSS") : game.status
              }
              rowOpponentScore={game.opponentScore}
              rowTeamScore={game.teamScore}
            />

            <div>
              {opponentLogo ? (
                <Image
                  src={opponentLogo}
                  alt={game.opponentShort ?? game.opponent}
                  width={192}
                  height={192}
                  className="mx-auto h-[clamp(64px,10vw,96px)] w-auto sm:translate-y-2"
                />
              ) : (
                <h2 className="font-display text-center text-2xl font-bold tracking-[0.02em] uppercase sm:text-3xl">
                  {game.opponentShort ?? game.opponent}
                </h2>
              )}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-white/10 px-4 py-3 text-[12px] font-semibold tracking-[0.06em] text-white/60 uppercase">
            {game.round ? <span>{game.round}</span> : null}
            <span>{game.venue}</span>
            {game.status === "SCHEDULED" ? (
              <span>
                {new Intl.DateTimeFormat("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "Asia/Ulaanbaatar",
                }).format(new Date(game.tipsAt))}
              </span>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}

function gameDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(iso));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameId: string }>;
}): Promise<Metadata> {
  const { gameId } = await params;
  const game = (await getGames()).find((item) => item.id === gameId);

  return {
    title: game ? `${gameTitle(game)} · Box score` : "Тоглолтын дэлгэрэнгүй",
  };
}

function gameTitle(game: GameRow): string {
  return `${game.isHome ? "vs" : "@"} ${game.opponentShort ?? game.opponent}`;
}
