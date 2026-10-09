/* ════════════════════════════════════════════════════════════════════════════
   🧩 KIDS LESSON CREATOR — the catalogue, the age bands, and the JSON contract
   ════════════════════════════════════════════════════════════════════════════

   The adult dashboard's Lesson Creator offers a long list of lesson *kinds*; the tutor
   picks one, copies a prompt into an AI, pastes the JSON the AI returns, and renders it
   into a real lesson. This is the same mechanism for the young-learner profiles, with
   two differences that matter:

   1. **The bands are the ones we actually teach.** The adult creator is built around
      CEFR levels. A four-year-old has no CEFR level, so every kind declares which of
      our two young-learner bands it suits — 2-5 (very young) and 5-12 (young) — and the
      prompt is written differently for each (see `lessonCreatorPrompt.ts`).

   2. **A kind is a contract, not a name.** Every kind says which pieces of the JSON it
      should come back with (steps? a game? lyrics? cut-out printables?), so the paste box
      can tell a tutor *what* is wrong with a reply instead of just "invalid JSON", and
      the preview knows what to draw.

   Everything here is data — no React — so the prompt file and the tab both read it.
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * The two bands the kids dashboard teaches in.
 *
 * The split is deliberately not "preschool / primary": the pedagogical line that decides
 * what a lesson can even *be* is pre-literacy. Under about five, a child cannot read the
 * instructions, cannot write an answer, and cannot hold a rule in working memory long
 * enough to lose a game on purpose — so a lesson is what the adult and child DO together,
 * in minutes, with the language carried by voice, movement and one or two words. From
 * five up, reading and writing arrive, sessions can be ten to fifteen minutes, and games,
 * stories and spaced review start doing the heavy lifting.
 */
export type KidAgeBand = 'veryYoung' | 'young';

export interface KidBandProfile {
  id: KidAgeBand;
  label: string;
  ages: string;
  emoji: string;
  /** One line for the picker. */
  tagline: string;
  /** How long a session really holds attention at this age. */
  sessionMinutes: string;
  /** The target language load of one session. */
  languageLoad: string;
  /** What the child must never be asked to do at this age. */
  never: string[];
  /** What the design leans on instead. */
  leansOn: string[];
  color: string;
}

export const KID_BANDS: Record<KidAgeBand, KidBandProfile> = {
  veryYoung: {
    id: 'veryYoung',
    label: 'Very Young',
    ages: '2-5',
    emoji: '🧸',
    tagline: 'Play, song and movement — no reading, no writing, no losing',
    sessionMinutes:
      'a FULL 30 minutes, but as 8-10 short blocks of 2-4 minutes with a movement break between them — thirty minutes of a small child is thirty short turns, never one long sit',
    languageLoad: '1-2 target words per session, plus everyday classroom words ("look", "give me", "again")',
    never: [
      'Reading words on screen (pre-literacy: a printed word is a picture, not a message)',
      'Writing, tracing or typing an answer',
      'Timers, scores, elimination, or a game a child can lose in front of others',
      'More than two new words in one session — three is overload at this age',
      'Long verbal instructions: one sentence, one action',
    ],
    leansOn: [
      'Songs, chants and rhymes with actions (the melody is the memory)',
      'Total Physical Response: "touch", "jump", "give", "show me"',
      'Real objects, big pictures and faces rather than abstract icons',
      'Repetition with tiny variation — same game, one new word',
      'Sensory and pretend play (feeding, hiding, waking up, colouring)',
      'A caregiver or tutor beside the child, mirroring and praising',
    ],
    color: 'from-pink-400 to-rose-500',
  },
  young: {
    id: 'young',
    label: 'Young Learner',
    ages: '5-12',
    emoji: '🚀',
    tagline: 'Stories, games and phonics — reading starts, thinking grows',
    sessionMinutes: 'a FULL 30 minutes in six named phases, with a 60-second brain break between phases',
    languageLoad: '4-6 target words or one structure, recycled in at least three different activities',
    never: [
      'Grammar rules named before the pattern has been heard and used',
      'Copying a word more than three times — repetition without a purpose kills motivation',
      'Public ranking or "you lost" framing: compare the child to their own last attempt',
      'Pages of text with no picture, action or turn to take',
    ],
    leansOn: [
      'Story first: a small character with a problem the child can help solve',
      'Phonics and word families (c-a-t → h-a-t) before rote spelling lists',
      'Games with a fair win: everyone has several turns, the win is small and repeatable',
      'Spaced retrieval: the lesson reviews the last session in the first two minutes',
      'Movement and manipulation — tiles, cards, sorting, pointing',
      'Growth-mindset feedback ("you tried again and fixed it") rather than "clever"',
    ],
    color: 'from-indigo-400 to-violet-500',
  },
};

/** The band a given age belongs to; tutor can override in the picker. */
export function bandForAge(age?: number): KidAgeBand {
  if (typeof age !== 'number' || !Number.isFinite(age)) return 'young';
  return age <= 5 ? 'veryYoung' : 'young';
}

/**
 * Which pieces of JSON a kind is expected to bring back.
 *
 * `steps` is the skeleton every kind may use (the lesson itself, minute by minute);
 * the others are what makes the kind *that* kind. The preview draws in this order and
 * the paste box checks for the required ones.
 */
export type KidLessonPiece =
  | 'steps' | 'game' | 'lyrics' | 'words' | 'worksheet' | 'homework' | 'caregiverNote' | 'media'
  /* The hyper-realistic, 30-minute pieces. A lesson can lose any of them and still
     play, which is why they are pieces rather than part of the skeleton. */
  | 'scene' | 'mission' | 'run' | 'story' | 'phonics' | 'movement' | 'routine' | 'circle' | 'sheet' | 'quest' | 'quiz' | 'deck' | 'storyWalk';

/* ────────────────────────────────────────────────────────────────────────────
   Free media — the real, working links a lesson brings with it
   ────────────────────────────────────────────────────────────────────────────

   A lesson is more immersive when it can actually *play* something: a song on
   YouTube, a free story read aloud, a Wordwall game the class taps, a real
   photograph. The app already finds photographs and pronunciation at runtime
   (`kidFreeMedia.ts`), but a video, a song or a ready-made activity has to be a
   URL — and a made-up URL 404s in front of a class. So the AI is asked for these
   as a first-class part of the lesson, from free sources only, with a search-page
   fallback whenever it cannot be certain a specific link still exists in 2026.
*/

export type KidLessonMediaKind = 'video' | 'audio' | 'activity' | 'picture' | 'story' | 'game';

/** Where a piece of media belongs: on the tutor's screen, or at home with the family. */
export type KidLessonMediaPlace = 'class' | 'home' | 'both';

export interface KidLessonMedia {
  kind: KidLessonMediaKind;
  /** What it is, in very simple words ("A duck song we can sing"). */
  title: string;
  /** The link to open or embed. Must be a real, free, https link. */
  url: string;
  /**
   * A safe fallback when the exact link may have moved: the site's own search page.
   * The launcher shows this as a second button ("or search for it").
   */
  searchUrl?: string;
  /** Where it belongs. Defaults to the class screen. */
  where?: KidLessonMediaPlace;
  /** The step it goes with, by name — optional. */
  forStep?: string;
  /** One short line for the tutor: why this, and when to use it. */
  why?: string;
  /** The source's name ("Super Simple Songs", "Wikimedia Commons"), for the credit line. */
  source?: string;
  /** True when the AI says it is embeddable in a frame (YouTube watch links usually are). */
  embeddable?: boolean;
}

/* ────────────────────────────────────────────────────────────────────────────
   Lesson customization — the dials in Step 2
   ────────────────────────────────────────────────────────────────────────────

   The tutor no longer types what the lesson is about: the AI asks them for the
   lesson text or PDF itself (see `lessonCreatorPrompt.ts`). What the tutor sets
   instead is HOW the lesson is delivered — how much support the child gets, how
   much movement it carries, and whose voice reads it aloud on screen.

   `voiceName` never goes to the AI: it is a speechSynthesis voice for the app's
   launcher. The other two are folded into the prompt, where they are the
   difference between a lesson that fits the child and one that is merely correct.
*/

export type KidLessonDifficulty = 'gentle' | 'standard' | 'challenge';
export type KidLessonEnergy = 'calm' | 'balanced' | 'active';

export interface KidLessonCustomization {
  difficulty: KidLessonDifficulty;
  energy: KidLessonEnergy;
  /** speechSynthesis voice name for read-aloud; '' = automatic child-friendly voice. */
  voiceName: string;
}

export interface KidCustomizationOption<T extends string> {
  id: T;
  label: string;
  emoji: string;
  /** One line for the tile. */
  blurb: string;
  /** The paragraph this dial contributes to the prompt. */
  prompt: string;
}

export const KID_LESSON_DIFFICULTIES: KidCustomizationOption<KidLessonDifficulty>[] = [
  {
    id: 'gentle',
    label: 'Gentle',
    emoji: '🌱',
    blurb: 'More modelling, more repetition, no pressure to speak.',
    prompt:
      'DIFFICULTY — GENTLE: teach ONE target only (one word for 2-5; one word-set or structure for 5-12). Model everything first, and give every task a non-speaking way to succeed (point, choose, move) before any speaking. Repeat each new item at least three times inside the lesson, inside three different activities. When in doubt, cut something — do not add.',
  },
  {
    id: 'standard',
    label: 'Standard',
    emoji: '⭐',
    blurb: 'The band default: present, practise, produce.',
    prompt:
      "DIFFICULTY — STANDARD: follow the band's language load exactly — not less, not more. One new item presented with a model, one practised with support, one used (or responded to) inside a game.",
  },
  {
    id: 'challenge',
    label: 'Challenge',
    emoji: '🚀',
    blurb: 'Same language load, one stretch beat at the end.',
    prompt:
      'DIFFICULTY — CHALLENGE: keep every band limit, then add ONE stretch beat near the end — a short "show me what you can do" turn where the child uses the new language without a model. Do not add more words; add more thinking.',
  },
];

export const KID_LESSON_ENERGIES: KidCustomizationOption<KidLessonEnergy>[] = [
  {
    id: 'calm',
    label: 'Calm & cosy',
    emoji: '🕯️',
    blurb: 'Seated, soft voice, slow transitions.',
    prompt:
      'ENERGY — CALM & COSY: seated activities, soft voice, slow transitions, no fast or timed games. Movement appears only as a 30-second reset between steps.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    emoji: '⚖️',
    blurb: 'Seated and moving alternate, one movement break.',
    prompt:
      'ENERGY — BALANCED: alternate seated and moving activities, with one clear movement break in the middle of the session.',
  },
  {
    id: 'active',
    label: 'High energy',
    emoji: '⚡',
    blurb: 'Movement-led, loud and short games, calm close.',
    prompt:
      'ENERGY — HIGH ENERGY: lead with movement; every step has a physical version; games are loud and short (2-3 minutes), and the session still ends with a calm close so it lands.',
  },
];

export const DEFAULT_KID_LESSON_CUSTOMIZATION: KidLessonCustomization = {
  difficulty: 'standard',
  energy: 'balanced',
  voiceName: '',
};

export const difficultyById = (id: KidLessonDifficulty) =>
  KID_LESSON_DIFFICULTIES.find((d) => d.id === id) || KID_LESSON_DIFFICULTIES[1];
export const energyById = (id: KidLessonEnergy) =>
  KID_LESSON_ENERGIES.find((e) => e.id === id) || KID_LESSON_ENERGIES[1];

export interface KidLessonKind {
  id: string;
  label: string;
  emoji: string;
  category: 'Core Learning' | 'Practice & Homework' | 'Games & Play' | 'Teacher & Family' | 'Listening & Media';
  /** One line for the tile: what the tutor gets. */
  blurb: string;
  /** Bands this kind is written for. */
  bands: KidAgeBand[];
  /** The adult lesson id this maps to, so `utils/tiers.ts` gating keeps working. */
  tierId: string;
  /** Pieces the AI must return. */
  required: KidLessonPiece[];
  /** Pieces worth having when they apply. */
  optional: KidLessonPiece[];
  /** Extra structure the prompt asks for, per band. Folded into the master prompt. */
  shape: { veryYoung?: string; young?: string };
}

/**
 * The kinds on offer.
 *
 * Categories mirror the adult creator (Core Learning / Practice & Homework / Games & Play
 * / Teacher & Family / Listening & Media) so a tutor moving between the two dashboards
 * finds the same shelf; the kinds themselves are the ones that survive contact with a
 * 3-year-old or a 10-year-old, and each names the band it belongs to.
 */
