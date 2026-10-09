/* ════════════════════════════════════════════════════════════════════════════
   🧩 KIDS LESSON CREATOR — the prompt the tutor copies into an AI
   ════════════════════════════════════════════════════════════════════════════

   One builder, one output: a complete prompt that asks an AI for a lesson for **one
   child**, in the JSON contract `lessonCreatorTypes.ts` reads back.

   Two things are deliberate and worth keeping when this file is edited:

   1. **The age rules are stated as prohibitions.** Models default to an adult or primary
      lesson: printed instructions, a score, a worksheet to write on. For a two-year-old
      those are not "not ideal", they are impossible, so the band block says what the
      child *cannot* be asked to do before it says what to do instead. That ordering is
      what makes the difference show up in the output.

   2. **The output shape is spelled out, key by key.** The paste box checks for these
      keys, so the prompt names them exactly (`words`, `steps`, `game.items`, …) and says
      that unknown extra keys are fine. A model that has to guess the shape returns a
      pretty lesson the parser then has to reject.
   ════════════════════════════════════════════════════════════════════════════ */

import type { Learner, TeacherProfile } from '../types';
import { getAvatarEvolution, getPetEvolution } from '../types';
import {
  DEFAULT_KID_LESSON_CUSTOMIZATION,
  KID_BANDS,
  bandForAge,
  difficultyById,
  energyById,
  type KidAgeBand,
  type KidLessonCustomization,
  type KidLessonKind,
} from './lessonCreatorTypes';
import { sourcesForKind } from './kidLessonMedia';

export interface KidLessonBrief {
  kind: KidLessonKind;
  band: KidAgeBand;
  /** The Step-2 dials: how much support, how much movement, which voice reads it. */
  customization?: KidLessonCustomization;
  /**
   * The tutor's words for what the lesson is about — optional now.
   *
   * The AI asks for the lesson text or PDF itself (see the prompt's first-step
   * block), so the app no longer requires a topic before it will copy a prompt.
   * Kept on the brief for callers that already know it (a tutor typing straight
   * into a chat, an automated builder) — the prompt folds it in when present.
   */
  topic?: string;
  /** Optional: words the tutor insists on, one per line or comma separated. */
  vocabulary?: string;
  /** Optional: the coursebook page, transcript or story the lesson must follow. */
  sourceText?: string;
  /** Optional: anything specific ("she is shy", "baby brother joins us", "no screen day"). */
  notes?: string;
  /** How the child meets the tutor: room, online, or with a parent present. */
  setting?: string;
  /**
   * The tutor picked a band that is not the one this child's age maps to.
   *
   * Worth saying out loud in the prompt: the child block carries an age, and a model given
   * "age 8" plus a lesson stated to be for 2-5 will otherwise split the difference and hand
   * back a watered-down eight-year-old lesson — which is the one thing a tutor asking for
   * the younger band does not want.
   */
  bandChosenDeliberately?: boolean;
}

/**
 * Everything the prompt knows about the child. Short, concrete, and honest about gaps.
 *
 * Shared with the Game Studio prompt on purpose: a game and a lesson for the same child
 * have to know the same things about them, or one of the two will feel generic.
 */
export function learnerSnapshot(learner: Learner | undefined): string {
  if (!learner) {
    return 'No learner profile data was provided — keep the lesson generic and easy to personalise by hand.';
  }
  const avatar = (() => {
    try {
      return getAvatarEvolution(learner.gender, learner.avatarArchetype, learner.xp);
    } catch {
      return undefined;
    }
  })();
  const pet = (() => {
    try {
      return getPetEvolution(learner.petType, learner.petXp ?? 0);
    } catch {
      return undefined;
    }
  })();
  const profile = learner as any;
  const lastSessions = (learner.sessionLogs || [])
    .slice(-4)
    .map((s: any) => [s.date, s.summary || s.topic, s.notes].filter(Boolean).join(' — '))
    .filter(Boolean);
  const strengths = (learner.sessionLogs || [])
    .flatMap((s: any) => (s.strengths || []).map((item: any) => (typeof item === 'string' ? item : item?.text)))
    .filter(Boolean)
    .slice(0, 5);
  const focus = (learner.weaknesses || []).map((w: any) => w?.name).filter(Boolean);
  const skillEntries = Object.entries(learner.skills || {});
  const skills = skillEntries.map(([k, v]) => `${k} ${v}%`);
  const weakest = [...skillEntries]
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .slice(0, 2)
    .map(([k, v]) => `${k} ${v}%`);
  const kingdom = (learner.landItems || [])
    .slice(0, 8)
    .map((item: any) => `${item.emoji || ''} ${item.name || ''}`.trim())
    .filter(Boolean);
  const badges = (learner.badges || []).slice(0, 6).map((b: any) => `${b.icon || '🏅'} ${b.name}`).filter(Boolean);
  const achievements = (learner.achievements || []).slice(-4);
  const quests = [...(learner.currentQuests || []), ...(learner.completedQuests || [])].filter(Boolean);
  const questMaps = (learner.questMaps || []).map((q: any) => q?.title).filter(Boolean);
  const pendingHomework = (learner.homework || []).filter((h: any) => !h.completed).slice(0, 3).map((h: any) => h.title);
  const recentTopics = (learner.lessonHistory || []).slice(-3).map((l: any) => l.topic).filter(Boolean);
  const customSkills = Object.values(profile.customSkillMetas || {})
    .map((m: any) => m?.name)
    .filter(Boolean)
    .slice(0, 6);
  const parentNotes = (learner.parentNotes || []).slice(-2);
  const terms = (learner.terms || []).map((t: any) => t?.name).filter(Boolean);

  const lines = [
    `Name: ${learner.name || 'the learner'}`,        `Age: ${learner.age ?? 'unknown'} years old`,
    learner.country || learner.city ? `From: ${[learner.city, learner.country].filter(Boolean).join(', ')}` : '',
    learner.favoriteSubject ? `Favourite subject: ${learner.favoriteSubject}` : '',
    learner.interests?.length ? `Interests: ${learner.interests.join(', ')}` : '',
    learner.hobbies?.length ? `Hobbies: ${learner.hobbies.join(', ')}` : '',
    learner.learningStyle ? `Learning style: ${learner.learningStyle}` : '',
    learner.nativeLang ? `Native language: ${learner.nativeLang}` : '',
    learner.targetLang ? `Language being learned: ${learner.targetLang}` : 'Language being learned: English',
    learner.targetCEFR ? `Working at about: ${learner.targetCEFR}` : '',
    learner.mood ? `Mood right now: ${learner.mood}` : '',
    avatar
      ? `Their hero in the app: ${avatar.emoji} ${avatar.form} · ${learner.xp} XP${learner.level ? ` · level ${learner.level}` : ''}${learner.streak ? ` · ${learner.streak}-day streak` : ''}${learner.coins ? ` · ${learner.coins} coins` : ''}`
      : '',
    pet ? `Their pet in the app: ${pet.emoji} ${pet.form} · ${learner.petXp ?? 0} pet XP` : '',
    kingdom.length ? `Their kingdom (things they placed on the canvas): ${kingdom.join(', ')}` : '',
    learner.theme ? `Their chosen theme: ${learner.theme}` : '',
    badges.length ? `Badges they are proud of: ${badges.join(', ')}` : '',
    achievements.length ? `Recent achievements: ${achievements.join(', ')}` : '',
    quests.length ? `Quests in progress / done: ${quests.slice(-4).join(', ')}` : '',
    questMaps.length ? `Quest worlds built for them: ${questMaps.slice(0, 3).join(', ')}` : '',
    skills.length ? `Skills tracker: ${skills.join(', ')}` : '',
    weakest.length > 1 ? `Weakest two skills right now: ${weakest.join(', ')}` : '',
    customSkills.length ? `Custom skills tracked: ${customSkills.join(', ')}` : '',
    strengths.length ? `Things they do well: ${strengths.join(', ')}` : '',
    focus.length ? `Things to work on: ${focus.join(', ')}` : '',
    learner.smartGoals?.length ? `Their goals: ${learner.smartGoals.map((g: any) => g?.goal).filter(Boolean).join(', ')}` : '',
    pendingHomework.length ? `Homework still to do: ${pendingHomework.join(', ')}` : '',
    recentTopics.length ? `Recent lesson topics: ${recentTopics.join(', ')}` : '',
    lastSessions.length ? `Recent sessions: ${lastSessions.join(' | ')}` : '',
    learner.parentExpectations?.length ? `What the family asked for: ${learner.parentExpectations.join('; ')}` : '',
    learner.expectations ? `Family expectations: ${learner.expectations}` : '',
    parentNotes.length ? `Recent family notes: ${parentNotes.join(' | ')}` : '',
    terms.length ? `Term: ${terms.join(', ')}` : '',
  ].filter(Boolean);

  return lines.join('\n  ');
}

/** The band block: what the child cannot do, then what to lean on instead. */
export function bandBlock(band: KidAgeBand): string {
  const profile = KID_BANDS[band];
  return `BAND: ${profile.label} (${profile.ages}) — ${profile.tagline}
  · Session shape: ${profile.sessionMinutes}
  · Language load: ${profile.languageLoad}
  · NEVER ask this child to: ${profile.never.join('; ')}.
  · Build it instead on: ${profile.leansOn.join('; ')}.`;
}

/** The Step-2 dials, as prompt text. */
export function customizationBlock(customization?: KidLessonCustomization): string {
  const dials = customization || DEFAULT_KID_LESSON_CUSTOMIZATION;
  return [difficultyById(dials.difficulty).prompt, energyById(dials.energy).prompt].join('\n  ');
}

/**
 * The session block: 30 minutes, six phases, and a length that cannot collapse.
 *
 * The complaint this answers is always the same one: the lesson was lovely and it was
 * over in eight minutes, and the tutor had a paid hour to fill. So the block demands
 * three things a "list of activities" never has — a MINUTE FLOOR per phase (a phase
 * cannot end just because the child was quick), a TALK TARGET per phase (the child owes
 * the session a number of spoken turns), and a RESERVE bank per phase (going fast makes
 * the lesson deeper, not shorter). It also asks for the real scene, the real-world
 * mission, the clock, the exit ticket and the next session's hook, because those are
 * what make a session feel like a real class rather than a set of screens.
 */
