"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { formatTime } from "@/modules/lessons/types";
import { Button, Card, cx, Pill, ProgressBar } from "@/components/ui";

export type VocabRow = {
  id: string;
  word: string;
  translation: string | null;
  definition: string | null;
  example: string | null;
  status: string;
  mastery: number;
  cefr: string | null;
  sourceEpisodeId: string | null;
  sourceTimestamp: number | null;
  nextReviewAt: string | null;
  reviewCount: number;
  intervalDays: number;
};

const STATUS_COLOR: Record<string, string> = { new: "#94a3b8", learning: "#fbbf24", review: "#60a5fa", known: "#34d399", mastered: "#c084fc", needsReview: "#fb7185" };

export function VocabularyTrainer({ initial, episodeTitles }: { initial: VocabRow[]; episodeTitles: Record<string, string> }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<string>("all");
  const [reviewing, setReviewing] = useState(false);
  const [queue, setQueue] = useState<VocabRow[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const now = Date.now();
  const due = useMemo(() => items.filter((i) => i.nextReviewAt && new Date(i.nextReviewAt).getTime() <= now && i.status !== "mastered"), [items, now]);
  const shown = items.filter((i) => filter === "all" || i.status === filter || (filter === "due" && due.includes(i)));
  const counts = items.reduce<Record<string, number>>((a, i) => ((a[i.status] = (a[i.status] ?? 0) + 1), a), {});

  const startReview = () => {
    setQueue(due.length ? [...due] : [...items].sort(() => Math.random() - 0.5).slice(0, 10));
    setReviewing(true);
    setFlipped(false);
    setDoneCount(0);
  };
  const grade = async (quality: number) => {
    const current = queue[0];
    const res = await fetch("/api/vocabulary", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: current.id, quality }) });
    if (res.ok) {
      const { item } = (await res.json()) as { item: VocabRow };
      setItems((all) => all.map((i) => (i.id === item.id ? { ...item, nextReviewAt: item.nextReviewAt ? new Date(item.nextReviewAt).toISOString() : null } : i)));
    }
    setQueue((q) => q.slice(1));
    setDoneCount((d) => d + 1);
    setFlipped(false);
  };
  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  if (reviewing) {
    const current = queue[0];
    const total = doneCount + queue.length;
    if (!current)
      return (
        <Card className="mx-auto max-w-lg text-center">
          <div className="text-5xl">🎉</div>
          <h2 className="mt-2 text-2xl font-bold">Review complete</h2>
          <p className="mt-1 text-sm text-zinc-400">{doneCount} words reviewed. Intervals were rescheduled with spaced repetition.</p>
          <Button className="mt-5" onClick={() => setReviewing(false)}>Back to list</Button>
        </Card>
      );
    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
          <span>{doneCount + 1} / {total}</span>
          <button type="button" onClick={() => setReviewing(false)} className="hover:text-white">Exit</button>
        </div>
        <ProgressBar value={(doneCount / total) * 100} className="mb-4" />
        <button type="button" onClick={() => setFlipped((f) => !f)} className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 p-8 text-center">
          {!flipped ? (
            <>
              <div className="text-4xl font-black">{current.word}</div>
              {current.example && <p className="mt-4 text-sm italic text-zinc-300">“{current.example.replace(new RegExp(current.word, "ig"), "____")}”</p>}
              <p className="mt-6 text-xs uppercase tracking-widest text-zinc-400">tap to reveal</p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{current.word}</div>
              {current.definition && <p className="mt-2 text-base text-zinc-100">{current.definition}</p>}
              {current.translation && <p className="mt-1 text-fuchsia-200">{current.translation}</p>}
              {current.example && <p className="mt-3 text-sm italic text-zinc-300">“{current.example}”</p>}
              {current.sourceEpisodeId && <p className="mt-2 text-xs text-zinc-500">{episodeTitles[current.sourceEpisodeId] ?? "Episode"} · {formatTime(current.sourceTimestamp ?? 0)}</p>}
            </>
          )}
        </button>
        <div className="mt-3 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => speak(current.word)}><Volume2 size={14} /> Hear it</Button>
        </div>
        {flipped && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ["Again", 1, "danger"],
              ["Hard", 3, "outline"],
              ["Good", 4, "primary"],
              ["Easy", 5, "success"],
            ].map(([label, q, v]) => (
              <Button key={label as string} variant={v as "danger" | "outline" | "primary" | "success"} onClick={() => grade(q as number)}>
                {label as string}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={startReview} disabled={!items.length}>
          {due.length ? `Review ${due.length} due` : "Practice 10 random"}
        </Button>
        <div className="ml-auto flex flex-wrap gap-1">
          {["all", "due", "new", "learning", "review", "needsReview", "known", "mastered"].map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cx("rounded-full px-2.5 py-1 text-xs capitalize", filter === f ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400 hover:text-white")}>
              {f === "needsReview" ? "needs review" : f} {f === "all" ? items.length : f === "due" ? due.length : (counts[f] ?? 0)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((v) => (
          <Card key={v.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-lg font-bold">{v.word}</div>
                {v.translation && <div className="text-sm text-fuchsia-200">{v.translation}</div>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Pill color={STATUS_COLOR[v.status] ?? "#94a3b8"}>{v.status === "needsReview" ? "needs review" : v.status}</Pill>
                {v.cefr && <Pill color="#94a3b8">{v.cefr}</Pill>}
              </div>
            </div>
            {v.definition && <p className="text-sm text-zinc-300">{v.definition}</p>}
            {v.example && <p className="text-xs italic text-zinc-400">“{v.example}”</p>}
            <div className="mt-auto flex items-center gap-2 text-[11px] text-zinc-500">
              <ProgressBar value={v.mastery} className="w-20" height={4} color={STATUS_COLOR[v.status]} /> {v.mastery}% · {v.reviewCount} reviews
              {v.sourceEpisodeId && (
                <Link href={`/watch/${v.sourceEpisodeId}`} className="ml-auto text-violet-300 hover:underline">
                  {episodeTitles[v.sourceEpisodeId] ?? "Episode"} {v.sourceTimestamp != null && `· ${formatTime(v.sourceTimestamp)}`}
                </Link>
              )}
            </div>
          </Card>
        ))}
        {!shown.length && <p className="text-sm text-zinc-500">No words here yet — click any word in the subtitles or transcript to save it.</p>}
      </div>
    </div>
  );
}
