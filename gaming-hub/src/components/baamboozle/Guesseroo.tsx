import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "../../utils/cn";

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────
interface Question {
  id: string;
  prompt: string;
  answer: string;
  image: string;
  points: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  funFact: string;
}

interface Team {
  id: number;
  name: string;
  score: number;
  emoji: string;
  color: string;
  streak: number;
}

interface ScoreEvent {
  delta: number;
  message: string;
  emotion: string;
  sfx: "coin" | "buzz" | "fanfare" | "tick";
}

type GamePhase = "splash" | "setup" | "playing" | "result" | "summary";
type Theme = "light" | "dark";

// ─────────────────────────────────────────────
//  GAME DATA — rich question bank
// ─────────────────────────────────────────────
const QUESTION_BANK: Question[] = [
  {
    id: "q1",
    prompt: "Built in 1889, this iron lattice structure was initially criticised but became a global icon of romance and culture.",
    answer: "The Eiffel Tower",
    image: "https://images.pexels.com/photos/29667766/pexels-photo-29667766.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    points: 10,
    category: "Landmarks",
    difficulty: "easy",
    funFact: "The Eiffel Tower can be 15 cm taller during summer due to thermal expansion of the iron!"
  },
  {
    id: "q2",
    prompt: "This iconic suspension bridge spans the Golden Gate Strait at the entrance to San Francisco Bay.",
    answer: "The Golden Gate Bridge",
    image: "https://images.pexels.com/photos/12747677/pexels-photo-12747677.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    points: 10,
    category: "Landmarks",
    difficulty: "easy",
    funFact: "The Golden Gate Bridge required 83,000 tons of steel and took 4 years to build (1933–1937)."
  },
  {
    id: "q3",
    prompt: "These big cats are the only ones that live in groups called 'prides'. The males sport a magnificent mane.",
    answer: "Lions",
    image: "https://images.pexels.com/photos/26221308/pexels-photo-26221308.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    points: 10,
    category: "Wildlife",
    difficulty: "easy",
    funFact: "A lion's roar can be heard from up to 8 kilometres (5 miles) away!"
  },
  {
    id: "q4",
    prompt: "Japan's highest peak, this symmetrical stratovolcano is considered sacred and is a UNESCO World Heritage Site.",
    answer: "Mount Fuji",
    image: "https://images.pexels.com/photos/33341973/pexels-photo-33341973.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    points: 15,
    category: "Geography",
    difficulty: "medium",
    funFact: "Mount Fuji last erupted in 1707 and left ash deposits across Tokyo!"
  },
  {
    id: "q5",
    prompt: "Built around 70–80 AD, this ancient amphitheatre in Rome could seat up to 80,000 spectators.",
    answer: "The Colosseum",
    image: "https://images.pexels.com/photos/14836534/pexels-photo-14836534.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    points: 15,
    category: "History",
    difficulty: "medium",
    funFact: "The Colosseum had a retractable awning called the 'velarium' to shade spectators from the sun!"
  },
  {
    id: "q6",
    prompt: "This word-tile game has colourful letter blocks and the question word 'WHEN' — used in language learning worldwide.",
    answer: "Scrabble / Word Tiles",
    image: "https://images.pexels.com/photos/32392499/pexels-photo-32392499.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    points: 20,
    category: "Games",
    difficulty: "hard",
    funFact: "Scrabble is sold in 121 countries and available in 29 different languages!"
  },
];

const TEAM_CONFIGS = [
  { emoji: "🦊", color: "from-orange-400 to-amber-500", textColor: "text-orange-600", bgLight: "bg-orange-50", border: "border-orange-300" },
  { emoji: "🐬", color: "from-cyan-400 to-sky-500", textColor: "text-cyan-600", bgLight: "bg-cyan-50", border: "border-cyan-300" },
  { emoji: "🦄", color: "from-purple-400 to-fuchsia-500", textColor: "text-purple-600", bgLight: "bg-purple-50", border: "border-purple-300" },
  { emoji: "🐉", color: "from-emerald-400 to-teal-500", textColor: "text-emerald-600", bgLight: "bg-emerald-50", border: "border-emerald-300" },
];

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─────────────────────────────────────────────
//  AUDIO ENGINE  (Web Audio API – no external deps)
// ─────────────────────────────────────────────
class AudioEngine {
  private ctx: AudioContext | null = null;
  private bgGain: GainNode | null = null;
  private muted = false;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  playSfx(type: "coin" | "buzz" | "fanfare" | "tick" | "reveal" | "click") {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const g = ctx.createGain();
      g.connect(ctx.destination);

      const configs: Record<string, { freq: number[]; duration: number[]; wave: OscillatorType; vol: number }> = {
        coin: { freq: [523, 659, 784, 1047], duration: [0.08, 0.08, 0.08, 0.2], wave: "sine", vol: 0.4 },
        buzz: { freq: [200, 150, 120], duration: [0.1, 0.1, 0.2], wave: "sawtooth", vol: 0.3 },
        fanfare: { freq: [523, 659, 784, 1047, 1319], duration: [0.1, 0.1, 0.1, 0.15, 0.4], wave: "sine", vol: 0.5 },
        tick: { freq: [800], duration: [0.05], wave: "square", vol: 0.2 },
        reveal: { freq: [440, 550, 660], duration: [0.06, 0.06, 0.12], wave: "sine", vol: 0.35 },
        click: { freq: [1200], duration: [0.04], wave: "sine", vol: 0.15 },
      };

      const cfg = configs[type];
      let t = ctx.currentTime;
      cfg.freq.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = cfg.wave;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(cfg.vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + cfg.duration[i]);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + cfg.duration[i]);
        t += cfg.duration[i];
      });
    } catch (_) {}
  }

  startBgMusic() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      this.bgGain = ctx.createGain();
      this.bgGain.gain.value = 0.12;
      this.bgGain.connect(ctx.destination);
      this.scheduleBgLoop(ctx, this.bgGain);
    } catch (_) {}
  }

  private scheduleBgLoop(ctx: AudioContext, dest: GainNode) {
    const melody = [261, 293, 329, 349, 392, 440, 493, 523];
    const beatInterval = 0.35;
    let t = ctx.currentTime + 0.1;
    const playNote = () => {
      if (this.muted || !this.bgGain) return;
      melody.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq * (i % 2 === 0 ? 1 : 0.75);
        gain.gain.setValueAtTime(0.08, t + i * beatInterval);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * beatInterval + beatInterval * 0.9);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t + i * beatInterval);
        osc.stop(t + i * beatInterval + beatInterval);
      });
      t += melody.length * beatInterval;
      setTimeout(playNote, melody.length * beatInterval * 1000 - 200);
    };
    playNote();
  }

  stopBgMusic() {
    if (this.bgGain) {
      this.bgGain.gain.setValueAtTime(0, this.getCtx().currentTime);
      this.bgGain = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.stopBgMusic();
  }

  isMuted() { return this.muted; }
}

