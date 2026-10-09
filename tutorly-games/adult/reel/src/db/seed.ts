import "dotenv/config";
import { db } from "@/db";
import {
  badges,
  chapters,
  courses,
  episodes,
  grammarItems,
  learnerProfiles,
  learningHistory,
  providers,
  seasons,
  series,
  skipSegments,
  subtitleCues,
  subtitleTracks,
  subtitleWords,
  userPlayerPreferences,
  userStreaks,
  users,
  videoSources,
  vocabularyItems,
  type BadgeCondition,
} from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { parseVttOrSrt } from "@/modules/subtitles/engine";
import { persistLesson } from "@/modules/lessons/repository";
import { ACTIVITY_META, type Activity, type ActivityBase, type ActivityType, type VideoLesson } from "@/modules/lessons/types";
import { SPRITE_FRIGHT_EN, SPRITE_FRIGHT_ES, SPRITE_FRIGHT_CHAPTERS, SINTEL_EN } from "./seed-captions";

export const DEMO_USER_ID = "user-demo-lucia";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function A<T extends ActivityType>(
  type: T,
  a: Omit<ActivityBase<T>, "type" | "emoji" | "color" | "skill"> & { emoji?: string; color?: string },
): ActivityBase<T> {
  const meta = ACTIVITY_META[type];
  return { type, emoji: meta.emoji, color: meta.color, skill: meta.skill, ...a } as ActivityBase<T>;
}

async function chunkedInsert<T>(rows: T[], fn: (chunk: T[]) => Promise<unknown>, size = 300) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function insertTrack(opts: {
  id: string;
  episodeId: string;
  language: string;
  label: string;
  type: "original" | "translation";
  raw: string;
  sourceUrl: string;
  source: string;
}) {
  const parsed = parseVttOrSrt(opts.raw);
  await db.insert(subtitleTracks).values({
    id: opts.id,
    episodeId: opts.episodeId,
    language: opts.language,
    label: opts.label,
    type: opts.type,
    source: opts.source,
    sourceUrl: opts.sourceUrl,
    format: opts.raw.trim().startsWith("WEBVTT") ? "vtt" : "srt",
    alignment: parsed.alignment,
    isOriginal: opts.type === "original",
    isTranslation: opts.type === "translation",
  });
  const cueRows = parsed.cues.map((c, i) => ({
    id: `${opts.id}-c${i}`,
    trackId: opts.id,
    cueIndex: i,
    startTime: c.startTime,
    endTime: c.endTime,
    text: c.text,
    speaker: c.speaker ?? null,
  }));
  await chunkedInsert(cueRows, (chunk) => db.insert(subtitleCues).values(chunk));
  const wordRows = parsed.cues.flatMap((c, i) =>
    c.words.map((w, wi) => ({
      cueId: `${opts.id}-c${i}`,
      wordIndex: wi,
      text: w.text,
      startTime: w.startTime,
      endTime: w.endTime,
      confidence: w.confidence,
    })),
  );
  await chunkedInsert(wordRows, (chunk) => db.insert(subtitleWords).values(chunk));
  return parsed;
}

/* ------------------------------------------------------------------ */
/* Showcase lesson: Sprite Fright (Blender Studio, CC-BY)              */
/* ------------------------------------------------------------------ */

const EP_SF = "ep-sprite-fright";
const cue = (i: number) => `sf-en-c${i}`;

