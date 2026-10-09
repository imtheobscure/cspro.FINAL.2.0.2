
import { Type } from "@google/genai";
import type { LearnerProfile, StructuredOutput } from '../../../types';
import { generateJsonContent, getProfileContext, createErrorSection } from '../../../services/generation/core';
import type { ChecklistStateItem } from '../../../components/content/FeatureChecklist';

// --- Schemas ---
const activitySchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, description: "Type of activity: 'paragraph' for rich HTML teaching content, 'voice_recording' for speaking tasks, or 'essay_writing' for writing tasks." },
        title: { type: Type.STRING, description: "The title of the activity subsection. You can include relevant emojis." },
        content: { type: Type.STRING, description: "The main content. For lists or questions, use newline characters to separate items. You MUST use HTML tags (<b>, <i>) and emojis for emphasis. CRITICAL: Do NOT use underline (<u>) tags. Do NOT use markdown or Font Awesome tags." }
    },
    required: ["type", "title", "content"]
};

const lessonSectionSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Include a relevant emoji in the title." },
        color: { type: Type.STRING, description: "A hex color code with strong contrast." },
        activities: { type: Type.ARRAY, items: activitySchema },
        studyTime: { type: Type.STRING, description: "An estimated time for studying this section, e.g., 'Approx. 10 minutes'." },
    },
    required: ["title", "color", "activities", "studyTime"]
};

const singleSectionSchema = {
    type: Type.OBJECT,
    properties: {
        section: lessonSectionSchema
    },
    required: ["section"]
};

const outlineSchema = {
    type: Type.OBJECT,
    properties: {
        sections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                },
                required: ["title", "description"]
            }
        },
        lessonSummary: { type: Type.STRING }
    },
    required: ["sections", "lessonSummary"]
};

