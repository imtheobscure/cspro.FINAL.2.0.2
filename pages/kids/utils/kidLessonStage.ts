/* ════════════════════════════════════════════════════════════════════════════
   🎬 LESSON STAGES — which player runs which kind of lesson

   ════════════════════════════════════════════════════════════════════════════

   THE BUG THIS FILE EXISTS TO KILL

   Every lesson used to play as the same thing: a row of step slides, then a word
   wall, then a quiz, then the media, then a wrap-up. That is right for a lesson
   whose *pedagogy is an order* — a TPR story, a circle time, an ESA journey — and
   it is flatly wrong for a lesson whose *pedagogy is an object*:

     · a 🃏 Flashcard deck that opens as step slides is not a flashcard deck
     · a 🧠 Memory Pairs lesson that opens as step slides is not a memory game
     · a 🎵 Song lesson that never shows the words of the song has lost the song
     · a 🖨 Worksheet that opens as slides is not a worksheet

   So a kind now declares its own STAGE, and the launcher runs that stage:

     deck    — step slides: right when the order IS the method (the 9 models, a
               mini lesson, a story lesson, a video story)
     engine  — one of the projector's activity engines, the same players the games
               use, so "Flashcards" really is a deck you flip and "Memory" really
               is a grid you turn over
     paper   — a printable page: a worksheet, homework, a lesson plan, a family
               guide are documents, and a document is what should be on screen

   The script for an engine stage is built from the LESSON'S OWN content (its
   words, its game items, its steps, its lyrics) and never from the mock alone —
   so a lesson the AI wrote opens in exactly the stage its kind promises, and the
   tutor sees their own words in it.

   WHY THE MODELS STAY A DECK

   The nine method models (TPR story, circle time, ESA, TBLT, TTT, I do/we do/you
   do, story world, fast fun, talk and chat) are ordered procedures. Turning one
   into a game board would delete the thing that makes it that model, so they stay
   slides — with the lyrics slide and the plan slide they were missing.
   ════════════════════════════════════════════════════════════════════════════ */

import type { ActivityType, LessonActivity } from './flipbookTypes';
import type { KidGame } from './kidGameCatalog';
import { kindById } from './lessonCreatorTypes';
import type { KidAgeBand } from './lessonCreatorTypes';
import type { KidLesson, KidLessonCard } from './lessonCreatorTypes';

/** How a lesson kind plays. */
export type KidLessonStage = 'deck' | 'engine' | 'paper';

export interface KidLessonStageBinding {
  stage: KidLessonStage;
  /**
   * Plain words for the tutor, shown on the tile: what pressing ▶ Test will open.
   * A tutor should never have to press a button to find out what it does.
   */
  opens: string;
  /** For `engine` stages: the activity engine that IS this kind of lesson. */
  engine?: ActivityType;
  /**
   * This kind plays as a run sheet, but its engine runs INSIDE one of the phases.
   *
   * Phonics is the case that proved it. A phonics lesson is genuinely a drill — and
   * it is just as genuinely a 30-minute progression (hear it → say it → blend it →
   * read it → spell it → write it). Letting the drill own the whole screen threw the
   * progression away; letting slides own it threw the drill away. So the run sheet is
   * the spine and the drill is the phase where the child actually builds the words.
   */
  drill?: boolean;
  /**
   * A band that needs a different player for the same kind.
   *
   * Phonics is the case: a pre-reader cannot spell a word they cannot read, so the
   * 2-5 version opens the letter cards and the 5-12 version builds the word out of
   * its letters. Declared here rather than buried in the builder, so the map stays
   * the one place that says which player runs what.
   */
  engineForBand?: Partial<Record<KidAgeBand, ActivityType>>;
}

/* ────────────────────────────────────────────────────────────────────────────
   THE MAP

   Keyed by lesson kind id. A kind with no entry falls back to the deck, which is
   the safe default: every kind that is genuinely an order keeps playing as one.
   ──────────────────────────────────────────────────────────────────────────── */

