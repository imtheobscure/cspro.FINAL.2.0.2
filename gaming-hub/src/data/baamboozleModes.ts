export type BaamGameModeId =
  | "baamboozle"
  | "guess-eroo"
  | "tic-tac-toe"
  | "double-vision"
  | "story-dice"
  | "four-in-a-row"
  | "memory";

export interface BaamQuestion {
  id: string;
  prompt: string;
  answer: string;
  acceptedAnswers?: string[];
  choices?: string[];
  image?: string;
  points: number;
  hint?: string;
  explanation: string;
  feedback: {
    correct: string;
    incorrect: string;
    catEmotion: string;
  };
}

export interface BaamPayload {
  metadata: {
    title: string;
    topic: string;
    language: string;
    level: string;
    ageRange: string;
    selectedGameType: BaamGameModeId;
    estimatedMinutes: number;
  };
  environment: {
    theme: string;
    backgroundImage: string;
    teams: { id: string; name: string; emoji: string; color: string; score?: number }[];
    timerSeconds: number;
    maxTeams: number;
    questionOrder: "sequential" | "shuffle";
    showAnswers: "teacher-controlled" | "instant";
    sounds: boolean;
    music: boolean;
    fullscreenRecommended: boolean;
    accessibility: {
      readAloud: boolean;
      highContrast: boolean;
      reduceMotion: boolean;
      dyslexiaFriendly: boolean;
    };
    catCompanion: {
      enabled: boolean;
      persona: string;
      readHoverText: boolean;
      feedbackStyle: "gentle" | "energetic" | "silly";
    };
    modeSettings: Record<string, unknown>;
  };
  questions: BaamQuestion[];
  study: {
    flashcards: { front: string; back: string; image: string; example: string; tags: string[] }[];
    spacedRepetition: { againMinutes: number; hardHours: number; goodDays: number; easyDays: number };
  };
  slideshow: {
    miniLessons: {
      id: string;
      title: string;
      color: string;
      image: string;
      teacherScript: string;
      bullets: string[];
      checkForUnderstanding: string;
      catLine: string;
    }[];
  };
  aiQualityChecklist: string[];
}

export interface BaamModeSpec {
  id: BaamGameModeId;
  name: string;
  emoji: string;
  accent: string;
  bgImage: string;
  short: string;
  logic: string[];
  settings: string[];
  jsonMustInclude: string[];
}

const IMG = {
  arcade: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600&q=80&auto=format&fit=crop",
  plinko: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=1600&q=80&auto=format&fit=crop",
  potatoes: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=1600&q=80&auto=format&fit=crop",
  bowling: "https://images.unsplash.com/photo-1538511059256-46b661062d4e?w=1600&q=80&auto=format&fit=crop",
  board: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=1600&q=80&auto=format&fit=crop",
  eggs: "https://images.unsplash.com/photo-1522184216316-3c25379f9760?w=1600&q=80&auto=format&fit=crop",
  mystery: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80&auto=format&fit=crop",
  boxes: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1600&q=80&auto=format&fit=crop",
  basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&q=80&auto=format&fit=crop",
  soccer: "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1600&q=80&auto=format&fit=crop",
  football: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&q=80&auto=format&fit=crop",
  balloons: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=80&auto=format&fit=crop",
  dice: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=1600&q=80&auto=format&fit=crop",
  memory: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=1600&q=80&auto=format&fit=crop",
  bingo: "https://images.unsplash.com/photo-1567427018141-0584cfcbf1b8?w=1600&q=80&auto=format&fit=crop",
};

