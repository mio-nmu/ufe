import { compressForUpload } from "@/lib/admin/image-compress";
import { ApiClientError, api } from "@/lib/api-client";

/**
 * Admin image upload that never routes the file bytes through bd: Vercel
 * caps function request bodies at 4.5 MB, so anything larger must travel
 * browser → Cloudinary directly. bd hands out short-lived signed params
 * (admin-only endpoint), then registers the finished asset so it lands in
 * the media library like any other upload. Files over the Cloudinary plan's
 * per-image cap are downscaled in the browser first (see image-compress).
 */

interface DirectUploadParams {
  apiKey: string;
  cloudName: string;
  folder: string;
  signature: string;
  timestamp: number;
}

interface CloudinaryUploadResponse {
  error?: { message?: string };
  public_id?: string;
}

/** A registered media-library asset — enough to reference it later. */
export interface UploadedAdminImage {
  publicId: string;
  url: string;
}

/** Uploads an image and returns its persisted media URL. */
export async function uploadAdminImage(
  file: File,
  alt: string,
): Promise<string> {
  const { url } = await uploadAdminImageDetailed(file, alt);
  return url;
}

/** Uploads an image and returns its persisted media-library row. */
export async function uploadAdminImageDetailed(
  file: File,
  alt: string,
  subfolder = "uploads",
): Promise<UploadedAdminImage> {
  file = await compressForUpload(file);

  const { params } = await api.post<{ params: DirectUploadParams }>(
    "/api/v1/admin/media/direct-params",
    { folder: subfolder },
  );

  // Only these five fields: every extra unsigned param would break the
  // signature Cloudinary checks against folder + timestamp.
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", params.apiKey);
  form.append("timestamp", String(params.timestamp));
  form.append("folder", params.folder);
  form.append("signature", params.signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  const body = (await response
    .json()
    .catch(() => null)) as CloudinaryUploadResponse | null;
  if (!response.ok || !body?.public_id) {
    const providerMessage = body?.error?.message;
    throw new ApiClientError(
      response.status,
      "UPLOAD_FAILED",
      (providerMessage && providerSizeMessage(providerMessage)) ??
        providerMessage ??
        `Cloudinary upload failed (HTTP ${response.status})`,
    );
  }

  const { media } = await api.post<{ media: UploadedAdminImage }>(
    "/api/v1/admin/media/register",
    { alt, publicId: body.public_id },
  );
  return { publicId: media.publicId, url: media.url };
}

/** "File size too large. Got 11936151. Maximum is 10485760." → MB, readable. */
function providerSizeMessage(message: string): string | null {
  if (!/file size too large/i.test(message)) return null;
  const match = /Maximum is (\d+)/u.exec(message);
  const limitMb = match ? Math.round(Number(match[1]) / 1024 / 1024) : null;
  return limitMb
    ? `Image is above the storage plan's ${limitMb} MB per-image limit — resize it before uploading.`
    : "Image is above the storage plan's per-image size limit — resize it before uploading.";
}
