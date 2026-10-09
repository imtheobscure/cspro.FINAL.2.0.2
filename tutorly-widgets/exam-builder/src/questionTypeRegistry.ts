/**
 * Question-type registry.
 *
 * The validator used to accept ANY `type` string as long as the JSON parsed, and the
 * runtime renders only the ten types in `NATIVE_TYPES`. Everything else produced a
 * question card with no input at all - a candidate could see a 10-mark
 * `note_completion` item, have no way to answer it, and silently score zero. The
 * same hole meant an AI following the 2026 task vocabulary produced unanswerable
 * papers that the builder called "SCHEMA APPROVED".
 *
 * Three buckets:
 *
 *   NATIVE_TYPES    the runtime has a dedicated renderer.
 *   TYPE_ALIASES    a real 2026 task type with a faithful reduction onto a native
 *                   renderer. Applied automatically on import, reported as a
 *                   warning so the lossiness is never silent.
 *   UNSUPPORTED     a real 2026 task type with NO faithful reduction (it needs a
 *                   stimulus the runtime cannot draw - an image, a hotspot, a
 *                   draggable cloze, inline highlighting). Import is blocked.
 *
 * Adding a renderer means moving its names out of UNSUPPORTED and into
 * NATIVE_TYPES or TYPE_ALIASES - never just deleting the check.
 */

export const NATIVE_TYPES = [
  'multipleChoice',
  'multipleSelect',
  'fillInBlank',
  'matching',
  'ordering',
  'essay',
  'writing',
  'listening',
  'speaking',
  'likert',
  // Completion family - these render a real stimulus (q.templateHtml) with one input per
  // gap and mark each gap separately, so they are first-class, not reductions.
  'noteCompletion',
  'tableCompletion',
  'summaryCompletion',
  'sentenceCompletion',
  'gapFill',
  // TOEFL 'Complete the Words'.
  'completeWords',
] as const;

export type NativeQuestionType = (typeof NATIVE_TYPES)[number];

export interface TypeAlias {
  to: NativeQuestionType;
  /** Human-readable statement of what is lost by the reduction. */
  note: string;
  /** Options injected when the source task carries the construct implicitly. */
  synthOptions?: { id: string; text: string }[];
}

/** Faithful, lossy-in-a-known-way reductions of the 2026 task vocabulary. */
export const TYPE_ALIASES: Record<string, TypeAlias> = {
  single_choice: { to: 'multipleChoice', note: 'same construct, name normalised' },
  multiple_select: { to: 'multipleSelect', note: 'same construct, name normalised' },
  true_false_not_given: {
    to: 'multipleChoice',
    note: 'rendered as a three-way choice; generated TRUE / FALSE / NOT GIVEN options when absent',
    synthOptions: [
      { id: 'true', text: 'TRUE' },
      { id: 'false', text: 'FALSE' },
      { id: 'not_given', text: 'NOT GIVEN' },
    ],
  },
  yes_no_not_given: {
    to: 'multipleChoice',
    note: 'rendered as a three-way choice; generated YES / NO / NOT GIVEN options when absent',
    synthOptions: [
      { id: 'yes', text: 'YES' },
      { id: 'no', text: 'NO' },
      { id: 'not_given', text: 'NOT GIVEN' },
    ],
  },
  // The completion family is native now: the note / table / summary layout is kept.
  sentence_completion: { to: 'sentenceCompletion', note: 'native - the gapped sentence is kept as authored' },
  note_completion: { to: 'noteCompletion', note: 'native - the note layout is kept' },
  summary_completion: { to: 'summaryCompletion', note: 'native - the summary is kept' },
  table_completion: { to: 'tableCompletion', note: 'native - the table is kept' },
  gap_fill: { to: 'gapFill', note: 'native - every gap keeps its own id and its own mark' },
  complete_words: { to: 'completeWords', note: 'native - the partial word and its visible letters are kept' },
  // These two still need a stimulus the runtime cannot draw.
  diagram_label_completion: { to: 'tableCompletion', note: 'the diagram is replaced by a labelled table the author must supply' },
  flow_chart_completion: { to: 'noteCompletion', note: 'the flow chart becomes a nested note list the author must supply' },
  short_answer: { to: 'fillInBlank', note: 'typed response, but no length guidance is enforced' },
  dictation: { to: 'fillInBlank', note: 'exact-key typing; the scoring is no longer case/typography aware' },
  listen_and_type: { to: 'fillInBlank', note: 'audio stem is kept, but replay limits are not enforced' },
  long_answer: { to: 'essay', note: 'extended typed response, no word target' },
  email: { to: 'essay', note: 'genre label is preserved in the prompt text only' },
  letter: { to: 'essay', note: 'genre label is preserved in the prompt text only' },
  read_aloud: { to: 'speaking', note: 'recorded response; no pronunciation scoring engine is bundled' },
  repeat_sentence: { to: 'speaking', note: 'recorded response; the model audio is not supplied automatically' },
  speaking_response: { to: 'speaking', note: 'recorded response; prep/response timers are author-set' },
  oral_interview: { to: 'speaking', note: 'sequential recorded prompts, not a live examiner' },
  role_play: { to: 'speaking', note: 'role instructions must be written into the prompt text' },
  video_reflection: { to: 'speaking', note: 'audio only; no video capture in this build' },
  matching_headings: { to: 'matching', note: 'heads match as pairs; heading reuse across paragraphs is not modelled' },
  matching_information: { to: 'matching', note: 'matched as pairs rather than many-to-one' },
  matching_features: { to: 'matching', note: 'matched as pairs rather than many-to-one' },
  matching_sentence_endings: { to: 'matching', note: 'same construction' },
  categorization: { to: 'matching', note: 'category assignment is reduced to pair matching' },
  reorder_paragraphs: { to: 'ordering', note: 'up/down reordering instead of drag' },
  sequence: { to: 'ordering', note: 'up/down reordering instead of drag' },
  build_sentence: { to: 'ordering', note: 'word chips reorder as a list rather than inline' },
  numeric_entry: { to: 'fillInBlank', note: 'typed entry; no numeric validation or math keyboard' },
  fraction_entry: { to: 'fillInBlank', note: 'typed entry; fraction equivalence is not checked' },
  equation_entry: { to: 'fillInBlank', note: 'typed entry; no equation editor or symbolic mark' },
  matrix: { to: 'likert', note: 'a single rating row survives; per-cell matrix selection does not' },
};

