"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Word } from "@/lib/data/types";
import { WORDS, label, sample, shuffle } from "@/lib/data";
import { getCcqs, getDrills, sentenceFor } from "@/lib/data/ccq";
import { t } from "@/lib/data/phrases";
import type { Setup } from "@/lib/useSetup";
import { useFeedback } from "@/components/ui/Feedback";
import { ArtTile } from "@/components/ui/ArtTile";
import { BigButton, SpeakerButton, WordCard } from "@/components/ui/Kit";
import { IconArrowLeft, IconArrowRight, IconMic, IconSpeaker, IconStar } from "@/components/ui/Icons";
import { sfxPage, sfxTap } from "@/lib/sfx";
import { api } from "@/lib/api";

/* ------------------------------------------------------------------ shared */

function distractors(word: Word, pool: Word[], n: number, seed: number): Word[] {
  const others = pool.filter((w) => w.id !== word.id);
  const fromPool = sample(others, n, seed);
  if (fromPool.length >= n) return fromPool;
  const rest = sample(WORDS.filter((w) => w.id !== word.id && !fromPool.some((f) => f.id === w.id)), n - fromPool.length, seed + 3);
  return [...fromPool, ...rest].slice(0, n);
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center gap-8 px-4 py-6">{children}</div>
  );
}

