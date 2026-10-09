// Mock + normalizer for the 🎬 Video Lesson manual content type.
// The mock sample is the Big Buck Bunny lesson that ships with the Video Lesson app.

import { DEMO_LESSON } from '../pages/video_app/demoLesson';
import type { Lesson, Activity } from '../pages/video_app/types';

export interface VideoLessonPayload {
  learnerName?: string;
  lesson: Lesson;
}

/** Lightweight normalizer so AI/pasted JSON tolerates small schema drift. */
export function normalizeVideoLesson(raw: any, extra?: { learnerName?: string }): Lesson {
  const lesson: Lesson = raw?.lesson && Array.isArray(raw.lesson?.segments) ? raw.lesson : raw;
  const segments = Array.isArray(lesson?.segments) ? lesson.segments : [];
  const normalizedSegments = segments
    .filter((s: any) => s && typeof s === 'object')
    .map((seg: any, si: number) => {
      const acts = Array.isArray(seg.activities) ? seg.activities : [];
      return {
        id: seg.id || `seg-${si + 1}`,
        title: seg.title || `Segment ${si + 1}`,
        startTime: typeof seg.startTime === 'number' ? seg.startTime : 0,
        endTime: typeof seg.endTime === 'number' ? seg.endTime : (typeof seg.startTime === 'number' ? seg.startTime + 60 : 60),
        activities: acts
          .filter((a: any) => a && typeof a === 'object')
          .map((a: any, ai: number) => {
            const act: Activity = {
              id: a.id || `${seg.id || 'seg'}-${si + 1}-act-${ai + 1}`,
              type: a.type || 'discussion',
              timestamp: typeof a.timestamp === 'number' ? a.timestamp : (typeof seg.startTime === 'number' ? seg.startTime + ai * 15 : ai * 15),
              title: a.title || String(a.type || 'Activity'),
              emoji: a.emoji || '🎯',
              color: a.color || 'gold',
              points: typeof a.points === 'number' ? a.points : 10,
              requiredForNext: !!a.requiredForNext,
              difficulty: a.difficulty || 'medium',
              correctFeedback: a.correctFeedback || 'Great job!',
              incorrectFeedback: a.incorrectFeedback || 'Not quite — review and try again!',
              content: {
                ...(a.content || {}),
                cards: a.content?.cards || a.cards || undefined,
                options: a.content?.options || a.options || undefined,
                sentence: a.content?.sentence || a.sentence || undefined,
                blanks: a.content?.blanks || a.blanks || undefined,
                pairs: a.content?.pairs || a.pairs || undefined,
                answer: a.content?.answer ?? a.answer ?? undefined,
                question: a.content?.question || a.question || undefined,
                expectedSentence: a.content?.expectedSentence || a.expectedSentence || undefined,
                discussionPrompt: a.content?.discussionPrompt || a.discussionPrompt || undefined,
                reflectionPrompt: a.content?.reflectionPrompt || a.reflectionPrompt || undefined,
                videoPausePrompt: a.content?.videoPausePrompt || a.videoPausePrompt || undefined,
              },
            };
            return act;
          }),
      };
    });

  const result: Lesson = {
    metadata: {
      title: lesson?.metadata?.title || 'Video Lesson',
      targetLanguage: lesson?.metadata?.targetLanguage || 'English',
      cefrLevel: lesson?.metadata?.cefrLevel || 'B1',
      estimatedDurationSeconds: typeof lesson?.metadata?.estimatedDurationSeconds === 'number'
        ? lesson.metadata.estimatedDurationSeconds
        : normalizedSegments.reduce((a, s) => a + (s.endTime - s.startTime), 0),
      videoUrl: lesson?.metadata?.videoUrl,
      thumbnailUrl: lesson?.metadata?.thumbnailUrl,
      learnerL1: lesson?.metadata?.learnerL1,
    },
    segments: normalizedSegments,
    globalSettings: {
      pointsToLevelUp: lesson?.globalSettings?.pointsToLevelUp ?? 500,
      enableStreak: lesson?.globalSettings?.enableStreak ?? true,
      suspenseSounds: lesson?.globalSettings?.suspenseSounds ?? true,
    },
    badges: Array.isArray(lesson?.badges) ? lesson.badges : [],
    learnerProfile: {
      name: extra?.learnerName || lesson?.learnerProfile?.name || 'Learner',
      level: lesson?.learnerProfile?.level || lesson?.metadata?.cefrLevel || 'B1',
      nativeLanguage: lesson?.learnerProfile?.nativeLanguage || 'English',
      goals: lesson?.learnerProfile?.goals || '',
      interests: lesson?.learnerProfile?.interests || '',
      facts: lesson?.learnerProfile?.facts || '',
    },
  };
  if (lesson?.metadata?.videoUrl) result.metadata.videoUrl = lesson.metadata.videoUrl;
  return result;
}

/** Deep-clone the demo lesson so every gallery / mock open starts fresh. */
export function buildVideoLessonMock(learner?: { name?: string; cefrLevel?: string }): Lesson {
  const lesson = JSON.parse(JSON.stringify(DEMO_LESSON)) as Lesson;
  const base = (JSON.parse(JSON.stringify(DEMO_LESSON.learnerProfile)) || {
    name: 'Learner',
    level: 'B1',
    nativeLanguage: 'English',
    goals: '',
    interests: '',
    facts: '',
  }) as Lesson['learnerProfile'];
  lesson.learnerProfile = { ...base, name: learner?.name || base?.name || 'Learner' };
  return lesson;
}

export function buildVideoLessonMockJson(learner?: { name?: string; cefrLevel?: string }): string {
  return JSON.stringify(
    {
      learnerName: learner?.name || 'Demo Learner',
      lesson: buildVideoLessonMock(learner),
    },
    null,
    2
  );
}
