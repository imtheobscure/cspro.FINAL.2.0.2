/**
 * htmlgenerator.tsx
 * -----------------------------------------------------------------------------
 * Avatar Lesson Engine V2 — Interactive Avatar Lesson with Self-Introductions
 *
 * FEATURES:
 * - Clean Light Theme by default with instant Dark Theme toggle.
 * - Realistic 3D-styled Character Avatar portraits with gradient backdrops and deep shadows.
 * - Cast Introduction Stage: Each character introduces himself/herself using their assigned Azure voice.
 * - Live Conversation Stage: Video-call framed conversation with animated audio speaking rings and speech bubbles.
 * - Interactive Learning Blocks: Key Words & Phrases with audio, Comparison Tables, Helpful Tips, and Quick Quizzes.
 * - Rich Branching Decision Scenarios: Meaningful choices, character affinity tracking, and multiple endings.
 * - Simple, friendly, content-driven educational language (no sci-fi or combat jargon).
 * - Emits a single, self-contained standalone HTML artifact with zero CDN runtime dependencies.
 * -----------------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* =============================================================================
 * SECTION 1: TYPES & SCHEMA
 * ============================================================================= */

export type SchemaVersion = "2.0";
export type Gender = "female" | "male" | "neutral";
export type NodeType = "context" | "choice" | "consequence" | "ending";
export type EndingStyle = "success" | "warning" | "tragic" | "bittersweet";
export type Mood = "neutral" | "joy" | "anger" | "fear" | "love" | "sadness" | "shock" | "triumph";
export type ThemeKey = "light" | "dark";

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
  | "definition"
  | "checklist"
  | "timeline";

export type FlagValue = string | number | boolean;
export type FlagMap = Record<string, FlagValue>;

export interface VoicePreset {
  id: string;
  locale: string;
  regionLabel: string;
  displayName: string;
  emoji: string;
  gender: Gender;
  tone: string;
  azureVoice: string;
  fallbackLang: string;
  childTimbre?: boolean;
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  gender: Gender;
  accent: string;
  voicePresetId: string;
  role?: string;
  notes?: string;
  introText?: string;
  baseAffinity?: number;
  fixedVoice?: boolean;
}

export interface DefinitionPair {
  term: string;
  definition: string;
  usageExample?: string;
}

export interface TimelineItem {
  label: string;
  detail: string;
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
  timeline?: TimelineItem[];
}

export interface DialogueLine {
  id: string;
  speakerId: string;
  text: string;
  emotion?: Mood;
}

export interface NarrationLine {
  id: string;
  text: string;
  mood: Mood;
  auto?: boolean;
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
  accent?: string;
  theme?: ThemeKey;
  conceptIds?: string[];
  summary: string;
  objective?: string;
  estimatedMinutes?: number;
  blocks: RichBlock[];
  dialogue?: DialogueLine[];
  narration?: NarrationLine[];
  quickChecks?: QuickCheck[];
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
  act: number;
  title: string;
  body: string;
  speakerId?: string;
  lines?: DialogueLine[];
  narration?: NarrationLine[];
  choices?: ChoiceOption[];
  next?: string;
  reinforces?: string[];
  setsFlags?: FlagMap;
  requiresFlags?: FlagMap;
  affinity?: AffinityDelta[];
  endingStyle?: EndingStyle;
  theme?: ThemeKey;
}

export interface CoverageRule {
  conceptId: string;
  lessonId: string;
  requiredNodeIds: string[];
}

export interface StorySequenceStep {
  id: string;
  type: "lesson" | "transition" | "scenario" | "ending";
  refId: string;
  label: string;
}

export interface AvatarLessonMeta {
  title: string;
  subtitle?: string;
  audience?: string;
  difficulty?: string;
  estimatedMinutes?: number;
  sourceSummary?: string;
  authorNote?: string;
  defaultTheme?: ThemeKey;
}

export interface NarratorProfile {
  id: "narrator";
  name: string;
  fixedVoice: "ava";
  defaultEmoji: string;
  moodEmojiMap: Record<Mood, string>;
  title?: string;
  dockPosition?: "bottom-left";
}

export interface AvatarLessonDataV2 {
  schemaVersion: SchemaVersion;
  meta: AvatarLessonMeta;
  narrator: NarratorProfile;
  characters: Character[];
  lessons: MiniLesson[];
  scenario: {
    startNode: string;
    nodes: Record<string, ScenarioNode>;
    coverageRules?: CoverageRule[];
    sequence?: StorySequenceStep[];
  };
}

/* =============================================================================
 * SECTION 2: VOICE CATALOG (MICROSOFT AZURE NATURAL VOICES)
 * ============================================================================= */

