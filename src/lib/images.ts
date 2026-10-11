import "server-only";
import sharp from "sharp";

export type ImageKind = "avatar" | "tile";

export const MAX_UPLOAD_BYTES = 2.5 * 1024 * 1024;

// Re-encodes every upload as WebP. That fixes phone-camera rotation, caps the size, and drops
// all metadata (EXIF, including GPS location) because sharp only keeps it when asked to.
export async function prepareImage(input: ArrayBuffer, kind: ImageKind): Promise<Uint8Array> {
  const image = sharp(Buffer.from(input), { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
  const resized =
    kind === "avatar"
      ? image.resize(512, 512, { fit: "cover", position: "attention" })
      : image.resize(1400, 1400, { fit: "inside", withoutEnlargement: true });
  return new Uint8Array(await resized.webp({ quality: 82 }).toBuffer());
}