export const KID_LESSON_KINDS: KidLessonKind[] = [
  {
    id: 'miniLesson',
    label: 'Mini Lesson',
    emoji: '📖',
    category: 'Core Learning',
    blurb: 'The everyday lesson: warm-up, target words, one game, a calm close.',
    bands: ['veryYoung', 'young'],
    tierId: 'englishLesson',
    required: ['steps', 'words'],
    optional: ['game', 'lyrics', 'caregiverNote'],
    shape: {
      veryYoung:
        'Give 4 steps of 3-5 minutes: (1) hello song with actions, (2) the ONE target word with a real object or big picture, (3) a moving game that uses the word ("find the duck", "jump to the duck"), (4) goodbye song. No printed words anywhere in the child-facing parts.',
      young:
        'Give 5 steps of 3 minutes: (1) 60-second review of last session with the learner answering aloud, (2) present 4-6 target words with a picture cue per word, (3) a story or dialogue that uses them in context, (4) a game with several fair turns, (5) a 2-minute wrap-up where the learner says two sentences they could not say before.',
    },
  },
  {
    id: 'storyLesson',
    label: 'Story Lesson',
    emoji: '📚',
    category: 'Core Learning',
    blurb: 'A small story built around the child and their pet, with the target words inside it.',
    bands: ['veryYoung', 'young'],
    tierId: 'englishLessonV2',
    required: ['steps', 'words'],
    optional: ['game', 'lyrics', 'homework'],
    shape: {
      veryYoung:
        'A 4-picture story of 3-5 sentences total, one sentence per picture, told aloud by the adult. The learner joins in with one repeated sound or word ("quack!", "again!") and one action per page.',
      young:
        'A 5-part story with a character who wants something and a small problem, 6-10 sentences in total, using the target words naturally. End with two comprehension questions the learner answers in a full sentence, plus one "what would you do?" question.',
    },
  },
  {
    id: 'phonicsLesson',
    label: 'Phonics & Letters',
    emoji: '🔤',
    category: 'Core Learning',
    blurb: 'Letter sounds, blending and word families — reading from the ground up.',
    bands: ['veryYoung', 'young'],
    tierId: 'interactiveLesson',
    required: ['steps', 'words'],
    optional: ['game', 'worksheet'],
    shape: {
      veryYoung:
        'One letter sound only (for example /d/), heard in words the child already knows (duck, dog, daddy). Activities are listening and moving, never reading: "stand up when you hear /d/".',
      young:
        'One word family (for example -at) with blending drill c-a-t → cat, 6-8 real words, two nonsense words to check decoding, and a short dictation of three of the words.',
    },
  },
  {
    id: 'movementLesson',
    label: 'Move & Do (TPR)',
    emoji: '🤸',
    category: 'Core Learning',
    blurb: 'Whole-body commands — the fastest route into a very young child’s memory.',
    bands: ['veryYoung'],
    tierId: 'englishLesson',
    required: ['steps', 'words'],
    optional: ['lyrics', 'game'],
    shape: {
      veryYoung:
        'Six to eight physical commands using only known words plus one new one (jump, clap, sit down, stand up, touch your nose, give me the ball). Teach by doing, then say them faster and slower, then let the child give the adult a command.',
    },
  },
  {
    id: 'routineLesson',
    label: 'Routines & Words',
    emoji: '🚿',
    category: 'Core Learning',
    blurb: 'Language a family can use all week: bath, food, dressing, bedtime.',
    bands: ['veryYoung'],
    tierId: 'englishLesson',
    required: ['steps', 'words'],
    optional: ['lyrics', 'caregiverNote'],
    shape: {
      veryYoung:
        'One daily routine (washing hands, eating, getting dressed, bedtime) with the 2-3 things that happen in it, the words a parent says in English, and a chant to make it fun. The caregiverNote must tell the parent exactly what to say all week, in English, with a pronunciation hint.',
    },
  },
  {
    id: 'worksheet',
    label: 'Printable Worksheet',
    emoji: '🖨️',
    category: 'Practice & Homework',
    blurb: 'A print-and-do page: trace, match, colour, cut — tuned to the age.',
    bands: ['veryYoung', 'young'],
    tierId: 'printableWorksheet',
    required: ['worksheet', 'words', 'sheet'],
    optional: ['steps', 'media', 'mission', 'caregiverNote'],
    shape: {
      veryYoung:
        'This is the Print-and-Talk model and it is a PAGE, not a slideshow: one side of paper, big enough for a thick crayon, with NO text for the child to read — the grown-up reads everything aloud. ' +
        'Give a "sheet" object with 5-7 tasks. Each task carries what the child DOES on the paper ("do"), the physical requirement ("paper": colour · draw one line · cut and stick), the EXACT English the grown-up says ("say"), and the one line the child says back ("childSays") — a task with no talking turn does not belong on this page. ' +
        'Include "traceWords": 2-3 big words the child traces with a FINGER, never a pencil; one hand-print or finger-paint prompt among the tasks; and "talkFrame": the one sentence the child finishes about their own page (“This is my ___.”). ' +
        'The `worksheet` list must still carry the same tasks as plain strings, because that is what prints on the paper. ' +
        'Build the session as a 30-minute run sheet of six phases: SHOW THE PAGE (3) · TALK IT THROUGH (4) · COLOUR & MATCH (7) · CUT & STICK (5) · SAY IT OUT LOUD (6) · SEND IT HOME (5). Give every phase a "floorMinutes" it cannot finish before and a "talkTarget" that adds up to 29 spoken turns, and mark that the paper is the doing — there is no game to open and no screen needed. ' +
        'The child never reads or writes a single word: every instruction on the page is for the adult, and every item is doable with a thick crayon.',
      young:
        'This is the Print-and-Talk model for a child who reads and writes, so the page is graded and the talk rides on top of the writing. Give a "sheet" object with 7-10 tasks in THREE graded parts, in this order: (1) match or circle, (2) write or complete the word (rule the boxes), (3) two sentences the child finishes about their own life. ' +
        'Each task carries what the child does on the paper ("do"), the physical requirement ("paper": ruled boxes · draw one line · circle), the EXACT English the grown-up says ("say"), and the child’s own line ("childSays"); the writing tasks carry "boxes" so the paper prints the ruled boxes. ' +
        'Include "traceWords" (3-4 words the child traces before writing them alone), "talkFrame" (the frame the child completes about their own page) and "answerKey" (the adult’s answers for parts 1 and 2 — never part 3, which has no wrong answer). ' +
        'The `worksheet` list must still carry the same tasks as plain strings, because that is what prints on the paper. ' +
        'The step up from the 2-5 sheet is the child’s own job, not a longer page: the child READS each task aloud before doing it, then checks their own answers against the printed key and says what they got. ' +
        'Build the session as a 30-minute run sheet of six phases: LOOK AT THE PAGE (3) · MATCH & CIRCLE (5) · WRITE THE WORD (6) · YOUR TWO SENTENCES (7) · CHECK IT YOURSELF (5) · SEND IT HOME (4). Give every phase a "floorMinutes" and a "talkTarget" that adds up to 40 spoken turns, and mark that the paper is the doing — there is no game to open. ' +
        'The old shape (a bare list of tasks and one answer-key line) is not enough: without the per-task "say" and "childSays" the page is silent, and a silent page teaches handwriting instead of English.',
    },
  },
  {
    id: 'homeworkQuest',
    label: 'Homework Quest',
    emoji: '🏠',
    category: 'Practice & Homework',
    blurb: 'A week of jobs with XP — and a 30-minute quest night to launch it.',
    bands: ['veryYoung', 'young'],
    tierId: 'homework',
    required: ['quest', 'worksheet', 'words'],
    optional: ['steps', 'homework', 'media', 'mission', 'run', 'caregiverNote'],
    shape: {
      veryYoung:
        'A week of five or six jobs a two-year-old can do in the house with a grown-up — bring something blue, sing the chant in the bath, feed the pet, find two socks — each one carrying the EXACT line the grown-up says and the line the child says back, worth XP the child marks on a nightly tally. Nothing to read, nothing to click, and no job longer than three minutes. The quest is also a session: build a 30-minute quest night as six phases — BRIEF THE QUEST (3) · PICK THE ORDER (4) · JOB ONE, OUT LOUD (7) · XP & PROOF (6) · SHOW THE HOUSE (6) · SET UP THE WEEK (4) — with the run sheet, the floors and 29 spoken turns printed on the quest sheet itself.',
      young:
        'A week of five to seven jobs for a 5-12 child, each one carrying the words the grown-up asks with, the line the child answers with, its XP and its proof (a photo, initials, or said aloud), and a nightly tally the child fills in alone. The step up is `master`: the child running the board — they READ every job aloud, choose the order, award the XP, write the proof line and read the week back — and one job is an interview where the child asks the grown-up a question in English and writes the answer. The quest night is a 30-minute session of six phases — BRIEF THE BOARD (3) · CLAIM THE ORDER (4) · JOB ONE, OUT LOUD (7) · XP & PROOF (6) · SHOW THE HOUSE (6) · PLAN THE WEEK (4) — with the run sheet, the floors and 40 spoken turns printed on the quest sheet itself.',
    },
  },
  {
    id: 'pictureQuiz',
    label: 'Picture Quiz',
    emoji: '❓',
    category: 'Practice & Homework',
    blurb: 'Big colourful questions with answers the child can see from across the room — and a quiz night to run them in.',
    bands: ['veryYoung', 'young'],
    tierId: 'quiz',
    required: ['steps', 'game', 'words', 'quiz'],
    optional: ['media', 'mission', 'run', 'worksheet', 'caregiverNote'],
    shape: {
      veryYoung:
        'Six to eight questions, each with ONE picture answer and one clearly wrong decoy, no text options at all — the adult reads the question ("Which one is the duck?") and the child points or taps. Every question also carries "childSays" (the line the child says when they are right — "duck!"), an "ask" follow-up the adult puts straight after, and a "photoQuery" for a real photograph of the question, because a quiz that ends in a tap teaches pointing. No score, only "yes!" and "try again". The quiz night is a 30-minute session of six phases — WARM-UP QUESTIONS (3) · PICTURE ROUND (5) · THE QUIZ (7) · SAY IT BACK (6) · THE CHILD ASKS (5) · SCORE & CHEER (4) — with the run sheet, the floors and 29 spoken turns printed on the lesson.',
      young:
        'Ten to twelve questions with four text options each. Keep every option within two words of the others, never let the longest option be correct, and rotate where the correct answer sits so it never lands in the same position twice in a row. Every question also carries the whole sentence the child says to answer ("The duck swims in the pond."), a follow-up question, and a real-photo search for the round. The last round is the CHILD\'s: they read the question aloud, the grown-up answers — sometimes wrongly on purpose — and the child judges it and explains why. The quiz night is a 30-minute session of six phases — WARM-UP QUESTIONS (3) · PICTURE ROUND (5) · THE QUIZ (7) · SAY IT BACK (6) · THE CHILD ASKS (5) · SCORE & CHEER (4) — with the run sheet, the floors and 40 spoken turns printed on the lesson.',
    },
  },
  {
    id: 'flashcards',
    label: 'Flashcard Deck',
    emoji: '🃏',
    category: 'Practice & Homework',
    blurb: 'Flip cards with a prompt side and a talking side — and a 30-minute card night that makes them talk.',
    bands: ['veryYoung', 'young'],
    tierId: 'studyGuide',
    required: ['deck', 'words', 'steps'],
    optional: ['game', 'media', 'mission', 'run', 'scene', 'caregiverNote'],
    shape: {
      veryYoung:
        'The deck is the spine of a SESSION, not a screen of cards. Give a "deck" object with "name" (what the class calls the pack), "cards" (one per word, in the order they are dealt) and "spacing" — the real-week schedule: which three cards come back TONIGHT, which tomorrow and which in three days, said at the table or in the bath with no screen. ' +
        'Every card carries ONLY what a two-to-five-year-old can answer: "emoji" (a picture big enough to name from across the table), "word", "say" (the EXACT English the grown-up says — “What is this? It is a duck!”) and "childSays" (the one sound or word the child says back — “duck!”). The BACK of every card is "do": a body action the child performs (quack, waddle, splash) — a card the child only names is a card the child forgets. There is no master round here; the grown-up keeps the deck. ' +
        'The card night is a 30-minute session of six phases — DEAL & LOOK (3) · SAY IT WITH ME (5) · TURN & TELL (7) · SORT THE DECK (6) · THE CHILD DEALS (5) · PACK IT HOME (4) — every phase with a "floorMinutes" it cannot finish before and a "talkTarget" that adds up to 29 spoken turns, and the deck phase is marked "drill": true so the cards open inside the night instead of replacing it. ' +
        'A card with no "say" and no "childSays" is a silent card: it teaches pointing, not talking.',
      young:
        'The deck is the spine of a SESSION, not a screen of cards. Give a "deck" object with "name", "cards" (in dealing order), "passes" (the named passes of the session), "scoreLine" (what the class says when the pack is finished) and "spacing" — the real-week schedule: which three cards come back TONIGHT, tomorrow and in three days, kept on the fridge and said out loud with no screen. ' +
        'Every card carries "word", "cue" (the picture cue that makes the word answerable), "sentence" (an example sentence in the child’s own world), "say" (the EXACT line the tutor says) and "childSays" (the whole sentence the child says back — a card that ends in one word is not a 5-12 card). EVERY FIFTH CARD is a review card whose "review" lists two earlier words (“say both”). ' +
        '"master" is the child RUNNING the deck: they read each card aloud, grade it “know it / practice again”, choose the order, and finish by quizzing the tutor with the cards that got away. ' +
        'The card night is a 30-minute session of six phases — DEAL & LOOK (3) · SAY IT WITH ME (5) · TURN & TELL (7) · SORT THE DECK (6) · THE CHILD DEALS (5) · PACK IT HOME (4) — with the floors and 40 spoken turns printed on the lesson, and the deck phase marked "drill": true so the cards open inside the night.',
    },
  },
  {
    id: 'arcadeGame',
    label: 'Arcade Word Game',
    emoji: '🎮',
    category: 'Games & Play',
    blurb: 'A fast, loud, replayable game built on this week’s words.',
    bands: ['veryYoung', 'young'],
    tierId: 'learningAppV2',
    required: ['game', 'words', 'steps', 'run', 'scene', 'mission'],
    optional: ['worksheet', 'homework', 'media', 'caregiverNote'],
    shape: {
      veryYoung:
        'The arcade is a NIGHT at the arcade, not a screen. Six phases — WARM-UP POPS (3) · SAY IT, POP IT (5) · THE POP ROUND (7) · SILLY SOUNDS (5) · THE CHILD POPS (5) · PACK THE MACHINE (5) — each with a "floorMinutes" it cannot finish before and a "talkTarget", adding up to 26 spoken turns, and the pop round marked "drill": true so the game opens INSIDE the night instead of replacing it; "run" carries the clock, the brain breaks, the exit ticket and where the next session starts. ' +
        'Write exactly SIX one-syllable words (duck, pop, sun, red, up, go) — a two-to-five-year-old plays with six, never twelve. Every word carries "sayAloud" (the sound the grown-up makes — “pop! say pop!”), "meaning" and "example", and every game item carries only what a small child can do: "prompt" (ONE spoken instruction — “Pop the DUCK!”), "answer", three "distractors" that SOUND like the answer (duck/dock/dusk, sun/son/sung — never random words), "picture" (an emoji big enough to name from across the table) and "childSays" (the one sound the child says back — “duck!”). Two levels are enough here, described in "levels": the whole six, then the same six faster. ' +
        'The grown-up OWNS the device and the child owns the voice: no reading, no timer, no score to lose. "scoring" gives the grown-up’s two lines — a pop only ends when the child has SAID the word, and a miss is met with “nearly! Let’s pop it again” — and "retrySet" is the three words that got away, played a second time so the night finishes on a pop the child can repeat. List the arcade "sounds" (pop, cheer, boing) to make with a mouth, and end with "caregiverNote" naming the two words to say at the table tonight. Anchor the night in the real world as well: a \"scene\" with a real photograph to look at together ("photoQuery") and one short clip, and a \"mission\" — the thing the child does at home tonight, the exact sentence they must say to finish it ("sayIt") and the nights it happens.',
      young:
        'The arcade is a NIGHT at the arcade, not a screen. Six phases — WARM-UP POPS (3) · SAY IT, POP IT (5) · THE POP ROUND (7) · TRICK WORDS (6) · THE CHILD RUNS IT (5) · PACK THE MACHINE (4) — every phase with its "floorMinutes" and a "talkTarget" that adds up to 40 spoken turns, and the pop round marked "drill": true so the game is one phase of the night; "run" carries targetMinutes, the brain breaks, the exit ticket and the next session’s hook. ' +
        'The arcade itself rises in THREE visible levels, written out in "levels" — level 1 is six words at reading speed, level 2 adds the confusable pairs, level 3 is the boss round where the child reads every target aloud before popping it — each level naming its exact words, the "distractors" children actually confuse (pond/pound, swim/swam, duck/dock, wing/wind, frog/from, lily/live — never random words) and what "rise"s (speed, word count, or the second rule). Every word carries "word", "sayAloud", "meaning" and "example"; every game item carries "prompt" (the exact line the tutor reads), "answer", three "distractors", "picture", "childSays" (the whole sentence the child says — a round that ends in one word is not a 5-12 round) and "ask" (the follow-up that turns a hit into talk). ' +
        'Keep the score OUT LOUD: "scoring" gives the tutor’s exact words for a hit (“two points — the pond takes the lead!”) and for a miss (“nearly — duck, not dusk. Double points if you get it now”), so the game still works with the laptop shut. "retrySet" is round two — exactly the words that got away — and the win cannot be lost, only replayed: the child finishes level three, then beats their own best. List the arcade "sounds" (pop, cheer, coin, boing) so an offline round still sounds like an arcade, and end with "caregiverNote" naming the two words to play at the table tonight. Anchor the night in the real world as well: a \"scene\" with a real photograph to look at together ("photoQuery") and one short clip, and a \"mission\" — the child’s hunt at home this week, the exact sentence they say to prove it ("sayIt") and its steps.',
    },
  },
  {
    id: 'memoryMatch',
    label: 'Memory Match',
    emoji: '🧠',
    category: 'Games & Play',
    blurb: 'Pairs hidden face-down — word to picture, or word to meaning.',
    bands: ['young'],
    tierId: 'learningApp',
    required: ['game', 'words'],
    optional: ['steps'],
    shape: {
      young:
        'Six to eight pairs (word ↔ picture, or word ↔ short meaning). Say aloud what was turned over every time, and end with a "second round" where the tutor hides three cards so the learner recalls them from memory.',
    },
  },
  {
    id: 'boardGame',
    label: 'Printable Board Game',
    emoji: '🎲',
    category: 'Games & Play',
    blurb: 'A paper board with word squares — a die, two counters, ten minutes.',
    bands: ['young'],
    tierId: 'weeklyChallenge',
    required: ['game'],
    optional: ['worksheet', 'words', 'steps'],
    shape: {
      young:
        'A board of 18-24 squares in a loop, each square holding one task (say the word, spell it, use it in a sentence, act it). Describe the board square by square so it can be drawn on paper in one minute, and give a "no-lose" rule where the game ends when both counters finish.',
    },
  },
  {
    id: 'rolePlay',
    label: 'Role-play & Drama',
    emoji: '🎭',
    category: 'Games & Play',
    blurb: 'A tiny scene the child acts out: shop, doctor, café, lost puppy.',
    bands: ['young'],
    tierId: 'conversationGame',
    required: ['steps', 'words'],
    optional: ['game', 'homework'],
    shape: {
      young:
        'A 4-6 turn scene with two roles, three fixed sentence frames per role the learner can lean on, and one twist where the learner chooses what happens next. Mark which lines are the learner’s and keep them under eight words each.',
    },
  },
  {
    id: 'scavengerHunt',
    label: 'Room Scavenger Hunt',
    emoji: '🔍',
    category: 'Games & Play',
    blurb: 'Find it, bring it, say it — the house becomes the classroom.',
    bands: ['veryYoung', 'young'],
    tierId: 'placeGame',
    required: ['game', 'words'],
    optional: ['steps', 'caregiverNote'],
    shape: {
      veryYoung:
        'Five things to find that are safe to carry (a ball, a spoon, something soft, something blue, the pet). Each find is one spoken word and one action ("bring it to me", "put it on the table").',
      young:
        'Eight items each tied to a target word or a colour, with a sentence frame per item ("I found a ___") and a final challenge to describe where one thing was hiding.',
    },
  },
  {
    id: 'storyAdventure',
    label: 'Choose-the-Path Story',
    emoji: '🗺️',
    category: 'Games & Play',
    blurb: 'A branching story where the child’s choice changes what happens.',
    bands: ['young'],
    tierId: 'flipbookHomework',
    required: ['steps', 'words'],
    optional: ['game', 'homework'],
    shape: {
      young:
        'Three decision points, each with two child-friendly options, each option leading to a different short scene, all paths ending in a happy, safe resolution that reuses the target words. Keep each scene to 3-4 sentences.',
    },
  },
  {
    id: 'lessonPlan',
    label: 'Lesson Plan',
    emoji: '📋',
    category: 'Teacher & Family',
    blurb: 'The tutor-facing plan: timings, scripts, what to watch for.',
    bands: ['veryYoung', 'young'],
    tierId: 'lessonPlan',
    required: ['steps'],
    optional: ['words', 'game', 'caregiverNote'],
    shape: {
      veryYoung:
        'A plan the tutor follows minute by minute with the exact words to say, what the child does, what to do if the child runs off or cries, and how to finish on a high no matter how much was covered.',
      young:
        'A plan with timings, the target language, three common errors to listen for (with the recast to use), differentiation for a stronger and a weaker learner in the same class, and the 60-second brain break placed explicitly.',
    },
  },
  {
    id: 'familyGuide',
    label: 'Parent & Family Guide',
    emoji: '👨‍👩‍👧',
    category: 'Teacher & Family',
    blurb: 'One page for the family: what to say at home this week, in English.',
    bands: ['veryYoung', 'young'],
    tierId: 'forTeachers',
    required: ['steps', 'caregiverNote'],
    optional: ['words', 'homework'],
    shape: {
      veryYoung:
        'Five everyday moments (bath, breakfast, car, nappy change, bedtime) with the exact English phrase a parent can say, a pronunciation hint written as a sound-alike, and one thing NOT to do (no translating word-for-word, no quizzing the child).',
      young:
        'A week plan for the family: three 10-minute activities, one thing to listen for, and how to praise effort rather than correctness. Written at adult reading level with the child’s words in bold.',
    },
  },
  {
    id: 'listeningSong',
    label: 'Listen & Sing',
    emoji: '🎧',
    category: 'Listening & Media',
    blurb: 'An audio-first lesson: chant, song lyrics, listen-and-do.',
    bands: ['veryYoung', 'young'],
    tierId: 'audioLesson',
    required: ['lyrics', 'words'],
    optional: ['steps', 'game'],
    shape: {
      veryYoung:
        'One 45-second chant with a clear beat, 4 lines of 4-6 words, an action for every line, and a second verse with ONE word changed so the child hears the pattern. Keep every line singable by an adult with no musical training.',
      young:
        'A verse and a chorus of a song built on the target words, with the rhythm marked per line, two lines the learner can personalise (their name, their pet), and a listening task for each verse.',
    },
  },
  {
    id: 'videoStory',
    label: 'Mini Video Story',
    emoji: '🎬',
    category: 'Listening & Media',
    blurb: 'A script for a 60-second animated story the child watches and retells.',
    bands: ['young'],
    tierId: 'videoLessonInteractive',
    required: ['steps', 'words'],
    optional: ['game', 'homework'],
    shape: {
      young:
        'A 60-second script in 6-8 shots, with the on-screen text kept to a maximum of four words per shot, a narrator line per shot, and three questions to ask straight after watching. Mark the two shots where the learner should repeat the line aloud.',
    },
  },

  /* ──────────────────────────────────────────────────────────────────────────
     THE METHOD MODELS — nine methods, each written TWICE, once per band
     ──────────────────────────────────────────────────────────────────────────

     The kinds above are the everyday shelf. These nine are the *methods*: each one
     fixes the ORDER a session runs in, because the order is the pedagogy. A TPR
     story works only if the child moves before they are ever asked to say anything;
     an ESA lesson works because Engage comes first; a TTT lesson works because the
     test comes before the teaching.

     Every one of the nine is written for BOTH bands, and the two versions are not
     the same lesson at two speeds — a four-year-old and a ten-year-old doing
     "Engage, Study, Activate" are doing different things with the same idea. So each
     kind carries a separate `shape.veryYoung` and `shape.young`, and the prompt tells
     the AI the signature steps are not re-orderable.
  */
  {
    id: 'tprStory',
    label: 'Move & Tell a Story',
    emoji: '🤸',
    category: 'Core Learning',
    blurb: 'Actions, rhythm and a story — the child learns by moving, not by reading.',
    bands: ['veryYoung', 'young'],
    tierId: 'englishLessonV2',
    required: ['steps', 'words', 'media'],
    optional: ['lyrics', 'game', 'caregiverNote'],
    shape: {
      veryYoung:
        'This is TPR-Storytelling: the story and the body are the same thing. Tell the story in 3-5 beats and every beat MUST be an action the child does (jump, clap, sit down, sleep) — a beat they only listen to does not belong in this kind. ' +
        'Give one echo line that comes back in every beat, and one new word at most; everything else is a word they already know. ' +
        'The child joins in the echo and copies the action, and is never asked to read, write, or answer a question on their own. ' +
        'The `media` must include one song or chant video the tutor can play, the words of the chant in `lyrics`, and one no-screen fallback.',
      young:
        'This is TPR-Storytelling for a child who can already read, so the body does the learning while the words appear beside it. ' +
        'Tell the story in 5-8 beats, each one an action, with one small problem the child can act out. ' +
        'A two-step Command chain (“creep to the door, then push it”) is the real step up from the 2-5 version, so give 3-4 of them and make the child hold the whole sentence in mind. ' +
        'The retell is acted, not read: the child walks the story map, then says it back in their own sentences. ' +
        'Keep the printed text short — the verbs, and the story told by the tutor. The `media` must include one action-song or story clip and one picture set.',
    },
  },
  {
    id: 'circleTime',
    label: 'Circle Time & Routines',
    emoji: '🔄',
    category: 'Core Learning',
    blurb: 'The same opening, the same little check, one new surprise — safe and repeatable.',
    bands: ['veryYoung', 'young'],
    tierId: 'englishLesson',
    required: ['steps', 'words', 'circle'],
    optional: ['lyrics', 'media', 'mission', 'caregiverNote'],
    shape: {
      veryYoung:
        'This is the Circle-Time model and the ORDER must not change. Give exactly 4 steps: ' +
        '(1) The same hello song every lesson — give the exact words, 4 short lines, sung or chanted; ' +
        '(2) How are we today? — a simple weather and mood check where the child points at one of four big pictures (sunny, rainy, happy, sleepy) and you say the word; ' +
        '(3) The surprise — ONE new word or thing, revealed from a “mystery box” the child taps or opens; ' +
        '(4) The same goodbye song, or a goodnight to a favourite toy. ' +
        'Nothing here is new except the one surprise word, and there is never a score. ' +
        'Give a "circle" object with it: the hello and the goodbye songs line by line word for word, the FOUR check-in pictures with what the child says while pointing, the ONE surprise word, and the SAME wait line said before every reveal (“Tap it... tap it... OPEN!”) — the child says the last word of it with you every time. ' +
        'The `lyrics` must carry the hello and goodbye songs word for word so the tutor can sing them next week too. ' +
        'Build the session as a 30-minute run sheet of six phases: THE SAME HELLO (3) · THE CHECK-IN (5) · THE SAME WAIT (4) · THE MYSTERY BOX (6) · THE ONE WORD, MANY WAYS (7, marked "drill": true so it opens the circle game the child runs) · THE SAME GOODBYE (5). ' +
        'Give every phase a "talkTarget" that adds up to 29 spoken turns. The circle may be five minutes of content, but the session is thirty minutes of the child singing, pointing, saying the wait, naming the surprise and saying goodbye — the child must never be finished early.',
      young:
        'This is the routine-and-ritual model for a child who reads, so the ritual is the same but the surprise carries real language. Give exactly 5 steps: ' +
        '(1) The opening ritual — the same 30-second starter every session (a chant, a riddle, a “what day is it?”); name it and keep it identical each week; ' +
        '(2) The check-in — how are you, what is the weather, what did you do yesterday — answered in one full sentence; ' +
        '(3) The word of the day — ONE new word or chunk, shown with a picture and its spelling, and written once by the child; ' +
        '(4) Where it lives — use the new chunk in two sentences the child builds themselves; ' +
        '(5) The closing ritual — the same goodbye, plus one sentence about what they will do before the next lesson. ' +
        'The predictability is the point: keep steps 1, 2 and 5 word for word the same in every lesson of the week. ' +
        'Give a "circle" object with it: the opening and closing lines word for word, the "ask" questions the CHILD asks back to you in full sentences, the big check-in pictures with the full sentence the child answers with, the ONE surprise word, and the same wait line before every reveal. ' +
        'The `lyrics` must carry the opening and closing lines word for word. ' +
        'Build the session as a 30-minute run sheet of six phases: THE SAME OPENING (3) · THE CHECK-IN TALK (5) · THE SAME WAIT (4) · THE SURPRISE (6) · THE ONE WORD, MANY WAYS (7, marked "drill": true so it opens the circle game) · THE SAME CLOSING (5), with a per-phase "talkTarget" adding up to 40 spoken turns. The child leads: they ask the check-in questions, answer in full sentences, write the surprise word once, and build two sentences with it — and the session still opens and closes with the identical words every week.',
    },
  },
  {
    id: 'esaJourney',
    label: 'Fun Steps Lesson',
    emoji: '🎯',
    category: 'Core Learning',
    blurb: 'Engage, Study, Activate — the lesson can move its steps to fit the child’s mood.',
    bands: ['veryYoung', 'young'],
    tierId: 'interactiveLesson',
    required: ['steps', 'words', 'game', 'media'],
    optional: ['lyrics', 'worksheet', 'homework'],
    shape: {
      young:
        'This is the ESA model and the three beats must each be its own named step: ' +
        '(1) ENGAGE — make the child want to know, with a fun picture, a short video clip or a quick game, and put the target words inside it without teaching them yet; ' +
        '(2) STUDY — show how the language is built: the spelling, the word order, or the sound. Use a drag-into-slots or build-the-word task in the `game`; ' +
        '(3) ACTIVATE — the child makes something of their own with the new words (build a room, choose a pet, say a sentence that makes something happen). ' +
        'The prompt must say the beats may be re-ordered to suit the child’s mood, but all three must still happen. ' +
        'The `media` must include the Engage clip and one free interactive game the class can tap.',
      veryYoung:
        'This is the ESA model for a pre-reader, so each beat is done with the body and the voice, never with text. Give exactly 3 steps, each named for its beat: ' +
        '(1) ENGAGE — surprise the child into wanting the word: a funny picture, a sound, a quick peek-a-boo or a one-minute song, with the target word hidden inside it and NOT taught yet; ' +
        '(2) STUDY — do the word together: say it slowly, clap its beats, do its action, match the picture; one word only, and no reading; ' +
        '(3) ACTIVATE — the child uses it their own way: choosing the toy, feeding the pet, making the sound, saying the name of a real thing in the room. ' +
        'The three beats may be re-ordered to follow the child’s attention, but all three must happen. ' +
        'The `game` must be a no-score matching or pointing game, and the `media` must include the Engage song and one picture set.',
    },
  },
  {
    id: 'tbltMission',
    label: 'Mission Lesson',
    emoji: '🗺️',
    category: 'Games & Play',
    blurb: 'A real goal first, the new words arrive exactly when the child needs them.',
    bands: ['veryYoung', 'young'],
    tierId: 'conversationGame',
    required: ['steps', 'game', 'words', 'media'],
    optional: ['homework', 'worksheet'],
    shape: {
      young:
        'This is TBLT and the order is the opposite of a normal lesson. Give exactly 3 steps: ' +
        '(1) THE MISSION — a concrete, non-linguistic goal the child wants to reach (“Help the chef cook the pizza”, “Decode the map and escape the castle”). No vocabulary is taught at the start; ' +
        '(2) THE TRIAL — the child tries the task with the words they already have, and the moment they get stuck the tutor gives just the one word or phrase they need (write these “just-in-time” words into `words`); ' +
        '(3) THE LOCK-IN — afterwards, go back over the exact phrases that solved the puzzle, with one quick check game in `game`. ' +
        'The `media` must include one free interactive activity (a ready-made game the class can tap) and one picture or story that sets up the mission.',
      veryYoung:
        'This is TBLT for a pre-reader: the mission is a real thing to DO with the hands, and the words arrive only when the doing gets stuck. Give exactly 3 steps: ' +
        '(1) THE MISSION — one physical goal (“Help the teddy get ready for bed”, “Put every animal in its house”), shown with a picture; no words taught yet; ' +
        '(2) THE TRIAL — the child does it and names what they need as they go; the moment they reach for a word, give that one word and use it together; ' +
        '(3) THE LOCK-IN — do the same action again slowly, saying the two or three words that made it work, then play one quick no-score game. ' +
        'The `media` must include one song or clip for the mission and one picture set, and the game must have no score and no losing.',
    },
  },
  {
    id: 'tttBoss',
    label: 'Test & Boss Battle',
    emoji: '⚔️',
    category: 'Practice & Homework',
    blurb: 'A quick try, a tiny bit of teaching, then a game that proves it stuck.',
    bands: ['veryYoung', 'young'],
    tierId: 'quiz',
    required: ['steps', 'game', 'words'],
    optional: ['media', 'homework', 'worksheet'],
    shape: {
      young:
        'This is the TTT model and the order must not change. Give exactly 3 steps: ' +
        '(1) TEST 1 — a fast, friendly game or quiz on the target BEFORE any teaching, with no introduction and no pressure. If the child passes, jump straight to a harder level; ' +
        '(2) TEACH — a short, visual explanation of just the bit they missed (a spelling rule, a tense, a sound), built as a picture or a two-line rule, never a grammar lecture; ' +
        '(3) TEST 2 / THE BOSS BATTLE — a fresh set of game challenges in `game`, named like a boss fight, that proves the new understanding. ' +
        'Say in the `teacherNote` what to do if the child fails Test 1: skip Test 2 and play the game on its own.',
      veryYoung:
        'This is TTT adapted for a pre-reader: there is no written test and no score, only "can you show me?". Give exactly 3 steps: ' +
        '(1) SHOW ME FIRST — straight into a small game or a pointing game, with no teaching, to see what the child already understands. If they do it easily, go to the harder version; ' +
        '(2) DO IT TOGETHER — a tiny teaching moment: the tutor shows the one thing they missed (a sound, a picture, an action) and they do it together twice; ' +
        '(3) SHOW ME AGAIN — a fresh, fun version of the game, framed as play, with cheers and no score. ' +
        'Never call step 1 a test out loud: at this age it is simply “let’s play”. The `game` must be no-score with pictures only.',
    },
  },
  {
    id: 'scaffoldSteps',
    label: 'I Do, We Do, You Do',
    emoji: '🪜',
    category: 'Core Learning',
    blurb: 'A predictable ladder: the app shows it, you do it together, the child does it alone.',
    bands: ['veryYoung', 'young'],
    tierId: 'interactiveLesson',
    required: ['steps', 'words'],
    optional: ['game', 'media', 'worksheet', 'homework'],
    shape: {
      veryYoung:
        'This is the structured-scaffold model, made tiny enough for a small child. Keep the same three-beat rhythm the whole session, repeated for each word: ' +
        '(1) I DO — the tutor shows the word, says it, and does the action; the child only watches and listens; ' +
        '(2) WE DO — the tutor and child do it together, twice, with the tutor still leading; ' +
        '(3) YOU DO — the child does it alone for one turn, and gets a cheer whatever happens. ' +
        'Repeat I do → We do → You do for each of the 2 words, and never skip the “we do” beat. ' +
        'No reading, no writing, no score: the reward for the “you do” turn is a cheer or a coin animation, never a mark. ' +
        'The `media` should be one song or picture set the tutor uses inside the “I do” beat.',
      young:
        'This is the structured-scaffold model and the rhythm is the whole point: everything moves from I DO to WE DO to YOU DO, and it never jumps. Build the lesson as a predictable ladder of 9-12 short beats: ' +
        '(1) I DO — for each new item, the app/tutor demonstrates with a picture, the audio and the word on screen; the child just watches and repeats once; ' +
        '(2) WE DO — guided practice: matching, filling a slot-grammar sentence tile by tile, choosing the right word, with the tutor beside them and the answer still visible; ' +
        '(3) YOU DO — an independent output task with no model: say it, write it, read it aloud, or answer a comprehension question alone. ' +
        'Order the ladder so vocabulary is introduced early, sentence patterns are locked in mid-lesson, and the last beats force reading and comprehension. ' +
        'The `game` must offer a guided “we do” round and a harder independent “you do” round, and the `worksheet` should mirror the same three rungs.',
    },
  },
  {
    id: 'storyWorld',
    label: 'Story World Adventure',
    emoji: '🎠',
    category: 'Games & Play',
    blurb: 'One long story with the app’s mascot — every word opens the next door.',
    bands: ['veryYoung', 'young'],
    tierId: 'magicBook',
    required: ['steps', 'words', 'game'],
    optional: ['media', 'lyrics', 'homework', 'caregiverNote'],
    shape: {
      veryYoung:
        'This is the character-narrative model for a small child: the whole session is ONE continuous story with the child’s own pet or hero, told in small scenes. Give 4-5 step-scenes, each 2-3 minutes, and each one a place in the story (the door, the river, the cave, home): ' +
        'in every scene the child must say or point at ONE target word to move the story on (“say duck and the duck carries you across”). ' +
        'The character must be the child’s own pet or hero from their profile, and it must ask the child for help. ' +
        'Nothing can go wrong for the character, there is no score, and every scene ends with the story moving one step forward. ' +
        'The `game` should be the same story told as a matching game, and the `media` one scene-setting picture or song.',
      young:
        'This is the multi-character narrative model: the whole lesson is one continuous, character-driven story the child is inside of, not a set of exercises. Give 5-6 step-scenes, each a story conflict the language solves: ' +
        'a character needs to cross a river, so the child clicks the correct vocabulary stepping stones; a character is lost, so the child answers a question to light the path. ' +
        'Use the child’s own hero, pet and one real interest from their profile as the cast, so the story is theirs. ' +
        'Every target word must be the KEY to a scene, never a word quiz bolted on. ' +
        'The scenes must end in a resolved, satisfying story, and the `game` should be the story’s climax with several fair turns. ' +
        'The `media` must include one scene-setting clip or picture and, for the audio, a story read-aloud.',
    },
  },
  {
    id: 'fastFun',
    label: 'Fast Fun Lesson',
    emoji: '⚡',
    category: 'Core Learning',
    blurb: 'Quick, loud and short — a change every 30-45 seconds so nobody drifts off.',
    bands: ['veryYoung', 'young'],
    tierId: 'dailyLesson',
    required: ['steps', 'words', 'game', 'media'],
    optional: ['lyrics', 'homework'],
    shape: {
      veryYoung:
        'This is the high-energy pacing model for a very short attention span. Give 6-8 tiny steps of 1-2 minutes, every one a different kind of thing (sing, move, find, copy, cheer, calm down), so nothing lasts longer than about 45 seconds. ' +
        'Every step must have: the exact word or sound the tutor says, the action the child does, and an immediate celebration — a cheer, an emoji shower, a coin animation, a clap. ' +
        'The LAST step must be a calm, slow wind-down, because a fast lesson has to land somewhere. ' +
        'At this age the “reward” is never a score or a leaderboard: it is instantly seen and heard (confetti, an emoji, a cheer). ' +
        'The `media` must include one fast song and one short action clip, and the `game` must be a very short, no-score, repeatable round.',
      young:
        'This is the rapid-fire pacing model: slides rotate fast (30-45 seconds each) and the energy never drops until the planned close. Give 8-10 short steps of 1-2 minutes, alternating listening, speaking, moving and playing so no beat outstays 45 seconds: ' +
        'a quick repeat prompt ("everybody say it — three, two, one!"), an instant game element (tap the right word, hit the mole), then a rapid reward beat (a badge, a coin rain, a streak). ' +
        'Every step must have a single, unmistakable instruction in under six words plus the reward moment, and the child speaks aloud at least five times. ' +
        'The final step must slow right down and let the child say what they learned, or the fast pace leaves nothing behind. ' +
        'The `game` should be a fast, replayable round with three visible levels, and the `media` must include one quick song and one short video clip.',
    },
  },
  {
    id: 'talkChat',
    label: 'Talk and Chat',
    emoji: '💬',
    category: 'Listening & Media',
    blurb: 'Lots of talking, few buttons — real conversation with pictures, clips and food.',
    bands: ['veryYoung', 'young'],
    tierId: 'conversationalLesson',
    required: ['steps', 'words', 'media'],
    optional: ['game', 'homework', 'caregiverNote'],
    shape: {
      veryYoung:
        'This is the conversational-immersion model for a child who cannot read, so every prompt is spoken and answered with a word, a point, a sound or an action — never with multiple-choice buttons. Give 4 steps: ' +
        '(1) Look and talk — one big real picture or a very short clip; the tutor asks simple questions (“what is this?”, “is it big?”, “do you like it?”) and the child answers however they can; ' +
        '(2) Copy me — the child copies two or three words, with the tutor accepting any close attempt; ' +
        '(3) Pretend together — a tiny pretend scene (making a sandwich, feeding the pet) where the child talks as they play; ' +
        '(4) Chat and finish — two open questions with no right answer, then the goodbye. ' +
        'Do NOT use a quiz for this kind: at most ONE no-score game, and the speaking is the lesson. ' +
        'The `media` must include the picture set or clip for step 1 and one song or story for the home part.',
      young:
        'This is the conversational-immersion model: fluid speech comes first and touch mechanics come almost never. Give 5 steps: ' +
        '(1) Scene talk — a rich real visual (a movie trailer, a cooking scene, a city street, an animal photo set) with open prompts the child answers in full sentences; ' +
        '(2) Words I need — three or four useful words or phrases the scene invites, given as sentence starters, not as a list to memorise; ' +
        '(3) Say it your way — the child describes the same scene in their own words, and the tutor recasts rather than corrects; ' +
        '(4) Something real — a short spoken task tied to the child’s own life (order a pizza, plan a trip, describe their pet’s day), done as a role-play conversation; ' +
        '(5) Talk it over — two open questions, no right answer, then what they will tell their family. ' +
        'Keep multiple-choice to a minimum — at most one short game, and only if it makes them talk more. ' +
        'Say in the `teacherNote` which phrases to listen for in the child’s own speech, so the tutor can spot real production rather than recognising an answer.',
    },
  },
];