export const BAAMBOOZLE_MODES: BaamModeSpec[] = [
  {
    id: "baamboozle",
    name: "Baamboozle",
    emoji: "🐼",
    accent: "from-yellow-300 via-orange-400 to-rose-500",
    bgImage: IMG.arcade,
    short: "Classic team grid: choose a number, answer, teacher checks, points or power-ups decide the round.",
    logic: [
      "Teacher creates or pastes a deck of questions with answers, point values, optional images, hints, and feedback.",
      "Teams take turns choosing unopened numbered tiles from the board.",
      "The team says the answer aloud; the teacher reveals/checks the answer and clicks Correct or Oops.",
      "Correct answers award the tile points; Classic mode can reveal power-ups that add, remove, steal, swap, or gift points.",
      "The game ends when all selected questions are used or the timer ends; highest score wins.",
    ],
    settings: ["teams 1-8", "grid size 8/16/24", "quiz mode or classic power-ups", "teacher-controlled answer reveal", "timer optional"],
    jsonMustInclude: ["at least 16 high-quality questions", "point values", "answers and accepted answers", "powerUps table", "team settings"],
  },
  {
    id: "plink-oh",
    name: "Plink-oh!",
    emoji: "🟡",
    accent: "from-cyan-300 via-blue-500 to-indigo-700",
    bgImage: IMG.plinko,
    short: "Plinko-inspired drop board: a correct answer unlocks a ball that bounces through pegs into point slots.",
    logic: [
      "A team must answer a question correctly before releasing a ball.",
      "The ball drops from the top, visually bounces left and right through a peg pyramid, then lands in a bottom slot.",
      "Center slots are safer but lower; edge slots are rarer and worth more.",
      "Score is base question points multiplied by the slot multiplier or replaced by a fixed slot value.",
      "Teacher can tune risk level, row count, multiplier table, and number of balls per correct answer.",
    ],
    settings: ["peg rows 8-16", "risk level low/normal/high", "drop balls per correct answer", "multiplier slots", "manual or auto drop"],
    jsonMustInclude: ["risk profile", "slot multipliers", "peg row count", "drop animation speed", "base question points"],
  },
  {
    id: "spud-game",
    name: "Spud Game",
    emoji: "🥔",
    accent: "from-lime-300 via-yellow-400 to-orange-500",
    bgImage: IMG.potatoes,
    short: "Potato race: answer to leap forward, avoid red doom tiles, and trigger silly power-ups.",
    logic: [
      "Teams choose a potato character and color, then race toward the finish line.",
      "Correct answers move the team forward by a configured step amount or dice value.",
      "Landing on a red tile triggers the Wheel of Doom.",
      "Power-ups can shuffle players, swap positions, send a banana slip, turn tiles red, or grant a leap.",
      "The teacher controls which power-ups appear and how often; first potato to finish wins.",
    ],
    settings: ["board length", "red tile density", "power-up frequency", "specific power-ups on/off", "character roster"],
    jsonMustInclude: ["spud characters", "redTileIndexes", "wheelOfDoom outcomes", "powerUps", "movement rule"],
  },
  {
    id: "bowling",
    name: "Bowling",
    emoji: "🎳",
    accent: "from-rose-300 via-pink-500 to-purple-700",
    bgImage: IMG.bowling,
    short: "Answer correctly to roll; knock pins, chase strikes, and build the class scoreboard.",
    logic: [
      "A correct answer unlocks one roll down the lane.",
      "The roll knocks down 0-10 pins based on accuracy, difficulty, optional chance, or teacher scoring.",
      "Strikes and spares can be enabled for a realistic frame-based game, or simple pins-as-points can be used.",
      "Wrong answers can gutter, skip the roll, or give a reduced second-chance roll.",
      "Highest bowling score after configured frames wins.",
    ],
    settings: ["frames", "simple or official-style scoring", "pin layout", "gutter on wrong", "second chance"],
    jsonMustInclude: ["frames", "pinScoreRule", "strikeBonus", "spareBonus", "lane theme"],
  },
  {
    id: "snakes-and-ladders",
    name: "Snakes and Ladders",
    emoji: "🐍",
    accent: "from-emerald-300 via-green-500 to-teal-700",
    bgImage: IMG.board,
    short: "Answer first, then roll: climb ladders, slide down snakes, race to the end.",
    logic: [
      "At the beginning of each round, the active team answers a question.",
      "Correct answers earn a dice roll and movement; wrong answers earn no movement.",
      "Landing on a ladder moves the player upward; landing on a snake moves them downward.",
      "Board layout can change by game and can include power-up spaces.",
      "First team to reach the final square wins.",
    ],
    settings: ["board size", "snake map", "ladder map", "dice sides", "exact finish required"],
    jsonMustInclude: ["boardSize", "snakes", "ladders", "diceRule", "winCondition"],
  },
  {
    id: "egg-hunt",
    name: "Egg Hunt",
    emoji: "🥚",
    accent: "from-pink-200 via-amber-300 to-lime-400",
    bgImage: IMG.eggs,
    short: "Spring hunt: collect eggs, answer question eggs, and trigger surprise power-ups.",
    logic: [
      "Teams or solo players choose eggs hidden around a spring scene.",
      "Standard eggs award points; question eggs require a correct answer before points are added.",
      "Special eggs can add speed, shrink/grow, teleport, restore energy, scatter eggs, or start an egg party.",
      "An energy meter can require correct answers to keep hunting.",
      "Most eggs or points at the end wins.",
    ],
    settings: ["egg count", "egg type weights", "energy meter", "time limit", "solo or team"],
    jsonMustInclude: ["eggTypes", "eggTypeWeights", "energyRule", "mapObjects", "scoreGoal"],
  },
  {
    id: "guess-eroo",
    name: "Guess-eroo",
    emoji: "🦘",
    accent: "from-orange-300 via-red-500 to-pink-700",
    bgImage: IMG.mystery,
    short: "Deduction game: reveal clues or ask yes/no questions to identify the secret answer.",
    logic: [
      "The game chooses a secret answer, character, object, word, or image from the JSON deck.",
      "Teams reveal clues one at a time or ask teacher-approved yes/no questions.",
      "Earlier guesses are worth more points; each revealed clue lowers the reward.",
      "Wrong guesses can pass turn, remove points, or reveal another clue.",
      "The round ends when the secret answer is guessed or clues run out.",
    ],
    settings: ["clues per item", "yes/no question bank", "points decay", "guess attempts", "reveal image blur"],
    jsonMustInclude: ["imageReveal settings"],
  },
  {
    id: "tic-tac-toe",
    name: "Tic Tac Toe",
    emoji: "❌",
    accent: "from-sky-300 via-blue-500 to-purple-700",
    bgImage: IMG.board,
    short: "Correct answer earns the right to mark X or O; first three in a row wins.",
    logic: [
      "Two teams alternate turns on a 3x3 board.",
      "A team must answer correctly before placing its symbol.",
      "Wrong answers lose the chance to place a symbol and turn passes.",
      "First team to make three in a row wins the mini-game.",
      "A draw can trigger a bonus question or reset.",
    ],
    settings: ["symbols", "board size", "draw rule", "best of rounds", "bonus question"],
    jsonMustInclude: ["symbols", "roundCount", "drawBreaker", "question count", "team count exactly 2"],
  },
  {
    id: "double-vision",
    name: "Double Vision",
    emoji: "👀",
    accent: "from-violet-300 via-indigo-500 to-blue-700",
    bgImage: IMG.memory,
    short: "Two side-by-side tiles/grids show images; only one image appears in both. Find the match fast.",
    logic: [
      "Images or GIFs from the question deck are placed on two side-by-side panels.",
      "Exactly one image appears on both panels each turn.",
      "Students identify the matching image quickly.",
      "Teacher may extend learning by asking a question about the matching image or asking students to create one.",
      "Points reward speed, accuracy, or teacher scoring.",
    ],
    settings: ["panel size", "speed timer", "question after match", "image-only or text+image", "round count"],
    jsonMustInclude: ["image bank", "matching pairs", "distractors", "speed scoring", "follow-up questions"],
  },
  {
    id: "story-dice",
    name: "Story Dice",
    emoji: "🎲",
    accent: "from-purple-300 via-fuchsia-500 to-pink-700",
    bgImage: IMG.dice,
    short: "Roll 1-16 image dice and use them for stories, comparisons, charades, questions, or speaking prompts.",
    logic: [
      "Images and GIFs from the deck become faces of digital dice.",
      "Teacher chooses 1-16 dice and rolls them on screen.",
      "Learners use the images for storytelling, compare/contrast, odd one out, charades, 30-second talks, or ask-and-answer.",
      "Teacher can reroll during the task and manually award points.",
      "This mode is intentionally versatile and can run without a fixed right answer.",
    ],
    settings: ["dice count 1-16", "task type", "speaking timer", "teams on/off", "reroll allowed"],
    jsonMustInclude: ["diceImages", "teacher prompts", "speaking tasks", "rubric", "time limits"],
  },
  {
    id: "four-in-a-row",
    name: "Four in a Row",
    emoji: "🔴",
    accent: "from-yellow-300 via-red-500 to-purple-700",
    bgImage: IMG.board,
    short: "Connect Four style: earn tiles by answering correctly, then drop a disc to make four in a row.",
    logic: [
      "Two teams alternate turns on a 7-column grid.",
      "A correct answer earns one disc placement; wrong answers do not place a disc.",
      "Discs fall to the lowest available slot in the chosen column.",
      "First team to make four horizontally, vertically, or diagonally wins.",
      "If the board fills, the teacher can use a sudden-death question.",
    ],
    settings: ["rows/columns", "team colors", "sudden death", "best of rounds", "question difficulty by column"],
    jsonMustInclude: ["gridSize", "discColors", "suddenDeathRule", "two teams", "question deck"],
  },
  {
    id: "memory",
    name: "Memory",
    emoji: "🧠",
    accent: "from-teal-300 via-cyan-500 to-blue-700",
    bgImage: IMG.memory,
    short: "Flip numbered tiles to find matching pairs; every pair earns points.",
    logic: [
      "Numbered tiles hide matching pairs generated from the deck.",
      "Teams flip two tiles per turn and try to find a pair.",
      "A match stays revealed and awards points; a miss flips back and turn passes.",
      "Learners improve concentration, attention, and recall.",
      "The game ends when all pairs are found.",
    ],
    settings: ["pair count", "flip-back delay", "image/text pairs", "points per pair", "steal turn on match"],
    jsonMustInclude: ["pairs", "tile labels", "image assets", "matching rule", "points per pair"],
  }
];

