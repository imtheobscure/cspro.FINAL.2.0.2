export type Media = {
  type: "image" | "gif" | "audio" | "video" | "motion";
  url?: string;
  caption: string;
  notice?: string;
};

export type MiniLesson = {
  headline: string;
  why: string;
  wrongWhy: string[];
  form: { rule: string; examples: string[] };
  keyword: { word: string; collocation: string; trap: string };
  steps: string[];
  speakingTask: string;
  media: Media[];
};

export type ScriptLine = { speaker: string; voice: "m" | "f" | "n"; line: string };

export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  cell: number;
  difficulty: Difficulty;
  skill: string;
  grammarPoint: string;
  cefr: string;
  points: number;
  type: "mcq" | "multi" | "tf";
  prompt: string;
  passage?: string;
  script?: ScriptLine[];
  options: string[];
  answer: number[];
  hint: string;
  lesson: MiniLesson;
};

type LessonShort = {
  h: string;
  g: string;
  r: string[];
  f: string[];
  k: [string, string, string];
  s: string[];
  t: string;
  m?: Media[];
};

const POINTS: Record<Difficulty, number> = { easy: 100, medium: 200, hard: 300 };
const LEVEL: Record<Difficulty, string> = { easy: "B1", medium: "B1+", hard: "B2" };

export function q(
  cell: number,
  difficulty: Difficulty,
  skill: string,
  grammarPoint: string,
  type: "mcq" | "multi" | "tf",
  prompt: string,
  options: string[],
  answer: number | number[],
  hint: string,
  l: LessonShort,
  extra?: { passage?: string; script?: ScriptLine[] },
): Question {
  return {
    id: `grid-${cell}`,
    cell,
    difficulty,
    skill,
    grammarPoint,
    cefr: LEVEL[difficulty],
    points: POINTS[difficulty],
    type,
    prompt,
    passage: extra?.passage,
    script: extra?.script,
    options,
    answer: Array.isArray(answer) ? answer : [answer],
    hint,
    lesson: {
      headline: l.h,
      why: l.g,
      wrongWhy: l.r,
      form: { rule: l.f[0], examples: l.f.slice(1) },
      keyword: { word: l.k[0], collocation: l.k[1], trap: l.k[2] },
      steps: l.s,
      speakingTask: l.t,
      media: l.m ?? [],
    },
  };
}