export const KID_LESSON_CATEGORIES: KidLessonKind['category'][] = [
  'Core Learning',
  'Practice & Homework',
  'Games & Play',
  'Teacher & Family',
  'Listening & Media',
];

export function kindById(id: string): KidLessonKind | undefined {
  return KID_LESSON_KINDS.find((k) => k.id === id);
}

/* ────────────────────────────────────────────────────────────────────────────
   The JSON contract
   ──────────────────────────────────────────────────────────────────────────── */

export interface KidLessonWord {
  word: string;
  emoji?: string;
  sayAloud?: string;
  meaning?: string;
  example?: string;
}

export interface KidLessonStep {
  name: string;
  minutes?: number | string;
  teacherScript?: string;
  childAction?: string;
  print?: string;
  tip?: string;

  /* ── The 30-minute run sheet ───────────────────────────────────────────────
     A step is no longer just "a thing to do". It is a PHASE of a session with a
     length that cannot collapse, a number of sentences the child owes, and a
     reserve if it finishes early. Those five fields are what stop a lesson from
     being over in eight minutes, and they are all shown to the tutor on screen. */

  /** Where this sits in the session: Hook, Warm-up, Input, Guided, Production, Wrap. */
  phase?: string;
  /** The MINUTE FLOOR: this phase is not done before this many minutes, even if the
   *  child is flying. It is the difference between a lesson and a quick chat. */
  floorMinutes?: number;
  /** How many times the child has to SAY something in this phase. The phase does not
   *  advance until the count is met — the tutor can override, and it says so. */
  talkTarget?: number;
  /** A sentence frame the child completes out loud, e.g. “I like ___ because ___.” */
  sayFrame?: string;
  /** Three questions the tutor can always ask, easy → why → imagine. Never runs dry. */
  questionLadder?: string[];
  /** What to do if the phase finishes early. The lesson does not end — it deepens. */
  reserve?: string[];
  /**
   * This phase IS the drill.
   *
   * Phonics (and the other drill-shaped kinds) play as a run sheet whose drill
   * engine — letter cards, word building — runs INSIDE one of the phases rather than
   * owning the whole screen. Without this flag the deck would put the drill in the
   * same generic slot as every other activity, which is how a 30-minute phonics
   * session turns into three steps and a quiz.
   */
  drill?: boolean;
}

