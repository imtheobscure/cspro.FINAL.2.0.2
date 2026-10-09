import { GoogleGenAI, Type } from "@google/genai";
import { AIComprehensiveAnalysis, AIProgressReport, Learner, Badge, Session, CalendarEvent } from '../types2';
import { calculateAge } from '../utils/dateUtils';
import { getAvatarUrl } from './avatarService';

const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("API_KEY not found in environment variables. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || 'MISSING_API_KEY' });

const comprehensiveAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A very brief, one or two-sentence overall summary of the session's key takeaways, addressed directly to the learner (e.g., 'You did a great job...')."
        },
        revisedLessonSummary: {
            type: Type.STRING,
            description: "A professionally revised, polished, and beautifully written version of the Tutor's original 'Lesson Summary' goal. Fix any grammar, tone, or clarity issues while keeping the same core meaning. Make it sound like a professional report card summary. If no summary was provided, write a professional report card summary of what was covered."
        },
        strengths: {
            type: Type.ARRAY,
            description: "Based on comparing the lesson plan to the learner's transcript, provide 2-4 detailed bullet points on what the learner did well. Be specific and encouraging, mentioning how they met the lesson's objectives. Use simple markdown for emphasis: *bold text* for keywords, _italic text* for examples.",
            items: { type: Type.STRING }
        },
        weaknesses: {
            type: Type.ARRAY,
            description: "Based on comparing the lesson plan to the learner's transcript, provide 2-4 detailed bullet points on what the learner struggled with. These should be constructive and identify specific areas for future focus. Use simple markdown for emphasis: *bold text* for keywords, _italic text* for examples.",
            items: { type: Type.STRING }
        },
        keyLearnings: {
            type: Type.ARRAY,
            description: "Provide a detailed, bullet-point summary of the main topics from the lesson plan. For each point, explain *why* it was important for the learner. Use simple markdown for emphasis: *bold text* for keywords, _italic text_ for examples, and ==highlighted text== for very important concepts.",
            items: { type: Type.STRING }
        },
        corrections: {
            type: Type.ARRAY,
            description: "Group up to 20 of the most significant and deep grammatical, vocabulary, pronunciation, or discourse problems. Avoid transcribing simple spelling/typo mistakes, speech-to-text transcription glitches, or generic nonsense words. Find REAL linguistic and communication errors. Ensure a wide variety of error types are shown.",
            items: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING, description: "The type of problem. CRITICAL: This must be strictly a short simple tag from this exact list: 'grammar', 'vocabulary', 'functional', 'pragmatics', 'appropriacy', 'Say better', 'discourse', 'register', 'cohesion', 'coherence', 'slips', 'mistakes', 'errors'. Do NOT use any other categories, compound categories, or tags like prepositions." },
                    explanation: { type: Type.STRING, description: "A highly clear explanation for this category of problem, addressed to the learner (e.g., 'Remember to use...')." },
                    examples: {
                        type: Type.ARRAY,
                        description: "One or more examples of this problem.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                incorrect: { type: Type.STRING, description: "The incorrect phrase the learner used." },
                                correct: { type: Type.STRING, description: "The correct version of the phrase." },
                            },
                            required: ["incorrect", "correct"]
                        }
                    },
                },
                required: ["category", "explanation", "examples"]
            }
        },
        reviewQuestions: {
            type: Type.ARRAY,
            description: "An array of 2-3 personalized review questions based on what you (the learner) learned. Each question must have a realistic, engaging context or scenario.",
            items: {
                type: Type.OBJECT,
                properties: {
                    context: { 
                        type: Type.STRING, 
                        description: "A short, real-life scenario for the review question (e.g., 'Imagine you are at a coffee shop...')."
                    },
                    question: { 
                        type: Type.STRING,
                        description: "A specific question for you (the learner) that encourages you to use language from the session."
                    }
                },
                required: ["context", "question"]
            }
        },
        facts: {
            type: Type.ARRAY,
            description: "An array of all personal, interesting facts ABOUT THE LEARNER that were mentioned in the session script. Extract as many distinct facts as possible. Differentiate between personal information shared by the learner (e.g., 'I went to London last year', 'My dog's name is Fido', 'I enjoy hiking') and impersonal information from a text they are reading. Only extract personal facts. If no new personal facts are mentioned, return an empty array.",
            items: { type: Type.STRING }
        },
        weaknessDetails: {
            type: Type.ARRAY,
            description: "An array of objects, one for each weakness identified. For each weakness, provide a personalized, speaking-based Concept Checking Question (CCQ).",
            items: {
                type: Type.OBJECT,
                properties: {
                    point: { type: Type.STRING, description: "The specific weakness or area for improvement, identical to one of the items in the 'weaknesses' array." },
                    ccq: { type: Type.STRING, description: "A personalized, open-ended speaking question designed to check the learner's understanding of the 'point'. The question should be contextualized and encourage a spoken response, not a yes/no answer." },
                },
                required: ["point", "ccq"]
            }
        },
        suggestedTodos: {
            type: Type.ARRAY,
            description: "An array of concise, actionable to-do items FOR THE TUTOR or events to remember, based on direct or indirect requests FROM THE LEARNER in the transcript. **CRITICAL: Carefully analyze the transcript for 'To-Do' lists, upcoming events, plans, or appointments.** For example, 'Send learner the link for...', 'Prepare a lesson on...', or 'Ask about their trip to Spain next week'. If no requests or events are found, return an empty array.",
            items: { type: Type.STRING }
        },
        competencyUpdates: {
            type: Type.ARRAY,
            description: "Based on the transcript, propose updates to the learner's competencies. For each, provide the competency name, a new suggested progress percentage, and a justification.",
            items: {
                type: Type.OBJECT,
                properties: {
                    competencyName: { type: Type.STRING, description: "The name of the competency to update (must exactly match one of the learner's existing competencies)." },
                    suggestedProgress: { type: Type.INTEGER, description: "The new suggested absolute progress value (0-100) based on performance in this session. The progress change from the learner's current competency level MUST be strictly small, either positive (+1 to +15 points) or negative (-1 to -15 points)." },
                    justification: { type: Type.STRING, description: "A brief, 1-sentence justification for the proposed change." },
                },
                required: ["competencyName", "suggestedProgress", "justification"]
            }
        },
        newSkills: {
            type: Type.ARRAY,
            description: "Identify any new, specific skills or topics that emerged during the session. For each, link it to one of the learner's existing needs (must not be blank), and specify a small starting progress score.",
            items: {
                type: Type.OBJECT,
                properties: {
                    skillName: { type: Type.STRING, description: "The name of the new skill or topic identified (e.g., 'Using phrasal verbs for travel')." },
                    linkedNeed: { type: Type.STRING, description: "The name of the learner's need that this skill supports (must exactly match one of their existing needs, and MUST NOT be blank/empty)." },
                    justification: { type: Type.STRING, description: "A brief, 1-sentence justification for why this skill is relevant to the need." },
                    suggestedProgress: { type: Type.INTEGER, description: "The initial starting progress value (0-100) for this new skill. Must be strictly between 1 and 15 (default to 5)." }
                },
                required: ["skillName", "linkedNeed", "justification", "suggestedProgress"]
            }
        },
        masteryLevel: {
            type: Type.INTEGER,
            description: "A percentage (0-100) representing how well the learner's performance in the transcript achieved the goals set out in the lesson summary. 100 means perfect mastery."
        },
        masteryJustification: {
            type: Type.STRING,
            description: "A highly detailed, analytical, and evidenced examiner rubric assessment for the mastery level score."
        },
        challenges: {
            type: Type.ARRAY,
            description: "An array of 1-3 personalized challenges (strings) for the learner to complete before the next session. Make them engaging and actionable.",
            items: { type: Type.STRING }
        },
        chatMessages: {
            type: Type.ARRAY,
            description: "An array of exactly 6 exceptionally long, detailed, and coherent chat messages recapping the session. Each message MUST be at least 600-800 characters and incredibly detailed. Use rich formatting (bulleted lists, numbered steps) mixed with conversational text and emojis. Let the messages flow as a continuous thought process from a fun, encouraging tutor to the learner. DO NOT output fewer than 6 messages.",
            items: { type: Type.STRING },
            minItems: 6,
            maxItems: 6
        },
        personalizedGreetings: {
            type: Type.ARRAY,
            description: "Exactly 4 different highly personalized greeting messages (each MUST be at least 50 words) welcoming or saying hello to this specific learner. Each should use a different visual mood/tone (e.g. enthusiastic, calm/professional, warm/casual, humorous/witty), referencing their background, progress, and/or personal facts. Do not output fewer than 4 items.",
            items: { type: Type.STRING },
            minItems: 4,
            maxItems: 4
        },
        personalizedGoodbyes: {
            type: Type.ARRAY,
            description: "Exactly 4 different highly personalized goodbye messages (each MUST be at least 50 words) wrapping up class or saying goodbye to this specific learner. Each should use a different visual mood/tone (e.g. motivating, supportive, friendly/relaxed, intellectual/reflective), prompting a follow-up action or asking an engaging question, referencing their background, progress, and/or personal facts. Do not output fewer than 4 items.",
            items: { type: Type.STRING },
            minItems: 4,
            maxItems: 4
        },
        badges: {
            type: Type.ARRAY,
            description: "An array of 1-3 suggested badges to award the learner for this session (e.g., 'Vocabulary Master', 'Great Pronunciation'). Provide a name, description, and an emoji icon.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The name of the badge." },
                    description: { type: Type.STRING, description: "Why the badge was awarded." },
                    emoji: { type: Type.STRING, description: "A single emoji representing the badge." }
                },
                required: ["name", "description", "emoji"]
            }
        },
        unlockedVocabulary: {
            type: Type.ARRAY,
            description: "An array of 2-5 key words, phrases, or grammar concepts newly introduced or unlocked during the session.",
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING, description: "The word, idiom, expression, or grammar concept unlocked." },
                    category: { type: Type.STRING, description: "The category: 'Vocabulary', 'Expression', or 'Grammar'." },
                    definition: { type: Type.STRING, description: "Highly contextualized, easy to understand explanation or definition for the learner." }
                },
                required: ["word", "definition"]
            }
        },
        advancedFeedback: {
            type: Type.OBJECT,
            description: "Advanced multi-dimensional linguistic diagnostic and feedback matrix.",
            properties: {
                fluency: { type: Type.STRING, description: "Detailed analysis of oral fluency, rate of speech, hesitation, pauses, and flow." },
                accuracy: { type: Type.STRING, description: "Detailed analysis of grammar, vocabulary accuracy, and pronunciation/phonetics. Note: Since transcriptions are often automatic, if there is an unusual or distorted word, try to guess or infer what the learner actually wanted to say, evaluate their phonetic intent, and give tips on how to pronounce it correctly." },
                clarity: { type: Type.STRING, description: "Detailed analysis of coherence, cohesion, signposting, linking words, and message delivery clarity." },
                confidence: { type: Type.STRING, description: "Analysis of student confidence, assertiveness, and psychological comfort based on speech patterns and transcription cues." },
                pragmaticAppropriateness: { type: Type.STRING, description: "Evaluates if the learner's intent (e.g., requesting, apologizing, disagreeing) matches the social context—detecting over-formality, undue bluntness, or mismatched politeness markers." },
                lexicalSophistication: { type: Type.STRING, description: "Analyzes lexical richness, variety, collocations, idiomatic use, and potential vocabulary upgrades." },
                syntacticComplexity: { type: Type.STRING, description: "Evaluates the complexity of sentences (simple vs compound vs complex clauses) and sentence variety." },
                repairStrategyTypology: { type: Type.STRING, description: "Details how the learner handles breakdowns in communication—e.g., self-correction, asking for help, circumlocution, or pausing." },
                registerConsistency: { type: Type.STRING, description: "Evaluates whether they maintained the correct register (formal, informal, semi-formal) consistently as required by the context." },
                ideaDensity: { type: Type.STRING, description: "Analyzes the richness of ideas and informational density in their responses." },
                metaDiscourse: { type: Type.STRING, description: "Evaluates signposting, structuring devices, and how they direct the listener." },
                stanceMarkers: { type: Type.STRING, description: "Evaluates attitudinal markers, hedges, boosters, and how they project their stance." },
                syllabusFeedback: { type: Type.STRING, description: "IF any personal syllabus chapters were selected, evaluate how well their speaking transcript met that specific chapter's goals (grammar, vocabulary, functional language, skills, strategies) and give customized, specialized feedback and best practices." }
            }
        },
        emotionalFeeling: {
            type: Type.OBJECT,
            description: "An emotional evaluation of the learner's state during the logged class session. Must be entirely real, direct data with NO metaphorical language like 'Journey'.",
            properties: {
                sentimentScore: { type: Type.INTEGER, description: "An absolute score from 1 to 100 indicating confidence/mood during the lesson. (100 = extremely ecstatic/proud/confident, 50 = neutral/calm, 1 = extremely frustrated/overwhelmed/nervous)." },
                dominantEmotion: { type: Type.STRING, description: "A single distinct emotion label reflecting the learner's feeling (e.g., 'Anxious but Persistent', 'Highly Confident', 'Curious & Engaged', 'Nervous & Hesitant')." },
                analysis: { type: Type.STRING, description: "A 1-2 sentence detailed diagnostic analysis of their emotional flow and comfort based on transcription logs." },
                confidenceScore: { type: Type.INTEGER, description: "Score from 1 to 100 for learner confidence." },
                confidenceAnalysis: { type: Type.STRING, description: "Real, direct analysis of learner confidence." },
                anxietyScore: { type: Type.INTEGER, description: "Score from 1 to 100 for learner speaking anxiety." },
                anxietyAnalysis: { type: Type.STRING, description: "Real, direct analysis of learner speaking anxiety." },
                riskTakingScore: { type: Type.INTEGER, description: "Score from 1 to 100 for learner risk-taking." },
                riskTakingAnalysis: { type: Type.STRING, description: "Real, direct analysis of learner risk-taking." },
                fearOfMistakesScore: { type: Type.INTEGER, description: "Score from 1 to 100 for fear of mistakes." },
                fearOfMistakesAnalysis: { type: Type.STRING, description: "Real, direct analysis of fear of mistakes." },
                motivationScore: { type: Type.INTEGER, description: "Score from 1 to 100 for learner speaking motivation." },
                motivationAnalysis: { type: Type.STRING, description: "Real, direct analysis of learner speaking motivation." },
                transferableSkills: {
                    type: Type.ARRAY,
                    description: "transferable skills (creativity, thinking outside the box, leadership, empathy, etc.) and other transferable skills identified based on real evidence in transcript.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            skill: { type: Type.STRING, description: "Name of the transferable skill." },
                            score: { type: Type.INTEGER, description: "Score from 1 to 100." },
                            evidence: { type: Type.STRING, description: "1-sentence direct quote or evidence from transcript." }
                        },
                        required: ["skill", "score", "evidence"]
                    }
                },
                timeline: {
                    type: Type.ARRAY,
                    description: "Chronological mood timeline during the session based ONLY on real transcript events.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            phase: { type: Type.STRING, description: "Phase of the session (e.g., 'Beginning', 'Middle', 'End' or specific topic)." },
                            mood: { type: Type.STRING, description: "The learner's mood during this phase." },
                            emoji: { type: Type.STRING, description: "A single emoji representing this mood." },
                            description: { type: Type.STRING, description: "Detailed description of their emotional state and what triggered it in the transcript." }
                        },
                        required: ["phase", "mood", "emoji", "description"]
                    }
                },
                sentences: {
                    type: Type.ARRAY,
                    description: "Emotion-triggered conversational quotes directly from the transcript, with linguistic upgrades.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            original: { type: Type.STRING, description: "The actual quote from the transcript." },
                            corrected: { type: Type.STRING, description: "The corrected or upgraded premium phrase." },
                            emotion: { type: Type.STRING, description: "The emotion or mindset state when they said this." },
                            emoji: { type: Type.STRING, description: "A single emoji representing this state." },
                            tutorTip: { type: Type.STRING, description: "A tutor's empathetic and coaching tip." }
                        },
                        required: ["original", "corrected", "emotion", "emoji", "tutorTip"]
                    }
                },
                drivenWords: {
                    type: Type.ARRAY,
                    description: "CEFR Lexical Checker & Key Vocabulary Used based on actual words in the transcript.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING, description: "The specific word from the transcript." },
                            type: { type: Type.STRING, description: "Sentiment type: 'positive', 'negative', or 'neutral'." },
                            count: { type: Type.INTEGER, description: "The exact or estimated count of this word in the transcript." },
                            intensity: { type: Type.STRING, description: "Intensity: 'High', 'Medium', or 'Low'." }
                        },
                        required: ["word", "type", "count", "intensity"]
                    }
                }
            },
            required: ["sentimentScore", "dominantEmotion", "analysis", "confidenceScore", "confidenceAnalysis", "anxietyScore", "anxietyAnalysis", "riskTakingScore", "riskTakingAnalysis", "fearOfMistakesScore", "fearOfMistakesAnalysis", "motivationScore", "motivationAnalysis", "transferableSkills", "timeline", "sentences", "drivenWords"]
        },
        speakingScores: {
            type: Type.OBJECT,
            description: "Estimated speaking scores based on actual transcript performance compared to official rubrics.",
            properties: {
                cefr: { type: Type.STRING, description: "Approximate CEFR Speaking Level (A1, A2, B1, B2, C1, C2)." },
                ielts: { type: Type.NUMBER, description: "Approximate IELTS speaking band score (from 1.0 to 9.0, increments of 0.5)." },
                toefl: { type: Type.INTEGER, description: "Approximate TOEFL speaking score (from 0 to 30)." },
                fluencyCoherence: { type: Type.NUMBER, description: "Estimated Fluency and Coherence rating on IELTS scale (1-9)." },
                lexicalResource: { type: Type.NUMBER, description: "Estimated Lexical Resource rating on IELTS scale (1-9)." },
                grammarAccuracy: { type: Type.NUMBER, description: "Estimated Grammatical Range & Accuracy rating on IELTS scale (1-9)." },
                pronunciation: { type: Type.NUMBER, description: "Estimated Pronunciation rating on IELTS scale (1-9)." },
                rubricJustification: { type: Type.STRING, description: "A detailed 2-3 sentence strict examiner rubric justification of these exact approximate scores referencing specific evidence in the transcript." }
            },
            required: ["cefr", "ielts", "toefl", "fluencyCoherence", "lexicalResource", "grammarAccuracy", "pronunciation", "rubricJustification"]
        }
    },
    required: ["summary", "strengths", "weaknesses", "keyLearnings", "reviewQuestions"]
};