export function sessionBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `THE SESSION — A FULL 30 MINUTES IN SIX PHASES, WHICH CANNOT FINISH EARLY
  The tutor is paid for a session, not for a worksheet, so this lesson has to fill
  ${under ? 'THIRTY MINUTES as short blocks — never one long sit' : 'THIRTY MINUTES'},
  and it must not be over in eight minutes because the child was quick.

  Write "steps" as SIX named phases that add up to 30 minutes, in this order:
    HOOK (3 min) · WARM-UP TALK (4 min) · INPUT (6 min) · GUIDED TALK (6 min) · FREE PRODUCTION (7 min) · WRAP (4 min)

  EVERY phase object carries the run-sheet fields:
    "phase": the phase name above
    "minutes": what it really takes
    "floorMinutes": the minute FLOOR — the phase is not finished before this, even if the child is flying
    "talkTarget": how many times the CHILD says something out loud in this phase (whole session: ${under ? '25+' : '40+'} spoken turns, ${under ? 'where one word, a sound or a point with the word all count' : 'full sentences wherever the child can manage them'})
    "sayFrame": a sentence frame the child completes out loud ("I like ___ because ___.")
    "questionLadder": THREE questions the tutor can always ask — easy, then why, then imagine
    "reserve": THREE more things to do in this phase if it finishes early. Going fast makes the lesson deeper; it never ends it.
    "teacherScript" and "childAction" as usual.

  ${under
      ? 'For 2-5 each phase is broken into 2-4 minute blocks with a movement break between them. The child is never asked to sit still through a phase, never reads and never writes.'
      : 'For 5-12 at least half of every phase is the CHILD talking — describing, guessing, deciding, telling. The tutor models once, then stops and the child produces.'}

  Also give the session its scene, its real-world ending and its clock, as top-level fields:
    "scene": { "title", "photoQuery", "clipTitle", "clipUrl", "listenFor" } — ONE real photograph to look at together and ONE short real clip that carries a listening job, not just something to watch.
    "mission": { "title", "realWorld", "sayIt", "steps" } — a real thing the child does before the session ends (order a pizza, pack the bag, ask a real question at home) and the EXACT sentence they must produce to complete it.
    "run": { "targetMinutes": 30, "brainBreaks": [three short resets], "exitTicket": [three sentences the child can now say], "nextTime": one line — where the next session starts, so this one is not a dead end }
    "talkGoal": the total number of spoken turns the session owes.

  The floors are the point. If a phase is under its floor, use its "reserve" — never move on early, and never cut the WRAP.`;
}

/**
 * The kinds whose spine is a story.
 *
 * Only these get the story block. A flashcards deck asking for a five-part story with
 * a retelling ladder would be noise, and noise in a prompt is how the model starts
 * ignoring the parts that matter.
 */
export const KID_STORY_KINDS = ['storyLesson', 'storyWorld', 'videoStory', 'storyAdventure'];

/**
 * The story block: the story, the map, the retelling ladder and the hot-seat.
 *
 * A story lesson has one failure mode and it is always the same one: the tutor reads
 * for twenty minutes and the child says four words. The fix is not "ask more
 * questions" — it is structure. So the block demands four things:
 *
 *   pages    — the story itself, small enough to tell rather than read.
 *   map      — character, setting, problem, feeling, ending. Every retell a child
 *              gives is assembled out of these five, so naming them makes the retell
 *              possible even for a child who has never retold anything.
 *   rungs    — the SAME story back, three times, with less help each time. One
 *              reading gives one retell; the ladder gives three, and the third one is
 *              the child producing language with no support at all.
 *   roleplay — hot-seating: the tutor is in role and the CHILD does the asking.
 *              Comprehension becomes speech the moment the child has a reason to talk.
 *
 * Plus a real paired read-aloud, because a child should hear a story told by someone
 * whose whole job is telling stories.
 */
export function storyBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `THE STORY — THIS LESSON IS THE STORY, SO BUILD THE STORY FIRST
  Write the story as an ORIGINAL story about THIS child's own hero, pet and interests
  (they are in the profile above). Do not retell a famous fairy tale — a story about
  their own unicorn is one they will retell at home without being asked.

  Return it as a "story" object with four parts:

  "pages": ${under ? '4-6' : '8-12'} story pages, told aloud by the tutor, one entry each:
    { "text": one sentence${under ? ' of 4-6 words, with ONE repeated line the child can join in on every time it comes back ("Quack! Not yet!")' : ' or two, using the target words naturally'}, "emoji": one big picture, "speaker": who says it, when a character speaks }

  "map": the five things every retell is built from — fill all five:
    { "character", "setting", "problem", "feeling", "ending" }
    ${under ? 'Keep each one to two or three words (“the sleepy duck”, “by the pond”, “she wanted a friend”, “lonely”, “they splashed together”).' : 'One short phrase each, in the child\'s own words rather than yours.'}

  "rungs": EXACTLY THREE retells of the SAME story, each with LESS help than the last:
    1. { "with": "the pages and the words", "prompt": how you hand the story over with the text still on screen, "talkTarget": ${under ? '3' : '5'} }
    2. { "with": "the pictures only", "prompt": how you hand it over with the words hidden, "talkTarget": ${under ? '3' : '6'} }
    3. { "with": "from memory, with the story map", "prompt": how you hand it over with everything hidden, "talkTarget": ${under ? '2' : '6'} }
    Every rung prompt must tell the child what to say first, in the child's own words (${under ? '"Tell me what the duck did. Start with: Duck went…"' : '"Start with: First… then… at the end…"'}).

  "roleplay": hot-seating — YOU go into role as a character and the CHILD interviews you:
    { "character": the character you will be, "emoji": its picture,
      "questions": ${under ? '2-3' : '3-4'} questions THE CHILD asks you in role (write them as the child would say them, "Duck, why were you sad?"),
      "lines": 2 short lines the child can voice in role, if they want a script at first }

  "pairedBook": ONE real, free, read-aloud picture book for the class warm-up and the
    family at home: { "title", "url", "source", "why" }. Use Storyline Online (actors
    reading real picture books), Oxford Owl's free ebooks, or the British Council's
    stories — stories from 2026-live pages only, and a search page if you are not certain.

  And shape the six phases of the run sheet around the story:
    HOOK & PREDICT (3 min) — show the cover picture and ask what will happen. The child guesses FIRST; nothing is read yet.
    PRE-TEACH (4 min) — the ${under ? 'one or two' : 'three'} words the story needs, with their pictures.
    TELL (7 min) — tell the story, page by page. The tutor tells it; the child is not reading it.
    RETELL (6 min) — rungs 1, 2 and 3. This is where the talking happens.
    EXTEND (6 min) — hot-seating, plus the child changes the ending, or acts out one page.
    WRAP (4 min) — the child retells three sentences, and you name how the character felt.
  ${under ? 'For 2-5 every phase is broken into 1-2 minute page turns — the child joins a repeated line and does an action on every page, and never reads or writes anything.' : ''}`;
}

/**
 * The kinds whose spine is one sound and its ladder.
 *
 * Only these get the phonics block. A story lesson asked for minimal pairs and a
 * dictation would be noise, and noise in a prompt is how the model starts ignoring
 * the parts that matter.
 */
export const KID_PHONICS_KINDS = ['phonicsLesson'];

/**
 * Only these get the Move & Do block — see `movementBlock`.
 */
export const KID_MOVEMENT_KINDS = ['movementLesson'];

/**
 * Only these get the Routines & Words block — see `routineBlock`.
 */
export const KID_ROUTINE_KINDS = ['routineLesson'];

/**
 * The phonics block: the sound, the ladder, the pairs, the made-up words, the
 * dictation and the decodable story.
 *
 * Phonics is the one kind of lesson with a canonical order — hear it, say it, find it,
 * blend it, read it, spell it, write it — and skipping a rung is how a child ends up
 * memorising shapes instead of decoding. So the ladder is structured rather than left
 * to the prose of a step, and each rung carries the number of times the child speaks.
 *
 * Three things here are what a generic vocabulary lesson cannot do:
 *   "minimalPairs"  — cat/bat. The child has to HEAR the difference before they can
 *                     ever read it, and a pair is the only fair way to test hearing:
 *                     the picture cannot give the answer away.
 *   "nonsenseWords" — "zat", "dat". A real word can be read from memory; a made-up one
 *                     can only be read by decoding. It is the single most useful
 *                     diagnostic in early reading and it costs one line of content.
 *   "mouth"         — where the tongue and lips go. A sound the child cannot see is a
 *                     sound they cannot copy.
 *
 * And it ends with a "decodable" mini-story: the ONE thing a word list cannot prove.
 * A list shows recognition; a story built purely from the sound shows reading — and
 * reading it aloud then telling it back is the biggest talking lever the kind has.
 */
export function phonicsBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `THE SOUND — THIS LESSON IS ONE SOUND AND ITS LADDER
  Return a "phonics" object. It is not decoration: it is the lesson's spine, and the
  six phases below move down it in order.

    "sound": ${under ? 'ONE sound only, written as a sound and not a letter name — "/d/"' : 'ONE sound or spelling pattern — "/d/", "-at", "sh"'}.
    "inWords": the ${under ? '4-5' : '5-6'} words the child ALREADY knows that carry it.
    "minimalPairs": ${under ? '2-3' : '3-4'} pairs of words that differ by ONE sound only —
      { "a": "cat", "b": "bat", "emojiA": "🐈", "emojiB": "🦇" }. These test HEARING:
      the child must say which of the two they heard, with nothing to peek at.
    "realWords": ${under ? '4' : '6'} words built from the sound, in order from easiest to hardest.
    "nonsenseWords": ${under
      ? 'leave this OUT entirely — a pre-reader cannot read, so printing made-up words at this age teaches nothing and confuses the grown-up'
      : 'EXACTLY 2-3 made-up words that decode from the pattern (zat, dat, lat). They must be readable by sounding out, must not be a real word, and must not mean anything rude or silly in another language. A real word can be read from memory; a made-up one can only be read by decoding — which is why these are the honest test, and why they are never a trick.'}
    "ladder": EXACTLY SEVEN rungs, in this order, never reordered:
      hear it · say it · find it · blend it · read it · spell it · write it
      Each rung is { "step", "what": what actually happens in the tutor's words, "talkTarget": how many times the CHILD speaks on that rung }.
      ${under
        ? 'At 2-5 there is no reading and no writing, so the last four rungs become listen-and-move rungs instead (chant it · move it · hear the difference · story time). Nothing on the ladder is ever read or written by the child.'
        : 'Blending comes before reading, and reading comes before spelling — a child who is shown the word first is recognising, not decoding.'}
    "mouth": where the tongue and lips go, in words a child can follow ("tongue up behind your top teeth, then let it go").
    "dictation": ${under ? 'leave this OUT — nothing is written at this age' : 'EXACTLY 3 words the child writes down from hearing them'}, and "answerKey": the same words, for the tutor to mark with.
    "decodable": the mini-story the child meets at the END, built ONLY from the sound just taught:
      ${under
        ? '{ "title", "lines": 4-5 very short lines the GROWN-UP reads aloud, with ONE repeated sound line the child joins in on every time it comes back ("dig, dig, dig!"), "retell": what the child tells you afterwards, "talkTarget" }'
        : '{ "title", "lines": 5-6 short sentences that use nothing but this family plus the heart-words you list, "trickyWords": EVERY word in the story the sound cannot decode ("the", "is", "on", "and"), "retell": what the child says after reading it, "talkTarget" }'}
      The story is decodable only if nothing in it is a surprise: every word is either
      built from the sound or named in "trickyWords" so the tutor says it first. Slip in an
      unlisted word and the child stops reading and starts guessing.

  Then shape the six phases down the ladder:
    HOOK (3 min) — HEAR IT: the sound on its own, three times, ${under ? 'with the mouth position shown — nothing is printed yet' : 'before any print appears'}.
    WARM-UP TALK (4 min) — SAY IT: the mouth position, then the minimal pairs. You say one word; the child says which one they heard.
    INPUT (6 min) — FIND IT: the pattern inside the words, changing ONE thing at a time.
    GUIDED TALK (6 min) — BLEND IT, then READ IT: blend aloud first, then the real words, then the made-up ones.
    FREE PRODUCTION (7 min) — THE DRILL: this phase is the build-the-word engine, so mark it "drill": true. It opens the word builder on screen instead of a text slide, and closing it comes back to this same phase.
    WRAP (4 min) — WRITE IT: ${under ? 'no writing at this age — say the words back and read the story together instead' : 'the dictation'}, then the decodable story read aloud, then what the child can do now.
  ${under ? 'For 2-5 every phase is broken into 1-2 minute turns and the child is moving, pointing or joining a chant throughout — they never read and never write.' : 'At least half of every phase is the CHILD reading or saying something out loud; the tutor models once and then stops.'}`;
}

