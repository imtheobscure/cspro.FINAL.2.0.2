"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Word } from "@/lib/data/types";
import { WORDS, label, sample, shuffle, wordUnit } from "@/lib/data";
import { t } from "@/lib/data/phrases";
import type { Setup } from "@/lib/useSetup";
import { useFeedback } from "@/components/ui/Feedback";
import { ArtTile } from "@/components/ui/ArtTile";
import { BigButton } from "@/components/ui/Kit";
import { IconArrowRight, IconSpeaker, IconStar } from "@/components/ui/Icons";
import { sfxDrop, sfxFlip, sfxPick, sfxTap } from "@/lib/sfx";

const PALETTE = ["#f2836b", "#7fb2de", "#8fbe9b", "#b394d6", "#f5c453", "#e86a8a"];

function Stage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center gap-7 px-4 py-6">{children}</div>;
}

/* ------------------------------------------------------------- drag plumbing */

type Rects = Record<string, DOMRect>;

function useDropZones() {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const register = useCallback((id: string) => (el: HTMLElement | null) => {
    refs.current[id] = el;
  }, []);
  const hit = useCallback((p: { x: number; y: number }): string | null => {
    for (const [id, el] of Object.entries(refs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) return id;
    }
    return null;
  }, []);
  return { register, hit, refs };
}

