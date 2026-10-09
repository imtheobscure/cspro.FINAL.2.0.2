import type {
  AccountData,
  Audit,
  AuditAction,
  CraftedMessage,
  FollowUp,
  Goal,
  LogEntry,
  Plan90,
  PlanWeek,
  Snapshot,
  SubScore,
  SuperTutorCheck,
  Swot,
  Tutor,
  VideoScript,
} from "../types";

/**
 * The single door between "whatever the AI replied" and the app's types.
 *
 * Every paste-back flow goes through here. Two rules:
 *
 * 1. **Never lose data.** If the AI answered in the shape the prompt asked for, it
 *    lands. If it answered in a plausible variation — a string where an object was
 *    expected, an object where an array was expected, `video_scripts` instead of
 *    `videoScripts`, an array of plain strings instead of `{plain, pronunciation}`
 *    objects — it still lands. This is the bug that made video scripts come back
 *    empty: the model returned `["Hi, I'm…", "Hello…"]` and a `.map(s => s.plain)`
 *    turned every script into an empty box, silently.
 * 2. **Report what happened.** `normalize*` returns a filled object, and
 *    `describeChanges()` turns the raw input into a human summary ("4 filled · 3
 *    ignored: rating_notes…"), so a mismatch is visible instead of mysterious.
 */

/* ------------------------------------------------------------- raw reading -- */

/** Look up a key ignoring case, spaces, underscores and hyphens. */
function pick(source: unknown, ...names: string[]): unknown {
  if (!source || typeof source !== "object") return undefined;
  const obj = source as Record<string, unknown>;
  const wanted = names.map((n) => n.toLowerCase().replace(/[\s_-]/g, ""));
  for (const key of Object.keys(obj)) {
    if (wanted.includes(key.toLowerCase().replace(/[\s_-]/g, ""))) return obj[key];
  }
  return undefined;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

export function asString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => asString(v)).filter(Boolean).join("\n");
  if (isPlainObject(value)) {
    // An object where text was expected: keep every leaf, labelled, rather than "[object Object]".
    return Object.entries(value)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${label(k)}\n${asString(v)}`)
      .join("\n\n");
  }
  return String(value);
}

/** "introduceYourself" / "introduce_yourself" → "Introduce yourself". */
function label(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    // "$1,250.50 / week" → 1250.5
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "yes", "y", "met", "pass", "passed", "achieved", "done", "1"].includes(v)) return true;
    if (["false", "no", "n", "unmet", "fail", "failed", "missing", "0", ""].includes(v)) return false;
  }
  return fallback;
}

/** A list of strings from: string, string[], {a: string}, or objects with a text-ish key. */
export function asStringArray(value: unknown): string[] {
  if (value == null || value === "") return [];
  if (typeof value === "string") return splitTextList(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (isPlainObject(item)) {
          const text = pick(item, "text", "title", "name", "value", "label", "tip", "action", "detail", "description", "item");
          if (text != null) {
            const rest = Object.entries(item)
              .filter(([k]) => !/^(text|title|name|value|label|tip|action|detail|description|item)$/i.test(k))
              .map(([k, v]) => `${label(k)}: ${asString(v)}`)
              .filter((s) => !s.endsWith(": "));
            return rest.length ? `${asString(text)} (${rest.join(" · ")})` : asString(text);
          }
          return asString(item);
        }
        return asString(item);
      })
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (isPlainObject(value)) {
    // {1: "…", 2: "…"} or {strength1: "…"}
    return Object.values(value).flatMap((v) => asStringArray(v)).filter(Boolean);
  }
  return [asString(value)];
}

/**
 * A field that should be one string but may arrive as a nested section object.
 *
 * The account-creation prompt asks for the description split into
 * "Introduce Yourself / Teaching Experience / Motivate Learners". Some models send
 * that as three keys instead of one string — both must render as the real
 * description, not as `[object Object]` or as nothing at all.
 */
/**
 * One string that may actually be a short list.
 *
 * "IELTS, Business English" is a list; "Retention is strong, and students stay"
 * is a sentence. Newlines always split. Commas and semicolons split only when the
 * result looks like a list: a handful of short parts and no sentence punctuation at
 * the end. That heuristic keeps "specialties" working without chopping prose in half.
 */
const CONTINUATION = /^(and|but|or|so|which|that|because|then|when|while|with|for|if|as)\b/i;

function splitTextList(value: string): string[] {
  const text = value.trim();
  if (!text) return [];
  const lines = text
    .split(/\n+/)
    .map((s) => s.replace(/^[-•*\d.\s]+/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  if (/[.!?]$/.test(text)) return [text];
  const parts = text.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  const looksLikeAList =
    parts.length >= 2 && parts.length <= 6 && parts.every((p) => p.length <= 32) && !parts.slice(1).some((p) => CONTINUATION.test(p));
  return looksLikeAList ? parts : [text];
}

function asRichText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => asString(v)).filter(Boolean).join("\n\n");
  if (isPlainObject(value)) {
    // Already has a single obvious body?
    const body = pick(value, "text", "content", "description", "body", "value");
    if (typeof body === "string" && body.trim()) return body;
    return Object.entries(value)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${label(k)}\n_________________________\n${asString(v)}`)
      .join("\n\n");
  }
  return asString(value);
}

/* -------------------------------------------------------------- json parse -- */

export interface ParsedJson {
  ok: boolean;
  value?: unknown;
  error?: string;
  /** True when the text arrived wrapped in ```json fences or prose. */
  cleaned: boolean;
}

/**
 * Parse an AI reply that is *supposed* to be JSON.
 *
 * Handles the three things models actually do: wrap it in ```json fences, add a
 * sentence of preamble ("Here is the JSON:"), or leave a trailing comma.
 */
