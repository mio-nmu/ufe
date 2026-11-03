"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

import { WaveField } from "@/components/team/wave-field";

/**
 * Media page hero: full-bleed backdrop (featured video, its poster, or the
 * wave texture when neither exists), a 50% dark overlay, and white centered
 * copy. The video is decorative — muted, looping, paused for users who
 * prefer reduced motion (the poster still shows).
 */
export function MediaHero({
  breadcrumb,
  title,
  subtitle,
  videoUrl = null,
  poster = null,
}: {
  breadcrumb: string;
  title: string;
  subtitle?: string;
  /** Direct file URL (mp4/webm) — YouTube links can't back a <video> tag. */
  videoUrl?: null | string;
  poster?: null | string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (
      video &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      video.pause();
      video.removeAttribute("autoplay");
    }
  }, []);

  return (
    <section className="bg-ink relative overflow-hidden text-white">
      {videoUrl || poster ? (
        <video
          ref={videoRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          src={videoUrl ?? undefined}
          poster={poster ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0">
          <WaveField height={540} />
        </div>
      )}

      {/* 50% dark overlay */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />

      <div className="team-shell relative z-10 flex min-h-[420px] flex-col items-center justify-center py-12 text-center md:min-h-[540px] md:py-16">
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] text-white/60 uppercase"
        >
          <Link href="/" className="transition-colors hover:text-white">
            Нүүр
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-white">{breadcrumb}</span>
        </nav>
        <h1 className="font-display text-[clamp(44px,8vw,84px)] leading-[0.95] font-bold tracking-[0.02em] text-white uppercase">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.6] text-white/75">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
