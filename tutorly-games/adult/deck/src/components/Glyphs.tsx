/**
 * The game's iconography, drawn rather than typed.
 *
 * Every emoji that used to carry meaning in this app has been replaced here. That is
 * not cosmetic taste — an emoji is a *font glyph*, so the mascot, the mode tabs and
 * the rarity badges were being rendered by whatever the operating system happened to
 * have installed. The same build looked like three different games on Windows,
 * Android and iOS, and on a machine with no colour-emoji font the mascot was an empty
 * box. Drawing them means the mascot looks like our mascot everywhere, can be
 * coloured from the current palette, and animates as real geometry.
 *
 * Three layers, on purpose:
 *
 *  1. `Icon` — thin re-exports of Lucide for generic chrome (a mic, a bin, a chevron).
 *     No reason to hand-draw a trash can.
 *  2. `ModeGlyph`, `Mascot`, `StageGlyph`, `LoveMeter`, `StreakFlame` — the game's own
 *     identity, drawn from paths so it belongs to this app and no other.
 *  3. `CrestRing` — the shared hexagonal frame that makes the mode tabs read as one
 *     designed set instead of seven unrelated pictures.
 */

import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BadgeCheck,
  BookOpen,
  Bot,
  Camera,
  Check,
  ChevronUp,
  Clipboard,
  ClipboardCheck,
  Flame,
  Globe,
  GraduationCap,
  Heart,
  Info,
  Layers,
  Lightbulb,
  Loader2,
  Lock,
  MessageCircle,
  Mic,
  Music,
  Newspaper,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Scroll,
  Send,
  Share2,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Timer,
  TreePine,
  TriangleAlert,
  Trophy,
  Type,
  Undo2,
  Upload,
  User,
  Volume2,
  VolumeX,
  Waves,
  X,
  Zap,
} from "lucide-react";

export type GameModeName = "classic" | "xpQuest" | "race" | "speak" | "cardBattle" | "swipe" | "gacha" | "type";

/**
 * Every generic icon in the app, funnelled through one component.
 *
 * Centralising this is what keeps stroke weight uniform: Lucide defaults to
 * `strokeWidth={2}` on a 24 viewBox, which reads heavy next to the display type, so
 * the default here is 1.75 and every call site inherits it. `aria-hidden` is default
 * because these always sit beside a text label; the few genuinely icon-only controls
 * pass `label` so they become named buttons instead of silent ones.
 */
