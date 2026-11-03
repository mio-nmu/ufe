"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import type { AlbumImage, MediaAlbumRow } from "@/types/content";
import { cn } from "@/lib/utils";

/** Lightbox: ink backdrop, counter, actions, main frame, thumb strip.
 *  Exported for reuse by the combined media board. */
export function Lightbox({
  album,
  onClose,
}: {
  album: MediaAlbumRow | null;
  onClose: () => void;
}) {
  const frames = album ? albumFrames(album) : [];
  // Mounted only while an album is open, so useState initializers run fresh.
  const [index, setIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const open = album !== null;

  // Entrance scale (.96→1), body scroll lock, keyboard + swipe navigation.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setEntered(true), 10);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const touchStartX = { current: 0 };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((i) => (i + 1) % frames.length);
      if (event.key === "ArrowLeft")
        setIndex((i) => (i - 1 + frames.length) % frames.length);
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartX.current = event.touches[0]?.clientX ?? 0;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const delta =
        (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
      if (Math.abs(delta) < 48) return;
      if (delta < 0) setIndex((i) => (i + 1) % frames.length);
      else setIndex((i) => (i - 1 + frames.length) % frames.length);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- frames derive from album
  }, [open, album]);

  const step = useCallback(
    (direction: 1 | -1) =>
      setIndex((i) => (i + direction + frames.length) % frames.length),
    [frames.length],
  );

  if (!open) return null;
  const frame = frames[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={album ? `${album.title} галерей` : "Галерей"}
      className="bg-ink/95 fixed inset-0 z-50 flex flex-col"
    >
      {/* Top bar: counter + actions */}
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <span className="font-display text-xl font-semibold">
          {index + 1} / {frames.length}
        </span>
        <div className="flex items-center gap-4 text-[13px] tracking-[0.06em] uppercase">
          {frame?.url ? (
            <a
              href={frame.url}
              download
              target="_blank"
              rel="noreferrer"
              className="team-focus transition-opacity hover:opacity-70"
            >
              Татах
            </a>
          ) : null}
          <span aria-hidden="true" className="text-white/40">
            ·
          </span>
          <span className="text-white/60">Хуваалцах</span>
          <button
            type="button"
            onClick={onClose}
            data-lb-close
            aria-label="Галерей хаах"
            className="team-focus flex size-11 items-center justify-center transition-opacity hover:opacity-70"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Main frame */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Өмнөх зураг"
          className="team-focus absolute left-2 z-10 flex size-12 items-center justify-center text-white/80 transition-colors hover:text-white"
        >
          <ChevronLeft className="size-8" aria-hidden="true" />
        </button>
        <div
          className={cn(
            "relative h-full max-h-[90vh] w-full max-w-[760px] transition-transform duration-[240ms] ease-out",
            entered ? "scale-100" : "scale-[0.96]",
          )}
        >
          {frame?.url ? (
            <Image
              src={frame.url}
              alt={frame.caption ?? album?.title ?? ""}
              fill
              sizes="90vw"
              className="object-contain"
            />
          ) : (
            <div className="bg-paper-soft/10 flex h-full w-full items-center justify-center border border-white/10">
              <span className="font-display px-8 text-center text-lg tracking-[0.12em] text-white/30 uppercase">
                {frame?.caption ?? "Зураг"}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Дараагийн зураг"
          className="team-focus absolute right-2 z-10 flex size-12 items-center justify-center text-white/80 transition-colors hover:text-white"
        >
          <ChevronRight className="size-8" aria-hidden="true" />
        </button>
      </div>

      {/* Caption + thumbnail strip */}
      <div className="pb-3">
        {frame?.caption ? (
          <p className="text-center text-[13px] text-white/70">
            {frame.caption}
          </p>
        ) : null}
        <div className="no-scrollbar mt-2 flex justify-center gap-2 overflow-x-auto px-4">
          {frames.map((item, i) => (
            <button
              key={`${item.url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Зураг ${i + 1}`}
              tabIndex={i === index ? 0 : -1}
              className={cn(
                "h-14 w-[72px] shrink-0 overflow-hidden rounded-md border transition-opacity",
                i === index
                  ? "border-white opacity-100"
                  : "border-transparent opacity-50",
              )}
            >
              {item.url ? (
                <Image
                  src={item.url}
                  alt=""
                  width={72}
                  height={56}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="block h-full w-full bg-white/10" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Placeholder frames stand in while an album has no uploaded images yet. */
function albumFrames(album: MediaAlbumRow): AlbumImage[] {
  if (album.images.length > 0) return album.images;
  return Array.from({ length: 8 }, (_, index) => ({
    caption: `${album.title} — кадр ${index + 1}`,
    url: "",
  }));
}