/**
 * Real 2026 task types with no faithful reduction. Each one needs a stimulus the
 * runtime cannot draw, so accepting it would ship an unanswerable paper.
 */
export const UNSUPPORTED_TYPES: Record<string, string> = {
  hotspot: 'needs a clickable image stimulus',
  image_choice: 'needs image options',
  diagram_label_completion: 'needs the diagram image the labels point at',
  flow_chart_completion: 'needs the flow-chart shell the boxes sit in',
  highlight_text: 'needs inline selectable text in the passage',
  highlight_sentence: 'needs inline selectable text in the passage',
  dropdown_cloze: 'needs an inline dropdown inside the passage template',
  drag_and_drop_cloze: 'needs an inline drag target inside the passage template',
  interactive_reading: 'needs a split-pane interactive passage shell',
  multi_field: 'needs several labelled answer fields per item',
  graph_interaction: 'needs a graph stimulus with plotted answers',
  gap_fill_html: 'needs an HTML template with several inline gaps',
  instructional_content: 'needs a teach-then-test lesson shell',
};

export interface NormalisedQuestion {
  question: Record<string, any>;
  originalType: string;
  newType: string;
  note?: string;
  synthesizedOptions?: boolean;
}

export interface TypeCheckResult {
  /** Types with no renderer and no alias. Non-empty means "do not compile". */
  blocking: { sectionTitle: string; questionId: string; type: string; reason: string }[];
  /**
   * Items whose type is renderable but whose STIMULUS is missing - a prompt that says
   * "complete the notes below" with no notes, a matching task with no pairs, a choice
   * task with no options. Also blocks compilation.
   */
  incomplete: { sectionTitle: string; questionId: string; type: string; reason: string }[];
  /** Types that were reduced onto a renderer, with what was lost. */
  warnings: { sectionTitle: string; questionId: string; from: string; to: string; note: string }[];
  /** Count of items per resulting renderer. */
  coverage: Record<string, number>;
}

const isNative = (type: string): type is NativeQuestionType =>
  (NATIVE_TYPES as readonly string[]).includes(type);

/**
 * Rewrites every question in `schema` onto a renderer the runtime actually has.
 * Never mutates the input; returns a new schema plus a full report.
 */
const GAP_TYPES = ['noteCompletion', 'tableCompletion', 'summaryCompletion', 'sentenceCompletion', 'gapFill', 'completeWords'];

