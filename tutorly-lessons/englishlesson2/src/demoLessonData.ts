/**
 * ============================================================================
 * demoLessonData.ts – Comprehensive demo lesson payload
 * Topic: "Talking About Past Experiences"
 * Includes sections for all three modes with 25+ different activity types.
 * ============================================================================
 */

import type { LessonPayload, LearnerProfile, GeneratorConfig } from './lessonTypes';

/** Demo learner profile */
export const demoLearner: LearnerProfile = {
  name: 'Alex Rivera',
  avatar: null, // Will trigger avatar modal
  cefrLevel: 'B2',
  l1: 'es', // Spanish
  interests: ['travel', 'movies', 'cooking', 'music'],
  ageGroup: 'adult',
};

/** Demo generator configuration */
export const demoConfig: GeneratorConfig = {
  gamificationEnabled: true,
  ttsEnabled: true,
  deadlineDate: new Date(Date.now() + 7 * 86400000).toISOString(),
  studyModeVoice: 'Microsoft Zira',
  mascotEnabled: true,
  celebrationIntensity: 'normal',
  spiralRepetition: true,
  tutorPasscode: '1234',
  xpValues: {
    flashcard: 15, vocab_table: 5, spelling_bee: 20, bingo: 10,
    word_search: 15, hangman: 20, gap_fill: 15, gap_fill_dropdown: 12,
    gap_fill_drag: 15, error_correction: 18, scramble: 20, matching: 12,
    memory_match: 15, sequence_ordering: 15, multiple_choice: 10,
    true_false: 8, dictation: 25, minimal_pairs: 12, typing_speed: 20,
    escape_room: 40, timed_reading: 25, text_reconstruction: 20,
    word_formation: 18, pattern_drills: 20, sorting: 15,
    listening_mc: 20, ai_trivia: 10, spelling: 15,
  },
  levelThresholds: [0, 50, 120, 220, 350, 520, 730, 1000, 1350, 1800],
  defaultTheme: 'default',
  hapticEnabled: true,
};

