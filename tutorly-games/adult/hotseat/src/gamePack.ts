import type { PromptCtx, ShellPlayer } from './GameShell';

/* ═══════════════════════════════════════════════════════════════════════════
   GAME PACK — Millionaire Edition
   ---------------------------------------------------------------------------
   The setup page (GameShell) only needs two things from this file:
     • buildMillionairePrompt() — the "Copy AI Prompt" text
     • parseMillionairePack()   — a tolerant reader for the JSON the AI returns
   The pack is an array of show questions; it is deliberately forgiving, because
   teachers paste whatever the model gave them.
   ═══════════════════════════════════════════════════════════════════════════ */

export type PackQuestionType = 'A' | 'B' | 'C';
export type PackCategory = 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'trivia';
export type PackDifficulty = 'easy' | 'medium' | 'hard';

export interface PackQuestion {
  id: number;
  text: string;
  type: PackQuestionType;
  category: PackCategory;
  options: string[];
  correctIndices: number[];
  explanation: string;
  listeningText?: string;
  difficulty: PackDifficulty;
}

export interface ParsedMillionairePack {
  topic: string;
  cefrLevel: string;
  questions: PackQuestion[];
}

const CATEGORIES: PackCategory[] = ['vocabulary', 'grammar', 'reading', 'listening', 'trivia'];
/** how many options and how many correct answers each show round uses */
const SHAPE: Record<PackQuestionType, { options: number; correct: number }> = {
  A: { options: 4, correct: 1 },
  B: { options: 5, correct: 2 },
  C: { options: 7, correct: 3 },
};

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(x => (typeof x === 'string' ? x : String(x))).filter(Boolean) : [];

const uid = () => Math.random().toString(36).slice(2, 8);

/** Turn one raw object from the AI into a question the show can actually play. */
export function asPackQuestion(raw: unknown, index: number): PackQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const text = str(r.text ?? r.question ?? r.prompt).trim();
  if (!text) return null;

  const options = strArray(r.options ?? r.answers ?? r.choices);
  if (options.length < 2) return null;

  // an explicit type wins, otherwise it comes from how many options were given
  const declared = str(r.type).trim().toUpperCase();
  const inferred: PackQuestionType = options.length >= 7 ? 'C' : options.length >= 5 ? 'B' : 'A';
  const type: PackQuestionType =
    declared === 'A' || declared === 'B' || declared === 'C' ? (declared as PackQuestionType) : inferred;
  const shape = SHAPE[type];

  // correctIndices is the native format; a single "correctAnswer" is also accepted
  let correctIndices: number[] = Array.isArray(r.correctIndices)
    ? (r.correctIndices as unknown[]).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < options.length)
    : [];
  if (!correctIndices.length) {
    const single = r.correctAnswer ?? r.correct ?? r.answer;
    if (typeof single === 'number' && Number.isInteger(single)) correctIndices = [single];
    else if (typeof single === 'string') {
      const idx = options.findIndex(o => o.trim().toLowerCase() === single.trim().toLowerCase());
      if (idx >= 0) correctIndices = [idx];
      else if (/^[A-Z]$/i.test(single.trim())) correctIndices = [single.trim().toUpperCase().charCodeAt(0) - 65];
      else if (/^\d+$/.test(single.trim())) correctIndices = [Number(single.trim())];
    }
  }
  correctIndices = Array.from(new Set(correctIndices)).filter(i => i < options.length).slice(0, shape.correct);

  // pad/trim to the exact shape the round requires
  let opts = options.slice(0, shape.options);
  while (opts.length < shape.options) opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
  if (!correctIndices.length) correctIndices = [0];
  while (correctIndices.length < shape.correct) {
    const free = opts.findIndex((_, i) => !correctIndices.includes(i));
    if (free < 0) break;
    correctIndices.push(free);
  }

  const category = CATEGORIES.includes(str(r.category).toLowerCase() as PackCategory)
    ? (str(r.category).toLowerCase() as PackCategory)
    : options.length >= 5 ? 'reading' : 'vocabulary';
  const declaredDifficulty = str(r.difficulty).toLowerCase();
  const difficulty: PackDifficulty =
    declaredDifficulty === 'easy' || declaredDifficulty === 'medium' || declaredDifficulty === 'hard'
      ? (declaredDifficulty as PackDifficulty)
      : index < 5 ? 'easy' : index < 12 ? 'medium' : 'hard';

  return {
    id: Number.isFinite(Number(r.id)) ? Number(r.id) : index + 1,
    text,
    type,
    category,
    options: opts,
    correctIndices,
    explanation: str(r.explanation ?? r.why).trim() || 'Think about the context of the question before you commit.',
    listeningText: str(r.listeningText ?? r.audioText).trim() || undefined,
    difficulty,
  };
}

