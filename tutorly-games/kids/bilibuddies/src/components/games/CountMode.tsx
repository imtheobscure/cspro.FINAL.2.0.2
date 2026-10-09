"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PromptBar, SpeakButton, StarBadge } from "@/components/stage/Shared";
import { BigButton } from "@/components/ui/BigButton";
import { Confetti } from "@/components/ui/Confetti";
import { CheckIcon, LeftIcon, PlayIcon, RepeatIcon, RightIcon } from "@/components/ui/icons";
import { COUNTABLES, NUMBERS } from "@/data/numbers";
import { ph } from "@/data/ui-phrases";
import type { Word } from "@/data/types";
import { sfx } from "@/lib/sfx";
import { useStudio } from "@/lib/studio";
import { shuffle, wait } from "@/lib/util";

export function CountMode() {
  const { deck, index, word, go, settings, theme, say, addStar, stars } = useStudio();
  const n = word?.numeral ?? 1;
  const [lit, setLit] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const run = useRef(0);

  const emoji = useMemo(() => COUNTABLES[(index * 3 + n) % COUNTABLES.length], [index, n]);

  const options = useMemo(() => {
    const near = [n - 1, n, n + 1].filter((x) => x >= 0 && x <= 20);
    const list: Word[] = near.map((x) => NUMBERS[x]);
    if (list.length < 3) list.push(NUMBERS[Math.min(20, n + 2)]);
    return shuffle(list).slice(0, 3);
  }, [n]);

  useEffect(() => {
    run.current++;
    setLit(-1);
    setPicked(null);
    if (word && settings.autoSpeak) {
      const t = setTimeout(() => void say(word.t[settings.target], settings.target), 280);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, settings.target]);

  if (!word) return null;

  const countAlong = async () => {
    const id = ++run.current;
    setLit(-1);
    setPicked(null);
    for (let i = 1; i <= n; i++) {
      if (run.current !== id) return;
      setLit(i - 1);
      sfx.pop();
      await say(NUMBERS[i].t[settings.target], settings.target);
      await wait(120);
    }
    if (run.current === id) {
      await wait(240);
      await say(ph("howMany", settings.target), settings.target);
      sfx.sparkle();
    }
  };

  const choose = async (o: Word) => {
    if (picked) return;
    if (o.numeral === n) {
      setPicked(o.id);
      sfx.correct();
      addStar(word);
      setBurst((b) => b + 1);
      await say(`${ph("yes", settings.target)} ${o.t[settings.target]}!`, settings.target);
      setTimeout(() => go(index + 1), 1200);
    } else {
      setPicked(`x-${o.id}`);
      sfx.wrong();
      setTimeout(() => setPicked(null), 900);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <Confetti on={Boolean(picked && !picked.startsWith("x-"))} burstKey={burst} count={34} />
      <div className="flex items-center gap-4">
        <PromptBar color={theme.color} hint="Point at each object as you count. Then cover the number and ask the child to say it.">
          {ph("countWithMe", settings.target)}
        </PromptBar>
        <StarBadge n={stars} color={theme.color} />
      </div>

      <div className="grid flex-1 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <div className="sticker sticker-lg flex flex-col items-center justify-center gap-3 px-8 py-7" style={{ background: theme.soft, borderColor: `${theme.color}55` }}>
          <div className="display font-extrabold leading-none text-ink" style={{ fontSize: "clamp(7rem,17vw,14rem)" }}>
            {n}
          </div>
          <div className="display text-center text-[clamp(2rem,4vw,3.4rem)] font-extrabold leading-tight text-ink">
            {word.t[settings.target]}
          </div>
          {settings.target === "zh" && word.pinyin ? (
            <div className="display text-[clamp(1.1rem,2vw,1.7rem)] font-bold text-branddeep">{word.pinyin}</div>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SpeakButton text={word.t[settings.target]} lang={settings.target} size={72} label="Say it" color={theme.color} />
            <SpeakButton text={word.t.en} lang="en" size={64} label="English" color="#6E6690" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="sticker grid min-h-[190px] grid-cols-5 place-items-center gap-2 p-4 sm:grid-cols-6"
            style={{ background: "#fff" }}
          >
            {n === 0 ? (
              <span className="display col-span-full text-[1.8rem] font-extrabold text-inksoft/60">0 — nothing here!</span>
            ) : (
              Array.from({ length: n }, (_, i) => (
                <span
                  key={i}
                  className="transition-transform duration-200"
                  style={{ transform: i === lit ? "scale(1.35)" : "scale(1)", filter: i === lit ? "drop-shadow(0 6px 10px rgba(59,52,85,.25))" : undefined }}
                >
                  <span className="pop-in block" style={{ animationDelay: `${i * 40}ms`, fontSize: "clamp(2.2rem,4.4vw,3.6rem)" }}>
                    {emoji}
                  </span>
                </span>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BigButton variant="primary" size="xl" onClick={() => void countAlong()}>
              <PlayIcon size={26} /> {ph("countWithMe", settings.target)}
            </BigButton>
            <BigButton variant="soft" size="lg" onClick={() => void say(ph("howMany", settings.target), settings.target)}>
              <RepeatIcon size={22} /> {ph("howMany", settings.target)}
            </BigButton>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {options.map((o) => {
              const right = picked === o.id;
              const wrong = picked === `x-${o.id}`;
              return (
                <button
                  key={o.id}
                  onClick={() => void choose(o)}
                  className={`pressable sticker no-select flex min-h-[130px] flex-col items-center justify-center gap-1 p-3 ${wrong ? "nudge" : ""} ${right ? "glow-good" : ""}`}
                  style={{ background: right ? "#E9F9F3" : "#fff", borderColor: right ? "#35B79A" : `${theme.color}33` }}
                >
                  <span className="display text-[clamp(1.5rem,2.6vw,2.2rem)] font-extrabold text-ink">{o.t[settings.target]}</span>
                  <span className="display text-[clamp(1.8rem,3.2vw,2.6rem)] font-extrabold text-inksoft/60">{o.numeral}</span>
                  {right ? <CheckIcon size={26} className="text-mint" strokeWidth={3} /> : null}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <BigButton variant="ink" size="lg" onClick={() => go(index - 1)} aria-label="previous number">
              <LeftIcon size={24} />
            </BigButton>
            <BigButton variant="primary" size="lg" onClick={() => go(index + 1)}>
              Next number <RightIcon size={24} />
            </BigButton>
            <span className="display text-[1.2rem] font-bold text-inksoft">
              {index + 1} / {deck.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
