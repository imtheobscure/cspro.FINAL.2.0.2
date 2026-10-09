/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionSegment, Emotion, TeacherFeedback, StudentProfile, LanguageMistake } from "../types";

// Helper to retrieve/save local storage API Key securely
export const getStoredApiKey = (): string | null => {
  return localStorage.getItem("tutorly_api_key");
};

export const setStoredApiKey = (key: string): void => {
  localStorage.setItem("tutorly_api_key", key);
};

export const removeStoredApiKey = (): void => {
  localStorage.removeItem("tutorly_api_key");
};

// Simple hook-like utility for usage tracking
export const getProcessedSeconds = (): number => {
  const v = localStorage.getItem("tutorly_processed_seconds");
  return v ? parseInt(v, 10) : 0;
};

export const addProcessedSeconds = (seconds: number): number => {
  const current = getProcessedSeconds();
  const next = current + seconds;
  localStorage.setItem("tutorly_processed_seconds", next.toString());
  return next;
};

export const getApproxRemainingMinutes = (): number => {
  // Typical daily/monthly free tier capacity estimate of ~45 minutes of audio
  const totalAllocatedMinutes = 45;
  const processedMinutes = getProcessedSeconds() / 60;
  return Math.max(0, parseFloat((totalAllocatedMinutes - processedMinutes).toFixed(1)));
};

// Validate the provided API Key using a lightweight query
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey || apiKey.trim() === "") return false;
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Test API connection. Respond ONLY with 'OK'.",
    });
    return response.text?.trim().toUpperCase().includes("OK") || false;
  } catch (error) {
    console.error("API Key Validation Failed:", error);
    return false;
  }
};

const parseJson = (text: string) => {
  try {
    const cleanText = text.replace(/```json\n|\n```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON response:", e);
    // Find first '{' and last '}' as backup parser
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        const fallback = text.substring(firstBrace, lastBrace + 1);
        return JSON.parse(fallback);
      } catch (err) {
        console.error("Fallback JSON parse failed too:", err);
      }
    }
    return null;
  }
};

