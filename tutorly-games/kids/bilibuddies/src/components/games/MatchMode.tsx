"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PictureArt, PromptBar, SpeakButton, StarBadge } from "@/components/stage/Shared";
import { BigButton } from "@/components/ui/BigButton";
import { Confetti } from "@/components/ui/Confetti";
import { CheckIcon, RepeatIcon, TrophyIcon } from "@/components/ui/icons";
import { ph } from "@/data/ui-phrases";
import { DragProvider, useDrag } from "@/lib/drag";
import { sfx } from "@/lib/sfx";
import { useStudio } from "@/lib/studio";
import type { Word } from "@/data/types";
import { shuffle, sample } from "@/lib/util";

const PAIRS = 6;

export function MatchMode() {
  const dropRef = useRef<(dragId: string, dropId: string) => void>(() => undefined);
  return (
    <DragProvider onDrop={(dragId, dropId) => dropRef.current(dragId, dropId)}>
      <MatchInner dropRef={dropRef} />
    </DragProvider>
  );
}

function MatchInner({ dropRef }: { dropRef: React.MutableRefObject<(dragId: string, dropId: string) => void> }) {
  const { deck, settings, theme, say, addStar, stars } = useStudio();
  const [pairs, setPairs] = useState<Word[]>(() => sample(deck, PAIRS));
  const [chips, setChips] = useState<Word[]>(() => shuffle(pairs));
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const { start, over, payload } = useDrag();

  const key = useMemo(() => `${deck.map((d) => d.id).join()}|${settings.target}`, [deck, settings.target]);

  const newRound = useCallback(() => {
    const p = sample(deck, PAIRS);
    setPairs(p);
    setChips(shuffle(p));
    setPlaced({});
    setSelected(null);
    setWrongId(null);
  }, [deck]);

  useEffect(() => {
    newRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  dropRef.current = (dragId, dropId) => {
    void attempt(dragId, dropId.replace("pic-", ""));
  };

  const done = pairs.length > 0 && Object.values(placed).filter(Boolean).length === pairs.length;

  useEffect(() => {
    if (done) {
      sfx.win();
      setBurst((b) => b + 1);
    }
  }, [done]);

  const attempt = async (chipId: string, targetId: string) => {
    if (placed[targetId]) return;
    const chip = chips.find((c) => c.id === chipId);
    const target = pairs.find((p) => p.id === targetId);
    if (!chip || !target) return;
    if (chipId === targetId) {
      sfx.correct();
      addStar(target);
      setPlaced((p) => ({ ...p, [targetId]: true }));
      setSelected(null);
      await say(target.t[settings.target], settings.target);
    } else {
      sfx.wrong();
      setWrongId(targetId);
      setSelected(null);
      setTimeout(() => setWrongId(null), 620);
    }
  };

  if (done) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6">
        <Confetti on burstKey={burst} count={80} />
        <div className="sticker sticker-lg pop-in flex flex-col items-center gap-3 px-14 py-10" style={{ background: theme.soft }}>
          <TrophyIcon size={86} className="text-[#F2A62B]" />
          <div className="display text-[clamp(2.2rem,4.6vw,3.6rem)] font-extrabold text-ink">{ph("allDone", settings.target)}</div>
          <StarBadge n={stars} color={theme.color} />
        </div>
        <BigButton variant="primary" size="xl" onClick={newRound}>
          <RepeatIcon size={26} /> {ph("playAgain", settings.target)}
        </BigButton>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <Confetti on={false} burstKey={burst} />
      <div className="flex items-center gap-4">
        <PromptBar color={theme.color} hint="Or tap a word, then tap a picture — perfect for a tutor driving with one mouse.">
          {ph("matchTheWord", settings.target)}
        </PromptBar>
        <StarBadge n={stars} color={theme.color} />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
        {/* pictures */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {pairs.map((p) => {
            const isPlaced = placed[p.id];
            const isOver = over === `pic-${p.id}` && !isPlaced;
            return (
              <div
                key={p.id}
                data-drop={`pic-${p.id}`}
                onClick={() => {
                  if (selected) void attempt(selected, p.id);
                  else void say(p.t[settings.target], settings.target);
                }}
                className={`sticker pressable no-select relative flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-1 p-3 ${wrongId === p.id ? "nudge" : ""}`}
                style={{
                  background: isPlaced ? "#E9F9F3" : isOver ? `${theme.color}22` : "#fff",
                  borderColor: isPlaced ? "#35B79A" : isOver ? theme.color : `${theme.color}33`,
                  transform: isOver ? "scale(1.04)" : undefined,
                }}
              >
                <PictureArt w={p} size={settings.bigCards ? 112 : 92} />
                {isPlaced ? (
                  <>
                    <div className="display text-center text-[clamp(1rem,1.6vw,1.5rem)] font-extrabold leading-tight text-mint">
                      {p.t[settings.target]}
                    </div>
                    <CheckIcon size={26} className="absolute right-2 top-2 text-mint" strokeWidth={3} />
                  </>
                ) : (
                  <div className="display h-[2.1rem] w-[80%] rounded-xl border-2 border-dashed border-line bg-cream/70" />
                )}
              </div>
            );
          })}
        </div>

        {/* word chips */}
        <div className="flex flex-col gap-3">
          <div className="display text-[1.15rem] font-extrabold uppercase tracking-wide text-inksoft">
            {ph("whichWord", settings.target)}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {chips.map((c) => {
              const isPlaced = placed[c.id];
              const isSel = selected === c.id;
              if (isPlaced)
                return (
                  <div key={c.id} className="flex min-h-[76px] items-center justify-center rounded-[20px] border-2 border-dashed border-line/70 text-inksoft/40">
                    ✓
                  </div>
                );
              return (
                <button
                  key={c.id}
                  onPointerDown={(e) =>
                    start(e, {
                      id: c.id,
                      ghost: (
                        <div className="sticker display flex items-center gap-2 px-5 py-3 text-[1.5rem] font-extrabold text-ink" style={{ background: theme.soft }}>
                          {c.t[settings.target]}
                        </div>
                      ),
                    })
                  }
                  onClick={() => {
                    sfx.tap();
                    setSelected(isSel ? null : c.id);
                    if (!isSel) void say(c.t[settings.target], settings.target);
                  }}
                  className={`pressable sticker no-select flex min-h-[76px] cursor-grab items-center justify-center gap-2 px-4 py-3 text-left active:cursor-grabbing ${isSel ? "wiggle" : ""}`}
                  style={{
                    background: isSel ? theme.color : "#fff",
                    color: isSel ? "#fff" : undefined,
                    borderColor: isSel ? theme.color : `${theme.color}44`,
                    opacity: payload?.id === c.id ? 0.35 : 1,
                  }}
                >
                  <span className="display text-[clamp(1.15rem,2vw,1.7rem)] font-extrabold leading-tight">{c.t[settings.target]}</span>
                  {settings.target === "zh" && c.pinyin ? (
                    <span className="display text-[0.95rem] font-bold text-branddeep">{c.pinyin}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center gap-3">
            <SpeakButton text={ph("matchTheWord", settings.target)} lang={settings.target} size={62} color={theme.color} />
            <BigButton variant="soft" size="lg" onClick={newRound}>
              <RepeatIcon size={22} /> {ph("playAgain", settings.target)}
            </BigButton>
          </div>
        </div>
      </div>
    </div>
  );
}
