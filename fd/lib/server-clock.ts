/**
 * Server-time estimate for the live game clock. A phone whose clock is a
 * few seconds off would otherwise show (and stop) the game clock that far
 * off. Each API round trip that returns `serverTime` gives one sample:
 * offset = serverTime − midpoint(sent, received). The sample with the
 * shortest round trip is the most precise, so it wins.
 */

/** Recent samples kept; old ones age out as network conditions change. */
const MAX_SAMPLES = 8;

let samples: { offsetMs: number; roundTripMs: number }[] = [];

/** Records one timed response. Call with the request's send/receive times. */
export function noteServerTime(
  serverTime: string,
  sentAt: number,
  receivedAt: number,
): void {
  const server = new Date(serverTime).getTime();
  if (Number.isNaN(server)) return;
  samples = [
    ...samples.slice(-(MAX_SAMPLES - 1)),
    {
      offsetMs: server - (sentAt + receivedAt) / 2,
      roundTripMs: receivedAt - sentAt,
    },
  ];
}

/** "Now" on the server's clock, as best this device can tell. */
export function serverNow(): number {
  return Date.now() + bestOffset();
}

function bestOffset(): number {
  const best = samples.reduce<(typeof samples)[number] | null>(
    (fastest, sample) =>
      !fastest || sample.roundTripMs < fastest.roundTripMs ? sample : fastest,
    null,
  );
  return best?.offsetMs ?? 0;
}

/** Test hook: forget every sample. */
export function resetServerClock(): void {
  samples = [];
}
