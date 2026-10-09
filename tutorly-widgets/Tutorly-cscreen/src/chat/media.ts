import type { ChatAttachment, ChatAttachmentKind } from "../state/types";
import { uid } from "../state/store";

/**
 * Everything that turns a File / Blob into something the chat can render.
 *
 * The rules here exist because the classroom runs in an ordinary browser during
 * a lesson: an image must not be 8MB of phone camera, a voice note must not
 * silently fill the localStorage quota, and a video the tutor dropped in must
 * still play — even though its blob URL cannot survive a reload.
 */

export const IMAGE_MAX_EDGE = 1600;
export const IMAGE_TARGET_BYTES = 420 * 1024;
/** Media we keep as a data URL (survives reload + crosses windows). */
export const INLINE_LIMIT = 160 * 1024;
/**
 * Voice notes get a larger budget than other media.
 *
 * They are the most valuable thing in this chat — a spoken answer is the lesson
 * — and a 15-second note runs to a few hundred KB. Keeping up to ~480KB means a
 * normal answer survives a reload; anything longer stays session-only and still
 * keeps its transcript, which is what search and read-aloud actually use.
 */
export const INLINE_LIMIT_VOICE = 480 * 1024;

export function formatBytes(n?: number): string {
  if (!n || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(sec?: number): string {
  const s = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function kindFromMime(mime = "", name = ""): ChatAttachmentKind {
  const m = mime.toLowerCase();
  const n = name.toLowerCase();
  if (m.startsWith("image/gif") || n.endsWith(".gif")) return "gif";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("audio/") || m === "application/ogg") return "audio";
  if (m.startsWith("video/")) return "video";
  return "file";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = url;
  });
}

/**
 * Shrink a picture to something a lesson can carry. Animated GIFs are left
 * untouched (a canvas would flatten them to one frame) and only re-inlined when
 * they are already small, because a GIF has no lossy re-encode.
 */
export async function prepareImage(file: File | Blob, name = "photo.png"): Promise<ChatAttachment> {
  const isGif = file.type === "image/gif" || /\.gif$/i.test(name);
  const rawUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(rawUrl);
    const maxEdge = Math.max(img.width, img.height);
    const scale = Math.min(1, IMAGE_MAX_EDGE / (maxEdge || 1));

    if (isGif) {
      const small = file.size <= INLINE_LIMIT;
      return {
        id: uid("att_"),
        kind: "gif",
        url: small ? await blobToDataUrl(file) : rawUrl,
        mime: file.type || "image/gif",
        name,
        sizeBytes: file.size,
        width: img.width,
        height: img.height,
        sessionOnly: !small,
      };
    }

    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, w, h);

    let quality = 0.86;
    let blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", quality));
    while (blob && blob.size > IMAGE_TARGET_BYTES && quality > 0.5) {
      quality -= 0.12;
      blob = await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", quality));
    }
    if (!blob) throw new Error("encode failed");

    const inline = blob.size <= INLINE_LIMIT;
    return {
      id: uid("att_"),
      kind: "image",
      url: inline ? await blobToDataUrl(blob) : rawUrl,
      mime: "image/jpeg",
      name: name.replace(/\.[a-z0-9]+$/i, "") + ".jpg",
      sizeBytes: blob.size,
      width: w,
      height: h,
      sessionOnly: !inline,
    };
  } catch {
    // Not decodable as an image (or no canvas): hand back the raw file.
    const inline = file.size <= INLINE_LIMIT;
    return {
      id: uid("att_"),
      kind: isGif ? "gif" : "image",
      url: inline ? await blobToDataUrl(file) : rawUrl,
      mime: file.type || "application/octet-stream",
      name,
      sizeBytes: file.size,
      sessionOnly: !inline,
    };
  } finally {
    URL.revokeObjectURL(rawUrl);
  }
}