export const spriteFrightLesson: VideoLesson = {
  metadata: {
    title: "Sprite Fright — Camping, Slang & Consequences",
    lessonType: "videoLessonInteractive",
    targetLanguage: "English",
    nativeLanguage: "Spanish",
    cefrLevel: "B1",
    estimatedDurationSeconds: 2700,
    videoUrl: "https://files.vidstack.io/sprite-fight/720p.mp4",
    episodeId: EP_SF,
    courseId: "course-open-cinema-english",
    seriesId: "series-blender-open-movies",
    seasonId: "season-blender-1",
    generatedBy: "manual",
    reviewRatio: 0.25,
  },
  globalSettings: { pointsToLevelUp: 500, enableStreak: true, suspenseSounds: true, allowRetry: true, showProgress: true, showXP: true },
  badges: [
    { id: "first-step", name: "First Step", emoji: "👣", rarity: "common", condition: "activities_completed>=1", description: "Complete your first activity." },
    { id: "word-master", name: "Word Master", emoji: "📚", rarity: "uncommon", condition: "vocab_saved>=10", description: "Save 10 words to your vocabulary." },
    { id: "on-fire", name: "On Fire", emoji: "🔥", rarity: "rare", condition: "correct_streak>=5", description: "Answer 5 scored activities in a row correctly." },
    { id: "perfect-speaker", name: "Perfect Speaker", emoji: "🎤", rarity: "epic", condition: "speaking_perfect>=3", description: "Get 3 speaking activities right." },
  ],
  learnerProfile: { cefrLevel: "B1", nativeLanguage: "Spanish", targetLanguage: "English", interests: ["Nature", "Movies & TV Shows"] },
  objectives: [
    "Understand informal British expressions used between friends (oy, innit, ribbing, geezer).",
    "Use 'be supposed to' and 'shouldn't' to talk about expectations and advice.",
    "Recognise the reduced forms gonna / gotta / wanna in fast, casual speech.",
    "Speculate about a mysterious situation using 'maybe' and 'might'.",
    "Use the first conditional to talk about consequences ('If we catch one, we'll make a fortune').",
    "Say a short line with natural sentence stress and linking.",
  ],
  settings: {
    lessonName: "Sprite Fright — Camping, Slang & Consequences",
    lessonTimeRange: "45–60 minutes",
    teacherNotes:
      "The film contains mild crude language typical of young adults joking with each other. Use it to discuss register: what is fine among close friends vs. what is rude with strangers. Segments follow the film's real chapters.",
    homeworkChecklist: "1) Review the 12 saved words. 2) Record yourself saying Ellie's line. 3) Write 5 sentences with 'be supposed to'.",
    materialLinks: "Film: Sprite Fright (Blender Studio, CC-BY) — https://studio.blender.org/films/sprite-fright/",
    difficulty: "medium",
  },
  segments: [
    {
      id: "seg-1",
      title: "Meeting Mr. Snail",
      startTime: 0,
      endTime: 28,
      summary: "Ellie greets a snail and proudly uses its Latin name.",
      focus: { grammar: ["exclamations"], vocabulary: ["snail", "cute", "bonus points", "Latin name"], pronunciation: ["falling intonation in exclamations"] },
      activities: [
        A("flashcard", {
          id: "seg-1-act-1",
          timestamp: 25,
          title: "Words from the opening",
          points: 5,
          requiredForNext: false,
          difficulty: "easy",
          kind: "core",
          sourceCueIds: [cue(0), cue(1), cue(2)],
          sourceText: "Hello, Mr. Snail! Aw, you cute little cornu aspersum. Latin name bonus-points!",
          vocabulary: ["snail", "cute", "bonus points"],
          correctFeedback: "Nice warm-up. These four words come straight from Ellie's first lines — you will hear 'cute' and 'bonus points' again in everyday English.",
          incorrectFeedback: "No pressure here — flashcards are for noticing. Flip each card once more and repeat the word out loud.",
          comprehensiveFeedback:
            "'Aw, you cute little…' is a classic way to talk to animals or babies: 'aw' + 'cute' + 'little' signal affection. 'Bonus points' comes from games and school and means 'extra credit'; Ellie jokingly awards herself points for knowing the Latin name (cornu aspersum = the common garden snail). Spanish learners: 'cute' ≠ 'culto'; the closest match is 'mono/lindo'. Memory aid: a snail is *cute* but *slow* — both have a long vowel sound.",
          content: {
            cards: [
              { front: "snail", back: "a small animal with a soft body and a spiral shell", translation: "caracol", pronunciation: "/sneɪl/", example: "Hello, Mr. Snail!" },
              { front: "cute", back: "attractive in a sweet or charming way", translation: "lindo / mono", pronunciation: "/kjuːt/", example: "Aw, you cute little cornu aspersum." },
              { front: "bonus points", back: "extra credit for doing something more than expected", translation: "puntos extra", pronunciation: "/ˈbəʊnəs pɔɪnts/", example: "Latin name bonus-points!" },
              { front: "Latin name", back: "the scientific name of a species", translation: "nombre en latín", pronunciation: "/ˈlætɪn neɪm/", example: "Latin name bonus-points!" },
            ],
          },
        }),
      ],
    },
    {
      id: "seg-2",
      title: "The Tree Hugger",
      startTime: 28,
      endTime: 73,
      summary: "The other campers complain about Ellie; she hurries them along and rescues a bird.",
      focus: { grammar: ["gonna (going to)", "mustn't"], vocabulary: ["tree hugger", "dilly-dally", "in distress", "fun guys / fungi"], pronunciation: ["reduced 'gonna'"] },
      activities: [
        A("multipleChoice", {
          id: "seg-2-act-1",
          timestamp: 35,
          title: "What is a tree hugger?",
          points: 10,
          requiredForNext: true,
          difficulty: "easy",
          kind: "core",
          sourceCueIds: [cue(3), cue(4)],
          sourceText: "Can't believe we got stuck with the tree hugger.",
          vocabulary: ["tree hugger"],
          correctFeedback: "Exactly. A 'tree hugger' is someone who loves and protects nature — here it's used as a mocking nickname for Ellie.",
          incorrectFeedback: "Not quite. Listen to the tone: the speaker is annoyed, and the nickname describes Ellie's passion for nature, not her strength or fear.",
          comprehensiveFeedback:
            "'Tree hugger' literally pictures a person hugging a tree to stop it being cut down. It is informal and usually a little mocking — like 'ecologista de manual' in Spanish. Grammar: 'we got stuck with' = we were forced to have someone we did not choose. Compare: 'I got stuck with the boring job.' Why the other options fail: nothing in the scene suggests fear of the forest, climbing, or leadership — the complaint is about her constant nature facts ('the Latin name for one more animal').",
          content: {
            question: "One camper says, 'Can't believe we got stuck with the tree hugger.' What is he saying about Ellie?",
            options: [
              { id: "a", text: "She cares too much about nature", isCorrect: true },
              { id: "b", text: "She is scared of the forest", isCorrect: false },
              { id: "c", text: "She likes to climb tall trees", isCorrect: false },
              { id: "d", text: "She is the leader of the group", isCorrect: false },
            ],
          },
        }),
        A("fillBlanks", {
          id: "seg-2-act-2",
          timestamp: 70,
          title: "Listen: the bird",
          points: 10,
          requiredForNext: false,
          difficulty: "medium",
          kind: "core",
          sourceCueIds: [cue(12)],
          sourceText: "Shush! That's a yellow wagtail. And she's in distress!",
          vocabulary: ["in distress"],
          correctFeedback: "Perfect ear! 'In distress' means in danger or suffering — Ellie hears the bird and reacts instantly.",
          incorrectFeedback: "Replay the sentence with the slow-replay button. The missing word ends in '-ess' and means 'in trouble / suffering'.",
          comprehensiveFeedback:
            "'She's in distress' = she is suffering or in danger. The phrase is formal-ish and appears in news and emergencies ('a ship in distress', 'a distress call'). Spanish: 'angustiada / en apuros'. Pronunciation: /dɪˈstres/ — stress on the second syllable, and the 's' cluster at the end is crisp. Grammar note: 'That's a yellow wagtail' uses 'that' for something at a distance you are pointing at. Common mistake: writing 'in a distress' — no article here.",
          content: { sentence: "Shush! That's a yellow wagtail. And she's in ___!", blanks: ["distress"], hint: "in trouble, suffering", translation: "¡Y suena angustiada!" },
        }),
      ],
    },
    {
      id: "seg-3",
      title: "Camp Site",
      startTime: 73,
      endTime: 151,
      summary: "The group claims a campsite, lights the BBQ and teases Ellie with British slang.",
      focus: { grammar: ["be supposed to", "wouldn't (hypothetical)"], vocabulary: ["oy", "innit", "weenie", "ribbing", "wreck"], pronunciation: ["linking: 'a bit more'"] },
      activities: [
        A("predictNext", {
          id: "seg-3-act-1",
          timestamp: 78,
          title: "What happens next?",
          points: 10,
          requiredForNext: false,
          difficulty: "easy",
          kind: "core",
          sourceCueIds: [cue(16), cue(17), cue(19)],
          sourceText: "Finally! Time to get that BBQ burning.",
          correctFeedback: "Good prediction! The very next lines are 'Oh. Oh, dear.' and 'Gross!' — something unpleasant is right where they set up camp.",
          incorrectFeedback: "A reasonable guess, but the film goes for comedy: the next line is 'Gross!' — a camper finds something disgusting on the ground.",
          comprehensiveFeedback:
            "Predicting is a real listening strategy: good listeners guess and then check. Useful phrases for predicting: 'I think … is going to…', 'They'll probably…', 'I bet…'. Vocabulary: 'gross' (informal, AmE/BrE) = disgusting; 'BBQ' is pronounced 'barbecue' /ˈbɑːbɪkjuː/ even when written with letters. Note the British 'Oh, dear' — a soft exclamation for something going wrong.",
          content: {
            question: "The boys just claimed the campsite and want to start the BBQ. What do you think happens next?",
            predictOptions: [
              { text: "A ranger arrives and asks them to leave", consequence: "No ranger appears — the campers are alone in the forest." },
              { text: "Someone finds something disgusting on the ground", consequence: "Yes! 'Oh, dear' … 'Gross!' — the campsite is not as clean as it looked.", isCorrect: true },
              { text: "The group leaves to find a quieter spot", consequence: "They stay — this is where they set up the tent and the BBQ." },
            ],
          },
        }),
        A("multipleChoice", {
          id: "seg-3-act-2",
          timestamp: 96,
          title: "Grammar: be supposed to",
          points: 12,
          requiredForNext: true,
          difficulty: "medium",
          kind: "core",
          sourceCueIds: [cue(20)],
          sourceText: "Easy, guys. We're supposed to be studying nature, not wrecking it.",
          grammar: ["be supposed to"],
          correctFeedback: "Right. 'We're supposed to be studying' = this is what is expected of us (by the school, the plan, the rules).",
          incorrectFeedback: "Look again at the situation: they are on a class project, so Ellie reminds them of what is expected — that is what 'be supposed to' expresses.",
          comprehensiveFeedback:
            "'Be supposed to + verb' expresses expectation or obligation created by rules, plans or other people: 'You're supposed to wear a helmet.' In the past it often means something did not happen: 'He was supposed to call me.' Spanish equivalents: 'se supone que…' or 'deberíamos…'. Here Ellie uses the continuous 'be studying' because it is an activity in progress. Distractors: ability = 'can/be able to'; impossible wish = 'I wish…'; habit = 'used to'. Bonus vocabulary: 'wreck' = destroy; 'Easy, guys' = calm down.",
          content: {
            question: "'We're supposed to be studying nature, not wrecking it.' What does 'be supposed to' express here?",
            options: [
              { id: "a", text: "an ability they gained recently", isCorrect: false },
              { id: "b", text: "a wish that is impossible now", isCorrect: false },
              { id: "c", text: "an expectation the group agreed to", isCorrect: true },
              { id: "d", text: "a habit from their childhood", isCorrect: false },
            ],
          },
        }),
        A("matching", {
          id: "seg-3-act-3",
          timestamp: 118,
          title: "British slang decoder",
          points: 12,
          requiredForNext: false,
          difficulty: "medium",
          kind: "core",
          sourceCueIds: [cue(22), cue(23), cue(25)],
          sourceText: "Oy, fungus freak! … a bit of friendly campsite ribbing … She's a real weenie that one, innit?",
          vocabulary: ["oy", "innit", "weenie", "ribbing"],
          correctFeedback: "You cracked the code. These are very informal — great for understanding films, risky with your boss.",
          incorrectFeedback: "Some pairs are mixed up. Tip: 'innit' is a squashed 'isn't it?', and 'ribbing' comes from poking someone's ribs as a joke.",
          comprehensiveFeedback:
            "Register matters. 'Oy!' (also 'Oi!') is a rude way to get attention in British English — never use it with strangers. 'Innit' = 'isn't it?', a London tag question used after almost anything. 'Weenie' = a weak, timid person (from 'wiener', a small sausage — notice the joke, since Phil is cooking sausages). 'Ribbing' = friendly teasing; Ellie uses the polite word to hide that she is hurt. Spanish: 'oye', '¿no?', 'gallina', 'vacile/broma'. Pronunciation: 'innit' /ˈɪnɪt/ with a glottal stop in London speech.",
          content: {
            pairs: [
              { left: "Oy!", right: "Hey! (rude attention-getter)" },
              { left: "innit", right: "isn't it? (tag question)" },
              { left: "weenie", right: "a weak, timid person" },
              { left: "ribbing", right: "friendly teasing" },
            ],
          },
        }),
        A("speaking", {
          id: "seg-3-act-4",
          timestamp: 124,
          title: "Say it like Phil",
          points: 15,
          requiredForNext: false,
          difficulty: "medium",
          kind: "core",
          sourceCueIds: [cue(27)],
          sourceText: "Almost ready! Just need a bit more salt...",
          pronunciation: ["linking 'a bit more'", "dropped subject 'Just need'"],
          correctFeedback: "Great delivery! Notice how 'a bit more' links together: /əˈbɪtmɔː/.",
          incorrectFeedback: "Close — try again slower, then faster. Keep 'bit' short and link it straight into 'more'.",
          comprehensiveFeedback:
            "Native speakers drop the subject in casual replies: 'Just need a bit more salt' = 'I just need…'. 'A bit more' is a very high-frequency quantifier chunk (Spanish 'un poco más'). Pronunciation: the /t/ in 'bit' is barely released before /m/; stress falls on 'salt'. Common mistake: saying 'a bit of more'. Try also: 'Just need a bit more time / practice / sleep.'",
          content: { expectedSentence: "Almost ready! Just need a bit more salt.", translation: "¡Casi listas! Solo necesito un poco más de sal.", tip: "Stress: AL-most REA-dy … a bit MORE SALT." },
        }),
      ],
    },
    {
      id: "seg-4",
      title: "A New Species",
      startTime: 151,
      endTime: 195,
      summary: "The campers discover the sprites and immediately disagree about what to do with them.",
      focus: { grammar: ["first conditional", "shouldn't for advice"], vocabulary: ["species", "adorable", "make a fortune", "habitat", "disrupt"], pronunciation: ["'species' /ˈspiːʃiːz/"] },
      activities: [
        A("wordScramble", {
          id: "seg-4-act-1",
          timestamp: 162,
          title: "Unscramble the science word",
          points: 8,
          requiredForNext: false,
          difficulty: "easy",
          kind: "core",
          sourceCueIds: [cue(28)],
          sourceText: "It's incredible. It's a new species.",
          vocabulary: ["species"],
          correctFeedback: "Species! Same spelling for singular and plural — one species, two species.",
          incorrectFeedback: "Think biology: 'a new ___' — the word starts with 'sp' and ends with 's' even in the singular.",
          comprehensiveFeedback:
            "'Species' /ˈspiːʃiːz/ is pronounced with 'sh' and is identical in singular and plural — a classic trap for Spanish speakers ('especie/especies'). Related: 'a rare species', 'an endangered species', 'the species is…' (singular verb). Ellie's excitement ('It's incredible!') contrasts with the boys' reaction one second later, which sets up the whole conflict of the film.",
          content: { scrambledWord: "cpeseis", correctWord: "species", hint: "a group of similar living things (biology)" },
        }),
        A("multipleChoice", {
          id: "seg-4-act-2",
          timestamp: 186,
          title: "Make a fortune",
          points: 10,
          requiredForNext: true,
          difficulty: "easy",
          kind: "core",
          sourceCueIds: [cue(33), cue(34)],
          sourceText: "And I bet we'll make a fortune if we catch one of those things.",
          vocabulary: ["make a fortune"],
          grammar: ["first conditional"],
          correctFeedback: "Yes — 'make a fortune' = earn a lot of money. The camper is already dreaming about profit.",
          incorrectFeedback: "'Fortune' can mean luck, but 'make a fortune' is a fixed expression about money. Listen to the next line: 'We'd be famous!'",
          comprehensiveFeedback:
            "'Make a fortune' = become very rich (Spanish 'hacerse rico / forrarse'). Grammar: 'I bet we'll make a fortune if we catch one' is a first conditional — will + if + present — used for real future possibilities. 'I bet' adds confidence: 'I'm sure'. Compare 'fortune' = luck in 'fortune teller' and 'good fortune'. Distractors: luck (wrong meaning here), finding more sprites and winning a prize are not what the phrase means, even if they fit the story.",
          content: {
            question: "'I bet we'll make a fortune if we catch one of those things.' What does the speaker expect?",
            options: [
              { id: "a", text: "They will get very lucky", isCorrect: false },
              { id: "b", text: "They will find more sprites", isCorrect: false },
              { id: "c", text: "They will win a big prize", isCorrect: false },
              { id: "d", text: "They will become very rich", isCorrect: true },
            ],
          },
        }),
        A("dragDrop", {
          id: "seg-4-act-3",
          timestamp: 194.5,
          title: "Who wants what?",
          points: 12,
          requiredForNext: false,
          difficulty: "medium",
          kind: "review",
          sourceCueIds: [cue(20), cue(33), cue(34), cue(37)],
          sourceText: "We'd be famous! / We really shouldn't disrupt their habitat.",
          grammar: ["shouldn't for advice", "would for imagined results"],
          correctFeedback: "Sorted! You can hear two attitudes: exploit the sprites vs. protect them.",
          incorrectFeedback: "Check the verbs: 'shouldn't' and 'supposed to' signal caution, while 'make a fortune' and 'famous' signal ambition.",
          comprehensiveFeedback:
            "'We really shouldn't disrupt their habitat': 'shouldn't' gives advice or expresses that something is wrong; 'really' softens and strengthens at the same time. 'Habitat' = the natural home of an animal (same in Spanish). 'We'd be famous' = 'we would be' — an imagined result. This activity recycles 'We're supposed to be studying nature' from segment 3 — spaced review helps the grammar stick.",
          content: {
            items: [
              { id: "i1", text: "I bet we'll make a fortune" },
              { id: "i2", text: "We really shouldn't disrupt their habitat" },
              { id: "i3", text: "We'd be famous!" },
              { id: "i4", text: "We're supposed to be studying nature" },
            ],
            targets: [
              { id: "t1", label: "Wants to exploit the sprites" },
              { id: "t2", label: "Wants to protect the forest" },
            ],
            pairs: [
              { itemId: "i1", targetId: "t1" },
              { itemId: "i2", targetId: "t2" },
              { itemId: "i3", targetId: "t1" },
              { itemId: "i4", targetId: "t2" },
            ],
          },
        }),
      ],
    },
    {
      id: "seg-5",
      title: "Peppermint Tea",
      startTime: 195,
      endTime: 237,
      summary: "The sprite leader welcomes the campers politely and explains what sprites do.",
      focus: { grammar: ["polite offers: Could I interest you in…?", "present simple for roles"], vocabulary: ["peppermint tea", "balance", "take care of", "geezer"], pronunciation: ["polite rising intonation"] },
      activities: [
        A("hotspot", {
          id: "seg-5-act-1",
          timestamp: 209,
          title: "Tap the sprite",
          points: 10,
          requiredForNext: false,
          difficulty: "easy",
          kind: "core",
          sourceCueIds: [cue(42)],
          sourceText: "Could I interest you in some peppermint tea?",
          grammar: ["polite offers"],
          correctFeedback: "Correct — 'Could I interest you in…?' is a very polite, slightly old-fashioned way to offer something.",
          incorrectFeedback: "Listen to the structure 'Could I … you in some…?' — it is an offer, not a question about directions or a complaint.",
          comprehensiveFeedback:
            "Polite offer patterns from formal to casual: 'Could I interest you in some tea?' → 'Would you like some tea?' → 'Tea?' The sprite's formality is comic next to the campers' slang. Spanish: '¿Le apetece un té?'. Intonation rises gently at the end of a polite offer. Reply options: 'That would be lovely' / 'I'm fine, thanks.' Distractors: directions would use 'Could you tell me the way…?', warnings use 'Watch out!', complaints use 'I'm afraid…'.",
          content: {
            hotspot: {
              x: 50,
              y: 58,
              question: "The sprite says: 'Could I interest you in some peppermint tea?' What is he doing?",
              options: [
                { id: "a", text: "Asking for directions", isCorrect: false },
                { id: "b", text: "Making a polite offer", isCorrect: true },
                { id: "c", text: "Giving a serious warning", isCorrect: false },
                { id: "d", text: "Making a small complaint", isCorrect: false },
              ],
            },
          },
        }),
        A("ordering", {
          id: "seg-5-act-2",
          timestamp: 236,
          title: "Rebuild the polite offer",
          points: 10,
          requiredForNext: false,
          difficulty: "medium",
          kind: "core",
          sourceCueIds: [cue(42)],
          sourceText: "Could I interest you in some peppermint tea?",
          grammar: ["question word order with modals"],
          correctFeedback: "Word order nailed: modal + subject + verb + object + 'in' + noun phrase.",
          incorrectFeedback: "Remember: in questions the modal comes first — 'Could I…' — and 'interest you in' stays together.",
          comprehensiveFeedback:
            "Questions with modals invert the modal and subject: 'Could I…?', 'Would you…?'. The verb 'interest' takes the preposition 'in': 'interest someone in something'. 'Some' (not 'any') is used in offers because we expect a yes. Practice: 'Could I interest you in a slice of cake / a quick walk / our new course?'",
          content: { orderedItems: ["Could I", "interest you", "in some", "peppermint tea?"], instruction: "Put the chunks in the right order." },
        }),
      ],
    },
    {
      id: "seg-6",
      title: "Red Paint?",
      startTime: 237,
      endTime: 270,
      summary: "Phil tries to explain the red stains on the sprites' hats; Ellie realises she is alone.",
      focus: { grammar: ["speculating: maybe / might / was just"], vocabulary: ["ketchup", "paint", "funny (strange vs. amusing)"], pronunciation: ["hesitation sounds: uh, or… something"] },
      activities: [
        A("videoPause", {
          id: "seg-6-act-1",
          timestamp: 249.5,
          title: "What is the red stuff?",
          points: 8,
          requiredForNext: false,
          difficulty: "easy",
          kind: "core",
          sourceCueIds: [cue(49), cue(50)],
          sourceText: "Maybe it was just ketchup... Red paint? Yeah, maybe they were just painting their little hats.",
          grammar: ["speculation with maybe / might"],
          correctFeedback: "Good speculation! Notice you used the same tools as Phil: 'maybe' + past tense, or 'might have been'.",
          incorrectFeedback: "Try one sentence starting with 'Maybe it was…' or 'It might be…' — the goal is to speculate, not to be right.",
          comprehensiveFeedback:
            "Speculation language: 'Maybe it was just ketchup' (maybe + past simple), 'It might be blood' (modal), 'It could have been paint' (modal + have + past participle for past possibility). 'Just' minimises: 'it was just…' = 'only, nothing serious'. Phil's hesitations ('or… something… like…') show he does not believe himself. Spanish: 'quizá era solo kétchup' / 'podría ser sangre'.",
          content: { videoPausePrompt: "Phil is trying to explain the red stains. What do YOU think the red stuff is? Write or say one sentence with 'maybe' or 'might'.", modelAnswer: "Maybe it's blood — the sprites might be more dangerous than they look." },
        }),
        A("wouldYouRather", {
          id: "seg-6-act-2",
          timestamp: 266,
          title: "Alone in the dark",
          points: 8,
          requiredForNext: false,
          difficulty: "easy",
          kind: "core",
          sourceCueIds: [cue(51), cue(53)],
          sourceText: "Guys? Guys, this isn't funny.",
          vocabulary: ["funny (two meanings)"],
          correctFeedback: "Thanks for sharing! Justifying a choice with 'because' or 'I'd rather… than…' is exactly the B1 skill here.",
          incorrectFeedback: "Pick one option and give a reason: 'I'd rather … because …'.",
          comprehensiveFeedback:
            "'I'd rather + base verb' expresses preference: 'I'd rather stay by the fire than walk alone.' Note 'than', not 'that'. 'This isn't funny' — here 'funny' means 'amusing'; English also uses 'funny' for 'strange' ('a funny smell'). Spanish speakers: don't confuse 'divertido' (fun) and 'gracioso' (funny). Extra: 'Guys?' works for mixed groups in casual English.",
          content: { wouldYouOption1: "be alone in the dark forest like Ellie, looking for the others", wouldYouOption2: "stay at the campfire with the noisy campers and their jokes" },
        }),
      ],
    },
    {
      id: "seg-7",
      title: "Sprite Them!",
      startTime: 270,
      endTime: 330,
      summary: "The captured campers beg Ellie for help; the sprites attack.",
      focus: { grammar: ["gotta / gonna / outta", "past simple 'picked'"], vocabulary: ["psycho", "hurry", "camping spot", "pick"], pronunciation: ["reductions in panicked speech"] },
      activities: [
        A("fillBlanks", {
          id: "seg-7-act-1",
          timestamp: 293,
          title: "Fast speech: gotta & gonna",
          points: 12,
          requiredForNext: true,
          difficulty: "medium",
          kind: "review",
          sourceCueIds: [cue(55), cue(56)],
          sourceText: "You gotta get me outta these! Hurry! They're gonna kill us!",
          grammar: ["gotta = have got to", "gonna = going to"],
          correctFeedback: "Both reductions caught! 'gotta' = have got to (must), 'gonna' = going to (future).",
          incorrectFeedback: "Slow replay helps: the first blank means 'must' (have got to), the second is the future 'going to'.",
          comprehensiveFeedback:
            "Three classic reductions appear in one line: 'gotta' (have got to), 'outta' (out of) and 'gonna' (going to). They are for speaking and informal texting, never for essays. 'You gotta get me outta these' = 'You must get me out of these (vines)'. We first heard 'gonna' in segment 2 ('I'm gonna kill her') — this is review. Spanish: 'tienes que' / 'van a'. Pronunciation: /ˈɡɒtə/, /ˈɡʌnə/ — the second syllable is a weak schwa.",
          content: { sentence: "You ___ get me outta these! Hurry! They're ___ kill us!", blanks: ["gotta", "gonna"], hint: "informal spellings of 'have got to' and 'going to'" },
        }),
        A("multipleChoice", {
          id: "seg-7-act-2",
          timestamp: 308,
          title: "The wrong camping spot",
          points: 12,
          requiredForNext: false,
          difficulty: "medium",
          kind: "core",
          sourceCueIds: [cue(59), cue(60)],
          sourceText: "You picked the wrong camping spot.",
          grammar: ["past simple"],
          correctFeedback: "Right — the sprites are punishing the campers for how they treated the forest.",
          incorrectFeedback: "Think about what the sprites care about: 'We take care of the animals, plants, birds, moss…'. The problem is not the tent, the fire or the time.",
          comprehensiveFeedback:
            "'You picked the wrong camping spot' is ironic: the spot is 'wrong' because it belongs to the sprites, guardians of the forest, and the campers wrecked it. 'Pick' = choose (informal); 'spot' = place. Past simple 'picked' for a finished action. Later the sprite confirms the reason: 'Those punks treated the world as their own personal rubbish bin.' Distractors describe practical camping problems, but the film is about respect for nature.",
          content: {
            question: "Why does the sprite say, 'You picked the wrong camping spot'?",
            options: [
              { id: "a", text: "The campers damaged the forest", isCorrect: true },
              { id: "b", text: "The campers forgot their tent", isCorrect: false },
              { id: "c", text: "The campers built the fire wrong", isCorrect: false },
              { id: "d", text: "The campers arrived far too late", isCorrect: false },
            ],
          },
        }),
      ],
    },
    {
      id: "seg-8",
      title: "I Can't Swim!",
      startTime: 330,
      endTime: 421,
      summary: "Chaos in the forest and the river; the campers call for each other with pet names.",
      focus: { grammar: ["past perfect for background", "can't: ability vs. permission"], vocabulary: ["pet names: sugar buns, sweet cakes, love muffin", "swim"], pronunciation: ["shouted vowels"] },
      activities: [
        A("listeningComprehension", {
          id: "seg-8-act-1",
          timestamp: 345,
          title: "Story so far",
          points: 15,
          requiredForNext: true,
          difficulty: "medium",
          kind: "core",
          grammar: ["past perfect"],
          correctFeedback: "Excellent listening. You followed a recap that uses the past perfect for earlier events.",
          incorrectFeedback: "Listen once more with the transcript on. Focus on 'because…' for the reason and 'had to decide' for Ellie's dilemma.",
          comprehensiveFeedback:
            "The recap uses the past perfect ('had walked', 'had tied', 'had disrespected') for things that happened BEFORE the main past moment — a B1 core structure. Spanish uses the pluscuamperfecto in the same way ('había caminado'). Key vocabulary: 'vines' (lianas), 'tie up' (atar), 'unkind' (poco amable). Both distractors in question 1 mention things that never happened; in question 2, the bird and the campfire are not Ellie's real dilemma.",
          content: {
            listening: {
              title: "What happened while Ellie was away",
              genre: "story",
              audioText:
                "Ellie had walked deep into the forest to help a small bird. When she finally returned to the camp, her friends were gone. The sprites had tied them up with vines, because the campers had disrespected the forest and had tried to catch one of the sprites. Now Ellie had to make a difficult decision: run away and save herself, or go back and help the people who had been so unkind to her.",
              showTranscript: false,
              questions: [
                {
                  id: "q1",
                  question: "Why did the sprites tie up the campers?",
                  options: [
                    { id: "a", text: "Because the campers disrespected the forest", isCorrect: true },
                    { id: "b", text: "Because the campers stole their tea", isCorrect: false },
                    { id: "c", text: "Because the campers were too noisy", isCorrect: false },
                  ],
                },
                {
                  id: "q2",
                  question: "What does Ellie have to decide?",
                  options: [
                    { id: "a", text: "Whether to look for the bird again", isCorrect: false },
                    { id: "b", text: "Whether to go back for her friends", isCorrect: true },
                    { id: "c", text: "Whether to build a new campfire", isCorrect: false },
                  ],
                },
              ],
            },
          },
        }),
        A("trueFalse", {
          id: "seg-8-act-2",
          timestamp: 404,
          title: "can't: ability or permission?",
          points: 8,
          requiredForNext: false,
          difficulty: "easy",
          kind: "core",
          sourceCueIds: [cue(69)],
          sourceText: "No, no, no! I can't swim!",
          grammar: ["can / can't for ability"],
          correctFeedback: "Correct — it's false. 'I can't swim' describes an ability he doesn't have, not a rule.",
          incorrectFeedback: "Careful: 'can't' has several meanings. Falling into a river, he is not talking about permission — he simply doesn't know how to swim.",
          comprehensiveFeedback:
            "'Can/can't' covers ability ('I can't swim'), permission ('You can't park here') and impossibility ('That can't be true'). Context decides. Spanish separates 'no sé nadar' (ability, saber) from 'no puedo' (possibility), so watch out: English uses 'can' for both. Pronunciation: British 'can't' /kɑːnt/ with a long vowel; American /kænt/. In fast speech, stressed 'CAN'T' vs. unstressed 'can' /kən/ is the main clue.",
          content: { question: "In 'I can't swim!', the speaker uses 'can't' to say he is not allowed to swim.", answer: false },
        }),
      ],
    },
    {
      id: "seg-9",
      title: "Eat Salt!",
      startTime: 421,
      endTime: 470,
      summary: "Ellie discovers the sprites' weakness and is forced to defend herself.",
      focus: { grammar: ["imperatives: keep your distance", "don't want to"], vocabulary: ["burn", "keep your distance", "hurt"], pronunciation: ["sentence stress", "'want to' → 'wanna'"] },
      activities: [
        A("voiceOver", {
          id: "seg-9-act-1",
          timestamp: 437,
          title: "Dub Ellie's line",
          points: 15,
          requiredForNext: false,
          difficulty: "medium",
          kind: "core",
          sourceCueIds: [cue(74)],
          sourceText: "I don't want to hurt you! Just keep your distance!",
          pronunciation: ["sentence stress", "wanna reduction"],
          correctFeedback: "Great dub! Stress 'DON'T', 'HURT' and 'DIS-tance' — the rest stays light.",
          incorrectFeedback: "Try again with the video muted: match Ellie's rhythm first, then the words.",
          comprehensiveFeedback:
            "'I don't want to hurt you' is often reduced to 'I don't wanna hurt you' in speech. Sentence stress: content words (don't, hurt, keep, distance) are long and loud; function words (I, to, you, your) are short. 'Keep your distance' is an imperative warning (Spanish: 'no te acerques / mantén la distancia'). Note 'hurt' is irregular: hurt–hurt–hurt. Shadowing (speaking at the same time as the actor) is one of the most effective pronunciation techniques.",
          content: { question: "The video will replay muted. Say Ellie's line with her rhythm and emotion.", line: "I don't want to hurt you! Just keep your distance!", startTime: 432.8, endTime: 436.2 },
        }),
        A("multipleChoice", {
          id: "seg-9-act-2",
          timestamp: 442,
          title: "Ellie's discovery",
          points: 12,
          requiredForNext: false,
          difficulty: "medium",
          kind: "core",
          sourceCueIds: [cue(72), cue(73), cue(75)],
          sourceText: "Son of a Spriteberry! It burns! It burns!",
          vocabulary: ["burn"],
          correctFeedback: "Yes — 'It burns! It burns!' told her that salt hurts the sprites, so she uses it to defend herself.",
          incorrectFeedback: "Rewind to 7:06: a sprite screams 'It burns!' after touching something white that Phil had brought for the sausages.",
          comprehensiveFeedback:
            "Set-up and pay-off: in segment 3 Phil said the sausages needed 'a bit more salt'; now that salt becomes Ellie's weapon, because the sprites react like slugs. 'It burns!' uses the present simple for an immediate sensation. 'Son of a Spriteberry!' is a comic, censored version of a rude exclamation — films invent soft swear words like this. 'Eat salt!' is an imperative used as a battle cry. Distractors (water, fire, noise) are plausible weaknesses for forest creatures but are not shown in the film.",
          content: {
            question: "What did Ellie discover about the sprites a few seconds before this moment?",
            options: [
              { id: "a", text: "Water scares them", isCorrect: false },
              { id: "b", text: "Fire calms them", isCorrect: false },
              { id: "c", text: "Salt burns them", isCorrect: true },
              { id: "d", text: "Noise confuses them", isCorrect: false },
            ],
          },
        }),
      ],
    },
    {
      id: "seg-10",
      title: "Rubbish Bin",
      startTime: 470,
      endTime: 523,
      summary: "The sprite leader explains the punishment: the campers treated the world like a rubbish bin.",
      focus: { grammar: ["treat something as / like", "set someone free"], vocabulary: ["rubbish bin (BrE) / trash can (AmE)", "punk", "litter"], pronunciation: ["'rubbish' /ˈrʌbɪʃ/"] },
      activities: [
        A("readingChallenge", {
          id: "seg-10-act-1",
          timestamp: 488,
          title: "Leave no trace",
          points: 15,
          requiredForNext: false,
          difficulty: "medium",
          kind: "core",
          sourceCueIds: [cue(77)],
          sourceText: "Those punks treated the world as their own personal rubbish bin.",
          vocabulary: ["rubbish", "garbage", "trace", "carry out"],
          correctFeedback: "Great reading. You connected the sprite's speech to real camping rules.",
          incorrectFeedback: "Scan the text for 'carry out' and for the American word for rubbish. Scanning for key words is faster than re-reading everything.",
          comprehensiveFeedback:
            "British 'rubbish' = American 'garbage/trash'; 'rubbish bin' = 'trash can'. 'Rubbish' is also British slang for 'bad' ('That film was rubbish'). 'Whatever you carry in, you carry out' is a fixed camping motto. Grammar: 'treat something as/like…' = behave towards it as if it were… ('treated the world as their own personal rubbish bin'). 'Set someone free' = release. Distractors: 'luggage' and 'cabbage' rhyme with 'garbage' but mean suitcases and a vegetable.",
          content: {
            reading: {
              title: "Leave No Trace",
              genre: "factual",
              text: "Every year, millions of people go camping. Most of them love nature, but some leave a mess behind: plastic bottles, food packaging and even broken tents. Park rangers call this 'leaving a trace'. The rule for responsible campers is simple: whatever you carry in, you carry out. Put your rubbish in a bag and take it home, because a bin in the forest can attract animals. Never burn plastic in a campfire, since the smoke is toxic for birds and insects. And if you discover a strange new species, take a photo — not the animal.",
              translation: "Cada año, millones de personas van de acampada. La regla para los campistas responsables es sencilla: todo lo que traes, te lo llevas.",
              questions: [
                {
                  id: "q1",
                  question: "According to the text, what should campers do with their rubbish?",
                  options: [
                    { id: "a", text: "Bury it under the ground", isCorrect: false },
                    { id: "b", text: "Carry it back home with them", isCorrect: true },
                    { id: "c", text: "Burn it in the campfire", isCorrect: false },
                  ],
                },
                {
                  id: "q2",
                  question: "Which American English word means the same as 'rubbish'?",
                  options: [
                    { id: "a", text: "garbage", isCorrect: true },
                    { id: "b", text: "luggage", isCorrect: false },
                    { id: "c", text: "cabbage", isCorrect: false },
                  ],
                },
              ],
            },
          },
        }),
        A("truthOrDare", {
          id: "seg-10-act-2",
          timestamp: 500,
          title: "Truth or dare",
          points: 10,
          requiredForNext: false,
          difficulty: "easy",
          kind: "bonus",
          sourceCueIds: [cue(58), cue(77)],
          sourceText: "Right foot, left foot, leaf and stone.",
          correctFeedback: "Brave choice! Speaking without a script is how fluency grows.",
          incorrectFeedback: "Choose one and go — there is no wrong answer in truth or dare.",
          comprehensiveFeedback:
            "Truth: telling a personal story practises past narrative (past simple + 'when' + 'so'). Dare: 'Right foot, left foot, leaf and stone' is the sprites' marching chant — its rhythm (DUM-da DUM-da DUM-da DUM) trains English stress timing. Useful phrases: 'Once, when I was…', 'I felt terrible, so I…', 'To be honest…'.",
          content: {
            truth: "Tell us about a time you or a friend treated a place badly — littering, breaking something, being loud. What happened afterwards?",
            dare: "Say the sprites' chant 'Right foot, left foot, leaf and stone' three times, faster each time, keeping the rhythm.",
          },
        }),
      ],
    },
    {
      id: "seg-11",
      title: "March Home",
      startTime: 523,
      endTime: 560,
      summary: "The sprites spare Ellie. The film ends with dark humour and a cup of peppermint tea.",
      focus: { grammar: ["should have / shouldn't have", "let's + verb"], vocabulary: ["give someone that one", "fair", "punishment"], pronunciation: ["weak 'have' in 'should've'"] },
      activities: [
        A("discussion", {
          id: "seg-11-act-1",
          timestamp: 537,
          title: "Was it fair?",
          points: 12,
          requiredForNext: false,
          difficulty: "medium",
          kind: "core",
          sourceCueIds: [cue(80), cue(81)],
          sourceText: "I'll give you that one, Brother Bird! … let's burn the bodies and have some peppermint tea.",
          grammar: ["should have + past participle"],
          correctFeedback: "Thoughtful! Using 'should have / shouldn't have' to judge past actions is exactly the target structure.",
          incorrectFeedback: "Give an opinion and one reason: 'I think the campers shouldn't have…, but the sprites…'.",
          comprehensiveFeedback:
            "'Should have + past participle' criticises past actions: 'The campers shouldn't have tried to catch a sprite.' Spoken form: 'should've' /ˈʃʊdəv/ — never write 'should of'. 'I'll give you that one' = I accept your point / I'll let you off this time. 'Let's + verb' makes suggestions ('let's have some tea'). The film's last line is dark comedy: politeness ('peppermint tea') next to violence. Spanish: 'no deberían haber…'.",
          content: {
            discussionPrompt: "The sprites punished the campers for hurting the forest, but the punishment was extreme. Was it fair? Use 'should have' / 'shouldn't have' at least twice.",
            guidingQuestions: ["What did the campers do wrong?", "What should Ellie have done differently?", "Is the ending funny, disturbing, or both — why?"],
          },
        }),
        A("matching", {
          id: "seg-11-act-2",
          timestamp: 545,
          title: "Lesson vocabulary review",
          points: 12,
          requiredForNext: false,
          difficulty: "medium",
          kind: "review",
          vocabulary: ["habitat", "in distress", "make a fortune", "rubbish bin", "keep your distance"],
          correctFeedback: "Full recall! These five chunks came from five different scenes — the review closes the loop.",
          incorrectFeedback: "Match the meaning, not the words: 'fortune' → money, 'distress' → danger, 'distance' → stay away.",
          comprehensiveFeedback:
            "Spaced review: each of these expressions appeared earlier in the lesson — 'in distress' (0:57), 'habitat' (3:09), 'make a fortune' (3:02), 'keep your distance' (7:12) and 'rubbish bin' (7:58). Seeing them again after 5–8 minutes strengthens memory far more than one long list. Try to write one sentence about your own life with each chunk before tomorrow's review.",
          content: {
            pairs: [
              { left: "habitat", right: "the natural home of an animal or plant" },
              { left: "in distress", right: "in danger or suffering" },
              { left: "make a fortune", right: "become very rich" },
              { left: "rubbish bin", right: "container for waste (British)" },
              { left: "keep your distance", right: "stay away from someone" },
            ],
          },
        }),
        A("reflection", {
          id: "seg-11-act-3",
          timestamp: 556,
          title: "Your takeaway",
          points: 8,
          requiredForNext: false,
          difficulty: "easy",
          kind: "core",
          correctFeedback: "Reflection saved. Naming what you learned is the last step of a good lesson.",
          incorrectFeedback: "Write two or three sentences — one thing you learned, one thing you want to practise.",
          comprehensiveFeedback:
            "Metacognition (thinking about your learning) improves retention. Useful frames: 'The most useful phrase for me was…', 'I still find … difficult', 'Next time I watch a film in English I will…'. Consider adding today's five review words to your vocabulary list and scheduling a review in three days.",
          content: { reflectionPrompt: "Which expression from this film will you actually use this week, and in what situation? Which grammar point still feels difficult?" },
        }),
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

export async function seedDatabase(): Promise<boolean> {
  const existing = await db.select({ id: courses.id }).from(courses).limit(1);
  if (existing.length) return false;

  await db.insert(providers).values([
    { id: "prov-blender-studio", name: "Blender Studio (CC-BY)", slug: "blender-studio", priority: 1, authorizationType: "CREATIVE_COMMONS", baseUrl: "https://files.vidstack.io/sprite-fight/", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", supportsDownload: true },
    { id: "prov-blender-foundation", name: "Blender Foundation Open Movies (CC-BY)", slug: "blender-foundation", priority: 2, authorizationType: "CREATIVE_COMMONS", baseUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/", licenseUrl: "https://creativecommons.org/licenses/by/3.0/", supportsDownload: true },
  ]);

  await db.insert(users).values({ id: DEMO_USER_ID, email: "demo@lingua.tv", name: "Lucía", passwordHash: hashPassword("demo1234"), avatarColor: "#f472b6", isDemo: true });
  await db.insert(learnerProfiles).values({
    id: "profile-demo",
    userId: DEMO_USER_ID,
    cefrLevel: "B1",
    nativeLanguage: "Spanish",
    targetLanguage: "English",
    goals: ["Understand films without subtitles", "Sound more natural when speaking"],
    interests: ["Nature", "Movies & TV Shows", "Travel"],
    facts: ["Lives in Valencia", "Works as a graphic designer"],
    preferences: { feedbackDetail: "detailed", suspenseSounds: true, activityPauseMode: "pause", dailyGoalXp: 100 },
    strengths: ["reading", "vocabulary recall"],
    weaknesses: ["connected speech", "phrasal verbs"],
    xp: 120,
    level: 1,
    onboarded: true,
  });
  await db.insert(userStreaks).values({ id: "streak-demo", userId: DEMO_USER_ID, currentDaily: 2, longestDaily: 5, lastActiveDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10), correctStreak: 0, bestCorrectStreak: 4, lessonStreak: 1 });
  await db.insert(userPlayerPreferences).values({ id: "prefs-demo", userId: DEMO_USER_ID });

  await db.insert(courses).values({
    id: "course-open-cinema-english",
    slug: "english-through-open-cinema",
    title: "English through Open Cinema",
    description: "Learn real spoken English from award-winning Creative Commons films: slang, rhythm, humour and everyday grammar — one scene at a time.",
    language: "Spanish",
    targetLanguage: "English",
    level: "B1",
    thumbnail: "https://files.vidstack.io/sprite-fight/poster.webp",
    accent: "violet",
  });
  await db.insert(series).values({
    id: "series-blender-open-movies",
    courseId: "course-open-cinema-english",
    slug: "blender-open-movies",
    title: "Blender Open Movies",
    description: "Short films released under Creative Commons by the Blender Foundation and Blender Studio — comedy, fantasy and sci-fi with natural English dialogue.",
    thumbnail: "https://files.vidstack.io/sprite-fight/poster.webp",
    language: "Spanish",
    targetLanguage: "English",
    sortOrder: 0,
  });
  await db.insert(seasons).values({ id: "season-blender-1", seriesId: "series-blender-open-movies", seasonNumber: 1, title: "Season 1 — Forests, Dragons & Robots", description: "Four short films, four very different registers of English.", thumbnail: "https://files.vidstack.io/sprite-fight/poster.webp" });

  const EP_SINTEL = "ep-sintel";
  const EP_BBB = "ep-big-buck-bunny";
  const EP_TOS = "ep-tears-of-steel";
  await db.insert(episodes).values([
    { id: EP_SF, seasonId: "season-blender-1", episodeNumber: 1, title: "Sprite Fright", description: "A group of rowdy students goes camping in a forest protected by tiny mushroom sprites — who do not appreciate littering. British slang, dark comedy and a lesson about respect for nature.", thumbnail: "https://files.vidstack.io/sprite-fight/poster.webp", poster: "https://files.vidstack.io/sprite-fight/poster.webp", duration: 629, releaseDate: "2021-10-29", language: "English", targetLanguage: "English", license: "CC-BY 4.0", attribution: "Sprite Fright © Blender Studio, licensed CC-BY" },
    { id: EP_SINTEL, seasonId: "season-blender-1", episodeNumber: 2, title: "Sintel", description: "A lonely young woman searches for the baby dragon she once rescued. Sparse, poetic dialogue — perfect for close listening and pronunciation.", thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg", poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg", duration: 888, releaseDate: "2010-09-27", language: "English", targetLanguage: "English", license: "CC-BY 3.0", attribution: "Sintel © Blender Foundation | durian.blender.org" },
    { id: EP_BBB, seasonId: "season-blender-1", episodeNumber: 3, title: "Big Buck Bunny", description: "A giant rabbit takes gentle revenge on three bullying rodents. No dialogue — ideal for describing actions, prediction and narration practice.", thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg", poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg", duration: 596, releaseDate: "2008-04-10", language: "English", targetLanguage: "English", license: "CC-BY 3.0", attribution: "Big Buck Bunny © Blender Foundation | peach.blender.org" },
    { id: EP_TOS, seasonId: "season-blender-1", episodeNumber: 4, title: "Tears of Steel", description: "A sci-fi short set in Amsterdam: scientists try to rewrite the past to prevent a robot war. Fast, emotional English dialogue.", thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg", poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg", duration: 734, releaseDate: "2012-09-26", language: "English", targetLanguage: "English", license: "CC-BY 3.0", attribution: "Tears of Steel © Blender Foundation | mango.blender.org" },
  ]);

  await db.insert(videoSources).values([
    { id: "src-sf-720", episodeId: EP_SF, providerId: "prov-blender-studio", label: "Blender Studio · MP4", url: "https://files.vidstack.io/sprite-fight/720p.mp4", type: "mp4", quality: "720p", width: 1280, height: 720, qualities: [{ label: "720p", url: "https://files.vidstack.io/sprite-fight/720p.mp4", height: 720 }], audioTracks: [{ id: "en", language: "en", label: "English (original)" }], availability: "FREE", authorizationType: "CREATIVE_COMMONS", priority: 1, downloadable: true },
    { id: "src-sf-hls", episodeId: EP_SF, providerId: "prov-blender-studio", label: "Blender Studio · HLS (adaptive)", url: "https://files.vidstack.io/sprite-fight/hls/stream.m3u8", type: "hls", quality: "auto", qualities: [], audioTracks: [{ id: "en", language: "en", label: "English (original)" }], availability: "FREE", authorizationType: "CREATIVE_COMMONS", priority: 2, downloadable: false },
    { id: "src-sintel-mp4", episodeId: EP_SINTEL, providerId: "prov-blender-foundation", label: "Blender Foundation · MP4", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4", type: "mp4", quality: "720p", width: 1280, height: 546, qualities: [{ label: "720p", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4", height: 546 }], audioTracks: [{ id: "en", language: "en", label: "English (original)" }], availability: "FREE", authorizationType: "CREATIVE_COMMONS", priority: 1, downloadable: true },
    { id: "src-bbb-mp4", episodeId: EP_BBB, providerId: "prov-blender-foundation", label: "Blender Foundation · MP4", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", type: "mp4", quality: "720p", width: 1280, height: 720, qualities: [{ label: "720p", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", height: 720 }], audioTracks: [{ id: "en", language: "en", label: "Original (no dialogue)" }], availability: "FREE", authorizationType: "CREATIVE_COMMONS", priority: 1, downloadable: true },
    { id: "src-tos-mp4", episodeId: EP_TOS, providerId: "prov-blender-foundation", label: "Blender Foundation · MP4", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", type: "mp4", quality: "720p", width: 1280, height: 534, qualities: [{ label: "720p", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", height: 534 }], audioTracks: [{ id: "en", language: "en", label: "English (original)" }], availability: "FREE", authorizationType: "CREATIVE_COMMONS", priority: 1, downloadable: true },
  ]);

  // Chapters — Sprite Fright from the official chapters.vtt
  const sfChapters = parseVttOrSrt(SPRITE_FRIGHT_CHAPTERS).cues;
  await db.insert(chapters).values(
    sfChapters.map((c, i) => ({
      id: `ch-sf-${i}`,
      episodeId: EP_SF,
      type: c.text === "Credits" ? "credits" : "scene",
      title: c.text,
      startTime: c.startTime,
      endTime: c.endTime,
      sortOrder: i,
    })),
  );
  await db.insert(chapters).values([
    { id: "ch-sintel-0", episodeId: EP_SINTEL, type: "intro", title: "Snowstorm", startTime: 0, endTime: 107, sortOrder: 0 },
    { id: "ch-sintel-1", episodeId: EP_SINTEL, type: "scene", title: "The Shaman", startTime: 107, endTime: 200, sortOrder: 1 },
    { id: "ch-sintel-2", episodeId: EP_SINTEL, type: "scene", title: "Scales", startTime: 200, endTime: 445, sortOrder: 2 },
    { id: "ch-sintel-3", episodeId: EP_SINTEL, type: "scene", title: "Dragon Lands", startTime: 445, endTime: 700, sortOrder: 3 },
    { id: "ch-sintel-4", episodeId: EP_SINTEL, type: "credits", title: "Credits", startTime: 700, endTime: 888, sortOrder: 4 },
  ]);
  await db.insert(skipSegments).values([
    { id: "skip-sf-credits", episodeId: EP_SF, type: "credits", label: "Skip Credits", startTime: 554, endTime: 629 },
    { id: "skip-sintel-credits", episodeId: EP_SINTEL, type: "credits", label: "Skip Credits", startTime: 700, endTime: 888 },
  ]);

  // Subtitles — real caption files
  await insertTrack({ id: "sf-en", episodeId: EP_SF, language: "en", label: "English", type: "original", raw: SPRITE_FRIGHT_EN, sourceUrl: "https://files.vidstack.io/sprite-fight/subs/english.vtt", source: "official-vtt" });
  await insertTrack({ id: "sf-es", episodeId: EP_SF, language: "es", label: "Español", type: "translation", raw: SPRITE_FRIGHT_ES, sourceUrl: "https://files.vidstack.io/sprite-fight/subs/spanish.vtt", source: "official-vtt" });
  await insertTrack({ id: "sintel-en", episodeId: EP_SINTEL, language: "en", label: "English", type: "original", raw: SINTEL_EN, sourceUrl: "https://durian.blender.org/wp-content/content/subtitles/sintel_en.srt", source: "official-srt" });

  // Badges (machine-readable conditions)
  const badgeRows: { id: string; name: string; emoji: string; rarity: string; description: string; condition: BadgeCondition; sortOrder: number }[] = [
    { id: "first-step", name: "First Step", emoji: "👣", rarity: "common", description: "Complete your first activity.", condition: { type: "activities_completed", count: 1 }, sortOrder: 0 },
    { id: "word-master", name: "Word Master", emoji: "📚", rarity: "uncommon", description: "Save 10 words to your vocabulary.", condition: { type: "vocab_saved", count: 10 }, sortOrder: 1 },
    { id: "on-fire", name: "On Fire", emoji: "🔥", rarity: "rare", description: "Answer 5 scored activities correctly in a row.", condition: { type: "correct_streak", count: 5 }, sortOrder: 2 },
    { id: "perfect-speaker", name: "Perfect Speaker", emoji: "🎤", rarity: "epic", description: "Nail 3 speaking activities.", condition: { type: "speaking_perfect", count: 3 }, sortOrder: 3 },
    { id: "scene-scholar", name: "Scene Scholar", emoji: "🎬", rarity: "uncommon", description: "Complete a full video lesson.", condition: { type: "lessons_completed", count: 1 }, sortOrder: 4 },
    { id: "sharpshooter", name: "Sharpshooter", emoji: "🎯", rarity: "rare", description: "Get 20 activities right.", condition: { type: "activities_correct", count: 20 }, sortOrder: 5 },
    { id: "binge-learner", name: "Binge Learner", emoji: "📺", rarity: "rare", description: "Finish 3 episodes.", condition: { type: "episodes_completed", count: 3 }, sortOrder: 6 },
    { id: "three-day-flame", name: "Three-Day Flame", emoji: "🕯️", rarity: "uncommon", description: "Learn on 3 consecutive days.", condition: { type: "daily_streak", count: 3 }, sortOrder: 7 },
    { id: "level-up", name: "Level Up", emoji: "⬆️", rarity: "common", description: "Reach 500 XP.", condition: { type: "xp", count: 500 }, sortOrder: 8 },
    { id: "party-starter", name: "Party Starter", emoji: "🎉", rarity: "common", description: "Join or host a Watch Party.", condition: { type: "watch_party_joined", count: 1 }, sortOrder: 9 },
    { id: "legend", name: "Legend", emoji: "👑", rarity: "legendary", description: "Reach 5,000 XP.", condition: { type: "xp", count: 5000 }, sortOrder: 10 },
  ];
  await db.insert(badges).values(badgeRows);

  // Prior learning history for the demo learner (so review + path have data)
  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86400000);
  await db.insert(vocabularyItems).values([
    { id: "vocab-demo-1", userId: DEMO_USER_ID, word: "wagtail", lemma: "wagtail", language: "en", translation: "lavandera (pájaro)", definition: "a small bird with a long tail that moves up and down", partOfSpeech: "noun", cefr: "C1", example: "That's a yellow wagtail.", sourceEpisodeId: EP_SF, sourceTimestamp: 58, sourceCueId: "sf-en-c12", firstSeenAt: daysAgo(4), lastReviewedAt: daysAgo(2), nextReviewAt: daysAgo(0.2), mastery: 35, status: "review", reviewCount: 1, intervalDays: 2, easeFactor: 2.5 },
    { id: "vocab-demo-2", userId: DEMO_USER_ID, word: "adorable", lemma: "adorable", language: "en", translation: "adorable", definition: "very attractive and easy to love", partOfSpeech: "adjective", cefr: "B1", example: "They're absolutely adorable.", sourceEpisodeId: EP_SF, sourceTimestamp: 177, sourceCueId: "sf-en-c31", firstSeenAt: daysAgo(4), lastReviewedAt: daysAgo(1), nextReviewAt: daysAgo(-3), mastery: 70, status: "known", reviewCount: 3, intervalDays: 6, easeFactor: 2.6 },
    { id: "vocab-demo-3", userId: DEMO_USER_ID, word: "dilly-dally", lemma: "dilly-dally", language: "en", translation: "perder el tiempo, entretenerse", definition: "to waste time by being slow or indecisive", partOfSpeech: "verb", cefr: "B2", example: "We mustn't dilly-dally when there's so much nature to see!", sourceEpisodeId: EP_SF, sourceTimestamp: 44, sourceCueId: "sf-en-c8", firstSeenAt: daysAgo(3), lastReviewedAt: null, nextReviewAt: daysAgo(0.5), mastery: 10, status: "learning", reviewCount: 0, intervalDays: 0, easeFactor: 2.5 },
    { id: "vocab-demo-4", userId: DEMO_USER_ID, word: "gross", lemma: "gross", language: "en", translation: "asqueroso", definition: "extremely unpleasant; disgusting (informal)", partOfSpeech: "adjective", cefr: "B1", example: "Gross!", sourceEpisodeId: EP_SF, sourceTimestamp: 87, sourceCueId: "sf-en-c19", firstSeenAt: daysAgo(3), lastReviewedAt: daysAgo(1), nextReviewAt: daysAgo(0.1), mastery: 40, status: "review", reviewCount: 2, intervalDays: 1, easeFactor: 2.4 },
  ]);
  await db.insert(grammarItems).values([
    { id: "grammar-demo-1", userId: DEMO_USER_ID, name: "gonna (going to)", slug: "gonna-going-to", description: "Informal reduced form of 'going to' for plans and predictions.", level: "A2", examples: ["I swear I'm gonna kill her.", "They're gonna kill us!"], sourceEpisodeId: EP_SF, mastery: 55, status: "practiced", correctCount: 3, incorrectCount: 1, lastPracticedAt: daysAgo(2) },
    { id: "grammar-demo-2", userId: DEMO_USER_ID, name: "be supposed to", slug: "be-supposed-to", description: "Expresses expectations or obligations from rules, plans or other people.", level: "B1", examples: ["We're supposed to be studying nature, not wrecking it."], sourceEpisodeId: EP_SF, mastery: 20, status: "introduced", correctCount: 0, incorrectCount: 1, lastPracticedAt: daysAgo(3) },
  ]);
  await db.insert(learningHistory).values([
    { id: "hist-demo-1", userId: DEMO_USER_ID, type: "lesson_started", lessonId: "lesson-sprite-fright-b1", episodeId: EP_SF, payload: { note: "Started while onboarding" }, createdAt: daysAgo(4) },
    { id: "hist-demo-2", userId: DEMO_USER_ID, type: "vocab_saved", episodeId: EP_SF, payload: { word: "wagtail" }, createdAt: daysAgo(4) },
    { id: "hist-demo-3", userId: DEMO_USER_ID, type: "review", payload: { items: 2, correct: 1 }, createdAt: daysAgo(1) },
  ]);

  await persistLesson({
    id: "lesson-sprite-fright-b1",
    lesson: spriteFrightLesson,
    episodeId: EP_SF,
    courseId: "course-open-cinema-english",
    seriesId: "series-blender-open-movies",
    seasonId: "season-blender-1",
    generatedBy: "manual",
    status: "published",
    videoDuration: 629,
  });

  return true;
}

const isDirectRun = process.argv[1]?.endsWith("seed.ts");
if (isDirectRun) {
  seedDatabase()
    .then((did) => {
      console.log(did ? "Seeded database." : "Database already seeded.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export type { Activity };
