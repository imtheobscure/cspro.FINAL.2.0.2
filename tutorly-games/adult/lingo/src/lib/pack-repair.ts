/**
 * Content-pack auto-repair.
 *
 * The auditor tells you everything that is wrong. Most of it, however, is
 * mechanical: an exercise with two options, an answer that is not among its own
 * options, a "gap" sentence with no gap in it, coverage counters that lie, items
 * the app would silently throw away. Those can be fixed locally, deterministically
 * and without the AI agent, so the pack can go live immediately.
 *
 * This module does exactly that and nothing more:
 *   · drops the entries the app cannot load at all (they are worthless anyway)
 *   · fills missing option sets from the pack's own vocabulary/idioms
 *   · makes sure the answer is always one of its own options
 *   · writes the gap (``______``) into sentences that carry their answer inline
 *   · de-duplicates options and ids
 *   · recomputes meta.coverage so the numbers match the file
 *
 * It never invents content: it only reuses strings that are already in the file,
 * so a repaired pack is still 100% the agent's material.
 */
import { normalizePack } from "@/content/tutolingo";

export interface RepairNote {
  section: string;
  where: string;
  action: string;
}

export interface RepairResult {
  /** Ready-to-publish JSON (what the app will actually load), pretty-printed. */
  json: string;
  /** Repaired raw pack (normalised), for further inspection. */
  pack: Record<string, unknown>;
  notes: RepairNote[];
  changed: number;
  /** Items that could not be repaired locally and still need the AI agent. */
  remaining: string[];
}

/* ---------------------------- text coercion -------------------------------- */

/**
 * Turn the text an AI agent usually produces (fences, prose around the object,
 * smart quotes, trailing commas) into something `JSON.parse` accepts, and report
 * every adjustment made along the way.
 */
export function coercePackText(input: string): { value: unknown; adjustments: string[] } {
  const adjustments: string[] = [];
  let text = input.replace(/^\uFEFF/, "").trim();

  // 1. Markdown code fences.
  const fenced = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fenced) {
    text = fenced[1].trim();
    adjustments.push("Removed the markdown code fence (```) around the JSON.");
  }

  // 2. Prose before the first `{` / after the last `}`.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start > 0 || (end !== -1 && end < text.length - 1)) {
    if (start !== -1 && end > start) {
      text = text.slice(start, end + 1);
      adjustments.push("Removed the prose/commentary around the JSON object.");
    }
  }

  // 3. Smart quotes and other typographic look-alikes.
  if (/[\u201C\u201D\u201E\u201F\u2018\u2019\u201A\u201B]/.test(text)) {
    text = text
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'");
    adjustments.push("Replaced curly/smart quotes with straight quotes.");
  }
  if (text.includes("\u2026")) {
    text = text.replace(/\u2026/g, "...");
    adjustments.push("Replaced the “…” ellipsis character with three dots.");
  }

  // 4. Trailing commas before a closing brace/bracket.
  const withoutTrailing = text.replace(/,(\s*[}\]])/g, "$1");
  if (withoutTrailing !== text) {
    text = withoutTrailing;
    adjustments.push("Removed trailing comma(s) before a closing bracket.");
  }

  return { value: JSON.parse(text), adjustments };
}

/* ------------------------------- helpers ---------------------------------- */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const lc = (v: string) => v.toLowerCase();