export const VOICE_PRESETS: VoicePreset[] = [
  { id: "ava", locale: "en-US", regionLabel: "United States", displayName: "Ava", emoji: "🎙️", gender: "female", tone: "Natural AI Guide", azureVoice: "en-US-AvaMultilingualNeural", fallbackLang: "en-US" },
  { id: "jenny", locale: "en-US", regionLabel: "United States", displayName: "Jenny", emoji: "👩‍💼", gender: "female", tone: "Clear & Professional", azureVoice: "en-US-JennyNeural", fallbackLang: "en-US" },
  { id: "guy", locale: "en-US", regionLabel: "United States", displayName: "Guy", emoji: "👨‍💻", gender: "male", tone: "Friendly & Confident", azureVoice: "en-US-GuyNeural", fallbackLang: "en-US" },
  { id: "aria", locale: "en-US", regionLabel: "United States", displayName: "Aria", emoji: "👩‍🏫", gender: "female", tone: "Engaging & Clear", azureVoice: "en-US-AriaNeural", fallbackLang: "en-US" },
  { id: "andrew", locale: "en-US", regionLabel: "United States", displayName: "Andrew", emoji: "👨‍💼", gender: "male", tone: "Polished & Warm", azureVoice: "en-US-AndrewMultilingualNeural", fallbackLang: "en-US" },
  { id: "christopher", locale: "en-US", regionLabel: "United States", displayName: "Christopher", emoji: "👨‍🏫", gender: "male", tone: "Articulate & Direct", azureVoice: "en-US-ChristopherNeural", fallbackLang: "en-US" },
  { id: "eric", locale: "en-US", regionLabel: "United States", displayName: "Eric", emoji: "👨‍🔬", gender: "male", tone: "Analytical & Calm", azureVoice: "en-US-EricNeural", fallbackLang: "en-US" },
  { id: "steffan", locale: "en-US", regionLabel: "United States", displayName: "Steffan", emoji: "👨‍🎨", gender: "male", tone: "Expressive & Natural", azureVoice: "en-US-SteffanNeural", fallbackLang: "en-US" },
  { id: "sonia", locale: "en-GB", regionLabel: "United Kingdom", displayName: "Sonia", emoji: "🎨", gender: "female", tone: "Refined & Warm", azureVoice: "en-GB-SoniaNeural", fallbackLang: "en-GB" },
  { id: "ryan", locale: "en-GB", regionLabel: "United Kingdom", displayName: "Ryan", emoji: "📊", gender: "male", tone: "Professional & Articulate", azureVoice: "en-GB-RyanNeural", fallbackLang: "en-GB" },
  { id: "libby", locale: "en-GB", regionLabel: "United Kingdom", displayName: "Libby", emoji: "👩‍🎓", gender: "female", tone: "Approachable & Lively", azureVoice: "en-GB-LibbyNeural", fallbackLang: "en-GB" },
  { id: "oliver", locale: "en-GB", regionLabel: "United Kingdom", displayName: "Oliver", emoji: "👨‍💼", gender: "male", tone: "Composed & Direct", azureVoice: "en-GB-OliverNeural", fallbackLang: "en-GB" },
  { id: "clara", locale: "en-CA", regionLabel: "Canada", displayName: "Clara", emoji: "👩‍⚕️", gender: "female", tone: "Clear & Reassuring", azureVoice: "en-CA-ClaraNeural", fallbackLang: "en-CA" },
  { id: "liam", locale: "en-CA", regionLabel: "Canada", displayName: "Liam", emoji: "👨‍🔧", gender: "male", tone: "Practical & Upbeat", azureVoice: "en-CA-LiamNeural", fallbackLang: "en-CA" },
  { id: "natasha", locale: "en-AU", regionLabel: "Australia", displayName: "Natasha", emoji: "👩‍💻", gender: "female", tone: "Dynamic & Friendly", azureVoice: "en-AU-NatashaNeural", fallbackLang: "en-AU" },
  { id: "william", locale: "en-AU", regionLabel: "Australia", displayName: "William", emoji: "👨‍🎓", gender: "male", tone: "Enthusiastic & Clear", azureVoice: "en-AU-WilliamNeural", fallbackLang: "en-AU" },
  { id: "neerja", locale: "en-IN", regionLabel: "India", displayName: "Neerja", emoji: "👩‍💼", gender: "female", tone: "Clear & Articulate", azureVoice: "en-IN-NeerjaNeural", fallbackLang: "en-IN" },
  { id: "prabhat", locale: "en-IN", regionLabel: "India", displayName: "Prabhat", emoji: "👨‍💻", gender: "male", tone: "Structured & Polite", azureVoice: "en-IN-PrabhatNeural", fallbackLang: "en-IN" },
  { id: "yan", locale: "en-HK", regionLabel: "Hong Kong", displayName: "Yan", emoji: "👩‍💼", gender: "female", tone: "Concise & Professional", azureVoice: "en-HK-YanNeural", fallbackLang: "en-HK" },
  { id: "sam", locale: "en-HK", regionLabel: "Hong Kong", displayName: "Sam", emoji: "👨‍💻", gender: "male", tone: "Direct & Engaging", azureVoice: "en-HK-SamNeural", fallbackLang: "en-HK" },
  { id: "luna", locale: "en-SG", regionLabel: "Singapore", displayName: "Luna", emoji: "👩‍🔬", gender: "female", tone: "Articulate & Modern", azureVoice: "en-SG-LunaNeural", fallbackLang: "en-SG" },
  { id: "wayne", locale: "en-SG", regionLabel: "Singapore", displayName: "Wayne", emoji: "👨‍🔬", gender: "male", tone: "Precise & Collaborative", azureVoice: "en-SG-WayneNeural", fallbackLang: "en-SG" },
  { id: "emily", locale: "en-IE", regionLabel: "Ireland", displayName: "Emily", emoji: "👩‍🌾", gender: "female", tone: "Warm & Melodic", azureVoice: "en-IE-EmilyNeural", fallbackLang: "en-IE" },
  { id: "connor", locale: "en-IE", regionLabel: "Ireland", displayName: "Connor", emoji: "👨‍🌾", gender: "male", tone: "Engaging & Friendly", azureVoice: "en-IE-ConnorNeural", fallbackLang: "en-IE" },
];

export const NARRATOR_VOICE_ID = "ava";

export interface ThemeDefinition {
  key: ThemeKey;
  label: string;
  primary: string;
  secondary: string;
  bgCanvas: string;
  panelCard: string;
  inkHeading: string;
}

export const THEMES: ThemeDefinition[] = [
  { key: "light", label: "Light Theme", primary: "#2563eb", secondary: "#0d9488", bgCanvas: "#f8fafc", panelCard: "#ffffff", inkHeading: "#0f172a" },
  { key: "dark", label: "Dark Theme", primary: "#38bdf8", secondary: "#2dd4bf", bgCanvas: "#0b0f19", panelCard: "#131b2e", inkHeading: "#f8fafc" },
];

export const escapeHtml = (value: string): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* =============================================================================
 * SECTION 3: VALIDATION
 * ============================================================================= */

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export const validateLessonDataV2 = (data: unknown): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    return { errors: ["Payload must be a JSON object."], warnings: [] };
  }

  const lesson = data as Partial<AvatarLessonDataV2>;

  if (lesson.schemaVersion !== "2.0") {
    errors.push('schemaVersion must be exactly "2.0".');
  }

  if (!lesson.meta?.title) errors.push("meta.title is required.");
  if (!lesson.narrator) {
    errors.push("narrator profile is required.");
  }

  if (!Array.isArray(lesson.characters) || lesson.characters.length === 0) {
    errors.push("At least one character is required in the characters roster.");
  } else {
    lesson.characters.forEach((char, idx) => {
      if (!char.id) errors.push(`characters[${idx}] must have an id.`);
      if (!char.name) errors.push(`characters[${idx}] must have a name.`);
      if (!char.voicePresetId) errors.push(`characters[${idx}] (${char.name || "unnamed"}) must have a voicePresetId.`);
    });
  }

  if (!Array.isArray(lesson.lessons) || lesson.lessons.length === 0) {
    errors.push("At least one mini-lesson is required.");
  }

  if (!lesson.scenario || typeof lesson.scenario !== "object") {
    errors.push("scenario object is required.");
  } else {
    if (!lesson.scenario.startNode) errors.push("scenario.startNode is required.");
    if (!lesson.scenario.nodes || Object.keys(lesson.scenario.nodes).length === 0) {
      errors.push("scenario.nodes must contain at least one node.");
    }
  }

  return { errors, warnings };
};

/* =============================================================================
 * SECTION 4: STANDALONE RUNTIME CSS & JAVASCRIPT
 * ============================================================================= */

