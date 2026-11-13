/**
 * Shrink a photo in the browser before uploading it: at most `maxSide` pixels on its longer side, saved as a JPG.
 * Phone photos (often 5–15 MB) come out at a few hundred KB and still look sharp on a resume.
 * Small images, and anything that isn't a PNG, JPG or WebP photo, are returned unchanged.
 */
export async function shrinkImage(file: File, { maxSide = 1600, quality = 0.86, skipUnder = 700 * 1024 } = {}): Promise<File> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return file;
  let bitmap: ImageBitmap;
  try {
    // Honours the photo's EXIF rotation, so phone photos aren't sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // the browser can't read it: let the server decide
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= skipUnder) {
    bitmap.close();
    return file;
  }
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // JPG has no transparency: a transparent PNG gets a white background instead of black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  // Keep the original if shrinking didn't make it smaller (an already-small, well-compressed image).
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}
