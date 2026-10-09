import { MOCK_AVATAR_LESSON_V1, MOCK_AVATAR_LESSON_V2 } from './avatarLessonMocks';
import { MOCK_V3_SAMPLE_JSON } from '../utils/mockV3SampleData';

export const MOCK_JSON_DATA: Record<string, string> = {
  avatarLesson: JSON.stringify(MOCK_AVATAR_LESSON_V1, null, 2),
  avatarLessonV2: JSON.stringify(MOCK_AVATAR_LESSON_V2, null, 2),
  englishLesson: JSON.stringify({
    // Detailed Table of Contents — powers the Lesson Settings media AI prompt (targets the exact
    // section + knows what it covers) and the Learner Path log with precise per-section coverage.
    tableOfContents: [
      { section: 1, title: "📚 Section 1: Vocabulary & Reading", overview: "Climate change vocabulary in context (ecosystem, fossil fuels, renewable energy, carbon footprint, biodiversity) with a reading passage and matching practice so learners meet and use the words in real sentences.", skills: ["vocabulary", "reading"], activityHighlights: ["reading passage", "vocabulary table", "matching game", "comprehension questions"] },
      { section: 2, title: "✍️ Section 2: Grammar & Error Correction", overview: "Present perfect (have/has + past participle) for experiences and recent change, taught through grammar boxes, sentence correction drills and fill-the-gap practice tied to the climate topic.", skills: ["grammar", "writing"], activityHighlights: ["grammar explanation", "error correction", "gap-fill"] },
      { section: 3, title: "🎯 Section 3: Interactive Games & Speaking", overview: "Cooperative speaking and game play: quiz challenges, discussion prompts and a team game that push learners to argue, persuade and summarise opinions about climate solutions.", skills: ["speaking", "listening"], activityHighlights: ["quiz battle", "discussion cards", "team debate game"] },
      { section: 4, title: "📝 Section 4: Listening, Writing & Review", overview: "An authentic listening task about daily green habits, followed by a guided paragraph writing task and a final review + flashcards so learners consolidate the unit's vocabulary and grammar.", skills: ["listening", "writing"], activityHighlights: ["listening comprehension", "essay writing", "review flashcards"] }
    ],
    sections: [
      {
        title: "📚 Section 1: Vocabulary & Reading",
        summary: "Builds climate-change vocabulary through a reading passage, vocabulary table, matching game and comprehension check.",
        color: "#4A90E2",
        studyTime: "20 mins",
        xpReward: 100,
        activities: [
          {
            title: "📖 Reading Text",
            type: "paragraph",
            content: "<p>Climate change is one of the most pressing issues of our time. Rising global temperatures have led to melting polar ice caps, more frequent extreme weather events, and shifting ecosystems. Scientists agree that human activity, particularly the burning of fossil fuels, is the primary driver of these changes.</p>",
            comprehensiveFeedback: "<b>Key takeaway:</b> Human activity drives climate change."
          },
          {
            title: "📊 Vocabulary Table",
            type: "vocabulary_table",
            content: JSON.stringify([
              { word: "Ecosystem", translation: "النظام البيئي", definition: "A community of interacting organisms and their environment.", example: "Coral reefs are a fragile ecosystem.", ccq: "Can a pond be an ecosystem?" },
              { word: "Fossil fuel", translation: "الوقود الأحفوري", definition: "Natural fuel formed from remains of living organisms.", example: "Coal and oil are fossil fuels.", ccq: "Is wood a fossil fuel?" }
            ]),
            comprehensiveFeedback: "<b>Ecosystem</b> comes from Greek 'oikos' (house)."
          },
          {
            title: "🔗 Matching Game",
            type: "matching",
            content: JSON.stringify([
              { left: "Carbon footprint", right: "Total greenhouse gases caused by an individual." },
              { left: "Renewable", right: "Energy from a source not depleted by use." },
              { left: "Biodiversity", right: "Variety of life in the world or a habitat." }
            ]),
            comprehensiveFeedback: "All matched correctly!"
          },
          {
            title: "🧠 Check Your Understanding",
            type: "questions",
            content: "What is the primary driver of climate change?\nHuman activity, especially burning fossil fuels.\nWhy are coral reefs mentioned?\nAs an example of a fragile ecosystem."
          }
        ]
      },
      {
        title: "✍️ Section 2: Grammar & Error Correction",
        color: "#E24A7D",
        studyTime: "25 mins",
        xpReward: 150,
        activities: [
          {
            title: "📖 Grammar Box: Present Perfect",
            type: "grammar_explanation",
            content: JSON.stringify({
              explanation: "The present perfect connects the past to the present. Form: have/has + past participle. Use for: life experiences, recent changes, unfinished actions.",
              examples: ["Scientists have warned about climate change.", "The ice caps have melted significantly.", "We have seen more storms this year."],
              ccqs: [
                { q: "Which tense connects past to present?", a: "Present perfect." },
                { q: "What is the form of present perfect?", a: "have/has + past participle." }
              ]
            }),
            comprehensiveFeedback: "Present perfect = have/has + past participle."
          },
          {
            title: "🧩 Gap Fill Exercise",
            type: "gap_fill",
            content: JSON.stringify({
              sentences: [
                { text: "The Earth's temperature has ______ (rise) by 1.2°C.", correctAnswer: "risen" },
                { text: "Many species have already ______ (disappear).", correctAnswer: "disappeared" }
              ]
            }),
            comprehensiveFeedback: "Risen is the past participle of rise."
          },
          {
            title: "🔍 Find the Mistake",
            type: "error_correction",
            content: JSON.stringify({
              sentences: [
                { sentence: "She have been studying English for 5 years.", error: "have", correction: "has", correctSentence: "She has been studying English for 5 years.", explanation: "Third person singular uses 'has', not 'have'." },
                { sentence: "They has already finished the project.", error: "has", correction: "have", correctSentence: "They have already finished the project.", explanation: "Third person plural uses 'have'." }
              ]
            }),
            comprehensiveFeedback: "Check subject-verb agreement."
          },
          {
            title: "🔀 Unscramble",
            type: "scramble",
            content: JSON.stringify({
              sentences: [
                { sentence: "We | must | reduce | our | carbon | footprint", hint: "Start with 'We'" },
                { sentence: "Renewable | energy | is | the | future", hint: "Subject first" }
              ]
            }),
            comprehensiveFeedback: "Great sentence structure!"
          }
        ]
      },
      {
        title: "🎯 Section 3: Interactive Games & Speaking",
        color: "#F5A623",
        studyTime: "25 mins",
        xpReward: 200,
        activities: [
          {
            title: "⚡ Flashcards",
            type: "flashcard",
            content: JSON.stringify({
              cards: [
                { front: "Sustainable", back: "Able to be maintained at a certain rate." },
                { front: "Emission", back: "The production and discharge of gases." },
                { front: "Conservation", back: "Prevention of wasteful use of resources." }
              ]
            }),
            comprehensiveFeedback: "Great vocabulary building!"
          },
          {
            title: "🗂️ Sorting Game",
            type: "sorting",
            content: JSON.stringify({
              categories: ["Renewable Energy", "Fossil Fuels"],
              items: [
                { text: "Solar Power", category: "Renewable Energy" },
                { text: "Coal", category: "Fossil Fuels" },
                { text: "Wind Energy", category: "Renewable Energy" },
                { text: "Natural Gas", category: "Fossil Fuels" }
              ]
            }),
            comprehensiveFeedback: "Correctly sorted!"
          },
          {
            title: "⌨️ Typing Speed",
            type: "typing_speed",
            content: JSON.stringify({
              text: "Climate change is a global challenge that requires immediate action from all nations."
            }),
            comprehensiveFeedback: "Type accurately and quickly!"
          },
          {
            title: "🎲 Speaking Game — 12 Mixed Cards",
            type: "speaking_game",
            content: JSON.stringify({
              game: "Speaking Game",
              rounds: [
                { type: "would_you_rather", question: "Would you rather live in a fully sustainable small house OR a large wasteful house?" },
                { type: "would_you_rather", question: "Would you rather give up cars OR give up air travel to fight climate change?" },
                { type: "would_you_rather", question: "Would you rather eat only local food OR only seasonal food for a year?" },
                { type: "would_you_rather", question: "Would you rather live in a forest OR on a beach to help the environment?" },
                { type: "two_truths_one_lie", prompt: "Share two truths and one lie about your recycling habits." },
                { type: "two_truths_one_lie", prompt: "Share two truths and one lie about how you save energy." },
                { type: "two_truths_one_lie", prompt: "Share two truths and one lie about your daily water usage." },
                { type: "two_truths_one_lie", prompt: "Share two truths and one lie about wildlife you have seen." },
                { type: "truth", question: "What is one thing you do daily to help the environment?" },
                { type: "dare", prompt: "Name three ways to reduce plastic waste in 15 seconds!" },
                { type: "truth", question: "Have you ever participated in an environmental protest or cleanup?" },
                { type: "dare", prompt: "Act out how you would convince a friend to recycle using only hand gestures!" }
              ]
            }),
            comprehensiveFeedback: "Fun speaking practice — no XP awarded for card flips!"
          },
          {
            title: "🗣️ Pronunciation — Say It Right",
            type: "pronunciation_check",
            content: JSON.stringify({
              words: [
                { word: "Environment", phonetic: "/ɪnˈvaɪrənmənt/", example: "We must protect the environment." },
                { word: "Pollution", phonetic: "/pəˈluːʃən/", example: "Air pollution is a serious problem." },
                { word: "Temperature", phonetic: "/ˈtemprətʃər/", example: "The temperature is rising." }
              ]
            }),
            comprehensiveFeedback: "Practice these words aloud!"
          },
          {
            title: "💡 Topic Preview",
            type: "questions",
            content: "<b>Think about:</b>\nWhat do you already know about climate change?\nWhy is this topic important to you?\nWhat would you like to learn today?"
          }
        ]
      },
      {
        title: "📝 Section 4: Listening, Writing & Review",
        color: "#7B61FF",
        studyTime: "20 mins",
        xpReward: 150,
        activities: [
          {
            title: "🎧 Listening Script — 5-Character Panel Discussion",
            type: "listening_script",
            content: "Listen to this multi-character discussion featuring 5 distinct speakers. Each tag is read by a different Microsoft Azure Natural voice:\n\n[male1]Alexander: Welcome everyone to today's panel on sustainable energy solutions. Let's hear from Dr. Sophia first!\n\n[female1]Sophia: Thank you Alexander! Photovoltaic solar efficiency has doubled over recent years, powering millions of sustainable homes.\n\n[male2]Liam: Brilliant points Sophia! In the UK, offshore wind energy is breaking clean power generation records every single month.\n\n[female2]Emma: Having traveled across Asia, I've witnessed high-capacity battery storage hubs grid-balancing entire cities seamlessly!\n\n[child1]Leo: Hey everyone! At my school science fair, we built mini solar water heaters and they actually boiled water! It was super cool!\n\n[male1]Alexander: That sounds incredible, Leo! What was the most exciting part of that hands-on experiment?\n\n[child1]Leo: Seeing how powerful the sun is without needing any dirty fossil fuels!\n\n[female1]Sophia: Inspiring work, Leo. Connecting hands-on science with environmental stewardship builds lifelong curiosity.\n\n[female2]Emma: Absolutely! When young learners like Leo get involved, whole communities get inspired to go green."
          },
          {
            title: "❓ Listening Check — Panel Discussion",
            type: "questions",
            content: "1. Who opens the sustainable energy panel discussion?\n2. What key advance in solar energy does Dr. Sophia emphasize?\n3. Which renewable energy source does Liam highlight in the UK?\n4. What did young Leo construct for his school science fair?\n5. Why does Emma believe Leo's school project is so impactful?",
            comprehensiveFeedback: "1. Alexander welcomes everyone. 2. Photovoltaic solar efficiency has doubled. 3. Offshore wind energy in the UK. 4. Mini solar water heaters. 5. Whole communities get inspired to go green."
          },
          {
            title: "🗂️ Multiple Choice Quiz",
            type: "list",
            content: "<b>Choose the correct answer:</b>\n1. What does 'sustainable' mean?\n   a) Able to continue over time  b) Quick and efficient  c) Expensive\n2. Which is a renewable energy source?\n   a) Coal  b) Solar  c) Oil"
          },
          {
            title: "🔊 Shadowing — Repeat After Me",
            type: "paragraph",
            content: "<p><b>Listen and repeat:</b> 'Climate change is affecting every continent on Earth. The polar ice caps are melting at an alarming rate. We must take action now to reduce our carbon footprint.'</p>",
            comprehensiveFeedback: "Focus on intonation and rhythm!"
          },
          {
            title: "✅ True/False — Reading Check",
            type: "list",
            content: "<b>True or False?</b>\n1. Climate change is caused only by natural factors. (False)\n2. Renewable energy comes from sources that can be depleted. (False)\n3. The burning of fossil fuels contributes to global warming. (True)"
          },
          {
            title: "🎯 Word Stress — Which syllable?",
            type: "list",
            content: "<b>Identify the stressed syllable:</b>\n1. EC-o-sys-tem (1st) vs e-co-SYS-tem (Wrong)\n2. EN-vi-ron-ment (1st) vs en-VI-ron-ment (2nd) vs en-vi-RON-ment (3rd)"
          },
          {
            title: "🎯 Sentence Stress — Key Words",
            type: "questions",
            content: "<b>Which words carry the main stress?</b>\nRead: 'Global WARMing is a GLOB-al CRIS-is.'\nThe stressed words carry the meaning."
          },
          {
            title: "🎯 Minimal Pairs — /iː/ vs /ɪ/",
            type: "pronunciation_check",
            content: JSON.stringify({
              words: [
                { word: "Heat", phonetic: "/hiːt/", example: "The heat from the sun is increasing." },
                { word: "Hit", phonetic: "/hɪt/", example: "The storm will hit the coast." },
                { word: "Beach", phonetic: "/biːtʃ/", example: "Pollution affects the beach." },
                { word: "Bitch", phonetic: "/bɪtʃ/", example: "Minimal pair practice." }
              ]
            }),
            comprehensiveFeedback: "Notice the difference between long /iː/ and short /ɪ/!"
          },
          {
            title: "💬 Final Review & Discussion",
            type: "questions",
            content: "<b>Group Discussion:</b>\nWhat is the biggest environmental challenge in your country?\nHow can technology help solve climate change?\nWhat personal changes will you make after this lesson?"
          }
        ]
      }
    ]
  }, null, 2),

  englishLessonV2: JSON.stringify({
    sections: [
      {
        title: "📚 Phase 1 — Study: Digital Communication",
        color: "#f59e0b",
        studyTime: "15 minutes",
        xpReward: 100,
        mode: "prepare",
        difficulty: "easy",
        tags: ["study", "vocabulary"],
        activities: [
          {
            type: "flashcard",
            title: "💡 Key Vocabulary",
            content: JSON.stringify({cards: [{front: "Professional", back: "Relating to a job that needs special education or training."}, {front: "Etiquette", back: "The rules of polite or correct behavior."}, {front: "Boundary", back: "A limit that defines acceptable behavior."}, {front: "Concise", back: "Giving a lot of information clearly in a few words."}]}),
            catComment: "Great words to know! 😺",
            comprehensiveFeedback: "<b>Flashcard Review:</b> Practice these words daily."
          },
          {
            type: "vocab_table",
            title: "📊 Vocabulary Deep Dive",
            content: JSON.stringify({words: [{word: "Professional", ipa: "/prəˈfeʃ.ən.əl/", definition: "Relating to a job requiring specialized education.", example: "She has a very professional attitude at work."}, {word: "Etiquette", ipa: "/ˈet.ɪ.ket/", definition: "Rules of polite behavior in society or in a group.", example: "Email etiquette is important in business."}]}),
            catComment: "Knowing the IPA helps with pronunciation! 🎯",
            comprehensiveFeedback: "<b>Study Notes:</b> Focus on the stressed syllables."
          },
          {
            type: "matching",
            title: "🔗 Match the Terms",
            content: JSON.stringify({pairs: [{left: "Networking", right: "Building professional relationships."}, {left: "Follow-up", right: "A message sent after a meeting or interview."}, {left: "Deadline", right: "The latest time by which something should be completed."}]}),
            catComment: "Matching helps memory! 🧠",
            comprehensiveFeedback: "All terms matched correctly."
          },
          {
            type: "multiple_choice",
            title: "✅ Quick Quiz",
            content: JSON.stringify({questions: [{question: "What does 'concise' mean?", options: ["Giving a lot of information clearly in few words", "Talking for a long time", "Being very formal"], answer: "Giving a lot of information clearly in few words"}, {question: "Which is an example of good email etiquette?", options: ["Using ALL CAPS", "Starting with a greeting", "Sending without a subject line"], answer: "Starting with a greeting"}]}),
            catComment: "You're doing great! 🌟",
            comprehensiveFeedback: "<b>Quiz Results:</b> Review any wrong answers."
          },
          {
            type: "gap_fill",
            title: "✍️ Complete the Sentences",
            content: JSON.stringify({sentences: [{text: "It's important to maintain a ___ relationship with your colleagues.", answer: "professional"}, {text: "Always send a ___ email after a job interview.", answer: "follow-up"}]}),
            catComment: "Fill in the blanks like a pro! 💪",
            comprehensiveFeedback: "Check your spelling carefully!"
          }
        ]
      },
      {
        title: "🗣️ Phase 2 — Speak: Real Conversations",
        color: "#8b5cf6",
        studyTime: "20 minutes",
        xpReward: 150,
        mode: "produce",
        difficulty: "medium",
        tags: ["speaking", "roleplay", "discussion"],
        activities: [
          {
            type: "speaking_game",
            title: "💬 Discussion Prompts",
            content: JSON.stringify({prompts: ["How do you prefer to communicate at work — email, phone, or in-person? Why?", "Describe a time when you had to give difficult feedback to a colleague.", "What is the biggest challenge of working remotely?", "Do you think emojis are appropriate in professional emails? Why or why not?"]}),
            catComment: "Share your thoughts! 🗣️",
            comprehensiveFeedback: "Great discussion! Try to use the vocabulary words in your answers."
          },
          {
            type: "shadowing",
            title: "🔊 Shadowing — Professional Phrases",
            content: JSON.stringify({sentences: [{text: "Thank you for your prompt response to my inquiry."}, {text: "I would like to schedule a meeting to discuss the project timeline."}, {text: "Please find attached the updated proposal for your review."}, {text: "I appreciate your flexibility in accommodating my schedule."}]}),
            catComment: "Repeat after the audio! 🎤",
            comprehensiveFeedback: "Focus on intonation and rhythm — not just pronunciation."
          },
          {
            type: "information_gap",
            title: "🔄 Roleplay: Job Interview",
            content: JSON.stringify({sideA: "<b>Interviewer:</b> Ask about the candidate's experience, skills, and career goals.", sideB: "<b>Candidate:</b> Introduce yourself, describe your background, and explain why you want the job.", questions: ["What experience do you have?", "Why do you want this job?", "What are your strengths?"]}),
            catComment: "Roleplay helps build confidence! 🎭",
            comprehensiveFeedback: "Use professional vocabulary and maintain eye contact."
          },
          {
            type: "debate",
            title: "⚖️ Debate: Remote Work vs Office Work",
            content: JSON.stringify({statement: "Working from the office is better than working remotely.", forArguments: ["Better collaboration and team bonding.", "Clear separation between work and home life.", "More opportunities for mentorship."], againstArguments: ["More flexibility and work-life balance.", "No commuting saves time and money.", "Can focus better without office distractions."], timeLimitSeconds: 180}),
            catComment: "Pick a side and argue your point! 🎯",
            comprehensiveFeedback: "Use transition phrases like 'On the one hand...' and 'However...'"
          },
          {
            type: "one_minute_challenge",
            title: "⏱️ One-Minute Talk",
            content: JSON.stringify({topic: "Describe your ideal work environment in one minute.", timeLimitSeconds: 60}),
            catComment: "Talk for 60 seconds without stopping! ⏰",
            comprehensiveFeedback: "Try to include at least 3 vocabulary words from this lesson."
          },
          {
            type: "taboo",
            title: "🚫 Taboo — Professional Communication",
            content: JSON.stringify({cards: [{word: "EMAIL", tabooWords: ["message", "send", "inbox", "write"]}, {word: "MEETING", tabooWords: ["talk", "discuss", "office", "group"]}, {word: "DEADLINE", tabooWords: ["time", "due", "finish", "date"]}]}),
            catComment: "Describe the word without saying the taboo words! 🎮",
            comprehensiveFeedback: "Great vocabulary recall!"
          },
          {
            type: "error_correction",
            title: "🔍 Fix the Mistakes",
            content: JSON.stringify({sentences: [{text: "He go to the meeting yesterday.", errorWord: "go", correction: "went", explanation: "Use past tense 'went' for completed actions."}, {text: "I have saw the email this morning.", errorWord: "saw", correction: "seen", explanation: "After 'have', use the past participle 'seen'."}, {text: "She don't like working late.", errorWord: "don't", correction: "doesn't", explanation: "Third person singular uses 'doesn't'."}]}),
            catComment: "Find the error and fix it! 🔧",
            comprehensiveFeedback: "Review subject-verb agreement rules."
          },
          {
            type: "sequence_ordering",
            title: "📋 Order the Steps — Job Application",
            content: JSON.stringify({items: ["Submit your application", "Prepare for the interview", "Send a thank-you note after the interview", "Research the company", "Update your resume", "Receive the job offer"], correctOrder: [3, 0, 4, 1, 2, 5]}),
            catComment: "Put the steps in the right order! 🧩",
            comprehensiveFeedback: "Correct sequence: Research → Submit → Update resume → Prepare → Thank-you note → Offer"
          }
        ]
      },
      {
        title: "📝 Phase 3 — Review: Write & Reflect",
        color: "#10b981",
        studyTime: "15 minutes",
        xpReward: 100,
        mode: "practice",
        difficulty: "medium",
        tags: ["writing", "review"],
        activities: [
          {
            type: "essay_writing",
            title: "✍️ Write a Professional Email",
            content: JSON.stringify({prompt: "Write a professional email to your manager requesting a one-on-one meeting to discuss your career development goals. Include: a clear subject line, a polite greeting, the purpose of the meeting, suggested times, and a closing.", minWords: 80}),
            catComment: "Use the vocabulary we learned! 📧",
            comprehensiveFeedback: "<b>Email Checklist:</b> Did you include a subject line? Greeting? Clear purpose? Closing?"
          },
          {
            type: "voice_recording",
            title: "🎤 Record Your Reply",
            content: JSON.stringify({prompt: "Record a 60-second voice message introducing yourself to a new colleague. Include: your name, your role, your experience, and one interesting fact about yourself."}),
            catComment: "Speak clearly and confidently! 🎙️",
            comprehensiveFeedback: "Listen to your recording and check: Is your pronunciation clear? Is your pace good?"
          }
        ]
      }
    ]
  }, null, 2),

  dailyLesson: JSON.stringify({
    sections: [
      {
        title: "🚀 Daily Boost: Business Idioms",
        color: "#F5A623",
        studyTime: "10 mins",
        xpReward: 50,
        activities: [
          {
             title: "💡 Idiom Match",
             type: "matching",
             content: JSON.stringify([
                 { left: "Get the ball rolling", right: "To start something" },
                 { left: "Think outside the box", right: "Think creatively" },
                 { left: "Touch base", right: "Briefly make contact" }
             ]),
             comprehensiveFeedback: "<h3>Idiom Usage</h3><p>Using these in emails makes you sound highly fluent.</p>"
          }
        ]
      }
    ]
  }, null, 2),

  examPrepLesson: JSON.stringify({
    tableOfContents: [
      { section: 1, title: "📖 Section 1: Reading — Comprehension & Strategy", overview: "A realistic IELTS-style reading passage with exam strategy notes, followed by multiple-choice and true/false comprehension checks plus vocabulary work from the passage.", skills: ["reading"], activityHighlights: ["reading passage", "strategy notes", "multiple choice", "true/false"] },
      { section: 2, title: "✍️ Section 2: Writing — Task 1 & Task 2", overview: "Guided practice on describing data (Task 1) and writing an opinion essay (Task 2), each with task structure boxes, a checklist and a band-9 model answer.", skills: ["writing"], activityHighlights: ["essay writing ×2", "structure checklist", "model answers"] },
      { section: 3, title: "🗣️ Section 3: Speaking — Part 1, 2 & 3", overview: "Part 1 personal questions, a full Part 2 cue-card talk with the 1-minute timer, and Part 3 examiner follow-ups in a roleplay format.", skills: ["speaking"], activityHighlights: ["speaking jam cue card", "examiner roleplay", "part 3 discussion"] },
      { section: 4, title: "🔤 Section 4: Lexical Resource & Grammar", overview: "Exam-level vocabulary (topic collocations and synonyms), band-scoring error-correction drills, matching words to precise meanings and flashcards for high-value expressions.", skills: ["vocabulary", "grammar"], activityHighlights: ["vocabulary table", "error correction", "matching", "flashcards"] },
      { section: 5, title: "🎯 Section 5: Mini Mock — Mixed Skills", overview: "A timed mini-mock mixing a reading gap-fill, true/false, error correction and a final writing task so learners practise switching skills under exam pressure.", skills: ["reading", "writing", "grammar"], activityHighlights: ["mixed quiz", "gap fill", "true/false", "writing sprint"] }
    ],
    sections: [
      {
        title: "📖 Reading: Comprehension & Strategy",
        color: "#1e40af",
        studyTime: "25 mins",
        xpReward: 150,
        activities: [
          {
            title: "📄 Reading Passage — Urban Green Spaces",
            type: "paragraph",
            content: "<p>Cities around the world are rediscovering the power of parks. Urban green spaces do far more than decorate a skyline: they cool neighbourhoods during heatwaves, absorb storm water, and give residents a place to walk, cycle and meet neighbours. Studies in Singapore and Melbourne found that districts with dense tree cover can be up to five degrees cooler than nearby concrete-heavy areas. Access to nature has also been linked to lower stress and faster recovery after illness. For these reasons, city planners now treat green infrastructure as essential — not optional — when designing new districts.</p>",
            comprehensiveFeedback: "Key idea: parks are essential infrastructure, not decoration."
          },
          {
            title: "🎯 Reading Strategy Box",
            type: "list",
            content: "<b>Skim → scan → check.</b>\n1. Skim the passage in 60 seconds — underline the main idea of each paragraph.\n2. Read the questions first, then scan for key words.\n3. For True/False/Not Given, hunt for the exact sentence — if the idea is missing, it is NOT given."
          },
          {
            title: "❓ Multiple Choice — Reading Check",
            type: "multiple_choice",
            content: JSON.stringify({
              questions: [
                { question: "According to the passage, what is the main function of green spaces beyond appearance?", options: ["Cooling neighbourhoods and managing storm water", "Increasing property taxes", "Reducing the need for public transport"], answer: "Cooling neighbourhoods and managing storm water", explanation: "The passage says parks cool neighbourhoods, absorb storm water, and give people space to walk and meet." },
                { question: "What did studies in Singapore and Melbourne show?", options: ["Tree-dense districts can be about five degrees cooler", "All cities should ban cars", "Parks increase property value only"], answer: "Tree-dense districts can be about five degrees cooler", explanation: "…districts with dense tree cover can be up to five degrees cooler than nearby concrete-heavy areas." },
                { question: "How do city planners now view green infrastructure?", options: ["As essential infrastructure", "As an optional luxury", "As too expensive to maintain"], answer: "As essential infrastructure", explanation: "…treat green infrastructure as essential — not optional." }
              ]
            }),
            comprehensiveFeedback: "3/3 = perfect scanning. Under 3 = re-read paragraph by paragraph before answering."
          },
          {
            title: "✅ True / False / Not Given",
            type: "true_false",
            content: JSON.stringify({
              questions: [
                { question: "Green spaces help reduce stress according to the passage.", answer: "True", explanation: "Access to nature has been linked to lower stress." },
                { question: "Singapore plans to remove half of its parks by 2030.", answer: "False", explanation: "Not mentioned — the passage only cites Singapore as a study example." },
                { question: "Parks are only useful during the summer.", answer: "False", explanation: "They cool heatwaves, absorb storm water, and support health all year." }
              ]
            }),
            comprehensiveFeedback: "Remember: Not Given ≠ False — the information must be missing, not contradicted."
          }
        ]
      },
      {
        title: "✍️ Writing — Task 1 & Task 2",
        color: "#0f766e",
        studyTime: "40 mins",
        xpReward: 250,
        activities: [
          {
            title: "📊 Writing Task 1 — Describe the Data",
            type: "essay_writing",
            content: JSON.stringify({
              prompt: "The chart below shows the percentage of commuters using bicycles in three European cities between 2000 and 2020. Summarise the information by selecting and reporting the main features and make comparisons where relevant. Write at least 150 words.",
              minWords: 150,
              structure: "Intro (paraphrase the prompt) → Overview (1–2 key trends) → Body paragraphs (compare the cities)."
            }),
            comprehensiveFeedback: "Band-9 shape: paraphrase + clear overview + grouped comparisons, no personal opinion."
          },
          {
            title: "📝 Writing Task 2 — Opinion Essay",
            type: "essay_writing",
            content: JSON.stringify({
              prompt: "Some people believe that public parks and green spaces are a waste of valuable land in crowded cities. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples. Write at least 250 words.",
              minWords: 250,
              structure: "Introduction with clear position → 2 body paragraphs (agree/disagree + reasons & examples) → conclusion that restates your position."
            }),
            comprehensiveFeedback: "Markers look for: clear position, developed ideas, cohesive linking, and precise vocabulary (green infrastructure, mental well-being, urban planning)."
          },
          {
            title: "📋 Task Checklist — before you submit",
            type: "list",
            content: "<b>Self-check:</b>\n☐ Did I paraphrase the question in my introduction?\n☐ Does every paragraph have one clear topic sentence?\n☐ Did I use linking words (however, as a result, whereas)?\n☐ Is my position clear from start to finish?\n☐ Word count: Task 1 ≥150 · Task 2 ≥250"
          },
          {
            title: "🌟 Model Answer — Task 2 (band 9)",
            type: "paragraph",
            content: "<p>While housing and transport rightly compete for space in modern cities, I strongly disagree with the view that parks waste valuable land. Well-designed green spaces deliver benefits that no office block or road can replace. Firstly, they improve public health. Neighbourhoods with accessible parks report lower rates of stress-related illness, and children who play outdoors develop stronger immune systems. Secondly, parks are a city's natural air-conditioning: during summer heatwaves, tree cover measurably reduces temperatures and lowers energy demand. Finally, green space brings communities together — markets, concerts and weekend football turn strangers into neighbours. In short, parks are not an optional extra but the lungs of a healthy city, and removing them to build would cost more than any square metre of land is worth.</p>",
            comprehensiveFeedback: "Notice: clear position, cohesive linking (Firstly/Secondly/Finally), and precise collocations — a reusable template."
          }
        ]
      },
      {
        title: "🗣️ Speaking — Part 1, 2 & 3",
        color: "#6d28d9",
        studyTime: "20 mins",
        xpReward: 200,
        activities: [
          {
            title: "🗣️ Part 1 — Personal Questions",
            type: "speaking_jam",
            content: JSON.stringify({
              topic: "Answer these Part 1 questions about your hometown in full sentences.",
              duration: "1:00",
              bullets: [
                "Where do you live at the moment?",
                "What do you like most about the area?",
                "Is there anything you would change about it?"
              ],
              tip: "Part 1 answers = question rephrased + reason + example. Aim for 15–20 seconds per answer."
            }),
            comprehensiveFeedback: "Keep answers personal and specific — examiners reward concrete examples over memorised phrases."
          },
          {
            title: "🎴 Part 2 — Cue Card Talk",
            type: "speaking_jam",
            content: JSON.stringify({
              topic: "Describe a public park or green space you enjoy visiting.",
              duration: "2:00",
              bullets: [
                "Where it is and what it looks like",
                "How often you go there",
                "What you do while you are there",
                "And explain why you enjoy it so much"
              ],
              tip: "Use your 1 minute of preparation to write only 4–5 bullet keywords, not full sentences."
            }),
            comprehensiveFeedback: "Fluency over perfection: keep talking until the examiner stops you — hesitation costs more than small grammar slips."
          },
          {
            title: "🎭 Part 3 — Examiner Follow-up",
            type: "conversation_roleplay",
            content: JSON.stringify({
              context: "The examiner follows up on your cue card with more abstract questions. Answer with opinions, examples and consequences.",
              lines: [
                { speaker: "Examiner", text: "Why do you think green spaces are becoming more important in modern cities?" },
                { speaker: "Candidate", text: "Well, as cities get denser, people have less contact with nature, so parks are one of the few places where you can actually switch off. I'd say they're important for both mental and physical health." },
                { speaker: "Examiner", text: "Do you think governments should spend more money on parks than on roads?" },
                { speaker: "Candidate", text: "That's a tricky one. On one hand, roads keep the economy moving. But on the other hand, parks give a better return on quality of life. I'd argue for a balance, with more money shifting towards green transport and parks." }
              ],
              yourTurn: [
                "Answer: 'Why do some people prefer indoor exercise to outdoor exercise?'",
                "Answer: 'What could cities do to encourage people to use parks more?'",
                "Answer: 'Do you think climate change will change how cities are designed? Why?'"
              ]
            }),
            comprehensiveFeedback: "Part 3 = opinion + example + consequence. Hedge with 'It depends', 'On one hand… on the other hand'."
          }
        ]
      },
      {
        title: "🔤 Lexical Resource & Grammar",
        color: "#b91c1c",
        studyTime: "15 mins",
        xpReward: 150,
        activities: [
          {
            title: "📊 Topic Vocabulary — Cities & Green Spaces",
            type: "vocabulary_table",
            content: JSON.stringify([
              { word: "Green infrastructure", definition: "Natural systems (parks, trees, wetlands) built into urban design.", example: "Green infrastructure keeps cities cool in summer." },
              { word: "Urban sprawl", definition: "The uncontrolled expansion of a city into surrounding land.", example: "Urban sprawl has swallowed up farmland for decades." },
              { word: "Mental well-being", definition: "A state of good psychological health.", example: "Daily walks in the park boost mental well-being." },
              { word: "To thrive", definition: "To grow, develop and succeed.", example: "Communities thrive when neighbours share public space." }
            ]),
            comprehensiveFeedback: "Use at least three of these in your essay — precise collocations lift your Lexical Resource band."
          },
          {
            title: "🔍 Band-Scoring Error Correction",
            type: "error_correction",
            content: JSON.stringify({
              sentences: [
                { sentence: "In my opinion I think the parks are very necessary.", error: "In my opinion I think", correction: "In my opinion,", correctSentence: "In my opinion, parks are essential.", explanation: "Redundancy drops your score — never double the opinion markers." },
                { sentence: "People which live near parks are happier.", error: "which", correction: "who", correctSentence: "People who live near parks are happier.", explanation: "'Who' for people, 'which' for things." },
                { sentence: "The government should spending more on green spaces.", error: "spending", correction: "spend", correctSentence: "The government should spend more on green spaces.", explanation: "After modal 'should' use the bare infinitive." },
                { sentence: "Children who play outside have more strong immune systems.", error: "more strong", correction: "stronger", correctSentence: "Children who play outside have stronger immune systems.", explanation: "Comparative of 'strong' is 'stronger' — not 'more strong'." }
              ]
            }),
            comprehensiveFeedback: "These four error types (redundancy, relative pronouns, modals, comparatives) appear constantly at band 5.5–6.5."
          },
          {
            title: "🔗 Match the Word to Its Precise Meaning",
            type: "matching",
            content: JSON.stringify({
              pairs: [
                { left: "Resilient", right: "Able to recover quickly from difficulties" },
                { left: "Infrastructure", right: "The basic systems a city needs to function" },
                { left: "Dense", right: "Containing a lot of things or people close together" },
                { left: "Accessible", right: "Easy to reach or use" }
              ]
            }),
            comprehensiveFeedback: "Synonyms are gold in Reading — if you know four meanings here you can crack most matching tasks."
          },
          {
            title: "🔑 High-Value Expression Flashcards",
            type: "flashcard",
            content: JSON.stringify({
              cards: [
                { front: "Quality of life", back: "The general well-being of individuals and society.", example: "Parks directly improve residents' quality of life." },
                { front: "To outweigh", back: "To be more important or valuable than something else.", example: "The benefits of parks outweigh the cost of land." },
                { front: "A heated debate", back: "A discussion where people argue strongly.", example: "Whether to build housing or parks is a heated debate." }
              ]
            }),
            comprehensiveFeedback: "Drill these until they come automatically — they fit essays on almost any urban topic."
          }
        ]
      },
      {
        title: "🎯 Mini Mock — Mixed Skills",
        color: "#7c2d12",
        studyTime: "30 mins",
        xpReward: 300,
        activities: [
          {
            title: "✍️ Gap Fill — Complete the Summary",
            type: "gap_fill",
            content: JSON.stringify({
              sentences: [
                { text: "Districts with dense tree cover can be up to five degrees ____ than concrete-heavy areas.", answer: "cooler" },
                { text: "City planners now treat green infrastructure as ____, not optional.", answer: "essential" },
                { text: "Access to nature has been linked to lower ____ and faster recovery.", answer: "stress" }
              ]
            }),
            comprehensiveFeedback: "Summary completion tests the same skill as reading: find the exact words in the passage."
          },
          {
            title: "✅ Mini True / False Sprint",
            type: "true_false",
            content: JSON.stringify({
              questions: [
                { question: "The passage says parks reduce energy demand during heatwaves.", answer: "True" },
                { question: "Melbourne plans to build a new city park every year.", answer: "False", explanation: "Not mentioned in the passage." }
              ]
            }),
            comprehensiveFeedback: "Speed tip: True/False answers sit in paragraph order — work top to bottom."
          },
          {
            title: "🖋️ Writing Sprint — One Strong Paragraph",
            type: "essay_writing",
            content: JSON.stringify({
              prompt: "Write ONE paragraph (80–120 words) arguing whether your city needs more parks or more housing. Include a clear topic sentence, two supporting reasons and an example.",
              minWords: 80
            }),
            comprehensiveFeedback: "Self-grade: position clear? reasons developed? at least two topic collocations? That's a band-7 paragraph."
          },
          {
            title: "📋 Final Exam-Day Checklist",
            type: "list",
            content: "<b>Before the real exam:</b>\n☐ Reading: 20 min per passage max.\n☐ Writing Task 1: 20 min · Task 2: 40 min.\n☐ Speaking: extend every answer with a reason.\n☐ Sleep early — fatigue is the biggest band killer."
          }
        ]
      }
    ]
  }, null, 2),

  bilingualStudyLesson: JSON.stringify({
    sections: [
      {
        title: "🌎 Section 1: Translation Practice",
        color: "#8B572A",
        studyTime: "15 mins",
        xpReward: 100,
        activities: [
          {
             title: "🧩 Match the Phrases",
             type: "matching",
             content: JSON.stringify([
                 { left: "How do I get to the station?", right: "¿Cómo llego a la estación?" },
                 { left: "Can I have the bill, please?", right: "¿Me trae la cuenta, por favor?" }
             ]),
             comprehensiveFeedback: "<h3>Good!</h3><p>Translation helps anchor meaning to L1.</p>"
          }
        ]
      }
    ]
  }, null, 2),
  
  conversationalLesson: JSON.stringify({
    // Detailed Table of Contents — powers the Lesson Settings media AI prompt + the Learner Path log
    tableOfContents: [
      { section: 1, title: "👋 Section 1: Warm-Up — Get Talking", overview: "Low-pressure small-talk warmers and an ice-breaker card deck (truth / dare / would-you-rather) so the learner starts speaking immediately.", skills: ["speaking"], activityHighlights: ["speaking jam", "ice-breaker cards"] },
      { section: 2, title: "💬 Section 2: Dialogue Model — Making Plans", overview: "A realistic model conversation between two friends making weekend plans, with comprehension and true/false checks on what they understood.", skills: ["listening", "reading"], activityHighlights: ["dialogue model", "comprehension", "true/false"] },
      { section: 3, title: "🔑 Section 3: Key Phrases & Quick Reactions", overview: "High-frequency conversation phrases and natural reactions: flashcards to memorise them, a match-the-function game and best-response multiple choice.", skills: ["vocabulary", "speaking"], activityHighlights: ["phrase flashcards", "matching", "best-response quiz"] },
      { section: 4, title: "🗣️ Section 4: Speaking Challenge — Your Turn", overview: "Structured production: a timed speaking challenge, a roleplay where the learner plays one half of the dialogue, gap-fill lines and fixing a learner's typical mistakes.", skills: ["speaking", "writing"], activityHighlights: ["speaking challenge", "roleplay", "gap-fill", "error correction"] },
      { section: 5, title: "🎮 Section 5: Speaking Games & Review", overview: "Conversation games (truth or dare, would-you-rather), a register-sorting game, a final review quiz and a voice recording to wrap the lesson.", skills: ["speaking", "review"], activityHighlights: ["truth or dare", "would-you-rather", "sorting", "review quiz", "voice recording"] }
    ],
    sections: [
      {
        title: "👋 Warm-Up — Get Talking",
        color: "#417505",
        studyTime: "10 mins",
        xpReward: 100,
        activities: [
          {
            title: "🗣️ Speaking Jam — Small Talk",
            type: "speaking_jam",
            content: JSON.stringify({
              topic: "Your weekend — tell your tutor about it without stopping!",
              duration: "2:00",
              bullets: [
                "Where did you go (or stay)?",
                "What was the best moment?",
                "Did anything funny or surprising happen?",
                "What are you doing next weekend?"
              ],
              tip: "Don't worry about mistakes — keep the flow going and use 'so…', 'anyway…' and 'actually…' to buy time."
            }),
            comprehensiveFeedback: "<b>Fluency tip:</b> pausing to think in English (not translating) keeps conversations natural."
          },
          {
            title: "🎲 Ice-Breaker Card Deck",
            type: "speaking_game",
            content: JSON.stringify({
              game: "Ice-Breaker Cards",
              rounds: [
                { type: "truth", question: "What is the last book, series or podcast you couldn't stop talking about?" },
                { type: "would_you_rather", question: "Would you rather have a 3-day weekend every week OR a 2-month summer holiday every year?" },
                { type: "truth", question: "What is a small thing that made you really happy this week?" },
                { type: "dare", prompt: "Describe your morning routine in exactly 15 seconds — go!" },
                { type: "two_truths_one_lie", prompt: "Share two truths and one lie about your job, then let your tutor guess the lie." },
                { type: "would_you_rather", question: "Would you rather always say exactly what you think OR always be polite even when you disagree?" },
                { type: "truth", question: "If you could instantly become fluent in any language, which one would you pick and why?" },
                { type: "dare", prompt: "Recommend one song and explain why you love it — 30 seconds!" }
              ]
            }),
            comprehensiveFeedback: "<b>Fluency Feedback:</b> aim for full sentences — expand every answer with a reason or an example."
          }
        ]
      },
      {
        title: "💬 Dialogue Model — Making Plans",
        color: "#b45309",
        studyTime: "15 mins",
        xpReward: 120,
        activities: [
          {
            title: "💬 Dialogue Model — Coffee Catch-up",
            type: "conversation_roleplay",
            content: JSON.stringify({
              context: "Sofia and James are old friends catching up on a video call. Notice how they open, react, make plans and close naturally.",
              lines: [
                { speaker: "Sofia", text: "James! Finally! I was starting to think you'd forgotten about me. How are you?" },
                { speaker: "James", text: "Never! Work has just been crazy. I'm good though — exhausted, but good. You?" },
                { speaker: "Sofia", text: "Pretty busy too, but I've got a free Saturday coming up and I'd love to actually see you." },
                { speaker: "James", text: "Yes, please! I've been stuck inside for weeks. What did you have in mind?" },
                { speaker: "Sofia", text: "There's that new vegan place near the park — brunch there, then a walk?" },
                { speaker: "James", text: "Sounds perfect. Shall we say 11 so we miss the rush?" },
                { speaker: "Sofia", text: "Perfect. I'll book us a table — text me if anything changes!" },
                { speaker: "James", text: "Will do. Looking forward to it — it's been way too long!" }
              ],
              yourTurn: [
                "Read James's part — reply to Sofia's opening line naturally.",
                "You are James: accept the invitation and suggest a time that suits you.",
                "You are Sofia: react to James's answer and end the call warmly."
              ]
            }),
            comprehensiveFeedback: "<b>Notice:</b> conversation partners react first (Really? Yes please!) and only then make plans — reactions keep the chat alive."
          },
          {
            title: "❓ Comprehension Check",
            type: "questions",
            content: "1. Why has James been hard to reach recently?\n2. Where does Sofia suggest they meet?\n3. Why do they decide on 11 o'clock?\n4. Who books the table?",
            comprehensiveFeedback: "1. Work has been crazy. 2. A new vegan place near the park. 3. To miss the rush. 4. Sofia."
          },
          {
            title: "✅ True or False — How much did you catch?",
            type: "true_false",
            content: JSON.stringify({
              questions: [
                { question: "James says he has been feeling relaxed recently.", answer: "False", explanation: "He says he is exhausted but good." },
                { question: "Sofia is free on Saturday.", answer: "True", explanation: "She has a free Saturday coming up." },
                { question: "They plan to meet at a coffee shop.", answer: "False", explanation: "It's a new vegan restaurant, then a walk in the park." },
                { question: "Sofia offers to book the table.", answer: "True", explanation: "She says 'I'll book us a table.'" }
              ]
            }),
            comprehensiveFeedback: "Reading between the lines: 'I've been stuck inside' means James really wants to go out — a great natural reaction to copy."
          }
        ]
      },
      {
        title: "🔑 Key Phrases & Quick Reactions",
        color: "#7c3aed",
        studyTime: "15 mins",
        xpReward: 130,
        activities: [
          {
            title: "🔑 Key Phrases Flashcards",
            type: "flashcard",
            content: JSON.stringify({
              cards: [
                { front: "Finally!", back: "You say it when you meet someone you've been waiting to see.", example: "James! Finally! I thought you'd forgotten me." },
                { front: "It's been way too long", back: "A warm way to say you haven't seen each other for a while.", example: "Looking forward to it — it's been way too long!" },
                { front: "Shall we…?", back: "A polite suggestion for making plans together.", example: "Shall we say 11 so we miss the rush?" },
                { front: "Sounds perfect", back: "An enthusiastic way to accept a suggestion.", example: "Sounds perfect. See you there!" },
                { front: "Text me if anything changes", back: "How friends confirm plans flexibly.", example: "I'll book the table — text me if anything changes!" }
              ]
            }),
            comprehensiveFeedback: "Drill each card aloud twice — once for meaning, once for natural intonation."
          },
          {
            title: "🔗 Match the Phrase to Its Job",
            type: "matching",
            content: JSON.stringify({
              pairs: [
                { left: "Finally!", right: "Opening a call with an old friend" },
                { left: "Never!", right: "Playful way to deny something" },
                { left: "What did you have in mind?", right: "Asking for the details of a plan" },
                { left: "Shall we…?", right: "Making a polite suggestion" },
                { left: "Will do", right: "Confirming you'll do something" }
              ]
            }),
            comprehensiveFeedback: "Every phrase has a job — learning phrases with their social function makes you sound natural."
          },
          {
            title: "💬 Choose the Best Response",
            type: "multiple_choice",
            content: JSON.stringify({
              questions: [
                { question: "'I've been stuck inside for weeks!'", options: ["Oh no, really? We should fix that!", "Yes, I am stuck.", "Where is your house?"], answer: "Oh no, really? We should fix that!", explanation: "React with sympathy, then suggest something — exactly what Sofia does." },
                { question: "'There's a new vegan place near the park.'", options: ["I don't like vegan food.", "Sounds perfect — brunch there, then a walk?", "Which park is that?"], answer: "Sounds perfect — brunch there, then a walk?", explanation: "React enthusiastically, then build on the suggestion." },
                { question: "'Shall we say 11 so we miss the rush?'", options: ["11 is a number.", "Good idea — I'll book us a table.", "Why 11?"], answer: "Good idea — I'll book us a table.", explanation: "Agree and take a small action to keep plans moving." },
                { question: "'Text me if anything changes!'", options: ["Will do. Looking forward to it!", "I don't text.", "Nothing will change."], answer: "Will do. Looking forward to it!", explanation: "'Will do' + a warm closer is the natural native pattern." }
              ]
            }),
            comprehensiveFeedback: "Score 4/4? You can run this conversation yourself. Fewer — review the flashcards and try again."
          }
        ]
      },
      {
        title: "🗣️ Speaking Challenge — Your Turn",
        color: "#0e7490",
        studyTime: "20 mins",
        xpReward: 180,
        activities: [
          {
            title: "🗣️ Speaking Challenge — The One-Minute Plan",
            type: "speaking_jam",
            content: JSON.stringify({
              topic: "Plan an imaginary catch-up with a friend you haven't seen for months.",
              duration: "1:00",
              bullets: [
                "Open warmly (Finally! / It's been way too long!)…",
                "Say why you've been busy…",
                "Suggest an activity + a time (Shall we…? / How about…?)",
                "Close with a confirmation"
              ],
              tip: "Use at least three key phrases from Section 3 — the timer is on!",
              modelAnswer: "Emma! Finally! It's been way too long — work has been keeping me busy. Anyway, how about we grab dinner on Friday? Shall we say 7 at that new Italian place? Sounds good? Great — I'll book us a table and text you if anything changes!"
            }),
            comprehensiveFeedback: "Compare with the model answer — did you open, suggest, agree and close? That's the whole skill."
          },
          {
            title: "🎭 Roleplay — Order at the Café",
            type: "conversation_roleplay",
            content: JSON.stringify({
              context: "You're at a busy café. The server is friendly and a little rushed — stay natural and polite.",
              lines: [
                { speaker: "Server", text: "Hi there! What can I get for you today?" },
                { speaker: "Learner", text: "Hi! Could I get a flat white and one of those almond croissants, please?" },
                { speaker: "Server", text: "Sure thing — anything else? We've got a fresh batch of banana bread if you're tempted." },
                { speaker: "Learner", text: "Tempting, but I'll behave — just the coffee and croissant, thanks." },
                { speaker: "Server", text: "No problem. That's £6.40 — card or cash?" }
              ],
              yourTurn: [
                "You are the customer: order a drink and a snack politely.",
                "React to the server's upsell — accept OR decline with a reason.",
                "You are the server: welcome the next customer and take their order."
              ]
            }),
            comprehensiveFeedback: "Great roleplay focus: politeness (could I…, please, thanks) and small reactions (tempting, sure thing, no problem)."
          },
          {
            title: "✍️ Complete the Line — Natural Replies",
            type: "gap_fill",
            content: JSON.stringify({
              sentences: [
                { text: "A: I'm so tired today.  B: Really? You ____ like you've been working non-stop!", answer: "look", hint: "Present simple of 'see with your eyes'." },
                { text: "A: Do you want to try the new sushi place?  B: ____ perfect — I love sushi!", answer: "Sounds", hint: "React before you accept (Sounds…)." },
                { text: "A: When should we meet?  B: ____ we say Saturday at noon?", answer: "Shall", hint: "Polite suggestion phrase." },
                { text: "A: Can you send me the address?  B: Will ____ — no problem.", answer: "do", hint: "Short confirmation = Will + ?" }
              ]
            }),
            comprehensiveFeedback: "These four micro-reactions (Really? / Sounds perfect / Shall we…? / Will do) cover 80% of daily plan-making."
          },
          {
            title: "🔍 Fix the Learner's Mistakes",
            type: "error_correction",
            content: JSON.stringify({
              sentences: [
                { sentence: "I am agree with you about the restaurant.", error: "am agree", correction: "agree", correctSentence: "I agree with you about the restaurant.", explanation: "'Agree' is a verb — no 'am' needed." },
                { sentence: "He is my friend from many years.", error: "from many years", correction: "for many years", correctSentence: "He is my friend of many years.", explanation: "Use 'for' + duration: I've known him for many years." },
                { sentence: "We will meet on Saturday at 11 o'clock.", error: "", correction: "", correctSentence: "We're meeting on Saturday at 11 o'clock.", explanation: "Fine as written — but the present continuous (We're meeting…) sounds even more natural for fixed plans." },
                { sentence: "Can you to send me the location?", error: "to send", correction: "send", correctSentence: "Can you send me the location?", explanation: "After 'can you', use the bare verb: can you send…" }
              ]
            }),
            comprehensiveFeedback: "Each fix is a micro-lesson: verb patterns (agree), prepositions (for + duration) and modals (can you + verb)."
          },
          {
            title: "🗂️ Sort the Register — Formal or Casual?",
            type: "sorting",
            content: JSON.stringify({
              categories: ["Casual — with friends", "Formal — at work / with strangers"],
              items: [
                { text: "Finally! It's been way too long!", category: "Casual — with friends" },
                { text: "Could I possibly schedule a meeting for next week?", category: "Formal — at work / with strangers" },
                { text: "Will do — text me if anything changes!", category: "Casual — with friends" },
                { text: "I would be delighted to attend. Please let me know if any further information is required.", category: "Formal — at work / with strangers" },
                { text: "Shall we grab a coffee sometime?", category: "Casual — with friends" },
                { text: "Would you be available for a brief call on Thursday at 2 p.m.?", category: "Formal — at work / with strangers" }
              ]
            }),
            comprehensiveFeedback: "Register = who you're talking to. Same idea, completely different words — this is what advanced speakers control automatically."
          }
        ]
      },
      {
        title: "🎮 Speaking Games & Review",
        color: "#be123c",
        studyTime: "15 mins",
        xpReward: 150,
        activities: [
          {
            title: "🎲 Truth or Dare — Conversation Edition",
            type: "speaking_game",
            content: JSON.stringify({
              game: "Truth or Dare",
              rounds: [
                { type: "truth", question: "What is the most interesting conversation you've had this month?" },
                { type: "dare", prompt: "Compliment your tutor in three different ways without repeating yourself." },
                { type: "truth", question: "Have you ever accidentally said something embarrassing in another language?" },
                { type: "dare", prompt: "Keep the conversation going for 60 seconds using only questions." },
                { type: "truth", question: "What is a topic you could talk about for hours?" },
                { type: "would_you_rather", question: "Would you rather always win arguments OR always make people laugh?" }
              ]
            }),
            comprehensiveFeedback: "The goal is never the answer — it's the conversation after it. Always ask one follow-up question."
          },
          {
            title: "⚖️ Would You Rather — Talk Till You Drop",
            type: "would_you_rather",
            content: JSON.stringify({
              questions: [
                { question: "Would you rather have a brilliant memory OR always know the perfect thing to say?" },
                { question: "Would you rather travel with friends who plan everything OR travel solo with no plan at all?" },
                { question: "Would you rather be great at small talk OR great at deep conversations?" }
              ]
            }),
            comprehensiveFeedback: "Give one reason for your choice and one reason against the other option — that's real opinion language."
          },
          {
            title: "🎯 Review Quiz — Conversation Toolkit",
            type: "multiple_choice",
            content: JSON.stringify({
              questions: [
                { question: "Which opener sounds most natural when an old friend finally appears on the call?", options: ["Finally! I thought you'd forgotten me.", "You are late to the call.", "I am happy because you are here."], answer: "Finally! I thought you'd forgotten me.", explanation: "'Finally!' + a playful complaint is classic friend-to-friend English." },
                { question: "'Shall we…' is best for…", options: ["making a polite suggestion", "criticising someone", "ending a phone call"], answer: "making a polite suggestion", explanation: "Shall we + verb is the friendliest way to suggest a plan together." },
                { question: "Which is the correct reaction to bad news?", options: ["Oh no, really? That's tough.", "I see you have a problem.", "Okay, noted."], answer: "Oh no, really? That's tough.", explanation: "Native speakers react with sympathy + a soft comment, then offer help." },
                { question: "Which sentence is correct?", options: ["I agree with you.", "I am agree with you.", "I'm agreeing to you."], answer: "I agree with you.", explanation: "Agree is a verb: I agree / I don't agree." }
              ]
            }),
            comprehensiveFeedback: "Score 4/4 and you're ready for the final recording challenge. Under 4 — review Sections 2–3 before recording."
          },
          {
            title: "🎤 Record Your Catch-up",
            type: "voice_recording",
            content: JSON.stringify({
              prompt: "Record a 90-second voice message to an old friend you haven't spoken to in months. Use what you learned: open warmly, explain why you've been busy, suggest a plan and confirm it.",
              minWords: 40
            }),
            comprehensiveFeedback: "Listen back twice — once for fluency, once for the key phrases. Then re-record if you can make it even smoother."
          },
          {
            title: "💬 Final Reflection",
            type: "questions",
            content: "<b>Close the lesson with:</b>\nWhich key phrase will you actually use this week?\nWhat is the biggest difference between textbook English and real conversation English?\nRate your confidence making plans in English from 1–10 — what would make it a 10?",
            comprehensiveFeedback: "The best learners finish with one concrete goal — e.g. 'I will use Shall we…? three times this week.'"
          }
        ]
      }
    ]
  }, null, 2),

  quiz: JSON.stringify({
      questions: [
          { question: "What is the synonym of 'Abundant'?", options: ["Scarce", "Plentiful", "Rare", "Trivial"], answer: "Plentiful", explanation: "Means existing in large quantities." },
          { question: "Choose the correct tense: 'I ___ to Paris last year.'", options: ["go", "went", "have gone", "was going"], answer: "went", explanation: "Past simple for finished actions." },
          { question: "Which word is a noun?", options: ["Quickly", "Beautiful", "Happiness", "Run"], answer: "Happiness", explanation: "Ends in -ness, denoting a state." },
          { question: "Opposite of 'Expand'?", options: ["Grow", "Contract", "Increase", "Develop"], answer: "Contract", explanation: "Contract means to decrease in size." },
          { question: "Identify the error: 'She don't like apples.'", options: ["no error", "She doesn't like", "apples", "like"], answer: "She doesn't like", explanation: "Third person singular takes doesn't." }
      ],
      passingScore: 80
  }, null, 2),

  homework: JSON.stringify({
    // Detailed Table of Contents — powers the Lesson Settings media AI prompt + the Learner Path log
    tableOfContents: [
      { section: 1, title: "📖 Homework 1: Reading — The Holiday Email", overview: "Read a short, realistic email in which a friend plans a group holiday; answer comprehension questions and true/false statements so the learner practises reading for detail at home.", skills: ["reading"], activityHighlights: ["reading passage", "comprehension questions", "true/false"] },
      { section: 2, title: "📚 Homework 2: Vocabulary — Travel Language", overview: "Self-study vocabulary work on travel phrases and holiday words: flashcards to learn them, a matching game for collocations, gap-fill sentences and an unscramble to fix word order.", skills: ["vocabulary", "grammar"], activityHighlights: ["flashcards", "matching", "gap-fill", "scramble"] },
      { section: 3, title: "✍️ Homework 3: Grammar — Past Simple vs Present Perfect", overview: "A grammar refresher for choosing between past simple and present perfect when talking about holidays: error-correction sentences, gap-fill choices and a sorting game for time expressions.", skills: ["grammar", "writing"], activityHighlights: ["error correction", "gap-fill", "sorting game"] },
      { section: 4, title: "🗣️ Homework 4: Speaking & Writing — Your Holiday Story", overview: "Extended output the learner prepares alone: a timed speaking task telling a holiday story, guided writing prompts with model answers and a short self-check quiz on the whole pack.", skills: ["speaking", "writing", "review"], activityHighlights: ["speaking challenge", "writing prompts", "self-check quiz"] }
    ],
    sections: [
      {
        title: "📖 Homework 1: Reading — The Holiday Email",
        summary: "An email to read at home with comprehension questions and true/false checks.",
        color: "#2563eb",
        studyTime: "20 mins",
        xpReward: 100,
        activities: [
          {
            title: "📧 Read the Email",
            type: "paragraph",
            content: "<p><b>To:</b> Maya & Sam<br><b>From:</b> Priya<br><b>Subject:</b> Beach house — who's in?</p><p>Hi both,</p><p>Quick question before we all book anything: are you free the second week of July? I found a small beach house near Essaouira that sleeps six, and it is actually cheaper than the hotel we looked at. It has a kitchen, so we can cook some nights instead of eating out, and the beach is a five-minute walk.</p><p>The only catch is the dates are fixed — the 8th to the 15th. Ravi can only come for the first four days because he starts his new job on the 13th. That is still fine, we just split the cost five ways for the first half and four ways after he leaves.</p><p>Could you both check your calendars tonight and tell me by tomorrow morning? If you are in, I will put down the deposit on Friday. If the dates do not work for you, tell me now and I will ask my cousin instead — no hard feelings!</p><p>Speak soon,<br>Priya</p>",
            comprehensiveFeedback: "Scan first for the big facts: where, when, how much, who. Then read again slowly for the small details (the catch, Ravi's dates, the deadline)."
          },
          {
            title: "❓ Answer the Questions",
            type: "questions",
            content: "1. What type of place has Priya found?\nA beach house near Essaouira that sleeps six.\n2. Why does she like it better than the hotel?\nIt is cheaper and has a kitchen, and the beach is a five-minute walk.\n3. How long can Ravi stay?\nOnly the first four days — he starts a new job on the 13th.\n4. What must Maya and Sam do tonight?\nCheck their calendars and tell Priya by tomorrow morning.\n5. What will Priya do on Friday if they agree?\nPut down the deposit.",
            comprehensiveFeedback: "Model answers in full sentences: 'Priya has found a beach house near Essaouira that sleeps six.' Full sentences prove you understood, not just found the words."
          },
          {
            title: "✅ True or False?",
            type: "true_false",
            content: JSON.stringify({
              questions: [
                { question: "The beach house is more expensive than the hotel.", answer: "False", explanation: "She says it is 'actually cheaper than the hotel'." },
                { question: "The beach is a five-minute walk from the house.", answer: "True", explanation: "'The beach is a five-minute walk.'" },
                { question: "Ravi will stay for the whole week.", answer: "False", explanation: "He leaves after four days to start his new job." },
                { question: "Priya needs an answer by Friday morning.", answer: "False", explanation: "She needs an answer by tomorrow morning; she pays on Friday." }
              ]
            }),
            comprehensiveFeedback: "Careful readers notice the deadline is tomorrow — Friday is only when the deposit gets paid. Small words (by/on) change everything."
          }
        ]
      },
      {
        title: "📚 Homework 2: Vocabulary — Travel Language",
        summary: "Self-study vocabulary: flashcards, collocation matching, gap-fill and an unscramble.",
        color: "#7c3aed",
        studyTime: "25 mins",
        xpReward: 130,
        activities: [
          {
            title: "⚡ Flashcards: Holiday Words",
            type: "flashcard",
            content: JSON.stringify({
              cards: [
                { front: "Deposit", back: "Money you pay to hold a booking — the rest comes later.", example: "We put down a deposit to keep the house for July." },
                { front: "Sleeps six", back: "A house or room has beds for six people.", example: "The ad says the villa sleeps six — perfect for us." },
                { front: "The only catch", back: "The one small problem or condition.", example: "The only catch is the dates are fixed." },
                { front: "No hard feelings", back: "Saying you will not be angry if someone says no.", example: "Tell me now and I will ask my cousin — no hard feelings!" },
                { front: "Split the cost", back: "Share the price between the people going.", example: "We can split the cost five ways." },
                { front: "Check your calendar", back: "Look at your schedule to see if you are free.", example: "Could you check your calendar tonight?" }
              ]
            }),
            comprehensiveFeedback: "Learn each card with its example sentence, not alone — 'deposit' lives with 'put down a deposit'."
          },
          {
            title: "🔗 Match the Collocations",
            type: "matching",
            content: JSON.stringify({
              pairs: [
                { left: "Put down", right: "a deposit" },
                { left: "Split", right: "the cost" },
                { left: "Sleeps", right: "six" },
                { left: "Check", right: "your calendar" },
                { left: "No hard", right: "feelings" },
                { left: "The only", right: "catch" }
              ]
            }),
            comprehensiveFeedback: "Native speakers store language in chunks: 'put down a deposit', 'the only catch'. Learn the chunk, not the single word."
          },
          {
            title: "✍️ Fill the Gap",
            type: "gap_fill",
            content: JSON.stringify({
              sentences: [
                { text: "The villa ___ six, so there is room for all of us.", answer: "sleeps", hint: "verb for how many beds" },
                { text: "We paid a ___ to hold the booking until Friday.", answer: "deposit", hint: "first part of the money" },
                { text: "The ___ is that the dates are fixed — no changes.", answer: "catch", hint: "small problem or condition" },
                { text: "If the dates do not work, just say so — no ___ feelings.", answer: "hard", hint: "opposite of soft here means angry" },
                { text: "We agreed to ___ the cost between the five of us.", answer: "split", hint: "share or divide" }
              ]
            }),
            comprehensiveFeedback: "Write each completed sentence in your notebook — writing the full sentence fixes the collocation better than the word alone."
          },
          {
            title: "🔀 Unscramble the Message",
            type: "scramble",
            content: JSON.stringify({
              sentences: [
                { sentence: "Could | you | check | your | calendar | tonight", hint: "Start with 'Could'" },
                { sentence: "We | split | the | cost | five | ways", hint: "Start with 'We'" },
                { sentence: "The | only | catch | is | the | fixed | dates", hint: "Start with 'The only catch'" }
              ]
            }),
            comprehensiveFeedback: "These three sentences are the email in miniature: a request, an arrangement and a warning. Practise saying them fluently."
          }
        ]
      },
      {
        title: "✍️ Homework 3: Grammar — Past Simple vs Present Perfect",
        summary: "Choosing past simple vs present perfect with error-correction, gap-fill and a sorting game.",
        color: "#059669",
        studyTime: "25 mins",
        xpReward: 140,
        activities: [
          {
            title: "📖 Grammar Refresher",
            type: "paragraph",
            content: "<p><b>Past simple</b> = finished time: <i>We went to Essaouira <u>in 2024</u>.</i> Use it when the time is finished or stated (yesterday, last year, in July, ago).</p><p><b>Present perfect</b> = past with a result now, or experience without a time: <i>I have been to Morocco <u>twice</u>.</i> / <i>She has already booked the flight.</i></p><p><b>Quick test:</b> can you add a finished time (yesterday, in 2020)? Yes → past simple. No → think present perfect.</p>",
            comprehensiveFeedback: "Ask yourself: is there a finished time word? 'In July' → past simple. No time → present perfect for experiences and recent news."
          },
          {
            title: "🔍 Find and Fix the Mistakes",
            type: "error_correction",
            content: JSON.stringify({
              sentences: [
                { sentence: "We have gone to Essaouira last summer.", error: "have gone", correction: "went", correctSentence: "We went to Essaouira last summer.", explanation: "'Last summer' is finished time → past simple 'went'." },
                { sentence: "I never visited Morocco before.", error: "visited", correction: "have visited", correctSentence: "I have never visited Morocco before.", explanation: "Experience up to now with no time → present perfect." },
                { sentence: "She already booked the flights yesterday.", error: "booked", correction: "booked (no change needed)", correctSentence: "She already booked the flights yesterday.", explanation: "Actually this is fine — 'yesterday' is finished time. Leave it! The lesson: 'already' works with both tenses." },
                { sentence: "Did you ever stay in a beach house?", error: "Did", correction: "Have", correctSentence: "Have you ever stayed in a beach house?", explanation: "'Ever' asks about experience in your life → present perfect." }
              ]
            }),
            comprehensiveFeedback: "Trick item: sentence 3 is already correct. Always test for a finished-time word before 'correcting' — that is the whole skill."
          },
          {
            title: "✍️ Choose the Right Form",
            type: "gap_fill",
            content: JSON.stringify({
              sentences: [
                { text: "I ___ (see) that film twice — you would love it.", answer: "have seen", hint: "experience, no time → present perfect" },
                { text: "We ___ (arrive) at the house at 4 pm yesterday.", answer: "arrived", hint: "finished time 'yesterday' → past simple" },
                { text: "___ you ever ___ (eat) street food in Marrakech?", answer: "Have; eaten", hint: "'ever' = experience → present perfect" },
                { text: "Ravi ___ (leave) on the 13th because his job starts then.", answer: "leaves", hint: "future timetable → present simple; be careful!" },
                { text: "She ___ (just / pay) the deposit — we are booked!", answer: "has just paid", hint: "'just' + result now → present perfect" }
              ]
            }),
            comprehensiveFeedback: "Number 4 is a trap: timetables in the future use present simple ('the train leaves at 8'). If you got it, excellent attention!"
          },
          {
            title: "🗂️ Sort the Time Expressions",
            type: "sorting",
            content: JSON.stringify({
              categories: ["Past simple (finished time)", "Present perfect (no finished time)"],
              items: [
                { text: "yesterday", category: "Past simple (finished time)" },
                { text: "in 2024", category: "Past simple (finished time)" },
                { text: "last summer", category: "Past simple (finished time)" },
                { text: "ever", category: "Present perfect (no finished time)" },
                { text: "twice in my life", category: "Present perfect (no finished time)" },
                { text: "just", category: "Present perfect (no finished time)" },
                { text: "two days ago", category: "Past simple (finished time)" },
                { text: "so far", category: "Present perfect (no finished time)" }
              ]
            }),
            comprehensiveFeedback: "The rule in one line: finished time → past simple; no finished time (ever, just, so far, in my life) → present perfect."
          }
        ]
      },
      {
        title: "🗣️ Homework 4: Speaking & Writing — Your Holiday Story",
        summary: "Extended homework output: a timed speaking story, guided writing with model answers and a self-check quiz.",
        color: "#d97706",
        studyTime: "30 mins",
        xpReward: 180,
        activities: [
          {
            title: "⏱️ Speaking: Tell Your Holiday Story",
            type: "speaking_jam",
            content: JSON.stringify({
              topic: "Tell a story about a real holiday or trip you remember. Where did you go, who was with you, what was the best moment — and the funniest problem?",
              tips: ["Open with time + place: 'Two years ago, I went to…'", "Use past simple for the events: 'We arrived… then we walked…'", "Finish with a feeling: 'It was the best trip because…'"],
              minTimeSec: 90
            }),
            comprehensiveFeedback: "Record yourself twice. Second time, add one reaction word ('Luckily…', 'Honestly…') — stories come alive with small reactions."
          },
          {
            title: "✍️ Guided Writing: Email Reply",
            type: "questions",
            content: "Write a short reply to Priya's email (60-80 words). Say yes or no, mention the dates, and add one question about the house.\nModel answer: Hi Priya, great find! Sam and I are both free from the 8th to the 15th, so count us in. A kitchen sounds perfect — we can take turns cooking. One question: how far is the house from the shops? We would rather not rent a car. Let us know if you need the money for the deposit. Speak soon, Maya.\nNow write 3 sentences about a trip you took: one with past simple, one with present perfect (your experience), one with a time expression like 'last year'.\nModel answer: Last year I visited Istanbul with my cousin. I have always wanted to see the Hagia Sophia. We walked for hours every single day — my feet have never recovered!",
            comprehensiveFeedback: "Your reply needs: a decision (yes/no), the dates, and one question. That is all Priya asked for — concise beats clever in emails."
          },
          {
            title: "✅ Self-Check Quiz",
            type: "multiple_choice",
            content: JSON.stringify({
              questions: [
                { question: "Choose the correct sentence:", options: ["We have gone to Essaouira last summer.", "We went to Essaouira last summer.", "We has gone to Essaouira last summer."], answer: "We went to Essaouira last summer.", explanation: "'Last summer' is finished time → past simple." },
                { question: "A 'deposit' is…", options: ["The full price paid at once", "The first payment that holds a booking", "A discount for groups"], answer: "The first payment that holds a booking", explanation: "You pay the rest later." },
                { question: "'The only catch is…' means…", options: ["The best part is…", "The one problem is…", "We are fishing nearby…"], answer: "The one problem is…", explanation: "A 'catch' is the small condition or drawback." },
                { question: "Which sentence uses present perfect correctly?", options: ["She has just paid the deposit.", "She has paid the deposit yesterday.", "She have just paid the deposit."], answer: "She has just paid the deposit.", explanation: "'Just' + result now → present perfect; never mix it with a finished time." }
              ]
            }),
            comprehensiveFeedback: "4/4 means the pack is finished. 3 or fewer — redo Homework 3's sorting game, then try the quiz once more tomorrow."
          },
          {
            title: "📋 Homework Checklist",
            type: "list",
            content: "<b>Hand in before Friday's class:</b><br>☐ Reading answers (Homework 1) — full sentences<br>☐ Vocabulary: 6 collocations in your own sentences (Homework 2)<br>☐ Grammar: corrected sentences + sorting game screenshot (Homework 3)<br>☐ One recorded holiday story, 90 seconds (Homework 4)<br>☐ Email reply to Priya, 60-80 words (Homework 4)",
            comprehensiveFeedback: "Bring anything you found hard — the trickiest items (already + finished time, 'so far') are exactly what the class will practise next."
          }
        ]
      }
    ],
    lessonSummary: "A complete self-study homework pack built around one realistic email — reading, travel vocabulary, past simple vs present perfect, and a speaking/writing task to hand in.",
    settings: {
      teacherNotes: "Everything is self-contained so learners can work alone. The email text appears inside the first activity — learners do not need any external material. Collect the checklist items before Friday's class.",
      homeworkChecklist: "Read the email twice. Do the four homework sections in order. Record the 90-second story and email the reply to the teacher.",
      materialLinks: ""
    }
  }, null, 2),

  weeklyChallenge: JSON.stringify({
      title: "Vocabulary Arcade Challenge",
      theme: "arcade",
      tasks: [
          { type: 'multipleChoice', title: "Beat the Boss", content: "Choose the hardest vocabulary word.", options: ["Defenestrate", "Throw", "Eject", "Toss"], answer: "Defenestrate", points: 100 },
          { type: 'fillInTheBlank', title: "Speed Run", content: "They will ______ the building tomorrow.", correct: "demolish", points: 50 },
          { type: 'matching', title: "Power Up Match", pairs: [{term: "Fast", match: "Quick"}, {term: "Smart", match: "Intelligent"}], points: 50 }
      ]
  }, null, 2),
  
  // 🔁 Review App — transcript-based review game. Built from a real in-class transcript
  // (learner errors: goed→went, libary→library, studdy→study, seed→saw, sayed→said,
  // buyed→bought, feeled→felt). Every item quotes what the learner SAID in its feedback.
  learningApp: JSON.stringify({
    title: "Yesterday, My Library Day — Review App",
    sections: [
      {
        title: "Level 1: Foundations", color: "#58CC02", xpReward: 30,
        activities: [
          {
            type: "matching", title: "Match the corrected word", skillLabel: "Vocabulary", skillIcon: "fas fa-book",
            content: JSON.stringify({
              pairs: [
                { left: "went", right: "past of GO — you said 'goed'" },
                { left: "library", right: "place with books — you said 'libary'" },
                { left: "saw", right: "past of SEE — you said 'seed'" },
                { left: "said", right: "past of SAY — you said 'sayed'" },
                { left: "bought", right: "past of BUY — you said 'buyed'" },
                { left: "felt", right: "past of FEEL — you said 'feeled'" },
              ]
            })
          },
          {
            type: "multiple_choice", title: "Choose the correct form", skillLabel: "Grammar", skillIcon: "fas fa-book-open",
            content: JSON.stringify({
              items: [
                { question: "You said: 'Yesterday I goed to the library.' Which is correct?", options: ["Yesterday I goed to the library.", "Yesterday I went to the library.", "Yesterday I go to the library."], correctIndex: 1, feedback: "You said 'goed' — the past of GO is **went** (an irregular verb: go → went → gone). Say it: 'Yesterday I went to the library.'", audioScript: "Yesterday I went to the library." },
                { question: "You said: 'I seed my friend Sara.' Which is correct?", options: ["I saw my friend Sara.", "I seed my friend Sara.", "I seen my friend Sara."], correctIndex: 0, feedback: "You said 'seed' — the past of SEE is **saw** (see → saw → seen). Say it: 'I saw my friend Sara.'", audioScript: "I saw my friend Sara." },
                { question: "You said: 'I buyed a coffee.' Which is correct?", options: ["I buyed a coffee.", "I bought a coffee.", "I buy a coffee."], correctIndex: 1, feedback: "You said 'buyed' — the past of BUY is **bought** (buy → bought → bought). Say it: 'I bought a coffee.'", audioScript: "I bought a coffee." },
                { question: "You said: 'I feeled more happy.' Which is correct?", options: ["I felt happier.", "I feeled more happy.", "I feel more happy."], correctIndex: 0, feedback: "You said 'feeled' — the past of FEEL is **felt** (feel → felt → felt), and we say *happier*, not 'more happy'. Say it: 'I felt happier.'", audioScript: "I felt happier." },
              ]
            })
          },
          {
            type: "dictation", title: "Write the corrected sentence", skillLabel: "Writing", skillIcon: "fas fa-pen",
            content: JSON.stringify({
              items: [
                { text: "Yesterday I went to the library to study for my exam.", audioScript: "Yesterday I went to the library to study for my exam.", feedback: "You said: 'goed' → **went**, and 'libary' → **library** (LI-bra-ry). Study is one word — you wrote 'studdy'." },
                { text: "She said the test is hard, but we can pass.", audioScript: "She said the test is hard, but we can pass.", feedback: "You said: 'sayed' → **said**. Remember: say → said → said, one short 'e' sound." },
              ]
            })
          },
          {
            type: "pronunciation", title: "Say the corrected sentence aloud", skillLabel: "Pronunciation", skillIcon: "fas fa-microphone",
            content: JSON.stringify({
              items: [
                { text: "Yesterday I went to the library to study for my exam.", feedback: "You said 'libary' — it is **library**, LI-bra-ry, three clear syllables. Practice slowly, then faster." },
                { text: "I bought a coffee, and I felt happier.", feedback: "You said 'buyed' and 'feeled' — both are irregular pasts: **bought** and **felt**. Hear the difference: bo-t, fe-lt." },
              ]
            })
          },
        ]
      },
      {
        title: "Level 2: Integrated Skills", color: "#CE82FF", xpReward: 50,
        activities: [
          {
            type: "audio_matching", title: "Listen and match the fix", skillLabel: "Listening + Grammar", skillIcon: "fas fa-headphones-alt",
            content: JSON.stringify({
              pairs: [
                { audioScript: "The past of go is went.", term: "goed", definition: "went — past of GO", feedback: "You said 'goed' — the correct past is **went**." },
                { audioScript: "The past of see is saw.", term: "seed", definition: "saw — past of SEE", feedback: "You said 'seed' — the correct past is **saw**." },
                { audioScript: "The past of say is said.", term: "sayed", definition: "said — past of SAY", feedback: "You said 'sayed' — the correct past is **said**." },
                { audioScript: "The past of buy is bought.", term: "buyed", definition: "bought — past of BUY", feedback: "You said 'buyed' — the correct past is **bought**." },
              ]
            })
          },
          {
            type: "cloze", title: "Fill in the correct past", skillLabel: "Grammar + Writing", skillIcon: "fas fa-edit",
            content: JSON.stringify({
              items: [
                { text: "Yesterday I [went] to the library.", hint: "past of GO (you said 'goed')", feedback: "go → **went** → gone. You said 'goed' — irregular verbs never take -ed." },
                { text: "I [saw] my friend Sara there.", hint: "past of SEE (you said 'seed')", feedback: "see → **saw** → seen. You said 'seed' — the past of see is saw." },
                { text: "I [bought] a coffee after.", hint: "past of BUY (you said 'buyed')", feedback: "buy → **bought** → bought. You said 'buyed'." },
                { text: "I [felt] happier after that.", hint: "past of FEEL (you said 'feeled')", feedback: "feel → **felt** → felt. You said 'feeled'." },
              ]
            })
          },
          {
            type: "true_false", title: "Learner version or corrected?", skillLabel: "Listening", skillIcon: "fas fa-headphones",
            content: JSON.stringify({
              items: [
                { audioScript: "I goed to the library yesterday.", question: "Is this the CORRECT sentence?", options: ["True", "False"], correctIndex: 1, feedback: "Correct — this is the learner version. The fixed sentence: 'I went to the library yesterday.'" },
                { audioScript: "She said the test is hard.", question: "Is this the CORRECT sentence?", options: ["True", "False"], correctIndex: 0, feedback: "Correct — 'said' is the right past of SAY. The learner said 'sayed'." },
                { audioScript: "I seed my friend Sara at the library.", question: "Is this the CORRECT sentence?", options: ["True", "False"], correctIndex: 1, feedback: "Correct — 'seed' is the learner version. The fix: 'I saw my friend Sara at the library.'" },
              ]
            })
          },
        ]
      },
      {
        title: "Level 3: Complex Integration", color: "#1CB0F6", xpReward: 70,
        activities: [
          {
            type: "multiple_choice", title: "Why was it wrong?", skillLabel: "Grammar", skillIcon: "fas fa-brain",
            content: JSON.stringify({
              items: [
                { question: "You said 'goed'. What kind of error is it?", options: ["A pronunciation error", "An irregular past-tense error", "A word-order error"], correctIndex: 1, feedback: "**goed** is a grammar error: GO is irregular (go → went → gone), so we never add -ed." },
                { question: "You said 'libary'. What kind of error is it?", options: ["A pronunciation/spelling error", "A tense error", "A vocabulary error"], correctIndex: 0, feedback: "**libary** is a pronunciation and spelling error: the word is **library** — LI-bra-ry." },
                { question: "Which sentence is correct?", options: ["I felt happier after the coffee.", "I feeled more happy after the coffee.", "I felt more happier after the coffee."], correctIndex: 0, feedback: "**felt** is the past of FEEL, and we say *happier* — one comparative form, never 'more happier'." },
              ]
            })
          },
          {
            type: "scramble", title: "Build the corrected sentence", skillLabel: "Writing", skillIcon: "fas fa-puzzle-piece",
            content: JSON.stringify({
              items: [
                { sentence: "Yesterday | I | went | to the library | to study | for my exam.", feedback: "You said 'goed' and 'libary' — here is the full fix: went + library + study." },
                { sentence: "I | saw | my friend Sara | at the library | yesterday.", feedback: "You said 'seed' — the correct past is **saw**." },
                { sentence: "I | bought | a coffee, | and | I | felt | happier.", feedback: "Two fixes in one: **bought** (buyed) and **felt** (feeled) + happier." },
              ]
            })
          },
        ]
      },
      {
        title: "Level 4: Mastery Review", color: "#FF4B4B", xpReward: 90,
        activities: [
          {
            type: "multiple_choice", title: "Your real errors, mixed", skillLabel: "Review", skillIcon: "fas fa-graduation-cap",
            content: JSON.stringify({
              items: [
                { question: "Choose the correct sentence.", options: ["I buyed a coffee yesterday.", "I bought a coffee yesterday.", "I bought a coffee yesteday."], correctIndex: 1, feedback: "**bought** (not buyed) and *yesterday* (not yesteday) — two of your real errors, fixed together." },
                { question: "She ___ the test is hard.", options: ["said", "sayed", "says yesterday"], correctIndex: 0, feedback: "**said** — say → said → said. You said 'sayed' in class." },
                { question: "We studied at the ___.", options: ["libary", "library", "libery"], correctIndex: 1, feedback: "**library** — LI-bra-ry, three syllables. You said 'libary'." },
              ]
            })
          },
          {
            type: "dictation", title: "Full corrected story", skillLabel: "Listening + Writing", skillIcon: "fas fa-keyboard",
            content: JSON.stringify({
              items: [
                { text: "Yesterday I went to the library to study for my exam. I saw my friend Sara there. She said the test is hard, but we can pass. I bought a coffee after, and I felt happier.", audioScript: "Yesterday I went to the library to study for my exam. I saw my friend Sara there. She said the test is hard, but we can pass. I bought a coffee after, and I felt happier.", feedback: "The whole corrected story — every error from your transcript is fixed: went, library, study, saw, said, bought, felt." },
              ]
            })
          },
        ]
      },
    ]
  }, null, 2),

  simulations: JSON.stringify([
      {
          id: "sim_1",
          title: "Job Interview",
          role: "Candidate",
          aiRole: "HR Manager",
          context: "Applying for a software engineer role.",
          objectives: ["Introduce yourself.", "Explain a past project.", "Negotiate salary."],
          startingPrompt: "Hello, please take a seat. Tell me about your background."
      },
      {
          id: "sim_2",
          title: "Restaurant Complaint",
          role: "Customer",
          aiRole: "Waiter",
          context: "Your soup is cold.",
          objectives: ["Call the waiter.", "Politely explain the issue.", "Ask for a replacement."],
          startingPrompt: "How is everything tasting over here?"
      }
  ], null, 2),

  studyGuide: JSON.stringify({
      title: "Mastering the Present Perfect",
      overview: "A comprehensive guide to understanding and using the present perfect tense.",
      sections: [
          {
              title: "Form and Structure",
              content: "<p>The present perfect is formed with <b>have/has + past participle</b>.</p>"
          },
          {
              title: "Usage 1: Unfinished Past",
              content: "<p>Use it for actions starting in the past and continuing to the present.</p>"
          }
      ]
  }, null, 2),

  slides: JSON.stringify({
      slides: [
          { title: "Introduction", content: "<p>Welcome to our presentation.</p>", notes: "Speak clearly and smile." },
          { title: "Main Point", content: "<ul><li>First point</li><li>Second point</li></ul>", notes: "Elaborate on the second point." },
          { title: "Conclusion", content: "<p>Thank you for listening.</p>", notes: "Take questions from the audience." }
      ]
  }, null, 2),

  printableWorksheet: JSON.stringify({
      title: "Grammar Review Worksheet",
      instructions: "Complete the following exercises.",
      questions: [
          { type: "blank", text: "1. The quick brown fox jumps _____ the lazy dog." },
          { type: "question", text: "2. Explain the difference between 'their', 'there', and 'they're'." }
      ]
  }, null, 2),

  testLab: JSON.stringify({
    // Test Lab Activity — feeds the real Testing Panel (utils/html/testingPanel.ts).
    // `content` is the activity queue; every supported activity type is included
    // so the Gallery mock demonstrates the FULL lab (the queue cycles up to 24 tiles).
    settings: {
      title: "🧪 Test Lab Activity",
      cefrLevel: "B1",
      readAloudVoice: "Microsoft Ava Multilingual Online (Natural)"
    },
    content: [
      {
        type: "multiple_choice",
        timer_seconds: 90,
        questions: [
          {
            question: "The scientist _____ a new element during the experiment.",
            options: ["discovered", "invented", "painted", "cooked"],
            answer: "discovered",
            explanation: "'Discovered' is used for finding something that already existed.",
            phone_clue: "Scientists discover things that already exist — they don't invent elements!",
            caller_name: "Dr. Curie",
            caller_voice: "en-US-AriaNeural"
          },
          {
            question: "Which word means 'to test a hypothesis'?",
            options: ["to verify", "to ignore", "to forget", "to decorate"],
            answer: "to verify",
            explanation: "Verifying means checking whether a hypothesis is correct."
          },
          {
            question: "Choose the correct passive form: 'The lab report ___ by the students.'",
            options: ["was written", "wrote", "writing", "were write"],
            answer: "was written",
            explanation: "Passive voice with a singular subject: was + past participle."
          },
          {
            question: "What does 'under the microscope' mean idiomatically?",
            options: ["being examined very closely", "being cleaned", "being hidden", "being built"],
            answer: "being examined very closely",
            explanation: "It means something is being inspected in great detail."
          },
          {
            question: "'The mixture reacted instantly.' — the adverb 'instantly' means…",
            options: ["immediately", "slowly", "never", "yesterday"],
            answer: "immediately",
            explanation: "Instantly = happening at once, with no delay."
          }
        ]
      },
      {
        type: "true_false",
        timer_seconds: 20,
        questions: [
          { statement: "Water boils at 100°C at sea level.", answer: "True", explanation: "Yes — that is the boiling point of water at standard pressure." },
          { statement: "Sound travels faster than light.", answer: "False", explanation: "Light travels about a million times faster than sound." },
          { statement: "'Hypothesis' means a testable prediction.", answer: "True", explanation: "A hypothesis is an educated guess you can test with an experiment." },
          { statement: "Oxygen is the most abundant gas in Earth's atmosphere.", answer: "False", explanation: "Nitrogen (about 78%) is the most abundant; oxygen is about 21%." }
        ]
      },
      {
        type: "matching",
        timer_seconds: 60,
        pairs: [
          { left: "Hypothesis", right: "A testable prediction" },
          { left: "Experiment", right: "A controlled test of an idea" },
          { left: "Data", right: "The information you collect" },
          { left: "Conclusion", right: "What the results tell you" },
          { left: "Control group", right: "The group that gets no treatment" },
          { left: "Variable", right: "The factor that can change" }
        ]
      },
      {
        type: "scramble",
        timer_seconds: 60,
        sentences: [
          { sentence: "The | scientist | recorded | the | results", hint: "Start with 'The'" },
          { sentence: "She | tested | her | hypothesis | twice", hint: "Who did the action first?" },
          { sentence: "The | lab | was | quiet | and | bright", hint: "Start with 'The lab'" }
        ]
      },
      {
        type: "cloze",
        timer_seconds: 120,
        text_with_gaps: "First, the scientist _____ a question. Then she formed a _____ and designed an experiment to test it. After collecting the _____, she analysed the numbers and wrote a clear _____. Finally, she shared her findings with the _____.",
        gaps: [
          { correct: "asked", options: ["asked", "cooked", "played", "painted"] },
          { correct: "hypothesis", options: ["hypothesis", "sandwich", "melody", "garden"] },
          { correct: "data", options: ["data", "clouds", "tickets", "leaves"] },
          { correct: "conclusion", options: ["conclusion", "recipe", "poster", "map"] },
          { correct: "team", options: ["team", "rocket", "river", "market"] }
        ]
      },
      {
        type: "reading_activity",
        timer_seconds: 120,
        visible_text: "Dr. Amina's team studied how plants react to different amounts of light. They grew forty bean plants in four groups. Each group received a different number of hours of light per day. After three weeks, they measured the height of every plant. The group with eight hours of light grew tallest, while the group with only two hours grew least.",
        question: "Which group of plants grew the tallest?",
        options: ["The group with eight hours of light", "The group with two hours of light", "The group with no light", "All groups grew equally"],
        answer: "The group with eight hours of light"
      },
      {
        type: "listening_activity",
        timer_seconds: 90,
        text_to_match: "The experiment produced surprising results that changed our understanding of the reaction.",
        question: "Listen carefully and choose the sentence you hear.",
        options: [
          "The experiment produced surprising results that changed our understanding of the reaction.",
          "The experiment produced boring results that confused our understanding of the reaction.",
          "The experiment produced clear results that removed our understanding of the reaction."
        ],
        answer: "The experiment produced surprising results that changed our understanding of the reaction."
      },
      {
        type: "conversation_completion",
        timer_seconds: 180,
        situation: "You are a lab assistant speaking with Dr. Reed, the lead researcher, about an experiment that failed twice. Choose the most appropriate replies to keep the project on track.",
        characters: [
          { name: "Dr. Reed", role: "Lead Researcher", emoji: "👩‍🔬", voice: "Microsoft Ava Multilingual Online (Natural)", style: "calm but pressured" },
          { name: "Sam", role: "Lab Assistant", emoji: "🧑‍🔬", voice: "en-US-GuyNeural", style: "nervous but honest" }
        ],
        turns: [
          {
            speaker: "Dr. Reed",
            text: "The calibration failed again. What do you think went wrong this time?",
            options: [
              { text: "I think the temperature sensor was off — let me check it and run the test again.", register: "Problem-solving", politeness: "Polite & Professional", directness: "Direct", perspective: "Takes initiative", reactions: { "Dr. Reed": "👍", "Sam": "😅" }, appropriateness: "acceptable", score: 15, feedback: "Excellent — you identified a cause and proposed a concrete next step." },
              { text: "Not my job — you calibrated it last time.", register: "Defensive", politeness: "Rude", directness: "Blunt", perspective: "Blames others", reactions: { "Dr. Reed": "😠", "Sam": "😳" }, appropriateness: "unacceptable", score: -10, feedback: "Blaming a colleague damages teamwork — focus on solving the problem together." },
              { text: "Maybe we should check the manual together and recalibrate step by step.", register: "Collaborative", politeness: "Polite", directness: "Moderate", perspective: "Team approach", reactions: { "Dr. Reed": "🤔", "Sam": "🙂" }, appropriateness: "acceptable", score: 12, feedback: "Good collaborative framing — a shared check keeps everyone on the same page." },
              { text: "Let's just buy a new machine and forget about this one.", register: "Reckless", politeness: "Impatient", directness: "Direct", perspective: "Avoids diagnosis", reactions: { "Dr. Reed": "🙄", "Sam": "😬" }, appropriateness: "poor", score: 3, feedback: "Jumping to expensive solutions before diagnosing the issue wastes budget." }
            ]
          },
          {
            speaker: "Sam",
            text: "I'm nervous about presenting these numbers to the board tomorrow.",
            options: [
              { text: "That's completely understandable — let's rehearse together tonight so you feel ready.", register: "Supportive", politeness: "Kind", directness: "Direct", perspective: "Emotional support", reactions: { "Dr. Reed": "❤️", "Sam": "😊" }, appropriateness: "acceptable", score: 15, feedback: "Perfect — you validated the feeling and offered practical help." },
              { text: "It's just numbers — stop being dramatic.", register: "Dismissive", politeness: "Cold", directness: "Blunt", perspective: "Minimises feelings", reactions: { "Dr. Reed": "😐", "Sam": "😢" }, appropriateness: "unacceptable", score: -8, feedback: "Dismissing a colleague's anxiety hurts morale and trust." },
              { text: "I felt the same before my first presentation — practising out loud really helped me.", register: "Empathetic", politeness: "Warm", directness: "Moderate", perspective: "Shared experience", reactions: { "Dr. Reed": "🙂", "Sam": "😌" }, appropriateness: "acceptable", score: 14, feedback: "Great — sharing your own experience builds genuine rapport." }
            ]
          },
          {
            speaker: "Dr. Reed",
            text: "We need to decide: repeat the experiment or move to a new sample?",
            options: [
              { text: "Let's review last week's data first, then decide together based on what it shows.", register: "Analytical", politeness: "Polite", directness: "Direct", perspective: "Data-driven", reactions: { "Dr. Reed": "🤓", "Sam": "👍" }, appropriateness: "acceptable", score: 15, feedback: "Strong choice — decisions backed by data are hard to argue with." },
              { text: "Repeat it — I already know the answer.", register: "Arrogant", politeness: "Rude", directness: "Blunt", perspective: "Ignores evidence", reactions: { "Dr. Reed": "😒", "Sam": "😕" }, appropriateness: "poor", score: 0, feedback: "Asserting certainty without evidence can waste the whole team's time." }
            ]
          },
          {
            speaker: "Sam",
            text: "One more thing — the printer is out of ink for the report.",
            options: [
              { text: "No problem, I'll order ink now and we can print tomorrow morning.", register: "Practical", politeness: "Polite", directness: "Direct", perspective: "Solves immediately", reactions: { "Dr. Reed": "👍", "Sam": "😄" }, appropriateness: "acceptable", score: 12, feedback: "Quick, calm problem-solving keeps the project moving." },
              { text: "Again?! This lab is hopeless.", register: "Complaining", politeness: "Negative", directness: "Blunt", perspective: "Focuses on blame", reactions: { "Dr. Reed": "😐", "Sam": "🙁" }, appropriateness: "poor", score: 2, feedback: "Constant negativity drains the team — offer solutions instead." }
            ]
          }
        ]
      },
      {
        type: "discussion",
        timer_seconds: 180,
        prompts: [
          {
            question: "Should governments spend more money on space exploration or on solving problems on Earth? Give two reasons for your answer.",
            checklist: ["Give a clear opinion", "Support it with two reasons", "Use at least one linking word (because, although, however)"]
          },
          {
            question: "If you could invent one machine to help people learn English, what would it do?",
            checklist: ["Describe the machine", "Explain how it helps", "Mention one limitation"]
          }
        ]
      },
      {
        type: "jam",
        timer_seconds: 60,
        topic: "My most memorable science class",
        checklist: ["Say what happened", "Describe how you felt", "Explain why you remember it", "Keep talking without long pauses"]
      },
      {
        type: "truth_dare",
        timer_seconds: 120,
        truths: ["Say three English words you learned this week.", "Describe your dream job in one sentence.", "Name a country you want to visit and why."],
        dares: ["Spell 'experiment' aloud.", "Say the alphabet backwards as fast as you can.", "Describe your morning routine in 30 seconds."]
      },
      {
        type: "hot_seat",
        timer_seconds: 300,
        questions: ["Describe 'gravity' without using the word 'fall'.", "Explain what a scientist does.", "Describe 'energy' in one sentence.", "What is a microscope used for?", "Explain the word 'experiment' to a 10-year-old.", "Describe 'discovery' without using the word 'find'."]
      },
      {
        type: "taboo",
        timer_seconds: 60,
        cards: [
          { target_word: "Experiment", forbidden_words: ["test", "lab", "try"] },
          { target_word: "Scientist", forbidden_words: ["lab", "research", "person"] },
          { target_word: "Microscope", forbidden_words: ["small", "see", "lens"] },
          { target_word: "Data", forbidden_words: ["numbers", "information", "results"] }
        ]
      },
      {
        type: "would_you_rather",
        timer_seconds: 90,
        questions: [
          { scenario: "Which discovery would you rather make?", option_a: "A cure for a common disease", option_b: "A new renewable energy source", story_a: "chose to discover a cure that saves millions of lives", story_b: "chose to invent clean energy that powers whole cities" },
          { scenario: "Where would you rather do research?", option_a: "On a space station", option_b: "In a deep-sea submarine", story_a: "chose to research in the weightless silence of orbit", story_b: "chose to explore the dark mysteries of the ocean floor" },
          { scenario: "Which superpower would you pick for a day?", option_a: "Understand every language instantly", option_b: "Remember everything you ever read", story_a: "chose to understand every language on Earth", story_b: "chose to recall every page of every book" }
        ]
      }
    ]
  }, null, 2),

  explainerLesson: JSON.stringify({
    // Detailed Table of Contents — powers the Lesson Settings media AI prompt + the Learner Path log
    tableOfContents: [
      { section: 1, title: "🔎 Section 1: What Is a Blockchain?", overview: "A plain-English reading that introduces what a blockchain is and why it matters, followed by a vocabulary table for the core terms (ledger, block, node, hash, miner) and two quick comprehension checks.", skills: ["reading", "vocabulary"], activityHighlights: ["reading passage", "vocabulary table", "true/false", "multiple choice"] },
      { section: 2, title: "🧱 Section 2: Blocks, Hashes & the Chain", overview: "How a block is built and linked to the previous one: flashcards of the parts of a chain, a matching game connecting terms to plain definitions, a gap-fill retelling the process and a sentence unscramble.", skills: ["vocabulary", "grammar"], activityHighlights: ["flashcards", "matching", "gap-fill", "scramble"] },
      { section: 3, title: "🔐 Section 3: Why Is It Secure?", overview: "The three security pillars — decentralisation, hashing and consensus — explored through a sorting game (centralised vs decentralised), myth-busting true/false statements and a multiple-choice check.", skills: ["reading", "critical thinking"], activityHighlights: ["sorting game", "true/false", "multiple choice"] },
      { section: 4, title: "🗣️ Section 4: Explain It in Your Own Words", overview: "Production and review: a timed speaking challenge where the learner explains blockchain to a friend, reflection questions to fix their own mental model, a recap quiz and a final flashcard sweep.", skills: ["speaking", "writing", "review"], activityHighlights: ["speaking challenge", "reflection questions", "recap quiz", "flashcards"] }
    ],
    sections: [
      {
        title: "🔎 Section 1: What Is a Blockchain?",
        summary: "Introduces blockchain in plain English with a short reading, a core-term vocabulary table and two comprehension checks.",
        color: "#2563eb",
        studyTime: "15 mins",
        xpReward: 100,
        activities: [
          {
            title: "📖 The Big Idea",
            type: "paragraph",
            content: "<p>Think of a blockchain as a shared notebook that thousands of computers hold at the same time. When someone writes a new page, every computer checks it and adds the same page to its own notebook. Because no single person owns the notebook, nobody can quietly change a page after it has been written. That is why people use blockchains to record money (Bitcoin), track goods in shops, and prove who owns what.</p><p><b>Key idea:</b> a blockchain is a shared record that nobody can secretly edit.</p>",
            comprehensiveFeedback: "A blockchain is a shared record held by many computers — because no one owns it alone, no one can edit it secretly."
          },
          {
            title: "📊 Core Vocabulary",
            type: "vocabulary_table",
            content: JSON.stringify([
              { word: "Ledger", translation: "سجل / دفتر الأستاذ", definition: "A record of all transactions or events.", example: "The blockchain ledger shows every payment ever made.", ccq: "Is a receipt a kind of ledger?" },
              { word: "Block", translation: "كتلة", definition: "One page of the notebook — a group of new records.", example: "Each block can hold hundreds of transactions.", ccq: "Does one block hold all the records ever made?" },
              { word: "Node", translation: "عقدة", definition: "A computer that keeps a copy of the blockchain.", example: "There are thousands of nodes around the world.", ccq: "Is your phone a node in the Bitcoin network?" },
              { word: "Hash", translation: "تجزئة", definition: "A unique digital fingerprint of a block's data.", example: "Changing one word changes the whole hash.", ccq: "Can two different blocks have the same hash?" },
              { word: "Miner", translation: "معدِّن", definition: "A node that checks new records and adds a new block.", example: "Miners are paid a small fee for their work.", ccq: "Does every node have to be a miner?" }
            ]),
            comprehensiveFeedback: "Say each term in a full sentence: 'A ledger is a record of transactions.' Using the word actively fixes it in memory."
          },
          {
            title: "✅ True or False?",
            type: "true_false",
            content: JSON.stringify({
              questions: [
                { question: "A blockchain is owned by one big company.", answer: "False", explanation: "It is shared by thousands of computers — no single owner." },
                { question: "A blockchain is a kind of shared notebook.", answer: "True", explanation: "The reading calls it 'a shared notebook that thousands of computers hold'." },
                { question: "Records on a blockchain can be quietly changed later.", answer: "False", explanation: "Every computer checks each new page, so secret edits are impossible." },
                { question: "Bitcoin uses a blockchain to record payments.", answer: "True", explanation: "Bitcoin was the first famous use of blockchain for money." }
              ]
            }),
            comprehensiveFeedback: "3-4 correct? You have the core idea. Fewer — re-read the passage once and try the vocabulary cards again."
          },
          {
            title: "🧠 Quick Check",
            type: "multiple_choice",
            content: JSON.stringify({
              questions: [
                { question: "What is the main idea of a blockchain?", options: ["A shared record nobody can secretly edit", "A private folder on one computer", "A social media platform"], answer: "A shared record nobody can secretly edit", explanation: "That is the 'key idea' of the reading." },
                { question: "Who checks a new page before it is added?", options: ["Only the company that owns it", "The many computers holding the notebook", "One central bank"], answer: "The many computers holding the notebook", explanation: "Every node verifies before the block is added." },
                { question: "What was Bitcoin the first famous use of?", options: ["Online voting", "Blockchain for money", "Cloud storage"], answer: "Blockchain for money", explanation: "Bitcoin showed the world that money could live on a blockchain." }
              ]
            }),
            comprehensiveFeedback: "Every answer should come straight from the reading — if one surprised you, highlight that sentence in the passage."
          }
        ]
      },
      {
        title: "🧱 Blocks, Hashes & the Chain",
        summary: "Explains how blocks are built and linked through flashcards, matching, gap-fill and a sentence scramble.",
        color: "#7c3aed",
        studyTime: "20 mins",
        xpReward: 130,
        activities: [
          {
            title: "⚡ Flashcards: Parts of a Chain",
            type: "flashcard",
            content: JSON.stringify({
              cards: [
                { front: "Block", back: "One page of the notebook holding new records.", example: "Block #810,000 contains about 2,000 transactions." },
                { front: "Hash", back: "The digital fingerprint that makes a block unique.", example: "Hash: 0000a3f9… — change one word and the whole hash changes." },
                { front: "Previous hash", back: "The fingerprint of the block before — this is what links blocks together.", example: "Each block stores the hash of the one above it." },
                { front: "Chain", back: "All the blocks linked in order by their hashes.", example: "Tampering with block 5 breaks every block after it." }
              ]
            }),
            comprehensiveFeedback: "The 'previous hash' is the glue: it chains each block to the one before it, like links in a necklace."
          },
          {
            title: "🔗 Match the Term to Its Job",
            type: "matching",
            content: JSON.stringify({
              pairs: [
                { left: "Ledger", right: "The full record of everything that happened" },
                { left: "Block", right: "A batch of new records added at one time" },
                { left: "Hash", right: "The unique fingerprint of a block's data" },
                { left: "Previous hash", right: "The link that connects one block to the last one" },
                { left: "Miner", right: "The node that checks records and adds a block" }
              ]
            }),
            comprehensiveFeedback: "Every part of a chain has one job — if you can explain all five from memory, you understand the machinery."
          },
          {
            title: "✍️ How a Transaction Gets Added",
            type: "gap_fill",
            content: JSON.stringify({
              sentences: [
                { text: "First, someone ___ a transaction to the network.", answer: "sends", hint: "verb: to make something go somewhere" },
                { text: "Miners ___ the transaction to make sure it is valid.", answer: "check", hint: "verb: to look at something carefully" },
                { text: "The checked records are grouped into a new ___.", answer: "block", hint: "one page of the notebook" },
                { text: "Each block stores the ___ of the previous block.", answer: "hash", hint: "digital fingerprint" },
                { text: "Finally, the new block is ___ to every node's copy.", answer: "added", hint: "past tense of 'add'" }
              ]
            }),
            comprehensiveFeedback: "The order is: send → check → group → link → share. Say it aloud with your hand as a chain of blocks."
          },
          {
            title: "🔀 Unscramble the Process",
            type: "scramble",
            content: JSON.stringify({
              sentences: [
                { sentence: "Miners | check | the | new | transaction", hint: "Start with who does the action" },
                { sentence: "Each | block | stores | the | previous | hash", hint: "What does each block store?" },
                { sentence: "Every | node | keeps | a | copy | of | the | chain", hint: "Start with 'Every'" }
              ]
            }),
            comprehensiveFeedback: "Word order carries meaning in English — these three sentences are the whole process in miniature."
          }
        ]
      },
      {
        title: "🔐 Why Is It Secure?",
        summary: "Covers the three security pillars with a sorting game, myth-busting true/false items and a multiple-choice check.",
        color: "#059669",
        studyTime: "20 mins",
        xpReward: 150,
        activities: [
          {
            title: "🗂️ Centralised vs Decentralised",
            type: "sorting",
            content: JSON.stringify({
              categories: ["Centralised (one owner)", "Decentralised (many owners)"],
              items: [
                { text: "A bank holds your account records", category: "Centralised (one owner)" },
                { text: "Thousands of nodes hold the same ledger", category: "Decentralised (many owners)" },
                { text: "The owner can change records", category: "Centralised (one owner)" },
                { text: "No single person can edit alone", category: "Decentralised (many owners)" },
                { text: "Your school stores all student files", category: "Centralised (one owner)" },
                { text: "Everyone checks everyone else's work", category: "Decentralised (many owners)" }
              ]
            }),
            comprehensiveFeedback: "Security comes from decentralisation: with thousands of copies, one dishonest computer cannot win."
          },
          {
            title: "✅ Myth or Fact?",
            type: "true_false",
            content: JSON.stringify({
              questions: [
                { question: "To cheat a blockchain you must edit most of its computers at once.", answer: "True", explanation: "Attackers would need to control over half the network — extremely hard and expensive." },
                { question: "If a hash changes, the blocks after it are unaffected.", answer: "False", explanation: "Each block stores the previous hash, so a change breaks every following block." },
                { question: "A blockchain is useful for tracking goods in a supply chain.", answer: "True", explanation: "Companies use it to prove where products really came from." },
                { question: "Blockchains are always faster than a normal database.", answer: "False", explanation: "The safety checks make blockchains slower — speed is the trade-off for trust." }
              ]
            }),
            comprehensiveFeedback: "Remember the trade-off: blockchains trade speed for trust. No single point of failure — but nothing is instant."
          },
          {
            title: "🧠 Which Answer Is Right?",
            type: "multiple_choice",
            content: JSON.stringify({
              questions: [
                { question: "Why can't someone secretly rewrite an old block?", options: ["The file is password-protected", "It would break the hash chain of every later block", "Old blocks are deleted after a year"], answer: "It would break the hash chain of every later block", explanation: "Any change to a block changes its hash — and every block after it notices." },
                { question: "A miner who cheats is likely to…", options: ["Get a bigger reward", "Be ignored by the honest network", "Be paid by the bank"], answer: "Be ignored by the honest network", explanation: "Honest nodes reject bad blocks, so cheaters waste their own electricity." },
                { question: "Which real problem does blockchain solve best?", options: ["Making records editable", "Proving a record has not been changed", "Speeding up every website"], answer: "Proving a record has not been changed", explanation: "Immutability — records that cannot be silently altered — is its superpower." }
              ]
            }),
            comprehensiveFeedback: "Review any misses with the flashcards — the three pillars are decentralisation, hashing and consensus."
          },
          {
            title: "💭 Reflect: What Would You Use It For?",
            type: "questions",
            content: "Think of three everyday records in your life (school marks, salary slips, medicine history). Which one would you trust on a blockchain, and why?\nSample thinking: I would trust my medical history because no hospital could lose or edit it — but I would want to control who reads it.\nIf blockchains are public, what could go wrong with putting personal data on one?\nSample thinking: Everyone could see it forever, so private data needs permission or encryption.\nDo you think 'trust without a middleman' is always a good thing? Why or why not?\nSample thinking: It removes fees and gatekeepers, but also removes someone to call when things go wrong.",
            comprehensiveFeedback: "There is no single right answer — strong answers name one benefit AND one risk. That balance is real blockchain thinking."
          }
        ]
      },
      {
        title: "🗣️ Explain It in Your Own Words",
        summary: "Production and review: speaking challenge, reflection, recap quiz and flashcard sweep to lock the lesson in.",
        color: "#d97706",
        studyTime: "20 mins",
        xpReward: 180,
        activities: [
          {
            title: "⏱️ Speaking Challenge: The 60-Second Explainer",
            type: "speaking_jam",
            content: JSON.stringify({
              topic: "Explain blockchain to a friend in 60 seconds — without using the words 'ledger' or 'miner'. Use the notebook picture instead.",
              tips: ["Open with why it exists: money without a bank", "Use the notebook image — shared, checked, chained", "Finish with one real example (Bitcoin, tracking goods)"],
              minTimeSec: 60
            }),
            comprehensiveFeedback: "Great explainers use one image and one example. If you can teach it simply, you truly understand it."
          },
          {
            title: "✍️ Reflect & Write It Down",
            type: "questions",
            content: "In 3-4 sentences, write what happens from the moment you send money until it appears on the chain.\nModel answer: I send the transaction, and nodes pass it around the network. Miners check it is valid and group it with others into a block. The block stores the previous block's hash, linking them like a chain. Finally every node adds the block to its own copy of the ledger.\nWhich word was hardest to explain — hash or node? Write your own definition for it.\nModel answer: A node is any computer that keeps a full copy of the blockchain and helps check new records.",
            comprehensiveFeedback: "Compare your summary with the model — you need all five steps: send, check, group, link, share."
          },
          {
            title: "🏁 Recap Quiz",
            type: "multiple_choice",
            content: JSON.stringify({
              questions: [
                { question: "A block is linked to the one before it by…", options: ["Its colour code", "Storing the previous block's hash", "A password"], answer: "Storing the previous block's hash", explanation: "The previous hash is the chain's glue." },
                { question: "Which is a benefit of decentralisation?", options: ["One company can fix mistakes fast", "No single point of failure", "Transactions are instant"], answer: "No single point of failure", explanation: "Thousands of copies mean one bad computer cannot corrupt the record." },
                { question: "The main trade-off of blockchain is…", options: ["Speed for trust", "Trust for cost", "Privacy for speed"], answer: "Speed for trust", explanation: "All those checks make it slower but safer." },
                { question: "You would most trust a blockchain to record…", options: ["A private diary", "Land ownership that must never be rewritten", "A shopping list"], answer: "Land ownership that must never be rewritten", explanation: "Immutability matters most when records must stay exactly as they were." }
              ]
            }),
            comprehensiveFeedback: "Score 4/4 — you can now explain blockchain to anyone. Missed one? Re-run Section 2 flashcards before you go."
          },
          {
            title: "⚡ Final Flashcard Sweep",
            type: "flashcard",
            content: JSON.stringify({
              cards: [
                { front: "Blockchain", back: "A shared record held by many computers that nobody can secretly edit.", example: "Bitcoin runs on a blockchain." },
                { front: "Hash", back: "A unique fingerprint of a block's data — change the data, change the fingerprint.", example: "0000a3f9…" },
                { front: "Consensus", back: "The network agreeing a block is valid before it is added.", example: "Honest nodes reject the cheater's block." },
                { front: "Immutability", back: "Records that cannot be changed once added.", example: "Land records on a blockchain cannot be quietly rewritten." }
              ]
            }),
            comprehensiveFeedback: "Say each card aloud in a sentence before flipping it. Done? You have officially explained blockchain — in English."
          }
        ]
      }
    ],
    lessonSummary: "Explainer micro-lesson that takes an adult learner from zero to confidently explaining blockchain in English, using the shared-notebook metaphor throughout.",
    settings: {
      teacherNotes: "The notebook metaphor does the heavy lifting — whenever a learner is lost, return to 'a shared notebook that many computers check'. Keep examples real (Bitcoin, land registry, medicine history).",
      homeworkChecklist: "Teach the 60-second explainer to a friend or family member and record it. Re-run Section 4 flashcards once more tomorrow.",
      materialLinks: ""
    }
  }, null, 2),

  lessonPlan: JSON.stringify({
     plan: "<h1>Lesson Plan: Phrasal Verbs</h1><h2>Objectives</h2><ul><li>Identify common phrasal verbs.</li><li>Use them in context.</li></ul><h2>Materials</h2><p>Printouts and flashcards.</p>"
  }, null, 2),

  forTeachers: JSON.stringify({
     plan: "<h1>Teacher's Guide</h1><p>Start with a brain warm-up. Ask students what they did over the weekend.</p>"
  }, null, 2),

  conversationGame: JSON.stringify({
    sections: [
      {
        title: "🗣️ Game: Two Truths and a Lie",
        color: "#4CAF50",
        studyTime: "10 mins",
        xpReward: 100,
        activities: [
          {
             title: "Play your turn",
             type: "speaking_jam",
             content: JSON.stringify({
                 topic: "Two Truths and a Lie",
                 duration: "2:00",
                 bullets: ["Share three statements about yourself", "Only two must be true", "Make it convincing!"]
             }),
             comprehensiveFeedback: "Did they guess it?"
          }
        ]
      }
    ]
  }, null, 2),

  placeGame: JSON.stringify({
    sections: [
      {
        title: "🌍 Guess the Place",
        color: "#FF9800",
        studyTime: "5 mins",
        xpReward: 50,
        activities: [
          {
             title: "Read the clues",
             type: "paragraph",
             content: "<p>1. I am located in Europe.<br>2. I have a famous tower.<br>3. People speak French.</p>",
             comprehensiveFeedback: "It was Paris!"
          }
        ]
      }
    ]
  }, null, 2),

  partyMode: JSON.stringify({
    sections: [
      {
        title: "🎉 Party Mode Arena",
        color: "#E91E63",
        studyTime: "30 mins",
        xpReward: 500,
        activities: [
          {
             title: "Quickfire Challenge",
             type: "matching",
             content: JSON.stringify([
                 { left: "Confetti", right: "Small pieces of paper thrown during celebrations." },
                 { left: "Balloon", right: "A small colored rubber bag inflated with air." }
             ]),
             comprehensiveFeedback: "Party on!"
          }
        ]
      }
    ]
  }, null, 2),

  musicLesson: JSON.stringify({
    sections: [
      {
        title: "🎵 Learn with Lyrics",
        color: "#3F51B5",
        studyTime: "15 mins",
        xpReward: 100,
        activities: [
          {
             title: "Listen and fill",
             type: "gap_fill",
             content: JSON.stringify({
                 text: "Hello from the [outside], at least I can say that I've [tried].",
                 blanks: [
                     { word: "outside", hint: "opposite of inside" },
                     { word: "tried", hint: "attempted" }
                 ]
             }),
             comprehensiveFeedback: "Vocals were on point!"
          }
        ]
      }
    ]
  }, null, 2),

  videoLesson: JSON.stringify({
    sections: [
      {
        title: "🎬 Movie Clip Breakdown",
        color: "#000000",
        studyTime: "20 mins",
        xpReward: 150,
        activities: [
          {
             title: "Movie dialogue",
             type: "paragraph",
             content: "<p><b>Hero:</b> I'll be back.<br><b>Villain:</b> Not if I see you first.</p>",
             comprehensiveFeedback: "Action packed vocabulary!"
          }
        ]
      }
    ]
  }, null, 2),

  liveLesson: JSON.stringify({
    sections: [
      {
        title: "💻 Live Lesson Plan",
        color: "#F44336",
        studyTime: "45 mins",
        xpReward: 200,
        activities: [
          {
             title: "Group Brainstorming",
             type: "paragraph",
             hint: "5 minutes · groups of 3",
             content: "Topic: How to survive a zombie apocalypse. In your group decide where to go, what to bring and who to trust. Take turns, and support every idea with because + a reason.",
             comprehensiveFeedback: "Great teamwork!"
          },
          {
             title: "Choose the best plan",
             type: "multiple_choice",
             content: "Which plan gives the group the best chance of surviving the first week?",
             options: ["Stay in the city centre and barricade a shop", "Move to the mountains with stored water", "Split up and travel alone"],
             answer: "Move to the mountains with stored water"
          },
          {
             title: "Survival collocations",
             type: "gap_fill",
             content: "Every group needs to ___ a shelter before nightfall.",
             hint: "verb that means 'build or find'",
             answer: "find"
          },
          {
             title: "Reflect",
             type: "reflection",
             content: "Write one sentence: what would you take with you, and why?",
             comprehensiveFeedback: "Nice reasoning!"
          }
        ]
      }
    ]
  }, null, 2),

  mockTest: JSON.stringify({
    schemaVersion: "2026.2",
    packageType: "exam_authoring_package",
    generationMetadata: {
      generatedAt: "2026-07-12T12:00:00Z",
      contentLocale: "en-GB",
      requestedScope: "representative_mock",
      generationStatus: "complete",
      originalContentOnly: true,
      independentSimulation: true,
      nonEndorsementNotice: "This is an independent simulation, not endorsed by any official exam provider.",
      authoringModelNotes: "A high-fidelity representative mock exam testing reading and writing skills."
    },
    examMetadata: {
      examId: "exam_mock_water_systems_001",
      title: "English Level B2 Mock Examination",
      examFamily: "B2 General Assessment",
      standard: "Independent CEFR B2 diagnostic simulation",
      provider: "Custom independent simulation",
      specificationOrEdition: "2026 Edition",
      deliveryMode: "digital_simulation",
      deliveryAdaptation: "native_digital_practice",
      totalDurationMinutes: 15,
      independentSimulation: true,
      instructions: "Read the passages carefully and answer all questions in the sections provided.",
      officialStructure: {
        duration: { kind: "custom", activeMinutes: 15, administrativeTimeExcluded: true, notes: "Estimated exam duration." },
        itemCount: { kind: "custom", total: 2, countingConvention: "tasks", notes: "A mini diagnostic mock test." },
        components: [],
        breaks: [],
        navigationPolicy: "free_within_section"
      },
      officialPassPolicy: { type: "institution_defined", percentage: null, notes: "Local scoring criteria apply." },
      simulationSettings: { scope: "representative_mock", taskCount: 2, adaptiveMode: "fixed_form_approximation", practiceTargetPercentage: 70 },
      proctoringSettings: {
        enabled: false,
        preventFocusLoss: false,
        maxFocusLossWarnings: 3,
        preventClipboardActions: false,
        preventContextMenu: false,
        preventProtectedSelection: false,
        focusLossBehavior: "continue",
        autoSubmitOnLock: false,
        requireHardwareChecks: { audio: false, microphone: false }
      },
      accessibilitySettings: { reducedMotion: false, largeText: false, highContrast: false, captions: true, extraTimeMultiplier: 1 }
    },
    sections: [
      {
        sectionId: "sec_reading_writing",
        sectionTitle: "Reading & Writing Assessment",
        skillDomain: "integrated_reading_writing",
        instructions: "Read the passage carefully and answer the multiple choice question and the source-grounded writing prompt.",
        durationMinutes: 15,
        navigationPolicy: "free_within_section",
        tasks: [
          {
            taskId: "task_reading_b2",
            taskType: "multiple_choice",
            title: "Reading Comprehension and Inference",
            instructions: "Select the most accurate explanation based on the text.",
            prompt: "Why is a combination of flood control measures recommended over relying on a single paving system?",
            stimulus: {
              passageTitle: "Urban Runoff Management",
              passageText: "Urban environments are highly vulnerable to flash flooding due to the sheer volume of impermeable concrete surfaces. While modern permeable paving systems allow rainfall to percolate through to the soil, they are not a panacea. If a city experiences sustained, high-intensity rainfall, the underlying soil can become completely saturated, and local drainage pipes may quickly exceed their capacity. Therefore, municipal planners recommend a integrated approach: combining permeable pavements with sustainable drainage channels, urban green roofs, and retention basins to distribute and slow the movement of stormwater."
            },
            responseSpec: {
              type: "single_choice",
              options: [
                { optionId: "opt_a", label: "Permeable paving systems are completely ineffective during light showers." },
                { optionId: "opt_b", label: "Sustained heavy rain can saturate the soil and overwhelm local drainage, requiring additional infrastructure to spread the load." },
                { optionId: "opt_c", label: "Local regulations forbid using permeable paving systems in city centers." },
                { optionId: "opt_d", label: "Green roofs are the only proven method to stop urban flooding." }
              ],
              multipleLimit: null,
              minWords: null,
              maxWords: null,
              minCharacters: null,
              maxCharacters: null,
              rows: 1,
              tokens: [],
              gaps: [],
              preparationSeconds: 0,
              responseSeconds: 120,
              maxAttempts: 1,
              spellcheck: false,
              placeholder: "",
              unitLabel: ""
            },
            estimatedTimeSeconds: 120,
            publicMarks: 1,
            required: true,
            psychometric: { primarySkill: "inference", secondarySkills: ["synthesis"], difficulty: "CEFR B2", cognitiveProcess: "analyse", sourceConceptIds: ["concept_001"], validationStatus: "verified" },
            accessibility: { hasTextAlternative: true, keyboardOperable: true, screenReaderNotes: "Multiple choice layout." }
          },
          {
            taskId: "task_writing_b2",
            taskType: "writing_essay",
            title: "Source-Grounded Explanation",
            instructions: "Write 80-120 words.",
            prompt: "Summarize the key reasons why cities need an integrated stormwater strategy rather than relying solely on permeable paving.",
            stimulus: {
              passageTitle: "Integrated Stormwater Planning",
              passageText: "An integrated water management strategy uses multiple redundant layers (e.g., green roofs, retention basins, and bioswales) so that when one system reaches capacity during extreme downpours, others continue to buffer the runoff."
            },
            responseSpec: {
              type: "rich_text",
              options: [],
              multipleLimit: null,
              minWords: 80,
              maxWords: 120,
              minCharacters: null,
              maxCharacters: null,
              rows: 5,
              tokens: [],
              gaps: [],
              preparationSeconds: 0,
              responseSeconds: 400,
              maxAttempts: 1,
              spellcheck: true,
              placeholder: "Enter your response here.",
              unitLabel: ""
            },
            estimatedTimeSeconds: 400,
            publicMarks: 10,
            required: true,
            psychometric: { primarySkill: "written explanation", secondarySkills: ["summarization"], difficulty: "CEFR B2", cognitiveProcess: "create", sourceConceptIds: ["concept_001"], validationStatus: "verified" },
            accessibility: { hasTextAlternative: true, keyboardOperable: true, screenReaderNotes: "Text area input." }
          }
        ]
      }
    ],
    scoringPackage: {
      securityClassification: "candidate_safe_practice",
      mustBeRemovedFromCandidateHtml: false,
      scoringModelVersion: "mock_test_2026.1",
      maximumRawScore: 11,
      taskKeys: {
        task_reading_b2: {
          responseType: "single_choice",
          correctResponse: { optionIds: ["opt_b"] },
          acceptedAlternatives: [],
          caseSensitive: false,
          partialCredit: null,
          scoreWeight: 1,
          keyRationale: "Sustained heavy rainfall will saturate underlying soil and clog local drainage, making a solo paving system insufficient.",
          distractorRationales: {
            opt_a: "Incorrect. The text suggests they are effective but have upper limits during heavy rainfall, not light showers.",
            opt_c: "Incorrect. There is no mention of such regulations in the text.",
            opt_d: "Incorrect. Green roofs are part of an integrated approach but are not the 'only' proven method."
          },
          sourceEvidence: [],
          workedSolution: null,
          humanModerationRequired: false
        },
        task_writing_b2: {
          responseType: "rich_text",
          correctResponse: null,
          acceptedAlternatives: [],
          caseSensitive: false,
          partialCredit: "analytic_rubric",
          scoreWeight: 10,
          keyRationale: "Evaluates learner's ability to synthesize facts from the stimulus.",
          distractorRationales: {},
          sourceEvidence: [],
          workedSolution: null,
          humanModerationRequired: true,
          analyticRubric: {
            content: { maximum: 5, description: "Accurately covers saturation limits and need for redundant systems." },
            grammar: { maximum: 5, description: "B2 level grammatical range and accurate sentence structures." }
          }
        }
      }
    },
    sourceRegistry: [
      { sourceId: "src_water_001", provider: "Environmental Studies Unit", pageTitle: "Urban Hydrology", url: null, retrievedOrVerifiedDate: "2026-07-12", factsSupported: ["urban water dynamics"], sourceType: "user_supplied_authorized_source" }
    ],
    qualityAssurance: {
      sectionCount: 1,
      taskCount: 2,
      scoredTaskCount: 2,
      maximumRawScore: 11,
      duplicateIds: [],
      tasksMissingScoringKeys: [],
      candidateFieldsContainPrivateAnswers: false,
      timingCheck: { declaredMinutes: 15, taskEstimateMinutes: 8.6, status: "within_budget" },
      difficultyDistribution: { B2: 2 },
      skillCoverage: { reading: 1, writing: 1 },
      sourceCoverage: {},
      accessibilityChecks: { allTasksKeyboardOperable: true, allVisualsHaveAltText: true },
      audioCueChronologyValid: true,
      jsonCompletenessConfirmed: true,
      expertReviewRequired: false
    }
  }, null, 2),

  mockTestV2: MOCK_V3_SAMPLE_JSON,

  lessonGuide: JSON.stringify({
    title: "Lesson Guide: Mastering Business Communication",
    level: "B2-C1",
    duration: "45 mins",
    learningObjectives: [
      "Deliver structured BLUF technical updates",
      "De-escalate inter-team friction using collaborative phrasing",
      "Formulate active inquiry questions under pressure"
    ],
    teacherInstructions: [
      "1. Warm-up (5 mins): Discuss common communication bottlenecks in tech teams.",
      "2. Core Concept (15 mins): Walk through the BLUF framework with examples.",
      "3. Roleplay Activity (20 mins): Pair students to simulate crisis updates.",
      "4. Wrap-up & Feedback (5 mins): Highlight strong phrasing and corrections."
    ],
    differentiationNotes: "Provide phrase bank cards for B1/B2 learners needing scaffolding."
  }, null, 2),

  audioLesson: JSON.stringify({
    title: "Audio Immersion: Tech Standup Simulation",
    level: "B2",
    duration: "10 mins",
    audioScenarios: [
      {
        id: "scene-1",
        title: "Sprint Planning Blockers",
        ambientSound: "office_murmur",
        dialogue: [
          { speaker: "Scrum Master", text: "Let's review the blockers for Sprint 42. Dev team, what is holding up the API deploy?" },
          { speaker: "Lead Engineer", text: "The staging database migration timed out. We are rolling back the schema changes now." }
        ],
        comprehensionCheck: {
          question: "What caused the delay in Sprint 42?",
          options: ["A network outage", "A database migration timeout", "Missing documentation"],
          answer: 1
        }
      }
    ]
  }, null, 2)
};
