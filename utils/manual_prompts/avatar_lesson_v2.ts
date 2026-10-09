import type { LearnerProfile } from '../../types';
import { buildCopyPromptV2 } from '../../tutorly-lessons/Avatar_Lesson_V2/copy-ai-prompt';

export const getAvatarLessonV2Prompt = (learner: LearnerProfile, config?: any): string => {
    const {
        tone,
        cefrLevel,
        targetAudience,
        details,
        lessonCountHint,
        minInitialChoices,
        minTotalBranches,
        minEndings,
        preferredRegions,
        preferredVoices,
        domainConstraints
    } = config || {};

    const lAny = learner as any;

    const options = {
        audience: targetAudience || `${lAny.ageGroup || 'Adult'} learner - ${lAny.occupation || 'Professional'}`,
        difficulty: cefrLevel || learner.cefrLevel || 'Intermediate',
        tone: tone || 'playful',
        preferredRegions: preferredRegions || [],
        preferredVoices: preferredVoices || [],
        lessonCountHint: lessonCountHint ? Number(lessonCountHint) : undefined,
        minInitialChoices: minInitialChoices ? Number(minInitialChoices) : undefined,
        minTotalBranches: minTotalBranches ? Number(minTotalBranches) : undefined,
        minEndings: minEndings ? Number(minEndings) : undefined,
        domainConstraints: domainConstraints || undefined
    };

    let prompt = buildCopyPromptV2(options);

    // Append learner personalization context
    prompt += `\n\nLEARNER PROFILE & PERSONALIZATION CONTEXT:\n`;
    prompt += `- Learner Name: ${learner.name}\n`;
    prompt += `- Native Language (L1): ${lAny.nativeLanguage || 'Unknown'}\n`;
    if (learner.interests) prompt += `- Interests & Passions: ${learner.interests}\n`;
    if (learner.needsAndExpectations) prompt += `- Specific Needs/Expectations: ${learner.needsAndExpectations}\n`;
    if (lAny.personalSyllabusGoal) prompt += `- Learning Goal: ${lAny.personalSyllabusGoal}\n`;
    if (details) prompt += `- Custom Topic / Theme / Scenario Details: ${details}\n`;

    return prompt;
};
