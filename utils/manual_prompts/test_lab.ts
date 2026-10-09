import type { LearnerProfile } from '../../types';
import { getProfileContext } from '../../services/generation/core';

export const getTestLabPrompt = (learner: LearnerProfile): string => {
    const profileCtx = getProfileContext(learner);
    // personalInfo is required by the type but NOT by legacy/imported learner records, and a
    // tutor pressing Copy AI Prompt on those learners used to hit a TypeError here instead of
    // getting their prompt. Read it defensively: `facts` is personalisation sugar, never worth
    // failing the whole lesson over.
    const personal = (learner as any)?.personalInfo || {};
    const facts = `Name: ${learner.name}, Job: ${personal.occupation || 'not specified'}, Location: ${[personal.city, personal.country].filter(Boolean).join('/') || 'not specified'}, Interests: ${learner.interests}, Level: ${learner.cefrLevel}`;

    return `
--- YOUR TASK (SETUP) ---
You are an expert Educational Content Generator for a language learning application.

**CRITICAL INSTRUCTION: STOP! DO NOT GENERATE YET.**
I have NOT provided the source text yet.
1. Read the instructions below to understand the required JSON structure.
2. **DO NOT** output the JSON yet.
3. Your response to THIS prompt should be ONLY: "Please provide the source text or PDF content."
4. I will then paste the text in the next message. Once you receive the text, THEN you must generate the JSON.

--- INPUT DATA (To be provided next) ---
SOURCE_TEXT: [I will paste this in next message]
LEARNER_FACTS: ${facts}

${profileCtx}

--- CONTENT TYPE: Test Lab Activity ---
Generate a strictly formatted JSON object containing **at least 24 long, detailed, and high-quality interactive exercises** based exclusively on the provided SOURCE_TEXT.

--- GLOBAL INSTRUCTIONS ---
1. **CRITICAL: EXTREME VARIETY REQUIRED**: You MUST mix and match all available activity types (multiple_choice, would_you_rather, cloze, matching, reading_activity, listening_activity, hot_seat, taboo, truth_or_dare, scramble, conversation_completion). DO NOT generate 24 of the same type. Make sure every type is used at least twice.
2. **RESTRICTION - NO MICROPHONE OR TYPING**: DO NOT use 'pronunciation', 'dictation', or 'jam' type activities under any circumstances. Ensure they won't get generated.
3. **NON-NEGOTIABLE: 100% STANDALONE LESSON & STRICTLY NO EXTERNAL REFERENCES**:
   - The lesson MUST be a complete 100% standalone lesson!
   - **STRICTLY FORBIDDEN**: NEVER say "according to the text", "as mentioned in the text", "in the passage above", "based on the video", "as stated in the lesson", "according to the speaker", or refer to any external unseen material.
   - Every single question, reading activity, audio script, cloze passage, or scenario MUST provide ALL necessary information directly within its own prompt. Questions must be formulated directly about the real-world facts or scenario (e.g. "What is the safest way to prevent pickpocketing in crowded markets?" - NOT "According to the text, what should you do?").
4. **NON-NEGOTIABLE: NO GENERIC OR META CONTENT — EVERYTHING MUST TEACH REAL LANGUAGE FROM THE SOURCE_TEXT**:
   - Every word, sentence, question, and example must come from the SOURCE_TEXT or be built directly on its vocabulary, grammar structures, and facts.
   - **STRICTLY FORBIDDEN**: generic filler sentences ("The quick brown fox jumps over the lazy dog"), placeholder examples, mock data, or any sentence not connected to the lesson material.
   - **STRICTLY FORBIDDEN**: meta / instructional filler text about how to answer tests (e.g., "Multiple choice questions test your understanding of the lesson's main ideas", "Read carefully and find the correct information"). Never write this kind of sentence anywhere — not in questions, feedback, examples, or speaking prompts.
   - The learner's level is ${learner.cefrLevel}. EVERY single line of content must be written in simplified English at exactly this level or slightly below: short sentences, everyday vocabulary, one clear idea per sentence. When a new word or structure appears, it must be taught immediately in the feedback.
5. **NON-NEGOTIABLE: PHONE A FRIEND LIFELINE (MANDATORY IN EVERY MULTIPLE CHOICE QUESTION)**:
   - Every single item in the "questions" array of "multiple_choice" MUST include:
     - "phone_clue": A witty, realistic, and helpful spoken hint from a friend (e.g. "I'm confident the answer is X because...").
     - "caller_name": The caller's name (e.g. "Professor Spark", "Sherlock", "Aunt Lucy", "Tech Wizard", "Captain Clueless", "Dr. Logic").
     - "caller_voice": Natural voice name (e.g. "en-US-JennyNeural", "en-US-GuyNeural", "en-GB-RyanNeural", "en-US-AriaNeural" - NEVER "Microsoft David").
6. **NON-NEGOTIABLE: CLOZE (FILL IN THE GAPS) ONLY 5-10 GAPS PER GAME**:
   - Each cloze activity MUST contain STRICTLY BETWEEN 5 AND 10 GAPS (minimum 5, maximum 10 gaps per game). NEVER generate more than 10 gaps under any circumstances!
   - Write a rich, engaging passage (150-250 words) and place exactly one "___" (three underscores) for each of the 5-10 gaps, distributed naturally across the text (approx. 1 gap every 20-30 words).
   - The passage MUST be built entirely from the SOURCE_TEXT topic, vocabulary, and facts.
   - The "gaps" array MUST have the EXACT same count of items as there are "___" in the text (between 5 and 10), in the exact 1-to-1 sequential order!
   - Each item in "gaps" MUST have "correct" (the exact string to fill that blank) and "options" (an array of 3-4 plausible choices including "correct").
7. **CONVERSATION COMPLETION GAME (REGISTER, POLITENESS & PERSPECTIVE LAB)**:
   - Type: "conversation_completion"
   - Multi-character interactive dialogue among 2-4 distinct characters with distinct roles, perspectives, and personalities.
   - Include a "characters" array: [{ "name": "Sarah (Client)", "emoji": "👩💼", "role": "VP of Operations", "voice": "en-US-JennyNeural" }, ...]
   - Include a "turns" array: spoken context lines alternate with MISSING choice points.
   - **NON-NEGOTIABLE FLOW RULE — CHOICE POINTS INSIDE THE STORY, ONE AT A TIME**:
     - The dialogue MUST contain **at least 3 turns with "missing": true**.
     - The learner answers ONE choice point at a time: context lines play, then the FIRST choice point appears with its options, after the learner chooses, the story continues to the next context lines, then the NEXT choice point appears. **NEVER pile all choice points or all options at the end of the game.**
     - No more than 1 dialogue line may pass between two choice points, so the learner is never "stuck" on a turn with nothing to choose.
   - **NON-NEGOTIABLE OPTIONS PLACEMENT RULE — OPTIONS BELONG INSIDE THEIR OWN TURN**:
     - Every turn with "missing": true MUST contain its own nested "options" array of EXACTLY 4 items directly inside that turn object.
     - **STRICTLY FORBIDDEN**: putting options in a separate array at the end of the JSON, collecting all answers in one place, or leaving any missing turn without its own options. If a turn has no options, it must NOT be marked "missing".
     - All 4 options must be grammatically valid responses, but they MUST represent vastly different:
       - **Registers**: (Diplomatic & Collaborative, Overly Direct / Blunt, Passive-Aggressive, Condescending/Hostile).
       - **Politeness Levels**: (High / Courteous, Neutral, Low / Abrasive, Inappropriate / Disrespectful).
       - **Directness Levels**: (Tactful & Hedged, Direct & Constructive, Blunt, Aggressive).
       - **Perspectives & Stances**: (Win-Win / Risk Mitigation, Blame-Shifting, Biased / Inappropriate perspectives to teach workplace ethics and social appropriateness).
   - Each option in "options" MUST include:
     - "text": The spoken dialogue response (at the learner's CEFR level, simple and realistic).
     - "register": Description of tone & register.
     - "politeness": Politeness classification.
     - "directness": Directness classification.
     - "perspective": Underlying stance or bias.
     - "appropriateness": One of 'optimal', 'acceptable', 'poor', 'unacceptable'.
     - "score": Score points awarded (e.g. +25 for optimal, +12 for acceptable, +3 for poor, -15 for offensive/unacceptable).
     - "feedback": Detailed pedagogical explanation of why this register produces that interpersonal effect.
     - "reactions": An object mapping EVERY character's name (all characters from the "characters" array) to their specific emotional reaction:
       { "Sarah (Client)": { "emoji": "😊", "status": "Reassured (+25 pts)" }, "David (Lead Dev)": { "emoji": "👍", "status": "Agrees with rollout" } }
       (For negative/offensive options, use shocked/offended emojis like 😠, 😡, 🤬, 💀, 🤦♀️, 🚨 with appropriate reaction statuses). Every option MUST include a reaction for EVERY character.
   - The characters' emojis at the top of the dialogue change dynamically based on the student's choices.
8. **NO REPETITION**: Ensure that NO questions, words, or targeted concepts are repeated. Every activity must test a UNIQUE grammatical or vocabulary target.
9. **Content Source**: All vocabulary, grammar, and themes must come from the SOURCE_TEXT. Do not generate generic content unless the source text is insufficient.
10. **Personalization**: You must incorporate LEARNER_FACTS into the questions, scenarios, and examples.
11. **Output Format**: Return only valid JSON. No markdown formatting (like '''json), no conversational filler.
12. **Feedback Requirement — THE REVIEW MINI-LESSON (MANDATORY FOR EVERY ACTIVITY)**:
    Every single activity must include a "rich_feedback" object. This object powers the Review page, which is a **color-coded, premium, scrollable mini lesson**. It must TEACH the real linguistics used in the questions, not describe the activity. Follow this EXACT schema:
    {
      "language_focus": "what this activity taught — e.g. 'Vocabulary: travel & technology', 'Grammar: Past Continuous interrupted by Past Simple', 'Register: workplace diplomacy'. ONE short label.",
      "key_language": [
        { "term": "latency", "type": "vocabulary", "meaning": "the delay before data travels from one point to another", "form": "noun — 'high latency'" },
        { "term": "while + past continuous", "type": "grammar", "meaning": "we use it for a longer action in the past that was interrupted", "form": "while I was working, the internet went down" }
      ],
      "why_correct": "A detailed, level-appropriate explanation of exactly why the correct answer is right, using the meaning/rule taught above.",
      "why_wrong": [
        { "option": "The brightness of the screen", "reason": "Brightness is about light, not time. 'Latency' is a delay, so this option has nothing to do with the meaning." }
      ],
      "explanation": "The mini-lesson body: a rich, deep explanation (4-8 sentences at the learner's level) of ONLY the language point used in this activity. It must TEACH the content (the word / phrase / grammar structure and its meaning, form and use) — NEVER describe the questions, never meta-comment about the activity or what it tests (never phrases like 'These questions test your ability to find specific details in a text'). Write it in short labeled sections so the app can color-code them: start the lines with 'MEANING:', 'FORM:', 'USE:', and add 'PRONUNCIATION:', 'GRAMMAR:', 'EXAMPLE:', 'TIP:' or 'COMMON MISTAKE:' lines only when relevant.",
      "personalized_examples": [
        "As a photographer, you noticed **high latency** when you uploaded your photos to the cloud.",
        "While Sara was editing, her video call froze — the **latency** was too high.",
        "I could join the meeting because the hotel's **latency** was very low."
      ],
      "speaking_ccq": "One context-rich speaking concept-check question that FORCES the learner to use the new language, personalized with LEARNER_FACTS (e.g. 'Explain to a friend why your last video call was frozen using the word latency.').",
      "follow_ups": [
        "Tell me about a time technology failed you at work. Use 'while I was ...' to describe it.",
        "Your client wants fast uploads. Explain the problem using 'latency' and give one solution."
      ]
    }
    **HARD RULES FOR rich_feedback**:
    - "explanation" MUST start its lines with the labels MEANING: / FORM: / USE: (the app renders them as separate color-coded boxes) and MUST teach the real language from THIS activity only — it is STRICTLY FORBIDDEN to write meta sentences about the questions, about the activity type, or about what the test measures (e.g. "Multiple choice questions test your ability to find specific details"). Every question's needed context (sentence, phrase, definition, dialogue) must be embedded in the question itself so it never references "the text" or unseen material.
    - "key_language": Extract 2-4 real words/phrases or grammar structures from THIS activity's questions. NEVER leave it empty. Each entry must include "meaning", "form" and "use" so the learner reads them directly on the review page.
    - "why_wrong": ONE entry for EVERY incorrect option of the questions in this activity, each with a teaching reason (why it doesn't fit the meaning/rule). NEVER omit it.
    - "personalized_examples": EXACTLY 3 examples. **Every example MUST contain the new language (the terms from key_language) written inside double asterisks like **word** so the app can highlight it in a different color.** Every example MUST be written for the learner's life (job, city, interests from LEARNER_FACTS). NEVER write examples about answering questions.
    - "speaking_ccq" and "follow_ups": MUST force the learner to personally produce the new language (use the word, use the structure, explain the difference). NEVER ask generic questions like 'Did you like this activity?'.

--- SPECIFIC GAME REQUIREMENTS ---
- **Conversation Completion**: Provide "characters" array (2-4 characters with "name", "emoji", "role", "voice"), "situation", and "turns" array. Missing turns have "missing": true, "prompt", and their OWN nested "options" array (4 options) with register, politeness, directness, perspective, appropriateness, score, feedback, and dynamic character "reactions". At least 3 missing turns, spread through the dialogue — one at a time, NEVER all at the end.
- **Hot Seat**: Provide an array in "questions". Each element MUST be an object: { "question": "Grammar/Vocab challenge...", "checklist": ["Used correct tense", "Used target word", "Clear pronunciation"] }. Provide up to 20 questions in one block. Set "timer_seconds" to 300.
- **Multiple Choice**: Provide an array of 5 questions in "questions", each with "question", "options", "answer", "explanation", "phone_clue", "caller_name", and "caller_voice".
  - **OPTIONS & ANSWER RULES (NON-NEGOTIABLE)**: The app automatically displays the options as a., b., c., d. — so YOU must provide EXACTLY 4 options as PLAIN TEXT with NO letter or number prefixes (no "a.", "1)", "b ", "3-", etc.). The "answer" field MUST be the EXACT text of one of the options — identical characters, no letters, no numbers, no punctuation differences. This guarantees the correct answer always matches.
- **Would You Rather**: Provide an array of 5 questions in "questions", each with "scenario", "option_a", "option_b", "story_a", "story_b".
- **Cloze**: Strictly 5 to 10 gaps per game! Use "___" for each gap in "text_with_gaps" and match each gap sequentially 1-to-1 in "gaps" with "correct" and "options".
- **Scramble (Sentence Builder)**: Provide **EXACTLY 10 sentences** in the "sentences" array. Each sentence object: { "chunks": ["I called", "the hotel", "to change", "my booking"], "correct_sentence": "I called the hotel to change my booking" }.
  - **HARD RULES FOR SCRAMBLE (NON-NEGOTIABLE)**:
    - Every sentence MUST come from the SOURCE_TEXT (rephrased in simple, level-appropriate English is allowed, but the topic and vocabulary must come from the lesson).
    - **STRICTLY FORBIDDEN**: generic sentences like "The quick brown fox jumps over the lazy dog", filler sentences about nothing, or any sentence not connected to the lesson material. The app will NEVER add extra sentences for you — the 10 you provide are exactly what the learner sees.
    - Each sentence must contain 3-5 short chunks; "correct_sentence" must be the chunks joined with single spaces (no extra punctuation).
    - Sentences must feature the lesson's grammar (e.g. Past Continuous + while, conditionals, comparatives) and at least 4 of them must use the lesson's key vocabulary.
- **Taboo**: Generate an array of 5 cards in the "cards" property. Each card object must have "target_word" and "forbidden_words". All words must come from the SOURCE_TEXT.
- **Truth or Dare**: Generate an array of 5 truths in "truths" and 5 dares in "dares", all connected to the lesson topic and vocabulary.
- **Listening/Reading**: Include "visible_text" for reading or "audio_script" and "question" for listening.
  - Reading visible_text: 4-6 short sentences (60-110 words), 100% self-contained, simplified to the learner's level, from the lesson topic.
  - **Reading options follow the same rule as Multiple Choice**: EXACTLY 4 options, PLAIN TEXT with no letter/number prefixes, and "answer" is the EXACT text of the correct option. NEVER write "a. Keep your backpack..." + "answer": "Keep your backpack..." — write "options": ["Keep your backpack on your front", ...] with "answer": "Keep your backpack on your front". The app adds the a. b. c. d. labels itself.
  - Ensure all questions are 100% self-contained without referencing "the text" or "the video".

--- REQUIRED JSON SCHEMA (EXAMPLE) ---
{
"content": [
{
"type": "multiple_choice",
"timer_seconds": 90,
"questions": [
    {
        "question": "Read this sentence: 'The latency on the hotel network was so high that I couldn't join the stand-up meeting.' What does 'latency' mean in this context?",
        "options": ["The cost of the internet", "The delay in data transfer", "The brightness of the screen", "The password security"],
        "answer": "The delay in data transfer",
        "phone_clue": "Oh that's simple! Latency is the delay in data transfer. Go with that!",
        "caller_name": "Tech Wizard",
        "caller_voice": "en-US-GuyNeural"
    },
    {
        "question": "Which word is a synonym for 'intermittent' connection?",
        "options": ["Sporadic", "Constant", "High-speed", "Wired"],
        "answer": "Sporadic",
        "phone_clue": "Sporadic means happening at irregular intervals, exactly like intermittent!",
        "caller_name": "Professor Spark",
        "caller_voice": "en-US-JennyNeural"
    },
    {
        "question": "What is the primary function of a VPN when traveling?",
        "options": ["Encrypt internet traffic", "Speed up download rates", "Charge device batteries", "Store raw photographs"],
        "answer": "Encrypt internet traffic",
        "phone_clue": "A VPN definitely encrypts your internet traffic on public cafe networks!",
        "caller_name": "Sherlock",
        "caller_voice": "en-GB-RyanNeural"
    },
    {
        "question": "If your battery is completely drained, you need to find a:",
        "options": ["Power outlet", "Subway station", "Luggage scale", "Tourist map"],
        "answer": "Power outlet",
        "phone_clue": "Haha, look for a power outlet before your laptop shuts down!",
        "caller_name": "Aunt Lucy",
        "caller_voice": "en-US-AriaNeural"
    },
    {
        "question": "Which tense is used in: 'I had already deployed the fix before the server crashed'?",
        "options": ["Past Perfect", "Present Continuous", "Future Simple", "Past Continuous"],
        "answer": "Past Perfect",
        "phone_clue": "'Had deployed' is textbook Past Perfect tense for an action before another past event!",
        "caller_name": "Grammar Guru",
        "caller_voice": "en-US-GuyNeural"
    }
],
"rich_feedback": {
"language_focus": "Vocabulary: technology & travel / Grammar: Past Perfect",
"key_language": [
{ "term": "latency", "type": "vocabulary", "meaning": "the delay before data travels", "form": "high latency" },
{ "term": "Past Perfect (had + past participle)", "type": "grammar", "meaning": "a past action that happened before another past action", "form": "I had deployed the fix before the server crashed" }
],
"why_correct": "'Latency' is a noun for the delay before data starts to travel. On a hotel network, high latency means your video call freezes or lags — exactly why the stand-up meeting was impossible.",
"why_wrong": [
{ "option": "The cost of the internet", "reason": "Cost is about money, and latency is about time. Nothing in the sentence talks about price." },
{ "option": "The brightness of the screen", "reason": "Brightness is about light on the screen, not about data or connection speed." },
{ "option": "The password security", "reason": "Security is about protection, not delay. A network can be secure but still slow." }
],
"explanation": "Latency is the delay before data begins to travel from one device to another. When you make a video call, your words become data and travel to the other person. High latency means this travel is slow, so the other person sees you late and the call freezes. Low latency means the call feels instant. The Past Perfect is a past action that finished before another past action: 'I had deployed the fix before the server crashed' — first I deployed, then the server crashed. We use 'had' + past participle.",
"personalized_examples": [
"1. As a photographer, you noticed **high latency** when you uploaded your photos to the cloud.",
"2. Marco **had reserved** the meeting room before he arrived at the office.",
"3. My video call froze because the café's **latency** was terrible."
],
"speaking_ccq": "Explain to a friend why your last video call was frozen — use the word 'latency' in your answer.",
"follow_ups": [
"Tell me about a time technology failed you at work. Start with 'I had ... before ...' to describe it.",
"Your client complains about slow uploads. Explain the problem with 'latency' and give one solution."
]
}
},
{
"type": "would_you_rather",
"timer_seconds": 90,
"questions": [
    {
        "scenario": "When arriving in a new city as a remote worker, which would you do first?",
        "option_a": "Test the café Wi-Fi speed and set up your workstation",
        "option_b": "Drop your bags and explore the local historic center",
        "story_a": "prioritized finding an ultra-fast café with stable Wi-Fi to set up their remote workstation",
        "story_b": "dropped their bags immediately and wandered into the historic city center"
    },
    {
        "scenario": "How would you handle a critical project deadline while abroad?",
        "option_a": "Pull an all-nighter in a 24-hour coworking lounge",
        "option_b": "Wake up at 5:00 AM on a quiet sunrise balcony",
        "story_a": "powered through an intense all-nighter fueled by espresso in the coworking lounge",
        "story_b": "woke up at dawn to finish the deliverables on a peaceful sunrise terrace"
    }
],
"rich_feedback": {
"language_focus": "Speaking: comparing choices with 'would rather'",
"key_language": [
{ "term": "would rather", "type": "grammar", "meaning": "we use it to talk about a preference", "form": "I'd rather work from a quiet café" }
],
"why_correct": "There is no right or wrong answer here — the goal is to explain a preference using 'would rather' and give a reason.",
"why_wrong": [],
"explanation": "We use 'would rather' (+ base verb) to say what we prefer. 'Would you rather A or B?' asks for one choice. A strong answer gives the choice AND a reason with 'because'.",
"personalized_examples": [
"1. I'd rather work from a quiet library than a noisy coffee shop.",
"2. Would you rather travel light or pack backup hardware?",
"3. She'd rather schedule meetings in the morning to keep afternoons free."
],
"speaking_ccq": "I'd rather ________. Complete the sentence with your real preference and add one reason.",
"follow_ups": [
"Would you rather work from a beach or a mountain cabin? Give two reasons with 'because'.",
"Ask me one 'would you rather' question about your job."
]
}
},
{
"type": "taboo",
"cards": [
    { "target_word": "Drone", "forbidden_words": ["Fly", "Camera", "Sky", "Propeller", "Remote"] },
    { "target_word": "Passport", "forbidden_words": ["Travel", "Country", "Document", "Identity", "Border"] },
    { "target_word": "Luggage", "forbidden_words": ["Bag", "Suitcase", "Pack", "Clothes", "Carry"] },
    { "target_word": "Hotel", "forbidden_words": ["Stay", "Room", "Sleep", "Reception", "Book"] },
    { "target_word": "Beach", "forbidden_words": ["Sand", "Sea", "Ocean", "Sun", "Swim"] }
],
"timer_seconds": 300,
"rich_feedback": {
"language_focus": "Vocabulary: describing words without saying them",
"key_language": [
{ "term": "describe", "type": "vocabulary", "meaning": "to say what something is like", "form": "describe a word" }
],
"why_correct": "Taboo has no right or wrong answer — the goal is to describe the target word using synonyms.",
"why_wrong": [],
"explanation": "In Taboo you explain a word without using the forbidden words. Use simple synonyms, examples, and opposites: 'It is a machine that...' This builds fluency.",
"personalized_examples": [
"1. It's a small bag you carry on the plane — guide me to say 'carry-on'.",
"2. Describe your job without saying your job title.",
"3. Use two synonyms to explain 'fast'."
],
"speaking_ccq": "Describe your dream holiday destination without naming it.",
"follow_ups": [
"Describe your daily routine in 30 seconds without saying 'wake up'.",
"Give me three synonyms for 'important' and use each in a sentence."
]
}
},
{
"type": "truth_dare",
"truths": [
    "Have you ever missed a flight?",
    "What is the worst meal you've had abroad?",
    "Have you ever lied to get an upgrade?",
    "What is your biggest travel fear?",
    "Have you ever stolen a hotel towel?"
],
"dares": [
    "Act like a flight attendant demonstrating safety procedures.",
    "Speak with a fake accent for 1 minute.",
    "Pretend you lost your passport and beg for help.",
    "Describe your last meal using only adjectives.",
    "Sing a song about airplanes."
],
"timer_seconds": 0,
"rich_feedback": {
"language_focus": "Speaking fluency: past experiences & opinions",
"key_language": [
{ "term": "have you ever", "type": "grammar", "meaning": "we use it to ask about past experiences", "form": "Have you ever missed a flight?" }
],
"why_correct": "No right or wrong answer — the goal is fluency and natural answers.",
"why_wrong": [],
"explanation": "'Have you ever + past participle' asks about life experience. Answer with 'Yes, I have' or 'No, I haven't' + details.",
"personalized_examples": [
"1. Have you ever worked from a coworking space?",
"2. I've never missed a flight, but I almost did last year.",
"3. Have you ever forgotten your charger on a trip?"
],
"speaking_ccq": "Ask me 'Have you ever...' using your job.",
"follow_ups": [
"Use 'have you ever' to ask me three questions.",
"Tell me a funny travel story using past simple."
]
}
},
{
"type": "matching",
"pairs": [
{ "left": "Golden Hour", "right": "Best time for photography" },
{ "left": "Bandwidth", "right": "Data transfer capacity" },
{ "left": "Carry-on", "right": "Luggage you take on the plane" },
{ "left": "Itinerary", "right": "A plan of your journey" }
],
"timer_seconds": 60,
"rich_feedback": {
"language_focus": "Vocabulary: matching words with their meanings",
"key_language": [
{ "term": "itinerary", "type": "vocabulary", "meaning": "a plan of a journey", "form": "a travel itinerary" },
{ "term": "bandwidth", "type": "vocabulary", "meaning": "how much data can travel", "form": "not enough bandwidth" }
],
"why_correct": "Each left item pairs with its exact definition — e.g. 'itinerary' means a plan of the journey.",
"why_wrong": [],
"explanation": "These are real travel and technology terms from the lesson. An itinerary is your journey plan; bandwidth is data capacity; carry-on is hand luggage; golden hour is the beautiful light at sunrise or sunset.",
"personalized_examples": [
"1. I missed the golden hour because the bus was late.",
"2. This café doesn't have enough bandwidth for my upload.",
"3. I only travel with a carry-on to save time."
],
"speaking_ccq": "What is your favorite time of day to shoot photos?",
"follow_ups": [
"Use 'bandwidth' to complain about your internet.",
"Plan a mini itinerary for a weekend in your city."
]
}
},
{
"type": "scramble",
"sentences": [
{ "chunks": ["The internet", "went down", "while I was", "deploying the code"], "correct_sentence": "The internet went down while I was deploying the code" },
{ "chunks": ["My battery", "died", "while I was", "recording the video"], "correct_sentence": "My battery died while I was recording the video" },
{ "chunks": ["It started raining", "while we", "were waiting", "for the ferry"], "correct_sentence": "It started raining while we were waiting for the ferry" },
{ "chunks": ["My boss called", "while I", "was eating", "souvlaki"], "correct_sentence": "My boss called while I was eating souvlaki" },
{ "chunks": ["I had finished", "the presentation", "before the meeting", "started"], "correct_sentence": "I had finished the presentation before the meeting started" },
{ "chunks": ["She had booked", "the hotel", "before she", "boarded the plane"], "correct_sentence": "She had booked the hotel before she boarded the plane" },
{ "chunks": ["We will connect", "to the Wi-Fi", "as soon as", "we arrive"], "correct_sentence": "We will connect to the Wi-Fi as soon as we arrive" },
{ "chunks": ["The café", "was crowded", "so I", "worked from home"], "correct_sentence": "The café was crowded so I worked from home" },
{ "chunks": ["He had never", "used a VPN", "before the", "business trip"], "correct_sentence": "He had never used a VPN before the business trip" },
{ "chunks": ["While I", "was uploading photos", "the internet", "got slower"], "correct_sentence": "While I was uploading photos the internet got slower" }
],
"timer_seconds": 60,
"rich_feedback": {
"language_focus": "Grammar: Past Continuous + while, interrupted by Past Simple",
"key_language": [
{ "term": "while + Past Continuous", "type": "grammar", "meaning": "a longer action in the past that was interrupted", "form": "while I was deploying the code" }
],
"why_correct": "We use 'while' + past continuous for the background action ('was deploying') and past simple for the interruption ('went down').",
"why_wrong": [],
"explanation": "The Past Continuous is 'was/were + verb-ing'. We use it for the longer action. The Past Simple is the short action that interrupts. We join them with 'while'.",
"personalized_examples": [
"1. The battery died while I was recording the video.",
"2. My boss called while I was eating souvlaki.",
"3. It started raining while I was waiting for the ferry."
],
"speaking_ccq": "Has technology ever failed you at a critical moment? Use 'while I was ...'.",
"follow_ups": [
"Tell me what happened while you were working yesterday. Use 'while'.",
"Ask a partner: 'What were you doing when...?'"
]
}
},
{
"type": "cloze",
"text_with_gaps": "When I finally ___ in Santorini, the view was breathtaking. However, I immediately had an urgent problem. My ___ was completely dead because I forgot to charge it overnight. As a ___ nomad, being disconnected in a foreign city is extremely stressful. I sat at an outdoor cafe, ordered a cold ___ coffee, and asked the waiter if they had an available power outlet. Fortunately, an electronics shop next door sold a high-capacity ___ bank that saved the entire day, allowing me to upload my latest ___ gallery.",
"gaps": [
{ "correct": "arrived", "options": ["arrived", "left", "departed", "flew"] },
{ "correct": "phone", "options": ["phone", "passport", "ticket", "suitcase"] },
{ "correct": "digital", "options": ["digital", "careless", "reluctant", "local"] },
{ "correct": "iced", "options": ["iced", "boiling", "dry", "salted"] },
{ "correct": "power", "options": ["power", "money", "food", "water"] },
{ "correct": "photo", "options": ["photo", "code", "invoice", "flight"] }
],
"timer_seconds": 90,
"rich_feedback": {
"language_focus": "Vocabulary: travel & technology nouns / narrative past",
"key_language": [
{ "term": "digital nomad", "type": "vocabulary", "meaning": "a person who works remotely while traveling", "form": "a digital nomad" },
{ "term": "power bank", "type": "vocabulary", "meaning": "a portable battery charger", "form": "a high-capacity power bank" }
],
"why_correct": "Each gap needs the exact word: 'arrived' for reaching the island, 'phone' for the dead device, 'digital' for the remote worker, 'power' for the portable charger.",
"why_wrong": [
{ "option": "departed", "reason": "'Departed' means left, but the story is about arriving on the island." },
{ "option": "flew", "reason": "You fly before you arrive; 'arrived' matches the moment you reach the destination." }
],
"explanation": "A digital nomad works remotely and travels. A power bank is a portable battery. The story uses narrative past tenses: 'arrived', 'sold'.",
"personalized_examples": [
"1. As a digital nomad, you need reliable power.",
"2. I always carry a power bank for my camera.",
"3. Have you ever arrived without a hotel booking?"
],
"speaking_ccq": "What is the first thing you look for when you enter a café to work?",
"follow_ups": [
"Describe your perfect digital-nomad day using three new words.",
"Tell me about a time your phone died at the worst moment."
]
}
},
{
"type": "conversation_completion",
"title": "High-Stakes Client Release Deadline Negotiation",
"situation": "A client meeting discussing emergency deployment timelines and system safety.",
"timer_seconds": 180,
"characters": [
    { "name": "Sarah (Client)", "emoji": "👩💼", "role": "VP of Operations", "voice": "en-US-JennyNeural" },
    { "name": "David (Lead Dev)", "emoji": "👨💻", "role": "Senior Architect", "voice": "en-US-GuyNeural" },
    { "name": "Elena (Project Mgr)", "emoji": "👩🏫", "role": "Scrum Master", "voice": "en-US-AriaNeural" }
],
"turns": [
    {
        "speaker": "Sarah (Client)",
        "text": "We need the complete payment gateway and user migration pushed to production by Friday at 9 AM, or our European launch will fail.",
        "voice": "en-US-JennyNeural"
    },
    {
        "speaker": "David (Lead Dev)",
        "text": "Friday morning is extremely risky. We haven't run security penetration tests on the new gateway endpoints yet.",
        "voice": "en-US-GuyNeural"
    },
    {
        "speaker": "You (Project Lead)",
        "missing": true,
        "prompt": "How should you respond to balance client urgency with technical security?",
        "options": [
            {
                "text": "I completely understand the high stakes for the European launch, Sarah. To protect user payments without delaying marketing, we can deploy the frontend on Friday morning and stage the payment switchover for Friday midnight after a live dry-run. Let's agree on this mitigation plan.",
                "register": "Diplomatic & Solution-Focused",
                "politeness": "High (Courteous & Constructive)",
                "directness": "Balanced & Collaborative",
                "perspective": "Win-Win / Risk Mitigation",
                "appropriateness": "optimal",
                "score": 25,
                "feedback": "Outstanding register! Validates client urgency while establishing clear technical safety boundaries with an actionable compromise.",
                "reactions": {
                    "Sarah (Client)": { "emoji": "😊", "status": "Reassured (+25 pts)" },
                    "David (Lead Dev)": { "emoji": "👍", "status": "Relieved & Supportive" },
                    "Elena (Project Mgr)": { "emoji": "👏", "status": "Impressed by diplomacy" }
                }
            },
            {
                "text": "That is completely impossible. David is right, and if we launch Friday your users will get billed twice. We are moving the date to next Wednesday.",
                "register": "Blunt & Confrontational",
                "politeness": "Low (Abrasive)",
                "directness": "Extremely Direct",
                "perspective": "Unilateral Refusal",
                "appropriateness": "acceptable",
                "score": 12,
                "feedback": "Factually protective of system stability, but the dismissive tone antagonizes the client and damages partnership trust.",
                "reactions": {
                    "Sarah (Client)": { "emoji": "😠", "status": "Offended (+12 pts)" },
                    "David (Lead Dev)": { "emoji": "😬", "status": "Nervous about tension" },
                    "Elena (Project Mgr)": { "emoji": "🤦♀️", "status": "Cringing at tact" }
                }
            },
            {
                "text": "Well, if your executive committee hadn't delayed budget approval by three weeks, we wouldn't have this emergency. You always create artificial panic.",
                "register": "Passive-Aggressive & Accusatory",
                "politeness": "Inappropriate / Hostile",
                "directness": "Aggressive Deflection",
                "perspective": "Blame-shifting",
                "appropriateness": "poor",
                "score": 3,
                "feedback": "Severely unprofessional. Blaming the client destroys trust and escalates tension rather than solving the operational problem.",
                "reactions": {
                    "Sarah (Client)": { "emoji": "😡", "status": "Furious (+3 pts)" },
                    "David (Lead Dev)": { "emoji": "😰", "status": "Mortified" },
                    "Elena (Project Mgr)": { "emoji": "🛑", "status": "Intervening immediately" }
                }
            },
            {
                "text": "Typical emotional management panic. Don't worry about technical architecture Sarah; let the engineers handle it.",
                "register": "Condescending",
                "politeness": "Offensive / Discriminatory",
                "directness": "Hostile Demeaning",
                "perspective": "Condescending Bias",
                "appropriateness": "unacceptable",
                "score": -15,
                "feedback": "Severe violation of workplace ethics and basic respect. Demonstrates blatant condescension that results in immediate disciplinary action.",
                "reactions": {
                    "Sarah (Client)": { "emoji": "🤬", "status": "Outraged (-15 pts)!" },
                    "David (Lead Dev)": { "emoji": "💀", "status": "Horrified" },
                    "Elena (Project Mgr)": { "emoji": "🚨", "status": "Filing HR Complaint" }
                }
            }
        ]
    },
    {
        "speaker": "Sarah (Client)",
        "text": "Thank you for finding a realistic path forward. Let's communicate this timeline to the regional stakeholders right away.",
        "voice": "en-US-JennyNeural"
    }
],
"rich_feedback": {
"language_focus": "Register: diplomatic hedging, directness & politeness",
"key_language": [
{ "term": "hedging", "type": "vocabulary", "meaning": "softening a statement to be polite", "form": "We could consider..." },
{ "term": "compromise", "type": "vocabulary", "meaning": "an agreement where both sides give a little", "form": "a realistic compromise" }
],
"why_correct": "The optimal answer validates feelings AND proposes a concrete solution. It uses hedging ('we can'), collaboration ('let's'), and safety boundaries.",
"why_wrong": [
{ "option": "That is completely impossible...", "reason": "It is factually protective but dismissive and unilateral — it refuses instead of negotiating." },
{ "option": "Well, if your executive committee hadn't...", "reason": "It blames the client and reopens old conflict instead of solving today's problem." },
{ "option": "Typical emotional management panic...", "reason": "It demeans the client and shows total disrespect. This destroys trust completely." }
],
"explanation": "Diplomatic language keeps relationships healthy: validate the other side's goals, hedge your statements ('we can'), offer a compromise, and protect safety. Register is the tone level — formal, neutral, or casual — and politeness is how much respect you show.",
"personalized_examples": [
"1. Diplomatic: 'We want to support your timeline while ensuring zero downtime.'",
"2. Direct but polite: 'To guarantee data integrity, we need 24 additional testing hours.'",
"3. Solution-focused: 'Here is a phased deployment plan that satisfies both criteria.'"
],
"speaking_ccq": "How do you maintain firm professional boundaries without sounding dismissive?",
"follow_ups": [
"Your client wants an impossible deadline. Say no politely in one sentence using 'while'.",
"Use 'compromise' to describe a deal you made recently."
]
}
},
{
"type": "reading_activity",
"visible_text": "Monastiraki Square is a vibrant area in Athens known for its flea market. For photographers, it offers excellent street photography opportunities, especially on Sundays when the market is full of antiques. Be careful with your expensive gear, though. The narrow streets are crowded, and pickpockets target tourists who are distracted by their phones or cameras. Always keep your backpack on your front.",
"question": "What is the recommended safety precaution for carrying valuables in crowded marketplaces?",
"options": [
"Avoid the market on Sundays",
"Keep your backpack on your front",
"Do not take photos of people",
"Leave your camera at the hotel"
],
"answer": "Keep your backpack on your front",
"timer_seconds": 120,
"rich_feedback": {
"language_focus": "Reading: safety vocabulary in crowded places",
"key_language": [
{ "term": "pickpocket", "type": "vocabulary", "meaning": "a person who steals from pockets in crowds", "form": "pickpockets target tourists" },
{ "term": "distracted", "type": "vocabulary", "meaning": "not paying attention", "form": "distracted by phones" }
],
"why_correct": "The text says pickpockets target distracted tourists, so the safety advice is to keep the backpack on the front — then nobody can open it unseen.",
"why_wrong": [
{ "option": "Do not take photos of people", "reason": "The text does not forbid photos — it warns about distraction, not about photographing people." },
{ "option": "Leave your camera at the hotel", "reason": "The text never says to leave gear at home; it says to keep it safe in crowds." }
],
"explanation": "Reading for detail: find the sentence that gives advice. The text warns about pickpockets and distraction, then gives one clear instruction: 'Always keep your backpack on your front.'",
"personalized_examples": [
"1. When I shoot street photography, I keep my camera strap across my body.",
"2. Tourists with expensive DSLRs are often targets for pickpockets.",
"3. In crowded markets, I never check my phone while walking."
],
"speaking_ccq": "What do you do to protect your phone in a crowded place?",
"follow_ups": [
"Describe a busy market in your city using 'crowded' and 'distracted'.",
"Explain to a tourist one safety rule for a crowded place."
]
}
}
]
}
`;
};