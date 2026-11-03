"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Replace,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { HISTORY_PHOTO_FOLDERS } from "@/components/team/history-experience";
import { ConfirmDeleteDialog } from "@/components/admin/entity-cards";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadAdminImageDetailed } from "@/lib/admin/media-upload";
import { revalidatePublicTag } from "@/lib/admin/revalidate";
import { ApiClientError, api } from "@/lib/api-client";
import { adminContentService } from "@/services/admin/content.service";
import type { HistoryPhotoRow } from "@/types/content";

/**
 * /history archive-photo manager, mounted under /admin/text/history.
 * Photos live in Cloudinary (browser → Cloudinary direct upload, registered
 * through the media library like every other admin image) and are grouped
 * by year folder — the same folders the public era track maps onto panels.
 * Every mutation refetches and purges the public history-photos cache tag.
 */

const ENDPOINT = "/content/history-photos";
const QUERY_KEY = ["admin", "history-photos"] as const;
const MAX_UPLOAD_MB = 20;

export function HistoryPhotosManager() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => adminContentService.list<HistoryPhotoRow>(ENDPOINT),
  });

  const groups = useMemo(
    () => groupByFolder(listQuery.data?.items ?? []),
    [listQuery.data],
  );

  // Known era folders oldest-first; any folder already holding photos but
  // no longer mapped by an era stays manageable instead of vanishing.
  const folders = [
    ...HISTORY_PHOTO_FOLDERS,
    ...[...groups.keys()].filter((f) => !HISTORY_PHOTO_FOLDERS.includes(f)),
  ];

  const afterChange = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    void revalidatePublicTag("history-photos");
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Он жилүүлийн зургууд</h2>
        <span className="text-muted-foreground text-xs">
          Cloudinary дээр хадгалагдана · жил бүрээр ангилагдана · түүхийн
          хуудсанд шууд гарна
        </span>
      </div>

      {listQuery.isPending ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Зургууд ачаалж байна…
        </div>
      ) : listQuery.isError ? (
        <p className="text-destructive text-sm">
          Зургуудыг ачаалахад алдаа гарлаа — дахин оролдоно уу.
        </p>
      ) : (
        <div className="space-y-8">
          {folders.map((folder) => (
            <FolderSection
              key={folder}
              folder={folder}
              photos={groups.get(folder) ?? []}
              onChanged={afterChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Groups rows by folder, preserving the API's chronological ordering. */
function groupByFolder(
  items: HistoryPhotoRow[],
): Map<string, HistoryPhotoRow[]> {
  const groups = new Map<string, HistoryPhotoRow[]>();
  for (const photo of items) {
    const list = groups.get(photo.folder);
    if (list) {
      list.push(photo);
    } else {
      groups.set(photo.folder, [photo]);
    }
  }
  return groups;
}

function FolderSection({
  folder,
  photos,
  onChanged,
}: {
  folder: string;
  photos: HistoryPhotoRow[];
  onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = uploading > 0;

  const upload = async (files: File[]) => {
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`«${file.name}» зураг биш — зөвхөн зураг хуулна уу.`);
        continue;
      }
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        toast.error(
          `«${file.name}» хэт том — ${MAX_UPLOAD_MB}MB хүртэл байх ёстой.`,
        );
        continue;
      }
      setUploading((count) => count + 1);
      try {
        const asset = await uploadAdminImageDetailed(
          file,
          `Түүх — ${labelFor(folder)}`,
          "tuuh",
        );
        await api.post(ENDPOINT, {
          folder,
          publicId: asset.publicId,
          sortOrder: photos.length,
        });
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
    onChanged();
  };

  /** Persists the folder's display order: PATCH every photo whose index moved. */
  const persistOrder = async (
    ordered: HistoryPhotoRow[],
    next: HistoryPhotoRow[],
  ) => {
    await Promise.all(
      next.map((photo, index) =>
        ordered.indexOf(photo) === index || photo.sortOrder === index
          ? Promise.resolve()
          : api.patch(`${ENDPOINT}/${photo.id}`, { sortOrder: index }),
      ),
    );
    onChanged();
  };

  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    await persistOrder(photos, next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h3 className="font-display font-semibold tracking-wide">
          {labelFor(folder)}
        </h3>
        <span className="text-muted-foreground text-xs">
          {photos.length > 0 ? `${photos.length} зураг` : "зураггүй"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            position={`${index + 1}/${photos.length}`}
            onMove={(delta) => void move(index, delta)}
            onChanged={onChanged}
          />
        ))}

        <button
          type="button"
          aria-label={`${labelFor(folder)}-д зураг нэмэх`}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="border-line text-muted-foreground hover:border-primary/60 hover:text-primary flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-[12px] font-medium transition-colors disabled:opacity-60"
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
    </div>
  );
}

function PhotoCard({
  photo,
  position,
  onMove,
  onChanged,
}: {
  photo: HistoryPhotoRow;
  position: string;
  onMove: (delta: -1 | 1) => void;
  onChanged: () => void;
}) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);

  const patch = async (payload: Record<string, unknown>, fallback: string) => {
    setBusy(true);
    try {
      await api.patch(`${ENDPOINT}/${photo.id}`, payload);
      onChanged();
      return true;
    } catch (error) {
      toast.error(errorMessage(error, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveCaption = async () => {
    const next = caption.trim();
    if (next === (photo.caption ?? "")) return;
    if (await patch({ caption: next }, "Тайлбар хадгалахад алдаа гарлаа")) {
      toast.success("Тайлбар хадгалагдлаа");
    }
  };

  const replace = async (file: File) => {
    setBusy(true);
    try {
      const asset = await uploadAdminImageDetailed(
        file,
        photo.caption ?? `Түүх — ${labelFor(photo.folder)}`,
      );
      await api.patch(`${ENDPOINT}/${photo.id}`, { publicId: asset.publicId });
      onChanged();
      toast.success("Зураг солигдлоо");
    } catch (error) {
      toast.error(errorMessage(error, "Зураг солихонд алдаа гарлаа"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`${ENDPOINT}/${photo.id}`);
      onChanged();
      toast.success("Зураг устлаа");
    } catch (error) {
      toast.error(errorMessage(error, "Зураг устгахад алдаа гарлаа"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-line relative overflow-hidden rounded-lg border">
      <div className="bg-muted/40 relative aspect-[3/2]">
        {/* eslint-disable-next-line @next/next/no-img-element -- CMS field: arbitrary-origin URLs */}
        <img
          src={photo.url}
          alt={photo.caption ?? ""}
          className="h-full w-full object-cover"
        />
        <span className="bg-background/85 absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[12px] font-semibold">
          {position}
        </span>
        {busy ? (
          <span className="bg-background/80 absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 p-2">
        <Input
          value={caption}
          placeholder="Тайлбар (дурамжтай)"
          disabled={busy}
          className="bg-background h-7 text-xs"
          onChange={(event) => setCaption(event.target.value)}
          onBlur={() => void saveCaption()}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5">
            <button
              type="button"
              aria-label="Өмнөх байрлал руу нүүлгэх"
              disabled={busy || position === "1/1"}
              onClick={() => onMove(-1)}
              className={buttonVariants({ size: "icon-xs", variant: "ghost" })}
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Дараагийн байрлал руу нүүлгэх"
              disabled={busy}
              onClick={() => onMove(1)}
              className={buttonVariants({ size: "icon-xs", variant: "ghost" })}
            >
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Зургийг солих"
              disabled={busy}
              onClick={() => replaceRef.current?.click()}
              className={buttonVariants({ size: "icon-xs", variant: "ghost" })}
            >
              <Replace className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Зургийг устгах"
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="text-destructive h-7 w-7 cursor-pointer p-0"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void replace(file);
          event.target.value = "";
        }}
      />

      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        name={photo.caption ?? `${labelFor(photo.folder)} оны зураг`}
        onConfirm={() => void remove()}
        busy={busy}
      />
    </div>
  );
}

function labelFor(folder: string): string {
  return folder.replace("-", "–");
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}