const audioEngine = new AudioEngine();

// ─────────────────────────────────────────────
//  PARTICLE SYSTEM
// ─────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  shape: "circle" | "star" | "rect";
}

function ParticleCanvas({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const counterRef = useRef(0);

  const spawnConfetti = useCallback(() => {
    const colors = ["#f59e0b", "#6366f1", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
    const newParticles: Particle[] = Array.from({ length: 60 }, () => ({
      id: counterRef.current++,
      x: Math.random() * window.innerWidth,
      y: -20,
      color: colors[randInt(0, colors.length - 1)],
      size: randInt(6, 14),
      vx: (Math.random() - 0.5) * 4,
      vy: randInt(2, 6),
      life: 1,
      maxLife: randInt(80, 140),
      shape: (["circle", "star", "rect"] as const)[randInt(0, 2)],
    }));
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);

  useEffect(() => {
    if (trigger > 0) spawnConfetti();
  }, [trigger, spawnConfetti]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.shape === "circle") {
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        } else if (p.shape === "rect") {
          ctx.rect(p.x - p.size / 2, p.y - p.size / 4, p.size, p.size / 2);
        } else {
          // star
          const s = p.size / 2;
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            i === 0 ? ctx.moveTo(p.x + s * Math.cos(angle), p.y + s * Math.sin(angle))
              : ctx.lineTo(p.x + s * Math.cos(angle), p.y + s * Math.sin(angle));
          }
        }
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 1;
      });
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{ mixBlendMode: "normal" }}
    />
  );
}

// ─────────────────────────────────────────────
//  FLOATING SCORE TOAST
// ─────────────────────────────────────────────
interface Toast {
  id: number;
  message: string;
  emotion: string;
  positive: boolean;
}

function ToastLayer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed top-24 right-6 z-40 flex flex-col gap-3">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white font-black text-lg",
            "animate-[slideInRight_0.4s_ease-out,fadeOut_0.5s_ease-in_1.5s_forwards]",
            t.positive
              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
              : "bg-gradient-to-r from-rose-500 to-red-600"
          )}
          style={{
            animation: "slideInToast 0.4s cubic-bezier(0.34,1.56,0.64,1) both, fadeOutToast 0.5s ease-in 1.8s forwards",
          }}
        >
          <span className="text-2xl">{t.emotion}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  TILE COMPONENT  (3D flip effect)