/** The real scene the lesson is anchored in — one photograph, one clip. */
export interface KidLessonScene {
  /** What the child looks at, in their words. */
  title: string;
  /** A real-photo search that always resolves on the free photo stack. */
  photoQuery?: string;
  /** A short real clip with a job attached, not just something to watch. */
  clipTitle?: string;
  clipUrl?: string;
  /** The listening task the clip carries. */
  listenFor?: string;
}

/** The real-world thing the child talks their way through before the lesson ends. */
export interface KidLessonMission {
  title: string;
  /** The actual real-life version, so the lesson leaves the screen. */
  realWorld: string;
  /** The sentence the child must produce to complete it. */
  sayIt: string;
  steps?: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
   PHONICS

   Phonics has a canonical order and it is not negotiable: hear it, say it, find it
   in words, blend it, read it, spell it, write it. Skip a rung and the child is
   memorising shapes instead of decoding. So the ladder is structured rather than
   left to the prose of a step.

   What matters most here, and what a generic vocabulary lesson cannot do:

     · `minimalPairs` — cat/bat/mat. The child has to HEAR the difference before
       they can ever read it, and pairs are how you test hearing rather than
       guessing from the picture.
     · `nonsenseWords` — "zat", "vim". A real word can be read from memory; a
       nonsense word can only be read by decoding. This is the single most useful
       diagnostic in early reading and it costs one line of content.
     · `mouth` — where the tongue and lips go. A sound the child cannot see is a
       sound they cannot copy.
   ──────────────────────────────────────────────────────────────────────────── */
export interface KidLessonPhonicsPair {
  a: string;
  b: string;
  emojiA?: string;
  emojiB?: string;
}

/** One rung of the sound ladder, in the order it must be taught. */
export interface KidLessonPhonicsRung {
  /** hear · say · find · blend · read · spell · dictate */
  step: string;
  /** What actually happens, in the tutor's words. */
  what: string;
  /** How many times the CHILD speaks here. */
  talkTarget?: number;
}

/**
 * The decodable mini-story — the payoff of a phonics lesson.
 *
 * A sound is not learned when the child can read it in a list; it is learned when
 * they read it inside real text. So the story is built ONLY out of the family just
 * taught (plus a couple of heart-words that are allowed to be known by sight), the
 * child reads it aloud themselves, and then tells it back. A list proves recognition;
 * a story proves reading — and reading it aloud is the biggest talking lever here.
 */
export interface KidLessonPhonicsStory {
  title?: string;
  /** One short sentence per line, decodable from the sound family just taught. */
  lines: string[];
  /** The few words that are not decodable yet, so the tutor can pre-teach them. */
  trickyWords?: string[];
  /** What the child says after reading it — the retell, not a comprehension quiz. */
  retell?: string;
  talkTarget?: number;
}

export interface KidLessonPhonics {
  /** The /sound/ or the spelling pattern: “/d/”, “-at”, “sh”. */
  sound: string;
  /** The words the child already knows that contain it. */
  inWords?: string[];
  /** Hear-the-difference pairs — the drill that actually tests listening. */
  minimalPairs?: KidLessonPhonicsPair[];
  realWords?: string[];
  /** Made-up words. They check decoding, not memory — never a trick, always fair. */
  nonsenseWords?: string[];
  /** The ladder, in order. */
  ladder?: KidLessonPhonicsRung[];
  /** Where the tongue and lips go, in words a child can follow. */
  mouth?: string;
  /** Words the child writes from hearing them. */
  dictation?: string[];
  /** The tutor's answers, so a tutor who is not a phonics specialist can mark it. */
  answerKey?: string[];
  /** The decodable mini-story the child reads aloud at the end, then retells. */
  decodable?: KidLessonPhonicsStory;
}

/* ────────────────────────────────────────────────────────────────────────────
   MOVE & DO (TPR)

   Total Physical Response has one rule that must not be bent: the child PROVES
   understanding with the body, and speaking comes second. That is exactly why a
   TPR lesson naturally ends up silent — the child does everything and says
   nothing — and why this object exists. It carries the two things that turn the
   method into a talking lesson:

     · `commands` — six to eight actions, every one of them already known except
       ONE. The known five sixths are what let the child answer instantly; the one
       new command is the whole lesson's learning. `twoStep` is the stretch for
       the 4- and 5-year-olds in the band (“clap, then jump”), never the default —
       a chain is too much for a two-year-old.

     · `bossRound` — the role reversal, which is the talk engine. The child wears
       the crown, the adult obeys only English, and the adult malfunctions (does it
       wrong) until the child says the command again. Nothing moves until the child
       says it, which is the single cheapest way to make a physically-based method
       produce speech all session long.

   There is no reading and no writing in this kind at all: a 2-5 TPR lesson is
   heard and done. Speed play (fast · slow · whisper · robot) is the variation that
   keeps the same six words interesting for thirty minutes.
   ──────────────────────────────────────────────────────────────────────────── */
export interface KidLessonMovementCommand {
  /** The command as the adult says it: “jump”, “touch your nose”. */
  command: string;
  emoji?: string;
  /** The line the adult says out loud while doing it — “Jump like a frog!” */
  do?: string;
  /** The two-step chain, for the 4- and 5-year-olds: “Clap, then jump!” */
  twoStep?: string;
}

export interface KidLessonMovement {
  /** The action ladder, in the order it is taught. */
  commands?: KidLessonMovementCommand[];
  /** The ONE command that is new today; every other one is already known. */
  newCommand?: string;
  /** fast · slow · whisper · robot — the same six words in a different voice. */
  speedPlay?: string[];
  /** The commands the CHILD gives the adult in the crown round. */
  bossRound?: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
   ROUTINES & WORDS

   A routine lesson is the one kind whose real teaching happens between sessions,
   at the sink, the table and the bed, spoken by a parent who may not speak a word
   of English. Everything here exists to make THAT work:

     · `moments` — the two or three real moments of the routine, each with the
       exact English the grown-up says, what the child does back and the ONE word
       the child says. The fixed wording is the method: the same sentence at the
       same moment is what a two-year-old's memory latches onto, so it is written
       down rather than left to the parent's invention.

     · `pronunciation` — say-it-like-this hints for each word. This is the part
       every other kind can assume away and this one cannot: a parent reading
       "wash your hands" may never have said the words out loud, and a hint that
       rhymes with something they know is the difference between the family doing
       it all week and not doing it at all.

