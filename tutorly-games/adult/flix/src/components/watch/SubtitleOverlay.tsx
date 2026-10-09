import React, { useMemo } from "react";
import type { SubtitleCue } from "../../types";
import { wordIndexAt } from "../../lib/subtitles";
import { usePlayerStore } from "../../store/player";

/**
 * The subtitle overlay.
 *
 * Why not the player's own caption renderer: a language learner needs more than
 * text on screen. This renders BOTH tracks at once (original above translation),
 * highlights the word being spoken right now, lets every word be clicked to hear
 * it again, and follows the learner's size/order preferences. Embedded tracks
 * from the stream still play normally underneath — this overlay only draws the
 * tracks loaded as learning material.
 */
export const SubtitleOverlay: React.FC<{
  original: SubtitleCue | null;
  translation: SubtitleCue | null;
  /** Seek to a word — the parent owns the media element. */
  onSeek: (time: number) => void;
  /** Freeze the video for a second so the learner can read. */
  onHold?: () => void;
  compact?: boolean;
}> = ({ original, translation, onSeek, onHold, compact }) => {
  const mode = usePlayerStore((s) => s.subtitleMode);
  const time = usePlayerStore((s) => s.time);
  const scale = usePlayerStore((s) => s.subtitleScale);
  const showWords = usePlayerStore((s) => s.showWordHighlight);
  const dualOrder = usePlayerStore((s) => s.dualOrder);

  const activeWord = useMemo(() => wordIndexAt(original, time), [original, time]);

  if (mode === "off") return null;
  if (!original && !translation) return null;

  const showOriginal = mode === "original" || mode === "dual";
  const showTranslation = mode === "translation" || mode === "dual";
  const originalFirst = dualOrder === "original-first";
  const baseSize = compact ? 15 : 22;

  const renderCue = (cue: SubtitleCue | null, kind: "original" | "translation") => {
    if (!cue) return null;
    const isOriginal = kind === "original";
    return (
      <div
        key={kind}
        className="tf-fade-up pointer-events-auto max-w-full"
        style={{
          fontSize: `clamp(${baseSize * 0.72}px, ${(baseSize * scale).toFixed(1)}px + 0.6vw, ${baseSize * 1.9 * scale}px)`,
          fontWeight: isOriginal ? 800 : 600,
          color: isOriginal ? "#fff" : "rgba(255,255,255,0.82)",
          textShadow: "0 2px 10px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)",
          lineHeight: 1.28,
        }}
        onDoubleClick={onHold}
        title={onHold ? "Double-click to hold the frame" : undefined}
      >
        {isOriginal && cue.words?.length && showWords ? (
          <span>
            {cue.words.map((word, index) => (
              <React.Fragment key={`${word.text}-${index}`}>
                <span
                  className="tf-word"
                  data-active={index === activeWord}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSeek(word.startTime);
                  }}
                  title={`${word.startTime.toFixed(2)}s — click to replay this word`}
                >
                  {word.text}
                </span>
                {index < (cue.words?.length ?? 0) - 1 ? " " : ""}
              </React.Fragment>
            ))}
          </span>
        ) : (
          (cue.lines?.length ? cue.lines : [cue.text]).join(" ")
        )}
      </div>
    );
  };

  const originalBlock = showOriginal ? renderCue(original, "original") : null;
  const translationBlock = showTranslation ? renderCue(translation ?? original, "translation") : null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1 px-3 text-center"
      style={{ bottom: compact ? "6%" : "8%" }}
      data-testid="subtitle-overlay"
    >
      {original?.speaker && (
        <div
          className="rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wider"
          style={{ background: "rgba(0,0,0,0.6)", color: "var(--color-tf-gold)" }}
        >
          {original.speaker}
        </div>
      )}
      <div
        className="pointer-events-none rounded-2xl px-3 py-1.5"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))" }}
      >
        {originalFirst ? (
          <>
            {originalBlock}
            {translationBlock}
          </>
        ) : (
          <>
            {translationBlock}
            {originalBlock}
          </>
        )}
      </div>
    </div>
  );
};
