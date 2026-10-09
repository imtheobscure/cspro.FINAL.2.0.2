import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AppData,
  DisplaySettings,
  VoiceSettings,
  PromptSettings,
  LearnerFacts,
  LessonPlan,
  CustomProfile,
} from "../types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ---- Default values ----

const defaultDisplay: DisplaySettings = {
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontSizePx: 36,
  lineHeight: 1.55,
  letterSpacingEm: 0.01,
  maxWidthCh: 38,
  scheme: "dark",
  opacity: 95,
  anchor: "third",
  focusMode: true,
  showPitchContour: true,
  showTranslations: true,
  showPronunciation: true,
  showBloom: true,
  showEmotion: true,
  snapToParagraph: true,
  fullscreenLock: false,
  scrollSpeed: 0.8,
  showWebcam: false,
};

const defaultVoice: VoiceSettings = {
  enabled: false,
  baseWPM: 140,
  minWPM: 70,
  maxWPM: 240,
  autoPauseSec: 1.6,
  waitTimeSec: 3,
};

const defaultPrompt: PromptSettings = {
  profile: "lesson",
  customProfileId: undefined,
  targetMinutes: 30,
  includeWarmUp: true,
  includeLeadIn: true,
  includeCooler: true,
  includeBlooms: true,
  includePronunciation: true,
  includeTranslation: false,
  translationLanguage: "Spanish",
  includePredictedQuestions: true,
  includeWhiteboard: true,
  includeFormative: true,
  bilingualMode: false,
  contentPlatform: "youtube",
  verbosity: "average",
  customInstructions: "",
  waitTimeSec: 5, // default 5 seconds wait time after questions
  teacherGuide: {
    enabled: true,
    ccqs: true,
    extraExplanation: true,
    sel: true,
    softSkills: true,
    discussionQuestions: true,
    relatedVocabulary: true,
    relatedGrammar: true,
    homeworkIdea: true,
    onlineChallenges: true,
    activities: true,
    teacherTips: true,
    customItems: [],
  },
};

const defaultLearner: LearnerFacts = {
  id: "default",
  name: "",
  l1: "Spanish",
  cefr: "B1",
  age: "",
  interests: "",
  goals: "",
  notes: "",
};

const defaultData: AppData = {
  display: defaultDisplay,
  voice: defaultVoice,
  prompt: defaultPrompt,
  learner: defaultLearner,
  learners: [defaultLearner],
  activeLearnerIdx: 0,
  customProfiles: [],
  rawLessonText: "",
  lessonJsonText: "",
  lesson: null,
  bookmarks: [],
  studentRoster: [],
};

// ---- Store ----

interface Actions {
  setDisplay: (patch: Partial<DisplaySettings>) => void;
  setVoice: (patch: Partial<VoiceSettings>) => void;
  setPrompt: (patch: Partial<PromptSettings>) => void;
  setLearner: (patch: Partial<LearnerFacts>) => void;
  setRawLessonText: (text: string) => void;
  setLessonJsonText: (text: string) => void;
  setLesson: (lesson: LessonPlan | null) => void;
  setStudentRoster: (names: string[]) => void;
  toggleBookmark: (idx: number) => void;
  // Multi-learner
  addLearner: () => void;
  removeLearner: (id: string) => void;
  setActiveLearner: (idx: number) => void;
  updateLearner: (id: string, patch: Partial<LearnerFacts>) => void;
  // Custom profiles
  addCustomProfile: (p: CustomProfile) => void;
  removeCustomProfile: (id: string) => void;
  updateCustomProfile: (id: string, patch: Partial<CustomProfile>) => void;
  // Import/export
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  resetAll: () => void;
}

export const useStore = create<AppData & Actions>()(
  persist(
    (set, get) => ({
      ...defaultData,
      setDisplay: (patch) =>
        set((s) => ({ display: { ...s.display, ...patch } })),
      setVoice: (patch) => set((s) => ({ voice: { ...s.voice, ...patch } })),
      setPrompt: (patch) => set((s) => ({ prompt: { ...s.prompt, ...patch } })),
      setLearner: (patch) =>
        set((s) => {
          const updated = { ...s.learner, ...patch };
          const learners = s.learners.map((l) =>
            l.id === updated.id ? updated : l,
          );
          return { learner: updated, learners };
        }),
      setRawLessonText: (text) => set({ rawLessonText: text }),
      setLessonJsonText: (text) => set({ lessonJsonText: text }),
      setLesson: (lesson) => set({ lesson }),
      setStudentRoster: (names) => set({ studentRoster: names }),
      toggleBookmark: (idx) =>
        set((s) => {
          const has = s.bookmarks.includes(idx);
          return {
            bookmarks: has
              ? s.bookmarks.filter((b) => b !== idx)
              : [...s.bookmarks, idx].sort((a, b) => a - b),
          };
        }),
      // Multi-learner
      addLearner: () =>
        set((s) => {
          const nl: LearnerFacts = { ...defaultLearner, id: uid(), name: "" };
          const learners = [...s.learners, nl];
          return {
            learners,
            activeLearnerIdx: learners.length - 1,
            learner: nl,
          };
        }),
      removeLearner: (id) =>
        set((s) => {
          if (s.learners.length <= 1) return s;
          const learners = s.learners.filter((l) => l.id !== id);
          const idx = Math.min(s.activeLearnerIdx, learners.length - 1);
          return { learners, activeLearnerIdx: idx, learner: learners[idx] };
        }),
      setActiveLearner: (idx) =>
        set((s) => ({
          activeLearnerIdx: idx,
          learner: s.learners[idx] || s.learner,
        })),
      updateLearner: (id, patch) =>
        set((s) => {
          const learners = s.learners.map((l) =>
            l.id === id ? { ...l, ...patch } : l,
          );
          const learner =
            s.learner.id === id ? { ...s.learner, ...patch } : s.learner;
          return { learners, learner };
        }),
      // Custom profiles
      addCustomProfile: (p) =>
        set((s) => ({ customProfiles: [...s.customProfiles, p] })),
      removeCustomProfile: (id) =>
        set((s) => ({
          customProfiles: s.customProfiles.filter((p) => p.id !== id),
        })),
      updateCustomProfile: (id, patch) =>
        set((s) => ({
          customProfiles: s.customProfiles.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),
      // Import/export
      exportSettings: () => {
        const s = get();
        const exportable = {
          display: s.display,
          voice: s.voice,
          prompt: s.prompt,
          learners: s.learners,
          customProfiles: s.customProfiles,
          studentRoster: s.studentRoster,
        };
        return JSON.stringify(exportable, null, 2);
      },
      importSettings: (json: string) => {
        try {
          const d = JSON.parse(json);
          const patch: Partial<AppData> = {};
          if (d.display) patch.display = { ...defaultDisplay, ...d.display };
          if (d.voice) patch.voice = { ...defaultVoice, ...d.voice };
          if (d.prompt) patch.prompt = { ...defaultPrompt, ...d.prompt };
          if (Array.isArray(d.learners) && d.learners.length > 0) {
            patch.learners = d.learners;
            patch.activeLearnerIdx = 0;
            patch.learner = d.learners[0];
          }
          if (Array.isArray(d.customProfiles))
            patch.customProfiles = d.customProfiles;
          if (Array.isArray(d.studentRoster))
            patch.studentRoster = d.studentRoster;
          set(patch);
          return true;
        } catch {
          return false;
        }
      },
      resetAll: () => set(defaultData),
    }),
    {
      name: "tutorly-prompter-v2",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
);
