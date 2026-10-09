"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Mic, MicOff, Play, RotateCcw, Volume2 } from "lucide-react";
import type { ActivityBase, ActivityType, ChoiceOption, ComprehensionQuestion } from "@/modules/lessons/types";
import type { PlayerController } from "@/modules/player/store";
import { Button, cx } from "@/components/ui";

export type ActivityProps<T extends ActivityType = ActivityType> = {
  activity: ActivityBase<T>;
  onSubmit: (answer: unknown) => void;
  submitted: boolean;
  controller?: PlayerController | null;
};

/* ------------------------------------------------------------------ */
/* Speech helpers                                                      */
/* ------------------------------------------------------------------ */

type Recognition = {
  start(): void;
  stop(): void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function createRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function useSpeech(lang = "en-US") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<Recognition | null>(null);
  useEffect(() => {
    setSupported(!!createRecognition());
  }, []);
  const start = useCallback(() => {
    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0]?.transcript ?? "").join(" ");
      setTranscript(text.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setTranscript("");
    setListening(true);
    rec.start();
  }, [lang]);
  const stop = useCallback(() => recRef.current?.stop(), []);
  return { supported, listening, transcript, setTranscript, start, stop };
}

function speak(text: string, rate = 0.92) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  window.speechSynthesis.speak(u);
  return true;
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function Prompt({ children }: { children: ReactNode }) {
  return <p className="text-base font-medium leading-relaxed text-white sm:text-lg">{children}</p>;
}

function Options({ options, value, onChange, submitted, reveal = true }: { options: ChoiceOption[]; value: string | null; onChange: (id: string) => void; submitted: boolean; reveal?: boolean }) {
  return (
    <div className="grid gap-2" role="radiogroup">
      {options.map((o, i) => {
        const selected = value === o.id;
        const showCorrect = submitted && reveal && o.isCorrect;
        const showWrong = submitted && reveal && selected && !o.isCorrect;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={submitted}
            onClick={() => onChange(o.id)}
            className={cx(
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
              !submitted && "hover:border-white/30 hover:bg-white/10",
              selected && !submitted ? "border-violet-400 bg-violet-500/20" : "border-white/10 bg-white/5",
              showCorrect && "border-emerald-400 bg-emerald-500/20",
              showWrong && "border-rose-400 bg-rose-500/20",
            )}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-bold uppercase">{String.fromCharCode(65 + i)}</span>
            <span className="text-zinc-100">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function TextResponse({ placeholder, onSubmit, submitted, minLength = 3, allowSpeech = true }: { placeholder: string; onSubmit: (text: string) => void; submitted: boolean; minLength?: number; allowSpeech?: boolean }) {
  const [text, setText] = useState("");
  const speech = useSpeech();
  useEffect(() => {
    if (speech.transcript) setText(speech.transcript);
  }, [speech.transcript]);
  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitted}
        rows={3}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        {allowSpeech && speech.supported && (
          <Button variant="ghost" size="sm" type="button" onClick={speech.listening ? speech.stop : speech.start} disabled={submitted}>
            {speech.listening ? <MicOff size={14} /> : <Mic size={14} />} {speech.listening ? "Stop" : "Speak instead"}
          </Button>
        )}
        <Button size="sm" type="button" disabled={submitted || text.trim().length < minLength} onClick={() => onSubmit(text.trim())}>
          Submit
        </Button>
      </div>
    </div>
  );
}

function QuestionSet({ questions, onSubmit, submitted }: { questions: ComprehensionQuestion[]; onSubmit: (answers: Record<string, string>) => void; submitted: boolean }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const complete = questions.every((q) => answers[q.id]);
  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm font-semibold text-zinc-100">
            {i + 1}. {q.question}
          </p>
          <Options options={q.options} value={answers[q.id] ?? null} onChange={(id) => setAnswers((a) => ({ ...a, [q.id]: id }))} submitted={submitted} />
          {submitted && q.explanation && <p className="text-xs text-zinc-400">{q.explanation}</p>}
        </div>
      ))}
      {!submitted && (
        <Button type="button" disabled={!complete} onClick={() => onSubmit(answers)}>
          Check answers
        </Button>
      )}
    </div>
  );
}

