/**
 * MadLibs — headless checks for the logic the browser cannot easily show.
 *
 *     npx tsx tools/verify-madlibs.ts
 *
 * The component itself is verified by playing the game; this file covers the
 * pure rules that sit behind it, because those are the ones a refactor breaks
 * silently:
 *
 *   • the grammar coach    — does each form actually get recognised?
 *   • the branching engine — are choices generated, and do beats fill in?
 *   • the AI-pack parser   — does it survive what teachers really paste?
 *   • the word bank        — collection, due dates, spaced repetition
 */
import { coachAnswer } from "../tutorly-games/adult/madlibs/src/games/madlibs/grammar";
import { branchesFor, fillBeat, synthesizeBranches } from "../tutorly-games/adult/madlibs/src/games/madlibs/branches";
import {
  collectWords,
  dueVocab,
  masteredCount,
  reviewWord,
  REVIEW_INTERVALS_DAYS,
  vocabCsv,
  vocabId,
  type VocabWord,
} from "../tutorly-games/adult/madlibs/src/games/madlibs/storage";
import { adaptLevel, difficultyLabel, hidesSuggestions, initialDifficulty, recordAnswer, suggestionLimit } from "../tutorly-games/adult/madlibs/src/games/madlibs/grammar";
import { parseMadlibsPack, validateMadlibsJson, buildMadlibsPrompt } from "../tutorly-games/adult/madlibs/src/gamePack";
import type { Blank, Template } from "../tutorly-games/adult/madlibs/src/games/madlibs/types";

let failures = 0;
let checks = 0;

