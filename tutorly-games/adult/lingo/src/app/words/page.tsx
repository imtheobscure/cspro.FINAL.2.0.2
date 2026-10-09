"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PageShell, SectionTitle, ContentStatus, EmptyPackNotice, pill } from "@/components/ui";
import { useContent } from "@/lib/content-provider";
import { useStore, SRS_KEY } from "@/lib/store";
import { speak } from "@/lib/audio";
import { refAnchor, useFocusScroll } from "@/lib/ref-link";
import { RaceQuiz } from "@/components/RaceQuiz";
import { buildVocabRace } from "@/lib/race";
import type { VocabEntry } from "@/content/tutolingo";

type SrsMap = Record<string, { nextReview: string; reps: number }>;
type Filter = "all" | "learned" | "due" | "hard";
type Mode = "list" | "flashcards" | "race";

const LADDER_DAYS = [1, 3, 7, 14, 30];

export function VocabularyView({ focus }: { focus?: string } = {}) {
  const { pack, loading } = useContent();
  const { state, update, addXp } = useStore();
  const [mode, setMode] = useState<Mode>("list");
  const [filter, setFilter] = useState<Filter>("all");
  // A deep link from a lesson pre-filters the list so the entry is on screen.
  const [search, setSearch] = useState(focus ?? "");
  const [page, setPage] = useState(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [srs, setSrs] = useState<SrsMap>({});
  const PAGE_SIZE = 24;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SRS_KEY);
      if (raw) setSrs(JSON.parse(raw) as SrsMap);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => setPage(0), [filter, search]);

  const learned = useMemo(() => new Set(state.wordsLearned.map((w) => w.toLowerCase())), [state.wordsLearned]);
  const dueTerms = useMemo(() => {
    const now = Date.now();
    return new Set(Object.entries(srs).filter(([, v]) => new Date(v.nextReview).getTime() <= now).map(([k]) => k));
  }, [srs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pack.vocabulary.filter((w) => {
      if (q && !(w.term.toLowerCase().includes(q) || (w.translation ?? "").toLowerCase().includes(q) || (w.definition ?? "").toLowerCase().includes(q))) return false;
      if (filter === "learned") return learned.has(w.term.toLowerCase());
      if (filter === "due") return dueTerms.has(w.term.toLowerCase());
      if (filter === "hard") return !learned.has(w.term.toLowerCase()) && dueTerms.has(w.term.toLowerCase());
      return true;
    });
  }, [pack.vocabulary, search, filter, learned, dueTerms]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const items = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  /**
   * The race uses whatever the search box and the filters have left, so “race me on
   * the words I keep getting wrong” is one tap away.
   */
  const raceQuestions = useMemo(() => buildVocabRace({ ...pack, vocabulary: filtered }), [pack, filtered]);

  useFocusScroll(focus, !loading && items.length > 0);

  function saveSrs(next: SrsMap) {
    setSrs(next);
    try {
      localStorage.setItem(SRS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function markKnown(term: string, known: boolean) {
    const key = term.toLowerCase();
    const current = srs[key] ?? { nextReview: new Date().toISOString(), reps: 0 };
    const reps = known ? current.reps + 1 : 0;
    const days = known ? LADDER_DAYS[Math.min(reps, LADDER_DAYS.length - 1)] : 1;
    saveSrs({ ...srs, [key]: { nextReview: new Date(Date.now() + days * 86400000).toISOString(), reps } });
    if (known) {
      if (!learned.has(key)) {
        update((s) => ({ ...s, wordsLearned: [...s.wordsLearned, key] }));
        addXp(2);
      }
    } else {
      update((s) => ({ ...s, wordsLearned: s.wordsLearned.filter((x) => x !== key) }));
    }
  }

  const tabs: Array<{ key: Filter; label: string }> = [
    { key: "all", label: `All (${pack.vocabulary.length})` },
    { key: "learned", label: `Learned (${state.wordsLearned.length})` },
    { key: "due", label: `Due now (${dueTerms.size}) ⏰` },
    { key: "hard", label: "Needs work" },
  ];

  return (
    <>
      <ContentStatus />
      <SectionTitle
        icon="📚"
        title="Vocabulary reference"
        sub={`${pack.vocabulary.length.toLocaleString("en-US")} words from your course material · every word the lessons use, in one place`}
      />

      <div className="card-light mb-3 rounded-3xl border-2 border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setMode("list")}
            className={`rounded-full px-4 py-1.5 text-xs font-black ${mode === "list" ? "bg-[#58CC02] text-white" : "bg-slate-100 text-slate-500"}`}
          >
            📋 Word list
          </button>
          <button
            onClick={() => setMode("flashcards")}
            className={`rounded-full px-4 py-1.5 text-xs font-black ${mode === "flashcards" ? "bg-[#1CB0F6] text-white" : "bg-slate-100 text-slate-500"}`}
          >
            🃏 Flashcards
          </button>
          <button
            onClick={() => setMode("race")}
            className={`rounded-full px-4 py-1.5 text-xs font-black ${mode === "race" ? "bg-[#FF9600] text-white" : "bg-slate-100 text-slate-500"}`}
          >
            ⏱️ Race against time
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search words, translations or definitions…"
          className="mt-2 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold outline-none focus:border-[#58CC02]"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-black ${filter === t.key ? "bg-[#58CC02] text-white" : "bg-slate-100 text-slate-500"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] font-bold text-slate-400">
          {filtered.length.toLocaleString("en-US")} results
          {mode === "list" ? ` · page ${page + 1} of ${totalPages}` : ""}
        </p>
      </div>

      {!pack.vocabulary.length && <EmptyPackNotice feature="vocabulary" />}

      {mode === "race" ? (
        <RaceQuiz
          questions={raceQuestions}
          storageKey="vocabulary"
          title="Vocabulary race"
          blurb="Every word in the current view, under the clock: meaning to word, word to meaning, gap-fill and listening. Answer fast to build a streak multiplier."
          accent="#FF9600"
          seconds={10}
        />
      ) : mode === "flashcards" ? (
        <Flashcards words={filtered} learned={learned} markKnown={markKnown} />
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((w: VocabEntry) => {
              const isOpen = revealed.has(w.term);
              const know = learned.has(w.term.toLowerCase());
              const record = srs[w.term.toLowerCase()];
              return (
                <div
                  key={w.term}
                  id={refAnchor("vocabulary", w.term)}
                  data-ref={w.term}
                  className={`card-light scroll-mt-24 rounded-3xl border-2 bg-white p-4 ${know ? "border-green-200" : "border-slate-200"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-latin text-xl font-black text-slate-800">{w.term}</p>
                      {w.pronunciation && <p className="font-latin text-xs text-slate-400">{w.pronunciation}</p>}
                      {w.translation && <p className="mt-0.5 text-sm text-slate-400">{w.translation}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {w.level && pill("blue", w.level)}
                      {w.pos && pill("slate", w.pos)}
                      {know && <span className="text-xs">✅</span>}
                    </div>
                  </div>

                  {w.nativeNote && <p className="mt-2 rounded-xl bg-slate-50 p-2 text-xs leading-5 text-slate-600">{w.nativeNote}</p>}
                  {w.definition && <p className="mt-2 text-sm text-slate-600">{w.definition}</p>}

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button onClick={() => speak(w.term)} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-500">
                      🔊 Pronounce
                    </button>
                    {w.example?.target && (
                      <button onClick={() => speak(w.example!.target)} className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
                        🎧 Example
                      </button>
                    )}
                    {w.example && (
                      <button
                        onClick={() =>
                          setRevealed((s) => {
                            const n = new Set(s);
                            if (n.has(w.term)) n.delete(w.term);
                            else n.add(w.term);
                            return n;
                          })
                        }
                        className="rounded-xl bg-yellow-50 px-3 py-1.5 text-xs font-black text-yellow-600"
                      >
                        {isOpen ? "Hide" : "Show example 👁"}
                      </button>
                    )}
                  </div>

                  {isOpen && w.example && (
                    <div className="animate-pop-in mt-2 rounded-2xl bg-slate-50 p-3">
                      <p className="font-latin text-sm font-bold text-slate-700">{w.example.target}</p>
                      {w.example.native && <p className="mt-0.5 text-xs text-slate-400">{w.example.native}</p>}
                      {record && (
                        <p className="mt-1 text-[11px] font-bold text-purple-500">
                          🔁 Rep {record.reps + 1} · next {new Date(record.nextReview).toLocaleDateString("en-US")}
                        </p>
                      )}
                    </div>
                  )}

                  {(w.collocations?.length || w.synonyms?.length || w.antonyms?.length) ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {w.collocations?.slice(0, 4).map((c) => pill("amber", c))}
                      {w.synonyms?.slice(0, 3).map((c) => pill("green", `≈ ${c}`))}
                      {w.antonyms?.slice(0, 3).map((c) => pill("purple", `≠ ${c}`))}
                    </div>
                  ) : null}

                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button onClick={() => markKnown(w.term, true)} className="btn-3d rounded-xl border-[#46A302] bg-[#58CC02] py-1.5 text-xs font-black text-white">
                      I know it ✓
                    </button>
                    <button onClick={() => markKnown(w.term, false)} className="btn-3d rounded-xl border-slate-300 bg-white py-1.5 text-xs font-black text-slate-500">
                      Not yet ✗
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!!pack.vocabulary.length && items.length === 0 && <p className="mt-6 text-center text-sm text-slate-400">Nothing matches that filter yet.</p>}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-3d rounded-xl border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-500">
                Previous
              </button>
              <span className="text-sm font-black text-slate-500">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-3d rounded-xl border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-500"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ------------------------------- flashcards ------------------------------- */

/** Same words as the list, one card at a time, for spaced-repetition review. */
function Flashcards({ words, learned, markKnown }: { words: VocabEntry[]; learned: Set<string>; markKnown: (term: string, known: boolean) => void }) {
  /** `null` = not shuffled yet. */
  const [order, setOrder] = useState<number[] | null>(null);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setOrder(words.map((_, i) => i));
    setPos(0);
    setFlipped(false);
  }, [words]);

  /**
   * Never index into an empty permutation. The deck used to render `order[pos]`
   * before the effect above had filled `order`, so switching to Flashcards threw and
   * the whole deck came out blank. The natural order is the safe default, and it is
   * also what makes the very first card show up instantly.
   */
  const list = order && order.length === words.length ? order : words.map((_, i) => i);
  const safePos = Math.min(pos, Math.max(0, list.length - 1));
  const card = words[list[safePos]];
  const known = card ? learned.has(card.term.toLowerCase()) : false;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (e.key === "ArrowRight") setPos((p) => Math.min(list.length - 1, p + 1));
      if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [list.length]);

  if (!words.length) return <p className="mt-6 text-center text-sm text-slate-400">No words match this filter.</p>;
  if (!card) return <p className="mt-6 text-center text-sm text-slate-400">No words match this filter.</p>;

  function shuffle() {
    const next = [...list];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
    setPos(0);
    setFlipped(false);
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-400">
        <span>
          Card {safePos + 1} of {list.length}
        </span>
        <span className="flex gap-2">
          <button onClick={shuffle} className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">
            🔀 Shuffle
          </button>
          <button
            onClick={() => {
              setFlipped((f) => !f);
            }}
            className="rounded-full bg-slate-100 px-3 py-1 text-slate-500"
          >
            🔄 Flip
          </button>
        </span>
      </div>

      <div className="[perspective:1200px]">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="relative block h-72 w-full text-left [transform-style:preserve-3d]"
          style={{ transition: "transform 0.5s", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          aria-label="Flashcard — tap to flip"
        >
          {/* Front */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-white p-6 text-center shadow-sm [backface-visibility:hidden]">
            <p className="font-latin text-3xl font-black text-slate-800">{card.term}</p>
            {card.pronunciation && <p className="font-latin mt-1 text-sm text-slate-400">{card.pronunciation}</p>}
            <div className="mt-3 flex gap-1.5">
              {card.pos && pill("slate", card.pos)}
              {card.level && pill("blue", card.level)}
            </div>
            {card.example?.target && <p className="font-latin mt-3 text-sm text-slate-500">“{card.example.target}”</p>}
            <p className="mt-4 text-[11px] font-bold text-slate-300">Tap the card — or press space — to see the meaning</p>
          </div>
          {/* Back */}
          <div className="absolute inset-0 flex flex-col justify-center overflow-y-auto rounded-3xl border-2 border-[#1CB0F6] bg-[#F2FAFF] p-6 [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
            <p className="font-latin text-2xl font-black text-[#1899D6]">{card.term}</p>
            {card.translation && <p className="font-latin mt-1 text-lg font-bold text-slate-700">{card.translation}</p>}
            {card.nativeNote && <p className="mt-2 text-sm leading-6 text-slate-600">{card.nativeNote}</p>}
            {card.definition && <p className="mt-2 text-sm text-slate-500">{card.definition}</p>}
            {card.example && (
              <div className="mt-3 rounded-2xl bg-white p-3">
                <p className="font-latin text-sm font-bold text-slate-700">{card.example.target}</p>
                {card.example.native && <p className="mt-0.5 text-xs text-slate-400">{card.example.native}</p>}
              </div>
            )}
            {!!card.collocations?.length && (
              <div className="mt-2 flex flex-wrap gap-1">
                {card.collocations.slice(0, 4).map((c) => pill("amber", c))}
              </div>
            )}
          </div>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <button onClick={() => setPos((p) => Math.max(0, p - 1))} disabled={safePos === 0} className="btn-3d rounded-2xl border-slate-300 bg-white py-3 text-sm font-black text-slate-500 disabled:opacity-40">
          ←
        </button>
        <button
          onClick={() => {
            markKnown(card.term, false);
            setFlipped(false);
            setPos((p) => Math.min(list.length - 1, p + 1));
          }}
          className="btn-3d rounded-2xl border-[#d33131] bg-[#FF4B4B] py-3 text-sm font-black text-white"
        >
          Not yet
        </button>
        <button
          onClick={() => {
            markKnown(card.term, true);
            setFlipped(false);
            setPos((p) => Math.min(list.length - 1, p + 1));
          }}
          className="btn-3d rounded-2xl border-[#46A302] bg-[#58CC02] py-3 text-sm font-black text-white"
        >
          I know it ✓
        </button>
        <button onClick={() => setPos((p) => Math.min(list.length - 1, p + 1))} disabled={safePos >= list.length - 1} className="btn-3d rounded-2xl border-slate-300 bg-white py-3 text-sm font-black text-slate-500 disabled:opacity-40">
          →
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-400">
        <button onClick={() => speak(card.term)} className="rounded-xl bg-blue-50 px-3 py-1.5 text-blue-500">
          🔊 Pronounce
        </button>
        <span>
          {known ? "✅ already marked as known" : "not marked yet"} · arrow keys + space work too
        </span>
      </div>
    </div>
  );
}

export default function WordsPage() {
  return (
    <PageShell wide>
      <VocabularyView />
    </PageShell>
  );
}