     · `sameLine` — the ritual line, said the SAME way at every moment, so the
       child hears the routine coming before the routine arrives.
     · `fillIn` — the call-and-response the child finishes ("wash, wash, wash your
       …" → "hands!"). In a routine this is the biggest talking lever there is,
       because the child can supply the missing word from the gesture alone.
   ──────────────────────────────────────────────────────────────────────────── */
export interface KidLessonRoutineMoment {
  /** The real moment: “wash hands”, “eat”, “bedtime”. */
  moment: string;
  emoji?: string;
  /** The exact English the grown-up says at that moment, word for word. */
  say: string;
  /** What the child does back — the action, never a test. */
  childDoes?: string;
  /** The ONE word the child can say here. */
  childSays?: string;
  /** The real photograph of this moment, so the child sees the actual place. */
  photoQuery?: string;
}

/** One word, and how a parent who does not speak English says it out loud. */
export interface KidLessonRoutinePronunciation {
  word: string;
  hint?: string;
}

export interface KidLessonRoutine {
  /** What this routine is called for the family: “Bath, Food and Bed”. */
  name?: string;
  /** The moments, in the order they happen in the child's day. */
  moments?: KidLessonRoutineMoment[];
  /** The line said the same way every single time, at every one of the moments. */
  sameLine?: string;
  /** The half-line the child always finishes. */
  fillIn?: string;
  /** Say-it-like-this hints, so the whole family can run it. */
  pronunciation?: KidLessonRoutinePronunciation[];
}

/* ────────────────────────────────────────────────────────────────────────────
   CIRCLE TIME & ROUTINES

   The circle is the one lesson whose content is almost entirely the SAME every week,
   and that is the method rather than laziness: the ritual is safe, so the one new
   word is the only thing that has to be learned. Everything here exists to make the
   tutor repeatable and the child loud:

     · `hello` / `goodbye` — the two songs, line by line and word for word, so next
       week's session opens and closes with the identical words. A circle with a new
       hello every week is a different lesson, not this one.
     · `check` — the four big pictures the child points at (sunny, rainy, happy,
       sleepy). Pointing IS the answer; the tutor says the word back. The same four
       every week, so the child can answer before they can speak.
     · `waitLine` — the words said before EVERY reveal (“Tap it... tap it... OPEN!”).
       The same wait is what makes the surprise a ritual instead of a reveal, and the
       child says the last word of it along with you every single time.
     · `surprise` — the ONE new thing in the box. One word only: everything else in
       the session is already known, so this single word is what the whole circle
       exists to carry. At 5-12 it comes back in two sentences of the child's own and
       is written once.
     · `ask` — the check-in questions, in order, for a child who answers in a full
       sentence. At 5-12 the child asks them too, and that is the lesson.
   ──────────────────────────────────────────────────────────────────────────── */
export interface KidLessonCirclePicture {
  /** What the picture shows: “sunny”, “rainy”, “happy”, “sleepy”. */
  look: string;
  emoji?: string;
  /** Exactly what the child says while pointing — the tutor's model answer. */
  childSays?: string;
}

export interface KidLessonCircle {
  /** What the family calls this circle: “The Hello Circle”. */
  name?: string;
  /** The hello song, line by line — the SAME words at the start of every lesson. */
  hello?: string[];
  /** The goodbye song, line by line — the SAME words at the end of every lesson. */
  goodbye?: string[];
  /** The big pictures the child points at for the check-in. */
  check?: KidLessonCirclePicture[];
  /** The line said before every reveal, word for word: “Tap it... tap it... OPEN!” */
  waitLine?: string;
  /** The ONE new word in the mystery box. */
  surprise?: string;
  /** The check-in questions in order, for a child who answers in full sentences. */
  ask?: string[];
  /** The one sentence the child closes with: what they will do before next lesson. */
  nextTime?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
   PRINTABLE WORKSHEETS

   A worksheet is the one kind that is a THING rather than a session: it gets printed,
   it gets written on, and it goes home. That is exactly why the talk has to be built
   into the paper — a child filling boxes in silence has practised handwriting, not
   English. Everything here exists to put a speaking turn inside every task:

     · `tasks` — one entry per thing the child does on the page, and every entry
       carries three scripts: what the child does with the crayon or pencil (`do`),
       the exact English the grown-up says (`say`), and what the child says back
       (`childSays`). A task with no talking turn is a task that teaches nothing out
       loud, which at 2-5 is the whole lesson.
     · `paper` — the physical requirement (“colour”, “cut and stick”, “ruled boxes”,
       “draw one line”), printed beside the task so the tutor can see at a glance
       that the sheet is doable with what is already on the table.
     · `traceWords` — the handwriting set: traced with a finger at 2-5 (never a
       pencil) and traced before writing them alone at 5-12.
     · `talkFrame` — the one frame the child finishes about their own page, which is
       what turns a finished sheet into a spoken paragraph.
     · `answerKey` — the adult's answers, kept as data so the child can mark their own
       work at 5-12 instead of waiting for the tutor.
   ──────────────────────────────────────────────────────────────────────────── */
export interface KidLessonSheetTask {
  /** What the child does on the paper: “Colour the big duck yellow.” */
  do: string;
  emoji?: string;
  /** The physical bit: colour · cut and stick · ruled boxes · draw one line. */
  paper?: string;
  /** The EXACT English the grown-up says, word for word. */
  say?: string;
  /** What the child says back — every task has one talking turn. */
  childSays?: string;
  /** How many ruled boxes this task needs, for the writing tasks. */
  boxes?: number;
}

export interface KidLessonSheet {
  /** What the family calls the page: “The Pond Page”. */
  name?: string;
  /** The tasks, in the order they appear on the paper. */
  tasks?: KidLessonSheetTask[];
  /** The words the child traces before writing them alone. */
  traceWords?: string[];
  /** The one frame the child finishes about their own page. */
  talkFrame?: string;
  /** The adult's answers, so the child can mark their own work. */
  answerKey?: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
   THE QUEST BOARD — a week of jobs, each one with its XP and its line

   Homework Quest is not a list of homework sentences. What makes it a lesson is
   that every job carries FOUR things at once:

     · `do`        — what the child does (bring something blue, sing in the bath)
     · `say`       — the EXACT English the grown-up says, word for word
     · `childSays` — the line the child says back; every job has a talking turn
     · `xp`        — what the job is worth, so the week adds up to something

   plus `proof` — how the job proves itself (a photo, a grown-up's initials, or
   simply said aloud) — because a home task nobody can see is a home task that
   quietly does not happen. The board carries the two things that make a home
   quest real: a nightly `tally` the child marks, and a `reward` the whole house
   knows about. The 5-12 board adds `master` — the child reads the jobs, chooses
   the order, awards the XP and writes the proof line, because running the quest
   is the level above doing it.
   ──────────────────────────────────────────────────────────────────────────── */
export interface KidLessonQuestJob {
  /** What the child does: “Bring something blue to a grown-up.” */
  do: string;
  emoji?: string;
  /** The EXACT English the grown-up says, word for word. */
  say?: string;
  /** The line the child says back — the talking turn inside every job. */
  childSays?: string;
  /** What the job is worth: XP the child marks on the tally. */
  xp?: number;
  /** How the job proves itself: photo · initials · said aloud. */
  proof?: string;
  /** Which night this job belongs to (“night one”, “all week”). */
  night?: string;
}

export interface KidLessonQuest {
  /** What the family calls the quest: “The Blue Finder”. */
  name?: string;
  /** Who does this with the child — a grown-up, a big brother, the pet. */
  partner?: string;
  /** The jobs, in the order the passing family should see them. */
  jobs?: KidLessonQuestJob[];
  /** The nightly tally the child marks: “colour one star for every job”. */
  tally?: string;
  /** What the week adds up to. */
  reward?: string;
  /** 5-12 only: the child's own job of running the board. */
  master?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
   THE STORY THE CHILD WALKS THROUGH (TPR-Storytelling)

   Move & Tell a Story is not a story lesson with actions sprinkled on top, and it
   is not a movement lesson with a plot. The story and the body are the same thing:
   every sentence of it is something the child DOES, and the doing is what makes the
   words stick. Four things about it are the whole pedagogy:

     · `beats`  — the story, one beat at a time. Each beat carries the sentence the
       tutor tells, the action the child performs on it, and the exact chunk the child
       says back. A beat without an action is a page of a reading story and does not
       belong here.
     · `echo`   — the one line that comes back in every beat ("and the frog went
       hop, hop, hop!"). The echo is why a two-year-old is talking from beat one:
       they are not answering a question, they are joining a line they already know.
     · `map`    — three or four pictures in order. The retell in this kind is done
       with the body, not with sentences, so the map is what the child acts out.
     · `choose` — the beat where the CHILD decides what happens next. Up to here
       they have been joining in; this is the first sentence that is theirs.

   The 5-12 version adds `chain` — two-step commands ("creep to the door, then push
   it") — because a two-step command is the real step up from one action, and it is
   the cheapest way to make an older child listen to the whole sentence.
   ──────────────────────────────────────────────────────────────────────────── */
export interface KidLessonStoryWalkBeat {
  /** The sentence the tutor tells, told aloud, never read by the child. */
  line: string;
  /** What the child does on that sentence — the body doing the remembering. */
  action: string;
  /** The exact chunk the child says back on this beat, if it is not the echo. */
  say?: string;
  emoji?: string;
}

export interface KidLessonStoryWalk {
  /** What the story is called: “The Frog Who Lost His Hop”. */
  title?: string;
  /** The story, beat by beat — every beat has an action the child performs. */
  beats?: KidLessonStoryWalkBeat[];
  /** The line that comes back in every beat, so the child joins in from the start. */
  echo?: string;
  /** Three or four pictures in order — the story the child acts out from memory. */
  map?: string[];
  /** The beat where the child decides what happens next, and says it. */
  choose?: string;
  /** Two-step commands, 5-12 only: the chain the older child has to hold in mind. */
  chain?: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
   THE STORY

   A story lesson is not a lesson with a story in it. The story IS the lesson, and
   everything else — the words, the questions, the game — hangs off it. So the story
   gets its own object rather than being flattened into `steps`, because four things
   about it are the whole pedagogy and each one needs to be structured to work:

     1. `pages`    — the story itself, one entry per page, told in order.
     2. `map`      — character, setting, problem, feeling, ending. Every retell a
                     child gives is assembled out of these five, so they are named.
     3. `rungs`    — the RETOLD story, three times, with less help each time:
                     with the words, then with the pictures only, then from memory.
                     This is the single biggest talking lever in a story lesson:
                     one reading gives one retell, the ladder gives three.
     4. `roleplay` — hot-seating. The tutor is IN ROLE as a character and the child
                     interviews them. It is where comprehension turns into speech.

   `pairedBook` is the honest bit: a real, free read-aloud picture book that a
   person — an actor, a real narrator — actually reads, so the child hears the
   music of a story from someone other than their tutor.
   ──────────────────────────────────────────────────────────────────────────── */
export interface KidLessonStoryPage {
  /** One page, one sentence or two. Told aloud, not read by a beginner. */
  text: string;
  emoji?: string;
  /** Who says this line, if it is a character speaking. */
  speaker?: string;
}

export interface KidLessonStoryMap {
  character?: string;
  setting?: string;
  problem?: string;
  feeling?: string;
  ending?: string;
}

/** One rung of the retelling ladder — the same story back, with less help. */
export interface KidLessonRetellRung {
  /** What the child gets on this rung: the pages and words, the pictures, or nothing. */
  with: string;
  /** What the tutor says to hand the story over. */
  prompt: string;
  talkTarget?: number;
}

export interface KidLessonStory {
  pages: KidLessonStoryPage[];
  map?: KidLessonStoryMap;
  rungs?: KidLessonRetellRung[];
  roleplay?: {
    character: string;
    emoji?: string;
    /** The questions the TUTOR gets asked — the child does the asking. */
    questions: string[];
    /** Lines the child can voice in role, if they want a script at first. */
    lines?: string[];
  };
  /** A real, free read-aloud picture book this story is paired with. */
  pairedBook?: { title: string; url: string; source?: string; why?: string };
}

export interface KidLessonRun {
  /** The session length the run sheet adds up to. 30 unless the tutor changed it. */
  targetMinutes?: number;
  /** Movement and reset breaks, spread through the session so nobody sits still. */
  brainBreaks?: string[];
  /** Three things the child can now say — the proof the session did something. */
  exitTicket?: string[];
  /** What the next session opens with, so a lesson never just stops. */
  nextTime?: string;
}

export interface KidLessonGameItem {
  prompt: string;
  answer: string;
  distractors?: string[];
  picture?: string;
  /* ── What a QUESTION needs that a game word does not ──────────────────────
     A quiz round that ends in a tap teaches recognition and nothing else. These
     four turn every round into a talking turn: the sentence the child says when
     they are right (`childSays` — the engine prints it inside the “Yes!”), the
     follow-up the adult asks after (`ask`), and the real photograph the question
     is about (`photoQuery` / `lookFor`), so the round is anchored in a real
     picture instead of a drawing of one. */
  /** The whole sentence the child says when they answer: “The duck swims.” */
  childSays?: string;
  /** The grown-up's follow-up question after the answer. */
  ask?: string;
  /** What to search for a real photo of this question. */
  photoQuery?: string;
  /** The one thing to look at in that photo. */
  lookFor?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
   THE QUIZ NIGHT — the rounds, the score and the child's own final round

   Picture Quiz is a quiz, so the questions are the spine (they stay in `game.items`,
   because that is what the quiz player reads). What the night adds is the shape
   around them: the named rounds the class runs in order, the score line that makes
   the score a sentence instead of a number, and — at 5-12 — `master`, the final
   round the CHILD runs: they read the question, the grown-up answers (sometimes
   wrongly on purpose) and the child judges it and explains why.
   ──────────────────────────────────────────────────────────────────────────── */
/**
 * ONE card of the deck.
 *
 * The failure mode a flashcard deck has is silence: the child names a picture, taps
 * the next card and says nothing that needed the language. So every card carries the
 * exact English the grown-up says AND the child's own talking turn, and the back of
 * the card is something to DO with the word rather than another label for it.
 */
export interface KidLessonCard {
  /** The word the child must be able to say. */
  word: string;
  /** The picture side — big enough to name from across the table. */
  emoji?: string;
  /** The EXACT English the grown-up says when the card goes down. */
  say?: string;
  /** The one word, sound or sentence the child says back. */
  childSays?: string;
  /** 2-5: the body action the back of the card asks for (quack, waddle, splash). */
  do?: string;
  /** 5-12: the picture cue that makes the word answerable. */
  cue?: string;
  /** 5-12: an example sentence using the word in the child's own world. */
  sentence?: string;
  /** 5-12: every fifth card mixes two earlier words — the words it mixes. */
  review?: string[];
}

/**
 * The deck itself: the cards, the passes, and the real-week spaced schedule.
 *
 * A deck is a SESSION, not a screen. The session is the six-phase card night; the
 * deck (and only the deck) is the drill inside it. What makes a deck stick is what
 * happens after the lesson, which is why the spacing schedule is part of the deck
 * and not a footnote.
 */
export interface KidLessonDeck {
  /** What the class calls the pack: “The Pond Pack”. */
  name?: string;
  /** The cards, in the order they are dealt. */
  cards?: KidLessonCard[];
  /** The named passes of the session, in the order they are dealt. */
  passes?: string[];
  /** The line the class says when the pack is finished. */
  scoreLine?: string;
  /** 5-12: the child runs the deck — read it, grade it, deal it, quiz the tutor. */
  master?: string;
  /** The real-week schedule: which cards come back tonight, tomorrow, in three days. */
  spacing?: string[];
}

export interface KidLessonQuiz {
  /** What the family calls the night: “The Pond Quiz Show”. */
  name?: string;
  /** The named rounds, in the order the class runs them. */
  rounds?: string[];
  /** How the score is said out loud, so the score line is English too. */
  scoreLine?: string;
  /** 5-12 only: the child's own final round — read it, judge it, explain it. */
  master?: string;
}

/* ── The arcade ladder, the replay and the tutor's scoring lines ──────────────
   A word game is only a game if the difficulty RISES in steps the child can see,
   and only a lesson if the tutor knows exactly what to say. An arcade lesson that
   was just `items` gave one flat round: the same speed, the same words, and a
   tutor improvising the score. These three carry the missing pedagogy — the
   visible levels, the words that got away (played again, so the night ends on a
   win), and the two lines the tutor says on a hit and a miss, said OUT LOUD with
   no screen at all. */
export interface KidLessonGameLevel {
  /** What the class calls this level: “Level 2 — the trick words”. */
  name: string;
  /** The exact words this level plays with. */
  words: string[];
  /** The wrong answers this level throws at the child — never random words. */
  distractors?: string[];
  /** What rises here: speed, word count, or the second rule. */
  rise?: string;
}

export interface KidLessonGameScoring {
  /** The exact words when the child gets it right. */
  hit?: string;
  /** The exact words on a miss — kind first, then the retry. */
  miss?: string;
  /** How the score is said out loud when there is no screen. */
  scoreLine?: string;
}

export interface KidLessonGame {
  name: string;
  howToPlay?: string;
  winCondition?: string;
  turns?: number;
  items?: KidLessonGameItem[];
  /** How to run it with no screen at all. */
  offline?: string;
  /** The visible difficulty ladder — level 1, level 2, level 3 — in play order. */
  levels?: KidLessonGameLevel[];
  /** Round two: exactly the words that got away, so the win can be repeated. */
  retrySet?: string[];
  /** The tutor's word-for-word lines for a hit and a miss. */
  scoring?: KidLessonGameScoring;
  /** The arcade sounds, to be made with a mouth when the screen is off. */
  sounds?: string[];
}

export interface KidLesson {
  title: string;
  kind?: string;
  band?: string;
  ageRange?: string;
  durationMinutes?: number;
  objectives?: string[];
  materials?: string[];
  words?: KidLessonWord[];
  steps?: KidLessonStep[];
  game?: KidLessonGame;
  lyrics?: string[];
  chantRhythm?: string;
  worksheet?: string[];
  homework?: string[];
  caregiverNote?: string;
  teacherNote?: string;
  /** Real, free media links (video, audio, embedded activity, picture, story). */
  media?: KidLessonMedia[];

  /* ── Hyper-realistic, talk-heavy, 30 minutes ──────────────────────────────
     These four are what turn a set of activities into a SESSION: something real
     to look at, something real to do, a clock, and a defined end. */
  /** The real photograph and the real clip the lesson is anchored in. */
  scene?: KidLessonScene;
  /** The real-world thing the child talks their way through. */
  mission?: KidLessonMission;
  /** The clock: total minutes, breaks, exit ticket and the next session's hook. */
  run?: KidLessonRun;
  /** The story itself, when the kind of lesson is a story. */
  story?: KidLessonStory;
  /** The sound ladder, when the kind of lesson is phonics. */
  phonics?: KidLessonPhonics;
  /** The command ladder and the crown round, when the kind of lesson is TPR. */
  movement?: KidLessonMovement;
  /** The three moments and the family script, when the kind is a routine. */
  routine?: KidLessonRoutine;
  /** The same hello, the check-in and the ONE surprise, when the kind is a circle. */
  circle?: KidLessonCircle;
  /** The printable's tasks with their talking turns, when the kind is a sheet. */
  sheet?: KidLessonSheet;
  /** The week of jobs with their XP and their lines, when the kind is a quest. */
  quest?: KidLessonQuest;
  /** The rounds, the score line and the child's final round, when the kind is a quiz. */
  quiz?: KidLessonQuiz;
  /** The cards, the passes and the spaced schedule, when the kind is a deck. */
  deck?: KidLessonDeck;
  /** The story the child walks through, when the kind is TPR-storytelling. */
  storyWalk?: KidLessonStoryWalk;
  /** The number of spoken sentences the whole session owes, across every phase. */
  talkGoal?: number;
  /** Anything the AI added that we do not know about is kept, not thrown away. */
  extra?: Record<string, unknown>;
}

/**
 * The parts a lesson can carry, in the order the editor and the preview show them.
 *
 * Kept here rather than in the component so the editor, the preview, the HTML export
 * and the mock lessons all agree on one list — a part that exists in only one of them
 * is a part the tutor can neither see nor edit.
 */
export type KidLessonEditorPart = 'objectives' | KidLessonPiece;

export const KID_LESSON_PART_ORDER: KidLessonEditorPart[] = [
  'objectives',
  'phonics',
  'movement',
  'routine',
  'circle',
  'sheet',
  'quest',
  'quiz',
  'deck',
  'storyWalk',
  'story',
  'scene',
  'words',
  'media',
  'steps',
  'game',
  'mission',
  'lyrics',
  'worksheet',
  'homework',
  'run',
  'caregiverNote',
];

/** A simple name for each part, for buttons that add or remove it. */
export const KID_LESSON_PART_LABEL: Record<KidLessonEditorPart, string> = {
  objectives: 'What the child will do',
  story: 'The story, the retells & the hot-seat',
  phonics: 'The sound ladder & the word drill',
  movement: 'The command ladder & the boss round',
  routine: 'The three moments & the family script',
  circle: 'The same circle, every week',
  sheet: 'The tasks, and the talking turn inside each one',
  quest: 'The jobs, the XP and the proof',
  quiz: 'The rounds, the score & the master round',
  deck: 'The cards, the sort & the spaced schedule',
  storyWalk: 'The story the child walks through',
  scene: 'The real picture & clip',
  words: 'Words',
  media: 'Videos & songs',
  steps: 'The 30-minute run sheet',
  game: 'Game',
  mission: 'Real-world mission',
  lyrics: 'Song words',
  worksheet: 'To print',
  homework: 'At home',
  run: 'Clock, breaks & exit ticket',
  caregiverNote: 'Note for the family',
};

export interface KidLessonParseResult {
  ok: boolean;
  error?: string;
  /** Concrete things to fix, shown under the error. Especially JSON syntax hints. */
  problems?: string[];
  lesson?: KidLesson;
  /** Human summary of what came back, e.g. "6 steps · 5 words · 1 game". */
  summary?: string;
  /** Pieces the kind wanted but the reply did not contain. */
  missing?: KidLessonPiece[];
}

/**
 * Turns a JSON.parse failure into a message a tutor can act on.
 *
 * "Unexpected token } in JSON at position 214" tells a tutor nothing. This says
 * where the parser stopped in the pasted text and, from the text itself, which of
 * the usual AI mistakes caused it — a trailing comma, curly quotes, unbalanced
 * braces, a placeholder left in. The paste box shows these as a list under the
 * error, because the fix is usually one small edit rather than a new reply.
 *
 * Exported so the game parser (`kidGamePrompt.ts`) reports JSON failures the same
 * way instead of inventing its own wording.
 */
function locationOf(text: string, pos: number): string {
  const before = text.slice(0, Math.max(0, pos));
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  return `line ${line}, column ${col}`;
}

export function describeKidJsonError(text: string, message: string): { error: string; problems: string[] } {
  const problems: string[] = [];
  let where = '';
  const v8 = message.match(/position\s+(\d+)/i);
  if (v8) {
    const pos = Math.min(Math.max(Number(v8[1]), 0), text.length);
    where = ` — the parser stopped at ${locationOf(text, pos)} of what you pasted`;
  } else {
    const ff = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    if (ff) where = ` — the parser stopped at line ${ff[1]}, column ${ff[2]} of what you pasted`;
  }
  /* Newer engines often say only what token broke, with no position. The text
     itself knows where: the usual culprits are findable, and a location beats
     a vague "invalid JSON". */
  if (!where) {
    const trailing = text.match(/,\s*[}\]]/);
    const curly = text.search(/[“”‘’]/);
    if (trailing?.index != null) where = ` — the offending comma is at ${locationOf(text, trailing.index)} of what you pasted`;
    else if (curly >= 0) where = ` — the first curly quote is at ${locationOf(text, curly)} of what you pasted`;
  }

  const opens = (text.match(/\{/g) || []).length;
  const closes = (text.match(/\}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/\]/g) || []).length;

  if (/,\s*[}\]]/.test(text)) problems.push('There is a comma right before a closing } or ] — JSON does not allow trailing commas.');
  if (/[“”‘’]/.test(text)) problems.push('The reply uses curly quotes (“ ” ‘ ’) — JSON needs plain straight " quotes.');
  if (/\}\s*\{/.test(text)) problems.push('Two objects are glued together without a comma between them.');
  if (opens !== closes) problems.push(`The curly braces do not balance: ${opens} “{” against ${closes} “}”. Copy the whole reply, starting at the first { and ending at the last }.`);
  if (openBrackets !== closeBrackets) problems.push(`The square brackets do not balance: ${openBrackets} “[” against ${closeBrackets} “]”. A list is missing its closing ].`);
  if (/(\.\.\.)|(\bTBD\b)|(\bTODO\b)/i.test(text)) problems.push('The reply still contains "..." or a placeholder — ask the AI to fill in every field.');
  if (!problems.length) {
    problems.push('The usual causes: a missing comma between two items, an unescaped double quote inside a sentence (write \\" instead), or text copied without the closing brace.');
  }
  return { error: `That is not valid JSON yet${where}. ${message}`, problems };
}

/** Accepts a plain object, a fenced ```json block, or JSON with chatty text around it. */
export function cleanKidLessonJson(text: string): string {
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  if (!cleaned.startsWith('{')) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned;
}

/**
 * A number an AI wrote, however it wrote it.
 *
 * “5”, 5 and "5 minutes" all mean five minutes to a tutor, and the run sheet depends
 * on these adding up to a 30-minute session — so a string that starts with a number
 * is read as that number rather than thrown away and silently shortening the lesson.
 */
const numberOf = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 0 ? Math.round(value) : undefined;
  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) {
      const n = Number(match[0]);
      return n > 0 ? n : undefined;
    }
  }
  return undefined;
};

const asStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((item) => (typeof item === 'string' ? item : item && typeof item === 'object' ? String((item as any).text ?? (item as any).name ?? '') : ''))
    .map((s) => s.trim())
    .filter(Boolean);
  return out.length ? out : undefined;
};

/**
 * Reads an AI reply into a lesson, checking the pieces the chosen kind promised.
 *
 * It is deliberately forgiving about *shape* (an AI will call things `steps`, `activities`
 * or `plan`; a picture card may be `words`, `vocabulary` or `targetWords`) and strict about
 * *substance*: a lesson with no title, or with nothing a child can actually do, is
 * reported as wrong here rather than rendered as three empty boxes.
 */
export function parseKidLesson(text: string, kind?: KidLessonKind): KidLessonParseResult {
  const cleaned = cleanKidLessonJson(text);
  if (!cleaned) return { ok: false, error: 'Paste the AI’s reply first — the whole thing, starting with the {.' };

  let raw: any;
  try {
    raw = JSON.parse(cleaned);
  } catch (e: any) {
    const help = describeKidJsonError(cleaned, String(e?.message || 'check for a missing comma or quote'));
    return { ok: false, error: help.error, problems: help.problems };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'The reply was JSON, but not a lesson object — it should start with { "title": … }.',
      problems: ['If the AI returned a list, ask it for one lesson object with "title", "words", "steps" and "game" inside it.'],
    };
  }

  const lesson = raw.lesson && typeof raw.lesson === 'object' ? { ...raw.lesson, ...raw } : raw;
  const title = String(lesson.title ?? lesson.name ?? lesson.lessonTitle ?? '').trim();
  if (!title) return { ok: false, error: 'The lesson has no "title". Ask the AI to put a child-friendly title first.' };

  const wordsRaw = lesson.words ?? lesson.vocabulary ?? lesson.targetWords ?? lesson.targetVocabulary ?? lesson.flashcards;
  let words: KidLessonWord[] | undefined;
  if (Array.isArray(wordsRaw)) {
    words = wordsRaw
      .map((item: any) => {
        if (typeof item === 'string') return { word: item.trim() };
        if (!item || typeof item !== 'object') return null;
        const word = String(item.word ?? item.term ?? item.front ?? item.label ?? '').trim();
        if (!word) return null;
        return {
          word,
          emoji: item.emoji ? String(item.emoji) : undefined,
          sayAloud: item.sayAloud ?? item.say ?? item.pronunciation ?? item.sound ? String(item.sayAloud ?? item.say ?? item.pronunciation ?? item.sound) : undefined,
          meaning: item.meaning ?? item.definition ? String(item.meaning ?? item.definition) : undefined,
          example: item.example ?? item.sentence ? String(item.example ?? item.sentence) : undefined,
        } as KidLessonWord;
      })
      .filter(Boolean) as KidLessonWord[];
    if (!words.length) words = undefined;
  }

