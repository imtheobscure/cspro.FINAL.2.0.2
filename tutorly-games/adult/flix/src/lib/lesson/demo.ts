/**
 * Demo pack — what Flix shows before a teacher has generated anything.
 *
 * The video is Big Buck Bunny (Blender Foundation, © Blender Foundation,
 * licensed CC-BY 3.0 — a public, legal classroom source), served as an adaptive
 * HLS stream with a progressive MP4 fallback from a different host, which is
 * also the perfect way to demonstrate source fallback: pull the first one out
 * and the player keeps your timestamp, rate, audio and subtitle choice.
 *
 * The captions are AUTHORED FOR TUTOFLEX (the film has no dialogue), covering
 * the opening ~2½ minutes, with word-level timings on the first cue and a
 * Persian translation track so dual-subtitle mode has something real to show.
 * The lesson exercises every one of the 15 activity types.
 */

import type { Episode, Lesson } from "../../types";
import { parseSubtitles } from "../subtitles";

const CREDIT = "Big Buck Bunny © Blender Foundation — CC-BY 3.0 (blender.org)";

export const DEMO_ORIGINAL_VTT = `WEBVTT

NOTE Authored for Flix as teaching captions for the opening scene.

1
00:00:01.000 --> 00:00:05.600
<00:00:01.000>Good<00:00:01.400> morning,<00:00:01.900> forest.<00:00:02.600> Today<00:00:03.100> begins<00:00:03.600> quietly.

2
00:00:06.200 --> 00:00:10.400
A very large rabbit wakes up in a very small burrow.

3
00:00:11.000 --> 00:00:15.400
<v Narrator>He stretches, yawns, and looks at the morning light.

4
00:00:16.000 --> 00:00:20.800
<v Buck>What a beautiful day to be outside!

5
00:00:21.500 --> 00:00:26.200
<v Narrator>He decides to take a walk before breakfast.

6
00:00:27.000 --> 00:00:32.000
<v Buck>First, I will smell the flowers by the river.

7
00:00:33.000 --> 00:00:38.400
<v Narrator>But two small rodents are watching him from behind a tree.

8
00:00:39.200 --> 00:00:44.000
<v Rodent>Look at him. He thinks he is the king of the forest.

9
00:00:45.000 --> 00:00:50.400
<v Narrator>They follow him, and they are not being friendly.

10
00:00:51.200 --> 00:00:56.400
<v Buck>Why is everyone so quiet this morning?

11
00:00:57.400 --> 00:01:03.000
<v Narrator>Because a quiet forest is a forest that is planning something.

12
00:01:04.000 --> 00:01:09.600
<v Rodent>If we work together, we can take his breakfast.

13
00:01:10.600 --> 00:01:15.800
<v Narrator>So the plan begins, and the rabbit does not know it yet.

14
00:01:16.800 --> 00:01:22.000
<v Buck>I have apples, berries and one very large sandwich.

15
00:01:23.000 --> 00:01:28.600
<v Narrator>By the river he finds a butterfly, and he forgets the time.

16
00:01:29.600 --> 00:01:35.000
<v Rodent>Now! While he is watching the butterfly!

17
00:01:36.000 --> 00:01:41.600
<v Narrator>And that is when the quiet morning becomes a very loud one.

18
00:01:42.600 --> 00:01:48.000
<v Buck>Hey! That is my sandwich!

19
00:01:49.000 --> 00:01:54.400
<v Narrator>He runs after them, but they are small, fast and full of plans.

20
00:01:55.400 --> 00:02:01.000
<v Narrator>In the next scene we will see what the rabbit does about it.

21
00:02:02.000 --> 00:02:07.400
<v Rodent>Run faster! He is bigger than us!

22
00:02:08.400 --> 00:02:14.000
<v Narrator>The chase takes them past the mill and over the old bridge.

23
00:02:15.000 --> 00:02:20.600
<v Buck>You cannot hide forever behind that tree!

24
00:02:21.600 --> 00:02:27.000
<v Narrator>And the forest, which was so quiet, is now completely awake.
`;

