"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PictureArt, ProgressDots, PromptBar, SpeakButton, StarBadge, WordText } from "@/components/stage/Shared";
import { BigButton } from "@/components/ui/BigButton";
import { Confetti } from "@/components/ui/Confetti";
import { CheckIcon, RepeatIcon, TrophyIcon, XIcon } from "@/components/ui/icons";
import { ph } from "@/data/ui-phrases";
import { sfx } from "@/lib/sfx";
import { useStudio } from "@/lib/studio";
import type { Word } from "@/data/types";
import { shuffle, withDistractors } from "@/lib/util";

/** listen → picture · picture → word · written word → picture · listen → word */
type QType = "listen-pic" | "pic-word" | "word-pic" | "listen-word";
const TYPES: QType[] = ["listen-pic", "pic-word", "word-pic", "listen-word"];
const ROUNDS = 8;

type Question = { type: QType; answer: Word; options: Word[] };

function build(deck: Word[]): Question[] {
  const pool = deck.length >= 4 ? deck : deck.concat(deck, deck, deck);
  const picked = shuffle(pool).slice(0, Math.min(ROUNDS, pool.length));
  return picked.map((answer, i) => ({
    type: TYPES[i % TYPES.length],
    answer,
    options: withDistractors(answer, pool, 4, (w) => w.id),
  }));
}

