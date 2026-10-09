"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WORD_MAP, label, sample, shuffle } from "@/lib/data";
import { t } from "@/lib/data/phrases";
import { ADJECTIVES, CARGO, GARMENTS, ROOMS, adjLabel, cargoLabel, garmentLabel, type Adjective, type Cargo, type Garment } from "@/lib/data/playdata";
import type { Setup } from "@/lib/useSetup";
import { useFeedback } from "@/components/ui/Feedback";
import { ArtTile } from "@/components/ui/ArtTile";
import { BigButton, Chip } from "@/components/ui/Kit";
import { IconArrowRight, IconSpeaker, IconStar, IconTrash } from "@/components/ui/Icons";
import { sfxDrop, sfxPick, sfxTap, sfxWin } from "@/lib/sfx";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-6 px-4 py-5">{children}</div>;
}

/* ================================================================== 7 · SENTENCE TRAIN */

type Rects = Record<string, DOMRect>;

function useZones() {
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
  return { register, hit };
}

const SLOT_META: { slot: Cargo["slot"]; key: string; color: string }[] = [
  { slot: "who", key: "train.who", color: "#f2836b" },
  { slot: "do", key: "train.do", color: "#8fbe9b" },
  { slot: "what", key: "train.what", color: "#7fb2de" },
  { slot: "where", key: "train.where", color: "#b394d6" },
];

