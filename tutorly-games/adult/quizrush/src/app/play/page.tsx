"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import QuestionView from "@/components/QuestionView";
import Shop from "@/components/Shop";
import Leaderboard, { type LBPlayer } from "@/components/Leaderboard";
import { PowerUpDrop, PowerUpBar, PowerUpGuide } from "@/components/PowerUps";
import { Confetti, FloatingTexts, type FloatText } from "@/components/Effects";
import { TeachingSlides, Flashcards, type WrongAnswer } from "@/components/Review";
import TimerRing from "@/components/TimerRing";
import AudioControls from "@/components/AudioControls";
import type { Question, PlayerEconomy } from "@/lib/types";
import { defaultEconomy } from "@/lib/economy";
import { sfx, unlockAudio } from "@/lib/sound";
import { checkAnswer } from "@/lib/quiz";
import { answerGame, buyUpgrade, getGame, getPlayer } from "@/lib/localApi";

interface GameState {
  game: { status: string; currentQuestion: number; totalQuestions: number; title: string };
  currentQuestion: Question | null;
  players: LBPlayer[];
}

function PlayInner() {
  /**
   * `?code=…&pid=…`, not a path segment.
   *
   * This page used to be `/play/[code]`, which a static export cannot prerender:
   * neither the code nor the player id exists until run time. The join page links
   * here with both in the query string.
   */
  const sp = useSearchParams();
  const code = (sp.get("code") ?? "").toUpperCase();
  const pid = Number(sp.get("pid"));
  const [state, setState] = useState<GameState | null>(null);
  const [me, setMe] = useState<{ cash: number; streak: number; economy: PlayerEconomy; wrongAnswers: WrongAnswer[] } | null>(null);

  const [answeredIdx, setAnsweredIdx] = useState<number>(-1);
  const [reveal, setReveal] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean; delta: number; breakdown: string[]; correctAnswer: unknown } | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [drop, setDrop] = useState<string | null>(null);
  const [armed, setArmed] = useState<string[]>([]);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [confetti, setConfetti] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [frozen, setFrozen] = useState(false);
  const [fifty, setFifty] = useState<number[]>([]);
  const [shopBusy, setShopBusy] = useState(false);
  const [reviewTab, setReviewTab] = useState<"slides" | "cards">("slides");

  const floatId = useRef(0);
  const prevStatus = useRef("");

  const addFloat = (text: string, color: string) => {
    const id = ++floatId.current;
    setFloats((f) => [...f, { id, text, color, x: window.innerWidth / 2, y: window.innerHeight / 2 }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1200);
  };

  const loadMe = useCallback(() => {
    if (!pid) return;
    const d = getPlayer(pid);
    if (d) {
      setMe({
        cash: d.cash,
        streak: d.streak,
        economy: d.economy || defaultEconomy(),
        wrongAnswers: (d.wrongAnswers as WrongAnswer[]) || [],
      });
    }
  }, [pid]);

  const poll = useCallback(() => {
    const d = getGame(code);
    if (d) setState(d as GameState);
  }, [code]);

  useEffect(() => {
    poll();
    loadMe();
    const t = setInterval(poll, 1500);
    return () => clearInterval(t);
  }, [poll, loadMe]);

  const qIndex = state?.game.currentQuestion ?? -1;
  const q = state?.currentQuestion;
  const status = state?.game.status;

  // New question -> reset per-question UI
  useEffect(() => {
    if (qIndex >= 0) {
      setReveal(false);
      setLastResult(null);
      setFrozen(false);
      setFifty([]);
      setArmed([]);
      loadMe();
    }
  }, [qIndex, loadMe]);

  // Timer
  useEffect(() => {
    if (status !== "live" || !q || answeredIdx === qIndex || reveal) return;
    setTimeLeft(q.timeLimit || 20);
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (frozen) return s;
        if (s <= 1) {
          clearInterval(t);
          // auto-submit as wrong (empty)
          submitAnswer(null, true);
          return 0;
        }
        if (s <= 5) sfx.tick();
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, status, frozen]);

  // Game end celebration
  useEffect(() => {
    if (status === "ended" && prevStatus.current !== "ended") {
      loadMe();
      sfx.win();
      setConfetti((c) => c + 1);
    }
    if (status) prevStatus.current = status;
  }, [status, loadMe]);

  const toggleArm = (id: string) => {
    unlockAudio();
    // instant-use client-side powerups
    if (id === "freeze") {
      if (!frozen) {
        setFrozen(true);
        sfx.powerup();
        // consume immediately client-side (also server on next answer since sent in armed? no) -> handle via armed list
      }
      return;
    }
    if (id === "fifty") {
      if (q?.choices && !fifty.length) {
        const answer = q.answer;
        const correctIdxs = Array.isArray(answer) ? (answer as number[]) : [Number(answer)];
        const wrongIdxs = q.choices.map((_, i) => i).filter((i) => !correctIdxs.includes(i));
        const toHide = wrongIdxs.sort(() => Math.random() - 0.5).slice(0, 2);
        setFifty(toHide);
        setArmed((a) => (a.includes("fifty") ? a : [...a, "fifty"]));
        sfx.powerup();
      }
      return;
    }
    sfx.click();
    setArmed((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  };

  const submitAnswer = async (response: unknown, timeout = false) => {
    if (answeredIdx === qIndex || !q) return;
    setAnsweredIdx(qIndex);
    unlockAudio();

    // build activated powerups (armed + consumed instant ones)
    const activated = [...armed];
    if (frozen && me?.economy.powerups.includes("freeze")) activated.push("freeze");

    // optimistic feedback
    const correctGuess = timeout ? false : checkAnswer(q, response);
    if (correctGuess) {
      sfx.correct();
      sfx.cash();
      setConfetti((c) => c + 1);
    } else {
      sfx.wrong();
    }

    const d = answerGame(code, { playerId: pid, questionIndex: qIndex, response, activatedPowerups: activated });
    // A duplicate or a bad request just unlocks the question again — the route's
    // failure modes are unchanged, they simply arrive without a network hop now.
    if ("error" in d) {
      setAnsweredIdx(-1);
      return;
    }
    setReveal(true);
    setLastResult({ correct: d.correct, delta: d.cashDelta, breakdown: d.breakdown || [], correctAnswer: d.correctAnswer });
    addFloat(d.cashDelta >= 0 ? `+$${d.cashDelta}` : `-$${Math.abs(d.cashDelta)}`, d.cashDelta >= 0 ? "#22c55e" : "#ef4444");
    if (d.droppedPowerup) {
      setTimeout(() => {
        setDrop(d.droppedPowerup);
        sfx.powerup();
      }, 900);
    }
    loadMe();
    poll();
  };

  const buy = (item: "multiplier" | "streak" | "insurance") => {
    setShopBusy(true);
    const d = buyUpgrade(code, { playerId: pid, item });
    if ("ok" in d) {
      sfx.levelup();
      setMe((m) => (m ? { ...m, cash: d.newCash, economy: d.economy } : m));
    }
    setShopBusy(false);
  };

  if (!state || !me) {
    return <main className="flex min-h-screen items-center justify-center text-2xl font-bold text-slate-400">Connecting…</main>;
  }

  const myRank = state.players.find((p) => p.id === pid)?.rank ?? "-";
  const alreadyAnswered = answeredIdx === qIndex || reveal;

  // ===== HEADER (always visible during game) =====
  const Header = (
    <div className="sticky top-0 z-40 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl glass-strong px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Cash</div>
          <div className="money text-2xl md:text-3xl text-green-400">${me.cash.toLocaleString()}</div>
        </div>
        {me.streak >= 2 && (
          <div className="anim-pop rounded-xl bg-orange-500/25 px-3 py-1 text-lg font-black text-orange-300">🔥 {me.streak}</div>
        )}
        <div className="rounded-xl bg-white/10 px-3 py-1 text-lg font-black">#{myRank}</div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => { setGuideOpen(true); sfx.click(); }} className="rounded-xl bg-white/10 px-3 py-2 font-bold hover:bg-white/20">❓</button>
        <button onClick={() => { setShopOpen(true); sfx.click(); }} className="btn-glow rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 font-black text-slate-900">🛒 Shop</button>
        <AudioControls />
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-4xl px-3 py-3">
      <Confetti trigger={confetti} />
      <FloatingTexts items={floats} />
      {drop && (
        <PowerUpDrop
          id={drop}
          onClose={() => {
            setDrop(null);
            loadMe();
          }}
        />
      )}
      {shopOpen && <Shop cash={me.cash} economy={me.economy} onBuy={buy} onClose={() => setShopOpen(false)} busy={shopBusy} />}
      {guideOpen && <PowerUpGuide onClose={() => setGuideOpen(false)} />}

      {Header}

      {/* LOBBY */}
      {status === "lobby" && (
        <div className="glass-strong mt-6 rounded-3xl p-8 text-center">
          <div className="text-6xl anim-ring inline-block rounded-full">⏳</div>
          <h2 className="mt-4 text-3xl font-black">You&apos;re in!</h2>
          <p className="mt-2 text-lg text-slate-300">Waiting for the host to start the game…</p>
          <p className="mt-4 text-slate-400">💡 Tip: open the Shop 🛒 and read the Power-Up Guide ❓ while you wait.</p>
        </div>
      )}

      {/* LIVE */}
      {status === "live" && q && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-full bg-white/10 px-4 py-1.5 font-black">
              Q{qIndex + 1}/{state.game.totalQuestions}
            </div>
            {!alreadyAnswered && <TimerRing seconds={timeLeft} total={q.timeLimit || 20} frozen={frozen} />}
          </div>

          {/* Power-up inventory */}
          {me.economy.powerups.length > 0 && !alreadyAnswered && (
            <div className="mb-3">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">🎒 Your Power-Ups — tap to arm before answering</div>
              <PowerUpBar owned={me.economy.powerups} onActivate={toggleArm} activated={[...armed, ...(frozen ? ["freeze"] : [])]} />
            </div>
          )}

          {!alreadyAnswered ? (
            <QuestionView
              question={q}
              qIndex={qIndex}
              onSubmit={(r) => submitAnswer(r)}
              hideChoices={fifty}
            />
          ) : (
            <ResultCard result={lastResult} onShop={() => setShopOpen(true)} />
          )}
        </>
      )}

      {/* ENDED */}
      {status === "ended" && (
        <div className="mt-4">
          <div className="glass-strong rounded-3xl p-6 text-center">
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl md:text-4xl font-black">Game Over!</h2>
            <p className="mt-1 text-lg text-slate-300">You finished rank <span className="font-black text-cyan-300">#{myRank}</span> with <span className="money text-green-400">${me.cash.toLocaleString()}</span></p>
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-2xl font-black">🏆 Leaderboard</h3>
            <Leaderboard players={state.players} highlightId={pid} />
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={() => setReviewTab("slides")} className={`flex-1 rounded-2xl py-3 text-lg font-black ${reviewTab === "slides" ? "bg-gradient-to-r from-indigo-500 to-cyan-500" : "bg-white/10"}`}>📚 Teaching Slides</button>
            <button onClick={() => setReviewTab("cards")} className={`flex-1 rounded-2xl py-3 text-lg font-black ${reviewTab === "cards" ? "bg-gradient-to-r from-indigo-500 to-cyan-500" : "bg-white/10"}`}>🧠 Flashcards ({me.wrongAnswers.length})</button>
          </div>

          <div className="mt-4">
            {reviewTab === "slides" ? (
              q ? <TeachingSlides questions={[q]} /> : <ReviewFromWrong wrong={me.wrongAnswers} />
            ) : (
              <Flashcards wrong={me.wrongAnswers} />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// When live question data isn't available, build teaching slides from wrong answers.
function ReviewFromWrong({ wrong }: { wrong: WrongAnswer[] }) {
  const questions: Question[] = wrong.map((w) => ({
    type: (w.type as Question["type"]) || "mc",
    question: w.question,
    choices: w.choices,
    answer: w.correctAnswer,
    explanation: w.explanation,
    slide: w.slide,
    passage: w.passage,
    audioText: w.audioText,
    dialogue: w.dialogue,
  }));
  if (!questions.length)
    return <div className="glass rounded-2xl p-6 text-center text-green-300">🏆 Perfect run — nothing to review!</div>;
  return <TeachingSlides questions={questions} />;
}

function ResultCard({
  result,
  onShop,
}: {
  result: { correct: boolean; delta: number; breakdown: string[]; correctAnswer: unknown } | null;
  onShop: () => void;
}) {
  if (!result)
    return <div className="glass rounded-3xl p-8 text-center text-slate-300">Locking in your answer…</div>;
  return (
    <div className={`anim-pop rounded-3xl p-6 md:p-8 text-center ${result.correct ? "bg-green-500/15 ring-2 ring-green-400" : "bg-red-500/15 ring-2 ring-red-400"} ${!result.correct ? "anim-shake" : ""}`}>
      <div className="text-7xl">{result.correct ? "✅" : "❌"}</div>
      <h2 className={`mt-2 text-3xl md:text-4xl font-black ${result.correct ? "text-green-300" : "text-red-300"}`}>
        {result.correct ? "Correct!" : "Not quite"}
      </h2>
      <div className={`money mt-1 text-4xl md:text-5xl ${result.delta >= 0 ? "text-green-400" : "text-red-400"}`}>
        {result.delta >= 0 ? `+$${result.delta}` : `-$${Math.abs(result.delta)}`}
      </div>
      <div className="mx-auto mt-4 max-w-md space-y-1 text-left">
        {result.breakdown.map((b, i) => (
          <div key={i} className="rounded-lg bg-black/20 px-3 py-1.5 text-sm md:text-base">{b}</div>
        ))}
      </div>
      <p className="mt-4 text-slate-300">Waiting for the host to advance… ⏭</p>
      <button onClick={onShop} className="btn-glow mt-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-3 font-black text-slate-900">🛒 Visit Shop</button>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading…</div>}>
      <PlayInner />
    </Suspense>
  );
}
