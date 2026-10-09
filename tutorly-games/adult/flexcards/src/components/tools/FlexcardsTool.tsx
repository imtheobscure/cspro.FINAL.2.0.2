import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_PAYLOAD, type FlexItem, type Payload } from "../../data/deck";
import { buildAiPrompt, buildJsonTemplate, clearSavedDeck, copyText, loadSavedDeck, parseAiDeck, saveSavedDeck } from "../../lib/aiDeck";
import { Icon, MasteryRing, SectionGlyph, StreakFlame, TierGlyph, UI, type SectionId, type Tier } from "../Glyphs";
import { playSound, primeAudio, speakText, speakWord, stopSpeech } from "../../lib/audio";
import { lookupWord, type WordData } from "../../lib/lookup";
import { badgeFor, deckKey, dueIn, loadStore, newMemory, review, saveStore, sortForSession, type Grade, type Store } from "../../lib/srs";
import { cultureIsRelevant, lookupCulture, lookupPronunciations, lookupQuotes, type Culture, type Pronunciations, type Quote } from "../../lib/sources";
import { findImage, type WordImage } from "../../lib/wordImage";

/*
 * FlexCards — one word, twelve ways.
 *
 * The rebuild, in the order the problems mattered.
 *
 * **The twelve tabs are gone.** They were the app's central affordance and its worst idea: a
 * single word's content split into twelve mutually exclusive panels, grouped into three hidden
 * pages of four, navigated by tapping a dot, with the group itself reachable only from a
 * caption underneath. Seeing everything the deck knew about "serendipity" meant twelve taps
 * and eleven backtracks, on a card 664px wide that scrolled internally. The content is now a
 * single **stack of collapsible sections**: the whole word is one scroll, each section opens
 * where it is, and the section list doubles as the overview the tabs never provided.
 *
 * **The glyphs are drawn.** Every emoji that carried meaning — nineteen of them, including all
 * twelve tab marks, the streak flame, the tier badges and the truth-or-dare cards — is now an
 * SVG path in `components/Glyphs.tsx`. Those rendered from whatever font the OS had installed,
 * so the twelve tab marks arrived at twelve different optical weights and a machine without a
 * colour emoji font showed twelve empty boxes where the navigation should be.
 *
 * **The stage is full width and the type is sized for a room.** A 664px card centred in a
 * 1440px viewport threw away more than half the screen while the meta text sat at 10px. The
 * layout is two columns now — card, then sections — and the type scale in `index.css` starts
 * at 13px instead of 10.
 *
 * **The colour comes from roles.** Nothing below names a palette; everything reads a token
 * ("the raised panel", "the ink for meta text"), which is what makes the light theme a single
 * attribute on `<html>` rather than a second component tree.
 */

// ─────────────────────────────────────────────────────────────
// Section identity
// ─────────────────────────────────────────────────────────────

interface SectionDef {
  id: SectionId;
  title: string;
  /** One line describing what the section is for, shown under the title. */
  hint: string;
  /** Cards that have nothing in this field are hidden entirely rather than shown empty. */
  has: (item: FlexItem) => boolean;
}

/*
 * The twelve sections, in teaching order rather than the old arbitrary grouping: meaning
 * first, then how it is actually used, then the cultural and creative layers. `has` is what
 * lets a thin deck stay honest — a section with no content is not rendered at all, instead of
 * showing an empty panel with a placeholder sentence.
 */
const SECTIONS: SectionDef[] = [
  { id: "media", title: "The word", hint: "Pronunciation, part of speech and a photograph", has: () => true },
  { id: "definition", title: "What it means", hint: "Definition, synonyms, antonyms and checking questions", has: (i) => Boolean(i.definition || i.back) },
  { id: "usage", title: "How it is used", hint: "Register, collocations and a model sentence", has: (i) => Boolean(i.usage || i.example) },
  { id: "register", title: "Register", hint: "The same idea from slang to formal", has: (i) => Boolean(i.register) },
  { id: "bilingual", title: "In your language", hint: "Equivalents across languages, with audio", has: (i) => Boolean(i.nativeEquivalents) },
  { id: "challenge", title: "Do it", hint: "A timed physical task with a stopwatch", has: (i) => Boolean(i.challenge) },
  { id: "truthdare", title: "Truth or dare", hint: "Speaking practice with a real stake", has: (i) => Boolean(i.truthOrDare) },
  { id: "wyr", title: "Would you rather", hint: "A forced choice to argue about", has: (i) => Boolean(i.wouldYou) },
  { id: "cultural", title: "Where it comes from", hint: "Etymology, culture and common errors", has: (i) => Boolean(i.culturalFact || i.commonErrors) },
  { id: "movie", title: "On screen", hint: "Hear real speakers use it in context", has: (i) => Boolean(i.movie) },
  { id: "song", title: "In song", hint: "The word in music, to carry the rhythm", has: (i) => Boolean(i.song) },
  { id: "joke", title: "The joke", hint: "Reveal, laugh, then say it out loud", has: (i) => Boolean(i.joke) },
];

/** Section glyphs take an ink, and the ink is a role so it survives both themes. */
const SECTION_INK: Record<SectionId, string> = {
  media: "var(--accent-info)",
  definition: "var(--accent-info)",
  usage: "var(--accent-good)",
  register: "var(--accent-magic)",
  bilingual: "var(--accent-magic)",
  challenge: "var(--accent-warn)",
  truthdare: "var(--accent-bad)",
  wyr: "var(--accent-good)",
  cultural: "var(--accent-warn)",
  movie: "var(--accent-bad)",
  song: "var(--accent-magic)",
  joke: "var(--accent-warn)",
};

const TIER_FOR: Record<string, Tier> = { A1: "A", A2: "A", B1: "B", B2: "B", C1: "C", C2: "L" };

const LANG_TAGS: Record<string, string> = {
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Japanese: "ja-JP",
  Italian: "it-IT",
  Portuguese: "pt-PT",
  Arabic: "ar-SA",
  Mandarin: "zh-CN",
  Chinese: "zh-CN",
  Russian: "ru-RU",
};

// ─────────────────────────────────────────────────────────────
// Small shared pieces
// ─────────────────────────────────────────────────────────────