/**
 * The Move & Do block: the command ladder, the one new command, and the crown round.
 *
 * TPR has exactly one failure mode and this block exists to kill it: the child proves
 * understanding with their body, so a TPR lesson can be perfect and completely silent.
 * The fix is structural, not a reminder to "elicit more" — every command is said back
 * in the input phase, the chain phase makes the child produce the order of the words,
 * and the crown round hands over the microphone: the child gives the adult the
 * commands, and nothing moves until the child says it in English.
 *
 * It is also the one kind with no print at all. At 2-5 the words are heard and done,
 * never read, which is why the six phases are shaped around doing rather than study.
 */
export function movementBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `MOVE & DO — THIS IS A COMMAND LADDER, AND THE CHILD ENDS UP AS THE BOSS
  Return a "movement" object. It is the lesson's spine, not decoration.

    "commands": ${under ? '6-8' : '8-10'} physical commands in the order you teach them. Each one is
      { "command": "jump", "emoji": "🦘", "do": "Jump like a frog!", "twoStep": "Clap your hands, then jump!" }.
      Every command must be doable in a small room: nothing to climb, nothing sharp,
      no running into furniture. EXACTLY ONE command is new to the child; every other
      one is a word they already know, because a fluent majority is what lets them
      answer instantly and keeps the lesson error-free.
    "newCommand": the ONE new command, written exactly as it appears in "commands".
    "speedPlay": the same commands in 4 voices — fast, slow like a turtle, whisper,
      robot. This is how ${under ? 'seven' : 'ten'} words stay interesting for thirty minutes without ever
      teaching anything new.
    "bossRound": the ${under ? '4-5' : '6'} commands the CHILD will give the ADULT. This is the talk engine
      of the entire lesson.

  THE ORDER OF THE SIX PHASES IS THE METHOD — never reorder them:
    HOOK (3 min) — the body moves before a single word is taught: stand up, shout “GO!”.
    WARM-UP TALK (4 min) — the same action chant every week, and the child CHOOSES which
      action to sing next. That choice is their first spoken turn.
    INPUT (6 min) — the commands they know plus the one new one. You model each command
      twice, big, then the child does it AND SAYS THE COMMAND BACK. Mark this phase
      "drill": true — it opens the movement game on the big screen, and closing it
      comes back to this same phase.
    GUIDED TALK (6 min) — the ${under ? 'two-step chain (“clap, then jump”), which is the stretch for the four- and five-year-olds in the band — never the default, because a two-step direction is too much for a two-year-old' : 'chain: two commands, then three, and the child says the chain back in words before doing it'} — then the speed play.
    FREE PRODUCTION (7 min) — the crown round: the child wears the crown and gives YOU
      the commands. NOTHING moves until the child says it in English, and when you
      “malfunction” and do it wrong, the child has to say it again to fix you.
    WRAP (4 min) — the freeze game, then every command said one last time, slowly, and goodbye.

  NO READING AND NO WRITING ANYWHERE in this lesson — not on the ladder, not in the
  game, not in the chant. The words arrive through the ear and leave through the body.

  THE TALKING IS ENGINEERED, because TPR is naturally silent: every command is said
  back in INPUT, the chain is produced as words in GUIDED TALK, and the crown round is
  a whole phase of the child giving the orders. ${under ? 'Target 29' : 'Target 40'} spoken turns across the session, and
  a per-phase "talkTarget" for each of the six phases that adds up to it.

  The child is never corrected: if the action is wrong you simply do it again,
  bigger and sillier. The crown round is the one place the adult may be “wrong” — on
  purpose — so that the child gets to be the one who is right.`;
}

/**
 * The Routines & Words block: the three real moments of the day, the line said the
 * same way every time, and the say-it-like-this card for the family.
 *
 * Most of a routine lesson happens AFTER the session — at the sink, the table and the
 * bed, said by a parent who may not speak a word of English. So this block fixes the
 * wording instead of leaving it to the moment (the same sentence at the same moment is
 * what a small child's memory latches onto), gives every word a hint the parent can
 * hear and copy, and makes the caregiver note the load-bearing part of the lesson
 * rather than a footnote.
 */
export function routineBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `ROUTINES & WORDS — THE SAME WORDS, AT THE SAME MOMENT, EVERY DAY
  Return a "routine" object. It is the spine, and most of it plays out in the family's
  week rather than on the screen, so the words are FIXED, not invented in the moment.

    "name": what the family calls it — “Bath, Food and Bed”, “Morning, Off We Go”.
    "moments": ${under ? '2-3' : '3-4'} real moments of this child's day, in the order they happen. Each one is
      { "moment": "wash hands", "emoji": "🧼", "say": "Wash, wash, wash your hands!", "childDoes": "rubs hands together", "childSays": "wash!", "photoQuery": "child washing hands bathroom sink" }.
      "say" is the EXACT English the grown-up says, word for word, written the way it
      is spoken — repetition included (“wash, wash, wash your hands!”). Every moment
      must really happen in this child's day at a time the family is already together;
      never invent a moment nobody can act out. "photoQuery" must find a real
      photograph of that moment.
    "sameLine": ONE line said the SAME way at every moment, so the child hears the
      routine coming before it arrives (“It is TIME!”).
    "fillIn": the half-line the CHILD always finishes ("wash, wash, wash your ___").
      This is the biggest talking lever a routine has: the gesture alone tells the child
      which word is missing, so they can supply it before they can say a sentence.
    "pronunciation": a say-it-like-this hint for EVERY word in the routine —
      { "word": "wash", "hint": "“wosh” — rhymes with “posh”, one short round sound" }.
      Write the hint as something a parent who does not speak English can hear and copy.
      Phonetic symbols are useless here; a rhyme with a word they know is not.

  THE ORDER OF THE SIX PHASES — never reorder them:
    HOOK (3 min) — the cue: the same word said the same way means the routine is
      starting, and the CHILD says it first.
    WARM-UP TALK (4 min) — the same hello every session, word for word, then the child
      NAMES one of the moments (“wash” / “eat” / “sleep”).
    INPUT (6 min) — the moments one at a time, plus exactly ONE new word, and it should
      be a word the child can ANSWER with — a feeling word like “sleepy” is worth more
      here than one more noun.
    GUIDED TALK (6 min) — the chant, with the child FINISHING each line (“wash, wash,
      wash your…” → “hands!”), then what comes next in the routine.
    FREE PRODUCTION (7 min) — the child runs the WHOLE routine on a teddy and says the
      words for it. Mark this phase "drill": true — it opens the routine game on the
      big screen, and closing it comes back to this same phase.
    WRAP (4 min) — the same goodnight, word for word, every single session.

  The talking is engineered: the cue word, a named moment, every word said back, the
  child finishing each chant line, and a whole phase of the child giving teddy the
  routine. ${under ? 'Target 29' : 'Target 40'} spoken turns, with a per-phase "talkTarget" that adds up to it.

  And the caregiverNote is NOT a footnote here — it is the most load-bearing line in
  the whole lesson: tell the family the exact ${under ? 'three' : 'four'} lines to say, at which real moment,
  every day for a week, in the words to copy out loud. Write it as instructions a
  parent can follow without knowing any English at all.`;
}

/**
 * The kinds whose lesson IS the ritual — see `circleBlock`.
 *
 * Circle Time is the one kind whose content is meant to be repeated all week, so its
 * block fixes the wording of the two songs, the four check-in pictures and the line
 * said before every reveal, instead of leaving them to the moment. A circle that
 * changes its hello next week has lost the safety that makes one new word learnable.
 */
export const KID_CIRCLE_KINDS = ['circleTime'];

/**
 * Circle Time & Routines: the same circle every week, one new word inside it.
 *
 * The method is predictability, which is exactly the thing a general prompt throws
 * away — it writes a fresh warm-up, a fresh song and a fresh goodbye every time, and
 * the child never gets the one thing this model exists for. So the block fixes the
 * ritual as data: "hello" and "goodbye" line for line, the same four pictures, the
 * same wait line before every reveal, and ONE surprise word.
 *
 * The talking is engineered the same way. A pre-reader cannot answer a question, but
 * they can finish "Tap it... tap it... O—", they can point at a picture and hear the
 * word said back, and they can name the thing in the box — so the wait line and the
 * pointing are the two levers that get a two-year-old speaking from the first minute.
 * At 5-12 the child takes the tutor's job: they ask the check-in questions, answer in
 * full sentences and build their own sentences around the surprise word.
 */