export const getAIComprehensiveSessionAnalysis = async ({ script, lessonSummary, learnerInterests, learnerLevel, learnerCompetencies, learnerNeeds, isGroup = false, groupName = '', selectedSyllabusChapters = '' }: { script: string, lessonSummary?: string, learnerInterests: string, learnerLevel: string, learnerCompetencies: string, learnerNeeds: string, isGroup?: boolean, groupName?: string, selectedSyllabusChapters?: string }): Promise<AIComprehensiveAnalysis | null> => {
    if (!API_KEY) return null;

    const contentParts = [
      lessonSummary && `Lesson Summary (Tutor's Goal): "${lessonSummary}"`,
      script && `Session Transcript (Learner's Speaking): "${script}"`,
      learnerInterests && (isGroup ? `Group's Interests: "${learnerInterests}"` : `Learner's Interests: "${learnerInterests}"`),
      learnerCompetencies && (isGroup ? `Group's Current Competencies: ${learnerCompetencies}` : `Learner's Current Competencies: ${learnerCompetencies}`),
      learnerNeeds && (isGroup ? `Group's Stated Needs: ${learnerNeeds}`: `Learner's Stated Needs: ${learnerNeeds}`),
      selectedSyllabusChapters && `Selected Syllabus Chapters Covered in this Session:\n${selectedSyllabusChapters}`
    ].filter(Boolean).join('\n\n');

    if (!script) return null;

    const persona = isGroup 
        ? `You are an expert, thoughtful, and encouraging ESL teacher analyzing a recently completed online GROUP class called "${groupName}".`
        : `You are an expert, thoughtful, and encouraging ESL teacher analyzing a recently completed online class.`;

    const instructions = isGroup
        ? `Your task is to provide a comprehensive analysis for the group by comparing the provided Lesson Summary against the Group's Transcript.`
        : `Your task is to provide a comprehensive analysis by comparing the provided Lesson Summary (the tutor's goal) against the Learner's Transcript (their actual performance).`;
        
    const secondPersonInstruction = isGroup
        ? `***CRITICAL INSTRUCTION: All feedback, summaries, and questions must be written in the second person plural, addressing the group directly as "you all" or "the group". For example, instead of "The learner did well," write "You all did well."***`
        : `***CRITICAL INSTRUCTION: All feedback, summaries, and questions must be written in the second person, addressing the learner directly as "you". For example, instead of "The learner did well," write "You did well."***`;

    const proficiencyContext = isGroup
        ? `Your analysis and the language you use in your response MUST be appropriate for the group's general proficiency level, which is ${learnerLevel}.`
        : `Your analysis and the language you use in your response (summaries, questions, explanations) MUST be appropriate for the learner's proficiency level, which is ${learnerLevel}. Simplify your language for lower levels (A1, A2) and use more nuanced vocabulary for higher levels (B2, C1).`;
    
    const factsDescription = isGroup
        ? "An array of all interesting facts about the group as a whole or standout personal facts about individual members that were mentioned in the session script (e.g., group preferences, shared experiences, 'John mentioned he is visiting Spain'). Extract as many distinct facts as possible. If no new facts are mentioned, return an empty array."
        : "An array of all personal, interesting facts ABOUT THE LEARNER that were mentioned in the session script. Extract ONLY real, personal details about their actual, real-world life (e.g., names of pets/cats, hobbies, family members, jobs/occupations, companies, places they live or have visited, real background, work history, etc. mentioned in the transcript). You are STRICTLY FORBIDDEN from including any classroom, academic, or lesson-context metadata (such as 'learned skimming and scanning', 'practiced past tense', 'is a B2 student', 'completed a mock interview task', 'studied vocabulary', etc.). Every entry must be a persistent personal detail of their life.";

    const dynamicSchema = JSON.parse(JSON.stringify(comprehensiveAnalysisSchema));
    dynamicSchema.properties.facts.description = factsDescription;
    dynamicSchema.properties.keyLearnings.description = lessonSummary 
      ? "Provide a detailed, bullet-point summary of the main topics from the provided 'Lesson Summary'. For each point, explain *why* it was important for the learner. Use simple markdown."
      : "Based on the transcript, infer and summarize the key learning points of the session.";
    dynamicSchema.properties.reviewQuestions.description = isGroup
        ? "An array of 3-4 personalized review questions based on what the group learned in this session. Each question MUST be engaging, non-negotiable, and directly reference actual examples they discussed. You MUST always generate robust questions."
        : "An array of 3-4 personalized review questions based on what the learner learned in this session. Each question MUST have a realistic, engaging context and directly demand practice of the skills they need help with. You MUST always generate robust questions.";

    const groupSpecificInstructions = isGroup ? `
    - **Competency Updates**: Analyze the transcript for evidence of progress in the group's existing competencies. Propose a new, absolute progress percentage (0-100) for 1-2 competencies. **CRITICAL: The proposed change from their current level MUST be small, assigning either +1 to +15 points or -1 to -15 points (e.g., if they are at 40, suggest 41 to 55, or 25 to 39). NEVER make large jumps.** The names MUST exactly match the provided list. Provide a brief justification.
    - **New Skills**: Identify 1-2 specific, granular new skills or topics relevant for the group. For each, link it to one of the group's existing needs. The need name MUST exactly match the provided list and can never be empty. Provide a brief justification. For each new skill, suggest an initial \`suggestedProgress\` between 1 and 15 (default to 5).
    ` : `
    - **Competency Updates**: Analyze the transcript for evidence of progress in the learner's existing competencies. Propose a new, absolute progress percentage (0-100) for 1-2 competencies. **CRITICAL: The proposed change from their current level MUST be small, assigning either +1 to +15 points or -1 to -15 points (e.g., if they are at 40, suggest 41 to 55, or 25 to 39). NEVER make large jumps.** The names MUST exactly match the provided list. Provide a brief justification.
    - **New Skills**: Identify 1-2 specific, granular new skills or topics that were practiced (e.g., 'Using phrasal verbs for travel', 'Disagreeing politely'). For each, link it to one of the learner's existing needs. The need name MUST exactly match the provided list and can never be empty. Provide a brief justification. For each new skill, suggest an initial \`suggestedProgress\` between 1 and 15 (default to 5).
    `;

    const prompt = `${persona}
    ${instructions}
    ${proficiencyContext}

    ${secondPersonInstruction}

    IMPORTANT CONTEXT & TASKS:
    - **Speaking Test Rubrics & Scoring (speakingScores)**: You MUST assess the session transcript against standardized speaking criteria (CEFR levels A1-C2, IELTS 1.0-9.0, TOEFL 0-30). Provide approximate scores based on strict rubrics for Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation. Give a clear, strict justification referencing specific evidence.
    - **Advanced Feedback & Multidimensional Analysis Matrix (advancedFeedback)**: You MUST complete all fields of this object:
      1. **fluency**: Provide a meticulous analysis of rate of speech, sentence rhythm, hesitation, and pause frequencies.
      2. **accuracy**: Check grammar, vocabulary, and pronunciation. CRITICAL: Since speech-to-text might distort words, if there is an unusual/malformed/nonsense word in the transcript, guess what they actually wanted to say, evaluate their phonetic intent, and use that as the basis of the correction, giving clear guidelines on how to say it properly.
      3. **clarity**: Evaluate coherence, cohesion, signposting devices, and message structure.
      4. **confidence**: Gauge their ease, hesitation, self-corrections, and comfort level during speaking.
      5. **pragmaticAppropriateness**: Evaluate if their language intent (requesting, apologizing, disagreeing) matches the social context (bluntness, politeness markers, register).
      6. **lexicalSophistication**: Assess vocabulary richness, collocation accuracy, and word-choice upgrades.
      7. **syntacticComplexity**: Evaluate use of clauses, subordinating conjunctions, sentence variety, and density.
      8. **repairStrategyTypology**: Categorize and review their self-corrections, fillers, asking for clarification, or pauses.
      9. **registerConsistency**: Check if they maintained context-appropriate formal/informal/semi-formal tone.
      10. **ideaDensity**: Assess informational density and propositional richness.
      11. **metaDiscourse**: Analyze structuring signals and listener guidance cues.
      12. **stanceMarkers**: Evaluate hedges, boosters, attitudinal expressions, and commitment signals.
      13. **syllabusFeedback**: IF specific Personal Syllabus Chapters are listed in the input, evaluate the transcript specifically against those chapters' goals (vocabulary, grammar, functional language, skills needed, tips), and provide detailed specialized feedback and best practices.
    - **Sentiment Analysis & Emotional Intelligence (emotionalFeeling)**: Provide a highly accurate and direct emotional evaluation of the learner's real states during the logged class session. DO NOT use metaphorical language (such as 'Journey' or 'Emotional Journey'). Simplify all terms. You MUST assess the student's real emotions and Social-Emotional Learning (SEL) metrics using emotional intelligence, specifically assessing:
      - Confidence: Score (1-100) and analysis.
      - Anxiety: Score (1-100) and analysis.
      - Risk-taking: Score (1-100) and analysis.
      - Fear of Mistakes: Score (1-100) and analysis.
      - Motivation: Score (1-100) and analysis.
      - Transferable Skills: Extract 2-4 key transferable skills demonstrated (such as 'Creativity', 'Thinking Outside the Box', 'Leadership', 'Empathy', or others) with real score and concrete evidence from what they said.
    - **Linguistic Feedback & Corrections (🗣️ Class Feedback)**: You MUST analyze the session transcript deeply and be extremely smart. Each correction's category MUST be strictly one of: 'grammar', 'vocabulary', 'functional', 'pragmatics', 'appropriacy', 'Say better', 'discourse', 'register', 'cohesion', 'coherence', 'slips', 'mistakes', 'errors'. NEVER use other categories, compound categories, or tags like prepositions. Identify as many genuine communication gaps or upgrade opportunities as possible (aim for 6 to 12 strong, reliable feedback entries under 'corrections'). Write highly professional explanations. If there are malformed or nonsensical words from messy speech-to-text, guess what they wanted to say and show that as the original.
    - **Mastery Level**: Your primary task is to compare the 'Lesson Summary' with the 'Session Transcript'. Based on this, provide a 'masteryLevel' percentage (0-100). For 'masteryJustification', write a highly detailed, analytical, and evidenced assessment. Do not write a generic summary like "You showed good understanding". Write it like an examiner's strict rubric evaluation, citing specific examples from the transcript to justify the 'masteryLevel' score, evaluating both holistic and analytical performance. Use basic English words.
    - **Strengths & Weaknesses**: Your main task is to compare the lesson summary's goals with actual performance in the transcript. Strengths are where the goals were met. Weaknesses are where they were not.
    - **Key Learnings**: This should be a detailed summary of the 'Lesson Summary' text provided, NOT what was learned.
    - **Weakness Details**: For each weakness you identify, you MUST also create a corresponding entry in the 'weaknessDetails' field containing a personalized, speaking-based Concept Checking Question (CCQ).
    - **Review Questions**: CRITICAL NON-NEGOTIABLE: You MUST generate 3 to 4 high-quality review questions. NEVER return an empty array for this field. If you cannot think of anything, ask about basic session content.
    - **Chat Messages**: CRITICAL NON-NEGOTIABLE: You MUST generate exactly 6 incredibly detailed and very long chat messages recapping the session. These messages must be full of emojis, bullet points, and actionable tips.
    - **Unlocked Vocabulary Clinic (📚 New Words)**: You MUST extract 2 to 5 key vocabulary words, phrases, expressions, or idioms newly introduced, studied, or discussed in the session transcript. Even if the text is short, identify at least 3 vocabulary words that are highly relevant to the lesson context and define them thoroughly. Do NOT return an empty list; ensure you always extract real, reliable words present in or strongly inferred from the session dialogue or goals.
    - **Facts**: You MUST smartly extract ONLY real, personal details about the actual, real-world life of the ${isGroup ? 'GROUP MEMBERS' : 'LEARNER'} (e.g., names of pets/cats, hobbies, family members, jobs/occupations, companies, places they live or have visited, real background, work experience, etc. mentioned in the transcript). You are STRICTLY FORBIDDEN from including any classroom, academic, or lesson-context metadata (such as "learned skimming and scanning", "practiced past tense", "is a B2 student", "completed a mock interview task", "studied vocabulary", "reviewed grammar", etc.). Every entry must be a persistent personal detail of their actual life. Corroborate, merge, and integrate these with the learner's known facts if any exist, and NEVER include lesson topics, activities, or academic achievements. Do NOT extract information from examples, reading exercises, or texts they are reading in class.
    - **To-Do Items**: Scan the transcript for any requests made for you, the tutor. Create a concise, actionable to-do item.
    ${groupSpecificInstructions}
    - Be objective and focus on language use. If there is not enough information to populate a field, return an empty array.

    Analyze the following:
    ${contentParts}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: dynamicSchema
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AIComprehensiveAnalysis;
    } catch (error) {
        console.error("Error calling Gemini API for session analysis:", error);
        return null;
    }
};

const progressReportSchema = {
    type: Type.OBJECT,
    properties: {
        learnerName: { type: Type.STRING },
        totalSessionsAttended: { type: Type.INTEGER },
        totalLearningHours: { type: Type.NUMBER },
        statistics: {
            type: Type.OBJECT,
            properties: {
                total: { type: Type.INTEGER },
                attended: { type: Type.INTEGER },
                missed: { type: Type.INTEGER },
            }
        },
        overallSummary: { type: Type.STRING, description: "A 2-3 sentence summary of the learner's journey and current status." },
        competencyAnalysis: {
            type: Type.OBJECT,
            properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List 2-3 key competency strengths." },
                areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List 2-3 key competency weaknesses." },
            }
        },
        needsAndPathAnalysis: { type: Type.STRING, description: "A brief analysis of their stated needs and how their learning path is addressing them." },
        sessionLearningAnalysis: {
            type: Type.OBJECT,
            properties: {
                commonThemesPositive: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Identify 2-3 common themes from 'skillsLearned' across sessions." },
                commonThemesNeedsHelp: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Identify 2-3 common themes from 'needsHelp' across sessions." },
            }
        },
        suggestedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Provide 3 concrete, actionable, and predictive suggestions for future lessons. Based on their weaknesses and progress, forecast what topics or activity types will be most beneficial for them to reach their target level." },
        criticalEvaluation: {
            type: Type.STRING,
            description: "Provide a candid, critical evaluation of the learner's commitment, overall progress, and whether the learning has been successful. Be direct, honest, and professional, highlighting both positive commitment and areas where more effort is needed."
        },
        progressOverTime: {
            type: Type.ARRAY,
            description: "An array of data points for charting overall progress. Create one data point for each attended session.",
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: "The date of the session in 'YYYY-MM-DD' format." },
                    overallProgress: { type: Type.NUMBER, description: "The average of all competency progress percentages *after* this session." }
                },
                required: ["date", "overallProgress"]
            }
        }
    },
    required: ["learnerName", "totalSessionsAttended", "totalLearningHours", "statistics", "overallSummary", "competencyAnalysis", "needsAndPathAnalysis", "sessionLearningAnalysis", "suggestedNextSteps", "criticalEvaluation", "progressOverTime"]
};

export const getOverallProgressReport = async (learner: Learner): Promise<AIProgressReport | null> => {
    if (!API_KEY) return null;

    // Calculate progress for the chart data here to ensure accuracy
    let cumulativeCompetencyProgress: { [key: string]: number } = {};
    learner.competencies.forEach(c => {
        cumulativeCompetencyProgress[c.id] = c.initialProgress;
    });

    const progressDataPoints = learner.sessions
        .filter(s => s.attended)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(session => {
            // This is a simplified simulation. In a real scenario, progress would be tied to session outcomes.
            // Here, we'll just increment progress slightly for each session for demonstration.
            Object.keys(cumulativeCompetencyProgress).forEach(id => {
                cumulativeCompetencyProgress[id] = Math.min(100, cumulativeCompetencyProgress[id] + (Math.random() * 2 + 1)); // Increment by 1-3%
            });
            const totalProgress = Object.values(cumulativeCompetencyProgress).reduce((sum, current) => sum + current, 0);
            const overallProgress = totalProgress / learner.competencies.length;

            return {
                date: session.date,
                overallProgress: Math.round(overallProgress)
            };
        });


    const prompt = `
    Analyze the following learner's profile data to generate a comprehensive progress report.
    The report should be encouraging but also include a candid, critical evaluation of their commitment and progress.
    
    Learner Data:
    ${JSON.stringify({
        name: learner.name,
        dateCreated: (learner as any).dateCreated || (learner as any).joinedAt,
        coursePlan: learner.coursePlan,
        competencies: learner.competencies,
        needs: learner.needs,
        sessions: learner.sessions.map(({ script, reflection, ...rest }) => rest), // Exclude long text fields
        progressForChart: progressDataPoints, // Provide pre-calculated data
    }, null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: progressReportSchema
            }
        });
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText) as AIProgressReport;
        // Ensure the pre-calculated data is used for consistency
        parsed.progressOverTime = progressDataPoints;
        return parsed;
    } catch (error) {
        console.error("Error generating progress report:", error);
        return null;
    }
};


