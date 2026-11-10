import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LiveScorer, projectAction } from "@/components/admin/live-scorer";
import type {
  LiveGameEvent,
  LiveGameState,
} from "@/services/live-games.service";
import type { GameRow } from "@/types/content";

/**
 * projectAction is the pure projection; the component tests below cover the
 * burst guard — the regression where an older action's late response (or a
 * stale SSE-triggered GET) reverted the score the operator already saw.
 */

const mocks = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  liveGamesService: {
    get: vi.fn(),
    ensure: vi.fn(),
    events: vi.fn(),
    action: vi.fn(),
  },
}));

vi.mock("@/lib/api-client", () => ({ api: mocks.api }));
vi.mock("@/services/live-games.service", () => ({
  liveGamesService: mocks.liveGamesService,
}));

/** Minimal EventSource stand-in — jsdom has none. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  private listeners = new Map<string, (event: { data: string }) => void>();
  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(
    type: string,
    callback: (event: { data: string }) => void,
  ): void {
    this.listeners.set(type, callback);
  }
  emit(type: string, payload: unknown = {}): void {
    const callback = this.listeners.get(type);
    if (callback) act(() => callback({ data: JSON.stringify(payload) }));
  }
  close(): void {}
}

const game: GameRow = {
  id: "game-1",
  competition: "League",
  round: null,
  opponent: "NUM Falcons",
  opponentShort: null,
  opponentLogo: null,
  isHome: true,
  tipsAt: new Date().toISOString(),
  venue: "Home",
  status: "SCHEDULED",
  teamScore: null,
  opponentScore: null,
  note: null,
  streamUrl: null,
  ticketUrl: null,
};

function base(overrides: Partial<LiveGameState> = {}): LiveGameState {
  return {
    id: "state",
    gameId: "game",
    status: "LIVE",
    period: 1,
    clockSeconds: 700,
    clockRunning: true,
    teamScore: 0,
    opponentScore: 0,
    opponentFouls: [0, 0, 0, 0],
    teamFouls: [0, 0, 0, 0],
    timeouts: [6, 6],
    lineup: [],
    startedAt: null,
    endedAt: null,
    // The snapshot is 10s old: a running clock has moved on since.
    serverTime: new Date(Date.now() - 10_000).toISOString(),
    updatedAt: new Date(Date.now() - 10_000).toISOString(),
    ...overrides,
  };
}

interface ActionResult {
  event: LiveGameEvent;
  reversedEventId?: string;
  state: LiveGameState;
}

let eventSeq = 0;

/** A scorer action response: the new state plus the event it recorded. */
function result(state: LiveGameState, id = `evt-${++eventSeq}`): ActionResult {
  return {
    event: {
      id,
      type: "score",
      payload: {},
      reversed: false,
      createdAt: new Date().toISOString(),
    },
    state,
  };
}

/** The big-board UFE score — the value the operator watches revert. */
function bigScore(container: HTMLElement): string {
  const el = container.querySelector("strong.text-5xl");
  if (!el) throw new Error("big score element not found");
  return el.textContent ?? "";
}

async function mountScorer(): Promise<HTMLElement> {
  const { container } = render(<LiveScorer />);
  await screen.findByRole("heading", { name: "Score controls" });
  return container;
}

