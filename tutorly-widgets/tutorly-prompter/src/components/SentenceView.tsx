import React, { useCallback } from "react";
import type { LessonSentence } from "../types";
import { tokenize, plainText } from "../utils/annotations";
import { cn } from "../utils/cn";

const EMOTION_ICON: Record<string, string> = {
  smile: "🙂", serious: "🧐", excited: "🤩", warm: "🤗",
  curious: "🤔", encouraging: "👍", neutral: "😐",
};

const BLOOM_TOOLTIPS: Record<string, string> = {
  remember: "Remember — Recall facts. Ask: What is…? Can you list…? When did…?",
  understand: "Understand — Explain ideas. Ask: Why does…? Can you describe…? What's the difference…?",
  apply: "Apply — Use in new situations. Ask: How would you use…? Can you show me…? Try using it in…",
  analyze: "Analyze — Break down. Ask: What's the pattern? Why do you think…? Compare…",
  evaluate: "Evaluate — Justify. Ask: Which is better? Do you agree? What would you change?",
  create: "Create — Produce new. Ask: Can you make…? Design…? What if…?",
};

const BLOOM_COLOR: Record<string, string> = {
  remember: "slate", understand: "blue", apply: "emerald",
  analyze: "violet", evaluate: "amber", create: "rose",
};

export interface SentenceViewProps {
  sentence: LessonSentence;
  index: number;
  studentName?: string;
  isCurrent: boolean;
  isBookmarked: boolean;
  showTranslations: boolean;
  showPronunciation: boolean;
  showBloom: boolean;
  showEmotion: boolean;
  showPitchContour: boolean;
  onClick?: () => void;
}

export const SentenceView = React.memo(function SentenceView(p: SentenceViewProps) {
  const tokens = tokenize(p.sentence.text, p.studentName);
  const ann = p.sentence.ann;

  const speakSentence = useCallback(() => {
    const text = plainText(p.sentence.text, p.studentName);
    if (!text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    speechSynthesis.speak(u);
  }, [p.sentence.text, p.studentName]);

  return (
    <div
      data-sentence-idx={p.index}
      onClick={p.onClick}
      className={cn(
        "tp-sentence relative px-1 py-2 transition-opacity",
        p.isCurrent && "tp-current",
      )}
      style={{ scrollMarginTop: "30vh" }}
    >
      {/* pitch contour */}
      {p.showPitchContour && ann?.pitchContour && ann.pitchContour.length > 1 && (
        <PitchContour values={ann.pitchContour} />
      )}

      {/* main text line */}
      <div className="tp-line leading-[var(--tp-lh)]">
        {p.isBookmarked && (
          <span className="mr-1 align-middle text-amber-400" title="Bookmark">★</span>
        )}
        {p.showEmotion && ann?.emotion && (
          <span className="mr-1 align-middle text-[0.7em]" title={ann.emotion}>
            {EMOTION_ICON[ann.emotion] || "•"}
          </span>
        )}
        {tokens.map((t, i) => {
          if (t.kind === "space") return <span key={i}> </span>;
          if (t.kind === "pause")
            return (
              <span key={i} className={cn("tp-pause", t.long ? "tp-pause-long" : "tp-pause-short")}
                title={t.long ? "Longer pause" : "Short pause"}>
                {/* Visual pause: thin bar or wider gap — NO slash characters */}
                <span aria-hidden>{t.long ? "  ▪  " : " · "}</span>
              </span>
            );
          if (t.kind === "arrow")
            return (
              <span key={i} className={cn("tp-arrow", t.dir === "up" ? "tp-arrow-up" : "tp-arrow-down")}
                title={`Intonation ${t.dir}`}>
                {t.dir === "up" ? "↗" : "↘"}
              </span>
            );
          if (t.kind === "placeholder")
            return <span key={i} className="tp-placeholder">{t.name}</span>;
          if (t.kind === "emotion")
            return p.showEmotion ? (
              <span key={i} className="tp-emotion" title={t.tag}>{EMOTION_ICON[t.tag] || "•"}</span>
            ) : null;

          // Word — only "primary" stress gets visual treatment (bold red underline)
          // "secondary" and "reduced" render as normal text (no symbols)
          const isPrimary = t.stress === "primary";
          const ipa = ann?.pronunciation?.find(
            (g) => g.word.toLowerCase() === t.text.toLowerCase().replace(/[.,!?;:]+$/, ""),
          );
          const accent = ann?.accentMarkers?.find(
            (a) => a.word.toLowerCase() === t.text.toLowerCase().replace(/[.,!?;:]+$/, ""),
          );
          return (
            <span key={i} className="tp-word-wrap">
              <span
                className={cn(
                  "tp-word",
                  isPrimary && "tp-stress-primary",
                  accent && "tp-accent-marker",
                )}
                title={accent ? `Pronunciation tip: ${accent.reason}` : undefined}
              >
                {t.text}
              </span>
              {p.showPronunciation && ipa && (
                <sup className="tp-ipa">/{ipa.ipa}/</sup>
              )}
              {t.linkNext && <span className="tp-link">‿</span>}
            </span>
          );
        })}
        {/* Speaker button — read this sentence aloud */}
        <button
          className="tp-speak-btn"
          onClick={(e) => { e.stopPropagation(); speakSentence(); }}
          title="Read aloud"
        >
          🔊
        </button>
      </div>

      {/* sub-line metadata — NO wait time display */}
      {(p.showTranslations && ann?.translations?.length) ||
       (p.showBloom && ann?.bloom) ||
       ann?.confidenceBoost ? (
        <div className="tp-meta">
          {p.showBloom && ann?.bloom && (
            <span
              className={cn("tp-bloom", `tp-bloom-${BLOOM_COLOR[ann.bloom] || "slate"}`)}
              title={BLOOM_TOOLTIPS[ann.bloom] || ann.bloom}
            >
              {ann.bloom}
            </span>
          )}
          {p.showTranslations && ann?.translations?.map((t, i) => (
            <span key={i} className="tp-translation">{t.word} → {t.tr}</span>
          ))}
          {ann?.confidenceBoost && <span className="tp-boost">💪 {ann.confidenceBoost}</span>}
        </div>
      ) : null}
    </div>
  );
});

const PitchContour: React.FC<{ values: number[] }> = ({ values }) => {
  const w = 60, h = 10;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - (-1)) / 2) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="tp-pitch" aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
