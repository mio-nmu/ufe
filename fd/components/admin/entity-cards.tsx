"use client";

import type { LucideIcon } from "lucide-react";
import { Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ASPECT_CLASS: Record<CardAspect, string> = {
  "1/1": "aspect-square",
  "16/10": "aspect-[16/10]",
  "4/3": "aspect-[4/3]",
  "4/5": "aspect-[4/5]",
};

const TONE_PILL: Record<StatusTone, string> = {
  amber: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-700",
  info: "bg-ink/10 text-ink",
  navy: "bg-ink text-white",
  neutral: "bg-muted text-muted-foreground",
};

// Card accents sit on the stock shadcn surfaces — monochrome ink/gray
// like the rest of the admin palette.

export type CardAspect = "1/1" | "16/10" | "4/3" | "4/5";

export type StatusTone = "amber" | "green" | "info" | "navy" | "neutral";

export interface EntityCardProps {
  aspect: CardAspect;
  /** Image URL; empty renders the fallback icon panel. */
  image: null | string;
  fallbackIcon: LucideIcon;
  /** Big faded watermark inside the media zone (jersey number, year…). */
  watermark?: null | string;
  /** Vertical framing of the image, 0 (top) – 100 (bottom); null = default. */
  imagePosition?: null | number;
  /** Rendered size of the image, 40 (shrunken) – 150 (zoomed); null = 100. */
  imageScale?: null | number;
  /** Small pill(s) on the media zone, top-left. */
  pills?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  status?: null | { label: string; tone: StatusTone };
  onEdit: () => void;
  onDelete: () => void;
  /** Extra content under the meta line (stat strips etc.). */
  children?: React.ReactNode;
}

export function EntityCard({
  aspect,
  image,
  fallbackIcon: Icon,
  watermark,
  imagePosition,
  imageScale,
  pills,
  title,
  meta,
  status,
  onEdit,
  onDelete,
  children,
}: EntityCardProps) {
  return (
    <article className="group bg-card border-border focus-within:border-ink relative flex flex-col overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(11,11,12,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(11,11,12,0.08)]">
      <div
        className={cn(
          "bg-muted/40 relative overflow-hidden",
          ASPECT_CLASS[aspect],
        )}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin grid: arbitrary-origin URLs from the CMS
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            style={{
              ...(imagePosition === null || imagePosition === undefined
                ? {}
                : { objectPosition: `center ${imagePosition}%` }),
              ...(imageScale === null ||
              imageScale === undefined ||
              imageScale === 100
                ? {}
                : {
                    transform: `scale(${imageScale / 100})`,
                    transformOrigin: `center ${imagePosition ?? 100}%`,
                  }),
            }}
          />
        ) : (
          <div className="text-muted-foreground/30 flex h-full w-full items-center justify-center">
            <Icon className="size-10" aria-hidden="true" />
          </div>
        )}
        {watermark ? (
          <span
            aria-hidden="true"
            className="text-card-foreground/10 pointer-events-none absolute top-1 right-2 text-6xl leading-none font-black tracking-tight select-none"
          >
            {watermark}
          </span>
        ) : null}
        {pills ? (
          <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1.5">
            {pills}
          </div>
        ) : null}
        {status ? (
          <div className="absolute bottom-2 left-2 z-10">
            <StatusPill tone={status.tone} label={status.label} />
          </div>
        ) : null}
        <OverlayActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-card-foreground line-clamp-2 text-sm leading-snug font-semibold">
          {title}
        </h3>
        {meta ? (
          <p className="text-muted-foreground line-clamp-1 text-xs">{meta}</p>
        ) : null}
        {children}
      </div>
    </article>
  );
}

function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[12px] font-semibold",
        TONE_PILL[tone],
      )}
    >
      {label}
    </span>
  );
}

/** Overlay action buttons — hover/focus-within, and always on touch. */
function OverlayActions({
  onEdit,
  onDelete,
  editLabel = "Засах",
  deleteLabel = "Устгах",
}: {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
}) {
  return (
    <div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-[1024px]:opacity-100">
      <button
        type="button"
        aria-label={editLabel}
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        className={buttonVariants({
          className: "bg-background/90 shadow-card backdrop-blur",
          size: "icon-sm",
          variant: "outline",
        })}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={deleteLabel}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className={buttonVariants({
          className: "bg-background/90 shadow-card backdrop-blur",
          size: "icon-sm",
          variant: "destructive",
        })}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Dashed NEW tile — same footprint as the entity card beside it. */
export function NewCardTile({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border group hover:border-ink hover:bg-ink/5 flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors"
    >
      <span className="bg-ink/10 text-ink group-hover:bg-ink flex size-10 items-center justify-center rounded-full transition-colors group-hover:text-white">
        <Plus className="size-5" aria-hidden="true" />
      </span>
      <span className="text-card-foreground text-sm font-semibold">
        {label}
      </span>
      {hint ? (
        <span className="text-muted-foreground text-xs">{hint}</span>
      ) : null}
    </button>
  );
}

/** Skeleton grid shaped like the final layout. */
export function SkeletonCardGrid({
  count = 8,
  aspect,
}: {
  count?: number;
  aspect: CardAspect;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div
            className={cn(
              "bg-muted animate-pulse rounded-xl",
              ASPECT_CLASS[aspect],
            )}
          />
          <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
          <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

/** Real empty state: ghost icon + label + hint + CTA. */
export function EmptyCardState({
  icon: Icon = ImageIcon,
  label,
  hint,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  label: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="border-border flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
      <span className="bg-muted text-muted-foreground/60 flex size-14 items-center justify-center rounded-full">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <p className="text-card-foreground text-sm font-semibold">{label}</p>
      {hint ? (
        <p className="text-muted-foreground max-w-sm text-xs">{hint}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button size="sm" className="mt-2" onClick={onAction}>
          <Plus aria-hidden="true" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

/** Delete confirmation — replaces window.confirm everywhere. */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  name,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string | null;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>«{name ?? "…"}»-г устгах уу?</DialogTitle>
          <DialogDescription>
            Энэ үйлдлийг буцаах боломжгүй — бичлэг бүрмөсөн устах болно.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {busy ? "Устгаж байна…" : "Устгах"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
