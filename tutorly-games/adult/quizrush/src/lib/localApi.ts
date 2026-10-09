"use client";
/**
 * Everything the seven `/api/…` route handlers used to do, in the browser.
 *
 * QuizRush ships as a **static export** (see `next.config.ts`), which is what lets
 * the Game Hub open it from a plain folder URL with no server and no database. A
 * static export cannot have route handlers, so the endpoints are gone and this
 * module is what replaced them — same request fields, same response fields, same
 * maths, same error strings:
 *
 *   POST   /api/games                    → createGame()
 *   GET    /api/games/:code              → getGame()
 *   PATCH  /api/games/:code              → controlGame()   (start / next / prev / goto / end)
 *   POST   /api/games/:code/join         → joinGame()
 *   POST   /api/games/:code/answer       → answerGame()
 *   POST   /api/games/:code/shop         → buyUpgrade()
 *   GET    /api/players/:id              → getPlayer()
 *
 * A game, its players, their economies and the answer log live in `localStorage`,
 * and every write is announced on a `BroadcastChannel` so a host window and a
 * player window on the same machine react immediately instead of waiting for the
 * next poll. That is the one thing the database bought that a static folder
 * cannot: players on OTHER devices. The host lobby says so rather than pretending
 * the QR code works across devices.
 *
 * The economy maths is NOT re-implemented here — `lib/economy.ts` was already pure
 * and shared by client and server, exactly as its comment promised.
 */
import { defaultEconomy, computeScore, type ScoreResult } from "./economy";
import { checkAnswer, genCode } from "./quiz";
import {
  MULTIPLIER_COSTS,
  STREAK_COSTS,
  INSURANCE_COSTS,
  POWERUPS,
  type PlayerEconomy,
  type Question,
} from "./types";

/* ─────────────────────────────── storage ─────────────────────────────── */

const GAMES_KEY = "quizrush:games";
const QUIZZES_KEY = "quizrush:quizzes";
const SEQ_KEY = "quizrush:seq";
const ANSWERS_KEY = (code: string) => `quizrush:answers:${code}`;
const PLAYERS_KEY = (code: string) => `quizrush:players:${code}`;
const CHANNEL = "quizrush";

export interface GameRow {
  id: number;
  code: string;
  quizId: number;
  title: string;
  questions: Question[];
  status: "lobby" | "live" | "ended";
  currentQuestion: number;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerRow {
  id: number;
  gameId: number;
  name: string;
  avatar: string;
  cash: number;
  streak: number;
  correctCount: number;
  answeredCount: number;
  lastRank: number;
  wrongAnswers: unknown[];
  state: { economy: PlayerEconomy };
  connected: boolean;
  lastSeen: string;
}

/** Every write is announced here so the other window in this browser reacts now. */
let channel: BroadcastChannel | null = null;
function bus(code?: string): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  if (!channel) channel = new BroadcastChannel(CHANNEL);
  channel.postMessage({ type: "game", code: code ?? "" });
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T | null;
    return parsed ?? fallback;
  } catch {
    // A corrupt entry must not take the lesson down — start from empty instead.
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode, or the quota is full. The game in front of the class is not
    // worth interrupting for this, so it stays silent and play continues.
  }
}

/** Ids are unique per browser, exactly like the serial columns were per database. */
function nextId(): number {
  const n = read<number>(SEQ_KEY, 0) + 1;
  write(SEQ_KEY, n);
  return n;
}

const games = () => read<GameRow[]>(GAMES_KEY, []);
const players = (code: string) => read<PlayerRow[]>(PLAYERS_KEY(code), []);

function findGame(code: string): GameRow | null {
  return games().find((g) => g.code === code.toUpperCase()) ?? null;
}

function saveGame(game: GameRow): void {
  write(GAMES_KEY, [game, ...games().filter((g) => g.id !== game.id)].slice(0, 30));
}

/* ─────────────────────────── create a game ─────────────────────────── */

/**
 * `POST /api/games` — the Copy-AI flow and the demo both land here.
 *
 * An empty question set falls back to the sample quiz, exactly as the route did;
 * the set is also kept in the quiz bank (`quizzes` in the old schema) so this
 * browser accumulates the quizzes it has hosted.
 */
