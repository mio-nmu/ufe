import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Stand-in for a Supabase Realtime channel: records its config and lets a
 *  test fire the broadcast handler and the subscribe status. */
class FakeChannel {
  handler: ((message: { payload: unknown }) => void) | null = null;
  status: ((status: string) => void) | null = null;
  constructor(
    public topic: string,
    public options: unknown,
  ) {}
  on(
    _type: string,
    _filter: { event: string },
    handler: (message: { payload: unknown }) => void,
  ) {
    this.handler = handler;
    return this;
  }
  subscribe(status: (status: string) => void) {
    this.status = status;
    return this;
  }
}

const realtime = vi.hoisted(() => ({
  client: null as null | {
    channel: (topic: string, options: unknown) => unknown;
    removeChannel: ReturnType<typeof vi.fn>;
  },
}));
vi.mock("@/lib/env", () => ({
  env: {
    apiUrl: "http://api.test",
    supabaseUrl: "",
    supabasePublishableKey: "",
  },
}));
vi.mock("@/lib/realtime-client", () => ({
  LIVE_GAME_EVENT: "state_changed",
  liveGameChannel: (gameId: string) => `live-game:${gameId}`,
  liveRealtimeClient: () => realtime.client,
}));

const { useLiveGameStream } = await import("@/hooks/use-live-game");

/** Minimal EventSource stand-in — jsdom has none. */
class FakeEventSource {
  static last: FakeEventSource | null = null;
  onopen: (() => void) | null = null;
  private listeners = new Map<string, (event: { data: string }) => void>();
  constructor(public url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(type: string, callback: (event: { data: string }) => void) {
    this.listeners.set(type, callback);
  }
  emit(type: string, data: string) {
    act(() => this.listeners.get(type)?.({ data }));
  }
  close() {}
}

let channel: FakeChannel | null = null;

beforeEach(() => {
  vi.stubGlobal("EventSource", FakeEventSource);
  channel = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
  realtime.client = null;
});

function useSupabase() {
  realtime.client = {
    channel: (topic, options) => (channel = new FakeChannel(topic, options)),
    removeChannel: vi.fn(),
  };
  return realtime.client;
}

describe("useLiveGameStream without Supabase", () => {
  it("uses the API's own stream", () => {
    const onChange = vi.fn();
    renderHook(() => useLiveGameStream("g1", onChange));

    expect(FakeEventSource.last?.url).toBe(
      "http://api.test/api/v1/live-games/g1/stream",
    );
    FakeEventSource.last?.emit(
      "state_changed",
      JSON.stringify({ state: { teamScore: 4 } }),
    );
    expect(onChange).toHaveBeenLastCalledWith({ teamScore: 4 });
  });
});

describe("useLiveGameStream with Supabase", () => {
  it("joins the game's PRIVATE channel, so viewers can only receive", () => {
    useSupabase();
    renderHook(() => useLiveGameStream("g1", vi.fn()));

    expect(channel?.topic).toBe("live-game:g1");
    expect(channel?.options).toEqual({ config: { private: true } });
  });

  it("delivers each broadcast state, and resyncs once subscribed", () => {
    useSupabase();
    const onChange = vi.fn();
    renderHook(() => useLiveGameStream("g1", onChange));

    act(() => channel?.status?.("SUBSCRIBED"));
    expect(onChange).toHaveBeenLastCalledWith(undefined);

    act(() =>
      channel?.handler?.({
        payload: { gameId: "g1", state: { teamScore: 9 } },
      }),
    );
    expect(onChange).toHaveBeenLastCalledWith({ teamScore: 9 });
  });

  it("leaves the channel on unmount", () => {
    const client = useSupabase();
    const { unmount } = renderHook(() => useLiveGameStream("g1", vi.fn()));
    unmount();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });
});
