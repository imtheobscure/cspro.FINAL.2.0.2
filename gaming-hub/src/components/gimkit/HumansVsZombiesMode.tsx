import {
  useState, useEffect, useRef, useCallback, createContext
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
interface Learner {
  id: string;
  name: string;
  avatar: string;
  color: string;
  cash: number;
  health: number;
  maxHealth: number;
  streak: number;
  multiplier: number;
  shields: number;
  xp: number;
  level: number;
  inventory: string[];
  isZombie: boolean;
  zombieInfectionTimer: number;
  answeredCount: number;
  correctCount: number;
  powerupsUsed: number;
  achievements: string[];
  lastAnswerTime: number;
  speedBoost: boolean;
  doubleCoins: boolean;
  immune: boolean;
}

interface Question {
  id: string;
  text: string;
  choices: string[];
  answer: string;
  image?: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  cashReward: number;
  xpReward: number;
  timeLimit: number;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  category: "upgrade" | "powerup" | "defense" | "attack";
  effect: string;
  maxOwn: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

interface GameConfig {
  lessonTitle: string;
  lessonSubject: string;
  tutorName: string;
  learningGoals: string[];
  funFacts: string[];
  sessionDate: string;
  zombieInfectionTime: number;
  startingCash: number;
  questionTimeLimit: number;
  maxRounds: number;
  winCondition: "lastSurvivor" | "mostCash" | "mostCorrect";
}

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: "sm" | "md" | "lg";
  life: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext<{ dark: boolean; toggle: () => void }>({ dark: true, toggle: () => {} });

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT LESSON JSON CONFIG (detailed & personalizable)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: GameConfig = {
  lessonTitle: "Zombie Academy: Survive the Knowledge Apocalypse",
  lessonSubject: "General Knowledge & Critical Thinking",
  tutorName: "Professor Omega",
  learningGoals: [
    "Master core concepts under pressure",
    "Build strategic thinking and resource management",
    "Develop teamwork and competitive excellence",
    "Accelerate retention through gamified suspense",
  ],
  funFacts: [
    "Your brain processes information 400x faster under mild stress!",
    "Playing games improves memory retention by up to 90%!",
    "The zombie myth originates from Haitian folklore — fascinating!",
    "Competitive learning boosts recall by 70% vs passive study.",
    "Streaks activate dopamine — making learning addictive!",
  ],
  sessionDate: new Date().toLocaleDateString(),
  zombieInfectionTime: 45,
  startingCash: 500,
  questionTimeLimit: 30,
  maxRounds: 20,
  winCondition: "lastSurvivor",
};

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION BANK (rich, multi-subject)
// ─────────────────────────────────────────────────────────────────────────────
const QUESTION_BANK: Question[] = [
  {
    id: "q1", text: "What is 7 × 8?", choices: ["54", "56", "62", "48"],
    answer: "56", subject: "Math", difficulty: "easy",
    explanation: "7 × 8 = 56. A classic multiplication fact!",
    cashReward: 150, xpReward: 20, timeLimit: 15,
    image: "https://images.pexels.com/photos/6256065/pexels-photo-6256065.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "q2", text: "Which planet is closest to the Sun?", choices: ["Venus", "Earth", "Mercury", "Mars"],
    answer: "Mercury", subject: "Science", difficulty: "easy",
    explanation: "Mercury is the closest planet to the Sun, though Venus is hotter!",
    cashReward: 150, xpReward: 20, timeLimit: 20,
    image: "https://images.pexels.com/photos/39561/solar-flare-sun-eruption-energy-39561.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "q3", text: "What does HTML stand for?", choices: ["HyperText Markup Language", "High-Tech Modern Language", "HyperText Modeling Language", "Hyperlink and Text Markup Language"],
    answer: "HyperText Markup Language", subject: "Technology", difficulty: "easy",
    explanation: "HTML = HyperText Markup Language — the foundation of all web pages!",
    cashReward: 150, xpReward: 25, timeLimit: 20,
    image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "q4", text: "Who painted the Mona Lisa?", choices: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"],
    answer: "Leonardo da Vinci", subject: "Art", difficulty: "easy",
    explanation: "Leonardo da Vinci painted the Mona Lisa around 1503–1519.",
    cashReward: 200, xpReward: 25, timeLimit: 20,
  },
  {
    id: "q5", text: "What is the chemical symbol for Gold?", choices: ["Go", "Gd", "Au", "Ag"],
    answer: "Au", subject: "Chemistry", difficulty: "medium",
    explanation: "Au comes from the Latin word 'Aurum' meaning gold!",
    cashReward: 250, xpReward: 35, timeLimit: 25,
  },
  {
    id: "q6", text: "What year did World War II end?", choices: ["1943", "1944", "1945", "1946"],
    answer: "1945", subject: "History", difficulty: "medium",
    explanation: "WWII ended in 1945 — V-E Day (May 8) and V-J Day (Sept 2).",
    cashReward: 250, xpReward: 35, timeLimit: 25,
  },
  {
    id: "q7", text: "What is the square root of 144?", choices: ["11", "12", "13", "14"],
    answer: "12", subject: "Math", difficulty: "medium",
    explanation: "√144 = 12 because 12 × 12 = 144!",
    cashReward: 300, xpReward: 40, timeLimit: 20,
  },
  {
    id: "q8", text: "Which gas makes up most of Earth's atmosphere?", choices: ["Oxygen", "Carbon Dioxide", "Hydrogen", "Nitrogen"],
    answer: "Nitrogen", subject: "Science", difficulty: "medium",
    explanation: "Nitrogen makes up ~78% of Earth's atmosphere. Oxygen is only ~21%!",
    cashReward: 300, xpReward: 40, timeLimit: 25,
    image: "https://images.pexels.com/photos/912110/pexels-photo-912110.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "q9", text: "In which country was the game of Chess invented?", choices: ["China", "India", "Persia", "Greece"],
    answer: "India", subject: "History", difficulty: "hard",
    explanation: "Chess originated in India around the 6th century AD as 'Chaturanga'!",
    cashReward: 400, xpReward: 60, timeLimit: 30,
  },
  {
    id: "q10", text: "What is the time complexity of Binary Search?", choices: ["O(n)", "O(n²)", "O(log n)", "O(n log n)"],
    answer: "O(log n)", subject: "Computer Science", difficulty: "hard",
    explanation: "Binary Search is O(log n) — it halves the search space each time!",
    cashReward: 500, xpReward: 75, timeLimit: 30,
    image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "q11", text: "What is the powerhouse of the cell?", choices: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Body"],
    answer: "Mitochondria", subject: "Biology", difficulty: "easy",
    explanation: "The mitochondria produces ATP energy — the cell's power source!",
    cashReward: 150, xpReward: 20, timeLimit: 20,
    image: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "q12", text: "What does CSS stand for?", choices: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style System", "Colorful Style Syntax"],
    answer: "Cascading Style Sheets", subject: "Technology", difficulty: "easy",
    explanation: "CSS = Cascading Style Sheets — controls the visual design of web pages!",
    cashReward: 150, xpReward: 20, timeLimit: 20,
  },
  {
    id: "q13", text: "Solve: 2x + 5 = 17. What is x?", choices: ["5", "6", "7", "8"],
    answer: "6", subject: "Math", difficulty: "medium",
    explanation: "2x = 17 - 5 = 12, so x = 6!",
    cashReward: 300, xpReward: 45, timeLimit: 25,
  },
  {
    id: "q14", text: "What is the capital of Japan?", choices: ["Seoul", "Beijing", "Tokyo", "Bangkok"],
    answer: "Tokyo", subject: "Geography", difficulty: "easy",
    explanation: "Tokyo is Japan's capital and the world's most populous metropolitan area!",
    cashReward: 150, xpReward: 20, timeLimit: 15,
  },
  {
    id: "q15", text: "Which famous scientist developed the theory of relativity?", choices: ["Newton", "Galileo", "Tesla", "Einstein"],
    answer: "Einstein", subject: "Science", difficulty: "easy",
    explanation: "Albert Einstein published the Special Theory of Relativity in 1905!",
    cashReward: 150, xpReward: 20, timeLimit: 20,
  },
  {
    id: "q16", text: "What is 15% of 200?", choices: ["25", "30", "35", "40"],
    answer: "30", subject: "Math", difficulty: "medium",
    explanation: "15% of 200 = 0.15 × 200 = 30!",
    cashReward: 250, xpReward: 35, timeLimit: 20,
  },
  {
    id: "q17", text: "Which programming language is known as 'the language of the web'?", choices: ["Python", "Java", "JavaScript", "C++"],
    answer: "JavaScript", subject: "Technology", difficulty: "easy",
    explanation: "JavaScript runs in every web browser and powers interactive websites!",
    cashReward: 150, xpReward: 20, timeLimit: 20,
    image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "q18", text: "How many bones are in the adult human body?", choices: ["196", "206", "216", "226"],
    answer: "206", subject: "Biology", difficulty: "medium",
    explanation: "Adults have 206 bones. Babies are born with ~270 and many fuse over time!",
    cashReward: 250, xpReward: 35, timeLimit: 25,
  },
  {
    id: "q19", text: "What does RAM stand for?", choices: ["Read Access Memory", "Random Access Memory", "Rapid Application Memory", "Real-time Adaptive Memory"],
    answer: "Random Access Memory", subject: "Technology", difficulty: "easy",
    explanation: "RAM = Random Access Memory — your computer's short-term working memory!",
    cashReward: 150, xpReward: 20, timeLimit: 20,
  },
  {
    id: "q20", text: "Pi (π) to 4 decimal places is:", choices: ["3.1415", "3.1416", "3.1412", "3.1418"],
    answer: "3.1416", subject: "Math", difficulty: "hard",
    explanation: "π ≈ 3.14159... rounded to 4 decimal places = 3.1416!",
    cashReward: 500, xpReward: 70, timeLimit: 25,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHOP ITEMS
// ─────────────────────────────────────────────────────────────────────────────
const SHOP_ITEMS: ShopItem[] = [
  { id: "shield", name: "🛡️ Zombie Shield", description: "Block the next zombie infection attempt", cost: 300, icon: "🛡️", category: "defense", effect: "shield", maxOwn: 3, rarity: "common" },
  { id: "multiplier2", name: "⚡ 2× Cash Boost", description: "Double your cash earnings for 3 questions", cost: 400, icon: "⚡", category: "upgrade", effect: "double", maxOwn: 5, rarity: "common" },
  { id: "multiplier3", name: "💎 3× Cash Surge", description: "Triple cash for your next answer", cost: 700, icon: "💎", category: "upgrade", effect: "triple", maxOwn: 3, rarity: "rare" },
  { id: "heal", name: "💉 Antidote", description: "Restore 2 health points instantly", cost: 250, icon: "💉", category: "defense", effect: "heal", maxOwn: 5, rarity: "common" },
  { id: "steal", name: "🗡️ Cash Raid", description: "Steal $100 from a random player", cost: 200, icon: "🗡️", category: "attack", effect: "steal", maxOwn: 3, rarity: "common" },
  { id: "freeze", name: "❄️ Time Freeze", description: "Add 15 extra seconds to the timer", cost: 350, icon: "❄️", category: "powerup", effect: "freeze", maxOwn: 3, rarity: "rare" },
  { id: "bomb", name: "💣 Answer Bomb", description: "Eliminate 2 wrong choices instantly", cost: 450, icon: "💣", category: "powerup", effect: "bomb", maxOwn: 3, rarity: "rare" },
  { id: "immunity", name: "🧪 Zombie Vaccine", description: "Full immunity from zombies for 2 rounds", cost: 600, icon: "🧪", category: "defense", effect: "immune", maxOwn: 2, rarity: "epic" },
  { id: "nuke", name: "☢️ Knowledge Nuke", description: "Convert all zombies back to humans ($1000)", cost: 1000, icon: "☢️", category: "attack", effect: "nuke", maxOwn: 1, rarity: "legendary" },
  { id: "speedrun", name: "🚀 Speed Demon", description: "Your next answer is always instant (5s)", cost: 500, icon: "🚀", category: "powerup", effect: "speed", maxOwn: 2, rarity: "epic" },
  { id: "resurrect", name: "✨ Resurrection", description: "Come back from zombie state with 3 HP", cost: 800, icon: "✨", category: "defense", effect: "resurrect", maxOwn: 1, rarity: "legendary" },
  { id: "jackpot", name: "🎰 Lucky Jackpot", description: "Gamble $300 for a chance to win $1500", cost: 300, icon: "🎰", category: "powerup", effect: "jackpot", maxOwn: 5, rarity: "rare" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────────────────────
const ACHIEVEMENTS: Achievement[] = [
  { id: "first_blood", name: "First Blood", description: "Answer your first question correctly", icon: "🩸", condition: "correct_1" },
  { id: "streak_3", name: "On Fire!", description: "Get 3 correct answers in a row", icon: "🔥", condition: "streak_3" },
  { id: "streak_5", name: "Inferno!", description: "Get 5 correct answers in a row", icon: "🌋", condition: "streak_5" },
  { id: "rich", name: "Zombie Millionaire", description: "Accumulate $2000 in cash", icon: "💰", condition: "cash_2000" },
  { id: "survivor", name: "Lone Survivor", description: "Be the last human standing", icon: "🏆", condition: "last_human" },
  { id: "speed_demon", name: "Lightning Fast", description: "Answer in under 5 seconds", icon: "⚡", condition: "speed_5" },
  { id: "shopper", name: "Power Shopper", description: "Buy 3 items from the shop", icon: "🛒", condition: "shop_3" },
  { id: "zombie_slayer", name: "Zombie Slayer", description: "Use the Knowledge Nuke", icon: "☢️", condition: "nuke_used" },
];

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
const AVATARS = ["🧑‍🎓", "👩‍🔬", "🧑‍💻", "👨‍🏫", "🦸", "🧙", "🕵️", "🤖", "👾", "🦊", "🐺", "🦅"];
const PLAYER_COLORS = [
  "from-blue-500 to-cyan-400", "from-purple-500 to-pink-400", "from-emerald-500 to-teal-400",
  "from-orange-500 to-yellow-400", "from-rose-500 to-red-400", "from-indigo-500 to-violet-400",
];
const RARITY_COLORS: Record<string, string> = {
  common: "from-slate-500 to-slate-400 border-slate-400",
  rare: "from-blue-600 to-cyan-400 border-cyan-400",
  epic: "from-purple-600 to-violet-400 border-violet-400",
  legendary: "from-yellow-600 to-amber-400 border-amber-400",
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9); }
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function formatCash(n: number) { return "$" + n.toLocaleString(); }
function getLevelInfo(xp: number) {
  const level = Math.floor(xp / 100) + 1;
  const progress = (xp % 100);
  return { level, progress };
}
function difficultyColor(d: string) {
  if (d === "easy") return "text-emerald-400";
  if (d === "medium") return "text-yellow-400";
  return "text-red-400";
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUND ENGINE (Web Audio API)
// ─────────────────────────────────────────────────────────────────────────────
class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgGain: GainNode | null = null;
  private fxGain: GainNode | null = null;
  private bgOscillators: OscillatorNode[] = [];
  muted = false;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.bgGain = this.ctx.createGain();
    this.fxGain = this.ctx.createGain();
    this.bgGain.gain.value = 0.08;
    this.fxGain.gain.value = 0.3;
    this.bgGain.connect(this.ctx.destination);
    this.fxGain.connect(this.ctx.destination);
  }

  private tone(freq: number, type: OscillatorType, duration: number, gain = 0.3, delay = 0) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, this.ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);
    osc.connect(g);
    g.connect(this.fxGain!);
    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + duration);
  }

  correct() {
    this.tone(523, "sine", 0.1);
    this.tone(659, "sine", 0.1, 0.3, 0.1);
    this.tone(784, "sine", 0.2, 0.3, 0.2);
  }

  wrong() {
    this.tone(200, "sawtooth", 0.15, 0.3);
    this.tone(150, "sawtooth", 0.2, 0.3, 0.15);
  }

  purchase() {
    this.tone(440, "sine", 0.08);
    this.tone(550, "sine", 0.08, 0.25, 0.08);
    this.tone(660, "sine", 0.15, 0.25, 0.16);
  }

  levelUp() {
    [523, 587, 659, 698, 784, 880].forEach((f, i) => this.tone(f, "sine", 0.15, 0.4, i * 0.1));
  }

  zombie() {
    this.tone(80, "sawtooth", 0.5, 0.4);
    this.tone(60, "square", 0.3, 0.2, 0.2);
  }

  tick() {
    this.tone(800, "square", 0.05, 0.15);
  }

  warning() {
    this.tone(400, "sawtooth", 0.1);
    this.tone(350, "sawtooth", 0.1, 0.3, 0.15);
  }

  achievement() {
    [880, 1100, 1320, 1760].forEach((f, i) => this.tone(f, "sine", 0.2, 0.5, i * 0.12));
  }

  startBgMusic() {
    if (!this.ctx || this.muted) return;
    this.stopBgMusic();
    // Eerie ambient background
    const notes = [110, 130.8, 146.8, 164.8, 98, 116.5];
    let t = this.ctx.currentTime;
    const play = () => {
      if (!this.ctx || this.muted) return;
      const freq = notes[Math.floor(Math.random() * notes.length)];
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 1);
      g.gain.linearRampToValueAtTime(0, t + 3);
      osc.connect(g);
      g.connect(this.bgGain!);
      osc.start(t);
      osc.stop(t + 3.5);
      this.bgOscillators.push(osc);
      t += 2;
    };
    for (let i = 0; i < 8; i++) play();
  }

  stopBgMusic() {
    this.bgOscillators.forEach(o => { try { o.stop(); } catch { } });
    this.bgOscillators = [];
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.bgGain) this.bgGain.gain.value = this.muted ? 0 : 0.08;
    if (this.fxGain) this.fxGain.gain.value = this.muted ? 0 : 0.3;
    if (!this.muted) this.startBgMusic();
    return this.muted;
  }
}

