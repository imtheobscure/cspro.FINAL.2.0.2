import type { PromptCtx, ShellPlayer } from "./GameShell";
import type { Blank, Branch, LearnerInfo, Payload, Template } from "./games/madlibs/types";

/* ═══════════════════════════════════════════════════════════════════════════
   GAME PACK — MadLibs Edition
   ---------------------------------------------------------------------------
   The setup page needs exactly three things from this file:
     • buildMadlibsPrompt() — the text behind "Copy AI Prompt"
     • parseMadlibsPack()   — a TOLERANT reader: teachers paste whatever the
       model wrote back, so a stray fence, a missing field or non-sequential
       blank ids get repaired here instead of ending the lesson
     • validateMadlibsJson() — the one-line verdict "Load Pack" shows

   The story shape is the same one the game's own templates use, plus an
   optional `branches` array for the "what happens next" rounds.
   ═══════════════════════════════════════════════════════════════════════════ */

export const THEME_LABELS = [
  "🐉 Fantasy", "🔍 Mystery", "🏛️ Historical", "☢️ Post-Apocalyptic", "🚬 Noir", "👸 Fairy Tale",
  "⚡ Mythology", "☕ Slice of Life", "🏆 Sports", "🎄 Holiday", "🌙 Dream / Surreal", "⏰ Time Travel",
  "🎌 Japanese Anime", "🤖 AI Custom",
] as const;

export const MOOD_LABELS = ["😂 Hilarious", "💀 Gloomy", "⚔️ Epic", "🎭 Satirical", "💕 Romantic", "🤪 Absurd"] as const;

export const BLANK_TYPES = [
  "noun", "verb", "adjective", "person", "place", "animal", "food", "emotion", "number", "color",
  "adverb", "exclamation",
] as const;

/** Blank counts the coach expects for each band — the AI is told to match them. */
const CEFR_BLANKS: Record<string, string> = {
  A1: "6-8 blanks, present simple + past simple only, concrete everyday vocabulary",
  A2: "8-10 blanks, add present/past continuous and high-frequency phrasal verbs",
  B1: "10-14 blanks, add present perfect, conditionals 1-2 and basic reported speech",
  B2: "12-16 blanks, add the passive voice, conditional 3 and complex clauses",
  C1: "14-18 blanks, inversion and subjunctive are welcome, sophisticated connectors",
  C2: "16-20 blanks, idioms, collocations, register shifts and subtle humour",
};

const learnerLines = (players: ShellPlayer[]): string =>
  players
    .map((p, i) => {
      if (p.isNPC) return `  ${i + 1}. (rival/character) ${p.name} — ${p.npcLines || "a dramatic rival"}`;
      const bits = [p.facts, p.from ? `from ${p.from}` : ""].filter(Boolean).join("; ");
      return `  ${i + 1}. ${p.name}${bits ? ` — ${bits}` : ""}`;
    })
    .join("\n");

/**
 * The prompt teachers paste into ChatGPT / Claude. Mirrors the strictness of the
 * original single-file prompt (15 stories, 5 themes × 3 moods, strict CEFR) and
 * adds the branching rounds the new engine plays.
 */