// --- Service Function ---
export const generateExplainerLesson = async (profile: LearnerProfile, rawText: string, useThinkingMode: boolean, featuresState: ChecklistStateItem): Promise<{ lesson: StructuredOutput; lessonSummary: string; }> => {
    
    const customInstruction = featuresState.custom.trim();
    const targetLang = profile.targetLanguage || 'English';

    const translationInstruction = (profile.enableTranslations ?? true) && profile.translationLanguage
        ? `--- TRANSLATION (CRITICAL & NON-NEGOTIABLE) ---
You MUST provide translations for the following items into the target language: **${profile.translationLanguage}**. This is a critical, non-negotiable requirement. Be extremely generous; translate more, not less. 
CRITICAL FORMATTING: You MUST wrap ALL translations in SQUARE BRACKETS [ ]. Do NOT use parentheses.
Integrate the translations naturally into the text immediately after the ${targetLang} phrase. 
---`
        : '';
    
    const languageFocusInstruction = profile.languageFocus
        ? `--- LANGUAGE FOCUS (CRITICAL) ---
You MUST forcefully and frequently recycle the following language focus throughout the entire lesson: "${profile.languageFocus}". This is a critical, non-negotiable requirement.
---`
        : '';

    // STEP 1: OUTLINE
    const outlinePrompt = `
    ${getProfileContext(profile)}
    
    RAW TEXT: ---
    ${rawText}
    ---
    
    Task: Scan the raw text to find distinct lessons/topics/headers (e.g., 1.1, 1.2, Unit A).
    Return a list of these distinct sections with a title and brief description for each.
    Also provide a lesson summary.
    `;

    try {
        const outlineResult = await generateJsonContent(outlinePrompt, outlineSchema, useThinkingMode);
        const sectionsOutline = outlineResult.sections;
        const fullSections: any[] = [];

        // STEP 2: BATCH GENERATION
        for (const outlineItem of sectionsOutline) {
            const sectionPrompt = `
            ${getProfileContext(profile)}
            ${languageFocusInstruction}
            ${translationInstruction}
            ${customInstruction ? `--- CUSTOM INSTRUCTION: "${customInstruction}" ---` : ''}

            RAW TEXT: ---
            ${rawText}
            ---

            --- CURRENT TASK: GENERATE ONE SECTION ---
            You are creating the section titled: "**${outlineItem.title}**".
            Description: ${outlineItem.description}

            **CRITICAL CONTENT RULES (NEVER REDUCE):**
            1.  **NEVER REDUCE**: Maximize verbosity.
            2.  **NO METAPHORS**: Never use metaphorical language.
            3.  **COHERENCE**: Ensure flow.

            **DIALOGIC TEACHING VOICE**: Speak directly to the learner in 2nd person ("You"). Use a warm, encouraging tutor voice. Address them by name.

            **REQUIRED ACTIVITIES (CRITICAL STRUCTURE - ALL MUST BE TYPE 'paragraph' EXCEPT WHERE NOTED):**
            
            - **Activity 1: Warm-up** (Type: 'paragraph')
              - Title: '🤔 Think about these questions...'
              - Content: A detailed HTML paragraph greeting the learner directly with 5 thought-provoking questions in flowing paragraph style. Use styled <div> with light background. NOT in Q&A accordion format.

            - **Activity 2: Necessary Language** (Type: 'paragraph')
              - Title: '📚 Language You Need'
              - Content: Comprehensive (>1000 words). Teach the SPECIFIC grammar, spoken grammar, lexicalized grammar, discourse markers, vocabulary, phrases, idiomatic expressions from the lesson content. For each word/phrase include definition, example, translation, usage notes, and THREE register synonyms (Formal/Neutral/Informal). Use styled colored divs. Personalize each item.

            - **Activity 3: Conversation / Dialogue** (Type: 'paragraph')
              - Title: '💬 Let's See It in Action'
              - Content: A 10-15 turn dialogue using the lesson language. Styled speaker turns. Add "Did you notice?" section.

            - **Activity 4: Deep Dive Explanation** (Type: 'paragraph')
              - Title: '🔍 Detailed Breakdown'
              - Content: Minimum 800 words, scaffolded from easy to difficult. Include: Step 1 Starting Simple (analogy), Step 2 Building Up, Step 3 Going Deeper (exceptions, nuances). Callout boxes for "Why This Matters", "How This Connects to Your Work/Life", "Personalized Example". End with "Quick Check — Think About These" with 4-6 CCQs at increasing difficulty.

            - **Activity 5: Communication Skills & Strategies** (Type: 'paragraph')
              - Title: '🛠️ Communication Toolkit'
              - Content: Communication strategies (>500 words) with styled divs for Soft Skills, Common Mistakes, and Tips. Use colored backgrounds and borders — do NOT use HTML tags like <b> for structure. Explain WHEN, WHERE, HOW to apply.

            - **Activity 6: Soft Skills & Future Skills** (Type: 'paragraph')
              - Title: '🌟 Skills for Real Life'
              - Content: 2-3 real-life skills (>500 words) with step-by-step guidance personalized to the learner. Styled skill boxes and practice tips.

            - **Activity 7: Real World Application** (Type: 'paragraph')
              - Title: '🌍 Real World Application'
              - Content: Richly detailed introductory "Setting the Scene" (3-4 paragraphs, 400+ words). Then Scenario 1 through Scenario 5 (NOT "Fix the Mistake" or "Positive/Correction" labels). Each scenario includes a full dialogue (300+ words, 12-20 turns) demonstrating the situation. Each scenario in a styled div with "Think About It" questions. Use natural dialogue formatting.

            - **Activity 8: Expert Talk** (Type: 'paragraph')
              - Title: '🎯 Expert Talk'
              - Content: Detailed analysis (>600 words) of each scenario from activity 7. What worked, what could improve, alternative approaches. "How You Can Use This" personalized advice. Replaces Director's Notes.

            - **Activity 9: Dialogues Across Registers** (Type: 'paragraph')
              - Title: '🎭 Same Situation, Different Styles'
              - Content: 3-5 short dialogues (6-10 turns each) in Casual/Informal, Neutral, and Formal registers. Cultural notes and situational strategy boxes after each.

            - **Activity 10: Case Study** (Type: 'paragraph')
              - Title: '📋 Case Study'
              - Content: A real-world article (700-1200 words) simplified to learner level. After the article, 5-7 Discussion & Debate Cards. Each card includes: checklist of points to cover, arguments FOR, counter-arguments AGAINST, and a discussion tip.

            - **Activity 11: Review & Reflection** (Type: 'paragraph')
              - Title: '✅ Review & Reflection'
              - Content: Key points summary, self-reflection questions, and "Your Next Step" actionable task.

            - **Activity 12: Recorded Output** (Type: 'voice_recording')
              - Title: '🎤 Record Your Thoughts'
              - Content: {"prompt": "Record a 60-second summary...", "text": "", "type": "voice_recording"}

            - **Activity 13: Written Output** (Type: 'essay_writing')
              - Title: '✍️ Write About It'
              - Content: {"prompt": "Write a short paragraph...", "minWords": 50, "type": "essay_writing"}

            --- CRITICAL RULES ---
            - **NO GAMES**: No Truth or Dare, Would You Rather, Two Truths One Lie, Never Have I Ever, or any games.
            - **NO matching, gap_fill, error_correction, or "Complete the Sentences"** activities.
            - **ALL activities must be type 'paragraph'** except voice_recording and essay_writing.
            - **Embed YouTube videos and images** at the most relevant point in the content, right after the related text.
            `;

            try {
                const sectionResult = await generateJsonContent(sectionPrompt, singleSectionSchema, useThinkingMode);
                fullSections.push(sectionResult.section);
            } catch (err) {
                console.error(`Failed to generate section ${outlineItem.title}`, err);
                fullSections.push(createErrorSection(outlineItem.title, "Failed to generate content for this section."));
            }
        }

        return {
            lesson: { sections: fullSections },
            lessonSummary: outlineResult.lessonSummary || "Summary could not be generated."
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            lesson: { sections: [createErrorSection("Explainer Lesson", errorMessage)] },
            lessonSummary: "No summary generated due to an error."
        };
    }
};
