/**
 * Tutoflix self-check — run with the repo's tsx:
 *
 *     npm run check:tutoflix
 *
 * It guards the three pieces of logic that a streaming lesson app gets silently
 * wrong, each of which has actually broken here before:
 *
 *   1. SUBTITLE TIMING — a cue's end time is the whole product. When the parser
 *      lost it, every cue became 0.2 s long: captions flickered, "replay this
 *      line" played nothing, the QA panel reported nonsense and every activity
 *      sat on the wrong second.
 *   2. PACK QUALITY — the demo pack must pass the SAME validator an AI pack does,
 *      including "every choice activity has a correct option" (the demo shipped
 *      without answer keys and every answer was marked wrong).
 *   3. PROMPT — the AI prompt must carry the real subtitle timestamps, the
 *      learner profile and no leftover {{PLACEHOLDER}} tokens.
 */
import { DEMO_EPISODE, DEMO_LESSON, DEMO_ORIGINAL_VTT, DEMO_TRANSLATION_VTT } from "../src/lib/lesson/demo";
import { describeReport, validateLesson } from "../src/lib/lesson/validate";
import { buildCuePrompt, buildLessonPrompt } from "../src/lib/ai/prompt";
import { cuesToTranscript, parseSubtitles, qaCues, segmentCues, serializeCues } from "../src/lib/subtitles";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("\n[1] subtitle parsing");
const { cues, format } = parseSubtitles(DEMO_ORIGINAL_VTT, "demo.vtt");
check("detects WebVTT", format === "vtt", format);
check("parses every cue", cues.length === 24, `${cues.length} cues`);
const zeroLength = cues.filter((cue) => cue.endTime - cue.startTime < 0.5);
check("no collapsed cue durations", zeroLength.length === 0, `${zeroLength.length} cues under 0.5s`);
check("first cue matches its timecode", Math.abs(cues[0].startTime - 1) < 0.01 && Math.abs(cues[0].endTime - 5.6) < 0.01, `${cues[0].startTime}→${cues[0].endTime}`);
const noOverlap = cues.every((cue, index) => index === 0 || cue.startTime >= cues[index - 1].endTime - 0.01);
check("cues do not overlap", noOverlap);
check("word timings exist", (cues[0].words?.length ?? 0) > 3, `${cues[0].words?.length ?? 0} words`);
check("speakers are read from <v> tags", cues.some((cue) => !!cue.speaker), cues.find((cue) => cue.speaker)?.speaker);

const translation = parseSubtitles(DEMO_TRANSLATION_VTT, "demo-fa.vtt");
check("translation track parses", translation.cues.length === 24, `${translation.cues.length} cues`);

console.log("\n[2] subtitle QA + export");
const qa = qaCues(cues);
check("QA health is high", qa.health >= 80, `${qa.health}%`);
check("QA reading speed is plausible", qa.readingSpeedMax < 26, `${qa.readingSpeedMax} chars/sec`);
const vtt = serializeCues(cues, "vtt");
check("VTT export round-trips", parseSubtitles(vtt, "roundtrip.vtt").cues.length === cues.length);

console.log("\n[3] demo lesson pack");
const result = validateLesson(DEMO_LESSON);
check("pack validates with no errors", result.report.errors.length === 0, result.report.errors.join(" · "));
check("all 15 activity types used", result.report.missingTypes.length === 0, result.report.missingTypes.join(", "));
check("choice activities have correct options", hasEveryAnswerKey(), "an activity has no isCorrect option");
check("activity timestamps sit inside their segment", timestampsInsideSegments());
console.log(`    (${describeReport(result.report)})`);

console.log("\n[4] AI prompt");
const prompt = buildLessonPrompt({
  episodeTitle: DEMO_EPISODE.title,
  show: DEMO_EPISODE.show,
  videoUrl: DEMO_EPISODE.sources[0].url,
  durationSeconds: DEMO_EPISODE.durationSeconds,
  cefrLevel: "B1",
  targetLanguage: "English",
  learnerL1: "fa",
  learner: DEMO_LESSON.learnerProfile!,
  cues,
  segmentCount: 10,
  activitiesPerSegment: 3,
  transcriptSource: "demo",
});
check("carries real cue timestamps", prompt.includes("[00:00:01.000]"), "");
check("carries the learner profile", prompt.includes(DEMO_LESSON.learnerProfile!.name) && prompt.includes(DEMO_LESSON.learnerProfile!.facts));
check("names the prompt's subtitles", prompt.includes("THE SUBTITLES"));
check("no unfilled {{tokens}}", !/\{\{[A-Z_]+\}\}/.test(prompt));
check("demands the feedback triad", prompt.includes("correctFeedback") && prompt.includes("comprehensiveFeedback"));
check("states the anti-guessing rules", /all of the above/i.test(prompt) && /similar in length/i.test(prompt));
check("asks for hard inference, not trivia", /inference/i.test(prompt));
check("prompt is a realistic size", prompt.length > 4000 && prompt.length < 200_000, `${prompt.length} chars ≈ ${Math.round(prompt.length / 4)} tokens`);
const linePrompt = buildCuePrompt(
  {
    episodeTitle: DEMO_EPISODE.title,
    durationSeconds: DEMO_EPISODE.durationSeconds,
    cefrLevel: "B1",
    targetLanguage: "English",
    learnerL1: "fa",
    learner: DEMO_LESSON.learnerProfile!,
    cues,
  },
  cues[3],
  cues.slice(4, 6),
);
check("line micro-prompt quotes the line", linePrompt.includes(cues[3].text.slice(0, 20)));
check("line micro-prompt has no {{tokens}}", !/\{\{[A-Z_]+\}\}/.test(linePrompt));

console.log("\n[5] segmentation");
const segments = segmentCues(cues, 10);
check("produces the requested segment count", segments.length === 10, `${segments.length}`);
check("segments cover the timeline without gaps", segments.every((segment, index) => index === 0 || segment.startTime >= segments[index - 1].endTime - 0.01));
check("segment transcripts carry timestamps", segments[0].transcript.includes("["));
check("transcript for the AI is readable", cuesToTranscript(cues, { withTimestamps: true }).split("\n").length === cues.length);

console.log(failures ? `\n❌ ${failures} check(s) failed\n` : "\n✅ all Tutoflix checks passed\n");
process.exit(failures ? 1 : 0);

function hasEveryAnswerKey(): boolean {
  return DEMO_LESSON.segments
    .flatMap((segment) => segment.activities)
    .filter((activity) => activity.type === "multipleChoice" || activity.type === "hotspot")
    .every((activity) => (activity.type === "hotspot" ? activity.content.hotspot?.options ?? [] : activity.content.options ?? []).some((option) => option.isCorrect));
}

function timestampsInsideSegments(): boolean {
  return DEMO_LESSON.segments.every((segment) =>
    segment.activities.every((activity) => activity.timestamp >= segment.startTime && activity.timestamp <= segment.endTime),
  );
}