const homeworkSchema = {
    type: Type.OBJECT,
    properties: {
        reading: {
            type: Type.OBJECT,
            properties: {
                instruction: { type: Type.STRING, description: "A simple, one-sentence instruction for this activity." },
                genre: { type: Type.STRING, description: "Genre of the text, e.g., 'Short Story', 'News Article'." },
                text: { type: Type.STRING, description: "A paragraph of 250-350 words for reading practice." },
                ccqs: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 concept checking questions about the text." },
            }
        },
        fictionReading: {
            type: Type.OBJECT,
            properties: {
                instruction: { type: Type.STRING, description: "A simple, one-sentence instruction for this activity." },
                title: { type: Type.STRING, description: "The title of the piece of fiction, e.g., 'Scene from The Matrix'." },
                text: { type: Type.STRING, description: "A longer fiction passage (350-450 words) from a famous story, movie, or TV series that matches the learner's interests." },
                questions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            questionNumber: { type: Type.INTEGER },
                            statement: { type: Type.STRING, description: "A true or false statement about the text." },
                        }
                    },
                    description: "An array of 3-4 true/false questions about the text."
                },
                answerKey: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            questionNumber: { type: Type.INTEGER },
                            correctAnswer: { type: Type.BOOLEAN },
                            explanation: { type: Type.STRING, description: "A brief explanation for the answer." },
                        }
                    }
                }
            }
        },
        speaking: {
            type: Type.OBJECT,
            properties: {
                instruction: { type: Type.STRING, description: "A simple, one-sentence instruction for this activity." },
                tasks: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            context: { type: Type.STRING, description: "A real-life context for the speaking task." },
                            question: { type: Type.STRING, description: "A question to prompt the learner to speak." },
                            checklist: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 specific things the learner should focus on (e.g., 'Use past tense', 'Use at least 3 new vocabulary words')." }
                        }
                    },
                    description: "An array containing 1-2 speaking tasks."
                }
            }
        },
        dialogue: {
            type: Type.OBJECT,
            properties: {
                instruction: { type: Type.STRING, description: "A simple, one-sentence instruction for this activity." },
                title: { type: Type.STRING, description: "A title for the dialogue, e.g., 'At the Coffee Shop'." },
                context: { type: Type.STRING, description: "A short description of the situation." },
                characters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array with two character names, one of which MUST be the learner's name." },
                turns: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            speaker: { type: Type.STRING },
                            line: { type: Type.STRING, description: "The complete line for the speaker. Leave empty for the learner." },
                            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 3-5 keywords for the learner to use to build their sentence." }
                        }
                    },
                    description: "The dialogue turns. One character has full lines, the learner has keywords."
                }
            }
        },
        rolePlay: {
            type: Type.OBJECT,
            properties: {
                instruction: { type: Type.STRING, description: "A simple, one-sentence instruction for this activity." },
                title: { type: Type.STRING, description: "A catchy title for the role-play related to a movie/TV series." },
                context: { type: Type.STRING, description: "The context of the scene, including stage directions and emojis." },
                turns: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            prompt: { type: Type.STRING, description: "A prompt for the learner, setting the scene for their turn." },
                            choices: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        option: { type: Type.STRING, description: "'A', 'B', or 'C'." },
                                        line: { type: Type.STRING, description: "The line of dialogue for this choice, including stage directions, emojis, and a distinct personality. Use casual language, slang, and mild curse words if appropriate for the character." }
                                    }
                                },
                                description: "Exactly 3 choices for the learner's response."
                            }
                        }
                    },
                    description: "An array of 3 turns for the learner."
                }
            }
        },
        listening: {
            type: Type.OBJECT,
            properties: {
                instruction: { type: Type.STRING, description: "A simple, one-sentence instruction for this activity." },
                text: { type: Type.STRING, description: "A short script (150-200 words) for the tutor to read aloud." },
                questions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 comprehension questions about the listening text." }
            }
        },
        writing: {
            type: Type.OBJECT,
            properties: {
                instruction: { type: Type.STRING, description: "A simple, one-sentence instruction for this activity." },
                task: { type: Type.STRING, description: "A clear writing task (e.g., 'Write an email...', 'Describe a picture...')." },
                context: { type: Type.STRING, description: "The context for the writing task." }
            }
        },
        challenge: {
            type: Type.OBJECT,
            description: "A personalized, creative, real-life challenge for the learner, called a 'Productive Challenge'.",
            properties: {
                instruction: { type: Type.STRING, description: "A simple, one-sentence instruction for this activity." },
                title: { type: Type.STRING, description: "A catchy title for the challenge, formatted like 'Productive Challenge: My Favorite Hobby'." },
                description: { type: Type.STRING, description: "A detailed description of the challenge, instructing the learner to do something creative like record a short video, take a photo, or simulate a phone call, and to share the result in their messaging platform." }
            },
            required: ["title", "description", "instruction"]
        },
        integratedActivity: {
            type: Type.OBJECT,
            description: "A highly personalized activity that requires the learner to search for a resource (video, article, podcast) online and then complete a task. Do not provide a specific URL.",
            properties: {
                title: { type: Type.STRING, description: "A catchy title for the activity." },
                instruction: { type: Type.STRING, description: "A simple, one-sentence instruction for the activity." },
                searchTopic: { type: Type.STRING, description: "The specific topic or keywords the learner should search for on a site like YouTube or Google." },
                resourceDescription: { type: Type.STRING, description: "A short description of the type of resource to find, e.g., 'a YouTube video', 'an online news article', 'a podcast episode'." },
                taskDescription: { type: Type.STRING, description: "A detailed, multi-step description of what the learner should do after finding and consuming the resource. It should be a practical speaking or writing task." },
            }
        },
        reviewQuestions: {
            type: Type.ARRAY,
            description: "An array of 5 personalized review questions based on what the learner learned and struggled with. Each question must have a realistic, engaging context and a checklist of items to use.",
            items: {
                type: Type.OBJECT,
                properties: {
                    context: {
                        type: Type.STRING,
                        description: "A short, real-life scenario for the review question (e.g., 'Imagine you are planning a weekend trip...')."
                    },
                    question: {
                        type: Type.STRING,
                        description: "A specific question for the learner that encourages them to use language from the session."
                    },
                    checklist: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "A list of 3-4 specific words, grammar points, or concepts from their recent 'skillsLearned' or 'needsHelp' lists that they should try to include in their answer."
                    }
                },
                required: ["context", "question", "checklist"]
            }
        }
    },
    required: ["reading", "fictionReading", "speaking", "dialogue", "rolePlay", "listening", "writing", "challenge", "integratedActivity", "reviewQuestions"]
};

