import { ACTIVITY_META, ACTIVITY_TYPES, type Activity, type ActivityBase, type ActivityType, type CEFRLevel, type LessonSegment, type VideoLesson } from "@/modules/lessons/types";
import { repairLessonJson, validateLesson, type ValidationResult } from "@/modules/lessons/validate";
import { aiProvider, callModel } from "./model";

export type TranscriptCue = { id: string; startTime: number; endTime: number; text: string; speaker?: string | null };
export type GeneratorLearner = {
  cefrLevel: CEFRLevel;
  nativeLanguage: string;
  targetLanguage: string;
  interests: string[];
  goals: string[];
  weaknesses: string[];
  knownVocabulary: string[];
  reviewVocabulary: string[];
  grammarHistory: { name: string; status: string }[];
  previousLessons: string[];
};
export type GeneratorInput = {
  episode: { id: string; title: string; description: string; duration: number; courseId?: string | null; seriesId?: string | null; seasonId?: string | null; videoUrl?: string };
  chapters: { title: string; startTime: number; endTime: number }[];
  cues: TranscriptCue[];
  learner: GeneratorLearner;
  objectivesHint?: string;
};

export type GeneratorOutput = { lesson: VideoLesson; generatedBy: "ai" | "rules"; validation: ValidationResult; attempts: number; notes: string[] };

/* ------------------------------------------------------------------ */
/* Prompt construction (structured data → strict JSON instructions)     */
/* ------------------------------------------------------------------ */

export function buildLessonPrompt(input: GeneratorInput): { system: string; user: string } {
  const { learner, episode } = input;
  const transcript = input.cues.map((c) => `[${c.id} ${c.startTime.toFixed(1)}-${c.endTime.toFixed(1)}] ${c.speaker ? c.speaker + ": " : ""}${c.text}`).join("\n");
  const chapters = input.chapters.map((c) => `${c.startTime}-${c.endTime}: ${c.title}`).join("\n");
  const system = `You are an expert CEFR-aware language-course designer producing videoLessonInteractive JSON.
Return ONLY valid JSON (no markdown, no commentary). The JSON must match this contract exactly:
{ "metadata": {title, lessonType:"videoLessonInteractive", targetLanguage, nativeLanguage, cefrLevel, estimatedDurationSeconds, episodeId, generatedBy:"ai", reviewRatio},
  "globalSettings": {pointsToLevelUp:500, enableStreak:true, suspenseSounds:true, allowRetry:true, showProgress:true, showXP:true},
  "badges": [{id,name,emoji,rarity,condition,description}], "learnerProfile": {cefrLevel,nativeLanguage,targetLanguage,interests,goals},
  "objectives": [string...], "segments": [{id:"seg-N", title, startTime, endTime, summary, focus:{grammar[],vocabulary[],pronunciation[]}, activities:[...]}],
  "settings": {lessonName, lessonTimeRange, teacherNotes, homeworkChecklist, materialLinks} }
Activity shape: {id:"seg-N-act-M", type, timestamp, title, emoji, color, points(5-25 by difficulty: easy 5-10, medium 10-15, hard 15-25), requiredForNext, difficulty, kind, correctFeedback, incorrectFeedback, comprehensiveFeedback(5x more detailed: answer, grammar, vocabulary, translation mapping, common mistake, natural usage, extra example, memory aid, why distractors are wrong), sourceCueIds:[cue ids], sourceText, vocabulary[], grammar[], pronunciation[], content}.
Content schemas by type:
flashcard {cards:[{front,back,pronunciation,translation,example}]}; multipleChoice {question, options:[{id,text,isCorrect}] (3-5)}; trueFalse {question, answer:boolean};
fillBlanks {sentence with ___, blanks:[...], hint}; dragDrop {items:[{id,text}], targets:[{id,label}], pairs:[{itemId,targetId}]}; matching {pairs:[{left,right}]};
speaking {expectedSentence, translation, tip}; truthOrDare {truth, dare}; wouldYouRather {wouldYouOption1, wouldYouOption2}; discussion {discussionPrompt, guidingQuestions[]};
predictNext {question, predictOptions:[{text, consequence, isCorrect?}]}; voiceOver {question, line, startTime, endTime}; ordering {orderedItems:[chunks in correct order], instruction};
wordScramble {scrambledWord, correctWord, hint}; reflection {reflectionPrompt}; hotspot {hotspot:{x,y,question,options}}; videoPause {videoPausePrompt, modelAnswer};
readingChallenge {reading:{title, genre: fiction|factual|whatIf, text(>=60 words), translation, questions:[{id,question,options}]}};
listeningComprehension {listening:{title, genre: podcast|dialogue|talk|interview|story, audioText, showTranscript:false, questions:[...]}}.
HARD RULES: 8-16 segments that follow the real chapter/scene structure; every activity timestamp inside its segment; at least one activity per segment; never the same type twice in a row; use >=10 distinct types;
ground everything in the transcript (quote real lines, cite sourceCueIds; never invent dialogue); match the learner's CEFR level; recycle 20-30% review material from the learner history;
multiple choice: exactly one correct option, similar option lengths (±2 words), correct answer position distributed evenly, plausible same-topic distractors, no "all/none of the above", never repeat the answer inside the question;
no placeholders, no empty content. Feedback must explain why, not just say correct/wrong.`;
  const user = `LEARNER: CEFR ${learner.cefrLevel}, native ${learner.nativeLanguage}, target ${learner.targetLanguage}. Interests: ${learner.interests.join(", ") || "n/a"}. Goals: ${learner.goals.join(", ") || "n/a"}. Weaknesses: ${learner.weaknesses.join(", ") || "n/a"}.
KNOWN VOCABULARY (avoid re-teaching): ${learner.knownVocabulary.slice(0, 40).join(", ") || "none"}.
REVIEW VOCABULARY (recycle): ${learner.reviewVocabulary.slice(0, 20).join(", ") || "none"}.
GRAMMAR HISTORY: ${learner.grammarHistory.map((g) => `${g.name} (${g.status})`).join(", ") || "none"}.
PREVIOUS LESSONS: ${learner.previousLessons.join(" | ") || "none"}.
EPISODE: ${episode.title} (${episode.duration}s) — ${episode.description}
CHAPTERS:\n${chapters || "none"}
TRANSCRIPT (cue id, start-end seconds, text):\n${transcript}
${input.objectivesHint ? `LESSON GOALS: ${input.objectivesHint}` : ""}
Produce the complete lesson JSON now.`;
  return { system, user };
}

