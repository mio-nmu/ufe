"use client";

import { cn } from "@/lib/utils";

/**
 * Editorial filter pill group (36px, radius 999, hairline border): the
 * active option fills ink. Used for month tabs, category chips and view
 * switches across the media pages.
 */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  size = "md",
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  className?: string;
  size?: "md" | "sm";
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "font-display team-focus inline-flex items-center justify-center rounded-full border font-semibold tracking-[0.06em] uppercase transition-colors",
              size === "md"
                ? "min-h-9 px-4 text-[13px]"
                : "min-h-7 px-2.5 text-[12px]",
              active
                ? "border-ink bg-ink/5 text-ink"
                : "border-line text-mute hover:border-ink hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
