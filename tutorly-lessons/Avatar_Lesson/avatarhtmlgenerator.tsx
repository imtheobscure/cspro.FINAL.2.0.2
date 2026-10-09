/**
 * htmlgenerator.tsx
 * ---------------------------------------------------------------------------
 * Avatar Lesson Engine — Generative HTML Builder
 *
 * WHAT THIS FILE IS
 * A React + TypeScript authoring tool that takes structured lesson JSON and
 * bakes out a SINGLE, fully self-contained .html file. The emitted file has
 * ZERO runtime dependencies (no React, no CDN, no build step) so it opens
 * straight from file:// in any modern browser. All CSS + JS are inlined.
 *
 * WHY THE RUNTIME IS VANILLA JS (NOT REACT)
 * The hard product requirement is "single self-contained HTML that opens
 * anywhere offline." Shipping React into that would require a bundler and a
 * hydration step, which breaks the promise. So this .tsx is the AUTHORING /
 * BUILD tool, and generateStandaloneHtml() emits a hand-written vanilla
 * runtime string. You get a typed authoring experience AND a dependency-free
 * artifact.
 *
 * PIPELINE
 *   raw JSON  ->  parse  ->  validateLessonData (graph + coverage checks)
 *             ->  live preview (React)  ->  generateStandaloneHtml()  ->  .html
 *
 * FEATURE SURFACE OF THE EMITTED PAGE
 *   - Color-coded mini-lessons with paragraph/list/table/callout/quote/code
 *   - 16+ callout types (Did You Know, Q&A, Grammar, Vocabulary, Civic, etc.)
 *   - 3D glossy emoji avatars with speaking pulse/glow/tilt
 *   - Web Speech API TTS with a 4-step voice resolution chain
 *   - Microsoft Online Natural voice targeting (best in Edge)
 *   - Per-bubble play / pause / resume / replay + global stop
 *   - "Play in turn" sequential dialogue playback with auto-scroll
 *   - Rate / pitch / volume controls, persisted to localStorage
 *   - Child-tone pitch compensation fallback
 *   - User-created custom voice profiles (voice + emoji), persisted
 *   - Branching scenario as a NODE GRAPH state machine
 *   - Flags system for betrayal / romance / life-or-death branching
 *   - Affinity meters per character
 *   - Rewind, restart, "explore other path"
 *   - Ending screen with concept coverage recap
 *   - Quick-check retrieval questions between lessons
 *   - Auto-built glossary from Vocabulary callouts
 *   - Progress bar + concepts-mastered counter + story breadcrumb
 *   - Dark mode (prefers-color-scheme + manual toggle)
 *   - Full keyboard nav, aria-live spoken captions, reduced-motion support
 *   - localStorage progress resume + drag-drop JSON loading
 *   - HTML escaping / sanitization on all injected content
 * ---------------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
// Reaches OUT of the lesson folder to the app's utils/, so it needs one more
// `../` than it did before Avatar_Lesson moved into tutorly-lessons/.
import { VOICE_GROUP_RUNTIME_JS } from "../../utils/voiceGroups";

/* =========================================================================
 * SECTION 1 — SCHEMA TYPES (the shared contract, schemaVersion "1.0")
 * ========================================================================= */

export type SchemaVersion = "1.0";

export type NodeType = "context" | "choice" | "consequence" | "ending";

export type EndingStyle = "success" | "warning" | "tragic" | "bittersweet";

export type Gender = "female" | "male" | "neutral";

export type CalloutType =
  | "didYouKnow"
  | "qa"
  | "fyi"
  | "grammarStyle"
  | "vocabulary"
  | "cultural"
  | "civic"
  | "lifeSkills"
  | "criticalThinking"
  | "transferableSkills"
  | "softSkills"
  | "pronunciation"
  | "strategyTips"
  | "communication"
  | "fluency"
  | "custom";

export type BlockType =
  | "paragraph"
  | "list"
  | "orderedList"
  | "table"
  | "callout"
  | "quote"
  | "code"
  | "definition";

export type FlagValue = string | number | boolean;
export type FlagMap = Record<string, FlagValue>;

export interface VoicePreset {
  id: string;
  locale: string;
  regionLabel: string;
  regionKey: string;
  displayName: string;
  emoji: string;
  gender: Gender;
  tone: string;
  /** Microsoft Online Natural / Neural voice identifier. */
  azureVoice: string;
  /** BCP-47 language tag used for Web Speech fallback matching. */
  fallbackLang: string;
  /** True for child / youth timbre voices; used for pitch compensation. */
  childTimbre?: boolean;
}

export interface CustomVoiceProfile {
  id: string;
  label: string;
  emoji: string;
  /** Exact Web Speech voice name the user picked in-app. */
  voiceName: string;
  lang: string;
  rate?: number;
  pitch?: number;
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  gender: Gender;
  /** Human-readable accent label, e.g. "United Kingdom English". */
  accent: string;
  /** References a VOICE_PRESETS id OR a custom profile id. */
  voicePresetId: string;
  /** Optional explicit override of the exact speech voice name. */
  customVoiceName?: string;
  role?: string;
  notes?: string;
  /** Starting affinity toward the learner, 0-100. */
  baseAffinity?: number;
}

export interface DefinitionPair {
  term: string;
  definition: string;
}

export interface RichBlock {
  id: string;
  type: BlockType;
  title?: string;
  body?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  calloutType?: CalloutType;
  icon?: string;
  language?: string;
  definitions?: DefinitionPair[];
}

export interface DialogueLine {
  id: string;
  speakerId: string;
  text: string;
  /** Optional emotion hint used only for subtle avatar styling. */
  emotion?: "neutral" | "joy" | "anger" | "fear" | "love" | "sorrow";
}

export interface QuickCheck {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface MiniLesson {
  id: string;
  title: string;
  /** Any valid CSS color; oklch recommended. Drives the accent system. */
  accent: string;
  conceptIds: string[];
  summary: string;
  blocks: RichBlock[];
  dialogue?: DialogueLine[];
  quickChecks?: QuickCheck[];
  estimatedMinutes?: number;
}

export interface AffinityDelta {
  characterId: string;
  amount: number;
}

export interface ChoiceOption {
  id: string;
  label: string;
  goto: string;
  hint?: string;
  setsFlags?: FlagMap;
  requiresFlags?: FlagMap;
  affinity?: AffinityDelta[];
}

export interface ScenarioNode {
  id: string;
  type: NodeType;
  title: string;
  body: string;
  speakerId?: string;
  lines?: DialogueLine[];
  choices?: ChoiceOption[];
  next?: string;
  reinforces?: string[];
  setsFlags?: FlagMap;
  requiresFlags?: FlagMap;
  affinity?: AffinityDelta[];
  endingStyle?: EndingStyle;
}

export interface CoverageRule {
  conceptId: string;
  lessonId: string;
  requiredNodeIds: string[];
}

export interface AvatarLessonMeta {
  title: string;
  subtitle?: string;
  audience?: string;
  difficulty?: string;
  estimatedMinutes?: number;
  sourceSummary?: string;
  authorNote?: string;
}

export interface AvatarLessonData {
  schemaVersion: SchemaVersion;
  meta: AvatarLessonMeta;
  characters: Character[];
  lessons: MiniLesson[];
  scenario: {
    startNode: string;
    nodes: Record<string, ScenarioNode>;
    coverageRules: CoverageRule[];
  };
  /** Optional custom voice profiles bundled with the lesson. */
  customVoiceProfiles?: CustomVoiceProfile[];
}

/* =========================================================================
 * SECTION 2 — VOICE CATALOG (Microsoft Online Natural identifiers)
 * ========================================================================= */

export const VOICE_PRESETS: VoicePreset[] = [
  // United Kingdom
  { id: "sonia", locale: "en-GB", regionKey: "kingdom", regionLabel: "United Kingdom", displayName: "Sonia", emoji: "🧝‍♀️", gender: "female", tone: "Online Natural", azureVoice: "en-GB-SoniaNeural", fallbackLang: "en-GB" },
  { id: "ryan", locale: "en-GB", regionKey: "kingdom", regionLabel: "United Kingdom", displayName: "Ryan", emoji: "🧙‍♂️", gender: "male", tone: "Online Natural", azureVoice: "en-GB-RyanNeural", fallbackLang: "en-GB" },
  { id: "libby", locale: "en-GB", regionKey: "kingdom", regionLabel: "United Kingdom", displayName: "Libby", emoji: "👩‍⚕️", gender: "female", tone: "Neural alternative", azureVoice: "en-GB-LibbyNeural", fallbackLang: "en-GB" },
  { id: "oliver", locale: "en-GB", regionKey: "kingdom", regionLabel: "United Kingdom", displayName: "Oliver", emoji: "👨‍⚕️", gender: "male", tone: "Neural alternative", azureVoice: "en-GB-OliverNeural", fallbackLang: "en-GB" },
  { id: "maisie", locale: "en-GB", regionKey: "kingdom", regionLabel: "United Kingdom", displayName: "Maisie", emoji: "🧒", gender: "female", tone: "Child / Youth", azureVoice: "en-GB-MaisieNeural", fallbackLang: "en-GB", childTimbre: true },
  // Australia
  { id: "natasha", locale: "en-AU", regionKey: "australia", regionLabel: "Australia", displayName: "Natasha", emoji: "👩‍🌾", gender: "female", tone: "Online Natural", azureVoice: "en-AU-NatashaNeural", fallbackLang: "en-AU" },
  { id: "william", locale: "en-AU", regionKey: "australia", regionLabel: "Australia", displayName: "William", emoji: "👨‍🌾", gender: "male", tone: "Online Natural", azureVoice: "en-AU-WilliamNeural", fallbackLang: "en-AU" },
  { id: "annette", locale: "en-AU", regionKey: "australia", regionLabel: "Australia", displayName: "Annette", emoji: "🧜‍♀️", gender: "female", tone: "Neural alternative", azureVoice: "en-AU-AnnetteNeural", fallbackLang: "en-AU" },
  { id: "darren", locale: "en-AU", regionKey: "australia", regionLabel: "Australia", displayName: "Darren", emoji: "🧜‍♂️", gender: "male", tone: "Neural alternative", azureVoice: "en-AU-DarrenNeural", fallbackLang: "en-AU" },
  // Canada
  { id: "clara", locale: "en-CA", regionKey: "canada", regionLabel: "Canada", displayName: "Clara", emoji: "👩‍🚀", gender: "female", tone: "Online Natural", azureVoice: "en-CA-ClaraNeural", fallbackLang: "en-CA" },
  { id: "liam", locale: "en-CA", regionKey: "canada", regionLabel: "Canada", displayName: "Liam", emoji: "👨‍🚀", gender: "male", tone: "Online Natural", azureVoice: "en-CA-LiamNeural", fallbackLang: "en-CA" },
  // United States
  { id: "aria", locale: "en-US", regionKey: "steam", regionLabel: "United States", displayName: "Aria", emoji: "🧚‍♀️", gender: "female", tone: "Online Natural", azureVoice: "en-US-AriaNeural", fallbackLang: "en-US" },
  { id: "jenny", locale: "en-US", regionKey: "steam", regionLabel: "United States", displayName: "Jenny", emoji: "🦸‍♀️", gender: "female", tone: "Online Natural", azureVoice: "en-US-JennyNeural", fallbackLang: "en-US" },
  { id: "guy", locale: "en-US", regionKey: "steam", regionLabel: "United States", displayName: "Guy", emoji: "🦸‍♂️", gender: "male", tone: "Online Natural", azureVoice: "en-US-GuyNeural", fallbackLang: "en-US" },
  { id: "andrew", locale: "en-US", regionKey: "steam", regionLabel: "United States", displayName: "Andrew", emoji: "🕵️‍♂️", gender: "male", tone: "HD Natural", azureVoice: "en-US-AndrewMultilingualNeural", fallbackLang: "en-US" },
  { id: "ava", locale: "en-US", regionKey: "steam", regionLabel: "United States", displayName: "Ava", emoji: "🧛‍♀️", gender: "female", tone: "HD Natural", azureVoice: "en-US-AvaMultilingualNeural", fallbackLang: "en-US" },
  { id: "ana", locale: "en-US", regionKey: "steam", regionLabel: "United States", displayName: "Ana", emoji: "👧", gender: "female", tone: "Child", azureVoice: "en-US-AnaNeural", fallbackLang: "en-US", childTimbre: true },
  { id: "christopher", locale: "en-US", regionKey: "steam", regionLabel: "United States", displayName: "Christopher", emoji: "🧞‍♂️", gender: "male", tone: "Neural alternative", azureVoice: "en-US-ChristopherNeural", fallbackLang: "en-US" },
  { id: "eric", locale: "en-US", regionKey: "steam", regionLabel: "United States", displayName: "Eric", emoji: "👨‍💻", gender: "male", tone: "Neural alternative", azureVoice: "en-US-EricNeural", fallbackLang: "en-US" },
  { id: "steffan", locale: "en-US", regionKey: "steam", regionLabel: "United States", displayName: "Steffan", emoji: "🥷", gender: "male", tone: "Neural alternative", azureVoice: "en-US-SteffanNeural", fallbackLang: "en-US" },
  // India
  { id: "neerja", locale: "en-IN", regionKey: "india", regionLabel: "India", displayName: "Neerja", emoji: "👩‍🎓", gender: "female", tone: "Warm", azureVoice: "en-IN-NeerjaNeural", fallbackLang: "en-IN" },
  { id: "prabhat", locale: "en-IN", regionKey: "india", regionLabel: "India", displayName: "Prabhat", emoji: "👨‍🎓", gender: "male", tone: "Warm", azureVoice: "en-IN-PrabhatNeural", fallbackLang: "en-IN" },
  // Ireland
  { id: "emily", locale: "en-IE", regionKey: "ireland", regionLabel: "Ireland", displayName: "Emily", emoji: "🧝‍♀️", gender: "female", tone: "Bright", azureVoice: "en-IE-EmilyNeural", fallbackLang: "en-IE" },
  { id: "connor", locale: "en-IE", regionKey: "ireland", regionLabel: "Ireland", displayName: "Connor", emoji: "🧝‍♂️", gender: "male", tone: "Bright", azureVoice: "en-IE-ConnorNeural", fallbackLang: "en-IE" },
  // New Zealand
  { id: "yolanda", locale: "en-NZ", regionKey: "newzealand", regionLabel: "New Zealand", displayName: "Yolanda", emoji: "🏄‍♀️", gender: "female", tone: "Clear", azureVoice: "en-NZ-MollyNeural", fallbackLang: "en-NZ" },
  { id: "mitchell", locale: "en-NZ", regionKey: "newzealand", regionLabel: "New Zealand", displayName: "Mitchell", emoji: "🏄‍♂️", gender: "male", tone: "Clear", azureVoice: "en-NZ-MitchellNeural", fallbackLang: "en-NZ" },
  // South Africa
  { id: "leah", locale: "en-ZA", regionKey: "southafrica", regionLabel: "South Africa", displayName: "Leah", emoji: "🧕", gender: "female", tone: "Calm", azureVoice: "en-ZA-LeahNeural", fallbackLang: "en-ZA" },
  { id: "luke", locale: "en-ZA", regionKey: "southafrica", regionLabel: "South Africa", displayName: "Luke", emoji: "👳‍♂️", gender: "male", tone: "Calm", azureVoice: "en-ZA-LukeNeural", fallbackLang: "en-ZA" },
  // Hong Kong
  { id: "yan", locale: "en-HK", regionKey: "hongkong", regionLabel: "Hong Kong", displayName: "Yan", emoji: "👩‍💼", gender: "female", tone: "Professional", azureVoice: "en-HK-YanNeural", fallbackLang: "en-HK" },
  { id: "sam", locale: "en-HK", regionKey: "hongkong", regionLabel: "Hong Kong", displayName: "Sam", emoji: "👨‍💼", gender: "male", tone: "Professional", azureVoice: "en-HK-SamNeural", fallbackLang: "en-HK" },
  // Singapore
  { id: "luna", locale: "en-SG", regionKey: "singapore", regionLabel: "Singapore", displayName: "Luna", emoji: "👩‍🍳", gender: "female", tone: "Bright", azureVoice: "en-SG-LunaNeural", fallbackLang: "en-SG" },
  { id: "wayne", locale: "en-SG", regionKey: "singapore", regionLabel: "Singapore", displayName: "Wayne", emoji: "👨‍🍳", gender: "male", tone: "Bright", azureVoice: "en-SG-WayneNeural", fallbackLang: "en-SG" },
  // Philippines
  { id: "rosa", locale: "en-PH", regionKey: "philippines", regionLabel: "Philippines", displayName: "Rosa", emoji: "👩‍🔬", gender: "female", tone: "Curious", azureVoice: "en-PH-RosaNeural", fallbackLang: "en-PH" },
  { id: "james", locale: "en-PH", regionKey: "philippines", regionLabel: "Philippines", displayName: "James", emoji: "👨‍🔬", gender: "male", tone: "Curious", azureVoice: "en-PH-JamesNeural", fallbackLang: "en-PH" },
  // Nigeria
  { id: "ezinne", locale: "en-NG", regionKey: "nigeria", regionLabel: "Nigeria", displayName: "Ezinne", emoji: "🧞‍♀️", gender: "female", tone: "Expressive", azureVoice: "en-NG-EzinneNeural", fallbackLang: "en-NG" },
  { id: "abeo", locale: "en-NG", regionKey: "nigeria", regionLabel: "Nigeria", displayName: "Abeo", emoji: "🧞‍♂️", gender: "male", tone: "Expressive", azureVoice: "en-NG-AbeoNeural", fallbackLang: "en-NG" },
  // Kenya
  { id: "asmani", locale: "en-KE", regionKey: "kenya", regionLabel: "Kenya", displayName: "Asmani", emoji: "🦹‍♀️", gender: "female", tone: "Confident", azureVoice: "en-KE-AsiliaNeural", fallbackLang: "en-KE" },
  { id: "chilemba", locale: "en-KE", regionKey: "kenya", regionLabel: "Kenya", displayName: "Chilemba", emoji: "🦹‍♂️", gender: "male", tone: "Confident", azureVoice: "en-KE-ChilembaNeural", fallbackLang: "en-KE" },
  // Ghana
  { id: "afia", locale: "en-GH", regionKey: "ghana", regionLabel: "Ghana", displayName: "Afia", emoji: "👸", gender: "female", tone: "Warm", azureVoice: "en-GH-AfiaNeural", fallbackLang: "en-GH" },
  { id: "ekow", locale: "en-GH", regionKey: "ghana", regionLabel: "Ghana", displayName: "Ekow", emoji: "🤴", gender: "male", tone: "Warm", azureVoice: "en-GH-EkowNeural", fallbackLang: "en-GH" },
  // Tanzania
  { id: "imani", locale: "en-TZ", regionKey: "tanzania", regionLabel: "Tanzania", displayName: "Imani", emoji: "👩‍🎤", gender: "female", tone: "Musical", azureVoice: "en-TZ-ImaniNeural", fallbackLang: "en-TZ" },
  { id: "elimu", locale: "en-TZ", regionKey: "tanzania", regionLabel: "Tanzania", displayName: "Elimu", emoji: "👨‍🎤", gender: "male", tone: "Musical", azureVoice: "en-TZ-ElimuNeural", fallbackLang: "en-TZ" },
];

export const VOICE_REGIONS: { key: string; label: string; flag: string }[] = [
  { key: "kingdom", label: "United Kingdom", flag: "🇬🇧" },
  { key: "australia", label: "Australia", flag: "🇦🇺" },
  { key: "canada", label: "Canada", flag: "🇨🇦" },
  { key: "steam", label: "United States", flag: "🇺🇸" },
  { key: "india", label: "India", flag: "🇮🇳" },
  { key: "ireland", label: "Ireland", flag: "🇮🇪" },
  { key: "newzealand", label: "New Zealand", flag: "🇳🇿" },
  { key: "southafrica", label: "South Africa", flag: "🇿🇦" },
  { key: "hongkong", label: "Hong Kong", flag: "🇭🇰" },
  { key: "singapore", label: "Singapore", flag: "🇸🇬" },
  { key: "philippines", label: "Philippines", flag: "🇵🇭" },
  { key: "nigeria", label: "Nigeria", flag: "🇳🇬" },
  { key: "kenya", label: "Kenya", flag: "🇰🇪" },
  { key: "ghana", label: "Ghana", flag: "🇬🇭" },
  { key: "tanzania", label: "Tanzania", flag: "🇹🇿" },
];

export const CALLOUT_META: Record<CalloutType, { label: string; icon: string; hue: number }> = {
  didYouKnow: { label: "Did you know?", icon: "✨", hue: 268 },
  qa: { label: "Q&A", icon: "❓", hue: 208 },
  fyi: { label: "FYI", icon: "🧭", hue: 196 },
  grammarStyle: { label: "Grammar & Style", icon: "✍️", hue: 24 },
  vocabulary: { label: "Vocabulary & Diction", icon: "🗣️", hue: 152 },
  cultural: { label: "Cultural Point", icon: "🌍", hue: 132 },
  civic: { label: "Civic", icon: "🏛️", hue: 244 },
  lifeSkills: { label: "Life Skills", icon: "🧩", hue: 44 },
  criticalThinking: { label: "Critical Thinking", icon: "🧠", hue: 288 },
  transferableSkills: { label: "Transferable Skills", icon: "🔁", hue: 176 },
  softSkills: { label: "Soft Skills", icon: "🤝", hue: 16 },
  pronunciation: { label: "Pronunciation", icon: "🔊", hue: 312 },
  strategyTips: { label: "Strategy Tip", icon: "🛠️", hue: 96 },
  communication: { label: "Communication Skill", icon: "💬", hue: 228 },
  fluency: { label: "Speaking Fluently", icon: "🚀", hue: 340 },
  custom: { label: "Insight", icon: "💡", hue: 72 },
};

/* =========================================================================
 * SECTION 3 — PURE UTILITIES (shared by authoring tool and emitted runtime)
 * ========================================================================= */

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/** Escapes text for safe HTML injection. Used everywhere user data lands. */
export const escapeHtml = (value: string): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/** Strips TTS-hostile symbols so spoken lines never read punctuation aloud. */
export const cleanForSpeech = (value: string): string =>
  String(value)
    .replace(/[*_#|~{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const flagsSatisfied = (
  required: FlagMap | undefined,
  flags: FlagMap
): boolean => {
  if (!required) return true;
  return Object.entries(required).every(([key, value]) => flags[key] === value);
};

export const mergeFlags = (current: FlagMap, incoming?: FlagMap): FlagMap => ({
  ...current,
  ...(incoming || {}),
});

/* =========================================================================
 * SECTION 4 — VALIDATION (graph integrity + coverage enforcement)
 * ========================================================================= */

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  reachableNodeIds: string[];
  uncoveredConcepts: string[];
}

export const validateLessonData = (data: AvatarLessonData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    return { errors: ["Root is not an object."], warnings: [], reachableNodeIds: [], uncoveredConcepts: [] };
  }
  if (data.schemaVersion !== "1.0") {
    errors.push(`Unsupported schemaVersion: ${String(data.schemaVersion)}. Expected "1.0".`);
  }
  if (!data.meta?.title) warnings.push("meta.title is empty.");
  if (!Array.isArray(data.characters) || data.characters.length === 0) {
    errors.push("At least one character is required.");
  }
  if (!Array.isArray(data.lessons) || data.lessons.length === 0) {
    errors.push("At least one lesson is required.");
  }
  if (!data.scenario || typeof data.scenario !== "object") {
    errors.push("scenario object is missing.");
    return { errors, warnings, reachableNodeIds: [], uncoveredConcepts: [] };
  }

