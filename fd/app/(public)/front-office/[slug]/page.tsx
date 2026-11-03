import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHero } from "@/components/team/page-hero";
import { routes } from "@/config/routes";
import { staff } from "@/content/site";
import { trimmedCutout } from "@/lib/cutout";
import { getExecutives } from "@/lib/content";
import { staffKey } from "@/lib/staff";
import type { Executive } from "@/types/content";

/**
 * Executive profile page — the management-side twin of /players/[slug]. The
 * API row wins; the static staff profiles back it up under their staffKey
 * slug so links keep working when the backend is unreachable. Purged with
 * the executives tag on admin saves.
 */

const GROUP_TITLE: Record<Executive["group"], string> = {
  BUSINESS: "Бизнесийн удирдлага",
  COACHES: "Дасгалжуулагчид",
  OPERATIONS: "Спортын алба",
  OWNERSHIP: "Эзэмшигчид",
  STAFF: "Ажилтнууд",
};

type MemberPage = {
  name: string;
  slug: string;
  title: string;
  group: Executive["group"];
  photo: null | string;
  bio: null | string;
  bullets: readonly string[];
  sections?:
    | readonly { heading: string; list?: readonly string[]; text?: string }[]
    | null;
};

export default async function ExecutivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await loadMember(slug);
  if (!member) notFound();

  const initials = initialsOf(member.name);

  return (
    <>
      <PageHero
        breadcrumb={member.name}
        parent={{ href: routes.site.management, label: "Удирдлага" }}
        subtitle={member.title}
        title={member.name}
      />

      <section className="team-shell grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Portrait panel — photo cutout on paper, or the dark monogram
            treatment from the cards when no photo exists yet. */}
        <div
          className={`border-line relative h-[420px] overflow-hidden border md:h-[500px] ${
            member.photo ? "bg-paper-soft" : "bg-ink"
          }`}
        >
          {member.photo ? (
            <>
              <span
                aria-hidden="true"
                className="font-display text-mute/20 pointer-events-none absolute -top-4 right-2 z-0 text-[180px] leading-none font-bold select-none"
              >
                {initials}
              </span>
              <Image
                src={trimmedCutout(member.photo) ?? member.photo}
                alt=""
                fill
                sizes="(min-width: 1024px) 420px, 90vw"
                className="object-contain object-bottom"
                priority
              />
            </>
          ) : (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-5 border border-white/10"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-[170px] leading-none font-bold tracking-[0.02em] text-transparent [-webkit-text-stroke:3px_rgba(255,255,255,0.4)]">
                  {initials}
                </span>
              </span>
            </>
          )}
          <span className="bg-ink text-paper absolute bottom-4 left-4 z-10 px-2 py-1 text-[12px] font-semibold tracking-[0.12em] uppercase">
            {GROUP_TITLE[member.group]}
          </span>
        </div>

        <div className="flex flex-col gap-8">
          {member.bio ? (
            <p className="text-ink max-w-xl text-[17px] leading-[1.75]">
              {member.bio}
            </p>
          ) : null}

          {member.bullets.length > 0 ? (
            <div className="border-line max-w-xl border-t pt-6">
              <p className="text-brand text-[12px] font-semibold tracking-[0.12em] uppercase">
                Амжилтууд
              </p>
              <ul className="mt-4 space-y-3">
                {member.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="text-ink/85 flex gap-3 text-[14.5px] leading-[1.6] font-medium"
                  >
                    <span
                      className="bg-brand mt-[7px] size-2 shrink-0"
                      aria-hidden="true"
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {member.sections?.length ? (
            <div className="border-line max-w-xl space-y-6 border-t pt-6">
              {member.sections.map((section) => (
                <div key={section.heading}>
                  <p className="text-brand text-[12px] font-semibold tracking-[0.12em] uppercase">
                    {section.heading}
                  </p>
                  {section.text ? (
                    <p className="text-ink/75 mt-2.5 text-[14.5px] leading-[1.7]">
                      {section.text}
                    </p>
                  ) : null}
                  {section.list?.length ? (
                    <ul className="mt-2.5 space-y-2">
                      {section.list.map((item) => (
                        <li
                          key={item}
                          className="text-ink/85 flex gap-3 text-[14.5px] leading-[1.6]"
                        >
                          <span
                            className="bg-brand mt-[7px] size-2 shrink-0"
                            aria-hidden="true"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="pt-2">
            <Link
              href={routes.site.management}
              className="text-mute hover:text-ink team-focus inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Бүх удирдлага
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/** Giant faded initials ("Б.Пүрэвдорж" → "БП") — same as the cards. */
function initialsOf(name: string): string {
  return name
    .split(/[.\s]+/)
    .filter(Boolean)
    .map((part) => part[0]!)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const member = await loadMember(slug);
  return { title: member ? `${member.name} · Удирдлага` : "Удирдлага" };
}

async function loadMember(slug: string): Promise<MemberPage | null> {
  const rows = await getExecutives();
  return rows.find((row) => row.slug === slug) ?? staticMemberBySlug(slug);
}

function staticMemberBySlug(slug: string): MemberPage | null {
  const profile = staff.find((member) => staffKey(member.name) === slug);
  if (!profile) return null;
  return {
    name: profile.name,
    slug,
    title: profile.role,
    group: "COACHES",
    photo: profile.photo ?? null,
    bio: profile.intro,
    bullets: profile.bullets ?? [],
    sections: profile.sections ?? null,
  };
}
