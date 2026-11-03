"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";

import { FilterPills } from "@/components/team/filter-pills";
import { Lightbox } from "@/components/team/photos-gallery";
import { YouTubeFrame } from "@/components/team/youtube-frame";
import { youTubeThumbUrl } from "@/lib/youtube";
import type { MediaAlbumRow, VideoRow } from "@/types/content";
import { cn } from "@/lib/utils";

/**
 * Combined media board: photo albums and videos in one date-sorted mixed
 * grid with type filter pills (Бүгд / Зурагнууд / Бичлэгүүд). Albums open
 * the image lightbox; videos open an ink modal player (direct mp4 or the
 * brand-free YouTube frame) — one immersive-viewer interaction for both
 * media types.
 */

const PAGE_SIZE = 9;

const TYPE_FILTERS = [
  { value: "all", label: "Бүгд" },
  { value: "photos", label: "Зурагнууд" },
  { value: "videos", label: "Бичлэгүүд" },
] as const;

const ALBUM_CATEGORIES: Record<MediaAlbumRow["category"], string> = {
  COMMUNITY: "Нийгмийн",
  EVENTS: "Арга хэмжээ",
  GAMES: "Тоглолт",
};

const VIDEO_CATEGORIES: Record<VideoRow["category"], string> = {
  BEHIND_THE_SCENES: "Ар тал",
  HIGHLIGHTS: "Онцлох",
  INTERVIEWS: "Ярилцлага",
  PRESS: "Хэвлэл",
};

type TypeFilter = (typeof TYPE_FILTERS)[number]["value"];

type BoardItem =
  | { kind: "album"; key: string; date: number; album: MediaAlbumRow }
  | { kind: "video"; key: string; date: number; video: VideoRow };

export function MediaBoard({
  albums,
  videos,
}: {
  albums: MediaAlbumRow[];
  videos: VideoRow[];
}) {
  const [type, setType] = useState<TypeFilter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [openAlbum, setOpenAlbum] = useState<MediaAlbumRow | null>(null);
  const [openVideo, setOpenVideo] = useState<VideoRow | null>(null);

  const items = useMemo(() => buildItems(albums, videos), [albums, videos]);
  const filtered = items.filter(
    (item) =>
      type === "all" || item.kind === (type === "photos" ? "album" : "video"),
  );
  const shown = filtered.slice(0, visible);

  return (
    <div className="team-shell pt-10 pb-16 md:pb-20">
      <FilterPills
        className="mt-6"
        label="Медианы төрөл"
        options={[...TYPE_FILTERS]}
        value={type}
        onChange={(value) => {
          setType(value);
          setVisible(PAGE_SIZE);
        }}
      />

      <div
        key={type}
        className="view-swap mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {shown.map((item) =>
          item.kind === "album" ? (
            <AlbumCard
              key={item.key}
              album={item.album}
              onOpen={() => setOpenAlbum(item.album)}
            />
          ) : (
            <VideoCard
              key={item.key}
              video={item.video}
              onOpen={() => setOpenVideo(item.video)}
            />
          ),
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-mute py-16 text-center text-[13px] font-semibold tracking-[0.12em] uppercase">
          Одоогоор медиа байхгүй.
        </p>
      ) : null}

      {visible < filtered.length ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
            className="font-display team-focus hover:bg-ink/5 border-ink text-ink inline-flex h-12 items-center rounded-full border px-8 text-sm font-semibold tracking-[0.06em] uppercase transition-colors"
          >
            Дэлгэрэнгүй ачаалах
          </button>
        </div>
      ) : null}

      {openAlbum ? (
        <Lightbox album={openAlbum} onClose={() => setOpenAlbum(null)} />
      ) : null}
      {openVideo ? (
        <VideoModal video={openVideo} onClose={() => setOpenVideo(null)} />
      ) : null}
    </div>
  );
}

/** Newest first across both media types; undated items sink to the end. */
function buildItems(albums: MediaAlbumRow[], videos: VideoRow[]): BoardItem[] {
  return [
    ...albums.map((album) => ({
      kind: "album" as const,
      key: `album-${album.id}`,
      date: album.eventDate ? new Date(album.eventDate).getTime() : 0,
      album,
    })),
    ...videos.map((video) => ({
      kind: "video" as const,
      key: `video-${video.id}`,
      date: video.publishedAt ? new Date(video.publishedAt).getTime() : 0,
      video,
    })),
  ].sort((a, b) => b.date - a.date);
}

