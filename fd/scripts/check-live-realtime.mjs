// Live-score push self-check against your Supabase project.
//
//   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=… \
//   SUPABASE_SECRET_KEY=… npm run realtime:check
//
// Verifies the three things the live scorer relies on:
//   1. a viewer (publishable key) can JOIN a private live-game channel,
//   2. a backend broadcast (secret key, REST) REACHES that viewer,
//   3. a viewer CANNOT send — nobody can push a fake score to the crowd.
import { RealtimeClient } from "@supabase/realtime-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishableKey || !secretKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.",
  );
  process.exit(2);
}

const TIMEOUT_MS = 6000;
const topic = `live-game:selftest-${Date.now()}`;
let failed = false;

const viewer = joinAsViewer();
const watcher = joinAsViewer();
await Promise.all([viewer.joined, watcher.joined]).then(
  () => pass("viewer can join the private channel"),
  (reason) =>
    fail(
      `viewer could not join: ${reason} — run bd/supabase/live-game-realtime.sql`,
    ),
);

if (!failed) {
  const status = await broadcastFromBackend({ teamScore: 42 });
  const received = await viewer.next();
  if (status === 202 && received?.teamScore === 42)
    pass("backend broadcast reaches viewers");
  else fail(`backend broadcast not received (HTTP ${status})`);

  await viewer.channel.send({
    event: "state_changed",
    payload: { state: { teamScore: 666 } },
    type: "broadcast",
  });
  const forged = await watcher.next();
  if (forged?.teamScore === 666)
    fail("a viewer could SEND — add no INSERT policy; turn off public access");
  else pass("viewers cannot send fake scores");
}

viewer.client.disconnect();
watcher.client.disconnect();
process.exit(failed ? 1 : 0);

function joinAsViewer() {
  const client = new RealtimeClient(
    `${url.replace(/^http/, "ws")}/realtime/v1`,
    {
      params: { apikey: publishableKey },
    },
  );
  const queue = [];
  let waiting = null;
  const channel = client.channel(topic, { config: { private: true } });
  channel.on("broadcast", { event: "state_changed" }, ({ payload }) => {
    if (waiting) waiting(payload?.state);
    else queue.push(payload?.state);
  });
  const joined = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject("timed out"), TIMEOUT_MS);
    channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        reject(error?.message ?? status);
      }
    });
  });
  const next = () =>
    queue.length
      ? Promise.resolve(queue.shift())
      : new Promise((resolve) => {
          const timer = setTimeout(() => {
            waiting = null;
            resolve(undefined);
          }, 3000);
          waiting = (state) => {
            clearTimeout(timer);
            waiting = null;
            resolve(state);
          };
        });
  return { channel, client, joined, next };
}

async function broadcastFromBackend(state) {
  const endpoint = new URL(
    `/realtime/v1/api/broadcast/${encodeURIComponent(topic)}/events/state_changed`,
    url,
  );
  endpoint.searchParams.set("private", "true");
  const res = await fetch(endpoint, {
    body: JSON.stringify({ gameId: "selftest", state }),
    headers: {
      apikey: secretKey,
      "Content-Type": "application/json",
      ...(secretKey.startsWith("sb_")
        ? {}
        : { Authorization: `Bearer ${secretKey}` }),
    },
    method: "POST",
  });
  return res.status;
}

function pass(message) {
  console.log(`PASS  ${message}`);
}

function fail(message) {
  failed = true;
  console.log(`FAIL  ${message}`);
}