export function Icon({
  as: Glyph,
  size = 16,
  className = "",
  strokeWidth = 1.75,
  label,
}: {
  as: React.ComponentType<{ size?: number | string; strokeWidth?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** When present the icon is a standalone control and carries an accessible name. */
  label?: string;
}) {
  return (
    <>
      <Glyph size={size} strokeWidth={strokeWidth} className={className} aria-hidden={label ? undefined : "true"} />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  );
}

/** Re-exported so call sites do not each import from the package and drift. */
export const UI = {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Verified: BadgeCheck,
  BookOpen,
  Bot,
  Camera,
  Check,
  Clipboard,
  ClipboardCheck,
  Chevron: ChevronUp,
  Flame,
  Globe,
  GraduationCap,
  Heart,
  Info,
  Layers,
  Lightbulb,
  Loader: Loader2,
  Lock,
  Message: MessageCircle,
  Mic,
  Music,
  Newspaper,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Scroll,
  Send,
  Share2,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Timer,
  TreePine,
  Warning: TriangleAlert,
  Trophy,
  Type,
  Rewind: Undo2,
  Upload,
  User,
  Volume: Volume2,
  Mute: VolumeX,
  Waves,
  X,
  Zap,
} as const;

// ─────────────────────────────────────────────────────────────
// Shared crest frame
// ─────────────────────────────────────────────────────────────

/**
 * A flattened hexagon behind an icon.
 *
 * The mode tabs previously showed seven emoji at seven different visual weights —
 * ⚔️ and 💕 occupy wildly different areas of their own glyph boxes — which is why the
 * row never looked aligned. Putting each mark inside one identical frame fixes the
 * alignment for free, and is what makes them read as a set.
 */
function CrestRing({ size, color, filled = false }: { size: number; color: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className="absolute inset-0">
      <path
        d="M20 2.5 34.5 11v18L20 37.5 5.5 29V11z"
        fill={filled ? color : "none"}
        fillOpacity={filled ? 0.16 : 0}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.55}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The mark for a game mode.
 *
 * `cardBattle` and `xpQuest` are deliberately different pictures (a shield vs crossed
 * swords) even though both modes involve fighting: they are different rules, and a
 * learner switching between them needs the tab to be recognisable at a glance.
 */
export function ModeGlyph({ mode, size = 22, color = "currentColor" }: { mode: GameModeName; size?: number; color?: string }) {
  const Mark = {
    classic: Layers,
    xpQuest: Swords,
    race: Timer,
    speak: Mic,
    cardBattle: Shield,
    swipe: Waves,
    gacha: Sparkles,
    type: Type,
  }[mode];

  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <CrestRing size={size} color={color} />
      <Mark size={size * 0.46} strokeWidth={2} style={{ color }} aria-hidden="true" />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// The mascot
// ─────────────────────────────────────────────────────────────

/** Every expression the owl can wear. Mirrors the moods in `MASCOT_REACTIONS`. */
export type Mood = "happy" | "excited" | "proud" | "worried" | "sad" | "love" | "thinking" | "sleeping" | "celebrating";

/**
 * The owl, drawn as paths.
 *
 * This is the character the learner spends the whole session with, so it is real art
 * rather than an emoji: a body, a head, ear tufts, two eyes whose *pupils and lids*
 * change per mood, and a beak that opens when the owl is excited. The mood is carried
 * by geometry — half-lidded eyes read as proud, heart-shaped pupils read as love — so
 * the expression still lands when the whole thing is scaled down to a 28px badge.
 *
 * `currentColor` drives the plumage, so one component serves the blue header badge and
 * the amber level-up card without a variant per theme.
 */
export function Mascot({ mood = "happy", size = 64, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  // Pupil radius and offset, plus lid coverage, are what make the mood legible.
  const eyes = {
    happy: { r: 4.2, dx: 0, dy: 0, lid: 0 },
    excited: { r: 5.2, dx: 0, dy: -0.6, lid: 0 },
    proud: { r: 4.2, dx: 0, dy: 0.4, lid: 0.42 },
    worried: { r: 3.7, dx: 0.5, dy: -0.4, lid: 0 },
    sad: { r: 4, dx: 0, dy: 0.9, lid: 0.18 },
    love: { r: 4.4, dx: 0, dy: 0, lid: 0 },
    thinking: { r: 4.1, dx: 1.6, dy: -0.8, lid: 0.24 },
    sleeping: { r: 4, dx: 0, dy: 0, lid: 1 },
    celebrating: { r: 5.4, dx: 0, dy: -0.9, lid: 0 },
  }[mood];

  const beakOpen = mood === "excited" || mood === "celebrating" || mood === "sad";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Mascot looking ${mood}`}
      style={{ overflow: "visible" }}
    >
      {/* Ear tufts — two hard triangles, the silhouette cue that says "owl". */}
      <path d="M14 15 L20 5 L26 15 Z" fill="currentColor" />
      <path d="M38 15 L44 5 L50 15 Z" fill="currentColor" />

      {/* Body, then head overlapping it. */}
      <ellipse cx="32" cy="45" rx="17" ry="15" fill="currentColor" />
      <circle cx="32" cy="28" r="19" fill="currentColor" />

      {/* Belly plate, in a translucent white so it works over any plumage colour. */}
      <ellipse cx="32" cy="47" rx="10.5" ry="11" fill="#ffffff" fillOpacity="0.16" />

      {/* Wings, tucked. */}
      <path d="M16 42c-2 4-1 9 2 12 1-4 1-8 0-12z" fill="#000000" fillOpacity="0.16" />
      <path d="M48 42c2 4 1 9-2 12-1-4-1-8 0-12z" fill="#000000" fillOpacity="0.16" />

      {/* Eye whites. */}
      <circle cx="24" cy="27" r="9.4" fill="#ffffff" />
      <circle cx="40" cy="27" r="9.4" fill="#ffffff" />

      {mood === "love" ? (
        // Heart pupils: two mirrored arcs and a point, so the shape survives at 20px.
        <>
          <path d="M24 30.5c-3.2-2.2-4.6-3.6-4.6-5.3a2.6 2.6 0 0 1 4.6-1.6 2.6 2.6 0 0 1 4.6 1.6c0 1.7-1.4 3.1-4.6 5.3z" fill="#f43f5e" />
          <path d="M40 30.5c-3.2-2.2-4.6-3.6-4.6-5.3a2.6 2.6 0 0 1 4.6-1.6 2.6 2.6 0 0 1 4.6 1.6c0 1.7-1.4 3.1-4.6 5.3z" fill="#f43f5e" />
        </>
      ) : mood === "sleeping" ? (
        // Closed eyes read better as a stroke than a squashed ellipse.
        <>
          <path d="M17.5 28c3-3 10-3 13 0" stroke="#0b0f1a" strokeWidth="2.1" strokeLinecap="round" fill="none" />
          <path d="M33.5 28c3-3 10-3 13 0" stroke="#0b0f1a" strokeWidth="2.1" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx={24 + eyes.dx} cy={27 + eyes.dy} r={eyes.r} fill="#0b0f1a" />
          <circle cx={40 + eyes.dx} cy={27 + eyes.dy} r={eyes.r} fill="#0b0f1a" />
          {/* Catchlights: the single cheapest trick that makes an eye look alive. */}
          <circle cx={22.4 + eyes.dx} cy={25.2 + eyes.dy} r="1.5" fill="#ffffff" fillOpacity="0.95" />
          <circle cx={38.4 + eyes.dx} cy={25.2 + eyes.dy} r="1.5" fill="#ffffff" fillOpacity="0.95" />
          {mood === "excited" || mood === "celebrating" ? (
            <>
              <circle cx={26.6 + eyes.dx} cy={29.6 + eyes.dy} r="0.9" fill="#ffffff" fillOpacity="0.75" />
              <circle cx={42.6 + eyes.dx} cy={29.6 + eyes.dy} r="0.9" fill="#ffffff" fillOpacity="0.75" />
            </>
          ) : null}
        </>
      )}

      {/* Lids, drawn as the body colour clipped over the eye whites. */}
      {eyes.lid > 0 && mood !== "sleeping" ? (
        <>
          <rect x="14" y="15" width="20" height={18 * eyes.lid} rx="9" fill="currentColor" />
          <rect x="30" y="15" width="20" height={18 * eyes.lid} rx="9" fill="currentColor" />
        </>
      ) : null}

      {/* Brow, angled down for thinking and up for worried. */}
      {mood === "thinking" ? <path d="M31 17.5 41 21" stroke="#0b0f1a" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" /> : null}
      {mood === "worried" ? (
        <>
          <path d="M17 17.5 25 20" stroke="#0b0f1a" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M47 17.5 39 20" stroke="#0b0f1a" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {mood === "sad" ? <path d="M18 16.5c3-2.4 7-2.4 10 0" stroke="#0b0f1a" strokeOpacity="0.5" strokeWidth="1.9" strokeLinecap="round" fill="none" /> : null}

      {/* Beak. Split into two halves so it can hinge open. */}
      <path d="M32 31.5 27.6 36.6 32 38.2z" fill="#f59e0b" />
      <path d="M32 31.5 36.4 36.6 32 38.2z" fill="#d97706" />
      {beakOpen ? <path d="M32 38.2 28.4 41 32 43.4 35.6 41z" fill="#b45309" /> : null}

      {/* Feet. */}
      <path d="M26 58.5v2.6M32 59v2.6M38 58.5v2.6" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Evolution stages
// ─────────────────────────────────────────────────────────────

export type StageName = "hatchling" | "fledgling" | "soaring" | "blazing" | "ascendant" | "mythic";

/**
 * A badge per evolution stage.
 *
 * The six stages were previously six unrelated emoji (an egg, a chick, an eagle, a
 * flame, a bolt, a star) which read as a random collection rather than a ladder. These
 * share a crest and a two-colour scheme, so the progression is legible: the frame
 * fills in and gains a glow as the stage climbs.
 */
export function StageGlyph({ stage, size = 40, className = "" }: { stage: StageName; size?: number; className?: string }) {
  const tier = { hatchling: 0, fledgling: 1, soaring: 2, blazing: 3, ascendant: 4, mythic: 5 }[stage];
  const accent = ["#94a3b8", "#7dd3fc", "#38bdf8", "#fb923c", "#facc15", "#e879f9"][tier];

  const shape = {
    // Egg with a hairline crack.
    hatchling: (
      <>
        <ellipse cx="20" cy="22" rx="9" ry="11.5" fill={accent} fillOpacity="0.9" />
        <path d="M14 20l4 3 3-4 4 4 3-3" stroke="#0b0f1a" strokeOpacity="0.55" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </>
    ),
    // Same egg, but broken open with the chick's head out.
    fledgling: (
      <>
        <path d="M11 24a9 10 0 0 1 18 0v2H11z" fill={accent} fillOpacity="0.9" />
        <circle cx="20" cy="18" r="7" fill={accent} />
        <circle cx="17.4" cy="17" r="1.7" fill="#0b0f1a" />
        <circle cx="22.6" cy="17" r="1.7" fill="#0b0f1a" />
        <path d="M20 20.5 18.2 23 20 24.2 21.8 23z" fill="#f59e0b" />
      </>
    ),
    // Bird with spread wings — the "soaring" beat.
    soaring: (
      <>
        <path d="M20 16c3 0 5 2.6 5 6v6h-10v-6c0-3.4 2-6 5-6z" fill={accent} />
        <path d="M15 20c-6-2-10 0-13 4 5-1 8 0 11 2z" fill={accent} fillOpacity="0.85" />
        <path d="M25 20c6-2 10 0 13 4-5-1-8 0-11 2z" fill={accent} fillOpacity="0.85" />
        <circle cx="18.6" cy="20.4" r="1.6" fill="#0b0f1a" />
        <circle cx="21.4" cy="20.4" r="1.6" fill="#0b0f1a" />
      </>
    ),
    // Flame.
    blazing: (
      <path
        d="M20 8c4 5 9 8.5 9 14.5 0 5-4 9-9 9s-9-4-9-9c0-3 1.6-5.4 3.4-7.6.6 2 1.6 3 2.6 3.4-1-3.6.4-7.4 3-10.3z"
        fill={accent}
      />
    ),
    // Bolt inside a ring.
    ascendant: (
      <>
        <circle cx="20" cy="20" r="13" fill="none" stroke={accent} strokeWidth="1.6" strokeOpacity="0.55" />
        <path d="M22.5 8 13 22h5.4l-1.4 10L27 18h-5.6z" fill={accent} />
      </>
    ),
    // Eight-point starburst.
    mythic: (
      <path
        d="M20 4l3 8.4 8.4-3.4-3.4 8.4L36 20l-8.4 3-3.4 8.4L20 36l-3-8.4L8.6 31l3.4-8.4L4 20l8.4-3L15.8 8.6z"
        fill={accent}
      />
    ),
  }[stage];

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} role="img" aria-label={`${stage} stage`}>
      <defs>
        {/* Only the top three stages glow: the glow has to mean something. */}
        {tier >= 3 ? (
          <radialGradient id={`stage-glow-${stage}`}>
            <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        ) : null}
      </defs>
      {tier >= 3 ? <circle cx="20" cy="20" r="19" fill={`url(#stage-glow-${stage})`} /> : null}
      <CrestRing size={40} color={accent} filled={tier >= 2} />
      {shape}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Meters
// ─────────────────────────────────────────────────────────────

/**
 * The swipe mode's affection meter, as five real hearts.
 *
 * The old version showed one emoji chosen by tier, which told the learner nothing
 * about where they were between tiers. Discrete hearts show the actual position.
 */
export function LoveMeter({ level = 0, size = 14 }: { level?: number; size?: number }) {
  // The engine's tiers run -99 → 4, so a level of 4 is "full" and 0 is neutral.
  const filled = Math.max(0, Math.min(5, level + 1));
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Affection ${filled} of 5`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <svg key={index} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            d="M12 20.4c-5.6-3.8-8-6.2-8-9.1a4.4 4.4 0 0 1 8-2.8 4.4 4.4 0 0 1 8 2.8c0 2.9-2.4 5.3-8 9.1z"
            fill={index < filled ? "#fb7185" : "none"}
            stroke={index < filled ? "#fb7185" : "currentColor"}
            strokeOpacity={index < filled ? 1 : 0.3}
            strokeWidth="1.6"
          />
        </svg>
      ))}
    </span>
  );
}

/**
 * The streak flame, sized by tier.
 *
 * A streak is the one number a learner can lose, so it is worth showing as a shape
 * that visibly grows rather than a number they have to read.
 */
export function StreakFlame({ streak = 0, size = 22 }: { streak?: number; size?: number }) {
  const tier = streak >= 20 ? 5 : streak >= 15 ? 4 : streak >= 10 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0;
  const accent = ["#475569", "#f97316", "#fb923c", "#fbbf24", "#fde047", "#fef08a"][tier];
  const scale = 0.8 + tier * 0.06;

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={`${streak} day streak`} style={{ transform: `scale(${scale})` }}>
      {tier >= 3 ? <circle cx="12" cy="13" r="11" fill={accent} fillOpacity="0.16" /> : null}
      <path
        d="M12 2c2.6 3.2 5.8 5.5 5.8 9.4A5.8 5.8 0 0 1 12 17.2a5.8 5.8 0 0 1-5.8-5.8c0-2 1-3.5 2.2-4.9.4 1.3 1 2 1.7 2.2-.7-2.3.3-4.8 1.9-6.7z"
        fill={tier === 0 ? "none" : accent}
        stroke={tier === 0 ? "currentColor" : "none"}
        strokeOpacity={tier === 0 ? 0.35 : 0}
        strokeWidth="1.6"
      />
    </svg>
  );
}

/**
 * Five pips showing how well one card has been learned (0–100).
 *
 * This is the visual form of `masteryPercent`, and it is the piece that makes the
 * spaced-repetition scheduler visible: a learner can see a word climb from one pip to
 * five over days, which is the only evidence the app has that the method works.
 */
export function MasteryRing({ percent = 0, size = 22, color = "#60a5fa" }: { percent?: number; size?: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  // Round ends need the arc to travel a little past the true value to look complete.
  const offset = circumference * (1 - clamped / 100);

  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <circle cx="12" cy="12" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 12 12)"
          style={{ transition: "stroke-dashoffset 400ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <span className="tnum absolute text-[9px] font-bold" style={{ color }}>
        {clamped}
      </span>
    </span>
  );
}
