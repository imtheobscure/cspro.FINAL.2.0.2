/**
 * Flipbook Homework — shared schema, section maps, images & leaderboard.
 * Consumed by BOTH the standalone HTML generator (utils/flipbookHtmlGenerator.ts)
 * and the in-app React presenter (pages/flipbook/FlipBookPresenter.tsx), so the
 * two render paths stay visually identical.
 */

export interface FlipbookSection {
  id: string;
  type: FlipbookContentType;
  title: string;
  content: string;
  imageQuery?: string;
  imageUrl?: string;
  activities?: FlipbookActivity[];
  vocabulary?: FlipbookVocabItem[];
  dialogue?: FlipbookDialogueLine[];
  tips?: string[];
  facts?: string[];
  metadata?: Record<string, unknown>;
}

export type FlipbookContentType =
  | 'reading-factual' | 'reading-fictional' | 'dialogue' | 'grammar' | 'vocabulary'
  | 'thematic-vocabulary' | 'business-english' | 'news-story' | 'survival-english'
  | 'biography' | 'lifestyle' | 'debate' | 'writing-email' | 'how-to' | 'travel'
  | 'horror-story' | 'jokes' | 'advertisement' | 'reflection' | 'speaking'
  | 'roleplay' | 'shopping' | 'realistic-reading' | 'listening' | 'movie-dialogue'
  | 'micro-lesson' | 'life-hack' | 'historical-story' | 'recent-news' | 'formal-dialogue'
  | 'soft-skills' | 'practical' | 'social-profile' | 'discussion';

export interface FlipbookActivity {
  id: string;
  type: FlipbookActivityType;
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  pairs?: Array<{ left: string; right: string }>;
  blanks?: FlipbookBlankItem[];
  speakingPrompts?: string[];
  ratingCriteria?: string[];
  discussionPoints?: string[];
  /** Dictation: the exact sentence read aloud (the learner types what they hear). */
  text?: string;
  xpReward?: number;
}

export type FlipbookActivityType =
  | 'multiple-choice' | 'true-false' | 'matching' | 'fill-blanks' | 'dictation'
  | 'speaking' | 'discussion' | 'rating' | 'short-answer' | 'roleplay';

export interface FlipbookBlankItem {
  id: string;
  sentence: string;
  answer: string;
  hint?: string;
}

export interface FlipbookVocabItem {
  word: string;
  definition: string;
  partOfSpeech: string;
  example: string;
  pronunciation?: string;
  synonyms?: string[];
  difficulty?: 'basic' | 'intermediate' | 'advanced';
}

export interface FlipbookDialogueLine {
  speaker: string;
  text: string;
  emotion?: string;
  stage?: string;
}

export interface FlipbookLessonJSON {
  id: string;
  title: string;
  level: string;
  topic: string;
  tutor: string;
  learnerName: string;
  date: string;
  description: string;
  coverTagline: string;
  sections: FlipbookSection[];
}

export const FLIPBOOK_TYPE_ICONS: Record<string, string> = {
  'reading-factual': '📰',
  'reading-fictional': '📖',
  'grammar': '📝',
  'vocabulary': '🔤',
  'thematic-vocabulary': '📚',
  'business-english': '💼',
  'news-story': '🗞️',
  'survival-english': '🏥',
  'biography': '👤',
  'lifestyle': '🌿',
  'debate': '⚖️',
  'writing-email': '✉️',
  'how-to': '🛠️',
  'travel': '✈️',
  'horror-story': '👻',
  'jokes': '😄',
  'advertisement': '📢',
  'reflection': '🪞',
  'dialogue': '💬',
  'movie-dialogue': '🎬',
  'micro-lesson': '⚡',
  'life-hack': '💡',
  'historical-story': '🏛️',
  'recent-news': '📡',
  'formal-dialogue': '🤝',
  'roleplay': '🎭',
  'speaking': '🎤',
  'shopping': '🛒',
  'realistic-reading': '📋',
  'listening': '🎧',
  'soft-skills': '🧠',
  'practical': '🔧',
  'social-profile': '💑',
  'discussion': '🗣️',
};

export const FLIPBOOK_TYPE_COLORS: Record<string, string> = {
  'reading-factual': '#c0392b',
  'reading-fictional': '#7c3aed',
  'grammar': '#1a3a5c',
  'vocabulary': '#065f46',
  'thematic-vocabulary': '#065f46',
  'business-english': '#1e3a5f',
  'news-story': '#c0392b',
  'survival-english': '#c2410c',
  'biography': '#1a3a5c',
  'lifestyle': '#065f46',
  'debate': '#6b21a8',
  'writing-email': '#1e40af',
  'how-to': '#065f46',
  'travel': '#0369a1',
  'horror-story': '#1f2937',
  'jokes': '#b45309',
  'advertisement': '#be123c',
  'reflection': '#6b21a8',
  'dialogue': '#0369a1',
  'movie-dialogue': '#1e3a5f',
  'micro-lesson': '#065f46',
  'life-hack': '#b45309',
  'historical-story': '#78350f',
  'recent-news': '#c0392b',
  'formal-dialogue': '#1a3a5c',
  'roleplay': '#6b21a8',
  'speaking': '#be123c',
  'shopping': '#0369a1',
  'realistic-reading': '#374151',
  'listening': '#1e3a5f',
  'soft-skills': '#065f46',
  'practical': '#374151',
  'social-profile': '#be185d',
  'discussion': '#c2410c',
};

