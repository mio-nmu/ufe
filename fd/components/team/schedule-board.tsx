"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { routes } from "@/config/routes";
import { FilterPills } from "@/components/team/filter-pills";
import type { GameRow } from "@/types/content";
import { teamButtonClass } from "@/components/team/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

/** Mongolian month names for the pill tabs. */
const MONTHS = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];

/**
 * Schedule board: month pill tabs, home/away filter and a List ⇄ Calendar
 * switch. List rows are 88px on a [96px 56px 1fr 120px 220px] grid; the next
 * game gets a 4px ink edge + mist fill and scrolls into view on mount.
 * Calendar is a 7-column month grid whose change slides 240ms.
 */

type VenueFilter = "all" | "home" | "away";
type ViewMode = "list" | "calendar";

export function ScheduleBoard({ games }: { games: GameRow[] }) {
  const months = useMemo(() => {
    const seen = new Map<string, number>(); // key → label month number
    for (const game of games) {
      const key = monthKey(game.tipsAt);
      if (!seen.has(key)) {
        seen.set(key, new Date(game.tipsAt).getUTCMonth());
      }
    }
    return [...seen.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, monthIndex]) => ({
        label: MONTHS[monthIndex] ?? value,
        value,
      }));
  }, [games]);

  // Captured once per mount — useMemo below must stay pure during render.
  const [now] = useState(() => Date.now());
  const nextGame = useMemo(
    () =>
      games.find(
        (game) =>
          game.status === "SCHEDULED" && new Date(game.tipsAt).getTime() > now,
      ) ?? null,
    [games, now],
  );

  const defaultMonth = nextGame ? monthKey(nextGame.tipsAt) : months[0]?.value;
  const [month, setMonth] = useState(defaultMonth);
  const [venue, setVenue] = useState<VenueFilter>("all");
  const [view, setView] = useState<ViewMode>("list");
  const nextRowRef = useRef<HTMLLIElement>(null);

  // The next game auto-scrolls into view (subtle, once).
  useEffect(() => {
    if (!nextRowRef.current) return;
    const timer = window.setTimeout(() => {
      nextRowRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  const monthGames = useMemo(
    () =>
      games.filter((game) => {
        if (monthKey(game.tipsAt) !== month) return false;
        if (venue === "home") return game.isHome;
        if (venue === "away") return !game.isHome;
        return true;
      }),
    [games, month, venue],
  );

  return (
    <div className="team-shell pb-16 md:pb-20">
      {/* Controls: month tabs left, venue filter + view switch right */}
      <div className="border-line flex flex-wrap items-center justify-between gap-4 border-b py-4">
        <FilterPills
          label="Сар"
          options={months}
          value={month}
          onChange={setMonth}
        />
        <div className="flex flex-wrap items-center gap-4">
          <FilterPills
            label="Талбар"
            size="sm"
            options={[
              { value: "all", label: "Бүгд" },
              { value: "home", label: "Гэрээсээ" },
              { value: "away", label: "Гадаа" },
            ]}
            value={venue}
            onChange={setVenue}
          />
          <FilterPills
            label="Харагдац"
            size="sm"
            options={[
              { value: "list", label: "Жагсаалт" },
              { value: "calendar", label: "Хуанли" },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
      </div>

      {view === "list" ? (
        <ul key={`${month}-${venue}-list`} className="view-swap mt-6">
          {monthGames.map((game) => (
            <GameRowItem
              key={game.id}
              game={game}
              isNext={nextGame?.id === game.id}
              innerRef={nextGame?.id === game.id ? nextRowRef : undefined}
            />
          ))}
          {monthGames.length === 0 ? (
            <li className="text-mute py-12 text-center text-sm">
              Энэ сард тоглолт байхгүй.
            </li>
          ) : null}
        </ul>
      ) : (
        <MonthCalendar
          key={`${month}-${venue}-cal`}
          month={month}
          games={monthGames}
        />
      )}
    </div>
  );
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function GameRowItem({
  game,
  isNext,
  innerRef,
}: {
  game: GameRow;
  isNext: boolean;
  innerRef?: React.Ref<HTMLLIElement>;
}) {
  const parts = localParts(game.tipsAt);
  const opponent = game.opponentShort ?? game.opponent;
  const isFinal = game.status === "FINAL";
  const won =
    isFinal &&
    game.teamScore !== null &&
    game.opponentScore !== null &&
    game.teamScore > game.opponentScore;

  return (
    <li
      ref={innerRef}
      className={cn(
        // Mobile drops the (hidden) opponent-mark column so the matchup gets
        // the space; sm restores it, md adds the time/ticket columns.
        "border-line grid min-h-[88px] grid-cols-[72px_1fr] items-center gap-x-4 border-b px-4 transition-colors sm:grid-cols-[96px_56px_1fr] md:grid-cols-[96px_56px_1fr_120px_220px]",
        isNext && "border-l-ink bg-paper-soft border-l-4",
      )}
    >
      {/* Date block */}
      <div className="text-center">
        <p className="text-mute text-[12px] font-semibold tracking-[0.12em] uppercase">
          {parts.day}
        </p>
        <p className="font-display text-ink text-[32px] leading-none font-bold">
          {parts.date}
        </p>
      </div>

      {/* Opponent mark */}
      <span
        aria-hidden="true"
        className="bg-paper-soft border-line font-display text-mute hidden size-10 items-center justify-center rounded-full border text-[13px] font-bold sm:flex"
      >
        {opponent.slice(0, 3).toUpperCase()}
      </span>

      {/* Matchup — wraps to two lines on narrow phones instead of clipping */}
      <div className="min-w-0 py-3">
        <p className="font-display text-ink text-lg font-semibold tracking-[0.02em] uppercase">
          {game.isHome ? "vs" : "@"} {opponent}
        </p>
        <p className="text-mute mt-0.5 text-[13px]">
          {game.round ? `${game.round} · ` : ""}
          {game.venue}
        </p>
      </div>

      {/* Time / result */}
      <span className="text-mute hidden text-sm md:block">
        {isFinal ? "Тоглосон" : parts.time}
      </span>

      {/* Score or tickets */}
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-3 md:col-span-1 md:justify-end">
        {isFinal ? (
          <Link
            href={routes.site.game(game.id)}
            aria-label={`Box score: UFE ${game.teamScore} ${opponent} ${game.opponentScore}`}
            className="team-focus group flex min-h-11 items-center gap-3 rounded-sm"
          >
            <span className="font-display text-ink text-[28px] leading-none font-bold">
              {game.teamScore}–{game.opponentScore}
            </span>
            <span
              className={cn(
                "font-display inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[13px] font-bold",
                won ? "bg-ink text-paper" : "border-ink/25 text-mute border",
              )}
            >
              {won ? "W" : "L"}
            </span>
            <span className="text-mute group-hover:text-ink text-[12px] font-bold tracking-[0.06em] uppercase transition-colors">
              Box score
            </span>
          </Link>
        ) : game.status === "CANCELLED" ? (
          <span className="text-mute text-[13px] font-semibold tracking-[0.06em] uppercase">
            Цуцлагдсан
          </span>
        ) : (
          <div className="flex items-center gap-3">
            {game.streamUrl ? (
              <a
                href={game.streamUrl}
                target="_blank"
                rel="noreferrer"
                className="text-mute hover:text-ink hidden text-[13px] font-semibold tracking-[0.06em] uppercase transition-colors lg:inline"
              >
                Шууд дамжуулалт
              </a>
            ) : null}
            {game.ticketUrl ? (
              <a
                href={game.ticketUrl}
                target="_blank"
                rel="noreferrer"
                className={teamButtonClass({ size: "sm" })}
              >
                Тасалбар
              </a>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
}

/** UB is UTC+8 — render times in the venue's local timezone. */
function localParts(iso: string): { day: string; date: number; time: string } {
  const date = new Date(iso);
  const dayFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Asia/Ulaanbaatar",
  });
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    timeZone: "Asia/Ulaanbaatar",
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ulaanbaatar",
  });
  return {
    day: dayFmt.format(date),
    date: Number(dateFmt.format(date)),
    time: timeFmt.format(date),
  };
}

/** 7-column month grid: day numbers, game chips, 240ms slide on change. */
function MonthCalendar({ month, games }: { month: string; games: GameRow[] }) {
  const [year, mon] = month.split("-").map(Number);
  // Build cells for a Monday-first grid: leading blanks + days of month.
  const firstDay = new Date(Date.UTC(year, mon - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const lead = (firstDay.getUTCDay() + 6) % 7; // Monday → 0

  const byDay = new Map<number, GameRow[]>();
  for (const game of games) {
    const day = Number(
      new Date(game.tipsAt).toLocaleString("en-US", {
        day: "numeric",
        timeZone: "Asia/Ulaanbaatar",
      }),
    );
    const list = byDay.get(day) ?? [];
    list.push(game);
    byDay.set(day, list);
  }

  const cells: Array<number | null> = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  return (
    <div className="view-swap mt-6">
      <div className="border-line text-mute grid grid-cols-7 border-t border-l">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="border-line border-r border-b py-2 text-center text-[12px] font-semibold tracking-[0.12em] uppercase"
          >
            {weekday}
          </div>
        ))}
        {cells.map((day, index) => (
          <div
            key={index}
            className={cn(
              "border-line relative min-h-[120px] border-r border-b p-2",
              day === null && "bg-paper-soft/60",
            )}
          >
            {day !== null ? (
              <p className="font-display text-ink text-[13px] font-bold">
                {day}
              </p>
            ) : null}
            {(byDay.get(day ?? -1) ?? []).map((game) => {
              const isNext = game.status === "SCHEDULED";
              return (
                <Link
                  key={game.id}
                  href={routes.site.game(game.id)}
                  aria-label={`${game.opponent}, тоглолтын дэлгэрэнгүй`}
                  className={cn(
                    "team-focus mt-1 block max-w-full truncate px-1.5 py-0.5 text-left text-[12px] font-semibold",
                    isNext
                      ? "bg-ink text-paper"
                      : "bg-paper-soft text-mute border-line border",
                    "hover:border-ink",
                  )}
                  title={`${game.opponent} · ${game.venue}`}
                >
                  {game.isHome ? "vs" : "@"}{" "}
                  {game.opponentShort ?? game.opponent}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-mute mt-3 text-[12px] font-semibold tracking-[0.12em] uppercase">
        Хар талбар нь гэрээсээ тоглолт · цагаан дэвсгэрт нь дараагийн тоглолт
      </p>
    </div>
  );
}
