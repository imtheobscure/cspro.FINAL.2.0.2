"use client";

import { useEffect, useMemo, useState } from "react";
import { PromptBar, SpeakButton, StarBadge } from "@/components/stage/Shared";
import { BigButton } from "@/components/ui/BigButton";
import { WordArt } from "@/components/ui/WordArt";
import { Confetti } from "@/components/ui/Confetti";
import { CheckIcon, LeftIcon, RightIcon } from "@/components/ui/icons";
import { ph } from "@/data/ui-phrases";
import { sfx } from "@/lib/sfx";
import { useStudio } from "@/lib/studio";
import type { Word } from "@/data/types";
import { withDistractors } from "@/lib/util";

export function AbcMode() {
  const { deck, index, word, go, settings, theme, say, addStar, stars } = useStudio();
  const [options, setOptions] = useState<Word[]>(() =>
    word && deck.length ? withDistractors(word, deck, 3, (w) => w.id) : [],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!word) return;
    setOptions(withDistractors(word, deck, 3, (w) => w.id));
    setPicked(null);
    if (settings.autoSpeak) {
      const t = setTimeout(async () => {
        await say(word.letter ?? word.t.en, settings.target);
        await say(word.t[settings.target], settings.target);
      }, 260);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, deck, settings.target]);

  const letters = useMemo(() => deck.map((d) => d.letter ?? ""), [deck]);
  if (!word) return null;

  const choose = async (o: Word) => {
    if (picked) return;
    if (o.id === word.id) {
      setPicked(o.id);
      sfx.correct();
      addStar(word);
      setBurst((b) => b + 1);
      await say(word.t[settings.target], settings.target);
      setTimeout(() => go(index + 1), 1100);
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
        <PromptBar color={theme.color} hint="Say the letter, then the sound, then the word. In Chinese the letter name is spoken in English.">
          {ph("startsWith", settings.target)}
        </PromptBar>
        <StarBadge n={stars} color={theme.color} />
      </div>

      <div className="grid flex-1 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="sticker sticker-lg flex flex-col items-center justify-center gap-4 px-8 py-7" style={{ background: theme.soft, borderColor: `${theme.color}55` }}>
          <div className="display flex items-end gap-3 font-extrabold leading-none text-ink" style={{ fontSize: "clamp(6rem,15vw,12rem)" }}>
            {word.letter}
            <span className="opacity-55" style={{ fontSize: "0.62em" }}>
              {word.letter?.toLowerCase()}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <div className="pop-in" key={word.id}>
              <WordArt emoji={word.emoji} size={150} alt={word.t.en} />
            </div>
            <div className="flex flex-col">
              <span className="display text-[clamp(1.8rem,3.4vw,3rem)] font-extrabold leading-tight text-ink">
                {word.t[settings.target]}
              </span>
              {settings.target === "zh" && word.pinyin ? (
                <span className="display text-[1.3rem] font-bold text-branddeep">{word.pinyin}</span>
              ) : null}
              {word.phonics ? <span className="display text-[1.1rem] font-bold text-inksoft">{word.phonics}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SpeakButton text={word.letter ?? ""} lang={settings.target} size={72} label="Letter" color={theme.color} />
            <SpeakButton text={word.phonics ?? word.t.en} lang="en" size={72} label="Sound" color="#FFC145" />
            <SpeakButton text={word.t[settings.target]} lang={settings.target} size={72} label="Word" color="#35B79A" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="display text-[clamp(1.4rem,2.6vw,2.2rem)] font-extrabold text-ink">
            {ph("findIt", settings.target)} <span className="text-branddeep">{word.t[settings.target]}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {options.map((o) => {
              const right = picked === o.id;
              const wrong = picked === `x-${o.id}`;
              return (
                <button
                  key={o.id}
                  onClick={() => void choose(o)}
                  className={`pressable sticker no-select flex min-h-[160px] flex-col items-center justify-center gap-1 p-3 ${wrong ? "nudge" : ""} ${right ? "glow-good" : ""}`}
                  style={{ background: right ? "#E9F9F3" : "#fff", borderColor: right ? "#35B79A" : `${theme.color}33` }}
                >
                  <WordArt emoji={o.emoji} size={104} alt={o.t.en} />
                  {right ? <CheckIcon size={26} className="text-mint" strokeWidth={3} /> : null}
                </button>
              );
            })}
          </div>

          <div className="sticker flex flex-wrap gap-1.5 p-3">
            {letters.map((l, i) => (
              <button
                key={`${l}-${i}`}
                onClick={() => {
                  sfx.tap();
                  go(i);
                }}
                className={`display h-11 w-11 rounded-xl border-2 text-[1.25rem] font-extrabold transition ${
                  i === index ? "border-transparent text-white" : "border-line bg-white text-inksoft hover:border-ink/25"
                }`}
                style={i === index ? { background: theme.color } : undefined}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <BigButton variant="ink" size="lg" onClick={() => go(index - 1)} aria-label="previous letter">
              <LeftIcon size={24} />
            </BigButton>
            <BigButton variant="primary" size="lg" onClick={() => go(index + 1)}>
              Next letter <RightIcon size={24} />
            </BigButton>
          </div>
        </div>
      </div>
    </div>
  );
}
