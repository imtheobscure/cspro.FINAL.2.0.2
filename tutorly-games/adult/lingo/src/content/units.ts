/**
 * Learning path planner.
 *
 * The path is derived from the loaded content pack: the more items the AI agent
 * produced, the longer the course. Every item in the pack is reachable, because
 * each unit claims one contiguous slice of every content kind.
 */
import type { ContentPack, ActivityBank } from "./tutolingo";

export type LessonType = "vocab" | "grammar" | "speaking" | "idiom" | "review";

export interface LessonTemplate {
  title: string;
  type: LessonType;
}

export const LESSONS_PER_UNIT = 7;

export const LESSON_TEMPLATES: LessonTemplate[] = [
  { title: "New Words", type: "vocab" },
  { title: "Grammar Point", type: "grammar" },
  { title: "Listening & Speaking", type: "speaking" },
  { title: "More Words", type: "vocab" },
  { title: "Idioms & Expressions", type: "idiom" },
  { title: "Grammar in Action", type: "grammar" },
  { title: "Unit Review", type: "review" },
];

/** Roughly how many pack items a single unit should cover. */
const ITEMS_PER_UNIT = 56;

const THEMES = [
  "Daily Life", "Family & Friends", "Food & Dining", "Travel", "Shopping & Money",
  "Work & Career", "Education", "Health", "Sports & Leisure", "Technology",
  "Nature", "Arts & Culture", "Feelings & Personality", "City & Transport", "Home & Living",
  "Media & News", "Science", "Society & Law", "Business", "Relationships",
];

const COLORS = ["#58CC02", "#1CB0F6", "#FF9600", "#CE82FF", "#FF4B4B", "#2EC4B6", "#A560FF", "#FFC800", "#FF6F91", "#00B894"];

export interface LessonContentSlice {
  vocab: number[];
  grammar: number[];
  idioms: number[];
  sentences: number[];
  conversations: number[];
  bank: ActivityBank;
}

export interface LessonPlan {
  id: number;
  unitId: number;
  order: number;
  type: LessonType;
  title: string;
  level: string;
  xp: number;
  gems: number;
  slice: LessonContentSlice;
}

export interface UnitPlan {
  id: number;
  title: string;
  subtitle: string;
  level: string;
  color: string;
  lessons: LessonPlan[];
}

export function totalUnits(pack: ContentPack): number {
  const items = packItemCountForPath(pack);
  return Math.max(1, Math.ceil(items / ITEMS_PER_UNIT));
}

function packItemCountForPath(pack: ContentPack): number {
  const grammarExercises = pack.grammar.reduce((a, g) => a + (g.exercises.length || 1), 0);
  const turns = pack.conversations.reduce((a, c) => a + c.turns.length, 0);
  const bank =
    (pack.activities.matchPairs?.length ?? 0) +
    (pack.activities.fillBlank?.length ?? 0) +
    (pack.activities.reorder?.length ?? 0) +
    (pack.activities.listenSelect?.length ?? 0) +
    (pack.activities.typeHear?.length ?? 0) +
    (pack.activities.speak?.length ?? 0) +
    (pack.activities.tapComplete?.length ?? 0);
  return pack.vocabulary.length + grammarExercises + pack.idioms.length + turns + pack.sentences.length + bank;
}

export function totalLessons(pack: ContentPack): number {
  return totalUnits(pack) * LESSONS_PER_UNIT;
}

export function lessonTypeFor(order: number): LessonType {
  return LESSON_TEMPLATES[order - 1]?.type ?? "review";
}

export function lessonTitleFor(order: number): string {
  return LESSON_TEMPLATES[order - 1]?.title ?? "Review";
}

/** Contiguous slice for one unit, then one sub-slice for one part of that unit. */
function slicePart<T>(items: T[], units: number, unitId: number, parts: number, partIdx: number): T[] {
  if (!items.length || parts <= 0) return [];
  const unitStart = Math.floor(((unitId - 1) * items.length) / units);
  const unitEnd = Math.floor((unitId * items.length) / units);
  const unitSlice = items.slice(unitStart, unitEnd);
  const start = Math.floor((partIdx * unitSlice.length) / parts);
  const end = Math.floor(((partIdx + 1) * unitSlice.length) / parts);
  return unitSlice.slice(start, end);
}