// ─── PARSER ───────────────────────────────────────────────────────────────────
export function parseMillionairePack(
  json: string
): { ok: true; pack: ParsedMillionairePack } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: `JSON error: ${e instanceof Error ? e.message : 'could not parse'}` };
  }

  // accept a bare array, { questions: [...] }, or { pack: { questions: [...] } }
  const root = (data ?? {}) as Record<string, unknown>;
  const nested = (root.pack ?? root) as Record<string, unknown>;
  const list =
    (Array.isArray(data) && data) ||
    (Array.isArray(root.questions) && root.questions) ||
    (Array.isArray(nested.questions) && nested.questions) ||
    (Array.isArray(root.items) && root.items) ||
    null;
  if (!list) {
    return { ok: false, error: 'No "questions" array found — ask the AI for the JSON array of questions.' };
  }

  const questions = list
    .map((raw, i) => asPackQuestion(raw, i))
    .filter((q): q is PackQuestion => Boolean(q));
  if (questions.length < 3) {
    return { ok: false, error: `Only ${questions.length} usable questions found — the show needs at least 5.` };
  }

  return {
    ok: true,
    pack: {
      topic: str(root.topic) || str(nested.topic),
      cefrLevel: str(root.cefrLevel) || str(nested.cefrLevel) || str(root.level),
      questions: questions.map((q, i) => ({ ...q, id: i + 1 })),
    },
  };
}

/** Human-readable validation for the setup page's "Load Pack" button. */
export function validateMillionaireJson(json: string): { ok: boolean; message: string } {
  const res = parseMillionairePack(json);
  if (!res.ok) return { ok: false, message: res.error };
  const qs = res.pack.questions;
  const count = (pred: (q: PackQuestion) => boolean) => qs.filter(pred).length;
  const bits = [
    `${qs.length} questions`,
    `${count(q => q.type === 'A')}×4-option`,
    `${count(q => q.type === 'B')}×5-option`,
    `${count(q => q.type === 'C')}×7-option`,
    `${count(q => q.difficulty === 'hard')} hard`,
    `${count(q => q.category === 'listening')} listening`,
  ].filter(Boolean);
  return { ok: true, message: `Pack ready — ${bits.join(' · ')}. Press “Start Game” to go on air.` };
}

// ─── PROMPT BUILDER ───────────────────────────────────────────────────────────
export interface MillionairePromptCtx extends PromptCtx {
  questionCount: number;
}