export const KID_LESSON_STAGES: Record<string, KidLessonStageBinding> = {
  /* ── The everyday shelf ────────────────────────────────────────────────── */

  /* An order, not an object: warm-up → words → game → calm close. */
  miniLesson: { stage: 'deck', opens: 'the lesson slides, step by step' },
  /* The story lives in the steps, so the steps are the story. */
  storyLesson: { stage: 'deck', opens: 'the story, page by page' },
  /* Watch the clip, then answer about it — the steps carry the clip. */
  videoStory: { stage: 'deck', opens: 'the clip, then the questions about it' },

  /* Phonics is letters and sounds, so it opens on the letter cards for the little
     ones (a pre-reader cannot spell a word they cannot read) and on the word
     builder for 5+, where building "cat" out of letters IS the phonics work. */
  phonicsLesson: {
    /* The run sheet, with the drill built in as its own phase. */
    stage: 'deck',
    drill: true,
    engine: 'flashcardTrainer',
    engineForBand: { veryYoung: 'flashcardTrainer', young: 'spellingBee' },
    opens: 'the sound ladder, with the letter drill built in',
  },

  /* A TPR lesson is a run sheet with the movement game inside it, for the same
     reason phonics is: the method IS the order (hear it → do it → chain it → be the
     boss), and the six commands are what the engine plays. The child never reads a
     word here, so there is only ever the 2-5 player. */
  movementLesson: {
    stage: 'deck',
    drill: true,
    engine: 'realLifeMission',
    opens: 'the command ladder, with the movement game built in',
  },
  /* A routine IS a sequence of real moments in the child's day, so it plays as a run
     sheet with the routine game inside its free-production phase: the child runs the
     whole thing for the teddy, and that is the lesson's payoff. The engine is the
     same real-life mission the 🌍 Mission lessons use, because a routine is exactly
     that — a short list of real things to do, ticked off. */
  routineLesson: {
    stage: 'deck',
    drill: true,
    engine: 'realLifeMission',
    opens: 'the routine, with the step-by-step routine game built in',
  },

  /* ── Objects: these must open as themselves ───────────────────────────── */

  /* A worksheet is a PAGE, and the upgrade is that the page prints the tutor's own
     run sheet: the six phases, their minute floors, the exact words to say at each
     task and the talk counts. Nothing opens — the doing IS the paper — so the stage
     stays `paper` and no engine is ever built for it. */
  worksheet: { stage: 'paper', opens: 'the printable page, with the tutor’s run sheet printed on it' },
  homeworkQuest: { stage: 'paper', opens: 'the quest board — the jobs, their XP, and the week’s tally' },
  lessonPlan: { stage: 'paper', opens: 'the tutor’s plan, ready to print' },
  familyGuide: { stage: 'paper', opens: 'the family handout' },

  /* The quiz is a NIGHT, not an engine screen. It used to be handed straight to the
     quiz player, which meant no run sheet, no phases and no talk meter — a 15-minute
     tap-fest. Now the quiz is the drill inside its own six-phase night, exactly like
     the phonics, movement, routine and circle lessons: the run sheet frames it, the
     talk meter counts the sentences, and the quiz player opens at phase 3. */
  pictureQuiz: {
    stage: 'deck',
    drill: true,
    engine: 'multipleChoice',
    opens: 'the quiz night — six phases, with the picture quiz as the drill',
  },
  /* The deck is a NIGHT, not an engine screen. It used to be handed straight to the
     card player, which meant no run sheet, no phases and no talk meter — the child
     flipped cards for eight minutes and said four words. Now the deck is the drill
     inside its own six-phase card night: the run sheet frames it, the talk meter
     counts the sentences, and the card player opens at the deck phase. */
  flashcards: {
    stage: 'deck',
    drill: true,
    engine: 'flashcardTrainer',
    opens: 'the card night — six phases, with the deck as the drill',
  },
  memoryMatch: { stage: 'engine', engine: 'memoryMatch', opens: 'the memory grid, face down' },
  /* The arcade used to be handed straight to the pop engine: taps for eight minutes,
     no run sheet, no talk meter. It is now the pop round inside its own arcade NIGHT,
     so the phases frame the game and the talking is counted — the same move the deck
     and the quiz night already made. */
  arcadeGame: {
    stage: 'deck',
    drill: true,
    engine: 'balloonPop',
    opens: 'the arcade night — six phases, with the pop round as the drill',
  },
  boardGame: { stage: 'engine', engine: 'spinWheel', opens: 'the board with its spin wheel' },
  rolePlay: { stage: 'engine', engine: 'speakRepeat', opens: 'the role-play lines to say' },
  scavengerHunt: { stage: 'engine', engine: 'realLifeMission', opens: 'the hunt, one find at a time' },
  storyAdventure: { stage: 'engine', engine: 'storyChoice', opens: 'the story where choices decide' },
  listeningSong: { stage: 'engine', engine: 'songKaraoke', opens: 'the song with its words on screen' },

  /* ── The nine method models: the order is the pedagogy, so: slides ──────── */
  /* TPR-Storytelling is the one method model that ALSO does something: the story
     walk is the doing, and it lives inside the free-production phase so the run
     sheet still frames the whole session. The engine is the real-life mission the
     movement and routine lessons use — a list of things to do, ticked off — because
     the story here is a list of actions, not a set of questions. */
  tprStory: {
    stage: 'deck',
    drill: true,
    engine: 'realLifeMission',
    opens: 'the story you act out, with the story walk built in',
  },
  /* Circle Time is the one method model where the ritual IS the game: the round is
     the whole circle in its fixed order — hello, the pictures, the wait, the surprise,
     the goodbye — and every tick is something the child says. It stays a slide lesson
     (the order is the pedagogy) with the circle game built into its drill phase. */
  circleTime: {
    stage: 'deck',
    drill: true,
    engine: 'realLifeMission',
    opens: 'the same hello, the check-in, the surprise — and the child runs it',
  },
  esaJourney: { stage: 'deck', opens: 'Engage, Study, Activate, one slide each' },
  tbltMission: { stage: 'deck', opens: 'the mission, the trial, the lock-in' },
  tttBoss: { stage: 'deck', opens: 'try it, learn it, then the boss round' },
  scaffoldSteps: { stage: 'deck', opens: 'I do, we do, you do — the whole ladder' },
  storyWorld: { stage: 'deck', opens: 'the story world, scene by scene' },
  fastFun: { stage: 'deck', opens: 'the quick beats, one screen each' },
  talkChat: { stage: 'deck', opens: 'the talking prompts, one scene each' },
};

