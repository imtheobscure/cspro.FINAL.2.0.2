

import { GoogleGenAI } from "@google/genai";
import type { LearnerProfile, Section, PlatformProfile, StructuredOutput } from '../../types';

export const ai = {
    models: {
        generateContent: (params: any) => generateContentWithRetry(params)
    }
};

// Helper for exponential backoff
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type ApiProvider = 'google' | 'openrouter' | 'openai' | 'deepseek' | 'gapgpt' | 'custom';

export interface ApiSettings {
    provider: ApiProvider;
    apiKey: string;
    model: string;
    /** Base URL for OpenAI-compatible "custom" providers, e.g. https://openrouter.ai/api/v1 or https://my-provider.example/v1 */
    baseUrl?: string;
}

const DEFAULT_SETTINGS = (): ApiSettings => ({ provider: 'google', apiKey: '', model: 'gemini-2.0-flash' });

/** Reads + normalizes the saved Global API settings (legacy "other" provider → "custom"). */
export const getApiSettings = (): ApiSettings => {
    try {
        const saved = localStorage.getItem('tutor-crafter-api-settings');
        if (saved) {
            const raw = JSON.parse(saved);
            const provider = (raw.provider === 'other' ? 'custom' : raw.provider) as ApiProvider;
            let baseUrl = raw.baseUrl ? String(raw.baseUrl).trim() : '';
            // Legacy "other" configs had no Base URL and silently used OpenAI — keep that working.
            if (provider === 'custom' && !baseUrl) baseUrl = 'https://api.openai.com/v1/chat/completions';
            return {
                provider,
                apiKey: String(raw.apiKey || ''),
                model: String(raw.model || ''),
                baseUrl: provider === 'custom' ? baseUrl : undefined
            };
        }
    } catch (e) {
        console.error("Failed to load API settings", e);
    }
    return DEFAULT_SETTINGS();
};

const getSettings = (): ApiSettings => getApiSettings();

/** Resolves the OpenAI-compatible chat-completions URL for every non-Google provider. */
export const resolveChatEndpoint = (provider: ApiProvider, baseUrl?: string): string => {
    if (provider === 'openrouter') return 'https://openrouter.ai/api/v1/chat/completions';
    if (provider === 'openai') return 'https://api.openai.com/v1/chat/completions';
    if (provider === 'deepseek') return 'https://api.deepseek.com/chat/completions';
    if (provider === 'gapgpt') return 'https://api.gapgpt.ir/v1/chat/completions';
    if (provider === 'custom') {
        const url = String(baseUrl || '').trim().replace(/\/+$/, '');
        if (!url) throw new Error('Custom AI provider needs a Base URL (Settings → Global API Settings).');
        if (/\/chat\/completions$/.test(url)) return url;
        if (/\/v\d+$/.test(url)) return url + '/chat/completions';
        return url + '/v1/chat/completions';
    }
    return 'https://api.openai.com/v1/chat/completions';
};

