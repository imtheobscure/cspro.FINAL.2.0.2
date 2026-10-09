"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Art, PromptBar, SpeakButton, StarBadge } from "@/components/stage/Shared";
import { BigButton } from "@/components/ui/BigButton";
import { Confetti } from "@/components/ui/Confetti";
import { HandIcon, MicIcon, RightIcon, StarIcon } from "@/components/ui/icons";
import { CCQS, fill } from "@/data/talk";
import { ph } from "@/data/ui-phrases";
import type { LangCode, Translations } from "@/data/types";
import { sfx } from "@/lib/sfx";
import { useStudio } from "@/lib/studio";

const YES: Translations = { en: "Yes!", zh: "是的！", fr: "Oui !", it: "Sì!", de: "Ja!", tr: "Evet!" };
const NO: Translations = { en: "No!", zh: "不！", fr: "Non !", it: "No!", de: "Nein!", tr: "Hayır!" };

const FRAMES: { id: string; t: Translations }[] = [
  { id: "yes-like", t: { en: "Yes, I like {w}!", zh: "是的，我喜欢 {w}！", fr: "Oui, j'aime {w} !", it: "Sì, mi piace {w}!", de: "Ja, ich mag {w}!", tr: "Evet, {w} severim!" } },
  { id: "no-like", t: { en: "No, I don't like {w}.", zh: "不，我不喜欢 {w}。", fr: "Non, je n'aime pas {w}.", it: "No, non mi piace {w}.", de: "Nein, ich mag {w} nicht.", tr: "Hayır, {w} sevmem." } },
  { id: "i-see", t: { en: "I can see {w}!", zh: "我能看到 {w}！", fr: "Je vois {w} !", it: "Vedo {w}!", de: "Ich sehe {w}!", tr: "{w} görüyorum!" } },
  { id: "it-is", t: { en: "It is {w}!", zh: "它是 {w}！", fr: "C'est {w} !", it: "È {w}!", de: "Das ist {w}!", tr: "Bu {w}!" } },
  { id: "i-can", t: { en: "I can {w}!", zh: "我会 {w}！", fr: "Je peux {w} !", it: "Io so {w}!", de: "Ich kann {w}!", tr: "{w} yapabilirim!" } },
];

const THINK_SECONDS = 8;