/** The stage for a kind id, with the deck as the safe default. */
export const stageForLesson = (kindId?: string): KidLessonStageBinding =>
  (kindId && KID_LESSON_STAGES[kindId]) || { stage: 'deck', opens: 'the lesson slides, step by step' };

/* ────────────────────────────────────────────────────────────────────────────
   BUILDING THE SCRIPT

   An engine stage needs rounds in the shape its engine reads (the same shapes the
   games are written against — see `kidGameDemos.ts`). Everything below is built
   from the lesson's own content, and every builder has a fallback so a thin
   lesson still plays something rather than showing an empty round.
   ──────────────────────────────────────────────────────────────────────────── */

const clean = (value: unknown): string => String(value ?? '').trim();

/** A word with its picture in front, the way the card should read. */
const card = (emoji: string | undefined, word: string): string =>
  `${emoji ? `${emoji} ` : ''}${word}`.trim();

const firstRound = (id: string, type: ActivityType, prompt: string): LessonActivity =>
  ({ id, type, prompt, points: 0, feedbackCorrect: 'Well done! 🎉' }) as LessonActivity;

/* ── Flashcards / phonics cards: the deck the kind promises ──────────────── */

/** The back of a card: the child's own talking turn, never a dictionary label. */
function backOfCard(c: KidLessonCard): string {
  const says = clean(c.childSays);
  const action = clean(c.do);
  const sentence = clean(c.sentence);
  if (says && action) return `${says} — ${action}`;
  if (says) return says;
  if (sentence && action) return `${sentence} — ${action}`;
  if (sentence) return sentence;
  if (action) return action;
  return clean((c.review || []).join(' + ')) || 'say it out loud together';
}

function deckRounds(lesson: KidLesson): LessonActivity[] {
  const deckCards = lesson.deck?.cards || [];
  if (deckCards.length) {
    /* Once the AI has written the deck it IS the content: the front is the picture
       and the word, the BACK is the child's own talking turn (with the action the
       2-5 card asks for), because a back that is only a meaning teaches recognition
       instead of speaking. */
    const rounds: LessonActivity[] = [];
    for (let i = 0; i < deckCards.length; i += 6) {
      const slice = deckCards.slice(i, i + 6);
      rounds.push({
        id: `cards-${i / 6 + 1}`,
        type: 'flashcardTrainer',
        prompt: rounds.length ? '🃏 Next cards — say each one, then turn it' : '🃏 Say the word, then turn the card',
        pairs: slice.map((c) => ({ left: card(c.emoji, c.word), right: backOfCard(c) })),
        points: 20,
        heroEmoji: '🃏',
        mascotTip: 'Say the word first, then let the child turn the card and say the line back.',
        feedbackCorrect: 'Deck finished! 🏆',
      } as LessonActivity);
    }
    return rounds;
  }
  const words = lesson.words || [];
  if (words.length) {
    /* One round per six cards, so a long deck becomes a class-sized set rather
       than a single screen with thirty cards on it. */
    const rounds: LessonActivity[] = [];
    for (let i = 0; i < words.length; i += 6) {
      const slice = words.slice(i, i + 6);
      rounds.push({
        id: `cards-${i / 6 + 1}`,
        type: 'flashcardTrainer',
        prompt: rounds.length ? '🃏 Next cards — say each one, then turn it' : '🃏 Say the word, then turn the card',
        pairs: slice.map((w) => ({
          left: card(w.emoji, w.word),
          right: clean(w.meaning) || clean(w.example) || 'say it out loud together',
        })),
        points: 20,
        heroEmoji: '🃏',
        mascotTip: 'Say the word first, then let the child turn the card and say it back.',
        feedbackCorrect: 'Deck finished! 🏆',
      } as LessonActivity);
    }
    return rounds;
  }
  /* No words: the game's own items become the cards. */
  const items = lesson.game?.items || [];
  if (items.length) {
    return [{
      id: 'cards-1',
      type: 'flashcardTrainer',
      prompt: '🃏 Say the word, then turn the card',
      pairs: items.map((it) => ({ left: card(it.picture, clean(it.prompt) || it.answer), right: it.answer })),
      points: 20,
      heroEmoji: '🃏',
      feedbackCorrect: 'Deck finished! 🏆',
    } as LessonActivity];
  }
  return [firstRound('cards-1', 'flashcardTrainer', '🃏 Write the cards with the AI prompt first')];
}

/* ── Memory: a face-down grid, word against picture ─────────────────────── */

