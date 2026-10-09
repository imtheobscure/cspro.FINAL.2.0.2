/*
 * The app's iconography, drawn rather than typed.
 *
 * Every emoji that carried meaning here has been replaced — nineteen elements, including all
 * twelve tab labels and the streak flame. That is not a cosmetic preference. An emoji is a
 * *font glyph*: it is rendered by whatever the operating system happens to have installed, so
 * the same build looked like three different apps on Windows, Android and iOS, the twelve tab
 * marks arrived at twelve different optical weights in a row that is supposed to read as one
 * set, and on a machine without a colour-emoji font every one of them was an empty box.
 *
 * The split follows the same rule as the sibling flashcard app:
 *
 *  - **Drawn here**: anything that carries meaning in *this* app — the twelve section marks,
 *    the streak flame, the difficulty tiers, the mastery ring, the logo. These are paths, they
 *    inherit `currentColor`, and they are drawn on a shared 24-unit grid inside one crest so
 *    they align with each other.
 *  - **`Icon`**: generic chrome — a close cross, a chevron, a speaker. Lucide through one
 *    wrapper, so stroke weight cannot drift one component at a time.
 *
 * There is no icon font and no sprite sheet: at this size that would cost a network request
 * and buy nothing, and a single-file build that works offline should stay that way.
 */
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clipboard,
  Clock,
  Copy,
  Equal,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Moon,
  RotateCcw,
  Share2,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Shared crest frame
// ─────────────────────────────────────────────────────────────

/**
 * The crest every section mark is drawn inside.
 *
 * A rounded square with one corner cut, so the twelve marks read as a family even though the
 * pictures inside them are unrelated. The `accent` fill is opt-in: the tab bar wants the crest
 * outlined in the section's colour, the active state wants it filled.
 */