beforeEach(() => {
  vi.stubGlobal("EventSource", FakeEventSource);
  FakeEventSource.instances = [];
  mocks.api.get.mockImplementation((path: string) =>
    path.includes("/games")
      ? Promise.resolve({ items: [game] })
      : Promise.resolve({ items: [] }),
  );
  mocks.api.post.mockReset();
  mocks.liveGamesService.ensure.mockReset();
  mocks.liveGamesService.events.mockReset();
  mocks.liveGamesService.get.mockReset();
  mocks.liveGamesService.action.mockReset();
  mocks.liveGamesService.ensure.mockResolvedValue({ state: base() });
  mocks.liveGamesService.events.mockResolvedValue({
    events: [] as LiveGameEvent[],
  });
  mocks.liveGamesService.get.mockResolvedValue({ state: base() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("projectAction clock handling", () => {
  it("burns elapsed seconds into the projection so the clock never jumps back up", () => {
    // Clock running, last server sync 10s ago: the user sees ~690.
    // A score tap must not reset the displayed clock to 700.
    const next = projectAction(base(), {
      points: 2,
      side: "team",
      type: "score",
    });
    expect(next.clockSeconds).toBe(690);
    expect(next.teamScore).toBe(2);
    expect(next.clockRunning).toBe(true);
  });

  it("keeps a paused clock frozen regardless of sync age", () => {
    const next = projectAction(
      base({
        clockRunning: false,
        updatedAt: new Date(Date.now() - 60_000).toISOString(),
      }),
      { points: 1, side: "opponent", type: "score" },
    );
    expect(next.clockSeconds).toBe(700);
    expect(next.opponentScore).toBe(1);
  });

  it("applies an explicit clock time and pauses it", () => {
    const next = projectAction(base(), {
      running: false,
      seconds: 463,
      type: "clock",
    });
    expect(next.clockSeconds).toBe(463);
    expect(next.clockRunning).toBe(false);
  });

  it("start does not run an empty clock", () => {
    const next = projectAction(base({ clockRunning: false, clockSeconds: 0 }), {
      type: "start",
    });
    expect(next.status).toBe("LIVE");
    expect(next.clockRunning).toBe(false);
  });

  it("reset wipes the game to a fresh pre-tip state", () => {
    const next = projectAction(
      base({ teamScore: 21, opponentScore: 13, period: 3 }),
      { type: "reset" },
    );
    expect(next.status).toBe("NOT_STARTED");
    expect(next.period).toBe(1);
    expect(next.clockSeconds).toBe(600);
    expect(next.clockRunning).toBe(false);
    expect(next.teamScore).toBe(0);
    expect(next.opponentScore).toBe(0);
  });
});

describe("LiveScorer burst guard", () => {
  it("drops an older action's late response instead of reverting the score", async () => {
    const container = await mountScorer();

    // +3 then +2 tapped faster than the server answers (basket + and-one).
    let resolveFirst!: (value: ActionResult) => void;
    let resolveSecond!: (value: ActionResult) => void;
    mocks.liveGamesService.action
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve)),
      )
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveSecond = resolve)),
      );

    const plus3 = screen.getAllByRole("button", { name: "+3" })[0]; // UFE block
    const plus2 = screen.getAllByRole("button", { name: "+2" })[0];
    fireEvent.click(plus3);
    expect(bigScore(container)).toBe("3");
    fireEvent.click(plus2);
    expect(bigScore(container)).toBe("5");

    // Newest response lands first and applies.
    await act(async () => {
      resolveSecond(result(base({ teamScore: 5 })));
    });
    expect(bigScore(container)).toBe("5");

    // The stale +3 response lands LAST — before the fix this reverted 5 → 3.
    await act(async () => {
      resolveFirst(result(base({ teamScore: 3 })));
    });
    expect(bigScore(container)).toBe("5");
  });

  it("ignores pushed SSE state while an action is still in flight", async () => {
    const container = await mountScorer();

    let resolveAction!: (value: ActionResult) => void;
    mocks.liveGamesService.action.mockImplementationOnce(
      () => new Promise((resolve) => (resolveAction = resolve)),
    );

    const plus3 = screen.getAllByRole("button", { name: "+3" })[0];
    fireEvent.click(plus3);
    expect(bigScore(container)).toBe("3");

    // A push arrives while the action POST is unresolved carrying the
    // pre-action state — applying it would flash 3 → 0.
    const stream = FakeEventSource.instances.at(-1);
    stream?.emit("state_changed", { state: base({ teamScore: 0 }) });
    await act(async () => {});
    expect(bigScore(container)).toBe("3");

    await act(async () => {
      resolveAction(result(base({ teamScore: 3 })));
    });
    expect(bigScore(container)).toBe("3");
  });

  it("logs the action's event from its response without refetching history", async () => {
    await mountScorer();
    const eventsCalls = mocks.liveGamesService.events.mock.calls.length;
    mocks.liveGamesService.action.mockResolvedValueOnce(
      result(base({ teamScore: 3 }), "evt-42"),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "+3" })[0]);
    await waitFor(() =>
      expect(mocks.liveGamesService.action).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(screen.getByText(/^score ·/)).toBeTruthy());
    expect(mocks.liveGamesService.events.mock.calls.length).toBe(eventsCalls);
  });

  it("resyncs on stream (re)connect so missed events heal", async () => {
    const container = await mountScorer();

    mocks.liveGamesService.get.mockResolvedValue({
      state: base({ teamScore: 8 }),
    });
    const stream = FakeEventSource.instances.at(-1);
    await act(async () => {
      stream?.onopen?.();
    });
    await waitFor(() => expect(bigScore(container)).toBe("8"));
  });
});