export const generateAIHomework = async (learner: Learner, lessonContent?: string): Promise<any | null> => {
    if (!API_KEY || learner.sessions.length === 0) return null;

    const recycleBinItems = [...new Set(learner.sessions.flatMap(s => s.needsHelp || []))]
        .filter(item => !(learner.masteredSkills || []).includes(item));

    const prompt = `
    Create a personalized, multi-skilled weekly homework assignment for an ESL learner. The homework must be highly tailored to the learner's profile and the provided lesson content.

    **Learner Profile Context:**
    - **Name:** ${learner.name}
    - **CEFR Level:** ${learner.coursePlan.level}
    - **Interests:** ${learner.interests}
    - **Personal Facts:** ${learner.facts || 'None provided.'}
    - **Overall Needs:** ${learner.needs.map(n => n.name).join(', ')}
    - **Recycle Bin (topics they struggle with):** ${recycleBinItems.join(', ')}

    **CRITICAL: Your primary source for content should be the "Core Lesson Content" provided below. Also, analyze the Class Reports from the last 5 sessions to identify recurring problems and recently learned skills.**
    
    **Core Lesson Content:**
    ---
    ${lessonContent || 'No specific lesson content provided; focus on Recycle Bin and Class Reports.'}
    ---

    **Last 5 Class Reports:**
    ${JSON.stringify(learner.sessions.slice(-5).map(s => ({
        skillsLearned: s.skillsLearned,
        needsHelp: s.needsHelp,
        aiAnalysis: s.aiAnalysis ? { summary: s.aiAnalysis.summary, corrections: s.aiAnalysis.corrections } : null
    })), null, 2)}

    **Your Task:**
    Generate a response in the required JSON format. Ensure all tasks are:
    1.  Appropriate for the learner's CEFR level.
    2.  Directly address items from the "Core Lesson Content", their "Recycle Bin", and recent "needsHelp" from Class Reports.
    3.  Incorporate their interests and personal facts to make the tasks engaging and relevant.
    4.  **Content Length**: Make the 'reading' text 250-350 words, the 'fictionReading' text 350-450 words, and the 'listening' text 150-200 words.
    5.  **Instructions**: For EACH section (reading, speaking, etc.), provide a simple, one-sentence 'instruction' for the learner.
    6.  **Fiction Reading**: Create a 'fictionReading' section from a famous movie, TV series, or book that aligns with the learner's interests. Include 3-4 true/false questions and a separate answer key.
    7.  **Dialogue**: Create a 'dialogue' section personalized with the learner's name. One character's lines are complete. For the learner's lines, provide an array of 3-5 keywords they should use.
    8.  **Role-Play**: Create a 'rolePlay' activity themed around a movie/TV series from their interests. It must have 3 turns. For each turn, provide three distinct choices (A, B, C) with different personalities/emotions. The language must be casual, using informal slang, stage directions, and emojis. It's okay to include mild, appropriate curse words if it fits the character (e.g., 'damn', 'hell').
    9.  **Integrated Activity**: This is crucial. Design an 'integratedActivity' that requires the learner to independently search for an online resource (like a YouTube video, news article, or podcast). You must provide the 'searchTopic' (what they should search for) and a 'resourceDescription' (what kind of resource to find), then create a practical speaking or writing task related to the resource they find. Do NOT provide a specific URL.
    10. Create a personalized "challenge" section.
    11. Create a "reviewQuestions" section with 5 personalized questions and checklists.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: homeworkSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as any;
    } catch (error) {
        console.error("Error generating homework:", error);
        return null;
    }
};

const quizSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A creative title for the quiz, e.g., 'Grammar Detective Quiz'." },
        level: { type: Type.STRING, description: "The CEFR level of the quiz." },
        sections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Title for this section (e.g., 'Vocabulary Check', 'Past Tense Practice')." },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                questionNumber: { type: Type.INTEGER },
                                questionText: { type: Type.STRING, description: "The question." },
                                options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Options for multiple-choice questions." },
                                type: { type: Type.STRING, description: "Type of question: 'multiple-choice', 'fill-in-the-blank', 'short-answer', or 'writing'." },
                            },
                        },
                    },
                },
            },
        },
        answerKey: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionNumber: { type: Type.INTEGER },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING, description: "A brief explanation for the answer." },
                },
            },
        },
    },
    required: ["title", "level", "sections", "answerKey"],
};

export const generateAIQuiz = async (learner: Learner, lessonContent?: string): Promise<any | null> => {
    if (!API_KEY || (learner.sessions.length === 0 && !lessonContent)) return null;

    const recycleBinItems = [...new Set(learner.sessions.flatMap(s => s.needsHelp || []))]
        .filter(item => !(learner.masteredSkills || []).includes(item));

    const prompt = `
    Create a 5-7 question quiz for an ESL learner. The quiz must be highly personalized based on their recent performance, profile, and the provided lesson content.

    **Learner Profile Context:**
    - **Name:** ${learner.name}
    - **CEFR Level:** ${learner.coursePlan.level}
    - **Interests:** ${learner.interests}
    - **Recycle Bin (topics they struggle with):** ${recycleBinItems.join(', ')}

    **CRITICAL: Base the quiz questions primarily on the "Core Lesson Content" provided below. Also, consider topics from the last 5 Class Reports, focusing on their 'needsHelp' items and specific 'corrections' made.**
    
    **Core Lesson Content:**
    ---
    ${lessonContent || 'No specific lesson content provided; focus on Recycle Bin and Class Reports.'}
    ---
    
    **Last 5 Class Reports:**
     ${JSON.stringify(learner.sessions.slice(-5).map(s => ({
        skillsLearned: s.skillsLearned,
        needsHelp: s.needsHelp,
        corrections: s.aiAnalysis?.corrections?.flatMap(group => (group.examples || []).map(ex => ex.correct))
    })), null, 2)}
    
    **Your Task:**
    Generate a varied quiz with different question types (multiple-choice, fill-in-the-blank, etc.). The quiz should be engaging, directly related to the provided topics, and appropriate for their level. Ensure the answer key is complete and accurate.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as any;
    } catch (error) {
        console.error("Error generating quiz:", error);
        return null;
    }
};

