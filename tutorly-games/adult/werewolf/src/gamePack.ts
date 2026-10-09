/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  WEREWOLF — Tutorly pack bridge
 *  ═══════════════════════════════════════════════════════════════════════════
 *
 *  Every Tutorly game is onboarded the same way, from the same two pages:
 *
 *    1. the shared splash screen            (GameShell.SplashScreen)
 *    2. the shared player/AI-setup page     (GameShell.PlayerSetup)
 *       → "Copy AI Prompt"  → paste the JSON the AI returns
 *
 *  This module is the game-specific half of that contract: it turns the setup
 *  page's players + city + level into a prompt THIS game can consume, and turns
 *  the AI's JSON back into `players` / `roles` / `content` for the engine.
 *
 *  The prompt is built by filling the tokens of the game's own
 *  `COPY_PROMPT_TEMPLATE` (owned by App.tsx, passed in) — so the JSON a teacher
 *  generates from the shared page is the very same schema the game's own
 *  "🛠 Advanced setup → 📋 JSON" tab accepts. One format, two entry points.
 *
 *  No React, no DOM: pure functions, safe to unit-test.
 */

import type { GameContent, Player, RoleDef } from "./App";
import type { PromptCtx, ShellSetupResult } from "./GameShell";

/* ───────────────────────────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────────────────────────── */

export interface WerewolfSeed {
  players: Player[];
  roles: RoleDef[];
  /** The AI JSON, minus the shell-only keys — everything the Control Room narrates from. */
  content?: GameContent;
}

/* ───────────────────────────────────────────────────────────────────────────
   Small helpers
   ─────────────────────────────────────────────────────────────────────────── */

const text = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