export function parseAiJson(text: string): ParsedJson {
  const original = text ?? "";
  let body = original.trim();
  let cleaned = false;

  if (body.startsWith("```")) {
    body = body.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "");
    cleaned = true;
  }
  // Curly quotes inside keys break JSON.parse and are a common paste artefact.
  const deSmart = body.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'");
  if (deSmart !== body) cleaned = true;
  body = deSmart;

  const attempt = (candidate: string) => {
    try {
      return JSON.parse(candidate);
    } catch {
      // Trailing commas before } or ] are the single most common AI slip.
      try {
        return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1"));
      } catch {
        return undefined;
      }
    }
  };

  const direct = attempt(body);
  if (direct !== undefined) return { ok: true, value: direct, cleaned };

  // Fall back to the outermost {...} or [...] in the text, scanning from the first
  // opening brace and keeping braces balanced while ignoring those inside strings.
  const start = body.search(/[[{]/);
  if (start >= 0) {
    const openChar = body[start];
    const closeChar = openChar === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < body.length; i++) {
      const ch = body[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === openChar) depth++;
      else if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          const sliced = attempt(body.slice(start, i + 1));
          if (sliced !== undefined) return { ok: true, value: sliced, cleaned: true };
          break;
        }
      }
    }
  }

  return { ok: false, error: "No valid JSON found in the pasted text.", cleaned };
}

/* --------------------------------------------------------------- account -- */

const EMOJI_LABELS: [RegExp, string][] = [
  [/^✨\s*/, "Headlines"],
  [/^✍️?\s*/, "Description"],
  [/^🎬\s*/, "Video scripts"],
];

const stripLabel = (s: string) => {
  let out = s;
  for (const [re] of EMOJI_LABELS) out = out.replace(re, "");
  return out.trim();
};

/**
 * Video scripts, from any shape a model might send.
 *
 * Accepted: `["script text", …]`, `[{plain, pronunciation}, …]`,
 * `[{script, guide}]`, `{plain: "…", pronunciation: "…"}`, `"one script"`,
 * `{"script1": "…", "script2": "…"}`, or `{videoScripts: […]}` wrappers.
 */
export function normalizeVideoScripts(value: unknown): VideoScript[] {
  if (value == null || value === "") return [];
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((entry) => {
    if (entry == null) return [];
    if (typeof entry === "string") {
      const text = entry.trim();
      return text ? [{ plain: text, pronunciation: "" }] : [];
    }
    if (isPlainObject(entry)) {
      // A wrapper like {videoScripts: [...]} or {scripts: [...]}
      const nested = pick(entry, "scripts", "videScripts", "videoScripts", "options", "items");
      if (Array.isArray(nested)) return normalizeVideoScripts(nested);

      const plain = pick(entry, "plain", "plainText", "script", "text", "body", "content", "english", "full");
      const pronunciation = pick(entry, "pronunciation", "pronunciationGuide", "phonetic", "stress", "guide", "phonetics");
      const prompt = pick(entry, "prompt", "title", "name", "label", "option");
      const hasBody = plain != null && asString(plain).trim() !== "";
      if (!hasBody) {
        // Nothing recognizable at the top level. Models write {"script1": "…",
        // "script2": "…"} often enough that each value becomes its own script rather
        // than all of them being glued into one.
        const values = Object.values(entry)
          .map((v) => asString(v).trim())
          .filter(Boolean);
        return values.map((plain) => ({ plain, pronunciation: "" }));
      }
      const prefix = prompt && !/^script\s*\d+$/i.test(asString(prompt)) ? `${stripLabel(asString(prompt))}\n\n` : "";
      return [{ plain: prefix + asString(plain), pronunciation: asString(pronunciation) }];
    }
    return [];
  });
}

/**
 * Account content from a pasted account-creation reply.
 *
 * Key aliases are matched case- and separator-insensitively, so
 * `years_of_experience`, `YearsOfExperience` and `yearsOfExperience` all land.
 */
export function normalizeAccount(patch: unknown): Partial<AccountData> {
  const out: Partial<AccountData> = {};
  if (!isPlainObject(patch)) return out;

  const headlines = asStringArray(pick(patch, "headlines", "headline", "titles", "title", "profileHeadlines"))
    .flatMap((h) => (h.includes("\n") ? h.split("\n") : [h]))
    .map((h) => h.replace(/^[-•*\d.\s]+/, "").replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
  if (headlines.length) out.headlines = headlines;

  const description = asRichText(pick(patch, "description", "about", "aboutMe", "profileDescription", "bio", "summary"));
  if (description.trim()) out.description = description.trim();

  const scripts = normalizeVideoScripts(
    pick(patch, "videoScripts", "videoScript", "videScripts", "scripts", "video", "videos"),
  );
  if (scripts.length) out.videoScripts = scripts;

  const years = pick(patch, "yearsOfExperience", "yearsExperience", "experience", "years", "experienceYears");
  if (years != null) out.yearsOfExperience = asNumber(years);

  const subjectsRaw = pick(patch, "subjects", "specialties", "tutoringSubjects", "courses");
  if (subjectsRaw != null) {
    const subjects = (Array.isArray(subjectsRaw) ? subjectsRaw : [subjectsRaw]).flatMap((s) => {
      if (typeof s === "string") return [{ name: s, description: "" }];
      if (isPlainObject(s)) {
        const name = asString(pick(s, "name", "subject", "title", "label"));
        const description = asString(pick(s, "description", "detail", "text", "why", "pitch", "body"));
        if (!name && !description) return [];
        return [{ name: name || label(description.slice(0, 40)), description }];
      }
      return [];
    });
    if (subjects.length) out.subjects = subjects;
  }

  const levels = pick(patch, "proficiencyLevels", "levels", "studentLevels", "proficiency");
  if (levels != null) out.proficiencyLevels = asStringArray(levels);

  const ages = pick(patch, "ageGroups", "ages", "studentAgeGroups", "age");
  if (ages != null) out.ageGroups = asStringArray(ages);

  const certs = pick(patch, "certificates", "certifications", "certificate");
  if (certs != null) out.certificates = asStringArray(certs);

  const specialties = pick(patch, "specialties", "specialty", "niches");
  if (specialties != null) out.specialties = asStringArray(specialties);

  const hours = pick(patch, "availabilityHours", "hoursPerWeek", "availableHours", "availability");
  if (hours != null && asNumber(hours) > 0) out.availabilityHours = asNumber(hours);

  const price = pick(patch, "priceUsd", "price", "hourlyRate", "rate", "pricePerHour");
  if (price != null && asNumber(price) > 0) out.priceUsd = asNumber(price);

  const photo = pick(patch, "photo", "photoUrl", "avatar", "image", "photoBase64");
  if (typeof photo === "string" && photo.trim()) out.photo = photo.trim();

  // Anything recognizable that has no fixed home is kept rather than thrown away.
  // Keys are matched the same lenient way the lookups above work, so
  // `video_scripts` is recognized as the script field rather than landing in "extra".
  const known = new Set(
    [
      "headlines",
      "headline",
      "titles",
      "title",
      "profileHeadlines",
      "description",
      "about",
      "aboutMe",
      "profileDescription",
      "bio",
      "summary",
      "videoScripts",
      "videoScript",
      "videScripts",
      "scripts",
      "video",
      "videos",
      "yearsOfExperience",
      "yearsExperience",
      "experience",
      "years",
      "experienceYears",
      "subjects",
      "specialties",
      "tutoringSubjects",
      "courses",
      "proficiencyLevels",
      "levels",
      "studentLevels",
      "proficiency",
      "ageGroups",
      "ages",
      "studentAgeGroups",
      "age",
      "certificates",
      "certifications",
      "certificate",
      "availabilityHours",
      "hoursPerWeek",
      "availableHours",
      "availability",
      "priceUsd",
      "price",
      "hourlyRate",
      "rate",
      "pricePerHour",
      "photo",
      "photoUrl",
      "avatar",
      "image",
      "photoBase64",
    ].map((k) => k.toLowerCase().replace(/[\s_-]/g, "")),
  );
  const extra: Record<string, string> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (known.has(key.toLowerCase().replace(/[\s_-]/g, ""))) continue;
    const text = asString(value);
    if (text.trim()) extra[label(key)] = text.trim();
  }
  if (Object.keys(extra).length) out.extra = extra;

  return out;
}

