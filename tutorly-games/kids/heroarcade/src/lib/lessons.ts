import type { Lang, Theme } from '../data/types';

/**
 * LESSON PLANS — the "copy an AI prompt, paste the JSON back" feature.
 *
 * HeroArcade could already make a new THEME with AI (the Builder screen): a
 * category with words, CCQs and a hero story. What it could not make was a
 * LESSON — the order a tutor actually teaches in. A 51-theme app with eight
 * speaking games per theme still leaves the tutor to decide what to do for the
 * next twenty minutes, and that is exactly the part an AI is good at.
 *
 * A plan is deliberately small and boring: a title, a goal, a word list, and 4–6
 * timed steps. Each step names ONE activity the app already has (the dictionary,
 * the CCQ cards, the chant, the story, or one of the eight games), the exact
 * words the tutor says, the questions to ask, and a tip for the adult. The reader
 * therefore never plays a "video" — it just walks the tutor through the app that
 * is already on screen, and every step is a button that opens the real activity.
 *
 * Every theme also gets a plan with no AI involved (`basePlan`), written from the
 * theme's own words, CCQs and story, so the feature is useful before anyone
 * copies a single prompt.
 */

export const ACTIVITY_LABELS: Record<string, { label: string; icon: string }> = {
  dictionary: { label: 'Dictionary', icon: '📚' },
  talk: { label: 'CCQ Talk', icon: '💬' },
  chant: { label: 'Chant', icon: '🎵' },
  quiz: { label: 'Quiz', icon: '❓' },
  matching: { label: 'Matching', icon: '🧩' },
  story: { label: 'Story', icon: '📖' },
  games: { label: 'Speaking Games', icon: '🎮' },
  dragon: { label: 'Dragon Feeder', icon: '🐉' },
  radio: { label: 'Walkie-Talkie', icon: '📻' },
  puppet: { label: 'Puppet Theater', icon: '🎭' },
  market: { label: 'Marketplace', icon: '🏪' },
  maze: { label: 'Voice Maze', icon: '🧭' },
  detective: { label: 'Detective', icon: '🕵️' },
  telephone: { label: 'Telephone Monsters', icon: '👾' },
  rocket: { label: 'Rocket Boosters', icon: '🚀' },
};

export const ACTIVITY_IDS = Object.keys(ACTIVITY_LABELS);

export type PlanStep = {
  title: string;
  activity: string;
  say: string;
  ask?: string[];
  words?: string[];
  tutor?: string;
  minutes?: number;
};

export type LessonPlan = {
  id: string;
  theme: string;
  title: string;
  goal: string;
  minutes: number;
  words: string[];
  steps: PlanStep[];
  /** true when the plan was pasted in rather than written by the app. */
  custom?: boolean;
  /** true when the plan needs no AI and is written from the theme itself. */
  builtin?: boolean;
};

/* ─────────────────────────── the generated plan ─────────────────────────── */

/**
 * A complete plan written from the theme alone: no AI, no network, no waiting.
 * It is what the tutor sees before they have pasted anything, and it stays
 * available afterwards so a plan is never a dead end.
 */
export function basePlan(theme: Theme, lang: Lang): LessonPlan {
  const words = theme.words.slice(0, 12);
  const first = words.slice(0, 4);
  const second = words.slice(4, 8);
  const title = theme.title[lang] ?? theme.title.en;
  const name = (i: number) => words[i]?.t[lang] ?? words[i]?.t.en ?? '';
  return {
    id: `base-${theme.id}`,
    theme: theme.id,
    title: `${title} · first lesson`,
    goal: `Meet ${Math.min(words.length, 8)} words from ${title}, say them out loud, and use them in a short conversation.`,
    minutes: 12,
    words: words.map((w) => w.id),
    builtin: true,
    steps: [
      {
        title: 'Hello & warm up',
        activity: 'dictionary',
        minutes: 2,
        say: `Hello! Today we play with ${title}. Listen first, then say it with me.`,
        ask: ['How are you today?', 'Are you ready to play?'],
        tutor: 'Open the dictionary and start the flashcards. Let the learner hear each word before saying it.',
        words: first.slice(0, 2).map((w) => w.id),
      },
      {
        title: 'Say the new words',
        activity: 'dictionary',
        minutes: 3,
        say: `${name(0)}. Your turn: ${name(0)}.`,
        ask: [`Can you say “${name(1)}”?`, `Show me “${name(2)}”!`, `Is it big or small?`],
        tutor: 'One word at a time, with a full five seconds of silence after each. Use the repeat microphone when the learner is ready.',
        words: first.map((w) => w.id),
      },
      {
        title: 'Ask & answer',
        activity: 'talk',
        minutes: 3,
        say: theme.talk[0] ?? 'Tell me about it.',
        ask: theme.talk.slice(0, 3),
        tutor: 'Read the question, wait, and let the learner answer in a full sentence. Every attempt counts.',
        words: second.map((w) => w.id),
      },
      {
        title: 'Play together',
        activity: 'quiz',
        minutes: 2,
        say: 'Let’s play! Listen to the question and choose the right picture.',
        ask: ['Which one is it?', 'Why did you choose that one?'],
        tutor: 'Play the quiz, then hand the tablet over and let the learner ask YOU a question.',
        words: words.map((w) => w.id),
      },
      {
        title: 'Story time',
        activity: 'story',
        minutes: 2,
        say: `${theme.story.title}. Listen and look at the pictures.`,
        ask: ['What happened first?', 'What happens next?'],
        tutor: 'Read a page, then ask the learner to retell it in their own words.',
        words: second.map((w) => w.id),
      },
      {
        title: 'Chant & goodbye',
        activity: 'chant',
        minutes: 1,
        say: 'Let’s chant it one last time, then we say goodbye!',
        ask: ['What was your favourite word today?'],
        tutor: 'Clap on the beat. Finish on a high note — the last minute decides whether they want another lesson.',
      },
    ],
  };
}

