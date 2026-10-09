/* ════════════════════════════════════════════════════════════════════════════
   🧪 DEMO LESSONS — a finished, complete lesson for every kind, hand-written
   ════════════════════════════════════════════════════════════════════════════

   The Test button on a lesson tile has to open something REAL, with no AI and no
   waiting. This file is that. Every kind of lesson — including the five immersion
   models (Move & Tell a Story, Circle Time, Fun Steps, Mission, Test & Boss
   Battle) — has a finished example here, written exactly to the JSON contract the
   paste box checks, so the button always plays and never shows an empty panel.

   Three jobs, and all three matter:

   1. **Proof the button works.** A tutor pressing ▶ Test must see a real lesson in
      one second, on a child's screen, with their own hero and pet on the splash.
   2. **A visible standard.** A prompt is a specification; a specification is judged
      against a worked example. These show how many steps, how short the tutor's
      lines are, and how little a small child is asked to read.
   3. **A demonstration of the method.** The five new kinds are defined by their
      ORDER — a TPR story moves before it speaks, ESA engages before it studies, TTT
      tests before it teaches — so their demos carry exactly those signature steps.

   Everything here is deterministic (no randomness) so a tutor who presses Test
   twice sees the same lesson, and every media link is a real, free SEARCH page,
   which is the one kind of link that still works in 2026 no matter what moved.
   ════════════════════════════════════════════════════════════════════════════ */

import type { Learner } from '../types';
import type {
  KidAgeBand,
  KidLesson,
  KidLessonCircle,
  KidLessonDeck,
  KidLessonSheet,
  KidLessonGame,
  KidLessonMedia,
  KidLessonMission,
  KidLessonMovement,
  KidLessonPhonics,
  KidLessonQuest,
  KidLessonQuiz,
  KidLessonRoutine,
  KidLessonRun,
  KidLessonScene,
  KidLessonStep,
  KidLessonStory,
  KidLessonStoryWalk,
  KidLessonWord,
} from './lessonCreatorTypes';

/* ────────────────────────────────────────────────────────────────────────────
   Word banks — the words a demo teaches, picked to suit the kind
   ──────────────────────────────────────────────────────────────────────────── */

const VY_ANIMALS: KidLessonWord[] = [
  { word: 'duck', emoji: '🦆', sayAloud: 'quack quack (make the sound)', meaning: 'a bird in the water', example: 'The duck is in the water.' },
  { word: 'cow', emoji: '🐮', sayAloud: 'moo', meaning: 'a big farm animal', example: 'The cow says moo.' },
  { word: 'cat', emoji: '🐈', sayAloud: 'meow', meaning: 'a soft little pet', example: 'The cat is soft.' },
  { word: 'dog', emoji: '🐕', sayAloud: 'woof woof', meaning: 'a friendly pet', example: 'The dog runs fast.' },
  { word: 'pig', emoji: '🐖', sayAloud: 'oink oink', meaning: 'a pink farm animal', example: 'The pig is pink.' },
  { word: 'sheep', emoji: '🐑', sayAloud: 'baa baa', meaning: 'a woolly animal', example: 'The sheep is soft.' },
];

const VY_ACTIONS: KidLessonWord[] = [
  { word: 'jump', emoji: '🦘', sayAloud: 'jump!', meaning: 'up in the air', example: 'Jump like a frog!' },
  { word: 'clap', emoji: '👏', sayAloud: 'clap clap', meaning: 'hands together', example: 'Clap your hands!' },
  { word: 'run', emoji: '🏃', sayAloud: 'run fast', meaning: 'go very fast', example: 'Run to the door!' },
  { word: 'sit', emoji: '🪑', sayAloud: 'sit down', meaning: 'down on the floor', example: 'Sit down, please.' },
  { word: 'wave', emoji: '👋', sayAloud: 'wave bye-bye', meaning: 'move your hand', example: 'Wave to the duck!' },
  { word: 'sleep', emoji: '😴', sayAloud: 'shhh, sleep', meaning: 'close your eyes', example: 'Sleep like a cat.' },
];

/**
 * The command bank for 🤸 Move & Do.
 *
 * One source of truth for the seven commands, because the same list has to appear
 * three ways: as the lesson's words, as the ladder the deck shows, and as the tick
 * list in the movement game. Six of the seven are already known to a 2-5 year-old
 * and exactly ONE is new (`stretch`) — that ratio is the method. `twoStep` is the
 * chain for the 4- and 5-year-olds in the band: never the default, because a
 * two-step direction is genuinely too much for a two-year-old.
 */
const TPR_COMMANDS: (KidLessonWord & { line: string; twoStep: string })[] = [
  { word: 'jump', emoji: '🦘', sayAloud: 'jump!', meaning: 'up in the air', example: 'Jump like a frog!', line: 'Jump like a frog!', twoStep: 'Clap your hands, then jump!' },
  { word: 'clap', emoji: '👏', sayAloud: 'clap clap', meaning: 'hands together', example: 'Clap your hands!', line: 'Clap your hands!', twoStep: 'Clap twice, then sit down!' },
  { word: 'sit down', emoji: '🪑', sayAloud: 'sit down', meaning: 'down on the floor', example: 'Sit down, please.', line: 'Sit down on the floor.', twoStep: 'Turn around, then sit down!' },
  { word: 'stand up', emoji: '🧍', sayAloud: 'stand up', meaning: 'up on your feet', example: 'Stand up tall!', line: 'Stand up tall like a tree!', twoStep: 'Stand up, then turn around!' },
  { word: 'turn around', emoji: '🌀', sayAloud: 'turn around', meaning: 'go round in a circle', example: 'Turn around slowly.', line: 'Turn around, all the way!', twoStep: 'Jump twice, then turn around!' },
  { word: 'touch your nose', emoji: '👃', sayAloud: 'touch your nose', meaning: 'your nose is on your face', example: 'Touch your nose!', line: 'Touch your nose!', twoStep: 'Stretch up high, then touch your nose!' },
  { word: 'stretch', emoji: '🙆', sayAloud: 'stretch', meaning: 'make yourself long', example: 'Stretch up like a tall tree!', line: 'Stretch up high like a tall tree!', twoStep: 'Stretch up high, then sit down slowly!' },
];

/**
 * One command, one line of the ladder — the shape the deck and the engine both read.
 */
const tprLadder = (): NonNullable<KidLessonMovement['commands']> =>
  TPR_COMMANDS.map((c) => ({ command: c.word, emoji: c.emoji, do: c.line, twoStep: c.twoStep }));

const VY_ROUTINE: KidLessonWord[] = [  { word: 'hello', emoji: '👋', sayAloud: 'he-llo', meaning: 'a friendly word', example: 'Hello, duck!' },
  { word: 'wash', emoji: '🧼', sayAloud: 'wash hands', meaning: 'clean with water', example: 'Wash your hands.' },
  { word: 'eat', emoji: '🍎', sayAloud: 'eat it', meaning: 'food in your tummy', example: 'Let’s eat!' },
  { word: 'sleep', emoji: '🛏️', sayAloud: 'sleep time', meaning: 'go to bed', example: 'Time to sleep.' },
  { word: 'bye', emoji: '🙋', sayAloud: 'bye-bye', meaning: 'when we go', example: 'Bye-bye, cat!' },
  { word: 'again', emoji: '🔁', sayAloud: 'a-gain', meaning: 'one more time', example: 'Again, please!' },
];

/**
 * The routine bank for 🚿 Routines & Words.
 *
 * Five of these are words a family says anyway (`hello`, `wash`, `eat`, `sleep`,
 * `bye`); exactly ONE is new — `sleepy` — because it is the word that lets a child
 * ANSWER at bedtime instead of only obeying, which is the whole difference between a
 * routine they follow and a routine they can talk about.
 */
const VY_ROUTINE_WORDS: KidLessonWord[] = [
  { word: 'hello', emoji: '👋', sayAloud: 'he-llo', meaning: 'a friendly word', example: 'Hello! Time to wash.' },
  { word: 'wash', emoji: '🧼', sayAloud: 'wash', meaning: 'clean with water', example: 'Wash your hands.' },
  { word: 'eat', emoji: '🍎', sayAloud: 'eat it', meaning: 'food in your tummy', example: 'Time to eat!' },
  { word: 'sleep', emoji: '🛏️', sayAloud: 'sleep time', meaning: 'go to bed', example: 'Time to sleep.' },
  { word: 'bye', emoji: '🙋', sayAloud: 'bye-bye', meaning: 'when we go', example: 'Bye-bye, teddy!' },
  { word: 'sleepy', emoji: '💤', sayAloud: 'sleepy', meaning: 'ready for bed', example: 'I am sleepy.' },
];

/** The three moments of the day — one source of truth for the deck, the engine and the family card. */
const ROUTINE_MOMENTS = (): NonNullable<KidLessonRoutine['moments']> => [
  {
    moment: 'wash hands',
    emoji: '🧼',
    say: 'Wash, wash, wash your hands!',
    childDoes: 'Rubs hands together like they are under the tap.',
    childSays: '“wash!” — then “hands!” when you stop and look at them.',
    photoQuery: 'child washing hands bathroom sink',
  },
  {
    moment: 'eat',
    emoji: '🍎',
    say: 'Time to eat! Eat, eat, eat!',
    childDoes: 'Pretends to eat with a big spoon.',
    childSays: '“eat!” — and “more!” if they want more.',
    photoQuery: 'toddler eating at family table',
  },
  {
    moment: 'sleep',
    emoji: '🛏️',
    say: 'Shhh... sleepy head. Time to sleep.',
    childDoes: 'Lies down and closes their eyes.',
    childSays: '“sleepy!” — their one new word today.',
    photoQuery: 'child sleeping in bed',
  },
];

const Y_POND: KidLessonWord[] = [
  { word: 'duck', emoji: '🦆', meaning: 'a bird that swims', example: 'The duck swims in the pond.' },
  { word: 'pond', emoji: '💧', meaning: 'a small pool of water', example: 'The pond is cool and blue.' },
  { word: 'swim', emoji: '🏊', meaning: 'move through water', example: 'Fish swim all day.' },
  { word: 'wing', emoji: '🪽', meaning: 'a bird uses it to fly', example: 'The duck flaps its wing.' },
  { word: 'splash', emoji: '💦', meaning: 'water flying up', example: 'Splash! Into the water.' },
  { word: 'dive', emoji: '🤿', meaning: 'go under the water', example: 'The duck dives down.' },
  { word: 'frog', emoji: '🐸', meaning: 'a green jumping animal', example: 'The frog jumps on a leaf.' },
  { word: 'lily', emoji: '🌸', meaning: 'a flower on the water', example: 'A pink lily floats by.' },
  { word: 'sun', emoji: '☀️', meaning: 'the bright light in the sky', example: 'The sun is warm today.' },
  { word: 'boat', emoji: '⛵', meaning: 'it floats on water', example: 'A little boat sails past.' },
];

const Y_PHONICS: KidLessonWord[] = [
  { word: 'cat', emoji: '🐈', meaning: 'a soft pet', example: 'The cat sat on the mat.' },
  { word: 'hat', emoji: '🎩', meaning: 'you wear it on your head', example: 'My hat is red.' },
  { word: 'mat', emoji: '🧶', meaning: 'you sit on it', example: 'Sit on the mat.' },
  { word: 'bat', emoji: '🦇', meaning: 'a flying animal at night', example: 'A bat flies at night.' },
  { word: 'rat', emoji: '🐀', meaning: 'a small grey animal', example: 'The rat runs fast.' },
  { word: 'sat', emoji: '🪑', meaning: 'you did sit down', example: 'She sat on the mat.' },
  { word: 'flat', emoji: '📏', meaning: 'not bumpy', example: 'The mat is flat.' },
  { word: 'that', emoji: '👉', meaning: 'not this one, the other one', example: 'Look at that hat!' },
];

const Y_PAST: KidLessonWord[] = [
  { word: 'walked', emoji: '🚶', meaning: 'went on foot (yesterday)', example: 'We walked to the pond.' },
  { word: 'played', emoji: '⚽', meaning: 'had fun (yesterday)', example: 'They played by the water.' },
  { word: 'jumped', emoji: '🦘', meaning: 'went up (yesterday)', example: 'The frog jumped high.' },
  { word: 'dived', emoji: '🤿', meaning: 'went under (yesterday)', example: 'The duck dived down.' },
  { word: 'splashed', emoji: '💦', meaning: 'made water fly (yesterday)', example: 'She splashed us all.' },
  { word: 'watched', emoji: '👀', meaning: 'looked at (yesterday)', example: 'We watched the ducks.' },
  { word: 'stopped', emoji: '✋', meaning: 'did not go on', example: 'The rain stopped at noon.' },
  { word: 'started', emoji: '▶️', meaning: 'began', example: 'The story started happily.' },
  { word: 'laughed', emoji: '😂', meaning: 'made a happy sound', example: 'We laughed a lot.' },
  { word: 'helped', emoji: '🤝', meaning: 'did something useful', example: 'The frog helped the duck.' },
];

/* ────────────────────────────────────────────────────────────────────────────
   Free media — always a real SEARCH page, so the link never dies
   ──────────────────────────────────────────────────────────────────────────── */

const search = (site: string, query: string, path = '') => `${site}${path}${encodeURIComponent(query)}`;

const VERY_YOUNG_MEDIA: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A duck song we can sing 🎵',
    url: search('https://www.youtube.com/results?search_query=', 'super simple songs duck'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'super simple songs duck'),
    where: 'both',
    forStep: 'Hello song',
    why: 'Sing it with the actions — the child copies you.',
    source: 'Super Simple Songs',
    embeddable: false,
  },
  {
    kind: 'audio',
    title: 'A real duck sound 🔊',
    url: 'https://freesound.org/search/?q=duck+quack',
    searchUrl: 'https://freesound.org/search/?q=duck+quack',
    where: 'class',
    forStep: 'Meet the word',
    why: 'Play it, then say “quack quack” together.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'activity',
    title: 'A tap-and-play animals game 🧩',
    url: 'https://learn.khanacademy.org/khan-academy-kids/',
    searchUrl: 'https://learn.khanacademy.org/khan-academy-kids/',
    where: 'home',
    forStep: 'At home',
    why: 'Free, ad-free little songs and games for a grown-up and child.',
    source: 'Khan Academy Kids',
  },
  {
    kind: 'picture',
    title: 'A real photo of a duck 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'duck', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'duck', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Meet the word',
    why: 'A photograph of the real thing, not a drawing.',
    source: 'Wikimedia Commons',
  },
];

/* The routine lesson's own media — bath, food, bed. The band default (a duck song)
   belongs to a lesson about animals, not to a week of washing hands. */
const ROUTINE_MEDIA: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A real hand-washing song 🚿',
    url: search('https://www.youtube.com/results?search_query=', 'super simple songs this is the way we wash our hands'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'super simple songs this is the way we wash our hands'),
    where: 'both',
    forStep: 'The three moments',
    why: 'Sing it at the real sink — the song does the remembering, so the words come out of the child.',
    source: 'Super Simple Songs',
    embeddable: false,
  },
  {
    kind: 'audio',
    title: 'A real tap running 🔊',
    url: 'https://freesound.org/search/?q=water+tap+running',
    searchUrl: 'https://freesound.org/search/?q=water+tap+running',
    where: 'class',
    forStep: 'The cue — it is time!',
    why: 'Play it, then whisper “TIME!” over the sound — hearing the cue before seeing the sink is what makes it stick.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'picture',
    title: 'A real photo of a child washing hands 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'child washing hands', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'child washing hands', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'The three moments',
    why: 'A photograph of the real moment, not a drawing — at this age the picture IS the word.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'activity',
    title: 'A daily-routine game the class can tap 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'daily routine kids'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'daily routine kids'),
    where: 'home',
    forStep: 'At home',
    why: 'Free, no logins — a grown-up and the child tap the moments in order and say each line.',
    source: 'Wordwall',
    embeddable: true,
  },
];

const YOUNG_MEDIA: KidLessonMedia[] = [
  {
    kind: 'activity',
    title: 'A pond quiz the class can tap 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'pond duck animals'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'pond duck animals'),
    where: 'class',
    forStep: 'Play',
    why: 'A ready-made game on one shared screen — two teams, no logins.',
    source: 'Wordwall',
    embeddable: true,
  },
  {
    kind: 'video',
    title: 'A short pond clip to watch 🎬',
    url: search('https://www.youtube.com/results?search_query=', 'ducks pond for kids'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'ducks pond for kids'),
    where: 'class',
    forStep: 'Engage',
    why: 'Watch first, then talk about what you saw.',
    source: 'YouTube',
    embeddable: false,
  },
  {
    kind: 'story',
    title: 'A story read aloud 📖',
    url: 'https://storylineonline.net/library',
    searchUrl: 'https://storylineonline.net/library',
    where: 'both',
    forStep: 'Story',
    why: 'A real actor reads a picture book — lovely for the last five minutes.',
    source: 'Storyline Online',
  },
  {
    kind: 'audio',
    title: 'Free song to sing 🎧',
    url: search('https://learnenglishkids.britishcouncil.org/search?keys=', 'pond song'),
    searchUrl: search('https://learnenglishkids.britishcouncil.org/search?keys=', 'pond song'),
    where: 'class',
    forStep: 'Warm-up',
    why: 'A listen-and-join-in song made for learners.',
    source: 'British Council LearnEnglish Kids',
  },
  {
    kind: 'picture',
    title: 'Real photos of pond life 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'pond', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'pond', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Study',
    why: 'The real thing, for the words that have no good emoji.',
    source: 'Wikimedia Commons',
  },
];

const mediaForBand = (band: KidAgeBand): KidLessonMedia[] =>
  (band === 'veryYoung' ? VERY_YOUNG_MEDIA : YOUNG_MEDIA).map((m) => ({ ...m }));

/* ────────────────────────────────────────────────────────────────────────────
   Small builders
   ──────────────────────────────────────────────────────────────────────────── */

const step = (
  name: string,
  minutes: number,
  teacherScript: string,
  childAction: string,
  tip?: string,
  print?: string,
): KidLessonStep => ({
  name,
  minutes,
  teacherScript,
  childAction,
  tip,
  print,
});

const item = (
  prompt: string,
  answer: string,
  distractors: string[],
  picture?: string,
  /* The two fields that turn a tap into a talking turn: the sentence the child says
     on a hit, and the follow-up the adult asks afterwards. */
  extra?: { childSays?: string; ask?: string },
) => ({
  prompt,
  answer,
  distractors,
  picture,
  ...(extra || {}),
});

/**
 * One phase of the 30-minute run sheet.
 *
 * A phase is not a step with a longer name. It carries the three things that stop a
 * lesson collapsing into eight minutes: a FLOOR it cannot end before, a TALK TARGET
 * the child owes, and a RESERVE of three more things to do if it finishes early. On
 * top of that it carries the sentence frame the child completes and the three-question
 * ladder, so a tutor never runs out of things to ask a child who is answering well.
 */
const phase = (
  name: string,
  phaseName: string,
  minutes: number,
  floorMinutes: number,
  talkTarget: number,
  teacherScript: string,
  childAction: string,
  sayFrame: string,
  questionLadder: string[],
  reserve: string[],
  tip: string,
): KidLessonStep => ({
  name,
  phase: phaseName,
  minutes,
  floorMinutes,
  talkTarget,
  teacherScript,
  childAction,
  sayFrame,
  questionLadder,
  reserve,
  tip,
});

const wordsByBand = (band: KidAgeBand): KidLessonWord[] =>
  (band === 'veryYoung' ? VY_ANIMALS : Y_POND).map((w) => ({ ...w }));

/* ────────────────────────────────────────────────────────────────────────────
   The per-kind lesson bodies
   ──────────────────────────────────────────────────────────────────────────── */

interface DemoParts {
  title: string;
  words?: KidLessonWord[];
  steps?: KidLessonStep[];
  game?: KidLessonGame;
  lyrics?: string[];
  chantRhythm?: string;
  worksheet?: string[];
  homework?: string[];
  caregiverNote?: string;
  teacherNote?: string;
  objectives?: string[];
  materials?: string[];
  durationMinutes?: number;
  /* The hyper-realistic, talk-heavy session pieces. */
  scene?: KidLessonScene;
  mission?: KidLessonMission;
  run?: KidLessonRun;
  talkGoal?: number;
  /** The story, the story map, the retelling ladder and the hot-seat. */
  story?: KidLessonStory;
  /** The sound, the ladder, the pairs, the made-up words and the decodable story. */
  phonics?: KidLessonPhonics;
  /** The command ladder and the crown round, when the kind is TPR. */
  movement?: KidLessonMovement;
  /** The three moments of the day and the family's say-it-like-this script. */
  routine?: KidLessonRoutine;
  /** Overrides the band's default media, so the links match the lesson's own words. */
  media?: KidLessonMedia[];
  /** The story the child walks through, when the kind is TPR-storytelling. */
  storyWalk?: KidLessonStoryWalk;
  /** The same hello, the check-in and the ONE surprise, when the kind is a circle. */
  circle?: KidLessonCircle;
  /** The printable's tasks with a talking turn each, when the kind is a sheet. */
  sheet?: KidLessonSheet;
  /** The week of jobs with their XP and their lines, when the kind is a quest. */
  quest?: KidLessonQuest;
  /** The rounds, the score line and the child's final round, when the kind is a quiz. */
  quiz?: KidLessonQuiz;
  /** The cards, the passes and the spaced schedule, when the kind is a deck. */
  deck?: KidLessonDeck;
}

/* Very Young — the two immersion models ------------------------------------ */

/* ── Move & Tell a Story: the story the child walks through ──────────────── */

/* The frog's words: six the child already knows from moving, plus HOP, which is the
   one new word the whole 30 minutes is built around. */
const VY_WALK_WORDS: KidLessonWord[] = [
  /* The same six actions the child already moves to, with the wave pointed at the
     frog instead of the duck — this story has no duck in it. */
  ...VY_ACTIONS.map((w) => (w.word === 'wave' ? { ...w, example: 'Wave bye-bye to the frog!' } : { ...w })),
  { word: 'hop', emoji: '🐸', sayAloud: 'hop!', meaning: 'a little jump', example: 'Hop, hop, hop!' },
];

/** “Jump Like a Frog” — five beats, one action each, and an echo that always returns. */
const FROG_WALK: KidLessonStoryWalk = {
  title: 'Jump Like a Frog',
  echo: 'Hop, hop, hop!',
  map: ['🐸 a sad frog', '👏 clapping', '🏃 running', '💧 the pond'],
  choose: 'The frog wants to hop somewhere new. Where does he hop? You say it: “Hop to the ___!”',
  beats: [
    { line: 'The little frog is sad. He lost his hop!', action: 'Sit down like a very sad frog.', say: 'hop!', emoji: '🐸' },
    { line: 'He claps his hands. Clap, clap! Nothing happens.', action: 'Clap your hands twice.', say: 'Hop, hop, hop!', emoji: '👏' },
    { line: 'He runs to the stone. Still no hop!', action: 'Run to the door and back.', say: 'Hop, hop, hop!', emoji: '🏃' },
    { line: 'Then he remembers. HOP!', action: 'Jump like a frog — two big jumps.', say: 'hop, hop, HOP!', emoji: '🐸' },
    { line: 'He hops to the pond, sits down and waves bye-bye. Goodnight, frog!', action: 'Sit down, wave with both hands, then close your eyes.', say: 'Goodnight, frog!', emoji: '💧' },
  ],
};

/** The frog story's own links — a frog hop song, a real frog, and a game for home. */
const FROG_WALK_MEDIA: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A frog hop song we can jump to 🐸',
    url: search('https://www.youtube.com/results?search_query=', 'super simple songs frog hop for kids'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'super simple songs frog hop for kids'),
    where: 'both',
    forStep: 'The story, beat by beat',
    why: 'Play it once and hop on every “hop” — the song makes the echo line impossible to forget.',
    source: 'Super Simple Songs',
    embeddable: false,
  },
  {
    kind: 'audio',
    title: 'A real frog sound 🔊',
    url: 'https://freesound.org/search/?q=frog+croak',
    searchUrl: 'https://freesound.org/search/?q=frog+croak',
    where: 'class',
    forStep: 'Action words',
    why: 'Play it and whisper “the frog!” — then everyone hops once.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'picture',
    title: 'A real photo of a frog on a stone 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'frog on a stone', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'frog on a stone', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Action words',
    why: 'A photograph of the real animal, not a drawing — at this age the picture IS the word.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'activity',
    title: 'A free animal-actions game for home 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'animal actions kids'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'animal actions kids'),
    where: 'home',
    forStep: 'At home',
    why: 'No logins — a grown-up and the child tap the animal and do the action.',
    source: 'Wordwall',
    embeddable: true,
  },
];

function tprStoryDemoVY(): DemoParts {
  return {
    title: 'Jump Like a Frog',
    durationMinutes: 30,
    talkGoal: 29,
    objectives: [
      'Do an action the moment they hear the word',
      'Join the echo line every time it comes back',
      'Hop, clap and sit when the story says so',
    ],
    materials: ['Space to hop', 'A frog toy or one big frog picture', 'The frog hop song on the phone'],
    words: VY_WALK_WORDS.map((w) => ({ ...w })),
    storyWalk: FROG_WALK,
    steps: [
      phase(
        '1 · Stand up and shout HOP!', 'HOOK', 3, 3, 3,
        'Shhh... look! It is a frog 🐸 A very sad frog. He lost something. Can you guess what? ... Stand up and shout it with me: HOP! One more time, big: HOP!',
        'Stands up, shouts “HOP!” twice, then sits back down like a sad frog.',
        'Shout “HOP!”',
        ['Is the frog happy or sad?', 'What did the frog lose — his hop or his hat?', 'Can you hop like a frog?'],
        ['Whisper “hop…”, then shout it.', 'Hop three times on the spot.', 'Let the frog toy shout it too.'],
        'The child shouts before they know the story, so the first English word of the lesson is a word they enjoy — and “hop” is the new word, already in their mouth.',
      ),
      phase(
        '2 · The action chant', 'WARM-UP TALK', 4, 4, 4,
        'Clap, clap, clap your hands! 👏 Jump, jump, jump up high! 🦘 Now hop, hop, hop! 🐸 Which one shall we do again — clap, jump or hop?',
        'Claps, jumps and hops with the chant, then names the one they want again.',
        'Say “hop!” and one more action: “clap!” or “jump!”',
        ['Which one do you like best?', 'Can you hop with me?', 'Who hops faster — you or the frog?'],
        ['Sing the chant in a whisper.', 'Let the frog choose: point at a picture.', 'Do all three actions in slow motion.'],
        'The same chant every week, so the melody does the remembering — and the child’s choice is their first spoken turn of the lesson.',
      ),
      phase(
        '3 · Six you know, one that is new', 'INPUT', 6, 5, 8,
        'Watch me: jump! 🦘 Jump like a frog. Clap your hands! 👏 Run to the door! 🏃 Sit down. 🪑 Wave bye-bye! 👋 Shhh... sleep. 😴 And here is the NEW one: HOP! 🐸 Hop is a little jump. Say it: hop!',
        'Does every action straight away and says the action word after you each time.',
        'Say “hop!” — today’s new word.',
        ['Which one is a little jump?', 'Can you hop and clap together?', 'What does a frog say?'],
        ['Do every action in slow motion.', 'Do every action as fast as you can.', 'Say the word, then do the action twice.'],
        'Six known actions plus ONE new word — that is why a two-year-old can answer instantly instead of guessing, and “hop” is what the story is about to need.',
      ),
      phase(
        '4 · The story, beat by beat', 'GUIDED TALK', 6, 5, 6,
        'Listen! The little frog is sad. He lost his hop! 🐸 (sit down like a sad frog) He claps his hands. Clap, clap! Nothing happens. 👏 He runs to the stone. Still no hop! 🏃 Then he remembers... HOP! 🐸 He hops to the pond, sits down and waves bye-bye. Goodnight, frog! 💧',
        'Does the action on every beat and joins the echo “Hop, hop, hop!” every time it comes back.',
        'Say the echo with me: “Hop, hop, hop!”',
        ['Did the clapping help?', 'What did the frog remember?', 'Who is sleepy now — you or the frog?'],
        ['Tell the story again, very slowly.', 'Let the frog do the actions and the child say them.', 'Stop before the last word and let the child finish the line.'],
        'Every beat is something the child DOES, and the echo line comes back five times — so by the end of the story they have said the same English line five times without ever being asked a question.',
      ),
      {
        ...phase(
          '5 · You tell it, I do it', 'FREE PRODUCTION', 7, 6, 6,
          'Now YOU are the storyteller! 🐸 You say it and I must do it. Say: “hop, hop, hop!” I am hopping! Now you decide — where does the frog hop? Say it: “Hop to the ___!” 🪑🛏️🚪',
          'Tells the story back and gives the grown-up the actions, then chooses where the frog hops next.',
          'Say “Hop to the ___!” and fill in the place.',
          ['Where did the frog hop?', 'What did he do at the pond?', 'Shall we hop to the sofa or the door?'],
          ['Do the whole story again in a whisper.', 'Let the frog tell it and the child copy the frog.', 'Add a new place: hop to the kitchen!'],
          'Nothing moves until the child says the English — and the choice beat is the first sentence in the whole lesson that is theirs rather than a line they copied.',
        ),
        /* The ONE phase that opens the engine: the story walk lives inside the run
           sheet instead of swallowing the session. */
        drill: true,
      },
      phase(
        '6 · Goodnight, frog', 'WRAP', 4, 4, 2,
        'Shhh... 🌙 The frog is sleepy. Sleep, sleep, little frog. Wave bye-bye! 👋 Say goodnight to the frog, and tell me the one new word you learned.',
        'Says goodnight to the frog, waves and says their new word.',
        'Say “goodnight, frog!”',
        ['Which word was your favourite?', 'Will you hop at home tomorrow?', 'What did the frog lose?'],
        ['Sing the goodnight twice.', 'Say goodnight to each toy in turn.', 'Whisper the whole story one last time.'],
        'End the same way every time: the goodnight is the signal the lesson is over, and it is the line the family will hear tonight.',
      ),
    ],
    game: {
      name: 'Do What I Say',
      howToPlay: 'Press ▶ and the big screen shows each action with a tick. Say the action, do it yourself, and let the child copy — the ticks are for you, not for the child.',
      winCondition: 'All four actions done, and then the child gives YOU one to do.',
      turns: 4,
      offline: 'No screen needed — the actions ARE the game.',
      items: [
        item('🐸 Hop, hop, hop!', 'hop', ['sleep', 'sit'], '🐸'),
        item('👏 Clap your hands!', 'clap', ['wave', 'run'], '👏'),
        item('🏃 Run to the door!', 'run', ['sit', 'sleep'], '🏃'),
        item('👋 Wave bye-bye!', 'wave', ['hop', 'clap'], '👋'),
      ],
    },
    lyrics: ['Hop, hop, hop, little frog 🐸', 'Clap, clap, clap your hands 👏', 'Run to the stone, sit down 🪑', 'Wave bye-bye, goodnight now 🌙'],
    chantRhythm: 'hop-hop-pause-clap',
    scene: {
      title: 'The real frog and his real pond',
      photoQuery: 'frog on a stone by a pond',
      clipTitle: 'A real frog-hop song to sing and hop to 🐸',
      clipUrl: search('https://www.youtube.com/results?search_query=', 'super simple songs frog hop for kids'),
      listenFor: '“hop!” — the child hops once every time they hear it, and says it back.',
    },
    mission: {
      title: 'Three nights, three acts of the story',
      realWorld: 'Every night this week your child acts out ONE act of the frog story for you in English, and you copy them. Three nights, five minutes, no translation and no testing.',
      sayIt: '“hop, hop, hop!” · “clap your hands!” · “goodnight, frog!”',
      steps: [
        'Night 1: the sad frog — sit down, say “hop!” and hop once',
        'Night 2: clap and run — your child says the English and you copy',
        'Night 3: the whole story, child telling it and the grown-up acting it',
        'Clap for the retry, never correct the words',
      ],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Flop down like a sleepy frog and breathe three slow breaths. 🐸',
        'Shake your arms like wet frog legs, then sit down. 💧',
        'Hop three little hops, then freeze. 🧊',
      ],
      exitTicket: [
        '“hop!” said while hopping',
        'the echo “hop, hop, hop!” said one more time',
        '“goodnight, frog!” said with a wave',
      ],
      nextTime: 'Next time: the same frog, but the child tells the whole story and you just do what you are told 🐸 — plus one new word, “frog”.',
    },
    media: FROG_WALK_MEDIA.map((m) => ({ ...m })),
    caregiverNote: 'Tonight, ask your child to show you the frog story. Hop when they say “hop!”, clap when they say “clap!” and lie down at “goodnight, frog!”. Do not test and do not translate — the doing is the whole lesson, and three nights of it is enough for the words to stay. 🐸',
    teacherNote: 'The movement comes BEFORE any speaking. Do every action yourself twice and let the child watch first — a child who only copies is already succeeding here.',
  };
}

/* ── Circle Time: the same circle every week, with one surprise in it ────── */

/**
 * The circle's words: five the child hears every single week, plus the ONE surprise.
 *
 * `duck` is the surprise because it is a thing a child can hold and name with one
 * word — the whole method is that nothing else in the session is new, so the single
 * word out of the box is the only thing that has to be learned.
 */
const VY_CIRCLE_WORDS: KidLessonWord[] = [
  { word: 'hello', emoji: '👋', sayAloud: 'he-llo', meaning: 'a friendly word', example: 'Hello, hello, how are you?' },
  { word: 'sunny', emoji: '☀️', sayAloud: 'sunny', meaning: 'the sun is out', example: 'Sunny! I point at the sun.' },
  { word: 'rainy', emoji: '🌧️', sayAloud: 'rainy', meaning: 'water falling from the sky', example: 'Rainy! Drip, drip, drip.' },
  { word: 'happy', emoji: '😀', sayAloud: 'happy', meaning: 'your face is smiling', example: 'Happy! Look at my face.' },
  { word: 'sleepy', emoji: '😴', sayAloud: 'sleepy', meaning: 'ready for bed', example: 'Sleepy... big yawn.' },
  /* The one new word of the whole circle — it comes out of the box. */
  { word: 'duck', emoji: '🦆', sayAloud: 'duck', meaning: 'a bird that swims', example: 'Duck! In my box!' },
];

/* The circle's own links. The band default (a duck song) belongs to a lesson about
   animals; a circle needs the hello song, a real bell, the real sky and a weather game. */
const CIRCLE_MEDIA: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'The hello song we sing the same way every day 👋',
    url: search('https://www.youtube.com/results?search_query=', 'super simple songs hello song'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'super simple songs hello song'),
    where: 'both',
    forStep: 'The same hello',
    why: 'Sing it with the actions, word for word, every single week — the sameness is what the child is learning.',
    source: 'Super Simple Songs',
    embeddable: false,
  },
  {
    kind: 'audio',
    title: 'A real bell to open and close the circle 🔔',
    url: 'https://freesound.org/search/?q=school+bell+chime',
    searchUrl: 'https://freesound.org/search/?q=school+bell+chime',
    where: 'class',
    forStep: 'The same hello',
    why: 'Ring it once to start and once to finish. The bell means the circle — it is the cue the child hears before the first word.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'picture',
    title: 'A real photo of today’s sky 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'cloudy sky daylight', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'cloudy sky daylight', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'How are we today?',
    why: 'Hold the real photograph next to the big picture — “sunny” or “rainy” is a word about the sky they can see, not a card.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'activity',
    title: 'A tap-the-weather game for home 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'weather kids'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'weather kids'),
    where: 'home',
    forStep: 'At home',
    why: 'Free and no logins — a grown-up and the child tap the weather and say the word out loud.',
    source: 'Wordwall',
    embeddable: true,
  },
];

/** “Hello, How Are You?” — the same four moments, as a thirty-minute circle. */
function circleTimeDemoVY(name: string): DemoParts {
  return {
    title: 'Hello, How Are You?',
    durationMinutes: 30,
    objectives: ['Sing the hello and goodbye songs word for word', 'Point at how you feel and hear the word back', 'Say the one surprise word: “duck”'],
    materials: ['A box or bag with a real duck toy inside', 'Four big pictures: sunny, rainy, happy, sleepy', 'The same hello and goodbye song card, every week', 'A bell to open and close the circle'],
    words: VY_CIRCLE_WORDS.map((w) => ({ ...w })),
    steps: [
      phase(
        '1 · The same hello', 'THE SAME HELLO', 3, 3, 4,
        'Hello, hello, hello to you! 👋 Hello, hello, how are you? Sunny or rainy, happy or blue? Hello, hello, I see you! 👀',
        'Waves and sings along, copying the actions.',
        'Sing it with me: “hello, hello!”',
        ['Who else shall we sing hello to?', 'Wave with one hand or two?', 'Shall we sing it fast or slow?'],
        ['Sing it in a whisper with tiny waves.', 'Sing hello to each toy in turn.', 'Let teddy wave hello first, then everybody copies.'],
        'The SAME song, the same four lines, every single week. This is the part that never changes — because the child knowing what is coming is what makes the one new word safe.',
      ),
      phase(
        '2 · How are we today?', 'THE CHECK-IN', 5, 5, 6,
        'Look at the sky! ☀️🌧️ Sunny or rainy? Point to the picture! … Sunny! Say it: sunny. And you — happy or sleepy? 😀😴 Point! … Sleepy! Say it: sleepy.',
        'Points at one weather picture and one face picture, and copies the word.',
        'Point and say: “sunny” / “rainy” / “happy” / “sleepy”.',
        ['Which picture is today?', 'Which one was yesterday?', 'Who is happy in this room right now?'],
        ['Point with an elbow, then with a finger.', 'Hold up the picture and whisper the word.', 'Give the picture to teddy and let teddy answer.'],
        'Pointing IS the answer at this age. Say the word back every single time and let the child echo it — accept any picture they choose, then name it.',
      ),
      phase(
        '3 · Tap it... tap it...', 'THE SAME WAIT', 4, 3, 6,
        'What is in my box? 🎁 Tap it... tap it... OPEN! Say it with me: tap it... tap it... OPEN! Again: TAP IT... TAP IT... OPEN!',
        'Taps the box twice and shouts the last word with the tutor.',
        'Say the wait with me: “tap it... tap it... OPEN!”',
        ['Who should tap it first?', 'Is it heavy or light?', 'Listen... can you hear something inside?'],
        ['Whisper the wait, then shout it.', 'Tap the box with one finger, then the whole hand.', 'Let teddy tap it once too.'],
        'The same wait, every single week, is what turns a surprise into a ritual. The child joins the line without being asked a question — and every tap is another chance to say OPEN!',
      ),
      phase(
        '4 · What is in the box?', 'THE MYSTERY BOX', 6, 5, 6,
        'OPEN! 🦆 It’s a duck! Duck! Say it with me: duck... duck... DUCK! Now shake the box — is the duck in there? The duck! Say it again!',
        'Names the duck, then says it again after it goes back in the box.',
        'Say “duck!” three times — loud, quiet, and loud again.',
        ['Is the duck big or little?', 'Shall the duck swim or sleep?', 'Who says hello to the duck?'],
        ['Whisper “duck” into the box.', 'Make the duck wave hello to everybody.', 'Hide the duck under a scarf and find it again.'],
        'ONE new thing only, said many ways: named, whispered, shouted and found again. Everything else in this session is already known, so the duck is the whole of today’s new language.',
      ),
      {
        ...phase(
          '5 · The duck, every way', 'THE ONE WORD, MANY WAYS', 7, 6, 5,
          'Where is the duck? 🦆 Is it in the box? Is it behind you? Point! … And who says hello to the duck? Say it: “Hello, duck!”',
          'Points at the duck, says the word, and waves hello to it.',
          'Say “duck!” and “hello, duck!”',
          ['Where did the duck hide?', 'Can you say hello to the duck?', 'Is the duck sleepy?'],
          ['Do the whole search in slow motion.', 'Let the child hide the duck and tell you where it is.', 'Say goodbye to the duck and put it back in the box.'],
          'The word gets said while the child is busy looking for it — which is why the one word comes out of them instead of out of you.',
        ),
        /* This is the ONE phase that opens the engine: the whole circle lives inside
           the run sheet as its drill, and the child runs it on the big screen. */
        drill: true,
      },
      phase(
        '6 · The same goodbye', 'THE SAME GOODBYE', 5, 4, 2,
        'Goodbye, goodbye, goodbye to you 👋 Goodbye, goodbye, see you soon! 🌟 Let’s say goodbye to the duck. Wave! And to teddy! Goodbye, teddy! 🌙',
        'Sings the goodbye and waves to the duck and to teddy.',
        'Say “goodbye, teddy!” and wave.',
        ['Who shall we say goodbye to first?', 'Shall we sing it twice?', 'What will you say to the duck at home?'],
        ['Sing the goodbye in a whisper.', 'Wave with both hands.', 'Do the goodbye song with everyone’s name in it.'],
        'The same goodbye every time. It is the signal that the circle is finished — so the family can sing the identical one tonight, and the child already knows every word.',
      ),
    ],
    lyrics: [
      'Hello, hello, hello to you! 👋',
      'Hello, hello, how are you? 😀',
      'Sunny or rainy, happy or blue? ☀️',
      'Hello, hello, I see you! 👀',
      'Goodbye, goodbye, goodbye to you 👋',
      'Goodbye, goodbye, see you soon! 🌟',
    ],
    chantRhythm: 'clap-clap-pause-clap',
    game: {
      name: 'Mystery Box',
      howToPlay: 'Press ▶ and the big screen walks the WHOLE circle with a tick for every part: the hello, the four pictures, the wait, the duck and the goodbye. Sing it and point at it in the same order every week — the ticks are for you, and the child says whatever they can.',
      winCondition: 'The whole circle done, and then the child runs it for teddy all by themselves.',
      turns: 4,
      offline: 'A real box with a real duck toy inside — no screen needed at all, which is how the family will run it at home.',
      items: [
        item('🙈 Tap it... tap it... what is in the box?', 'duck', ['cow', 'cat'], '🦆'),
        item('☀️ Is it sunny or rainy? Point.', 'sunny', ['rainy', 'sleepy'], '☀️'),
        item('😀 Are you happy or sleepy? Point.', 'happy', ['sleepy', 'rainy'], '😀'),
      ],
    },
    scene: {
      title: 'The real rug and the real box',
      photoQuery: 'children sitting in a circle on a rug',
      clipTitle: 'The real hello song, with the actions 👋',
      clipUrl: 'https://www.youtube.com/results?search_query=super+simple+songs+hello+song',
      listenFor: 'Listen for “hello” — every time it comes back, everybody waves. That is the whole comprehension check.',
    },
    mission: {
      title: 'The same three minutes, every night at home',
      realWorld: 'Every evening this week the family runs the SAME little circle at home: the hello song, the four pictures, the box, the goodbye. Same words, same order, no screen and no translation.',
      sayIt: '“Hello, hello, how are you?” · “Tap it... tap it... OPEN!” · “Goodbye, goodbye, see you soon!”',
      steps: ['Put the four pictures where the family can see them every day', 'Sing the hello song first, every time, exactly the same words', 'Hide ONE real thing in a box for the middle of the circle', 'Sing the goodbye last and let the child wave to everybody'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Flop down like a sleepy duck and breathe three slow breaths. 🦆',
        'Shake your hands like wet duck feet, then sit in the circle again. 💧',
        'Yawn three big yawns and stretch up tall. 🌙',
      ],
      exitTicket: [
        'the hello song sung word for word',
        '“sunny!” or “rainy!” said while pointing',
        '“duck” — today’s one new word — said out of the box',
      ],
      nextTime: 'Next time: the same hello, the same four pictures, the same goodbye — and one new thing in the box, a cat 🐈.',
    },
    talkGoal: 29,
    media: CIRCLE_MEDIA.map((m) => ({ ...m })),
    circle: {
      name: 'The Hello Circle',
      hello: [
        'Hello, hello, hello to you! 👋',
        'Hello, hello, how are you? 😀',
        'Sunny or rainy, happy or blue? ☀️🌧️',
        'Hello, hello, I see you! 👀',
      ],
      goodbye: [
        'Goodbye, goodbye, goodbye to you 👋',
        'Goodbye, goodbye, see you soon! 🌟',
        'Clap your hands and wave goodnight 👏',
        'Goodbye, goodbye — off goes the light! 🌙',
      ],
      check: [
        { look: 'sunny', emoji: '☀️', childSays: 'sunny!' },
        { look: 'rainy', emoji: '🌧️', childSays: 'rainy!' },
        { look: 'happy', emoji: '😀', childSays: 'happy!' },
        { look: 'sleepy', emoji: '😴', childSays: 'sleepy!' },
      ],
      waitLine: 'Tap it... tap it... OPEN!',
      surprise: 'duck',
      nextTime: 'Goodbye, teddy! — said to my toy tonight.',
    },
    caregiverNote: 'Run the same three minutes every evening this week — the hello song, the four pictures, the box, the goodbye — with the exact same words in the same order. Say the wait line every time and let your child shout “OPEN!”. Never test and never translate: point, say the word, and wait. Say “Tap it... tap it... OPEN!” slowly, and give your child as long as they need to finish it. 🔄',
    teacherNote: `${name} needs the SAME four lines, the same four pictures and the same wait every week — the predictability is the method, not the routine around it. Run sheet: THE SAME HELLO 3 · THE CHECK-IN 5 · THE SAME WAIT 4 · THE MYSTERY BOX 6 · THE ONE WORD, MANY WAYS 7 (the drill: the child runs the whole circle on the big screen) · THE SAME GOODBYE 5, and 29 spoken turns across the six.`,
  };
}

/* Young — the three structured models -------------------------------------- */

function esaDemoY(): DemoParts {
  return {
    title: 'The Pond Adventure',
    durationMinutes: 35,
    objectives: ['Name five pond things', 'Say a sentence with “the duck”', 'Make your own pond'],
    materials: ['Pictures of a pond', 'Word slips to build sentences', 'A big piece of paper for the pond'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step(
        '1 · Engage — watch and wonder',
        7,
        'Look at this pond! What can you see? I can see something yellow... what is it?',
        'Watches the little clip and guesses what is hiding.',
        'Do not teach the words yet — just make them want to know.',
      ),
      step(
        '2 · Study — build the words',
        15,
        'Let’s build the word “pond”. p-o-n-d. Now put the words in order: “The duck swims in the pond.”',
        'Drags letters to build words and orders the sentence tiles.',
        'Show the pattern once, then let them try and correct themselves.',
      ),
      step(
        '3 · Activate — make your own pond',
        13,
        'Now you make a pond on the paper. What goes in YOUR pond? Tell me your sentence!',
        'Draws a pond and says a sentence about it.',
        'Any sentence with a pond word is right. Write their sentence under the drawing.',
      ),
    ],
    lyrics: ['Down at the pond, the duck says quack 🦆', 'Swim, swim, splash! There and back 💦', 'Frog on a lily, sun in the sky ☀️', 'Down at the pond, wave bye-bye! 👋'],
    chantRhythm: 'splash-splash-pause-splash',
    game: {
      name: 'Build the Pond Sentence',
      howToPlay: 'Tap the word tiles into the right order. Tap a wrong tile and it wobbles back.',
      winCondition: 'Three sentences built and read aloud.',
      turns: 3,
      offline: 'Write the words on paper and shuffle them on the table.',
      items: [
        item('🧱 Put the words in order', 'The duck swims in the pond.', ['swim', 'pond'], '🦆'),
        item('🧱 Now this one', 'The frog jumps on the lily.', ['lily', 'frog'], '🐸'),
        item('🧱 One more', 'The sun is warm today.', ['sun', 'warm'], '☀️'),
      ],
    },
    worksheet: [
      'Circle the pond words: duck · pond · monkey · lily · swim · car',
      'Write the missing letters: p _ n d · d _ ck · sw _ m',
      'Write two sentences about YOUR pond picture.',
      'Answer key: pond, duck, swim · duck/pond/swim.',
    ],
    homework: ['Draw your own pond and say two sentences about it. 20 XP.', 'Watch the pond clip again and find three things. 15 XP.', 'Teach a grown-up the word “lily”. 10 XP.'],
    caregiverNote: 'Ask your child to show you their pond picture and to say one sentence about it in English. Praise the try, not the perfect sentence.',
    teacherNote: 'The three beats can be re-ordered if the child is restless — but all three must happen. Engage first if they are low, Activate first if they are bursting with energy.',
  };
}

function tbltDemoY(): DemoParts {
  return {
    title: 'Cook the Pond Pizza',
    durationMinutes: 35,
    objectives: ['Order five pizza things in English', 'Finish the mission', 'Say the new words you needed'],
    materials: ['A picture of a pizza', 'Ingredient cards', 'A “chef hat” or spoon for fun'],
    words: [
      { word: 'mushroom', emoji: '🍄', meaning: 'a round topping', example: 'Put the mushroom on top.' },
      { word: 'cheese', emoji: '🧀', meaning: 'a yellow topping', example: 'Add the cheese, please.' },
      { word: 'tomato', emoji: '🍅', meaning: 'a red round food', example: 'One tomato, please.' },
      { word: 'onion', emoji: '🧅', meaning: 'a round smelly food', example: 'No onion for me!' },
      { word: 'olive', emoji: '🫒', meaning: 'a small green topping', example: 'Two olives on top.' },
      { word: 'pepper', emoji: '🫑', meaning: 'a red or green topping', example: 'A little pepper, please.' },
      { word: 'pizza', emoji: '🍕', meaning: 'the food we are making', example: 'One pizza, please!' },
    ],
    steps: [
      step(
        '1 · The mission',
        7,
        'The chef is busy! You must cook the pizza by yourself. But you can only ask in English: “___ pizza, please.” Ready?',
        'Understands the goal — make the pizza — with no vocabulary lesson first.',
        'Say the goal twice and show the (paper) pizza base.',
      ),
      step(
        '2 · The trial — just-in-time words',
        18,
        'You want a topping? Say “mushroom, please.” 🍄 ... “cheese, please!” 🧀',
        'Tries to order toppings. Gets each word the moment they need it.',
        'Only give the word they are stuck on. Write it on a slip as you go.',
      ),
      step(
        '3 · The lock-in',
        10,
        'We solved it! Now say all the toppings fast: mushroom, cheese, tomato, olive. What did you order?',
        'Repeats the words and plays a quick matching game.',
        'This is the only bit that looks like teaching — keep it to a few minutes.',
      ),
    ],
    lyrics: ['Pizza, pizza, what can I see? 🍕', 'Mushroom, cheese, tomato for me 🍄🧀🍅', 'Olive, pepper, put them on ⬆️', 'Now it’s ready — ding! Ding! Done! 🔔'],
    game: {
      name: 'Order It Right',
      howToPlay: 'Read the order, then tap the right topping. Each right order adds a topping to the pizza.',
      winCondition: 'The pizza is complete — everyone claps for the chef.',
      turns: 6,
      offline: 'Real paper ingredient cards; the child hands you the card they want.',
      items: [
        item('🍕 “Cheese pizza, please!” — which one?', 'cheese', ['onion', 'olive'], '🧀'),
        item('🍕 “Mushroom pizza, please!” — which one?', 'mushroom', ['tomato', 'pepper'], '🍄'),
        item('🍕 “Tomato, please!” — which one?', 'tomato', ['cheese', 'olive'], '🍅'),
        item('🍕 “Two olives, please!” — which one?', 'olive', ['mushroom', 'onion'], '🫒'),
        item('🍕 “A little pepper, please!” — which one?', 'pepper', ['cheese', 'tomato'], '🫑'),
        item('🍕 “No onion, thank you!” — which one?', 'onion', ['olive', 'mushroom'], '🧅'),
      ],
    },
    homework: ['Cook something with a grown-up and name three things in English. 20 XP.', 'Draw your favourite pizza and label five toppings. 15 XP.', 'Play the wordwall pizza game with your family. 15 XP.'],
    caregiverNote: 'In the kitchen this week, ask your child to name three things in English. “Mushroom, please” at dinner is a perfect home run.',
    teacherNote: 'Teach no words at the start — that is the whole design. Give each word only when the child is stuck on it.',
  };
}

function tttDemoY(): DemoParts {
  return {
    title: 'Boss Battle: Yesterday',
    durationMinutes: 30,
    objectives: ['Say what happened yesterday', 'Spot the -ed ending', 'Beat the boss battle'],
    materials: ['Two quick quiz pages', 'A big “-ed” card', 'A boss picture (a friendly monster)'],
    words: Y_PAST.map((w) => ({ ...w })),
    steps: [
      step(
        '1 · Test 1 — how much do you know?',
        7,
        'Quick game! Which one happened YESTERDAY: “I walk” or “I walked”? Tap fast — no thinking!',
        'Plays a short quiz straight away, no teaching yet.',
        'If they get them all right, jump to the harder level and skip most of the teaching.',
      ),
      step(
        '2 · Teach — one tiny rule',
        8,
        'Look! walked, jumped, played. What do they all end with? -ed! 🎉 We use -ed for yesterday.',
        'Finds the -ed ending and adds -ed to two new words.',
        'One rule only, and show it as a picture, not a grammar talk.',
      ),
      step(
        '3 · Test 2 — the boss battle',
        15,
        'Now the boss! Boss says: “What happened yesterday?” Answer with -ed to deal a hit! 💥',
        'Answers fresh questions to “hit” the boss and win.',
        'If Test 1 was very hard, play the battle as plain practice instead — do not stress the child.',
      ),
    ],
    lyrics: ['Yesterday, yesterday, what did we do? 🕰️', 'We walked and we jumped — it’s true, it’s true! 🦘', 'Add -ed to the verb, that’s the trick 👏', 'Yesterday is finished — quick, quick, quick! ⚡'],
    game: {
      name: 'Boss Battle: Yesterday',
      howToPlay: 'Each right answer hits the boss for one heart. Team up and defeat it together.',
      winCondition: 'The boss has zero hearts and the class cheers.',
      turns: 8,
      offline: 'Draw the boss on the board; the class shouts the past tense to erase a heart.',
      items: [
        item('💥 Yesterday I ___ to the pond. (walk)', 'walked', ['walk', 'walking'], '🚶'),
        item('💥 Yesterday we ___ by the water. (play)', 'played', ['play', 'playing'], '⚽'),
        item('💥 Yesterday the frog ___ high. (jump)', 'jumped', ['jump', 'jumping'], '🦘'),
        item('💥 Yesterday the duck ___ down. (dive)', 'dived', ['dive', 'diving'], '🤿'),
        item('💥 Yesterday she ___ us all. (splash)', 'splashed', ['splash', 'splashing'], '💦'),
        item('💥 Yesterday we ___ the ducks. (watch)', 'watched', ['watch', 'watching'], '👀'),
        item('💥 Yesterday the rain ___. (stop)', 'stopped', ['stop', 'stopping'], '✋'),
        item('💥 Yesterday we ___. (laugh)', 'laughed', ['laugh', 'laughing'], '😂'),
      ],
    },
    worksheet: [
      'Add -ed: walk → ___ · jump → ___ · play → ___',
      'Choose: Yesterday I (walk / walked) to school.',
      'Write one true sentence about yesterday.',
      'Answer key: walked, jumped, played · walked.',
    ],
    homework: ['Write three true sentences about yesterday. 20 XP.', 'Tell your family one thing you did yesterday in English. 15 XP.'],
    caregiverNote: 'Ask your child “What did you do yesterday?” and let them answer in English. If they need help, just say “add -ed”.',
    teacherNote: 'If the child fails Test 1, skip the boss battle’s scoring and play it as gentle practice. The point is confidence, not the score.',
  };
}

/* The band worth of variety for each model — the Young version of the very-young ones,
   the Very Young version of the young ones, so every method truly exists twice. ----- */

/* ── The 5-12 story walk: same idea, but the child holds a two-step chain ── */

/* Six verbs the older child can already read, plus SQUEEZE — the one new word. */
const Y_WALK_WORDS: KidLessonWord[] = [
  { word: 'creep', emoji: '🤫', sayAloud: 'creep', meaning: 'move slowly and quietly', example: 'Creep to the door.' },
  { word: 'push', emoji: '➡️', sayAloud: 'push', meaning: 'move something away', example: 'Push the box.' },
  { word: 'pull', emoji: '⬅️', sayAloud: 'pull', meaning: 'move something towards you', example: 'Pull the rope.' },
  { word: 'stretch', emoji: '🙆', sayAloud: 'stretch', meaning: 'make yourself long', example: 'Stretch up high.' },
  { word: 'lift', emoji: '🏋️', sayAloud: 'lift', meaning: 'pick something up', example: 'Lift the box.' },
  { word: 'tip-toe', emoji: '🦶', sayAloud: 'tip-toe', meaning: 'walk on your toes', example: 'Tip-toe past the giant.' },
  { word: 'squeeze', emoji: '🤏', sayAloud: 'squeeze', meaning: 'hold it very tight', example: 'Squeeze the key.' },
];

/** “The Mouse and the Golden Key” — seven beats, a real problem, and a two-step chain. */
const MOUSE_WALK: KidLessonStoryWalk = {
  title: 'The Mouse and the Golden Key',
  echo: 'Shhh... the giant is sleeping!',
  map: ['🐭 the mouse', '🚪 the door', '📦 the box', '🔑 the key'],
  choose: 'The mouse needs one more thing before it can go home. You decide and say the whole sentence: “First it ___, then it ___.”',
  chain: [
    'Creep to the door, then push it open.',
    'Pull the rope, then lift the box.',
    'Stretch up high, then tip-toe past the giant.',
    'Squeeze the key tight, then creep home.',
  ],
  beats: [
    { line: 'The giant is asleep on the hill. A little mouse creeps up. 🤫', action: 'Creep across the room, slowly and quietly.', say: 'creep, creep, creep', emoji: '🐭' },
    { line: 'The door is shut and heavy. Push it — hard!', action: 'Push an imaginary heavy door with both hands.', say: 'push it!', emoji: '🚪' },
    { line: 'It will not move. So the mouse pulls the rope instead.', action: 'Pull an imaginary rope, leaning back.', say: 'pull, pull!', emoji: '🪢' },
    { line: 'Behind the door stands a box, taller than the mouse.', action: 'Lift the box over your head.', say: 'lift it!', emoji: '📦' },
    { line: 'Inside the box there is a golden key, and the mouse has to stretch for it.', action: 'Stretch up as tall as you can reach.', say: 'I can reach it!', emoji: '✨' },
    { line: 'Now home, past the sleeping giant. Tip-toe, tip-toe.', action: 'Tip-toe back across the room.', say: 'tip-toe, tip-toe', emoji: '🦶' },
    { line: 'The mouse squeezes the key tight and hides it under the bed. Goodnight, mouse!', action: 'Squeeze one fist tight, then lie down.', say: 'goodnight, mouse!', emoji: '🌙' },
  ],
};

/** The mouse story's own links — a story clip, a real animal sound and a photo. */
const MOUSE_WALK_MEDIA: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A story being acted out — watch the acting 🎬',
    url: search('https://www.youtube.com/results?search_query=', 'story for kids acted out actions esl'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'story for kids acted out actions esl'),
    where: 'both',
    forStep: 'The story',
    why: 'Watch thirty seconds, then do it better yourselves — the point is the acting, not the video.',
    source: 'YouTube',
    embeddable: false,
  },
  {
    kind: 'audio',
    title: 'A real door creaking 🔊',
    url: 'https://freesound.org/search/?q=door+creak',
    searchUrl: 'https://freesound.org/search/?q=door+creak',
    where: 'class',
    forStep: 'The story',
    why: 'Every creak is a cue: hands on the door, ready to push.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'picture',
    title: 'A real photo of a mouse 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'mouse animal', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'mouse animal', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Action warm-up',
    why: 'The real animal the story is about, so the child has an image to act.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'activity',
    title: 'A two-step command game for home 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'daily routine kids'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'daily routine kids'),
    where: 'home',
    forStep: 'At home',
    why: 'Free and login-free — the family keeps the two-step chain going all week.',
    source: 'Wordwall',
    embeddable: true,
  },
];

function tprStoryDemoY(): DemoParts {
  return {
    title: 'The Mouse and the Golden Key',
    durationMinutes: 30,
    talkGoal: 40,
    objectives: [
      'Do a two-step command in the right order',
      'Use seven action verbs in a sentence',
      'Act the story out, then tell it back in their own words',
    ],
    materials: ['Space to creep and tip-toe', 'Seven action cards', 'The story clip on screen'],
    words: Y_WALK_WORDS.map((w) => ({ ...w })),
    storyWalk: MOUSE_WALK,
    steps: [
      phase(
        '1 · The door that creaked', 'HOOK', 3, 3, 4,
        'Listen... what is that sound? 🚪 (creak) A little mouse, a sleeping giant, and one locked door. What do you think is behind the door? Guess first — anything you like.',
        'Listens, guesses what is behind the door, and creeps one step like a mouse.',
        'Say your guess in a sentence: “I think there is a ___.”',
        ['Who is asleep — the mouse or the giant?', 'What would you hide behind that door?', 'Is the mouse brave or scared?'],
        ['Whisper the guess twice.', 'Creep one step for every word you say.', 'Let the giant snore loudly and the mouse jump.'],
        'The child guesses BEFORE anything is told, so the story has a hole in it that only the telling can fill — and every guess is a full sentence they produced themselves.',
      ),
      phase(
        '2 · Seven verbs, moving', 'WARM-UP TALK', 4, 4, 5,
        'Stand up. Creep! 🤫 Push! ➡️ Pull! ⬅️ Stretch! 🙆 Lift! 🏋️ Tip-toe! 🦶 Now the new one: SQUEEZE — hold it very tight. 🤏 Say it: squeeze!',
        'Does each verb as it is said, then says the verb back with the action.',
        'Say “squeeze!” — today’s new word.',
        ['Which one needs both hands?', 'Which one is quietest?', 'Can you do two in a row — pull, then lift?'],
        ['Do all seven in slow motion.', 'Do all seven as fast as you can.', 'The child says the verb and the tutor does it.'],
        'The older child gets the verbs in their body first and their mouth second, which is the whole point of this kind: the body does the learning, the reading is a side dish.',
      ),
      phase(
        '3 · The chain: two things at once', 'INPUT', 6, 5, 9,
        'Now listen to the WHOLE sentence, because there are two jobs in it. Creep to the door, THEN push it. Two things! 🌫️ Your turn: pull the rope, then lift the box. And again: stretch up, then tip-toe past the giant.',
        'Holds both steps in mind and does them in the right order, then says the sentence back.',
        'Say the whole chain out loud: “First ___, then ___.”',
        ['What comes first — creep or push?', 'Which two actions were in the last command?', 'Can you make up a two-step command for me?'],
        ['Do the chain in reverse order and laugh about it.', 'Say the chain, then swap the two halves.', 'The child gives you a chain and you get it wrong on purpose.'],
        'A two-step command is the real step up from one action at this age: the child has to hold the whole sentence in mind while doing the first half — that is listening skill, and it is where the talking starts.',
      ),
      phase(
        '4 · The story, act by act', 'GUIDED TALK', 6, 5, 8,
        'The giant is asleep on the hill. A little mouse creeps up. 🤫 The door is shut and heavy — push it! 🚪 It will not move, so it pulls the rope. 🪢 Behind the door, a box. Lift it! 📦 Inside — a golden key, and the mouse stretches up for it. ✨ Then home: tip-toe, tip-toe past the giant. 🦶 It squeezes the key tight and hides it. Goodnight, mouse! 🌙',
        'Acts every beat as it is told, and joins the echo “Shhh... the giant is sleeping!” every time it comes back.',
        'Say the echo with me: “Shhh... the giant is sleeping!”',
        ['Did the pushing work, or did the pulling?', 'How did the mouse reach the key?', 'What would you have done — push or pull?'],
        ['Tell the story slowly and let the child finish each sentence.', 'Freeze the story before the key and ask what happens next.', 'Tell it while the child acts it and the giant snores.'],
        'Seven beats, each one an action, and the echo comes back seven times: by the last beat the child has said the same English line seven times and performed the whole story — that is comprehension you can see.',
      ),
      {
        ...phase(
          '5 · You direct it, I act it', 'FREE PRODUCTION', 7, 6, 9,
          'Now YOU are the storyteller and I am the mouse. 🐭 Tell me the whole story — and I will get it wrong on purpose so you have to say it again. Then you decide: what does the mouse do before it goes home? Say the whole sentence: “First it ___, then it ___.”',
          'Directs the whole story from the story map, corrects the grown-up’s deliberate mistakes, then invents the next two-step move.',
          'Say the whole sentence: “First it ___, then it ___.”',
          ['Which part was the hardest to say?', 'What did the mouse do first, in your own words?', 'What would the mouse do with the key?'],
          ['Do the story again with the child as the giant.', 'Add one sentence the story did not have.', 'Do it in a whisper, all seven beats.'],
          'The child produces the entire story and then invents a step that was never in it — the retell and the new sentence are the two things a parent will actually hear at home.',
        ),
        /* The ONE phase that opens the engine. */
        drill: true,
      },
      phase(
        '6 · Tell it in three sentences', 'WRAP', 4, 4, 5,
        'Now the whole story in three sentences — start with “First…”. Then tell me the one word you will use tomorrow, and I will use it too.',
        'Retells the story in three sentences using first/then/at the end, and names one verb to keep.',
        'Tell it in three sentences: “First… then… at the end…”.',
        ['What comes first in your three sentences?', 'Which verb will you use tomorrow?', 'What is the story called?'],
        ['Do the three sentences as a whisper, then loud.', 'Say the three sentences with the actions.', 'Let the mouse tell its own story in one sentence.'],
        'The three-sentence retell with First/Then/At the end is the same shape every week, and it is the one a parent can ask for at bedtime without any English of their own.',
      ),
    ],
    game: {
      name: 'Command Chain',
      howToPlay: 'Press ▶ and the big screen shows each two-step command with a tick. Read the whole sentence once, then let the child do both halves — the ticks are for you.',
      winCondition: 'All six chains done, and then the child gives the tutor one back.',
      turns: 6,
      offline: 'Say the commands with no screen at all — the chains are the game.',
      items: [
        item('🤫 Creep to the door, then push it.', 'creep to the door, then push', ['pull, then stretch'], '🤫'),
        item('⬅️ Pull the rope, then lift the box.', 'pull, then lift', ['push, then creep'], '⬅️'),
        item('🙆 Stretch up, then tip-toe to me.', 'stretch, then tip-toe', ['lift, then push'], '🙆'),
        item('🏋️ Lift the box, then creep away.', 'lift, then creep', ['stretch, then pull'], '🏋️'),
        item('➡️ Push the chair, then stretch tall.', 'push, then stretch', ['pull, then lift'], '➡️'),
        item('🦶 Tip-toe to the window, then pull the curtain.', 'tip-toe, then pull', ['creep, then push'], '🦶'),
      ],
    },
    lyrics: ['Creep, creep, creep so slow 🤫', 'Push it, pull it — watch it go ⬅️➡️', 'Stretch up high, then tip-toe past 🦶', 'Squeeze the key, we are home at last 🔑'],
    chantRhythm: 'creep-creep-pause-creep',
    worksheet: [
      'Put the story in order: push · creep · squeeze · pull (write 1, 2, 3, 4).',
      'Write two two-step commands of your own: “First ___ , then ___.”',
      'Circle the new word: squeeze / creep / lift.',
      'Answer key: creep, push, pull, squeeze · any correct chain · squeeze.',
    ],
    homework: [
      'Act the story out for your family and say every line in English. 15 XP.',
      'Write three sentences with push, pull and squeeze. 20 XP.',
    ],
    scene: {
      title: 'The real mouse and the closed door',
      photoQuery: 'mouse animal close up',
      clipTitle: 'A real story being acted out 🎬',
      clipUrl: search('https://www.youtube.com/results?search_query=', 'story for kids acted out actions esl'),
      listenFor: 'every action verb — the child does the action the moment they hear it.',
    },
    mission: {
      title: 'Direct a grown-up, every night',
      realWorld: 'Every evening this week your child gives you two-step commands in English — “first creep, then push” — and you do exactly what you are told, mistakes and all. It is play, not homework, and it takes five minutes.',
      sayIt: '“First creep to the door, then push it.” · “Pull the rope, then lift the box.” · “Squeeze the key, then tip-toe home.”',
      steps: [
        'Night 1: the child gives three two-step commands, you obey',
        'Night 2: the child tells the story with the actions and you join in',
        'Night 3: the child retells it in three sentences — First / then / at the end',
        'When you get a command wrong on purpose, the child has to repeat the whole sentence — that is the talking',
      ],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Snore like the giant — three big slow breaths, then wake up. 😴',
        'Shake out your mouse paws and sit down. 🐭',
        'Stretch up tall, then curl up small. 🙆',
      ],
      exitTicket: [
        '“First it crept, then it pushed” — the story in one sentence',
        '“squeeze” used in a sentence of their own',
        'the echo “Shhh... the giant is sleeping!” said one last time',
      ],
      nextTime: 'Next time: the same mouse, but the child tells the story in the past — “The mouse crept, then it pushed” 🐭 — and one new word, “hid”.',
    },
    media: MOUSE_WALK_MEDIA.map((m) => ({ ...m })),
    caregiverNote: 'Ask your child to be the director tonight: they give you two-step commands in English and you obey. “First creep, then push.” If you do a step out of order on purpose, they will say the whole sentence again — that is the lesson. Then ask for the story in three sentences and clap for the retry, never for the perfect sentence. 🐭',
    teacherNote: 'The body still does the learning at 5-12; the reading is a side dish, not the meal. Keep the printed text to the verbs and the story, and let the child hear the whole sentence before either half of it moves.',
  };
}

/**
 * The young circle's words: the check-in words the child already answers with, plus
 * the ONE surprise word.
 *
 * `calendar` is the surprise because the opening ritual already points at it — “what
 * day is it?” — so the child can write it once, find the real one on the wall, and
 * build two sentences about their own week with it.
 */
const Y_CIRCLE_WORDS: KidLessonWord[] = [
  { word: 'hello', emoji: '👋', meaning: 'a friendly word', example: 'Hello! I am ready to start.' },
  { word: 'sunny', emoji: '☀️', meaning: 'the sun is out', example: 'It is sunny today.' },
  { word: 'rainy', emoji: '🌧️', meaning: 'water falling from the sky', example: 'It was rainy yesterday.' },
  { word: 'windy', emoji: '🌬️', meaning: 'the air is moving fast', example: 'It is windy outside.' },
  { word: 'happy', emoji: '😀', meaning: 'you feel good', example: 'I am happy today.' },
  { word: 'tired', emoji: '😴', meaning: 'you need a rest', example: 'I am tired today.' },
  /* The one new word of the whole circle — it comes out of the box. */
  { word: 'calendar', emoji: '📅', meaning: 'it shows the days of the month', example: 'My birthday is on the calendar.' },
];

/* The older circle's own links: the days-of-the-week song, the real calendar, a bell
   and a game the family can tap — none of which the pond lesson's media would give. */
const CIRCLE_MEDIA_Y: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'The days-of-the-week song we open with 🗓️',
    url: search('https://www.youtube.com/results?search_query=', 'days of the week song for kids'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'days of the week song for kids'),
    where: 'both',
    forStep: 'The same opening',
    why: 'The same 30-second starter every week — the child sings the days and then finds today on the real calendar.',
    source: 'Super Simple Songs',
    embeddable: false,
  },
  {
    kind: 'picture',
    title: 'A real photo of a wall calendar 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'wall calendar', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'wall calendar', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Out of the box',
    why: 'The surprise word is a real object in the room — show the photograph first, then let the child point at the real one.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'audio',
    title: 'A real bell to open and close the circle 🔔',
    url: 'https://freesound.org/search/?q=school+bell+classroom',
    searchUrl: 'https://freesound.org/search/?q=school+bell+classroom',
    where: 'class',
    forStep: 'The same opening',
    why: 'One ring opens the circle, one closes it. The child hears the ritual starting before a single word is said.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'activity',
    title: 'A free days-and-weather game for home 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'days of the week weather'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'days of the week weather'),
    where: 'home',
    forStep: 'At home',
    why: 'No logins — the child taps the day and the weather and says the full sentence out loud to a grown-up.',
    source: 'Wordwall',
    embeddable: true,
  },
];

/** “The Circle You Run” — the same ritual, with the child holding the questions. */
function circleTimeDemoY(): DemoParts {
  return {
    title: 'The Circle You Run',
    durationMinutes: 30,
    objectives: ['Ask the three check-in questions yourself', 'Answer in a whole sentence', 'Write the word of the day once and use it in two sentences'],
    materials: ['The same opening chant card, every week', 'Five big pictures: sunny, rainy, windy, happy, tired', 'A box with one real thing inside', 'A notebook and a pencil for one line'],
    words: Y_CIRCLE_WORDS.map((w) => ({ ...w })),
    steps: [
      phase(
        '1 · The same opening', 'THE SAME OPENING', 3, 3, 4,
        'Ready, ready, here we go 🎵 Same hello to start the show 👋 One new word, that is all 🆕 Now YOU are the leader — ask me the questions!',
        'Sings the opening chant, then takes the leader’s chair.',
        'Sing the opening with me, then you are the leader.',
        ['What day is it today?', 'How many days until the weekend?', 'Who is the leader today?'],
        ['Clap the chant with one hand on the table.', 'Count the days on your fingers as you sing.', 'Let the child choose a different voice for each line.'],
        'The same thirty seconds, word for word, every single week — and the child knows it so well that the leader’s job is the only thing that is new.',
      ),
      phase(
        '2 · You ask me', 'THE CHECK-IN TALK', 5, 4, 8,
        'You are the leader — ask me! 🗣 “How are you today?” … Great question. I am happy today, thank you. Now you: how are you today? … Now ask me the second one: “What was the weather like yesterday?”',
        'Asks each of the three questions, then answers each one in a full sentence.',
        'Ask me: “How are you today?” and answer: “I am ______ today.”',
        ['What was the weather like yesterday?', 'What did you do yesterday?', 'Do you agree with me, or not?'],
        ['Answer the questions about a favourite toy instead of yourself.', 'Say one answer in the past: “Yesterday I was…”', 'Ask the questions to the whole room, one at a time.'],
        'The child asking the questions is the whole 5-12 step: they have to hold the question in mind, then listen to the answer. The pictures stay up so disagreements get said in a sentence too.',
      ),
      phase(
        '3 · Ready... steady...', 'THE SAME WAIT', 4, 3, 7,
        'What is inside the box? 📦 Say the wait with me: ready... steady... OPEN THE BOX! Now you ask me — what do I think is inside? Then we say it again: READY... STEADY... OPEN THE BOX!',
        'Says the wait line, then asks the tutor for their guess before opening.',
        'Say it with me: “ready... steady... OPEN THE BOX!”',
        ['What do you think is inside?', 'Is it heavy, light, soft or hard?', 'Shall we shake it before we open it?'],
        ['Whisper the wait, then say it like a giant.', 'Let the child choose when the box gets opened.', 'Count down from three instead of saying ready-steady.'],
        'The same wait, every week, makes the surprise a ritual: the child is not answering a question, they are running a line they know — and tonight they will run it at home too.',
      ),
      phase(
        '4 · Out of the box', 'THE SURPRISE', 6, 5, 7,
        'OPEN THE BOX! 📅 A calendar! Say it: calendar. Spell it with me: c-a-l-e-n-d-a-r. Now write it once, on your line — c-a-l-e-n-d-a-r. Where is the real calendar in this room? Find it!',
        'Says and spells the new word, writes it once, then finds the real calendar.',
        'Say it, spell it, write it: “calendar”.',
        ['Why do we have a calendar?', 'What day is your birthday on the calendar?', 'How many days are in this month?'],
        ['Write it in the air first, then on paper.', 'Clap the syllables: ca-len-dar.', 'Find the word hiding in the room’s other printed words.'],
        'ONE new word for the whole session, and it is a real object in the room — so the writing has a place to point at, and the two own sentences have something real to be about.',
      ),
      {
        ...phase(
          '5 · Two sentences of your own', 'THE ONE WORD, MANY WAYS', 7, 6, 12,
          'Now two sentences with “calendar”, all your own. I will start you: “The calendar is on the ___.” Your turn — where does a calendar live? … And the second one: what is on YOUR calendar?',
          'Builds two of their own sentences with the new word and says them out loud.',
          'Say two sentences: “The calendar is ______.” / “My ______ is on the calendar.”',
          ['Where does a calendar live in your home?', 'What is on your calendar this week?', 'Who else in your family looks at the calendar?'],
          ['Say the sentences to a toy, then to you.', 'Add “and” and make one long sentence.', 'Say one sentence in the past: “Yesterday I looked at the calendar.”'],
          'Two sentences of the child’s own is the real payoff of the 5-12 circle: the word stops being a thing in a box and becomes something they can talk about in their own life.',
        ),
        /* The drill phase: the child runs the WHOLE circle on the big screen — the
           questions, the pictures, the wait, the word and the closing. */
        drill: true,
      },
      phase(
        '6 · The same closing', 'THE SAME CLOSING', 5, 4, 2,
        'Same goodbye, same as before 👋 One more word, then out the door 🚪 Next time you are the leader again ⭐ Before next lesson — what will you do? Tell me in a whole sentence.',
        'Sings the closing lines, then says one full sentence about what they will do before the next lesson.',
        'Say: “Before next lesson I will ______.”',
        ['What will you do with the word “calendar” this week?', 'Shall we start the same way next time?', 'What was your favourite part of the circle?'],
        ['Sing the closing twice, quietly.', 'Say the plan sentence to a grown-up at home tonight.', 'Write the plan sentence on the same paper as the word.'],
        'The same closing words every week, plus one whole sentence of the child’s own — so the session ends with a plan they said out loud, not a wave.',
      ),
    ],
    lyrics: [
      'Ready, ready, here we go 🎵',
      'Same hello to start the show 👋',
      'One new word, that is all 🆕',
      'Now you lead — you are the one who knows! ⭐',
      'Same goodbye, same as before 👋',
      'One more word, then out the door 🚪',
      'Next time you are the leader again ⭐',
      'Goodbye, goodbye — see you then! 🌟',
    ],
    chantRhythm: 'clap-clap-pause-clap',
    game: {
      name: 'The Circle You Run',
      howToPlay: 'Press ▶ and the big screen walks the whole circle in its fixed order, with a tick for every part: the opening, the three questions, the wait, the surprise word and the closing. The CHILD runs it — they ask the questions, hold up the pictures and open the box — and you just answer.',
      winCondition: 'The whole circle run by the child, then run again for a toy with the child still leading.',
      turns: 5,
      offline: 'Five big pictures and a real box — no screen at all, exactly how the family will run it at home all week.',
      items: [
        item('🗣 You are the leader. What is the first question you ask?', 'How are you today?', ['What is your name?', 'What did you do?'], '🗣️'),
        item('📅 Say the word of the day and spell it.', 'calendar', ['calender', 'calandar'], '📅'),
        item('📅 Use “calendar” in a sentence of your own.', 'My birthday is on the calendar.', ['My birthday is on it.', 'I like it.'], '📅'),
      ],
    },
    homework: ['Write “calendar” once more at home and use it in two sentences about your own week. 15 XP.'],
    scene: {
      title: 'The real calendar and the real clock on the wall',
      photoQuery: 'wall calendar on a kitchen wall',
      clipTitle: 'The days-of-the-week song we open with 🗓️',
      clipUrl: 'https://www.youtube.com/results?search_query=days+of+the+week+song+for+kids',
      listenFor: 'Every day name in the song — the child says it back, then finds today on the real calendar.',
    },
    mission: {
      title: 'You run the circle at home — all week',
      realWorld: 'Every evening this week the child runs the same five-minute circle for the family: they ask the check-in questions, hold up the pictures, open the box and close with the same goodbye. The grown-up answers in full sentences and never takes over.',
      sayIt: '“How are you today?” · “What was the weather like yesterday?” · “Ready... steady... OPEN THE BOX!” · “Before next lesson I will ______.”',
      steps: ['Put the five pictures up where the family can see them every day', 'The child asks the three questions and waits for a full answer', 'Hide ONE new thing in the box each evening and let the child name it', 'The child writes the new word once and says two sentences about their own week'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Stand up, stretch like a cat, then sit back down as the leader. 🐈',
        'Clap the syllables of the word of the day, then breathe out slowly. 📅',
        'Shake your hands out, roll your shoulders and find the calendar again. 🗓️',
      ],
      exitTicket: [
        'the three check-in questions asked by the child, word for word',
        '“It is sunny today.” — or the real answer — in a whole sentence',
        '“calendar” written once, plus two sentences of the child’s own',
      ],
      nextTime: 'Next time: the same circle, the same questions — and the child runs it for a toy while you sit on the floor and answer 🗣.',
    },
    talkGoal: 40,
    media: CIRCLE_MEDIA_Y.map((m) => ({ ...m })),
    circle: {
      name: 'The Leader’s Circle',
      hello: [
        'Ready, ready, here we go 🎵',
        'Same hello to start the show 👋',
        'One new word, that is all 🆕',
        'Now you lead — you are the one who knows! ⭐',
      ],
      goodbye: [
        'Same goodbye, same as before 👋',
        'One more word, then out the door 🚪',
        'Next time you are the leader again ⭐',
        'Goodbye, goodbye — see you then! 🌟',
      ],
      check: [
        { look: 'sunny', emoji: '☀️', childSays: 'It is sunny today.' },
        { look: 'rainy', emoji: '🌧️', childSays: 'It was rainy yesterday.' },
        { look: 'windy', emoji: '🌬️', childSays: 'It is windy outside.' },
        { look: 'happy', emoji: '😀', childSays: 'I am happy today.' },
        { look: 'tired', emoji: '😴', childSays: 'I am tired today.' },
      ],
      waitLine: 'Ready... steady... OPEN THE BOX!',
      surprise: 'calendar',
      ask: ['How are you today?', 'What was the weather like yesterday?', 'What did you do yesterday?'],
      nextTime: 'Before next lesson I will look at the calendar and say the day in English.',
    },
    caregiverNote: 'Keep the same five pictures up all week and let your child be the leader every evening: they ask the three questions, you answer in a whole sentence. Same opening, same wait, same closing, word for word — the sameness is what is being taught. Put the new word somewhere your child must walk past it (the fridge, the door) and ask them to read it out to you once a day. Never translate and never test — if they only say part of a sentence, say the whole one back and carry on. 📅',
    teacherNote: 'Run sheet: THE SAME OPENING 3 · THE CHECK-IN TALK 5 · THE SAME WAIT 4 · THE SURPRISE 6 · THE ONE WORD, MANY WAYS 7 (the drill — the child runs the whole circle on the big screen) · THE SAME CLOSING 5, and 40 spoken turns across the six. Phases 1, 2 and 6 keep word for word the same all week; the only new thing is the single word out of the box.',
  };
}

function esaDemoVY(): DemoParts {
  return {
    title: 'Hello, Duck!',
    durationMinutes: 12,
    objectives: ['Notice the duck', 'Say “duck” with the tutor', 'Find a duck', 'Use it their own way'],
    materials: ['A duck toy or big picture', 'The duck song', 'A box to hide it in'],
    words: VY_ANIMALS.slice(0, 6).map((w) => ({ ...w })),
    steps: [
      step('1 · ENGAGE', 3, 'Shhh... what is in my box? Tap it! Tap it! 🥚 Oh! 🦆', 'Taps the box and reacts.', 'No teaching yet — just make them want the word.'),
      step('2 · STUDY', 5, 'A duck! Duck, duck, quack quack. Say it with me: duck. Clap the word: duck!', 'Says it, claps it, does the action.', 'One word only, and nothing to read.'),
      step('3 · ACTIVATE', 4, 'You find the duck in the room! Where is the duck? Give it to me!', 'Finds the toy and names it.', 'Any use of the word counts as success.'),
    ],
    lyrics: ['Duck, duck, quack quack quack 🦆', 'Duck, duck, waddle back 👣', 'Duck, duck, in the pond 💧', 'Quack, quack, bye-bye! 👋'],
    chantRhythm: 'clap-clap-pause-clap',
    game: {
      name: 'Find the Duck',
      howToPlay: 'Say the word; the child points at the picture. Two pictures only.',
      winCondition: 'It ends with a cheer — no score.',
      turns: 4,
      offline: 'Same game with the real toy.',
      items: [
        item('🦆 Where is the duck?', 'duck', ['cow'], '🦆'),
        item('🐮 Where is the cow?', 'cow', ['cat'], '🐮'),
        item('🐈 Where is the cat?', 'cat', ['dog'], '🐈'),
        item('🐕 Where is the dog?', 'dog', ['pig'], '🐕'),
      ],
    },
    caregiverNote: 'Play “where is the duck?” at home with the bath toys. Say the word, then let your child point.',
    teacherNote: 'The three beats may move to follow the child, but all three must happen, and the word is never written on screen.',
  };
}

function tbltDemoVY(): DemoParts {
  return {
    title: 'Help Teddy Get Ready',
    durationMinutes: 12,
    objectives: ['Do the mission', 'Ask for one thing they need', 'Do it again saying the words'],
    materials: ['A teddy and a hat, cup, spoon', 'A picture of a bed'],
    words: VY_ROUTINE.map((w) => ({ ...w })),
    steps: [
      step('1 · THE MISSION', 3, 'Oh no! Teddy is sleepy and NOT ready for bed! Can you help him? 🧸', 'Understands the goal; no words taught yet.', 'Say the goal twice and point at the bed.'),
      step('2 · THE TRIAL', 6, 'Teddy needs to wash. What do you need? 🧼 ... “wash!” Yes! Now Teddy eats. What do you need?', 'Does the mission and gets each word the moment they need it.', 'Give only the one word they are stuck on.'),
      step('3 · THE LOCK-IN', 3, 'You did it! Let’s do it again slowly: wash, eat, sleep.', 'Repeats the words and plays one quick game.', 'Two or three words is the whole target.'),
    ],
    lyrics: ['Wash, wash, wash your hands 🧼', 'Eat, eat, eat your food 🍎', 'Sleep, sleep, sleepy head 🛏️', 'Goodnight, teddy! Goodnight! 🌙'],
    chantRhythm: 'wash-wash-pause-sleep',
    game: {
      name: 'What Does Teddy Need?',
      howToPlay: 'Show what Teddy is doing; the child taps or points at what he needs.',
      winCondition: 'Teddy is ready for bed and everyone claps.',
      turns: 4,
      offline: 'Use the real teddy and the real objects.',
      items: [
        item('🧼 Teddy is dirty. What does he need?', 'wash', ['eat'], '🧼'),
        item('🍎 Teddy is hungry. What does he need?', 'eat', ['sleep'], '🍎'),
        item('🛏️ Teddy is sleepy. What does he need?', 'sleep', ['wash'], '🛏️'),
        item('👋 Teddy is going. What do we say?', 'bye', ['again'], '👋'),
      ],
    },
    caregiverNote: 'Do the same mission at home: help the teddy wash, eat and sleep, saying the English words as you go.',
    teacherNote: 'Teach no words at the start. The mission creates the need; the need is where the word sticks.',
  };
}

function tttDemoVY(): DemoParts {
  return {
    title: 'Show Me: Big and Small',
    durationMinutes: 10,
    objectives: ['Show what “big” and “small” mean', 'Try again after a little teaching'],
    materials: ['A big ball and a small ball', 'Two big pictures'],
    words: [
      { word: 'big', emoji: '🐘', sayAloud: 'big!', meaning: 'very large', example: 'A big elephant.' },
      { word: 'small', emoji: '🐁', sayAloud: 'small', meaning: 'very little', example: 'A small mouse.' },
      { word: 'ball', emoji: '⚽', sayAloud: 'ball', meaning: 'a round toy', example: 'The big ball.' },
      { word: 'duck', emoji: '🦆', sayAloud: 'quack quack', meaning: 'a bird in the water', example: 'A small duck.' },
      { word: 'hat', emoji: '🎩', sayAloud: 'hat', meaning: 'you wear it', example: 'A big hat.' },
      { word: 'cat', emoji: '🐈', sayAloud: 'meow', meaning: 'a soft pet', example: 'A small cat.' },
    ],
    steps: [
      step('1 · SHOW ME FIRST', 3, 'Let’s play! Show me the BIG ball. ⚽ Which one is big?', 'Points at one of two objects. No teaching yet.', 'Never call this a test out loud.'),
      step('2 · DO IT TOGETHER', 3, 'Look — THIS one is big (arms wide), and this one is small (fingers close). Let’s do it together: big! small!', 'Copies the arms-wide / fingers-close action twice.', 'One idea only, shown with the body.'),
      step('3 · SHOW ME AGAIN', 4, 'Now a game! Show me big, then small — fast! 🎉', 'Plays a fresh, fun version.', 'Cheer for every attempt; no score, ever.'),
    ],
    lyrics: ['Big, big, big — arms out wide 🐘', 'Small, small, small — tiny and quiet 🐁', 'Big like an elephant, small like a mouse 🐘🐁', 'Show me, show me, all around the house! 🏠'],
    game: {
      name: 'Show Me: Big or Small',
      howToPlay: 'Ask for big or small; the child points at the picture or does the arms action.',
      winCondition: 'Six cheers — there is no score and no losing.',
      turns: 6,
      offline: 'Use the real objects: the big ball and the small ball.',
      items: [
        item('🐘 Show me BIG!', 'big', ['small'], '🐘'),
        item('🐁 Show me SMALL!', 'small', ['big'], '🐁'),
        item('⚽ Is this ball big or small?', 'big', ['small'], '⚽'),
        item('🎩 Is this hat big or small?', 'big', ['small'], '🎩'),
        item('🐈 Is this cat big or small?', 'small', ['big'], '🐈'),
        item('🦆 Is this duck big or small?', 'small', ['big'], '🦆'),
      ],
    },
    caregiverNote: 'Play big/small at home with the body: arms wide for big, fingers close for small. No score, just play.',
    teacherNote: 'If the child does step 1 easily, go straight to the game. If not, the “together” beat is where the learning happens — do it twice.',
  };
}

/* ── I Do, We Do, You Do (the structured-scaffold model) ──────────────────── */

function scaffoldDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'My Turn, Our Turn, Your Turn',
      durationMinutes: 12,
      objectives: ['Watch the word', 'Do it together', 'Do it alone once'],
      materials: ['Two big pictures', 'The song for the “I do” beat'],
      words: VY_ACTIONS.slice(0, 6).map((w) => ({ ...w })),
      steps: [
        step('1 · I DO', 3, 'Watch me! Clap, clap, clap. 👏 My turn — you just watch.', 'Watches and listens only.', 'Do not ask for anything yet — the watching is the first rung.'),
        step('2 · WE DO', 4, 'Now together! Clap with me. 👏👏 One more time, together!', 'Does it with the tutor, twice.', 'The “we do” beat is the one nobody may skip.'),
        step('3 · YOU DO', 4, 'Your turn! Clap all by yourself. 👏 Well done, you did it! 🎉', 'Does it alone, once.', 'Cheer whatever happens — the cheer IS the reward.'),
        step('4 · I DO, WE DO, YOU DO again', 1, 'One more word! Watch: jump! Together: jump! Your turn: jump! 🦘', 'Repeats the ladder with a new word.', 'Same ladder, new word — the sameness is the safety.'),
      ],
      lyrics: ['My turn, my turn, watch me do 👀', 'Our turn, our turn, me and you 🤝', 'Your turn, your turn, all by you 🌟', 'You did it! You did it! Woo-hoo! 🎉'],
      chantRhythm: 'clap-pause-clap-pause',
      game: {
        name: 'My Turn, Your Turn',
        howToPlay: 'Do the action together once, then the child does it alone once.',
        winCondition: 'Every word gets a cheer — there is no score.',
        turns: 6,
        offline: 'Exactly the same ladder, no screen.',
        items: [
          item('👏 I do it… now WE do it. Now YOU do it!', 'clap', ['jump', 'sit'], '👏'),
          item('🦘 I do it… WE do it… YOU do it!', 'jump', ['clap', 'wave'], '🦘'),
          item('👋 I do it… WE do it… YOU do it!', 'wave', ['run', 'sleep'], '👋'),
          item('🏃 I do it… WE do it… YOU do it!', 'run', ['sit', 'clap'], '🏃'),
          item('🪑 I do it… WE do it… YOU do it!', 'sit', ['jump', 'wave'], '🪑'),
          item('😴 I do it… WE do it… YOU do it!', 'sleep', ['run', 'jump'], '😴'),
        ],
      },
      caregiverNote: 'Do “my turn, your turn” with two simple actions this week. Always do it together before their turn.',
      teacherNote: 'The order is the method: never go straight to the child’s turn. Watch → together → alone.',
    };
  }
  return {
    title: 'I Do, We Do, You Do: The Pond',
    durationMinutes: 40,
    objectives: ['Learn the words from a model', 'Build sentences with support', 'Read and answer alone'],
    materials: ['Word cards', 'Sentence tiles', 'A short reading page for the last beat'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · I DO — words', 6, 'Watch and listen: duck 🦆, pond 💧, swim 🏊. Repeat each one after me, once.', 'Listens, watches the picture, repeats once.', 'Vocabulary first, and the model is never skipped.'),
      step('2 · WE DO — words', 5, 'Together: I say the word, you point at the picture. Then we swap.', 'Points with the tutor guiding.', 'Same words, easier task — guided practice.'),
      step('3 · I DO — sentence', 5, 'Watch me build a sentence: “The duck swims in the pond.” Tile by tile, with me.', 'Watches the sentence assemble.', 'Show the pattern as a physical sequence.'),
      step('4 · WE DO — sentence', 8, 'Your turn with my help: “The frog ___ on the lily.” Which tile?', 'Builds the sentence with support and the answer still visible.', 'Guide, do not repair for them.'),
      step('5 · YOU DO — read and answer', 10, 'Now alone. Read this and answer: “The duck swims in the pond. Where is the duck?”', 'Reads and answers with no model.', 'This is the independent rung — the answer key is not shown.'),
      step('6 · YOU DO — say it', 6, 'Last one, on your own: say two sentences about your own pond.', 'Produces two own sentences.', 'Praise the effort, not the perfect sentence.'),
    ],
    lyrics: ['I do, you watch — that is the way 👀', 'We do, together — hip hip hooray 🤝', 'You do, alone — you are a star 🌟', 'Now you know exactly where you are! 🗺️'],
    game: {
      name: 'Guided Then Alone',
      howToPlay: 'Round one is guided with the answer visible; round two is the child alone.',
      winCondition: 'Both rungs finished — the guided round does not have to be perfect.',
      turns: 6,
      offline: 'Paper sentence tiles: build together, then alone.',
      items: [
        item('🤝 WE DO: “The duck ___ in the pond.”', 'swims', ['swim', 'swimming'], '🦆'),
        item('🤝 WE DO: “The frog jumps on the ___.”', 'lily', ['pond', 'wing'], '🐸'),
        item('🤝 WE DO: “The ___ is warm today.”', 'sun', ['boat', 'fish'], '☀️'),
        item('🌟 YOU DO: “The fish ___ all day.”', 'swim', ['swims', 'swimming'], '🐟'),
        item('🌟 YOU DO: “A little ___ sails past.”', 'boat', ['lily', 'sun'], '⛵'),
        item('🌟 YOU DO: “The duck uses its ___ to fly.”', 'wing', ['pond', 'boat'], '🪽'),
      ],
    },
    worksheet: [
      'Rung 1 (we did it together): circle the pond words you have seen today.',
      'Rung 2 (your turn): complete “The duck ___ in the pond.”',
      'Rung 3 (alone): write two sentences about a pond with no help.',
      'Answer key: swims · any two correct sentences.',
    ],
    homework: ['Read your two sentences aloud at home. 15 XP.', 'Teach a grown-up the sentence pattern. 15 XP.'],
    caregiverNote: 'Ask your child to show you the “I do, we do, you do” pattern — let them be the teacher for the last rung.',
    teacherNote: 'The ladder never skips a rung: model, then guided, then independent. On the independent rung, do not help.',
  };
}

/* ── Story World Adventure (the multi-character narrative model) ──────────── */

function storyWorldDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'The Duck Crosses the River',
      durationMinutes: 12,
      objectives: ['Help the duck', 'Say or point at the word', 'Get home safe'],
      materials: ['The story on screen', 'One prop (a duck or a boat)'],
      words: VY_ANIMALS.slice(0, 6).map((w) => ({ ...w })),
      steps: [
        step('1 · The door', 2, 'Look! A duck 🦆 wants to cross the river. Say “duck!” and the door opens.', 'Says or points at the duck.', 'The pet or hero asks the child for help.'),
        step('2 · The stepping stones', 4, 'Say “frog!” 🐸 A stone appears! Say “cat!” 🐈 Another stone!', 'Names each animal to make a stone appear.', 'Every word moves the story forward.'),
        step('3 · The river', 3, 'Splash! 💦 Say “swim” and the duck swims across!', 'Says the word and does the action.', 'Nothing can go wrong — the duck only needs help.'),
        step('4 · Home at last', 3, 'Say “bye-bye!” 👋 The duck is home. You did it! 🎉', 'Waves and cheers.', 'No score — the story finishing is the reward.'),
      ],
      lyrics: ['Duck wants to cross the river wide 🦆', 'Say a word and step inside 🐸', 'Swim, swim, safe and sound 🏊', 'Home at last — we did it! Found! 🏠'],
      chantRhythm: 'step-step-pause-splash',
      game: {
        name: 'Stepping Stones',
        howToPlay: 'Say the animal’s name; its stone appears and the duck steps forward.',
        winCondition: 'The duck reaches home and everybody cheers.',
        turns: 4,
        offline: 'Put toys in a line; the child names one to step to it.',
        items: [
          item('🐸 Which animal makes the next stone? Say it!', 'frog', ['cow'], '🐸'),
          item('🐈 Which animal makes the next stone?', 'cat', ['pig'], '🐈'),
          item('🐕 Which animal makes the next stone?', 'dog', ['sheep'], '🐕'),
          item('🦆 Who are we helping home?', 'duck', ['cow'], '🦆'),
        ],
      },
      caregiverNote: 'Tell the duck story at bath time and let your child say the animal names to move the story on.',
      teacherNote: 'One continuous story, not four exercises. The child’s pet can be the hero if you swap the duck.',
    };
  }
  return {
    title: 'Escape the Misty Castle',
    durationMinutes: 40,
    objectives: ['Solve the story’s puzzles with the target words', 'Read the clues', 'Reach the happy ending'],
    materials: ['The story on screen', 'A map drawn on paper'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Chapter 1 — the locked gate', 6, 'Your hero is shut inside the castle! The gate has a word-lock: find the word that means “a small pool of water”.', 'Reads the clue and picks the word.', 'The word is the KEY, never a quiz bolted on.'),
      step('2 · Chapter 2 — the river', 8, 'A river blocks the way. Click the correct stepping stones: swim, splash, dive.', 'Clicks the right stones to cross.', 'Each right word moves the story forward.'),
      step('3 · Chapter 3 — the lost frog', 8, 'A little frog 🐸 is lost and crying. Answer the question to light the path.', 'Answers to light the path.', 'Emotional stake: the child is helping a character.'),
      step('4 · Chapter 4 — the boat', 9, 'The frog needs a boat ⛵. Build the sentence to set it sailing.', 'Builds the sentence from tiles.', 'The sentence is the action.'),
      step('5 · Chapter 5 — home', 9, 'You escaped! Reuse three words to say goodbye to the castle and retell it in three sentences.', 'Retells the story using the words.', 'Resolve it warmly; the retelling is the assessment.'),
    ],
    lyrics: ['Castle high and river wide 🏰', 'Words are stones to cross the tide 🪨', 'Frog is safe and boat is free ⛵', 'We escaped — the end! Hooray! 🎉'],
    chantRhythm: 'step-step-pause-splash',
    game: {
      name: 'The Castle Climax',
      howToPlay: 'The final chapter as a game: each correct word opens one more door.',
      winCondition: 'The hero reaches daylight; several fair turns for everyone.',
      turns: 6,
      offline: 'The map on paper: the child moves a counter for each right word.',
      items: [
        item('🏰 The word-lock: “a small pool of water”.', 'pond', ['puddle', 'pool'], '💧'),
        item('🌊 Which stones let us cross?', 'swim and splash', ['run and walk', 'sit and sleep'], '🏊'),
        item('🐸 The frog is lost. Where does he live?', 'in the pond', ['in a tree', 'in a house'], '🐸'),
        item('⛵ What floats on the water?', 'a boat', ['a stone', 'a hat'], '⛵'),
        item('🪽 How does a duck fly?', 'with its wings', ['with its feet', 'with its nose'], '🪽'),
        item('🌞 We escaped! How do you feel?', 'happy', ['cross', 'bored'], '🌞'),
      ],
    },
    worksheet: ['Retell the castle story in four sentences.', 'Write two of the words that opened doors.', 'Answer key: pond, swim, splash, boat, wing — any correctly used.'],
    homework: ['Retell the castle story to your family. 20 XP.', 'Draw the map and label three words. 15 XP.'],
    caregiverNote: 'Ask your child to tell you the castle story and which words opened the doors.',
    teacherNote: 'Use the child’s own hero and pet as the cast — the story is theirs, and that is what keeps them in it.',
  };
}

/* ── Fast Fun Lesson (the high-energy pacing model) ───────────────────────── */

function fastFunDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'Fast and Loud, Then Calm',
      durationMinutes: 10,
      objectives: ['Join in fast', 'Copy five quick actions', 'Finish calm'],
      materials: ['Space to move', 'The fast song'],
      words: VY_ACTIONS.map((w) => ({ ...w })),
      steps: [
        step('1 · Hello, fast!', 1, 'Hello! Clap fast! 👏👏👏 Go, go, go!', 'Claps quickly.', '45 seconds maximum, then change.'),
        step('2 · Song burst', 2, 'Sing with me! Duck, duck, quack! 🦆', 'Sings and quacks.', 'A burst, not a whole song.'),
        step('3 · Jump time', 1, 'Jump! Jump! Jump like a frog! 🐸', 'Jumps.', 'Instant cheer after.'),
        step('4 · Find it, fast!', 2, 'Find something blue! 💙 Fast, fast!', 'Finds and brings it.', 'Every find gets an instant cheer.'),
        step('5 · Copy me, quick', 2, 'Wave! Clap! Sit! Stand! 👋👏', 'Copies four quick actions.', 'Change every 20-30 seconds.'),
        step('6 · Big cheer', 1, 'Three cheers! Hip hip hooray! 🎉', 'Cheers and jumps.', 'Reward is heard and seen, never a score.'),
        step('7 · Slow down now', 2, 'Shhh... breathe in... and out... sleepy time. 😴', 'Breathes and calms.', 'A fast lesson MUST land calmly.'),
      ],
      lyrics: ['Go, go, go — clap your hands! 👏', 'Jump, jump, jump — jump like a frog! 🐸', 'Find, find, find — something blue! 💙', 'Now slow down... shhh... sleepy. 😴'],
      chantRhythm: 'fast-fast-fast-pause',
      game: {
        name: 'Speed Copy',
        howToPlay: 'Do one action; the child copies within three seconds. Rotate fast.',
        winCondition: 'Six breezy rounds and a big cheer — no score.',
        turns: 6,
        offline: 'The tutor IS the game: no screen needed.',
        items: [
          item('⚡ Copy me — fast!', 'clap', ['sit', 'sleep'], '👏'),
          item('⚡ Copy me — fast!', 'jump', ['wave', 'sit'], '🐸'),
          item('⚡ Copy me — fast!', 'wave', ['run', 'sleep'], '👋'),
          item('⚡ Copy me — fast!', 'run', ['sit', 'clap'], '🏃'),
          item('⚡ Copy me — fast!', 'sit', ['jump', 'wave'], '🪑'),
          item('⚡ Now SLOWLY — sleepy time.', 'sleep', ['run', 'clap'], '😴'),
        ],
      },
      caregiverNote: 'Try one fast minute at home: clap, jump, wave, then a big slow breath to finish.',
      teacherNote: 'Nothing lasts longer than 45 seconds, and the last step is always calm — the fast pace needs somewhere to land.',
    };
  }
  return {
    title: 'Rapid Fire Pond',
    durationMinutes: 25,
    objectives: ['Speak aloud five times', 'Play a fast game', 'Say what was learned'],
    materials: ['The game on screen', 'A timer the tutor controls'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Everybody say it', 2, 'Three, two, one — SAY IT: pond! 💧 Again! Faster!', 'Says it aloud three times.', 'A quick repeat prompt starts the pace.'),
      step('2 · Tap it fast', 3, 'Tap the right word before it gets away! ⚡', 'Taps the target word fast.', 'Instant reward after each hit.'),
      step('3 · Coin rain', 1, 'You earned a coin! 🪙 Another one! 🪙', 'Watches the reward burst.', 'Reward is instant and visible.'),
      step('4 · Say it again', 3, 'Your turn: “The duck swims in the pond.” Three, two, one — GO!', 'Says the sentence aloud.', 'Five speaking turns across the lesson, minimum.'),
      step('5 · Speed sort', 3, 'Sort fast: swim or splash? Left or right — GO!', 'Sorts words quickly.', 'Physical and verbal at once.'),
      step('6 · Badge burst', 1, 'New badge! 🏅 Streak of five! 🔥', 'Sees the badge burst.', 'Small, repeatable, instant.'),
      step('7 · Read it fast', 3, 'Read the sentence before the bar fills: “The frog jumps on the lily.”', 'Reads quickly.', 'Speed reading, then a breather.'),
      step('8 · Beat your best', 3, 'One more round — beat your OWN score from the start.', 'Plays the last round.', 'Compare to their own last attempt, never to others.'),
      step('9 · Slow down and say it', 2, 'Now slow. Tell me one thing you learned today.', 'Says what they learned.', 'The slow close is compulsory.'),
    ],
    lyrics: ['Fast, fast, fast — say it now! ⚡', 'Tap, tap, tap — show me how! ⚡', 'Coin, coin, coin — you earned it all! 🪙', 'Slow, slow, slow... and that is all. 🐢'],
    chantRhythm: 'quick-quick-quick-pause',
    game: {
      name: 'Rapid Fire Pond',
      howToPlay: 'Fast round, three visible levels, instant points; the child races their own best.',
      winCondition: 'Finishing level three — the win is small and repeatable.',
      turns: 9,
      offline: 'Two columns on the board; race to touch the target word.',
      items: [
        item('⚡ Level 1 — hit: pond', 'pond', ['pound', 'bond'], '💧'),
        item('⚡ Level 1 — hit: duck', 'duck', ['dock', 'dusk'], '🦆'),
        item('⚡ Level 1 — hit: swim', 'swim', ['swam', 'skim'], '🏊'),
        item('⚡ Level 2 — hit: splash', 'splash', ['splish', 'splat'], '💦'),
        item('⚡ Level 2 — hit: frog', 'frog', ['fog', 'from'], '🐸'),
        item('⚡ Level 2 — hit: lily', 'lily', ['lilly', 'lie'], '🌸'),
        item('⚡ Level 3 — hit: wing', 'wing', ['wind', 'ring'], '🪽'),
        item('⚡ Level 3 — hit: dive', 'dive', ['drive', 'dime'], '🤿'),
        item('⚡ Level 3 — hit: boat', 'boat', ['bolt', 'goat'], '⛵'),
      ],
    },
    worksheet: ['Write the three fastest words you found today.', 'Answer key: any three target words.'],
    homework: ['Play the fast game with your family and beat your own score. 15 XP.'],
    caregiverNote: 'Keep it fast and fun at home: one minute of rapid words, then stop while they still want more.',
    teacherNote: 'Every beat is 30-45 seconds, and the child speaks aloud at least five times. Finish slowly or the speed is wasted.',
  };
}

/* ── Talk and Chat (the conversational-immersion model) ───────────────────── */

function talkChatDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'Let’s Talk About Fruit!',
      durationMinutes: 10,
      objectives: ['Look and answer', 'Copy two words', 'Pretend and chat'],
      materials: ['The fruit picture set', 'An apple or a picture of one'],
      words: [
        { word: 'apple', emoji: '🍎', sayAloud: 'apple', meaning: 'a red fruit', example: 'A red apple.' },
        { word: 'banana', emoji: '🍌', sayAloud: 'ba-na-na', meaning: 'a yellow fruit', example: 'A yellow banana.' },
        { word: 'yummy', emoji: '😋', sayAloud: 'yum-my', meaning: 'it tastes nice', example: 'Yummy apple!' },
        { word: 'more', emoji: '➕', sayAloud: 'more', meaning: 'one more, please', example: 'More banana!' },
        { word: 'big', emoji: '🐘', sayAloud: 'big', meaning: 'very large', example: 'A big apple.' },
        { word: 'colour', emoji: '🎨', sayAloud: 'co-lour', meaning: 'red, yellow, green', example: 'What colour?' },
      ],
      steps: [
        step('1 · Look and talk', 3, 'Look! 🍎 What is this? Is it big or small? Do you like it?', 'Answers however they can — a word, a point, a nod.', 'No buttons: the speaking is the lesson.'),
        step('2 · Copy me', 3, 'Say it with me: apple! ba-na-na! yummy! 😋', 'Copies each word.', 'Accept any close attempt.'),
        step('3 · Pretend together', 3, 'Let’s make a fruit plate! 🍽️ What do you want? “More apple, please!”', 'Talks as they play.', 'Pretend play produces more speech than any quiz.'),
        step('4 · Chat and finish', 1, 'Two questions, no right answer: which fruit is your favourite? Why?', 'Answers freely.', 'Then say goodbye the same way every time.'),
      ],
      lyrics: ['Apple, apple, red and round 🍎', 'Banana, banana, yellow and long 🍌', 'Yummy, yummy, in my tummy 😋', 'More, more, more — please! ➕'],
      chantRhythm: 'yum-yum-pause-more',
      game: {
        name: 'Fruit Chat',
        howToPlay: 'Show a fruit and ask two open questions — no right answers, just talk.',
        winCondition: 'Four little chats, and the child says “more, please” once.',
        turns: 4,
        offline: 'Hold up a real apple and chat about it.',
        items: [
          item('💬 What is this? 🍎', 'an apple', ['yummy', 'more'], '🍎'),
          item('💬 Is it big or small? 🍌', 'big', ['more', 'apple'], '🍌'),
          item('💬 Do you like it? 😋', 'yummy', ['more', 'colour'], '😋'),
          item('💬 What do you want? ➕', 'more', ['colour', 'big'], '➕'),
        ],
      },
      caregiverNote: 'Chat about fruit at snack time in English — “what is this?”, “do you like it?”, “more?”. No quizzing.',
      teacherNote: 'At most one no-score game. The lesson is the talking, so let it wander a little.',
    };
  }
  return {
    title: 'Talk About the Cooking Show',
    durationMinutes: 35,
    objectives: ['Describe a scene in full sentences', 'Use four useful phrases', 'Have a real conversation'],
    materials: ['A cooking clip or a set of food pictures', 'The child’s own favourite food idea'],
    words: [
      { word: 'delicious', emoji: '😋', meaning: 'it tastes very good', example: 'This soup is delicious.' },
      { word: 'ingredient', emoji: '🥕', meaning: 'one thing you cook with', example: 'Carrot is an ingredient.' },
      { word: 'chop', emoji: '🔪', meaning: 'cut into pieces', example: 'Chop the onion, please.' },
      { word: 'heat', emoji: '🔥', meaning: 'make it hot', example: 'Heat the pan first.' },
      { word: 'taste', emoji: '👅', meaning: 'try a little', example: 'Can I taste it?' },
      { word: 'recipe', emoji: '📖', meaning: 'the instructions for cooking', example: 'Follow the recipe.' },
      { word: 'together', emoji: '🤝', meaning: 'with each other', example: 'We cook together.' },
      { word: 'ready', emoji: '✅', meaning: 'finished and done', example: 'It is ready!' },
    ],
    steps: [
      step('1 · Scene talk', 7, 'Watch this cooking scene. What is happening? What can you see on the table? Describe it to me in full sentences.', 'Describes the scene in full sentences.', 'Open prompts only — no multiple choice.'),
      step('2 · Words I need', 7, 'To talk about the show you might say: “First she chops the onion. Then she heats the pan.” Here are four useful phrases.', 'Repeats and then uses two phrases.', 'Give sentence starters, not a list to memorise.'),
      step('3 · Say it your way', 8, 'Now describe the same scene YOUR way. What happens first, next and last?', 'Retells the scene in their own words.', 'Recast, never correct-and-stop.'),
      step('4 · Something real', 8, 'Imagine you are cooking your favourite food. I am the customer — convince me to order it!', 'Role-plays a conversation.', 'Tie it to their own life; that is where fluency grows.'),
      step('5 · Talk it over', 5, 'Two open questions: what would you cook for your family, and why?', 'Answers freely, then says what they will tell their family.', 'No right answer, and that is the point.'),
    ],
    lyrics: ['First you chop, then you heat 🔪🔥', 'Taste it, taste it — is it sweet? 👅', 'Cooking, cooking, all together 🤝', 'Dinner is ready — come and eat! ✅'],
    chantRhythm: 'chop-chop-pause-taste',
    game: {
      name: 'Chef’s Chat',
      howToPlay: 'Open speaking prompts from the cooking scene; the tutor listens for the phrases in the child’s own speech.',
      winCondition: 'Every prompt answered in a sentence — perfection is not the bar, production is.',
      turns: 4,
      offline: 'Bring a real ingredient and chat about it.',
      items: [
        item('💬 Describe the scene in one sentence.', 'first she chops the onion', ['onion', 'chop'], '🥕'),
        item('💬 What happens next?', 'then she heats the pan', ['heat', 'pan pan'], '🔥'),
        item('💬 Convince me to order it.', 'it is delicious', ['delicious', 'yes'], '😋'),
        item('💬 What would you cook for your family?', 'I would cook pasta', ['pasta', 'I cook'], '🍝'),
      ],
    },
    homework: ['Describe your dinner at home in three sentences. 20 XP.'],
    caregiverNote: 'At dinner, ask your child to describe the meal in English — full sentences, and let them take their time.',
    teacherNote: 'Listen for these phrases in the child’s own speech: “first … then …”, “it is delicious”, “I would like …”. Multiple choice should appear at most once.',
  };
}

/* The everyday shelf — a shape per kind ------------------------------------ */

function miniLessonDemo(band: KidAgeBand, name: string): DemoParts {
  if (band === 'veryYoung') {
    /* Thirty minutes for a 3-year-old, built the only honest way it can be built:
       six phases made of 2-4 minute blocks, a movement break between every phase,
       and 29 spoken turns the child owes before the session is done. */
    return {
      title: 'One Duck, One Word',
      durationMinutes: 30,
      objectives: ['Understand and say the word “duck”', 'Join in with the songs and the duck game', 'Ask a grown-up for the duck'],
      materials: ['A duck toy or one big picture of a duck', 'A box or cloth for the mystery reveal', 'The hello and goodbye songs', 'A rubber bath duck for the mission'],
      words: wordsByBand(band),
      steps: [
        phase(
          '1 · Hook — what is in the box?', 'HOOK', 3, 3, 3,
          'Ooh… something is hiding! 👀 Shake the box. Shake shake shake! What is in there? Shall we look?',
          'Shakes the box, looks in, gasps.',
          'Say “open it!”',
          ['Is it big or small?', 'What sound does it make?', 'What else could be hiding in a box?'],
          ['Peek-a-boo behind the box.', 'Knock on the box three times.', 'Whisper: “is it a duck?”'],
          'The reveal is the hook — never open it before the child is leaning in.',
        ),
        phase(
          '2 · Warm-up talk — the hello song', 'WARM-UP TALK', 4, 4, 4,
          'Hello, hello, hello to you! 👋 Hello, hello, hello to you! Clap with me. Now wave!',
          'Waves, claps, sings the sounds.',
          'Say “hello!” with the wave.',
          ['Who else is here today?', 'Are you happy or sleepy?', 'What shall we sing next?'],
          ['Sing it fast, then slow.', 'Sing it with a silly voice.', 'Let the duck sing it too.'],
          'The same hello every single lesson — the melody is the memory.',
        ),
        phase(
          '3 · Input — meet the word', 'INPUT', 6, 5, 8,
          'Look! 🦆 A duck. Quack quack. This is a DUCK. Say it with me: duck. Louder: DUCK! Whisper: duck. 🦆',
          'Looks, points, copies “duck” again and again.',
          'Say “duck”.',
          ['Is the duck big or small?', 'Why do ducks like water?', 'What would you name this duck?'],
          ['Stroke the duck and say “nice duck”.', 'Make the duck jump. Say “jump, duck!”', 'Give the duck to teddy: “here you are, duck.”'],
          'Show first, say second. The word comes after the child already sees it.',
        ),
        phase(
          '4 · Guided talk — find the duck', 'GUIDED TALK', 6, 5, 6,
          'Where is the duck? 🦆 Is it here… or here? Two pictures only. Your turn: point and tell me!',
          'Points at the right picture and says “duck!”',
          'Say “the duck is here!”',
          ['Where is the cow instead?', 'Which one says quack?', 'Where would a duck hide in our room?'],
          ['Put both pictures behind your back and surprise the child.', 'Point wrongly on purpose so the child corrects you.', 'Count the ducks together.'],
          'Two choices only at this age, and always let the child win.',
        ),
        phase(
          '5 · Free production — the bath-duck mission', 'FREE PRODUCTION', 7, 6, 6,
          'The duck is dirty! 🛁 Ask me for the bath duck. Say: “can I have the duck?”',
          'Asks for the duck, washes it, says “clean duck!”',
          'Say “can I have the duck, please?”',
          ['Is our duck clean now?', 'Why did the duck need a wash?', 'What do you do with your duck at home?'],
          ['Wash the duck again and count the bubbles.', 'Wrap the duck in a towel and say “goodnight duck”.', 'Let the duck ask the child for things.'],
          'This is the part that leaves the screen — a real object, a real request.',
        ),
        phase(
          '6 · Wrap — goodbye and goodbye song', 'WRAP', 4, 4, 2,
          'Goodbye, goodbye, see you soon! 👋 Wave to the duck. Wave to me. One more quack?',
          'Waves bye, quacks once more.',
          'Say “goodbye, duck!”',
          ['What was your favourite bit?', 'What will the duck do tonight?', 'Shall we sing it to teddy too?'],
          ['Sing the goodbye song to each toy in turn.', 'Blow a kiss to the duck.', 'Whisper goodbye, then shout it.'],
          'Always end on a high — the last thirty seconds decide whether they come back.',
        ),
      ],
      game: {
        name: 'Find the Duck',
        howToPlay: 'Say the word; the child points at the picture. Two pictures only.',
        winCondition: 'It ends when the child finds it and says “duck” once.',
        turns: 4,
        offline: 'Hide a real duck toy and find it together.',
        items: [
          item('🦆 Where is the duck?', 'duck', ['cow'], '🦆'),
          item('🐮 Where is the cow?', 'cow', ['cat'], '🐮'),
          item('🐈 Where is the cat?', 'cat', ['dog'], '🐈'),
          item('🐕 Where is the dog?', 'dog', ['pig'], '🐕'),
        ],
      },
      lyrics: ['Duck, duck, quack quack quack 🦆', 'Duck, duck, waddle back 👣', 'Duck, duck, in the pond 💧', 'Quack, quack, bye-bye! 👋'],
      scene: {
        title: 'A real duck on a real pond',
        photoQuery: 'duck on a pond',
        clipTitle: 'A duck quacking and swimming 🦆',
        clipUrl: 'https://www.youtube.com/results?search_query=super+simple+songs+duck',
        listenFor: 'Listen for “quack quack” — put your hand up every time you hear it!',
      },
      mission: {
        title: 'Give the duck a bath',
        realWorld: 'At home this week: run the bath or the sink with your child and wash the bath duck together.',
        sayIt: '“Can I have the duck, please?” and “clean duck!”',
        steps: ['Get the bath duck', 'Ask in English for the duck', 'Wash it, then say “clean duck!”', 'Wrap it and say “goodnight duck”'],
      },
      run: {
        targetMinutes: 30,
        brainBreaks: [
          'Shake like a duck for ten seconds, then flop down. 🦆',
          'Waddle to the door and back, quacking.',
          'Blow three big bubbles and sit down slowly.',
        ],
        exitTicket: ['“duck”', '“can I have the duck?”', '“goodbye duck!”'],
        nextTime: 'Next time the duck meets the cow 🐮 — the same hello song, two new animal sounds.',
      },
      talkGoal: 29,
      caregiverNote: 'Say “duck” five times this week with the bath duck 🦆 or a picture. Do not test — just say it and play.',
      teacherNote: 'One word is the whole target. Six phases, thirty minutes, twenty-nine turns of talking — the word is repeated until it lives in the mouth, not the ear.',
    };
  }
  return {
    title: 'Pond Words and a Story',
    durationMinutes: 30,
    objectives: ['Say five pond words', 'Answer story questions in full sentences', 'Describe their own pond or pet'],
    materials: ['Pond word cards or the deck on screen', 'The pond story on screen', 'A timer for the phases'],
    words: wordsByBand(band),
    steps: [
      phase(
        '1 · Hook — what is under the water?', 'HOOK', 3, 3, 3,
        'Something is moving under the water 💧 You cannot see it yet. What do you think it is? Tell me your guess out loud.',
        'Guesses out loud, gives a reason.',
        'Say “I think it is ___ because ___.”',
        ['Is it big or small?', 'Why would it hide under the water?', 'What would it do if it saw you?'],
        ['Draw it in the air with your finger.', 'Give me three clues and I will guess.', 'Guess with your eyes closed.'],
        'Every session opens with the child talking first, not the tutor.',
      ),
      phase(
        '2 · Warm-up talk — last week in two sentences', 'WARM-UP TALK', 4, 4, 6,
        `Remember last time, ${name}? Say two words you still know. Now tell me one sentence with one of them.`, 'Says two words, then a full sentence.',
        'Say “I remember ___. I can say ___.”',
        ['Which word was hardest?', 'Why did that one stick in your head?', 'What would your pet say about last week?'],
        ['Beat the clock: name five pond words in twenty seconds.', 'Ask me a question with one of them.', 'Teach your pet one of the words.'],
        'Spaced review in the first four minutes — the single cheapest win in a lesson.',
      ),
      phase(
        '3 · Input — the pond words', 'INPUT', 6, 5, 8,
        'Here are our pond words: duck, pond, swim, wing, splash. Repeat each one, then say it in a sentence of your own.',
        'Repeats each word, then produces a sentence.',
        'Say “The ___ is ___.”, e.g. “The pond is cold.”',
        ['Which word do you already know?', 'Why do ducks need wings?', 'What would happen if the pond froze?'],
        ['Say the word, spell it, then use it.', 'Put two words into one sentence.', 'Give me a word and I will use it wrong — correct me.'],
        'Five or six new items is plenty; anything more is vocabulary soup.',
      ),
      phase(
        '4 · Guided talk — the story, with questions', 'GUIDED TALK', 6, 5, 10,
        'The duck wanted to swim in the pond. She waddled to the edge, then… splash! What happened next? You tell me.',
        'Reads, predicts, answers in full sentences, retells two lines.',
        'Say “First… then… at the end…”',
        ['Why did she jump in?', 'How do you think she felt when she splashed?', 'What would YOU have said to the duck?'],
        ['Tell the next paragraph with the wrong word in it — the child fixes it.', 'Act out the splashing.', 'Retell it as if you were the duck.'],
        'The story is a talking frame, not a reading test.',
      ),
      phase(
        '5 · Free production — your own pond', 'FREE PRODUCTION', 7, 6, 10,
        'Now make your OWN pond. What is in it? Who lives there? Tell me everything, and I will draw what you describe.',
        'Describes their own scene in full sentences; answers follow-ups.',
        'Say “In my pond there is ___. It ___ because ___.”',
        ['Why did you choose that one?', 'What would happen if it rained?', 'Who would you invite to your pond?'],
        ['Describe it again in three sentences, no repeats.', 'Televise it: “tonight, at my pond…”', 'Describe my pond now — I will choose nothing.'],
        'This is the phase the lesson is for: the child uses the words for their own idea.',
      ),
      phase(
        '6 · Wrap — exit ticket and next time', 'WRAP', 4, 4, 3,
        'Last job: three sentences you could not say at the start of the lesson. Say them to me, and I will write them down for your family.',
        'Says three new sentences; retries any that wobble.',
        'Say “I can now say ___.”',
        ['Which sentence are you proudest of?', 'Why was that one hard before?', 'What shall we learn next time?'],
        ['Say them again faster.', 'Say them to the duck.', 'Pick the best one and make it a question.'],
        'Praise the retry, never “clever”. The exit ticket is the proof the session did something.',
      ),
    ],
    game: {
      name: 'Build the Pond Sentence',
      howToPlay: 'Tap the word tiles into order; read the sentence aloud.',
      winCondition: 'Five sentences built and read.',
      turns: 5,
      offline: 'Paper word tiles on the table.',
      items: [
        item('🧱 Put the words in order', 'The duck swims in the pond.', ['swim', 'pond'], '🦆'),
        item('🧱 One more', 'The frog jumps on the lily.', ['lily', 'jump'], '🐸'),
        item('🧱 Now this', 'The sun is warm today.', ['sun', 'warm'], '☀️'),
        item('🧱 Nearly done', 'A little boat sails past.', ['boat', 'sails'], '⛵'),
        item('🧱 Last one', 'The fish swim all day.', ['fish', 'swim'], '🐟'),
      ],
    },
    lyrics: ['Down at the pond, the duck says quack 🦆', 'Swim, swim, splash! There and back 💦', 'Frog on a lily, sun in the sky ☀️', 'Down at the pond, wave bye-bye! 👋'],
    scene: {
      title: 'Real pond animals, up close',
      photoQuery: 'pond wildlife duck frog',
      clipTitle: 'A short pond clip — duck, frog and water 💧',
      clipUrl: 'https://www.youtube.com/results?search_query=pond+animals+for+kids+duck+frog',
      listenFor: 'Listen for the water sound. Every time you hear a splash, say “splash!” out loud.',
    },
    mission: {
      title: 'Describe your own pond',
      realWorld: 'Look out of the window (or at a photo of a park) and tell someone what water you can find near where you live.',
      sayIt: '“Near my home there is ___ and I think ___. Because ___.”',
      steps: ['Find any water near home or in a photo', 'Say the three-part sentence out loud', 'Answer one “why?” question about it', 'Teach the sentence to someone in the family'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Waddle round the room like a duck, then sit down. 🦆',
        'Twenty seconds of freeze — when I say splash, stand up.',
        'Breathe in for four, out for four, and stretch your wings.',
      ],
      exitTicket: [
        '“In my pond there is ___.”',
        '“The duck swims in the pond because ___.”',
        'One story sentence they could not say at the start.',
      ],
      nextTime: 'Next time: the frog gets a letter 🐸 — same pond words, but the child does the asking.',
    },
    talkGoal: 40,
    homework: ['Read the pond story to a grown-up. 15 XP.', 'Write three pond words. 10 XP.', 'Draw your pond and label it. 15 XP.'],
    caregiverNote: 'Ask your child to tell you the pond story in their own words this week. Praise the effort.',
    teacherNote: 'Run sheet: HOOK 3 · WARM-UP TALK 4 · INPUT 6 · GUIDED TALK 6 · FREE PRODUCTION 7 · WRAP 4. The review sits inside the first four minutes — retrieval before new input — and the child owes forty spoken turns. If a phase runs short, empty its reserve before you move on.',
  };
}

/*
 * The story demo.
 *
 * Both bands get the same four things, because a story lesson without them is a
 * reading-out-loud: the STORY as pages, the five-part MAP every retell is built from,
 * the three RETELL RUNGS (with the words → pictures only → from memory), and the
 * HOT-SEAT where the child does the asking. Thirty minutes, story-shaped phases, and
 * the child doing the talking in at least half of it.
 */
function storyLessonDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'The Sleepy Duck',
      durationMinutes: 30,
      objectives: ['Join in with “quack!” on every page', 'Do the action on each page', 'Tell me what the duck did'],
      materials: ['The four to six pages on screen or printed', 'A duck toy', 'A real blanket for the sleep page'],
      words: VY_ANIMALS.slice(0, 5).map((w) => ({ ...w })),
      steps: [
        phase(
          '1 · Hook & predict', 'HOOK & PREDICT', 3, 3, 3,
          'Look! 🦆 Who is this? It is a duck, and she is SO sleepy. Do you think she will go to sleep? Tell me: yes or no!',
          'Looks at the cover, guesses, says “yes!” or “no!”',
          'Say “I think ___.”',
          ['Is she happy or sleepy?', 'Why is she sleepy?', 'Where do you sleep?'],
          ['Let the duck yawn at the child.', 'Guess again with your eyes closed.', 'Ask the duck a question.'],
          'The guess comes FIRST — a child who has guessed listens for the answer.',
        ),
        phase(
          '2 · Pre-teach the words', 'PRE-TEACH', 4, 4, 4,
          'Two words before we start. Sleepy. 😴 Can you be sleepy? Show me sleepy! And splash. 💦 Splash, splash!',
          'Pretends to be sleepy, then splashes with hands.',
          'Say “sleepy” and “splash”.',
          ['Which one are you now?', 'Why do ducks splash?', 'What sound does a splash make?'],
          ['Do both faces as fast as you can.', 'Make the duck do each one.', 'Say it in a whisper, then shout it.'],
          'Only the words the story actually needs — two is plenty at this age.',
        ),
        phase(
          '3 · Tell the story', 'TELL', 7, 6, 6,
          'The duck was sleepy. She swam in the water — SPLASH! “Quack!” She looked for a soft bed. She found a warm spot. She closed her eyes. Shhh…',
          'Joins in with “quack!” and the splash action on every page.',
          'Say “quack!” and “splash!”',
          ['Where is the duck now?', 'Why was she sleepy?', 'What would she say to you?'],
          ['Tell the next page with the wrong sound — the child corrects you.', 'Let the child turn the page.', 'Tell it again, faster.'],
          'Tell it, do not read it — the child is listening, not decoding.',
        ),
        phase(
          '4 · Retell — three goes', 'RETELL', 6, 5, 8,
          'Your turn! Tell me what the duck did. Start like this: “Duck went…” Now try again with the words hidden — just the pictures. And now… with everything hidden!',
          'Retells the story three times, with less help each time.',
          'Say “Duck went… then… then…”',
          ['What did the duck do first?', 'Why did she splash?', 'What did she do at the end?'],
          ['Tell it as the duck, with a quack voice.', 'Tell it with one mistake in it — the child fixes it.', 'Tell it to the duck toy.'],
          'Three retells of one story is the whole point of the lesson.',
        ),
        phase(
          '5 · Hot-seat & new ending', 'EXTEND', 6, 5, 6,
          'Now I am the duck! 🦆 Ask me a question. Anything! Then you say what happens next — maybe the duck finds a friend?',
          'Interview the tutor in role; invent one new thing at the end.',
          'Ask “Duck, why ___?” and say “Then the duck ___.”',
          ['What should I be instead?', 'Why did she want a friend?', 'What if she found a big pond?'],
          ['Be a different animal for round two.', 'Give the story a silly ending.', 'Ask three questions in a row.'],
          'Hot-seating is where comprehension turns into real speech.',
        ),
        phase(
          '6 · Wrap', 'WRAP', 4, 4, 2,
          'Tell me the story one more time, in three little bits. Then: goodnight, duck! 👋',
          'Retells in three sentences, waves goodnight.',
          'Say “goodnight, duck!”',
          ['What was your favourite page?', 'How did the duck feel at the end?', 'What story next time?'],
          ['Retell it to each toy in turn.', 'Whisper the last page.', 'Sing goodnight instead of saying it.'],
          'End on the same note every lesson — that is what makes it a ritual.',
        ),
      ],
      lyrics: ['Quack, quack, sleepy duck 😴', 'In the water, splash and tuck 💦', 'Quack, quack, time for bed 🛏️', 'Shhh... goodnight, sleepyhead 🌙'],
      game: {
        name: 'Point at the Story',
        howToPlay: 'Ask “where is the duck?” — the child points at the picture.',
        winCondition: 'Every picture has been found once.',
        turns: 4,
        offline: 'The four printed pictures on the floor.',
        items: [
          item('🦆 Where is the sleepy duck?', 'duck', ['cat'], '🦆'),
          item('💦 Where is the water?', 'splash', ['duck'], '💧'),
          item('🛏️ Where is the bed?', 'sleep', ['splash'], '🛏️'),
          item('😴 Who is sleeping?', 'duck', ['dog'], '😴'),
        ],
      },
      story: {
        pages: [
          { text: 'The duck was sleepy. 🦆 “Quack!”', emoji: '🦆', speaker: 'the duck' },
          { text: 'She swam in the water. Splash! 💦 “Quack!”', emoji: '💦' },
          { text: 'She looked for a soft bed. 🛏️ “Not yet!”', emoji: '🛏️', speaker: 'the duck' },
          { text: 'She found a warm spot. 🌙 “Quack!”', emoji: '🌙' },
          { text: 'She closed her eyes. Shhh… 😴', emoji: '😴' },
        ],
        map: {
          character: 'the sleepy duck',
          setting: 'by the pond, at bedtime',
          problem: 'she wanted a soft bed',
          feeling: 'sleepy, then cosy',
          ending: 'she went to sleep',
        },
        rungs: [
          { with: 'the pages and the words', prompt: 'Your turn! Tell me what the duck did. Start with: “Duck went…”', talkTarget: 3 },
          { with: 'the pictures only', prompt: 'Now the words go away! Just the pictures. Tell me again — “First… then…”', talkTarget: 3 },
          { with: 'no pictures, just the story map', prompt: 'Everything hidden! Who was in the story? Where? What did she want? Tell me.', talkTarget: 2 },
        ],
        roleplay: {
          character: 'the sleepy duck',
          emoji: '🦆',
          questions: ['Duck, why are you sleepy?', 'Duck, where is your bed?', 'Duck, can I splash with you?'],
          lines: ['“Quack! Not yet!”', '“Goodnight!”'],
        },
        pairedBook: {
          title: 'A real read-aloud bedtime story',
          url: 'https://storylineonline.net/library',
          source: 'Storyline Online (Screen Actors Guild)',
          why: 'A real actor reads a real picture book — play it once for the music of the language.',
        },
      },
      scene: {
        title: 'A real duck, asleep on real water',
        photoQuery: 'duck sleeping on water',
        clipTitle: 'A duck quacking and splashing 🦆',
        clipUrl: 'https://www.youtube.com/results?search_query=super+simple+songs+duck',
        listenFor: 'Put your hand up every time you hear “quack”!',
      },
      mission: {
        title: 'Tell the story at bedtime',
        realWorld: 'At bedtime this week, your child tells this story to you — in English, from memory, in three bits.',
        sayIt: '“Duck went… then… then she went to sleep.”',
        steps: ['Get the duck toy or any toy', 'The child tells the story in three bits', 'You ask “what happened at the end?”', 'Say goodnight to the toy in English'],
      },
      run: {
        targetMinutes: 30,
        brainBreaks: ['Be a sleepy duck, then a splashing duck, then sit down. 🦆', 'Yawn three times and stretch up tall.', 'Shhh… freeze like you are asleep for ten seconds.'],
        exitTicket: ['“quack!” on every page', 'A three-bit retell', '“goodnight, duck!”'],
        nextTime: 'Next time: the duck meets a frog 🐸 — same map, one new animal.',
      },
      talkGoal: 29,
      caregiverNote: 'Read the pages again at bedtime and say “goodnight, duck” in English. Same words, every night.',
      teacherNote: 'Tell it, do not read it. Fourteen of the thirty minutes are the CHILD telling the story back — the pages, the map and the role-play all exist to make that possible.',
    };
  }
  return {
    title: 'The Duck Who Wanted a Friend',
    durationMinutes: 30,
    objectives: ['Retell a story in three parts', 'Answer “why” questions in full sentences', 'Interview a character in role'],
    materials: ['The story pages on screen', 'The story map visible on the wall', 'A timer for the retell rungs'],
    words: wordsByBand(band),
    steps: [
      phase(
        '1 · Hook & predict', 'HOOK & PREDICT', 3, 3, 3,
        'Look at this cover. A duck is sitting alone by a big pond. What do you think she wants? Guess before I tell you — and say WHY you think that.',
        'Predicts, and gives a reason for the prediction.',
        'Say “I think she wants ___ because ___.”',
        ['How does she look in the picture?', 'Why would a duck sit alone?', 'What would YOU do if you were her?'],
        ['Three guesses, sillier each time.', 'Guess what the END will be.', 'Describe the cover as if you were the duck.'],
        'A prediction gives the child a reason to listen. Never skip it.',
      ),
      phase(
        '2 · Pre-teach the words', 'PRE-TEACH', 4, 4, 6,
        'Three words we will need: lonely, waddle, and belong. Say each one, then tell me a sentence of your own with it.',
        'Says each word, then produces a sentence.',
        'Say “The ___ is ___ because ___.”',
        ['Which word do you already know?', 'Why would a duck feel lonely?', 'Who belongs in your family?'],
        ['Say the word, spell it, then use it.', 'Put two of them in one sentence.', 'Use one wrong and let me correct it.'],
        'Only the words the story leans on — three, not ten.',
      ),
      phase(
        '3 · Tell the story', 'TELL', 7, 6, 8,
        'The duck wanted a friend. She waddled to the lily, where a frog sat. “Will you play with me?” The frog smiled. “I will!” And they splashed until the sun went down. The duck was lonely no more.',
        'Listens, joins in on the dialogue lines, reacts.',
        'Say the duck’s line: “Will you play with me?”',
        ['What did the duck want?', 'Why did she swim to the lily?', 'How would you have answered the duck?'],
        ['Tell one page with the wrong emotion — the child spots it.', 'Pause before the ending and ask for three options.', 'Retell it as the frog.'],
        'Stop once per page to ask, but never break the story mid-sentence.',
      ),
      phase(
        '4 · Retell — three goes', 'RETELL', 6, 5, 17,
        'Your turn. Rung one: tell it back with the pages here. Rung two: pages only, no words. Rung three: everything hidden, just our five map boxes.',
        'Retells the story three times, each with less support.',
        'Say “First… then… because… at the end…”',
        ['What happened first?', 'Why did the frog say yes?', 'What changed from beginning to end?'],
        ['Retell it in exactly four sentences.', 'Retell it as the frog.', 'Retell it with the ending changed.'],
        'Three retells of one story is the difference between reading and knowing.',
      ),
      phase(
        '5 · Hot-seat & new ending', 'EXTEND', 6, 5, 10,
        'I am the duck now — go on, interview me. Then decide: what happens the NEXT day? You invent it.',
        'Asks the tutor questions in role; invents and tells a new ending.',
        'Ask “Duck, why ___?” then say “The next day, the duck ___.”',
        ['What should I be for round two?', 'Why did she feel different at the end?', 'What if the frog had said no?'],
        ['Be two different characters back to back.', 'Make the new ending funny, then sad.', 'Interview the lily.'],
        'Hot-seating cannot be faked: to ask a good question the child has to understand.',
      ),
      phase(
        '6 · Wrap', 'WRAP', 4, 4, 6,
        'Last job: tell me the story in three sentences, then name how the duck felt at the start and how she felt at the end — and why she changed.',
        'Retells in three sentences; names and explains a feeling.',
        'Say “The story is about ___. It ends with ___. She felt ___ because ___.”',
        ['Which sentence are you proudest of?', 'Why did that one stay with you?', 'What story shall we do next time?'],
        ['Say the retell faster.', 'Say it to the duck.', 'Turn your best sentence into a question.'],
        'The exit ticket is a retell plus a feeling — that is real comprehension evidence.',
      ),
    ],
    game: {
      name: 'Story Quiz',
      howToPlay: 'Read the question, tap one of four answers.',
      winCondition: 'Six questions answered; small, repeatable win.',
      turns: 6,
      offline: 'Ask the questions aloud with four fingers up.',
      items: [
        item('Who did the duck want to meet?', 'a friend', ['a teacher', 'a doctor', 'a driver'], '🦆'),
        item('Where did the duck swim?', 'to the lily', ['to school', 'to the shop', 'to the moon'], '🌸'),
        item('What did the frog say?', 'yes', ['no', 'maybe', 'nothing'], '🐸'),
        item('What did they do at the end?', 'splashed and dived', ['went home', 'ate lunch', 'slept'], '💦'),
        item('How did the duck feel at the end?', 'happy', ['sad', 'angry', 'tired'], '😀'),
        item('What was the story about?', 'making a friend', ['a big storm', 'a new toy', 'a long race'], '🤝'),
      ],
    },
    story: {
      pages: [
        { text: 'The duck lived alone by a big, quiet pond. She was lonely.', emoji: '🦆' },
        { text: 'One morning she waddled all the way to the lily at the far end.', emoji: '🌸' },
        { text: 'A small green frog sat on the lily. He was wide awake.', emoji: '🐸' },
        { text: '“Will you play with me?” asked the duck, very quietly.', emoji: '💬', speaker: 'the duck' },
        { text: 'The frog smiled a big frog smile. “I will!”', emoji: '😊', speaker: 'the frog' },
        { text: 'They splashed and dived and raced all afternoon.', emoji: '💦' },
        { text: 'The sun went down slowly, and the pond turned gold.', emoji: '🌅' },
        { text: '“Come back tomorrow?” asked the duck. “I will!” said the frog.', emoji: '🤝', speaker: 'the frog' },
        { text: 'The duck was lonely no more.', emoji: '💛' },
      ],
      map: {
        character: 'the lonely duck',
        setting: 'a big quiet pond, one morning',
        problem: 'she had no one to play with',
        feeling: 'lonely, then happy',
        ending: 'the frog promised to come back',
      },
      rungs: [
        { with: 'the pages and the words', prompt: 'Tell it back with the pages here. Start with: “First… then… at the end…”', talkTarget: 5 },
        { with: 'the pictures only', prompt: 'The words go away now. Same story, pictures only, and add one thing I did not say.', talkTarget: 6 },
        { with: 'everything hidden, just the story map', prompt: 'Everything hidden — only our five boxes. Use all five and give me a reason for the ending.', talkTarget: 6 },
      ],
      roleplay: {
        character: 'the duck',
        emoji: '🦆',
        questions: ['Duck, why were you lonely?', 'Duck, why did you swim all the way to the lily?', 'Duck, how did you feel when the frog said yes?', 'Duck, what will you do tomorrow?'],
        lines: ['“Will you play with me?”', '“Come back tomorrow?”'],
      },
      pairedBook: {
        title: 'A real picture book read aloud by an actor',
        url: 'https://storylineonline.net/library',
        source: 'Storyline Online (Screen Actors Guild)',
        why: 'Play one for the class warm-up, and send it home — a child should hear a story told by someone whose whole job is telling them.',
      },
    },
    scene: {
      title: 'Real pond wildlife, up close',
      photoQuery: 'duck and frog on a pond',
      clipTitle: 'A real duck and a real frog at a pond 🦆🐸',
      clipUrl: 'https://www.youtube.com/results?search_query=duck+and+frog+pond+for+kids',
      listenFor: 'Listen for the splash. Every time you hear it, say “splash!” and tell me who made it.',
    },
    mission: {
      title: 'Tell the story to your family tonight',
      realWorld: 'At dinner or bedtime this week, your child tells this whole story in English, from memory, using all five map boxes.',
      sayIt: '“First… then… because… and at the end… She felt ___ because ___.”',
      steps: ['Get the story map (or draw it together)', 'The child tells it in five parts', 'Answer one “why” question', 'Ask the family one question about the story'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: ['Waddle like the duck to the door and back. 🦆', 'Twenty seconds of freeze — when I say splash, dive down.', 'Stretch your wings up, breathe out slowly, sit down.'],
      exitTicket: ['A three-sentence retell', '“She felt lonely because ___.”', 'One question they asked the duck in role'],
      nextTime: 'Next time: the frog gets a letter 🐸 — same map, but the child writes the reply out loud.',
    },
    talkGoal: 50,
    homework: ['Retell the story to a grown-up in three sentences. 15 XP.', 'Draw the duck and her new friend. 15 XP.', 'Play the paired read-aloud with a grown-up. 10 XP.'],
    caregiverNote: 'Ask your child to tell you the story of the duck and the frog this week. Ask “what happened at the end, and why did she feel different?”',
    teacherNote: 'Run sheet: HOOK & PREDICT 3 · PRE-TEACH 4 · TELL 7 · RETELL 6 · EXTEND 6 · WRAP 4. Seventeen of the child\'s spoken turns are the three retells alone — the story is told once and retold three times, which is the whole design. Correct by recasting, never by stopping.',
  };
}

function phonicsDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'Listen for /d/ — the Drum Sound',
      durationMinutes: 30,
      objectives: ['Hear /d/ in a word', 'Say three /d/ words', 'Move when you hear it'],
      materials: ['A drum or a picture of one', 'The sound story on screen', 'Room to stand up and sit down'],
      words: [
        { word: 'drum', emoji: '🥁', sayAloud: 'd-d-drum', meaning: 'it starts with /d/', example: 'Drum! D-d-drum!' },
        { word: 'duck', emoji: '🦆', sayAloud: 'd-d-duck', meaning: 'it starts with /d/', example: 'Duck starts with /d/.' },
        { word: 'dog', emoji: '🐕', sayAloud: 'd-d-dog', meaning: 'it starts with /d/', example: 'Dog starts with /d/.' },
        { word: 'door', emoji: '🚪', sayAloud: 'd-d-door', meaning: 'it starts with /d/', example: 'Door starts with /d/.' },
        { word: 'cat', emoji: '🐈', sayAloud: 'cat', meaning: 'this one does NOT start with /d/', example: 'Cat — no /d/!' },
        { word: 'sun', emoji: '☀️', sayAloud: 'sun', meaning: 'this one does NOT start with /d/', example: 'Sun — no /d/!' },
      ],
      steps: [
        phase(
          '1 · The sound', 'HOOK', 3, 3, 3,
          'D-d-drum! 🥁 Listen: /d/ /d/ /d/. Watch my mouth: my tongue jumps up, then down. Your turn — /d/!',
          'Watches the mouth, then copies the sound three times.',
          'Say “d-d-d!” with me.',
          ['Can you make my sound?', 'Is it a loud sound or a quiet one?', 'What else sounds like a drum?'],
          ['Whisper it, then shout it.', 'Make the sound with your hand drumming your knee.', 'Say it as a duck would.'],
          'The SOUND first, never the letter name. At this age a letter name is a word they cannot use.',
        ),
        phase(
          '2 · Say it in a word', 'WARM-UP TALK', 4, 4, 5,
          'd-d-duck! d-d-dog! The sound goes at the front. Say it with me — d-d-duck!',
          'Says the sound then the whole word, ten times across the phase.',
          'Say “d-d-___!”',
          ['Which one do you like best?', 'Why does a duck say quack?', 'What would a dog do at the door?'],
          ['Say it into the drum.', 'Make your voice big, then tiny.', 'Say the word as the animal.'],
          'Sound, then word, every time — never the other way round.',
        ),
        phase(
          '3 · Find it', 'INPUT', 6, 5, 5,
          'Which picture starts with /d/? Duck… or sun? Point at the one that starts with our sound!',
          'Points at the /d/ picture and says which one it is.',
          'Say “this one — ___!”',
          ['Which one is the door?', 'Why does a duck sit on water?', 'What would you put in the drum?'],
          ['Find something in the room starting with /d/.', 'Sort the pictures into two piles.', 'Say the ones that do NOT start with /d/.'],
          'Two pictures only, never more. A three-year-old chooses between two things.',
        ),
        phase(
          '4 · Stand up, sit down', 'GUIDED TALK', 6, 5, 8,
          'I say a word. Stand up if you hear /d/ — dog! … cat! Sit down for cat. Ready?',
          'Stands and sits, and says each /d/ word as they stand.',
          'Say “stand for ___!”',
          ['Which word made you stand?', 'Was cat easy or tricky?', 'Can you trick ME with a word?'],
          ['Do it faster.', 'Let the child be the teacher and say the words.', 'Hop instead of standing.'],
          'It is a moving game, not a test — they lose nothing by sitting down.',
        ),
        {
          ...phase(
            '5 · The letter cards', 'FREE PRODUCTION', 7, 6, 5,
          'Look — cards! 🃏 I say the word, you turn the card and we say the sound together: d-d-duck!',
          'Turns a card, says the sound, says the word.',
          'Say “d-d-___!” for every card.',
          ['Which card is your favourite?', 'Why does that picture start with /d/?', 'What card shall we add?'],
          ['Say each card in a silly voice.', 'Turn them all face down and guess.', 'Do the cards for the words that do NOT have /d/.'],
            'The letter cards are the drill — open them on the big screen and the phase runs itself.',
          ),
          /* This is the ONE phase that opens the engine: the drill lives inside the run
             sheet rather than swallowing the whole session. */
          drill: true,
        },
        phase(
          '6 · Bye-bye, /d/', 'WRAP', 4, 4, 3,
          'One more story, then bye-bye! You say it with me: dig, dig, dig!',
          'Joins in with “dig, dig, dig!”, then says goodbye to the sound.',
          'Say “dig, dig, dig!”',
          ['Who was in our story?', 'What did Dan the dog do?', 'Shall we do /m/ next time?'],
          ['Say the story line as a whisper.', 'Make the drum sound one last time.', 'Wave bye-bye to the sound.'],
          'End on the same note every lesson — at this age that is what makes it stick.',
        ),
      ],
      lyrics: ['D-d-drum, d-d-duck 🥁🦆', 'D-d-dog, d-d-door 🐕🚪', 'Listen, listen, can you hear? 👂', 'D-d-done — no more /d/! 👋'],
      game: {
        name: 'Stand Up for /d/',
        howToPlay: 'Say each word; the child stands up only for /d/ words.',
        winCondition: 'Ends with a big clap for joining in.',
        turns: 6,
        offline: 'Exactly the same game with no screen.',
        items: [
          item('🥁 Do you hear /d/ — drum?', 'yes', ['no'], '🥁'),
          item('🦆 Do you hear /d/ — duck?', 'yes', ['no'], '🦆'),
          item('🐈 Do you hear /d/ — cat?', 'no', ['yes'], '🐈'),
          item('☀️ Do you hear /d/ — sun?', 'no', ['yes'], '☀️'),
          item('🚪 Do you hear /d/ — door?', 'yes', ['no'], '🚪'),
          item('🐕 Do you hear /d/ — dog?', 'yes', ['no'], '🐕'),
        ],
      },
      phonics: {
        sound: '/d/',
        inWords: ['duck', 'dog', 'door', 'drum', 'daddy'],
        /* Hear-the-difference pairs. A two-year-old cannot read cat and bat, but they
           CAN hear that only one of them starts with our sound — and hearing it is the
           whole skill at this age. */
        minimalPairs: [
          { a: 'dog', b: 'log', emojiA: '🐕', emojiB: '🪵' },
          { a: 'door', b: 'four', emojiA: '🚪', emojiB: '4️⃣' },
          { a: 'dig', b: 'pig', emojiA: '⛏️', emojiB: '🐖' },
        ],
        realWords: ['duck', 'dog', 'door', 'drum'],
        /* The ladder at this age is ears, mouth and body — the read/spell/write rungs
           do not exist yet, and asking for them is how a pre-reader learns to guess. */
        ladder: [
          { step: 'hear it', what: 'Say /d/ on its own three times. The child copies the sound, never the letter name.', talkTarget: 3 },
          { step: 'say it', what: 'Say it at the front of a word: d-d-duck!', talkTarget: 3 },
          { step: 'find it', what: 'Which picture starts with /d/? Two pictures only, so the child can point.', talkTarget: 2 },
          { step: 'move it', what: 'Stand up for a /d/ word, sit down for the others.', talkTarget: 4 },
          { step: 'hear the difference', what: 'Say both: dog… log. Which did I say?', talkTarget: 3 },
          { step: 'story time', what: 'The grown-up reads the sound story while the child joins in on “dig, dig, dig!”', talkTarget: 3 },
          { step: 'say goodbye', what: 'Say three /d/ words in the goodbye: bye-bye, duck!', talkTarget: 2 },
        ],
        mouth: 'tongue up behind your top teeth — then let it go: d-d-d!',
        decodable: {
          title: 'Dan the Dog',
          lines: [
            'Dan the dog. 🐕',
            'Dan digs. Dig, dig, dig! ⛏️',
            'A duck! 🦆',
            'Dan and the duck dig. Dig, dig, dig!',
            'Dan is done. Bye-bye, Dan! 👋',
          ],
          retell: 'tell me who we saw and what they did — start with “Dan…”',
          talkTarget: 4,
        },
      },
      scene: {
        title: 'A real dog and a real duck, close up',
        photoQuery: 'a dog and a duck',
        clipTitle: 'A real drum and a real dog 🥁🐕',
        clipUrl: 'https://www.youtube.com/results?search_query=drums+and+dogs+for+kids',
        listenFor: 'Put your hand up every time you hear /d/!',
      },
      mission: {
        title: 'Find three /d/ things',
        realWorld: 'At home this week, your child brings you three things whose name starts with /d/ — the door, a duck toy, a drum — and says each one out loud.',
        sayIt: '“d-d-door! d-d-duck! d-d-drum!”',
        steps: ['Say /d/ together once', 'The child finds and brings three things', 'The child says each word out loud', 'Clap for every try'],
      },
      run: {
        targetMinutes: 30,
        brainBreaks: ['Waddle like a duck to the door and back. 🦆', 'Drum on your knees — fast, then slow, then stop.', 'Stand up on /d/, sit down on “no” — five times.'],
        exitTicket: ['The /d/ sound, three times', 'Three /d/ words said out loud', '“dig, dig, dig!” from our story'],
        nextTime: 'Next time: the /m/ sound 🐒 — man, milk, monkey. Same game, one new sound.',
      },
      talkGoal: 29,
      homework: ['“I spy with /d/” at home — bring your grown-up three things. 10 XP.', 'Say the drum chant in the bath. 10 XP.'],
      caregiverNote: 'Play “I spy with /d/” this week: “I spy something that starts with d... door!” Do not teach letter names — the sound is the point.',
      teacherNote: 'Run sheet: HOOK 3 · WARM-UP TALK 4 · FIND IT 6 · STAND UP 6 · THE LETTER CARDS 7 · WRAP 4. Nothing is read and nothing is written at this age: the child hears, says, points and moves. The story at the end is read BY the grown-up, and the child joins in on “dig, dig, dig!”.',
    };
  }
  return {
    title: 'The -at Family — Read It, Build It, Write It',
    durationMinutes: 30,
    objectives: ['Blend c-a-t into cat', 'Read six -at words and three made-up ones', 'Write cat, hat and mat'],
    materials: ['Letter tiles or magnetic letters', 'The pattern written big: -at', 'The decodable story on screen', 'Paper and pencil for the dictation'],
    words: Y_PHONICS.map((w) => ({ ...w })),
    steps: [
      phase(
        '1 · Hear it', 'HOOK', 3, 3, 4,
        'Listen: cat. 🐈 hat. 🎩 mat. 🧶 What is the same at the END of all three? Say all three with me, then tell me what you hear.',
        'Says the three words, then names what is the same.',
        'Say “they all end with ___.”',
        ['What is the same in all three?', 'Why do they sound like a family?', 'What other word could join them?'],
        ['Say the three words faster and faster.', 'Say them as a whisper, a robot and a giant.', 'Find the two that rhyme.'],
        'Hear it before you ever see it: the ear does the work first, the eye confirms it.',
      ),
      phase(
        '2 · Say it — mouth and pairs', 'WARM-UP TALK', 4, 4, 6,
        'Watch my mouth for the “a”: open wide, tongue low and flat. Now the pairs — I say one, you tell me which: cat… or bat?',
        'Watches the mouth, copies the vowel, then chooses which of two words they heard.',
        'Say “you said ___.”',
        ['Which one did I say?', 'How do the two words differ?', 'Can you say a pair that tricks me?'],
        ['Say the pairs in a silly voice.', 'The child says the pair and YOU choose — sometimes wrongly.', 'Clap the two sounds of each word.'],
        'Minimal pairs are the only fair listening test: the picture cannot give the answer away.',
      ),
      phase(
        '3 · Find it — build the family', 'INPUT', 6, 5, 8,
        'Change only the first sound and the rest stays exactly the same: c-a-t, h-a-t, m-a-t, b-a-t. Your turn — build one with the tiles.',
        'Blends each word aloud and builds one from letter tiles.',
        'Say “___ -a-t makes ___.”',
        ['Which letter changed?', 'Why does the end stay the same?', 'What happens if we change the -at too?'],
        ['Build a word and read it backwards.', 'Cover the first letter and read what is left.', 'Make three words with the same first letter.'],
        'One change at a time. Changing the vowel as well is how the pattern stops being a pattern.',
      ),
      phase(
        '4 · Read it — real and made-up', 'GUIDED TALK', 6, 5, 8,
        'Read these six for me: cat, hat, mat, bat, rat, sat. Now the tricky ones — zat, dat, lat. They are not real words, and you can still read them.',
        'Reads six real words, then three made-up words, sounding each one out.',
        'Say “z-a-t — zat. It is a made-up word.”',
        ['Which one was easiest?', 'Why can you read a word you have never seen?', 'What would “zat” mean if it were real?'],
        ['Read them against the clock.', 'Read only the made-up ones, twice.', 'Make up one more made-up word together.'],
        'A real word can be read from memory; a made-up word can only be read by decoding. That is the whole test.',
      ),        {
          ...phase(
            '5 · Build it — the drill', 'FREE PRODUCTION', 7, 6, 7,
        'Now the word builder. 🐝 I say the word, you tap the letters in order. Wrong tiles wobble back — you just try again.',
        'Builds each word from its letters in the engine, then reads it back aloud.',
        'Say the word, then the letters: “cat — c-a-t”.',
        ['Which word was hardest to build?', 'Why do the letters go in that order?', 'Which word would you add to the game?'],
        ['Build the words in alphabetical order.', 'Build one word and hide it — the child reads it from memory.', 'Spell one out loud, no tiles at all.'],            'Building is encoding: it proves the child knows the word from the inside, not just by sight.',
          ),
          /* The engine opens from this phase and closes back into it — the run sheet,
             the floor and the talk meter all carry on where they were. */
          drill: true,
        },
      phase(
        '6 · Write it — dictation', 'WRAP', 4, 4, 7,
        'Last job. I say a word, you write it: cat. … hat. … mat. Then read the story at the end out loud — every word in it is ours.',
        'Writes three words from dictation, then reads the decodable story aloud.',
        'Say “I wrote ___ and I can read it back.”',
        ['Which word was easiest to write?', 'Why do all three end the same way?', 'What shall we build next time?'],
        ['Write the words bigger, then smaller.', 'Write one made-up word too.', 'Write one word and make it into a picture.'],
        'Dictation closes the loop: hear it, say it, read it, write it — and then read it back.',
      ),
    ],
    game: {
      name: 'Build the -at Word',
      howToPlay: 'Hear the word, tap the letter tiles in order. Wrong tiles wobble back.',
      winCondition: 'Six words spelled correctly.',
      turns: 6,
      offline: 'Magnetic letters on the table.',
      items: [
        item('🐝 Build the word you hear: cat', 'cat', ['k a t', 'c o t'], '🐈'),
        item('🐝 Build: hat', 'hat', ['h e t', 'h a d'], '🎩'),
        item('🐝 Build: mat', 'mat', ['m o t', 'm a p'], '🧶'),
        item('🐝 Build: bat', 'bat', ['b a d', 'p a t'], '🦇'),
        item('🐝 Build: rat', 'rat', ['r e t', 'r a m'], '🐀'),
        item('🐝 Build: sat', 'sat', ['s a d', 'c a t'], '🪑'),
      ],
    },
    worksheet: [
      'Match: c ___ t · h ___ t · m ___ t (write the vowel)',
      'Complete: bat, ___, rat, ___',
      'Write two -at words of your own.',
      'Answer key: a · bat, cat; any real -at word.',
    ],
    phonics: {
      sound: '-at',
      inWords: ['cat', 'hat', 'mat', 'bat', 'rat', 'sat'],
      minimalPairs: [
        { a: 'cat', b: 'bat', emojiA: '🐈', emojiB: '🦇' },
        { a: 'hat', b: 'hot', emojiA: '🎩', emojiB: '🥵' },
        { a: 'mat', b: 'map', emojiA: '🧶', emojiB: '🗺️' },
        { a: 'rat', b: 'ran', emojiA: '🐀', emojiB: '🏃' },
      ],
      realWords: ['cat', 'hat', 'mat', 'bat', 'rat', 'sat'],
      /* Made-up words, decodable from the family. A real word can be read from
         memory; these can only be read by sounding out — which is the honest test. */
      nonsenseWords: ['zat', 'dat', 'lat'],
      ladder: [
        { step: 'hear it', what: 'Say -at on its own: a-t, a-t. Then the whole family: cat, hat, mat.', talkTarget: 4 },
        { step: 'say it', what: 'Say each word slowly, then fast: c-a-t, cat.', talkTarget: 3 },
        { step: 'find it', what: 'Find the pattern in each word — where does -at start?', talkTarget: 4 },
        { step: 'blend it', what: 'Push the sounds together: b-a-t, bat. Three words you have never seen.', talkTarget: 4 },
        { step: 'read it', what: 'Read the six real words, then the three made-up ones.', talkTarget: 5 },
        { step: 'spell it', what: 'Build a word from its letter tiles.', talkTarget: 3 },
        { step: 'write it', what: 'Write the three dictation words as I say them.', talkTarget: 3 },
      ],
      mouth: 'open your mouth wide, tongue low and flat — the “a” the doctor looks at',
      dictation: ['cat', 'hat', 'mat'],
      answerKey: ['cat', 'hat', 'mat'],
      decodable: {
        title: 'The Cat and the Rat',
        /* Every line stays inside the family: cat, sat, mat, fat, rat, bat — plus the
           heart-words listed below. Nothing the sound cannot decode is smuggled in. */
        lines: [
          'The cat sat on the mat.',
          'The fat rat sat on the mat.',
          'The bat sat on the mat.',
          'The cat is fat.',
          'The fat cat and the fat bat sat.',
          'What a fat cat!',
        ],
        /* Every word the -at pattern cannot decode, named so the tutor pre-teaches it.
           A decodable story is only decodable if nothing in it is a surprise. */
        trickyWords: ['the', 'is', 'a', 'on', 'to', 'and', 'what'],
        retell: 'tell me who sat on the mat, and who else came — in three sentences',
        talkTarget: 4,
      },
    },
    scene: {
      title: 'A real cat, sitting on a real mat',
      photoQuery: 'a cat sitting on a mat',
      clipTitle: 'Watch the mouth: how c-a-t blends into cat 🎬',
      clipUrl: 'https://www.youtube.com/results?search_query=blending+cvc+words+for+kids',
      listenFor: 'Hand up every time you hear a word that ends in -at — count them!',
    },
    mission: {
      title: 'The -at hunt at home',
      realWorld: 'At home this week, your child hunts for three MORE words that end in -at — in a book, on a cereal box, on a sign. Finding the pattern in real print is the whole point.',
      sayIt: '“___ ends with -at — so it belongs to our family.”',
      steps: ['Look at one book, box or sign together', 'Find three -at words together', 'The child reads each one aloud', 'The child writes the three words down'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: ['March around the table saying “c-a-t, cat!” 🥁', 'Twenty seconds of freeze — when I say “blend”, clap the three sounds.', 'Stretch up tall, say “-at”, sit down slowly.'],
      exitTicket: ['Read the six real words', 'Read the three made-up words', 'Write cat, hat and mat'],
      nextTime: 'Next time: the -an family 🌙 — man, pan, fan. Same ladder, one new pattern.',
    },
    talkGoal: 40,
    homework: ['Read the -at family aloud to a grown-up. 15 XP.', 'Write four -at words. 15 XP.', 'Play the word builder and beat your own last score. 10 XP.'],
    caregiverNote: 'Ask your child to teach you the -at family, then let them read the story to you. Do not read it for them — the sounding-out is the practice.',
    teacherNote: 'Run sheet: HOOK 3 · WARM-UP TALK 4 · INPUT 6 · GUIDED TALK 6 · BUILD IT 7 · WRAP 4. The made-up words (zat, dat, lat) are the honest test — a real word can be read from memory, a made-up one only by decoding. The decodable story at the end is the payoff: every word in it comes from this family.',
  };
}

/* ── Printable Worksheet: the page IS the session, so the talk is on the paper ── */

/** The little one's page: colour, match, cut and stick — and one word said each time. */
const SHEET_MEDIA: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A real colouring song to sing while you colour 🖍️',
    url: search('https://www.youtube.com/results?search_query=', 'colour song for toddlers crayons'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'colour song for toddlers crayons'),
    where: 'both',
    forStep: 'Show the page',
    why: 'Play it once while the crayons come out — every colour word in it is a word the child already says.',
    source: 'Super Simple Songs',
    embeddable: false,
  },
  {
    kind: 'picture',
    title: 'A real photo of a child colouring at a table 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'child colouring with crayons at a table', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'child colouring with crayons at a table', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Talk it through',
    why: 'A photograph of the real thing they are about to do — the crayon box, the paper, the hand.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'audio',
    title: 'A real crayon scribbling on paper 🔊',
    url: 'https://freesound.org/search/?q=crayon+drawing+on+paper',
    searchUrl: 'https://freesound.org/search/?q=crayon+drawing+on+paper',
    where: 'class',
    forStep: 'Colour & match',
    why: 'Play it while they colour and whisper the word of the task over the top — the sound keeps the hands busy, the voice does the teaching.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'activity',
    title: 'A free colour-and-match game for home 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'colours matching kids'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'colours matching kids'),
    where: 'home',
    forStep: 'At home',
    why: 'Free and no logins — a grown-up and the child tap the colours and say them out loud.',
    source: 'Wordwall',
    embeddable: true,
  },
];

/** The reader's page: three graded parts, a key of their own and two own sentences. */
const SHEET_MEDIA_Y: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A real clip of how we hold the pencil ✏️',
    url: search('https://www.youtube.com/results?search_query=', 'how to hold a pencil for kids'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'how to hold a pencil for kids'),
    where: 'both',
    forStep: 'Look at the page',
    why: 'Twenty seconds of grip, then straight into the writing — the pencil is the only equipment this lesson has.',
    source: 'YouTube',
    embeddable: false,
  },
  {
    kind: 'picture',
    title: 'A real photo of a child writing at the kitchen table 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'child writing homework at kitchen table', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'child writing homework at kitchen table', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Look at the page',
    why: 'The real place this page gets done — the child should recognise their own table in it.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'audio',
    title: 'A real pencil writing on paper 🔊',
    url: 'https://freesound.org/search/?q=pencil+writing+on+paper',
    searchUrl: 'https://freesound.org/search/?q=pencil+writing+on+paper',
    where: 'class',
    forStep: 'Write the word',
    why: 'Play it quietly under the writing part — the room goes still and the words come out when they are asked for.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'activity',
    title: 'A free pond-words game the family can tap 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'pond animals words'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'pond animals words'),
    where: 'home',
    forStep: 'At home',
    why: 'No logins — the child reads each pond word aloud to a grown-up, then taps it.',
    source: 'Wordwall',
    embeddable: true,
  },
];

/**
 * Map worksheetDemo: two genuinely different pages, both of them thirty minutes.
 *
 * The sheet is the lesson, so the demo has to prove the two things a printed page
 * normally gets wrong: every task carries a line to SAY (the child never works in
 * silence), and the tutor's copy carries the same six phases, floors and talk counts
 * as every other upgraded tile — the print IS the session, not homework after it.
 */
function worksheetDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'Colour, Match & Say',
      durationMinutes: 30,
      objectives: ['Colour and match on the page', 'Say one word for every task', 'Tell me about your page'],
      materials: ['Thick crayons (no pencils — fingers trace first)', 'The printed page, one copy', 'A grown-up with the scissors'],
      words: VY_ANIMALS.slice(0, 5).map((w) => ({ ...w })),
      steps: [
        phase(
          '1 · Show the page', 'SHOW THE PAGE', 3, 3, 4,
          'Look at our page! 🖨 What can you see? … A big duck! And what is this? … Water! Nothing is coloured yet — first we look.',
          'Looks at the page and names what they can see, with help.',
          'Say “duck!” / “water!”',
          ['What can you see on the page?', 'Which one is the duck?', 'Which colour shall we use first?'],
          ['Hold the page up and count the pictures together.', 'Let the child choose the crayon before anything starts.', 'Point at each picture and let the child name it twice.'],
          'Nothing is explained and nothing is coloured yet. Looking first is what makes the rest of the page talkable.',
        ),
        phase(
          '2 · Talk it through', 'TALK IT THROUGH', 4, 4, 5,
          'Let’s say what we are going to do: colour the duck 🦆… colour the cow 🐮… line to the water 💧… line to the box 📦. You say the word with me: duck! cow! water!',
          'Names each of the four tasks and repeats each key word.',
          'Say it with me: “duck… cow… water… box!”',
          ['Which one comes first?', 'Which one is the cow?', 'Which one will be the trickiest?'],
          ['Say the words in a whisper, then loudly.', 'Point at each picture as you say it.', 'Let the child choose the order — any order is fine.'],
          'Every task is named BEFORE any crayon moves. A page the child can already “read” with their ears is a page they can do alone.',
        ),
        phase(
          '3 · Colour & match it', 'COLOUR & MATCH', 7, 6, 6,
          'Colour the duck yellow — big circles! 🖍️ The duck is done — and what is this? Duck! Now the cow: colour it brown, then one line from the cow to the grass. 🌾',
          'Colours inside the shapes and draws one line per match, saying the word each time.',
          'Say “duck!” ... say “cow!”',
          ['Is the duck yellow or blue?', 'What does the cow say?', 'Which one did you colour first?'],
          ['Colour with just one colour, then swap.', 'Do the second match in slow motion.', 'Let the child show the page to a toy and name it.'],
          'One word said every time a piece is finished — that is the English of this lesson. Everything else on the page is the excuse.',
        ),
        phase(
          '4 · Cut and stick', 'CUT & STICK', 5, 4, 5,
          'Now the scissors — I hold them. 👉 You say “cut!” Wait for me: CUT! ✂️ Now you put it in the box — say “stick!” STICK! 🧴',
          'Says the two words and places the cut shape in the box.',
          'Say “cut!” then “stick!”',
          ['Who holds the scissors?', 'Where does it go?', 'What is inside the circle?'],
          ['Say both words in a big voice.', 'Put it in the box with eyes closed.', 'Cut another one if there is time.'],
          'The grown-up does the cutting and the child does the talking — two words, shouted, but the two words are what the task is for.',
        ),
        phase(
          '5 · Say it out loud', 'SAY IT OUT LOUD', 6, 5, 7,
          'Your page! 🎉 Tell me: what colour is your duck? … Yellow! Who is on the grass? … Cow! And now finish this: “This is my ___.”',
          'Points at each part of their own page and finishes the sentence frame.',
          'Say: “This is my ___.”',
          ['What colour is your duck?', 'Who lives on the grass?', 'Who is this page for?'],
          ['Say the sentence to a toy.', 'Hold the page up and say it loudly.', 'Add one more thing: “and this is my sun!”'],
          'The finished page becomes a spoken sentence — the frame is short enough that the child supplies the word without help.',
        ),
        phase(
          '6 · Send it home', 'SEND IT HOME', 5, 4, 2,
          'Let’s put it in the bag 🎒 — and your hand-print sun goes on the fridge. What will you say to your family? … “This is my duck!” Say it with me!',
          'Puts the page away and repeats the sentence to take home.',
          'Say “this is my ___” one more time.',
          ['Where will the page live at home?', 'Who will you show it to?', 'Shall we do one more tomorrow?'],
          ['Write the family’s name on the page together.', 'Say the sentence on the way out.', 'Choose a place on the fridge together.'],
          'The page goes home with a sentence attached — that is the whole difference between a colouring page and an English lesson.',
        ),
      ],
      worksheet: [
        'Colour the big duck 🦆 yellow.',
        'Colour the cow 🐮 brown and draw one line to the grass 🌾.',
        'Draw one line from the duck to the water 💧.',
        'Draw one line from the cat 🐈 to the box 📦.',
        'Cut out the circle and stick it in the box (grown-up holds the scissors).',
        'One hand-print in the corner — a big yellow sun 🖐️.',
      ],
      scene: {
        title: 'The real table and the real crayon box',
        photoQuery: 'child colouring with crayons at a table',
        clipTitle: 'A real colouring song to sing while you colour 🖍️',
        clipUrl: 'https://www.youtube.com/results?search_query=colour+song+for+toddlers+crayons',
        listenFor: 'Every colour word in the song — the child holds up that crayon each time they hear it.',
      },
      mission: {
        title: 'One part a night, all week',
        realWorld: 'The same page comes back to the table every evening and the family does ONE part of it — colour tonight, match tomorrow, cut the night after. No screen, no translation, and the page stays on the fridge until every part is done.',
        sayIt: '“duck!” · “cow!” · “water!” · “cut! stick!” · “This is my duck.”',
        steps: ['Put the page on the fridge so it is the thing everybody walks past', 'One part a night — never the whole page at once', 'Say the task out loud before the crayon moves', 'Say the word every time a piece is finished: that is the English'],
      },
      run: {
        targetMinutes: 30,
        brainBreaks: [
          'Stand up, shake both hands like you are drying them, then sit back down. 🖍️',
          'Close your eyes and think of one animal on the page — then say it. 🦆',
          'Press both hands flat on the table and take three slow breaths. 🌙',
        ],
        exitTicket: [
          '“duck!” said while pointing at their own colouring',
          '“cut!” and “stick!” said during the sticky part',
          '“This is my ___.” finished about their own page',
        ],
        nextTime: 'Next time: the same page shape, but with the FARM animals 🐮🐖 — and one new word, “mud”.',
      },
      talkGoal: 29,
      media: SHEET_MEDIA.map((m) => ({ ...m })),
      sheet: {
        name: 'Colour, Match & Say',
        tasks: [
          { do: 'Colour the big duck yellow.', emoji: '🦆', paper: 'colour', say: 'Colour the duck yellow — big circles!', childSays: 'duck!' },
          { do: 'Colour the cow brown and draw one line to the grass.', emoji: '🐮', paper: 'colour', say: 'Brown for the cow. Then one line to the grass.', childSays: 'cow!' },
          { do: 'Draw one line from the duck to the water.', emoji: '💧', paper: 'draw one line', say: 'One line — duck to the water.', childSays: 'water!' },
          { do: 'Draw one line from the cat to the box.', emoji: '📦', paper: 'draw one line', say: 'Cat to the box. One line!', childSays: 'cat!' },
          { do: 'Cut out the circle and stick it in the box.', emoji: '✂️', paper: 'cut and stick', say: 'I hold the scissors. You say “cut!”', childSays: 'cut! stick!' },
          { do: 'One hand-print in the corner — a big yellow sun.', emoji: '🖐️', paper: 'finger-paint', say: 'Hand in the paint, then stamp the sun!', childSays: 'sun!' },
        ],
        traceWords: ['duck', 'cow'],
        talkFrame: 'This is my ___.',
      },
      caregiverNote: 'Trace the two big words with your child’s FINGER every night before bed — no pencil, no pressure, just the finger over the letters while you say the word. Then do one part of the page at the table and say the English word for each piece as it is finished. Never test and never translate: point at the duck and say “duck”, and wait. The words in this lesson are duck, cow, water and box, and four nights of saying them is enough for them to come back out of your child. 🖍️',
      teacherNote: 'Run sheet: SHOW THE PAGE 3 · TALK IT THROUGH 4 · COLOUR & MATCH 7 · CUT & STICK 5 · SAY IT OUT LOUD 6 · SEND IT HOME 5 — 29 spoken turns, and the page itself is the doing, so there is nothing to open and no screen in the lesson. Every phase has a floor: the child cannot finish this early, because the talking is not optional. The child reads and writes NOTHING: you read every task aloud.',
    };
  }
  return {
    title: 'The Pond Page',
    durationMinutes: 30,
    objectives: ['Match and circle pond words', 'Write three words in the boxes', 'Write and say two sentences of your own'],
    materials: ['One printed page per child', 'A pencil (no pen — they will fix things)', 'The answer key box, face down until part 4'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      phase(
        '1 · Look at the page', 'LOOK AT THE PAGE', 3, 3, 4,
        'This is your page — you are going to read some of it to me. 📄 Read the first task out loud. What is it asking you to do?',
        'Reads the first task aloud and says what it means before writing anything.',
        'Read the first task to me.',
        ['What is the page asking for first?', 'Which part looks easiest?', 'Which part will you check yourself?'],
        ['Read the whole page in one go.', 'Circle the words you already know.', 'Say which part you are looking forward to.'],
        'Reading the task aloud before writing is the whole 5-12 step — a child who has read the instruction owns it.',
      ),
      phase(
        '2 · Match & circle', 'MATCH & CIRCLE', 5, 4, 8,
        'Part 1. Read the word, then draw the line: duck… 🦆 pond… 💧 frog… 🐸 Now say each one before your pencil moves. Which two words start with /d/? Circle them: duck… dog. Say it: “duck and dog — both start with /d/.”',
        'Reads each word, says it, then draws the line or circles it.',
        'Say: “Duck — this one!”',
        ['Which picture is the pond?', 'How do you know it is the frog?', 'Which two words begin the same way?'],
        ['Cover the pictures and match from memory.', 'Say each word as a whisper, then normally.', 'Race yourself: three matches in a row.'],
        'Part 1 is recognition only — the child says every pairing out loud before the line is drawn, so the page is talkative from the first mark.',
      ),
      phase(
        '3 · Write the word', 'WRITE THE WORD', 6, 5, 8,
        'Part 2 — the boxes. Trace “pond” with your finger first… good. Now write it: p-o-n-d. Say it back to me: pond. Next one is harder: d _ c k. Sound it out.',
        'Traces, writes in the ruled boxes, then says each finished word aloud.',
        'Say the word after you write it: “p-o-n-d, pond.”',
        ['Which letters are missing?', 'How many sounds are in “swim”?', 'Which word was easiest to write?'],
        ['Write it in the air first.', 'Clap the sounds before writing.', 'Write one word twice — the second one always better.'],
        'Trace, write, then SAY it. The saying is what turns the boxes from handwriting practice into vocabulary the child owns.',
      ),
      phase(
        '4 · Your two sentences', 'YOUR TWO SENTENCES', 7, 6, 11,
        'Part 3 is yours — and there is no wrong answer here. Finish these two: “In my pond there is ___.” and “The duck ___ in my pond.” Then read them to me. Who is in YOUR pond?',
        'Writes two sentences about their own life and reads them aloud.',
        'Say: “In my pond there is ___.”',
        ['What is really in your pond?', 'What does your duck do all day?', 'Who would you show this page to?'],
        ['Say the sentence first, then write it.', 'Add one more sentence if it is easy.', 'Make the second sentence funny on purpose.'],
        'Two sentences about the child’s own pond is where the writing stops being an exercise — and both are read aloud, so the page ends in speech.',
      ),
      phase(
        '5 · Check it yourself', 'CHECK IT YOURSELF', 5, 4, 7,
        'Now the key — face down, turn it over! ✅ Mark parts 1 and 2 yourself. What did you get? … “I got duck and pond — I fixed swim.” Nobody marks part 3: whatever you wrote there is right.',
        'Marks their own answers against the key and says what they got and what they will fix.',
        'Say what you got: “I got ___, and I fixed ___.”',
        ['Which one did you fix?', 'Was part 2 easier than you thought?', 'How do you feel about part 3?'],
        ['Say the fix out loud, then do it again in the margin.', 'Give yourself a tick and a star.', 'Say the sentence you are proudest of.'],
        'The child marks their own work and says it aloud. That sentence — “I got duck and pond, I fixed swim” — is the most advanced English on the whole page.',
      ),
      phase(
        '6 · Send it home', 'SEND IT HOME', 4, 3, 2,
        'The page goes home tonight, and one part comes back finished for next lesson. 🎒 Read me your two sentences one last time, then tell your family which part you are doing first.',
        'Reads their sentences again and says which part they will finish at home.',
        'Say: “I will finish part ___ at home.”',
        ['Which part will you do first at home?', 'Where will you keep the page?', 'What will you say to your family about it?'],
        ['Read both sentences in a robot voice.', 'Choose the part you like best to do first.', 'Write your name and the date at the top.'],
        'The page leaves with a plan the child said out loud — page and sentence travel together, which is what makes it come back finished.',
      ),
    ],
    worksheet: [
      'Part 1 · Match: duck 🦆 · pond 💧 · frog 🐸 — draw one line to each picture.',
      'Part 1 · Circle the two words that start with /d/: duck · pond · dog.',
      'Part 2 · Complete: p _ n d  ·  d _ c k  ·  s w _ m (ruled boxes).',
      'Part 3 · Finish: “In my pond there is ___.”',
      'Part 3 · Finish: “The duck ___ in my pond.”',
      'Part 3 · One more sentence of your own about your pond.',
      '🔑 Answer key — part 1: duck 🦆 · pond 💧 · frog 🐸 (and duck + dog for the /d/ circle). Part 2: p-o-n-d · d-u-c-k · s-w-i-m. Part 3 has no key: any sentence with a pond word is right.',
    ],
    homework: ['Finish one part of the page tonight and say every answer out loud as you write it. 10 XP.', 'Read your two sentences to someone at home before the next lesson. 10 XP.'],
    scene: {
      title: 'The real kitchen table where the page gets done',
      photoQuery: 'child writing homework at kitchen table',
      clipTitle: 'A real clip of how we hold the pencil ✏️',
      clipUrl: 'https://www.youtube.com/results?search_query=how+to+hold+a+pencil+for+kids',
      listenFor: 'The way the pencil sits in the hand — the child copies the grip, not the speed.',
    },
    mission: {
      title: 'The page comes back finished — one part a night',
      realWorld: 'Part 1 goes home the first night, part 2 the second, the two sentences the third. Every answer is said out loud while it is written, and before the next lesson the child marks parts 1 and 2 against the key and says what they fixed.',
      sayIt: '“p-o-n-d, pond.” · “In my pond there is a frog.” · “I got duck and pond — I fixed swim.”',
      steps: ['One part a night at the same table — never the whole page at once', 'Say every answer out loud as it is written', 'Turn the key over only after part 3 is finished', 'Bring the page back and read the two sentences out'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Write your name in the air with your elbow, then put the pencil down. ✏️',
        'Shake out both hands for ten seconds and roll your shoulders. 🖐️',
        'Close your eyes and picture your pond — then do the next part. 💧',
      ],
      exitTicket: [
        'part 1 matched and said out loud',
        '“p-o-n-d, pond.” said after writing it',
        '“In my pond there is ___.” — a sentence about their own pond',
      ],
      nextTime: 'Next time: the same page shape, but a page about their OWN room 🛏️ — and the child writes the questions this time.',
    },
    talkGoal: 40,
    media: SHEET_MEDIA_Y.map((m) => ({ ...m })),
    sheet: {
      name: 'The Pond Page',
      tasks: [
        { do: 'Match each word to its picture: duck · pond · frog.', emoji: '🔤', paper: 'draw one line', say: 'Read the word, then draw the line to the picture.', childSays: 'Duck — this one!' },
        { do: 'Circle the two words that start with /d/: duck · pond · dog.', emoji: '⭕', paper: 'circle', say: 'Say each word, then circle the ones with /d/.', childSays: 'duck and dog — they both start with /d/.' },
        { do: 'Write the missing letters: p _ n d.', emoji: '✏️', paper: 'ruled boxes', boxes: 4, say: 'Sound it out, then write it in the boxes.', childSays: 'p-o-n-d, pond.' },
        { do: 'Write the missing letters: d _ c k.', emoji: '✏️', paper: 'ruled boxes', boxes: 4, say: 'This one has a surprise in the middle. Sound it out.', childSays: 'd-u-c-k — duck!' },
        { do: 'Write the whole word under its picture: swim.', emoji: '🏊', paper: 'ruled boxes', boxes: 4, say: 'No letters to help this time. Say it, then write it.', childSays: 's-w-i-m, swim.' },
        { do: 'Finish: “In my pond there is ___.”', emoji: '💧', paper: 'ruled boxes', boxes: 4, say: 'There is no wrong answer here — what is really in your pond?', childSays: 'In my pond there is a frog.' },
        { do: 'Finish: “The duck ___ in my pond.”', emoji: '🦆', paper: 'ruled boxes', boxes: 4, say: 'What does your duck do all day?', childSays: 'The duck swims in my pond.' },
        { do: 'Write one more sentence of your own about your pond.', emoji: '✍️', paper: 'ruled boxes', boxes: 4, say: 'One more, your own idea — then read it to me.', childSays: 'My pond is cold in the morning.' },
      ],
      traceWords: ['pond', 'duck', 'swim'],
      talkFrame: 'In my pond there is ___.',
      answerKey: [
        'Part 1: duck 🦆 · pond 💧 · frog 🐸 — the line goes to the matching picture.',
        'Part 1: the /d/ words are DUCK and DOG (pond has no /d/).',
        'Part 2: p-o-n-d · d-u-c-k · s-w-i-m.',
        'Part 3: no key — any sentence with a pond word is right.',
      ],
    },
    caregiverNote: 'Sit BESIDE your child, never opposite: the page is theirs and the pencil stays in their hand. Say each task out loud once, then wait — you are allowed to say the word and let them find the letters, but not to say the letters for them. Mark parts 1 and 2 together with the key and let your child do the ticking; never mark part 3 as wrong, because there is nothing wrong to write there. Every answer gets said out loud while it is written, so the page comes back with a voice attached to it. ✏️',
    teacherNote: 'Run sheet: LOOK AT THE PAGE 3 · MATCH & CIRCLE 5 · WRITE THE WORD 6 · YOUR TWO SENTENCES 7 · CHECK IT YOURSELF 5 · SEND IT HOME 4 — 40 spoken turns. The page is the doing, so nothing opens and there is no screen in the lesson: the run sheet printed on the sheet is what keeps it thirty minutes instead of eight. Part 3 must never be marked — the self-check covers parts 1 and 2 only.',
  };
}

/* ── Homework Quest: a week of jobs with XP, launched by a 30-minute quest night ── */

/** The little one's quest words: the house is the vocabulary. */
const VY_QUEST_WORDS: KidLessonWord[] = [
  { word: 'blue', emoji: '💙', sayAloud: 'blue', meaning: 'a colour', example: 'Find something blue!' },
  { word: 'sock', emoji: '🧦', sayAloud: 'sock', meaning: 'it goes on your foot', example: 'Two socks — they match!' },
  { word: 'cup', emoji: '🥤', sayAloud: 'cup', meaning: 'we drink from it', example: 'Bring your cup.' },
  { word: 'duck', emoji: '🦆', sayAloud: 'quack quack', meaning: 'a bird in the water', example: 'Wash the duck!' },
  { word: 'bath', emoji: '🛁', sayAloud: 'bath', meaning: 'wash time', example: 'The duck is in the bath.' },
  { word: 'night-night', emoji: '🌙', sayAloud: 'night-night', meaning: 'time to sleep', example: 'Night-night, sheep!' },
];

/** The little one's quest: the whole house gets asked for something blue, and nothing needs a screen. */
const QUEST_MEDIA: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A real tidy-up song to play while the jobs get done 🎵',
    url: search('https://www.youtube.com/results?search_query=', 'tidy up song for toddlers'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'tidy up song for toddlers'),
    where: 'both',
    forStep: 'Brief the quest',
    why: 'Play it once while the board is being read — the jobs and the song are the same idea: things go back where they live.',
    source: 'Super Simple Songs',
    embeddable: false,
  },
  {
    kind: 'picture',
    title: 'A real photo of a fridge door covered in a child’s pictures 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'child drawings magnets fridge door', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'child drawings magnets fridge door', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Set up the week',
    why: 'This is where the quest board is going — the child should see the real door on the day the board is set up.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'audio',
    title: 'A real little bell to ring when a job is finished 🔔',
    url: 'https://freesound.org/search/?q=small+bell+ding',
    searchUrl: 'https://freesound.org/search/?q=small+bell+ding',
    where: 'class',
    forStep: 'XP & proof',
    why: 'One ring per finished job — the sound is the tick, and it is the child’s hand on the bell.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'activity',
    title: 'A free colour game the family can tap at home 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'colours matching kids'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'colours matching kids'),
    where: 'home',
    forStep: 'At home',
    why: 'Free, no logins — one five-minute game for the night the child needs a win.',
    source: 'Wordwall',
    embeddable: true,
  },
];

/** The reader's quest: the child runs the board, writes the proof, and interviews a grown-up in English. */
const QUEST_MEDIA_Y: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A real clip of a child doing a chore and asking what is next 🎬',
    url: search('https://www.youtube.com/results?search_query=', 'kids helping at home chores'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'kids helping at home chores'),
    where: 'both',
    forStep: 'Job one, out loud',
    why: 'Under a minute of a real child doing a real job — the self-check “did I do it like that?” is the point.',
    source: 'YouTube',
    embeddable: false,
  },
  {
    kind: 'picture',
    title: 'A real photo of a family board on the kitchen wall 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'family chore chart kitchen wall', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'family chore chart kitchen wall', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Set up the week',
    why: 'A board that lives on a real wall, so the child sees the week the way the family will.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'audio',
    title: 'A real pencil ticking a box on paper 🔊',
    url: 'https://freesound.org/search/?q=pencil+ticking+paper',
    searchUrl: 'https://freesound.org/search/?q=pencil+ticking+paper',
    where: 'class',
    forStep: 'XP & proof',
    why: 'The sound of the tally being marked — the XP is the child’s to write, and this is the noise of it landing.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'activity',
    title: 'A free question-words game for the interview job 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'question words english'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'question words english'),
    where: 'home',
    forStep: 'At home',
    why: 'The interview job needs “what” and “who” ready — five minutes here makes the question come out whole.',
    source: 'Wordwall',
    embeddable: true,
  },
];

/**
 * Map homeworkQuestDemo: two genuinely different boards, both of them a 30-minute quest night.
 *
 * The board is the lesson, so the demo has to prove the two things a homework list normally
 * gets wrong: every job carries a line to SAY (the child never works in silence) and a way to
 * prove itself (a job nobody can see is a job that quietly does not happen). The little ones
 * get jobs the whole house can play without a screen; the readers get the board itself to run,
 * an interview to write down, and a whole week to read back out loud.
 */
function homeworkQuestDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'The Blue Finder',
      durationMinutes: 30,
      objectives: ['Find and bring things at home', 'Say one word with every job', 'Do one job a night, all week'],
      materials: ['The quest board (this printed sheet)', 'A fridge door and a magnet to hold it', 'Nothing else — no screen, no device'],
      words: VY_QUEST_WORDS.map((w) => ({ ...w })),
      steps: [
        phase(
          '1 · Brief the quest', 'BRIEF THE QUEST', 3, 3, 4,
          'Look at our quest board! 🏠 Six jobs, all of them in the house. Listen: find something blue… find two socks… give the duck a bath… sing in the bath… put the animals to bed… show the family! Which one sounds the silliest?',
          'Looks at the board and names the job that sounds best.',
          'Say “blue!”',
          ['Which job is your favourite?', 'Who does the quest with you?', 'Which job is the silliest?'],
          ['Point at each picture on the board as you say the job.', 'Let the child quack like the duck.', 'Say the jobs in a whisper, then loudly.'],
          'A quest nobody has heard is a quest nobody does — every job is named out loud before anything starts.',
        ),
        phase(
          '2 · Pick the order', 'PICK THE ORDER', 4, 4, 4,
          'Which job is first? It is YOUR quest — you say! 💙 Touch the one you want to start with. Say it with me: “this one!”',
          'Chooses a job by pointing at the board and says its word.',
          'Say “this one!”',
          ['Which one first?', 'Which one is for tomorrow?', 'Which one will be the best?'],
          ['Draw a star next to the chosen job.', 'Let the child pick the pet to be the helper.', 'Say the chosen job’s word three times.'],
          'Choosing the order is the small piece of ownership that turns a task list into something the child runs.',
        ),
        phase(
          '3 · Job one, out loud', 'JOB ONE, OUT LOUD', 7, 6, 8,
          'Find me something blue! 💙 Is that blue? Say it: “blue!” Now bring it here — “Blue! Here it is!” Good work! ⭐',
          'Finds something blue, brings it to the grown-up and says the line.',
          'Say “Blue! Here it is!”',
          ['Is this one blue or red?', 'What else is blue?', 'Who will you show it to?'],
          ['Find something else blue and say it again.', 'Put every blue thing in one pile.', 'Hide the blue thing and find it again.'],
          'The job is done in the room, not described — the doing is the lesson, and the word comes out with it.',
        ),
        phase(
          '4 · XP & proof', 'XP & PROOF', 6, 5, 6,
          'How many XP? Ten! ⭐ Count them with me: one, two, three… ten! Now YOU colour the first star on the tally. Ring the bell! 🔔 Done!',
          'Counts the XP with the grown-up, marks one star and rings the bell.',
          'Say “ten XP!”',
          ['How many stars so far?', 'What do we do with the star?', 'Who is the quest for?'],
          ['Count the stars together in a silly voice.', 'Let the child hold the pencil alone.', 'Clap once for every star.'],
          'XP is counted out loud and marked by the child — the tally is the only score in this kind, and it is never a mark for right or wrong.',
        ),
        phase(
          '5 · Show the house', 'SHOW THE HOUSE', 6, 5, 5,
          'Let’s show everyone! 🎉 Where is your blue thing? Say it loud: “Look! Blue!” … Your turn! Everybody clap!',
          'Shows the thing to another person in the house and says the line again.',
          'Say “Look! Blue!”',
          ['Who shall we show first?', 'What will you say to them?', 'Did they clap?'],
          ['Show the pet or a teddy if nobody else is home.', 'Say the line from the doorway.', 'Whisper it, then shout it.'],
          'The same word, said to a new person, is the difference between a task and something the child is proud of.',
        ),
        phase(
          '6 · Set up the week', 'SET UP THE WEEK', 4, 4, 2,
          'The board goes on the fridge! 🧲 Which night is the bath job? … Tonight! And what does the week add up to? If every star is coloured — YOU choose the bedtime story!',
          'Helps stick the board on the fridge and names the night of the next job.',
          'Say “see you tomorrow, duck!”',
          ['Where does the board live?', 'What happens when all the stars are coloured?', 'Who reads the board with you?'],
          ['Put the magnet on together.', 'Say goodnight to the duck.', 'Choose the reward-night story now.'],
          'The board on the fridge is what makes it a week — the session ends where the family walks past it every day.',
        ),
      ],
      worksheet: [
        '💙 Bring something blue to a grown-up. ⭐ 10 XP',
        '🧦 Find two socks that match. ⭐ 10 XP',
        '🦆 Give the duck a bath — say “wash!” ⭐ 10 XP',
        '🛁 Sing the duck song at bath time. ⭐ 10 XP',
        '🌙 Put the animals to bed — “night-night!” ⭐ 10 XP',
        '👋 Show the family what you found. ⭐ 20 XP',
      ],
      homework: [
        'ONE job a night with a grown-up — never more, and never at bedtime if the child is tired.',
        'The child colours the star after every job; a grown-up holds nothing.',
        'When every star is coloured, the child chooses the bedtime story for three nights.',
      ],
      scene: {
        title: 'The real fridge door where the week lives',
        photoQuery: 'child drawings magnets fridge door',
        clipTitle: 'A real tidy-up song to play while the jobs get done 🎵',
        clipUrl: 'https://www.youtube.com/results?search_query=tidy+up+song+for+toddlers',
        listenFor: 'Every “put it back” line in the song — the child copies the action, not the words.',
      },
      mission: {
        title: 'The whole house plays the blue game',
        realWorld: 'The quest board lives on the fridge for a week and the house plays along: the postman gets shown the blue thing, the grandparents get the sock pair, the pet is the witness. One job a night, no screen, and the tally is the child’s own marks.',
        sayIt: '“Blue! Here it is!” · “wash!” · “night-night, sheep!” · “Look! Blue!”',
        steps: ['Put the board on the fridge the same minute the quest night ends', 'One job a night — the child picks which', 'Ring the bell for every finished job', 'When the stars are all coloured, the reward is said out loud'],
      },
      run: {
        targetMinutes: 30,
        brainBreaks: [
          'Shake both hands like wet paws, then freeze. 🐾',
          'Find the bluest thing in the room with your eyes only. 💙',
          'Stand up, stretch tall like a giraffe, then sit back down. 🦒',
        ],
        exitTicket: [
          '“Blue! Here it is!” said with the blue thing in hand',
          '10 XP counted out loud and the first star coloured',
          'the next job named for tomorrow night',
        ],
        nextTime: 'Next time: the same board, but the colour changes to RED ❤️ — and the child picks the colour.',
      },
      talkGoal: 29,
      media: QUEST_MEDIA.map((m) => ({ ...m })),
      quest: {
        name: 'The Blue Finder',
        partner: 'a grown-up — or the pet, if the pet is closer',
        jobs: [
          { do: 'Bring something blue to a grown-up.', emoji: '💙', night: 'night one', xp: 10, say: 'Find me something blue!', childSays: 'Blue! Here it is!', proof: 'said aloud — the grown-up hears it' },
          { do: 'Find two socks that match.', emoji: '🧦', night: 'night one', xp: 10, say: 'Two socks! Find their friends.', childSays: 'socks!', proof: 'the grown-up sees the pair' },
          { do: 'Give the duck a bath in a bowl.', emoji: '🦆', night: 'night two', xp: 10, say: 'The duck is dirty! Wash, wash, wash!', childSays: 'wash!', proof: 'a photo of the wet duck' },
          { do: 'Sing the duck song at bath time.', emoji: '🛁', night: 'night two', xp: 10, say: 'Sing with me — quack, quack!', childSays: 'quack quack!', proof: 'the grown-up sings it back' },
          { do: 'Put the animals to bed.', emoji: '🌙', night: 'night three', xp: 10, say: 'Night-night, duck! Night-night, sheep!', childSays: 'night-night!', proof: 'said aloud at bedtime' },
          { do: 'Show the family what you found.', emoji: '👋', night: 'all week', xp: 20, say: 'Show Grandma your blue thing!', childSays: 'Look! Blue!', proof: 'the family sees it and claps' },
        ],
        tally: 'colour one star for every finished job — the child holds the pencil',
        reward: 'when all six stars are coloured, the child chooses the bedtime story, three nights in a row',
      },
      caregiverNote: 'Do ONE job a night, at the same time of day, and let the child choose which one — the choosing is half of why it gets done. Say the line from the board exactly as it is printed, then WAIT: a two-year-old needs the silence to answer in. The child colours the star alone with the pencil in their own hand, even if it goes over the edge, and nothing is ever marked as wrong — the tally counts finished jobs, not correct ones. If a night is missed, the star is coloured the next day and nobody mentions it. The board stays on the fridge until every star is done, and the reward is something the child already owns: a story, a song, a walk. 🏠',
      teacherNote: 'Run sheet: BRIEF THE QUEST 3 · PICK THE ORDER 4 · JOB ONE, OUT LOUD 7 · XP & PROOF 6 · SHOW THE HOUSE 6 · SET UP THE WEEK 4 — 29 spoken turns, and the board is the doing, so there is nothing to open and no screen in the lesson. Job one really happens in the room: it is done, not described. The child reads and writes NOTHING — the grown-up reads every job — and the only mark in the whole week is a star the child colours alone.',
    };
  }
  return {
    title: 'The Pond Week',
    durationMinutes: 30,
    objectives: ['Run the quest board yourself', 'Write, say and interview for XP', 'Read the whole week back out loud'],
    materials: ['The quest board (this printed sheet)', 'A pencil and the fridge door', 'A grown-up to be interviewed'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      phase(
        '1 · Brief the board', 'BRIEF THE BOARD', 3, 3, 5,
        'This week is a quest, and YOU run the board. 🏠 Read the first job out loud — what is it asking you to do? Six jobs, 120 XP, and one of them is an interview.',
        'Reads the first job aloud and says what it means before anything starts.',
        'Read the first job to me.',
        ['How many jobs are there?', 'Which job earns the most XP?', 'What do you have to write down?'],
        ['Read the whole board in one go.', 'Circle the job you are looking forward to.', 'Say which job looks hardest.'],
        'Reading the board before the week starts is the 5-12 upgrade — a child who has read the job owns it.',
      ),
      phase(
        '2 · Claim the order', 'CLAIM THE ORDER', 4, 4, 6,
        'Which job is first? You choose — and say WHY. “I want the writing first because…” Then write your order on the board.',
        'Chooses the order of the week, says why, and writes it on the board.',
        'Say “I want ___ first because ___.”',
        ['Which job goes first?', 'Which one is for the weekend?', 'Which two jobs can go on one night?'],
        ['Race the order: hardest job first.', 'Put the interview on the night grandma visits.', 'Say the order back to a grown-up.'],
        'Choosing and justifying the order is real English — and it is the first piece of running the board.',
      ),
      phase(
        '3 · Job one, out loud', 'JOB ONE, OUT LOUD', 7, 6, 10,
        'Job one — the writing. Four sentences about your pond picture, then read them to me. ✍️ Say each one out loud BEFORE the pencil moves: “In my pond there is a frog.”',
        'Says each sentence aloud, writes it, then reads all four back.',
        'Say “In my pond there is ___.”',
        ['What is really in your pond?', 'Which sentence is your best?', 'What does the frog do all day?'],
        ['Say the sentence, then write it — never the other way round.', 'Add one funny sentence on purpose.', 'Read the four sentences in a robot voice.'],
        'The job is done in the lesson — the child leaves already knowing how it feels to finish one, which is what makes the other five believable.',
      ),
      phase(
        '4 · XP & proof', 'XP & PROOF', 6, 5, 8,
        'How much is job one worth? Twenty! ⭐ Write 20 in the box and colour the first square. Now the proof — the paper goes back to me, so write “bring the paper”. Read me what you wrote.',
        'Writes the XP in the box, colours the tally and writes the proof line in their own words.',
        'Say “I got 20 XP — my proof is ___.”',
        ['How many XP is the whole week worth?', 'Which job has the best proof?', 'Who checks the tally with you?'],
        ['Add up the XP so far out loud.', 'Let the child write the proof in bubble letters.', 'Count the tally in a whisper, then loudly.'],
        'The child writes the XP and the proof line — the two things that make the board theirs instead of a note from the tutor.',
      ),
      phase(
        '5 · Show the house', 'SHOW THE HOUSE', 6, 5, 8,
        'Show what you did and say it again — to somebody who was not in this room. 🎉 Who will you show? What will you say? Then read one sentence from your page.',
        'Shows the finished work to another person and reads one of their sentences aloud.',
        'Say “Look — four sentences about my pond. The frog ___.”',
        ['Who shall we find?', 'Which sentence will you read?', 'What will you say before you read?'],
        ['Read the best sentence to the pet first.', 'Practise the introduction once.', 'Ask the person a question at the end.'],
        'Showing the work to a second person is the cheapest audience the child will ever get — and the reason the page comes back finished.',
      ),
      phase(
        '6 · Plan the week', 'PLAN THE WEEK', 4, 4, 3,
        'The rest of the week goes on the fridge. 🧲 Which night is the interview? Write it on the board — and read me the reward you chose: what does a 120-XP week add up to?',
        'Writes the nights on the board, puts it on the fridge and reads the reward line out loud.',
        'Say “the interview is on ___ night.”',
        ['Which night do you run the interview?', 'Where does the board live?', 'Who will see the board every day?'],
        ['Write the nights in order down the side.', 'Choose the reward together now.', 'Say the whole plan in one breath.'],
        'The week leaves the room with a place to live and a plan the child read out — that is what makes it happen.',
      ),
    ],
    worksheet: [
      '✍️ Write four sentences about your pond picture. ⭐ 20 XP',
      '🗣 Tell the pond story at home in three sentences. ⭐ 20 XP',
      '🎤 Interview a grown-up: ask their favourite pond animal, write the answer. ⭐ 25 XP',
      '🔤 Write the three pond words that still trick you, twice each. ⭐ 15 XP',
      '🎲 Play the pond game with your family — explain the rules first. ⭐ 15 XP',
      '🧾 Read your whole week back to the family. ⭐ 25 XP',
    ],
    homework: [
      'ONE job a night and the child chooses which — the nights are written on the board.',
      'The interview is written in the child’s own hand: the question and the answer.',
      'Nothing is ever marked as wrong — the child writes the XP and colours the tally alone.',
    ],
    scene: {
      title: 'The real homework corner at the kitchen table',
      photoQuery: 'child writing homework at kitchen table',
      clipTitle: 'A real clip of a child doing a job and asking what is next 🎬',
      clipUrl: 'https://www.youtube.com/results?search_query=kids+helping+at+home+chores',
      listenFor: 'How the child in the clip checks their own work — that check is the habit this board is for.',
    },
    mission: {
      title: 'You run the board — all week',
      realWorld: 'The board lives on the fridge and the child is the one who runs it: reading each job aloud before it starts, choosing the order, writing the XP and the proof line, and marking the tally alone. The interview job is done with a real grown-up who has no idea what is coming.',
      sayIt: '“I read every job out loud, choose the order, give the XP and write the proof.” · “What is your favourite pond animal?”',
      steps: ['One job a night — the child reads it aloud first', 'Write the XP and the proof in the boxes before the pencil comes down', 'The interview happens early so it is not the last thing left', 'Read the whole board back to the family on the last night'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Write your name in the air with your elbow, then put the pencil down. ✏️',
        'Shake out both hands for ten seconds and roll your shoulders. 🖐️',
        'Close your eyes and picture the pond — then say one pond word out loud. 💧',
      ],
      exitTicket: [
        'four sentences written and the best one read aloud',
        '“I got 20 XP — my proof is ___.” said with the box filled in',
        'the interview night written on the board',
      ],
      nextTime: 'Next time: the same board, but every job is chosen by the CHILD from a menu — and the interview is recorded on paper as a quote. 🎤',
    },
    talkGoal: 40,
    media: QUEST_MEDIA_Y.map((m) => ({ ...m })),
    quest: {
      name: 'The Pond Week',
      partner: 'a grown-up — and the pet may be the witness',
      jobs: [
        { do: 'Write four sentences about your pond picture.', emoji: '✍️', night: 'night one', xp: 20, say: 'Four sentences about your pond — then read them to me.', childSays: 'In my pond there is a frog.', proof: 'the paper comes back' },
        { do: 'Tell the pond story at home in three sentences.', emoji: '🗣', night: 'night one', xp: 20, say: 'Tell me the story — three sentences, no book.', childSays: 'The frog jumped into the water.', proof: 'a grown-up’s initials' },
        { do: 'Interview a grown-up: ask their favourite pond animal and write the answer.', emoji: '🎤', night: 'night two', xp: 25, say: 'You are the reporter — ask me in English.', childSays: 'What is your favourite pond animal?', proof: 'the written answer in your own hand' },
        { do: 'Write the three pond words that still trick you, twice each.', emoji: '🔤', night: 'night two', xp: 15, say: 'Which three words still trick you?', childSays: 'splash — s-p-l-a-s-h.', proof: 'the words on the page' },
        { do: 'Play the pond game with your family — explain the rules first.', emoji: '🎲', night: 'night three', xp: 15, say: 'Explain the game before you play it.', childSays: 'You drag the word to the pond!', proof: 'a grown-up’s initials' },
        { do: 'Read your whole week back to the family.', emoji: '🧾', night: 'all week', xp: 25, say: 'Read me the whole board — every job and every XP.', childSays: 'I did six jobs — 120 XP!', proof: 'said aloud at the end' },
      ],
      tally: 'colour one box for every finished job and write the XP beside it — one line per night',
      reward: 'the family picks the Saturday afternoon together, and the child chooses first',
      master: 'I read every job aloud, choose the order, give myself the XP and write the proof — the board is mine.',
    },
    caregiverNote: 'Sit BESIDE your child for the writing nights, never opposite, and let the pencil stay in their hand — you may say the word, but never the letters. The child reads each job aloud before it starts and writes the XP and the proof line themselves, even when the spelling wobbles; that wobble is the proof it is their board, not yours. The interview job is the one that needs you most: answer the question properly, in English, and let them write your answer down word for word — then ask them to read it back. Nothing is ever marked as wrong. The tally counts finished jobs, not correct ones, and the child counts it. 🏠',
    teacherNote: 'Run sheet: BRIEF THE BOARD 3 · CLAIM THE ORDER 4 · JOB ONE, OUT LOUD 7 · XP & PROOF 6 · SHOW THE HOUSE 6 · PLAN THE WEEK 4 — 40 spoken turns. The board is the doing, so nothing opens and there is no screen in the lesson: job one really gets done in the room, and the run sheet printed on the sheet is what keeps the night at thirty minutes. The child runs everything — reads the jobs, chooses the order, writes the XP and the proof — and the only score in the week is the tally the child marks alone.',
  };
}

/* ── Picture Quiz: the questions, plus the quiz night that makes them talk ───── */

/** The little one's quiz night: the questions are pictures, and the child rings a bell. */
const QUIZ_MEDIA: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A real quiz-show clip with a bell 🔔',
    url: search('https://www.youtube.com/results?search_query=', 'kids quiz show bell'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'kids quiz show bell'),
    where: 'both',
    forStep: 'The quiz',
    why: 'Thirty seconds of a real quiz before the questions start — the child copies the bell and the cheering, not the words.',
    source: 'YouTube',
    embeddable: false,
  },
  {
    kind: 'picture',
    title: 'A real photo of a family playing a quiz at home 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'family playing quiz at home', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'family playing quiz at home', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Picture round',
    why: 'The real thing the mission is: people at a table, asking each other questions.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'audio',
    title: 'A real little bell to ding on every right answer 🔔',
    url: 'https://freesound.org/search/?q=small+bell+ding',
    searchUrl: 'https://freesound.org/search/?q=small+bell+ding',
    where: 'class',
    forStep: 'The quiz',
    why: 'One ding per right answer, and a clap for every try — the child’s hand is on the bell, so the score is something they do.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'activity',
    title: 'A free picture quiz the family can tap 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'picture quiz animals kids'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'picture quiz animals kids'),
    where: 'home',
    forStep: 'At home',
    why: 'Free, no logins — three questions a night at the table, with the real pictures.',
    source: 'Wordwall',
    embeddable: true,
  },
];

/** The reader's quiz night: real photographs, whole sentences, and the child's own final round. */
const QUIZ_MEDIA_Y: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A real clip of how a quizmaster reads a question 🎬',
    url: search('https://www.youtube.com/results?search_query=', 'quiz show host reads question'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'quiz show host reads question'),
    where: 'both',
    forStep: 'The quiz',
    why: 'Watch how the question is read BEFORE anyone answers — that is exactly the child’s job in the last round.',
    source: 'YouTube',
    embeddable: false,
  },
  {
    kind: 'picture',
    title: 'A real photograph of the pond the questions are about 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'pond with ducks photograph', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'pond with ducks photograph', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Picture round',
    why: 'Every question in the picture round is about a real photograph — the answer should be findable in the picture itself.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'audio',
    title: 'A real bell for the score the child keeps 🔊',
    url: 'https://freesound.org/search/?q=small+bell+ding',
    searchUrl: 'https://freesound.org/search/?q=small+bell+ding',
    where: 'class',
    forStep: 'Score & cheer',
    why: 'The child rings it and says the score line — counting out loud is English, and the bell makes it a job.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'activity',
    title: 'A free question-words quiz for the interview round 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'question words english quiz'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'question words english quiz'),
    where: 'home',
    forStep: 'At home',
    why: '“What”, “where”, “who” — five minutes here makes the child’s own questions come out whole.',
    source: 'Wordwall',
    embeddable: true,
  },
];

/**
 * Map pictureQuizDemo: two genuinely different quiz nights, both thirty minutes.
 *
 * The quizzes differ the way the bands differ — the little ones get picture answers,
 * no text and a bell; the readers get four options, whole sentences to say and a final
 * round they run themselves. Both are built so the ENGINE talks: every question's
 * “Yes!” prints the sentence the child says, and the night's six phases put the rest
 * of the talk around it.
 */
function pictureQuizDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'Which One Is It?',
      durationMinutes: 30,
      objectives: ['Point at the right picture', 'Say the word with every answer', 'Ask a question of your own'],
      materials: ['Six big questions on screen', 'A little bell (or a spoon and a cup)', 'One real photo per question'],
      words: VY_ANIMALS.map((w) => ({ ...w })),
      steps: [
        phase(
          '1 · Warm-up questions', 'WARM-UP QUESTIONS', 3, 3, 4,
          'Two easy ones first! 🦆 Which one is the duck? … Yes! Say it: “duck!” Now — which one is the cow? Say it: “cow!”',
          'Points at the picture and says the word.',
          'Say “duck!”',
          ['Which one is the duck?', 'Which one says moo?', 'Which one is your favourite?'],
          ['Let the child point before they say it.', 'Whisper the word first, then say it loudly.', 'Cheer every try, right or not.'],
          'Two questions the child cannot get wrong — the night starts with a win, and the first words are said before any teaching.',
        ),
        phase(
          '2 · Picture round', 'PICTURE ROUND', 5, 4, 5,
          'Look — a REAL photo! 📷 What can you see? … A duck! Where are its feet? … Under the water! Now the question: which one is the duck?',
          'Looks at the real photo, says what they can see, then answers the question.',
          'Say “a duck!”',
          ['What can you see in the photo?', 'Where are its feet?', 'Is it in the water or on the grass?'],
          ['Point at the real photo on the wall or the screen.', 'Say “I can see…” and let the child finish.', 'Name one more thing in the photo.'],
          'The picture comes BEFORE the question: a child who has looked at the real thing answers in words instead of guessing.',
        ),
        {
          ...phase(
            '3 · The quiz', 'THE QUIZ', 7, 6, 9,
            'Time for the quiz! 🔔 Read the question with me: which one is the duck? … Say it: “duck!” Ring the bell! Ding! 🎉',
            'Answers each question, says the word out loud, and rings the bell.',
            'Say “duck!”',
            ['Which one is the duck?', 'Which one is the cat?', 'Which one is the biggest?'],
            ['Ring the bell for every answer.', 'Give the child the pointer or the laser.', 'Do one question with eyes closed — they still know it.'],
            'The quiz itself, and the engine prints the same word inside its “Yes!” — a right tap is a spoken turn, not a tap.',
          ),
          /* The ONE phase that opens the engine: the picture quiz lives inside the run
             sheet instead of swallowing the whole session. */
          drill: true,
        },
        phase(
          '4 · Say it back', 'SAY IT BACK', 6, 5, 6,
          'Round two! You say the word first, then I say the whole thing: “The duck is in the water.” Your turn: “in the water!”',
          'Says the word again, then joins in on the last chunk of the sentence.',
          'Say “in the water!”',
          ['Who is in the water?', 'What does the duck say?', 'Can you say the whole thing with me?'],
          ['Say the sentence in a duck voice.', 'Let the child be the teacher and ask you.', 'Say it as a whisper, then a shout.'],
          'The second pass is where the sentence arrives: the child says the chunk they can hold, and hears the whole sentence around it.',
        ),
        phase(
          '5 · The child asks', 'THE CHILD ASKS', 5, 4, 3,
          'Now YOU ask me! 🎤 Say “which one?” and I will try to answer. … Wrong! You say: “no, the duck!” Your turn again!',
          'Asks “which one?”, hears the grown-up’s answer, and corrects it.',
          'Say “which one?”',
          ['Which one shall I choose?', 'Am I right or wrong?', 'What shall I choose next?'],
          ['Answer wrongly on purpose — the child loves correcting you.', 'Let the child hold the bell and be the quizmaster.', 'Ask about a toy or a pet next.'],
          'The child asks a question in English for the first time — one question word, but the whole turn is theirs.',
        ),
        phase(
          '6 · Score & cheer', 'SCORE & CHEER', 4, 4, 2,
          'How many did we get? Count with me — one… two… three… six! 🎉 Say it: “six points!” Clap for every one. And next time: the POND questions!',
          'Counts the score out loud and claps for each answer.',
          'Say “six points!”',
          ['How many points?', 'Which question was the best?', 'Who shall we play this with at home?'],
          ['Clap once per point, in a silly voice.', 'Let the child ring the bell at the end.', 'Choose the next night’s picture together.'],
          'The score is said out loud, so counting is English too — and the night ends with a number the child can take to the dinner table.',
        ),
      ],
      game: {
        name: 'Which One?',
        howToPlay: 'The adult reads the question, the child points at one of two big pictures and says the word out loud.',
        winCondition: 'Six questions, six cheers, and the score counted out loud at the end.',
        turns: 6,
        offline: 'Two toys on the table — the adult asks, the child points and says the word.',
        items: [
          { prompt: 'Which one is the duck? 🦆', answer: 'duck', distractors: ['cow'], picture: '🦆', childSays: 'duck!', ask: 'What does the duck say?', photoQuery: 'duck swimming in a pond', lookFor: 'the feet under the water' },
          { prompt: 'Which one is the cow? 🐮', answer: 'cow', distractors: ['cat'], picture: '🐮', childSays: 'cow!', ask: 'What does the cow say?', photoQuery: 'cow standing in a field', lookFor: 'the tail' },
          { prompt: 'Which one is the cat? 🐈', answer: 'cat', distractors: ['dog'], picture: '🐈', childSays: 'cat!', ask: 'Where is the cat sitting?', photoQuery: 'cat sitting on a sofa', lookFor: 'the soft paws' },
          { prompt: 'Which one is the dog? 🐕', answer: 'dog', distractors: ['pig'], picture: '🐕', childSays: 'dog!', ask: 'What does the dog do with its tail?', photoQuery: 'dog running in a garden', lookFor: 'the wagging tail' },
          { prompt: 'Which one is the pig? 🐖', answer: 'pig', distractors: ['sheep'], picture: '🐖', childSays: 'pig!', ask: 'What colour is the pig?', photoQuery: 'pink pig in a farmyard', lookFor: 'the curly tail' },
          { prompt: 'Which one is the sheep? 🐑', answer: 'sheep', distractors: ['duck'], picture: '🐑', childSays: 'sheep!', ask: 'What is the sheep wearing?', photoQuery: 'sheep with wool in a field', lookFor: 'the thick wool' },
        ],
      },
      worksheet: [
        'Six big picture questions — print them and play at the table.',
        '🔑 Answer key: duck · cow · cat · dog · pig · sheep — one picture answer and one decoy for each.',
      ],
      scene: {
        title: 'The real sofa where the family plays the quiz',
        photoQuery: 'family playing quiz at home',
        clipTitle: 'A real quiz-show clip with a bell 🔔',
        clipUrl: 'https://www.youtube.com/results?search_query=kids+quiz+show+bell',
        listenFor: 'The bell — the child rings theirs every time the answer is right.',
      },
      mission: {
        title: 'Three questions every night, at the table',
        realWorld: 'Every evening this week the family asks three questions at the dinner table — “which one is the cat?” — and the child answers, says the word and rings the bell. No screen, one minute a night, and the same six questions all week so the words get faster and faster.',
        sayIt: '“duck!” · “cow!” · “which one?” · “six points!”',
        steps: ['Print the six picture questions and put them on the fridge', 'Three questions a night — the child picks which', 'The child says the word before they point', 'On the last night, count the score out loud together'],
      },
      run: {
        targetMinutes: 30,
        brainBreaks: [
          'Stand up, shake your hands like a duck, then sit back down. 🦆',
          'Close your eyes and think of one animal — then say it. 🐮',
          'Ring the bell once and take three slow breaths. 🔔',
        ],
        exitTicket: [
          '“duck!” said while pointing at the real photo',
          '“which one?” asked by the child',
          'the score counted out loud: “six points!”',
        ],
        nextTime: 'Next time: the same quiz with the POND animals 🦆🐸 — and the child rings the bell before they answer.',
      },
      talkGoal: 29,
      media: QUIZ_MEDIA.map((m) => ({ ...m })),
      quiz: {
        name: 'Which One Is It?',
        rounds: ['THE WARM-UP', 'THE PICTURE ROUND', 'YOUR TURN TO ASK'],
        scoreLine: 'six points! can you say it? — “six points for me!”',
      },
      caregiverNote: 'Ask the same three questions every night at the table and WAIT — count three seconds in your head before you help, because that silence is where the answer is built. Never say “wrong”: say “nearly!” and look at the picture together. Ask for the word, not the sentence (“duck!”, not “it is a duck”), and say the whole sentence yourself afterwards so the child hears it. Let your child hold the bell and ring it for every answer, even the wrong ones — the ringing is what makes them want the next question. 🎤',
      teacherNote: 'Run sheet: WARM-UP QUESTIONS 3 · PICTURE ROUND 5 · THE QUIZ 7 · SAY IT BACK 6 · THE CHILD ASKS 5 · SCORE & CHEER 4 — 29 spoken turns, and the quiz player prints the child’s own word inside its “Yes!”, so every correct tap is a spoken turn. Nothing on screen is read by the child: you read every question and every option. One picture answer and one clear decoy, never a wrong answer called wrong, and the score is counted out loud at the end.',
    };
  }
  return {
    title: 'The Pond Quiz Show',
    durationMinutes: 30,
    objectives: ['Answer in whole sentences', 'Run the last round yourself', 'Say the score out loud'],
    materials: ['Ten questions on screen', 'One real photograph per question', 'A bell and a pencil for the score'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      phase(
        '1 · Warm-up questions', 'WARM-UP QUESTIONS', 3, 3, 5,
        'Two easy ones first, and the rule for tonight: no answer without a sentence. Which animal swims in the pond? … “The duck swims in the pond.” You said it — that is the whole game. 🦆',
        'Answers two easy questions in a whole sentence.',
        'Say “The duck swims in the pond.”',
        ['Which animal swims?', 'Who else lives in the water?', 'Can you say it again, faster?'],
        ['Say the sentence in a robot voice.', 'Let the child choose which question goes first.', 'Clap on every word of the sentence.'],
        'Two questions the class cannot get wrong, and the rule of the night is established with the first answer: a sentence, not a word.',
      ),
      phase(
        '2 · Picture round', 'PICTURE ROUND', 5, 4, 6,
        'Look at the real photo before anyone answers. 📷 What can you see? … A duck, water, a lily. Now — where are the duck’s feet? … Under the water! Say it: “The duck’s feet are under the water.”',
        'Looks at the real photograph, says what they can see, then finds the answer in it.',
        'Say “The duck’s feet are under the water.”',
        ['What can you see in the photo?', 'Which part of the photo answers the question?', 'Is there anything surprising in it?'],
        ['Cover the question and describe the picture first.', 'Name five things in the photo, then answer.', 'Find the answer together, then say it alone.'],
        'Every picture-round question is answered FROM the photograph — a child who can find the answer in the picture never has to guess.',
      ),        {
          ...phase(
            '3 · The quiz', 'THE QUIZ', 7, 6, 10,
            'The quiz itself. Question one: which animal swims in the pond? … Read all four before you choose. … “The duck swims in the pond.” 🎉 Ring the bell! Next question…',
            'Reads all four options, taps the answer, then says the whole sentence out loud.',
            'Say “The duck swims in the pond.”',
            ['Which option did you read first?', 'Why is that one right?', 'Which one is the trickiest?'],
            ['Read the options in a whisper, then answer.', 'Take the questions in a different order.', 'Give one question to each child in turn.'],
            'The engine prints every answer sentence inside its own “Yes!”, so the quiz itself owes ten spoken turns — the reading of the options is the silent part.',
          ),
          /* The ONE phase that opens the engine: the quiz show lives inside the run
             sheet instead of swallowing the whole session. */
          drill: true,
        },
      phase(
        '4 · Say it back', 'SAY IT BACK', 6, 5, 9,
        'Round two — same questions, but now the sentence is YOURS, in your own words. In my pond, the duck…? … “In your pond the duck swims fast!” That is even better than mine.',
        'Answers each question again with a sentence of their own, not the printed one.',
        'Say “In my pond, the duck ___.”',
        ['Can you say it a different way?', 'Which sentence was your best?', 'What would you change about the pond?'],
        ['Say the sentence, then add one more thing to it.', 'Do one round with no options on screen at all.', 'Let the child make one question funny on purpose.'],
        'The second pass is where the language becomes theirs: the printed sentence is the scaffold, and the child’s own version is the point.',
      ),
      phase(
        '5 · The child asks', 'THE CHILD ASKS', 5, 4, 7,
        'This round is yours — YOU read the question, and I answer. 🎤 Read it slowly like a quizmaster. … “Which animal swims in the pond?” … I say the frog! … No? Then tell me WHY I am wrong.',
        'Reads a question aloud, hears the grown-up’s answer, judges it and explains why it is right or wrong.',
        'Say “No — because the frog jumps, it does not swim.”',
        ['Was I right or wrong?', 'How do you know?', 'Which question will you ask next?'],
        ['Answer wrongly on purpose and let the child explain.', 'Let the child keep the score on the bell.', 'Ask the child to read the question in a TV voice.'],
        'Reading the question aloud and judging the answer is the 5-12 step up — and “why is that wrong?” is the most useful sentence on the whole sheet.',
      ),
      phase(
        '6 · Score & cheer', 'SCORE & CHEER', 4, 4, 3,
        'Let’s hear the score! 🏆 Count it out loud in English and say the score line: “ten points, and the duck takes the lead!” Which question was hardest? That one goes home for the family.',
        'Counts the score out loud, says the score line and names the hardest question.',
        'Say “ten points, and the duck takes the lead!”',
        ['How many points?', 'Which question was hardest?', 'Who will you ask at home?'],
        ['Say the score line like a sports reporter.', 'Give the hardest question a round of applause.', 'Write the score on the printed sheet.'],
        'The score is spoken as English, and the hardest question leaves the room with the child — that is the homework, and it is their choice.',
      ),
    ],
    game: {
      name: 'Pond Quiz Show',
      howToPlay: 'Read the question, read all four options, tap one, then say the whole sentence out loud.',
      winCondition: 'Ten questions answered in sentences, the score counted out loud, and the hardest question taken home.',
      turns: 10,
      offline: 'Read the four options aloud; the child answers with fingers 1–4, then says the sentence.',
      items: [
        { prompt: 'Which animal swims in the pond?', answer: 'the duck', distractors: ['the cat', 'the dog', 'the frog'], picture: '🦆', childSays: 'The duck swims in the pond.', ask: 'Who else lives in the water?', photoQuery: 'duck swimming in a pond', lookFor: 'the feet under the water' },
        { prompt: 'What is a pond?', answer: 'a small pool of water', distractors: ['a big hill', 'a tall tree', 'a warm room'], picture: '💧', childSays: 'A pond is a small pool of water.', ask: 'Where is the nearest pond?', photoQuery: 'small pond in a park', lookFor: 'the water meeting the grass' },
        { prompt: 'What does a bird flap?', answer: 'its wing', distractors: ['its foot', 'its tail', 'its nose'], picture: '🪽', childSays: 'A bird flaps its wing.', ask: 'What else can a bird do?', photoQuery: 'duck flapping its wings', lookFor: 'the wing in the air' },
        { prompt: 'What do we call water flying up?', answer: 'a splash', distractors: ['a song', 'a jump', 'a flower'], picture: '💦', childSays: 'Water flying up is a splash.', ask: 'What makes a big splash?', photoQuery: 'duck making a splash in water', lookFor: 'the drops in the air' },
        { prompt: 'Where do fish live?', answer: 'in the water', distractors: ['on the grass', 'in the sky', 'in a tree'], picture: '🐟', childSays: 'Fish live in the water.', ask: 'Can a fish live on the grass?', photoQuery: 'fish swimming underwater pond', lookFor: 'the fish under the surface' },
        { prompt: 'What is a lily?', answer: 'a flower on the water', distractors: ['a kind of fish', 'a bird in the sky', 'a stone in the mud'], picture: '🌸', childSays: 'A lily is a flower on the water.', ask: 'What colour is a lily?', photoQuery: 'water lily flower on a pond', lookFor: 'the flower lying on the water' },
        { prompt: 'What do we call it when a duck goes under?', answer: 'a dive', distractors: ['a walk', 'a bump', 'a crack'], picture: '🤿', childSays: 'When a duck goes under, it is a dive.', ask: 'How long can a duck stay under?', photoQuery: 'duck diving underwater', lookFor: 'the tail disappearing' },
        { prompt: 'What gives us light in the day?', answer: 'the sun', distractors: ['the moon', 'a lamp', 'a star'], picture: '☀️', childSays: 'The sun gives us light in the day.', ask: 'What gives us light at night?', photoQuery: 'sun shining on a pond', lookFor: 'the light on the water' },
        { prompt: 'What is a boat for?', answer: 'floating on water', distractors: ['riding on grass', 'flying in the sky', 'climbing a tree'], picture: '⛵', childSays: 'A boat floats on the water.', ask: 'Who sails a boat?', photoQuery: 'little boat on a pond', lookFor: 'the boat sitting on the water' },
        { prompt: 'Where does a frog sit?', answer: 'on a lily leaf', distractors: ['in a nest', 'on a cloud', 'under the ground'], picture: '🐸', childSays: 'A frog sits on a lily leaf.', ask: 'What does a frog do next?', photoQuery: 'frog sitting on a lily pad', lookFor: 'the frog and the leaf' },
      ],
    },
    worksheet: [
      'Print the ten questions with their real-photo searches and play the show at home.',
      'Keep the score on the sheet and say the score line out loud after every round.',
      '🔑 Answer key: the duck · a small pool of water · its wing · a splash · in the water · a flower on the water · a dive · the sun · floating on water · on a lily leaf.',
    ],
    scene: {
      title: 'The real pond the questions are about',
      photoQuery: 'pond with ducks photograph',
      clipTitle: 'A real clip of how a quizmaster reads a question 🎬',
      clipUrl: 'https://www.youtube.com/results?search_query=quiz+show+host+reads+question',
      listenFor: 'How the question is read BEFORE anyone answers — the child copies exactly that in the last round.',
    },
    mission: {
      title: 'The dinner-table quiz week',
      realWorld: 'The printed questions go on the fridge and the family plays three of them every night at dinner — with the real photograph for each one. The child is the quizmaster on the last two nights: they read the question, somebody answers, and the child says whether it is right and why.',
      sayIt: '“Which animal swims in the pond?” · “No — because the frog jumps, it does not swim.” · “Ten points, and the duck takes the lead!”',
      steps: ['Print the questions and the photograph searches; the pictures matter more than the text', 'Three questions a night, with the picture looked at first', 'The child reads the question on the last two nights and judges the answers', 'The score is said out loud in English, every night'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Stand up and describe one thing in the room in a whole sentence. 🪑',
        'Shake out both hands, roll your shoulders, then sit back down. 🖐️',
        'Close your eyes and picture the pond — now say one thing you saw. 💧',
      ],
      exitTicket: [
        '“The duck swims in the pond.” — a whole sentence for the first question',
        'a question read aloud by the child in the last round',
        'the score line said out loud in English',
      ],
      nextTime: 'Next time: the same show with the FARM questions 🐮 — and the child writes three of the questions themselves.',
    },
    talkGoal: 40,
    media: QUIZ_MEDIA_Y.map((m) => ({ ...m })),
    quiz: {
      name: 'The Pond Quiz Show',
      rounds: ['THE WARM-UP', 'THE PICTURE ROUND', 'THE QUIZ', 'THE CHILD ASKS'],
      scoreLine: 'ten points, and the duck takes the lead!',
      master: 'I read the question aloud, you answer — and I tell you why you are right.',
    },
    caregiverNote: 'Play three questions a night at the table and let your child be the quizmaster for at least one of them: they read the question, you answer, and they say whether you are right and why — answering wrongly on purpose is the fastest way to get a whole sentence out of them. Read all four options aloud twice before anyone chooses, and wait three seconds after the question; never say “wrong”, say “nearly, look at the picture again”. Ask for the whole sentence, and if it comes out broken, say it back properly and let them repeat it — that correction is the teaching. Keep the score on the sheet and say the score line out loud together at the end. 🎤',
    teacherNote: 'Run sheet: WARM-UP QUESTIONS 3 · PICTURE ROUND 5 · THE QUIZ 7 · SAY IT BACK 6 · THE CHILD ASKS 5 · SCORE & CHEER 4 — 40 spoken turns. The quiz player prints each question’s own sentence inside its “Yes!”, so the quiz itself owes ten sentences; the reading of the four options is the child’s silent work and happens before every answer. The last round is the child’s: they read the question, judge the answer and explain why. Keep every option within two words of the others, never let the longest be correct, and rotate the position of the correct answer.',
  };
}

/* ── 🃏 Flashcard Deck: the pack, and the real week around it ──────────────── */

const DECK_MEDIA: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A real grown-up flipping cards with a toddler 🎬',
    url: search('https://www.youtube.com/results?search_query=', 'flashcards with toddler first words'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'flashcards with toddler first words'),
    where: 'both',
    forStep: 'Turn & tell',
    why: 'Watch how the card is held still while the child finds the word — said twice before the next card.',
    source: 'YouTube',
    embeddable: false,
  },
  {
    kind: 'picture',
    title: 'A real photograph of a duck on a pond 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'duck swimming in a pond', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'duck swimming in a pond', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Deal & look',
    why: 'One real photo the card is checked against: the child points at the real feet, then says the word.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'audio',
    title: 'A real duck sound to copy — quack 🦆',
    url: 'https://freesound.org/search/?q=duck+quack',
    searchUrl: 'https://freesound.org/search/?q=duck+quack',
    where: 'class',
    forStep: 'Say it with me',
    why: 'The child makes the sound WITH the word, so the card has a voice and a body instead of only a picture.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'activity',
    title: 'Free printable flashcard packs the family can keep 🃏',
    url: search('https://www.google.com/search?q=', 'free printable toddler flashcards pdf'),
    searchUrl: search('https://www.google.com/search?q=', 'free printable toddler flashcards pdf'),
    where: 'home',
    forStep: 'At home',
    why: 'The same six cards as paper, so the spaced schedule runs at the table with no screen at all.',
    source: 'Printable pack',
    embeddable: false,
  },
];

const DECK_MEDIA_Y: KidLessonMedia[] = [
  {
    kind: 'video',
    title: 'A real child running their own card round 🎬',
    url: search('https://www.youtube.com/results?search_query=', 'child reading flashcards aloud practice'),
    searchUrl: search('https://www.youtube.com/results?search_query=', 'child reading flashcards aloud practice'),
    where: 'both',
    forStep: 'The child deals',
    why: 'The child watches another child hold the pack and grade themselves — that is the pass they are about to run.',
    source: 'YouTube',
    embeddable: false,
  },
  {
    kind: 'picture',
    title: 'A real photograph of a pond in the morning 📷',
    url: search('https://commons.wikimedia.org/w/index.php?search=', 'pond duckweed morning', '&title=Special:MediaSearch&type=image'),
    searchUrl: search('https://commons.wikimedia.org/w/index.php?search=', 'pond duckweed morning', '&title=Special:MediaSearch&type=image'),
    where: 'class',
    forStep: 'Deal & look',
    why: 'The whole pack is built from this pond, so the first card is checked against the real place.',
    source: 'Wikimedia Commons',
  },
  {
    kind: 'audio',
    title: 'A real pond at night — frogs and water 🌙',
    url: 'https://freesound.org/search/?q=pond+frogs+water',
    searchUrl: 'https://freesound.org/search/?q=pond+frogs+water',
    where: 'class',
    forStep: 'Turn & tell',
    why: 'Play it while the pack is dealt: the child says what they hear before the first card is turned.',
    source: 'Freesound (CC0)',
  },
  {
    kind: 'activity',
    title: 'A free card maker to reprint the pack 🧩',
    url: search('https://wordwall.net/en-us/community?query=', 'flashcards pond animals'),
    searchUrl: search('https://wordwall.net/en-us/community?query=', 'flashcards pond animals'),
    where: 'home',
    forStep: 'At home',
    why: 'Free, no logins — the family reprints the pack and runs the three spaced passes on paper.',
    source: 'Wordwall',
    embeddable: true,
  },
];

function flashcardsDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'The Talking Pack',
      durationMinutes: 30,
      objectives: ['Name every card', 'Do the action on the back', 'Say two cards at the table tonight'],
      materials: ['The six-card pack on screen (or printed)', 'Nothing else — no pencil, no page'],
      words: VY_ACTIONS.map((w) => ({ ...w })),
      steps: [
        phase(
          '1 · Deal & look', 'DEAL & LOOK', 3, 3, 4,
          'Look — the pack! 🃏 Six cards, all face up. Show me the jumping one! … Yes! Say it: “jump!”',
          'Looks at all six cards and names the ones they recognise.',
          'I can see ___.',
          ['Which one is the jumper?', 'Which one is your favourite card?', 'Which card shall we start with?'],
          ['Let the child turn one card over and guess it.', 'Put two cards side by side and name them both.', 'Whisper the word first, then shout it.'],
          'The pack is looked at, not tested: the first words are said before any teaching happens.',
        ),
        phase(
          '2 · Say it with me', 'SAY IT WITH ME', 5, 4, 5,
          'Now we say them together. I say “jump” — you say “jump” — and we JUMP! 🦘',
          'Says every card with the grown-up and does the small action at the same time.',
          'jump!',
          ['Can you say it with me?', 'Can you do it while you say it?', 'Can you say it in a whisper?'],
          ['Say it as a robot, then as a mouse.', 'Let the child lead the next card.', 'Do the action three times, saying it each time.'],
          'Every card is said twice — once by the grown-up, once by the child — with the action on the word.',
        ),
        {
          ...phase(
            '3 · Turn & tell', 'TURN & TELL', 7, 6, 9,
            'Turn the card over… what is on the back? DO it! 🃏 “Clap!” — clap clap! “Sleep” — shhh.',
            'Turns a card, says the word, then does the action on the back.',
            'It is a ___.',
            ['What is on the back?', 'Can you show me?', 'What does the card want you to do?'],
            ['Turn two cards and do both actions.', 'Let the grown-up do it wrong and the child correct them.', 'Do the action in slow motion.'],
            'The card player opens here: every turn ends in a word said out loud and an action done, never a tap.',
          ),
          /* The ONE phase that opens the deck engine — the cards live inside the run
             sheet instead of swallowing the whole session. */
          drill: true,
        },
        phase(
          '4 · Sort the deck', 'SORT THE DECK', 6, 5, 6,
          'Now we make two piles! 🃏 The jumping cards here, the sleeping cards there — and you name every one as you put it down.',
          'Sorts the pack into two piles and names each card as it is placed.',
          'This one is ___.',
          ['Where does this one go?', 'Is it a jumping card or a quiet card?', 'How many are in this pile?'],
          ['Sort by colour or by size instead.', 'Count the pile out loud together.', 'Let the child invent the second pile’s name.'],
          'Sorting forces one more spoken turn per card without the child noticing the repetition.',
        ),
        phase(
          '5 · The child deals', 'THE CHILD DEALS', 5, 4, 3,
          'YOU hold the pack now! 🎤 Deal me a card and I have to say the word — and I will be wrong once!',
          'Holds the pack, deals a card, says the word and tells the grown-up when they are wrong.',
          'Here is your card!',
          ['Which card shall I get?', 'Am I right?', 'What do I do now?'],
          ['Be wrong on purpose — the child loves correcting you.', 'Let the child shuffle (a mess is fine).', 'Deal one card to a teddy too.'],
          'The child holding the pack is the moment the deck stops being a test and becomes a game they own.',
        ),
        phase(
          '6 · Pack it home', 'PACK IT HOME', 4, 4, 2,
          'Pack the cards away — and tonight, at the table, we say TWO of them again. Which two shall we choose?',
          'Chooses two cards to say tonight and names them out loud one more time.',
          'Tonight we say ___.',
          ['Which two cards tonight?', 'Who shall we say them to?', 'What is the first one?'],
          ['Let the child put the pack away card by card, naming each one.', 'Choose the next pack’s topic together.', 'Say goodbye to each card by name.'],
          'The pack ends with a plan for tonight, so the words come back after the session — that is the spaced schedule starting.',
        ),
      ],
      game: {
        name: 'The Talking Pack',
        howToPlay: 'The pack is dealt, the grown-up says the word, the child turns the card and does the action on the back.',
        winCondition: 'Every card turned, said and acted once — the pack goes home with two cards chosen for tonight.',
        turns: 6,
        offline: 'The same six words on paper cards held up in your hand.',
        items: [
          item('🦘 What is this? Jump!', 'jump', ['sit', 'sleep'], '🦘'),
          item('👏 What is this? Clap!', 'clap', ['wave', 'run'], '👏'),
          item('🏃 What is this? Run!', 'run', ['sit', 'clap'], '🏃'),
          item('👋 What is this? Wave!', 'wave', ['jump', 'run'], '👋'),
          item('🪑 What is this? Sit!', 'sit', ['jump', 'wave'], '🪑'),
          item('😴 What is this? Sleep!', 'sleep', ['run', 'clap'], '😴'),
        ],
      },
      deck: {
        name: 'The Talking Pack',
        cards: [
          { word: 'jump', emoji: '🦘', say: 'A big card! What is this? It is a JUMP!', childSays: 'jump!', do: 'jump like a frog, then freeze' },
          { word: 'clap', emoji: '👏', say: 'Clap clap! What is the card doing? It is clapping!', childSays: 'clap clap!', do: 'clap twice fast, then once very slow' },
          { word: 'run', emoji: '🏃', say: 'Run, run! What is this one doing?', childSays: 'run!', do: 'run to the door and back' },
          { word: 'sit', emoji: '🪑', say: 'Shhh… what is the card doing now?', childSays: 'sit down!', do: 'sit down on the floor like the card' },
          { word: 'wave', emoji: '👋', say: 'Bye-bye, card! What is it doing?', childSays: 'wave bye-bye!', do: 'wave to the card, then to the window' },
          { word: 'sleep', emoji: '😴', say: 'Night-night, card. Shhh… what is it doing?', childSays: 'shhh, sleep', do: 'close your eyes and snore like the card' },
        ],
        passes: ['the whole pack, said together', 'the ones that got away', 'two cards from memory'],
        scoreLine: 'the whole talking pack! say it with me — “the whole pack!”',
        spacing: [
          'tonight at the table: the jump and the clap cards — the grown-up holds the card, the child says the word and does the action',
          'tomorrow in the bath: the run and the splash cards, said with the action in the water',
          'in three days: the whole pack from memory, no screen, cards on the floor',
        ],
      },
      scene: {
        title: 'The real place where the family plays cards',
        photoQuery: 'family sitting on the floor with toddler playing cards',
        clipTitle: 'A real clip of a toddler copying an action 🎬',
        clipUrl: 'https://www.youtube.com/results?search_query=toddler+copying+actions+song',
        listenFor: 'The action word — the child copies the movement, not the sentence.',
      },
      mission: {
        title: 'Two cards at the table, every night',
        realWorld: 'Every evening this week the family says TWO cards at the table — the grown-up holds the card up, the child says the word and does the action. No screen, one minute a night, and the SAME two cards come back tomorrow so the word gets faster and faster before a new pair arrives.',
        sayIt: '“jump!” · “clap clap!” · “wave bye-bye!” · “the whole pack!”',
        steps: ['Print the six cards and put them on the fridge', 'Two cards a night — the child chooses which two', 'The child says the word BEFORE the action', 'On the last night, run the whole pack from memory'],
      },
      run: {
        targetMinutes: 30,
        brainBreaks: [
          'Stand up and jump three times like the jump card. 🦘',
          'Clap twice, then take three slow breaths. 👏',
          'Wave to something in the room and name it. 👋',
        ],
        exitTicket: [
          '“jump!” said with the jump done',
          'the child dealing one card and saying the word',
          'two cards chosen out loud for tonight',
        ],
        nextTime: 'Next time: the same pack with a toy version 🧸 — the child deals to the teddy first, then to you.',
      },
      talkGoal: 29,
      media: DECK_MEDIA.map((m) => ({ ...m })),
      worksheet: [
        'Six big cards, one per page — print them and cut them out.',
        '🖨 On the back of every card, print the action: jump like a frog · clap twice · run to the door · sit down · wave bye-bye · shhh, sleep.',
        '🗓 Spaced schedule for the fridge: TONIGHT two cards · TOMORROW two different · IN THREE DAYS the whole pack from memory.',
      ],
      caregiverNote: 'Hold the card still and WAIT — count three seconds in your head before you help, because that silence is where the word is built. Say the word first and let your child say it back with the action, every single time: the action is what makes it stick. Never say “wrong” — say “nearly!” and do the action together. Two cards tonight, the same two tomorrow, and the whole pack on the third day. No screen is needed: cards on the floor are the whole lesson. 🃏',
      teacherNote: 'Run sheet: DEAL & LOOK 3 · SAY IT WITH ME 5 · TURN & TELL 7 · SORT THE DECK 6 · THE CHILD DEALS 5 · PACK IT HOME 4 — 29 spoken turns, and the card player opens inside TURN & TELL with each card’s back being an ACTION, so a turned card is a spoken turn plus a body. Nothing on screen is read by the child: you read every card and every line. The pack ends with two cards chosen for tonight — that is the spaced schedule, not a footnote.',
    };
  }
  return {
    title: 'The Pond Pack',
    durationMinutes: 30,
    objectives: ['Say a whole sentence for every card', 'Sort the pack yourself and say why', 'Run the last pass and quiz the grown-up'],
    materials: ['The twelve-card pack on screen (or printed)', 'A fridge magnet for the spaced schedule'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      phase(
        '1 · Deal & look', 'DEAL & LOOK', 3, 3, 4,
        'The pack is dealt face up — twelve cards. 🃏 Look first, no testing: which ones do you already know? Say the word and point at it.',
        'Scans the whole pack and names the cards they recognise without being asked.',
        'I already know ___.',
        ['Which one do you know for certain?', 'Which one looks the hardest?', 'Which card shall we start with?'],
        ['Let the child find the two review cards first.', 'Group the pack by category out loud.', 'Name one card in a silly voice.'],
        'The pack is looked at before it is tested: the words the child already owns are said first, so the session starts from strength.',
      ),
      phase(
        '2 · Say it with me', 'SAY IT WITH ME', 5, 4, 6,
        'Every card gets a WHOLE sentence from me, then the same from you: “The duck swims in the pond.” Your turn — the whole thing.',
        'Says each sentence after the tutor, then says one card on their own.',
        'The ___ is in the pond.',
        ['Can you say the whole sentence?', 'What else could it be?', 'Can you make it longer?'],
        ['Say the sentence in three different voices.', 'Let the child choose the next card.', 'Add one adjective to each sentence.'],
        'The card is never answered with one word here: the sentence is the unit, and it is modelled before it is demanded.',
      ),
      {
        ...phase(
          '3 · Turn & tell', 'TURN & TELL', 7, 6, 11,
          'Now the deck runs: turn a card, say the sentence, then tell me one more thing about it that is NOT on the card. 🃏',
          'Turns each card, says the sentence, then adds one true fact of their own.',
          'This one is ___ and it ___.',
          ['What is on the card?', 'What else do you know about it?', 'Where have you seen one?'],
          ['Turn two cards and make one sentence from both.', 'The grown-up says a wrong sentence and the child fixes it.', 'Tell it as a story instead of a fact.'],
          'The card player opens here, and every turn ends in the child’s own sentence plus one added fact — the deck is a prompt, not the content.',
        ),
        /* The ONE phase that opens the deck engine. */
        drill: true,
      },
      phase(
        '4 · Sort the deck', 'SORT THE DECK', 6, 5, 8,
        'Sort the pack into two piles: “I know it” and “practice again”. Say WHY each card went where it did — that sentence is the point.',
        'Sorts the pack and gives a reason for every card in a full sentence.',
        'This one goes in ___ because ___.',
        ['Why does that one go there?', 'Which pile is bigger?', 'Which one shall we rescue today?'],
        ['Sort by where you would find them instead.', 'Count each pile out loud.', 'Let the child rename the piles.'],
        'Sorting is the child assessing themselves in English — the reason sentence is where the language gets real.',
      ),
      phase(
        '5 · The child deals', 'THE CHILD DEALS', 5, 4, 7,
        'YOU run the pack now! 🎤 Read the card out loud, I answer, and you tell me whether I am right — and why.',
        'Reads each card aloud, judges the grown-up’s answer and explains the verdict.',
        'The answer is ___ because ___.',
        ['Am I right or nearly?', 'Why not?', 'What is the best sentence for this card?'],
        ['Be wrong on purpose twice.', 'Let the child write the score on the fridge sheet.', 'Swap: the child answers, you judge badly.'],
        'The child reading, judging and explaining is the 5-12 step-up: the pack is theirs by the end of the night.',
      ),
      phase(
        '6 · Pack it home', 'PACK IT HOME', 4, 4, 4,
        'Which three cards come back TONIGHT? Name them, then the ones for tomorrow, then the whole pack in three days. 🗓',
        'Chooses and names the three cards for tonight and repeats the schedule.',
        'Tonight we say ___ , ___ and ___.',
        ['Which three tonight?', 'Which ones tomorrow?', 'Who will you say them to?'],
        ['Write the three cards on the fridge sheet.', 'Run the pack one last time as fast as possible.', 'Choose the next pack’s topic together.'],
        'The pack closes on the spaced schedule said out loud, so the week is the child’s plan rather than the tutor’s.',
      ),
    ],
    game: {
      name: 'The Pond Pack',
      howToPlay: 'The child turns each card, says the whole sentence, then adds one true fact; every fifth card mixes two earlier words.',
      winCondition: 'The pack is sorted into two honest piles, the child runs the last pass and the three cards for tonight are named.',
      turns: 12,
      offline: 'The same twelve cards as paper, plus the fridge sheet for the week.',
      items: [
        item('🃏 Say the word, then turn the card', 'duck', ['a pond', 'a wing'], '🦆'),
        item('🃏 Say the word, then turn the card', 'pond', ['a duck', 'a sun'], '💧'),
        item('🃏 Mixed card — say both!', 'swim and wing', ['duck and sun', 'frog and pond'], '🏊'),
        item('🃏 Say the word, then turn the card', 'splash', ['a dive', 'a lily'], '💦'),
        item('🃏 Mixed card — say both!', 'frog and lily', ['boat and sun', 'duck and wing'], '🐸'),
        item('🃏 Say the word, then turn the card', 'dive', ['swim', 'splash'], '🤿'),
        item('🃏 Say the word, then turn the card', 'sun', ['moon', 'star'], '☀️'),
        item('🃏 Last card!', 'boat', ['frog', 'pond'], '⛵'),
      ],
    },
    deck: {
      name: 'The Pond Pack',
      cards: [
        { word: 'duck', emoji: '🦆', say: 'Tell me about this one — what is it doing?', childSays: 'The duck swims in the pond.', cue: 'a duck on the water', sentence: 'My duck is in the bath.' },
        { word: 'pond', emoji: '💧', say: 'What is this place?', childSays: 'The pond is cool and blue.', cue: 'a small blue pool of water', sentence: 'The pond near my house is small.' },
        { word: 'swim', emoji: '🏊', say: 'What is the action on this card?', childSays: 'Fish swim all day.', cue: 'arms moving through water', sentence: 'I swim at the pool on Saturday.' },
        { word: 'wing', emoji: '🪽', say: 'Which part of the bird is this?', childSays: 'The duck flaps its wing.', cue: 'a bird’s arm', sentence: 'My kite has one wing.' },
        { word: 'duck and pond', emoji: '🃏', say: 'Two cards! Say both, then tell me about one of them.', childSays: 'The duck swims in the pond.', cue: 'two cards at once — the animal and the water', sentence: 'The duck swims, and the pond is cool.', review: ['duck', 'pond'] },
        { word: 'splash', emoji: '💦', say: 'What happened here?', childSays: 'Splash! Into the water.', cue: 'water flying up', sentence: 'I splash in the bath.' },
        { word: 'dive', emoji: '🤿', say: 'Where is it going?', childSays: 'The duck dives down.', cue: 'going under the water', sentence: 'I dive to the bottom of the pool.' },
        { word: 'frog', emoji: '🐸', say: 'What is this one?', childSays: 'The frog jumps on a leaf.', cue: 'a green jumping animal', sentence: 'The frog lives by our pond too.' },
        { word: 'lily', emoji: '🌸', say: 'What is floating here?', childSays: 'A pink lily floats by.', cue: 'a flower on the water', sentence: 'The lily is pink and white.' },
        { word: 'frog and lily', emoji: '🃏', say: 'Mixed card — say both, then make one sentence with them.', childSays: 'The frog jumps on a lily.', cue: 'two cards at once — the jumper and the flower', sentence: 'The frog sits on the lily in the sun.', review: ['frog', 'lily'] },
        { word: 'sun', emoji: '☀️', say: 'What is the weather on this card?', childSays: 'The sun is warm today.', cue: 'bright light in the sky', sentence: 'The sun comes out after the rain.' },
        { word: 'boat', emoji: '⛵', say: 'What is this, and where does it go?', childSays: 'A little boat sails past.', cue: 'something that floats on water', sentence: 'The boat is in the harbour.' },
      ],
      passes: ['the whole pack, sentence by sentence', 'the practice-again pile only', 'three cards from memory, no prompts'],
      scoreLine: 'the whole pond pack, all by myself!',
      master: 'I read every card out loud, you answer, and I say why you are right',
      spacing: [
        'tonight at dinner: the duck, the pond and the swim cards — the child says the sentence from memory, no screen',
        'tomorrow in the car: the three cards that went in the practice-again pile',
        'in three days: the whole pack, sorted again, and the child runs the last pass',
      ],
    },
    scene: {
      title: 'The real pond where the pack comes from',
      photoQuery: 'small pond with duckweed and reeds',
      clipTitle: 'A real clip of a duck landing on water 🎬',
      clipUrl: 'https://www.youtube.com/results?search_query=duck+landing+on+water+slow+motion',
      listenFor: 'The splash — the child names the sound with the word “splash”.',
    },
    mission: {
      title: 'Three cards a night, sorted again on the third day',
      realWorld: 'Every evening this week the child runs three cards from the pack with no screen — the pack on the table, the card read aloud, the sentence said from memory, and the ones that got away back in the pile for tomorrow. On the third day the whole pack comes out again and the child sorts it themselves and says why each card moved piles.',
      sayIt: '“The duck swims in the pond.” · “This one goes in practice again because…” · “The whole pond pack, all by myself!”',
      steps: ['Print the pack and the fridge sheet', 'Three cards a night — the child reads the card aloud', 'The sentence is said before the card is turned back', 'Every third day: re-sort the whole pack and say why'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Stand up, name one thing you can see, sit back down. 🦆',
        'Take three slow breaths and picture the pond. 💧',
        'Say the fastest sentence you can, then the slowest. ⛵',
      ],
      exitTicket: [
        'one whole sentence said for the hardest card',
        'the two piles sorted with a reason sentence each',
        'tonight’s three cards named out loud',
      ],
      nextTime: 'Next time: a new pack from a different place 🌳 — and the child builds two cards of their own for it before it starts.',
    },
    talkGoal: 40,
    media: DECK_MEDIA_Y.map((m) => ({ ...m })),
    worksheet: [
      'Twelve cards to print and cut — one word, one picture cue and one example sentence each.',
      '🗓 Fridge sheet: TONIGHT three cards · TOMORROW the practice-again pile · IN THREE DAYS the whole pack, re-sorted.',
      '🔑 Answer key for the tutor: every card’s target sentence is printed on the back, so the child can check themselves.',
    ],
    caregiverNote: 'Be the person who answers, not the person who tests: the child reads the card aloud and YOU answer — sometimes wrongly on purpose, because the child judging you is where the sentences get long. Ask for the whole sentence every time (“the duck swims in the pond”), never the single word, and if the child says “I don’t know”, say “nearly — what is it doing?” and wait. Three cards tonight, the same three tomorrow, and the child re-sorts the whole pack on the third day. The fridge sheet is the plan — one minute a night, no screen. 🗓',
    teacherNote: 'Run sheet: DEAL & LOOK 3 · SAY IT WITH ME 5 · TURN & TELL 7 · SORT THE DECK 6 · THE CHILD DEALS 5 · PACK IT HOME 4 — 40 spoken turns, and the card player opens inside TURN & TELL with each card’s back printing the child’s whole sentence. Every fifth card is a review card that mixes two earlier words. The child runs the last pass (read, judge, explain), and the session closes on the spaced schedule printed on the fridge sheet — three cards tonight, the practice-again pile tomorrow, the whole pack in three days.',
  };
}

/* The arcade night. The game is ONE phase of it — the pop round — because eight
   minutes of tapping produces four words, while a night with a warm-up, a pop round,
   a silly-sounds round and a child-run round produces 24 spoken turns (veryYoung) or
   40 (young) over exactly the same vocabulary. The grown-up holds the device for the
   little ones; the child owns the voice in both bands. */
function arcadeDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'Pond Pop',
      durationMinutes: 30,
      objectives: ['Pop the six pond animals', 'Make every animal sound', 'Say two words at the table tonight'],
      materials: ['The pop game on the big screen — the grown-up holds the device', 'Nothing else: no pencil, no page, no reading'],
      words: VY_ANIMALS.map((w) => ({ ...w })),
      steps: [
        phase(
          '1 · Warm-up pops', 'WARM-UP POPS', 3, 3, 3,
          'Look — bubbles! 🫧 Pop one with your finger… POP! Now you say the word I say: “duck!”',
          'Pops bubbles with a finger and copies the word the grown-up says.',
          'I pop it!',
          ['Shall we pop one more?', 'Which one shall we pop?', 'Can you pop it slowly?'],
          ['Pop three bubbles in a row, saying the word each time.', 'Pop a bubble on the child’s nose — a giggle is a spoken turn too.', 'Count the bubbles as they pop.'],
          'The popping is the hook; the WORD on every pop is the teaching.',
        ),
        phase(
          '2 · Say it, pop it', 'SAY IT, POP IT', 5, 4, 4,
          'The duck is hiding! 🦆 Say “duck” — and POP! You got it!',
          'Says the word first, then taps the bubble with that animal in it.',
          'duck!',
          ['What is it?', 'What does the duck say?', 'Where is the duck hiding?'],
          ['Say it in a whisper, then pop.', 'Make the animal sound, then say the word.', 'Let the child choose which animal comes next.'],
          'Saying it BEFORE popping is what makes this a speaking game instead of a tapping game.',
        ),
        {
          ...phase(
            '3 · The pop round', 'THE POP ROUND', 7, 6, 10,
            'All six animals! I say “moo”… who is that? The COW! Pop the cow! 🐮',
            'Hears the sound, finds the animal, says its name and pops it.',
            'It is a ___.',
            ['Who says moo?', 'Is it the cow or the cat?', 'What does the cow say?'],
            ['Play two animals at once and let the child choose.', 'Turn the sound into a song: moo, moo, moo.', 'Let the child make the sound and YOU pop it.'],
            'The pop round is the game itself — the engine opens here, inside the night.',
          ),
          /* The ONE phase that opens the pop engine. */
          drill: true,
        },
        phase(
          '4 · Silly sounds', 'SILLY SOUNDS', 5, 4, 3,
          'Now the silly part — say “duck” like a giant! Or like a mouse! 🐭',
          'Says each of the six words in a silly voice and makes the animal sound.',
          'duck like a mouse!',
          ['Can you say it like a robot?', 'Can you say it slowly?', 'Who says it better, you or me?'],
          ['Do the voices in a mirror.', 'Take turns choosing the silly voice.', 'Say all six in one silly voice.'],
          'A silly voice gets a shy child speaking without noticing they are speaking.',
        ),
        phase(
          '5 · The child pops', 'THE CHILD POPS', 5, 4, 4,
          'YOU are the boss of the bubbles now! 🎤 You say the word — and I have to pop it!',
          'Names a word, waits for the grown-up to pop it, and tells them when they are wrong.',
          'Pop the ___!',
          ['Which one do I pop?', 'Am I right?', 'What shall I pop next?'],
          ['Be wrong on purpose — the child loves catching you.', 'Let the child hold the device with both hands.', 'Pop two bubbles the child chooses.'],
          'The child giving the instruction is the moment the words stop being a test.',
        ),
        phase(
          '6 · Pack the machine', 'PACK THE MACHINE', 5, 4, 2,
          'Pop, pop, pop… all gone! 🫧 Tonight, at the table, we say TWO animals again. Which two?',
          'Chooses two words to say tonight and says them one more time out loud.',
          'Tonight we say ___.',
          ['Which two animals tonight?', 'Who shall we say them to?', 'What does the duck say?'],
          ['Say goodbye to each animal by name as it pops away.', 'Choose tomorrow’s animals together.', 'Say the two words to a teddy.'],
          'Ending with a plan for tonight is what makes the words come back after the lesson.',
        ),
      ],
      game: {
        name: 'Pond Pop',
        howToPlay: 'One rule: I say a word, you say it too, then pop the bubble with that animal in it. The grown-up holds the device; the child owns the voice.',
        winCondition: 'All six animals popped — and the bubbles come back for a second round, so the win can never be lost.',
        turns: 6,
        offline: 'Blow pretend bubbles with your hands: say the word, then pop it on your palm.',
        levels: [
          { name: 'Level 1 — the whole six', words: ['duck', 'cow', 'cat', 'dog', 'pig', 'sheep'], distractors: ['dock', 'how', 'cap', 'dot', 'big', 'sleep'], rise: 'all six animals, one at a time' },
          { name: 'Level 2 — six, faster', words: ['duck', 'cow', 'cat', 'dog', 'pig', 'sheep'], distractors: ['dusk', 'now', 'cot', 'dock', 'pick', 'ship'], rise: 'the same six, popped faster' },
        ],
        retrySet: ['sheep', 'duck', 'pig'],
        scoring: {
          hit: 'POP! You said it — duck! Here comes another bubble!',
          miss: 'Nearly! Let’s pop it again — duck, not dock.',
          scoreLine: 'Every pop is one point, and we count them on our fingers.',
        },
        sounds: ['pop', 'cheer', 'boing'],
        items: [
          item('Pop the DUCK! What does it say?', 'duck', ['dock', 'dusk'], '🦆', { childSays: 'duck! Quack quack.', ask: 'What does the duck say?' }),
          item('Pop the COW! What does it say?', 'cow', ['how', 'now'], '🐮', { childSays: 'cow! Moo!', ask: 'Who says moo?' }),
          item('Pop the CAT! What does it say?', 'cat', ['cap', 'cot'], '🐈', { childSays: 'cat! Meow.', ask: 'Is the cat soft or hard?' }),
          item('Pop the DOG! What does it say?', 'dog', ['dot', 'dock'], '🐕', { childSays: 'dog! Woof woof.', ask: 'What does the dog do?' }),
          item('Pop the PIG! What colour is it?', 'pig', ['big', 'pick'], '🐖', { childSays: 'pig! It is pink.', ask: 'What colour is the pig?' }),
          item('Pop the SHEEP! What does it say?', 'sheep', ['ship', 'sleep'], '🐑', { childSays: 'sheep! Baa baa.', ask: 'Is the sheep soft?' }),
        ],
      },
      worksheet: undefined,
      caregiverNote: 'At the table tonight, say “duck” and “cow” and make the sounds together — two words, thirty seconds.',
      teacherNote: 'The engine opens at the pop round. The grown-up keeps the device and the child does the talking; never more than seven minutes on the screen.',
      scene: {
        title: 'A real pond, up close',
        photoQuery: 'ducklings following their mother on a pond',
        clipTitle: 'Ducklings on the water — real ducklings, real quacking 🦆',
        clipUrl: search('https://www.youtube.com/results?search_query=', 'real ducklings on a pond for toddlers'),
        listenFor: '“quack quack” — the child quacks once every time they hear it.',
      },
      mission: {
        title: 'The animal sounds at bath time',
        realWorld: 'Tonight, in the bath, the child makes the animal sounds for the grown-up — duck, cow, cat, dog — and the grown-up copies them. Two minutes, in the water, no screen and no testing.',
        sayIt: '“quack quack!” · “moo!” · “meow!” · “woof woof!”',
        steps: [
          'Night 1: the duck and the cow, with the sounds',
          'Night 2: the cat and the dog, with the sounds',
          'Night 3: all four, the child leading and the grown-up copying',
          'Clap for the retry, never correct the sound',
        ],
      },
      run: {
        targetMinutes: 30,
        brainBreaks: ['Shake like a wet dog and sit back down.', 'Blow five big bubbles with your mouth.', 'Wiggle every finger, one at a time.'],
        exitTicket: ['duck!', 'It is a cow!', 'Tonight we say duck and pig.'],
        nextTime: 'The next night swaps two animals and adds the pond words swim and water.',
      },
      talkGoal: 24,
    };
  }
  return {
    title: 'Pond Arcade Night',
    durationMinutes: 30,
    objectives: ['Pop every pond word in three levels', 'Read each target aloud before popping it', 'Beat your own best in level three'],
    materials: ['The arcade on the big screen', 'One sheet of paper and a marker for the score board'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      phase(
        '1 · Warm-up pops', 'WARM-UP POPS', 3, 3, 3,
        'Bubbles! One rule to start: I say the word, you pop it. “Pond!”',
        'Pops the bubble for the word they hear, then reads it back.',
        'I popped pond!',
        ['Which word shall we pop first?', 'Can you read it as you pop it?', 'Which one looks like pond?'],
        ['Read every bubble aloud before popping it.', 'Pop them in alphabetical order for one round.', 'Say the first sound of each word before popping.'],
        'Reading the bubble aloud before popping it is what keeps this a reading game.',
      ),
      phase(
        '2 · Say it, pop it', 'SAY IT, POP IT', 5, 4, 5,
        'The pond words are hiding. Read it, say it, then pop it: “swim!”',
        'Reads each word aloud, then pops the matching bubble.',
        'swim — I swim in the pond.',
        ['What is it?', 'Can you use it in a sentence?', 'Which word rhymes with it?'],
        ['Pop the word only after a full sentence.', 'Take turns: you read, I pop.', 'Find two words that start with the same sound.'],
        'A bubble is popped only after the word has been said inside a sentence.',
      ),
      {
        ...phase(
          '3 · The pop round', 'THE POP ROUND', 7, 6, 10,
          'Level one — six pond words at speed! Read it, pop it. Ready? Go! 💦',
          'Plays level one: reads each target aloud and pops it before the bubbles float away.',
          'I got all six!',
          ['Which one got away?', 'Which two look almost the same?', 'Shall we try it faster?'],
          ['Count the pops out loud together.', 'Play level two straight away if they are flying.', 'Read the tricky ones slowly first.'],
          'The pop round is the game itself: the engine opens here, inside the night.',
        ),
        /* The ONE phase that opens the pop engine. */
        drill: true,
      },
      phase(
        '4 · Trick words', 'TRICK WORDS', 6, 5, 9,
        'Now the trick words. Pond… pound. Duck… dock. Read carefully and pop the one I say!',
        'Reads the confusable pair, says which is which, then pops the target.',
        'Pond — not pound.',
        ['What is the difference between pond and pound?', 'Which one has the /ow/ sound?', 'Which one is water?'],
        ['Say both words before popping either.', 'Write the pair on paper and circle the target.', 'Let the child invent a trick pair for you.'],
        'The trick words are where the game stops being fast and starts being careful.',
      ),
      phase(
        '5 · The child runs it', 'THE CHILD RUNS IT', 5, 4, 8,
        'You run the arcade now! You read the word, I pop it — and you keep the score out loud.',
        'Reads each target aloud, pops the bubble and says the score line.',
        'Two points — the pond takes the lead!',
        ['Which word do I pop?', 'What is the score?', 'Am I right?'],
        ['Be wrong on purpose so the child scores on you.', 'Let them choose level three.', 'Give them the marker for the score board.'],
        'The child keeping score is the moment the words leave the screen and become theirs.',
      ),
      phase(
        '6 · Pack the machine', 'PACK THE MACHINE', 4, 3, 5,
        'Last pops — the three that got away. Then we write tonight’s two words on the board.',
        'Pops the retry set words, reads them once more and writes two for tonight.',
        'Tonight we say pond and swim.',
        ['Which three got away?', 'Which two for tonight?', 'Who will you say them to?'],
        ['Write the two words in a big hand and leave the board visible.', 'Send the two words home on the sheet.', 'Plan the next arcade: harder words or faster speed.'],
        'Finishing on the words that got away, and winning them, is what makes the lesson stick.',
      ),
    ],
    game: {
      name: 'Pond Sprint',
      howToPlay: 'One rule: read the target aloud, then hit it and ignore the lookalikes. Three levels rise in speed and trickiness, with a small win each time.',
      winCondition: 'Finishing level three — and the retry round replays only the words that got away, so the win can be reached again.',
      turns: 9,
      offline: 'Two columns of words on the board; the child reads the target, you keep the score out loud.',
      levels: [
        { name: 'Level 1 — six pond words', words: ['pond', 'swim', 'duck', 'wing', 'frog', 'sun'], distractors: ['pounds', 'swam', 'dusk', 'wind', 'from', 'son'], rise: 'reading speed: one clear target at a time' },
        { name: 'Level 2 — the trick pairs', words: ['pond', 'pound', 'swim', 'swam', 'duck', 'dock'], distractors: ['bond', 'ponds', 'skim', 'swimmy', 'dunks', 'deck'], rise: 'the confusable pairs arrive — pond/pound, swim/swam, duck/dock' },
        { name: 'Level 3 — the boss round', words: ['lily', 'boat', 'dive', 'wing', 'frog', 'sun'], distractors: ['lilly', 'bolt', 'drive', 'ring', 'fog', 'sung'], rise: 'the child reads every target aloud before popping, in one unbroken run' },
      ],
      retrySet: ['pond', 'duck', 'wing'],
      scoring: {
        hit: 'Two points — the pond takes the lead!',
        miss: 'Nearly — duck, not dock. Double points if you get it now.',
        scoreLine: 'The tutor keeps score out loud, on the board, so the game works with the laptop shut.',
      },
      sounds: ['pop', 'cheer', 'coin', 'boing'],
      items: [
        item('⚡ Read it, then hit: pond', 'pond', ['ponds', 'pound', 'bond'], '💧', { childSays: 'The frog is in the pond.', ask: 'What lives in a pond?' }),
        item('⚡ Read it, then hit: swim', 'swim', ['swam', 'swimmy', 'skim'], '🏊', { childSays: 'I swim in the pond.', ask: 'Can you swim?' }),
        item('⚡ Read it, then hit: duck', 'duck', ['dusk', 'dock', 'dunks'], '🦆', { childSays: 'The duck swims on the pond.', ask: 'What does the duck say?' }),
        item('⚡ Read it, then hit: wing', 'wing', ['wind', 'wings', 'ring'], '🪽', { childSays: 'The duck moves its wings.', ask: 'Which bird has big wings?' }),
        item('⚡ Read it, then hit: frog', 'frog', ['frogs', 'from', 'fog'], '🐸', { childSays: 'The frog jumps from the lily.', ask: 'How does a frog move?' }),
        item('⚡ Read it, then hit: lily', 'lily', ['lilly', 'lie', 'lilypad'], '🌸', { childSays: 'The frog sits on the lily.', ask: 'What colour is the lily?' }),
        item('⚡ Read it, then hit: sun', 'sun', ['son', 'sung', 'sum'], '☀️', { childSays: 'The sun is hot today.', ask: 'Is the sun hot or cold?' }),
        item('⚡ Read it, then hit: boat', 'boat', ['bolt', 'goat', 'boa'], '⛵', { childSays: 'The boat is on the pond.', ask: 'Who sails a boat?' }),
        item('⚡ Read it, then hit: dive', 'dive', ['diver', 'drive', 'dime'], '🤿', { childSays: 'The duck can dive under the water.', ask: 'What happens when you dive?' }),
      ],
    },
    worksheet: ['Write the three words that got away and read them aloud twice.', 'Draw the pond and label two things in it.', 'Answer key: any of the target words.'],
    caregiverNote: 'Play the arcade at the table with two words — pond and duck — and ask “is it pond or pound?”',
    teacherNote: 'Speed work is a sprint — never more than a few minutes at a time, and always read the target aloud before popping it.',
    scene: {
      title: 'The real pond and the real words',
      photoQuery: 'pond with a duck, a frog and lily pads',
      clipTitle: 'A real pond walk — find the duck, the frog and the lily 🌸',
      clipUrl: search('https://www.youtube.com/results?search_query=', 'real pond animals for kids footage'),
      listenFor: 'the moment the frog jumps — the child says “the frog jumps from the lily!”',
    },
    mission: {
      title: 'The pond word hunt that leaves the screen',
      realWorld: 'Twice this week the child finds three pond words in a real book, a cereal box or a shop sign, reads them aloud to a grown-up and writes the trickiest one on the sheet.',
      sayIt: '“I found pond — p-o-n-d, pond. The tricky one is pound.”',
      steps: [
        'Hunt 1: find two pond words in a real book and read them aloud',
        'Hunt 2: find one trick pair (pond/pound) and say why it is tricky',
        'Write the trickiest word on the sheet in a big hand',
        'Score it out loud — two points a word, double for a trick pair',
      ],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: ['Twenty star jumps, then back to the arcade.', 'Read one pond word backwards.', 'Two deep breaths and one silly voice.'],
      exitTicket: ['I popped all six pond words.', 'Pond, not pound — I can hear the difference.', 'Tonight we say pond and duck.'],
      nextTime: 'The next arcade adds the pond words pondside and paddle and plays level three twice.',
    },
    talkGoal: 40,
  };
}

function memoryDemo(): DemoParts {
  return {
    title: 'Pond Memory Pairs',
    durationMinutes: 10,
    objectives: ['Match words to pictures', 'Remember where cards were'],
    materials: ['The card grid on screen'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Round 1', 4, 'Turn two cards. Find the pair — word and picture together.', 'Turns cards and says the word aloud.', 'Say every card aloud as it turns.'),
      step('2 · Second round', 3, 'Say the word every time we turn a card, even if we have seen it.', 'Says each word as it is turned.', 'Naming the card aloud is what makes it stick.'),
      step('3 · From memory', 3, 'Now I hid three cards — remember which ones!', 'Recalls the hidden cards from memory.', 'This is the working-memory stretch.'),
    ],
    game: {
      name: 'Pond Pairs',
      howToPlay: 'Turn two cards, find the matching word and picture, remember where they were.',
      winCondition: 'All six pairs found; then a memory-only round.',
      turns: 6,
      offline: 'Paper squares face-down on the table.',
      items: [
        item('🧠 Find the pairs!', 'duck ↔ 🦆', ['pond ↔ 💧', 'swim ↔ 🏊'], '🧠'),
        item('🧠 Keep going!', 'frog ↔ 🐸', ['lily ↔ 🌸', 'sun ↔ ☀️'], '🧠'),
        item('🧠 Last pairs!', 'boat ↔ ⛵', ['wing ↔ 🪽', 'dive ↔ 🤿'], '🧠'),
      ],
    },
    homework: ['Play memory pairs with your family. 15 XP.'],
    caregiverNote: 'Play a memory game this week; ask your child to say each word as they turn a card.',
    teacherNote: 'Six pairs is the ceiling; say every word aloud as it turns.',
  };
}

function boardGameDemo(): DemoParts {
  return {
    title: 'Race Around the Pond',
    durationMinutes: 15,
    objectives: ['Do the task on each square', 'Finish together'],
    materials: ['A die', 'Two counters', 'The board on screen or paper'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Set up', 2, 'Two counters, one die, eighteen squares. Roll and do the task!', 'Chooses a counter.', 'It is a no-lose board.'),
      step('2 · Play', 11, 'You rolled a four! Say the word “pond”, then spell it.', 'Moves and does the square’s task.', 'Both counters finish; nobody loses.'),
      step('3 · Finish', 2, 'Both counters made it! Everyone wins! 🎉', 'Celebrates finishing.', 'The game ends when both finish.'),
    ],
    game: {
      name: 'Race Around the Pond',
      howToPlay: 'Roll, move, do the task on the square. Both counters finish to win.',
      winCondition: 'Both counters reach the end — a no-lose board.',
      turns: 18,
      offline: 'Draw the squares on paper and use a real die.',
      items: [
        item('🎲 Say the word “pond”.', 'pond', ['pit', 'pan'], '💧'),
        item('🎲 Spell “duck”.', 'd-u-c-k', ['d-o-c-k', 'd-u-c-e'], '🦆'),
        item('🎲 Use “swim” in a sentence.', 'The fish swim.', ['The fish eats.', 'The fish sleeps.'], '🏊'),
        item('🎲 Act out “splash”.', 'splash', ['swim', 'dive'], '💦'),
        item('🎲 Say two animals with wings.', 'duck and frog', ['cat and dog', 'cow and pig'], '🪽'),
      ],
    },
    caregiverNote: 'Play the board game at home with a real die — same rules, same squares.',
    teacherNote: 'Describe the board square by square so it can be drawn on paper in one minute.',
  };
}

function rolePlayDemo(): DemoParts {
  return {
    title: 'At the Pet Shop',
    durationMinutes: 20,
    objectives: ['Ask for an animal', 'Two roles', 'Choose what happens next'],
    materials: ['A toy till or a box', 'Animal pictures'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Roles', 3, 'I am the shopkeeper, you are the customer. You want a pet!', 'Chooses a role.', 'Two roles only.'),
      step('2 · The scene', 10, 'Customer: “Can I have a duck, please?” Shopkeeper: “Yes, here you are!”', 'Uses the sentence frames.', 'Three frames per role to lean on.'),
      step('3 · The twist', 5, 'The duck splashes the shop! What happens next? You choose!', 'Chooses what happens next.', 'The child owns the ending.'),
      step('4 · Swap', 2, 'Now swap — you are the shopkeeper!', 'Swaps roles.', 'Swapping doubles the speaking.'),
    ],
    game: {
      name: 'Pet Shop Role-play',
      howToPlay: 'Two roles, three sentence frames each, one twist the child chooses.',
      winCondition: 'The scene is acted twice, roles swapped.',
      turns: 2,
      offline: 'A box as the counter and animal pictures.',
      items: [
        item('🎭 You are the customer. Ask for the duck.', 'Can I have a duck, please?', ['Here you are.', 'Thank you.'], '🦆'),
        item('🎭 You are the shopkeeper. Answer.', 'Yes, here you are.', ['Can I have a duck?', 'Goodbye.'], '🏪'),
        item('🎭 Ask for the frog now.', 'Can I have a frog, please?', ['Here you are.', 'No, thank you.'], '🐸'),
        item('🎭 The twist — what happens?', 'The frog jumps!', ['The frog sleeps.', 'The frog sings.'], '🐸'),
        item('🎭 Say thank you.', 'Thank you!', ['You are welcome.', 'See you.'], '🙏'),
        item('🎭 Say goodbye.', 'Goodbye, see you soon!', ['Hello.', 'Here you are.'], '👋'),
      ],
    },
    homework: ['Act the pet shop scene again at home with a grown-up. 20 XP.'],
    caregiverNote: 'Be the customer at home and let your child be the shopkeeper. Keep each line short.',
    teacherNote: 'Keep the learner’s lines under eight words each; mark which lines are theirs.',
  };
}

function scavengerHuntDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'Find It in the House',
      durationMinutes: 12,
      objectives: ['Find five safe things', 'Say one word each time'],
      materials: ['The room'],
      words: VY_ANIMALS.slice(0, 5).map((w) => ({ ...w })),
      steps: [
        step('1 · Mission', 1, 'Let’s find things! Bring me something soft! 🧸', 'Runs and finds something.', 'Only safe things to carry.'),
        step('2 · Find 3 things', 8, 'Something blue! 💙 Something round! ⚽ Something soft! 🧸', 'Brings each thing and says a word.', 'One word each find.'),
        step('3 · Put it back', 3, 'Put it back nicely. Well done! 🎉', 'Puts things back.', 'Tidying is part of the game.'),
      ],
      game: {
        name: 'Find It',
        howToPlay: 'Say one thing to find; the child brings it and says the word.',
        winCondition: 'Five finds, every one put back.',
        turns: 5,
        offline: 'The whole game needs no screen.',
        items: [
          item('🧸 Find something soft!', 'soft', ['hard', 'blue'], '🧸'),
          item('💙 Find something blue!', 'blue', ['red', 'soft'], '💙'),
          item('⚽ Find something round!', 'round', ['flat', 'big'], '⚽'),
          item('🍎 Find something to eat!', 'food', ['toy', 'book'], '🍎'),
          item('🧦 Find something to wear!', 'clothes', ['food', 'toy'], '🧦'),
        ],
      },
      caregiverNote: 'Play “find it” at home: “find something blue”, “find something soft”. Say it in English, no translation.',
      teacherNote: 'Five safe things only, each one spoken word and one action.',
    };
  }
  return {
    title: 'Zoom Hunt',
    durationMinutes: 20,
    objectives: ['Find eight things', 'Use “I found a ___”', 'Describe where one was hiding'],
    materials: ['The house or a room'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Mission', 2, 'Find eight things, one for each pond word. Say “I found a ___”.', 'Understands the goal.', 'It ties every find to a target word.'),
      step('2 · The hunt', 14, '“I found a blue one — like a pond!” Now find something round...', 'Finds items and says the frame each time.', 'A sentence frame per item.'),
      step('3 · The last challenge', 4, 'You found it! Now tell me where it was hiding.', 'Describes the hiding place.', 'Describing position is the stretch.'),
    ],
    game: {
      name: 'Zoom Hunt',
      howToPlay: 'Find one thing per word and use the sentence frame. Finish by describing where one was hiding.',
      winCondition: 'Eight finds, each with a full sentence.',
      turns: 8,
      offline: 'No screen needed after the list is read.',
      items: [
        item('🔍 Find something that can float.', 'I found a boat.', ['I found a rock.', 'I found a shoe.'], '⛵'),
        item('🔍 Find something green.', 'I found a leaf.', ['I found a cup.', 'I found a sock.'], '🌿'),
        item('🔍 Find something round.', 'I found a ball.', ['I found a book.', 'I found a pen.'], '⚽'),
        item('🔍 Find something blue.', 'I found a towel.', ['I found a spoon.', 'I found a chair.'], '💙'),
        item('🔍 Find something you wear.', 'I found a hat.', ['I found an apple.', 'I found a key.'], '🎩'),
        item('🔍 Find something to read.', 'I found a book.', ['I found a plate.', 'I found a ball.'], '📖'),
        item('🔍 Find something soft.', 'I found a teddy.', ['I found a cup.', 'I found a stone.'], '🧸'),
        item('🔍 Find something shiny.', 'I found a coin.', ['I found a leaf.', 'I found a sock.'], '🪙'),
      ],
    },
    homework: ['Do the hunt again at home and write three of your sentences. 20 XP.'],
    caregiverNote: 'Join the hunt and ask “where was it hiding?” — the describing sentence is the goal.',
    teacherNote: 'Every item ties to a target word or a colour, with a sentence frame.',
  };
}

function storyAdventureDemo(): DemoParts {
  return {
    title: 'The Dark Cave',
    durationMinutes: 25,
    objectives: ['Predict what happens next', 'Choose a path', 'Retell the ending'],
    materials: ['The story on screen'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Decision 1', 8, 'The duck sees a dark cave. Peek inside, or run to the pond? You choose!', 'Chooses one of two paths.', 'Both paths are safe.'),
      step('2 · Decision 2', 9, 'A shiny stone glows. Pick it up, or call your friends?', 'Chooses again.', 'Both choices keep the story going.'),
      step('3 · The ending', 8, 'Great choice! The duck finds a friend and they swim home. The end. 🎉', 'Retells how it ended.', 'All paths end happy and reuse the words.'),
    ],
    game: {
      name: 'Choose the Path',
      howToPlay: 'Pick what happens next — both options are safe, and both keep the story going.',
      winCondition: 'The story reaches a happy ending the child can retell.',
      turns: 3,
      offline: 'Two fingers up or down for each choice, then tell that branch.',
      items: [
        item('🗺️ The duck sees a dark cave. What should we do?', 'Peek inside carefully', ['Run back to the pond', 'Go to sleep'], '🦆'),
        item('🗺️ A shiny stone glows in the cave!', 'Pick it up gently', ['Leave it alone', 'Throw it away'], '💎'),
        item('🗺️ Someone is inside! What now?', 'Say hello', ['Run away', 'Hide'], '👋'),
      ],
    },
    homework: ['Draw your favourite path and tell the story. 15 XP.'],
    caregiverNote: 'Ask your child to tell you their story path — and why they chose it.',
    teacherNote: 'Never punish a choice; every branch returns to the same next scene.',
  };
}

function lessonPlanDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'Plan: One Word, One Song',
      durationMinutes: 12,
      objectives: ['Teach one word', 'Keep the child moving'],
      materials: ['Duck toy', 'Songs', 'Space to move'],
      words: VY_ANIMALS.slice(0, 4).map((w) => ({ ...w })),
      steps: [
        step('1 · Minute by minute', 4, 'Hello song → duck → find the duck → goodbye song.', 'Follows the same routine as last week.', 'If the child runs off, do the action yourself and wait.'),
        step('2 · Watch for', 4, 'Does the child point at the duck? Does the child say “duck” once?', 'Shows understanding by pointing or saying one word.', 'If they cry or lose interest, stop, clap, and end on the goodbye song.'),
        step('3 · Finish well', 4, 'Whatever we covered, we finish on the goodbye song and a high five. 🎉', 'Gets a high five.', 'Finishing happy matters more than coverage.'),
      ],
      caregiverNote: 'Continue the hello and goodbye songs at home so the routine holds.',
      teacherNote: 'The exact words to say are in each step above. If the child runs off, do the action and wait — do not chase or repeat louder.',
    };
  }
  return {
    title: 'Plan: Pond Lesson',
    durationMinutes: 40,
    objectives: ['Timings and scripts', 'Three errors to listen for', 'Plan for strong and weak learners'],
    materials: ['Word cards', 'Story', 'Game'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Timings', 5, 'Review 3 min · words 8 · story 12 · game 12 · wrap 5. Brain break after the story.', 'Follows the flow.', '60-second break placed after the story, explicitly.'),
      step('2 · Errors to listen for', 10, '“He swim” → recast: “He swims.” “The duck in pond” → “The duck is in the pond.”', 'Hears the recast and repeats.', 'Recast, never correct-and-stop.'),
      step('3 · Differentiation', 10, 'Stronger: add “swimming” sentences. Weaker: two words, two pictures.', 'Works at their own level.', 'Same task, different support.'),
      step('4 · Wrap', 15, 'Two sentences the learner could not say before, said aloud.', 'Says two new sentences.', 'End with the win.'),
    ],
    caregiverNote: 'The three errors the tutor listened for are on the family note so you can help at home.',
    teacherNote: 'Recast three common errors: “He swim” → “He swims”; “The duck in pond” → “The duck is in the pond”; “The duck swim fast” → “The duck swims fast”.',
  };
}

function familyGuideDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'Family Guide: Bath Words',
      durationMinutes: 10,
      objectives: ['Five everyday moments', 'Exact English phrases', 'One thing NOT to do'],
      materials: ['A fridge note'],
      words: VY_ROUTINE.map((w) => ({ ...w })),
      steps: [
        step('1 · Bath time', 2, 'Say: “Wash your hands!” (wash yor handz)', 'Hears it and does it.', 'Do not translate word-for-word.'),
        step('2 · Breakfast', 2, 'Say: “Time to eat!” (tahym tu eet)', 'Hears it and eats.', 'Keep it to one short phrase.'),
        step('3 · The car', 2, 'Say: “Look! A duck!” (look, a duk)', 'Looks and points.', 'Point at the real world.'),
        step('4 · Nappy change', 2, 'Say: “All done!” (awl dun)', 'Hears the routine phrase.', 'Same phrase every time.'),
        step('5 · Bedtime', 2, 'Say: “Goodnight, sleep well.” (good-nyt, sleep wel)', 'Says goodnight.', 'Do NOT quiz the child or ask them to perform.'),
      ],
      caregiverNote: 'Five phrases, one for each part of the day. Say them in English, simply and often. Never quiz the child or translate word-for-word.',
      teacherNote: 'Hand this page to the family. One page, no jargon.',
    };
  }
  return {
    title: 'Family Guide: The Pond Week',
    durationMinutes: 15,
    objectives: ['Three 10-minute activities', 'One thing to listen for', 'How to praise effort'],
    materials: ['A fridge note'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Activity 1', 5, 'Draw a pond together and label five things in English.', 'Draws and labels.', 'Any English label counts.'),
      step('2 · Activity 2', 5, 'Watch a pond clip and name three things you can see.', 'Watches and names.', 'Listen for “swim” and “splash”.'),
      step('3 · Activity 3', 5, 'Play the pond game together on the phone.', 'Plays with family.', 'Take turns; let the child win sometimes.'),
    ],
    caregiverNote: 'This week: draw a pond, watch a clip, play the game. Listen for the words “swim”, “splash” and “wing”. Praise the effort — “you tried again and fixed it” — not “clever”.',
    teacherNote: 'Written at adult reading level; the child’s words are in bold on the printed page.',
  };
}

function listeningSongDemo(band: KidAgeBand): DemoParts {
  if (band === 'veryYoung') {
    return {
      title: 'The Hello Chant',
      durationMinutes: 8,
      objectives: ['Join the chant', 'One action per line'],
      materials: ['The chant on screen'],
      words: VY_ROUTINE.slice(0, 6).map((w) => ({ ...w })),
      steps: [
        step('1 · Listen', 2, 'Listen: “Hello, hello, how are you?” 🎵', 'Listens to the chant once.', 'Play it through before singing.'),
        step('2 · Join in', 4, 'Now sing with me and wave! 👋', 'Sings and waves.', 'One action per line.'),
        step('3 · Change one word', 2, 'Now sing it with your name: “Hello, hello, hello {name}!”', 'Sings their own name.', 'One word changes — that is the learning.'),
      ],
      lyrics: ['Hello, hello, how are you? 👋', 'I am happy, how are you? 😀', 'Clap your hands and sing along 👏', 'Hello, hello, sing our song! 🎵'],
      chantRhythm: 'clap-clap-pause-clap',
      game: {
        name: 'Sing & Do',
        howToPlay: 'Sing each line and do the action; press the button to hear it again.',
        winCondition: 'The whole chant sung once through with actions.',
        turns: 4,
        offline: 'Sing it with no screen at all.',
        items: [
          item('🎵 Sing and wave!', 'Hello, hello', ['Goodbye', 'Sit down'], '👋'),
          item('🎵 Sing and clap!', 'Clap your hands', ['Stamp your feet', 'Sit down'], '👏'),
          item('🎵 Sing and smile!', 'I am happy', ['I am sad', 'I am sleepy'], '😀'),
          item('🎵 Sing the last line!', 'Sing our song', ['Go to sleep', 'Wave goodbye'], '🎵'),
        ],
      },
      caregiverNote: 'Sing the hello chant at home this week with the wave. Maybe sing it with your child’s name.',
      teacherNote: 'Keep every line singable by an adult with no training, 4–6 words, one action.',
    };
  }
  return {
    title: 'The Pond Song',
    durationMinutes: 15,
    objectives: ['Sing a verse and chorus', 'Personalise two lines', 'A listening task per verse'],
    materials: ['The song on screen'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Listen', 4, 'Listen to the whole song once. Which words can you hear?', 'Listens and spots pond words.', 'Listen first, sing second.'),
      step('2 · Join the chorus', 6, 'Sing the chorus with me: “Down at the pond, the duck says quack!” 🎵', 'Sings the chorus.', 'Chorus is the easy win.'),
      step('3 · Make it yours', 5, 'Change one line to your name and one to your pet.', 'Sings their own version.', 'Personalising is the retention trick.'),
    ],
    lyrics: [
      'Down at the pond, the duck says quack 🦆',
      'Swim, swim, splash! There and back 💦',
      'Frog on a lily, sun in the sky ☀️',
      'Down at the pond, wave bye-bye! 👋',
      'Down at the pond, ___(your pet) ___ 🐾',
      'Down at the pond, with ___(your name) ___ 🌟',
    ],
    chantRhythm: 'splash-splash-pause-splash',
    game: {
      name: 'Pond Karaoke',
      howToPlay: 'Sing a line together, then answer one listening question about it.',
      winCondition: 'The song sung through, with the child’s own two lines.',
      turns: 6,
      offline: 'Sing it with the words on the board.',
      items: [
        item('🎧 What does the duck say?', 'quack', ['moo', 'meow'], '🦆'),
        item('🎧 Who sits on a lily?', 'the frog', ['the duck', 'the fish'], '🐸'),
        item('🎧 What is in the sky?', 'the sun', ['the moon', 'a boat'], '☀️'),
        item('🎧 What do we say at the end?', 'bye-bye', ['hello', 'thank you'], '👋'),
        item('🎧 Your pet line!', 'your pet’s name', ['a number', 'a colour'], '🐾'),
        item('🎧 Your name line!', 'your name', ['a number', 'a colour'], '🌟'),
      ],
    },
    homework: ['Sing the pond song to your family. 15 XP.'],
    caregiverNote: 'Sing the pond song together this week — let your child fill in their own name and pet.',
    teacherNote: 'Two lines the learner can personalise are the memory hooks.',
  };
}

function videoStoryDemo(): DemoParts {
  return {
    title: 'The Duck and the Pond',
    durationMinutes: 15,
    objectives: ['Watch a 60-second story', 'Repeat two lines', 'Answer three questions'],
    materials: ['The story on screen'],
    words: Y_POND.map((w) => ({ ...w })),
    steps: [
      step('1 · Watch', 5, 'Watch the little story. On-screen words are only four words at a time.', 'Watches the 6–8 short shots.', 'Watch once, silently.'),
      step('2 · Say it', 5, 'Repeat after me: “The duck swims.” “Splash!”', 'Repeats the two marked lines.', 'Two shots to repeat aloud, marked.'),
      step('3 · Talk', 5, 'Three questions: Where is the duck? What does she do? How does she feel?', 'Answers three questions.', 'Ask after watching, never during.'),
    ],
    game: {
      name: 'Story Watch and Tell',
      howToPlay: 'Watch a short shot, then answer one question about it.',
      winCondition: 'Three questions answered about the story.',
      turns: 3,
      offline: 'Tell the story with three pictures instead.',
      items: [
        item('🎬 Where is the duck?', 'in the pond', ['in a tree', 'on a boat'], '🦆'),
        item('🎬 What does she do?', 'she swims', ['she flies', 'she sleeps'], '🏊'),
        item('🎬 How does she feel?', 'happy', ['angry', 'cold'], '😀'),
      ],
    },
    homework: ['Watch the story again and retell it in three sentences. 15 XP.'],
    caregiverNote: 'Watch the clip with your child and ask “what happened?” — three sentences is the goal.',
    teacherNote: 'Keep on-screen text to four words per shot and mark the two repeat-aloud shots.',
  };
}

  /* ── Move & Do: the TPR run sheet, with the child ending up as the boss ----------
     TPR has one honest failure mode and this lesson is built around it: the child
     DOES everything and SAYS nothing, because understanding is proved by the body.
     So the talk is engineered in three places — every command is said back in the
     input phase, the chain phase makes the child produce the order of the words, and
     the crown round hands the child the microphone: the adult obeys only English
     commands, and nothing moves until the child says it. Thirty minutes, 29 spoken
     turns, and no reading anywhere — the words are the body's. */
function movementDemo(): DemoParts {
  return {
    title: 'Jump, Clap, Freeze!',
    durationMinutes: 30,
    objectives: ['Do six English commands all by yourself', 'Say every command out loud', 'Be the boss and give the grown-up the commands'],
    materials: ['Space to jump in', 'A paper crown (or a scarf) for the boss round', 'A duck toy or one big picture', 'The real action-song clip on the phone'],
    words: TPR_COMMANDS.map((c) => ({ word: c.word, emoji: c.emoji, sayAloud: c.sayAloud, meaning: c.meaning, example: c.example })),
    steps: [
      phase(
        '1 · Stand up and shout GO!', 'HOOK', 3, 3, 3,
        'We are going to MOVE! Stand up! Stand up tall! Now shout it: GO! 🎉 Arms up! Shout it again — GO!',
        'Stands up, arms up, shouts “GO!” three times.',
        'Shout “GO!”',
        ['Can you stand up tall like a tree?', 'Who else is standing up today?', 'What shall we do first — jump or clap?'],
        ['Stamp three times and shout “stop!”', 'Reach up and touch the ceiling.', 'Freeze like a statue for five seconds.'],
        'The lesson starts with the body, not the voice — and the first English word the child says is a shout they enjoy.',
      ),
      phase(
        '2 · Warm-up talk — the action chant', 'WARM-UP TALK', 4, 4, 4,
        'Clap, clap, clap your hands! 👏 Clap, clap, clap your hands! Jump, jump, jump up high! 🦘 Now YOU choose: which one shall we sing?',
        'Claps and jumps with the chant, then names the action they want next.',
        'Sing “clap, clap, clap!” with me.',
        ['Which part is your favourite?', 'Can you do it fast?', 'Who sings the next one — you or me?'],
        ['Sing it in a whisper.', 'Sing it as a robot.', 'Let the duck do it first.'],
        'The same chant every week: the melody does the remembering, and the child’s choice is their first spoken turn.',
      ),
      {
        ...phase(
          '3 · Input — six you know, one that is new', 'INPUT', 6, 5, 8,
          'Watch me first: jump! 🦘 Jump like a frog! Now you — jump! ... Clap your hands! 👏 ... Sit down. Stand up. Turn around. Touch your nose. 👃 And here is the NEW one: STRETCH! 🙆 Stretch up high like a tall tree!',
          'Does every command straight away, and says the command word after you each time.',
          'Say the command with me: “stretch!”',
          ['Was “stretch” easy or hard?', 'Which one makes you tallest?', 'What else can we stretch in this room?'],
          ['Do all seven in slow motion.', 'Do all seven as fast as you can.', 'Say the command, then do it twice.'],
          'Model every command yourself, twice and big, before the child is asked. Six known plus one new is why they can answer instantly.',
        ),
        /* This is the ONE phase that opens the engine: the movement game lives inside
           the run sheet rather than swallowing the whole session. */
        drill: true,
      },
      phase(
        '4 · Guided movement — the chain', 'GUIDED TALK', 6, 5, 6,
        'Now two things together! Listen: CLAP, then JUMP! 👏🦘 Your turn: clap... then jump! Again, faster: clap-jump!',
        'Does two commands in the right order, then says the order aloud.',
        'Say it back: “clap, then jump”.',
        ['Which one came first?', 'Can you make your own two-in-a-row?', 'What should I do — you tell me.'],
        ['Do the chain in a whisper, then in a shout.', 'Do the chain backwards!', 'Do the chain as a robot.'],
        'Two steps is the stretch for your fours and fives; a two-year-old does one at a time and that is exactly right.',
      ),
      phase(
        '5 · Free production — YOU are the boss', 'FREE PRODUCTION', 7, 6, 6,
        'Now you are the boss! 👑 Put on the crown. You say “jump!” and I MUST jump. You say “sit down!” and I sit. If I do it wrong, say it again and I will fix it!',
        'Gives the adult commands in English, and repeats a command when the adult “malfunctions”.',
        'Say “jump!”, “clap!”, “sit down!”',
        ['Which command is your favourite to give me?', 'What should I do next?', 'Shall I do it fast or slow?'],
        ['Give me three commands in a row.', 'Make me do the chain: “clap, then jump!”', 'Give the duck a command too.'],
        'Nothing moves until the child says the command — that single rule is why this phase is where the talking happens.',
      ),
      phase(
        '6 · Freeze and goodbye', 'WRAP', 4, 4, 2,
        'Dance, dance, dance... FREEZE! 🧊 Now say all our commands one last time, very slowly: jump... clap... sit down... stand up... turn around... touch your nose... stretch. Now wave: bye-bye! 👋',
        'Freezes, says the commands one last time, waves goodbye.',
        'Say “goodbye, duck!” and one command.',
        ['Which command was your favourite today?', 'What will you teach at home?', 'Shall we do it again tomorrow?'],
        ['Do the freeze game twice more.', 'Say goodbye to each toy in turn.', 'Whisper all seven commands.'],
        'Always finish on movement they enjoy — the last thirty seconds decide whether they come back.',
      ),
    ],
    game: {
      name: 'Do What I Say',
      howToPlay: 'Press ▶ and the big screen shows each command with a tick. Say the command twice, do it yourself, and let the child copy — the ticks are for you, not for the child.',
      winCondition: 'All seven commands done, and then the child gives YOU one back.',
      turns: 7,
      offline: 'No screen needed at all — the commands ARE the game.',
      items: [
        item('🦘 Jump like a frog!', 'jump', ['sit down', 'stand up'], '🦘'),
        item('👏 Clap your hands!', 'clap', ['turn around', 'stretch'], '👏'),
        item('🪑 Sit down on the floor.', 'sit down', ['stand up', 'jump'], '🪑'),
        item('🧍 Stand up tall like a tree!', 'stand up', ['sit down', 'clap'], '🧍'),
        item('🌀 Turn around, all the way!', 'turn around', ['touch your nose', 'stretch'], '🌀'),
        item('👃 Touch your nose!', 'touch your nose', ['clap', 'turn around'], '👃'),
        item('🙆 Stretch up high — our NEW one!', 'stretch', ['sit down', 'jump'], '🙆'),
      ],
    },
    lyrics: [
      'Clap, clap, clap your hands 👏',
      'Clap, clap, clap your hands 👏',
      'Jump, jump, jump up high 🦘',
      'Now sit down and touch the sky ⬆️',
      'Stand up tall and turn around 🌀',
      'Stretch up high — don’t make a sound! 🤫',
    ],
    chantRhythm: 'clap-clap-pause-jump',
    scene: {
      title: 'A real child jumping in a real room',
      photoQuery: 'child jumping in living room',
      clipTitle: 'A real action song to move to 🤸',
      clipUrl: 'https://www.youtube.com/results?search_query=super+simple+songs+action+song+jump+clap',
      listenFor: 'Every time you hear “jump”, jump on the spot — then sit down fast!',
    },
    mission: {
      title: 'Be the boss at home',
      realWorld: 'This week your child gives a grown-up five English commands and the grown-up has to obey — in the kitchen, in the garden, anywhere with a bit of space.',
      sayIt: '“Jump!” · “Clap!” · “Sit down!” · “Stand up!” · “Turn around!”',
      steps: ['Show a grown-up the crown from the lesson', 'Give five commands in English', 'The grown-up does every single one (no cheating!)', 'Then swap over and let the grown-up give one back'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Flop down like a tired cat and breathe three slow breaths. 😴',
        'Sit on the floor and stretch your arms out like a starfish. ⭐',
        'Blow five big bubbles and put up one finger for each. 🫧',
      ],
      exitTicket: [
        '“jump!” and “clap!” said with no help',
        '“stretch” — today’s new command',
        'One command the child gave YOU in the crown round',
      ],
      nextTime: 'Next time: same seven commands, but your child gives every single one 👑 — plus one new command, “spin”.',
    },
    movement: {
      commands: tprLadder(),
      newCommand: 'stretch',
      speedPlay: ['Fast! ⚡', 'Slow like a turtle 🐢', 'Whisper 🤫', 'Robot voice 🤖'],
      bossRound: ['jump!', 'clap!', 'sit down!', 'stand up!', 'turn around!'],
    },
    talkGoal: 29,
    caregiverNote: 'Ask your child to be the boss this week: five English commands and you must obey. Jump, clap and sit down are plenty — do not test, just play. 👑',
    teacherNote: 'Run sheet: HOOK 3 · WARM-UP TALK 4 · INPUT 6 · GUIDED TALK 6 · FREE PRODUCTION 7 · WRAP 4. The body learns first — never ask for a word before you have seen the action. The talking comes from say-it-to-move-it and the crown round: 29 turns, none of them a test.',
  };
}

  /* ── Routines & Words: the three real moments of the day -----------------------
     The one thing this kind does that no other can: it hands the WEEK to the family.
     A routine lesson only works if the same words come back at the same real moments
     every day, said by the parent — so the lesson carries the parent's exact script
     (word for word), a say-it-like-this hint for each word, and one line that is said
     the same way at every moment so the child hears the routine coming.

     Thirty minutes, six phases, 29 spoken turns, and the child ends up running the
     whole routine on the teddy — which is why the free-production phase is the drill
     and opens the routine game on the big screen. */
function routineDemo(): DemoParts {
  return {
    title: 'Bath, Food and Bed',
    durationMinutes: 30,
    objectives: ['Say the three words of your day', 'Do the routine on teddy by yourself', 'Say “sleepy” when you are ready for bed'],
    materials: ['A teddy or a doll to do the routine on', 'A real cup and spoon (or a picture)', 'A towel or a small blanket', 'The routine clip on the phone'],
    words: VY_ROUTINE_WORDS.map((w) => ({ ...w })),
    steps: [
      phase(
        '1 · The cue — it is time!', 'HOOK', 3, 3, 3,
        'Listen! 👀 Shhh... say it with me: TIME! It is TIME! 🚿 Time to wash! Say it again — TIME!',
        'Shouts “TIME!” and claps, ready for the routine.',
        'Shout “TIME!”',
        ['Is it time to play or time to wash?', 'What are we going to do first?', 'Shall we do it fast or slow?'],
        ['Whisper “time…” then shout it.', 'Stamp three times: time, time, time!', 'Let teddy say it too.'],
        'The cue word is the whole trick: the same word, the same way, means the routine is starting — and the child says it before anything else happens.',
      ),
      phase(
        '2 · The same hello', 'WARM-UP TALK', 4, 4, 4,
        'Hello, hello, hello to you! 👋 Hello, hello, how are you? Wash, eat, sleep — those are our three! Which one shall we do first?',
        'Waves hello, then names one of the three words.',
        'Say “hello!” and one word: “wash” or “eat” or “sleep”.',
        ['Who else is here today?', 'Which one do you like best?', 'Who should wear the towel — you or teddy?'],
        ['Sing the hello in a whisper.', 'Let teddy wave hello first.', 'Count the words on your fingers.'],
        'The same hello every lesson, word for word — the melody and the sameness are what make the week’s routine feel safe.',
      ),
      phase(
        '3 · The three moments, one new word', 'INPUT', 6, 5, 8,
        'Look! 🧼 We wash our hands. Wash, wash, wash! Now you — wash! ... 🍎 Time to eat! Eat, eat! ... 🛏️ Shhh... and then sleep. Sleep, sleep. And here is a NEW word: SLEEPY 💤. Say it: sleepy. Teddy is sleepy!',
        'Does each action, says each word, and copies “sleepy” with a big yawn.',
        'Say the word with me: “sleepy”.',
        ['Which one makes you clean?', 'Who is sleepy — you or teddy?', 'What do we do after we eat?'],
        ['Do all three in slow motion.', 'Do all three as fast as you can.', 'Say the word, then do the action twice.'],
        'Five known words plus ONE new one — “sleepy” is the new one, because it lets the child answer instead of only obeying.',
      ),
      phase(
        '4 · What comes next? — the chant', 'GUIDED TALK', 6, 5, 6,
        'Sing with me: wash, wash, wash your hands! 🧼 Wash, wash, wash your… HANDS! Your turn: eat, eat, eat your…? And then: sleep, sleep, sleepy…?',
        'Sings the chant and finishes each line with the missing word.',
        'Finish the line: “wash, wash, wash your ___”.',
        ['What comes first — wash or eat?', 'What comes last?', 'Can you sing it with teddy’s name in it?'],
        ['Sing it in a robot voice.', 'Sing it with your hands.', 'Let teddy sing the last line.'],
        'The child finishing the line is the biggest talking lever a routine has — the gesture alone tells them which word is missing.',
      ),
      {
        ...phase(
          '5 · You do the whole routine for teddy', 'FREE PRODUCTION', 7, 6, 6,
          'Now YOU are the grown-up! 🧸 Teddy is dirty. What do we say? ... “Wash!” 🧼 Now teddy is hungry. What do we say? ... “Eat!” 🍎 And now teddy is sleepy... what do we say? ... “Sleep!” 🛏️',
          'Runs the whole routine on teddy, saying each word before each step.',
          'Say “wash!”, “eat!”, “sleepy!” — you are the grown-up now.',
          ['What does teddy need first?', 'Is teddy still sleepy?', 'What shall we do with teddy tomorrow?'],
          ['Do it again in a whisper.', 'Let teddy be the grown-up and you be the child.', 'Add “again!” and do the whole routine twice.'],
          'The child gives the words for the routine they already know by heart — which is exactly what makes them come out of the child and not the adult.',
        ),
        /* This is the ONE phase that opens the engine: the routine game lives inside
           the run sheet rather than swallowing the whole session. */
        drill: true,
      },
      phase(
        '6 · The same goodnight, every time', 'WRAP', 4, 4, 2,
        'Shhh... 🌙 Sleep, sleep, sleepy head. Goodnight, teddy. Goodnight! Wave bye-bye! 👋 What do we say tomorrow?',
        'Says goodnight to teddy, waves bye-bye and says one word from today.',
        'Say “goodnight, teddy!” and one word.',
        ['Which word was your favourite?', 'What will you say at bath time tonight?', 'Shall we do the same tomorrow?'],
        ['Sing the goodnight twice.', 'Say goodnight to each toy in turn.', 'Whisper the whole routine one last time.'],
        'End the same way every single time — the goodnight is the signal that the routine is finished, and it is the line the family will repeat tonight.',
      ),
    ],
    game: {
      name: 'Teddy’s Routine',
      howToPlay: 'Press ▶ and the big screen shows the three real moments with a tick each. Say the words in the same order every time, do the action yourself, and let the child copy — the ticks are for you, not for the child.',
      winCondition: 'The whole routine done, and then the child runs it for teddy all by themselves.',
      turns: 3,
      offline: 'No screen needed at all — a real teddy, a real cup and a real blanket.',
      items: [
        item('🧼 Teddy is dirty. What do we say?', 'wash', ['eat', 'sleep'], '🧼'),
        item('🍎 Teddy is hungry. What do we say?', 'eat', ['wash', 'bye'], '🍎'),
        item('🛏️ Teddy is sleepy. What do we say?', 'sleep', ['hello', 'eat'], '🛏️'),
      ],
    },
    lyrics: [
      'Wash, wash, wash your hands 🧼',
      'Wash, wash, wash your hands 🧼',
      'Eat, eat, eat your food 🍎',
      'Eat, eat, eat your food 🍎',
      'Sleep, sleep, sleepy head 🛏️',
      'Goodnight, teddy — off to bed! 🌙',
    ],
    chantRhythm: 'wash-eat-pause-sleep',
    scene: {
      title: 'The three real places these words live',
      photoQuery: 'child washing hands bathroom sink',
      clipTitle: 'A real hand-washing song to sing along 🚿',
      clipUrl: 'https://www.youtube.com/results?search_query=super+simple+songs+this+is+the+way+we+wash+our+hands',
      listenFor: 'Wash your hands with them every time you hear “wash” — the singing is what makes it stick.',
    },
    mission: {
      title: 'Same words, same moments, all week',
      realWorld: 'Every day this week, at bath time, at food time and at bedtime, the grown-up says the same English words first — and does the action while saying them. No translation, no testing, no device.',
      sayIt: '“Wash, wash, wash your hands!” · “Time to eat!” · “Shhh... sleepy head.”',
      steps: ['Write the three lines on a card and put it by the sink', 'Say the line at the real moment, every day for a week', 'Do the action as you say it — the child joins when they are ready', 'When the child says one word back, say it again and keep going'],
    },
    run: {
      targetMinutes: 30,
      brainBreaks: [
        'Flop down like a sleepy teddy and breathe three slow breaths. 💤',
        'Shake your hands dry like you just washed them, then sit down. 🧼',
        'Yawn three big yawns and stretch your arms. 🌙',
      ],
      exitTicket: [
        '“wash!” said at the sink',
        '“eat!” said at the table',
        '“sleepy” — today’s new word, said with a yawn',
      ],
      nextTime: 'Next time: the same three words, but the child gives the orders 🧸 — and one new one, “again”.',
    },
    media: ROUTINE_MEDIA.map((m) => ({ ...m })),
    routine: {
      name: 'Bath, Food and Bed',
      moments: ROUTINE_MOMENTS(),
      sameLine: 'It is TIME!',
      fillIn: 'wash, wash, wash your ___',
      /* One hint per word, plus the one word that turns up inside the lines — a parent
         who does not speak English needs a rhyme they already know, not phonetics. */
      pronunciation: [
        { word: 'hello', hint: '“heh-LOW” — short first part, loud and long second part' },
        { word: 'wash', hint: '“wosh” — rhymes with “posh”, one short round sound, not “warsh”' },
        { word: 'eat', hint: '“eet” — a long ee, like the end of “feet”; the t is soft' },
        { word: 'sleep', hint: '“sleep” — the same long ee as “eat”, then a soft p' },
        { word: 'bye', hint: '“bye” — rhymes with “my” and “high”' },
        { word: 'sleepy', hint: '“SLEE-pee” — the first part is long and loud, the second is quiet and short' },
        { word: 'hands', hint: '“handz” — the s sounds like a z at the end' },
      ],
    },
    talkGoal: 29,
    caregiverNote: 'Write the three lines on a card by the sink: “Wash, wash, wash your hands!” at bath time, “Time to eat!” at food time, “Shhh... sleepy head” at bedtime. Say the line first and do the action — never test, never translate. Say it every day for a week and your child will say it back to you. 💤',
    teacherNote: 'Run sheet: HOOK 3 · WARM-UP TALK 4 · INPUT 6 · GUIDED TALK 6 · FREE PRODUCTION 7 · WRAP 4. The cue word opens every session and the same goodnight closes it. The free-production phase is the drill — the child runs the whole routine on teddy on the big screen. 29 spoken turns, and the family card carries the week.',
  };
}

/* The main door — pick the shape by kind, band and child ------------------- */

function buildDemoParts(kindId: string, band: KidAgeBand, name: string): DemoParts {
  switch (kindId) {
    /* The nine method models each exist twice — one very-young version and one young
       version — and the demo picks by band. */
    case 'tprStory':
      return band === 'veryYoung' ? tprStoryDemoVY() : tprStoryDemoY();
    case 'circleTime':
      return band === 'veryYoung' ? circleTimeDemoVY(name) : circleTimeDemoY();
    case 'esaJourney':
      return band === 'veryYoung' ? esaDemoVY() : esaDemoY();
    case 'tbltMission':
      return band === 'veryYoung' ? tbltDemoVY() : tbltDemoY();
    case 'tttBoss':
      return band === 'veryYoung' ? tttDemoVY() : tttDemoY();
    case 'scaffoldSteps':
      return scaffoldDemo(band);
    case 'storyWorld':
      return storyWorldDemo(band);
    case 'fastFun':
      return fastFunDemo(band);
    case 'talkChat':
      return talkChatDemo(band);
    case 'miniLesson':
      return miniLessonDemo(band, name);
    case 'storyLesson':
      return storyLessonDemo(band);
    case 'phonicsLesson':
      return phonicsDemo(band);
    case 'movementLesson':
      return movementDemo();
    case 'routineLesson':
      return routineDemo();
    case 'worksheet':
      return worksheetDemo(band);
    case 'homeworkQuest':
      return homeworkQuestDemo(band);
    case 'pictureQuiz':
      return pictureQuizDemo(band);
    case 'flashcards':
      return flashcardsDemo(band);
    case 'arcadeGame':
      return arcadeDemo(band);
    case 'memoryMatch':
      return memoryDemo();
    case 'boardGame':
      return boardGameDemo();
    case 'rolePlay':
      return rolePlayDemo();
    case 'scavengerHunt':
      return scavengerHuntDemo(band);
    case 'storyAdventure':
      return storyAdventureDemo();
    case 'lessonPlan':
      return lessonPlanDemo(band);
    case 'familyGuide':
      return familyGuideDemo(band);
    case 'listeningSong':
      return listeningSongDemo(band);
    case 'videoStory':
      return videoStoryDemo();
    default:
      return miniLessonDemo(band, name);
  }
}

/**
 * A finished lesson for this kind and band, ready to play.
 *
 * The words, steps, game and media are all real content, and the media links are
 * all SEARCH pages on free, kid-safe sites — which is the only honest kind of demo
 * link, because it still works when a specific video has been taken down.
 */
export function demoLessonFor(kindId: string, band: KidAgeBand, learner?: Learner): KidLesson {
  const name = learner?.name?.trim() || 'our learner';
  const parts = buildDemoParts(kindId, band, name);
  const bandLabel = band === 'veryYoung' ? 'Very Young' : 'Young';

  return {
    title: parts.title,
    kind: kindId,
    band,
    ageRange: band === 'veryYoung' ? '2-5' : '5-12',
    durationMinutes: parts.durationMinutes,
    objectives: parts.objectives,
    materials: parts.materials,
    words: parts.words,
    steps: parts.steps,
    game: parts.game,
    lyrics: parts.lyrics,
    chantRhythm: parts.chantRhythm,
    worksheet: parts.worksheet,
    homework: parts.homework,
    caregiverNote: parts.caregiverNote,
    teacherNote: parts.teacherNote ?? `This is a built-in example for the ${bandLabel} band — press ▶ Test to see how it plays, then ✏️ Edit to make it yours.`,
    media: parts.media ?? mediaForBand(band),
    /* The session pieces. They are optional on the type, so a kind without them
       still plays — but a lesson with them is a class rather than a set of screens. */
    scene: parts.scene,
    mission: parts.mission,
    run: parts.run ?? { targetMinutes: parts.durationMinutes },
    talkGoal: parts.talkGoal,
    story: parts.story,
    phonics: parts.phonics,
    movement: parts.movement,
    routine: parts.routine,
    circle: parts.circle,
    sheet: parts.sheet,
    quest: parts.quest,
    quiz: parts.quiz,
    deck: parts.deck,
    storyWalk: parts.storyWalk,
  };
}

/** True when a finished example exists for this kind and band. */
export const hasDemoLesson = (kindId: string, band: KidAgeBand): boolean =>
  Boolean(demoLessonFor(kindId, band));
