export interface Pt { x: number; y: number }

export type Primitive = 'circle' | 'rect' | 'triangle' | 'line' | 'curve';

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function bbox(pts: Pt[]) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

export function pathLength(pts: Pt[]) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += dist(pts[i - 1], pts[i]);
  return d;
}

export function area(pts: Pt[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a / 2);
}

/** Ramer–Douglas–Peucker simplification (used for corner counting). */
export function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  let idx = 0, max = 0;
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const den = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i].x - dx * pts[i].y + b.x * a.y - b.y * a.x) / den;
    if (d > max) { max = d; idx = i; }
  }
  if (max > eps) {
    const l = simplify(pts.slice(0, idx + 1), eps);
    const r = simplify(pts.slice(idx), eps);
    return [...l.slice(0, -1), ...r];
  }
  return [a, b];
}

export function corners(pts: Pt[], eps: number) {
  const s = simplify(pts, eps);
  let n = 0;
  for (let i = 1; i < s.length - 1; i++) {
    const a = s[i - 1], b = s[i], c = s[i + 1];
    const v1 = Math.atan2(b.y - a.y, b.x - a.x);
    const v2 = Math.atan2(c.y - b.y, c.x - b.x);
    let d = Math.abs(v2 - v1);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d > 0.62) n++;
  }
  return n;
}

/** Real geometric classification of a freehand stroke. */
export function classify(pts: Pt[]): { kind: Primitive; box: ReturnType<typeof bbox> } {
  const box = bbox(pts);
  const diag = Math.hypot(box.w, box.h) || 1;
  const closed = dist(pts[0], pts[pts.length - 1]) < diag * 0.28;
  const len = pathLength(pts);
  const straightness = dist(pts[0], pts[pts.length - 1]) / (len || 1);

  if (!closed && straightness > 0.86) return { kind: 'line', box };
  if (!closed) {
    const c = corners(pts, diag * 0.045);
    return { kind: c >= 2 ? 'curve' : straightness > 0.6 ? 'line' : 'curve', box };
  }
  const A = area(pts);
  const circ = (4 * Math.PI * A) / Math.max(1, len * len);
  const c = corners(pts, diag * 0.06);
  if (circ > 0.68 && c <= 2) return { kind: 'circle', box };
  if (c === 2 || c === 3) return { kind: 'triangle', box };
  return { kind: 'rect', box };
}

/** Sketch-Sense lexicon: what primitives a drawing of X usually contains. */
export interface Sig { circle: number; rect: number; triangle: number; line: number; curve: number; figure?: number }
export const LEXICON: { word: string; sig: Sig; hint: string }[] = [
  { word: 'house', sig: { circle: 0, rect: 2, triangle: 1, line: 1, curve: 0 }, hint: 'box plus a roof' },
  { word: 'sun', sig: { circle: 1, rect: 0, triangle: 0, line: 6, curve: 0 }, hint: 'circle with rays' },
  { word: 'car', sig: { circle: 2, rect: 2, triangle: 0, line: 1, curve: 1 }, hint: 'body plus two wheels' },
  { word: 'tree', sig: { circle: 1, rect: 1, triangle: 0, line: 0, curve: 1 }, hint: 'trunk plus canopy' },
  { word: 'boat', sig: { circle: 0, rect: 0, triangle: 1, line: 2, curve: 1 }, hint: 'hull plus sail' },
  { word: 'clock', sig: { circle: 2, rect: 0, triangle: 0, line: 2, curve: 0 }, hint: 'circle with hands' },
  { word: 'cup', sig: { circle: 1, rect: 1, triangle: 0, line: 1, curve: 1 }, hint: 'container plus handle' },
  { word: 'star', sig: { circle: 0, rect: 0, triangle: 2, line: 5, curve: 0 }, hint: 'spiky outline' },
  { word: 'mountain', sig: { circle: 0, rect: 0, triangle: 2, line: 1, curve: 0 }, hint: 'peaks' },
  { word: 'flower', sig: { circle: 5, rect: 0, triangle: 0, line: 1, curve: 2 }, hint: 'petals round a centre' },
  { word: 'fish', sig: { circle: 1, rect: 0, triangle: 1, line: 0, curve: 2 }, hint: 'body plus tail fin' },
  { word: 'bicycle', sig: { circle: 2, rect: 0, triangle: 1, line: 4, curve: 0 }, hint: 'two wheels and a frame' },
  { word: 'book', sig: { circle: 0, rect: 3, triangle: 0, line: 3, curve: 0 }, hint: 'rectangles and lines' },
  { word: 'phone', sig: { circle: 1, rect: 2, triangle: 0, line: 1, curve: 0 }, hint: 'tall rectangle' },
  { word: 'face', sig: { circle: 3, rect: 0, triangle: 0, line: 1, curve: 2 }, hint: 'circle with features' },
  { word: 'person running', sig: { circle: 1, rect: 0, triangle: 0, line: 5, curve: 1, figure: 1 }, hint: 'a posed figure' },
  { word: 'ladder', sig: { circle: 0, rect: 1, triangle: 0, line: 6, curve: 0 }, hint: 'two rails, many rungs' },
  { word: 'key', sig: { circle: 1, rect: 1, triangle: 0, line: 3, curve: 0 }, hint: 'ring plus teeth' },
  { word: 'umbrella', sig: { circle: 0, rect: 0, triangle: 0, line: 2, curve: 3 }, hint: 'dome plus handle' },
  { word: 'cloud', sig: { circle: 3, rect: 0, triangle: 0, line: 0, curve: 3 }, hint: 'bumpy outline' },
  { word: 'train', sig: { circle: 3, rect: 4, triangle: 0, line: 2, curve: 0 }, hint: 'boxes on wheels' },
  { word: 'chair', sig: { circle: 0, rect: 1, triangle: 0, line: 5, curve: 0 }, hint: 'seat plus legs' },
  { word: 'door', sig: { circle: 1, rect: 2, triangle: 0, line: 1, curve: 0 }, hint: 'tall rectangle with a knob' },
  { word: 'bridge', sig: { circle: 0, rect: 1, triangle: 0, line: 4, curve: 2 }, hint: 'arcs and a deck' },
];

export function sketchSense(counts: Sig, deck: string[]) {
  const total = counts.circle + counts.rect + counts.triangle + counts.line + counts.curve;
  if (total === 0) return [] as { word: string; score: number; hint: string }[];
  const norm = (s: Sig) => {
    const t = s.circle + s.rect + s.triangle + s.line + s.curve || 1;
    return [s.circle / t, s.rect / t, s.triangle / t, s.line / t, s.curve / t];
  };
  const a = norm(counts);
  const pool = LEXICON.filter((l) => !deck.length || deck.some((d) => d.toLowerCase().includes(l.word.split(' ')[0])) || true);
  const scored = pool.map((l) => {
    const b = norm(l.sig);
    let d = 0;
    for (let i = 0; i < 5; i++) d += (a[i] - b[i]) ** 2;
    return { word: l.word, hint: l.hint, raw: Math.exp(-d * 9) };
  });
  const sum = scored.reduce((s, x) => s + x.raw, 0) || 1;
  return scored
    .map((s) => ({ word: s.word, hint: s.hint, score: s.raw / sum }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 4);
}