/* ───────────────────────────── the AI prompt ───────────────────────────── */

export function buildPlanPrompt(theme: Theme, lang: Lang, topic?: string): string {
  const wordList = theme.words.map((w) => `${w.id} (${w.t.en}${w.t[lang] !== w.t.en ? ` / ${w.t[lang]}` : ''})`).join(', ');
  const example = {
    id: 'first-lesson',
    theme: theme.id,
    title: `${theme.title.en} · speaking lesson`,
    goal: 'Say eight new words out loud and use them in three short conversations.',
    minutes: 12,
    words: theme.words.slice(0, 8).map((w) => w.id),
    steps: [
      {
        title: 'Hello & warm up',
        activity: 'dictionary',
        minutes: 2,
        say: 'Hello! Today we play with new words. Listen first, then say it with me.',
        ask: ['How are you today?', 'Are you ready?'],
        tutor: 'Let the learner hear the word before saying it.',
        words: theme.words.slice(0, 2).map((w) => w.id),
      },
      {
        title: 'Play the quiz',
        activity: 'quiz',
        minutes: 3,
        say: 'Let’s play! Listen to the question and choose the right picture.',
        ask: ['Which one is it?'],
        tutor: 'Let the learner run the game and ask you a question afterwards.',
        words: theme.words.slice(0, 4).map((w) => w.id),
      },
    ],
  };

  return `You are an expert tutor of bilingual lessons for children aged 6–12 (the Tutorly HeroArcade app).

Write ONE ready-to-teach LESSON PLAN${topic ? ` about "${topic}"` : ''} for the theme "${theme.title.en}" (id "${theme.id}").

Return ONLY valid JSON — no markdown fences, no comments, no explanation — exactly matching this schema:

${JSON.stringify(example, null, 2)}

The theme's words (id (English / learning language)): ${wordList}

Rules:
1. "theme": must stay "${theme.id}".
2. "title" and "goal": a short friendly title and one sentence describing what the learner will be able to do.
3. "minutes": a realistic total for ages 6–12, between 8 and 20.
4. "words": 6 to 12 ids, copied EXACTLY from the list above. Never invent a word id.
5. "steps": 4 to 6 steps, in teaching order, whose "minutes" add up to "minutes".
6. Every step needs:
   - "activity": exactly one of ${ACTIVITY_IDS.join(', ')}. Choose what the step really needs: "dictionary" to present words, "talk" for CCQ conversation, "chant" for pronunciation practice, "story" for reading, "quiz"/"matching" for checking, and one of the speaking games (dragon, radio, puppet, market, maze, detective, telephone, rocket) for free speaking.
   - "title": 2–4 words.
   - "minutes": a whole number.
   - "say": the exact words the tutor says to the child — warm, simple, spoken language, with the target words in it.
   - "ask": 1 to 3 concept-check questions a tutor can ask out loud.
   - "tutor": one practical tip for the adult (how long to wait, what to model, what to accept).
   - "words": the word ids used in this step (from the list above).
7. Vary the activities: do not use the same activity for more than two steps.
8. Simple, kind, positive and safe. No scores, no pressure, no scary content, no more than 14 words in a sentence.
9. Output nothing except the JSON object.`;
}

