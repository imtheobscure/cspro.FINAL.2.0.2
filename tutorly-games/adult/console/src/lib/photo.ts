/**
 * Guest avatars, made small on purpose.
 *
 * A learner joining a room must be able to use their own photo without the room
 * paying for it. A modern phone photo is 3–8 MB; a 128×128 JPEG is 4–9 kB, which
 * is small enough to
 *
 *   · travel over the PeerJS data channel in a single message,
 *   · sit in `localStorage` next to the score board without touching the 5 MB
 *     ceiling, and
 *   · render instantly on a projector.
 *
 * Everything happens in the guest's own browser — the full-size file is never
 * read off the device, never uploaded anywhere, and is dropped as soon as the
 * canvas has drawn it.
 */

const MAX_EDGE = 128;
const JPEG_QUALITY = 0.72;

export interface OptimizedAvatar {
  dataUrl: string;
  /** Approximate decoded size, for the "4 kB" style hint in the UI. */
  bytes: number;
}

/** Turn any image file into a square, centred, 128×128 JPEG data URL. */
export async function optimizeAvatar(file: File, maxEdge = MAX_EDGE, quality = JPEG_QUALITY): Promise<OptimizedAvatar> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");

  const bitmap = await decode(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - side) / 2;
  const sourceY = (bitmap.height - side) / 2;
  const edge = Math.min(maxEdge, side);

  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot resize the photo.");

  // Transparent PNGs become black JPEGs otherwise; avatars sit on dark slate, so
  // fill with a neutral that matches the board.
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, edge, edge);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, sourceX, sourceY, side, side, 0, 0, edge, edge);
  close(bitmap);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  // Release the bitmap memory as soon as we are done with it.
  canvas.width = 0;
  canvas.height = 0;

  if (!dataUrl.startsWith("data:image/jpeg")) throw new Error("Could not encode the photo.");
  return { dataUrl, bytes: estimateBytes(dataUrl) };
}

/** `createImageBitmap` is the fast path; the <img> fallback covers Safari. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("That image could not be read."));
      img.src = url;
    });
    return img;
  } finally {
    // The bitmap has already been drawn by the time this runs, so revoking is safe.
    URL.revokeObjectURL(url);
  }
}

function close(bitmap: ImageBitmap | HTMLImageElement): void {
  if (typeof ImageBitmap !== "undefined" && bitmap instanceof ImageBitmap) bitmap.close();
}

/** Base64 payload length → decoded bytes, near enough for a UI hint. */
export function estimateBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.round((base64.length * 3) / 4) - padding);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A picked file is a photo of the *file*, not the data URL — keep the warning small. */
export function isPlausibleDataUrlAvatar(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/") && value.length < 400_000;
}
