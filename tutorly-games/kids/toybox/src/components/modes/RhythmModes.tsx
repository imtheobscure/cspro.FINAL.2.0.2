"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WORDS, label, sample, shuffle } from "@/lib/data";
import { CHANT_MAP } from "@/lib/data/chants";
import { t } from "@/lib/data/phrases";
import type { Setup } from "@/lib/useSetup";
import { useFeedback } from "@/components/ui/Feedback";
import { ArtTile } from "@/components/ui/ArtTile";
import { BigButton, SpeakerButton } from "@/components/ui/Kit";
import { IconArrowLeft, IconArrowRight, IconPause, IconPlay, IconSpeaker } from "@/components/ui/Icons";
import { sfxBeat, sfxTap } from "@/lib/sfx";

function Stage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-7 px-4 py-6">{children}</div>;
}

/* ------------------------------------------------------------------ CHANT */

export function ChantMode({ s }: { s: Setup }) {
  const chant = CHANT_MAP[s.theme.chantId] ?? CHANT_MAP.me;
  const lines = chant.lines[s.targetLang] ?? chant.lines.en;
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [beat, setBeat] = useState(0);
  const stopRef = useRef(false);
  const loopRef = useRef(false);
  loopRef.current = loop;

  useEffect(() => {
    if (active < 0) return;
    const beats = chant.beats[active] ?? 4;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % beats;
      setBeat(i);
      sfxBeat(i);
    }, 460);
    return () => clearInterval(id);
  }, [active, chant.beats]);

  const playAll = async () => {
    stopRef.current = false;
    setPlaying(true);
    for (let pass = 0; pass < 50; pass++) {
      for (let i = 0; i < lines.length; i++) {
        if (stopRef.current) break;
        setActive(i);
        // eslint-disable-next-line no-await-in-loop
        await s.say(lines[i], s.targetLang);
      }
      if (stopRef.current || !loopRef.current) break;
    }
    setPlaying(false);
    setActive(-1);
  };

  const halt = () => {
    stopRef.current = true;
    s.stop();
    setPlaying(false);
    setActive(-1);
  };

  return (
    <Stage>
      <div className="flex items-center gap-4">
        <span className="text-6xl">🎵</span>
        <div className="font-display text-6xl font-extrabold" style={{ color: s.theme.color }}>
          {chant.title[s.targetLang] ?? chant.title.en}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 rounded-[2.4rem] bg-paper p-8 tile-shadow">
        {lines.map((l, i) => (
          <button
            key={i}
            onClick={() => {
              sfxTap();
              setActive(i);
              void s.say(l, s.targetLang);
            }}
            className={`soft-ring no-select flex cursor-pointer items-center gap-5 rounded-[1.6rem] px-6 py-4 text-left transition
              ${active === i ? "bg-cream" : "hover:bg-cream/60"}`}
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: s.theme.soft }}>
              <motion.span
                animate={active === i ? { scale: [1, 1.45, 1] } : { scale: 1 }}
                transition={{ repeat: active === i ? Infinity : 0, duration: 0.5 }}
                className="block h-5 w-5 rounded-full"
                style={{ background: s.theme.color, transform: `translateX(${active === i ? beat * 3 : 0}px)` }}
              />
            </span>
            <span
              className="font-display leading-tight font-extrabold"
              style={{ fontSize: s.bigView ? "3.6rem" : "2.9rem", color: active === i ? s.theme.color : "#35302a" }}
            >
              {l}
            </span>
            <IconSpeaker size={26} className="ml-auto shrink-0 text-inksoft" />
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <BigButton variant={playing ? "sun" : "sage"} size="xl" onClick={() => (playing ? halt() : void playAll())}>
          {playing ? <IconPause size={30} /> : <IconPlay size={30} />}
          {playing ? t("ui.off", s.homeLang) : t("mode.chant", s.targetLang)}
        </BigButton>
        <BigButton variant={loop ? "plum" : "paper"} onClick={() => setLoop((l) => !l)}>
          🔁 {loop ? "loop ✓" : "loop"}
        </BigButton>
        {!s.mono && s.homeLang !== s.targetLang && (
          <BigButton variant="paper" onClick={() => void s.say((chant.lines[s.homeLang] ?? []).join(". "), s.homeLang)}>
            <IconSpeaker size={26} /> {t("setup.ispeak", s.homeLang)}
          </BigButton>
        )}
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------ COUNT */

const NUMBERS = WORDS.filter((w) => w.k === "number");
const COUNT_ART = ["🐥", "🍎", "🎈", "⭐", "🐟", "🌸", "🚗", "🦋", "🍪", "⚽"];

export function NumbersMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [counting, setCounting] = useState(false);

  const count = useMemo(() => 1 + ((s.seed + round * 3) % 10), [s.seed, round]);
  const art = useMemo(() => COUNT_ART[(s.seed + round) % COUNT_ART.length], [s.seed, round]);
  const options = useMemo(() => {
    const correct = NUMBERS.find((n) => n.digit === count)!;
    const wrongs = shuffle(NUMBERS.filter((n) => n.digit !== count && n.digit! <= 20), s.seed + round).slice(0, 3);
    return shuffle([correct, ...wrongs], s.seed + round * 5);
  }, [count, s.seed, round]);

  useEffect(() => setPicked(null), [round]);

  const countOut = async () => {
    setCounting(true);
    for (let i = 1; i <= count; i++) {
      const nw = NUMBERS.find((n) => n.digit === i);
      // eslint-disable-next-line no-await-in-loop
      await s.say(nw ? label(nw, s.targetLang) : String(i), s.targetLang);
    }
    setCounting(false);
  };

  const choose = (digit: number) => {
    if (picked) return;
    setPicked(String(digit));
    const ok = digit === count;
    fb.mark(ok ? "correct" : "wrong", `num${count}`);
    if (ok) setTimeout(() => setRound((r) => r + 1), 1200);
    else setTimeout(() => setPicked(null), 1200);
  };

  return (
    <Stage>
      <div className="font-display text-6xl font-extrabold text-ink">{t("quiz.count", s.targetLang)}</div>

      <div className="flex w-full flex-col items-center gap-6 rounded-[2.4rem] bg-paper p-8 tile-shadow">
        <div className="flex max-w-[900px] flex-wrap items-center justify-center gap-3">
          {Array.from({ length: count }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.09, type: "spring", stiffness: 380, damping: 18 }}
              className="text-[4.5rem] leading-none"
            >
              {art}
            </motion.span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <SpeakerButton size="lg" variant="sky" onClick={() => void countOut()} busy={counting} title={t("ui.listen", s.homeLang)} />
          <span className="font-display text-4xl font-extrabold" style={{ color: s.theme.color }}>
            {t("ccq.howMany", s.targetLang)}
          </span>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-6 xl:grid-cols-4">
        {options.map((n) => {
          const isPicked = picked === String(n.digit);
          const isRight = isPicked && n.digit === count;
          return (
            <motion.button
              key={n.id}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => choose(n.digit!)}
              className={`soft-ring no-select flex cursor-pointer flex-col items-center gap-2 rounded-[2rem] bg-paper p-6 tile-shadow
                ${isPicked ? (isRight ? "ring-8 ring-sage" : "ring-8 ring-sun") : ""}`}
            >
              <span className="font-display text-8xl leading-none font-extrabold" style={{ color: s.theme.color }}>
                {n.digit}
              </span>
              <span className="text-3xl font-bold text-inksoft">{label(n, s.targetLang)}</span>
            </motion.button>
          );
        })}
      </div>
      <BigButton variant="paper" onClick={() => setRound((r) => r + 1)}>
        {t("ui.next", s.homeLang)} <IconArrowRight size={26} />
      </BigButton>
    </Stage>
  );
}

