/**
 * Learner Categories (themes)
 * Each profile can be assigned a category that:
 *  - themes the coloring of the profile sections
 *  - decorates the background with transparent emojis
 *  - drives weekly competition matchmaking (learners compete inside their category)
 *  - flags "Recommended" lesson types in the Lesson Creator
 */

export interface LearnerCategory {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  /** Lesson type ids that match ManualGenerator contentTypes — shown with a ✅ in Lesson Creator */
  recommendedLessonTypeIds: string[];
  /** Hex gradient used for accent strips */
  from: string;
  to: string;
  /** Soft rgba tint used to color section cards */
  soft: string;
  /** Tailwind classes for small badge chips */
  chip: string;
  /** Transparent emojis scattered over the profile background */
  backgroundEmojis: string[];
}

export const LEARNER_CATEGORIES: LearnerCategory[] = [
  {
    id: 'general-english',
    name: 'General English',
    emoji: '📘',
    tagline: 'All-round fluency for daily life',
    description: '4 main skills + vocabulary, grammar, pronunciation to develop CEFR levels.',
    recommendedLessonTypeIds: ['englishLesson', 'testLab', 'conversationMaker'],
    from: '#2563eb',
    to: '#06b6d4',
    soft: 'rgba(37, 99, 235, 0.05)',
    chip: 'bg-blue-100 text-blue-800 border-blue-200',
    backgroundEmojis: ['📖', '📚', '✏️', '🗣️', '🧠', '💬', '🔤', '📝'],
  },
  {
    id: 'everyday-conversation',
    name: 'Everyday Conversation',
    emoji: '💬',
    tagline: 'Confident casual chats',
    description: 'Building speaking confidence, fluency, pronunciation, and listening skills for casual daily chats.',
    recommendedLessonTypeIds: ['englishLessonV2', 'avatarLesson', 'avatarLessonV2', 'conversationalLesson', 'conversationMaker', 'testLab'],
    from: '#10b981',
    to: '#84cc16',
    soft: 'rgba(16, 185, 129, 0.05)',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    backgroundEmojis: ['💬', '🗣️', '😄', '☕', '🎧', '👋', '🧑‍🤝‍🧑', '🎉'],
  },
  {
    id: 'work-career',
    name: 'Work & Career',
    emoji: '💼',
    tagline: 'Professional communication',
    description: 'Improving professional communication for meetings, presentations, emails, job interviews, or career growth.',
    recommendedLessonTypeIds: ['explainerLesson', 'conversationalLesson', 'avatarLesson', 'avatarLessonV2', 'simulations', 'homework', 'slides'],
    from: '#4f46e5',
    to: '#7c3aed',
    soft: 'rgba(79, 70, 229, 0.05)',
    chip: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    backgroundEmojis: ['💼', '📊', '📧', '🤝', '🎯', '📈', '👔', '☎️'],
  },
  {
    id: 'hobby-culture',
    name: 'Hobby & Culture',
    emoji: '🎨',
    tagline: 'Learn out of passion',
    description: 'Learning out of personal interest, to connect with family and friends, or to explore movies, books, and traditions.',
    recommendedLessonTypeIds: ['englishLessonV2', 'studyGuide', 'conversationMaker', 'partyMode'],
    from: '#ec4899',
    to: '#f59e0b',
    soft: 'rgba(236, 72, 153, 0.05)',
    chip: 'bg-pink-100 text-pink-800 border-pink-200',
    backgroundEmojis: ['🎨', '🎬', '🎵', '📖', '🎭', '🧑‍🎨', '🌍', '🎮'],
  },
  {
    id: 'travel-relocation',
    name: 'Travel & Relocation',
    emoji: '✈️',
    tagline: 'Get around the world',
    description: 'Learning practical phrases to get around abroad, live in another country, or handle moves smoothly.',
    recommendedLessonTypeIds: ['englishLesson', 'conversationalLesson', 'homework', 'conversationGame', 'placeGame', 'weeklyChallenge'],
    from: '#0ea5e9',
    to: '#f59e0b',
    soft: 'rgba(14, 165, 233, 0.05)',
    chip: 'bg-sky-100 text-sky-800 border-sky-200',
    backgroundEmojis: ['✈️', '🧳', '🗺️', '🏝️', '🛂', '🌍', '🚕', '🏨'],
  },
  {
    id: 'exams-tests',
    name: 'Exams & Tests',
    emoji: '🎓',
    tagline: 'Official test preparation',
    description: 'Preparing for official language tests such as IELTS, TOEFL, Cambridge, or school exams.',
    recommendedLessonTypeIds: ['examPrepLesson', 'studyGuide', 'testLab', 'printableWorksheet', 'mockTest', 'mockTestV2'],
    from: '#8b5cf6',
    to: '#d946ef',
    soft: 'rgba(139, 92, 246, 0.05)',
    chip: 'bg-violet-100 text-violet-800 border-violet-200',
    backgroundEmojis: ['🎓', '📝', '⏱️', '📋', '✅', '🧪', '📚', '🏅'],
  },
  {
    id: 'school-studies',
    name: 'School & Studies',
    emoji: '🏫',
    tagline: 'Academic support',
    description: 'Academic support, including homework help, grammar study, literature, and studying abroad.',
    recommendedLessonTypeIds: ['bilingualStudyLesson', 'explainerLesson', 'homework', 'quiz', 'studyGuide', 'learningApp', 'learningAppV2'],
    from: '#0891b2',
    to: '#6366f1',
    soft: 'rgba(8, 145, 178, 0.05)',
    chip: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    backgroundEmojis: ['🏫', '📚', '✏️', '🧪', '🔬', '📖', '🎓', '💡'],
  },
];

export const getCategoryById = (id?: string): LearnerCategory | undefined =>
  LEARNER_CATEGORIES.find(c => c.id === id);

export const getRecommendedLessonTypesForCategory = (categoryId?: string): string[] =>
  getCategoryById(categoryId)?.recommendedLessonTypeIds || [];