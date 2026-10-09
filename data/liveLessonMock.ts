import type { LiveLessonManual, ProcedureStep } from '../pages/live/liveTypes';

/**
 * Live Lesson mock data — the same sample lesson the Live-Lessons sub-app ships with
 * ("Present Perfect Tense in Action"). Re-exported as a typed builder + raw object so
 * the Manual JSON Creator's "Load Mock Data" and the gallery's "Preview & Test (Mock Data)"
 * both render the exact same rich, 12-step interactive lesson.
 */

import rawLesson from './liveLessonRaw';

export const liveLessonMock = rawLesson as unknown as LiveLessonManual;

/** Raw JSON string form (for the Manual Creator's JSON editor). */
export const liveLessonMockJson = JSON.stringify(liveLessonMock, null, 2);

export interface LiveLessonBuilderOptions {
  learnerName?: string;
  level?: string;
  topic?: string;
}

export function buildLiveLessonMockJson(learner?: { name?: string; cefrLevel?: string }): string {
  const opts: LiveLessonBuilderOptions = {
    learnerName: learner?.name || 'Alex',
    level: learner?.cefrLevel || 'B1',
  };
  const data = normalizeLiveLesson(liveLessonMock, opts);
  return JSON.stringify(data, null, 2);
}

export function buildLiveLessonMockLesson(learner?: { name?: string; cefrLevel?: string }): LiveLessonManual {
  return normalizeLiveLesson(liveLessonMock, {
    learnerName: learner?.name || 'Alex',
    level: learner?.cefrLevel || 'B1',
  });
}

/**
 * Normalize a (possibly sparse / AI-pasted) LiveLessonManual so every step renders richly.
 * Fills the learner profile, phase, durations, and per-step language/feedback scaffolding
 * without mutating the input.
 */