  const stepsRaw = lesson.steps ?? lesson.activities ?? lesson.plan ?? lesson.sequence;
  let steps: KidLessonStep[] | undefined;
  if (Array.isArray(stepsRaw)) {
    steps = stepsRaw
      .map((item: any, i: number) => {
        if (typeof item === 'string') return { name: item.trim() };
        if (!item || typeof item !== 'object') return null;
        const name = String(item.name ?? item.title ?? item.step ?? item.activity ?? `Step ${i + 1}`).trim();
        return {
          name,
          minutes: typeof item.minutes === 'number' ? item.minutes : item.minutes ?? item.duration ?? item.time,
          teacherScript: item.teacherScript ?? item.script ?? item.say ?? item.teacher ? String(item.teacherScript ?? item.script ?? item.say ?? item.teacher) : undefined,
          childAction: item.childAction ?? item.child ?? item.studentAction ? String(item.childAction ?? item.child ?? item.studentAction) : undefined,
          print: item.print ?? item.printable ?? item.worksheet ? String(item.print ?? item.printable ?? item.worksheet) : undefined,
          tip: item.tip ?? item.note ? String(item.tip ?? item.note) : undefined,
          /* The run-sheet fields. Read under every name an AI reaches for, because a
             tutor should not have to learn our field names to get a 30-minute lesson. */
          phase: item.phase ?? item.stage ?? item.block ? String(item.phase ?? item.stage ?? item.block) : undefined,
          floorMinutes: numberOf(item.floorMinutes ?? item.minimumMinutes ?? item.minMinutes ?? item.floor),
          talkTarget: numberOf(item.talkTarget ?? item.childSays ?? item.minutesSpeaking ?? item.sentences ?? item.talkCount),
          sayFrame: item.sayFrame ?? item.frame ?? item.sentenceFrame ?? item.childSaysFrame
            ? String(item.sayFrame ?? item.frame ?? item.sentenceFrame ?? item.childSaysFrame)
            : undefined,
          questionLadder: asStringArray(item.questionLadder ?? item.questions ?? item.askThem ?? item.ladder),
          reserve: asStringArray(item.reserve ?? item.ifTime ?? item.extra ?? item.stretch),
          drill: item.drill === true || item.isDrill === true || /^drill$/i.test(String(item.kind ?? '')) ? true : undefined,
        } as KidLessonStep;
      })
      .filter(Boolean) as KidLessonStep[];
    if (!steps.length) steps = undefined;
  }

