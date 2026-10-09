import type { VideoLesson } from "@/modules/lessons/types";
import type { RuntimeCue } from "@/modules/subtitles/engine";
import type { ActivityStateValue, QualityOption } from "@/db/schema";

export type EpisodeLite = {
  id: string;
  episodeNumber: number;
  title: string;
  duration: number;
  thumbnail: string | null;
  progress: number;
  completed: boolean;
  hasSubtitles: boolean;
  hasLesson: boolean;
};

export type WatchSource = {
  id: string;
  url: string;
  type: string;
  label: string;
  qualityLabel: string;
  qualities: QualityOption[];
  audioTracks: { id: string; language: string; label: string }[];
  authorizationType: string;
  availability: string;
  downloadable: boolean;
};

export type TrackData = {
  id: string;
  language: string;
  label: string;
  isOriginal: boolean;
  isTranslation: boolean;
  alignment: string;
  source: string;
  cues: RuntimeCue[];
};

export type WatchData = {
  episode: { id: string; title: string; description: string; episodeNumber: number; duration: number; poster: string | null; attribution: string | null; license: string | null };
  season: { id: string; seasonNumber: number; title: string };
  series: { id: string; title: string };
  course: { id: string; title: string };
  seasons: { id: string; seasonNumber: number; title: string; episodes: EpisodeLite[] }[];
  sources: WatchSource[];
  tracks: TrackData[];
  chapters: { id: string; title: string; type: string; startTime: number; endTime: number }[];
  skipSegments: { id: string; type: string; label: string; startTime: number; endTime: number }[];
  lesson: { id: string; data: VideoLesson; generatedBy: string; personal: boolean } | null;
  lessonProgress: { status: string; activityStates: Record<string, ActivityStateValue>; percentage: number; xp: number } | null;
  watchProgress: { position: number; percentage: number; completed: boolean } | null;
  prefs: {
    subtitleMode: string;
    playbackRate: number;
    volume: number;
    autoSkipIntro: boolean;
    autoSkipRecap: boolean;
    autoSkipOutro: boolean;
    autoSkipCredits: boolean;
    autoplayNext: boolean;
    subtitleFontSize: string;
    subtitleBackground: boolean;
    theaterMode: boolean;
  };
  neighbors: { prev: EpisodeLite | null; next: EpisodeLite | null };
  learner: { userId: string; name: string; cefrLevel: string; nativeLanguage: string; targetLanguage: string; xp: number; level: number; dailyStreak: number };
  savedWords: string[];
  partyCode: string | null;
  isGuest: boolean;
};

export type AttemptResponse = {
  correct: boolean | null;
  score: number;
  detail?: string;
  attemptNumber: number;
  feedback: { main: string; comprehensive: string };
  state: ActivityStateValue;
  xpEarned: number;
  xp: number;
  level: number;
  leveledUp: boolean;
  levelProgress: number;
  correctStreak: number;
  dailyStreak: number;
  percentage: number;
  lessonCompleted: boolean;
  completedNow: boolean;
  activityStates: Record<string, ActivityStateValue>;
  newBadges: { id: string; name: string; emoji: string; rarity: string; description: string }[];
};

export type WordContext = {
  cueId: string;
  cueIndex: number;
  word: string;
  wordIndex: number;
  time: number;
  sentence: string;
};
