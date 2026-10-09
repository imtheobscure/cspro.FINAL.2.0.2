/* ═══════════════════════════════════════════════════════════════════════
   TUTORLY SNAKE & LADDER — SHARED GAME PACK
   ───────────────────────────────────────────────────────────────────────
   ONE prompt builder + ONE tolerant parser, used by BOTH:
     • the shared Tutorly setup page (`GameShell` → `PlayerSetup`), and
     • the game's own advanced setup screen.
   That way a pack pasted into either screen behaves identically.
   ═══════════════════════════════════════════════════════════════════════ */

import type { PromptCtx } from './GameShell';

export const TOTAL_CELLS = 50;

export type GameMode = 'kids' | 'adult';
export type ScenarioKind = 'standard' | 'convince' | 'roleplay';
export type ActorRole = 'guide' | 'rival' | 'trickster' | 'support';
export interface LuckRules { maxAdjustment: 0 | 1; strength: number }

export interface SnakePackPlayer {
  id: string;
  role: 'learner' | 'actor';
  name: string;
  avatar: string;
  color: string;
  from?: string;
  interests?: string[];
  strengths?: string[];
  facts?: string;
  traits?: string[];
  dialogueLines?: string[];
  luckRate?: number;
}

export interface SnakePackInput {
  title: string;
  subtitle: string;
  mode: GameMode;
  hostName: string;
  speechRate: number;
  luckRules: LuckRules;
  players: SnakePackPlayer[];
  location?: string;
  level?: string;
  topic?: string;
}