function Chip({ children, role = "muted" }: { children: React.ReactNode; role?: "muted" | "good" | "warn" | "bad" | "info" | "magic" }) {
  const tone: Record<string, string> = {
    muted: "border-line-1 bg-inset text-fg-2",
    good: "border-accent-good/35 bg-accent-good/10 text-accent-good",
    warn: "border-accent-warn/35 bg-accent-warn/10 text-accent-warn",
    bad: "border-accent-bad/35 bg-accent-bad/10 text-accent-bad",
    info: "border-accent-info/35 bg-accent-info/10 text-accent-info",
    magic: "border-accent-magic/35 bg-accent-magic/10 text-accent-magic",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${tone[role]}`}>{children}</span>;
}

/**
 * One collapsible section.
 *
 * A real `<button>` header rather than a div with an onClick: the old panel switcher was a row
 * of `<button>`s with no `aria-expanded` and no keyboard route between them, so the only way to
 * change section was to click or to use the up/down arrows, which changed a *group* without
 * changing anything visible on a narrow screen.
 */
function Section({
  def,
  open,
  onToggle,
  aside,
  children,
}: {
  def: SectionDef;
  open: boolean;
  onToggle: () => void;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ink = SECTION_INK[def.id];
  return (
    <section className="overflow-hidden rounded-2xl border border-line-1 bg-panel shadow-[var(--panel-shadow)]">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-inset/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info sm:px-5"
        >
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
            style={{ borderColor: `color-mix(in srgb, ${ink} 35%, transparent)`, background: `color-mix(in srgb, ${ink} 10%, transparent)` }}
          >
            <SectionGlyph id={def.id} size={22} accent={ink} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-black leading-tight text-fg-1">{def.title}</span>
            <span className="mt-0.5 block truncate text-xs font-medium text-fg-3">{def.hint}</span>
          </span>
          {aside}
          <Icon as={open ? UI.ChevronUp : UI.ChevronDown} size={20} className="shrink-0 text-fg-3" />
        </button>
      </h3>
      {open && <div className="animate-rise border-t border-line-1 px-4 py-4 sm:px-5 sm:py-5">{children}</div>}
    </section>
  );
}

/** A label above a block of content. Uses the meta ink, never a raw accent. */
function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <p className="mb-2.5 flex items-center gap-2 text-2xs font-black uppercase tracking-[0.14em] text-fg-3">
      {icon}
      {children}
    </p>
  );
}

function Panel({ children, tone = "inset" }: { children: React.ReactNode; tone?: "inset" | "sunken" }) {
  return <div className={`rounded-xl border border-line-1 ${tone === "inset" ? "bg-inset" : "bg-sunken"} p-4`}>{children}</div>;
}

/* ─────────────────────────────────────────────────────────────
 * Card
 * ───────────────────────────────────────────────────────────── */

/**
 * The 3D card.
 *
 * The tilt is kept — it is the app's signature and it does real work, because a card that
 * leans toward the pointer reads as a physical object being held. What is new is that the
 * face reads its colour from tokens instead of a hard-coded `from-slate-900`, which was the
 * single reason the card was a black rectangle in a light theme.
 */
function Card3D({
  cardRef,
  tilt,
  isHovering,
  wobble,
  tier,
  children,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  tilt: { x: number; y: number; scale: number };
  isHovering: boolean;
  wobble: boolean;
  tier: Tier;
  children: React.ReactNode;
}) {
  const glow = `var(--tier-${tier.toLowerCase()})`;
  const shadowX = tilt.y * 1.6;
  const shadowY = -tilt.x * 1.6;

  return (
    <div ref={cardRef} className={`relative ${wobble ? "animate-wobble" : ""}`} style={{ perspective: "1400px", transformStyle: "preserve-3d" }}>
      <div
        aria-hidden="true"
        className="absolute -inset-1 rounded-[28px] blur-2xl transition-opacity duration-300"
        style={{
          background: `color-mix(in srgb, ${glow} 35%, transparent)`,
          opacity: isHovering ? 0.55 : 0.26,
          transform: `translate(${shadowX * 0.4}px, ${shadowY * 0.4}px)`,
        }}
      />

      <div
        className="relative overflow-hidden rounded-[26px] border border-line-2 transition-[transform,box-shadow] duration-150 ease-out"
        style={{
          background: "var(--card-bg)",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilt.scale})`,
          transformStyle: "preserve-3d",
          boxShadow: isHovering ? "var(--shadow-card)" : "var(--panel-shadow)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background: `linear-gradient(${135 + tilt.y * 2}deg, transparent 32%, var(--card-sheen) 50%, transparent 68%)`,
          }}
        />
        {children}
      </div>
    </div>
  );
}