export const getTimezoneForLocation = async (country: string, city?: string): Promise<string | null> => {
    const locLower = `${city || ''} ${country || ''}`.toLowerCase().trim();
    if (!locLower) return null;

    // Fast static lookup table for common locations
    if (locLower.includes('new york') || locLower.includes('nyc')) return 'America/New_York';
    if (locLower.includes('london') || locLower.includes('uk') || locLower.includes('united kingdom')) return 'Europe/London';
    if (locLower.includes('paris') || locLower.includes('france')) return 'Europe/Paris';
    if (locLower.includes('tokyo') || locLower.includes('japan')) return 'Asia/Tokyo';
    if (locLower.includes('sydney') || locLower.includes('australia')) return 'Australia/Sydney';
    if (locLower.includes('toronto') || locLower.includes('canada')) return 'America/Toronto';
    if (locLower.includes('los angeles') || locLower.includes('california')) return 'America/Los_Angeles';
    if (locLower.includes('berlin') || locLower.includes('germany')) return 'Europe/Berlin';
    if (locLower.includes('madrid') || locLower.includes('spain')) return 'Europe/Madrid';
    if (locLower.includes('istanbul') || locLower.includes('turkey')) return 'Europe/Istanbul';
    if (locLower.includes('dubai') || locLower.includes('uae') || locLower.includes('emirates')) return 'Asia/Dubai';
    if (locLower.includes('tehran') || locLower.includes('iran')) return 'Asia/Tehran';
    if (locLower.includes('beijing') || locLower.includes('china')) return 'Asia/Shanghai';
    if (locLower.includes('mumbai') || locLower.includes('india') || locLower.includes('delhi')) return 'Asia/Kolkata';
    if (locLower.includes('saudi') || locLower.includes('riyadh')) return 'Asia/Riyadh';
    if (locLower.includes('brazil') || locLower.includes('sao paulo')) return 'America/Sao_Paulo';

    if (!API_KEY || API_KEY === 'MISSING_API_KEY') {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        } catch {
            return 'UTC';
        }
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Provide the IANA timezone name for the following location: ${city || ''} ${country}. Respond with ONLY the IANA timezone name (e.g., "America/New_York").`,
        });
        const text = response.text?.trim() || '';
        if (text && text.includes('/')) {
            return text;
        }
    } catch (error) {
        // Silently catch permission or network issues
    }

    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

export const generateAILessonPlan = async ({ languageInput, lessonGoal, learner }: { languageInput: string, lessonGoal: string, learner: Learner }): Promise<string | null> => {
    if (!API_KEY) return null;

    const recycleBinItems = [...new Set(learner.sessions.flatMap(s => s.needsHelp || []))]
        .filter(item => !(learner.masteredSkills || []).includes(item))
        .slice(0, 10);
    
    const learningStrengths = Object.entries(learner.learningFactors || {})
        .filter(([, state]) => state === 'strength')
        .map(([label]) => label);
    
    const learningChallenges = Object.entries(learner.learningFactors || {})
        .filter(([, state]) => state === 'challenge')
        .map(([label]) => label);

    const recentSkillsLearned = [...new Set(learner.sessions.slice(-3).flatMap(s => s.skillsLearned || []))].slice(0, 10);
    const recentNeedsHelp = [...new Set(learner.sessions.slice(-3).flatMap(s => s.needsHelp || []))].slice(0, 10);
    const age = calculateAge(learner.birthday);

    const prompt = `
You are an expert ESL teacher creating a hyper-personalized, conversational lesson plan.
Your task is to expand on the "Core Lesson Content" provided, using it as a foundation. Create at least 4x more content with dialogic, interactional activities.

**CRITICAL INSTRUCTIONS:**
1.  **EXPAND, DON'T REPLACE:** Use all "Core Lesson Content". Expand it with speaking-focused tasks.
2.  **PERSONALIZE:** Deeply integrate the learner's profile (interests, occupation, facts, learning factors) into all activities.
3.  **BE TIME-AWARE:** Make warm-ups relevant to the learner's local time.
4.  **STRUCTURE:** Follow the specified structure. Provide clear tutor instructions.
5.  **LANGUAGE TOOLKIT:** For each learner task, provide a "Language Toolkit" with Sentence Starters, Phrases, Spoken Grammar, and Key Vocabulary.
6.  **EMBED EXTRAS:** After each activity, include a detailed "Extra" section with practical tips, cultural points, or teaching strategies related to the activity's topic.
7.  **FORMAT:** Use plain text with simple formatting (headers, lists). Do not use markdown like asterisks.

**LEARNER PROFILE:**
- **Name:** ${learner.name}
- **Age:** ${age || 'Not provided'}
- **CEFR Level:** ${learner.coursePlan.level}
- **Occupation:** ${learner.occupation || 'Not provided'}
- **Country:** ${learner.country || 'Not provided'}
- **Interests & Hobbies:** ${learner.interests}
- **Personal Facts (CRITICAL):** ${learner.facts || 'None provided.'}
- **Learning Strengths:** ${learningStrengths.join(', ') || 'None specified'}
- **Learning Challenges:** ${learningChallenges.join(', ') || 'None specified'}
- **Stated Needs:** ${learner.needs.map(n => n.name).join(', ')}
- **Recycle Bin (Top 10):** ${recycleBinItems.join(', ')}
- **Recent Skills (Top 10 from last 3 lessons):** ${recentSkillsLearned.join(', ')}
- **Recent Challenges (Top 10 from last 3 lessons):** ${recentNeedsHelp.join(', ')}

**CONTEXT:**
- **Learner's Local Date & Time:** ${new Date().toLocaleString('en-US', { timeZone: learner.timezone || 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}

**MATERIALS:**
- **Core Lesson Content:**
---
${languageInput}
---
- **Lesson Goal:**
---
${lessonGoal}
---

**LESSON PLAN STRUCTURE (Follow this exactly):**

1. Hello & Warm-up (5-7 minutes)
(A unique, personalized, time-sensitive greeting and transition.)

2. Main Activities: Discovery & Practice (40-50 minutes)
(3-4 detailed, conversational activities based on "Core Lesson Content", personalized for the learner. Each must have a scenario, Tutor lines, Learner tasks, a Language Toolkit, and a detailed "Extra" section.)

3. Consolidation & Review (5-7 minutes)
(A final, quick, personalized activity with a "Language Toolkit".)

4. Goodbye
(A unique, encouraging closing statement.)
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim().replace(/\*/g, '');
    } catch (error) {
        console.error("Error generating lesson plan:", error);
        return null;
    }
};