/* ----------------------------------------------------------------- audit -- */

const KNOWN_SUBSCORES = "photo|video|description|availability|pricing|certificates|specialties|experience|reviews|response".split("|");

export function normalizeAudit(patch: unknown): Omit<Audit, "id" | "at"> | null {
  if (!isPlainObject(patch)) return null;
  const root = isPlainObject(pick(patch, "audit", "report", "analysis")) ? (pick(patch, "audit", "report", "analysis") as Record<string, unknown>) : patch;

  const powerScore = asNumber(
    pick(root, "powerScore", "profilePowerScore", "profile_power_score", "score", "total", "overallScore"),
  );
  const successProbability = asNumber(
    pick(root, "successProbability", "successProbabilityIndex", "spi", "probability", "bookingProbability"),
  );

  const subRaw = pick(root, "subScores", "subscores", "criteria", "breakdown", "sections");
  const subScores: SubScore[] = [];
  if (Array.isArray(subRaw)) {
    for (const item of subRaw) {
      if (!isPlainObject(item)) continue;
      const key = asString(pick(item, "key", "id", "criterion", "name", "label")) || "criterion";
      subScores.push({
        key,
        label: titleCase(asString(pick(item, "label", "name", "criterion", "title")) || label(key)),
        score: clamp(asNumber(pick(item, "score", "value", "points", "subScore")), 0, 100),
        weight: asNumber(pick(item, "weight", "importance"), 1) || 1,
        tip: asString(pick(item, "tip", "advice", "improvement", "recommendation", "note", "feedback")),
      });
    }
  } else if (isPlainObject(subRaw)) {
    for (const [key, value] of Object.entries(subRaw)) {
      if (isPlainObject(value)) {
        subScores.push({
          key,
          label: label(key),
          score: clamp(asNumber(pick(value, "score", "value", "points")), 0, 100),
          weight: asNumber(pick(value, "weight"), 1) || 1,
          tip: asString(pick(value, "tip", "advice", "note", "feedback")),
        });
      } else if (typeof value === "number") {
        subScores.push({ key, label: label(key), score: clamp(value, 0, 100), weight: 1, tip: "" });
      }
    }
  }

  const actionsRaw = pick(root, "actions", "nextActions", "topActions", "recommendations");
  const actions: AuditAction[] = asStringArray(actionsRaw).map((text) => {
    const match = text.match(/^(.*?)\s*\(([^)]*)\)$/);
    return { title: match ? match[1] : text, why: match ? match[2] : "", how: "", impact: "" };
  });
  // Richer shape wins when present.
  if (Array.isArray(actionsRaw)) {
    actionsRaw.forEach((item, i) => {
      if (!isPlainObject(item)) return;
      actions[i] = {
        title: asString(pick(item, "title", "action", "name", "text")) || actions[i]?.title || `Action ${i + 1}`,
        why: asString(pick(item, "why", "reason", "rationale", "impact")),
        how: asString(pick(item, "how", "steps", "detail", "method")),
        impact: asString(pick(item, "impact", "priority", "level")),
      };
    });
  }

  const superRaw = pick(root, "superTutor", "superTutorCheck", "superTutorCriteria", "keysToSuccess", "successMonitor");
  const superTutor: SuperTutorCheck[] = [];
  if (Array.isArray(superRaw)) {
    for (const item of superRaw) {
      if (!isPlainObject(item)) continue;
      superTutor.push({
        criterion: asString(pick(item, "criterion", "name", "label", "key")),
        met: asBoolean(pick(item, "met", "passed", "achieved", "ok", "status")),
        value: asString(pick(item, "value", "actual", "current", "now")),
        target: asString(pick(item, "target", "required", "goal", "threshold")),
      });
    }
  } else if (isPlainObject(superRaw)) {
    for (const [key, value] of Object.entries(superRaw)) {
      if (isPlainObject(value)) {
        superTutor.push({
          criterion: asString(pick(value, "criterion", "name", "label")) || label(key),
          met: asBoolean(pick(value, "met", "passed", "achieved", "status")),
          value: asString(pick(value, "value", "actual", "current")),
          target: asString(pick(value, "target", "required", "goal")),
        });
      } else {
        superTutor.push({ criterion: label(key), met: asBoolean(value), value: asString(value), target: "" });
      }
    }
  }

  const sourcesRaw = pick(root, "sources", "references", "citations", "links");
  const sources = asStringArray(sourcesRaw).map((s) => {
    const urlMatch = s.match(/https?:\/\/\S+/);
    return { title: s.replace(/https?:\/\/\S+/, "").replace(/[()]/g, "").trim(), url: urlMatch ? urlMatch[0] : "" };
  });

  const summary = asString(pick(root, "summary", "verdict", "conclusion", "overview"));

  if (!subScores.length && !powerScore && !summary) return null;

  return {
    powerScore: clamp(powerScore || Math.round(subScores.reduce((a, s) => a + s.score, 0) / Math.max(1, subScores.length)), 0, 100),
    successProbability: clamp(successProbability, 0, 100),
    subScores,
    strengths: asStringArray(pick(root, "strengths", "whatWorks")),
    weaknesses: asStringArray(pick(root, "weaknesses", "whatToFix", "gaps")),
    actions: actions.slice(0, 5),
    superTutor,
    summary,
    sources,
  };
}

