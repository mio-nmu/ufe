import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScheduleStrip } from "@/components/team/schedule-strip";
import type { GameRow } from "@/types/content";

vi.mock("@/hooks/use-live-game", () => ({
  formatClock: () => "00:00",
  useLiveGame: () => ({ displayClock: 0, refresh: () => {}, state: null }),
}));

const game = (overrides: Partial<GameRow> = {}): GameRow => ({
  id: "g1",
  competition: "League",
  round: null,
  opponent: "Golden Eagles",
  opponentShort: "Eagles",
  opponentLogo: null,
  opponentColor: null,
  isHome: true,
  tipsAt: "2026-03-01T11:00:00.000Z",
  venue: "Arena",
  status: "FINAL",
  teamScore: 80,
  opponentScore: 70,
  note: null,
  streamUrl: null,
  ticketUrl: null,
  ...overrides,
});

/** The clipped right-half layer that carries the opponent colour. */
const opponentHalf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[class*='clip-path']");

describe("ScheduleStrip opponent colour", () => {
  it("fills the opponent half with the uploaded colour", () => {
    const { container } = render(
      <ScheduleStrip games={[game({ opponentColor: "#A01C2B" })]} />,
    );
    expect(opponentHalf(container)?.style.backgroundColor).toBe(
      "rgb(160, 28, 43)",
    );
  });

  it("switches the opponent text to dark ink on a light colour", () => {
    const { getAllByText } = render(
      <ScheduleStrip games={[game({ opponentColor: "#FFD400" })]} />,
    );
    const name = getAllByText("Golden Eagles")[0];
    expect(name.closest("div.min-w-0")?.className).toContain("text-ink");
  });

  it("falls back to ink (no inline colour) when none is set or it is invalid", () => {
    for (const opponentColor of [null, "red; background:url(x)"]) {
      const { container, unmount } = render(
        <ScheduleStrip games={[game({ opponentColor })]} />,
      );
      expect(opponentHalf(container)?.style.backgroundColor).toBe("");
      unmount();
    }
  });

  it("uses the last word on phones when the short name is not shorter", () => {
    const { container } = render(
      <ScheduleStrip
        games={[
          game({ opponent: "NUM Falcons", opponentShort: "NUM Falcons" }),
        ]}
      />,
    );
    expect(container.querySelector(".sm\\:hidden")?.textContent).toBe(
      "Falcons",
    );
  });

  it("never prefixes other teams with NUM", () => {
    const { container } = render(<ScheduleStrip games={[game()]} />);
    expect(container.textContent).not.toContain("NUM");
  });
});

describe("ScheduleStrip opening position", () => {
  it("scrolls the next scheduled game to the start of the strip", () => {
    const now = Date.now();
    const at = (hours: number) =>
      new Date(now + hours * 3_600_000).toISOString();
    const games = [
      game({ id: "old", tipsAt: at(-72) }),
      game({
        id: "next",
        status: "SCHEDULED",
        tipsAt: at(24),
        teamScore: null,
        opponentScore: null,
      }),
      game({
        id: "later",
        status: "SCHEDULED",
        tipsAt: at(96),
        teamScore: null,
        opponentScore: null,
      }),
    ];
    // jsdom has no layout: give each card a fixed 300px-wide slot.
    const spy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const index = ["old", "next", "later"].indexOf(
          this.dataset.gameId ?? "",
        );
        const left = index < 0 ? 0 : index * 300;
        return {
          left,
          right: left + 300,
          top: 0,
          bottom: 0,
          width: 300,
          height: 0,
          x: left,
          y: 0,
          toJSON: () => ({}),
        };
      });

    const { getByRole } = render(<ScheduleStrip games={games} />);

    expect(getByRole("region", { name: "Тоглолтын хуваарь" }).scrollLeft).toBe(
      300,
    );
    spy.mockRestore();
  });

  it("stays at the start when every game is finished", () => {
    const { getByRole } = render(
      <ScheduleStrip games={[game({ id: "a" }), game({ id: "b" })]} />,
    );
    expect(getByRole("region", { name: "Тоглолтын хуваарь" }).scrollLeft).toBe(
      0,
    );
  });
});

describe("ScheduleStrip arrows", () => {
  it("shows the next arrow when more games are off-screen and steps one card", () => {
    const widths = vi
      .spyOn(HTMLElement.prototype, "scrollWidth", "get")
      .mockReturnValue(900);
    const client = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockReturnValue(300);
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollBy = scrollBy;

    const { getByRole, queryByRole } = render(
      <ScheduleStrip
        games={[game({ id: "a" }), game({ id: "b" }), game({ id: "c" })]}
      />,
    );

    expect(queryByRole("button", { name: "Өмнөх тоглолт" })).toBeNull();
    getByRole("button", { name: "Дараагийн тоглолт" }).click();
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "smooth", left: 300 });

    widths.mockRestore();
    client.mockRestore();
  });
});
