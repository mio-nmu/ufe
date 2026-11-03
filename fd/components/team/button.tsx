import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TeamButtonVariant =
  "primary" | "secondary" | "inverse" | "inverse-outline";
export type TeamButtonSize = "md" | "sm";

/** Pill CTA rendered as <Link> when `href` is set, else as a <button>. */
export function TeamButton({
  variant = "primary",
  size = "md",
  href,
  className,
  children,
  ...props
}: {
  variant?: TeamButtonVariant;
  size?: TeamButtonSize;
  href?: string;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children">) {
  const styles = teamButtonClass({ variant, size, className });

  if (href !== undefined) {
    return (
      <Link href={href} className={styles}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={styles} {...props}>
      {children}
    </button>
  );
}

/**
 * The ONE public-site button style — every CTA, as <button>, <Link> or <a>,
 * takes its classes from here. Always a pill; 44px (md) or 36px (sm) high.
 *   primary          dark-blue fill — the main action on light surfaces
 *   secondary        white + hairline border — secondary action
 *   inverse          white fill — the main action on dark (navy/ink) panels
 *   inverse-outline  white outline — secondary action on dark panels
 */
export function teamButtonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: TeamButtonVariant;
  size?: TeamButtonSize;
  className?: string;
} = {}): string {
  return cn(
    "font-display team-focus inline-flex w-fit items-center justify-center gap-2 rounded-full font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors duration-200",
    size === "md" ? "min-h-11 px-6 text-sm" : "min-h-9 px-4 text-[13px]",
    variant === "primary" && "bg-brand text-brand-contrast hover:bg-brand-2",
    variant === "secondary" &&
      "border-line bg-paper text-ink hover:border-ink border",
    variant === "inverse" &&
      "text-ink hover:bg-paper-muted bg-white [--focus-ring:#fff]",
    variant === "inverse-outline" &&
      "border border-white/40 text-white [--focus-ring:#fff] hover:border-white hover:bg-white/10",
    className,
  );
}

/**
 * Round icon-only button (44px). `tone="dark"` for use on navy/ink panels.
 * Always pass an aria-label.
 */
export function teamIconButtonClass({
  tone = "light",
  className,
}: { tone?: "light" | "dark"; className?: string } = {}): string {
  return cn(
    "team-focus inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
    tone === "light"
      ? "border-line bg-paper text-ink hover:border-ink border"
      : "border border-white/40 text-white [--focus-ring:#fff] hover:border-white hover:bg-white/10",
    className,
  );
}