function Crest({ accent, weight = 1.6, children }: { accent: string; weight?: number; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M4.6 3.2h10.2l4.6 4.6v13a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 20.8V4.8a1.6 1.6 0 0 1 1.6-1.6Z"
        stroke={accent}
        strokeWidth={weight}
        strokeLinejoin="round"
        opacity="0.55"
      />
      {children}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// The twelve section marks
// ─────────────────────────────────────────────────────────────

/**
 * Visual — a photograph.
 *
 * A horizon line and a sun inside a frame, not a picture of a landscape: at 22px the detail
 * of a real scene collapses into noise, and the silhouette is what communicates.
 */
function MarkVisual({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <rect x="6.4" y="8.2" width="11.2" height="8.4" rx="1.4" stroke={accent} strokeWidth="1.7" />
      <circle cx="9.6" cy="11.2" r="1.15" fill={accent} />
      <path d="M6.8 16.2l3.2-2.9 2.3 2 2.2-1.9 2.8 2.8" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Crest>
  );
}

/** Define — two pages of an open book, with a rule for the entry itself. */
function MarkDefine({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <path d="M5.4 7.4c2.2-.9 4.4-.9 6.6.4 2.2-1.3 4.4-1.3 6.6-.4v9.2c-2.2-.9-4.4-.9-6.6.4-2.2-1.3-4.4-1.3-6.6-.4V7.4Z" stroke={accent} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 7.8v9.2" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.6 10.6h2.6M13.8 10.6h2.6" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
    </Crest>
  );
}

/**
 * Lingua — a globe crossed by a speech tick.
 *
 * Deliberately the same globe as Culture but *with* the tick: the two sections are genuinely
 * different (one translates the word, one explains where it came from) and a learner scans
 * this row by shape, so they must not be the same picture.
 */
function MarkBilingual({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <circle cx="11.2" cy="12" r="4.9" stroke={accent} strokeWidth="1.7" />
      <path d="M6.3 12h9.8M11.2 7.1c1.4 1.4 2.1 3.1 2.1 4.9s-.7 3.5-2.1 4.9c-1.4-1.4-2.1-3.1-2.1-4.9s.7-3.5 2.1-4.9Z" stroke={accent} strokeWidth="1.4" />
      <path d="M15.4 15.6h5.2l-1.5 1.8h-3.7v-1.8Z" fill={accent} />
    </Crest>
  );
}

/** Do It — a bolt, for the challenge the learner has to actually perform. */
function MarkChallenge({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <path d="M13.6 5.6l-5 7.5h3.5l-1.1 5.3 5-7.6h-3.5l1.1-5.2Z" stroke={accent} strokeWidth="1.7" strokeLinejoin="round" fill={accent} fillOpacity="0.16" />
    </Crest>
  );
}

/** Truth or Dare — a die, showing three pips rather than one so it reads as a die at any size. */
function MarkTruthDare({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <rect x="6" y="6.6" width="12" height="12" rx="2.6" stroke={accent} strokeWidth="1.7" />
      <circle cx="9.4" cy="10" r="1.15" fill={accent} />
      <circle cx="12" cy="12.6" r="1.15" fill={accent} />
      <circle cx="14.6" cy="15.2" r="1.15" fill={accent} />
    </Crest>
  );
}

/** Would You Rather — one road that forks, which is the shape of the question. */
function MarkWouldYouRather({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <path d="M12 17.4v-4.6" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 12.8c0-2.2-1.8-2.6-3.4-3.4M12 12.8c0-2.2 1.8-2.6 3.4-3.4" stroke={accent} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M7 8.2h3.2M13.8 8.2H17" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
    </Crest>
  );
}

/** Usage — a checklist, because this section shows how the word is actually used. */
function MarkUsage({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <path d="M7 8.6l1.5 1.5L11 7.6" stroke={accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 14.4l1.5 1.5 2.5-2.5" stroke={accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 9h4.4M13 15h3.2" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
    </Crest>
  );
}

/**
 * Register — a gauge, from slang to formal.
 *
 * The section is a five-stop slider, so the mark is a dial with a needle: a shape that says
 * "this word sits somewhere on a scale" rather than "this word is a mask".
 */
function MarkRegister({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <path d="M6.6 15.6a5.6 5.6 0 0 1 11 0" stroke={accent} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M12 15.4l3-3.4" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.3" fill={accent} />
    </Crest>
  );
}

/** Culture — a globe with meridians and no speech tick. See `MarkBilingual`. */
function MarkCulture({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <circle cx="12" cy="12" r="5.6" stroke={accent} strokeWidth="1.7" />
      <path d="M6.4 12h11.2" stroke={accent} strokeWidth="1.4" />
      <path d="M12 6.4c1.6 1.6 2.5 3.5 2.5 5.6s-.9 4-2.5 5.6c-1.6-1.6-2.5-3.5-2.5-5.6s.9-4 2.5-5.6Z" stroke={accent} strokeWidth="1.4" />
    </Crest>
  );
}

/** Screen — a clapperboard, for where the word turns up in film and television. */
function MarkMovie({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <rect x="6.2" y="10.4" width="11.6" height="7.4" rx="1.4" stroke={accent} strokeWidth="1.7" />
      <path d="M6.6 10.2l1-3 11.2 2.2-.9 2.2" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <path d="M7.4 7.6l1.9 2.1M10.6 8.2l1.9 2.1M13.8 8.9l1.9 2.1" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
    </Crest>
  );
}

/** Song — a quaver with a beam, because this section carries the word in music. */
function MarkSong({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <circle cx="9.2" cy="16.2" r="2.3" stroke={accent} strokeWidth="1.7" fill={accent} fillOpacity="0.16" />
      <circle cx="15.6" cy="14.4" r="2.3" stroke={accent} strokeWidth="1.7" fill={accent} fillOpacity="0.16" />
      <path d="M11.5 16.2V8.4l6.4-1.6v7.6" stroke={accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Crest>
  );
}

/** Joke — a smile, drawn as geometry rather than a yellow circle glyph. */
function MarkJoke({ accent }: { accent: string }) {
  return (
    <Crest accent={accent}>
      <circle cx="12" cy="12.4" r="5.6" stroke={accent} strokeWidth="1.7" />
      <path d="M9.4 14.2a3.3 3.3 0 0 0 5.2 0" stroke={accent} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M9.9 10.2v.9M14.1 10.2v.9" stroke={accent} strokeWidth="2" strokeLinecap="round" />
    </Crest>
  );
}

/** The tab ids this app renders, kept in step with `TABS`. */
export type SectionId =
  | "media"
  | "definition"
  | "bilingual"
  | "challenge"
  | "truthdare"
  | "wyr"
  | "usage"
  | "register"
  | "cultural"
  | "movie"
  | "song"
  | "joke";

const MARKS: Record<SectionId, (props: { accent: string }) => React.ReactElement> = {
  media: MarkVisual,
  definition: MarkDefine,
  bilingual: MarkBilingual,
  challenge: MarkChallenge,
  truthdare: MarkTruthDare,
  wyr: MarkWouldYouRather,
  usage: MarkUsage,
  register: MarkRegister,
  cultural: MarkCulture,
  movie: MarkMovie,
  song: MarkSong,
  joke: MarkJoke,
};

/** One section mark, at the crest's own aspect. */
export function SectionGlyph({ id, size = 22, accent = "currentColor" }: { id: SectionId; size?: number; accent?: string }) {
  const Mark = MARKS[id] ?? MarkDefine;
  return (
    <span style={{ display: "inline-block", width: size, height: size, flex: "none" }} className="[&>svg]:block">
      <Mark accent={accent} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Progress marks
// ─────────────────────────────────────────────────────────────

/**
 * A real flame, not 🔥.
 *
 * The old one animated a font glyph with `streak-fire`, which on Windows rendered as a
 * flat orange vector while on macOS it was a glossy illustration — the same 3-day streak
 * looked like two different achievements.
 */
export function StreakFlame({ streak = 0, size = 22 }: { streak?: number; size?: number }) {
  const hot = streak >= 3;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" className={hot ? "animate-streak-fire" : undefined} style={{ transformOrigin: "50% 80%" }}>
      <path
        d="M12 2.6c.6 3.1-.4 4.6-1.9 6.1C8.4 10.4 7 11.9 7 14.4a5 5 0 0 0 10 0c0-2-1-3.4-2.2-4.7-.4 1-1.1 1.6-1.9 1.9.6-2.6.3-6-.9-9Z"
        fill={hot ? "#f97316" : "#fb923c"}
        fillOpacity="0.22"
        stroke={hot ? "#ea580c" : "#fb923c"}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 18.6a2.4 2.4 0 0 0 2.4-2.4c0-1.3-1-2.1-1.7-3.1-.5.9-1 1.3-1.7 1.9-.6.5-1.4.9-1.4 1.9A2.4 2.4 0 0 0 12 18.6Z" fill={hot ? "#f97316" : "#fb923c"} />
    </svg>
  );
}

/** The session/mastery ring. One drawing, used by the header and the summary. */
export function MasteryRing({
  percent,
  size = 44,
  stroke = 4,
  color = "var(--accent-good)",
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--track)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
      />
    </svg>
  );
}

/**
 * Difficulty tiers, as shape.
 *
 * Colour alone is not enough: roughly one learner in twelve has some colour vision deficiency,
 * and four tiers distinguished only by hue puts two of them together for those learners. Each
 * tier therefore also differs in *shape* — a bar, two bars, three, then a star — so the tier
 * survives being printed in greyscale or seen by someone who cannot separate blue from violet.
 */
export type Tier = "A" | "B" | "C" | "L";

export function TierGlyph({ tier, size = 14 }: { tier: Tier; size?: number }) {
  const color = `var(--tier-${tier.toLowerCase()})`;
  if (tier === "L") {
    return (
      <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
        <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3l-3.8 2.1.7-4.3-3.1-3 4.3-.6L8 1.6Z" fill={color} />
      </svg>
    );
  }
  const bars = tier === "A" ? 1 : tier === "B" ? 2 : 3;
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <rect key={index} x={2.4 + index * 4.2} y={index < bars ? 4.4 : 7.4} width="3.2" height={index < bars ? 7.2 : 4.2} rx="1.1" fill={index < bars ? color : "var(--track)"} />
      ))}
    </svg>
  );
}

