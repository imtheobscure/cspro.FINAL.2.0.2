"use client";

import { useEffect, useState } from "react";
import { Art, PromptBar, SpeakButton, StarBadge, WordText } from "@/components/stage/Shared";
import { BigButton } from "@/components/ui/BigButton";
import { LeftIcon, RightIcon, ShuffleIcon, StarIcon } from "@/components/ui/icons";
import { sfx } from "@/lib/sfx";
import { useStudio } from "@/lib/studio";

export function LearnMode() {
  const { deck, index, word, next, prev, reshuffle, settings, sayPair, say, addStar, stars, theme, subtheme, roman } =
    useStudio();
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    setFlip(false);
    if (!word) return;
    if (settings.autoSpeak) {
      const t = setTimeout(() => void sayPair(word), 260);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, settings.autoSpeak]);

  if (!word) return null;
  const artSize = settings.bigCards ? 300 : 210;
  const textSize = settings.bigCards ? 92 : 68;

  return (
    <div className="flex h-full w-full flex-col items-center gap-5">
      <PromptBar color={theme.color} hint="Tap the card to hear it again. Ask: “What is it?” before you press play.">
        <span>{subtheme.t[settings.target]}</span>
        <span className="ml-2 text-inksoft">
          · {index + 1} / {deck.length}
        </span>
      </PromptBar>

      <button
        onClick={async () => {
          setFlip(true);
          sfx.flip();
          await sayPair(word);
          setTimeout(() => setFlip(false), 500);
        }}
        className="pressable sticker sticker-lg no-select relative flex flex-col items-center justify-center gap-4 px-10 py-8"
        style={{ background: theme.soft, borderColor: `${theme.color}55`, minWidth: "min(72vw, 780px)", minHeight: "min(52vh, 520px)" }}
      >
        <div className={flip ? "beat" : "pop-in"} key={word.id + (flip ? "-f" : "")}>
          <Art w={word} size={artSize} />
        </div>
        <WordText w={word} lang={settings.target} size={textSize} roman={Boolean(roman(word))} supportLang={settings.support} />
        {word.phonics && settings.target === "en" ? (
          <div className="display rounded-2xl bg-white/80 px-5 py-2 text-[1.3rem] font-bold text-inksoft">{word.phonics}</div>
        ) : null}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <SpeakButton text={word.t[settings.target]} lang={settings.target} size={84} label="Say it" color={theme.color} />
        {word.sound ? (
          <SpeakButton text={word.sound[settings.target]} lang={settings.target} size={84} label="Sound" color="#FFC145" />
        ) : null}
        {settings.support !== "none" ? (
          <SpeakButton
            text={word.t[settings.support]}
            lang={settings.support}
            size={84}
            label="Translate"
            color="#6E6690"
          />
        ) : null}
        <BigButton
          variant={starred[word.id] ? "sun" : "soft"}
          size="lg"
          onClick={() => {
            if (starred[word.id]) return;
            setStarred((s) => ({ ...s, [word.id]: true }));
            addStar(word);
          }}
        >
          <StarIcon size={26} /> {starred[word.id] ? "Starred!" : "Give a star"}
        </BigButton>
        <BigButton variant="soft" size="lg" onClick={() => say(word.phonics ?? word.t.en, "en")}>
          🇬🇧 English
        </BigButton>
      </div>

      <div className="flex items-center gap-3">
        <StarBadge n={stars} color={theme.color} />
        <BigButton variant="ink" size="lg" onClick={prev} aria-label="Previous card">
          <LeftIcon size={26} />
        </BigButton>
        <BigButton variant="soft" size="lg" onClick={reshuffle}>
          <ShuffleIcon size={24} /> Shuffle
        </BigButton>
        <BigButton variant="primary" size="lg" onClick={next} aria-label="Next card">
          Next <RightIcon size={26} />
        </BigButton>
        <span className="display ml-2 text-[1.3rem] font-extrabold text-inksoft">
          {index + 1} / {deck.length}
        </span>
      </div>

      <div className="text-[0.95rem] font-semibold text-inksoft/70">
        Keyboard: ← → move · Space = say it · S = star · R = shuffle
      </div>
    </div>
  );
}
