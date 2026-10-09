import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Activity, ActivityOption, LessonCard } from "../../types";
import type { Evaluation } from "../../lib/lesson/engine";
import { Button, Chip, cx } from "../ui";

/* ─────────────────────────── shared scaffolding ─────────────────────────── */

export interface ActivityRendererProps {
  activity: Activity;
  value: unknown;
  onChange: (value: unknown) => void;
  /** True once the learner has checked their answer — inputs lock, answers show. */
  revealed: boolean;
  evaluation: Evaluation | null;
  /** Speak a line with the browser voice (listening activities and speaking models). */
  speak?: (text: string, rate?: number) => void;
  onSeek?: (time: number) => void;
}

const ACCENT_BY_COLOR: Record<string, string> = {
  gold: "var(--color-tf-gold)",
  teal: "var(--color-tf-teal)",
  purple: "var(--color-tf-purple)",
  orange: "#fb923c",
  green: "var(--color-tf-green)",
  pink: "var(--color-tf-pink)",
  blue: "var(--color-tf-blue)",
};

const Prompt: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone }) => (
  <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "var(--color-tf-text)" }}>
    {tone && <span className="mr-1" style={{ color: tone }}>◆</span>}
    {children}
  </p>
);

/** A large, thumb-friendly answer row. */
const OptionRow: React.FC<{
  option: ActivityOption;
  selected: boolean;
  correct?: boolean;
  wrong?: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ option, selected, correct, wrong, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cx(
      "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-all",
      !disabled && "hover:-translate-y-[1px] hover:border-white/25",
      disabled && "cursor-default",
    )}
    style={{
      borderColor: correct ? "var(--color-tf-green)" : wrong ? "#e5484d" : selected ? "var(--color-tf-brand)" : "var(--color-tf-line)",
      background: correct
        ? "color-mix(in srgb, var(--color-tf-green) 16%, transparent)"
        : wrong
          ? "color-mix(in srgb, #e5484d 16%, transparent)"
          : selected
            ? "color-mix(in srgb, var(--color-tf-brand) 16%, transparent)"
            : "var(--color-tf-panel-2)",
      color: "var(--color-tf-text)",
    }}
  >
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black"
      style={{
        background: correct ? "var(--color-tf-green)" : wrong ? "#e5484d" : selected ? "var(--color-tf-brand)" : "var(--color-tf-line)",
        color: correct || wrong || selected ? "#fff" : "var(--color-tf-sub)",
      }}
    >
      {correct ? "✓" : wrong ? "✕" : option.id.toUpperCase()}
    </span>
    <span className="flex-1">{option.text}</span>
  </button>
);

/* ─────────────────────────────── flashcard ─────────────────────────────── */

