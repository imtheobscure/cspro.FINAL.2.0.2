
import { Type } from "@google/genai";
import type { LearnerProfile, StructuredOutput } from '../../../../types';
import { generateJsonContent, getProfileContext, createErrorSection } from '../../../../services/generation/core';
import type { ChecklistStateItem } from '../../../../components/content/FeatureChecklist';

// --- Schemas ---
const activitySchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, description: "One of: 'paragraph', 'list', 'questions', 'matching', 'scramble', 'gap_fill', 'dictation', 'would_you_rather', 'truth_or_dare', 'multiple_choice', 'movie_scene', 'speaking_jam', 'speaking_game', 'vocabulary_table', 'grammar_explanation', 'listening_mc', 'sorting', 'error_correction'." },
        title: { type: Type.STRING, description: "The title of the activity subsection, prepended with a relevant emoji." },
        content: { type: Type.STRING, description: "For standard types, use HTML. For interactive types (movie_scene, games), provide a valid JSON string structure." },
        comprehensiveFeedback: { type: Type.STRING, description: "A MASSIVE, detailed HTML string (approx 800-1500 words equivalent in detail) providing deep, inductive feedback. Address the learner as 'You'. Use colors, emojis, <h3> headers, CCQs with <details> answers, and 'How/When/Where' usage guides. Explain WHY the answers are correct." }
    },
    required: ["type", "title", "content"]
};

const lessonSectionSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "The EXACT heading from the source text PREPENDED with a relevant emoji." },
        color: { type: Type.STRING, description: "A hex color code with strong contrast." },
        activities: { type: Type.ARRAY, items: activitySchema },
        studyTime: { type: Type.STRING, description: "Estimated time." },
        xpReward: { type: Type.NUMBER, description: "XP earned for completing this section." }
    },
    required: ["title", "color", "activities", "studyTime"]
};

// Simplified schema for the loop generation
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
                    title: { type: Type.STRING, description: "Title of the lesson section." },
                    focus: { type: Type.STRING, description: "The specific text segment to cover." }
                },
                required: ["title", "focus"]
            }
        },
        lessonSummary: { type: Type.STRING }
    },
    required: ["sections", "lessonSummary"]
};

