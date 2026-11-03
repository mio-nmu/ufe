/**
 * Browser-side downscaling for oversized image uploads. The Cloudinary plan
 * (free tier) caps each image at 10 MB — larger photos from a phone would be
 * rejected by the provider even though MAX_UPLOAD_MB allows them. Instead of
 * failing, the admin upload path shrinks just-enough: images over the plan
 * limit are re-encoded at a 2400px longest edge (a 12 MB photo lands around
 * 1–3 MB, visually identical at website sizes). Files already under the
 * limit are returned untouched, and any decode/canvas failure falls back to
 * the original file so the provider — not us — has the final word.
 */

/** Cloudinary free-plan per-image cap (10 MiB — from its own error message). */
export const PROVIDER_IMAGE_LIMIT_BYTES = 10 * 1024 * 1024;

/** Longest edge after downscaling; full-bleed heroes never need more. */
const MAX_EDGE = 2400;

const JPEG_QUALITY = 0.85;
const WEBP_QUALITY = 0.9;

/**
 * Returns `file` unchanged when it is within the plan limit (or cannot be
 * safely processed); otherwise a re-encoded, smaller File with an updated
 * extension.
 */
export async function compressForUpload(file: File): Promise<File> {
  if (!needsCompression(file)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // undecodable here (e.g. HEIC in some browsers) — upload as-is
  }

  try {
    const { width, height } = targetDimensions(
      bitmap.width,
      bitmap.height,
      MAX_EDGE,
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    // JPEG stays JPEG (photos); everything else becomes WebP — it keeps
    // PNG transparency and beats re-encoding AVIF, which canvas cannot write.
    const outputType = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        resolve,
        outputType,
        outputType === "image/jpeg" ? JPEG_QUALITY : WEBP_QUALITY,
      ),
    );
    // No gain (or encoder unavailable) — prefer the original bytes.
    if (!blob || blob.size >= file.size) return file;

    const extension = outputType === "image/jpeg" ? ".jpg" : ".webp";
    const name = file.name.replace(/\.[^.]+$/u, extension);
    return new File([blob], name, {
      lastModified: file.lastModified,
      type: outputType,
    });
  } finally {
    bitmap.close();
  }
}

/** True when the file would trip the provider's per-image size cap. */
export function needsCompression(file: File): boolean {
  // Animated GIFs must pass through untouched — canvas re-encoding would
  // freeze them to a single frame. Over-limit GIFs surface the provider's
  // own (mapped) size error instead.
  if (file.type === "image/gif") return false;
  return file.size > PROVIDER_IMAGE_LIMIT_BYTES;
}

/** Pure dimension math, split out for unit tests. */
export function targetDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { height: number; width: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}