const bankSlice = <T,>(items: T[] | undefined, units: number, unitId: number): T[] =>
  slicePart(items ?? [], units, unitId, 1, 0);

function bankFor(pack: ContentPack, units: number, unitId: number): ActivityBank {
  const b = pack.activities;
  return {
    matchPairs: bankSlice(b.matchPairs, units, unitId),
    fillBlank: bankSlice(b.fillBlank, units, unitId),
    reorder: bankSlice(b.reorder, units, unitId),
    listenSelect: bankSlice(b.listenSelect, units, unitId),
    typeHear: bankSlice(b.typeHear, units, unitId),
    speak: bankSlice(b.speak, units, unitId),
    tapComplete: bankSlice(b.tapComplete, units, unitId),
  };
}

/** Chapter labels from the pack itself, when the agent labelled its items. */
function packUnitLabels(pack: ContentPack): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (label?: string) => {
    const v = label?.trim();
    if (!v || seen.has(v.toLowerCase())) return;
    seen.add(v.toLowerCase());
    out.push(v);
  };
  for (const v of pack.vocabulary) push(v.unit);
  for (const g of pack.grammar) push(g.unit);
  for (const i of pack.idioms) push(i.unit);
  return out;
}

export function stageFor(unitId: number, units: number): { level: string; stage: string } {
  const p = units <= 1 ? 1 : unitId / units;
  if (p <= 0.25) return { level: "A2", stage: "Foundation" };
  if (p <= 0.5) return { level: "B1", stage: "Intermediate" };
  if (p <= 0.75) return { level: "B2", stage: "Upper intermediate" };
  if (p <= 0.9) return { level: "C1", stage: "Advanced" };
  return { level: "C2", stage: "Mastery" };
}

/** Short courses keep the level the content pack declares instead of a scaled guess. */
function courseStage(pack: ContentPack, unitId: number, units: number): { level: string; stage: string } {
  if (units <= 2 && pack.meta.level) return { level: pack.meta.level, stage: "Full course" };
  return stageFor(unitId, units);
}

function unitTitle(pack: ContentPack, unitId: number, units: number): string {
  const labels = packUnitLabels(pack);
  if (labels.length >= units) return labels[unitId - 1];
  const theme = THEMES[(unitId - 1) % THEMES.length];
  const round = Math.floor((unitId - 1) / THEMES.length) + 1;
  return round > 1 ? `${theme} (${round})` : theme;
}

export function planLesson(pack: ContentPack, unitId: number, order: number): LessonPlan {
  const units = totalUnits(pack);
  const safeUnit = Math.min(Math.max(1, unitId), units);
  const safeOrder = Math.min(Math.max(1, order), LESSONS_PER_UNIT);
  const { level } = courseStage(pack, safeUnit, units);
  const bank = bankFor(pack, units, safeUnit);

  let vocab: number[] = [];
  let grammar: number[] = [];
  let idioms: number[] = [];
  let sentences: number[] = [];
  let conversations: number[] = [];

  const idx = <T,>(items: T[]): number[] => items.map((_, i) => i);
  const offsetFor = (items: { length: number }, parts: number, part: number) => {
    // indices relative to the whole array so the engine can pick from it directly
    const unitStart = Math.floor(((safeUnit - 1) * items.length) / units);
    const unitEnd = Math.floor((safeUnit * items.length) / units);
    const len = unitEnd - unitStart;
    const start = unitStart + Math.floor((part * len) / parts);
    const end = unitStart + Math.floor(((part + 1) * len) / parts);
    return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  };

  switch (safeOrder) {
    case 1:
      vocab = offsetFor(pack.vocabulary, 2, 0);
      sentences = offsetFor(pack.sentences, 2, 0);
      break;
    case 2:
      grammar = offsetFor(pack.grammar, 2, 0);
      break;
    case 3:
      conversations = idx(slicePart(pack.conversations, units, safeUnit, 1, 0)).length
        ? offsetFor(pack.conversations, 1, 0)
        : [];
      sentences = offsetFor(pack.sentences, 2, 1);
      break;
    case 4:
      vocab = offsetFor(pack.vocabulary, 2, 1);
      break;
    case 5:
      idioms = offsetFor(pack.idioms, 1, 0);
      break;
    case 6:
      grammar = offsetFor(pack.grammar, 2, 1);
      break;
    default: {
      // review lesson: revisit the whole unit, no new material
      vocab = offsetFor(pack.vocabulary, 1, 0);
      grammar = offsetFor(pack.grammar, 1, 0);
      idioms = offsetFor(pack.idioms, 1, 0);
      sentences = offsetFor(pack.sentences, 1, 0);
      conversations = offsetFor(pack.conversations, 1, 0);
      break;
    }
  }

  const template = LESSON_TEMPLATES[safeOrder - 1];
  return {
    id: (safeUnit - 1) * LESSONS_PER_UNIT + safeOrder,
    unitId: safeUnit,
    order: safeOrder,
    type: template.type,
    title: `${template.title} ${safeUnit}.${safeOrder}`,
    level,
    xp: template.type === "review" ? 30 : 20,
    gems: template.type === "review" ? 10 : 5,
    slice: { vocab, grammar, idioms, sentences, conversations, bank },
  };
}

