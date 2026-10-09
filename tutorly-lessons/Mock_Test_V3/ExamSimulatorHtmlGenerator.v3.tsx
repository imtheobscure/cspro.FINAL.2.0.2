/*
ExamSimulatorHtmlGenerator.v3.ts
Standalone, production-oriented single-file generator.
Includes:
- self-contained HTML runtime
- zero-dependency ZIP export (results.json + recordings/ + snapshots/ + report.html)
- IndexedDB persistence for recordings and session state
- rich analytics dashboard and review mode
- mini-lessons, model answers, retry incorrect, weighted scoring, section minimums
- adaptive branching hooks
- language-exam coverage metadata extension for major German/French/Spanish proficiency exams

This file is intentionally standalone and does not import v1/v2.
*/

import React, { useMemo, useState } from 'react';

export type ExamMode = 'practice' | 'test';
export type DeliveryMode = 'paper' | 'computer' | 'digital' | 'adaptive' | 'mixed';
export type ExamSectionType = 'listening' | 'reading' | 'writing' | 'speaking' | 'use_of_english' | 'math' | 'science' | 'reasoning' | 'language' | 'integrated';
export type QuestionType =
  | 'single_choice' | 'multiple_select' | 'true_false_not_given' | 'yes_no_not_given'
  | 'matching' | 'matching_headings' | 'matching_information' | 'matching_features' | 'matching_sentence_endings'
  | 'sentence_completion' | 'summary_completion' | 'note_completion' | 'table_completion' | 'flow_chart_completion' | 'diagram_label_completion'
  | 'short_answer' | 'long_answer' | 'essay' | 'email' | 'letter'
  | 'read_aloud' | 'repeat_sentence' | 'listen_and_type' | 'dictation' | 'speaking_response' | 'oral_interview'
  | 'reorder_paragraphs' | 'drag_and_drop_cloze' | 'dropdown_cloze' | 'highlight_text' | 'highlight_sentence'
  | 'numeric_entry' | 'fraction_entry' | 'equation_entry' | 'hotspot' | 'image_choice' | 'matrix' | 'sequence'
  | 'build_sentence' | 'role_play' | 'interactive_reading' | 'video_reflection'
  | 'gap_fill' | 'complete_words' | 'multi_field' | 'categorization' | 'matrix_selection' | 'graph_interaction';

export interface ExamBlueprint {
  examId: string;
  examName: string;
  year: 2026;
  provider: string;
  version?: string;
  locale?: string;
  examFamily?: string;
  candidate?: { reference?: string; name?: string; };
  deliveryMode: DeliveryMode;
  totalDurationMinutes: number;
  passPercent: number;
  strictProctoring?: boolean;
  oneSkillRetake?: boolean;
  adaptive?: boolean;
  calculatorPolicy?: 'none' | 'basic' | 'scientific' | 'graphing' | 'section_limited';
  sections: ExamSectionBlueprint[];
  scoring: ScoringBlueprint;
  ui?: Partial<UiConfig>;
  telemetry?: Partial<TelemetryConfig>;
  proctoring?: Partial<ProctoringConfig>;
  accessibility?: Partial<AccessibilityConfig>;
  metadata?: Record<string, unknown>;
  qualityAssurance?: { reviewedBy?: string; validationDate?: string; approvedBy?: string; standards?: string[]; };
  sourceRegistry?: Array<{ sourceId: string; title: string; url?: string; retrievedAt?: string; license?: string; }>;
}

export interface ExamSectionBlueprint {
  id: string;
  title: string;
  type: ExamSectionType;
  instructions: string;
  durationMinutes: number;
  itemCount: number;
  shuffleQuestions?: boolean;
  allowBackNavigation?: boolean;
  allowFlagging?: boolean;
  allowHighlighting?: boolean;
  allowNotepad?: boolean;
  allowCalculator?: boolean;
  lockAfterAdvance?: boolean;
  minimumPassPercent?: number;
  audio?: { globalIntroText?: string; playOnce?: boolean; calibrationRequired?: boolean; };
  writing?: { minWords?: number; recommendedWords?: number; rubric?: string[]; };
  speaking?: { prepSeconds?: number; responseSeconds?: number; allowRerecord?: boolean; };
  questions: Question[];
}

export interface ScoringBlueprint {
  scale: 'raw' | 'percent' | 'band' | 'hybrid';
  bandLabels?: string[];
  bandMapping?: Array<{ minPercent: number; label: string }>;
  passingLogic?: 'overall' | 'section_minimums' | 'adaptive_estimate';
  sectionWeights?: Record<string, number>;
  partialCredit?: boolean;
  writingRubrics?: RubricDimension[];
  speakingRubrics?: RubricDimension[];
}

export interface RubricDimension {
  id: string;
  label: string;
  max: number;
  descriptors: Array<{ score: number; description: string }>;
}

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'adaptive';
  instructions?: string;
  explanation?: string;
  strategyTips?: string[];
  miniLesson?: string;
  modelAnswer?: string;
  skillTags?: string[];
  media?: QuestionMedia;
  timing?: { suggestedSeconds?: number; hardLimitSeconds?: number; };
  scoring?: { caseSensitive?: boolean; numericTolerance?: number; unordered?: boolean; partialCredit?: boolean; };
  taskKeys?: TaskKeys;
}

export interface TaskKeys {
  correctResponse?: string;
  keyRationale?: string;
  distractorRationales?: Record<string, string>;
  workedSolution?: string;
}

export interface QuestionMedia {
  imageUrl?: string;
  imageAlt?: string;
  passageHtml?: string;
  audioScript?: string;
  audioVoices?: VoiceSegment[];
  audio?: AudioSchema;
  table?: { columns: string[]; rows: string[][]; };
  hotspotAreas?: HotspotArea[];
}

export interface VoiceSegment { speaker: string; gender?: 'female' | 'male' | 'neutral'; accent?: 'en-US' | 'en-GB' | 'en-CA' | 'en-AU' | 'de-DE' | 'fr-FR' | 'es-ES'; text: string; }

export interface AudioSegment {
  segmentId?: string;
  speakerTag: string;
  speakerLabel?: string;
  text: string;
  startMs?: number | null;
  endMs?: number | null;
}

export interface AudioSchema {
  globalIntroText?: string;
  playOnce?: boolean;
  transcriptPolicy?: 'always' | 'hidden_until_submitted' | 'disabled';
  taggedScript?: string;
  segments: AudioSegment[];
}
export interface HotspotArea { id: string; shape: 'rect' | 'circle'; x: number; y: number; width?: number; height?: number; radius?: number; correct?: boolean; label?: string; }

export interface ChoiceQuestion extends BaseQuestion {
  type: 'single_choice' | 'multiple_select' | 'image_choice' | 'true_false_not_given' | 'yes_no_not_given';
  options: Array<{ id: string; label: string; richLabelHtml?: string; imageUrl?: string; correct?: boolean; }>;
  maxSelections?: number;
}
export interface MatchingQuestion extends BaseQuestion { type: 'matching' | 'matching_headings' | 'matching_information' | 'matching_features' | 'matching_sentence_endings' | 'categorization'; leftItems: Array<{ id: string; label: string }>; rightItems: Array<{ id: string; label: string }>; correctMap: Record<string, string>; }
export interface TextEntryQuestion extends BaseQuestion { type: 'sentence_completion' | 'summary_completion' | 'note_completion' | 'table_completion' | 'flow_chart_completion' | 'diagram_label_completion' | 'short_answer' | 'long_answer' | 'essay' | 'email' | 'letter' | 'listen_and_type' | 'dictation' | 'build_sentence'; expectedAnswers?: string[] | string[][]; sampleAnswer?: string; minWords?: number; maxWords?: number; templateHtml?: string; }
export interface ReorderQuestion extends BaseQuestion { type: 'reorder_paragraphs' | 'sequence'; items: Array<{ id: string; label: string }>; correctOrder: string[]; }
export interface ClozeQuestion extends BaseQuestion { type: 'drag_and_drop_cloze' | 'dropdown_cloze' | 'interactive_reading'; templateHtml: string; blanks: Array<{ id: string; options: string[]; correct: string | string[]; }>; }
export interface NumericQuestion extends BaseQuestion { type: 'numeric_entry' | 'fraction_entry' | 'equation_entry'; correctAnswer: string | number; acceptedAnswers?: Array<string | number>; mathKeyboard?: boolean; }
export interface HighlightQuestion extends BaseQuestion { type: 'highlight_text' | 'highlight_sentence'; passageHtml: string; correctSnippets: string[]; }
export interface SpeakingQuestion extends BaseQuestion { type: 'read_aloud' | 'repeat_sentence' | 'speaking_response' | 'oral_interview' | 'role_play' | 'video_reflection'; prepSeconds?: number; responseSeconds?: number; sampleResponse?: string; }
export interface MatrixQuestion extends BaseQuestion { type: 'matrix' | 'matrix_selection'; rows: string[]; columns: string[]; correctCells: string[]; }
export interface HotspotQuestion extends BaseQuestion { type: 'hotspot'; allowMultiple?: boolean; }
export interface GapFillQuestion extends BaseQuestion { type: 'gap_fill' | 'complete_words'; templateHtml: string; blanks: Array<{ id: string; correct: string | string[]; options?: string[]; maxLength?: number; }>; }
export interface MultiFieldQuestion extends BaseQuestion { type: 'multi_field' | 'graph_interaction'; fields: Array<{ id: string; label: string; inputMode?: 'text' | 'decimal'; placeholder?: string; unitLabel?: string; }>; correctAnswers: Record<string, string | number | string[]>; workingRequired?: boolean; }

export type Question = ChoiceQuestion | MatchingQuestion | TextEntryQuestion | ReorderQuestion | ClozeQuestion | NumericQuestion | HighlightQuestion | SpeakingQuestion | MatrixQuestion | HotspotQuestion | GapFillQuestion | MultiFieldQuestion;

export interface UiConfig { brandTitle: string; accentHue: number; density: 'comfortable' | 'compact'; showSectionTimers: boolean; showQuestionPalette: boolean; enableSplitPaneReading: boolean; enableKeyboardShortcuts: boolean; fontFamily: string; }
export interface TelemetryConfig { enabled: boolean; storeLocally: boolean; emitConsoleMirror: boolean; endpointUrl?: string; flushIntervalMs: number; captureVisibility: boolean; captureFocus: boolean; captureClipboard: boolean; captureNavigation: boolean; captureAnswerLatency: boolean; }
export interface ProctoringConfig { enabled: boolean; fullscreenRequired: boolean; detectTabSwitches: boolean; detectWindowBlur: boolean; detectCopyPaste: boolean; detectContextMenu: boolean; detectIdle: boolean; idleThresholdSeconds: number; webcamPrompt: boolean; microphonePrompt: boolean; photoIdCheck: boolean; maxWarnings: number; snapshotIntervalSeconds?: number; }
export interface AccessibilityConfig { dyslexiaFontOption: boolean; fontScaleControls: boolean; contrastPresets: boolean; keyboardNavigation: boolean; screenReaderLabels: boolean; }
export interface GeneratorOptions { mode: ExamMode; includeAnswerKey?: boolean; includePracticeCoaching?: boolean; includeTelemetryDashboard?: boolean; htmlTitle?: string; candidateReference?: string; validate?: boolean; }

const DEFAULT_UI: UiConfig = { brandTitle: '', accentHue: 250, density: 'comfortable', showSectionTimers: true, showQuestionPalette: true, enableSplitPaneReading: true, enableKeyboardShortcuts: true, fontFamily: 'Inter, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif' };
const DEFAULT_TELEMETRY: TelemetryConfig = { enabled: true, storeLocally: true, emitConsoleMirror: false, endpointUrl: undefined, flushIntervalMs: 10000, captureVisibility: true, captureFocus: true, captureClipboard: true, captureNavigation: true, captureAnswerLatency: true };
const DEFAULT_PROCTORING: ProctoringConfig = { enabled: true, fullscreenRequired: false, detectTabSwitches: true, detectWindowBlur: true, detectCopyPaste: true, detectContextMenu: true, detectIdle: true, idleThresholdSeconds: 90, webcamPrompt: true, microphonePrompt: true, photoIdCheck: true, maxWarnings: 6, snapshotIntervalSeconds: 60 };
const DEFAULT_ACCESSIBILITY: AccessibilityConfig = { dyslexiaFontOption: true, fontScaleControls: true, contrastPresets: true, keyboardNavigation: true, screenReaderLabels: true };

export const EXTENDED_LANGUAGE_EXAMS_2026 = [
  { examName: 'TestDaF 2026', provider: 'g.a.s.t.', deliveryMode: 'computer', totalDurationMinutes: 190, passPercent: 65, locale: 'de' },
  { examName: 'Goethe-Zertifikat B1 2026', provider: 'Goethe-Institut', deliveryMode: 'mixed', totalDurationMinutes: 165, passPercent: 60, locale: 'de' },
  { examName: 'Goethe-Zertifikat B2 2026', provider: 'Goethe-Institut', deliveryMode: 'mixed', totalDurationMinutes: 190, passPercent: 60, locale: 'de' },
  { examName: 'Goethe-Zertifikat C1 2026', provider: 'Goethe-Institut', deliveryMode: 'mixed', totalDurationMinutes: 220, passPercent: 60, locale: 'de' },
  { examName: 'telc Deutsch B1 2026', provider: 'telc', deliveryMode: 'mixed', totalDurationMinutes: 150, passPercent: 60, locale: 'de' },
  { examName: 'telc Deutsch B2 2026', provider: 'telc', deliveryMode: 'mixed', totalDurationMinutes: 170, passPercent: 60, locale: 'de' },
  { examName: 'DELF B1 2026', provider: 'France Éducation international', deliveryMode: 'mixed', totalDurationMinutes: 105, passPercent: 50, locale: 'fr' },
  { examName: 'DELF B2 2026', provider: 'France Éducation international', deliveryMode: 'mixed', totalDurationMinutes: 160, passPercent: 50, locale: 'fr' },
  { examName: 'DALF C1 2026', provider: 'France Éducation international', deliveryMode: 'mixed', totalDurationMinutes: 240, passPercent: 50, locale: 'fr' },
  { examName: 'DALF C2 2026', provider: 'France Éducation international', deliveryMode: 'mixed', totalDurationMinutes: 210, passPercent: 50, locale: 'fr' },
  { examName: 'TCF Tout Public 2026', provider: 'France Éducation international', deliveryMode: 'computer', totalDurationMinutes: 150, passPercent: 50, locale: 'fr' },
  { examName: 'DELE B1 2026', provider: 'Instituto Cervantes', deliveryMode: 'mixed', totalDurationMinutes: 180, passPercent: 60, locale: 'es' },
  { examName: 'DELE B2 2026', provider: 'Instituto Cervantes', deliveryMode: 'mixed', totalDurationMinutes: 210, passPercent: 60, locale: 'es' },
  { examName: 'DELE C1 2026', provider: 'Instituto Cervantes', deliveryMode: 'mixed', totalDurationMinutes: 255, passPercent: 60, locale: 'es' },
  { examName: 'SIELE Global 2026', provider: 'SIELE', deliveryMode: 'computer', totalDurationMinutes: 180, passPercent: 60, locale: 'es' },
];

export function buildExamBlueprint(input: Partial<ExamBlueprint> & Pick<ExamBlueprint, 'examName' | 'examId'>): ExamBlueprint {
  const extended = EXTENDED_LANGUAGE_EXAMS_2026.find(x => x.examName === input.examName);
  return {
    examId: input.examId,
    examName: input.examName,
    year: 2026,
    provider: input.provider ?? extended?.provider ?? 'Custom',
    version: input.version ?? '2026.3',
    locale: input.locale ?? extended?.locale ?? 'en',
    examFamily: input.examFamily ?? input.provider ?? 'Custom',
    candidate: input.candidate,
    deliveryMode: input.deliveryMode ?? (extended?.deliveryMode as DeliveryMode) ?? 'computer',
    totalDurationMinutes: input.totalDurationMinutes ?? extended?.totalDurationMinutes ?? 120,
    passPercent: input.passPercent ?? extended?.passPercent ?? 70,
    strictProctoring: input.strictProctoring ?? false,
    oneSkillRetake: input.oneSkillRetake ?? false,
    adaptive: input.adaptive ?? false,
    calculatorPolicy: input.calculatorPolicy ?? 'basic',
    sections: input.sections ?? [],
    scoring: input.scoring ?? { scale: 'percent', passingLogic: 'overall', partialCredit: true, sectionWeights: {}, bandMapping: [ { minPercent: 90, label: 'Excellent' }, { minPercent: 75, label: 'Strong' }, { minPercent: 60, label: 'Competent' }, { minPercent: 0, label: 'Developing' } ], writingRubrics: [], speakingRubrics: [] },
    ui: { ...DEFAULT_UI, ...(input.ui ?? {}) },
    telemetry: { ...DEFAULT_TELEMETRY, ...(input.telemetry ?? {}) },
    proctoring: { ...DEFAULT_PROCTORING, ...(input.proctoring ?? {}) },
    accessibility: { ...DEFAULT_ACCESSIBILITY, ...(input.accessibility ?? {}) },
    metadata: input.metadata ?? {},
    qualityAssurance: input.qualityAssurance,
    sourceRegistry: input.sourceRegistry,
  };
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export class ExamValidationError extends Error {
  issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super(`Exam blueprint validation failed with ${issues.length} issue(s).`);
    this.name = 'ExamValidationError';
    this.issues = issues;
  }
}

