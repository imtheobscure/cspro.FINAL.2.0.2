export type GimkitModeId = "classic" | "team" | "trust" | "humans-vs-zombies";

export interface GimkitQuestion {
  id: string;
  prompt: string;
  answer: string;
  choices: string[];
  points: number;
  image?: string;
}

export interface GimkitFlashcard {
  front: string;
  back: string;
  example: string;
  ccq: string;
  image: string;
}

export interface GimkitSlide {
  title: string;
  color: string;
  image: string;
  body: string;
  examples: string[];
  whenToUse: string;
  whereToUse: string;
  howToUse: string;
}

export interface GimkitPayload {
  title: string;
  topic: string;
  level: string;
  backgroundImage: string;
  imageKeywords: string[];
  musicKeyword: string;
  questions: GimkitQuestion[];
  study: { flashcards: GimkitFlashcard[] };
  slideshow: { lessons: GimkitSlide[] };
}

export interface GimkitUpgrade {
  id: "income" | "streak" | "multiplier" | "insurance";
  name: string;
  emoji: string;
  baseCost: number;
  costScale: number;
  baseValue: number;
  valueScale: number;
  description: (level: number) => string;
  color: string;
}

export const GIMKIT_UPGRADES: GimkitUpgrade[] = [
  {
    id: "income", name: "Money per Question", emoji: "💵", baseCost: 50, costScale: 2,
    baseValue: 1, valueScale: 2,
    description: (lvl) => `+${(lvl * 2).toFixed(0)}x cash per correct answer`,
    color: "from-emerald-400 to-green-700",
  },
  {
    id: "streak", name: "Streak Bonus", emoji: "🔥", baseCost: 75, costScale: 1.8,
    baseValue: 1, valueScale: 1.5,
    description: (lvl) => `+${(lvl * 5).toFixed(0)} cash per consecutive correct`,
    color: "from-orange-400 to-red-700",
  },
  {
    id: "multiplier", name: "Mega Multiplier", emoji: "📈", baseCost: 200, costScale: 2.5,
    baseValue: 1, valueScale: 1.4,
    description: (lvl) => `${(1 + lvl * 0.3).toFixed(1)}x global multiplier`,
    color: "from-cyan-400 to-blue-700",
  },
  {
    id: "insurance", name: "Loss Insurance", emoji: "🛡️", baseCost: 100, costScale: 2,
    baseValue: 0, valueScale: 1,
    description: (lvl) => `${Math.min(95, lvl * 20)}% protection from wrong-answer losses`,
    color: "from-sky-400 to-indigo-700",
  },
];

export interface GimkitPowerup {
  id: "snowball" | "fog" | "bait" | "shield" | "purify" | "zombie-strike" | "barrier-boost";
  name: string;
  emoji: string;
  cost: number;
  description: string;
  type: "offensive" | "defensive" | "human" | "zombie";
  color: string;
}

export const GIMKIT_POWERUPS: GimkitPowerup[] = [
  { id: "snowball",      name: "Snowball Freeze",  emoji: "❄️", cost: 80,  description: "Freezes all rival screens in ice for 8 seconds!", type: "offensive", color: "from-cyan-300 to-blue-600" },
  { id: "fog",           name: "Cloud Fog",        emoji: "🌫️", cost: 60,  description: "Obscures rivals' question text in heavy fog!",     type: "offensive", color: "from-slate-300 to-slate-700" },
  { id: "bait",          name: "Bait Trap",        emoji: "🪤", cost: 100, description: "Drains $50 from every other player!",              type: "offensive", color: "from-amber-400 to-rose-600" },
  { id: "shield",        name: "Reflective Shield",emoji: "🛡️", cost: 90,  description: "Blocks the next incoming attack and bounces back!",type: "defensive", color: "from-emerald-300 to-teal-700" },
  { id: "purify",        name: "Status Purify",    emoji: "✨", cost: 50,  description: "Instantly clears all negative status effects!",    type: "defensive", color: "from-fuchsia-300 to-purple-700" },
  { id: "zombie-strike", name: "Zombie Horde Strike",emoji: "🧟",cost: 120, description: "Sends a zombie wave: deals 25 damage to barrier!", type: "zombie",    color: "from-rose-700 to-emerald-900" },
  { id: "barrier-boost", name: "Barrier Reinforce",emoji: "🧱", cost: 120, description: "Adds 30 HP to the human barrier instantly!",       type: "human",     color: "from-amber-300 to-orange-600" },
];