function WordStrip({ words, index, onPick }: { words: Word[]; index: number; onPick: (i: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {words.map((w, i) => (
        <button
          key={w.id}
          onClick={() => {
            sfxTap();
            onPick(i);
          }}
          className={`soft-ring no-select h-12 w-12 rounded-full border-2 text-xl font-bold transition ${
            i === index ? "border-coral bg-coral text-white" : "border-sand bg-paper text-inksoft hover:border-coral/50"
          }`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ LEARN */

export function LearnMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [i, setI] = useState(0);
  const word = s.words[i % s.words.length];
  const [reveal, setReveal] = useState(true);

  useEffect(() => {
    setReveal(true);
    fb.seen(word.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const go = (d: number) => {
    sfxPage();
    setI((p) => (p + d + s.words.length) % s.words.length);
  };

  return (
    <Stage>
      <AnimatePresence mode="wait">
        <motion.div
          key={word.id + String(reveal)}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="w-full"
        >
          <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center gap-6 rounded-[2.6rem] bg-paper p-8 tile-shadow">
            <ArtTile word={word} size={s.bigView ? 340 : 280} color={s.theme.color} float />

            {reveal ? (
              <div className="text-center">
                <div
                  className="font-display font-extrabold leading-none"
                  style={{ color: s.theme.color, fontSize: s.bigView ? "7rem" : "5.4rem" }}
                >
                  {label(word, s.targetLang)}
                </div>
                {s.targetLang === "zh" && word.py && (
                  <div className="mt-2 text-3xl font-bold tracking-widest text-inksoft">{word.py}</div>
                )}
                {!s.mono && s.homeLang !== s.targetLang && (
                  <div className="mt-3 text-4xl font-bold text-inksoft">{label(word, s.homeLang)}</div>
                )}
                {word.letter && word.ex && (
                  <div className="mt-3 text-3xl font-bold text-ink">
                    {t("letter.aIsFor", s.targetLang, {
                      L: word.letter,
                      w: label(WORDS.find((x) => x.id === word.ex)!, s.targetLang),
                    })}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setReveal(true)}
                className="soft-ring cursor-pointer rounded-[1.6rem] bg-cream px-10 py-5 font-display text-4xl font-extrabold text-inksoft"
              >
                👀 {t("quiz.whatisthis", s.targetLang)}
              </button>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4">
              <SpeakerButton
                size="xl"
                onClick={() => void s.sayWord(word, s.targetLang, s.homeLang, s.mono)}
                title={t("ui.listen", s.homeLang)}
              />
              <SpeakerButton
                size="lg"
                variant="sky"
                onClick={() => void s.say(label(word, s.targetLang), s.targetLang)}
                title={t("ui.slow", s.homeLang)}
              />
              {!s.mono && s.homeLang !== s.targetLang && (
                <SpeakerButton
                  size="lg"
                  variant="paper"
                  onClick={() => void s.say(label(word, s.homeLang), s.homeLang)}
                  title={label(word, s.homeLang)}
                />
              )}
              <BigButton variant="sun" size="lg" onClick={() => void s.say(sentenceFor(word, s.targetLang), s.targetLang)}>
                <IconSpeaker size={26} /> {sentenceFor(word, s.targetLang)}
              </BigButton>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 rounded-[1.6rem] bg-cream px-6 py-4">
              <span className="text-xl font-bold text-inksoft">{t("ui.tutornote", s.homeLang)}:</span>
              <span className="text-2xl font-bold text-ink">
                {getCcqs(word, s.targetLang)
                  .slice(0, 2)
                  .map((c) => t(c.key, s.homeLang, c.vars))
                  .join("  •  ")}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <BigButton variant="paper" onClick={() => go(-1)}>
          <IconArrowLeft size={28} /> {t("ui.back", s.homeLang)}
        </BigButton>
        <BigButton
          variant="berry"
          onClick={() => {
            fb.star(word.id);
          }}
        >
          <IconStar size={28} /> {t("ui.stars", s.homeLang)}
        </BigButton>
        <BigButton variant="paper" onClick={() => setReveal((r) => !r)}>
          <IconMic size={26} /> {reveal ? "🙈 hide word" : "👀 show word"}
        </BigButton>
        <BigButton variant="sage" onClick={() => go(1)}>
          {t("ui.next", s.homeLang)} <IconArrowRight size={28} />
        </BigButton>
      </div>
      <WordStrip words={s.words} index={i} onPick={setI} />
    </Stage>
  );
}

/* ------------------------------------------------------------------ TALK TIME (CCQ) */

export function TalkMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [i, setI] = useState(0);
  const [qi, setQi] = useState(0);
  const [timer, setTimer] = useState(0);
  const word = s.words[i % s.words.length];

  const ccqs = useMemo(() => getCcqs(word, s.targetLang), [word, s.targetLang]);
  const drills = useMemo(() => getDrills(word, s.targetLang), [word, s.targetLang]);
  const q = ccqs[qi % ccqs.length];

  useEffect(() => {
    setQi(0);
    setTimer(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const answer = (ok: boolean) => {
    fb.mark(ok ? "correct" : "wrong", word.id);
    setTimeout(() => setQi((p) => (p + 1) % ccqs.length), 900);
  };

  return (
    <Stage>
      <div className="grid w-full grid-cols-1 items-start gap-8 lg:grid-cols-[340px_1fr]">
        {/* word anchor */}
        <div className="flex flex-col items-center gap-4 rounded-[2.4rem] bg-paper p-6 tile-shadow">
          <ArtTile word={word} size={170} color={s.theme.color} float />
          <div className="text-center font-display text-5xl font-extrabold" style={{ color: s.theme.color }}>
            {label(word, s.targetLang)}
          </div>
          {!s.mono && s.homeLang !== s.targetLang && (
            <div className="text-center text-3xl font-bold text-inksoft">{label(word, s.homeLang)}</div>
          )}
          <SpeakerButton size="md" onClick={() => void s.sayWord(word, s.targetLang, s.homeLang, s.mono)} title={t("ui.listen", s.homeLang)} />
          <div className="w-full rounded-[1.4rem] bg-cream px-4 py-3 text-center text-2xl font-bold text-ink">
            {sentenceFor(word, s.targetLang)}
          </div>
        </div>

        {/* question */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={word.id + "-" + qi}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.26 }}
              className="rounded-[2.4rem] bg-paper p-8 tile-shadow"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="rounded-full bg-plumsoft px-4 py-1 text-xl font-extrabold text-plum">
                  {t("ui.question", s.homeLang)} {(qi % ccqs.length) + 1}/{ccqs.length}
                </span>
                {q.note && <span className="text-lg font-semibold text-inksoft">{q.note}</span>}
              </div>

              <div className="flex items-start gap-4">
                <button
                  onClick={() => void s.say(t(q.key, s.targetLang, q.vars), s.targetLang)}
                  className="soft-ring mt-1 grid h-16 w-16 shrink-0 cursor-pointer place-items-center rounded-full bg-coral text-white"
                  aria-label={t("ui.listen", s.homeLang)}
                >
                  <IconSpeaker size={30} />
                </button>
                <div className="font-display text-6xl leading-tight font-extrabold text-ink">
                  {t(q.key, s.targetLang, q.vars)}
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                {q.type === "yesno" && (
                  <>
                    <BigButton variant="sage" size="xl" onClick={() => answer(q.answer === "yes")}>
                      {t("ui.yes", s.targetLang)}
                    </BigButton>
                    <BigButton variant="sun" size="xl" onClick={() => answer(q.answer === "no")}>
                      {t("ui.no", s.targetLang)}
                    </BigButton>
                  </>
                )}
                {q.type === "choice" &&
                  (q.optionIds ?? []).map((id, idx) => {
                    const ow = WORDS.find((x) => x.id === id);
                    if (!ow) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => answer(idx === q.correct)}
                        className="soft-ring no-select flex cursor-pointer flex-col items-center gap-2 rounded-[1.8rem] border-4 border-sand bg-cream px-7 py-5 hover:border-coral"
                      >
                        <ArtTile word={ow} size={92} color={s.theme.color} />
                        <span className="font-display text-3xl font-extrabold">{label(ow, s.targetLang)}</span>
                      </button>
                    );
                  })}
                {q.type === "talk" && (
                  <>
                    <BigButton variant="berry" size="xl" onClick={() => setTimer(20)}>
                      <IconMic size={30} /> {t("ui.speak", s.targetLang)}
                    </BigButton>
                    <BigButton variant="sage" size="xl" onClick={() => fb.mark("correct", word.id)}>
                      <IconStar size={30} /> {t("ui.isaid", s.homeLang)}
                    </BigButton>
                  </>
                )}
              </div>

              {timer > 0 && (
                <div className="mt-6 flex items-center gap-4">
                  <div className="h-5 flex-1 overflow-hidden rounded-full bg-sand">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: s.theme.color }}
                      animate={{ width: `${(timer / 20) * 100}%` }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>
                  <span className="font-display text-4xl font-extrabold" style={{ color: s.theme.color }}>
                    {timer}
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* drill ladder */}
          <div className="rounded-[2.2rem] bg-paper p-6 tile-shadow">
            <div className="mb-4 font-display text-3xl font-extrabold text-ink">{t("mode.talk", s.homeLang)} · drills</div>
            <div className="flex flex-wrap gap-3">
              {drills.map((d) => (
                <button
                  key={d.key + (d.vars?.s ?? "")}
                  onClick={() => void s.say(t(d.key, s.targetLang, d.vars), s.targetLang)}
                  className="soft-ring no-select flex cursor-pointer items-center gap-2 rounded-full border-2 border-sand bg-cream px-5 py-3 text-2xl font-bold hover:border-sky"
                >
                  <IconSpeaker size={22} className="text-sky" />
                  {t(d.key, s.targetLang, d.vars)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <BigButton variant="paper" onClick={() => setI((p) => (p - 1 + s.words.length) % s.words.length)}>
              <IconArrowLeft size={26} /> {t("ui.back", s.homeLang)}
            </BigButton>
            <BigButton variant="sage" onClick={() => setI((p) => (p + 1) % s.words.length)}>
              {t("ui.next", s.homeLang)} <IconArrowRight size={26} />
            </BigButton>
            <WordStrip words={s.words} index={i} onPick={setI} />
          </div>
        </div>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------ LISTEN & FIND */

export function ListenMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [round, setRound] = useState(0);
  const board = useMemo(
    () => shuffle(sample(s.words, Math.min(4, s.words.length), s.seed + round), s.seed + round * 5),
    [s.words, s.seed, round],
  );
  const target = board[round % board.length] ?? board[0];
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  const play = useCallback(async () => {
    setBusy(true);
    await s.say(label(target, s.targetLang), s.targetLang);
    setBusy(false);
  }, [s, target]);

  useEffect(() => {
    setLocked(false);
    const id = setTimeout(() => void play(), 380);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const pick = (w: Word) => {
    if (locked) return;
    setLocked(true);
    if (w.id === target.id) {
      fb.mark("correct", w.id);
      setTimeout(() => setRound((r) => r + 1), 1100);
    } else {
      fb.mark("wrong", w.id);
      setTimeout(() => setLocked(false), 1100);
    }
  };

  if (!board.length) return null;

  return (
    <Stage>
      <div className="flex w-full flex-col items-center gap-6">
        <div className="font-display text-6xl font-extrabold text-ink">{t("quiz.listenfind", s.targetLang)}</div>
        <div className="flex items-center gap-5">
          <SpeakerButton size="xl" onClick={() => void play()} busy={busy} title={t("ui.again", s.homeLang)} />
          <BigButton variant="paper" onClick={() => setRound((r) => r + 1)}>
            {t("ui.next", s.homeLang)} <IconArrowRight size={26} />
          </BigButton>
        </div>

        <div className="grid w-full grid-cols-2 gap-6 xl:grid-cols-4">
          {board.map((w) => (
            <motion.button
              key={w.id}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => pick(w)}
              disabled={locked}
              className={`soft-ring no-select flex cursor-pointer flex-col items-center gap-3 rounded-[2.2rem] bg-paper p-6 tile-shadow
                ${locked && w.id === target.id ? "ring-8 ring-sage" : ""}`}
            >
              <ArtTile word={w} size={s.bigView ? 220 : 180} color={s.theme.color} />
              {locked && w.id === target.id && (
                <span className="font-display text-3xl font-extrabold" style={{ color: s.theme.color }}>
                  {label(w, s.targetLang)}
                </span>
              )}
            </motion.button>
          ))}
        </div>
        <div className="text-2xl font-bold text-inksoft">
          {t("ui.round", s.homeLang)} {round + 1}
        </div>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------ QUIZ (MCQ) */

type QType = "word2pic" | "pic2word" | "listen2pic" | "pic2wordHome";

export function QuizMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [qi, setQi] = useState(0);
  const [hit, setHit] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [right, setRight] = useState(0);
  const startRef = useState(() => Date.now())[0];

  const TOTAL_Q = Math.min(10, Math.max(4, s.words.length));

  const questions = useMemo(() => {
    const picked = sample(s.words, TOTAL_Q, s.seed);
    return picked.map((w, idx) => {
      const types: QType[] = ["word2pic", "pic2word", "listen2pic"];
      if (!s.mono && s.homeLang !== s.targetLang) types.push("pic2wordHome");
      const type = types[(idx + s.seed) % types.length];
      const pool = s.words.length > 4 ? s.words : WORDS;
      return { word: w, type, options: shuffle([w, ...distractors(w, pool, 3, s.seed + idx)], s.seed + idx * 3) };
    });
  }, [s.words, s.seed, TOTAL_Q, s.mono, s.homeLang, s.targetLang]);

  const q = questions[qi];

  useEffect(() => {
    if (q && q.type === "listen2pic") {
      const id = setTimeout(() => void s.say(label(q.word, s.targetLang), s.targetLang), 350);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi]);

  const choose = (w: Word) => {
    if (hit) return;
    const ok = w.id === q.word.id;
    setHit(w.id);
    if (ok) {
      setRight((r) => r + 1);
      fb.mark("correct", w.id);
    } else {
      fb.mark("wrong", q.word.id);
    }
    setTimeout(() => {
      setHit(null);
      if (qi + 1 >= questions.length) {
        setDone(true);
        fb.win();
        if (s.student) {
          void api.saveResult({
            studentId: s.student.id,
            mode: "quiz",
            themeId: s.theme.id,
            targetLang: s.targetLang,
            score: ok ? right + 1 : right,
            total: questions.length,
            seconds: Math.round((Date.now() - startRef) / 1000),
          });
        }
      } else {
        setQi((n) => n + 1);
      }
    }, 1200);
  };

  const restart = () => {
    setQi(0);
    setDone(false);
    setRight(0);
    fb.resetScore();
  };

  if (!q) return null;

  const prompt = () => {
    if (q.type === "word2pic")
      return (
        <div className="font-display text-7xl font-extrabold" style={{ color: s.theme.color }}>
          {label(q.word, s.targetLang)}
        </div>
      );
    if (q.type === "listen2pic")
      return (
        <div className="flex items-center gap-5">
          <SpeakerButton size="xl" onClick={() => void s.say(label(q.word, s.targetLang), s.targetLang)} />
          <span className="font-display text-5xl font-extrabold text-ink">{t("quiz.listenfind", s.targetLang)}</span>
        </div>
      );
    return <ArtTile word={q.word} size={s.bigView ? 260 : 210} color={s.theme.color} float />;
  };

  const optionLabel = (w: Word) =>
    q.type === "pic2wordHome" ? label(w, s.homeLang) : label(w, s.targetLang);

  return (
    <Stage>
      {done ? (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6 rounded-[2.6rem] bg-paper px-16 py-14 tile-shadow"
        >
          <div className="text-8xl">🏆</div>
          <div className="font-display text-7xl font-extrabold" style={{ color: s.theme.color }}>
            {right}/{questions.length}
          </div>
          <div className="font-display text-5xl font-extrabold text-ink">{t("quiz.finish", s.targetLang)}</div>
          {!s.student && <div className="text-2xl font-bold text-inksoft">{t("ui.nochild", s.homeLang)}</div>}
          <BigButton variant="sage" size="xl" onClick={restart}>
            {t("ui.again", s.homeLang)}
          </BigButton>
        </motion.div>
      ) : (
        <>
          <div className="flex w-full items-center justify-center gap-4">
            <span className="rounded-full bg-paper px-6 py-2 text-2xl font-extrabold text-inksoft tile-shadow">
              {qi + 1} / {questions.length}
            </span>
            <div className="flex items-center gap-1 rounded-full bg-paper px-5 py-2 tile-shadow">
              {Array.from({ length: questions.length }).map((_, i) => (
                <IconStar key={i} size={24} className={i < right ? "text-sun" : ""} style={i < right ? undefined : { color: "#e8dcc8" }} />
              ))}
            </div>
          </div>

          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[2.2rem] bg-paper px-12 py-8 tile-shadow">
            <div className="text-3xl font-bold text-inksoft">
              {q.type === "word2pic" ? t("quiz.findpic", s.targetLang) : q.type === "listen2pic" ? "" : q.type === "pic2wordHome" ? t("quiz.whatisthis", s.homeLang) : t("quiz.whatisthis", s.targetLang)}
            </div>
            {prompt()}
          </div>

          <div className={`grid w-full gap-6 ${q.type === "word2pic" || q.type === "listen2pic" ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-1 xl:grid-cols-2"}`}>
            {q.options.map((w) => {
              const isAnswer = hit && w.id === q.word.id;
              const isWrongPick = hit === w.id && w.id !== q.word.id;
              return (
                <motion.button
                  key={w.id}
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => choose(w)}
                  disabled={Boolean(hit)}
                  className={`soft-ring no-select flex cursor-pointer items-center justify-center gap-5 rounded-[2rem] bg-paper p-6 tile-shadow transition
                    ${isAnswer ? "ring-8 ring-sage" : ""} ${isWrongPick ? "ring-8 ring-sun opacity-70" : ""}`}
                >
                  {(q.type === "word2pic" || q.type === "listen2pic") && (
                    <ArtTile word={w} size={s.bigView ? 190 : 150} color={s.theme.color} />
                  )}
                  {(q.type === "pic2word" || q.type === "pic2wordHome") && (
                    <span className="font-display text-5xl font-extrabold" style={{ color: s.theme.color }}>
                      {optionLabel(w)}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </>
      )}
    </Stage>
  );
}

/* ------------------------------------------------------------------ reusable card grid */

export function CardGrid({ words, s, onPick }: { words: Word[]; s: Setup; onPick?: (w: Word) => void }) {
  return (
    <div className="grid w-full grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
      {words.map((w) => (
        <WordCard
          key={w.id}
          word={w}
          lang={s.targetLang}
          homeLang={s.homeLang}
          mono={s.mono}
          art={140}
          color={s.theme.color}
          onClick={onPick ? () => onPick(w) : undefined}
        />
      ))}
    </div>
  );
}
