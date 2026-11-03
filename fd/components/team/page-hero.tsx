import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Subpage header band (200px mist): breadcrumb kicker, 72px condensed H1,
 * optional intro line and controls (dropdowns / toggles) bottom-right.
 * Detail pages pass `parent` so the trail reads Нүүр / Parent / Current.
 */
export function PageHero({
  breadcrumb,
  parent,
  title,
  subtitle,
  controls,
  mark,
  className,
}: {
  breadcrumb: string;
  /** Section the page belongs to, linked between home and the current page. */
  parent?: { href: string; label: string };
  title: string;
  subtitle?: string;
  /** Right-aligned control cluster rendered at the band's baseline. */
  controls?: React.ReactNode;
  /** Decorative mark bleeding off the band's right edge (half visible). */
  mark?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-line bg-paper-soft relative overflow-hidden border-b",
        className,
      )}
    >
      {mark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mark}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-0 z-0 h-[120%] max-w-none origin-center translate-x-[40%] -translate-y-1/2 object-contain select-none"
        />
      ) : null}
      <div className="team-shell relative z-10 flex min-h-[160px] flex-wrap items-end justify-between gap-6 py-12 md:min-h-[200px] md:py-16">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="text-mute mb-3 flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] uppercase"
          >
            <Link href="/" className="hover:text-ink transition-colors">
              Нүүр
            </Link>
            <span aria-hidden="true">/</span>
            {parent ? (
              <>
                <Link
                  href={parent.href}
                  className="hover:text-ink transition-colors"
                >
                  {parent.label}
                </Link>
                <span aria-hidden="true">/</span>
              </>
            ) : null}
            <span aria-current="page" className="text-ink">
              {breadcrumb}
            </span>
          </nav>
          <h1 className="font-display text-ink text-[clamp(44px,7vw,72px)] leading-[0.95] font-bold tracking-[0.02em] uppercase">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-mute mt-3 max-w-2xl text-[15px] leading-[1.6]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {controls ? <div className="pb-1">{controls}</div> : null}
      </div>
    </section>
  );
}