function AlbumCard({
  album,
  onOpen,
}: {
  album: MediaAlbumRow;
  onOpen: () => void;
}) {
  const count = album.images.length > 0 ? album.images.length : 8;

  return (
    <article>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${album.title} галерей нээх`}
        className="team-focus block w-full text-left"
      >
        <div className="border-line bg-paper-soft relative aspect-video overflow-hidden rounded-lg border">
          {album.coverImage ? (
            <Image
              src={album.coverImage}
              alt=""
              fill
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              className="object-cover"
            />
          ) : (
            <span className="font-display text-mute/40 flex h-full items-center justify-center text-sm tracking-[0.12em] uppercase">
              {album.title}
            </span>
          )}
          <KindTag>Зураг</KindTag>
          <span className="bg-ink text-paper absolute right-2 bottom-2 rounded-full px-2 py-0.5 text-[12px] font-semibold tracking-[0.06em]">
            {count} фото
          </span>
        </div>
        <p className="text-mute mt-3 text-[12px] font-semibold tracking-[0.12em] uppercase">
          {[
            formatDate(album.eventDate),
            ALBUM_CATEGORIES[album.category] ?? album.category,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <h3 className="font-display text-ink mt-1 line-clamp-2 text-[22px] leading-[1.1] font-bold tracking-[0.02em] uppercase">
          {album.title}
        </h3>
      </button>
    </article>
  );
}

function VideoCard({ video, onOpen }: { video: VideoRow; onOpen: () => void }) {
  return (
    <article>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${video.title} тоглуулах`}
        className="team-focus block w-full text-left"
      >
        <div className="border-line bg-paper-soft relative aspect-video overflow-hidden rounded-lg border">
          {video.thumbnail || video.youtubeId ? (
            <Image
              src={
                video.thumbnail || youTubeThumbUrl(video.youtubeId as string)
              }
              alt=""
              fill
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              className="object-cover"
            />
          ) : (
            <span className="font-display text-mute/30 flex h-full items-center justify-center text-[13px] tracking-[0.12em] uppercase">
              {video.title.slice(0, 24)}
            </span>
          )}
          <KindTag>Бичлэг</KindTag>
          <span className="bg-ink text-paper absolute bottom-2 left-2 flex size-9 items-center justify-center rounded-full">
            <Play
              className="size-4 translate-x-px fill-current"
              aria-hidden="true"
            />
          </span>
          {video.durationSec ? (
            <span className="bg-ink text-paper absolute right-2 bottom-2 rounded-full px-1.5 py-0.5 text-[12px] font-semibold">
              {formatDuration(video.durationSec)}
            </span>
          ) : null}
        </div>
        <p className="text-mute mt-3 text-[12px] font-semibold tracking-[0.12em] uppercase">
          {[
            formatDate(video.publishedAt),
            VIDEO_CATEGORIES[video.category] ?? video.category,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <h3 className="font-display text-ink mt-1 line-clamp-2 text-[22px] leading-[1.1] font-bold tracking-[0.02em] uppercase">
          {video.title}
        </h3>
      </button>
    </article>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Ink modal player — same visual language as the album lightbox. */
function VideoModal({
  video,
  onClose,
}: {
  video: VideoRow;
  onClose: () => void;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntered(true), 10);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${video.title} тоглуулах`}
      className="bg-ink/95 fixed inset-0 z-50 flex flex-col"
    >
      <div className="flex items-center justify-between gap-4 px-6 py-4 text-white">
        <span className="font-display truncate text-xl font-semibold tracking-[0.02em] uppercase">
          {video.title}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Бичлэг хаах"
          className="team-focus flex size-11 shrink-0 items-center justify-center transition-opacity hover:opacity-70"
        >
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-8">
        <div
          className={cn(
            "relative aspect-video w-full max-w-[960px] transition-transform duration-[240ms] ease-out",
            entered ? "scale-100" : "scale-[0.96]",
          )}
        >
          {video.videoUrl ? (
            <video
              src={video.videoUrl}
              poster={video.thumbnail ?? undefined}
              controls
              autoPlay
              playsInline
              className="h-full w-full bg-black object-contain"
            />
          ) : video.youtubeId ? (
            <YouTubeFrame
              videoId={video.youtubeId}
              title={video.title}
              poster={video.thumbnail}
            />
          ) : video.thumbnail ? (
            <Image
              src={video.thumbnail}
              alt=""
              fill
              sizes="90vw"
              className="object-cover opacity-80"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center border border-white/10">
              <p className="font-display px-8 text-center text-lg tracking-[0.12em] text-white/30 uppercase">
                {video.title}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KindTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-paper/90 text-ink absolute top-2 left-2 rounded-full px-2 py-0.5 text-[12px] font-semibold tracking-[0.06em] uppercase">
      {children}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(new Date(iso))
    .toUpperCase();
}
