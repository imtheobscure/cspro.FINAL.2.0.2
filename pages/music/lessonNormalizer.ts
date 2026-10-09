import { PremiumLesson, MiniLesson, ActivityBlock, LessonContentCard, ConceptCheck } from "./musicTypes";

/**
 * Normalizes and enriches a PremiumLesson object to ensure:
 * 1. At least 10 comprehensive Mini-Lessons per song.
 * 2. NO empty activities array — generates 6 to 10 interactive activity blocks for every mini-lesson.
 * 3. Detailed content cards including Glossary, Grammar Explainer, Singer-Learner Dialogue with Intonation, and Culture Notes.
 */
/**
 * Colour-safety pass for card HTML.
 *
 * Music lessons now render on a LIGHT surface by default (dark mode is opt-in),
 * but older lessons / AI answers often ship dark-theme-only utility classes such
 * as `text-zinc-300`, which would be almost invisible on white. Every unpaired
 * zinc / white token is therefore paired with a light equivalent while keeping
 * its `dark:` twin, so the exact same HTML works in both themes.
 *
 * Tokens already carrying a variant prefix (dark:, hover:, sm:, …) are left alone.
 */
const LIGHT_THEME_PAIRS: [string, string][] = [
  ['bg-zinc-950', 'bg-white dark:bg-zinc-950'],
  ['bg-zinc-900', 'bg-white dark:bg-zinc-900'],
  ['bg-zinc-800', 'bg-slate-100 dark:bg-zinc-800'],
  ['bg-zinc-700', 'bg-slate-200 dark:bg-zinc-700'],
  ['border-zinc-800', 'border-slate-200 dark:border-zinc-800'],
  ['border-zinc-700', 'border-slate-300 dark:border-zinc-700'],
  ['text-zinc-100', 'text-slate-900 dark:text-zinc-100'],
  ['text-zinc-200', 'text-slate-800 dark:text-zinc-200'],
  ['text-zinc-300', 'text-slate-700 dark:text-zinc-300'],
  ['text-zinc-400', 'text-slate-600 dark:text-zinc-400'],
  ['text-zinc-500', 'text-slate-500 dark:text-zinc-500'],
  ['text-white', 'text-slate-900 dark:text-white'],
];

export function pairThemeClasses(html: string): string {
  if (!html) return '';
  let out = String(html);
  for (const [token, replacement] of LIGHT_THEME_PAIRS) {
    // Matches the token only as a standalone class (not part of `dark:text-…`).
    const re = new RegExp('(^|[\\s"\'])' + token + '(?=[\\s"\']|/|$)', 'g');
    out = out.replace(re, (_match, prefix) => prefix + replacement);
  }
  return out;
}

