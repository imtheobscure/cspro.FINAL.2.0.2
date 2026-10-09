/* ════════════════════════════════════════════════════════════════════════════
   🎮 KID GAME CATALOGUE — what to play, at which age, and why
   ════════════════════════════════════════════════════════════════════════════

   The Lesson Creator builds *lessons*; this builds *games* a tutor shares on a screen.
   A game here is three things bolted together:

     1. **A play engine.** There are already 30 of them in
        `components/flipbook/ActivityComponents.tsx` (`ActivityRenderer`): memory pairs,
        spelling tiles, sorting buckets, karaoke, spin-the-wheel, word search, a wheel of
        turns. Rebuilding those would be waste; a game is a *script* those engines play.
     2. **A band.** The same engine is a different game for a 3-year-old than for a
        10-year-old, so every entry names its band and the prompt writes for that band.
     3. **A reason.** `why` says what this does for a child of that age, in developmental
        terms. It is shown to the tutor when they pick, because a tutor choosing between
        two dozen tiles deserves to know why one of them is better for a four-year-old,
        and it is copied into the prompt so the AI writes for the same reason.

   The band split follows one line: **pre-literacy**. Under five a child cannot read the
   instructions, cannot write an answer, and cannot hold a rule in working memory while
   also losing a game — so nothing on the Very Young shelf contains a printed word for the
   child to read, a timer, or a score. From five up, reading arrives and competition
   becomes motivating if it is fair, so the Young shelf is quiz shows, word building,
   memory, sorting, stories, syllabification, timed recognition and flash decks with points.

   Two shelves: nine games for 2-5, thirteen for 5-12. Only two engines are allowed on both (a quiz and a
   sorting board) — because a 3-year-old and a 9-year-old pointed at the same activity would
   be doing it for completely different reasons, and those two engines can be made to serve
   each reason honestly (two pictures and no score for one, four options and spaced
   retrieval for the other).

   The contracts in `shape` are not invented: they are the exact fields each engine reads
   (`activity.options`, `activity.pairs`, `activity.categories`, `activity.correctOrder`,
   `activity.storyChoices`, …). If the AI is asked for anything else, the paste box
   rejects it here rather than showing a tutor an empty panel.
   ════════════════════════════════════════════════════════════════════════════ */

import type { ActivityType, LessonActivity } from './flipbookTypes';
import type { KidAgeBand } from './lessonCreatorTypes';

/**
 * Does this game's engine benefit from real photography?
 *
 * The distinction is not cosmetic, it decides whether a game's images are *needed*
 * for the task or merely decorative:
 *
 *  · An engine where the child must **identify the thing** — Listen & Point,
 *    Pop It, Where Is It, Listening Bingo — is only doing its job if the child
 *    recognises a real duck. A glyph is a symbol for the concept, and at 2-5 the
 *    child is still *building* the concept, so the referent has to be real.
 *  · An engine where the child is working with **written words** — Big Quiz Show,
 *    Build the Word, Word Hunt — gains nothing from a photograph. The task is
 *    orthography, and a photo beside it is decoration the projector has to render.
 *
 * `media` is what the prompt and the picker use to tell a tutor which of the two
 * they are choosing, so the choice is made on pedagogical grounds rather than on
 * how the game looks.
 */
export type KidGameMedia = 'essential' | 'decorative';

const mediaFor = (engine: ActivityType): KidGameMedia =>
  (
    [
      'listenChoose', 'speakRepeat', 'balloonPop', 'bingoListener',
      'rhymeMatch', 'memoryMatch', 'dragDropSort', 'oddOneOut', 'flashcardTrainer',
    ] as ActivityType[]
  ).includes(engine)
    ? 'essential'
    : 'decorative';

/** One game a tutor can build: script + engine + the reason it suits this age. */
export interface KidGame {
  id: string;
  label: string;
  emoji: string;
  band: KidAgeBand;
  ages: string;
  /** The player that runs it — one of the 30 in ActivityComponents. */
  engine: ActivityType;
  /**
   * Whether this engine needs a real photograph to do its job.
   *
   * Optional on the literal because `KID_GAMES` derives it from the engine — see
   * the `mediaFor` call below. Game authors set it only to *override* that.
   */
  media?: KidGameMedia;
  /** What the child physically does, in one line. */
  interaction: string;
  /** The developmental case for this game at this age (shown to the tutor, sent to the AI). */
  why: string;
  /** How many rounds to build, and how big each round may be. */
  rounds: string;
  /** The exact JSON the AI must return for one round of this engine. */
  shape: string;
  /** How to run it with no screen at all — the room always has a paper fallback. */
  noScreen: string;
  /** Rounds that fit in one sitting on a projector. */
  minutes: number;
  /** Extra band-specific rules the prompt must state for this game. */
  bandRules: string;
}