export const generateContentWithRetry = async (params: any, retries = 3, delay = 2000, override?: Partial<ApiSettings>): Promise<any> => {
    const settings: ApiSettings = { ...getSettings(), ...(override || {}) };

    try {
        if (settings.provider === 'google') {
            const API_KEY = settings.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY || 'MISSING_API_KEY';
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            // Ensure model is set correctly for Google, prioritizing user settings
            const modelName = settings.model || params.model || 'gemini-2.0-flash';
            
            return await ai.models.generateContent({
                ...params,
                model: modelName
            });
        } else {
            // OpenRouter / OpenAI / Deepseek / GapGpt / Custom (any OpenAI-compatible endpoint)
            const baseUrl = resolveChatEndpoint(settings.provider as ApiProvider, settings.baseUrl);
            if (!settings.model) throw new Error('Model name is required (Settings → Global API Settings).');

            // Convert Gemini params to OpenAI format
            // params.contents is usually a string or array of parts
            let messages = [];
            let sysContent = params.config?.systemInstruction || '';
            if (params.config?.responseSchema) {
                sysContent += `\n\nYou MUST return a JSON object that strictly adheres to the following JSON schema:\n${JSON.stringify(params.config.responseSchema)}`;
            }
            if (sysContent) {
                messages.push({ role: 'system', content: sysContent });
            }

            let userContent = '';
            if (typeof params.contents === 'string') {
                userContent = params.contents;
            } else if (params.contents?.parts) {
                userContent = params.contents.parts.map((p: any) => p.text).join('\n');
            } else {
                userContent = JSON.stringify(params.contents);
            }
            messages.push({ role: 'user', content: userContent });

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...(settings.provider === 'openrouter' ? {
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Tutor Crafter'
                } : {})
            };
            // Local OpenAI-compatible servers (Ollama, LM Studio…) accept any or no key; skip when empty.
            if (settings.apiKey) headers['Authorization'] = `Bearer ${settings.apiKey}`;

            const response = await fetch(baseUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: settings.model,
                    messages: messages,
                    temperature: params.config?.temperature || 0.7,
                    response_format: params.config?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || '';
            
            // Mock Gemini response structure
            return {
                text: text,
                candidates: [{ content: { parts: [{ text: text }] } }]
            };
        }
    } catch (error: any) {
        // Check for specific network or server errors that are retryable
        const isRetryable = 
            error.status === 500 || 
            error.status === 503 || 
            error.message?.includes('xhr error') || 
            error.message?.includes('fetch failed') ||
            error.message?.includes('Rpc failed') ||
            error.message?.includes('NetworkError') ||
            error.message?.includes('timeout');

        if (retries > 0 && isRetryable) {
            console.warn(`API call failed, retrying... (${retries} attempts left). Error: ${error.message}`);
            await wait(delay);
            // Exponential backoff
            return generateContentWithRetry(params, retries - 1, delay * 2);
        }
        throw error;
    }
};

export const getPlatformContext = (platform: PlatformProfile): string => {
  return `
--- PLATFORM SPECIFICATIONS (ABSOLUTE & NON-NEGOTIABLE) ---
You MUST generate the content to strictly adhere to the following platform-specific rules. These rules override any other conflicting instructions regarding format and style.
- Platform Name: ${platform.name}
- Target Word Count: ${platform.specifications.wordCount || 'Not specified. Be generous.'}
- Required Register: ${platform.specifications.register || 'Neutral'}
- Output Format: You are generating JSON. The final output for the user will be ${platform.specifications.outputFormat}. Ensure the content is structured logically to be converted to this format.
- Custom Instructions: ${platform.specifications.customInstructions || 'None'}
---
  `;
};

export const generateJsonContent = async (prompt: string, schema: any, useThinkingMode: boolean = false, systemInstruction?: string): Promise<any> => {
  try {
    
    // We default to gemini-2.0-flash for speed unless thinking is requested, but generateContentWithRetry will override if settings exist
    const model = useThinkingMode ? 'gemini-3-pro-preview' : 'gemini-2.0-flash'; 
    
    const config: any = {
        systemInstruction: systemInstruction || "You are an expert content creator for language tutors. You create structured, pedagogically sound content in JSON format.",
        responseMimeType: "application/json",
        responseSchema: schema,
    };

    if (useThinkingMode) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const result = await generateContentWithRetry({
        model,
        contents: prompt,
        config,
    });
    
    let responseText = result.text.trim();
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
        responseText = jsonMatch[1];
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse JSON response:", responseText);
        throw new Error("Valid JSON object not found in the model's response.");
    }

  } catch (error) {
    console.error("Error generating or parsing JSON content:", error);
    if (error instanceof Error) {
        throw new Error(`${error.message}`);
    }
    throw new Error("An unknown error occurred during content generation.");
  }
};