/** Comprehensive demo lesson payload */
export const demoLesson: LessonPayload = {
  lessonSummary: `
    <div style="padding:16px;background:linear-gradient(135deg,#667eea22,#764ba222);border-radius:12px;margin-bottom:16px">
      <h2 style="margin-bottom:8px">🌍 Talking About Past Experiences</h2>
      <p>In this lesson, you'll learn to talk about memorable experiences using the <strong>Present Perfect</strong> and <strong>Past Simple</strong> tenses. You'll build vocabulary related to travel and adventure, practise pronunciation, and develop your speaking fluency.</p>
      <p style="color:#666;margin-top:8px">CEFR Level: B2 | Estimated Time: 60–90 minutes</p>
    </div>
  `,
  settings: {
    lessonName: 'Unit 5 – Past Experiences & Adventures',
    lessonTimeRange: '60-90 minutes',
    teacherNotes: 'Focus on the contrast between Present Perfect (experience) and Past Simple (specific past). Use personalised questions. Monitor for L1 interference with Spanish speakers.',
    homeworkChecklist: 'Complete all Practice mode activities\nWrite a paragraph about your most memorable trip\nReview vocabulary flashcards\nDo the self-assessment checklist',
    materialLinks: 'https://www.google.com/search?q=present+perfect+vs+past+simple\nhttps://www.youtube.com/watch?v=past_experiences_lesson',
    deadlineIso: new Date(Date.now() + 7 * 86400000).toISOString(),
    tags: ['present perfect', 'past simple', 'travel', 'experiences'],
  },
  sections: [
    // ============================================================
    // PREPARE MODE SECTIONS
    // ============================================================
    {
      title: '🌟 Lead-in: Have You Ever...?',
      color: '#f59e0b',
      studyTime: '5 minutes',
      xpReward: 30,
      mode: 'prepare',
      difficulty: 'easy',
      tags: ['warm-up', 'present perfect'],
      activities: [
        {
          type: 'would_you_rather',
          title: 'Would You Rather: Travel Edition',
          content: JSON.stringify({
            options: [
              { optionA: 'Travel to the past and meet a historical figure', optionB: 'Travel to the future and see technology in 2100' },
              { optionA: 'Visit every country in Europe', optionB: 'Explore every island in the Pacific' },
              { optionA: 'Go on a safari in Africa', optionB: 'Trek through the Amazon rainforest' },
            ]
          }),
          comprehensiveFeedback: '<p>Great choices! These questions use hypothetical language. Notice how we use <strong>"would rather"</strong> + base verb to talk about preferences.</p>',
        },
        {
          type: 'multiple_choice',
          title: 'Quick Quiz: What Do You Know?',
          content: JSON.stringify({
            questions: [
              {
                question: 'Which tense do we use to talk about a life experience without specifying when?',
                options: ['Past Simple', 'Present Perfect', 'Past Continuous', 'Future Simple'],
                answer: 'Present Perfect',
                explanation: 'We use the Present Perfect to talk about experiences at an unspecified time in the past.'
              },
              {
                question: '"I have been to Paris." What does this sentence mean?',
                options: ['I am in Paris now', 'I visited Paris at some point in my life', 'I will go to Paris', 'I was born in Paris'],
                answer: 'I visited Paris at some point in my life',
                explanation: '"Have been to" means you visited a place at some point in your life and returned.'
              },
            ]
          }),
          comprehensiveFeedback: '<p>The <strong>Present Perfect</strong> (have/has + past participle) is used for:</p><ul><li>Life experiences: <em>I have visited Japan.</em></li><li>Unfinished time: <em>I have read two books this week.</em></li><li>Recent events: <em>She has just arrived.</em></li></ul>',
        },
      ],
    },
    {
      title: '📚 Vocabulary: Travel & Experiences',
      color: '#3b82f6',
      studyTime: '15 minutes',
      xpReward: 80,
      mode: 'prepare',
      difficulty: 'easy',
      tags: ['vocabulary', 'travel'],
      activities: [
        {
          type: 'flashcard',
          title: 'Key Vocabulary Flashcards',
          content: JSON.stringify({
            cards: [
              { front: 'adventurous', back: 'Willing to try new or difficult things', translation: 'aventurero', example: 'She is very adventurous and loves trying extreme sports.', ccq: 'Does an adventurous person stay at home?' },
              { front: 'breathtaking', back: 'Extremely beautiful or amazing', translation: 'impresionante', example: 'The view from the mountain was breathtaking.', ccq: 'Is a breathtaking view ordinary?' },
              { front: 'memorable', back: 'Worth remembering; unforgettable', translation: 'memorable', example: 'Our trip to Iceland was truly memorable.', ccq: 'Would you easily forget a memorable event?' },
              { front: 'exotic', back: 'Unusual and exciting because of coming from a far-away country', translation: 'exótico', example: 'They tried exotic fruits in Thailand.', ccq: 'Is an apple exotic in Europe?' },
              { front: 'cuisine', back: 'A style of cooking', translation: 'cocina/gastronomía', example: 'Japanese cuisine is famous worldwide.', ccq: 'Is cuisine the same as a kitchen?' },
              { front: 'itinerary', back: 'A planned route or journey', translation: 'itinerario', example: 'Our itinerary included visits to three cities.', ccq: 'Do you make an itinerary before or after a trip?' },
            ]
          }),
          comprehensiveFeedback: '<p>Great job learning these travel words! Remember:</p><ul><li><strong>Adventurous</strong> describes a personality trait</li><li><strong>Breathtaking</strong> is a strong adjective (don\'t use "very" with it – use "absolutely")</li><li><strong>Cuisine</strong> is more formal than "food"</li></ul>',
        },
        {
          type: 'vocab_table',
          title: 'Vocabulary Reference Table',
          content: JSON.stringify({
            words: [
              { word: 'adventurous', ipa: '/ədˈventʃərəs/', definition: 'willing to try new things', example: 'an adventurous traveler', collocations: 'adventurous spirit, adventurous person', wordFamily: 'adventure (n), adventurously (adv)' },
              { word: 'breathtaking', ipa: '/ˈbreθteɪkɪŋ/', definition: 'extremely impressive', example: 'breathtaking scenery', collocations: 'breathtaking view, breathtaking beauty', wordFamily: 'breathe (v), breath (n)' },
              { word: 'memorable', ipa: '/ˈmemərəbl/', definition: 'worth remembering', example: 'a memorable experience', collocations: 'memorable occasion, memorable trip', wordFamily: 'memory (n), memorize (v)' },
              { word: 'exotic', ipa: '/ɪɡˈzɒtɪk/', definition: 'strikingly unusual', example: 'exotic destinations', collocations: 'exotic food, exotic location', wordFamily: 'exotically (adv)' },
              { word: 'itinerary', ipa: '/aɪˈtɪnərəri/', definition: 'planned route', example: 'travel itinerary', collocations: 'detailed itinerary, follow the itinerary', wordFamily: 'itinerant (adj)' },
              { word: 'cuisine', ipa: '/kwɪˈziːn/', definition: 'style of cooking', example: 'local cuisine', collocations: 'French cuisine, traditional cuisine', wordFamily: 'chef (n, related)' },
            ]
          }),
          comprehensiveFeedback: '<p>Use this table as a reference. Try to use each word in a sentence today!</p>',
        },
        {
          type: 'matching',
          title: 'Match Words to Definitions',
          content: JSON.stringify({
            pairs: [
              { left: 'adventurous', right: 'willing to try new things' },
              { left: 'breathtaking', right: 'extremely impressive' },
              { left: 'memorable', right: 'worth remembering' },
              { left: 'exotic', right: 'strikingly unusual' },
              { left: 'itinerary', right: 'planned route or journey' },
              { left: 'cuisine', right: 'style of cooking' },
            ]
          }),
          comprehensiveFeedback: '<p>Excellent! You matched all the vocabulary correctly. These words will appear again throughout the lesson.</p>',
        },
        {
          type: 'spelling_bee',
          title: '🐝 Spelling Bee: Travel Words',
          content: JSON.stringify({
            words: [
              { word: 'adventurous', hint: 'adjective, willing to try new things' },
              { word: 'breathtaking', hint: 'adjective, extremely beautiful' },
              { word: 'itinerary', hint: 'noun, a planned route' },
              { word: 'cuisine', hint: 'noun, a style of cooking' },
              { word: 'memorable', hint: 'adjective, worth remembering' },
            ]
          }),
          comprehensiveFeedback: '<p>Spelling is important! Watch out for:</p><ul><li><strong>itinerary</strong> – many people misspell this as "itinarary"</li><li><strong>cuisine</strong> – from French, pronounced /kwɪˈziːn/</li></ul>',
        },
      ],
    },
    {
      title: '📝 Grammar: Present Perfect vs Past Simple',
      color: '#8b5cf6',
      studyTime: '20 minutes',
      xpReward: 100,
      mode: 'prepare',
      difficulty: 'medium',
      tags: ['grammar', 'present perfect', 'past simple'],
      activities: [
        {
          type: 'grammar_reference',
          title: '📘 Grammar Reference',
          content: JSON.stringify({
            cards: [
              {
                title: 'Present Perfect: Form',
                content: '<p><strong>Subject + have/has + past participle</strong></p><p>✅ I have visited Paris.<br>✅ She has eaten sushi.<br>❌ I have visited Paris yesterday. (WRONG – use Past Simple)</p>',
                examples: ['I have never been to Australia.', 'Have you ever tried bungee jumping?', 'She has travelled to 20 countries.']
              },
              {
                title: 'Past Simple: Form',
                content: '<p><strong>Subject + verb (past form)</strong></p><p>✅ I visited Paris last year.<br>✅ She ate sushi on Monday.</p>',
                examples: ['I went to Japan in 2023.', 'Did you enjoy the trip?', 'They didn\'t see the Eiffel Tower.']
              },
              {
                title: 'When to Use Which?',
                content: '<p><strong>Present Perfect:</strong> experience (no specific time), unfinished time periods<br><strong>Past Simple:</strong> finished actions at a specific time</p>',
                examples: ['I have been to Rome. (experience – when doesn\'t matter)', 'I went to Rome last summer. (specific time)']
              }
            ]
          }),
          comprehensiveFeedback: '',
        },
        {
          type: 'gap_fill',
          title: 'Fill in the Gaps: Present Perfect or Past Simple?',
          content: JSON.stringify({
            sentences: [
              { text: 'I ___ (visit) Paris three times.', answer: 'have visited', hint: 'experience, no specific time' },
              { text: 'She ___ (go) to Japan last summer.', answer: 'went', hint: 'specific time: last summer' },
              { text: '___ you ever ___ (try) sushi?', answer: 'Have tried', hint: 'life experience question' },
              { text: 'We ___ (see) the Colosseum when we were in Rome.', answer: 'saw', hint: 'specific past situation' },
              { text: 'They ___ (not/travel) abroad since 2020.', answer: "haven't travelled", hint: 'since = present perfect' },
              { text: 'I ___ (buy) this souvenir in Morocco.', answer: 'bought', hint: 'specific place = specific time implied' },
            ]
          }),
          comprehensiveFeedback: '<p>Key rules:</p><ul><li>Use <strong>Present Perfect</strong> with: ever, never, already, yet, just, since, for</li><li>Use <strong>Past Simple</strong> with: yesterday, last week, in 2020, when I was young, ago</li></ul>',
        },
        {
          type: 'gap_fill_dropdown',
          title: 'Choose the Correct Tense',
          content: JSON.stringify({
            sentences: [
              { text: 'I ___ to Berlin, but I want to go.', answer: 'have never been', options: ['have never been', 'never was', 'was never been'] },
              { text: 'When ___ you last ___ on holiday?', answer: 'did go', options: ['did go', 'have gone', 'do go'] },
              { text: 'She ___ already ___ the report.', answer: 'has finished', options: ['has finished', 'finished', 'is finishing'] },
              { text: 'We ___ there in 2019.', answer: 'went', options: ['went', 'have gone', 'have been'] },
            ]
          }),
          comprehensiveFeedback: '<p>Remember: <strong>"have been to"</strong> = visited and returned. <strong>"have gone to"</strong> = went and is still there.</p>',
        },
        {
          type: 'error_correction',
          title: '🔧 Find and Fix the Errors',
          content: JSON.stringify({
            sentences: [
              { text: 'I have went to Paris last year.', errorWord: 'went', correction: 'been', explanation: 'Present Perfect uses the past participle: "have been". But with "last year", use Past Simple: "I went to Paris last year."' },
              { text: 'She has never ate sushi before.', errorWord: 'ate', correction: 'eaten', explanation: '"Ate" is the Past Simple form. The past participle is "eaten": "She has never eaten sushi."' },
              { text: 'Did you ever been to Australia?', errorWord: 'Did', correction: 'Have', explanation: 'For experiences, use Present Perfect: "Have you ever been to Australia?"' },
              { text: 'They have visited Rome yesterday.', errorWord: 'yesterday', correction: '', explanation: 'With "yesterday", use Past Simple: "They visited Rome yesterday." Remove "have" or remove "yesterday".' },
            ]
          }),
          comprehensiveFeedback: '<p>Common errors with Present Perfect:</p><ul><li>Using the wrong participle form (ate → eaten, went → gone/been)</li><li>Mixing Present Perfect with past time markers (yesterday, last week, in 2020)</li></ul>',
        },
        {
          type: 'scramble',
          title: '🔀 Unscramble the Sentences',
          content: JSON.stringify({
            sentences: [
              { words: ['Have', 'you', 'ever', 'tried', 'bungee', 'jumping?'], correctOrder: 'Have you ever tried bungee jumping?' },
              { words: ['She', 'has', 'never', 'been', 'to', 'Asia.'], correctOrder: 'She has never been to Asia.' },
              { words: ['I', 'visited', 'my', 'grandmother', 'last', 'weekend.'], correctOrder: 'I visited my grandmother last weekend.' },
            ]
          }),
          comprehensiveFeedback: '<p>Word order in questions: <strong>Have/Has + subject + ever + past participle...?</strong></p><p>Negative: <strong>Subject + have/has + never + past participle</strong></p>',
        },
      ],
    },
    {
      title: '👂 Listening & Pronunciation',
      color: '#06b6d4',
      studyTime: '10 minutes',
      xpReward: 60,
      mode: 'prepare',
      difficulty: 'medium',
      tags: ['listening', 'pronunciation'],
      activities: [
        {
          type: 'minimal_pairs',
          title: 'Minimal Pairs: Past Tense Endings',
          content: JSON.stringify({
            pairs: [
              { wordA: 'walked', wordB: 'worked', correct: 'A' },
              { wordA: 'played', wordB: 'prayed', correct: 'A' },
              { wordA: 'lived', wordB: 'left', correct: 'A' },
              { wordA: 'traveled', wordB: 'troubled', correct: 'A' },
            ]
          }),
          comprehensiveFeedback: '<p>Past tense -ed has three pronunciations: /t/ (walked), /d/ (played), /ɪd/ (visited). Listen carefully to the final sound!</p>',
        },
        {
          type: 'dictation',
          title: '📝 Dictation: Past Experiences',
          content: JSON.stringify({
            sentences: [
              { text: 'I have visited five different countries.' },
              { text: 'She went to Thailand last summer.' },
              { text: 'Have you ever tried exotic food?' },
              { text: 'We had a memorable experience in Iceland.' },
            ]
          }),
          comprehensiveFeedback: '<p>Great listening practice! Pay attention to:</p><ul><li>Contractions: "I\'ve" = "I have"</li><li>Weak forms: "have" is often pronounced /əv/ in connected speech</li></ul>',
        },
      ],
    },
    {
      title: '📖 Reading: A Travel Blog',
      color: '#10b981',
      studyTime: '10 minutes',
      xpReward: 50,
      mode: 'prepare',
      difficulty: 'medium',
      tags: ['reading', 'travel', 'present perfect'],
      activities: [
        {
          type: 'timed_reading',
          title: '⏱ Timed Reading: My Gap Year',
          content: JSON.stringify({
            passage: "Last year, I decided to take a gap year before starting university. It was the best decision I have ever made. I travelled through Southeast Asia for six months, starting in Thailand and ending in Vietnam. I have tried so many amazing foods – from pad thai in Bangkok to pho in Hanoi. The most breathtaking moment was watching the sunrise over Angkor Wat in Cambodia. I stayed in hostels and met people from all over the world. I have made friends that I will keep for life. One memorable experience was when I got lost in a small village in Laos. The local people were incredibly kind and invited me to have dinner with them. I had never tried Laotian cuisine before, and it was absolutely delicious. By the end of my trip, I had visited eight countries and had spent less than I would have spent on one semester at university. Have you ever thought about taking a gap year? I would highly recommend it.",
            wordCount: 165,
            questions: [
              { question: 'How long did the writer travel for?', options: ['3 months', '6 months', '1 year', '8 months'], answer: '6 months', type: 'mcq' },
              { question: 'What was the most breathtaking moment?', options: ['Getting lost in Laos', 'Watching sunrise at Angkor Wat', 'Meeting new friends', 'Trying pad thai'], answer: 'Watching sunrise at Angkor Wat', type: 'mcq' },
              { question: 'How many countries did the writer visit?', options: ['5', '6', '8', '10'], answer: '8', type: 'mcq' },
            ]
          }),
          comprehensiveFeedback: '<p>Notice how the blog post uses both tenses:</p><ul><li><strong>Present Perfect:</strong> "I have tried", "I have made" (connecting past to now)</li><li><strong>Past Simple:</strong> "I decided", "I travelled", "I stayed" (narrating completed events)</li></ul>',
        },
      ],
    },
    {
      title: '🎮 Games & Fun Practice',
      color: '#ec4899',
      studyTime: '15 minutes',
      xpReward: 70,
      mode: 'prepare',
      difficulty: 'easy',
      tags: ['games', 'vocabulary', 'grammar'],
      activities: [
        {
          type: 'memory_match',
          title: '🧠 Memory Match: Verb Forms',
          content: JSON.stringify({
            pairs: [
              { a: 'go', b: 'gone (PP)' },
              { a: 'see', b: 'seen (PP)' },
              { a: 'eat', b: 'eaten (PP)' },
              { a: 'buy', b: 'bought (PP)' },
              { a: 'take', b: 'taken (PP)' },
              { a: 'write', b: 'written (PP)' },
            ]
          }),
          comprehensiveFeedback: '<p>Irregular past participles are essential for the Present Perfect. Keep practising until you know them automatically!</p>',
        },
        {
          type: 'hangman',
          title: '☠️ Hangman: Mystery Travel Word',
          content: JSON.stringify({
            words: [
              { word: 'BREATHTAKING', hint: 'An adjective meaning extremely beautiful or impressive' },
            ]
          }),
          comprehensiveFeedback: '<p><strong>Breathtaking</strong> is a compound adjective: breath + taking. It literally means "so beautiful it takes your breath away."</p>',
        },
        {
          type: 'escape_room',
          title: '🔐 Grammar Escape Room',
          content: JSON.stringify({
            puzzles: [
              { clue: 'Complete: "I have _____ (eat) sushi before."', answer: 'eaten', hint: 'Past participle of "eat"' },
              { clue: 'Complete: "She _____ (go) to Spain last July."', answer: 'went', hint: 'Past Simple of "go"' },
              { clue: 'Which word completes: "Have you _____ been to Asia?"', answer: 'ever', hint: 'Used in Present Perfect questions about experiences' },
              { clue: 'Complete: "They haven\'t travelled abroad _____ 2020."', answer: 'since', hint: 'Used with a point in time' },
            ]
          }),
          comprehensiveFeedback: '<p>🎉 You escaped! Key grammar points tested: irregular participles, tense choice, and time expressions (ever, since, for).</p>',
        },
        {
          type: 'typing_speed',
          title: '⌨️ Typing Speed Challenge',
          content: JSON.stringify({
            text: 'Have you ever visited a country that completely changed your perspective on life?',
            targetWPM: 40,
          }),
          comprehensiveFeedback: '<p>Fast typing helps with writing exams! Keep practising to improve your speed and accuracy.</p>',
        },
      ],
    },
    {
      title: '🔄 Review & Spiral Practice',
      color: '#6366f1',
      studyTime: '10 minutes',
      xpReward: 60,
      mode: 'prepare',
      difficulty: 'hard',
      tags: ['review', 'present perfect', 'vocabulary', 'grammar'],
      activities: [
        {
          type: 'word_formation',
          title: 'Word Formation Table',
          content: JSON.stringify({
            rows: [
              { noun: 'adventure', verb: 'adventure', adjective: 'adventurous', gap: 'adjective' },
              { noun: 'memory', verb: 'memorize', adjective: 'memorable', gap: 'noun' },
              { noun: 'experience', verb: 'experience', adjective: 'experienced', gap: 'verb' },
              { noun: 'exploration', verb: 'explore', adjective: 'exploratory', gap: 'adjective' },
            ]
          }),
          comprehensiveFeedback: '<p>Word families help you expand your vocabulary. If you know one form, you can often guess the others!</p>',
        },
        {
          type: 'pattern_drills',
          title: 'Sentence Transformation Drills',
          content: JSON.stringify({
            drills: [
              { instruction: 'Rewrite using Present Perfect:', prompt: 'I visited Japan. (experience)', answer: 'I have visited Japan.' },
              { instruction: 'Rewrite using Past Simple:', prompt: 'I have eaten sushi. (Add: last night)', answer: 'I ate sushi last night.' },
              { instruction: 'Make it negative:', prompt: 'She has been to Africa.', answer: "She hasn't been to Africa." },
              { instruction: 'Make a question:', prompt: 'You have tried bungee jumping.', answer: 'Have you tried bungee jumping?' },
            ]
          }),
          comprehensiveFeedback: '<p>Transformation exercises help you internalise grammar rules. Pay attention to the changes needed when switching between tenses.</p>',
        },
        {
          type: 'true_false',
          title: 'True or False: Grammar Rules',
          content: JSON.stringify({
            statements: [
              { statement: 'We use "since" with the Past Simple tense.', answer: false, explanation: '"Since" is used with the Present Perfect, not Past Simple.' },
              { statement: '"Have you ever been to Paris?" is a correct Present Perfect question.', answer: true, explanation: 'Yes! Have + subject + ever + past participle is the correct form.' },
              { statement: 'We can say "I have visited Rome yesterday."', answer: false, explanation: 'We cannot use "yesterday" with Present Perfect. Use Past Simple: "I visited Rome yesterday."' },
              { statement: '"She has gone to work" means she is at work now.', answer: true, explanation: 'Yes! "Has gone to" means she went and hasn\'t returned yet.' },
            ]
          }),
          comprehensiveFeedback: '<p>Understanding grammar rules helps prevent errors. Remember: time markers determine which tense to use!</p>',
        },
      ],
    },

    // ============================================================
    // PRODUCE MODE SECTIONS
    // ============================================================
    {
      title: '🎤 Warm-Up: Getting to Know Each Other',
      color: '#f59e0b',
      studyTime: '10 minutes',
      xpReward: 0,
      mode: 'produce',
      difficulty: 'easy',
      tags: ['speaking', 'warm-up'],
      activities: [
        {
          type: 'speaking_game',
          title: '🎲 Have You Ever...? Game',
          content: JSON.stringify({
            subtype: 'never_have_i_ever',
            prompts: [
              'Have you ever eaten something really strange?',
              'Have you ever been to a country where you didn\'t speak the language?',
              'Have you ever slept under the stars?',
              'Have you ever met a famous person?',
              'Have you ever forgotten your passport before a trip?',
              'Have you ever tried an extreme sport?',
              'Have you ever gotten lost in a foreign city?',
              'Have you ever cooked a meal from another culture?',
            ]
          }),
          comprehensiveFeedback: '',
        },
        {
          type: 'speaking_game',
          title: '🗣 Chatterbox: Random Questions',
          content: JSON.stringify({
            subtype: 'chatterbox',
            prompts: [
              'What is the most interesting place you have ever visited?',
              'Tell us about a time you tried something new.',
              'Describe the best meal you have ever had.',
              'What is the scariest thing you have ever done?',
              'Have you ever had a travel disaster? What happened?',
              'What country would you most like to visit and why?',
            ]
          }),
          comprehensiveFeedback: '',
        },
      ],
    },
    {
      title: '🗣 Controlled Speaking Practice',
      color: '#8b5cf6',
      studyTime: '15 minutes',
      xpReward: 0,
      mode: 'produce',
      difficulty: 'medium',
      tags: ['speaking', 'present perfect'],
      activities: [
        {
          type: 'shadowing',
          title: '🗣 Shadowing: Key Sentences',
          content: JSON.stringify({
            sentences: [
              { text: 'I have visited many beautiful countries.' },
              { text: 'Have you ever tried bungee jumping?' },
              { text: 'She went to Thailand last summer and loved it.' },
              { text: 'We have never eaten such delicious food before.' },
              { text: 'He has travelled to over thirty countries.' },
            ]
          }),
          comprehensiveFeedback: '',
        },
        {
          type: 'information_gap',
          title: '🔀 Information Gap: Travel Surveys',
          content: JSON.stringify({
            sideA: '<h4>Student A – Your experiences:</h4><p>✅ Been to Asia<br>❌ Never tried scuba diving<br>✅ Eaten exotic food<br>❌ Never camped in the wild</p><p>Ask Student B about THEIR experiences.</p>',
            sideB: '<h4>Student B – Your experiences:</h4><p>❌ Never been to Asia<br>✅ Tried scuba diving<br>❌ Never eaten exotic food<br>✅ Camped in the wild</p><p>Ask Student A about THEIR experiences.</p>',
            questions: [
              'Have you ever been to Asia?',
              'Have you ever tried scuba diving?',
              'Have you ever eaten exotic food?',
              'Have you ever camped in the wild?',
            ]
          }),
          comprehensiveFeedback: '',
        },
      ],
    },
    {
      title: '💬 Freer Speaking & Discussion',
      color: '#ec4899',
      studyTime: '15 minutes',
      xpReward: 0,
      mode: 'produce',
      difficulty: 'hard',
      tags: ['speaking', 'discussion'],
      activities: [
        {
          type: 'debate',
          title: '⚖️ Debate: Is Travel Overrated?',
          content: JSON.stringify({
            statement: '"Travelling is the best way to learn about the world."',
            forArguments: [
              'You experience different cultures first-hand',
              'Travel broadens your perspective',
              'You learn to be independent and adaptable',
            ],
            againstArguments: [
              'You can learn about cultures through books and the internet',
              'Travel is expensive and not accessible to everyone',
              'Short trips give a superficial understanding',
            ],
            timeLimitSeconds: 180,
          }),
          comprehensiveFeedback: '',
        },
        {
          type: 'one_minute_challenge',
          title: '⏱ One-Minute Talk',
          content: JSON.stringify({
            topic: 'Talk about the most memorable experience you have ever had. Where were you? What happened? Why was it special?',
            timeLimitSeconds: 60,
          }),
          comprehensiveFeedback: '',
        },
        {
          type: 'taboo',
          title: '🚫 Taboo: Travel Words',
          content: JSON.stringify({
            cards: [
              { word: 'AIRPORT', tabooWords: ['plane', 'fly', 'terminal', 'gate'] },
              { word: 'PASSPORT', tabooWords: ['travel', 'document', 'country', 'ID'] },
              { word: 'SUITCASE', tabooWords: ['luggage', 'pack', 'clothes', 'bag'] },
              { word: 'HOTEL', tabooWords: ['room', 'stay', 'sleep', 'book'] },
              { word: 'SOUVENIR', tabooWords: ['gift', 'remember', 'buy', 'trip'] },
            ]
          }),
          comprehensiveFeedback: '',
        },
      ],
    },

    // ============================================================
    // PRACTICE MODE SECTIONS
    // ============================================================
    {
      title: '📚 Vocabulary Revision',
      color: '#3b82f6',
      studyTime: '10 minutes',
      xpReward: 0,
      mode: 'practice',
      difficulty: 'easy',
      tags: ['vocabulary', 'homework'],
      activities: [
        {
          type: 'matching',
          title: 'Match Vocabulary to Definitions',
          content: JSON.stringify({
            pairs: [
              { left: 'adventurous', right: 'willing to try new things' },
              { left: 'breathtaking', right: 'extremely beautiful' },
              { left: 'memorable', right: 'worth remembering' },
              { left: 'exotic', right: 'unusual and exciting' },
              { left: 'cuisine', right: 'style of cooking' },
              { left: 'itinerary', right: 'planned route' },
            ]
          }),
          comprehensiveFeedback: '<p>Review these words regularly. Try to use at least 3 of them in conversation this week.</p>',
        },
        {
          type: 'gap_fill',
          title: 'Vocabulary in Context',
          content: JSON.stringify({
            sentences: [
              { text: 'The view from the top of the mountain was absolutely ___.', answer: 'breathtaking' },
              { text: 'We followed a detailed ___ during our trip to Europe.', answer: 'itinerary' },
              { text: 'Thai ___ is one of the most popular in the world.', answer: 'cuisine' },
              { text: 'It was a truly ___ experience that I will never forget.', answer: 'memorable' },
              { text: 'She is very ___ and loves trying extreme sports.', answer: 'adventurous' },
            ]
          }),
          comprehensiveFeedback: '<p>Context clues help you choose the right word. Look at the words around the blank to understand meaning.</p>',
        },
        {
          type: 'personal_dictionary',
          title: '📚 My Personal Dictionary',
          content: JSON.stringify({
            promptText: 'Add new words from this lesson to your personal dictionary. Include the word, definition, an example, and a translation.',
            categories: ['Travel', 'Grammar', 'Adjectives']
          }),
          comprehensiveFeedback: '',
        },
      ],
    },
    {
      title: '📝 Grammar Exercises',
      color: '#8b5cf6',
      studyTime: '15 minutes',
      xpReward: 0,
      mode: 'practice',
      difficulty: 'medium',
      tags: ['grammar', 'homework'],
      activities: [
        {
          type: 'gap_fill',
          title: 'Mixed Tenses Gap Fill',
          content: JSON.stringify({
            sentences: [
              { text: 'I ___ (never/be) to South America.', answer: 'have never been' },
              { text: 'Last week, we ___ (see) a fantastic film.', answer: 'saw' },
              { text: 'How many countries ___ you ___ (visit)?', answer: 'have visited' },
              { text: 'They ___ (live) in London for five years.', answer: 'have lived' },
              { text: 'She ___ (break) her leg when she was skiing.', answer: 'broke' },
              { text: 'I ___ (already/read) that book.', answer: 'have already read' },
            ]
          }),
          comprehensiveFeedback: '<p>Key tip: Look for time markers to decide the tense. "Last week" → Past Simple. "Never/already/for/since" → Present Perfect.</p>',
        },
        {
          type: 'error_correction',
          title: 'Find the Mistakes',
          content: JSON.stringify({
            sentences: [
              { text: 'I have went to the cinema yesterday.', errorWord: 'went', correction: 'been', explanation: 'Use "been" not "went" with have. Also, "yesterday" requires Past Simple.' },
              { text: 'She has ate three pizzas today.', errorWord: 'ate', correction: 'eaten', explanation: 'The past participle of "eat" is "eaten", not "ate".' },
              { text: 'We have lived here since five years.', errorWord: 'since', correction: 'for', explanation: 'Use "for" with a period of time (five years). Use "since" with a point in time (since 2020).' },
            ]
          }),
          comprehensiveFeedback: '<p>Error correction develops your editing skills. Always proofread your writing for these common mistakes.</p>',
        },
        {
          type: 'sequence_ordering',
          title: 'Order the Conversation',
          content: JSON.stringify({
            items: [
              'Have you ever been to Japan?',
              'Yes, I have! I went there in 2022.',
              'Really? What did you do there?',
              'I visited Tokyo and Kyoto. The temples were breathtaking.',
              'That sounds amazing! How long did you stay?',
              'I stayed for two weeks. It was the best trip of my life.',
            ],
            correctOrder: [0, 1, 2, 3, 4, 5],
          }),
          comprehensiveFeedback: '<p>Notice how the conversation starts with Present Perfect (asking about experience) and then switches to Past Simple (asking for details).</p>',
        },
      ],
    },
    {
      title: '✍️ Writing Task',
      color: '#10b981',
      studyTime: '15 minutes',
      xpReward: 0,
      mode: 'practice',
      difficulty: 'hard',
      tags: ['writing', 'homework'],
      activities: [
        {
          type: 'guided_writing',
          title: '✍️ Write About Your Most Memorable Trip',
          content: JSON.stringify({
            prompt: 'Write a paragraph (100-150 words) about the most memorable trip or experience you have ever had. Use both Present Perfect and Past Simple tenses.',
            sentenceStarters: [
              'The most memorable experience I have ever had was...',
              'I went to... in...',
              'I have never forgotten...',
              'It was... because...',
            ],
            minWords: 100,
            maxWords: 150,
          }),
          comprehensiveFeedback: '<p>Checklist for your writing:</p><ul><li>☐ Used Present Perfect at least twice</li><li>☐ Used Past Simple for specific past events</li><li>☐ Included at least 3 vocabulary words from the lesson</li><li>☐ 100-150 words</li><li>☐ Clear topic sentence and concluding sentence</li></ul>',
        },
      ],
    },
    {
      title: '✅ Self-Assessment & Reflection',
      color: '#6366f1',
      studyTime: '5 minutes',
      xpReward: 0,
      mode: 'practice',
      difficulty: 'easy',
      tags: ['reflection', 'self-assessment'],
      activities: [
        {
          type: 'can_do_statements',
          title: '✅ I Can... Checklist',
          content: JSON.stringify({
            statements: [
              { text: 'I can use the Present Perfect to talk about life experiences.' },
              { text: 'I can use the Past Simple to talk about specific past events.' },
              { text: 'I can choose the correct tense based on time markers.' },
              { text: 'I can use vocabulary related to travel and experiences (adventurous, breathtaking, memorable, etc.).' },
              { text: 'I can ask and answer "Have you ever...?" questions.' },
              { text: 'I can write a paragraph about a past experience using mixed tenses.' },
              { text: 'I can distinguish between "been to" and "gone to".' },
              { text: 'I know the difference between "since" and "for".' },
            ]
          }),
          comprehensiveFeedback: '<p>If you ticked fewer than 6 items, revisit the Prepare sections for more practice!</p>',
        },
        {
          type: 'reflective_journal',
          title: '📓 Reflection Journal',
          content: JSON.stringify({
            prompts: [
              'What did you find easiest in this lesson?',
              'What was the most challenging part?',
              'What do you want to practise more?',
              'How confident do you feel about using Present Perfect now? (1-10)',
            ]
          }),
          comprehensiveFeedback: '<p>Reflection helps you become a more effective learner. Review your journal entry before the next class.</p>',
        },
      ],
    },
  ],
};