const RUNTIME_CSS = String.raw`
:root, [data-theme="light"] {
  --bg-canvas: #f8fafc;
  --panel-card: #ffffff;
  --panel-alt: #f1f5f9;
  --panel-hover: #e2e8f0;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: #eff6ff;
  --primary-border: #bfdbfe;
  --secondary: #0d9488;
  --secondary-light: #f0fdf4;
  --ink-heading: #0f172a;
  --ink-body: #334155;
  --ink-muted: #64748b;
  --border-card: #e2e8f0;
  --border-light: #f1f5f9;
  --shadow-card: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
  --shadow-avatar: 0 14px 28px -4px rgba(37, 99, 235, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.9);
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-avatar: 22px;
  --radius-pill: 9999px;
  --font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

[data-theme="dark"] {
  --bg-canvas: #0b0f19;
  --panel-card: #131b2e;
  --panel-alt: #1e293b;
  --panel-hover: #273549;
  --primary: #38bdf8;
  --primary-hover: #0284c7;
  --primary-light: rgba(56, 189, 248, 0.12);
  --primary-border: rgba(56, 189, 248, 0.28);
  --secondary: #2dd4bf;
  --secondary-light: rgba(45, 212, 191, 0.12);
  --ink-heading: #f8fafc;
  --ink-body: #e2e8f0;
  --ink-muted: #94a3b8;
  --border-card: rgba(255, 255, 255, 0.1);
  --border-light: rgba(255, 255, 255, 0.06);
  --shadow-card: 0 14px 32px rgba(0, 0, 0, 0.4);
  --shadow-avatar: 0 14px 28px -4px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg-canvas);
  color: var(--ink-body);
  font-family: var(--font-family);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  line-height: 1.65;
  font-size: 17px;
  transition: background-color 0.25s ease, color 0.25s ease;
}

/* App Header */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--panel-card);
  border-bottom: 1px solid var(--border-card);
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.lesson-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary-light);
  color: var(--primary);
  border: 1px solid var(--primary-border);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.lesson-title-main {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 480px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.xp-counter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-weight: 700;
  font-size: 14px;
}

[data-theme="dark"] .xp-counter {
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.3);
}

.theme-toggle-btn {
  background: var(--panel-alt);
  color: var(--ink-heading);
  border: 1px solid var(--border-card);
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.theme-toggle-btn:hover {
  background: var(--panel-hover);
}

/* Stage Navigation Tracker */
.stage-tracker-bar {
  background: var(--panel-card);
  border-bottom: 1px solid var(--border-card);
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow-x: auto;
}

.tracker-step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tracker-step.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 700;
}

.tracker-step.completed {
  color: var(--secondary);
}

.tracker-divider {
  color: var(--border-card);
  font-size: 12px;
}

/* Main Container */
.main-stage-container {
  flex: 1;
  max-width: 1020px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 20px 80px 20px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Realistic 3D Avatar Frame */
.avatar-portrait-frame {
  width: 84px;
  height: 84px;
  border-radius: var(--radius-avatar);
  background: radial-gradient(circle at 35% 30%, #ffffff, #e0e7ff 70%, #c7d2fe 100%);
  border: 3px solid #ffffff;
  box-shadow: var(--shadow-avatar);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

[data-theme="dark"] .avatar-portrait-frame {
  background: radial-gradient(circle at 35% 30%, #1e293b, #0f172a 75%, #020617 100%);
  border-color: rgba(255, 255, 255, 0.15);
}

.avatar-portrait-frame:hover {
  transform: translateY(-3px) scale(1.03);
}

.avatar-emoji-large {
  font-size: 46px;
  line-height: 1;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.16));
  user-select: none;
}

/* Speaking Pulsing Sound Ring */
.avatar-portrait-frame.is-speaking {
  animation: avatarPulseRing 1.6s infinite;
}

@keyframes avatarPulseRing {
  0% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.6), var(--shadow-avatar);
  }
  70% {
    box-shadow: 0 0 0 14px rgba(37, 99, 235, 0), var(--shadow-avatar);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0), var(--shadow-avatar);
  }
}

/* Narrator Audio Banner */
.narrator-banner {
  background: var(--panel-card);
  border: 1px solid var(--border-card);
  border-left: 5px solid var(--primary);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-shadow: var(--shadow-card);
}

.narrator-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.narrator-avatar-mini {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.narrator-text {
  font-size: 16px;
  color: var(--ink-heading);
  font-weight: 500;
}

.narrator-voice-btn {
  background: var(--primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-pill);
  padding: 8px 16px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.narrator-voice-btn:hover {
  background: var(--primary-hover);
}

/* =============================================================================
 * STAGE 1: MEET THE TEAM (CAST INTRODUCTION)
 * ============================================================================= */
.cast-showcase-panel {
  background: var(--panel-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.showcase-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 20px;
}

.showcase-title-group h2 {
  font-size: 26px;
  font-weight: 800;
  color: var(--ink-heading);
  margin-bottom: 6px;
}

.showcase-title-group p {
  font-size: 16px;
  color: var(--ink-muted);
}

.autoplay-all-btn {
  background: var(--primary);
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-pill);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.autoplay-all-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.cast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.character-card {
  background: var(--panel-alt);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.25s ease;
  position: relative;
}

.character-card.is-active-speaker {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-border);
  background: var(--primary-light);
}

.char-top-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.char-info-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.char-name {
  font-size: 19px;
  font-weight: 800;
  color: var(--ink-heading);
}

.char-role-badge {
  display: inline-block;
  background: var(--panel-card);
  color: var(--primary);
  border: 1px solid var(--border-card);
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
  width: fit-content;
}

.char-accent-chip {
  font-size: 12px;
  color: var(--ink-muted);
}

.char-intro-bubble {
  background: var(--panel-card);
  border: 1px solid var(--border-card);
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  color: var(--ink-body);
  position: relative;
  line-height: 1.5;
  font-style: italic;
}

.char-intro-bubble::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 24px;
  border-width: 0 8px 8px 8px;
  border-style: solid;
  border-color: transparent transparent var(--border-card) transparent;
}

.char-listen-btn {
  background: var(--panel-card);
  color: var(--ink-heading);
  border: 1px solid var(--border-card);
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.char-listen-btn:hover {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary-border);
}

.start-lesson-cta-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.primary-cta-btn {
  background: var(--primary);
  color: #ffffff;
  border: none;
  padding: 14px 28px;
  border-radius: var(--radius-pill);
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
  transition: all 0.2s ease;
}

.primary-cta-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
}

/* =============================================================================
 * STAGE 2: LESSON CONTENT BLOCKS
 * ============================================================================= */
.lesson-card-panel {
  background: var(--panel-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.lesson-header-box h2 {
  font-size: 26px;
  font-weight: 800;
  color: var(--ink-heading);
  margin-bottom: 6px;
}

.lesson-header-box p {
  font-size: 17px;
  color: var(--ink-muted);
}

.blocks-stream {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.paragraph-block {
  font-size: 18px;
  line-height: 1.7;
  color: var(--ink-body);
}

/* Definitions Grid */
.definitions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.definition-card {
  background: var(--panel-alt);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.def-term {
  font-size: 18px;
  font-weight: 800;
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.def-meaning {
  font-size: 16px;
  color: var(--ink-body);
}

.def-example {
  background: var(--panel-card);
  border-left: 3px solid var(--primary);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--ink-muted);
  font-style: italic;
}

/* Clean Table */
.table-responsive-box {
  overflow-x: auto;
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
}

.clean-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 16px;
}

.clean-table th {
  background: var(--panel-alt);
  color: var(--ink-heading);
  font-weight: 700;
  padding: 14px 16px;
  border-bottom: 2px solid var(--border-card);
}

.clean-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  color: var(--ink-body);
}

.clean-table tr:last-child td {
  border-bottom: none;
}

/* Helpful Callouts */
.callout-box {
  background: var(--secondary-light);
  border: 1px solid var(--secondary);
  border-radius: var(--radius-md);
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.callout-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.callout-body {
  font-size: 16px;
  color: var(--ink-body);
}

/* =============================================================================
 * STAGE 3: LIVE CONVERSATION VIDEO FRAME (DIALOGUE)
 * ============================================================================= */
.live-dialogue-video-frame {
  background: var(--panel-card);
  border: 2px solid var(--border-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  margin: 16px 0;
}

.video-frame-top-bar {
  background: #0f172a;
  color: #ffffff;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #4ade80;
}

.live-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 10px #ef4444;
  animation: liveDotBlink 1.2s infinite;
}

@keyframes liveDotBlink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.85); }
}

.video-frame-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.video-ctrl-btn {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.video-ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}

.video-participants-podium {
  background: #1e293b;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
}

.video-participant-tile {
  background: #0f172a;
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ffffff;
  transition: all 0.25s ease;
  position: relative;
  min-width: 170px;
}

.video-participant-tile.is-active-speaker {
  border-color: #6366f1;
  background: #1e1b4b;
  box-shadow: 0 0 24px rgba(99, 102, 241, 0.55);
  transform: translateY(-2px) scale(1.03);
}

.video-participant-tile .speaker-wave {
  display: none;
  font-size: 11px;
  font-weight: 700;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.16);
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #4ade80;
}

.video-participant-tile.is-active-speaker .speaker-wave {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  animation: liveDotBlink 1.4s infinite;
}

.dialogue-chat-stream {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: var(--bg-canvas);
}

.chat-bubble-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 16px;
}

.chat-bubble-row.is-active-speaker {
  background: rgba(99, 102, 241, 0.06);
}

.chat-bubble-row.is-active-speaker .avatar-portrait-frame {
  animation: avatarPulseRing 1.6s infinite;
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.45);
}

.chat-bubble-row.is-active-speaker .chat-bubble-content {
  border-color: #6366f1;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.12);
}

.chat-bubble-content {
  background: var(--panel-card);
  border: 1.5px solid var(--border-card);
  border-radius: 18px;
  border-top-left-radius: 4px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: var(--shadow-card);
  max-width: 680px;
  width: 100%;
}

.chat-speaker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chat-speaker-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--primary);
}

.line-audio-trigger-btn {
  background: var(--panel-alt);
  color: var(--ink-muted);
  border: none;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.line-audio-trigger-btn:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.chat-text-line {
  font-size: 18px;
  line-height: 1.55;
  color: var(--ink-heading);
}

/* =============================================================================
 * STAGE 4: QUICK CHECK / QUIZ
 * ============================================================================= */
.quick-check-panel {
  background: var(--panel-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.qc-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.qc-badge {
  background: var(--primary-light);
  color: var(--primary);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 700;
}

.qc-question-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink-heading);
}

.qc-options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qc-option-btn {
  background: var(--panel-alt);
  border: 2px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  font-size: 17px;
  font-weight: 600;
  color: var(--ink-body);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.qc-option-btn:hover {
  background: var(--panel-hover);
  border-color: var(--primary);
}

.qc-option-btn.correct {
  background: #ecfdf5;
  border-color: #10b981;
  color: #065f46;
}

.qc-option-btn.incorrect {
  background: #fef2f2;
  border-color: #ef4444;
  color: #991b1b;
}

.qc-feedback-box {
  background: var(--panel-alt);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 16px;
  font-size: 16px;
  color: var(--ink-body);
}

/* =============================================================================
 * STAGE 5: SCENARIO & BRANCHING DECISIONS
 * ============================================================================= */
.scenario-decision-panel {
  background: var(--panel-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.scenario-act-badge {
  display: inline-block;
  background: var(--primary-light);
  color: var(--primary);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 700;
  width: fit-content;
}

.scenario-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--ink-heading);
}

.scenario-body-desc {
  font-size: 18px;
  line-height: 1.7;
  color: var(--ink-body);
}

.choices-heading {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-heading);
  margin-top: 8px;
}

.choices-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.choice-card-btn {
  background: var(--panel-alt);
  border: 2px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 20px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice-card-btn:hover {
  border-color: var(--primary);
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
}

.choice-label-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-heading);
}

.choice-hint-chip {
  font-size: 14px;
  color: var(--ink-muted);
}

.affinity-chips-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.affinity-chip {
  background: var(--panel-card);
  border: 1px solid var(--border-card);
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
}

.affinity-chip.positive {
  color: #16a34a;
}

.affinity-chip.negative {
  color: #dc2626;
}

/* =============================================================================
 * STAGE 6: LESSON SUMMARY & COMPLETION
 * ============================================================================= */
.summary-completion-panel {
  background: var(--panel-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 20px;
}

.completion-trophy-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fef08a, #eab308);
  box-shadow: 0 16px 32px rgba(234, 179, 8, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50px;
}

.completion-title {
  font-size: 32px;
  font-weight: 800;
  color: var(--ink-heading);
}

.completion-desc {
  font-size: 18px;
  max-width: 620px;
  color: var(--ink-body);
  line-height: 1.6;
}

.completion-metrics-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin: 12px 0;
}

.metric-stat-box {
  background: var(--panel-alt);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-stat-val {
  font-size: 28px;
  font-weight: 800;
  color: var(--primary);
}

.metric-stat-label {
  font-size: 13px;
  color: var(--ink-muted);
  font-weight: 600;
}

@media (max-width: 640px) {
  .app-header {
    padding: 10px 14px;
  }
  .lesson-title-main {
    max-width: 200px;
    font-size: 16px;
  }
  .main-stage-container {
    padding: 16px 12px 60px 12px;
  }
  .cast-showcase-panel,
  .lesson-card-panel,
  .scenario-decision-panel,
  .summary-completion-panel {
    padding: 20px 16px;
  }
  .avatar-portrait-frame {
    width: 68px;
    height: 68px;
  }
  .avatar-emoji-large {
    font-size: 38px;
  }
}
`;

