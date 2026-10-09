"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PictureArt, PromptBar, SpeakButton, StarBadge } from "@/components/stage/Shared";
import { BigButton } from "@/components/ui/BigButton";
import { Confetti } from "@/components/ui/Confetti";
import { CheckIcon, RepeatIcon, RightIcon, TrophyIcon } from "@/components/ui/icons";
import { ph } from "@/data/ui-phrases";
import { DragProvider, useDrag } from "@/lib/drag";
import { sfx } from "@/lib/sfx";
import { useStudio } from "@/lib/studio";
import type { Subtheme, Translations, Word } from "@/data/types";
import { sample, shuffle } from "@/lib/util";

type Item = { word: Word; bin: "a" | "b" };
type Basket = { key: string; emoji: string; t: Translations };

const PER_BIN = 3;

export function SortMode() {
  const dropRef = useRef<(dragId: string, dropId: string) => void>(() => undefined);
  return (
    <DragProvider onDrop={(dragId, dropId) => dropRef.current(dragId, dropId)}>
      <SortInner dropRef={dropRef} />
    </DragProvider>
  );
}

function makeRound(
  subtheme: Subtheme,
  siblings: Subtheme[],
  binPairs: [Basket, Basket][],
  idx: number,
): { baskets: [Basket, Basket] | null; items: Item[] } {
  const pair = binPairs[idx % Math.max(1, binPairs.length)];
  if (!pair) return { baskets: null, items: [] };
  let list: Item[];
  if (subtheme.bins) {
    list = shuffle(
      subtheme.words
        .filter((w) => w.bin === pair[0].key || w.bin === pair[1].key)
        .map((w) => ({ word: w, bin: (w.bin === pair[0].key ? "a" : "b") as "a" | "b" })),
    );
  } else {
    const mine = sample(subtheme.words, PER_BIN).map((w) => ({ word: w, bin: "a" as const }));
    const other = siblings.find((s) => s.id === pair[1].key);
    const theirs = sample(other?.words ?? [], PER_BIN).map((w) => ({ word: w, bin: "b" as const }));
    list = shuffle([...mine, ...theirs]);
  }
  return { baskets: pair, items: list };
}

