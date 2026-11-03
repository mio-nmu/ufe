import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";

import { PlayerCutout } from "@/components/team/player-photo";
import type { RosterPlayer } from "@/components/team/roster-utils";
import {
  basePosition,
  playerAge,
  playerHref,
  splitName,
} from "@/components/team/roster-utils";

/**
 * Shared expandable detail block (achievements + the three personal lines)
 * reused by both the grid card and the table row.
 */
export function PlayerDetails({ player }: { player: RosterPlayer }) {
  const personalLines = [
    { label: "Баримталдаг зарчим", value: `«${player.motto}»` },
    { label: "Чухал тоглолтын өмнө", value: player.pregame },
    { label: "Сагс сонгох болсон шалтгаан", value: player.reason },
  ];

  return (
    <div className="border-line space-y-4 border-t">
      <div className="px-5 pt-4">
        <p className="eyebrow">Амжилтууд</p>
        <ul className="mt-2.5 space-y-1.5">
          {player.achievements.map((achievement) => (
            <li
              key={achievement}
              className="text-mute flex gap-2.5 text-[13px] leading-[1.6]"
            >
              <span
                className="bg-ink mt-2 size-1.5 shrink-0"
                aria-hidden="true"
              />
              {achievement}
            </li>
          ))}
        </ul>
      </div>
      <dl className="space-y-2 px-5">
        {personalLines.map((line) => (
          <div key={line.label} className="flex flex-col gap-0.5">
            <dt className="text-mute text-[12px] font-semibold tracking-[0.12em] uppercase">
              {line.label}
            </dt>
            <dd className="text-ink text-sm leading-[1.6] font-medium">
              {line.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Editorial roster card: mist portrait panel with the 132px jersey numeral
 * watermark, position chip beside the stacked name (kept OFF the photo so it
 * never covers the player), 3-up measurement strip (height / age / weight)
 * behind hairline rules. The WHOLE card is the link to the player's detail
 * page — the footer row is just the visual affordance. Hover lifts the card
 * and grows a 4px ink top border.
 */
export function PlayerCard({ player }: { player: RosterPlayer }) {
  const [firstName, lastName] = splitName(player.name);
  const age = playerAge(player.birthYear);

  return (
    <Link
      href={playerHref(player)}
      aria-label={`${player.name} — дэлгэрэнгүй`}
      className="card-lift border-line bg-paper team-focus group relative flex flex-col overflow-hidden rounded-lg border"
    >
      {/* Ink top border that grows in on hover */}

      {/* Portrait panel: mist ground, watermark numeral, role pill */}
      <div className="bg-paper-soft relative h-[280px] overflow-hidden md:h-[300px]">
        <span
          aria-hidden="true"
          className="font-display text-mute/20 pointer-events-none absolute -top-2 right-2 z-0 text-[132px] leading-none font-bold select-none"
        >
          {String(player.number).padStart(2, "0")}
        </span>
        {player.role ? (
          <span className="bg-ink text-paper absolute bottom-3 left-3 z-10 px-2 py-1 text-[12px] font-semibold tracking-[0.12em] uppercase">
            {player.role}
          </span>
        ) : null}
        <div className="absolute inset-0 z-[5] transition-transform duration-300 group-hover:scale-[1.03]">
          <PlayerCutout
            name={player.name}
            number={player.number}
            photo={player.photo}
            fallback="slot"
            anchor="center"
            position={player.photoPosition ?? null}
            scale={player.photoScale ?? null}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
          />
        </div>
      </div>

      {/* Name block: position chip, small first name, big last name */}
      <div className="px-4 pt-4">
        <span className="border-line text-ink mb-2 inline-block rounded-full border px-2.5 py-0.5 text-[12px] font-bold tracking-[0.12em] uppercase">
          {basePosition(player.position)}
        </span>
        <p className="font-display text-mute text-[13px] leading-none font-semibold tracking-[0.06em] break-words uppercase sm:text-[15px]">
          {firstName}
        </p>
        <h3 className="font-display text-ink mt-1 text-[21px] leading-[1.05] font-bold tracking-[0.02em] break-words uppercase sm:text-[30px] sm:leading-[1.02]">
          {lastName || firstName}
        </h3>
      </div>

      {/* Measurement strip behind hairline rules */}
      <div className="border-line mx-4 mt-3 grid grid-cols-3 border-y py-2.5">
        <MeasureCell label="Өндөр" value={`${player.heightCm}`} />
        <MeasureCell label="Нас" value={age === null ? "—" : `${age}`} />
        <MeasureCell
          label="Жин"
          value={player.weightKg ? `${player.weightKg}` : "—"}
        />
      </div>

      {/* Footer affordance — the whole card is the link */}
      <div className="mt-auto pt-3">
        <span className="text-mute group-hover:text-ink flex w-full items-center justify-between gap-2 border-t px-5 py-3.5 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors">
          <span className="flex items-center gap-2">
            <Trophy className="size-4" aria-hidden="true" />
            Дэлгэрэнгүй
          </span>
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

/** Cell of the card's 3-up measurement strip. */
function MeasureCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 text-center first:pl-0 last:pr-0">
      <p className="text-mute text-[12px] font-semibold tracking-[0.12em] uppercase">
        {label}
      </p>
      <p className="font-display text-ink mt-1 text-[20px] leading-none font-bold">
        {value}
      </p>
    </div>
  );
}
