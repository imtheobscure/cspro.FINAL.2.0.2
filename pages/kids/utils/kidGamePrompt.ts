/* ════════════════════════════════════════════════════════════════════════════
   🎮 GAME STUDIO — the copy-prompt pipeline
   ════════════════════════════════════════════════════════════════════════════

   Same shape as the lesson pipeline, with three differences that matter:

   * **One engine per game.** The prompt names the player the tutor picked and gives the
     *exact* field contract for it (`kidGameCatalog.shape`), because the paste box checks
     against those fields. A model that improvises a shape produces a game that cannot be
     played, which is worse than one that fails loudly.
   * **Playability is checked, not assumed.** `validateRound` knows what each engine needs
     to run — options and a correct answer, pairs, buckets with items, a sentence order,
     story branches — and reports *which round* is unplayable and why. It also repairs the
     cheap mistakes (a very-young round carrying points, answers the same shape as
     distractors) instead of rejecting a whole game for one stray field.
   * **The band is stated twice.** Once as the prohibitions the lesson prompt uses, once as
     the game-specific rules from the catalogue (`bandRules`) — because the failure mode
     here is different: a model asked for "a game for a 3-year-old" will happily write a
     scored quiz with printed options, which this pipeline must never let onto a screen.
   ════════════════════════════════════════════════════════════════════════════ */

import type { Learner, TeacherProfile } from '../types';
import type { LessonActivity } from './flipbookTypes';
import { KID_BANDS, describeKidJsonError, type KidAgeBand } from './lessonCreatorTypes';
import type { KidGame, KidGameMedia, KidGameScript } from './kidGameCatalog';
import { bandBlock, learnerSnapshot } from './lessonCreatorPrompt';

export interface KidGameBrief {
  game: KidGame;
  topic: string;
  /** Words the tutor insists on, comma or newline separated. */
  words?: string;
  /** The text, page or story the game must review. */
  sourceText?: string;
  notes?: string;
}

/** Human name for a round, so error messages can point at one. */
const roundName = (round: LessonActivity, index: number) =>
  `round ${index + 1}${round?.prompt ? ` ("${String(round.prompt).slice(0, 40)}")` : ''}`;

/**
 * What each engine needs before it can run a single round.
 * Mirrors the reads in `components/flipbook/ActivityComponents.tsx`.
 */