function memoryRounds(lesson: KidLesson): LessonActivity[] {
  const words = (lesson.words || []).filter((w) => w.emoji);
  if (!words.length) return [firstRound('pairs-1', 'memoryMatch', '🧠 Add words with pictures to build the grid')];
  const rounds: LessonActivity[] = [];
  for (let i = 0; i < words.length; i += 6) {
    const slice = words.slice(i, i + 6);
    rounds.push({
      id: `pairs-${i / 6 + 1}`,
      type: 'memoryMatch',
      prompt: '🧠 Turn two cards — find the word and its picture',
      pairs: slice.map((w) => ({ left: w.word, right: w.emoji as string })),
      points: 40,
      heroEmoji: '🧠',
      mascotTip: 'Say every card aloud as it turns — the naming is what makes it stick.',
      feedbackCorrect: 'Great memory! 🎉',
    } as LessonActivity);
  }
  return rounds;
}

/* ── A quiz: the lesson's own questions, one round each ─────────────────── */

function quizRounds(lesson: KidLesson, engine: ActivityType, listen: boolean): LessonActivity[] {
  const items = (lesson.game?.items || []).filter((it) => clean(it.prompt) && clean(it.answer));
  if (!items.length) return [firstRound('q-1', engine, '❓ Add the questions with the AI prompt first')];
  return items.map((it, i) => {
    const options = [it.answer, ...(it.distractors || [])].filter(Boolean);
    return {
      id: `q-${i + 1}`,
      type: engine,
      prompt: it.prompt,
      ...(listen ? { readAloudText: it.answer } : {}),
      options,
      correct: it.answer,
      points: listen ? 0 : 10,
      heroEmoji: it.picture || '❓',
      /* The sentence lives INSIDE the engine's own “Yes!”: a right tap that ends in a
         tap teaches pointing, and the same tap that makes the child say the whole
         answer is a spoken turn. */
      feedbackCorrect: it.childSays ? `Yes! 🎉 Say it: “${it.childSays}”` : 'Yes! 🎉',
      feedbackIncorrect: 'Nearly — try again 💛',
    } as LessonActivity;
  });
}

/* ── The arcade: correct answer floats in a bunch of balloons ───────────── */

function arcadeRounds(lesson: KidLesson): LessonActivity[] {
  const items = (lesson.game?.items || []).filter((it) => clean(it.answer));
  if (!items.length) return [firstRound('pop-1', 'balloonPop', '🎈 Add words and pictures to build the round')];
  return items.map((it, i) => ({
    id: `pop-${i + 1}`,
    type: 'balloonPop' as ActivityType,
    prompt: `🎈 Pop ${it.answer}!`,
    word: card(it.picture, it.answer),
    options: [card(it.picture, it.answer), ...(it.distractors || [])],
    points: 0,
    heroEmoji: '🎈',
    mascotTip: 'Say the word, then point with the child the first time.',
    feedbackCorrect: 'POP! 🎉',
    feedbackIncorrect: 'Not that one — look again 💛',
  } as LessonActivity));
}

/* ── The board game: a task per square, no loser ────────────────────────── */

function boardRounds(lesson: KidLesson): LessonActivity[] {
  const words = (lesson.words || []).map((w) => clean(w.word)).filter(Boolean);
  const tasks: string[] = [];
  words.slice(0, 5).forEach((w) => {
    tasks.push(`Say “${w}” three times`);
    tasks.push(`Act out “${w}”`);
  });
  (lesson.game?.items || []).slice(0, 2).forEach((it) => tasks.push(clean(it.prompt)));
  if (!tasks.length) tasks.push('Say a word you learned today', 'Make a sentence with it');
  tasks.push('Ask the other player a question', 'Everyone claps — both counters finish!');
  return [{
    id: 'board-1',
    type: 'spinWheel',
    prompt: '🎲 Spin and do the task on the square',
    options: tasks,
    points: 20,
    heroEmoji: '🎲',
    feedbackCorrect: 'Great turn! ⭐',
  } as LessonActivity];
}

/* ── Role play: the lines, said out loud ────────────────────────────────── */

function rolePlayRounds(lesson: KidLesson): LessonActivity[] {
  const items = (lesson.game?.items || []).filter((it) => clean(it.prompt) || clean(it.answer));
  if (items.length) {
    return items.map((it, i) => ({
      id: `say-${i + 1}`,
      type: 'speakRepeat' as ActivityType,
      prompt: clean(it.prompt) || `🎭 Say your line!`,
      readAloudText: clean(it.answer) || clean(it.prompt),
      characterEmoji: it.picture || '🎭',
      points: 0,
      feedbackCorrect: 'You said it! 🎉',
      feedbackIncorrect: 'Try it once more — you are nearly there 💛',
    } as LessonActivity));
  }
  const words = (lesson.words || []).map((w) => clean(w.word)).filter(Boolean);
  return [{
    id: 'say-1',
    type: 'speakRepeat',
    prompt: '🎭 Say your line, then let me answer',
    readAloudText: words.join(' and ') || 'hello!',
    characterEmoji: '🎭',
    points: 0,
    feedbackCorrect: 'Good acting! 🎉',
  } as LessonActivity];
}