const RUNTIME_JS = String.raw`
(function() {
  var lessonData = window.__AVATAR_LESSON_DATA_V2__;
  if (!lessonData) return;

  var currentTheme = lessonData.meta.defaultTheme || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);

  var totalXP = 0;
  var affinityMap = {};
  if (Array.isArray(lessonData.characters)) {
    lessonData.characters.forEach(function(c) {
      affinityMap[c.id] = c.baseAffinity !== undefined ? c.baseAffinity : 50;
    });
  }

  // Azure Natural Voice mapping & Speech Synthesis helper
  var azureToLang = {
    'en-US-AvaMultilingualNeural': 'en-US',
    'en-US-JennyNeural': 'en-US',
    'en-US-GuyNeural': 'en-US',
    'en-US-AriaNeural': 'en-US',
    'en-US-AndrewMultilingualNeural': 'en-US',
    'en-US-ChristopherNeural': 'en-US',
    'en-US-EricNeural': 'en-US',
    'en-US-SteffanNeural': 'en-US',
    'en-GB-SoniaNeural': 'en-GB',
    'en-GB-RyanNeural': 'en-GB',
    'en-GB-LibbyNeural': 'en-GB',
    'en-GB-OliverNeural': 'en-GB',
    'en-CA-ClaraNeural': 'en-CA',
    'en-CA-LiamNeural': 'en-CA',
    'en-AU-NatashaNeural': 'en-AU',
    'en-AU-WilliamNeural': 'en-AU',
    'en-IN-NeerjaNeural': 'en-IN',
    'en-IN-PrabhatNeural': 'en-IN',
    'en-HK-YanNeural': 'en-HK',
    'en-HK-SamNeural': 'en-HK',
    'en-SG-LunaNeural': 'en-SG',
    'en-SG-WayneNeural': 'en-SG',
    'en-IE-EmilyNeural': 'en-IE',
    'en-IE-ConnorNeural': 'en-IE'
  };

  var charVoiceMap = {};
  if (Array.isArray(lessonData.characters)) {
    lessonData.characters.forEach(function(c) {
      charVoiceMap[c.id] = c.voicePresetId || 'jenny';
    });
  }

  function getCharacterById(id) {
    if (!lessonData.characters) return null;
    for (var i = 0; i < lessonData.characters.length; i++) {
      if (lessonData.characters[i].id === id) return lessonData.characters[i];
    }
    return null;
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

  function resolveNaturalVoice(voicePresetId, charGender) {
    if (!('speechSynthesis' in window)) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    var config = VOICE_CONFIG_MAP[voicePresetId] || { names: [voicePresetId || ''], gender: charGender || 'female', lang: 'en-US' };
    var targetLang = config.lang || 'en-US';
    var targetGender = config.gender || charGender || 'female';

    var scored = voices.map(function(v) {
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

      // REWARDS FOR MODERN NATURAL / NEURAL / HIGH QUALITY VOICES
      if (nameLower.indexOf('natural') !== -1 || nameLower.indexOf('neural') !== -1 || nameLower.indexOf('online') !== -1) score += 3000;
      if (nameLower.indexOf('google') !== -1) score += 2000;
      if (nameLower.indexOf('samantha') !== -1 || nameLower.indexOf('daniel') !== -1 || nameLower.indexOf('karen') !== -1 || nameLower.indexOf('moira') !== -1) score += 1500;
      if (nameLower.indexOf('premium') !== -1 || nameLower.indexOf('enhanced') !== -1) score += 1000;

      // TARGET PRESET MATCH
      for (var k = 0; k < config.names.length; k++) {
        var n = config.names[k].toLowerCase();
        if (n && nameLower.indexOf(n) !== -1) {
          score += 4000;
          break;
        }
      }

      // LOCALE MATCH
      if (langLower === targetLang.toLowerCase()) {
        score += 1500;
      } else if (langLower.startsWith(targetLang.slice(0, 2).toLowerCase())) {
        score += 800;
      }

      // GENDER HEURISTIC
      var isVoiceFemale = nameLower.indexOf('female') !== -1 || nameLower.indexOf('samantha') !== -1 || nameLower.indexOf('jenny') !== -1 || nameLower.indexOf('aria') !== -1 || nameLower.indexOf('sonia') !== -1 || nameLower.indexOf('natasha') !== -1 || nameLower.indexOf('ava') !== -1 || nameLower.indexOf('clara') !== -1 || nameLower.indexOf('libby') !== -1 || nameLower.indexOf('zira') !== -1;
      var isVoiceMale = nameLower.indexOf('male') !== -1 || nameLower.indexOf('guy') !== -1 || nameLower.indexOf('ryan') !== -1 || nameLower.indexOf('william') !== -1 || nameLower.indexOf('andrew') !== -1 || nameLower.indexOf('oliver') !== -1 || nameLower.indexOf('daniel') !== -1 || nameLower.indexOf('david') !== -1;
      if (targetGender === 'female' && isVoiceFemale) score += 800;
      if (targetGender === 'male' && isVoiceMale) score += 800;
      if (targetGender === 'female' && isVoiceMale) score -= 1200;
      if (targetGender === 'male' && isVoiceFemale) score -= 1200;

      return { voice: v, score: score };
    });

    scored.sort(function(a, b) { return b.score - a.score; });
    return scored[0] ? scored[0].voice : voices[0];
  }

  function speakText(text, voicePresetId, onEndCallback) {
    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    var resolvedVoice = resolveNaturalVoice(voicePresetId);
    if (resolvedVoice) {
      utterance.voice = resolvedVoice;
      utterance.lang = resolvedVoice.lang || 'en-US';
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (onEndCallback) {
      utterance.onend = onEndCallback;
      utterance.onerror = onEndCallback;
    }
    window.speechSynthesis.speak(utterance);
  }

  function stopAudio() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Navigation Steps
  var currentStepIndex = 0;
  // Steps: 0 = Cast Intro, 1..N = Lessons, N+1 = Scenario, N+2 = Summary
  var totalLessons = Array.isArray(lessonData.lessons) ? lessonData.lessons.length : 0;

  function updateXP(amount) {
    totalXP += amount;
    var el = document.getElementById('xp-counter-val');
    if (el) el.textContent = totalXP;
  }

  function renderStage() {
    var container = document.getElementById('stage-content-area');
    if (!container) return;
    stopAudio();

    if (currentStepIndex === 0) {
      renderCastShowcase(container);
    } else if (currentStepIndex <= totalLessons) {
      var lessonIdx = currentStepIndex - 1;
      renderLesson(container, lessonData.lessons[lessonIdx], lessonIdx);
    } else if (currentStepIndex === totalLessons + 1) {
      renderScenario(container);
    } else {
      renderCompletion(container);
    }
    updateTrackerUI();
  }

  function updateTrackerUI() {
    var stepBtns = document.querySelectorAll('.tracker-step');
    stepBtns.forEach(function(btn, idx) {
      if (idx === currentStepIndex) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /* =====================
   * STAGE: CAST SHOWCASE
   * ===================== */
  function renderCastShowcase(container) {
    var html = '<div class="cast-showcase-panel">';
    html += '<div class="showcase-header">';
    html += '<div class="showcase-title-group">';
    html += '<h2>Meet the Team</h2>';
    html += '<p>Listen to each team member introduce themselves and their role in this lesson.</p>';
    html += '</div>';
    html += '<button id="btn-autoplay-intros" class="autoplay-all-btn">▶ Listen to All Introductions</button>';
    html += '</div>';

    html += '<div class="cast-grid">';
    lessonData.characters.forEach(function(char, idx) {
      var intro = char.introText || ("Hello! I am " + char.name + " (" + (char.role || 'Team Member') + "). Let's work together.");
      html += '<div class="character-card" id="char-card-' + char.id + '">';
      html += '<div class="char-top-row">';
      html += '<div class="avatar-portrait-frame" id="avatar-frame-' + char.id + '"><span class="avatar-emoji-large">' + (char.emoji || '👤') + '</span></div>';
      html += '<div class="char-info-meta">';
      html += '<span class="char-name">' + char.name + '</span>';
      if (char.role) html += '<span class="char-role-badge">' + char.role + '</span>';
      if (char.accent) html += '<span class="char-accent-chip">' + char.accent + '</span>';
      html += '</div>';
      html += '</div>';
      html += '<div class="char-intro-bubble">"' + intro + '"</div>';
      html += '<button class="char-listen-btn" data-char-id="' + char.id + '" data-char-intro="' + encodeURIComponent(intro) + '" data-char-voice="' + (char.voicePresetId || 'jenny') + '">🗣️ Listen to ' + char.name.split(' ')[0] + '</button>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="start-lesson-cta-bar">';
    html += '<button id="btn-start-first-lesson" class="primary-cta-btn">Start Lesson 1 →</button>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    // Attach click handlers
    document.querySelectorAll('.char-listen-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var charId = btn.getAttribute('data-char-id');
        var introText = decodeURIComponent(btn.getAttribute('data-char-intro'));
        var voiceId = btn.getAttribute('data-char-voice');
        highlightSpeaker(charId);
        speakText(introText, voiceId, function() {
          unhighlightSpeaker(charId);
        });
      });
    });

    var autoplayBtn = document.getElementById('btn-autoplay-intros');
    if (autoplayBtn) {
      autoplayBtn.addEventListener('click', function() {
        playAllIntroductions(0);
      });
    }

    var startBtn = document.getElementById('btn-start-first-lesson');
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        updateXP(50);
        currentStepIndex = 1;
        renderStage();
      });
    }
  }

  function highlightSpeaker(charId) {
    document.querySelectorAll('.character-card').forEach(function(c) { c.classList.remove('is-active-speaker'); });
    document.querySelectorAll('.avatar-portrait-frame').forEach(function(a) { a.classList.remove('is-speaking'); });
    var card = document.getElementById('char-card-' + charId);
    if (card) card.classList.add('is-active-speaker');
    var frame = document.getElementById('avatar-frame-' + charId);
    if (frame) frame.classList.add('is-speaking');
  }

  function unhighlightSpeaker(charId) {
    var card = document.getElementById('char-card-' + charId);
    if (card) card.classList.remove('is-active-speaker');
    var frame = document.getElementById('avatar-frame-' + charId);
    if (frame) frame.classList.remove('is-speaking');
  }

  function playAllIntroductions(index) {
    if (!lessonData.characters || index >= lessonData.characters.length) return;
    var char = lessonData.characters[index];
    var intro = char.introText || ("Hello! I am " + char.name + " (" + (char.role || 'Team Member') + "). Let's work together.");
    highlightSpeaker(char.id);
    speakText(intro, char.voicePresetId, function() {
      unhighlightSpeaker(char.id);
      playAllIntroductions(index + 1);
    });
  }

  /* =====================
   * STAGE: MINI LESSON
   * ===================== */
  function renderLesson(container, lesson, lessonIdx) {
    var html = '<div class="lesson-card-panel">';
    html += '<div class="lesson-header-box">';
    html += '<h2>' + (lessonIdx + 1) + '. ' + lesson.title + '</h2>';
    if (lesson.summary) html += '<p>' + lesson.summary + '</p>';
    html += '</div>';

    // Blocks
    if (Array.isArray(lesson.blocks)) {
      html += '<div class="blocks-stream">';
      lesson.blocks.forEach(function(b) {
        if (b.type === 'paragraph' && b.body) {
          html += '<p class="paragraph-block">' + b.body + '</p>';
        } else if (b.type === 'definition' && Array.isArray(b.definitions)) {
          html += '<div class="definitions-grid">';
          b.definitions.forEach(function(def) {
            html += '<div class="definition-card">';
            html += '<span class="def-term">' + def.term + ' <button class="line-audio-trigger-btn" onclick="window.__speakPhrase(\'' + encodeURIComponent(def.term) + '\')">🔊</button></span>';
            html += '<p class="def-meaning">' + def.definition + '</p>';
            if (def.usageExample) html += '<div class="def-example">' + def.usageExample + '</div>';
            html += '</div>';
          });
          html += '</div>';
        } else if (b.type === 'table' && Array.isArray(b.rows)) {
          html += '<div class="table-responsive-box">';
          html += '<table class="clean-table">';
          if (Array.isArray(b.headers)) {
            html += '<thead><tr>';
            b.headers.forEach(function(h) { html += '<th>' + h + '</th>'; });
            html += '</tr></thead>';
          }
          html += '<tbody>';
          b.rows.forEach(function(row) {
            html += '<tr>';
            row.forEach(function(cell) { html += '<td>' + cell + '</td>'; });
            html += '</tr>';
          });
          html += '</tbody></table></div>';
        } else if (b.type === 'callout') {
          html += '<div class="callout-box">';
          if (b.title) html += '<div class="callout-title">💡 ' + b.title + '</div>';
          if (b.body) html += '<div class="callout-body">' + b.body + '</div>';
          html += '</div>';
        }
      });
      html += '</div>';
    }

    // Dialogue (Live Conversation Video Frame)
    if (Array.isArray(lesson.dialogue) && lesson.dialogue.length > 0) {
      // Find unique speakers participating in this dialogue
      var speakerIds = [];
      lesson.dialogue.forEach(function(line) {
        if (line.speakerId && speakerIds.indexOf(line.speakerId) === -1) {
          speakerIds.push(line.speakerId);
        }
      });
      var participatingChars = speakerIds.map(function(id) {
        return getCharacterById(id) || { id: id, name: 'Team Member', emoji: '👤', role: 'Participant', voicePresetId: 'jenny' };
      });

      html += '<div class="live-dialogue-video-frame">';
      html += '<div class="video-frame-top-bar">';
      html += '<span class="live-indicator"><span class="live-dot"></span> LIVE CONVERSATION STAGE</span>';
      html += '<div class="video-frame-controls">';
      html += '<button id="btn-play-dialogue" class="video-ctrl-btn">▶ Autoplay Conversation</button>';
      html += '<button id="btn-stop-dialogue" class="video-ctrl-btn">⏹ Stop Audio</button>';
      html += '</div>';
      html += '</div>';

      // Video Participants Grid (Podium)
      if (participatingChars.length > 0) {
        html += '<div class="video-participants-podium" id="video-podium">';
        participatingChars.forEach(function(char) {
          html += '<div class="video-participant-tile" id="podium-char-' + char.id + '">';
          html += '<span style="font-size: 32px; line-height: 1;">' + char.emoji + '</span>';
          html += '<div style="display: flex; flex-direction: column; gap: 2px;">';
          html += '<span style="font-size: 14px; font-weight: 700;">' + char.name + '</span>';
          html += '<span style="font-size: 11px; opacity: 0.8;">' + (char.role || char.accent || 'Speaker') + '</span>';
          html += '</div>';
          html += '<span class="speaker-wave">🌊 Speaking</span>';
          html += '</div>';
        });
        html += '</div>';
      }

      html += '<div class="dialogue-chat-stream" id="dialogue-stream">';
      lesson.dialogue.forEach(function(line, lIdx) {
        var speaker = getCharacterById(line.speakerId) || { id: line.speakerId, name: 'Speaker', emoji: '👤', voicePresetId: 'jenny' };
        html += '<div class="chat-bubble-row" id="chat-row-' + lIdx + '">';
        html += '<div class="avatar-portrait-frame" id="chat-avatar-' + lIdx + '"><span class="avatar-emoji-large">' + speaker.emoji + '</span></div>';
        html += '<div class="chat-bubble-content">';
        html += '<div class="chat-speaker-header">';
        html += '<div style="display:flex;align-items:center;gap:8px;">';
        html += '<span class="chat-speaker-name">' + speaker.name + '</span>';
        if (speaker.role) html += '<span style="font-size: 11px; background: var(--panel-alt); padding: 2px 8px; border-radius: 999px; color: var(--ink-muted);">' + speaker.role + '</span>';
        html += '</div>';
        html += '<button class="line-audio-trigger-btn" onclick="window.__speakLine(' + lIdx + ')">🔊 Listen</button>';
        html += '</div>';
        html += '<p class="chat-text-line">' + line.text + '</p>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    // Quick Checks
    if (Array.isArray(lesson.quickChecks) && lesson.quickChecks.length > 0) {
      var qc = lesson.quickChecks[0];
      html += '<div class="quick-check-panel">';
      html += '<div class="qc-header"><span class="qc-badge">Check Your Understanding</span></div>';
      html += '<div class="qc-question-text">' + qc.question + '</div>';
      html += '<div class="qc-options-list">';
      qc.options.forEach(function(opt, oIdx) {
        html += '<button class="qc-option-btn" data-opt-idx="' + oIdx + '" data-ans-idx="' + qc.answerIndex + '" data-explanation="' + encodeURIComponent(qc.explanation || 'Good job!') + '">';
        html += '<span>' + opt + '</span>';
        html += '</button>';
      });
      html += '</div>';
      html += '<div id="qc-feedback" class="qc-feedback-box" style="display:none;"></div>';
      html += '</div>';
    }

    html += '<div class="start-lesson-cta-bar">';
    if (lessonIdx + 1 < totalLessons) {
      html += '<button id="btn-next-lesson" class="primary-cta-btn">Next: Lesson ' + (lessonIdx + 2) + ' →</button>';
    } else {
      html += '<button id="btn-start-scenario" class="primary-cta-btn">Start Practice Scenario →</button>';
    }
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    // Attach dialogue buttons
    var playDiagBtn = document.getElementById('btn-play-dialogue');
    if (playDiagBtn) {
      playDiagBtn.addEventListener('click', function() {
        playDialogueSequence(lesson.dialogue, 0);
      });
    }
    var stopDiagBtn = document.getElementById('btn-stop-dialogue');
    if (stopDiagBtn) {
      stopDiagBtn.addEventListener('click', stopAudio);
    }

    window.__speakPhrase = function(encoded) {
      speakText(decodeURIComponent(encoded), 'jenny');
    };

    window.__speakLine = function(lineIdx) {
      if (!lesson.dialogue || !lesson.dialogue[lineIdx]) return;
      var line = lesson.dialogue[lineIdx];
      var speaker = getCharacterById(line.speakerId) || { id: line.speakerId, voicePresetId: 'jenny' };
      highlightChatRow(lineIdx, speaker.id);
      speakText(line.text, speaker.voicePresetId, function() {
        unhighlightChatRow(lineIdx, speaker.id);
      });
    };

    // Attach Quiz buttons
    document.querySelectorAll('.qc-option-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var optIdx = parseInt(btn.getAttribute('data-opt-idx'), 10);
        var ansIdx = parseInt(btn.getAttribute('data-ans-idx'), 10);
        var explanation = decodeURIComponent(btn.getAttribute('data-explanation'));
        var feedbackEl = document.getElementById('qc-feedback');

        document.querySelectorAll('.qc-option-btn').forEach(function(b) {
          b.disabled = true;
          if (parseInt(b.getAttribute('data-opt-idx'), 10) === ansIdx) {
            b.classList.add('correct');
          }
        });

        if (optIdx === ansIdx) {
          btn.classList.add('correct');
          updateXP(100);
          if (feedbackEl) {
            feedbackEl.style.display = 'block';
            feedbackEl.innerHTML = '<strong>✅ Correct!</strong> ' + explanation;
          }
        } else {
          btn.classList.add('incorrect');
          if (feedbackEl) {
            feedbackEl.style.display = 'block';
            feedbackEl.innerHTML = '<strong>❌ Keep Practicing:</strong> ' + explanation;
          }
        }
      });
    });

    var nextLessonBtn = document.getElementById('btn-next-lesson');
    if (nextLessonBtn) {
      nextLessonBtn.addEventListener('click', function() {
        updateXP(75);
        currentStepIndex++;
        renderStage();
      });
    }

    var startScenBtn = document.getElementById('btn-start-scenario');
    if (startScenBtn) {
      startScenBtn.addEventListener('click', function() {
        updateXP(75);
        currentStepIndex = totalLessons + 1;
        renderStage();
      });
    }
  }

  function highlightChatRow(lineIdx, speakerId) {
    document.querySelectorAll('.chat-bubble-row').forEach(function(r) { r.classList.remove('is-active-speaker'); });
    document.querySelectorAll('.video-participant-tile').forEach(function(p) { p.classList.remove('is-active-speaker'); });
    var row = document.getElementById('chat-row-' + lineIdx);
    if (row) {
      row.classList.add('is-active-speaker');
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (speakerId) {
      var pod = document.getElementById('podium-char-' + speakerId);
      if (pod) pod.classList.add('is-active-speaker');
    }
  }

  function unhighlightChatRow(lineIdx, speakerId) {
    var row = document.getElementById('chat-row-' + lineIdx);
    if (row) row.classList.remove('is-active-speaker');
    if (speakerId) {
      var pod = document.getElementById('podium-char-' + speakerId);
      if (pod) pod.classList.remove('is-active-speaker');
    }
  }

  function playDialogueSequence(dialogue, index) {
    if (!dialogue || index >= dialogue.length) {
      document.querySelectorAll('.video-participant-tile').forEach(function(p) { p.classList.remove('is-active-speaker'); });
      return;
    }
    var line = dialogue[index];
    var speaker = getCharacterById(line.speakerId) || { id: line.speakerId, voicePresetId: 'jenny' };
    highlightChatRow(index, speaker.id);
    speakText(line.text, speaker.voicePresetId, function() {
      unhighlightChatRow(index, speaker.id);
      playDialogueSequence(dialogue, index + 1);
    });
  }

  /* =====================
   * STAGE: SCENARIO
   * ===================== */
  var currentScenarioNodeId = lessonData.scenario ? lessonData.scenario.startNode : null;

  function renderScenario(container) {
    if (!lessonData.scenario || !currentScenarioNodeId) {
      currentStepIndex = totalLessons + 2;
      renderStage();
      return;
    }

    var node = lessonData.scenario.nodes[currentScenarioNodeId];
    if (!node) {
      currentStepIndex = totalLessons + 2;
      renderStage();
      return;
    }

    var isEnding = node.type === 'ending';

    var html = '<div class="scenario-decision-panel">';
    if (node.act) {
      html += '<span class="scenario-act-badge">Act ' + node.act + (isEnding ? ' — Outcome' : ' — Decision Point') + '</span>';
    }
    html += '<h2 class="scenario-title">' + node.title + '</h2>';
    if (node.body) {
      html += '<p class="scenario-body-desc">' + node.body + '</p>';
    }

    // Dialogue in scenario
    if (Array.isArray(node.lines) && node.lines.length > 0) {
      html += '<div class="live-dialogue-video-frame" style="margin: 12px 0;">';
      html += '<div class="video-frame-top-bar">';
      html += '<span class="live-indicator"><span class="live-dot"></span> Team Exchange</span>';
      html += '</div>';
      html += '<div class="dialogue-chat-stream">';
      node.lines.forEach(function(line, idx) {
        var speaker = getCharacterById(line.speakerId) || { name: 'Team Member', emoji: '👤', voicePresetId: 'jenny' };
        html += '<div class="chat-bubble-row">';
        html += '<div class="avatar-portrait-frame"><span class="avatar-emoji-large">' + speaker.emoji + '</span></div>';
        html += '<div class="chat-bubble-content">';
        html += '<div class="chat-speaker-header">';
        html += '<span class="chat-speaker-name">' + speaker.name + '</span>';
        html += '<button class="line-audio-trigger-btn" onclick="window.__speakScenLine(\'' + encodeURIComponent(line.text) + '\', \'' + speaker.voicePresetId + '\')">🔊</button>';
        html += '</div>';
        html += '<p class="chat-text-line">' + line.text + '</p>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    if (isEnding) {
      html += '<div class="start-lesson-cta-bar">';
      html += '<button id="btn-view-summary" class="primary-cta-btn">View Lesson Summary →</button>';
      html += '</div>';
    } else if (Array.isArray(node.choices) && node.choices.length > 0) {
      html += '<div class="choices-heading">How will you respond?</div>';
      html += '<div class="choices-grid">';
      node.choices.forEach(function(choice) {
        html += '<button class="choice-card-btn" data-goto="' + choice.goto + '" data-affinity=\'' + JSON.stringify(choice.affinity || []) + '\'>';
        html += '<span class="choice-label-text">' + choice.label + '</span>';
        if (choice.hint) html += '<span class="choice-hint-chip">💡 ' + choice.hint + '</span>';
        if (Array.isArray(choice.affinity) && choice.affinity.length > 0) {
          html += '<div class="affinity-chips-row">';
          choice.affinity.forEach(function(aff) {
            var c = getCharacterById(aff.characterId);
            var name = c ? c.name.split(' ')[0] : 'Team';
            var sign = aff.amount >= 0 ? '+' : '';
            var cls = aff.amount >= 0 ? 'positive' : 'negative';
            html += '<span class="affinity-chip ' + cls + '">' + (c ? c.emoji + ' ' : '') + name + ' ' + sign + aff.amount + '%</span>';
          });
          html += '</div>';
        }
        html += '</button>';
      });
      html += '</div>';
    } else if (node.next) {
      html += '<div class="start-lesson-cta-bar">';
      html += '<button id="btn-next-node" class="primary-cta-btn" data-goto="' + node.next + '">Continue →</button>';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    window.__speakScenLine = function(encodedText, voiceId) {
      speakText(decodeURIComponent(encodedText), voiceId || 'jenny');
    };

    document.querySelectorAll('.choice-card-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var targetNode = btn.getAttribute('data-goto');
        var affinityData = JSON.parse(btn.getAttribute('data-affinity') || '[]');
        affinityData.forEach(function(aff) {
          if (affinityMap[aff.characterId] !== undefined) {
            affinityMap[aff.characterId] = Math.max(0, Math.min(100, affinityMap[aff.characterId] + aff.amount));
          }
        });
        updateXP(120);
        currentScenarioNodeId = targetNode;
        renderStage();
      });
    });

    var nextNodeBtn = document.getElementById('btn-next-node');
    if (nextNodeBtn) {
      nextNodeBtn.addEventListener('click', function() {
        currentScenarioNodeId = nextNodeBtn.getAttribute('data-goto');
        renderStage();
      });
    }

    var viewSummBtn = document.getElementById('btn-view-summary');
    if (viewSummBtn) {
      viewSummBtn.addEventListener('click', function() {
        updateXP(200);
        currentStepIndex = totalLessons + 2;
        renderStage();
      });
    }
  }

  /* =====================
   * STAGE: COMPLETION
   * ===================== */
  function renderCompletion(container) {
    var html = '<div class="summary-completion-panel">';
    html += '<div class="completion-trophy-avatar">🏆</div>';
    html += '<h2 class="completion-title">Lesson Completed!</h2>';
    html += '<p class="completion-desc">You have successfully mastered the key communication strategies, engaged with your team, and guided the situation to a constructive resolution.</p>';

    html += '<div class="completion-metrics-grid">';
    html += '<div class="metric-stat-box"><span class="metric-stat-val">' + totalXP + '</span><span class="metric-stat-label">Total XP</span></div>';
    html += '<div class="metric-stat-box"><span class="metric-stat-val">' + totalLessons + '</span><span class="metric-stat-label">Modules Completed</span></div>';
    html += '<div class="metric-stat-box"><span class="metric-stat-val">100%</span><span class="metric-stat-label">Completion</span></div>';
    html += '</div>';

    html += '<button id="btn-restart-lesson" class="primary-cta-btn">Restart Lesson ↺</button>';
    html += '</div>';

    container.innerHTML = html;

    var restartBtn = document.getElementById('btn-restart-lesson');
    if (restartBtn) {
      restartBtn.addEventListener('click', function() {
        currentStepIndex = 0;
        currentScenarioNodeId = lessonData.scenario ? lessonData.scenario.startNode : null;
        totalXP = 0;
        updateXP(0);
        renderStage();
      });
    }
  }

  // Theme Switcher Event
  var themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      var current = document.documentElement.getAttribute('data-theme') || 'light';
      var next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      themeBtn.innerHTML = next === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
    });
  }

  // Step Tracker Navigation
  document.querySelectorAll('.tracker-step').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var stepIdx = parseInt(btn.getAttribute('data-step'), 10);
      currentStepIndex = stepIdx;
      renderStage();
    });
  });

  // Initial Render
  renderStage();
})();
`;