function DragChip({
  id,
  onDrop,
  zones,
  children,
  color,
}: {
  id: string;
  onDrop: (zoneId: string | null) => void;
  zones: ReturnType<typeof useDropZones>;
  children: React.ReactNode;
  color: string;
}) {
  return (
    <motion.div
      drag
      dragSnapToOrigin
      dragElastic={0.12}
      whileDrag={{ scale: 1.08, zIndex: 60, boxShadow: "0 24px 40px -18px rgba(53,48,42,.5)" }}
      onDragStart={() => sfxPick()}
      onDragEnd={(_, info) => {
        sfxDrop();
        onDrop(zones.hit(info.point));
      }}
      className="no-select touch-none cursor-grab active:cursor-grabbing"
      style={{ borderLeft: `8px solid ${color}` }}
      data-chip={id}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ MATCH */

export function MatchMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [round, setRound] = useState(0);
  const zones = useDropZones();

  const pairs = useMemo(
    () => sample(s.words, Math.min(5, s.words.length), s.seed + round),
    [s.words, s.seed, round],
  );
  const wordOrder = useMemo(() => shuffle(pairs, s.seed + round * 7), [pairs, s.seed, round]);
  const picOrder = useMemo(() => shuffle(pairs, s.seed + round * 11 + 3), [pairs, s.seed, round]);
  const [done, setDone] = useState<string[]>([]);
  const [shake, setShake] = useState<string | null>(null);

  useEffect(() => setDone([]), [round]);

  const onDrop = (wordId: string, zoneId: string | null) => {
    if (!zoneId) return;
    if (zoneId === `drop-${wordId}`) {
      const next = [...done, wordId];
      setDone(next);
      fb.mark("correct", wordId);
      if (next.length >= pairs.length) {
        setTimeout(() => {
          fb.win();
          setRound((r) => r + 1);
        }, 900);
      }
    } else {
      setShake(zoneId);
      fb.mark("wrong", wordId);
      setTimeout(() => setShake(null), 600);
    }
  };

  return (
    <Stage>
      <div className="text-center font-display text-5xl font-extrabold text-ink">{t("ui.dragword", s.targetLang)}</div>
      <div className="grid w-full grid-cols-1 items-start gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          {wordOrder.map((w) =>
            done.includes(w.id) ? (
              <div key={w.id} className="h-[86px] rounded-[1.4rem] border-4 border-dashed border-sand" />
            ) : (
              <DragChip key={w.id} id={w.id} zones={zones} onDrop={(z) => onDrop(w.id, z)} color={s.theme.color}>
                <div className="flex h-[86px] items-center gap-3 rounded-[1.4rem] bg-paper px-6 tile-shadow">
                  <button
                    onClick={() => void s.say(label(w, s.targetLang), s.targetLang)}
                    className="soft-ring grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full text-white"
                    style={{ background: s.theme.color }}
                    aria-label="listen"
                  >
                    <IconSpeaker size={22} />
                  </button>
                  <span className="font-display text-4xl font-extrabold" style={{ color: s.theme.color }}>
                    {label(w, s.targetLang)}
                  </span>
                </div>
              </DragChip>
            ),
          )}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {picOrder.map((w) => {
            const matched = done.includes(w.id);
            return (
              <motion.div
                key={w.id}
                ref={zones.register(`drop-${w.id}`)}
                animate={shake === `drop-${w.id}` ? { x: [0, -10, 10, -6, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={`flex flex-col items-center gap-2 rounded-[1.8rem] p-4 transition
                  ${matched ? "bg-sagesoft ring-4 ring-sage" : "border-4 border-dashed border-sand bg-paper"}`}
              >
                <ArtTile word={w} size={130} color={s.theme.color} />
                <AnimatePresence>
                  {matched && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-display text-3xl font-extrabold"
                      style={{ color: s.theme.color }}
                    >
                      {label(w, s.targetLang)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <BigButton variant="paper" onClick={() => setRound((r) => r + 1)}>
          {t("ui.again", s.homeLang)} <IconArrowRight size={24} />
        </BigButton>
        <div className="flex items-center gap-2 rounded-full bg-paper px-5 py-2 text-2xl font-extrabold tile-shadow">
          <IconStar size={24} className="text-sun" /> {done.length}/{pairs.length}
        </div>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------ MEMORY */

type MemCard = { key: string; word: Word; face: "pic" | "word"; matched: boolean };

export function MemoryMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [round, setRound] = useState(0);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  const cards = useMemo<MemCard[]>(() => {
    const picked = sample(s.words, Math.min(6, s.words.length), s.seed + round);
    const deck: MemCard[] = picked.flatMap((w) => [
      { key: `${w.id}-pic`, word: w, face: "pic" as const, matched: false },
      { key: `${w.id}-word`, word: w, face: "word" as const, matched: false },
    ]);
    return shuffle(deck, s.seed + round * 13);
  }, [s.words, s.seed, round]);

  useEffect(() => {
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  }, [round]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped.map((k) => cards.find((c) => c.key === k)!).filter(Boolean);
    setMoves((m) => m + 1);
    if (a && b && a.word.id === b.word.id) {
      const id = a.word.id;
      const id2 = setTimeout(() => {
        setMatched((m) => [...m, id]);
        fb.mark("correct", id);
        setFlipped([]);
      }, 480);
      return () => clearTimeout(id2);
    }
    const id = setTimeout(() => {
      setFlipped([]);
      fb.mark("wrong", a?.word.id);
    }, 1400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  useEffect(() => {
    if (matched.length && matched.length >= cards.length / 2) {
      const id = setTimeout(() => {
        fb.win();
        setRound((r) => r + 1);
      }, 1200);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched]);

  const flip = (c: MemCard) => {
    if (flipped.length >= 2 || flipped.includes(c.key) || matched.includes(c.word.id)) return;
    sfxFlip();
    if (c.face === "word") void s.say(label(c.word, s.targetLang), s.targetLang);
    setFlipped((f) => [...f, c.key]);
  };

  return (
    <Stage>
      <div className="flex w-full flex-wrap items-center justify-center gap-5">
        <div className="font-display text-5xl font-extrabold text-ink">{t("ui.tapcard", s.targetLang)}</div>
        <div className="rounded-full bg-paper px-5 py-2 text-2xl font-extrabold text-inksoft tile-shadow">
          {matched.length}/{cards.length / 2}
        </div>
      </div>
      <div className="grid w-full grid-cols-3 gap-5 md:grid-cols-4">
        {cards.map((c) => {
          const open = flipped.includes(c.key) || matched.includes(c.word.id);
          return (
            <motion.button
              key={c.key}
              onClick={() => flip(c)}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              className={`soft-ring no-select relative grid h-[210px] cursor-pointer place-items-center overflow-hidden rounded-[1.8rem] p-4 transition
                ${open ? "bg-paper" : "bg-sky/90"} ${matched.includes(c.word.id) ? "ring-4 ring-sage" : ""}`}
              style={!open ? { boxShadow: "0 12px 24px -16px rgba(53,48,42,.6)" } : undefined}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={open ? "open" : "closed"}
                  initial={{ rotateY: -90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: 90, opacity: 0 }}
                  transition={{ duration: 0.24 }}
                  className="flex flex-col items-center gap-2"
                >
                  {open ? (
                    c.face === "pic" ? (
                      <ArtTile word={c.word} size={130} color={s.theme.color} />
                    ) : (
                      <span className="text-center font-display text-4xl font-extrabold" style={{ color: s.theme.color }}>
                        {label(c.word, s.targetLang)}
                      </span>
                    )
                  ) : (
                    <span className="text-6xl opacity-90">⭐</span>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
      <BigButton variant="paper" onClick={() => setRound((r) => r + 1)}>
        {t("ui.again", s.homeLang)} <IconArrowRight size={24} />
      </BigButton>
    </Stage>
  );
}

/* ------------------------------------------------------------------ SORT */

type Group = { id: string; name: string; color: string; words: Word[] };

function buildGroups(words: Word[]): Group[] {
  const byUnit = new Map<string, Word[]>();
  words.forEach((w) => {
    const u = wordUnit(w.id);
    const arr = byUnit.get(u.id) ?? [];
    arr.push(w);
    byUnit.set(u.id, arr);
  });
  let groups: Group[] = [];
  if (byUnit.size >= 2) {
    groups = [...byUnit.entries()].map(([id, ws], i) => ({
      id,
      name: t(`unit.${id === "numbers1to10" ? "num10" : id === "numbers11to20" ? "num20" : id}`, "en"),
      color: PALETTE[i % PALETTE.length],
      words: ws,
    }));
  } else {
    const byKind = new Map<string, Word[]>();
    words.forEach((w) => {
      const arr = byKind.get(w.k) ?? [];
      arr.push(w);
      byKind.set(w.k, arr);
    });
    groups = [...byKind.entries()].map(([k, ws], i) => ({ id: k, name: k, color: PALETTE[i % PALETTE.length], words: ws }));
  }
  return groups.slice(0, 4);
}

const KIND_LABEL: Record<string, string> = {
  animal: "unit.pets",
  person: "unit.helpers",
  food: "unit.food",
  drink: "unit.food",
  thing: "unit.toys",
  clothes: "unit.clothes",
  body: "unit.body",
  place: "unit.places",
  vehicle: "unit.vehicles",
  action: "unit.actions",
  color: "unit.colors",
  shape: "unit.shapes",
  number: "unit.num10",
  letter: "unit.alphabet",
  feeling: "unit.feelings",
  weather: "unit.weather",
  time: "unit.seasons",
  nature: "unit.plants",
};

export function SortMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [round, setRound] = useState(0);
  const zones = useDropZones();
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<string | null>(null);

  const groups = useMemo(() => buildGroups(s.words), [s.words]);
  const items = useMemo(() => {
    const all = groups.flatMap((g) => g.words);
    return shuffle(sample(all, Math.min(9, all.length), s.seed + round), s.seed + round * 17);
  }, [groups, s.seed, round]);

  useEffect(() => setPlaced({}), [round, items]);

  const groupName = (g: Group) => {
    if (groups.length > 1 && KIND_LABEL[g.id]) return t(KIND_LABEL[g.id], s.targetLang);
    const key = `unit.${g.id === "numbers1to10" ? "num10" : g.id === "numbers11to20" ? "num20" : g.id}`;
    return t(key, s.targetLang);
  };

  const onDrop = (word: Word, zoneId: string | null) => {
    if (!zoneId) return;
    const gid = zoneId.replace("bin-", "");
    const group = groups.find((g) => g.id === gid);
    if (group?.words.some((w) => w.id === word.id)) {
      setPlaced((p) => ({ ...p, [word.id]: gid }));
      fb.mark("correct", word.id);
      void s.say(label(word, s.targetLang), s.targetLang);
    } else {
      setWrong(zoneId);
      fb.mark("wrong", word.id);
      setTimeout(() => setWrong(null), 600);
    }
  };

  const remaining = items.filter((w) => !placed[w.id]);
  const finished = remaining.length === 0;

  useEffect(() => {
    if (finished) {
      const id = setTimeout(() => {
        fb.win();
        setRound((r) => r + 1);
      }, 1200);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  return (
    <Stage>
      <div className="text-center font-display text-5xl font-extrabold text-ink">{t("ui.dragsort", s.targetLang)}</div>

      <div className="flex min-h-[130px] w-full flex-wrap items-start justify-center gap-4 rounded-[2rem] bg-paper p-6 tile-shadow">
        {remaining.length === 0 && <div className="font-display text-4xl font-extrabold text-sage">{t("ui.done", s.targetLang)}</div>}
        {remaining.map((w) => (
          <DragChip key={w.id} id={w.id} zones={zones} onDrop={(z) => onDrop(w, z)} color={s.theme.color}>
            <div className="flex h-[112px] w-[112px] flex-col items-center justify-center gap-1 rounded-[1.4rem] bg-cream p-2">
              <ArtTile word={w} size={70} color={s.theme.color} />
              <span className="text-center text-base font-bold leading-tight text-inksoft">{label(w, s.targetLang)}</span>
            </div>
          </DragChip>
        ))}
      </div>

      <div className={`grid w-full gap-6 ${groups.length > 2 ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-1 xl:grid-cols-2"}`}>
        {groups.map((g) => (
          <motion.div
            key={g.id}
            ref={zones.register(`bin-${g.id}`)}
            animate={wrong === `bin-${g.id}` ? { x: [0, -10, 10, 0] } : {}}
            transition={{ duration: 0.35 }}
            className="flex min-h-[260px] flex-col gap-3 rounded-[2rem] p-5"
            style={{ background: `${g.color}18`, border: `4px dashed ${g.color}` }}
          >
            <div className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-full" style={{ background: g.color }} />
              <span className="font-display text-3xl font-extrabold" style={{ color: g.color }}>
                {groupName(g)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {items
                .filter((w) => placed[w.id] === g.id)
                .map((w) => (
                  <motion.div
                    key={w.id}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => {
                      sfxTap();
                      void s.say(label(w, s.targetLang), s.targetLang);
                    }}
                    className="flex cursor-pointer flex-col items-center rounded-[1rem] bg-paper px-3 py-2"
                  >
                    <ArtTile word={w} size={62} color={g.color} />
                    <span className="text-base font-bold text-ink">{label(w, s.targetLang)}</span>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        ))}
      </div>
      <BigButton variant="paper" onClick={() => setRound((r) => r + 1)}>
        {t("ui.again", s.homeLang)} <IconArrowRight size={24} />
      </BigButton>
    </Stage>
  );
}

/* ------------------------------------------------------------------ OPPOSITES */

export function OppositesMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);

  const pairs = useMemo(() => {
    const withOpp = s.words.filter((w) => w.opp && WORDS.some((x) => x.id === w.opp));
    const seen = new Set<string>();
    const uniq = withOpp.filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      seen.add(w.opp!);
      return true;
    });
    const source = uniq.length >= 3 ? uniq : WORDS.filter((w) => w.opp && ["big", "hot", "fast", "up", "open", "long", "clean", "loud"].includes(w.id));
    return sample(source, Math.min(4, source.length), s.seed + round);
  }, [s.words, s.seed, round]);

  const rights = useMemo(
    () => shuffle(pairs.map((p) => WORDS.find((w) => w.id === p.opp)!).filter(Boolean), s.seed + round * 19),
    [pairs, s.seed, round],
  );

  useEffect(() => {
    setLeft(null);
    setMatched([]);
  }, [round]);

  const pickRight = (w: Word) => {
    if (!left) return;
    const lw = WORDS.find((x) => x.id === left)!;
    if (lw.opp === w.id) {
      setMatched((m) => [...m, lw.id, w.id]);
      fb.mark("correct", lw.id);
      setLeft(null);
      void s.say(`${label(lw, s.targetLang)}. ${label(w, s.targetLang)}.`, s.targetLang);
      if (matched.length + 2 >= pairs.length * 2) {
        setTimeout(() => {
          fb.win();
          setRound((r) => r + 1);
        }, 1200);
      }
    } else {
      setWrong(w.id);
      fb.mark("wrong", lw.id);
      setTimeout(() => setWrong(null), 600);
    }
  };

  const tile = (w: Word, side: "L" | "R") => {
    const isMatched = matched.includes(w.id);
    const isLeft = side === "L" && left === w.id;
    return (
      <motion.button
        key={w.id + side}
        onClick={() => {
          sfxTap();
          void s.say(label(w, s.targetLang), s.targetLang);
          if (side === "L" && !isMatched) setLeft(isLeft ? null : w.id);
          else if (side === "R") pickRight(w);
        }}
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.96 }}
        animate={wrong === w.id ? { x: [0, -9, 9, 0] } : {}}
        className={`soft-ring no-select flex cursor-pointer flex-col items-center gap-2 rounded-[1.8rem] bg-paper p-5 tile-shadow
          ${isMatched ? "opacity-50 ring-4 ring-sage" : ""} ${isLeft ? "ring-8" : ""}`}
        style={isLeft ? ({ ["--tw-ring-color" as string]: s.theme.color } as React.CSSProperties) : undefined}
      >
        <ArtTile word={w} size={120} color={s.theme.color} />
        <span className="font-display text-3xl font-extrabold" style={{ color: s.theme.color }}>
          {label(w, s.targetLang)}
        </span>
        {!s.mono && s.homeLang !== s.targetLang && (
          <span className="text-xl font-bold text-inksoft">{label(w, s.homeLang)}</span>
        )}
      </motion.button>
    );
  };

  return (
    <Stage>
      <div className="font-display text-5xl font-extrabold text-ink">{t("mode.opposites", s.targetLang)}</div>
      <div className="grid w-full grid-cols-2 gap-8">
        <div className="grid gap-4">{pairs.map((w) => tile(w, "L"))}</div>
        <div className="grid gap-4">{rights.map((w) => tile(w, "R"))}</div>
      </div>
      <div className="flex items-center gap-4">
        <BigButton variant="paper" onClick={() => setRound((r) => r + 1)}>
          {t("ui.again", s.homeLang)} <IconArrowRight size={24} />
        </BigButton>
        <div className="rounded-full bg-paper px-5 py-2 text-2xl font-extrabold tile-shadow">
          {matched.length / 2}/{pairs.length}
        </div>
      </div>
    </Stage>
  );
}