export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string,
  customApiKey?: string,
  studentName?: string,
  tutorName?: string,
  micAssignment?: 'tutor' | 'learner',
  tabAssignment?: 'tutor' | 'learner'
): Promise<{ segments: TranscriptionSegment[]; summary: string }> => {
  const apiKey = customApiKey || getStoredApiKey();
  if (!apiKey) {
    throw new Error("No Gemini API key is available. Please enter a valid API key first.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Use gemini-3.5-flash for speed and multi-modal handling
  const modelId = "gemini-3.5-flash";

  const prompt = `
    You are an expert audio transcription assistant in language learning.
    Process the provided audio file and generate a detailed transcription.
    
    Requirements:
    1. Identify distinct speakers.
       - The primary Student/Learner's name is "${studentName || 'Jean-Pierre'}". Use this name as the speaker label whenever the student talks.
       - The Tutor's name is "${tutorName || 'Sarah'}". Use this name as the speaker label whenever the tutor talks.
       - If some minor other voices are captured (not the majority of the time), label them as "Female Speaker" or "Male Speaker".

    2. Stream Assignment Context (Strict Guideline to never mix up voices or swap speaker roles):
       - Microphone stream contains: ${micAssignment === 'tutor' ? 'Tutor (' + (tutorName || 'Sarah') + ')' : 'Learner (' + (studentName || 'Jean-Pierre') + ')'}
       - Tab/System audio stream contains: ${tabAssignment === 'tutor' ? 'Tutor (' + (tutorName || 'Sarah') + ')' : 'Learner (' + (studentName || 'Jean-Pierre') + ')'}
       Please strictly follow these assignments and never confuse the voices based on this layout!

    3. Provide accurate timestamps for each segment (Format: MM:SS).
    4. Detect the primary language of each segment.
    5. If the segment is in a language different than English, also provide the English translation.
    6. Identify the primary emotion of the speaker in this segment. You MUST choose exactly one of the following: Happy, Sad, Angry, Neutral.
    7. Provide a brief summary of the entire audio at the beginning.
    
    Output Format: JSON object with the following structure:
    {
      "summary": "CONCISE SUMMARY...",
      "segments": [
        {
          "speaker": "${tutorName || 'Sarah'}",
          "timestamp": "00:00 - 00:15",
          "content": "Hello, how are you doing today?",
          "language": "English",
          "language_code": "en",
          "translation": "",
          "emotion": "Happy"
        },
        ...
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A concise summary of the audio content.",
            },
            segments: {
              type: Type.ARRAY,
              description: "List of transcribed segments with speaker and timestamp.",
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  content: { type: Type.STRING },
                  language: { type: Type.STRING },
                  language_code: { type: Type.STRING },
                  translation:  { type: Type.STRING },
                  emotion: { 
                    type: Type.STRING, 
                    description: "The emotion of the speaker.",
                    enum: Object.values(Emotion)
                  },
                },
                required: ["speaker", "timestamp", "content", "language", "language_code", "emotion"],
              },
            },
          },
          required: ["summary", "segments"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text received from Gemini.");

    const data = parseJson(text);
    if (!data) throw new Error("Parsed transcription returned null.");
    return data;

  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    throw error;
  }
};

export const generateTeacherFeedback = async (
  segments: TranscriptionSegment[],
  student: StudentProfile,
  customApiKey?: string
): Promise<TeacherFeedback> => {
  const apiKey = customApiKey || getStoredApiKey();
  if (!apiKey) {
    throw new Error("No Gemini API key is available. Please enter a valid API key first.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelId = "gemini-3.5-flash";

  const serializedSegments = JSON.stringify(segments);
  
  // Construct language-specific instructions based on L1/L2 details
  const l1Instruction = student.addL1Translations 
    ? `Since 'Language L1 comparisons' is checked, analyze structural differences between the student's L1 (${student.l1}) and the target language L2 (${student.l2}). Highlight "falseFriends" if relevant (e.g. actually vs actualmente, if Spanish is L1). Include comparisons in the explanation of mistakes when helpful.`
    : `Do not add L1 translations or L1 comparisons. The "falseFriends" array can be empty or relate only to general common errors.`;

  const explanationsLanguageInstruction = student.explanationsInEnglish
    ? `Write all pedagogical explanations, rule cards, and summaries in English.`
    : `Write all summaries, key takeaways, passive/active explanations, style suggestions, error explanations, grammar card rules, standout sentence analyses, and homework instructions ENTIRELY in the target language L2: ${student.l2}. Do not use English unless absolutely unavoidable for comparisons.`;

  const prompt = `
    You are an elite, highly experienced language tutor assistant.
    Your task is to analyze the following language lesson transcript segments where a student talks with a teacher.
    
    Student/Learner Context:
    - Name: ${student.name}
    - Nationality: ${student.nationality}
    - L1 Native Language: ${student.l1}
    - L2 Target Language (the language being taught/learned): ${student.l2}
    - Focused Language Elements / Notes: ${student.focusedLanguage}
    - General facts/details: ${student.facts}

    Tutor Context:
    - Tutor Name: ${student.tutorName || 'Sarah'}

    Transcription Data (original raw speech):
    ${serializedSegments}

    *** CRITICAL PEDAGOGICAL DIRECTIVE ***
    - The Tutor is: ${student.tutorName || 'Sarah'}. Transcribe and acknowledge the tutor, but DO NOT analyze the tutor's segments for mistakes, grammatical flaws, vocabulary flaws, CEFR leveling, or pronunciation errors.
    - All grammar corrections ("grammarInsights: mistakes"), pronunciation logs ("pronunciationFeedback"), vocabulary analyses ("vocabulary: activeVocab", "vocabulary: overusedWords", etc.), CEFR evaluations, synonym suggestions, and exercises MUST focus exclusively on the Learner's performance: ${student.name}.
    - Never include errors or critical feedback targeting the Tutor: ${student.tutorName || 'Sarah'}.
    
    Analyze the raw transcript deeply, accounting for talking ratios, vocabulary levels, formatting styles, and grammatical inaccuracies.
    ${l1Instruction}
    ${explanationsLanguageInstruction}
    
    Generate and return a single, beautifully structured JSON conforming to the requested schema. Do not include any placeholder or mock strings; generate real valuable, pedagogical data compiled for this session.

    Your output MUST be a JSON object with this exact structure:
    {
      "generalLessonTopic": "Subject of discussion (e.g., Weekend activities, Travel challenges, Workplace discussions)",
      "subtopicClustering": [
        {
          "title": "Subtopic Title 1",
          "description": "Short explanation of the shift/focus in the conversation.",
          "timestamp": "Start timestamp (e.g., 00:00)"
        }
      ],
      "keyTakeaways": {
        "wins": ["bullet 1 outlining student triumphs during class", "bullet 2..."],
        "futureFocus": ["bullet 1 detailing exact items that need future reinforcement", "bullet 2..."]
      },
      "vocabulary": {
        "totalWords": 150, // estimated count of student words
        "newWordsCount": 8,  // count of new words introduced/discussed
        "passiveVocab": ["words student understood from context/teacher but did not actively use"],
        "activeVocab": ["difficult words student produced correctly/properly during speech"],
        "overusedWords": [
          {
            "word": "word flagging (e.g., nice)",
            "count": 4, // count of occurrences >3x
            "alternatives": ["alternative 1", "alternative 2", "alternative 3"]
          }
        ],
        "wordFamilyExpansion": [
          {
            "base": "new vocabulary base word (e.g. decide)",
            "family": ["decision", "decisive", "undecided"]
          }
        ],
        "falseFriends": [
          {
            "word": "word that student used or might confuse",
            "l1Meaning": "meaning in student's L1",
            "actualMeaning": "actual correct definition in L2",
            "warning": "False friend comparison warning text"
          }
        ]
      },
      "cefrLevel": {
        "level": "A1/A2/B1/B2/C1/C2 based on their target language performance",
        "targetLevelProjection": "Custom target advice text (e.g., 'To reach B2, you need 15% more B2-level vocabulary. Here are...')",
        "missingWordsList": ["word 1", "word 2", "word 3"]
      },
      "advancedVocab": {
        "idiomsPhrasalDashboard": {
          "attempted": 2, // count of idioms attempted
          "usedCorrectly": 1, // count used correctly
          "list": [
            {
              "idiom": "idiom or phrasal verb",
              "definition": "definition of the phrase",
              "status": "attempted", // 'attempted', 'correct', or 'recommended'
            }
          ]
        }
      },
      "synonymSuggestions": [
        {
          "studentSpoke": "original simple phrase student said",
          "formalVersion": "high-register/formal suggestion in L2",
          "casualVersion": "low-register/conversational suggestion in L2",
          "note": "brief usage note"
        }
      ],
      "grammarInsights": {
        "mistakes": [
          {
            "id": "unique_string_id_1",
            "timestamp": "00:15",
            "type": "tense", // choose from: "article", "preposition", "subject-verb agreement", "tense", "word choice", "pronunciation"
            "error": "observed flawed phrasing",
            "correction": "accurate phrasing correction",
            "explanation": "clear grammar explanation of why it is wrong",
            "ruleId": "rule_sv_agreement", // links to items in ruleBank
            "persistenceCount": 2 // frequency of this type of mistake in current lesson
          }
        ],
        "ruleBank": [
          {
            "id": "rule_sv_agreement",
            "title": "Rule Card: Subject-Verb Agreement",
            "content": "Short teacher-editable summary of verb agreements with third-person subjects."
          }
        ],
        "positiveReinforcement": [
          "instances of highly complex structure used flawlessly (e.g. 'I would have gone if I had known')"
        ]
      },
      "speakingMetrics": {
        "speakingTimeRatio": {
          "student": 55, // student talk percentage, e.g. 55
          "tutor": 45  // tutor talk percentage, e.g. 45
        },
        "turnTakingFairnessScore": 85, // 0-100 score on fairness (ideal student time is 40-60%)
        "fillerWordDensity": {
          "averageDensity": 2.4, // um/uh/like per minute
          "trendData": [
            { "minute": 1, "count": 2 },
            { "minute": 2, "count": 3 }
          ],
          "fillerWords": [
            { "word": "like", "count": 5 },
            { "word": "um", "count": 3 }
          ]
        },
        "standoutSentence": {
          "sentence": "the most interesting/complex sentence spoken by the student",
          "analysis": "syntactic review highlighting structural integrity/complexity",
          "structurallySound": true
        }
      },
      "pronunciationFeedback": [
        {
          "word": "observed word mispronounced",
          "phoneticGuidance": "phonetic/IPA guide",
          "mispronounced": true,
          "timestamp": "01:20"
        }
      ],
      "connectedFeatures": {
        "dailyExercises": [
          {
            "day": 1, // generate exactly 7 exercises for Day 1 to Day 7
            "type": "fill-blank", // choose 'drag-drop', 'fill-blank', or 'multiple-choice'
            "question": "question sentence with blank or task",
            "options": ["option A", "option B", "option C"], // optional for MC / drag-drop
            "correctAnswer": "correct word",
            "explanation": "why this matches the lesson grammar focus rule"
          },
          ...
          {
            "day": 7,
            "type": "multiple-choice",
            "question": "...",
            "options": ["...", "..."],
            "correctAnswer": "...",
            "explanation": "..."
          }
        ],
        "scenarios": [
          {
            "title": "Scenario 1 (e.g., Room Accommodation complaint)",
            "basic": {
              "description": "Description of basic task",
              "tasks": ["task 1", "task 2"]
            },
            "intermediate": {
              "description": "Description of intermediate task",
              "tasks": ["task 1", "task 2"]
            },
            "advanced": {
              "description": "Description of advanced complaining task",
              "tasks": ["task 1", "task 2"]
            }
          },
          {
            "title": "Scenario 2...",
            "basic": { "description": "...", "tasks": [] },
            "intermediate": { "description": "...", "tasks": [] },
            "advanced": { "description": "...", "tasks": [] }
          },
          {
            "title": "Scenario 3...",
            "basic": { "description": "...", "tasks": [] },
            "intermediate": { "description": "...", "tasks": [] },
            "advanced": { "description": "...", "tasks": [] }
          }
        ]
      }
    }

    Your response must be VALID JSON ONLY, do not explain or prefix anything.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text received from Gemini analysis.");

    const data = parseJson(text);
    if (!data) throw new Error("Response failed to parse to TeacherFeedback structure.");

    return data as TeacherFeedback;

  } catch (error) {
    console.error("Gemini Feedback Generation Error:", error);
    throw error;
  }
};

export const generateVisualLessonNotes = async (
  tutorTranscription: string,
  student: StudentProfile,
  customApiKey?: string
): Promise<string> => {
  const apiKey = customApiKey || getStoredApiKey();
  if (!apiKey) {
    throw new Error("No Gemini API key is available. Please enter a valid API key first.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelId = "gemini-3.5-flash";

  const prompt = `
    You are an award-winning UI/UX programmer and language learning curriculum designer.
    Your task is to generate and return a complete, highly immersive, and beautiful single-page HTML5 block containing visual, interactive Lesson Notes based on what the Tutor taught in class.

    Context:
    - Tutor Name: "${student.tutorName || 'Sarah'}"
    - Learner: "${student.name}" (L1: ${student.l1}, L2: ${student.l2}, Prep goals: ${student.facts})
    - Tutor's Spoken Material / Transcript: "${tutorTranscription || 'Practical subjunctive forms and usage contexts discussed.'}"

    Design Requirements for the HTML5 code:
    1. Visual & Premium Design: Use modern CSS (inline Tailwind CSS style classes are permitted, e.g. bg-indigo-50, shadow-lg, text-slate-800, etc., or pure CSS). Make it feel like a professional, polished custom module from Duolingo or Masterclass.
    2. Interactive CCQs: Generate at least 2 multiple choice or interactive questions with clickable buttons and instant inline JavaScript feedbacks (e.g. flashing green on correct choice, opening details explanation accordion/drawer upon click).
    3. Structural Layout:
       - Header Banner: Visual course summary, beautiful gradients, title and course objectives.
       - Masterclass Concept: A beautifully structured board detailing main rules, visual tables (with borders, hover rows), and tip banners.
       - Audio/Visual prompts: Recommended stock illustration concepts, interactive indicators, and classroom insights.
       - Interactive Review: An interactive quiz section and recommended study strategy checklists.
    4. Self-Contained: Everything must be completely self-contained in a single master element. Include all styles and simple JavaScript functions (like show/hide of element or inline feedback) inside. Do not wrap in <html>, <body> or <head> tags; just start with a root container like <div or <article.

    IMPORTANT: Return ONLY the raw HTML5 component code. Do NOT surround it with markdown code indicators like \`\`\`html or anything else. Just the pure, compliant HTML code block.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    
    let html = response.text || "";
    // Clean up if the model wrapped it anyway
    if (html.includes("```html")) {
      html = html.split("```html")[1].split("```")[0].trim();
    } else if (html.includes("```")) {
      html = html.split("```")[1].split("```")[0].trim();
    }
    return html;
  } catch (error) {
    console.error("Failed to generate visual lesson notes:", error);
    throw error;
  }
};

