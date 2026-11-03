import type { User } from "@/types/api";

/**
 * The `uf_session` cookie is a JS-readable routing hint for the Next.js
 * middleware (route gating only). The authenticated session itself lives in
 * the API's httpOnly cookies — this just mirrors who is logged in so pages
 * like /admin can be guarded without calling the API.
 *
 * Shared by the auth provider (set on login/register/bootstrap) and the API
 * client (cleared when the session is definitively dead), so both stay in
 * sync with what middleware.ts expects to read.
 */
const SESSION_COOKIE = "uf_session";

export function setSessionHint(user: Pick<User, "id" | "role">): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(
    JSON.stringify({ id: user.id, role: user.role }),
  );
  document.cookie = `${SESSION_COOKIE}=${value}; Path=/; SameSite=Lax${secureSuffix()}`;
}

export function clearSessionHint(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secureSuffix()}`;
}

function secureSuffix(): string {
  return typeof window !== "undefined" && window.location.protocol === "https:"
    ? "; Secure"
    : "";
}