export function validateExamBlueprint(
  input: Partial<ExamBlueprint> & Pick<ExamBlueprint, 'examName' | 'examId'>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Map<string, string>();

  const registerId = (id: unknown, path: string): void => {
    const strId = String(id ?? '').trim();
    if (!strId) {
      issues.push({ path, code: 'id.empty', message: 'ID must not be empty.' });
      return;
    }
    const previous = ids.get(strId);
    if (previous) {
      issues.push({ path, code: 'id.duplicate', message: `ID '${strId}' is already used at ${previous}.` });
    } else {
      ids.set(strId, path);
    }
  };

  const sections = Array.isArray(input.sections) ? input.sections : [];
  if (!sections.length) {
    issues.push({ path: '$.sections', code: 'sections.empty', message: 'At least one exam section is required.' });
  }

  sections.forEach((section: any, sectionIndex: number) => {
    const sectionPath = `$.sections[${sectionIndex}]`;
    registerId(section?.id, `${sectionPath}.id`);
    if (!section?.title || !String(section.title).trim()) {
      issues.push({ path: `${sectionPath}.title`, code: 'title.empty', message: 'Section title must not be empty.' });
    }
    const questions = Array.isArray(section?.questions) ? section.questions : [];
    if (!questions.length) {
      issues.push({ path: `${sectionPath}.questions`, code: 'questions.empty', message: 'Each section must contain at least one question.' });
    }
    questions.forEach((q: any, questionIndex: number) => {
      const qPath = `${sectionPath}.questions[${questionIndex}]`;
      registerId(q?.id, `${qPath}.id`);
      if (!q?.prompt || !String(q.prompt).trim()) {
        issues.push({ path: `${qPath}.prompt`, code: 'prompt.empty', message: 'Question prompt must not be empty.' });
      }
      const choiceTypes = ['single_choice', 'multiple_select', 'image_choice', 'true_false_not_given', 'yes_no_not_given'];
      if (choiceTypes.includes(q?.type)) {
        const options = Array.isArray(q.options) ? q.options : [];
        if (options.length < 2) {
          issues.push({ path: `${qPath}.options`, code: 'options.insufficient', message: `${q.type} requires at least two options.` });
        }
        const seen = new Set<string>();
        options.forEach((o: any, optionIndex: number) => {
          if (!o?.id || seen.has(String(o.id))) {
            issues.push({ path: `${qPath}.options[${optionIndex}].id`, code: 'option.id.duplicate', message: `Option ID '${o?.id}' is duplicated within this question.` });
          }
          seen.add(String(o?.id));
        });
        if (q.type !== 'multiple_select') {
          const correct = options.filter((o: any) => o?.correct);
          if (correct.length !== 1) {
            issues.push({ path: `${qPath}.options`, code: 'options.correct.count', message: `${q.type} requires exactly one correct option.` });
          }
        }
      }
      const matchingTypes = ['matching', 'matching_headings', 'matching_information', 'matching_features', 'matching_sentence_endings', 'categorization'];
      if (matchingTypes.includes(q?.type)) {
        if (!Array.isArray(q.leftItems) || q.leftItems.length < 1) {
          issues.push({ path: `${qPath}.leftItems`, code: 'matching.left.empty', message: `${q.type} requires leftItems.` });
        }
        if (!Array.isArray(q.rightItems) || q.rightItems.length < 1) {
          issues.push({ path: `${qPath}.rightItems`, code: 'matching.right.empty', message: `${q.type} requires rightItems.` });
        }
        if (!q.correctMap || !Object.keys(q.correctMap).length) {
          issues.push({ path: `${qPath}.correctMap`, code: 'matching.correctMap.empty', message: `${q.type} requires a correctMap.` });
        }
      }
      const audio = q?.media?.audio;
      if (audio && Array.isArray(audio.segments)) {
        let lastCue = -1;
        audio.segments.forEach((segment: any, segmentIndex: number) => {
          const audioPath = `${qPath}.media.audio.segments[${segmentIndex}]`;
          if (!segment?.text || !String(segment.text).trim()) {
            issues.push({ path: audioPath, code: 'audio.text.empty', message: 'Audio segment text must not be empty.' });
          }
          if (segment.startMs != null && segment.startMs < lastCue) {
            issues.push({ path: `${audioPath}.startMs`, code: 'audio.cue.order', message: 'Audio cue timestamps must be chronological.' });
          }
          if (segment.startMs != null && segment.endMs != null && segment.endMs < segment.startMs) {
            issues.push({ path: `${audioPath}.endMs`, code: 'audio.cue.range', message: 'Audio cue end must not precede its start.' });
          }
          if (segment.endMs != null) lastCue = segment.endMs;
        });
      }
    });
  });

  return issues;
}

export function generateExamHtml(blueprint: ExamBlueprint, options: GeneratorOptions): string {
  if (options.validate !== false) {
    const issues = validateExamBlueprint(blueprint);
    if (issues.length) throw new ExamValidationError(issues);
  }
  const ui = { ...DEFAULT_UI, ...(blueprint.ui ?? {}) };
  const telemetry = { ...DEFAULT_TELEMETRY, ...(blueprint.telemetry ?? {}) };
  const proctoring = { ...DEFAULT_PROCTORING, ...(blueprint.proctoring ?? {}) };
  const accessibility = { ...DEFAULT_ACCESSIBILITY, ...(blueprint.accessibility ?? {}) };
  const payload = escapeJsonForHtml({ blueprint, options, ui, telemetry, proctoring, accessibility });
  const title = escapeHtml(options.htmlTitle ?? `${blueprint.examName} Simulator`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
:root{color-scheme:light;--bg:oklch(98% 0.006 ${ui.accentHue});--bg2:oklch(96% 0.01 ${ui.accentHue});--panel:oklch(99% 0.004 ${ui.accentHue});--panel2:oklch(97% 0.008 ${ui.accentHue});--line:oklch(87% 0.012 ${ui.accentHue});--line2:oklch(74% 0.018 ${ui.accentHue});--text:oklch(22% 0.02 ${ui.accentHue});--soft:oklch(42% 0.015 ${ui.accentHue});--faint:oklch(58% 0.012 ${ui.accentHue});--accent:oklch(58% 0.19 ${ui.accentHue});--accent2:oklch(50% 0.19 ${ui.accentHue});--accentSoft:oklch(92% 0.05 ${ui.accentHue});--success:oklch(62% 0.16 152);--warning:oklch(76% 0.16 83);--danger:oklch(60% 0.19 23);--radius:16px;--radiusLg:24px;--shadow:0 14px 36px rgba(20,26,44,.08);--ease:cubic-bezier(0.16,1,0.3,1);--font:${ui.fontFamily};--fontSize:16px;--touch:44px}
[data-theme="dark"]{--bg:oklch(16% 0.01 ${ui.accentHue});--bg2:oklch(20% 0.014 ${ui.accentHue});--panel:oklch(21% 0.012 ${ui.accentHue});--panel2:oklch(25% 0.016 ${ui.accentHue});--line:oklch(33% 0.02 ${ui.accentHue});--line2:oklch(45% 0.02 ${ui.accentHue});--text:oklch(92% 0.01 ${ui.accentHue});--soft:oklch(78% 0.01 ${ui.accentHue});--faint:oklch(62% 0.012 ${ui.accentHue});--accent:oklch(68% 0.16 ${ui.accentHue});--accent2:oklch(61% 0.16 ${ui.accentHue});--accentSoft:oklch(30% 0.05 ${ui.accentHue});--shadow:none}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:var(--font);font-size:var(--fontSize)}body{min-height:100vh;line-height:1.5;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}button,input,select,textarea{font:inherit}button{cursor:pointer}[hidden]{display:none!important}.app{min-height:100vh;display:grid;grid-template-columns:280px minmax(0,1fr) 380px}.rail,.main,.side{min-height:100vh}.rail{position:sticky;top:0;background:linear-gradient(180deg,var(--bg2),var(--bg));border-right:1px solid var(--line);padding:32px 24px;display:grid;grid-template-rows:auto auto 1fr auto;gap:24px}.main{display:grid;grid-template-rows:auto minmax(0,1fr)}.side{position:sticky;top:0;border-left:1px solid var(--line);background:var(--panel);padding:24px;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:20px}.panel,.card,.chart,.review,.report{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}.card,.chart,.review,.report{padding:20px}.brand h1{margin:0;font-size:1.8rem;line-height:1.08;letter-spacing:-.04em}.muted,.tiny{color:var(--soft)}.tiny{font-size:.86rem}.chips,.toolbar,.nav,.toggles,.audioControls,.tokenBank,.metrics{display:flex;flex-wrap:wrap;gap:8px}.chip,.ghost{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 12px;border-radius:999px;font-size:.82rem;font-weight:700}.chip{background:var(--accentSoft);color:var(--accent2)}.ghost{background:var(--panel2);color:var(--soft);border:1px solid var(--line)}.header{padding:24px 32px 18px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--panel),var(--bg2));display:grid;gap:16px}.headerTop{display:flex;justify-content:space-between;gap:20px;align-items:start}.header h2{margin:0;font-size:1.5rem;letter-spacing:-.035em}.btn,.btnP,.btnD,.numBtn{min-height:var(--touch);border-radius:12px;padding:0 16px;border:1px solid var(--line);background:var(--panel);color:var(--text);transition:transform .12s var(--ease),background .18s var(--ease),border-color .18s var(--ease)}.btn:hover,.numBtn:hover{transform:translateY(-1px);border-color:var(--line2)}.btnP{background:var(--accent);color:#fff;border-color:var(--accent)}.btnD{background:color-mix(in oklab,var(--danger) 10%,var(--panel));color:var(--danger);border-color:color-mix(in oklab,var(--danger) 18%,var(--line))}.grid4{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:12px}.metric{padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--panel);display:grid;gap:4px}.label{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--faint)}.value{font-size:1.2rem;font-weight:800;letter-spacing:-.03em}.content{min-height:0;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(340px,.85fr)}.reader,.composer{min-width:0;min-height:0}.reader{padding:32px;display:grid;align-content:start;gap:20px;overflow:auto}.composer{border-left:1px solid var(--line);background:var(--bg2);padding:32px;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:16px;overflow:hidden}.question{padding:20px;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);display:grid;gap:16px}.eyebrow{font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--faint)}.qtitle{margin:0;font-size:1.22rem;line-height:1.2;letter-spacing:-.03em}.passage{padding:20px;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);line-height:1.7}.optList{display:grid;gap:12px}.opt{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.opt.selected{border-color:var(--accent);background:color-mix(in oklab,var(--accent) 8%,var(--panel))}.opt.correct{border-color:color-mix(in oklab,var(--success) 45%,var(--line));background:color-mix(in oklab,var(--success) 10%,var(--panel))}.opt.incorrect{border-color:color-mix(in oklab,var(--danger) 45%,var(--line));background:color-mix(in oklab,var(--danger) 8%,var(--panel))}textarea,input[type=text],input[type=number],select{width:100%;min-height:var(--touch);border-radius:12px;border:1px solid var(--line);background:var(--panel);color:var(--text);padding:12px 14px;outline:none}textarea{min-height:180px;resize:vertical;line-height:1.6}textarea:focus-visible,input:focus-visible,select:focus-visible,button:focus-visible{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 22%,transparent)}.palette{display:grid;grid-template-columns:repeat(auto-fit,minmax(44px,1fr));gap:8px}.pbtn{min-width:44px;min-height:44px;padding:0;border-radius:12px;border:1px solid var(--line);background:var(--panel);font-weight:800}.pbtn.current{border-color:var(--accent);color:var(--accent2)}.pbtn.answered{background:color-mix(in oklab,var(--success) 16%,var(--panel));border-color:color-mix(in oklab,var(--success) 40%,var(--line))}.pbtn.flagged{background:color-mix(in oklab,var(--warning) 18%,var(--panel))}.banner{padding:12px 14px;border-radius:12px;border:1px solid var(--line);font-size:.92rem}.warn{background:color-mix(in oklab,var(--warning) 16%,var(--panel))}.danger{background:color-mix(in oklab,var(--danger) 12%,var(--panel));color:var(--danger)}.success{background:color-mix(in oklab,var(--success) 14%,var(--panel));color:color-mix(in oklab,var(--success) 65%,var(--text))}.timer{height:8px;width:100%;border-radius:999px;background:var(--panel2);overflow:hidden}.timer>span{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),color-mix(in oklab,var(--accent) 40%,var(--warning)))}.calcGrid{display:grid;grid-template-columns:repeat(4,minmax(44px,1fr));gap:8px}.calcScreen{width:100%;min-height:60px;border-radius:12px;border:1px solid var(--line);background:var(--bg);padding:12px;font-size:1.1rem;text-align:right;font-variant-numeric:tabular-nums}.hotWrap{position:relative;display:inline-block;max-width:100%}.hotWrap img,.stimulus{max-width:100%;display:block;border-radius:16px;border:1px solid var(--line)}.hot{position:absolute;border:2px solid color-mix(in oklab,var(--accent) 60%,white);background:color-mix(in oklab,var(--accent) 16%,transparent)}.hot.active{background:color-mix(in oklab,var(--accent) 28%,transparent)}.meter{height:12px;border-radius:999px;background:linear-gradient(90deg,var(--success),var(--warning),var(--danger));overflow:hidden;position:relative}.meter>span{position:absolute;inset:0 auto 0 0;width:0;background:rgba(255,255,255,.48);mix-blend-mode:soft-light}.video{width:100%;max-height:320px;border-radius:16px;border:1px solid var(--line);background:#000}.builder,.reviewList,.dashGrid{display:grid;gap:12px}.buildLine{min-height:52px;padding:10px;border-radius:12px;border:1px dashed var(--line2);background:var(--panel2);display:flex;flex-wrap:wrap;gap:8px;align-items:center}.word{padding:8px 14px;border-radius:999px;border:1px solid var(--line2);background:var(--panel);font-weight:700}.word.placed{background:color-mix(in oklab,var(--accent) 10%,var(--panel));border-color:var(--accent)}.token{min-height:40px;padding:8px 14px;border-radius:999px;border:1px solid var(--line2);background:var(--panel);font-weight:700;cursor:grab;user-select:none}.token.used{opacity:.35;pointer-events:none}.slot{display:inline-flex;align-items:center;justify-content:center;min-width:96px;min-height:40px;padding:4px 10px;margin:0 4px;border-radius:10px;border:2px dashed var(--line2);background:var(--panel2);vertical-align:middle}.slot.filled{border-style:solid;background:color-mix(in oklab,var(--accent) 8%,var(--panel))}.slot.drag{border-color:var(--accent);background:color-mix(in oklab,var(--accent) 14%,var(--panel))}.telemetry{min-height:220px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.82rem;line-height:1.5;background:var(--bg2);border:1px solid var(--line);border-radius:var(--radius);padding:16px}.telemetryItem{padding:8px 0;border-bottom:1px solid var(--line)}.reviewItem{padding:16px;border-radius:14px;border:1px solid var(--line);display:grid;gap:8px}.reviewItem.correct{background:color-mix(in oklab,var(--success) 9%,var(--panel))}.reviewItem.incorrect{background:color-mix(in oklab,var(--danger) 7%,var(--panel))}.chart svg{width:100%;height:auto;display:block}.splitGrip{position:absolute;top:0;right:-6px;width:12px;height:100%;cursor:col-resize}.passageWrap{position:relative}.annotToolbar{display:flex;gap:8px;flex-wrap:wrap}.annotToggle.active{background:var(--accent);color:#fff;border-color:var(--accent)}.mark{background:color-mix(in oklab,var(--warning) 32%,var(--panel));border-radius:4px;padding:0 2px}.strike{text-decoration:line-through 2px color-mix(in oklab,var(--danger) 60%,var(--text))}.statusBar{display:flex;justify-content:space-between;gap:16px;align-items:center}.saveDot{width:10px;height:10px;border-radius:999px;background:var(--faint)}.saveDot.saved{background:var(--success)}.sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
@media (max-width:1380px){.app{grid-template-columns:250px minmax(0,1fr)}.side{grid-column:1/-1;position:static;border-left:0;border-top:1px solid var(--line)}}
@media (max-width:1024px){.app{grid-template-columns:1fr}.rail,.side{position:static;min-height:auto}.content{grid-template-columns:1fr}.composer{border-left:0;border-top:1px solid var(--line)}.grid4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.rail,.header,.reader,.composer,.side{padding-left:16px;padding-right:16px}.grid4{grid-template-columns:1fr}}
</style>
<style>
.app.app-wiz{grid-template-columns:minmax(0,1fr)}
.app.app-wiz .main{display:block}
.wiz{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:34px 20px;background:radial-gradient(1100px 560px at 12% -8%,color-mix(in oklab,var(--accent) 15%,var(--bg)),var(--bg) 55%),radial-gradient(900px 520px at 108% 112%,color-mix(in oklab,var(--accent) 13%,var(--bg)),transparent 60%)}
.wizCard{width:min(860px,100%);background:var(--panel);border:1px solid var(--line);border-radius:30px;box-shadow:0 32px 90px rgba(20,26,44,.16);overflow:hidden;animation:wizIn .45s var(--ease)}
@keyframes wizIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
.wizTop{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px 28px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--panel),var(--bg2))}
.wizBrand{display:flex;align-items:center;gap:14px;min-width:0}
.wizLogo{width:46px;height:46px;border-radius:15px;background:linear-gradient(135deg,var(--accent),color-mix(in oklab,var(--accent) 45%,#7dd3fc));color:#fff;font-weight:900;font-size:1.25rem;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px color-mix(in oklab,var(--accent) 32%,transparent);flex-shrink:0}
.wizExam{font-weight:800;font-size:1.04rem;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wizStepper{display:flex;gap:10px;align-items:center}
.wizStep{display:flex;align-items:center;gap:8px}
.wizDot{width:30px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.8rem;background:var(--panel2);color:var(--soft);border:1px solid var(--line);transition:all .2s var(--ease)}
.wizStep.active .wizDot{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 6px 16px color-mix(in oklab,var(--accent) 30%,transparent)}
.wizStep.done .wizDot{background:color-mix(in oklab,var(--success) 18%,var(--panel));color:var(--success);border-color:color-mix(in oklab,var(--success) 40%,var(--line))}
.wizStepLabel{font-size:.84rem;font-weight:700;color:var(--accent2);white-space:nowrap}
.wizBody{padding:34px 30px 30px}
.wizHeroTitle{font-size:1.85rem;font-weight:900;letter-spacing:-.035em;line-height:1.08;margin:0}
.wizStatGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:24px 0 26px}
.wizStat{padding:18px 16px;border:1px solid var(--line);border-radius:18px;background:var(--panel);display:grid;gap:3px}
.wizStat b{font-size:1.4rem;font-weight:900;letter-spacing:-.02em}
.wizSecList{display:grid;gap:10px;margin:12px 0 0}
.wizSec{display:flex;align-items:center;gap:12px;padding:13px 15px;border:1px solid var(--line);border-radius:15px;background:var(--panel);transition:border-color .2s var(--ease)}
.wizSec:hover{border-color:var(--line2)}
.wizSecNum{width:30px;height:30px;border-radius:10px;background:var(--accentSoft);color:var(--accent2);font-weight:800;display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0}
.wizCheckRow{display:flex;align-items:center;gap:14px;padding:15px 16px;border:1px solid var(--line);border-radius:17px;margin-top:12px;background:var(--panel);transition:border-color .2s var(--ease)}
.wizCheckRow.wizOk{border-color:color-mix(in oklab,var(--success) 45%,var(--line));background:color-mix(in oklab,var(--success) 5%,var(--panel))}
.wizCheckIcon{width:42px;height:42px;border-radius:13px;background:var(--panel2);display:flex;align-items:center;justify-content:center;font-size:1.15rem;flex-shrink:0}
.wizModeGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:22px 0 4px}
.wizMode{padding:20px;border:2px solid var(--line);border-radius:20px;background:var(--panel);cursor:pointer;transition:border-color .2s var(--ease),transform .2s var(--ease),box-shadow .2s var(--ease)}
.wizMode:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(20,26,44,.08)}
.wizMode.sel{border-color:var(--accent);background:color-mix(in oklab,var(--accent) 6%,var(--panel));box-shadow:0 10px 26px color-mix(in oklab,var(--accent) 14%,transparent)}
.wizMode h4{margin:0 0 6px;font-size:1.1rem;letter-spacing:-.01em}
.wizRules{margin-top:22px;background:var(--bg2);border:1px solid var(--line);border-radius:18px;padding:16px 20px}
.wizRules ul{margin:0;padding-left:18px;color:var(--soft);font-size:.94rem}
.wizRules li{margin:5px 0}
.wizNav{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:26px}
.wizGhostBtn{min-height:52px;padding:0 26px;border-radius:15px;border:1px solid var(--line);background:var(--panel);font-weight:800;font-size:.95rem;color:var(--text);cursor:pointer;transition:border-color .2s var(--ease),transform .2s var(--ease)}
.wizGhostBtn:hover{border-color:var(--line2);transform:translateY(-1px)}
.wizBigBtn{min-height:58px;border-radius:17px;border:0;padding:0 34px;font-size:1.02rem;font-weight:800;letter-spacing:-.01em;background:linear-gradient(135deg,var(--accent),color-mix(in oklab,var(--accent) 72%,#0f172a));color:#fff;cursor:pointer;box-shadow:0 16px 34px color-mix(in oklab,var(--accent) 32%,transparent);transition:transform .2s var(--ease),opacity .2s var(--ease)}
.wizBigBtn:hover{transform:translateY(-2px)}
.wizBigBtn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.app:not(.app-wiz) .header{background:linear-gradient(180deg,color-mix(in oklab,var(--accent) 8%,var(--panel)),var(--bg2))}
.app:not(.app-wiz) .rail{background:linear-gradient(180deg,color-mix(in oklab,var(--accent) 6%,var(--bg2)),var(--bg))}
.brand h1{font-size:1.5rem}
.metric{border-radius:16px}
.btn{border-radius:14px}
.btnP{background:linear-gradient(135deg,var(--accent),color-mix(in oklab,var(--accent) 74%,#0f172a));border:0}
.card,.chart,.review,.report{border-radius:20px}
.chip{border-radius:10px}
/* Slim exam title bar on the rail — appears on hover only */
.examTitle{display:grid;gap:2px;padding:9px 12px;border-radius:14px;border:1px solid var(--line);background:color-mix(in oklab,var(--accent) 6%,var(--panel));opacity:0;transform:translateY(-3px);transition:opacity .25s var(--ease),transform .25s var(--ease);pointer-events:none;user-select:none}
.rail:hover .examTitle{opacity:1;transform:none;pointer-events:auto}
.examTitle b{font-size:.95rem;font-weight:800;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:760px){.wizStatGrid{grid-template-columns:1fr 1fr}.wizModeGrid{grid-template-columns:1fr}.wizStepper .wizStepLabel{display:none}.wizTop{flex-direction:column;align-items:flex-start}.wizHeroTitle{font-size:1.5rem}}
</style>
</head>
<body>
<div id="app"></div>
<script>
const EXAM_SIM = ${payload};
const DB_NAME = 'exam-sim-v3';
const DB_STORE = 'assets';
const state = {
  started:false, wizard:1, mode:EXAM_SIM.options.mode, currentSectionIndex:0, currentQuestionIndex:0,
  answers:{}, flags:{}, notes:{}, telemetry:[], warnings:0, fullscreenAccepted:false, calibrationPassed:false,
  micPermission:'prompt', camPermission:'prompt', reviewVisible:false, testEnded:false,
  fontScale:1, dyslexiaFont:false, contrast:'default', theme:'light', synthRate:0.98, synthPitch:1,
  calculatorInput:'', speakingRecordings:{}, videoRecordings:{}, snapshotLog:[], questionStats:{}, sectionStats:{},
  sectionRemaining:0, totalRemaining:EXAM_SIM.blueprint.totalDurationMinutes*60, idleSeconds:0,
  activeQuestionStartedAt:Date.now(), activeQuestionVisits:{}, timerHandle:null, flushHandle:null, autosaveHandle:null, snapshotHandle:null,
  audioPlaying:false, pendingSpeakingRecorder:null, pendingVideoRecorder:null, pendingVideoStream:null, dragToken:null,
  savedAt:0, splitRatio:58, annotationMode:'highlight', adaptivePath:[], photoId:null, fullscreenExits:0, incidents:[],
};
const root = document.getElementById('app');

function qKey(si,id){return si+'::'+id}
function currentSection(){return EXAM_SIM.blueprint.sections[state.currentSectionIndex]}
function currentQuestion(){const s=currentSection();return s&&s.questions[state.currentQuestionIndex]}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;')}
function norm(t){return String(t).trim().toLowerCase().replace(/\\s+/g,' ').replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/[.,!?;:]+\$/,'')}
function round2(v){return Math.round(v*100)/100}
function formatDuration(sec){const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return h>0?[h,m,s].map(x=>String(x).padStart(2,'0')).join(':'):[m,s].map(x=>String(x).padStart(2,'0')).join(':')}

function uaFingerprint(){return { userAgent:navigator.userAgent, platform:navigator.platform, language:navigator.language, languages:navigator.languages, screen:{w:screen.width,h:screen.height,pixelRatio:window.devicePixelRatio||1}, timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown', hardwareConcurrency:navigator.hardwareConcurrency||null, memory:navigator.deviceMemory||null }}

function logTelemetry(type, detail={}){
  if(!EXAM_SIM.telemetry.enabled)return;
  const item={ at:new Date().toISOString(), type, sectionId:currentSection()&&currentSection().id||null, questionId:currentQuestion()&&currentQuestion().id||null, detail };
  state.telemetry.unshift(item); if(state.telemetry.length>1000)state.telemetry.length=1000;
  if(EXAM_SIM.telemetry.emitConsoleMirror)console.log('[telemetry]',item);
  if(['copy','paste','window_blur','visibility_change','fullscreen_exit'].includes(type))state.incidents.unshift(item);
  render();
}

function trackVisit(){const q=currentQuestion(); if(!q)return; const k=qKey(state.currentSectionIndex,q.id); const now=Date.now(); const stat=state.questionStats[k]||{ visits:0, totalMs:0, lastStart:now, changes:0 }; stat.visits+=1; stat.lastStart=now; state.questionStats[k]=stat; }
function closeVisit(){const q=currentQuestion(); if(!q)return; const k=qKey(state.currentSectionIndex,q.id); const stat=state.questionStats[k]; if(stat&&stat.lastStart){stat.totalMs += Date.now()-stat.lastStart; stat.lastStart=0; state.questionStats[k]=stat;}}

function chooseVoice(accent, gender, nameHint){
  let voices=speechSynthesis.getVoices();
  const needle=(accent||'en-US').toLowerCase();
  const nh=String(nameHint||'').toLowerCase();
  
  // Filter out David, Zira, and Desktop offline/robotic voices if any other matches exist
  const nonRobotic = voices.filter(v => {
    const n = (v.name || '').toLowerCase();
    return !n.includes('david') && !n.includes('zira') && !n.includes('desktop');
  });
  if (nonRobotic.length > 0) {
    voices = nonRobotic;
  }
  
  const hints=['microsoft','edge','natural','online','google','neural','ava','multilingual']; 
  const male=['guy','davis','ryan','thomas','james','liam','connor','daniel','mark','arthur']; 
  const female=['jenny','sonia','libby','natasha','ava','emma','aria','clara','samantha'];
  const g=gender==='male'?male:gender==='female'?female:[];
  
  function score(v){
    const n=(v.name||'').toLowerCase(); 
    let s=0; 
    hints.forEach(h=>{if(n.includes(h))s+=5}); 
    g.forEach(h=>{if(n.includes(h))s+=4}); 
    if(nh && n.includes(nh))s+=25; 
    if((v.lang||'').toLowerCase().startsWith(needle.slice(0,5)))s+=10; 
    if(n.includes('ava') || n.includes('multilingual'))s+=15; 
    if(n.includes('natural') || n.includes('online'))s+=8;
    return s;
  }
  return voices.sort((a,b)=>score(b)-score(a))[0] || voices.find(v=>(v.lang||'').startsWith('en')) || voices[0] || null;
}
function sanitizeSpeech(text){return String(text||'').replace(/[\*_~#|\`{}]/g,'').replace(/\\s+/g,' ').trim()}
function speakSegments(segments, playOnce=false){
  if(!segments||!segments.length)return; const q=currentQuestion(); if(playOnce&&q.__playedOnce)return;
  speechSynthesis.cancel(); state.audioPlaying=true; logTelemetry('audio_play',{count:segments.length}); let i=0;
  const next=()=>{ if(i>=segments.length){ state.audioPlaying=false; if(playOnce)q.__playedOnce=true; render(); return; } const seg=segments[i++]; const u=new SpeechSynthesisUtterance(sanitizeSpeech(seg.text)); const v=chooseVoice(seg.accent, seg.gender, seg.nameHint); if(v)u.voice=v; u.lang=seg.accent || v&&v.lang || 'en-US'; u.rate=state.synthRate; u.pitch=state.synthPitch; u.onend=next; u.onerror=next; speechSynthesis.speak(u);}; next(); render();
}
function stopSpeech(){speechSynthesis.cancel(); state.audioPlaying=false; logTelemetry('audio_stop'); render();}

function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1); req.onupgradeneeded=()=>{const db=req.result; if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE)}; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);})}
async function idbSet(key, value){const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).put(value,key); tx.oncomplete=()=>resolve(true); tx.onerror=()=>reject(tx.error);})}
async function idbGet(key){const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly'); const req=tx.objectStore(DB_STORE).get(key); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);})}
async function idbKeys(prefix){const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly'); const req=tx.objectStore(DB_STORE).getAllKeys(); req.onsuccess=()=>resolve((req.result||[]).filter(k=>String(k).startsWith(prefix))); req.onerror=()=>reject(req.error);})}

async function requestMediaPermissions(){
  try{ if(EXAM_SIM.proctoring.microphonePrompt){const s=await navigator.mediaDevices.getUserMedia({audio:true,video:false}); state.micPermission='granted'; monitorMic(s); logTelemetry('mic_permission',{status:'granted'}); }}catch(e){state.micPermission='denied'; logTelemetry('mic_permission',{status:'denied'});}
  try{ if(EXAM_SIM.proctoring.webcamPrompt){const s=await navigator.mediaDevices.getUserMedia({audio:false,video:true}); state.camPermission='granted'; s.getTracks().forEach(t=>t.stop()); logTelemetry('cam_permission',{status:'granted'}); }}catch(e){state.camPermission='denied'; logTelemetry('cam_permission',{status:'denied'});}
  render();
}
function monitorMic(stream){const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return; const ctx=new AC(); const an=ctx.createAnalyser(); an.fftSize=512; ctx.createMediaStreamSource(stream).connect(an); const data=new Uint8Array(an.frequencyBinCount); const tick=()=>{an.getByteFrequencyData(data); const avg=data.reduce((a,b)=>a+b,0)/data.length; document.querySelectorAll('[data-mic-meter] > span').forEach(el=>el.style.width=Math.min(100,Math.round(avg/1.4))+'%'); requestAnimationFrame(tick)}; tick();}

async function startSpeakingRecording(q){ if(!navigator.mediaDevices||!window.MediaRecorder){alert('Audio recording unsupported'); return;} const key=qKey(state.currentSectionIndex,q.id); const stream=await navigator.mediaDevices.getUserMedia({audio:true}); const rec=new MediaRecorder(stream); const chunks=[]; rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}; rec.onstop=async()=>{const blob=new Blob(chunks,{type:'audio/webm'}); const entry={ blob, url:URL.createObjectURL(blob), bytes:blob.size, at:new Date().toISOString() }; state.speakingRecordings[key]=entry; await idbSet('rec:'+key+':audio', entry); logTelemetry('speaking_recorded',{questionId:q.id,bytes:blob.size}); stream.getTracks().forEach(t=>t.stop()); state.pendingSpeakingRecorder=null; render();}; rec.start(); state.pendingSpeakingRecorder=rec; logTelemetry('speaking_record_start',{questionId:q.id}); render(); setTimeout(()=>{if(rec.state!=='inactive')rec.stop()}, (q.responseSeconds||currentSection().speaking&&currentSection().speaking.responseSeconds||30)*1000); }
function stopSpeakingRecording(){const r=state.pendingSpeakingRecorder; if(r&&r.state!=='inactive')r.stop()}

async function startVideoRecording(q){ if(!navigator.mediaDevices||!window.MediaRecorder){alert('Video recording unsupported'); return;} const key=qKey(state.currentSectionIndex,q.id); const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:{width:640,height:480}}); state.pendingVideoStream=stream; const preview=document.querySelector('[data-video-preview]'); if(preview){preview.srcObject=stream; preview.muted=true; preview.play().catch(()=>{})} const rec=new MediaRecorder(stream); const chunks=[]; rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}; rec.onstop=async()=>{const blob=new Blob(chunks,{type:'video/webm'}); const entry={ blob, url:URL.createObjectURL(blob), bytes:blob.size, at:new Date().toISOString() }; state.videoRecordings[key]=entry; await idbSet('rec:'+key+':video', entry); logTelemetry('video_recorded',{questionId:q.id,bytes:blob.size}); stream.getTracks().forEach(t=>t.stop()); state.pendingVideoRecorder=null; state.pendingVideoStream=null; render();}; rec.start(); state.pendingVideoRecorder=rec; logTelemetry('video_record_start',{questionId:q.id}); render(); setTimeout(()=>{if(rec.state!=='inactive')rec.stop()}, (q.responseSeconds||currentSection().speaking&&currentSection().speaking.responseSeconds||60)*1000); }
function stopVideoRecording(){const r=state.pendingVideoRecorder; if(r&&r.state!=='inactive')r.stop()}