  const mediaRaw = lesson.media ?? lesson.mediaLinks ?? lesson.links ?? lesson.resources ?? lesson.videos;
  let media: KidLessonMedia[] | undefined;
  if (Array.isArray(mediaRaw)) {
    media = mediaRaw
      .map((item: any) => {
        if (typeof item === 'string') {
          const url = item.trim();
          return /^https?:\/\//.test(url) ? ({ kind: 'video', title: 'Link', url } as KidLessonMedia) : null;
        }
        if (!item || typeof item !== 'object') return null;
        const url = String(item.url ?? item.link ?? item.href ?? '').trim();
        if (!/^https?:\/\//.test(url)) return null;
        const rawKind = String(item.kind ?? item.type ?? 'video').toLowerCase();
        const kind: KidLessonMediaKind = /audio|song|music|sound/.test(rawKind)
          ? 'audio'
          : /activity|quiz|game|interactive|embed/.test(rawKind)
            ? 'activity'
            : /picture|photo|image|svg|poster/.test(rawKind)
              ? 'picture'
              : /story|read|book/.test(rawKind)
                ? 'story'
                : 'video';
        const rawPlace = String(item.where ?? item.place ?? 'class').toLowerCase();
        const where: KidLessonMediaPlace = rawPlace === 'home' ? 'home' : rawPlace === 'both' ? 'both' : 'class';
        const searchUrl = String(item.searchUrl ?? item.search ?? '').trim();
        return {
          kind,
          title: String(item.title ?? item.name ?? 'Watch and sing').trim() || 'Watch and sing',
          url,
          searchUrl: /^https?:\/\//.test(searchUrl) ? searchUrl : undefined,
          where,
          forStep: item.forStep ?? item.step ? String(item.forStep ?? item.step) : undefined,
          why: item.why ?? item.note ? String(item.why ?? item.note) : undefined,
          source: item.source ? String(item.source) : undefined,
          embeddable: typeof item.embeddable === 'boolean' ? item.embeddable : undefined,
        } as KidLessonMedia;
      })
      .filter(Boolean) as KidLessonMedia[];
    if (!media.length) media = undefined;
  }

  /* `quiz` is read LAST: this kind's own night object also lives under that name, and
     a real game must never lose to the quiz night's round names. */
  const gameRaw = lesson.game ?? lesson.guessGame ?? lesson.mainGame ?? lesson.quiz;
  let game: KidLessonGame | undefined;
  if (gameRaw && typeof gameRaw === 'object') {
    const itemsRaw = gameRaw.items ?? gameRaw.questions ?? gameRaw.rounds ?? gameRaw.cards ?? lesson.quizItems;
    const items = Array.isArray(itemsRaw)
      ? (itemsRaw
          .map((item: any) => {
            if (!item || typeof item !== 'object') return null;
            const prompt = String(item.prompt ?? item.question ?? item.say ?? '').trim();
            const answer = String(item.answer ?? item.correct ?? item.correctAnswer ?? item.word ?? '').trim();
            if (!prompt || !answer) return null;
            const distractors = asStringArray(item.distractors ?? item.options ?? item.wrongAnswers ?? item.choices)?.filter((d) => d !== answer);
            return {
              prompt,
              answer,
              distractors,
              picture: item.picture ?? item.image ?? item.emoji ? String(item.picture ?? item.image ?? item.emoji) : undefined,
              childSays: item.childSays ?? item.child ?? item.says ?? item.sentence ? String(item.childSays ?? item.child ?? item.says ?? item.sentence) : undefined,
              ask: item.ask ?? item.followUp ?? item.then ? String(item.ask ?? item.followUp ?? item.then) : undefined,
              photoQuery: item.photoQuery ?? item.photo ?? item.realPhoto ?? item.pictureSearch ? String(item.photoQuery ?? item.photo ?? item.realPhoto ?? item.pictureSearch) : undefined,
              lookFor: item.lookFor ?? item.look ?? item.notice ? String(item.lookFor ?? item.look ?? item.notice) : undefined,
            } as KidLessonGameItem;
          })
          .filter(Boolean) as KidLessonGameItem[])
      : undefined;
    const name = String(gameRaw.name ?? gameRaw.title ?? lesson.gameName ?? 'Word game').trim();
    game = {
      name,
      howToPlay: gameRaw.howToPlay ?? gameRaw.rules ?? gameRaw.instructions ? String(gameRaw.howToPlay ?? gameRaw.rules ?? gameRaw.instructions) : undefined,
      winCondition: gameRaw.winCondition ?? gameRaw.win ? String(gameRaw.winCondition ?? gameRaw.win) : undefined,
      turns: typeof gameRaw.turns === 'number' ? gameRaw.turns : undefined,
      items: items && items.length ? items : undefined,
      offline: gameRaw.offline ?? gameRaw.noScreen ? String(gameRaw.offline ?? gameRaw.noScreen) : undefined,
      /* The arcade ladder: only levels that name themselves AND their words survive,
         because a level with no words is a heading, not a round. */
      levels: Array.isArray(gameRaw.levels)
        ? (gameRaw.levels
            .map((level: any) => {
              if (!level || typeof level !== 'object') return null;
              const levelName = String(level.name ?? level.level ?? level.title ?? '').trim();
              const levelWords = asStringArray(level.words ?? level.targets ?? level.items ?? level.vocab);
              if (!levelName || !levelWords || !levelWords.length) return null;
              return {
                name: levelName,
                words: levelWords,
                distractors: asStringArray(level.distractors ?? level.tricky ?? level.wrong ?? level.confusables),
                rise: level.rise ?? level.rises ?? level.whatChanges ?? level.change
                  ? String(level.rise ?? level.rises ?? level.whatChanges ?? level.change)
                  : undefined,
              } as KidLessonGameLevel;
            })
            .filter(Boolean) as KidLessonGameLevel[])
        : undefined,
      /* Round two is the same game with the words that got away — the smallest win
         a child can repeat in the same session. */
      retrySet: asStringArray(gameRaw.retrySet ?? gameRaw.retryWords ?? gameRaw.retry ?? gameRaw.secondRound ?? gameRaw.again),
      sounds: asStringArray(gameRaw.sounds ?? gameRaw.sfx ?? gameRaw.soundEffects),
      scoring: (() => {
        const rawScoring = gameRaw.scoring ?? gameRaw.scoreScript ?? gameRaw.scoringScript;
        if (typeof rawScoring === 'string') return { scoreLine: rawScoring } as KidLessonGameScoring;
        const score = rawScoring && typeof rawScoring === 'object' ? rawScoring : {};
        const line = score.scoreLine ?? score.line ?? score.say ?? gameRaw.scoreLine;
        const hit = score.hit ?? score.right ?? score.correct ?? score.good ?? gameRaw.hitLine;
        const miss = score.miss ?? score.wrong ?? score.oops ?? score.nearly ?? gameRaw.missLine;
        if (!hit && !miss && !line) return undefined;
        return {
          hit: hit ? String(hit) : undefined,
          miss: miss ? String(miss) : undefined,
          scoreLine: line ? String(line) : undefined,
        } as KidLessonGameScoring;
      })(),
    };
  }

  const lyricsSource = lesson.lyrics ?? lesson.song ?? lesson.chant ?? lesson.songLyrics;
  let lyrics: string[] | undefined;
  if (Array.isArray(lyricsSource)) lyrics = asStringArray(lyricsSource);
  else if (typeof lyricsSource === 'string') lyrics = lyricsSource.split('\n').map((l) => l.trim()).filter(Boolean);
  else if (lyricsSource && typeof lyricsSource === 'object') lyrics = asStringArray((lyricsSource as any).lines ?? (lyricsSource as any).verses);

  /* ── The real scene, the real mission and the clock ────────────────────────
     All three are optional: an older lesson still parses and still plays. But when
     they are there, the session is a session — something real to look at, something
     real to do, and a length that cannot collapse into a five-minute chat. */
  const sceneRaw = lesson.scene ?? lesson.realScene ?? lesson.picture;
  let scene: KidLessonScene | undefined;
  if (sceneRaw && typeof sceneRaw === 'object') {
    const sceneTitle = String(sceneRaw.title ?? sceneRaw.name ?? sceneRaw.what ?? '').trim();
    if (sceneTitle) {
      scene = {
        title: sceneTitle,
        photoQuery: sceneRaw.photoQuery ?? sceneRaw.photo ?? sceneRaw.query ? String(sceneRaw.photoQuery ?? sceneRaw.photo ?? sceneRaw.query) : undefined,
        clipTitle: sceneRaw.clipTitle ?? sceneRaw.clip ? String(sceneRaw.clipTitle ?? sceneRaw.clip) : undefined,
        clipUrl: /^https?:\/\//.test(String(sceneRaw.clipUrl ?? sceneRaw.videoUrl ?? sceneRaw.url ?? '')) ? String(sceneRaw.clipUrl ?? sceneRaw.videoUrl ?? sceneRaw.url) : undefined,
        listenFor: sceneRaw.listenFor ?? sceneRaw.listen ? String(sceneRaw.listenFor ?? sceneRaw.listen) : undefined,
      };
    }
  }

  const missionRaw = lesson.mission ?? lesson.realMission ?? lesson.realWorldTask ?? lesson.task;
  let mission: KidLessonMission | undefined;
  if (missionRaw && typeof missionRaw === 'object') {
    const missionTitle = String(missionRaw.title ?? missionRaw.name ?? '').trim();
    if (missionTitle) {
      mission = {
        title: missionTitle,
        realWorld: String(missionRaw.realWorld ?? missionRaw.atHome ?? missionRaw.doIt ?? '').trim(),
        sayIt: String(missionRaw.sayIt ?? missionRaw.say ?? missionRaw.output ?? '').trim(),
        steps: asStringArray(missionRaw.steps ?? missionRaw.how),
      };
    }
  }

  /* ── The sound ladder ──────────────────────────────────────────────────
     Read from `phonics`, or from the flat shapes an AI reaches for. Nonsense words
     are the one part we never invent: if the model did not give any, the lesson runs
     without them rather than with made-up ones that accidentally mean something rude
     in another language. */
  const phonicsRaw = lesson.phonics ?? lesson.soundLadder ?? lesson.letterSounds;
  let phonics: KidLessonPhonics | undefined;
  if (phonicsRaw && typeof phonicsRaw === 'object') {
    const pairsRaw = phonicsRaw.minimalPairs ?? phonicsRaw.pairs;
    const minimalPairs: KidLessonPhonicsPair[] | undefined = Array.isArray(pairsRaw)
      ? (pairsRaw
          .map((item: any) => {
            if (!item || typeof item !== 'object') return null;
            const a = String(item.a ?? item.one ?? item.first ?? '').trim();
            const b = String(item.b ?? item.two ?? item.second ?? '').trim();
            if (!a || !b) return null;
            return { a, b, emojiA: item.emojiA ? String(item.emojiA) : undefined, emojiB: item.emojiB ? String(item.emojiB) : undefined } as KidLessonPhonicsPair;
          })
          .filter(Boolean) as KidLessonPhonicsPair[])
      : undefined;

    const ladderRaw = phonicsRaw.ladder ?? phonicsRaw.steps ?? phonicsRaw.order;
    const ladder: KidLessonPhonicsRung[] | undefined = Array.isArray(ladderRaw)
      ? (ladderRaw
          .map((item: any) => {
            if (typeof item === 'string' && item.trim()) return { step: item.trim(), what: '' } as KidLessonPhonicsRung;
            if (!item || typeof item !== 'object') return null;
            const step = String(item.step ?? item.name ?? item.rung ?? '').trim();
            if (!step) return null;
            return {
              step,
              what: String(item.what ?? item.say ?? item.text ?? '').trim(),
              talkTarget: numberOf(item.talkTarget ?? item.says),
            } as KidLessonPhonicsRung;
          })
          .filter(Boolean) as KidLessonPhonicsRung[])
      : undefined;

    /* The decodable story: an object, a bare list of lines, or one paragraph — all
       three shapes arrive from an AI, and all three are the same thing. */
    const decodableRaw = phonicsRaw.decodable ?? phonicsRaw.decodableStory ?? phonicsRaw.miniStory ?? phonicsRaw.readIt;
    let decodable: KidLessonPhonicsStory | undefined;
    if (typeof decodableRaw === 'string' && decodableRaw.trim()) {
      decodable = { lines: decodableRaw.split(/\n+/).map((l: string) => l.trim()).filter(Boolean) };
    } else if (Array.isArray(decodableRaw)) {
      const lines = asStringArray(decodableRaw);
      if (lines.length) decodable = { lines };
    } else if (decodableRaw && typeof decodableRaw === 'object') {
      const lines = asStringArray(decodableRaw.lines ?? decodableRaw.text ?? decodableRaw.pages);
      if (lines.length) {
        decodable = {
          title: decodableRaw.title ? String(decodableRaw.title) : undefined,
          lines,
          trickyWords: asStringArray(decodableRaw.trickyWords ?? decodableRaw.heartWords ?? decodableRaw.sightWords),
          retell: decodableRaw.retell ? String(decodableRaw.retell) : undefined,
          talkTarget: numberOf(decodableRaw.talkTarget),
        };
      }
    }

    const sound = String(phonicsRaw.sound ?? phonicsRaw.target ?? phonicsRaw.pattern ?? lesson.sound ?? '').trim();
    if (sound || ladder?.length) {
      phonics = {
        sound,
        inWords: asStringArray(phonicsRaw.inWords ?? phonicsRaw.words),
        minimalPairs,
        realWords: asStringArray(phonicsRaw.realWords ?? phonicsRaw.words),
        nonsenseWords: asStringArray(phonicsRaw.nonsenseWords ?? phonicsRaw.nonsense ?? phonicsRaw.pseudoWords),
        ladder,
        mouth: phonicsRaw.mouth ?? phonicsRaw.articulation ? String(phonicsRaw.mouth ?? phonicsRaw.articulation) : undefined,
        dictation: asStringArray(phonicsRaw.dictation),
        answerKey: asStringArray(phonicsRaw.answerKey ?? phonicsRaw.answers),
        decodable,
      };
    }
  }

  /* ── The command ladder ────────────────────────────────────────────────────
     TPR arrives as `movement`, or as the flat shapes an AI reaches for
     (`commands`, `actionCommands`, `tpr`). A command may be a plain string
     (“jump”) or an object with its spoken line — both are the same command, and
     the plain-string shape is kept because it is what a hurried AI returns. */
  const movementRaw = lesson.movement ?? lesson.actionCommands ?? lesson.commands ?? lesson.tpr;
  let movement: KidLessonMovement | undefined;
  if (movementRaw && typeof movementRaw === 'object') {
    const commandsRaw = movementRaw.commands ?? movementRaw.list ?? movementRaw.ladder;
    const commands: KidLessonMovementCommand[] | undefined = Array.isArray(commandsRaw)
      ? (commandsRaw
          .map((item: any) => {
            if (typeof item === 'string' && item.trim()) return { command: item.trim() } as KidLessonMovementCommand;
            if (!item || typeof item !== 'object') return null;
            const command = String(item.command ?? item.say ?? item.name ?? item.action ?? '').trim();
            if (!command) return null;
            return {
              command,
              emoji: item.emoji ?? item.picture ? String(item.emoji ?? item.picture) : undefined,
              do: item.do ?? item.line ?? item.outLoud ? String(item.do ?? item.line ?? item.outLoud) : undefined,
              twoStep: item.twoStep ?? item.chain ? String(item.twoStep ?? item.chain) : undefined,
            } as KidLessonMovementCommand;
          })
          .filter(Boolean) as KidLessonMovementCommand[])
      : undefined;

    const newCommand = movementRaw.newCommand ?? movementRaw.oneNew ?? movementRaw.newOne;
    const speedPlay = asStringArray(movementRaw.speedPlay ?? movementRaw.speeds ?? movementRaw.fastSlow);
    const bossRound = asStringArray(movementRaw.bossRound ?? movementRaw.boss ?? movementRaw.roleReversal ?? movementRaw.childCommands);
    if (commands?.length || newCommand || bossRound?.length) {
      movement = {
        commands,
        newCommand: newCommand ? String(newCommand) : undefined,
        speedPlay,
        bossRound,
      };
    }
  }

  /* ── The routine's three real moments ─────────────────────────────────────────
     Read from `routine`, or from the flat shapes an AI reaches for (`dailyRoutine`,
     `ritual`). A moment may be a bare string (“wash hands”) or an object with the
     exact English to say — both are the same thing, and the bare string is kept
     because a moment with no script is still a real moment of the day. */
  const routineRaw = lesson.routine ?? lesson.dailyRoutine ?? lesson.ritual;
  let routine: KidLessonRoutine | undefined;
  if (routineRaw && typeof routineRaw === 'object') {
    const momentsRaw = routineRaw.moments ?? routineRaw.steps ?? routineRaw.times ?? routineRaw.parts;
    const moments: KidLessonRoutineMoment[] | undefined = Array.isArray(momentsRaw)
      ? (momentsRaw
          .map((item: any) => {
            if (typeof item === 'string' && item.trim()) return { moment: item.trim(), say: '' } as KidLessonRoutineMoment;
            if (!item || typeof item !== 'object') return null;
            const moment = String(item.moment ?? item.name ?? item.when ?? item.what ?? '').trim();
            const say = String(item.say ?? item.grownUpSays ?? item.parentSays ?? item.script ?? '').trim();
            if (!moment && !say) return null;
            return {
              moment: moment || say,
              emoji: item.emoji ?? item.picture ? String(item.emoji ?? item.picture) : undefined,
              say,
              childDoes: item.childDoes ?? item.does ?? item.action ? String(item.childDoes ?? item.does ?? item.action) : undefined,
              childSays: item.childSays ?? item.says ?? item.childWord ? String(item.childSays ?? item.says ?? item.childWord) : undefined,
              photoQuery: item.photoQuery ?? item.photo ?? item.picture ? String(item.photoQuery ?? item.photo ?? item.picture) : undefined,
            } as KidLessonRoutineMoment;
          })
          .filter(Boolean) as KidLessonRoutineMoment[])
      : undefined;

    const pronRaw = routineRaw.pronunciation ?? routineRaw.sayItLike ?? routineRaw.howToSay ?? routineRaw.sounds;
    const pronunciation: KidLessonRoutinePronunciation[] | undefined = Array.isArray(pronRaw)
      ? (pronRaw
          .map((item: any) => {
            if (typeof item === 'string' && item.trim()) return { word: item.trim() } as KidLessonRoutinePronunciation;
            if (!item || typeof item !== 'object') return null;
            const word = String(item.word ?? item.english ?? item.say ?? '').trim();
            if (!word) return null;
            return { word, hint: item.hint ?? item.like ?? item.how ? String(item.hint ?? item.like ?? item.how) : undefined } as KidLessonRoutinePronunciation;
          })
          .filter(Boolean) as KidLessonRoutinePronunciation[])
      : undefined;

    const sameLine = routineRaw.sameLine ?? routineRaw.same ?? routineRaw.ritualLine ?? routineRaw.line;
    const fillIn = routineRaw.fillIn ?? routineRaw.response ?? routineRaw.childFinishes ?? routineRaw.complete;
    const name = routineRaw.name ?? routineRaw.title ?? routineRaw.routine;
    if (moments?.length || pronunciation?.length || sameLine || fillIn) {
      routine = {
        name: name ? String(name) : undefined,
        moments,
        sameLine: sameLine ? String(sameLine) : undefined,
        fillIn: fillIn ? String(fillIn) : undefined,
        pronunciation,
      };
    }
  }

  /* ── The circle: the same hello, the check-in, the wait and the ONE surprise ──
     Read from `circle`, or from the names an AI reaches for when it is thinking about
     a circle-time session (`circleTime`, `circleRitual`, `opening`). A check-in picture
     may be a bare string (“sunny”) or an object with what the child says while
     pointing; both are the same big picture, and the bare string is kept because a
     picture the child points at needs no script to work. */
  const circleRaw = lesson.circle ?? lesson.circleTime ?? lesson.circleRitual ?? lesson.opening;
  let circle: KidLessonCircle | undefined;
  if (circleRaw && typeof circleRaw === 'object') {
    const checkRaw = circleRaw.check ?? circleRaw.checkIn ?? circleRaw.pictures ?? circleRaw.faces ?? circleRaw.weather;
    const check: KidLessonCirclePicture[] | undefined = Array.isArray(checkRaw)
      ? (checkRaw
          .map((item: any) => {
            if (typeof item === 'string' && item.trim()) return { look: item.trim() } as KidLessonCirclePicture;
            if (!item || typeof item !== 'object') return null;
            const look = String(item.look ?? item.word ?? item.label ?? item.name ?? item.picture ?? '').trim();
            if (!look) return null;
            return {
              look,
              emoji: item.emoji ?? item.icon ? String(item.emoji ?? item.icon) : undefined,
              childSays: item.childSays ?? item.say ?? item.says ?? item.answer ? String(item.childSays ?? item.say ?? item.says ?? item.answer) : undefined,
            } as KidLessonCirclePicture;
          })
          .filter(Boolean) as KidLessonCirclePicture[])
      : undefined;

    const hello = asStringArray(circleRaw.hello ?? circleRaw.helloSong ?? circleRaw.greeting ?? circleRaw.start);
    const goodbye = asStringArray(circleRaw.goodbye ?? circleRaw.goodbyeSong ?? circleRaw.closing ?? circleRaw.end ?? circleRaw.farewell);
    const ask = asStringArray(circleRaw.ask ?? circleRaw.questions ?? circleRaw.checkInQuestions ?? circleRaw.askThem);
    const waitLine = circleRaw.waitLine ?? circleRaw.wait ?? circleRaw.boxLine ?? circleRaw.revealLine ?? circleRaw.beforeEvery;
    const surpriseRaw = circleRaw.surprise ?? circleRaw.surpriseWord ?? circleRaw.wordOfTheDay ?? circleRaw.newWord ?? circleRaw.today ?? circleRaw.box;
    const surprise = typeof surpriseRaw === 'string'
      ? surpriseRaw.trim()
      : surpriseRaw && typeof surpriseRaw === 'object'
        ? String(surpriseRaw.word ?? surpriseRaw.thing ?? surpriseRaw.name ?? '').trim()
        : '';
    const nextTime = circleRaw.nextTime ?? circleRaw.beforeNext ?? circleRaw.nextLesson ?? circleRaw.plan;
    const name = circleRaw.name ?? circleRaw.title ?? circleRaw.circle;
    if (hello?.length || goodbye?.length || check?.length || waitLine || surprise) {
      circle = {
        name: name ? String(name) : undefined,
        hello,
        goodbye,
        check,
        waitLine: waitLine ? String(waitLine) : undefined,
        surprise: surprise || undefined,
        ask,
        nextTime: nextTime ? String(nextTime) : undefined,
      };
    }
  }

  /* ── The printable: the tasks, and the talking turn inside each one ──────────
     Read from `sheet`, or from the names an AI reaches for when it is thinking about
     a page (`sheetTasks`, `printPage`, `taskSheet`, `page`). A task may be a bare
     string (“Colour the duck”) or an object carrying the grown-up's line and the
     child's line; both are the same task, and the bare string is kept because a task
     with no script is still a real thing to do on paper. */
  const sheetRaw = lesson.sheet ?? lesson.sheetTasks ?? lesson.printPage ?? lesson.taskSheet ?? lesson.page;
  let sheet: KidLessonSheet | undefined;
  if (sheetRaw && typeof sheetRaw === 'object') {
    const tasksRaw = sheetRaw.tasks ?? sheetRaw.items ?? sheetRaw.activities ?? sheetRaw.worksheet;
    const tasks: KidLessonSheetTask[] | undefined = Array.isArray(tasksRaw)
      ? (tasksRaw
          .map((item: any) => {
            if (typeof item === 'string' && item.trim()) return { do: item.trim() } as KidLessonSheetTask;
            if (!item || typeof item !== 'object') return null;
            const doIt = String(item.do ?? item.task ?? item.what ?? item.action ?? item.text ?? '').trim();
            if (!doIt) return null;
            const boxes = numberOf(item.boxes ?? item.lines ?? item.write ?? item.ruled);
            return {
              do: doIt,
              emoji: item.emoji ?? item.icon ? String(item.emoji ?? item.icon) : undefined,
              paper: item.paper ?? item.material ?? item.how ? String(item.paper ?? item.material ?? item.how) : undefined,
              say: item.say ?? item.grownUpSays ?? item.adultSays ?? item.script ? String(item.say ?? item.grownUpSays ?? item.adultSays ?? item.script) : undefined,
              childSays: item.childSays ?? item.child ?? item.says ?? item.answer ? String(item.childSays ?? item.child ?? item.says ?? item.answer) : undefined,
              boxes: boxes ? Math.max(1, Math.min(6, boxes)) : undefined,
            } as KidLessonSheetTask;
          })
          .filter(Boolean) as KidLessonSheetTask[])
      : undefined;

    const traceWords = asStringArray(sheetRaw.traceWords ?? sheetRaw.tracing ?? sheetRaw.trace ?? sheetRaw.handwriting);
    const answerKey = asStringArray(sheetRaw.answerKey ?? sheetRaw.key ?? sheetRaw.answers ?? sheetRaw.solutions);
    const talkFrameRaw = sheetRaw.talkFrame ?? sheetRaw.frame ?? sheetRaw.sentenceFrame ?? sheetRaw.ownSentence;
    const name = sheetRaw.name ?? sheetRaw.title ?? sheetRaw.sheet;
    if (tasks?.length || traceWords?.length || answerKey?.length || talkFrameRaw) {
      sheet = {
        name: name ? String(name) : undefined,
        tasks,
        traceWords,
        talkFrame: talkFrameRaw ? String(talkFrameRaw) : undefined,
        answerKey,
      };
    }
  }

  /* ── The quest board: a week of jobs, each with its XP and its line ──────────
     Read from `quest`, or from the names an AI reaches for when it is thinking about
     homework (`homeQuest`, `questBoard`, `jobs`). A job may be a bare string (a job
     with no script is still a real job) or an object carrying the grown-up's line,
     the child's line, the XP and the proof. `master` is the 5-12 job of running the
     board — reading the jobs, choosing the order and awarding the XP. */
  const questRaw = lesson.quest ?? lesson.homeQuest ?? lesson.questBoard ?? lesson.jobs;
  let quest: KidLessonQuest | undefined;
  if (questRaw && typeof questRaw === 'object') {
    const jobsRaw = questRaw.jobs ?? questRaw.items ?? questRaw.tasks ?? questRaw.missions;
    const jobs: KidLessonQuestJob[] | undefined = Array.isArray(jobsRaw)
      ? (jobsRaw
          .map((item: any) => {
            if (typeof item === 'string' && item.trim()) return { do: item.trim() } as KidLessonQuestJob;
            if (!item || typeof item !== 'object') return null;
            const doIt = String(item.do ?? item.task ?? item.what ?? item.action ?? item.text ?? item.job ?? '').trim();
            if (!doIt) return null;
            const xp = numberOf(item.xp ?? item.points ?? item.stars ?? item.score);
            return {
              do: doIt,
              emoji: item.emoji ?? item.icon ? String(item.emoji ?? item.icon) : undefined,
              say: item.say ?? item.grownUpSays ?? item.adultSays ?? item.parentSays ?? item.script ? String(item.say ?? item.grownUpSays ?? item.adultSays ?? item.parentSays ?? item.script) : undefined,
              childSays: item.childSays ?? item.child ?? item.says ?? item.answer ? String(item.childSays ?? item.child ?? item.says ?? item.answer) : undefined,
              xp: xp ? Math.max(1, Math.round(xp)) : undefined,
              proof: item.proof ?? item.evidence ?? item.howWeKnow ?? item.how ? String(item.proof ?? item.evidence ?? item.howWeKnow ?? item.how) : undefined,
              night: item.night ?? item.day ?? item.when ? String(item.night ?? item.day ?? item.when) : undefined,
            } as KidLessonQuestJob;
          })
          .filter(Boolean) as KidLessonQuestJob[])
      : undefined;

    const questName = questRaw.name ?? questRaw.title ?? questRaw.board;
    const partner = questRaw.partner ?? questRaw.with ?? questRaw.whoWith ?? questRaw.grownUp;
    const tally = questRaw.tally ?? questRaw.tracker ?? questRaw.nights ?? questRaw.stars;
    const reward = questRaw.reward ?? questRaw.prize ?? questRaw.wins;
    const master = questRaw.master ?? questRaw.questMaster ?? questRaw.runIt ?? questRaw.leader;
    if (jobs?.length || questName || tally || reward || master) {
      quest = {
        name: questName ? String(questName) : undefined,
        partner: partner ? String(partner) : undefined,
        jobs,
        tally: tally ? String(tally) : undefined,
        reward: reward ? String(reward) : undefined,
        master: master ? String(master) : undefined,
      };
    }
  }

  /* ── The deck: the cards, the passes and the real-week spaced schedule ─────
     Read from `deck`, or from the names an AI reaches for when it is thinking about
     a flashcard deck (`flashcardDeck`, `cardDeck`, `cardSession`). The cards carry
     their OWN lines, because a card with no talking turn teaches pointing. */
  const deckRaw = lesson.deck ?? lesson.flashcardDeck ?? lesson.cardDeck ?? lesson.cardSession;
  let deck: KidLessonDeck | undefined;
  if (deckRaw && typeof deckRaw === 'object') {
    const cardsRaw: any[] = Array.isArray(deckRaw.cards) ? deckRaw.cards : (Array.isArray(deckRaw.deck) ? deckRaw.deck : []);
    const cards: KidLessonCard[] = [];
    for (const raw of cardsRaw) {
      if (!raw) continue;
      if (typeof raw === 'string') { cards.push({ word: raw }); continue; }
      const word = raw.word ?? raw.term ?? raw.front ?? raw.answer ?? raw.text;
      if (!word) continue;
      const emoji = raw.emoji ?? raw.picture ?? raw.icon;
      const say = raw.say ?? raw.grownUpSays ?? raw.adultSays ?? raw.tutorSays ?? raw.prompt;
      const childSays = raw.childSays ?? raw.child ?? raw.says ?? raw.talkingTurn;
      const action = raw.do ?? raw.action ?? raw.back ?? raw.move;
      const cue = raw.cue ?? raw.pictureCue ?? raw.cuePicture ?? raw.hint;
      const sentence = raw.sentence ?? raw.example ?? raw.exampleSentence;
      cards.push({
        word: String(word),
        emoji: emoji ? String(emoji) : undefined,
        say: say ? String(say) : undefined,
        childSays: childSays ? String(childSays) : undefined,
        do: action ? String(action) : undefined,
        cue: cue ? String(cue) : undefined,
        sentence: sentence ? String(sentence) : undefined,
        review: asStringArray(raw.review ?? raw.mixes ?? raw.pairWith),
      });
    }
    const name = deckRaw.name ?? deckRaw.title ?? deckRaw.pack;
    const passes = asStringArray(deckRaw.passes ?? deckRaw.passNames ?? deckRaw.deal ?? deckRaw.quizRounds);
    const scoreLine = deckRaw.scoreLine ?? deckRaw.score ?? deckRaw.finishLine;
    const master = deckRaw.master ?? deckRaw.childRuns ?? deckRaw.childDeck ?? deckRaw.lastPass;
    const spacing = asStringArray(deckRaw.spacing ?? deckRaw.schedule ?? deckRaw.realWeek ?? deckRaw.week);
    if (cards.length || name || passes?.length || scoreLine || master || spacing?.length) {
      deck = {
        name: name ? String(name) : undefined,
        cards: cards.length ? cards : undefined,
        passes,
        scoreLine: scoreLine ? String(scoreLine) : undefined,
        master: master ? String(master) : undefined,
        spacing,
      };
    }
  }

  /* ── The quiz night: the rounds, the score line and the child's final round ──
     Read from `quiz`, or from the names an AI reaches for when it is thinking about a
     quiz night (`quizNight`, `quizShow`, `rounds`). It is NOT the questions — those
     stay in `game.items`, because that is what the quiz player reads. */
  const quizRaw = lesson.quizNight ?? lesson.quizShow ?? lesson.rounds;
  let quiz: KidLessonQuiz | undefined;
  if (quizRaw && typeof quizRaw === 'object') {
    const rounds = asStringArray(quizRaw.rounds ?? quizRaw.quizRounds ?? quizRaw.stages ?? quizRaw.parts);
    const name = quizRaw.name ?? quizRaw.title ?? quizRaw.show;
    const scoreLine = quizRaw.scoreLine ?? quizRaw.score ?? quizRaw.tally ?? quizRaw.winLine;
    const master = quizRaw.master ?? quizRaw.quizMaster ?? quizRaw.childRound ?? quizRaw.lastRound;
    if (rounds?.length || name || scoreLine || master) {
      quiz = {
        name: name ? String(name) : undefined,
        rounds,
        scoreLine: scoreLine ? String(scoreLine) : undefined,
        master: master ? String(master) : undefined,
      };
    }
  }
  /* An AI may also put the night under the plain `quiz` key — but only when that
     object is clearly NOT the questions (a quiz with no items). */
  if (!quiz && lesson.quiz && typeof lesson.quiz === 'object' && !(lesson.quiz as any).items && !(lesson.quiz as any).questions) {
    const rounds = asStringArray((lesson.quiz as any).rounds ?? (lesson.quiz as any).stages);
    const name = (lesson.quiz as any).name ?? (lesson.quiz as any).title;
    const scoreLine = (lesson.quiz as any).scoreLine ?? (lesson.quiz as any).score;
    const master = (lesson.quiz as any).master ?? (lesson.quiz as any).quizMaster;
    if (rounds?.length || name || scoreLine || master) {
      quiz = {
        name: name ? String(name) : undefined,
        rounds,
        scoreLine: scoreLine ? String(scoreLine) : undefined,
        master: master ? String(master) : undefined,
      };
    }
  }

  /* ── The story the child walks through ──────────────────────────────────────
     Read from `storyWalk`, or from the names an AI reaches for when it is thinking
     about TPR: `actionStory`, `walkThrough`, `tprStory`. A beat may be a bare string
     (which then becomes both the line and the action) or an object; the object is the
     shape that matters, because a beat with no action is a reading page. */
  const storyWalkRaw = lesson.storyWalk ?? lesson.actionStory ?? lesson.walkThrough ?? lesson.tprStory;
  let storyWalk: KidLessonStoryWalk | undefined;
  if (storyWalkRaw && typeof storyWalkRaw === 'object') {
    const beatsRaw = storyWalkRaw.beats ?? storyWalkRaw.moments ?? storyWalkRaw.lines ?? storyWalkRaw.sentences;
    const beats: KidLessonStoryWalkBeat[] | undefined = Array.isArray(beatsRaw)
      ? (beatsRaw
          .map((item: any) => {
            if (typeof item === 'string' && item.trim()) {
              const line = item.trim();
              return { line, action: line } as KidLessonStoryWalkBeat;
            }
            if (!item || typeof item !== 'object') return null;
            const line = String(item.line ?? item.text ?? item.sentence ?? item.told ?? '').trim();
            const action = String(item.action ?? item.do ?? item.move ?? item.body ?? '').trim();
            if (!line && !action) return null;
            return {
              line: line || action,
              action: action || line,
              say: item.say ?? item.chunk ?? item.childSays ?? item.repeat
                ? String(item.say ?? item.chunk ?? item.childSays ?? item.repeat)
                : undefined,
              emoji: item.emoji ?? item.picture ? String(item.emoji ?? item.picture) : undefined,
            } as KidLessonStoryWalkBeat;
          })
          .filter(Boolean) as KidLessonStoryWalkBeat[])
      : undefined;

    const mapRaw = storyWalkRaw.map ?? storyWalkRaw.storyMap ?? storyWalkRaw.pictures ?? storyWalkRaw.order;
    const map: string[] | undefined = Array.isArray(mapRaw)
      ? (mapRaw.map((item: any) => (typeof item === 'string' ? item.trim() : String(item?.emoji ?? item?.picture ?? '').trim())).filter(Boolean) as string[])
      : undefined;

    const chainRaw = storyWalkRaw.chain ?? storyWalkRaw.twoStep ?? storyWalkRaw.commandChain ?? storyWalkRaw.commands;
    const chain: string[] | undefined = Array.isArray(chainRaw)
      ? (chainRaw.map((item: any) => (typeof item === 'string' ? item.trim() : String(item?.command ?? item?.twoStep ?? '').trim())).filter(Boolean) as string[])
      : undefined;

    const echo = storyWalkRaw.echo ?? storyWalkRaw.sameLine ?? storyWalkRaw.repeatedLine ?? storyWalkRaw.joinInLine ?? storyWalkRaw.chant;
    const choose = storyWalkRaw.choose ?? storyWalkRaw.choice ?? storyWalkRaw.yourTurn ?? storyWalkRaw.decide;
    const name = storyWalkRaw.title ?? storyWalkRaw.name ?? storyWalkRaw.storyName;
    if (beats?.length || map?.length || chain?.length || echo || choose) {
      storyWalk = {
        title: name ? String(name) : undefined,
        beats,
        echo: echo ? String(echo) : undefined,
        map,
        choose: choose ? String(choose) : undefined,
        chain,
      };
    }
  }

  /* ── The story ─────────────────────────────────────────────────────────────
     Read from `story`, or from the flatter shapes an AI reaches for: the pages may
     arrive as `storyPages`, the ladder as `retell`/`retells`, the map as
     `storyMap`. A story with pages but no ladder still plays (the deck reads the
     pages); a story with neither is not a story and is dropped. */
  const storyRaw = lesson.story ?? lesson.storyBook ?? lesson.tale;
  let story: KidLessonStory | undefined;
  if (storyRaw && typeof storyRaw === 'object') {
    const pagesRaw = storyRaw.pages ?? storyRaw.storyPages ?? lesson.storyPages ?? lesson.pages;
    const pages: KidLessonStoryPage[] = Array.isArray(pagesRaw)
      ? (pagesRaw
          .map((item: any) => {
            if (typeof item === 'string' && item.trim()) return { text: item.trim() } as KidLessonStoryPage;
            if (!item || typeof item !== 'object') return null;
            const text = String(item.text ?? item.sentence ?? item.line ?? item.page ?? '').trim();
            if (!text) return null;
            return {
              text,
              emoji: item.emoji ?? item.picture ? String(item.emoji ?? item.picture) : undefined,
              speaker: item.speaker ?? item.who ?? item.character ? String(item.speaker ?? item.who ?? item.character) : undefined,
            } as KidLessonStoryPage;
          })
          .filter(Boolean) as KidLessonStoryPage[])
      : [];

    const mapRaw = storyRaw.map ?? storyRaw.storyMap ?? lesson.storyMap;
    const map: KidLessonStoryMap | undefined =
      mapRaw && typeof mapRaw === 'object'
        ? ({
            character: mapRaw.character ?? mapRaw.who ? String(mapRaw.character ?? mapRaw.who) : undefined,
            setting: mapRaw.setting ?? mapRaw.where ? String(mapRaw.setting ?? mapRaw.where) : undefined,
            problem: mapRaw.problem ?? mapRaw.wants ? String(mapRaw.problem ?? mapRaw.wants) : undefined,
            feeling: mapRaw.feeling ?? mapRaw.how ? String(mapRaw.feeling ?? mapRaw.how) : undefined,
            ending: mapRaw.ending ?? mapRaw.howItEnds ?? mapRaw.resolution ? String(mapRaw.ending ?? mapRaw.howItEnds ?? mapRaw.resolution) : undefined,
          } as KidLessonStoryMap)
        : undefined;

    const rungsRaw = storyRaw.rungs ?? storyRaw.retell ?? storyRaw.retells ?? lesson.retell;
    const rungs: KidLessonRetellRung[] | undefined = Array.isArray(rungsRaw)
      ? (rungsRaw
          .map((item: any) => {
            if (typeof item === 'string' && item.trim()) return { with: 'pictures', prompt: item.trim() } as KidLessonRetellRung;
            if (!item || typeof item !== 'object') return null;
            const prompt = String(item.prompt ?? item.say ?? item.text ?? '').trim();
            const withHelp = String(item.with ?? item.help ?? item.support ?? 'pictures').trim();
            if (!prompt && !withHelp) return null;
            return { with: withHelp || 'pictures', prompt, talkTarget: numberOf(item.talkTarget ?? item.sentences) } as KidLessonRetellRung;
          })
          .filter(Boolean) as KidLessonRetellRung[])
      : undefined;

    const roleRaw = storyRaw.roleplay ?? storyRaw.hotSeat ?? storyRaw.rolePlay ?? lesson.hotSeat;
    const roleplay: KidLessonStory['roleplay'] =
      roleRaw && typeof roleRaw === 'object' && (roleRaw.character || roleRaw.questions)
        ? {
            character: String(roleRaw.character ?? roleRaw.who ?? 'the character').trim(),
            emoji: roleRaw.emoji ? String(roleRaw.emoji) : undefined,
            questions: asStringArray(roleRaw.questions ?? roleRaw.ask ?? roleRaw.interview) ?? [],
            lines: asStringArray(roleRaw.lines ?? roleRaw.script),
          }
        : undefined;

    const bookRaw = storyRaw.pairedBook ?? storyRaw.book ?? lesson.pairedBook;
    const pairedBook =
      bookRaw && typeof bookRaw === 'object' && /^https?:\/\//.test(String(bookRaw.url ?? bookRaw.link ?? ''))
        ? {
            title: String(bookRaw.title ?? bookRaw.name ?? 'A real read-aloud').trim(),
            url: String(bookRaw.url ?? bookRaw.link),
            source: bookRaw.source ? String(bookRaw.source) : undefined,
            why: bookRaw.why ? String(bookRaw.why) : undefined,
          }
        : undefined;

    if (pages.length || map || rungs?.length || roleplay || pairedBook) {
      story = { pages, map, rungs, roleplay, pairedBook };
    }
  }

  const runRaw = lesson.run ?? lesson.session ?? lesson.clock;
  let run: KidLessonRun | undefined;
  if (runRaw && typeof runRaw === 'object') {
    run = {
      targetMinutes: numberOf(runRaw.targetMinutes ?? runRaw.totalMinutes ?? runRaw.minutes) ?? (typeof lesson.durationMinutes === 'number' ? lesson.durationMinutes : undefined),
      brainBreaks: asStringArray(runRaw.brainBreaks ?? runRaw.breaks ?? runRaw.movementBreaks),
      exitTicket: asStringArray(runRaw.exitTicket ?? runRaw.exitTickets ?? runRaw.proof),
      nextTime: runRaw.nextTime ?? runRaw.nextSession ?? runRaw.next ? String(runRaw.nextTime ?? runRaw.nextSession ?? runRaw.next) : undefined,
    };
    if (!run.targetMinutes && !run.brainBreaks?.length && !run.exitTicket?.length && !run.nextTime) run = undefined;
  }

  const known: (keyof KidLesson)[] = [
    'title', 'kind', 'band', 'ageRange', 'durationMinutes', 'objectives', 'materials', 'words',
    'steps', 'game', 'lyrics', 'chantRhythm', 'worksheet', 'homework', 'caregiverNote', 'teacherNote', 'media',
    'scene', 'mission', 'run', 'talkGoal', 'story', 'phonics', 'movement', 'routine', 'circle', 'sheet', 'quest', 'quiz', 'deck',
  ];
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(lesson)) {
    if (!known.includes(key as keyof KidLesson) && value !== undefined && value !== null && String(value).trim?.() !== '') extra[key] = value;
  }

