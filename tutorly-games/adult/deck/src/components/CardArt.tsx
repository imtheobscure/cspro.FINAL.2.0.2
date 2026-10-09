/**
 * Card art, drawn entirely as SVG.
 *
 * Two rules decided this file:
 *
 *  1. **Nothing is downloaded.** The app must work with no network, so the frames,
 *     the grain, the foil and every card's unique sigil are all generated in code.
 *     A `feTurbulence` filter gives real paper grain that no image file could match
 *     for size, and a conic gradient gives the foil.
 *
 *  2. **Every card gets its own mark.** A sigil is derived from a hash of the word,
 *     so two learners looking at "Serendipity" see the same crest and the deck never
 *     looks like a template with the text swapped out.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export type Rarity = "common" | "rare" | "epic" | "legendary";

// ─────────────────────────────────────────────────────────────
// Deterministic randomness
// ─────────────────────────────────────────────────────────────

/** FNV-1a. Small, stable, and identical for the same word in every browser. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Seeded PRNG so a card's art never changes between renders or sessions. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A rune-like crest generated from the word itself.
 *
 * The structure is deliberately rotationally symmetric — spokes of varying length
 * around a ring — because symmetric marks read as "designed" while random scribbles
 * read as "noise".
 */
export function RuneSigil({
  seed,
  size = 84,
  className = "",
}: {
  seed: string;
  size?: number;
  className?: string;
}) {
  const paths = useMemo(() => {
    const random = mulberry32(hashString(seed));
    const spokes = 5 + Math.floor(random() * 4); // 5–8
    const marks: { d: string; width: number }[] = [];
    const ringRadius = 26 + random() * 6;
    const maxLength = 34 + random() * 8;

    // Alternate long and short spokes, so the crest has a rhythm.
    for (let i = 0; i < spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2 - Math.PI / 2;
      const long = i % 2 === 0;
      const length = long ? maxLength : maxLength * (0.45 + random() * 0.2);
      const x1 = 50 + Math.cos(angle) * 10;
      const y1 = 50 + Math.sin(angle) * 10;
      const x2 = 50 + Math.cos(angle) * length;
      const y2 = 50 + Math.sin(angle) * length;
      marks.push({ d: `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`, width: long ? 2 : 1.1 });

      // A bead at the end of long spokes.
      if (long) {
        const bx = 50 + Math.cos(angle) * (length - 3);
        const by = 50 + Math.sin(angle) * (length - 3);
        const r = 1.2 + random() * 0.9;
        marks.push({ d: `M${(bx - r).toFixed(1)} ${by.toFixed(1)} a${r} ${r} 0 1 0 ${(r * 2).toFixed(1)} 0 a${r} ${r} 0 1 0 ${(-r * 2).toFixed(1)} 0`, width: 0 });
      }
    }
    return { marks, ringRadius, coreRadius: 6 + random() * 3 };
  }, [seed]);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r={paths.ringRadius} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="50" cy="50" r={paths.ringRadius - 4} fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      {paths.marks.map((mark, i) => (
        <path key={i} d={mark.d} fill="currentColor" stroke="currentColor" strokeWidth={mark.width} strokeLinecap="round" />
      ))}
      <circle cx="50" cy="50" r={paths.coreRadius} fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.85" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Rarity glyphs — SVG stand-ins for the emoji badges
// ─────────────────────────────────────────────────────────────

/** Simple, legible crest per tier. Replaces the emoji so every OS renders the same. */
export function RarityGlyph({ rarity, size = 14, className = "" }: { rarity: Rarity; size?: number; className?: string }) {
  const shape = {
    common: <circle cx="12" cy="12" r="7" />,
    rare: <path d="M12 3l7 9-7 9-7-9z" />,
    epic: <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />,
    legendary: <path d="M3 8l4 3 5-6 5 6 4-3-2 12H5z" />,
  }[rarity];

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false" fill="currentColor">
      {shape}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Card frame
// ─────────────────────────────────────────────────────────────

/**
 * The frame drawn over a card face.
 *
 * Sits absolutely over the face and takes no pointer events, so the card's own
 * click and drag behaviour is untouched. `feTurbulence` is doing real work here: it
 * is what stops a flat gradient looking like a CSS box.
 *
 * `ornament` (0–3, from `RARITY_CONFIG`) is what makes the tiers read as a ladder
 * rather than four colour swaps: each step adds another inset hairline and another
 * pair of corner filigrees, so a legendary looks *manufactured* next to a common.
 */
export function CardFrame({
  rarity,
  seed,
  showSigil = true,
  ornament = 0,
}: {
  rarity: Rarity;
  seed: string;
  showSigil?: boolean;
  ornament?: 0 | 1 | 2 | 3;
}) {
  // Unique ids per card: two cards on screen at once must not share filter defs,
  // or the second card's grain would reference the first card's colours.
  const uid = useMemo(() => `cf-${hashString(seed + rarity).toString(36)}`, [seed, rarity]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {showSigil && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.07]">
          <RuneSigil seed={seed} size={260} className="text-white" />
        </div>
      )}

      {/* Grain, sheen and the brushed-metal pass that only the top tiers get. */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={hashString(seed) % 100} result="noise" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"
            />
          </filter>
          <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
          </linearGradient>
          {ornament >= 2 ? (
            /*
             * Foil. A non-uniform turbulence displaces the highlight, which is what
             * makes a surface read as brushed metal rather than a printed gradient —
             * the reflection wanders instead of running straight down.
             */
            <filter id={`${uid}-foil`} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02 0.4" numOctaves="3" seed={hashString(seed) % 90} result="streaks" />
              <feDisplacementMap in="SourceGraphic" in2="streaks" scale="14" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          ) : null}
        </defs>
        <rect width="100%" height="100%" fill={`url(#${uid}-sheen)`} />
        <rect width="100%" height="100%" filter={`url(#${uid}-grain)`} opacity="0.05" />
        {ornament >= 2 ? (
          <rect width="100%" height="100%" filter={`url(#${uid}-foil)`} opacity={ornament === 3 ? 0.14 : 0.09} fill="#ffffff" />
        ) : null}
      </svg>

      {/* Holographic band, reserved for the top tier. */}
      {ornament === 3 ? <span aria-hidden="true" className="holo absolute inset-0 rounded-[inherit] opacity-40" /> : null}

      {/* Inner hairlines — one more per tier. */}
      <span className="absolute inset-[7px] rounded-[inherit] border border-white/10" />
      {Array.from({ length: ornament }).map((_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="absolute rounded-[inherit] border border-white/[0.07]"
          style={{ inset: 7 + (index + 1) * 4 }}
        />
      ))}

      {/* Corner brackets, at two sizes once the frame is elaborate. */}
      {[
        "left-2 top-2 border-l border-t",
        "right-2 top-2 border-r border-t",
        "left-2 bottom-2 border-l border-b",
        "right-2 bottom-2 border-r border-b",
      ].map((position) => (
        <span key={position} className={`absolute h-5 w-5 rounded-tl-[3px] border-white/35 ${position}`} />
      ))}
      {ornament >= 3
        ? [
            "left-1 top-1 border-l border-t",
            "right-1 top-1 border-r border-t",
            "left-1 bottom-1 border-l border-b",
            "right-1 bottom-1 border-r border-b",
          ].map((position) => (
            <span key={position} className={`absolute h-2 w-2 border-amber-300/50 ${position}`} aria-hidden="true" />
          ))
        : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Auras, bursts and cinematics
// ─────────────────────────────────────────────────────────────

/**
 * Orbiting motes around a high-rarity card.
 *
 * Each mote is a separate element on its own orbit with its own duration, which is what
 * stops the ring looking like a rotating picture. Rendered only from `rare` upward so
 * the aura is a reward rather than wallpaper, and disabled under reduced motion by the
 * `.orbit` rule in the stylesheet.
 */
export function ParticleAura({ rarity, count }: { rarity: Rarity; count?: number }) {
  const reduced = usePrefersReducedMotion();
  // Tier drives both how many motes there are and how far out they travel.
  const tier = { common: 0, rare: 1, epic: 2, legendary: 3 }[rarity];
  const motes = count ?? [0, 7, 11, 16][tier];
  if (reduced || !motes) return null;

  const colors = { common: ["#cbd5e1"], rare: ["#7dd3fc", "#38bdf8"], epic: ["#d8b4fe", "#a855f7"], legendary: ["#fcd34d", "#fbbf24", "#ffffff"] }[rarity];

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: motes }).map((_, index) => {
        const radius = 44 + (index % 4) * 16;
        const duration = 7 + (index % 5) * 2.4;
        const size = 2 + (index % 3);
        return (
          <span
            key={index}
            className="orbit absolute rounded-full"
            style={
              {
                width: size,
                height: size,
                background: colors[index % colors.length],
                boxShadow: `0 0 ${size * 3}px ${colors[index % colors.length]}`,
                animationDelay: `${-index * 0.9}s`,
                "--orbit-radius": `${radius}px`,
                "--orbit-duration": `${duration}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
  );
}

/**
 * The expanding ring behind a pull or a level-up.
 *
 * One element, one animation, and it stops existing afterwards (`onAnimationEnd` via
 * the parent's key change), so it never accumulates in the DOM across a long session.
 */
export function CinematicBurst({ color = "#f59e0b", size = 320 }: { color?: string; size?: number }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;
  return (
    <span
      aria-hidden="true"
      className="burst-out pointer-events-none absolute left-1/2 top-1/2 rounded-full"
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        background: `radial-gradient(circle, ${color}66 0%, ${color}22 45%, transparent 70%)`,
      }}
    />
  );
}

/**
 * Slow drifting motes for the backdrop behind the stage.
 *
 * Uses a CSS custom property per mote for its own travel and timing, so one keyframe
 * drives an arbitrary number of them without JavaScript per frame.
 */
export function DriftField({ count = 18, className = "" }: { count?: number; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const motes = useMemo(
    () =>
      Array.from({ length: count }).map((_, index) => {
        const random = mulberry32(hashString(`mote-${index}`));
        return {
          left: random() * 100,
          top: 40 + random() * 60,
          size: 1.5 + random() * 3,
          duration: 9 + random() * 9,
          delay: random() * -12,
          drift: (random() - 0.5) * 90,
          opacity: 0.16 + random() * 0.34,
        };
      }),
    [count]
  );
  if (reduced) return null;

  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {motes.map((mote, index) => (
        <span
          key={index}
          /* Themed, not white: a field of white motes on white paper is a blank stage. */
          className="drift absolute rounded-full bg-[var(--stage-star)]"
          style={
            {
              left: `${mote.left}%`,
              top: `${mote.top}%`,
              width: mote.size,
              height: mote.size,
              animationDuration: `${mote.duration}s`,
              animationDelay: `${mote.delay}s`,
              "--drift-x": `${mote.drift}px`,
              "--drift-duration": `${mote.duration}s`,
              "--mote-opacity": mote.opacity,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Motion preferences
// ─────────────────────────────────────────────────────────────

/** Honours the OS setting, and is read once because it cannot change mid-render. */
export function usePrefersReducedMotion(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
}

// ─────────────────────────────────────────────────────────────
// 3D tilt
// ─────────────────────────────────────────────────────────────

/**
 * Pointer-tracked tilt with a shine that follows the cursor.
 *
 * This is the cheap 80% of "3D": no WebGL, no new dependency, and it still reads as
 * a physical object because the highlight moves across the surface as the card turns
 * — a static gradient looks printed on, a moving one looks reflective.
 *
 * Disabled wholesale under `prefers-reduced-motion`, and on touch devices, where a
 * tilt cannot be driven meaningfully and would only fight the vertical scroll.
 */
export function Tilt3D({
  children,
  className = "",
  intensity = 14,
  shine = true,
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  shine?: boolean;
  disabled?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 260, damping: 22, mass: 0.4 });
  const springY = useSpring(rotateY, { stiffness: 260, damping: 22, mass: 0.4 });
  const [shineAt, setShineAt] = useState({ x: 50, y: 50, on: false });
  const ref = useRef<HTMLDivElement | null>(null);

  const off = disabled || reduced;

  const handleMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (off || event.pointerType === "touch") return;
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const px = (event.clientX - box.left) / box.width; // 0–1
      const py = (event.clientY - box.top) / box.height;
      rotateY.set((px - 0.5) * intensity * 2);
      rotateX.set((0.5 - py) * intensity * 2);
      if (shine) setShineAt({ x: px * 100, y: py * 100, on: true });
    },
    [off, intensity, rotateX, rotateY, shine]
  );

  const handleLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    setShineAt((current) => ({ ...current, on: false }));
  }, [rotateX, rotateY]);

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`relative ${className}`}
      style={{
        rotateX: off ? 0 : springX,
        rotateY: off ? 0 : springY,
        transformStyle: "preserve-3d",
        transformPerspective: 1200,
      }}
    >
      {children}
      {shine && !off && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: shineAt.on ? 1 : 0,
            background: `radial-gradient(320px circle at ${shineAt.x}% ${shineAt.y}%, rgba(255,255,255,0.16), rgba(255,255,255,0.04) 40%, transparent 65%)`,
          }}
        />
      )}
    </motion.div>
  );
}
