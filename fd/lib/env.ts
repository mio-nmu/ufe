/**
 * Client-safe environment. NEXT_PUBLIC_ variables are inlined at build time;
 * everything else must reach the browser through the API only.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!apiUrl && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXT_PUBLIC_API_URL must be configured for production deployments.",
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const env = {
  /** Base URL of the Express API (bd/), configurable per environment. */
  // Trailing slashes would double up on `${apiUrl}${path}` (…app//api),
  // which Vercel answers with a redirect — fatal for CORS preflights.
  apiUrl: (apiUrl ?? "http://localhost:4010").replace(/\/+$/u, ""),
  /** Supabase project for live-score push. The PUBLISHABLE key (or legacy
   *  anon key) is safe in browsers: the channel policy lets it receive
   *  only. Either empty: live scores use the API's own stream + polling. */
  supabaseUrl: (supabaseUrl ?? "").replace(/\/+$/u, ""),
  supabasePublishableKey: supabasePublishableKey ?? "",
} as const;
