"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { routes } from "@/config/routes";
import { formatClock, periodLabel, useLiveGame } from "@/hooks/use-live-game";
import { isHexColor, readableOn } from "@/lib/color";
import { gameOpponentLogo } from "@/lib/team-logos";
import type { GameRow } from "@/types/content";

/** A game still counts as "now" for this long after tip-off (it may be live). */
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

export function ScheduleStrip({ games }: { games: GameRow[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Arrows show only when there is a card on that side.
  const updateArrows = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setCanPrev(scroller.scrollLeft > 1);
    setCanNext(
      scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1,
    );
  };

  // Open on the next (or in-progress) game; earlier results stay reachable
  // with the arrows. Runs on the client only — "now" is the visitor's clock.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const target = nextGame(games, Date.now());
    const card =
      scroller && target
        ? scroller.querySelector<HTMLElement>(`[data-game-id="${target.id}"]`)
        : null;
    if (scroller && card) {
      scroller.scrollLeft +=
        card.getBoundingClientRect().left -
        scroller.getBoundingClientRect().left;
    }
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [games]);

  /** Moves one card (one strip width) left or right. */
  const step = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    scroller?.scrollBy({
      behavior: "smooth",
      left: direction * scroller.clientWidth,
    });
  };

  return (
    <section
      aria-label="Сүүлийн үр дүн болон удахгүй болох тоглолтууд"
      className="border-line bg-paper-soft w-full overflow-hidden border-b"
    >
      <div className="team-shell relative py-5">
        <div
          ref={scrollerRef}
          role="region"
          aria-label="Тоглолтын хуваарь"
          tabIndex={0}
          onScroll={updateArrows}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") step(-1);
            else if (event.key === "ArrowRight") step(1);
            else return;
            event.preventDefault();
          }}
          className="no-scrollbar focus-visible:ring-ink flex max-w-full min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset"
        >
          {games.length ? (
            games.map((game) => <ScheduleCard key={game.id} game={game} />)
          ) : (
            <Link
              href={routes.site.schedule}
              className="border-line bg-paper text-mute flex h-[128px] w-full items-center justify-center rounded-lg border text-sm"
            >
              Одоогоор тоглолтын хуваарь алга
            </Link>
          )}
        </div>
        {canPrev ? (
          <StripArrow direction="prev" onClick={() => step(-1)} />
        ) : null}
        {canNext ? (
          <StripArrow direction="next" onClick={() => step(1)} />
        ) : null}
      </div>
    </section>
  );
}