const chatMessagesSchema = {
    type: Type.OBJECT,
    properties: {
        hello: { type: Type.STRING, description: "A friendly, personalized hello and icebreaker message for the learner to start a conversation before the next session." },
        recap: {
            type: Type.ARRAY,
            description: "An array of exactly 6 extremely long, detailed, and coherent chat messages recapping the last session. Each message MUST be exceptionally long (at least 600-800 characters) and incredibly detailed. Use rich formatting like bulleted lists, numbered steps, mixed with conversational text, and lots of emojis. Explain concepts thoroughly. The total combined length should be massive, like a mini-lesson recap. The messages must flow together as a single, continuous conversation.",
            items: { type: Type.STRING },
            minItems: 6,
            maxItems: 6
        },
        goodbye: { type: Type.STRING, description: "A friendly, personalized goodbye message to wrap up the conversation about the last session." },
        personalizedGreetings: {
            type: Type.ARRAY,
            description: "Exactly 4 different highly personalized greeting messages (each MUST be at least 50 words) welcoming or saying hello to this specific learner, each with a different style or tone (e.g. enthusiastic, calm/professional, warm/casual, humorous/witty), personalized with their background and/or facts. Do not output fewer than 4 items.",
            items: { type: Type.STRING },
            minItems: 4,
            maxItems: 4
        },
        personalizedGoodbyes: {
            type: Type.ARRAY,
            description: "Exactly 4 different highly personalized goodbye messages (each MUST be at least 50 words) wrapping up class or saying goodbye to this specific learner, each with a different style or tone (e.g. motivating, supportive, friendly/relaxed, intellectual/reflective), prompting a follow-up action or asking an engaging question, personalized with their facts. Do not output fewer than 4 items.",
            items: { type: Type.STRING },
            minItems: 4,
            maxItems: 4
        }
    },
    required: ["hello", "recap", "goodbye", "personalizedGreetings", "personalizedGoodbyes"]
};

export const generateAIChatMessages = async (learner: Learner, session: Session, upcomingHolidays: CalendarEvent[], isGroup: boolean = false): Promise<string[] | null> => {
    if (!API_KEY || !session.aiAnalysis) return null;

    const personalFacts = learner.facts || 'Not provided';
    const holidaysString = upcomingHolidays.length > 0
        ? `Upcoming Events/Holidays in their country (${learner.country}): ${upcomingHolidays.map(h => `${h.title} on ${h.date}`).join(', ')}.`
        : "No notable upcoming holidays.";

    const persona = isGroup
        ? `You are ${learner.name}'s ESL buddy for the whole group, and you're hyped! Your job is to write a series of chat messages to the group chat.`
        : `You are ${learner.name}'s ESL buddy, and you're hyped! Your job is to write a series of chat messages.`;

    const addressing = isGroup
        ? `Address the group directly as "you all", "everyone", or by the group name. E.g., "Hey everyone!", "You all were sick in class today!"`
        : `Address the learner directly as "you".`;
    
    const recapContext = isGroup
        ? `**Recap from your group's last class on ${session.date}:**`
        : `**Recap from your last class on ${session.date}:**`;


    const prompt = `
${persona} You're writing a series of chat messages. Your tone is modern, fun, and extremely encouraging, like a cool older sibling or a best friend. Use tons of relevant emojis. ${addressing}

Your task is to generate three types of messages in a JSON object: a 'hello' message, a 6-part 'recap' monologue, and a 'goodbye' message.

**Message Breakdown:**
1.  **\`hello\`:** A friendly, personalized icebreaker to start a conversation before the *next* session. It should be engaging and based on their interests or personal facts. Keep it concise and fun.
2.  **\`recap\`:** A series of 6 extremely long, detailed messages recapping their last session.
3.  **\`goodbye\`:** A friendly, personalized goodbye message to wrap up the conversation about the last session. Keep it concise and encouraging.

**CRITICAL VIBE CHECK for the \`recap\` monologue (MUST FOLLOW):**
1.  **NO BORING PHRASES:** Your vocabulary is fresh. You MUST AVOID overused, cringe-y compliments like "Chef's kiss," "nailed it," or "crushed it." Instead, use modern, authentic slang. Think like: "that was sick," "you're a legend for that," "low-key impressive," "the glow-up is real," "that's a whole vibe." Be creative and change it up every time!
2.  **PLAYFUL & INFORMAL:** Keep it 100. Use an energetic, playful tone. Emojis are your best friend. 🥳🎉🚀
3.  **MAKE IT A MONOLOGUE:** You're sending 6 messages back-to-back because you have a lot to say. They MUST flow together as one continuous thought process. Each message builds on the last.
4.  **EXTREMELY LONG & DETAILED:** Each of the 6 messages MUST be exceptionally long and detailed (at least 600-800 characters each). Provide 5X more content! Go very deep on the topics. Use bulleted lists for teaching points, numbered steps for advice, mixed with conversational text and emojis.
5.  **CELEBRATE THE WINS:** Start by hyping them up about a specific win from their "strengths" list from their last class. Be specific and super positive!
6.  **HOLIDAY VIBES:** Peep the "Upcoming Holidays" list. If there's something coming up, you MUST ask them about their plans for it. This is major.
7.  **REMEMBER THE DEETS:** Weave in their interests and personal facts to show you're paying attention. It shows you care.
8.  **END WITH A HOOK:** The very last message of the \`recap\` series MUST end with a fun, open-ended question to get them to reply.

**Profile:**
- **Name:** ${learner.name}
- **Interests:** ${learner.interests}
- **Personal Facts:** ${personalFacts}

${recapContext}
- **Strengths (Things you did well - go crazy hyping these up!):** ${(session.aiAnalysis.strengths || []).join(', ')}
- **Weaknesses (Gently bring one of these up as something to work on):** ${(session.aiAnalysis.weaknesses || []).join(', ')}

**Time-Sensitive Information:**
- ${isGroup ? 'No notable upcoming holidays for the group.' : holidaysString}

Generate the JSON object now with 'hello', 'recap' (an array of 6 strings), and 'goodbye' properties. Let's make it awesome!
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: chatMessagesSchema as any,
                temperature: 0.9,
            }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as { hello: string; recap: string[]; goodbye: string; personalizedGreetings?: string[]; personalizedGoodbyes?: string[]; };
        if (session.aiAnalysis) {
            session.aiAnalysis.personalizedGreetings = result.personalizedGreetings;
            session.aiAnalysis.personalizedGoodbyes = result.personalizedGoodbyes;
        }
        return [result.hello, ...result.recap, result.goodbye];
    } catch (error) {
        console.error("Error generating AI chat messages:", error);
        return null;
    }
};

export const generateEventGreeting = async (learner: Learner, eventTitle: string): Promise<string | null> => {
    if (!API_KEY) return null;
    
    const prompt = `
    You are a heartwarming and motivating ESL tutor.
    Write a short, personalized greeting message for your student, ${learner.name}.
    
    Context:
    - Upcoming Event: "${eventTitle}"
    - Student Interests: ${learner.interests}
    - Student Country: ${learner.country}
    - Personal Facts: ${learner.facts || 'N/A'}
    
    Instructions:
    - The message should be warm, celebrating the event or wishing them well.
    - Relate it to their interests if possible.
    - Keep it under 50 words.
    - Use emojis.
    - Do NOT include the student's name in the start (e.g. "Hi Thalia"), just the message body.
    - Be creative and sincere.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.8,
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating event greeting:", error);
        return null;
    }
};