/** The script: a title, the rules for the tutor, and the rounds the engine plays. */
export interface KidGameScript {
  title: string;
  gameId: string;
  band: KidAgeBand;
  topic?: string;
  /** Tutor-facing: how to run it, in their words. */
  howToPlay?: string;
  /** What to say at the end, win or lose. */
  plenary?: string[];
  rounds: LessonActivity[];
}

/* ────────────────────────────────────────────────────────────────────────────
   VERY YOUNG SHELF (2-5) — pointing, singing, moving, pretending
   ──────────────────────────────────────────────────────────────────────────── */

const VERY_YOUNG_GAMES: KidGame[] = [
  {
    id: 'lookListenPoint',
    label: 'Listen & Point',
    emoji: '👂',
    band: 'veryYoung',
    ages: '2-4',
    engine: 'listenChoose',
    /* Photography is LOAD-BEARING here, not decoration. The task is: hear a word,
       recognise the referent, point at it. The child is at the developmental stage
       where the concept itself is still being built, so the picture on screen has to
       BE a duck — a glyph is a symbol standing in for a duck, and pointing at a
       symbol teaches "pick the duck-shaped thing", not "that is a duck".

       This is the clearest case for why the two bands get different treatment: the
       identical game aimed at a 9-year-old would be pointless, because they already
       have the concept and need the *spelling* instead. */
    media: 'essential',
    interaction: 'Hear the word, then point at the picture.',
    why:
      'At 2-4 a child understands far more than they can say: comprehension is years ahead of production. Pointing lets them show that understanding without needing a word, which keeps the win inside what they can actually do. Hearing the word first also trains auditory discrimination — the listening skill that reading will later lean on. Because the concept is still being built, the three pictures are real photographs: the child must recognise a real cow, not pick the cow-shaped glyph between three unrelated drawings.',
    rounds: '3-4 rounds, exactly 3 real picture options each, one clearly correct.',
    shape: `{ "type": "listenChoose", "prompt": "👂 Who says quack?", "readAloudText": "duck", "options": ["🦆 duck", "🐮 cow", "🐈 cat"], "correct": "🦆 duck", "points": 0, "feedbackCorrect": "Yes! The duck says quack! 🎉", "feedbackIncorrect": "Nearly! Listen again — quack quack 🦆" }`,
    noScreen: 'Hold up two toys and say the word — the child points at the real one.',
    minutes: 4,
    bandRules:
      'The child never reads: every option is an emoji plus ONE common concrete noun (the app photographs each noun for you). Options must be visibly different — different animal, different colour. `points` must be 0 — a 2-year-old is not scored. Never write an abstract option: "a happy feeling" cannot be photographed and the child cannot read it either.',
  },
  {
    /* ── A game that could not exist before this feature ────────────────────
       Every other game on this shelf could be built from emoji alone. This one
       cannot: it asks the child to match a word to a *real* photograph of the
       thing, and there is no emoji-based version of the task. A glyph cannot be
       ambiguous between a duck and a goose in the way a photograph can — which is
       exactly the discrimination the child is being asked to make. */
    id: 'photoMatch',
    label: 'Real Photo Match',
    emoji: '📷',
    band: 'veryYoung',
    ages: '3-5',
    engine: 'matchingPairs',
    media: 'essential',
    interaction: 'Match each word to the photograph of the real thing.',
    why:
      'This is a whole-word-matching task with two dials the child cannot yet read, which is why it works at 3-5 at all. The left side is the spoken word; the right side is a photograph, so the only route to a correct answer is understanding the word. Because real photographs differ from each other in ways a set of tidy glyphs never do — a llama is not a llama-coloured emoji, a strawberry is recognisably red and seeded — the child is doing genuine discrimination rather than matching two symbols that were drawn from the same pack.',
    rounds: '1 board of 3 pairs. Every pair is word ↔ a real photograph of exactly that thing.',
    shape: `{ "type": "matchingPairs", "prompt": "📷 Tap the word, then tap its photograph", "pairs": [ { "left": "🦆 duck", "right": "a duck swimming" }, { "left": "🍓 strawberry", "right": "a red strawberry" }, { "left": "🐘 elephant", "right": "an elephant" } ], "points": 0, "feedbackCorrect": "You matched them all! 🎉", "feedbackIncorrect": "Nearly! Have another look 💛" }`,
    noScreen: 'Three real objects and three word cards. The child puts each object by its word.',
    minutes: 5,
    bandRules:
      'EXACTLY 3 pairs — this is a working-memory task, not a matching marathon. The "right" side must be one common concrete noun so the app can find a real photograph of it (write "a duck swimming", not "the waterfowl"). No two nouns may be so similar that even a photograph is ambiguous (no duck/goose, no cat/kitten). Points are 0. The child may match by pointing; they never have to read.',
  },
  {
    id: 'pointAndSay',
    label: 'Point & Say',
    emoji: '👉',
    band: 'veryYoung',
    ages: '2-5',
    engine: 'speakRepeat',
    interaction: 'Look at the big picture, hear the word, copy it.',
    why:
      'Labeling is the single highest-value language act at this age, and it only pays off when the adult models the word first and the child echoes it. One word per round — not two — because a 2-year-old holds one new sound pattern at a time, and success is repeating the same word, not a new one.',
    rounds: '3-4 rounds, ONE word each, plus one animal sound or action in brackets.',
    shape: `{ "type": "speakRepeat", "prompt": "🦆 Say it with me!", "readAloudText": "duck", "characterEmoji": "🦆", "points": 0, "feedbackCorrect": "You said duck! 🎉", "feedbackIncorrect": "Let's try it again — duck!" }`,
    noScreen: 'Point at the toy and say the word three times, then let the child point.',
    minutes: 4,
    bandRules:
      'One word per round, maximum two syllables. `readAloudText` is exactly the word (the player speaks it). Never ask for a sentence. The microphone is optional: the tutor repeats the word with the child, and pressing the button is enough.',
  },
  {
    id: 'singAndDo',
    label: 'Sing & Do',
    emoji: '🎵',
    band: 'veryYoung',
    ages: '2-5',
    engine: 'songKaraoke',
    interaction: 'Sing each line and do the action that goes with it.',
    why:
      'Melody and rhythm are the strongest memory hooks a small child has: a word they cannot repeat in speech comes out easily in a song. Pairing each line with one action means the language is stored twice — as sound and as movement — which is why a chant survives to the next lesson and a spoken list does not.',
    rounds: 'One song of 4 short lines, with a second verse that changes ONE word.',
    shape: `{ "type": "songKaraoke", "prompt": "🎵 The Duck Song", "lyrics": ["Duck, duck, quack quack quack 🦆", "Waddle, waddle, waddle back 👣", "Duck, duck, in the pond 💧", "Quack quack quack, bye-bye! 👋"], "singAlongPacing": 1400, "points": 0, "feedbackCorrect": "Beautiful singing! 🌟" }`,
    noScreen: 'Sing it while the child waddles round the room; no screen needed at all.',
    minutes: 4,
    bandRules:
      '4 lines of 4-6 words, every line singable by an untrained adult, one action per line (say the action in brackets). Slow pacing: 1400-1800 ms per line.',
  },
  {
    id: 'moveAndDo',
    label: 'Move & Do',
    emoji: '🤸',
    band: 'veryYoung',
    ages: '2-5',
    engine: 'realLifeMission',
    interaction: 'Do the action now: jump, clap, touch, give.',
    why:
      'Total Physical Response works because the body remembers what the ear forgets: comprehension is proved by doing, with no speaking and no reading required. It also gives a small child the movement they physically need, so a session can be language-heavy without a meltdown.',
    rounds: '1 mission with 5-6 commands, each using a word the child already knows plus one new one.',
    shape: `{ "type": "realLifeMission", "prompt": "🤸 Let's move! Do what I say.", "checklist": ["Jump like a frog 🐸", "Clap your hands 👏", "Touch your nose 👃", "Find something blue 💙", "Give me the duck 🦆"], "roleplayPrompt": "Say it faster each time, then let the child give YOU a command.", "points": 0, "feedbackCorrect": "You did everything! 🎉" }`,
    noScreen: 'The commands ARE the activity — no screen required after the first read.',
    minutes: 5,
    bandRules:
      'Every command must be physically possible in a small room and safe for a toddler. One instruction per item, no two-step directions ("touch your nose and jump" is too much before five).',
  },
  {
    id: 'peekAndFind',
    label: 'Where Is It?',
    emoji: '🙈',
    band: 'veryYoung',
    ages: '2-3',
    engine: 'multipleChoice',
    interaction: 'Hide it, then find it behind one of two big pictures.',
    why:
      'Object permanence is the cognitive milestone of this age: the world is understood through things continuing to exist when hidden. A game of hiding and finding is therefore exactly on the child\'s developmental edge, and it carries receptive vocabulary for free — they are looking for the *duck*, not just for anything.',
    rounds: '3 rounds, TWO picture options only (never three), all points 0.',
    shape: `{ "type": "multipleChoice", "prompt": "🙈 Where is the duck hiding?", "options": [{ "text": "🦆 duck", "isCorrect": true }, { "text": "🐸 frog" }], "points": 0, "feedbackCorrect": "Found it! Quack quack! 🎉", "feedbackIncorrect": "Not yet — look for the yellow duck 💛" }`,
    noScreen: 'Hide a toy under a cloth and ask "where is it?" — the original version of this game.',
    minutes: 4,
    bandRules:
      'Exactly two options, huge and visually different. The correct answer must never be in the same position twice in a row. No scores, no "wrong" — only "not yet".',
  },
  {
    id: 'sortForThePet',
    label: 'Sort It Out',
    emoji: '🧺',
    band: 'veryYoung',
    ages: '3-5',
    engine: 'dragDropSort',
    interaction: 'Move each thing into the right basket.',
    why:
      'Categorisation is the beginning of thinking in concepts — the same mental move that later sorts words into families and letters into sounds. Two buckets is the right load at this age: a third category costs the child the rule itself, and the pretend frame (putting things in the pet\'s basket) keeps the task social rather than academic.',
    rounds: '1 board with 4-6 items and exactly 2 buckets, with big emoji labels.',
    shape: `{ "type": "dragDropSort", "prompt": "🧺 Put the food in the bowl and the toys in the box", "items": ["🍎 apple", "🧸 teddy", "🍌 banana", "🪀 yo-yo"], "categories": [{ "name": "Eat it", "emoji": "🍽️", "items": ["🍎 apple", "🍌 banana"] }, { "name": "Play with it", "emoji": "🧺", "items": ["🧸 teddy", "🪀 yo-yo"] }], "points": 0, "feedbackCorrect": "You sorted everything! 🎉", "feedbackIncorrect": "Almost! Try another basket 🧺" }`,
    noScreen: 'Two bowls on the floor and a pile of real things to sort.',
    minutes: 5,
    bandRules:
      'Exactly two categories, whose names a 3-year-old knows (food/not food, big/small, soft/hard). Items carry an emoji. Every item must fit exactly one bucket with no ambiguity.',
  },
  {
    id: 'popIt',
    label: 'Pop It!',
    emoji: '🎈',
    band: 'veryYoung',
    ages: '2-4',
    engine: 'balloonPop',
    interaction: 'Tap the balloon carrying the picture you were asked for.',
    why:
      'Contingency learning — "I do something and the world answers" — is the engine of a toddler\'s development, and a balloon pop is the purest version of it: instant, colourful, and caused entirely by the child. That is why a two-year-old will play this twenty times and a worksheet never. The target is a picture, so the child proves they understood a spoken word without reading a letter, and a wrong tap only wobbles — nothing is taken away.',
    rounds: '3 rounds, 4-5 balloons each: one carrying the target picture, the rest clearly different.',
    shape: `{ "type": "balloonPop", "prompt": "🎈 Pop the duck!", "word": "🦆 duck", "options": ["🦆 duck", "🐮 cow", "🐈 cat", "🐸 frog"], "points": 0, "feedbackCorrect": "POP! You found the duck! 🎉", "feedbackIncorrect": "Not that one — look for the duck 🦆", "heroEmoji": "🎈" }`,
    noScreen: 'Blow real bubbles and let the child pop the one you name — same game, no screen.',
    minutes: 4,
    bandRules:
      'The target ("word") must appear in "options" written exactly the same way, with 3-4 clearly different decoys and no repeated label. A balloon carries ONE emoji plus at most one short word. Points are 0, and a wrong tap must never remove a balloon or a star.',
  },
  {
    id: 'listeningBingo',
    label: 'Listening Bingo',
    emoji: '🎧',
    band: 'veryYoung',
    ages: '3-5',
    engine: 'bingoListener',
    interaction: 'Hear a word, then stamp the picture you heard.',
    why:
      'Hearing a word inside a stream of sound is a different skill from hearing a word you were told to expect, and it is the one phonemic awareness is built on: the child holds the sound in working memory and matches it to a picture with no printed hint. The board is pictures, so nothing is read, and the tutor\'s own voice is the audio — which is why it still works in the noisy room a recording would lose.',
    rounds: '1 board of 6-9 emoji pictures; the game calls 5 of them. The same board can be replayed with the words changed.',
    shape: `{ "type": "bingoListener", "prompt": "🎧 Listen and find the picture you hear!", "options": ["🦆 duck", "🐮 cow", "🐈 cat", "🐕 dog", "🐑 sheep", "🐖 pig"], "points": 0, "feedbackCorrect": "BINGO! Brilliant listening ears! 🎉", "heroEmoji": "🎧" }`,
    noScreen: 'Lay six toys in a row and say one word — the child grabs it. Speed up each round.',
    minutes: 5,
    bandRules:
      '6-9 options, each an emoji plus one familiar noun. No two options may begin with the same sound, or the listening task becomes guessing. Points 0, and "Say it again" is the child\'s right rather than a penalty.',
  },
  {
    id: 'rhymeTime',
    label: 'Rhyme Time',
    emoji: '🎵',
    band: 'veryYoung',
    ages: '3-5',
    engine: 'rhymeMatch',
    interaction: 'Find the two pictures whose names end with the same sound.',
    why:
      'Rhyme is the doorway to phonemic awareness: to hear that cat and hat end alike, a child has to stop listening to what a word means and start listening to how it sounds — exactly the shift reading later demands. It is the best preschool predictor of reading success, and it is entirely oral, so a three-year-old can do the hardest version of it before knowing a single letter.',
    rounds: '1 board of 3 pairs (6 pictures), every pair a true rhyme the tutor can prove out loud.',
    shape: `{ "type": "rhymeMatch", "prompt": "🎵 Find the rhyming pairs!", "pairs": [{ "left": "🦆 duck", "right": "🚚 truck" }, { "left": "🐱 cat", "right": "🎩 hat" }, { "left": "⭐ star", "right": "🚗 car" }], "points": 0, "feedbackCorrect": "You heard the rhyming sounds! 🎉", "heroEmoji": "🎵" }`,
    noScreen: 'Say two words — the child claps if they rhyme, thumbs down if they do not.',
    minutes: 5,
    bandRules:
      'Exactly 3 pairs, each a true rhyme (same ending sound, not merely the same spelling). Both words must be familiar objects with an emoji. The tutor says each pair aloud twice before the children choose.',
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   YOUNG SHELF (5-12) — retrieval, encoding, sorting, stories, fair competition
   ──────────────────────────────────────────────────────────────────────────── */

const YOUNG_GAMES: KidGame[] = [
  {
    id: 'quizShow',
    label: 'Big Quiz Show',
    emoji: '❓',
    band: 'young',
    ages: '6-12',
    engine: 'multipleChoice',
    interaction: 'Read the question, then tap one of four big answers.',
    why:
      'Retrieval practice beats re-reading by a wide margin: pulling an answer out of memory is what makes it stick, and a quiz is the cheapest way to make every child in the room retrieve. Four options is the sweet spot — enough to make the child think, few enough to read across a classroom.',
    rounds: '6 rounds: 4 rounds on this lesson\'s words, 2 reviewing last lesson.',
    shape: `{ "type": "multipleChoice", "prompt": "Which sentence is in the past tense?", "options": ["I walked to school.", "I walk to school.", "I am walking to school.", "I will walk to school."], "correct": "I walked to school.", "points": 25, "feedbackCorrect": "Exactly — walked is past tense! ⭐", "feedbackIncorrect": "Nearly. Look for the verb that already happened." }`,
    noScreen: 'Read the four options aloud and let teams hold up fingers 1-4.',
    minutes: 10,
    bandRules:
      'Four options, every option within two words of the others in length, the longest option never correct, and the correct answer never in the same position twice in a row. Rotate through the class, not the fastest hand.',
  },
  {
    id: 'memoryPairs',
    label: 'Memory Pairs',
    emoji: '🧠',
    band: 'young',
    ages: '5-9',
    engine: 'memoryMatch',
    interaction: 'Turn two cards, find the matching pair, remember where they were.',
    why:
      'Working memory is the bottleneck for everything else in a lesson, and this is the classic way to load it gently: the child must hold a card\'s position while doing something else. Matching word to picture also forces the meaning, not just the shape of the word.',
    rounds: 'One board of 6 pairs (12 cards): word ↔ picture or word ↔ meaning.',
    shape: `{ "type": "memoryMatch", "prompt": "🧠 Find the pairs!", "pairs": [{ "left": "duck", "right": "🦆" }, { "left": "cow", "right": "🐮" }, { "left": "cat", "right": "🐈" }, { "left": "dog", "right": "🐕" }, { "left": "horse", "right": "🐴" }, { "left": "sheep", "right": "🐑" }], "points": 40, "feedbackCorrect": "Great memory! 🎉" }`,
    noScreen: 'Write the words on paper squares and turn them face-down on the table.',
    minutes: 8,
    bandRules:
      '6 pairs (12 cards) is the ceiling. Every pair must be unambiguous — one word, one picture. Say the word aloud every time a card is turned, so the game is listening practice too.',
  },
  {
    id: 'buildTheWord',
    label: 'Build the Word',
    emoji: '🐝',
    band: 'young',
    ages: '5-8',
    engine: 'spellingBee',
    interaction: 'Hear the word, tap the letter tiles in order.',
    why:
      'Encoding a word letter by letter is phonics in action, and it is the strongest predictor of early reading success — far stronger than recognising a word from a list. Tiles that can be placed wrongly, with an instant shake rather than a mark, let the child self-correct without the sting of being wrong in front of the class.',
    rounds: '4-6 words from this lesson\'s word family, in order of length.',
    shape: `{ "type": "spellingBee", "prompt": "🐝 Build the word you hear", "items": ["cat", "hat", "mat", "bat"], "distractorLetters": ["o", "e"], "points": 40, "feedbackCorrect": "Perfect spelling! 🏆", "feedbackIncorrect": "Listen again and try the letters in order." }`,
    noScreen: 'Magnetic letters or paper tiles on the table — same order, same self-check.',
    minutes: 8,
    bandRules:
      'Words must share a pattern (the same word family, the same vowel sound, or the same prefix) so the child is learning a rule, not four random spellings. Shortest first. No timer by default.',
  },
  {
    id: 'sortIt',
    label: 'Sort Into Buckets',
    emoji: '🗂️',
    band: 'young',
    ages: '6-12',
    engine: 'dragDropSort',
    interaction: 'Put each word in the bucket it belongs to.',
    why:
      'Sorting is how a child builds the categories that later do the work of grammar and vocabulary: past/present, noun/verb, long/short vowel. Making the child decide *where* something goes forces a comparison between items, which is a far deeper act than naming them one at a time.',
    rounds: '1 board of 6-9 items across 3 buckets.',
    shape: `{ "type": "dragDropSort", "prompt": "🗂️ Sort the verbs: past or present?", "items": ["walked", "walk", "ate", "eat", "played", "play"], "categories": [{ "name": "Past", "emoji": "⏪", "items": ["walked", "ate", "played"] }, { "name": "Present", "emoji": "▶️", "items": ["walk", "eat", "play"] }], "points": 30, "feedbackCorrect": "Every one in the right bucket! ⭐", "feedbackIncorrect": "One slipped — check it again." }`,
    noScreen: 'Three hoops or labelled boxes and the words on cards.',
    minutes: 10,
    bandRules:
      '2-3 buckets, each with a one-word name and an emoji. Every item must be unambiguously in exactly one bucket, and every bucket must end up non-empty.',
  },
  {
    id: 'sentenceBuild',
    label: 'Sentence Builder',
    emoji: '🧱',
    band: 'young',
    ages: '7-12',
    engine: 'sentenceBuilder',
    interaction: 'Tap the word tiles into the right order.',
    why:
      'Word order is where meaning lives in English, and moving tiles around makes the pattern visible in a way that a worksheet cannot: the child watches the sentence assemble and can hear the wrong version in their head. Doing it as a physical sequence also links word order to the rhythm of the spoken sentence.',
    rounds: '3 sentences, each one round, from 4 tiles up to 7.',
    shape: `{ "type": "sentenceBuilder", "prompt": "🧱 Put the words in order", "correctOrder": ["The", "duck", "swims", "in", "the", "pond"], "distractors": ["swim"], "points": 30, "feedbackCorrect": "That reads perfectly! ⭐" }`,
    noScreen: 'Write each word on a card and let the child shuffle and order them on the table.',
    minutes: 8,
    bandRules:
      'One sentence per round, 4-7 words, using vocabulary the child already met in the lesson. Add at most two distractor words, both plausible for the sentence. Include the punctuation on the last tile.',
  },
  {
    id: 'storyPath',
    label: 'Choose the Path',
    emoji: '🗺️',
    band: 'young',
    ages: '6-12',
    engine: 'storyChoice',
    interaction: 'Pick what happens next — both options are safe, both keep the story going.',
    why:
      'Prediction is the comprehension skill that carries reading: a child who is guessing what comes next is building meaning, not decoding. Being allowed to choose also buys ownership — the story becomes theirs, and they will retell it at home without being asked.',
    rounds: '2-3 decision points, two options each, all paths rejoining.',
    shape: `{ "type": "storyChoice", "prompt": "The duck sees a dark cave. What should we do?", "storyChoices": [{ "choice": "🐣 Peek inside carefully", "outcome": "You see a shiny stone!", "nextPlot": "The stone glows — someone is inside.", "best": true, "bonusXp": 20 }, { "choice": "🏃 Run back to the pond", "outcome": "Your friends are waiting for news.", "nextPlot": "They ask you to tell the story.", "bonusXp": 10 }], "points": 25, "feedbackCorrect": "What a choice! 🌟" }`,
    noScreen: 'Two fingers up or down for each option, then the tutor tells that branch.',
    minutes: 10,
    bandRules:
      'Both options must be reasonable and safe — never punish the choice the child makes. Each branch returns to the same next scene so the class ends together. Keep each outcome under 12 words.',
  },
  {
    id: 'oddOneOut',
    label: 'Odd One Out',
    emoji: '🤔',
    band: 'young',
    ages: '7-12',
    engine: 'oddOneOut',
    interaction: 'Find the word that does not belong, then say why.',
    why:
      'Noticing *why* a word does not fit is a reasoning task, not a vocabulary one: the child has to test each item against a rule they hold in their head. Reasoning aloud is the part that matters — a correct tap with no explanation is guessing, an explanation is understanding.',
    rounds: '4 rounds of 4 words, each with a one-word reason to give afterwards.',
    shape: `{ "type": "oddOneOut", "prompt": "🤔 Which one does not belong?", "options": ["run", "jump", "happy", "swim"], "odd": "happy", "explanation": "happy is a feeling; the others are actions", "points": 25, "feedbackCorrect": "Right — and that is the reason!", "feedbackIncorrect": "Think: three of them are the same kind of word." }`,
    noScreen: 'Say the four words and ask for a thumbs up on the odd one.',
    minutes: 8,
    bandRules:
      '4 items, exactly one odd, and the reason must be describable by the child in one short sentence (word class, sound, category or length). No trick rounds where two answers are defensible.',
  },
  {
    id: 'classBoard',
    label: 'Class Board Game',
    emoji: '🎲',
    band: 'young',
    ages: '6-12',
    engine: 'spinWheel',
    interaction: 'Spin the wheel; the segment is the task for that team.',
    why:
      'Turn-taking is a social skill children this age are still learning by doing, and a spinner removes the adult from the role of judge: the wheel decides, so nobody loses face. Each segment reuses the lesson\'s language in a different mode, which is spaced retrieval with a game wrapped around it.',
    rounds: 'One wheel of 6 segments, reused for as many turns as there are teams.',
    shape: `{ "type": "spinWheel", "prompt": "🎲 Spin and do the task", "options": ["Say a sentence with 'duck'", "Spell 'pond'", "Act out 'swim'", "Name three animals with wings", "Make a question with 'where'", "Teach your team one new word"], "points": 20, "feedbackCorrect": "Great turn! ⭐" }`,
    noScreen: 'Draw the six tasks on the board and let a child point with eyes closed.',
    minutes: 12,
    bandRules:
      '6 segments, one task each, every task doable in under 30 seconds and with no preparation. Tasks must be spread across speaking, spelling and meaning so one strong skill cannot carry the team.',
  },
  {
    id: 'wordHunt',
    label: 'Word Hunt',
    emoji: '🔍',
    band: 'young',
    ages: '7-12',
    engine: 'wordSearch',
    interaction: 'Find the hidden words in the letter grid.',
    why:
      'Scanning a grid for a known word trains the visual attention and letter-pattern recognition that fluent reading needs. Because the child already knows the words, the task is not recall but *searching* — a different and complementary skill, and a calm one for a class that has just been noisy.',
    rounds: '1 grid with 4-6 words from the lesson.',
    shape: `{ "type": "wordSearch", "prompt": "🔍 Find: duck, pond, swim, wing", "gridWords": ["duck", "pond", "swim", "wing"], "points": 30, "feedbackCorrect": "All the words found! 🔍" }`,
    noScreen: 'Write the grid on the board — same words, same hunt, chalk instead of pixels.',
    minutes: 10,
    bandRules:
      '4-6 words, all horizontal or vertical (no diagonals before age 9), no crossing letters shared between two hidden words.',
  },
  {
    id: 'trueOrFalse',
    label: 'True or False',
    emoji: '⚖️',
    band: 'young',
    ages: '5-10',
    engine: 'trueFalse',
    interaction: 'Decide fast: true or false. Both hands up, then the answer.',
    why:
      'A statement the child must accept or reject is a comprehension check that cannot be answered by pattern-matching: they have to hold the sentence, compare it with what the text said, and commit. The speed is the fun; the fact that the whole class commits on the same beat is what makes the gaps visible.',
    rounds: '5 statements about the lesson text, mixed true and false.',
    shape: `{ "type": "trueFalse", "prompt": "The duck swims in the pond.", "correct": true, "points": 15, "feedbackCorrect": "True — you remembered! ⭐", "feedbackIncorrect": "Actually the duck swims — listen again." }`,
    noScreen: 'Read the statement; thumbs up for true, thumbs down for false.',
    minutes: 6,
    bandRules:
      '5 statements, never more than three of the same answer in a row. Each statement is a full short sentence about the lesson text. False statements must be falsifiable by one word, so the correction is instant.',
  },
  {
    id: 'clapSyllables',
    label: 'Clap the Syllables',
    emoji: '👏',
    band: 'young',
    ages: '5-8',
    engine: 'syllableCount',
    interaction: 'Hear the word, clap the beats, then press how many.',
    why:
      'Breaking a word into beats is phonological awareness in its most concrete form, and at this age it predicts decoding better than knowing the letters does. It is done with the body rather than the eye, so a child who cannot yet read one word can still succeed — which matters for a beginner who is behind the class. The count is pressed, not said, so a quiet child answers exactly as loudly as a loud one.',
    rounds: '5-6 words of one to four syllables, shortest first, taken from this lesson.',
    shape: `{ "type": "syllableCount", "prompt": "👏 Clap the word, then press the number of beats", "syllables": [{ "word": "cat", "count": 1 }, { "word": "pen-cil", "count": 2 }, { "word": "but-ter-fly", "count": 3 }], "points": 25, "feedbackCorrect": "You felt the beats! 👏", "heroEmoji": "👏" }`,
    noScreen: 'Clap each child\'s own name round the circle and count the beats together.',
    minutes: 7,
    bandRules:
      'Write every word with hyphens between its syllables ("but-ter-fly") so the tutor can see the answer, and keep counts between 1 and 4. Lesson words first, then the children\'s own names.',
  },
  {
    id: 'fastWords',
    label: 'Fast Words',
    emoji: '⚡',
    band: 'young',
    ages: '6-10',
    engine: 'whackAMole',
    interaction: 'Hit only the moles showing the target word, and ignore the lookalikes.',
    why:
      'Fluent reading is automatic word recognition: a strong reader identifies a common word in under 200 milliseconds, and that speed is what frees the mind for meaning. A timed drill pushes recognition out of the deliberate system into the automatic one, and the decoys are the words children genuinely confuse (was/saw, their/there, when/then), so the practice lands on the error rather than the easy case.',
    rounds: '1 game of 30-45 seconds on one target word, with 3-5 decoys that look or sound like it.',
    shape: `{ "type": "whackAMole", "prompt": "⚡ Hit only the word: went", "word": "went", "options": ["want", "was", "when", "wet"], "seconds": 40, "points": 30, "feedbackCorrect": "Beautifully quick eyes! ⚡" }`,
    noScreen: 'Two columns of words on the board; children race to touch the target in each row.',
    minutes: 6,
    bandRules:
      'One target word and 3-5 decoys that are truly confusable with it (same letters, same sound or same shape). "seconds" is 30-45. Never run this for more than a few minutes — speed work is a sprint, not a lesson.',
  },
  {
    id: 'flashAndSay',
    label: 'Flash & Say',
    emoji: '🃏',
    band: 'young',
    ages: '5-10',
    engine: 'flashcardTrainer',
    interaction: 'Turn the card, say the word or the meaning, then mark it "I know it".',
    why:
      'A card that turns is retrieval with the answer built in: before turning it, the child has to decide whether they know it — and that judgement is metacognition, the skill that makes a learner study what they do not yet know instead of what they already do. Marking cards gives the tutor a running map of the class\'s gaps without marking a single book, and the deck can be replayed until it is empty.',
    rounds: '1 deck of 6-8 cards: word on the front, meaning or translation on the back.',
    shape: `{ "type": "flashcardTrainer", "prompt": "🃏 Say the word, then turn the card", "pairs": [{ "left": "🦆 duck", "right": "a bird that swims in the pond" }, { "left": "🌧️ drizzle", "right": "light rain" }], "points": 30, "feedbackCorrect": "Every card mastered! 🏆" }`,
    noScreen: 'The same deck as paper cards, held up one at a time.',
    minutes: 6,
    bandRules:
      '6-8 cards. Front = one emoji plus the word; back = the meaning in at most 6 words (the child\'s first language is allowed when it helps). Never put the answer on the front.',
  },
];

/** A built game, kept on the learner so it can be played again in the next lesson. */
export interface SavedKidGame {
  id: string;
  gameId: string;
  label: string;
  emoji: string;
  band: KidAgeBand;
  topic: string;
  createdAt: string;
  summary?: string;
  /** True when the tutor saved the hand-written example rather than an AI's reply. */
  fromDemo?: boolean;
  script: KidGameScript;
}

export const KID_GAMES: KidGame[] = [...VERY_YOUNG_GAMES, ...YOUNG_GAMES].map((game) => ({
  ...game,
  /* Filled in from the engine rather than hand-written 22 times. This keeps the
     two lists from drifting — the whole point of the field is that the picture
     requirement follows from what the engine *does*, and the only honest way to
     guarantee that is to derive it. A game added later without a thought about
     media gets the correct default instead of silently getting nothing. */
  media: game.media ?? mediaFor(game.engine),
}));

export const gamesForBand = (band: KidAgeBand): KidGame[] => KID_GAMES.filter((game) => game.band === band);

export const gameById = (id: string): KidGame | undefined => KID_GAMES.find((game) => game.id === id);

/** Which games can be handed to a class in the time left, biggest first. */
export const gamesByMinutes = (band: KidAgeBand): KidGame[] =>
  [...gamesForBand(band)].sort((a, b) => a.minutes - b.minutes);

/**
 * The engine a game plays on.
 *
 * Named separately from the catalogue so the player and the prompt builder cannot drift
 * apart: both ask this, so a game can never be advertised in the picker and then have no
 * way to be played.
 */
export const engineForGame = (gameId: string): ActivityType | undefined => gameById(gameId)?.engine;

/** The first emoji in a piece of text, if it has one. */
const EMOJI_IN_TEXT = /(\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)/u;

/**
 * The one big picture a round shows on a projector.
 *
 * A round's `heroEmoji` is written by the AI (or by hand in the demos), but a game must
 * never appear on a classroom screen as a bare line of type, so when it is missing this
 * finds the emoji the round already carries — its own emoji, its character, or the emoji
 * inside the prompt — and only then falls back to the game's own icon.
 *
 * Emojis inside `options` are deliberately NOT scanned: on a quiz or a listening game that
 * would hand the child the answer at the top of the screen.
 */
export function heroEmojiFor(round: LessonActivity | undefined, fallback = '🎮'): string {
  if (!round) return fallback;
  const sources = [
    (round as any).heroEmoji,
    (round as any).imageEmoji,
    round.characterEmoji,
    round.emoji,
    round.prompt,
    round.readAloudText,
    round.word,
  ];
  for (const source of sources) {
    if (typeof source !== 'string' || !source) continue;
    const found = source.match(EMOJI_IN_TEXT);
    if (found) return found[1];
  }
  return fallback;
}

/** A hero image is only used when the AI gave a real, hotlinkable URL. */
export function heroImageFor(round: LessonActivity | undefined): string | undefined {
  const raw =
    round && typeof (round as any).posterImageUrl === 'string'
      ? String((round as any).posterImageUrl).trim()
      : round && typeof round.imageUrl === 'string'
        ? String(round.imageUrl).trim()
        : '';
  return /^https:\/\/\S+$/.test(raw) ? raw : undefined;
}