function shuffle<T>(arr: T[], seed: number) {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------------ */
/* Activity components                                                 */
/* ------------------------------------------------------------------ */

function FlashcardActivity({ activity, onSubmit, submitted }: ActivityProps<"flashcard">) {
  const cards = activity.content.cards;
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(new Set([0]));
  const card = cards[i];
  const go = (n: number) => {
    const next = (n + cards.length) % cards.length;
    setI(next);
    setFlipped(false);
    setSeen((s) => new Set(s).add(next));
  };
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="relative mx-auto flex min-h-[190px] w-full max-w-md items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 p-6 text-center transition hover:border-white/30"
        aria-label="Flip card"
      >
        {!flipped ? (
          <div>
            <div className="text-3xl font-bold text-white">{card.front}</div>
            {card.pronunciation && <div className="mt-1 text-sm text-zinc-300">{card.pronunciation}</div>}
            <div className="mt-4 text-xs uppercase tracking-widest text-zinc-400">tap to flip</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-lg font-semibold text-white">{card.back}</div>
            {card.translation && <div className="text-base text-fuchsia-200">{card.translation}</div>}
            {card.example && <div className="text-sm italic text-zinc-300">“{card.example}”</div>}
          </div>
        )}
        <span className="absolute right-3 top-3 text-xs text-zinc-400">
          {i + 1}/{cards.length}
        </span>
      </button>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" type="button" onClick={() => go(i - 1)}>
          ← Prev
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => speak(card.front)}>
          <Volume2 size={14} /> Hear it
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => go(i + 1)}>
          Next →
        </Button>
      </div>
      {!submitted && (
        <Button type="button" className="w-full" disabled={seen.size < cards.length} onClick={() => onSubmit({ viewed: seen.size })}>
          {seen.size < cards.length ? `View all ${cards.length} cards to continue` : "Done — I've reviewed them"}
        </Button>
      )}
    </div>
  );
}

function MultipleChoiceActivity({ activity, onSubmit, submitted }: ActivityProps<"multipleChoice">) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <Prompt>{activity.content.question}</Prompt>
      <Options options={activity.content.options} value={value} onChange={setValue} submitted={submitted} />
      {!submitted && (
        <Button type="button" disabled={!value} onClick={() => onSubmit(value)}>
          Check answer
        </Button>
      )}
    </div>
  );
}

function TrueFalseActivity({ activity, onSubmit, submitted }: ActivityProps<"trueFalse">) {
  const [value, setValue] = useState<boolean | null>(null);
  const pick = (v: boolean) => {
    setValue(v);
    onSubmit(v);
  };
  const mark = (v: boolean) => (submitted ? (v === activity.content.answer ? "border-emerald-400 bg-emerald-500/20" : value === v ? "border-rose-400 bg-rose-500/20" : "") : "");
  return (
    <div className="space-y-4">
      <Prompt>{activity.content.question}</Prompt>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={submitted} onClick={() => pick(true)} className={cx("rounded-2xl border border-white/10 bg-white/5 py-5 text-lg font-bold text-white transition hover:bg-emerald-500/20", mark(true))}>
          ✅ True
        </button>
        <button type="button" disabled={submitted} onClick={() => pick(false)} className={cx("rounded-2xl border border-white/10 bg-white/5 py-5 text-lg font-bold text-white transition hover:bg-rose-500/20", mark(false))}>
          ❌ False
        </button>
      </div>
    </div>
  );
}