export interface BatchGreetingResponse {
    learnerId: string;
    greeting: string;
}

export const generateBatchEventGreetings = async (learners: Learner[], eventTitle: string): Promise<BatchGreetingResponse[] | null> => {
    if (!API_KEY || learners.length === 0) return null;

    const batchGreetingSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                learnerId: {
                    type: Type.STRING,
                    description: "The ID of the learner.",
                },
                greeting: {
                    type: Type.STRING,
                    description: "The personalized greeting message for this learner.",
                },
            },
            required: ["learnerId", "greeting"],
        },
    };

    const learnersData = learners.map(learner => ({
        id: learner.id,
        name: learner.name,
        interests: learner.interests,
        country: learner.country,
        facts: learner.facts || 'N/A'
    }));

    const prompt = `
    You are a heartwarming and motivating ESL tutor.
    Your task is to write a short, personalized greeting message for EACH student in the provided list.

    Context:
    - Upcoming Event: "${eventTitle}"
    - Student Data: ${JSON.stringify(learnersData, null, 2)}

    Instructions for EACH greeting:
    - The message must be warm, celebrating the event or wishing them well.
    - Personalize it by relating to the student's interests, country, or facts.
    - Keep each message under 50 words.
    - Use emojis appropriate for the event and student.
    - Do NOT include the student's name at the start of the message (e.g., "Hi Thalia"). The message body should be just the greeting itself.
    - Be creative and sincere.

    Return the output as a JSON array, where each object contains the 'learnerId' and the generated 'greeting' message.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: batchGreetingSchema,
                temperature: 0.8,
            }
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as BatchGreetingResponse[];
    } catch (error) {
        console.error("Error generating batch event greetings:", error);
        return null;
    }
};

export const generateStudyGuidePage = async (content: string, learner: Learner): Promise<string | null> => {
    if (!API_KEY) return null;

    const learnerLevel = learner.coursePlan.level;
    const learnerL1 = learner.languages?.[0] || 'their native language';

    const prompt = `
You are an expert web developer and ESL curriculum designer. Your task is to create a single, complete, offline-first HTML5 file for a personalized pre-class study guide.
The file must contain all necessary HTML, CSS, and JavaScript, with NO external libraries except for Font Awesome.

**LEARNER CONTEXT:**
- **Name:** ${learner.name}
- **CEFR Level:** ${learnerLevel}
- **First Language (L1):** ${learnerL1}

**CORE LESSON CONTENT (for analysis):**
---
${content}
---

**CRITICAL INSTRUCTIONS (MUST FOLLOW):**
1.  **Generate & Simplify:** Your first step is to analyze the provided Core Lesson Content. Based on it, create a simplified main text for the study guide. This text MUST be written in simple, non-metaphorical English, one CEFR level below the learner's level of **${learnerLevel}**. For example, if they are B2, write the main text in B1 English.
2.  **Use L1 for Explanations:** The learner's first language is **${learnerL1}**. You MUST use this language for the following sections:
    -   A comprehensive glossary of 5-7 key terms identified from the content. Provide the English word and its definition in **${learnerL1}**.
    -   Detailed explanations for 1-2 important grammar points found in the text. The explanation must be in **${learnerL1}**.
    -   The answers/explanations in the 'Check Your Understanding' section.
3.  **HTML Structure & Content:** The HTML must be well-structured and include these color-coded sections:
    -   **Main Reading:** The simplified text you generated.
    -   **Key Vocabulary & Glossary:** A list of key terms with definitions in **${learnerL1}**.
    -   **Grammar Focus:** Grammar points from the text, explained in **${learnerL1}**.
    -   **Check Your Understanding:** A mix of 3-4 Q&A to test comprehension (e.g., multiple choice, short answer).
    -   **(Optional) Visual Aids:** If the content is suitable (e.g., a historical event, a scientific process), generate a simple timeline or mind map using HTML/CSS.
    -   **(Optional) Speaking Practice:** Include a section with 1-2 prompts for the learner to prepare to explain a concept from the lesson in their own words.
4.  **HTML/CSS/JS Features (MUST be included):**
    -   **Styling:** Style the page with a white Duolingo-like theme: white background, black/dark gray text, bright accent colors (like blue, green, orange) for section headers and highlights, and a highly readable font like 'Nunito' (imported from Google Fonts). Use 3D-style cards for sections.
    -   **Font Awesome:** Include a \`<link>\` to the Font Awesome CDN in the \`<head>\`. Use icons in section headers.
    -   **Read Aloud:** Implement a 'Read Aloud' feature for the main English text using the browser's \`speechSynthesis\` API. It must have 'Play', 'Pause', and 'Resume' buttons and work correctly.
    -   **Google Translate:** Include a 'Translate Full Text' button that opens \`https://translate.google.com/?sl=en&tl=${learnerL1}&text=[URL-encoded_main_text]\` in a new tab.
5.  **Output Format:** Output ONLY the raw, complete HTML code, starting with \`<!DOCTYPE html>\`. Do not wrap it in markdown backticks or any other text.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.4,
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating study guide page:", error);
        return null;
    }
};

export const getAICompetencySuggestions = async (learner: Learner): Promise<{ needName: string; suggestedCompetencies: string[] }[] | null> => {
    if (!API_KEY) return null;

    const competencySuggestionSchema = {
        type: Type.ARRAY,
        description: "An array of objects, where each object links a learner need to a list of suggested new competencies.",
        items: {
            type: Type.OBJECT,
            properties: {
                needName: { type: Type.STRING, description: "The name of the learner's need." },
                suggestedCompetencies: {
                    type: Type.ARRAY,
                    description: "An array of new, essential competency names that are missing for this need.",
                    items: { type: Type.STRING }
                }
            },
            required: ["needName", "suggestedCompetencies"]
        }
    };

    const prompt = `
    You are an expert ESL curriculum designer. Your task is to analyze a learner's needs, their situations where they will use the language, their lesson focus, and their existing competencies to suggest essential new competencies that are missing.

    **Learner Profile:**
    - Needs: ${JSON.stringify(learner.needs.map(n => n.name))}
    - Situations (where they will use the language): ${learner.situations || 'N/A'}
    - Lesson Focus (What the lessons should concentrate on): ${learner.focus || 'N/A'}
    - Existing Competencies: ${JSON.stringify(learner.competencies.map(c => c.name))}

    **Instructions:**
    1. For each learner need, identify standard, essential competencies that are crucial for mastering that need.
    2. Compare these essential competencies against the learner's "Existing Competencies".
    3. If an essential competency is missing, add it to your response.
    4. ONLY suggest new competencies. Do not suggest competencies that already exist.

    **Example:**
    - If a need is "IELTS Preparation" and existing competencies are ["Speaking", "Listening"], you should suggest essential IELTS-specific competencies like "Grammatical Range and Accuracy", "Lexical Resource", "Coherence and Cohesion", and "Pronunciation".

    Return your response in the specified JSON format. If no new competencies are needed for a particular need, you can omit it from the response.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: competencySuggestionSchema
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error getting AI competency suggestions:", error);
        return null;
    }
};

