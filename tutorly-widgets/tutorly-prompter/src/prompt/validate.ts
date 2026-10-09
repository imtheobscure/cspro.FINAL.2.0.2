import type { LessonPlan } from "../types";

export interface ValidationResult {
  ok: boolean;
  lesson?: LessonPlan;
  error?: string;
}

/**
 * Parse and validate the JSON returned by the AI.
 * - Strips common wrappers (```json fences, leading prose) defensively.
 * - Performs structural checks but is lenient about optional fields.
 */
export function parseLessonJson(raw: string): ValidationResult {
  if (!raw || !raw.trim()) {
    return { ok: false, error: "Empty input. Paste the JSON returned by the AI." };
  }

  const cleaned = stripFences(raw);
  let data: any;
  try {
    data = JSON.parse(cleaned);
  } catch (e: any) {
    // Try to extract the first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        data = JSON.parse(match[0]);
      } catch (e2: any) {
        return { ok: false, error: `Malformed JSON: ${e2.message}` };
      }
    } else {
      return { ok: false, error: `Malformed JSON: ${e.message}` };
    }
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "JSON root must be an object." };
  }
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    return { ok: false, error: "JSON must contain a non-empty 'sections' array." };
  }

  // Coerce + sanitize
  const lesson: LessonPlan = {
    title: String(data.title ?? "Untitled lesson"),
    profile: data.profile ?? "lesson",
    learner: {
      id: String(data.learner?.id ?? "imported"),
      name: String(data.learner?.name ?? ""),
      l1: String(data.learner?.l1 ?? ""),
      cefr: data.learner?.cefr ?? "B1",
      age: String(data.learner?.age ?? ""),
      interests: String(data.learner?.interests ?? ""),
      goals: String(data.learner?.goals ?? ""),
      notes: String(data.learner?.notes ?? ""),
    },
    targetMinutes: Number(data.targetMinutes ?? 30) || 30,
    sections: [],
    glossary: Array.isArray(data.glossary)
      ? data.glossary.map((g: any) => ({
          term: String(g.term ?? ""),
          definition: String(g.definition ?? ""),
          exampleSentence: g.exampleSentence ? String(g.exampleSentence) : undefined,
        }))
      : [],
    notes: data.notes ? String(data.notes) : "",
    generatedAt: new Date().toISOString(),
  };

  for (const [si, s] of data.sections.entries()) {
    if (!s || typeof s !== "object") {
      return { ok: false, error: `Section ${si} is not an object.` };
    }
    if (!Array.isArray(s.sentences)) {
      return { ok: false, error: `Section ${si} ('${s.title ?? ""}') is missing a 'sentences' array.` };
    }
    lesson.sections.push({
      id: String(s.id ?? `s${si}`),
      title: String(s.title ?? `Section ${si + 1}`),
      kind: s.kind ?? "custom",
      estimatedMinutes: Number(s.estimatedMinutes ?? 0) || 0,
      sentences: s.sentences.map((sn: any) => ({
        text: String(sn?.text ?? ""),
        ann: sn?.ann && typeof sn.ann === "object" ? sn.ann : undefined,
      })),
      cues: Array.isArray(s.cues) ? s.cues : undefined,
      teacherGuide: s.teacherGuide && typeof s.teacherGuide === "object" ? s.teacherGuide : undefined,
    });
  }

  return { ok: true, lesson };
}

function stripFences(s: string): string {
  let out = s.trim();
  // Remove leading prose before first {
  const firstBrace = out.indexOf("{");
  const lastBrace = out.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) {
    // also handle ```json blocks
    out = out.slice(firstBrace, lastBrace + 1);
  }
  return out;
}