export function createGame(body: {
  title?: string;
  description?: string;
  questions?: Question[];
  settings?: Record<string, unknown>;
  sample?: { title: string; questions: Question[] };
}): { game: { id: number; code: string; title: string } } {
  const sample = body.sample ?? { title: "Untitled Quiz", questions: [] };
  let title = body.title || sample.title;
  let questions = Array.isArray(body.questions) ? body.questions : [];
  if (!questions.length) {
    questions = sample.questions;
    title = sample.title;
  }

  const quizId = nextId();
  write(QUIZZES_KEY, [
    { id: quizId, title, description: body.description || "", questions, createdAt: new Date().toISOString() },
    ...read<unknown[]>(QUIZZES_KEY, []),
  ].slice(0, 30));

  let code = genCode();
  for (let i = 0; i < 5 && findGame(code); i++) code = genCode();

  const now = new Date().toISOString();
  const game: GameRow = {
    id: nextId(),
    code,
    quizId,
    title,
    questions,
    status: "lobby",
    currentQuestion: -1,
    settings: body.settings || {},
    createdAt: now,
    updatedAt: now,
  };
  saveGame(game);
  write(PLAYERS_KEY(code), []);
  write(ANSWERS_KEY(code), []);
  bus(code);
  return { game: { id: game.id, code: game.code, title: game.title } };
}

/* ──────────────────────────── read a game ──────────────────────────── */

/** `GET /api/games/:code` — what the host board and every player device polls. */
export function getGame(code: string): {
  game: {
    id: number; code: string; title: string; status: string;
    currentQuestion: number; totalQuestions: number; settings: Record<string, unknown>;
  };
  currentQuestion: Question | null;
  players: Array<{
    id: number; name: string; avatar: string; cash: number; streak: number;
    correctCount: number; answeredCount: number; rank: number; lastRank: number; connected: boolean;
  }>;
} | null {
  const game = findGame(code);
  if (!game) return null;
  const roster = [...players(game.code)].sort((a, b) => b.cash - a.cash);
  const questions = game.questions;
  return {
    game: {
      id: game.id,
      code: game.code,
      title: game.title,
      status: game.status,
      currentQuestion: game.currentQuestion,
      totalQuestions: questions.length,
      settings: game.settings,
    },
    // Only the current question is sent, exactly like the route did.
    currentQuestion:
      game.currentQuestion >= 0 && game.currentQuestion < questions.length
        ? questions[game.currentQuestion]
        : null,
    players: roster.map((p, i) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      cash: p.cash,
      streak: p.streak,
      correctCount: p.correctCount,
      answeredCount: p.answeredCount,
      rank: i + 1,
      lastRank: p.lastRank,
      connected: p.connected,
    })),
  };
}

/* ────────────────────────── host controls ────────────────────────── */

/** `PATCH /api/games/:code` — start / next / prev / goto / end. */
export function controlGame(
  code: string,
  body: { action: string; index?: number },
): { ok: true; status: string; currentQuestion: number } | { error: string } {
  const game = findGame(code);
  if (!game) return { error: "Game not found" };

  let status = game.status;
  let current = game.currentQuestion;

  if (body.action === "start") {
    status = "live";
    current = 0;
  } else if (body.action === "next") {
    current = Math.min(current + 1, game.questions.length);
    if (current >= game.questions.length) status = "ended";
  } else if (body.action === "prev") {
    current = Math.max(0, current - 1);
  } else if (body.action === "goto" && typeof body.index === "number") {
    current = Math.max(0, Math.min(body.index, game.questions.length - 1));
    status = "live";
  } else if (body.action === "end") {
    status = "ended";
  }

  saveGame({ ...game, status, currentQuestion: current, updatedAt: new Date().toISOString() });
  bus(game.code);
  return { ok: true, status, currentQuestion: current };
}

/* ────────────────────────────── joining ────────────────────────────── */

/** `POST /api/games/:code/join` — a learner's device enters the game. */
export function joinGame(
  code: string,
  body: { name?: string; avatar?: string },
): { playerId: number; gameId: number; code: string; name: string; avatar: string } | { error: string } {
  const game = findGame(code);
  if (!game) return { error: "Game not found" };
  if (game.status === "ended") return { error: "This game has ended" };

  const name = String(body.name || "").trim().slice(0, 20) || "Player";
  const avatar = String(body.avatar || "🦊");
  const player: PlayerRow = {
    id: nextId(),
    gameId: game.id,
    name,
    avatar,
    cash: 0,
    streak: 0,
    correctCount: 0,
    answeredCount: 0,
    lastRank: 0,
    wrongAnswers: [],
    state: { economy: defaultEconomy() },
    connected: true,
    lastSeen: new Date().toISOString(),
  };
  write(PLAYERS_KEY(game.code), [...players(game.code), player]);
  bus(game.code);
  return { playerId: player.id, gameId: game.id, code: game.code, name: player.name, avatar: player.avatar };
}

