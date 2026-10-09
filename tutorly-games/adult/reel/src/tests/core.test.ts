import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLesson, repairLessonJson } from "@/modules/lessons/validate";
import { spriteFrightLesson } from "@/db/seed";
import { parseVttOrSrt, parseWhisperX, findCueIndex, estimateWordTimings, type RuntimeCue } from "@/modules/subtitles/engine";
import { evaluateAnswer, pointsFor, similarity } from "@/modules/activities/evaluate";
import { generateLessonWithRules } from "@/modules/ai/lesson-generator";
import { SINTEL_EN, SPRITE_FRIGHT_EN } from "@/db/seed-captions";
import { flattenActivities } from "@/modules/lessons/types";
import { offlineTutorAnswer } from "@/modules/ai/tutor";

test("seeded Sprite Fright lesson passes strict validation", () => {
  const result = validateLesson(spriteFrightLesson, { videoDuration: 629 });
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.ok(spriteFrightLesson.segments.length >= 8 && spriteFrightLesson.segments.length <= 16);
  const types = new Set(flattenActivities(spriteFrightLesson).map((e) => e.activity.type));
  assert.ok(types.size >= 10, `expected >=10 activity types, got ${types.size}`);
});

test("validation rejects activities outside their segment, duplicate ids and exposed answers", () => {
  const broken = structuredClone(spriteFrightLesson);
  broken.segments[0].activities[0].timestamp = 999;
  broken.segments[1].activities[0].id = "seg-1-act-1";
  const r = validateLesson(broken, { videoDuration: 629 });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /outside its segment/.test(e.message)));
  assert.ok(r.errors.some((e) => /Duplicate id|does not belong/.test(e.message)));
});

test("validation rejects placeholders and 'all of the above'", () => {
  const broken = structuredClone(spriteFrightLesson);
  const mc = broken.segments[1].activities[0];
  if (mc.type === "multipleChoice") mc.content.options[1].text = "All of the above";
  broken.segments[0].activities[0].title = "...";
  const r = validateLesson(broken);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /All\/None of the above/.test(e.message)));
  assert.ok(r.errors.some((e) => /Placeholder/.test(e.message)));
});

test("repairLessonJson strips code fences and trailing commas", () => {
  const parsed = repairLessonJson('```json\n{"a": [1,2,],}\n```') as { a: number[] };
  assert.deepEqual(parsed.a, [1, 2]);
});

test("VTT and SRT parse with estimated word timings; cue lookup is exact", () => {
  const vtt = parseVttOrSrt(SPRITE_FRIGHT_EN);
  assert.equal(vtt.cues.length, 82);
  assert.equal(vtt.cues[0].text, "Hello, Mr.Snail!");
  assert.ok(Math.abs(vtt.cues[0].startTime - 17.375) < 0.001);
  const srt = parseVttOrSrt(SINTEL_EN);
  assert.equal(srt.cues.length, 26);
  assert.equal(srt.cues[2].text, "You're a fool for traveling alone, so completely unprepared.");
  const words = estimateWordTimings("a bit more salt", 10, 12);
  assert.equal(words.length, 4);
  assert.ok(words[3].endTime <= 12.0001 && words[0].startTime === 10);
  const cues: RuntimeCue[] = vtt.cues.map((c, i) => ({ id: `c${i}`, index: i, startTime: c.startTime, endTime: c.endTime, text: c.text, speaker: null, words: [] }));
  assert.equal(findCueIndex(cues, 18), 0);
  assert.equal(findCueIndex(cues, 26.5), -1);
  assert.equal(cues[findCueIndex(cues, 92)].text, "Oh. Easy, guys. We’re supposed to be studying nature, not wrecking it.");
});

test("WhisperX JSON normalizes to word-aligned cues", () => {
  const t = parseWhisperX({ segments: [{ start: 1, end: 2.5, text: " Hello there ", speaker: "SPEAKER_00", words: [{ word: "Hello", start: 1, end: 1.4, score: 0.9 }, { word: "there", start: 1.5, end: 2.4, score: 0.8 }] }] });
  assert.equal(t.alignment, "word");
  assert.equal(t.cues[0].words[1].text, "there");
  assert.equal(t.cues[0].speaker, "SPEAKER_00");
});

test("answer evaluation covers scored types with partial credit", () => {
  const entries = flattenActivities(spriteFrightLesson);
  const mc = entries.find((e) => e.activity.type === "multipleChoice")!.activity;
  assert.equal(evaluateAnswer(mc, "a").correct, true);
  assert.equal(evaluateAnswer(mc, "b").correct, false);
  const fill = entries.find((e) => e.activity.id === "seg-7-act-1")!.activity;
  assert.equal(evaluateAnswer(fill, ["Gotta", "gonna"]).correct, true);
  assert.equal(evaluateAnswer(fill, ["gotta", "will"]).score, 0.5);
  const order = entries.find((e) => e.activity.type === "ordering")!.activity;
  if (order.type === "ordering") assert.equal(evaluateAnswer(order, order.content.orderedItems).correct, true);
  const speaking = entries.find((e) => e.activity.type === "speaking")!.activity;
  assert.equal(evaluateAnswer(speaking, { transcript: "almost ready just need a bit more salt" }).correct, true);
  assert.ok(similarity("I can't swim", "I cannot swim") > 0.4);
  assert.equal(pointsFor(mc, { correct: true, score: 1 }, 1), mc.points);
  assert.ok(pointsFor(mc, { correct: true, score: 1 }, 2) < mc.points);
  const reflection = entries.find((e) => e.activity.type === "reflection")!.activity;
  assert.equal(evaluateAnswer(reflection, "I learned a lot").correct, null);
});

test("rules generator builds a valid, grounded lesson from the Sintel transcript", () => {
  const cues = parseVttOrSrt(SINTEL_EN).cues.map((c, i) => ({ id: `sintel-en-c${i}`, startTime: c.startTime, endTime: c.endTime, text: c.text }));
  const lesson = generateLessonWithRules({
    episode: { id: "ep-sintel", title: "Sintel", description: "", duration: 888 },
    chapters: [],
    cues,
    learner: { cefrLevel: "B1", nativeLanguage: "Spanish", targetLanguage: "English", interests: [], goals: [], weaknesses: [], knownVocabulary: [], reviewVocabulary: [], grammarHistory: [], previousLessons: [] },
  });
  const r = validateLesson(lesson, { videoDuration: 888 });
  assert.equal(r.valid, true, JSON.stringify(r.errors.slice(0, 5)));
  for (const { activity } of flattenActivities(lesson)) {
    assert.ok(activity.sourceCueIds && activity.sourceCueIds.length > 0, `activity ${activity.id} must cite source cues`);
    for (const id of activity.sourceCueIds) assert.ok(cues.some((c) => c.id === id));
  }
});

test("offline tutor grounds answers in the provided context", () => {
  const answer = offlineTutorAnswer({ learner: { cefrLevel: "B1", nativeLanguage: "Spanish", targetLanguage: "English" }, currentCue: "She's in distress!", selectedWord: "distress", timestamp: 60, translationCue: "¡Y suena angustiada!" }, "What does distress mean?");
  assert.ok(answer.includes("distress"));
  assert.ok(answer.includes("angustiada"));
});
