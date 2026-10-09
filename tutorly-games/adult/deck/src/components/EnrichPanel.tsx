/**
 * The live word panel.
 *
 * This is the surface for `lib/enrich.ts`: on the back of every card it shows how the
 * word sounds, what else it relates to, where it came from and how people actually use
 * it. Everything here degrades — a word with no phonetics still renders its rhymes, and
 * a device with no network shows what was cached plus an honest note about what was not.
 *
 * The interaction that matters most is the audio button. IPA is useful to a teacher and
 * close to useless to a learner: hearing the word is the part that transfers. So the
 * recording is the first thing in the panel, and it is a real button rather than an
 * icon decoration.
 *
 * Colour here is a *fixed light* palette, not the themed ink ramp, for the same reason
 * the card back is: this panel only ever renders inside the answer face, and the answer
 * face is light in both themes. Reading a themed token would let the two disagree —
 * white-on-white in the dark theme — which is exactly the bug the light theme was
 * written to fix.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Icon, UI } from "./Glyphs";
import { type WordEnrichment, emptyEnrichment, enrichWord, getCachedEnrichment, hasEnrichment } from "../lib/enrich";

type Status = "idle" | "loading" | "ready" | "offline" | "empty";

export function EnrichPanel({
  word,
  l1 = "es",
  autoFetch = true,
  className = "",
}: {
  word: string;
  l1?: string;
  autoFetch?: boolean;
  className?: string;
}) {
  const [data, setData] = useState<WordEnrichment | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [justFetched, setJustFetched] = useState(false);
  /**
   * Which audio candidate to use, and whether any of them worked.
   *
   * Wikimedia paths are constructed from the word rather than looked up, so a 404 is a
   * normal outcome. Walking the list and hiding the button when every candidate fails
   * turns a broken control into an absent one.
   */
  const [audioIndex, setAudioIndex] = useState(0);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /*
   * One fetch per word, cancelled on change.
   *
   * The abort is the important half: without it, a slow response for the previous card
   * lands after the learner has already flipped to the next one and overwrites the
   * panel with the wrong word's data.
   */
  useEffect(() => {
    if (!word) return;
    let cancelled = false;
    const controller = new AbortController();

    const cached = getCachedEnrichment(word);
    if (cached) {
      // A cache hit renders instantly and then revalidates in the background.
      setData(cached);
      setStatus("ready");
      if (!autoFetch) return () => controller.abort();
    } else {
      setData(emptyEnrichment(word));
      setStatus(autoFetch ? "loading" : "idle");
      if (!autoFetch) return () => controller.abort();
    }

    enrichWord(word, { l1, signal: controller.signal })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        if (hasEnrichment(result)) {
          setStatus("ready");
          setJustFetched(true);
          // The badge fades on its own; nothing else needs to know.
          setTimeout(() => setJustFetched(false), 2200);
        } else {
          // Every source failed, which in practice means no network.
          setStatus("offline");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [word, l1, autoFetch]);

  // A new word means a new set of candidates.
  useEffect(() => {
    setAudioIndex(0);
    setAudioAvailable(true);
  }, [word]);

  const candidates = data?.audioCandidates?.length ? data.audioCandidates : data?.audioUrl ? [data.audioUrl] : [];

  const playAudio = () => {
    if (!candidates.length) return;
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;

    // Advance on failure, so a 404 falls through to the next candidate rather than
    // presenting a button that does nothing.
    audio.onerror = () => {
      if (audioIndex < candidates.length - 1) setAudioIndex((index) => index + 1);
      else setAudioAvailable(false);
    };

    if (audio.src !== candidates[audioIndex]) audio.src = candidates[audioIndex];
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay policies can block this; the gesture that got here usually permits it,
      // but a failure must stay silent rather than throw.
    });
  };

  if (status === "loading") return <Skeleton className={className} />;

  if (status === "offline") {
    return (
      <div className={`rounded-xl border border-amber-300 bg-amber-50 p-3 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
          <Icon as={UI.Warning} size={14} />
          Word lookups are unavailable
        </div>
        <p className="mt-1 text-2xs leading-relaxed text-slate-600">
          Connect to the internet to fetch pronunciation, rhymes and examples for “{word}”. Saved words keep their data offline.
        </p>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className={`rounded-xl border border-[var(--card-back-line)] bg-white p-3 text-xs text-slate-600 ${className}`}>
        Word lookups are off. Turn on <span className="font-bold text-slate-800">Live word lookups</span> in settings to fetch them.
      </div>
    );
  }

  if (!data) return null;

  const sources = data.answered.length ? data.answered.join(" · ") : "";

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Pronunciation — the headline of the panel. */}
      <div className="flex flex-wrap items-center gap-2">
        {data.phonetic ? (
          <span className="font-mono text-base text-sky-800" title="International Phonetic Alphabet">
            {data.phonetic}
          </span>
        ) : null}
        {audioAvailable && (data.audioUrl || candidates.length) ? (
          <button
            type="button"
            onClick={playAudio}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-2xs font-bold text-sky-800 transition hover:bg-sky-100"
            aria-label={`Play the pronunciation of ${word}`}
          >
            <Icon as={UI.Volume} size={12} />
            Hear it
          </button>
        ) : null}
        {justFetched ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-bold text-emerald-800"
          >
            fetched live
          </motion.span>
        ) : null}
      </div>

      {/* Definitions, grouped the way a dictionary groups them. */}
      {data.meanings.length ? (
        <section>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-emerald-700">
            <Icon as={UI.BookOpen} size={12} /> Definitions
          </h4>
          <div className="space-y-2">
            {data.meanings.slice(0, 4).map((meaning, index) => (
              <div key={index}>
                <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-2xs italic text-slate-600">{meaning.partOfSpeech}</span>
                <ol className="mt-1 list-inside list-decimal space-y-0.5 pl-1 text-sm leading-relaxed text-slate-700">
                  {meaning.definitions.slice(0, 3).map((definition, dIndex) => (
                    <li key={dIndex}>
                      {definition.definition}
                      {definition.example ? <span className="text-slate-500"> — “{definition.example}”</span> : null}
                      {definition.synonyms?.length ? (
                        <span className="ml-1 text-2xs text-slate-500">≈ {definition.synonyms.slice(0, 4).join(", ")}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Etymology — the field the card design always had and nothing ever filled. */}
      {data.etymology ? (
        <section>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-purple-700">
            <Icon as={UI.Scroll} size={12} /> Where it comes from
          </h4>
          <p className="text-sm leading-relaxed text-slate-700">{data.etymology.text}</p>
        </section>
      ) : null}

      {/* Sound relations — the part that genuinely helps a learner remember. */}
      {data.rhymes.length || data.soundsLike.length || data.collocations.length ? (
        <section className="space-y-2">
          {data.rhymes.length ? <ChipRow label="Rhymes" color="#60a5fa" words={data.rhymes} /> : null}
          {data.nearRhymes.length ? <ChipRow label="Near rhymes" color="#818cf8" words={data.nearRhymes} /> : null}
          {data.soundsLike.length ? <ChipRow label="Sounds like" color="#a78bfa" words={data.soundsLike} /> : null}
          {data.collocations.length ? <ChipRow label="Often paired with" color="#34d399" words={data.collocations} /> : null}
          {data.similar.length ? <ChipRow label="Related" color="#fbbf24" words={data.similar} /> : null}
        </section>
      ) : null}

      {/* Real usage. Tatoeba's sentences beat dictionary examples because they are
          actual human writing rather than an illustration of a definition. */}
      {data.sentences.length ? (
        <section>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-sky-700">
            <Icon as={UI.Newspaper} size={12} /> In the wild
          </h4>
          <ul className="space-y-1">
            {data.sentences.map((sentence, index) => (
              <li key={index} className="rounded-lg border-l-2 border-sky-300 bg-white py-1 pl-2 text-sm italic leading-relaxed text-slate-700">
                {sentence.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.translations.length ? (
        <section>
          <h4 className="mb-1 flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-blue-700">
            <Icon as={UI.Globe} size={12} /> {data.translations[0].lang}
          </h4>
          <p className="text-sm text-slate-700">{data.translations[0].text}</p>
        </section>
      ) : null}

      {sources ? (
        <p className="pt-1 text-2xs text-slate-500">
          via {sources}
          {data.failed.length ? ` · ${data.failed.length} source${data.failed.length === 1 ? "" : "s"} unavailable` : ""}
        </p>
      ) : null}
    </div>
  );
}

/** A labelled strip of related words. Words are shown, not linked: no dead ends. */
function ChipRow({ label, words, color }: { label: string; words: string[]; color: string }) {
  return (
    <div>
      {/*
       * The label is darkened for the same reason the chips are, and it was missed.
       *
       * The palette these accents come from is tuned to glow on a near-black stage, so on
       * the white answer face the raw value is a *pale smudge*: amber at 1.7:1, emerald at
       * 1.9:1, violet at 2.7:1 — all well under the 4.5:1 a 13px label needs, and these are
       * the headings a learner scans to find the row they want. Mixing the accent 45% into
       * the primary ink keeps the hue that tells the rows apart and lands every one of them
       * between 6:1 and 8.4:1.
       */}
      <h4
        className="mb-1 text-2xs font-black uppercase tracking-wider"
        style={{ color: `color-mix(in oklab, ${color} 45%, #0b1220)` }}
      >
        {label}
      </h4>
      <div className="flex flex-wrap gap-1">
        {words.slice(0, 8).map((word) => (
          <span
            key={word}
            className="rounded-full border px-2 py-0.5 text-2xs"
            // Darkened before use: the caller's accent is tuned for a dark surface and
            // would be a pale smudge on the white answer face.
            style={{ borderColor: `${color}55`, background: `${color}1a`, color: `color-mix(in oklab, ${color} 55%, #0b1220)` }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The loading state.
 *
 * Shaped like the content it replaces rather than a spinner, so the card does not
 * visibly jump when the data lands.
 */
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="h-3 w-20 rounded bg-slate-200" />
        <div className="h-5 w-16 rounded-full bg-slate-200" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2 w-24 rounded bg-slate-200" />
        <div className="h-2.5 w-full rounded bg-slate-200" />
        <div className="h-2.5 w-4/5 rounded bg-slate-200" />
      </div>
      <div className="flex gap-1">
        {[58, 44, 66, 38].map((width) => (
          <div key={width} className="h-4 rounded-full bg-slate-200" style={{ width }} />
        ))}
      </div>
      <span className="sr-only">Loading word details</span>
    </div>
  );
}
