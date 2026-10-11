"use client";

import { uploadImage, type UploadResult } from "./actions";

// Shrinks a photo in the browser before upload: phone photos are often 3-8 MB, which is slow on
// mobile data and over the upload limit. The server re-encodes it again and strips metadata.
async function shrink(file: File, maxSide: number): Promise<Blob> {
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // Let the server try (and explain) if the browser can't decode it.
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // JPEG rather than WebP: Safari can't encode WebP from a canvas.
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  return blob ?? file;
}

export async function uploadPhoto(file: File, kind: "avatar" | "tile"): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) return { ok: false, error: "Choose an image file." };
  const body = new FormData();
  body.set("kind", kind);
  body.set("file", await shrink(file, kind === "avatar" ? 1024 : 1800), "photo.jpg");
  try {
    return await uploadImage(body);
  } catch {
    return { ok: false, error: "The upload didn't go through. Check your connection and try again." };
  }
}
