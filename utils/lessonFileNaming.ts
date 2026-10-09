/**
 * Standard file name for lessons saved from the Lesson Creator / Saved
 * Lessons "Save as Learner HTML" flow:
 *
 *     {learnerName}_{book}_{unit}_{lessonType}_{Learner|Presenter}_{date}.html
 *
 * Empty optional segments (book / unit / audience) are omitted. Every segment is
 * sanitized the same way the rest of the app does (spaces → underscores, strip
 * characters that are unsafe in file names).
 */

export type LessonAudience = 'Learner' | 'Presenter';

export interface LessonFileMeta {
    book?: string;
    unit?: string;
    audience?: LessonAudience;
}

export interface BuildLessonFileNameArgs extends LessonFileMeta {
    learnerName: string;
    lessonLabel: string; // human lesson type label, e.g. 'Learning App V2' or 'Micro Lesson V2'
    date?: Date;
}

/** Sanitize a single file-name segment: spaces → _, drop unsafe characters. */
export const sanitizeFileNamePart = (part?: string | number): string =>
    String(part ?? '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\-.]/g, '');

const toDateStamp = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Canonical file-name slug for every lesson type, keyed by the human label the
 * Lesson Creator shows (lower-cased). The saved file must say WHAT the lesson is:
 * an exam-prep lesson is `…_Exam-Prep_Presenter_…`, never a generic `Micro_Lesson`.
 *
 * Labels not listed fall back to a generic slug (leading emoji stripped, whole
 * words joined with a hyphen), so a new lesson type still gets a readable name.
 */
const LESSON_TYPE_SLUGS: Record<string, string> = {
    'micro lesson': 'Micro-Lesson',
    'english lesson': 'Micro-Lesson',
    'micro lesson v2': 'Micro-Lesson-V2',
    'english lesson v2': 'Micro-Lesson-V2',
    'explainer lesson': 'Explainer',
    'explainer': 'Explainer',
    'exam prep lesson': 'Exam-Prep',
    'exam prep': 'Exam-Prep',
    'conversational lesson': 'Conversational',
    'conversational english lesson': 'Conversational',
    'bilingual study lesson': 'Bilingual',
    'bilingual lesson': 'Bilingual',
    'interactive lesson': 'Interactive-Lesson',
    'homework': 'Homework',
    'quiz': 'Quiz',
    'assessment': 'Assessment',
    'study guide': 'Study-Guide',
    'supplementary study guide': 'Study-Guide',
    'official worksheet': 'Worksheet',
    'worksheet': 'Worksheet',
    'mock test': 'Mock-Test',
    'mock test v2': 'Mock-Test-V2',
    'review app': 'Review-App',
    'learning app (gamified)': 'Learning-App',
    'learning app v2': 'Learning-App-V2',
    'flipbook homework': 'Flipbook-Homework',
    'gamified challenge': 'Gamified-Challenge',
    'music lesson': 'Music-Lesson',
    'daily lesson': 'Daily-Lesson',
    'daily english lesson': 'Daily-Lesson',
    'live lesson': 'Live-Lesson',
    'video lesson': 'Video-Lesson',
    'party mode': 'Party-Mode',
    'party mode arena': 'Party-Mode',
    'avatar lesson': 'Avatar-Lesson',
    'avatar lesson v2': 'Avatar-Lesson-V2',
    'conversation game': 'Conversation-Game',
    'conversation maker': 'Conversation-Maker',
    'guess the place': 'Guess-The-Place',
    'guess the place game': 'Guess-The-Place',
    'weekly challenge': 'Weekly-Challenge',
    'weekly challenge (gamified)': 'Weekly-Challenge',
    'audio lab': 'Audio-Lab',
    'audio lesson': 'Audio-Lesson',
    'test lab': 'Test-Lab',
    'test lab activity': 'Test-Lab',
    'slides': 'Slides',
    'slide presentation': 'Slides',
    'lesson plan': 'Lesson-Plan',
    'teacher guide': 'Teacher-Guide',
    'lesson guide': 'Lesson-Guide',
    'h5p': 'H5P',
};

/** Turn any lesson label/id into a stable, readable file-name slug. */
export const lessonTypeSlug = (label?: string): string => {
    const raw = String(label ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
    if (!raw) return '';
    const mapped = LESSON_TYPE_SLUGS[raw.toLowerCase()];
    if (mapped) return mapped;
    return raw
        .replace(/[_]+/g, ' ')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9\-]/g, '') || 'Lesson';
};

/**
 * Build the standard lesson file name. Example:
 *   buildLessonFileName({ learnerName: 'David Smith', lessonLabel: 'Learning App V2',
 *                         book: 'Speakout', unit: 'Unit 3', audience: 'Learner' })
 *   → 'David_Smith_Speakout_Unit_3_Learning-App-V2_Learner_2026-09-05.html'
 *
 * The lesson-type segment is always the canonical slug of the real type, so an
 * exam-prep file is `…_Exam-Prep_…` and a Micro Lesson is `…_Micro-Lesson_…`.
 */
export const buildLessonFileName = (args: BuildLessonFileNameArgs): string => {
    const parts = [
        args.learnerName,
        args.book,
        args.unit,
        lessonTypeSlug(args.lessonLabel) || args.lessonLabel,
        args.audience,
    ].map(sanitizeFileNamePart).filter(Boolean);
    const dateStamp = toDateStamp(args.date || new Date());
    return `${parts.join('_')}_${dateStamp}.html`;
};

/** Prefill book/unit for the save dialog from the learner's course plan. */
export const getLessonFilePrefill = (learner?: any): { book: string; unit: string } => {
    const coursePlan = learner?.coursePlan || {};
    const coursebook = coursePlan?.coursebookInfo || {};
    const book =
        (typeof coursePlan?.courseName === 'string' && coursePlan.courseName) ||
        coursebook?.title ||
        coursebook?.name ||
        coursebook?.bookName ||
        '';
    const unit =
        learner?.currentLessonSettings?.unitNumber ||
        learner?.currentLessonSettings?.unitName ||
        (coursePlan?.currentLesson !== undefined && coursePlan?.currentLesson !== null
            ? String(coursePlan.currentLesson)
            : '');
    return { book: String(book || ''), unit: String(unit || '') };
};