/** A hint of a gap: two or more underscores, or an empty bracket / brace pair. */
const GAP_RE = /_{2,}|\[\s*\]|\{\{\s*\}\}/;
const shorten = (s: string, n = 42) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Deterministic PRNG (same pack → same repairs, every reload). */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function shuffle<T>(list: T[], seed: string): T[] {
  const out = [...list];
  let s = hash(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Insert the gap marker where the answer appears inline. */
function blankOut(text: string, answer: string): { text: string; changed: boolean } {
  if (GAP_RE.test(text)) return { text, changed: false };
  if (/\?/.test(text)) return { text, changed: false };
  const a = str(answer);
  if (!a) return { text, changed: false };
  const re = new RegExp(`(?<![\\w])${escapeRe(a)}(?![\\w])`, "i");
  if (!re.test(text)) return { text, changed: false };
  return { text: text.replace(re, "______"), changed: true };
}

/**
 * Produce an option set of at least `min` entries that always contains `answer`.
 * Distractors come only from the pack's own pool. Returns null when even the
 * answer itself is unusable.
 */
function repairOptions(options: unknown, answer: string, pool: string[], seed: string, min = 4): { options: string[]; changed: boolean } | null {
  const answerText = str(answer);
  if (!answerText) return null;
  const seen = new Set<string>();
  const opts: string[] = [];
  let changed = false;

  for (const o of arr(options)) {
    const t = str(o);
    if (!t || seen.has(lc(t))) {
      if (t) changed = true; // dropped a duplicate
      continue;
    }
    seen.add(lc(t));
    opts.push(t);
  }
  if (opts.length !== arr(options).length) changed = true;

  if (!seen.has(lc(answerText))) {
    opts.push(answerText);
    seen.add(lc(answerText));
    changed = true;
  }

  if (opts.length < min) {
    const candidates = shuffle(pool.filter((p) => p && !seen.has(lc(p))), seed);
    for (const c of candidates) {
      if (opts.length >= min) break;
      seen.add(lc(c));
      opts.push(c);
      changed = true;
    }
  }

  if (opts.length < 2) return null;
  if (changed) return { options: shuffle(opts, seed), changed: true };
  return { options: opts, changed: false };
}

/* --------------------------------- pool ----------------------------------- */

/** Collect short target-language strings already present in the pack. */
function buildPool(pack: Record<string, unknown>): string[] {
  const out = new Set<string>();
  const add = (v: unknown) => {
    const t = str(v);
    // Keep only plausible, displayable answers: 2–30 chars, no newlines, not a placeholder.
    if (t.length >= 2 && t.length <= 30 && !/[\n]/.test(t) && !/^\.+$/.test(t) && !/^[-–—•*]+$/.test(t)) out.add(t);
  };

  for (const v of arr(pack.vocabulary)) if (isObj(v)) add(v.term ?? v.word ?? v.english);
  for (const i of arr(pack.idioms)) if (isObj(i)) add(i.expression ?? i.english ?? i.phrase);
  for (const g of arr(pack.grammar)) {
    if (!isObj(g)) continue;
    for (const e of arr(g.exercises)) if (isObj(e)) {
      add(e.answer);
      for (const o of arr(e.options)) add(o);
    }
  }
  const ab = isObj(pack.activities) ? pack.activities : {};
  for (const key of ["fillBlank", "listenSelect", "tapComplete"]) {
    for (const item of arr((ab as Record<string, unknown>)[key])) if (isObj(item)) {
      add(item.answer);
      for (const o of arr(item.options)) add(o);
    }
  }
  return [...out];
}

/* -------------------------------- repair ---------------------------------- */

export function repairPack(raw: unknown): RepairResult {
  const notes: RepairNote[] = [];
  const remaining: string[] = [];
  let changed = 0;
  const note = (section: string, where: string, action: string) => {
    notes.push({ section, where, action });
    changed++;
  };

  if (!isObj(raw)) {
    return {
      json: JSON.stringify(normalizePack(null), null, 2),
      pack: normalizePack(null) as unknown as Record<string, unknown>,
      notes,
      changed: 0,
      remaining: ["The file is not a JSON object — paste the agent's answer again."],
    };
  }

  // Deep clone so the caller's data is untouched.
  const pack = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  const pool = buildPool(pack);

  /* ---- vocabulary: drop entries with no term ----------------------------- */
  if (Array.isArray(pack.vocabulary)) {
    const vocabRaw = pack.vocabulary as Record<string, unknown>[];
    const before = vocabRaw.length;
    const vocab = vocabRaw.filter((v) => isObj(v) && (str(v.term) || str(v.word) || str(v.english)));
    pack.vocabulary = vocab;
    if (vocab.length !== before) note("vocabulary", `${before - vocab.length} item(s)`, "Removed entries with no term — the app cannot display them.");
    vocab.forEach((v, i) => {
      if (!str(v.translation) && !(isObj(v.example) && str(v.example.native))) {
        remaining.push(`vocabulary[${i}] “${shorten(str(v.term))}” — add the L1 translation (only the AI agent can).`);
      }
    });
  }

  /* ---- grammar: drop empty topics, repair exercises ---------------------- */
  if (Array.isArray(pack.grammar)) {
    const topics: Record<string, unknown>[] = [];
    arr(pack.grammar).forEach((g, gi) => {
      if (!isObj(g)) return;
      const title = str(g.title) || str(g.topic);
      const rule = str(g.rule) || str(g.explanation) || str(g.nativeRule);
      if (!title || !rule) {
        note("grammar", `grammar[${gi}]`, "Removed a topic with no title or no rule.");
        return;
      }
      const keptExercises: Record<string, unknown>[] = [];
      arr(g.exercises).forEach((e, ei) => {
        if (!isObj(e)) return;
        const where = `grammar[${gi}].exercises[${ei}]`;
        let prompt = str(e.prompt) || str(e.question) || str(e.sentence);
        const answer = str(e.answer);
        if (!prompt || !answer) {
          note("grammar", where, "Removed an exercise with no prompt or no answer.");
          return;
        }
        // blank the gap if the answer sits inline and there is no gap marker
        const b = blankOut(prompt, answer);
        if (b.changed) {
          prompt = b.text;
          note("grammar", where, `Wrote the gap: “${shorten(prompt)}”.`);
        }
        const fixed = repairOptions(e.options, answer, pool, `g${gi}-${ei}-${answer}`);
        if (!fixed) {
          note("grammar", where, "Removed an exercise whose answer is unusable.");
          return;
        }
        if (fixed.changed) note("grammar", where, `Filled the option set to ${fixed.options.length} (answer included).`);
        keptExercises.push({ ...e, prompt, options: fixed.options, answer });
      });
      if (keptExercises.length === 0) remaining.push(`grammar[${gi}] “${shorten(title)}” has no usable exercises — the AI agent should add 4.`);
      else if (keptExercises.length < 4) remaining.push(`grammar[${gi}] “${shorten(title)}” has only ${keptExercises.length} exercise(s); 4+ is the intended size.`);
      topics.push({ ...g, title, rule, exercises: keptExercises });
    });
    pack.grammar = topics;
  }

  /* ---- idioms: drop entries with no expression/meaning ------------------- */
  if (Array.isArray(pack.idioms)) {
    const idiomsRaw = pack.idioms as Record<string, unknown>[];
    const before = idiomsRaw.length;
    const idioms = idiomsRaw.filter((x) => isObj(x) && (str(x.expression) || str(x.english) || str(x.phrase)) && (str(x.meaning) || str(x.definition) || str(x.nativeMeaning)));
    pack.idioms = idioms;
    if (idioms.length !== before) note("idioms", `${before - idioms.length} item(s)`, "Removed expressions with no expression or no meaning.");
    idioms.forEach((x, i) => {
      if (!str(x.nativeMeaning)) remaining.push(`idioms[${i}] “${shorten(str(x.expression))}” — add the L1 meaning.`);
    });
  }

  /* ---- conversations: drop empty, drop blank turns ----------------------- */
  if (Array.isArray(pack.conversations)) {
    const convos: Record<string, unknown>[] = [];
    arr(pack.conversations).forEach((c, ci) => {
      if (!isObj(c)) return;
      const rawTurns = arr(c.turns).length ? arr(c.turns) : arr(c.dialogue);
      const turns = rawTurns.filter((t) => isObj(t) && (str(t.target) || str(t.text) || str(t.english)));
      if (rawTurns.length !== turns.length) note("conversations", `conversations[${ci}]`, `Removed ${rawTurns.length - turns.length} turn(s) with no line.`);
      if (!str(c.title) && turns.length === 0) {
        note("conversations", `conversations[${ci}]`, "Removed a conversation with no title and no lines.");
        return;
      }
      if (turns.length > 0 && turns.length < 6) remaining.push(`conversations[${ci}] “${shorten(str(c.title))}” has only ${turns.length} turns; 6+ reads better.`);
      convos.push({ ...c, title: str(c.title) || `Conversation ${ci + 1}`, turns });
    });
    pack.conversations = convos;
  }

  /* ---- sentences: drop empty, wrap bare strings -------------------------- */
  if (Array.isArray(pack.sentences)) {
    const sentences: Record<string, unknown>[] = [];
    arr(pack.sentences).forEach((s, si) => {
      if (typeof s === "string") {
        if (str(s)) sentences.push({ id: si + 1, target: str(s) });
        else note("sentences", `sentences[${si}]`, "Removed an empty sentence.");
        return;
      }
      if (!isObj(s)) return;
      const target = str(s.target) || str(s.sentence) || str(s.english);
      if (!target) {
        note("sentences", `sentences[${si}]`, "Removed a sentence with no text.");
        return;
      }
      sentences.push({ ...s, target });
    });
    pack.sentences = sentences;
  }

  /* ---- activity bank: blank gaps, repair option sets --------------------- */
  if (isObj(pack.activities)) {
    const ab = pack.activities as Record<string, unknown>;
    const bank = (key: string) => arr(ab[key]).filter(isObj) as Record<string, unknown>[];

    // fillBlank — the gap must exist and the answer must be one of the options.
    ab.fillBlank = bank("fillBlank")
      .map((m, i) => {
        const where = `activities.fillBlank[${i}]`;
        let sentence = str(m.sentence) || str(m.prompt);
        const answer = str(m.answer);
        if (!sentence || !answer) {
          note("activities", where, "Removed an item with no sentence or no answer.");
          return null;
        }
        const b = blankOut(sentence, answer);
        if (b.changed) {
          sentence = b.text;
          note("activities", where, `Wrote the gap: “${shorten(sentence)}”.`);
        }
        const fixed = repairOptions(m.options, answer, pool, `fb${i}-${answer}`);
        if (fixed?.changed) note("activities", where, `Filled the option set to ${fixed.options.length}.`);
        return { ...m, sentence, answer, options: fixed?.options };
      })
      .filter(Boolean);

    // listenSelect / tapComplete — answer must be tappable.
    for (const key of ["listenSelect", "tapComplete"]) {
      ab[key] = bank(key)
        .map((m, i) => {
          const where = `activities.${key}[${i}]`;
          const answer = str(m.answer);
          const prompt = str(m.prompt) || str(m.sentence) || answer;
          if (!answer) {
            note("activities", where, "Removed an item with no answer.");
            return null;
          }
          const fixed = repairOptions(m.options, answer, pool, `${key}${i}-${answer}`);
          if (!fixed) {
            note("activities", where, "Removed an item whose answer is unusable.");
            return null;
          }
          if (fixed.changed) note("activities", where, `Filled the option set to ${fixed.options.length}.`);
          return { ...m, prompt, answer, options: fixed.options };
        })
        .filter(Boolean);
    }

    // matchPairs / reorder / typeHear / speak — drop pairs that carry no content.
    ab.matchPairs = arr(ab.matchPairs)
      .filter(isObj)
      .map((m) => ({ ...m, pairs: arr(m.pairs).filter((p) => isObj(p) && (str(p.target) || str(p.text) || str(p.en))) }))
      .filter((m) => m.pairs.length >= 2);
  }

  /* ---- meta.coverage: make the numbers tell the truth -------------------- */
  const meta = isObj(pack.meta) ? pack.meta : {};
  const counts = {
    vocabularyCount: arr(pack.vocabulary).length,
    grammarCount: arr(pack.grammar).length,
    idiomCount: arr(pack.idioms).length,
    conversationCount: arr(pack.conversations).length,
    sentenceCount: arr(pack.sentences).length,
  };
  const coverage = isObj(meta.coverage) ? meta.coverage : {};
  const stale = Object.entries(counts).filter(([k, v]) => Number(coverage[k] ?? 0) !== v);
  if (stale.length) note("meta", "coverage", `Recomputed the counters to match the file: ${Object.entries(counts).map(([k, v]) => `${k.replace(/Count$/, "")} ${v}`).join(", ")}.`);
  pack.meta = {
    ...meta,
    app: "Lingo",
    version: str(meta.version) || "1.0",
    coverage: { ...coverage, ...counts },
  };

  /* ---- final pass: exactly what the app will load ------------------------ */
  const normalised = normalizePack(pack);
  return {
    json: JSON.stringify(normalised, null, 2),
    pack: normalised as unknown as Record<string, unknown>,
    notes,
    changed,
    remaining,
  };
}