/* ------------------------------------------------------------------ ABC */

const LETTERS = WORDS.filter((w) => w.k === "letter");

export function AbcMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [i, setI] = useState(0);
  const [quiz, setQuiz] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const letter = LETTERS[i % LETTERS.length];
  const example = WORDS.find((w) => w.id === letter.ex);
  const options = useMemo(() => {
    const wrongs = sample(LETTERS.filter((l) => l.id !== letter.id), 3, s.seed + i);
    return shuffle([letter, ...wrongs], s.seed + i * 7);
  }, [letter, i, s.seed]);

  useEffect(() => {
    setPicked(null);
  }, [i, quiz]);

  const sayLetter = async () => {
    await s.say(`${letter.letter}. ${letter.letter}.`, s.targetLang);
    if (example) await s.say(label(example, s.targetLang), s.targetLang);
  };

  const go = (d: number) => setI((p) => (p + d + LETTERS.length) % LETTERS.length);

  const choose = (id: string) => {
    if (picked) return;
    setPicked(id);
    const ok = id === letter.id;
    fb.mark(ok ? "correct" : "wrong", letter.id);
    if (ok) setTimeout(() => setQuiz(false), 1200);
    else setTimeout(() => setPicked(null), 1200);
  };

  return (
    <Stage>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <BigButton variant="paper" size="md" onClick={() => go(-1)}>
          <IconArrowLeft size={24} />
        </BigButton>
        <div className="font-display text-5xl font-extrabold text-ink">{t("mode.abc", s.targetLang)}</div>
        <BigButton variant="paper" size="md" onClick={() => go(1)}>
          <IconArrowRight size={24} />
        </BigButton>
      </div>

      <AnimatePresence mode="wait">
        {!quiz ? (
          <motion.div
            key={`learn-${letter.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex w-full flex-col items-center gap-6 rounded-[2.6rem] bg-paper p-10 tile-shadow"
          >
            <div className="flex items-end gap-6">
              <span className="font-display leading-[0.8] font-extrabold" style={{ fontSize: "13rem", color: s.theme.color }}>
                {letter.letter}
              </span>
              <span className="font-display leading-[0.8] font-extrabold opacity-50" style={{ fontSize: "9rem", color: s.theme.color }}>
                {letter.letter?.toLowerCase()}
              </span>
            </div>
            {example && (
              <div className="flex flex-col items-center gap-2">
                <ArtTile word={example} size={180} color={s.theme.color} float />
                <div className="font-display text-5xl font-extrabold text-ink">{label(example, s.targetLang)}</div>
              </div>
            )}
            <div className="font-display text-3xl font-bold" style={{ color: s.theme.color }}>
              {t("letter.aIsFor", s.targetLang, { L: letter.letter ?? "", w: example ? label(example, s.targetLang) : "" })}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <SpeakerButton size="lg" onClick={() => void sayLetter()} title={t("ui.listen", s.homeLang)} />
              <BigButton variant="sky" onClick={() => setQuiz(true)}>
                {t("ui.whichone", s.targetLang)}
              </BigButton>
              <BigButton variant="berry" onClick={() => fb.star(letter.id)}>
                ⭐
              </BigButton>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`quiz-${letter.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex w-full flex-col items-center gap-6"
          >
            {example && (
              <div className="flex flex-col items-center gap-2 rounded-[2rem] bg-paper px-14 py-7 tile-shadow">
                <ArtTile word={example} size={180} color={s.theme.color} float />
                <div className="font-display text-5xl font-extrabold text-ink">{label(example, s.targetLang)}</div>
              </div>
            )}
            <div className="font-display text-4xl font-extrabold text-inksoft">{t("ui.whichone", s.targetLang)}</div>
            <div className="grid w-full grid-cols-2 gap-6 xl:grid-cols-4">
              {options.map((l) => {
                const isPicked = picked === l.id;
                const isRight = isPicked && l.id === letter.id;
                return (
                  <motion.button
                    key={l.id}
                    whileHover={{ y: -6 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => choose(l.id)}
                    className={`soft-ring no-select grid h-[190px] cursor-pointer place-items-center rounded-[2rem] bg-paper tile-shadow
                      ${isPicked ? (isRight ? "ring-8 ring-sage" : "ring-8 ring-sun") : ""}`}
                  >
                    <span className="font-display text-9xl leading-none font-extrabold" style={{ color: s.theme.color }}>
                      {l.letter}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  );
}