  const parsed: KidLesson = {
    title,
    kind: lesson.kind ?? kind?.id,
    band: lesson.band,
    ageRange: lesson.ageRange ?? lesson.ages,
    durationMinutes: typeof lesson.durationMinutes === 'number' ? lesson.durationMinutes : typeof lesson.duration === 'number' ? lesson.duration : undefined,
    objectives: asStringArray(lesson.objectives ?? lesson.goals ?? lesson.learningObjectives),
    materials: asStringArray(lesson.materials ?? lesson.youWillNeed),
    words,
    steps,
    game,
    lyrics,
    chantRhythm: lesson.chantRhythm ?? lesson.rhythm ? String(lesson.chantRhythm ?? lesson.rhythm) : undefined,
    worksheet: asStringArray(lesson.worksheet ?? lesson.worksheetItems ?? lesson.printable),
    homework: asStringArray(lesson.homework ?? lesson.homeTasks ?? lesson.tasks),
    caregiverNote: lesson.caregiverNote ?? lesson.parentNote ? String(lesson.caregiverNote ?? lesson.parentNote) : undefined,
    teacherNote: lesson.teacherNote ?? lesson.notes ?? lesson.tutorNote ? String(lesson.teacherNote ?? lesson.notes ?? lesson.tutorNote) : undefined,
    media,
    scene,
    mission,
    run,
    story,
    phonics,
    movement,
    routine,
    circle,
    sheet,
    quest,
    quiz,
    deck,
    storyWalk,
    talkGoal: numberOf(lesson.talkGoal ?? lesson.speakGoal ?? lesson.totalTalkTarget ?? lesson.sentencesGoal),
    extra: Object.keys(extra).length ? extra : undefined,
  };

  const present: KidLessonPiece[] = [];
  if (parsed.steps?.length) present.push('steps');
  if (parsed.game) present.push('game');
  if (parsed.lyrics?.length) present.push('lyrics');
  if (parsed.words?.length) present.push('words');
  if (parsed.worksheet?.length) present.push('worksheet');
  if (parsed.homework?.length) present.push('homework');
  if (parsed.caregiverNote) present.push('caregiverNote');
  if (parsed.media?.length) present.push('media');
  if (parsed.scene) present.push('scene');
  if (parsed.mission) present.push('mission');
  if (parsed.run) present.push('run');
  if (parsed.story?.pages?.length || parsed.story?.roleplay) present.push('story');
  if (parsed.phonics) present.push('phonics');
  if (parsed.movement) present.push('movement');
  if (parsed.routine) present.push('routine');
  if (parsed.circle) present.push('circle');
  if (parsed.sheet) present.push('sheet');
  if (parsed.quest) present.push('quest');
  if (parsed.quiz) present.push('quiz');
  if (parsed.deck?.cards?.length || parsed.deck?.name) present.push('deck');
  if (parsed.storyWalk) present.push('storyWalk');

  if (!present.length) {
    return {
      ok: false,
      error:
        'There is a title but nothing a child can do yet — the reply needs at least one of: steps, a game, words, lyrics, a worksheet or homework. Ask the AI to return the whole lesson, not a summary of it.',
    };
  }

  const missing = (kind?.required ?? []).filter((piece) => !present.includes(piece));
  const bits: string[] = [];
  if (parsed.words?.length) bits.push(`${parsed.words.length} word${parsed.words.length === 1 ? '' : 's'}`);
  if (parsed.steps?.length) bits.push(`${parsed.steps.length} step${parsed.steps.length === 1 ? '' : 's'}`);
  if (parsed.game?.items?.length) bits.push(`${parsed.game.items.length} game item${parsed.game.items.length === 1 ? '' : 's'}`);
  else if (parsed.game) bits.push('1 game');
  if (parsed.lyrics?.length) bits.push(`${parsed.lyrics.length} lyric lines`);
  if (parsed.worksheet?.length) bits.push('a worksheet');
  if (parsed.homework?.length) bits.push('homework');
  if (parsed.media?.length) bits.push(`${parsed.media.length} media link${parsed.media.length === 1 ? '' : 's'}`);

  /* The two things the tutor most needs to see confirmed before class: how long the
     session actually is, and how much the child is expected to talk. */
  const sessionMinutes = parsed.run?.targetMinutes
    || (parsed.steps?.reduce((sum, s) => sum + (typeof s.minutes === 'number' ? s.minutes : 0), 0) || 0);
  if (sessionMinutes) bits.push(`${sessionMinutes} min`);
  const talkTargets = (parsed.steps || []).reduce((sum, s) => sum + (s.talkTarget || 0), 0);
  if (talkTargets || parsed.talkGoal) bits.push(`${parsed.talkGoal || talkTargets} things said out loud`);
  if (parsed.mission) bits.push('a real-world mission');
  if (parsed.scene) bits.push('a real picture & clip');
  if (parsed.story?.pages?.length) bits.push(`a ${parsed.story.pages.length}-page story`);
  if (parsed.story?.rungs?.length) bits.push(`${parsed.story.rungs.length} retells`);
  if (parsed.phonics?.sound) bits.push(`the ${parsed.phonics.sound} sound`);
  if (parsed.phonics?.ladder?.length) bits.push(`${parsed.phonics.ladder.length} sound-ladder rungs`);
  if (parsed.phonics?.nonsenseWords?.length) bits.push(`${parsed.phonics.nonsenseWords.length} nonsense words`);
  if (parsed.phonics?.dictation?.length) bits.push('a dictation with its answers');
  if (parsed.phonics?.decodable?.lines?.length) bits.push('a decodable story to read aloud');
  if (parsed.movement?.commands?.length) bits.push(`${parsed.movement.commands.length} commands to move to`);
  if (parsed.movement?.bossRound?.length) bits.push('a boss round where the child gives the orders');
  if (parsed.routine?.moments?.length) bits.push(`${parsed.routine.moments.length} real moments of the day`);
  if (parsed.routine?.pronunciation?.length) bits.push('a say-it-like-this script for the family');
  if (parsed.circle?.hello?.length) bits.push('the same hello, word for word, every week');
  if (parsed.circle?.check?.length) bits.push(`${parsed.circle.check.length} big check-in pictures`);
  if (parsed.circle?.surprise) bits.push(`one surprise word (“${parsed.circle.surprise}”)`);
  if (parsed.sheet?.tasks?.length) bits.push(`${parsed.sheet.tasks.length} tasks with a talking turn each`);
  if (parsed.sheet?.traceWords?.length) bits.push(`${parsed.sheet.traceWords.length} words to trace`);
  if (parsed.sheet?.answerKey?.length) bits.push('a self-check answer key');
  if (parsed.quest?.jobs?.length) bits.push(`${parsed.quest.jobs.length} jobs with XP and a talking turn each`);
  if (parsed.quest?.tally) bits.push('a nightly tally the child marks');
  if (parsed.quest?.master) bits.push('a job for the child running the board');
  if (parsed.quiz?.rounds?.length) bits.push(`${parsed.quiz.rounds.length} named rounds`);
  if (parsed.quiz?.scoreLine) bits.push('a score line the class says out loud');
  if (parsed.quiz?.master) bits.push('a final round the child runs');
  if (parsed.deck?.name) bits.push(`a deck called “${parsed.deck.name}”`);
  if (parsed.deck?.cards?.length) bits.push(`${parsed.deck.cards.length} cards with a talking turn each`);
  if (parsed.deck?.cards?.some((c) => c.do)) bits.push('an action on the back of the cards');
  if (parsed.deck?.cards?.some((c) => c.review?.length)) bits.push('review cards that mix two earlier words');
  if (parsed.deck?.spacing?.length) bits.push('a spaced schedule for the week');
  if (parsed.deck?.master) bits.push('a pass the child runs themselves');
  const spokenItems = (parsed.game?.items || []).filter((it) => it.childSays).length;
  if (spokenItems) bits.push(`${spokenItems} question${spokenItems === 1 ? '' : 's'} with a sentence to answer in`);
  if (parsed.storyWalk?.beats?.length) bits.push(`${parsed.storyWalk.beats.length} beats the child acts out`);
  if (parsed.storyWalk?.echo) bits.push('a line the child joins in on every beat');
  if (parsed.storyWalk?.choose) bits.push('a beat the child decides');

  return {
    ok: true,
    lesson: parsed,
    summary: bits.join(' · ') || 'a lesson',
    missing: missing.length ? missing : undefined,
  };
}

/** What a stored lesson looks like on the learner. */
export interface SavedKidLesson {
  id: string;
  kindId: string;
  kindLabel: string;
  kindEmoji: string;
  band: KidAgeBand;
  topic: string;
  createdAt: string;
  summary?: string;
  /** The Step-2 dials this lesson was built with, so replaying it uses the same voice. */
  customization?: KidLessonCustomization;
  lesson: KidLesson;
}

export const KID_LESSON_STORAGE_NOTE =
  'Saved lessons live on the learner profile itself, so they travel with the learner in every backup and export.';