export function planUnit(pack: ContentPack, unitId: number): UnitPlan {
  const units = totalUnits(pack);
  const safeUnit = Math.min(Math.max(1, unitId), units);
  const { level, stage } = courseStage(pack, safeUnit, units);
  const lessons = Array.from({ length: LESSONS_PER_UNIT }, (_, i) => planLesson(pack, safeUnit, i + 1));
  return {
    id: safeUnit,
    title: `Unit ${safeUnit}: ${unitTitle(pack, safeUnit, units)}`,
    subtitle: `Level ${level} · ${stage}`,
    level,
    color: COLORS[(safeUnit - 1) % COLORS.length],
    lessons,
  };
}

export function planUnits(pack: ContentPack, from: number, count: number): UnitPlan[] {
  const out: UnitPlan[] = [];
  const units = totalUnits(pack);
  for (let i = from; i < from + count && i <= units; i++) out.push(planUnit(pack, i));
  return out;
}

export function lessonById(pack: ContentPack, id: number): LessonPlan | undefined {
  if (!Number.isFinite(id) || id < 1) return undefined;
  if (id > totalLessons(pack)) return undefined;
  const unitId = Math.floor((id - 1) / LESSONS_PER_UNIT) + 1;
  const order = ((id - 1) % LESSONS_PER_UNIT) + 1;
  return planLesson(pack, unitId, order);
}

export function lessonLabel(pack: ContentPack, id: number): string {
  const plan = lessonById(pack, id);
  if (!plan) return "Lesson";
  return `Unit ${plan.unitId} · ${LESSON_TEMPLATES[plan.order - 1].title}`;
}

/* ------------------------------------------------------------------ */
/* Leagues                                                             */
/* ------------------------------------------------------------------ */

export interface League {
  name: string;
  color: string;
  min: number;
}

export const LEAGUES: League[] = [
  { name: "Bronze", color: "#CD7F32", min: 0 },
  { name: "Silver", color: "#9AA0A6", min: 100 },
  { name: "Gold", color: "#FFC800", min: 300 },
  { name: "Sapphire", color: "#1CB0F6", min: 600 },
  { name: "Ruby", color: "#FF4B4B", min: 1000 },
  { name: "Emerald", color: "#58CC02", min: 1500 },
  { name: "Amethyst", color: "#CE82FF", min: 2200 },
  { name: "Pearl", color: "#E8EAED", min: 3000 },
  { name: "Obsidian", color: "#3C4043", min: 4000 },
  { name: "Diamond", color: "#00E5FF", min: 5500 },
];

export function leagueForXp(xp: number): League {
  let current = LEAGUES[0];
  for (const l of LEAGUES) if (xp >= l.min) current = l;
  return current;
}
