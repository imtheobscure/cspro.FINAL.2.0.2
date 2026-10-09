// ============================================================
// Tutorly Snake & Ladder — Personalized Speaking Survival Game
// Single-file premium UX for teaching:
// - Learners + optional Actors (traits, dialogue, luck)
// - AI prompt generator -> paste JSON -> fully personalized game
// - Credits economy + shop actions
// - Convince-the-group voting rounds + role-play rounds
// - Spotlight camera (zoom focus on current square)
// Light mode default + Dark mode toggle
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoardLinks, BoardTokens, TileArt, type BoardLink, type CellArtKind, type TrailDot } from "./boardArt";
import {
  BloodSplatter,
  DripCurtain,
  GrainOverlay,
  SCARE_CSS,
  ScareCredit,
  ScarePhotoLayer,
  pickScarePhoto,
  preloadScarePhotos,
} from "./horrorArt";
import { PlayerSetup, SplashScreen } from "./GameShell";
import type { ShellPlayer, ShellSetupConfig, ShellSetupResult, ShellSplashConfig } from "./GameShell";
import {
  buildSnakePackPrompt,
  buildSnakeShellPrompt,
  parseSnakePack,
  validateSnakePackJson,
  type SnakePack,
} from "./gamePack";

const TOTAL_CELLS = 50;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type GameMode = "kids" | "adult";
export type PlayerRole = "learner" | "actor";
export type ActorRole = "guide" | "rival" | "trickster" | "support";
export type ScenarioKind = "standard" | "convince" | "roleplay";

export type LuckRules = {
  maxAdjustment: 0 | 1;
  strength: number; // 0..1
};

export interface DecisionScenario {
  id: string;
  kind?: ScenarioKind;
  title: string;
  grammarFocus: string;
  speakingPrompt: string;
  situation: string;
  hostIntro: string;
  choices: {
    id: string;
    text: string;
    consequence: string;
    effects: { health?: number; hunger?: number; energy?: number; morale?: number; credits?: number };
    hostReaction: string;
  }[];
}

export interface SnakeLadderCell {
  type:
    | "snake"
    | "ladder"
    | "decision"
    | "oasis"
    | "death"
    | "jumpscare"
    | "start"
    | "finish";
  emoji: string;
  label: string;
  description: string;
  hostComment: string;
  destination?: number;
  decisionId?: string;
}

export interface PlayerProfile {
  id: string;
  role: PlayerRole;
  name: string;
  avatar: string;
  color: string;

  // Learner personalization
  from?: string;
  interests?: string[];
  strengths?: string[];
  facts?: string;

  // NPC personalization
  traits?: string[];
  dialogueLines?: string[];
  luckRate?: number; // 0..10
  actorRole?: ActorRole;
  voiceURI?: string | null; // per-NPC browser voice
}

export interface RuntimePlayer {
  id: string;
  role: PlayerRole;
  actorRole: ActorRole;

  name: string;
  avatar: string;
  color: string;

  from?: string;
  interests: string[];
  strengths: string[];
  facts?: string;
  traits: string[];
  dialogueLines: string[];
  luckRate: number; // 0..10
  voiceURI: string | null; // per-NPC browser voice

  position: number;
  health: number;
  hunger: number;
  energy: number;
  morale: number;

  credits: number;

  // shop inventory
  shield: number;
  antidote: number;

  isAlive: boolean;
  turnsPlayed: number;

  // mini-arc
  arcStep: number;
  lastArcTurn: number;
}

export interface HostSettings {
  hostName: string;
  voiceURI: string | null;
  speechRate: number;
}

export interface GameSettings {
  mode: GameMode;
  host: HostSettings;
  musicOn: boolean;
  /** Full-screen jumpscares. Undefined = on. */
  jumpScares?: boolean;
  luckRules: LuckRules;
  /** Board animations (snake slither, dice tumble, cell pops). Undefined = on. */
  animations?: boolean;
}

export interface TutorlyGameJSON {
  version: 1;
  title: string;
  subtitle?: string;
  mode: GameMode;
  host: { name: string; voiceURI?: string | null; speechRate?: number };
  luckRules: LuckRules;
  players: PlayerProfile[];
  decisions: DecisionScenario[];
  board?: {
    totalCells: number;
    cells: Record<string, SnakeLadderCell>;
  };
}

// ─────────────────────────────────────────────────────────────
// Economy config
// ─────────────────────────────────────────────────────────────
/** How long the bite plays before the snake drags the player down. */
const BITE_MS = 700;

const SHOP_COSTS = {
  reroll: 6,
  antidote: 10,
  shield: 8,
  food: 5,
  askHost: 4,
  assist: 3,
} as const;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeParseCSV(s: string): string[] {
  return s
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

function normalizeLuckRate(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 5;
  return clamp(Math.round(n), 0, 10);
}

function getActorRole(profile: PlayerProfile): ActorRole {
  const traits = (profile.traits ?? []).map(t => t.toLowerCase());
  if (traits.some(t => t.includes("guide"))) return "guide";
  if (traits.some(t => t.includes("rival"))) return "rival";
  if (traits.some(t => t.includes("trickster") || t.includes("chaos") || t.includes("mischief"))) return "trickster";
  const luck = normalizeLuckRate(profile.luckRate ?? 5);
  if (luck >= 8) return "trickster";
  if (luck <= 3) return "rival";
  return "guide";
}

function luckAdjustedRoll(base: number, luckRate: number, rules: LuckRules): number {
  const lr = clamp(luckRate, 0, 10);
  const centered = (lr - 5) / 5; // -1..+1
  const prob = Math.min(0.49, Math.abs(centered) * rules.strength);
  if (rules.maxAdjustment === 0) return base;
  if (Math.random() < prob) {
    const adj = centered > 0 ? 1 : -1;
    return clamp(base + adj, 1, 6);
  }
  return base;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function pickOne<T>(arr: T[], fallback: T): T {
  if (!arr.length) return fallback;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Mood emoji palette: 🥰😎🥲🤨🫥😥😴😟😨🤕🤢🤮
function getMood(p: RuntimePlayer): { emoji: string; label: string; color: string } {
  if (!p.isAlive) return { emoji: "🫥", label: "Out", color: "#374151" };

  const min = Math.min(p.health, p.hunger, p.energy, p.morale);
  const avg = (p.health + p.hunger + p.energy + p.morale) / 4;

  if (p.health <= 10) return { emoji: "🤮", label: "Critical", color: "#7f1d1d" };
  if (p.hunger <= 10) return { emoji: "🤢", label: "Starving", color: "#92400e" };
  if (p.energy <= 10) return { emoji: "😴", label: "Exhausted", color: "#1e3a8a" };
  if (p.morale <= 10) return { emoji: "😨", label: "Panic", color: "#4c1d95" };

  if (p.health < 25) return { emoji: "🤕", label: "Hurt", color: "#dc2626" };
  if (min < 25) return { emoji: "😥", label: "Struggling", color: "#ca8a04" };
  if (min < 40) return { emoji: "😟", label: "Worried", color: "#ea580c" };
  if (avg < 55) return { emoji: "🤨", label: "Unsure", color: "#65a30d" };
  if (avg < 70) return { emoji: "🥲", label: "Tired", color: "#0ea5e9" };
  if (avg < 85) return { emoji: "😎", label: "Confident", color: "#0891b2" };
  return { emoji: "🥰", label: "Thriving", color: "#db2777" };
}

function kidifyText(s: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/blood|bleeding/gi, "hurt"],
    [/die|death|dying/gi, "lose"],
    [/kill|killed/gi, "defeat"],
    [/poison|poisoned/gi, "yucky"],
    [/sick/gi, "not well"],
    [/cruelty/gi, "unkindness"],
    [/terrifying|horror|haunted/gi, "spooky"],
    [/panic/gi, "worry"],
    [/mate/gi, "friend"],
  ];
  return replacements.reduce((acc, [rx, rep]) => acc.replace(rx, rep), s);
}

function softenEffects(mode: GameMode, e: DecisionScenario["choices"][number]["effects"]) {
  if (mode !== "kids") return e;
  return {
    health: e.health !== undefined ? clamp(e.health, -10, 20) : undefined,
    hunger: e.hunger !== undefined ? clamp(e.hunger, -15, 25) : undefined,
    energy: e.energy !== undefined ? clamp(e.energy, -15, 25) : undefined,
    morale: e.morale !== undefined ? clamp(e.morale, -15, 25) : undefined,
    credits: e.credits !== undefined ? clamp(e.credits, -5, 20) : undefined,
  };
}

function normalizeScenario(mode: GameMode, s: DecisionScenario): DecisionScenario {
  const kind: ScenarioKind = s.kind ?? "standard";
  const safe = mode === "kids";
  return {
    ...s,
    kind,
    title: safe ? kidifyText(s.title) : s.title,
    hostIntro: safe ? "Great speaking! " + kidifyText(s.hostIntro) : s.hostIntro,
    situation: safe ? kidifyText(s.situation) : s.situation,
    speakingPrompt: safe ? s.speakingPrompt + " (Kids Mode: kind words + clear reasons.)" : s.speakingPrompt,
    choices: s.choices.map(c => ({
      ...c,
      text: safe ? kidifyText(c.text) : c.text,
      consequence: safe ? kidifyText(c.consequence) : c.consequence,
      hostReaction: safe ? "Nice explanation! " + kidifyText(c.hostReaction) : c.hostReaction,
      effects: softenEffects(mode, c.effects),
    })),
  };
}

function deriveKinds(decisions: DecisionScenario[]): DecisionScenario[] {
  // Add variety if not specified.
  return decisions.map((d, i) => {
    if (d.kind) return d;
    if (i % 6 === 0) return { ...d, kind: "convince" };
    if (i % 7 === 0) return { ...d, kind: "roleplay" };
    return { ...d, kind: "standard" };
  });
}

// ─────────────────────────────────────────────────────────────
// Default assets
// ─────────────────────────────────────────────────────────────
const AVATARS = [
  { emoji: "🧕", name: "Amira", color: "#8b5cf6" },
  { emoji: "🦹‍♀️", name: "Nova", color: "#ec4899" },
  { emoji: "🧟‍♀️", name: "Zara", color: "#10b981" },
  { emoji: "🧙‍♂️", name: "Merlin", color: "#3b82f6" },
  { emoji: "🦸‍♂️", name: "Rex", color: "#f59e0b" },
  { emoji: "🥷", name: "Shadow", color: "#6366f1" },
  { emoji: "👩‍🚀", name: "Stella", color: "#14b8a6" },
  { emoji: "🧛‍♂️", name: "Drake", color: "#dc2626" },
  { emoji: "🧑‍🏫", name: "Tutor", color: "#0ea5e9" },
  { emoji: "🕵️‍♀️", name: "Detective", color: "#a855f7" },
];

const DEFAULT_ADULT_DECISIONS: DecisionScenario[] = [
  {
    id: "d1",
    title: "Spoiled Food?",
    grammarFocus: "First Conditional (If + present, will + infinitive)",
    speakingPrompt: "Use FIRST CONDITIONAL to explain your choice. Speak 30–60 seconds.",
    situation: "You find an abandoned campfire with leftover cooked meat. Flies are buzzing around it. It might be spoiled.",
    hostIntro: "Leftover food. Risk or restraint? Speak your reasoning.",
    choices: [
      { id: "a", text: "Eat it anyway", consequence: "The food was partially spoiled. You feel sick but less hungry.", effects: { hunger: +20, health: -15, morale: -5, credits: +4 }, hostReaction: "Risky. You got calories, but you paid for it." },
      { id: "b", text: "Inspect and eat only safe parts", consequence: "You avoid the worst bits. A smaller meal, but safer.", effects: { hunger: +15, energy: +5, morale: +5, credits: +10 }, hostReaction: "That’s a survivor’s move: careful, logical." },
      { id: "c", text: "Leave it", consequence: "You stay hungry, but you avoid illness.", effects: { hunger: -5, morale: +5, credits: +6 }, hostReaction: "Boring… but smart." },
    ],
  },
  {
    id: "d2",
    title: "River Crossing",
    grammarFocus: "Second Conditional (If + past, would + infinitive)",
    speakingPrompt: "Use SECOND CONDITIONAL hypotheticals. Speak 30–60 seconds.",
    situation: "A rushing river blocks your path. Slippery stepping stones and a long detour to a fallen tree bridge.",
    hostIntro: "One slip changes everything. Explain your choice.",
    choices: [
      { id: "a", text: "Sprint across the stones", consequence: "You slip and get soaked. Cold drains your energy.", effects: { energy: -25, morale: -10, health: -10, credits: +6 }, hostReaction: "Fast… and messy. Speed has a cost." },
      { id: "b", text: "Test each stone carefully", consequence: "Slow but safe. You cross with confidence.", effects: { energy: -10, morale: +10, credits: +14 }, hostReaction: "Deliberate. Precise. Good." },
      { id: "c", text: "Take the fallen tree bridge", consequence: "Longer walk, but you cross dry.", effects: { energy: -15, hunger: -5, morale: +15, credits: +16 }, hostReaction: "Excellent trade-off." },
    ],
  },
  {
    id: "d3",
    title: "Night Shelter",
    grammarFocus: "Modal verbs (should/could/might/must)",
    speakingPrompt: "Use MODALS to discuss risks. Speak 30–60 seconds.",
    situation: "Night is falling. A cave is nearby. A tree could be climbed. You’re tired.",
    hostIntro: "Bad shelter choices end games. Speak clearly.",
    choices: [
      { id: "a", text: "Enter the cave carefully", consequence: "The cave is empty. You sleep warm and dry.", effects: { energy: +25, morale: +20, health: +10, credits: +16 }, hostReaction: "You used fear as information. Good." },
      { id: "b", text: "Sleep in the tree", consequence: "Safer from the ground, but uncomfortable.", effects: { energy: +5, morale: -5, health: -5, credits: +10 }, hostReaction: "Not comfortable, but alive." },
      { id: "c", text: "Keep walking in the dark", consequence: "You get lost and exhausted.", effects: { energy: -30, morale: -25, hunger: -10, health: -10, credits: 0 }, hostReaction: "Classic mistake. Night travel kills plans." },
    ],
  },
  {
    id: "d4",
    title: "Injured Stranger",
    grammarFocus: "Reported Speech",
    speakingPrompt: "Use REPORTED SPEECH to summarise what they said. Speak 30–60 seconds.",
    situation: "An injured survivor begs for help and promises secret information.",
    hostIntro: "Compassion has a cost. So does cruelty.",
    choices: [
      { id: "a", text: "Help them fully", consequence: "They share a shortcut and your morale rises.", effects: { energy: -20, morale: +30, credits: +22 }, hostReaction: "Kindness is also strategy." },
      { id: "b", text: "Give supplies and move on", consequence: "You help a little and keep moving.", effects: { hunger: -5, morale: +10, credits: +12 }, hostReaction: "Practical compromise." },
      { id: "c", text: "Leave them", consequence: "You save time, but guilt weighs on you.", effects: { morale: -25, credits: +4 }, hostReaction: "You survived… but your conscience is loud." },
    ],
  },
  {
    id: "d5",
    title: "Mystery Box",
    grammarFocus: "Probability (might/could/probably)",
    speakingPrompt: "Use uncertainty language: might/could/probably/likely. Speak 30–60 seconds.",
    situation: "An ancient box sits in the mud. Smoke rises in the distance.",
    hostIntro: "Treasure, danger, or distraction.",
    choices: [
      { id: "a", text: "Open the box", consequence: "You find supplies. Morale improves.", effects: { hunger: +20, morale: +15, credits: +18 }, hostReaction: "Risk rewarded. Today." },
      { id: "b", text: "Follow the smoke", consequence: "A hot spring. Healing rest.", effects: { energy: +20, health: +10, morale: +10, credits: +14 }, hostReaction: "Recovery is a weapon." },
      { id: "c", text: "Ignore both", consequence: "Nothing gained. Time passes.", effects: { credits: +3 }, hostReaction: "Safe… maybe too safe." },
    ],
  },
];

function buildDecisions(mode: GameMode, override?: DecisionScenario[]): DecisionScenario[] {
  const base = override && override.length ? override : DEFAULT_ADULT_DECISIONS;
  const withKinds = deriveKinds(base);
  return withKinds.map(s => normalizeScenario(mode, s));
}

// ─────────────────────────────────────────────────────────────
// Board builder
// ─────────────────────────────────────────────────────────────
function createDefaultBoardCells(mode: GameMode, decisions: DecisionScenario[]): Record<number, SnakeLadderCell> {
  const cells: Record<number, SnakeLadderCell> = {};
  const scary = mode === "adult";

  cells[1] = { type: "start", emoji: "🚀", label: "START", description: "Begin", hostComment: scary ? "Welcome to Tutorly Snake & Ladder. Speak clearly. Survive." : "Welcome! Speak clearly and have fun!" };
  cells[50] = { type: "finish", emoji: "🏆", label: "TEMPLE", description: "Finish", hostComment: scary ? "Temple reached. You survived." : "You made it! Great speaking!" };

  // snakes — every snake drops from its own row to a lower row, so the drawn
  // animal actually travels down the board instead of sliding sideways inside
  // one row (a snake that never crosses a row is not fun).
  cells[48] = { type: "snake", destination: 26, emoji: "🐍", label: scary ? "Anaconda" : "Giant Snake", description: "Slide two rows back", hostComment: scary ? "Coils around you. Two rows back." : "Giant snake! Back you go." };
  cells[32] = { type: "snake", destination: 12, emoji: "🐍", label: scary ? "Python" : "Sleepy Python", description: "Slide two rows back", hostComment: scary ? "It grabbed you. Retreat." : "Big snake blocks you. Back a bit." };
  cells[29] = { type: "snake", destination: 14, emoji: "🐍", label: scary ? "Cobra" : "Hissy Cobra", description: "Slide back", hostComment: scary ? "Cobra. Fast retreat." : "Hiss! Hop back safely." };
  cells[38] = { type: "snake", destination: 22, emoji: "🐍", label: scary ? "Adder" : "Sneaky Snake", description: "Slide back", hostComment: scary ? "Near miss. Still back." : "Sneaky snake surprise. Back." };
  cells[45] = { type: "snake", destination: 33, emoji: "🐍", label: scary ? "Viper" : "Silly Snake", description: "Slide back", hostComment: scary ? "No way through. Back." : "Silly snake. Safe detour back." };

  // ladders
  cells[5] = { type: "ladder", destination: 15, emoji: "🪜", label: "Vines Up", description: "Climb up", hostComment: "Nice! Up you go." };
  cells[13] = { type: "ladder", destination: 27, emoji: "🪜", label: "Ancient Steps", description: "Climb up", hostComment: "Steps! Climb." };
  cells[22] = { type: "ladder", destination: 35, emoji: "🪜", label: "Rope Bridge", description: "Climb up", hostComment: "Balance and climb." };
  cells[31] = { type: "ladder", destination: 43, emoji: "🪜", label: "Temple Stairs", description: "Climb up", hostComment: "You earned this climb." };
  cells[40] = { type: "ladder", destination: 49, emoji: "🪜", label: "Final Climb", description: "Climb up", hostComment: "Final push." };

  // oasis
  cells[18] = { type: "oasis", emoji: "🏝️", label: "Oasis", description: "Restore", hostComment: "Oasis! Restore." };
  cells[37] = { type: "oasis", emoji: "⛲", label: "Spring", description: "Restore", hostComment: "Spring! Full restore." };

  // jumpscare/death
  cells[16] = { type: "jumpscare", emoji: scary ? "💀" : "😨", label: scary ? "Skeleton" : "Spooky Surprise", description: "Scare", hostComment: scary ? "Your heart spikes." : "Spooky! Breathe." };
  cells[42] = { type: "jumpscare", emoji: scary ? "👻" : "😟", label: scary ? "Ghost" : "Shadow", description: "Scare", hostComment: scary ? "You feel watched." : "Weird shadow… keep going." };
  cells[34] = { type: "death", destination: 10, emoji: scary ? "☠️" : "🫥", label: scary ? "RAVINE" : "Lost", description: "Big setback", hostComment: scary ? "You fell. Back." : "You got lost. Back to safety." };

  // decisions: everything else
  const reserved = new Set(Object.keys(cells).map(Number));
  let idx = 0;
  for (let sq = 2; sq <= 49; sq++) {
    if (reserved.has(sq)) continue;
    const d = decisions[idx % decisions.length];
    idx++;
    cells[sq] = {
      type: "decision",
      emoji: d.kind === "convince" ? "🗣️" : d.kind === "roleplay" ? "🎭" : "🎯",
      label: d.kind === "convince" ? "Convince" : d.kind === "roleplay" ? "Role-play" : "Decision",
      description: `Speaking: ${d.grammarFocus}`,
      hostComment: d.hostIntro,
      decisionId: d.id,
    };
  }

  return cells;
}

// ─────────────────────────────────────────────────────────────
// AI Prompt generator (super-detailed, with JSON validation instructions)
// ─────────────────────────────────────────────────────────────
// AI prompt — the template lives in gamePack.ts so the shared Tutorly setup
// page and this advanced screen generate the exact same prompt.
function buildAIPrompt(payload: {
  title: string;
  subtitle: string;
  mode: GameMode;
  hostName: string;
  speechRate: number;
  luckRules: LuckRules;
  players: PlayerProfile[];
}): string {
  return buildSnakePackPrompt({
    title: payload.title,
    subtitle: payload.subtitle,
    mode: payload.mode,
    hostName: payload.hostName,
    speechRate: payload.speechRate,
    luckRules: payload.luckRules,
    players: payload.players.map(p => ({
      id: p.id,
      role: p.role,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      from: p.from,
      interests: p.interests,
      strengths: p.strengths,
      facts: p.facts,
      traits: p.traits,
      dialogueLines: p.dialogueLines,
      luckRate: p.luckRate,
    })),
  });
}



// ─────────────────────────────────────────────────────────────
// Audio (synth)
// ─────────────────────────────────────────────────────────────
const MASTER_MUTE_KEY = "tutorly-snake-ladder-muted";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private bgmOn = false;
  private muted = false;
  private screamers: HTMLAudioElement[] = [];

  /** Master mute: music, effects, scream clips and voice all obey it. */
  isMuted() {
    return this.muted;
  }

  setMasterMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MASTER_MUTE_KEY, muted ? "1" : "0");
    } catch {}
    if (this.gain) this.gain.gain.value = muted ? 0 : 0.35;
    this.screamers.forEach(a => { try { a.pause(); a.currentTime = 0; } catch {} });
    if (muted) this.stopBGM();
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.35;
      this.gain.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
      this.gain = null;
    }
    try {
      this.muted = localStorage.getItem(MASTER_MUTE_KEY) === "1";
    } catch {}
    if (this.muted && this.gain) this.gain.gain.value = 0;
    // Pre-loaded so the scream starts on the very first frame of the scare.
    if (typeof Audio !== "undefined") {
      this.screamers = ["sounds/scream-wilhelm.ogg", "sounds/scream-human.wav"].map((src) => {
        const a = new Audio(src);
        a.preload = "auto";
        return a;
      });
    }
  }

  /** A real recorded scream (Wikimedia Commons), layered under the synth sting. */
  playScream() {
    if (this.muted || !this.screamers.length) return;
    const a = this.screamers[Math.floor(Math.random() * this.screamers.length)];
    try {
      a.currentTime = 0;
      a.volume = 0.95;
      void a.play().catch(() => {});
    } catch {}
  }

  resume() {
    try {
      void this.ctx?.resume();
    } catch {}
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number) {
    if (!this.ctx || !this.gain || this.muted) return;
    const ctx = this.ctx;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(this.gain);
      o.type = type;
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + dur);
    } catch {}
  }

  dice() { for (let i = 0; i < 8; i++) setTimeout(() => this.tone(200 + Math.random() * 500, 0.06, "square", 0.12), i * 50); }
  move() { [300, 380, 460].forEach((f, i) => setTimeout(() => this.tone(f, 0.1, "sine", 0.18), i * 70)); }
  /** Footstep for each square of a walk. */
  tick(step = 0) { this.tone(420 + (step % 4) * 60, 0.055, "triangle", 0.075); }
  /** Glissando for a ladder climb / a snake slide. */
  slide(up: boolean) {
    const base = up ? 240 : 620;
    const dir = up ? 70 : -58;
    for (let i = 0; i < 10; i++) setTimeout(() => this.tone(base + dir * i, 0.07, up ? "sine" : "sawtooth", 0.1), i * 55);
  }
  decision() { [350, 440, 550].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, "triangle", 0.22), i * 120)); }
  snake() { [380, 300, 240, 170, 120].forEach((f, i) => setTimeout(() => this.tone(f, 0.28, "sawtooth", 0.28), i * 100)); }
  /**
   * The bite: a layered, deliberately loud sting.
   *   1. fang snap   — short bright noise burst
   *   2. sub-bass    — 42 Hz body thump that you feel more than hear
   *   3. crunch      — noise through a falling low-pass (flesh, not glass)
   *   4. a second snap a beat later, then the drawn-out hiss of the slide
   * Every layer goes through the master gain, so the 🔊 mute kills the lot.
   */
  bite() {
    this.noise(0.09, 5200, 1400, 0.55, 7);
    this.tone(210, 0.14, "square", 0.4);
    this.tone(42, 0.7, "sine", 0.62);
    setTimeout(() => { this.tone(38, 0.9, "sine", 0.5); this.noise(0.34, 1100, 190, 0.5, 2.5); }, 55);
    setTimeout(() => this.noise(0.07, 4600, 1200, 0.44, 8), 170);
    setTimeout(() => this.tone(120, 0.2, "sawtooth", 0.32), 200);
    setTimeout(() => this.snake(), 260);
  }
  ladder() { [350, 450, 550, 650, 750, 900].forEach((f, i) => setTimeout(() => this.tone(f, 0.14, "sine", 0.25), i * 60)); }
  oasis() { [400, 500, 600, 700, 600].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "sine", 0.18), i * 160)); }
  jumpscare() { this.tone(70, 0.45, "square", 0.4); setTimeout(() => this.tone(1400, 0.2, "sawtooth", 0.32), 90); }

  /** White noise through a sweeping band-pass — the breath of a scream. */
  private noise(dur: number, from: number, to: number, vol: number, q = 5) {
    if (!this.ctx || !this.gain || this.muted) return;
    const ctx = this.ctx;
    try {
      const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = q;
      bp.frequency.setValueAtTime(from, ctx.currentTime);
      bp.frequency.exponentialRampToValueAtTime(Math.max(40, to), ctx.currentTime + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.gain);
      src.start();
      src.stop(ctx.currentTime + dur);
    } catch {}
  }

  /**
   * The full jump scare, synthesised: sub-bass impact, a distorted descending
   * shriek, a noise sweep and a racing heartbeat underneath. No CDN file, so
   * this can never 404 the way the old linked stings did.
   */
  scare() {
    if (!this.ctx || !this.gain || this.muted) return;
    const ctx = this.ctx;
    this.playScream();
    this.tone(66, 0.5, "sine", 0.5);
    setTimeout(() => this.tone(38, 0.75, "sine", 0.42), 40);
    try {
      const o = ctx.createOscillator();
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 1023) * 2 - 1;
        curve[i] = Math.tanh(x * 4);
      }
      shaper.curve = curve;
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(1450, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(115, ctx.currentTime + 1.15);
      g.gain.setValueAtTime(0.32, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      o.connect(shaper);
      shaper.connect(g);
      g.connect(this.gain);
      o.start();
      o.stop(ctx.currentTime + 1.25);
    } catch {}
    this.noise(0.9, 5200, 420, 0.3, 5);
    setTimeout(() => this.noise(1.5, 900, 140, 0.18, 3), 110);
    [0, 300, 620, 940, 1240].forEach((t, i) => setTimeout(() => this.tone(i % 2 ? 48 : 60, 0.22, "sine", 0.34), t));
  }
  death() { [600, 480, 360, 260, 180].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, "sawtooth", 0.28), i * 110)); }
  victory() { [523, 659, 784, 880, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.33, "sine", 0.26), i * 170)); }

  startBGM() {
    if (this.bgmOn || this.muted) return;
    this.bgmOn = true;
    const loop = () => {
      if (!this.bgmOn) return;
      const bass = [110, 147, 165, 196, 220];
      this.tone(bass[Math.floor(Math.random() * bass.length)], 2.7, "sine", 0.02);
      if (Math.random() < 0.25) this.tone(800 + Math.random() * 800, 0.18, "sine", 0.015);
      setTimeout(loop, 2300 + Math.random() * 2000);
    };
    loop();
  }
  stopBGM() { this.bgmOn = false; }
}

