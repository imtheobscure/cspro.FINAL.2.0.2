

import { GoogleGenAI } from "@google/genai";
import type { LearnerProfile } from '../../types';

const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || 'MISSING_API_KEY';
const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Generates contextual feedback for a learner's text input.
 * @param text The learner's text.
 * @param learner The learner's profile.
 * @param lessonContext The raw text of the current lesson for context.
 * @returns A string containing formatted feedback.
 */
export const getFeedbackForText = async (
    text: string,
    learner: LearnerProfile,
    lessonContext: string
): Promise<string> => {
    const prompt = `
        You are an expert, friendly, and encouraging ESL tutor providing feedback in a chat widget.
        
        CONTEXT:
        - Student Name: ${learner.name}
        - CEFR Level: ${learner.cefrLevel}
        - Their interests: ${learner.interests}
        - The current lesson is about: ${lessonContext.substring(0, 500)}... 

        The student has said or typed the following:
        ---
        "${text}"
        ---

        Your task is to provide CONCISE and HELPFUL feedback. Follow these steps:
        1.  **Acknowledge and Praise**: Start with a positive, encouraging comment.
        2.  **Analyze and Correct**:
            *   Identify any grammatical errors. Provide the correction and a VERY simple explanation suitable for a ${learner.cefrLevel} learner.
            *   Analyze vocabulary choice. Suggest more natural alternatives if needed. If they used vocabulary from the lesson, praise them for it.
        3.  **Provide a "Better Version"**: Rewrite their original text into a more natural, fluent version that a native speaker might say.
        4.  **Ask a Follow-up Question**: End with an open-ended question to keep the conversation going.

        **CRITICAL**: Keep your response short and conversational, like a chat message. Use emojis and simple formatting (like bullet points using asterisks) to make it easy to read.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting feedback:", error);
        return "I'm sorry, I couldn't process that feedback request right now.";
    }
};


/**
 * Generates a response to a general-purpose prompt.
 * @param prompt The user's prompt.
 * @returns A string with the generated response.
 */
export const getGenerativeResponse = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting generative response:", error);
        return "I'm sorry, I couldn't process that request right now.";
    }
};