export const GIMKIT_PROMPT = `You are an elite gamified educational JSON generator for the Gimkit Suite.

Generate ONE complete JSON payload that powers a premium 3D gamified classroom learning experience.

NON-NEGOTIABLE QUALITY RULES
- Return JSON only — no markdown, no comments, no trailing commas.
- Minimum 25 multiple-choice questions, scaling difficulty, with 4 plausible distractors each.
- Minimum 12 study flashcards with personalized example sentences and CCQ (concept-checking questions).
- Minimum 6 elaborate teacher slides with images, examples, and when/where/how-to-use guidance.
- Use direct image search keywords or full Unsplash URLs.
- Use a music keyword that matches the lesson's energy and theme.

OUTPUT SCHEMA (must match exactly)
{
  "title": "Lesson Title Here",
  "topic": "Topic / subject area",
  "level": "CEFR or grade level",
  "backgroundImage": "https://images.unsplash.com/photo-XXXXX?w=1600",
  "imageKeywords": ["keyword 1", "keyword 2"],
  "musicKeyword": "instrumental theme matching lesson",
  "questions": [
    {
      "id": "q1",
      "prompt": "Question text here?",
      "answer": "correct option",
      "choices": ["correct option", "distractor 1", "distractor 2", "distractor 3"],
      "points": 10,
      "image": "https://images.unsplash.com/photo-XXXXX?w=900"
    }
  ],
  "study": {
    "flashcards": [
      {
        "front": "term or concept",
        "back": "clear definition with grammar/usage notes",
        "example": "personalized example sentence using the term in real-world context",
        "ccq": "Concept Check Question that confirms understanding (e.g., 'Did the action finish?')",
        "image": "https://images.unsplash.com/photo-XXXXX?w=900"
      }
    ]
  },
  "slideshow": {
    "lessons": [
      {
        "title": "Mini-lesson title",
        "color": "blue",
        "image": "https://images.unsplash.com/photo-XXXXX?w=1200",
        "body": "Detailed teacher script paragraph that explains the concept clearly.",
        "examples": ["Concrete example 1", "Concrete example 2", "Concrete example 3"],
        "whenToUse": "Specific contexts and timing for using this concept.",
        "whereToUse": "Settings or domains where it most often appears.",
        "howToUse": "Step-by-step usage guidance and common pitfalls."
      }
    ]
  }
}

NOW BUILD THE JSON FOR:
LEARNER NAME: [PASTE LEARNER NAME]
LEARNER FACTS: [PASTE LEARNER FACTS]
LEARNER CEFR LEVEL: [PASTE LEVEL]
TOPIC: [PASTE TOPIC]
LANGUAGE / SUBJECT: [PASTE LANGUAGE OR SUBJECT]
LESSON LENGTH (MIN): [PASTE MINUTES]
SPECIAL FOCUS: [PASTE EXTRAS]

IMPORTANT: You must adamantly follow the Learner Name, Learner Facts, and CEFR level to personalize the language, reading text, context, examples and activities explicitly for this learner. Ensure the tone and content are appropriate and engaging for their specific background and interests.`;

