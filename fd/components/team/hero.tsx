"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { WaveField } from "@/components/team/wave-field";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

const AUTOPLAY_MS = 8000;

// ── Hero carousel ───────────────────────────────────────────────────────────
// Responsive ink panel: wave-field texture, bottom gradient, condensed
// headline. Three horizontally sliding panels autoplay every 8s with 80×3
// progress bars and 44px arrow controls.

/** Editable hero copy (site-content home/hero over the static default). */
export interface HeroCopy {
  badge: string;
  title: string;
  headline: string;
  intro: string;
  ctaPlayers: string;
  ctaHistory: string;
  aubl: { title: string; text: string };
}

interface Slide {
  kicker: string;
  headline: string;
  subline: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}

export function Hero({
  copy,
  historyIntro,
}: {
  copy: HeroCopy;
  historyIntro: string;
}) {
  const slides = buildSlides(copy, historyIntro);
  const [index, setIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const parallaxRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (next: number) => {
      setIndex(((next % slides.length) + slides.length) % slides.length);
      setProgressKey((key) => key + 1);
    },
    [slides.length],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [index, go, progressKey]);

  // Parallax: the texture layer drifts at 0.4× scroll speed while the hero
  // is on screen (skipped under prefers-reduced-motion).
  useEffect(() => {
    const layer = parallaxRef.current;
    if (!layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const update = () => {
      const y = Math.min(window.scrollY, 800);
      layer.style.transform = `translate3d(0, ${y * 0.4}px, 0)`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <section
      aria-label={copy.title}
      className="bg-paper"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(index + 1);
        if (event.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="bg-navy relative flex min-h-[480px] items-center overflow-hidden border-t border-white/70 text-white sm:min-h-[72svh]">
        <div
          ref={parallaxRef}
          className="absolute inset-0 will-change-transform"
        >
          <WaveField height={700} />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.85),rgba(0,0,0,0)_60%)]"
        />
        <div
          aria-hidden="true"
          className="to-ink pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent"
        />
        {/* Hero visual — decorative group photo on the right rail, above the
            gradient but under the slide copy (DOM order) so controls stay
            visible. It stays on every slide; only the text panels rotate. */}
        {siteConfig.heroGroupImage ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[560px] items-end justify-end pr-6 select-none lg:flex xl:w-[50vw] xl:max-w-[880px] xl:pr-10">
            <Image
              src={siteConfig.heroGroupImage}
              alt=""
              width={1800}
              height={1216}
              priority={false}
              sizes="(min-width: 1280px) 50vw, 560px"
              className="h-auto w-full"
            />
          </div>
        ) : null}
        {/* Brand wordmark — the provided UFE Basketball logo, its dark ink
            recolored white for the navy panel (see images/brand/). */}
        <Image
          src="/images/brand/wordmark-light.png"
          alt=""
          width={900}
          height={198}
          priority={false}
          sizes="(min-width: 1280px) 144px, 128px"
          className="absolute top-8 right-6 hidden h-auto w-32 lg:block xl:w-36"
        />

        <div className="team-shell relative flex min-h-[480px] w-full flex-col py-8 sm:min-h-[72svh] sm:py-10 md:py-16">
          {/* Text block centered in the space above the progress bars. */}
          <div className="flex flex-1 items-center">
            <div className="hero-slides grid w-full">
              {slides.map((slide, slideIndex) => (
                <div
                  key={slide.headline}
                  aria-hidden={slideIndex !== index}
                  inert={slideIndex !== index}
                  data-position={
                    slideIndex === index
                      ? "active"
                      : slideIndex ===
                          (index - 1 + slides.length) % slides.length
                        ? "before"
                        : slideIndex === (index + 1) % slides.length
                          ? "after"
                          : "outside"
                  }
                  className="hero-slide"
                >
                  <div className="team-shell flex w-full">
                    <div className="flex max-w-[780px] flex-col gap-3 text-white lg:max-w-[600px] xl:max-w-[660px]">
                      <p className="text-[12px] font-semibold tracking-[0.12em] text-white uppercase">
                        {slide.kicker}
                      </p>
                      <h1 className="font-display max-w-[620px] text-[clamp(30px,6vw,56px)] leading-[1] font-bold tracking-[0.02em] text-white uppercase sm:text-[clamp(34px,5vw,56px)]">
                        {slide.headline}
                      </h1>
                      <p className="max-w-[520px] text-[15px] leading-[1.55] text-white/90">
                        {slide.subline}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls: slim progress bars (clickable) — slides autoplay */}
          <div className="mt-8 sm:mt-10">
            <div
              className="flex items-center gap-2"
              role="tablist"
              aria-label="Слайд"
            >
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.headline}
                  type="button"
                  role="tab"
                  aria-selected={slideIndex === index}
                  aria-label={`Слайд ${slideIndex + 1}`}
                  onClick={() => go(slideIndex)}
                  className="team-focus h-11 py-4"
                >
                  <span className="relative block h-[3px] w-16 overflow-hidden bg-white/25 md:w-20">
                    {slideIndex === index ? (
                      <span
                        key={progressKey}
                        className="absolute inset-0 origin-left bg-white"
                        style={{
                          animation: `hero-progress ${AUTOPLAY_MS}ms linear forwards`,
                        }}
                      />
                    ) : slideIndex < index ? (
                      <span className="absolute inset-0 bg-white/70" />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildSlides(copy: HeroCopy, historyIntro: string): Slide[] {
  return [
    {
      kicker: copy.badge,
      headline: copy.headline,
      subline: copy.intro,
      primary: { label: copy.ctaPlayers, href: routes.site.roster },
      secondary: { label: copy.ctaHistory, href: routes.site.history },
    },
    {
      kicker: `${copy.aubl.title} · 2026–2027`,
      headline: copy.aubl.title,
      subline: copy.aubl.text,
      primary: { label: copy.ctaHistory, href: routes.site.history },
    },
    {
      kicker: "Түүх · 1992–2026",
      headline: "1992 оноос өнөөдрийг хүртэл",
      subline: historyIntro,
      primary: { label: "Түүхийг үзэх", href: routes.site.history },
    },
  ];
}