function validateRound(round: any, index: number, game: KidGame): string[] {
  const problems: string[] = [];
  const isArray = (v: any) => Array.isArray(v) && v.length > 0;
  const push = (message: string) => problems.push(`${roundName(round, index)}: ${message}`);

  if (!round || typeof round !== 'object') return [`round ${index + 1} is not an object.`];
  if (round.type !== game.engine) problems.push(`round ${index + 1} is type "${round.type}" but this game plays with "${game.engine}".`);
  if (!round.prompt) push('it has no "prompt" — the question the tutor reads out.');

  switch (game.engine) {
    case 'multipleChoice':
    case 'listenChoose': {
      if (!isArray(round.options)) push('"options" is missing or empty.');
      else if (round.options.length < 2) push('it needs at least 2 options.');
      if (round.correct === undefined) {
        const hasFlagged = Array.isArray(round.options) && round.options.some((o: any) => o && typeof o === 'object' && o.isCorrect);
        if (!hasFlagged) push('it has no "correct" answer (and no option is marked "isCorrect": true).');
      }
      break;
    }
    case 'speakRepeat':
      if (!round.readAloudText && !round.prompt) push('it needs "readAloudText" — the word the player says.');
      break;
    case 'songKaraoke':
      if (!isArray(round.lyrics)) push('"lyrics" is missing — the song has no lines.');
      else if (round.lyrics.length < 2) push('a song needs at least 2 lines.');
      break;
    case 'realLifeMission':
      if (!isArray(round.checklist)) push('"checklist" is missing — there are no commands to do.');
      break;
    case 'dragDropSort':
      if (!isArray(round.items)) push('"items" is missing — nothing to sort.');
      if (!isArray(round.categories)) push('"categories" is missing — there are no buckets.');
      else {
        round.categories.forEach((cat: any, i: number) => {
          if (!cat || typeof cat !== 'object') problems.push(`round ${index + 1}: bucket ${i + 1} is not an object.`);
          else if (!isArray(cat.items)) problems.push(`round ${index + 1}: bucket "${cat.name || i + 1}" has no items.`);
        });
      }
      break;
    case 'memoryMatch':
    case 'flashcardTrainer':
      if (!isArray(round.pairs)) push('"pairs" is missing — there is nothing to match.');
      break;
    case 'spellingBee':
      if (!isArray(round.items) && !round.word) push('"items" is missing — no words to spell.');
      break;
    case 'sentenceBuilder':
      if (!isArray(round.correctOrder)) push('"correctOrder" is missing — there is no sentence to build.');
      break;
    case 'storyChoice':
      if (!isArray(round.storyChoices)) push('"storyChoices" is missing — there are no paths to choose.');
      else if (round.storyChoices.length < 2) push('a choice round needs at least 2 options.');
      break;
    case 'oddOneOut':
      if (!isArray(round.options) || round.options.length < 3) push('it needs at least 3 options to pick an odd one from.');
      if (!round.odd) push('it has no "odd" — the answer the child should find.');
      break;
    case 'spinWheel':
      if (!isArray(round.options) || round.options.length < 3) push('the wheel needs at least 3 segments ("options").');
      break;
    case 'wordSearch':
      if (!isArray(round.gridWords)) push('"gridWords" is missing — there are no words hidden in the grid.');
      break;
    case 'trueFalse':
      if (typeof round.correct !== 'boolean') push('"correct" must be true or false.');
      break;
    case 'balloonPop': {
      if (!round.word) push('it needs a "word" — the target the child must pop.');
      if (!isArray(round.options) || round.options.length < 3) push('it needs at least 3 balloons ("options").');
      else if (round.word) {
        const labels = round.options.map((o: any) => (typeof o === 'object' && o ? String(o.text ?? '') : String(o)).trim());
        if (!labels.includes(String(round.word).trim())) push('the target "word" must also appear in "options", written exactly the same way.');
      }
      break;
    }
    case 'bingoListener':
      if (!isArray(round.options) || round.options.length < 5) push('a bingo board needs 6-9 pictures ("options").');
      break;
    case 'rhymeMatch':
      if (!isArray(round.pairs) || round.pairs.length < 3) push('it needs at least 3 rhyming pairs ("pairs").');
      break;
    case 'syllableCount':
      if (!isArray(round.syllables)) push('"syllables" is missing — there are no words to clap.');
      else
        round.syllables.forEach((s: any, i: number) => {
          if (!s || typeof s !== 'object') problems.push(`round ${index + 1}: syllable item ${i + 1} is not an object.`);
          else if (!s.word) problems.push(`round ${index + 1}: syllable item ${i + 1} has no "word".`);
          else if (!Number.isFinite(Number(s.count)) || Number(s.count) < 1) problems.push(`round ${index + 1}: "${s.word}" has no usable "count" of syllables.`);
        });
      break;
    case 'whackAMole':
      if (!round.word) push('it needs a "word" — the target the child hits.');
      if (!isArray(round.options) || round.options.length < 3) push('it needs 3-5 decoy words in "options".');
      break;
    default:
      break;
  }
  return problems;
}

/**
 * Repairs the small mistakes a model makes even when the shape is right.
 *
 * Everything here is *safe* to change: none of it alters what the game teaches. A score on
 * a two-year-old's round and a "wrong" that insults a child are both band violations rather
 * than content errors, so they are fixed and reported instead of blocking a playable game.
 */
