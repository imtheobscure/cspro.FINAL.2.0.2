/**
 * LESSON INSIGHT — learner-facts handoff
 *
 * The "Lesson Insight" tabs on the adult and kids learner profiles do the same
 * three things, so the logic lives here once instead of twice:
 *
 *   1. collect the learner's profile facts from whichever shape that profile
 *      uses (adult `Learner` vs kids `KidLearner` — they are different types),
 *   2. write them to the key Lesson Insight reads on boot, and
 *   3. open the widget in a new tab.
 *
 * The channel is `localStorage` rather than a query string or `postMessage`:
 * a new tab cannot receive a message sent before it exists, and a full profile
 * does not belong in a URL. Both pages are served from the same origin, so
 * `localStorage` is shared.
 *
 * The key and the payload shape MUST stay in step with
 * `tutorly-widgets/tutorly-lesson-insight/services/lessonInsightPipeline.ts`
 * (`HANDOFF_KEY` / `LessonInsightHandoff`). They are duplicated rather than
 * imported because the widget is a separate build with its own root.
 */

/** Must match `HANDOFF_KEY` in the widget's lessonInsightPipeline.ts. */
export const LESSON_INSIGHT_HANDOFF_KEY = 'tutorly_lesson_insight_handoff';

/** Where the widget is served from. */
export const LESSON_INSIGHT_URL = '/tutorly-widgets/tutorly-lesson-insight/index.html';

export interface LessonInsightHandoffPayload {
  name: string;
  tutorName?: string;
  nationality?: string;
  l1?: string;
  l2?: string;
  focusedLanguage?: string;
  facts: string;
  source?: string;
}

/**
 * Write the handoff and open Lesson Insight in a new tab.
 *
 * Returns false (and opens nothing) when there is no learner name, because a
 * nameless handoff would pre-fill the widget with an empty profile — worse than
 * opening it blank.
 */
export const openLessonInsight = (payload: LessonInsightHandoffPayload): boolean => {
  if (!payload?.name?.trim()) return false;
  try {
    localStorage.setItem(
      LESSON_INSIGHT_HANDOFF_KEY,
      JSON.stringify({ ...payload, ts: Date.now() }),
    );
  } catch (e) {
    // A quota or private-mode failure must not stop the tab from opening: the
    // tutor can still fill the profile in by hand.
    console.error('Could not save the Lesson Insight handoff:', e);
  }
  window.open(LESSON_INSIGHT_URL, '_blank');
  return true;
};

/**
 * Best-effort "facts" text for a learner whose profile has no explicit facts
 * field.
 *
 * A report built with no context is markedly worse than one built with the
 * obvious basics, and most of these fields already exist on every profile — so
 * rather than sending nothing, assemble what we have into the free-text block
 * the prompt expects.
 */
export const buildFactsFallback = (parts: {
  level?: string;
  goals?: string;
  notes?: string;
  interests?: string;
  weakAreas?: string;
  l1?: string;
  l2?: string;
  nationality?: string;
  age?: string | number;
  extra?: (string | undefined | null)[];
}): string => {
  const lines: string[] = [];
  const push = (label: string, value?: string | number | null) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    lines.push(`- ${label}: ${text}`);
  };

  push('Level', parts.level);
  push('Nationality', parts.nationality);
  push('L1 (native language)', parts.l1);
  push('L2 (target language)', parts.l2);
  push('Age', parts.age);
  push('Goals', parts.goals);
  push('Weak areas', parts.weakAreas);
  push('Interests', parts.interests);
  push('Notes', parts.notes);

  (parts.extra || []).forEach((e) => {
    const text = (e || '').trim();
    if (text) lines.push(`- ${text}`);
  });

  return lines.join('\n');
};