  const characterIds = new Set((data.characters || []).map((c) => c.id));
  (data.characters || []).forEach((character) => {
    const preset = VOICE_PRESETS.find((p) => p.id === character.voicePresetId);
    const custom = (data.customVoiceProfiles || []).find((p) => p.id === character.voicePresetId);
    if (!preset && !custom && !character.customVoiceName) {
      warnings.push(`Character ${character.id} has no resolvable voice preset (${character.voicePresetId}).`);
    }
  });

  const nodes = data.scenario.nodes || {};
  const nodeIds = new Set(Object.keys(nodes));

  if (!nodeIds.has(data.scenario.startNode)) {
    errors.push(`startNode "${data.scenario.startNode}" does not exist.`);
  }

  Object.values(nodes).forEach((node) => {
    const hasChoices = Array.isArray(node.choices) && node.choices.length > 0;
    const hasNext = Boolean(node.next);
    if (node.type !== "ending" && !hasChoices && !hasNext) {
      errors.push(`Node "${node.id}" is a dead end (no choices, no next, not an ending).`);
    }
    if (node.next && !nodeIds.has(node.next)) {
      errors.push(`Node "${node.id}".next points to missing node "${node.next}".`);
    }
    (node.choices || []).forEach((choice) => {
      if (!nodeIds.has(choice.goto)) {
        errors.push(`Choice "${choice.id}" in node "${node.id}" points to missing node "${choice.goto}".`);
      }
    });
    (node.lines || []).forEach((line) => {
      if (!characterIds.has(line.speakerId)) {
        errors.push(`Node "${node.id}" line "${line.id}" references unknown speaker "${line.speakerId}".`);
      }
    });
    (node.affinity || []).forEach((delta) => {
      if (!characterIds.has(delta.characterId)) {
        warnings.push(`Node "${node.id}" affinity references unknown character "${delta.characterId}".`);
      }
    });
  });

  // Reachability from startNode.
  const reachable = new Set<string>();
  const stack = [data.scenario.startNode];
  while (stack.length) {
    const id = stack.pop() as string;
    if (reachable.has(id) || !nodeIds.has(id)) continue;
    reachable.add(id);
    const node = nodes[id];
    (node.choices || []).forEach((c) => stack.push(c.goto));
    if (node.next) stack.push(node.next);
  }
  nodeIds.forEach((id) => {
    if (!reachable.has(id)) warnings.push(`Node "${id}" is unreachable from startNode.`);
  });

  // Lesson dialogue speaker checks.
  (data.lessons || []).forEach((lesson) => {
    if (!lesson.conceptIds || lesson.conceptIds.length === 0) {
      warnings.push(`Lesson "${lesson.id}" has no conceptIds.`);
    }
    const hasStructured = (lesson.blocks || []).some((b) => b.type === "table" || b.type === "list" || b.type === "orderedList");
    if (!hasStructured) warnings.push(`Lesson "${lesson.id}" has no table or list block.`);
    (lesson.dialogue || []).forEach((line) => {
      if (!characterIds.has(line.speakerId)) {
        errors.push(`Lesson "${lesson.id}" dialogue references unknown speaker "${line.speakerId}".`);
      }
    });
  });

  // Coverage: every concept reinforced by at least one reachable node.
  const reinforcedConcepts = new Set<string>();
  Object.values(nodes).forEach((node) => {
    if (reachable.has(node.id)) (node.reinforces || []).forEach((c) => reinforcedConcepts.add(c));
  });
  const allConcepts = new Set((data.lessons || []).flatMap((l) => l.conceptIds || []));
  const uncoveredConcepts = [...allConcepts].filter((c) => !reinforcedConcepts.has(c));
  uncoveredConcepts.forEach((concept) => {
    warnings.push(`Concept "${concept}" is never reinforced by a reachable scenario node.`);
  });

  return {
    errors,
    warnings,
    reachableNodeIds: [...reachable],
    uncoveredConcepts,
  };
};

/* =========================================================================
 * SECTION 5 — VOICE RESOLUTION (shared logic, mirrored in emitted runtime)
 * ========================================================================= */

export const getVoiceGender = (voiceName: string): "female" | "male" | "neutral" => {
  const name = voiceName.toLowerCase();
  const femaleNames = [
    "female", "woman", "girl", "lady", "zira", "hazel", "samantha", "karen", "moira", "tessa", 
    "fiona", "veena", "victoria", "susan", "heera", "jessica", "linda", "sharon", "amanda", 
    "tracy", "lisa", "emily", "sonia", "libby", "maisie", "natasha", "annette", "clara", 
    "aria", "jenny", "ava", "ana", "neerja", "yolanda", "leah", "yan", "luna", "rosa", 
    "ezinne", "asmani", "martha", "zuzana", "anna", "helena", "zari", "elsa", "katia"
  ];
  const maleNames = [
    "male", "man", "boy", "gentleman", "david", "george", "sean", "ravi", "rishi", "alex", 
    "fred", "ryan", "oliver", "william", "darren", "liam", "guy", "andrew", "christopher", 
    "eric", "steffan", "prabhat", "connor", "mitchell", "luke", "sam", "wayne", "james", 
    "abeo", "chilemba", "tom", "george", "joshua", "marcus", "stefan"
  ];
  if (femaleNames.some(f => name.includes(f))) return "female";
  if (maleNames.some(m => name.includes(m))) return "male";
  return "neutral";
};

