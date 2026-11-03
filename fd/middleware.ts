import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "uf_session";
const LOGIN_PAGE = "/login";

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const role = readRole(request);

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isUserArea = ["/dashboard", "/profile", "/settings"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if ((isAdminArea || isUserArea) && role === null) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PAGE;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isAdminArea && role !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && role !== null) {
    const url = request.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Edge route protection, driven by the httpOnly `uf_session` marker cookie
 * the API sets alongside the refresh token:
 *   - (user) routes require any valid session
 *   - /admin/** additionally requires role === "ADMIN"
 *   - logged-in users are bounced away from /login and /register
 *
 * The cookie is only a routing hint — every API call is still fully
 * authenticated and role-checked server-side in bd/.
 */
function readRole(request: NextRequest): string | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (parsed !== null && typeof parsed === "object" && "role" in parsed) {
      const role = (parsed as { role: unknown }).role;
      return typeof role === "string" ? role : null;
    }
  } catch {
    // Corrupt cookie — treat as anonymous; the API will re-issue on next login.
  }
  return null;
}
