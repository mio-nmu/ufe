import type { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { isAllowedTag } from "@/lib/cache-tags";
import { env } from "@/lib/env";

/**
 * On-demand ISR purge — the update-propagation bridge between the admin CMS
 * and the public site:
 *
 *   admin saves → bd persists → admin browser POSTs { tag } here with its
 *   Bearer token → we verify the token against bd (fail closed) →
 *   revalidateTag(tag) → the NEXT public request refetches fresh data
 *   instead of waiting out the 60s ISR window.
 *
 * The backend never calls the frontend; the admin browser is the only party
 * that knows both "a write just succeeded" and "which frontend host it is
 * viewing". Purge authority is "is the caller a real admin" (verified by bd
 * itself), not a shared secret.
 */

export const dynamic = "force-dynamic";

interface MeEnvelope {
  success: boolean;
  data?: { user?: { role?: unknown } };
}

export async function POST(request: NextRequest): Promise<Response> {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ error: "Missing bearer token" }, { status: 401 });
  }

  let tag: unknown;
  try {
    tag = (await request.json()) as { tag?: unknown } | null;
  } catch {
    tag = null;
  }
  const tagName =
    tag &&
    typeof tag === "object" &&
    "tag" in tag &&
    typeof tag.tag === "string"
      ? tag.tag
      : null;

  if (!tagName || !isAllowedTag(tagName)) {
    return Response.json({ error: "Unknown or missing tag" }, { status: 400 });
  }

  if (!(await verifyAdmin(token))) {
    // Fail closed: unverified caller or backend down ⇒ nothing is purged.
    return Response.json(
      { error: "Not authorized to revalidate" },
      { status: 403 },
    );
  }

  // External invalidation: expire immediately so the admin's own check of
  // the public page blocks once and then serves the fresh value.
  revalidateTag(tagName, { expire: 0 });
  if (tagName === "games") {
    revalidatePath("/", "page");
    revalidatePath("/schedule", "page");
  }
  return Response.json({ revalidated: true, tag: tagName });
}

/** Forwards the caller's Bearer token to bd; fails closed when bd is down. */
async function verifyAdmin(token: string): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}/api/v1/user/auth/me`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return false; // backend unreachable — no purge
  }
  if (!response.ok) return false;
  const body = (await response.json().catch(() => null)) as MeEnvelope | null;
  return body?.success === true && body.data?.user?.role === "ADMIN";
}