/** Real waveform bars, sampled from the decoded audio. Falls back to a flat line. */
export async function waveformFromBlob(blob: Blob, bars = 44): Promise<number[]> {
  try {
    const buf = await blob.arrayBuffer();
    const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const audio = await new Promise<AudioBuffer>((resolve, reject) => {
      const p = ctx.decodeAudioData(buf.slice(0), resolve, reject);
      if (p && typeof (p as any).then === "function") (p as Promise<AudioBuffer>).then(resolve).catch(reject);
    });
    const data = audio.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / bars));
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      let peak = 0;
      const start = i * step;
      for (let j = 0; j < step; j += 8) peak = Math.max(peak, Math.abs(data[start + j] || 0));
      out.push(Math.min(1, Math.round(peak * 100) / 100));
    }
    const max = Math.max(...out, 0.01);
    ctx.close().catch(() => {});
    return out.map((v) => Math.max(0.06, v / max));
  } catch {
    return Array.from({ length: bars }, (_, i) => 0.25 + 0.5 * Math.abs(Math.sin(i / 3)));
  }
}

/** Media metadata the browser can report without any library. */
export async function probeMediaDuration(url: string, kind: "audio" | "video"): Promise<{ durationSec?: number; width?: number; height?: number; thumb?: string }> {
  const el = document.createElement(kind);
  el.preload = "metadata";
  el.src = url;
  const meta = await new Promise<{ durationSec?: number; width?: number; height?: number }>((resolve) => {
    const done = (v: { durationSec?: number; width?: number; height?: number }) => resolve(v);
    el.onloadedmetadata = () =>
      done({
        durationSec: Number.isFinite(el.duration) ? el.duration : undefined,
        width: kind === "video" ? (el as HTMLVideoElement).videoWidth : undefined,
        height: kind === "video" ? (el as HTMLVideoElement).videoHeight : undefined,
      });
    el.onerror = () => done({});
    setTimeout(() => done({}), 4000);
  });
  let thumb: string | undefined;
  if (kind === "video" && meta.width && meta.height) {
    thumb = await grabVideoFrame(el.src, meta.width, meta.height);
  }
  return { ...meta, thumb };
}

/** A poster frame, so a video attachment shows a picture instead of a black box. */
async function grabVideoFrame(url: string, w: number, h: number): Promise<string | undefined> {
  try {
    const v = document.createElement("video");
    v.src = url;
    v.muted = true;
    await new Promise<void>((resolve, reject) => {
      v.onloadeddata = () => resolve();
      v.onerror = () => reject(new Error("video decode failed"));
      setTimeout(() => resolve(), 4000);
    });
    v.currentTime = Math.min(0.4, (v.duration || 1) / 4);
    await new Promise<void>((resolve) => {
      v.onseeked = () => resolve();
      setTimeout(() => resolve(), 1500);
    });
    const scale = Math.min(1, 640 / Math.max(w, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d")?.drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}

/** The one entry point: any dropped/picked file becomes an attachment. */
export async function attachmentFromFile(file: File): Promise<ChatAttachment> {
  const kind = kindFromMime(file.type, file.name);
  if (kind === "image" || kind === "gif") return prepareImage(file, file.name);

  const blobUrl = URL.createObjectURL(file);
  if (kind === "audio" || kind === "video") {
    const meta = await probeMediaDuration(blobUrl, kind);
    const waveform = kind === "audio" ? await waveformFromBlob(file) : undefined;
    const inline = file.size <= (kind === "audio" ? INLINE_LIMIT_VOICE : INLINE_LIMIT);
    return {
      id: uid("att_"),
      kind,
      url: inline ? await blobToDataUrl(file) : blobUrl,
      mime: file.type,
      name: file.name,
      sizeBytes: file.size,
      durationSec: meta.durationSec,
      width: meta.width,
      height: meta.height,
      thumb: meta.thumb,
      waveform,
      sessionOnly: !inline,
    };
  }

  const inline = file.size <= INLINE_LIMIT;
  return {
    id: uid("att_"),
    kind: "file",
    url: inline ? await blobToDataUrl(file) : blobUrl,
    mime: file.type || "application/octet-stream",
    name: file.name,
    sizeBytes: file.size,
    sessionOnly: !inline,
  };
}

/** Read an image out of the clipboard, if the browser will let us. */
export async function imageFromClipboard(): Promise<File | null> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (type) {
        const blob = await item.getType(type);
        return new File([blob], `pasted.${type.split("/")[1] || "png"}`, { type });
      }
    }
  } catch {}
  return null;
}
