import React from "react";

// ─────────────────────────────────────────────────────────────
// Board geometry — must stay in sync with BOARD_COLS / BOARD_ROWS /
// CELL_ASPECT in flashcards.tsx (kept here so the SVG overlay can do its own
// maths without importing the game file).
// ─────────────────────────────────────────────────────────────
export const BOARD_GEOM = { cols: 10, rows: 5, aspect: 1.4 };

export type CellArtKind =
  | "start"
  | "finish"
  | "snake"
  | "ladder"
  | "oasis"
  | "death"
  | "jumpscare"
  | "decision";

export interface BoardLink {
  from: number;
  to: number;
  kind: "snake" | "ladder";
}

export interface TokenInfo {
  id: string;
  name: string;
  avatar: string;
  color: string;
  position: number;
}

export interface TrailDot {
  id: number;
  n: number;
}

/**
 * Boustrophedon track: square 1 sits in the bottom-right corner and the
 * highest number in the top-left, exactly like the CSS grid in flashcards.tsx.
 * Returns the square's centre in *cell units* (1 unit = one cell width), which
 * is what the SVG overlay's viewBox uses.
 */
export function cellCenter(
  num: number,
  cols = BOARD_GEOM.cols,
  rows = BOARD_GEOM.rows,
  aspect = BOARD_GEOM.aspect,
) {
  const idx = Math.max(1, num) - 1;
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  const rev = (rows - 1 - r) % 2 === 1;
  const displayCol = rev ? cols - 1 - c : c;
  const displayRow = rows - 1 - r;
  return { x: displayCol + 0.5, y: (displayRow + 0.5) * aspect, row: displayRow, col: displayCol };
}

// ─────────────────────────────────────────────────────────────
// Small maths helpers for the drawn links
// ─────────────────────────────────────────────────────────────
const ptsToPath = (pts: { x: number; y: number }[]) =>
  pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(" ");

// ── Snake proportions ────────────────────────────────────────
// One snake = head + body + tail in a single silhouette. The half-width profile
// below is what makes it read as a real animal instead of a tube: a wide blunt
// head, a pinched neck, a body that swells through the middle and a tail that
// tapers to nothing.
const SNAKE_STEPS = 96;
const SNAKE_WOBBLE = 0.22;
const snakeWaves = (len: number) => Math.max(1.7, Math.min(3.4, len * 0.85));
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
const snakeHW = (t: number) => {
  if (t <= 0.05) return lerpN(0.07, 0.112, t / 0.05); // blunt nose into the head
  if (t <= 0.19) return lerpN(0.112, 0.052, (t - 0.05) / 0.14); // neck pinch
  if (t <= 0.56) return lerpN(0.052, 0.086, (t - 0.19) / 0.37); // body swell
  return lerpN(0.086, 0.007, (t - 0.56) / 0.44); // tail taper
};

/** Undulating centreline at a moment in time — the slither. */
const slither = (
  head: { x: number; y: number },
  tail: { x: number; y: number },
  phase: number,
  waves: number,
) => {
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= SNAKE_STEPS; i++) {
    const t = i / SNAKE_STEPS;
    const off =
      Math.sin(t * Math.PI * waves + phase) * SNAKE_WOBBLE * Math.sin(Math.PI * Math.pow(t, 0.72));
    pts.push({ x: head.x + dx * t + nx * off, y: head.y + dy * t + ny * off });
  }
  return pts;
};

/** Filled ribbon along a centreline whose half-width varies from head to tail. */
const ribbon = (pts: { x: number; y: number }[], halfWidth: (t: number) => number) => {
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const hw = halfWidth(i / (pts.length - 1));
    left.push({ x: pts[i].x - ty * hw, y: pts[i].y + tx * hw });
    right.push({ x: pts[i].x + ty * hw, y: pts[i].y - tx * hw });
  }
  const poly = [...left, ...right.reverse()];
  return `M${poly.map(p => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(" L")} Z`;
};

