-- Live-score push: run once in the Supabase SQL editor.
--
-- The backend broadcasts each scoreboard change on a PRIVATE channel
-- "live-game:<gameId>". Private channels are governed by row-level security
-- on realtime.messages: SELECT = may receive, INSERT = may send.
--
-- Viewers (anonymous or signed in) may RECEIVE live-game broadcasts.
-- There is deliberately NO insert policy: no browser can send, so nobody can
-- push a fake score to the crowd. The backend's secret key acts as the
-- service role, which is exempt from these policies.

create policy "viewers can receive live game broadcasts"
on realtime.messages
for select
to anon, authenticated
using (
  (select realtime.topic()) like 'live-game:%'
  and realtime.messages.extension = 'broadcast'
);

-- Then, in Dashboard → Realtime → Settings, turn OFF "Allow public access"
-- so only private (policy-checked) channels exist.