export function QuizMode() {
  const { deck, settings, theme, subtheme, say, addStar, stars, student } = useStudio();
  const [questions, setQuestions] = useState<Question[]>(() => build(deck));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [state, setState] = useState<"open" | "right" | "wrong">("open");
  const [burst, setBurst] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[i];
  const roundKey = useMemo(() => `${subtheme.id}:${settings.target}`, [subtheme.id, settings.target]);

  const newRound = useCallback(() => {
    setQuestions(build(deck));
    setI(0);
    setPicked(null);
    setState("open");
    setScore(0);
    setFinished(false);
  }, [deck]);

  useEffect(() => {
    newRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);

  /** auto play the audio questions */
  useEffect(() => {
    if (!q || finished) return;
    if (state !== "open") return;
    if (q.type === "listen-pic" || q.type === "listen-word") {
      const t = setTimeout(() => void say(q.answer.t[settings.target], settings.target), 320);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, roundKey, finished]);

  if (!q) return null;

  const choose = async (opt: Word) => {
    if (state !== "open") return;
    setPicked(opt.id);
    if (opt.id === q.answer.id) {
      setState("right");
      setScore((s) => s + 1);
      setBurst((b) => b + 1);
      sfx.correct();
      addStar(q.answer);
      await say(q.answer.t[settings.target], settings.target);
      setTimeout(() => advance(), 900);
    } else {
      setState("wrong");
      sfx.wrong();
      setTimeout(() => setState("open"), 1400);
      setPicked(null);
    }
  };

  const advance = () => {
    if (i + 1 >= questions.length) {
      setFinished(true);
      sfx.win();
      return;
    }
    setI((n) => n + 1);
    setPicked(null);
    setState("open");
  };

  const showArt = q.type === "pic-word";
  const wordOptions = q.type === "pic-word" || q.type === "listen-word";
  const promptText =
    q.type === "listen-pic"
      ? `${ph("listen", settings.target)} ${ph("whichPicture", settings.target)}`
      : q.type === "listen-word"
        ? `${ph("listen", settings.target)} ${ph("whichWord", settings.target)}`
        : q.type === "pic-word"
          ? `${ph("lookSay", settings.target)} ${ph("whichWord", settings.target)}`
          : ph("readFind", settings.target);

  if (finished) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6">
        <Confetti on burstKey={burst + 99} count={90} />
        <div className="sticker sticker-lg pop-in flex flex-col items-center gap-4 px-14 py-10" style={{ background: theme.soft }}>
          <TrophyIcon size={90} className="text-[#F2A62B]" />
          <div className="display text-[clamp(2.4rem,5vw,4rem)] font-extrabold text-ink">{ph("allDone", settings.target)}</div>
          <div className="display text-[clamp(1.4rem,2.6vw,2.2rem)] font-bold text-inksoft">
            {score} / {questions.length} ⭐
          </div>
          {student ? <div className="display text-[1.5rem] font-bold text-ink">{student.avatar} {student.name}</div> : null}
        </div>
        <div className="flex gap-3">
          <BigButton variant="primary" size="xl" onClick={newRound}>
            <RepeatIcon size={26} /> {ph("playAgain", settings.target)}
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-5">
      <Confetti on={state === "right"} burstKey={burst} count={34} />
      <div className="flex items-center gap-4">
        <PromptBar color={theme.color} hint="Wrong answers are safe: no red X, no buzzer. Just say the right word together.">
          {promptText}
        </PromptBar>
        <ProgressDots total={questions.length} done={i + (state === "right" ? 1 : 0)} color={theme.color} />
        <StarBadge n={stars} color={theme.color} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {/* the prompt */}
        <div
          className="sticker flex items-center justify-center gap-6 px-10 py-5"
          style={{ background: showArt ? theme.soft : "#fff", borderColor: `${theme.color}44` }}
        >
          {q.type === "listen-pic" || q.type === "listen-word" ? (
            <SpeakButton text={q.answer.t[settings.target]} lang={settings.target} size={120} color={theme.color} />
          ) : q.type === "pic-word" ? (
            <div className={state === "open" ? "pop-in" : ""} key={q.answer.id}>
              <PictureArt w={q.answer} size={settings.bigCards ? 230 : 170} />
            </div>
          ) : (
            <WordText w={q.answer} lang={settings.target} size={settings.bigCards ? 82 : 62} roman supportLang="none" />
          )}
        </div>

        {/* the options */}
        <div className="grid w-full max-w-[1200px] grid-cols-2 gap-5 lg:grid-cols-4">
          {q.options.map((opt, n) => {
            const isAnswer = opt.id === q.answer.id;
            const isPicked = picked === opt.id;
            const wrong = state === "wrong" && isPicked;
            const right = state === "right" && isAnswer;
            const revealed = settings.reveal && state === "wrong" && isAnswer;
            return (
              <button
                key={opt.id}
                onClick={() => void choose(opt)}
                className={`pressable sticker no-select relative flex min-h-[190px] flex-col items-center justify-center gap-2 p-4 ${wrong ? "nudge" : ""} ${right || revealed ? "glow-good" : ""}`}
                style={{
                  background: right || revealed ? "#E9F9F3" : wrong ? "#FFF3E9" : "#fff",
                  borderColor: right || revealed ? "#35B79A" : wrong ? "#F0A87C" : `${theme.color}33`,
                }}
              >
                <span className="display absolute left-3 top-2 text-[1.2rem] font-extrabold text-inksoft/45">{n + 1}</span>
                {wordOptions ? (
                  <WordText w={opt} lang={settings.target} size={settings.bigCards ? 44 : 34} roman supportLang="none" />
                ) : (
                  <PictureArt w={opt} size={settings.bigCards ? 130 : 100} />
                )}
                {right || revealed ? <CheckIcon size={34} className="absolute right-3 top-3 text-mint" strokeWidth={3} /> : null}
                {wrong ? <XIcon size={30} className="absolute right-3 top-3 text-[#F0A87C]" strokeWidth={3} /> : null}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <SpeakButton text={promptText} lang={settings.target} size={64} color="#6E6690" />
          {state !== "open" ? (
            <BigButton variant="primary" size="lg" onClick={advance}>
              {ph("great", settings.target)} →
            </BigButton>
          ) : (
            <BigButton variant="soft" size="lg" onClick={() => void say(q.answer.t[settings.target], settings.target)}>
              <RepeatIcon size={22} /> {ph("listen", settings.target)}
            </BigButton>
          )}
          <BigButton variant="ghost" size="lg" onClick={newRound}>
            {ph("nextWords", settings.target)}
          </BigButton>
        </div>
      </div>
    </div>
  );
}
