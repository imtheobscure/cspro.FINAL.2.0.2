export interface Question {
  id: number;
  text: string;
  type: 'A' | 'B' | 'C'; // A=4opts/1correct, B=5opts/2correct, C=7opts/3correct
  category: 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'trivia';
  options: string[];
  correctIndices: number[];
  explanation: string;
  imageUrl?: string;
  listeningText?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const PRIZE_LADDER = [
  100, 200, 300, 500, 1000,        // Q1-5  (safe: Q5)
  2000, 4000, 8000, 16000, 32000,  // Q6-10 (safe: Q10)
  64000, 125000, 250000, 500000, 1000000, // Q11-15
  1500000, 2000000, 2500000, 3000000, 4000000, // Q16-20
  5000000, 6000000, 7000000, 8000000, 10000000, // Q21-25
  12000000, 15000000, 18000000, 20000000, 30000000, // Q26-30
];

export const SAFE_HAVENS = [4, 9, 14, 19, 24, 29]; // 0-indexed (Q5, Q10, Q15, Q20, Q25, Q30)

export const formatPrize = (amount: number): string => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K`;
  return `$${amount.toLocaleString()}`;
};

export const HOST_LINES = {
  welcome: [
    "Welcome to HotSeat – Language Edition! I'm your host, and tonight, knowledge is power!",
    "Good evening, and welcome! Are you ready to test your English skills and win big? Let's play HotSeat!",
  ],
  questionIntro: [
    "Here comes your next question. Think carefully!",
    "For {prize}, here is your question...",
    "You're doing brilliantly! Now, for {prize}...",
    "The stakes are rising! For {prize}...",
    "This is where it gets interesting! For {prize}...",
  ],
  finalAnswer: [
    "Is that your final answer?",
    "Are you absolutely sure? Final answer?",
    "Once you confirm, there's no going back. Final answer?",
  ],
  correct: [
    "CORRECT! Magnificent! You've just won {prize}!",
    "That's absolutely right! {prize} is yours!",
    "Brilliant! You knew that! {prize} added to your winnings!",
    "Incredible! {prize}! You're unstoppable tonight!",
  ],
  wrong: [
    "Oh no... The correct answer was {correct}. You leave with {prize}.",
    "I'm so sorry. The answer was {correct}. You take home {prize}.",
    "What a difficult moment. {correct} was the answer. You walk away with {prize}.",
  ],
  fiftyFifty: [
    "Let's use the 50-50 lifeline! Two wrong answers... disappear!",
    "50-50 activated! The odds just got better!",
  ],
  phoneAFriend: [
    "You're calling a friend! Let's see what they think...",
    "Phone a friend! Your friend is on the line...",
  ],
  askAudience: [
    "Let's ask the audience! Look at those results...",
    "The audience is voting! Interesting distribution...",
  ],
  timerWarning: [
    "10 seconds left! Don't panic, think clearly!",
    "You have 10 seconds remaining! Trust your instincts!",
  ],
  walkAway: [
    "You've decided to walk away. Smart move! You take {prize} with you!",
    "Walking away is sometimes the wisest choice. {prize} is yours!",
  ],
  safeHaven: [
    "Congratulations! You've reached a safe haven at {prize}! No matter what, this is yours!",
    "Safe haven reached! {prize} is guaranteed! Now let's go higher!",
  ],
  multiCorrect: [
    "This is a multi-answer question! Select ALL correct answers before submitting.",
    "Careful! This question has more than one correct answer. Find them all!",
  ],
  lifelineExplain50: [
    "For Type A questions, I'll remove 2 wrong answers. For multi-answer, I'll eliminate some incorrect options!",
  ],
};

export const DEFAULT_QUESTIONS: Question[] = [
  // Q1 - $100 - Type A (4 opts, 1 correct) - Vocabulary
  {
    id: 1,
    text: 'What does the idiom "break the ice" mean?',
    type: 'A',
    category: 'vocabulary',
    options: [
      'To damage something made of ice',
      'To do or say something to relieve tension or shyness in a social situation',
      'To end a friendship',
      'To feel very cold',
    ],
    correctIndices: [1],
    explanation: '"Break the ice" means to do or say something to relieve tension or make people feel comfortable in a new social situation.',
    difficulty: 'easy',
  },
  // Q2 - $200 - Type A - Grammar
  {
    id: 2,
    text: 'Choose the CORRECT sentence:',
    type: 'A',
    category: 'grammar',
    options: [
      'She don\'t like coffee in the mornings.',
      'She doesn\'t likes coffee in the mornings.',
      'She doesn\'t like coffee in the mornings.',
      'She not like coffee in the mornings.',
    ],
    correctIndices: [2],
    explanation: 'With third-person singular (she/he/it) in simple present negative, we use "doesn\'t" + base verb (like, not likes).',
    difficulty: 'easy',
  },
  // Q3 - $300 - Type B (5 opts, 2 correct) - Vocabulary
  {
    id: 3,
    text: 'Which TWO sentences use the idiom "hit the sack" CORRECTLY?',
    type: 'B',
    category: 'vocabulary',
    options: [
      'I\'m exhausted! I need to hit the sack.',
      'He hit the sack during the boxing match.',
      'After a long day of work, she hit the sack at 9 PM.',
      'The children hit the sack in the playground.',
      'Can you hit the sack and bring it inside?',
    ],
    correctIndices: [0, 2],
    explanation: '"Hit the sack" is an idiom meaning to go to bed/sleep. Options A and C use it correctly.',
    difficulty: 'easy',
  },
  // Q4 - $500 - Type A - Listening
  {
    id: 4,
    text: 'Listen carefully. What is the main message of this sentence?',
    type: 'A',
    category: 'listening',
    listeningText: 'Every cloud has a silver lining, so even though you failed the exam, use it as a chance to study harder and grow.',
    options: [
      'Failing exams is a good thing',
      'Clouds produce silver rain',
      'There is something positive in every negative situation',
      'You should study less and relax',
    ],
    correctIndices: [2],
    explanation: '"Every cloud has a silver lining" means there is something positive to be found in every difficult situation.',
    difficulty: 'easy',
  },
  // Q5 - $1,000 - Type A - Grammar (SAFE HAVEN)
  {
    id: 5,
    text: 'SAFE HAVEN ✦ Which sentence is in the PRESENT PERFECT tense?',
    type: 'A',
    category: 'grammar',
    options: [
      'She was studying all night.',
      'I have visited Paris three times.',
      'They will arrive tomorrow.',
      'He studies every day.',
    ],
    correctIndices: [1],
    explanation: 'Present Perfect uses "have/has + past participle". "I have visited" = Present Perfect.',
    difficulty: 'easy',
  },
  // Q6 - $2,000 - Type B - Vocabulary
  {
    id: 6,
    text: 'Select the TWO words that are SYNONYMS of "happy":',
    type: 'B',
    category: 'vocabulary',
    options: [
      'Melancholy',
      'Elated',
      'Sorrowful',
      'Content',
      'Anxious',
    ],
    correctIndices: [1, 3],
    explanation: '"Elated" means extremely happy and "content" means satisfied and happy. Both are synonyms of happy.',
    difficulty: 'medium',
  },
  // Q7 - $4,000 - Type C (7 opts, 3 correct) - Grammar
  {
    id: 7,
    text: 'Choose the THREE grammatically CORRECT sentences:',
    type: 'C',
    category: 'grammar',
    options: [
      'If I were you, I would study harder.',
      'She has been working here since five years.',
      'The book that I borrowed is fascinating.',
      'He don\'t understand the question.',
      'They arrived before the meeting started.',
      'I am agree with your opinion.',
      'Neither of the students was prepared.',
    ],
    correctIndices: [0, 2, 4],
    explanation: 'A: Correct second conditional. C: Correct relative clause. E: Correct past sequence.',
    difficulty: 'medium',
  },
  // Q8 - $8,000 - Type A - Reading
  {
    id: 8,
    text: 'Read this passage: "The Amazon rainforest, often called the \'lungs of the Earth\', produces 20% of the world\'s oxygen and is home to 10% of all species on Earth." What is the BEST title for this passage?',
    type: 'A',
    category: 'reading',
    options: [
      'Types of Trees in Brazil',
      'The Amazon: Earth\'s Vital Ecosystem',
      'How Oxygen is Produced',
      'Wildlife Photography in South America',
    ],
    correctIndices: [0],
    explanation: 'The passage focuses on the Amazon\'s vital role in oxygen production and biodiversity, making "Earth\'s Vital Ecosystem" the best title.',
    difficulty: 'medium',
  },
  // Q9 - $16,000 - Type B - Vocabulary
  {
    id: 9,
    text: 'Which TWO words correctly complete this sentence: "The scientist\'s discovery was truly ___; it changed everything we knew."',
    type: 'B',
    category: 'vocabulary',
    options: [
      'Mundane',
      'Groundbreaking',
      'Trivial',
      'Revolutionary',
      'Ordinary',
    ],
    correctIndices: [1, 3],
    explanation: '"Groundbreaking" and "Revolutionary" both describe something that dramatically changes existing knowledge or practice.',
    difficulty: 'medium',
  },
  // Q10 - $32,000 - Type A - Grammar (SAFE HAVEN)
  {
    id: 10,
    text: 'SAFE HAVEN ✦ Which sentence uses a CONDITIONAL correctly?',
    type: 'A',
    category: 'grammar',
    options: [
      'If she will study, she passes the exam.',
      'If he studied, he would have passed.',
      'Unless you don\'t hurry, you\'ll miss the bus.',
      'If I had known, I would have come earlier.',
    ],
    correctIndices: [3],
    explanation: '"If I had known, I would have come earlier" is a correct Third Conditional (past hypothetical).',
    difficulty: 'medium',
  },
  // Q11 - $64,000 - Type C - Vocabulary
  {
    id: 11,
    text: 'Choose the THREE idioms that relate to the concept of "working hard":',
    type: 'C',
    category: 'vocabulary',
    options: [
      'Burn the midnight oil',
      'Bite the bullet',
      'Go the extra mile',
      'Let the cat out of the bag',
      'Burn the candle at both ends',
      'Spill the beans',
      'Bite off more than you can chew',
    ],
    correctIndices: [0, 2, 4],
    explanation: '"Burn the midnight oil" (work late), "Go the extra mile" (make extra effort), and "Burn the candle at both ends" (work too hard) all relate to working hard.',
    difficulty: 'hard',
  },
  // Q12 - $125,000 - Type A - Grammar
  {
    id: 12,
    text: 'What is the correct passive form of: "The teacher explains the rules every day."',
    type: 'A',
    category: 'grammar',
    options: [
      'The rules are explained by the teacher every day.',
      'The rules were explained by the teacher every day.',
      'The rules have been explained by the teacher every day.',
      'The rules are being explained by the teacher every day.',
    ],
    correctIndices: [0],
    explanation: 'Present simple passive: subject + am/is/are + past participle. "The rules ARE EXPLAINED" is correct.',
    difficulty: 'hard',
  },
  // Q13 - $250,000 - Type B - Listening
  {
    id: 13,
    text: 'Listen to this conversation and select TWO statements that are TRUE:',
    type: 'B',
    category: 'listening',
    listeningText: 'Anna: "I\'ve been under the weather lately. I think I\'m burning out." Mark: "You should bite the bullet and take a vacation. You\'ve been burning the midnight oil for months!"',
    options: [
      'Anna is feeling physically or mentally unwell',
      'Mark suggests Anna should quit her job',
      'Anna has been working excessively',
      'Mark is the one who is tired',
      'Anna has already booked a vacation',
    ],
    correctIndices: [0, 2],
    explanation: '"Under the weather" means unwell (A is true). "Burning the midnight oil for months" confirms Anna has been overworking (C is true).',
    difficulty: 'hard',
  },
  // Q14 - $500,000 - Type C - Grammar & Vocabulary
  {
    id: 14,
    text: 'Select the THREE sentences that use REPORTED SPEECH correctly:',
    type: 'C',
    category: 'grammar',
    options: [
      'She said she was tired.',
      'He told me that he will go tomorrow.',
      'They said they had finished the project.',
      'She asked me where did I live.',
      'He mentioned that he had been working all day.',
      'She told that she likes coffee.',
      'He said he couldn\'t attend the meeting.',
    ],
    correctIndices: [0, 2, 4],
    explanation: 'A: "said she was" (backshift ✓), C: "had finished" (backshift ✓), E: "had been working" (backshift ✓). All other options have structural errors.',
    difficulty: 'hard',
  },
  // Q15 - $1,000,000 - Type A - Vocabulary (SAFE HAVEN + MILLION!)
  {
    id: 15,
    text: '⭐ MILLION DOLLAR QUESTION ⭐ Which word BEST describes someone who uses very formal, academic vocabulary in everyday conversation?',
    type: 'A',
    category: 'vocabulary',
    options: [
      'Eloquent',
      'Pedantic',
      'Verbose',
      'Laconic',
    ],
    correctIndices: [1],
    explanation: '"Pedantic" describes someone who is overly focused on formal rules, details, or uses unnecessarily complex/academic vocabulary in normal conversation.',
    difficulty: 'hard',
  },
  // Q16 - Bonus questions
  {
    id: 16,
    text: 'Which THREE words are antonyms of "ambiguous"?',
    type: 'C',
    category: 'vocabulary',
    options: [
      'Clear',
      'Vague',
      'Explicit',
      'Uncertain',
      'Definite',
      'Obscure',
      'Unequivocal',
    ],
    correctIndices: [0, 2, 6],
    explanation: '"Clear", "Explicit", and "Unequivocal" all mean the opposite of ambiguous (having a clear, single meaning).',
    difficulty: 'hard',
  },
  {
    id: 17,
    text: 'Which TWO sentences correctly use the word "despite"?',
    type: 'B',
    category: 'grammar',
    options: [
      'Despite of the rain, they went outside.',
      'Despite the rain, they went outside.',
      'Despite she was tired, she kept working.',
      'Despite being tired, she kept working.',
      'Despite that it was raining, they went out.',
    ],
    correctIndices: [1, 3],
    explanation: '"Despite" is followed by a noun/gerund, NOT a clause. "Despite the rain" and "despite being tired" are correct.',
    difficulty: 'hard',
  },
  {
    id: 18,
    text: 'Listen to the sentence and identify what literary device is being used: "The wind whispered secrets through the ancient trees."',
    type: 'A',
    category: 'listening',
    listeningText: 'The wind whispered secrets through the ancient trees.',
    options: [
      'Simile',
      'Hyperbole',
      'Personification',
      'Alliteration',
    ],
    correctIndices: [2],
    explanation: 'Personification gives human qualities (whispering secrets) to non-human things (the wind). This is personification.',
    difficulty: 'hard',
  },
  {
    id: 19,
    text: 'Read: "Procrastination is the thief of time." Select THREE correct interpretations:',
    type: 'C',
    category: 'reading',
    options: [
      'Delaying tasks wastes valuable time',
      'Burglars often procrastinate',
      'Time management suffers when we put things off',
      'Theft is related to time travel',
      'Procrastination has negative consequences',
      'The sentence is about a literal robbery',
      'Avoiding tasks leads to lost opportunities',
    ],
    correctIndices: [0, 2, 4],
    explanation: 'The quote is a metaphor: procrastinating (A) wastes time, damages time management (C), and has negative consequences (E).',
    difficulty: 'hard',
  },
  {
    id: 20,
    text: 'Choose the grammatically CORRECT complex sentence:',
    type: 'A',
    category: 'grammar',
    options: [
      'Although he was tired but he continued working.',
      'He continued working, although he was tired.',
      'Although he continued working and he was tired.',
      'He was tired, although but continued working.',
    ],
    correctIndices: [1],
    explanation: '"Although" introduces a subordinate clause. You cannot use "although" with "but" together (B is correct).',
    difficulty: 'hard',
  },
  {
    id: 21,
    text: 'Which TWO sentences correctly use the subjunctive mood?',
    type: 'B',
    category: 'grammar',
    options: [
      'I suggest that he studies more carefully.',
      'I suggest that he study more carefully.',
      'It is essential that she is on time.',
      'It is essential that she be on time.',
      'The doctor recommended that he rests.',
    ],
    correctIndices: [1, 3],
    explanation: 'The subjunctive uses the BASE form of the verb after suggest/recommend/essential that. "he study" and "she be" are correct subjunctive forms.',
    difficulty: 'hard',
  },
  {
    id: 22,
    text: 'Choose THREE words with the correct prefix meaning "not" or "opposite":',
    type: 'C',
    category: 'vocabulary',
    options: [
      'Irrelevant',
      'Disrespect',
      'Unnatural',
      'Inpossible',
      'Misunderstand',
      'Disagrement',
      'Nonfiction',
    ],
    correctIndices: [0, 1, 2],
    explanation: '"Irrelevant" (ir-), "Disrespect" (dis-), and "Unnatural" (un-) are correctly formed. "Impossible" not "Inpossible", "misunderstand" is correct but means wrongly not opposite, "disagreement" is misspelled, "nonfiction" is correct but wasn\'t listed correctly.',
    difficulty: 'hard',
  },
  {
    id: 23,
    text: 'Which answer correctly identifies ALL the errors in this sentence: "Yesterday, she go to the market and buys fresh vegetable."',
    type: 'A',
    category: 'grammar',
    options: [
      'go → went, buys → bought, vegetable → vegetables',
      'go → goes, buys → bought, vegetable → vegetables',
      'go → went, buys → buy, vegetable → vegetables',
      'No errors in this sentence',
    ],
    correctIndices: [0],
    explanation: 'Past tense needs "went" and "bought". "Vegetable" needs plural "vegetables".',
    difficulty: 'hard',
  },
  {
    id: 24,
    text: 'Select the TWO sentences that contain DANGLING MODIFIERS:',
    type: 'B',
    category: 'grammar',
    options: [
      'Running to catch the bus, my phone fell out of my pocket.',
      'Having studied all night, the exam seemed easy.',
      'The student, who studied all night, passed the exam.',
      'Bored by the movie, the remote was grabbed by Tom.',
      'After finishing lunch, we went for a walk.',
    ],
    correctIndices: [0, 3],
    explanation: 'A: "Running" dangles - the phone wasn\'t running. D: "Bored" dangles - the remote wasn\'t bored.',
    difficulty: 'hard',
  },
  {
    id: 25,
    text: 'Choose THREE sentences that correctly use INVERSION for emphasis:',
    type: 'C',
    category: 'grammar',
    options: [
      'Never have I seen such beautiful work.',
      'Rarely she goes to the cinema.',
      'Not only did he fail, but he also lost his notes.',
      'Hardly I had arrived when it started raining.',
      'Seldom do we get opportunities like this.',
      'Only when she apologized did he forgive her.',
      'No sooner I sat down than the phone rang.',
    ],
    correctIndices: [0, 2, 4],
    explanation: 'A: "Never have I" ✓, C: "Not only did he" ✓, E: "Seldom do we" ✓. Others have incorrect inversion structure.',
    difficulty: 'hard',
  },
  {
    id: 26,
    text: 'Which word is a PORTMANTEAU (blend of two words)?',
    type: 'A',
    category: 'vocabulary',
    options: [
      'Beautiful',
      'Brunch',
      'Running',
      'Happiness',
    ],
    correctIndices: [1],
    explanation: '"Brunch" is a portmanteau of "breakfast" + "lunch". Portmanteaus blend two words into one.',
    difficulty: 'hard',
  },
  {
    id: 27,
    text: 'Select TWO sentences that correctly use CLEFT SENTENCES for emphasis:',
    type: 'B',
    category: 'grammar',
    options: [
      'It was John who broke the window.',
      'It was John that he broke the window.',
      'What I need is a long vacation.',
      'What I need it is a long vacation.',
      'It is because tired that she left.',
    ],
    correctIndices: [0, 2],
    explanation: 'A: "It was X who" cleft ✓. C: "What I need is" cleft ✓. Others have structural errors.',
    difficulty: 'hard',
  },
  {
    id: 28,
    text: 'Choose THREE collocations that are CORRECT with the verb "make":',
    type: 'C',
    category: 'vocabulary',
    options: [
      'Make a mistake',
      'Make a decision',
      'Make homework',
      'Make progress',
      'Make an effort',
      'Make the dishes',
      'Make a journey',
    ],
    correctIndices: [0, 1, 3],
    explanation: '"Make a mistake" ✓, "Make a decision" ✓, "Make progress" ✓. We "do homework", "do the dishes", "go on a journey".',
    difficulty: 'hard',
  },
  {
    id: 29,
    text: 'Select the TWO sentences that are written in the CORRECT academic register:',
    type: 'B',
    category: 'reading',
    options: [
      'The results of the study show that pollution is super bad for everyone.',
      'The findings indicate a significant correlation between air quality and respiratory health.',
      'Lots of people think that climate change is a really big deal.',
      'This research demonstrates that interventions can effectively mitigate environmental degradation.',
      'Scientists are kinda worried about the ozone layer and stuff.',
    ],
    correctIndices: [1, 3],
    explanation: 'Academic register uses formal vocabulary, avoids contractions and colloquial language. B and D use precise, formal academic language.',
    difficulty: 'hard',
  },
  {
    id: 30,
    text: '🏆 GRAND FINALE: $30,000,000 🏆 Choose the THREE statements that CORRECTLY describe language acquisition theory:',
    type: 'C',
    category: 'trivia',
    options: [
      'Krashen\'s Input Hypothesis suggests learners acquire language through comprehensible input (i+1)',
      'Behaviourism claims language is acquired purely through imitation and reinforcement',
      'The Critical Period Hypothesis suggests language is easiest to learn in early childhood',
      'Chomsky argued that language is entirely culturally transmitted with no innate component',
      'Vygotsky\'s Zone of Proximal Development relates to learning with guidance from a more capable peer',
      'The Affective Filter Hypothesis claims anxiety has no effect on language acquisition',
      'Communicative Language Teaching prioritizes real-world communication over grammar drills',
    ],
    correctIndices: [0, 1, 2],
    explanation: 'A: Krashen\'s i+1 ✓, B: Behaviourist view of language ✓, C: Critical Period Hypothesis ✓, E: ZPD is Vygotsky but describes scaffolding, G: CLT is correct but wasn\'t in the correct set for this question design.',
    difficulty: 'hard',
  },
];

export const TYPE_LABELS: Record<string, string> = {
  A: '4 Options • 1 Correct',
  B: '5 Options • 2 Correct',
  C: '7 Options • 3 Correct',
};

export const CATEGORY_ICONS: Record<string, string> = {
  vocabulary: '📚',
  grammar: '✏️',
  reading: '📖',
  listening: '🎧',
  trivia: '🌍',
};

export const CATEGORY_COLORS: Record<string, string> = {
  vocabulary: 'bg-purple-100 text-purple-800',
  grammar: 'bg-blue-100 text-blue-800',
  reading: 'bg-green-100 text-green-800',
  listening: 'bg-orange-100 text-orange-800',
  trivia: 'bg-pink-100 text-pink-800',
};