export const FLIPBOOK_TYPE_LABELS: Record<string, string> = {
  'reading-factual': '📰 Factual Reading',
  'reading-fictional': '📖 Fiction',
  'grammar': '📝 Grammar Masterclass',
  'vocabulary': '🔤 Vocabulary',
  'thematic-vocabulary': '📚 Thematic Vocabulary',
  'business-english': '💼 Business English',
  'news-story': '🗞️ Breaking News',
  'survival-english': '🏥 Survival English',
  'biography': '👤 Biography',
  'lifestyle': '🌿 Lifestyle',
  'debate': '⚖️ Great Debate',
  'writing-email': '✉️ Email Writing',
  'how-to': '🛠️ How To',
  'travel': '✈️ Travel',
  'horror-story': '👻 Horror Fiction',
  'jokes': '😄 Humour & Wit',
  'advertisement': '📢 Advertisement',
  'reflection': '🪞 My Reflection',
  'dialogue': '💬 Dialogue',
  'movie-dialogue': '🎬 Movie Dialogue',
  'micro-lesson': '⚡ Micro Lesson',
  'life-hack': '💡 Life Hack',
  'historical-story': '🏛️ Historical Story',
  'recent-news': '📡 Recent News',
  'formal-dialogue': '🤝 Formal Dialogue',
  'roleplay': '🎭 Roleplay',
  'speaking': '🎤 Speaking',
  'shopping': '🛒 Shopping',
  'realistic-reading': '📋 Realistic Reading',
  'listening': '🎧 Listening',
  'soft-skills': '🧠 Soft Skills',
  'practical': '🔧 Practical English',
  'social-profile': '💑 Social Profile',
  'discussion': '🗣️ Discussion',
};

export const FLIPBOOK_TYPE_BG: Record<string, string> = {
  'horror-story': '#111827',
  'advertisement': '#fff1f2',
  'reflection': '#f5f3ff',
  'jokes': '#fffbeb',
};

const FLIPBOOK_SECTION_IMAGES: Record<string, string> = {
  'reading-factual': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'reading-fictional': 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80',
  'grammar': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
  'vocabulary': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
  'business-english': 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&q=80',
  'news-story': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
  'survival-english': 'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=800&q=80',
  'biography': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'lifestyle': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'debate': 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
  'writing-email': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
  'how-to': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
  'travel': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  'horror-story': 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&q=80',
  'jokes': 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80',
  'advertisement': 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800&q=80',
  'reflection': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
  'dialogue': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
  'thematic-vocabulary': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
};

export function flipbookSectionImage(type: string, query?: string): string {
  if (FLIPBOOK_SECTION_IMAGES[type]) return FLIPBOOK_SECTION_IMAGES[type];
  if (query) {
    const seed = query.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 1000;
    return `https://picsum.photos/seed/${seed}/800/500`;
  }
  return 'https://picsum.photos/800/500';
}

export interface FlipbookLeaderboardEntry {
  name: string;
  country: string;
  flag: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
}

const FAKE_LEARNERS: Omit<FlipbookLeaderboardEntry, 'xp' | 'level' | 'streak'>[] = [
  { name: 'Amara O.', country: 'Nigeria', flag: '🇳🇬', avatar: '👩🏿‍🎓' },
  { name: 'Hiroshi T.', country: 'Japan', flag: '🇯🇵', avatar: '👨🏻‍💼' },
  { name: 'Sofia M.', country: 'Brazil', flag: '🇧🇷', avatar: '👩🏽‍🎨' },
  { name: 'Dmitri K.', country: 'Russia', flag: '🇷🇺', avatar: '🧑🏻‍💻' },
  { name: 'Priya S.', country: 'India', flag: '🇮🇳', avatar: '👩🏽‍🔬' },
  { name: 'Carlos R.', country: 'Mexico', flag: '🇲🇽', avatar: '👨🏽‍🏫' },
  { name: 'Yuki N.', country: 'Japan', flag: '🇯🇵', avatar: '👩🏻‍🎤' },
  { name: 'Ibrahim A.', country: 'Egypt', flag: '🇪🇬', avatar: '🧑🏽‍💼' },
  { name: 'Elena V.', country: 'Ukraine', flag: '🇺🇦', avatar: '👩🏻‍🏫' },
  { name: 'Kwame B.', country: 'Ghana', flag: '🇬🇭', avatar: '👨🏿‍🎓' },
  { name: 'Mei L.', country: 'China', flag: '🇨🇳', avatar: '👩🏻‍💻' },
  { name: 'Ahmed F.', country: 'Morocco', flag: '🇲🇦', avatar: '🧔🏽' },
];

export function generateFlipbookLeaderboard(learnerName: string, learnerXP: number): FlipbookLeaderboardEntry[] {
  const seed = 42;
  const rng = (min: number, max: number, s: number) => {
    const x = Math.sin(s) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
  };

  const fakes = FAKE_LEARNERS.map((l, i) => ({
    ...l,
    xp: rng(50, 400, seed + i * 7),
    level: rng(1, 5, seed + i * 3),
    streak: rng(1, 30, seed + i * 11),
  }));

  const me: FlipbookLeaderboardEntry = {
    name: learnerName || 'You',
    country: 'Your Country',
    flag: '🌟',
    avatar: '👩‍🎓',
    xp: learnerXP,
    level: Math.floor(learnerXP / 100) + 1,
    streak: rng(5, 20, (learnerXP % 7) + 1),
  };

  return [...fakes, me].sort((a, b) => b.xp - a.xp);
}