async function captureSnapshot(tag='interval'){ try{ if(!navigator.mediaDevices)return; const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false}); const video=document.createElement('video'); video.srcObject=stream; await video.play(); const canvas=document.createElement('canvas'); canvas.width=video.videoWidth||640; canvas.height=video.videoHeight||480; canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height); const blob=await new Promise(res=>canvas.toBlob(res,'image/jpeg',0.85)); const key='snap:'+Date.now()+':'+tag; const entry={ blob, at:new Date().toISOString(), tag, width:canvas.width, height:canvas.height }; state.snapshotLog.push({ key, at:entry.at, tag }); await idbSet(key, entry); stream.getTracks().forEach(t=>t.stop()); logTelemetry('snapshot_captured',{tag}); render(); }catch(e){} }

function enterFullscreenIfNeeded(){ if(!EXAM_SIM.proctoring.fullscreenRequired){state.fullscreenAccepted=true; return Promise.resolve()} if(document.fullscreenElement){state.fullscreenAccepted=true; return Promise.resolve()} return document.documentElement.requestFullscreen().then(()=>{state.fullscreenAccepted=true; logTelemetry('fullscreen_entered'); render()}).catch(()=>{state.fullscreenAccepted=false; logTelemetry('fullscreen_denied'); render()}) }
function runCalibration(){const u=new SpeechSynthesisUtterance('Audio calibration check. If you can hear this clearly, confirm below.'); u.lang='en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u); logTelemetry('audio_calibration_played')}

async function startExam(){
  state.started=true; state.reviewVisible=false; state.testEnded=false;
  // Resume an autosaved session (answers, flags, notes, timers) instead of
  // restarting from question 1 — that is what "autosave" promises.
  const resumed=!!state.resumedSession; state.resumedSession=false;
  if(!resumed){ state.currentSectionIndex=0; state.currentQuestionIndex=0; state.totalRemaining=EXAM_SIM.blueprint.totalDurationMinutes*60; state.sectionRemaining=(currentSection()&&currentSection().durationMinutes||0)*60; }
  state.activeQuestionStartedAt=Date.now(); trackVisit(); logTelemetry('exam_start',{mode:state.mode,resumed:resumed}); startTimers(); if(!resumed&&EXAM_SIM.proctoring.photoIdCheck)await promptPhotoId(); if(EXAM_SIM.proctoring.snapshotIntervalSeconds)state.snapshotHandle=setInterval(()=>captureSnapshot('interval'), EXAM_SIM.proctoring.snapshotIntervalSeconds*1000); render();
}
async function promptPhotoId(){ try{ const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false}); const video=document.createElement('video'); video.srcObject=stream; await video.play(); const canvas=document.createElement('canvas'); canvas.width=video.videoWidth||640; canvas.height=video.videoHeight||480; canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height); const blob=await new Promise(res=>canvas.toBlob(res,'image/jpeg',0.92)); state.photoId={ url:URL.createObjectURL(blob), at:new Date().toISOString() }; await idbSet('photoId', { blob, at:state.photoId.at }); stream.getTracks().forEach(t=>t.stop()); logTelemetry('photo_id_capture',{ok:true}); }catch(e){ logTelemetry('photo_id_capture',{ok:false}); } }
function startTimers(){ clearInterval(state.timerHandle); state.timerHandle=setInterval(()=>{ if(!state.started||state.testEnded)return; state.totalRemaining=Math.max(0,state.totalRemaining-1); state.sectionRemaining=Math.max(0,state.sectionRemaining-1); state.idleSeconds+=1; if(EXAM_SIM.proctoring.detectIdle&&state.idleSeconds>=EXAM_SIM.proctoring.idleThresholdSeconds){registerWarning('Idle activity detected'); state.idleSeconds=0} if(state.sectionRemaining===300||state.totalRemaining===300)countdownChime('5 minutes remaining'); if(state.sectionRemaining===60||state.totalRemaining===60)countdownChime('1 minute remaining'); if(state.sectionRemaining===0)advanceSectionOrFinish(); if(state.totalRemaining===0)finishExam(); updateBars(); },1000); clearInterval(state.flushHandle); state.flushHandle=setInterval(flushTelemetry, EXAM_SIM.telemetry.flushIntervalMs); clearInterval(state.autosaveHandle); state.autosaveHandle=setInterval(()=>saveProgress(true), 10000); }
function countdownChime(message){ try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.frequency.value=880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.001,ctx.currentTime); g.gain.exponentialRampToValueAtTime(.08,ctx.currentTime+.01); g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.2); o.start(); o.stop(ctx.currentTime+.22); }catch(e){} logTelemetry('countdown_warning',{message}); }
function updateBars(){ const total=EXAM_SIM.blueprint.totalDurationMinutes*60; const tp=total?((total-state.totalRemaining)/total)*100:0; const tb=document.querySelector('[data-total-timer] > span'); if(tb)tb.style.width=tp+'%'; const s=currentSection(); const sp=s&&s.durationMinutes?(((s.durationMinutes*60)-state.sectionRemaining)/(s.durationMinutes*60))*100:0; const sb=document.querySelector('[data-section-timer] > span'); if(sb)sb.style.width=sp+'%'; const tn=document.querySelector('[data-total-remaining]'); const sn=document.querySelector('[data-section-remaining]'); if(tn)tn.textContent=formatDuration(state.totalRemaining); if(sn)sn.textContent=formatDuration(state.sectionRemaining); const sd=document.querySelector('[data-save-dot]'); if(sd)sd.className='saveDot'+(Date.now()-state.savedAt<15000?' saved':''); }
function flushTelemetry(){ if(!EXAM_SIM.telemetry.enabled)return; if(EXAM_SIM.telemetry.storeLocally)localStorage.setItem('examTelemetry:'+EXAM_SIM.blueprint.examId, JSON.stringify(state.telemetry)); if(EXAM_SIM.telemetry.endpointUrl){ try{navigator.sendBeacon(EXAM_SIM.telemetry.endpointUrl, JSON.stringify({ examId:EXAM_SIM.blueprint.examId, events:state.telemetry.slice(0,200) }))}catch(e){} } }