/** A stable key set so two audits of the same tutor line up in the chart. */
export function auditCriteria(audit: Audit | undefined): string[] {
  if (!audit) return [];
  const found = audit.subScores.map((s) => s.key);
  const known = KNOWN_SUBSCORES.filter((k) => found.includes(k));
  return [...known, ...found.filter((k) => !known.includes(k))];
}

/* ------------------------------------------------------------- snapshots -- */

export function normalizeSnapshot(patch: unknown, weekOf?: string): Partial<Snapshot> {
  if (!isPlainObject(patch)) return {};
  const out: Partial<Snapshot> = {};
  const week = weekOf ?? asString(pick(patch, "weekOf", "week", "date", "period"));
  if (week) out.weekOf = week;
  const earnings = pick(patch, "earningsUsd", "earnings", "income", "revenue", "totalIncome");
  if (earnings != null) out.earningsUsd = asNumber(earnings);
  const lessons = pick(patch, "lessons", "lessonsTaught", "classes", "totalLessons");
  if (lessons != null) out.lessons = asNumber(lessons);
  const trials = pick(patch, "trials", "trialLessons", "trialsBooked");
  if (trials != null) out.trials = asNumber(trials);
  const converted = pick(patch, "trialsConverted", "conversions", "trialsWon", "converted");
  if (converted != null) out.trialsConverted = asNumber(converted);
  const active = pick(patch, "activeStudents", "active", "students");
  if (active != null) out.activeStudents = asNumber(active);
  const fresh = pick(patch, "newStudents", "new", "newLearners");
  if (fresh != null) out.newStudents = asNumber(fresh);
  const rating = pick(patch, "rating", "averageRating", "stars");
  if (rating != null) out.rating = asNumber(rating);
  const response = pick(patch, "responseHours", "responseTime", "avgResponseHours", "response");
  if (response != null) out.responseHours = asNumber(response);
  const cancels = pick(patch, "cancellations", "cancelled", "cancelRate");
  if (cancels != null) out.cancellations = asNumber(cancels);
  const notes = pick(patch, "notes", "note", "comment");
  if (notes != null) out.notes = asString(notes);
  return out;
}

/* ------------------------------------------------------------------ comms -- */