export const getExternalLessonPrompt = (
  tutorTranscription: string,
  student: StudentProfile
): string => {
  return `Act as an elite interactive curriculum designer and full-stack educational developer.
I want you to generate a super detailed, highly immersive, and fully interactive HTML5 lesson based on the following Tutor transcript and personalized for the learner.

Learner Profile:
- Name: ${student.name}
- Nationality: ${student.nationality}
- L1 (Native Language): ${student.l1}
- L2 (Target Language): ${student.l2}
- Learning Goals: ${student.facts}
- Lesson Focus Area: ${student.focusedLanguage}

Tutor Transcript:
"${tutorTranscription || 'Practical subjunctive forms and classroom interactions.'}"

INSTRUCTIONS FOR THE GENERATED HTML5 LESSON:
1. DESIGN & STRUCTURE: 
   - Use stunning visual containers, borders, rounded panels, shadow boxes, and elegant typography pairing.
   - Use beautiful colored sidecards, alerts, warning boxes, and strategy highlights.
   - Inject realistic inline stock image URLs (from Unsplash or similar free stock websites) to support visual schemas and visual memory.
   - Add recommended tips and teaching strategies framed as "Expert Insights".

2. IMMERSIVE INTERACTIVITY:
   - READ-ALOUD: Design a custom, highly styled Web Speech API voice reader widget where users can select a voice and read sentences or vocabulary definitions aloud with native accents.
   - VOICE FEEDBACK ACTIVATOR: Provide an interactive button that triggers the browser's audio-sensor or prompts users to practice saying sentences, with visual feedback cues.
   - CONCEPT CHECKING (CCQs): At least 3 interactive quiz items with CSS/JS checking logic. When clicked, let them flash green for correct, red for incorrect, and slide open a detailed explanation panel.
   - ROLEPLAY PRACTICE: A simulated dialogue section where they can click various dialogue paths to see different outcomes and feedback.

Please output the complete, self-contained interactive HTML5 block that I can paste directly into my viewer. Just raw HTML (no markdown decorations, no descriptions, just code).`;
};