export const EXAMPLE_PLAN = (theme: Theme) =>
  JSON.stringify(
    {
      id: `${theme.id}-speaking`,
      theme: theme.id,
      title: `${theme.title.en} · speaking lesson`,
      goal: 'Say the new words out loud and use them in a short conversation.',
      minutes: 12,
      words: theme.words.slice(0, 8).map((w) => w.id),
      steps: [
        {
          title: 'Warm up',
          activity: 'dictionary',
          minutes: 2,
          say: 'Hello! Today we play with new words. Listen first, then say it with me.',
          ask: ['How are you today?'],
          tutor: 'Let the learner hear each word before saying it.',
          words: theme.words.slice(0, 2).map((w) => w.id),
        },
        {
          title: 'Free speaking',
          activity: 'detective',
          minutes: 4,
          say: 'Now you are the detective. Ask me two questions!',
          ask: ['Who took it?', 'Where were you?'],
          tutor: 'Answer in character; let the learner lead.',
          words: theme.words.slice(0, 4).map((w) => w.id),
        },
        {
          title: 'Chant & goodbye',
          activity: 'chant',
          minutes: 1,
          say: 'Let’s chant it one last time!',
          ask: ['What was your favourite word?'],
          tutor: 'Clap on the beat and finish smiling.',
          words: theme.words.slice(0, 3).map((w) => w.id),
        },
      ],
    },
    null,
    2,
  );

/* ─────────────────────────────── parsing ─────────────────────────────── */

export type PlanResult =
  | { ok: true; plan: LessonPlan; warnings: string[] }
  | { ok: false; error: string };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const slug = (v: unknown, fallback: string) =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;

export function parsePlan(text: string, theme: Theme): PlanResult {
  let raw: unknown;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    raw = JSON.parse(cleaned);
  } catch (e) {
    return { ok: false, error: `That is not valid JSON: ${(e as Error).message}` };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'The JSON must be an object.' };
  const row = Array.isArray(raw) ? raw[0] : ((raw as Record<string, unknown>).lesson ?? (raw as Record<string, unknown>).plan ?? raw);
  if (!row || typeof row !== 'object') return { ok: false, error: 'No lesson object found in the JSON.' };
  const l = row as Record<string, unknown>;

  const id = slug(l.id ?? l.title, '');
  if (!id) return { ok: false, error: 'The plan needs an "id" (lower-case letters and dashes).' };
  const title = str(l.title);
  if (!title) return { ok: false, error: 'The plan needs a "title".' };

  const warnings: string[] = [];
  const known = new Set(theme.words.map((w) => w.id));
  const readWords = (value: unknown) => {
    const list = (Array.isArray(value) ? value : []).map((w) => slug(w, '')).filter(Boolean);
    const unknown = list.filter((w) => !known.has(w));
    if (unknown.length) warnings.push(`Not a word in this theme, ignored: ${unknown.join(', ')}.`);
    return list.filter((w) => known.has(w));
  };

  const rawSteps = Array.isArray(l.steps) ? l.steps : [];
  const steps: PlanStep[] = rawSteps
    .map((rawStep): PlanStep | null => {
      if (!rawStep || typeof rawStep !== 'object') return null;
      const s = rawStep as Record<string, unknown>;
      const say = str(s.say);
      const stepTitle = str(s.title) || 'Step';
      if (!say) {
        warnings.push(`Step “${stepTitle}” has nothing to say and was skipped.`);
        return null;
      }
      let activity = slug(s.activity, 'dictionary');
      if (!ACTIVITY_IDS.includes(activity)) {
        warnings.push(`Step “${stepTitle}”: unknown activity “${String(s.activity)}”, using the dictionary.`);
        activity = 'dictionary';
      }
      const ask = (Array.isArray(s.ask) ? s.ask : []).map(str).filter(Boolean).slice(0, 4);
      const minutes = Number(s.minutes);
      return {
        title: stepTitle,
        activity,
        say,
        ask: ask.length ? ask : undefined,
        tutor: str(s.tutor) || undefined,
        minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : undefined,
        words: readWords(s.words),
      };
    })
    .filter((s): s is PlanStep => Boolean(s));

  if (!steps.length) return { ok: false, error: 'The plan needs a "steps" array with at least one step that has "say".' };

  const total = steps.reduce((n, s) => n + (s.minutes ?? 0), 0);
  const minutes = Number(l.minutes);
  const words = readWords(l.words);
  return {
    ok: true,
    warnings,
    plan: {
      id: `ai-${id}`,
      theme: theme.id,
      title,
      goal: str(l.goal) || `Use ${words.length || steps.length} words from ${theme.title.en} in conversation.`,
      minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : total || 12,
      words: words.length ? words : theme.words.slice(0, 8).map((w) => w.id),
      steps,
      custom: true,
    },
  };
}