const sfx = new SoundEngine();

// ─────────────────────────────────────────────────────────────
// TTS (browser voices)
// ─────────────────────────────────────────────────────────────
class TTSEngine {
  syn: SpeechSynthesis | null = null;
  voiceURI: string | null = null;
  rate = 0.95;

  init() {
    if (!("speechSynthesis" in window)) return;
    this.syn = window.speechSynthesis;
  }

  speak(text: string, onEnd?: () => void) {
    if (!this.syn) return;
    // The master mute silences the host's voice too.
    if (sfx.isMuted()) {
      onEnd?.();
      return;
    }
    this.syn.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = this.syn.getVoices();
    if (this.voiceURI) {
      const v = voices.find(x => x.voiceURI === this.voiceURI);
      if (v) u.voice = v;
    }
    u.rate = this.rate;
    u.pitch = 1;
    if (onEnd) u.onend = onEnd;
    this.syn.speak(u);
  }

  stop() { this.syn?.cancel(); }
}

const tts = new TTSEngine();

// ─────────────────────────────────────────────────────────────
// UI Components
// ─────────────────────────────────────────────────────────────
const StatBar: React.FC<{ icon: string; value: number; color: string; critical: boolean; dark: boolean }> = ({ icon, value, color, critical, dark }) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-0.5">
      <span className="text-lg">{icon}</span>
      <span className={`text-xs font-black ${critical ? (dark ? "text-red-300" : "text-red-700") : dark ? "text-white" : "text-slate-900"}`}>{Math.round(value)}%</span>
    </div>
    <div className={`h-3 rounded-full overflow-hidden ${dark ? "bg-black/40" : "bg-black/15"}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${critical ? "animate-pulse" : ""}`} style={{ width: `${clamp(value, 0, 100)}%`, background: critical ? "#ef4444" : color }} />
    </div>
  </div>
);

const ActivePlayerPanel: React.FC<{ player: RuntimePlayer; dark: boolean }> = ({ player, dark }) => {
  const mood = getMood(player);
  const titleColor = dark ? "text-amber-200" : "text-slate-900";
  const subColor = dark ? "text-amber-300" : "text-slate-700";

  return (
    <div
      className="rounded-2xl border-4 shadow-2xl relative"
      style={{
        padding: 12,
        borderColor: player.color,
        background: dark ? `linear-gradient(145deg, ${player.color}25, ${player.color}3a)` : `linear-gradient(145deg, rgba(255,255,255,0.95), ${player.color}14)`,
        boxShadow: `0 0 40px ${player.color}45, 0 12px 40px rgba(0,0,0,0.25)`,
      }}
    >
      <div className="flex items-center" style={{ gap: 12 }}>
        <div className="relative flex items-center justify-center border-4 shadow-xl shrink-0" style={{ width: 74, height: 74, borderRadius: 16, fontSize: 38, lineHeight: 1, borderColor: player.color, background: dark ? `${player.color}40` : `${player.color}22` }}>
          {player.avatar}
          <div className="absolute flex items-center justify-center border-2 border-white shadow-lg" style={{ top: -10, right: -10, width: 30, height: 30, borderRadius: 999, background: mood.color, fontSize: 16, lineHeight: 1 }} title={mood.label}>
            {mood.emoji}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-black truncate ${titleColor}`} style={{ fontFamily: "Cinzel, serif", fontSize: 20 }}>{player.name}</div>
          <div className={`font-bold truncate ${subColor}`} style={{ fontSize: 14 }}>
            📍 Square {player.position} · 💳 <span style={{ color: player.color }}>{player.credits}</span>
          </div>
          <div className={`font-bold truncate ${dark ? "text-slate-200" : "text-slate-800"}`} style={{ fontSize: 12 }}>
            🛡️ {player.shield} · 🧪 {player.antidote}{player.role === "actor" ? ` · 🎭 ${player.actorRole} · 🍀 ${player.luckRate}/10` : " · 🎓 Learner"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: 6, marginTop: 10 }}>
        <StatBar icon="❤️" value={player.health} color="#ef4444" critical={player.health < 25} dark={dark} />
        <StatBar icon="🍖" value={player.hunger} color="#f59e0b" critical={player.hunger < 25} dark={dark} />
        <StatBar icon="⚡" value={player.energy} color="#3b82f6" critical={player.energy < 25} dark={dark} />
        <StatBar icon="😊" value={player.morale} color="#8b5cf6" critical={player.morale < 25} dark={dark} />
      </div>

      {(player.health < 25 || player.hunger < 25 || player.energy < 25 || player.morale < 25) && (
        <div className={`text-center font-black ${dark ? "text-red-300" : "text-red-700"}`} style={{ marginTop: 6, fontSize: 12 }}>
          ⚠️ Critical stats — choose carefully!
        </div>
      )}
    </div>
  );
};

const HostPanel: React.FC<{ hostName: string; msg: string; speaking: boolean; onSpeak: () => void; onStop: () => void; dark: boolean }> = ({ hostName, msg, speaking, onSpeak, onStop, dark }) => (
  <div className={`rounded-2xl border-4 border-amber-500 ${speaking ? "host-speaking" : ""}`} style={{ padding: 12, background: dark ? "linear-gradient(145deg, #1a0800, #2d1500)" : "linear-gradient(145deg, #fffbeb, #fef3c7)", boxShadow: speaking ? "0 0 44px rgba(217,119,6,0.55)" : "0 8px 30px rgba(217,119,6,0.35)", transition: "box-shadow 300ms ease" }}>
    <div className="flex items-start gap-4">
      <div className={`${speaking ? "host-mic" : ""} shrink-0`} style={{ width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, border: "2px solid #fcd34d", background: "linear-gradient(145deg, #d97706, #b45309)" }}>🎙️</div>
      <div className="flex-1 min-w-0">
        <div className={`font-black flex items-center`} style={{ gap: 10, fontSize: 17, marginBottom: 2, color: dark ? "#fcd34d" : "#92400e" }}>
          {hostName}
          {speaking && (
            <span className={`speak-bars ${dark ? "text-amber-400" : "text-amber-600"}`} aria-label="speaking"><i /><i /><i /><i /></span>
          )}
        </div>
        <p className={`italic font-semibold ${dark ? "text-amber-100" : "text-amber-900"}`} style={{ fontSize: 15, lineHeight: 1.35 }}>“{msg}”</p>
      </div>
    </div>
    <div className="flex" style={{ gap: 8, marginTop: 10 }}>
      <button onClick={onSpeak} disabled={speaking} className="flex-1 rounded-xl font-bold text-white transition-all hover:scale-105 disabled:opacity-70" style={{ padding: "8px 12px", fontSize: 14, background: speaking ? "#16a34a" : "#d97706" }}>
        {speaking ? "🔊 Speaking..." : "🔊 Listen"}
      </button>
      <button onClick={onStop} className="rounded-xl font-bold text-white transition-all hover:scale-105" style={{ padding: "8px 14px", background: "#6b7280" }}>⏹️</button>
    </div>
  </div>
);

/* ── Dice: a real 3D cube that tumbles and lands on the pip it rolled ──────
   Six faces sit in 3D space; rolling spins the cube through a couple of full
   turns, and the settle rotation lands exactly on the rolled face, so the
   number the player sees is the number they get.                            */
const DICE_PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[30, 24], [70, 24], [30, 50], [70, 50], [30, 76], [70, 76]],
};
/** Face placement in 3D, then the cube rotation that brings that face front. */
const DICE_FACES: Array<{ v: number; face: string }> = [
  { v: 1, face: "rotateY(0deg) translateZ(var(--d))" },
  { v: 6, face: "rotateY(180deg) translateZ(var(--d))" },
  { v: 2, face: "rotateY(90deg) translateZ(var(--d))" },
  { v: 5, face: "rotateY(-90deg) translateZ(var(--d))" },
  { v: 3, face: "rotateX(90deg) translateZ(var(--d))" },
  { v: 4, face: "rotateX(-90deg) translateZ(var(--d))" },
];
const DICE_SETTLE: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

const Dice: React.FC<{ value: number; rolling: boolean; onRoll: () => void; disabled: boolean; paused?: boolean; animate?: boolean }> = ({ value, rolling, onRoll, disabled, paused = false, animate = true }) => {
  const [tumble, setTumble] = React.useState(0);
  const [landings, setLandings] = React.useState(0);
  const settle = DICE_SETTLE[value] ?? DICE_SETTLE[1];

  // Every pip change while rolling adds another half turn, so the cube keeps
  // tumbling instead of snapping between faces.
  React.useEffect(() => {
    if (rolling) setTumble(t => t + 1);
    else setLandings(l => l + 1);
  }, [value, rolling]);

  const spin = animate
    ? rolling
      ? `rotateX(${tumble * 150 + 40}deg) rotateY(${tumble * 215 + 70}deg) rotateZ(${tumble * 90}deg)`
      : `rotateX(${settle.x + landings * 360}deg) rotateY(${settle.y + landings * 720}deg) rotateZ(0deg)`
    : `rotateX(${settle.x}deg) rotateY(${settle.y}deg) rotateZ(0deg)`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="dice-stage" onClick={() => !disabled && !rolling && onRoll()}>
        <div
          className={`dice-3d ${rolling ? "is-rolling" : ""}`}
          style={{
            transform: spin,
            transition: animate
              ? rolling
                ? "transform 130ms linear"
                : "transform 820ms cubic-bezier(.18,.92,.16,1)"
              : "none",
          }}
        >
          {DICE_FACES.map(f => (
            <div key={f.v} className="dice-face" style={{ transform: f.face }}>
              {(DICE_PIPS[f.v] ?? []).map(([x, y], i) => (
                <span key={i} className={`dice-pip ${f.v === 1 ? "pip-one" : ""}`} style={{ left: `${x}%`, top: `${y}%` }} />
              ))}
            </div>
          ))}
        </div>
        <span className={`dice-shadow ${rolling ? "is-rolling" : ""}`} />
      </div>

      <button onClick={() => !disabled && !rolling && onRoll()} disabled={disabled || rolling} className="rounded-2xl font-black text-white transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed" style={{ padding: "10px 26px", fontSize: 19, background: disabled || rolling ? "#4b5563" : "linear-gradient(145deg, #dc2626, #b91c1c)", boxShadow: disabled ? "none" : "0 8px 25px rgba(220,38,38,0.5)", fontFamily: "Orbitron, monospace" }}>
        {paused ? "⏸ Paused" : rolling ? "🎲 Rolling..." : disabled ? "⏳ Wait..." : "🎲 ROLL"}
      </button>
      <div className={`dice-readout ${rolling ? "is-rolling" : ""}`} aria-live="polite">
        {paused ? "⏸" : rolling ? "…" : `${value}`}
      </div>
    </div>
  );
};

const Cell: React.FC<{
  num: number;
  cell?: SnakeLadderCell;
  isHighlighted: boolean;
  spotlight: boolean;
  dark: boolean;
  totalCells: number;
  index: number;
  arrived: boolean;
  /** Set on the square the dice just pointed at: it reacts to the roll. */
  rollHit?: { value: number; nonce: number } | null;
  /** Set on the square whose snake just bit: red shock + dimmed art. */
  bitten?: boolean;
}> = ({ num, cell, isHighlighted, spotlight, dark, totalCells, index, arrived, rollHit = null, bitten = false }) => {
  const t = cell?.type;
  const bg = () => {
    if (num === totalCells || t === "finish") return "linear-gradient(145deg, #fbbf24, #f59e0b)";
    if (num === 1 || t === "start") return "linear-gradient(145deg, #22c55e, #16a34a)";
    if (t === "snake") return "linear-gradient(145deg, #7f1d1d, #450a0a)";
    if (t === "ladder") return "linear-gradient(145deg, #22c55e, #15803d)";
    if (t === "decision") return "linear-gradient(145deg, #8b5cf6, #7c3aed)";
    if (t === "oasis") return "linear-gradient(145deg, #14b8a6, #0d9488)";
    if (t === "death") return "linear-gradient(145deg, #1f2937, #111827)";
    if (t === "jumpscare") return "linear-gradient(145deg, #4c1d95, #2e1065)";
    const alt = (Math.floor((num - 1) / 10) % 2 === 0) ? (num % 2 === 0) : (num % 2 === 1);
    return alt ? (dark ? "#3f3f46" : "#e5e5e5") : (dark ? "#52525b" : "#f5f5f5");
  };
  const txt = () => (!t ? (dark ? "#e5e5e5" : "#0f172a") : "#fff");
  // Drawn SVG art per tile type — no emoji on the board any more. Snake and
  // ladder squares deliberately have NO art: the snakes and ladders are drawn
  // across the board, and a second one inside the tile just duplicated them.
  const kind: CellArtKind | null =
    t === "finish" || num === totalCells ? "finish"
    : t === "start" || num === 1 ? "start"
    : t === "snake" || t === "ladder" ? null
    : (t as CellArtKind | undefined) ?? null;

  // Everything is sized from --cell (set on the board frame), so the whole
  // board scales fluidly with the screen instead of overflowing on small cells.
  const cellSize = "var(--cell, 40px)";

  return (
    <div
      className={`board-cell relative rounded-xl flex flex-col items-center justify-center select-none overflow-hidden ${isHighlighted ? "ring-4 ring-cyan-400 z-30" : ""} ${rollHit ? "cell-roll-hit" : ""} ${bitten ? "cell-bite" : ""}`}
      style={{
        background: bg(),
        opacity: spotlight ? 1 : 0.86,
        filter: spotlight ? "none" : "saturate(.9) brightness(.98)",
        transform: spotlight ? "scale(1.045)" : "scale(1)",
        zIndex: isHighlighted ? 40 : 1,
        animationDelay: `${((index % BOARD_COLS) + Math.floor(index / BOARD_COLS)) * 22}ms`,
        boxShadow: isHighlighted ? "0 0 26px rgba(34,211,238,0.85)" : "0 4px 12px rgba(0,0,0,0.35)",
        border: isHighlighted ? "3px solid #22d3ee" : "2px solid rgba(0,0,0,0.22)",
      }}
      title={cell?.description || `Square ${num}`}
    >
      <span className="absolute top-0.5 left-1 font-black leading-none" style={{ color: txt(), fontSize: `calc(${cellSize} * 0.16)`, textShadow: cell ? "0 1px 3px rgba(0,0,0,0.6)" : "none", zIndex: 2 }}>{num}</span>
      {kind && (
        <div className="cell-art" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))" }}>
          <TileArt kind={kind} glyph={cell?.emoji} />
        </div>
      )}

      {arrived && <span className="cell-arrival" aria-hidden />}

      {bitten && <span className="bite-shock" aria-hidden />}

      {rollHit && (
        <>
          <span className="cell-shock" aria-hidden />
          <span key={rollHit.nonce} className="roll-badge">
            +{rollHit.value}
          </span>
        </>
      )}

      {cell?.destination && (
        <span className="absolute bottom-0.5 right-0.5 font-black leading-none" style={{ fontSize: `calc(${cellSize} * 0.16)`, color: t === "snake" || t === "death" ? "#fecaca" : "#dcfce7", textShadow: "0 1px 3px rgba(0,0,0,0.7)", zIndex: 2 }}>
          {t === "ladder" ? "↗" : "↘"}{cell.destination}
        </span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Shop + Assist
// ─────────────────────────────────────────────────────────────
const ShopPanel: React.FC<{
  dark: boolean;
  player: RuntimePlayer;
  canUse: boolean;
  onBuyShield: () => void;
  onBuyAntidote: () => void;
  onBuyFood: () => void;
  onAskHost: () => void;
  onAssist: () => void;
}> = ({ dark, player, canUse, onBuyShield, onBuyAntidote, onBuyFood, onAskHost, onAssist }) => {
  const btnBase = `px-2 py-1.5 rounded-lg font-black transition-all ${canUse ? "hover:scale-[1.02]" : "opacity-50"}`;
  const bg = dark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.8)";

  const afford = (cost: number) => player.credits >= cost;

  const ActionBtn = (props: { label: string; cost: number; onClick: () => void; hint: string }) => (
    <button
      disabled={!canUse || !afford(props.cost)}
      onClick={props.onClick}
      className={btnBase}
      title={props.hint}
      style={{
        background: afford(props.cost) ? (dark ? "rgba(217,119,6,0.18)" : "rgba(217,119,6,0.14)") : (dark ? "rgba(107,114,128,0.18)" : "rgba(107,114,128,0.12)"),
        color: dark ? "#fff" : "#0f172a",
        border: `2px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
      }}
    >
      {props.label} <span className={dark ? "text-amber-300" : "text-amber-700"}>({props.cost})</span>
    </button>
  );

  return (
    <div className="rounded-2xl border-2" style={{ padding: 10, background: bg, borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }}>
      <div className={`font-black ${dark ? "text-amber-200" : "text-slate-900"}`} style={{ fontSize: 13, marginBottom: 6 }}>🛒 Spend credits</div>
      <div className="grid grid-cols-2" style={{ gap: 6, fontSize: 12 }}>
        <ActionBtn label="🍖 Food" cost={SHOP_COSTS.food} onClick={onBuyFood} hint="+Hunger, +Energy" />
        <ActionBtn label="🛡️ Shield" cost={SHOP_COSTS.shield} onClick={onBuyShield} hint="Blocks 1 snake slide" />
        <ActionBtn label="🧪 Antidote" cost={SHOP_COSTS.antidote} onClick={onBuyAntidote} hint="Protects from a deadly penalty" />
        <ActionBtn label="🎙️ Ask host" cost={SHOP_COSTS.askHost} onClick={onAskHost} hint="Hint + grammar reminder" />
        <ActionBtn label="🤝 Assist" cost={SHOP_COSTS.assist} onClick={onAssist} hint="Ask a teammate to advise" />
      </div>
      <div className={`text-xs font-semibold mt-2 ${dark ? "text-slate-200" : "text-slate-700"}`}>
        Credits act like high stakes: earn them from decisions, spend them to survive. (🔁 Reroll is available right after rolling.)
      </div>
    </div>
  );
};