/** Persian (fa) translation track — demonstrates dual-subtitle mode. */
export const DEMO_TRANSLATION_VTT = `WEBVTT

1
00:00:01.000 --> 00:00:05.600
صبح بخیر ای جنگل. امروز آرام شروع میشود.

2
00:00:06.200 --> 00:00:10.400
یک خرگوش بسیار بزرگ در لانهای بسیار کوچک بیدار میشود.

3
00:00:11.000 --> 00:00:15.400
او کش میآید، خمیازه میکشد و به نور صبح نگاه میکند.

4
00:00:16.000 --> 00:00:20.800
چه روز زیبایی برای بیرون بودن!

5
00:00:21.500 --> 00:00:26.200
تصمیم میگیرد پیش از صبحانه قدمی بزند.

6
00:00:27.000 --> 00:00:32.000
اول گلهای کنار رودخانه را بو میکنم.

7
00:00:33.000 --> 00:00:38.400
اما دو جوندهٔ کوچک از پشت درخت او را میپایند.

8
00:00:39.200 --> 00:00:44.000
به او نگاه کن. فکر میکند پادشاه جنگل است.

9
00:00:45.000 --> 00:00:50.400
دنبالش میافتند و رفتارشان دوستانه نیست.

10
00:00:51.200 --> 00:00:56.400
چرا امروز صبح همه اینقدر ساکتاند؟

11
00:00:57.400 --> 00:01:03.000
چون جنگلِ ساکت، جنگلی است که نقشه میکشد.

12
00:01:04.000 --> 00:01:09.600
اگر با هم باشیم، میتوانیم صبحانهاش را بگیریم.

13
00:01:10.600 --> 00:01:15.800
پس نقشه شروع میشود و خرگوش هنوز خبر ندارد.

14
00:01:16.800 --> 00:01:22.000
سیب و توت و یک ساندویچ خیلی بزرگ دارم.

15
00:01:23.000 --> 00:01:28.600
کنار رودخانه پروانهای میبیند و زمان را فراموش میکند.

16
00:01:29.600 --> 00:01:35.000
حالا! وقتی دارد پروانه تماشا میکند!

17
00:01:36.000 --> 00:01:41.600
و اینجا است که صبحِ آرام، بسیار پرصدا میشود.

18
00:01:42.600 --> 00:01:48.000
هی! آن ساندویچ من است!

19
00:01:49.000 --> 00:01:54.400
دنبالشان میدود، اما آنها کوچک و تند و پرنقشهاند.

20
00:01:55.400 --> 00:02:01.000
در صحنهٔ بعد میبینیم خرگوش چه میکند.

21
00:02:02.000 --> 00:02:07.400
تندتر بدو! او از ما بزرگتر است!

22
00:02:08.400 --> 00:02:14.000
تعقیب آنها را از آسیاب و روی پل قدیمی میگذراند.

23
00:02:15.000 --> 00:02:20.600
نمیتوانی تا ابد پشت آن درخت قایم شوی!

24
00:02:21.600 --> 00:02:27.000
و جنگلی که اینقدر آرام بود، حالا کاملاً بیدار است.
`;

const original = parseSubtitles(DEMO_ORIGINAL_VTT, "demo-en.vtt");
const translation = parseSubtitles(DEMO_TRANSLATION_VTT, "demo-fa.vtt");