/* ------------------------------------------------------------------ */
/* Rules-based fallback generator (always grounded in the transcript)  */
/* ------------------------------------------------------------------ */

const STOP = new Set("the a an and or but so if of to in on at for with from by as is are was were be been being am do does did have has had not no yes it its this that these those i you he she we they me him her us them my your his our their what which who whom when where why how all any some can could will would should may might must just very really there here then than too also oh ah uh um hey yeah ok okay let's get got go going gonna gotta come came".split(" "));

function words(text: string) {
  return text
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}
function contentWords(text: string) {
  return words(text).filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase()));
}
function shuffleDeterministic<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function scramble(word: string, seed: number) {
  let out = word;
  let tries = 0;
  while (out.toLowerCase() === word.toLowerCase() && tries < 10) {
    out = shuffleDeterministic(word.split(""), seed + tries).join("");
    tries++;
  }
  return out;
}
function short(t: string, n = 60) {
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function baseFor<T extends ActivityType>(type: T, segId: string, idx: number, timestamp: number, title: string, difficulty: "easy" | "medium" | "hard", source: TranscriptCue[]): Omit<ActivityBase<T>, "content" | "correctFeedback" | "incorrectFeedback" | "comprehensiveFeedback"> {
  const meta = ACTIVITY_META[type];
  const points = difficulty === "easy" ? 8 : difficulty === "medium" ? 12 : 18;
  return {
    id: `${segId}-act-${idx}`,
    type,
    timestamp,
    title,
    emoji: meta.emoji,
    color: meta.color,
    points,
    requiredForNext: meta.scored && difficulty !== "easy",
    difficulty,
    kind: "core",
    skill: meta.skill,
    sourceCueIds: source.map((c) => c.id),
    sourceText: source.map((c) => c.text).join(" "),
  };
}

function feedback(kind: string, line: string, extra: string) {
  return {
    correctFeedback: `Well done — you handled the ${kind} correctly. The original line was: “${line}”.`,
    incorrectFeedback: `Not yet. Replay the line with slow replay and listen again: “${line}”. ${extra}`,
    comprehensiveFeedback: `Context: this activity is built from the actual line “${line}” spoken in the video. ${extra} Strategy: use sentence replay to hear the rhythm, then say the line aloud twice — once slowly, once at natural speed. Notice which words are stressed (content words) and which are reduced (articles, prepositions, pronouns). Translate the whole chunk, not word by word, and write one personal example sentence using the key vocabulary so it moves from recognition to production.`,
  };
}

export function generateLessonWithRules(input: GeneratorInput): VideoLesson {
  const { episode, learner } = input;
  const cues = [...input.cues].sort((a, b) => a.startTime - b.startTime);
  if (cues.length < 4) throw new Error("Transcript too short to generate a grounded lesson (need at least 4 cues). Import subtitles or a WhisperX transcript first.");
  const duration = episode.duration || cues[cues.length - 1].endTime + 5;

  // Segment boundaries: use chapters if 6+, else split dialogue span evenly into 8 segments.
  let bounds: { title: string; startTime: number; endTime: number }[] = input.chapters.filter((c) => c.endTime - c.startTime > 20 && c.title.toLowerCase() !== "credits");
  if (bounds.length < 6) {
    const n = 8;
    const first = Math.max(0, cues[0].startTime - 5);
    const last = Math.min(duration, cues[cues.length - 1].endTime + 5);
    const step = (last - first) / n;
    bounds = Array.from({ length: n }, (_, i) => ({ title: `Scene ${i + 1}`, startTime: Math.round(first + i * step), endTime: Math.round(first + (i + 1) * step) }));
  }
  bounds = bounds.slice(0, 16);

  const allContent = Array.from(new Set(cues.flatMap((c) => contentWords(c.text).map((w) => w.toLowerCase()))));
  const typeCycle: ActivityType[] = ["flashcard", "multipleChoice", "fillBlanks", "predictNext", "ordering", "trueFalse", "speaking", "wordScramble", "matching", "discussion", "listeningComprehension", "videoPause", "dragDrop", "reflection", "wouldYouRather", "hotspot"];
  let lastType: ActivityType | null = null;
  let mcSlot = 0;
  const segments: LessonSegment[] = [];
  let segNo = 0;

  bounds.forEach((b, bi) => {
    const segCues = cues.filter((c) => c.startTime >= b.startTime && c.startTime < b.endTime);
    if (!segCues.length) return;
    segNo++;
    const segId = `seg-${segNo}`;
    const vocab = Array.from(new Set(segCues.flatMap((c) => contentWords(c.text).map((w) => w.toLowerCase())))).slice(0, 5);
    const activities: Activity[] = [];
    const endT = Math.min(b.endTime, duration);
    const stamp = (cue: TranscriptCue) => Math.min(endT - 0.5, Math.max(b.startTime, cue.endTime + 0.4));

    // choose 1-3 activities per segment with rotating types
    const perSeg = segCues.length >= 4 ? 3 : segCues.length >= 2 ? 2 : 1;
    let made = 0;
    let cursor = bi * 3;
    let guard = 0;
    while (made < perSeg && guard < 40) {
      guard++;
      const type = typeCycle[cursor % typeCycle.length];
      cursor++;
      if (type === lastType) continue;
      const cue = segCues[Math.min(segCues.length - 1, made)];
      const t = stamp(cue);
      const idx = made + 1;
      const line = cue.text;
      let act: Activity | null = null;
      const fb = feedback(ACTIVITY_META[type].label.toLowerCase(), line, `Key vocabulary: ${vocab.slice(0, 3).join(", ") || "n/a"}.`);

      switch (type) {
        case "flashcard": {
          const cards = vocab.slice(0, 4).map((w) => ({ front: w, back: `Word from the line: “${short(segCues.find((c) => c.text.toLowerCase().includes(w))?.text ?? line)}”`, example: segCues.find((c) => c.text.toLowerCase().includes(w))?.text ?? line }));
          if (cards.length < 2) break;
          act = { ...baseFor("flashcard", segId, idx, t, "Words from this scene", "easy", segCues), ...fb, vocabulary: cards.map((c) => c.front), content: { cards } };
          break;
        }
        case "multipleChoice": {
          const wc = words(line).length;
          const distractors = cues.filter((c) => !segCues.includes(c) && Math.abs(words(c.text).length - wc) <= 2 && c.text !== line).slice(0, 3);
          if (distractors.length < 2) break;
          const opts = [{ text: line, isCorrect: true }, ...distractors.map((d) => ({ text: d.text, isCorrect: false }))];
          const pos = mcSlot++ % opts.length;
          const arranged = [...opts.filter((o) => !o.isCorrect)];
          arranged.splice(pos, 0, opts[0]);
          act = {
            ...baseFor("multipleChoice", segId, idx, t, "Which line did you just hear?", "medium", [cue]),
            ...fb,
            vocabulary: vocab.slice(0, 2),
            content: { question: "Which of these lines is spoken in the scene you just watched?", options: arranged.map((o, i) => ({ id: "abcde"[i], text: o.text, isCorrect: o.isCorrect })) },
          };
          break;
        }
        case "fillBlanks": {
          const cw = contentWords(line);
          if (!cw.length) break;
          const target = cw[cw.length - 1];
          const sentence = line.replace(new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`), "___");
          if (!sentence.includes("___")) break;
          act = { ...baseFor("fillBlanks", segId, idx, t, "Complete the line", "medium", [cue]), ...fb, vocabulary: [target.toLowerCase()], content: { sentence, blanks: [target], hint: `${target.length} letters, starts with “${target[0]}”` } };
          break;
        }
        case "predictNext": {
          const next = cues[cues.indexOf(cue) + 1];
          const others = cues.filter((c) => c !== next && c !== cue && Math.abs(words(c.text).length - words(next?.text ?? "").length) <= 3).slice(0, 2);
          if (!next || others.length < 2) break;
          const opts = shuffleDeterministic([{ text: next.text, consequence: `Yes — that is exactly the next line at ${next.startTime.toFixed(0)}s.`, isCorrect: true }, ...others.map((o) => ({ text: o.text, consequence: `Not this one — this line appears elsewhere in the video (${o.startTime.toFixed(0)}s).` }))], segNo * 7 + idx);
          act = { ...baseFor("predictNext", segId, idx, t, "What comes next?", "easy", [cue]), ...fb, content: { question: `After “${short(line)}”, which line comes next?`, predictOptions: opts } };
          break;
        }
        case "ordering": {
          const w = words(line);
          if (w.length < 4 || w.length > 9) break;
          const chunks: string[] = [];
          for (let i = 0; i < w.length; i += 2) chunks.push(w.slice(i, i + 2).join(" "));
          if (chunks.length < 3 || new Set(chunks).size !== chunks.length) break;
          act = { ...baseFor("ordering", segId, idx, t, "Rebuild the sentence", "medium", [cue]), ...fb, grammar: ["word order"], content: { orderedItems: chunks, instruction: "Put the chunks in the order you heard them." } };
          break;
        }
        case "trueFalse": {
          const cw = contentWords(line);
          const swap = allContent.find((w) => !line.toLowerCase().includes(w) && w.length >= 4);
          const makeFalse = segNo % 2 === 0 && cw.length && swap;
          const statement = makeFalse ? line.replace(new RegExp(`\\b${cw[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`), swap!) : line;
          act = { ...baseFor("trueFalse", segId, idx, t, "Did you hear it right?", "easy", [cue]), ...fb, content: { question: `In this scene, someone says: “${statement}”`, answer: !makeFalse } };
          break;
        }
        case "speaking": {
          if (words(line).length < 3) break;
          act = { ...baseFor("speaking", segId, idx, t, "Say the line", "medium", [cue]), ...fb, pronunciation: ["sentence stress"], content: { expectedSentence: line, tip: "Copy the speaker's rhythm before worrying about every sound." } };
          break;
        }
        case "wordScramble": {
          const target = vocab.find((w) => w.length >= 5 && /^[a-z]+$/.test(w));
          if (!target) break;
          act = { ...baseFor("wordScramble", segId, idx, t, "Unscramble the word", "easy", segCues), ...fb, vocabulary: [target], content: { scrambledWord: scramble(target, segNo * 13 + idx), correctWord: target, hint: `You heard it in: “${short(segCues.find((c) => c.text.toLowerCase().includes(target))?.text ?? line)}”` } };
          break;
        }
        case "matching": {
          const pairs = segCues.slice(0, 4).map((c) => ({ left: contentWords(c.text)[0] ?? words(c.text)[0], right: short(c.text, 50) })).filter((p) => p.left);
          if (pairs.length < 2 || new Set(pairs.map((p) => p.left.toLowerCase())).size !== pairs.length) break;
          act = { ...baseFor("matching", segId, idx, t, "Match the word to its line", "medium", segCues), ...fb, vocabulary: pairs.map((p) => p.left.toLowerCase()), content: { pairs } };
          break;
        }
        case "discussion":
          act = { ...baseFor("discussion", segId, idx, t, "Talk about the scene", "medium", segCues), ...fb, content: { discussionPrompt: `Someone says “${short(line)}”. Why do they say it, and how would you react in their place? Speak for one minute.`, guidingQuestions: ["Who is speaking and to whom?", "What emotion do you hear?", "What would you say next?"] } };
          break;
        case "listeningComprehension": {
          if (segCues.length < 3) break;
          const lines = segCues.slice(0, 4);
          const first = lines[0];
          const opts = shuffleDeterministic(lines.slice(0, 3).map((c) => ({ text: c.text, isCorrect: c === first })), segNo * 5);
          act = {
            ...baseFor("listeningComprehension", segId, idx, t, "Listen to the scene again", "medium", lines),
            ...fb,
            content: { listening: { title: `Scene ${segNo}: ${b.title}`, genre: "dialogue", audioText: lines.map((c) => c.text).join(" "), showTranscript: false, questions: [{ id: "q1", question: "Which line did the speakers say first?", options: opts.map((o, i) => ({ id: "abc"[i], text: o.text, isCorrect: o.isCorrect })) }] } },
          };
          break;
        }
        case "videoPause":
          act = { ...baseFor("videoPause", segId, idx, t, "Freeze frame", "easy", [cue]), ...fb, content: { videoPausePrompt: `Pause here. Describe what is happening on screen in two sentences, then guess how the character feels when saying “${short(line)}”.` } };
          break;
        case "dragDrop": {
          const inScene = vocab.slice(0, 3);
          const outScene = allContent.filter((w) => !inScene.includes(w) && !segCues.some((c) => c.text.toLowerCase().includes(w))).slice(0, 3);
          if (inScene.length < 2 || outScene.length < 2) break;
          const items = [...inScene.map((w, i) => ({ id: `in${i}`, text: w })), ...outScene.map((w, i) => ({ id: `out${i}`, text: w }))];
          act = {
            ...baseFor("dragDrop", segId, idx, t, "Heard it here?", "medium", segCues),
            ...fb,
            vocabulary: inScene,
            content: { items: shuffleDeterministic(items, segNo), targets: [{ id: "here", label: "Said in this scene" }, { id: "elsewhere", label: "Said in another scene" }], pairs: items.map((it) => ({ itemId: it.id, targetId: it.id.startsWith("in") ? "here" : "elsewhere" })) },
          };
          break;
        }
        case "reflection":
          act = { ...baseFor("reflection", segId, idx, t, "Quick reflection", "easy", segCues), ...fb, content: { reflectionPrompt: `Which word or phrase from this part of “${episode.title}” was new for you? Write it down with a translation into ${learner.nativeLanguage}.` } };
          break;
        case "wouldYouRather":
          act = { ...baseFor("wouldYouRather", segId, idx, t, "Would you rather…", "easy", [cue]), ...fb, content: { wouldYouOption1: `say “${short(line, 40)}” to a close friend`, wouldYouOption2: `hear someone say “${short(line, 40)}” to you` } };
          break;
        case "hotspot": {
          const wc = words(line).length;
          const distractors = cues.filter((c) => !segCues.includes(c) && Math.abs(words(c.text).length - wc) <= 2).slice(0, 2);
          if (distractors.length < 2) break;
          const opts = shuffleDeterministic([{ text: line, isCorrect: true }, ...distractors.map((d) => ({ text: d.text, isCorrect: false }))], segNo * 3 + idx);
          act = { ...baseFor("hotspot", segId, idx, t, "Tap the speaker", "easy", [cue]), ...fb, content: { hotspot: { x: 50, y: 50, question: "Tap the screen: which line is being said at this moment?", options: opts.map((o, i) => ({ id: "abc"[i], text: o.text, isCorrect: o.isCorrect })) } } };
          break;
        }
        default:
          break;
      }
      if (act) {
        activities.push(act);
        lastType = type;
        made++;
      }
    }
    if (!activities.length) {
      const cue = segCues[0];
      const fb = feedback("discussion", cue.text, "");
      activities.push({ ...baseFor("discussion", segId, 1, stamp(cue), "Talk about the scene", "easy", segCues), ...fb, content: { discussionPrompt: `What is happening when someone says “${short(cue.text)}”? Describe the moment in your own words.` } });
      lastType = "discussion";
    }
    activities.sort((a, b2) => a.timestamp - b2.timestamp);
    segments.push({ id: segId, title: b.title, startTime: b.startTime, endTime: endT, summary: `${segCues.length} spoken lines`, focus: { grammar: activities.flatMap((a) => a.grammar ?? []).slice(0, 2), vocabulary: vocab, pronunciation: activities.flatMap((a) => a.pronunciation ?? []).slice(0, 2) }, activities });
  });

  if (!segments.length) throw new Error("Could not build segments from the transcript.");

  return {
    metadata: { title: `${episode.title} — Grounded Video Lesson`, lessonType: "videoLessonInteractive", targetLanguage: learner.targetLanguage, nativeLanguage: learner.nativeLanguage, cefrLevel: learner.cefrLevel, estimatedDurationSeconds: Math.round(duration * 3), episodeId: episode.id, courseId: episode.courseId ?? undefined, seriesId: episode.seriesId ?? undefined, seasonId: episode.seasonId ?? undefined, videoUrl: episode.videoUrl, generatedBy: "rules", reviewRatio: 0.2 },
    globalSettings: { pointsToLevelUp: 500, enableStreak: true, suspenseSounds: true, allowRetry: true, showProgress: true, showXP: true },
    badges: [{ id: "first-step", name: "First Step", emoji: "👣", rarity: "common", condition: "activities_completed>=1", description: "Complete your first activity." }],
    learnerProfile: { cefrLevel: learner.cefrLevel, nativeLanguage: learner.nativeLanguage, targetLanguage: learner.targetLanguage, interests: learner.interests, goals: learner.goals },
    objectives: [
      `Understand the key spoken lines of “${episode.title}” at ${learner.cefrLevel} level.`,
      `Recognise ${Math.min(allContent.length, 12)} content words from the actual dialogue.`,
      "Rebuild real sentences from the video with correct word order.",
      "Say at least one line with natural rhythm and stress.",
    ],
    segments,
    settings: { lessonName: `${episode.title} — Grounded Video Lesson`, lessonTimeRange: "30–45 minutes", teacherNotes: "Generated by the rules engine from the real transcript. Every activity cites its source cues.", homeworkChecklist: "Review the flashcards; record one spoken line; write three sentences with new words.", materialLinks: episode.videoUrl ?? "" },
  };
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

export async function generateLesson(input: GeneratorInput): Promise<GeneratorOutput> {
  const notes: string[] = [];
  const duration = input.episode.duration;

  if (aiProvider()) {
    const { system, user } = buildLessonPrompt(input);
    let lastErrors: string[] = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const messages = [
          { role: "system" as const, content: system },
          { role: "user" as const, content: attempt === 1 ? user : `${user}\n\nYour previous output failed validation with these errors, fix them and return the full corrected JSON:\n${lastErrors.join("\n")}` },
        ];
        const raw = await callModel(messages, { json: true, maxTokens: 12000, temperature: 0.6 });
        const parsed = repairLessonJson(raw);
        const validation = validateLesson(parsed, { videoDuration: duration });
        if (validation.valid && validation.lesson) {
          notes.push(`AI lesson accepted on attempt ${attempt} (${validation.warnings.length} warnings).`);
          return { lesson: validation.lesson, generatedBy: "ai", validation, attempts: attempt, notes };
        }
        lastErrors = validation.errors.slice(0, 12).map((e) => `${e.path}: ${e.message}`);
        notes.push(`AI attempt ${attempt} rejected: ${lastErrors.length} errors.`);
      } catch (err) {
        notes.push(`AI attempt ${attempt} failed: ${(err as Error).message}`);
      }
    }
    notes.push("Falling back to the transcript-grounded rules generator.");
  } else {
    notes.push("No AI provider configured (set OPENAI_API_KEY or ANTHROPIC_API_KEY) — using the transcript-grounded rules generator.");
  }

  const lesson = generateLessonWithRules(input);
  const validation = validateLesson(lesson, { videoDuration: duration });
  if (!validation.valid) throw new Error(`Rules generator produced an invalid lesson: ${validation.errors.map((e) => `${e.path}: ${e.message}`).slice(0, 5).join("; ")}`);
  return { lesson: validation.lesson!, generatedBy: "rules", validation, attempts: 1, notes };
}

export const SUPPORTED_ACTIVITY_TYPES = ACTIVITY_TYPES;