describe("LiveScorer game picker", () => {
  it("opens the scheduled game nearest to now, not the oldest unfinished one", async () => {
    const stale = {
      ...game,
      id: "stale",
      opponent: "Never finalised",
      tipsAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const tonight = {
      ...game,
      id: "tonight",
      opponent: "Tonight",
      tipsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
    mocks.api.get.mockImplementation((path: string) =>
      path.includes("status=SCHEDULED")
        ? Promise.resolve({ items: [stale, tonight] })
        : Promise.resolve({ items: [] }),
    );

    await mountScorer();

    expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe(
      "tonight",
    );
  });
});

describe("overtime clock controls", () => {
  it("resets to the period's own length", async () => {
    mocks.liveGamesService.ensure.mockResolvedValue({
      state: base({ period: 5, clockRunning: false, clockSeconds: 120 }),
    });
    mocks.liveGamesService.action.mockResolvedValueOnce(
      result(base({ period: 5, clockRunning: false, clockSeconds: 300 })),
    );
    await mountScorer();

    fireEvent.click(await screen.findByRole("button", { name: "Reset 05:00" }));

    expect(mocks.liveGamesService.action).toHaveBeenCalledWith(
      game.id,
      expect.objectContaining({ running: false, seconds: 300, type: "clock" }),
    );
  });

  it("projects a typed time no longer than the overtime", () => {
    const next = projectAction(base({ period: 5, clockRunning: false }), {
      running: false,
      seconds: 720,
      type: "clock",
    });
    expect(next.clockSeconds).toBe(300);
  });
});

describe("clock toggle", () => {
  it.each([
    [
      { status: "NOT_STARTED" as const, clockRunning: false },
      "Start game",
      { type: "start" },
    ],
    [
      { status: "LIVE" as const, clockRunning: true },
      "Stop clock",
      { running: false, type: "clock" },
    ],
    [
      { status: "LIVE" as const, clockRunning: false },
      "Start clock",
      { running: true, type: "clock" },
    ],
    [
      { status: "HALFTIME" as const, clockRunning: false },
      "Resume game",
      { type: "start" },
    ],
  ])(
    "%o shows %s and sends the matching action",
    async (overrides, label, sent) => {
      mocks.liveGamesService.ensure.mockResolvedValue({
        state: base(overrides),
      });
      mocks.liveGamesService.action.mockResolvedValueOnce(
        result(base(overrides)),
      );
      await mountScorer();

      fireEvent.click(await screen.findByRole("button", { name: label }));

      expect(mocks.liveGamesService.action).toHaveBeenCalledWith(
        game.id,
        expect.objectContaining(sent),
      );
    },
  );

  it("stamps every action with the tap moment in server time", async () => {
    mocks.liveGamesService.action.mockResolvedValueOnce(result(base()));
    await mountScorer();
    const before = Date.now();

    fireEvent.click(screen.getAllByRole("button", { name: "+2" })[0]);

    const sent = mocks.liveGamesService.action.mock.calls[0]?.[1] as {
      at: number;
    };
    expect(sent.at).toBeGreaterThanOrEqual(before - 5);
    expect(sent.at).toBeLessThanOrEqual(Date.now() + 5);
  });
});

describe("projectAction at the tap moment", () => {
  it("freezes a running clock exactly where it stood at the tap", () => {
    const snapshot = base({
      clockRunning: true,
      clockSeconds: 600,
      serverTime: "2026-11-04T10:00:00.000Z",
    });
    const tap = new Date("2026-11-04T10:00:03.400Z").getTime();

    const next = projectAction(
      snapshot,
      { running: false, type: "clock" },
      tap,
    );

    expect(next.clockSeconds).toBeCloseTo(596.6, 5);
    expect(next.clockRunning).toBe(false);
    expect(next.serverTime).toBe("2026-11-04T10:00:03.400Z");
  });

  it("counts overtime fouls on the 4th-quarter slot", () => {
    const next = projectAction(base({ period: 5, teamFouls: [0, 0, 0, 4] }), {
      amount: 1,
      period: 5,
      side: "team",
      type: "foul",
    });
    expect(next.teamFouls).toEqual([0, 0, 0, 5]);
  });
});