export const DEMO_EPISODE: Episode = {
  id: "ep-big-buck-bunny",
  title: "The Quiet Forest (teaching captions)",
  show: "Flix Originals · Animated shorts",
  season: 1,
  episodeNumber: 1,
  description:
    "A very large rabbit, two small plotters and one stolen breakfast. The opening scene captioned for B1 learners, with every activity type enabled.",
  cefrLevel: "B1",
  targetLanguage: "English",
  poster: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=70&auto=format&fit=crop",
  durationSeconds: 596,
  sources: [
    {
      id: "demo-hls",
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      kind: "hls",
      quality: 95,
      licence: "creative-commons",
      label: "Adaptive HLS (multi-bitrate)",
      attribution: CREDIT,
    },
    {
      id: "demo-mp4",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      kind: "progressive",
      quality: 60,
      licence: "creative-commons",
      label: "Progressive MP4 (fallback host)",
      attribution: CREDIT,
    },
  ],
  tracks: [
    {
      id: "tr-en",
      kind: "text",
      label: "English (teaching captions)",
      language: "en",
      role: "original",
      format: original.format,
      raw: DEMO_ORIGINAL_VTT,
      cues: original.cues,
    },
    {
      id: "tr-fa",
      kind: "text",
      label: "فارسی (translation)",
      language: "fa",
      role: "translation",
      format: translation.format,
      raw: DEMO_TRANSLATION_VTT,
      cues: translation.cues,
    },
  ],
  createdAt: Date.now(),
};

const choice = (id: string, text: string, isCorrect = false) => ({ id, text, isCorrect });

