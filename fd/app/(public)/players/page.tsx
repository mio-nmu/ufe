import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";

import { PageHero } from "@/components/team/page-hero";
import { RosterBrowser } from "@/components/team/roster-browser";
import type { RosterPlayer } from "@/components/team/roster-utils";
import { playerProfiles, players } from "@/content/site";
import { mergeCopy } from "@/lib/copy";
import { getPageCopy, getPlayers } from "@/lib/content";
import { toRosterPlayer } from "@/lib/players";

export const revalidate = 60;

export const metadata: Metadata = {
  description:
    "СЭЗИС-ийн сагсан бөмбөгийн шигшээ багийн бүрэлдэхүүн — тоглогчид.",
  title: players.title,
};

export default async function RosterPage() {
  const [copy, playerRows] = await Promise.all([
    getPageCopy("players", "page"),
    getPlayers(),
  ]);

  const meta = mergeCopy(
    { subtitle: players.subtitle, title: players.title },
    copy,
  );

  const roster: RosterPlayer[] = (
    playerRows.length > 0
      ? playerRows.map(toRosterPlayer)
      : playerProfiles.map((player) => ({
          ...player,
          // Static fallback has no slugs — detail pages use player-<number>.
          slug: `player-${player.number}`,
          photo: player.photo ?? null,
        }))
  ).map((player) => ({ ...player, photo: resolvePhoto(player) }));

  return (
    <>
      <PageHero
        breadcrumb="Тоглогчид"
        subtitle={meta.subtitle}
        title={meta.title}
        mark="/images/horse-mark.png"
      />

      <RosterBrowser players={roster} />
    </>
  );
}

/**
 * Transparent cutouts live at public/images/player/<number>.png — dropping a
 * file in is enough (an explicit `photo` field on the Player row always
 * wins). Same fallback applies to the static roster when the API is
 * unreachable.
 */
function resolvePhoto(player: RosterPlayer): null | string {
  if (player.photo) return player.photo;
  const file = path.join(
    process.cwd(),
    "public",
    "images",
    "player",
    `${player.number}.png`,
  );
  return fs.existsSync(file) ? `/images/player/${player.number}.png` : null;
}