/**
 * Content checks for one question, run AFTER its type is known to be renderable.
 *
 * This is the check that catches the failure mode "the prompt says complete the notes
 * below but there are no notes": a completion task with an empty template and no
 * blanks, a matching task with no pairs, a choice task with fewer than two options.
 * A renderable type with a missing stimulus is just as unanswerable as an unknown type.
 */
export const checkQuestionContent = (q: any): string | null => {
  const type = String(q?.type ?? '');
  const blanks = Array.isArray(q?.blanks) ? q.blanks : [];
  const options = Array.isArray(q?.options) ? q.options : [];
  const pairs = Array.isArray(q?.matchingPairs) ? q.matchingPairs : [];
  const key = Array.isArray(q?.correctAnswers) ? q.correctAnswers : [];
  const text = String(q?.text ?? '');

  if (GAP_TYPES.indexOf(type) !== -1) {
    if (!blanks.length) return 'no blanks: the task has no gaps for the candidate to fill';
    const malformed = blanks.filter((b: any) => !b || !b.id || b.correct === undefined || b.correct === null || (Array.isArray(b.correct) ? !b.correct.length : String(b.correct).trim() === ''));
    if (malformed.length) return malformed.length + ' blank(s) have no id or no accepted answer';
    const missingStimulus = !q?.templateHtml || String(q.templateHtml).trim() === '';
    if (missingStimulus) {
      return type + ' has no templateHtml, so the notes/table/summary the prompt refers to do not exist';
    }
    const placeholders = String(q.templateHtml).match(/\{\{([A-Za-z0-9_-]+)\}\}/g) || [];
    if (!placeholders.length) return 'templateHtml contains no {{blankId}} placeholder, so no gap is drawn';
    const declared = blanks.map((b: any) => String(b.id));
    const used = placeholders.map((p: string) => p.replace(/[{}]/g, ''));
    const orphan = used.filter((u: string) => declared.indexOf(u) === -1);
    if (orphan.length) return 'placeholder(s) with no matching blank: ' + orphan.join(', ');
    return null;
  }

  if (type === 'matching') {
    if (pairs.length < 2) return 'matching needs at least two pairs; this has ' + pairs.length;
    if (pairs.some((p: any) => !p || !String(p.left ?? '').trim() || !String(p.right ?? '').trim())) {
      return 'a matching pair has an empty left or right side';
    }
    return null;
  }

  if (type === 'ordering') {
    if (options.length < 2) return 'ordering needs at least two options; this has ' + options.length;
    if (key.length !== options.length) return 'ordering has ' + options.length + ' options but ' + key.length + ' keyed positions';
    const ids = options.map((o: any) => String(o.id));
    if (key.some((k: any) => ids.indexOf(String(k)) === -1)) return 'ordering keys a position that is not one of its options';
    return null;
  }

  if (type === 'multipleChoice' || type === 'listening') {
    if (options.length < 2) return 'needs at least two options; this has ' + options.length;
    if (!key.length) return 'no correctAnswers keyed';
    const ids = options.map((o: any) => String(o.id));
    if (key.some((k: any) => ids.indexOf(String(k)) === -1)) return 'correctAnswers refers to an option that does not exist';
    return null;
  }

  if (type === 'multipleSelect') {
    if (options.length < 3) return 'multiple choice with several answers needs at least three options; this has ' + options.length;
    if (key.length < 2) return 'multipleSelect needs two or more keyed answers; this has ' + key.length;
    const ids = options.map((o: any) => String(o.id));
    if (key.some((k: any) => ids.indexOf(String(k)) === -1)) return 'correctAnswers refers to an option that does not exist';
    return null;
  }

  if (type === 'likert') {
    if (options.length < 2) return 'a rating scale needs at least two points; this has ' + options.length;
    return null;
  }

  if (type === 'fillInBlank') {
    if (!key.length) return 'no correctAnswers keyed';
    return null;
  }

  if (type === 'essay' || type === 'writing') {
    if (text.trim().length < 15) return 'the writing prompt is too short to be a task';
    return null;
  }

  if (type === 'speaking') {
    if (text.trim().length < 10) return 'the speaking prompt is too short to be a task';
    return null;
  }

  return null;
};

/**
 * Wording that promises a stimulus. If the prompt says one of these and the item carries
 * nothing for the candidate to read, the item is broken even when its own type checks pass.
 */