export function buildMadlibsPrompt(ctx: PromptCtx, storyCount = 15): string {
  const { players, location, level, topic } = ctx;
  const themes = Math.max(2, Math.round(storyCount / 3));
  const perTheme = Math.max(1, Math.round(storyCount / themes));
  const blankRule = CEFR_BLANKS[level] ?? CEFR_BLANKS.B1;
  const locationLine = location ? `Lesson context from the teacher: ${location}.` : "No extra lesson context was given.";

  return `You are writing fill-in-the-blanks stories for "Tutorly MadLibs", a live class game for ${level} English learners.

⚠️ OUTPUT RULES (MANDATORY)
1) Reply with ONE valid JSON object and NOTHING else — no markdown fences, no commentary, no trailing commas.
2) Escape every quote inside a string. A truncated or unclosed object is useless.
3) The object MUST have exactly two keys: "learnerInfo" and "madlibs".

═══ THE CLASS ═══
${learnerLines(players)}
Target CEFR level: ${level}
Lesson topic: ${topic}
${locationLine}

Use the learners' names and interests INSIDE the stories (never as a giveaway) and keep every story inside the ${level} band.

═══ WHAT TO WRITE ═══
Exactly ${themes} themes × ${perTheme} moods = ${storyCount} stories. Pick ${themes} theme labels from:
${THEME_LABELS.map((t) => `  - "${t}"`).join("\n")}

For each theme pick ${perTheme} DISTINCT mood labels from:
${MOOD_LABELS.map((m) => `  - "${m}"`).join("\n")}

At least two themes must match the learners' interests. All stories must share learnerInfo.cefrLevel exactly.

CEFR RULE FOR ${level}: ${blankRule}

═══ JSON SHAPE (follow it exactly) ═══
{
  "learnerInfo": { "cefrLevel": "${level}", "interests": ["..."], "lessonTopic": "${topic}" },
  "madlibs": [
    {
      "id": "fantasy-hilarious-1",
      "theme": "🐉 Fantasy",
      "mood": "😂 Hilarious",
      "cefrLevel": "${level}",
      "title": "a short, funny title",
      "templateText": "The story body. Every blank appears here as {1}, {2}, {3} …",
      "blanks": [
        { "id": "1", "label": "Adjective", "type": "adjective", "suggestions": ["4-8 words, CEFR-appropriate"] }
      ],
      "reflectionQuestions": ["5 questions, at least 2 on the lesson grammar"],
      "normalEnding": "a satisfying ending that may reuse {1}, {2} …",
      "absurdEnding": "a ridiculous ending that may reuse {1}, {2} …",
      "branches": [
        {
          "id": "fantasy-hilarious-1-b1",
          "label": "the choice the class reads, e.g. 'Follow the dragon into the cave'",
          "tone": "normal",
          "beat": "one paragraph that continues the story and uses ITS OWN blanks as {1}, {2}, {3}",
          "blanks": [ { "id": "1", "label": "New Place", "type": "place", "suggestions": ["...", "..."] } ]
        }
      ]
    }
  ]
}

═══ HARD RULES ═══
• blank "id" values are strings "1","2","3" … in order, and templateText must contain every one of them.
• templateText must NOT contain a placeholder that has no blank.
• normalEnding / absurdEnding may reuse placeholders but must not invent new ones.
• "type" must be one of: ${BLANK_TYPES.join(", ")}.
• Labels may target a form the coach checks, e.g. "Verb (-ing)", "Past Verb", "Adverb", "Number", "Color". Use them on purpose — the game grades the form.
• Provide exactly 3 "branches" per story. Each branch needs 2-4 of its OWN blanks, numbered from "1" again, and its "beat" must use every one of them. Give the three branches different tones.

═══ QUALITY BAR ═══
• Each theme+mood pair must feel genuinely different, not a rewording.
• Humour stays grammatically correct even when absurd.
• Keep everything classroom-safe.
• Reflection questions grow with the level: identify → transform → produce.

═══ FINAL SELF-CHECK (do this before answering) ═══
1) The JSON parses. 2) madlibs.length === ${storyCount}. 3) Every story's cefrLevel === "${level}".
4) Every story's placeholders match its blanks exactly. 5) Every story has 3 usable branches.
Output ONLY the JSON.`;
}

/* ── tolerant parsing ────────────────────────────────────────────────────── */

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback;
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x).trim()).filter(Boolean) : [];