/** The app mark: two cards, the front one lifted. Replaces the "FC" text tile. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true">
      <rect x="4.5" y="8.5" width="17" height="21" rx="3" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" transform="rotate(-8 13 19)" />
      <rect x="9" y="5" width="18.5" height="22.5" rx="3.4" fill="#ffffff" fillOpacity="0.96" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" transform="rotate(6 18 16)" />
      <path d="M14.4 13.2h8.4M14.4 17.6h6" stroke="#4f46e5" strokeWidth="1.9" strokeLinecap="round" transform="rotate(6 18 16)" />
      <path d="M14.4 21.4h4.2" stroke="#a855f7" strokeWidth="1.9" strokeLinecap="round" transform="rotate(6 18 16)" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Generic chrome, through one wrapper
// ─────────────────────────────────────────────────────────────

/**
 * Generic icons, funnelled through a single component.
 *
 * `Icon as={UI.X}` rather than importing lucide directly at forty call sites: one place sets
 * the stroke weight and the `aria-hidden` default, so a 1.5px cross cannot end up next to a
 * 2px chevron because two components were written a week apart.
 */
export const UI = {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clipboard,
  Clock,
  Copy,
  Equal,
  FileText,
  Image: ImageIcon,
  Info,
  Loader: Loader2,
  Moon,
  RotateCcw,
  Share2,
  Sparkles,
  Sun,
  Volume: Volume2,
  Mute: VolumeX,
  Wand: Wand2,
  X,
  Zap,
} as const;

export function Icon({
  as: Glyph,
  size = 16,
  strokeWidth = 2,
  className,
  "aria-hidden": ariaHidden = true,
}: {
  as: (typeof UI)[keyof typeof UI];
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  return <Glyph size={size} strokeWidth={strokeWidth} className={className} aria-hidden={ariaHidden} />;
}
