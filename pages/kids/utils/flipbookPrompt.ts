import { LessonConfig, ActivityType } from './flipbookTypes';

export const ACTIVITY_DEFINITIONS: Array<{
  id: ActivityType;
  label: string;
  emoji: string;
  desc: string;
  category: 'Comprehension' | 'Puzzles' | 'Audio & Speech' | 'Story & Song' | 'Production & SEL';
  color: string;
}> = [
  { id: 'multipleChoice', label: 'Tap Choice Quiz', emoji: '✅', desc: 'Instant check with animated feedback', category: 'Comprehension', color: 'from-emerald-400 to-green-600' },
  { id: 'matchingPairs', label: 'Match Pairs', emoji: '🔗', desc: 'Connect words, pictures, & definitions', category: 'Puzzles', color: 'from-blue-400 to-indigo-600' },
  { id: 'dragDropSort', label: 'Drag & Drop Sorter', emoji: '🧲', desc: 'Sort words into themed category buckets', category: 'Puzzles', color: 'from-cyan-400 to-teal-600' },
  { id: 'sentenceBuilder', label: 'Sentence Builder', emoji: '🧱', desc: 'Tap & snap word tiles in syntactic order', category: 'Puzzles', color: 'from-amber-400 to-orange-600' },
  { id: 'fillBlank', label: 'Fill in the Blanks', emoji: '✍️', desc: 'Complete sentences with word capsules', category: 'Comprehension', color: 'from-pink-400 to-rose-600' },
  { id: 'listenChoose', label: 'Listen & Choose', emoji: '👂', desc: 'Auditory discrimination with natural voices', category: 'Audio & Speech', color: 'from-purple-400 to-fuchsia-600' },
  { id: 'speakRepeat', label: 'Speak & Pronounce', emoji: '🗣️', desc: 'Oral practice with mic & pronunciation score', category: 'Audio & Speech', color: 'from-sky-400 to-blue-600' },
  { id: 'memoryMatch', label: '3D Memory Flip (Power-ups)', emoji: '🧠', desc: 'Interactive flipping memory card pair game with Magic Eye & Lightning match', category: 'Puzzles', color: 'from-violet-400 to-purple-700' },
  { id: 'trueFalse', label: 'True or False', emoji: '⚖️', desc: 'High-energy fast fact verification', category: 'Comprehension', color: 'from-lime-400 to-green-600' },
  { id: 'wordOrderRace', label: 'Word Speed Race 🏎️💨', emoji: '🏁', desc: 'Right-to-left nitro speed unscramble with rival competitors', category: 'Puzzles', color: 'from-red-400 to-orange-600' },
  { id: 'storyChoice', label: 'Choose Adventure', emoji: '🗺️', desc: 'Interactive branching story choices', category: 'Story & Song', color: 'from-indigo-400 to-purple-600' },
  { id: 'songKaraoke', label: 'Song & Karaoke', emoji: '🎵', desc: 'Rhythmic lyrics with synchronized highlighter & YouTube', category: 'Story & Song', color: 'from-pink-500 to-purple-600' },
  { id: 'writingMission', label: 'Writing Mission', emoji: '📝', desc: 'Guided writing with sentence starters & word bank', category: 'Production & SEL', color: 'from-slate-500 to-slate-800' },
  { id: 'reflectionSEL', label: 'Feelings & SEL Check', emoji: '💛', desc: 'Emoji mood meter & kind self-talk practice', category: 'Production & SEL', color: 'from-yellow-300 to-amber-500' },
  { id: 'realLifeMission', label: 'Real-World Mission', emoji: '🌍', desc: 'Hands-on offline quest & roleplay dialogue', category: 'Production & SEL', color: 'from-emerald-500 to-teal-700' },
  // ── HIGH-FIDELITY ARCADE GAMES (Wordwall / Baamboozle class) ──
  { id: 'spellingBee', label: 'Spelling Bee Tiles', emoji: '🐝', desc: 'Hear the word, tap letter tiles in order to spell it', category: 'Audio & Speech', color: 'from-amber-300 to-yellow-600' },
  { id: 'wordSearch', label: 'Word Search Grid', emoji: '🔍', desc: 'Find hidden vocabulary in a letter grid', category: 'Puzzles', color: 'from-teal-400 to-cyan-700' },
  { id: 'balloonPop', label: 'Balloon Pop', emoji: '🎈', desc: 'Floating balloons — pop only the correct answer', category: 'Puzzles', color: 'from-rose-400 to-pink-700' },
  { id: 'whackAMole', label: 'Whack-a-Mole Words', emoji: '🔨', desc: 'Moles pop up with words — whack the right ones', category: 'Puzzles', color: 'from-stone-400 to-amber-800' },
  { id: 'bingoListener', label: 'Listening Bingo', emoji: '🎱', desc: 'Caller speaks words — tap your bingo card', category: 'Audio & Speech', color: 'from-fuchsia-400 to-purple-700' },
  { id: 'spinWheel', label: 'Spin the Magic Wheel', emoji: '🎡', desc: 'Wheel lands on a word — do the spoken task', category: 'Audio & Speech', color: 'from-indigo-400 to-blue-700' },
  { id: 'oddOneOut', label: 'Odd One Out', emoji: '🤔', desc: 'Spot the word that does not belong', category: 'Comprehension', color: 'from-orange-400 to-red-600' },
  { id: 'rhymeMatch', label: 'Rhyme Time', emoji: '🎼', desc: 'Pick the word that rhymes with the target', category: 'Comprehension', color: 'from-violet-400 to-indigo-700' },
  { id: 'syllableCount', label: 'Syllable Claps', emoji: '👏', desc: 'Clap & count the syllables in each word', category: 'Audio & Speech', color: 'from-lime-400 to-emerald-700' },
  { id: 'drawingPad', label: 'Pictionary Pad', emoji: '🎨', desc: 'Draw the vocabulary word on a magic canvas', category: 'Production & SEL', color: 'from-pink-400 to-rose-600' },
  { id: 'typingRace', label: 'Typing Race', emoji: '⌨️', desc: 'Type the words before the timer melts', category: 'Puzzles', color: 'from-sky-400 to-indigo-600' },
  { id: 'flashcardTrainer', label: 'Flashcard Trainer', emoji: '🃏', desc: 'Spaced-repetition flip cards with self-grading', category: 'Comprehension', color: 'from-emerald-400 to-green-700' },
];

