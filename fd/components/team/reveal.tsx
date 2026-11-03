"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll reveal: children rise 16px and fade in over 400ms once they enter
 * the viewport. Under prefers-reduced-motion the motion collapses to a pure
 * opacity fade (see the .reveal rules in globals.css).
 */
export function Reveal({
  children,
  className,
  id,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Extra transition delay in ms — use for 60ms section stagger. */
  delay?: number;
  as?: "div" | "section" | "article" | "li" | "header";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.setAttribute("data-revealed", "true");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "true");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error -- polymorphic ref across the allowed tag union
      ref={ref}
      id={id}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
