import type { ReactNode } from "react";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";

// Tints of the navy primary (#0b2a5b) — a straight opacity mix reads slate
// grey on white, so the soft-blue accents get their own values.
export const ACCENT = "bg-[#6b8cc4] text-white";
export const ACCENT_SOFT = "bg-[#d9e3f1] text-primary";

/** Chart draw-ins, count-ups and range morphs share one feel. */
export const DASHBOARD_ANIMATION_MS = 800;

/** Shared dashboard card header: title + subtitle left, an action right
 *  (Live badge, "View all" link), optional divider below. */
export function DashboardCardHeader({
  title,
  description,
  action,
  divided = true,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  divided?: boolean;
}) {
  return (
    <CardHeader
      className={cn(
        "flex items-start justify-between gap-4 px-6 pt-5 sm:px-8 sm:pt-6",
        divided && "border-b pb-5 sm:pb-6",
      )}
    >
      <div className="space-y-1">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <p className="text-muted-foreground text-base">{description}</p>
      </div>
      {action}
    </CardHeader>
  );
}

/** Marks a card whose data is polled in the background. */
export function LiveBadge() {
  return (
    <span
      className={cn(
        ACCENT_SOFT,
        "rounded-full px-3.5 py-1.5 text-sm font-semibold",
      )}
    >
      Live
    </span>
  );
}