function setAnswer(v){ const q=currentQuestion(); const k=qKey(state.currentSectionIndex,q.id); const qs=state.questionStats[k]||{ visits:0,totalMs:0,lastStart:0,changes:0 }; qs.changes=(qs.changes||0)+1; state.questionStats[k]=qs; state.answers[k]=v; state.idleSeconds=0; logTelemetry('answer_changed',{questionId:q.id,latencyMs:Date.now()-state.activeQuestionStartedAt}); if(EXAM_SIM.blueprint.adaptive)maybeBranchAdaptive(q,v); render(); }
function maybeBranchAdaptive(q,v){ const result=gradeQuestion(q,v); state.adaptivePath.push({ questionId:q.id, difficulty:q.difficulty||'adaptive', correct:result.correct }); }
function toggleFlag(){ const q=currentQuestion(); const k=qKey(state.currentSectionIndex,q.id); state.flags[k]=!state.flags[k]; logTelemetry('flag_toggled',{questionId:q.id,flagged:!!state.flags[k]}); render(); }
function jumpToQuestion(i){ const s=currentSection(); if(i<0||i>=s.questions.length)return; if(s.lockAfterAdvance && i<state.currentQuestionIndex)return; closeVisit(); state.currentQuestionIndex=i; state.activeQuestionStartedAt=Date.now(); trackVisit(); logTelemetry('question_navigate',{to:i+1}); render(); }
function nextQuestion(){ const s=currentSection(); closeVisit(); if(state.currentQuestionIndex<s.questions.length-1){ state.currentQuestionIndex+=1; state.activeQuestionStartedAt=Date.now(); trackVisit(); } else advanceSectionOrFinish(); logTelemetry('question_next',{to:state.currentQuestionIndex+1}); render(); }
function prevQuestion(){ const s=currentSection(); if(s.lockAfterAdvance||state.currentQuestionIndex===0)return; closeVisit(); state.currentQuestionIndex-=1; state.activeQuestionStartedAt=Date.now(); trackVisit(); logTelemetry('question_prev',{to:state.currentQuestionIndex+1}); render(); }
function advanceSectionOrFinish(){ closeVisit(); const prev=currentSection(); if(prev)state.sectionStats[prev.id]={ remainingAtExit:state.sectionRemaining, completedAt:new Date().toISOString() }; if(state.currentSectionIndex<EXAM_SIM.blueprint.sections.length-1){ state.currentSectionIndex+=1; state.currentQuestionIndex=0; state.sectionRemaining=currentSection().durationMinutes*60; state.activeQuestionStartedAt=Date.now(); trackVisit(); logTelemetry('section_advance',{to:currentSection().id}); } else finishExam(); render(); }
async function finishExam(){ closeVisit(); state.testEnded=true; state.reviewVisible=true; state.started=false; clearInterval(state.timerHandle); clearInterval(state.flushHandle); clearInterval(state.autosaveHandle); clearInterval(state.snapshotHandle); flushTelemetry(); logTelemetry('exam_finish'); await saveProgress(true); render(); await exportZip(true); }
function registerWarning(reason){ state.warnings+=1; logTelemetry('proctor_warning',{reason,warnings:state.warnings}); render(); }

function gradeQuestion(q,answer){
  if(answer==null||answer===''||(Array.isArray(answer)&&answer.length===0))return { earned:0,max:q.points,correct:false };
  const partial=EXAM_SIM.blueprint.scoring.partialCredit;
  switch(q.type){
    case 'single_choice': case 'image_choice': case 'true_false_not_given': case 'yes_no_not_given': { const c=(q.options.find(o=>o.correct)||{}).id; return { earned:answer===c?q.points:0,max:q.points,correct:answer===c } }
    case 'multiple_select': { const c=q.options.filter(o=>o.correct).map(o=>o.id).sort(); const s=[...(answer||[])].sort(); const m=c.filter(id=>s.includes(id)).length; const w=s.filter(id=>!c.includes(id)).length; const e=partial?Math.max(0,(m/c.length)*q.points - w*(q.points/Math.max(2,c.length+1))):JSON.stringify(c)===JSON.stringify(s)?q.points:0; return { earned:round2(e),max:q.points,correct:JSON.stringify(c)===JSON.stringify(s) } }
    case 'matching': case 'matching_headings': case 'matching_information': case 'matching_features': case 'matching_sentence_endings': case 'categorization': { const ks=Object.keys(q.correctMap||{}); const ok=ks.filter(k=>answer&&answer[k]===q.correctMap[k]).length; const e=partial?(ok/ks.length)*q.points:(ok===ks.length?q.points:0); return { earned:round2(e),max:q.points,correct:ks.length>0&&ok===ks.length } }
    case 'sentence_completion': case 'summary_completion': case 'note_completion': case 'table_completion': case 'flow_chart_completion': case 'diagram_label_completion': case 'short_answer': case 'listen_and_type': case 'dictation': { const acc=(Array.isArray(q.expectedAnswers)?q.expectedAnswers:[q.expectedAnswers||[]]).flat().map(x=>norm(String(x))); const ok=acc.includes(norm(answer)); return { earned:ok?q.points:0,max:q.points,correct:ok } }
    case 'build_sentence': { const acc=(Array.isArray(q.expectedAnswers)?q.expectedAnswers:[q.expectedAnswers||[]]).flat().map(x=>norm(String(x))); const assembled=Array.isArray(answer)?answer.join(' '):answer; const ok=acc.includes(norm(assembled)); return { earned:ok?q.points:0,max:q.points,correct:ok } }
    case 'numeric_entry': case 'fraction_entry': case 'equation_entry': { const acc=[q.correctAnswer,...(q.acceptedAnswers||[])].map(x=>norm(String(x))); const ok=acc.includes(norm(String(answer))); return { earned:ok?q.points:0,max:q.points,correct:ok } }
    case 'reorder_paragraphs': case 'sequence': { const ok=JSON.stringify(answer)===JSON.stringify(q.correctOrder); const match=(answer||[]).filter((x,i)=>x===q.correctOrder[i]).length; return { earned: ok?q.points: round2((partial?match/Math.max(1,q.correctOrder.length):0)*q.points), max:q.points, correct:ok } }
    case 'drag_and_drop_cloze': case 'dropdown_cloze': case 'interactive_reading': { let ok=0; q.blanks.forEach(b=>{ const exp=Array.isArray(b.correct)?b.correct.map(norm):[norm(b.correct)]; if(exp.includes(norm((answer||{})[b.id]||'')))ok++; }); const e=partial?(ok/q.blanks.length)*q.points:(ok===q.blanks.length?q.points:0); return { earned:round2(e),max:q.points,correct:ok===q.blanks.length } }
    case 'highlight_text': case 'highlight_sentence': { const s=(answer||[]).map(norm).sort(); const c=q.correctSnippets.map(norm).sort(); const exact=JSON.stringify(s)===JSON.stringify(c); const ov=c.filter(x=>s.includes(x)).length; return { earned: exact?q.points: round2((partial?ov/Math.max(1,c.length):0)*q.points), max:q.points, correct:exact } }
    case 'hotspot': { const c=((q.media&&q.media.hotspotAreas)||[]).filter(a=>a.correct).map(a=>a.id).sort(); const s=[...(answer||[])].sort(); const exact=JSON.stringify(c)===JSON.stringify(s); const ov=c.filter(id=>s.includes(id)).length; return { earned: exact?q.points: round2((partial?ov/Math.max(1,c.length):0)*q.points), max:q.points, correct:exact } }
    case 'matrix': case 'matrix_selection': { const c=[...(q.correctCells||[])].sort(); const s=[...(answer||[])].sort(); const exact=JSON.stringify(c)===JSON.stringify(s); const ov=c.filter(id=>s.includes(id)).length; return { earned: exact?q.points: round2((partial?ov/Math.max(1,c.length):0)*q.points), max:q.points, correct:exact } }
    case 'gap_fill': case 'complete_words': { const blanks=Array.isArray(q.blanks)?q.blanks:[]; if(!blanks.length)return { earned:0,max:q.points,correct:false }; let ok=0; blanks.forEach(b=>{ const exp=Array.isArray(b.correct)?b.correct.map(norm):[norm(b.correct||'')]; if(exp.includes(norm((answer||{})[b.id]||'')))ok++; }); const e=partial?(ok/blanks.length)*q.points:(ok===blanks.length?q.points:0); return { earned:round2(e),max:q.points,correct:ok===blanks.length } }
    case 'multi_field': case 'graph_interaction': { const fields=(answer&&answer.fields)||{}; const keys=Array.isArray(q.fields)?q.fields:[]; if(!keys.length)return { earned:0,max:q.points,correct:false }; let ok=0; keys.forEach(f=>{ const exp=Array.isArray(q.correctAnswers[f.id])?q.correctAnswers[f.id].map(norm):[norm(String(q.correctAnswers[f.id]==null?'':q.correctAnswers[f.id]))]; if(exp.includes(norm(String(fields[f.id]==null?'':fields[f.id]))))ok++; }); const e=partial?(ok/keys.length)*q.points:(ok===keys.length?q.points:0); return { earned:round2(e),max:q.points,correct:ok===keys.length } }
    case 'essay': case 'email': case 'letter': case 'long_answer': case 'read_aloud': case 'repeat_sentence': case 'speaking_response': case 'oral_interview': case 'role_play': case 'video_reflection': { const len=String(answer&&answer.text||answer||'').trim().split(/\\s+/).filter(Boolean).length; const min=q.minWords||0; const base=min>0?Math.min(1,len/min):1; return { earned:round2(base*q.points), max:q.points, correct:base>=0.7 } }
    default: return { earned:0,max:q.points,correct:false }
  }
}

