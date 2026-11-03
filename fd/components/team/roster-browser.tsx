"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LayoutGrid,
  Rows3,
  Search,
} from "lucide-react";

import { PlayerCard, PlayerDetails } from "@/components/team/player-card";
import {
  basePosition,
  paginate,
  positionGroup,
  type RosterPlayer,
} from "@/components/team/roster-utils";
import { PlayerCutout } from "@/components/team/player-photo";
import { cn } from "@/lib/utils";

const COLUMNS: Array<{ key: SortKey; label: string; className?: string }> = [
  { key: "name", label: "Тоглогч" },
  { key: "number", label: "№" },
  { key: "position", label: "Поз" },
  { key: "height", label: "Өндөр" },
  { key: "major", label: "Мэргэжил" },
];

const POSITION_ORDER = ["guard", "forward", "center"];

/** One roster page = 15 players (3 rows × 5 columns on desktop). */
const PAGE_SIZE = 15;

const ROW_GRID =
  "grid grid-cols-[minmax(48px,64px)_minmax(180px,2.2fr)_minmax(72px,0.8fr)_minmax(96px,0.9fr)_minmax(110px,1.1fr)_minmax(96px,0.9fr)_minmax(88px,0.8fr)] items-center gap-x-4";

type ViewMode = "grid" | "table";

type SortKey = "name" | "number" | "position" | "height" | "major";

/**
 * Editorial roster: players only (the coaching staff lives on /staff),
 * paginated 15 per page in a 5-column grid, plus a sortable table view
 * sharing the same page size.
 */
