"use client";

import { formatClock, periodLabel, useLiveGame } from "@/hooks/use-live-game";

/**
 * Center column of the box-score header. Until the scorer puts the game
 * live it renders the schedule's static values (status, final score,
 * date); once live, the label, score and clock follow the scorer in real
 * time inside the same card — no separate live panel below it.
 */
export function LiveScoreCenter({
  dateLabel,
  gameId,
  rowIsFinal,
  rowLabel,
  rowOpponentScore,
  rowTeamScore,
}: {
  dateLabel: string;
  gameId: string;
  rowIsFinal: boolean;
  rowLabel: string;
  rowOpponentScore: number | null;
  rowTeamScore: number | null;
}) {
  const { displayClock, state } = useLiveGame(gameId);

  // The scorer's word wins over the schedule row: an in-progress game
  // shows live, and a scorer-final result shows before the row is updated.
  const isActive = state?.status === "LIVE" || state?.status === "HALFTIME";
  const scoredFinal = !rowIsFinal && state?.status === "FINAL" ? state : null;

  // Numbers spread wide so each sits visually beside its team's logo.
  const bigScore = (team: number, opponent: number) => (
    <p className="font-display my-2 flex items-center justify-center gap-x-[clamp(64px,10vw,200px)] text-[clamp(36px,8vw,56px)] leading-none font-bold text-white tabular-nums">
      <span>{team}</span>
      <span
        aria-hidden="true"
        className="text-[0.7em] font-normal text-white/40"
      >
        –
      </span>
      <span>{opponent}</span>
    </p>
  );

  if (isActive && state) {
    return (
      <div aria-live="polite" className="text-center">
        <p className="flex items-center justify-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-white/50 uppercase">
          <span
            aria-hidden="true"
            className="size-1.5 animate-pulse rounded-full bg-red-500"
          />
          <span className="text-red-500">
            {state.status === "HALFTIME" ? "HALFTIME" : "LIVE"} ·{" "}
            {periodLabel(state.period)}
          </span>
        </p>
        {bigScore(state.teamScore, state.opponentScore)}
        <p className="text-xs text-white/70 tabular-nums">
          {formatClock(displayClock)}
        </p>
      </div>
    );
  }

  if (scoredFinal) {
    return (
      <div className="text-center">
        <p className="text-[12px] font-bold tracking-[0.12em] text-white/60 uppercase">
          {scoredFinal.teamScore > scoredFinal.opponentScore
            ? "FINAL · WIN"
            : "FINAL · LOSS"}
        </p>
        {bigScore(scoredFinal.teamScore, scoredFinal.opponentScore)}
        <p className="text-xs text-white/50">{dateLabel}</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-[12px] font-bold tracking-[0.12em] text-white/60 uppercase">
        {rowLabel}
      </p>
      <p className="font-display my-2 flex items-center justify-center gap-x-[clamp(64px,10vw,200px)] text-[clamp(36px,8vw,56px)] leading-none font-bold text-white tabular-nums">
        <span>{rowIsFinal && rowTeamScore !== null ? rowTeamScore : "—"}</span>
        <span
          aria-hidden="true"
          className="text-[0.7em] font-normal text-white/40"
        >
          –
        </span>
        <span>
          {rowIsFinal && rowOpponentScore !== null ? rowOpponentScore : "—"}
        </span>
      </p>
      <p className="text-xs text-white/50">{dateLabel}</p>
    </div>
  );
}
