




import { Type } from "@google/genai";
import { generateJsonContent } from './core';
import type { LearnerProfile } from '../../types';

const profileExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    cefrLevel: { type: Type.STRING, description: "Predict CEFR level (A1-C2) based on speech patterns. Default to 'B1' if unsure." },
    l1Language: { type: Type.STRING, description: "Identify primary language or nationality. Default to 'English' if unknown." },
    targetLanguage: { type: Type.STRING, default: "English" },
    personalInfo: {
      type: Type.OBJECT,
      properties: {
        occupation: { type: Type.STRING },
        country: { type: Type.STRING },
        gender: { type: Type.STRING },
      },
      required: ["occupation"]
    },
    interests: { type: Type.STRING, description: "Extract hobbies, passions, or topics mentioned." },
    facts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific facts about their life, family, or history." },
    needsAndExpectations: { type: Type.STRING, description: "What do they want to achieve? What are their pain points?" },
    learningChallenges: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Grammar or vocab mistakes identified in the transcript." }
  },
  required: ["name", "cefrLevel", "l1Language", "interests", "facts"]
};

export const generateProfileFromTranscript = async (transcript: string): Promise<Partial<LearnerProfile>> => {
  const prompt = `
    You are an expert linguistic profiler. I am providing you with a messy, spoken transcript from an English learner.
    
    TRANSCRIPT:
    """
    ${transcript}
    """
    
    Your task is to extract a structured learner profile.
    
    CRITICAL RULES:
    1. **Inference**: If specific details (like Country or Job) are not explicitly stated, try to infer them from context clues. If impossible, leave them generic (e.g., "Unknown").
    2. **Level Assessment**: Analyze the grammar, vocabulary range, and sentence structure in the transcript to estimate the CEFR Level (A1-C2).
    3. **Robustness**: Even if the transcript is short, extract as much as possible. 
    4. **Defaults**: 
       - If no name is found, use "Learner".
       - If no L1 is found, guess based on errors or default to "English".
    
    Return a structured JSON profile matching the schema.
  `;

  try {
    return await generateJsonContent(prompt, profileExtractionSchema, false, "You are a specialized profile extractor. Return only valid JSON.");
  } catch (error) {
    console.error("Profile extraction failed:", error);
    throw new Error("Could not process transcript into a profile.");
  }
};