function repairRound(round: any, game: KidGame): string[] {
  const fixes: string[] = [];
  if (game.band === 'veryYoung') {
    if (round.points) {
      round.points = 0;
      fixes.push('removed the score from a Very Young round (2-5 is never scored).');
    }

    /* A pre-reader is hurt by a WALL OF OPTIONS they must compare, but only on an
       engine where the whole task is choosing between pictures. On a balloon-pop
       board or a bingo card the extra pictures ARE the game, and the catalogue's
       own band rules ask for them (3-4 balloons; a 6-9 picture board). Cutting a
       bingo board to three pictures does not make it easier for a two-year-old —
       it makes it unplayable, because the engine needs six. So the ceiling
       applies to exactly the engines it was reasoned about. */
    const capAtThree = game.engine === 'multipleChoice' || game.engine === 'listenChoose';
    if (/\b(wrong|incorrect|no!|try harder)\b/i.test(String(round.feedbackIncorrect || ''))) {
      round.feedbackIncorrect = 'Nearly! Let\'s try it again 💛';
      fixes.push('softened a "wrong" message — at this age the answer is "not yet".');
    }

    /* The two rules that can be fixed WITHOUT inventing content.

       An option with no picture can be given a neutral placeholder the tutor can
       see and replace, and a five-option round can be cut to three. Both are
       reported loudly rather than done silently: a repaired round is still a
       round a human should look at before thirty children watch it.

       What is deliberately NOT done here is guessing an emoji for a word. A wrong
       picture on a quiz is worse than a missing one — a child points at the
       rabbit because we guessed — so an unpictured option keeps its text and is
       flagged instead. */
    if (capAtThree && Array.isArray(round.options) && round.options.length > 3) {
      const before = round.options.length;
      const correctText = String(round.correct ?? '').trim();
      const kept = round.options.slice(0, 3);
      // Never cut away the answer — a 3-option quiz with no correct option is
      // worse than the 5 it replaced, so the correct one is swapped back in.
      const hasCorrect = kept.some((o: any) =>
        String(typeof o === 'object' && o !== null ? o.text ?? '' : o).trim() === correctText,
      );
      if (correctText && !hasCorrect) {
        const correctOpt = round.options.find((o: any) =>
          String(typeof o === 'object' && o !== null ? o.text ?? '' : o).trim() === correctText,
        );
        if (correctOpt) kept[kept.length - 1] = correctOpt;
      }
      round.options = kept;
      fixes.push(`cut the options down to 3 for 2-5 (was ${before}); three is the working-memory ceiling at this age.`);
    }
  }
  if (game.engine === 'multipleChoice' && Array.isArray(round.options) && typeof round.correct === 'string') {
    const texts = round.options.map((o: any) => (typeof o === 'object' && o ? String(o.text ?? '') : String(o)));
    if (!texts.some((t) => t.trim().toLowerCase() === round.correct.trim().toLowerCase())) {
      // The engine falls back to the first option when nothing matches, which would
      // silently make every answer "the first one". Point the correct answer at the
      // option that reads most like it instead.
      const match = texts.find((t) => t.toLowerCase().includes(round.correct.toLowerCase()));
      if (match) {
        round.correct = match;
        fixes.push('pointed "correct" at the option that matches its text.');
      }
    }
  }
  return fixes;
}

export interface KidGameParseResult {
  ok: boolean;
  error?: string;
  script?: KidGameScript;
  summary?: string;
  problems?: string[];
  fixes?: string[];
}