export function circleBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `CIRCLE TIME — THE SAME CIRCLE EVERY WEEK, WITH ONE NEW WORD INSIDE IT
  Return a "circle" object. It is the ritual itself, and the ritual is what the child
  is learning: the order never changes, the words never change, and the ONE surprise
  is the only new thing in the whole session.

    "name": what the family calls it — “The Hello Circle”, “Our Morning Circle”.
    "hello": the hello song, line by line, EXACTLY as it will be sung — ${under ? '4 short lines' : '4-5 lines'}, the same words at the start of every lesson of the week.
    "goodbye": the goodbye song, line by line, the same words at the end of every lesson.
    "check": ${under ? 'exactly 4' : '4-6'} big pictures the child points at, in this order: ${under ? 'sunny, rainy, happy, sleepy' : 'two about the weather and two about how the child feels'}. Each one is
      { "look": "sunny", "emoji": "☀️", "childSays": "sunny!" }. ${under ? 'The child points; the tutor says the word back and waits for the echo.' : 'The child answers with the full sentence written in "childSays" — that sentence is the model, so it must be a real sentence, not a label.'}
    "waitLine": ONE line said the SAME way before every reveal (“Tap it... tap it... OPEN!”).
      The child says the last word of it with you every single time. This is the biggest
      talking lever the kind has: nobody has to be asked anything to join in.
    "surprise": ONE word only — the thing in the mystery box. ${under ? 'A real thing the child can see and hold, named in one word.' : 'One word or chunk, shown with a picture and its spelling: the child writes it once and then builds two sentences of their own with it.'}
    ${under ? '' : '"ask": the check-in questions in order (“How are you today?”, “What was the weather like yesterday?”, “What did you do yesterday?”). The CHILD asks these back to the tutor — that is the 5-12 job, so the questions are part of the lesson and not a wrapper around it.\n    '}"nextTime": one sentence the child closes with: what they will do before the next lesson.

  THE ORDER OF THE SIX PHASES — never reorder them:
    ${under
      ? `THE SAME HELLO (3 min) — the hello song, word for word, the same as last week.
    THE CHECK-IN (5 min) — the four pictures: the child points, the tutor says the word back, and every picture gets one more pointing turn.
    THE SAME WAIT (4 min) — “Tap it... tap it... OPEN!” said together, again and again, until the child says the last word every time.
    THE MYSTERY BOX (6 min) — the surprise revealed, named three times, then shaken, tapped and named again.
    THE ONE WORD, MANY WAYS (7 min) — the ONE surprise said, pointed at, found in the room and said again. Mark this phase "drill": true — it opens the circle game on the big screen, which walks the WHOLE circle in order, and closing it comes back to this same phase.
    THE SAME GOODBYE (5 min) — the goodbye song word for word, the same as last week, and one sentence about next time.`
      : `THE SAME OPENING (3 min) — the same 30-second starter every week, and the child leads it.
    THE CHECK-IN TALK (5 min) — the CHILD asks the "ask" questions, and both of you answer in full sentences; the big pictures stay up so disagreements get said in a sentence too.
    THE SAME WAIT (4 min) — the same wait line before the box, said together, then the child asks the tutor what they think is inside.
    THE SURPRISE (6 min) — the one word out of the box: read, spelled, and written once by the child.
    THE ONE WORD, MANY WAYS (7 min) — two sentences the child builds with it (“where it lives”), plus its picture. Mark this phase "drill": true — it opens the circle game on the big screen, which walks the whole circle in order, and closing it comes back to this same phase.
    THE SAME CLOSING (5 min) — the closing lines word for word, plus one full sentence about what the child will do before the next lesson.`}

  The talking is engineered: ${under ? 'the whole song sung, four pictures each named, the wait line joined in every time, the surprise named three ways, and the whole circle run by the child on the big screen' : 'the child asking every check-in question, every answer in a full sentence, the word spelled and written, and two sentences of their own built from it'}. ${under ? 'Target 29' : 'Target 40'} spoken turns, with a per-phase "talkTarget" that adds up to it.

  The predictability IS the pedagogy: a tutor who changes the hello, the wait line or
  the check-in pictures next week has taught a different lesson — say exactly that in
  the teacherNote, and put the lines the family keeps at home in the caregiverNote.`;
}

/**
 * The kinds whose lesson IS a page — see `sheetBlock`.
 *
 * A worksheet is printed, written on and sent home, so its talking has to live on the
 * paper itself: a task with no `childSays` is a task the child does in silence, and
 * silence is the one thing this kind cannot afford. These are the only kinds that get
 * this block.
 */
export const KID_SHEET_KINDS = ['worksheet'];

/**
 * Printable Worksheet: the page is the lesson, so the talk is printed on it.
 *
 * Two things a general prompt gets wrong here. It writes a list of tasks with no
 * words attached — a page the child fills in silently — and it treats the sheet as
 * homework rather than as the session, so nothing in the run is timed and a tutor
 * ends up handing out paper with no idea what to say while it is being done. So the
 * block makes every task carry three scripts (what the child does, what the grown-up
 * says, what the child says back) plus the physical requirement, and it puts the six
 * phases, the floors and the talk targets around the page — the print IS the session.
 */
export function sheetBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `PRINTABLE WORKSHEET — THE PAGE IS THE LESSON, AND EVERY TASK HAS A TALKING TURN
  Return a "sheet" object. It is the page itself, so it is the spine of the session,
  and the run sheet below is the tutor's copy of the same page.

    "name": what the family calls the page — “The Pond Page”, “Colour and Say”.
    "tasks": ${under ? '5-7' : '7-10'} tasks, in the order they appear on the paper. Each one is
      { "do": "Colour the big duck yellow.", "emoji": "🦆", "paper": "colour", "say": "Colour the duck yellow — big circles!", "childSays": "duck!" }.
      "do" is what the child DOES on the paper, written ${under ? 'as an instruction the ADULT reads aloud' : 'as the task the child can also read themselves'}.
      "paper" is the physical bit — ${under ? 'colour · draw one line · cut and stick · finger-paint' : 'draw one line · circle · ruled boxes · cut and stick'} — so the tutor can see at a glance that the sheet is doable with what is on the table.
      "say" is the EXACT English the grown-up says while the child works, word for word.
      "childSays" is the ONE line the child says back on that task. ${under ? 'Every single task needs one: it is the only talking on the page, and a 3-year-old cannot read the task to ask about it.' : 'Every single task needs one, and it must be a real sentence or a word the child produces, not a nod.'}
      ${under ? '' : 'A writing task also carries "boxes": how many ruled boxes it needs, so the paper prints them.'}
    "traceWords": ${under ? '2-3 big words the child traces with a FINGER — never a pencil at this age' : '3-4 words the child TRACES before writing them alone, in order from easiest to hardest'}.
    "talkFrame": the one frame the child finishes about their OWN page (“In my pond there is ___.”),
      said at the end, so the finished sheet becomes a spoken sentence and not just a marked one.
    ${under ? '' : '"answerKey": the adult’s answers for parts 1 and 2 ONLY — never for part 3, which has no wrong answer and must never be marked as one.\n    '}
  And the "worksheet" list must still carry the same tasks as PLAIN STRINGS, in the same
  order: that list is what actually prints on the paper, and a sheet object the paper
  cannot draw is a sheet nobody gets.

  THE ORDER OF THE SIX PHASES — never reorder them, and print them on the page:
    ${under
      ? `SHOW THE PAGE (3 min) — hold the page up, the child looks and chooses a crayon, and NOTHING is explained yet: “What can you see?”
    TALK IT THROUGH (4 min) — every task on the page is named out loud BEFORE any crayon moves, one at a time, with the child repeating the one word of each task.
    COLOUR & MATCH (7 min) — the colouring and the by-line matching, done at the adult's pace, with the child saying the word each time they finish one.
    CUT & STICK (5 min) — the grown-up holds the scissors; the child says “cut!” and “stick!” and names the picture in the box.
    SAY IT OUT LOUD (6 min) — the whole page talked back: what is on it, what colour it is, who it is for, using the talkFrame.
    SEND IT HOME (5 min) — the sheet is signed with a crayon mark, put in the bag, and the family line is said together.`
      : `LOOK AT THE PAGE (3 min) — the child READS the first task aloud before anything is written, and the tutor asks what the page is asking for.
    MATCH & CIRCLE (5 min) — part 1 (recognition), with the child saying each pairing out loud before drawing the line.
    WRITE THE WORD (6 min) — part 2, the boxes: trace first, then write, then SAY the word back before moving on.
    YOUR TWO SENTENCES (7 min) — part 3, the child finishes two sentences about their own life, then reads them aloud.
    CHECK IT YOURSELF (5 min) — the child marks parts 1 and 2 against the printed key, says what they got, and says what they will fix.
    SEND IT HOME (4 min) — the page goes home with the family line and the one part to finish, said by the child.`}

  The talking is engineered: ${under ? 'every task named before the crayon moves, the word said at each finish, the cut and stick words, the whole page talked back' : 'every task read aloud, every pairing said, every word said back after it is written, two own sentences and a self-check said out loud'}. ${under ? 'Target 29' : 'Target 40'} spoken turns, with a per-phase "talkTarget" that adds up to it.

  Two rules this kind never breaks: there is NO screen and NO game to open — the doing
  IS the paper, so the run sheet is what makes it thirty minutes rather than eight; and
  ${under ? 'the child reads and writes nothing at all (the adult reads every instruction)' : 'the page is graded recognition → spelling → production, and the answer key is the child’s, not the tutor’s'}.`;
}

/**
 * The kinds whose lesson IS a week of jobs — see `questBlock`.
 *
 * Homework Quest used to be sent generic homework instructions, which came back as a
 * handful of task sentences and nothing to run: no XP that adds up, no proof, no line
 * for the grown-up and no line for the child. A home task with no `childSays` is a
 * task the child does in silence, and one with no `proof` is a task that quietly never
 * happens. So this kind gets its own block, and the block makes the quest a board:
 * jobs with XP and proof, a nightly tally the child marks, and — at 5-12 — the child's
 * own job of being the one who RUNS it.
 */
export const KID_QUEST_KINDS = ['homeworkQuest'];

/**
 * Homework Quest: a week of jobs with XP, and a quest night that launches it.
 *
 * The board is the lesson, so the talking has to live inside the jobs themselves,
 * and the run sheet has to live on the sheet that goes home — otherwise a 5-minute
 * task list is what the family gets, and the session stops before the talking starts.
 */
