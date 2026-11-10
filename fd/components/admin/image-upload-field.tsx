"use client";

import { buttonVariants } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { uploadAdminImage } from "@/lib/admin/media-upload";
import { ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Cloudinary-backed image inputs shared by every admin create/edit dialog
 * (collection manager + CMS resource panel). Files upload browser →
 * Cloudinary directly (signed by bd), one image at a time per request.
 */

/** Mirrors the backend multer cap (MAX_UPLOAD_MB, default 20). */
const MAX_UPLOAD_MB = 20;

// ─── Single image (cover, portrait, thumbnail…) ─────────────────────────────

export function ImageUploadField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: File[]) => {
    const file = files[0];
    const invalid = file ? validateFile(file) : null;
    if (!file || invalid) {
      if (invalid) toast.error(invalid);
      return;
    }
    setUploading(true);
    try {
      onChange(await uploadImage(file));
      toast.success("Зураг хуулагдлаа");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Зураг хуулахад алдаа гарлаа",
      );
    } finally {
      setUploading(false);
    }
  };

  const { dragging, handlers } = useDropZone(upload, uploading);
  const url = value.trim();

  return (
    <div className="flex gap-3">
      <button
        type="button"
        aria-label="Зураг сонгох (чирж оруулж болно)"
        onClick={() => inputRef.current?.click()}
        {...handlers}
        className={cn(
          "group bg-muted/40 border-line relative flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors",
          dragging && "border-primary bg-primary/10",
          !dragging && "hover:border-primary/60",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- CMS field: arbitrary-origin URLs
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.opacity = "0";
            }}
          />
        ) : (
          <span className="text-muted-foreground/60 flex flex-col items-center gap-1 text-[12px] font-medium">
            <ImageIcon className="size-5" aria-hidden="true" />
            Урьдчилан харах
          </span>
        )}
        {uploading ? (
          <span className="bg-background/80 absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          </span>
        ) : null}
        {url && !uploading ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Зургийг цэвэрлэх"
            onClick={(event) => {
              event.stopPropagation();
              onChange("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onChange("");
              }
            }}
            className="bg-background/90 text-foreground absolute top-1 right-1 hidden rounded-full p-0.5 shadow-sm group-hover:block"
          >
            <X className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </button>

      <div className="grid flex-1 gap-1.5">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? "https://… эсвэл зургаа хуулна уу"}
          className="bg-background"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-3.5" aria-hidden="true" />
            )}
            {uploading ? "Хуулж байна…" : "Файл сонгох"}
          </button>
          <span className="text-muted-foreground text-[12px]">
            Зурган дээр чирж оруулж болно · ≤{MAX_UPLOAD_MB}MB · том зураг
            автоматаар багасгагдана
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload([file]);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

// ─── Image list (gallery albums) ────────────────────────────────────────────

/**
 * Multi-image editor for gallery albums. The form value stays the wire
 * format used by the collection manager — one URL per line — while the UI
 * is a reorderable thumbnail grid with batch upload + drag & drop.
 */