// ─────────────────────────────────────────────
function GameTile({
  index: _index,
  revealed,
  onClick,
  theme,
}: {
  index: number;
  revealed: boolean;
  onClick: () => void;
  theme: Theme;
}) {
  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ perspective: "600px" }}
      onClick={onClick}
    >
      <div
        className="relative w-full h-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face — hidden tile */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-xl border-2",
            "backface-hidden transition-all duration-300",
            theme === "dark"
              ? "bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 border-purple-600/50 shadow-lg shadow-purple-900/50"
              : "bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 border-purple-400/50 shadow-lg shadow-indigo-300/50"
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl sm:text-4xl font-black text-white/30 drop-shadow-lg select-none">?</div>
            <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Tap</div>
          </div>
          {/* Glossy sheen */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          <div className="absolute top-1 left-1 right-1 h-1/3 rounded-t-xl bg-white/5 pointer-events-none" />
        </div>

        {/* Back face — revealed (transparent) */}
        <div
          className="absolute inset-0 rounded-xl border-2 border-white/20"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "rgba(255,255,255,0.05)",
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SCORE BAR
// ─────────────────────────────────────────────
function ScoreBar({ teams, activeTeamId, theme }: { teams: Team[]; activeTeamId: number; theme: Theme }) {
  const maxScore = Math.max(...teams.map(t => t.score), 1);
  return (
    <div className={cn(
      "rounded-2xl p-4 border shadow-xl",
      theme === "dark"
        ? "bg-white/5 border-white/10 backdrop-blur-xl"
        : "bg-white/80 border-white/60 backdrop-blur-xl shadow-indigo-100"
    )}>
      <div className="space-y-3">
        {teams.map(cfg => {
          const teamCfg = TEAM_CONFIGS[cfg.id % TEAM_CONFIGS.length];
          const pct = Math.min(100, (cfg.score / maxScore) * 100);
          return (
            <div key={cfg.id} className={cn(
              "flex items-center gap-3 p-2 rounded-xl transition-all duration-300",
              activeTeamId === cfg.id && (theme === "dark" ? "bg-white/10" : "bg-indigo-50")
            )}>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black shadow-lg bg-gradient-to-br",
                teamCfg.color,
                activeTeamId === cfg.id && "ring-2 ring-white ring-offset-1"
              )}>
                {cfg.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className={cn(
                    "font-bold text-sm truncate",
                    theme === "dark" ? "text-white" : "text-slate-800"
                  )}>{cfg.name}</span>
                  <span className={cn(
                    "text-sm font-black ml-2",
                    theme === "dark" ? "text-amber-400" : "text-indigo-600"
                  )}>{cfg.score}</span>
                </div>
                <div className={cn(
                  "w-full h-2 rounded-full overflow-hidden",
                  theme === "dark" ? "bg-white/10" : "bg-slate-200"
                )}>
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", teamCfg.color)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {cfg.streak >= 2 && (
                  <div className="text-[10px] text-amber-400 font-bold mt-0.5">🔥 {cfg.streak}x Streak!</div>
                )}
              </div>
              {activeTeamId === cfg.id && (
                <div className="text-[10px] font-black text-white bg-indigo-500 px-2 py-1 rounded-lg animate-pulse">
                  NOW
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  PROGRESS DOTS
// ─────────────────────────────────────────────
function ProgressDots({ total, current, theme }: { total: number; current: number; theme: Theme }) {
  return (
    <div className="flex gap-2 items-center">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-500",
            i < current
              ? "w-3 h-3 bg-emerald-400 shadow-md shadow-emerald-400/50"
              : i === current
                ? "w-4 h-4 bg-amber-400 shadow-md shadow-amber-400/50 ring-2 ring-amber-400/40"
                : theme === "dark" ? "w-3 h-3 bg-white/20" : "w-3 h-3 bg-slate-300"
          )}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  CLUE PANEL
// ─────────────────────────────────────────────
function CluePanel({ clues, revealedCount, theme }: { clues: string[]; revealedCount: number; theme: Theme }) {
  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
    )}>
      <div className={cn(
        "px-4 py-2 text-xs font-black uppercase tracking-widest border-b",
        theme === "dark" ? "bg-white/5 text-white/50 border-white/10" : "bg-slate-100 text-slate-500 border-slate-200"
      )}>
        🔍 Clues Revealed
      </div>
      <div className="p-3 space-y-2">
        {clues.map((clue, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 p-2 rounded-xl transition-all duration-500",
              i < revealedCount
                ? theme === "dark"
                  ? "bg-amber-500/15 border border-amber-500/30"
                  : "bg-amber-50 border border-amber-200"
                : theme === "dark"
                  ? "bg-white/5 opacity-30"
                  : "bg-slate-100 opacity-40"
            )}
          >
            <span className={cn(
              "text-xs font-black w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full",
              i < revealedCount
                ? "bg-amber-400 text-black"
                : theme === "dark" ? "bg-white/20 text-white/40" : "bg-slate-300 text-slate-500"
            )}>
              {i + 1}
            </span>
            <span className={cn(
              "text-xs leading-relaxed",
              i < revealedCount
                ? theme === "dark" ? "text-amber-100" : "text-amber-900"
                : theme === "dark" ? "text-white/30" : "text-slate-400"
            )}>
              {i < revealedCount ? clue : "???"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  ANSWER REVEAL OVERLAY
// ─────────────────────────────────────────────
function AnswerRevealOverlay({ answer, funFact, onClose, theme }: {
  answer: string;
  funFact: string;
  onClose: () => void;
  theme: Theme;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className={cn(
          "max-w-md w-full rounded-3xl p-8 shadow-2xl border text-center",
          "animate-[scaleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]",
          theme === "dark"
            ? "bg-gradient-to-b from-slate-800 to-slate-900 border-white/20"
            : "bg-white border-slate-200"
        )}
        style={{ animation: "scaleInPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-5xl mb-4">🎯</div>
        <div className={cn("text-xs uppercase tracking-widest font-black mb-2",
          theme === "dark" ? "text-amber-400" : "text-amber-600")}>The Answer Was</div>
        <h2 className={cn("text-3xl font-black mb-4",
          theme === "dark" ? "text-white" : "text-slate-900")}>{answer}</h2>
        <div className={cn(
          "rounded-2xl p-4 mb-6 text-left border",
          theme === "dark" ? "bg-blue-900/30 border-blue-500/30" : "bg-blue-50 border-blue-200"
        )}>
          <div className="text-xl mb-1">💡</div>
          <div className={cn("text-sm leading-relaxed",
            theme === "dark" ? "text-blue-200" : "text-blue-800")}>{funFact}</div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-105 active:scale-95"
        >
          Next Question →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SPLASH SCREEN
// ─────────────────────────────────────────────
function SplashScreen({ onStart, theme, onToggleTheme }: {
  onStart: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
      {/* Background — a CSS gradient, not an image. This used to point at
          /images/hero-bg.jpg, a file that exists nowhere in the repo or on the
          host, so the layer rendered as a broken-image 404. */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(160deg, #1e293b 0%, #4c1d95 45%, #831843 100%)" }}
      />
      <div className={cn(
        "absolute inset-0",
        theme === "dark"
          ? "bg-gradient-to-b from-black/70 via-purple-950/60 to-black/80"
          : "bg-gradient-to-b from-indigo-900/60 via-purple-900/50 to-indigo-950/70"
      )} />

      {/* Floating orbs */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{
            width: `${randInt(150, 350)}px`,
            height: `${randInt(150, 350)}px`,
            left: `${i * 18}%`,
            top: `${randInt(5, 80)}%`,
            background: ["#6366f1", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b", "#10b981"][i],
            animation: `floatOrb ${3 + i}s ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-2xl hover:bg-white/20 transition-all hover:scale-110"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      {/* Logo */}
      <div
        className="relative z-10 text-center px-6"
        style={{ animation: "fadeInUp 0.8s ease-out both" }}
      >
        {/* Game badge */}
        <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/40 backdrop-blur-xl rounded-full px-4 py-2 text-amber-300 text-sm font-bold mb-8">
          <span className="text-lg animate-spin" style={{ animationDuration: "3s" }}>⭐</span>
          Premium Educational Experience
          <span className="text-lg animate-spin" style={{ animationDuration: "3s", animationDirection: "reverse" }}>⭐</span>
        </div>

        {/* Title */}
        <h1
          className="text-7xl sm:text-8xl font-black text-white mb-3 leading-none"
          style={{
            textShadow: "0 0 60px rgba(139,92,246,0.8), 0 4px 30px rgba(0,0,0,0.5)",
            letterSpacing: "-0.02em",
          }}
        >
          Guess
          <span style={{
            background: "linear-gradient(135deg, #f59e0b, #ec4899, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>eroo</span>
        </h1>
        <div className="text-xl text-white/70 font-medium mb-2 tracking-wide">
          The Premium Picture-Reveal Quiz Game
        </div>
        <div className="text-white/40 text-sm mb-12">
          Reveal tiles · Collect clues · Beat your rivals
        </div>

        {/* CTA Button */}
        <button
          onMouseEnter={() => { setHover(true); audioEngine.playSfx("click"); }}
          onMouseLeave={() => setHover(false)}
          onClick={() => { audioEngine.playSfx("fanfare"); audioEngine.startBgMusic(); onStart(); }}
          className={cn(
            "relative group px-12 py-5 rounded-3xl text-black font-black text-2xl shadow-2xl",
            "transition-all duration-300 overflow-hidden",
            hover ? "scale-105 shadow-amber-500/60" : "scale-100 shadow-amber-500/30",
            "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500"
          )}
          style={{ boxShadow: hover ? "0 0 60px rgba(251,191,36,0.6), 0 20px 40px rgba(0,0,0,0.3)" : "0 0 30px rgba(251,191,36,0.3), 0 10px 30px rgba(0,0,0,0.2)" }}
        >
          <span className="relative z-10 flex items-center gap-3">
            🎮 Start Playing
          </span>
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-3 justify-center mt-10">
          {["🖼️ Real Photos", "🎵 Live Music", "✨ 3D Tiles", "🏆 Multi-Team", "🔥 Streak Bonuses", "💡 Fun Facts"].map(f => (
            <div key={f} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 text-white/80 text-sm font-medium">
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 80L48 69.3C96 58.7 192 37.3 288 32C384 26.7 480 37.3 576 48C672 58.7 768 69.3 864 69.3C960 69.3 1056 58.7 1152 48C1248 37.3 1344 26.7 1392 21.3L1440 16V80H0Z"
            fill={theme === "dark" ? "rgba(15,10,40,0.8)" : "rgba(238,242,255,0.8)"}
          />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SETUP SCREEN
// ─────────────────────────────────────────────
function SetupScreen({ onBegin, theme }: {
  onBegin: (teams: Team[]) => void;
  theme: Theme;
}) {
  const [teamCount, setTeamCount] = useState(2);
  const [names, setNames] = useState(["Team Fox", "Team Dolphin", "Team Unicorn", "Team Dragon"]);

  const handleBegin = () => {
    const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
      id: i,
      name: names[i] || `Team ${i + 1}`,
      score: 0,
      emoji: TEAM_CONFIGS[i].emoji,
      color: TEAM_CONFIGS[i].color,
      streak: 0,
    }));
    audioEngine.playSfx("coin");
    onBegin(teams);
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-6",
      theme === "dark"
        ? "bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950"
        : "bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-50"
    )}>
      <div className={cn(
        "w-full max-w-md rounded-3xl p-8 border shadow-2xl",
        theme === "dark"
          ? "bg-white/5 border-white/10 backdrop-blur-xl"
          : "bg-white border-slate-200 shadow-indigo-100"
      )}>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏟️</div>
          <h2 className={cn("text-3xl font-black mb-1", theme === "dark" ? "text-white" : "text-slate-900")}>
            Game Setup
          </h2>
          <p className={cn("text-sm", theme === "dark" ? "text-white/50" : "text-slate-500")}>
            Configure your teams before the game begins
          </p>
        </div>

        {/* Team count selector */}
        <div className="mb-6">
          <label className={cn("block text-xs font-black uppercase tracking-widest mb-3",
            theme === "dark" ? "text-white/50" : "text-slate-500")}>
            Number of Teams
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => { setTeamCount(n); audioEngine.playSfx("click"); }}
                className={cn(
                  "py-3 rounded-2xl font-black text-lg transition-all duration-200",
                  teamCount === n
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                    : theme === "dark"
                      ? "bg-white/10 text-white/60 hover:bg-white/20"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Team name inputs */}
        <div className="space-y-3 mb-8">
          {Array.from({ length: teamCount }, (_, i) => {
            const cfg = TEAM_CONFIGS[i];
            return (
              <div key={i} className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black bg-gradient-to-br shadow-lg flex-shrink-0",
                  cfg.color
                )}>
                  {cfg.emoji}
                </div>
                <input
                  value={names[i]}
                  onChange={e => {
                    const n = [...names];
                    n[i] = e.target.value;
                    setNames(n);
                  }}
                  className={cn(
                    "flex-1 bg-transparent font-bold text-sm outline-none",
                    theme === "dark" ? "text-white placeholder:text-white/30" : "text-slate-800 placeholder:text-slate-400"
                  )}
                  placeholder={`Team ${i + 1} name...`}
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={handleBegin}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          🚀 Launch Game!
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  MAIN GAME ARENA
// ─────────────────────────────────────────────
const TILES = 9;
const CLUES_PER_QUESTION = 3;

function GameArena({
  teams,
  onTeamsUpdate,
  onFinish,
  theme,
  onToggleTheme,
  qBank,
}: {
  teams: Team[];
  onTeamsUpdate: (teams: Team[]) => void;
  onFinish: (teams: Team[]) => void;
  theme: Theme;
  onToggleTheme: () => void;
  qBank: Question[];
}) {
  const [revealed, setRevealed] = useState<number[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [pendingNextQ, setPendingNextQ] = useState(false);
  const [cluesRevealed, setCluesRevealed] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerActive, setTimerActive] = useState(true);
  const [timeBonus, setTimeBonus] = useState(0);
  const [isRevealing, setIsRevealing] = useState<number | null>(null);
  const toastCounter = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const question = qBank[qIndex % qBank.length];
  const maxPoints = question.points + 20;
  const decayedPoints = Math.max(5, maxPoints - revealed.length * 4 - cluesRevealed * 2);
  const activeTeam = teams[activeTeamIndex];

  // Clues for the question
  const clues = [
    question.prompt,
    `Category: ${question.category} | Difficulty: ${question.difficulty.toUpperCase()}`,
    `The answer has ${question.answer.length} characters`,
  ];

  // Timer
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          handleTimeUp();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [timerActive, qIndex]);

  const handleTimeUp = () => {
    addToast({ id: toastCounter.current++, message: "Time's up! ⏰", emotion: "😱", positive: false });
    audioEngine.playSfx("buzz");
    setTimeout(() => moveToNext(), 1200);
  };

  const addToast = (toast: Toast) => {
    setToasts(prev => [...prev, toast]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 2500);
  };

  const onScore = (event: ScoreEvent) => {
    const updatedTeams = teams.map(t => {
      if (t.id !== activeTeam.id) return t;
      const newStreak = event.delta > 0 ? t.streak + 1 : 0;
      const streakBonus = newStreak >= 2 ? newStreak * 5 : 0;
      const totalDelta = event.delta + streakBonus + timeBonus;
      return {
        ...t,
        score: Math.max(0, t.score + totalDelta),
        streak: newStreak,
      };
    });
    onTeamsUpdate(updatedTeams);

    audioEngine.playSfx(event.sfx);
    if (event.delta > 0) setConfettiTrigger(t => t + 1);

    addToast({
      id: toastCounter.current++,
      message: event.message,
      emotion: event.emotion,
      positive: event.delta > 0,
    });
  };

  const revealTile = (index: number) => {
    if (revealed.includes(index) || isRevealing !== null) return;
    setIsRevealing(index);
    audioEngine.playSfx("reveal");
    setTimeout(() => {
      setRevealed(prev => [...prev, index]);
      setIsRevealing(null);
    }, 300);
  };

  const revealRandomTile = () => {
    const remaining = Array.from({ length: TILES }, (_, i) => i).filter(i => !revealed.includes(i));
    if (remaining.length === 0) return;
    const idx = remaining[randInt(0, remaining.length - 1)];
    revealTile(idx);
  };

  const revealNextClue = () => {
    if (cluesRevealed >= CLUES_PER_QUESTION) return;
    audioEngine.playSfx("tick");
    setCluesRevealed(c => c + 1);
  };

  const handleCorrect = () => {
    const tb = Math.floor(timerSeconds / 5);
    setTimeBonus(tb);
    clearInterval(timerRef.current!);
    setTimerActive(false);
    onScore({
      delta: decayedPoints,
      message: `Correct! +${decayedPoints + tb} pts${tb > 0 ? ` (+${tb} time bonus!)` : ""}`,
      emotion: "🎉",
      sfx: "coin",
    });
    setConfettiTrigger(t => t + 1);
    setShowAnswer(true);
    setPendingNextQ(true);
  };

  const handleWrong = () => {
    clearInterval(timerRef.current!);
    setTimerActive(false);
    onScore({ delta: 0, message: "Wrong guess… 😬", emotion: "😿", sfx: "buzz" });
    setShowAnswer(true);
    setPendingNextQ(true);
  };

  const moveToNext = () => {
    setShowAnswer(false);
    setPendingNextQ(false);
    setRevealed([]);
    setCluesRevealed(0);
    setTimerSeconds(60);
    setTimeBonus(0);

    if (qIndex + 1 >= qBank.length) {
      onFinish(teams);
      return;
    }

    setQIndex(q => q + 1);
    setActiveTeamIndex(i => (i + 1) % teams.length);
    setTimerActive(true);
  };

  const timerPct = (timerSeconds / 60) * 100;
  const timerColor = timerSeconds > 30 ? "#10b981" : timerSeconds > 15 ? "#f59e0b" : "#ef4444";
  const revealedCount = revealed.length;

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      theme === "dark"
        ? "bg-gradient-to-br from-slate-950 via-purple-950/30 to-indigo-950"
        : "bg-gradient-to-br from-indigo-50 via-purple-50/50 to-slate-100"
    )}>
      {/* Global style for animations */}
      <style>{`
        @keyframes slideInToast {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOutToast {
          from { opacity: 1; }
          to { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes scaleInPop {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatOrb {
          from { transform: translateY(0) scale(1); }
          to { transform: translateY(-30px) scale(1.1); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.4); }
          50% { box-shadow: 0 0 40px rgba(139,92,246,0.8), 0 0 80px rgba(236,72,153,0.3); }
        }
        @keyframes tileReveal {
          from { transform: rotateY(0deg) scale(1.05); }
          to { transform: rotateY(180deg) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>

      <ParticleCanvas trigger={confettiTrigger} />
      <ToastLayer toasts={toasts} />
      {showAnswer && (
        <AnswerRevealOverlay
          answer={question.answer}
          funFact={question.funFact}
          onClose={moveToNext}
          theme={theme}
        />
      )}

      {/* Top Bar */}
      <div className={cn(
        "sticky top-0 z-20 border-b backdrop-blur-xl",
        theme === "dark"
          ? "bg-slate-950/80 border-white/10"
          : "bg-white/80 border-slate-200"
      )}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg font-black">G</div>
            <span className={cn("font-black text-lg hidden sm:block",
              theme === "dark" ? "text-white" : "text-slate-900")}>
              Guesseroo
            </span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <ProgressDots total={qBank.length} current={qIndex} theme={theme} />
            <span className={cn("text-xs font-bold", theme === "dark" ? "text-white/40" : "text-slate-400")}>
              {qIndex + 1}/{qBank.length}
            </span>
          </div>

          {/* Timer + Controls */}
          <div className="flex items-center gap-3">
            {/* Timer */}
            <div
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-2xl border font-black text-sm transition-all",
                theme === "dark" ? "bg-white/10 border-white/20" : "bg-white border-slate-200",
                timerSeconds <= 10 && "animate-[timerPulse_0.5s_ease-in-out_infinite]"
              )}
              style={{
                color: timerColor,
                boxShadow: timerSeconds <= 10 ? `0 0 20px ${timerColor}60` : undefined
              }}
            >
              ⏱ {String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:{String(timerSeconds % 60).padStart(2, "0")}
              {/* Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full overflow-hidden bg-black/20">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${timerPct}%`, background: timerColor }}
                />
              </div>
            </div>

            {/* Points preview */}
            <div className={cn(
              "px-3 py-2 rounded-2xl border text-xs font-black",
              theme === "dark" ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"
            )}>
              Worth: {decayedPoints} pts
            </div>

            {/* Mute */}
            <button
              onClick={() => {
                const m = !audioEngine.isMuted();
                audioEngine.setMuted(m);
                if (!m) audioEngine.startBgMusic();
              }}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-110",
                theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"
              )}
            >
              🎵
            </button>

            {/* Theme */}
            <button
              onClick={onToggleTheme}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-110",
                theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"
              )}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Category badge */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border",
              theme === "dark"
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                : "bg-indigo-50 border-indigo-200 text-indigo-700"
            )}>
              <span>📂</span> {question.category}
            </div>
            <div className={cn(
              "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border",
              question.difficulty === "easy"
                ? theme === "dark" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                : question.difficulty === "medium"
                  ? theme === "dark" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"
                  : theme === "dark" ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700"
            )}>
              {question.difficulty === "easy" ? "🟢" : question.difficulty === "medium" ? "🟡" : "🔴"} {question.difficulty}
            </div>
            <div className={cn(
              "ml-auto text-xs font-bold",
              theme === "dark" ? "text-white/40" : "text-slate-400"
            )}>
              {revealedCount}/{TILES} tiles revealed
            </div>
          </div>

          {/* IMAGE GRID — main puzzle */}
          <div
            className={cn(
              "relative rounded-3xl overflow-hidden shadow-2xl border",
              theme === "dark" ? "border-white/10" : "border-slate-200",
            )}
            style={{
              aspectRatio: "16/9",
              boxShadow: theme === "dark"
                ? "0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px rgba(0,0,0,0.5), 0 0 80px rgba(139,92,246,0.15)"
                : "0 25px 50px rgba(99,102,241,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
            }}
          >
            {/* Real photo */}
            <img
              src={question.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Tile overlay grid */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-1">
              {Array.from({ length: TILES }, (_, i) => (
                <GameTile
                  key={i}
                  index={i}
                  revealed={revealed.includes(i)}
                  onClick={() => !revealed.includes(i) && revealTile(i)}
                  theme={theme}
                />
              ))}
            </div>

            {/* Blur overlay that fades as tiles are revealed */}
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-700"
              style={{
                backdropFilter: `blur(${Math.max(0, 12 - (revealedCount / TILES) * 14)}px)`,
                background: `rgba(0,0,0,${Math.max(0, 0.1 - (revealedCount / TILES) * 0.1)})`,
              }}
            />

            {/* Tiles revealed counter badge */}
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xl rounded-2xl px-3 py-1.5 text-white text-xs font-black border border-white/20">
              {TILES - revealedCount} hidden
            </div>

            {/* Active team badge */}
            <div className={cn(
              "absolute bottom-3 left-3 flex items-center gap-2 rounded-2xl px-3 py-2 backdrop-blur-xl border border-white/20",
              "bg-black/50 text-white text-sm font-black"
            )}>
              <span className="text-xl">{activeTeam.emoji}</span>
              {activeTeam.name}'s Turn
            </div>
          </div>

          {/* Clue panel */}
          <CluePanel clues={clues} revealedCount={cluesRevealed} theme={theme} />
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Score board */}
          <ScoreBar teams={teams} activeTeamId={activeTeam.id} theme={theme} />

          {/* Action buttons */}
          <div className={cn(
            "rounded-2xl border p-4 space-y-3",
            theme === "dark" ? "bg-white/5 border-white/10 backdrop-blur-xl" : "bg-white border-slate-200 shadow-sm"
          )}>
            <div className={cn("text-xs font-black uppercase tracking-widest mb-3",
              theme === "dark" ? "text-white/40" : "text-slate-400")}>
              🎮 Game Controls
            </div>

            {/* Reveal a tile */}
            <button
              onClick={() => { revealRandomTile(); }}
              disabled={revealedCount >= TILES}
              className={cn(
                "w-full px-4 py-4 rounded-2xl font-black text-base transition-all duration-200",
                "flex items-center gap-3 justify-center",
                "hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
                "bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/30"
              )}
              style={{ boxShadow: revealedCount < TILES ? "0 8px 20px rgba(251,191,36,0.35)" : undefined }}
            >
              <span className="text-xl">🔲</span>
              <div className="text-left">
                <div>Reveal Random Tile</div>
                <div className="text-xs opacity-70 font-bold">−{Math.min(4, 4)} pts per tile</div>
              </div>
            </button>

            {/* Reveal clue */}
            <button
              onClick={revealNextClue}
              disabled={cluesRevealed >= CLUES_PER_QUESTION}
              className={cn(
                "w-full px-4 py-4 rounded-2xl font-black text-base transition-all duration-200",
                "flex items-center gap-3 justify-center",
                "hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
                theme === "dark"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30"
                  : "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30"
              )}
            >
              <span className="text-xl">💡</span>
              <div className="text-left">
                <div>Reveal Clue {cluesRevealed + 1}/{CLUES_PER_QUESTION}</div>
                <div className="text-xs opacity-70 font-bold">−2 pts per clue</div>
              </div>
            </button>

            <div className={cn("border-t pt-3", theme === "dark" ? "border-white/10" : "border-slate-100")} />

            {/* Correct */}
            <button
              onClick={handleCorrect}
              disabled={pendingNextQ}
              className={cn(
                "w-full px-4 py-4 rounded-2xl font-black text-base transition-all duration-200",
                "flex items-center gap-3 justify-center",
                "hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
                "bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-lg shadow-emerald-500/30"
              )}
            >
              <span className="text-xl">✅</span>
              <div className="text-left">
                <div>Correct Guess!</div>
                <div className="text-xs opacity-70 font-bold">+{decayedPoints} pts (+ time bonus)</div>
              </div>
            </button>

            {/* Wrong */}
            <button
              onClick={handleWrong}
              disabled={pendingNextQ}
              className={cn(
                "w-full px-4 py-4 rounded-2xl font-black text-base transition-all duration-200",
                "flex items-center gap-3 justify-center",
                "hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
                "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30"
              )}
            >
              <span className="text-xl">❌</span>
              <div className="text-left">
                <div>Wrong Guess</div>
                <div className="text-xs opacity-70 font-bold">No points • Next team</div>
              </div>
            </button>
          </div>

          {/* Tips card */}
          <div className={cn(
            "rounded-2xl border p-4",
            theme === "dark" ? "bg-white/5 border-white/10" : "bg-indigo-50 border-indigo-100"
          )}>
            <div className={cn("text-xs font-black uppercase tracking-widest mb-2",
              theme === "dark" ? "text-white/30" : "text-indigo-400")}>
              💡 Strategy Tip
            </div>
            <p className={cn("text-xs leading-relaxed",
              theme === "dark" ? "text-white/50" : "text-indigo-700")}>
              The fewer tiles you reveal, the more points you earn! Use clues wisely — each clue costs 2 pts but a wrong guess loses your turn. Time bonuses add extra points for fast answers!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SUMMARY SCREEN
// ─────────────────────────────────────────────
function SummaryScreen({ teams, theme, onPlayAgain }: {
  teams: Team[];
  theme: Theme;
  onPlayAgain: () => void;
}) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  useEffect(() => {
    audioEngine.playSfx("fanfare");
    const t = setTimeout(() => audioEngine.playSfx("fanfare"), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden",
      theme === "dark"
        ? "bg-gradient-to-b from-slate-950 via-purple-950 to-indigo-950"
        : "bg-gradient-to-b from-indigo-50 via-purple-50 to-white"
    )}>
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(251,191,36,0.4) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Trophy */}
        <div className="relative inline-block mb-4">
          {/* Trophy — an emoji, not /images/trophy-3d.png (which is missing everywhere). */}
          <div
            role="img"
            aria-label="Trophy"
            className="w-32 h-32 mx-auto flex items-center justify-center text-7xl select-none drop-shadow-2xl"
            style={{ filter: "drop-shadow(0 0 30px rgba(251,191,36,0.6))" }}
          >
            🏆
          </div>
        </div>

        <h1 className={cn(
          "text-5xl font-black mb-2",
          theme === "dark" ? "text-white" : "text-slate-900"
        )}>
          Game Over!
        </h1>
        <p className={cn(
          "text-lg mb-8",
          theme === "dark" ? "text-white/60" : "text-slate-500"
        )}>
          <span className="text-2xl">{winner.emoji}</span>{" "}
          <span className="font-bold">{winner.name}</span> wins with{" "}
          <span className={cn("font-black", theme === "dark" ? "text-amber-400" : "text-amber-600")}>
            {winner.score} points!
          </span>
        </p>

        {/* Leaderboard */}
        <div className={cn(
          "rounded-3xl border p-6 mb-8 space-y-3",
          theme === "dark" ? "bg-white/5 border-white/10 backdrop-blur-xl" : "bg-white border-slate-200 shadow-lg"
        )}>
          <div className={cn("text-xs font-black uppercase tracking-widest mb-4",
            theme === "dark" ? "text-white/40" : "text-slate-400")}>
            🏆 Final Standings
          </div>
          {sorted.map((t, i) => {
            const cfg = TEAM_CONFIGS[t.id % TEAM_CONFIGS.length];
            const medals = ["🥇", "🥈", "🥉", "🏅"];
            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-2xl border transition-all",
                  i === 0
                    ? theme === "dark"
                      ? "bg-amber-500/20 border-amber-500/40"
                      : "bg-amber-50 border-amber-200"
                    : theme === "dark"
                      ? "bg-white/5 border-white/10"
                      : "bg-slate-50 border-slate-200"
                )}
              >
                <span className="text-2xl">{medals[i] || "🏅"}</span>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black bg-gradient-to-br shadow-lg",
                  cfg.color
                )}>
                  {t.emoji}
                </div>
                <div className="flex-1 text-left">
                  <div className={cn("font-black", theme === "dark" ? "text-white" : "text-slate-900")}>{t.name}</div>
                  {t.streak > 0 && <div className="text-xs text-amber-400 font-bold">Best streak: 🔥{t.streak}</div>}
                </div>
                <div className={cn(
                  "text-2xl font-black",
                  i === 0
                    ? "text-amber-400"
                    : theme === "dark" ? "text-white/70" : "text-slate-600"
                )}>
                  {t.score}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-xl shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          🔄 Play Again
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  ROOT APP
// ─────────────────────────────────────────────
export function Guesseroo(props: any) {
  const [phase, setPhase] = useState<GamePhase>("splash");
  const [theme, setTheme] = useState<Theme>("light");
  const [teams, setTeams] = useState<Team[]>([]);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // If provided, overwrite the built-in bank with the payload bank
  const safeQBank = Array.isArray(props.payload?.questions) && props.payload.questions.length > 0 
    ? props.payload.questions.map((q: any) => ({
      id: q.id,
      prompt: q.prompt,
      answer: q.answer,
      image: q.image || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600",
      points: q.points || 10,
      category: q.category || "Study",
      difficulty: q.difficulty || "medium",
      funFact: q.explanation || "No fun fact available",
    })) 
    : QUESTION_BANK;

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <div className={cn(theme === "dark" && "dark")}>
      <style>{`
        @keyframes floatOrb {
          from { transform: translateY(0) scale(1); }
          to { transform: translateY(-30px) scale(1.08); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        html { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
      `}</style>

      <ParticleCanvas trigger={confettiTrigger} />

      {phase === "splash" && (
        <SplashScreen
          onStart={() => setPhase("setup")}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {phase === "setup" && (
        <SetupScreen
          onBegin={t => { setTeams(t); setPhase("playing"); }}
          theme={theme}
        />
      )}

      {phase === "playing" && (
        <GameArena
          teams={teams}
          onTeamsUpdate={setTeams}
          onFinish={finalTeams => { setTeams(finalTeams); setConfettiTrigger(c => c + 1); setPhase("summary"); }}
          theme={theme}
          onToggleTheme={toggleTheme}
          qBank={safeQBank}
        />
      )}

      {phase === "summary" && (
        <SummaryScreen
          teams={teams}
          theme={theme}
          onPlayAgain={() => { setTeams([]); setPhase("splash"); }}
        />
      )}
    </div>
  );
}