/* ── The hunt: real things to find in the room ──────────────────────────── */

function huntRounds(lesson: KidLesson): LessonActivity[] {
  const checklist = (lesson.words || [])
    .slice(0, 6)
    .map((w) => `Find something that is ${clean(w.word)}`)
    .filter((line) => line.trim().length > 9);
  if (!checklist.length) {
    checklist.push('Find something blue 💙', 'Find something soft', 'Find something small');
  }
  const items = lesson.game?.items || [];
  items.slice(0, 3).forEach((it) => { if (clean(it.prompt)) checklist.push(clean(it.prompt)); });
  return [{
    id: 'hunt-1',
    type: 'realLifeMission',
    prompt: '🔎 Find it in the room!',
    checklist,
    roleplayPrompt: 'Now the child gives YOU something to find — and you go and find it!',
    points: 15,
    feedbackCorrect: 'You found everything! 🎉',
  } as LessonActivity];
}

/* ── Move & Do: the commands become the live game the child plays ──────── */

function movementRounds(lesson: KidLesson): LessonActivity[] {
  const movement = lesson.movement;
  /* The ladder first; if the AI only gave words, the words ARE the commands — every
     word in a TPR lesson is an action, which is the whole point of the kind. */
  const commands = movement?.commands?.length
    ? movement.commands
    : (lesson.words || []).map((w) => ({ command: clean(w.word), emoji: w.emoji, do: clean(w.sayAloud) || undefined }));
  const checklist = commands
    .slice(0, 8)
    .map((c) => `${clean(c.do) || `Say “${clean(c.command)}” and do it`}${c.emoji ? ` ${c.emoji}` : ''}`.trim())
    .filter((line) => line.length > 3);
  const bossRound = (movement?.bossRound || []).map((c) => clean(c)).filter(Boolean);
  if (!checklist.length) {
    return [firstRound('move-1', 'realLifeMission', '🤸 Add the commands with the AI prompt first')];
  }
  return [{
    id: 'move-1',
    type: 'realLifeMission',
    prompt: '🤸 Do what I say — then YOU are the boss',
    checklist,
    roleplayPrompt: bossRound.length
      ? `Now the child gives the orders: ${bossRound.join(' · ')} — and you do every one.`
      : 'Now the child gives YOU a command — and you do it!',
    points: 0,
    heroEmoji: '🤸',
    mascotTip: 'Say each command twice and do it big. Never correct — just do it again.',
    feedbackCorrect: 'You did everything! 🎉',
  } as LessonActivity];
}

/* ── Routines: the three real moments become the live checklist ─────────── */

function routineRounds(lesson: KidLesson): LessonActivity[] {
  const routine = lesson.routine;
  /* Each real moment is one tick, carrying the exact English the grown-up says —
     because the game IS the routine, done for real rather than about the routine. */
  const checklist = (routine?.moments || [])
    .map((m) => `${clean(m.say) || `Say “${clean(m.moment)}” and do it together`}${m.emoji ? ` ${m.emoji}` : ''}`.trim())
    .filter((line) => line.length > 3);
  /* A routine with no script still has its phases, and the phases are the moments. */
  if (!checklist.length) {
    (lesson.steps || []).map((s) => clean(s.name)).filter(Boolean).slice(0, 4).forEach((n) => checklist.push(n));
  }
  if (!checklist.length) {
    return [firstRound('routine-1', 'realLifeMission', '🚿 Add the routine moments with the AI prompt first')];
  }
  return [{
    id: 'routine-1',
    type: 'realLifeMission',
    prompt: '🚿 Do the whole routine — you say it, they do it',
    checklist,
    roleplayPrompt: routine?.fillIn
      ? `Now the child runs the routine for the teddy. Say the first half and let them finish it: “${clean(routine.fillIn)}”`
      : 'Now the child runs the routine for the teddy — and you do every step.',
    points: 0,
    heroEmoji: '🚿',
    mascotTip: 'Say the same words in the same order every time. Never correct — just say it again with the action.',
    feedbackCorrect: 'The whole routine, done! 🎉',
  } as LessonActivity];
}

/* ── Circle time: the whole ritual becomes the checklist, in its fixed order ──
   The circle is a ritual, so the round IS the ritual, in the order it always runs:
   the hello, the pictures, the wait, the surprise, the goodbye. Every tick is
   something that gets SAID — that is the whole point of the kind — and the wait line
   is in there because it is the one line a pre-reader can finish without being asked
   anything at all. */