export function ImagesUploadField({
  id,
  value,
  onChange,
}: {
  id: string;
  /** One image URL per line. */
  value: string;
  onChange: (next: string) => void;
}) {
  const urls = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const [uploading, setUploading] = useState(0);
  const [showUrls, setShowUrls] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (next: string[]) => onChange(next.join("\n"));

  const upload = async (files: File[]) => {
    const accepted: File[] = [];
    for (const file of files) {
      const invalid = validateFile(file);
      if (invalid) {
        toast.error(invalid);
        continue;
      }
      accepted.push(file);
    }
    const added: string[] = [];
    for (const file of accepted) {
      setUploading((count) => count + 1);
      try {
        added.push(await uploadImage(file));
      } catch (error) {
        toast.error(
          error instanceof ApiClientError
            ? `«${file.name}»: ${error.message}`
            : `«${file.name}» хуулахад алдаа гарлаа`,
        );
      } finally {
        setUploading((count) => count - 1);
      }
    }
    if (added.length > 0) {
      commit([...urls, ...added]);
      toast.success(`${added.length} зураг хуулагдлаа`);
    }
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= urls.length) return;
    const next = [...urls];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const { dragging, handlers } = useDropZone(upload, uploading > 0);
  const busy = uploading > 0;

  return (
    <div className="grid gap-2">
      <div
        {...handlers}
        className={cn(
          "grid grid-cols-3 gap-2 rounded-lg transition-colors sm:grid-cols-4",
          dragging && "bg-primary/10",
        )}
      >
        {urls.map((url, index) => (
          <div
            key={`${index}-${url}`}
            className="border-line group relative aspect-square overflow-hidden rounded-lg border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- CMS field: arbitrary-origin URLs */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <div className="bg-background/90 absolute top-1 right-1 hidden rounded-full p-0.5 shadow-sm group-hover:block">
              <button
                type="button"
                aria-label={`${index + 1}-р зургийг хасах`}
                onClick={() => commit(urls.filter((_, i) => i !== index))}
                className="cursor-pointer"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {urls.length > 1 ? (
              <div className="bg-background/90 absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-full p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Зүүн тийш нүүлгэх"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="cursor-pointer disabled:opacity-30"
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                </button>
                <span className="text-foreground/70 pointer-events-none self-center text-[12px] font-semibold">
                  {index + 1}
                </span>
                <button
                  type="button"
                  aria-label="Баруун тийш нүүлгэх"
                  disabled={index === urls.length - 1}
                  onClick={() => move(index, 1)}
                  className="cursor-pointer disabled:opacity-30"
                >
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          id={id}
          aria-label="Зургууд нэмэх (чирж оруулж болно)"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(
            "border-line text-muted-foreground hover:border-primary/60 hover:text-primary flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-[12px] font-medium transition-colors disabled:opacity-60",
            dragging && "border-primary text-primary bg-primary/5",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              {uploading} хуулж байна…
            </>
          ) : (
            <>
              <Plus className="size-5" aria-hidden="true" />
              Зураг нэмэх
            </>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={busy}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) void upload(files);
            event.target.value = "";
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[12px]">
          {urls.length > 0
            ? `${urls.length} зураг · хулганаар чирж дарааллыг өөрчилнө · ≤${MAX_UPLOAD_MB}MB · том зураг автоматаар багасгагдана`
            : `Олон зураг зэрэг сонгох боломжтой · ≤${MAX_UPLOAD_MB}MB · том зураг автоматаар багасгагдана`}
        </span>
        <button
          type="button"
          onClick={() => setShowUrls((shown) => !shown)}
          className="text-muted-foreground hover:text-foreground cursor-pointer text-[12px] font-medium underline underline-offset-2"
        >
          {showUrls ? "URL жагсаалт нуух" : "URL-аар нэмэх"}
        </button>
      </div>

      {showUrls ? (
        <textarea
          value={value}
          rows={4}
          spellCheck={false}
          placeholder="https://… (нэг URL нэг мөр)"
          onChange={(event) => onChange(event.target.value)}
          className="border-input focus-visible:ring-ring bg-background rounded-md border px-3 py-2 font-mono text-xs focus-visible:outline-none"
        />
      ) : null}
    </div>
  );
}

/** Drop-zone state helper: highlight while dragging, collect image files on drop. */
function useDropZone(onFiles: (files: File[]) => void, disabled = false) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  // A drag can end outside the element without a leave event (element
  // removed, ESC) — clear the highlight when the drag itself finishes.
  useEffect(() => {
    if (!dragging) return;
    const end = () => {
      depth.current = 0;
      setDragging(false);
    };
    window.addEventListener("dragend", end);
    window.addEventListener("drop", end);
    return () => {
      window.removeEventListener("dragend", end);
      window.removeEventListener("drop", end);
    };
  }, [dragging]);

  return {
    dragging,
    handlers: disabled
      ? {}
      : {
          onDragEnter: (event: React.DragEvent) => {
            event.preventDefault();
            depth.current += 1;
            setDragging(true);
          },
          onDragOver: (event: React.DragEvent) => event.preventDefault(),
          onDragLeave: (event: React.DragEvent) => {
            event.preventDefault();
            depth.current -= 1;
            if (depth.current <= 0) setDragging(false);
          },
          onDrop: (event: React.DragEvent) => {
            event.preventDefault();
            depth.current = 0;
            setDragging(false);
            const files = Array.from(event.dataTransfer.files).filter((file) =>
              file.type.startsWith("image/"),
            );
            if (files.length > 0) onFiles(files);
          },
        },
  };
}

function validateFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return `«${file.name}» зураг биш — зөвхөн зураг хуулна уу.`;
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `«${file.name}» хэт том — ${MAX_UPLOAD_MB}MB хүртэл байх ёстой.`;
  }
  return null;
}

async function uploadImage(file: File): Promise<string> {
  // Backend caps alt text at 200 chars (MEDIA_ALT_MAX_LENGTH).
  return uploadAdminImage(file, `upload-${file.name}`.slice(0, 200));
}