function FillBlanksActivity({ activity, onSubmit, submitted }: ActivityProps<"fillBlanks">) {
  const parts = activity.content.sentence.split("___");
  const [values, setValues] = useState<string[]>(() => activity.content.blanks.map(() => ""));
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="space-y-4">
      <p className="text-lg leading-loose text-white">
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < parts.length - 1 && (
              <input
                value={values[i]}
                disabled={submitted}
                onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
                className={cx(
                  "mx-1 inline-block w-32 rounded-lg border-b-2 bg-white/10 px-2 py-0.5 text-center text-base text-white focus:outline-none",
                  submitted ? (values[i].trim().toLowerCase() === activity.content.blanks[i].toLowerCase() ? "border-emerald-400" : "border-rose-400") : "border-violet-400",
                )}
                aria-label={`Blank ${i + 1}`}
                autoComplete="off"
              />
            )}
          </span>
        ))}
      </p>
      {activity.content.translation && <p className="text-sm text-zinc-400">{activity.content.translation}</p>}
      {submitted && <p className="text-sm text-emerald-300">Answer: {activity.content.blanks.join(", ")}</p>}
      <div className="flex flex-wrap gap-2">
        {activity.content.hint && !submitted && (
          <Button variant="ghost" size="sm" type="button" onClick={() => setShowHint(true)}>
            💡 {showHint ? activity.content.hint : "Hint"}
          </Button>
        )}
        {!submitted && (
          <Button type="button" size="sm" disabled={values.some((v) => !v.trim())} onClick={() => onSubmit(values.map((v) => v.trim()))}>
            Check
          </Button>
        )}
      </div>
    </div>
  );
}

