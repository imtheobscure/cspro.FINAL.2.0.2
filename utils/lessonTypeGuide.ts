/**
 * LESSON TYPE GUIDE
 * -----------------
 * What every lesson format in Step 1 of the Lesson Creator actually is: its structure, the learners
 * it suits, and how a tutor should teach it.
 *
 * This is the content of the hover card that opens when a tutor rests on a lesson type for a few
 * seconds in "Create a Lesson". A tutor choosing between 37 formats is really asking three
 * questions — *what will this contain, is it right for this learner, and what do I do with it in
 * the session?* — so every entry answers exactly those three, in bullets short enough to read
 * while the cursor is still on the tile.
 *
 * Kept out of the component so the copy can be reviewed (and reused by the gallery, the lesson
 * search and any future picker) without touching the UI.
 */

export interface LessonTypeGuide {
  /** One line: what the format is. */
  what: string;
  /** What the lesson is made of, in order. */
  structure: string[];
  /** Who it is for — age, level, need. */
  audience: string[];
  /** How to actually teach it, session by session. */
  teaching: string[];
}

export const LESSON_TYPE_GUIDES: Record<string, LessonTypeGuide> = {
  englishLesson: {
    what: 'The core interactive lesson: one topic, built as sections of rich activities in a single HTML file.',
    structure: [
      'Sections, each with a warm-up, presentation, practice and a wrap-up',
      'Vocabulary tables, grammar boxes, gap-fills, quizzes and reading/listening practice',
      'A printable one-page cheat sheet if you turn it on in Step 2',
    ],
    audience: [
      'A1–C2, teenagers to adults, one-to-one or small groups',
      'Learners who need all four skills in one coherent class',
    ],
    teaching: [
      'Run the sections in order; let the learner click their own answers first',
      'Use the wrap-up and homework as your end-of-class check',
      'Re-use the same vocabulary in the next lesson — it is built to recycle',
    ],
  },
  englishLessonV2: {
    what: 'The modern engine version of the Micro Lesson: richer activity types, same sectioned shape.',
    structure: [
      'Sections of typed activities (matching, drag, ordering, roleplay, pronunciation)',
      'Per-activity feedback and progress state kept in the file',
      'Learner and presenter renders of the same content',
    ],
    audience: [
      'A2–C1 learners on desktop or tablet',
      'Classes where you want noticeably more interaction than a static worksheet',
    ],
    teaching: [
      'Share your screen for the presenter version; send the learner version home',
      'Let the learner drive the interactive cards — you watch and correct',
      'Mine the grammar boxes for your board work',
    ],
  },
  interactiveLesson: {
    what: 'A hands-on lesson that is all exercises: the learner does, you coach.',
    structure: [
      'A title and short setup, then a run of practice tasks',
      'Instant feedback per item with a score at the end',
      'No long explanatory prose — practice-first by design',
    ],
    audience: [
      'Learners who already met the language and need reps',
      'Homework-style or fast-paced review slots',
    ],
    teaching: [
      'Set it as homework and review errors at the start of the next class',
      'Do the first two items together to fix the rules of the game',
      'Stop at the first wrong pattern — that is tonight\'s teaching point',
    ],
  },
  explainerLesson: {
    what: 'A guided deep-dive that walks through a source text chunk by chunk.',
    structure: [
      'Sequential chunks, each read then unpacked',
      'Vocabulary explanations and grammar/nuance breakdown for every chunk',
      'A how-to-use section with sample dialogue and real-life connection',
    ],
    audience: [
      'B1+ who want depth over breadth',
      'Learners who bring articles, reports or scripts to class',
    ],
    teaching: [
      'Read each chunk aloud first, then open its explanation',
      'Ask the learner to paraphrase the chunk before moving on',
      'Finish with the dialogue examples as roleplay',
    ],
  },
  conversationalLesson: {
    what: 'A speaking-first lesson built around real-life dialogue, in four parts.',
    structure: [
      'Activation questions → language deep dive → structured practice → games',
      'Spoken grammar read-aloud and multiple realistic dialogues',
      'Speaking games (Would You Rather, Two Truths One Lie, and more)',
    ],
    audience: [
      'A2–C1 who want fluency, confidence and natural register',
      'Adults preparing for real conversations at work or abroad',
    ],
    teaching: [
      'Keep the learner talking; correct after the activity, not during it',
      'Use the read-aloud script to model tone and stress',
      'Give each game a time limit and a language target',
    ],
  },
  bilingualStudyLesson: {
    what: 'Chunk-based study with the learner\'s first language supporting every step.',
    structure: [
      'Smart chunks with side-by-side L1 translation',
      'Sentence-by-sentence grammar and nuance in the learner\'s language',
      'Bilingual vocabulary lists with examples',
    ],
    audience: [
      'A1–B1 who need L1 support to feel safe',
      'Learners whose school system teaches grammar in their own language',
    ],
    teaching: [
      'Read the L1 explanation first with weaker readers, then the English',
      'Cover the translation and ask the learner to produce it',
      'Fade the L1 out as confidence grows',
    ],
  },
  examPrepLesson: {
    what: 'A task-based lesson that trains one or more exam tasks to scoring criteria.',
    structure: [
      'Exam tasks in sequence with timing guidance',
      'Strategies, common mistakes and a scored model answer per task',
      'Self-assessment rubric and exam-style practice sets',
    ],
    audience: [
      'IELTS, TOEFL, Cambridge, Duolingo candidates',
      'Teens and adults with a target band and a test date',
    ],
    teaching: [
      'Time every task exactly — the pressure is the lesson',
      'Mark against the rubric, then compare with the model answer',
      'Ask the learner to rewrite one paragraph after feedback',
    ],
  },
  homework: {
    what: 'A standalone assignment package for between-session work.',
    structure: [
      'Reading tasks in authentic genres (email, blog, notice)',
      'Listening monologue plus a dialogue, both with questions',
      'A speaking record-and-compare task and integrated skill tasks',
    ],
    audience: [
      'Any level, when the learner can work unsupervised',
      'Learners with a steady weekly rhythm',
    ],
    teaching: [
      'Set it at the end of class with a clear deadline',
      'Collect the recorded speaking task and give written feedback',
      'Start the next lesson by checking the answer key together',
    ],
  },
  quiz: {
    what: 'A short assessment of the vocabulary and grammar just taught.',
    structure: [
      'Mixed formats: multiple choice, gap-fill, short answer',
      'A comprehension section on a fresh short text',
      'Complete answer key',
    ],
    audience: [
      'Any level, as a five-to-fifteen-minute checkpoint',
      'Learners who like a visible score',
    ],
    teaching: [
      'Set a time limit and mark it in class',
      'Log the wrong items — they become next lesson\'s review',
      'Repeat the quiz in three weeks to prove retention',
    ],
  },
  studyGuide: {
    what: 'A revision pack: podcast-style audio, analysis slides and gamified flashcards.',
    structure: [
      'Two-voice audio overview (host and expert)',
      'Sequential slides breaking down grammar and nuance',
      'Flashcards and Would-You-Rather concept checks',
    ],
    audience: [
      'B1+ revising between lessons or before a test',
      'Auditory learners who prefer listening to reading',
    ],
    teaching: [
      'Listen to the overview together, then quiz from the slides',
      'Send the pack home as the revision spine for the unit',
      'Ask for a two-minute spoken summary next session',
    ],
  },
  printableWorksheet: {
    what: 'A print-first worksheet for pen-and-paper classes and offline learners.',
    structure: [
      'Sections of exercises with line space to write',
      'Reading passage with comprehension questions',
      'Answer key on a separate page',
    ],
    audience: [
      'Young learners, older adults, anyone who prefers paper',
      'Classrooms without reliable devices',
    ],
    teaching: [
      'Print double-sided and let the learner write on it',
      'Work the first item of each exercise as a model',
      'File the completed sheet as evidence of progress',
    ],
  },
  mockTest: {
    what: 'A full simulated exam with the timing and pressure of the real thing.',
    structure: [
      'Exam sections in the official order and duration',
      'Proctoring and accessibility options',
      'Examiner-style feedback and a score report',
    ],
    audience: [
      'Candidates one to four weeks before their exam date',
      'Learners who need to practise stamina and timing',
    ],
    teaching: [
      'Run it in one sitting, no breaks, no help',
      'Mark afterwards and walk through each lost band',
      'Schedule a second mock once the weak task is retrained',
    ],
  },
  mockTestV2: {
    what: 'The rebuilt mock exam: the same official conditions, a modern interface.',
    structure: [
      'Task-type matrix matching the current official exam format',
      'Full timing rules per task with delivery and proctoring settings',
      'Report with per-criterion breakdown',
    ],
    audience: [
      'Higher-stakes candidates close to their test date',
      'Learners retaking and targeting a specific band',
    ],
    teaching: [
      'Explain the timing rules before starting, then stay silent',
      'Debrief criterion by criterion, not task by task',
      'Set one measurable target for the next mock',
    ],
  },
  learningApp: {
    what: 'A transcript-based review game that drills the language of past lessons.',
    structure: [
      'Levels of mixed exercises built from the lesson transcript',
      'Vocabulary, grammar, error correction and writing items',
      'Progress and score tracking inside the app',
    ],
    audience: [
      'A2+ who respond to gamified repetition',
      'Learners who need spaced recycling, not new input',
    ],
    teaching: [
      'Assign as weekly homework and check the failed items',
      'Play one level together as a warm-up',
      'Use the transcript as a class reading afterwards',
    ],
  },
  learningAppV2: {
    what: 'The richer build of the review app: more activity types, more levels.',
    structure: [
      'A ladder of exercise types with increasing difficulty',
      'Pronunciation focus and register (formal/casual) practice',
      'A final real-life application task',
    ],
    audience: [
      'B1+ with a device and independent study habits',
      'Long-running courses that need a recycling engine',
    ],
    teaching: [
      'Let the learner play between sessions; review only what failed',
      'Run the pronunciation level aloud together',
      'Finish the unit by doing its real-life task in roleplay',
    ],
  },
  flipbookHomework: {
    what: 'A page-turning homework book: one task per page, no scrolling.',
    structure: [
      'Pages that turn in sequence, one activity each',
      'Reading, listening and writing pages mixed',
      'A closing page of reflection or self-check',
    ],
    audience: [
      'Younger learners and visual, page-oriented readers',
      'Learners distracted by long scrolling documents',
    ],
    teaching: [
      'Assign a page count rather than a time',
      'Ask which page was hardest and why',
      'Read the last page together in class',
    ],
  },
  gamifiedChallenge: {
    what: 'A challenge mission with points, streaks and badges over a set of tasks.',
    structure: [
      'Daily or staged tasks that unlock in order',
      'XP, combos and badges awarded for completion and accuracy',
      'A final boss task that uses everything',
    ],
    audience: [
      'Teens and competitive learners; anyone needing motivation',
      'Mixed-ability groups where scores level the field',
    ],
    teaching: [
      'Set a target score and let the learner chase it alone',
      'Celebrate streaks publicly; keep errors private',
      'Retrain the language behind the missed badges',
    ],
  },
  musicLesson: {
    what: 'A lesson built on a song: lyrics become the source text and the audio.',
    structure: [
      'The song with synced lyric lines in a built-in player',
      'Vocabulary and idiom work drawn from the lyrics',
      'Listening tasks, meaning work and speaking practice',
    ],
    audience: [
      'Teens and adults who learn through music',
      'Learners bored by textbook topics',
    ],
    teaching: [
      'Play once for gist, once with the lyrics visible',
      'Sync the lines with the learner so they own the timing',
      'Pull three phrases into a personal conversation about the song',
    ],
  },
  dailyLessonInteractive: {
    what: 'A short daily lesson with a game-like interface for habit building.',
    structure: [
      'A quick warm-up, one teaching point, one practice loop',
      'Streak and character feedback to keep the daily habit',
      'A two-to-ten-minute completion target',
    ],
    audience: [
      'Beginners and young learners on mobile',
      'Learners practising a few minutes every day',
    ],
    teaching: [
      'Use it as the first five minutes of a session',
      'Ask the learner to replay it alone on low-energy days',
      'Track streaks as evidence of consistency, not ability',
    ],
  },
  liveLessonInteractive: {
    what: 'A live, guided lesson you run from your own screen with the learner acting on theirs.',
    structure: [
      'Sections with prompts you read aloud and activities they complete',
      'Timers, checkpoints and teacher-controlled reveals',
      'Embedded response capture for instant checking',
    ],
    audience: [
      'Online one-to-one classes needing tight pacing',
      'Learners who drift without visible structure',
    ],
    teaching: [
      'Keep the section timer visible — pace is the point',
      'Ask for an answer before revealing anything',
      'Close with a two-minute oral summary from the learner',
    ],
  },
  videoLessonInteractive: {
    what: 'A lesson organised around a video, with comprehension work at each stage.',
    structure: [
      'Pre-watching vocabulary and prediction tasks',
      'The video with gist and detail comprehension questions',
      'Post-watching discussion and language extension',
    ],
    audience: [
      'B1+ who learn well from authentic media',
      'Learners working on listening and note-taking',
    ],
    teaching: [
      'Pause at the pre-set checkpoints instead of watching straight through',
      'Do the detail questions with notes, not memory',
      'Finish with a spoken response to the video\'s main idea',
    ],
  },
  conversationGame: {
    what: 'A roleplay game driven by a scenario and its dialogue.',
    structure: [
      'A scenario and character roles',
      'Branching dialogue the learner plays through',
      'Language feedback tied to the choices made',
    ],
    audience: [
      'A2+ who freeze in open conversation',
      'Classes needing a low-pressure speaking task',
    ],
    teaching: [
      'Assign roles, then swap them and replay',
      'Freeze the game to fix one piece of language per turn',
      'Ask the learner to justify a choice in English afterwards',
    ],
  },
  conversationMaker: {
    what: 'A custom dialogue built from characters, voices and a situation you specify.',
    structure: [
      'Your chosen characters, voices and setting',
      'A multi-turn dialogue with natural spoken language',
      'Per-line audio playback for shadowing',
    ],
    audience: [
      'Any level; excellent for shy learners',
      'Learners practising a very specific conversation (doctor, landlord, interview)',
    ],
    teaching: [
      'Play the dialogue, then have the learner shadow line by line',
      'Replace one speaker with the learner and repeat',
      'Record the learner\'s version and compare intonation',
    ],
  },
  partyMode: {
    what: 'A multi-player game-arena session for groups, run from one screen.',
    structure: [
      'A set of quick competitive rounds (quiz, guess, charades-style)',
      'Team scores, timers and animations',
      'Language recycled from the group\'s recent lessons',
    ],
    audience: [
      'Groups of three or more, teens to adults',
      'End-of-term or Friday-slot energy',
    ],
    teaching: [
      'Explain the rules once, then start — momentum matters',
      'Balance the teams; keep weaker learners with support',
      'Debrief the language errors after the final score',
    ],
  },
  placeGame: {
    what: 'A guessing game where the learner asks questions to find a location.',
    structure: [
      'A hidden place and a tourist/tour-guide character',
      'Yes/no question prompts and clue reveals',
      'A scored round with a reveal at the end',
    ],
    audience: [
      'A2–B1 practising question forms and place vocabulary',
      'Young learners and playful adults',
    ],
    teaching: [
      'Force full questions, never single words',
      'Model one round yourself first',
      'Collect the best questions on the board as a phrase bank',
    ],
  },
  weeklyChallenge: {
    what: 'A seven-day mission that recycles the week\'s language a little each day.',
    structure: [
      'Day-by-day tasks that build on each other',
      'Authentic genres: reviews, news clips, manuals',
      'Self-correction keys and model answers',
    ],
    audience: [
      'B1+ with a weekly routine and some autonomy',
      'Learners whose only contact with English is the lesson',
    ],
    teaching: [
      'Set it Monday, check Friday, discuss Monday',
      'Ask for one sentence a day rather than one big submission',
      'Reward completion, not perfection',
    ],
  },
  simulations: {
    what: 'Audio Lab: scripted listening scenarios with different voices and registers.',
    structure: [
      'Three scenario scripts in your chosen audio genres',
      'Multiple characters, emotions and speeds',
      'Follow-up interactive practice prompts per scenario',
    ],
    audience: [
      'B1+ working on real-world listening',
      'Learners preparing for calls, meetings or travel',
    ],
    teaching: [
      'First listen for gist, second for detail, third for language',
      'Pause after each turn and ask what the speaker implied',
      'Have the learner perform their own version of the scenario',
    ],
  },
  liveLesson: {
    what: 'An H5P interactive package you can embed anywhere (LMS, website, classroom).',
    structure: [
      'H5P-ready interactive content types',
      'Embed code and a standalone HTML export',
      'Progress tracking when hosted on an H5P-capable platform',
    ],
    audience: [
      'Schools and platforms running an LMS',
      'Learners who need the same activity in another system',
    ],
    teaching: [
      'Embed it in your course page and assign a completion date',
      'Use its scores as your progress record',
      'Keep the classroom version for the speaking half of the lesson',
    ],
  },
  slides: {
    what: 'A presentation deck for teaching from, plus a separate explainer document.',
    structure: [
      'Slides with key points and personalised examples',
      'A companion explainer doc with lecture notes and case studies',
      'Comprehension checks with revealable answers',
    ],
    audience: [
      'Group classes and one-to-one lecture-style sessions',
      'Tutors who teach from a screen and want structure',
    ],
    teaching: [
      'Reveal answers only after the group commits to one',
      'Use the explainer doc as your own preparation notes',
      'Send the deck afterwards as the revision summary',
    ],
  },
  lessonPlan: {
    what: 'The teacher\'s plan: objectives, staged activities and tutor scripts.',
    structure: [
      'Objectives, materials and a timed lesson flow',
      'Word-for-word tutor dialogue per activity',
      'Vocabulary expansion and strategy notes',
    ],
    audience: [
      'You, the tutor — especially for a lesson you have not taught before',
      'Substitute or new teachers covering your class',
    ],
    teaching: [
      'Read it before the lesson and adjust timings to your group',
      'Keep the tutor script open on a second screen',
      'Write your post-lesson notes next to each stage',
    ],
  },
  forTeachers: {
    what: 'A teacher guide: how to teach a specific topic, with the language explained.',
    structure: [
      'The teaching sequence and the reasoning behind it',
      'Anticipated learner errors with fixes',
      'Board work, drilling and concept-checking questions',
    ],
    audience: [
      'New or less experienced tutors',
      'Experienced tutors picking up an unfamiliar topic',
    ],
    teaching: [
      'Skim the sequencing, then read the error section closely',
      'Reuse the concept questions verbatim — they are written to catch real gaps',
      'Annotate it after class and keep it in your library',
    ],
  },
  lessonGuide: {
    what: 'A study walkthrough for the learner, with tutor notes beside it.',
    structure: [
      'A guided path through the material',
      'Explanations and examples at each step',
      'Tutor notes and checkpoints alongside',
    ],
    audience: [
      'B1+ working semi-independently',
      'Long courses needing a written spine',
    ],
    teaching: [
      'Set it as pre-reading before the topic lesson',
      'Ask which step was unclear — that becomes your warm-up',
      'Have the learner teach one step back to you',
    ],
  },
  dailyLesson: {
    what: 'A themed daily lesson with a story or theme running through it.',
    structure: [
      'A themed situation with vocabulary and questions',
      'A reading or listening rooted in the theme',
      'A short production task to finish',
    ],
    audience: [
      'All levels; especially learners who like variety',
      'Short daily slots (30–45 minutes)',
    ],
    teaching: [
      'Open with the theme picture and prediction questions',
      'Do the tasks in order, skipping what is too easy',
      'Finish with the production task, corrected live',
    ],
  },
  testLab: {
    what: 'Test Lab: an activity playground for trying a format before you commit to it.',
    structure: [
      'A configurable activity with live settings',
      'Sample content ready to run immediately',
      'Adjustable difficulty, timers and layout',
    ],
    audience: [
      'You, while designing a lesson',
      'Classes that need a five-minute energy activity',
    ],
    teaching: [
      'Use it to prototype an activity before building the full lesson',
      'Show it on the projector as a group challenge',
      'Note the settings that worked and reuse them',
    ],
  },
  audioLesson: {
    what: 'An audio-first lesson: everything the learner needs is listening-based.',
    structure: [
      'Scripted audio with characters and voices',
      'Comprehension work at gist and detail level',
      'A speaking response that mirrors the audio',
    ],
    audience: [
      'Learners preparing for listening exams',
      'Commuters and auditory learners',
    ],
    teaching: [
      'Play the script twice at different speeds',
      'Transcribe two lines together, then check against the script',
      'Have the learner re-record a turn with the same intonation',
    ],
  },
  avatarLesson: {
    what: 'A branching story lesson where the learner talks to characters and chooses what happens.',
    structure: [
      'An opening scene with a cast of voiced characters',
      'Branching choices that lead to different outcomes',
      'Multiple endings and friendship or trust state',
    ],
    audience: [
      'Teens and adults who enjoy roleplay and stories',
      'Learners who need a reason to speak at length',
    ],
    teaching: [
      'Let the learner make each choice — do not steer it',
      'Ask why they chose as they did, in English',
      'Replay once choosing the opposite, for new language',
    ],
  },
  avatarLessonV2: {
    what: 'Avatar Lesson V2: the same branching world with more branches and richer endings.',
    structure: [
      'Several characters, regions and voice profiles',
      'A wider branch map with more endings to find',
      'Consistent consequences across choices',
    ],
    audience: [
      'B1+ who want a longer, replayable story task',
      'Learners who burn through simple games quickly',
    ],
    teaching: [
      'Set a goal: find two different endings',
      'After each ending, mine one character\'s language for study',
      'Use the replay to target a weak tense or function',
    ],
  },
  classmate: {
    what: 'A companion-style lesson where an AI classmate converses with the learner over time.',
    structure: [
      'A named classmate with a voice, facts and moods',
      'Multi-activity sessions that build a relationship',
      'A friendship state that grows with the learner\'s choices',
    ],
    audience: [
      'Shy learners who need a safe first conversation partner',
      'Learners practising small talk and follow-up questions',
    ],
    teaching: [
      'Encourage the learner to ask questions, not only answer',
      'Debrief how they handled the classmate\'s mood shifts',
      'Set the mood and facts to reuse this week\'s vocabulary',
    ],
  },
};

/** Fallback so a newly added lesson type still gets a useful card instead of an empty one. */
export const DEFAULT_LESSON_TYPE_GUIDE: LessonTypeGuide = {
  what: 'A formatted lesson file you can teach from, send to the learner, or print.',
  structure: [
    'Sections of structured content',
    'Practice activities with feedback',
    'A saveable HTML file for the learner',
  ],
  audience: ['Any level, one-to-one or small group'],
  teaching: [
    'Walk the sections in order',
    'Let the learner work the activities while you observe',
    'Finish with the wrap-up and set the follow-up task',
  ],
};

export const lessonTypeGuideFor = (typeId: string): LessonTypeGuide =>
  LESSON_TYPE_GUIDES[typeId] || DEFAULT_LESSON_TYPE_GUIDE;