export const getProfileContext = (profile: LearnerProfile): string => {
  const lastSession = profile.sessionHistory && profile.sessionHistory.length > 0
    ? profile.sessionHistory[0]
    : null;

  const country = profile.personalInfo?.country || 'their country';
  const address = profile.personalInfo?.address || 'their city';
  const targetLang = profile.targetLanguage || 'English';
  const l1Lang = profile.l1Language || 'English';

  const minimalProfile = {
    name: profile.name,
    cefrLevel: profile.cefrLevel,
    l1Language: profile.l1Language,
    targetLanguage: profile.targetLanguage,
    personalInfo: profile.personalInfo,
    interests: profile.interests,
    facts: profile.facts,
    learningChallenges: profile.learningChallenges,
    needsAndExpectations: profile.needsAndExpectations,
    coursePlan: profile.coursePlan,
    languageFocus: profile.languageFocus,
    commonMistakes: profile.commonMistakes,
    examPrepDetails: profile.examPrepDetails,
  };

  return `
    --- LANGUAGE SIMPLIFICATION (CRITICAL & NON-NEGOTIABLE) ---
    You MUST use extremely simple **${targetLang}**, suitable for a learner one level BELOW their stated CEFR level of ${profile.cefrLevel}. For A1/A2 learners, this means using only the most basic vocabulary and sentence structures for all different types (Lesson, homework, Quiz, Lesson plan, Simulations, Weekly Challenges, Study Guide, etc). Your primary goal is clarity and accessibility.
    Example of what NOT to do: For an A1 learner, do NOT use complex academic words.
    Example of what TO do: For an A1 learner, explain everything as if you were talking to a complete beginner.

    --- TARGET LANGUAGE SETTING ---
    The learner is learning: **${targetLang}** (L2) and their native/speaking language is **${l1Lang}** (L1).
    All primary content (lessons, quizzes, homework, explanations) MUST be generated in the target language **${targetLang}**. Whenever you provide translations, definitions, or bilingual support for words/sentences, you MUST translate them into the learner's native language, **${l1Lang}**. 
    DO NOT GENERATE CONTENT IN ANY OTHER LANGUAGE. The lesson is strictly teaching ${targetLang} and using ${l1Lang} to support them when translations are needed.

    --- HYPER-PERSONALIZATION (CRITICAL & NON-NEGOTIABLE) ---
    You MUST use the learner's personal details (name, interests, job, facts) throughout all generated content. CRITICALLY, you MUST also incorporate specific local information related to their country (${country}) and city/address (${address}) to make the content feel deeply contextualized and relevant. For example, you can mention local landmarks, famous people from their country, popular local dishes, or companies in their city. This is not optional.
    This material is for a specific learner. Here is their summarized profile:
    ${JSON.stringify(minimalProfile, null, 2)}
    
    ${lastSession ? `**IMPORTANT: Base the content PRIMARILY on the learner's most RECENT session report:**\n${JSON.stringify(lastSession, null, 2)}` : ''}
  `;
};

export const extractSettingsFromOutput = (output: StructuredOutput): { settings: any, cleanedOutput: StructuredOutput } => {
    const settingsSectionIndex = output.sections.findIndex(s => s.title === "Hidden Settings");
    if (settingsSectionIndex === -1) return { settings: {}, cleanedOutput: output };

    const settingsSection = output.sections[settingsSectionIndex];
    const settings: any = {};

    settingsSection.activities.forEach(a => {
        if (a.title === "Teacher Notes") settings.teacherNotes = a.content;
        if (a.title === "Homework Checklist") settings.homeworkChecklist = a.content;
        if (a.title === "Material Links") settings.materialLinks = a.content;
    });

    const cleanedOutput = {
        ...output,
        sections: output.sections.filter((_, i) => i !== settingsSectionIndex)
    };

    return { settings, cleanedOutput };
};

export const createErrorSection = (title: string, errorMessage: string): Section => ({
    title: "Generation Error",
    color: "#ef4444",
    activities: [{ type: "paragraph" as const, title: `${title} Failed`, content: `An error occurred: ${errorMessage}` }],
    studyTime: "N/A"
});

export const getFeaturesPrompt = (features: string[]): string => {
    if (features.length === 0) return '';
    return `
--- MANDATORY FEATURES CHECKLIST ---
You MUST forcefully include every single one of the following high-quality features in your response. This is a critical, non-negotiable instruction. Failure to include any of these will result in an unacceptable output.
${features.map(f => `- ${f}`).join('\n')}
---
`;
};