/* =============================================================================
 * SECTION 5: STANDALONE HTML GENERATOR
 * ============================================================================= */

export const generateStandaloneHtmlV2 = (data: AvatarLessonDataV2): string => {
  const meta = data.meta;
  const sanitizedJson = JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

  const totalLessons = Array.isArray(data.lessons) ? data.lessons.length : 0;

  let trackerHtml = '<button class="tracker-step active" data-step="0">👥 Meet the Team</button>';
  data.lessons.forEach((l, idx) => {
    trackerHtml += '<span class="tracker-divider">›</span>';
    trackerHtml += `<button class="tracker-step" data-step="${idx + 1}">📖 Lesson ${idx + 1}</button>`;
  });
  trackerHtml += '<span class="tracker-divider">›</span>';
  trackerHtml += `<button class="tracker-step" data-step="${totalLessons + 1}">🎯 Practice Scenario</button>`;
  trackerHtml += '<span class="tracker-divider">›</span>';
  trackerHtml += `<button class="tracker-step" data-step="${totalLessons + 2}">🏆 Summary</button>`;

  return String.raw`<!DOCTYPE html>
<html lang="en" data-theme="${meta.defaultTheme || 'light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <style>
${RUNTIME_CSS}
  </style>
</head>
<body>
  <header class="app-header">
    <div class="header-left">
      <span class="lesson-badge">Interactive Lesson</span>
      <h1 class="lesson-title-main">${escapeHtml(meta.title)}</h1>
    </div>
    <div class="header-right">
      <span class="xp-counter">⭐ XP: <span id="xp-counter-val">0</span></span>
      <button id="btn-toggle-theme" class="theme-toggle-btn">🌙 Dark Mode</button>
    </div>
  </header>

  <nav class="stage-tracker-bar">
    ${trackerHtml}
  </nav>

  <main class="main-stage-container">
    <div class="narrator-banner">
      <div class="narrator-left">
        <div class="narrator-avatar-mini">${escapeHtml(data.narrator.defaultEmoji || '🎙️')}</div>
        <div class="narrator-text"><strong>${escapeHtml(data.narrator.name)}:</strong> Welcome! Follow each stage to practice real-world communication with your team.</div>
      </div>
    </div>

    <div id="stage-content-area"></div>
  </main>

  <script>
    window.__AVATAR_LESSON_DATA_V2__ = ${sanitizedJson};
  </script>
  <script>
${RUNTIME_JS}
  </script>
</body>
</html>`;
};

/* =============================================================================
 * SECTION 6: REACT PREVIEW COMPONENT
 * ============================================================================= */

export interface AvatarLessonGeneratorV2Props {
  initialData?: AvatarLessonDataV2;
}

export const AvatarLessonGeneratorV2: React.FC<AvatarLessonGeneratorV2Props> = ({ initialData }) => {
  const [data] = useState<AvatarLessonDataV2 | null>(initialData || null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  useEffect(() => {
    if (data) {
      const html = generateStandaloneHtmlV2(data);
      setPreviewHtml(html);
    }
  }, [data]);

  return (
    <div className="w-full h-full min-h-[650px] flex flex-col bg-slate-50 border rounded-xl overflow-hidden shadow-sm">
      {previewHtml ? (
        <iframe
          title="Avatar Lesson V2 Preview"
          srcDoc={previewHtml}
          className="w-full flex-1 border-0 min-h-[700px]"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        />
      ) : (
        <div className="p-8 text-center text-slate-500">No lesson data provided for Avatar Lesson V2.</div>
      )}
    </div>
  );
};

export default AvatarLessonGeneratorV2;
