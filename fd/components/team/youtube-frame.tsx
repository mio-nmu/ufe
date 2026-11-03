"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

import { probeImage, youTubeThumbUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";

const PLAYER_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

let apiPromise: Promise<YouTubeNamespace> | null = null;

/**
 * Brand-free YouTube surface.
 *
 * Idle state is a poster facade with our own play button — no YouTube UI.
 * On click the video mounts through the IFrame Player API with all native
 * chrome disabled (`controls=0` + friends), and a minimal custom control
 * bar (play/pause, seek, time, mute, fullscreen) styled like the site takes
 * over. A top gradient masks the title overlay YouTube shows when paused.
 */

// ── Minimal IFrame API typings (no @types/youtube dependency) ───────────────

interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
        onStateChange?: (event: {
          data: number;
          target: YouTubePlayer;
        }) => void;
      };
    },
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function YouTubeFrame({
  videoId,
  title,
  poster,
  className,
}: {
  videoId: string;
  title: string;
  poster?: string | null;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [hovering, setHovering] = useState(false);
  // Probed poster keyed by video — stale probes from another videoId are
  // ignored. Custom poster prop always wins.
  const [probe, setProbe] = useState<{ forId: string; url: string } | null>(
    null,
  );
  const posterSrc = poster ?? (probe?.forId === videoId ? probe.url : null);

  // Warm the API script so the facade click starts playback instantly.
  useEffect(() => {
    void loadYouTubeApi().catch(() => undefined);
  }, []);

  // Poster fallback: maxres → hq probe (maxres misses on some uploads and
  // hq is 4:3 letterboxed for widescreen).
  useEffect(() => {
    if (poster) return;
    let active = true;
    void probeImage(youTubeThumbUrl(videoId, "maxres")).then((ok) => {
      if (active) {
        setProbe({
          forId: videoId,
          url: youTubeThumbUrl(videoId, ok ? "maxres" : "hq"),
        });
      }
    });
    return () => {
      active = false;
    };
  }, [poster, videoId]);

  // Player lifecycle: mount on start, destroy on end/unmount/video change.
  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    void loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        playerRef.current = new YT.Player(mountRef.current, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              setDuration(event.target.getDuration());
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (event.data === PLAYER_STATE.ENDED) {
                setStarted(false);
                setPlaying(false);
                setCurrent(0);
              } else {
                setPlaying(event.data === PLAYER_STATE.PLAYING);
                setDuration(event.target.getDuration() || duration);
              }
            },
          },
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // destroy() throws when the iframe is already gone — ignore.
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, videoId]);

  // Progress ticker while playing.
  useEffect(() => {
    if (!started || !playing) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (player) setCurrent(player.getCurrentTime());
    }, 250);
    return () => window.clearInterval(timer);
  }, [started, playing]);

  // Track fullscreen exits via Esc so the icon stays in sync.
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  }, [playing]);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isMuted()) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.requestFullscreen().catch(() => undefined);
  }, []);

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const showControls = !playing || hovering;

  return (
    <div
      ref={shellRef}
      className={cn("bg-ink relative h-full w-full overflow-hidden", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {!started ? (
        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label={`${title} тоглуулах`}
          className="team-focus group relative block h-full w-full"
        >
          {posterSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={posterSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : null}
          <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/20" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="bg-paper text-ink team-focus flex size-16 items-center justify-center rounded-full transition-transform group-hover:scale-105 sm:size-18">
              {failed ? (
                <span className="px-3 text-center text-[12px] font-semibold tracking-[0.12em] uppercase">
                  Алдаа
                </span>
              ) : (
                <Play
                  className="size-7 translate-x-0.5 fill-current"
                  aria-hidden="true"
                />
              )}
            </span>
          </span>
        </button>
      ) : (
        <div className="absolute inset-0">
          {/* Player mount — the API replaces this div with the iframe. */}
          <div ref={mountRef} className="h-full w-full" />

          {/* Mask the title overlay YouTube paints on pause. */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent" />

          {/* Click-to-toggle surface. */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Түр зогсоох" : "Тоглуулах"}
            className="absolute inset-0 cursor-default"
          />

          {/* Custom chrome — no YouTube branding anywhere. */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pt-8 pb-3 transition-opacity duration-200",
              showControls ? "opacity-100" : "opacity-0",
            )}
          >
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Түр зогсоох" : "Тоглуулах"}
              className="team-focus text-paper flex size-9 shrink-0 items-center justify-center"
            >
              {playing ? (
                <Pause className="size-5 fill-current" aria-hidden="true" />
              ) : (
                <Play
                  className="size-5 translate-x-px fill-current"
                  aria-hidden="true"
                />
              )}
            </button>
            <span className="text-paper/80 text-[12px] tabular-nums">
              {formatTime(current)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.1}
              value={Math.min(current, duration)}
              aria-label="Видео цаг"
              onChange={(event) => {
                const next = Number(event.target.value);
                setCurrent(next);
                playerRef.current?.seekTo(next, true);
              }}
              className="h-1 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              style={{
                background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.25) ${progress}%)`,
              }}
            />
            <span className="text-paper/80 text-[12px] tabular-nums">
              {formatTime(duration)}
            </span>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Чимээг нээх" : "Чимээг хаах"}
              className="team-focus text-paper flex size-9 shrink-0 items-center justify-center"
            >
              {muted ? (
                <VolumeX className="size-5" aria-hidden="true" />
              ) : (
                <Volume2 className="size-5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={
                fullscreen ? "Бүрэн дэлгэцнээс гарах" : "Бүрэн дэлгэц"
              }
              className="team-focus text-paper flex size-9 shrink-0 items-center justify-center"
            >
              {fullscreen ? (
                <Minimize className="size-5" aria-hidden="true" />
              ) : (
                <Maximize className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Loads the IFrame API once per page; concurrent callers share the promise. */
function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API requires a browser"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT) resolve(window.YT);
      };
      if (!document.getElementById("youtube-iframe-api")) {
        const script = document.createElement("script");
        script.id = "youtube-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
    });
  }
  return apiPromise;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
