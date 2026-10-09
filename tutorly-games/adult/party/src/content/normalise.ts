import type { Difficulty, Media, Question, ScriptLine } from "./build";

const POINTS: Record<Difficulty, number> = { easy: 100, medium: 200, hard: 300 };
const LEVEL: Record<Difficulty, string> = { easy: "B1", medium: "B1+", hard: "B2" };

type Raw = Record<string, unknown>;
const str = (v: unknown, fallback = "") => (typeof v === "string" && v.trim() ? v : fallback);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Turn a pasted AI pack question into the strict shape the board plays. */
export function normaliseQuestion(raw: Raw, index: number): Question {
  const difficulty = (["easy", "medium", "hard"].includes(String(raw.difficulty)) ? raw.difficulty : "medium") as Difficulty;
  const lessonRaw = (raw.lesson ?? {}) as Raw;
  const form = (lessonRaw.form ?? {}) as Raw;
  const keyword = (lessonRaw.keyword ?? {}) as Raw;
  const options = arr<string>(raw.options).map((o) => String(o));
  const answer = arr<number>(raw.answer).map((n) => Number(n)).filter((n) => Number.isFinite(n));

  return {
    id: str(raw.id, `pack-${index + 1}`),
    cell: typeof raw.cell === "number" ? raw.cell : index + 1,
    difficulty,
    skill: str(raw.skill, "Language"),
    grammarPoint: str(raw.grammarPoint, str(raw.skill, "General")),
    cefr: str(raw.cefr, LEVEL[difficulty]),
    points: typeof raw.points === "number" ? raw.points : POINTS[difficulty],
    type: (["mcq", "multi", "tf"].includes(String(raw.type)) ? raw.type : "mcq") as Question["type"],
    prompt: str(raw.prompt, "—"),
    passage: typeof raw.passage === "string" ? raw.passage : undefined,
    script: arr<Raw>(raw.script).map((l) => ({
      speaker: str(l.speaker, "Speaker"),
      voice: (["m", "f", "n"].includes(String(l.voice)) ? l.voice : "n") as ScriptLine["voice"],
      line: str(l.line),
    })),
    options: options.length ? options : ["True", "False"],
    answer: answer.length ? answer : [0],
    hint: str(raw.hint, "Think about the rule behind the sentence."),
    lesson: {
      headline: str(lessonRaw.headline, "Here's what this question was teaching."),
      why: str(lessonRaw.why, "The correct option follows the rule tested here."),
      wrongWhy: arr<string>(lessonRaw.wrongWhy).map(String),
      form: { rule: str(form.rule, "—"), examples: arr<string>(form.examples).map(String) },
      keyword: { word: str(keyword.word, "—"), collocation: str(keyword.collocation, "—"), trap: str(keyword.trap, "—") },
      steps: arr<string>(lessonRaw.steps).map(String),
      speakingTask: str(lessonRaw.speakingTask, "Say two sentences of your own using this structure."),
      media: arr<Raw>(lessonRaw.media)
        .filter((m) => typeof m.url === "string" && /^https?:\/\//.test(String(m.url)))
        .map((m) => ({
          type: (["image", "gif", "audio", "video", "motion"].includes(String(m.type)) ? m.type : "image") as Media["type"],
          url: String(m.url), caption: str(m.caption, ""), notice: str(m.notice, ""),
        })),
    },
  };
}

export function normalisePack(data: unknown): Question[] {
  const grid = (data as Raw | null)?.grid;
  if (!Array.isArray(grid) || !grid.length) return [];
  return grid.map((g, i) => normaliseQuestion(g as Raw, i));
}
