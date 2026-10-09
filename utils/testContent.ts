
import { StructuredOutput, PartyModeOutput, SimulationScenario } from "../types";

// --- REALISTIC ENGLISH LESSON DATA ---
export const REALISTIC_ENGLISH_LESSON: StructuredOutput = {
    sections: [
        {
            title: "🚀 Introduction: The Remote Work Revolution",
            color: "#2563eb",
            studyTime: "15 mins",
            activities: [
                {
                    type: "paragraph",
                    title: "📖 Context: The New Normal",
                    content: "<h3>The Shift to Remote</h3><p>Remote work has fundamentally shifted from a niche perk to a global standard. However, this transition brings unique <b>challenges</b> [desafíos] regarding communication. Without body language, the <b>nuance</b> [matiz] of our words becomes critical.</p><p>In this lesson, we will explore high-level vocabulary to describe work dynamics, phrasal verbs for navigating technical issues, and the grammar of 'Future Continuous' to discuss ongoing projects.</p>"
                },
                {
                    type: "vocabulary_table",
                    title: "📚 Key Vocabulary",
                    content: `[
                        {"word":"Autonomy","definition":"The right or condition of self-government; freedom from external control.","translation":"Autonomía","example":"Remote work requires a high degree of autonomy."},
                        {"word":"Burnout","definition":"Physical or mental collapse caused by overwork or stress.","translation":"Agotamiento","example":"To avoid burnout, set clear boundaries between work and life."},
                        {"word":"Asynchronous","definition":"Not existing or happening at the same time.","translation":"Asíncrono","example":"We rely on asynchronous communication like email for our global team."},
                        {"word":"To micromanage","definition":"Control every part of an enterprise or activity, however small.","translation":"Microgestionar","example":"A good manager trusts their team and doesn't micromanage."}
                    ]`
                },
                {
                    type: "questions",
                    title: "🤔 Check Your Understanding",
                    content: "1. Why is nuance more important in remote work?\nAnswer: Because we lack body language cues.\n2. What helps avoid burnout?\nAnswer: Setting clear boundaries.\n3. What is asynchronous communication?\nAnswer: Communication that doesn't happen at the same time (e.g. email)."
                }
            ]
        },
        {
            title: "📝 Grammar: Future Continuous",
            color: "#7c3aed",
            studyTime: "20 mins",
            activities: [
                {
                    type: "grammar_explanation",
                    title: "⚙️ Future Continuous Logic",
                    content: `{"explanation": "<h3>Form: Will be + Verb-ing</h3><p>We use the Future Continuous to talk about actions that will be <b>in progress</b> at a specific time in the future. It sounds more polite and professional than the simple future.</p><ul><li><b>Polite Enquiry:</b> 'Will you be joining the meeting?'</li><li><b>Planned Events:</b> 'I'll be working from home tomorrow.'</li></ul>", "examples": ["At 9 AM, I will be presenting the report.", "Don't call then, I will be driving."], "ccqs": [{"q":"Is the action finished?", "a":"No, it is in progress."}, {"q":"Is it in the past or future?", "a":"Future."}]}`
                },
                {
                    type: "scramble",
                    title: "🧩 Unscramble the Sentences",
                    content: `[
                        {"sentence": "I | will be | waiting | for your | call.", "hint": "Subject + will be + verb-ing"},
                        {"sentence": "She | won't be | attending | the | strategy meeting.", "hint": "Negative form"},
                        {"sentence": "Will | you | be | using | the | conference room?", "hint": "Question form"}
                    ]`
                }
            ]
        },
        {
            title: "🎧 Listening: The Zoom Call Disaster",
            color: "#059669",
            studyTime: "25 mins",
            activities: [
                {
                    type: "listening_mc",
                    title: "👂 Comprehension",
                    content: `{"audioScript": "Manager: Okay team, can everyone hear me? \\nEmployee: You're breaking up a bit, John. You might be frozen. \\nManager: Is that better? Look, the deadline is tight. We need to leverage our asynchronous tools. Sarah, will you be leading the deployment? \\nSarah: Actually, I thought Mike was handling that. I'm swamped with the audit.", "questions": [{"q": "What technical issue does the Manager have?", "options": ["He is muted", "He is breaking up/frozen", "His camera is off", "He left the chat"], "a": "He is breaking up/frozen", "feedback": "The employee says 'You're breaking up a bit'."}]}`
                },
                {
                    type: "gap_fill",
                    title: "✍️ Fill in the Blanks",
                    content: `{"items": [{"text": "You are [breaking] up.", "hint": "Losing connection audio"}, {"text": "I am [swamped] with work.", "hint": "Very busy"}, {"text": "We need to [leverage] our tools.", "hint": "Use effectively"}]}`
                }
            ]
        },
        {
            title: "🗣️ Speaking: Roleplay",
            color: "#ea580c",
            studyTime: "20 mins",
            activities: [
                {
                    type: "movie_scene",
                    title: "🎭 Simulation: Negotiating Deadlines",
                    content: `{"lines": [{"speaker": "Boss", "text": "I need this done by Friday."}, {"speaker": "You", "text": "That might be difficult because...", "audio": "false"}, {"speaker": "Boss", "text": "We really can't miss this target."}, {"speaker": "You", "text": "I understand, but if I rush it...", "audio": "false"}], "intro": "You need to tell your boss that the Friday deadline is unrealistic without sounding lazy."}`
                },
                {
                    type: "speaking_jam",
                    title: "⏱️ Just A Minute",
                    content: `{"topic": "The Pros and Cons of Remote Work", "bullets": ["Commute time", "Social isolation", "Flexibility", "Distractions"]}`
                }
            ]
        }
    ]
};