export function normalizeLesson(rawLesson: any): PremiumLesson {
  const lessonId = rawLesson.id || `song-lesson-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const songTitle = rawLesson.songTitle || rawLesson.title || 'Music ESL Lesson';
  const artist = rawLesson.artist || 'Featured Artist';
  const level = rawLesson.level || 'B2';
  const goals = rawLesson.goals || 'Master idioms, phrasal verbs, and relaxed conversational intonation';
  const l1 = rawLesson.l1 || 'Spanish';
  const mediaUrl = rawLesson.mediaUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

  // Subtitles
  const subtitles = Array.isArray(rawLesson.subtitles) && rawLesson.subtitles.length > 0
    ? rawLesson.subtitles
    : [
        { start: 0, end: 10, text: "There's a fire starting in my heart", highlights: [{ word: 'fire', type: 'vocab', definition: 'Strong passion or energy', translation: 'fuego', example: 'A fire in her eyes', ccq: 'Is it real fire?' }] },
        { start: 10, end: 20, text: "Reaching a fever pitch and bringing me out the dark", highlights: [{ word: 'fever pitch', type: 'idiom', definition: 'Extreme intensity', translation: 'máxima tensión', example: 'Excitement reached a fever pitch', ccq: 'Is it calm?' }] },
        { start: 20, end: 30, text: "Finally I can see you crystal clear", highlights: [{ word: 'crystal clear', type: 'vocab', definition: 'Extremely obvious and easy to see', translation: 'cristalino', example: 'Clear instructions', ccq: 'Is there confusion?' }] },
        { start: 30, end: 40, text: "Go ahead and sell me out and I'll lay your ship bare", highlights: [{ word: 'sell out', type: 'phrasal_verb', definition: 'Betray someone for personal advantage', translation: 'traicionar', example: 'He sold us out', ccq: 'Is it loyal?' }] },
        { start: 40, end: 50, text: "The scars of your love remind me of us", highlights: [{ word: 'scars', type: 'vocab', definition: 'Marks left behind by past pain', translation: 'cicatrices', example: 'Emotional scars', ccq: 'Do scars hurt forever?' }] },
        { start: 50, end: 60, text: "They keep me thinking that we almost had it all", highlights: [{ word: 'almost', type: 'grammar', definition: 'Very nearly but not completely', translation: 'casi', example: 'We almost won', ccq: 'Did it happen?' }] },
        { start: 60, end: 70, text: "The scars of your love, they leave me breathless", highlights: [{ word: 'breathless', type: 'vocab', definition: 'Gasping for air due to shock or intense emotion', translation: 'sin aliento', example: 'Left me breathless', ccq: 'Are you calm?' }] },
        { start: 70, end: 80, text: "I can't help feeling we could've had it all", highlights: [{ word: "could've", type: 'grammar', definition: 'Past hypothetical possibility', translation: 'podríamos haber', example: 'We could have gone', ccq: 'Did it happen in reality?' }] },
        { start: 80, end: 90, text: "Rolling in the deep, you had my heart inside of your hand", highlights: [{ word: 'rolling in the deep', type: 'idiom', definition: 'Experiencing deep emotional turmoil together', translation: 'en lo más profundo', example: 'Deep emotional bond', ccq: 'Is it shallow?' }] },
        { start: 90, end: 100, text: "And you played it to the beat", highlights: [{ word: 'played', type: 'vocab', definition: 'Manipulated or toyed with feelings', translation: 'jugaste', example: 'She played with my heart', ccq: 'Was it sincere?' }] }
      ];

  // Raw mini lessons
  let existingMiniLessons: any[] = Array.isArray(rawLesson.miniLessons) ? rawLesson.miniLessons : [];

  // Guarantee at least 10 mini lessons per song
  const targetCount = Math.max(10, existingMiniLessons.length);
  const normalizedMiniLessons: MiniLesson[] = [];

  for (let i = 0; i < targetCount; i++) {
    const rawMl = existingMiniLessons[i] || {};
    const subtitleLine = subtitles[i % subtitles.length];
    const lyricText = subtitleLine?.text || `Song section ${i + 1}`;
    const timeMarker = rawMl.timeMarker || (i + 1) * 10;
    const title = rawMl.title || `Mini-Lesson ${i + 1}: ${lyricText}`;

    // Normalize content cards (Ensure Glossary, Grammar, Dialogue, Story, Culture).
    // Every card can carry a native-language (L1) twin so the learner can read the
    // explanation in the language they understand best.
    const normalizeCard = (card: any): LessonContentCard => ({
      heading: card?.heading || card?.title || 'Lesson Card',
      htmlBody: pairThemeClasses(card?.htmlBody || card?.html || card?.body || ''),
      l1Heading: card?.l1Heading || card?.headingL1 || undefined,
      l1HtmlBody: pairThemeClasses(card?.l1HtmlBody || card?.htmlBodyL1 || card?.l1Body || ''),
    });

    let contentCards: LessonContentCard[] = Array.isArray(rawMl.contentCards) && rawMl.contentCards.length >= 3
      ? rawMl.contentCards.map(normalizeCard)
      : generateRichContentCards(lyricText, i + 1, level, l1, subtitleLine?.translation).map(normalizeCard);

    // Normalize CCQs (the native-language question is preserved when provided)
    const ccqs: ConceptCheck[] = Array.isArray(rawMl.ccqs) && rawMl.ccqs.length > 0
      ? rawMl.ccqs.map((q: any) => {
          if (typeof q === 'string') return { question: q, checklist: [] };
          return {
            question: q?.question || '',
            checklist: Array.isArray(q?.checklist) ? q.checklist : [],
            l1Question: q?.l1Question || q?.questionL1 || undefined,
          };
        })
      : [
          { question: `How does "${lyricText}" express emotional escalation?`, checklist: ['Used emotion vocabulary', 'Explained metaphor', 'Used target level grammar'] },
          { question: `Can you rephrase "${lyricText}" into a polite everyday sentence?`, checklist: ['Shifted to formal tone', 'Preserved main idea'] },
          { question: `How would you react if someone sang "${lyricText}" to you?`, checklist: ['Expressed personal opinion', 'Used natural conversational intonation'] }
        ];

    // Normalize Activities (GUARANTEE 6-10 RICH ACTIVITY BLOCKS)
    let activities: ActivityBlock[] = Array.isArray(rawMl.activities) && rawMl.activities.length > 0
      ? rawMl.activities.map(act => normalizeActivityBlock(act, lyricText))
      : [];

    if (activities.length === 0) {
      activities = generateRichActivities(lyricText, i + 1);
    }

    // Normalize Challenge
    const challenge = rawMl.challenge && rawMl.challenge.title
      ? rawMl.challenge
      : {
          type: i % 2 === 0 ? 'karaoke' : 'roleplay',
          title: `Stage Challenge ${i + 1}`,
          instruction: 'Perform this section with confidence and natural intonation!',
          data: {
            lines: [lyricText, "We could've had it all", "Rolling in the deep"],
            scenario: `You are talking with the singer about the meaning of "${lyricText}".`,
            learnerLines: [
              `Learner: "When you sing '${lyricText}', does your pitch rise ↗ or fall ↘ at the end?"`,
              `Singer: "My pitch rises ↗ on 'starting' to show excitement, then drops ↘ on 'heart'!"`
            ]
          }
        };

    const catFeedback = rawMl.catFeedback || `Meow-nificent work on Mini-Lesson ${i + 1}! You are mastering conversational pitch and idioms!`;
    const catFeedbackL1 = rawMl.catFeedbackL1 || rawMl.catFeedbackNative || undefined;
    const l1Title = rawMl.l1Title || rawMl.titleL1 || undefined;
    const l1Summary = rawMl.l1Summary || rawMl.summaryL1 || undefined;

    normalizedMiniLessons.push({
      id: rawMl.id || `mini-lesson-${i + 1}`,
      timeMarker,
      title,
      l1Title,
      l1Summary,
      contentCards,
      ccqs,
      activities,
      challenge,
      catFeedback,
      catFeedbackL1
    });
  }

  return {
    id: lessonId,
    songTitle,
    artist,
    level,
    goals,
    l1,
    mediaUrl,
    subtitles,
    miniLessons: normalizedMiniLessons,
    createdAt: rawLesson.createdAt || new Date().toISOString()
  };
}

/**
 * Generates 5 high-detailed content cards for a mini-lesson
 */
function generateRichContentCards(lyricText: string, lessonNum: number, level: string, l1: string, l1Text?: string): LessonContentCard[] {
  const cards: LessonContentCard[] = [
    {
      heading: `Card 1: Glossary of Words, Idioms & Phrasal Verbs`,
      htmlBody: `
        <p class="text-amber-500 font-bold border-l-4 border-amber-500 pl-3 mb-3">GLOSSARY & VOCABULARY BREAKDOWN (${level} Level)</p>
        <div class="space-y-3">
          <div class="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <span class="font-extrabold text-amber-400">1. Target Phrase:</span> <span class="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded">"${lyricText}"</span>
            <p class="text-xs text-zinc-300 mt-1"><strong>Simple Definition:</strong> Used to express a sudden buildup of emotion, desire, or intense determination.</p>
            <p class="text-xs text-fuchsia-300 italic mt-0.5"><strong>L1 Translation (${l1}):</strong> Expresión de alta intensidad emocional.</p>
            <p class="text-xs text-zinc-400 mt-1"><strong>Simple Example:</strong> "When I got my exam results, excitement was starting in my heart."</p>
          </div>
          <div class="p-3 bg-pink-500/10 rounded-xl border border-pink-500/20">
            <span class="font-extrabold text-pink-400">2. Phrasal Verb Focus:</span> <span class="px-1.5 py-0.5 bg-pink-500/20 text-pink-300 font-bold rounded">Bring out (of)</span>
            <p class="text-xs text-zinc-300 mt-1"><strong>Definition:</strong> To reveal, draw attention to, or rescue someone from a dark or sad situation.</p>
            <p class="text-xs text-zinc-400 mt-1"><strong>Example:</strong> "Her encouraging words brought me out of my negative mood."</p>
          </div>
          <div class="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <span class="font-extrabold text-cyan-400">3. Idiom Focus:</span> <span class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 font-bold rounded">Fever pitch</span>
            <p class="text-xs text-zinc-300 mt-1"><strong>Definition:</strong> A state of maximum excitement, tension, or activity.</p>
            <p class="text-xs text-zinc-400 mt-1"><strong>Example:</strong> "The concert crowd reached a fever pitch."</p>
          </div>
        </div>
      `
    },
    {
      heading: `Card 2: Grammar Explainer & Sentence Structure`,
      htmlBody: `
        <p class="text-emerald-500 font-bold border-l-4 border-emerald-500 pl-3 mb-3">GRAMMAR EXPLAINER</p>
        <p class="mb-2">In this line <span class="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-semibold rounded">"${lyricText}"</span>, we observe present continuous participle clauses describing ongoing emotional states.</p>
        <div class="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-2 text-xs">
          <p><strong>Rule & Pattern:</strong> <code>There's + a [noun] + [participle verb -ing] + in my [location]</code></p>
          <p><strong>Definition:</strong> We use "There is a ... -ing" to highlight an emerging sensory experience or internal physical state.</p>
          <p class="text-emerald-400"><strong>Simple Examples:</strong></p>
          <ul class="list-disc list-inside space-y-1 text-zinc-300">
            <li>"There's a storm brewing in the sky."</li>
            <li>"There's a song forming in my head."</li>
            <li>"There's an idea taking shape in my mind."</li>
          </ul>
          <p class="text-red-400 mt-2"><strong>⚠️ Common Mistake:</strong> Saying <em>"There having a fire"</em> ❌ instead of <em>"There's a fire starting"</em> ✅.</p>
        </div>
      `
    },
    {
      heading: `Card 3: Singer & Learner Dialogue (Intonation & Relaxed Tone)`,
      htmlBody: `
        <p class="text-fuchsia-500 font-bold border-l-4 border-fuchsia-500 pl-3 mb-3">SINGER & LEARNER DIALOGUE (CONVERSATIONAL INTONATION)</p>
        <p class="text-xs text-zinc-400 mb-3">Notice the intonation arrows: ↗ means rising pitch (excitement/questions), ↘ means falling pitch (certainty/emphasis).</p>
        <div class="space-y-3 font-sans text-xs">
          <div class="p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl">
            <p class="font-extrabold text-fuchsia-400">Singer 🎤:</p>
            <p class="text-zinc-200 mt-1 font-mono">"Hey! When I sing '${lyricText}' ↗, I start with a quiet breath and let the pitch rise ↗ on 'starting'!"</p>
            <p class="text-[10px] text-fuchsia-300 mt-1">💡 Relaxed Tone Tip: Blend "There is a" into "There's a" /ðɛərz ə/ effortlessly.</p>
          </div>
          <div class="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <p class="font-extrabold text-indigo-400">Learner 👤:</p>
            <p class="text-zinc-200 mt-1 font-mono">"Ah! So if I say it in a relaxed conversational tone, I drop my pitch ↘ at 'heart' ↘?"</p>
            <p class="text-[10px] text-indigo-300 mt-1">💡 Natural Response: "Exactly! There's a fire starting in my heart ↘."</p>
          </div>
        </div>
      `
    },
    {
      heading: `Card 4: Song Story & Cultural Context`,
      htmlBody: `
        <p class="text-cyan-500 font-bold border-l-4 border-cyan-500 pl-3 mb-3">SONG STORY & CULTURE NOTES</p>
        <div class="space-y-2 text-xs text-zinc-300 leading-relaxed">
          <p><strong>Story Arc:</strong> Section ${lessonNum} sets up the emotional turning point of the song. The protagonist is transforming heartbreak and anger into passion and creative strength.</p>
          <p><strong>Cultural Nuance:</strong> In modern pop and soul lyrics, fire is a classic metaphor for emotional resilience. Expressions like "sell out" and "fever pitch" originated in commercial trade and sports before becoming everyday pop culture idioms.</p>
        </div>
      `
    },
    {
      heading: `Card 5: Relatable Prompts — Would You Rather?`,
      htmlBody: `
        <p class="text-purple-500 font-bold border-l-4 border-purple-500 pl-3 mb-3">WOULD YOU RATHER? & WHAT WOULD YOU DO?</p>
        <div class="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-3 text-xs">
          <p class="font-bold text-purple-300">Option A or Option B?</p>
          <p class="text-zinc-200">1. Would you rather express your feelings directly through a song 🎤, or write a private journal letter 📝?</p>
          <p class="text-zinc-200">2. What would you do if a close friend accidentally "sold out" your surprise party secret?</p>            <p class="text-zinc-400 italic">Practice answering out loud using relaxed conversational intonation!</p>
        </div>
      `
    }
  ];

  // When the lesson carries an L1 translation of this lyric line, attach it to the
  // first card so the learner always has an easy native-language anchor.
  if (l1Text) {
    const safeL1 = String(l1Text).replace(/</g, '&lt;');
    cards[0] = {
      ...cards[0],
      l1Heading: `Your language (${l1}) — what this line means`,
      l1HtmlBody: `<p class="font-bold mb-1">“${lyricText}”</p><p>${safeL1}</p><p class="text-xs opacity-70 mt-2">Read this first, then re-read the English explanation in this card.</p>`
    };
  }

  return cards;
}

/**
 * Generates 10 gamified, interactive ActivityBlocks for a mini-lesson
 */
function generateRichActivities(lyricText: string, lessonNum: number): ActivityBlock[] {
  return [
    {
      type: 'gapFill',
      title: 'Lyric Gap Fill Challenge',
      instruction: 'Fill in the missing key vocabulary from this lyric section.',
      cards: [
        {
          question: `Complete the lyric: "There's a ____ starting in my heart"`,
          instruction: 'Pick the word representing intense emotion.',
          options: ['fire', 'spark', 'rain'],
          answer: 'fire',
          feedbackCorrect: 'Brilliant! "Fire starting" represents emotional ignition.',
          feedbackIncorrect: 'Think about a burning flame of passion!'
        },
        {
          question: `Complete the phrase: "Reaching a ____ pitch"`,
          instruction: 'Pick the word meaning extreme temperature or intensity.',
          options: ['fever', 'frenzy', 'furious'],
          answer: 'fever',
          feedbackCorrect: 'Spot on! "Fever pitch" is a state of extreme excitement.',
          feedbackIncorrect: 'It sounds like a high temperature body condition.'
        }
      ]
    },
    {
      type: 'scramble',
      title: 'Vocabulary Word Scramble',
      instruction: 'Unscramble the letters to reveal the target vocabulary word.',
      cards: [
        {
          question: 'Unscramble the word meaning extreme emotional intensity:',
          instruction: 'Five letters, related to body temperature.',
          scrambled: 'refev',
          answer: 'fever',
          feedbackCorrect: 'Awesome! F-E-V-E-R spells fever.',
          feedbackIncorrect: 'Start with the letter F!'
        },
        {
          question: 'Unscramble the word meaning perfectly transparent:',
          instruction: 'Seven letters, gem metaphor.',
          scrambled: 'larstyc',
          answer: 'crystal',
          feedbackCorrect: 'Perfect! Crystal clear means easy to understand.',
          feedbackIncorrect: 'Starts with C!'
        }
      ]
    },
    {
      type: 'multipleChoice',
      title: 'Meaning & Usage Detective',
      instruction: 'Identify the exact meaning and natural usage of the lyric.',
      cards: [
        {
          question: `What does "${lyricText}" convey in a relaxed conversation?`,
          instruction: 'Choose the most natural interpretation.',
          options: [
            'An awakening of deep emotion or motivation',
            'A literal house emergency',
            'Feeling sleepy and relaxed'
          ],
          answer: 'An awakening of deep emotion or motivation',
          feedbackCorrect: 'Correct! It is a vivid emotional metaphor.',
          feedbackIncorrect: 'Look for the emotional meaning, not literal fire!'
        }
      ]
    },
    {
      type: 'trueFalse',
      title: 'Fact & Intonation Check',
      instruction: 'Decide whether the statement about intonation and grammar is True or False.',
      cards: [
        {
          question: 'In a relaxed tone, rising pitch ↗ at the end of a statement shows excitement or unfinished thought.',
          instruction: 'True or False?',
          answer: true,
          feedbackCorrect: 'Yes! Rising pitch ↗ signals high energy or anticipation.',
          feedbackIncorrect: 'Rising pitch ↗ builds suspense and excitement!'
        },
        {
          question: '"Sell out" means to buy a present for a friend.',
          instruction: 'True or False?',
          answer: false,
          feedbackCorrect: 'Correct! "Sell out" means to betray trust.',
          feedbackIncorrect: 'Think about betrayal!'
        }
      ]
    },
    {
      type: 'match',
      title: 'Match Idioms & Meanings',
      instruction: 'Pair each idiom or phrasal verb on the left with its definition on the right.',
      cards: [
        {
          question: 'Match each target phrase with its simple explanation:',
          instruction: 'Click a phrase on the left, then its definition on the right.',
          pairs: [
            { left: 'Fever pitch', right: 'Extreme intensity' },
            { left: 'Bring out of dark', right: 'Reveal the truth / rescue' },
            { left: 'Crystal clear', right: 'Very easy to see/understand' },
            { left: 'Sell out', right: 'Betray for personal gain' }
          ],
          answer: 'all'
        }
      ]
    },
    {
      type: 'sentenceBuilder',
      title: 'Build the Sentence',
      instruction: 'Drag the word tiles into the correct grammatical order.',
      cards: [
        {
          question: 'Reconstruct the lyric:',
          instruction: 'Arrange the tiles in order.',
          sentenceParts: ['There\'s', 'a', 'fire', 'starting', 'in', 'my', 'heart'],
          correctOrder: ['There\'s', 'a', 'fire', 'starting', 'in', 'my', 'heart'],
          answer: 'order',
          feedbackCorrect: 'Flawless structure!',
          feedbackIncorrect: 'Check the position of "starting in my heart".'
        }
      ]
    },
    {
      type: 'errorCorrection',
      title: 'Spot & Correct the Grammar Error',
      instruction: 'Find the mistake in the sentence and type the corrected version.',
      cards: [
        {
          question: 'Fix the error in this lyric variation:',
          instruction: 'Type the correct sentence.',
          mistakeText: 'There having a fire starting in my heart.',
          correctedText: "There's a fire starting in my heart.",
          answer: "there's a fire starting in my heart",
          feedbackCorrect: 'Great correction! Use "There\'s" not "There having".'
        }
      ]
    },
    {
      type: 'dictation',
      title: 'Singer Listening Dictation',
      instruction: 'Listen to the audio and type the exact sentence.',
      cards: [
        {
          question: 'Type what you hear:',
          instruction: 'Click Play Audio, then write down the lyric.',
          answer: lyricText,
          feedbackCorrect: 'Outstanding ear! Your listening comprehension is top notch.',
          feedbackIncorrect: 'Listen again — focus on the rhythm!'
        }
      ]
    },
    {
      type: 'findMistake',
      title: 'Click the Wrong Word',
      instruction: 'Find the single incorrect word inside this sentence.',
      cards: [
        {
          question: 'Click the word that does NOT belong:',
          instruction: 'One word was swapped.',
          sentenceParts: ['There\'s', 'a', 'water', 'starting', 'in', 'my', 'heart'],
          answer: 'water',
          feedbackCorrect: 'Yes! It should be "fire", not "water".',
          feedbackIncorrect: 'Look for an element that contradicts heat!'
        }
      ]
    },
    {
      type: 'discussionQuestions',
      title: 'Conversational Speaking Practice',
      instruction: 'Record yourself explaining this song concept in a relaxed tone.',
      cards: [
        {
          question: `Describe a situation in your life where something reached a "fever pitch".`,
          instruction: 'Speak out loud for 30 seconds using natural intonation.',
          prompt: 'Use rising pitch ↗ on emotion words and falling pitch ↘ at the end of statements.',
          answer: 'open'
        }
      ]
    }
  ];
}

/**
 * Normalizes raw activity blocks generated by AI models into clean, reliable CardIteration structures
 */
function normalizeActivityBlock(rawAct: any, lyricText: string): ActivityBlock {
  const type = rawAct.type || 'multipleChoice';
  const title = rawAct.title || 'Activity Challenge';
  const instruction = rawAct.instruction || 'Complete the interactive exercise below.';
  
  const rawCards = Array.isArray(rawAct.cards) ? rawAct.cards : [rawAct];

  const cards = rawCards.map((c: any) => {
    // Helper to strip HTML tags for question title
    let questionText = c.question || c.title || c.prompt || '';
    if (!questionText && c.htmlContent) {
      questionText = String(c.htmlContent).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (!questionText) questionText = `Practice exercise for: "${lyricText}"`;

    // Normalizing options
    let options: string[] = [];
    if (Array.isArray(c.options)) {
      options = c.options.map((opt: any) => {
        if (typeof opt === 'string') return opt;
        if (typeof opt === 'object' && opt !== null) return opt.text || opt.statement || opt.option || JSON.stringify(opt);
        return String(opt);
      });
    }

    // Normalizing answer
    let answer = c.answer;
    if (answer === undefined && c.correct !== undefined) {
      if (typeof c.correct === 'number' && options[c.correct]) {
        answer = options[c.correct];
      } else {
        answer = c.correct;
      }
    }

    // Normalizing Pairs for Matching
    let pairs: { left: string; right: string }[] = [];
    if (Array.isArray(c.pairs)) {
      pairs = c.pairs.map((p: any) => {
        if (p.left && p.right) return { left: String(p.left), right: String(p.right) };
        if (p.term && p.definition) return { left: String(p.term), right: String(p.definition) };
        if (p.front && p.back) return { left: String(p.front), right: String(p.back) };
        return { left: String(p[0] || 'Item'), right: String(p[1] || 'Match') };
      });
    } else if (typeof c.pairs === 'object' && c.pairs !== null) {
      pairs = Object.entries(c.pairs).map(([left, right]) => ({ left, right: String(right) }));
    } else if (type === 'match' && pairs.length === 0) {
      // Auto generate fallback pairs if AI provided matching without structured pairs
      pairs = [
        { left: 'Fever pitch', right: 'Extreme intensity' },
        { left: 'Bring out of dark', right: 'Reveal the truth / rescue' },
        { left: 'Crystal clear', right: 'Easy to see & understand' }
      ];
    }

    // Normalizing Sentence Builder / Ordering
    let sentenceParts = c.sentenceParts || c.parts || [];
    let correctOrder = c.correctOrder || c.ordering || [];
    if (type === 'sentenceBuilder' && sentenceParts.length === 0) {
      const srcText = c.correctSentence || lyricText;
      sentenceParts = srcText.split(' ').map((w: string) => w.trim()).filter(Boolean);
      correctOrder = [...sentenceParts];
    }

    // Normalizing Discussion Questions
    let checklist = Array.isArray(c.checklist) ? c.checklist : [];
    if (type === 'discussionQuestions' && checklist.length === 0) {
      checklist = ['Used emotion vocabulary', 'Used relaxed conversational intonation', 'Shared personal opinion'];
    }

    let argumentsFor = Array.isArray(c.argumentsFor) ? c.argumentsFor : Array.isArray(c.pros) ? c.pros : [];
    let argumentsAgainst = Array.isArray(c.argumentsAgainst) ? c.argumentsAgainst : Array.isArray(c.cons) ? c.cons : [];
    if (type === 'discussionQuestions' && argumentsFor.length === 0) {
      argumentsFor = ['Music brings emotional clarity', 'Sharing lyrics builds interpersonal connection'];
      argumentsAgainst = ['Music interpretations can be subjective', 'Lyrics might use non-standard grammar'];
    }

    return {
      ...c,
      question: questionText,
      instruction: c.instruction || instruction,
      options,
      answer: answer !== undefined ? answer : 'open',
      pairs,
      sentenceParts,
      correctOrder,
      checklist,
      argumentsFor,
      argumentsAgainst,
      feedbackCorrect: c.feedbackCorrect || 'Excellent work!',
      feedbackIncorrect: c.feedbackIncorrect || 'Try again!'
    };
  });

  return {
    type,
    title,
    instruction,
    cards
  };
}

