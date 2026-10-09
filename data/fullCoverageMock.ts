/**
 * Full-coverage Micro Lesson (V1) mock — ONE activity of EVERY supported type.
 * The generator supports 58 activity types (see utils/englishLessonHtmlGenerator.ts
 * bodyClassMap); this mock exercises every one of them so "Load Mock Data" can be
 * used to smoke-test the whole pipeline, including every listening activity that
 * feeds the multi-character read-aloud system ([male1]/[female2]/[child1] tags).
 */

export interface MockActivity {
  title: string;
  type: string;
  content: string;
  comprehensiveFeedback?: string;
}

const act = (title: string, type: string, content: any, feedback?: string): MockActivity => ({
  title,
  type,
  content: typeof content === 'string' ? content : JSON.stringify(content),
  ...(feedback ? { comprehensiveFeedback: feedback } : {}),
});

const LISTEN_SCRIPT = `Listen to this multi-character discussion featuring 5 distinct speakers. Each tag is read by a different voice.

[male1]Alexander: Welcome everyone to today's panel on sustainable energy solutions. Let's hear from Dr. Sophia first!

[female1]Sophia: Thank you Alexander! Photovoltaic solar efficiency has doubled over recent years, powering millions of sustainable homes.

[male2]Liam: Brilliant points Sophia! In the UK, offshore wind energy is breaking clean power generation records every single month.

[female2]Emma: Having traveled across Asia, I've witnessed high-capacity battery storage hubs grid-balancing entire cities seamlessly!

[child1]Leo: Hey everyone! At my school science fair, we built mini solar water heaters and they actually boiled water! It was super cool!

[male1]Alexander: That sounds incredible, Leo! What was the most exciting part of that hands-on experiment?

[child1]Leo: Seeing how powerful the sun is without needing any dirty fossil fuels!

[female1]Sophia: Inspiring work, Leo. Connecting hands-on science with environmental stewardship builds lifelong curiosity.

[female2]Emma: Absolutely! When young learners like Leo get involved, whole communities get inspired to go green.`;

