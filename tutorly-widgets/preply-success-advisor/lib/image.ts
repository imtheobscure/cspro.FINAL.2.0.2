/**
 * Avatars, kept small on purpose.
 *
 * The mentor pastes a screenshot straight from the chat with the tutor. A raw
 * clipboard PNG is often 1–3 MB, and this whole app is one JSON file that syncs to
 * disk — so every image is redrawn onto a square canvas at 192 px and exported as
 * JPEG. That is roughly 8–15 kB per tutor, which keeps a 60-tutor backup in the
 * hundreds of kilobytes instead of the hundreds of megabytes.
 */

const TARGET_SIZE = 192;
const QUALITY = 0.82;

export interface ProcessedImage {
  dataUrl: string;
  bytes: number;
}

/**
 * A clipboard paste event's first image, if it has one.
 *
 * Typed structurally so both the DOM event and React's synthetic wrapper fit — the
 * only thing this needs is `clipboardData`.
 */
export function imageFromPaste(event: { clipboardData: DataTransfer | null }): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;
  for (const item of Array.from(items)) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

export function imageFromDataTransfer(transfer: DataTransfer | null): File | null {
  if (!transfer) return null;
  for (const file of Array.from(transfer.files)) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

/** Square-crop to the middle, resize, and encode small. */
export async function toMinimalDataUrl(file: File | Blob): Promise<ProcessedImage> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(bitmapUrl);
    const canvas = document.createElement("canvas");
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");

    // Fill with white so a transparent PNG does not turn black in JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

    const side = Math.min(image.width, image.height);
    const sx = (image.width - side) / 2;
    const sy = (image.height - side) / 2;
    ctx.drawImage(image, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);

    const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
    return { dataUrl, bytes: Math.round((dataUrl.length - "data:image/jpeg;base64,".length) * 0.75) };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be read."));
    image.src = src;
  });
}

export function readableBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Approximate size of the whole state once serialized, for the storage row. */
export function stateSizeLabel(json: string): string {
  return readableBytes(new Blob([json]).size);
}