const Flashcards: React.FC<ActivityRendererProps> = ({ activity, value, onChange, revealed }) => {
  const cards = activity.content.cards ?? [];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const seen = useMemo(() => (Array.isArray(value) ? (value as string[]) : []), [value]);
  const card: LessonCard | undefined = cards[index];

  useEffect(() => {
    if (seen.length >= cards.length && cards.length) onChange(cards.map((c) => c.front));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen.length, cards.length]);

  if (!card) return <Prompt>This activity has no cards.</Prompt>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-bold" style={{ color: "var(--color-tf-sub)" }}>
        <span>
          Card {index + 1} / {cards.length}
        </span>
        <span>{seen.length} seen</span>
      </div>

      <button
        onClick={() => {
          setFlipped((v) => !v);
          if (!seen.includes(card.front)) onChange([...seen, card.front]);
        }}
        className="tf-pop min-h-[150px] w-full rounded-2xl border p-4 text-left"
        style={{ borderColor: "var(--color-tf-line)", background: flipped ? "var(--color-tf-panel-2)" : "color-mix(in srgb, var(--color-tf-gold) 12%, transparent)" }}
      >
        <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-gold)" }}>
          {flipped ? "Meaning" : "Word / phrase — tap to flip"}
        </div>
        <div className="mt-1 text-2xl font-black">{flipped ? card.back : card.front}</div>
        {flipped && (
          <div className="mt-2 space-y-1 text-sm" style={{ color: "var(--color-tf-sub)" }}>
            {card.pronunciation && <div>🔊 {card.pronunciation}</div>}
            {card.translation && <div>🔁 {card.translation}</div>}
            {card.example && <div className="italic">“{card.example}”</div>}
          </div>
        )}
      </button>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          ← Prev
        </Button>
        <Button
          size="sm"
          kind="primary"
          onClick={() => {
            setFlipped(false);
            setIndex((i) => Math.min(cards.length - 1, i + 1));
          }}
          disabled={index >= cards.length - 1}
        >
          Next card →
        </Button>
        {!revealed && (
          <Button size="sm" kind="success" className="ml-auto" onClick={() => onChange(cards.map((c) => c.front))}>
            I know these
          </Button>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────── multiple choice / hotspot ─────────────────────────── */

const Choice: React.FC<ActivityRendererProps & { options: ActivityOption[] }> = ({ activity, options, value, onChange, revealed, evaluation }) => (
  <div className="space-y-2">
    {activity.content.question && <Prompt>{activity.content.question}</Prompt>}
    {activity.content.term && !activity.content.question && <Prompt>{activity.content.term}</Prompt>}
    {options.map((option) => (
      <OptionRow
        key={option.id}
        option={option}
        selected={value === option.id}
        disabled={revealed}
        correct={revealed && option.isCorrect ? true : undefined}
        wrong={revealed && value === option.id && !option.isCorrect ? true : undefined}
        onClick={() => onChange(option.id)}
      />
    ))}
    {revealed && evaluation && !evaluation.unscored && (
      <div className="text-xs font-bold" style={{ color: evaluation.correct ? "var(--color-tf-green)" : "#e5484d" }}>
        {evaluation.correct ? "Correct" : `Expected: ${evaluation.expected}`}
      </div>
    )}
  </div>
);

const TrueFalse: React.FC<ActivityRendererProps> = (props) => (
  <div className="space-y-3">
    <Prompt>{props.activity.content.question}</Prompt>
    <div className="grid grid-cols-2 gap-3">
      {[true, false].map((flag) => {
        const active = props.value === flag;
        const right = props.revealed && props.activity.content.answer === flag;
        const wrong = props.revealed && active && props.activity.content.answer !== flag;
        return (
          <button
            key={String(flag)}
            disabled={props.revealed}
            onClick={() => props.onChange(flag)}
            className="rounded-2xl border py-6 text-2xl font-black transition-transform hover:-translate-y-[1px]"
            style={{
              borderColor: right ? "var(--color-tf-green)" : wrong ? "#e5484d" : active ? "var(--color-tf-brand)" : "var(--color-tf-line)",
              background: right
                ? "color-mix(in srgb, var(--color-tf-green) 18%, transparent)"
                : wrong
                  ? "color-mix(in srgb, #e5484d 18%, transparent)"
                  : active
                    ? "color-mix(in srgb, var(--color-tf-brand) 16%, transparent)"
                    : "var(--color-tf-panel-2)",
            }}
          >
            {flag ? "✔ True" : "✖ False"}
          </button>
        );
      })}
    </div>
  </div>
);

/* ─────────────────────────────── fill blanks ─────────────────────────────── */

const FillBlanks: React.FC<ActivityRendererProps> = ({ activity, value, onChange, revealed, evaluation }) => {
  const blanks = activity.content.blanks ?? [];
  const given = Array.isArray(value) ? (value as string[]) : new Array(blanks.length).fill("");
  const parts = (activity.content.sentence ?? "").split(/_{2,}/);

  return (
    <div className="space-y-3">
      {activity.content.question && <Prompt>{activity.content.question}</Prompt>}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 text-[17px] leading-loose">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <span>{part}</span>
            {i < blanks.length && (
              <input
                value={given[i] ?? ""}
                onChange={(event) => {
                  const next = [...given];
                  next[i] = event.target.value;
                  onChange(next);
                }}
                disabled={revealed}
                placeholder="…"
                className="w-32 rounded-lg border px-2 py-1 text-center text-[15px] font-bold outline-none"
                style={{
                  borderColor: revealed ? (evaluation?.correct ? "var(--color-tf-green)" : "#e5484d") : "var(--color-tf-line)",
                  background: "var(--color-tf-panel-2)",
                  color: "var(--color-tf-text)",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      {revealed && !evaluation?.correct && (
        <div className="text-xs font-bold" style={{ color: "var(--color-tf-gold)" }}>
          Answer: {blanks.join(" · ")}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────── drag & drop ────────────────────────────── */

const DragDrop: React.FC<ActivityRendererProps> = ({ activity, value, onChange, revealed, evaluation }) => {
  const items = activity.content.items ?? [];
  const targets = activity.content.targets ?? [];
  const map = (value ?? {}) as Record<string, string>;
  const [held, setHeld] = useState<string | null>(null);

  const place = (item: string, target: string) => {
    if (revealed) return;
    onChange({ ...map, [item]: target });
  };

  return (
    <div className="space-y-3">
      {activity.content.question && <Prompt>{activity.content.question}</Prompt>}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const placed = map[item];
          return (
            <button
              key={item}
              draggable
              onDragStart={() => setHeld(item)}
              onClick={() => setHeld(held === item ? null : item)}
              className={cx("rounded-xl border px-3 py-2 text-sm font-semibold", held === item && "tf-ring")}
              style={{
                borderColor: held === item ? "var(--color-tf-brand)" : "var(--color-tf-line)",
                background: placed ? "color-mix(in srgb, var(--color-tf-teal) 14%, transparent)" : "var(--color-tf-panel-2)",
                color: "var(--color-tf-text)",
              }}
            >
              {item} {placed && <span style={{ color: "var(--color-tf-sub)" }}>→ {placed}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))` }}>
        {targets.map((target) => {
          const inBucket = items.filter((item) => map[item] === target);
          return (
            <div
              key={target}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => held && place(held, target)}
              onClick={() => held && place(held, target)}
              className="min-h-[92px] rounded-2xl border border-dashed p-2.5"
              style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}
            >
              <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-teal)" }}>
                {target}
              </div>
              {inBucket.map((item) => (
                <div key={item} className="mb-1 rounded-lg px-2 py-1 text-xs font-bold" style={{ background: "color-mix(in srgb, var(--color-tf-teal) 18%, transparent)" }}>
                  {item}
                  {!revealed && (
                    <button
                      className="ml-2 text-[10px] opacity-70"
                      onClick={(event) => {
                        event.stopPropagation();
                        const next = { ...map };
                        delete next[item];
                        onChange(next);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {!inBucket.length && <div className="text-[11px]" style={{ color: "var(--color-tf-sub)" }}>drop here</div>}
            </div>
          );
        })}
      </div>
      {revealed && !evaluation?.correct && (
        <div className="text-xs font-bold" style={{ color: "var(--color-tf-gold)" }}>
          {evaluation?.expected}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────── matching ─────────────────────────────── */

const Matching: React.FC<ActivityRendererProps> = ({ activity, value, onChange, revealed, evaluation }) => {
  const pairs = activity.content.pairs ?? [];
  const map = (value ?? {}) as Record<string, string>;
  const rights = useMemo(() => [...new Set(pairs.map((pair) => pair.right))].sort(() => Math.random() - 0.5), [pairs]);

  return (
    <div className="space-y-2">
      {activity.content.question && <Prompt>{activity.content.question}</Prompt>}
      {pairs.map((pair) => {
        const chosen = map[pair.left];
        const right = revealed && chosen === pair.right;
        const wrong = revealed && !!chosen && chosen !== pair.right;
        return (
          <div key={pair.left} className="grid items-center gap-2 rounded-xl border p-2.5 sm:grid-cols-[1fr_auto_1fr]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
            <span className="text-sm font-semibold">{pair.left}</span>
            <span className="hidden text-center sm:block" style={{ color: right ? "var(--color-tf-green)" : wrong ? "#e5484d" : "var(--color-tf-sub)" }}>
              {right ? "✓" : wrong ? "✕" : "→"}
            </span>
            <select
              value={chosen ?? ""}
              disabled={revealed}
              onChange={(event) => onChange({ ...map, [pair.left]: event.target.value })}
              className="rounded-lg border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)", color: "var(--color-tf-text)" }}
            >
              <option value="">choose…</option>
              {rights.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      })}
      {revealed && !evaluation?.correct && (
        <div className="text-xs font-bold" style={{ color: "var(--color-tf-gold)" }}>
          {evaluation?.expected}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────── ordering ─────────────────────────────── */

const Ordering: React.FC<ActivityRendererProps> = ({ activity, value, onChange, revealed, evaluation }) => {
  const items = activity.content.orderedItems ?? [];
  const order = Array.isArray(value) && (value as string[]).length === items.length ? (value as string[]) : items;
  const move = (index: number, delta: number) => {
    if (revealed) return;
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {activity.content.question && <Prompt>{activity.content.question}</Prompt>}
      {order.map((item, index) => {
        const right = revealed && items[index] === item;
        return (
          <div
            key={`${item}-${index}`}
            className="flex items-center gap-2 rounded-xl border px-2.5 py-2"
            style={{
              borderColor: revealed ? (right ? "var(--color-tf-green)" : "#e5484d") : "var(--color-tf-line)",
              background: "var(--color-tf-panel-2)",
            }}
          >
            <span className="grid h-6 w-6 place-items-center rounded-lg text-[11px] font-black" style={{ background: "var(--color-tf-line)" }}>
              {index + 1}
            </span>
            <span className="flex-1 text-sm font-semibold">{item}</span>
            {!revealed && (
              <>
                <Button size="sm" onClick={() => move(index, -1)} disabled={index === 0} aria-label="move up">
                  ↑
                </Button>
                <Button size="sm" onClick={() => move(index, 1)} disabled={index === order.length - 1} aria-label="move down">
                  ↓
                </Button>
              </>
            )}
          </div>
        );
      })}
      {revealed && !evaluation?.correct && (
        <div className="text-xs font-bold" style={{ color: "var(--color-tf-gold)" }}>
          Correct order: {items.join(" → ")}
        </div>
      )}
    </div>
  );
};

/* ───────────────────────────── word scramble ───────────────────────────── */

const WordScramble: React.FC<ActivityRendererProps> = ({ activity, value, onChange, revealed, evaluation }) => {
  const letters = (activity.content.scrambledWord ?? "").split("");
  const built = String(value ?? "");
  const pool = [...letters];

  return (
    <div className="space-y-3">
      <Prompt tone="var(--color-tf-purple)">Unscramble: {letters.join(" ")}</Prompt>
      <div className="flex flex-wrap gap-1.5">
        {pool.map((letter, index) => (
          <button
            key={`${letter}-${index}`}
            disabled={revealed}
            onClick={() => onChange(built + letter)}
            className="h-11 w-10 rounded-xl border text-xl font-black"
            style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="min-h-[44px] flex-1 rounded-xl border px-3 py-2 text-xl font-black tracking-wide"
          style={{
            borderColor: revealed ? (evaluation?.correct ? "var(--color-tf-green)" : "#e5484d") : "var(--color-tf-line)",
            background: "var(--color-tf-panel)",
            letterSpacing: "0.08em",
          }}
        >
          {built || <span style={{ color: "var(--color-tf-sub)" }}>…</span>}
        </div>
        <Button size="sm" onClick={() => onChange("")} disabled={revealed}>
          Clear
        </Button>
        <Button size="sm" onClick={() => onChange(built.slice(0, -1))} disabled={!built || revealed}>
          ⌫
        </Button>
      </div>
      {revealed && !evaluation?.correct && (
        <div className="text-xs font-bold" style={{ color: "var(--color-tf-gold)" }}>
          It was “{activity.content.correctWord}”.
        </div>
      )}
    </div>
  );
};

/* ──────────────────────── open text: speaking / discussion / reflection ──────────────────────── */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognition(lang: string): SpeechRecognitionLike | null {
  const scope = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

const OpenText: React.FC<ActivityRendererProps & { kind: "speaking" | "discussion" | "reflection" | "videoPause" }> = ({
  activity,
  value,
  onChange,
  revealed,
  evaluation,
  kind,
  speak,
  onSeek,
}) => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const text = String(value ?? "");
  const promptText =
    kind === "speaking"
      ? activity.content.expectedSentence ?? ""
      : kind === "discussion"
        ? activity.content.discussionPrompt ?? activity.content.question ?? ""
        : kind === "reflection"
          ? activity.content.reflectionPrompt ?? activity.content.question ?? ""
          : activity.content.videoPausePrompt ?? activity.content.question ?? "";

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const words = useMemo(() => activity.content.expectedSentence ? activity.content.expectedSentence.split(/\s+/).filter((w) => w.length > 3) : [], [activity.content.expectedSentence]);
  const matched = words.filter((word) => text.toLowerCase().includes(word.replace(/[^\p{L}']/gu, "").toLowerCase()));

  return (
    <div className="space-y-3">
      <Prompt tone={kind === "reflection" ? "var(--color-tf-pink)" : "var(--color-tf-purple)"}>{promptText}</Prompt>

      {kind === "speaking" && (
        <div className="space-y-2">
          <div className="rounded-xl border p-3 text-lg font-black" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
            “{activity.content.expectedSentence}”
          </div>
          {activity.content.pronunciation && (
            <div className="text-sm font-bold" style={{ color: "var(--color-tf-gold)" }}>
              Stress: {activity.content.pronunciation}
            </div>
          )}
          {activity.content.translation && (
            <div className="text-sm" style={{ color: "var(--color-tf-sub)" }}>
              {activity.content.translation}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => speak?.(activity.content.expectedSentence ?? "", 0.9)}>
              🔊 Model
            </Button>
            <Button size="sm" onClick={() => speak?.(activity.content.expectedSentence ?? "", 0.65)}>
              🐢 Slow model
            </Button>
            <Button size="sm" onClick={() => onSeek?.(Math.max(0, activity.timestamp - 1))}>
              🎬 Hear it in the video
            </Button>
            <Button
              size="sm"
              kind={listening ? "danger" : "ghost"}
              onClick={() => {
                if (listening) {
                  recognitionRef.current?.stop();
                  setListening(false);
                  return;
                }
                const recognition = getRecognition("en-US");
                if (!recognition) return;
                recognitionRef.current = recognition;
                recognition.onresult = (event) => {
                  const transcript = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join(" ");
                  onChange(transcript.trim());
                };
                recognition.onend = () => setListening(false);
                recognition.onerror = () => setListening(false);
                recognition.start();
                setListening(true);
              }}
            >
              {listening ? "⏹ Stop recording" : "🎤 Speak it"}
            </Button>
          </div>
          {words.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {words.map((word) => {
                const clean = word.replace(/[^\p{L}']/gu, "");
                return (
                  <Chip key={word} tone={matched.some((m) => m.toLowerCase().includes(clean.toLowerCase())) ? "brand" : "muted"}>
                    {word}
                  </Chip>
                );
              })}
            </div>
          )}
        </div>
      )}

      <textarea
        value={text}
        onChange={(event) => onChange(event.target.value)}
        disabled={revealed}
        rows={kind === "reflection" ? 5 : 4}
        placeholder={kind === "reflection" ? "Write it here — it is saved to your journal." : "Your answer…"}
        className="tf-scroll w-full rounded-xl border p-3 text-sm"
        style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)" }}
      />
      {kind === "reflection" && <div className="text-[11px]" style={{ color: "var(--color-tf-sub)" }}>{text.trim().split(/\s+/).filter(Boolean).length} words</div>}
      {revealed && evaluation && !evaluation.unscored && evaluation.expected && (
        <div className="text-xs font-bold" style={{ color: evaluation.correct ? "var(--color-tf-green)" : "var(--color-tf-gold)" }}>
          Model answer: {evaluation.expected}
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── hotspot ───────────────────────── */

const Hotspot: React.FC<ActivityRendererProps> = ({ activity, value, onChange, revealed, evaluation, onSeek }) => {
  const spot = activity.content.hotspot;
  if (!spot) return <Prompt>This hotspot has no position.</Prompt>;
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: "var(--color-tf-line)", aspectRatio: "16 / 9", background: "linear-gradient(135deg,#1b2030,#0d1018)" }}>
        <div
          className="tf-ring absolute grid h-9 w-9 place-items-center rounded-full text-lg"
          style={{ left: `calc(${spot.x}% - 18px)`, top: `calc(${spot.y}% - 18px)`, background: "var(--color-tf-brand)", color: "#fff" }}
        >
          📍
        </div>
        <div className="absolute bottom-2 left-2 rounded-lg px-2 py-1 text-[11px] font-bold" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
          on screen at {activity.timestamp.toFixed(1)}s
        </div>
        {onSeek && (
          <button onClick={() => onSeek(activity.timestamp)} className="absolute bottom-2 right-2 rounded-lg px-2.5 py-1.5 text-[11px] font-black" style={{ background: "var(--color-tf-brand)", color: "#fff" }}>
            ▶ Go to the moment
          </button>
        )}
      </div>
      <Choice activity={activity} value={value} onChange={onChange} revealed={revealed} evaluation={evaluation} options={spot.options ?? []} />
      {spot.hint && (
        <div className="text-[11px] font-bold" style={{ color: "var(--color-tf-gold)" }}>
          💡 {spot.hint}
        </div>
      )}
    </div>
  );
};

/* ─────────────────── reading challenge & listening comprehension ─────────────────── */

const QuestionBlock: React.FC<{
  questions: { question: string; options: ActivityOption[]; explanation?: string }[];
  value: unknown;
  onChange: (value: unknown) => void;
  revealed: boolean;
}> = ({ questions, value, onChange, revealed }) => {
  const given = Array.isArray(value) ? (value as string[]) : [];
  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <div key={index} className="space-y-1.5">
          <div className="text-sm font-black">
            {index + 1}. {question.question}
          </div>
          {question.options.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              selected={given[index] === option.id}
              disabled={revealed}
              correct={revealed && option.isCorrect ? true : undefined}
              wrong={revealed && given[index] === option.id && !option.isCorrect ? true : undefined}
              onClick={() => {
                const next = [...given];
                next[index] = option.id;
                onChange(next);
              }}
            />
          ))}
          {revealed && question.explanation && (
            <div className="text-[11px] italic" style={{ color: "var(--color-tf-sub)" }}>
              {question.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ReadingChallenge: React.FC<ActivityRendererProps> = ({ activity, value, onChange, revealed }) => {
  const reading = activity.content.reading;
  if (!reading) return <Prompt>This reading has no text.</Prompt>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Chip tone="brand">{reading.genre}</Chip>
        <div className="text-sm font-black">{reading.title}</div>
        {activity.content.translation && <Chip tone="muted">translation below</Chip>}
      </div>
      <div className="tf-scroll max-h-[26vh] overflow-y-auto rounded-xl border p-3 text-[14.5px] leading-relaxed" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
        {reading.text}
        {reading.translation && (
          <div className="mt-3 border-t pt-3 text-[13px]" style={{ borderColor: "var(--color-tf-line)", color: "var(--color-tf-sub)" }}>
            {reading.translation}
          </div>
        )}
      </div>
      <QuestionBlock questions={reading.questions} value={value} onChange={onChange} revealed={revealed} />
    </div>
  );
};

const Listening: React.FC<ActivityRendererProps> = ({ activity, value, onChange, revealed, speak }) => {
  const listening = activity.content.listening;
  const [showText, setShowText] = useState(false);
  const [rate, setRate] = useState(1);
  if (!listening) return <Prompt>This listening activity has no audio text.</Prompt>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="teal">{listening.genre}</Chip>
        <div className="text-sm font-black">{listening.title}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" kind="primary" onClick={() => speak?.(listening.audioText, rate)}>
          ▶ Play audio
        </Button>
        <Button size="sm" onClick={() => speak?.(listening.audioText, 0.7)}>
          🐢 Slow
        </Button>
        {[0.8, 1, 1.15].map((value) => (
          <Button key={value} size="sm" kind={rate === value ? "primary" : "ghost"} onClick={() => setRate(value)}>
            {value}×
          </Button>
        ))}
        <Button size="sm" onClick={() => setShowText((v) => !v)}>
          {showText ? "Hide transcript" : "Show transcript"}
        </Button>
      </div>
      {(showText || listening.showTranscript) && (
        <div className="rounded-xl border p-3 text-sm leading-relaxed" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
          {listening.audioText}
          {listening.translation && (
            <div className="mt-2 border-t pt-2 text-[13px]" style={{ borderColor: "var(--color-tf-line)", color: "var(--color-tf-sub)" }}>
              {listening.translation}
            </div>
          )}
        </div>
      )}
      <QuestionBlock questions={listening.questions} value={value} onChange={onChange} revealed={revealed} />
    </div>
  );
};

/* ─────────────────────────────── registry ─────────────────────────────── */

export const ActivityBody: React.FC<ActivityRendererProps> = (props) => {
  const accent = ACCENT_BY_COLOR[props.activity.color] ?? "var(--color-tf-brand)";
  const body = (() => {
    switch (props.activity.type) {
      case "flashcard":
        return <Flashcards {...props} />;
      case "multipleChoice":
        return <Choice {...props} options={props.activity.content.options ?? []} />;
      case "trueFalse":
        return <TrueFalse {...props} />;
      case "fillBlanks":
        return <FillBlanks {...props} />;
      case "dragDrop":
        return <DragDrop {...props} />;
      case "matching":
        return <Matching {...props} />;
      case "ordering":
        return <Ordering {...props} />;
      case "wordScramble":
        return <WordScramble {...props} />;
      case "speaking":
        return <OpenText {...props} kind="speaking" />;
      case "discussion":
        return <OpenText {...props} kind="discussion" />;
      case "reflection":
        return <OpenText {...props} kind="reflection" />;
      case "videoPause":
        return <OpenText {...props} kind="videoPause" />;
      case "hotspot":
        return <Hotspot {...props} />;
      case "readingChallenge":
        return <ReadingChallenge {...props} />;
      case "listeningComprehension":
        return <Listening {...props} />;
      default:
        return <Prompt>Unsupported activity type.</Prompt>;
    }
  })();

  return (
    <div className="space-y-2" style={{ ["--tf-accent" as string]: accent }}>
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none">{props.activity.emoji}</span>
        <div>
          <div className="text-base font-black" style={{ color: accent }}>
            {props.activity.title}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
            {props.activity.type} · {props.activity.difficulty} · {props.activity.points} pts · {props.activity.timestamp.toFixed(1)}s
          </div>
        </div>
      </div>
      {body}
    </div>
  );
};

export const ACTIVITY_ACCENT: Record<string, string> = ACCENT_BY_COLOR;