export function normalizeLog(patch: unknown, raw = ""): Partial<LogEntry> {
  const wrapped = pick(patch, "entry", "analysis", "result");
  const root = isPlainObject(wrapped) ? (wrapped as Record<string, unknown>) : (patch as Record<string, unknown>);
  if (!isPlainObject(root)) return {};
  const swotRaw = pick(root, "swot", "swotAnalysis");
  const swot: Swot = {
    strengths: isPlainObject(swotRaw) ? asStringArray(pick(swotRaw, "strengths", "s")) : [],
    weaknesses: isPlainObject(swotRaw) ? asStringArray(pick(swotRaw, "weaknesses", "w")) : [],
    opportunities: isPlainObject(swotRaw) ? asStringArray(pick(swotRaw, "opportunities", "o")) : [],
    threats: isPlainObject(swotRaw) ? asStringArray(pick(swotRaw, "threats", "t")) : [],
  };
  /**
   * Follow-ups, in both shapes.
   *
   * The contract asks for `[{text, dueAt}]`, and models send exactly that — but the
   * parser used to flatten every entry through `asStringArray`, which turned
   * `{"text": "Ask about the ticket", "dueAt": "2026-09-19"}` into the literal string
   * "Ask about the ticket (Due At: 2026-09-19)" with **no due date**. A follow-up with
   * no due date never shows as overdue, so the reminder the mentor relies on quietly
   * disappeared. Objects keep their date now; plain strings still work.
   */
  const followRaw = pick(root, "followUps", "followups", "followUp", "nextSteps", "todos");
  const followUps: FollowUp[] = [];
  if (Array.isArray(followRaw)) {
    followRaw.forEach((item, i) => {
      if (isPlainObject(item)) {
        const text = asString(pick(item, "text", "task", "action", "item", "what", "title", "followUp")).trim();
        if (!text) return;
        followUps.push({
          id: `fu_${Date.now()}_${i}`,
          text,
          dueAt: isoDate(asString(pick(item, "dueAt", "due", "date", "deadline", "by"))),
          done: asBoolean(pick(item, "done", "completed"), false),
        });
        return;
      }
      for (const text of asStringArray(item)) {
        const due = text.match(/due[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
        followUps.push({
          id: `fu_${Date.now()}_${i}`,
          text: text.replace(/due[:\s]+[0-9]{4}-[0-9]{2}-[0-9]{2}/i, "").trim(),
          dueAt: due ? due[1] : "",
          done: false,
        });
      }
    });
  } else {
    asStringArray(followRaw).forEach((text, i) => {
      const due = text.match(/due[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
      followUps.push({
        id: `fu_${Date.now()}_${i}`,
        text: text.replace(/due[:\s]+[0-9]{4}-[0-9]{2}-[0-9]{2}/i, "").trim(),
        dueAt: due ? due[1] : "",
        done: false,
      });
    });
  }
  const mood = asString(pick(root, "mood", "sentiment", "status", "morale")).toLowerCase();
  const moodMap: LogEntry["mood"] = /thriv|great|excit|happy|positive/.test(mood)
    ? "thriving"
    : /worr|stress|anxious|concern|hesit/.test(mood)
      ? "worried"
      : /risk|danger|burn|quit|leav|drop/.test(mood)
        ? "at-risk"
        : mood
          ? "steady"
          : "unknown";
  const languageRaw = asString(pick(root, "language", "lang", "spokenLanguage")).toLowerCase();
  const language = /fa|persian|farsi|فارسی/.test(languageRaw)
    ? "fa"
    : /mix|both/.test(languageRaw)
      ? "mixed"
      : languageRaw
        ? "en"
        : "";

  return {
    summary: asString(pick(root, "log", "summary", "concise", "rewrite", "brief", "digest")),
    language,
    mood: moodMap,
    swot,
    followUps,
    actions: asStringArray(pick(root, "actions", "advice", "recommendations", "coaching")),
    raw,
  };
}

/**
 * One entry from the roster-wide message sweep.
 *
 * The batch prompt answers with every tutor at once, so this keeps the roster name and
 * the chat name side by side: the mentor needs to see *why* the app thinks a chat about
 * "Alireza" belongs to علیرضا ابتهاج, and the app needs the name it matched on in case
 * two people on the roster share a first name.
 */
export interface ConversationRow {
  /** The roster name the AI says it found — matched against the roster by the caller. */
  name: string;
  /** How they appear in the pasted export, for the mentor to eyeball. */
  matchedAs: string;
  /** "high" | "medium" | "low", straight from the answer. */
  confidence: string;
  /** ISO date of the last message, or "" when the answer did not say. */
  date: string;
  /** The log itself, run through the same normalizer the single-tutor flow uses. */
  log: Partial<LogEntry>;
}

/**
 * Every field a single entry can carry.
 *
 * Used for one decision only: telling "one tutor, pasted on their own" apart from "a map
 * of tutors keyed by name". An object that has any of these is an entry; one that has
 * none of them is structure.
 */
const ENTRY_FIELDS = new Set([
  "name", "tutor", "tutorName", "rosterName", "matched", "matchedName", "fullName",
  "log", "summary", "concise", "rewrite", "brief", "digest",
  "entry", "conversation", "chat", "analysis", "result", "logEntry",
  "matchedAs", "appearsAs", "seenAs", "as", "alias", "handle",
  "confidence", "certainty", "match", "date", "at", "when", "lastMessageAt", "lastMessage", "day",
]);

/** Keys that sit *beside* the entries in an answer and are not people. */
const META_KEYS = new Set(["ambiguous", "notOnRoster", "missing", "insights", "notes", "warnings", "errors", "summary"]);

/**
 * Read a `{ "name": entry }` object as one row per key.
 *
 * The key is the roster name, so it wins over a `name` inside the value: a model that keys
 * by "علیرضا ابتهاج" but writes `name: "Alireza"` inside has told us the person and the
 * spelling separately, and the roster name is the half that matches reliably. Values that
 * are neither an object nor a non-empty string carry nothing and are skipped.
 */
function keyedEntries(map: Record<string, unknown>, opts: { skipMeta?: boolean } = {}): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const [key, value] of Object.entries(map)) {
    if (opts.skipMeta && META_KEYS.has(key)) continue;
    if (isPlainObject(value)) {
      const inner = value as Record<string, unknown>;
      out.push({ ...inner, name: asString(inner.name).trim() || key });
    } else if (typeof value === "string" && value.trim()) {
      out.push({ name: key, log: value });
    }
  }
  return out;
}

/**
 * Read the whole-roster answer, in whatever shape it arrives.
 *
 * Models answer this contract as an array, wrap it under a key, or — very commonly, and
 * reasonably — return an object keyed by tutor name with the entry as the value, either
 * under a wrapper or as the entire answer. All of those have to land, because the failure
 * mode of not accepting one of them is that the mentor pastes a perfectly good answer and
 * the app says there was nothing in it.
 */
export function normalizeConversations(patch: unknown): ConversationRow[] {
  let list: unknown = patch;

  if (isPlainObject(patch)) {
    const root = patch as Record<string, unknown>;
    const wrapped = pick(root, "conversations", "chats", "entries", "logs", "messages", "results", "tutors", "data");
    if (Array.isArray(wrapped)) {
      list = wrapped;
    } else if (isPlainObject(wrapped)) {
      /* { conversations: { "علیرضا ابتهاج": { log: "…" } } } — the key IS the roster name. */
      list = keyedEntries(wrapped as Record<string, unknown>);
    } else {
      /*
       * The same keyed shape with no wrapper at all: `{ "علیرضا ابتهاج": { … } }` as the
       * whole answer. Only read this way when the object carries none of the fields a
       * single entry would have, so one tutor's entry pasted on its own is still one
       * entry and not a map whose only key happens to be "name".
       */
      const looksLikeEntry = Object.keys(root).some((k) => ENTRY_FIELDS.has(k));
      const keyed = keyedEntries(root, { skipMeta: true });
      if (!looksLikeEntry && keyed.length) list = keyed;
    }
  }

  /* A single entry pasted on its own is still a valid answer — one tutor was found. */
  if (isPlainObject(list)) list = [list];
  if (!Array.isArray(list)) return [];

  const rows: ConversationRow[] = [];
  for (const item of list) {
    if (!isPlainObject(item)) continue;
    const entry = unwrapEntry(item);
    const name = asString(pick(entry, "name", "tutor", "tutorName", "rosterName", "matched", "matchedName", "fullName")).trim();
    const log = normalizeLog(entry);
    /*
     * A row with no name cannot be applied — there is nobody to attach it to — and a row
     * with no summary has nothing to say. Both are dropped here rather than silently
     * creating an empty timeline entry on an arbitrary tutor.
     */
    if (!name) continue;
    rows.push({
      name,
      matchedAs: asString(pick(entry, "matchedAs", "appearsAs", "seenAs", "as", "alias", "handle")).trim(),
      confidence: asString(pick(entry, "confidence", "certainty", "match")).trim().toLowerCase(),
      date: isoDate(asString(pick(entry, "date", "at", "when", "lastMessageAt", "lastMessage", "day"))),
      log,
    });
  }
  return rows;
}

/** Entries are sometimes nested under `entry`, `conversation` or `analysis`. */
function unwrapEntry(item: Record<string, unknown>): Record<string, unknown> {
  const nested = pick(item, "entry", "conversation", "chat", "analysis", "result", "logEntry");
  if (!isPlainObject(nested)) return item;
  /*
   * The wrapper keeps the identity (name, matchedAs, date) and the inner object keeps the
   * write-up. The inner one wins on a shared key, because that is where the actual answer
   * is — but the wrapper's `name` survives, since the nested object almost never repeats it.
   */
  return { ...item, ...(nested as Record<string, unknown>) };
}

/**
 * The names the answer says it could not place.
 *
 * Returned so the mentor sees them. An unplaceable name is the one thing a batch like
 * this must never swallow: dropping it silently is how a conversation goes missing and
 * nobody finds out.
 */
export function unplacedNames(patch: unknown, key: "ambiguous" | "notOnRoster"): string[] {
  if (!isPlainObject(patch)) return [];
  const raw = (patch as Record<string, unknown>)[key];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (isPlainObject(item)) {
        return asString(pick(item, "appearsAs", "name", "tutor", "as", "seenAs", "candidates")).trim();
      }
      return asString(item).trim();
    })
    .filter(Boolean);
}

