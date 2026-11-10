"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ACCENT, ACCENT_SOFT } from "@/components/admin/dashboard/card-chrome";
import { cn } from "cn";
import type {
  ActivityAction,
  ActivityEntity,
  ActivityEntry,
} from "@/types/api";

const ENTITY_NAMES: Record<ActivityEntity, string> = {
  executive: "Front office member",
  game: "Game",
  historyPhoto: "History photo",
  liveGame: "Live game",
  media: "Media file",
  mediaAlbum: "Gallery album",
  newsPost: "News post",
  player: "Player",
  shopProduct: "Shop product",
  siteContent: "Page copy",
  user: "User",
  video: "Video",
};

/** Badge + timeline dot per action: additions/finishes use the strong
 *  accent with a light dot, edits/starts the soft accent with a navy dot,
 *  deletions stay muted. */
const ACTION_STYLES: Record<
  ActivityAction,
  { verb: string; badge: string; badgeClass: string; dotClass: string }
> = {
  CREATED: {
    verb: "created",
    badge: "Created",
    badgeClass: ACCENT,
    dotClass: "bg-[#8fa9cf]",
  },
  UPDATED: {
    verb: "updated",
    badge: "Updated",
    badgeClass: ACCENT_SOFT,
    dotClass: "bg-primary",
  },
  DELETED: {
    verb: "deleted",
    badge: "Deleted",
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground/40",
  },
  STARTED: {
    verb: "started",
    badge: "Started",
    badgeClass: ACCENT_SOFT,
    dotClass: "bg-primary",
  },
  FINISHED: {
    verb: "finished",
    badge: "Finished",
    badgeClass: ACCENT,
    dotClass: "bg-[#8fa9cf]",
  },
};

/**
 * Vertical activity feed: dot + connecting line, "<Entity> <verb>" title,
 * date, subject name (two lines max) and an action badge. Entries rise in
 * one after another on first render; entries that arrive later (polling)
 * slide in at the top while the rest glide down.
 */
export function ActivityTimeline({
  entries,
  showActor = false,
}: {
  entries: ActivityEntry[];
  /** Adds "by <email>" under each entry (full history page). */
  showActor?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <ol className="space-y-6">
      <AnimatePresence initial={!reduceMotion}>
        {entries.map((entry, index) => (
          <motion.li
            key={entry.id}
            layout={!reduceMotion}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.3,
              delay: reduceMotion ? 0 : index * 0.05,
              ease: [0.16, 1, 0.3, 1],
              // Rows pushed down by a new entry move at once, unstaggered.
              layout: { duration: reduceMotion ? 0 : 0.3, delay: 0 },
            }}
            className="relative pl-9"
          >
            <ActivityItem
              entry={entry}
              showActor={showActor}
              isLast={index === entries.length - 1}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

function ActivityItem({
  entry,
  showActor,
  isLast,
}: {
  entry: ActivityEntry;
  showActor: boolean;
  isLast: boolean;
}) {
  const style = ACTION_STYLES[entry.action];

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1.5 left-0 size-3 rounded-full",
          style.dotClass,
        )}
      />
      {isLast ? null : (
        <span
          aria-hidden="true"
          className="bg-border absolute top-6 -bottom-6 left-[5.5px] w-px"
        />
      )}

      <div className="flex items-baseline justify-between gap-4">
        <p className="text-base font-semibold">
          {ENTITY_NAMES[entry.entity]} {style.verb}
        </p>
        <time
          dateTime={entry.createdAt}
          className="text-muted-foreground shrink-0 text-sm tabular-nums"
        >
          {new Date(entry.createdAt).toLocaleDateString()}
        </time>
      </div>
      <p className="text-muted-foreground mt-1 line-clamp-2 text-base">
        {entry.label}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            style.badgeClass,
            "rounded-full px-3 py-0.5 text-sm font-semibold",
          )}
        >
          {style.badge}
        </span>
        {showActor && entry.actorEmail ? (
          <span className="text-muted-foreground text-sm">
            by {entry.actorEmail}
          </span>
        ) : null}
      </div>
    </>
  );
}