export const resolveVoice = (
  character: Character,
  voices: SpeechSynthesisVoice[],
  data: AvatarLessonData
): SpeechSynthesisVoice | undefined => {
  const preset = VOICE_PRESETS.find((p) => p.id === character.voicePresetId);
  const custom = (data.customVoiceProfiles || []).find((p) => p.id === character.voicePresetId);
  const desiredName = character.customVoiceName || custom?.voiceName || preset?.azureVoice;
  const lang = custom?.lang || preset?.fallbackLang || "en-US";

  // 1. Exact voice name match (Microsoft Online Natural when in Edge).
  if (desiredName) {
    const exact = voices.find((v) => v.name === desiredName);
    if (exact) return exact;
    const stripped = desiredName.replace(/Neural$/i, "").toLowerCase();
    const partial = voices.find((v) => v.name.replace(/\s/g, "").toLowerCase().includes(stripped));
    if (partial) return partial;
  }

  // 2. Preset display name/id smart match (very robust for matching MS Natural names like Natasha/Sonia to browser voices)
  if (preset) {
    const dispName = preset.displayName.toLowerCase();
    const presetId = preset.id.toLowerCase();

    // 2a. Match exact locale
    const exactLangMatch = voices.find((v) => {
      const vNameLower = v.name.toLowerCase();
      const isExactLang = v.lang.toLowerCase() === preset.locale.toLowerCase();
      return isExactLang && (vNameLower.includes(dispName) || vNameLower.includes(presetId));
    });
    if (exactLangMatch) return exactLangMatch;

    // 2b. Match language family
    const familyLangMatch = voices.find((v) => {
      const vNameLower = v.name.toLowerCase();
      const isFamilyLang = v.lang.toLowerCase().startsWith(preset.locale.toLowerCase().slice(0, 2));
      return isFamilyLang && (vNameLower.includes(dispName) || vNameLower.includes(presetId));
    });
    if (familyLangMatch) return familyLangMatch;
  }

  // 3. Same lang family + matched gender heuristic.
  const byLangGender = voices.find((v) => {
    const langOk = v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2));
    if (!langOk) return false;
    if (character.gender === "neutral") return true;
    const vGender = getVoiceGender(v.name);
    return vGender === character.gender || vGender === "neutral";
  });
  if (byLangGender) return byLangGender;

  // 4. Any voice of same base language.
  const byLang = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)));
  if (byLang) return byLang;

  // 5. First available voice (never fail silently).
  return voices[0];
};

/* =========================================================================
 * SECTION 6 — STANDALONE HTML GENERATION
 * The heart of the tool: emits a complete, dependency-free .html document
 * with an inlined vanilla-JS runtime + the lesson JSON embedded inline.
 * ========================================================================= */