export function questBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `HOMEWORK QUEST — A WEEK OF JOBS, EACH WITH ITS XP AND ITS LINE
  Return a "quest" object. It is the board that goes home, so it is the spine of the
  session, and the "worksheet" list is the same jobs as plain strings, because that is
  what prints on the sheet.

    "name": what the family calls the quest — “The Blue Finder”, “The Pond Week”.
    "partner": who does this with the child — ${under ? '“a grown-up, or the pet if the pet is closer”' : '“a grown-up or a big brother — and the pet may be the witness”'}.
    "jobs": ${under ? '5-6' : '5-7'} jobs, in the order the week should run. Each one is
      { "do": "Bring something blue to a grown-up.", "emoji": "💙", "night": "night one", "xp": 10, "say": "Find me something blue!", "childSays": "Blue! Here it is!", "proof": "said aloud — the grown-up hears it" }.
      "do" is what the child DOES, written ${under ? 'as a thing the grown-up can set up in ten seconds, with NO reading and NO device' : 'as the job the child can also read themselves'}.
      "say" is the EXACT English the grown-up says to start it, word for word.
      "childSays" is the ONE line the child says during it. ${under ? 'Every job needs one, and it must be a word or a two-word chunk — a 3-year-old says “blue!”, not a sentence.' : 'Every job needs a real line: a sentence, a question they ask, or a chunk they produce — never a nod.'}
      "xp" is what the job is worth, and the week must add up to a number the family can say out loud.
      "proof" is how the job shows up finished: “a photo”, “a grown-up’s initials”, “said aloud”. A job with no proof is a job that does not happen.
    "tally": the nightly mark the child makes — “colour one star for every job; seven stars is the week”.
    "reward": what the finished week adds up to — ${under ? 'something that already exists in the house, never a purchase' : 'something the whole family does together, named when the board is set up'}.
    ${under ? '' : '"master": the child’s own job of running the board — reading every job aloud before it starts, choosing the order, awarding the XP, writing the proof line, and reading the week back at the end. One job must be an interview: the child asks a grown-up a question in English and writes the answer down.\n    '}
  And the "worksheet" list must still carry the same jobs as PLAIN STRINGS, in the same
  order (each one ending with its XP), because that list is what actually prints.

  THE SIX PHASES OF THE QUEST NIGHT — never reorder them, and print them on the sheet:
    ${under ? 'BRIEF THE QUEST' : 'BRIEF THE BOARD'} (3 min) — the board is shown, the jobs are read out one by one, and NOTHING starts yet.
    ${under ? 'PICK THE ORDER' : 'CLAIM THE ORDER'} (4 min) — ${under ? 'the child points at the job they want first; any order is fine' : 'the child chooses and SAYS which job goes first, and why'}.
    JOB ONE, OUT LOUD (7 min) — the first job is actually DONE in the room: the grown-up says the line, the child does the job, the child says their line.
    XP & PROOF (6 min) — the XP is counted out loud, the tally is marked, and the proof is decided and written down.
    SHOW THE HOUSE (6 min) — the child shows what they did and says the line again to somebody else in the house.
    ${under ? 'SET UP THE WEEK' : 'PLAN THE WEEK'} (4 min) — the remaining jobs go on the fridge, the nights are named, and the reward is said out loud.

  The talking is engineered: every job named before it starts, the child’s line inside
  every job, the XP counted out loud, ${under ? 'and the show-and-tell to the house' : 'the order said aloud, the proof written and read back, and the interview job'}. Target ${under ? '29' : '40'}
  spoken turns, with a per-phase "talkTarget" that adds up to it.

  Two rules this kind never breaks: there is NO screen and NO game to open — the doing
  IS the board, so the run sheet is what makes it thirty minutes rather than five; and
  ${under ? 'the child reads and writes NOTHING at all (the grown-up reads every job aloud)' : 'every job is doable by the child alone, and nothing is ever marked — the tally is the only score'}.`;
}

/**
 * The kinds whose lesson IS a quiz night — see `quizBlock`.
 *
 * A quiz prompt that only asks for questions gets questions: four options, one tap,
 * “Yes! 🎉”, next. Nothing in that is spoken. So this kind gets its own block, and the
 * block asks for the two things a tap cannot give — the sentence the child says to
 * ANSWER (which the engine prints inside its own “Yes!”), and the rounds that bracket
 * the questions so the night is thirty minutes of talk rather than eight minutes of
 * pointing.
 */
export const KID_QUIZ_KINDS = ['pictureQuiz'];

/**
 * Picture Quiz: the questions, the round the child runs, and the score said out loud.
 *
 * The questions stay in `game.items` because that is what the quiz player reads, and
 * every one of them gains the spoken answer, the follow-up and a real-photo search.
 * The `quiz` object carries the night's shape, and `master` is the 5-12 round where
 * the child reads the question and judges the grown-up's answer.
 */
export function quizBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `QUIZ NIGHT — THE QUESTIONS, AND THE ROUNDS THAT MAKE THE CHILD TALK
  A tap is not an answer. Return all of this, and the night is thirty minutes of talk.

  1. The questions stay in "game" (that is what the quiz player reads), but EVERY
     item carries four extra things:
       "childSays": the whole thing the child says when they are right — ${under ? 'a word or a two-word chunk (“duck!”, “in the water!”), never a sentence' : 'the whole sentence (“The duck swims in the pond.”), because the sentence IS the answer'}. The engine prints it inside its own “Yes!”, so a right tap still produces a spoken turn.
       "ask": the follow-up the grown-up asks straight after — ${under ? 'one short question (“What does the duck say?”)' : 'a real follow-up (“And who else lives in the water?”)'}.
       "photoQuery": what to search for a REAL photograph of this question.
       "lookFor": the one thing to look at in that photo.
     ${under ? '6-8' : '10-12'} items, ${under ? 'ONE clearly wrong decoy each' : 'four options each, every option within two words of the others'}, and ${under ? 'no text options at all — the adult reads the question and the child points or taps' : 'the correct answer must never sit in the same position twice in a row'}.
     Item: { "prompt": "Which animal swims in the pond?", "answer": "the duck", "distractors": ["the cat", "the dog", "the frog"], "picture": "🦆", "childSays": "The duck swims in the pond.", "ask": "Who else lives in the water?", "photoQuery": "duck swimming in a pond", "lookFor": "the feet under the water" }

  2. A "quiz" object for the night around the questions:
       "name": what the family calls it — “The Pond Quiz Show”.
       "rounds": ${under ? 'two or three' : 'four'} NAMED rounds in the order the class runs them, ${under ? '(a warm-up, the picture round, and the child\u2019s turn)' : '(the warm-up, the picture round, the quiz itself, and the child\u2019s own final round)'}.
       "scoreLine": how the score is SAID out loud — “ten points, and the duck takes the lead!” — so counting is English too.
       ${under ? '' : '"master": the child’s final round: they READ the question aloud, the grown-up answers — sometimes wrongly on purpose — and the child judges it and explains why.\n       '}

  THE SIX PHASES OF THE QUIZ NIGHT — never reorder them, and print them on the run sheet:
    WARM-UP QUESTIONS (3 min) — ${under ? 'two easy questions the child cannot get wrong, so the night starts with a win' : 'two easy questions, answered in a whole sentence, to set the rule: no answer without a sentence'}.
    PICTURE ROUND (5 min) — every question is shown WITH its real photograph: the class looks at the picture and says what it can see before anyone answers.
    THE QUIZ (7 min) — the quiz itself, one question at a time, with the child's sentence said out loud on every correct answer.
    SAY IT BACK (6 min) — the questions come round again and the CHILD answers ${under ? 'with the word, then the grown-up says the full sentence back' : 'with the whole sentence, in their own words'}.
    ${under ? 'THE CHILD ASKS (5 min) — the child asks “which one?” and the grown-up answers, slowly and wrongly sometimes, so the child has to point and say again.' : 'THE CHILD ASKS (5 min) — the child reads a question aloud and the grown-up answers (sometimes wrongly on purpose); the child judges the answer and says why.'}
    SCORE & CHEER (4 min) — the score is said out loud in English, ${under ? 'the class claps for every answer' : 'the child says the score line and names the question that was hardest'}, and the next night's topic is set.

  The talking is engineered: the sentence inside every “Yes!”, the follow-up after every
  question, and the whole of SAY IT BACK. Target ${under ? '29' : '40'} spoken turns, with a per-phase
  "talkTarget" that adds up to it, and a "floorMinutes" on every phase so the night
  cannot end in ten minutes.

  Two rules this kind never breaks: ${under ? 'nothing on screen is read by the child — the adult reads every question and every option' : 'the four options are read silently by each child before anyone answers, and the last round is the child\u2019s, not the tutor\u2019s'}, and no answer is ever called wrong — “nearly, look again” is the whole feedback.`;
}

/**
 * The deck kinds — see `deckBlock`.
 *
 * A flashcard deck has one failure mode and it is silence: the child names a picture,
 * the next card appears, and nothing was said that needed English. Only these kinds
 * get the deck block; a story lesson asking for cards would be noise.
 */
export const KID_DECK_KINDS = ['flashcards'];

/**
 * Flashcard Deck: the cards that make the child talk, and the night that runs them.
 *
 * The deck is the drill, not the lesson. What the block adds is the run sheet around
 * it (six phases, minute floors, a spoken-turn target), the per-card talking turn
 * (the 2-5 back of the card is a body action; the 5-12 back is the child's own
 * sentence), the spaced schedule that makes the words come back during the week, and
 * — for 5-12 only — the pass where the CHILD runs the deck.
 */