/** `GET /api/players/:id` — the player's own cash, streak, shop levels and misses. */
export function getPlayer(id: number): {
  id: number; name: string; avatar: string; cash: number; streak: number;
  correctCount: number; answeredCount: number; economy: PlayerEconomy; wrongAnswers: unknown[];
} | null {
  const found = games().map((g) => ({ game: g, player: players(g.code).find((p) => p.id === id) }))
    .find((x) => x.player);
  if (!found || !found.player) return null;
  const economy = found.player.state?.economy ?? defaultEconomy();
  return {
    id: found.player.id,
    name: found.player.name,
    avatar: found.player.avatar,
    cash: found.player.cash,
    streak: found.player.streak,
    correctCount: found.player.correctCount,
    answeredCount: found.player.answeredCount,
    // Hide internal effect markers (prefixed with __) from the client inventory.
    economy: { ...economy, powerups: economy.powerups.filter((p) => !p.startsWith("__")) },
    wrongAnswers: found.player.wrongAnswers || [],
  };
}

/* ───────────────────────────── answering ───────────────────────────── */

export type AnswerRequest = {
  playerId: number;
  questionIndex: number;
  response: unknown;
  activatedPowerups?: string[];
};

export type AnswerResponse =
  | { error: string; duplicate?: boolean }
  | {
      correct: boolean;
      cashDelta: number;
      newCash: number;
      newStreak: number;
      breakdown: string[];
      consumedPowerups: string[];
      droppedPowerup: string | null;
      correctAnswer: unknown;
      explanation: string | undefined;
      powerups: string[];
    };

/**
 * `POST /api/games/:code/answer` — the whole round: score it, spend the power-ups
 * the player armed, drop a new power-up every third correct answer, and resolve
 * the two cross-player effects (Heist steals from a random opponent, Sabotage
 * halves the leader's next reward).
 */