export const SAMPLE_GIMKIT_PAYLOAD: GimkitPayload = {
  title: "Present Perfect Cash Frenzy",
  topic: "Present Perfect Tense (have/has + past participle)",
  level: "A2-B1",
  backgroundImage: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1600&q=80&auto=format&fit=crop",
  imageKeywords: ["neon classroom", "stadium lights", "money rain"],
  musicKeyword: "epic synthwave classroom energy",
  questions: [
    { id: "q1", prompt: "She has _____ to Paris twice in her life.", answer: "been", choices: ["been", "gone", "went", "go"], points: 15, image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900" },
    { id: "q2", prompt: "I have _____ finished the homework.", answer: "already", choices: ["already", "yet", "ever", "since"], points: 15, image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900" },
    { id: "q3", prompt: "Have you _____ tried sushi?", answer: "ever", choices: ["ever", "never", "yet", "just"], points: 15, image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=900" },
    { id: "q4", prompt: "We haven't seen that movie _____.", answer: "yet", choices: ["yet", "already", "since", "for"], points: 15, image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900" },
    { id: "q5", prompt: "He has lived here _____ 2010.", answer: "since", choices: ["since", "for", "from", "by"], points: 20, image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900" },
    { id: "q6", prompt: "They have known each other _____ ten years.", answer: "for", choices: ["for", "since", "during", "from"], points: 20, image: "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=900" },
    { id: "q7", prompt: "Which is the past participle of 'eat'?", answer: "eaten", choices: ["eaten", "ate", "eat", "eating"], points: 10, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900" },
    { id: "q8", prompt: "Past participle of 'see'?", answer: "seen", choices: ["seen", "saw", "see", "sawed"], points: 10, image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900" },
    { id: "q9", prompt: "Choose the correct: He _____ his keys.", answer: "has lost", choices: ["has lost", "have lost", "has losed", "lost has"], points: 20, image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=900" },
    { id: "q10", prompt: "Which sentence is correct?", answer: "I have just arrived.", choices: ["I have just arrived.", "I just have arrived.", "I have arrived just.", "Just I have arrived."], points: 25, image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900" },
  ],
  study: {
    flashcards: [
      { front: "been vs gone",  back: "BEEN = visited & returned. GONE = went and still there.",  example: "She has BEEN to Tokyo (now back). She has GONE to Tokyo (still there).",  ccq: "If she has been to Tokyo, is she there now?", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900" },
      { front: "already",       back: "Used in positive sentences for actions completed sooner than expected.", example: "Wow, you have already finished the cake!",  ccq: "Does 'already' suggest the action happened earlier than expected?", image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900" },
      { front: "yet",           back: "Used in negatives & questions for things expected but not done.", example: "Have you sent the email yet? — No, I haven't sent it yet.",  ccq: "Do we use 'yet' to talk about things we expect to happen?", image: "https://images.unsplash.com/photo-1455894127589-22f75500213a?w=900" },
      { front: "ever / never",  back: "EVER asks about life experience in questions; NEVER negates it.", example: "Have you ever tried bungee jumping? — No, I have never tried it.", ccq: "Is 'ever' usually used in questions or statements?", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900" },
      { front: "since vs for",  back: "SINCE + a starting point in time. FOR + a duration.",  example: "I have lived here SINCE 2018. I have lived here FOR 6 years.",  ccq: "Which one needs a duration: since or for?", image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900" },
      { front: "just",          back: "Used for actions that finished a very short time ago.",  example: "I have just woken up — give me a minute!",  ccq: "Did the action happen a long time ago?", image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900" },
    ],
  },
  slideshow: {
    lessons: [
      {
        title: "Forming the Present Perfect",
        color: "blue",
        image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200",
        body: "The present perfect connects a past action to the present moment. Form it with HAVE/HAS + the past participle of the main verb. Use 'has' for he/she/it; use 'have' for I/you/we/they.",
        examples: ["I have eaten breakfast.", "She has finished her project.", "They have visited Rome twice."],
        whenToUse: "Use it for life experiences, recent actions with a present result, and unfinished time periods (today, this week).",
        whereToUse: "Conversations, emails, news headlines, biographies, CVs.",
        howToUse: "Subject + have/has + past participle. Add 'not' between the auxiliary and participle for negatives. Invert the auxiliary for questions.",
      },
      {
        title: "Already, Yet, Just, Ever, Never",
        color: "purple",
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200",
        body: "These adverbs are signals. Each one cues the listener about the timing or expectation of the action and where the adverb usually sits in the sentence.",
        examples: ["I have already finished.", "Have you done it yet?", "She has just arrived.", "Have you ever tried sushi?", "He has never been late."],
        whenToUse: "Use them whenever you want to add nuance about expectation, recency, or life experience.",
        whereToUse: "Especially common in spoken English and casual writing.",
        howToUse: "ALREADY between have/has and the participle. YET at the end. JUST between have/has and the participle. EVER in questions, NEVER in negatives.",
      },
      {
        title: "Since vs For",
        color: "green",
        image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200",
        body: "These two link the action to time. Pair them only with the present perfect (and present perfect continuous) when the action started in the past and continues now.",
        examples: ["I have known him since 2015.", "I have known him for nine years.", "She has worked here since March."],
        whenToUse: "Whenever you describe duration up to the present.",
        whereToUse: "Personal stories, work histories, relationships, ongoing situations.",
        howToUse: "Use SINCE with a fixed point (date, event). Use FOR with a length of time (years, hours, weeks).",
      },
      {
        title: "Common Mistakes",
        color: "red",
        image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1200",
        body: "Learners often confuse the present perfect with the past simple, and mismatch the participle form.",
        examples: ["❌ I have went to Paris. ✅ I have GONE to Paris.", "❌ She has eat pizza. ✅ She has EATEN pizza.", "❌ Yesterday I have seen him. ✅ Yesterday I SAW him."],
        whenToUse: "Whenever you see a specific finished time (yesterday, last week), switch to past simple.",
        whereToUse: "Most common in speaking; review with your students after each speaking task.",
        howToUse: "Always verify the participle, then check that no specific past time is mentioned.",
      },
    ],
  },
};