interface BuiltLink {
  kind: "snake" | "ladder";
  from: number;
  to: number;
  head: { x: number; y: number };
  tail: { x: number; y: number };
  center: string;
  length: number;
  body?: string;
  rails?: { x1: number; y1: number; x2: number; y2: number }[];
  rungs?: { x1: number; y1: number; x2: number; y2: number }[];
  headAngle: number;
  /** Snake only: start of the centreline (where the head sits) and its waves. */
  headPt?: { x: number; y: number };
  tailPt?: { x: number; y: number };
  waves?: number;
}

function buildLink(
  link: BoardLink,
  cols = BOARD_GEOM.cols,
  rows = BOARD_GEOM.rows,
  aspect = BOARD_GEOM.aspect,
): BuiltLink {
  // Snakes are drawn head-first from the *higher* square down to the tail,
  // ladders from the lower square up to the higher one.
  const from = link.kind === "snake" ? Math.max(link.from, link.to) : Math.min(link.from, link.to);
  const to = link.kind === "snake" ? Math.min(link.from, link.to) : Math.max(link.from, link.to);
  const head = cellCenter(from, cols, rows, aspect);
  const tail = cellCenter(to, cols, rows, aspect);
  const length = Math.hypot(tail.x - head.x, tail.y - head.y);
  const headAngle = (Math.atan2(tail.y - head.y, tail.x - head.x) * 180) / Math.PI;

  if (link.kind === "snake") {
    // ONE continuous animal: the head is the start of the same silhouette that
    // becomes the body and the tail, drawn from the higher square down to the
    // lower one. The tile art has no head of its own, so there is exactly one
    // head per snake (two of them was the "detached body" bug).
    const dx = tail.x - head.x;
    const dy = tail.y - head.y;
    const len = Math.hypot(dx, dy) || 1;
    const inset = Math.min(0.34, len * 0.16);
    const start = { x: head.x + (dx / len) * inset, y: head.y + (dy / len) * inset };
    const end = { x: tail.x - (dx / len) * Math.min(0.3, len * 0.14), y: tail.y - (dy / len) * Math.min(0.3, len * 0.14) };
    const waves = snakeWaves(Math.hypot(end.x - start.x, end.y - start.y));
    const pts = slither(start, end, 0, waves);
    const ang = (Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180) / Math.PI;
    return {
      kind: "snake",
      from,
      to,
      head,
      tail,
      center: ptsToPath(pts),
      length,
      body: ribbon(pts, snakeHW),
      headAngle: ang,
      headPt: start,
      tailPt: end,
      waves,
    };
  }

  // Ladder: two rails offset perpendicular to the run, plus rungs along it.
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const off = 0.15;
  const inside = 0.13; // keep the rails inside the two squares they join
  const a: { x: number; y: number } = { x: head.x + (dx / len) * inside, y: head.y + (dy / len) * inside };
  const b: { x: number; y: number } = { x: tail.x - (dx / len) * inside, y: tail.y - (dy / len) * inside };
  const rails = [
    { x1: a.x - nx * off, y1: a.y - ny * off, x2: b.x - nx * off, y2: b.y - ny * off },
    { x1: a.x + nx * off, y1: a.y + ny * off, x2: b.x + nx * off, y2: b.y + ny * off },
  ];
  const rungCount = Math.max(3, Math.round(len / 0.34));
  const rungs: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 1; i <= rungCount - 1; i++) {
    const t = i / rungCount;
    const cx = a.x + (b.x - a.x) * t;
    const cy = a.y + (b.y - a.y) * t;
    rungs.push({ x1: cx - nx * off, y1: cy - ny * off, x2: cx + nx * off, y2: cy + ny * off });
  }
  return {
    kind: "ladder",
    from,
    to,
    head,
    tail,
    center: ptsToPath([a, b]),
    length,
    rails,
    rungs,
    headAngle,
  };
}

// ─────────────────────────────────────────────────────────────
// Tile art — drawn, not emoji
// ─────────────────────────────────────────────────────────────
const SVG = {
  viewBox: "0 0 100 100",
  width: "100%",
  height: "100%",
  preserveAspectRatio: "xMidYMid meet",
} as const;