/** Fences, chatty preambles and a bare array of rounds are all accepted. */
export function cleanKidGameJson(text: string): string {
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const start = cleaned.search(/[{[]/);
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned;
}

/**
 * The band rules the validator enforces, and *why* each one is a rule.
 *
 * This used to be two lines inside `repairRound` (strip the score, soften the
 * word "wrong"). That was not enough, because the failure mode of this pipeline
 * is not malformed JSON — it is a **well-formed, perfectly playable game that is
 * wrong for the child's age**. A model asked for "a game for a 3-year-old" will
 * happily return four text options, a points value and a "Wrong!" message, and
 * every one of those is a contract with the child rather than a formatting bug.
 *
 * So the band rules are checked as *content*, and they are checked separately
 * from playability. A round can be playable and still be an insult to a
 * four-year-old, and that is the failure worth catching.
 *
 * The rules, in the order they are applied:
 *
 *  · **No printed word for a pre-reader.** At 2-5 a printed word is a picture of
 *    a word, not a message. Every option must lead with an emoji or a picture, so
 *    the child can answer without reading anything. This is the single most
 *    important rule in the file.
 *  · **No score.** Not a small score — none. A 3-year-old cannot lose in front of
 *    the class, and a number on screen invites an adult to say "who's behind?".
 *  · **Not "wrong".** The harshest permitted line is "Nearly — try again".
 *  · **Too many options.** Three pictures is already a working memory task at
 *    this age; four or more reliably produces a guess.
 */
function validateBandCompliance(round: any, index: number, game: KidGame): string[] {
  if (game.band !== 'veryYoung') return [];
  const problems: string[] = [];
  const push = (message: string) => problems.push(`${roundName(round, index)}: ${message}`);
  const where = roundName(round, index);

  // 1 · Nothing to read. An option the child has to decode is not an option at
  //     this age, however short the word is.
  if (Array.isArray(round.options)) {
    const bare = round.options.filter((o: any) => {
      const text = typeof o === 'object' && o !== null ? String(o.text ?? '') : String(o);
      // An object option carrying its own image is fine — the image is the label.
      if (typeof o === 'object' && o !== null && o.imageUrl) return false;
      return !/\p{Extended_Pictographic}/u.test(text);
    });
    if (bare.length) {
      problems.push(
        `${where}: ${bare.length} option${bare.length === 1 ? ' has' : 's have'} no picture. At 2-5 the child cannot read, so every option must start with an emoji — add one to: ${bare
          .map((o: any) => `"${typeof o === 'object' && o !== null ? o.text : o}"`)
          .join(', ')}.`,
      );
    }
    /* Only the picture-choice engines, and only because the child has to COMPARE
       three pictures and hold them in mind. A balloon-pop or bingo board is not a
       comparison task, and the catalogue asks for more pictures there. */
    const compareTask = game.engine === 'multipleChoice' || game.engine === 'listenChoose';
    if (compareTask && round.options.length > 3) {
      problems.push(`${where}: ${round.options.length} options is too many for 2-5. Three is already a working-memory task — cut to 3.`);
    }
  }

  // 2 · A printed question is the same problem on the prompt itself.
  if (round.prompt && !/\p{Extended_Pictographic}/u.test(String(round.prompt))) {
    // Not fatal on its own — a tutor may well say the question — so this is only
    // flagged when the prompt is long enough to be a sentence rather than a nudge.
    if (String(round.prompt).trim().split(/\s+/).length > 4) {
      problems.push(`${where}: the prompt reads as a sentence for a child who cannot read. Keep it to one or two words plus a picture — the tutor says the question out loud.`);
    }
  }

  return problems;
}

/**
 * Reads an AI reply into a playable game.
 *
 * The order matters: shape first (is it JSON at all), then engine by engine (can this
 * round actually run), then the band repairs, then a summary the tutor can trust.
 */
export function parseKidGame(text: string, game: KidGame): KidGameParseResult {
  const cleaned = cleanKidGameJson(text);
  if (!cleaned) return { ok: false, error: 'Paste the AI’s reply first — the whole { … } block.' };

  let raw: any;
  try {
    raw = JSON.parse(cleaned);
  } catch (e: any) {
    const help = describeKidJsonError(cleaned, String(e?.message || 'check for a missing comma or quote'));
    return { ok: false, error: help.error, problems: help.problems };
  }

  /* A bare array of rounds is a common reply; wrap it rather than reject it. */
  const roundsRaw = Array.isArray(raw) ? raw : raw.rounds ?? raw.activities ?? raw.roundsList;
  if (!Array.isArray(roundsRaw) || !roundsRaw.length) {
    return {
      ok: false,
      error:
        'No rounds found. The reply needs a "rounds" array — one object per screen, each with a "type" of "' +
        game.engine +
        '" and its own content.',
    };
  }

  const problems: string[] = [];
  roundsRaw.forEach((round: any, i: number) => {
    round.type = round.type || game.engine; // the whole script is one game; a missing type is the picked engine
    problems.push(...validateRound(round, i, game));
  });

  /* Age-appropriateness is checked on the ORIGINAL round, before the repairs run.
     The repairs deliberately leave unpictured options alone (a guessed emoji is
     worse than a missing one), so a band problem that was repairable is gone by
     the time the repair pass finishes and the tutor would never be told. Checking
     first means every violation is reported at least once. */
  const bandProblems: string[] = [];
  roundsRaw.forEach((round: any, i: number) => {
    bandProblems.push(...validateBandCompliance(round, i, game));
  });

  const fixes: string[] = [];
  roundsRaw.forEach((round: any) => fixes.push(...repairRound(round, game)));

  /* Unplayable rounds are dropped rather than blocking the game: a tutor with four good
     rounds and one broken one should be able to play now and fix later.

     A band violation alone does NOT drop a round. Dropping a round because an
     option is missing a picture would leave a tutor with a game that is correct
     but shorter than they asked for, which reads as the app losing their work.
     The round stays, the warning is shown, and the tutor decides. */
  const playable = roundsRaw.filter((_round: any, i: number) => !validateRound(_round, i, game).length);

  if (!playable.length) {
    return {
      ok: false,
      error: `None of the ${roundsRaw.length} rounds can be played yet.`,
      problems,
    };
  }

  const script: KidGameScript = {
    title: String(raw.title ?? raw.name ?? game.label).trim() || game.label,
    gameId: game.id,
    band: game.band,
    topic: raw.topic ? String(raw.topic) : undefined,
    howToPlay: raw.howToPlay ?? raw.instructions ? String(raw.howToPlay ?? raw.instructions) : game.noScreen,
    plenary: Array.isArray(raw.plenary) ? raw.plenary.map((p: any) => String(p)).filter(Boolean).slice(0, 4) : undefined,
    rounds: playable as LessonActivity[],
  };

  const dropped = roundsRaw.length - playable.length;
  const bits = [
    `${playable.length} playable round${playable.length === 1 ? '' : 's'}`,
    dropped ? `${dropped} dropped` : '',
    fixes.length ? `${fixes.length} fixed` : '',
    bandProblems.length ? `${bandProblems.length} age warning${bandProblems.length === 1 ? '' : 's'}` : '',
  ].filter(Boolean);

  /* Band warnings are prefixed so the tutor can tell "this will not run" from
     "this will run, but a 3-year-old cannot read it". They are surfaced on the
     result rather than swallowed, because silently downgrading a scored quiz to
     an unscored one and saying nothing would leave the tutor believing the class
     sees a score when it does not. */
  const allProblems = [...problems, ...bandProblems.map((p) => `⚠️ AGE: ${p}`)];

  return {
    ok: true,
    script,
    summary: bits.join(' · '),
    problems: allProblems.length ? allProblems : undefined,
    fixes: fixes.length ? fixes : undefined,
  };
}

/**
 * Tells the AI what the app will do with its words *after* it returns them.
 *
 * This block exists because of a design decision that is invisible to a model: the
 * app fetches its OWN real photographs, human recordings and emoji art at runtime
 * (see `kidFreeMedia.ts`), keyed off the plain words in the round. So the AI does
 * not need to invent URLs at all — and in fact should not, because a guessed URL
 * 404s on a projector at the worst possible moment.
 *
 * The practical effect is that a model which writes clean, plain nouns ("duck",
 * "elephant") gets hyper-realistic lessons for free, while one that writes
 * decorative or abstract text ("a joyful mystery") gets the emoji fallback. The
 * prompt therefore teaches the model to write *photographable* nouns, which is a
 * vocabulary instruction rather than a formatting one.
 *
 * The two bands get genuinely different advice, because what earns its place on a
 * screen differs by age:
 *
 *  · **Very young** — the picture is the lesson. Nouns must be concrete, common
 *    and nameable by a photo (animals, food, toys, body parts, weather). Abstract
 *    words cannot be photographed, and a pre-reader cannot decode them either, so
 *    they fail twice. The audio is deliberately *not* promised here: a
 *    two-year-old cannot wait for a recording to load, so the browser's own voice
 *    carries the sound.
 *  · **Young** — the word, its sound and its written form can all be on screen at
 *    once, so longer and more precise words are welcome, and the recording plus
 *    IPA become real gains rather than clutter.
 */
function mediaRulesFor(band: KidAgeBand, media?: KidGameMedia): string {
  const shared = `MEDIA THE APP FETCHES FOR YOU (so do NOT invent image URLs):
  · A real photograph of each word is looked up at runtime from Wikimedia Commons and Openverse.
    It appears automatically, with its licence and credit shown on screen.
  · Emoji are rendered as crisp SVG (Twemoji), so your emoji look identical on every laptop.
  · A blocked word gets NO photograph (the app screens for child-appropriateness first).`;

  /* When the game's whole task is identifying a thing, the wording of the round
     decides whether a photograph appears at all, so the instruction is about the
     WORDS rather than the formatting. This is the difference between "write an
     emoji list" and "write one photographable concrete noun per option", and only
     the second one produces a recognisable duck. */
  if (media === 'essential') {
    return `${shared}
  · This game works by the child RECOGNISING the thing, so every option must be one
    concrete, photographable noun: duck, apple, elephant, rain. Write the option as
    "emoji + one noun" (e.g. "🦆 duck") — the noun is what the photograph is found by.
    Abstract or descriptive text (a happy feeling, the big river horse) will get no
    photograph and no picture of the right thing.`;
  }

  if (band === 'veryYoung') {
    return `${shared}
  · WRITE PHOTOGRAPHABLE NOUNS: one common concrete word a photo can show — duck, apple, hat, rain.
    Avoid abstract words (happy, quick, idea) — nothing can photograph them.
  · Every option must begin with an emoji. A child at 2-5 cannot read, so the emoji IS the label.
  · Exactly THREE options per round. Four or more becomes a guessing game.
  · Do NOT rely on a URL for the sound: the tutor's own voice is the audio at this age.`;
  }

  return `${shared}
  · This game works on the WRITTEN word, so keep the spellings exact and checkable.
  · Longer, more precise words are welcome — the child can read, and a real recording plus
    the phonetic spelling will appear beside the word automatically.
  · The words must be real, checkable English. The app cannot photograph an invented word,
    so a made-up word silently falls back to an emoji and teaches nothing.
  · Prefer the exact word the lesson is about over a decorative synonym: "hippopotamus", not
    "the big river horse".`;
}

/**
 * The prompt a tutor copies for a game.
 *
 * Written for one game and one band, and it says so in the first line — models drifted
 * between bands whenever the request was even slightly ambiguous.
 */
export function buildKidGamePrompt(
  brief: KidGameBrief,
  learner?: Learner,
  teacher?: TeacherProfile
): string {
  const { game } = brief;
  const band = KID_BANDS[game.band];
  const topic = brief.topic.trim() || 'the topic the tutor has below — ask for it if it is missing';
  const words = (brief.words || '')
    .split(/[,\n;]/)
    .map((w) => w.trim())
    .filter(Boolean);

  return `You are writing ONE screen game for a real lesson, played on a projector or a shared screen by a teacher with a class of children aged ${game.ages}. You are an early-years/primary games designer with a deep grounding in child development. Everything a child sees must be readable from the back of a room.

──────────────────────────────────────────────────────────────────────────────
THE GAME (do not change it)
──────────────────────────────────────────────────────────────────────────────
  ${game.emoji} ${game.label} — played by the "${game.engine}" engine.
  What the child does: ${game.interaction}
  Why this game at this age: ${game.why}
  How many rounds: ${game.rounds}
  Length of the whole game on screen: about ${game.minutes} minutes.

──────────────────────────────────────────────────────────────────────────────
THE CHILD
──────────────────────────────────────────────────────────────────────────────
  ${learnerSnapshot(learner)}

  Tutor: ${teacher?.characterName || 'the tutor'}${teacher?.teachingStyle ? ` — style: ${teacher.teachingStyle}` : ''}

──────────────────────────────────────────────────────────────────────────────
WHAT IT IS ABOUT
──────────────────────────────────────────────────────────────────────────────
  Topic / target: ${topic}
${words.length ? `  Words to use (exactly these): ${words.join(', ')}` : '  Words: choose the smallest useful set for this age.'}
${brief.sourceText?.trim() ? `\n  Review this material — keep its words, characters and order:\n"""\n${brief.sourceText.trim().slice(0, 5000)}\n"""` : ''}
${brief.notes?.trim() ? `\n  The tutor adds: ${brief.notes.trim()}` : ''}

${bandBlock(game.band)}

  RULES THAT DECIDE WHETHER THIS GAME CAN BE PLAYED AT ALL:
  ${game.bandRules}

  VISIBILITY RULES (a class is watching a screen, not holding a phone):
  1. Everything a child reads must be 1-3 words, except quiz options which may be a short sentence of at most 6 words.
  2. Give every child-facing item an emoji or a picture, and make it a big, unmistakable one — an emoji is the image.
  3. Never describe a picture the child cannot see. Do not say "look at the picture" unless the round has an emoji for it.
  4. Feedback lines are at most 8 words, warm, and about the effort: "Nearly — try again 💛" is right, "Wrong" or "0 points" is never right.
  5. If you set "imageUrl" on an option, it must be a stable, free, hotlinkable SVG/PNG (Wikimedia Commons, Openclipart, Twemoji on jsDelivr). Leave it out rather than guessing a URL that may 404 — the emoji is the fallback and it always works.
  6. EVERY round must carry "heroEmoji": exactly one emoji that is the round's poster — the biggest thing on the screen. It sets the scene (🚜 for a farm quiz, 🏫 for a school story) and it must never be the round's answer.
  7. "posterImageUrl" may replace that emoji only if you have a real, stable, free SVG/PNG of the scene (Wikimedia Commons or Openclipart). Use it at most twice in a whole game, and never on a round whose answer is a picture — the poster would give it away.

  ${mediaRulesFor(game.band, game.media)}

──────────────────────────────────────────────────────────────────────────────
OUTPUT
──────────────────────────────────────────────────────────────────────────────
  Return ONLY this JSON in one code block, nothing before or after it:
{
  "title": "child-friendly game title, 2-5 words",
  "gameId": "${game.id}",
  "band": "${game.band}",
  "topic": "${topic}",
  "howToPlay": "2-3 sentences telling the TUTOR how to run it in the room: who answers, how turns pass, what to do when a child is stuck.",
  "plenary": ["what to say at the end, win or lose"],
  "rounds": [ ONE OBJECT PER ROUND, IN THIS EXACT SHAPE ]
}

  Each round object must use the fields this engine reads:
  ${game.shape}

  …and every round also carries "heroEmoji" (one emoji, the round's poster on screen).

  Make ${game.rounds.startsWith('One') || game.rounds.startsWith('1') ? 'the number of rounds stated above' : game.rounds.split(',')[0]}. Fill EVERY field in for this child's topic — no placeholders, no "TBD", no example text left in.`;
}