export const DEMO_LESSON: Lesson = {
  schemaVersion: "1.0",
  metadata: {
    title: "The Quiet Forest — B1 listening & grammar",
    targetLanguage: "English",
    cefrLevel: "B1",
    estimatedDurationSeconds: 150,
    posterUrl: DEMO_EPISODE.poster,
    learnerL1: "fa",
    episodeId: DEMO_EPISODE.id,
  },
  globalSettings: { pointsToLevelUp: 500, enableStreak: true, suspenseSounds: true, activitiesPerSegment: 2 },
  badges: [
    { id: "b-first", name: "First Frame", emoji: "🎬", rarity: "common", condition: "Start any lesson", description: "You pressed play." },
    { id: "b-streak", name: "Hot Streak", emoji: "🔥", rarity: "rare", condition: "5 correct in a row", description: "Momentum is a language skill." },
    { id: "b-hard", name: "Inference Hunter", emoji: "🧠", rarity: "epic", condition: "Answer 3 hard activities correctly", description: "You read what the film only implies." },
    { id: "b-perfect", name: "Scene Complete", emoji: "🏆", rarity: "legendary", condition: "Finish every activity in a segment without a wrong answer", description: "Scene mastered." },
  ],
  learnerProfile: {
    name: "Nika",
    level: "B1",
    nativeLanguage: "fa",
    goals: "Speak more fluently about everyday plans",
    interests: "Animation, animals, cooking",
    facts: "Studies architecture in Tehran, walks in a park every morning",
  },
  segments: [
    {
      id: "s1",
      title: "A quiet morning (0:00–0:20)",
      startTime: 0,
      endTime: 20,
      summary: "The rabbit wakes up and greets the forest.",
      focus: { grammar: ["present simple"], vocabulary: ["burrow", "stretch", "quiet"], pronunciation: ["/ˈbʌroʊ/", "linking in 'wakes up'"] },
      activities: [
        {
          id: "s1a1",
          type: "flashcard",
          timestamp: 6.4,
          title: "Morning words",
          emoji: "🃏",
          color: "gold",
          points: 35,
          difficulty: "easy",
          requiredForNext: false,
          onReach: "pause",
          content: {
            cards: [
              { front: "burrow", back: "a hole in the ground where a small animal lives", example: "A very large rabbit wakes up in a very small burrow.", pronunciation: "/ˈbʌroʊ/", translation: "لانه" },
              { front: "to stretch", back: "to make your body longer after sleeping", example: "He stretches and yawns.", pronunciation: "/stretʃ/", translation: "کش آمدن" },
              { front: "quiet", back: "making almost no sound", example: "Today begins quietly.", pronunciation: "/ˈkwaɪət/", translation: "آرام" },
            ],
          },
          lessonContent: { warmUp: "What is the first thing you do when you wake up?", form: "Present simple for routines: he stretches, he yawns.", meaning: "Everyday morning actions.", use: "Describing your own morning.", personalizedExamples: ["Before studio class, Nika stretches and checks her sketches."], lifeApplication: "Tell a classmate about your morning in three sentences." },
          correctFeedback: "All three words are yours now.",
          incorrectFeedback: "Look at the example sentences again — the picture is right there.",
          comprehensiveFeedback: "burrow = the animal's home; stretch = what your body wants after sleep; quiet = the opposite of noisy. Notice the adverb: 'begins quietly' (adjective + -ly).",
        },
        {
          id: "s1a2",
          type: "multipleChoice",
          timestamp: 11,
          title: "Who is speaking?",
          emoji: "🎯",
          color: "teal",
          points: 50,
          difficulty: "easy",
          requiredForNext: true,
          onReach: "pause",
          content: {
            question: "At 0:11, who says 'He stretches, yawns, and looks at the morning light'?",
            options: [
              choice("o1", "A narrator who describes the action", true),
              choice("o2", "The rabbit, speaking about himself"),
              choice("o3", "One of the small rodents"),
              choice("o4", "A villager from the mill"),
            ],
          },
          lessonContent: { warmUp: "In films, who usually tells us what a character does?", form: "Third person + present simple for narration.", meaning: "A narrator describes; characters speak." },
          correctFeedback: "Yes — the voice describes him, so it is the narrator.",
          incorrectFeedback: "Listen again: the sentence says 'he', not 'I'.",
          comprehensiveFeedback: "A narrator uses he/she/they and present simple ('he stretches'). A character speaking about himself says 'I stretch'. That single pronoun is how you tell them apart — subtitles use <v Narrator> for exactly this reason.",
        },
      ],
    },
    {
      id: "s2",
      title: "Breakfast plans (0:20–0:38)",
      startTime: 20,
      endTime: 38,
      summary: "The rabbit decides to walk before breakfast.",
      focus: { grammar: ["will for plans"], vocabulary: ["flowers", "river", "decide"], pronunciation: ["weak 'will' → /əl/"] },
      activities: [
        {
          id: "s2a1",
          type: "fillBlanks",
          timestamp: 27,
          title: "His morning plan",
          emoji: "✏️",
          color: "orange",
          points: 55,
          difficulty: "medium",
          requiredForNext: true,
          onReach: "pause",
          content: {
            question: "Complete the rabbit's plan with the words you hear.",
            sentence: "First, I ___ smell the flowers by the ___.",
            blanks: ["will", "river"],
            translation: "اول گلهای کنار رودخانه را بو میکنم.",
          },
          lessonContent: { form: "'will' + base verb for a decision made now.", meaning: "Plans you announce as you make them.", use: "Saying what you will do next.", personalizedExamples: ["First I will finish my model, then I will walk in the park."], lifeApplication: "Announce three things you will do tomorrow." },
          correctFeedback: "Exactly — 'will smell' and 'by the river'.",
          incorrectFeedback: "You are missing the future word and the place word.",
          comprehensiveFeedback: "After 'will' always use the base verb: 'I will smell', never 'I will to smell' or 'I will smelling'. 'By the river' = next to it; 'in the river' means inside the water — a mistake that gets a laugh in class.",
        },
        {
          id: "s2a2",
          type: "trueFalse",
          timestamp: 33,
          title: "Somebody is watching",
          emoji: "⚖️",
          color: "teal",
          points: 40,
          difficulty: "easy",
          requiredForNext: true,
          onReach: "pause",
          content: { question: "Two small rodents are watching the rabbit from behind a tree.", answer: true },
          lessonContent: { warmUp: "Who else is in the forest this morning?" },
          correctFeedback: "Correct — and they are not being friendly.",
          incorrectFeedback: "Rewind three seconds: the tree moves.",
          comprehensiveFeedback: "Present continuous ('are watching') describes what is happening now, at this moment in the film. Compare with the narrator's present simple: 'He decides to walk' (the story moves) vs 'They are watching him' (this moment).",
        },
      ],
    },
    {
      id: "s3",
      title: "The plot begins (0:38–1:10)",
      startTime: 38,
      endTime: 70,
      summary: "The rodents decide to steal the rabbit's breakfast.",
      focus: { grammar: ["first conditional", "if + present"], vocabulary: ["plan", "together", "breakfast"], pronunciation: ["sentence stress: 'If we work together'"] },
      activities: [
        {
          id: "s3a1",
          type: "matching",
          timestamp: 40,
          title: "Match the speaker to the plan",
          emoji: "🔗",
          color: "green",
          points: 60,
          difficulty: "medium",
          requiredForNext: true,
          onReach: "pause",
          content: {
            pairs: [
              { left: "He thinks he is the king of the forest", right: "Rodent (about the rabbit)" },
              { left: "Why is everyone so quiet this morning?", right: "The rabbit (suspicious)" },
              { left: "If we work together, we can take his breakfast", right: "Rodent (planning the theft)" },
              { left: "A quiet forest is planning something", right: "Narrator (foreshadowing)" },
            ],
          },
          lessonContent: { form: "Reported vs direct speech; attributing lines.", meaning: "Who said what — the core of listening comprehension.", use: "Discussing a film with evidence." },
          correctFeedback: "Every line attributed correctly.",
          incorrectFeedback: "Check the pronouns: who says 'we', and who says 'his'?",
          comprehensiveFeedback: "Attribution works by pronouns: 'his breakfast' means the speaker is talking ABOUT someone (a rodent about the rabbit); 'my breakfast' would mean the owner is speaking. Narrator lines contain no 'I'/'we' and use the third person.",
        },
        {
          id: "s3a2",
          type: "wordScramble",
          timestamp: 45,
          title: "Unscramble the plan",
          emoji: "🔤",
          color: "purple",
          points: 45,
          difficulty: "easy",
          requiredForNext: true,
          onReach: "pause",
          content: { scrambledWord: "eogethtr", correctWord: "together" },
          lessonContent: { meaning: "together = with each other, as one group." },
          correctFeedback: "'Together' — the word the whole plan depends on.",
          incorrectFeedback: "Swap the first two letters and look again.",
          comprehensiveFeedback: "Notice the pronunciation: /təˈɡeðə(r)/ — the 'th' is voiced (/ð/), as in 'this', not the unvoiced 'th' of 'three'. Say both out loud: this / three / together.",
        },
      ],
    },
    {
      id: "s4",
      title: "The butterfly (1:10–1:35)",
      startTime: 70,
      endTime: 95,
      summary: "The rabbit forgets the time while the rodents move closer.",
      focus: { grammar: ["while + past continuous"], vocabulary: ["butterfly", "forget the time"], pronunciation: ["/ˈbʌtəflaɪ/"] },
      activities: [
        {
          id: "s4a1",
          type: "ordering",
          timestamp: 72,
          title: "Put the morning in order",
          emoji: "🔢",
          color: "green",
          points: 65,
          difficulty: "medium",
          requiredForNext: true,
          onReach: "pause",
          content: {
            orderedItems: [
              "The rabbit wakes up in his burrow.",
              "He decides to walk before breakfast.",
              "Two rodents start following him.",
              "He finds a butterfly by the river.",
              "The rodents say: Now! While he is watching!",
              "The sandwich disappears.",
            ],
          },
          lessonContent: { form: "Sequencing with past simple; time markers first/then/while." },
          correctFeedback: "That is exactly the order of the scene.",
          incorrectFeedback: "One of the middle steps is swapped — when does the butterfly appear?",
          comprehensiveFeedback: "To justify an order in English, use 'Before that…' and 'After that…'. Notice the film's turning point: 'While he is watching the butterfly' — the theft happens AT THE SAME TIME as the distraction.",
        },
        {
          id: "s4a2",
          type: "listeningComprehension",
          timestamp: 90,
          title: "Listening: the moment of the theft",
          emoji: "🎧",
          color: "blue",
          points: 70,
          difficulty: "hard",
          requiredForNext: true,
          onReach: "pause",
          content: {
            listening: {
              title: "Now! While he is watching the butterfly!",
              genre: "dialogue",
              audioText: "Now! While he is watching the butterfly! And that is when the quiet morning becomes a very loud one. He runs after them, but they are small, fast and full of plans.",
              translation: "حالا! وقتی دارد پروانه تماشا میکند! و اینجا است که صبحِ آرام، بسیار پرصدا میشود. دنبالشان میدود، اما آنها کوچک و تند و پرنقشهاند.",
              showTranscript: true,
              questions: [
                {
                  question: "When do the rodents act?",
                  options: [
                    choice("o1", "While the rabbit is watching a butterfly", true),
                    choice("o2", "While the rabbit is eating breakfast"),
                    choice("o3", "While the rabbit is sleeping again"),
                    choice("o4", "While the rabbit is talking to them"),
                  ],
                  timestamp: 90,
                },
                {
                  question: "Why can they escape?",
                  options: [
                    choice("o1", "They are small, fast and full of plans", true),
                    choice("o2", "They have a boat behind the mill"),
                    choice("o3", "The rabbit decides not to chase them"),
                    choice("o4", "They hide inside the old bridge"),
                  ],
                  timestamp: 94,
                },
              ],
            },
          },
          lessonContent: { form: "Past continuous with 'while' for simultaneous actions.", meaning: "The distraction and the theft happen together." },
          correctFeedback: "Both answers right — you listened for the reason, not just the words.",
          incorrectFeedback: "Replay and listen for 'while' — that word marks the simultaneous action.",
          comprehensiveFeedback: "Structure: MAIN ACTION (past simple) + while + BACKGROUND (past continuous). 'They acted while he was watching.' Learners often reverse it: 'While they acted, he watched' changes the meaning. Also note the collocation 'full of plans' = clever and scheming.",
        },
      ],
    },
    {
      id: "s5",
      title: "The chase (1:35–2:10)",
      startTime: 95,
      endTime: 130,
      summary: "The rabbit discovers the theft and chases them.",
      focus: { grammar: ["imperatives", "cannot + base verb"], vocabulary: ["chase", "bridge", "mill"], pronunciation: ["/tʃeɪs/", "contractions: cannot → can't"] },
      activities: [
        {
          id: "s5a1",
          type: "speaking",
          timestamp: 98,
          title: "Say it like the rabbit",
          emoji: "🎤",
          color: "purple",
          points: 95,
          difficulty: "medium",
          requiredForNext: true,
          onReach: "pause",
          content: {
            expectedSentence: "You cannot hide forever behind that tree!",
            pronunciation: "you CANnot HIDE forEVer beHIND that TREE",
            translation: "نمیتوانی تا ابد پشت آن درخت قایم شوی!",
          },
          lessonContent: { form: "cannot + base verb for impossibility; strong sentence stress on the content words.", use: "Complaining and warning — real spoken English.", personalizedExamples: ["You cannot sketch the whole building in one afternoon!"] },
          correctFeedback: "Clear stress on HIDE, FOREVER and TREE — that is how English sounds.",
          incorrectFeedback: "Say it again and push the stress onto HIDE and TREE, not on the little words.",
          comprehensiveFeedback: "In speech 'cannot' contracts to can't /kɑːnt/ (UK) or /kænt/ (US). Stress, not volume, carries the meaning: stress the CONTENT words, flatten the grammar words (you, cannot, behind, that).",
        },
        {
          id: "s5a2",
          type: "hotspot",
          timestamp: 104,
          title: "Where does the chase go?",
          emoji: "📍",
          color: "teal",
          points: 55,
          difficulty: "medium",
          requiredForNext: true,
          onReach: "pause",
          content: {
            hotspot: {
              x: 62,
              y: 44,
              question: "The narrator says the chase passes the mill and over the old bridge. Which place is mentioned FIRST?",
              options: [choice("o1", "The mill", true), choice("o2", "The old bridge"), choice("o3", "The river bank"), choice("o4", "The village square")],
              hint: "Listen for the order of the two nouns, not their size.",
            },
          },
          lessonContent: { form: "Order of mention in a list: A and B → A comes first." },
          correctFeedback: "Right — 'past the mill and over the old bridge'.",
          incorrectFeedback: "The sentence lists two places; the first one mentioned is the answer.",
          comprehensiveFeedback: "Prepositions carry the geography: 'PAST the mill' (you go by it) vs 'OVER the bridge' (you cross it, above the surface). Swap them and the scene becomes impossible — an easy way to remember them.",
        },
      ],
    },
    {
      id: "s6",
      title: "Reading the ending (2:10–2:27)",
      startTime: 130,
      endTime: 147,
      summary: "The forest is fully awake; what happens next is not shown yet.",
      focus: { grammar: ["prediction with will / might"], vocabulary: ["awake", "hide", "forever"] },
      activities: [
        {
          id: "s6a1",
          type: "readingChallenge",
          timestamp: 132,
          title: "What happens next? (what-if)",
          emoji: "📖",
          color: "pink",
          points: 75,
          difficulty: "hard",
          requiredForNext: true,
          onReach: "pause",
          content: {
            reading: {
              title: "The morning after the theft",
              genre: "whatIf",
              text: "The rodents have the sandwich and one full minute of head start. The rabbit knows the forest better than they do: he knows the mill path, the shallow part of the river and the tree where the branch is loose. He is angry, but he is also patient. If he runs straight after them, they will split up. If he waits by the bridge, they will come to him.",
              translation: "جوندهها ساندویچ را دارند و یک دقیقه جلوترند. خرگوش جنگل را بهتر از آنها میشناسد: راه آسیاب، جای کمعمق رودخانه و درختی که شاخهاش شل است. عصبانی است اما صبور هم هست. اگر مستقیم دنبالشان بدود، آنها جدا میشوند. اگر کنار پل منتظر بماند، خودشان سراغش میآیند.",
              questions: [
                {
                  question: "Which plan does the text suggest is smarter, and why?",
                  options: [
                    choice("o1", "Waiting at the bridge, because the rodents will come to him", true),
                    choice("o2", "Running straight after them, because he is bigger"),
                    choice("o3", "Climbing the loose branch, because it is higher"),
                    choice("o4", "Going home, because the sandwich is gone"),
                  ],
                  explanation: "The text contrasts both options and shows the second one is better: 'If he waits by the bridge, they will come to him.'",
                },
                {
                  question: "Which detail shows the rabbit's local knowledge?",
                  options: [
                    choice("o1", "He knows the shallow part of the river", true),
                    choice("o2", "He is angry but patient with them"),
                    choice("o3", "He has one full minute of head start"),
                    choice("o4", "He knows the sandwich is stolen"),
                  ],
                  explanation: "Local knowledge = knowing the geography: the mill path, the shallow river, the loose branch.",
                },
              ],
            },
          },
          lessonContent: { form: "First conditional for strategy: If + present, will + verb.", meaning: "Predicting the consequences of a choice.", use: "Explaining a plan and its result." },
          correctFeedback: "You used the text's own logic, not a guess.",
          incorrectFeedback: "Go back to the sentence starting with 'If he waits…' and read the second half.",
          comprehensiveFeedback: "First conditional = real, possible future: 'If he waits, they will come.' Compare second conditional (unreal): 'If he waited, they would come.' The 'what-if' genre exists to practise exactly this contrast, so you can argue about a story you cannot change.",
        },
        {
          id: "s6a2",
          type: "discussion",
          timestamp: 140,
          title: "Was the rabbit careless or unlucky?",
          emoji: "💬",
          color: "blue",
          points: 60,
          difficulty: "hard",
          requiredForNext: false,
          onReach: "pause",
          content: {
            discussionPrompt: "Was the rabbit careless, or was he unlucky? Take a position, give one detail from the scene AND one counter-argument ('I see your point, but…').",
          },
          lessonContent: { warmUp: "Think of a time you lost something because you were distracted.", use: "Opinion + evidence + counter-argument — the B1 speaking exam triad." },
          correctFeedback: "You gave a position with evidence and a rebuttal. That is exam-level structure.",
          incorrectFeedback: "Add one detail from the scene (a time, a place, a line) to support your opinion.",
          comprehensiveFeedback: "Upgrade hedging: 'He was probably careless' is softer than 'He was careless'. Use 'probably', 'arguably', 'I'd say' to sound considered, and always answer a counter-argument with 'I see your point, but…'.",
        },
      ],
    },
    {
      id: "s7",
      title: "Language lab (1:00–2:00 review)",
      startTime: 120,
      endTime: 130,
      summary: "Deliberate practice: a short drag-and-drop and a reflection.",
      activities: [
        {
          id: "s7a1",
          type: "dragDrop",
          timestamp: 121,
          title: "Sort the language",
          emoji: "🧩",
          color: "green",
          points: 60,
          difficulty: "medium",
          requiredForNext: false,
          onReach: "pause",
          content: {
            question: "Move each phrase to the function it performs in the scene.",
            items: ["I will smell the flowers", "While he is watching", "If we work together", "You cannot hide forever"],
            targets: ["Plan", "Simultaneous action", "Condition", "Warning"],
          },
          lessonContent: { form: "will / while / if / cannot — four functions, four forms." },
          correctFeedback: "All four functions matched.",
          incorrectFeedback: "Ask yourself: which one needs a second action to be true? That is the condition.",
          comprehensiveFeedback: "Functions first, forms second: a PLAN uses will; a SIMULTANEOUS action needs while + -ing; a CONDITION needs if + present; a WARNING uses cannot/must not. Learners often learn the forms and then forget which function to reach for — this activity reverses that order.",
        },
        {
          id: "s7a2",
          type: "reflection",
          timestamp: 125,
          title: "Your own quiet morning",
          emoji: "🪞",
          color: "pink",
          points: 40,
          difficulty: "easy",
          requiredForNext: false,
          onReach: "pause",
          content: {
            reflectionPrompt: "Describe your own morning in three sentences using 'first', 'while' and 'will'. This is saved to your journal.",
          },
          lessonContent: { use: "Transfer: take the scene's grammar into your real life." },
          correctFeedback: "Saved to your journal — read it before the next lesson.",
          incorrectFeedback: "Try again with one sentence for each word: first / while / will.",
          comprehensiveFeedback: "Journaling is where grammar becomes yours. Keep the same tense logic: 'First I… while I… and later I will…'",
        },
      ],
    },
    {
      id: "s8",
      title: "Wrap-up & badge check",
      startTime: 147,
      endTime: 150,
      summary: "Video pause: predict the next scene out loud.",
      activities: [
        {
          id: "s8a1",
          type: "videoPause",
          timestamp: 148,
          title: "Pause and predict",
          emoji: "⏸️",
          color: "gold",
          points: 45,
          difficulty: "medium",
          requiredForNext: false,
          onReach: "pause",
          content: {
            videoPausePrompt: "Predict the next 60 seconds in two sentences. Use 'will' for what you are sure about and 'might' for what you are not.",
          },
          lessonContent: { form: "will (certain) vs might (possible) for predictions." },
          correctFeedback: "Two clear predictions — press play and see if the film agrees.",
          incorrectFeedback: "Use both words: one 'will' sentence, one 'might' sentence.",
          comprehensiveFeedback: "Certainty ladder: will → should → might/could → may not → will not. A prediction activity trains the whole ladder, which is exactly what B1/B2 speaking exams reward.",
        },
      ],
    },
  ],
};