/** The drawn confetti. Shapes and tier inks, not sixteen different emoji. */
function ParticleBurst({ trigger, kind }: { trigger: number; kind: "known" | "learning" | "none" }) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; ink: string; size: number; rotate: number }[]>([]);

  useEffect(() => {
    if (trigger === 0 || kind === "none") return;
    const inks =
      kind === "known"
        ? ["var(--accent-good)", "var(--accent-info)", "var(--accent-magic)", "var(--accent-warn)"]
        : ["var(--accent-bad)", "var(--accent-warn)", "var(--accent-magic)"];
    setParticles(
      Array.from({ length: 18 }, (_, index) => ({
        id: trigger * 100 + index,
        x: 8 + Math.random() * 84,
        y: 10 + Math.random() * 80,
        ink: inks[index % inks.length],
        size: 6 + Math.round(Math.random() * 8),
        rotate: Math.round(Math.random() * 360),
      }))
    );
    const timer = window.setTimeout(() => setParticles([]), 1200);
    return () => window.clearTimeout(timer);
  }, [trigger, kind]);

  if (particles.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="animate-burst block rounded-[2px]"
          style={
            {
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size * 1.6,
              background: particle.ink,
              rotate: `${particle.rotate}deg`,
              /* Read by the `burst` keyframes, which fly the piece out on its own vector. */
              "--tx": `${(particle.x - 50) * 1.6}px`,
              "--ty": `${-110 - Math.random() * 60}px`,
              "--rot": `${particle.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Live enrichment
 * ───────────────────────────────────────────────────────────── */

interface Enrichment {
  word: WordData;
  quotes: Quote[];
  culture: Culture;
  pronunciation: Pronunciations;
  image: WordImage;
  loading: boolean;
}

const EMPTY_ENRICHMENT: Enrichment = {
  word: { ipa: "", senses: [], rhymes: [], soundsLike: [], synonyms: [], antonyms: [], syllables: 0 },
  quotes: [],
  culture: { title: "", description: "", extract: "", image: "", imageCredit: "", url: "" },
  pronunciation: { uk: "", us: "", others: [] },
  image: { url: "", credit: "", alt: "", source: "none" },
  loading: false,
};

/**
 * Everything the live sources know about the current word.
 *
 * One hook rather than four, because the four lookups share a word and a lifecycle and there is
 * no state in which having three of them is useful. It is keyed by the word, so moving to the
 * next card abandons the previous requests rather than racing them into the wrong card — the
 * bug this shape exists to prevent.
 */
function useEnrichment(item: FlexItem | undefined): Enrichment {
  const [state, setState] = useState<Enrichment>(EMPTY_ENRICHMENT);
  const word = item?.front ?? "";

  useEffect(() => {
    if (!item || !word) {
      setState(EMPTY_ENRICHMENT);
      return;
    }
    let live = true;
    setState({ ...EMPTY_ENRICHMENT, loading: true });

    const load = async () => {
      const [dict, quotes, culture, pronunciation, image] = await Promise.all([
        lookupWord(word),
        lookupQuotes(word),
        lookupCulture(word),
        lookupPronunciations(word),
        findImage(word, item.image, item.imageCredit, item.imageAlt),
      ]);
      if (!live) return;
      setState({
        word: dict,
        quotes,
        culture: cultureIsRelevant(culture) ? culture : EMPTY_ENRICHMENT.culture,
        pronunciation,
        image,
        loading: false,
      });
    };

    void load();
    return () => {
      live = false;
    };
  }, [word, item]);

  return state;
}

/* ─────────────────────────────────────────────────────────────
 * The word
 * ───────────────────────────────────────────────────────────── */

function WordStage({
  item,
  enrichment,
  onSpeak,
  onImageFailed,
}: {
  item: FlexItem;
  enrichment: Enrichment;
  onSpeak: (recording?: string) => void;
  onImageFailed: () => void;
}) {
  const [photoBroken, setPhotoBroken] = useState(false);
  const tier = TIER_FOR[item.difficulty ?? "B1"] ?? "B";
  const ipa = enrichment.word.ipa || item.phoneticIPA || "";
  const image = enrichment.image.url;
  const showPhoto = Boolean(image) && !photoBroken;

  useEffect(() => setPhotoBroken(false), [image]);

  return (
    <article className="overflow-hidden rounded-2xl border border-line-1 bg-panel shadow-[var(--panel-shadow)]">
      {showPhoto && (
        /*
         * The photograph band, with its credit underneath. Credit is not a courtesy here:
         * these are other people's pictures, and the two sources that supply them — Openverse
         * and Wikimedia Commons — both attach a licence the learner is entitled to see.
         */
        <figure className="relative">
          <img
            src={image}
            alt={enrichment.image.alt || item.imageAlt || item.front}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-[260px] w-full object-cover sm:h-[340px] lg:h-[400px]"
            onError={() => {
              setPhotoBroken(true);
              onImageFailed();
            }}
          />
          {enrichment.image.credit && (
            <figcaption className="absolute bottom-0 left-0 right-0 bg-[var(--surface-scrim)] px-3 py-1.5 text-2xs font-medium text-white/90 line-clamp-1">
              {enrichment.image.credit}
            </figcaption>
          )}
        </figure>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Chip role="info">
            <TierGlyph tier={tier} size={13} />
            {item.difficulty ?? "—"}
          </Chip>
          {item.partOfSpeech && <Chip>{item.partOfSpeech}</Chip>}
          {(item.tags ?? []).map((tag) => (
            <Chip key={tag} role="magic">
              {tag}
            </Chip>
          ))}
        </div>

        {/*
         * The word itself, at the size the whole scale exists for: 76px, up from 24. Fraunces
         * with optical sizing, so the joins are redrawn for this size rather than a caption
         * outline enlarged.
         */}
        <h2 className="word-display mt-4 text-5xl font-black leading-[1.02] tracking-tight text-fg-1 sm:text-6xl lg:text-7xl">{item.front}</h2>

        {ipa && <p className="mt-2 font-mono text-lg font-medium text-accent-info sm:text-xl">{ipa}</p>}
        {item.pronunciation && <p className="mt-1 text-lg font-semibold text-fg-3">{item.pronunciation}</p>}

        <p className="mt-4 max-w-[68ch] text-lg font-medium leading-relaxed text-fg-2 sm:text-xl">{item.back}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSpeak()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent-info/40 bg-accent-info/10 px-4 text-sm font-bold text-accent-info transition-colors hover:bg-accent-info/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info"
          >
            <Icon as={UI.Volume} size={18} />
            Hear it
          </button>
          {enrichment.pronunciation.uk && (
            <button
              type="button"
              onClick={() => onSpeak(enrichment.pronunciation.uk)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-1 bg-control px-4 text-sm font-bold text-fg-2 transition-colors hover:text-fg-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info"
            >
              <Icon as={UI.Volume} size={16} />
              UK
            </button>
          )}
          {enrichment.pronunciation.us && (
            <button
              type="button"
              onClick={() => onSpeak(enrichment.pronunciation.us)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-1 bg-control px-4 text-sm font-bold text-fg-2 transition-colors hover:text-fg-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info"
            >
              <Icon as={UI.Volume} size={16} />
              US
            </button>
          )}
        </div>

        {enrichment.word.senses.length > 0 && (
          <details className="mt-5 rounded-xl border border-line-1 bg-inset p-4">
            <summary className="cursor-pointer text-sm font-black text-fg-2 marker:text-fg-3">
              Every sense, from Wiktionary ({enrichment.word.senses.length})
            </summary>
            {/*
             * This is the section a generated deck cannot produce and the reason the lookup
             * exists: polysemy. "Sanction" has two definitions that mean opposite things, and
             * a model asked for "a definition" will give the first one only.
             */}
            <ol className="mt-3 space-y-3">
              {enrichment.word.senses.map((sense, index) => (
                <li key={index} className="border-l-2 border-line-2 pl-3">
                  {sense.partOfSpeech && <span className="mr-2 text-2xs font-black uppercase tracking-wide text-fg-3">{sense.partOfSpeech}</span>}
                  <span className="text-base text-fg-2">{sense.definition}</span>
                  {sense.examples.map((example) => (
                    <p key={example} className="mt-1 text-sm italic text-fg-3">
                      "{example}"
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Section bodies
 * ───────────────────────────────────────────────────────────── */

function WordList({ words, role, empty }: { words: string[]; role: "good" | "bad" | "magic" | "info"; empty: string }) {
  if (words.length === 0) return <p className="text-base text-fg-3">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {words.map((word) => (
        <Chip key={word} role={role}>
          {word}
        </Chip>
      ))}
    </div>
  );
}

function RegisterBody({ item }: { item: FlexItem }) {
  const reg = item.register;
  if (!reg) return <p className="text-base text-fg-3">No register information in this deck.</p>;
  const levels = [
    { key: "slang" as const, label: "Slang", note: "with friends" },
    { key: "casual" as const, label: "Casual", note: "everyday speech" },
    { key: "informal" as const, label: "Informal", note: "relaxed writing" },
    { key: "neutral" as const, label: "Neutral", note: "safe anywhere" },
    { key: "formal" as const, label: "Formal", note: "essays, interviews" },
  ];
  const active = Math.max(1, Math.min(5, item.registerSlider ?? 3));

  return (
    <div className="space-y-4">
      {/*
       * The spectrum bar. Each step carries its own label and the active one is marked with a
       * ring *and* a bold weight, so the position is legible without relying on the colour of
       * a 12px bar.
       */}
      <div className="grid grid-cols-5 gap-1.5" role="img" aria-label={`Register ${active} of 5: ${levels[active - 1].label}`}>
        {levels.map((level, index) => {
          const on = index + 1 <= active;
          return (
            <div key={level.key} className={`rounded-lg border px-2 py-2 text-center ${on ? "border-accent-magic/40 bg-accent-magic/12" : "border-line-1 bg-inset"}`}>
              <p className={`text-2xs font-black uppercase tracking-wide ${on ? "text-accent-magic" : "text-fg-4"}`}>{level.label}</p>
              <p className={`mt-0.5 text-2xs ${on ? "text-fg-2" : "text-fg-4"}`}>{level.note}</p>
            </div>
          );
        })}
      </div>

      <ul className="space-y-2">
        {levels.map((level, index) => (
          <li
            key={level.key}
            className={`flex flex-col gap-1 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:gap-4 ${
              index + 1 === active ? "border-accent-magic/45 bg-accent-magic/10" : "border-line-1 bg-inset"
            }`}
          >
            <span className="w-24 shrink-0 text-2xs font-black uppercase tracking-wide text-fg-3">{level.label}</span>
            <span className={`text-base font-medium sm:text-lg ${index + 1 === active ? "text-fg-1" : "text-fg-2"}`}>{reg[level.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChallengeBody({ item }: { item: FlexItem }) {
  const [revealed, setRevealed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => {
          setRevealed(true);
          setRunning(true);
          setSeconds(0);
        }}
        className="flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-accent-warn/15 px-5 text-lg font-black text-accent-warn transition-colors hover:bg-accent-warn/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-warn"
      >
        <Icon as={UI.Zap} size={22} />
        Reveal the challenge
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <p className="text-lg font-bold leading-relaxed text-fg-1 sm:text-xl">{item.challenge}</p>
      </Panel>
      <div className="flex items-center gap-4">
        <span className={`tnum font-mono text-4xl font-black sm:text-5xl ${seconds > 45 ? "text-accent-bad" : "text-accent-warn"}`}>{clock}</span>
        <button
          type="button"
          onClick={() => setRunning((value) => !value)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-1 bg-control px-4 text-sm font-bold text-fg-2 transition-colors hover:text-fg-1"
        >
          {running ? "Pause" : "Resume"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSeconds(0);
            setRunning(false);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-1 bg-control px-4 text-sm font-bold text-fg-2 transition-colors hover:text-fg-1"
        >
          <Icon as={UI.RotateCcw} size={16} />
          Reset
        </button>
      </div>
    </div>
  );
}

function TruthOrDareBody({ item }: { item: FlexItem }) {
  const [choice, setChoice] = useState<"truth" | "dare" | null>(null);
  const pair = item.truthOrDare;
  if (!pair) return null;

  if (!choice) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setChoice("truth")}
          className="flex min-h-24 flex-col items-start justify-center rounded-2xl border border-accent-info/40 bg-accent-info/10 px-5 text-left transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info"
        >
          <span className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">Truth</span>
          <span className="mt-1 text-base font-medium text-fg-2">Answer honestly, in English</span>
        </button>
        <button
          type="button"
          onClick={() => setChoice("dare")}
          className="flex min-h-24 flex-col items-start justify-center rounded-2xl border border-accent-bad/40 bg-accent-bad/10 px-5 text-left transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bad"
        >
          <span className="text-xs font-black uppercase tracking-[0.16em] text-accent-bad">Dare</span>
          <span className="mt-1 text-base font-medium text-fg-2">Do it, out loud, standing up</span>
        </button>
      </div>
    );
  }

  const isTruth = choice === "truth";
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 ${isTruth ? "border-accent-info/40 bg-accent-info/10" : "border-accent-bad/40 bg-accent-bad/10"}`}>
        <p className={`text-xs font-black uppercase tracking-[0.16em] ${isTruth ? "text-accent-info" : "text-accent-bad"}`}>
          Your {isTruth ? "truth" : "dare"}
        </p>
        <p className="mt-2 text-lg font-bold leading-relaxed text-fg-1 sm:text-xl">{pair[choice]}</p>
      </div>
      <button type="button" onClick={() => setChoice(null)} className="text-sm font-bold text-fg-3 underline underline-offset-4 hover:text-fg-1">
        Choose again
      </button>
    </div>
  );
}

