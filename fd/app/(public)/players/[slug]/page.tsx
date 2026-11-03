import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHero } from "@/components/team/page-hero";
import { PlayerCutout } from "@/components/team/player-photo";
import type { RosterPlayer } from "@/components/team/roster-utils";
import {
  basePosition,
  playerAge,
  splitName,
} from "@/components/team/roster-utils";
import { routes } from "@/config/routes";
import { playerProfiles, players } from "@/content/site";
import { getPlayerRowBySlug } from "@/lib/content";
import { toRosterPlayer } from "@/lib/players";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = await loadPlayer(slug);
  if (!player) notFound();

  const [firstName, lastName] = splitName(player.name);
  const age = playerAge(player.birthYear);
  const stats = [
    ["PPG", player.stats?.ppg],
    ["RPG", player.stats?.rpg],
    ["APG", player.stats?.apg],
  ] as const;
  const hasStats = stats.some(([, value]) => value !== undefined);

  return (
    <>
      <PageHero
        breadcrumb={player.name}
        parent={{ href: routes.site.roster, label: "Тоглогчид" }}
        subtitle={basePosition(player.position) || players.subtitle}
        title={player.name}
      />

      <section className="team-shell grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Portrait panel — same framing controls as the roster card */}
        <div className="bg-paper-soft border-line relative h-[420px] overflow-hidden border md:h-[500px]">
          <span
            aria-hidden="true"
            className="font-display text-mute/20 pointer-events-none absolute -top-4 right-2 z-0 text-[180px] leading-none font-bold select-none"
          >
            {String(player.number).padStart(2, "0")}
          </span>
          {player.role ? (
            <span className="bg-ink text-paper absolute bottom-4 left-4 z-10 px-2 py-1 text-[12px] font-semibold tracking-[0.12em] uppercase">
              {player.role}
            </span>
          ) : null}
          <div className="absolute inset-0 z-[5]">
            <PlayerCutout
              name={player.name}
              number={player.number}
              photo={player.photo}
              fallback="slot"
              anchor="center"
              position={player.photoPosition ?? null}
              scale={player.photoScale ?? null}
              sizes="(min-width: 1024px) 420px, 90vw"
            />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <p className="font-display text-mute text-[18px] leading-none font-semibold tracking-[0.06em] uppercase">
              {firstName}
            </p>
            <h2 className="font-display text-ink mt-1 text-[clamp(34px,5vw,54px)] leading-[1] font-bold tracking-[0.02em] uppercase">
              {lastName || firstName}
            </h2>
          </div>

          {/* Measurement strip: height / age / weight */}
          <div className="border-line grid max-w-md grid-cols-3 border-y py-3">
            <Fact label="Өндөр" value={`${player.heightCm} см`} />
            <Fact label="Нас" value={age === null ? "—" : `${age}`} />
            <Fact
              label="Жин"
              value={player.weightKg ? `${player.weightKg} кг` : "—"}
            />
          </div>

          {hasStats ? (
            <div className="border-line grid max-w-md grid-cols-3 border-y py-3">
              {stats.map(([label, value]) => (
                <Fact
                  key={label}
                  label={label}
                  value={value === undefined ? "—" : `${value}`}
                />
              ))}
            </div>
          ) : null}

          {player.motto || player.pregame || player.reason ? (
            <dl className="grid max-w-md gap-4">
              {(
                [
                  ["Баримталдаг зарчим", player.motto && `«${player.motto}»`],
                  ["Чухал тоглолтын өмнө", player.pregame],
                  ["Сагс сонгох болсон шалтгаан", player.reason],
                ] as const
              ).map(([label, value]) =>
                value ? (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-mute text-[12px] font-semibold tracking-[0.12em] uppercase">
                      {label}
                    </dt>
                    <dd className="text-ink text-sm leading-[1.6] font-medium">
                      {value}
                    </dd>
                  </div>
                ) : null,
              )}
            </dl>
          ) : null}

          {player.achievements.length > 0 ? (
            <div>
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
          ) : null}

          <div className="pt-2">
            <Link
              href={routes.site.roster}
              className="text-mute hover:text-ink team-focus inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Бүх тоглогчид
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line px-2 text-center first:pl-0 last:pr-0">
      <p className="text-mute text-[12px] font-semibold tracking-[0.12em] uppercase">
        {label}
      </p>
      <p className="font-display text-ink mt-1 text-[22px] leading-none font-bold">
        {value}
      </p>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const player = await loadPlayer(slug);
  return {
    title: player ? `${player.name} · ${players.title}` : players.title,
  };
}

async function loadPlayer(slug: string): Promise<RosterPlayer | null> {
  const row = await getPlayerRowBySlug(slug);
  if (row) return toRosterPlayer(row);
  return staticPlayerBySlug(slug);
}

/**
 * Player profile page. The API row wins; the static roster backs it up by
 * its derived player-<number> slug so links keep working when the backend
 * is unreachable. Purged with the players tag on admin saves.
 */

function staticPlayerBySlug(slug: string): RosterPlayer | null {
  const profile = playerProfiles.find((p) => `player-${p.number}` === slug);
  if (!profile) return null;
  return {
    ...profile,
    slug,
    photo: profile.photo ?? null,
  };
}