function circleRounds(lesson: KidLesson): LessonActivity[] {
  const circle = lesson.circle;
  const checklist: string[] = [];

  if (circle?.hello?.length) {
    checklist.push(`👋 The hello song, together: ${circle.hello.map((l) => `“${clean(l)}”`).join(' ')}`);
  }
  (circle?.check || []).forEach((c) => {
    const said = clean(c.childSays);
    checklist.push(
      `${c.emoji ? `${c.emoji} ` : ''}${clean(c.look)}${said ? ` — point at the picture and say “${said}”` : ' — point at the picture and say the word back'}`,
    );
  });
  (circle?.ask || []).forEach((q) => {
    checklist.push(`🗣 You ask me: “${clean(q)}” — and we both answer in a whole sentence`);
  });
  if (clean(circle?.waitLine)) checklist.push(`🪄 Everyone together: “${clean(circle?.waitLine)}” — say the last word with me`);
  if (clean(circle?.surprise)) checklist.push(`🎁 The surprise is “${clean(circle?.surprise)}” — say it three times, then find it in the room`);
  if (circle?.goodbye?.length) {
    checklist.push(`👋 The goodbye song, together: ${circle.goodbye.map((l) => `“${clean(l)}”`).join(' ')}`);
  }
  if (clean(circle?.nextTime)) checklist.push(`🗓 One sentence before we finish: “${clean(circle?.nextTime)}”`);

  const ticks = checklist.map((l) => l.trim()).filter((line) => line.length > 3);
  /* A circle with nothing written down still has its four steps, and the steps are
     the ritual — so the round falls back to them rather than to an empty screen. */
  if (!ticks.length) {
    (lesson.steps || []).map((s) => clean(s.name)).filter(Boolean).slice(0, 6).forEach((n) => ticks.push(n));
  }
  if (!ticks.length) {
    return [firstRound('circle-1', 'realLifeMission', '🔄 Add the hello, the check-in and the surprise with the AI prompt first')];
  }

  const surprise = clean(circle?.surprise);
  return [{
    id: 'circle-1',
    type: 'realLifeMission',
    prompt: '🔄 Run the WHOLE circle — the same order, every week',
    checklist: ticks,
    roleplayPrompt: surprise
      ? `Now the child runs the circle for a toy: they sing the hello, hold up the pictures, open the box and say “${surprise}” — and you point at the pictures and answer.`
      : 'Now the child runs the whole circle for a toy — and you do every part they give you.',
    readAloudText: clean(circle?.waitLine) || surprise || undefined,
    points: 0,
    heroEmoji: '🔄',
    mascotTip: 'The same words in the same order every week IS the lesson. If the child says only the last word of a line, that word is a win.',
    feedbackCorrect: 'The whole circle, run by the child! 🎉',
  } as LessonActivity];
}

/* ── TPR-Storytelling: every beat of the story becomes one live tick ────── */

function storyWalkRounds(lesson: KidLesson): LessonActivity[] {
  const walk = lesson.storyWalk;
  /* Each beat is one tick carrying the sentence the tutor tells AND the action the
     child does on it, because in this kind the action IS the comprehension — if the
     child does it, they heard the sentence, and the checklist is the story. */
  const beats = (walk?.beats || []).map((b) => {
    const line = clean(b.line);
    const action = clean(b.action);
    if (!line) return '';
    const said = b.say ? ` 🗣 “${clean(b.say)}”` : '';
    const done = action && action !== line ? ` — ${action}` : '';
    return `${line}${done}${said}${b.emoji ? ` ${b.emoji}` : ''}`.trim();
  }).filter((line) => line.length > 3);

  if (!beats.length) {
    return [firstRound('story-walk-1', 'realLifeMission', '🤸 Add the story beats with the AI prompt first')];
  }

  const echo = clean(walk?.echo);
  /* The roleplay turn is where the child takes the story over: the choice beat the
     AI wrote if there is one, otherwise the map, otherwise the story itself. */
  const roleplayPrompt = walk?.choose
    ? `Now the child decides: ${clean(walk.choose)} — they say it and you do it. Then they walk the whole story back for you.`
    : walk?.map?.length
      ? 'Now the child walks the story back on their own — the pictures in order, the actions one after another, and you follow.'
      : 'Now the child tells the story back with their body — you follow them instead of leading.';

  return [{
    id: 'story-walk-1',
    type: 'realLifeMission',
    prompt: '🤸 Walk the story — you tell it, they do it',
    checklist: beats,
    roleplayPrompt,
    readAloudText: echo || undefined,
    points: 0,
    heroEmoji: '🤸',
    mascotTip: echo
      ? `Say “${echo}” every time it comes around and let the child join in first — the echo is where their talking starts.`
      : 'Say the sentence, do the action, and let the child copy. Never correct — just do it again.',
    feedbackCorrect: 'The whole story, walked! 🎉',
  } as LessonActivity];
}

/* ── The story path: the quiz's questions become the forks ──────────────── */