export const getAIAchievementSuggestions = async (learner: Learner): Promise<{ name: string; description: string; icon: string; }[] | null> => {
    if (!API_KEY) return null;

    const achievementSuggestionSchema = {
        type: Type.ARRAY,
        description: "An array of 3-5 personalized achievement objects.",
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "A creative name for the achievement." },
                description: { type: Type.STRING, description: "A short, motivating description of how to earn the achievement." },
                icon: { type: Type.STRING, description: "A relevant Font Awesome 5 icon class (e.g., 'fas fa-rocket')." }
            },
            required: ["name", "description", "icon"]
        }
    };

    const prompt = `
    You are a creative gamification expert designing achievements for an ESL learning platform. Your task is to generate 3-5 unique, personalized achievements for a learner based on their profile.

    **Learner Profile:**
    - Name: ${learner.name}
    - Needs: ${JSON.stringify(learner.needs.map(n => n.name))}
    - Interests: ${learner.interests}
    - Situations (where they will use L2): ${learner.situations || 'N/A'}
    - Lesson Focus (What the lessons should concentrate on): ${learner.focus || 'N/A'}
    - Occupation: ${learner.occupation}
    - Current Personalized Achievements: ${JSON.stringify(((learner as any).personalizedAchievements || []).map((a: any) => a.name))}

    **Instructions:**
    1. Analyze the learner's needs, interests, and occupation to create relevant and motivating achievements.
    2. The achievements should be specific and actionable goals.
    3. Do not suggest achievements that are already in the "Current Personalized Achievements" list.
    4. For each achievement, provide a creative name, a short description of how to earn it, and a relevant Font Awesome icon class (e.g., "fas fa-user-tie").
    5. Do not create generic achievements like "Complete 5 sessions". Focus on personalized goals tied to their profile.

    **Examples:**
    - For a software developer interested in gaming: { name: "Code Commenter Pro", description: "Explain a complex piece of code in clear English during a session.", icon: "fas fa-code" }
    - For someone who needs to travel: { name: "Airport Navigator", description: "Successfully complete a role-play of checking in for a flight and going through security.", icon: "fas fa-plane-departure" }

    Return your response in the specified JSON format.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: achievementSuggestionSchema
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error getting AI achievement suggestions:", error);
        return null;
    }
};

export const generateSingleAIChatMessage = async ({ learner, topic }: { learner: Learner, topic: string }): Promise<string | null> => {
    if (!API_KEY) return null;

    const prompt = `
    You are an ESL buddy writing a single, casual, and encouraging chat message to a learner named ${learner.name}.
    Your task is to write a short message (2-3 sentences) to accompany the "${topic}" I am about to send them.
    
    VIBE CHECK:
    - Be friendly, positive, and use modern, authentic slang (e.g., "low-key impressive," "the glow-up is real," "that's a whole vibe").
    - AVOID overused phrases like "nailed it" or "crushed it."
    - Use relevant emojis. 🥳🎉🚀
    - End with a fun, open-ended question to get them to reply.
    - Address the learner directly as "you".

    Example for topic "Progress Report":
    "Heyyyy! 👋 Just sent over your latest progress report and wanted to say the glow-up is real! Seriously, your hard work is paying off. ✨ What's one thing you're feeling super proud of this week?"

    Now, generate a message for the topic: "${topic}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.9,
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating single AI chat message:", error);
        return null;
    }
};

export const getAICopilotResponse = async (learner: Learner, question: string): Promise<string | null> => {
    if (!API_KEY) return null;

    // Create a leaner version of the learner object for the prompt
    const leanerProfile = {
        ...learner,
        sessions: (learner.sessions || []).map(s => {
            const { script, reflection, ...rest } = s;
            return rest;
        })
    };

    const prompt = `You are an expert AI assistant and data analyst for an ESL tutor. Your role is to provide insightful answers about a learner based on their profile data.

    **Your Task:**
    1.  Carefully analyze the learner's profile data provided in JSON format.
    2.  Answer the tutor's question by synthesizing information from across the entire profile (sessions, competencies, needs, etc.).
    3.  **Go beyond simple data retrieval.** Provide analysis, infer patterns, and offer advice based on the data. For example, if asked about something not explicitly mentioned (like IELTS), analyze their current skills and goals to provide a reasoned opinion on their readiness or what steps they should take.
    4.  Be concise, helpful, and data-driven, but do not just state that data is missing. Use your expertise to fill in the gaps with logical advice based on the provided JSON.

    **Learner Profile Data:**
    \`\`\`json
    ${JSON.stringify(leanerProfile, null, 2)}
    \`\`\`

    **Tutor's Question:**
    "${question}"

    **Your Answer:**
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for copilot response:", error);
        return "I'm sorry, I encountered an error while processing your request.";
    }
};

export const generateHyperPersonalizedLesson = async ({ learner, languageInput, lessonContext }: { learner: Learner, languageInput: string, lessonContext: string }): Promise<string | null> => {
    if (!API_KEY) return null;

    const age = calculateAge(learner.birthday);
    const recycleBin = [...new Set(learner.sessions.flatMap(s => s.needsHelp || []))]
        .filter(item => !(learner.masteredSkills || []).includes(item))
        .slice(0, 10);

    const prompt = `
    You are a professional English language teacher who talks directly to the learner and explains everything in a dialogic way by asking, eliciting, and then providing detailed explanations. 
    Your goal is to create a hyper-personalized, gamified HTML lesson by reverse-engineering the learner's mistakes from a provided transcript or writing sample.

    **Learner Profile:**
    - **Name:** ${learner.name}
    - **Age:** ${age || 'Not provided'}
    - **Level:** ${learner.coursePlan.level}
    - **Occupation:** ${learner.occupation || 'N/A'}
    - **Interests:** ${learner.interests}
    - **Situations (where they will use the language):** ${learner.situations || 'N/A'}
    - **Lesson Focus (What lessons should concentrate on):** ${learner.focus || 'N/A'}
    - **Facts:** ${learner.facts || 'N/A'}
    - **Recycle Bin (Past Weaknesses):** ${recycleBin.join(', ')}
    - **Local Time:** ${new Date().toLocaleString('en-US', { timeZone: learner.timezone || 'UTC' })}
    - **Student Avatar Image URL (Use for placing the student's avatar image inside output lessons):** "__STUDENT_AVATAR__"

    **Inputs:**
    - **Raw Language Input (Analyze this for errors/gaps):** 
    """
    ${languageInput}
    """
    - **Lesson Context/Goal:** "${lessonContext}"

    **PEDAGOGICAL STRATEGY (CRITICAL):**
    1.  **Dialogic & Interactive:** Use 2nd person ("You"). Ask questions, use "Would you rather", and create debates.
    2.  **Input Flooding & Best Practices:** Create long, natural dialogues (5+ turns) and texts incorporating the *correct* usage of target language.
    3.  **Specific Core Elements (2026 Pedagogy Standards):** Identify, highlight, and teach the following target categories:
        *   **Required Grammar**: Tenses, passive structures, syntactic structures, clause types, modality, or spoken grammar (ellipses, headers/tails).
        *   **Target Vocabulary**: Rich vocabulary words, collocations, phrasal verbs, idioms vs clichés, and false friends.
        *   **Functional Language**: Concrete situational phrases (polite requests, agreeing/disagreeing, apologizing, hedging, register consistency).
        *   **Required Skills Needed**: Active listening strategies, coherence & cohesion devices (PEEL method, signposting, linking words), pronunciation/intonation, or turn-taking.
        *   **Communication Strategies**: Strategies to manage breakdowns (self-correction, circumlocution, hesitation/buying time tricks).
        *   **Interactive Tips**: Concrete diagnostic tips, pronunciation tricks (connected speech, elision, word stress), and cultural notes.
    4.  **10X Content:** This must be a substantial lesson with detailed, rich explanations, not just a quick fix. Incorporate the best learning paradigms, 2026 search resources, and latest internet standards to design the content.

    **OUTPUT FORMAT:**
    Generate a SINGLE, self-contained HTML5 file.
    -   **Design:** White background, bright Duolingo-inspired colors (Green #58CC02, Blue #1CB0F6, Yellow #FFC800, Red #FF4B4B), rounded corners, large readable fonts (Nunito).
    -   **Structure:**
        -   **Warm-up:** Personalized greeting using time/facts.
        -   **The Target Core Panel**: A beautiful visual overview block highlighting the *Required Grammar*, *Vocabulary*, *Functional Language*, *Skills Trained*, *Strategies*, and *Tutor Tips*.
        -   **The "Fix":** Show original mistakes vs. corrected versions. Explain *why* in detail using the focus areas above.
        -   **Practice:** Dialogues, "Fill in the blanks", "Match the definition".
        -   **Production:** "Would you rather", Debate topics, Role-play scenarios.
    -   **Technical:** No external CSS/JS files (use inline or internal styles). Tailwind CDN is allowed.

    **HTML Structure:**
    \`\`\`html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Personalized Lesson for ${learner.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        
        <style>
            body { font-family: 'Nunito', sans-serif; background-color: #ffffff; color: #4b4b4b; }
            .card { background-color: #ffffff; border: 2px solid #e5e5e5; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 0 #e5e5e5; }
            .section-header { font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; color: #4b4b4b; display: flex; align-items: center; gap: 0.5rem; }
            .btn { display: inline-block; background-color: #58cc02; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 800; text-transform: uppercase; box-shadow: 0 4px 0 #46a302; transition: all 0.1s; text-align: center; cursor: pointer; }
            .btn:active { transform: translateY(4px); box-shadow: 0 0 0 #46a302; }
            .highlight { color: #1cb0f6; font-weight: 800; }
            .correction-box { background-color: #ff4b4b20; border-left: 4px solid #ff4b4b; padding: 16px; margin: 12px 0; border-radius: 8px; }
            .better-box { background-color: #58cc0220; border-left: 4px solid #58cc02; padding: 16px; margin: 12px 0; border-radius: 8px; }
            .dialogue-bubble { padding: 12px 16px; border-radius: 16px; margin-bottom: 8px; max-width: 80%; }
            .bubble-left { background-color: #f7f7f7; border: 2px solid #e5e5e5; color: #4b4b4b; margin-right: auto; }
            .bubble-right { background-color: #1cb0f6; color: white; margin-left: auto; border: 2px solid #1899d6; }
        </style>
    </head>
    <body class="p-6 max-w-4xl mx-auto bg-gray-50">
        <!-- AI GENERATED CONTENT GOES HERE -->
    </body>
    </html>
    \`\`\`

    Output ONLY the raw HTML string.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        let text = response.text.trim();
        // Strip markdown code blocks if present
        if (text.startsWith('```html')) {
            text = text.replace(/^```html/, '').replace(/```$/, '').trim();
        }
        
        const studentAvatarUrl = getAvatarUrl(learner.gender, learner.avatarId, learner.name);
        const finalHtml = text.replace(/__STUDENT_AVATAR__/g, studentAvatarUrl);
        return finalHtml;
    } catch (error) {
        console.error("Error generating hyper-personalized lesson:", error);
        return null;
    }
}