/**
 * The profile changes a conversation justifies.
 *
 * Only the fields the AI actually filled are returned, so applying an update can never
 * blank out something the conversation did not mention — that is the whole risk with
 * letting a chat edit a profile.
 */
export interface ProfileUpdatePatch {
  phase?: Tutor["phase"];
  tags?: string[];
  priceUsd?: number;
  availabilityHours?: number;
  nextFollowUpAt?: string;
  notes?: string;
  sourceTextAppend?: string;
  goal?: Partial<Goal>;
  /** Human-readable list of what changed, built by the caller for the preview. */
}

/** The keys that mean "this object is the profile-update block". */
const UPDATE_KEYS = ["phase", "status", "stage", "tags", "labels", "priceUsd", "price", "hourlyRate", "rate", "availabilityHours", "hoursPerWeek", "availableHours", "notes", "note", "mentorNotes", "context", "goal", "targets"] as const;

const looksLikeUpdates = (value: unknown): boolean =>
  isPlainObject(value) && UPDATE_KEYS.some((key) => pick(value, key) !== undefined);

export function normalizeProfileUpdates(patch: unknown): ProfileUpdatePatch {
  /**
   * Find the update block wherever the model put it.
   *
   * Models answer the conversation prompt inside an envelope often enough —
   * `{"result": {"log": …, "profileUpdates": {…}}}`, `{"analysis": …}`, or with the
   * update fields sitting flat next to `log` — that reading only `patch.profileUpdates`
   * meant the log applied and the price, hours, notes and goals were silently thrown
   * away. The preview said "no profile updates proposed" and no one could tell why.
   * Now the envelope is unwrapped first, then the fields are accepted flat as a last
   * resort, because a wrong phase beats a lost one.
   */
  const envelope = pick(patch, "result", "entry", "analysis", "report", "log");
  const scopes = [patch, isPlainObject(envelope) ? envelope : undefined].filter(isPlainObject) as Record<string, unknown>[];
  const named = scopes.map((scope) => pick(scope, "profileUpdates", "profile_changes", "profileChanges", "updates")).find(isPlainObject);
  const root = (isPlainObject(named) ? named : scopes.find(looksLikeUpdates)) as Record<string, unknown> | undefined;
  if (!root) return {};
  const out: ProfileUpdatePatch = {};

  const phase = asString(pick(root, "phase", "status", "stage")).toLowerCase().trim();
  if (["preparing", "waiting", "active", "passive"].includes(phase)) out.phase = phase as Tutor["phase"];

  const tags = pick(root, "tags", "labels");
  if (tags != null) {
    const list = asStringArray(tags);
    if (list.length) out.tags = list;
  }

  const price = pick(root, "priceUsd", "price", "hourlyRate", "rate");
  if (asNumber(price) > 0) out.priceUsd = asNumber(price);

  const hours = pick(root, "availabilityHours", "hoursPerWeek", "availableHours");
  if (asNumber(hours) > 0) out.availabilityHours = asNumber(hours);

  const followUp = isoDate(asString(pick(root, "nextFollowUpAt", "followUpAt", "followUp", "nextFollowUp")));
  if (followUp) out.nextFollowUpAt = followUp;

  const notes = asString(pick(root, "notes", "note", "mentorNotes", "context"));
  if (notes.trim()) out.notes = notes.trim();

  const append = asString(pick(root, "sourceTextAppend", "sourceAppend", "background", "backgroundAppend"));
  if (append.trim()) out.sourceTextAppend = append.trim();

  const goalRaw = pick(root, "goal", "targets");
  if (isPlainObject(goalRaw)) {
    const goal: Partial<Goal> = {};
    const income = asNumber(pick(goalRaw, "monthlyIncomeUsd", "monthlyIncome", "income"));
    const hoursGoal = asNumber(pick(goalRaw, "hoursPerWeek", "hours"));
    const students = asNumber(pick(goalRaw, "studentsTarget", "students"));
    const types = asStringArray(pick(goalRaw, "studentTypes", "audience"));
    const life = asString(pick(goalRaw, "lifeGoal", "savingFor"));
    const cost = asNumber(pick(goalRaw, "lifeGoalCostUsd", "cost"));
    if (income > 0) goal.monthlyIncomeUsd = income;
    if (hoursGoal > 0) goal.hoursPerWeek = hoursGoal;
    if (students > 0) goal.studentsTarget = students;
    if (types.length) goal.studentTypes = types;
    if (life) goal.lifeGoal = life;
    if (cost > 0) goal.lifeGoalCostUsd = cost;
    if (Object.keys(goal).length) out.goal = goal;
  }

  return out;
}

