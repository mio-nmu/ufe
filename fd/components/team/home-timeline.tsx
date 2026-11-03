import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { teamButtonClass } from "@/components/team/button";
import { Reveal } from "@/components/team/reveal";
import { routes } from "@/config/routes";

/** Medal colour lives only on the timeline marker — cards stay neutral. */
const MEDAL_DOT: Record<Medal, string> = {
  gold: "bg-amber-400",
  silver: "bg-slate-300",
  bronze: "bg-orange-400",
};

const MEDAL_ALIASES: Record<string, Medal> = {
  gold: "gold",
  алт: "gold",
  silver: "silver",
  мөнгө: "silver",
  bronze: "bronze",
  хүрэл: "bronze",
};

type Medal = "gold" | "silver" | "bronze";

interface Milestone {
  period: string;
  description: string;
  medal: Medal | null;
}

/** Admin-editable copy (site content «home / timeline»), merged over the
 *  static default in content/site.ts. */
export interface HomeTimelineCopy {
  eyebrow: string;
  title: string;
  cta: string;
  items: unknown;
}

export function HomeTimeline({ copy }: { copy: HomeTimelineCopy }) {
  const milestones = toMilestones(copy.items);
  if (milestones.length === 0) return null;

  return (
    <section
      aria-labelledby="home-history-title"
      className="border-line bg-paper-soft overflow-hidden border-y"
    >
      <div className="team-shell py-12 md:py-16">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="eyebrow">{copy.eyebrow}</p>
              <h2
                id="home-history-title"
                className="font-display text-ink mt-2 text-[clamp(26px,3vw,34px)] leading-[1.05] font-bold tracking-[0.02em] uppercase"
              >
                {copy.title}
              </h2>
            </div>
            <Link
              href={routes.site.history}
              className={teamButtonClass({
                variant: "secondary",
                size: "sm",
                className: "group",
              })}
            >
              {copy.cta}
              <ArrowUpRight
                className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>

        {/* Desktop: zig-zag cards around a horizontal rule. */}
        <ol
          className="relative hidden min-h-[320px] lg:grid"
          style={{
            gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))`,
          }}
        >
          <span
            aria-hidden="true"
            className="bg-line pointer-events-none absolute top-1/2 right-0 left-0 h-px"
          />
          {milestones.map((milestone, index) => {
            const above = index % 2 === 0;
            return (
              <Reveal
                key={`${milestone.period}-${index}`}
                as="li"
                delay={index * 60}
                className="group relative grid grid-rows-[1fr_40px_1fr] px-1.5"
              >
                <MilestoneCard
                  milestone={milestone}
                  className={`w-full ${above ? "row-start-1 mb-4 self-end" : "row-start-3 mt-4 self-start"}`}
                />
                <span
                  aria-hidden="true"
                  className={`before:bg-line relative z-[1] row-start-2 flex justify-center before:absolute before:left-1/2 before:w-px before:-translate-x-1/2 ${
                    above
                      ? "items-center before:top-0 before:h-1/2"
                      : "items-center before:bottom-0 before:h-1/2"
                  }`}
                >
                  <Marker medal={milestone.medal} className="relative z-[1]" />
                </span>
              </Reveal>
            );
          })}
        </ol>

        {/* Mobile / tablet: vertical rail. */}
        <ol className="border-line relative space-y-4 border-l pl-7 lg:hidden">
          {milestones.map((milestone, index) => (
            <Reveal
              key={`${milestone.period}-${index}`}
              as="li"
              delay={index * 50}
              className="group relative"
            >
              <Marker
                medal={milestone.medal}
                className="absolute top-4 -left-[37px] z-[1]"
              />
              <MilestoneCard milestone={milestone} />
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Admin input → at most 6 well-formed milestones (bad rows are skipped). */
function toMilestones(raw: unknown): Milestone[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { period?: unknown }).period === "string" &&
        (item as { period: string }).period.trim() !== "",
    )
    .slice(0, 6)
    .map((item) => ({
      period: String(item.period).trim(),
      description:
        typeof item.description === "string" ? item.description.trim() : "",
      medal:
        MEDAL_ALIASES[
          String(item.medal ?? "")
            .trim()
            .toLowerCase()
        ] ?? null,
    }));
}

function MilestoneCard({
  milestone,
  className,
}: {
  milestone: Milestone;
  className?: string;
}) {
  const { period, description } = milestone;
  return (
    <Link
      href={routes.site.history}
      aria-label={`${period}: ${description}`}
      className={`group/card border-line bg-paper card-lift team-focus relative block rounded-lg border p-3 text-left ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className="font-display text-ink/[0.07] pointer-events-none absolute top-2 right-3 text-3xl leading-none font-bold"
      >
        {period.slice(0, 4)}
      </span>
      <span className="font-display text-ink block text-[13px] font-bold tracking-[0.06em] uppercase">
        {period}
      </span>
      {description && (
        <span className="text-mute mt-2 block text-[13px] leading-[1.5]">
          {description}
        </span>
      )}
      <span className="text-mute group-hover/card:text-brand mt-3 flex items-center gap-1 text-[12px] font-semibold tracking-[0.06em] uppercase transition-colors">
        Түүхийг үзэх
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

function Marker({
  medal,
  className,
}: {
  medal: Medal | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`ring-line block size-4 rounded-full border-[3px] border-white ring-1 transition-transform duration-200 group-hover:scale-110 ${
        medal ? MEDAL_DOT[medal] : "bg-brand"
      } ${className ?? ""}`}
    />
  );
}
