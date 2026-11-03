/**
 * Static team logo assets for game cards. Opponent logos live in
 * /public/images/team/ and are matched by name so new teams only need
 * a file dropped here plus one entry.
 */

const OPPONENT_LOGOS: { match: string; src: string }[] = [
  { match: "FALCONS", src: "/images/team/falcons.png" },
];

export const UFE_LOGO_SRC = "/images/team/ufe-secondary.png";

/** The logo uploaded for this game in the admin, else a bundled asset. */
export function gameOpponentLogo(game: {
  opponent: string;
  opponentLogo: string | null;
}): string | null {
  return game.opponentLogo || opponentLogoSrc(game.opponent);
}

/** Logo asset for an opponent, or null when the team has none yet. */
function opponentLogoSrc(opponent: string): string | null {
  const name = opponent.toUpperCase();
  return OPPONENT_LOGOS.find((logo) => name.includes(logo.match))?.src ?? null;
}