export function RosterBrowser({ players }: { players: RosterPlayer[] }) {
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return players.filter((player) => {
      if (
        needle &&
        !player.name.toLowerCase().includes(needle) &&
        !String(player.number).includes(needle) &&
        !player.position.toLowerCase().includes(needle)
      ) {
        return false;
      }
      return true;
    });
  }, [players, query]);

  const { items: paged, totalPages } = paginate(filtered, page, PAGE_SIZE);

  return (
    <section className="bg-paper">
      <div className="team-shell py-12 md:py-16">
        <div className="mb-5 flex min-h-10 flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-end justify-between gap-3">
            <h2 className="font-display text-ink text-[clamp(26px,3vw,32px)] font-bold tracking-[0.02em] uppercase">
              Тоглогчид
            </h2>
            <span className="text-mute shrink-0 pb-1 text-[12px] tracking-[0.06em] uppercase">
              {filtered.length} тоглогч
            </span>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            <label className="border-line text-mute focus-within:border-ink flex h-9 min-w-0 flex-1 items-center gap-2 border px-3 sm:min-w-[180px] sm:flex-none">
              <Search className="size-4 shrink-0" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Тоглогч хайх"
                aria-label="Тоглогч хайх"
                className="text-ink placeholder:text-mute min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
              />
            </label>
            <div
              className="border-line flex border"
              role="group"
              aria-label="Харагдац солих"
            >
              <ViewButton
                active={view === "grid"}
                onClick={() => setView("grid")}
                label="Карт харагдац"
              >
                <LayoutGrid className="size-4" aria-hidden="true" />
              </ViewButton>
              <ViewButton
                active={view === "table"}
                onClick={() => setView("table")}
                label="Хүснэгт харагдац"
              >
                <Rows3 className="size-4" aria-hidden="true" />
              </ViewButton>
            </div>
          </div>
        </div>
        <div className="border-line border-t pt-6">
          <div key={view} className="view-swap">
            {filtered.length === 0 ? (
              <p className="text-mute py-16 text-center text-sm tracking-[0.06em] uppercase">
                Таарах тоглогч олдсонгүй
              </p>
            ) : view === "grid" ? (
              <>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                  {paged.map((player) => (
                    <PlayerCard key={player.number} player={player} />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                />
              </>
            ) : (
              <PlayerTable
                players={filtered}
                page={page}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "team-focus flex size-9 items-center justify-center transition-colors",
        active ? "bg-ink text-paper" : "text-mute hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Flat sortable table: sticky 48px header, 64px zebra rows, expandable.
 * Sorting runs over the WHOLE list first and the page slice comes after, so
 * page 1 always holds the true top of the chosen order.
 */
function PlayerTable({
  players,
  page,
  onPageChange,
}: {
  players: RosterPlayer[];
  page: number;
  onPageChange: (page: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...players].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "mn") * factor;
        case "number":
          return (a.number - b.number) * factor;
        case "position":
          return (
            (POSITION_ORDER.indexOf(positionGroup(a.position)) -
              POSITION_ORDER.indexOf(positionGroup(b.position))) *
            factor
          );
        case "height":
          return (a.heightCm - b.heightCm) * factor;
        case "major":
          return a.major.localeCompare(b.major, "mn") * factor;
      }
    });
  }, [players, sortKey, sortDir]);

  const { items: paged, totalPages } = paginate(sorted, page, PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <>
      <div className="border-line border">
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            {/* Sticky header row — docks below the pinned site header */}
            <div
              className={cn(
                ROW_GRID,
                "border-line bg-paper sticky top-[72px] z-10 border-b text-[12px] font-semibold tracking-[0.12em] uppercase",
              )}
            >
              {COLUMNS.map((column) => (
                <button
                  key={column.key}
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  aria-label={`${column.label} — эрэмбэлэх`}
                  className={cn(
                    "team-focus text-mute hover:text-ink flex items-center gap-1 px-4 py-3 text-left transition-colors",
                    column.key === "name" && "pr-0",
                  )}
                >
                  {column.label}
                  {sortKey === column.key ? (
                    sortDir === "asc" ? (
                      <ChevronUp
                        className="size-3.5 transition-transform duration-150"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronDown
                        className="size-3.5 transition-transform duration-150"
                        aria-hidden="true"
                      />
                    )
                  ) : null}
                </button>
              ))}
              <span className="text-mute px-4 py-3 text-[12px] font-semibold tracking-[0.12em] uppercase">
                Тоглосон
              </span>
            </div>

            {paged.map((player, index) => (
              <PlayerTableRow
                key={player.number}
                player={player}
                zebra={index % 2 === 1}
              />
            ))}
          </div>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
    </>
  );
}

function PlayerTableRow({
  player,
  zebra,
}: {
  player: RosterPlayer;
  zebra: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `player-row-details-${player.number}`;

  return (
    <div className={cn(zebra && "bg-paper-soft")}>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className={cn(
          ROW_GRID,
          "hover:bg-mute/10 border-line w-full border-b px-4 py-3 text-left transition-colors",
          "min-h-16 [&>*:first-child]:sticky [&>*:first-child]:left-0 [&>*:first-child]:bg-inherit",
        )}
      >
        <span className="font-display text-ink pl-1 text-lg font-bold">
          {String(player.number).padStart(2, "0")}
        </span>
        <span className="flex min-w-0 items-center gap-3">
          <span className="border-line bg-paper size-10 shrink-0 overflow-hidden rounded-md border">
            <PlayerCutout
              name={player.name}
              number={player.number}
              photo={player.photo}
              position={player.photoPosition ?? null}
              scale={player.photoScale ?? null}
              sizes="40px"
              fallbackClassName="[&>span]:text-3xl"
            />
          </span>
          <span className="min-w-0">
            <span className="font-display text-ink block truncate text-[15px] font-semibold tracking-[0.02em] uppercase">
              {player.name}
            </span>
            <span className="text-mute block truncate text-xs">
              {player.role ?? basePosition(player.position)}
            </span>
          </span>
        </span>
        <span className="text-ink truncate text-sm font-medium">
          {basePosition(player.position)}
        </span>
        <span className="text-ink truncate text-sm font-medium">
          {player.heightCm} см
        </span>
        <span className="text-ink truncate text-sm font-medium">
          {player.major}
        </span>
        <span className="text-ink truncate text-sm font-medium">
          {player.yearsPlaying}
        </span>
      </button>
      {expanded ? (
        <div id={detailsId} className={cn(zebra && "bg-paper-soft")}>
          <PlayerDetails player={player} />
        </div>
      ) : null}
    </div>
  );
}

/** Bordered page buttons + chevrons; hidden entirely for a single page. */
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
      aria-label="Хуудаслалт"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Өмнөх хуудас"
        className="team-focus border-line text-mute hover:border-ink hover:text-ink flex size-10 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-label={`Хуудас ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "team-focus font-display flex size-10 items-center justify-center border text-sm font-semibold transition-colors",
              item === page
                ? "border-ink bg-ink/5 text-ink"
                : "border-line text-mute hover:border-ink hover:text-ink",
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Дараагийн хуудас"
        className="team-focus border-line text-mute hover:border-ink hover:text-ink flex size-10 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
