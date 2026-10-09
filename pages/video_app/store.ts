import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lesson, LearnerState, LeaderboardEntry, AppMode, SubtitleCue, Activity, WhiteboardState, WhiteboardElement } from './types';

const MOCK_LEADERS: LeaderboardEntry[] = [
  { name: 'Alex', avatar: '🦁', xp: 4200, isPlayer: false },
  { name: 'Maria', avatar: '🌸', xp: 3800, isPlayer: false },
  { name: 'John', avatar: '🔥', xp: 2900, isPlayer: false },
  { name: 'Sofia', avatar: '⚡', xp: 1500, isPlayer: false },
];

interface AppState {
  // Lesson
  lesson: Lesson | null;
  setLesson: (lesson: Lesson) => void;

  // Learner
  learner: LearnerState;
  setLearner: (learner: Partial<LearnerState>) => void;
  addXP: (amount: number) => void;
  addBadge: (badgeId: string) => void;
  completeActivity: (activityId: string) => void;
  resetStreak: () => void;
  incrementStreak: () => void;
  addJournalEntry: (prompt: string, answer: string) => void;

  // Media
  mediaUrl: string;
  setMediaUrl: (url: string) => void;
  mediaType: 'video' | 'audio' | 'youtube';
  setMediaType: (type: 'video' | 'audio' | 'youtube') => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (d: number) => void;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  playbackRate: number;
  setPlaybackRate: (r: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  isFullscreen: boolean;
  setIsFullscreen: (f: boolean) => void;

  // Subtitles
  subtitles: SubtitleCue[];
  setSubtitles: (cues: SubtitleCue[]) => void;
  currentSubtitle: SubtitleCue | null;
  setCurrentSubtitle: (cue: SubtitleCue | null) => void;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

  // Activities
  currentActivity: Activity | null;
  setCurrentActivity: (a: Activity | null) => void;
  activityQueue: Activity[];
  setActivityQueue: (q: Activity[]) => void;
  triggeredActivities: Set<string>;
  markTriggered: (id: string) => void;
  showCountdown: boolean;
  setShowCountdown: (s: boolean) => void;
  pendingActivity: Activity | null;
  setPendingActivity: (a: Activity | null) => void;

  // Shake / Confetti
  shakeScreen: boolean;
  setShakeScreen: (s: boolean) => void;
  showConfetti: boolean;
  setShowConfetti: (s: boolean) => void;

  // UI
  showDictionary: boolean;
  setShowDictionary: (s: boolean) => void;
  dictionaryWord: string;
  setDictionaryWord: (w: string) => void;
  showLeaderboard: boolean;
  setShowLeaderboard: (s: boolean) => void;
  showBadgeModal: string | null;
  setShowBadgeModal: (b: string | null) => void;
  showMasterPrompt: boolean;
  setShowMasterPrompt: (s: boolean) => void;
  showSplash: boolean;
  setShowSplash: (s: boolean) => void;
  showProfileSetup: boolean;
  setShowProfileSetup: (s: boolean) => void;
  catMood: string;
  setCatMood: (m: string) => void;
  catMuted: boolean;
  setCatMuted: (m: boolean) => void;
  catVoice: string;
  setCatVoice: (v: string) => void;
  catMessage: string;
  setCatMessage: (msg: string) => void;

  // Karaoke
  karaokeMode: boolean;
  setKaraokeMode: (k: boolean) => void;
  karaokeRecording: boolean;
  setKaraokeRecording: (r: boolean) => void;

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  updateLeaderboard: () => void;

  // Recordings
  recordings: { url: string; name: string; timestamp: number }[];
  addRecording: (url: string, name: string) => void;

  // Whiteboard
  whiteboardActive: boolean;
  setWhiteboardActive: (active: boolean) => void;
  whiteboardElements: WhiteboardElement[];
  setWhiteboardElements: (elements: WhiteboardElement[]) => void;
  addWhiteboardElement: (element: WhiteboardElement) => void;
  removeWhiteboardElement: (id: string) => void;
  updateWhiteboardElement: (id: string, updates: Partial<WhiteboardElement>) => void;
  whiteboardSavedStates: WhiteboardState[];
  saveWhiteboardState: (timestamp: number, snapshot?: string) => void;
  clearWhiteboard: () => void;
  whiteboardTool: 'select' | 'pen' | 'text' | 'highlight' | 'arrow' | 'shape' | 'sticky' | 'eraser';
  setWhiteboardTool: (tool: 'select' | 'pen' | 'text' | 'highlight' | 'arrow' | 'shape' | 'sticky' | 'eraser') => void;
  whiteboardColor: string;
  setWhiteboardColor: (color: string) => void;

  // L1 Translation
  learnerL1: string;
  setLearnerL1: (lang: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, _get) => ({
      lesson: null,
      setLesson: (lesson) => set({ lesson }),

      learner: {
        name: '',
        avatar: '🎓',
        xp: 0,
        level: 1,
        streak: 0,
        badges: [],
        completedActivities: [],
        journal: [],
      },
      setLearner: (partial) =>
        set((s) => ({ learner: { ...s.learner, ...partial } })),
      addXP: (amount) =>
        set((s) => {
          const newXP = s.learner.xp + amount;
          const pointsToLevelUp = s.lesson?.globalSettings?.pointsToLevelUp ?? 1000;
          const newLevel = Math.floor(newXP / pointsToLevelUp) + 1;
          return { learner: { ...s.learner, xp: newXP, level: newLevel } };
        }),
      addBadge: (badgeId) =>
        set((s) => {
          if (s.learner.badges.includes(badgeId)) return s;
          return { learner: { ...s.learner, badges: [...s.learner.badges, badgeId] } };
        }),
      completeActivity: (id) =>
        set((s) => ({
          learner: {
            ...s.learner,
            completedActivities: [...s.learner.completedActivities, id],
          },
        })),
      resetStreak: () =>
        set((s) => ({ learner: { ...s.learner, streak: 0 } })),
      incrementStreak: () =>
        set((s) => ({ learner: { ...s.learner, streak: s.learner.streak + 1 } })),
      addJournalEntry: (prompt, answer) =>
        set((s) => ({
          learner: {
            ...s.learner,
            journal: [
              ...s.learner.journal,
              { prompt, answer, timestamp: Date.now() },
            ],
          },
        })),

      mediaUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      setMediaUrl: (url) => set({ mediaUrl: url }),
      mediaType: 'video',
      setMediaType: (type) => set({ mediaType: type }),
      currentTime: 0,
      setCurrentTime: (time) => set({ currentTime: time }),
      duration: 0,
      setDuration: (d) => set({ duration: d }),
      isPlaying: false,
      setIsPlaying: (p) => set({ isPlaying: p }),
      volume: 1,
      setVolume: (v) => set({ volume: v }),
      playbackRate: 1,
      setPlaybackRate: (r) => set({ playbackRate: r }),
      isMuted: false,
      setIsMuted: (m) => set({ isMuted: m }),
      isFullscreen: false,
      setIsFullscreen: (f) => set({ isFullscreen: f }),

      subtitles: [],
      setSubtitles: (cues) => set({ subtitles: cues }),
      currentSubtitle: null,
      setCurrentSubtitle: (cue) => set({ currentSubtitle: cue }),
      appMode: 'subtitle',
      setAppMode: (mode) => set({ appMode: mode }),

      currentActivity: null,
      setCurrentActivity: (a) => set({ currentActivity: a }),
      activityQueue: [],
      setActivityQueue: (q) => set({ activityQueue: q }),
      triggeredActivities: new Set(),
      markTriggered: (id) =>
        set((s) => {
          const next = new Set(s.triggeredActivities);
          next.add(id);
          return { triggeredActivities: next };
        }),
      showCountdown: false,
      setShowCountdown: (s) => set({ showCountdown: s }),
      pendingActivity: null,
      setPendingActivity: (a) => set({ pendingActivity: a }),

      shakeScreen: false,
      setShakeScreen: (s) => set({ shakeScreen: s }),
      showConfetti: false,
      setShowConfetti: (s) => set({ showConfetti: s }),

      showDictionary: false,
      setShowDictionary: (s) => set({ showDictionary: s }),
      dictionaryWord: '',
      setDictionaryWord: (w) => set({ dictionaryWord: w }),
      showLeaderboard: false,
      setShowLeaderboard: (s) => set({ showLeaderboard: s }),
      showBadgeModal: null,
      setShowBadgeModal: (b) => set({ showBadgeModal: b }),
      showMasterPrompt: false,
      setShowMasterPrompt: (s) => set({ showMasterPrompt: s }),
      showSplash: false, // Presenter mode: boot straight into the lesson (no splash)
      setShowSplash: (s) => set({ showSplash: s }),
      showProfileSetup: false,
      setShowProfileSetup: (s) => set({ showProfileSetup: s }),
      catMood: '😺',
      setCatMood: (m) => set({ catMood: m }),
      catMuted: false,
      setCatMuted: (m) => set({ catMuted: m }),
      catVoice: '',
      setCatVoice: (v) => set({ catVoice: v }),
      catMessage: "Meow! Ready to learn? Let's go! 🎬",
      setCatMessage: (msg) => set({ catMessage: msg }),

      karaokeMode: false,
      setKaraokeMode: (k) => set({ karaokeMode: k }),
      karaokeRecording: false,
      setKaraokeRecording: (r) => set({ karaokeRecording: r }),

      leaderboard: MOCK_LEADERS,
      updateLeaderboard: () =>
        set((s) => {
          const playerEntry: LeaderboardEntry = {
            name: s.learner.name || 'You',
            avatar: s.learner.avatar || '🎓',
            xp: s.learner.xp,
            isPlayer: true,
          };
          const others = MOCK_LEADERS.filter((l) => !l.isPlayer);
          const all = [...others, playerEntry].sort((a, b) => b.xp - a.xp);
          return { leaderboard: all };
        }),

      recordings: [],
      addRecording: (url, name) =>
        set((s) => ({
          recordings: [...s.recordings, { url, name, timestamp: Date.now() }],
        })),

      // Whiteboard
      whiteboardActive: false,
      setWhiteboardActive: (active) => set({ whiteboardActive: active }),
      whiteboardElements: [],
      setWhiteboardElements: (elements) => set({ whiteboardElements: elements }),
      addWhiteboardElement: (element) =>
        set((s) => ({ whiteboardElements: [...s.whiteboardElements, element] })),
      removeWhiteboardElement: (id) =>
        set((s) => ({ whiteboardElements: s.whiteboardElements.filter((e) => e.id !== id) })),
      updateWhiteboardElement: (id, updates) =>
        set((s) => ({
          whiteboardElements: s.whiteboardElements.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
      whiteboardSavedStates: [],
      saveWhiteboardState: (timestamp, snapshot) =>
        set((s) => ({
          whiteboardSavedStates: [
            ...s.whiteboardSavedStates.filter((st) => Math.abs(st.timestamp - timestamp) > 5),
            { timestamp, elements: [...s.whiteboardElements], snapshot },
          ].sort((a, b) => a.timestamp - b.timestamp),
        })),
      clearWhiteboard: () => set({ whiteboardElements: [] }),
      whiteboardTool: 'pen',
      setWhiteboardTool: (tool) => set({ whiteboardTool: tool }),
      whiteboardColor: '#FFD700',
      setWhiteboardColor: (color) => set({ whiteboardColor: color }),

      // L1 Translation
      learnerL1: 'es', // default Spanish
      setLearnerL1: (lang) => set({ learnerL1: lang }),
    }),
    {
      name: 'video-lesson-store',
      partialize: (state) => ({
        learner: state.learner,
        recordings: state.recordings,
        catVoice: state.catVoice,
        whiteboardSavedStates: state.whiteboardSavedStates,
        learnerL1: state.learnerL1,
        catMuted: state.catMuted,
        appMode: state.appMode,
      }),
    }
  )
);