function SortInner({ dropRef }: { dropRef: React.MutableRefObject<(dragId: string, dropId: string) => void> }) {
  const { subtheme, siblings, settings, theme, say, addStar, stars } = useStudio();
  const { start, over, payload } = useDrag();

  const binPairs = useMemo<[Basket, Basket][]>(() => {
    if (subtheme.bins && subtheme.bins.length >= 2) {
      const out: [Basket, Basket][] = [];
      for (let i = 0; i + 1 < subtheme.bins.length; i += 2) {
        const [x, y] = subtheme.bins.slice(i, i + 2) as [Basket, Basket];
        out.push([x, y]);
      }
      return out;
    }
    return siblings.slice(0, 4).map((s) => [
      { key: subtheme.id, emoji: subtheme.emoji, t: subtheme.t },
      { key: s.id, emoji: s.emoji, t: s.t },
    ]) as [Basket, Basket][];
  }, [subtheme, siblings]);

  const first = useMemo(() => makeRound(subtheme, siblings, binPairs, 0), [subtheme, siblings, binPairs]);
  const [pairIdx, setPairIdx] = useState(0);
  const [items, setItems] = useState<Item[]>(first.items);
  const [baskets, setBaskets] = useState<[Basket, Basket] | null>(first.baskets);
  const [done, setDone] = useState<Record<string, "a" | "b" | "wrong">>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  const build = useCallback(
    (idx: number) => {
      const r = makeRound(subtheme, siblings, binPairs, idx);
      setBaskets(r.baskets);
      setItems(r.items);
      setDone({});
      setSelected(null);
    },
    [binPairs, subtheme, siblings],
  );

  useEffect(() => {
    setPairIdx(0);
    const r = makeRound(subtheme, siblings, binPairs, 0);
    setBaskets(r.baskets);
    setItems(r.items);
    setDone({});
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtheme.id, settings.target]);

  dropRef.current = (dragId, dropId) => {
    void attempt(dragId, dropId === "bin-a" ? "a" : "b");
  };

  const allDone = items.length > 0 && items.every((it) => done[it.word.id] === it.bin);

  useEffect(() => {
    if (allDone) {
      sfx.win();
      setBurst((b) => b + 1);
    }
  }, [allDone]);

  const attempt = async (itemId: string, basket: "a" | "b") => {
    const it = items.find((x) => x.word.id === itemId);
    if (!it || done[itemId] === it.bin) return;
    if (it.bin === basket) {
      sfx.correct();
      addStar(it.word);
      setDone((d) => ({ ...d, [itemId]: basket }));
      setSelected(null);
      await say(it.word.t[settings.target], settings.target);
    } else {
      sfx.wrong();
      setDone((d) => ({ ...d, [itemId]: "wrong" }));
      setSelected(null);
      setTimeout(() => setDone((d) => ({ ...d, [itemId]: undefined as never })), 600);
    }
  };

  if (allDone && baskets) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6">
        <Confetti on burstKey={burst} count={70} />
        <div className="sticker sticker-lg pop-in flex flex-col items-center gap-3 px-14 py-10" style={{ background: theme.soft }}>
          <TrophyIcon size={86} className="text-[#F2A62B]" />
          <div className="display text-[clamp(2.2rem,4.6vw,3.6rem)] font-extrabold text-ink">{ph("allDone", settings.target)}</div>
          <div className="display text-[clamp(1.2rem,2vw,1.8rem)] font-bold text-inksoft">
            {baskets[0].t[settings.target]} · {baskets[1].t[settings.target]}
          </div>
        </div>
        <BigButton
          variant="primary"
          size="xl"
          onClick={() => {
            const n = pairIdx + 1;
            setPairIdx(n);
            build(n);
          }}
        >
          <RightIcon size={26} /> {ph("nextWords", settings.target)}
        </BigButton>
      </div>
    );
  }

  if (!baskets) return null;

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex items-center gap-4">
        <PromptBar color={theme.color} hint="Say the sentence out loud together: “The apple is fruit!” Tap a basket to hear its name.">
          {ph("whichBasket", settings.target)}
        </PromptBar>
        <StarBadge n={stars} color={theme.color} />
      </div>

      {/* tray */}
      <div className="sticker flex flex-wrap items-center justify-center gap-3 px-5 py-4" style={{ background: "#fff" }}>
        {items.map((it) => {
          const solved = done[it.word.id] === it.bin;
          if (solved) return null;
          const isSel = selected === it.word.id;
          return (
            <button
              key={it.word.id}
              onPointerDown={(e) =>
                start(e, {
                  id: it.word.id,
                  ghost: (
                    <div className="sticker flex items-center gap-2 px-4 py-2" style={{ background: theme.soft }}>
                      <PictureArt w={it.word} size={54} />
                      <span className="display text-[1.3rem] font-extrabold text-ink">{it.word.t[settings.target]}</span>
                    </div>
                  ),
                })
              }
              onClick={() => {
                sfx.tap();
                setSelected(isSel ? null : it.word.id);
              }}
              className={`pressable sticker no-select flex cursor-grab items-center gap-2 rounded-[22px] px-4 py-2 active:cursor-grabbing ${done[it.word.id] === "wrong" ? "nudge" : ""} ${isSel ? "wiggle" : ""}`}
              style={{ borderColor: isSel ? theme.color : `${theme.color}44`, background: isSel ? `${theme.color}22` : "#fff", opacity: payload?.id === it.word.id ? 0.4 : 1 }}
            >
              <PictureArt w={it.word} size={64} />
              <span className="display text-[clamp(1rem,1.6vw,1.4rem)] font-extrabold text-ink">{it.word.t[settings.target]}</span>
            </button>
          );
        })}
        {items.every((it) => done[it.word.id] === it.bin) ? (
          <span className="display text-[1.4rem] font-extrabold text-mint">✓</span>
        ) : null}
      </div>

      {/* baskets */}
      <div className="grid flex-1 grid-cols-2 gap-5">
        {(["a", "b"] as const).map((side) => {
          const b = side === "a" ? baskets[0] : baskets[1];
          const isOver = over === `bin-${side}`;
          const inside = items.filter((it) => done[it.word.id] === side);
          return (
            <div
              key={side}
              data-drop={`bin-${side}`}
              onClick={() => {
                if (selected) void attempt(selected, side);
                else void say(b.t[settings.target], settings.target);
              }}
              className="sticker flex cursor-pointer flex-col items-center gap-2 px-4 py-4 transition-transform"
              style={{
                background: isOver ? `${theme.color}1f` : theme.soft,
                borderColor: isOver ? theme.color : `${theme.color}55`,
                transform: isOver ? "scale(1.02)" : undefined,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[3rem] leading-none">{b.emoji}</span>
                <span className="display text-[clamp(1.5rem,3vw,2.6rem)] font-extrabold text-ink">{b.t[settings.target]}</span>
                <SpeakButton text={b.t[settings.target]} lang={settings.target} size={54} color={theme.color} />
              </div>
              <div className="flex min-h-[120px] w-full flex-wrap items-center justify-center gap-3 rounded-[24px] border-4 border-dashed border-white/80 bg-white/60 p-3">
                {inside.length === 0 ? (
                  <span className="display text-[1.2rem] font-bold text-inksoft/50">…</span>
                ) : (
                  inside.map((it) => (
                    <div key={it.word.id} className="pop-in flex items-center gap-1 rounded-2xl bg-white px-3 py-2 shadow-[0_4px_0_rgba(59,52,85,0.10)]">
                      <PictureArt w={it.word} size={52} />
                      <span className="display text-[1.15rem] font-extrabold text-mint">{it.word.t[settings.target]}</span>
                      <CheckIcon size={20} className="text-mint" strokeWidth={3} />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3">
        <SpeakButton text={ph("whichBasket", settings.target)} lang={settings.target} size={60} color="#6E6690" />
        <BigButton
          variant="soft"
          size="lg"
          onClick={() => {
            const n = pairIdx + 1;
            setPairIdx(n);
            build(n);
          }}
        >
          <RepeatIcon size={22} /> {ph("nextWords", settings.target)}
        </BigButton>
      </div>
    </div>
  );
}