const RUNTIME_CSS = String.raw`
:root{
  color-scheme: light dark;
  --font-main: "Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  
  --bg: oklch(98% 0.005 260);
  --bg-subtle: oklch(95% 0.008 260);
  --panel: oklch(100% 0 0);
  --panel-alt: oklch(96.5% 0.007 260);
  --ink: oklch(20% 0.02 260);
  --ink-muted: oklch(46% 0.015 260);
  --ink-subtle: oklch(62% 0.01 260);
  --line: oklch(89% 0.01 260);
  --line-strong: oklch(82% 0.015 260);
  
  --primary: oklch(58% 0.22 264);
  --primary-hover: oklch(52% 0.24 264);
  --primary-soft: oklch(94% 0.05 264);
  --primary-border: oklch(82% 0.1 264);
  
  --ok: oklch(62% 0.17 152);
  --ok-soft: oklch(94% 0.06 152);
  --warn: oklch(74% 0.16 68);
  --warn-soft: oklch(95% 0.06 68);
  --danger: oklch(60% 0.22 25);
  --danger-soft: oklch(94% 0.06 25);
  
  --shadow-sm: 0 2px 8px rgba(26,22,46,.04);
  --shadow-md: 0 10px 30px rgba(26,22,46,.06);
  --shadow-lg: 0 20px 50px rgba(26,22,46,.10);
  
  --r-xl: 24px;
  --r-lg: 18px;
  --r-md: 14px;
  --r-sm: 10px;
  --r-full: 9999px;
  
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 32px; --s7: 48px;
  --ease: cubic-bezier(.16, 1, .3, 1);
}

[data-theme="dark"]{
  --bg: oklch(14% 0.015 260);
  --bg-subtle: oklch(18% 0.02 260);
  --panel: oklch(19% 0.022 260);
  --panel-alt: oklch(24% 0.024 260);
  --ink: oklch(95% 0.01 260);
  --ink-muted: oklch(72% 0.015 260);
  --ink-subtle: oklch(54% 0.012 260);
  --line: oklch(28% 0.02 260);
  --line-strong: oklch(35% 0.025 260);
  
  --primary: oklch(68% 0.2 264);
  --primary-hover: oklch(74% 0.22 264);
  --primary-soft: oklch(26% 0.06 264);
  --primary-border: oklch(40% 0.1 264);
  
  --ok: oklch(70% 0.17 152);
  --ok-soft: oklch(24% 0.06 152);
  --warn: oklch(78% 0.16 68);
  --warn-soft: oklch(26% 0.06 68);
  --danger: oklch(68% 0.22 25);
  --danger-soft: oklch(26% 0.06 25);
  
  --shadow-sm: 0 2px 8px rgba(0,0,0,.3);
  --shadow-md: 0 10px 30px rgba(0,0,0,.45);
  --shadow-lg: 0 20px 50px rgba(0,0,0,.6);
}

*{box-sizing:border-box}
html,body{min-height:100%}
body{
  margin:0;
  font-family:var(--font-main);
  background:
    radial-gradient(circle at 10% 0%, oklch(92% 0.04 264 / .35), transparent 40%),
    radial-gradient(circle at 90% 0%, oklch(92% 0.035 152 / .3), transparent 35%),
    var(--bg);
  color:var(--ink);
  font-size:16px;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
}

[data-theme="dark"] body{
  background:
    radial-gradient(circle at 10% 0%, oklch(24% 0.06 264 / .4), transparent 40%),
    radial-gradient(circle at 90% 0%, oklch(22% 0.05 152 / .35), transparent 35%),
    var(--bg);
}

h1,h2,h3,h4{font-weight:700;line-height:1.25;margin:0;letter-spacing:-0.02em}
p{margin:0 0 var(--s3);text-wrap:pretty}
p:last-child{margin-bottom:0}
button,select,input,textarea{font:inherit;color:inherit}

/* ---- Sticky Header Navigation ---- */
.nav-header{
  position:sticky;top:0;z-index:100;
  background:color-mix(in oklab, var(--panel) 84%, transparent);
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border-bottom:1px solid var(--line);
  padding:var(--s3) var(--s5);
  display:flex;align-items:center;justify-content:space-between;gap:var(--s4);
}
.brand-group{display:flex;align-items:center;gap:var(--s3);min-width:0}
.brand-badge{
  display:inline-flex;align-items:center;gap:6px;
  background:var(--primary-soft);color:var(--primary);
  border:1px solid var(--primary-border);
  padding:4px 10px;border-radius:var(--r-full);font-size:0.75rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;
  flex-shrink:0;
}
.nav-title{font-size:1.1rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}
.nav-subtitle{font-size:0.78rem;color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}

.header-progress{
  display:flex;align-items:center;gap:var(--s3);flex:1;max-width:400px;margin:0 var(--s3);
}
.progress-bar-wrap{
  flex:1;height:8px;background:var(--bg-subtle);border-radius:var(--r-full);overflow:hidden;border:1px solid var(--line);
}
.progress-bar-fill{
  height:100%;width:0%;background:linear-gradient(90deg, var(--primary), oklch(68% 0.18 190));
  border-radius:var(--r-full);transition:width .4s var(--ease);
}
.progress-stats{font-size:0.8rem;font-weight:600;color:var(--ink-muted);white-space:nowrap}

.header-actions{display:flex;align-items:center;gap:var(--s2);flex-shrink:0}
.icon-btn{
  width:38px;height:38px;border-radius:var(--r-md);border:1px solid var(--line);
  background:var(--panel);color:var(--ink);cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;
  font-size:1.05rem;transition:all .18s var(--ease);
}
.icon-btn:hover{background:var(--panel-alt);border-color:var(--line-strong);transform:translateY(-1px)}
.icon-btn:active{transform:translateY(0)}

/* ---- Linear Ribbon Nav ---- */
.step-ribbon{
  background:var(--panel);border-bottom:1px solid var(--line);
  padding:var(--s2) var(--s5);display:flex;align-items:center;justify-content:space-between;
  gap:var(--s3);overflow-x:auto;scrollbar-width:none;
}
.step-ribbon::-webkit-scrollbar{display:none}
.step-ribbon-left{display:flex;align-items:center;gap:var(--s2);flex-shrink:0}
.step-pills{display:flex;align-items:center;gap:6px;overflow-x:auto;padding:2px 0}
.step-pill{
  display:inline-flex;align-items:center;gap:6px;
  padding:6px 14px;border-radius:var(--r-full);border:1px solid var(--line);
  background:var(--panel-alt);color:var(--ink-muted);font-size:0.8rem;font-weight:600;
  cursor:pointer;white-space:nowrap;transition:all .16s var(--ease);
}
.step-pill:hover{background:var(--panel);border-color:var(--line-strong);color:var(--ink)}
.step-pill.active{background:var(--primary);color:white;border-color:transparent;box-shadow:0 2px 10px var(--primary-soft)}
.step-pill.done{border-color:var(--ok);color:var(--ok)}
.step-pill.done.active{background:var(--ok);color:white}

/* ---- Super Minimal Single-Component Main Stage ---- */
.stage-wrap{
  width:100%;max-width:920px;margin:0 auto;
  padding:var(--s6) var(--s4) var(--s7);
  display:grid;gap:var(--s5);
}

.stage-card{
  background:var(--panel);border:1px solid var(--line);
  border-radius:var(--r-xl);box-shadow:var(--shadow-md);
  padding:var(--s6);display:grid;gap:var(--s5);
  transition:all .25s var(--ease);
  position:relative;overflow:hidden;
}

/* ---- Much Bigger 3D Emoji Talking Avatar Podium ---- */
.avatar-podium{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:12px;margin:0 0 var(--s3);text-align:center;
}
.avatar{
  width:145px;height:145px;display:grid;place-items:center;
  border-radius:44px;font-size:5.6rem;flex-shrink:0;user-select:none;
  background:
    radial-gradient(circle at 30% 20%, rgba(255,255,255,.98), transparent 28%),
    radial-gradient(circle at 50% 75%, color-mix(in oklab, var(--primary-soft) 85%, transparent), transparent 70%),
    linear-gradient(145deg, color-mix(in oklab, var(--primary) 24%, var(--panel)), color-mix(in oklab, var(--primary) 46%, var(--panel)));
  transform:perspective(600px) rotateY(-8deg) rotateX(4deg);
  box-shadow:0 22px 44px rgba(0,0,0,.15), inset 0 -8px 18px rgba(255,255,255,.55), inset 0 6px 14px rgba(255,255,255,.45);
  border:2px solid color-mix(in oklab, var(--primary) 35%, rgba(255,255,255,.4));
  transition:transform .3s var(--ease), box-shadow .3s var(--ease);
}
.avatar:hover{
  transform:perspective(600px) rotateY(0deg) rotateX(0deg) scale(1.04);
}
.speaking .avatar, .avatar.speaking{
  animation:heroAvatarTalk 1.05s var(--ease) infinite;
  border-color:var(--primary);
  box-shadow:0 0 0 6px var(--primary-soft), 0 24px 48px rgba(0,0,0,.22);
}
@keyframes heroAvatarTalk{
  0%,100%{transform:perspective(600px) rotateY(-8deg) rotateX(4deg) scale(1)}
  25%{transform:perspective(600px) rotateY(4deg) rotateX(-3deg) scale(1.08)}
  50%{transform:perspective(600px) rotateY(-4deg) rotateX(2deg) scale(1.04)}
  75%{transform:perspective(600px) rotateY(6deg) rotateX(-2deg) scale(1.09)}
}

.avatar-caption{
  display:flex;flex-direction:column;align-items:center;gap:4px;
}
.avatar-name{font-size:1.15rem;font-weight:700;color:var(--ink)}
.avatar-role{font-size:0.82rem;font-weight:600;color:var(--ink-muted)}

/* Sound Effects & Reaction Toolbar */
.sound-reactions{
  display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;
  margin-top:2px;
}
.react-btn{
  min-height:34px;padding:0 12px;border-radius:var(--r-full);
  border:1px solid var(--line);background:var(--panel-alt);
  font-size:0.8rem;font-weight:600;cursor:pointer;
  display:inline-flex;align-items:center;gap:6px;transition:all .16s var(--ease);
}
.react-btn:hover{background:var(--primary-soft);border-color:var(--primary-border);color:var(--primary);transform:scale(1.04)}
.react-btn:active{transform:scale(0.96)}

/* Speech Banner / Bubble */
.speech-hero{
  background:linear-gradient(135deg, color-mix(in oklab, var(--primary-soft) 80%, var(--panel)), var(--panel));
  border:1px solid var(--primary-border);border-radius:var(--r-lg);
  padding:var(--s4) var(--s5);display:grid;gap:var(--s3);
  text-align:center;
}
.speech-hero p{font-size:1.08rem;font-weight:500;color:var(--ink);line-height:1.55;margin:0}

/* Concept Meta & Chips */
.concept-chips{display:flex;flex-wrap:wrap;gap:var(--s2);justify-content:center;margin-bottom:var(--s2)}
.chip{
  display:inline-flex;align-items:center;gap:6px;padding:5px 12px;
  border-radius:var(--r-full);border:1px solid var(--line);
  background:var(--panel-alt);font-size:0.8rem;font-weight:600;color:var(--ink);
}
.chip.accent{
  background:color-mix(in oklab, var(--accent, var(--primary)) 16%, var(--panel));
  border-color:color-mix(in oklab, var(--accent, var(--primary)) 40%, transparent);
  color:color-mix(in oklab, var(--accent, var(--primary)) 70%, var(--ink));
}

/* Pedagogical Blocks */
.blocks{display:grid;gap:var(--s4)}
.block{
  padding:var(--s5);border-radius:var(--r-lg);
  background:var(--panel-alt);border:1px solid var(--line);
  box-shadow:var(--shadow-sm);
}
.block h4{margin:0 0 var(--s3);font-size:1.15rem;color:var(--ink)}
.block ul,.block ol{margin:0;padding-left:24px;display:grid;gap:var(--s2)}
.block li{padding-left:4px}
.block li::marker{color:var(--primary);font-weight:700}

/* Tables */
.table-scroll{width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--r-md);border:1px solid var(--line);margin:var(--s2) 0}
table{width:100%;max-width:100%;min-width:0;border-collapse:collapse;font-size:0.92rem}
th,td{padding:12px 16px;text-align:left;border-bottom:1px solid var(--line);word-break:break-word}
thead th{
  background:color-mix(in oklab, var(--panel-alt) 80%, var(--line));color:var(--ink);font-weight:700;
  letter-spacing:0.02em;border-bottom:2px solid var(--line-strong);
}
tbody tr:nth-child(even){background:color-mix(in oklab, var(--panel-alt) 40%, var(--panel))}
tbody tr:last-child td{border-bottom:none}

/* Callouts */
.callout{
  padding:var(--s5);border-radius:var(--r-lg);
  border:1px solid color-mix(in oklab, var(--co) 38%, transparent);
  background:color-mix(in oklab, var(--co) 8%, var(--panel));
  position:relative;
  max-width:100%;min-width:0;word-break:break-word;
}
.callout .label{
  display:inline-flex;align-items:center;gap:8px;
  font-size:0.78rem;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;
  color:color-mix(in oklab, var(--co) 75%, var(--ink));margin-bottom:var(--s3);
}

blockquote{
  margin:0;padding:var(--s3) var(--s4);
  border-left:4px solid var(--primary);
  background:var(--primary-soft);border-radius:0 var(--r-md) var(--r-md) 0;
  color:var(--ink);font-style:italic;font-size:1.02rem;
  max-width:100%;min-width:0;word-break:break-word;
}
pre{
  margin:0;max-width:100%;overflow-x:auto;background:oklch(18% 0.02 260);color:oklch(94% 0.01 260);
  padding:var(--s4);border-radius:var(--r-md);font-family:var(--font-mono);font-size:0.88rem;line-height:1.5;
  white-space:pre-wrap;word-break:break-word;
}
.def-grid{display:grid;gap:var(--s3);margin:0;max-width:100%;min-width:0}
.def-grid dt{font-weight:700;color:var(--primary);font-size:0.98rem;word-break:break-word}
.def-grid dd{margin:2px 0 0 0;color:var(--ink-muted);font-size:0.92rem;word-break:break-word}

/* ---- Meet The Team (Cast Showcase) ---- */
.cast-showcase-wrap{
  display:grid;gap:var(--s4);
}
.cast-grid{
  display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--s4);
}
.cast-card{
  background:var(--panel);border:1.5px solid var(--line);
  border-radius:var(--r-lg);padding:var(--s4);display:flex;flex-direction:column;gap:var(--s3);
  box-shadow:var(--shadow-sm);transition:all .22s var(--ease);
}
.cast-card:hover{
  border-color:var(--primary);box-shadow:var(--shadow-md);transform:translateY(-2px);
}
.cast-header{
  display:flex;align-items:center;gap:14px;
}
.cast-emoji-box{
  width:64px;height:64px;border-radius:18px;background:var(--panel-alt);
  border:2px solid var(--line);display:flex;align-items:center;justify-content:center;
  font-size:2.4rem;box-shadow:0 8px 16px rgba(0,0,0,.08);flex-shrink:0;
}
.cast-meta{
  display:flex;flex-direction:column;gap:2px;
}
.cast-name{font-size:1.15rem;font-weight:700;color:var(--ink)}
.cast-role{font-size:0.85rem;color:var(--ink-muted);font-weight:600}
.cast-quote{
  font-size:0.95rem;line-height:1.5;color:var(--ink);background:var(--panel-alt);
  padding:10px 14px;border-radius:var(--r-md);border-left:3px solid var(--primary);
  font-style:italic;margin:0;
}

/* ---- Live Conversation Video Frame (Dialogue Stage) ---- */
.live-dialogue-video-frame{
  background:var(--panel);border:2px solid var(--line-strong);
  border-radius:var(--r-xl);overflow:hidden;box-shadow:0 16px 36px rgba(0,0,0,.1);
  display:flex;flex-direction:column;margin:12px 0;
}
.video-frame-top-bar{
  background:#0f172a;color:#ffffff;padding:12px 20px;
  display:flex;align-items:center;justify-content:space-between;gap:14px;
}
.live-indicator{
  display:inline-flex;align-items:center;gap:8px;font-size:14px;
  font-weight:700;letter-spacing:0.04em;color:#4ade80;
}
.live-dot{
  width:10px;height:10px;border-radius:50%;background:#ef4444;
  box-shadow:0 0 10px #ef4444;animation:liveDotBlink 1.2s infinite;
}
@keyframes liveDotBlink{
  0%,100%{opacity:1;transform:scale(1)}
  50%{opacity:0.35;transform:scale(0.85)}
}
.video-frame-controls{
  display:flex;align-items:center;gap:8px;
}
.video-ctrl-btn{
  background:rgba(255,255,255,0.15);color:#ffffff;
  border:1px solid rgba(255,255,255,0.2);padding:6px 14px;
  border-radius:var(--r-full);font-size:13px;font-weight:600;cursor:pointer;
  display:inline-flex;align-items:center;gap:6px;transition:all 0.2s ease;
}
.video-ctrl-btn:hover{background:rgba(255,255,255,0.28)}

.video-participants-podium{
  background:#1e293b;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.08);
  display:flex;flex-wrap:wrap;gap:12px;justify-content:center;
}
.video-participant-tile{
  background:#0f172a;border:2px solid rgba(255,255,255,0.12);
  border-radius:14px;padding:8px 14px;display:flex;align-items:center;gap:10px;
  color:#ffffff;transition:all 0.25s ease;position:relative;min-width:160px;
}
.video-participant-tile.is-active-speaker{
  border-color:var(--primary);background:#1e1b4b;
  box-shadow:0 0 20px color-mix(in oklab, var(--primary) 60%, transparent);
  transform:translateY(-2px) scale(1.03);
}
.video-participant-tile .speaker-wave{
  display:none;font-size:11px;font-weight:700;color:#4ade80;
  background:rgba(74,222,128,0.16);padding:2px 8px;border-radius:999px;border:1px solid #4ade80;
}
.video-participant-tile.is-active-speaker .speaker-wave{
  display:inline-flex;align-items:center;gap:4px;animation:liveDotBlink 1.4s infinite;
}

.dialogue-stream-wrap{
  padding:24px;display:flex;flex-direction:column;gap:16px;background:var(--panel-alt);
}
.dialogue-bubble-row{
  display:flex;align-items:flex-start;gap:14px;transition:all 0.2s ease;
  padding:4px;border-radius:16px;
}
.dialogue-bubble-row.speaking{
  background:color-mix(in oklab, var(--primary) 8%, transparent);
}
.dialogue-avatar-box{
  width:64px;height:64px;border-radius:18px;background:var(--panel);
  border:2px solid var(--line);display:flex;align-items:center;justify-content:center;
  font-size:2.4rem;box-shadow:0 4px 12px rgba(0,0,0,.08);flex-shrink:0;
  transition:transform .2s ease;
}
.dialogue-bubble-row.speaking .dialogue-avatar-box{
  border-color:var(--primary);
  box-shadow:0 0 16px color-mix(in oklab, var(--primary) 50%, transparent);
  transform:scale(1.08);
}
.dialogue-bubble-card{
  background:var(--panel);border:1.5px solid var(--line);border-radius:18px;
  border-top-left-radius:4px;padding:14px 18px;display:flex;flex-direction:column;
  gap:6px;box-shadow:var(--shadow-sm);max-width:720px;width:100%;
}
.dialogue-bubble-row.speaking .dialogue-bubble-card{
  border-color:var(--primary);box-shadow:var(--shadow-md);
}
.dialogue-card-header{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
}
.dialogue-speaker-name{font-size:1rem;font-weight:700;color:var(--primary)}
.dialogue-text-content{font-size:1.05rem;line-height:1.55;color:var(--ink);margin:0}

/* Buttons */
.btn{
  min-height:48px;padding:0 24px;border-radius:var(--r-md);
  border:1px solid var(--line);background:var(--panel);
  font-size:0.96rem;font-weight:600;color:var(--ink);
  cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;
  transition:all .18s var(--ease);
}
.btn:hover{background:var(--panel-alt);border-color:var(--line-strong);transform:translateY(-1px)}
.btn:active{transform:translateY(0)}
.btn.primary{
  background:var(--primary);color:white;border-color:transparent;
  box-shadow:0 4px 14px color-mix(in oklab, var(--primary) 40%, transparent);
}
.btn.primary:hover{background:var(--primary-hover);transform:translateY(-1px)}
.btn[disabled]{opacity:0.45;cursor:not-allowed;transform:none!important}

/* ---- Quick Check Cards ---- */
.quickcheck{
  padding:var(--s6);border-radius:var(--r-xl);
  background:var(--panel);border:1px solid var(--line);
  display:grid;gap:var(--s4);box-shadow:var(--shadow-md);
}
.quickcheck-header{display:flex;align-items:center;gap:8px;color:var(--primary);font-size:0.82rem;font-weight:700;text-transform:uppercase}
.quickcheck strong{font-size:1.2rem;color:var(--ink);line-height:1.5}
.options-grid{display:grid;gap:var(--s3);margin-top:var(--s2)}
.opt{
  width:100%;text-align:left;padding:14px 20px;border-radius:var(--r-lg);
  border:1px solid var(--line);background:var(--panel-alt);
  font-size:1rem;font-weight:500;color:var(--ink);cursor:pointer;
  transition:all .18s var(--ease);min-height:54px;display:flex;align-items:center;gap:12px;
}
.opt:hover{border-color:var(--primary-border);background:var(--primary-soft);transform:translateX(4px)}
.opt.correct{
  background:var(--ok-soft);border-color:var(--ok);color:color-mix(in oklab, var(--ok) 80%, var(--ink));
  font-weight:700;
}
.opt.wrong{
  background:var(--danger-soft);border-color:var(--danger);color:color-mix(in oklab, var(--danger) 80%, var(--ink));
}
.explain{
  padding:var(--s4) var(--s5);border-radius:var(--r-md);background:var(--panel-alt);
  border:1px solid var(--line);font-size:0.95rem;color:var(--ink-muted);line-height:1.6;
}

/* ---- Tactical Scenario Choice Buttons ---- */
.choices{display:grid;gap:var(--s3);margin-top:var(--s3)}
.choice{
  text-align:left;padding:16px 20px;border-radius:var(--r-lg);
  border:1px solid var(--line);background:var(--panel-alt);color:var(--ink);
  cursor:pointer;transition:all .18s var(--ease);display:grid;gap:4px;
}
.choice:hover{
  border-color:var(--primary);background:var(--primary-soft);
  transform:translateY(-2px);box-shadow:var(--shadow-sm);
}
.choice-label{font-weight:700;font-size:1.02rem;display:flex;align-items:center;gap:10px}
.choice-num{
  display:inline-flex;align-items:center;justify-content:center;
  width:26px;height:26px;border-radius:8px;background:var(--panel);
  border:1px solid var(--line);font-size:0.8rem;font-weight:700;color:var(--ink-muted);
}
.choice-hint{font-size:0.85rem;color:var(--ink-muted)}

/* Affinity HUD */
.affinity-hud{
  display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:var(--s2);
  margin-bottom:var(--s3);
}
.affinity-card{
  padding:10px 14px;border-radius:var(--r-md);
  background:var(--panel-alt);border:1px solid var(--line);
  display:grid;gap:6px;
}
.affinity-meta{display:flex;justify-content:space-between;font-size:0.8rem;font-weight:600;color:var(--ink)}
.affinity-bar{height:6px;border-radius:var(--r-full);background:var(--line);overflow:hidden}
.affinity-fill{
  height:100%;background:linear-gradient(90deg, var(--warn), var(--ok));
  border-radius:var(--r-full);transition:width .4s var(--ease);
}

/* Ending Card */
.ending-card{
  padding:var(--s6);border-radius:var(--r-xl);border:1px solid var(--line);
  display:grid;gap:var(--s4);
}
.ending-card.success{background:var(--ok-soft);border-color:var(--ok)}
.ending-card.tragic{background:var(--danger-soft);border-color:var(--danger)}
.ending-card.warning,.ending-card.bittersweet{background:var(--warn-soft);border-color:var(--warn)}

.recap-table{
  margin-top:var(--s3);border-radius:var(--r-md);overflow:hidden;border:1px solid var(--line);
}
.recap-row{
  display:flex;justify-content:space-between;padding:10px 16px;
  background:var(--panel);border-bottom:1px solid var(--line);font-size:0.92rem;
}
.recap-row:last-child{border-bottom:none}
.recap-row .badge-yes{color:var(--ok);font-weight:700}
.recap-row .badge-no{color:var(--danger);font-weight:700}

/* Step Navigation Footer Bar */
.stepper-footer{
  display:flex;align-items:center;justify-content:space-between;gap:var(--s3);
  padding-top:var(--s5);border-top:1px solid var(--line);margin-top:var(--s4);
  flex-wrap:wrap;
}

/* Dedicated Settings Dialog / Modal */
.dialog-backdrop{
  position:fixed;inset:0;background:rgba(12,10,24,.6);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  z-index:200;display:grid;place-items:center;padding:var(--s4);
  opacity:0;pointer-events:none;transition:opacity .25s var(--ease);
}
.dialog-backdrop.open{opacity:1;pointer-events:auto}
.dialog-modal{
  background:var(--panel);border:1px solid var(--line);
  border-radius:var(--r-xl);box-shadow:var(--shadow-lg);
  width:100%;max-width:580px;max-height:90vh;overflow-y:auto;
  padding:var(--s6);display:grid;gap:var(--s5);transform:scale(0.96);
  transition:transform .25s var(--ease);
}
.dialog-backdrop.open .dialog-modal{transform:scale(1)}

.modal-header{
  display:flex;align-items:center;justify-content:space-between;
  padding-bottom:var(--s3);border-bottom:1px solid var(--line);
}
.modal-header h3{font-size:1.3rem}

.settings-section{display:grid;gap:var(--s3)}
.settings-section-title{
  font-size:0.82rem;font-weight:700;text-transform:uppercase;
  letter-spacing:0.06em;color:var(--ink-muted);margin-bottom:2px;
}

.sliders-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:var(--s3)}
.slider-card{
  padding:var(--s3);border-radius:var(--r-md);background:var(--panel-alt);
  border:1px solid var(--line);display:grid;gap:6px;
}
.slider-card label{font-size:0.8rem;font-weight:600;color:var(--ink-muted);display:flex;justify-content:space-between}
.slider-card input[type=range]{width:100%;cursor:pointer;accent-color:var(--primary)}

.field-select{
  width:100%;min-height:44px;border-radius:var(--r-md);
  border:1px solid var(--line);background:var(--panel-alt);
  padding:8px 14px;color:var(--ink);outline:none;
}
.field-select:focus{border-color:var(--primary)}

.drop-zone{
  border:2px dashed var(--line-strong);border-radius:var(--r-lg);
  padding:var(--s5);text-align:center;color:var(--ink-muted);font-size:0.88rem;
  transition:all .18s var(--ease);cursor:pointer;
}
.drop-zone.hot{border-color:var(--primary);background:var(--primary-soft);color:var(--primary)}

/* Toast */
.toast{
  position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);
  background:var(--ink);color:var(--bg);padding:12px 24px;border-radius:var(--r-full);
  font-size:0.92rem;font-weight:600;box-shadow:var(--shadow-lg);
  opacity:0;pointer-events:none;transition:all .25s var(--ease);z-index:300;
}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}

/* ---- Responsive Adaptations ---- */
@media (max-width:768px){
  .nav-header{padding:var(--s3) var(--s4);flex-wrap:wrap}
  .header-progress{order:3;width:100%;max-width:none;margin:var(--s2) 0 0 0}
  .stage-wrap{padding:var(--s4) var(--s3) var(--s6)}
  .stage-card{padding:var(--s4)}
  .avatar{width:110px;height:110px;font-size:4.2rem;border-radius:32px}
  .bubble{grid-template-columns:1fr;text-align:center}
  .bubble .avatar{margin:0 auto;width:95px;height:95px;font-size:3.5rem}
  .bubble .who{justify-content:center}
  .bubble-actions{justify-content:center}
  .sliders-grid{grid-template-columns:1fr}
}
`;

