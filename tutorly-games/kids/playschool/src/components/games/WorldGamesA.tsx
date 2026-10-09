"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WORD_MAP, label, sample } from "@/lib/data";
import { t } from "@/lib/data/phrases";
import { CHARADES, EMOTION_FACES, HUNTS, type FaceParams, type HuntItem } from "@/lib/data/playdata";
import type { Setup } from "@/lib/useSetup";
import { useFeedback } from "@/components/ui/Feedback";
import { ArtTile } from "@/components/ui/ArtTile";
import { BigButton, Chip } from "@/components/ui/Kit";
import { IconArrowRight, IconMic, IconStar } from "@/components/ui/Icons";
import { sfxStar, sfxTap, sfxWin } from "@/lib/sfx";
import { useCamera } from "@/lib/media";
import { speak } from "@/lib/speech";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-6 px-4 py-5">{children}</div>;
}

/* ================================================================== 4 · MAGIC CAMERA SCAVENGER */

export function ScavengerGame({ s }: { s: Setup }) {
  const fb = useFeedback();
  const { state: camState, attachVideo, start: startCam, stop: stopCam } = useCamera();
  const [hi, setHi] = useState(0);
  const [item, setItem] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [reticle, setReticle] = useState({ x: 50, y: 50 });
  const [auto, setAuto] = useState(false);
  const videoWrap = useRef<HTMLDivElement | null>(null);

  const hunt = HUNTS[hi];
  const current: HuntItem = hunt.items[item % hunt.items.length];
  const art = current.fallbackId ? WORD_MAP[current.fallbackId] : undefined;

  const [huntKey, setHuntKey] = useState(hi);
  if (huntKey !== hi) {
    setHuntKey(hi);
    setFound([]);
    setItem(0);
  }

  const celebrate = () => {
    setFlash(true);
    sfxWin();
    window.setTimeout(() => setFlash(false), 320);
    if (!found.includes(current.id)) setFound((f) => [...f, current.id]);
    fb.star();
    void s.say(`${t("hunt.found", s.targetLang)} ${current.prompt}`, s.targetLang);
    window.setTimeout(() => {
      if (item + 1 >= hunt.items.length) {
        fb.win();
        setItem(0);
        setFound([]);
      } else setItem((n) => n + 1);
    }, 1700);
  };

  const missed = () => {
    fb.mark("wrong");
    void s.say(t("hunt.notThere", s.targetLang), s.targetLang);
  };

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="font-display text-5xl font-extrabold text-ink">{t("hunt.title", s.targetLang)}</div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {HUNTS.map((h, i) => (
          <Chip key={h.id} active={i === hi} color={h.color} onClick={() => (sfxTap(), setHi(i))}>
            {t(h.nameKey, s.homeLang)}
          </Chip>
        ))}
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* camera stage */}
        <div
          ref={videoWrap}
          className="relative aspect-[16/10] w-full overflow-hidden rounded-[2.4rem] bg-ink tile-shadow"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setReticle({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
        >
          <video ref={attachVideo} playsInline muted className="h-full w-full scale-x-[-1] object-cover" />

          {camState !== "on" && (
            <div className="absolute inset-0 grid place-items-center gap-4 bg-ink/85 px-8 text-center">
              <div>
                <div className="mb-4 text-7xl">📷</div>
                <div className="mb-2 font-display text-4xl font-extrabold text-cream">{t("hunt.camera", s.targetLang)}</div>
                <p className="mx-auto mb-6 max-w-[46ch] text-xl font-semibold text-cream/80">
                  {t("hunt.look", s.targetLang)} Point the camera at real objects in the room — the child names each one in the target
                  language. Nothing is uploaded; the video never leaves this device.
                </p>
                <BigButton variant="coral" size="xl" onClick={() => void startCam()}>
                  📷 {t("hunt.camera", s.targetLang)}
                </BigButton>
                {camState === "denied" && (
                  <div className="mt-4 text-lg font-bold text-sun">
                    Camera blocked — no problem. Use the picture card below and hunt around the real room instead.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* magic frame that follows the pointer/tutor aim */}
          {camState === "on" && (
            <>
              <div
                className="pointer-events-none absolute h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-[1.6rem] border-[6px] transition-transform duration-150"
                style={{ left: `${reticle.x}%`, top: `${reticle.y}%`, borderColor: hunt.color, boxShadow: `0 0 0 4px rgba(255,255,255,.35) inset` }}
              >
                <span className="absolute -top-8 left-0 rounded-full px-3 py-1 text-base font-extrabold text-white" style={{ background: hunt.color }}>
                  {t("hunt.frame", s.targetLang)}
                </span>
                {["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-bottom-1 -right-1"].map((pos) => (
                  <span key={pos} className={`absolute ${pos} h-5 w-5 rounded-full`} style={{ background: hunt.color }} />
                ))}
              </div>

              {/* PIP mini-word so the child always sees the target */}
              <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-[1.4rem] bg-paper/95 px-4 py-3">
                {art && <ArtTile word={art} size={62} color={hunt.color} />}
                <div>
                  <div className="text-sm font-extrabold text-inksoft">{t("hunt.find", s.targetLang)}</div>
                  <div className="font-display text-2xl font-extrabold" style={{ color: hunt.color }}>
                    {current.prompt}
                  </div>
                </div>
              </div>

              {/* tutor judgement buttons */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button
                  onClick={celebrate}
                  className="soft-ring cursor-pointer rounded-full border-b-4 border-[#74a681] bg-sage px-6 py-3 font-display text-2xl font-extrabold text-white"
                >
                  ✅ {t("hunt.found", s.targetLang)}
                </button>
                <button
                  onClick={missed}
                  className="soft-ring cursor-pointer rounded-full border-b-4 border-[#dcac3d] bg-sun px-6 py-3 font-display text-xl font-extrabold text-ink"
                >
                  {t("hunt.notThere", s.targetLang)}
                </button>
              </div>
            </>
          )}

          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(circle,#fff 0%,transparent 70%)" }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* hunt list */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
            <div className="mb-3 text-xl font-extrabold text-inksoft">
              {t("hunt.find", s.targetLang)} · {item + 1}/{hunt.items.length}
            </div>
            <div className="mb-4 flex items-center gap-4">
              <div className="grid h-24 w-24 place-items-center rounded-3xl text-5xl" style={{ background: `${hunt.color}25` }}>
                {current.art}
              </div>
              <div>
                <div className="font-display text-4xl leading-tight font-extrabold" style={{ color: hunt.color }}>
                  {current.prompt}
                </div>
                {art && <div className="text-xl font-bold text-inksoft">{label(art, s.targetLang)}</div>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <BigButton
                size="md"
                variant="coral"
                onClick={() => void s.say(`${t("hunt.find", s.targetLang)} ${current.prompt}`, s.targetLang)}
              >
                <IconMic size={20} /> {t("ui.listen", s.homeLang)}
              </BigButton>
              <BigButton size="md" variant="paper" onClick={() => setItem((n) => n + 1)}>
                {t("hunt.next", s.targetLang)} <IconArrowRight size={20} />
              </BigButton>
            </div>
            <div className="mt-3 rounded-2xl bg-cream px-4 py-3 text-lg leading-snug font-semibold text-inksoft">
              <b className="text-ink">CCQ:</b> {t(current.ccq, s.targetLang)}
            </div>
          </div>

          <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xl font-extrabold text-inksoft">{t("ui.progress", s.homeLang)}</span>
              <span className="font-display text-2xl font-extrabold" style={{ color: hunt.color }}>
                {found.length}/{hunt.items.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {hunt.items.map((it) => {
                const got = found.includes(it.id);
                const now = it.id === current.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => setItem(hunt.items.findIndex((x) => x.id === it.id))}
                    className={`grid h-16 w-16 cursor-pointer place-items-center rounded-2xl text-3xl transition ${
                      got ? "bg-sagesoft ring-4 ring-sage" : now ? "ring-4" : "bg-cream opacity-60"
                    }`}
                    style={now ? ({ ["--tw-ring-color" as string]: hunt.color } as React.CSSProperties) : undefined}
                  >
                    {it.art}
                  </button>
                );
              })}
            </div>
            {found.length >= hunt.items.length && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sunsoft px-5 py-3">
                <span className="text-4xl">🏆</span>
                <span className="font-display text-2xl font-extrabold text-sun">{t("hunt.trophy", s.targetLang)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="text-base font-semibold text-inksoft">
        {t("ui.tutornote", s.homeLang)}: the camera never records or uploads anything — it is a live mirror only. Turn it off any time.
      </div>
    </Shell>
  );
}

/* ================================================================== 5 · EMOTION FACE MIRROR */

function Slider({
  label: txt,
  value,
  min,
  max,
  onChange,
  icon,
  accent,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  icon: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[128px] shrink-0 text-lg font-extrabold text-inksoft">
        {icon} {txt}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.02}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-4 flex-1 cursor-pointer appearance-none rounded-full bg-sand"
        style={{ accentColor: accent }}
      />
    </div>
  );
}

const DEFAULT_FACE: FaceParams = {
  browAngle: 0, browY: 0, eyeOpen: 1, eyeSize: 1, mouthCurve: 0.3, mouthOpen: 0,
  mouthW: 1, blush: 0, tears: 0, brows: true, tongue: false, zzz: false,
};

export function MirrorGame({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [ti, setTi] = useState(0);
  const [showTarget, setShowTarget] = useState(true);
  const [mode, setMode] = useState<"target" | "free">("target");
  const [face, setFace] = useState<FaceParams>(DEFAULT_FACE);
  const [matched, setMatched] = useState(false);
  const { state: camState, attachVideo, start: startCam, stop: stopCam } = useCamera();

  const target = EMOTION_FACES[ti];
  const word = WORD_MAP[target.id] ?? WORD_MAP["happy"];
  const set = (p: Partial<FaceParams>) => setFace((f) => ({ ...f, ...p }));

  const [faceKey, setFaceKey] = useState(ti);
  if (faceKey !== ti) {
    setFaceKey(ti);
    setFace(DEFAULT_FACE);
    setMatched(false);
  }

  const loadTarget = () => {
    setFace(target.face);
    sfxTap();
  };

  const check = () => {
    const a = face;
    const b = target.face;
    const near = (x: number, y: number, tol: number) => Math.abs(x - y) <= tol;
    const ok =
      near(a.mouthCurve, b.mouthCurve, 0.45) &&
      near(a.browAngle, b.browAngle, 0.5) &&
      near(a.mouthOpen, b.mouthOpen, 0.4) &&
      near(a.eyeOpen, b.eyeOpen, 0.45);
    setMatched(ok);
    if (ok) {
      fb.star(word.id);
      void s.say(`${t("ui.correct", s.targetLang)} ${label(word, s.targetLang)}`, s.targetLang);
    } else {
      fb.mark("wrong", word.id);
      void s.say(t("mirror.copy", s.targetLang), s.targetLang);
    }
  };

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="font-display text-5xl font-extrabold text-ink">{t("mirror.title", s.targetLang)}</div>
        <Chip active={mode === "target"} color={s.theme.color} onClick={() => setMode("target")}>
          {t("mirror.copy", s.targetLang)}
        </Chip>
        <Chip active={mode === "free"} color="#b394d6" onClick={() => setMode("free")}>
          {t("mirror.sculpt", s.targetLang)}
        </Chip>
      </div>

      {/* emotion picker */}
      <div className="flex flex-wrap justify-center gap-2">
        {EMOTION_FACES.map((e, i) => {
          const w2 = WORD_MAP[e.id];
          return (
            <button
              key={e.id}
              onClick={() => (sfxTap(), setTi(i))}
              className={`soft-ring flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-lg font-extrabold transition ${
                i === ti ? "text-white" : "bg-paper text-inksoft hover:bg-sand"
              }`}
              style={i === ti ? { background: s.theme.color } : undefined}
            >
              <span className="text-2xl">{w2?.e}</span>
              {label(w2 ?? word, s.targetLang)}
            </button>
          );
        })}
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* the mirror */}
        <div className="relative overflow-hidden rounded-[2.4rem] p-6 tile-shadow" style={{ background: `linear-gradient(160deg,#ffffff,${s.theme.soft})` }}>
          <div className="flex items-start justify-center gap-6">
            <svg viewBox="0 0 200 200" className="w-[min(520px,72vw)]">
              {/* frame */}
              <ellipse cx="100" cy="102" rx="94" ry="94" fill="#fdf7ee" stroke={s.theme.color} strokeWidth="6" />
              {/* head */}
              <circle cx="100" cy="102" r="76" fill="#f7d9b8" stroke="#d9ab7e" strokeWidth="3" />
              {/* hair */}
              <path d="M28 92 Q34 34 100 30 Q166 34 172 92 Q160 62 100 58 Q40 62 28 92 Z" fill="#8a5a3b" />
              {/* blush */}
              {face.blush > 0.05 && (
                <>
                  <ellipse cx="58" cy="122" rx="15" ry="9" fill="#f2836b" opacity={face.blush * 0.5} />
                  <ellipse cx="142" cy="122" rx="15" ry="9" fill="#f2836b" opacity={face.blush * 0.5} />
                </>
              )}
              {/* brows */}
              {face.brows &&
                [-1, 1].map((sgn) => {
                  const cx = 100 + sgn * 30;
                  const innerUp = face.browAngle * sgn * -9;
                  const y = 74 + face.browY * 12 + innerUp * 0.4;
                  const x2 = cx + sgn * 20;
                  const y2 = y - innerUp * 0.9;
                  return <line key={sgn} x1={cx} y1={y} x2={x2} y2={y2} stroke="#5a3b26" strokeWidth="6" strokeLinecap="round" />;
                })}
              {/* eyes */}
              {[-1, 1].map((sgn) => {
                const cx = 100 + sgn * 30;
                const cy = 96;
                const r = 13 * face.eyeSize;
                const open = Math.max(0.08, face.eyeOpen);
                return (
                  <g key={sgn}>
                    <ellipse cx={cx} cy={cy} rx={r} ry={r * open} fill="#fffaf2" stroke="#5a3b26" strokeWidth="3" />
                    <circle cx={cx} cy={cy} r={Math.min(r, r * open) * 0.5} fill="#3a2a1d" />
                    <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.15} fill="#fff" />
                    {face.eyeOpen < 0.4 && (
                      <path d={`M${cx - r} ${cy} Q${cx} ${cy + 8} ${cx + r} ${cy}`} stroke="#5a3b26" strokeWidth="4" fill="none" strokeLinecap="round" />
                    )}
                  </g>
                );
              })}
              {/* tears */}
              {face.tears > 0.05 &&
                [-1, 1].map((sgn) => (
                  <motion.path
                    key={sgn}
                    d={`M${100 + sgn * 30} 110 q6 10 0 18 q-6 -8 0 -18`}
                    fill="#7fb2de"
                    opacity={face.tears}
                    animate={{ y: [0, 14] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                  />
                ))}
              {/* nose */}
              <path d="M100 108 q5 10 -3 12" stroke="#d9ab7e" strokeWidth="4" fill="none" strokeLinecap="round" />
              {/* mouth */}
              {(() => {
                const w = 26 * face.mouthW;
                const curve = face.mouthCurve * 22;
                const open = face.mouthOpen * 22;
                if (open > 3) {
                  return (
                    <g>
                      <path
                        d={`M${100 - w} 140 Q100 ${140 + curve + open} ${100 + w} 140 Q100 ${140 + curve - open * 0.2} ${100 - w} 140 Z`}
                        fill="#8a4a52"
                        stroke="#5a3b26"
                        strokeWidth="3"
                      />
                      {face.tongue && <path d={`M92 ${148} q8 14 16 0 z`} fill="#f2836b" />}
                    </g>
                  );
                }
                return (
                  <path
                    d={`M${100 - w} 142 Q100 ${142 + curve} ${100 + w} 142`}
                    fill="none"
                    stroke="#5a3b26"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                );
              })()}
              {/* zzz */}
              {face.zzz && (
                <g fill={s.theme.color} fontWeight="800" fontFamily="sans-serif">
                  <text x="152" y="60" fontSize="18">z</text>
                  <text x="164" y="44" fontSize="24">Z</text>
                  <text x="176" y="28" fontSize="30">Z</text>
                </g>
              )}
            </svg>

            {/* webcam mirror so the child can copy themselves */}
            <div className="hidden w-[168px] shrink-0 flex-col gap-2 xl:flex">
              <div className="text-center text-sm font-extrabold text-inksoft">{t("mirror.me", s.targetLang)}</div>
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.4rem] bg-ink">
                <video ref={attachVideo} playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
                {camState !== "on" && (
                  <button onClick={() => void startCam()} className="absolute inset-0 grid cursor-pointer place-items-center bg-ink/80 text-5xl">
                    📷
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* target bubble */}
          {mode === "target" && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-3 rounded-[1.6rem] bg-paper px-6 py-4 tile-shadow">
                {word && <ArtTile word={word} size={64} color={s.theme.color} />}
                <div>
                  <div className="font-display text-4xl font-extrabold" style={{ color: s.theme.color }}>
                    {label(word, s.targetLang)}
                  </div>
                  <div className="text-lg font-bold text-inksoft">…{target.when}</div>
                </div>
              </div>
              <BigButton size="md" variant="paper" onClick={() => setShowTarget((v) => !v)}>
                {showTarget ? "🙈" : "👀"} {showTarget ? "hide word" : "show word"}
              </BigButton>
            </div>
          )}
        </div>

        {/* sculpt controls */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
            <div className="mb-3 text-xl font-extrabold text-inksoft">{t("mirror.sculpt", s.targetLang)}</div>
            <div className="flex flex-col gap-3">
              <Slider label={t("mirror.mouth", s.targetLang)} icon="🙂" value={face.mouthCurve} min={-1} max={1} onChange={(v) => set({ mouthCurve: v })} accent={s.theme.color} />
              <Slider label="😮" icon="😮" value={face.mouthOpen} min={0} max={1} onChange={(v) => set({ mouthOpen: v, tongue: v > 0.7 })} accent={s.theme.color} />
              <Slider label={t("mirror.brows", s.targetLang)} icon="😤" value={face.browAngle} min={-1} max={1} onChange={(v) => set({ browAngle: v })} accent={s.theme.color} />
              <Slider label="↕️" icon="🤨" value={face.browY} min={-0.6} max={0.6} onChange={(v) => set({ browY: v })} accent={s.theme.color} />
              <Slider label={t("mirror.eyes", s.targetLang)} icon="👁️" value={face.eyeOpen} min={0.08} max={1} onChange={(v) => set({ eyeOpen: v })} accent={s.theme.color} />
              <Slider label="🔍" icon="😲" value={face.eyeSize} min={0.7} max={1.5} onChange={(v) => set({ eyeSize: v })} accent={s.theme.color} />
              <Slider label="💧" icon="😢" value={face.tears} min={0} max={1} onChange={(v) => set({ tears: v })} accent={s.theme.color} />
              <Slider label="😊" icon="🌸" value={face.blush} min={0} max={1} onChange={(v) => set({ blush: v })} accent={s.theme.color} />
              <Slider label="〰️" icon="📏" value={face.mouthW} min={0.5} max={1.5} onChange={(v) => set({ mouthW: v })} accent={s.theme.color} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {mode === "target" ? (
                <>
                  <BigButton size="md" variant="coral" onClick={check}>
                    {t("mirror.match", s.targetLang)}
                  </BigButton>
                  <BigButton size="md" variant="paper" onClick={loadTarget}>
                    👀 {t("ui.again", s.homeLang)}
                  </BigButton>
                </>
              ) : (
                <BigButton size="md" variant="berry" onClick={() => fb.star(word.id)}>
                  <IconStar size={20} /> {t("ui.isaid", s.homeLang)}
                </BigButton>
              )}
              <BigButton size="md" variant="sage" onClick={() => setTi((n) => (n + 1) % EMOTION_FACES.length)}>
                {t("ui.next", s.targetLang)} <IconArrowRight size={20} />
              </BigButton>
            </div>
            {matched && (
              <div className="mt-3 rounded-2xl bg-sagesoft px-4 py-3 font-display text-2xl font-extrabold text-sage">
                ⭐ {label(word, s.targetLang)}!
              </div>
            )}
          </div>

          <div className="rounded-[2rem] bg-paper p-5 tile-shadow">
            <div className="text-lg leading-snug font-semibold text-inksoft">
              <b className="text-ink">{t("ui.tutornote", s.homeLang)}:</b> make the face yourself first, then ask the child to copy it in
              the mirror. Then ask <b>{t("ccq.isHappy", s.targetLang)}</b> and <b>{t("ccq.whatIsThis", s.targetLang)}</b>. End with
              “When do you feel {label(word, s.targetLang)}?”
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <BigButton size="sm" variant="sky" onClick={() => void s.say(label(word, s.targetLang), s.targetLang)}>
                <IconMic size={18} /> {t("ui.listen", s.homeLang)}
              </BigButton>
              <BigButton
                size="sm"
                variant="sun"
                onClick={() => void s.say(`I am ${label(word, s.targetLang)}.`, s.targetLang)}
              >
                “I am {label(word, s.targetLang)}.”
              </BigButton>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ================================================================== 6 · ACTION-VERB CHARADES */

export function CharadeGame({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [ci, setCi] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [timer, setTimer] = useState(0);
  const [style, setStyle] = useState<"normal" | "slow" | "fast" | "whisper">("normal");
  const [tally, setTally] = useState(0);
  const { state: camState, attachVideo, start: startCam, stop: stopCam } = useCamera();
  const card = CHARADES[ci % CHARADES.length];
  const word = WORD_MAP[card.id];

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const roll = () => {
    setCi((n) => (n + 1 + Math.floor(Math.random() * 3)) % CHARADES.length);
    setFlipped(false);
    setTimer(20);
    sfxTap();
  };

  const say = () => {
    void speak(label(word ?? card, s.targetLang), { lang: s.targetLang, slow: style === "whisper" || s.slow, rate: style === "slow" ? 0.6 : undefined });
  };

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="font-display text-5xl font-extrabold text-ink">{t("charade.title", s.targetLang)}</div>
        <div className="flex items-center gap-2 rounded-full bg-paper px-5 py-2 tile-shadow">
          <IconStar size={24} className="text-sun" />
          <span className="font-display text-2xl font-extrabold">{tally}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {(
          [
            ["normal", "🙂", t("charade.doit", s.targetLang)],
            ["slow", "🐢", t("charade.slowmo", s.targetLang)],
            ["fast", "🐇", t("charade.fast", s.targetLang)],
            ["whisper", "🤫", t("charade.whisper", s.targetLang)],
          ] as const
        ).map(([k, ic, lbl]) => (
          <Chip key={k} active={style === k} color={s.theme.color} onClick={() => (sfxTap(), setStyle(k))}>
            {ic} {lbl}
          </Chip>
        ))}
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* charade card */}
        <div className="relative">
          <motion.div
            animate={{ rotate: [-1.2, 1.2, -1.2] }}
            transition={{ repeat: Infinity, duration: 5 }}
            className="overflow-hidden rounded-[2.4rem] bg-paper p-8 tile-shadow"
            style={{ borderTop: `14px solid ${s.theme.color}` }}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full px-4 py-1.5 text-lg font-extrabold text-white" style={{ background: s.theme.color }}>
                {t("charade.guess", s.targetLang)}
              </span>
              {timer > 0 && (
                <span className="font-display text-4xl font-extrabold" style={{ color: timer < 6 ? "#e86a8a" : s.theme.color }}>
                  ⏱ {timer}
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-col items-center gap-4">
              <motion.div animate={style === "fast" ? { scale: [1, 1.08, 1] } : {}} transition={{ repeat: Infinity, duration: 0.4 }}>
                <ArtTile word={word ?? card} size={s.bigView ? 260 : 210} color={s.theme.color} float />
              </motion.div>

              {flipped ? (
                <div className="text-center">
                  <div className="font-display text-7xl font-extrabold" style={{ color: s.theme.color }}>
                    {label(word ?? card, s.targetLang)}
                  </div>
                  {!s.mono && s.homeLang !== s.targetLang && (
                    <div className="mt-1 text-4xl font-bold text-inksoft">{label(word ?? card, s.homeLang)}</div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => (setFlipped(true), sfxTap(), say())}
                  className="soft-ring cursor-pointer rounded-[1.6rem] bg-cream px-10 py-5 font-display text-4xl font-extrabold text-inksoft"
                >
                  🙈 {t("charade.guess", s.targetLang)}
                </button>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="rounded-2xl bg-cream px-5 py-2 text-2xl font-extrabold text-ink">
                  🗣️ “{card.hint[s.targetLang]}”
                </span>
                <span className="rounded-2xl px-5 py-2 text-2xl font-extrabold text-white" style={{ background: s.theme.color }}>
                  🔊 {card.sound[s.targetLang]}
                </span>
                <span className="rounded-2xl bg-sunsoft px-5 py-2 text-2xl font-extrabold text-ink">📍 {card.place}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* controls */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
            <div className="flex flex-col gap-3">
              <BigButton variant="coral" size="xl" full onClick={roll}>
                🎲 {t("charade.roll", s.targetLang)}
              </BigButton>
              <BigButton variant="paper" full onClick={say}>
                <IconMic size={24} /> {t("ui.listen", s.homeLang)}
              </BigButton>
              <BigButton
                variant="sage"
                size="xl"
                full
                onClick={() => {
                  setTally((n) => n + 1);
                  fb.star(card.id);
                  sfxStar();
                  void s.say(t("charade.gotit", s.targetLang), s.targetLang);
                }}
              >
                ✅ {t("charade.gotit", s.targetLang)}
              </BigButton>
              <BigButton variant="sun" full onClick={() => fb.mark("wrong", card.id)}>
                {t("ui.oops", s.targetLang)}
              </BigButton>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] bg-ink">
            <div className="relative aspect-[4/3] w-full">
              <video ref={attachVideo} playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
              {camState !== "on" && (
                <button
                  onClick={() => void startCam()}
                  className="absolute inset-0 grid cursor-pointer place-items-center gap-2 bg-ink/85 text-cream"
                >
                  <span>
                    <span className="mb-2 block text-6xl">🎬</span>
                    <span className="font-display text-2xl font-extrabold">{t("charade.doit", s.targetLang)}</span>
                  </span>
                </button>
              )}
            </div>
            <div className="px-4 py-2 text-center text-base font-bold text-cream/80">
              {t("hunt.mirror", s.targetLang)} — the child watches themselves act it out
            </div>
          </div>

          <div className="rounded-[2rem] bg-paper p-5 tile-shadow">
            <div className="text-lg leading-snug font-semibold text-inksoft">
              <b className="text-ink">How to play:</b> don&apos;t show the card. You mime the action, the child shouts the verb in the
              target language. Then swap — the child mimes, you guess wrong on purpose so they have to correct you.
            </div>
          </div>
        </div>
      </div>

      {/* verb rail */}
      <div className="flex flex-wrap justify-center gap-2">
        {CHARADES.map((c, i) => {
          const w2 = WORD_MAP[c.id];
          return (
            <button
              key={c.id}
              onClick={() => (sfxTap(), setCi(i), setFlipped(false), setTimer(20))}
              className={`soft-ring flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-base font-extrabold transition ${
                i === ci ? "text-white" : "bg-paper text-inksoft hover:bg-sand"
              }`}
              style={i === ci ? { background: s.theme.color } : undefined}
            >
              <span className="text-xl">{w2?.e ?? c.art}</span>
              {w2 ? label(w2, s.targetLang) : c.id}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}
