import type { LearnerProfile } from '../../types';

/**
 * Live Lesson (H5P) Copy AI Prompt.
 *
 * The Lesson Creator stores its Live Lesson settings in its own shape — `activities` is a list of
 * activity NAMES the tutor ticked, `duration` is a free-text string ('30 minutes') and the topic
 * arrives as `topic`, while `focus` is usually absent. The old builder assumed a different shape
 * and printed the shape's gaps straight into the prompt: an empty ACTIVITIES list, `Focus:
 * undefined` and `Duration: 30 minutes minutes`. Anything the tutor copies must read like a
 * brief an AI can act on, so every field is normalised here — with a sane default — before it is
 * interpolated.
 */
export const getLiveLessonPrompt = (learner: LearnerProfile, settings: any = {}) => {
    const rawActivities = Array.isArray(settings?.activities) ? settings.activities : [];

    /** 'Warm-up' or { type, duration, description } → one readable brief line each. */
    const activityList = rawActivities.length
        ? rawActivities
            .map((a: any) => {
                if (typeof a === 'string') return `- ${a}: plan this activity for the learner's level, with the exact task, timing and success criteria.`;
                const name = a?.type || a?.name || a?.title || 'Activity';
                const mins = a?.duration ? ` (${a.duration} mins)` : '';
                return `- ${name}${mins}: ${a?.description || "plan it for the learner's level with the exact task and success criteria."}`;
            })
            .join('\n')
        : [
            '- Warm-up & small talk (5 mins): personal questions tied to the learner\'s interests.',
            '- Target language presentation (10 mins): the day\'s vocabulary and grammar in context.',
            '- Guided practice (10 mins): the interactive H5P tasks, with answer checking.',
            '- Free production (10 mins): a roleplay that forces the target language.',
            '- Wrap-up & feedback (5 mins): exit questions, corrections and homework.',
        ].join('\n');

    const focus = settings?.focus || settings?.topic || settings?.lessonFocus || 'General English, tailored to this learner';
    // '30 minutes' must not become '30 minutes minutes'.
    const durationRaw = settings?.duration == null || settings?.duration === '' ? '45 minutes' : String(settings.duration);
    const duration = /min|hour|hr/i.test(durationRaw) ? durationRaw : `${durationRaw} minutes`;
    const minutesOnly = parseInt(String(durationRaw).replace(/[^0-9]/g, ''), 10) || 45;
    const feedbackStyle = settings?.feedbackStyle || 'encouraging';
    const needs = (learner as any)?.needsAndExpectations || (learner as any)?.goals || 'General fluency and confidence';

    return `
    Create a detailed Live Lesson Plan for an English learner that a tutor can teach live from a shared screen.

    LEARNER PROFILE:
    - Name: ${learner.name}
    - Level: ${learner.cefrLevel}
    - Interests: ${learner.interests}
    - Needs: ${needs}
    - Feedback style to use: ${feedbackStyle}

    LESSON SETTINGS:
    - Total duration: ${duration}
    - Focus / topic: ${focus}

    ACTIVITIES TO INCLUDE (cover every one, in this order):
    ${activityList}

    OUTPUT FORMAT:
    Return a JSON object with the following structure:
    {
        "title": "Lesson Title",
        "duration": ${minutesOnly},
        "objectives": ["obj1", "obj2"],
        "warmup": { "title": "Warmup", "content": "..." },
        "activities": [
            {
                "type": "quiz",
                "title": "Activity Title",
                "duration": 10,
                "content": { "questions": [] }
            }
        ],
        "coolDown": { "title": "Wrap up", "content": "..." }
    }

    Ensure all content is pedagogically sound, strictly within the learner's CEFR level, and tailored to the learner's real profile.
    `;
};
