"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WORD_MAP, label, sample, shuffle } from "@/lib/data";
import { t } from "@/lib/data/phrases";
import { CVC_WORDS, FRUIT_FOR, SOUND_MAP, TRACE_LOWER, TRACE_NUM, TRACE_UPPER, VOWELS, CONSONANTS, type TraceGlyph } from "@/lib/data/phonics";
import { MONSTERS } from "@/lib/data/playdata";
import type { Setup } from "@/lib/useSetup";
import { useFeedback } from "@/components/ui/Feedback";
import { ArtTile } from "@/components/ui/ArtTile";
import { BigButton, Chip } from "@/components/ui/Kit";
import { IconArrowRight, IconMic, IconPause, IconPlay, IconSpeaker, IconStar, IconTrash } from "@/components/ui/Icons";
import { sfxBeat, sfxDrop, sfxPick, sfxStar, sfxTap, sfxWin } from "@/lib/sfx";
import { useMic } from "@/lib/media";
import { speak } from "@/lib/speech";
import { useTutor } from "@/lib/store";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-6 px-4 py-5">{children}</div>;
}

/* ================================================================== 1 · SAND TRACING */

type GlyphSet = "upper" | "lower" | "num";

export function TraceGame({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [set, setSet] = useState<GlyphSet>("upper");
  const glyphs = set === "upper" ? TRACE_UPPER : set === "lower" ? TRACE_LOWER : TRACE_NUM;
  const order = useMemo(() => Object.keys(glyphs), [glyphs]);
  const [gi, setGi] = useState(0);
  const letter = order[gi % order.length];
  const glyph: TraceGlyph = glyphs[letter];

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pts, setPts] = useState<{ x: number; y: number }[]>([]);
  const [hits, setHits] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [pct, setPct] = useState(0);
  const sampling = useRef<{ x: number; y: number }[]>([]);
  const [strokes, setStrokes] = useState<{ x: number; y: number }[][]>([[]]);

  const sound = SOUND_MAP[letter];
  const example = sound ? WORD_MAP[sound.ex] : undefined;

  /** sample the guide path into evenly spaced points */
  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const total = el.getTotalLength();
    const n = Math.max(60, Math.round(total / 2.2));
    sampling.current = Array.from({ length: n }, (_, i) => {
      const p = el.getPointAtLength((i / (n - 1)) * total);
      return { x: p.x, y: p.y };
    });
  }, [letter, set, glyph]);

  const reset = useCallback(() => {
    setPts([]);
    setHits(new Set());
    setPct(0);
    setDone(false);
    setStrokes([[]]);
  }, []);

  useEffect(reset, [letter, reset]);

  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const onMove = (e: React.PointerEvent) => {
    if (done) return;
    const p = toSvg(e);
    if (!p) return;
    setStrokes((sk) => {
      const last = sk[sk.length - 1];
      const prev = last[last.length - 1];
      if (prev && Math.hypot(prev.x - p.x, prev.y - p.y) < 1.1) return sk;
      return [...sk.slice(0, -1), [...last, p]];
    });
    // mark nearby guide samples as covered
    setHits((h) => {
      const next = new Set(h);
      const R = 5.2;
      sampling.current.forEach((q, i) => {
        if (!next.has(i) && Math.hypot(q.x - p.x, q.y - p.y) < R) next.add(i);
      });
      const covered = next.size / Math.max(1, sampling.current.length);
      setPct(Math.round(covered * 100));
      return next;
    });
  };

  useEffect(() => {
    if (!done && pct >= 72 && sampling.current.length) {
      setDone(true);
      fb.star();
      sfxWin();
      const word = example ? label(example, s.targetLang) : letter;
      void s.say(`${letter}. ${letter}. ${word}!`, s.targetLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const saySound = () => {
    sfxTap();
    if (sound) void s.say(`${letter}. /${sound.sound}/. ${label(WORD_MAP[sound.ex] ?? example!, s.targetLang)}`, s.targetLang);
    else void s.say(letter, s.targetLang);
  };

  const setBtn = (k: GlyphSet, labelTxt: string) => (
    <Chip
      key={k}
      active={set === k}
      color={s.theme.color}
      onClick={() => {
        sfxTap();
        setSet(k);
        setGi(0);
      }}
    >
      {labelTxt}
    </Chip>
  );

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="font-display text-5xl font-extrabold text-ink">{t("trace.title", s.targetLang)}</div>
        <div className="flex items-center gap-2 rounded-full bg-paper px-5 py-2 tile-shadow">
          <span className="text-lg font-extrabold text-inksoft">{t("trace.coverage", s.targetLang)}</span>
          <span className="font-display text-3xl font-extrabold" style={{ color: done ? "#8fbe9b" : s.theme.color }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* letter rail */}
      <div className="scroll-thin flex max-w-full flex-wrap justify-center gap-1.5 overflow-y-auto px-2 py-2">
        {order.map((g, i) => (
          <button
            key={g}
            onClick={() => {
              sfxTap();
              setGi(i);
            }}
            className={`soft-ring grid h-12 w-12 cursor-pointer place-items-center rounded-2xl font-display text-2xl font-extrabold transition ${
              i === gi ? "text-white" : "bg-paper text-inksoft hover:bg-sand"
            }`}
            style={i === gi ? { background: s.theme.color } : undefined}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* sand tray */}
        <div className="relative overflow-hidden rounded-[2.4rem] p-3 tile-shadow" style={{ background: "linear-gradient(160deg,#e7d3b0,#dcc399 55%,#d2b78c)" }}>
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 22%, rgba(255,255,255,.5) 0 2px, transparent 3px), radial-gradient(circle at 62% 68%, rgba(255,255,255,.42) 0 2px, transparent 3px), radial-gradient(circle at 84% 30%, rgba(120,90,55,.22) 0 2px, transparent 3px)",
              backgroundSize: "34px 34px, 48px 48px, 26px 26px",
            }}
          />
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            className="relative aspect-square w-full touch-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onMove(e);
              sfxPick();
            }}
            onPointerMove={(e) => e.buttons > 0 && onMove(e)}
          >
            {/* rake marks */}
            <g opacity="0.25">
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={i} x1={0} y1={i * 11 + 5} x2={100} y2={i * 11 + 5} stroke="#8d6b45" strokeWidth="0.4" />
              ))}
            </g>
            {/* sand carved by the finger */}
            {strokes.map((line, li) =>
              line.length > 1 ? (
                <polyline
                  key={li}
                  points={line.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#8d6b45"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4.6"
                  opacity="0.55"
                />
              ) : null,
            )}
            {strokes.map((line, li) =>
              line.length > 1 ? (
                <polyline
                  key={`h${li}`}
                  points={line.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#fdf7ee"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3.4"
                />
              ) : null,
            )}

            {/* the guide glyph */}
            <path ref={pathRef} d={glyph.strokes.replace(/\|/g, " ")} fill="none" stroke="transparent" strokeWidth="0" />
            <path
              d={glyph.strokes.replace(/\|/g, " ")}
              fill="none"
              stroke="#8d6b45"
              strokeOpacity="0.5"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="0.2 3.4"
            />
            <path d={glyph.strokes.replace(/\|/g, " ")} fill="none" stroke="#fffaf2" strokeWidth="3" strokeLinecap="round" opacity="0.92" />

            {/* start marker */}
            {!done && (
              <g>
                <circle cx={glyph.start[0]} cy={glyph.start[1]} r="4.6" fill={s.theme.color} opacity="0.95">
                  <animate attributeName="r" values="4.2;5.4;4.2" dur="1.4s" repeatCount="indefinite" />
                </circle>
                <text x={glyph.start[0]} y={glyph.start[1] + 1.8} textAnchor="middle" fontSize="5.5" fill="#fff" fontWeight="800">
                  1
                </text>
              </g>
            )}
            {done && (
              <g>
                <circle cx="50" cy="50" r="26" fill="#8fbe9b" opacity="0.28" />
                <text x="50" y="58" textAnchor="middle" fontSize="26">⭐</text>
              </g>
            )}
          </svg>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-paper/90 px-4 py-1.5">
            <span className="text-base font-extrabold text-inksoft">{t("trace.start", s.targetLang)}</span>
          </div>
        </div>

        {/* tutor rail */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
            <div className="flex items-end gap-3">
              <span className="font-display text-8xl leading-none font-extrabold" style={{ color: s.theme.color }}>
                {letter}
              </span>
              {set === "upper" && (
                <span className="font-display text-5xl leading-none font-extrabold text-inksoft">{letter.toLowerCase()}</span>
              )}
            </div>
            {sound && (
              <>
                <div className="mt-3 rounded-2xl bg-cream px-4 py-3">
                  <div className="text-lg font-extrabold tracking-widest text-inksoft">/ {sound.sound} /</div>
                  <div className="text-xl font-bold text-ink">{sound.action}</div>
                </div>
                {example && (
                  <div className="mt-3 flex items-center gap-4 rounded-2xl p-3" style={{ background: s.theme.soft }}>
                    <ArtTile word={example} size={84} color={s.theme.color} />
                    <div>
                      <div className="font-display text-3xl font-extrabold" style={{ color: s.theme.color }}>
                        {label(example, s.targetLang)}
                      </div>
                      <div className="text-lg font-bold text-inksoft">
                        {t("letter.aIsFor", s.targetLang, { L: letter, w: label(example, s.targetLang) })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <BigButton size="md" variant="coral" onClick={saySound}>
                <IconSpeaker size={22} /> {t("trace.saySound", s.targetLang)}
              </BigButton>
              <BigButton size="md" variant="paper" onClick={reset}>
                <IconTrash size={20} /> {t("trace.smooth", s.targetLang)}
              </BigButton>
            </div>
          </div>

          <div className="rounded-[2rem] bg-paper p-5 tile-shadow">
            <div className="mb-3 flex flex-wrap gap-2">
              {setBtn("upper", t("trace.upper", s.targetLang))}
              {setBtn("lower", t("trace.lower", s.targetLang))}
              {setBtn("num", t("trace.numbers", s.targetLang))}
            </div>
            <div className="flex items-center gap-2">
              <BigButton size="md" variant="paper" onClick={() => setGi((g) => (g - 1 + order.length) % order.length)}>
                ←
              </BigButton>
              <BigButton size="md" variant="sage" full onClick={() => setGi((g) => (g + 1) % order.length)}>
                {t("trace.nextLetter", s.targetLang)} <IconArrowRight size={22} />
              </BigButton>
            </div>
            <div className="mt-4 rounded-2xl bg-cream px-4 py-3 text-lg leading-snug font-semibold text-inksoft">
              <b className="text-ink">{t("ui.tutornote", s.homeLang)}:</b> hold the child&apos;s finger and trace it once together, then let
              go. Say the sound every single time — not the letter name.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ================================================================== 2 · ECHO MONSTERS */

export function EchoGame({ s }: { s: Setup }) {
  const fb = useFeedback();
  const mic = useMic();
  const browserVoice = useTutor((st) => st.useLocalVoice);
  const [mi, setMi] = useState(0);
  const [target, setTarget] = useState(0);
  const [phase, setPhase] = useState<"idle" | "model" | "yourturn" | "echo">("idle");
  const monster = MONSTERS[mi];

  const vocab = useMemo(() => {
    const good = s.words.filter((w) => !w.letter && !w.shape);
    return good.length >= 4 ? good : s.words;
  }, [s.words]);

  const word = vocab[target % vocab.length];

  const [roundKey, setRoundKey] = useState("0-0");
  if (roundKey !== `${target}-${mi}`) {
    setRoundKey(`${target}-${mi}`);
    setPhase("idle");
  }

  const model = async () => {
    setPhase("model");
    await speak(label(word, s.targetLang), {
      lang: s.targetLang,
      slow: s.slow,
      // The browser engine takes a pitch MULTIPLIER, so use the monster's own
      // `pitch` (1.55 for the squeaky one, 0.68 for the rumbly one) rather than
      // the old Azure SSML offset (`ssml: "+25%"`), which a browser ignores.
      pitch: monster.pitch,
      local: browserVoice,
    });
    setPhase("yourturn");
  };

  const record = async () => {
    if (mic.state !== "on") {
      await mic.start();
      return;
    }
    mic.begin();
    sfxTap();
    window.setTimeout(() => {
      mic.end();
      setPhase("echo");
    }, 2200);
  };

  const playEcho = (rate: number) => {
    if (!mic.url) return;
    const a = new Audio(mic.url);
    a.playbackRate = rate;
    a.preservesPitch = false;
    void a.play();
    sfxBeat(0);
    fb.star(word.id);
  };

  const power = Math.min(1, mic.level * 1.6);

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="font-display text-5xl font-extrabold text-ink">{t("echo.title", s.targetLang)}</div>
      </div>

      {/* monster picker */}
      <div className="flex flex-wrap justify-center gap-2">
        {MONSTERS.map((m, i) => (
          <button
            key={m.id}
            onClick={() => {
              sfxTap();
              setMi(i);
            }}
            className={`soft-ring flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-lg font-extrabold transition ${
              i === mi ? "text-white" : "bg-paper text-inksoft hover:bg-sand"
            }`}
            style={i === mi ? { background: m.color } : undefined}
          >
            <span className="text-2xl">{m.horns ? "👾" : "Blob".length > 0 ? "🐙" : "🐙"}</span>
            {m.name[s.targetLang]}
          </button>
        ))}
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* monster stage */}
        <div className="flex flex-col items-center gap-4 rounded-[2.4rem] p-6 tile-shadow" style={{ background: monster.color }}>
          <svg viewBox="0 0 200 220" className="w-[280px]">
            {/* horns */}
            {monster.horns && (
              <g fill={monster.dark}>
                <path d="M62 52 L48 16 L82 40 Z" />
                <path d="M138 52 L152 16 L118 40 Z" />
              </g>
            )}
            {/* body */}
            <path
              d="M100 34 C142 34 166 70 166 118 C166 172 138 200 100 200 C62 200 34 172 34 118 C34 70 58 34 100 34 Z"
              fill={monster.color}
              stroke={monster.dark}
              strokeWidth="4"
            />
            {/* spots */}
            {monster.spots &&
              [
                [56, 150, 9],
                [148, 140, 7],
                [70, 62, 6],
                [132, 66, 5],
              ].map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} fill={monster.dark} opacity="0.5" />)}
            {/* eyes */}
            {Array.from({ length: monster.eyes }).map((_, i) => {
              const span = monster.eyes === 1 ? 0 : 46;
              const x = 100 - span / 2 + (monster.eyes === 1 ? 0 : (i * span) / (monster.eyes - 1));
              const y = monster.eyes === 1 ? 84 : 88 + (i % 2 === 0 ? -12 : 6);
              const r = monster.eyes === 1 ? 26 : 18 + (i % 2 === 0 ? 3 : 0);
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={r} fill="#fffaf2" stroke={monster.dark} strokeWidth="3" />
                  <circle cx={x} cy={y + power * 5} r={r * 0.45} fill="#35302a" />
                  <circle cx={x - r * 0.16} cy={y - r * 0.2} r={r * 0.14} fill="#fff" />
                </g>
              );
            })}
            {/* mouth reacts to the live mic level */}
            <path
              d={`M66 138 Q100 ${138 + power * 52} 134 138 Q100 ${160 + power * 34} 66 138 Z`}
              fill="#5b2f3a"
              stroke={monster.dark}
              strokeWidth="3"
            />
            {power > 0.35 && (
              <path d="M92 150 Q100 162 108 150 Z" fill="#f2836b" />
            )}
          </svg>

          {/* voice power meter */}
          <div className="w-full rounded-2xl bg-white/40 px-4 py-3">
            <div className="mb-1 text-base font-extrabold text-white/90">{t("echo.volume", s.targetLang)}</div>
            <div className="h-4 overflow-hidden rounded-full bg-white/50">
              <motion.div className="h-full rounded-full" style={{ background: monster.dark }} animate={{ width: `${power * 100}%` }} />
            </div>
            {power > 0.02 && power < 0.14 && (
              <div className="mt-1 text-base font-extrabold text-white">{t("echo.loud", s.targetLang)}</div>
            )}
          </div>

          <div className="text-center text-lg font-extrabold text-white">{monster.vibe[s.targetLang]}</div>
        </div>

        {/* prompt + controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 rounded-[2.2rem] bg-paper p-7 tile-shadow">
            <div className="text-2xl font-extrabold text-inksoft">
              {phase === "yourturn" ? t("echo.yourturn", s.targetLang) : t("echo.listen", s.targetLang)}
            </div>
            <ArtTile word={word} size={180} color={s.theme.color} float />
            <div className="font-display text-6xl font-extrabold" style={{ color: s.theme.color }}>
              {label(word, s.targetLang)}
            </div>
            {!s.mono && s.homeLang !== s.targetLang && (
              <div className="text-3xl font-bold text-inksoft">{label(word, s.homeLang)}</div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <BigButton variant="coral" onClick={() => void model()}>
                <IconSpeaker size={26} /> {t("ui.listen", s.targetLang)}
              </BigButton>
              <BigButton variant="sky" onClick={() => void speak(label(word, s.targetLang), { lang: s.targetLang, slow: true })}>
                🐢
              </BigButton>
            </div>
          </div>

          <div className="rounded-[2.2rem] bg-paper p-6 tile-shadow">
            {mic.state === "on" ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onPointerDown={() => void record()}
                    onPointerUp={() => mic.end()}
                    className={`soft-ring no-select flex cursor-pointer items-center gap-3 rounded-full border-b-[5px] px-7 py-4 font-display text-2xl font-extrabold text-white ${
                      mic.recording ? "animate-beat border-[#bb3f61] bg-berry" : "border-[#cd5473] bg-berry"
                    }`}
                  >
                    <IconMic size={28} /> {mic.recording ? t("echo.listening", s.targetLang) : t("echo.record", s.targetLang)}
                  </button>
                  <BigButton variant="paper" onClick={() => void mic.start()}>
                    🔄 {t("ui.again", s.homeLang)}
                  </BigButton>
                </div>

                <div className="mt-4 text-xl font-extrabold text-inksoft">{t("echo.playback", s.targetLang)}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ["echo.chipmunk", 1.7, "#f5c453"],
                    ["echo.robot", 1.25, "#7fb2de"],
                    [monster.name[s.targetLang], monster.pitch, monster.color],
                    ["echo.giant", 0.6, "#b394d6"],
                    ["echo.ghost", 0.82, "#8fbe9b"],
                  ].map(([name, rate, col]) => (
                    <button
                      key={String(name)}
                      disabled={!mic.url}
                      onClick={() => playEcho(Number(rate))}
                      className={`soft-ring flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-lg font-extrabold transition disabled:opacity-40 ${
                        mic.url ? "text-ink" : "bg-sand text-inksoft"
                      }`}
                      style={mic.url ? { background: String(col) } : undefined}
                    >
                      <IconPlay size={18} /> {String(name)}
                    </button>
                  ))}
                </div>

                {phase === "echo" && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-sagesoft px-5 py-3">
                    <span className="font-display text-3xl font-extrabold text-sage">{t("echo.perfect", s.targetLang)}</span>
                    <BigButton size="sm" variant="sage" onClick={() => fb.star(word.id)}>
                      <IconStar size={20} /> {t("ui.isaid", s.homeLang)}
                    </BigButton>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <div className="text-2xl font-extrabold text-ink">{t("echo.micNeeded", s.targetLang)}</div>
                <BigButton variant="berry" onClick={() => void mic.start()}>
                  <IconMic size={26} /> 🎙️ {t("ui.speak", s.targetLang)}
                </BigButton>
                {mic.state === "denied" && (
                  <div className="text-lg font-semibold text-inksoft">
                    Microphone blocked — you can still play: the monster says the word, the child repeats it out loud and you press the star.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BigButton variant="sage" onClick={() => setTarget((n) => n + 1)}>
              {t("ui.next", s.targetLang)} <IconArrowRight size={24} />
            </BigButton>
            <div className="flex items-center gap-2 rounded-full bg-paper px-5 py-2 text-xl font-extrabold tile-shadow">
              <IconPause size={20} className="opacity-0" />
              {target + 1} / {vocab.length}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ================================================================== 3 · VOWEL SMOOTHIE BLENDER */

export function SmoothieGame({ s }: { s: Setup }) {
  const fb = useFeedback();
  const [vowel, setVowel] = useState<string>("a");
  const family = useMemo(() => CVC_WORDS.filter((c) => c.v === vowel), [vowel]);
  const [idx, setIdx] = useState(0);
  const target = family[idx % Math.max(1, family.length)] ?? CVC_WORDS[0];

  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [blending, setBlending] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const jar = useRef<HTMLDivElement | null>(null);

  const letters = useMemo(() => {
    const needed = [target.c1, target.v, target.c2];
    const decoys = shuffle(
      [...CONSONANTS, ...VOWELS].filter((l) => !needed.includes(l)),
      s.seed + idx,
    ).slice(0, 6);
    return shuffle([...needed, ...decoys], s.seed + idx * 3);
  }, [target, idx, s.seed]);

  const [mixKey, setMixKey] = useState("a0");
  if (mixKey !== `${vowel}${idx}`) {
    setMixKey(`${vowel}${idx}`);
    setSlots([null, null, null]);
    setRevealed(false);
    setBlending(false);
  }

  const full = slots.every(Boolean) && slots.join("") === `${target.c1}${target.v}${target.c2}`;

  const drop = (l: string) => {
    const slotIdx = slots.findIndex((x) => x === null);
    if (slotIdx < 0) return;
    sfxDrop();
    const next = [...slots];
    next[slotIdx] = l;
    setSlots(next);
  };

  const blend = async () => {
    if (!full) {
      fb.mark("wrong");
      return;
    }
    setBlending(true);
    for (let i = 0; i < 10; i++) sfxBeat(i);
    // sound out each phoneme, then blend
    for (const l of [target.c1, target.v, target.c2]) {
      // eslint-disable-next-line no-await-in-loop
      await speak(l, { lang: "en", rate: 0.5, pitch: 1.08 });
    }
    setBlending(false);
    setRevealed(true);
    fb.star();
    // eslint-disable-next-line no-await-in-loop
    await speak(`${target.c1}${target.v}${target.c2}`, { lang: "en", rate: 0.55, pitch: 1.08 });
    // eslint-disable-next-line no-await-in-loop
    await speak(target.word, { lang: s.targetLang, slow: false });
  };

  const art = target ? WORD_MAP[target.artId] : undefined;

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="font-display text-5xl font-extrabold text-ink">{t("smoothie.title", s.targetLang)}</div>
        <div className="flex gap-1.5">
          {VOWELS.map((v) => (
            <button
              key={v}
              onClick={() => {
                sfxTap();
                setVowel(v);
                setIdx(0);
              }}
              className={`soft-ring grid h-14 w-14 cursor-pointer place-items-center rounded-2xl font-display text-3xl font-extrabold lowercase ${
                vowel === v ? "text-white" : "bg-paper text-inksoft"
              }`}
              style={vowel === v ? { background: s.theme.color } : undefined}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* blender */}
        <div className="flex flex-col items-center gap-5 rounded-[2.4rem] bg-paper p-7 tile-shadow">
          <div className="text-2xl font-extrabold text-inksoft">{t("smoothie.pick", s.targetLang)}</div>

          <div ref={jar} className="relative">
            <svg viewBox="0 0 200 260" className="w-[300px]">
              {/* jar */}
              <path d="M46 34 L54 210 Q56 232 78 236 L122 236 Q144 232 146 210 L154 34 Z" fill="#eaf3fb" stroke="#9db9cf" strokeWidth="4" />
              <path d="M40 20 L160 20 L156 44 L44 44 Z" fill="#d5e4f0" stroke="#9db9cf" strokeWidth="4" rx="8" />
              {/* liquid */}
              <clipPath id="jarclip">
                <path d="M50 42 L57 208 Q59 228 78 232 L122 232 Q141 228 143 208 L150 42 Z" />
              </clipPath>
              <g clipPath="url(#jarclip)">
                <motion.rect
                  x="46"
                  width="112"
                  fill={s.theme.color}
                  opacity="0.55"
                  animate={blending ? { y: [70, 40, 70] } : { y: slots.every(Boolean) ? 96 : 230 }}
                  transition={blending ? { repeat: Infinity, duration: 0.34 } : { duration: 0.5 }}
                  style={{ height: 220 }}
                />
                {/* fruit chunks spinning */}
                {blending &&
                  [0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.text
                      key={i}
                      x={64 + (i % 3) * 30}
                      fontSize="22"
                      animate={{
                        x: [60 + (i % 3) * 34, 130 - (i % 2) * 40, 60 + (i % 3) * 34],
                        y: [90 + (i % 3) * 30, 160 - (i % 2) * 40, 90 + (i % 3) * 30],
                        rotate: [0, 360],
                      }}
                      transition={{ repeat: Infinity, duration: 1.1 + i * 0.12 }}
                    >
                      {Object.values(FRUIT_FOR)[i % 5]}
                    </motion.text>
                  ))}
                {slots.filter(Boolean).map((l, i) => (
                  <text key={i} x={62 + i * 34} y={200} fontSize="30" fontWeight="800" fill="#35302a">
                    {l}
                  </text>
                ))}
              </g>
              {/* blade + base */}
              <rect x="72" y="236" width="56" height="16" rx="6" fill="#c3cdd6" />
              <path d="M62 252 L138 252 L132 232 L68 232 Z" fill={s.theme.color} />
            </svg>
            {blending && <div className="absolute inset-0 grid place-items-center text-6xl animate-wobble">🌀</div>}
          </div>

          {/* slots */}
          <div className="flex items-center gap-3">
            {slots.map((l, i) => (
              <div
                key={i}
                className={`grid h-24 w-20 place-items-center rounded-2xl border-4 font-display text-5xl font-extrabold ${
                  l ? "bg-cream text-ink" : "border-dashed border-sand bg-paper"
                }`}
                style={l ? { borderColor: s.theme.color, color: s.theme.color } : undefined}
              >
                {l ?? (i === 1 ? vowel.toUpperCase() : "•")}
              </div>
            ))}
            <div className="ml-2 font-display text-4xl font-extrabold text-inksoft">=</div>
            <AnimatePresence>
              {revealed && art && (
                <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                  <ArtTile word={art} size={96} color={s.theme.color} />
                  <span className="font-display text-3xl font-extrabold" style={{ color: s.theme.color }}>
                    {target.word}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <BigButton variant={full ? "sage" : "paper"} size="xl" onClick={() => void blend()}>
              🌀 {t("smoothie.blend", s.targetLang)}
            </BigButton>
            <BigButton
              variant="paper"
              onClick={() => {
                setSlots([null, null, null]);
                setRevealed(false);
              }}
            >
              <IconTrash size={22} /> {t("ui.clear", s.homeLang)}
            </BigButton>
          </div>
        </div>

        {/* letter fruit bowl */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
            <div className="mb-3 text-xl font-extrabold text-inksoft">{t("smoothie.sounds", s.targetLang)}</div>
            <div className="flex flex-wrap justify-center gap-2">
              {letters.map((l, i) => (
                <motion.button
                  key={l + i}
                  whileHover={{ y: -5, rotate: -3 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => drop(l)}
                  className="soft-ring flex h-[104px] w-[86px] cursor-pointer flex-col items-center justify-center rounded-[1.4rem] bg-cream text-4xl tile-shadow"
                >
                  <span className="text-3xl">{FRUIT_FOR[l] ?? "🍏"}</span>
                  <span className="font-display text-3xl font-extrabold" style={{ color: s.theme.color }}>
                    {l}
                  </span>
                </motion.button>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-cream px-4 py-3 text-lg leading-snug font-semibold text-inksoft">
              <b className="text-ink">{t("ui.tutornote", s.homeLang)}:</b> c…a…t — say each sound separately, then blend them fast.
              Clap once when the word appears.
            </div>
          </div>

          {art && (
            <div className="flex flex-col items-center gap-2 rounded-[2rem] p-6 tile-shadow" style={{ background: s.theme.soft }}>
              <div className="text-xl font-extrabold text-inksoft">{t("smoothie.recipe", s.targetLang)}</div>
              <ArtTile word={art} size={120} color={s.theme.color} float />
              <div className="font-display text-4xl font-extrabold" style={{ color: s.theme.color }}>
                {target.c1}–{target.v}–{target.c2}
              </div>
              <BigButton
                variant="sage"
                size="md"
                onClick={() => {
                  setIdx((n) => n + 1);
                }}
              >
                {t("smoothie.newWord", s.targetLang)} <IconArrowRight size={20} />
              </BigButton>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
