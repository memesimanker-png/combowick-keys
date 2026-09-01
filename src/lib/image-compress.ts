/**
 * Client-side image compression for thumbnails.
 * Resizes to fit within `maxDim` (default 800px) and re-encodes as JPEG at
 * the given quality. Keeps aspect ratio. Falls back to the original file if
 * compression fails or the result is somehow larger.
 */
export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number; mimeType?: string } = {}
): Promise<File> {
  const maxDim = opts.maxDim ?? 800;
  const quality = opts.quality ?? 0.82;
  const mimeType = opts.mimeType ?? "image/jpeg";

  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), mimeType, quality)
    );
    if (!blob) return file;

    // If "compression" produced a bigger file (rare for tiny inputs), keep original.
    if (blob.size >= file.size && file.type === mimeType) return file;

    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1] || "img";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type: mimeType, lastModified: Date.now() });
  } catch {
    return file;
  }
}
