"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTutor } from "@/lib/store";
import { api } from "@/lib/api";
import { sfxCorrect, sfxStar, sfxWin, sfxWrong } from "@/lib/sfx";
import { speak } from "@/lib/speech";
import { t } from "@/lib/data/phrases";
import { IconCheck, IconStar } from "./Icons";

type Kind = "correct" | "oops" | "star" | "win";

interface Ctx {
  mark: (kind: "correct" | "wrong", wordId?: string) => void;
  star: (wordId?: string) => void;
  win: () => void;
  seen: (wordId: string) => void;
  score: number;
  total: number;
  resetScore: () => void;
}

const FeedbackCtx = createContext<Ctx | null>(null);

export function useFeedback(): Ctx {
  const c = useContext(FeedbackCtx);
  if (!c) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return c;
}

const PRAISE: Record<Kind, { key: string; color: string; icon: ReactNode }> = {
  correct: { key: "ui.correct", color: "#8fbe9b", icon: <IconCheck size={44} /> },
  oops: { key: "ui.oops", color: "#f5c453", icon: <IconStar size={40} /> },
  star: { key: "ui.great", color: "#f5c453", icon: <IconStar size={44} /> },
  win: { key: "quiz.finish", color: "#e86a8a", icon: <IconStar size={44} /> },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [flash, setFlash] = useState<{ kind: Kind; id: number } | null>(null);
  const [bursts, setBursts] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const student = useTutor((s) => s.student);
  const targetLang = useTutor((s) => s.targetLang);
  const awardStar = useTutor((s) => s.awardStar);
  const muted = useTutor((s) => s.muted);

  const show = useCallback((kind: Kind) => {
    setFlash({ kind, id: Date.now() });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), kind === "win" ? 2600 : 1200);
  }, []);

  const persist = useCallback(
    (wordId: string | undefined, patch: { stars?: number; seen?: number; correct?: number; wrong?: number }) => {
      if (!student || !wordId) return;
      void api.saveProgress({ studentId: student.id, wordId, targetLang, ...patch });
    },
    [student, targetLang],
  );

  const value = useMemo<Ctx>(
    () => ({
      mark(kind, wordId) {
        if (kind === "correct") {
          sfxCorrect();
          setScore((s) => s + 1);
          setTotal((n) => n + 1);
          awardStar(wordId);
          persist(wordId, { correct: 1, seen: 1, stars: 1 });
          show("correct");
          setBursts((b) => [...b.slice(-6), Date.now()]);
        } else {
          sfxWrong();
          setTotal((n) => n + 1);
          persist(wordId, { wrong: 1, seen: 1 });
          show("oops");
        }
        if (!muted && kind === "correct") {
          void speak(t("ui.great", targetLang), { lang: targetLang, slow: false });
        }
      },
      star(wordId) {
        sfxStar();
        awardStar(wordId);
        persist(wordId, { stars: 1, seen: 1 });
        show("star");
        setBursts((b) => [...b.slice(-6), Date.now()]);
      },
      win() {
        sfxWin();
        show("win");
        if (!muted) void speak(t("quiz.finish", targetLang), { lang: targetLang });
      },
      seen(wordId) {
        persist(wordId, { seen: 1 });
      },
      score,
      total,
      resetScore() {
        setScore(0);
        setTotal(0);
      },
    }),
    [awardStar, persist, show, score, total, muted, targetLang],
  );

  return (
    <FeedbackCtx.Provider value={value}>
      {children}
      {/* floating stars */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        <AnimatePresence>
          {bursts.map((b) => (
            <motion.div
              key={b}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onAnimationComplete={() => setBursts((x) => x.filter((y) => y !== b))}
              className="absolute inset-0 grid place-items-center"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  initial={{ x: 0, y: 40, scale: 0.3, opacity: 0 }}
                  animate={{ x: (i - 2) * 70, y: -180, scale: 1.2, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.5, delay: i * 0.07, ease: "easeOut" }}
                  className="absolute text-sun"
                >
                  <IconStar size={44} />
                </motion.span>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* praise pill */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -20 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="pointer-events-none fixed left-1/2 top-[16%] z-50 -translate-x-1/2"
          >
            <div
              className="flex items-center gap-4 rounded-[2rem] px-9 py-5 text-white shadow-2xl"
              style={{ background: PRAISE[flash.kind].color }}
            >
              {PRAISE[flash.kind].icon}
              <span className="font-display text-5xl font-extrabold">
                {t(PRAISE[flash.kind].key, targetLang)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FeedbackCtx.Provider>
  );
}