export interface SnakeEffects { health?: number; hunger?: number; energy?: number; morale?: number; credits?: number }
export interface SnakeChoice { id: string; text: string; consequence: string; effects: SnakeEffects; hostReaction: string }
export interface SnakeDecision {
  id: string;
  kind: ScenarioKind;
  title: string;
  grammarFocus: string;
  speakingPrompt: string;
  situation: string;
  hostIntro: string;
  choices: SnakeChoice[];
}
export type SnakeCellType = 'snake' | 'ladder' | 'decision' | 'oasis' | 'death' | 'jumpscare' | 'start' | 'finish';
export interface SnakeCell {
  type: SnakeCellType;
  emoji: string;
  label: string;
  description: string;
  hostComment: string;
  destination?: number;
  decisionId?: string;
}
export interface SnakePack {
  title: string;
  subtitle: string;
  mode: GameMode;
  luckRules: LuckRules;
  decisions: SnakeDecision[];
  boardCells: Record<number, SnakeCell>;
  /** the profile data the AI filled in (interests, strengths, NPC traits) */
  players: SnakePackPlayer[];
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function normalizeLuckRate(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 5;
  return clamp(Math.round(n), 0, 10);
}

export const SNAKE_PACK_DEFAULTS = {
  title: 'Tutorly Snake & Ladder',
  subtitle: 'Personalized speaking survival board game',
  hostName: 'Bruce',
  speechRate: 0.95,
  luckRules: { maxAdjustment: 1, strength: 0.35 } as LuckRules,
};

// ─────────────────────────────────────────────────────────────
// AI prompt
// ─────────────────────────────────────────────────────────────
export function buildSnakePackPrompt(payload: SnakePackInput): string {
  const learners = payload.players.filter(p => p.role === "learner");
  const npcs = payload.players.filter(p => p.role === "actor");

  const learnerBlock = learners.length === 0
    ? "(No learners entered. Generate 2 sample learner profiles.)"
    : learners.map((p, i) => `  Learner ${i + 1}: id="${p.id}", name="${p.name}", avatar="${p.avatar}", color="${p.color}", from="${p.from || "?"}", interests=[${(p.interests ?? []).map(x => `"${x}"`).join(",")}], strengths=[${(p.strengths ?? []).map(x => `"${x}"`).join(",")}], facts="${p.facts || ""}"`).join("\n");

  const npcBlock = npcs.length === 0
    ? "(No NPCs entered. You may generate 1-2 default NPCs for roleplay.)"
    : npcs.map((p, i) => `  NPC ${i + 1}: id="${p.id}", name="${p.name}", avatar="${p.avatar}", color="${p.color}", luckRate=${normalizeLuckRate(p.luckRate ?? 7)}, traits=[${(p.traits ?? []).map(x => `"${x}"`).join(",")}], dialogueLines=[${(p.dialogueLines ?? []).slice(0,3).map(x => `"${x}"`).join(",")}...], facts="${p.facts || ""}"`).join("\n");

  return `You are an expert curriculum designer and game narrative writer.
Your task: produce ONE COMPLETE, VALID JSON object for the game "Tutorly Snake & Ladder".
This JSON controls 100% of the game: every player profile, every scenario, the entire board, and luck rules.
The tutor screen-shares this game in class — all text must be clear and concise.

═══ GAME OVERVIEW ═══
Title: "${payload.title}"
Subtitle: "${payload.subtitle}"
Mode: "${payload.mode}" → ${payload.mode === "kids" ? "Kid-safe. No death/blood/poison. Gentle consequences. Encouraging host." : "Adult. Serious realistic consequences. Can include danger, scarcity, injury. Classroom-appropriate."}
Host name: "${payload.hostName}" (speechRate: ${payload.speechRate})
Setting: "${payload.location || "an invented but vivid city that fits the topic"}" · Learner level: ${payload.level || "B1"} · Weekly topic: "${payload.topic || "General English"}"
Anchor EVERY scenario in this setting: real streets, markets, food and landmarks when the location is a real city, and language graded to CEFR ${payload.level || "B1"} + 1.
Board: 50 squares, serpentine 5×10 grid
Core mechanic: speaking decisions — learners speak English 30–60 seconds before choosing

═══ LEARNER PROFILES (real students — personalize scenarios for them) ═══
${learnerBlock}

Rules:
- Keep every learner's id, name, avatar, color UNCHANGED in output.
- Fill in from, interests[], strengths[], facts if missing.
- Create at least 3 scenarios per learner referencing their personal data.
  Example: if learner is from Japan and likes anime → "You find a hand-drawn map that reminds you of manga art..."

═══ NPC PROFILES (non-player characters — AI-controlled story actors) ═══
${npcBlock}

Rules:
- Keep every NPC's id, name, avatar, color UNCHANGED.
- Assign actorRole: "guide" (helpful), "rival" (competitive/taunting), "trickster" (chaotic/funny), or "support" (calm/reassuring).
- Generate 8–15 unique short dialogueLines per NPC (in-character phrases for roleplay rounds).
- Set luckRate as integer 0–10 (higher = luckier dice).

═══ DECISIONS (generate 40–80 of these) ═══

Each decision object MUST have this EXACT structure:
{
  "id": "d1",
  "kind": "standard",
  "title": "Short Title",
  "grammarFocus": "First Conditional",
  "speakingPrompt": "Use FIRST CONDITIONAL: 'If I..., I will...' Speak 30–60 seconds.",
  "situation": "2–4 vivid sentences describing the scenario.",
  "hostIntro": "Short host line introducing the scenario.",
  "choices": [
    {
      "id": "a",
      "text": "Action in 3–8 words",
      "consequence": "2–3 sentences: what happens.",
      "effects": { "health": 0, "hunger": 0, "energy": 0, "morale": 0, "credits": 0 },
      "hostReaction": "Host feedback, 1–2 sentences."
    },
    { "id": "b", "text": "...", "consequence": "...", "effects": {...}, "hostReaction": "..." },
    { "id": "c", "text": "...", "consequence": "...", "effects": {...}, "hostReaction": "..." }
  ]
}

DECISION KINDS (distribute across all decisions):
- "standard" (60%): player speaks, then picks A/B/C
- "convince" (20%): player persuades group, then ALL players vote; majority wins
- "roleplay" (20%): NPC speaks first (dialogueLine shown), learner responds verbally, then picks

EFFECTS: all values are INTEGERS. Ranges:
- health: -30 to +30 (${payload.mode === "kids" ? "kids: cap at -10" : "adult: full range"})
- hunger: -30 to +30
- energy: -30 to +30
- morale: -30 to +30
- credits: -10 to +25

GRAMMAR FOCUS: rotate through these:
First Conditional, Second Conditional, Third Conditional, Modal Verbs, Reported Speech,
Passive Voice, Relative Clauses, Comparatives/Superlatives, Present Perfect,
Past Perfect, Cause/Effect connectors, Expressing Opinion, Making Predictions,
Giving Advice, Describing Processes, Expressing Regret, Future Forms, Question Tags

No decision should have an obviously "best" choice — all 3 must have meaningful trade-offs.

═══ BOARD LAYOUT ═══

board.cells is an object with STRING keys "1" through "50":
{
  "1": { "type": "start", "emoji": "🚀", "label": "START", "description": "Begin", "hostComment": "Welcome!" },
  "5": { "type": "ladder", "emoji": "🪜", "label": "Vines Up", "description": "Climb", "hostComment": "Up!", "destination": 15 },
  "48": { "type": "snake", "emoji": "🐍", "label": "Anaconda", "description": "Slide two rows back", "hostComment": "Coils around you. Two rows back.", "destination": 26 },
  "3": { "type": "decision", "emoji": "🎯", "label": "Decision", "description": "Speaking", "hostComment": "Speak!", "decisionId": "d1" },
  "50": { "type": "finish", "emoji": "🏆", "label": "TEMPLE", "description": "Win", "hostComment": "Victory!" }
}

Required squares:
- "1": start, "50": finish
The board is 10 squares wide and 5 rows deep (row 1 = squares 1-10 at the bottom, row 5 = squares 41-50 at the top).

- 5 snakes. A snake MUST carry the player DOWN at least one whole row — a snake that starts and ends inside the same row is banned. Use exactly these: "48"→26, "32"→12, "29"→14, "38"→22, "45"→33.
- 5 ladders, each climbing at least one whole row: "5"→15, "13"→27, "22"→35, "31"→43, "40"→49.
- 2 oasis: "18","37" (full stat restore)
- 1 death: "34" (big setback, destination=10)
- 2 jumpscare: "16","42" (morale hit)
- ALL other squares (~32): type "decision" with decisionId matching a decisions[].id

═══ QUALITY BAR — REJECT YOUR OWN FIRST DRAFT IF IT FAILS ANY OF THESE ═══

1. SPECIFIC, NOT GENERIC: never "you find supplies". Write "you find a dented tin of sardines, a box of damp matches and a note you cannot read".
2. REAL PLACES: use the real streets, markets, foods and landmarks of the setting. If you are not certain a name is real, describe the place instead of inventing a fake address.
3. CHALLENGING LANGUAGE: every speakingPrompt demands the target structure at CEFR+1, 30–60 seconds of speech, and carries one follow-up question the host can ask. No yes/no prompts, no definition questions, and never something a one-word answer could satisfy — the question must force a full, structured mini-answer with a reason and an example.
4. HARD CHOICES: all three choices must be attractive in a different way and each must cost something real (health, time, money, morale or trust). Never include an obviously correct option, and never a joke option.
5. PLAUSIBLE DISTRACTORS: wrong choices must sound like what a learner would genuinely say — e.g. a wrong conditional form — not nonsense.
6. NO REPETITION: no two situations may share the same problem type, opening line or consequence shape. Rotate which choice is strongest so it is not always "a".
7. CONSEQUENCES BITE: each consequence states a concrete outcome and a new complication, 2–3 sentences, and the hostReaction adds one line of pressure or encouragement.
8. VARIETY: at least 12 different grammar focuses and at least 10 situation themes (water, food, shelter, injury, weather, strangers, wildlife, transport, money, trust, fire, darkness).
9. KIDS MODE (when mode is "kids"): no death, blood or cruelty, soften every consequence, and always end the host line with encouragement.
10. COUNT: 40–80 decisions. More unique scenarios is always better than fewer — they ARE the game.

═══ LUCK RULES ═══
{ "maxAdjustment": ${payload.luckRules.maxAdjustment}, "strength": ${payload.luckRules.strength} }

═══ CRITICAL JSON VALIDATION RULES ═══

⚠️ OUTPUT RAW JSON ONLY. No markdown. No backticks. No explanation before or after.

Before outputting, verify EVERY rule:
✅ Root has: version(=1), title, subtitle, mode, host{name,speechRate}, luckRules{maxAdjustment,strength}, players[], decisions[], board{totalCells,cells{}}
✅ All strings use DOUBLE QUOTES
✅ NO trailing commas after last element in arrays or objects
✅ players[] contains ALL learners + NPCs from input with UNCHANGED id/name/avatar/color
✅ Every learner has: id, role("learner"), name, avatar, color, from, interests[], strengths[], facts
✅ Every NPC has: id, role("actor"), name, avatar, color, actorRole, traits[], dialogueLines[](8-15), luckRate(int 0-10), facts
✅ decisions[] has 40-80 entries with unique ids
✅ Every decision has EXACTLY 3 choices with id("a"/"b"/"c"), text, consequence, effects{health,hunger,energy,morale,credits}, hostReaction
✅ ALL effect values are INTEGERS (not strings, not floats, not null)
✅ board.cells keys are STRINGS "1" through "50"
✅ Every decision-type cell references a decisionId that EXISTS in decisions[]
✅ Snake destinations < their square number AND at least one row lower (row = ceil(SN/10); destination row must be smaller than the snake's row)
✅ Ladder destinations > their square number AND at least one row higher
✅ No duplicate decision IDs, no orphan references
✅ Total decisions >= number of decision-type board cells

OUTPUT THE COMPLETE JSON NOW:`;
}// ─────────────────────────────────────────────────────────────────────────────
// Tolerant parser — teachers paste JSON straight out of a chat window,
// so strip markdown fences, find the object, coerce every field.
// ─────────────────────────────────────────────────────────────────────────────
const CELL_TYPES: SnakeCellType[] = ['snake', 'ladder', 'decision', 'oasis', 'death', 'jumpscare', 'start', 'finish'];
const CELL_EMOJI: Record<SnakeCellType, string> = {
  snake: '🐍', ladder: '🪜', decision: '🎯', oasis: '⛲',
  death: '💀', jumpscare: '😱', start: '🚀', finish: '🏆',
};

export function stripJsonFences(raw: string): string {
  let s = (raw ?? '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return s;
}

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

function normalizeChoice(raw: Record<string, unknown>, i: number): SnakeChoice {
  const e = (raw?.effects ?? {}) as Record<string, unknown>;
  return {
    id: str(raw?.id, ['a', 'b', 'c'][i] ?? `c${i}`),
    text: str(raw?.text, `Choice ${i + 1}`),
    consequence: str(raw?.consequence, ''),
    effects: { health: num(e.health), hunger: num(e.hunger), energy: num(e.energy), morale: num(e.morale), credits: num(e.credits) },
    hostReaction: str(raw?.hostReaction, ''),
  };
}

function normalizeDecision(raw: Record<string, unknown>, i: number): SnakeDecision {
  const kinds: ScenarioKind[] = ['standard', 'convince', 'roleplay'];
  const kind = kinds.includes(raw?.kind as ScenarioKind) ? (raw.kind as ScenarioKind) : 'standard';
  const rawChoices = Array.isArray(raw?.choices) ? (raw.choices as Record<string, unknown>[]) : [];
  return {
    id: str(raw?.id, `d${i + 1}`),
    kind,
    title: str(raw?.title, `Scenario ${i + 1}`),
    grammarFocus: str(raw?.grammarFocus, 'Speaking'),
    speakingPrompt: str(raw?.speakingPrompt, 'Speak for 30–60 seconds.'),
    situation: str(raw?.situation, ''),
    hostIntro: str(raw?.hostIntro, ''),
    choices: rawChoices.slice(0, 3).map(normalizeChoice).filter(c => c.text.length > 0),
  };
}

function normalizeCell(raw: Record<string, unknown>): SnakeCell {
  const type = CELL_TYPES.includes(raw?.type as SnakeCellType) ? (raw.type as SnakeCellType) : 'decision';
  const cell: SnakeCell = {
    type,
    emoji: str(raw?.emoji, CELL_EMOJI[type]),
    label: str(raw?.label, type.toUpperCase()),
    description: str(raw?.description, ''),
    hostComment: str(raw?.hostComment, ''),
  };
  const dest = Number(raw?.destination);
  if (Number.isFinite(dest) && dest >= 1 && dest <= TOTAL_CELLS) cell.destination = Math.round(dest);
  if (raw?.decisionId) cell.decisionId = String(raw.decisionId);
  return cell;
}

/** Reads any of the pack shapes the AI might return (board.cells, boardCells or cells). */
export function parseSnakePack(raw: string): SnakePack {
  const parsed = JSON.parse(stripJsonFences(raw)) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('That is not a JSON object');

  const decisionsRaw = Array.isArray(parsed.decisions) ? (parsed.decisions as Record<string, unknown>[]) : [];
  const decisions = decisionsRaw.map(normalizeDecision).filter(d => d.choices.length > 0);
  if (decisions.length === 0) throw new Error('No decisions[] in the pack — ask the AI to output the complete JSON');

  const board = parsed.board as { cells?: Record<string, unknown> } | undefined;
  const cellsRaw = (board?.cells ?? parsed.boardCells ?? parsed.cells ?? {}) as Record<string, unknown>;
  const boardCells: Record<number, SnakeCell> = {};
  Object.keys(cellsRaw).forEach(k => {
    const n = Number(k);
    if (Number.isFinite(n) && n >= 1 && n <= TOTAL_CELLS) boardCells[n] = normalizeCell(cellsRaw[k] as Record<string, unknown>);
  });

  const luck = (parsed.luckRules ?? {}) as Record<string, unknown>;
  const strength = typeof luck.strength === 'number' ? luck.strength : Number(luck.strength);

  const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  const playersRaw = Array.isArray(parsed.players) ? (parsed.players as Record<string, unknown>[]) : [];
  const players: SnakePackPlayer[] = playersRaw.map((p, i) => ({
    id: str(p?.id, `p${i + 1}`),
    role: p?.role === 'actor' ? 'actor' : 'learner',
    name: str(p?.name, `Player ${i + 1}`),
    avatar: str(p?.avatar, '🧑'),
    color: str(p?.color, '#8b5cf6'),
    from: str(p?.from, ''),
    interests: asStrings(p?.interests),
    strengths: asStrings(p?.strengths),
    facts: str(p?.facts, ''),
    traits: asStrings(p?.traits),
    dialogueLines: asStrings(p?.dialogueLines),
    luckRate: normalizeLuckRate(p?.luckRate ?? 5),
  }));

  return {
    players,
    title: str(parsed.title, SNAKE_PACK_DEFAULTS.title),
    subtitle: str(parsed.subtitle, SNAKE_PACK_DEFAULTS.subtitle),
    mode: parsed.mode === 'kids' ? 'kids' : 'adult',
    luckRules: {
      maxAdjustment: num(luck.maxAdjustment) === 1 ? 1 : 0,
      strength: Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : SNAKE_PACK_DEFAULTS.luckRules.strength,
    },
    decisions,
    boardCells,
  };
}

/** Instant feedback for the setup page: what did we actually get, and what is thin? */
export function validateSnakePackJson(raw: string): { ok: boolean; message: string } {
  try {
    const pack = parseSnakePack(raw);
    const count = (t: SnakeCellType) => Object.values(pack.boardCells).filter(c => c.type === t).length;
    const issues: string[] = [];
    if (pack.decisions.length < 20) issues.push(`only ${pack.decisions.length} decisions (ask for 40–80)`);
    if (count('snake') < 5) issues.push(`${count('snake')} snakes (want 5)`);
    if (count('ladder') < 5) issues.push(`${count('ladder')} ladders (want 5)`);
    // The fun of a snake is the drop down the board, so flag any that never
    // leave their own row (rows are 1-10, 11-20, 21-30, 31-40, 41-50).
    const rowOf = (n: number) => Math.max(1, Math.ceil(n / 10));
    const flatSnakes = Object.entries(pack.boardCells).filter(
      ([sq, c]) => c.type === 'snake' && typeof c.destination === 'number' && rowOf(c.destination) >= rowOf(Number(sq)),
    ).length;
    if (flatSnakes) issues.push(`${flatSnakes} snake(s) never leave their own row — ask the AI to send them lower`);
    const flatLadders = Object.entries(pack.boardCells).filter(
      ([sq, c]) => c.type === 'ladder' && typeof c.destination === 'number' && rowOf(c.destination) <= rowOf(Number(sq)),
    ).length;
    if (flatLadders) issues.push(`${flatLadders} ladder(s) do not climb a row`);
    if (!pack.boardCells[1]) issues.push('square 1 (START) is missing');
    if (!pack.boardCells[TOTAL_CELLS]) issues.push(`square ${TOTAL_CELLS} (FINISH) is missing`);
    const summary = `${pack.decisions.length} decisions · ${Object.keys(pack.boardCells).length}/${TOTAL_CELLS} squares · ${count('snake')}🐍 ${count('ladder')}🪜 · ${pack.mode === 'kids' ? 'kids' : 'adult'} mode`;
    return { ok: issues.length === 0, message: issues.length ? `${summary} — ${issues.join(', ')}` : summary };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || 'Could not read that JSON' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared-shell adapter — the Tutorly setup page collects names, facts and
// avatars; the pack wants ids, roles and per-NPC dialogue lines.
// ─────────────────────────────────────────────────────────────────────────────
const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

export function playersFromShellCtx(ctx: PromptCtx): SnakePackPlayer[] {
  return ctx.players.map((p, i) => ({
    id: `p${i + 1}`,
    role: p.isNPC ? 'actor' : 'learner',
    name: p.name.trim() || (p.isNPC ? `NPC ${i + 1}` : `Learner ${i + 1}`),
    avatar: p.emoji,
    color: p.color,
    from: p.from,
    facts: p.facts,
    interests: p.facts ? p.facts.split(',').map(s => s.trim()).filter(Boolean) : [],
    strengths: [],
    traits: p.isNPC ? ['guide'] : [],
    dialogueLines: p.isNPC
      ? (p.npcLines || '').split(SENTENCE_SPLIT).map(s => s.trim()).filter(Boolean).slice(0, 15)
      : [],
    luckRate: p.isNPC ? 7 : 5,
  }));
}

/** Prompt used by the shared Tutorly setup page. A1/A2 classes get gentle kids mode. */
export function buildSnakeShellPrompt(ctx: PromptCtx): string {
  const mode: GameMode = ctx.level === 'A1' || ctx.level === 'A2' ? 'kids' : 'adult';
  return buildSnakePackPrompt({
    ...SNAKE_PACK_DEFAULTS,
    mode,
    players: playersFromShellCtx(ctx),
    location: ctx.location,
    level: ctx.level,
    topic: ctx.topic,
  });
}