export function normalizeLiveLesson(
  input: Partial<LiveLessonManual> | LiveLessonManual,
  opts?: LiveLessonBuilderOptions,
): LiveLessonManual {
  const raw = (((input as any)?.lesson ?? input) as Partial<LiveLessonManual>);
  const learnerName = opts?.learnerName || raw.learnerProfile?.name || 'Alex';
  const level = opts?.level || raw.metadata?.level || 'B1';

  const steps = Array.isArray(raw.procedureBlocks) ? raw.procedureBlocks : [];

  const normalizedSteps: ProcedureStep[] = steps.map((step, i) => {
    const act: any = step.h5pActivity || { type: step.type || 'accordion' };
    const type = act.type || step.type || 'accordion';
    return {
      ...step,
      id: step.id || `step-${String(i + 1).padStart(3, '0')}`,
      title: step.title || `Step ${i + 1}`,
      type: type as ProcedureStep['type'],
      phase: step.phase || (i < 2 ? 'speak' : i < 6 ? 'study' : 'review'),
      durationSeconds: step.durationSeconds || 300,
      studentInstructions:
        step.studentInstructions || `Let's practise ${type.replace(/-/g, ' ')}, ${learnerName}! Follow the prompts and speak in full sentences.`,
      h5pActivity: act,
      languageReference: step.languageReference || undefined,
      ccqQuestions: step.ccqQuestions || [],
      speakingQuestions: step.speakingQuestions || [],
      gamification: step.gamification || { points: 10, retryAllowed: true, maxRetries: 2 },
    };
  });

  const fallbackSteps: ProcedureStep[] = [];
  if (normalizedSteps.length === 0) {
    fallbackSteps.push({
      id: 'step-001',
      title: 'Warm-Up: Would You Rather?',
      type: 'would-you-rather',
      phase: 'speak',
      durationSeconds: 300,
      studentInstructions: `Welcome, ${learnerName}! Pick the option you prefer and explain why in a full sentence.`,
      h5pActivity: {
        type: 'would-you-rather',
        optionA: { id: 'a', text: 'Option A', emoji: '🤔' },
        optionB: { id: 'b', text: 'Option B', emoji: '🤔' },
        rounds: [
          { id: 'r1', question: 'Which sounds more fun?', optionA: { id: 'a', text: 'Travel somewhere new', emoji: '🌍' }, optionB: { id: 'b', text: 'Learn a new skill', emoji: '💡' }, feedback: { correctFeedback: 'Great choice! Tell me more.', incorrectFeedback: 'Pick whichever you prefer!' } },
          { id: 'r2', question: 'Your perfect weekend?', optionA: { id: 'a', text: 'Outdoor adventure', emoji: '🏔️' }, optionB: { id: 'b', text: 'Relaxing at home', emoji: '🏠' }, feedback: { correctFeedback: 'Nice! Why?', incorrectFeedback: 'Both are great!' } },
        ],
      },
      gamification: { points: 15, retryAllowed: false, maxRetries: 0 },
    });
    fallbackSteps.push({
      id: 'step-002',
      title: 'Mini Lesson: Key Grammar',
      type: 'accordion',
      phase: 'study',
      durationSeconds: 420,
      studentInstructions: `Explore each section to understand the target language, ${learnerName}.`,
      h5pActivity: {
        type: 'accordion',
        expandMultiple: true,
        panels: [
          { id: 'p1', title: '📖 Form', content: 'The structure of the target language with clear examples.' },
          { id: 'p2', title: '📝 Meaning', content: 'What this language is used for and when to use it.' },
          { id: 'p3', title: '💡 Common Errors', content: 'Watch out for these common mistakes.' },
        ],
      },
      gamification: { points: 15, retryAllowed: false, maxRetries: 0 },
    });
    fallbackSteps.push({
      id: 'step-003',
      title: 'Check: True or False',
      type: 'true-false',
      phase: 'study',
      durationSeconds: 180,
      studentInstructions: 'Read the statement carefully and decide if it is true or false.',
      h5pActivity: { type: 'true-false', statement: 'Sample statement about today\'s topic.', correct: true, feedback: { correctFeedback: 'Correct!', incorrectFeedback: 'Not quite — review the mini lesson.' } },
      gamification: { points: 10, retryAllowed: true, maxRetries: 2 },
    });
  }

  const allSteps = normalizedSteps.length > 0 ? normalizedSteps : fallbackSteps;

  return {
    metadata: {
      lessonId: raw.metadata?.lessonId || `lesson-${Date.now()}`,
      title: raw.metadata?.title || 'Live Interactive Lesson',
      description: raw.metadata?.description || 'A gamified, live interactive English lesson.',
      durationMinutes: raw.metadata?.durationMinutes || 60,
      learningObjectives: raw.metadata?.learningObjectives || [
        'Use the target language in context',
        'Practise speaking with confidence',
        'Review and reinforce key vocabulary and grammar',
      ],
      targetLanguage: raw.metadata?.targetLanguage || 'en-US',
      defaultLocale: raw.metadata?.defaultLocale || 'en',
      phase: raw.metadata?.phase || 'speak',
      level: raw.metadata?.level || level,
      topic: raw.metadata?.topic || 'General English',
      tags: raw.metadata?.tags || ['interactive', 'live'],
    },
    learnerProfile: {
      name: learnerName,
      age: raw.learnerProfile?.age,
      level: raw.learnerProfile?.level || level,
      interests: raw.learnerProfile?.interests || ['travel', 'music', 'technology'],
      avatarTier: raw.learnerProfile?.avatarTier || 'rare',
      pastScores: raw.learnerProfile?.pastScores || [85, 90, 78],
    },
    globalSettings: {
      timerBehaviour: raw.globalSettings?.timerBehaviour || 'pause_allowed',
      gamification: {
        points: raw.globalSettings?.gamification?.points ?? 100,
        retryAllowed: raw.globalSettings?.gamification?.retryAllowed ?? true,
        maxRetries: raw.globalSettings?.gamification?.maxRetries ?? 3,
        badgeConditions: raw.globalSettings?.gamification?.badgeConditions || [
          { id: 'perfect', label: 'Perfect Score', icon: '⭐', condition: 'perfect_score' },
          { id: 'streak', label: 'On Fire', icon: '🔥', condition: 'streak', threshold: 3 },
        ],
      },
      confettiOnCorrect: raw.globalSettings?.confettiOnCorrect ?? true,
    },
    procedureBlocks: allSteps,
  };
}