function adventureRounds(lesson: KidLesson): LessonActivity[] {
  const items = (lesson.game?.items || []).filter((it) => clean(it.prompt) && clean(it.answer));
  if (!items.length) {
    return [{
      id: 'path-1',
      type: 'storyChoice',
      prompt: 'The door is locked. What do you do?',
      storyChoices: [
        { choice: '🔑 Look for a key', outcome: 'A key is under the mat!', nextPlot: 'The door swings open.', best: true, bonusXp: 20 },
        { choice: '🔔 Knock loudly', outcome: 'Someone answers far away.', nextPlot: 'You wait a moment.', bonusXp: 10 },
      ],
      points: 25,
      heroEmoji: '🗺️',
      feedbackCorrect: 'What a choice! 🌟',
    } as LessonActivity];
  }
  return items.map((it, i) => ({
    id: `path-${i + 1}`,
    type: 'storyChoice' as ActivityType,
    prompt: clean(it.prompt),
    storyChoices: [
      { choice: clean(it.answer), outcome: 'That is the way on!', nextPlot: 'The story keeps going.', best: true, bonusXp: 20 },
      ...(it.distractors || []).slice(0, 1).map((d) => ({ choice: clean(d), outcome: 'That path is closed…', nextPlot: 'Try the other one.', bonusXp: 5 })),
    ],
    points: 25,
    heroEmoji: it.picture || '🗺️',
    feedbackCorrect: 'Brave choice! 🌟',
  } as LessonActivity));
}

/* ── The song: the words on screen, in time ─────────────────────────────── */

function songRounds(lesson: KidLesson): LessonActivity[] {
  const lyrics = (lesson.lyrics || []).map((line) => clean(line)).filter(Boolean);
  if (lyrics.length) {
    return [{
      id: 'song-1',
      type: 'songKaraoke',
      prompt: `🎵 ${clean(lesson.title) || 'Our song'}`,
      lyrics,
      singAlongPacing: lesson.band === 'veryYoung' ? 2000 : 1500,
      points: 0,
      heroEmoji: '🎵',
      feedbackCorrect: 'Beautiful singing! 🌟',
    } as LessonActivity];
  }
  const words = (lesson.words || []).map((w) => clean(w.word)).filter(Boolean);
  return [{
    id: 'song-1',
    type: 'songKaraoke',
    prompt: '🎵 Sing the words of the lesson',
    lyrics: words.length ? words.map((w) => `${w}, ${w}, sing it with me 🎵`) : ['Hello, hello, hello 🎵', 'Sing it back to me 👋'],
    singAlongPacing: 1600,
    points: 0,
    heroEmoji: '🎵',
    feedbackCorrect: 'Beautiful singing! 🌟',
  } as LessonActivity];
}

/* ── Phonics for the readers: build the word from its letters ───────────── */

function spellingRounds(lesson: KidLesson): LessonActivity[] {
  /* Phonics names the words that carry the pattern, and those are the ones to build. */
  const source = lesson.phonics?.realWords?.length
    ? lesson.phonics.realWords
    : (lesson.words || []).map((w) => w.word);
  const items = source.map((w) => clean(w)).filter((w) => /^[a-zA-Z-]{2,}$/.test(w));
  if (!items.length) return [firstRound('spell-1', 'spellingBee', '🐝 Add the words to build with the AI prompt')];
  const rounds: LessonActivity[] = [];
  for (let i = 0; i < items.length; i += 4) {
    rounds.push({
      id: `spell-${i / 4 + 1}`,
      type: 'spellingBee',
      prompt: '🐝 Build the word you hear',
      items: items.slice(i, i + 4),
      distractorLetters: ['o', 'e', 'y'],
      points: 40,
      heroEmoji: '🐝',
      feedbackCorrect: 'Perfect spelling! 🏆',
      feedbackIncorrect: 'Listen again and try the letters in order.',
    } as LessonActivity);
  }
  return rounds;
}

/* ── The letters themselves, for a child who cannot read yet ────────────── */

function letterRounds(lesson: KidLesson): LessonActivity[] {
  const named = lesson.words || [];
  /* Phonics brings its own list, and those are the words that actually carry the sound
     — so the letter cards come from them rather than from every word on the page. The
     emoji is looked up from the lesson's own words so the card still has a picture. */
  const phonicsWords = (lesson.phonics?.realWords || []).map((w) => clean(w)).filter(Boolean);
  const emojiFor = new Map(named.map((w) => [clean(w.word).toLowerCase(), w.emoji]));
  const cards = (phonicsWords.length ? phonicsWords : named.map((w) => w.word))
    .slice(0, 6)
    .map((word) => ({ word, emoji: emojiFor.get(word.toLowerCase()) }));
  if (!cards.length) return deckRounds(lesson);
  return [{
    id: 'letters-1',
    type: 'flashcardTrainer',
    prompt: '🔤 Say the letter sound, then turn the card',
    pairs: cards.map((c) => ({
      left: card(c.emoji, c.word.slice(0, 1).toUpperCase()),
      right: `the sound at the start of “${c.word}”`,
    })),
    points: 20,
    heroEmoji: '🔤',
    mascotTip: 'Say the sound, not the letter name — “sss”, not “ess”.',
    feedbackCorrect: 'You know your sounds! 🏆',
  } as LessonActivity];
}

/* ────────────────────────────────────────────────────────────────────────────
   THE SCRIPT
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Turns a finished lesson into the rounds its own engine plays.
 *
 * Returns null for a stage that plays as slides or as paper — those do not need a
 * script, and pretending they do is how the wrong player ends up on screen.
 */
