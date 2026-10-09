/**
 * "What do you do?" modal — opened when the GM (or anyone) clicks a
 * player's name in the leaderboard. Replaces the old bottom-of-canvas
 * DecisionFlow panel.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Entity } from "../../engine/types";
import { submitDecision } from "../../engine/actions";
import { cn } from "../../utils/cn";

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognition(): SR | null {
  const w = window as unknown as { webkitSpeechRecognition?: new () => SR; SpeechRecognition?: new () => SR };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function DecisionModal({
  player,
  hints,
  open,
  onClose,
}: {
  player: Entity;
  hints: string[];
  open: boolean;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"act" | "confirm" | "reason">("act");
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    if (open) { setStage("act"); setText(""); setReason(""); }
  }, [open, player?.id]);

  if (!open) return null;

  const locked = !!player.dead;

  const startVoice = () => {
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = player.language || "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => { setText((p) => (p ? p + " " : "") + e.results[0][0].transcript); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(540px,92vw)] rounded-2xl border border-white/20 bg-slate-900/98 p-5 shadow-2xl"
        style={{ position: 'relative' }}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="text-3xl">{player.emoji}</span>
          <div className="flex-1">
            <div className="font-black" style={{ color: player.color }}>{player.name} <span className="text-xs font-normal text-slate-400">— What do you do?</span></div>
            {player.role && <div className="text-[10px] uppercase tracking-wide text-violet-300">{player.role}</div>}
          </div>
          <button onClick={onClose} className="rounded bg-white/10 px-2 py-1 text-xs">✕</button>
        </div>

        {locked && <p className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300 text-sm">✓ Locked in</p>}

        {!locked && stage === "act" && (
          <>
            {hints.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {hints.map((h, i) => (
                  <button key={i} onClick={() => setText(h)} className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs text-violet-200 ring-1 ring-violet-400/30 hover:bg-violet-500/25">
                    💡 {h}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your action…" rows={3}
                className="w-full rounded-lg bg-slate-950/70 px-3 py-2 text-sm text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400" />
              <button
                onClick={listening ? () => recRef.current?.stop() : startVoice}
                className={cn("h-10 w-10 rounded-lg text-lg", listening ? "bg-rose-500" : "bg-violet-500/30 hover:bg-violet-500/50")}
                title="Voice input"
              >{listening ? "🔴" : "🎤"}</button>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-slate-300">Cancel</button>
              <button onClick={() => setStage("confirm")} disabled={!text.trim()} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-bold disabled:opacity-30">Continue →</button>
            </div>
          </>
        )}

        {!locked && stage === "confirm" && (
          <div className="space-y-2">
            <p className="rounded-lg bg-slate-950/60 p-2 text-sm italic text-slate-200">"{text}"</p>
            <p className="text-sm text-amber-300">Are you sure?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setStage("act")} className="rounded-lg bg-white/5 px-3 py-1.5 text-sm">Edit</button>
              <button onClick={() => setStage("reason")} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-bold">Yes →</button>
            </div>
          </div>
        )}

        {!locked && stage === "reason" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">In one sentence, why? (logic or creativity earns score)</p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Because…"
              className="w-full rounded-lg bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setStage("confirm")} className="rounded-lg bg-white/5 px-3 py-1.5 text-sm">Back</button>
              <button
                onClick={() => {
                  submitDecision(player.id, text.trim(), reason.trim());
                  onClose();
                }}
                disabled={!reason.trim()}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-bold disabled:opacity-30"
              >🔒 Lock In</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