/** The AI sometimes wraps JSON in ```json fences, or adds a sentence before it. */
export function stripJsonFences(raw: string): string {
  const trimmed = (raw ?? "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first > -1 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

export function safeParseJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(stripJsonFences(raw));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/* ───────────────────────────────────────────────────────────────────────────
   The AI prompt — this game's template, filled from the shared setup page
   ─────────────────────────────────────────────────────────────────────────── */

/** Kid-safe classroom defaults when no city is given. */
export const DEFAULT_SETTING = "Fogbound Millbrook, a mill village on a river (1890)";

/**
 * Grammar focus per class level. The prompt asks the AI to write lines a learner
 * at THIS level can actually produce, and to push one notch above it in the
 * evidence-based questions.
 */
const GRAMMAR_BY_LEVEL: Record<string, string> = {
  A1: "Present simple, there is/are, have got, basic adjectives",
  A2: "Present continuous, past simple (regular + common irregulars), going to",
  B1: "Past simple vs past continuous, modals of deduction (must/might/can't), first conditional",
  B2: "Past modals (must have / can't have / might have), reported speech, second conditional",
  C1: "Perfect modals, hedging and distancing (apparently, allegedly, it strikes me that), inversion for emphasis",
};

const levelFamily = (level: string): "A" | "B" | "C" => {
  const l = (level || "B1").toUpperCase()[0];
  return l === "A" || l === "C" ? l : "B";
};

/** 1–5. A1/A2 get an atmospheric whodunnit, never gore. */
export const horrorFor = (level: string): number => {
  const family = levelFamily(level);
  if (family === "A") return 1;
  if (family === "C") return 4;
  return 3;
};

const cefrRange = (ctx: PromptCtx): string => {
  const levels = [ctx.level, ...ctx.players.map(() => ctx.level)].filter(Boolean);
  const rank: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  const sorted = levels.sort((a, b) => (rank[a] ?? 3) - (rank[b] ?? 3));
  const lo = sorted[0] ?? "B1";
  const hi = sorted[sorted.length - 1] ?? "B1";
  return lo === hi ? lo : `${lo}–${hi}`;
};

/** The learner block the template inserts verbatim. */
const learnersBlock = (ctx: PromptCtx): string =>
  ctx.players
    .map((p, i) => {
      const traits = p.isNPC ? "npc, actor, deceptive" : "learner";
      return [
        `- id: p${i + 1}`,
        `  name: ${p.name.trim() || `Player ${i + 1}`}`,
        `  cefrLevel: ${ctx.level || "B1"}`,
        `  avatar: ${p.emoji}`,
        `  luckRate: ${p.isNPC ? 7 : 5}/10`,
        `  traits: [${traits}]`,
        `  facts: ${[p.facts, p.from ? `from ${p.from}` : ""].filter(Boolean).join(" · ")}`,
        `  voiceStyle: ${p.isNPC ? "deep, theatrical, never shouting" : ""}`,
      ].join("\n");
    })
    .join("\n");

/**
 * Fill `COPY_PROMPT_TEMPLATE` from the shared Tutorly setup page and append the
 * Tutorly content contract (quantity + difficulty), which is what turns "a nice
 * JSON" into a pack that survives a full lesson.
 */
export function buildWerewolfShellPrompt(template: string, ctx: PromptCtx): string {
  const players = ctx.players;
  const learners = players.filter((p) => !p.isNPC);
  const actors = players.filter((p) => p.isNPC);
  const minWerewolves = Math.max(1, Math.floor(players.length / 4) || 1);
  const setting = text(ctx.location) || DEFAULT_SETTING;
  const theme = text(ctx.topic, "General English");
  const grammar = GRAMMAR_BY_LEVEL[(ctx.level || "B1").toUpperCase()] ?? GRAMMAR_BY_LEVEL.B1;

  const rep = (s: string, token: string, value: string) => s.split(token).join(value);

  let prompt = template;
  prompt = rep(prompt, "{{TARGET_LANGUAGE}}", "English");
  prompt = rep(prompt, "{{CEFR_RANGE}}", cefrRange(ctx));
  prompt = rep(prompt, "{{SETTING}}", setting);
  prompt = rep(prompt, "{{HORROR_LEVEL}}", String(horrorFor(ctx.level)));
  prompt = rep(prompt, "{{STAKES}}", `${theme} itself is at stake: if the village fails, nobody in ${setting} can be trusted again.`);
  prompt = rep(prompt, "{{MIN_WEREWOLVES}}", String(minWerewolves));
  prompt = rep(prompt, "{{ROLE_PREFERENCES}}", "Teacher choice — include the Seer and the Doctor, then fill with Villagers");
  prompt = rep(prompt, "{{GRAMMAR_FOCUS}}", grammar);
  prompt = rep(prompt, "{{ACTOR_COUNT}}", String(actors.length));
  prompt = rep(prompt, "{{LEARNERS_LIST}}", learnersBlock(ctx));

  const actorRoster = actors.length
    ? `\n\nAI ACTORS ALREADY CHOSEN (reuse these ids and names exactly):\n${actors
        .map((p, i) => {
          const id = `p${players.indexOf(p) + 1}`;
          const facts = [p.facts, p.from ? `from ${p.from}` : ""].filter(Boolean).join(" · ");
          return (
            `- id: ${id}\n  name: ${p.name.trim() || `Actor ${i + 1}`}\n  cefrLevel: ${ctx.level || "B1"}` +
            `\n  avatar: ${p.emoji}\n  facts: ${facts}\n  voiceStyle: ${p.npcLines || "calm, watchful"}`
          );
        })
        .join("\n")}`
    : "";

  const tutorlyContract = `

═══════════════════════════════════════════════════════════════════════════════
TUTORLY SETUP PAGE — EXTRA REQUIREMENTS (this pack is generated from the
teacher's class list, not from a demo file; it must survive a full lesson)
═══════════════════════════════════════════════════════════════════════════════
CLASS: ${players.length} players (${learners.length} learners, ${actors.length} AI actors) · level ${ctx.level} · theme "${theme}"
SETTING: ${setting} — the village must be THIS place. Use its real geography,
weather, river, streets, food and local landmarks in narration and in the
alibis ("I was at the mill by the north bridge"). Name at least 6 real-sounding
locations inside it, and keep them consistent between scenarios.

QUANTITY (do not deliver less; more is welcome)
- aiLines.perPlayer for EVERY learner AND every actor:
  accuse 8–12, defend 8–12, alibiNight 6–10, emotionalPleas 6–10, trustBuilding 6–10
- aiLines.actorGlobal: accuse 12–16, defend 12–16, misdirection 10–14, trustBuilding 10–14
- host.intro 8–10 lines, host.recapTemplates 6–8, every phaseLines array 4–8
- discussionTopics 16–20 (each tied to a specific learner's real facts)
- requiredPhrases.all 14–18, requiredPhrases.perRole 8–10 per role
- scenarios 10–14, and every branch with its own hostLines 2–4

DIFFICULTY CONTRACT (this is the part teachers judge us on)
- NOTHING may be answerable with yes/no, and no line may be reusable word-for-word
  in another round: every string must be unique across the whole pack.
- Every question must need EVIDENCE + REASONING. Each scenario's studentPrompt
  must force a three-step answer: (1) a claim, (2) "because…" with a concrete
  detail, (3) a counter-argument ("I see your point, but…").
- Tier the difficulty and say which tier it is in the scenario title:
  EASY = a fact from the setting; MEDIUM = a timeline contradiction the learner
  must spot between two alibis; HARD = an inference only possible by combining
  two learners' facts with a physical detail of the village.
- At least 4 scenarios must be HARD. Wrong answers must be PLAUSIBLE — a wrong
  option should be something a careless learner would pick, never obviously silly.
- Use the grammar focus above (${grammar}) inside the prompts, one notch above the
  class level, so the language is a real stretch without being impossible.
- Actors must never confess. Their lies must stay consistent across the whole
  pack and must reference learners' REAL facts (same school/city/hobby) so
  learners catch contradictions by listening to each other.

CLASSROOM SAFETY
- Horror is atmospheric only (horror level ${horrorFor(ctx.level)}/5): shadows,
  sounds, fog, an empty chair. No gore, no slurs, no romance, no real person's
  business details beyond what the teacher provided. No emoji-only lines: the
  narration is read aloud by a screen reader and by the host.

Now produce the JSON.`;

  return `${prompt}${actorRoster}${tutorlyContract}`;
}

/* ───────────────────────────────────────────────────────────────────────────
   Instant validation for the shared setup page
   ─────────────────────────────────────────────────────────────────────────── */

export function validateWerewolfPackJson(raw: string): { ok: boolean; message: string } {
  if (!raw.trim()) return { ok: false, message: "Paste the JSON the AI produced first." };
  const data = safeParseJson(raw);
  if (!data) return { ok: false, message: "That is not valid JSON — check for a missing comma or brace." };

  const players = Array.isArray(data.players) ? (data.players as unknown[]) : [];
  const hasNarrative = !!data.host || !!data.aiLines || !!data.scenarios;

  if (!players.length && !hasNarrative) {
    return { ok: false, message: "No players[] and no host/aiLines found — that looks like the wrong JSON." };
  }
  if (players.length && players.length < 4) {
    return {
      ok: true,
      message: `Valid — but only ${players.length} player(s): Werewolf needs 4+ (the setup page's players are used anyway).`,
    };
  }

  const warnings: string[] = [];
  if (!data.teacherNotes) warnings.push("no teacherNotes");
  if (!data.aiLines) warnings.push("no aiLines (actors will improvise)");
  if (!Array.isArray(data.scenarios) || (data.scenarios as unknown[]).length < 6)
    warnings.push("fewer than 6 scenarios");

  const actorGlobal = (data.aiLines as Record<string, unknown> | undefined)?.actorGlobal as
    | Record<string, unknown>
    | undefined;
  const lineCount = ["accuse", "defend", "misdirection", "trustBuilding"].reduce(
    (n, k) => n + (Array.isArray(actorGlobal?.[k]) ? (actorGlobal?.[k] as unknown[]).length : 0),
    0,
  );
  if (data.aiLines && lineCount < 20) warnings.push("thin actor line library");

  return {
    ok: true,
    message: warnings.length
      ? `Valid JSON ✓ — ${players.length} players, but ${warnings.join(", ")}. It will still run.`
      : `Valid JSON ✓ — ${players.length} players, full narration library.`,
  };
}

/* ───────────────────────────────────────────────────────────────────────────
   Role assignment
   ─────────────────────────────────────────────────────────────────────────── */

/** Priority order for the special (non-villager) village roles. */
const SPECIAL_ORDER = ["seer", "doctor", "detective", "bodyguard", "hunter", "medium", "cupid", "clown"];

const shuffle = <T,>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * Give every player a role: a balanced village that always has at least one
 * werewolf and enough specials to make the night phase interesting.
 */
export function assignRoles(
  players: Player[],
  roles: RoleDef[],
  roleIds?: (string | undefined)[],
  minWerewolves?: number,
): Player[] {
  const byId = new Map(roles.map((r) => [r.id, r]));
  const villager = byId.get("villager") ?? roles[0];
  const werewolf = byId.get("werewolf") ?? roles[0];
  const n = players.length;
  if (!n || !villager) return players;

  const pool: RoleDef[] = [];
  const wolves = Math.max(minWerewolves ?? 0, Math.max(1, Math.floor(n / 4)));
  for (let i = 0; i < Math.min(wolves, n - 1); i++) pool.push(werewolf);

  const specialsWanted = Math.max(1, Math.floor((n - pool.length) / 3));
  const specials = SPECIAL_ORDER.map((id) => byId.get(id)).filter((r): r is RoleDef => !!r);
  for (let i = 0; i < Math.min(specialsWanted, specials.length); i++) pool.push(specials[i]);
  while (pool.length < n) pool.push(villager);

  const shuffled = shuffle(pool);

  return players.map((p, i) => {
    const asked = roleIds?.[i] ? byId.get(roleIds[i] as string) : undefined;
    const role = asked ?? shuffled[i] ?? villager;
    return { ...p, role };
  });
}

/* ───────────────────────────────────────────────────────────────────────────
   Shell players → engine players
   ─────────────────────────────────────────────────────────────────────────── */

const factsFor = (p: { facts: string; from: string; isNPC: boolean; npcLines: string }, extra?: string): string =>
  [
    p.facts,
    p.from ? `from ${p.from}` : "",
    p.isNPC && p.npcLines ? `acts like: ${p.npcLines}` : "",
    extra,
  ]
    .filter((s) => s && s.trim())
    .join(" · ");

/* ───────────────────────────────────────────────────────────────────────────
   The whole pipeline: shared setup → a game that can start immediately
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * @param data   what the shared Tutorly setup page collected (players, city, level, pasted JSON)
 * @param roles  this game's role table (DEFAULT_ROLES)
 */
export function buildWerewolfSeed(data: ShellSetupResult, roles: RoleDef[]): WerewolfSeed {
  const pack = data.json ? safeParseJson(data.json) : null;
  const packPlayers = Array.isArray(pack?.players)
    ? (pack?.players as Record<string, unknown>[])
    : [];
  type PackPlayer = Record<string, unknown>;
  const byName = new Map<string, PackPlayer>();
  const byId = new Map<string, PackPlayer>();
  packPlayers.forEach((p) => {
    const name = text(p.name).toLowerCase();
    const id = text(p.id).toLowerCase();
    if (name) byName.set(name, p);
    if (id) byId.set(id, p);
  });

  /** Read one string field off the AI's player object. */
  const pick = (m: PackPlayer | undefined, key: string): string => (m ? text(m[key]) : "");

  const usedPackIndexes = new Set<number>();
  const roleIds: Array<string | undefined> = [];

  const players: Player[] = data.players.map((sp, i) => {
    const match = byId.get(`p${i + 1}`) ?? byName.get(sp.name.trim().toLowerCase());
    if (match) usedPackIndexes.add(packPlayers.indexOf(match));

    const traits = match && Array.isArray(match.traits) ? (match.traits as unknown[]).map(String) : undefined;
    roleIds.push(pick(match, "role") || undefined);

    return {
      id: pick(match, "id") || `p${i + 1}`,
      name: pick(match, "name") || sp.name.trim() || `Player ${i + 1}`,
      avatar: pick(match, "avatar") || sp.emoji || "🧑",
      role: roles[0],
      status: "alive" as const,
      isActor: match ? !!match.isActor : sp.isNPC,
      isEliminated: false,
      votes: 0,
      luckRate: Math.max(0, Math.min(10, Number(match?.luckRate ?? (sp.isNPC ? 7 : 5)) || 5)),
      cefrLevel: pick(match, "cefrLevel") || data.level || "B1",
      facts: factsFor(sp, pick(match, "backstory") || undefined),
      traits,
      voiceStyle: pick(match, "voiceStyle") || undefined,
    };
  });

  // Extra players the AI invented (actors with a backstory, or extra learners).
  packPlayers.forEach((p, i) => {
    if (usedPackIndexes.has(i)) return;
    const id = text(p.id) || `ai${i + 1}`;
    if (players.some((x) => x.id === id)) return;
    roleIds.push(text(p.role) || undefined);
    players.push({
      id,
      name: text(p.name, `Actor ${i + 1}`),
      avatar: text(p.avatar, "🎭"),
      role: roles[0],
      status: "alive" as const,
      isActor: p.isActor === undefined ? true : !!p.isActor,
      isEliminated: false,
      votes: 0,
      luckRate: Math.max(0, Math.min(10, Number(p.luckRate ?? 5) || 5)),
      cefrLevel: text(p.cefrLevel, data.level || "B1"),
      facts: factsFor(
        { facts: text(p.facts), from: "", isNPC: true, npcLines: text(p.voiceStyle) },
        text(p.backstory) || undefined,
      ),
      traits: Array.isArray(p.traits) ? (p.traits as unknown[]).map(String) : undefined,
      voiceStyle: text(p.voiceStyle) || undefined,
    });
  });

  const minWerewolves = Number((pack?.roles as Record<string, unknown> | undefined)?.minWerewolves);
  const assigned = assignRoles(
    players,
    roles,
    roleIds,
    Number.isFinite(minWerewolves) && minWerewolves > 0 ? Math.floor(minWerewolves) : undefined,
  );

  const content = pack
    ? (Object.fromEntries(
        Object.entries(pack).filter(([k]) => k !== "players" && k !== "roles"),
      ) as GameContent)
    : undefined;

  return { players: assigned, roles, content };
}