const AssistModal: React.FC<{
  open: boolean;
  dark: boolean;
  current: RuntimePlayer;
  others: RuntimePlayer[];
  onClose: () => void;
  onPick: (helperId: string) => void;
}> = ({ open, dark, current, others, onClose, onPick }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-xl rounded-3xl border-2 shadow-2xl" style={{ borderColor: "#d97706", background: dark ? "linear-gradient(145deg,#1a0800,#2d1500)" : "linear-gradient(145deg,#fffdf5,#fef3c7)" }}>
        <div className="p-5 border-b" style={{ borderColor: "rgba(217,119,6,0.25)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-2xl font-black ${dark ? "text-amber-200" : "text-slate-900"}`}>🤝 Teammate Assist</div>
              <div className={`${dark ? "text-amber-300" : "text-slate-700"}`}>Choose someone to advise {current.name} (speaking moment).</div>
            </div>
            <button onClick={onClose} className="px-3 py-2 rounded-xl font-black" style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>✕</button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {others.map(p => (
            <button key={p.id} onClick={() => onPick(p.id)} className="w-full text-left rounded-2xl p-4 border-2 hover:scale-[1.01] transition-all" style={{ borderColor: p.color, background: dark ? `${p.color}14` : `${p.color}12` }}>
              <div className="flex items-center gap-3">
                <div className="text-4xl">{p.avatar}</div>
                <div className="flex-1">
                  <div className={`text-lg font-black ${dark ? "text-white" : "text-slate-900"}`}>{p.name}</div>
                  <div className={`text-xs font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>
                    {p.role === "actor" ? `🎭 ${p.actorRole} • Luck ${p.luckRate}/10` : `🎓 Learner • ${p.from ? `From ${p.from}` : ""}`}
                  </div>
                  {(p.interests.length > 0 || p.strengths.length > 0) && (
                    <div className={`text-xs mt-1 ${dark ? "text-slate-200" : "text-slate-700"}`}>
                      {p.interests.length > 0 ? `Interests: ${p.interests.slice(0, 3).join(", ")}. ` : ""}
                      {p.strengths.length > 0 ? `Strengths: ${p.strengths.slice(0, 2).join(", ")}.` : ""}
                    </div>
                  )}
                </div>
                <div className={`text-sm font-black ${dark ? "text-amber-300" : "text-amber-800"}`}>Select</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Post-roll decision: accept move vs reroll
// ─────────────────────────────────────────────────────────────
const PostRollBar: React.FC<{
  dark: boolean;
  credits: number;
  onAccept: () => void;
  onReroll: () => void;
}> = ({ dark, credits, onAccept, onReroll }) => {
  const canReroll = credits >= SHOP_COSTS.reroll;
  return (
    <div className="rounded-2xl p-4 border-2 flex flex-wrap gap-3 items-center justify-between" style={{ borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", background: dark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.8)" }}>
      <div className={`text-sm font-black ${dark ? "text-amber-200" : "text-slate-900"}`}>🎲 Roll result ready</div>
      <div className="flex gap-2">
        <button onClick={onAccept} className="px-4 py-2 rounded-xl font-black text-white hover:scale-105 transition-all" style={{ background: "linear-gradient(145deg,#16a34a,#15803d)" }}>
          ✅ Accept move
        </button>
        <button disabled={!canReroll} onClick={onReroll} className="px-4 py-2 rounded-xl font-black text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "linear-gradient(145deg,#dc2626,#b91c1c)" }}>
          🔁 Reroll ({SHOP_COSTS.reroll})
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Decision modal (standard / convince / roleplay)
// ─────────────────────────────────────────────────────────────
const DecisionModal: React.FC<{
  scenario: DecisionScenario;
  hostName: string;
  dark: boolean;
  currentPlayer: RuntimePlayer;
  alivePlayers: RuntimePlayer[];
  actorLine?: string;
  onSpeak: (t: string) => void;
  onSpeakNPC?: (t: string) => void;
  onResolve: (choiceIdx: number) => void;
}> = ({ scenario, hostName, dark, currentPlayer, alivePlayers, actorLine, onSpeak, onSpeakNPC, onResolve }) => {
  const kind: ScenarioKind = scenario.kind ?? "standard";

  const [sel, setSel] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [spoken, setSpoken] = useState(false);

  // convince round state
  const [votingStarted, setVotingStarted] = useState(false);
  const [votes, setVotes] = useState<Record<string, number>>({});

  // role-play state
  const [roleSpoken, setRoleSpoken] = useState(false);

  useEffect(() => {
    onSpeak(`${scenario.hostIntro} ${scenario.situation}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allVoted = useMemo(() => {
    if (kind !== "convince") return false;
    const aliveIds = alivePlayers.map(p => p.id);
    return aliveIds.every(id => votes[id] !== undefined);
  }, [kind, alivePlayers, votes]);

  const winningVote = useMemo(() => {
    if (kind !== "convince" || !allVoted) return null;
    const tally = [0, 0, 0];
    Object.values(votes).forEach(v => {
      if (v >= 0 && v <= 2) tally[v] += 1;
    });
    const max = Math.max(...tally);
    const winners = tally.map((n, i) => ({ n, i })).filter(x => x.n === max).map(x => x.i);
    // tie breaker: persuader preference if exists, else random
    if (winners.length > 1) {
      if (sel !== null && winners.includes(sel)) return sel;
      return winners[Math.floor(Math.random() * winners.length)];
    }
    return winners[0];
  }, [kind, votes, allVoted, sel]);

  const confirm = (choiceIdx: number) => {
    setConfirmed(true);
    sfx.decision();
    onSpeak(scenario.choices[choiceIdx].hostReaction);
    setTimeout(() => onResolve(choiceIdx), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl border-4 border-purple-500 shadow-2xl" style={{ background: dark ? "linear-gradient(145deg, #1e1b4b, #312e81)" : "linear-gradient(145deg, #f5f3ff, #ede9fe)", boxShadow: "0 0 80px rgba(139,92,246,0.45)" }}>
        <div className="px-6 py-4 border-b-2 border-purple-500/30" style={{ background: dark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.55)" }}>
          <div className="flex items-start gap-4">
            <span className="text-5xl">{kind === "convince" ? "🗣️" : kind === "roleplay" ? "🎭" : "🎯"}</span>
            <div className="flex-1">
              <h2 className={`text-3xl font-black ${dark ? "text-purple-200" : "text-purple-900"}`}>{scenario.title}</h2>
              <p className={`text-lg font-bold ${dark ? "text-amber-300" : "text-amber-800"}`}>Grammar focus: {scenario.grammarFocus}</p>
              {kind === "convince" && (
                <p className={`text-sm font-semibold mt-1 ${dark ? "text-slate-200" : "text-slate-700"}`}>
                  Convince round: {currentPlayer.name} persuades, then everyone votes.
                </p>
              )}
              {kind === "roleplay" && actorLine && (
                <p className={`text-sm font-semibold mt-1 ${dark ? "text-slate-200" : "text-slate-700"}`}>
                  Actor speaks first: “{actorLine}”
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-2xl p-5 border-2 border-purple-400/30" style={{ background: dark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.65)" }}>
            <p className={`text-lg font-black mb-2 ${dark ? "text-amber-300" : "text-amber-800"}`}>🎙️ {hostName}:</p>
            <p className={`text-2xl font-semibold leading-relaxed ${dark ? "text-white" : "text-slate-900"}`}>{scenario.situation}</p>
          </div>

          {kind === "roleplay" && (
            <div className="rounded-2xl p-5 border-2 border-dashed border-cyan-400" style={{ background: dark ? "rgba(34,211,238,0.08)" : "rgba(34,211,238,0.12)" }}>
              <div className={`text-xl font-black ${dark ? "text-cyan-200" : "text-slate-900"}`}>🎭 Role-play</div>
              <div className={`text-sm font-semibold mt-1 ${dark ? "text-slate-200" : "text-slate-700"}`}>
                NPC speaks first (line shown). Then {currentPlayer.name} responds out loud with 2–4 sentences.
              </div>
              {actorLine && (
                <button
                  onClick={() => (onSpeakNPC ?? onSpeak)(actorLine)}
                  className="mt-2 px-4 py-2 rounded-xl font-bold text-white text-sm"
                  style={{ background: "linear-gradient(145deg,#0d9488,#0f766e)" }}
                >
                  🔊 Hear NPC voice: "{actorLine}"
                </button>
              )}
              {!roleSpoken ? (
                <button onClick={() => setRoleSpoken(true)} className="mt-3 px-5 py-3 rounded-xl font-black text-white text-lg" style={{ background: "linear-gradient(145deg,#0ea5e9,#0284c7)" }}>
                  ✅ I responded to the NPC out loud
                </button>
              ) : (
                <div className={`mt-3 font-black ${dark ? "text-cyan-200" : "text-cyan-900"}`}>Ready to choose.</div>
              )}
            </div>
          )}

          <div className="rounded-2xl p-5 border-2 border-dashed border-amber-500" style={{ background: dark ? "rgba(251,191,36,0.08)" : "rgba(251,191,36,0.14)" }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">💬</span>
              <span className={`font-black text-xl ${dark ? "text-amber-300" : "text-amber-800"}`}>SPEAKING TASK</span>
            </div>
            <p className={`text-xl font-semibold ${dark ? "text-amber-100" : "text-slate-900"}`}>{scenario.speakingPrompt}</p>
            {!spoken && (
              <button onClick={() => setSpoken(true)} className="mt-4 px-5 py-3 rounded-xl font-black text-white text-lg" style={{ background: "linear-gradient(145deg, #16a34a, #15803d)" }}>
                ✅ I spoke out loud (30–60 seconds)
              </button>
            )}
          </div>

          {/* STANDARD */}
          {kind === "standard" && spoken && !confirmed && (
            <div className="space-y-4">
              <h3 className={`text-2xl font-black ${dark ? "text-purple-200" : "text-purple-900"}`}>Choose:</h3>
              {scenario.choices.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setSel(i)}
                  className={`w-full text-left rounded-2xl p-5 border-2 transition-all hover:scale-[1.02] ${sel === i ? "ring-4 ring-purple-400" : ""}`}
                  style={{
                    borderColor: sel === i ? "#a855f7" : (dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"),
                    background: sel === i ? (dark ? "rgba(168,85,247,0.25)" : "rgba(168,85,247,0.12)") : (dark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.75)"),
                  }}
                >
                  <div className={`text-xl font-black ${dark ? "text-white" : "text-slate-900"}`}>{String.fromCharCode(65 + i)}. {c.text}</div>
                  <div className={`text-xs font-semibold mt-1 ${dark ? "text-slate-200" : "text-slate-700"}`}>Potential credits effect: {c.effects.credits ?? 0}</div>
                </button>
              ))}

              {sel !== null && (
                <button onClick={() => confirm(sel)} className="w-full py-4 rounded-2xl text-2xl font-black text-white hover:scale-[1.02] transition-all" style={{ background: "linear-gradient(145deg, #8b5cf6, #7c3aed)", boxShadow: "0 8px 30px rgba(139,92,246,0.5)" }}>
                  ✅ Confirm
                </button>
              )}
            </div>
          )}

          {/* CONVINCE */}
          {kind === "convince" && spoken && !confirmed && (
            <div className="space-y-4">
              {!votingStarted ? (
                <div className="rounded-2xl p-4 border-2" style={{ borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", background: dark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.75)" }}>
                  <div className={`text-lg font-black ${dark ? "text-white" : "text-slate-900"}`}>Start voting</div>
                  <div className={`text-sm font-semibold mt-1 ${dark ? "text-slate-200" : "text-slate-700"}`}>
                    Teacher: let {currentPlayer.name} persuade the group first. Then start voting.
                  </div>
                  <button onClick={() => setVotingStarted(true)} className="mt-3 px-5 py-3 rounded-xl font-black text-white" style={{ background: "linear-gradient(145deg,#0ea5e9,#0284c7)" }}>
                    🗳️ Start vote
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <h3 className={`text-2xl font-black ${dark ? "text-purple-200" : "text-purple-900"}`}>Options</h3>
                    {scenario.choices.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => setSel(i)}
                        className={`w-full text-left rounded-2xl p-4 border-2 transition-all hover:scale-[1.01] ${sel === i ? "ring-4 ring-purple-400" : ""}`}
                        style={{
                          borderColor: sel === i ? "#a855f7" : (dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"),
                          background: sel === i ? (dark ? "rgba(168,85,247,0.22)" : "rgba(168,85,247,0.12)") : (dark ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.7)"),
                        }}
                      >
                        <div className={`text-lg font-black ${dark ? "text-white" : "text-slate-900"}`}>{String.fromCharCode(65 + i)}. {c.text}</div>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl p-4 border-2" style={{ borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", background: dark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.75)" }}>
                    <div className={`text-lg font-black ${dark ? "text-white" : "text-slate-900"}`}>Votes</div>
                    <div className={`text-xs font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>Each player picks A/B/C. Tie breaks by persuader choice if selected.</div>

                    <div className="space-y-2 mt-3">
                      {alivePlayers.map(p => (
                        <div key={p.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="text-2xl">{p.avatar}</div>
                            <div className={`text-sm font-black truncate ${dark ? "text-white" : "text-slate-900"}`}>{p.name}</div>
                          </div>
                          <div className="flex gap-2">
                            {[0, 1, 2].map(i => (
                              <button
                                key={i}
                                onClick={() => setVotes(v => ({ ...v, [p.id]: i }))}
                                className="w-10 h-10 rounded-xl font-black border-2"
                                style={{
                                  background: votes[p.id] === i ? "rgba(34,197,94,0.25)" : (dark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.9)"),
                                  borderColor: votes[p.id] === i ? "#22c55e" : (dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"),
                                  color: dark ? "#fff" : "#0f172a",
                                }}
                              >
                                {String.fromCharCode(65 + i)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {allVoted && winningVote !== null && (
                      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                        <div className={`text-sm font-black ${dark ? "text-amber-200" : "text-slate-900"}`}>
                          Winning option: {String.fromCharCode(65 + winningVote)}
                        </div>
                        <button
                          onClick={() => confirm(winningVote)}
                          className="px-5 py-3 rounded-xl font-black text-white hover:scale-[1.01] transition-all"
                          style={{ background: "linear-gradient(145deg,#16a34a,#15803d)" }}
                        >
                          ✅ Confirm group result
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ROLEPLAY */}
          {kind === "roleplay" && spoken && roleSpoken && !confirmed && (
            <div className="space-y-4">
              <h3 className={`text-2xl font-black ${dark ? "text-purple-200" : "text-purple-900"}`}>Choose:</h3>
              {scenario.choices.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setSel(i)}
                  className={`w-full text-left rounded-2xl p-5 border-2 transition-all hover:scale-[1.02] ${sel === i ? "ring-4 ring-purple-400" : ""}`}
                  style={{
                    borderColor: sel === i ? "#a855f7" : (dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"),
                    background: sel === i ? (dark ? "rgba(168,85,247,0.25)" : "rgba(168,85,247,0.12)") : (dark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.75)"),
                  }}
                >
                  <div className={`text-xl font-black ${dark ? "text-white" : "text-slate-900"}`}>{String.fromCharCode(65 + i)}. {c.text}</div>
                </button>
              ))}
              {sel !== null && (
                <button onClick={() => confirm(sel)} className="w-full py-4 rounded-2xl text-2xl font-black text-white hover:scale-[1.02] transition-all" style={{ background: "linear-gradient(145deg, #8b5cf6, #7c3aed)", boxShadow: "0 8px 30px rgba(139,92,246,0.5)" }}>
                  ✅ Confirm
                </button>
              )}
            </div>
          )}

          {confirmed && (
            <div className="rounded-2xl p-4 border-2 border-green-500 animate-fadeIn" style={{ background: dark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.10)" }}>
              <div className={`text-lg font-black ${dark ? "text-green-200" : "text-green-800"}`}>Resolving…</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * The jump scare. A REAL photograph (randomly picked from a small set of
 * freely-licensed horror images) punched up to full screen and pushed hard:
 * scale-punch, chroma jitter, hard strobe, procedural blood, a curtain of drips
 * and film grain, over a recorded scream layered with the synth sting in
 * `sfx.scare()`. Kid mode drops every blood layer and only draws the milder
 * photos.
 */
const JumpScare: React.FC<{ cell: SnakeLadderCell; onDone: () => void; gore?: boolean; animate?: boolean }> = ({ cell, onDone, gore = true, animate = true }) => {
  // One random photo per scare — re-rolled every time the overlay opens.
  const photo = React.useMemo(
    () => pickScarePhoto(Math.floor(Math.random() * 100000) + (cell.destination ?? 0) + (cell.label?.length ?? 0), gore),
    [cell.destination, cell.label, gore],
  );

  useEffect(() => {
    sfx.scare();
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  const seed = (cell.destination ?? 7) + (cell.label?.length ?? 0);

  return (
    <div
      className={`scare-root fixed inset-0 z-[100] cursor-pointer overflow-hidden ${animate ? "scare-anim" : ""}`}
      onClick={onDone}
      style={{
        background: gore
          ? "radial-gradient(ellipse at 50% 38%, #33040a 0%, #0b0104 68%, #000 100%)"
          : "radial-gradient(ellipse at 50% 38%, #1c1140 0%, #05030b 72%, #000 100%)",
      }}
    >
      <style>{SCARE_CSS}</style>

      {/* hard white-out on impact, then a red strobe */}
      <div className="scare-flash" style={{ position: "absolute", inset: 0, background: "#fff" }} />
      <div
        className="scare-strobe"
        style={{
          position: "absolute",
          inset: 0,
          background: gore
            ? "radial-gradient(circle at 50% 42%, rgba(255,20,20,0.55), rgba(0,0,0,0.92))"
            : "radial-gradient(circle at 50% 42%, rgba(168,85,247,0.5), rgba(0,0,0,0.92))",
        }}
      />

      <div className="scare-shake" style={{ position: "absolute", inset: 0 }}>
        <ScarePhotoLayer photo={photo} gore={gore} />
        {gore && (
          <div style={{ position: "absolute", inset: "-8%", pointerEvents: "none", mixBlendMode: "multiply", opacity: 0.92 }}>
            <BloodSplatter seed={seed + 5} />
          </div>
        )}
      </div>

      {gore && <DripCurtain seed={seed + 11} />}
      <GrainOverlay />
      <ScareCredit photo={photo} />

      <div
        className="scare-vignette"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: gore
            ? "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(90,0,0,0.9) 100%)"
            : "radial-gradient(ellipse at center, rgba(0,0,0,0) 44%, rgba(30,0,60,0.85) 100%)",
        }}
      />

      <div style={{ position: "absolute", left: 0, right: 0, bottom: "5%", textAlign: "center", zIndex: 3, pointerEvents: "none" }}>
        <h1
          className="scare-title"
          style={{
            fontFamily: "Cinzel, serif",
            fontWeight: 900,
            fontSize: "clamp(2rem, 6.5vh, 4.4rem)",
            color: gore ? "#fecaca" : "#ddd6fe",
            textShadow: gore ? "0 0 26px rgba(220,38,38,0.95), 0 8px 34px #000" : "0 0 26px rgba(139,92,246,0.95), 0 8px 34px #000",
            letterSpacing: ".02em",
          }}
        >
          {cell.label}
        </h1>
        <p style={{ fontSize: "clamp(1rem, 2.4vh, 1.6rem)", fontWeight: 700, color: gore ? "#fca5a5" : "#c4b5fd" }}>{cell.description}</p>
      </div>
    </div>
  );
};

const VictoryScreen: React.FC<{ winner: RuntimePlayer; players: RuntimePlayer[]; onRestart: () => void }> = ({ winner, players, onRestart }) => {
  useEffect(() => { sfx.victory(); }, []);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 overflow-hidden" style={{ background: "radial-gradient(ellipse, #1a0800, #000)" }}>
      <div className="confetti" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 3.7 + (i % 5) * 2.4) % 100}%`,
              background: ["#fbbf24", "#f59e0b", "#22c55e", "#38bdf8", "#f472b6"][i % 5],
              animationDuration: `${3 + (i % 5) * 0.7}s`,
              animationDelay: `${(i % 7) * 0.35}s`,
            }}
          />
        ))}
      </div>
      <div className="text-center relative">
        <div className="text-[120px] victory-trophy">🏆</div>
        <h1 className="text-7xl font-black text-amber-400 mb-4" style={{ textShadow: "0 0 50px rgba(251,191,36,0.8)" }}>VICTORY</h1>
        <div className="text-8xl mb-3">{winner.avatar}</div>
        <h2 className="text-4xl font-black text-white mb-4">{winner.name} wins!</h2>
        <div className="text-xl font-black text-amber-200 mb-8">Final credits: {winner.credits}</div>
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          {players.map(p => (
            <div key={p.id} className="rounded-2xl p-4 border-2" style={{ borderColor: p.color, background: p.id === winner.id ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.1)" }}>
              <span className="text-4xl block">{p.avatar}</span>
              <span className="text-white font-bold">{p.name}</span>
              <span className="block text-amber-400 font-black text-xl">{p.credits} credits</span>
            </div>
          ))}
        </div>
        <button onClick={onRestart} className="px-12 py-5 rounded-2xl text-3xl font-black text-white hover:scale-105 transition-all" style={{ background: "linear-gradient(145deg, #d97706, #b45309)", boxShadow: "0 0 40px rgba(217,119,6,0.5)" }}>
          🔄 Play again
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Setup Screen
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Teacher control panel (pause · force square · edit stats · reveal question)
// ─────────────────────────────────────────────────────────────
const StatSlider: React.FC<{
  label: string;
  icon: string;
  value: number;
  color: string;
  dark: boolean;
  onChange: (v: number) => void;
}> = ({ label, icon, value, color, dark, onChange }) => (
  <div className="flex items-center gap-2">
    <span style={{ width: 92, fontSize: 12, fontWeight: 800, color: dark ? "#e2e8f0" : "#1e293b" }}>
      {icon} {label}
    </span>
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value)}
      onChange={e => onChange(Number(e.target.value))}
      style={{ flex: 1, accentColor: color }}
    />
    <span style={{ width: 34, textAlign: "right", fontSize: 12, fontWeight: 900, color }}>{Math.round(value)}</span>
  </div>
);

const TeacherBtn: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  tone?: "primary" | "ghost" | "danger" | "warn";
  disabled?: boolean;
  title?: string;
}> = ({ children, onClick, tone = "ghost", disabled, title }) => {
  const tones: Record<string, string> = {
    primary: "linear-gradient(145deg, #0ea5e9, #0369a1)",
    warn: "linear-gradient(145deg, #f59e0b, #b45309)",
    danger: "linear-gradient(145deg, #ef4444, #b91c1c)",
    ghost: "rgba(120,120,140,0.18)",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-lg font-black transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
      style={{ padding: "8px 12px", fontSize: 12.5, color: "#fff", background: tones[tone], border: "1px solid rgba(255,255,255,0.14)" }}
    >
      {children}
    </button>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode; dark: boolean }> = ({ children, dark }) => (
  <div className="flex items-center gap-2 mt-1" style={{ fontSize: 11.5, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", color: dark ? "#fbbf24" : "#b45309" }}>
    {children}
  </div>
);

const TeacherPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  dark: boolean;
  paused: boolean;
  onTogglePause: () => void;
  players: RuntimePlayer[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: Partial<RuntimePlayer>) => void;
  onForce: (square: number, trigger: boolean) => void;
  boardCells: Record<number, SnakeLadderCell>;
  nextQuestion: { square: number; scenario: DecisionScenario } | null;
  onSpeak: (text: string) => void;
  onSendToQuestion: () => void;
  onPassTurn: () => void;
  onDismissQuestion: () => void;
  phase: string;
  totalCells: number;
}> = ({
  open, onClose, dark, paused, onTogglePause, players, selectedId, onSelect, onPatch,
  onForce, boardCells, nextQuestion, onSpeak, onSendToQuestion, onPassTurn, onDismissQuestion, phase, totalCells,
}) => {
  const [square, setSquare] = useState(1);
  const sel = players.find(p => p.id === selectedId) ?? players[0];
  const target = boardCells[square];
  const ink = dark ? "#f8fafc" : "#0f172a";
  const sub = dark ? "rgba(248,250,252,0.62)" : "rgba(15,23,42,0.62)";
  const card = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)";
  const busy = phase === "decision";

  if (!sel) return null;

  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 65, background: "rgba(0,0,0,0.35)" }} />}
      <aside
        className="teacher-panel"
        aria-hidden={!open}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(440px, 94vw)",
          zIndex: 70,
          transform: open ? "translateX(0)" : "translateX(105%)",
          transition: "transform 340ms cubic-bezier(.22,1,.36,1)",
          pointerEvents: open ? "auto" : "none",
          background: dark ? "rgba(10,5,0,0.985)" : "rgba(255,251,235,0.99)",
          borderLeft: `4px solid ${dark ? "#d97706" : "#f59e0b"}`,
          boxShadow: "-24px 0 70px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          color: ink,
        }}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: `2px solid ${dark ? "rgba(251,191,36,0.35)" : "rgba(180,83,9,0.25)"}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 18, fontWeight: 900, color: dark ? "#fbbf24" : "#92400e" }}>🎓 Teacher controls</div>
            <div style={{ fontSize: 11.5, color: sub }}>Demo, adjust and steer the session live</div>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 font-black" style={{ background: "rgba(120,120,140,0.22)", color: ink }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4" style={{ minHeight: 0 }}>
          {/* PAUSE */}
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: card }}>
            <SectionTitle dark={dark}>Flow</SectionTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <TeacherBtn onClick={onTogglePause} tone={paused ? "danger" : "primary"}>
                {paused ? "▶ Resume game" : "⏸ Pause game"}
              </TeacherBtn>
              <TeacherBtn onClick={onPassTurn} disabled={paused}>⏭ Pass turn</TeacherBtn>
              {busy && <TeacherBtn onClick={onDismissQuestion} tone="warn">⏹ Dismiss open question</TeacherBtn>}
            </div>
            <div style={{ fontSize: 11.5, color: sub }}>
              {busy
                ? "A question is on screen. Forcing a square below drops it unscored and continues the demo."
                : paused
                  ? "Paused: the dice, shop and stat decay are frozen. The board is still inspectable."
                  : "Pausing freezes rolling, shopping and stat decay so you can talk through a square."}
            </div>
          </div>

          {/* FORCE A SQUARE */}
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: card }}>
            <SectionTitle dark={dark}>Force a square (demo)</SectionTitle>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={totalCells}
                value={square}
                onChange={e => setSquare(Math.max(1, Math.min(totalCells, Number(e.target.value) || 1)))}
                style={{ width: 74, padding: "6px 8px", borderRadius: 8, border: `1px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`, background: dark ? "rgba(0,0,0,0.4)" : "#fff", color: ink, fontWeight: 900 }}
              />
              <input
                type="range"
                min={1}
                max={totalCells}
                value={square}
                onChange={e => setSquare(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#0ea5e9" }}
              />
            </div>
            <div style={{ fontSize: 11.5, color: sub }}>
              Square {square}
              {target ? ` · ${target.label} · ${target.description}` : " · plain square"}
              {target?.destination ? ` → ${target.destination}` : ""}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <TeacherBtn onClick={() => onForce(square, false)}>🚶 Walk {sel.name} there</TeacherBtn>
              <TeacherBtn onClick={() => onForce(square, true)} tone="warn">⚡ Walk + play the event</TeacherBtn>
            </div>
          </div>

          {/* EDIT STATS */}
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: card }}>
            <SectionTitle dark={dark}>Edit player stats</SectionTitle>
            <select
              value={sel.id}
              onChange={e => onSelect(e.target.value)}
              style={{ padding: "7px 8px", borderRadius: 8, border: `1px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`, background: dark ? "rgba(0,0,0,0.4)" : "#fff", color: ink, fontWeight: 800 }}
            >
              {players.map((p, i) => (
                <option key={p.id} value={p.id}>
                  {i + 1}. {p.name} {p.isAlive ? "" : "(out)"} · sq {p.position}
                </option>
              ))}
            </select>

            <StatSlider label="Health" icon="❤️" value={sel.health} color="#ef4444" dark={dark} onChange={v => onPatch(sel.id, { health: v, isAlive: v > 0 ? true : sel.isAlive })} />
            <StatSlider label="Hunger" icon="🍖" value={sel.hunger} color="#f59e0b" dark={dark} onChange={v => onPatch(sel.id, { hunger: v })} />
            <StatSlider label="Energy" icon="⚡" value={sel.energy} color="#3b82f6" dark={dark} onChange={v => onPatch(sel.id, { energy: v })} />
            <StatSlider label="Morale" icon="🎭" value={sel.morale} color="#a855f7" dark={dark} onChange={v => onPatch(sel.id, { morale: v })} />

            <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 12, fontWeight: 800 }}>
              <span>💳 Credits</span>
              <input
                type="number"
                min={0}
                value={sel.credits}
                onChange={e => onPatch(sel.id, { credits: Math.max(0, Number(e.target.value) || 0) })}
                style={{ width: 84, padding: "5px 8px", borderRadius: 8, border: `1px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`, background: dark ? "rgba(0,0,0,0.4)" : "#fff", color: ink }}
              />
              <span style={{ color: sub }}>🛡️ {sel.shield} · 🧪 {sel.antidote}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <TeacherBtn onClick={() => onPatch(sel.id, { shield: sel.shield + 1 })}>🛡️ +Shield</TeacherBtn>
              <TeacherBtn onClick={() => onPatch(sel.id, { antidote: sel.antidote + 1 })}>🧪 +Antidote</TeacherBtn>
              <TeacherBtn onClick={() => onPatch(sel.id, { health: 100, hunger: 100, energy: 100, morale: 100, isAlive: true })}>✨ Full restore</TeacherBtn>
              <TeacherBtn
                tone={sel.isAlive ? "danger" : "primary"}
                onClick={() => onPatch(sel.id, sel.isAlive ? { isAlive: false } : { isAlive: true, health: Math.max(1, sel.health) })}
              >
                {sel.isAlive ? "💀 Mark out" : "❤️ Revive"}
              </TeacherBtn>
            </div>
          </div>

          {/* REVEAL NEXT QUESTION */}
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: card }}>
            <SectionTitle dark={dark}>Reveal the next question</SectionTitle>
            {nextQuestion ? (
              <>
                <div style={{ fontSize: 12, color: sub }}>
                  Square {nextQuestion.square} · {(nextQuestion.scenario.kind ?? "standard").toUpperCase()} · {nextQuestion.scenario.grammarFocus}
                </div>
                <div style={{ fontSize: 14, fontWeight: 900 }}>{nextQuestion.scenario.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.45 }}>{nextQuestion.scenario.speakingPrompt}</div>
                <div style={{ fontSize: 12, color: sub }}>{nextQuestion.scenario.situation}</div>
                <ol className="flex flex-col gap-1.5" style={{ fontSize: 12.5, paddingLeft: 18, listStyle: "decimal" }}>
                  {nextQuestion.scenario.choices.map(c => (
                    <li key={c.id} style={{ lineHeight: 1.4 }}>
                      {c.text}
                      <span style={{ color: sub }}>
                        {" — "}
                        {Object.entries(c.effects)
                          .filter(([, v]) => typeof v === "number" && v !== 0)
                          .map(([k, v]) => `${k.slice(0, 2).toUpperCase()} ${(v as number) > 0 ? "+" : ""}${v}`)
                          .join(" ")}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="flex items-center gap-2 flex-wrap">
                  <TeacherBtn onClick={() => onSpeak(`${nextQuestion.scenario.hostIntro} ${nextQuestion.scenario.speakingPrompt}`)}>🔊 Read aloud</TeacherBtn>
                  <TeacherBtn tone="warn" onClick={onSendToQuestion}>⚡ Send {sel.name} to it</TeacherBtn>
                </div>
                <div style={{ fontSize: 11.5, color: sub }}>
                  Players only see this when they land on the square — this is your preview.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: sub }}>No decision squares on this board.</div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

const SetupScreen: React.FC<{
  dark: boolean;
  onToggleDark: () => void;
  onBack?: () => void;
  onStart: (payload: {
    settings: GameSettings;
    players: RuntimePlayer[];
    content: { title: string; subtitle: string; decisions: DecisionScenario[]; boardCells: Record<number, SnakeLadderCell> };
  }) => void;
}> = ({ dark, onToggleDark, onBack, onStart }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeTab, setActiveTab] = useState<"group" | "host" | "ai">("group");

  const [title, setTitle] = useState("Tutorly Ladder");
  const [subtitle, setSubtitle] = useState("Personalized speaking survival board game");
  const [mode, setMode] = useState<GameMode>("adult");
  const [hostName, setHostName] = useState("Bruce");
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(0.95);
  const [musicOn, setMusicOn] = useState(true);
  // Seeded from the OS preference, then the player has the last word.
  const [animations, setAnimations] = useState(
    () => typeof window === "undefined" || !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [jumpScares, setJumpScares] = useState(true);
  const [luckRules, setLuckRules] = useState<LuckRules>({ maxAdjustment: 1, strength: 0.35 });

  const [players, setPlayers] = useState<PlayerProfile[]>(() => {
    const a1 = AVATARS[0];
    const a2 = AVATARS[1];
    return [
      { id: "p1", role: "learner", name: a1.name, avatar: a1.emoji, color: a1.color, from: "", interests: [], strengths: [], facts: "" },
      { id: "p2", role: "learner", name: a2.name, avatar: a2.emoji, color: a2.color, from: "", interests: [], strengths: [], facts: "" },
    ];
  });

  const [overrideDecisions, setOverrideDecisions] = useState<DecisionScenario[] | null>(null);
  const [overrideBoard, setOverrideBoard] = useState<Record<number, SnakeLadderCell> | null>(null);

  const [jsonPaste, setJsonPaste] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const decisions = useMemo(() => buildDecisions(mode, overrideDecisions ?? undefined), [mode, overrideDecisions]);
  const boardCells = useMemo(() => overrideBoard ?? createDefaultBoardCells(mode, decisions), [overrideBoard, mode, decisions]);

  const prompt = useMemo(() => buildAIPrompt({ title, subtitle, mode, hostName, speechRate, luckRules, players }), [title, subtitle, mode, hostName, speechRate, luckRules, players]);

  useEffect(() => {
    tts.init();
    sfx.init();
    if (!("speechSynthesis" in window)) return;

    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const updatePlayer = (id: string, patch: Partial<PlayerProfile>) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const addLearner = () => {
    if (players.length >= 6) return;
    const a = AVATARS[players.length % AVATARS.length];
    setPlayers(prev => [...prev, { id: `p${prev.length + 1}`, role: "learner", name: `Learner ${prev.length + 1}`, avatar: a.emoji, color: a.color, from: "", interests: [], strengths: [], facts: "" }]);
  };

  const addActor = () => {
    if (players.length >= 6) return;
    const a = AVATARS[(players.length + 3) % AVATARS.length];
    setPlayers(prev => [...prev, { id: `p${prev.length + 1}`, role: "actor", name: `Actor ${prev.length + 1}`, avatar: a.emoji, color: a.color, traits: ["guide"], dialogueLines: ["Stay calm.", "We can do this.", "Trust me."], luckRate: 7 }]);
  };

  const removePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const testVoice = () => {
    tts.voiceURI = voiceURI;
    tts.rate = speechRate;
    tts.speak(`Hello! I'm ${hostName}. Welcome to Tutorly Snake & Ladder.`);
  };

  const copyPrompt = async () => {
    const ok = await copyToClipboard(prompt);
    setToast(ok ? "✅ Prompt copied" : "Copy failed (permission)" );
    setTimeout(() => setToast(null), 2500);
  };

  const loadAIJson = () => {
    try {
      const parsed = JSON.parse(jsonPaste) as TutorlyGameJSON;
      if (!parsed || parsed.version !== 1) throw new Error("JSON must include version: 1");
      if (!parsed.players?.length) throw new Error("JSON must include players[]");
      if (!parsed.decisions?.length) throw new Error("JSON must include decisions[]");

      setTitle(parsed.title || title);
      setSubtitle(parsed.subtitle || subtitle);
      setMode(parsed.mode || mode);
      setHostName(parsed.host?.name || hostName);
      setVoiceURI(parsed.host?.voiceURI ?? voiceURI);
      setSpeechRate(parsed.host?.speechRate ?? speechRate);
      setLuckRules(parsed.luckRules || luckRules);
      setPlayers(parsed.players.map((p, idx) => ({
        id: p.id || `p${idx + 1}`,
        role: p.role || "learner",
        name: p.name || `Player ${idx + 1}`,
        avatar: p.avatar || "🧑",
        color: p.color || ["#8b5cf6", "#ec4899", "#10b981", "#3b82f6"][idx % 4],
        from: p.from ?? "",
        interests: p.interests ?? [],
        strengths: p.strengths ?? [],
        facts: p.facts ?? "",
        traits: p.traits ?? [],
        dialogueLines: p.dialogueLines ?? [],
        luckRate: normalizeLuckRate(p.luckRate ?? 5),
        actorRole: p.actorRole,
      })));
      setOverrideDecisions(parsed.decisions);

      if (parsed.board?.cells) {
        const override: Record<number, SnakeLadderCell> = {};
        Object.entries(parsed.board.cells).forEach(([k, v]) => {
          const n = Number(k);
          if (Number.isFinite(n) && n >= 1 && n <= TOTAL_CELLS) override[n] = v;
        });
        setOverrideBoard(override);
      }

      setJsonError(null);
      setToast("✅ Personalized JSON loaded");
      setTimeout(() => setToast(null), 2500);
    } catch (e: any) {
      setJsonError(e?.message || "Invalid JSON");
    }
  };

  const start = () => {
    const runtimePlayers: RuntimePlayer[] = players.map((p) => {
      const actorRole = p.role === "actor" ? (p.actorRole ?? getActorRole(p)) : "support";
      const luck = normalizeLuckRate(p.luckRate ?? (p.role === "actor" ? 7 : 5));
      return {
        id: p.id,
        role: p.role,
        actorRole,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        from: p.from,
        interests: p.interests ?? [],
        strengths: p.strengths ?? [],
        facts: p.facts,
        traits: p.traits ?? [],
        dialogueLines: p.dialogueLines ?? [],
        luckRate: luck,
        position: 1,
        health: 100,
        hunger: 70,
        energy: 80,
        morale: 85,
        credits: 20,
        shield: 0,
        antidote: 0,
        voiceURI: p.voiceURI ?? null,
        isAlive: true,
        turnsPlayed: 0,
        arcStep: 0,
        lastArcTurn: -999,
      };
    });

    const settings: GameSettings = {
      mode,
      host: { hostName, voiceURI, speechRate },
      musicOn,
      animations,
      jumpScares,
      luckRules,
    };

    tts.voiceURI = voiceURI;
    tts.rate = speechRate;
    if (musicOn) sfx.startBGM();

    onStart({
      settings,
      players: runtimePlayers,
      content: { title, subtitle, decisions, boardCells },
    });
  };

  const cardBg = dark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.88)";

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: dark ? "linear-gradient(135deg,#0a0500,#1a0a00)" : "linear-gradient(135deg,#fefce8,#ecfccb)" }}>
      <div className="w-full max-w-6xl">
        <div className="text-center mb-5">
          <h1 className="text-5xl font-black" style={{ fontFamily: "Cinzel, serif", background: "linear-gradient(135deg,#d97706,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Tutorly Snake & Ladder
          </h1>
          <p className={`text-xl font-semibold mt-1 ${dark ? "text-amber-300" : "text-slate-800"}`}>{subtitle}</p>

          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            {onBack && (
              <button onClick={onBack} className="px-4 py-2 rounded-full font-black border-2" style={{ borderColor: dark ? "#f59e0b" : "#92400e", color: dark ? "#fbbf24" : "#92400e" }}>
                ← Back to splash
              </button>
            )}
            <button onClick={onToggleDark} className="px-4 py-2 rounded-full font-black border-2" style={{ borderColor: dark ? "#f59e0b" : "#92400e", color: dark ? "#fbbf24" : "#92400e" }}>
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button onClick={() => setMode(m => (m === "kids" ? "adult" : "kids"))} className="px-4 py-2 rounded-full font-black border-2" style={{ borderColor: mode === "kids" ? "#7c3aed" : "#dc2626", color: dark ? "#fff" : "#0f172a" }}>
              Mode: {mode === "kids" ? "Kids" : "Adult"}
            </button>
          </div>
        </div>

        {toast && <div className="mb-3 text-center font-black text-green-700">{toast}</div>}

        <div className="flex rounded-2xl overflow-hidden mb-4 border-2" style={{ borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }}>
          {([
            { k: "group", t: "👥 Group" },
            { k: "host", t: "🎙️ Host & Voice" },
            { k: "ai", t: "🤖 AI Prompt & JSON" },
          ] as const).map(tab => (
            <button
              key={tab.k}
              onClick={() => setActiveTab(tab.k)}
              className="flex-1 py-3 text-base font-black"
              style={{
                background: activeTab === tab.k ? "linear-gradient(135deg,#d97706,#b45309)" : dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.7)",
                color: activeTab === tab.k ? "white" : dark ? "#fbbf24" : "#92400e",
              }}
            >
              {tab.t}
            </button>
          ))}
        </div>

        {activeTab === "group" && (
          <div className="rounded-3xl p-5 border-2" style={{ borderColor: dark ? "#d97706" : "#f59e0b", background: cardBg }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className={`text-2xl font-black ${dark ? "text-amber-300" : "text-slate-900"}`}>Learners & Actors</h2>
              <div className="flex gap-2">
                <button onClick={addLearner} className="px-4 py-2 rounded-xl font-black text-white" style={{ background: "linear-gradient(145deg,#16a34a,#15803d)" }}>+ Learner</button>
                <button onClick={addActor} className="px-4 py-2 rounded-xl font-black text-white" style={{ background: "linear-gradient(145deg,#7c3aed,#6d28d9)" }}>+ Actor</button>
              </div>
            </div>

            <p className={`mt-2 text-sm font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>
              Learners: add interests/strengths/facts. Actors: add traits/dialogue/luck. The AI prompt uses all of this to generate personalized story branches.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {players.map(p => (
                <div key={p.id} className="rounded-2xl p-4 border-2" style={{ borderColor: p.color, background: dark ? `${p.color}14` : `${p.color}12` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-5xl">{p.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input value={p.name} onChange={e => updatePlayer(p.id, { name: e.target.value })} className={`w-full text-lg font-black bg-transparent border-b-2 outline-none ${dark ? "text-white border-white/30" : "text-slate-900 border-slate-300"}`} />
                        <select value={p.role} onChange={e => updatePlayer(p.id, { role: e.target.value as PlayerRole })} className={`px-2 py-1 rounded-lg text-xs font-black border ${dark ? "bg-black/30 text-white border-white/20" : "bg-white text-slate-900 border-slate-200"}`}>
                          <option value="learner">Learner</option>
                          <option value="actor">Actor</option>
                        </select>
                      </div>
                      <div className={`text-xs font-semibold mt-1 ${dark ? "text-slate-200" : "text-slate-700"}`}>ID: {p.id}</div>
                    </div>
                    {players.length > 1 && (
                      <button onClick={() => removePlayer(p.id)} className="px-2 py-1 rounded-lg text-sm font-black" style={{ background: "rgba(239,68,68,0.15)", color: "#dc2626" }}>✕</button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {AVATARS.slice(0, 8).map(a => (
                      <button key={a.emoji} onClick={() => updatePlayer(p.id, { avatar: a.emoji, color: a.color })} className={`w-10 h-10 rounded-lg text-2xl flex items-center justify-center border-2 transition-transform hover:scale-110 ${p.avatar === a.emoji ? "ring-2 ring-amber-500" : ""}`} style={{ borderColor: p.avatar === a.emoji ? a.color : "transparent" }}>
                        {a.emoji}
                      </button>
                    ))}
                  </div>

                  {p.role === "learner" ? (
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className={`text-xs font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>From</label>
                        <input value={p.from ?? ""} onChange={e => updatePlayer(p.id, { from: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-xl border-2 text-sm font-bold outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`} placeholder="e.g., Brazil" />
                      </div>
                      <div>
                        <label className={`text-xs font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Interests (comma)</label>
                        <input value={(p.interests ?? []).join(", ")} onChange={e => updatePlayer(p.id, { interests: safeParseCSV(e.target.value) })} className={`w-full mt-1 px-3 py-2 rounded-xl border-2 text-sm font-bold outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`} placeholder="gaming, travel" />
                      </div>
                      <div>
                        <label className={`text-xs font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Strengths (comma)</label>
                        <input value={(p.strengths ?? []).join(", ")} onChange={e => updatePlayer(p.id, { strengths: safeParseCSV(e.target.value) })} className={`w-full mt-1 px-3 py-2 rounded-xl border-2 text-sm font-bold outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`} placeholder="pronunciation" />
                      </div>
                      <div>
                        <label className={`text-xs font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Facts</label>
                        <textarea value={p.facts ?? ""} onChange={e => updatePlayer(p.id, { facts: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-xl border-2 text-sm font-semibold outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`} rows={3} placeholder="goals, hobbies, fears..." />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className={`text-xs font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Luck rate (0–10)</label>
                        <input type="range" min={0} max={10} step={1} value={normalizeLuckRate(p.luckRate ?? 7)} onChange={e => updatePlayer(p.id, { luckRate: Number(e.target.value) })} className="w-full" />
                        <div className={`text-sm font-black ${dark ? "text-white" : "text-slate-900"}`}>{normalizeLuckRate(p.luckRate ?? 7)}/10</div>
                      </div>
                      <div>
                        <label className={`text-xs font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Traits (comma)</label>
                        <input value={(p.traits ?? []).join(", ")} onChange={e => updatePlayer(p.id, { traits: safeParseCSV(e.target.value) })} className={`w-full mt-1 px-3 py-2 rounded-xl border-2 text-sm font-bold outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`} placeholder="guide, rival, trickster" />
                      </div>
                      <div>
                        <label className={`text-xs font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Dialogue lines (one per line)</label>
                        <textarea value={(p.dialogueLines ?? []).join("\n")} onChange={e => updatePlayer(p.id, { dialogueLines: e.target.value.split("\n").map(x => x.trim()).filter(Boolean) })} className={`w-full mt-1 px-3 py-2 rounded-xl border-2 text-sm font-semibold outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`} rows={4} placeholder="We can do this!\nStay calm.\nTrust me." />
                      </div>
                      <div>
                        <label className={`text-xs font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>NPC backstory</label>
                        <textarea value={p.facts ?? ""} onChange={e => updatePlayer(p.id, { facts: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-xl border-2 text-sm font-semibold outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`} rows={3} placeholder="Who are they? What do they want?" />
                      </div>
                      <div>
                        <label className={`text-xs font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>NPC Read-Aloud Voice</label>
                        <select
                          value={p.voiceURI ?? ""}
                          onChange={e => updatePlayer(p.id, { voiceURI: e.target.value || null })}
                          className={`w-full mt-1 px-3 py-2 rounded-xl border-2 text-sm font-bold outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`}
                        >
                          <option value="">Same as host</option>
                          {voices.map(v => (
                            <option key={v.voiceURI} value={v.voiceURI}>
                              {v.name} — {v.lang}{v.default ? " (default)" : ""}
                            </option>
                          ))}
                        </select>
                        <div className={`text-xs mt-1 ${dark ? "text-slate-200" : "text-slate-700"}`}>Each NPC can have their own voice for roleplay.</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "host" && (
          <div className="rounded-3xl p-5 border-2" style={{ borderColor: dark ? "#d97706" : "#f59e0b", background: cardBg }}>
            <h2 className={`text-2xl font-black ${dark ? "text-amber-300" : "text-slate-900"}`}>Host & Voice</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={`text-sm font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Host name</label>
                <input value={hostName} onChange={e => setHostName(e.target.value)} className={`w-full mt-1 px-4 py-3 rounded-xl border-2 text-lg font-bold outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`} />
              </div>
              <div>
                <label className={`text-sm font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Voice (browser supported)</label>
                <select value={voiceURI ?? ""} onChange={e => setVoiceURI(e.target.value ? e.target.value : null)} className={`w-full mt-1 px-4 py-3 rounded-xl border-2 text-base font-bold outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`}>
                  <option value="">Auto select</option>
                  {voices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} — {v.lang}{v.default ? " (default)" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`text-sm font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Speech rate: {speechRate.toFixed(2)}</label>
                <input type="range" min={0.7} max={1.2} step={0.05} value={speechRate} onChange={e => setSpeechRate(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className={`text-sm font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Music</label>
                <button onClick={() => setMusicOn(v => !v)} className="w-full mt-1 px-4 py-3 rounded-xl font-black border-2" style={{ borderColor: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", background: musicOn ? "rgba(34,197,94,0.15)" : "rgba(107,114,128,0.15)", color: dark ? "#fff" : "#0f172a" }}>
                  {musicOn ? "🎵 Music ON" : "🎵 Music OFF"}
                </button>
                <p className={`text-xs mt-1 ${dark ? "text-amber-200/70" : "text-slate-500"}`}>
                  The 🔊 button on the play screen mutes music, sound effects and voice together.
                </p>
              </div>
              <div>
                <label className={`text-sm font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Animations</label>
                <button onClick={() => setAnimations(v => !v)} className="w-full mt-1 px-4 py-3 rounded-xl font-black border-2" style={{ borderColor: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", background: animations ? "rgba(34,197,94,0.15)" : "rgba(107,114,128,0.15)", color: dark ? "#fff" : "#0f172a" }}>
                  {animations ? "✨ Animations ON" : "🎞 Animations OFF"}
                </button>
                <p className={`text-xs mt-1 ${dark ? "text-amber-200/70" : "text-slate-500"}`}>
                  The slithering snakes, tumbling dice and square pops. Turn off for a still board.
                </p>
              </div>
              <div>
                <label className={`text-sm font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Jump scares</label>
                <button onClick={() => setJumpScares(v => !v)} className="w-full mt-1 px-4 py-3 rounded-xl font-black border-2" style={{ borderColor: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", background: jumpScares ? "rgba(34,197,94,0.15)" : "rgba(107,114,128,0.15)", color: dark ? "#fff" : "#0f172a" }}>
                  {jumpScares ? "😱 Jump scares ON" : "😌 Jump scares OFF"}
                </button>
                <p className={`text-xs mt-1 ${dark ? "text-amber-200/70" : "text-slate-500"}`}>
                  Off = no full-screen scare or scream; the square still costs a little morale. Switch it any time from the play screen.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className={`text-sm font-black ${dark ? "text-amber-200" : "text-slate-800"}`}>Luck rules</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  <div className="rounded-2xl p-3 border" style={{ borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }}>
                    <div className={`text-sm font-black ${dark ? "text-white" : "text-slate-900"}`}>Luck strength: {luckRules.strength.toFixed(2)}</div>
                    <input type="range" min={0} max={0.7} step={0.05} value={luckRules.strength} onChange={e => setLuckRules(p => ({ ...p, strength: Number(e.target.value) }))} className="w-full" />
                    <div className={`text-xs ${dark ? "text-slate-200" : "text-slate-700"}`}>How often luck adds/subtracts 1 from dice.</div>
                  </div>
                  <div className="rounded-2xl p-3 border" style={{ borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }}>
                    <div className={`text-sm font-black ${dark ? "text-white" : "text-slate-900"}`}>Max adjustment</div>
                    <select value={luckRules.maxAdjustment} onChange={e => setLuckRules(p => ({ ...p, maxAdjustment: Number(e.target.value) as 0 | 1 }))} className={`mt-1 w-full px-3 py-2 rounded-xl border-2 text-sm font-bold ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`}>
                      <option value={0}>0 (off)</option>
                      <option value={1}>1</option>
                    </select>
                    <div className={`text-xs mt-1 ${dark ? "text-slate-200" : "text-slate-700"}`}>Keeps luck subtle and fair.</div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button onClick={testVoice} className="flex-1 px-4 py-3 rounded-xl font-black text-white" style={{ background: "linear-gradient(145deg,#16a34a,#15803d)" }}>🔊 Test voice</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-4">
            <div className="rounded-3xl p-5 border-2" style={{ borderColor: "#7c3aed", background: cardBg }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className={`text-2xl font-black ${dark ? "text-purple-200" : "text-slate-900"}`}>AI Prompt</h2>
                <button onClick={copyPrompt} className="px-4 py-2 rounded-xl font-black text-white" style={{ background: "linear-gradient(145deg,#7c3aed,#6d28d9)" }}>📋 Copy prompt</button>
              </div>
              <p className={`text-sm font-semibold mt-2 ${dark ? "text-slate-200" : "text-slate-700"}`}>Use this in your AI. It will return strict JSON containing personalized players, decisions, board, and luck rules.</p>
              <div className="mt-3 rounded-2xl p-3 border overflow-auto max-h-80" style={{ borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", background: dark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.03)" }}>
                <pre className={`text-xs whitespace-pre-wrap ${dark ? "text-green-300" : "text-green-800"}`}>{prompt}</pre>
              </div>
            </div>

            <div className="rounded-3xl p-5 border-2" style={{ borderColor: dark ? "#d97706" : "#f59e0b", background: cardBg }}>
              <h3 className={`text-xl font-black ${dark ? "text-amber-200" : "text-slate-900"}`}>Paste AI JSON response</h3>
              <textarea value={jsonPaste} onChange={e => setJsonPaste(e.target.value)} className={`w-full mt-3 px-4 py-3 rounded-2xl border-2 font-mono text-xs outline-none ${dark ? "bg-black/25 text-white border-white/15" : "bg-white text-slate-900 border-slate-200"}`} rows={10} placeholder='{"version":1, "title":"Tutorly Ladder", ... }' />
              {jsonError && <div className="mt-2 text-sm font-black text-red-600">❌ {jsonError}</div>}
              <div className="flex gap-3 mt-3">
                <button onClick={loadAIJson} className="flex-1 px-4 py-3 rounded-xl font-black text-white" style={{ background: "linear-gradient(145deg,#16a34a,#15803d)" }}>✅ Load JSON</button>
                <button onClick={() => { setJsonPaste(""); setJsonError(null); }} className="flex-1 px-4 py-3 rounded-xl font-black" style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: dark ? "#fff" : "#0f172a", border: "2px solid rgba(0,0,0,0.12)" }}>🧹 Clear</button>
              </div>
            </div>
          </div>
        )}

        <button onClick={start} className="w-full mt-5 py-5 rounded-2xl text-3xl font-black text-white hover:scale-[1.01] transition-all" style={{ background: "linear-gradient(145deg, #dc2626, #d97706, #16a34a)", boxShadow: "0 10px 40px rgba(220,38,38,0.35)", fontFamily: "Cinzel, serif" }}>
          🌿 Start Game
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Board sizing + layout helpers
// ─────────────────────────────────────────────────────────────

/** The board is 10 columns × 5 rows, and a cell is a touch taller than it is
 *  wide so the board fills a 16:9 screen instead of leaving empty side space. */
const BOARD_COLS = 10;
const BOARD_ROWS = 5;
const CELL_ASPECT = 1.4;             // cell height / cell width
const BOARD_RATIO = BOARD_COLS / (BOARD_ROWS * CELL_ASPECT);   // width / height ≈ 1.6

/** Below this width the side rail no longer fits beside the board. */
const RAIL_BREAKPOINT = 1100;

const useNarrow = (max = RAIL_BREAKPOINT) => {
  const [narrow, setNarrow] = useState<boolean>(() => typeof window !== "undefined" && window.innerWidth < max);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < max);
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [max]);
  return narrow;
};

/**
 * The largest 10×5 board that fits the box it is given — the board owns the
 * screen, so it is measured, not guessed with CSS aspect-ratio (which cannot
 * honour both max-width and max-height without distorting the cells).
 */
const useBoardBox = (ref: React.RefObject<HTMLDivElement | null>) => {
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const availW = el.clientWidth;
      const availH = el.clientHeight;
      if (availW < 60) return;
      // In the stacked layout the wrapper has no fixed height (its height IS the
      // frame), so the available width drives the size instead.
      const w = availH > 120 && availW > 60 ? Math.min(availW, availH * BOARD_RATIO) : availW;
      const h = w / BOARD_RATIO;
      setBox(prev => (Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w: Math.round(w), h: Math.round(h) }));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    const passes = [60, 260].map(ms => window.setTimeout(fit, ms));
    fit();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
      passes.forEach(t => window.clearTimeout(t));
    };
  }, [ref]);
  return box;
};

// ─────────────────────────────────────────────────────────────
// Game
// ─────────────────────────────────────────────────────────────
const Game: React.FC<{
  initialPlayers: RuntimePlayer[];
  settings: GameSettings;
  content: { title: string; subtitle: string; decisions: DecisionScenario[]; boardCells: Record<number, SnakeLadderCell> };
  dark: boolean;
  onToggleDark: () => void;
  onRestart: () => void;
}> = ({ initialPlayers, settings: initialSettings, content, dark, onToggleDark, onRestart }) => {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);

  const decisions = useMemo(() => buildDecisions(settings.mode, content.decisions), [settings.mode, content.decisions]);
  const decisionsById = useMemo(() => new Map(decisions.map(d => [d.id, d])), [decisions]);
  const boardCells = useMemo(() => content.boardCells, [content.boardCells]);

  const [players, setPlayers] = useState<RuntimePlayer[]>(initialPlayers);
  const [curIdx, setCurIdx] = useState(0);
  const [dice, setDice] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [phase, setPhase] = useState<"idle" | "rolling" | "postroll" | "moving" | "decision">("idle");
  const [hostMsg, setHostMsg] = useState(settings.mode === "kids" ? "Welcome! Speak clearly and have fun." : "Welcome. Speak clearly. Survive.");
  const [speaking, setSpeaking] = useState(false);
  const [curEvent, setCurEvent] = useState<SnakeLadderCell | null>(null);
  const [curDecision, setCurDecision] = useState<DecisionScenario | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [winner, setWinner] = useState<RuntimePlayer | null>(null);
  const [hlCell, setHlCell] = useState<number | null>(null);
  // board-wide effect wash + shake (snake bite, ladder climb, oasis, death…)
  const [fx, setFx] = useState<null | "snake" | "ladder" | "oasis" | "death" | "jumpscare" | "shield">(null);
  const [fxNonce, setFxNonce] = useState(0);
  const narrow = useNarrow();
  const boardBoxRef = React.useRef<HTMLDivElement | null>(null);
  const boardBox = useBoardBox(boardBoxRef);
  const flashFx = useCallback((kind: "snake" | "ladder" | "oasis" | "death" | "jumpscare" | "shield") => {
    setFx(kind);
    setFxNonce(n => n + 1);
    window.setTimeout(() => setFx(f => (f === kind ? null : f)), 1800);
  }, []);

  // ── Animated walk ────────────────────────────────────────────
  // Moves are never a teleport any more: the token steps one square at a
  // time (`.board-token` transitions left/top), leaving a fading trail, and
  // snake slides / ladder climbs ride the drawn link square by square.
  const [movingId, setMovingId] = useState<string | null>(null);
  const [arrivedCell, setArrivedCell] = useState<number | null>(null);
  const [trail, setTrail] = useState<TrailDot[]>([]);
  const [activeLink, setActiveLink] = useState<number | null>(null);
  const walkTimers = useRef<number[]>([]);
  const trailSeq = useRef(0);

  const clearWalks = useCallback(() => {
    walkTimers.current.forEach(t => window.clearTimeout(t));
    walkTimers.current = [];
  }, []);

  useEffect(() => () => clearWalks(), [clearWalks]);

  const pushTrail = useCallback((n: number) => {
    setTrail(prev => [...prev.slice(-24), { id: ++trailSeq.current, n }]);
  }, []);

  const walkPath = useCallback(
    (playerId: string, from: number, to: number, o: { perStep?: number; ride?: boolean; onDone?: () => void } = {}) => {
      const total = Math.abs(to - from);
      if (total === 0) {
        o.onDone?.();
        return;
      }
      const dir = to > from ? 1 : -1;
      const perStep = o.perStep ?? 185;
      setMovingId(playerId);
      if (o.ride) walkTimers.current.push(window.setTimeout(() => sfx.slide(dir > 0), 20));
      else walkTimers.current.push(window.setTimeout(() => sfx.move(), 0));

      for (let i = 1; i <= total; i++) {
        walkTimers.current.push(
          window.setTimeout(() => {
            const pos = from + dir * i;
            setPlayers(prev => prev.map(p => (p.id === playerId ? { ...p, position: pos } : p)));
            pushTrail(pos);
            if (!o.ride) sfx.tick(i);
          }, i * perStep),
        );
      }

      walkTimers.current.push(
        window.setTimeout(() => {
          setMovingId(null);
          setArrivedCell(to);
          walkTimers.current.push(window.setTimeout(() => setArrivedCell(null), 720));
          o.onDone?.();
        }, total * perStep + 40),
      );
    },
    [pushTrail],
  );

  const paceFor = (distance: number, total: number) => Math.max(95, Math.min(215, total / Math.max(1, distance)));

  // ── Teacher controls ─────────────────────────────────────────
  const [paused, setPaused] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [teacherId, setTeacherId] = useState<string>(() => initialPlayers[0]?.id ?? "");

  // post-roll
  const [pendingTarget, setPendingTarget] = useState<number | null>(null);
  // The square the dice just landed on: it gets its own strong reaction so the
  // roll result reads on the board, not only on the dice.
  const [rollHit, setRollHit] = useState<{ square: number; value: number; nonce: number } | null>(null);
  const [masterMute, setMasterMute] = useState(false);
  // The bite: which snake (by its head square) is striking, and how hard.
  const [bite, setBite] = useState<{ square: number; playerId: string; amount: number; nonce: number } | null>(null);

  // assist
  const [assistOpen, setAssistOpen] = useState(false);

  const cur = players[curIdx];

  // init
  useEffect(() => {
    tts.init();
    sfx.init();
    preloadScarePhotos();
    setMasterMute(sfx.isMuted());
    tts.voiceURI = settings.host.voiceURI;
    tts.rate = settings.host.speechRate;
    if (settings.musicOn && !sfx.isMuted()) sfx.startBGM();

    return () => {
      sfx.stopBGM();
      tts.stop();
    };
  }, []);

  useEffect(() => {
    if (settings.musicOn) sfx.startBGM();
    else sfx.stopBGM();
  }, [settings.musicOn]);

  const speak = useCallback((t: string) => {
    setSpeaking(true);
    tts.voiceURI = settings.host.voiceURI;
    tts.rate = settings.host.speechRate;
    tts.speak(t, () => setSpeaking(false));
  }, [settings.host.voiceURI, settings.host.speechRate]);

  const stopSpeak = useCallback(() => {
    tts.stop();
    setSpeaking(false);
  }, []);

  const host = useCallback((m: string, auto = true) => {
    setHostMsg(m);
    if (auto) speak(m);
  }, [speak]);

  // spotlight camera: focus on current player's position (or highlighted move target)
  const boardLayout = useMemo(() => {
    const rows: number[][] = [];
    for (let r = 4; r >= 0; r--) {
      const row: number[] = [];
      const rev = (4 - r) % 2 === 1;
      for (let c = 0; c < 10; c++) row.push(r * 10 + c + 1);
      if (rev) row.reverse();
      rows.push(row);
    }
    return rows;
  }, []);

  const posMap = useMemo(() => {
    const map = new Map<number, { row: number; col: number }>();
    boardLayout.forEach((row, r) => row.forEach((num, c) => map.set(num, { row: r, col: c })));
    return map;
  }, [boardLayout]);

  /** Every snake and ladder link on this board, ready to be drawn. */
  const links = useMemo<BoardLink[]>(() => {
    const out: BoardLink[] = [];
    Object.keys(boardCells).forEach(k => {
      const n = Number(k);
      const c = boardCells[n];
      if ((c.type === "snake" || c.type === "ladder") && c.destination) {
        out.push({ from: n, to: c.destination, kind: c.type });
      }
    });
    return out.sort((a, b) => b.from - a.from);
  }, [boardCells]);

  const boardTokens = useMemo(
    () => players.filter(p => p.isAlive).map(p => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, position: p.position })),
    [players],
  );

  const spotlightCell = pendingTarget ?? hlCell ?? cur.position;
  const spotlightPos = posMap.get(spotlightCell) ?? { row: 2, col: 5 };
  const transformOrigin = `${((spotlightPos.col + 0.5) / 10) * 100}% ${((spotlightPos.row + 0.5) / 5) * 100}%`;

  // real-time stat decay while idle
  useEffect(() => {
    if (phase !== "idle" || paused || !cur?.isAlive) return;
    const id = setInterval(() => {
      setPlayers(prev => prev.map((p, i) => {
        if (i !== curIdx || !p.isAlive) return p;

        const modeFactor = settings.mode === "kids" ? 0.6 : 1;
        const hungerDecay = -0.25 * modeFactor;
        const energyDecay = -0.18 * modeFactor;
        const moraleDecay = (p.hunger < 30 ? -0.22 : -0.08) * modeFactor;
        const healthDecay = (p.hunger < 15 ? -0.18 : 0) * modeFactor;

        const next = {
          ...p,
          hunger: Math.max(0, p.hunger + hungerDecay),
          energy: Math.max(0, p.energy + energyDecay),
          morale: Math.max(0, p.morale + moraleDecay),
          health: Math.max(0, p.health + healthDecay),
        };
        if (next.health <= 0) return { ...next, isAlive: false };
        return next;
      }));
    }, 650);
    return () => clearInterval(id);
  }, [phase, curIdx, cur?.isAlive, settings.mode, paused]);

  const nextTurn = useCallback(() => {
    setPlayers(prev => {
      const updated = prev.map((p, i) => i === curIdx ? { ...p, turnsPlayed: p.turnsPlayed + 1 } : p);
      const alive = updated.filter(p => p.isAlive);
      if (alive.length === 0) return updated;

      let next = (curIdx + 1) % updated.length;
      let tries = 0;
      while (!updated[next].isAlive && tries < updated.length) {
        next = (next + 1) % updated.length;
        tries++;
      }
      setCurIdx(next);
      return updated;
    });
    setPendingTarget(null);
    setPhase("idle");
  }, [curIdx]);

  const applyEffects = useCallback((id: string, effects: DecisionScenario["choices"][number]["effects"]) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = {
        ...p,
        health: clamp(p.health + (effects.health ?? 0), 0, 100),
        hunger: clamp(p.hunger + (effects.hunger ?? 0), 0, 100),
        energy: clamp(p.energy + (effects.energy ?? 0), 0, 100),
        morale: clamp(p.morale + (effects.morale ?? 0), 0, 100),
        credits: Math.max(0, p.credits + (effects.credits ?? 0)),
      };
      return { ...next, isAlive: next.health > 0 };
    }));
  }, []);

  const tryMiniArc = useCallback((p: RuntimePlayer) => {
    if (p.role !== "learner") return;

    // small, occasional personalization boost
    if (p.turnsPlayed - p.lastArcTurn < 4) return;
    if (Math.random() > 0.35) return;

    const interest = pickOne(p.interests, "");
    const strength = pickOne(p.strengths, "");
    const from = p.from ?? "";

    const lines: string[] = [];
    if (from) lines.push(`Your background from ${from} helps you stay calm in this moment.`);
    if (interest) lines.push(`Your interest in ${interest} gives you a useful idea.`);
    if (strength) lines.push(`You use your strength in ${strength} to handle the situation better.`);
    if (!lines.length && p.facts) lines.push(`A personal detail about you helps you connect to this scenario.`);

    const line = pickOne(lines, `You find a personal spark of confidence.`);
    host(`Personal arc: ${line} (+morale, +credits)`, false);

    setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, morale: clamp(x.morale + 8, 0, 100), credits: x.credits + 3, arcStep: x.arcStep + 1, lastArcTurn: x.turnsPlayed } : x));
  }, [host]);

  const processCell = useCallback((pos: number, p: RuntimePlayer) => {
    if (pos >= TOTAL_CELLS) {
      setWinner(p);
      setShowVictory(true);
      return;
    }

    const cell = boardCells[pos];
    setCurEvent(cell);

    if (!cell || cell.type === "start") {
      host(`Square ${pos}. Keep going, ${p.name}!`);
      setTimeout(nextTurn, 1400);
      return;
    }

    host(cell.hostComment);

    if (cell.type === "decision" && cell.decisionId) {
      const d = decisionsById.get(cell.decisionId);
      if (d) {
        // mini arc boost
        tryMiniArc(p);
        setTimeout(() => {
          setCurDecision(d);
          setPhase("decision");
        }, 850);
      } else {
        setTimeout(nextTurn, 1400);
      }
      return;
    }

    if (cell.type === "snake") {
      // Shield/antidote counterplay
      const current = players.find(x => x.id === p.id) ?? p;
      if (current.shield > 0) {
        host(`${p.name}'s shield blocked the snake! 🛡️`, true);
        flashFx("shield");
        sfx.decision();
        setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, shield: Math.max(0, x.shield - 1), morale: clamp(x.morale - 5, 0, 100), credits: Math.max(0, x.credits + 2) } : x));
        setTimeout(nextTurn, 1600);
        return;
      }
      if (current.antidote > 0) {
        host(`${p.name} used antidote to resist the bite! 🧪`, true);
        flashFx("shield");
        sfx.decision();
        setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, antidote: Math.max(0, x.antidote - 1), morale: clamp(x.morale - 8, 0, 100), health: clamp(x.health - 6, 0, 100) } : x));
        setTimeout(nextTurn, 1700);
        return;
      }

      // The bite lands ON ARRIVAL: the snake strikes the token, the token shakes,
      // the morale hit is taken immediately — then the animal drags them down.
      const hit = settings.mode === "kids" ? 10 : 20;
      sfx.bite();
      flashFx("snake");
      setBite({ square: pos, playerId: p.id, amount: hit, nonce: Date.now() });
      setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, morale: clamp(x.morale - hit, 0, 100) } : x));
      const dest = cell.destination || 1;
      setHlCell(dest);
      setTimeout(() => {
        setActiveLink(pos);
        walkPath(p.id, pos, dest, {
          perStep: paceFor(Math.abs(pos - dest), 1500),
          ride: true,
          onDone: () => {
            setActiveLink(null);
            setHlCell(null);
            setBite(null);
            setTimeout(nextTurn, 550);
          },
        });
      }, BITE_MS);
      return;
    }

    if (cell.type === "ladder") {
      sfx.ladder();
      flashFx("ladder");
      const dest = cell.destination || TOTAL_CELLS;
      setHlCell(dest);
      setActiveLink(pos);
      walkPath(p.id, pos, dest, {
        perStep: paceFor(Math.abs(pos - dest), 1600),
        ride: true,
        onDone: () => {
          setActiveLink(null);
          setHlCell(null);
          setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, morale: clamp(x.morale + 12, 0, 100), credits: x.credits + 8 } : x));
          setTimeout(nextTurn, 550);
        },
      });
      return;
    }

    if (cell.type === "oasis") {
      sfx.oasis();
      flashFx("oasis");
      setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, health: 100, hunger: 100, energy: 100, morale: 100, credits: x.credits + 6 } : x));
      setTimeout(nextTurn, 2100);
      return;
    }

    if (cell.type === "death") {
      const current = players.find(x => x.id === p.id) ?? p;
      if (current.antidote > 0) {
        host(`${p.name} used antidote to avoid the worst outcome! 🧪`, true);
        flashFx("shield");
        sfx.decision();
        const dest = Math.max(1, pos - 3);
        setHlCell(dest);
        walkPath(p.id, pos, dest, {
          perStep: paceFor(3, 1100),
          ride: true,
          onDone: () => {
            setHlCell(null);
            setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, antidote: Math.max(0, x.antidote - 1), health: clamp(x.health - 8, 0, 100), morale: clamp(x.morale - 10, 0, 100) } : x));
            setTimeout(nextTurn, 400);
          },
        });
        return;
      }

      sfx.death();
      flashFx("death");
      const dest = cell.destination || 1;
      setHlCell(dest);
      setActiveLink(pos);
      walkPath(p.id, pos, dest, {
        perStep: paceFor(Math.abs(pos - dest), 1650),
        ride: true,
        onDone: () => {
          setActiveLink(null);
          setHlCell(null);
          setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, health: clamp(x.health - (settings.mode === "kids" ? 15 : 40), 0, 100), morale: clamp(x.morale - (settings.mode === "kids" ? 10 : 30), 0, 100) } : x));
          setTimeout(nextTurn, 600);
        },
      });
      return;
    }

    if (cell.type === "jumpscare") {
      if (settings.jumpScares === false) {
        // Scares switched off: the square still costs you, it just does not throw
        // a photograph and a scream at the room.
        host(`${p.name} feels a sudden chill and steadies their nerves.`, true);
        setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, morale: clamp(x.morale - 6, 0, 100) } : x));
        setTimeout(nextTurn, 1600);
        return;
      }
      flashFx("jumpscare");
      setShowJump(true);
      return;
    }

    setTimeout(nextTurn, 1400);
  }, [boardCells, decisionsById, flashFx, host, nextTurn, players, settings.mode, tryMiniArc, walkPath]);

  const roll = useCallback(() => {
    if (phase !== "idle" || rolling || paused || !cur?.isAlive) return;

    setRolling(true);
    setPhase("rolling");
    sfx.dice();

    let cnt = 0;
    const iv = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      cnt++;
      if (cnt > 10) {
        clearInterval(iv);

        const base = Math.floor(Math.random() * 6) + 1;
        const adjusted = luckAdjustedRoll(base, cur.luckRate, settings.luckRules);
        setDice(adjusted);
        setRolling(false);

        const target = Math.min(TOTAL_CELLS, cur.position + adjusted);
        setPendingTarget(target);
        setHlCell(target);
        setRollHit({ square: target, value: adjusted, nonce: Date.now() });
        setPhase("postroll");
        host(`${cur.name} rolled ${adjusted}. You can accept or reroll.`, false);
      }
    }, 70);
  }, [phase, rolling, cur, settings.luckRules, host, paused]);

  const acceptMove = useCallback(() => {
    if (pendingTarget === null) return;
    const np = pendingTarget;
    setPhase("moving");
    setActiveLink(null);
    walkPath(cur.id, cur.position, np, {
      perStep: paceFor(Math.abs(np - cur.position), 900),
      onDone: () => {
        setHlCell(null);
        setPendingTarget(null);
        processCell(np, { ...cur, position: np });
      },
    });
  }, [pendingTarget, cur, processCell, walkPath]);

  // Fade the roll reaction out again once it has played.
  useEffect(() => {
    if (!rollHit) return;
    const t = setTimeout(() => setRollHit(null), 1400);
    return () => clearTimeout(t);
  }, [rollHit]);

  const doReroll = useCallback(() => {
    if (phase !== "postroll") return;
    if (cur.credits < SHOP_COSTS.reroll) return;

    setPlayers(prev => prev.map(p => p.id === cur.id ? { ...p, credits: p.credits - SHOP_COSTS.reroll } : p));
    setPhase("idle");
    setPendingTarget(null);
    setHlCell(null);
    host(`${cur.name} spends credits to reroll!`, true);
    setTimeout(roll, 400);
  }, [phase, cur, host, roll]);

  const handleDecisionResolve = useCallback((choiceIdx: number) => {
    if (!curDecision) return;
    const choice = curDecision.choices[choiceIdx];
    // apply effects
    applyEffects(cur.id, choice.effects);

    // narrative: actor recurring role taunts/cheers
    if (cur.role === "actor") {
      const extra = cur.actorRole === "rival"
        ? `Rival energy: ${cur.name} smirks at the outcome.`
        : cur.actorRole === "guide"
        ? `Guide energy: ${cur.name} nods approvingly.`
        : cur.actorRole === "trickster"
        ? `Trickster energy: ${cur.name} laughs… was that advice even real?`
        : `${cur.name} stays quiet.`;
      host(extra, false);
    }

    setCurDecision(null);
    nextTurn();
  }, [curDecision, applyEffects, cur, host, nextTurn]);

  const buyShield = useCallback(() => {
    if (paused || (phase !== "idle" && phase !== "postroll")) return;
    if (cur.credits < SHOP_COSTS.shield) return;
    setPlayers(prev => prev.map(p => p.id === cur.id ? { ...p, credits: p.credits - SHOP_COSTS.shield, shield: p.shield + 1 } : p));
    host(`${cur.name} bought a shield. 🛡️`, true);
  }, [cur, phase, host]);

  const buyAntidote = useCallback(() => {
    if (paused || (phase !== "idle" && phase !== "postroll")) return;
    if (cur.credits < SHOP_COSTS.antidote) return;
    setPlayers(prev => prev.map(p => p.id === cur.id ? { ...p, credits: p.credits - SHOP_COSTS.antidote, antidote: p.antidote + 1 } : p));
    host(`${cur.name} bought antidote. 🧪`, true);
  }, [cur, phase, host]);

  const buyFood = useCallback(() => {
    if (paused || (phase !== "idle" && phase !== "postroll")) return;
    if (cur.credits < SHOP_COSTS.food) return;
    setPlayers(prev => prev.map(p => p.id === cur.id ? {
      ...p,
      credits: p.credits - SHOP_COSTS.food,
      hunger: clamp(p.hunger + 20, 0, 100),
      energy: clamp(p.energy + 10, 0, 100),
      morale: clamp(p.morale + 5, 0, 100),
    } : p));
    host(`${cur.name} eats food and regains strength. 🍖`, true);
  }, [cur, phase, host]);

  const askHost = useCallback(() => {
    if (paused || (phase !== "idle" && phase !== "postroll")) return;
    if (cur.credits < SHOP_COSTS.askHost) return;

    setPlayers(prev => prev.map(p => p.id === cur.id ? { ...p, credits: p.credits - SHOP_COSTS.askHost } : p));

    const cell = boardCells[cur.position];
    if (cell?.type === "decision" && cell.decisionId) {
      const d = decisionsById.get(cell.decisionId);
      if (d) {
        const hint = `Hint: Focus on ${d.grammarFocus}. Keep your speaking clear: 2 reasons + 1 example.`;
        host(hint, true);
        return;
      }
    }
    host("Hint: Speak in full sentences. Give reasons, examples, and a consequence.", true);
  }, [phase, cur, boardCells, decisionsById, host]);

  const openAssist = useCallback(() => {
    if (paused || (phase !== "idle" && phase !== "postroll")) return;
    if (cur.credits < SHOP_COSTS.assist) return;
    setAssistOpen(true);
  }, [phase, cur]);

  const pickHelper = useCallback((helperId: string) => {
    setAssistOpen(false);
    if (cur.credits < SHOP_COSTS.assist) return;

    const helper = players.find(p => p.id === helperId);
    if (!helper) return;

    setPlayers(prev => prev.map(p => {
      if (p.id === cur.id) return { ...p, credits: p.credits - SHOP_COSTS.assist, morale: clamp(p.morale + 8, 0, 100) };
      if (p.id === helperId) return { ...p, morale: clamp(p.morale + 3, 0, 100), credits: p.credits + 1 };
      return p;
    }));

    const prompt = helper.role === "actor"
      ? `Teammate assist: ${helper.name} (${helper.actorRole}) gives advice. ${helper.dialogueLines[0] || "Stay calm."}`
      : `Teammate assist: ${helper.name}, please give advice in English for 15–30 seconds.`;

    host(prompt, true);
  }, [cur, players, host]);

  // ── Teacher control callbacks ────────────────────────────────
  const patchPlayer = useCallback((id: string, patch: Partial<RuntimePlayer>) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const teacherPlayer = players.find(p => p.id === teacherId) ?? cur;

  /** The next decision square ahead of the active player — the question to reveal. */
  const nextQuestion = useMemo(() => {
    const squares = Object.keys(boardCells)
      .map(Number)
      .filter(n => boardCells[n].type === "decision" && boardCells[n].decisionId)
      .sort((a, b) => a - b);
    if (!squares.length) return null;
    const from = cur?.position ?? 1;
    const n = squares.find(s => s > from) ?? squares[0];
    const scenario = decisionsById.get(boardCells[n].decisionId as string);
    return scenario ? { square: n, scenario } : null;
  }, [boardCells, decisionsById, cur?.position]);

  /** Close an open question without scoring it, and move on. */
  const dismissQuestion = useCallback(() => {
    setCurDecision(null);
    nextTurn();
  }, [nextTurn]);

  /** Demo jump: walk any player to any square, optionally playing the event there. */
  const forceSquare = useCallback(
    (square: number, trigger: boolean) => {
      const target = Math.max(1, Math.min(TOTAL_CELLS, Math.round(square)));
      const p = players.find(x => x.id === teacherId) ?? cur;
      if (!p || showJump || showVictory) return;
      // A teacher may force a square while a question is on screen — the
      // question is dropped unscored so the demo can continue.
      if (phase === "decision") setCurDecision(null);
      setPendingTarget(null);
      setActiveLink(null);
      setHlCell(target);
      setPhase("moving");
      host(`Teacher demo: ${p.name} walks to square ${target}.`, false);
      walkPath(p.id, p.position, target, {
        perStep: 130,
        onDone: () => {
          setHlCell(null);
          if (trigger) {
            processCell(target, { ...p, position: target });
          } else {
            setArrivedCell(target);
            window.setTimeout(() => setArrivedCell(null), 720);
            setPhase("idle");
          }
        },
      });
    },
    [players, teacherId, cur, phase, showJump, showVictory, host, walkPath, processCell],
  );

  // Actor line for roleplay: pick a recurring NPC (guide/trickster/rival) if present
  const roleplayActorLine = useMemo(() => {
    if (!curDecision || (curDecision.kind ?? "standard") !== "roleplay") return undefined;
    const npcs = players.filter(p => p.isAlive && p.role === "actor");
    if (!npcs.length) return "(No NPC available — teacher can role-play as the NPC.)";
    const priority = npcs.find(a => a.actorRole === "trickster") || npcs.find(a => a.actorRole === "rival") || npcs.find(a => a.actorRole === "guide") || npcs[0];
    const line = pickOne(priority.dialogueLines, "I have a suggestion…");
    return `${priority.name}: ${line}`;
  }, [curDecision, players]);

  // Speak as NPC (uses NPC's own voice if set)
  const speakAsNPC = useCallback((text: string) => {
    const npcs = players.filter(p => p.isAlive && p.role === "actor");
    const priority = npcs.find(a => a.actorRole === "trickster") || npcs.find(a => a.actorRole === "rival") || npcs.find(a => a.actorRole === "guide") || npcs[0];
    if (priority?.voiceURI) {
      const savedURI = tts.voiceURI;
      tts.voiceURI = priority.voiceURI;
      setSpeaking(true);
      tts.speak(text, () => { tts.voiceURI = savedURI; setSpeaking(false); });
    } else {
      speak(text);
    }
  }, [players, speak]);

  // Spotlight mode: dim others when focusing
  const spotlightNum = spotlightCell;

  const alivePlayers = useMemo(() => players.filter(p => p.isAlive), [players]);

  return (
    <div
      className={`play-root ${settings.animations === false ? "anim-off" : ""}`}
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: dark ? "linear-gradient(145deg, #0a0500, #1a0a00)" : "linear-gradient(145deg, #fefce8, #ecfccb)",
      }}
    >
      {curDecision && (
        <DecisionModal
          scenario={curDecision}
          hostName={settings.host.hostName}
          dark={dark}
          currentPlayer={cur}
          alivePlayers={alivePlayers}
          actorLine={roleplayActorLine}
          onSpeak={speak}
          onSpeakNPC={speakAsNPC}
          onResolve={handleDecisionResolve}
        />
      )}

      {/* Blood in the lens: a short, heavy spray over the whole screen at the
          moment of the bite. Hidden when animations are off. */}
      {bite && settings.animations !== false && (
        <div className="bite-blood" aria-hidden>
          <span className="bite-flash" key={`f${bite.nonce}`} />
          <div className="bite-spray" key={`s${bite.nonce}`}>
            <BloodSplatter seed={bite.nonce % 97} opacity={0.85} />
          </div>
          <span className="bite-vignette" key={`v${bite.nonce}`} />
        </div>
      )}

      {showJump && curEvent && (
        <JumpScare
          cell={curEvent}
          gore={settings.mode !== "kids"}
          animate={settings.animations !== false}
          onDone={() => {
            setShowJump(false);
            setPlayers(prev => prev.map(p => p.id === cur.id ? { ...p, morale: clamp(p.morale - (settings.mode === "kids" ? 10 : 22), 0, 100) } : p));
            nextTurn();
          }}
        />
      )}

      {showVictory && winner && (
        <VictoryScreen winner={winner} players={players} onRestart={onRestart} />
      )}

      <TeacherPanel
        open={teacherOpen}
        onClose={() => setTeacherOpen(false)}
        dark={dark}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        players={players}
        selectedId={teacherPlayer?.id ?? teacherId}
        onSelect={setTeacherId}
        onPatch={patchPlayer}
        onForce={forceSquare}
        boardCells={boardCells}
        nextQuestion={nextQuestion}
        onSpeak={speak}
        onSendToQuestion={() => {
          if (nextQuestion) forceSquare(nextQuestion.square, true);
        }}
        onPassTurn={nextTurn}
        onDismissQuestion={dismissQuestion}
        phase={phase}
        totalCells={TOTAL_CELLS}
      />

      <AssistModal
        open={assistOpen}
        dark={dark}
        current={cur}
        others={players.filter(p => p.isAlive && p.id !== cur.id)}
        onClose={() => setAssistOpen(false)}
        onPick={pickHelper}
      />

      {/* Header — compact on purpose: the board owns the screen. */}
      <div
        className="play-header flex items-center justify-between gap-3"
        style={{
          flexShrink: 0,
          padding: "8px 16px",
          borderBottom: `4px solid ${dark ? "#d97706" : "#f59e0b"}`,
          background: dark ? "rgba(10,5,0,0.97)" : "rgba(255,252,235,0.97)",
          backdropFilter: "blur(10px)",
          zIndex: 30,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-lg font-black truncate" style={{ fontFamily: "Cinzel, serif", background: "linear-gradient(135deg, #d97706, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {content.title}
          </div>
          <span className={`hidden md:inline text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${dark ? "text-amber-200 bg-amber-500/15" : "text-amber-800 bg-amber-500/15"}`}>
            {settings.mode === "kids" ? "Kids" : "Adult"} • Host: {settings.host.hostName}
          </span>
        </div>

        <div className="flex gap-2 items-center">
          {paused && (
            <span className="text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap" style={{ background: "#b91c1c", color: "#fff" }}>
              ⏸ PAUSED
            </span>
          )}
          <div className={`hidden sm:block text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap ${dark ? "text-amber-200 bg-white/5" : "text-amber-800 bg-black/5"}`}>
            ▶ {cur?.name} · {cur?.credits ?? 0} credits
          </div>
          <button
            onClick={() => setTeacherOpen(o => !o)}
            title="Teacher controls: pause, force a square, edit stats, reveal the next question"
            className="px-3 py-1.5 rounded-lg text-sm font-black border"
            style={{
              borderColor: teacherOpen ? (dark ? "#fbbf24" : "#b45309") : dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
              background: teacherOpen ? "rgba(14,165,233,0.2)" : "transparent",
              color: dark ? "#fbbf24" : "#92400e",
            }}
          >
            🎓 {teacherOpen ? "Hide controls" : "Teacher"}
          </button>
          <button onClick={() => setSettings(s => ({ ...s, musicOn: !s.musicOn }))} title={settings.musicOn ? "Music on — click to stop the music" : "Music off — click to start the music"} className="px-3 py-1.5 rounded-lg text-sm font-black border" style={{ borderColor: dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)", color: dark ? "#fbbf24" : "#92400e" }}>
            {settings.musicOn ? "🎵" : "🎵̸"}
          </button>
          <button
            onClick={() => setSettings(s => ({ ...s, jumpScares: s.jumpScares === false }))}
            title={settings.jumpScares === false ? "Jump scares off — click to turn them back on" : "Jump scares on — click to switch them off"}
            className="px-3 py-1.5 rounded-lg text-sm font-black border"
            style={{ borderColor: dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)", color: dark ? "#fbbf24" : "#92400e" }}
          >
            {settings.jumpScares === false ? "😌" : "😱"}
          </button>
          <button
            onClick={() => setSettings(s => ({ ...s, animations: !(s.animations !== false) }))}
            title={settings.animations !== false ? "Board animations on (snakes slither, dice tumble)" : "Board animations off — click to bring them back"}
            className="px-3 py-1.5 rounded-lg text-sm font-black border"
            style={{ borderColor: dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)", color: dark ? "#fbbf24" : "#92400e" }}
          >
            {settings.animations !== false ? "✨" : "🎞"}
          </button>
          <button
            onClick={() => {
              sfx.init();
              const next = !masterMute;
              setMasterMute(next);
              sfx.setMasterMuted(next);
              if (!next) sfx.startBGM();
            }}
            title={masterMute ? "Sound muted — click to unmute everything" : "Click to mute music, effects and voice"}
            className="px-3 py-1.5 rounded-lg text-sm font-black border"
            style={{ borderColor: dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)", color: dark ? "#fbbf24" : "#92400e" }}
          >
            {masterMute ? "🔇" : "🔊"}
          </button>
          <button onClick={onToggleDark} className="px-3 py-1.5 rounded-lg text-sm font-black border" style={{ borderColor: dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)", color: dark ? "#fbbf24" : "#92400e" }}>
            {dark ? "☀️" : "🌙"}
          </button>
          <button onClick={onRestart} className="px-3 py-1.5 rounded-lg text-sm font-black text-white" style={{ background: "#6b7280" }}>
            🔄
          </button>
        </div>
      </div>

      {/* Body: board first, then a rail that keeps every other section usable. */}
      <div
        className="play-body"
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) clamp(290px, 22vw, 360px)",
          // Stacked layout: rows must hug their content, otherwise the single
          // stretched row squashes the board card and clips the board.
          gridAutoRows: narrow ? "max-content" : undefined,
          alignContent: narrow ? "start" : undefined,
          gap: narrow ? 12 : 16,
          padding: narrow ? 12 : "12px 16px",
          overflowY: narrow ? "auto" : "hidden",
          overflowX: "hidden",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* BOARD CARD */}
        <div
          className="board-shell rounded-3xl overflow-hidden border-4 flex flex-col"
          style={{
            minWidth: 0,
            minHeight: 0,
            flex: narrow ? "none" : 1,
            borderColor: dark ? "#d97706" : "#92400e",
            background: dark ? "#1a0800" : "#fef3c7",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b-2" style={{ flexShrink: 0, borderColor: dark ? "#78350f" : "#d97706", background: dark ? "rgba(217,119,6,0.15)" : "rgba(217,119,6,0.1)" }}>
            <div className={`text-sm font-black truncate ${dark ? "text-amber-300" : "text-slate-900"}`}>
              🎥 Spotlight: Square {spotlightNum}
              <span className={`ml-2 font-semibold hidden sm:inline ${dark ? "text-amber-200" : "text-slate-700"}`}>· the active and target squares glow, every square stays visible</span>
            </div>
            <div className={`text-xs font-bold whitespace-nowrap ${dark ? "text-amber-200" : "text-slate-700"}`}>
              {Object.keys(boardCells).length}/{TOTAL_CELLS} tiles
            </div>
          </div>

          {/* The board is measured against this box, so it is always the largest
              10×5 board that fits — and it never leaves the frame. */}
          <div
            ref={boardBoxRef}
            className="board-fit"
            style={{
              flex: narrow ? "none" : 1,
              minHeight: 0,
              padding: narrow ? 8 : 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              className={`board-frame relative ${fx === "snake" || fx === "death" || fx === "jumpscare" ? "board-shake" : ""} ${bite && settings.animations !== false ? "bite-shake" : ""}`}
              key={fxNonce}
              style={{
                width: boardBox.w || "100%",
                height: boardBox.h || undefined,
                aspectRatio: boardBox.w ? undefined : `${BOARD_RATIO}`,
                borderRadius: 18,
                backgroundImage: "url(images/board-bg.jpg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                boxShadow: "inset 0 0 70px rgba(0,0,0,0.35)",
                padding: 6,
                transformOrigin,
                ...(boardBox.w ? { "--cell": `${boardBox.w / BOARD_COLS}px` } : { "--cell": "40px" }),
              } as React.CSSProperties}
            >
              {/* No scale-based camera zoom: zooming about the focused square always
                  pushes the far edge (and the FINISH square) out of the card. The
                  spotlight is the cell glow + the dimming of everything else. */}
              <div className="board-zoom" style={{ width: "100%", height: "100%" }}>
                <div
                  className="board-cells grid"
                  style={{
                    height: "100%",
                    width: "100%",
                    gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${BOARD_ROWS}, minmax(0, 1fr))`,
                    gap: 6,
                  }}
                >
                  {boardLayout.flatMap((row, r) =>
                    row.map((num, c) => {
                      const spotlight = num === spotlightNum;
                      return (                          <Cell
                          key={num}
                          index={r * BOARD_COLS + c}
                          num={num}
                          cell={boardCells[num]}
                          isHighlighted={hlCell === num}
                          spotlight={spotlight}
                          dark={dark}
                          totalCells={TOTAL_CELLS}
                          arrived={arrivedCell === num}
                          rollHit={rollHit && rollHit.square === num ? { value: rollHit.value, nonce: rollHit.nonce } : null}
                          bitten={bite?.square === num}
                        />
                      );
                    })
                  )}
                </div>

                {/* Drawn snakes and ladders, plus the fading walk trail. */}
                <BoardLinks
                  links={links}
                  dark={dark}
                  activeFrom={activeLink}
                  trail={trail}
                  animate={settings.animations !== false}
                  bitingFrom={bite?.square ?? null}
                />

                {/* Tokens live on their own layer so they always ride above the art. */}
                <BoardTokens
                  players={boardTokens}
                  activeId={cur?.id ?? null}
                  movingId={movingId}
                  bitten={bite ? { id: bite.playerId, amount: bite.amount, nonce: bite.nonce } : null}
                />
              </div>

              {/* board-wide effect wash: snake bite, ladder climb, oasis, death */}
              {fx && (
                <div
                  className={`board-fx fx-${fx}`}
                  style={{ position: "absolute", inset: 0, borderRadius: 18, pointerEvents: "none" }}
                />
              )}
            </div>
          </div>
        </div>

        {/* RAIL — turn, dice, shop and host, all still fully functional */}
        <aside
          className="play-rail flex flex-col"
          style={{
            minWidth: 0,
            minHeight: 0,
            gap: 12,
            overflowY: narrow ? "visible" : "auto",
            paddingRight: narrow ? 0 : 4,
          }}
        >
          <ActivePlayerPanel player={cur} dark={dark} />

          <div className="flex flex-col items-center gap-3">
            <Dice value={dice} rolling={rolling} onRoll={roll} disabled={phase !== "idle" || !cur?.isAlive} paused={paused} animate={settings.animations !== false} />
            {phase === "postroll" && pendingTarget !== null && (
              <PostRollBar
                dark={dark}
                credits={cur.credits}
                onAccept={acceptMove}
                onReroll={doReroll}
              />
            )}
          </div>

          <ShopPanel
            dark={dark}
            player={cur}
            canUse={!paused && (phase === "idle" || phase === "postroll")}
            onBuyShield={buyShield}
            onBuyAntidote={buyAntidote}
            onBuyFood={buyFood}
            onAskHost={askHost}
            onAssist={openAssist}
          />

          <HostPanel hostName={settings.host.hostName} msg={hostMsg} speaking={speaking} onSpeak={() => speak(hostMsg)} onStop={stopSpeak} dark={dark} />
        </aside>
      </div>


      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.35s ease; }

        /* ── Board ────────────────────────────────────────────────────────────
           Cells are sized from --cell (the board frame sets it in px), so the
           whole board scales with the screen instead of overflowing. */
        .board-cells { width: 100%; height: 100%; }
        .board-cell {
          transition: transform 380ms cubic-bezier(.22,1,.36,1), opacity 260ms ease,
                      box-shadow 260ms ease, border-color 260ms ease;
          animation: cellIn 520ms cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes cellIn {
          from { opacity: .45; transform: scale(.94) translateY(7px); }
          to   { opacity: 1;   transform: scale(1)   translateY(0); }
        }
        @keyframes cellPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0); }
          50%      { box-shadow: 0 0 30px 6px rgba(34,211,238,.65); }
        }
        /* The cell carries an inline transform (spotlight), so the hover lift
           needs !important to beat it. */
        .board-cell:hover { transform: scale(1.06) !important; z-index: 20; }
        .board-cell.ring-4 { animation: cellIn 520ms cubic-bezier(.22,1,.36,1) both, cellPulse 1.1s ease-in-out infinite; }

        /* Token landing — the token is re-keyed by position, so moving replays it. */
        .token-pin { animation: tokenPop 620ms cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes tokenPop {
          0%   { transform: translateY(-30px) scale(.55) rotate(-14deg); opacity: 0; }
          55%  { transform: translateY(0) scale(1.24) rotate(5deg);      opacity: 1; }
          75%  { transform: translateY(-4px) scale(.95) rotate(-3deg); }
          100% { transform: translateY(0) scale(1) rotate(0);            opacity: 1; }
        }

        /* Board-wide event wash (snake / ladder / oasis / death / jumpscare). */
        .board-fx { animation: boardFx 1.6s ease-out forwards; }
        @keyframes boardFx {
          0%   { opacity: .6; }
          60%  { opacity: .28; }
          100% { opacity: 0; }
        }
        .fx-snake    { background: radial-gradient(circle at 50% 45%, rgba(220,38,38,.6), rgba(127,29,29,.25)); box-shadow: inset 0 0 90px rgba(220,38,38,.85); }
        .fx-ladder   { background: radial-gradient(circle at 50% 45%, rgba(250,204,21,.5), rgba(34,197,94,.28)); box-shadow: inset 0 0 90px rgba(250,204,21,.75); }
        .fx-oasis    { background: radial-gradient(circle at 50% 45%, rgba(20,184,166,.5), rgba(13,148,136,.22)); box-shadow: inset 0 0 80px rgba(20,184,166,.6); }
        .fx-death    { background: radial-gradient(circle at 50% 50%, rgba(17,24,39,.8), rgba(0,0,0,.45)); }
        .fx-jumpscare{ background: repeating-linear-gradient(45deg, rgba(220,38,38,.4) 0 14px, rgba(0,0,0,.4) 14px 28px); }
        .fx-shield   { background: radial-gradient(circle at 50% 45%, rgba(59,130,246,.45), rgba(30,64,175,.2)); box-shadow: inset 0 0 80px rgba(59,130,246,.6); }

        .board-shake { animation: boardShake 720ms cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes boardShake {
          0%, 100% { transform: translateX(0) rotate(0); }
          12% { transform: translateX(-12px) rotate(-.5deg); }
          28% { transform: translateX(11px)  rotate(.5deg); }
          44% { transform: translateX(-8px)  rotate(-.3deg); }
          62% { transform: translateX(6px); }
          80% { transform: translateX(-3px); }
        }

        /* Dice: all motion is driven by the inline 3D transform (see Dice). */

        /* ── Drawn board art, tokens and the walk trail ──────────────────────── */
        .board-token {
          position: absolute;
          width: calc(var(--cell, 40px) * 0.5);
          height: calc(var(--cell, 40px) * 0.5);
          border-radius: 30%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255,255,255,0.92);
          font-size: calc(var(--cell, 40px) * 0.3);
          line-height: 1;
          z-index: 30;
          box-shadow: 0 4px 12px rgba(0,0,0,0.45);
          transition: left 195ms linear, top 195ms linear, box-shadow 240ms ease;
          transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px)), -50%);
          animation: tokenLand 560ms cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes tokenLand {
          from { opacity: 0; transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px)), -50%) scale(.55); }
          to   { opacity: 1; transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px)), -50%) scale(1); }
        }
        .board-token.token-active {
          box-shadow: 0 0 0 3px rgba(34,211,238,0.95), 0 0 26px rgba(34,211,238,0.8), 0 4px 12px rgba(0,0,0,0.45);
          z-index: 32;
        }
        .board-token.token-moving {
          animation: tokenHop 260ms ease-in-out infinite;
        }
        @keyframes tokenHop {
          0%, 100% { transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px)), -50%) scale(1.02); }
          50%      { transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px)), calc(-50% - 7px)) scale(1.16); }
        }
        .board-token-halo {
          position: absolute;
          inset: calc(var(--cell, 40px) * -0.12);
          border-radius: 34%;
          border: 2px solid rgba(34,211,238,0.85);
          animation: haloPulse 1.5s ease-in-out infinite;
        }
        @keyframes haloPulse {
          0%, 100% { opacity: .55; transform: scale(.95); }
          50%      { opacity: 1;  transform: scale(1.08); }
        }
        .cell-art { animation: artPop 620ms cubic-bezier(.22,1,.36,1) both; }
        @keyframes artPop {
          from { opacity: 0; transform: scale(.8) rotate(-6deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .cell-arrival {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          z-index: 3;
          pointer-events: none;
          animation: arrivalRing 720ms ease-out forwards;
        }
        @keyframes arrivalRing {
          0%   { box-shadow: inset 0 0 0 4px rgba(255,255,255,0.95), 0 0 34px rgba(255,255,255,0.8); opacity: 1; }
          100% { box-shadow: inset 0 0 0 0 rgba(255,255,255,0), 0 0 0 rgba(255,255,255,0); opacity: 0; }
        }
        .trail-dot { animation: trailFade 2400ms ease-out forwards; }
        @keyframes trailFade {
          0%   { opacity: .95; }
          60%  { opacity: .5; }
          100% { opacity: 0; }
        }
        .link-flow { animation: dashFlow 620ms linear infinite; }
        @keyframes dashFlow { to { stroke-dashoffset: -0.52; } }
        /* ── The bite: red shock on the square, shake on the token, hit number ─ */
        /* Whole-board jolt: bigger and more rotational than the generic shake. */
        .board-frame.bite-shake { animation: biteShake 620ms cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes biteShake {
          0%   { transform: translate3d(0,0,0) rotate(0deg); }
          8%   { transform: translate3d(-13px,7px,0) rotate(-1.5deg) scale(1.012); }
          20%  { transform: translate3d(12px,-9px,0) rotate(1.3deg); }
          34%  { transform: translate3d(-9px,-6px,0) rotate(-1deg); }
          50%  { transform: translate3d(7px,5px,0) rotate(.7deg); }
          68%  { transform: translate3d(-4px,-3px,0) rotate(-.4deg); }
          84%  { transform: translate3d(2px,2px,0) rotate(.2deg); }
          100% { transform: translate3d(0,0,0) rotate(0deg); }
        }
        /* Blood across the lens. */
        .bite-blood { position: fixed; inset: 0; pointer-events: none; z-index: 60; overflow: hidden; }
        .bite-flash {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 45%, rgba(255,0,0,0.85) 0%, rgba(120,0,0,0.5) 42%, rgba(0,0,0,0) 78%);
          animation: biteFlash 620ms ease-out forwards;
        }
        @keyframes biteFlash {
          0%   { opacity: .95; }
          18%  { opacity: .62; }
          100% { opacity: 0; }
        }
        .bite-spray {
          position: absolute;
          inset: -6%;
          mix-blend-mode: multiply;
          animation: biteSpray 1500ms cubic-bezier(.2,.9,.3,1) forwards;
        }
        @keyframes biteSpray {
          0%   { opacity: 0;   transform: scale(1.24); }
          10%  { opacity: .95; transform: scale(1.06); }
          60%  { opacity: .8;  transform: scale(1); }
          100% { opacity: 0;   transform: scale(1); }
        }
        .bite-vignette {
          position: absolute;
          inset: 0;
          box-shadow: inset 0 0 160px 40px rgba(90,0,0,0.85);
          animation: biteVignette 1700ms ease-out forwards;
        }
        @keyframes biteVignette {
          0%   { opacity: 1; }
          70%  { opacity: .7; }
          100% { opacity: 0; }
        }

        .board-cell.cell-bite {
          animation: cellBite 700ms cubic-bezier(.2,1.4,.35,1) both;
          z-index: 46;
          border-color: #ef4444 !important;
        }
        @keyframes cellBite {
          0%   { transform: scale(1)    rotate(0deg); box-shadow: 0 0 0 0 rgba(239,68,68,0.9); }
          12%  { transform: scale(1.14) rotate(1.8deg); box-shadow: 0 0 40px 12px rgba(239,68,68,0.75); }
          30%  { transform: scale(.96)  rotate(-2.4deg); }
          48%  { transform: scale(1.06) rotate(1.2deg); }
          70%  { transform: scale(.99)  rotate(-.6deg); }
          100% { transform: scale(1)    rotate(0deg); box-shadow: 0 0 14px 2px rgba(239,68,68,0.3); }
        }
        .bite-shock {
          position: absolute;
          inset: -14%;
          border-radius: 18px;
          border: 4px solid rgba(239,68,68,0.95);
          background: radial-gradient(circle, rgba(239,68,68,0.35), rgba(239,68,68,0) 68%);
          animation: biteRing 760ms ease-out forwards;
          pointer-events: none;
          z-index: 3;
        }
        @keyframes biteRing {
          0%   { transform: scale(.5); opacity: .95; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .board-token.token-bitten {
          animation: tokenBite 620ms cubic-bezier(.36,.07,.19,.97) both;
          z-index: 34;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.95), 0 0 26px rgba(239,68,68,0.85);
        }
        @keyframes tokenBite {
          0%   { transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px)), -50%) rotate(0deg) scale(1); }
          10%  { transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px) + 4px), -50%) rotate(-9deg) scale(1.14); }
          24%  { transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px) - 5px), -48%) rotate(8deg) scale(1.06); }
          40%  { transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px) + 3px), -50%) rotate(-5deg) scale(1.1); }
          58%  { transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px) - 2px), -50%) rotate(3deg) scale(1.02); }
          76%  { transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px) + 1px), -50%) rotate(-2deg) scale(1.04); }
          100% { transform: translate(calc(-50% + var(--spread, 0) * var(--cell, 40px)), -50%) rotate(0deg) scale(1); }
        }
        .bite-penalty {
          position: absolute;
          top: -12%;
          left: 50%;
          transform: translateX(-50%);
          font-family: Orbitron, monospace;
          font-weight: 900;
          font-size: calc(var(--cell, 40px) * 0.34);
          line-height: 1;
          white-space: nowrap;
          color: #fecaca;
          text-shadow: 0 2px 8px rgba(0,0,0,0.9), 0 0 16px rgba(239,68,68,0.95);
          animation: bitePenalty 1400ms cubic-bezier(.2,1.5,.4,1) forwards;
          pointer-events: none;
          z-index: 6;
        }
        @keyframes bitePenalty {
          0%   { opacity: 0; transform: translateX(-50%) translateY(8px) scale(.5); }
          18%  { opacity: 1; transform: translateX(-50%) translateY(-4px) scale(1.2); }
          55%  { opacity: 1; transform: translateX(-50%) translateY(-10px) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(.92); }
        }

        /* ── Landing-square reaction to the roll ─────────────────────────────── */
        .board-cell.cell-roll-hit {
          animation: rollHit 980ms cubic-bezier(.2,1.5,.35,1) both;
          z-index: 45;
          border-color: #facc15 !important;
        }
        @keyframes rollHit {
          0%   { transform: scale(1)    rotate(0deg);   box-shadow: 0 0 0 0 rgba(250,204,21,0.95); }
          18%  { transform: scale(1.17) rotate(-1.6deg); box-shadow: 0 0 40px 12px rgba(250,204,21,0.75); }
          46%  { transform: scale(1.05) rotate(1.2deg); }
          72%  { transform: scale(1.08) rotate(-.6deg); }
          100% { transform: scale(1)    rotate(0deg);   box-shadow: 0 0 16px 3px rgba(250,204,21,0.35); }
        }
        .cell-shock {
          position: absolute;
          inset: -12%;
          border-radius: 16px;
          border: 4px solid rgba(250,204,21,0.9);
          box-shadow: inset 0 0 24px rgba(250,204,21,0.45);
          animation: shockRing 780ms ease-out forwards;
          pointer-events: none;
          z-index: 3;
        }
        @keyframes shockRing {
          0%   { transform: scale(.55); opacity: .95; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        .roll-badge {
          position: absolute;
          top: 8%;
          left: 50%;
          transform: translateX(-50%);
          font-family: Orbitron, monospace;
          font-weight: 900;
          font-size: calc(var(--cell, 40px) * 0.5);
          line-height: 1;
          color: #fde68a;
          text-shadow: 0 2px 8px rgba(0,0,0,0.85), 0 0 18px rgba(250,204,21,0.9);
          animation: rollBadge 1350ms cubic-bezier(.2,1.5,.4,1) forwards;
          pointer-events: none;
          z-index: 5;
        }
        @keyframes rollBadge {
          0%   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(.5); }
          22%  { opacity: 1; transform: translateX(-50%) translateY(-2px) scale(1.25); }
          60%  { opacity: 1; transform: translateX(-50%) translateY(-8px) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-26px) scale(.9); }
        }

        /* Flicking forked tongue on every snake head. */
        .snake-tongue { transform-origin: -0.125px 0px; animation: tongueFlick 1.6s ease-in-out infinite; }
        @keyframes tongueFlick {
          0%, 62%, 100% { transform: scaleX(.35); opacity: .25; }
          74%           { transform: scaleX(1.05); opacity: 1; }
          86%           { transform: scaleX(.7); opacity: .7; }
        }

        /* ── 3D dice ─────────────────────────────────────────────────────────── */
        .dice-stage {
          position: relative;
          width: 92px;
          height: 92px;
          perspective: 460px;
          cursor: pointer;
          --d: 46px;
        }
        .dice-3d {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          will-change: transform;
        }
        .dice-face {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: linear-gradient(145deg, #fffdf5, #f2e2c0);
          border: 3px solid #b45309;
          box-shadow: inset 0 0 18px rgba(180,83,9,0.28);
          backface-visibility: hidden;
        }
        .dice-pip {
          position: absolute;
          width: 15px;
          height: 15px;
          margin: -7.5px 0 0 -7.5px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #4b2a06, #1a0a00 70%);
          box-shadow: inset 0 -1px 2px rgba(255,255,255,0.25);
        }
        .dice-pip.pip-one {
          width: 22px;
          height: 22px;
          margin: -11px 0 0 -11px;
          background: radial-gradient(circle at 35% 30%, #ef4444, #991b1b 72%);
          box-shadow: 0 0 10px rgba(239,68,68,0.55);
        }
        .dice-shadow {
          position: absolute;
          left: 6%;
          right: 6%;
          bottom: -14px;
          height: 14px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(0,0,0,0.5), rgba(0,0,0,0) 72%);
        }
        .dice-shadow.is-rolling { animation: diceShadow 260ms ease-in-out infinite; }
        @keyframes diceShadow {
          0%, 100% { transform: scaleX(1); opacity: .55; }
          50%      { transform: scaleX(.72); opacity: .3; }
        }
        .dice-readout {
          font-family: Orbitron, monospace;
          font-weight: 900;
          font-size: 26px;
          line-height: 1;
          color: #fbbf24;
          text-shadow: 0 2px 6px rgba(0,0,0,0.6);
        }
        .dice-readout.is-rolling { color: rgba(251,191,36,0.55); }

        .board-fit { outline: 0; }
        @media (min-width: 901px) { .teacher-panel { top: 0; } }

        /* Host speaking equaliser */
        .speak-bars { display: inline-flex; align-items: flex-end; gap: 3px; height: 20px; }
        .speak-bars i { display: block; width: 4px; border-radius: 2px; background: currentColor; animation: speakBar 850ms ease-in-out infinite; }
        .speak-bars i:nth-child(2) { animation-delay: .15s; }
        .speak-bars i:nth-child(3) { animation-delay: .3s; }
        .speak-bars i:nth-child(4) { animation-delay: .45s; }
        @keyframes speakBar {
          0%, 100% { height: 6px; opacity: .7; }
          50%      { height: 20px; opacity: 1; }
        }

        .host-mic { animation: hostMic 1.1s ease-in-out infinite; }
        @keyframes hostMic {
          0%, 100% { transform: scale(1) rotate(0deg); }
          35%      { transform: scale(1.12) rotate(-6deg); }
          70%      { transform: scale(1.05) rotate(5deg); }
        }

        /* Victory confetti */
        .victory-trophy { animation: trophyPop 900ms cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes trophyPop {
          0%   { transform: scale(.4) rotate(-12deg); opacity: 0; }
          70%  { transform: scale(1.15) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        .confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .confetti i { position: absolute; top: -24px; width: 10px; height: 16px; border-radius: 3px; animation: confettiFall linear infinite; }
        @keyframes confettiFall {
          0%   { transform: translateY(-30px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: .85; }
        }

        /* One switch for all board motion. The ✨ button drives it and it starts
           off when the operating system asks for reduced motion. */
        .anim-off .board-cell, .anim-off .token-pin, .anim-off .board-fx, .anim-off .board-shake,
        .anim-off .speak-bars i, .anim-off .confetti i, .anim-off .snake-tongue,
        .anim-off .board-token, .anim-off .board-token-halo, .anim-off .cell-art, .anim-off .cell-arrival,
        .anim-off .trail-dot, .anim-off .link-flow, .anim-off .cell-shock, .anim-off .roll-badge,
        .anim-off .bite-shock, .anim-off .bite-penalty, .anim-off .token-bitten, .anim-off .cell-bite,
        .anim-off .dice-shadow.is-rolling { animation: none !important; }
        .anim-off .bite-flash, .anim-off .bite-spray, .anim-off .bite-vignette,
        .anim-off .board-frame.bite-shake { animation: none !important; }
        .anim-off .board-cell, .anim-off .board-zoom { transition: none !important; }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Root — shared Tutorly splash → players & AI pack → game.
// The advanced screen (mode, host voice, board editor) stays reachable
// from the splash for full manual control.
// ─────────────────────────────────────────────────────────────
type Payload = {
  settings: GameSettings;
  players: RuntimePlayer[];
  content: { title: string; subtitle: string; decisions: DecisionScenario[]; boardCells: Record<number, SnakeLadderCell> };
};

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

const profileFromShell = (p: ShellPlayer, i: number): PlayerProfile => ({
  id: `p${i + 1}`,
  role: p.isNPC ? "actor" : "learner",
  name: p.name.trim() || (p.isNPC ? `NPC ${i + 1}` : `Learner ${i + 1}`),
  avatar: p.emoji,
  color: p.color,
  from: p.from,
  interests: [],
  strengths: [],
  facts: p.facts,
  traits: p.isNPC ? ["guide"] : [],
  dialogueLines: p.isNPC ? (p.npcLines || "").split(SENTENCE_SPLIT).map(s => s.trim()).filter(Boolean).slice(0, 15) : [],
  luckRate: p.isNPC ? 7 : 5,
});

const toRuntimePlayers = (profiles: PlayerProfile[]): RuntimePlayer[] =>
  profiles.map((p) => {
    const actorRole = p.role === "actor" ? (p.actorRole ?? getActorRole(p)) : "support";
    return {
      id: p.id,
      role: p.role,
      actorRole,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      from: p.from,
      interests: p.interests ?? [],
      strengths: p.strengths ?? [],
      facts: p.facts,
      traits: p.traits ?? [],
      dialogueLines: p.dialogueLines ?? [],
      luckRate: normalizeLuckRate(p.luckRate ?? (p.role === "actor" ? 7 : 5)),
      position: 1,
      health: 100,
      hunger: 70,
      energy: 80,
      morale: 85,
      credits: 20,
      shield: 0,
      antidote: 0,
      voiceURI: p.voiceURI ?? null,
      isAlive: true,
      turnsPlayed: 0,
      arcStep: 0,
      lastArcTurn: -999,
    };
  });

/** Everything the shared setup page produces is turned into a playable game here. */
const buildPayload = (data: ShellSetupResult): Payload => {
  let pack: SnakePack | null = null;
  if (data.json && data.json.trim()) pack = parseSnakePack(data.json);

  const mode: GameMode = pack ? pack.mode : (data.level === "A1" || data.level === "A2" ? "kids" : "adult");
  const settings: GameSettings = {
    mode,
    host: { hostName: "Bruce", voiceURI: null, speechRate: 0.95 },
    musicOn: true,
    // Seeded from the OS preference; the ✨ button on the play screen overrides it.
    animations: typeof window === "undefined" || !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    jumpScares: true,
    luckRules: pack ? pack.luckRules : { maxAdjustment: 1, strength: 0.35 },
  };

  // The AI pack carries richer profiles (interests, strengths, NPC traits) than
  // the form does — fold them in when the names line up.
  const profiles = data.players.map(profileFromShell).map((profile) => {
    const enriched = pack?.players.find(pp => pp.name.trim().toLowerCase() === profile.name.trim().toLowerCase());
    if (!enriched) return profile;
    return {
      ...profile,
      interests: enriched.interests?.length ? enriched.interests : profile.interests,
      strengths: enriched.strengths?.length ? enriched.strengths : profile.strengths,
      traits: enriched.traits?.length ? enriched.traits : profile.traits,
      dialogueLines: enriched.dialogueLines?.length ? enriched.dialogueLines : profile.dialogueLines,
      luckRate: enriched.luckRate ?? profile.luckRate,
      facts: profile.facts || enriched.facts || "",
    };
  });

  const decisions = buildDecisions(mode, pack?.decisions);
  const boardCells = pack && Object.keys(pack.boardCells).length
    ? pack.boardCells
    : createDefaultBoardCells(mode, decisions);

  return {
    settings,
    players: toRuntimePlayers(profiles),
    content: {
      title: pack?.title || "Tutorly Ladder",
      subtitle: pack?.subtitle || "Personalized speaking survival board game",
      decisions,
      boardCells,
    },
  };
};

export default function FlashcardsGame() {
  const [dark, setDark] = useState(false);
  const [screen, setScreen] = useState<"splash" | "setup" | "advanced" | "play">("splash");
  const [payload, setPayload] = useState<Payload | null>(null);

  const splashConfig = useMemo<ShellSplashConfig>(() => ({
    gameTitle: "Tutorly Ladder",
    gameEmoji: "🐍",
    tagline: "Survive the board: speak English, roll the dice, climb the ladders and dodge the snakes.",
    accent: "#0ea5e9",
    features: [
      { icon: "🎲", label: "50-square survival board" },
      { icon: "🗣️", label: "Speak before every choice" },
      { icon: "🧭", label: "Your city as the setting" },
      { icon: "🤖", label: "AI scenario packs" },
      { icon: "🎯", label: "Convince & role-play rounds" },
      { icon: "🏆", label: "Credits, shop and victory" },
    ],
    howToPlay: [
      "Add every learner — name, avatar, where they are from and one fact. The AI writes the scenarios around them.",
      "Copy the AI prompt into ChatGPT / Gemini / Claude, then paste the JSON it returns into the setup page.",
      "Roll the dice, move along the 50-square board and speak English for 30–60 seconds at every decision square.",
      "Climb ladders, survive snakes, spend credits in the shop — first player on the finish square wins.",
    ],
    extraAction: { label: "🛠 Advanced setup", onClick: () => setScreen("advanced") },
  }), []);

  const setupConfig = useMemo<ShellSetupConfig>(() => ({
    gameTitle: "Tutorly Ladder",
    gameEmoji: "🐍",
    accent: "#0ea5e9",
    playersHeading: "Who is playing?",
    playersHelp: "Learners play the game — add an NPC if you want an AI actor (guide, rival or trickster) in the story.",
    locationLabel: "Where does the journey happen?",
    locationPlaceholder: "e.g. Yogyakarta, Indonesia",
    locationHelp: "Real places give real streets, markets and food in the scenarios. Leave it empty for an invented world.",
    settingsHeading: "Theme, level & AI pack",
    topics: [
      "Survival", "City escape", "Jungle trek", "Space station", "Desert island",
      "Winter storm", "Underground tunnels", "Festival in town", "General English",
    ],
    levels: ["A1", "A2", "B1", "B2", "C1"],
    playerColors: ["#0ea5e9", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444"],
    avatars: ["🧑", "👩", "🧑‍🎓", "👨‍🎓", "🧕", "🧔", "👩‍🦰", "🧑‍🦱", "🕵️", "🧙", "🐍", "🦜", "🤖", "🐺", "🦁", "🧜"],
    maxPlayers: 6,
    buildPrompt: buildSnakeShellPrompt,
    validateJson: validateSnakePackJson,
    jsonPlaceholder: 'Paste the JSON your AI returned here — it starts with { "title": … }',
    onStart: (data: ShellSetupResult) => {
      setPayload(buildPayload(data));
      setScreen("play");
    },
    onBack: () => setScreen("splash"),
  }), []);

  if (screen === "splash") {
    return (
      <SplashScreen
        config={splashConfig}
        darkMode={dark}
        onToggleDark={() => setDark(d => !d)}
        onPlay={() => setScreen("setup")}
      />
    );
  }

  if (screen === "setup") {
    return (
      <PlayerSetup
        config={setupConfig}
        darkMode={dark}
        onToggleDark={() => setDark(d => !d)}
      />
    );
  }

  if (screen === "advanced" || !payload) {
    return (
      <SetupScreen
        dark={dark}
        onToggleDark={() => setDark(d => !d)}
        onBack={() => setScreen("splash")}
        onStart={(p) => {
          setPayload(p);
          setScreen("play");
        }}
      />
    );
  }

  return (
    <Game
      initialPlayers={payload.players}
      settings={payload.settings}
      content={payload.content}
      dark={dark}
      onToggleDark={() => setDark(d => !d)}
      onRestart={() => {
        setPayload(null);
        setScreen("setup");
        sfx.stopBGM();
        tts.stop();
      }}
    />
  );
}