/**
 * Emits the entire client runtime as a string. Everything the standalone
 * page needs at run time lives here. It reads the inline JSON, renders
 * lessons + scenario, and drives the Web Speech engine.
 */
const buildRuntimeScript = (): string => String.raw`
(function(){
  "use strict";
  ${VOICE_GROUP_RUNTIME_JS}
  var DATA = null;
  try { DATA = JSON.parse(document.getElementById("lesson-data").textContent); } catch(e){}

  var PRESETS = ${JSON.stringify(VOICE_PRESETS)};
  var CALLOUTS = ${JSON.stringify(CALLOUT_META)};
  var STORE_KEY = "avatar-lesson-runtime-v1-" + ((DATA && DATA.meta && DATA.meta.title) ? DATA.meta.title.replace(/[^a-zA-Z0-9]/g, "_") : "default");
  var VOICE_KEY = "avatar-lesson-custom-voices-v1";

  var state = {
    lessonId: null, nodeId: null, trail: [], flags: {}, affinity: {},
    done: {}, rate: 1, pitch: 1, volume: 1, autoAdvance: false, theme: null
  };
  var voices = [], activeUtterId = null, paused = false, customVoices = load(VOICE_KEY, {});

  function load(k,f){try{var v=localStorage.getItem(k);return v?JSON.parse(v):f;}catch(e){return f;}}
  function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(e){}}
  function saveVoices(){try{localStorage.setItem(VOICE_KEY,JSON.stringify(customVoices));}catch(e){}}
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
  function clean(s){return String(s==null?"":s).replace(/[*_#|~{}]/g," ").replace(/\s+/g," ").trim();}
  function clamp(v,a,b){return Math.min(b,Math.max(a,v));}
  function byId(id){return (DATA.characters||[]).filter(function(c){return c.id===id;})[0];}
  function preset(id){return PRESETS.filter(function(p){return p.id===id;})[0];}
  function toast(msg){
    var t=document.getElementById("toast");if(!t) return;
    t.textContent=msg;t.classList.add("show");
    setTimeout(function(){t.classList.remove("show");},2400);
  }

  /* ---- Modal Controls ---- */
  function openSettings(){
    var m=document.getElementById("settings-modal");
    if(m) m.classList.add("open");
  }
  function closeSettings(){
    var m=document.getElementById("settings-modal");
    if(m) m.classList.remove("open");
  }

  /* ---- Voice engine ---- */
  function loadVoices(){
    if(!("speechSynthesis" in window)) return;
    voices = window.speechSynthesis.getVoices();
    if(!voices.length){
      window.speechSynthesis.addEventListener("voiceschanged", function once(){
        voices = window.speechSynthesis.getVoices();
        window.speechSynthesis.removeEventListener("voiceschanged", once);
        renderVoiceControls();
      });
      setTimeout(function(){ voices = window.speechSynthesis.getVoices(); renderVoiceControls(); }, 1400);
    } else { renderVoiceControls(); }
  }

  /* Populate the Settings -> voice assignment dropdowns.
     Natural voices are grouped by accent + gender (British first, red),
     exactly like the app voice pickers, so tutors can find them easily. */
  function renderVoiceControls(){
    var charSel = document.getElementById("voice-char");
    if(charSel){
      charSel.innerHTML = "";
      (DATA.characters || []).forEach(function(c){
        var o = document.createElement("option");
        o.value = c.id;
        o.textContent = c.name + " (" + c.voicePresetId + ")";
        charSel.appendChild(o);
      });
    }
    var picker = document.getElementById("voice-picker");
    if(picker){
      if(window.__populateGroupedVoiceSelect){
        window.__populateGroupedVoiceSelect(picker, voices, null, false, "name");
      } else {
        picker.innerHTML = "";
        voices.forEach(function(v){
          var o = document.createElement("option");
          o.value = v.name;
          o.textContent = v.name + " (" + v.lang + ")";
          picker.appendChild(o);
        });
      }
    }
  }

  function getVoiceGender(name) {
    var n = name.toLowerCase();
    var femaleNames = [
      "female", "woman", "girl", "lady", "zira", "hazel", "samantha", "karen", "moira", "tessa", 
      "fiona", "veena", "victoria", "susan", "heera", "jessica", "linda", "sharon", "amanda", 
      "tracy", "lisa", "emily", "sonia", "libby", "maisie", "natasha", "annette", "clara", 
      "aria", "jenny", "ava", "ana", "neerja", "yolanda", "leah", "yan", "luna", "rosa", 
      "ezinne", "asmani", "martha", "zuzana", "anna", "helena", "zari", "elsa", "katia"
    ];
    var maleNames = [
      "male", "man", "boy", "gentleman", "david", "george", "sean", "ravi", "rishi", "alex", 
      "fred", "ryan", "oliver", "william", "darren", "liam", "guy", "andrew", "christopher", 
      "eric", "steffan", "prabhat", "connor", "mitchell", "luke", "sam", "wayne", "james", 
      "abeo", "chilemba", "tom", "joshua", "marcus", "stefan"
    ];
    for (var i = 0; i < femaleNames.length; i++) {
      if (n.indexOf(femaleNames[i]) > -1) return "female";
    }
    for (var j = 0; j < maleNames.length; j++) {
      if (n.indexOf(maleNames[j]) > -1) return "male";
    }
    return "neutral";
  }

  var VOICE_CONFIG_MAP = {
    ava: { names: ["Ava", "AvaMultilingualNeural", "Ava Online"], gender: "female", lang: "en-US" },
    jenny: { names: ["Jenny", "JennyNeural", "Jenny Online"], gender: "female", lang: "en-US" },
    guy: { names: ["Guy", "GuyNeural", "Guy Online"], gender: "male", lang: "en-US" },
    aria: { names: ["Aria", "AriaNeural", "Aria Online"], gender: "female", lang: "en-US" },
    andrew: { names: ["Andrew", "AndrewMultilingualNeural", "Andrew Online"], gender: "male", lang: "en-US" },
    christopher: { names: ["Christopher", "ChristopherNeural", "Christopher Online"], gender: "male", lang: "en-US" },
    eric: { names: ["Eric", "EricNeural", "Eric Online"], gender: "male", lang: "en-US" },
    steffan: { names: ["Steffan", "SteffanNeural"], gender: "male", lang: "en-US" },
    sonia: { names: ["Sonia", "SoniaNeural", "Sonia Online", "Libby"], gender: "female", lang: "en-GB" },
    ryan: { names: ["Ryan", "RyanNeural", "Ryan Online", "Oliver"], gender: "male", lang: "en-GB" },
    libby: { names: ["Libby", "LibbyNeural", "Sonia"], gender: "female", lang: "en-GB" },
    oliver: { names: ["Oliver", "OliverNeural", "Ryan"], gender: "male", lang: "en-GB" },
    natasha: { names: ["Natasha", "NatashaNeural", "Natasha Online"], gender: "female", lang: "en-AU" },
    william: { names: ["William", "WilliamNeural", "William Online"], gender: "male", lang: "en-AU" },
    clara: { names: ["Clara", "ClaraNeural", "Clara Online"], gender: "female", lang: "en-CA" },
    liam: { names: ["Liam", "LiamNeural", "Liam Online"], gender: "male", lang: "en-CA" },
    neerja: { names: ["Neerja", "NeerjaNeural"], gender: "female", lang: "en-IN" },
    prabhat: { names: ["Prabhat", "PrabhatNeural"], gender: "male", lang: "en-IN" },
    emily: { names: ["Emily", "EmilyNeural"], gender: "female", lang: "en-IE" },
    connor: { names: ["Connor", "ConnorNeural"], gender: "male", lang: "en-IE" },
    yan: { names: ["Yan", "YanNeural"], gender: "female", lang: "en-HK" },
    sam: { names: ["Sam", "SamNeural"], gender: "male", lang: "en-HK" },
    luna: { names: ["Luna", "LunaNeural"], gender: "female", lang: "en-SG" },
    wayne: { names: ["Wayne", "WayneNeural"], gender: "male", lang: "en-SG" }
  };

  function resolveVoice(ch){
    if(!voices || !voices.length) return null;
    var p = preset(ch.voicePresetId);
    var custom = (DATA.customVoiceProfiles||[]).filter(function(c){return c.id===ch.voicePresetId;})[0] || customVoices[ch.id];
    var want = ch.customVoiceName || (custom&&custom.voiceName) || (p&&p.azureVoice);
    var targetLang = (custom&&custom.lang) || (p&&p.fallbackLang) || "en-US";
    var targetGender = ch.gender || (p&&p.gender) || "female";
    var cfg = VOICE_CONFIG_MAP[ch.voicePresetId] || { names: [want || ch.voicePresetId || ''], gender: targetGender, lang: targetLang };

    var scored = voices.map(function(v){
      var score = 0;
      var nameLower = (v.name || '').toLowerCase();
      var langLower = (v.lang || '').toLowerCase();

      // HEAVY PENALTIES FOR ROBOTIC / LOW QUALITY VOICES (NEVER PICK DAVID!)
      if (nameLower.indexOf('david') !== -1) score -= 10000;
      if (nameLower.indexOf('desktop') !== -1) score -= 5000;
      if (nameLower.indexOf('zira') !== -1) score -= 3000;
      if (nameLower.indexOf('mark') !== -1) score -= 3000;
      if (nameLower.indexOf('hazel') !== -1) score -= 3000;
      if (nameLower.indexOf('espeak') !== -1) score -= 8000;

      // REWARDS FOR NATURAL / NEURAL / HIGH QUALITY VOICES
      if (nameLower.indexOf('natural') !== -1 || nameLower.indexOf('neural') !== -1 || nameLower.indexOf('online') !== -1) score += 3000;
      if (nameLower.indexOf('google') !== -1) score += 2000;
      if (nameLower.indexOf('samantha') !== -1 || nameLower.indexOf('daniel') !== -1 || nameLower.indexOf('karen') !== -1 || nameLower.indexOf('moira') !== -1) score += 1500;
      if (nameLower.indexOf('premium') !== -1 || nameLower.indexOf('enhanced') !== -1) score += 1000;

      // EXACT WANT MATCH
      if (want && (v.name === want || nameLower.indexOf(want.toLowerCase()) !== -1)) score += 5000;

      // PRESET NAMES MATCH
      for (var k = 0; k < cfg.names.length; k++) {
        var n = (cfg.names[k] || '').toLowerCase();
        if (n && nameLower.indexOf(n) !== -1) { score += 4000; break; }
      }

      // LOCALE MATCH
      if (langLower === targetLang.toLowerCase()) score += 1500;
      else if (langLower.startsWith(targetLang.slice(0, 2).toLowerCase())) score += 800;

      // GENDER HEURISTIC
      var vGender = getVoiceGender(v.name);
      if (vGender === targetGender) score += 800;
      else if (vGender !== "neutral" && targetGender !== "neutral" && vGender !== targetGender) score -= 1200;

      return { voice: v, score: score };
    });

    scored.sort(function(a, b){ return b.score - a.score; });
    return scored[0] ? scored[0].voice : voices[0];
  }

  function speak(uid, speakerId, text, onEnd){
    if(!("speechSynthesis" in window)){ if(onEnd)onEnd(); return; }
    var ch = byId(speakerId); if(!ch){ if(onEnd)onEnd(); return; }
    window.speechSynthesis.cancel(); paused=false;
    var u = new SpeechSynthesisUtterance(clean(text));
    var v = resolveVoice(ch);
    var p = preset(ch.voicePresetId);
    if(v) u.voice = v;
    u.lang = (v&&v.lang) || (p&&p.fallbackLang) || "en-US";
    u.rate = state.rate; u.volume = state.volume;
    u.pitch = (p&&p.childTimbre) ? clamp(state.pitch+0.14,0.7,1.7) : state.pitch;
    u.onstart = function(){
      activeUtterId=uid;
      markSpeaking(uid, speakerId, true);
      var node=document.querySelector('[data-uid="'+uid+'"]');
      if(node) node.scrollIntoView({behavior:"smooth",block:"center"});
      setCaption(ch.name+": "+clean(text));
    };
    u.onend = function(){ markSpeaking(uid, speakerId, false); activeUtterId=null; if(onEnd)onEnd(); };
    u.onerror = function(){ markSpeaking(uid, speakerId, false); activeUtterId=null; };
    window.speechSynthesis.speak(u);
  }

  function markSpeaking(uid, speakerId, on){
    var n=document.querySelector('[data-uid="'+uid+'"]');
    if(n) n.classList.toggle("speaking",on);
    if(speakerId){
      var pod = document.getElementById("podium-char-" + speakerId);
      if(pod) pod.classList.toggle("is-active-speaker", on);
    }
  }
  function setCaption(t){var c=document.getElementById("caption");if(c)c.textContent=t;}
  function pause(){if("speechSynthesis" in window){window.speechSynthesis.pause();paused=true;}}
  function resume(){if("speechSynthesis" in window){window.speechSynthesis.resume();paused=false;}}
  function stop(){
    if("speechSynthesis" in window){window.speechSynthesis.cancel();}
    activeUtterId=null;paused=false;
    document.querySelectorAll(".dialogue-bubble-row.speaking, .bubble.speaking").forEach(function(n){n.classList.remove("speaking");});
    document.querySelectorAll(".video-participant-tile.is-active-speaker").forEach(function(p){p.classList.remove("is-active-speaker");});
  }
  function playSequence(lines, i){
    i = i||0; if(i>=lines.length) return;
    speak(lines[i].uid, lines[i].speakerId, lines[i].text, function(){ playSequence(lines, i+1); });
  }

  /* ---- Rendering: lessons ---- */
  function accentVars(accent){
    return 'style="--accent:'+esc(accent)+';--accent-soft:color-mix(in oklab,'+esc(accent)+' 14%,var(--panel) 86%);--accent-border:color-mix(in oklab,'+esc(accent)+' 36%,var(--line));"';
  }
  function renderBlock(b){
    if(b.type==="paragraph") return '<div class="block"><p>'+esc(b.body)+'</p></div>';
    if(b.type==="list"||b.type==="orderedList"){
      var tag=b.type==="orderedList"?"ol":"ul";
      var items=(b.items||[]).map(function(i){return "<li>"+esc(i)+"</li>";}).join("");
      return '<div class="block">'+(b.title?"<h4>"+esc(b.title)+"</h4>":"")+"<"+tag+">"+items+"</"+tag+"></div>";
    }
    if(b.type==="table"){
      var head="<tr>"+(b.headers||[]).map(function(h){return "<th>"+esc(h)+"</th>";}).join("")+"</tr>";
      var rows=(b.rows||[]).map(function(r){return "<tr>"+r.map(function(c){return "<td>"+esc(c)+"</td>";}).join("")+"</tr>";}).join("");
      return '<div class="block">'+(b.title?"<h4>"+esc(b.title)+"</h4>":"")+'<div class="table-scroll"><table><thead>'+head+"</thead><tbody>"+rows+"</tbody></table></div></div>";
    }
    if(b.type==="callout"){
      var meta=CALLOUTS[b.calloutType||"custom"]||CALLOUTS.custom;
      return '<div class="block callout" style="--co:oklch(70% 0.13 '+meta.hue+')"><div class="label">'+(b.icon||meta.icon)+" "+esc(b.title||meta.label)+'</div><p>'+esc(b.body)+"</p></div>";
    }
    if(b.type==="quote") return '<div class="block"><blockquote>'+esc(b.body)+"</blockquote></div>";
    if(b.type==="code") return '<div class="block"><pre><code>'+esc(b.body)+"</code></pre></div>";
    if(b.type==="definition"){
      var defs=(b.definitions||[]).map(function(d){return "<dt>"+esc(d.term)+"</dt><dd>"+esc(d.definition)+"</dd>";}).join("");
      return '<div class="block">'+(b.title?"<h4>"+esc(b.title)+"</h4>":"")+'<dl class="def-grid">'+defs+"</dl></div>";
    }
    return "";
  }

  /* ---- Procedural Web Audio Sound Synthesizer ---- */
  var audioCtx = null;
  function getAudioCtx(){
    if(!audioCtx){
      var AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if(AudioCtxClass) audioCtx = new AudioCtxClass();
    }
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function playTone(type){
    try {
      var ctx = getAudioCtx();
      if(!ctx) return;
      var now = ctx.currentTime;
      if(type === 'applause'){
        for(var i=0; i<12; i++){
          var osc = ctx.createOscillator();
          var g = ctx.createGain();
          var t = now + (i * 0.065) + (Math.random() * 0.03);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300 + Math.random() * 420, t);
          g.gain.setValueAtTime(0.08, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(t); osc.stop(t + 0.08);
        }
      } else if(type === 'eureka'){
        [523.25, 659.25, 783.99, 1046.50].forEach(function(freq, idx){
          var osc = ctx.createOscillator();
          var g = ctx.createGain();
          var t = now + (idx * 0.08);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.12, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(t); osc.stop(t + 0.3);
        });
      } else if(type === 'laughter'){
        [440, 554, 440, 587, 440].forEach(function(freq, idx){
          var osc = ctx.createOscillator();
          var g = ctx.createGain();
          var t = now + (idx * 0.09);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.1, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(t); osc.stop(t + 0.08);
        });
      } else if(type === 'victory'){
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach(function(freq, idx){
          var osc = ctx.createOscillator();
          var g = ctx.createGain();
          var t = now + (idx * 0.1);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.15, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(t); osc.stop(t + 0.35);
        });
      } else if(type === 'thinking'){
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(460, now + 0.25);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.25);
      } else if(type === 'booing'){
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.35);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.35);
      } else if(type === 'pop'){
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        g.gain.setValueAtTime(0.09, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.05);
      }
    } catch(e){}
  }

  function renderBubble(line, scope){
    var ch = byId(line.speakerId);
    var uid = scope + "-" + line.id;
    var p = preset(ch ? ch.voicePresetId : "");
    return '<div class="bubble" data-uid="' + esc(uid) + '">'
      + '<div class="avatar-podium">'
      + '<div class="avatar" aria-hidden="true">' + esc(ch ? ch.emoji : "🙂") + '</div>'
      + '<div class="avatar-caption"><span class="avatar-name">' + esc(ch ? ch.name : "Narrator") + '</span>'
      + (p ? '<span class="chip">' + esc(p.regionLabel || p.azureVoice) + '</span>' : '') + '</div>'
      + '</div>'
      + '<div class="bubble-content">'
      + '<p class="line">' + esc(line.text) + '</p>'
      + '<div class="bubble-actions">'
      + '<button class="btn-mini" data-play="' + esc(uid) + '" data-speaker="' + esc(line.speakerId) + '">▶ Speak Line</button>'
      + '<button class="btn-mini" data-play="' + esc(uid) + '" data-speaker="' + esc(line.speakerId) + '">↺ Replay</button>'
      + '</div></div></div>';
  }

  /* ---- Flattened Step Pipeline Definition ---- */
  var sequence = [];

  function buildSequence(){
    sequence = [];

    if(DATA.characters && DATA.characters.length){
      sequence.push({
        type: "team",
        title: "Meet the Team",
        badge: "Team Introduction"
      });
    }

    (DATA.lessons || []).forEach(function(lesson, li){
      sequence.push({
        type: "concept",
        lessonIndex: li,
        lesson: lesson,
        title: lesson.title,
        badge: "Core Concept"
      });
      if(lesson.dialogue && lesson.dialogue.length){
        sequence.push({
          type: "dialogue",
          lessonIndex: li,
          lesson: lesson,
          title: "Live Conversation: " + lesson.title,
          badge: "Conversation Stage"
        });
      }
      if(lesson.quickChecks && lesson.quickChecks.length){
        lesson.quickChecks.forEach(function(qc, qi){
          sequence.push({
            type: "check",
            lessonIndex: li,
            lesson: lesson,
            checkIndex: qi,
            check: qc,
            title: "Quick Check (" + (qi + 1) + "): " + lesson.title,
            badge: "Quick Check"
          });
        });
      }
    });

    if(DATA.scenario && DATA.scenario.startNode){
      sequence.push({
        type: "scenario",
        title: "Practice Scenario: Real Decisions",
        badge: "Interactive Practice"
      });
    }
  }

  function renderCurrentStep(){
    if(!sequence.length) buildSequence();
    var idx = clamp(state.stepIndex || 0, 0, sequence.length - 1);
    state.stepIndex = idx;
    var cur = sequence[idx];
    var stage = document.getElementById("stage-card");
    if(!stage || !cur) return;

    var prevBtn = idx > 0
      ? '<button class="btn" id="step-prev">← Previous</button>'
      : '<div style="width:1px"></div>';

    var nextBtn = idx < sequence.length - 1
      ? '<button class="btn primary" id="step-next">Continue →</button>'
      : '<button class="btn primary" id="step-restart">↺ Restart Lesson</button>';

    var headerMeta = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:1px solid var(--line);padding-bottom:12px">'
      + '<span class="chip accent" style="font-weight:700">Step ' + (idx + 1) + ' of ' + sequence.length + ' • ' + esc(cur.badge) + '</span>'
      + '<span style="font-size:0.85rem;color:var(--ink-muted)">' + Math.round(((idx + 1) / sequence.length) * 100) + '% Completed</span>'
      + '</div>';

    var footerNav = '<footer class="stepper-footer">' + prevBtn + nextBtn + '</footer>';

    if(cur.type === "team"){
      var castCards = (DATA.characters || []).map(function(c){
        var p = preset(c.voicePresetId);
        var introText = c.bio || ("Hi, I'm " + c.name + ". I'll be guiding you with " + (c.role || "practical language insights") + ".");
        var voiceName = p ? p.displayName : (c.voicePresetId || 'Natural Voice');
        return '<div class="cast-card">'
          + '<div class="cast-header">'
          + '<div class="cast-emoji-box">' + esc(c.emoji || '👤') + '</div>'
          + '<div class="cast-meta">'
          + '<span class="cast-name">' + esc(c.name) + '</span>'
          + '<span class="cast-role">' + esc(c.role || 'Team Member') + ' • ' + esc(c.accent || 'Natural Accent') + '</span>'
          + '</div>'
          + '</div>'
          + '<p class="cast-quote">“' + esc(introText) + '”</p>'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:8px;border-top:1px solid var(--line);">'
          + '<span style="font-size:0.78rem;color:var(--ink-muted);font-weight:600">🎙️ ' + esc(voiceName) + '</span>'
          + '<button class="btn-mini" data-play="team-intro-' + esc(c.id) + '" data-speaker="' + esc(c.id) + '" data-text="' + encodeURIComponent(introText) + '">🗣️ Listen to Intro</button>'
          + '</div>'
          + '</div>';
      }).join("");

      stage.innerHTML = headerMeta
        + '<div class="cast-showcase-wrap">'
        + '<div style="text-align:center;padding:10px 0;">'
        + '<h2 style="font-size:1.6rem;margin-bottom:6px;">👥 Meet Your Learning Team</h2>'
        + '<p style="color:var(--ink-muted);font-size:1.02rem;max-width:600px;margin:0 auto;">Learn naturally with authentic conversational partners tailored with distinct roles and neural voices.</p>'
        + '</div>'
        + '<div class="cast-grid">' + castCards + '</div>'
        + '</div>'
        + footerNav;
    } else if(cur.type === "concept"){
      var l = cur.lesson;
      var instructor = (DATA.characters && DATA.characters[0]) || { name: "Instructor", emoji: "👩‍🏫", id: "instructor" };
      var blocksHtml = ((l && l.blocks) || []).map(renderBlock).join("");
      var chips = ((l && l.conceptIds) || []).map(function(c){ return '<span class="chip accent">' + esc(c) + '</span>'; }).join("");

      stage.innerHTML = headerMeta
        + '<div class="avatar-podium">'
        + '<div class="avatar" data-uid="instructor-hero" aria-hidden="true">' + esc(instructor.emoji) + '</div>'
        + '<div class="avatar-caption"><span class="avatar-name">' + esc(instructor.name) + '</span><span class="avatar-role">' + esc(instructor.role || 'Lead Instructor') + '</span></div>'
        + '</div>'
        + '<div class="speech-hero">'
        + '<div class="concept-chips">' + chips + '</div>'
        + '<h2>' + esc(l.title || "") + '</h2>'
        + '<p>' + esc(l.summary || "") + '</p>'
        + '<div style="margin-top:6px"><button class="btn-mini" data-play="instructor-hero" data-speaker="' + esc(instructor.id) + '">🔊 Listen to Concept Overview</button></div>'
        + '</div>'
        + '<div class="blocks">' + blocksHtml + '</div>'
        + footerNav;
    } else if(cur.type === "dialogue"){
      var l = cur.lesson;
      var speakerIds = [];
      (l.dialogue || []).forEach(function(line){
        if(line.speakerId && speakerIds.indexOf(line.speakerId) === -1){
          speakerIds.push(line.speakerId);
        }
      });
      var participatingChars = speakerIds.map(function(id){
        return byId(id) || { id: id, name: 'Team Member', emoji: '👤', role: 'Participant' };
      });

      var podiumHtml = '';
      if(participatingChars.length > 0){
        podiumHtml = '<div class="video-participants-podium">'
          + participatingChars.map(function(char){
              return '<div class="video-participant-tile" id="podium-char-' + esc(char.id) + '">'
                + '<span style="font-size:28px;line-height:1;">' + esc(char.emoji || '👤') + '</span>'
                + '<div style="display:flex;flex-direction:column;gap:1px;">'
                + '<span style="font-size:13px;font-weight:700;">' + esc(char.name) + '</span>'
                + '<span style="font-size:11px;opacity:0.8;">' + esc(char.role || char.accent || 'Speaker') + '</span>'
                + '</div>'
                + '<span class="speaker-wave">🌊 Speaking</span>'
                + '</div>';
            }).join("")
          + '</div>';
      }

      var dialogueStreamHtml = (l.dialogue || []).map(function(line, lIdx){
        var ch = byId(line.speakerId) || { id: line.speakerId, name: 'Speaker', emoji: '👤', role: 'Participant' };
        var uid = "dialogue-" + cur.lessonIndex + "-" + line.id;
        return '<div class="dialogue-bubble-row" data-uid="' + esc(uid) + '" id="chat-row-' + lIdx + '">'
          + '<div class="dialogue-avatar-box">' + esc(ch.emoji || '👤') + '</div>'
          + '<div class="dialogue-bubble-card">'
          + '<div class="dialogue-card-header">'
          + '<div style="display:flex;align-items:center;gap:8px;">'
          + '<span class="dialogue-speaker-name">' + esc(ch.name) + '</span>'
          + (ch.role ? '<span style="font-size:11px;background:var(--panel-alt);padding:2px 8px;border-radius:999px;color:var(--ink-muted);">' + esc(ch.role) + '</span>' : '')
          + '</div>'
          + '<button class="btn-mini" data-play="' + esc(uid) + '" data-speaker="' + esc(line.speakerId) + '">🔊 Listen</button>'
          + '</div>'
          + '<p class="dialogue-text-content">' + esc(line.text) + '</p>'
          + '</div>'
          + '</div>';
      }).join("");

      stage.innerHTML = headerMeta
        + '<div class="live-dialogue-video-frame">'
        + '<div class="video-frame-top-bar">'
        + '<span class="live-indicator"><span class="live-dot"></span> LIVE CONVERSATION STAGE</span>'
        + '<div class="video-frame-controls">'
        + '<button class="video-ctrl-btn" id="play-lesson">▶ Autoplay</button>'
        + '<button class="video-ctrl-btn" id="pause-lesson">⏸ Pause</button>'
        + '<button class="video-ctrl-btn" id="stop-lesson">⏹ Stop</button>'
        + '</div>'
        + '</div>'
        + podiumHtml
        + '<div class="dialogue-stream-wrap">' + dialogueStreamHtml + '</div>'
        + '</div>'
        + footerNav;
    } else if(cur.type === "check"){
      var q = cur.check;
      var opts = (q.options || []).map(function(o, i){
        return '<button class="opt" data-check="' + esc(q.id) + '" data-i="' + i + '"><span class="choice-num">' + (i + 1) + '</span> ' + esc(o) + '</button>';
      }).join("");

      stage.innerHTML = headerMeta
        + '<div class="quickcheck" data-answer="' + q.answerIndex + '" data-explain="' + esc(q.explanation) + '">'
        + '<div class="quickcheck-header">💡 Quick Comprehension Check</div>'
        + '<strong>' + esc(q.question) + '</strong>'
        + '<div class="options-grid">' + opts + '</div>'
        + '<div class="explain" hidden></div>'
        + '</div>'
        + footerNav;
    } else if(cur.type === "scenario"){
      var node = currentNode();
      if(!node){
        stage.innerHTML = headerMeta + '<div class="ending-card">Scenario completed.</div>' + footerNav;
        return;
      }
      var speaker = byId(node.speakerId) || (DATA.characters && DATA.characters[0]) || { name: "Narrator", emoji: "🎭", id: "narrator" };
      var p = preset(speaker.voicePresetId);
      var reinforce = (node.reinforces || []).map(function(r){ return '<span class="chip accent">🔗 ' + esc(r) + '</span>'; }).join("");
      var lines = (node.lines && node.lines.length)
        ? '<div class="live-dialogue-video-frame" style="margin:14px 0;">'
          + '<div class="video-frame-top-bar"><span class="live-indicator"><span class="live-dot"></span> TEAM CONVERSATION</span></div>'
          + '<div class="dialogue-stream-wrap">'
          + node.lines.map(function(l, sIdx){
              var c = byId(l.speakerId) || { name: 'Team Member', emoji: '👤' };
              var uid = "scenario-" + l.id;
              return '<div class="dialogue-bubble-row" data-uid="' + esc(uid) + '">'
                + '<div class="dialogue-avatar-box">' + esc(c.emoji || '👤') + '</div>'
                + '<div class="dialogue-bubble-card">'
                + '<div class="dialogue-card-header">'
                + '<span class="dialogue-speaker-name">' + esc(c.name) + '</span>'
                + '<button class="btn-mini" data-play="' + esc(uid) + '" data-speaker="' + esc(l.speakerId) + '">🔊</button>'
                + '</div>'
                + '<p class="dialogue-text-content">' + esc(l.text) + '</p>'
                + '</div></div>';
            }).join("")
          + '</div></div>'
        : '';

      var affinityHtml = '<div class="affinity-hud">'
        + (DATA.characters || []).map(function(c){
            var v = state.affinity[c.id] != null ? state.affinity[c.id] : (c.baseAffinity || 50);
            return '<div class="affinity-card">'
              + '<div class="affinity-meta"><span>' + esc(c.emoji) + ' ' + esc(c.name) + '</span><span>' + v + '%</span></div>'
              + '<div class="affinity-bar"><div class="affinity-fill" style="width:' + v + '%"></div></div>'
              + '</div>';
          }).join("")
        + '</div>';

      var bodyHtml = '';
      if(node.type === "ending"){
        var rc = reachedConcepts();
        var all = {};
        (DATA.lessons || []).forEach(function(l){ (l.conceptIds || []).forEach(function(c){ all[c] = true; }); });
        var rows = Object.keys(all).map(function(c){
          var hit = rc[c];
          return '<div class="recap-row"><span>' + esc(c) + '</span><span class="' + (hit ? "badge-yes" : "badge-no") + '">' + (hit ? "✓ Applied" : "✗ Missed") + '</span></div>';
        }).join("");

        bodyHtml = '<div class="ending-card ' + esc(node.endingStyle || "success") + '">'
          + '<strong>🎬 Practice Scenario Completed</strong>'
          + '<div class="recap-table">' + rows + '</div></div>'
          + '<div class="choices">'
          + '<button class="btn primary" id="restart">↺ Replay Practice Scenario</button>'
          + '<button class="btn" id="rewind">↶ Rewind One Decision</button>'
          + '</div>';
      } else if(node.choices && node.choices.length){
        bodyHtml = '<div class="choices">' + node.choices.map(function(c, idx){
          var ok = (function(){
            if(!c.requiresFlags) return true;
            return Object.keys(c.requiresFlags).every(function(k){ return state.flags[k] === c.requiresFlags[k]; });
          })();
          return '<button class="choice" ' + (ok ? "" : "disabled") + ' data-goto="' + esc(c.goto) + '" data-choice="' + esc(c.id) + '">'
            + '<div class="choice-label"><span class="choice-num">' + (idx + 1) + '</span> ' + esc(c.label) + '</div>'
            + (c.hint ? '<div class="choice-hint">' + esc(c.hint) + '</div>' : '')
            + (ok ? '' : '<div class="choice-hint" style="color:var(--danger)">🔒 Requirement locked</div>')
            + '</button>';
        }).join("") + '</div>';
      } else if(node.next){
        bodyHtml = '<div class="choices"><button class="btn primary" data-goto="' + esc(node.next) + '" data-choice="next">Continue to Next Scene →</button></div>';
      }

      stage.innerHTML = headerMeta
        + affinityHtml
        + '<div class="avatar-podium">'
        + '<div class="avatar" data-uid="scenario-hero" aria-hidden="true">' + esc(speaker.emoji) + '</div>'
        + '<div class="avatar-caption"><span class="avatar-name">' + esc(speaker.name) + '</span>'
        + (p ? '<span class="chip">' + esc(p.regionLabel) + '</span>' : '') + '</div>'
        + '</div>'
        + '<div class="speech-hero">'
        + '<div style="display:flex;gap:6px;justify-content:center;margin-bottom:8px"><span class="chip">' + esc(node.type.toUpperCase()) + '</span>' + reinforce + '</div>'
        + '<h3>' + esc(node.title) + '</h3>'
        + '<p>' + esc(node.body) + '</p>'
        + '<div style="margin-top:4px"><button class="btn-mini" data-play="scenario-hero" data-speaker="' + esc(speaker.id) + '">🔊 Listen to Scene</button></div>'
        + '</div>'
        + lines
        + bodyHtml
        + footerNav;
    }

    renderRibbon();
    renderProgress();
  }

  function renderRibbon(){
    var container = document.getElementById("step-pills");
    if(!container) return;
    var idx = state.stepIndex || 0;
    container.innerHTML = sequence.map(function(step, i){
      var isAct = i === idx;
      var isDone = i < idx;
      return '<button class="step-pill ' + (isAct ? 'active ' : '') + (isDone ? 'done' : '') + '" data-step-idx="' + i + '">'
        + '<span style="font-weight:700">' + (i + 1) + '.</span> ' + esc(step.title)
        + '</button>';
    }).join("");
  }

  function currentNode(){ return DATA.scenario && DATA.scenario.nodes ? DATA.scenario.nodes[state.nodeId] : null; }
  function applyAffinity(list){ (list||[]).forEach(function(d){ state.affinity[d.characterId]=clamp((state.affinity[d.characterId]||0)+d.amount,0,100); }); }
  function goTo(nodeId, sets, aff){
    var node=DATA.scenario.nodes[nodeId]; if(!node) return;
    state.flags=Object.assign({},state.flags,sets||{},node.setsFlags||{});
    applyAffinity(aff); applyAffinity(node.affinity);
    state.nodeId=nodeId; state.trail.push(nodeId); save();
    playTone("pop");
    renderCurrentStep();
  }
  function reachedConcepts(){
    var set={}; state.trail.forEach(function(id){var n=DATA.scenario.nodes[id];(n&&n.reinforces||[]).forEach(function(c){set[c]=true;});}); return set;
  }

  function renderProgress(){
    var idx = (state.stepIndex || 0) + 1;
    var total = sequence.length || 1;
    var pct = Math.round((idx / total) * 100);
    var pf = document.getElementById("pf"); if(pf) pf.style.width = pct + "%";
    var stats = document.getElementById("header-stats");
    if(stats) stats.textContent = "Step " + idx + " of " + total;
  }

  /* ---- Global event delegation ---- */
  document.addEventListener("click", function(e){
    var soundBtn = e.target.closest("[data-sound]");
    if(soundBtn){
      e.preventDefault();
      var s = soundBtn.getAttribute("data-sound");
      playTone(s);
      toast("Played " + s + " sound effect ✨");
      return;
    }

    var pill = e.target.closest("[data-step-idx]");
    if(pill){
      var sIdx = parseInt(pill.getAttribute("data-step-idx"), 10);
      stop();
      playTone("pop");
      state.stepIndex = sIdx;
      save();
      renderCurrentStep();
      return;
    }

    if(e.target.closest("#step-next")){
      stop();
      playTone("pop");
      state.stepIndex = Math.min((state.stepIndex || 0) + 1, sequence.length - 1);
      save();
      renderCurrentStep();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if(e.target.closest("#step-prev")){
      stop();
      playTone("pop");
      state.stepIndex = Math.max((state.stepIndex || 0) - 1, 0);
      save();
      renderCurrentStep();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if(e.target.closest("#step-restart") || e.target.closest("#restart")){
      stop();
      state.stepIndex = 0;
      state.nodeId = DATA.scenario && DATA.scenario.startNode;
      state.trail = state.nodeId ? [state.nodeId] : [];
      save();
      playTone("victory");
      toast("Restarted from the beginning! 🚀");
      renderCurrentStep();
      return;
    }

    if(e.target.closest("#rewind")){
      stop();
      if(state.trail.length > 1){
        state.trail.pop();
        state.nodeId = state.trail[state.trail.length - 1];
        save();
        playTone("thinking");
        toast("Rewound 1 step ↶");
        renderCurrentStep();
      }
      return;
    }

    // Open / Close Settings Modal
    if(e.target.closest("#btn-settings")){ openSettings(); return; }
    if(e.target.closest("#btn-close-settings") || e.target.id==="settings-modal"){ closeSettings(); return; }

    var t = e.target.closest("[data-play]");
    if(t){
      var uid = t.getAttribute("data-play");
      var spk = t.getAttribute("data-speaker");
      var dataText = t.getAttribute("data-text");
      var text = "";
      if(dataText){
        text = decodeURIComponent(dataText);
      } else if(uid === "instructor-hero"){
        var cur = sequence[state.stepIndex || 0];
        text = (cur && cur.lesson && cur.lesson.summary) || "Welcome to this interactive English lesson!";
      } else if(uid === "scenario-hero"){
        var node = currentNode();
        text = (node && node.body) || "";
      } else {
        var row = t.closest(".dialogue-bubble-row");
        var lineEl = row ? row.querySelector(".dialogue-text-content") : null;
        if(!lineEl){
          var bubble = t.closest(".bubble");
          lineEl = bubble && bubble.querySelector(".line");
        }
        text = (lineEl && lineEl.textContent) || "";
      }
      speak(uid, spk, text);
      return;
    }

    var check = e.target.closest("[data-check]");
    if(check){
      var box = check.closest(".quickcheck");
      var ans = Number(box.getAttribute("data-answer"));
      var i = Number(check.getAttribute("data-i"));
      box.querySelectorAll(".opt").forEach(function(o){ o.classList.remove("correct", "wrong"); });
      check.classList.add(i === ans ? "correct" : "wrong");
      if(i !== ans){
        var correctBtn = box.querySelectorAll(".opt")[ans];
        if(correctBtn) correctBtn.classList.add("correct");
        playTone("booing");
        toast("Keep going! Review the explanation.");
      } else {
        playTone("eureka");
        toast("Correct answer! 🌟");
      }
      var ex = box.querySelector(".explain");
      if(ex){
        ex.hidden = false;
        ex.innerHTML = (i === ans ? "<strong>🎉 Correct!</strong> " : "<strong>💡 Note:</strong> ") + esc(box.getAttribute("data-explain") || "");
      }
      return;
    }

    var goto = e.target.closest("[data-goto]");
    if(goto && !goto.disabled){
      var node = currentNode();
      var choice = (node && node.choices && node.choices.filter(function(c){ return c.id === goto.getAttribute("data-choice"); })[0]);
      goTo(goto.getAttribute("data-goto"), choice && choice.setsFlags, choice && choice.affinity);
      return;
    }

    if(e.target.id === "play-lesson"){
      var cur = sequence[state.stepIndex || 0];
      var lines = (cur && cur.lesson && cur.lesson.dialogue) || [];
      var mapped = lines.map(function(d){ return { uid: "dialogue-" + cur.lessonIndex + "-" + d.id, speakerId: d.speakerId, text: d.text }; });
      playSequence(mapped, 0);
      return;
    }
    if(e.target.id === "pause-lesson"){ pause(); return; }
    if(e.target.id === "resume-lesson"){ resume(); return; }
    if(e.target.id === "stop-lesson" || e.target.id === "g-stop"){ stop(); return; }
    if(e.target.id === "theme-toggle"){ toggleTheme(); return; }

    if(e.target.id === "save-voice"){
      var cid = document.getElementById("voice-char").value;
      var vn = document.getElementById("voice-picker").value;
      var v = voices.filter(function(x){ return x.name === vn; })[0];
      customVoices[cid] = { id: cid, label: vn, emoji: "🎙️", voiceName: vn, lang: v ? v.lang : "en-US" };
      saveVoices();
      toast("Voice profile assigned successfully.");
      return;
    }
    if(e.target.id === "test-voice"){
      var testVn = document.getElementById("voice-picker").value;
      var testCharId = document.getElementById("voice-char").value;
      var testChar = byId(testCharId);
      speak("test-sample", testCharId, "Hello! I am " + (testChar ? testChar.name : "this character") + ", and I am ready to guide your learning session.");
      return;
    }
    if(e.target.id === "reset-progress"){
      state.done = {};
      state.trail = DATA.scenario ? [DATA.scenario.startNode] : [];
      state.nodeId = DATA.scenario ? DATA.scenario.startNode : "";
      state.flags = {};
      state.affinity = {};
      state.stepIndex = 0;
      (DATA.characters || []).forEach(function(c){ state.affinity[c.id] = c.baseAffinity != null ? c.baseAffinity : 50; });
      save();
      toast("Lesson progress has been reset.");
      renderCurrentStep();
      return;
    }
  });

  document.addEventListener("keydown", function(e){
    if(e.key === "Escape"){ closeSettings(); return; }
    if(e.key >= "1" && e.key <= "9"){
      var node = currentNode();
      if(node && node.choices){
        var idx = Number(e.key) - 1;
        var btn = document.querySelectorAll(".choice")[idx];
        if(btn && !btn.disabled) btn.click();
      }
    }
  });

  /* ---- Settings sliders ---- */
  function bindRange(id, key, labelId, unit){
    var r = document.getElementById(id);
    if(!r) return;
    r.value = state[key];
    var updateLbl = function(){
      var l = document.getElementById(labelId);
      if(l) l.textContent = unit ? Math.round(Number(r.value) * 100) + unit : Number(r.value).toFixed(2) + "x";
    };
    updateLbl();
    r.addEventListener("input", function(){
      state[key] = Number(r.value);
      updateLbl();
      save();
    });
  }

  function toggleTheme(){
    var cur = document.documentElement.getAttribute("data-theme");
    var next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    state.theme = next;
    save();
  }

  /* ---- Drag + drop JSON ---- */
  function bindDrop(){
    var d = document.getElementById("drop-zone");
    if(!d) return;
    ["dragover", "dragenter"].forEach(function(ev){ d.addEventListener(ev, function(e){ e.preventDefault(); d.classList.add("hot"); }); });
    ["dragleave", "drop"].forEach(function(ev){ d.addEventListener(ev, function(e){ e.preventDefault(); d.classList.remove("hot"); }); });
    d.addEventListener("drop", function(e){
      var f = e.dataTransfer.files[0];
      if(!f) return;
      var r = new FileReader();
      r.onload = function(){
        try {
          DATA = JSON.parse(r.result);
          boot();
          closeSettings();
          toast("New lesson package loaded.");
        } catch(err){
          toast("That file is not valid JSON.");
        }
      };
      r.readAsText(f);
    });
  }

  /* ---- Boot ---- */
  function boot(){
    if(!DATA || !DATA.lessons || !DATA.lessons.length){ 
      document.getElementById("stage-card").innerHTML = '<div class="ending-card"><h3>No lesson data available</h3><p>Drop a valid lesson JSON file into settings to begin.</p></div>'; 
      return; 
    }
    var saved = load(STORE_KEY, null);
    if(saved){ state = Object.assign(state, saved); }
    if(state.theme) document.documentElement.setAttribute("data-theme", state.theme);
    
    if(!state.nodeId || !DATA.scenario || !DATA.scenario.nodes || !DATA.scenario.nodes[state.nodeId]){
      state.nodeId = DATA.scenario ? DATA.scenario.startNode : "";
      state.trail = state.nodeId ? [state.nodeId] : [];
    }
    (DATA.characters || []).forEach(function(c){
      if(state.affinity[c.id] == null) state.affinity[c.id] = c.baseAffinity != null ? c.baseAffinity : 50;
    });
    
    var titleEl = document.getElementById("nav-deck-title");
    if(titleEl) titleEl.textContent = (DATA.meta && DATA.meta.title) || "Avatar Lesson";

    buildSequence();
    renderCurrentStep();
    
    bindRange("s-rate", "rate", "lbl-rate", "");
    bindRange("s-pitch", "pitch", "lbl-pitch", "");
    bindRange("s-vol", "volume", "lbl-vol", "%");
    
    var aa = document.getElementById("s-auto");
    if(aa){
      aa.checked = state.autoAdvance;
      aa.addEventListener("change", function(){ state.autoAdvance = aa.checked; save(); });
    }
    
    loadVoices();
    bindDrop();
  }
  boot();
})();
`;