const soundEngine = new SoundEngine();

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLES COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface Particle {
  id: string; x: number; y: number; vx: number; vy: number;
  size: number; color: string; life: number; maxLife: number;
}

function ParticleSystem({ trigger, type }: { trigger: number; type: "correct" | "wrong" | "zombie" | "levelup" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = type === "correct" ? ["#34d399", "#6ee7b7", "#fbbf24", "#f59e0b"]
      : type === "wrong" ? ["#f87171", "#ef4444", "#fca5a5"]
        : type === "zombie" ? ["#4ade80", "#16a34a", "#713f12"]
          : ["#a78bfa", "#818cf8", "#fbbf24", "#f472b6"];
    for (let i = 0; i < 30; i++) {
      particlesRef.current.push({
        id: uid(), x: canvas.width / 2, y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 1.5) * 6,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1, maxLife: 1,
      });
    }
  }, [trigger, type]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.02;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} width={400} height={300} className="absolute inset-0 w-full h-full pointer-events-none z-50" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING TEXT
// ─────────────────────────────────────────────────────────────────────────────
function FloatingTexts({ texts }: { texts: FloatingText[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {texts.map(t => (
        <div
          key={t.id}
          className={`absolute font-black animate-float-up ${t.color} ${t.size === "lg" ? "text-3xl" : t.size === "md" ? "text-xl" : "text-sm"}`}
          style={{ left: t.x, top: t.y }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOMBIE PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────
function ZombieTimer({ value, max }: { value: number; max: number }) {
  const pct = (value / max) * 100;
  const color = pct > 60 ? "bg-emerald-500" : pct > 30 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
      <div
        className={`h-full ${color} transition-all duration-1000 rounded-full`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEARNER CARD (compact)
// ─────────────────────────────────────────────────────────────────────────────
function LearnerCard({ learner, isActive, onTakeTurn, dark }: { learner: Learner; isActive: boolean; onTakeTurn: () => void; dark: boolean }) {
  const { level } = getLevelInfo(learner.xp);
  const zombieGlow = learner.isZombie ? "shadow-green-500/60 border-green-400/60" : "";
  const activeGlow = isActive ? "ring-2 ring-yellow-400 shadow-yellow-400/40" : "";

  return (
    <div
      onClick={() => !learner.isZombie && onTakeTurn()}
      className={`
        relative rounded-2xl p-3 cursor-pointer transition-all duration-300 border
        ${dark ? "bg-black/40 border-white/10" : "bg-white/70 border-slate-200"}
        ${zombieGlow} ${activeGlow}
        ${learner.isZombie ? "opacity-70" : "hover:scale-[1.02]"}
        ${isActive ? "scale-[1.02]" : ""}
        shadow-lg backdrop-blur-sm overflow-hidden
      `}
    >
      {learner.isZombie && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/50 to-black/60 rounded-2xl z-0 animate-pulse" />
      )}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 rounded-2xl z-0" />
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br ${learner.color} shadow-md`}>
            {learner.isZombie ? "🧟" : learner.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-sm truncate ${dark ? "text-white" : "text-slate-800"}`}>
              {learner.name}
              {isActive && <span className="ml-1 text-yellow-400 animate-pulse">●</span>}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-yellow-400 font-semibold">Lv.{level}</span>
              {learner.immune && <span className="text-xs">🧪</span>}
              {learner.shields > 0 && <span className="text-xs">🛡️×{learner.shields}</span>}
              {learner.doubleCoins && <span className="text-xs">⚡</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-yellow-400 font-black text-sm">{formatCash(learner.cash)}</div>
            <div className="text-xs text-slate-400">×{learner.multiplier.toFixed(1)}</div>
          </div>
        </div>

        {/* Health */}
        <div className="flex gap-0.5 mb-1">
          {Array.from({ length: learner.maxHealth }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i < learner.health ? "bg-red-500" : "bg-white/10"}`} />
          ))}
        </div>

        {/* Streak */}
        {learner.streak > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-orange-400 text-xs">🔥 {learner.streak}</span>
            <span className="text-xs text-slate-400">streak</span>
          </div>
        )}

        {learner.isZombie && (
          <div className="text-center mt-1">
            <span className="text-green-400 text-xs font-bold animate-pulse">🧟 ZOMBIE MODE</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION PANEL
// ─────────────────────────────────────────────────────────────────────────────
function QuestionPanel({
  question, selectedChoice, locked, timeLeft, timeMax, onAnswer, dark, bombedChoices
}: {
  question: Question; selectedChoice: string | null; locked: string | null;
  timeLeft: number; timeMax: number; onAnswer: (c: string) => void;
  dark: boolean; bombedChoices: string[];
}) {
  const revealed = locked !== null;
  const timePct = (timeLeft / timeMax) * 100;
  const timeColor = timePct > 50 ? "bg-emerald-500" : timePct > 25 ? "bg-yellow-500" : "bg-red-500 animate-pulse";
  const choiceLetters = ["A", "B", "C", "D"];

  return (
    <div className="relative flex flex-col gap-4">
      {/* Timer */}
      <div className="flex items-center gap-3">
        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
          <div className={`h-full ${timeColor} transition-all duration-1000 rounded-full`} style={{ width: `${timePct}%` }} />
        </div>
        <div className={`text-xl font-black w-10 text-right ${timePct < 25 ? "text-red-400 animate-pulse" : dark ? "text-white" : "text-slate-700"}`}>
          {timeLeft}
        </div>
      </div>

      {/* Subject & Difficulty */}
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${dark ? "bg-white/10 border-white/20 text-white/80" : "bg-slate-100 border-slate-200 text-slate-600"}`}>
          {question.subject}
        </span>
        <span className={`text-xs font-bold uppercase ${difficultyColor(question.difficulty)}`}>
          ★ {question.difficulty}
        </span>
        <span className="ml-auto text-yellow-400 font-bold text-sm">+{formatCash(question.cashReward)}</span>
      </div>

      {/* Question */}
      <div className={`rounded-2xl p-5 border ${dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"} shadow-xl`}>
        <h3 className={`text-xl md:text-2xl font-bold leading-tight ${dark ? "text-white" : "text-slate-800"}`}>
          {question.text}
        </h3>
      </div>

      {/* Image */}
      {question.image && (
        <div className="w-full h-40 rounded-xl overflow-hidden shadow-lg border border-white/10">
          <img src={question.image} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Choices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.choices.map((c, idx) => {
          const isBombed = bombedChoices.includes(c) && c !== question.answer;
          const isSelected = selectedChoice === c;
          const isCorrect = c === question.answer;
          let bg = dark
            ? "bg-white/10 hover:bg-white/20 border-white/20 text-white hover:border-white/40"
            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-400";

          if (revealed) {
            if (isCorrect) bg = "bg-emerald-500/90 border-emerald-400 text-white shadow-emerald-500/30";
            else if (isSelected) bg = "bg-red-500/90 border-red-400 text-white shadow-red-500/30";
            else bg = dark ? "bg-white/5 border-transparent opacity-40 text-white/40" : "bg-slate-50 border-transparent opacity-40 text-slate-400";
          } else if (isSelected) {
            bg = "bg-indigo-500 border-indigo-400 text-white shadow-indigo-500/30";
          }

          if (isBombed) bg = "opacity-20 pointer-events-none " + bg;

          return (
            <button
              key={idx}
              onClick={() => !isBombed && onAnswer(c)}
              disabled={revealed || isBombed}
              className={`
                group relative p-4 rounded-2xl border-2 text-left font-semibold
                transition-all duration-200 shadow-md ${bg}
                ${!revealed && !isBombed ? "active:scale-95" : ""}
              `}
            >
              <span className={`inline-block w-7 h-7 rounded-lg mr-3 text-center text-sm font-black
                ${revealed && isCorrect ? "bg-white/20" : revealed && isSelected ? "bg-white/20" : "bg-white/10"}`}>
                {choiceLetters[idx]}
              </span>
              {c}
              {revealed && isCorrect && <span className="ml-2">✓</span>}
              {revealed && isSelected && !isCorrect && <span className="ml-2">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div className={`rounded-xl p-4 border animate-fade-in ${dark ? "bg-blue-500/10 border-blue-400/30" : "bg-blue-50 border-blue-200"}`}>
          <p className={`text-sm font-medium ${dark ? "text-blue-300" : "text-blue-700"}`}>
            💡 <strong>Explanation:</strong> {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOP PANEL
// ─────────────────────────────────────────────────────────────────────────────
function ShopPanel({
  learner, onBuy, onClose, dark
}: { learner: Learner; onBuy: (item: ShopItem) => void; onClose: () => void; dark: boolean }) {
  const [filter, setFilter] = useState<string>("all");
  const categories = ["all", "defense", "upgrade", "powerup", "attack"];

  const filtered = SHOP_ITEMS.filter(i => filter === "all" || i.category === filter);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm`}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border shadow-2xl ${dark ? "bg-slate-900 border-white/20" : "bg-white border-slate-200"}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className={`text-2xl font-black ${dark ? "text-white" : "text-slate-800"}`}>🏪 Zombie Shop</h2>
            <p className={`text-sm ${dark ? "text-yellow-400" : "text-yellow-600"}`}>💰 {learner.name}'s Balance: {formatCash(learner.cash)}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl transition-colors">✕</button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-4 overflow-x-auto">
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize whitespace-nowrap transition-all ${filter === c
                ? "bg-indigo-600 text-white shadow-indigo-500/30 shadow-lg"
                : dark ? "bg-white/10 text-white/70 hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {c === "all" ? "🛒 All" : c === "defense" ? "🛡️ Defense" : c === "upgrade" ? "⚡ Upgrades" : c === "powerup" ? "✨ Power-ups" : "⚔️ Attack"}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="overflow-y-auto p-4 max-h-[55vh] grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(item => {
            const canAfford = learner.cash >= item.cost;
            const owned = learner.inventory.filter(i => i === item.id).length;
            const maxed = owned >= item.maxOwn;
            return (
              <div key={item.id} className={`rounded-2xl p-4 border-2 transition-all ${RARITY_COLORS[item.rarity]} bg-gradient-to-br ${dark ? "from-slate-800/80 to-slate-900/80" : "from-white to-slate-50"}`}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-sm ${dark ? "text-white" : "text-slate-800"}`}>{item.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full uppercase font-bold
                        ${item.rarity === "legendary" ? "bg-yellow-500/30 text-yellow-300"
                          : item.rarity === "epic" ? "bg-purple-500/30 text-purple-300"
                            : item.rarity === "rare" ? "bg-blue-500/30 text-blue-300"
                              : "bg-slate-500/30 text-slate-300"}`}>
                        {item.rarity}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>{item.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-yellow-400 font-black">{formatCash(item.cost)}</span>
                      <span className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>({owned}/{item.maxOwn} owned)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onBuy(item)}
                  disabled={!canAfford || maxed}
                  className={`mt-3 w-full py-2 rounded-xl font-bold text-sm transition-all
                    ${!canAfford || maxed
                      ? "bg-white/5 text-white/30 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg active:scale-95"}`}>
                  {maxed ? "✓ Maxed" : !canAfford ? "💸 Not Enough" : "🛒 Buy Now"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────
function Leaderboard({ learners, dark }: { learners: Learner[]; dark: boolean }) {
  const sorted = [...learners].sort((a, b) => b.cash - a.cash);

  return (
    <div className="space-y-2">
      {sorted.map((l, idx) => (
        <div key={l.id} className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
          <div className={`w-7 h-7 flex items-center justify-center rounded-lg font-black text-sm
            ${idx === 0 ? "bg-yellow-500 text-yellow-900" : idx === 1 ? "bg-slate-400 text-slate-900" : idx === 2 ? "bg-amber-700 text-amber-100" : "bg-white/10 text-white/50"}`}>
            {idx + 1}
          </div>
          <div className="text-xl">{l.isZombie ? "🧟" : l.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className={`font-semibold text-sm truncate ${dark ? "text-white" : "text-slate-800"}`}>{l.name}</div>
            <div className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{l.correctCount}/{l.answeredCount} correct</div>
          </div>
          <div className="text-right">
            <div className="text-yellow-400 font-black text-sm">{formatCash(l.cash)}</div>
            {l.isZombie && <div className="text-green-400 text-xs">🧟</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT TOAST
// ─────────────────────────────────────────────────────────────────────────────
function AchievementToast({ achievement, learnerName, dark }: { achievement: Achievement; learnerName: string; dark: boolean }) {
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] animate-slide-down
      rounded-2xl px-6 py-4 border shadow-2xl flex items-center gap-4 min-w-64
      ${dark ? "bg-gradient-to-r from-purple-900 to-indigo-900 border-purple-400/50" : "bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-300"}`}>
      <div className="text-4xl animate-bounce">{achievement.icon}</div>
      <div>
        <div className={`font-black text-sm uppercase tracking-wider ${dark ? "text-purple-300" : "text-purple-600"}`}>🏆 Achievement Unlocked!</div>
        <div className={`font-bold ${dark ? "text-white" : "text-slate-800"}`}>{achievement.name}</div>
        <div className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{learnerName}: {achievement.description}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME SETUP SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function SetupScreen({ onStart, dark }: { onStart: (learners: Learner[], config: GameConfig) => void; dark: boolean }) {
  const [step, setStep] = useState<"welcome" | "lesson" | "learners" | "ready">("welcome");
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [learnerInputs, setLearnerInputs] = useState([
    { name: "", avatar: "🧑‍🎓", goal: "" },
    { name: "", avatar: "👩‍🔬", goal: "" },
  ]);
  const [showJson, setShowJson] = useState(false);
  const [jsonInput, setJsonInput] = useState("");

  const addLearner = () => {
    if (learnerInputs.length < 6) {
      setLearnerInputs([...learnerInputs, { name: "", avatar: AVATARS[learnerInputs.length % AVATARS.length], goal: "" }]);
    }
  };
  const removeLearner = (idx: number) => {
    if (learnerInputs.length > 1) setLearnerInputs(learnerInputs.filter((_, i) => i !== idx));
  };
  const updateLearner = (idx: number, field: string, val: string) => {
    setLearnerInputs(learnerInputs.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  };

  const buildLearners = (): Learner[] =>
    learnerInputs.filter(l => l.name.trim()).map((l, i) => ({
      id: uid(), name: l.name.trim(), avatar: l.avatar,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      cash: config.startingCash, health: 5, maxHealth: 5,
      streak: 0, multiplier: 1, shields: 0, xp: 0, level: 1,
      inventory: [], isZombie: false, zombieInfectionTimer: 0,
      answeredCount: 0, correctCount: 0, powerupsUsed: 0,
      achievements: [], lastAnswerTime: 0, speedBoost: false,
      doubleCoins: false, immune: false,
    }));

  const handleStart = () => {
    const learners = buildLearners();
    if (learners.length === 0) return;
    onStart(learners, config);
  };

  const handleJsonLoad = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setConfig({ ...DEFAULT_CONFIG, ...parsed });
      if (parsed.learners) {
        setLearnerInputs(parsed.learners.map((l: any) => ({
          name: l.name || "", avatar: l.avatar || "🧑‍🎓", goal: l.learningGoal || ""
        })));
      }
      setShowJson(false);
      setStep("learners");
    } catch {
      alert("Invalid JSON format. Please check your input.");
    }
  };

  const sampleJson = JSON.stringify({
    lessonTitle: "Zombie Academy: Math Survival",
    lessonSubject: "Mathematics",
    tutorName: "Ms. Rivera",
    learningGoals: ["Master algebra fundamentals", "Improve speed and accuracy"],
    funFacts: ["The number zero was invented in India!", "Pi has been calculated to over 100 trillion digits!"],
    sessionDate: new Date().toLocaleDateString(),
    zombieInfectionTime: 45,
    startingCash: 500,
    questionTimeLimit: 30,
    maxRounds: 15,
    winCondition: "lastSurvivor",
    learners: [
      { name: "Alex", avatar: "🦸", learningGoal: "Understand equations" },
      { name: "Jordan", avatar: "🧙", learningGoal: "Master fractions" }
    ]
  }, null, 2);

  const promptText = `You are an expert educational game content designer. Create a detailed JSON configuration for a Gimkit Zombie Academy lesson game with the following structure:

{
  "lessonTitle": "string — catchy zombie-themed lesson title",
  "lessonSubject": "string — subject area (Math, Science, History, etc.)",
  "tutorName": "string — tutor's name",
  "learningGoals": ["array of 3-5 specific learning objectives"],
  "funFacts": ["array of 5 fascinating, curriculum-relevant facts"],
  "sessionDate": "today's date",
  "zombieInfectionTime": 45,
  "startingCash": 500,
  "questionTimeLimit": 30,
  "maxRounds": 20,
  "winCondition": "lastSurvivor",
  "learners": [
    {
      "name": "learner name",
      "avatar": "emoji avatar",
      "learningGoal": "specific personal goal for this learner"
    }
  ]
}

REQUIREMENTS:
- Personalize each learner's goal based on their individual needs
- Make the lesson title exciting and zombie-apocalypse themed
- Fun facts should be mind-blowing and directly relevant to the subject
- Learning goals should be measurable and specific
- Subject: [INSERT SUBJECT HERE]
- Learners: [INSERT LEARNER NAMES AND THEIR SPECIFIC NEEDS HERE]
- Tutor: [INSERT TUTOR NAME HERE]
- Grade level: [INSERT GRADE LEVEL]

Generate the complete JSON ready to paste into the Zombie Academy game setup screen.`;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden`}>
      {/* Background */}
      <div className="fixed inset-0 z-0">
        {/* Background — a CSS gradient, not /hero-bg.jpg (missing everywhere, so it 404'd). */}
        <div className="w-full h-full opacity-30" style={{ background: "linear-gradient(160deg, #0f172a 0%, #14532d 55%, #052e16 100%)" }} />
        <div className={`absolute inset-0 ${dark ? "bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-green-950/80" : "bg-gradient-to-br from-slate-100/90 via-white/85 to-green-50/80"}`} />
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="absolute animate-float" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`, animationDuration: `${4 + Math.random() * 6}s`,
              fontSize: `${16 + Math.random() * 24}px`, opacity: 0.15,
            }}>
              {["🧟", "💀", "🧠", "⚡", "💰", "🛡️", "🔥"][Math.floor(Math.random() * 7)]}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block animate-bounce-slow">
            <div className={`text-7xl mb-2 filter drop-shadow-2xl`}>🧟</div>
          </div>
          <h1 className="font-orbitron text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 via-emerald-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg">
            ZOMBIE ACADEMY
          </h1>
          <p className={`text-lg mt-2 font-semibold ${dark ? "text-slate-400" : "text-slate-600"}`}>
            ☠️ Survive the Knowledge Apocalypse ☠️
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <img src="https://images.pexels.com/photos/5435459/pexels-photo-5435459.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="zombie" className="w-12 h-12 rounded-full object-cover border-2 border-green-500 opacity-80" />
            <img src="https://images.pexels.com/photos/8618062/pexels-photo-8618062.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="students" className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500" />
            <img src="https://images.pexels.com/photos/5435454/pexels-photo-5435454.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="zombie2" className="w-12 h-12 rounded-full object-cover border-2 border-red-500 opacity-80" />
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["welcome", "lesson", "learners", "ready"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all
                ${step === s ? "bg-indigo-600 text-white scale-110 shadow-indigo-500/50 shadow-lg"
                  : ["welcome", "lesson", "learners", "ready"].indexOf(step) > i
                    ? "bg-emerald-600 text-white" : dark ? "bg-white/10 text-white/40" : "bg-slate-200 text-slate-400"}`}>
                {["welcome", "lesson", "learners", "ready"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < 3 && <div className={`w-6 h-0.5 ${dark ? "bg-white/20" : "bg-slate-300"}`} />}
            </div>
          ))}
        </div>

        {/* Cards */}
        <div className={`rounded-3xl p-6 border shadow-2xl backdrop-blur-xl ${dark ? "bg-slate-900/80 border-white/10" : "bg-white/90 border-slate-200"}`}>

          {step === "welcome" && (
            <div className="space-y-6 text-center">
              <div>
                <h2 className={`text-2xl font-black mb-3 ${dark ? "text-white" : "text-slate-800"}`}>
                  Welcome, Tutor! 🎓
                </h2>
                <p className={`${dark ? "text-slate-400" : "text-slate-600"}`}>
                  Set up your personalized zombie survival quiz session. Your learners will answer questions to earn cash, buy power-ups, and survive the zombie apocalypse!
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "🧠", title: "Learn", desc: "Answer questions to earn cash" },
                  { icon: "🛡️", title: "Defend", desc: "Buy items to block zombies" },
                  { icon: "🏆", title: "Survive", desc: "Last human standing wins!" },
                ].map(f => (
                  <div key={f.icon} className={`p-3 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                    <div className="text-2xl mb-1">{f.icon}</div>
                    <div className={`font-bold text-sm ${dark ? "text-white" : "text-slate-800"}`}>{f.title}</div>
                    <div className={`text-xs ${dark ? "text-slate-500" : "text-slate-500"}`}>{f.desc}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowJson(true)}
                  className={`flex-1 py-3 rounded-xl border font-semibold transition-all ${dark ? "border-white/20 text-white/70 hover:bg-white/10" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                  📋 Load JSON Config
                </button>
                <button onClick={() => setStep("lesson")}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
                  Get Started →
                </button>
              </div>
            </div>
          )}

          {step === "lesson" && (
            <div className="space-y-4">
              <h2 className={`text-2xl font-black ${dark ? "text-white" : "text-slate-800"}`}>📚 Lesson Setup</h2>

              <div>
                <label className={`block text-sm font-semibold mb-1 ${dark ? "text-slate-300" : "text-slate-600"}`}>Tutor Name</label>
                <input value={config.tutorName} onChange={e => setConfig({ ...config, tutorName: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border font-medium outline-none transition-all ${dark ? "bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-indigo-400" : "bg-white border-slate-300 text-slate-800 focus:border-indigo-400"}`}
                  placeholder="Your name..." />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-1 ${dark ? "text-slate-300" : "text-slate-600"}`}>Lesson Title</label>
                <input value={config.lessonTitle} onChange={e => setConfig({ ...config, lessonTitle: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border font-medium outline-none transition-all ${dark ? "bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-indigo-400" : "bg-white border-slate-300 text-slate-800 focus:border-indigo-400"}`}
                  placeholder="e.g. Math Survival Challenge" />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-1 ${dark ? "text-slate-300" : "text-slate-600"}`}>Subject</label>
                <input value={config.lessonSubject} onChange={e => setConfig({ ...config, lessonSubject: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border font-medium outline-none transition-all ${dark ? "bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-indigo-400" : "bg-white border-slate-300 text-slate-800 focus:border-indigo-400"}`}
                  placeholder="Mathematics, Science, History..." />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-slate-300" : "text-slate-600"}`}>Starting Cash</label>
                  <input type="number" value={config.startingCash} onChange={e => setConfig({ ...config, startingCash: +e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border font-medium outline-none text-sm ${dark ? "bg-white/10 border-white/20 text-white focus:border-indigo-400" : "bg-white border-slate-300 text-slate-800 focus:border-indigo-400"}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-slate-300" : "text-slate-600"}`}>Time Limit (s)</label>
                  <input type="number" value={config.questionTimeLimit} onChange={e => setConfig({ ...config, questionTimeLimit: +e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border font-medium outline-none text-sm ${dark ? "bg-white/10 border-white/20 text-white focus:border-indigo-400" : "bg-white border-slate-300 text-slate-800 focus:border-indigo-400"}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-slate-300" : "text-slate-600"}`}>Max Rounds</label>
                  <input type="number" value={config.maxRounds} onChange={e => setConfig({ ...config, maxRounds: +e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border font-medium outline-none text-sm ${dark ? "bg-white/10 border-white/20 text-white focus:border-indigo-400" : "bg-white border-slate-300 text-slate-800 focus:border-indigo-400"}`} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep("welcome")} className={`px-5 py-3 rounded-xl border font-semibold ${dark ? "border-white/20 text-white/70 hover:bg-white/10" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>← Back</button>
                <button onClick={() => setStep("learners")} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg transition-all active:scale-95">
                  Next: Add Learners →
                </button>
              </div>
            </div>
          )}

          {step === "learners" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-2xl font-black ${dark ? "text-white" : "text-slate-800"}`}>👥 Learner Profiles</h2>
                <button onClick={addLearner} disabled={learnerInputs.length >= 6}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-40 transition-all">
                  + Add
                </button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {learnerInputs.map((l, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="relative">
                        <button className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                          {l.avatar}
                        </button>
                        <select
                          value={l.avatar}
                          onChange={e => updateLearner(idx, "avatar", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        >
                          {AVATARS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <input value={l.name} onChange={e => updateLearner(idx, "name", e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border font-bold outline-none transition-all text-sm ${dark ? "bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-indigo-400" : "bg-white border-slate-300 text-slate-800 focus:border-indigo-400"}`}
                          placeholder={`Learner ${idx + 1} name...`} />
                      </div>
                      {learnerInputs.length > 1 && (
                        <button onClick={() => removeLearner(idx)} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors flex items-center justify-center text-sm">✕</button>
                      )}
                    </div>
                    <input value={l.goal} onChange={e => updateLearner(idx, "goal", e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all ${dark ? "bg-white/10 border-white/20 text-white/80 placeholder-white/30 focus:border-indigo-400" : "bg-white border-slate-200 text-slate-600 focus:border-indigo-400"}`}
                      placeholder={`${l.name || "Learner"}'s personal learning goal...`} />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep("lesson")} className={`px-5 py-3 rounded-xl border font-semibold ${dark ? "border-white/20 text-white/70 hover:bg-white/10" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>← Back</button>
                <button onClick={() => setStep("ready")}
                  disabled={learnerInputs.filter(l => l.name.trim()).length === 0}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg transition-all active:scale-95 disabled:opacity-40">
                  Preview & Launch →
                </button>
              </div>
            </div>
          )}

          {step === "ready" && (
            <div className="space-y-4 text-center">
              <div className="text-5xl animate-bounce">🚀</div>
              <h2 className={`text-2xl font-black ${dark ? "text-white" : "text-slate-800"}`}>Ready to Survive?</h2>

              <div className={`text-left p-4 rounded-xl border space-y-2 ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm w-24">Tutor:</span>
                  <span className={`font-bold ${dark ? "text-white" : "text-slate-800"}`}>{config.tutorName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm w-24">Lesson:</span>
                  <span className={`font-bold ${dark ? "text-white" : "text-slate-800"}`}>{config.lessonTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm w-24">Players:</span>
                  <div className="flex gap-2 flex-wrap">
                    {learnerInputs.filter(l => l.name.trim()).map((l, i) => (
                      <span key={i} className="text-sm bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                        {l.avatar} {l.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm w-24">Cash:</span>
                  <span className={`font-bold text-yellow-400`}>{formatCash(config.startingCash)} each</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm w-24">Rounds:</span>
                  <span className={`font-bold ${dark ? "text-white" : "text-slate-800"}`}>{config.maxRounds}</span>
                </div>
              </div>

              {config.funFacts[0] && (
                <div className={`p-3 rounded-xl border text-left ${dark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"}`}>
                  <p className={`text-sm ${dark ? "text-yellow-300" : "text-yellow-700"}`}>
                    🤯 <strong>Fun Fact:</strong> {config.funFacts[Math.floor(Math.random() * config.funFacts.length)]}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep("learners")} className={`px-5 py-3 rounded-xl border font-semibold ${dark ? "border-white/20 text-white/70 hover:bg-white/10" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>← Back</button>
                <button onClick={handleStart}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black text-lg shadow-xl shadow-green-500/40 transition-all active:scale-95 animate-pulse-slow">
                  ☠️ START GAME!
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Prompt Hint */}
        <div className="mt-4 text-center">
          <button onClick={() => setShowJson(true)}
            className={`text-sm ${dark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"} transition-colors underline`}>
            🤖 Generate content with AI prompt
          </button>
        </div>
      </div>

      {/* JSON Modal */}
      {showJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowJson(false)} />
          <div className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl ${dark ? "bg-slate-900 border-white/20" : "bg-white border-slate-200"}`}>
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className={`font-black text-lg ${dark ? "text-white" : "text-slate-800"}`}>🤖 AI Prompt & JSON Config</h3>
              <button onClick={() => setShowJson(false)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-sm font-bold ${dark ? "text-slate-300" : "text-slate-600"}`}>📋 AI Generation Prompt</label>
                  <button onClick={() => navigator.clipboard.writeText(promptText)}
                    className="text-xs px-2 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500">Copy Prompt</button>
                </div>
                <div className={`rounded-xl p-3 text-xs font-mono leading-relaxed max-h-40 overflow-y-auto ${dark ? "bg-black/40 text-green-300 border border-green-900/50" : "bg-slate-50 text-slate-700 border border-slate-200"}`}>
                  {promptText}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-sm font-bold ${dark ? "text-slate-300" : "text-slate-600"}`}>📄 Paste JSON Config (or use sample below)</label>
                  <button onClick={() => setJsonInput(sampleJson)} className="text-xs px-2 py-1 rounded-lg bg-slate-600 text-white hover:bg-slate-500">Load Sample</button>
                </div>
                <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                  className={`w-full h-32 px-3 py-2 rounded-xl border text-xs font-mono outline-none resize-none ${dark ? "bg-black/40 border-white/20 text-white placeholder-white/30 focus:border-indigo-400" : "bg-slate-50 border-slate-300 text-slate-800 focus:border-indigo-400"}`}
                  placeholder="Paste your AI-generated JSON here..." />
              </div>
              <button onClick={handleJsonLoad} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-500 hover:to-purple-500 transition-all">
                🚀 Load & Apply Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME OVER SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function GameOverScreen({ learners, winner, onRestart, dark }: {
  learners: Learner[]; winner: Learner | null; onRestart: () => void; dark: boolean;
}) {
  const sorted = [...learners].sort((a, b) => b.cash - a.cash);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-4 backdrop-blur-md">
      <div className={`absolute inset-0 ${dark ? "bg-black/80" : "bg-white/80"}`} />
      <div className="relative z-10 w-full max-w-xl space-y-5 text-center">
        {winner && !winner.isZombie ? (
          <>
            <div className="text-8xl animate-bounce">🏆</div>
            <h1 className="font-orbitron text-4xl font-black bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
              SURVIVOR!
            </h1>
            <div className="text-2xl font-black text-white">
              {winner.avatar} {winner.name} wins!
            </div>
            <div className="text-yellow-400 text-xl font-bold">{formatCash(winner.cash)} earned!</div>
          </>
        ) : (
          <>
            <div className="text-8xl">🧟</div>
            <h1 className="font-orbitron text-4xl font-black text-green-400">ZOMBIES WIN!</h1>
            <p className={`${dark ? "text-slate-400" : "text-slate-600"}`}>The zombie horde has overrun the academy...</p>
          </>
        )}

        <div className={`rounded-2xl p-4 border ${dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"} shadow-xl`}>
          <h3 className={`font-bold mb-3 ${dark ? "text-white" : "text-slate-800"}`}>📊 Final Standings</h3>
          <div className="space-y-2">
            {sorted.map((l, i) => (
              <div key={l.id} className={`flex items-center gap-3 p-2 rounded-xl ${dark ? "bg-white/5" : "bg-slate-50"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black
                  ${i === 0 ? "bg-yellow-500 text-yellow-900" : i === 1 ? "bg-slate-400 text-slate-900" : "bg-amber-700 text-amber-100"}`}>
                  {i + 1}
                </span>
                <span className="text-xl">{l.isZombie ? "🧟" : l.avatar}</span>
                <span className={`flex-1 text-left font-semibold ${dark ? "text-white" : "text-slate-800"}`}>{l.name}</span>
                <span className="text-yellow-400 font-black">{formatCash(l.cash)}</span>
                <span className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>
                  {l.correctCount}/{l.answeredCount} ✓
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setShowDetails(!showDetails)}
            className={`px-5 py-3 rounded-xl border font-semibold transition-all ${dark ? "border-white/20 text-white/70 hover:bg-white/10" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
            📊 Stats
          </button>
          <button onClick={onRestart}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black shadow-xl transition-all active:scale-95">
            🔄 Play Again!
          </button>
        </div>

        {showDetails && (
          <div className={`rounded-2xl p-4 border text-left ${dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
            <h4 className={`font-bold mb-2 ${dark ? "text-white" : "text-slate-800"}`}>🎯 Session Stats</h4>
            {sorted.map(l => (
              <div key={l.id} className={`text-sm mb-2 ${dark ? "text-slate-400" : "text-slate-600"}`}>
                <strong className={dark ? "text-white" : "text-slate-800"}>{l.name}:</strong>{" "}
                {l.correctCount}/{l.answeredCount} correct • {l.achievements.length} achievements • Best streak: {l.streak}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GAME COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function Game({ learners: initLearners, config, onExit, dark, qBank }: {
  learners: Learner[]; config: GameConfig; onExit: () => void; dark: boolean; qBank: Question[];
}) {
  const [learners, setLearners] = useState<Learner[]>(initLearners);
  const [questions] = useState<Question[]>(() => shuffle(qBank));
  const [qIndex, setQIndex] = useState(0);
  const [activeId, setActiveId] = useState<string>(initLearners[0].id);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(config.questionTimeLimit);
  const [gamePhase, setGamePhase] = useState<"playing" | "shop" | "gameover" | "transition">("playing");
  const [shopLearner, setShopLearner] = useState<Learner | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particleTrigger, setParticleTrigger] = useState(0);
  const [particleType, setParticleType] = useState<"correct" | "wrong" | "zombie" | "levelup">("correct");
  const [winner, setWinner] = useState<Learner | null>(null);
  const [round, setRound] = useState(1);
  const [bombedChoices, setBombedChoices] = useState<string[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<{ ach: Achievement; name: string } | null>(null);
  const [muted, setMuted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [zombieAttackAnim, setZombieAttackAnim] = useState(false);
  const [funFactIdx, setFunFactIdx] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const zombieTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeQ = questions[qIndex % questions.length];
  const activeLearner = learners.find(l => l.id === activeId)!;

  // Sound init
  useEffect(() => {
    soundEngine.init();
    soundEngine.startBgMusic();
    return () => soundEngine.stopBgMusic();
  }, []);

  // Fun fact rotation
  useEffect(() => {
    const t = setInterval(() => setFunFactIdx(i => (i + 1) % config.funFacts.length), 12000);
    return () => clearInterval(t);
  }, [config.funFacts.length]);

  // Timer
  useEffect(() => {
    if (gamePhase !== "playing" || locked) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const t = activeLearner?.speedBoost ? Math.min(config.questionTimeLimit, 10) : config.questionTimeLimit;
    setTimeLeft(t);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        if (prev <= 6) soundEngine.tick();
        if (prev === Math.floor(t * 0.3)) soundEngine.warning();
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qIndex, activeId, gamePhase, locked]);

  // Zombie infection timer
  useEffect(() => {
    zombieTimerRef.current = setInterval(() => {
      setLearners(prev => {
        const humans = prev.filter(l => !l.isZombie);
        const zombies = prev.filter(l => l.isZombie);
        if (zombies.length === 0 || humans.length === 0) return prev;

        // Zombies lose cash slowly
        let updated = prev.map(l => {
          if (!l.isZombie) return l;
          return { ...l, cash: Math.max(0, l.cash - 5) };
        });

        // Random infection attempt every ~15s
        if (Math.random() < 0.08 && humans.length > 0) {
          const target = humans[Math.floor(Math.random() * humans.length)];
          if (target.immune || target.shields > 0) {
            if (target.shields > 0) {
              updated = updated.map(l => l.id === target.id ? { ...l, shields: l.shields - 1 } : l);
              addFloat("🛡️ Blocked!", 50, 50, "text-cyan-400", "lg");
            }
            return updated;
          }
          updated = updated.map(l => l.id === target.id ? { ...l, health: l.health - 1 } : l);
          addFloat(`${target.name} -1 HP 🧟`, 50, 100, "text-red-400", "md");
          soundEngine.zombie();
          setZombieAttackAnim(true);
          setTimeout(() => setZombieAttackAnim(false), 800);

          // Check if target dies
          const updatedTarget = updated.find(l => l.id === target.id)!;
          if (updatedTarget.health <= 0) {
            soundEngine.zombie();
            updated = updated.map(l => l.id === target.id ? { ...l, isZombie: true, health: 3, maxHealth: 3 } : l);
            addFloat(`${target.name} became a 🧟!`, 50, 200, "text-green-400", "lg");
            setParticleType("zombie");
            setParticleTrigger(t => t + 1);
          }
        }

        // Check game over
        const surviving = updated.filter(l => !l.isZombie);
        if (surviving.length === 1 && updated.length > 1) {
          setWinner(surviving[0]);
          setGamePhase("gameover");
        } else if (surviving.length === 0) {
          setWinner(null);
          setGamePhase("gameover");
        }

        return updated;
      });
    }, 3000);
    return () => clearInterval(zombieTimerRef.current!);
  }, []);

  // Check win condition
  useEffect(() => {
    if (round > config.maxRounds && gamePhase === "playing") {
      const top = [...learners].sort((a, b) => b.cash - a.cash)[0];
      setWinner(top);
      setGamePhase("gameover");
    }
  }, [round, config.maxRounds, gamePhase]);

  const addFloat = useCallback((text: string, x: number, y: number, color: string, size: "sm" | "md" | "lg" = "md") => {
    const id = uid();
    setFloatingTexts(prev => [...prev, { id, text, x, y, color, size, life: 2000 }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 2000);
  }, []);

  const handleTimeout = useCallback(() => {
    if (locked) return;
    setLocked("timeout");
    soundEngine.wrong();
    addFloat("⏰ Time's Up!", 200, 50, "text-red-400", "lg");

    // Damage active learner on timeout
    setLearners(prev => prev.map(l => {
      if (l.id !== activeId) return l;
      const newHealth = Math.max(0, l.health - 1);
      const newStreak = 0;
      return { ...l, health: newHealth, streak: newStreak, answeredCount: l.answeredCount + 1 };
    }));

    setTimeout(() => advanceTurn(), 2500);
  }, [locked, activeId]);

  const handleAnswer = useCallback((choice: string) => {
    if (locked || !activeLearner) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedChoice(choice);
    setLocked(choice);

    const isCorrect = choice === activeQ.answer;
    const answerTime = config.questionTimeLimit - timeLeft;
    const speedBonus = answerTime < 5 ? 1.5 : answerTime < 10 ? 1.2 : 1;

    setLearners(prev => prev.map(l => {
      if (l.id !== activeId) return l;

      const newStreak = isCorrect ? l.streak + 1 : 0;
      const mult = l.multiplier * (l.doubleCoins ? 2 : 1);
      const streakBonus = newStreak >= 5 ? 2 : newStreak >= 3 ? 1.5 : 1;
      const earned = isCorrect ? Math.floor(activeQ.cashReward * mult * streakBonus * speedBonus) : 0;
      const xpEarned = isCorrect ? activeQ.xpReward : 0;
      const newXp = l.xp + xpEarned;
      const oldLevel = getLevelInfo(l.xp).level;
      const newLevel = getLevelInfo(newXp).level;

      if (isCorrect && earned > 0) {
        addFloat(`+${formatCash(earned)}`, 300, 80, "text-yellow-400", "lg");
        if (newStreak >= 3) addFloat(`🔥 ${newStreak} STREAK!`, 200, 140, "text-orange-400", "md");
        if (speedBonus > 1.2) addFloat("⚡ SPEED BONUS!", 100, 160, "text-cyan-400", "sm");
      }

      if (newLevel > oldLevel) {
        soundEngine.levelUp();
        addFloat(`⬆️ LEVEL UP! → Lv.${newLevel}`, 200, 200, "text-purple-400", "lg");
        setParticleType("levelup");
        setParticleTrigger(t => t + 1);
      }

      // Check achievements
      const newAchs = [...l.achievements];
      if (isCorrect && l.correctCount === 0 && !newAchs.includes("first_blood")) {
        newAchs.push("first_blood");
        const ach = ACHIEVEMENTS.find(a => a.id === "first_blood")!;
        setActiveAchievement({ ach, name: l.name });
        setTimeout(() => setActiveAchievement(null), 4000);
        soundEngine.achievement();
      }
      if (newStreak >= 3 && !newAchs.includes("streak_3")) {
        newAchs.push("streak_3");
        const ach = ACHIEVEMENTS.find(a => a.id === "streak_3")!;
        setActiveAchievement({ ach, name: l.name });
        setTimeout(() => setActiveAchievement(null), 4000);
        soundEngine.achievement();
      }
      if (newStreak >= 5 && !newAchs.includes("streak_5")) {
        newAchs.push("streak_5");
        const ach = ACHIEVEMENTS.find(a => a.id === "streak_5")!;
        setActiveAchievement({ ach, name: l.name });
        setTimeout(() => setActiveAchievement(null), 4000);
        soundEngine.achievement();
      }
      if (l.cash + earned >= 2000 && !newAchs.includes("rich")) {
        newAchs.push("rich");
        const ach = ACHIEVEMENTS.find(a => a.id === "rich")!;
        setActiveAchievement({ ach, name: l.name });
        setTimeout(() => setActiveAchievement(null), 4000);
        soundEngine.achievement();
      }
      if (answerTime < 5 && !newAchs.includes("speed_demon")) {
        newAchs.push("speed_demon");
        const ach = ACHIEVEMENTS.find(a => a.id === "speed_demon")!;
        setActiveAchievement({ ach, name: l.name });
        setTimeout(() => setActiveAchievement(null), 4000);
        soundEngine.achievement();
      }

      return {
        ...l,
        cash: l.cash + earned,
        streak: newStreak,
        xp: newXp,
        level: newLevel,
        answeredCount: l.answeredCount + 1,
        correctCount: l.correctCount + (isCorrect ? 1 : 0),
        lastAnswerTime: answerTime,
        doubleCoins: false,
        speedBoost: false,
      };
    }));

    if (isCorrect) {
      soundEngine.correct();
      setParticleType("correct");
      setParticleTrigger(t => t + 1);
    } else {
      soundEngine.wrong();
      setParticleType("wrong");
      setParticleTrigger(t => t + 1);
    }

    setTimeout(() => advanceTurn(), 2500);
  }, [locked, activeLearner, activeQ, activeId, timeLeft, config.questionTimeLimit, addFloat]);

  const advanceTurn = useCallback(() => {
    setSelectedChoice(null);
    setLocked(null);
    setBombedChoices([]);

    const humans = learners.filter(l => !l.isZombie);

    if (humans.length === 0) { setWinner(null); setGamePhase("gameover"); return; }
    if (humans.length === 1 && learners.length > 1) { setWinner(humans[0]); setGamePhase("gameover"); return; }

    // Find next learner (cycle through all, skip zombies sometimes)
    const currentIdx = learners.findIndex(l => l.id === activeId);
    let nextIdx = (currentIdx + 1) % learners.length;
    let tries = 0;
    while (tries < learners.length) {
      const next = learners[nextIdx];
      if (!next.isZombie) break;
      nextIdx = (nextIdx + 1) % learners.length;
      tries++;
    }

    const nextLearner = learners[nextIdx];
    if (!nextLearner || nextLearner.isZombie) {
      // All zombies — game over
      setWinner(null);
      setGamePhase("gameover");
      return;
    }

    setActiveId(nextLearner.id);
    setQIndex(i => i + 1);
    setRound(r => r + 1);
    setGamePhase("playing");
  }, [learners, activeId]);

  const handleBuyItem = useCallback((item: ShopItem) => {
    if (!shopLearner) return;
    const learner = learners.find(l => l.id === shopLearner.id);
    if (!learner || learner.cash < item.cost) return;

    soundEngine.purchase();

    setLearners(prev => prev.map(l => {
      if (l.id !== shopLearner.id) return l;

      let updates: Partial<Learner> = {
        cash: l.cash - item.cost,
        inventory: [...l.inventory, item.id],
        powerupsUsed: l.powerupsUsed + 1,
      };

      // Apply immediate effects
      if (item.effect === "shield") updates.shields = (l.shields || 0) + 1;
      if (item.effect === "heal") updates.health = Math.min(l.maxHealth, l.health + 2);
      if (item.effect === "double") updates.doubleCoins = true;
      if (item.effect === "triple") updates.multiplier = (l.multiplier || 1) * 3;
      if (item.effect === "immune") updates.immune = true;
      if (item.effect === "speed") updates.speedBoost = true;
      if (item.effect === "resurrect") {
        if (l.isZombie) updates = { ...updates, isZombie: false, health: 3, maxHealth: 5 };
      }
      if (item.effect === "bomb") setBombedChoices(shuffle(activeQ.choices.filter(c => c !== activeQ.answer)).slice(0, 2));
      if (item.effect === "nuke") {
        setLearners(pp => pp.map(pl => ({ ...pl, isZombie: false, health: Math.max(1, pl.health) })));
        addFloat("☢️ NUKE! All Zombies Cured!", 100, 100, "text-yellow-400", "lg");
      }
      if (item.effect === "steal") {
        const others = prev.filter(pl => pl.id !== l.id && !pl.isZombie);
        if (others.length > 0) {
          const victim = others[Math.floor(Math.random() * others.length)];
          setLearners(pp => pp.map(pl => pl.id === victim.id ? { ...pl, cash: Math.max(0, pl.cash - 100) } : pl));
          addFloat(`🗡️ Stole $100 from ${victim.name}!`, 100, 200, "text-red-400", "md");
          updates.cash = (updates.cash as number) + 100;
        }
      }
      if (item.effect === "jackpot") {
        const win = Math.random() > 0.4;
        if (win) {
          addFloat("🎰 JACKPOT! +$1500!", 100, 100, "text-yellow-400", "lg");
          updates.cash = (updates.cash as number) + 1500;
        } else {
          addFloat("🎰 No luck...", 100, 100, "text-slate-400", "md");
        }
      }
      if (item.effect === "freeze") setTimeLeft(t => t + 15);

      // Check shop achievement
      const newAchs = [...l.achievements];
      if (l.powerupsUsed >= 2 && !newAchs.includes("shopper")) {
        newAchs.push("shopper");
        const ach = ACHIEVEMENTS.find(a => a.id === "shopper")!;
        setActiveAchievement({ ach, name: l.name });
        setTimeout(() => setActiveAchievement(null), 4000);
        soundEngine.achievement();
        updates.achievements = newAchs;
      }

      return { ...l, ...updates };
    }));

    addFloat(`🛒 ${item.name} purchased!`, 50, 100, "text-emerald-400", "md");
    setShopLearner(prev => prev ? { ...prev, ...learners.find(l => l.id === prev.id)! } : prev);
  }, [shopLearner, learners, activeQ, addFloat]);

  const humanCount = learners.filter(l => !l.isZombie).length;
  const zombieCount = learners.filter(l => l.isZombie).length;

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden ${dark ? "text-white" : "text-slate-800"}`}>
      {/* Background */}
      <div className="fixed inset-0 z-0">
        {/* Background — a CSS gradient, not /hero-bg.jpg (missing everywhere, so it 404'd). */}
        <div
          className={`w-full h-full ${zombieCount > 0 ? "opacity-40" : "opacity-20"} transition-opacity duration-2000`}
          style={{
            background:
              zombieCount > 0
                ? "linear-gradient(160deg, #052e16 0%, #166534 60%, #0f172a 100%)"
                : "linear-gradient(160deg, #1e1b4b 0%, #312e81 55%, #0f172a 100%)",
          }}
        />
        <div className={`absolute inset-0 ${dark
          ? zombieCount > 0
            ? "bg-gradient-to-br from-slate-950/85 via-green-950/70 to-slate-950/90"
            : "bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-indigo-950/80"
          : "bg-gradient-to-br from-white/90 via-slate-50/85 to-blue-50/80"}`} />
        {/* Zombie horde overlay */}
        {zombieCount > 0 && (
          <div className={`absolute bottom-0 right-0 w-1/3 h-1/2 transition-all duration-1000 ${zombieAttackAnim ? "opacity-60 scale-110" : "opacity-30"}`}>
            {/* Horde overlay — a radial glow, not /zombie-horde.png (missing everywhere). */}
            <div
              className="w-full h-full"
              style={{ background: "radial-gradient(circle at 70% 80%, rgba(34,197,94,0.85) 0%, rgba(21,128,61,0.45) 35%, rgba(5,46,22,0) 70%)" }}
            />
          </div>
        )}
      </div>

      {/* Particle System */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <ParticleSystem trigger={particleTrigger} type={particleType} />
      </div>

      {/* Floating Texts */}
      <FloatingTexts texts={floatingTexts} />

      {/* Achievement Toast */}
      {activeAchievement && (
        <AchievementToast achievement={activeAchievement.ach} learnerName={activeAchievement.name} dark={dark} />
      )}

      {/* Game Over */}
      {gamePhase === "gameover" && (
        <GameOverScreen learners={learners} winner={winner} onRestart={onExit} dark={dark} />
      )}

      {/* Shop */}
      {gamePhase === "shop" && shopLearner && (
        <ShopPanel
          learner={learners.find(l => l.id === shopLearner.id) || shopLearner}
          onBuy={handleBuyItem}
          onClose={() => { setGamePhase("playing"); setShopLearner(null); }}
          dark={dark}
        />
      )}

      {/* ── TOP BAR ── */}
      <header className={`relative z-20 flex items-center gap-3 px-4 py-3 border-b backdrop-blur-md ${dark ? "bg-black/30 border-white/10" : "bg-white/70 border-slate-200"}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">🧟</span>
          <div className="min-w-0">
            <div className={`font-orbitron font-black text-sm md:text-base truncate ${dark ? "text-white" : "text-slate-800"}`}>
              {config.lessonTitle}
            </div>
            <div className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
              Round {round}/{config.maxRounds} · {config.tutorName}
            </div>
          </div>
        </div>

        {/* Status Counts */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${dark ? "bg-blue-500/20 border border-blue-500/30" : "bg-blue-50 border border-blue-200"}`}>
            <span className="text-sm">🧑</span>
            <span className={`text-xs font-bold ${dark ? "text-blue-300" : "text-blue-700"}`}>{humanCount}</span>
          </div>
          {zombieCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/30 animate-pulse">
              <span className="text-sm">🧟</span>
              <span className="text-xs font-bold text-green-300">{zombieCount}</span>
            </div>
          )}
          <button onClick={() => { soundEngine.init(); const m = soundEngine.toggleMute(); setMuted(m); }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${dark ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"}`}>
            {muted ? "🔇" : "🔊"}
          </button>
          <button onClick={() => setShowLeaderboard(!showLeaderboard)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${dark ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"}`}>
            🏆
          </button>
        </div>
      </header>

      {/* ── MAIN LAYOUT ── */}
      <div className="relative z-10 flex flex-1 gap-4 p-4 overflow-hidden">

        {/* LEFT: Player Cards */}
        <aside className="w-48 md:w-56 flex flex-col gap-3 overflow-y-auto shrink-0">
          <div className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-slate-400" : "text-slate-500"}`}>
            Players
          </div>
          {learners.map(l => (
            <LearnerCard
              key={l.id} learner={l} isActive={l.id === activeId} dark={dark}
              onTakeTurn={() => {
                setShopLearner(l);
                setGamePhase("shop");
              }}
            />
          ))}

          {/* Fun Fact */}
          {config.funFacts.length > 0 && (
            <div className={`mt-2 p-3 rounded-xl border text-xs ${dark ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-300/80" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
              <div className="font-bold mb-1">🤯 Did you know?</div>
              <div>{config.funFacts[funFactIdx % config.funFacts.length]}</div>
            </div>
          )}
        </aside>

        {/* CENTER: Question */}
        <main className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
          {/* Active Player Banner */}
          {activeLearner && (
            <div className={`flex items-center gap-3 p-3 rounded-2xl border ${dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"} shadow-lg`}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${activeLearner.color} flex items-center justify-center text-2xl shadow-md`}>
                {activeLearner.isZombie ? "🧟" : activeLearner.avatar}
              </div>
              <div className="flex-1">
                <div className={`font-black text-lg ${dark ? "text-white" : "text-slate-800"}`}>
                  {activeLearner.name}'s Turn
                  <span className="ml-2 animate-pulse text-yellow-400">▶</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-yellow-400 font-bold text-sm">{formatCash(activeLearner.cash)}</span>
                  {activeLearner.streak >= 2 && <span className="text-orange-400 text-sm">🔥 {activeLearner.streak}</span>}
                  {activeLearner.doubleCoins && <span className="text-cyan-400 text-xs font-bold">⚡ 2×</span>}
                  {activeLearner.immune && <span className="text-emerald-400 text-xs font-bold">🧪 Immune</span>}
                </div>
              </div>
              <button
                onClick={() => { setShopLearner(activeLearner); setGamePhase("shop"); }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-95 shadow-lg">
                🛒 Shop
              </button>
            </div>
          )}

          {/* Question */}
          <div className="relative">
            <QuestionPanel
              question={activeQ}
              selectedChoice={selectedChoice}
              locked={locked}
              timeLeft={timeLeft}
              timeMax={activeLearner?.speedBoost ? Math.min(config.questionTimeLimit, 10) : config.questionTimeLimit}
              onAnswer={handleAnswer}
              dark={dark}
              bombedChoices={bombedChoices}
            />
          </div>

          {/* Zombie Warning */}
          {zombieCount > 0 && (
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${dark ? "bg-green-900/30 border-green-500/40" : "bg-green-50 border-green-300"} animate-pulse`}>
              <span className="text-2xl">🧟</span>
              <div>
                <div className={`font-bold text-sm ${dark ? "text-green-300" : "text-green-700"}`}>
                  ⚠️ Zombie Horde Active! {zombieCount} zombie{zombieCount > 1 ? "s" : ""} hunting survivors!
                </div>
                <div className={`text-xs ${dark ? "text-green-500" : "text-green-600"}`}>
                  Buy shields and vaccines from the shop to protect yourself!
                </div>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT: Leaderboard & Stats */}
        <aside className="w-44 md:w-52 flex flex-col gap-3 overflow-y-auto shrink-0">
          <div className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-slate-400" : "text-slate-500"}`}>
            Leaderboard
          </div>
          <Leaderboard learners={learners} dark={dark} />

          {/* Round Progress */}
          <div className={`p-3 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
            <div className={`text-xs font-bold mb-2 ${dark ? "text-slate-400" : "text-slate-500"}`}>Round Progress</div>
            <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(round / config.maxRounds) * 100}%` }} />
            </div>
            <div className={`text-xs mt-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>{round}/{config.maxRounds}</div>
          </div>

          {/* Zombie meter */}
          {zombieCount > 0 && (
            <div className={`p-3 rounded-xl border ${dark ? "bg-green-900/30 border-green-500/30" : "bg-green-50 border-green-200"}`}>
              <div className="text-xs font-bold text-green-400 mb-2">🧟 Zombie Threat</div>
              <ZombieTimer value={humanCount} max={learners.length} />
              <div className="text-xs text-green-500 mt-1">{humanCount} survivors left</div>
            </div>
          )}

          {/* Quick Items reminder */}
          <div className={`p-3 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
            <div className={`text-xs font-bold mb-2 ${dark ? "text-slate-400" : "text-slate-500"}`}>💡 Quick Tips</div>
            <div className={`text-xs space-y-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
              <div>🔥 Streaks = bonus cash!</div>
              <div>⚡ Fast answers = more $!</div>
              <div>🛡️ Buy shields vs zombies</div>
              <div>🏪 Click players to shop</div>
            </div>
          </div>

          {/* Zombie image */}
          <div className={`rounded-xl overflow-hidden border ${dark ? "border-white/10" : "border-slate-200"}`}>
            <img
              src="https://images.pexels.com/photos/5435459/pexels-photo-5435459.jpeg?auto=compress&cs=tinysrgb&w=200&h=120&fit=crop"
              alt="zombies"
              className={`w-full h-20 object-cover ${zombieCount > 0 ? "opacity-80 saturate-150" : "opacity-40 grayscale"} transition-all duration-1000`}
            />
          </div>
        </aside>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLeaderboard(false)} />
          <div className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-6 ${dark ? "bg-slate-900 border-white/20" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-black ${dark ? "text-white" : "text-slate-800"}`}>🏆 Live Standings</h2>
              <button onClick={() => setShowLeaderboard(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">✕</button>
            </div>
            <Leaderboard learners={learners} dark={dark} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export function HumansVsZombiesMode(props: any) {
  const [dark, setDark] = useState(true);
  const [screen, setScreen] = useState<"setup" | "game">("setup");
  const [gameLearners, setGameLearners] = useState<Learner[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  const safeQBank = Array.isArray(props.payload?.questions) && props.payload.questions.length > 0 
    ? props.payload.questions.map((q: any) => ({
      id: q.id,
      text: q.prompt,
      choices: q.choices || [],
      answer: q.answer,
      image: q.image || undefined,
      subject: q.category || "Study",
      difficulty: q.difficulty || "medium",
      explanation: q.explanation || "No explanation provided.",
      cashReward: q.points * 10,
      xpReward: q.points * 2,
      timeLimit: 30,
    }))
    : QUESTION_BANK;

  const handleStart = useCallback((learners: Learner[], config: GameConfig) => {
    setGameLearners(learners);
    setGameConfig(config);
    setScreen("game");
  }, []);

  const handleExit = useCallback(() => {
    setScreen("setup");
    setGameLearners([]);
  }, []);

  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      <div className={`${dark ? "dark" : ""} font-rajdhani`}>
        {/* Theme toggle */}
        <button
          onClick={() => setDark(d => !d)}
          className={`fixed top-4 right-4 z-[500] w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-xl transition-all border backdrop-blur-md
            ${dark ? "bg-slate-800/90 border-white/20 hover:bg-slate-700" : "bg-white/90 border-slate-200 hover:bg-slate-50"}`}>
          {dark ? "☀️" : "🌙"}
        </button>

        {/* Home Back Button */}
        {props.onBack && (
          <button
            onClick={props.onBack}
            className={`fixed top-4 left-4 z-[500] px-4 py-2 rounded-xl text-sm font-bold shadow-xl transition-all border backdrop-blur-md
              ${dark ? "bg-slate-800/90 border-white/20 hover:bg-slate-700 text-white" : "bg-white/90 border-slate-200 hover:bg-slate-50 text-slate-800"}`}>
            ← Hub
          </button>
        )}

        {screen === "setup" ? (
          <SetupScreen onStart={handleStart} dark={dark} />
        ) : (
          <Game learners={gameLearners} config={gameConfig} onExit={handleExit} dark={dark} qBank={safeQBank} />
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
