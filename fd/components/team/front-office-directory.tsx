import Image from "next/image";
import Link from "next/link";

import { routes } from "@/config/routes";
import { executiveHoverPhotos } from "@/config/site";
import { trimmedCutout } from "@/lib/cutout";
import type { Executive, ExecutiveGroup } from "@/types/content";
import { cn } from "@/lib/utils";

/**
 * Front office directory: every group with members gets its own section
 * (heading + count + card grid), stacked in GROUPS order, so the whole
 * staff is visible without clicking through tabs. Portraits are always
 * full colour; each card links to the member's profile (/front-office/[slug]).
 */

const GROUPS: Array<{ value: ExecutiveGroup; label: string }> = [
  { value: "OWNERSHIP", label: "Эзэмшигчид" },
  { value: "OPERATIONS", label: "Спортын алба" },
  { value: "BUSINESS", label: "Бизнес" },
  { value: "COACHES", label: "Дасгалжуулагчид" },
  { value: "STAFF", label: "Ажилтнууд" },
];

export function FrontOfficeDirectory({ members }: { members: Executive[] }) {
  const groups = GROUPS.map((group) => ({
    ...group,
    members: members.filter((member) => member.group === group.value),
  })).filter((group) => group.members.length > 0);

  return (
    <div className="team-shell space-y-14 py-12 md:space-y-16 md:py-16">
      {groups.map((group) => (
        <section key={group.value} aria-labelledby={`group-${group.value}`}>
          <div className="border-line mb-6 flex items-baseline justify-between gap-4 border-b pb-3">
            <h2
              id={`group-${group.value}`}
              className="font-display text-ink text-[clamp(24px,3vw,32px)] leading-none font-bold tracking-[0.02em] uppercase"
            >
              {group.label}
            </h2>
            <span className="text-mute text-[12px] font-semibold tracking-[0.12em] uppercase">
              {group.members.length} гишүүн
            </span>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.members.map((member) => (
              <ExecutiveCard key={member.id} member={member} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ExecutiveCard({ member }: { member: Executive }) {
  const hoverPhoto = executiveHoverPhotos[member.slug];
  return (
    <article className="border-line bg-paper card-lift group relative overflow-hidden rounded-lg border">
      <Link
        href={routes.site.managementMember(member.slug)}
        aria-label={`${member.name} — профайл`}
        className="team-focus block w-full text-left"
      >
        {/* Portrait panel — 392×320, full-colour portrait */}
        <div
          className={cn(
            "relative h-[300px] overflow-hidden md:h-[320px]",
            member.photo ? "bg-paper-soft" : "bg-ink",
          )}
        >
          {member.photo ? (
            <>
              <span
                aria-hidden="true"
                className="font-display text-mute/20 pointer-events-none absolute -top-2 right-3 z-0 text-[120px] leading-none font-bold select-none"
              >
                {initialsOf(member.name)}
              </span>
              <div
                className={cn(
                  "absolute inset-0 z-[5] transition-[opacity,transform] duration-300 group-hover:scale-[1.03]",
                  // Base of a hover card: fades out beneath the band as the
                  // alternate cutout wipes across. Always full colour.
                  hoverPhoto && "group-hover:opacity-0 group-hover:delay-200",
                )}
              >
                <Image
                  src={trimmedCutout(member.photo) ?? member.photo}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                  className="object-contain object-bottom"
                />
              </div>
              {hoverPhoto ? (
                <>
                  {/* Alternate cutout — revealed behind a diagonal edge that
                      starts at the bottom-left corner and exits at the
                      top-right. The trailing side of the polygon stays parked
                      off the bottom-left; only the leading corners move. */}
                  <div className="pointer-events-none absolute inset-0 z-[6] transition-[clip-path] duration-700 ease-in-out [-webkit-clip-path:polygon(10%_140%,-300%_140%,-380%_-40%,-70%_-40%)] [clip-path:polygon(10%_140%,-300%_140%,-380%_-40%,-70%_-40%)] group-hover:[-webkit-clip-path:polygon(170%_140%,-300%_140%,-380%_-40%,90%_-40%)] group-hover:[clip-path:polygon(170%_140%,-300%_140%,-380%_-40%,90%_-40%)]">
                    <Image
                      src={hoverPhoto}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                      className="object-contain object-bottom"
                    />
                    {/* Slim brand-blue band parked on the reveal edge itself:
                        living inside the clipped wrapper, only its revealed
                        half ever shows, so it rides the edge in perfect sync.
                        The hover translate matches the edge's bottom-corner
                        travel (10%,140%) → (170%,-40%) converted to pixels. */}
                    <span
                      aria-hidden="true"
                      className="bg-brand absolute top-[140%] left-[10%] z-[1] mt-[-416px] ml-[-16px] h-[260%] w-8 [translate:0_0] rotate-[31deg] transition-[translate] duration-700 ease-in-out group-hover:[translate:688px_-576px]"
                    />
                  </div>
                </>
              ) : null}
            </>
          ) : (
            /* No photo yet — dark editorial monogram panel that mirrors the
               bio drawer's hero treatment, so the grid reads as designed. */
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-4 border border-white/10"
              />
              <span className="absolute inset-0 z-[5] flex items-center justify-center">
                <span className="font-display text-[110px] leading-none font-bold tracking-[0.02em] text-transparent transition-all duration-300 [-webkit-text-stroke:2px_rgba(255,255,255,0.4)] group-hover:[-webkit-text-stroke-color:rgba(255,255,255,0.7)]">
                  {initialsOf(member.name)}
                </span>
              </span>
            </>
          )}
          <span
            className={cn(
              // Always shown on touch screens, which have no hover.
              "absolute right-3 bottom-3 z-10 px-2 py-1 text-[12px] font-semibold tracking-[0.12em] uppercase transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100",
              member.photo ? "bg-ink text-paper" : "bg-paper text-ink",
            )}
          >
            Профайл →
          </span>
        </div>
        <div className="p-5">
          <h3 className="font-display text-ink text-[24px] leading-none font-bold tracking-[0.02em] uppercase">
            {member.name}
          </h3>
          <p className="text-mute mt-2 text-[13px] font-medium tracking-[0.02em]">
            {member.title}
          </p>
          {member.bio ? (
            <p className="text-mute mt-3 line-clamp-2 text-[13px] leading-[1.6]">
              {member.bio}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

/** Giant faded card initials ("Б.Пүрэвдорж" → "БП"). */
function initialsOf(name: string): string {
  return name
    .split(/[.\s]+/)
    .filter(Boolean)
    .map((part) => part[0]!)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