function DragDropActivity({ activity, onSubmit, submitted }: ActivityProps<"dragDrop">) {
  const { items, targets, pairs } = activity.content;
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);
  const shuffled = useMemo(() => shuffle(items, items.length * 17), [items]);
  const assign = (itemId: string, targetId: string) => {
    setPlaced((p) => ({ ...p, [itemId]: targetId }));
    setActive(null);
  };
  const unplaced = shuffled.filter((i) => !placed[i.id]);
  const correctFor = (itemId: string) => pairs.find((p) => p.itemId === itemId)?.targetId;
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-300">Drag each item to a group — or tap an item, then tap a group.</p>
      <div className="flex min-h-[52px] flex-wrap gap-2 rounded-xl border border-dashed border-white/15 p-2">
        {unplaced.length === 0 && <span className="px-2 text-xs text-zinc-500">All items placed</span>}
        {unplaced.map((it) => (
          <button
            key={it.id}
            type="button"
            draggable={!submitted}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", it.id)}
            onClick={() => setActive(active === it.id ? null : it.id)}
            className={cx("cursor-grab rounded-lg border px-3 py-1.5 text-sm text-white", active === it.id ? "border-violet-400 bg-violet-500/30" : "border-white/10 bg-white/10")}
          >
            {it.text}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {targets.map((t) => (
          <div
            key={t.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id && !submitted) assign(id, t.id);
            }}
            onClick={() => active && assign(active, t.id)}
            className={cx("min-h-[96px] rounded-xl border p-3 transition", active ? "border-violet-400/70 bg-violet-500/10" : "border-white/10 bg-white/5")}
          >
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-300">{t.label}</div>
            <div className="flex flex-wrap gap-2">
              {items
                .filter((i) => placed[i.id] === t.id)
                .map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    disabled={submitted}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaced((p) => {
                        const n = { ...p };
                        delete n[i.id];
                        return n;
                      });
                    }}
                    className={cx("rounded-lg border px-3 py-1.5 text-sm text-white", submitted ? (correctFor(i.id) === t.id ? "border-emerald-400 bg-emerald-500/20" : "border-rose-400 bg-rose-500/20") : "border-white/10 bg-white/10")}
                  >
                    {i.text}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      {!submitted && (
        <Button type="button" disabled={unplaced.length > 0} onClick={() => onSubmit(placed)}>
          Check
        </Button>
      )}
    </div>
  );
}

function MatchingActivity({ activity, onSubmit, submitted }: ActivityProps<"matching">) {
  const pairs = activity.content.pairs;
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right), pairs.length * 31), [pairs]);
  const [left, setLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const usedRight = new Set(Object.values(matches));
  const choose = (r: string) => {
    if (!left) return;
    setMatches((m) => {
      const n = { ...m };
      for (const k of Object.keys(n)) if (n[k] === r) delete n[k];
      n[left] = r;
      return n;
    });
    setLeft(null);
  };
  const isCorrect = (l: string) => pairs.find((p) => p.left === l)?.right === matches[l];
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-300">Tap a word on the left, then its meaning on the right.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {pairs.map((p) => (
            <button
              key={p.left}
              type="button"
              disabled={submitted}
              onClick={() => setLeft(left === p.left ? null : p.left)}
              className={cx(
                "w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold text-white",
                left === p.left ? "border-violet-400 bg-violet-500/30" : matches[p.left] ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5",
                submitted && (isCorrect(p.left) ? "border-emerald-400 bg-emerald-500/20" : "border-rose-400 bg-rose-500/20"),
              )}
            >
              {p.left}
              {matches[p.left] && <span className="mt-1 block text-xs font-normal text-zinc-300">→ {matches[p.left]}</span>}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rights.map((r) => (
            <button
              key={r}
              type="button"
              disabled={submitted || !left}
              onClick={() => choose(r)}
              className={cx("w-full rounded-xl border px-3 py-2.5 text-left text-sm text-zinc-100", usedRight.has(r) ? "border-white/5 bg-white/[0.02] text-zinc-500" : left ? "border-violet-400/50 bg-white/5 hover:bg-violet-500/20" : "border-white/10 bg-white/5")}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {!submitted && (
        <Button type="button" disabled={Object.keys(matches).length < pairs.length} onClick={() => onSubmit(matches)}>
          Check
        </Button>
      )}
    </div>
  );
}

function SpeakingActivity({ activity, onSubmit, submitted }: ActivityProps<"speaking">) {
  const speech = useSpeech();
  const [typed, setTyped] = useState("");
  const transcript = speech.transcript || typed;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center">
        <div className="text-xl font-semibold text-white">“{activity.content.expectedSentence}”</div>
        {activity.content.translation && <div className="mt-1 text-sm text-zinc-400">{activity.content.translation}</div>}
        {activity.content.tip && <div className="mt-2 text-xs text-violet-200">💡 {activity.content.tip}</div>}
        <Button variant="ghost" size="sm" type="button" className="mt-3" onClick={() => speak(activity.content.expectedSentence)}>
          <Volume2 size={14} /> Hear a model
        </Button>
      </div>
      {speech.supported ? (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={submitted}
            onClick={speech.listening ? speech.stop : speech.start}
            className={cx("grid h-20 w-20 place-items-center rounded-full border-4 text-white transition", speech.listening ? "animate-pulse border-rose-400 bg-rose-500/40" : "border-violet-400 bg-violet-500/30 hover:bg-violet-500/50")}
            aria-label={speech.listening ? "Stop recording" : "Start recording"}
          >
            {speech.listening ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <p className="text-xs text-zinc-400">{speech.listening ? "Listening… speak now" : "Tap the mic and say the line"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">Speech recognition isn't available in this browser — say the line out loud, then type what you said.</p>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={submitted} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none" placeholder="Type the sentence you said" />
        </div>
      )}
      {transcript && <p className="rounded-xl bg-white/5 p-3 text-center text-sm text-zinc-100">You said: “{transcript}”</p>}
      {!submitted && (
        <Button type="button" className="w-full" disabled={!transcript} onClick={() => onSubmit({ transcript })}>
          Check my pronunciation
        </Button>
      )}
    </div>
  );
}

function TruthOrDareActivity({ activity, onSubmit, submitted }: ActivityProps<"truthOrDare">) {
  const [choice, setChoice] = useState<"truth" | "dare" | null>(null);
  if (!choice)
    return (
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setChoice("truth")} className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/20 to-blue-500/10 py-8 text-xl font-bold text-white hover:border-white/30">
          🗣️ Truth
        </button>
        <button type="button" onClick={() => setChoice("dare")} className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-rose-500/10 py-8 text-xl font-bold text-white hover:border-white/30">
          🔥 Dare
        </button>
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-zinc-400">{choice}</div>
      <Prompt>{choice === "truth" ? activity.content.truth : activity.content.dare}</Prompt>
      <TextResponse placeholder={choice === "truth" ? "Tell your story…" : "Describe how it went (or type 'done')"} minLength={2} submitted={submitted} onSubmit={(text) => onSubmit({ choice, response: text })} />
    </div>
  );
}

function WouldYouRatherActivity({ activity, onSubmit, submitted }: ActivityProps<"wouldYouRather">) {
  const [choice, setChoice] = useState<1 | 2 | null>(null);
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-4">
      <Prompt>Would you rather…</Prompt>
      <div className="grid gap-3 sm:grid-cols-2">
        {[activity.content.wouldYouOption1, activity.content.wouldYouOption2].map((opt, i) => (
          <button key={i} type="button" disabled={submitted} onClick={() => setChoice((i + 1) as 1 | 2)} className={cx("rounded-2xl border p-4 text-left text-sm text-white transition", choice === i + 1 ? "border-violet-400 bg-violet-500/25" : "border-white/10 bg-white/5 hover:bg-white/10")}>
            <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-400">Option {i + 1}</span>
            {opt}
          </button>
        ))}
      </div>
      {choice && (
        <div className="space-y-2">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} disabled={submitted} rows={2} placeholder="I'd rather … because …" className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white focus:border-violet-400 focus:outline-none" />
          {!submitted && (
            <Button type="button" disabled={reason.trim().length < 5} onClick={() => onSubmit({ choice, reason })}>
              Submit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DiscussionActivity({ activity, onSubmit, submitted }: ActivityProps<"discussion">) {
  return (
    <div className="space-y-4">
      <Prompt>{activity.content.discussionPrompt}</Prompt>
      {activity.content.guidingQuestions?.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
          {activity.content.guidingQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      ) : null}
      <TextResponse placeholder="Share your thoughts in English…" minLength={10} submitted={submitted} onSubmit={onSubmit} />
    </div>
  );
}

function PredictNextActivity({ activity, onSubmit, submitted }: ActivityProps<"predictNext">) {
  const [pick, setPick] = useState<number | null>(null);
  const opts = activity.content.predictOptions;
  return (
    <div className="space-y-4">
      <Prompt>{activity.content.question}</Prompt>
      <div className="grid gap-2">
        {opts.map((o, i) => (
          <button
            key={i}
            type="button"
            disabled={submitted}
            onClick={() => {
              setPick(i);
              onSubmit(i);
            }}
            className={cx("rounded-xl border px-4 py-3 text-left text-sm text-white transition", pick === i ? "border-violet-400 bg-violet-500/25" : "border-white/10 bg-white/5 hover:bg-white/10", submitted && o.isCorrect && "border-emerald-400 bg-emerald-500/20")}
          >
            🔮 {o.text}
            {submitted && (pick === i || o.isCorrect) && <span className="mt-1 block text-xs text-zinc-300">{o.consequence}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function VoiceOverActivity({ activity, onSubmit, submitted, controller }: ActivityProps<"voiceOver">) {
  const speech = useSpeech();
  const { startTime, endTime, line } = activity.content;
  const canReplay = controller && startTime !== undefined && endTime !== undefined;
  return (
    <div className="space-y-4">
      <Prompt>{activity.content.question}</Prompt>
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center text-xl font-semibold text-white">“{line}”</div>
      <div className="flex flex-wrap justify-center gap-2">
        {canReplay && (
          <Button variant="ghost" type="button" onClick={() => controller!.playRange(startTime!, endTime!, { muted: true })}>
            <Play size={16} /> Play scene muted
          </Button>
        )}
        {canReplay && (
          <Button variant="ghost" type="button" onClick={() => controller!.playRange(startTime!, endTime!, { muted: false })}>
            <Volume2 size={16} /> Hear the original
          </Button>
        )}
        {speech.supported && (
          <Button variant={speech.listening ? "danger" : "outline"} type="button" onClick={speech.listening ? speech.stop : speech.start}>
            {speech.listening ? <MicOff size={16} /> : <Mic size={16} />} {speech.listening ? "Stop" : "Record my dub"}
          </Button>
        )}
      </div>
      {speech.transcript && <p className="rounded-xl bg-white/5 p-3 text-center text-sm text-zinc-100">Heard: “{speech.transcript}”</p>}
      {!submitted && (
        <Button type="button" className="w-full" onClick={() => onSubmit({ done: true, transcript: speech.transcript })}>
          I dubbed it!
        </Button>
      )}
    </div>
  );
}

function OrderingActivity({ activity, onSubmit, submitted }: ActivityProps<"ordering">) {
  const items = activity.content.orderedItems;
  const pool = useMemo(() => shuffle(items, items.length * 13), [items]);
  const [answer, setAnswer] = useState<string[]>([]);
  const remaining = pool.filter((p) => !answer.includes(p));
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-300">{activity.content.instruction ?? "Tap the chunks in the correct order."}</p>
      <div className="flex min-h-[56px] flex-wrap items-center gap-2 rounded-xl border border-dashed border-violet-400/40 bg-violet-500/5 p-3">
        {answer.length === 0 && <span className="text-xs text-zinc-500">Your sentence appears here</span>}
        {answer.map((a, i) => (
          <button key={a} type="button" disabled={submitted} onClick={() => setAnswer((x) => x.filter((y) => y !== a))} className={cx("rounded-lg border px-3 py-1.5 text-sm font-medium text-white", submitted ? (items[i] === a ? "border-emerald-400 bg-emerald-500/20" : "border-rose-400 bg-rose-500/20") : "border-violet-400/60 bg-violet-500/20")}>
            {a}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {remaining.map((r) => (
          <button key={r} type="button" disabled={submitted} onClick={() => setAnswer((x) => [...x, r])} className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
            {r}
          </button>
        ))}
      </div>
      {submitted && <p className="text-sm text-emerald-300">Correct order: {items.join(" ")}</p>}
      <div className="flex gap-2">
        {!submitted && (
          <Button variant="ghost" size="sm" type="button" onClick={() => setAnswer([])}>
            <RotateCcw size={14} /> Reset
          </Button>
        )}
        {!submitted && (
          <Button size="sm" type="button" disabled={answer.length !== items.length} onClick={() => onSubmit(answer)}>
            Check
          </Button>
        )}
      </div>
    </div>
  );
}

function WordScrambleActivity({ activity, onSubmit, submitted }: ActivityProps<"wordScramble">) {
  const letters = useMemo(() => activity.content.scrambledWord.split("").map((ch, i) => ({ ch, i })), [activity.content.scrambledWord]);
  const [used, setUsed] = useState<number[]>([]);
  const built = used.map((i) => letters[i].ch).join("");
  return (
    <div className="space-y-4">
      <Prompt>Unscramble the word{activity.content.hint ? ` — ${activity.content.hint}` : ""}</Prompt>
      <div className="flex min-h-[52px] items-center justify-center gap-1 rounded-xl border border-dashed border-violet-400/40 p-3 text-2xl font-bold tracking-widest text-white">{built || <span className="text-sm font-normal text-zinc-500">tap letters below</span>}</div>
      <div className="flex flex-wrap justify-center gap-2">
        {letters.map((l) => (
          <button key={l.i} type="button" disabled={submitted || used.includes(l.i)} onClick={() => setUsed((u) => [...u, l.i])} className="h-11 w-11 rounded-xl border border-white/10 bg-white/10 text-lg font-bold uppercase text-white transition hover:bg-white/20 disabled:opacity-20">
            {l.ch}
          </button>
        ))}
      </div>
      {submitted && <p className="text-center text-sm text-emerald-300">Answer: {activity.content.correctWord}</p>}
      <div className="flex justify-center gap-2">
        {!submitted && (
          <Button variant="ghost" size="sm" type="button" onClick={() => setUsed([])}>
            <RotateCcw size={14} /> Reset
          </Button>
        )}
        {!submitted && (
          <Button size="sm" type="button" disabled={used.length !== letters.length} onClick={() => onSubmit(built)}>
            Check
          </Button>
        )}
      </div>
    </div>
  );
}

function ReflectionActivity({ activity, onSubmit, submitted }: ActivityProps<"reflection">) {
  return (
    <div className="space-y-4">
      <Prompt>{activity.content.reflectionPrompt}</Prompt>
      <TextResponse placeholder="Write a few sentences…" minLength={10} submitted={submitted} onSubmit={onSubmit} allowSpeech={false} />
    </div>
  );
}

function HotspotActivity({ activity, onSubmit, submitted }: ActivityProps<"hotspot">) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <Prompt>{activity.content.hotspot.question}</Prompt>
      <Options options={activity.content.hotspot.options} value={value} onChange={setValue} submitted={submitted} />
      {!submitted && (
        <Button type="button" disabled={!value} onClick={() => onSubmit(value)}>
          Check answer
        </Button>
      )}
    </div>
  );
}

function VideoPauseActivity({ activity, onSubmit, submitted }: ActivityProps<"videoPause">) {
  return (
    <div className="space-y-4">
      <Prompt>{activity.content.videoPausePrompt}</Prompt>
      <TextResponse placeholder="Your answer…" minLength={5} submitted={submitted} onSubmit={onSubmit} />
      {submitted && activity.content.modelAnswer && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">Model answer: {activity.content.modelAnswer}</p>}
    </div>
  );
}

function ReadingChallengeActivity({ activity, onSubmit, submitted }: ActivityProps<"readingChallenge">) {
  const r = activity.content.reading;
  const [showTranslation, setShowTranslation] = useState(false);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h4 className="font-semibold text-white">{r.title}</h4>
          <span className="text-[10px] uppercase tracking-widest text-zinc-400">{r.genre}</span>
        </div>
        <p className="max-h-48 overflow-y-auto text-sm leading-relaxed text-zinc-100">{r.text}</p>
        {r.translation && (
          <button type="button" onClick={() => setShowTranslation((s) => !s)} className="mt-2 text-xs text-violet-300 hover:underline">
            {showTranslation ? "Hide translation" : "Show translation help"}
          </button>
        )}
        {showTranslation && r.translation && <p className="mt-1 text-xs text-zinc-400">{r.translation}</p>}
      </div>
      <QuestionSet questions={r.questions} onSubmit={onSubmit} submitted={submitted} />
    </div>
  );
}

function ListeningComprehensionActivity({ activity, onSubmit, submitted }: ActivityProps<"listeningComprehension">) {
  const l = activity.content.listening;
  const [showTranscript, setShowTranscript] = useState(l.showTranscript);
  const [plays, setPlays] = useState(0);
  const [ttsOk, setTtsOk] = useState(true);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-semibold text-white">{l.title}</h4>
          <span className="text-[10px] uppercase tracking-widest text-zinc-400">{l.genre}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const ok = speak(l.audioText, plays === 0 ? 0.92 : 0.8);
              setTtsOk(ok);
              setPlays((p) => p + 1);
            }}
          >
            <Volume2 size={14} /> {plays === 0 ? "Play audio" : "Play again (slower)"}
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => setShowTranscript((s) => !s)}>
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </Button>
          {!ttsOk && <span className="text-xs text-amber-300">Audio isn't available here — read the transcript instead.</span>}
        </div>
        {(showTranscript || !ttsOk) && <p className="mt-3 text-sm leading-relaxed text-zinc-200">{l.audioText}</p>}
      </div>
      <QuestionSet questions={l.questions} onSubmit={onSubmit} submitted={submitted} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

type Registry = { [K in ActivityType]: ComponentType<ActivityProps<K>> };

export const ActivityRendererRegistry: Registry = {
  flashcard: FlashcardActivity,
  multipleChoice: MultipleChoiceActivity,
  trueFalse: TrueFalseActivity,
  fillBlanks: FillBlanksActivity,
  dragDrop: DragDropActivity,
  matching: MatchingActivity,
  speaking: SpeakingActivity,
  truthOrDare: TruthOrDareActivity,
  wouldYouRather: WouldYouRatherActivity,
  discussion: DiscussionActivity,
  predictNext: PredictNextActivity,
  voiceOver: VoiceOverActivity,
  ordering: OrderingActivity,
  wordScramble: WordScrambleActivity,
  reflection: ReflectionActivity,
  hotspot: HotspotActivity,
  videoPause: VideoPauseActivity,
  readingChallenge: ReadingChallengeActivity,
  listeningComprehension: ListeningComprehensionActivity,
};

export function ActivityRenderer(props: ActivityProps) {
  const Component = ActivityRendererRegistry[props.activity.type] as ComponentType<ActivityProps>;
  if (!Component) return <p className="text-sm text-rose-300">Unsupported activity type: {props.activity.type}</p>;
  return <Component {...props} />;
}