export interface GenerateOptions {
  /** Pretty-print the embedded JSON. Default true. */
  prettyJson?: boolean;
  /** Inject a manual dark-mode default. Default follows system. */
  forceTheme?: "light" | "dark";
}

/**
 * Produces the full, self-contained HTML document as a string.
 * Write this to a .html file and open it anywhere. No server required.
 */
export const generateStandaloneHtml = (
  data: AvatarLessonData,
  options: GenerateOptions = {}
): string => {
  const { prettyJson = true, forceTheme } = options;
  const json = prettyJson ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  const safeJson = json.replace(/<\/script>/gi, "<\\/script>");
  const title = escapeHtml(data.meta?.title || "Avatar Discovery Lesson");
  const subtitle = escapeHtml(data.meta?.subtitle || data.meta?.sourceSummary || "Interactive guided discovery");
  const themeAttr = forceTheme ? ` data-theme="${forceTheme}"` : "";

  return `<!doctype html>
<html lang="en"${themeAttr}>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>${RUNTIME_CSS}</style>
</head>
<body>

<!-- Sticky Header Navigation -->
<header class="nav-header" role="banner">
  <div class="brand-group">
    <span class="brand-badge">🧭 Step Studio</span>
    <div>
      <div class="nav-title" id="nav-deck-title">${title}</div>
      <div class="nav-subtitle">${subtitle}</div>
    </div>
  </div>

  <div class="header-progress" aria-label="Lesson Progress">
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" id="pf" style="width:0%"></div>
    </div>
    <span class="progress-stats" id="header-stats">Step 1</span>
  </div>

  <div class="header-actions">
    <button class="icon-btn" id="g-stop" title="Stop speech audio" aria-label="Stop audio">⏹</button>
    <button class="icon-btn" id="theme-toggle" title="Toggle Light / Dark theme" aria-label="Toggle theme">🌓</button>
    <button class="icon-btn" id="btn-settings" title="Audio & Voice Settings" aria-label="Open Settings">⚙️</button>
  </div>
</header>

<!-- Main Single-Focus Linear Workspace -->
<div class="stage-wrap">
  <nav class="ribbon-nav" id="step-pills" aria-label="Step Sequence Overview"></nav>
  <main class="panel stage-card" id="stage-card" aria-live="polite">
    <!-- Active single component rendered dynamically -->
  </main>
</div>

<!-- Dedicated Settings Modal -->
<div class="dialog-backdrop" id="settings-modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
  <div class="dialog-modal">
    <div class="modal-header">
      <h3 id="modal-heading">⚙️ Lesson & Audio Settings</h3>
      <button class="icon-btn" id="btn-close-settings" aria-label="Close Settings">✕</button>
    </div>

    <!-- Voice Assignment -->
    <div class="settings-section">
      <div class="settings-section-title">🎙️ Character Voice Assignment</div>
      <div style="display:grid;gap:8px">
        <label style="font-size:0.8rem;color:var(--ink-muted)" for="voice-char">Select Character</label>
        <select class="field-select" id="voice-char" aria-label="Select Character"></select>
        
        <label style="font-size:0.8rem;color:var(--ink-muted);margin-top:4px" for="voice-picker">Available Browser Voices</label>
        <select class="field-select" id="voice-picker" aria-label="Select Voice"></select>
        
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn" id="test-voice" style="flex:1">🔊 Test Sample</button>
          <button class="btn primary" id="save-voice" style="flex:1">Save Profile</button>
        </div>
      </div>
    </div>

    <!-- Audio Speech Engine Controls -->
    <div class="settings-section">
      <div class="settings-section-title">🎚️ Speech Synthesis Tuning</div>
      <div class="sliders-grid">
        <div class="slider-card">
          <label for="s-rate">Rate <span id="lbl-rate">1.0x</span></label>
          <input id="s-rate" type="range" min="0.7" max="1.4" step="0.05" />
        </div>
        <div class="slider-card">
          <label for="s-pitch">Pitch <span id="lbl-pitch">1.0x</span></label>
          <input id="s-pitch" type="range" min="0.7" max="1.5" step="0.05" />
        </div>
        <div class="slider-card">
          <label for="s-vol">Volume <span id="lbl-vol">100%</span></label>
          <input id="s-vol" type="range" min="0.2" max="1" step="0.05" />
        </div>
      </div>
    </div>

    <!-- Playback Preferences & Progress Reset -->
    <div class="settings-section">
      <div class="settings-section-title">⚡ Playback & Session</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--panel-alt);border-radius:var(--r-md);border:1px solid var(--line)">
        <div>
          <strong style="display:block;font-size:0.92rem">Auto-advance Steps</strong>
          <span style="font-size:0.8rem;color:var(--ink-muted)">Automatically transition dialogue lines when audio completes</span>
        </div>
        <input type="checkbox" id="s-auto" style="width:20px;height:20px;cursor:pointer;accent-color:var(--primary)" />
      </div>

      <button class="btn" id="reset-progress" style="color:var(--danger);border-color:color-mix(in oklab, var(--danger) 30%, var(--line));margin-top:6px">
        ↺ Reset Lesson Progress & History
      </button>
    </div>

    <!-- Drop New Lesson JSON -->
    <div class="settings-section">
      <div class="settings-section-title">📁 Import Lesson Data</div>
      <div class="drop-zone" id="drop-zone">
        Drop a new Avatar Lesson JSON file here to reload
      </div>
    </div>
  </div>
</div>

<!-- Floating Toast -->
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<!-- Embedded JSON Dataset & Runtime Script -->
<script type="application/json" id="lesson-data">${safeJson}</script>
<script>${buildRuntimeScript()}</script>
</body>
</html>`;
};

