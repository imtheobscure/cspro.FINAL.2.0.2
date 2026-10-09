// A fully-annotated sample lesson so users can try the app without ChatGPT.
import type { LessonPlan } from "../types";

export const DEMO_LESSON: LessonPlan = {
  title: "Past Simple vs Present Perfect — quick refresher",
  profile: "lesson",
  targetMinutes: 25,
  learner: {
    id: "demo-maria",
    name: "Maria",
    l1: "Spanish",
    cefr: "B1",
    age: "32",
    interests: "travel, cooking, marketing",
    goals: "pass a job interview in English in 6 weeks",
    notes: "Tends to overuse 'have been' for finished past actions.",
  },
  glossary: [
    { term: "Present Perfect", definition: "have/has + past participle — used for past events with present relevance.", exampleSentence: "I have visited Rome twice." },
    { term: "Past Simple", definition: "regular verbs + -ed / irregular forms — used for completed actions at a specific past time.", exampleSentence: "I visited Rome in 2019." },
  ],
  notes: "Keep TTT low; many CCQs.",
  generatedAt: new Date().toISOString(),
  sections: [
    {
      id: "warm",
      title: "Warm-up",
      kind: "warm_up",
      estimatedMinutes: 3,
      teacherGuide: {
        ccqs: ["Can you think of something you did last weekend? (Past Simple)", "Is that action finished or still happening?"],
        extraExplanation: "The warm-up uses familiar topics (cooking, weekend) to naturally elicit both tenses before the learner is aware of the grammar focus. Listen for errors to address later.",
        sel: "Create a safe, low-pressure start. Validate any answer — the goal is engagement, not accuracy yet.",
        softSkills: "Active listening, building rapport through shared interests.",
        discussionQuestions: ["What's the best meal you've ever made?", "Did you try a new recipe recently?"],
        relatedVocabulary: ["recently", "lately", "last week", "this morning", "ever"],
        relatedGrammar: "Time expressions that signal Past Simple vs Present Perfect.",
        homeworkIdea: "Write 3 sentences about what you did yesterday and 3 about what you have done this week.",
        onlineChallenges: ["Quick poll: Past Simple or Present Perfect? (use chat)", "Breakout room: share a recent experience"],
        activities: ["Photo prompt: describe what happened", "Two truths and a lie using both tenses"],
        teacherTips: "Don't correct during warm-up. Note errors mentally for the presentation stage."
      },
      sentences: [
        {
          text: "Hi {{Student}} ↑ / so *GREAT* to see_you again [smile] // How has your week ^been?",
          ann: { emotion: "smile", intonation: "up", bloom: "remember", pitchContour: [-0.2, 0.3, 0.6, 0.1, -0.4] },
        },
        {
          text: "Before we ^start / quick question // Have you ~been cooking anything ^new lately? ↑",
          ann: {
            bloom: "remember",
            waitTimeSec: 3,
            predicted: [{ q: "I haven't cooked anything new", hint: "Recast with present perfect" }],
            cues: [{ category: "question", text: "Ask about cooking, listen for 'have you ever'", hotkey: 1 }],
          },
        },
      ],
    },
    {
      id: "lead",
      title: "Lead-in",
      kind: "lead_in",
      estimatedMinutes: 3,
      teacherGuide: {
        ccqs: ["What two tenses are we comparing today?", "Do you remember when we use 'have + past participle'?"],
        extraExplanation: "Set expectations clearly. Learners perform better when they know the lesson goal upfront.",
        sel: "Use encouraging language. Maria may feel nervous about grammar — normalize mistakes.",
        discussionQuestions: ["Which tense do you find harder to use?"],
        relatedVocabulary: ["compare", "tense", "promise", "clear"],
        teacherTips: "Keep lead-in brief. Don't explain grammar yet — just create anticipation."
      },
      sentences: [
        {
          text: "Today we'll *COMPARE* two tenses / Past Simple ↓ and Present *PERFECT* ↑.",
          ann: { intonation: "up", emotion: "serious", pitchContour: [0, 0.2, -0.5, 0.4, 0.7] },
        },
        {
          text: "You're going to ^leave this lesson ^clear on when to use ^each — *promise* [encouraging].",
          ann: { emotion: "encouraging", confidenceBoost: "You've got this, Maria!" },
        },
      ],
    },
    {
      id: "present",
      title: "Presentation",
      kind: "presentation",
      estimatedMinutes: 7,
      teacherGuide: {
        ccqs: ["Is Rome still a place she can visit? (Yes → Present Perfect connection)", "Is 2019 a finished time? (Yes → Past Simple)", "Can we say 'I have visited Rome in 2019'? (No — specific past time = Past Simple)"],
        extraExplanation: "Spanish L1 learners often overuse Present Perfect because Spanish 'pretérito perfecto' maps more broadly. The key distinction is: specific finished time → Past Simple. Connection to now / no time specified → Present Perfect. Use timelines on the whiteboard.",
        sel: "Watch for frustration when the 'rules' feel arbitrary. Acknowledge that it IS confusing and that mastery comes with practice.",
        softSkills: "Analytical thinking — comparing structures. Pattern recognition across languages.",
        discussionQuestions: ["In Spanish, would you use the same tense for both sentences?", "Can you think of a sentence where either tense could work?"],
        relatedVocabulary: ["timeline", "specific", "connected", "finished", "recently", "already", "just", "yet"],
        relatedGrammar: "Irregular past participles (been, gone, done, seen, had). Adverbs that typically pair with each tense.",
        homeworkIdea: "Find 5 sentences online using Present Perfect and explain WHY the author chose it.",
        onlineChallenges: ["Sort signal words into 'Past Simple' vs 'Present Perfect' columns (shared doc)", "Sentence auction: which sentences are correct?"],
        activities: ["Timeline drawing on whiteboard", "Error correction task with mixed sentences", "Gap-fill with signal words"],
        teacherTips: "Don't overwhelm with exceptions. Focus on the core rule, then handle edge cases in future lessons. Use the learner's own errors from the warm-up as examples."
      },
      sentences: [
        {
          text: "Look at these two ^sentences // I *VISIT*ed Rome in 2019 / and / I have *VISIT*ed Rome twice.",
          ann: {
            cues: [
              { category: "slide", text: "Show slide 4 — side-by-side examples", hotkey: 2 },
              { category: "whiteboard", text: "Draw timeline: 'finished past' vs 'past → now'", imageQuery: "english tense timeline past simple present perfect" },
            ],
            pronunciation: [{ word: "visited", ipa: "ˈvɪzɪtɪd" }],
          },
        },
        {
          text: "The ^first one says ^WHEN exactly ↓ / 2019 // The ^second one says ^HOW many times ↑ — connected to ^now.",
          ann: { intonation: "up", bloom: "understand" },
        },
        {
          text: "So {{Student}} / which one would you ^use to talk about your *career* up to ^today?",
          ann: {
            bloom: "apply",
            waitTimeSec: 4,
            emotion: "curious",
            predicted: [
              { q: "Past simple?", hint: "Nudge: is your career finished?" },
              { q: "I don't know", hint: "Offer a hint: 'Is your career still happening?'" },
            ],
            accentMarkers: [{ word: "career", reason: "Spanish L1 may stress first syllable; should be on second: ca·REER" }],
          },
        },
      ],
    },
    {
      id: "practice",
      title: "Controlled practice",
      kind: "practice",
      estimatedMinutes: 7,
      teacherGuide: {
        ccqs: ["'Yesterday' — is that a specific time? (Yes → Past Simple)", "'Ever' — does it refer to a specific time? (No → Present Perfect)", "'Since 2020' — still connected to now? (Yes → Present Perfect)"],
        extraExplanation: "This is a signal-word drill. The learner matches time expressions to tenses. Keep it fast-paced and gamified. Celebrate correct answers immediately.",
        sel: "Boost confidence. If she gets one wrong, reframe: 'That's a really common mix-up — you're learning the tricky ones!'",
        discussionQuestions: ["Can you make your own sentence with 'since'?", "What's the difference between 'for' and 'since'?"],
        relatedVocabulary: ["yesterday", "ever", "never", "since", "for", "already", "just", "last year", "this week"],
        homeworkIdea: "Create 10 fill-in-the-blank sentences for a friend to complete.",
        activities: ["Rapid-fire signal word game", "Kahoot-style quiz", "Sentence building with word cards"],
        teacherTips: "If she struggles, reduce to 3 items. If she aces it, add harder ones like 'this morning' (could be either depending on context)."
      },
      sentences: [
        {
          text: "Let's try ^five quick ones [excited] // I'll say a time expression / you choose the tense.",
          ann: {
            emotion: "excited",
            cues: [{ category: "activity", text: "5-item drill: yesterday, ever, last year, since 2020, this week", durationSec: 120, hotkey: 3 }],
          },
        },
        {
          text: "First one ↓ / *yesterday* ↑",
          ann: { bloom: "remember", waitTimeSec: 3 },
        },
        {
          text: "*ever* ↑",
          ann: { bloom: "remember", waitTimeSec: 3 },
        },
        {
          text: "*since* 2020 ↑",
          ann: { bloom: "remember", waitTimeSec: 3 },
        },
        {
          text: "Nice work {{Student}} [encouraging] // You ^got the tricky one [smile].",
          ann: { emotion: "encouraging", confidenceBoost: "Real progress on signal-words!" },
        },
      ],
    },
    {
      id: "production",
      title: "Freer production",
      kind: "production",
      estimatedMinutes: 4,
      teacherGuide: {
        ccqs: ["Which tense would you use to talk about your career so far?", "If I ask 'What did you do last summer?' — which tense?"],
        extraExplanation: "This is the fluency stage. Don't interrupt for every error — note them and do delayed error correction at the end. Focus on whether she's choosing the right tense for the right reason.",
        sel: "This is the most vulnerable stage. She's producing freely. Give specific praise: 'I love how you used Present Perfect there — perfect choice!'",
        softSkills: "Communication, self-expression, risk-taking in a foreign language.",
        discussionQuestions: ["What's the most interesting thing you've done in your career?", "Tell me about a trip you took last year."],
        relatedVocabulary: ["achievement", "experience", "milestone", "career", "recently"],
        homeworkIdea: "Record a 2-minute voice message about your year using both tenses. Self-correct before sending.",
        activities: ["Interview role-play: job interviewer asks about experience", "Story chain: alternate Past Simple and Present Perfect sentences"],
        teacherTips: "Listen for the 'have been' overuse Maria tends to make. Recast naturally rather than explicitly correcting."
      },
      sentences: [
        {
          text: "Now tell me ^three things you have ^done this *YEAR* / and ^one thing you ^did *last* year ↓",
          ann: {
            bloom: "create",
            waitTimeSec: 5,
            cues: [
              { category: "poll", text: "If she stalls: poll — work / travel / hobby?", hotkey: 4 },
              { category: "note", text: "Listen for 'have been' overuse — recast gently", hotkey: 5 },
            ],
            translations: [{ word: "year", tr: "año" }, { word: "last", tr: "el pasado" }],
          },
        },
      ],
    },
    {
      id: "cool",
      title: "Cooler",
      kind: "cooler",
      estimatedMinutes: 1,
      teacherGuide: {
        ccqs: ["Can you give me the rule in your own words?", "One example of each tense?"],
        extraExplanation: "End on a high note. The recap should be student-led if possible — ask HER to summarize the rule.",
        sel: "End with genuine praise. Mention something specific she did well. This builds motivation for next time.",
        homeworkIdea: "Write 5 sentences about your week using both tenses. Highlight which tense you used and why.",
        activities: ["Exit ticket: one sentence each tense", "Quick emoji check-in: how confident do you feel? 😊😐😟"],
        teacherTips: "Confirm next class. Send a follow-up message summarizing what she learned and the homework."
      },
      sentences: [
        {
          text: "Quick *recap* / *finished* time → Past Simple / *connection* to now → Present *PERFECT* ↑.",
          ann: { intonation: "up", emotion: "warm" },
        },
        {
          text: "Homework / write ^five sentences about your week using ^both tenses // Send them before our ^next class [smile].",
          ann: {
            emotion: "smile",
            cues: [{ category: "transition", text: "Confirm next class date in chat", hotkey: 6 }],
          },
        },
        {
          text: "Thanks {{Student}} / amazing energy today ↓ // See you ^soon!",
          ann: { confidenceBoost: "Genuine progress — tell her specifically.", emotion: "warm" },
        },
      ],
    },
  ],
};

export const DEMO_LESSON_JSON = JSON.stringify(DEMO_LESSON, null, 2);