function buildResults(){
  const bySection=[]; let totalEarned=0,totalMax=0; const tagMap={}; const difficultyMap={easy:{right:0,total:0},medium:{right:0,total:0},hard:{right:0,total:0},adaptive:{right:0,total:0}};
  EXAM_SIM.blueprint.sections.forEach((section,si)=>{ let earned=0,max=0; const items=section.questions.map(q=>{ const k=qKey(si,q.id); const answer=state.answers[k]; const result=gradeQuestion(q,answer); earned+=result.earned; max+=result.max; (q.skillTags||[]).forEach(tag=>{ tagMap[tag]=tagMap[tag]||{right:0,total:0,points:0,max:0}; tagMap[tag].total+=1; if(result.correct)tagMap[tag].right+=1; tagMap[tag].points+=result.earned; tagMap[tag].max+=result.max; }); const d=q.difficulty||'adaptive'; if(difficultyMap[d]){ difficultyMap[d].total+=1; if(result.correct)difficultyMap[d].right+=1; } return { q,key:k,answer,result, stats:state.questionStats[k]||{} }; }); totalEarned+=earned; totalMax+=max; const percent=max?round2(earned/max*100):0; bySection.push({ section, earned:round2(earned), max, percent, items }); });
  const weighted = applyWeightedScoring(bySection);
  const percent=totalMax?round2(totalEarned/totalMax*100):0;
  const sectionMinimumsPassed = bySection.every(s=> !s.section.minimumPassPercent || s.percent >= s.section.minimumPassPercent);
  const passed = EXAM_SIM.blueprint.scoring.passingLogic==='section_minimums' ? sectionMinimumsPassed && weighted.percent >= EXAM_SIM.blueprint.passPercent : weighted.percent >= EXAM_SIM.blueprint.passPercent;
  const band = estimateBand(weighted.percent);
  const skillBreakdown = Object.entries(tagMap).map(([tag,v])=>({ tag, percent:v.max?round2(v.points/v.max*100):0, accuracy:v.total?round2(v.right/v.total*100):0, total:v.total })).sort((a,b)=>a.percent-b.percent);
  return { totalEarned:round2(totalEarned), totalMax, rawPercent:percent, weightedPercent:weighted.percent, passed, band, bySection, skillBreakdown, difficultyMap, confidence:buildConfidenceStats(bySection), pacing:buildPacing(bySection), aiSummary:buildAiSummary(bySection, skillBreakdown, band, weighted.percent, passed) };
}
function applyWeightedScoring(bySection){ const weights=EXAM_SIM.blueprint.scoring.sectionWeights||{}; let sum=0, totalWeight=0; bySection.forEach(s=>{ const w=weights[s.section.id] ?? weights[s.section.type] ?? 1; totalWeight+=w; sum+=s.percent*w; }); return { percent: totalWeight?round2(sum/totalWeight):0 } }
function estimateBand(percent){ const mapping=EXAM_SIM.blueprint.scoring.bandMapping||[]; for(const row of mapping.sort((a,b)=>b.minPercent-a.minPercent)){ if(percent>=row.minPercent)return row.label } return EXAM_SIM.blueprint.scoring.scale==='band' ? 'unmapped' : percent+'%'; }
function buildConfidenceStats(bySection){ let flaggedRight=0, flaggedWrong=0, unflaggedRight=0, unflaggedWrong=0; bySection.forEach(sec=>sec.items.forEach(item=>{ const f=!!state.flags[item.key]; if(f&&item.result.correct)flaggedRight++; if(f&&!item.result.correct)flaggedWrong++; if(!f&&item.result.correct)unflaggedRight++; if(!f&&!item.result.correct)unflaggedWrong++; })); return { flaggedRight, flaggedWrong, unflaggedRight, unflaggedWrong } }
function buildPacing(bySection){ const rows=[]; bySection.forEach(sec=>sec.items.forEach((item,idx)=>{ const ms=item.stats.totalMs||0; rows.push({ id:item.q.id, label:sec.section.title+' Q'+(idx+1), ms, suggested:(item.q.timing&&item.q.timing.suggestedSeconds||0)*1000, correct:item.result.correct }); })); return rows.sort((a,b)=>b.ms-a.ms) }
function buildAiSummary(bySection, skillBreakdown, band, percent, passed){
  const weak=skillBreakdown.slice(0,5).map(x=>x.tag);
  const strong=[...skillBreakdown].sort((a,b)=>b.percent-a.percent).slice(0,5).map(x=>x.tag);
  return {
    prompt: \`Analyze this learner's exam performance in detail. Focus on timing, recurring skill gaps, likely misconceptions, confidence mismatch, and a 2-week improvement plan. Use the structured stats, per-question results, telemetry, and recordings metadata.\`,
    learnerSummary: { percent, band, passed, strongestTags: strong, weakestTags: weak, warningCount: state.warnings, incidents: state.incidents.length },
    sectionSummary: bySection.map(s=>({ section:s.section.title, percent:s.percent, minPass:s.section.minimumPassPercent||null })),
    nextBestActions: [ 'Target the bottom 3 skill tags first', 'Review all flagged-but-wrong items', 'Reattempt incorrect items under timed conditions', 'Compare speaking/writing responses against model answers and rubric sliders' ]
  }
}

function saveProgress(silent=false){
  const payload={ state:{ mode:state.mode,currentSectionIndex:state.currentSectionIndex,currentQuestionIndex:state.currentQuestionIndex,answers:state.answers,flags:state.flags,notes:state.notes,warnings:state.warnings,totalRemaining:state.totalRemaining,sectionRemaining:state.sectionRemaining,questionStats:state.questionStats,sectionStats:state.sectionStats,splitRatio:state.splitRatio,theme:state.theme,dyslexiaFont:state.dyslexiaFont,fontScale:state.fontScale,contrast:state.contrast,adaptivePath:state.adaptivePath,photoId:state.photoId }, savedAt:new Date().toISOString() };
  localStorage.setItem('examProgress:'+EXAM_SIM.blueprint.examId, JSON.stringify(payload)); state.savedAt=Date.now(); if(!silent)logTelemetry('progress_saved'); renderStatusOnly();
}
async function restoreProgress(){ const raw=localStorage.getItem('examProgress:'+EXAM_SIM.blueprint.examId); if(raw){ try{ const saved=JSON.parse(raw); const st=saved&&saved.state||null; if(st){ Object.assign(state, st); state.savedAt=Date.now(); const hasWork=Object.keys(st.answers||{}).length>0||(st.currentSectionIndex||0)>0||(st.totalRemaining||0)<EXAM_SIM.blueprint.totalDurationMinutes*60; if(st.testEnded){ state.testEnded=true; state.reviewVisible=true; state.started=false; } else if(hasWork){ state.resumedSession=true; } } }catch(e){} } const audioKeys=await idbKeys('rec:'); for(const key of audioKeys){ const entry=await idbGet(key); if(!entry)continue; if(String(key).endsWith(':audio'))state.speakingRecordings[String(key).replace('rec:','').replace(':audio','')]=entry; if(String(key).endsWith(':video'))state.videoRecordings[String(key).replace('rec:','').replace(':video','')]=entry; } const photo=await idbGet('photoId'); if(photo)state.photoId={ url:URL.createObjectURL(photo.blob), at:photo.at }; }
function renderStatusOnly(){ const sd=document.querySelector('[data-save-dot]'); if(sd)sd.className='saveDot saved'; }

function buildResultsJson(){
  const results=buildResults();
  const exam=EXAM_SIM.blueprint;
  const startedEv=state.telemetry.slice().reverse().find(x=>x.type==='exam_start');
  let spentMs=0; Object.keys(state.questionStats).forEach(k=>{spentMs+=(state.questionStats[k].totalMs||0)});
  let correctCount=0,totalCount=0; results.bySection.forEach(s=>{s.items.forEach(it=>{totalCount++; if(it.result.correct)correctCount++;})});
  const focusTypes={window_blur:1,visibility_change:1,copy:1,paste:1,fullscreen_exit:1};
  const focusLossEvents=state.telemetry.filter(x=>focusTypes[x.type]).map(x=>({ at:x.at, type:x.type, detail:x.detail }));
  const candidateReference=EXAM_SIM.options.candidateReference||(exam.candidate&&exam.candidate.reference)||'Candidate';
  const dqa=[];
  results.bySection.forEach(sec=>{sec.items.forEach((item,idx)=>{const q=item.q; const answered=q&&item.answer!=null&&item.answer!==''&&!(Array.isArray(item.answer)&&item.answer.length===0); const keyText=buildCorrectAnswer(q); const chosenRaw=item.answer; const chosenText=answered?formatChosenAnswer(q,chosenRaw):'[UNANSWERED]'; dqa.push({ questionNumber:idx+1, taskId:q.id, sectionId:sec.section.id, sectionTitle:sec.section.title, taskType:q.type, status:answered?'ANSWERED':'UNANSWERED', prompt:q.prompt||'', chosenAnswer:{ raw:answered?chosenRaw:null, displayText:chosenText }, correctAnswer:{ raw:keyText, displayText:keyText||'Sample Model Answer / Task Rubric' }, scoring:{ gradeStatus:gradeStatusOf({q,answer:item.answer,result:item.result,answered}), pointsEarned:item.result.earned, pointsMax:item.result.max, isCorrect:item.result.correct }, telemetry:{ visitsCount:item.stats.visits||0, timeSpentSeconds:Math.round((item.stats.totalMs||0)/1000), timeSpentMs:item.stats.totalMs||0 }, candidateNotes:state.notes[item.key]||'', explanation:q.explanation||'', taskKeys:q.taskKeys||null }); }); });
  return {
    exam: { id:exam.examId, name:exam.examName, provider:exam.provider, year:exam.year, locale:exam.locale, deliveryMode:exam.deliveryMode, family:exam.examFamily||exam.provider||'Mock Test' },
    examMetadata: { title:exam.examName, name:exam.examName, provider:exam.provider, year:exam.year, locale:exam.locale, deliveryMode:exam.deliveryMode, family:exam.examFamily||exam.provider||'Mock Test' },
    examFamily: exam.examFamily||exam.provider||'Mock Test',
    candidateReference: candidateReference,
    session: { mode:state.mode, started:!!startedEv, startedAt:(startedEv&&startedEv.at)||null, completedAt:new Date().toISOString(), durationRemaining:{ total:state.totalRemaining, section:state.sectionRemaining }, browser:uaFingerprint(), warnings:state.warnings, incidents:state.incidents, fullscreenExits:state.fullscreenExits, photoIdCaptured:!!state.photoId, candidateReference: candidateReference },
    timing: { totalTimeSpentMs:spentMs, startedAt:(startedEv&&startedEv.at)||null, completedAt:new Date().toISOString(), durationRemaining:{ total:state.totalRemaining, section:state.sectionRemaining } },
    focusLossEvents: focusLossEvents,
    scoring: { rawPercent:results.rawPercent, weightedPercent:results.weightedPercent, percent:results.weightedPercent, passed:results.passed, band:results.band, passingLogic:exam.scoring.passingLogic, passPercent:exam.passPercent, correctCount:correctCount, totalCount:totalCount, sectionScores:results.bySection.map(s=>({ sectionId:s.section.id, sectionTitle:s.section.title, type:s.section.type, percent:s.percent, earned:s.earned, max:s.max })) },
    sections: results.bySection.map(sec=>({ id:sec.section.id, sectionId:sec.section.id, title:sec.section.title, sectionTitle:sec.section.title, type:sec.section.type, percent:sec.percent, minimumPassPercent:sec.section.minimumPassPercent||null, sectionStats:state.sectionStats[sec.section.id]||null, items:sec.items.map((item,idx)=>({ id:item.q.id, taskId:item.q.id, order:idx+1, type:item.q.type, taskType:item.q.type, prompt:item.q.prompt, difficulty:item.q.difficulty||'adaptive', skillTags:item.q.skillTags||[], answer:item.answer??null, correct:item.result.correct, earned:item.result.earned, max:item.result.max, correctAnswer:buildCorrectAnswer(item.q), flagged:!!state.flags[item.key], notes:state.notes[item.key]||'', visits:item.stats.visits||0, totalMs:item.stats.totalMs||0, changes:item.stats.changes||0, suggestedSeconds:item.q.timing&&item.q.timing.suggestedSeconds||null, explanation:item.q.explanation||'', strategyTips:item.q.strategyTips||[], miniLesson:item.q.miniLesson||'', modelAnswer:item.q.modelAnswer||item.q.sampleAnswer||'', taskKeys:item.q.taskKeys||null, answerLabel:item.answer!=null&&item.answer!==''&&!(Array.isArray(item.answer)&&item.answer.length===0)?formatChosenAnswer(item.q,item.answer):null })) })),
    detailedQuestionsAnalysis: dqa,
    answers: state.answers,
    analytics: { skillBreakdown:results.skillBreakdown, confidence:results.confidence, difficultyMap:results.difficultyMap, pacing:results.pacing, adaptivePath:state.adaptivePath },
    qualityAssurance: exam.qualityAssurance||null,
    sourceRegistry: exam.sourceRegistry||[],
    telemetry: state.telemetry,
    aiReady: results.aiSummary,
  };
}

function emailHandoff(zipBlob, filename){
  const subject=encodeURIComponent('Exam submission: '+EXAM_SIM.blueprint.examName);
  const body=encodeURIComponent('The ZIP package was downloaded locally as '+filename+'. Attach it to this email and send.');
  window.location.href='mailto:?subject='+subject+'&body='+body;
}

function crc32Table(){ let c; const t=[]; for(let n=0;n<256;n++){ c=n; for(let k=0;k<8;k++)c=((c&1)?(0xEDB88320^(c>>>1)):(c>>>1)); t[n]=c>>>0; } return t; }
const CRC_TABLE = crc32Table();
function crc32(bytes){ let c=0^(-1); for(let i=0;i<bytes.length;i++)c=(c>>>8)^CRC_TABLE[(c^bytes[i])&0xFF]; return (c^(-1))>>>0; }
function dosTimeDate(date){ const d=new Date(date); const time=((d.getHours()&31)<<11)|((d.getMinutes()&63)<<5)|((Math.floor(d.getSeconds()/2))&31); const day=((d.getFullYear()-1980&127)<<9)|(((d.getMonth()+1)&15)<<5)|(d.getDate()&31); return { time, day }; }
function concatUint8(arrs){ const len=arrs.reduce((a,b)=>a+b.length,0); const out=new Uint8Array(len); let off=0; arrs.forEach(a=>{out.set(a,off); off+=a.length}); return out; }
function u16(n){ return Uint8Array.of(n&255,(n>>>8)&255); }
function u32(n){ return Uint8Array.of(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255); }
function textBytes(s){ return new TextEncoder().encode(s); }
async function buildZip(files){
  const locals=[]; const centrals=[]; let offset=0;
  for(const file of files){ const name=textBytes(file.name); const data=file.data instanceof Uint8Array?file.data:new Uint8Array(await file.data.arrayBuffer()); const crc=crc32(data); const dt=dosTimeDate(file.date||Date.now());
    const local=concatUint8([u32(0x04034b50),u16(20),u16(0),u16(0),u16(dt.time),u16(dt.day),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
    const central=concatUint8([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(dt.time),u16(dt.day),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
    locals.push(local); centrals.push(central); offset += local.length;
  }
  const centralBytes=concatUint8(centrals); const localBytes=concatUint8(locals); const end=concatUint8([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralBytes.length),u32(localBytes.length),u16(0)]);
  return new Blob([localBytes, centralBytes, end], { type:'application/zip' });
}

function printableReportHtml(){ const results=buildResults(); return \`<!doctype html><html><head><meta charset="utf-8"><title>\${esc(EXAM_SIM.blueprint.examName)} Report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1,h2,h3{margin:.2em 0}.sec{margin:24px 0;padding:16px;border:1px solid #ddd;border-radius:12px}.bar{height:12px;background:#eee;border-radius:999px;overflow:hidden}.bar span{display:block;height:100%;background:#4f46e5}</style></head><body><h1>\${esc(EXAM_SIM.blueprint.examName)} Report</h1><p>\${results.weightedPercent}% , \${results.passed?'Passed':'Not passed'} , Band: \${esc(String(results.band))}</p>\${results.bySection.map(s=>\`<div class="sec"><h2>\${esc(s.section.title)}</h2><div class="bar"><span style="width:\${s.percent}%"></span></div><p>\${s.percent}%</p></div>\`).join('')}</body></html>\` }
async function exportPdfReport(){ const html=printableReportHtml(); const blob=new Blob([html], { type:'text/html' }); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=EXAM_SIM.blueprint.examId+'-report.html'; a.click(); URL.revokeObjectURL(url); }

async function exportZip(auto=false){
  const resultsJson=buildResultsJson(); const files=[];
  files.push({ name:'results.json', data:textBytes(JSON.stringify(resultsJson,null,2)), date:Date.now() });
  files.push({ name:'report.html', data:textBytes(printableReportHtml()), date:Date.now() });
  for(const [key,entry] of Object.entries(state.speakingRecordings)) files.push({ name:'recordings/'+key.replace(/[:]/g,'_')+'.webm', data:entry.blob, date:Date.now() });
  for(const [key,entry] of Object.entries(state.videoRecordings)) files.push({ name:'recordings/'+key.replace(/[:]/g,'_')+'.webm', data:entry.blob, date:Date.now() });
  const snapKeys=await idbKeys('snap:'); for(const key of snapKeys){ const entry=await idbGet(key); if(entry&&entry.blob)files.push({ name:'snapshots/'+String(key).replace(/[:]/g,'_')+'.jpg', data:entry.blob, date:Date.now() }); }
  const zip=await buildZip(files); const filename=EXAM_SIM.blueprint.examId+'-submission.zip'; const url=URL.createObjectURL(zip); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),4000); logTelemetry('zip_exported',{fileCount:files.length}); if(auto)emailHandoff(zip, filename);
}

function audioSegments(q){
  const m=q&&q.media; if(!m)return [];
  if(m.audio&&Array.isArray(m.audio.segments)&&m.audio.segments.length){
    const loc=EXAM_SIM.blueprint.locale||'en';
    const accent=loc==='de'?'de-DE':loc==='fr'?'fr-FR':loc==='es'?'es-ES':'en-US';
    return m.audio.segments.map(function(s){
      const tag=String(s.speakerTag||'').toLowerCase();
      const femaleNames=['aria','jenny','natasha','sonia'];
      const maleNames=['guy','ryan','thomas','daniel'];
      const num=parseInt(tag.replace(/[^0-9]/g,'')||'1',10)-1;
      let nameHint='';
      if(tag.indexOf('female')===0)nameHint=femaleNames[num]||'ava';
      else if(tag.indexOf('male')===0)nameHint=maleNames[num]||'guy';
      else if(tag==='speaker')nameHint='ava';
      return { speaker:(s.speakerLabel||s.speakerTag||'Narrator'), gender:/^female/i.test(tag)?'female':(/^male/i.test(tag)?'male':'neutral'), accent:accent, text:s.text, nameHint:nameHint };
    });
  }
  if(m.audioVoices&&m.audioVoices.length)return m.audioVoices;
  if(m.audioScript)return [{ speaker:'Narrator', gender:'neutral', accent:'en-US', text:m.audioScript }];
  return [];
}
function transcriptHtml(q){
  const audio=q&&q.media&&q.media.audio; if(!audio)return '';
  const policy=audio.transcriptPolicy||'always';
  const show=policy==='always'||(policy==='hidden_until_submitted'&&state.testEnded);
  if(!show)return '';
  const body=(audio.segments||[]).map(function(s){ return '<div class="transcript-line" style="padding:6px 0;border-bottom:1px solid var(--line)"><strong>'+esc(s.speakerLabel||s.speakerTag||'Speaker')+':</strong> '+esc(s.text)+'</div>'; }).join('');
  if(!body)return '';
  return '<div class="card"><div class="eyebrow">Transcript</div><div style="font-size:.92rem;line-height:1.6">'+body+'</div>'+(policy==='hidden_until_submitted'?'<div class="tiny" style="margin-top:8px">Transcript revealed after submission.</div>':'')+'</div>';
}
function renderMultiField(q,a){
  const cur=(a&&a.fields)||{};
  const table=(q.media&&q.media.table)?'<div class="card"><div class="eyebrow">Data table</div><table style="width:100%;border-collapse:collapse;font-size:.9rem"><thead><tr>'+q.media.table.columns.map(function(c){ return '<th style="padding:8px 10px;border:1px solid var(--line);text-align:left">'+esc(c)+'</th>'; }).join('')+'</tr></thead><tbody>'+q.media.table.rows.map(function(r){ return '<tr>'+r.map(function(c){ return '<td style="padding:8px 10px;border:1px solid var(--line)">'+esc(c)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div>':'';
  const fields='<div class="grid4" style="grid-template-columns:repeat(2,minmax(0,1fr))">'+(q.fields||[]).map(function(f,i){ return '<label style="display:grid;gap:6px"><span class="tiny">'+esc(f.label||('Part '+(i+1)))+'</span><input type="text" inputmode="'+(f.inputMode||'text')+'" data-mf="'+esc(f.id)+'" value="'+esc(cur[f.id]!=null?cur[f.id]:'')+'" placeholder="'+esc(f.placeholder||'Answer')+'" />'+(f.unitLabel?'<span class="tiny">Required unit: '+esc(f.unitLabel)+'</span>':'')+'</label>'; }).join('')+'</div>';
  const working=(q.workingRequired===false)?'':'<label style="display:grid;gap:6px;margin-top:12px"><span class="tiny">Working / explanation (optional)</span><textarea data-mfwork placeholder="Show your method or explain your answer where required.">'+esc((a&&a.working)||'')+'</textarea></label>';
  return '<div class="builder">'+table+fields+working+'</div>';
}
function buildCorrectAnswer(q){
  if(!q)return '';
  try{
    switch(q.type){
      case 'single_choice': case 'image_choice': case 'true_false_not_given': case 'yes_no_not_given': { const c=q.options.filter(function(o){return o.correct}); return c.map(function(o){return o.label||o.id}).join(' | ')||''; }
      case 'multiple_select': return q.options.filter(function(o){return o.correct}).map(function(o){return o.label||o.id}).join(' | ');
      case 'matching': case 'matching_headings': case 'matching_information': case 'matching_features': case 'matching_sentence_endings': case 'categorization': { const out=[]; (q.leftItems||[]).forEach(function(l){ const rid=q.correctMap&&q.correctMap[l.id]; const r=(q.rightItems||[]).find(function(x){return x.id===rid}); out.push(l.label+' -> '+(r?r.label:(rid||'?'))); }); return out.join(' | '); }
      case 'sentence_completion': case 'summary_completion': case 'note_completion': case 'table_completion': case 'flow_chart_completion': case 'diagram_label_completion': case 'short_answer': case 'listen_and_type': case 'dictation': case 'build_sentence': return (Array.isArray(q.expectedAnswers)?q.expectedAnswers:[q.expectedAnswers||[]]).flat().join(' | ');
      case 'gap_fill': case 'complete_words': case 'drag_and_drop_cloze': case 'dropdown_cloze': case 'interactive_reading': { const out=[]; (q.blanks||[]).forEach(function(b){ const exp=Array.isArray(b.correct)?b.correct.join(' / '):b.correct; out.push((b.id||'blank')+': '+(exp||'')); }); return out.join(' | '); }
      case 'numeric_entry': case 'fraction_entry': case 'equation_entry': return String(q.correctAnswer!=null?q.correctAnswer:(q.acceptedAnswers&&q.acceptedAnswers[0]!=null?q.acceptedAnswers[0]:''));
      case 'reorder_paragraphs': case 'sequence': return (q.correctOrder||[]).map(function(id){ const it=(q.items||[]).find(function(x){return x.id===id}); return it?it.label:id; }).join(' -> ');
      case 'highlight_text': case 'highlight_sentence': return (q.correctSnippets||[]).join(' | ');
      case 'matrix': case 'matrix_selection': return (q.correctCells||[]).join(' | ');
      case 'multi_field': case 'graph_interaction': { const out=[]; (q.fields||[]).forEach(function(f){ const v=q.correctAnswers&&q.correctAnswers[f.id]; if(v!=null)out.push(f.label+': '+String(Array.isArray(v)?v.join(' / '):v)); }); return out.join(' | '); }
      case 'hotspot': { const c=((q.media&&q.media.hotspotAreas)||[]).filter(function(a){return a.correct}); return c.map(function(a){return a.label||a.id}).join(' | '); }
      case 'essay': case 'email': case 'letter': case 'long_answer': case 'read_aloud': case 'repeat_sentence': case 'speaking_response': case 'oral_interview': case 'role_play': case 'video_reflection': return q.modelAnswer||q.sampleAnswer||'Sample Model Answer / Task Rubric';
      default: return q.correctAnswer!=null?String(q.correctAnswer):(q.modelAnswer||q.sampleAnswer||'');
    }
  }catch(e){ return ''; }
}
function formatChosenAnswer(q,answer){
  if(answer==null||answer===''||(Array.isArray(answer)&&answer.length===0))return '[UNANSWERED]';
  try{
    switch(q.type){
      case 'single_choice': case 'image_choice': case 'true_false_not_given': case 'yes_no_not_given': { const o=(q.options||[]).find(function(x){return String(x.id)===String(answer)}); return o?(o.label||o.id):String(answer); }
      case 'multiple_select': { const ids=Array.isArray(answer)?answer:[]; return ids.map(function(id){ const o=(q.options||[]).find(function(x){return String(x.id)===String(id)}); return o?(o.label||o.id):String(id); }).join(' | '); }
      case 'matching': case 'matching_headings': case 'matching_information': case 'matching_features': case 'matching_sentence_endings': case 'categorization': { const out=[]; (q.leftItems||[]).forEach(function(l){ const rid=(answer&&answer[l.id])||''; const r=(q.rightItems||[]).find(function(x){return x.id===rid}); out.push(l.label+' -> '+(r?r.label:(rid||'—'))); }); return out.join(' | '); }
      case 'gap_fill': case 'complete_words': case 'drag_and_drop_cloze': case 'dropdown_cloze': case 'interactive_reading': { const out=[]; (q.blanks||[]).forEach(function(b){ out.push((b.id||'blank')+': '+(String((answer||{})[b.id]!=null?(answer||{})[b.id]:'—'))); }); return out.join(' | '); }
      case 'multi_field': case 'graph_interaction': { const out=[]; const flds=(answer&&answer.fields)||{}; (q.fields||[]).forEach(function(f){ out.push(f.label+': '+(String(flds[f.id]!=null?flds[f.id]:'—'))); }); return out.join(' | '); }
      case 'matrix': case 'matrix_selection': return (Array.isArray(answer)?answer:[]).join(' | ');
      case 'reorder_paragraphs': case 'sequence': { const ids=Array.isArray(answer)?answer:[]; return ids.map(function(id){ const it=(q.items||[]).find(function(x){return x.id===id}); return it?it.label:id; }).join(' -> '); }
      case 'essay': case 'email': case 'letter': case 'long_answer': case 'read_aloud': case 'repeat_sentence': case 'speaking_response': case 'oral_interview': case 'role_play': case 'video_reflection': return (answer&&answer.text)||String(answer||'');
      default: return Array.isArray(answer)?answer.join(' | '):(typeof answer==='object'?JSON.stringify(answer):String(answer));
    }
  }catch(e){ return Array.isArray(answer)?answer.join(' | '):String(answer||''); }
}
function gradeStatusOf(item){
  if(!item.answered)return 'UNANSWERED';
  if(item.result.correct)return 'CORRECT';
  if(item.result.earned>0)return 'PARTIAL';
  const t=String(item.q&&item.q.type||'');
  if(/write|essay|speak|interview|record/i.test(t))return 'NEEDS_MANUAL_GRADING';
  return 'INCORRECT';
}
function render(){ root.innerHTML=appHtml(); wire(); updateBars(); }
function appHtml(){ const sec=currentSection(); const q=currentQuestion(); const answer=q?state.answers[qKey(state.currentSectionIndex,q.id)]:null; const results=buildResults(); const active=state.started||state.testEnded; document.body.style.fontSize=(16*state.fontScale)+'px'; document.body.style.fontFamily=state.dyslexiaFont?'Verdana, Arial, sans-serif':EXAM_SIM.ui.fontFamily; document.body.dataset.theme=state.theme; return '<div class="app'+(active?'':' app-wiz')+'">'+(active?railHtml(sec):'')+'<main class="main">'+(active?headerHtml(sec,results)+contentHtml(sec,q,answer):wizardHtml())+'</main>'+(active?sideHtml(sec,q,results):'')+'</div>'; }
function railHtml(sec){ return \`<aside class="rail"><div class="examTitle"><b>\${esc(EXAM_SIM.blueprint.examName)}</b><span class="tiny">\${esc(EXAM_SIM.blueprint.provider||'Mock Test')} · \${esc(state.mode)} mode</span></div><div class="panel" style="padding:16px;display:grid;gap:12px"><div class="tiny">Sections</div>\${EXAM_SIM.blueprint.sections.map((s,i)=>\`<button class="pbtn \${i===state.currentSectionIndex?'current':''}" data-section="\${i}" style="justify-content:flex-start;padding:0 12px;width:100%">\${i+1}. \${esc(s.title)}</button>\`).join('')}</div>\${sec?\`<div class="panel" style="padding:16px;display:grid;gap:16px"><div><div class="tiny">Question palette</div><div class="palette">\${sec.questions.map((q,i)=>{const k=qKey(state.currentSectionIndex,q.id);const answered=state.answers[k]!=null&&state.answers[k]!==''&&!(Array.isArray(state.answers[k])&&state.answers[k].length===0);const flagged=!!state.flags[k];return \`<button class="pbtn \${i===state.currentQuestionIndex?'current':''} \${answered?'answered':''} \${flagged?'flagged':''}" data-q="\${i}">\${i+1}</button>\`}).join('')}</div></div></div>\`:''}<div class="panel" style="padding:16px;display:grid;gap:12px"><div class="tiny">Display</div><label class="ghost"><input type="checkbox" data-font \${state.dyslexiaFont?'checked':''}/> dyslexia font</label><label class="ghost"><input type="checkbox" data-contrast \${state.contrast==='high'?'checked':''}/> high contrast</label><label class="ghost"><input type="checkbox" data-theme \${state.theme==='dark'?'checked':''}/> dark mode</label><div class="toolbar"><button class="btn" data-fontscale="down">A-</button><button class="btn" data-fontscale="reset">A</button><button class="btn" data-fontscale="up">A+</button></div></div><div class="statusBar"><span class="tiny">autosave</span><span class="saveDot" data-save-dot></span><span class="tiny" style="margin-left:auto">\${state.savedAt?'saved ✓':'not started'}</span></div></aside>\` }
function overviewStepHtml(totalQ){
  var secs=EXAM_SIM.blueprint.sections.map(function(s,i){ return '<div class="wizSec"><span class="wizSecNum">'+(i+1)+'</span><div style="flex:1"><div style="font-weight:700">'+esc(s.title)+'</div><div class="tiny">'+s.questions.length+' questions'+(s.durationMinutes?(' · '+s.durationMinutes+' min'):'')+'</div></div></div>'; }).join('');
  return '<div class="wizBody">'
    +'<h2 class="wizHeroTitle">Ready for your <span style="color:var(--accent2)">'+esc(EXAM_SIM.blueprint.examName)+'</span>?</h2>'
    +'<p class="muted" style="font-size:1.02rem;margin:8px 0 0">A realistic, timed practice exam. Everything you see here mirrors a real test session.</p>'
    +'<div class="wizStatGrid">'
    +'<div class="wizStat"><b>'+EXAM_SIM.blueprint.sections.length+'</b><span class="tiny">sections</span></div>'
    +'<div class="wizStat"><b>'+totalQ+'</b><span class="tiny">questions</span></div>'
    +'<div class="wizStat"><b>'+EXAM_SIM.blueprint.totalDurationMinutes+' min</b><span class="tiny">duration</span></div>'
    +'<div class="wizStat"><b>'+EXAM_SIM.blueprint.passPercent+'%</b><span class="tiny">pass mark</span></div>'
    +'</div>'
    +'<div class="eyebrow" style="margin:0 0 2px">Sections in this exam</div>'
    +'<div class="wizSecList">'+secs+'</div>'
    +'<div class="wizNav"><span></span><button class="wizBigBtn" data-wiznext style="width:auto;padding:0 46px">Continue</button></div>'
    +'</div>';
}
function envStepHtml(){
  var micOk=state.micPermission==='granted';
  return '<div class="wizBody">'
    +'<h2 class="wizHeroTitle">Quick environment check</h2>'
    +'<p class="muted" style="font-size:1.02rem;margin:8px 0 0">A few seconds per check — then you are ready to begin.</p>'
    +'<div class="wizCheckRow'+(state.calibrationPassed?' wizOk':'')+'"><span class="wizCheckIcon">🔊</span><div style="flex:1"><div style="font-weight:700">Audio check</div><div class="tiny">Play a short tone and confirm you can hear it.</div></div><button class="btn" data-cal>play</button><button class="btn'+(state.calibrationPassed?'':' btnP')+'" data-cal-ok'+(state.calibrationPassed?' disabled':'')+'>'+(state.calibrationPassed?'✓ heard':'I heard it')+'</button></div>'
    +'<div class="wizCheckRow'+(micOk?' wizOk':'')+'"><span class="wizCheckIcon">🎙️</span><div style="flex:1"><div style="font-weight:700">Microphone &amp; camera</div><div class="tiny">Access is needed for speaking tasks and the photo ID.</div></div><button class="btn" data-perms>'+(micOk?'✓ granted':'allow access')+'</button></div>'
    +(EXAM_SIM.proctoring.photoIdCheck?'<div class="wizCheckRow'+(state.photoId?' wizOk':'')+'"><span class="wizCheckIcon">🪪</span><div style="flex:1"><div style="font-weight:700">Photo ID</div><div class="tiny">A quick camera capture attached privately to your results.</div></div><button class="btn" data-photoid>'+(state.photoId?'✓ captured':'capture')+'</button></div>':'')
    +'<div class="wizCheckRow'+(state.fullscreenAccepted?' wizOk':'')+'"><span class="wizCheckIcon">🖥️</span><div style="flex:1"><div style="font-weight:700">Fullscreen</div><div class="tiny">'+(EXAM_SIM.proctoring.fullscreenRequired?'Required to start the exam.':'Focused experience; recommended before starting.')+'</div></div><button class="btn" data-full>'+(state.fullscreenAccepted?'✓ on':'enter fullscreen')+'</button></div>'
    +'<div class="meter" data-mic-meter style="margin-top:18px"><span></span></div>'
    +(state.photoId?('<div class="tiny" style="margin-top:10px">Photo ID captured — it travels with your results for identity verification.</div><img class="stimulus" src="'+state.photoId.url+'" alt="Photo ID capture" style="margin-top:8px;max-width:180px;border-radius:14px"/>'):'')
    +'<div class="wizNav"><button class="wizGhostBtn" data-wizback>← Back</button><button class="wizBigBtn" data-wiznext style="width:auto;padding:0 46px">Continue</button></div>'
    +'</div>';
}
function readyStepHtml(){
  var ready=!EXAM_SIM.proctoring.fullscreenRequired||state.fullscreenAccepted;
  return '<div class="wizBody">'
    +'<h2 class="wizHeroTitle">You are all set</h2>'
    +'<p class="muted" style="font-size:1.02rem;margin:8px 0 0">Choose your mode and begin when you are ready.</p>'
    +'<div class="wizModeGrid">'
    +'<div class="wizMode'+(state.mode==='practice'?' sel':'')+'" data-mode="practice"><h4>🌱 Practice</h4><div class="tiny">Instant feedback, mini-lessons and explanations after every question.</div></div>'
    +'<div class="wizMode'+(state.mode==='test'?' sel':'')+'" data-mode="test"><h4>🎯 Test</h4><div class="tiny">Timed, scored and reviewed at the end — just like the real exam.</div></div>'
    +'</div>'
    +'<div class="wizRules"><div class="eyebrow" style="margin-bottom:6px">Exam rules</div><ul><li>Answer every question — there is no penalty for guessing.</li><li>You can flag questions and return to them later.</li><li>Keep the window focused; switching tabs is recorded.</li><li>Your work auto-saves — you can close and resume later.</li></ul></div>'
    +(!state.calibrationPassed?'<div class="banner warn" style="margin-top:18px">Tip: run the audio check on the previous step if your exam has listening questions.</div>':'')
    +'<div class="wizNav"><button class="wizGhostBtn" data-wizback>← Back</button><button class="wizBigBtn" data-start'+(ready?'':' disabled')+'>Begin exam →</button></div>'
    +'</div>';
}
function wizardHtml(){
  var step=state.wizard||1;
  var labels=['Overview','Environment check','Ready'];
  var dots='';
  for(var k=1;k<=3;k++){ dots+='<div class="wizStep'+(k===step?' active':'')+(k<step?' done':'')+'"><span class="wizDot">'+(k<step?'✓':k)+'</span>'+(k===step?'<span class="wizStepLabel">'+labels[k-1]+'</span>':'')+'</div>'; }
  return '<div class="wiz"><div class="wizCard">'
    +'<div class="wizTop">'
    +'<div class="wizBrand"><div class="wizLogo">'+esc(String(EXAM_SIM.blueprint.examName||'E').trim().charAt(0).toUpperCase())+'</div><div style="min-width:0"><div class="wizExam">'+esc(EXAM_SIM.blueprint.examName)+'</div></div></div>'
    +'<div class="wizStepper">'+dots+'</div>'
    +'</div>'
    +(step===1?overviewStepHtml(countAll()):(step===2?envStepHtml():readyStepHtml()))
    +'</div></div>';
}
function headerHtml(sec,results){ return \`<section class="header"><div class="headerTop"><div style="display:grid;gap:12px;min-width:0"><div class="chips"><span class="ghost">\${state.mode} mode</span></div><div><h2>\${esc(sec.title)}</h2><p class="muted">\${esc(sec.instructions)}</p></div></div><div class="toolbar"><button class="btn" data-stopaudio \${state.audioPlaying?'':'disabled'}>stop audio</button><button class="btn" data-save>manual save</button><button class="btn" data-export>export zip</button><button class="btnD" data-finish>finish</button></div></div><div class="grid4" style="grid-template-columns:repeat(2,minmax(170px,1fr))"><div class="metric"><div class="label">section time</div><div class="value" data-section-remaining>\${formatDuration(state.sectionRemaining)}</div><div class="timer" data-section-timer><span></span></div></div><div class="metric"><div class="label">total time</div><div class="value" data-total-remaining>\${formatDuration(state.totalRemaining)}</div><div class="timer" data-total-timer><span></span></div></div></div></section>\` }
function sectionRulesCard(sec,q){ const audioOn=audioSegments(q).length>0; const minNote=sec.minimumPassPercent?'<div class="tiny" style="margin-top:4px">You need at least '+sec.minimumPassPercent+'% in this section to pass.</div>':''; const intro=sec.audio&&sec.audio.globalIntroText?'<p class="muted">'+esc(sec.audio.globalIntroText)+'</p>':''; const audio=audioOn?'<div class="audioControls"><button class="btn" data-playaudio>play prompt audio</button></div>'+(sec.audio&&sec.audio.playOnce?'<div class="tiny" style="margin-top:8px">Audio can only be played once in this section.</div>':''):''; if(!minNote&&!intro&&!audio)return ''; return '<div class="card">'+minNote+intro+audio+'</div>'; }
function contentHtml(sec,q,answer){ const split=EXAM_SIM.ui.enableSplitPaneReading&&((q.media&&q.media.passageHtml)||q.passageHtml||q.type==='interactive_reading'||q.type.indexOf('matching')===0||q.type.indexOf('highlight')===0||q.type==='categorization'); return \`<section class="content" style="grid-template-columns:minmax(0,\${state.splitRatio}%) minmax(320px,\${100-state.splitRatio}%);"><div class="reader">\${sectionRulesCard(sec,q)}\${transcriptHtml(q)}\${split?passageHtml(q):''}\${state.mode==='practice'&&q.strategyTips&&q.strategyTips.length?'<div class="card"><div class="eyebrow">Strategy</div><p>'+esc(q.strategyTips.join(' '))+'</p></div>':''}\${sec.allowNotepad?'<div><div class="eyebrow">Scratchpad</div><textarea data-note>'+esc(state.notes[qKey(state.currentSectionIndex,q.id)]||'')+'</textarea></div>':''}</div><div class="composer">\${questionHtml(sec,q,answer)}\${state.reviewVisible?inlineReview(q):''}<div class="nav"><button class="btn" data-prev \${(state.currentQuestionIndex===0||sec.lockAfterAdvance)?'disabled':''}>previous</button><button class="btn" data-flag>\${state.flags[qKey(state.currentSectionIndex,q.id)]?'unflag':'flag'}</button><button class="btnP" data-next>\${state.currentQuestionIndex===sec.questions.length-1?'next section':'next'}</button></div></div></section>\` }
function passageHtml(q){ const body=parseMarkdownToHtml((q.type==='highlight_text'||q.type==='highlight_sentence')?q.passageHtml:(q.media&&q.media.passageHtml)||q.passageHtml||'<p>No passage.</p>'); return \`<div class="passageWrap"><div class="splitGrip" data-grip></div><div class="card"><div class="eyebrow">Passage / stimulus</div><div class="annotToolbar"><button class="btn annotToggle \${state.annotationMode==='highlight'?'active':''}" data-annot="highlight">highlight</button><button class="btn annotToggle \${state.annotationMode==='strike'?'active':''}" data-annot="strike">strike</button><button class="btn" data-applyannot>apply selection</button><button class="btn" data-clearannot>clear marks</button></div><article class="passage" data-passage>\${body}</article></div></div>\` }
function questionHtml(sec,q,answer){ return \`<section class="question"><div><div class="eyebrow">Question \${state.currentQuestionIndex+1} of \${sec.questions.length}</div><h3 class="qtitle">\${esc(q.prompt)}</h3>\${q.instructions?'<p class="muted" style="font-size:.92rem;margin-top:4px">'+esc(q.instructions)+'</p>':''}</div>\${renderQuestion(q,answer)}\${practiceFeedback(q,answer)}</section>\` }
function parseMarkdownToHtml(html){
  if (!html) return '';
  if (html.includes('|')) {
    const lines = html.split('\\n');
    let insideTable = false;
    let tableRows = [];
    let convertedHtml = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        insideTable = true;
        const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        tableRows.push(cells);
      } else {
        if (insideTable && tableRows.length > 0) {
          convertedHtml += buildHtmlTableStr(tableRows);
          tableRows = [];
          insideTable = false;
        }
        convertedHtml += lines[i] + '\\n';
      }
    }
    if (insideTable && tableRows.length > 0) {
      convertedHtml += buildHtmlTableStr(tableRows);
    }
    html = convertedHtml;
  }
  return html;
}

function buildHtmlTableStr(rows){
  let hasHeader = false;
  if (rows.length > 1) {
    const isSeparator = rows[1].every(cell => cell.replace(/[-:]/g, '').length === 0);
    if (isSeparator) {
      hasHeader = true;
    }
  }
  
  let out = '<table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.95rem;background:var(--surface);border-radius:8px;overflow:hidden;border:1px solid var(--line)">';
  
  if (hasHeader) {
    out += '<thead style="border-bottom:2px solid var(--line);background:var(--surface-soft)"><tr>';
    rows[0].forEach(cell => {
      out += '<th style="padding:10px 14px;text-align:left;font-weight:600;color:var(--text)">' + esc(cell) + '</th>';
    });
    out += '</tr></thead>';
  }
  
  out += '<tbody>';
  const startIdx = hasHeader ? 2 : 0;
  for (let i = startIdx; i < rows.length; i++) {
    out += '<tr style="border-bottom:1px solid var(--line)">';
    rows[i].forEach(cell => {
      out += '<td style="padding:10px 14px;color:var(--text)">' + cell + '</td>';
    });
    out += '</tr>';
  }
  out += '</tbody></table>';
  return out;
}

function renderTextCloze(q,a){ 
  let html = parseMarkdownToHtml(q.templateHtml || ''); 
  const ans = a || {}; 
  if (q.blanks) { 
    q.blanks.forEach(b => { 
      const val = ans[b.id] || ''; 
      const maxlen = b.maxLength ? ' maxlength="' + Number(b.maxLength) + '"' : '';
      const ph = q.type === 'complete_words' ? 'Missing letters only' : 'Type...';
      const inputStr = '<input ' + access() + ' type="text" data-cloze-text="' + esc(b.id) + '" value="' + esc(val) + '"' + maxlen + ' style="border:none;border-bottom:2px solid var(--accent);background:var(--surface-soft);padding:4px 8px;margin:0 4px;font-family:inherit;font-size:inherit;width:140px;border-radius:4px;color:var(--text)" placeholder="' + ph + '" />';
      html = html.replace(new RegExp('{{' + b.id + '}}', 'g'), inputStr);
    }); 
  } 
  return '<div class="builder"><div class="card">' + html + '</div></div>'; 
}

function renderQuestion(q,a){ switch(q.type){ case 'single_choice': case 'image_choice': case 'true_false_not_given': case 'yes_no_not_given': case 'multiple_select': return renderChoice(q,a); case 'matching': case 'matching_headings': case 'matching_information': case 'matching_features': case 'matching_sentence_endings': case 'categorization': return renderMatching(q,a); case 'sentence_completion': case 'summary_completion': case 'note_completion': case 'table_completion': case 'flow_chart_completion': case 'diagram_label_completion': if (q.blanks && q.templateHtml) return renderTextCloze(q,a); return renderText(q,a); case 'short_answer': case 'long_answer': case 'essay': case 'email': case 'letter': case 'listen_and_type': case 'dictation': return renderText(q,a); case 'build_sentence': return renderBuild(q,a); case 'reorder_paragraphs': case 'sequence': return renderReorder(q,a); case 'drag_and_drop_cloze': return renderDragCloze(q,a); case 'dropdown_cloze': case 'interactive_reading': return renderDropCloze(q,a); case 'numeric_entry': case 'fraction_entry': case 'equation_entry': return renderNumeric(q,a); case 'highlight_text': case 'highlight_sentence': return renderHighlight(q,a); case 'read_aloud': case 'repeat_sentence': case 'speaking_response': case 'oral_interview': case 'role_play': return renderSpeaking(q,a,false); case 'video_reflection': return renderSpeaking(q,a,true); case 'matrix': case 'matrix_selection': return renderMatrix(q,a); case 'hotspot': return renderHotspot(q,a); case 'gap_fill': case 'complete_words': if (q.blanks && q.templateHtml) return renderTextCloze(q,a); return renderText(q,a); case 'multi_field': case 'graph_interaction': return renderMultiField(q,a); default:return '<div class="banner danger">Unsupported question type</div>' } }
function renderChoice(q,a){ const multi=q.type==='multiple_select'; return \`<div class="optList">\${q.options.map(o=>{const sel=multi?(a||[]).includes(o.id):a===o.id; const graded=state.mode==='practice'&&a!=null; return \`<label class="opt \${sel?'selected':''} \${graded&&o.correct?'correct':''} \${graded&&sel&&!o.correct?'incorrect':''}"><input \${access()} type="\${multi?'checkbox':'radio'}" name="q-\${q.id}" value="\${esc(o.id)}" \${sel?'checked':''} data-choice="\${esc(o.id)}" /> <div>\${o.imageUrl?'<img class="stimulus" src="'+esc(o.imageUrl)+'" alt="" style="margin-bottom:8px"/>':''}\${o.richLabelHtml||esc(o.label)}</div></label>\`}).join('')}</div>\` }
function renderMatching(q,a){ return \`<div class="reviewList">\${q.leftItems.map(it=>\`<div style="display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:12px;align-items:center"><div class="opt">\${esc(it.label)}</div><select \${access()} data-match="\${esc(it.id)}"><option value="">Select</option>\${q.rightItems.map(o=>\`<option value="\${esc(o.id)}" \${((a&&a[it.id])||'')===o.id?'selected':''}>\${esc(o.label)}</option>\`).join('')}</select></div>\`).join('')}</div>\` }
function renderText(q,a){ const words=String(a||'').trim()?String(a||'').trim().split(/\\s+/).length:0; return \`<div class="builder">\${q.templateHtml?'<div class="card">'+parseMarkdownToHtml(q.templateHtml)+'</div>':''}\${audioSegments(q).length?'<div class="audioControls"><button class="btn" data-playaudio>play audio</button></div>':''}<textarea \${access()} data-text>\${esc(a||'')}</textarea><div class="chips">\${q.minWords?'<span class="ghost">min '+q.minWords+' words</span>':''}\${q.maxWords?'<span class="ghost">max '+q.maxWords+' words</span>':''}<span class="ghost">\${words} words</span></div></div>\` }
function renderBuild(q,a){ const placed=Array.isArray(a)?a:[]; const words=(q.instructions&&q.instructions.replace(/^Words:\\s*/i,'').split('/').map(w=>w.trim()).filter(Boolean))||[]; const remain=words.slice(); placed.forEach(w=>{const i=remain.indexOf(w); if(i>-1)remain.splice(i,1)}); return \`<div class="builder"><div class="buildLine">\${placed.map((w,i)=>\`<button class="word placed" data-build-remove="\${i}">\${esc(w)}</button>\`).join('')}</div><div class="tokenBank">\${remain.map(w=>\`<button class="word" data-build-add="\${esc(w)}">\${esc(w)}</button>\`).join('')}</div><div class="tiny">Tap words to build the sentence. Tap placed words to remove.</div></div>\` }
function renderReorder(q,a){ const order=a&&a.length?a:q.items.map(i=>i.id); const items=order.map(id=>q.items.find(x=>x.id===id)).filter(Boolean); return \`<div class="reviewList">\${items.map((it,i)=>\`<div class="opt" style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><strong>\${i+1}.</strong> \${esc(it.label)}</div><div class="toolbar"><button class="btn" data-move="\${it.id}:up">↑</button><button class="btn" data-move="\${it.id}:down">↓</button></div></div>\`).join('')}</div>\` }
function renderDragCloze(q,a){ let html=q.templateHtml; const ans=a||{}; q.blanks.forEach(b=>{ const val=ans[b.id]||''; html=html.replace(new RegExp('{{'+b.id+'}}','g'),\`<span class="slot \${val?'filled':''}" data-slot="\${esc(b.id)}">\${val?esc(val):'&nbsp;'}</span>\`)}); const pool=[]; q.blanks.forEach(b=>b.options.forEach(o=>{if(!pool.includes(o))pool.push(o)})); const used=Object.values(ans); return \`<div class="builder"><div class="banner warn">Drag a token into each slot. Click a slot to clear it.</div><div class="card">\${html}</div><div class="tokenBank">\${pool.map(o=>\`<div class="token \${used.includes(o)?'used':''}" draggable="true" data-token="\${esc(o)}">\${esc(o)}</div>\`).join('')}</div></div>\` }
function renderDropCloze(q,a){ let html=q.templateHtml; const ans=a||{}; q.blanks.forEach(b=>{ html=html.replace(new RegExp('{{'+b.id+'}}','g'), \`<select \${access()} data-cloze="\${esc(b.id)}"><option value="">Select</option>\${b.options.map(o=>\`<option value="\${esc(o)}" \${(ans[b.id]||'')===o?'selected':''}>\${esc(o)}</option>\`).join('')}</select>\`) }); return \`<div class="card">\${html}</div>\` }
function renderNumeric(q,a){ return \`<div class="builder"><input \${access()} type="text" inputmode="decimal" data-num value="\${esc(a==null?'':a)}" placeholder="Enter answer" />\${q.mathKeyboard?'<div class="chips"><span class="ghost">math keyboard ready</span></div>':''}</div>\` }
function renderHighlight(q,a){ const sel=Array.isArray(a)?a:[]; return \`<div class="builder"><div class="banner warn">Select text in the passage, then save it.</div><div class="toolbar"><button class="btn" data-savehl>save selection</button><button class="btn" data-clearhl>clear saved</button></div><div class="tiny">Saved selections: \${sel.length}</div></div>\` }
function renderSpeaking(q,a,video){ const key=qKey(state.currentSectionIndex,q.id); const audio=state.speakingRecordings[key]; const vid=state.videoRecordings[key]; const img=q.media&&q.media.imageUrl?\`<img class="stimulus" src="\${esc(q.media.imageUrl)}" alt="\${esc(q.media.imageAlt||'Stimulus')}"/>\`:''; const promptAudio=audioSegments(q).length?'<div class="audioControls"><button class="btn" data-playaudio>play prompt audio</button></div>':''; if(video){ return \`<div class="builder">\${img}<div class="card">\${q.prepSeconds?'<p><strong>Prep:</strong> '+q.prepSeconds+'s</p>':''}\${q.responseSeconds?'<p><strong>Response:</strong> '+q.responseSeconds+'s</p>':''}\${promptAudio}</div><video class="video" data-video-preview playsinline></video><div class="toolbar"><button class="btnP" data-recvideo>record video</button><button class="btn" data-stopvideo \${state.pendingVideoRecorder?'':'disabled'}>stop</button></div>\${vid?\`<video class="video" controls src="\${vid.url}"></video>\`:''}<textarea \${access()} data-speaktext placeholder="Optional transcript or notes">\${esc(a&&a.text||'')}</textarea>\${(state.mode==='practice'||state.reviewVisible)?'<div class="card"><div class="eyebrow">Model answer</div><p>'+esc(q.modelAnswer)+'</p></div>':''}\${(state.mode==='practice'||state.reviewVisible)?rubricSlidersHtml('speaking'):''}</div>\` }
  return \`<div class="builder">\${img}<div class="card">\${q.prepSeconds?'<p><strong>Prep:</strong> '+q.prepSeconds+'s</p>':''}\${q.responseSeconds?'<p><strong>Response:</strong> '+q.responseSeconds+'s</p>':''}\${promptAudio}</div><div class="toolbar"><button class="btnP" data-recaudio>record response</button><button class="btn" data-stopaudiorec \${state.pendingSpeakingRecorder?'':'disabled'}>stop</button></div><div class="meter" data-mic-meter><span></span></div>\${audio?\`<audio controls src="\${audio.url}" style="width:100%"></audio>\`:''}<textarea \${access()} data-speaktext placeholder="Optional transcript or notes">\${esc(a&&a.text||'')}</textarea>\${(state.mode==='practice'||state.reviewVisible)?'<div class="card"><div class="eyebrow">Model answer</div><p>'+esc(q.modelAnswer)+'</p></div>':''}\${(state.mode==='practice'||state.reviewVisible)?rubricSlidersHtml('speaking'):''}</div>\` }
function rubricSlidersHtml(kind){ const rubrics=(kind==='speaking'?EXAM_SIM.blueprint.scoring.speakingRubrics:EXAM_SIM.blueprint.scoring.writingRubrics)||[]; if(!rubrics.length)return ''; return \`<div class="card"><div class="eyebrow">Self-score rubric</div>\${rubrics.map(r=>\`<label style="display:grid;gap:6px;margin-bottom:12px"><span>\${esc(r.label)} (\${r.max})</span><input type="range" min="0" max="\${r.max}" step="1" value="0" /></label>\`).join('')}</div>\` }
function renderMatrix(q,a){ const selected=new Set(a||[]); return \`<div class="reviewList"><div style="display:grid;grid-template-columns:1.2fr repeat(\${q.columns.length},minmax(70px,1fr));gap:8px;align-items:center"><div></div>\${q.columns.map(c=>\`<div class="tiny" style="text-align:center">\${esc(c)}</div>\`).join('')}\${q.rows.map(row=>\`<div class="opt">\${esc(row)}</div>\${q.columns.map(col=>{const id=row+'::'+col; return \`<label class="opt" style="padding:8px;justify-items:center"><input \${access()} type="checkbox" data-matrix="\${esc(id)}" \${selected.has(id)?'checked':''}/></label>\`}).join('')}\`).join('')}</div></div>\` }
function renderHotspot(q,a){ const active=new Set(a||[]); const areas=q.media&&q.media.hotspotAreas||[]; return \`<div class="builder"><div class="hotWrap"><img src="\${esc(q.media&&q.media.imageUrl||'')}" alt="\${esc(q.media&&q.media.imageAlt||'Hotspot prompt')}"/>\${areas.map(ar=>{const st=ar.shape==='circle'?\`left:\${ar.x}%;top:\${ar.y}%;width:\${(ar.radius||4)*2}%;height:\${(ar.radius||4)*2}%;border-radius:999px;transform:translate(-50%,-50%);\`:\`left:\${ar.x}%;top:\${ar.y}%;width:\${ar.width||10}%;height:\${ar.height||10}%;\`; return \`<button class="hot \${active.has(ar.id)?'active':''}" style="\${st}" data-hot="\${esc(ar.id)}" title="\${esc(ar.label||ar.id)}"></button>\`}).join('')}</div></div>\` }
function practiceFeedback(q,a){ if(state.mode!=='practice'||a==null||a==='')return ''; const res=gradeQuestion(q,a); return \`<div class="banner \${res.correct?'success':'warn'}">\${res.correct?'Correct.':'Not quite.'} \${q.explanation?esc(q.explanation):''}</div>\` }
function inlineReview(q){ const k=qKey(state.currentSectionIndex,q.id); const r=gradeQuestion(q,state.answers[k]); return \`<div class="review"><div class="eyebrow">Quick review</div><div class="reviewItem \${r.correct?'correct':'incorrect'}"><strong>\${r.earned}/\${r.max} pts</strong>\${q.explanation?'<div>'+esc(q.explanation)+'</div>':''}\${q.miniLesson?'<div><strong>Mini lesson:</strong> '+esc(q.miniLesson)+'</div>':''}\${q.taskKeys&&q.taskKeys.keyRationale?'<div><strong>Key rationale:</strong> '+esc(q.taskKeys.keyRationale)+'</div>':''}\${q.taskKeys&&q.taskKeys.workedSolution?'<div><strong>Worked solution:</strong> '+esc(q.taskKeys.workedSolution)+'</div>':''}\${transcriptHtml(q)}</div></div>\` }
function sideHtml(sec,q,results){ const answered=countAnswered(); const total=countAll(); return \`<aside class="side">\${state.testEnded?resultsPanel(results):\`<div class="card"><div class="eyebrow">Your session</div><div style="font-size:1.05rem;font-weight:800;letter-spacing:-.02em;margin-top:4px">\${q?esc(q.type.replace(/_/g,' ')):'Ready to begin'}</div><div class="grid4" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:16px"><div class="metric"><div class="label">answered</div><div class="value">\${answered}/\${total}</div></div><div class="metric"><div class="label">flagged</div><div class="value">\${Object.values(state.flags).filter(Boolean).length}</div></div><div class="metric"><div class="label">time left</div><div class="value">\${formatDuration(state.totalRemaining)}</div></div><div class="metric"><div class="label">progress</div><div class="value">\${total?Math.round(answered/total*100):0}%</div></div></div>\${state.warnings?\`<div class="banner warn" style="margin-top:14px"><strong>\${state.warnings} warning(s)</strong> — avoid switching tabs or leaving the window during the exam.</div>\`:''}</div>\`}\${sec?\`<div class="card" style="margin-top:14px"><div class="eyebrow">Section \${state.currentSectionIndex+1} of \${EXAM_SIM.blueprint.sections.length}</div><div style="font-weight:700;margin-top:4px">\${esc(sec.title)}</div><div class="tiny" style="margin-top:6px">\${esc(sec.instructions||'')}</div>\${sec.audio&&sec.audio.playOnce?'<div class="tiny" style="margin-top:8px">Audio can only be played once in this section.</div>':''}\${sec.lockAfterAdvance?'<div class="tiny" style="margin-top:8px">This section locks once you move on.</div>':''}</div>\`:''}<div class="card" style="margin-top:14px"><div class="eyebrow">Rules</div><div class="tiny" style="margin-top:6px">• Answer every question — there is no penalty for guessing.</div><div class="tiny" style="margin-top:4px">• You can flag questions and return to them later.</div><div class="tiny" style="margin-top:4px">• Keep the window focused; switching tabs is recorded.</div></div></aside>\` }
function livePanel(sec,q,results){ const k=q?qKey(state.currentSectionIndex,q.id):''; return \`<div class="card"><div class="tiny">Current item</div><div style="font-size:1.1rem;font-weight:800;letter-spacing:-.03em">\${q?esc(q.type.replace(/_/g,' ')):'Not started'}</div><div class="grid4" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:16px"><div class="metric"><div class="label">answered</div><div class="value">\${countAnswered()}/\${countAll()}</div></div><div class="metric"><div class="label">flagged</div><div class="value">\${Object.values(state.flags).filter(Boolean).length}</div></div><div class="metric"><div class="label">score</div><div class="value">\${state.mode==='practice'?results.weightedPercent+'%':'hidden'}</div></div><div class="metric"><div class="label">status</div><div class="value">\${state.flags[k]?'flagged':'active'}</div></div></div></div>\` }
function resultsPanel(results){ return \`<div class="dashGrid">\${summaryCard(results)}\${chartsCard(results)}\${reviewCard(results)}</div>\` }
function summaryCard(results){ return \`<div class="card"><div class="eyebrow">Final result</div><h3 class="qtitle">\${results.weightedPercent}% , \${results.passed?'passed':'not passed'}</h3><p>Raw: \${results.rawPercent}% , weighted: \${results.weightedPercent}% , band: <strong>\${esc(String(results.band))}</strong></p><div class="chips"><span class="ghost">warnings \${state.warnings}</span><span class="ghost">incidents \${state.incidents.length}</span><span class="ghost">flagged-right \${results.confidence.flaggedRight}</span><span class="ghost">flagged-wrong \${results.confidence.flaggedWrong}</span></div><div class="toolbar" style="margin-top:12px"><button class="btnP" data-export>download zip</button><button class="btn" data-export-report>download report</button><button class="btn" data-review-all>full review</button><button class="btn" data-retry>retry incorrect</button></div></div>\` }
function chartsCard(results){ return \`<div class="chart">\${sectionChart(results)}\${skillRadar(results)}\${pacingChart(results)}\${difficultyChart(results)}\${heatmapChart()}</div>\` }
function sectionChart(results){ const w=320,h=170,p=24; const bars=results.bySection.map((s,i)=>{ const bw=(w-p*2)/Math.max(1,results.bySection.length)-8; const x=p+i*((w-p*2)/Math.max(1,results.bySection.length)); const bh=(h-50)*(s.percent/100); const y=h-30-bh; return \`<g><rect x="\${x}" y="\${y}" width="\${bw}" height="\${bh}" rx="8" fill="var(--accent)"></rect><text x="\${x+bw/2}" y="\${h-10}" text-anchor="middle" font-size="10" fill="var(--soft)">\${esc(s.section.title.slice(0,8))}</text><text x="\${x+bw/2}" y="\${y-6}" text-anchor="middle" font-size="10" fill="var(--text)">\${s.percent}%</text></g>\` }).join(''); return \`<div class="card"><div class="eyebrow">Per-section performance</div><svg viewBox="0 0 \${w} \${h}"><line x1="20" y1="140" x2="300" y2="140" stroke="var(--line2)"/>\${bars}</svg></div>\` }
function skillRadar(results){ const data=results.skillBreakdown.slice(0,6); if(!data.length)return ''; const cx=160,cy=160,r=90; const axes=data.map((d,i)=>{const a=(Math.PI*2/data.length)*i-Math.PI/2; const x=cx+Math.cos(a)*r; const y=cy+Math.sin(a)*r; return \`<g><line x1="\${cx}" y1="\${cy}" x2="\${x}" y2="\${y}" stroke="var(--line2)"/><text x="\${cx+Math.cos(a)*(r+18)}" y="\${cy+Math.sin(a)*(r+18)}" font-size="10" text-anchor="middle" fill="var(--soft)">\${esc(d.tag.slice(0,10))}</text></g>\`}).join(''); const poly=data.map((d,i)=>{const a=(Math.PI*2/data.length)*i-Math.PI/2; const rr=r*(d.percent/100); return \`\${cx+Math.cos(a)*rr},\${cy+Math.sin(a)*rr}\`}).join(' '); return \`<div class="card"><div class="eyebrow">Skill radar</div><svg viewBox="0 0 320 320"><circle cx="160" cy="160" r="90" fill="none" stroke="var(--line2)"/><circle cx="160" cy="160" r="60" fill="none" stroke="var(--line)"/><circle cx="160" cy="160" r="30" fill="none" stroke="var(--line)"/>\${axes}<polygon points="\${poly}" fill="color-mix(in oklab,var(--accent) 30%, transparent)" stroke="var(--accent)" stroke-width="2"/></svg></div>\` }
function pacingChart(results){ const rows=results.pacing.slice(0,10).reverse(); const w=320,h=220,barH=14,gap=6,max=Math.max(1,...rows.map(r=>r.ms)); return \`<div class="card"><div class="eyebrow">Time per question</div><svg viewBox="0 0 \${w} \${h}">\${rows.map((r,i)=>{const y=20+i*(barH+gap); const bw=(w-120)*(r.ms/max); return \`<g><text x="4" y="\${y+11}" font-size="10" fill="var(--soft)">\${esc(r.label.slice(0,14))}</text><rect x="110" y="\${y}" width="\${bw}" height="\${barH}" rx="7" fill="\${r.correct?'var(--accent)':'var(--danger)'}"></rect><text x="\${115+bw}" y="\${y+11}" font-size="10" fill="var(--text)">\${Math.round(r.ms/1000)}s</text></g>\`}).join('')}</svg></div>\` }
function difficultyChart(results){ const data=['easy','medium','hard','adaptive'].map(k=>({k, ...results.difficultyMap[k]})).filter(x=>x.total); const w=320,h=150; const bars=data.map((d,i)=>{const pct=d.total?Math.round(d.right/d.total*100):0; const x=30+i*65; const bh=(h-40)*(pct/100); return \`<g><rect x="\${x}" y="\${h-20-bh}" width="36" height="\${bh}" rx="8" fill="var(--accent2)"></rect><text x="\${x+18}" y="\${h-4}" text-anchor="middle" font-size="10" fill="var(--soft)">\${d.k}</text><text x="\${x+18}" y="\${h-24-bh}" text-anchor="middle" font-size="10" fill="var(--text)">\${pct}%</text></g>\` }).join(''); return \`<div class="card"><div class="eyebrow">Difficulty vs accuracy</div><svg viewBox="0 0 \${w} \${h}">\${bars}</svg></div>\` }
function heatmapChart(){ const blurEvents=state.telemetry.filter(x=>x.type==='window_blur'||x.type==='visibility_change'); const hours=Array.from({length:12},(_,i)=>i); return \`<div class="card"><div class="eyebrow">Focus / tab-switch heatmap</div><svg viewBox="0 0 320 80">\${hours.map((_,i)=>{const count=blurEvents.filter((_,idx)=>idx%12===i).length; const alpha=Math.min(.9,.15+count*.15); return \`<rect x="\${10+i*24}" y="20" width="18" height="28" rx="4" fill="rgba(220,38,38,\${alpha})"></rect>\`}).join('')}</svg><div class="tiny">Darker blocks mean more blur/tab-switch events.</div></div>\` }
function reviewCard(results){ const items=results.bySection.flatMap(sec=>sec.items.map(it=>({ section:sec.section.title, ...it }))); const filtered=filterReviewItems(items); return \`<div class="review"><div class="eyebrow">Review</div><div class="toolbar"><button class="btn" data-filter="all">all</button><button class="btn" data-filter="wrong">wrong only</button><button class="btn" data-filter="flagged">flagged</button><select data-skillfilter><option value="">all skills</option>\${Array.from(new Set(items.flatMap(i=>i.q.skillTags||[]))).map(t=>\`<option value="\${esc(t)}">\${esc(t)}</option>\`).join('')}</select></div><div class="reviewList">\${filtered.map(it=>\`<div class="reviewItem \${it.result.correct?'correct':'incorrect'}"><div class="tiny">\${esc(it.section)} · \${esc(it.q.type)}</div><strong>\${esc(it.q.prompt)}</strong><div><strong>Your answer:</strong> \${esc(formatAnswer(it.answer))}</div><div><strong>Answer key:</strong> \${esc(buildCorrectAnswer(it.q))}</div><div><strong>Score:</strong> \${it.result.earned}/\${it.result.max}</div>\${it.q.explanation?'<div><strong>Feedback:</strong> '+esc(it.q.explanation)+'</div>':''}\${it.q.miniLesson?'<div><strong>Mini lesson:</strong> '+esc(it.q.miniLesson)+'</div>':''}\${it.q.modelAnswer?'<div><strong>Model answer:</strong> '+esc(it.q.modelAnswer)+'</div>':''}\${transcriptHtml(it.q)}\${recordingFor(it.key)}<div class="chips">\${(it.q.skillTags||[]).map(t=>\`<span class="ghost">\${esc(t)}</span>\`).join('')}</div></div>\`).join('')}</div></div>\` }
function recordingFor(key){ const a=state.speakingRecordings[key]; const v=state.videoRecordings[key]; return \`\${a?\`<audio controls src="\${a.url}" style="width:100%"></audio>\`:''}\${v?\`<video class="video" controls src="\${v.url}"></video>\`:''}\` }
function formatAnswer(a){ if(a==null)return 'No answer'; if(Array.isArray(a))return a.join(' | '); if(typeof a==='object')return JSON.stringify(a); return String(a) }
function filterReviewItems(items){ const filter=state.reviewFilter||'all'; const skill=state.reviewSkill||''; return items.filter(it=>{ if(filter==='wrong'&&it.result.correct)return false; if(filter==='flagged'&&!state.flags[it.key])return false; if(skill && !(it.q.skillTags||[]).includes(skill))return false; return true; }) }
function calculatorHtml(){ return \`<div class="card"><div class="eyebrow">Calculator</div><div class="calcScreen" data-cscreen>\${esc(state.calculatorInput||'0')}</div><div class="calcGrid" style="margin-top:12px">\${['7','8','9','/','4','5','6','*','1','2','3','-','0','.','(',')','C','=','+','←'].map(k=>\`<button class="btn" data-ckey="\${esc(k)}">\${esc(k)}</button>\`).join('')}</div></div>\` }
function countAnswered(){ return Object.values(state.answers).filter(v=>v!=null&&v!==''&&!(Array.isArray(v)&&v.length===0)).length }
function countAll(){ return EXAM_SIM.blueprint.sections.reduce((s,x)=>s+x.questions.length,0) }
function access(){ return EXAM_SIM.accessibility.screenReaderLabels ? 'aria-label="Answer input"' : '' }

function wire(){
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.getAttribute('data-mode'); EXAM_SIM.options.mode=state.mode; render()});
  document.querySelectorAll('[data-wiznext]').forEach(b=>b.onclick=()=>{state.wizard=Math.min(3,(state.wizard||1)+1); render()});
  document.querySelectorAll('[data-wizback]').forEach(b=>b.onclick=()=>{state.wizard=Math.max(1,(state.wizard||1)-1); render()});
  const s=document.querySelector('[data-start]'); if(s)s.onclick=startExam;
  const c=document.querySelector('[data-cal]'); if(c)c.onclick=runCalibration;
  const co=document.querySelector('[data-cal-ok]'); if(co)co.onclick=()=>{state.calibrationPassed=true; logTelemetry('audio_calibration_confirmed'); render()};
  const p=document.querySelector('[data-perms]'); if(p)p.onclick=requestMediaPermissions;
  const f=document.querySelector('[data-full]'); if(f)f.onclick=enterFullscreenIfNeeded;
  const pid=document.querySelector('[data-photoid]'); if(pid)pid.onclick=promptPhotoId;
  document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{state.currentSectionIndex=Number(b.getAttribute('data-section')); state.currentQuestionIndex=0; state.sectionRemaining=currentSection().durationMinutes*60; render()});
  document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>jumpToQuestion(Number(b.getAttribute('data-q'))));
  const next=document.querySelector('[data-next]'); if(next)next.onclick=nextQuestion;
  const prev=document.querySelector('[data-prev]'); if(prev)prev.onclick=prevQuestion;
  const flag=document.querySelector('[data-flag]'); if(flag)flag.onclick=toggleFlag;
  const stopa=document.querySelector('[data-stopaudio]'); if(stopa)stopa.onclick=stopSpeech;
  const save=document.querySelector('[data-save]'); if(save)save.onclick=()=>saveProgress(false);
  const exp=document.querySelectorAll('[data-export]'); exp.forEach(b=>b.onclick=()=>exportZip(false));
  const exr=document.querySelector('[data-export-report]'); if(exr)exr.onclick=exportPdfReport;
  const fin=document.querySelector('[data-finish]'); if(fin)fin.onclick=finishExam;
  const play=document.querySelectorAll('[data-playaudio]'); play.forEach(b=>b.onclick=()=>{const q=currentQuestion(); const segs=audioSegments(q); speakSegments(segs, !!((currentSection().audio&&currentSection().audio.playOnce)||(q.media&&q.media.audio&&q.media.audio.playOnce)))});
  document.querySelectorAll('[data-choice]').forEach(inp=>inp.onchange=()=>{const q=currentQuestion(); if(q.type==='multiple_select'){setAnswer(Array.from(document.querySelectorAll('[data-choice]:checked')).map(el=>el.value))} else setAnswer(inp.value)});
  document.querySelectorAll('[data-match]').forEach(sel=>sel.onchange=()=>{const ans={}; document.querySelectorAll('[data-match]').forEach(el=>ans[el.getAttribute('data-match')]=el.value); setAnswer(ans)});
  const text=document.querySelector('[data-text]'); if(text)text.oninput=()=>setAnswer(text.value);
  const num=document.querySelector('[data-num]'); if(num)num.oninput=()=>setAnswer(num.value);
  document.querySelectorAll('[data-cloze]').forEach(sel=>sel.onchange=()=>{const ans={}; document.querySelectorAll('[data-cloze]').forEach(el=>ans[el.getAttribute('data-cloze')]=el.value); setAnswer(ans)});
  document.querySelectorAll('[data-cloze-text]').forEach(inp=>inp.oninput=()=>{const ans={}; document.querySelectorAll('[data-cloze-text]').forEach(el=>ans[el.getAttribute('data-cloze-text')]=el.value); setAnswer(ans)});
  document.querySelectorAll('[data-mf]').forEach(inp=>inp.oninput=()=>{const q=currentQuestion(); const k=qKey(state.currentSectionIndex,q.id); const prev=Object.assign({},state.answers[k]||{}); const fields=Object.assign({},prev.fields||{}); fields[inp.getAttribute('data-mf')]=inp.value; setAnswer(Object.assign({},prev,{fields}))});
  const mfw=document.querySelector('[data-mfwork]'); if(mfw)mfw.oninput=()=>{const q=currentQuestion(); const k=qKey(state.currentSectionIndex,q.id); const prev=Object.assign({},state.answers[k]||{}); setAnswer(Object.assign({},prev,{working:mfw.value}))};
  document.querySelectorAll('[data-build-add]').forEach(b=>b.onclick=()=>{const w=b.getAttribute('data-build-add'); const q=currentQuestion(); const cur=(state.answers[qKey(state.currentSectionIndex,q.id)]||[]).slice(); cur.push(w); setAnswer(cur)});
  document.querySelectorAll('[data-build-remove]').forEach(b=>b.onclick=()=>{const i=Number(b.getAttribute('data-build-remove')); const q=currentQuestion(); const cur=(state.answers[qKey(state.currentSectionIndex,q.id)]||[]).slice(); cur.splice(i,1); setAnswer(cur)});
  document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const [id,dir]=b.getAttribute('data-move').split(':'); const q=currentQuestion(); const cur=(state.answers[qKey(state.currentSectionIndex,q.id)]||q.items.map(i=>i.id)).slice(); const idx=cur.indexOf(id); if(idx<0)return; const nx=dir==='up'?idx-1:idx+1; if(nx<0||nx>=cur.length)return; [cur[idx],cur[nx]]=[cur[nx],cur[idx]]; setAnswer(cur)});
  document.querySelectorAll('[data-hot]').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-hot'); const q=currentQuestion(); const set=new Set(state.answers[qKey(state.currentSectionIndex,q.id)]||[]); if(set.has(id))set.delete(id); else { if(!q.allowMultiple)set.clear(); set.add(id); } setAnswer(Array.from(set))});
  document.querySelectorAll('[data-matrix]').forEach(cb=>cb.onchange=()=>setAnswer(Array.from(document.querySelectorAll('[data-matrix]:checked')).map(el=>el.getAttribute('data-matrix'))));
  const ra=document.querySelector('[data-recaudio]'); if(ra)ra.onclick=()=>startSpeakingRecording(currentQuestion());
  const sar=document.querySelector('[data-stopaudiorec]'); if(sar)sar.onclick=stopSpeakingRecording;
  const rv=document.querySelector('[data-recvideo]'); if(rv)rv.onclick=()=>startVideoRecording(currentQuestion());
  const sv=document.querySelector('[data-stopvideo]'); if(sv)sv.onclick=stopVideoRecording;
  const sp=document.querySelector('[data-speaktext]'); if(sp)sp.oninput=()=>{const q=currentQuestion(); const k=qKey(state.currentSectionIndex,q.id); const prev=state.answers[k]||{}; setAnswer(Object.assign({},prev,{text:sp.value}))};
  const note=document.querySelector('[data-note]'); if(note)note.oninput=()=>{const q=currentQuestion(); state.notes[qKey(state.currentSectionIndex,q.id)]=note.value};
  const sh=document.querySelector('[data-savehl]'); if(sh)sh.onclick=saveHighlight;
  const ch=document.querySelector('[data-clearhl]'); if(ch)ch.onclick=()=>setAnswer([]);
  document.querySelectorAll('[data-token]').forEach(t=>{t.ondragstart=e=>{state.dragToken=t.getAttribute('data-token'); e.dataTransfer.setData('text/plain',state.dragToken)}});
  document.querySelectorAll('[data-slot]').forEach(slot=>{slot.ondragover=e=>{e.preventDefault(); slot.classList.add('drag')}; slot.ondragleave=()=>slot.classList.remove('drag'); slot.ondrop=e=>{e.preventDefault(); slot.classList.remove('drag'); const id=slot.getAttribute('data-slot'); const tok=state.dragToken||e.dataTransfer.getData('text/plain'); const q=currentQuestion(); const prev=Object.assign({},state.answers[qKey(state.currentSectionIndex,q.id)]||{}); prev[id]=tok; setAnswer(prev)}; slot.onclick=()=>{const id=slot.getAttribute('data-slot'); const q=currentQuestion(); const prev=Object.assign({},state.answers[qKey(state.currentSectionIndex,q.id)]||{}); delete prev[id]; setAnswer(prev)} });
  document.querySelectorAll('[data-font]').forEach(cb=>cb.onchange=()=>{state.dyslexiaFont=cb.checked; render()});
  document.querySelectorAll('[data-contrast]').forEach(cb=>cb.onchange=()=>{state.contrast=cb.checked?'high':'default'; applyContrast(); render()});
  document.querySelectorAll('[data-theme]').forEach(cb=>cb.onchange=()=>{state.theme=cb.checked?'dark':'light'; render()});
  document.querySelectorAll('[data-fontscale]').forEach(b=>b.onclick=()=>{const d=b.getAttribute('data-fontscale'); if(d==='up')state.fontScale=Math.min(1.35,state.fontScale+.05); if(d==='down')state.fontScale=Math.max(.9,state.fontScale-.05); if(d==='reset')state.fontScale=1; render()});
  document.querySelectorAll('[data-ckey]').forEach(b=>b.onclick=()=>calc(b.getAttribute('data-ckey')));
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.reviewFilter=b.getAttribute('data-filter'); render()});
  const sf=document.querySelector('[data-skillfilter]'); if(sf)sf.onchange=()=>{state.reviewSkill=sf.value; render()};
  const rr=document.querySelector('[data-review-all]'); if(rr)rr.onclick=()=>{state.reviewFilter='all'; render()};
  const retry=document.querySelector('[data-retry]'); if(retry)retry.onclick=retryIncorrect;
  document.querySelectorAll('[data-annot]').forEach(b=>b.onclick=()=>{state.annotationMode=b.getAttribute('data-annot'); render()});
  const apply=document.querySelector('[data-applyannot]'); if(apply)apply.onclick=applyAnnotation;
  const clear=document.querySelector('[data-clearannot]'); if(clear)clear.onclick=clearAnnotations;
  const grip=document.querySelector('[data-grip]'); if(grip){ grip.onmousedown=e=>{e.preventDefault(); const move=ev=>{const total=root.querySelector('.content').getBoundingClientRect().width; const left=ev.clientX-root.querySelector('.content').getBoundingClientRect().left; state.splitRatio=Math.max(35,Math.min(70,(left/total)*100)); render()}; const up=()=>{window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up)}; window.addEventListener('mousemove',move); window.addEventListener('mouseup',up); }}
}
function retryIncorrect(){ const results=buildResults(); const wrong=results.bySection.flatMap((sec,si)=>sec.items.filter(i=>!i.result.correct).map(i=>({si, qid:i.q.id}))); if(!wrong.length)return; const bucket={}; wrong.forEach(x=>{bucket[qKey(x.si,x.qid)]=state.answers[qKey(x.si,x.qid)]}); state.retrySource=bucket; state.currentSectionIndex=wrong[0].si; state.currentQuestionIndex=EXAM_SIM.blueprint.sections[wrong[0].si].questions.findIndex(q=>q.id===wrong[0].qid); state.reviewVisible=false; state.testEnded=false; state.started=true; render(); }
function saveHighlight(){ const sel=window.getSelection(); const txt=sel?sel.toString().trim():''; if(!txt)return; const q=currentQuestion(); const k=qKey(state.currentSectionIndex,q.id); const prev=state.answers[k]||[]; if(!prev.includes(txt))setAnswer([...prev,txt]) }
function applyAnnotation(){ const sel=window.getSelection(); if(!sel||!sel.rangeCount)return; const range=sel.getRangeAt(0); if(range.collapsed)return; const span=document.createElement('span'); span.className=state.annotationMode==='strike'?'strike':'mark'; try{ range.surroundContents(span); logTelemetry('annotation_apply',{mode:state.annotationMode}); }catch(e){} }
function clearAnnotations(){ const passage=document.querySelector('[data-passage]'); if(!passage)return; passage.querySelectorAll('.mark,.strike').forEach(node=>{const parent=node.parentNode; while(node.firstChild)parent.insertBefore(node.firstChild,node); parent.removeChild(node)}); logTelemetry('annotation_clear'); }
function calc(k){ if(k==='C')state.calculatorInput=''; else if(k==='←')state.calculatorInput=state.calculatorInput.slice(0,-1); else if(k==='='){ try{ state.calculatorInput=String(Function('"use strict";return ('+(state.calculatorInput||0)+')')()) }catch(e){ state.calculatorInput='error' } } else state.calculatorInput += k; const sc=document.querySelector('[data-cscreen]'); if(sc)sc.textContent=state.calculatorInput||'0'; }
function applyContrast(){ const d=document.documentElement; if(state.contrast==='high'){ d.style.setProperty('--line','oklch(60% 0.02 250)'); d.style.setProperty('--text','oklch(10% 0.01 250)'); } else { d.style.removeProperty('--line'); d.style.removeProperty('--text'); } }

window.addEventListener('beforeunload',()=>{ flushTelemetry(); saveProgress(true) });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&EXAM_SIM.proctoring.detectTabSwitches)registerWarning('Tab switched or hidden'); if(EXAM_SIM.telemetry.captureVisibility)logTelemetry('visibility_change',{hidden:document.hidden}) });
window.addEventListener('blur',()=>{ if(EXAM_SIM.proctoring.detectWindowBlur)registerWarning('Window lost focus'); if(EXAM_SIM.telemetry.captureFocus)logTelemetry('window_blur') });
window.addEventListener('focus',()=>{ state.idleSeconds=0; if(EXAM_SIM.telemetry.captureFocus)logTelemetry('window_focus') });
document.addEventListener('copy',()=>{ if(EXAM_SIM.proctoring.detectCopyPaste)registerWarning('Copy detected'); if(EXAM_SIM.telemetry.captureClipboard)logTelemetry('copy') });
document.addEventListener('paste',()=>{ if(EXAM_SIM.proctoring.detectCopyPaste)registerWarning('Paste detected'); if(EXAM_SIM.telemetry.captureClipboard)logTelemetry('paste') });
document.addEventListener('contextmenu',e=>{ if(EXAM_SIM.proctoring.detectContextMenu){ e.preventDefault(); registerWarning('Context menu blocked') } });
document.addEventListener('keydown',e=>{ state.idleSeconds=0; if(!EXAM_SIM.ui.enableKeyboardShortcuts)return; const tag=(e.target&&e.target.tagName||'').toLowerCase(); if(tag==='textarea'||tag==='input'||tag==='select')return; if(e.key==='ArrowRight')nextQuestion(); if(e.key==='ArrowLeft')prevQuestion(); if(e.key.toLowerCase()==='f')toggleFlag(); });
document.addEventListener('mousemove',()=>{ state.idleSeconds=0 },{passive:true});
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement&&state.started){ state.fullscreenExits+=1; logTelemetry('fullscreen_exit',{count:state.fullscreenExits}); } });
if(speechSynthesis&&speechSynthesis.onvoiceschanged!==undefined)speechSynthesis.onvoiceschanged=()=>render();
restoreProgress().then(()=>{ if(state.resumedSession){ state.started=true; startTimers(); trackVisit(); } render(); });
</script>
</body>
</html>`;
}

function escapeJsonForHtml(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
function escapeHtml(value: string): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export const EXTERNAL_AI_JSON_PROMPT = String.raw`You are a senior assessment designer and structured-data author.
Always begin with this exact message and wait:
"Please send me the lesson text or the PDF you want the exam built from. Also tell me: (1) the exact exam name from the supported list, (2) the learner level, (3) how many items you want, and (4) practice or test mode. If you only send the lesson, I will assume practice mode with full feedback."

After the user sends content, output one valid JSON object only.
Hard rules:
- Raw JSON only
- No placeholders
- Include explanations, strategyTips, miniLesson, timing, skillTags on every question
- Include modelAnswer for writing and speaking where useful
- Include taskKeys { correctResponse, keyRationale, distractorRationales, workedSolution } on every question
- Include examFamily, candidate, qualityAssurance, sourceRegistry on the blueprint
- Spoken text must remove these symbols: * _ ~ # | \\ and backticks { }
- Listening tasks: use media.audio.segments with speakerTag (male1-4/female1-4), speakerLabel, text, startMs, endMs, transcriptPolicy, taggedScript
- Supported renderers include single_choice, multiple_select, matching family, sentence/note/table/flow_chart/diagram_label_completion, short/long answer, essay/email/letter, read_aloud, repeat_sentence, listen_and_type, dictation, speaking_response, oral_interview, role_play, reorder_paragraphs, drag_and_drop_cloze, dropdown_cloze, highlight_text/sentence, numeric/fraction/equation_entry, hotspot, image_choice, matrix, sequence, build_sentence, interactive_reading, video_reflection, gap_fill, complete_words (C-Test), multi_field, graph_interaction (data-table only), categorization, matrix_selection
- Use accurate timings and section structure for the exam family
- Include metadata assumptions explicitly
- JSON must compile in ExamSimulatorHtmlGenerator.v3.ts
`;

export interface GeneratorWorkbenchProps { initialBlueprint: ExamBlueprint; }
export const GeneratorWorkbench: React.FC<GeneratorWorkbenchProps> = ({ initialBlueprint }) => {
  const [mode, setMode] = useState<ExamMode>('practice');
  const [htmlTitle, setHtmlTitle] = useState(`${initialBlueprint.examName} Simulator`);
  const generated = useMemo(() => generateExamHtml(initialBlueprint, { mode, includeAnswerKey: true, includePracticeCoaching: true, includeTelemetryDashboard: true, htmlTitle }), [initialBlueprint, mode, htmlTitle]);
  const download = () => { const blob = new Blob([generated], { type: 'text/html;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${initialBlueprint.examId}.html`; a.click(); URL.revokeObjectURL(url); };
  const copyPrompt = async () => { await navigator.clipboard.writeText(EXTERNAL_AI_JSON_PROMPT); };
  return (
    <div style={{ display: 'grid', gap: 16, padding: 24 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setMode('practice')}>Practice mode</button>
        <button onClick={() => setMode('test')}>Test mode</button>
        <input value={htmlTitle} onChange={(e) => setHtmlTitle(e.target.value)} aria-label="HTML title" />
        <button onClick={download}>Download HTML</button>
        <button onClick={copyPrompt}>Copy external AI JSON prompt</button>
      </div>
      <textarea value={generated} readOnly style={{ width: '100%', minHeight: 540, fontFamily: 'ui-monospace, monospace' }} />
    </div>
  );
};