// --- Service Function ---
export const generateEnglishLesson = async (profile: LearnerProfile, rawText: string, useThinkingMode: boolean, featuresState: ChecklistStateItem): Promise<{ lesson: StructuredOutput; lessonSummary: string; }> => {
    
    const customInstruction = featuresState.custom.trim();
    const targetLang = profile.targetLanguage || 'English';

    // STEP 1: Generate Outline
    const outlinePrompt = `
    ${getProfileContext(profile)}
    
    RAW TEXT: ---
    ${rawText}
    ---

    Task: Analyze the raw text. Detect distinct lessons or logical units (e.g., Unit 1.1, 1.2, or distinct topics).
    Break the text into 4-6 distinct "Lesson Sections".
    Return a list of these sections. The 'focus' must be a summary of the content for that section.
    Ensure 100% of the raw text is covered sequentially.
    `;

    try {
        const outlineResult = await generateJsonContent(outlinePrompt, outlineSchema, useThinkingMode);
        const sectionsOutline = outlineResult.sections;
        const fullSections: any[] = [];

        // STEP 2: Generate Content for Each Section
        for (const outlineItem of sectionsOutline) {
            const sectionPrompt = `
            ${getProfileContext(profile)}
            ${customInstruction ? `--- TUTOR'S CUSTOM INSTRUCTION: "${customInstruction}" ---` : ''}
            
            RAW TEXT SEGMENT FOCUS: "${outlineItem.focus}" (Derived from the main text)
            SECTION TITLE: "${outlineItem.title}"

            --- ROLE: ELITE DUOLINGO-STYLE COURSE CREATOR ---
            **GOAL:** Create a "Discovery-Based", Communicative, Gamified English Lesson Section.
            **LEVEL:** Content must be accessible but challenge the learner to infer meaning (Discovery).
            **FORMAT:** Zero upfront lectures. Examples first -> Deduction -> Explanation.

            --- MANDATORY "A, B, C" STRUCTURE FOR THIS SECTION ---
            You MUST generate the following activities in this EXACT order.

            **FEEDBACK REQUIREMENT (CRITICAL):**
            For EVERY activity (especially Grammar, Vocab, Listening), populate the \`comprehensiveFeedback\` field.
            This field must be a **Detailed Pedagogical Breakdown** (HTML format).
            - **Tone:** Address the learner directly ("You").
            - **Content:**
              1. **Inductive Discovery:** "Did you notice how...?"
              2. **Color Coded Analysis:** Breakdown the grammar/vocab using <span style="color:..."> colors.
              3. **Real Life Situations:** "When to use this in [Learner's City/Job]..."
              4. **CCQs (Concept Checking Questions):** 3-4 questions with <details><summary>Show Answer</summary>...</details> accordions.
              5. **Short Dialogues:** Examples of the concept in action.
            - **Length:** Be voluminous. Help them understand EVERYTHING after they attempt the task.

            **A. WARM-UP & SOFT SKILLS (SEL)**
            1. **Warm-up Questions** (Type: "questions")
               - Content: 5 questions asking how the learner feels about this specific topic in their life.

            **B. DISCOVERY ACTIVITIES**
            
            2. **Vocabulary Discovery** (Type: "vocabulary_table")
               - Content JSON: List 10+ words/phrases from this section.
               - Format: \`[{"word": "...", "translation": "[L1]", "definition": "...", "example": "Personalized...", "ccq": "Concept check?"}]\`
               - *Note:* Include register (Formal/Informal).

            3. **Vocabulary Matching** (Type: "matching")
               - Content JSON: \`[{"left": "Word", "right": "Definition/Translation"}, ...]\` (6 pairs)

            4. **Grammar Discovery (Sentence Scramble)** (Type: "scramble")
               - Content JSON: \`[{"sentence": "chunk | based | sentence", "answer": "chunk based sentence", "hint": "Notice the word order"}, ...]\` (5-8 sentences).
               - *CRITICAL:* Strip all punctuation (no periods, question marks, commas, etc.) from BOTH the scrambled chunks in \`sentence\` and the full sentence in \`answer\`.
               - *Goal:* Help learner notice the grammar pattern of this section.

            5. **Grammar Box (Discovery-First)** (Type: "grammar_explanation")
               - Content JSON: \`{"explanation": "Do not give rules yet. Ask: 'Why did we use X here?'. Then explain Form/Meaning/Use simply.", "examples": ["...", "..."], "ccqs": [{"q":"...", "a":"..."}]}\`
               - *Requirement:* >500 words of "How/Where/When" analysis.

            6. **Listening (Monologue Podcast)** (Type: "listening_mc")
               - Content JSON: \`{"audioScript": "250-word engaging MONOLOGUE (one speaker only, do not use speaker labels like 'Host:'). The text should flow naturally like a story or a TED Talk.", "questions": [{"q": "...", "options": ["Option text 1", "Option text 2", "Option text 3", "Option text 4"], "a": "Option text 1", "feedback": "..."}]}\`
               - *CRITICAL:* Do NOT prefix options with letters (no "A.", "B."). The \`a\` (correct answer) field MUST be the EXACT full string matching one of the options identically, NEVER just "A" or "B".
            
            7. **Dictation (Real-time)** (Type: "dictation")
               - Content JSON: \`{"sentences": ["Sentence 1 from podcast", "Sentence 2 from podcast"]}\` (25 words total).

            8. **Reading (Genre Rewrite)** (Type: "contextual_mc")
               - Content JSON: \`{"context": "Rewrite the section text as a [Email/Article/Resume]. 750+ words.", "questions": [{"q": "Inference Q", "options": ["Option text 1", "Option text 2", "Option text 3", "Option text 4"], "a": "Option text 1", "feedback": "..."}] }\` (5 questions).
               - *CRITICAL:* Do NOT prefix options with letters (no "A.", "B."). The \`a\` (correct answer) field MUST be the EXACT full string matching one of the options identically, NEVER just "A" or "B".

            9. **Speaking: Just A Minute (JAM)** (Type: "speaking_jam")
               - Content JSON: \`{"topic": "Talk for 60 seconds about...", "bullets": ["Point 1", "Point 2"]}\`

            10. **Speaking Game (Truth/Dare/Never Have I Ever)** (Type: "speaking_game")
               - Content JSON: \`{"game": "Truth or Dare", "rounds": [{"text": "Truth: ...?", "type": "truth"}, {"text": "Dare: Act out...", "type": "dare"}]}\` (6 reps).

            11. **Sorting Activity (Categorization)** (Type: "sorting")
               - Content JSON: \`{"buckets": ["Formal", "Informal"], "items": [{"text": "Hello", "bucket": "Formal"}, {"text": "Hey", "bucket": "Informal"}]}\` (8-10 items).

            12. **Error Correction (Find the Mistake)** (Type: "error_correction")
               - Content JSON: \`{"sentence": "She don't like pizza.", "correctSentence": "She doesn't like pizza.", "explanation": "Third person singular requires 'doesn't'."}\` (3-5 examples).

            **C. INTEGRATED DRAMA & REVIEW**

            13. **Movie Scene (Karaoke Roleplay)** (Type: "movie_scene")
                - Content JSON: \`{"intro": "Scene: A dramatic moment...", "lines": [{"speaker": "A", "text": "...", "audio": "true"}, {"speaker": "B (You)", "text": "...", "audio": "false"}], "script": "Full script..."}\`
                - *Requirement:* 10 lines. Slang/Natural speech. Screenplay format.

            14. **Final Review & Discussion** (Type: "questions")
                - Content: Real-life transfer questions. "How will you use this tomorrow?"

            **CRITICAL:** Ensure all JSON strings for interactive activities are valid.
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
            lessonSummary: outlineResult.lessonSummary || "Summary not available."
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            lesson: { sections: [createErrorSection("English Lesson", errorMessage)] },
            lessonSummary: "No summary generated due to an error."
        };
    }
};