const STIMULUS_PROMISES = [
  { pattern: /complete the (?:notes|table|summary|sentences?|spaces?|gaps?|words?)(?: below)?/i, needs: 'templateHtml' },
  { pattern: /according to the (?:passage|text|article|listening)/i, needs: 'stimulus' },
  { pattern: /match (?:the|each)/i, needs: 'matchingPairs' },
  { pattern: /put (?:the|these|the steps)/i, needs: 'options' },
];

export const checkStimulusPromise = (q: any): string | null => {
  const text = String(q?.text ?? '') + ' ' + String(q?.instructions ?? '');
  const type = String(q?.type ?? '');
  for (const rule of STIMULUS_PROMISES) {
    if (!rule.pattern.test(text)) continue;

    if (rule.needs === 'templateHtml') {
      // A completion-family item MUST ship its stimulus. A plain fillInBlank is exempt:
      // its gap is written inline in `text` ("I have been working here ____ 2022") and the
      // renderer draws one input for it, so there is nothing separate to supply.
      const isCompletionFamily = GAP_TYPES.indexOf(type) !== -1;
      if (isCompletionFamily && (!q?.templateHtml || !String(q.templateHtml).trim())) {
        return 'the prompt says to complete something, but the item has no templateHtml to complete';
      }
      continue;
    }
    if (rule.needs === 'matchingPairs' && (!Array.isArray(q?.matchingPairs) || q.matchingPairs.length < 2)) {
      return 'the prompt says to match, but the item has no matchingPairs';
    }
    if (rule.needs === 'options' && (!Array.isArray(q?.options) || q.options.length < 2)) {
      return 'the prompt asks for an order, but the item has no options';
    }
    if (rule.needs === 'stimulus') {
      const hasPassage = !!q?.readingPassage || !!q?.audioText || !!q?.templateHtml;
      if (!hasPassage) return 'the prompt refers to a passage or recording, but the item carries no passage, audio or template';
    }
  }
  return null;
};

export const normaliseQuestionTypes = <T extends { sections?: any[] }>(
  schema: T,
): { schema: T; report: TypeCheckResult } => {
  const report: TypeCheckResult = { blocking: [], incomplete: [], warnings: [], coverage: {} };
  const sections = Array.isArray(schema?.sections) ? schema.sections : [];

  const nextSections = sections.map((section: any) => {
    const questions = Array.isArray(section?.questions) ? section.questions : [];
    const nextQuestions = questions.map((q: any) => {
      const originalType = String(q?.type ?? '').trim();
      const sectionTitle = String(section?.title ?? 'Untitled section');
      const questionId = String(q?.id ?? '(no id)');

      if (isNative(originalType)) {
        report.coverage[originalType] = (report.coverage[originalType] ?? 0) + 1;
        const contentIssue = checkQuestionContent(q) ?? checkStimulusPromise({ ...q, readingPassage: q.readingPassage ?? section.readingPassages });
        if (contentIssue) {
          report.incomplete.push({ sectionTitle, questionId, type: originalType, reason: contentIssue });
        }
        return q;
      }

      const alias = TYPE_ALIASES[originalType];
      if (alias) {
        const normalised: Record<string, any> = { ...q, type: alias.to, originalType };
        let synthesized = false;
        if (alias.synthOptions && (!Array.isArray(q.options) || q.options.length === 0)) {
          normalised.options = alias.synthOptions.map((o) => ({ ...o }));
          synthesized = true;
        }
        report.warnings.push({
          sectionTitle,
          questionId,
          from: originalType,
          to: alias.to,
          note: alias.note + (synthesized ? ' (options generated)' : ''),
        });
        report.coverage[alias.to] = (report.coverage[alias.to] ?? 0) + 1;
        const contentIssue = checkQuestionContent(normalised)
          ?? checkStimulusPromise({ ...normalised, readingPassage: normalised.readingPassage ?? section.readingPassages });
        if (contentIssue) {
          report.incomplete.push({ sectionTitle, questionId, type: alias.to, reason: contentIssue });
        }
        return normalised;
      }

      report.blocking.push({
        sectionTitle,
        questionId,
        type: originalType || '(missing type)',
        reason:
          UNSUPPORTED_TYPES[originalType] ??
          'not a known question type - check the spelling against the documented task list',
      });
      return q;
    });
    return { ...section, questions: nextQuestions };
  });

  return { schema: { ...schema, sections: nextSections }, report };
};

/** True when every question in the schema can be rendered. */
export const isRenderable = (type: string): boolean => isNative(type) || type in TYPE_ALIASES;

/** Human-readable summary used by the validator UI and the AI prompt. */
export const describeNativeTypes = (): string[] => [...NATIVE_TYPES];
