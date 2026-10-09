import { useEffect, useRef, useState } from "react";
import type { ChatAttachment } from "../state/types";
import { formatDuration } from "./media";
import { cn } from "../utils/cn";
import { Btn } from "../ui/primitives";

/**
 * A voice note.
 *
 * The point of a voice note in a language class is that it can be replayed,
 * scrubbed and — when the character is the one who "said" it — re-spoken in that
 * character's voice, so the class hears the same line twice in the same tone.
 */
export function VoiceNote({
  a,
  tone,
  onReadAloud,
  onTranscript,
  speaking,
}: {
  a: ChatAttachment;
  tone: "in" | "out";
  onReadAloud?: () => void;
  /** Save a typed transcript — it is what search and read-aloud use. */
  onTranscript?: (text: string) => void;
  speaking?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(a.durationSec || 0);
  const [rate, setRate] = useState(1);
  const [showText, setShowText] = useState(false);
  const [draftText, setDraftText] = useState("");
  const bars = a.waveform?.length ? a.waveform : Array.from({ length: 40 }, (_, i) => 0.2 + 0.6 * Math.abs(Math.sin(i / 2.4)));

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = rate;
  }, [rate, playing]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }

  function seekTo(fraction: number) {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    el.currentTime = Math.max(0, Math.min(1, fraction)) * el.duration;
    setTime(el.currentTime);
  }

  const progress = dur ? Math.min(1, time / dur) : 0;

  if (!a.url) {
    return (
      <div className={cn("rounded-2xl px-3 py-2 text-[11px]", tone === "out" ? "bg-white/15 text-white/80" : "bg-slate-100 text-slate-500")}>
        🎙 Voice message ({formatDuration(a.durationSec)}) — the recording was too large to keep, so it cannot be replayed after a reload.
        {a.transcript ? <div className="mt-1 text-slate-600">{a.transcript}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl px-3 py-2 min-w-[15rem]", tone === "out" ? "bg-white/12" : "bg-white/70")}>
      <audio
        ref={audioRef}
        src={a.url}
        preload="metadata"
        onTimeUpdate={(e) => setTime((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => {
          const d = (e.target as HTMLAudioElement).duration;
          if (Number.isFinite(d)) setDur(d);
        }}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm shadow",
            tone === "out" ? "bg-white text-indigo-700" : "bg-indigo-500 text-white hover:bg-indigo-600",
          )}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </button>

        <div className="flex h-9 flex-1 items-center gap-[2px]" onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          seekTo((e.clientX - rect.left) / rect.width);
        }}>
          {bars.map((v, i) => {
            const filled = i / bars.length <= progress;
            return (
              <span
                key={i}
                className={cn("w-[3px] rounded-full transition-colors", tone === "out" ? (filled ? "bg-white" : "bg-white/35") : filled ? "bg-indigo-500" : "bg-slate-300")}
                style={{ height: `${Math.max(12, v * 100)}%` }}
              />
            );
          })}
        </div>

        <span className={cn("text-[11px] tabular-nums", tone === "out" ? "text-white/80" : "text-slate-500")}>
          {formatDuration(playing || time ? time : a.durationSec || dur)}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRate(rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1)}
          className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", tone === "out" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600")}
          title="Playback speed"
        >
          {rate}×
        </button>
        {onReadAloud && a.transcript && (
          <button
            type="button"
            onClick={onReadAloud}
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
              speaking ? "bg-emerald-500 text-white animate-pulse" : tone === "out" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700",
            )}
            title="Read the transcript aloud in this character's voice"
          >
            🔊 {speaking ? "Reading…" : "Read aloud"}
          </button>
        )}
        {a.transcript && (
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", tone === "out" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600")}
          >
            {showText ? "Hide transcript" : "Transcript"}
          </button>
        )}
        {!a.transcript && onTranscript && (
          <button
            type="button"
            onClick={() => setShowText(true)}
            className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", tone === "out" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600")}
            title="Type what this note says, so it can be searched and read aloud"
          >
            ＋ transcript
          </button>
        )}
      </div>

      {showText && a.transcript && (
        <p className={cn("mt-1.5 text-[12px] leading-snug", tone === "out" ? "text-white/90" : "text-slate-600")}>{a.transcript}</p>
      )}

      {showText && !a.transcript && onTranscript && (
        <div className="mt-1.5 space-y-1">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={2}
            placeholder="What does this note say?"
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[12px] text-slate-800 focus:border-indigo-400 focus:outline-none"
          />
          <div className="flex justify-end gap-1">
            <Btn size="sm" variant="ghost" onClick={() => setShowText(false)}>
              Cancel
            </Btn>
            <Btn
              size="sm"
              variant="primary"
              onClick={() => {
                const text = draftText.trim();
                if (!text) return;
                onTranscript(text);
                setShowText(false);
              }}
            >
              Save
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
