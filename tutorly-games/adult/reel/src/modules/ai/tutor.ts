import { aiProvider, callModel, type ModelMessage } from "./model";

/** Context object assembled by the media/lesson systems (never by the tutor itself). */
export type TutorContext = {
  episodeTitle?: string;
  timestamp?: number;
  currentCue?: string | null;
  previousCues?: string[];
  nextCues?: string[];
  translationCue?: string | null;
  selectedWord?: string | null;
  selectedSentence?: string | null;
  speaker?: string | null;
  chapter?: string | null;
  learner: { cefrLevel: string; nativeLanguage: string; targetLanguage: string; interests?: string[] };
  lessonTitle?: string | null;
  segmentFocus?: { grammar: string[]; vocabulary: string[]; pronunciation: string[] } | null;
  savedVocabulary?: { word: string; translation?: string | null; definition?: string | null }[];
};

export type TutorTurn = { role: "user" | "assistant"; content: string };

function fmt(t?: number) {
  if (t === undefined) return "";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function buildTutorMessages(ctx: TutorContext, history: TutorTurn[], question: string): ModelMessage[] {
  const system = `You are a warm, precise ${ctx.learner.targetLanguage} tutor inside a video-learning app. The learner is CEFR ${ctx.learner.cefrLevel}, native language ${ctx.learner.nativeLanguage}.
Keep answers short (max ~160 words), at or slightly above the learner's level. Use the video context below as ground truth; never invent dialogue. Explain meaning, grammar, pronunciation and natural usage; give one extra example; add a ${ctx.learner.nativeLanguage} translation of key chunks when helpful. Format with short paragraphs or bullets, no headings.
CONTEXT
Episode: ${ctx.episodeTitle ?? "n/a"} at ${fmt(ctx.timestamp)}${ctx.chapter ? ` (chapter: ${ctx.chapter})` : ""}
Previous lines: ${(ctx.previousCues ?? []).map((c) => `“${c}”`).join(" ") || "n/a"}
Current line: ${ctx.currentCue ? `“${ctx.currentCue}”` : "n/a"}${ctx.speaker ? ` — ${ctx.speaker}` : ""}
Translation track: ${ctx.translationCue ?? "n/a"}
Next lines: ${(ctx.nextCues ?? []).map((c) => `“${c}”`).join(" ") || "n/a"}
Selected word: ${ctx.selectedWord ?? "none"} | Selected sentence: ${ctx.selectedSentence ?? "none"}
Lesson: ${ctx.lessonTitle ?? "none"}${ctx.segmentFocus ? ` | Segment focus — grammar: ${ctx.segmentFocus.grammar.join(", ")}; vocabulary: ${ctx.segmentFocus.vocabulary.join(", ")}; pronunciation: ${ctx.segmentFocus.pronunciation.join(", ")}` : ""}
Learner interests: ${(ctx.learner.interests ?? []).join(", ") || "n/a"}`;
  return [{ role: "system", content: system }, ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })), { role: "user", content: question }];
}

/** Deterministic, context-grounded answer used when no AI provider is configured. */
export function offlineTutorAnswer(ctx: TutorContext, question: string): string {
  const q = question.toLowerCase();
  const word = ctx.selectedWord?.replace(/[^\p{L}'-]/gu, "");
  const saved = word ? ctx.savedVocabulary?.find((v) => v.word.toLowerCase() === word.toLowerCase()) : undefined;
  const parts: string[] = [];

  if (word) {
    parts.push(`**${word}** — from the line “${ctx.currentCue ?? ctx.selectedSentence ?? ""}” at ${fmt(ctx.timestamp)}.`);
    if (saved?.definition) parts.push(`Meaning: ${saved.definition}${saved.translation ? ` (${ctx.learner.nativeLanguage}: ${saved.translation})` : ""}.`);
    else parts.push(`Look at the words around it: ${ctx.previousCues?.slice(-1)[0] ? `before it someone said “${ctx.previousCues.slice(-1)[0]}”; ` : ""}${ctx.nextCues?.[0] ? `right after, “${ctx.nextCues[0]}”.` : ""} Context like this usually tells you whether the word is positive or negative and what part of speech it is.`);
    if (ctx.translationCue) parts.push(`The ${ctx.learner.nativeLanguage} subtitle for this line is: “${ctx.translationCue}”. Find the matching chunk there.`);
    parts.push(`Try it: say the whole line aloud twice with slow replay, then write your own sentence with “${word}”.`);
  } else if (/translat|traduc|mean|signific/.test(q) && ctx.currentCue) {
    parts.push(`The current line is “${ctx.currentCue}”.`);
    if (ctx.translationCue) parts.push(`${ctx.learner.nativeLanguage} subtitle: “${ctx.translationCue}”.`);
    parts.push("Translate chunk by chunk rather than word by word — English fixes meaning with word order and phrasal chunks more than with endings.");
  } else if (/grammar|gramát|tense|verb/.test(q)) {
    const focus = ctx.segmentFocus?.grammar?.length ? ctx.segmentFocus.grammar.join(", ") : "the verb forms in the current line";
    parts.push(`This part of the lesson focuses on: ${focus}.`);
    if (ctx.currentCue) parts.push(`Look at “${ctx.currentCue}”: identify the subject, the verb form, and whether it refers to now, the past, or a plan. Then compare with how you would say it in ${ctx.learner.nativeLanguage}.`);
  } else if (/pronunc|pronunci|say|sound/.test(q)) {
    parts.push(`For pronunciation, use the slow-replay button on the current line${ctx.currentCue ? ` (“${ctx.currentCue}”)` : ""}. Mark the stressed words (nouns, verbs, adjectives) and let the small words (a, the, to, of) shrink. Then record yourself in a speaking activity.`);
    if (ctx.segmentFocus?.pronunciation?.length) parts.push(`Segment focus: ${ctx.segmentFocus.pronunciation.join(", ")}.`);
  } else {
    parts.push(`I'm working offline (no AI key configured), but I can still help with what's on screen${ctx.currentCue ? `: “${ctx.currentCue}”` : ""}.`);
    parts.push("Click any word in the subtitles or transcript for a grounded explanation, or ask me about the grammar, meaning or pronunciation of the current line.");
  }
  parts.push(`Level check: at ${ctx.learner.cefrLevel}, a good goal is to understand the whole line without the translation, then repeat it with the same rhythm as the speaker.`);
  return parts.join("\n\n");
}

export async function askTutor(ctx: TutorContext, history: TutorTurn[], question: string): Promise<{ answer: string; provider: string }> {
  if (aiProvider()) {
    try {
      const answer = await callModel(buildTutorMessages(ctx, history, question), { maxTokens: 500, temperature: 0.5 });
      return { answer, provider: aiProvider()! };
    } catch (err) {
      console.error("Tutor model error", err);
    }
  }
  return { answer: offlineTutorAnswer(ctx, question), provider: "offline" };
}
