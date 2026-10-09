"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PageShell, SectionTitle, ContentStatus, EmptyPackNotice, pill } from "@/components/ui";
import { useContent } from "@/lib/content-provider";
import { useStore } from "@/lib/store";
import { speak, playCorrect, playWrong } from "@/lib/audio";
import { AnswerFeedback } from "@/components/AnswerFeedback";
import { coachForGrammar } from "@/lib/lesson-engine";
import { contentL1Name } from "@/content/languages";
import { refAnchor, useFocusScroll } from "@/lib/ref-link";
import type { GrammarExercise, GrammarTopic } from "@/content/tutolingo";

interface BankRow extends GrammarExercise {
  topicId: number;
  topicTitle: string;
  topic: GrammarTopic;
  key: string;
}

function GrammarBank({ initialTopic }: { initialTopic?: number | "all" } = {}) {
  const { pack } = useContent();
  const { state, addXp } = useStore();
  const [topicId, setTopicId] = useState<number | "all">(initialTopic ?? "all");
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const l1Name = contentL1Name(state.l1, pack.meta.l1);
  const SIZE = 8;

  const rows = useMemo<BankRow[]>(
    () =>
      pack.grammar.flatMap((topic) =>
        (topic.exercises ?? []).map((ex, i) => ({
          ...ex,
          topicId: Number(topic.id ?? 0),
          topicTitle: topic.title,
          topic,
          key: `${topic.id ?? topic.title}-${i}`,
        })),
      ),
    [pack.grammar],
  );

  const filtered = topicId === "all" ? rows : rows.filter((r) => r.topicId === topicId);
  const totalPages = Math.max(1, Math.ceil(filtered.length / SIZE));
  const pageItems = filtered.slice(page * SIZE, page * SIZE + SIZE);

  if (!rows.length) return null;

  return (
    <div className="card-light mb-4 rounded-3xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-slate-800">🏦 Grammar exercise bank</h2>
        <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-black text-white">{rows.length.toLocaleString("en-US")} exercises</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          onClick={() => {
            setTopicId("all");
            setPage(0);
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-black ${topicId === "all" ? "bg-blue-500 text-white" : "bg-white text-slate-500"}`}
        >
          All
        </button>
        {pack.grammar.map((t) => (
          <button
            key={String(t.id ?? t.title)}
            onClick={() => {
              setTopicId(Number(t.id ?? 0));
              setPage(0);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${topicId === Number(t.id ?? 0) ? "bg-blue-500 text-white" : "bg-white text-slate-500"}`}
          >
            {t.title} ({(t.exercises ?? []).length})
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {pageItems.map((it) => {
          const chosen = answers[it.key];
          const options = it.options?.length ? it.options : [it.answer];
          const correct = chosen === it.answer;
          return (
            <div key={it.key} className="rounded-2xl border-2 border-white bg-white/80 p-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{it.topicTitle}</p>
              <p className="font-latin mt-0.5 text-sm font-bold text-slate-800">{it.prompt}</p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {options.map((o) => {
                  let cls = "border-slate-200 bg-white text-slate-600";
                  if (chosen) {
                    if (o === it.answer) cls = "tile-correct";
                    else if (chosen === o) cls = "tile-wrong";
                  }
                  return (
                    <button
                      key={o}
                      disabled={!!chosen}
                      onClick={() => {
                        setAnswers((a) => ({ ...a, [it.key]: o }));
                        if (o === it.answer) {
                          playCorrect();
                          addXp(3);
                        } else playWrong();
                      }}
                      className={`font-latin rounded-xl border-2 px-3 py-1.5 text-sm font-bold ${cls}`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <div className="mt-2">
                  <AnswerFeedback
                    status={correct ? "correct" : "wrong"}
                    coach={coachForGrammar(it.topic, it)}
                    answer={it.answer}
                    userAnswer={chosen}
                    l1Name={l1Name}
                    note={it.explanation}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-3d rounded-xl border-slate-300 bg-white px-4 py-1.5 text-xs font-black text-slate-500">
          Previous
        </button>
        <span className="text-xs font-black text-slate-500">
          {page + 1} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={(page + 1) * SIZE >= filtered.length}
          className="btn-3d rounded-xl border-slate-300 bg-white px-4 py-1.5 text-xs font-black text-slate-500"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function GrammarView({ focus }: { focus?: string } = {}) {
  const { pack, loading } = useContent();
  const { state, addXp } = useStore();
  const [open, setOpen] = useState<string | null>(pack.grammar[0] ? String(pack.grammar[0].id ?? 0) : null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const l1Name = contentL1Name(state.l1, pack.meta.l1);
  // A deep link from a lesson opens the grammar point it was about.
  const focusIdx = useMemo(
    () => (focus ? pack.grammar.findIndex((g) => g.title.trim().toLowerCase() === focus.trim().toLowerCase()) : -1),
    [focus, pack.grammar],
  );
  useEffect(() => {
    if (focusIdx < 0) return;
    const topic = pack.grammar[focusIdx];
    setOpen(String(topic.id ?? focusIdx));
  }, [focusIdx, pack.grammar]);
  useFocusScroll(focus, !loading && pack.grammar.length > 0, 460);
  const bankTopic: number | "all" = focusIdx >= 0 ? Number(pack.grammar[focusIdx].id ?? 0) : "all";

  return (
    <>
      <ContentStatus />
      <SectionTitle
        icon="📝"
        title="Grammar reference"
        sub={`${pack.grammar.length} grammar points with explanations, examples and exercises`}
      />

      {!pack.grammar.length && <EmptyPackNotice feature="grammar" />}

      <GrammarBank key={String(bankTopic)} initialTopic={bankTopic} />

      {!!pack.grammar.length && <h2 className="mb-2 font-black text-slate-800">📚 Grammar points</h2>}
      <div className="space-y-3">
        {pack.grammar.map((topic, ti) => {
          const id = String(topic.id ?? ti);
          const isOpen = open === id;
          return (
            <div
              key={id}
              id={refAnchor("grammar", topic.title)}
              data-ref={topic.title}
              className="card-light scroll-mt-24 overflow-hidden rounded-3xl border-2 border-slate-200 bg-white"
            >
              <button onClick={() => setOpen(isOpen ? null : id)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black text-white ${topic.level === "A2" ? "bg-[#1CB0F6]" : topic.level === "B1" ? "bg-[#58CC02]" : topic.level === "B2" ? "bg-[#8b5cf6]" : "bg-[#FF4B4B]"}`}>
                  {ti + 1}
                </span>
                <div className="flex-1">
                  <p className="font-black text-slate-800">{topic.title}</p>
                  <p className="text-xs text-slate-400">
                    {topic.level ?? "Mixed"}
                    {topic.structure ? ` · ${topic.structure}` : ""}
                  </p>
                </div>
                <span className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
              </button>

              {isOpen && (
                <div className="animate-pop-in border-t-2 border-slate-100 p-4">
                  <div className="rounded-2xl bg-blue-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-wide text-blue-500">Mini lesson</p>
                    <p className="mt-1 text-sm font-bold leading-7 text-slate-700">{topic.rule}</p>
                    {topic.nativeRule && <p className="mt-1 border-t border-blue-100 pt-1 text-sm leading-6 text-blue-600">{topic.nativeRule}</p>}
                  </div>

                  {!!topic.commonMistakes?.length && (
                    <div className="mt-3 rounded-2xl bg-red-50 p-3">
                      <p className="text-sm font-black text-red-500">⚠️ Common mistakes</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {topic.commonMistakes.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!topic.examples?.length && (
                    <>
                      <p className="mb-2 mt-4 text-sm font-black text-slate-700">📖 Examples</p>
                      <div className="overflow-hidden rounded-2xl border-2 border-slate-100">
                        {topic.examples.map((e, i) => (
                          <div key={`${e.target}-${i}`} className={`flex items-center gap-2 p-2.5 ${i % 2 ? "bg-slate-50" : "bg-white"}`}>
                            <button onClick={() => speak(e.target)} className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-sm" aria-label="Play example">
                              🔊
                            </button>
                            <div className="flex-1">
                              <p className="font-latin text-sm font-bold text-slate-800">{e.target}</p>
                              {e.native && <p className="text-xs text-slate-400">{e.native}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {!!(topic.exercises ?? []).length && (
                    <>
                      <p className="mb-2 mt-4 text-sm font-black text-slate-700">✍️ Exercises (+5 XP each)</p>
                      <div className="space-y-2">
                        {(topic.exercises ?? []).map((ex, qi) => {
                          const key = `${id}-${qi}`;
                          const chosen = answers[key];
                          const isChecked = checked[key];
                          const ok = (chosen ?? "").trim().toLowerCase() === ex.answer.trim().toLowerCase();
                          const options = ex.options?.length ? ex.options : null;
                          return (
                            <div key={key} className="rounded-2xl border-2 border-slate-100 p-3">
                              <p className="font-latin text-sm font-bold text-slate-800">{ex.prompt}</p>
                              {options ? (
                                <div className="mt-2 grid grid-cols-2 gap-1.5">
                                  {options.map((o) => {
                                    let cls = "border-slate-200 bg-white text-slate-600";
                                    if (chosen === o && !isChecked) cls = "tile-selected";
                                    if (isChecked && o === ex.answer) cls = "tile-correct";
                                    if (isChecked && chosen === o && o !== ex.answer) cls = "tile-wrong";
                                    return (
                                      <button
                                        key={o}
                                        disabled={isChecked}
                                        onClick={() => setAnswers((a) => ({ ...a, [key]: o }))}
                                        className={`font-latin rounded-xl border-2 px-2 py-2 text-sm font-bold ${cls}`}
                                      >
                                        {o}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <input
                                  value={chosen ?? ""}
                                  disabled={isChecked}
                                  onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                                  placeholder="Type your answer…"
                                  className="font-latin mt-2 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#58CC02]"
                                />
                              )}
                              {!isChecked ? (
                                <button
                                  onClick={() => {
                                    setChecked((c) => ({ ...c, [key]: true }));
                                    if (ok) {
                                      playCorrect();
                                      addXp(5);
                                    } else playWrong();
                                  }}
                                  disabled={!chosen}
                                  className="btn-3d mt-2 w-full rounded-xl border-[#46A302] bg-[#58CC02] py-2 text-sm font-black text-white disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  Check
                                </button>
                              ) : (
                                <div className="mt-2">
                                  <AnswerFeedback
                                    status={ok ? "correct" : "wrong"}
                                    coach={coachForGrammar(topic, ex)}
                                    answer={ex.answer}
                                    userAnswer={chosen ?? ""}
                                    l1Name={l1Name}
                                    note={ex.explanation}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function GrammarPage() {
  return (
    <PageShell>
      <GrammarView />
    </PageShell>
  );
}