/* ------------------------------------------------------- goals and plans -- */

export function normalizeGoal(patch: unknown): Goal | undefined {
  if (!isPlainObject(patch)) return undefined;
  const goalRaw = isPlainObject(pick(patch, "goal")) ? (pick(patch, "goal") as Record<string, unknown>) : patch;
  const income = asNumber(pick(goalRaw, "monthlyIncomeUsd", "monthlyIncome", "incomeGoal", "targetIncome"));

  return {
    monthlyIncomeUsd: income,
    hoursPerWeek: asNumber(pick(goalRaw, "hoursPerWeek", "hours")),
    studentsTarget: asNumber(pick(goalRaw, "studentsTarget", "targetStudents", "students")),
    studentTypes: asStringArray(pick(goalRaw, "studentTypes", "audience", "studentProfile")),
    lifeGoal: asString(pick(goalRaw, "lifeGoal", "dream", "savingFor")),
    lifeGoalCostUsd: asNumber(pick(goalRaw, "lifeGoalCostUsd", "cost", "price")),
    notes: asString(pick(goalRaw, "notes", "note")),
    createdAt: new Date().toISOString(),
  };
}

export function normalizePlan90(patch: unknown): Plan90 | undefined {
  if (!isPlainObject(patch)) return undefined;
  const weeksRaw = pick(patch, "weeks", "plan", "growthPlan", "weeklyPlan", "schedule", "phases");
  const weeks: PlanWeek[] = [];
  if (Array.isArray(weeksRaw)) {
    weeksRaw.forEach((item, i) => {
      if (isPlainObject(item)) {
        weeks.push({
          week: asNumber(pick(item, "week", "number", "index"), i + 1) || i + 1,
          focus: asString(pick(item, "focus", "theme", "title", "goal")),
          actions: asStringArray(pick(item, "actions", "steps", "tasks", "todos")),
          metric: asString(pick(item, "metric", "measure", "kpi", "successMetric")),
          done: asBoolean(pick(item, "done", "complete", "completed")),
        });
      } else {
        weeks.push({ week: i + 1, focus: asString(item), actions: [], metric: "", done: false });
      }
    });
  }
  const summary = asString(pick(patch, "summary", "overview", "strategy", "planSummary"));
  if (!weeks.length && !summary) return undefined;
  return { createdAt: new Date().toISOString(), summary, weeks };
}

export function normalizeMessages(patch: unknown): Partial<CraftedMessage>[] {
  const root = isPlainObject(patch) ? patch : {};
  const raw = pick(root, "messages", "variants", "options", "texts") ?? patch;
  const tone = asString(pick(root, "tone", "style"));
  const occasion = asString(pick(root, "occasion", "situation", "reason"));
  if (typeof raw === "string") return [{ text: raw.trim(), tone, occasion }];
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === "string") return [{ text: item.trim(), tone, occasion }];
      if (isPlainObject(item)) {
        const text = asString(pick(item, "text", "message", "body", "content"));
        return text.trim()
          ? [{ text: text.trim(), tone: asString(pick(item, "tone"), tone), occasion: asString(pick(item, "occasion", "label"), occasion) }]
          : [];
      }
      return [];
    });
  }
  if (isPlainObject(raw)) {
    return Object.entries(raw).flatMap(([key, value]) =>
      asStringArray(value).map((text) => ({ text, tone: key, occasion })),
    );
  }
  return [];
}

/* ---------------------------------------------------------------- roster -- */

export interface RosterRow {
  name: string;
  /** The same name in Latin letters, when `name` is Farsi/Arabic/CJK. */
  latinName: string;
  phone: string;
  country: string;
  startedAt: string;
  platformId: string;
  /** Every platform named in the row, not just the first. */
  platformIds: string[];
  phase: Tutor["phase"] | "";
  notes: string;
}

/**
 * One cell often names more than one marketplace ("Preply + AmazingTalker").
 *
 * Returns every id it can recognise, in the order they appear, so a tutor who is on
 * three platforms is not silently reduced to one. The caller decides which becomes the
 * primary (the first), and the full set goes to `platformIds`.
 */
export function platformIdsIn(value: string): string[] {
  const text = (value || "").toLowerCase();
  if (!text.trim()) return [];
  const known = [
    "preply",
    "italki",
    "amazingtalker",
    "classgap",
    "nativecamp",
    "palfish",
    "lingoace",
    "cambly",
    "verbling",
  ];
  const found = known.filter((id) => text.includes(id));
  // "AmazingTalker" written with a space or hyphen still counts.
  if (!found.includes("amazingtalker") && /amazing\s*talker/.test(text)) found.push("amazingtalker");
  return [...new Set(found)];
}

/**
 * A roster from the AI's Excel-to-JSON reply.
 *
 * Accepts `[{name, phone, startDate}, …]`, `{tutors: […]}`,
 * `{"Jane": {phone: "…"}}`, or even a bare list of names — a roster is too important
 * to lose because one key was named differently.
 */