// --- REALISTIC EXPLAINER LESSON ---
export const REALISTIC_EXPLAINER_LESSON: StructuredOutput = {
    sections: [
        {
            title: "1. The Concept of 'Leverage'",
            color: "#4b5563",
            studyTime: "10 mins",
            activities: [
                {
                    type: "paragraph",
                    title: "📖 Meaning & Nuance",
                    content: "<p>In business, to <b>leverage</b> something means to use it to its maximum advantage. It comes from the physical concept of a 'lever'.</p><p><b>Nuance:</b> Unlike 'use', 'leverage' implies strategy. You <i>use</i> a pen, but you <i>leverage</i> your network to find a job.</p>"
                },
                {
                    type: "list",
                    title: "🛠️ Communication Toolkit",
                    content: "<b>Collocations:</b>\n- Leverage assets\n- Leverage technology\n- Leverage influence\n\n<b>Sentence Starters:</b>\n- We should look to leverage...\n- Is there a way to leverage...?"
                }
            ]
        },
        {
            title: "2. Phrasal Verbs for Delays",
            color: "#db2777",
            studyTime: "15 mins",
            activities: [
                {
                    type: "paragraph",
                    title: "📖 Push back vs. Call off",
                    content: "<p><b>Push back</b> means to delay a meeting to a later time. <b>Call off</b> means to cancel it entirely.</p><p><i>Examples:</i><br>1. Can we push back the meeting to 3 PM?<br>2. The merger was called off at the last minute.</p>"
                },
                {
                    type: "questions",
                    title: "🤔 Check Understanding",
                    content: "1. If I move a meeting from Tuesday to Friday, did I call it off?\nAnswer: No, you pushed it back.\n2. If the meeting will never happen, what did I do?\nAnswer: You called it off."
                }
            ]
        }
    ]
};

// --- REALISTIC CONVERSATIONAL LESSON ---
export const REALISTIC_CONVERSATIONAL_LESSON: StructuredOutput = {
    sections: [
        {
            title: "🗣️ Module 1: Small Talk Strategy",
            color: "#0891b2",
            studyTime: "20 mins",
            activities: [
                {
                    type: "paragraph",
                    title: "💡 The FORD Method",
                    content: "<p>Use the acronym FORD for small talk: <b>F</b>amily, <b>O</b>ccupation, <b>R</b>ecreation, <b>D</b>reams. Avoid RAPE: Religion, Abortion, Politics, Economics.</p>"
                },
                {
                    type: "questions",
                    title: "💬 Discussion Prompts",
                    content: "1. What is your go-to small talk question?\n2. How do you politely end a conversation?\n3. Have you ever made a small talk mistake?"
                }
            ]
        }
    ]
};

// --- REALISTIC PARTY MODE ---
export const REALISTIC_PARTY_MODE: PartyModeOutput = {
    gameTitle: "The Ultimate English Showdown",
    gameDescription: "A competitive arena covering Business English, Idioms, and Grammar.",
    powerUps: ["Double Points", "Time Freeze", "Streak Saver"],
    questions: Array.from({length: 64}, (_, i) => {
        const types = ['vocab_smash', 'grammar_gladiator', 'reading_comp', 'listening_comp', 'pictionary', 'taboo_titan', 'hot_seat', 'concept_icons'];
        const type = types[i % types.length];
        
        // Base object
        const q: any = {
            id: `q-${i}`,
            type: type,
            points: 10 + (Math.floor(i / 10) * 5),
            skill: type.includes('vocab') ? "Vocabulary" : (type.includes('grammar') ? "Grammar" : "Fluency"),
            difficultyLevel: i > 32 ? "High" : "Standard",
            question: `Default Question ${i}`,
            answer: "Answer",
            options: ["A", "B", "C", "D"],
            taunt: "Too slow!",
            motivation: "Excellent!",
            hint: "Think about context.",
            explanation: "Detailed explanation here.",
            deepDive: "Deep dive content.",
            examples: ["Ex 1", "Ex 2"],
            speakingCCQ: "Why is this correct?"
        };

        // Specific Data for Special Types
        if (type === 'pictionary') {
            q.question = "Draw a [Laptop]";
            q.answer = "Laptop";
        }
        if (type === 'taboo_titan') {
            q.tabooCards = Array(25).fill({ target: "Deadline", forbidden: ["Time", "Limit", "Date"] });
        }
        if (type === 'hot_seat') {
            q.hotSeatQuestions = Array(25).fill("Describe your job in 3 words.");
        }
        if (type === 'concept_icons') {
            q.icons = ["🔥", "🧊", "💧"];
            q.conceptLesson = { title: "Thermodynamics", lifeSkill: "Balance", content: "<p>Heat moves to cold.</p>" };
        }
        if (type === 'reading_comp') {
            q.context = "Business emails should be concise. Avoid jargon where possible.";
            q.question = "What is the advice for emails?";
            q.answer = "Be concise";
            q.options = ["Be concise", "Use jargon", "Be long", "Use emojis"];
        }

        return q;
    })
};