export function TalkMode() {
  const { deck, index, word, next, prev, settings, theme, subtheme, say, addStar, stars } = useStudio();
  const [ccqIdx, setCcqIdx] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [spoke, setSpoke] = useState(false);
  const [burst, setBurst] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const list = useMemo(
    () =>
      CCQS.filter(
        (c) =>
          (c.id !== "sound" || Boolean(word?.sound)) &&
          (c.id !== "count" || subtheme.kind === "numbers") &&
          (c.id !== "act" || ["verbs", "pets", "farm", "wild", "feelings", "routines", "sea", "insects"].includes(subtheme.id)),
      ),
    [word?.sound, subtheme.id, subtheme.kind],
  );

  const ccq = list[ccqIdx % Math.max(1, list.length)];

  useEffect(() => {
    setSpoke(false);
    setLeft(null);
    if (word && settings.autoSpeak && ccq) {
      const t = setTimeout(() => void say(fill(ccq.t[settings.target] || ccq.t.en, word.t[settings.target]), settings.target), 280);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, ccqIdx, settings.target]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const startThink = () => {
    if (timer.current) clearInterval(timer.current);
    setLeft(THINK_SECONDS);
    timer.current = setInterval(() => {
      setLeft((l) => {
        if (l === null) return null;
        if (l <= 1) {
          if (timer.current) clearInterval(timer.current);
          sfx.sparkle();
          return 0;
        }
        sfx.tick();
        return l - 1;
      });
    }, 1000);
  };

  if (!word || !ccq) return null;
  const wText = word.t[settings.target] || word.t.en;
  const question = fill(ccq.t[settings.target] || ccq.t.en, wText);

  const reward = () => {
    setSpoke(true);
    setBurst((b) => b + 1);
    addStar(word);
    void say(ph("great", settings.target), settings.target);
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <Confetti on={spoke} burstKey={burst} count={40} />
      <div className="flex items-center gap-4">
        <PromptBar color={theme.color} hint={ccq.hint}>
          {ph("talkTime", settings.target)}
          <span className="ml-2 text-inksoft">
            · {index + 1}/{deck.length}
          </span>
        </PromptBar>
        <StarBadge n={stars} color={theme.color} />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* the question */}
        <div
          className="sticker sticker-lg relative flex flex-col items-center justify-center gap-5 px-8 py-7"
          style={{ background: theme.soft, borderColor: `${theme.color}55` }}
        >
          <div className="flex items-center gap-5">
            <div className="pop-in" key={word.id}>
              <Art w={word} size={170} />
            </div>
            <div className="flex flex-col">
              <span className="display text-[clamp(2rem,4.2vw,3.6rem)] font-extrabold leading-tight text-ink">{wText}</span>
              {settings.target === "zh" && word.pinyin ? (
                <span className="display text-[clamp(1.1rem,2vw,1.7rem)] font-bold text-branddeep">{word.pinyin}</span>
              ) : null}
            </div>
          </div>

          <div className="display max-w-[640px] text-center text-[clamp(1.6rem,3.4vw,3rem)] font-extrabold leading-snug text-ink">
            {question}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <SpeakButton text={question} lang={settings.target} size={76} label="Ask" color={theme.color} />
            <BigButton variant="soft" size="lg" onClick={startThink}>
              <MicIcon size={24} /> {ph("wait", settings.target)}
            </BigButton>
            {left !== null ? (
              <div className="sticker flex items-center gap-2 px-4 py-2">
                <span className="display text-[1.6rem] font-extrabold text-branddeep">{left || "⭐"}</span>
                <span className="text-[0.95rem] font-bold text-inksoft">thinking time</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* answers + frames */}
        <div className="flex flex-col gap-4">
          {ccq.kind === "yesno" ? (
            <div className="grid grid-cols-2 gap-4">
              <BigButton variant="mint" size="xl" className="min-h-[150px]" onClick={() => void say(YES[settings.target], settings.target)}>
                👍 {YES[settings.target]}
              </BigButton>
              <BigButton variant="primary" size="xl" className="min-h-[150px]" onClick={() => void say(NO[settings.target], settings.target)}>
                👎 {NO[settings.target]}
              </BigButton>
            </div>
          ) : ccq.kind === "choice" && ccq.answers ? (
            <div className="grid grid-cols-2 gap-4">
              {ccq.answers.map((a) => (
                <BigButton key={a.key} variant="sky" size="xl" className="min-h-[150px]" onClick={() => void say(a.t[settings.target], settings.target)}>
                  {a.t[settings.target]}
                </BigButton>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <BigButton variant="sun" size="xl" className="min-h-[150px]" onClick={() => void say(ph("sayIt", settings.target), settings.target)}>
                <HandIcon size={30} /> {ph("sayIt", settings.target)}
              </BigButton>
              <BigButton variant="sky" size="xl" className="min-h-[150px]" onClick={() => void say(ph("yourTurn", settings.target), settings.target)}>
                <MicIcon size={30} /> {ph("yourTurn", settings.target)}
              </BigButton>
            </div>
          )}

          <div className="sticker flex flex-col gap-2 p-4">
            <div className="display text-[1.05rem] font-extrabold uppercase tracking-wide text-inksoft">
              Sentence frames · tap to model
            </div>
            <div className="flex flex-wrap gap-2">
              {FRAMES.map((f) => {
                const line = fill(f.t[settings.target] || f.t.en, wText);
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      sfx.pop();
                      void say(line, settings.target);
                    }}
                    className="pressable no-select display rounded-2xl border-2 border-line bg-white px-4 py-2.5 text-[clamp(1rem,1.6vw,1.35rem)] font-bold text-ink hover:border-ink/25"
                  >
                    {line}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BigButton variant="grape" size="lg" onClick={reward} disabled={spoke}>
              <StarIcon size={24} /> {spoke ? "Star given!" : "They spoke!"}
            </BigButton>
            <BigButton
              variant="soft"
              size="lg"
              onClick={() => {
                sfx.flip();
                setCcqIdx((i) => i + 1);
              }}
            >
              New question <RightIcon size={20} />
            </BigButton>
            <BigButton variant="soft" size="lg" onClick={prev}>
              ← word
            </BigButton>
            <BigButton variant="primary" size="lg" onClick={next}>
              word →
            </BigButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export const TALK_LANGS: LangCode[] = ["en", "zh", "fr", "it", "de", "tr"];