/** Placeholder ids in the order they appear in a piece of text. */
const placeholderIds = (text: string): string[] => {
  const out: string[] = [];
  const re = /\{([A-Za-z0-9]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
};

const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

/** Rewrite every {old} placeholder to {next} across a set of texts. */
const remap = (text: string, map: Map<string, string>): string =>
  text.replace(/\{([A-Za-z0-9]+)\}/g, (whole, id: string) => (map.has(id) ? `{${map.get(id)}}` : whole));

const cleanFences = (json: string): string =>
  json
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

interface Repaired<T> {
  value: T;
  fixes: string[];
}

/** Normalise one blank list: ids become sequential strings, suggestions trimmed. */
function repairBlanks(raw: unknown, where: string, fixes: string[]): Blank[] {
  if (!Array.isArray(raw)) return [];
  const blanks: Blank[] = [];
  raw.forEach((b, i) => {
    if (!b || typeof b !== "object") {
      fixes.push(`${where}: dropped blank #${i + 1} (not an object).`);
      return;
    }
    const r = b as Record<string, unknown>;
    const label = str(r.label ?? r.name).trim();
    const type = str(r.type ?? r.kind).trim().toLowerCase() || "noun";
    if (!label) {
      fixes.push(`${where}: dropped blank #${i + 1} (no label).`);
      return;
    }
    blanks.push({
      id: String(i + 1),
      label,
      type: (BLANK_TYPES as readonly string[]).includes(type) ? type : type || "noun",
      suggestions: strArray(r.suggestions ?? r.examples).slice(0, 8),
    });
  });
  return blanks;
}

/**
 * Rebuild one template from whatever the AI produced.
 * Returns null only when the story cannot be played at all.
 */
function repairTemplate(raw: unknown, index: number, learnerLevel: string): Repaired<Template> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const fixes: string[] = [];
  const title = str(r.title ?? r.name).trim() || `Story ${index + 1}`;

  let blanks = repairBlanks(r.blanks, `"${title}"`, fixes);
  if (blanks.length < 2) return null;

  let text = str(r.templateText ?? r.text ?? r.body).trim();
  if (!text) return null;

  const oldIds = Array.isArray(r.blanks)
    ? (r.blanks as unknown[]).map((b, i) => str((b as Record<string, unknown>)?.id, String(i + 1)).trim() || String(i + 1))
    : blanks.map((b) => b.id);

  // The renderer needs blank ids "1".."N" in array order and matching placeholders.
  // Build the permutation, then apply it to the story text and both endings.
  const map = new Map<string, string>();
  oldIds.forEach((old, i) => {
    if (i < blanks.length) map.set(old, String(i + 1));
  });
  const needsRemap = oldIds.some((old, i) => i < blanks.length && old !== String(i + 1));
  const normalEnding = str(r.normalEnding ?? r.endingNormal).trim();
  const absurdEnding = str(r.absurdEnding ?? r.endingAbsurd).trim();
  if (needsRemap) {
    text = remap(text, map);
    fixes.push(`"${title}": blank ids renumbered to 1…${blanks.length}.`);
  }
  blanks = blanks.map((b, i) => ({ ...b, id: String(i + 1) }));

  const known = new Set(blanks.map((b) => b.id));
  const used = uniq(placeholderIds(text));
  const missing = blanks.filter((b) => !used.includes(b.id));
  if (missing.length) {
    // A blank nobody can fill would block the story: drop it and its placeholder.
    const drop = new Set(missing.map((b) => b.id));
    blanks = blanks
      .filter((b) => !drop.has(b.id))
      .map((b, i) => ({ ...b, id: String(i + 1) }));
    const renumber = new Map<string, string>();
    uniq(placeholderIds(text)).forEach((id, i) => renumber.set(id, String(i + 1)));
    text = remap(text, renumber);
    fixes.push(`"${title}": removed ${missing.length} unused blank(s).`);
    if (blanks.length < 2) return null;
  }
  const stray = uniq(placeholderIds(text)).filter((id) => !known.has(id) && !/^\d+$/.test(id));
  if (stray.length) fixes.push(`"${title}": ignored unknown placeholders ${stray.map((s) => `{${s}}`).join(", ")}.`);

  const safe = (src: string) => {
    let out = src;
    const ids = uniq(placeholderIds(out));
    ids.forEach((id) => {
      if (!known.has(id)) out = out.replace(new RegExp(`\\{${id}\\}`, "g"), "___");
    });
    return out;
  };

  // branches: optional, each repaired against its own blank list
  const rawBranches = Array.isArray(r.branches) ? r.branches : [];
  const branches: Branch[] = [];
  rawBranches.forEach((b, bi) => {
    if (!b || typeof b !== "object") return;
    const br = b as Record<string, unknown>;
    const label = str(br.label ?? br.choice ?? br.text).trim();
    const beat = str(br.beat ?? br.prompt ?? br.text).trim();
    const bBlanks = repairBlanks(br.blanks, `"${title}" branch ${bi + 1}`, fixes);
    if (!label || !beat || bBlanks.length === 0) return;
    const beatIds = uniq(placeholderIds(beat));
    const usable = bBlanks.filter((bb) => beatIds.includes(bb.id));
    if (usable.length === 0) return;
    branches.push({
      id: str(br.id, `${str(r.id, `story-${index + 1}`)}-branch-${bi + 1}`),
      label,
      beat,
      blanks: usable,
      tone: (["normal", "absurd", "wild"].includes(str(br.tone).toLowerCase())
        ? (str(br.tone).toLowerCase() as Branch["tone"])
        : "normal"),
    });
  });
  if (branches.length > 0 && branches.length < 3) {
    fixes.push(`"${title}": ${branches.length} branch(es) usable — the engine adds its own for the rest.`);
  }

  const cefr = str(r.cefrLevel ?? r.level, learnerLevel).trim().toUpperCase() || learnerLevel;
  const mood = str(r.mood, MOOD_LABELS[0]).trim();
  const theme = str(r.theme, THEME_LABELS[0]).trim();

  return {
    value: {
      id: str(r.id).trim() || `imported-${index + 1}`,
      theme,
      mood,
      cefrLevel: cefr,
      title,
      templateText: text,
      blanks,
      reflectionQuestions: strArray(r.reflectionQuestions ?? r.questions ?? r.reflection).slice(0, 8),
      normalEnding: safe(normalEnding),
      absurdEnding: safe(absurdEnding),
      branches,
    },
    fixes,
  };
}

export interface ParsedMadlibsPack {
  payload: Payload;
  warnings: string[];
}

/**
 * Read a pasted pack. Accepts a bare array, { madlibs: [...] }, { pack: { madlibs } }
 * or anything with a plausible story array, and repairs what it can.
 */
export function parseMadlibsPack(
  json: string,
): { ok: true; pack: ParsedMadlibsPack } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(cleanFences(json));
  } catch (e) {
    return { ok: false, error: `JSON error: ${e instanceof Error ? e.message : "could not parse"}` };
  }

  const root = (data ?? {}) as Record<string, unknown>;
  const nested = (root.pack ?? root) as Record<string, unknown>;
  const list =
    (Array.isArray(data) && (data as unknown[])) ||
    (Array.isArray(root.madlibs) && (root.madlibs as unknown[])) ||
    (Array.isArray(nested.madlibs) && (nested.madlibs as unknown[])) ||
    (Array.isArray(root.stories) && (root.stories as unknown[])) ||
    null;

  if (!list) {
    return { ok: false, error: 'No story array found — ask the AI for the JSON with a "madlibs" array.' };
  }

  const learnerInfo = (root.learnerInfo ?? nested.learnerInfo) as LearnerInfo | undefined;
  const learnerLevel = (learnerInfo?.cefrLevel ?? root.cefrLevel ?? "B1").toString().toUpperCase();

  const warnings: string[] = [];
  const templates: Template[] = [];
  const ids = new Set<string>();

  list.forEach((raw, i) => {
    const repaired = repairTemplate(raw, i, learnerLevel);
    if (!repaired) {
      warnings.push(`Story #${i + 1} could not be repaired and was skipped.`);
      return;
    }
    const t = repaired.value;
    if (ids.has(t.id)) t.id = `${t.id}-${i + 1}`;
    ids.add(t.id);
    if (t.cefrLevel !== learnerLevel) {
      warnings.push(`"${t.title}": level ${t.cefrLevel} != learner's ${learnerLevel}.`);
    }
    if (t.reflectionQuestions.length < 3) {
      warnings.push(`"${t.title}": only ${t.reflectionQuestions.length} reflection question(s).`);
    }
    warnings.push(...repaired.fixes);
    templates.push(t);
  });

  if (templates.length === 0) {
    return { ok: false, error: "None of the stories in that JSON could be played." };
  }
  if (templates.length < 3) {
    warnings.push(`Only ${templates.length} usable story(ies) — the built-in library still plays alongside them.`);
  }

  return { ok: true, pack: { payload: { madlibs: templates, learnerInfo }, warnings } };
}

/** One-line verdict for the setup page's "Load Pack" button. */
export function validateMadlibsJson(json: string): { ok: boolean; message: string } {
  const res = parseMadlibsPack(json);
  // `"error" in res` rather than relying on the discriminant: the root tsconfig runs
  // with strictNullChecks off, where `ok: true | false` literal narrowing does not apply.
  if (!res.ok) return { ok: false, message: "error" in res ? res.error : "Could not read that JSON." };
  const stories = res.pack.payload.madlibs;
  const withBranches = stories.filter((s) => (s.branches ?? []).length >= 2).length;
  const blanks = stories.reduce((n, s) => n + s.blanks.length, 0);
  const warn = res.pack.warnings.length ? ` (${res.pack.warnings.length} fix-ups applied)` : "";
  return {
    ok: true,
    message: `${stories.length} stories · ${blanks} blanks · ${withBranches} with branches${warn}. Press Start!`,
  };
}