export const TileArt: React.FC<{ kind: CellArtKind; glyph?: string }> = ({ kind, glyph }) => {
  const uid = React.useId().replace(/:/g, "");
  const id = (n: string) => `${uid}-${n}`;
  const url = (n: string) => `url(#${id(n)})`;

  // Snake and ladder squares carry NO art of their own: the drawn snake (with its
  // one realistic head) and the drawn ladder run across the board and already say
  // what the square is. Anything inside the tile only duplicated them.
  if (kind === "snake" || kind === "ladder") return null;

  if (kind === "oasis") {
    return (
      <svg {...SVG}>
        <defs>
          <linearGradient id={id("water")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
        <circle cx="74" cy="23" r="16" fill="#fde68a" opacity=".28" />
        <circle cx="74" cy="23" r="10" fill="#fde68a" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={74 + Math.cos(a) * 13}
              y1={23 + Math.sin(a) * 13}
              x2={74 + Math.cos(a) * 18}
              y2={23 + Math.sin(a) * 18}
              stroke="#fcd34d"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          );
        })}
        <ellipse cx="50" cy="77" rx="37" ry="12" fill={url("water")} />
        <path d="M20 75 q8 -4 15 0 t15 0 t15 0 t15 0" stroke="#ecfeff" strokeWidth="1.8" fill="none" opacity=".75" />
        <path d="M52 76 C50 60 45 50 40 41" stroke="#92400e" strokeWidth="6.5" fill="none" strokeLinecap="round" />
        <path d="M40 41 C31 32 22 31 15 36" stroke="#16a34a" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M40 41 C33 28 28 22 20 21" stroke="#22c55e" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M40 41 C45 27 52 22 61 22" stroke="#22c55e" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M40 41 C50 32 60 33 68 38" stroke="#16a34a" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M40 41 C45 34 52 36 58 46" stroke="#15803d" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="40" cy="40" r="4" fill="#78350f" />
      </svg>
    );
  }

  if (kind === "death") {
    return (
      <svg {...SVG}>
        <defs>
          <radialGradient id={id("pit")} cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#111827" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
        </defs>
        <path d="M0 100 L16 26 L36 100 Z" fill="#0f172a" opacity=".9" />
        <path d="M100 100 L84 26 L64 100 Z" fill="#0f172a" opacity=".9" />
        <path d="M30 100 L40 46 L60 46 L70 100 Z" fill={url("pit")} />
        <path d="M40 46 L50 96 L60 46" fill="#1e293b" opacity=".9" />
        <path d="M16 26 L30 100 M84 26 L70 100" stroke="#334155" strokeWidth="2" fill="none" />
        {/* skull */}
        <rect x="31" y="10" width="38" height="35" rx="16" fill="#f8fafc" />
        <rect x="41" y="42" width="18" height="12" rx="4" fill="#e2e8f0" />
        <circle cx="41" cy="27" r="6.4" fill="#0b1220" />
        <circle cx="59" cy="27" r="6.4" fill="#0b1220" />
        <circle cx="43" cy="25" r="1.6" fill="#64748b" />
        <circle cx="61" cy="25" r="1.6" fill="#64748b" />
        <path d="M50 34 l4 6 h-8 z" fill="#0b1220" />
        <path d="M44 46 v6 M50 46 v6 M56 46 v6" stroke="#0b1220" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M20 70 l6 -4 M26 78 l6 -4" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        <path d="M80 70 l-6 -4 M74 78 l-6 -4" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "jumpscare") {
    return (
      <svg {...SVG}>
        <defs>
          <linearGradient id={id("ghost")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5f3ff" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>
        </defs>
        <path d="M50 8 C31 8 22 22 22 40 V84 l3 -6 3 6 3 -6 3 6 3 -6 3 6 3 -6 3 6 3 -6 3 6 3 -6 3 6 3 -6 3 6 3 -6 3 6 3 -6 3 6 3 -6 3 6 V40 C78 22 69 8 50 8 Z" fill={url("ghost")} opacity=".95" />
        <ellipse cx="38" cy="34" rx="7" ry="9" fill="#1e1b4b" />
        <ellipse cx="62" cy="34" rx="7" ry="9" fill="#1e1b4b" />
        <circle cx="40" cy="31" r="2" fill="#a78bfa" />
        <circle cx="64" cy="31" r="2" fill="#a78bfa" />
        <ellipse cx="50" cy="55" rx="9" ry="11" fill="#1e1b4b" />
        <path d="M45 50 v9 M50 48 v12 M55 50 v9" stroke="#c4b5fd" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M14 12 L20 30 L15 32 L22 50 L8 30 L14 28 Z" fill="#facc15" stroke="#b45309" strokeWidth="1.4" />
        <path d="M86 12 L92 30 L87 32 L94 50 L80 30 L86 28 Z" fill="#facc15" stroke="#b45309" strokeWidth="1.4" />
      </svg>
    );
  }

  if (kind === "start") {
    return (
      <svg {...SVG}>
        <defs>
          <linearGradient id={id("hull")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id={id("fin")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>
        <path d="M50 6 C62 20 67 38 67 55 L67 68 L33 68 L33 55 C33 38 38 20 50 6 Z" fill={url("hull")} />
        <path d="M33 48 L20 72 L33 68 Z" fill={url("fin")} />
        <path d="M67 48 L80 72 L67 68 Z" fill={url("fin")} />
        <circle cx="50" cy="42" r="9.5" fill="#bae6fd" stroke="#0369a1" strokeWidth="2.6" />
        <circle cx="46" cy="38" r="2.6" fill="#e0f2fe" />
        <path d="M43 68 h14 l-3 9 h-8 z" fill="#475569" />
        <path d="M46 79 q4 15 8 0 q-4 8 -8 0 Z" fill="#fbbf24" />
        <circle cx="22" cy="20" r="2.4" fill="#fde68a" />
        <circle cx="80" cy="16" r="1.8" fill="#fde68a" />
        <circle cx="86" cy="30" r="1.4" fill="#fef3c7" />
      </svg>
    );
  }

  if (kind === "decision") {
    return (
      <svg {...SVG}>
        <defs>
          <linearGradient id={id("paper")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
          <linearGradient id={id("roll")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <rect x="17" y="18" width="66" height="64" rx="7" fill={url("paper")} stroke="#b45309" strokeWidth="3" />
        <path d="M28 34 h44 M28 45 h44 M28 56 h30" stroke="#b45309" strokeWidth="3" strokeLinecap="round" opacity=".35" />
        <rect x="9" y="14" width="13" height="72" rx="6.5" fill={url("roll")} />
        <rect x="78" y="14" width="13" height="72" rx="6.5" fill={url("roll")} />
        <circle cx="50" cy="62" r="19" fill="#fffbeb" stroke="#d97706" strokeWidth="2.5" />
        <text x="50" y="75" textAnchor="middle" fontSize="24">{glyph ?? "❓"}</text>
      </svg>
    );
  }

  // finish — temple with a golden star
  return (
    <svg {...SVG}>
      <defs>
        <linearGradient id={id("stone")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1={50 + Math.cos(rad) * 26}
            y1={28 + Math.sin(rad) * 26}
            x2={50 + Math.cos(rad) * 36}
            y2={28 + Math.sin(rad) * 36}
            stroke="#fde68a"
            strokeWidth="3"
            strokeLinecap="round"
            opacity=".8"
          />
        );
      })}
      <path d="M50 8 l4.5 9.5 10.5 1.4 -7.6 7.3 1.9 10.4 -9.3 -4.9 -9.3 4.9 1.9 -10.4 -7.6 -7.3 10.5 -1.4 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
      <rect x="20" y="74" width="60" height="14" rx="3" fill={url("stone")} stroke="#92400e" strokeWidth="2.5" />
      <rect x="28" y="60" width="44" height="16" rx="3" fill={url("stone")} stroke="#92400e" strokeWidth="2.5" />
      <rect x="37" y="48" width="26" height="14" rx="3" fill={url("stone")} stroke="#92400e" strokeWidth="2.5" />
      <path d="M50 40 L58 48 L42 48 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="2.5" />
      <path d="M45 74 v14 h10 v-14 a5 5 0 0 0 -10 0 Z" fill="#451a03" opacity=".75" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Drawn links (snake trails + ladders) over the board
// ─────────────────────────────────────────────────────────────
export const BoardLinks: React.FC<{
  links: BoardLink[];
  dark: boolean;
  activeFrom?: number | null;
  trail?: TrailDot[];
  cols?: number;
  rows?: number;
  aspect?: number;
  /** Slither the snakes. Off = a clean still board (accessibility / battery). */
  animate?: boolean;
  /** Square whose snake is currently biting: its head lunges at the token. */
  bitingFrom?: number | null;
}> = ({ links, dark, activeFrom = null, trail = [], cols = BOARD_GEOM.cols, rows = BOARD_GEOM.rows, aspect = BOARD_GEOM.aspect, animate = true, bitingFrom = null }) => {
  const built = React.useMemo(
    () => links.map(l => buildLink(l, cols, rows, aspect)),
    [links, cols, rows, aspect],
  );
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  // The slither: each frame re-derives the centreline a little further along
  // its wave and pushes the new geometry straight into the DOM. No React
  // re-render, no CSS transform on a stretched box — the body really moves.
  React.useEffect(() => {
    const svg = svgRef.current;
    // `animate` is the player's own setting (seeded from prefers-reduced-motion),
    // so it is the final word here.
    if (!svg || !animate || typeof window === "undefined") return;

    const animals: Array<{
      head: { x: number; y: number };
      tail: { x: number; y: number };
      waves: number;
      /** unit vector from the tail out past the head — the strike direction */
      nose: { x: number; y: number };
      /** true while this snake is the one biting */
      biting: boolean;
      body: SVGPathElement | null;
      stripe: SVGPathElement | null;
      scale: SVGPathElement | null;
      headG: SVGGElement | null;
      glow: SVGPathElement | null;
      flow: SVGPathElement | null;
    }> = [];
    svg.querySelectorAll<SVGGElement>("[data-snake]").forEach((g) => {
      const b = built[Number(g.dataset.snake)];
      if (!b?.headPt || !b.tailPt || !b.waves) return;
      const dx = b.headPt.x - b.tailPt.x;
      const dy = b.headPt.y - b.tailPt.y;
      const dl = Math.hypot(dx, dy) || 1;
      animals.push({
        head: b.headPt,
        tail: b.tailPt,
        waves: b.waves,
        nose: { x: dx / dl, y: dy / dl },
        biting: bitingFrom !== null && b.from === bitingFrom,
        body: g.querySelector("[data-part=body]"),
        stripe: g.querySelector("[data-part=stripe]"),
        scale: g.querySelector("[data-part=scale]"),
        headG: g.querySelector("[data-part=head]"),
        glow: g.querySelector("[data-part=glow]"),
        flow: g.querySelector("[data-part=flow]"),
      });
    });
    if (!animals.length) return;

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const seconds = (now - t0) / 1000;
      animals.forEach((a, i) => {
        // A bite: the whole animal jabs out along its own axis (the tail stays
        // put, so the body stretches instead of the head coming loose) and holds
        // the lunge for a beat before pulling back.
        let reach = 0;
        if (a.biting) {
          const jab = Math.min(1, seconds / 0.14);
          const hold = seconds < 0.55 ? 1 : Math.max(0, 1 - (seconds - 0.55) / 0.5);
          reach = 0.34 * jab * hold;
        }
        const head = reach ? { x: a.head.x + a.nose.x * reach, y: a.head.y + a.nose.y * reach } : a.head;
        const pts = slither(head, a.tail, seconds * 1.55 + i * 0.85, a.waves);
        const d = ribbon(pts, snakeHW);
        const line = ptsToPath(pts);
        a.body?.setAttribute("d", d);
        a.stripe?.setAttribute("d", line);
        a.scale?.setAttribute("d", line);
        a.glow?.setAttribute("d", line);
        a.flow?.setAttribute("d", line);
        if (a.headG) {
          const ang = (Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180) / Math.PI;
          const sway = Math.sin(seconds * 2.1 + i * 1.3) * 5.5;
          a.headG.setAttribute("transform", `translate(${pts[0].x.toFixed(3)} ${pts[0].y.toFixed(3)}) rotate(${(ang + sway).toFixed(2)})`);
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [built, animate, bitingFrom]);

  return (
    <svg
      ref={svgRef}
      className="board-links"
      viewBox={`0 0 ${cols} ${rows * aspect}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20 }}
    >
      <defs>
        <linearGradient id="bl-snake" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="10" y2="7">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="bl-ladder" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="10" y2="0">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="bl-glow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="10" y2="7">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {built.map((b, i) => {
        const active = activeFrom !== null && b.from === activeFrom;
        const isSnake = b.kind === "snake";
        const biting = isSnake && bitingFrom !== null && b.from === bitingFrom;
        const hx = b.headPt?.x ?? b.head.x;
        const hy = b.headPt?.y ?? b.head.y;
        return (
          <g
            key={`${b.kind}-${b.from}-${b.to}-${i}`}
            opacity={active || biting ? 1 : dark ? 0.92 : 0.96}
            data-snake={isSnake ? i : undefined}
          >
            {active && (
              <path
                data-part="glow"
                d={b.center}
                fill="none"
                stroke="url(#bl-glow)"
                strokeWidth={isSnake ? 0.3 : 0.42}
                strokeLinecap="round"
                opacity=".55"
                filter="blur(0.02px)"
              />
            )}

            {isSnake && b.body && (
              <>
                {/* body + head in one silhouette */}
                <path data-part="body" d={b.body} fill="url(#bl-snake)" stroke="#2b0707" strokeWidth="0.016" strokeLinejoin="round" />
                {/* dorsal blotches and a pale belly stripe */}
                <path data-part="scale" d={b.center} fill="none" stroke="#450a0a" strokeWidth="0.05" strokeDasharray="0.006 0.075" opacity=".5" strokeLinecap="round" />
                <path data-part="stripe" d={b.center} fill="none" stroke="#fecaca" strokeWidth="0.022" opacity=".22" strokeLinecap="round" />
                {/* the head: part of the same animal, laid over the silhouette */}
                <g
                  data-part="head"
                  transform={`translate(${hx.toFixed(3)} ${hy.toFixed(3)}) rotate(${b.headAngle.toFixed(2)})`}
                >
                  <ellipse cx="-0.02" cy="0" rx="0.132" ry="0.112" fill="url(#bl-snake)" stroke="#2b0707" strokeWidth="0.015" />
                  {/* brow ridge + mouth line */}
                  <path d="M-0.115 -0.075 Q-0.02 -0.128 0.085 -0.06" fill="none" stroke="#450a0a" strokeWidth="0.016" opacity=".75" />
                  <path d="M-0.115 0.075 Q-0.02 0.128 0.085 0.06" fill="none" stroke="#450a0a" strokeWidth="0.016" opacity=".75" />
                  <path d="M-0.128 0 Q-0.02 0.055 0.09 0.012" fill="none" stroke="#2b0707" strokeWidth="0.012" opacity=".9" />
                  {/* eyes: yellow with slit pupils, angled forward like a viper */}
                  <ellipse cx="-0.005" cy="-0.052" rx="0.042" ry="0.038" fill="#fbbf24" stroke="#2b0707" strokeWidth="0.011" />
                  <ellipse cx="-0.005" cy="0.052" rx="0.042" ry="0.038" fill="#fbbf24" stroke="#2b0707" strokeWidth="0.011" />
                  <ellipse cx="-0.012" cy="-0.052" rx="0.008" ry="0.028" fill="#160404" />
                  <ellipse cx="-0.012" cy="0.052" rx="0.008" ry="0.028" fill="#160404" />
                  <circle cx="-0.022" cy="-0.062" r="0.007" fill="#fff7ed" opacity=".85" />
                  <circle cx="-0.022" cy="0.042" r="0.007" fill="#fff7ed" opacity=".85" />
                  {/* nostrils */}
                  <ellipse cx="-0.108" cy="-0.02" rx="0.009" ry="0.012" fill="#160404" opacity=".9" />
                  <ellipse cx="-0.108" cy="0.02" rx="0.009" ry="0.012" fill="#160404" opacity=".9" />
                  {/* forked tongue, flicking */}
                  <path
                    className="snake-tongue"
                    d="M-0.125 0 L-0.255 0 M-0.255 0 L-0.34 -0.07 M-0.255 0 L-0.34 0.07"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="0.023"
                    strokeLinecap="round"
                  />
                </g>
                {/* tail tip: a small rattle so the far end reads as an end */}
                <circle cx={b.tailPt?.x ?? b.tail.x} cy={b.tailPt?.y ?? b.tail.y} r="0.038" fill="#450a0a" />
                <circle cx={b.tailPt?.x ?? b.tail.x} cy={b.tailPt?.y ?? b.tail.y} r="0.022" fill="#fbbf24" opacity=".8" />
              </>
            )}

            {!isSnake && (
              <>
                <path d={b.center} fill="none" stroke="rgba(0,0,0,0.32)" strokeWidth="0.42" strokeLinecap="round" />
                {(b.rails ?? []).map((r, k) => (
                  <g key={k}>
                    <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#78350f" strokeWidth="0.12" strokeLinecap="round" />
                    <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="url(#bl-ladder)" strokeWidth="0.085" strokeLinecap="round" />
                  </g>
                ))}
                {(b.rungs ?? []).map((r, k) => (
                  <g key={`r${k}`}>
                    <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#78350f" strokeWidth="0.095" strokeLinecap="round" />
                    <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="url(#bl-ladder)" strokeWidth="0.065" strokeLinecap="round" />
                  </g>
                ))}
              </>
            )}

            {active && (
              <path
                data-part="flow"
                d={b.center}
                fill="none"
                stroke="#fff7ed"
                strokeWidth="0.05"
                strokeLinecap="round"
                strokeDasharray="0.22 0.3"
                className="link-flow"
              />
            )}
          </g>
        );
      })}

      {/* visited-square trail */}
      {trail.map(t => {
        const p = cellCenter(t.n, cols, rows, aspect);
        return (
          <g key={t.id} className="trail-dot">
            <circle cx={p.x} cy={p.y} r={0.14} fill="#22d3ee" opacity=".28" />
            <circle cx={p.x} cy={p.y} r={0.075} fill="#e0f7ff" />
          </g>
        );
      })}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Tokens — their own layer so they always sit above the drawn links
// ─────────────────────────────────────────────────────────────
export const BoardTokens: React.FC<{
  players: TokenInfo[];
  activeId?: string | null;
  movingId?: string | null;
  /** Player who just got bitten: the token shakes and shows the hit. */
  bitten?: { id: string; amount: number; nonce: number } | null;
  cols?: number;
  rows?: number;
  aspect?: number;
}> = ({ players, activeId = null, movingId = null, bitten = null, cols = BOARD_GEOM.cols, rows = BOARD_GEOM.rows, aspect = BOARD_GEOM.aspect }) => {
  const groups = React.useMemo(() => {
    const m = new Map<number, TokenInfo[]>();
    players.forEach(p => {
      const arr = m.get(p.position) ?? [];
      arr.push(p);
      m.set(p.position, arr);
    });
    return m;
  }, [players]);

  return (
    <div className="board-tokens" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30 }}>
      {players.map(p => {
        const group = groups.get(p.position) ?? [p];
        const i = Math.max(0, group.findIndex(x => x.id === p.id));
        const spread = (i - (group.length - 1) / 2) * 0.62;
        const c = cellCenter(p.position, cols, rows, aspect);
        const active = p.id === activeId;
        const moving = p.id === movingId;
        const isBitten = bitten?.id === p.id;
        return (
          <div
            key={p.id}
            className={`board-token ${active ? "token-active" : ""} ${moving ? "token-moving" : ""} ${isBitten ? "token-bitten" : ""}`}
            style={{
              left: `${(c.x / cols) * 100}%`,
              top: `${(c.y / (rows * aspect)) * 100}%`,
              ["--spread" as string]: `${spread}`,
              background: p.color,
            }}
            title={p.name}
          >
            <span className="board-token-face">{p.avatar}</span>
            {active && <span className="board-token-halo" />}
            {isBitten && (
              <span key={bitten.nonce} className="bite-penalty">
                −{bitten.amount} 🎭
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