export const modeById = (id: BaamGameModeId) => BAAMBOOZLE_MODES.find(m => m.id === id) ?? BAAMBOOZLE_MODES[0];

export const SAMPLE_BAAM_PAYLOAD: BaamPayload = {
  metadata: {
    title: "Present Perfect Adventure Arena",
    topic: "Present perfect with already, yet, ever, and never",
    language: "English",
    level: "A2-B1",
    ageRange: "10-16",
    selectedGameType: "baamboozle",
    estimatedMinutes: 25,
  },
  environment: {
    theme: "neon classroom sports stadium",
    backgroundImage: IMG.soccer,
    teams: [
      { id: "t1", name: "Purring Panthers", emoji: "🐆", color: "#a855f7", score: 0 },
      { id: "t2", name: "Rocket Rabbits", emoji: "🐰", color: "#22c55e", score: 0 },
    ],
    timerSeconds: 1500,
    maxTeams: 8,
    questionOrder: "shuffle",
    showAnswers: "teacher-controlled",
    sounds: true,
    music: false,
    fullscreenRecommended: true,
    accessibility: {
      readAloud: true,
      highContrast: false,
      reduceMotion: false,
      dyslexiaFriendly: true,
    },
    catCompanion: {
      enabled: true,
      persona: "supportive language-learning cat coach",
      readHoverText: true,
      feedbackStyle: "energetic",
    },
    modeSettings: {
      worldPupSoccer: {
        countriesOrClubs: ["Japan", "Brazil", "USA", "Spain"],
        goalZones: true,
        goalZoneCycle: [4, 3, 2],
        dice: true,
        diceSides: 6,
        questions: true,
        keeperBlockCount: 1,
      },
    },
  },
  questions: [
    {
      id: "q1",
      prompt: "Make a present perfect sentence: She / already / finish / homework.",
      answer: "She has already finished her homework.",
      acceptedAnswers: ["She has already finished homework", "She has already finished her homework"],
      choices: ["She has already finished her homework.", "She already finish homework.", "She finished already homework."],
      image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&q=80&auto=format&fit=crop",
      points: 15,
      hint: "Use has + already + past participle.",
      explanation: "Present perfect uses has/have plus the past participle. Already usually goes before the participle.",
      feedback: { correct: "Purrfect. Has already finished is the target structure.", incorrect: "Almost. Try has plus already plus finished.", catEmotion: "😺" },
    },
    {
      id: "q2",
      prompt: "Choose the best sentence for: I / not / see / that movie / yet.",
      answer: "I haven't seen that movie yet.",
      acceptedAnswers: ["I have not seen that movie yet", "I haven't seen that movie yet"],
      choices: ["I haven't seen that movie yet.", "I didn't seen that movie yet.", "I haven't saw that movie yet."],
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=80&auto=format&fit=crop",
      points: 15,
      hint: "Use have not + past participle + yet.",
      explanation: "Seen is the past participle of see. Yet usually goes at the end in negative sentences.",
      feedback: { correct: "Yes. Haven't seen ... yet sounds natural.", incorrect: "Try have not plus seen. Saw is simple past, not present perfect.", catEmotion: "😸" },
    },
    {
      id: "q3",
      prompt: "Ask a question: you / ever / eat / sushi?",
      answer: "Have you ever eaten sushi?",
      acceptedAnswers: ["Have you ever eaten sushi"],
      choices: ["Have you ever eaten sushi?", "Did you ever eaten sushi?", "Have you ever ate sushi?"],
      image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=900&q=80&auto=format&fit=crop",
      points: 20,
      hint: "Question form starts with Have you...",
      explanation: "Questions invert have/has before the subject: Have you ever eaten...?",
      feedback: { correct: "Excellent question form. Meowgical grammar.", incorrect: "Use Have you ever plus the past participle eaten.", catEmotion: "😻" },
    },
    {
      id: "q4",
      prompt: "Complete: They have never ____ to Canada.",
      answer: "been",
      acceptedAnswers: ["been"],
      choices: ["been", "went", "go"],
      image: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=900&q=80&auto=format&fit=crop",
      points: 10,
      hint: "The past participle of go can be been when talking about life experience.",
      explanation: "Have never been is used for life experience: They have never been to Canada.",
      feedback: { correct: "Nice. Been is exactly right here.", incorrect: "Use been after have never for experiences.", catEmotion: "😼" },
    },
    {
      id: "q5",
      prompt: "Fix the mistake: He have already bought the tickets.",
      answer: "He has already bought the tickets.",
      acceptedAnswers: ["He has already bought the tickets"],
      choices: ["He has already bought the tickets.", "He have already bought the tickets.", "He already has buy the tickets."],
      image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&q=80&auto=format&fit=crop",
      points: 15,
      hint: "He, she, it use has.",
      explanation: "Third-person singular uses has, not have.",
      feedback: { correct: "Sharp eyes. He has is the fix.", incorrect: "Look at the subject. He uses has.", catEmotion: "😺" },
    },
    {
      id: "q6",
      prompt: "Say one true sentence about your life using never.",
      answer: "Learner-generated answer using have/has never + past participle.",
      acceptedAnswers: ["open response"],
      choices: ["Open response"],
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80&auto=format&fit=crop",
      points: 25,
      hint: "Example: I have never ridden a horse.",
      explanation: "This is a speaking production item. Teacher checks accuracy and meaning.",
      feedback: { correct: "Lovely speaking. Your grammar and meaning matched.", incorrect: "Try have never plus a past participle, then say it again.", catEmotion: "😽" },
    },
  ],
  study: {
    flashcards: [
      { front: "already", back: "before now; often in positive present perfect sentences", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80&auto=format&fit=crop", example: "She has already eaten.", tags: ["adverb", "positive"] },
      { front: "yet", back: "until now; often in questions and negatives", image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80&auto=format&fit=crop", example: "Have you finished yet?", tags: ["adverb", "question", "negative"] },
      { front: "ever", back: "at any time in your life", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80&auto=format&fit=crop", example: "Have you ever flown?", tags: ["experience"] },
      { front: "never", back: "not at any time in your life", image: "https://images.unsplash.com/photo-1477414348463-c0eb7f1359b6?w=900&q=80&auto=format&fit=crop", example: "I have never tried surfing.", tags: ["experience", "negative"] },
    ],
    spacedRepetition: { againMinutes: 10, hardHours: 6, goodDays: 2, easyDays: 5 },
  },
  slideshow: {
    miniLessons: [
      {
        id: "s1",
        title: "Form: have/has + past participle",
        color: "blue",
        image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=80&auto=format&fit=crop",
        teacherScript: "Explain that present perfect connects the past to now. Write three examples and ask students to underline have or has.",
        bullets: ["I/you/we/they use have", "he/she/it uses has", "main verb becomes past participle"],
        checkForUnderstanding: "Ask: Which is correct, she has go or she has gone?",
        catLine: "Whisker tip: has plus gone is the grammar tuna!",
      },
      {
        id: "s2",
        title: "Already, yet, ever, never",
        color: "purple",
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&q=80&auto=format&fit=crop",
        teacherScript: "Color-code each adverb and show where it usually appears in the sentence.",
        bullets: ["already: positive", "yet: questions and negatives", "ever: life experience questions", "never: life experience negatives"],
        checkForUnderstanding: "Students make one question with ever and one negative sentence with yet.",
        catLine: "Tiny words, huge meaning. Pounce on their position!",
      },
    ],
  },
  aiQualityChecklist: [
    "Generate at least 24 questions for a 25-minute team game and 40+ for a full lesson.",
    "Every question must include answer, acceptedAnswers, hint, explanation, feedback, points, and optional image.",
    "All distractors must be plausible and diagnose a real misconception.",
    "Use CEFR-appropriate vocabulary and avoid culturally narrow examples.",
    "Include flashcards, slideshow mini-lessons, teacher scripts, and cat feedback.",
    "Include full modeSettings for the selected game type only plus shared environment settings.",
  ],
};

export const MASTER_AI_COPY_PROMPT = `You are an elite curriculum designer, language teacher, game designer, and strict JSON generator.

TASK
Create one complete JSON payload for my Baamboozle-style Activity Library Hub. The payload must build a premium 3D classroom game, a study flashcard section, and a color-coded teacher slideshow.

NON-NEGOTIABLE OUTPUT RULES
Return JSON only. No markdown. No comments. No trailing commas. No extra text.
The JSON must be detailed enough that an app can render the whole lesson with zero manual entry.
Generate high quantity and high quality content: minimum 24 game questions for a short lesson, 40-60 questions for a full lesson, 12+ study flashcards, and 4-8 slideshow mini-lessons.
Every question must include: id, prompt, answer, acceptedAnswers, choices when useful, image query or direct image URL, points, hint, explanation, and feedback with correct, incorrect, and catEmotion.
All content must match the selected language level, be pedagogically accurate, age-appropriate, and free of stereotypes.
Distractors must be plausible and must reveal common learner errors.
Use concise teacher-friendly language, clear answer keys, and natural learner feedback.

SELECT EXACTLY ONE GAME TYPE
selectedGameType must be one of:
baamboozle, guess-eroo, tic-tac-toe, double-vision, story-dice, four-in-a-row, memory

SHARED TOP-LEVEL JSON SHAPE
{
  "metadata": {
    "title": "string",
    "topic": "string",
    "language": "string",
    "level": "CEFR or grade",
    "ageRange": "string",
    "selectedGameType": "one of the allowed game types",
    "estimatedMinutes": 25
  },
  "environment": {
    "theme": "premium 3D theme description",
    "backgroundImage": "direct image URL or high-quality search query",
    "teams": [{ "id": "t1", "name": "Team Name", "emoji": "🐆", "color": "#a855f7", "score": 0 }],
    "timerSeconds": 1500,
    "maxTeams": 8,
    "questionOrder": "shuffle",
    "showAnswers": "teacher-controlled",
    "sounds": true,
    "music": false,
    "fullscreenRecommended": true,
    "accessibility": { "readAloud": true, "highContrast": false, "reduceMotion": false, "dyslexiaFriendly": true },
    "catCompanion": { "enabled": true, "persona": "supportive language-learning cat coach", "readHoverText": true, "feedbackStyle": "energetic" },
    "modeSettings": {}
  },
  "questions": [],
  "study": {
    "flashcards": [],
    "spacedRepetition": { "againMinutes": 10, "hardHours": 6, "goodDays": 2, "easyDays": 5 }
  },
  "slideshow": { "miniLessons": [] },
  "aiQualityChecklist": []
}

MODE-SPECIFIC REQUIREMENTS
baamboozle: include modeSettings.baamboozle with gridSize, classicPowerUps, powerUps list, pointTiles, steal/swap/gift rules.
guess-eroo: include modeSettings.guesseroo with secretItems, clues, pointsByClue, maxGuesses, imageRevealBlur, yesNoQuestionSupport.
tic-tac-toe: include modeSettings.ticTacToe with symbols, boardSize 3, bestOfRounds, drawBreaker, teamCount 2.
double-vision: include modeSettings.doubleVision with imageBank, rounds, panelSize, distractorsPerPanel, speedScoring, followUpQuestions.
story-dice: include modeSettings.storyDice with diceCount 1-16, diceImages, taskTypes, speakingTimerSeconds, rubric, rerollAllowed.
four-in-a-row: include modeSettings.fourInARow with rows 6, columns 7, discColors, suddenDeathRule, bestOfRounds, teamCount 2.
memory: include modeSettings.memory with pairs, pairCount, tileLabels, flipBackDelayMs, pointsPerPair, imageTextMatching.

CONTENT QUALITY
Questions should progress from recognition to controlled practice to production.
Include a balanced mix of easy, medium, and hard items.
Add speaking prompts where appropriate for language learning.
Every miniLesson must include title, color, image, teacherScript, bullets, checkForUnderstanding, and catLine.
Use catEmotion values from: 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🐱.

NOW BUILD THE JSON FOR:
LEARNER NAME: [PASTE LEARNER NAME]
LEARNER FACTS: [PASTE LEARNER FACTS]
LEARNER CEFR LEVEL: [PASTE LEVEL]
TOPIC: [PASTE TOPIC]
LANGUAGE: [PASTE LANGUAGE]
AGE RANGE: [PASTE AGE]
GAME TYPE: [PASTE ONE SELECTED GAME TYPE]
LESSON LENGTH: [PASTE MINUTES]
SPECIAL REQUIREMENTS: [PASTE ANYTHING ELSE]

IMPORTANT: You must adamantly follow the Learner Name, Learner Facts, and CEFR level to personalize the language, reading text, context, examples and activities explicitly for this learner. Ensure the tone and content are appropriate and engaging for their specific background and interests.`;