export function buildMillionairePrompt(ctx: MillionairePromptCtx, playersOverride?: ShellPlayer[]): string {
  const players = playersOverride ?? ctx.players;
  const learners = players.filter(p => !p.isNPC);
  const actors = players.filter(p => p.isNPC);
  const topic = ctx.topic || 'General English';
  const level = ctx.level || 'B1';
  const n = ctx.questionCount || 15;
  const easy = Math.max(1, Math.round(n / 3));
  const medium = Math.max(easy + 1, Math.round((n * 2) / 3));

  const learnerBlock = learners.length
    ? learners
        .map(
          (p, i) => `${i + 1}. "${p.name || `Learner ${i + 1}`}" (avatar ${p.emoji})
   - Interests / facts: ${p.facts || 'not given'}
   - From: ${p.from || 'not given'}`
        )
        .join('\n')
    : '1. "Learner" (no profile given)';

  const actorBlock = actors.length
    ? actors
        .map(
          (p, i) => `${i + 1}. NPC "${p.name || `Character ${i + 1}`}" (avatar ${p.emoji})
   - Personality: ${p.npcLines || 'playful rival who loves banter'}`
        )
        .join('\n')
    : '';

  const personalisation = learners
    .filter(p => p.facts)
    .map(p => `- "${p.name}": use their interests (${p.facts}) as the context of at least 2 questions — never as the giveaway answer.`)
    .join('\n');

  return `You are the head question writer for "HotSeat — Language Edition", a live class game show. Write the question bank for one episode.

⚠️ OUTPUT RULES: reply with ONE valid JSON object and NOTHING else. No markdown fences, no commentary, no trailing commas. Escape every quote inside a string. A truncated answer is useless — the JSON must close properly.

═══ EPISODE ═══
Topic: ${topic}
Target CEFR level: ${level}
Questions required: EXACTLY ${n}
Theme / context from the teacher: ${ctx.location || 'not given — use the topic'}
Learners on the show:
${learnerBlock}${actorBlock ? `\nActors / NPC rivals:\n${actorBlock}` : ''}

═══ JSON SHAPE ═══
{
  "topic": "${topic}",
  "cefrLevel": "${level}",
  "questions": [
    {
      "id": 1,
      "text": "the question, written as the host would read it",
      "type": "A",
      "category": "vocabulary",
      "options": ["...", "...", "...", "..."],
      "correctIndices": [1],
      "explanation": "why that answer is right AND the trap the closest wrong option sets",
      "difficulty": "easy",
      "listeningText": "only for listening questions — what the host says out loud"
    }
  ]
}

═══ ROUND SHAPES (the show depends on these exact shapes) ═══
• "type": "A" → exactly 4 options, exactly 1 correct → "correctIndices" has 1 number
• "type": "B" → exactly 5 options, exactly 2 correct → "correctIndices" has 2 numbers
• "type": "C" → exactly 7 options, exactly 3 correct → "correctIndices" has 3 numbers
Mix them roughly 50% A, 30% B, 20% C. "correctIndices" is ZERO-indexed (the first option is 0).

═══ DIFFICULTY CURVE ═══
Questions 1-${easy} = easy (confidence builders), ${easy + 1}-${medium} = medium, ${medium + 1}-${n} = hard. Mark each with "difficulty".
The hard ones must be genuinely hard: a strong ${level} student should need a moment, not a guess.

═══ QUALITY BAR — THIS IS GRADED LESSON WORK ═══
1. Never ask "what does <word> mean?" or anything whose answer you already gave away. Test paraphrase, inference from a short context, collocation, register, prepositions, or a detail hidden in a listening text.
2. Every wrong option must be a mistake a real ${level} learner makes: near-synonyms with the wrong collocation, the wrong preposition, the wrong register (too casual / too formal), a false friend, or a paraphrase that changes one detail. Keep option lengths similar (within about 3 words).
3. Ban giveaways: no joke options, no "all of the above" / "none of the above", nothing obviously wrong, and never make the only long option the answer.
4. Spread the correct answers across positions — do not let index 0 win over and over.
5. "explanation" must teach in one or two sentences: the rule, plus the trap in the closest wrong option.
6. Use all five categories across the episode: "vocabulary", "grammar", "reading", "listening", "trivia".
   • "listening" questions MUST include "listeningText" (30-70 words of natural speech with a name, a number or a date in it) — the host reads it aloud and the question must hinge on a detail inside it.
   • "reading" questions can put the passage inside "text" (a short paragraph then the question).
   • "trivia" must be about the topic/language, not random facts.
7. No two questions may test the same point or reuse the same sentence.
8. Personalise: use the learners' names and interests as the characters inside the questions (never as the giveaway).
${personalisation || '- Use the learner names above inside a few questions.'}

═══ FINAL SELF-CHECK BEFORE YOU ANSWER ═══
1. "questions" has EXACTLY ${n} objects, and every "id" is unique.
2. Every question has the right number of options and correctIndices for its "type".
3. Every question has category, difficulty and a teaching explanation.
4. Every listening question has listeningText.
5. The JSON parses: no trailing commas, no markdown fences, nothing outside the object.
Output ONLY the JSON.`;
}

/** Small helper for the game's own "menu" prompt button. */
export function buildMenuPrompt(players: ShellPlayer[], questionCount: number, topic: string, level: string): string {
  return buildMillionairePrompt({ players, location: '', level, topic, questionCount });
}

export { uid as packUid };