export const buildFullCoverageMockLesson = () => ({
  lessonSummary: 'Full-coverage smoke test: one activity of every supported Micro Lesson type.',
  settings: { lessonName: 'Full Coverage Activity Test' },
  sections: [
    {
      title: '📚 Section 1: Vocabulary & Reading',
      color: '#4A90E2',
      studyTime: '20 mins',
      xpReward: 100,
      activities: [
        act('📖 Reading Text', 'paragraph', '<p>Climate change is one of the most pressing issues of our time. Rising global temperatures have led to melting polar ice caps and shifting ecosystems.</p>'),
        act('📊 Vocabulary Table', 'vocabulary_table', {
          words: [
            { word: 'Ecosystem', translation: 'النظام البيئي', definition: 'A community of interacting organisms and their environment.', example: 'Coral reefs are a fragile ecosystem.', ccq: 'Can a pond be an ecosystem?' },
            { word: 'Fossil fuel', translation: 'الوقود الأحفوري', definition: 'Natural fuel formed from remains of living organisms.', example: 'Coal and oil are fossil fuels.', ccq: 'Is wood a fossil fuel?' },
          ],
        }, '<b>Ecosystem</b> comes from Greek oikos (house).'),
        act('💡 Flashcards', 'flashcard', {
          cards: [
            { front: 'Sustainable', back: 'Able to be maintained at a certain rate.' },
            { front: 'Emission', back: 'The production and discharge of gases.' },
            { front: 'Conservation', back: 'Prevention of wasteful use of resources.' },
          ],
        }, 'Great vocabulary building!'),
        act('🔗 Matching Game', 'matching', {
          pairs: [
            { left: 'Carbon footprint', right: 'Total greenhouse gases caused by an individual.' },
            { left: 'Renewable', right: 'Energy from a source not depleted by use.' },
            { left: 'Biodiversity', right: 'Variety of life in a habitat.' },
          ],
        }, 'All matched correctly!'),
        act('🧠 Check Your Understanding', 'questions', 'What is the primary driver of climate change?\nHuman activity, especially burning fossil fuels.\nWhy are coral reefs mentioned?\nAs an example of a fragile ecosystem.'),
        act('🔍 Find the Mistake', 'error_correction', {
          sentences: [
            { sentence: 'She have been studying English for 5 years.', error: 'have', correction: 'has', correctSentence: 'She has been studying English for 5 years.', explanation: "Third person singular uses 'has'." },
          ],
        }),
        act('🔀 Unscramble', 'scramble', {
          sentences: [
            { sentence: 'We | must | reduce | our | carbon | footprint', hint: "Start with 'We'" },
            { sentence: 'Renewable | energy | is | the | future', hint: 'Subject first' },
          ],
        }, 'Great sentence structure!'),
        act('🧩 Gap Fill', 'gap_fill', {
          sentences: [
            { text: "The Earth's temperature has ______ (rise) by 1.2°C.", correctAnswer: 'risen' },
            { text: 'Many species have already ______ (disappear).', correctAnswer: 'disappeared' },
          ],
        }, 'Risen is the past participle of rise.'),
        act('📋 Gap Fill Dropdown', 'gap_fill_dropdown', {
          sentences: [
            { sentence: 'Solar power is a [renewable] source of energy.', options: ['renewable', 'finite', 'extinct'] },
            { sentence: 'Burning coal [releases] carbon dioxide.', options: ['releases', 'eats', 'sleeps'] },
          ],
        }),
        act('✋ Gap Fill Drag', 'gap_fill_drag', {
          sentences: [
            { sentence: 'Wind turbines convert wind into ______.', answer: 'electricity', options: ['electricity', 'plastic', 'hydrogen'] },
            { sentence: 'Batteries ______ extra solar energy for night use.', answer: 'store', options: ['store', 'spend', 'waste'] },
          ],
        }),
        act('📝 Short Answer', 'short_answer', {
          questions: [{ q: 'What gas do fossil fuels release when burned?', answer: 'carbon dioxide' }],
        }),
        act('🧮 Crossword — Energy Terms', 'crossword', {
          words: [
            { word: 'SOLAR', clue: 'Energy from the sun (5 letters).' },
            { word: 'WIND', clue: 'Moving air that turns turbines (4 letters).' },
            { word: 'GREEN', clue: 'Environmentally friendly colour / movement (5 letters).' },
          ],
        }, 'Solve the clues, then check your grid!'),
        act('🗣️ Pronunciation (Alias of Say It Right)', 'pronunciation', {
          words: [
            { word: 'Nature', phonetic: '/ˈneɪtʃər/', audioScript: 'Nature heals everything.' },
            { word: 'Feature', phonetic: '/ˈfiːtʃər/', audioScript: 'Every feature matters.' },
          ],
        }),
        act('🎵 Word Stress — Which Syllable?', 'word_stress', {
          words: [
            { word: 'environMENT', correct: '3' },
            { word: 'SOLar', correct: '1' },
          ],
        }),
        act('📈 Sentence Stress — Emphasize It', 'sentence_stress', {
          sentences: [
            { text: 'We MUST reduce our carbon FOOTprint.', emphasis: ['MUST', 'FOOTprint'] },
          ],
        }),
      ],
    },
    {
      title: '✍️ Section 2: Grammar & Comprehension',
      color: '#E24A7D',
      studyTime: '25 mins',
      xpReward: 150,
      activities: [
        act('📖 Grammar Box: Present Perfect', 'grammar_explanation', {
          explanation: 'The present perfect connects the past to the present. Form: have/has + past participle.',
          examples: ['Scientists have warned about climate change.', 'The ice caps have melted significantly.', 'We have seen more storms this year.'],
          ccqs: [
            { q: 'Which tense connects past to present?', a: 'Present perfect.' },
            { q: 'What is the form of present perfect?', a: 'have/has + past participle.' },
          ],
        }, 'Present perfect = have/has + past participle.'),
        act('✅ True/False', 'true_false', {
          questions: [
            { q: 'Climate change is caused only by natural factors.', answer: 'False' },
            { q: 'Renewable energy can be replenished naturally.', answer: 'True' },
          ],
        }),
        act('🔘 Multiple Choice', 'multiple_choice', {
          questions: [
            { q: "What does 'sustainable' mean?", options: ['Able to continue over time', 'Quick and efficient', 'Expensive'], answer: 'Able to continue over time', explanation: 'Sustainability = lasting into the future.' },
          ],
        }),
        act('👂 Listening MC — Real Talk', 'listening_mc', {
          audioScript: '[male1]Good morning! Today we look at how cities are cutting emissions. [female2]First up: electric buses. They quietly replace diesel fleets worldwide. [child1]My school bus is electric, and it is super quiet!',
          questions: [
            { q: 'What replaces diesel fleets worldwide?', options: ['Electric buses', 'Steam trains', 'Bicycles'], answer: 'Electric buses' },
            { q: 'True or False: electric buses are noisy.', options: ['True', 'False'], answer: 'False' },
          ],
        }),
        act('🧭 Contextual MC — Reading Check', 'contextual_mc', {
          context: '<p>At the science fair, <b>Leo</b> showed visitors how his mini solar water heater worked using only sunlight. The water reached 60°C in two hours.</p>',
          questions: [
            { q: 'What powered the water heater?', options: ['Sunlight', 'Batteries', 'Coal'], answer: 'Sunlight' },
          ],
        }),
        act('⚖️ Confidence Weighted', 'confidence_weighted', {
          questions: [
            { q: 'Which energy source is renewable?', options: ['Solar', 'Coal', 'Oil'], answer: 'Solar' },
          ],
        }),
        act('☑️ Select All That Apply', 'select_all', {
          questions: [
            { q: 'Which of these are renewable energy sources?', options: ['Solar', 'Coal', 'Wind', 'Oil'], correct: ['Solar', 'Wind'] },
          ],
        }),
        act('🔑 Sequence Ordering', 'sequence_ordering', {
          items: ['First, sunlight hits the panel.', 'Next, the panel converts it to electricity.', 'Then, wires carry the current.', 'Finally, the bulb lights up.'],
        }),
        act('🧵 Paragraph Organizer', 'paragraph_organizer', {
          sentences: ['Our town started a recycling program last year.', 'At first, only a few families joined.', 'Slowly, more neighbours learned about it.', 'Today, over half the town recycles every week.'],
        }),
        act('⏱️ Timed Reading', 'timed_reading', {
          text: 'Renewable energy is growing fast. Solar and wind farms now power millions of homes, and battery storage keeps electricity flowing after sunset.',
          questions: [{ q: 'What keeps electricity flowing after sunset?', answer: 'Battery storage' }],
        }),
        act('↩️ Text Reconstruction', 'text_reconstruction', {
          sentences: ['Small actions add up.', 'One bottle recycled matters.', 'Communities grow greener together.'],
        }),
      ],
    },
    {
      title: '🎯 Section 3: Games, Speaking & Listening',
      color: '#F5A623',
      studyTime: '25 mins',
      xpReward: 200,
      activities: [
        act('🔊 Audio Matching — Listen & Match', 'audio_matching', {
          pairs: [
            { audioScript: 'Solar panels soak up sunlight.', term: 'Solar', definition: 'Energy from the sun' },
            { audioScript: 'Wind turbines spin in the breeze.', term: 'Wind', definition: 'Energy from moving air' },
            { audioScript: 'Dams push water through giant generators.', term: 'Hydro', definition: 'Energy from flowing water' },
          ],
        }, 'Listen for the key word, then match it to its meaning.'),
        act('✍️ Dictation — Type the Exact Words', 'dictation', {
          sentences: ['Solar panels convert sunlight into electricity.', 'Wind farms generate clean power for cities.'],
        }),
        act('🗂️ Sorting Game', 'sorting', {
          categories: ['Renewable Energy', 'Fossil Fuels'],
          items: [
            { text: 'Solar Power', category: 'Renewable Energy' },
            { text: 'Coal', category: 'Fossil Fuels' },
            { text: 'Wind Energy', category: 'Renewable Energy' },
            { text: 'Natural Gas', category: 'Fossil Fuels' },
          ],
        }, 'Correctly sorted!'),
        act('⌨️ Typing Speed', 'typing_speed', {
          text: 'Climate change is a global challenge that requires immediate action from all nations.',
        }),
        act('🎲 Speaking Game', 'speaking_game', {
          game: 'Speaking Game',
          rounds: [
            { type: 'would_you_rather', question: 'Would you rather live in a fully sustainable small house OR a large wasteful house?' },
            { type: 'two_truths_one_lie', prompt: 'Share two truths and one lie about your recycling habits.' },
            { type: 'truth', question: 'What is one thing you do daily to help the environment?' },
            { type: 'dare', prompt: 'Name three ways to reduce plastic waste in 15 seconds!' },
          ],
        }, 'Fun speaking practice — no XP for card flips!'),
        act('🗣️ Pronunciation — Say It Right', 'pronunciation_check', {
          words: [
            { word: 'Environment', phonetic: '/ɪnˈvaɪrənmənt/', example: 'We must protect the environment.' },
            { word: 'Pollution', phonetic: '/pəˈluːʃən/', example: 'Air pollution is a serious problem.' },
          ],
        }),
        act('👂 Minimal Pairs', 'minimal_pairs', {
          pairs: [
            { word1: 'ship', word2: 'sheep', correct: 'sheep', sentence: 'The sheep grazed on the hill.' },
            { word1: 'hit', word2: 'heat', correct: 'heat', sentence: 'Turn the heat down, please.' },
          ],
        }),
        act('👅 Tongue Twister', 'tongue_twister', {
          twisters: [{ text: 'She sells seashells by the seashore.' }, { text: 'Which wristwatches are Swiss wristwatches?' }],
        }),
        act('📢 Read Aloud — Speak with Confidence', 'read_aloud', {
          text: 'The sun gives us light, warmth, and clean energy every single day.',
        }),
        act('🔊 Shadowing — Repeat After Me', 'shadowing', {
          sentences: [
            '[female1]Climate change is affecting every continent on Earth.',
            '[male1]We must take action now to reduce our carbon footprint.',
            '[child1]Small hands can plant big forests!',
          ],
        }, 'Listen to the model, then record your own voice — the player compares your pronunciation word by word.'),
        act('⏰ Speaking Jam', 'speaking_jam', {
          topic: 'Energy Saving Ideas',
          duration: 60,
          bullets: ['Talk about one way you save electricity.', 'Describe a future invention that helps the planet.'],
        }),
        act('🎭 Movie Scene Roleplay', 'movie_scene', {
          setting: 'A city council debates installing solar panels on the town hall.',
          lines: [
            { speaker: 'Mayor', text: 'Our budget is tight, but the sun is free.', mood: 'thoughtful' },
            { speaker: 'Engineer', text: 'Panels could pay for themselves in six years.', mood: 'confident' },
            { speaker: 'Student', text: 'Our generation will inherit this choice.', mood: 'hopeful' },
          ],
        }),
        act('🤔 Would You Rather', 'would_you_rather', {
          questions: [
            { q: 'Would you rather plant ten trees or clean a beach?', options: ['Plant ten trees', 'Clean a beach'], answer: 'Plant ten trees' },
          ],
        }),
        act('🧠 AI Trivia', 'ai_trivia', {
          questions: [
            { q: 'Which country leads the world in wind power capacity?', options: ['China', 'Iceland', 'Brazil'], answer: 'China' },
          ],
        }),
        act('📖 Interactive Story', 'interactive_story', {
          scenes: [
            { id: 's1', emoji: '🌊', title: 'The Discovery', text: 'You find a mysterious solar-powered gadget on the beach, half-buried in the sand. What do you do?', choices: [{ text: 'Take it home and charge it', next: 's2', effect: 'Curiosity wins! You tuck the gadget into your backpack.' }, { text: 'Bury it again and walk away', next: 's3', effect: 'You leave, but the gadget glows softly behind you…' }] },
            { id: 's2', emoji: '⚡', title: 'The Map', text: 'At home it hums to life and projects a glowing map of hidden wind farms across the coast. Do you follow it?', choices: [{ text: 'Follow the map at dawn', next: 's4', effect: 'Adventure awaits on the cliffs!' }, { text: 'Tell your science teacher first', next: 's5', effect: 'Wisdom before courage — your teacher smiles.' }] },
            { id: 's3', emoji: '🌙', title: 'What If…', text: 'The tide washes it away, but that night you dream of spinning turbines and endless clean energy.', choices: [{ text: 'Dream on', next: 's5', effect: 'Some stories end so better ones can begin.' }, { text: 'Search the beach again tomorrow', next: 's4', effect: 'The sea gives back to those who return.' }] },
            { id: 's4', emoji: '🏆', title: 'The Wind Farm', text: 'On a windswept cliff you find the old turbine station — still working, still waiting for someone curious enough to find it. You did!', choices: [] },
            { id: 's5', emoji: '🏆', title: 'A New Project', text: 'Your teacher helps you build a class project from your discovery. Your name goes on the plaque — explorer, scientist, storyteller.', choices: [] },
          ],
        }),
      ],
    },
    {
      title: '📝 Section 4: Listening Script, Puzzles & Review',
      color: '#7B61FF',
      studyTime: '20 mins',
      xpReward: 150,
      activities: [
        {
          title: '🎧 Listening — 5-Character Panel Discussion',
          type: 'listening_script',
          content: LISTEN_SCRIPT,
          comprehensiveFeedback: 'Key idea: renewable energy is advancing fast, and hands-on science inspires communities.',
        },
        act('❓ Listening Check', 'questions', "1. Who opens the sustainable energy panel discussion?\n2. What key advance in solar energy does Dr. Sophia emphasize?\n3. Which renewable energy source does Liam highlight in the UK?\n4. What did young Leo construct for his school science fair?\n5. Why does Emma believe Leo's school project is so impactful?", '1. Alexander. 2. Photovoltaic solar efficiency has doubled. 3. Offshore wind energy. 4. Mini solar water heaters. 5. Communities get inspired to go green.'),
        act('🎧 Gap Transcript', 'gap_transcript', {
          audioText: 'Renewable energy comes from natural sources that never run out, like sunlight and wind.',
          gappedText: '________ energy comes from natural sources that never run out, like ________ and wind.',
          answers: ['Renewable', 'sunlight'],
        }),
        act('🕳️ Concealed Text', 'concealed', 'The greenhouse effect traps heat in the atmosphere — click to reveal this hidden definition.'),
        act('🧩 Escape Room', 'escape_room', {
          story: 'The lights are off and the door is locked. Solve each riddle to power the room and escape!',
          puzzles: [
            { clue: 'I rise when fossil fuels burn. What am I? (one word)', answer: 'temperature', hint: 'Think thermometers.' },
            { clue: 'I spin in the wind and make clean power. What am I?', answer: 'turbine', hint: 'It has giant blades.' },
            { clue: 'Pick the renewable one:', options: ['Coal', 'Sunlight', 'Oil'], answer: 'Sunlight', hint: 'It rises every morning.' },
          ],
        }),
        act('🪝 Hangman', 'hangman', {
          words: [
            { word: 'RECYCLING', hint: 'Turning waste into new products.' },
            { word: 'SOLAR', hint: 'Energy from the sun.' },
          ],
        }),
        act('🔤 Word Search', 'word_search', {
          words: ['SOLAR', 'WIND', 'GREEN', 'EARTH'],
        }),
        act('🎱 Bingo — Listen & Mark', 'bingo', {
          words: ['SOLAR', 'WIND', 'HYDRO', 'GREEN', 'EARTH', 'PANEL', 'TURBINE', 'ENERGY', 'BATTERY'],
        }),
        act('🔗 Connect Lines', 'connect_lines', {
          pairs: [
            { left: 'Solar', right: 'Sunlight' },
            { left: 'Wind', right: 'Turbines' },
            { left: 'Hydro', right: 'Dams' },
          ],
        }),
        act('📅 Timeline Placement', 'timeline_placement', {
          events: [
            { text: 'First modern solar cell invented', year: '1954' },
            { text: 'Paris Climate Agreement signed', year: '2015' },
            { text: 'Wind power passes 1 TW worldwide', year: '2023' },
          ],
        }),
        act('🃏 Memory Match', 'memory_match', {
          pairs: [
            { text: 'Solar', matchId: 'solar', type: 'word' },
            { text: '☀️', matchId: 'solar', type: 'emoji' },
            { text: 'Wind', matchId: 'wind', type: 'word' },
            { text: '🌬️', matchId: 'wind', type: 'emoji' },
          ],
        }),
        act('📊 Split View — Compare & Contrast', 'split_view', {
          left: { title: 'Renewable', content: 'Energy that naturally replenishes: solar, wind, hydro, geothermal.' },
          right: { title: 'Non-renewable', content: 'Finite energy that takes millions of years to form: coal, oil, gas.' },
        }),
        act('🖼️ Image Block', 'image_block', {
          src: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80',
          alt: 'Solar panels at sunset',
          caption: 'A solar farm at golden hour.',
        }),
        act('💬 Quote Block', 'quote_block', {
          text: 'We do not inherit the Earth from our ancestors; we borrow it from our children.',
          author: 'Native American Proverb',
        }),
        act('🧮 Math Block', 'math_block', {
          expression: 'E = mc²',
          caption: 'The famous energy equation.',
        }),
        act('💻 Code Block', 'code_block', {
          code: 'def save_planet():\n    return "plant more trees"',
          language: 'python',
        }),
        act('🔊 Audio Block', 'audio_block', {
          title: 'Climate & Energy — Audio Note',
          text: 'Climate change is affecting every continent. Listen carefully, then repeat the key phrases you hear.',
        }),
        act('🎬 Video Block', 'video_block', {
          url: 'https://www.youtube.com/watch?v=xKxrkht7CpY',
          description: 'How do solar panels work? (YouTube)',
        }),
        act('✍️ Guided Writing — Build Your Paragraph', 'guided_writing', {
          prompt: 'Describe one renewable energy source and how it could power your home town.',
          steps: [
            { goal: 'Name your energy source and where it comes from.', starter: 'Renewable energy is important because…' },
            { goal: 'Give a concrete example of it working in daily life.', starter: 'For example, in my town…' },
            { goal: 'Add one extra detail or benefit.', starter: 'Furthermore, …' },
            { goal: 'Wrap up with your conclusion.', starter: 'In conclusion, …' },
          ],
          scaffolds: ['Renewable energy is important because…', 'For example, in my town…', 'Furthermore, …', 'In conclusion, …'],
          targetWords: 60,
          rubric: [{ criterion: 'Vocabulary', description: 'Uses at least 3 lesson vocabulary items' }, { criterion: 'Structure', description: 'Has a clear topic sentence and conclusion' }],
        }),
      ],
    },
    {
      title: '💬 Section 6: Roleplay & Reporting',
      color: '#8b5cf6',
      studyTime: '10 mins',
      xpReward: 50,
      activities: [
        act('🎭 Conversation Roleplay', 'conversation_roleplay', {
          setting: 'A new student asks Leo about his solar science project.',
          lines: [
            { speaker: 'Maya', text: 'Hi Leo! How did your solar water heater work?', mood: 'curious' },
            { speaker: 'Leo', text: 'It was amazing! The sun heated the water to sixty degrees!', mood: 'excited' },
            { speaker: 'Maya', text: 'Wow — so no electricity at all?', mood: 'surprised' },
            { speaker: 'Leo', text: 'None! Clean energy from sunlight alone.', mood: 'proud' },
          ],
        }),
      ],
    },
    {
      title: '🧾 Section 5: Writing & Wrapping Up',
      color: '#0ea5e9',
      studyTime: '15 mins',
      xpReward: 100,
      activities: [
        act('✍️ Essay Writing', 'essay_writing', {
          prompt: 'Write a short paragraph about one renewable energy source and why it matters.',
          minWords: 40,
        }),
        act('🎙️ Voice Recording', 'voice_recording', {
          prompts: ['Describe your favourite season in three sentences.'],
        }),
        act('📚 Final Review & Discussion', 'questions', '<b>Group Discussion:</b>\nWhat is the biggest environmental challenge in your country?\nHow can technology help solve climate change?\nWhat personal changes will you make after this lesson?', 'Encourage specific, personal answers.'),
      ],
    },
  ],
});

/** Build the mock lesson JSON string used by the "Load Mock Data" button. */
export const getFullCoverageMockJson = (): string => JSON.stringify(buildFullCoverageMockLesson(), null, 2);