/* =========================================================================
 * SECTION 7 — REACT AUTHORING APP (paste JSON, validate, preview, download)
 * ========================================================================= */

const useSpeechVoices = (): SpeechSynthesisVoice[] => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const update = () => setVoices(synth.getVoices());
    update();
    synth.addEventListener("voiceschanged", update);
    const timer = window.setTimeout(update, 1400);
    return () => {
      synth.removeEventListener("voiceschanged", update);
      window.clearTimeout(timer);
    };
  }, []);
  return voices;
};

export interface AvatarLessonGeneratorProps {
  initialJson?: string;
}

export const AvatarLessonGenerator: React.FC<AvatarLessonGeneratorProps> = ({
  initialJson = "",
}) => {
  const [rawJson, setRawJson] = useState(initialJson);
  const [parsed, setParsed] = useState<AvatarLessonData | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const voices = useSpeechVoices();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const handleValidate = useCallback(() => {
    try {
      const data = JSON.parse(rawJson) as AvatarLessonData;
      const validation = validateLessonData(data);
      setResult(validation);
      setParsed(validation.errors.length === 0 ? data : null);
    } catch (error) {
      setResult({
        errors: [`JSON parse failed: ${(error as Error).message}`],
        warnings: [],
        reachableNodeIds: [],
        uncoveredConcepts: [],
      });
      setParsed(null);
    }
  }, [rawJson]);

  const handleGenerate = useCallback(() => {
    if (!parsed) return;
    const html = generateStandaloneHtml(parsed);
    setGeneratedHtml(html);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, [parsed]);

  const handleDownload = useCallback(() => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(parsed?.meta.title || "avatar-lesson").replace(/\s+/g, "-").toLowerCase()}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [generatedHtml, parsed]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => setRawJson(String(reader.result));
    reader.readAsText(file);
  }, []);

  const voiceMatchReport = useMemo(() => {
    if (!parsed) return [];
    return parsed.characters.map((character) => {
      const match = resolveVoice(character, voices, parsed);
      const preset = VOICE_PRESETS.find((p) => p.id === character.voicePresetId);
      return {
        id: character.id,
        name: character.name,
        emoji: character.emoji,
        wanted: preset?.azureVoice || character.customVoiceName || "unknown",
        got: match?.name || "no voice available",
        exact: match?.name === (preset?.azureVoice || character.customVoiceName),
      };
    });
  }, [parsed, voices]);

  return (
    <div style={styles.shell}>
      <style>{authoringCss}</style>
      <header style={styles.header}>
        <div>
          <div className="eyebrow-row">
            <span className="pill">Authoring tool</span>
            <span className="pill">React + TypeScript</span>
            <span className="pill">Emits standalone HTML</span>
          </div>
          <h1 className="app-title">Avatar Lesson HTML Generator</h1>
          <p className="app-sub">
            Paste schema-compliant lesson JSON, validate the scenario graph, preview the
            self-contained page, and download a single file that runs offline anywhere.
          </p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={handleValidate}>Validate</button>
          <button className="btn" onClick={handleGenerate} disabled={!parsed}>Generate HTML</button>
          <button className="btn" onClick={handleDownload} disabled={!generatedHtml}>Download .html</button>
        </div>
      </header>

      <div className="grid">
        <section className="col">
          <label className="field-label" htmlFor="json-input">Lesson JSON</label>
          <textarea
            id="json-input"
            className="editor"
            value={rawJson}
            spellCheck={false}
            placeholder="Paste your structured lesson JSON here"
            onChange={(event) => setRawJson(event.target.value)}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            onDragOver={(event) => event.preventDefault()}
          />

          {result ? (
            <div className="report">
              <h3>Validation</h3>
              {result.errors.length === 0 ? (
                <p className="ok">No blocking errors. Graph is coherent.</p>
              ) : (
                <ul className="errors">
                  {result.errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              )}
              {result.warnings.length > 0 ? (
                <details>
                  <summary>{result.warnings.length} warnings</summary>
                  <ul className="warnings">
                    {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}

          {voiceMatchReport.length > 0 ? (
            <div className="report">
              <h3>Voice resolution (this browser)</h3>
              <p className="hint">Open the emitted file in Microsoft Edge for the closest Online Natural matches.</p>
              <ul className="voice-list">
                {voiceMatchReport.map((row) => (
                  <li key={row.id}>
                    <span>{row.emoji} {row.name}</span>
                    <span className={row.exact ? "ok" : "warn"}>{row.got}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="col">
          <label className="field-label">Live preview</label>
          {previewUrl ? (
            <iframe ref={iframeRef} title="Preview" className="preview" src={previewUrl} />
          ) : (
            <div className="preview empty">
              <div>
                <strong>No preview yet.</strong>
                <p>Validate, then Generate HTML to render the standalone page here.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    padding: 32,
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    background:
      "radial-gradient(circle at 10% -5%, oklch(93% 0.05 330 / 0.5), transparent 30%), oklch(97% 0.008 280)",
    color: "oklch(23% 0.018 274)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
    marginBottom: 24,
    flexWrap: "wrap",
  },
};

const authoringCss = String.raw`
.eyebrow-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.pill{padding:7px 12px;border-radius:999px;border:1px solid oklch(87% 0.012 278);background:oklch(95% 0.01 280);font-size:.8rem}
.app-title{font-size:clamp(1.8rem,3vw,2.8rem);line-height:.98;max-width:18ch}
.app-sub{color:oklch(48% 0.015 274);max-width:64ch;margin-top:12px}
.actions{display:flex;gap:12px;flex-wrap:wrap}
.btn{min-height:44px;padding:0 18px;border-radius:14px;border:1px solid oklch(87% 0.012 278);background:oklch(95% 0.01 280);cursor:pointer;transition:transform .16s cubic-bezier(.16,1,.3,1)}
.btn:hover{transform:translateY(-1px)}
.btn.primary{background:oklch(61% 0.19 288);color:oklch(99% 0.01 280);border-color:transparent}
.btn[disabled]{opacity:.45;cursor:not-allowed;transform:none}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media (max-width:1000px){.grid{grid-template-columns:1fr}}
.col{display:flex;flex-direction:column;gap:16px;min-width:0}
.field-label{font-size:.85rem;color:oklch(48% 0.015 274);font-weight:600}
.editor{min-height:420px;border-radius:18px;border:1px solid oklch(87% 0.012 278);padding:16px;background:oklch(99% 0.005 280);font-family:ui-monospace,Menlo,monospace;font-size:.85rem;resize:vertical}
.editor:focus-visible{outline:3px solid oklch(70% 0.19 286/.5);outline-offset:2px}
.report{padding:18px;border-radius:18px;border:1px solid oklch(87% 0.012 278);background:oklch(99% 0.005 280)}
.report h3{margin:0 0 10px}
.ok{color:oklch(52% 0.15 150)} .warn{color:oklch(58% 0.16 66)}
.errors{color:oklch(52% 0.19 24);margin:0;padding-left:18px}
.warnings{margin:8px 0 0;padding-left:18px;color:oklch(50% 0.05 66)}
.hint{color:oklch(48% 0.015 274);font-size:.85rem;margin:0 0 10px}
.voice-list,.errors,.warnings{display:grid;gap:6px}
.voice-list{list-style:none;margin:0;padding:0}
.voice-list li{display:flex;justify-content:space-between;gap:12px;padding:8px 12px;border-radius:10px;background:oklch(95% 0.01 280)}
.preview{width:100%;min-height:640px;border-radius:18px;border:1px solid oklch(87% 0.012 278);background:oklch(99% 0.005 280)}
.preview.empty{display:grid;place-items:center;color:oklch(48% 0.015 274);text-align:center}
`;

export default AvatarLessonGenerator;
