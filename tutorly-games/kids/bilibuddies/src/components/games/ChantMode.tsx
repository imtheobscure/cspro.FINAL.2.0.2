"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PictureArt, PromptBar, SpeakButton, StarBadge } from "@/components/stage/Shared";
import { BigButton, Chip } from "@/components/ui/BigButton";
import { ClapIcon, LeftIcon, PauseIcon, PlayIcon, RepeatIcon, RightIcon } from "@/components/ui/icons";
import { CHANT_TEMPLATES, fill } from "@/data/talk";
import { ph } from "@/data/ui-phrases";
import { sfx } from "@/lib/sfx";
import { useStudio } from "@/lib/studio";
import { wait } from "@/lib/util";

const TPL_LABEL: Record<string, string> = { sayit: "Say it", ilike: "I like", findit: "Where is", move: "Move!" };

function guessFits(subthemeId: string): "verbs" | "food" | "animals" | "all" {
  if (["verbs", "routines", "hobbies"].includes(subthemeId)) return "verbs";
  if (["fruits", "vegetables", "drinks", "meals"].includes(subthemeId)) return "food";
  if (["pets", "farm", "wild", "sea", "insects"].includes(subthemeId)) return "animals";
  return "all";
}

export function ChantMode() {
  const { theme, subtheme, deck, index, settings, say, stop, stars, next, prev } = useStudio();
  const templates = useMemo(
    () => CHANT_TEMPLATES.filter((t) => t.fits === "all" || t.fits === guessFits(subtheme.id)),
    [subtheme.id],
  );
  const [src, setSrc] = useState<string>("theme");
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [beatN, setBeatN] = useState(0);
  const run = useRef(0);
  const word = deck[index];

  const tpl = templates.find((t) => t.id === src) ?? templates[0];
  const lines = useMemo(() => {
    const w = word ? word.t[settings.target] || word.t.en : "";
    const rows = src === "theme" ? theme.chant : tpl ? tpl.lines : theme.chant;
    return rows.map((l) => fill(l[settings.target] || l.en, w));
  }, [src, theme.chant, tpl, word, settings.target]);

  useEffect(() => {
    run.current++;
    setPlaying(false);
    setActive(-1);
  }, [settings.target, subtheme.id, src, index]);

  const playAll = async () => {
    const id = ++run.current;
    setPlaying(true);
    for (let i = 0; i < lines.length; i++) {
      if (run.current !== id) return;
      setActive(i);
      sfx.clap();
      setBeatN((c) => c + 1);
      await say(lines[i], settings.target);
      await wait(180);
      if (run.current !== id) return;
      sfx.beat();
    }
    if (run.current === id) {
      setActive(-1);
      setPlaying(false);
      sfx.sparkle();
    }
  };

  const stopAll = () => {
    run.current++;
    setPlaying(false);
    setActive(-1);
    stop();
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex items-center gap-4">
        <PromptBar
          color={theme.color}
          hint="Chant slowly with claps and gestures, then mute your mic: the child finishes each line."
        >
          {ph("singWithMe", settings.target)}
          {word && src !== "theme" ? <span className="ml-2 text-inksoft">· {word.t[settings.target]}</span> : null}
        </PromptBar>
        <StarBadge n={stars} color={theme.color} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip active={src === "theme"} color={theme.color} onClick={() => setSrc("theme")}>
          {theme.emoji} Theme chant
        </Chip>
        {templates.map((t) => (
          <Chip key={t.id} active={src === t.id} color={theme.color} onClick={() => setSrc(t.id)}>
            🎵 {TPL_LABEL[t.id] ?? t.id}
          </Chip>
        ))}
        <span className="ml-auto flex items-center gap-2">
          <BigButton variant="soft" size="sm" onClick={prev} aria-label="previous word">
            <LeftIcon size={20} /> word
          </BigButton>
          <BigButton variant="soft" size="sm" onClick={next}>
            word <RightIcon size={20} />
          </BigButton>
        </span>
      </div>

      <div
        className="sticker sticker-lg flex flex-1 flex-col items-center justify-center gap-5 px-8 py-7"
        style={{ background: theme.soft, borderColor: `${theme.color}55` }}
      >
        {word && src !== "theme" ? (
          <div className="flex items-center gap-4">
            <div key={beatN} className={beatN ? "beat" : ""}>
              <PictureArt w={word} size={116} />
            </div>
            <div className="flex flex-col">
              <span className="display text-[clamp(1.6rem,3vw,2.6rem)] font-extrabold leading-tight text-ink">
                {word.t[settings.target]}
              </span>
              {settings.target === "zh" && word.pinyin ? (
                <span className="display text-[1.3rem] font-bold text-branddeep">{word.pinyin}</span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="display text-[clamp(1.4rem,2.4vw,2rem)] font-extrabold text-inksoft">
            {theme.emoji} {theme.t[settings.target]}
          </div>
        )}

        <div className="flex w-full max-w-[1150px] flex-col gap-3">
          {lines.map((l, i) => (
            <button
              key={`${i}-${l}`}
              onClick={() => {
                setActive(i);
                sfx.clap();
                setBeatN((c) => c + 1);
                void say(l, settings.target);
              }}
              className={`pressable no-select rounded-[24px] border-2 px-6 py-3 text-left ${active === i ? "karaoke" : ""}`}
              style={{
                background: active === i ? "#fff" : "rgba(255,255,255,0.72)",
                borderColor: active === i ? theme.color : "transparent",
                transform: active === i ? "scale(1.02)" : undefined,
              }}
            >
              <span className="display text-[clamp(1.45rem,3.2vw,2.9rem)] font-extrabold leading-tight text-ink">{l}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {playing ? (
            <BigButton variant="ink" size="xl" onClick={stopAll}>
              <PauseIcon size={26} /> Stop
            </BigButton>
          ) : (
            <BigButton variant="primary" size="xl" onClick={() => void playAll()}>
              <PlayIcon size={26} /> {ph("singWithMe", settings.target)}
            </BigButton>
          )}
          <BigButton
            variant="sun"
            size="lg"
            onClick={() => {
              sfx.clap();
              setBeatN((c) => c + 1);
            }}
          >
            <ClapIcon size={24} /> Clap
          </BigButton>
          <BigButton variant="soft" size="lg" onClick={() => void playAll()}>
            <RepeatIcon size={22} /> Again
          </BigButton>
          {word ? (
            <SpeakButton text={word.t[settings.target]} lang={settings.target} size={70} label="Word" color={theme.color} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