export function stageScriptFor(lesson: KidLesson): { engine: ActivityType; script: import('./kidGameCatalog').KidGameScript } | null {
  const binding = stageForLesson(lesson.kind);
  /* Engine stages and drill-in-deck kinds both need a script; a pure slide or paper
     lesson does not, and handing it one is how the wrong player ends up on screen. */
  if (binding.stage !== 'engine' && !binding.drill) return null;
  /* The band's own player wins over the kind's default — see `engineForBand`. */
  const band: KidAgeBand = lesson.band === 'veryYoung' ? 'veryYoung' : 'young';
  const engineForBand = binding.engineForBand?.[band] || binding.engine;

  const rounds = ((): LessonActivity[] => {
    switch (lesson.kind) {
      case 'flashcards':
        return deckRounds(lesson);
      case 'phonicsLesson':
        /* A pre-reader gets the letter cards; a reader builds the word. */
        return band === 'veryYoung' ? letterRounds(lesson) : spellingRounds(lesson);
      case 'movementLesson':
        return movementRounds(lesson);
      case 'routineLesson':
        return routineRounds(lesson);
      case 'circleTime':
        return circleRounds(lesson);
      case 'tprStory':
        return storyWalkRounds(lesson);
      case 'memoryMatch':
        return memoryRounds(lesson);
      case 'pictureQuiz':
        return quizRounds(lesson, 'multipleChoice', false);
      case 'arcadeGame':
        return arcadeRounds(lesson);
      case 'boardGame':
        return boardRounds(lesson);
      case 'rolePlay':
        return rolePlayRounds(lesson);
      case 'scavengerHunt':
        return huntRounds(lesson);
      case 'storyAdventure':
        return adventureRounds(lesson);
      case 'listeningSong':
        return songRounds(lesson);
      default:
        return quizRounds(lesson, 'multipleChoice', false);
    }
  })();

  /* The engine is decided by the ROUND, not by the binding, so a band that swaps
     its own player (phonics letters vs phonics spelling) still gets a consistent
     label on the projector bar. */
  const engine = (rounds[0]?.type || engineForBand || 'multipleChoice') as ActivityType;

  return {
    engine,
    script: {
      title: clean(lesson.title) || 'Our lesson',
      gameId: `lesson-${clean(lesson.kind) || 'stage'}`,
      band,
      /* The projector bar prints the lesson name and then this line, so it has to say
         something the title does not: which STAGE of the Lesson Creator is running. */
      topic: kindById(clean(lesson.kind))?.label || 'Lesson Creator stage',
      howToPlay: lesson.game?.howToPlay || binding.opens,
      plenary: (lesson.objectives || []).slice(0, 2).length
        ? (lesson.objectives as string[]).slice(0, 2).map((o) => `You can now: ${o}`)
        : [rounds.length > 1 ? 'You did every round! 🎉' : 'You did it! 🎉'],
      rounds,
    },
  };
}

/**
 * The tile-shaped game the projector stage wants for its header.
 *
 * `KidGameStage` reads only the label, the emoji and the no-screen fallback off
 * this, so a lesson being played through an engine still says the LESSON's name
 * on screen rather than a game's.
 */
export function stageGameFor(lesson: KidLesson, kindId?: string): KidGame {
  const band: KidAgeBand = lesson.band === 'veryYoung' ? 'veryYoung' : 'young';
  const binding = stageForLesson(kindId || lesson.kind);
  const engine = (stageScriptFor({ ...lesson, kind: kindId || lesson.kind })?.engine
    || binding.engineForBand?.[band]
    || binding.engine
    || 'multipleChoice') as ActivityType;
  return {
    id: `lesson-${kindId || lesson.kind || 'stage'}`,
    label: clean(lesson.title) || 'This lesson',
    emoji: '🧩',
    band,
    ages: band === 'veryYoung' ? '2-5' : '5-12',
    engine,
    interaction: binding.opens,
    why: clean(lesson.teacherNote) || 'This stage is the shape this kind of lesson takes.',
    rounds: String((lesson.game?.turns || 6)),
    shape: '',
    noScreen: lesson.game?.offline || 'Do it on paper: the same words, the same order.',
    minutes: Number(lesson.durationMinutes) || 10,
    bandRules: '',
  };
}

/**
 * The drill script for a kind whose engine runs inside a phase, or null.
 *
 * Kept separate from `stageScriptFor` because the callers are different: a full
 * engine stage replaces the whole screen, while a drill is one slide of the deck and
 * only wants the rounds.
 */
export function drillScriptFor(lesson: KidLesson): { engine: ActivityType; script: import('./kidGameCatalog').KidGameScript } | null {
  const binding = stageForLesson(lesson.kind);
  return binding.drill ? stageScriptFor(lesson) : null;
}

/** True when the kind has a stage all of its own rather than the shared deck. */
export const hasOwnStage = (kindId: string): boolean => {
  const binding = stageForLesson(kindId);
  return binding.stage !== 'deck' || !!binding.drill;
};