function check(name: string, ok: boolean, detail = "") {
  checks++;
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const blank = (type: string, label: string, id = "1"): Blank => ({ id, label, type, suggestions: [] });

/* ── 1. the grammar coach ─────────────────────────────────────────────────── */
console.log("\ngrammar coach");
check("adverb accepts -ly", coachAnswer(blank("adverb", "Adverb"), "suspiciously").ok);
check("adverb rejects a plain noun", !coachAnswer(blank("adverb", "Adverb"), "banana").ok);
check(
  "adjective rejects an adverb",
  !coachAnswer(blank("adjective", "Adjective"), "happily").ok,
  coachAnswer(blank("adjective", "Adjective"), "happily").message,
);
check("adjective accepts describing word", coachAnswer(blank("adjective", "Adjective"), "enormous").ok);
check("-ing verb wants -ing", !coachAnswer(blank("verb", "Verb (-ing)"), "jump").ok);
check("-ing verb accepts jumping", coachAnswer(blank("verb", "Verb (-ing)"), "jumping").ok);
check("past verb accepts an irregular", coachAnswer(blank("verb", "Past Verb"), "went").ok);
check("past verb rejects the base form", !coachAnswer(blank("verb", "Past Verb"), "go").ok);
check("base verb rejects -ing", !coachAnswer(blank("verb", "Verb"), "running").ok);
check("number accepts digits", coachAnswer(blank("number", "Number"), "47").ok);
check("number rejects a word", !coachAnswer(blank("number", "Number"), "banana").ok);
check("place rejects an -ly adverb", !coachAnswer(blank("place", "Fantasy Kingdom Name"), "quickly").ok);
check("named character gets the proper-noun bonus", coachAnswer(blank("person", "Wizard Name"), "Merlin").tags.includes("+properNoun"));
check("empty input is never scoreable", !coachAnswer(blank("noun", "Noun"), "   ").ok);

/* ── 2. adaptive difficulty ──────────────────────────────────────────────── */
console.log("\nadaptive difficulty");
let diff = initialDifficulty;
for (let i = 0; i < 8; i++) diff = recordAnswer(diff, "adjective", true);
check("a hot streak reaches expert", diff.challenge === 2, difficultyLabel(diff));
check("expert mode hides the hints", hidesSuggestions(diff) && suggestionLimit(diff) === 0);
check("an expert class is pushed a band up", adaptLevel(diff, "B1") === "B2", adaptLevel(diff, "B1"));

let weak = initialDifficulty;
for (let i = 0; i < 8; i++) weak = recordAnswer(weak, "adverb", false);
check("a cold streak drops to assisted", weak.challenge === 0);
check("assisted mode offers extra hints", suggestionLimit(weak) === 8);
check("a struggling class is eased a band down", adaptLevel(weak, "B2") === "B1", adaptLevel(weak, "B2"));

/* ── 3. branching engine ─────────────────────────────────────────────────── */
console.log("\nbranching engine");
const template: Template = {
  id: "fantasy-hilarious-1",
  theme: "🐉 Fantasy",
  mood: "😂 Hilarious",
  cefrLevel: "B1",
  title: "The World's Worst Wizard",
  templateText: "A wizard named {1} cast a {2} spell.",
  blanks: [blank("person", "Wizard Name"), blank("adjective", "Type of Spell", "2")],
  reflectionQuestions: [],
  normalEnding: "The end.",
  absurdEnding: "The absurd end.",
};

const synth = synthesizeBranches(template);
check("three choices are generated", synth.length === 3, `got ${synth.length}`);
check("every choice has blanks", synth.every((b) => b.blanks.length === 3));
check("blank ids inside a branch are sequential", synth.every((b) => b.blanks.every((bl, i) => bl.id === String(i + 1))));
check(
  "a beat only uses placeholders its blanks provide",
  synth.every((b) => {
    const ids = new Set(b.blanks.map((bl) => bl.id));
    const used = new Set((b.beat.match(/\{(\d+)\}/g) ?? []).map((m) => m.slice(1, -1)));
    return [...used].every((id) => ids.has(id)) && used.size === b.blanks.length;
  }),
);
check(
  "synthesis is deterministic for a template",
  JSON.stringify(synthesizeBranches(template)) === JSON.stringify(synth),
);
check(
  "the fantasy pool is used, not the generic one",
  synth[0].blanks.some((b) => /wand|amulet|spoon|map|sword|dragon|forest|tower|lake|griffin|troll|phoenix|gargoyle/i.test(b.suggestions.join(" "))),
);
check("a template with its own branches keeps them", branchesFor({ ...template, branches: synth }).length === 3);

const filled = fillBeat(synth[0].beat, { "1": "cursed spoon", "2": "polite troll", "3": "mildly cursed" });
check("a beat fills every placeholder", !/\{\d+\}/.test(filled), filled);
check("the words land in the beat", filled.includes("cursed spoon") && filled.includes("polite troll"));
check("a missing word degrades to ___", fillBeat("go to {1} now", {}).includes("___"));
check("an unmatched placeholder never reaches the reader", !/\{\d+\}/.test(fillBeat("go to {1} via {9} now", { "1": "Rome" })));

/* ── 4. the word bank + spaced repetition ─────────────────────────────────── */
console.log("\nword bank");
const now = Date.now();
const story = { templateId: "t1", templateTitle: "The World's Worst Wizard" };
const first = collectWords([], [
  { word: "cursed spoon", type: "noun", ...story },
  { word: "Polite Troll", type: "person", ...story },
  { word: "cursed spoon", type: "noun", ...story },
], now);
check("duplicates collapse into one entry", first.bank.length === 2, `got ${first.bank.length}`);
check("case-insensitive matching", first.added.length === 1 + 1 && first.reused.length === 1);
check("a word is due immediately on day zero", REVIEW_INTERVALS_DAYS[0] === 0);

const second = collectWords(first.bank, [{ word: "cursed spoon", type: "noun", ...story }], now + 1000);
check("reusing a word does not create a second entry", second.bank.length === 2 && second.reused.length === 1);

const id = vocabId("cursed spoon");
const climbed = reviewWord(second.bank, id, true, now);
const climbedWord = climbed.find((v) => v.id === id) as VocabWord;
check("a remembered word climbs the schedule", climbedWord.strength === 1 && climbedWord.dueAt > now);
check("remembering is recorded", climbedWord.correct === 1 && climbedWord.reviews === 1);

const reset = reviewWord(climbed, id, false, now);
const resetWord = reset.find((v) => v.id === id) as VocabWord;
check("a forgotten word resets to day zero", resetWord.strength === 0 && resetWord.wrong === 1);
const dueAtNoon = dueVocab(climbed, now + 12 * 60 * 60 * 1000);
check("a remembered word is not due again the same day", !dueAtNoon.some((v) => v.id === id));
check("an unreviewed word is still waiting", dueAtNoon.some((v) => v.id !== id));
const dueTomorrow = dueVocab(climbed, now + 2 * 24 * 60 * 60 * 1000);
check("but the remembered one comes back the next day", dueTomorrow.some((v) => v.id === id));
check("mastery counts only long-lived words", masteredCount([{ ...climbedWord, strength: 4 }]) === 1);
check("the CSV export has a header and one row per word", vocabCsv(second.bank).split("\n").length === 3);

/* ── 5. the AI pack parser (tolerant by design) ───────────────────────────── */
console.log("\nAI pack parser");
const goodStory = {
  id: "fantasy-hilarious-1",
  theme: "🐉 Fantasy",
  mood: "😂 Hilarious",
  cefrLevel: "B1",
  title: "The Sneeze That Broke Reality",
  templateText: "A wizard sneezed {1} times and turned the king into a {2}.",
  blanks: [
    { id: "1", label: "Number", type: "number", suggestions: ["47", "three", "a million"] },
    { id: "2", label: "Funny Thing", type: "animal", suggestions: ["rubber duck", "corgi", "disco ball"] },
  ],
  reflectionQuestions: [
    "Find the past simple verbs.",
    "Rewrite the sentence in the present continuous.",
    "Which word is the object?",
  ],
  normalEnding: "The king forgave him after {1} apologies.",
  absurdEnding: "The kingdom banned {1} sneezes forever.",
  branches: [
    {
      id: "b1",
      label: "Chase the duck",
      tone: "absurd",
      beat: "They chased it to {1} where {2} was waiting.",
      blanks: [
        { id: "1", label: "New Place", type: "place", suggestions: ["the market"] },
        { id: "2", label: "New Person", type: "person", suggestions: ["a guard"] },
      ],
    },
  ],
};

const goodPack = JSON.stringify({ learnerInfo: { cefrLevel: "B1", lessonTopic: "Past Simple" }, madlibs: [goodStory] });
const parsed = parseMadlibsPack(goodPack);
check("a clean pack parses", parsed.ok, parsed.ok ? "" : "error" in parsed ? parsed.error : "");
if (parsed.ok) {
  const t = parsed.pack.payload.madlibs[0];
  check("the story survives intact", t.title === goodStory.title && t.blanks.length === 2);
  check("the learner level is carried through", parsed.pack.payload.learnerInfo?.cefrLevel === "B1");
  check("its branch is kept", (t.branches ?? []).length === 1);
}

const fenced = "```json\n" + goodPack + "\n```";
check("markdown fences are stripped", parseMadlibsPack(fenced).ok);

const nonSequential = JSON.stringify({
  madlibs: [
    {
      ...goodStory,
      templateText: "A wizard sneezed {a} times and became a {b}.",
      blanks: [
        { id: "a", label: "Number", type: "number", suggestions: [] },
        { id: "b", label: "Animal", type: "animal", suggestions: [] },
      ],
    },
  ],
});
const repaired = parseMadlibsPack(nonSequential);
check("non-sequential blank ids are renumbered", repaired.ok);
if (repaired.ok) {
  const t = repaired.pack.payload.madlibs[0];
  check("the text is rewritten to match", t.templateText === "A wizard sneezed {1} times and became a {2}." && t.blanks.map((b) => b.id).join(",") === "1,2");
}

const bareArray = parseMadlibsPack(JSON.stringify([goodStory]));
check("a bare array is accepted", bareArray.ok);
const nested = parseMadlibsPack(JSON.stringify({ pack: { madlibs: [goodStory] } }));
check("a nested pack object is accepted", nested.ok);
const unusable = parseMadlibsPack(JSON.stringify({ madlibs: [{ title: "no blanks at all" }] }));
check("a story that cannot be played is rejected", !unusable.ok);
check("broken JSON reports an error, not a crash", !parseMadlibsPack("{nope").ok);

const verdict = validateMadlibsJson(goodPack);
check("the verdict line names the counts", verdict.ok && /1 stories/.test(verdict.message), verdict.message);

/* ── 6. the prompt builder ───────────────────────────────────────────────── */
console.log("\nprompt builder");
const prompt = buildMadlibsPrompt({
  players: [
    { name: "Alice", emoji: "🦊", color: "#8b5cf6", facts: "loves football", from: "Berlin", isNPC: false, npcLines: "" },
    { name: "Bob", emoji: "🐼", color: "#ec4899", facts: "", from: "", isNPC: false, npcLines: "" },
  ],
  location: "a space station",
  level: "B2",
  topic: "Reported Speech",
});
check("the prompt names the class", prompt.includes("Alice") && prompt.includes("Bob"));
check("the prompt carries level and topic", prompt.includes("B2") && prompt.includes("Reported Speech"));
check("the prompt asks for branches", prompt.includes("branches") && prompt.includes("3 \"branches\" per story"));
check("the prompt pins the level's blank count", prompt.includes("12-16 blanks"));
check("the prompt demands JSON only", prompt.includes("no markdown fences"));

console.log(
  `\n${failures === 0 ? "✓" : "✗"} ${checks - failures}/${checks} checks passed` +
    (failures ? ` — ${failures} failure(s)` : " — the MadLibs rules behave as documented."),
);
process.exit(failures === 0 ? 0 : 1);