export function answerGame(code: string, body: AnswerRequest): AnswerResponse {
  const game = findGame(code);
  if (!game) return { error: "Game not found" };

  const roster = players(game.code);
  const player = roster.find((p) => p.id === body.playerId);
  if (!player) return { error: "Player not found" };

  const q = game.questions[body.questionIndex];
  if (!q) return { error: "Invalid question" };

  const answered = read<Array<{ playerId: number; questionIndex: number }>>(ANSWERS_KEY(game.code), []);
  if (answered.some((a) => a.playerId === body.playerId && a.questionIndex === body.questionIndex)) {
    return { error: "Already answered", duplicate: true };
  }

  const economy: PlayerEconomy = player.state?.economy ?? defaultEconomy();
  const activated = Array.isArray(body.activatedPowerups) ? body.activatedPowerups : [];
  // Only power-ups the player actually owns AND armed for this turn.
  const activeForTurn = economy.powerups.filter((p) => activated.includes(p));

  const correct = checkAnswer(q, body.response);
  const result: ScoreResult = computeScore({
    correct,
    streakBefore: player.streak,
    economy: { ...economy, powerups: activeForTurn },
  });

  const remainingPowerups = economy.powerups.filter((p) => !result.consumedPowerups.includes(p));
  const newCash = Math.max(0, player.cash + result.cashDelta);
  const newEconomy: PlayerEconomy = { ...economy, powerups: remainingPowerups };

  // Keep the misses: they become the learner's flashcards and teaching slides.
  const wrong = [...(player.wrongAnswers || [])];
  if (!correct) {
    wrong.push({
      questionIndex: body.questionIndex,
      question: q.question,
      type: q.type,
      choices: q.choices,
      correctAnswer: q.answer,
      yourAnswer: body.response,
      explanation: q.explanation,
      slide: q.slide,
      passage: q.passage,
      audioText: q.audioText,
      dialogue: q.dialogue,
    });
  }

  // Power-up drop: every third correct answer, or immediately with Lucky Clover.
  const newCorrect = player.correctCount + (correct ? 1 : 0);
  let dropped: string | null = null;
  const forceDrop = result.consumedPowerups.includes("lucky") && correct;
  if ((correct && newCorrect % 3 === 0) || forceDrop) {
    const pick = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    dropped = pick.id;
    newEconomy.powerups = [...newEconomy.powerups, pick.id];
  }

  // ===== cross-player effects =====
  let finalCash = newCash;
  const extraBreakdown: string[] = [];
  const others = roster.filter((p) => p.id !== player.id);

  if (result.consumedPowerups.includes("steal") && correct) {
    const victims = others.filter((o) => o.cash > 0);
    if (victims.length) {
      const victim = victims[Math.floor(Math.random() * victims.length)];
      const amount = Math.min(150, victim.cash);
      write(PLAYERS_KEY(game.code), players(game.code).map((p) => (p.id === victim.id ? { ...p, cash: victim.cash - amount } : p)));
      finalCash += amount;
      extraBreakdown.push(`Heist 🦹 stole $${amount} from ${victim.name}`);
    }
  }
  if (result.consumedPowerups.includes("sabotage")) {
    const leader = others.slice().sort((a, b) => b.cash - a.cash)[0];
    if (leader) {
      const eco = leader.state?.economy ?? defaultEconomy();
      const marked = eco.powerups.includes("__sabotaged") ? eco.powerups : [...eco.powerups, "__sabotaged"];
      write(PLAYERS_KEY(game.code), players(game.code).map((p) => (p.id === leader.id ? { ...p, state: { economy: { ...eco, powerups: marked } } } : p)));
      extraBreakdown.push(`Sabotage 💣 hit the leader ${leader.name}`);
    }
  }
  // If THIS player was sabotaged, a correct reward is halved and the mark cleared.
  if (correct && newEconomy.powerups.includes("__sabotaged")) {
    const half = Math.round((finalCash - player.cash) / 2);
    finalCash = player.cash + half;
    newEconomy.powerups = newEconomy.powerups.filter((p) => p !== "__sabotaged");
    extraBreakdown.push("You were Sabotaged 💣 — reward halved");
  }

  const finalRoster = players(game.code).map((p) =>
    p.id === player.id
      ? {
          ...p,
          cash: finalCash,
          streak: result.newStreak,
          correctCount: newCorrect,
          answeredCount: p.answeredCount + 1,
          wrongAnswers: wrong,
          state: { economy: newEconomy },
          lastSeen: new Date().toISOString(),
        }
      : p,
  );
  write(PLAYERS_KEY(game.code), finalRoster);
  write(ANSWERS_KEY(game.code), [...answered, { playerId: player.id, questionIndex: body.questionIndex, correct, cashDelta: result.cashDelta }].slice(-500));
  bus(game.code);

  return {
    correct,
    cashDelta: finalCash - player.cash,
    newCash: finalCash,
    newStreak: result.newStreak,
    breakdown: [...result.breakdown, ...extraBreakdown],
    consumedPowerups: result.consumedPowerups,
    droppedPowerup: dropped,
    correctAnswer: q.answer,
    explanation: q.explanation,
    powerups: newEconomy.powerups,
  };
}

/* ──────────────────────────────── shop ──────────────────────────────── */

/** `POST /api/games/:code/shop` — buy the next level of an upgrade. */
export function buyUpgrade(
  code: string,
  body: { playerId: number; item: "multiplier" | "streak" | "insurance" | string },
): { ok: true; newCash: number; economy: PlayerEconomy } | { error: string } {
  const game = findGame(code);
  if (!game) return { error: "Game not found" };
  const player = players(game.code).find((p) => p.id === body.playerId);
  if (!player) return { error: "Player not found" };

  const economy: PlayerEconomy = player.state?.economy ?? defaultEconomy();
  let cost = 0;
  let maxed = false;

  if (body.item === "multiplier") {
    const next = economy.multiplierLevel + 1;
    if (next > 5) maxed = true;
    else cost = MULTIPLIER_COSTS[next];
  } else if (body.item === "streak") {
    const next = economy.streakLevel + 1;
    if (next > 5) maxed = true;
    else cost = STREAK_COSTS[next];
  } else if (body.item === "insurance") {
    const next = economy.insuranceLevel + 1;
    if (next > 3) maxed = true;
    else cost = INSURANCE_COSTS[next];
  } else {
    return { error: "Unknown item" };
  }

  if (maxed) return { error: "Already max level" };
  if (player.cash < cost) return { error: "Not enough cash" };

  const newEconomy: PlayerEconomy = { ...economy };
  if (body.item === "multiplier") newEconomy.multiplierLevel += 1;
  if (body.item === "streak") newEconomy.streakLevel += 1;
  if (body.item === "insurance") newEconomy.insuranceLevel += 1;

  const newCash = player.cash - cost;
  write(PLAYERS_KEY(game.code), players(game.code).map((p) => (p.id === player.id ? { ...p, cash: newCash, state: { economy: newEconomy } } : p)));
  bus(game.code);
  return { ok: true, newCash, economy: newEconomy };
}
