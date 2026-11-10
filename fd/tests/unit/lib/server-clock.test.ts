import { afterEach, describe, expect, it, vi } from "vitest";

import {
  noteServerTime,
  resetServerClock,
  serverNow,
} from "@/lib/server-clock";

afterEach(() => {
  resetServerClock();
  vi.useRealTimers();
});

describe("serverNow", () => {
  it("is the device clock until a sample arrives", () => {
    vi.useFakeTimers({ now: 1_000_000 });
    expect(serverNow()).toBe(1_000_000);
  });

  it("corrects a device clock running 3s behind the server", () => {
    vi.useFakeTimers({ now: 1_000_000 });
    // Sent at 999_900, received at 1_000_100 → midpoint 1_000_000; the
    // server said 1_003_000 at that moment.
    noteServerTime(new Date(1_003_000).toISOString(), 999_900, 1_000_100);
    expect(serverNow()).toBe(1_003_000);
  });

  it("trusts the fastest round trip over a slow, skewed one", () => {
    vi.useFakeTimers({ now: 1_000_000 });
    noteServerTime(new Date(1_003_000).toISOString(), 999_990, 1_000_010);
    // A 4s round trip: its midpoint guess is far less certain.
    noteServerTime(new Date(1_005_000).toISOString(), 998_000, 1_002_000);
    expect(serverNow()).toBe(1_003_000);
  });
});
