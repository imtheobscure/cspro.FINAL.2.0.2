"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell, SectionTitle, ContentStatus, EmptyPackNotice, PackSummary } from "@/components/ui";
import { useContent } from "@/lib/content-provider";
import { packCounts } from "@/content/tutolingo";
import { REF_TAB_ICON, REF_TAB_LABEL, isRefTab, type RefTab } from "@/lib/ref-link";
import { refExists } from "@/lib/lesson-refs";
import { VocabularyView } from "@/app/words/page";
import { GrammarView } from "@/app/grammar/page";
import { DialoguesView } from "@/app/conversation/page";
import { IdiomsView } from "@/app/idioms/page";

type TabId = "vocabulary" | "grammar" | "dialogues" | "idioms";

const TABS: { id: TabId; label: string; icon: string; blurb: string }[] = [
  { id: "vocabulary", label: REF_TAB_LABEL.vocabulary, icon: REF_TAB_ICON.vocabulary, blurb: "Every word in your course, with flashcards for review." },
  { id: "grammar", label: REF_TAB_LABEL.grammar, icon: REF_TAB_ICON.grammar, blurb: "All the grammar in one place — mini lessons plus tests." },
  { id: "dialogues", label: REF_TAB_LABEL.dialogues, icon: REF_TAB_ICON.dialogues, blurb: "The conversations from your course, with native voices." },
  { id: "idioms", label: REF_TAB_LABEL.idioms, icon: REF_TAB_ICON.idioms, blurb: "Idioms, slang and registers, sorted by how formal they are." },
];

function subCount(id: TabId, counts: ReturnType<typeof packCounts>): number {
  switch (id) {
    case "vocabulary":
      return counts.vocabulary;
    case "grammar":
      return counts.grammar;
    case "dialogues":
      return counts.conversations;
    case "idioms":
      return counts.idioms;
  }
}

function ReferencesInner() {
  const params = useSearchParams();
  const { pack } = useContent();
  const counts = packCounts(pack);
  const initial = params.get("tab");
  const [tab, setTab] = useState<TabId>(isRefTab(initial) ? initial : "vocabulary");
  /** The exact entry a lesson asked us to open (cleared when the learner switches tabs). */
  const [focus, setFocus] = useState<string | undefined>(() => params.get("focus") || undefined);
  /**
   * Whether the entry a deep link asked for actually exists in this pack, so the
   * banner never claims to show an entry that cannot be shown. Checked against
   * the pack data, which is instant and exact.
   */
  const focusFound = useMemo(() => (focus ? refExists(pack, tab, focus) : null), [pack, tab, focus]);

  // Keep the URL in sync so a tab (and entry) can be linked to directly.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== tab) {
      url.searchParams.set("tab", tab);
      if (!focus) url.searchParams.delete("focus");
      window.history.replaceState(null, "", url.toString());
    }
  }, [tab, focus]);

  function choose(next: TabId) {
    setFocus(undefined);
    setTab(next);
  }

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <>
      <SectionTitle
        icon="📖"
        title="References"
        sub="Everything that backs up your lessons — the same content as Home, gathered for study."
      />
      <ContentStatus />
      <EmptyPackNotice feature="reference" />

      <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => choose(t.id)}
              aria-pressed={active}
              className={`rounded-3xl border-2 p-3 text-left transition ${
                active
                  ? "border-[#58CC02] bg-[#E9FBD1] shadow-[0_3px_0_#46A302]"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{t.icon}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${active ? "bg-white text-[#4b9417]" : "bg-slate-100 text-slate-500"}`}>
                  {subCount(t.id, counts).toLocaleString("en-US")}
                </span>
              </div>
              <p className={`mt-1 text-sm font-black ${active ? "text-[#4b9417]" : "text-slate-700"}`}>{t.label}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <p className="rounded-2xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500">{current.blurb}</p>
        <div className="rounded-2xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500">
          Reference only — your Home path is where the graded practice lives.
        </div>
      </div>

      {focus && (
        <div
          className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-3 py-2 ${
            focusFound === false ? "border-amber-200 bg-amber-50" : "border-[#1CB0F6] bg-[#DDF4FF]"
          }`}
        >
          <p className={`text-xs font-black ${focusFound === false ? "text-amber-700" : "text-[#1899D6]"}`}>
            {focusFound === false
              ? `Nothing in your pack matches “${focus}” — showing all of ${REF_TAB_LABEL[tab as RefTab]} instead.`
              : `📌 Showing the entry for “${focus}” in ${REF_TAB_LABEL[tab as RefTab]}`}
          </p>
          <button
            onClick={() => {
              setFocus(undefined);
              const url = new URL(window.location.href);
              url.searchParams.delete("focus");
              window.history.replaceState(null, "", url.toString());
            }}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-[#1899D6]"
          >
            ✕ Clear
          </button>
        </div>
      )}

      <div className="animate-fade-in">
        {tab === "vocabulary" && <VocabularyView focus={focus} />}
        {tab === "grammar" && <GrammarView focus={focus} />}
        {tab === "dialogues" && <DialoguesView focus={focus} />}
        {tab === "idioms" && <IdiomsView focus={focus} />}
      </div>

      <div className="mt-8 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-black text-slate-700">📦 Loaded pack</p>
        <PackSummary />
      </div>
    </>
  );
}

export default function ReferencesPage() {
  return (
    <PageShell wide>
      <Suspense fallback={<div className="py-10 text-center text-sm font-bold text-slate-400">Loading references…</div>}>
        <ReferencesInner />
      </Suspense>
    </PageShell>
  );
}
