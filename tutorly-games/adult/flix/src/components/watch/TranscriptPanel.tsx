import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SubtitleCue } from "../../types";
import { countMatches, findCueIndex, formatClock, searchCues } from "../../lib/subtitles";
import { usePlayerStore } from "../../store/player";
import { Button, Chip, Input } from "../ui";

/**
 * The interactive transcript.
 *
 * Reads as a script, behaves like a timeline: each line shows its speaker and
 * timestamp, the active line is highlighted and scrolled to, clicking a line
 * seeks, and every line has its own "play this line", "translate" and
 * "AI prompt for this line" actions. Long transcripts are virtualized so a
 * 2-hour film stays smooth.
 */
export const TranscriptPanel: React.FC<{
  cues: SubtitleCue[];
  onSeek: (time: number) => void;
  onPlayLine: (cue: SubtitleCue, options?: { slow?: boolean }) => void;
  onCuePrompt: (cue: SubtitleCue) => void;
  onSearchExternal?: (query: string) => void;
}> = ({ cues, onSeek, onPlayLine, onCuePrompt, onSearchExternal }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [matchAt, setMatchAt] = useState(0);

  const time = usePlayerStore((s) => s.time);
  const follow = usePlayerStore((s) => s.followTranscript);
  const selectedCueId = usePlayerStore((s) => s.selectedCueId);
  const selectCue = usePlayerStore((s) => s.selectCue);

  const activeIndex = useMemo(() => findCueIndex(cues, time), [cues, time]);
  const matches = useMemo(() => searchCues(cues, query), [cues, query]);
  const totalMatches = useMemo(() => countMatches(cues, query), [cues, query]);

  const virtualizer = useVirtualizer({
    count: cues.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 76,
    overscan: 12,
  });

  const focusedIndex = query.trim().length > 1 && matches.length ? matches[Math.min(matchAt, matches.length - 1)].cueIndex : activeIndex;

  useEffect(() => {
    if (!follow || focusedIndex < 0) return;
    virtualizer.scrollToIndex(focusedIndex, { align: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIndex, follow]);

  const jump = (delta: number) => {
    if (!matches.length) return;
    const next = (matchAt + delta + matches.length) % matches.length;
    setMatchAt(next);
    const cue = cues[matches[next].cueIndex];
    if (cue) {
      onSeek(cue.startTime);
      selectCue(cue.id);
    }
  };

  const items = virtualizer.getVirtualItems();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--color-tf-line)" }}>
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setMatchAt(0);
          }}
          placeholder="🔍 Search every line…"
          className="flex-1"
          style={{ fontSize: 13, padding: "7px 10px" }}
        />
        {query.trim().length > 1 && (
          <>
            <Chip tone={matches.length ? "brand" : "muted"}>
              {matches.length ? `${matchAt + 1}/${totalMatches}` : "0 hits"}
            </Chip>
            <Button size="sm" onClick={() => jump(-1)} disabled={!matches.length}>
              ↑
            </Button>
            <Button size="sm" onClick={() => jump(1)} disabled={!matches.length}>
              ↓
            </Button>
            {onSearchExternal && (
              <Button size="sm" onClick={() => onSearchExternal(query)} title="Look for a subtitle file for this word">
                🌐 Subs
              </Button>
            )}
          </>
        )}
        <Button
          size="sm"
          kind={follow ? "primary" : "ghost"}
          onClick={() => usePlayerStore.getState().setPreference({ followTranscript: !follow })}
          title="Keep the transcript in step with the video"
        >
          {follow ? "🎯 Following" : "🎯 Follow"}
        </Button>
      </div>

      <div ref={scrollRef} className="tf-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {items.map((row) => {
            const cue = cues[row.index];
            if (!cue) return null;
            const isActive = row.index === activeIndex;
            const isSelected = cue.id === selectedCueId;
            const matched = query.trim().length > 1 && cue.text.toLowerCase().includes(query.trim().toLowerCase());
            return (
              <div
                key={row.key}
                data-index={row.index}
                ref={virtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${row.start}px)` }}
              >
                <div
                  className="group mb-1 cursor-pointer rounded-xl border px-2.5 py-2 transition-colors"
                  style={{
                    borderColor: isActive ? "var(--color-tf-brand)" : matched ? "color-mix(in srgb, var(--color-tf-gold) 50%, transparent)" : "transparent",
                    background: isActive
                      ? "color-mix(in srgb, var(--color-tf-brand) 14%, transparent)"
                      : isSelected
                        ? "var(--color-tf-panel-2)"
                        : "transparent",
                  }}
                  onClick={() => {
                    onSeek(cue.startTime);
                    selectCue(cue.id);
                  }}
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
                    <span className="tabular-nums">{formatClock(cue.startTime)}</span>
                    {cue.speaker && <span style={{ color: "var(--color-tf-gold)" }}>{cue.speaker}</span>}
                    <span className="ml-auto hidden gap-1 group-hover:flex">
                      <button
                        className="rounded px-1.5 py-0.5"
                        style={{ background: "var(--color-tf-panel-2)" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onPlayLine(cue);
                        }}
                        title="Replay this line"
                      >
                        🔁
                      </button>
                      <button
                        className="rounded px-1.5 py-0.5"
                        style={{ background: "var(--color-tf-panel-2)" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onPlayLine(cue, { slow: true });
                        }}
                        title="Slow replay"
                      >
                        🐢
                      </button>
                      <button
                        className="rounded px-1.5 py-0.5"
                        style={{ background: "var(--color-tf-panel-2)" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onCuePrompt(cue);
                        }}
                        title="Copy an AI prompt for this line"
                      >
                        📋
                      </button>
                    </span>
                  </div>
                  <div className={isActive ? "text-[14.5px] font-bold" : "text-[14px]"}>{cue.text}</div>
                  {cue.translation && (
                    <div className="text-[12.5px]" style={{ color: "var(--color-tf-sub)", direction: isRtl(cue.translation) ? "rtl" : "ltr" }}>
                      {cue.translation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** Persian / Arabic / Hebrew translations need RTL alignment. */
function isRtl(text: string): boolean {
  return /[\u0590-\u08FF]/.test(text);
}