export function TrainGame({ s }: { s: Setup }) {
  const fb = useFeedback();
  const zones = useZones();
  const [round, setRound] = useState(0);
  const [placed, setPlaced] = useState<Partial<Record<Cargo["slot"], Cargo>>>({});
  const [wrong, setWrong] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  const pool = useMemo(() => {
    const bySlot = SLOT_META.map((m) => {
      const inTheme = s.words.map((w) => w.id);
      const matches = CARGO.filter((c) => c.slot === m.slot && (!c.art || inTheme.includes(c.art.replace(/\D/g, "") ? c.art : c.art)));
      const src = matches.length >= 2 ? matches : CARGO.filter((c) => c.slot === m.slot);
      return sample(src, 1, s.seed + round * 31 + m.slot.length)[0];
    });
    return bySlot;
  }, [s.words, s.seed, round]);

  const hand = useMemo(() => {
    const correct = pool.filter(Boolean) as Cargo[];
    const decoys = sample(
      CARGO.filter((c) => !correct.some((k) => k.id === c.id)),
      5,
      s.seed + round * 13,
    );
    return shuffle([...correct, ...decoys], s.seed + round * 7);
  }, [pool, s.seed, round]);

  const complete = SLOT_META.every((m) => placed[m.slot]);

  const sentence = useMemo(() => {
    const g = (slot: Cargo["slot"]) => placed[slot];
    const who = g("who")?.en ?? "…";
    const doW = g("do")?.en ?? "…";
    const what = g("what")?.en ?? "…";
    const where = g("where")?.en ?? "…";
    return { en: `${who} ${doW} ${what} ${where}.` };
  }, [placed]);

  const onDrop = (c: Cargo, zone: string | null) => {
    if (!zone) return;
    const slot = zone.replace("car-", "") as Cargo["slot"];
    if (c.slot === slot) {
      sfxDrop();
      setPlaced((p) => ({ ...p, [slot]: c }));
      fb.mark("correct", c.art ? undefined : undefined);
      void s.say(cargoLabel(c, s.targetLang), s.targetLang);
      if (SLOT_META.every((m) => m.slot === slot || placed[m.slot]) ) {
        window.setTimeout(() => fb.win(), 400);
      }
    } else {
      setWrong(zone);
      fb.mark("wrong", c.art ? undefined : undefined);
      window.setTimeout(() => setWrong(null), 500);
    }
  };

  const readIt = async () => {
    setRolling(true);
    sfxWin();
    for (const m of SLOT_META) {
      const c = placed[m.slot];
      if (c) {
        // eslint-disable-next-line no-await-in-loop
        await s.say(cargoLabel(c, s.targetLang), s.targetLang);
      }
    }
    setRolling(false);
    fb.star();
  };

  return (
    <Shell>
      <div className="font-display text-5xl font-extrabold text-ink">{t("train.title", s.targetLang)}</div>

      {/* TRACK + TRAIN */}
      <div className="w-full overflow-hidden rounded-[2.4rem] p-4 tile-shadow" style={{ background: "linear-gradient(180deg,#eaf3fb,#dcebf7)" }}>
        <svg viewBox="0 0 1000 300" className="w-full">
          {/* hills */}
          <ellipse cx="180" cy="300" rx="260" ry="90" fill="#a9cf9b" opacity="0.65" />
          <ellipse cx="820" cy="300" rx="300" ry="80" fill="#a9cf9b" opacity="0.65" />
          <circle cx="880" cy="60" r="34" fill="#f5c453" opacity="0.85" />
          {/* track */}
          <rect x="20" y="212" width="960" height="16" rx="8" fill="#8d6b45" />
          {Array.from({ length: 33 }).map((_, i) => (
            <rect key={i} x={26 + i * 29} y="204" width="10" height="32" rx="3" fill="#a5825c" />
          ))}

          {/* train moves as the sentence fills */}
          <motion.g
            animate={{ x: rolling ? 40 : Object.keys(placed).length * 26 }}
            transition={{ type: "spring", stiffness: 60, damping: 14 }}
          >
            {/* engine */}
            <g transform="translate(60,120)">
              <rect x="0" y="30" width="120" height="66" rx="14" fill="#e4573d" stroke="#b03c28" strokeWidth="4" />
              <rect x="96" y="-6" width="52" height="102" rx="14" fill="#c8482f" stroke="#b03c28" strokeWidth="4" />
              <circle cx="126" cy="20" r="14" fill="#fdf7ee" stroke="#b03c28" strokeWidth="4" />
              <rect x="10" y="6" width="34" height="24" rx="8" fill="#fdf7ee" stroke="#b03c28" strokeWidth="4" />
              <path d="M-16 6 L0 18 L0 60 L-16 60 Z" fill="#8d6b45" />
              <circle cx="30" cy="98" r="16" fill="#35302a" />
              <circle cx="78" cy="98" r="16" fill="#35302a" />
              <circle cx="122" cy="98" r="16" fill="#35302a" />
              {/* smoke */}
              {[0, 1, 2].map((i) => (
                <motion.circle
                  key={i}
                  cx={150 + i * 10}
                  cy={-16}
                  r={10 + i * 4}
                  fill="#fff"
                  opacity={0.75 - i * 0.2}
                  animate={{ cy: [-16, -60 - i * 12], opacity: [0.7, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.4 }}
                />
              ))}
            </g>

            {/* carriages */}
            {SLOT_META.map((m, i) => (
              <g key={m.slot} transform={`translate(${210 + i * 190},132)`}>
                <motion.g animate={wrong === `car-${m.slot}` ? { x: [0, -7, 7, 0] } : {}} transition={{ duration: 0.35 }}>
                  <rect x="0" y="14" width="170" height="72" rx="12" fill={placed[m.slot] ? m.color : "#f7f2e9"} stroke={m.color} strokeWidth="5" />
                  <text x="85" y="8" textAnchor="middle" fontSize="20" fontWeight="800" fill={m.color}>
                    {t(m.key, s.targetLang)}
                  </text>
                  <text x="85" y="58" textAnchor="middle" fontSize="26" fontWeight="800" fill={placed[m.slot] ? "#fff" : "#c9bfae"}>
                    {placed[m.slot] ? cargoLabel(placed[m.slot]!, s.targetLang) : "?"}
                  </text>
                  {placed[m.slot]?.art && (
                    <text x="85" y="84" textAnchor="middle" fontSize="18">
                      {placed[m.slot]!.art}
                    </text>
                  )}
                </motion.g>
                <circle cx="34" cy="90" r="11" fill="#35302a" />
                <circle cx="136" cy="90" r="11" fill="#35302a" />
              </g>
            ))}
          </motion.g>
        </svg>
      </div>

      {/* carriages as drop zones (interactive, overlaid under the svg for accessibility) */}
      <div className="grid w-full grid-cols-2 gap-4 xl:grid-cols-4">
        {SLOT_META.map((m) => (
          <motion.div
            key={m.slot}
            ref={zones.register(`car-${m.slot}`)}
            animate={wrong === `car-${m.slot}` ? { x: [0, -8, 8, 0] } : {}}
            className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-[1.8rem] border-4 border-dashed p-4"
            style={{ borderColor: m.color, background: placed[m.slot] ? `${m.color}22` : "#fff" }}
          >
            <div className="text-base font-extrabold tracking-wide" style={{ color: m.color }}>
              {t(m.key, s.targetLang)}
            </div>
            {placed[m.slot] ? (
              <div className="flex items-center gap-2">
                <span className="text-3xl">{placed[m.slot]!.art}</span>
                <span className="font-display text-2xl font-extrabold" style={{ color: m.color }}>
                  {cargoLabel(placed[m.slot]!, s.targetLang)}
                </span>
                <button
                  onClick={() => {
                    sfxTap();
                    setPlaced((p) => ({ ...p, [m.slot]: undefined }));
                  }}
                  className="soft-ring ml-1 cursor-pointer rounded-full bg-paper p-1.5"
                >
                  <IconTrash size={18} />
                </button>
              </div>
            ) : (
              <span className="text-3xl opacity-40">⬇️</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* word cargo */}
      <div className="w-full rounded-[2.2rem] bg-paper p-5 tile-shadow">
        <div className="mb-3 text-xl font-extrabold text-inksoft">{t("train.cargo", s.targetLang)}</div>
        <div className="flex flex-wrap gap-3">
          {hand.map((c) => {
            const used = Object.values(placed).some((p) => p?.id === c.id);
            return (
              <motion.div
                key={c.id}
                drag={!used}
                dragSnapToOrigin
                dragElastic={0.14}
                whileDrag={{ scale: 1.09, zIndex: 60 }}
                onDragStart={() => sfxPick()}
                onDragEnd={(_, info) => onDrop(c, zones.hit(info.point))}
                className={`no-select touch-none ${used ? "opacity-30" : "cursor-grab active:cursor-grabbing"}`}
              >
                <button
                  onClick={() => {
                    if (used) return;
                    const slot = c.slot;
                    if (!placed[slot]) {
                      sfxTap();
                      setPlaced((p) => ({ ...p, [slot]: c }));
                    }
                  }}
                  className="flex items-center gap-2 rounded-[1.3rem] bg-cream px-5 py-3 tile-shadow"
                >
                  <span className="text-3xl">{c.art ?? "•"}</span>
                  <span className="font-display text-2xl font-extrabold text-ink">{cargoLabel(c, s.targetLang)}</span>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* sentence + read */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="rounded-[1.8rem] bg-paper px-8 py-5 tile-shadow">
          <div className="font-display text-4xl font-extrabold" style={{ color: s.theme.color }}>
            {sentence.en}
          </div>
          <div className="mt-1 text-xl font-bold text-inksoft">
            {SLOT_META.map((m) => (placed[m.slot] ? cargoLabel(placed[m.slot]!, s.targetLang) : "…")).join(" ")}
          </div>
        </div>
        <BigButton variant="coral" size="xl" disabled={!complete} onClick={() => void readIt()}>
          🚂 {t("train.go", s.targetLang)}
        </BigButton>
        <BigButton
          variant="paper"
          onClick={() => {
            setPlaced({});
            setRound((r) => r + 1);
          }}
        >
          <IconTrash size={22} /> {t("train.mixed", s.targetLang)}
        </BigButton>
      </div>
    </Shell>
  );
}

/* ================================================================== 8 · DOLLHOUSE PREPOSITIONS */

const CAT_ART = ["🐱", "🐶", "🐰", "🧸", "🐸"];

export function DollhouseGame({ s }: { s: Setup }) {
  const fb = useFeedback();
  const zones = useZones();
  const [ri, setRi] = useState(0);
  const [pi, setPi] = useState(0);
  const [ci, setCi] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [askWhere, setAskWhere] = useState(false);
  const [score, setScore] = useState(0);

  const room = ROOMS[ri % ROOMS.length];
  const spot = room.spots[pi % room.spots.length];

  const [sceneKey, setSceneKey] = useState("0-0");
  if (sceneKey !== `${ri}-${pi}`) {
    setSceneKey(`${ri}-${pi}`);
    setPos(null);
    setAskWhere(false);
  }

  const snap = (spotId: string) => {
    const target = room.spots.find((x) => x.id === spotId);
    if (!target) return;
    if (!pos) {
      if (target.id !== spot.id) {
        setWrong(spotId);
        fb.mark("wrong");
        window.setTimeout(() => setWrong(null), 450);
        return;
      }
      setPos({ x: target.x, y: target.y });
      sfxDrop();
      fb.mark("correct");
      setScore((n) => n + 1);
      void s.say(`${t(spot.prep, s.targetLang)} ${t(spot.furnKey, s.targetLang)}`, s.targetLang);
      window.setTimeout(() => setAskWhere(true), 900);
    } else {
      void s.say(`${t(target.prep, s.targetLang)} ${t(target.furnKey, s.targetLang)}`, s.targetLang);
    }
  };

  const next = () => {
    setPi((n) => n + 1);
    setPos(null);
    setAskWhere(false);
  };

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="font-display text-5xl font-extrabold text-ink">{t("house.title", s.targetLang)}</div>
        <div className="flex items-center gap-2 rounded-full bg-paper px-5 py-2 tile-shadow">
          <IconStar size={24} className="text-sun" />
          <span className="font-display text-2xl font-extrabold">{score}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {ROOMS.map((r, i) => (
          <Chip key={r.id} active={i === ri} color={s.theme.color} onClick={() => (sfxTap(), setRi(i), setPi(0))}>
            {t("unit.rooms", s.homeLang)} {i + 1}
          </Chip>
        ))}
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* dollhouse scene */}
        <div className="overflow-hidden rounded-[2.4rem] p-4 tile-shadow" style={{ background: "#f3e6d3" }}>
          <svg viewBox="0 0 200 140" className="w-full touch-none">
            {/* walls + floor */}
            <rect x="0" y="0" width="200" height="104" fill={room.wall} />
            <rect x="0" y="104" width="200" height="36" fill={room.floor} />
            <rect x="0" y="102" width="200" height="4" fill="#c9ab84" opacity="0.6" />
            {/* window */}
            <rect x="8" y="10" width="46" height="34" rx="4" fill="#cfe8f7" stroke="#fff" strokeWidth="3" />
            <line x1="31" y1="10" x2="31" y2="44" stroke="#fff" strokeWidth="3" />

            {/* furniture per room */}
            {room.id === "bedroom" && (
              <g>
                {/* curtain */}
                <path d="M164 8 L198 8 L198 104 L164 104 Z" fill="#b394d6" opacity="0.85" />
                <path d="M172 8 Q168 56 176 104 M184 8 Q188 56 180 104" stroke="#9a7ac0" strokeWidth="2" fill="none" />
                {/* bed */}
                <rect x="104" y="66" width="80" height="34" rx="8" fill="#f2836b" />
                <rect x="104" y="96" width="80" height="10" rx="4" fill="#d9694f" />
                <rect x="108" y="60" width="22" height="12" rx="5" fill="#fffaf2" />
                {/* lamp */}
                <rect x="76" y="76" width="8" height="28" fill="#8d6b45" />
                <path d="M64 78 L96 78 L88 60 L72 60 Z" fill="#f5c453" />
                {/* box */}
                <path d="M22 92 L62 92 L58 112 L26 112 Z" fill="#c89065" stroke="#8d6b45" strokeWidth="2" />
              </g>
            )}
            {room.id === "livingroom" && (
              <g>
                {/* sofa */}
                <rect x="100" y="70" width="86" height="30" rx="10" fill="#7fb2de" />
                <rect x="96" y="60" width="12" height="40" rx="6" fill="#649ac5" />
                <rect x="178" y="60" width="12" height="40" rx="6" fill="#649ac5" />
                {/* table */}
                <rect x="22" y="70" width="62" height="10" rx="4" fill="#a5825c" />
                <rect x="30" y="80" width="8" height="24" fill="#8d6b45" />
                <rect x="66" y="80" width="8" height="24" fill="#8d6b45" />
                {/* plant */}
                <circle cx="182" cy="70" r="14" fill="#8fbe9b" />
                <rect x="176" y="80" width="12" height="22" rx="4" fill="#c89065" />
                {/* box */}
                <path d="M8 112 L46 112 L42 132 L12 132 Z" fill="#c89065" stroke="#8d6b45" strokeWidth="2" />
              </g>
            )}
            {room.id === "kitchen" && (
              <g>
                {/* counter */}
                <rect x="88" y="70" width="74" height="12" rx="4" fill="#a5825c" />
                <rect x="94" y="82" width="8" height="22" fill="#8d6b45" />
                <rect x="146" y="82" width="8" height="22" fill="#8d6b45" />
                {/* cupboard/box */}
                <rect x="20" y="56" width="42" height="34" rx="5" fill="#c89065" stroke="#8d6b45" strokeWidth="2" />
                <rect x="36" y="56" width="4" height="34" fill="#8d6b45" />
                {/* lamp */}
                <rect x="176" y="42" width="6" height="22" fill="#8d6b45" />
                <path d="M164 44 L194 44 L186 28 L172 28 Z" fill="#f5c453" />
                {/* small box on floor */}
                <path d="M56 112 L94 112 L90 132 L60 132 Z" fill="#c89065" stroke="#8d6b45" strokeWidth="2" />
                <path d="M18 132 L46 132 L44 140 L20 140 Z" fill="#b07c53" />
              </g>
            )}

            {/* hiding spots */}
            {room.spots.map((sp) => {
              const active = sp.id === spot.id;
              const filled = pos && active;
              return (
                <g key={sp.id} onClick={() => snap(sp.id)} style={{ cursor: "pointer" }}>
                  <rect
                    x={sp.rx}
                    y={sp.ry}
                    width={sp.rw}
                    height={sp.rh}
                    rx="6"
                    fill={active ? "#8fbe9b" : "transparent"}
                    fillOpacity={active && !pos ? 0.4 : filled ? 0.25 : 0}
                    stroke={active && !pos ? "#5e926c" : "rgba(94,146,108,.55)"}
                    strokeWidth={active ? 2.4 : 1.4}
                    strokeDasharray={active ? "none" : "4 3"}
                    className={wrong === sp.id ? "animate-wobble" : ""}
                  />
                  {!pos && (
                    <text
                      x={sp.rx + sp.rw / 2}
                      y={sp.ry - 3}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="800"
                      fill={active ? "#3f6b4b" : "#6f8a72"}
                    >
                      {t(sp.prep, s.targetLang)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* the hiding animal — springs into the chosen spot */}
            <motion.g
              animate={{ x: (pos?.x ?? 100) - 100, y: (pos?.y ?? 20) - 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <foreignObject x="-25" y="-25" width="50" height="50" style={{ overflow: "visible" }}>
                <motion.div
                  animate={pos ? { rotate: [0, -12, 12, 0], scale: [1, 1.15, 1] } : { y: [0, -5, 0] }}
                  transition={{ repeat: pos ? 0 : Infinity, duration: 2 }}
                  className="grid h-[50px] w-[50px] cursor-pointer place-items-center text-[42px] leading-none drop-shadow-lg"
                  onClick={() => pos && void s.say(`${t(spot.prep, s.targetLang)} ${t(spot.furnKey, s.targetLang)}`, s.targetLang)}
                >
                  {CAT_ART[ci % CAT_ART.length]}
                </motion.div>
              </foreignObject>
            </motion.g>
          </svg>
        </div>

        {/* tutor rail */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
            <div className="text-xl font-extrabold text-inksoft">{t("house.put", s.targetLang)}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-5xl font-extrabold" style={{ color: s.theme.color }}>
                {t(spot.prep, s.targetLang)}
              </span>
              <span className="font-display text-4xl font-extrabold text-ink">the {t(spot.furnKey, s.targetLang)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <BigButton size="md" variant="coral" onClick={() => void s.say(`${t(spot.prep, s.targetLang)} ${t(spot.furnKey, s.targetLang)}`, s.targetLang)}>
                <IconSpeaker size={20} /> {t("ui.listen", s.homeLang)}
              </BigButton>
              <BigButton size="md" variant="paper" onClick={() => setCi((n) => n + 1)}>
                {CAT_ART[ci % CAT_ART.length]} swap
              </BigButton>
            </div>
            <div className="mt-4 rounded-2xl bg-cream px-4 py-3">
              <div className="text-base font-extrabold text-inksoft">{t("ui.tutornote", s.homeLang)}</div>
              <div className="text-lg font-semibold text-ink">
                Drag the {CAT_ART[ci % CAT_ART.length]} into the glowing zone. Then hide it and ask{" "}
                <b>{t("house.where", s.targetLang)}</b> — the child must answer with the full phrase.
              </div>
            </div>
          </div>

          <AnimatePresence>
            {askWhere && (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[2rem] p-6 tile-shadow" style={{ background: s.theme.soft }}>
                <div className="font-display text-3xl font-extrabold" style={{ color: s.theme.color }}>
                  {t("house.where", s.targetLang)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {room.spots.map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => {
                        const ok = sp.id === spot.id;
                        if (ok) {
                          fb.mark("correct");
                          sfxWin();
                        } else fb.mark("wrong");
                      }}
                      className="soft-ring cursor-pointer rounded-full bg-paper px-4 py-2 text-xl font-extrabold text-ink"
                    >
                      {t(sp.prep, s.targetLang)} {t(sp.furnKey, s.targetLang)}
                    </button>
                  ))}
                </div>
                <div className="mt-3 font-display text-2xl font-extrabold text-sage">“{t("house.found", s.targetLang)}”</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* preposition word wall */}
          <div className="rounded-[2rem] bg-paper p-5 tile-shadow">
            <div className="mb-2 text-lg font-extrabold text-inksoft">{t("ui.words", s.homeLang)}</div>
            <div className="flex flex-wrap gap-1.5">
              {["house.in", "house.on", "house.under", "house.behind", "house.nextto", "house.between", "house.infront", "house.above"].map((k) => (
                <button
                  key={k}
                  onClick={() => void s.say(t(k, s.targetLang), s.targetLang)}
                  className="soft-ring cursor-pointer rounded-full bg-cream px-3 py-1.5 text-lg font-extrabold text-ink hover:bg-sand"
                >
                  {t(k, s.targetLang)}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <BigButton size="md" variant="sage" full onClick={next}>
                {t("ui.next", s.targetLang)} <IconArrowRight size={20} />
              </BigButton>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ================================================================== 9 · NOUN-ADJECTIVE DRESSING ROOM */

export function DressingGame({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [adj, setAdj] = useState<Adjective | null>(null);
  const [items, setItems] = useState<Garment[]>([]);
  const [skin, setSkin] = useState(0);
  const [wrongKey, setWrongKey] = useState<string | null>(null);

  const SKINS = ["#f7d9b8", "#e0b088", "#c68a5f", "#8a5a3b", "#f2ddc4"];
  const color = adj?.color ?? "#7fb2de";
  const scale = adj?.scale ?? 1;

  const wearing = (g: Garment) => items.some((i) => i.id === g.id);

  const put = (g: Garment) => {
    sfxDrop();
    setItems((cur) => (cur.some((i) => i.id === g.id) ? cur : [...cur, g]));
    sayOutfit(g);
  };

  const sayOutfit = (g: Garment) => {
    const a = adj ? `${adjLabel(adj, s.targetLang)} ` : "";
    void s.say(`${a}${garmentLabel(g, s.targetLang)}`, s.targetLang);
    fb.mark("correct");
  };

  const fullSentence = () => {
    if (!items.length) return;
    const a = adj ? `${adjLabel(adj, s.targetLang)} ` : "";
    const g = garmentLabel(items[items.length - 1], s.targetLang);
    void s.say(`${t("dress.wearing", s.targetLang)} ${a}${g}`, s.targetLang);
    fb.star();
  };

  const renderGarment = (g: Garment, i: number) => {
    const on = wearing(g);
    return (
      <motion.g
        key={g.id}
        initial={{ opacity: 0, scale: 0.6, y: -30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.05 }}
      >
        <g transform={`translate(100 130) scale(${scale}) translate(-100 -130)`}>
          <path d={g.path} fill={g.tintable ? color : "#f2ddc4"} stroke="rgba(53,48,42,.28)" strokeWidth="2.5" strokeLinejoin="round" />
          {adj?.pattern === "dots" &&
            [
              [82, 120],
              [118, 130],
              [100, 165],
              [74, 160],
              [126, 168],
            ].map(([cx, cy], k) => <circle key={k} cx={cx} cy={cy} r="4.5" fill="#fff" opacity="0.85" />)}
          {adj?.pattern === "stripes" &&
            [0, 1, 2, 3, 4].map((k) => (
              <rect key={k} x="46" y={100 + k * 22} width="108" height="9" fill="#fff" opacity="0.6" />
            ))}
          {adj?.pattern === "checks" &&
            [0, 1, 2].map((k) => (
              <g key={k} opacity="0.5" fill="#fff">
                <rect x="52" y={104 + k * 34} width="96" height="8" />
                <rect x={64 + k * 30} y="96" width="8" height="104" />
              </g>
            ))}
        </g>
        {!on && null}
      </motion.g>
    );
  };

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="font-display text-5xl font-extrabold text-ink">{t("dress.title", s.targetLang)}</div>
        <Chip active={Boolean(adj)} color={s.theme.color} onClick={() => setAdj(null)}>
          {t("dress.adjective", s.targetLang)}: {adj ? adjLabel(adj, s.targetLang) : "—"}
        </Chip>
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* mannequin */}
        <div className="overflow-hidden rounded-[2.4rem] p-6 tile-shadow" style={{ background: `linear-gradient(180deg,#fff,${s.theme.soft})` }}>
          <svg viewBox="0 0 200 300" className="mx-auto w-[min(430px,80vw)]">
            {/* body */}
            <g transform={`translate(100 130) scale(${scale}) translate(-100 -130)`}>
              <circle cx="100" cy="66" r="34" fill={SKINS[skin % SKINS.length]} stroke="rgba(53,48,42,.18)" strokeWidth="2" />
              <rect x="72" y="96" width="56" height="96" rx="24" fill={SKINS[skin % SKINS.length]} stroke="rgba(53,48,42,.18)" strokeWidth="2" />
              <rect x="82" y="188" width="15" height="66" rx="7" fill={SKINS[skin % SKINS.length]} />
              <rect x="103" y="188" width="15" height="66" rx="7" fill={SKINS[skin % SKINS.length]} />
              <rect x="44" y="104" width="15" height="66" rx="7" fill={SKINS[skin % SKINS.length]} />
              <rect x="141" y="104" width="15" height="66" rx="7" fill={SKINS[skin % SKINS.length]} />
              {/* face */}
              <circle cx="89" cy="62" r="3.6" fill="#3a2a1d" />
              <circle cx="111" cy="62" r="3.6" fill="#3a2a1d" />
              <path d="M90 78 Q100 86 110 78" stroke="#3a2a1d" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
            {items
              .slice()
              .sort((a, b) => a.layer - b.layer)
              .map((g, i) => renderGarment(g, i))}
          </svg>

          <div className="mt-2 text-center">
            <div className="text-lg font-extrabold text-inksoft">🧒 {t("dress.wearing", s.targetLang)}</div>
            <div className="mt-1 font-display text-3xl font-extrabold" style={{ color: s.theme.color }}>
              {adj ? `${adjLabel(adj, s.targetLang)} ` : ""}
              {items.length ? items.map((g) => garmentLabel(g, s.targetLang)).join(" + ") : "…"}
            </div>
            {!s.mono && s.homeLang !== s.targetLang && (
              <div className="text-xl font-bold text-inksoft">
                {adj ? `${adjLabel(adj, s.homeLang)} ` : ""}
                {items.map((g) => garmentLabel(g, s.homeLang)).join(" + ")}
              </div>
            )}
          </div>
        </div>

        {/* wardrobe */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[2rem] bg-paper p-5 tile-shadow">
            <div className="mb-2 text-lg font-extrabold text-inksoft">{t("dress.adjective", s.targetLang)}</div>
            <div className="flex flex-wrap gap-2">
              {ADJECTIVES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    sfxTap();
                    setAdj((cur) => (cur?.id === a.id ? null : a));
                    void s.say(adjLabel(a, s.targetLang), s.targetLang);
                  }}
                  className={`soft-ring flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-lg font-extrabold transition ${
                    adj?.id === a.id ? "text-white" : "bg-cream text-ink hover:bg-sand"
                  }`}
                  style={adj?.id === a.id ? { background: a.color ?? s.theme.color } : undefined}
                >
                  <span className="text-xl">{a.art}</span>
                  {adjLabel(a, s.targetLang)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-paper p-5 tile-shadow">
            <div className="mb-2 text-lg font-extrabold text-inksoft">{t("dress.thing", s.targetLang)}</div>
            <div className="grid grid-cols-3 gap-2">
              {GARMENTS.map((g) => (
                <motion.button
                  key={g.id}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.93 }}
                  animate={wrongKey === g.id ? { x: [0, -8, 8, 0] } : {}}
                  onClick={() => (wearing(g) ? setItems((cur) => cur.filter((x) => x.id !== g.id)) : put(g))}
                  className={`soft-ring flex cursor-pointer flex-col items-center gap-1 rounded-[1.3rem] p-2 transition ${
                    wearing(g) ? "bg-sagesoft ring-4 ring-sage" : "bg-cream"
                  }`}
                >
                  <span className="text-3xl">{g.art}</span>
                  <span className="text-center text-sm leading-tight font-extrabold text-ink">{garmentLabel(g, s.targetLang)}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-paper p-5 tile-shadow">
            <div className="flex flex-wrap gap-2">
              <BigButton size="md" variant="sage" onClick={fullSentence}>
                <IconSpeaker size={20} /> {t("dress.describe", s.targetLang)}
              </BigButton>
              <BigButton
                size="md"
                variant="paper"
                onClick={() => {
                  setItems([]);
                  setAdj(null);
                }}
              >
                <IconTrash size={20} /> {t("dress.takeoff", s.targetLang)}
              </BigButton>
              <BigButton size="md" variant="sun" onClick={() => setSkin((n) => n + 1)}>
                🧑‍🦱
              </BigButton>
            </div>
            <div className="mt-3 rounded-2xl bg-cream px-4 py-3 text-lg leading-snug font-semibold text-inksoft">
              <b className="text-ink">CCQ:</b> {t("ccq.isClothes", s.targetLang)} · {t("ccq.whichColor", s.targetLang)} ·{" "}
              {t("ccq.bigOrSmall", s.targetLang)}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