export function deckBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `FLASHCARD DECK — THE CARDS, AND THE NIGHT THAT RUNS THEM
  A deck that is only a screen of pictures teaches pointing. Return all of this, and
  the deck becomes thirty minutes of talking with the cards inside it.

  1. A "deck" object: the cards themselves, in the order they are dealt.
     "name": what the class calls the pack — “The Pond Pack”.
     "cards": ${under ? '6-8' : '10-14'} cards, one per word, and EVERY one carries:
       "word": the word the child must own.
       "emoji": the picture side, big enough to name from across the table.
       "say": the EXACT English the grown-up says when the card goes down — ${under ? '“What is this? It is a duck!”' : '“Tell me about this one — what is it doing?”'}.
       "childSays": the child's own talking turn — ${under ? 'one word or one easy chunk (“duck!”, “in the pond!”), never a sentence' : 'the WHOLE sentence (“The duck swims in the pond.”), because the sentence is the answer'}.
       ${under
        ? '"do": the BACK of the card — a body action the child performs with the word (quack, waddle, flap, splash). Pick a different action for every card; a card the child only names is a card the child forgets.'
        : '"cue": the picture cue that makes the word answerable, "sentence": an example sentence using the word in this child\u2019s own world (their pet, their street, their game), and "review" on every FIFTH card: the two earlier words it mixes (“say both”), e.g. "review": ["duck", "pond"].'}
     Card: { "word": "duck", "emoji": "🦆", "say": "What is this? It is a duck!", "childSays": "${under ? 'duck!' : 'The duck swims in the pond.'}", "${under ? 'do' : 'cue'}": "${under ? 'quack and waddle like a duck' : 'a duck on the water'}"${under ? '' : ', "sentence": "My duck is in the bath."' } }

  2. The real week, in the same object — this is not a footnote, it is the part that makes the words stick:
     "passes": the named passes of the session, in order (${under ? 'two or three, each one shorter than the last' : 'three, each one shorter than the last'}).
     "scoreLine": the line the class says when the pack is finished — “the whole pond pack, all by myself!”.
     "spacing": THREE lines saying which cards come back when — which three cards TONIGHT, which tomorrow, and which in three days — said out loud at the table, in the bath or on the walk, with NO screen. Example: "the duck and the pond cards come back at dinner tonight — the grown-up points and the child says the sentence".
     ${under ? 'There is no master pass in this band; the grown-up keeps the deck.' : '"master": the pass where the CHILD runs the deck — they read each card aloud, grade it “know it / practice again”, choose the order of the passes, and finish by quizzing the grown-up with the cards that got away.'}

  THE SIX PHASES OF THE CARD NIGHT — never reorder them, and print them on the run sheet:
    DEAL & LOOK (3 min) — the pack is dealt face up and looked at, not tested. The child names what they recognise.
    SAY IT WITH ME (5 min) — every card is said together, grown-up then child,${under ? ' with the action done at the same time' : ' with the whole sentence, not the word'}.
    TURN & TELL (7 min) — THE DECK PHASE. This is the one phase marked "drill": true, and it is where the card player opens: turn, say, and the child tells you about it.
    SORT THE DECK (6 min) — ${under ? 'the cards are sorted by the child: animals here, things to do there, and every card named as it is placed' : 'the child sorts the deck into “I know it” and “practice again” piles and says why each card went where it did'}.
    ${under ? 'THE CHILD DEALS (5 min) — the child holds the pack and deals, and the grown-up is wrong on purpose once.' : 'THE CHILD DEALS (5 min) — the child deals and runs the deck: they read the card, the grown-up answers sometimes wrongly, and the child judges it and explains.'}
    PACK IT HOME (4 min) — the pack is closed, the three cards for tonight are named out loud, and the next pack is chosen.

  Target ${under ? '29' : '40'} spoken turns, with a per-phase "talkTarget" that adds up to it, and a
  "floorMinutes" on every phase so the night cannot collapse into eight minutes of flipping.
  ${under ? 'Nothing on screen is ever read by the child: the grown-up reads every card and every line.' : 'Nothing in the deck is answered with a single word, and every card ends with the child saying a whole sentence.'}
  A card with no "say" and no "childSays" is a silent card — do not write one.`;
}

/**
 * The kinds whose story is told with the BODY — see `storyWalkBlock`.
 *
 * Move & Tell a Story used to be sent the reading-story block, which asked it for
 * story pages, a retelling ladder, hot-seating and a paired read-aloud picture book
 * while the tile's own definition said the child copies actions and never speaks.
 * Two specifications pulling opposite ways is how a prompt starts getting ignored,
 * so this kind gets its own block and the reading block is no longer sent to it.
 */
export const KID_STORY_WALK_KINDS = ['tprStory'];

/**
 * TPR-Storytelling: the story and the body are the same thing.
 *
 * Every beat must be an action, because in this kind the action IS the
 * comprehension — if the child performs it, they understood the sentence. The echo
 * line is what makes a small child talk without being asked anything: they are not
 * answering, they are joining a line they already know. The map is acted rather
 * than read, and the choice beat is the first sentence in the lesson that is theirs.
 */
export function storyWalkBlock(band: KidAgeBand): string {
  const under = band === 'veryYoung';
  return `MOVE & TELL A STORY — THE CHILD LEARNS BY DOING THE STORY, NOT BY READING IT
  Return a "storyWalk" object. This is TPR-Storytelling: the story is a list of
  actions, and a beat the child only listens to does not belong in it.

    "title": the story's name in very simple words — “Jump Like a Frog”.
    "beats": ${under ? '4-5' : '6-8'} beats of the story, in order. Each one is
      { "line": "The little frog is sad. He lost his hop!", "action": "Sit down like a very sad frog.", "say": "hop!", "emoji": "🐸" }.
      "line" is the sentence the tutor tells, told ALOUD — the child never reads it.
      "action" is what the child DOES on that sentence, and it is the point of the
      whole lesson: ${under ? 'one action per beat, never two' : 'one action per beat, and the action must be doable in a living room'}. If a beat has no action, rewrite it.
      "say" is the exact chunk the child says on that beat — ${under ? 'two or three words, and on most beats it is the echo' : 'three to five words, and on most beats it is the echo'}.
    "echo": ONE line that comes back in EVERY beat (“Hop, hop, hop!”). This is the
      biggest talking lever this kind has: the child is not answering a question, they
      are joining a line they already know, so a two-year-old is talking from beat one.
    "map": 3-4 pictures in order ("🐸 a sad frog", "👏 clapping", "💧 the pond").
      The retell in this kind is done WITH THE BODY, so the map is what the child acts
      out from memory — it must be an order the child can walk, not a summary.
    "choose": the beat where the CHILD decides what happens next, written as you will
      say it, with a frame they can copy (“Where does he hop? You say it: ‘Hop to the
      ___!’”). This is their first own sentence in the lesson — one at most.
    ${under ? '' : '"chain": 3-4 TWO-STEP commands for this story (“Creep to the door, then push it”). A two-step command is the real step up from the 2-5 version: the child has to hold the whole sentence in mind while doing the first half.\n    '}
  THE ORDER OF THE SIX PHASES — never reorder them:
    HOOK (3 min) — ${under ? 'stand up and shout the one new word, so the first English word of the lesson is a shout they enjoy' : 'a real sound and a guess: what is behind the door? The child guesses FIRST, in a sentence, before anything is told'}.
    WARM-UP TALK (4 min) — ${under ? 'the same action chant every week, with the child choosing which action to repeat' : 'the verbs, in the body first: the child does each one, then says it'}.
    INPUT (6 min) — ${under ? 'the actions the child already knows plus exactly ONE new word, which is the word the story is about to need' : 'the TWO-STEP CHAINS, one command at a time, and the child says the whole sentence back before either half moves'}.
    GUIDED TALK (6 min) — the story, beat by beat: the tutor tells it, the child does
      the action and joins the ECHO every time it comes back. This is where the
      comprehension becomes visible — you can watch whether they understood.
    FREE PRODUCTION (7 min) — the child tells the story and the grown-up acts it,
      then the child decides what happens next and says it. Mark this phase
      "drill": true — it opens the story walk on the big screen, and closing it comes
      back to this same phase.
    WRAP (4 min) — a calm goodnight to the story and the child's favourite word.

  ${under ? 'The child never reads, writes or answers a question on their own — the echo, the actions and the choice are the whole output.' : 'The retell is acted, then said: the child walks the story map and THEN says it back in their own sentences, using First / then / at the end.'}
  The talking is engineered: the shouted word, a chosen action, every verb said back,
  the echo ${under ? 'five' : 'seven'} times over, a whole phase of the child directing the story, and the choice
  beat. Target ${under ? '29' : '40'} spoken turns, with a per-phase "talkTarget" that adds up to it.

  Finish with a real scene (a real photograph of the animal and a real clip of the
  story's action), a home mission that is PLAY — the child directing a grown-up with
  the same commands, one short act a night — and a caregiverNote that gives the parent
  the exact lines to react to and tells them to clap for the retry, never for the
  perfect sentence.`;
}

/** Explicit quantity floors, so a reply that "summarises the lesson" is unusable. */
export function quantityBlock(band: KidAgeBand): string {
  const lines =
    band === 'veryYoung'
      ? [
          'words: 6-8 target words, each with an emoji, the way it is said aloud and one example sentence.',
          'steps: exactly 6 named phases adding up to 30 minutes, each with a floor, a talk target, a sentence frame, a 3-question ladder and 3 reserves.',
          'game: one game with 4-6 playable items, plus how to run it with no screen.',
          'lyrics: one chant or song of two short verses, 4 lines each, with the beat marked.',
          'worksheet: 4 print-and-do activities, none of which need the child to read.',
          'homework: 1-2 short family missions that need no device.',
          'media: 4-6 free links — at least two songs or action videos, one story or picture set, one real-photograph source.',
        ]
      : [
          'words: 10-14 target words, each with an emoji, a meaning and an example sentence.',
          'steps: exactly 6 named phases adding up to 30 minutes, each with a floor, a talk target, a sentence frame, a 3-question ladder and 3 reserves.',
          'game: one game with 8-12 playable items, plus the no-screen fallback.',
          'lyrics: a verse and a chorus (or one 8-line chant), with the rhythm marked per line.',
          'worksheet: 6-8 items in 3 graded parts (match → complete → two own sentences) with an answer key.',
          'homework: exactly 3 tasks for the week, each naming its XP and how the child proves it.',
          'media: 5-8 free links — at least two tap-and-play free activities, one video or story, one real-photograph source.',
        ];
  return `QUANTITY — a thin reply is rejected; this is the floor:\n  · ${lines.join('\n  · ')}\n  A summary is not a lesson: every item is filled in for THIS child and THIS material, and nothing here is filler.`;
}

/**
 * The free-media block.
 *
 * The tutor asked, in plain words, for lessons that can actually PLAY something:
 * a song, a clip, a ready-made activity the class taps. That only works if the
 * model brings real, CURRENT links and, crucially, never invents one — a guessed
 * YouTube id is a black screen in front of thirty children. So the block does
 * three things: it names the year, it forbids guessing and makes the site's SEARCH
 * page the safe answer, and it hands over a fixed sourcebook of free, kid-safe
 * places (see `kidLessonMedia.ts`) rather than leaving the model to roam.
 *
 * The two bands get different asks because they reach for different things: 2-5
 * want songs and action videos, 5-12 want a game three children can tap on one
 * shared screen.
 */
