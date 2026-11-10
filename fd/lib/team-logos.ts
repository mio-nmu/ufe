/** Our own crest, shown on the home side of game cards. */
export const UFE_LOGO_SRC = "/images/team/ufe-secondary.png";

/** The opponent logo uploaded for this game in the admin, or null. */
export function gameOpponentLogo(game: {
  opponentLogo: string | null;
}): string | null {
  return game.opponentLogo || null;
}