export function normalizeRoster(patch: unknown): RosterRow[] {
  /**
   * Find the roster wherever the model put it.
   *
   * The answered value may be the roster array itself, an object wrapping it — or the
   * whole thing wrapped again in an envelope, which is what models do most often:
   * `{"result": {"tutors": […]}}`. Reading only the top level made that case fall
   * through to "treat the root object's keys as tutor names", so a spreadsheet import
   * reported a single tutor literally named *result* and added nobody. The envelope is
   * unwrapped first now, for both an array and a named list inside it.
   */
  const envelope = pick(patch, "result", "answer", "response", "output", "reply", "payload", "analysis", "json");
  const scopes: unknown[] = [patch, ...(Array.isArray(envelope) || isPlainObject(envelope) ? [envelope] : [])];

  let root: unknown = scopes.find((s) => Array.isArray(s));
  if (!root) {
    for (const scope of scopes) {
      const found = pick(scope, "tutors", "roster", "list", "rows", "tutorList", "tutorsList", "data");
      if (Array.isArray(found) || isPlainObject(found)) {
        root = found;
        break;
      }
    }
  }
  if (!root) root = patch;
  const rows: RosterRow[] = [];

  if (Array.isArray(root)) {
    for (const item of root) {
      if (typeof item === "string") {
        rows.push(blankRow(item));
        continue;
      }
      if (!isPlainObject(item)) continue;
      const name = asString(pick(item, "name", "tutor", "fullName", "full_name", "student", "title"));
      if (!name.trim()) continue;
      const platformText = asString(pick(item, "platform", "platformId", "platforms", "site", "sites"));
      const platformIds = platformIdsIn(
        Array.isArray(pick(item, "platforms"))
          ? (pick(item, "platforms") as unknown[]).map((v) => asString(v)).join(" ")
          : platformText,
      );
      rows.push({
        name: name.trim(),
        latinName: latinNameOf(item),
        phone: asString(pick(item, "phone", "phoneNumber", "mobile", "whatsapp", "number", "contact")),
        country: asString(pick(item, "country", "location", "city")),
        startedAt: isoDate(asString(pick(item, "startedAt", "startDate", "dateStarted", "joined", "joinedAt", "date", "since"))),
        platformId: platformIds[0] ?? platformText.trim().toLowerCase(),
        platformIds,
        phase: asString(pick(item, "phase", "status", "stage")).toLowerCase() as Tutor["phase"],
        notes: asString(pick(item, "notes", "note", "comment", "background")),
      });
    }
  } else if (isPlainObject(root)) {
    for (const [key, value] of Object.entries(root)) {
      if (isPlainObject(value)) {
        const platformIds = platformIdsIn(asString(pick(value, "platform", "platforms", "site")));
        rows.push({
          name: asString(pick(value, "name")) || key,
          latinName: latinNameOf(value),
          phone: asString(pick(value, "phone", "phoneNumber", "mobile", "whatsapp")),
          country: asString(pick(value, "country", "location")),
          startedAt: isoDate(asString(pick(value, "startedAt", "startDate", "joined", "date"))),
          platformId: platformIds[0] ?? "",
          platformIds,
          phase: asString(pick(value, "phase", "status")).toLowerCase() as Tutor["phase"],
          notes: asString(pick(value, "notes")),
        });
      } else if (typeof value === "string") {
        rows.push({ ...blankRow(key), phone: value });
      }
    }
  }
  return rows;
}

const blankRow = (name: string): RosterRow => ({
  name: name.trim(),
  latinName: "",
  phone: "",
  country: "",
  startedAt: "",
  platformId: "",
  platformIds: [],
  phase: "",
  notes: "",
});

/**
 * The Latin spelling of a name, under any of the keys a model might choose.
 *
 * `name` is never overwritten with it: for a Farsi-speaking mentor the original script is
 * the one they recognise, and the Latin form is there for the forms and emails that need
 * it. When the row's own name is already Latin the two are the same value, which is fine.
 */
export function latinNameOf(source: Record<string, unknown>): string {
  const value = asString(
    pick(
      source,
      "latinName",
      "latin_name",
      "latinname",
      "englishName",
      "english_name",
      "nameEn",
      "name_en",
      "nameLatin",
      "romanizedName",
      "romanised",
      "romanized",
      "transliteration",
    ),
  ).trim();
  return value;
}

/** Accept "2026-03-04", "04/03/2026", "March 2026", "3 months ago" as honestly as possible. */
export function isoDate(input: string): string {
  const text = (input || "").trim();
  if (!text) return "";
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ago = text.match(/(\d+)\s*(day|week|month|year)s?\s*ago/i);
  if (ago) {
    const n = parseInt(ago[1], 10);
    const unit = ago[2].toLowerCase();
    const d = new Date();
    if (unit === "day") d.setDate(d.getDate() - n);
    if (unit === "week") d.setDate(d.getDate() - n * 7);
    if (unit === "month") d.setMonth(d.getMonth() - n);
    if (unit === "year") d.setFullYear(d.getFullYear() - n);
    return d.toISOString().slice(0, 10);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------- change report -- */

export interface ChangeReport {
  filled: string[];
  ignored: string[];
  raw: unknown;
}

/**
 * What the pasted JSON actually contained.
 *
 * The modal shows this after every paste, so "the video scripts didn't show up" is
 * answered immediately: either a script field was filled, or the model never sent
 * one and the list of ignored keys says what it sent instead.
 */
export function describeChanges(raw: unknown, filled: Record<string, unknown>): ChangeReport {
  const filledKeys = Object.entries(filled)
    .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v != null && v !== ""))
    .map(([k]) => k);
  // Fields with no fixed home are kept in `extra`, keyed by their own label — count
  // those as filled too, or the report contradicts itself by saying they were ignored.
  if (isPlainObject(filled.extra)) filledKeys.push(...Object.keys(filled.extra));
  const inputKeys = isPlainObject(raw)
    ? Object.keys(raw)
    : Array.isArray(raw)
      ? ["(array)"]
      : [];
  const known = new Set(filledKeys.map((k) => k.toLowerCase().replace(/[\s_-]/g, "")));
  const ignored = inputKeys.filter((k) => {
    const norm = k.toLowerCase().replace(/[\s_-]/g, "");
    return ![...known].some((kk) => norm.includes(kk) || kk.includes(norm));
  });
  return { filled: filledKeys, ignored, raw };
}

/* ----------------------------------------------------------------- misc -- */

/** "video" → "Video"; leaves anything already capitalized alone. */
function titleCase(value: string): string {
  return /^[a-z][a-z\s-]*$/.test(value) ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export { clamp, asRichText, label };

/** Monday of the current week, as an ISO date — the week a snapshot belongs to. */
export function weekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
