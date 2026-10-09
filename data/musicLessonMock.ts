// Music Lesson — mock sample lesson (ported 1:1 from the music-lesson-v1 app's samplePremiumLesson).
import type { PremiumLesson } from '../pages/music/musicTypes';
import { normalizeLesson } from '../pages/music/lessonNormalizer';

export const sampleMusicLessonRaw: any = {
  id: 'rolling-deep-adele',
  songTitle: 'Rolling in the Deep',
  artist: 'Adele',
  level: 'B2',
  goals: 'Idiomatic expressions, future/past predictions, and emotion-laden vocabulary',
  l1: 'Spanish',
  mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  createdAt: new Date().toISOString(),
  subtitles: [
    {
      start: 0,
      end: 8,
      text: "There's a fire starting in my heart",
      translation: 'Hay un fuego que empieza en mi corazón',
      highlights: [
        {
          word: 'fire',
          type: 'vocab',
          definition: 'Strong emotional energy or passion',
          translation: 'fuego / pasión',
          example: 'There is a fire in her eyes when she talks about music.',
          ccq: 'Does fire here mean a real flame or a strong feeling?',
        },
      ],
    },
    {
      start: 9,
      end: 16,
      text: "Reaching a fever pitch and it's bringing me out the dark",
      translation: 'Llega a un punto máximo y me saca de la oscuridad',
      highlights: [
        {
          word: 'fever pitch',
          type: 'idiom',
          definition: 'A state of extreme excitement or emotional intensity',
          translation: 'estado de máxima tensión',
          example: 'Excitement reached a fever pitch before the concert.',
          ccq: 'Is fever pitch calm and quiet, or highly intense?',
        },
        {
          word: 'bringing',
          type: 'phrasal_verb',
          definition: 'Bring out: to reveal or rescue from something',
          translation: 'sacar / revelar',
          example: 'Her advice brought me out of the dark.',
          ccq: 'Was the person happy or sad before being brought out?',
        },
      ],
    },
    {
      start: 17,
      end: 24,
      text: 'Finally, I can see you crystal clear',
      translation: 'Por fin te veo con total claridad',
      highlights: [
        {
          word: 'crystal',
          type: 'vocab',
          definition: 'Extremely transparent, perfectly clear',
          translation: 'cristalino',
          example: 'The instructions are crystal clear.',
          ccq: 'Is there confusion when something is crystal clear?',
        },
      ],
    },
    {
      start: 25,
      end: 32,
      text: "Go ahead and sell me out and I'll lay your ship bare",
      translation: 'Adelante, traicióname; dejaré tu barco al descubierto',
      highlights: [
        {
          word: 'sell',
          type: 'phrasal_verb',
          definition: 'Sell out: betray someone for personal gain',
          translation: 'traicionar',
          example: 'He sold us out to the competition.',
          ccq: 'Is selling out an act of loyalty or betrayal?',
        },
      ],
    },
    {
      start: 33,
      end: 40,
      text: 'The scars of your love remind me of us',
      translation: 'Las cicatrices de tu amor me recuerdan lo que fuimos',
      highlights: [
        {
          word: 'scars',
          type: 'vocab',
          definition: 'Marks left behind by past pain',
          translation: 'cicatrices',
          example: 'Emotional scars take time to heal.',
          ccq: 'Are scars visible on the skin only?',
        },
      ],
    },
    {
      start: 41,
      end: 48,
      text: 'They keep me thinking that we almost had it all',
      translation: 'Me hacen pensar que casi lo tuvimos todo',
      highlights: [
        {
          word: 'almost',
          type: 'grammar',
          definition: 'Very nearly but not completely',
          translation: 'casi',
          example: 'We almost missed the flight.',
          ccq: 'Did they actually have it all?',
        },
      ],
    },
    {
      start: 49,
      end: 56,
      text: 'The scars of your love, they leave me breathless',
      translation: 'Las cicatrices de tu amor me dejan sin aliento',
      highlights: [
        {
          word: 'breathless',
          type: 'vocab',
          definition: 'Gasping for air due to shock or intense emotion',
          translation: 'sin aliento',
          example: 'The view left me breathless.',
          ccq: 'Is the person calm and relaxed?',
        },
      ],
    },
  ],
  miniLessons: [
    {
      id: 'lesson-1',
      timeMarker: 8,
      title: 'Intensity, Metaphors & Emotion',
      l1Title: 'Intensidad, metáforas y emoción',
      l1Summary: 'Esta parte enseña, en versión fácil, cómo la canción expresa intensidad: «fever pitch» es el punto máximo de emoción y «a fire starting in my heart» es una metáfora de un sentimiento que nace.',
      contentCards: [
        {
          heading: 'Form & Structure',
          l1Heading: 'Forma y estructura (en español)',
          l1HtmlBody: `<p>Usamos un sustantivo + adjetivo para <strong>«fever pitch»</strong> (punto máximo de intensidad) y un gerundio para <strong>«fire starting»</strong> (un fuego que empieza).</p><p>En español sería: «hay un fuego que empieza en mi corazón».</p>`,
          htmlBody: `<p class="text-fuchsia-500 dark:text-fuchsia-400 font-bold border-l-4 border-fuchsia-500 pl-3 mb-3">FORM</p>
            <p>We use compound nouns like <span class="px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-300 rounded font-semibold">"fever pitch"</span> and present-continuous metaphors such as <span class="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 rounded font-semibold">"fire starting"</span> to convey escalation.</p>
            <p class="mt-3">Structurally: noun + adjective for "fever pitch", and gerund-noun for "fire starting".</p>`,
        },
        {
          heading: 'Meaning & Use',
          htmlBody: `<p class="text-cyan-500 dark:text-cyan-400 font-bold border-l-4 border-cyan-500 pl-3 mb-3">MEANING</p>
            <p><span class="px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-300 rounded font-semibold">Fever pitch</span> = intensity so high it feels like a fever.</p>
            <p class="mt-3"><span class="px-1.5 py-0.5 bg-pink-500/15 text-pink-600 dark:text-pink-300 rounded font-semibold">Bring out of the dark</span> = reveal the truth, rescue from ignorance.</p>
            <p class="text-emerald-500 dark:text-emerald-400 font-bold border-l-4 border-emerald-500 pl-3 mt-5 mb-3">USE</p>
            <p>Use these in emotional, artistic, or high-stakes contexts: sports finals, exam stress, public events, romantic intensity.</p>`,
        },
        {
          heading: 'Personalized Examples',
          l1Heading: 'Ejemplos personalizados (en español)',
          l1HtmlBody: `<ul class="list-disc list-inside space-y-1"><li>«Antes de mi examen de inglés, mi ansiedad llegó a un <strong>punto máximo</strong>.»</li><li>«Tu comentario me <strong>sacó de la oscuridad</strong> sobre mi pronunciación.»</li></ul>`,
          htmlBody: `<p class="text-purple-500 dark:text-purple-400 font-bold border-l-4 border-purple-500 pl-3 mb-3">PERSONALIZED FOR YOU</p>
            <ul class="list-disc list-inside space-y-2">
              <li>"Before my IELTS exam, my anxiety reached a <span class="px-1 bg-amber-500/15 text-amber-600 dark:text-amber-300 rounded font-semibold">fever pitch</span>."</li>
              <li>"Your feedback <span class="px-1 bg-pink-500/15 text-pink-600 dark:text-pink-300 rounded font-semibold">brought me out of the dark</span> about my pronunciation."</li>
              <li>"There's <span class="px-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 rounded font-semibold">a fire starting</span> in my career."</li>
            </ul>`,
        },
      ],
      ccqs: [
        {
          question: "How can you use 'fever pitch' to describe your prep for an English exam?",
          checklist: ["Use 'reached'", 'Express high intensity', 'Mention timing', "Say 'pitch'"],
          l1Question: '¿Cómo puedes usar «fever pitch» para describir tu preparación para un examen de inglés?',
        },
        {
          question: "Can 'bringing out of the dark' refer to learning a new grammar feature?",
          checklist: ["Mention 'understanding'", 'Compare to ignorance', 'Explain clarity'],
          l1Question: '¿Puede «bringing out of the dark» referirse a aprender algo nuevo de gramática?',
        },
        {
          question: "Describe a moment something 'started a fire' in your heart.",
          checklist: ['Use past tense', 'Mention emotion', "Use 'fire' figuratively"],
          l1Question: 'Describe un momento en el que algo «encendió un fuego» en tu corazón.',
        },
      ],
      activities: [
        {
          type: 'gapFill',
          title: 'Gap Fill Mastery',
          instruction: 'Fill in the missing word from each lyric using the context.',
          cards: [
            {
              question: 'The anticipation reached a ____ pitch before the release.',
              instruction: 'Choose the word meaning extreme intensity.',
              options: ['fever', 'hot', 'high'],
              answer: 'fever',
              feedbackCorrect: 'Excellent! "Fever pitch" is the perfect intensity idiom.',
              feedbackIncorrect: 'Think about a sickness that makes you very hot — that intensity!',
            },
            {
              question: "She finally brought me ____ the dark with her honesty.",
              instruction: 'Pick the correct preposition phrase for revealing truth.',
              options: ['out of', 'into', 'from'],
              answer: 'out of',
              feedbackCorrect: 'Spot on! "Bring out of" reveals or rescues.',
              feedbackIncorrect: 'Remember: we come OUT OF the dark, not into it.',
            },
          ],
        },
        {
          type: 'multipleChoice',
          title: 'Meaning Detective',
          instruction: 'Pick the correct meaning of the lyric.',
          cards: [
            {
              question: "What does 'bringing me out the dark' suggest emotionally?",
              instruction: 'Think about light vs darkness as a metaphor.',
              options: ['Falling into despair', 'Finding clarity / hope', 'Going to sleep'],
              answer: 'Finding clarity / hope',
            },
          ],
        },
        {
          type: 'trueFalse',
          title: 'Fact Check',
          instruction: 'Decide if the statement matches the song meaning.',
          cards: [
            {
              question: "'Fever pitch' means feeling slightly bored.",
              instruction: 'True or False?',
              answer: false,
            },
          ],
        },
        {
          type: 'match',
          title: 'Match Idioms to Meanings',
          instruction: 'Pair each idiom on the left with its meaning on the right.',
          cards: [
            {
              question: 'Match each phrase to its meaning:',
              instruction: 'Click pairs to connect.',
              pairs: [
                { left: 'Fever pitch', right: 'Extreme intensity' },
                { left: 'Crystal clear', right: 'Easy to understand' },
                { left: 'Sell out', right: 'Betray for gain' },
              ],
              answer: 'all',
            },
          ],
        },
        {
          type: 'dictation',
          title: 'Dictation Drill',
          instruction: 'Listen and type exactly what you hear.',
          cards: [
            {
              question: 'Type the lyric you hear:',
              instruction: 'Click play and write the full sentence.',
              answer: "There's a fire starting in my heart",
            },
          ],
        },
        {
          type: 'discussionQuestions',
          title: 'Speaking Discussion',
          instruction: 'Discuss the question out loud — record yourself.',
          cards: [
            {
              question: 'When was the last time something "started a fire" in your heart?',
              instruction: 'Speak for 30 seconds.',
              prompt: 'Use past tense, an emotion word, and a metaphor.',
              answer: 'open',
            },
          ],
        },
      ],
      challenge: {
        type: 'karaoke',
        title: 'Karaoke Sync Challenge',
        instruction: 'Sing along — your microphone tracks pronunciation.',
        data: {
          lines: [
            "There's a fire starting in my heart",
            "Reaching a fever pitch and it's bringing me out the dark",
            'Finally, I can see you crystal clear',
          ],
        },
      },
      catFeedback: 'You are doing incredibly well! Meow-nificent comprehension of these idioms!',
      catFeedbackL1: '¡Lo estás haciendo increíblemente bien! ¡Excelente comprensión de estas expresiones!',
    },
    {
      id: 'lesson-2',
      timeMarker: 24,
      title: 'Betrayal, Predictions & Hypothetical Speech',
      l1Title: 'Traición, predicciones y habla hipotética',
      l1Summary: 'Aquí aprendes el phrasal verb «sell out» (traicionar) y cómo hablar de situaciones hipotéticas y del futuro con «will», «going to» y «would».',
      contentCards: [
        {
          heading: 'Phrasal Verbs of Betrayal',
          l1Heading: 'Phrasal verbs de traición (en español)',
          l1HtmlBody: `<p><strong>sell out</strong> = traicionar a alguien, normalmente por dinero o beneficio personal.</p><p>Se usa con objeto: «He sold <em>me</em> out» (Él me traicionó).</p>`,
          htmlBody: `<p class="text-pink-500 dark:text-pink-400 font-bold border-l-4 border-pink-500 pl-3 mb-3">FORM</p>
            <p><span class="px-1.5 py-0.5 bg-pink-500/15 text-pink-600 dark:text-pink-300 rounded font-semibold">Sell out</span> = phrasal verb (sell + out). Used transitively: "He sold ME out."</p>
            <p class="text-cyan-500 dark:text-cyan-400 font-bold border-l-4 border-cyan-500 pl-3 mt-5 mb-3">MEANING</p>
            <p>To betray someone, often for money or personal advantage.</p>`,
        },
        {
          heading: 'Use & Personalized Examples',
          l1Heading: 'Uso y ejemplos personalizados (en español)',
          l1HtmlBody: `<ul class="list-disc list-inside space-y-1"><li>«Mi socio me <strong>traicionó</strong> por una oferta mejor.»</li><li>«No <strong>vendas</strong> tus sueños por un beneficio rápido.»</li></ul><p class="mt-2">Se usa al hablar de confianza, de noticias y de reflexiones emocionales sobre el pasado.</p>`,
          htmlBody: `<p class="text-emerald-500 dark:text-emerald-400 font-bold border-l-4 border-emerald-500 pl-3 mb-3">USE</p>
            <p>Use in trust-related conversations, news headlines, and emotional reflection on past events.</p>
            <ul class="list-disc list-inside space-y-2 mt-3">
              <li>"My business partner <span class="px-1 bg-pink-500/15 text-pink-600 dark:text-pink-300 rounded font-semibold">sold me out</span> for a higher offer."</li>
              <li>"Don't <span class="px-1 bg-pink-500/15 text-pink-600 dark:text-pink-300 rounded font-semibold">sell out</span> your dreams for short-term gain."</li>
            </ul>`,
        },
      ],
      ccqs: [
        { question: 'Have you ever felt someone sold you out? What happened?', checklist: ['Past tense', 'Emotion words', 'Use "sell out"'], l1Question: '¿Alguna vez has sentido que alguien te traicionó? ¿Qué pasó?' },
        { question: 'What would you do if a friend tried to sell you out?', checklist: ['Conditional', 'Future words', 'Reaction verbs'], l1Question: '¿Qué harías si un amigo intentara traicionarte?' },
      ],
      activities: [
        {
          type: 'multipleChoice',
          title: 'Phrasal Verb Choice',
          instruction: 'Pick the meaning that fits.',
          cards: [
            {
              question: '"He sold me out" means:',
              instruction: 'Think about trust.',
              options: ['He helped me', 'He betrayed me', 'He bought me a gift'],
              answer: 'He betrayed me',
            },
          ],
        },
        {
          type: 'sentenceBuilder',
          title: 'Build with "Sell Out"',
          instruction: 'Order the sentence correctly.',
          cards: [
            {
              question: 'Build:',
              instruction: 'Drag tiles into order.',
              sentenceParts: ['He', 'sold', 'us', 'out', 'for', 'money'],
              correctOrder: ['He', 'sold', 'us', 'out', 'for', 'money'],
              answer: 'order',
            },
          ],
        },
      ],
      challenge: {
        type: 'predictNext',
        title: 'Predict the Next Lyric',
        instruction: 'After hearing "Go ahead and sell me out", predict what happens next.',
        data: {
          situation: 'The singer has just been betrayed publicly by someone she loved.',
          checklist: ['Use future "will"', 'Use "going to"', 'Mention revenge / strength', 'Use modal verbs (might, could)'],
        },
      },
      catFeedback: 'You are reading between the lines beautifully!',
      catFeedbackL1: '¡Estás leyendo entre líneas de maravilla!',
    },
  ],
};

export const buildMusicLessonMock = (): PremiumLesson => normalizeLesson(sampleMusicLessonRaw);

export const buildMusicLessonMockJson = (learner?: any): string => {
    const l = buildMusicLessonMock();
    if (learner) {
        l.learnerProfile = {
            name: learner.name || 'Learner',
            level: learner.cefrLevel || l.level,
            l1: learner.l1Language || l.l1,
            goals: Array.isArray(learner.learningGoals) ? learner.learningGoals.join(', ') : learner.learningGoals || l.goals,
        };
    }
    return JSON.stringify(l, null, 2);
};