export function freeMediaBlock(band: KidAgeBand): string {
  const underFive = band === 'veryYoung';
  const list = (kind: 'video' | 'story' | 'audio' | 'activity' | 'picture') =>
    sourcesForKind(kind, band)
      .map((s) => `  · ${s.emoji} ${s.label} — ${s.url}  (search page: ${s.searchUrl})\n      ${s.note}`)
      .join('\n');

  return `FREE MEDIA THE LESSON MUST BRING — REQUIRED, NOT DECORATION
  Today is 2026. Only give links that are still live in 2026. If you are not certain a
  specific video or page still exists, DO NOT invent one: give the site's own SEARCH
  page as the "url" and put the plain query in "searchUrl" so the tutor finds it in
  seconds instead of hitting a dead link in class.

  Return a "media" array with ${underFive ? '4-6' : '5-8'} items. For EACH item give:
    "kind": "video" | "audio" | "activity" | "picture" | "story"
    "title": what it is, in super simple words ("A duck song we can sing")
    "url": a real, free https link you are confident works in 2026
    "searchUrl": the site's search page for the same thing (always give one)
    "where": "class" (tutor's screen) | "home" (the family) | "both"
    "forStep": the exact step name it goes with
    "why": one short line — what the child does with it
    "source": the site or channel name, for the credit line
    "embeddable": true only when it plays inside a frame (a YouTube watch link does)

  ${underFive
      ? 'For 2-5 at least TWO items must be a song, chant or action video the class can sing and copy, and at least one must be a story or picture set. Nothing may need reading, a login or typing.'
      : 'For 5-12 at least TWO items must be a free ready-made activity the class can TAP on one shared screen (a Wordwall game, a Baamboozle quiz, a Kahoot), and at least one must be a story or video to watch together.'}

  ONLY USE THESE FREE SOURCES, which are free, kid-safe and need no account for the part a class uses:
  Videos, songs & stories:
${list('video')}
${list('story')}
  Free sound & music:
${list('audio')}
  Free tap-and-play activities:
${list('activity')}
  Free pictures, photos & crisp SVG emoji:
${list('picture')}

  Rules that are never broken:
  1. No paid link, no login wall for anything used IN class, no app where every child must sign in.
  2. No link you cannot stand behind — when in doubt the "url" IS the search page from the list above.
  3. Every link is https, opens on a laptop, and sits on a page made for children — prefer the named channels and libraries above over a loose search result.
  4. A YouTube video must be one you are confident exists; never guess a video id. When unsure, link the channel or the search page instead.
  5. For any word an emoji cannot show, add a "picture" item pointing at Wikimedia Commons or Openverse so the tutor also gets a real photograph.`;
}

/** The first reply the AI must send: ask for the material, build nothing yet. */
export function firstStepBlock(band: KidAgeBand): string {
  const profile = KID_BANDS[band];
  return `FIRST REPLY — ASK FOR THE LESSON TEXT OR PDF (NON-NEGOTIABLE)
  Your FIRST reply must be one short message asking for the source material, and nothing else. Say exactly:
  "Please send the lesson text or PDF 📄 — the page, unit or story this lesson must follow. A photo of the page is perfect too."
  Do NOT outline, plan or generate any lesson content yet. Wait for the material.
  Once the tutor sends it (pasted text, PDF text, or a photo):
  · Rebuild its words, characters and exercise order for a ${profile.label} child — never paste it back unchanged.
  · If they say they have no material: ask for the topic and any words they must include, then build from this child's profile.
  · Never ask twice. After the material arrives (or they say there is none), build the whole lesson in one reply.`;
}

/** The rules that separate a real young-learner lesson from a generic one. */
export function bestPracticeBlock(band: KidAgeBand): string {
  const underFive = band === 'veryYoung';
  return `BEST PRACTICE THIS LESSON MUST FOLLOW (top-programme standard)
  1. ONE goal, visible in every step: the child can DO something at the end they could not do at the start.
  2. Say-show-do: present the target with a real object, big picture or gesture BEFORE any words on a screen.
  3. Model first, do it together, then let the child lead — never skip the "together" beat.
  4. ${underFive ? 'Every instruction is ONE short sentence, one action. The adult is the audio track; the child never reads.' : 'Instructions are 1-2 short sentences; reading and writing appear only where the band allows.'}
  5. Recycle, never repeat: each target appears in at least three different activities (listen, move, play).
  6. Praise the effort and the retry, never "clever"; "nearly, try again" replaces "wrong".
  7. Personalise hard: the child's pet, hero and one interest appear naturally at least twice.
  8. Safety first: nothing to climb, swallow or cut with unsafe scissors; say "with a grown-up" where it matters.
  9. The tutor's lines are written WORD FOR WORD in English ("teacherScript"), ready to read aloud — no stage directions like "elicit the answer".
 10. If the material or topic is too thin to build from, ask ONE short question and stop; never invent a random subject.`;
}

/** The exact JSON the paste box expects. */
function contractBlock(kind: KidLessonKind): string {
  const requiredKeys = kind.required.map((piece) => `"${pieceKey(piece)}"`).join(', ');
  const optionalKeys = kind.optional.map((piece) => `"${pieceKey(piece)}"`).join(', ');
  return `RETURN EXACTLY THIS SHAPE (extra keys are allowed, these must be right):
{
  "title": "child-friendly title, 2-5 words",
  "kind": "${kind.id}",
  "band": "${'${veryYoung|young}'}",
  "ageRange": "e.g. 3-5",
  "durationMinutes": 10,
  "objectives": ["What the child will be able to DO, in child terms — one line each, max 3"],
  "materials": ["everything the tutor needs, including the no-screen fallback"],
  "words": [ { "word": "duck", "emoji": "🦆", "sayAloud": "quack quack (animal sound to make)", "meaning": "a bird that swims", "example": "The duck is in the water." } ],
  "steps": [ { "name": "Warm-up song", "minutes": 3, "teacherScript": "the EXACT words the tutor says, in English", "childAction": "what the child physically does", "print": "what to print or cut, if anything", "tip": "what to do if the child is shy / runs off / already knows it" } ],
  "game": { "name": "Find the duck", "howToPlay": "step by step", "winCondition": "how it ends with everyone happy", "turns": 6, "offline": "how to run it with the paper cards only", "levels": [ { "name": "Level 1 — the whole six", "words": ["duck", "pond", "swim"], "distractors": ["dock", "pound", "swam"], "rise": "the same six words, faster" } ], "retrySet": ["duck", "pond"], "scoring": { "hit": "two points — the pond takes the lead!", "miss": "nearly — duck, not dock. Double points if you get it now." }, "sounds": ["pop", "cheer", "coin"], "items": [ { "prompt": "Which one is the duck?", "answer": "duck", "distractors": ["cup", "dog"], "picture": "🦆", "childSays": "The duck swims in the water.", "ask": "What does the duck say?", "photoQuery": "duck swimming in a pond", "lookFor": "the feet under the water" } ] },
  "lyrics": ["line 1", "line 2"],
  "chantRhythm": "clap-clap-pause-clap",
  "worksheet": ["item 1 to draw or write", "item 2"],
  "homework": ["task 1 with how to prove it"],
  "media": [ { "kind": "video", "title": "A duck song we can sing", "url": "https://www.youtube.com/results?search_query=super+simple+songs+duck", "searchUrl": "https://www.youtube.com/results?search_query=super+simple+songs+duck", "where": "both", "forStep": "Warm-up song", "why": "we sing it and quack together", "source": "Super Simple Songs", "embeddable": true } ],
${KID_PHONICS_KINDS.includes(kind.id) ? `  "phonics": { "sound": "/d/", "inWords": ["duck", "dog"], "minimalPairs": [ { "a": "dog", "b": "log", "emojiA": "🐕", "emojiB": "🪵" } ], "realWords": ["duck", "dog"], "nonsenseWords": ["zot"], "ladder": [ { "step": "hear it", "what": "Say the sound three times; the child copies.", "talkTarget": 3 } ], "mouth": "tongue up behind the top teeth", "dictation": ["dog"], "answerKey": ["dog"], "decodable": { "title": "Dan the Dog", "lines": ["Dan is a dog."], "trickyWords": ["is"], "retell": "tell me who Dan is", "talkTarget": 3 } },\n` : ''}${KID_ROUTINE_KINDS.includes(kind.id) ? `  "routine": { "name": "Bath, Food and Bed", "moments": [ { "moment": "wash hands", "emoji": "🧼", "say": "Wash, wash, wash your hands!", "childDoes": "rubs hands together", "childSays": "wash!", "photoQuery": "child washing hands bathroom sink" } ], "sameLine": "It is TIME!", "fillIn": "wash, wash, wash your ___", "pronunciation": [ { "word": "wash", "hint": "“wosh” — rhymes with “posh”" } ] },\n` : ''}${KID_MOVEMENT_KINDS.includes(kind.id) ? `  "movement": { "commands": [ { "command": "jump", "emoji": "🦘", "do": "Jump like a frog!", "twoStep": "Clap your hands, then jump!" } ], "newCommand": "stretch", "speedPlay": ["Fast! ⚡", "Slow like a turtle 🐢", "Whisper 🤫", "Robot voice 🤖"], "bossRound": ["jump!", "clap!", "sit down!"] },\n` : ''}${KID_STORY_WALK_KINDS.includes(kind.id) ? `  "storyWalk": { "title": "Jump Like a Frog", "beats": [ { "line": "The little frog is sad. He lost his hop!", "action": "Sit down like a very sad frog.", "say": "hop!", "emoji": "🐸" } ], "echo": "Hop, hop, hop!", "map": ["🐸 a sad frog", "👏 clapping", "💧 the pond"], "choose": "Where does he hop? You say it: ‘Hop to the ___!’", "chain": ["Creep to the door, then push it."] },\n` : ''}${KID_CIRCLE_KINDS.includes(kind.id) ? `  "circle": { "name": "The Hello Circle", "hello": ["Hello, hello, hello to you!", "Hello, hello, how are you?"], "goodbye": ["Goodbye, goodbye, goodbye to you", "Goodbye, goodbye, see you soon!"], "check": [ { "look": "sunny", "emoji": "☀️", "childSays": "sunny!" } ], "waitLine": "Tap it... tap it... OPEN!", "surprise": "duck", "ask": ["How are you today?"], "nextTime": "I will sing the hello song to my teddy." },\n` : ''}${KID_SHEET_KINDS.includes(kind.id) ? `  "sheet": { "name": "The Pond Page", "tasks": [ { "do": "Match each word to its picture.", "emoji": "🔤", "paper": "draw one line", "say": "Match the word to the picture.", "childSays": "Duck — this one!" }, { "do": "Write the word in the boxes.", "emoji": "✏️", "paper": "ruled boxes", "boxes": 4, "say": "Sound it out, then write it.", "childSays": "p-o-n-d, pond." } ], "traceWords": ["pond", "duck", "swim"], "talkFrame": "In my pond there is ___.", "answerKey": ["duck", "pond", "swim"] },\n` : ''}${KID_QUIZ_KINDS.includes(kind.id) ? `  "quiz": { "name": "The Pond Quiz Show", "rounds": ["WARM-UP QUESTIONS", "PICTURE ROUND", "THE QUIZ", "THE CHILD ASKS"], "scoreLine": "ten points, and the duck takes the lead!", "master": "I read the question, you answer, and I tell you why you are right." },\n` : ''}${KID_DECK_KINDS.includes(kind.id) ? `  "deck": { "name": "The Pond Pack", "cards": [ { "word": "duck", "emoji": "🦆", "say": "What is this? It is a duck!", "childSays": "The duck swims in the pond.", "cue": "a duck on the water", "sentence": "My duck is in the bath.", "review": ["duck", "pond"] } ], "passes": ["the whole pack", "the ones that got away", "three from memory"], "scoreLine": "the whole pond pack, all by myself!", "master": "I read every card, you answer, and I say why you are right.", "spacing": ["tonight at dinner: the duck and the pond cards, said out loud", "tomorrow in the car: the three that got away", "in three days: the whole pack from memory"] },\n` : ''}${KID_QUEST_KINDS.includes(kind.id) ? `  "quest": { "name": "The Blue Finder", "partner": "a grown-up — or the pet", "jobs": [ { "do": "Bring something blue to a grown-up.", "emoji": "💙", "night": "night one", "xp": 10, "say": "Find me something blue!", "childSays": "Blue! Here it is!", "proof": "said aloud — the grown-up hears it" } ], "tally": "colour one star for every job — seven stars is the week", "reward": "the family picks the Saturday film together", "master": "I read every job out loud, choose the order, give the XP and write the proof." },\n` : ''}  "scene": { "title": "A real photograph to look at together", "photoQuery": "what to search for", "clipTitle": "A very short real clip", "clipUrl": "a real link or the site's own search page", "listenFor": "the one thing the child listens for while it plays" },
  "mission": { "title": "A real thing to do before the lesson ends", "realWorld": "where this happens in the child's week", "sayIt": "the EXACT sentence the child must produce to finish it", "steps": ["step 1", "step 2"] },
  "run": { "targetMinutes": 30, "brainBreaks": ["three short resets"], "exitTicket": ["three sentences the child can now say"], "nextTime": "where the next session starts" },
  "talkGoal": 40,
  "caregiverNote": "what the parent does at home this week, in the exact English words to say",
  "teacherNote": "anything the tutor must know before starting"
}
Must include: ${requiredKeys}.${optionalKeys ? ` Include when it fits: ${optionalKeys}.` : ''}
Leave out a key entirely rather than putting an empty string, empty array or "N/A" in it.`;
}