export function buildMasterAIPrompt(
  config: LessonConfig,
  personalizationContext: string,
  extraLearnerInfo?: {
    heroForm?: string;
    petForm?: string;
    petType?: string;
    strengths?: string[];
    weaknesses?: string[];
    superpowers?: string[];
    classmates?: Array<{ name: string; avatar: string; archetype: string }>;
  }
): string {
  const activitiesList = ACTIVITY_DEFINITIONS.map(activity => `${activity.id} — ${activity.label}: ${activity.desc}`).join('\n  ');
  const ageMethodology = config.learnerAge <= 6
    ? 'Ages 4-6: Focus on touch-and-say mechanics, nursery rhymes, basic phonics, short oral turns, repetition, and large visual targets.'
    : config.learnerAge <= 10
      ? 'Ages 7-10: Prioritize sentence-building games, interactive stories, vocabulary rewards, playful repetition, and supported speaking.'
      : 'Ages 11-15: Prioritize grammar challenges, conversational simulations, reading comprehension, reasoning, and age-appropriate autonomy.';

  const classmatesFormatted = (extraLearnerInfo?.classmates && extraLearnerInfo.classmates.length > 0)
    ? extraLearnerInfo.classmates.map(c => `• ${c.avatar} ${c.name} (${c.archetype})`).join('\n  ')
    : `• 🧜‍♂️ Diego Wave (Merman Ocean Explorer)\n  • 🧛‍♀️ Countess Vespera (Gentle Vampire Scholar)\n  • 🧝‍♀️ Sophie Star (Elf Astronomer)\n  • 🦸‍♂️ Max Thunder (Superhero Trainee)`;

  return `╔════════════════════════════════════════════════════════════════════════════╗
  🌟 MASTER PROMPT: HYPER-REALISTIC FLIPBOOK GENERATOR (5X DEPTH & QUALITY) 🌟
╚════════════════════════════════════════════════════════════════════════════╝

You are a world-leading ESL/EFL pedagogy architect, celebrated children's author, and master gamification developer.
Your mission is to generate a rich, fun, highly personal interactive **Flipbook** in valid JSON format. Use short, simple words that children can understand. Never use fancy teacher words such as "Practice Arena"; say "Try the Game" instead. Use short child-friendly labels and simple everyday English throughout.

─────────────────────────────────────────────────────────────────────────────
🎯 CRITICAL WORKFLOW & INTAKE RULE (MANDATORY):
─────────────────────────────────────────────────────────────────────────────
1. ALWAYS ASK FOR LESSON TRANSCRIPT / PDF FIRST IF MISSING:
   If the teacher has NOT pasted their lesson curriculum, PDF text, or chapter transcript, YOU MUST FIRST ASK:
   "👋 Teacher! Please paste your Lesson Content (a full coursebook unit, transcript, or PDF text) below so I can weave ${config.learnerName}'s personalized 5X Flipbook around your exact teaching objectives!"
   Once the source text or topic is confirmed, immediately produce the complete, production-ready JSON.

2. LESSON CONTENT DEEP ANALYSIS → CHAPTERS FOLLOW THE CONTENT'S OWN DIVISIONS (MANDATORY):
   The teacher will paste the FULL text of a coursebook unit into "Lesson Content". You MUST:
   • Read and analyse EVERY part of the pasted unit: opener stories, reading passages, dialogues, vocabulary banks, grammar boxes, song/chant sections, pronunciation/phonics drills, practice exercises, review pages, and culture/project pages.
   • Create ONE chapter per natural division of the source content, in the same order the unit presents it (e.g. Unit opener → Vocabulary 1 → Reading → Grammar 1 → Song → Grammar 2 → Skills/Review). Do NOT merge or skip parts.
   • Set each chapter's "title" and "subtitle" from the actual unit headings, carry the unit's own example sentences into dialogues, and convert its printed exercises into the required interactive activity types.
   • SUPER-MASSIVE OUTPUT: aim for 6-10 chapters, 10-16 illustrated vocabulary words, 2-4 activities per chapter (mixing story practice with arcade games), full singalong lyrics, and multi-turn dialogues. Quality AND quantity — never a shallow stub.

3. 5X QUALITY & QUANTITY EXPANSION:
   Do NOT provide a shallow 2-activity stub. Provide at least 5-7 multi-page story chapters, 8-12 illustrated vocabulary cards, full singalong lyrics, rich multi-turn dialogues with Azure voice tags, and at least 8+ distinct interactive activities.

4. 100% STRICTLY VALID JSON ONLY:
   Your final output must be strictly valid JSON enclosed in \`\`\`json ... \`\`\` without trailing commas or syntax errors.

─────────────────────────────────────────────────────────────────────────────
💎 PEDAGOGICAL & DESIGN MANDATES:
─────────────────────────────────────────────────────────────────────────────
- 👥 AGE-BAND METHODOLOGY (MANDATORY):
  Learner age: ${config.learnerAge}. Apply this methodology across every chapter, activity, dialogue, visual, feedback message, and assessment: ${ageMethodology}

- 🎯 STRICT CEFR LEVEL ADAPTATION (THE "1 STEP EASIER" RULE):
  Target CEFR level: ${config.level}.
  CRITICAL: Simplify vocabulary, sentence frames, and grammar rules to be strictly **1 STEP EASIER** than the learner's nominal level (e.g., for A2 learners, use breezy A1+ sentence structures). This eliminates cognitive fatigue, builds immediate oral fluency, and fills the child with confidence.

- ✍️ ANSWER-LENGTH ANTI-CUE RULE (MANDATORY FOR EVERY "multipleChoice" ACTIVITY):
  Children guess the longest answer instead of reading it, so never let word count give the game away:
  • All four options must be within ±2 words of each other and carry the same level of detail (same shape: word ↔ word, phrase ↔ phrase, emoji count ↔ emoji count).
  • THE LONGEST OPTION MUST NEVER BE "correctAnswer". If it is, shorten the correct option or lengthen the distractors until a distractor is longer.
  • The correct option must not be the only one with a number, a name, a comma or extra describing words, and must not repeat words from the "prompt" more than the distractors do.
  • All three distractors must be equally plausible and from the same story world; rotate the position of the correct answer so it never sits at the same index twice in a row.
  • SILENTLY SELF-CHECK EVERY QUIZ ITEM BEFORE RETURNING and rewrite any item where the longest option is the correct one.

- 🗣️ MICROSOFT AZURE NATURAL CHILDREN'S VOICES ONLY (MANDATORY VOICE CASTING):
  Every character and dialogue MUST carry an "azureVoice" tag. For young learners, prefer the Azure CHILD voices whenever a child/young character speaks:
  • en-US-AnaNeural (child, female, bright & warm — default for the learner-hero and kids)
  • en-GB-MaisieNeural (child, female, British — for UK-flavoured units)
  Adult characters may use: en-US-JennyNeural, en-US-AriaNeural, en-US-GuyNeural, en-US-AndrewNeural, en-GB-SoniaNeural, en-GB-RyanNeural.
  The Flipbook player reads these tags aloud with natural Azure neural TTS — set "pitch" 1.15-1.35 and "rate" 0.9-1.0 for child voices.

- 🗣️ ORAL COMMUNICATION, DRAMA & PHONICS AS CORE:
  Every section must feature spoken dialogue prompts, pronunciation drills with Azure voices, chant rhythms, and teacher-led whole-class turns. Design every game for a shared screen: use very large text, strong light/dark contrast, one clear action at a time, and answer cards that children can see from far away. For flashcards, make every back different and easy to talk about: include a clear English letter (A-Z), a bold color name, or both, plus the target word/meaning. For multiple choice, matching, identify, sorting, memory, bingo, and every other game, include visible letters, colors, pictures, and simple prompts so the teacher can ask “Which letter?”, “What color?”, “What do you see?”, or “Tell your team.” Keep turns short, cooperative, and easy to run aloud.

- 🎨 CONTENT-TYPE SKIN (sets the whole book's visual identity):
  Set the top-level "contentType" field EXACTLY to the Content Type above (e.g. "Story Lesson", "Song Lesson", "Phonics Lab"). Each content type renders a completely different, beautiful skin: cover art style, page tints, accent colors, ornaments, and page decorations all change. Also write a 2-3 sentence exciting "backCoverBlurb" advertising the adventure (shown on the printed back cover).

- 🦸‍♂️🐾 PERSONALIZED HERO, PET & CLASSMATE FELLOWS:
  Feature the learner's actual hero and loyal pet as the main protagonists:
  • 🦸 Main Hero: ${config.learnerName} (${extraLearnerInfo?.heroForm || 'Brave Explorer'})
  • 🐾 Companion Pet: ${extraLearnerInfo?.petForm || 'Loyal Guardian'} (${extraLearnerInfo?.petType || 'Pet'} ${config.learnerPetEmoji || '🐾'})
  • 🧙‍♂️ Mentor Teacher: ${config.useTutorInfo ? config.tutorName : 'Wizard Dan'} (${config.tutorStyle || 'Gamified & Encouraging'})
  • 🌟 Hero Classmates (Fellow Allies in the Story):
  ${classmatesFormatted}

- 🛡️ STRENGTHS, WEAKNESSES & SUPERPOWERS INTEGRATION:
  • Strengths to celebrate: ${extraLearnerInfo?.strengths?.join(', ') || 'Reading, Courage, Vocabulary'}
  • Focus growth areas to gently scaffold: ${extraLearnerInfo?.weaknesses?.join(', ') || 'Pronunciation, Past tense'}
  • Superpowers unlocked: ${extraLearnerInfo?.superpowers?.join(', ') || 'Golden Focus, Lightning Speed, Creative Wonder'}

- 🖼️ 100% KID-SAFE REAL PICTURES & YOUTUBE SINGALONGS:
  • High-quality, kid-safe Unsplash images for every vocabulary word and story scene (e.g. "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80").
  • Embeddable, wholesome YouTube singalong video IDs appropriate for young learners (e.g. Super Simple Songs, English Singsing, Disney Chants, Pinkfong, e.g. "jofNR_WkoCE", "75p-NmpMoRU", "f3Hw_mY2uE0", "dQw4w9WgXcQ").

─────────────────────────────────────────────────────────────────────────────
📋 CURRENT LESSON CONFIGURATION:
─────────────────────────────────────────────────────────────────────────────
• Content Type: ${config.contentType}
• Learner Age: ${config.learnerAge}
• Age-Band Methodology: ${ageMethodology}
• Target CEFR Level: ${config.level} (Calibrated 1 step simpler for maximum oral speaking fluency)
• Tone: ${config.tone}
• Topic / Quest Theme: ${config.topic || 'Teacher to provide'}
• Teacher Source Text / Notes: ${config.sourceText || 'Teacher to provide'}
• REQUIRED GAMES — include every one below at least once, with playable data and clear success rules:\n  ${activitiesList}\n• Use the learner's Hero Card, avatar evolution, pet evolution, session log, quests, homework, skills, kingdom, interests, goals, feedback, learner photo, and adventurer photos. Place the learner and friendly classmates in safe, kind team challenges; never make children feel excluded or compared by ability.
• Shared-screen activity data is mandatory: every flashcard pair should include a distinct back label such as "A — red" or "B — blue"; choices should have stable letters A, B, C, D; matching and identify tasks should include clear color/letter clues; and each activity must include a teacher read-aloud question plus an easy whole-class response. Make the learner the hero. Add friendly adventurer classmates when supplied. Use their names, photos, and simple challenges in the story.
• Learner Profile & Context: ${personalizationContext}
• Extra Teacher Guidelines: ${config.customInstructions || 'None'}

─────────────────────────────────────────────────────────────────────────────
📦 EXACT JSON STRUCTURE SCHEMA:
─────────────────────────────────────────────────────────────────────────────
{
  "title": "${config.learnerName}'s Flipbook: [Exciting Quest Title]",
  "subtitle": "A 3D Flip Book Adventure in Spoken English, Song, & Word Magic",
  "level": "${config.level}",
  "estimatedMinutes": 45,
  "theme": "fairy",
  "contentType": "${config.contentType}",
  "backCoverBlurb": "[2-3 exciting sentences advertising this adventure, ending with a question that makes kids want to open the book]",
  "coverImageUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
  "learnerAvatarEmoji": "${config.learnerName ? '🦸' : '🧚‍♀️'}",
  "learnerPetEmoji": "${config.learnerPetEmoji || '🐾'}",
  "characters": [
    {
      "name": "${config.useTutorInfo ? config.tutorName : 'Wizard Dan'}",
      "emoji": "🧙‍♂️",
      "gender": "Male",
      "archetype": "Mage",
      "azureVoice": "en-US-GuyNeural",
      "pitch": 0.85,
      "rate": 0.95,
      "dialogueStyle": "Wise and encouraging mentor"
    },
    {
      "name": "${config.learnerName}",
      "emoji": "🦸",
      "gender": "Any",
      "archetype": "Hero",
      "azureVoice": "en-US-AnaNeural",
      "pitch": 1.2,
      "rate": 1.0,
      "dialogueStyle": "Curious hero eager to speak magical words"
    },
    {
      "name": "Diego Wave",
      "emoji": "🧜‍♂️",
      "gender": "Male",
      "archetype": "Mermaid",
      "azureVoice": "en-US-ChristopherNeural",
      "pitch": 1.05,
      "rate": 1.0,
      "dialogueStyle": "Energetic oceanic explorer"
    },
    {
      "name": "Countess Vespera",
      "emoji": "🧛‍♀️",
      "gender": "Female",
      "archetype": "Vampire",
      "azureVoice": "en-US-JennyNeural",
      "pitch": 0.95,
      "rate": 0.95,
      "dialogueStyle": "Gentle scholar who loves mystery"
    }
  ],
  "mascot": {
    "name": "Whiskers",
    "emoji": "😺",
    "personality": "Playful and curious companion",
    "catchphrases": [
      "Paw-some pronunciation!",
      "Look for clues in the picture!",
      "Your brain magic is growing!"
    ],
    "azureVoice": "en-US-AriaNeural"
  },
  "xpTotal": 400,
  "learningObjectives": [
    "Identify and pronounce 6+ key vocabulary words with confidence",
    "Use target sentence frames in complete spoken dialogues",
    "Demonstrate comprehension through story choices, songs, and interactive puzzles"
  ],
  "successCriteria": [
    "I can say the target words aloud with clear pronunciation",
    "I can find the hidden clues and solve the speed race",
    "I can sing along with the karaoke lyrics"
  ],
  "vocabulary": [
    {
      "word": "Crystal",
      "phonetic": "/ˈkrɪs.təl/",
      "meaning": "A clear, shiny, glowing rock filled with magic",
      "example": "Diego found a glowing blue crystal in the cave.",
      "imageUrl": "https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=600&auto=format&fit=crop&q=80",
      "audioPhrase": "Say crystal! C-R-Y-S-T-A-L."
    },
    {
      "word": "Discover",
      "phonetic": "/dɪˈskʌv.ər/",
      "meaning": "To find or see something for the first time",
      "example": "We discover a secret door behind the waterfall.",
      "imageUrl": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80",
      "audioPhrase": "Let us discover new worlds together!"
    },
    {
      "word": "Brave",
      "phonetic": "/breɪv/",
      "meaning": "Ready to face challenges without fear",
      "example": "The brave hero stepped forward with a smile.",
      "imageUrl": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
      "audioPhrase": "You are strong and brave!"
    },
    {
      "word": "Glow",
      "phonetic": "/ɡloʊ/",
      "meaning": "To shine with a soft, warm light",
      "example": "The magic lantern begins to glow in the dark.",
      "imageUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
      "audioPhrase": "Watch the crystal glow!"
    }
  ],
  "sections": [
    {
      "id": "sec-1",
      "title": "The Secret Portal in the Woods",
      "subtitle": "Chapter 1: An unexpected magical discovery",
      "emoji": "🌲",
      "type": "story",
      "content": "One sunny morning, ${config.learnerName} and companion pet ${config.learnerPetEmoji || '🐾'} wandered into the Enchanted Forest. Behind an emerald vine, a glowing crystal door shimmered in the sunlight.",
      "readAloudText": "One sunny morning, ${config.learnerName} and pet found a magical crystal door in the woods.",
      "imageUrl": "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
      "dialogues": [
        {
          "character": "Wizard Dan",
          "text": "Look closely, ${config.learnerName}! What magic words are carved into the glowing stone?",
          "azureVoice": "en-US-GuyNeural"
        },
        {
          "character": "${config.learnerName}",
          "text": "It says: 'Only the brave may discover what lies within!'",
          "azureVoice": "en-US-AnaNeural"
        }
      ],
      "activities": [
        {
          "id": "act-1-1",
          "type": "multipleChoice",
          "prompt": "What did ${config.learnerName} and the pet find behind the vines?",
          "options": [
            "A glowing crystal door ✨",
            "An old bicycle 🚲",
            "A sleeping bear 🐻",
            "A bowl of cereal 🥣"
          ],
          "correctAnswer": "A glowing crystal door ✨",
          "feedbackCorrect": "Brilliant! You found the magical portal!",
          "feedbackIncorrect": "Look at the picture again — it shines like magic!",
          "points": 25
        },
        {
          "id": "act-1-2",
          "type": "speakRepeat",
          "prompt": "Say the magic password into your microphone: 'Open, Crystal Door!'",
          "targetText": "Open, Crystal Door!",
          "feedbackCorrect": "Spell accepted! The crystal door opens smoothly!",
          "points": 30
        }
      ]
    },
    {
      "id": "sec-2",
      "title": "The Crystal Melody Karaoke",
      "subtitle": "Chapter 2: Sing with Diego and Countess Vespera",
      "emoji": "🎵",
      "type": "song",
      "content": "Inside the glowing cavern, crystals resonated with musical harmony! Sing along to unlock the treasure chest.",
      "readAloudText": "Listen to the crystal melody! Sing along to unlock the ancient chest.",
      "videoYoutubeId": "jofNR_WkoCE",
      "songLyrics": [
        "Crystals glow, shining bright! (clap, clap)",
        "Lighting up the cave tonight! (sparkle, sparkle)",
        "Brave explorers, hear the sound,",
        "Magic secrets to be found!"
      ],
      "activities": [
        {
          "id": "act-2-1",
          "type": "songKaraoke",
          "prompt": "Follow the bouncing rhythm and sing the Crystal Melody chorus!",
          "songLyrics": [
            "Crystals glow, shining bright!",
            "Lighting up the cave tonight!",
            "Brave explorers, hear the sound,",
            "Magic secrets to be found!"
          ],
          "points": 35
        },
        {
          "id": "act-2-2",
          "type": "matchingPairs",
          "prompt": "Match each magic word with its meaning:",
          "pairs": [
            { "left": "💎 Crystal", "right": "Glowing Rock" },
            { "left": "🗺️ Discover", "right": "Find Something" },
            { "left": "🛡️ Brave", "right": "Not Afraid" },
            { "left": "✨ Glow", "right": "Shine Softly" }
          ],
          "points": 30
        }
      ]
    },
    {
      "id": "sec-3",
      "title": "Speed Race & Memory Lab",
      "subtitle": "Chapter 3: Fast-action Word Quest",
      "emoji": "🏎️",
      "type": "game",
      "content": "To cross the Crystal Bridge, ${config.learnerName} must race the magic car from start to finish line, and match all hidden memory cards!",
      "readAloudText": "Speed across the Crystal Bridge! Unscramble sentences and flip memory pairs.",
      "activities": [
        {
          "id": "act-3-1",
          "type": "wordOrderRace",
          "prompt": "Tap the words in order to race your car right-to-left across the bridge:",
          "correctOrder": ["We", "discover", "the", "glowing", "crystal."],
          "points": 35
        },
        {
          "id": "act-3-2",
          "type": "memoryMatch",
          "prompt": "Use your Magic Eye power-up and match all the pairs:",
          "pairs": [
            { "left": "💎 Crystal", "right": "Glowing Rock" },
            { "left": "🛡️ Brave", "right": "Hero Heart" },
            { "left": "✨ Glow", "right": "Bright Light" }
          ],
          "points": 35
        }
      ]
    }
  ],
  "exitTicket": {
    "prompt": "Hero Reflection: What was your favorite magic word today, and how will you use it in real life?",
    "options": [
      "I will be brave and try new words! 🦁",
      "I will discover new books to read! 📚",
      "I will glow with kindness to my friends! 💖"
    ],
    "reflectionQuestion": "Tell Wizard Dan one thing you are proud of accomplishing today:"
  }
}

Now, verify the teacher's lesson content. Once confirmed, output the complete 5X expanded JSON!`;
}
