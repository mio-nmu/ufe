import { Reveal } from "@/components/team/reveal";
import { TeamButton } from "@/components/team/button";
import { contact } from "@/content/site";
import type { ThanksCopy } from "@/lib/content";

/**
 * "Дэмжигч талууддаа талархал" — shared by /sponsors (soft band) and the
 * home page bottom (paper band). Copy comes from getThanks(), so admin
 * edits under Нүүр → Талархлын хэсэг show on both pages.
 */
export function ThanksSection({
  thanks,
  tone = "soft",
}: {
  thanks: ThanksCopy;
  tone?: "paper" | "soft";
}) {
  const isSoft = tone === "soft";
  return (
    <section
      aria-labelledby="thanks-heading"
      className={`border-line border-t ${isSoft ? "bg-paper-soft" : "bg-paper"}`}
    >
      <div className="team-shell grid gap-8 py-12 md:grid-cols-[1fr_280px] md:items-center md:py-16">
        <Reveal>
          <p className="eyebrow">ТАЛАРХАЛ</p>
          <h2
            id="thanks-heading"
            className="font-display text-ink mt-3 text-[clamp(26px,3.5vw,36px)] leading-[1.05] font-bold tracking-[0.02em] uppercase"
          >
            {thanks.heading}
          </h2>
          <p className="text-mute mt-4 max-w-3xl text-sm leading-[1.8]">
            {thanks.paragraphOne}
          </p>
          <p className="text-mute mt-3 max-w-3xl text-sm leading-[1.8]">
            {thanks.paragraphTwo}
          </p>
        </Reveal>
        <Reveal delay={60}>
          <div
            className={`border-line rounded-lg border p-6 ${isSoft ? "bg-paper" : "bg-paper-soft"}`}
          >
            <p className="eyebrow">ХАМТРАН АЖИЛЛАХ</p>
            <p className="text-mute mt-3 text-sm leading-[1.7]">
              Манай багтай хамтрах талаар бидэнтэй холбогдоно уу.
            </p>
            <TeamButton
              variant="secondary"
              href={`mailto:${contact.email}`}
              className="mt-5"
            >
              Холбоо барих
            </TeamButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