/** Round arrow button over the strip's left or right edge. */
function StripArrow({
  direction,
  onClick,
}: {
  direction: "next" | "prev";
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Өмнөх тоглолт" : "Дараагийн тоглолт"}
      onClick={onClick}
      className={`bg-paper/95 text-ink shadow-card hover:bg-paper absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-white md:size-9 ${
        direction === "prev" ? "left-1 md:left-10" : "right-1 md:right-10"
      }`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

function ScheduleCard({ game }: { game: GameRow }) {
  const [nowMs, setNowMs] = useState(0);
  const date = gameDate(game.tipsAt);
  const isFinal = game.status === "FINAL";
  const isCancelled = game.status === "CANCELLED";
  // Cost control — the home strip renders up to 8 cards: only a game within
  // 3h of tip-off keeps a live stream; a past game the schedule row still
  // shows unfinished is checked once (the scorer may have finished it);
  // finished, cancelled and future games make no requests at all.
  const msFromTip = nowMs > 0 ? nowMs - new Date(game.tipsAt).getTime() : null;
  const liveMode =
    isFinal || isCancelled || msFromTip === null
      ? "off"
      : Math.abs(msFromTip) < 3 * 60 * 60 * 1000
        ? "live"
        : msFromTip > 0
          ? "once"
          : "off";
  const { displayClock, refresh, state } = useLiveGame(game.id, liveMode);
  // The opponent's half uses the colour uploaded for them in the admin (ink
  // when none is set); its text flips to dark on light team colours.
  const opponentColor = isHexColor(game.opponentColor)
    ? game.opponentColor
    : null;
  const opponentOnLight = opponentColor
    ? readableOn(opponentColor) === "dark"
    : false;
  const opponentLogo = gameOpponentLogo(game);
  // Phones: the admin's short name when it really is shorter, else the
  // last word of the full name ("NUM Falcons" → "Falcons").
  // Phones show the admin's short name when one is set, else the full name
  // (it wraps onto two lines rather than being cut).
  const opponentMobile = game.opponentShort?.trim() || game.opponent;
  // The scorer's word wins over the schedule: a game the scorer has started
  // shows live even before its listed tip-off (early start, wrong schedule
  // time), and a scorer-final result shows even before the row is updated.
  const activeState =
    state?.status === "LIVE" || state?.status === "HALFTIME" ? state : null;
  const scoredFinal = !isFinal && state?.status === "FINAL" ? state : null;
  const isLive = activeState !== null;

  // Flip to "Pre game" on an open tab when the 10-minute window arrives.
  useEffect(() => {
    if (isLive || isFinal || isCancelled || scoredFinal) return;
    const update = () => setNowMs(Date.now());
    update();
    const interval = window.setInterval(update, 15_000);
    return () => window.clearInterval(interval);
  }, [isLive, isFinal, isCancelled, scoredFinal]);

  const isPreGame =
    !isLive &&
    !isFinal &&
    !isCancelled &&
    !scoredFinal &&
    nowMs > 0 &&
    nowMs >= new Date(game.tipsAt).getTime() - 10 * 60 * 1000;
  // Pre-game only: notice the tip-off if its push was missed. Once the game
  // is live, useLiveGame itself resyncs (and pushes carry every change).
  useEffect(() => {
    if (isLive || liveMode !== "live") return;
    const interval = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(interval);
  }, [isLive, liveMode, refresh]);

  const teamScore = activeState
    ? activeState.teamScore
    : scoredFinal
      ? scoredFinal.teamScore
      : isFinal
        ? game.teamScore
        : isPreGame
          ? 0
          : null;
  const opponentScore = activeState
    ? activeState.opponentScore
    : scoredFinal
      ? scoredFinal.opponentScore
      : isFinal
        ? game.opponentScore
        : isPreGame
          ? 0
          : null;

  return (
    <Link
      href={routes.site.game(game.id)}
      data-game-id={game.id}
      aria-label={`${date.month} ${date.day}, ${game.opponent}, ${isLive ? (activeState?.status === "HALFTIME" ? "halftime" : "live") : isPreGame ? "pre-game" : isFinal || scoredFinal ? "finished" : isCancelled ? "cancelled" : gameTime(game.tipsAt)}`}
      className="group/card bg-brand shadow-card hover:shadow-card-hover relative flex h-[112px] w-full shrink-0 snap-start flex-col justify-between overflow-hidden rounded-lg p-3 text-white transition-shadow duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
    >
      <span
        aria-hidden="true"
        className="bg-ink pointer-events-none absolute inset-0 [clip-path:polygon(52%_0,100%_0,100%_100%,48%_100%)]"
        style={opponentColor ? { backgroundColor: opponentColor } : undefined}
      />
      <div className="relative z-10 grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <div className="min-w-0 text-center">
          <span className="flex min-w-0 items-center justify-center gap-2">
            <Image
              src="/ufe-logo.png"
              alt=""
              width={80}
              height={80}
              className="size-[clamp(28px,4vw,40px)] shrink-0"
            />
            <span className="font-display block min-w-0 text-[clamp(14px,3vw,28px)] leading-tight font-bold tracking-[0.02em] uppercase sm:truncate">
              UFE BRONCOS
            </span>
          </span>
          {teamScore !== null && (
            <span className="font-display mt-1 block text-[clamp(24px,4vw,38px)] leading-none font-bold tabular-nums">
              {teamScore}
            </span>
          )}
        </div>

        <div className="bg-brand max-w-[104px] min-w-0 rounded-md px-1.5 py-1 text-center sm:max-w-none sm:px-3 sm:py-1.5">
          {isLive || isPreGame ? (
            <>
              <span className="flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase sm:text-[13px] sm:tracking-[0.12em]">
                <span
                  aria-hidden="true"
                  className="size-1.5 animate-pulse rounded-full bg-red-500"
                />
                {activeState?.status === "HALFTIME"
                  ? "Halftime"
                  : activeState
                    ? "Live"
                    : "Pre game"}
              </span>
              {activeState?.status === "LIVE" && (
                <span className="mt-1 block text-[10px] font-semibold tracking-[0.04em] uppercase sm:text-[12px] sm:tracking-[0.06em]">
                  {periodLabel(activeState.period)} ·{" "}
                  {formatClock(displayClock)}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="block text-[10px] font-semibold tracking-[0.08em] text-white/70 uppercase sm:text-[12px] sm:tracking-[0.12em]">
                {isFinal || scoredFinal
                  ? "Finished"
                  : isCancelled
                    ? "Цуцалсан"
                    : `${date.weekday} · ${date.month} ${date.day}`}
              </span>
              <span className="font-display mt-1 block text-[15px] font-bold tracking-[0.06em] uppercase sm:mt-2 sm:text-[18px]">
                VS
              </span>
              {!isFinal && !scoredFinal && !isCancelled && (
                <span className="mt-1 block text-[10px] font-semibold tracking-[0.04em] text-white/70 uppercase sm:mt-2 sm:text-[12px] sm:tracking-[0.06em]">
                  {gameTime(game.tipsAt)}
                  <span className="hidden sm:inline"> @ </span>
                  <span className="block leading-tight break-words sm:inline">
                    {game.venue}
                  </span>
                </span>
              )}
            </>
          )}
        </div>

        <div
          className={`min-w-0 text-center ${opponentOnLight ? "text-ink" : ""}`}
        >
          <span className="flex min-w-0 items-center justify-center gap-2">
            <span className="font-display block min-w-0 text-[clamp(14px,3vw,28px)] leading-tight font-bold tracking-[0.02em] uppercase sm:truncate">
              <span className="sm:hidden">{opponentMobile}</span>
              <span className="hidden sm:inline">{game.opponent}</span>
            </span>
            {opponentLogo && (
              <span className="flex size-[clamp(28px,4vw,40px)] shrink-0 items-center justify-center rounded-full bg-white p-[2px]">
                <Image
                  src={opponentLogo}
                  alt=""
                  width={80}
                  height={80}
                  className="size-full object-contain"
                />
              </span>
            )}
          </span>
          {opponentScore !== null && (
            <span className="font-display mt-1 block text-[clamp(24px,4vw,38px)] leading-none font-bold tabular-nums">
              {opponentScore}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function gameDate(iso: string) {
  const date = new Date(iso);
  const options = { timeZone: "Asia/Ulaanbaatar" };
  return {
    weekday: new Intl.DateTimeFormat("en-US", {
      ...options,
      weekday: "short",
    })
      .format(date)
      .toUpperCase(),
    month: new Intl.DateTimeFormat("en-US", {
      ...options,
      month: "short",
    })
      .format(date)
      .toUpperCase(),
    day: new Intl.DateTimeFormat("en-US", {
      ...options,
      day: "2-digit",
    }).format(date),
  };
}

function gameTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(iso));
}

/**
 * The first game (by tip-off) that is not over: scheduled and either still
 * ahead or tipped off within the live window. Null when every game is done.
 */
function nextGame(games: GameRow[], nowMs: number): GameRow | null {
  return (
    [...games]
      .sort((a, b) => a.tipsAt.localeCompare(b.tipsAt))
      .find(
        (game) =>
          game.status === "SCHEDULED" &&
          new Date(game.tipsAt).getTime() > nowMs - LIVE_WINDOW_MS,
      ) ?? null
  );
}