function profile_word(band: KidAgeBand): string {
  return KID_BANDS[band].label;
}

function pieceKey(piece: string): string {
  switch (piece) {
    case 'steps':
      return 'steps';
    case 'game':
      return 'game';
    case 'lyrics':
      return 'lyrics';
    case 'words':
      return 'words';
    case 'worksheet':
      return 'worksheet';
    case 'homework':
      return 'homework';
    case 'caregiverNote':
      return 'caregiverNote';
    default:
      return piece;
  }
}

/**
 * The prompt a tutor copies into any AI (ChatGPT, Gemini, Claude…).
 *
 * The child-specific half is regenerated every time the learner changes, so a lesson
 * always mentions *this* child's pet, interests and last session — that is the whole
 * reason to build it here instead of asking a general question.
 */
export function buildKidLessonPrompt(
  brief: KidLessonBrief,
  learner?: Learner,
  teacher?: TeacherProfile
): string {
  const { kind, band } = brief;
  const dials = brief.customization || DEFAULT_KID_LESSON_CUSTOMIZATION;
  const topic = brief.topic?.trim() || '';
  const vocab = (brief.vocabulary || '')
    .split(/[,\n;]/)
    .map((word) => word.trim())
    .filter(Boolean);
  const kindShape = kind.shape[band] || kind.shape.veryYoung || kind.shape.young || '';

  return `You are an early-years and primary language teacher, a children's songwriter and a play therapist, writing a real lesson for ONE child. You are brilliant at making a child laugh, move and talk, and you never make a small child feel tested.

──────────────────────────────────────────────────────────────────────────────
${firstStepBlock(band)}
──────────────────────────────────────────────────────────────────────────────
THE CHILD (from every profile tab: hero, pet, kingdom, quests, skills, family)
──────────────────────────────────────────────────────────────────────────────
  ${learnerSnapshot(learner)}

──────────────────────────────────────────────────────────────────────────────
THE TUTOR AND THE ROOM
──────────────────────────────────────────────────────────────────────────────
  Tutor: ${teacher?.characterName || 'the tutor'}${teacher?.teachingStyle ? ` — style: ${teacher.teachingStyle}` : ''}
  Setting: ${brief.setting || 'one-to-one, at a table or on the floor with the tutor beside the child'}

──────────────────────────────────────────────────────────────────────────────
WHAT TO BUILD
──────────────────────────────────────────────────────────────────────────────
  Lesson kind: ${kind.emoji} ${kind.label} — ${kind.blurb}
${topic ? `  The tutor's topic (use it — and still ask for their lesson text or PDF first): ${topic}` : '  Topic: it comes from the material the tutor sends; never invent one.'}
${vocab.length ? `  Words the tutor wants included (use these, exactly): ${vocab.join(', ')}` : '  Words: choose the smallest useful set yourself and keep it inside the band limit.'}
${brief.sourceText?.trim() ? `\n  Follow this material — it is the coursebook page, transcript or story the tutor is teaching. Use its own words, characters and exercise order, adapted to the age:\n"""\n${brief.sourceText.trim().slice(0, 6000)}\n"""` : ''}
${brief.notes?.trim() ? `\n  The tutor adds: ${brief.notes.trim()}` : ''}

${bandBlock(band)}
${brief.bandChosenDeliberately ? `  · The tutor has chosen the ${profile_word(band)} band for this child DELIBERATELY, even though the age above is outside it. Follow the band rules exactly as written and ignore the mismatch — do not compromise towards the older band.
` : ''}
  HOW THIS KIND OF LESSON SHOULD BE SHAPED FOR THIS BAND:
  ${kindShape}

  ${customizationBlock(dials)}

──────────────────────────────────────────────────────────────────────────────
${sessionBlock(band)}

──────────────────────────────────────────────────────────────────────────────
${KID_STORY_KINDS.includes(kind.id) ? `${storyBlock(band)}\n\n──────────────────────────────────────────────────────────────────────────────\n` : ''}${KID_PHONICS_KINDS.includes(kind.id) ? `${phonicsBlock(band)}\n\n──────────────────────────────────────────────────────────────────────────────\n` : ''}${KID_MOVEMENT_KINDS.includes(kind.id) ? `${movementBlock(band)}\n\n──────────────────────────────────────────────────────────────────────────────\n` : ''}${KID_ROUTINE_KINDS.includes(kind.id) ? `${routineBlock(band)}\n\n──────────────────────────────────────────────────────────────────────────────\n` : ''}${KID_CIRCLE_KINDS.includes(kind.id) ? `${circleBlock(band)}\n\n──────────────────────────────────────────────────────────────────────────────\n` : ''}${KID_SHEET_KINDS.includes(kind.id) ? `${sheetBlock(band)}\n\n──────────────────────────────────────────────────────────────────────────────\n` : ''}${KID_QUEST_KINDS.includes(kind.id) ? `${questBlock(band)}\n\n──────────────────────────────────────────────────────────────────────────────\n` : ''}${KID_QUIZ_KINDS.includes(kind.id) ? `${quizBlock(band)}\n\n──────────────────────────────────────────────────────────────────────────────\n` : ''}${KID_DECK_KINDS.includes(kind.id) ? `${deckBlock(band)}\n\n──────────────────────────────────────────────────────────────────────────────\n` : ''}${KID_STORY_WALK_KINDS.includes(kind.id) ? `${storyWalkBlock(band)}\n\n──────────────────────────────────────────────────────────────────────────────\n` : ''}${bestPracticeBlock(band)}

──────────────────────────────────────────────────────────────────────────────
${quantityBlock(band)}

──────────────────────────────────────────────────────────────────────────────
${freeMediaBlock(band)}

──────────────────────────────────────────────────────────────────────────────
OUTPUT
──────────────────────────────────────────────────────────────────────────────
  ${contractBlock(kind)}

  THE TUTOR WILL SAVE THIS AS THREE SIMPLE PAGES — before class, in class, and at home:
  · BEFORE CLASS = "materials", "worksheet", "objectives" and every media item with "where": "class"
    (what to print, cut, gather and check before the child arrives).
  · IN CLASS = "steps", "words", "game" and "lyrics" (what the tutor says and what the child does).
  · AT HOME = "homework", "caregiverNote" and every media item with "where": "home".
  Fill each so a tutor could pick up that page alone and use it.

  Return ONLY the JSON object in one code block, with no commentary before or after it, no trailing commas, and no placeholders — every line filled in for this child.

  Keep the shape honest: at most 3 objectives, at most ${band === 'veryYoung' ? 8 : 14} words, and six phases that really add up to 30 minutes — never pad, and never shorten past the floors.`;
}

/** A short "what to do with this" line for the UI, next to the copy button. */
export function promptNextSteps(kind: KidLessonKind, band: KidAgeBand): string[] {
  return [
    'Copy the prompt into ChatGPT, Gemini, Claude or any AI you use.',
    'Send it. The AI will ask you for the lesson text or PDF — send the page, the unit or the story, or paste its text. No material? Say so and give it your topic instead.',
    `When it replies with the ${kind.label}, copy the whole JSON block into Step 4 — the checker reads it back and shows exactly what is missing, field by field, if anything is.`,
    'It will also bring real, free links — a song, a clip or a game the class can tap. Every link has a search page behind it, so it still works if the exact page has moved.',
    'Then press ▶ Test to play it on screen, ✏️ Edit to cut or add any part, and 💾 Save as three simple pages: before class, in class, at home.',
    band === 'veryYoung'
      ? 'Read it out loud once yourself before the session: at this age the tutor is the audio track.'
      : 'Check the words are ones the learner already half-knows; one brand-new word per lesson is plenty.',
  ];
}

/** Which band the form should start on, given the learner's age. */
export function defaultBand(learner?: Learner): KidAgeBand {
  return bandForAge(learner?.age);
}