function WouldYouBody({ item }: { item: FlexItem }) {
  const [voted, setVoted] = useState<"A" | "B" | null>(null);
  const question = item.wouldYou ?? "";
  const [partA, partB] = question.includes(" or ") ? question.split(/ or (.+)/) : [question, "or the opposite?"];

  /*
   * The two options read their tone from `--opt-*`, set on the wrapper, rather than from a
   * class name built at runtime. `focus-visible:ring-${tone}` would be invisible to Tailwind's
   * scanner, which walks the source as text — the utility would simply never be generated, and
   * the option would silently have no keyboard focus ring.
   */
  const options = [
    { key: "A" as const, text: partA, varName: "--accent-good", ring: "ring-accent-good" },
    { key: "B" as const, text: partB, varName: "--accent-magic", ring: "ring-accent-magic" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {options.map((option) => {
          const chosen = voted === option.key;
          const color = `var(${option.varName})`;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setVoted(option.key)}
              aria-pressed={chosen}
              className={`flex items-start gap-3 rounded-2xl border px-5 py-4 text-left transition-transform hover:scale-[1.005] focus-visible:outline-none focus-visible:ring-2 ${option.ring}`}
              style={{
                borderColor: `color-mix(in srgb, ${color} ${chosen ? "60%" : "30%"}, transparent)`,
                background: `color-mix(in srgb, ${color} ${chosen ? "16%" : "7%"}, transparent)`,
              }}
            >
              <span
                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-black"
                style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
              >
                {option.key}
              </span>
              <span className="text-lg font-bold leading-snug text-fg-1">{option.text?.trim()}</span>
            </button>
          );
        })}
      </div>
      {voted && (
        <Panel>
          <p className="text-base font-medium text-fg-2">
            You chose <strong className="text-fg-1">option {voted}</strong>. Now say why — three sentences, out loud, using "
            {item.front.toLowerCase()}" at least once.
          </p>
        </Panel>
      )}
    </div>
  );
}

