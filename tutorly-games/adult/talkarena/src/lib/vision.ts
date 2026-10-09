import type { Sig } from './geometry';

export interface Blob {
  area: number;
  perim: number;
  w: number;
  h: number;
  fill: number;
  circ: number;
  aspect: number;
  kind: keyof Sig;
}

export interface FrameStats {
  coverage: number;
  blobs: Blob[];
  sig: Sig;
}

/** Grab a small greyscale frame from a video element. */
export function grab(video: HTMLVideoElement, cvs: HTMLCanvasElement): Uint8ClampedArray | null {
  if (!video.videoWidth) return null;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, cvs.width, cvs.height);
  return ctx.getImageData(0, 0, cvs.width, cvs.height).data;
}

/**
 * Background subtraction: anything that appeared since the tutor calibrated
 * (a drawing held up, marks on a whiteboard, a hand-drawn sketch) becomes "ink".
 */
export function mask(cur: Uint8ClampedArray, bg: Uint8ClampedArray, w: number, h: number, thresh = 34) {
  const m = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < m.length; i++, p += 4) {
    const d = Math.abs(cur[p] - bg[p]) + Math.abs(cur[p + 1] - bg[p + 1]) + Math.abs(cur[p + 2] - bg[p + 2]);
    m[i] = d > thresh * 3 ? 1 : 0;
  }
  // 1 pass of erosion then dilation (opening) to kill camera noise
  const er = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      er[i] = m[i] && m[i - 1] && m[i + 1] && m[i - w] && m[i + w] ? 1 : 0;
    }
  const di = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      di[i] = er[i] || er[i - 1] || er[i + 1] || er[i - w] || er[i + w] ? 1 : 0;
    }
  return di;
}

/** Connected components + per-blob shape descriptors. */
export function analyse(m: Uint8Array, w: number, h: number): FrameStats {
  const seen = new Uint8Array(w * h);
  const blobs: Blob[] = [];
  let ink = 0;
  const stack: number[] = [];
  for (let i = 0; i < m.length; i++) {
    if (m[i]) ink++;
    if (!m[i] || seen[i]) continue;
    stack.length = 0;
    stack.push(i);
    seen[i] = 1;
    let area = 0, perim = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      area++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const n = [p - 1, p + 1, p - w, p + w];
      let edge = false;
      for (const q of n) {
        if (q < 0 || q >= m.length) { edge = true; continue; }
        if (!m[q]) { edge = true; continue; }
        if (!seen[q]) { seen[q] = 1; stack.push(q); }
      }
      if (edge) perim++;
    }
    if (area < 22) continue;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const fill = area / (bw * bh);
    const circ = (4 * Math.PI * area) / Math.max(1, perim * perim);
    const aspect = Math.max(bw, bh) / Math.max(1, Math.min(bw, bh));
    let kind: keyof Sig = 'curve';
    if (aspect > 4.2 && fill < 0.5) kind = 'line';
    else if (circ > 0.55 && fill > 0.62) kind = 'circle';
    else if (fill > 0.78) kind = 'rect';
    else if (fill > 0.42 && fill <= 0.78) kind = 'triangle';
    blobs.push({ area, perim, w: bw, h: bh, fill, circ, aspect, kind });
  }
  blobs.sort((a, b) => b.area - a.area);
  const sig: Sig = { circle: 0, rect: 0, triangle: 0, line: 0, curve: 0 };
  blobs.slice(0, 12).forEach((b) => { sig[b.kind] = (sig[b.kind] ?? 0) + 1; });
  return { coverage: ink / (w * h), blobs, sig };
}

/** Paint the ink mask into a preview canvas so the tutor can see what the AI sees. */
export function paintMask(m: Uint8Array, w: number, h: number, out: HTMLCanvasElement) {
  const ctx = out.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < m.length; i++) {
    const v = m[i] ? 255 : 15;
    img.data[i * 4] = m[i] ? 79 : 15;
    img.data[i * 4 + 1] = m[i] ? 70 : 23;
    img.data[i * 4 + 2] = m[i] ? 229 : 42;
    img.data[i * 4 + 3] = v;
  }
  ctx.putImageData(img, 0, 0);
}