function BilingualBody({ item, onSpeak }: { item: FlexItem; onSpeak: (text: string, lang: string) => void }) {
  const entries = Object.entries(item.nativeEquivalents ?? {});
  if (entries.length === 0) return <p className="text-base text-fg-3">No translations in this deck.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {entries.map(([language, word]) => (
        <li key={language} className="flex items-center gap-3 rounded-xl border border-line-1 bg-inset p-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-2xs font-black uppercase tracking-wide text-fg-3">{language}</p>
            <p className="mt-0.5 truncate text-xl font-bold text-fg-1">{word}</p>
          </div>
          <button
            type="button"
            onClick={() => onSpeak(word, LANG_TAGS[language] ?? "en-GB")}
            aria-label={`Hear ${word} in ${language}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line-1 bg-control text-fg-3 transition-colors hover:text-fg-1"
          >
            <Icon as={UI.Volume} size={17} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function CulturalBody({ item, enrichment }: { item: FlexItem; enrichment: Enrichment }) {
  const hasQuote = enrichment.quotes.length > 0;
  return (
    <div className="space-y-4">
      {item.culturalFact && (
        <Panel>
          <Label>The story</Label>
          <p className="text-base leading-relaxed text-fg-2 sm:text-lg">{item.culturalFact}</p>
        </Panel>
      )}

      {/*
       * Real quotations, with the page they came from. A model writing "a quote using this
       * word" produces something plausible and unattributed, and in a lesson about trusting a
       * word that is the worst possible thing to teach.
       */}
      {hasQuote && (
        <Panel>
          <Label>In real writing · Wikiquote</Label>
          <ul className="space-y-3">
            {enrichment.quotes.map((quote, index) => (
              <li key={`${index}-${quote.text.slice(0, 24)}`} className="border-l-2 border-accent-warn pl-3">
                <p className="text-base italic leading-relaxed text-fg-2">{quote.text}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-fg-3">{quote.attribution}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {enrichment.culture.extract && (
        <Panel>
          <Label>Wikipedia · {enrichment.culture.title}</Label>
          {enrichment.culture.description && <p className="mb-2 text-sm font-bold text-fg-3">{enrichment.culture.description}</p>}
          <p className="text-base leading-relaxed text-fg-2">{enrichment.culture.extract}</p>
          <a
            href={enrichment.culture.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-accent-info underline underline-offset-4"
          >
            Read the full article
            <Icon as={UI.ArrowRight} size={16} />
          </a>
        </Panel>
      )}

      {(item.commonErrors ?? []).length > 0 && (
        <Panel>
          <Label>Common errors</Label>
          <ul className="space-y-2">
            {item.commonErrors!.map((error, index) => (
              <li key={index} className="rounded-lg border border-accent-bad/25 bg-accent-bad/8 p-3 text-base font-medium text-fg-2">
                {error}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function ScreenBody({ item }: { item: FlexItem }) {
  const word = item.front;
  const links = [
    { label: "YouGlish", note: `Native speakers saying "${word}" in real videos`, href: `https://youglish.com/pronounce/${encodeURIComponent(word)}/english` },
    { label: "PlayPhrase", note: `"${word}" inside actual movie scenes`, href: `https://playphrase.me/#/search?q=${encodeURIComponent(word)}` },
  ];
  return (
    <div className="space-y-4">
      {item.movie && (
        <Panel>
          <Label>A line worth knowing</Label>
          <p className="font-mono text-base leading-relaxed text-fg-2 sm:text-lg">{item.movie}</p>
        </Panel>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-line-1 bg-inset p-4 transition-colors hover:border-accent-bad/50"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent-bad/40 bg-accent-bad/10 text-accent-bad">
              <Icon as={UI.ArrowRight} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-fg-1">{link.label}</span>
              <span className="block text-sm text-fg-3">{link.note}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function SongBody({ item, onSpeak }: { item: FlexItem; onSpeak: () => void }) {
  return (
    <div className="space-y-4">
      <Panel tone="sunken">
        <p className="text-center text-xl font-medium italic leading-relaxed text-fg-1 sm:text-2xl">"{item.song}"</p>
      </Panel>
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.front} lyrics song`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-line-1 bg-inset p-4 transition-colors hover:border-accent-magic/50"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent-magic/40 bg-accent-magic/10 text-accent-magic">
            <Icon as={UI.ArrowRight} size={18} />
          </span>
          <span>
            <span className="block text-base font-bold text-fg-1">Songs using it</span>
            <span className="block text-sm text-fg-3">Search YouTube for "{item.front}" in lyrics</span>
          </span>
        </a>
        <div className="flex items-center gap-3 rounded-xl border border-line-1 bg-inset p-4">
          <button
            type="button"
            onClick={onSpeak}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line-1 bg-control text-fg-3 transition-colors hover:text-fg-1"
            aria-label="Sing it out loud"
          >
            <Icon as={UI.Volume} size={17} />
          </button>
          <span className="text-sm text-fg-3">Sing it once out loud, replacing a word with "{item.front}".</span>
        </div>
      </div>
    </div>
  );
}

function JokeBody({ item, onSpeak }: { item: FlexItem; onSpeak: () => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-4">
      {!shown ? (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-accent-magic/15 px-5 text-lg font-black text-accent-magic transition-colors hover:bg-accent-magic/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-magic"
        >
          Reveal the joke
        </button>
      ) : (
        <>
          <Panel>
            <p className="text-lg font-medium leading-relaxed text-fg-1 sm:text-xl">{item.joke}</p>
          </Panel>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSpeak}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-1 bg-control px-4 text-sm font-bold text-fg-2 hover:text-fg-1"
            >
              <Icon as={UI.Volume} size={16} />
              Hear it
            </button>
            <button
              type="button"
              onClick={() => setShown(false)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-1 bg-control px-4 text-sm font-bold text-fg-2 hover:text-fg-1"
            >
              <Icon as={UI.RotateCcw} size={16} />
              Again
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Session summary
 * ───────────────────────────────────────────────────────────── */

/**
 * The end-of-session report.
 *
 * It used to report deck statistics — "Mastered 0, Still learning 5" — which said nothing about
 * the twenty minutes just spent and read as a failure even after a clean run, because nothing
 * reaches the deck's mastered threshold on its first review. What it reports now is the session
 * itself: how many you got right, how many came back, and the accuracy ring that goes with them.
 * The deck-wide mastery figure lives in the session bar, where it belongs.
 */
function Summary({
  reviewed,
  lapsed,
  xp,
  bestStreak,
  seconds,
  onRestart,
}: {
  reviewed: number;
  lapsed: number;
  xp: number;
  bestStreak: number;
  seconds: number;
  onRestart: () => void;
}) {
  const remembered = Math.max(0, reviewed - lapsed);
  const pct = reviewed > 0 ? Math.round((remembered / reviewed) * 100) : 0;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 py-10 text-center">
      <div className="relative">
        <MasteryRing percent={pct} size={132} stroke={10} />
        <span className="absolute inset-0 grid place-items-center">
          <span className="text-6xl font-black text-fg-1">{pct}%</span>
        </span>
      </div>

      <div>
        <h1 className="text-4xl font-black text-fg-1 sm:text-5xl">Session complete</h1>
        <p className="mt-2 text-lg text-fg-3">
          {reviewed} card{reviewed === 1 ? "" : "s"} answered in {clock}
        </p>
      </div>

      <dl className="grid w-full grid-cols-3 gap-3">
        {[
          { label: "Remembered", value: remembered, role: "accent-good" },
          { label: "Needed a second look", value: lapsed, role: "accent-warn" },
          { label: "XP earned", value: xp, role: "accent-info" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line-1 bg-panel p-4">
            <dt className="text-2xs font-black uppercase tracking-wide text-fg-3">{stat.label}</dt>
            <dd className="tnum mt-1 text-3xl font-black" style={{ color: `var(--${stat.role})` }}>
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex w-full items-center justify-center gap-3 rounded-2xl border border-line-1 bg-panel p-4 text-sm font-bold text-fg-3">
        <StreakFlame streak={bestStreak} size={22} />
        Best streak {bestStreak}
        <span aria-hidden="true">·</span>
        <Icon as={UI.Clock} size={16} />
        {clock}
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-accent-info px-8 text-lg font-black text-white transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info"
      >
        <Icon as={UI.RotateCcw} size={20} />
        Study again
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * The tool
 * ───────────────────────────────────────────────────────────── */

export function FlexcardsTool({ payload, soundOn = true }: { payload?: Payload; soundOn?: boolean }) {
  /*
   * The deck is state, not a constant.
   *
   * A `payload` prop still wins, because that was always the contract for a host page. With no
   * host the deck is the tutor's own: whatever they last imported, restored across reloads, and
   * the shipped sample deck when there is nothing saved. Everything downstream — the twelve
   * sections, the SRS store (`deckKey`), the queue — already reads from `data`, so a swapped
   * deck flows through unchanged.
   */
  const [data, setData] = useState<Payload>(() => payload ?? loadSavedDeck() ?? DEMO_PAYLOAD);
  const items = data.items;
  const storeKey = useMemo(() => deckKey(data), [data]);

  const [store, setStore] = useState<Store>(() => (typeof window === "undefined" ? {} : loadStore(storeKey)));
  const [index, setIndex] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [open, setOpen] = useState<Set<string>>(() => new Set(["media"]));
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [burst, setBurst] = useState<{ trigger: number; kind: "known" | "learning" | "none" }>({ trigger: 0, kind: "none" });
  const [flight, setFlight] = useState<"idle" | "left" | "right">("idle");
  const [wobble, setWobble] = useState(false);
  const [complete, setComplete] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showIndex, setShowIndex] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [lapsed, setLapsed] = useState(0);
  /*
   * Cards sent back to the end of the queue.
   *
   * The `Again` grade has to actually mean something. Scheduling a failed card ten minutes out
   * is correct spaced repetition and useless in a forty-minute lesson, because the card never
   * comes back before the room moves on. Re-queueing it is the relearning step the algorithm
   * describes — and the cap of two appearances per card is what stops a learner who keeps
   * failing one word from looping on it until they give up.
   */
  const [requeued, setRequeued] = useState<string[]>([]);
  const appearances = useRef<Record<string, number>>({});

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);

  /*
   * The session queue is **frozen when the session starts**.
   *
   * This was a real bug, and an invisible one. The order came from `sortForSession(items,
   * store)` recomputed on every grade, so the moment a card was graded its due date moved into
   * the future, it sank to the back of the list, and `index + 1` then pointed at a *different*
   * card than the one that had been next a moment earlier. Tapping "Got it" on card 1 silently
   * skipped a card, and the count at the end still came out right — so nothing looked wrong.
   *
   * `storeRef` is what makes this work: the queue reads the current schedule once, and the
   * live `store` below still drives what is displayed for the card in hand.
   */
  const storeRef = useRef(store);
  storeRef.current = store;
  const queue = useMemo(
    () => sortForSession(items, storeRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately not re-sorted on grade
    [items, storeKey, sessionKey]
  );
  /* The frozen queue, plus anything sent back to the end of it. */
  const session = useMemo(
    () => [...queue, ...requeued.map((id) => items.find((entry) => entry.id === id)).filter((entry): entry is FlexItem => Boolean(entry))],
    [queue, requeued, items]
  );
  const item = session[index];
  const total = session.length;
  const memory = item ? store[item.id] ?? newMemory() : undefined;
  const dueCount = items.filter((entry) => !store[entry.id] || Date.now() >= (store[entry.id]?.due ?? 0)).length;
  const masteredCount = items.filter((entry) => store[entry.id]?.state === "review" && (store[entry.id]?.interval ?? 0) >= 21).length;
  const mastery = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
  const enrichment = useEnrichment(item);

  /* Persist on every change. It is a few hundred bytes and the alternative is losing a session. */
  useEffect(() => {
    if (typeof window !== "undefined") saveStore(storeKey, store);
  }, [store, storeKey]);

  useEffect(() => {
    setStore(loadStore(storeKey));
    setIndex(0);
    setReviewed(0);
    setComplete(false);
    /*
     * A new deck is a new session. The requeue list and the per-card appearance counts belong
     * to the deck that was on screen a moment ago; carrying them over would send the new deck's
     * cards to the back of its own queue for reasons the tutor never caused.
     */
    setLapsed(0);
    setRequeued([]);
    appearances.current = {};
    setSessionKey((value) => value + 1);
  }, [storeKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sound = useCallback(
    (name: Parameters<typeof playSound>[0]) => {
      if (soundOn) playSound(name);
    },
    [soundOn]
  );

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const grade = useCallback(
    (value: Grade, direction: "known" | "learning") => {
      if (!item) return;
      const current = store[item.id] ?? newMemory();
      const next = review(current, value);

      setStore((previous) => ({ ...previous, [item.id]: next }));
      setReviewed((count) => count + 1);
      setFlight(direction === "known" ? "right" : "left");
      sound(value === 1 ? "learning" : "know");
      setBurst({ trigger: Date.now(), kind: direction });

      if (value === 1) {
        setLapsed((count) => count + 1);
        const seen = appearances.current[item.id] ?? 0;
        appearances.current[item.id] = seen + 1;
        if (seen < 2) setRequeued((previous) => [...previous, item.id]);
      }

      if (direction === "known") {
        setStreak((value) => {
          const next = value + 1;
          setBestStreak((best) => Math.max(best, next));
          return next;
        });
        setXp((value) => value + 20 + streak * 5);
      } else {
        setStreak(0);
        setXp((value) => value + 5);
      }

      /*
       * A level every 300 XP. The threshold is flat rather than growing, deliberately: the
       * old `level * 100` meant the gap widened every level, so the reward for the tenth level
       * took five times as long as the first — which reads as the app slowing down, not as a
       * difficulty curve.
       */
      const earned = xp + (direction === "known" ? 20 + streak * 5 : 5);
      const level = Math.floor(earned / 300) + 1;
      if (level > Math.floor(xp / 300) + 1) {
        setLevelUp(level);
        window.setTimeout(() => setLevelUp(null), 2600);
      }

      window.setTimeout(() => {
        setFlight("idle");
        stopSpeech();
        setOpen(new Set(["media"]));
        const nextIndex = index + 1;
        if (nextIndex >= total) setComplete(true);
        else setIndex(nextIndex);
      }, 360);
    },
    [index, item, sound, store, streak, total, xp]
  );

  /* Keyboard, with the shortcuts the tutor actually has: space to hear, arrows to grade. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "ArrowRight") grade(4, "known");
      else if (event.key === "ArrowLeft") grade(1, "learning");
      else if (event.key === " " && item) {
        event.preventDefault();
        void speakWord(item.front, { recording: enrichment.pronunciation.uk || enrichment.pronunciation.us });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grade, item, enrichment.pronunciation]);

  /* Applying a deck only swaps the data; the `storeKey` effect above resets the session. */
  const applyDeck = useCallback((next: Payload) => {
    setData(next);
    saveSavedDeck(next);
  }, []);

  const useSampleDeck = useCallback(() => {
    clearSavedDeck();
    setData(DEMO_PAYLOAD);
  }, []);

  const toggle = (id: string) =>
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (total === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-lg text-fg-3">This deck has no cards.</p>
        <button
          type="button"
          onClick={() => setShowStudio(true)}
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-accent-magic px-6 text-base font-black text-white"
        >
          <Icon as={UI.Wand} size={18} />
          Build a deck with AI
        </button>
        {showStudio && <DeckStudio deck={data} onApply={applyDeck} onUseSample={useSampleDeck} onClose={() => setShowStudio(false)} />}
      </div>
    );
  }

  if (complete) {
    return (
      <Summary
        reviewed={reviewed}
        lapsed={lapsed}
        xp={xp}
        bestStreak={bestStreak}
        seconds={seconds}
        onRestart={() => {
          setIndex(0);
          setReviewed(0);
          setLapsed(0);
          setRequeued([]);
          appearances.current = {};
          setComplete(false);
          setSeconds(0);
          setOpen(new Set(["media"]));
          setSessionKey((value) => value + 1);
        }}
      />
    );
  }

  if (!item) return null;

  const flightClass =
    flight === "right" ? "translate-x-[110%] rotate-6 opacity-0" : flight === "left" ? "-translate-x-[110%] -rotate-6 opacity-0" : "translate-x-0 rotate-0 opacity-100";
  const visible = SECTIONS.filter((section) => section.has(item));

  return (
    <div className="relative" onPointerDown={() => primeAudio()}>
      {levelUp !== null && (
        <div role="status" className="fixed left-1/2 top-20 z-50 -translate-x-1/2 animate-rise">
          <div className="flex items-center gap-3 rounded-2xl border border-accent-warn/40 bg-panel px-6 py-3 text-lg font-black text-accent-warn shadow-[var(--shadow-card)]">
            <Icon as={UI.Sparkles} size={20} />
            Level {levelUp}
          </div>
        </div>
      )}

      {/* Session bar: the one piece of chrome a tutor glances at. */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line-1 bg-panel px-4 py-3 shadow-[var(--panel-shadow)]">
        <div className="flex items-center gap-2">
          <StreakFlame streak={streak} size={24} />
          <span className="text-sm font-bold text-fg-2">
            <span className="tnum text-lg font-black text-fg-1">{streak}</span> in a row
          </span>
        </div>

        <span className="hidden text-fg-3 sm:inline" aria-hidden="true">
          ·
        </span>

        <div className="flex items-center gap-2 text-sm font-bold text-fg-2">
          <Icon as={UI.Clock} size={16} />
          <span className="tnum">{clock}</span>
        </div>

        <span className="hidden text-fg-3 sm:inline" aria-hidden="true">
          ·
        </span>

        <div className="flex items-center gap-2 text-sm font-bold text-fg-2">
          <Icon as={UI.Zap} size={16} />
          <span className="tnum">{xp} XP</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm font-bold text-fg-3 md:inline">
            {dueCount} due of {total}
          </span>
          <span className="relative grid place-items-center">
            <MasteryRing percent={mastery} size={40} stroke={4} />
            <span className="tnum absolute text-2xs font-black text-fg-2">{mastery}%</span>
          </span>
          <button
            type="button"
            onClick={() => setShowStudio(true)}
            aria-label="Build a deck from your own lesson with AI"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-accent-magic/40 bg-accent-magic/10 px-3 text-sm font-bold text-accent-magic transition-colors hover:bg-accent-magic/20"
          >
            <Icon as={UI.Wand} size={16} />
            <span className="hidden sm:inline">AI deck</span>
          </button>
          <button
            type="button"
            onClick={() => setShowStats(true)}
            aria-label="Memory details for the current card"
            className="hidden h-10 items-center gap-2 rounded-xl border border-line-1 bg-control px-3 text-sm font-bold text-fg-2 transition-colors hover:text-fg-1 sm:inline-flex"
          >
            <Icon as={UI.Info} size={16} />
            Memory
          </button>
          <button
            type="button"
            onClick={() => setShowIndex(true)}
            aria-label="All cards in this deck"
            className="grid h-10 w-10 place-items-center rounded-xl border border-line-1 bg-control text-fg-2 transition-colors hover:text-fg-1"
          >
            <Icon as={UI.ChevronDown} size={18} />
          </button>
        </div>
      </div>

      {/* Two columns on a wide stage: the card, then the sections. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(380px,1fr)_minmax(520px,1.15fr)] lg:items-start">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <div
            onTouchStart={(event) => {
              dragStart.current = event.touches[0].clientX;
            }}
            onTouchEnd={(event) => {
              if (dragStart.current === null) return;
              const delta = event.changedTouches[0].clientX - dragStart.current;
              dragStart.current = null;
              if (Math.abs(delta) > 64) grade(delta > 0 ? 4 : 1, delta > 0 ? "known" : "learning");
            }}
            className={`relative transition-transform duration-300 ease-[var(--ease-expo-out)] ${flightClass}`}
          >
            <ParticleBurst trigger={burst.trigger} kind={burst.kind} />
            <Card3D cardRef={cardRef} tilt={{ x: 0, y: 0, scale: 1 }} isHovering={false} wobble={wobble} tier={TIER_FOR[item.difficulty ?? "B1"] ?? "B"}>
              <WordStage
                item={item}
                enrichment={enrichment}
                onSpeak={(recording) => {
                  void speakWord(item.front, { recording: recording ?? (enrichment.pronunciation.uk || enrichment.pronunciation.us), lang: "en-GB" });
                }}
                onImageFailed={() => setWobble(false)}
              />
            </Card3D>
          </div>

          {/*
           * The grading rail. Sticky at the bottom on a wide screen so a tutor can grade
           * without scrolling back up, which was the whole reason the old action buttons sat
           * inside the card.
           */}
          <div className="sticky bottom-0 z-30 -mx-1 grid grid-cols-2 gap-3 rounded-2xl border border-line-1 bg-panel/95 p-2 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <button
              type="button"
              onClick={() => grade(1, "learning")}
              onMouseEnter={() => {
                setWobble(true);
                sound("whoosh");
              }}
              onMouseLeave={() => setWobble(false)}
              className="flex min-h-16 flex-col items-start justify-center rounded-2xl border border-accent-bad/40 bg-accent-bad/10 px-4 text-left transition-colors hover:bg-accent-bad/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bad"
            >
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-accent-bad">
                <Icon as={UI.ChevronLeft} size={16} />
                Still learning
              </span>
              <span className="mt-0.5 text-base font-bold text-fg-2">Again, later in this lesson</span>
            </button>

            <button
              type="button"
              onClick={() => grade(4, "known")}
              onMouseEnter={() => {
                setWobble(true);
                sound("whoosh");
              }}
              onMouseLeave={() => setWobble(false)}
              className="flex min-h-16 flex-col items-end justify-center rounded-2xl border border-accent-good/40 bg-accent-good/10 px-4 text-right transition-colors hover:bg-accent-good/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-good"
            >
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-accent-good">
                Got it
                <Icon as={UI.ChevronRight} size={16} />
              </span>
              <span className="tnum mt-0.5 text-base font-bold text-fg-2">
                {memory && memory.interval > 0 ? `Next in ${memory.interval}d` : "New card"}
              </span>
            </button>
          </div>

          <p className="text-center text-xs font-medium text-fg-3">
            <kbd className="rounded border border-line-1 bg-inset px-1.5 py-0.5 font-mono">←</kbd> still learning ·{" "}
            <kbd className="rounded border border-line-1 bg-inset px-1.5 py-0.5 font-mono">space</kbd> hear it ·{" "}
            <kbd className="rounded border border-line-1 bg-inset px-1.5 py-0.5 font-mono">→</kbd> got it
          </p>
        </div>

        {/*
         * The twelve sections, as one stack. Reading the whole word is now a scroll rather
         * than eleven round trips, and each header carries the one-line description the tab
         * bar never had room for.
         */}
        <div className="flex flex-col gap-3">
          {visible.map((section) => (
            <Section
              key={section.id}
              def={section}
              open={open.has(section.id)}
              onToggle={() => {
                sound("click");
                toggle(section.id);
              }}
            >
              {section.id === "media" && (
                <div className="space-y-4">
                  <Panel>
                    <Label>Why this card is in the deck</Label>
                    <p className="text-base leading-relaxed text-fg-2 sm:text-lg">{item.definition ?? item.back}</p>
                  </Panel>
                  {item.example && (
                    <Panel>
                      <Label>In a sentence</Label>
                      <p className="text-lg font-medium italic leading-relaxed text-fg-1">"{item.example}"</p>
                    </Panel>
                  )}
                  {item.ccq && (
                    <Panel>
                      <Label>Check yourself</Label>
                      <p className="text-base leading-relaxed text-fg-2">{item.ccq}</p>
                    </Panel>
                  )}
                </div>
              )}

              {section.id === "definition" && (
                <div className="space-y-4">
                  {item.definition && (
                    <Panel>
                      <Label>Definition</Label>
                      <p className="text-base leading-relaxed text-fg-2 sm:text-lg">{item.definition}</p>
                    </Panel>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Panel>
                      <Label>Synonyms</Label>
                      <WordList
                        words={item.synonyms ?? enrichment.word.synonyms}
                        role="good"
                        empty={enrichment.loading ? "Looking them up…" : "None found."}
                      />
                    </Panel>
                    <Panel>
                      <Label>Antonyms</Label>
                      <WordList words={item.antonyms ?? enrichment.word.antonyms} role="bad" empty={enrichment.loading ? "Looking them up…" : "None found."} />
                    </Panel>
                  </div>
                  {item.ccq && (
                    <Panel>
                      <Label>Checking questions</Label>
                      <p className="text-base leading-relaxed text-fg-2">{item.ccq}</p>
                    </Panel>
                  )}
                </div>
              )}

              {section.id === "usage" && (
                <div className="space-y-4">
                  {item.usage && (
                    <Panel>
                      <Label>When and how to use it</Label>
                      <p className="text-base leading-relaxed text-fg-2 sm:text-lg">{item.usage}</p>
                    </Panel>
                  )}
                  {item.example && (
                    <Panel>
                      <Label>Model sentence</Label>
                      <p className="text-lg font-medium italic leading-relaxed text-fg-1">"{item.example}"</p>
                    </Panel>
                  )}
                  {(item.collocations ?? []).length > 0 && (
                    <Panel>
                      <Label>Collocations</Label>
                      <div className="flex flex-wrap gap-2">
                        {item.collocations!.map((collocation) => (
                          <Chip key={collocation} role="info">
                            {collocation}
                          </Chip>
                        ))}
                      </div>
                    </Panel>
                  )}
                </div>
              )}

              {section.id === "register" && <RegisterBody item={item} />}
              {section.id === "bilingual" && <BilingualBody item={item} onSpeak={(text, lang) => speakText(text, lang, 0.9)} />}
              {section.id === "challenge" && <ChallengeBody item={item} />}
              {section.id === "truthdare" && <TruthOrDareBody item={item} />}
              {section.id === "wyr" && <WouldYouBody item={item} />}
              {section.id === "cultural" && <CulturalBody item={item} enrichment={enrichment} />}
              {section.id === "movie" && <ScreenBody item={item} />}
              {section.id === "song" && <SongBody item={item} onSpeak={() => (item.song ? speakText(item.song, "en-GB", 0.9) : undefined)} />}
              {section.id === "joke" && <JokeBody item={item} onSpeak={() => (item.joke ? speakText(item.joke, "en-GB", 0.9) : undefined)} />}
            </Section>
          ))}

          <p className="pt-1 text-center text-xs font-medium text-fg-3 lg:text-left">
            Heads-up: the UK and US recordings, the extra senses and the quotations are fetched live from Wiktionary, Wikiquote and Wikipedia.
          </p>
        </div>
      </div>

      {/* All cards */}
      {showIndex && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--surface-scrim)" }}
          role="dialog"
          aria-modal="true"
          aria-label="All cards"
          onClick={() => setShowIndex(false)}
        >
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line-1 bg-panel p-5 shadow-[var(--shadow-card)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black text-fg-1">{data.title ?? "All cards"}</h2>
              <button type="button" onClick={() => setShowIndex(false)} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-xl border border-line-1 bg-control text-fg-2">
                <Icon as={UI.X} size={18} />
              </button>
            </div>
            <ul className="space-y-2">
              {queue.map((entry, entryIndex) => {
                const badge = badgeFor(store[entry.id]);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setIndex(entryIndex);
                        setShowIndex(false);
                        setOpen(new Set(["media"]));
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        entryIndex === index ? "border-accent-info/50 bg-accent-info/10" : "border-line-1 bg-inset hover:border-line-2"
                      }`}
                    >
                      <TierGlyph tier={TIER_FOR[entry.difficulty ?? "B1"] ?? "B"} size={14} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold text-fg-1">{entry.front}</span>
                        <span className="block truncate text-sm text-fg-3">{entry.back}</span>
                      </span>
                      <Chip role={badge.role}>{badge.label}</Chip>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Memory details */}
      {showStats && memory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--surface-scrim)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Memory details"
          onClick={() => setShowStats(false)}
        >
          <div className="w-full max-w-md rounded-3xl border border-line-1 bg-panel p-6 shadow-[var(--shadow-card)]" onClick={(event) => event.stopPropagation()}>
            <h2 className="mb-4 text-2xl font-black text-fg-1">{item.front}</h2>
            <dl className="space-y-2">
              {[
                { label: "State", value: memory.state },
                { label: "Difficulty", value: memory.difficulty.toFixed(1) },
                { label: "Stability", value: `${memory.stability.toFixed(1)} days` },
                { label: "Reviews", value: String(memory.reps) },
                { label: "Lapses", value: String(memory.lapses) },
                { label: "Next review", value: dueIn(memory) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 rounded-xl border border-line-1 bg-inset px-4 py-2.5">
                  <dt className="text-sm font-bold text-fg-3">{row.label}</dt>
                  <dd className="text-base font-black capitalize text-fg-1">{row.value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={() => setShowStats(false)}
              className="mt-4 min-h-12 w-full rounded-xl border border-line-1 bg-control text-base font-bold text-fg-2"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showStudio && <DeckStudio deck={data} onApply={applyDeck} onUseSample={useSampleDeck} onClose={() => setShowStudio(false)} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * The deck studio — bring your own lesson
 * ───────────────────────────────────────────────────────────── */

/**
 * Two steps, in the order a tutor actually does them: copy a prompt, then paste the reply.
 *
 * The panel is deliberately a dialog and not a settings row. It is used between lessons rather
 * than during one, and a tutor who opens it mid-card must be able to abandon it without losing
 * the session behind it — which is why nothing here touches the SRS store until "Build cards"
 * is pressed and the JSON parses.
 */
function DeckStudio({
  deck,
  onApply,
  onUseSample,
  onClose,
}: {
  deck: Payload;
  onApply: (next: Payload) => void;
  onUseSample: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [count, setCount] = useState(10);
  const [nativeLang, setNativeLang] = useState(deck.nativeLang ?? "Spanish");
  const [note, setNote] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [copied, setCopied] = useState<"prompt" | "template" | null>(null);

  const copy = async (what: "prompt" | "template") => {
    const payloadText = what === "prompt" ? buildAiPrompt({ count, nativeLang }) : buildJsonTemplate();
    const ok = await copyText(payloadText);
    setCopied(ok ? what : null);
    setNote(
      ok
        ? {
            kind: "ok",
            text:
              what === "prompt"
                ? "Prompt copied. Paste it into your AI chat, then add the lesson text or attach the PDF underneath it in the same message."
                : "JSON skeleton copied. Fill it in and paste it back here.",
          }
        : { kind: "err", text: "The browser blocked the clipboard. Select the text below and copy it with Ctrl+C." }
    );
  };

  const build = () => {
    const result = parseAiDeck(draft, deck.title);
    if (!result.deck) {
      setNote({ kind: "err", text: result.error ?? "The deck could not be read." });
      return;
    }
    onApply(result.deck);
    setDraft("");
    setNote({
      kind: "ok",
      text: `Loaded ${result.cardCount} card${result.cardCount === 1 ? "" : "s"} from "${result.deck.title}".${
        result.warnings.length ? ` ${result.warnings.join(" ")}` : ""
      }`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--surface-scrim)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Build a deck with AI"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line-1 bg-panel p-5 shadow-[var(--shadow-card)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-fg-1">Build a deck with AI</h2>
            <p className="mt-1 text-sm font-medium text-fg-3">
              Your own lesson vocabulary, in the same twelve sections.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line-1 bg-control text-fg-2"
          >
            <Icon as={UI.X} size={18} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line-1 bg-inset px-4 py-3">
          <Chip role="info">{deck.items.length} cards in play</Chip>
          <span className="truncate text-sm font-bold text-fg-2">{deck.title ?? "Untitled deck"}</span>
        </div>

        {/* Step 1 — the prompt */}
        <section className="rounded-2xl border border-line-1 bg-inset p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-magic text-sm font-black text-white">1</span>
            <h3 className="text-lg font-black text-fg-1">Copy the AI prompt</h3>
          </div>
          <p className="mt-2 text-sm font-medium text-fg-3">
            Open ChatGPT, Gemini or Claude, paste this, then add your lesson text underneath it — or attach the PDF in
            the same message. The prompt tells the AI the exact wording for every section, so the reply drops straight in.
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-fg-3">
              Cards
              <input
                type="number"
                min={4}
                max={30}
                value={count}
                onChange={(event) => setCount(Math.min(30, Math.max(4, Number(event.target.value) || 10)))}
                className="h-11 w-24 rounded-xl border border-line-1 bg-control px-3 text-base font-bold text-fg-1"
              />
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-bold text-fg-3">
              Translations into
              <input
                type="text"
                value={nativeLang}
                onChange={(event) => setNativeLang(event.target.value)}
                placeholder="Spanish"
                className="h-11 rounded-xl border border-line-1 bg-control px-3 text-base font-bold text-fg-1"
              />
            </label>
            <button
              type="button"
              onClick={() => void copy("prompt")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent-magic px-5 text-base font-black text-white transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-magic"
            >
              <Icon as={copied === "prompt" ? UI.Check : UI.Clipboard} size={18} />
              {copied === "prompt" ? "Copied" : "Copy AI prompt"}
            </button>
          </div>
        </section>

        {/* Step 2 — the reply */}
        <section className="mt-4 rounded-2xl border border-line-1 bg-inset p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-info text-sm font-black text-white">2</span>
            <h3 className="text-lg font-black text-fg-1">Paste the deck JSON back</h3>
          </div>
          <p className="mt-2 text-sm font-medium text-fg-3">
            Copy the AI's whole reply — code fences and all — and paste it here. The importer repairs small
            differences and tells you about anything it had to drop.
          </p>

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={7}
            spellCheck={false}
            aria-label="Deck JSON"
            placeholder={'{\n  "title": "Unit 4 — Travel and Delays",\n  "items": [ { "front": "layover", "back": "a wait between flights" } ]\n}'}
            className="mt-3 w-full resize-y rounded-xl border border-line-1 bg-control p-3 font-mono text-sm text-fg-1"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={build}
              disabled={!draft.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent-info px-5 text-base font-black text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon as={UI.Sparkles} size={18} />
              Build cards
            </button>
            <button
              type="button"
              onClick={() => void copy("template")}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-1 bg-control px-4 text-sm font-bold text-fg-2"
            >
              <Icon as={copied === "template" ? UI.Check : UI.FileText} size={16} />
              {copied === "template" ? "Copied" : "Copy JSON skeleton"}
            </button>
            <button
              type="button"
              onClick={() => {
                onUseSample();
                setNote({ kind: "info", text: "Back to the sample deck." });
              }}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl border border-line-1 bg-control px-4 text-sm font-bold text-fg-2"
            >
              <Icon as={UI.RotateCcw} size={16} />
              Use the sample deck
            </button>
          </div>
        </section>

        {note && (
          <p
            role="status"
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
              note.kind === "err"
                ? "border-accent-bad/40 bg-accent-bad/10 text-accent-bad"
                : note.kind === "ok"
                  ? "border-accent-good/40 bg-accent-good/10 text-accent-good"
                  : "border-line-1 bg-inset text-fg-2"
            }`}
          >
            {note.text}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-12 w-full rounded-xl border border-line-1 bg-control text-base font-bold text-fg-2"
        >
          Done
        </button>
      </div>
    </div>
  );
}
