import type { EditableQuestionFramework, ExamJSONSchema, ExamQuestionType, VoiceSettings, BrandingSettings } from './types';

export interface InternationalTestPreset {
  id: string;
  name: string;
  family: string;
  level: string;
  summary: string;
  totalMinutes: number;
  estimatedQuestions: number;
  sections: string[];
  taskTypes: ExamQuestionType[];
  passingScorePercent: number;
  adaptiveMode: boolean;
  timerMode: 'total' | 'section';
  environment: Record<string, string | number | boolean>;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  /**
   * ON by default. This used to be false, and `speakText` returns early when the
   * voice is disabled - so every listening section built from a preset shipped
   * with a Play button that did nothing and no audio at all.
   */
  enabled: true,
  voiceName: '',
  voiceLanguage: 'en-US',
  rate: 0.95,
  pitch: 1,
  volume: 1,
  readInstructions: true,
  readFeedbackInPractice: true,
  playbackSpeed: 1,
  accentFamiliarization: false,
};

export const DEFAULT_BRANDING: BrandingSettings = {
  institutionName: 'ExamCraft Academy',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  accentColor: '#f59e0b',
  logoUrl: '',
  customFont: 'Inter',
  dyslexicFriendly: false,
  defaultFontSize: '1rem',
};

export const DEFAULT_FRAMEWORKS: EditableQuestionFramework[] = [
  { id: 'fw-mc', label: 'Multiple Choice', description: 'Single best answer with keyed option IDs.', questionType: 'multipleChoice', enabled: true, estimatedQuestions: 20, timePerQuestionSeconds: 60 },
  { id: 'fw-ms', label: 'Multiple Select', description: 'Two or more correct answers with strict scoring.', questionType: 'multipleSelect', enabled: true, estimatedQuestions: 8, timePerQuestionSeconds: 90 },
  { id: 'fw-fill', label: 'Fill-in-the-Blank', description: 'Short typed answer, spelling-sensitive unless instructed otherwise.', questionType: 'fillInBlank', enabled: true, estimatedQuestions: 12, timePerQuestionSeconds: 45 },
  { id: 'fw-essay', label: 'Essay / Extended Writing', description: 'Long response area with rubric and detailed feedback.', questionType: 'essay', enabled: true, estimatedQuestions: 2, timePerQuestionSeconds: 1200 },
  { id: 'fw-listening', label: 'Listening With Read-Aloud Audio', description: 'Transcript-driven browser speech synthesis player for monologues and dialogues.', questionType: 'listening', enabled: true, estimatedQuestions: 10, timePerQuestionSeconds: 75 },
  { id: 'fw-speaking', label: 'Speaking Recording', description: 'Microphone response recorder with local audio download in the result page.', questionType: 'speaking', enabled: true, estimatedQuestions: 4, timePerQuestionSeconds: 90 },
  { id: 'fw-match', label: 'Matching Matrix', description: 'Left-to-right dropdown pairing tasks.', questionType: 'matching', enabled: true, estimatedQuestions: 6, timePerQuestionSeconds: 90 },
  { id: 'fw-order', label: 'Ordering / Sequencing', description: 'Move options up or down into the correct sequence.', questionType: 'ordering', enabled: true, estimatedQuestions: 5, timePerQuestionSeconds: 90 },
  { id: 'fw-likert', label: 'Likert / Survey Scale', description: 'Rating scale responses for confidence or personality style tests.', questionType: 'likert', enabled: false, estimatedQuestions: 5, timePerQuestionSeconds: 30 },
  /**
   * The completion family. These are the tasks whose prompt says "complete the notes /
   * table / summary below" - the stimulus is part of the item (templateHtml plus one
   * keyed blank per gap) instead of a single typed answer.
   */
  { id: 'fw-note', label: 'Note Completion', description: 'Bulleted lecture or conversation notes with one typed gap per line. The note layout travels with the item.', questionType: 'noteCompletion', enabled: true, estimatedQuestions: 6, timePerQuestionSeconds: 90 },
  { id: 'fw-table', label: 'Table Completion', description: 'A real table with gapped cells, marked per cell rather than per table.', questionType: 'tableCompletion', enabled: true, estimatedQuestions: 5, timePerQuestionSeconds: 90 },
  { id: 'fw-summary', label: 'Summary Completion', description: 'A paragraph with gaps drawn from the reading or listening source.', questionType: 'summaryCompletion', enabled: true, estimatedQuestions: 5, timePerQuestionSeconds: 90 },
  { id: 'fw-sentence', label: 'Sentence Completion', description: 'A gapped sentence with a strict word limit, marked per gap.', questionType: 'sentenceCompletion', enabled: true, estimatedQuestions: 6, timePerQuestionSeconds: 60 },
  { id: 'fw-gap', label: 'Gap Fill', description: 'General gapped text with a shared word bank or free entry.', questionType: 'gapFill', enabled: true, estimatedQuestions: 5, timePerQuestionSeconds: 60 },
  { id: 'fw-words', label: 'Complete the Words (TOEFL)', description: 'Partial words with the missing letters typed in, as used by TOEFL iBT since January 2026.', questionType: 'completeWords', enabled: true, estimatedQuestions: 5, timePerQuestionSeconds: 75 },
];

export const INTERNATIONAL_TEST_PRESETS: InternationalTestPreset[] = [
  { id: 'ielts', name: 'IELTS Academic / General', family: 'English proficiency', level: 'CEFR B1-C2', summary: 'Listening, Reading, Writing Task 1/2 and Speaking interview simulation. Form, note, table and sentence completion are the dominant listening and reading tasks.', totalMinutes: 165, estimatedQuestions: 44, sections: ['Listening', 'Reading', 'Writing', 'Speaking'], taskTypes: ['listening', 'noteCompletion', 'tableCompletion', 'sentenceCompletion', 'multipleChoice', 'matching', 'fillInBlank', 'essay', 'speaking'], passingScorePercent: 70, adaptiveMode: false, timerMode: 'section', environment: { bands: '0-9', writingTasks: 2, speakingParts: 3 } },
  { id: 'toefl', name: 'TOEFL iBT 2026', family: 'English proficiency', level: 'University entry', summary: 'Post-21 January 2026 format: Complete the Words, Read in Daily Life, Read an Academic Passage, Listen and Choose a Response, Listen and Repeat, Take an Interview, Write an Email and Academic Discussion.', totalMinutes: 116, estimatedQuestions: 54, sections: ['Reading', 'Listening', 'Speaking', 'Writing'], taskTypes: ['completeWords', 'noteCompletion', 'tableCompletion', 'multipleChoice', 'listening', 'speaking', 'essay'], passingScorePercent: 72, adaptiveMode: false, timerMode: 'section', environment: { scoreScale: '0-120', formatVersion: '2026-01-21', completeTheWords: true, noteTaking: true } },
  { id: 'pte', name: 'PTE Academic', family: 'English proficiency', level: 'University and visa', summary: 'Computer-scored speaking, writing, reading and listening items including Summarize Written Text, Fill in the Blanks and Reorder Paragraphs.', totalMinutes: 120, estimatedQuestions: 52, sections: ['Speaking and Writing', 'Reading', 'Listening'], taskTypes: ['speaking', 'essay', 'sentenceCompletion', 'gapFill', 'fillInBlank', 'ordering', 'listening', 'multipleChoice'], passingScorePercent: 65, adaptiveMode: false, timerMode: 'section', environment: { scoreScale: '10-90', integratedSkills: true, shortAnswerMode: true } },
  { id: 'duolingo', name: 'Duolingo English Test', family: 'English proficiency', level: 'Fast adaptive', summary: 'Adaptive short prompts: Complete the Words, Listen and Type, Read and Complete, speaking and writing sample.', totalMinutes: 60, estimatedQuestions: 45, sections: ['Adaptive Test', 'Video Interview', 'Writing Sample'], taskTypes: ['completeWords', 'gapFill', 'sentenceCompletion', 'fillInBlank', 'listening', 'speaking', 'essay', 'multipleChoice'], passingScorePercent: 68, adaptiveMode: true, timerMode: 'total', environment: { scoreScale: '10-160', adaptive: true, quickItemRotation: true } },
  { id: 'ket', name: 'Cambridge A2 Key (KET)', family: 'Cambridge English', level: 'A2', summary: 'Everyday English reading, writing, listening and paired speaking, with gapped-text and sentence-completion reading tasks.', totalMinutes: 110, estimatedQuestions: 40, sections: ['Reading and Writing', 'Listening', 'Speaking'], taskTypes: ['sentenceCompletion', 'tableCompletion', 'gapFill', 'multipleChoice', 'fillInBlank', 'listening', 'essay', 'speaking'], passingScorePercent: 60, adaptiveMode: false, timerMode: 'section', environment: { cambridgeScale: '100-150', level: 'A2' } },
  { id: 'pet', name: 'Cambridge B1 Preliminary (PET)', family: 'Cambridge English', level: 'B1', summary: 'Practical English test with gapped text, sentence completion, reading, writing, listening and speaking.', totalMinutes: 140, estimatedQuestions: 44, sections: ['Reading', 'Writing', 'Listening', 'Speaking'], taskTypes: ['sentenceCompletion', 'noteCompletion', 'gapFill', 'multipleChoice', 'matching', 'essay', 'listening', 'speaking'], passingScorePercent: 60, adaptiveMode: false, timerMode: 'section', environment: { cambridgeScale: '120-170', level: 'B1' } },
  { id: 'fce', name: 'Cambridge B2 First (FCE)', family: 'Cambridge English', level: 'B2', summary: 'Upper-intermediate reading, Use of English open cloze and word formation, writing, listening and speaking.', totalMinutes: 209, estimatedQuestions: 72, sections: ['Reading and Use of English', 'Writing', 'Listening', 'Speaking'], taskTypes: ['gapFill', 'sentenceCompletion', 'noteCompletion', 'tableCompletion', 'multipleChoice', 'fillInBlank', 'matching', 'essay', 'listening', 'speaking'], passingScorePercent: 62, adaptiveMode: false, timerMode: 'section', environment: { cambridgeScale: '140-190', level: 'B2' } },
  { id: 'cae', name: 'Cambridge C1 Advanced (CAE)', family: 'Cambridge English', level: 'C1', summary: 'Advanced academic and professional English, with open cloze, word formation and gapped text.', totalMinutes: 235, estimatedQuestions: 76, sections: ['Reading and Use of English', 'Writing', 'Listening', 'Speaking'], taskTypes: ['gapFill', 'sentenceCompletion', 'noteCompletion', 'tableCompletion', 'summaryCompletion', 'multipleChoice', 'fillInBlank', 'matching', 'essay', 'listening', 'speaking'], passingScorePercent: 65, adaptiveMode: false, timerMode: 'section', environment: { cambridgeScale: '160-210', level: 'C1' } },
  { id: 'cpe', name: 'Cambridge C2 Proficiency (CPE)', family: 'Cambridge English', level: 'C2', summary: 'Near-native proficiency with complex texts, transformations, open cloze and extended production.', totalMinutes: 236, estimatedQuestions: 76, sections: ['Reading and Use of English', 'Writing', 'Listening', 'Speaking'], taskTypes: ['gapFill', 'sentenceCompletion', 'noteCompletion', 'tableCompletion', 'summaryCompletion', 'multipleChoice', 'fillInBlank', 'matching', 'essay', 'listening', 'speaking'], passingScorePercent: 68, adaptiveMode: false, timerMode: 'section', environment: { cambridgeScale: '180-230', level: 'C2' } },
  { id: 'celpip', name: 'CELPIP General', family: 'Canadian English', level: 'Immigration and work', summary: 'Canadian listening, reading, writing and speaking scenarios with note-completion listening tasks.', totalMinutes: 180, estimatedQuestions: 48, sections: ['Listening', 'Reading', 'Writing', 'Speaking'], taskTypes: ['noteCompletion', 'tableCompletion', 'sentenceCompletion', 'listening', 'multipleChoice', 'essay', 'speaking'], passingScorePercent: 70, adaptiveMode: false, timerMode: 'section', environment: { scoreScale: '1-12', canadianContext: true } },
  { id: 'oet', name: 'OET Healthcare English', family: 'Medical English', level: 'Healthcare registration', summary: 'Profession-specific listening with note completion, reading, writing letter and speaking role play.', totalMinutes: 180, estimatedQuestions: 52, sections: ['Listening', 'Reading', 'Writing', 'Speaking'], taskTypes: ['noteCompletion', 'tableCompletion', 'sentenceCompletion', 'listening', 'multipleChoice', 'essay', 'speaking'], passingScorePercent: 70, adaptiveMode: false, timerMode: 'section', environment: { professionSpecific: true, rolePlay: true } },
  { id: 'english-placement', name: 'English Placement Test', family: 'English placement', level: 'A1-C2 diagnostic', summary: 'A detailed diagnostic placement test covering grammar, reading, listening, vocabulary, writing, speaking and integrated use of English.', totalMinutes: 150, estimatedQuestions: 70, sections: ['Grammar and Vocabulary', 'Reading Comprehension', 'Listening Comprehension', 'Writing', 'Speaking'], taskTypes: ['noteCompletion', 'tableCompletion', 'summaryCompletion', 'sentenceCompletion', 'gapFill', 'completeWords', 'multipleChoice', 'multipleSelect', 'fillInBlank', 'matching', 'ordering', 'listening', 'essay', 'speaking'], passingScorePercent: 70, adaptiveMode: true, timerMode: 'section', environment: { placement: true, diagnostic: true, cefrBands: 'A1-C2', skills: 'grammar,vocabulary,reading,listening,writing,speaking' } },
  { id: 'custom', name: 'Custom Exam Blueprint', family: 'Custom', level: 'User-defined', summary: 'Write your own test name, task profile, timings and output expectations.', totalMinutes: 60, estimatedQuestions: 20, sections: ['Custom Section A', 'Custom Section B'], taskTypes: ['noteCompletion', 'multipleChoice', 'essay', 'speaking'], passingScorePercent: 70, adaptiveMode: false, timerMode: 'total', environment: { custom: true } },
];

/**
 * Which skills an exam section actually assesses, inferred from its name.
 *
 * This exists because every section used to receive the *same* question set taken
 * from the front of the task list - so an IELTS form asked a reading-comprehension
 * question inside its Writing and Speaking sections, and all four sections of a
 * form were byte-identical.
 */
export type SectionKind = 'listening' | 'reading' | 'writing' | 'speaking' | 'useOfEnglish' | 'mixed' | 'general';

/**
 * Ordered from most to least specific. Combined papers must be tested BEFORE the
 * single-skill words, or Cambridge "Reading and Writing" resolves to writing and
 * the section becomes nothing but essays, and PTE "Speaking and Writing" becomes
 * nothing but speaking prompts.
 */
export const classifySection = (sectionName: string): SectionKind => {
  const name = (sectionName || '').toLowerCase();
  if (name.includes('listen')) return 'listening';
  if (name.includes('speak') && name.includes('writ')) return 'mixed';
  if (name.includes('read') && name.includes('writ')) return 'mixed';
  if (name.includes('speak') || name.includes('oral') || name.includes('interview')) return 'speaking';
  if (name.includes('writ') || name.includes('letter') || name.includes('email') || name.includes('sample')) return 'writing';
  if (name.includes('read')) return 'reading';
  if (name.includes('use of english') || name.includes('grammar') || name.includes('vocab') || name.includes('language')) return 'useOfEnglish';
  return 'general';
};

/** Task types that suit each section kind, in the order they should be stacked. */
const SECTION_TASK_PROFILE: Record<SectionKind, ExamQuestionType[]> = {
  // Listening and reading papers are dominated by completion tasks in every one of the
  // 2026 formats: IELTS form/note/table/sentence completion, TOEFL Complete the Words
  // and note-taking, Cambridge open cloze. They lead the rotation, not trail it.
  listening: ['noteCompletion', 'tableCompletion', 'multipleChoice', 'sentenceCompletion', 'matching', 'completeWords'],
  reading: ['tableCompletion', 'summaryCompletion', 'multipleChoice', 'noteCompletion', 'sentenceCompletion', 'matching'],
  writing: ['essay', 'writing'],
  speaking: ['speaking'],
  useOfEnglish: ['sentenceCompletion', 'gapFill', 'multipleChoice', 'completeWords', 'ordering', 'matching'],
  mixed: ['sentenceCompletion', 'tableCompletion', 'multipleChoice', 'gapFill', 'matching', 'essay', 'writing'],
  general: ['noteCompletion', 'completeWords', 'multipleChoice', 'summaryCompletion', 'multipleSelect', 'matching', 'ordering', 'listening', 'essay', 'speaking'],
};

/**
 * Every question type the builder and the runtime both know about, in one place.
 *
 * App.tsx and TestPresetSelector each used to spell out the flag object by hand, so
 * adding a renderer meant editing three lists and forgetting one silently dropped the
 * type from every preset. They now both derive from this array.
 */
export const QUESTION_TYPE_KEYS: ExamQuestionType[] = [
  'multipleChoice',
  'multipleSelect',
  'essay',
  'writing',
  'fillInBlank',
  'matching',
  'ordering',
  'likert',
  'listening',
  'speaking',
  'noteCompletion',
  'tableCompletion',
  'summaryCompletion',
  'sentenceCompletion',
  'gapFill',
  'completeWords',
];

/** A flag object with every type off, then switched on from an available-type list. */
export const buildQuestionTypeFlags = (available: ExamQuestionType[]): Record<ExamQuestionType, boolean> => {
  const flags = {} as Record<ExamQuestionType, boolean>;
  QUESTION_TYPE_KEYS.forEach((type) => { flags[type] = available.includes(type); });
  return flags;
};

/** Question types offered by the builder but not yet renderable in the runtime. */
export const UNRENDERABLE_QUESTION_TYPES = [
  'true_false_not_given',
  'yes_no_not_given',
  'note_completion',
  'table_completion',
  'summary_completion',
  'flow_chart_completion',
  'diagram_label_completion',
  'short_answer',
  'long_answer',
  'email',
  'letter',
  'read_aloud',
  'repeat_sentence',
  'listen_and_type',
  'dictation',
  'oral_interview',
  'role_play',
  'hotspot',
  'image_choice',
  'matrix',
  'numeric_entry',
  'fraction_entry',
  'equation_entry',
  'drag_and_drop_cloze',
  'dropdown_cloze',
  'highlight_text',
  'highlight_sentence',
  'matching_headings',
  'matching_information',
  'matching_features',
  'matching_sentence_endings',
  'reorder_paragraphs',
  'interactive_reading',
  'video_reflection',
  'sentence_completion',
  'gap_fill',
  'complete_words',
  'build_sentence',
  'categorization',
];

/**
 * Question words that differ per slot so a generated form is not N copies of one
 * sentence. Variant is chosen by index so re-generation stays deterministic.
 */
const SECTION_STEMS: Record<SectionKind, string[]> = {
  listening: ['the change to the assessment deadline', 'the main reason for the delay', 'who is responsible for the venue booking', 'what the speaker recommends next'],
  reading: ['the writer\u2019s main claim', 'the reference to the earlier study', 'the purpose of the second paragraph', 'the contrast drawn in the final sentence'],
  writing: ['the topic stated in the task', 'the position you are asked to take', 'the purpose of the required text', 'the audience named in the prompt'],
  speaking: ['the prompt you are given', 'the point you are asked to develop', 'the comparison in the task card', 'the situation described'],
  useOfEnglish: ['the gapped sentence', 'the underlined phrase', 'the collocation in the text', 'the grammatical form required'],
  mixed: ['the passage in the paper', 'the text you have just read', 'the writer\u2019s argument', 'the gapped sentence'],
  general: ['the task instructions', 'the stimulus provided', 'the statement given', 'the situation described'],
};

// A completion item's weight is the TOTAL for the item; each gap is worth
// weight / blankCount and is marked on its own.
/**
 * Authored reading passages, one per reading section of a generated form.
 *
 * A reading section used to ship with no passage at all while still asking
 * "according to the passage..." - the question had nothing to refer to. Each entry
 * carries vocabulary so the tooltip layer has something to annotate.
 */
const READING_PASSAGE_BANK = [
  {
    title: 'Urban Heat Islands',
    content:
      'Cities are consistently warmer than the countryside that surrounds them, often by three to five degrees at night. The effect is produced by dark surfaces, which absorb solar radiation during the day and release it slowly after sunset, and by the geometry of tall buildings, which trap the heat that would otherwise escape upwards.\n\n' +
      'Planting street trees addresses both causes at once. The canopy intercepts sunlight before it reaches the pavement, and the leaves cool the surrounding air as water evaporates from their surfaces. A study of four mid-sized European cities found that a ten per cent increase in canopy cover lowered peak afternoon temperatures by roughly one degree, with the largest reductions recorded in the districts that had previously held the least vegetation.\n\n' +
      'The benefits are not distributed evenly. Trees need space for roots and a reliable water supply, and both are scarce in the densest neighbourhoods, which are frequently the hottest. Without deliberate planning, therefore, greening programmes can widen the gap between the coolest and warmest parts of a city even as they lower the average temperature.',
    vocabulary: [
      { word: 'canopy', definition: 'the layer of leaves and branches formed by trees' },
      { word: 'evaporates', definition: 'changes from a liquid into a vapour' },
      { word: 'scarce', definition: 'not available in sufficient quantity' },
    ],
  },
  {
    title: 'The Cost of Free Shipping',
    content:
      'Online retailers rarely absorb the cost of delivery. The charge is instead built into the price of the goods, spread across every customer, or recovered through a minimum order value that encourages shoppers to buy more than they intended.\n\n' +
      'The environmental consequences are easier to measure than the financial ones. A single delivery van serving forty households produces far less carbon than forty separate journeys to a shop, but the convenience of free returns has the opposite effect: returned goods often travel twice and are frequently discarded rather than resold. Surveys of returned electronics suggest that fewer than half reach a second customer.\n\n' +
      'Some retailers have responded by charging for returns while keeping delivery free. Early results indicate that the change reduced return rates sharply but also reduced first-time purchases, particularly among customers buying clothing, where fit cannot be judged from a photograph.',
    vocabulary: [
      { word: 'absorb', definition: 'to take on a cost without passing it on' },
      { word: 'discarded', definition: 'thrown away' },
      { word: 'consequences', definition: 'results or effects of an action' },
    ],
  },
  {
    title: 'Sleep and Learning',
    content:
      'The idea that sleep consolidates memory is now well supported, but the details are more specific than the general claim suggests. Material learned in the morning is consolidated most effectively by a full night of sleep, whereas material learned in the evening benefits from a shorter period of sleep immediately afterwards.\n\n' +
      'What matters is not only duration but continuity. Participants whose sleep was interrupted at regular intervals performed worse on later recall than those who slept for the same total number of hours without interruption, even when the interruptions lasted only a few minutes.\n\n' +
      'This finding has practical implications for students who study late and then sleep badly. The hours spent reading are not wasted, but the transfer from short-term to long-term storage appears to depend on the sleep that follows, and no amount of additional reading the next morning fully compensates for its absence.',
    vocabulary: [
      { word: 'consolidates', definition: 'makes something stronger or more permanent' },
      { word: 'continuity', definition: 'the state of being uninterrupted' },
      { word: 'compensates', definition: 'makes up for a loss or deficiency' },
    ],
  },
];

const WEIGHTS: Partial<Record<ExamQuestionType, number>> = {
  multipleChoice: 10, multipleSelect: 12, fillInBlank: 8, matching: 12,
  ordering: 10, essay: 20, writing: 20, speaking: 15, listening: 10, likert: 5,
  noteCompletion: 8, tableCompletion: 8, summaryCompletion: 6,
  sentenceCompletion: 4, gapFill: 5, completeWords: 8,
};

/**
 * Spoken scripts for listening items.
 *
 * Every generic listening item used to be handed the SAME sentence as its audio:
 * "Good morning. Today we need to confirm the updated assessment deadline...". A
 * candidate in a thirteen-item listening section therefore pressed Play thirteen
 * times and heard one sentence thirteen times, and in none of the items did the
 * recording contain the answer the item asked for - a note-completion task whose
 * notes read "Opening hours change to ____" was answered by audio that never
 * mentioned an opening time.
 *
 * Each script below is authored against the exact payload buildQuestion() emits
 * for that type and index, so the recording states the answers the item marks.
 */
const LISTENING_SCRIPTS: Partial<Record<ExamQuestionType, string[]>> = {
  noteCompletion: [
    'The briefing this morning is short, so please take the key details down. From the first of September the weekday opening hours change to eight a.m. — that is eight a.m., not nine as the old leaflet said. If you want to see an adviser, the appointment has to be booked at least twenty-four hours in advance, so please do not simply turn up at the desk. And when you do come, bring photographic identification and a copy of your offer letter — the offer letter, not the acceptance email you were sent first.',
    'The library induction will take about ten minutes. The tour leaves from the help desk on level two, so please gather there rather than at the entrance. Group study rooms can be booked for a maximum of three hours at a time, and after that the booking is released to whoever wants it. There is no charge for printing, but everything you print is charged to your student account, so keep an eye on it.',
    'A short notice about the sports centre. The pool closes for maintenance in June, and the exact dates go up on the board next week. Membership includes two guest passes every month, and those passes cannot be carried over. One more thing: a class must be cancelled at least twelve hours before it starts, or it is counted against your allowance.',
    'Three things about moving out of halls. The deposit is fully refundable as long as the room is left clean, and that includes the kitchen. Keys are handed back at the accommodation office, not at reception, so do not take them downstairs. And if there is a noise complaint, it goes to the warden on duty rather than to the security team.',
    'The careers fair is in the sports building this year, not in the main hall, so ignore the signs from last year. Bring several printed copies of your CV, because most stands will not take a digital copy. And if you want a mock interview, you have to book at least seven days ahead — they fill up quickly.',
  ],
  tableCompletion: [
    'Three courses are open to you from January. Applied Statistics runs for three months and is assessed by written examination, with no coursework element at all. Curriculum Design also runs for six months, but it is assessed by portfolio rather than by examination. Field Ecology is the longest option at nine months, and at the end of it you submit a dissertation.',
    'Comparing the two residences: Hillside Hall is a ten minute walk from the main campus and costs one hundred and forty pounds a week, and the price includes meals. Riverside Flats are further out — about twenty minutes by bus — and cost ninety-five pounds a week, but Wi-Fi is the only thing included, so you would cook for yourself.',
    'The three core modules differ in size and in how they are assessed. Data Ethics carries ten credits and is assessed by a single essay. Research Design is a twenty credit module assessed by portfolio rather than by examination. Statistical Analysis is the largest at thirty credits, and it is assessed by examination only.',
    'Here are the bus times. The airport shuttle leaves at six thirty in the morning, runs every thirty minutes, and takes forty-five minutes. The harbour bus leaves at seven fifteen, takes twenty-five minutes, and runs on weekdays only. The late service leaves at ten in the evening, takes fifty-five minutes, and has to be booked by phone.',
    'Appointment times have moved this month. The dental clinic runs on Monday at eleven o\u2019clock with Dr Okafor. Physiotherapy has moved to Wednesday at two in the afternoon with Dr Lindqvist. And the eye clinic is on Friday at half past nine with Dr Bhatt.',
  ],
  sentenceCompletion: [
    'The survey followed the same group for a year. Most participants reported that they had changed their eating habits within twelve months, which surprised us. We had assumed the fall in error rates would follow the new equipment, but the authors attribute it to better training instead, and the equipment barely changed during the period.',
    'The report is quite specific about the cause. The delay was caused by staffing, not by the weather, and that distinction matters for the recommendations. The authors also recommend repeating the survey with a larger sample before the findings are acted on.',
    'Two findings are worth the time. Attendance improved once the lectures were moved to the morning, and the improvement held for the whole term. And students who used the writing service scored higher on average than those who did not, although the difference was modest.',
    'The venue changed because the original hall is being renovated until March, which nobody had planned for. Tickets can be exchanged only if the event is cancelled outright, and that has not happened, so the original tickets remain valid.',
    'The scheme was extended after the first year showed a clear fall in absenteeism, which was the outcome the funders were watching. And staff who completed the course were more likely to be promoted within eighteen months.',
  ],
  matching: [
    'I want to begin with the claim itself. It can be argued that the trend is reversible — that is my opening statement. However, the second dataset points the other way, and I will present that as the contrasting evidence. Taken together, the evidence supports a partial change, and that is the conclusion I draw from it.',
    'Here are the results. The data show that attendance fell by a fifth over the year, and that figure is the one to report. This may indicate a wider pattern, although I would not go further than that. Finally, the committee should adopt the policy this term, because the evidence is strong enough now.',
    'Turning to how the study was run: participants were recorded twice a week for six months. The sample was drawn from one city only, which is the clearest limitation. And the second study found a smaller effect than the first, so the two findings do not agree.',
    'Could you say a little more about the second point, because I want to be clear about it. I am not convinced the data support that claim. So, to pull it together: the proposal stands or falls on the cost estimate.',
    'One correction before we go on: the total was nine thousand, not nineteen thousand. Please send the form before the end of the week. And there is no penalty at all if you withdraw now.',
  ],
  // Three variants, matched to the three completeWords passages by index.
  completeWords: [
    'The earliest public libraries were not free to enter, and the subscription they charged effectively excluded poorer readers. When the first rate-funded library opened in 1850, it accepted anyone who walked in, and within a decade the model had spread across the industrial cities.',
    'Migratory birds navigate by two independent systems. The first depends on the position of the sun and the second on the earth\u2019s magnetic field. When one system is obscured by cloud the other compensates, which is why the birds rarely abandon their route entirely.',
    'The experiment was repeated four times because the first reading was distorted by a faulty sensor. Once the sensor was replaced, the measurements agreed to within one per cent, and the team could confirm the earlier result.',
    'The bridge reopened after engineers repaired the cracks in the supports. Traffic was restricted to one lane for six weeks, and the repairs were estimated to cost two million pounds.',
    'The archive was founded in 1974 and now holds more than a million items. Most of the collection can be consulted on request, and photography is permitted in the reading room.',
  ],
};

/**
 * Note-completion variants. The prompt says "complete the notes below", so the notes have
 * to be on screen, and one variant is not enough: a thirteen-item listening section uses
 * the notes task twice, and with a single template the second one was a copy of the first,
 * down to the answers. Each variant is paired by index with the recording above that
 * states its answers.
 */
const NOTE_COMPLETION_VARIANTS = [
  {
    templateHtml: '<h4>Student Services — orientation briefing</h4>' +
      '<ul>' +
      '<li>Opening hours change from 1 September to {{n1}} on weekdays.</li>' +
      '<li>Appointments must be booked at least {{n2}} hours in advance.</li>' +
      '<li>Bring photographic identification and a copy of your {{n3}} letter.</li>' +
      '</ul>',
    blanks: [
      { id: 'n1', correct: ['8am', '8 am', 'eight'], maxLength: 8 },
      { id: 'n2', correct: ['24', 'twenty-four', 'twenty four'], maxLength: 12 },
      { id: 'n3', correct: ['offer', 'admission', 'acceptance'], maxLength: 12 },
    ],
  },
  {
    templateHtml: '<h4>Library induction — key points</h4>' +
      '<ul>' +
      '<li>The guided tour leaves from the {{n1}} desk on level two.</li>' +
      '<li>Group study rooms can be booked for a maximum of {{n2}} hours.</li>' +
      '<li>Printing is charged to your {{n3}} account.</li>' +
      '</ul>',
    blanks: [
      { id: 'n1', correct: ['help', 'information', 'enquiry', 'inquiry'], maxLength: 12 },
      { id: 'n2', correct: ['3', 'three'], maxLength: 8 },
      { id: 'n3', correct: ['student', 'printing', 'library'], maxLength: 12 },
    ],
  },
  {
    templateHtml: '<h4>Sports centre — announcements</h4>' +
      '<ul>' +
      '<li>The pool closes for maintenance in {{n1}}.</li>' +
      '<li>Membership includes {{n2}} guest passes each month.</li>' +
      '<li>Classes must be cancelled at least {{n3}} hours in advance.</li>' +
      '</ul>',
    blanks: [
      { id: 'n1', correct: ['june'], maxLength: 10 },
      { id: 'n2', correct: ['2', 'two'], maxLength: 8 },
      { id: 'n3', correct: ['12', 'twelve'], maxLength: 10 },
    ],
  },
  {
    templateHtml: '<h4>Moving out of halls — checklist</h4>' +
      '<ul>' +
      '<li>The deposit is refunded only if the room is left {{n1}}.</li>' +
      '<li>Keys must be handed back at the {{n2}} office.</li>' +
      '<li>Noise complaints are dealt with by the {{n3}} on duty.</li>' +
      '</ul>',
    blanks: [
      { id: 'n1', correct: ['clean', 'tidy'], maxLength: 10 },
      { id: 'n2', correct: ['accommodation', 'housing', 'accommodation office'], maxLength: 16 },
      { id: 'n3', correct: ['warden', 'porter'], maxLength: 10 },
    ],
  },
  {
    templateHtml: '<h4>Careers fair — what to do</h4>' +
      '<ul>' +
      '<li>The fair is held in the {{n1}} building.</li>' +
      '<li>Bring several printed copies of your {{n2}}.</li>' +
      '<li>Book a mock interview at least {{n3}} days ahead.</li>' +
      '</ul>',
    blanks: [
      { id: 'n1', correct: ['sports'], maxLength: 10 },
      { id: 'n2', correct: ['cv', 'resume', 'curriculum vitae'], maxLength: 16 },
      { id: 'n3', correct: ['7', 'seven'], maxLength: 8 },
    ],
  },
];

/** Table-completion variants. Paired by index with LISTENING_SCRIPTS.tableCompletion. */
const TABLE_COMPLETION_VARIANTS = [
  {
    templateHtml: '<table><thead><tr><th>Course</th><th>Length</th><th>Assessment</th></tr></thead>' +
      '<tbody>' +
      '<tr><td>Applied Statistics</td><td>{{t1}} months</td><td>Written examination</td></tr>' +
      '<tr><td>{{t2}} Design</td><td>6 months</td><td>Portfolio</td></tr>' +
      '<tr><td>Field Ecology</td><td>9 months</td><td>{{t3}}</td></tr>' +
      '</tbody></table>',
    blanks: [
      { id: 't1', correct: ['3', 'three'], maxLength: 6 },
      { id: 't2', correct: ['curriculum', 'course'], maxLength: 12 },
      { id: 't3', correct: ['dissertation', 'thesis', 'report'], maxLength: 14 },
    ],
  },
  {
    templateHtml: '<table><thead><tr><th>Residence</th><th>Travel to campus</th><th>Cost per week</th><th>Included</th></tr></thead>' +
      '<tbody>' +
      '<tr><td>Hillside Hall</td><td>{{t1}} minutes on foot</td><td>£140</td><td>{{t2}}</td></tr>' +
      '<tr><td>Riverside Flats</td><td>20 minutes by bus</td><td>£{{t3}}</td><td>Wi-Fi only</td></tr>' +
      '</tbody></table>',
    blanks: [
      { id: 't1', correct: ['10', 'ten'], maxLength: 6 },
      { id: 't2', correct: ['meals', 'catering', 'food'], maxLength: 12 },
      { id: 't3', correct: ['95', 'ninety-five', 'ninety five'], maxLength: 14 },
    ],
  },
  {
    templateHtml: '<table><thead><tr><th>Module</th><th>Credits</th><th>Assessment</th></tr></thead>' +
      '<tbody>' +
      '<tr><td>Data Ethics</td><td>{{t1}}</td><td>Essay</td></tr>' +
      '<tr><td>Research Design</td><td>20</td><td>{{t2}}</td></tr>' +
      '<tr><td>{{t3}} Analysis</td><td>30</td><td>Examination</td></tr>' +
      '</tbody></table>',
    blanks: [
      { id: 't1', correct: ['10', 'ten'], maxLength: 6 },
      { id: 't2', correct: ['portfolio', 'presentation'], maxLength: 14 },
      { id: 't3', correct: ['statistical', 'data', 'quantitative'], maxLength: 14 },
    ],
  },
  {
    templateHtml: '<table><thead><tr><th>Service</th><th>Departs</th><th>Journey time</th><th>Notes</th></tr></thead>' +
      '<tbody>' +
      '<tr><td>Airport shuttle</td><td>{{t1}}</td><td>45 minutes</td><td>Every 30 minutes</td></tr>' +
      '<tr><td>Harbour bus</td><td>07:15</td><td>{{t2}} minutes</td><td>Weekdays only</td></tr>' +
      '<tr><td>{{t3}} service</td><td>22:00</td><td>55 minutes</td><td>Book by phone</td></tr>' +
      '</tbody></table>',
    blanks: [
      { id: 't1', correct: ['06:30', '6:30', '6.30', 'six thirty'], maxLength: 10 },
      { id: 't2', correct: ['25', 'twenty-five', 'twenty five'], maxLength: 14 },
      { id: 't3', correct: ['late', 'night'], maxLength: 10 },
    ],
  },
  {
    templateHtml: '<table><thead><tr><th>Day</th><th>Clinic</th><th>Time</th><th>Doctor</th></tr></thead>' +
      '<tbody>' +
      '<tr><td>Monday</td><td>Dental</td><td>{{t1}}</td><td>Dr Okafor</td></tr>' +
      '<tr><td>{{t2}}</td><td>Physiotherapy</td><td>14:00</td><td>Dr Lindqvist</td></tr>' +
      '<tr><td>Friday</td><td>{{t3}} clinic</td><td>09:30</td><td>Dr Bhatt</td></tr>' +
      '</tbody></table>',
    blanks: [
      { id: 't1', correct: ['11:00', '11.00', 'eleven'], maxLength: 10 },
      { id: 't2', correct: ['wednesday'], maxLength: 12 },
      { id: 't3', correct: ['eye', 'optician', 'vision'], maxLength: 12 },
    ],
  },
];

/** Sentence-completion variants. Paired by index with LISTENING_SCRIPTS.sentenceCompletion. */
const SENTENCE_COMPLETION_VARIANTS = [
  {
    templateHtml: '<ul>' +
      '<li>The survey found that most participants had changed their {{e1}} habits within a year.</li>' +
      '<li>The authors attribute the fall in error rates to better {{e2}} rather than to new equipment.</li>' +
      '</ul>',
    blanks: [
      { id: 'e1', correct: ['eating', 'dietary', 'shopping', 'travel'], maxLength: 12 },
      { id: 'e2', correct: ['training', 'communication', 'record keeping', 'supervision'], maxLength: 20 },
    ],
  },
  {
    templateHtml: '<ul>' +
      '<li>The report states that the delay was caused by {{e1}}, not by the weather.</li>' +
      '<li>The authors recommend repeating the survey with a larger {{e2}}.</li>' +
      '</ul>',
    blanks: [
      { id: 'e1', correct: ['staffing', 'staff', 'staff shortages'], maxLength: 18 },
      { id: 'e2', correct: ['sample', 'group', 'cohort'], maxLength: 12 },
    ],
  },
  {
    templateHtml: '<ul>' +
      '<li>Attendance improved once the lectures were moved to the {{e1}}.</li>' +
      '<li>Students who used the {{e2}} service scored higher on average.</li>' +
      '</ul>',
    blanks: [
      { id: 'e1', correct: ['morning', 'mornings'], maxLength: 12 },
      { id: 'e2', correct: ['writing', 'mentoring', 'advisory'], maxLength: 12 },
    ],
  },
  {
    templateHtml: '<ul>' +
      '<li>The venue had to change because the original hall is being {{e1}}.</li>' +
      '<li>Tickets can be exchanged only if the event is {{e2}} outright.</li>' +
      '</ul>',
    blanks: [
      { id: 'e1', correct: ['renovated', 'refurbished', 'repaired'], maxLength: 14 },
      { id: 'e2', correct: ['cancelled', 'canceled', 'postponed'], maxLength: 14 },
    ],
  },
  {
    templateHtml: '<ul>' +
      '<li>The scheme was extended after the first year showed a fall in {{e1}}.</li>' +
      '<li>Staff who completed the course were more likely to be {{e2}}.</li>' +
      '</ul>',
    blanks: [
      { id: 'e1', correct: ['absenteeism', 'absence', 'absence rates'], maxLength: 16 },
      { id: 'e2', correct: ['promoted', 'retained'], maxLength: 12 },
    ],
  },
];

/** Matching variants. Paired by index with LISTENING_SCRIPTS.matching. */
const MATCHING_VARIANTS = [
  {
    prompt: 'Match each statement about {focus} to the function it performs.',
    pairs: [
      { left: 'Introducing a claim', right: 'It can be argued that the trend is reversible.' },
      { left: 'Contrasting evidence', right: 'However, the second dataset points the other way.' },
      { left: 'Drawing a conclusion', right: 'Taken together, the evidence supports a partial change.' },
    ],
  },
  {
    prompt: 'Match each sentence about {focus} to the function it performs in the recording.',
    pairs: [
      { left: 'Reporting a result', right: 'The data show that attendance fell by a fifth.' },
      { left: 'Hedging a claim', right: 'This may indicate a wider pattern.' },
      { left: 'Recommending action', right: 'The committee should adopt the policy this term.' },
    ],
  },
  {
    prompt: 'Match each sentence about {focus} to the function it performs in the recording.',
    pairs: [
      { left: 'Describing a method', right: 'Participants were recorded twice a week for six months.' },
      { left: 'Acknowledging a limitation', right: 'The sample was drawn from one city only.' },
      { left: 'Comparing two findings', right: 'The second study found a smaller effect than the first.' },
    ],
  },
  {
    prompt: 'Match each sentence about {focus} to the function it performs in the recording.',
    pairs: [
      { left: 'Requesting clarification', right: 'Could you say a little more about the second point?' },
      { left: 'Expressing reservation', right: 'I am not convinced the data support that claim.' },
      { left: 'Summarising', right: 'The proposal stands or falls on the cost estimate.' },
    ],
  },
  {
    prompt: 'Match each sentence about {focus} to the function it performs in the recording.',
    pairs: [
      { left: 'Correcting a figure', right: 'The total was nine thousand, not nineteen thousand.' },
      { left: 'Giving an instruction', right: 'Please send the form before the end of the week.' },
      { left: 'Offering reassurance', right: 'There is no penalty if you withdraw now.' },
    ],
  },
];

/**
 * Listening multiple-choice items. The options used to be meta-descriptions of a source
 * ("The main point of the source", "A plausible but unsupported idea") rather than
 * content, so the item could not be answered from the recording at all. These options
 * are about the recording, and the script states which one is supported.
 *
 * Each entry carries its own `focus`, and the question text is built from that same
 * entry, so the question, the options and the recording always describe one situation.
 * Indexing the options by the section stem instead asked "what is said about the venue
 * booking?" while the player read a script about the deadline.
 */
const LISTENING_CHOICE_BANK = [
  {
    script: 'I want to be clear about the assessment deadline, because some of you have been told something different. The change to the deadline applies to every student on the course, not just to one seminar group. If you were told otherwise, ignore that, and note the new date in the portal.',
    focus: 'the change to the assessment deadline',
    correct: 'The change applies to every student on the course.',
    wrong: ['The change applies to one seminar group only.', 'The deadline has not changed at all.', 'The deadline was announced after the portal closed.'],
  },
  {
    script: 'People assume the delay was caused by the funding review, but that is not what happened. The delay was caused by the venue, which was double-booked for the same week. The funding review had already finished before any of this came up.',
    focus: 'the main reason for the delay',
    correct: 'The delay was caused by the venue being double-booked.',
    wrong: ['The delay was caused by the funding review.', 'The delay was caused by staff illness.', 'The delay was caused by the portal failing.'],
  },
  {
    script: 'To answer the question about the venue booking: it is the course administrator who is responsible, not the tutor and not the students. If the room is wrong on the day, it is the administrator you should contact.',
    focus: 'who is responsible for the venue booking',
    correct: 'The course administrator is responsible for the venue booking.',
    wrong: ['The tutor is responsible for the venue booking.', 'The students are responsible for the venue booking.', 'Nobody is responsible for the venue booking.'],
  },
  {
    script: 'So, what I would recommend you do next is book the appointment before the end of this week. Do not wait for the confirmation email, and do not leave it until the deadline itself.',
    focus: 'what the speaker recommends doing next',
    correct: 'Book the appointment before the end of the week.',
    wrong: ['Wait for the confirmation email before acting.', 'Leave the booking until the deadline itself.', 'Post the form instead of booking online.'],
  },
  {
    script: 'If you take one thing from today, take this: start the reading for the second assignment now rather than after the break, because the break is shorter than it looks in the calendar.',
    focus: 'what the speaker recommends doing next',
    correct: 'Start the reading for the second assignment before the break.',
    wrong: ['Wait until after the break to begin.', 'Read only the first assignment again.', 'Ask for the break to be moved.'],
  },
  {
    script: 'The venue booking is handled centrally. Fill in the room request form and the timetabling team will confirm it within three working days, so there is no need to email the tutor as well.',
    focus: 'the room booking',
    correct: 'A room request form goes to the timetabling team.',
    wrong: ['The tutor confirms every booking personally.', 'Bookings are made by telephone only.', 'Rooms are allocated on the day, first come first served.'],
  },
  {
    script: 'I should correct something from earlier. The assessment deadline is the second of May, not the second of March, so nobody has missed anything yet.',
    focus: 'the assessment deadline',
    correct: 'The deadline is in May, not March.',
    wrong: ['The deadline is in March, not May.', 'The deadline has already passed.', 'No deadline has been set.'],
  },
];

const buildQuestionPayload = (testId: string, sectionId: string, index: number, type: ExamQuestionType, kind: SectionKind = 'general', variant = 0) => {
  const baseId = `${testId}-${sectionId}-q${index}`;
  const stems = SECTION_STEMS[kind] || SECTION_STEMS.general;
  const focus = stems[(index - 1) % stems.length];
  const weight = WEIGHTS[type] ?? 10;

  if (type === 'speaking') {
    return { id: baseId, type, text: `Record a 60-90 second spoken response about ${focus}, using clear structure and specific examples.`, instructions: 'Click Start Recording, answer naturally, then click Stop Recording.', scoringWeight: weight, maxRecordingSeconds: 90, strategyTips: 'Use a quick opening statement, two developed points, and a concise closing sentence.', explanation: 'Speaking answers are saved locally and can be downloaded from the result page.', feedbackDetail: 'Marked subjectively: look for fluency, range, coherence and pronunciation.' };
  }
  if (type === 'essay' || type === 'writing') {
    const maxWords = type === 'writing' ? '180-220' : '220-280';
    return { id: baseId, type, text: `Write ${maxWords} words addressing ${focus}. Support your view with reasons and examples.`, scoringWeight: weight, minWords: 10, strategyTips: 'Plan for 2 minutes, write with clear paragraphs, and reserve time to correct grammar.', explanation: 'Writing responses are included in the generated result email body when a tutor email exists.', feedbackDetail: 'Completion credit only in the standalone file; a tutor or rubric engine must confirm the band.' };
  }
  if (type === 'fillInBlank') {
    const blanks = ['extended', 'postponed', 'withdrawn', 'revised'];
    const answer = blanks[(index - 1) % blanks.length];
    return { id: baseId, type, text: `Complete the sentence about ${focus}: The original arrangement has been ________.`, scoringWeight: weight, correctAnswers: [answer], strategyTips: 'Use the grammar and meaning of the sentence around the blank.', explanation: `"${answer}" completes the sentence in both form and meaning.` };
  }
  if (type === 'matching') {
    const v = MATCHING_VARIANTS[variant % MATCHING_VARIANTS.length];
    return {
      id: baseId, type, text: v.prompt.replace('{focus}', focus), scoringWeight: weight,
      matchingPairs: v.pairs,
      audioScript: LISTENING_SCRIPTS.matching![variant % LISTENING_SCRIPTS.matching!.length],
      strategyTips: 'Identify the language function before matching the wording.',
      explanation: 'Function recognition is more reliable than keyword hunting.',
    };
  }
  if (type === 'ordering') {
    const sequences = [
      { options: ['The hall was unavailable', 'The session moved to Wednesday', 'The student updated the calendar'], 
        correct: ['The hall was unavailable', 'The session moved to Wednesday', 'The student updated the calendar'] },
      { options: ['The deadline is announced', 'The draft is reviewed', 'The final file is submitted'],
        correct: ['The deadline is announced', 'The draft is reviewed', 'The final file is submitted'] },
      { options: ['The opening claim is made', 'Supporting evidence is given', 'A conclusion is drawn'],
        correct: ['The opening claim is made', 'Supporting evidence is given', 'A conclusion is drawn'] },
    ];
    const picked = sequences[(index - 1) % sequences.length];
    const ids = picked.options.map((_, i) => `o${i + 1}`);
    return {
      id: baseId, type, text: `Put the steps concerning ${focus} into the order in which they occur.`, scoringWeight: weight,
      options: picked.options.map((text, i) => ({ id: ids[i], text })),
      correctAnswers: picked.correct.map((text) => ids[picked.options.indexOf(text)]),
      strategyTips: 'Follow the narrative order of the source before reordering.',
      explanation: 'The sequence follows the order stated in the source material.',
    };
  }
  // ---------------------------------------------------------------- completion family
  if (type === 'noteCompletion') {
    const v = NOTE_COMPLETION_VARIANTS[variant % NOTE_COMPLETION_VARIANTS.length];
    return {
      id: baseId, type, text: 'Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.', scoringWeight: weight,
      templateHtml: v.templateHtml,
      blanks: v.blanks,
      audioScript: LISTENING_SCRIPTS.noteCompletion![variant % LISTENING_SCRIPTS.noteCompletion!.length],
      strategyTips: 'The notes follow the order of the recording. Write the word you hear, spelled correctly, and no more than the word limit allows.',
      explanation: 'Each gap takes one word or number, and each gap is marked separately.',
    };
  }
  if (type === 'tableCompletion') {
    const v = TABLE_COMPLETION_VARIANTS[variant % TABLE_COMPLETION_VARIANTS.length];
    return {
      id: baseId, type, text: 'Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.', scoringWeight: weight,
      templateHtml: v.templateHtml,
      blanks: v.blanks,
      audioScript: LISTENING_SCRIPTS.tableCompletion![variant % LISTENING_SCRIPTS.tableCompletion!.length],
      strategyTips: 'Read the column heading before the gap - it tells you what kind of word is missing.',
      explanation: 'Table gaps are marked one cell at a time.',
    };
  }
  if (type === 'summaryCompletion') {
    return {
      id: baseId, type, text: 'Complete the summary below. Write NO MORE THAN TWO WORDS for each answer.', scoringWeight: weight,
      templateHtml: '<p>Urban heat islands form because dark surfaces absorb solar radiation and release it slowly. Adding street trees lowers surface temperature directly through {{s1}}, and indirectly by reducing the demand for {{s2}} in nearby buildings. Cities that have measured the effect report the largest gains in districts with little {{s3}} cover.</p>',
      blanks: [
        { id: 's1', correct: ['shade', 'shading', 'transpiration'], maxLength: 16 },
        { id: 's2', correct: ['air conditioning', 'cooling', 'energy'], maxLength: 20 },
        { id: 's3', correct: ['tree', 'canopy', 'vegetation', 'green'], maxLength: 14 },
      ],
      strategyTips: 'The summary paraphrases the source, so match meaning rather than wording.',
      explanation: 'Two words maximum per gap; an answer of three words scores zero for that gap.',
    };
  }
  if (type === 'sentenceCompletion') {
    const v = SENTENCE_COMPLETION_VARIANTS[variant % SENTENCE_COMPLETION_VARIANTS.length];
    return {
      id: baseId, type, text: 'Complete the sentence with the word or phrase from the text.', scoringWeight: weight,
      templateHtml: v.templateHtml,
      blanks: v.blanks,
      audioScript: LISTENING_SCRIPTS.sentenceCompletion![variant % LISTENING_SCRIPTS.sentenceCompletion!.length],
      strategyTips: 'Copy the exact word from the text; a paraphrase scores zero in this task type.',
      explanation: 'Sentence completion is marked for exact wording and grammar.',
    };
  }
  if (type === 'gapFill') {
    return {
      id: baseId, type, text: 'Complete the text. Use each word from the box once only.', scoringWeight: weight,
      templateHtml: '<p>The committee agreed to {{g1}} the proposal until the funding review was complete, and asked the author to {{g2}} the cost estimates before the next meeting.</p>' +
        '<p class="gap-hint">Word box: postpone, revise</p>',
      blanks: [
        { id: 'g1', correct: ['postpone', 'defer', 'delay'], maxLength: 12 },
        { id: 'g2', correct: ['revise', 'check', 'review'], maxLength: 12 },
      ],
      strategyTips: 'Decide what part of speech each gap needs before choosing from the box.',
      explanation: 'Each word is used once; context decides which gap it belongs in.',
    };
  }
  if (type === 'completeWords') {
    // TOEFL iBT task family added on 21 January 2026. The prompt shows part of a word and
    // the candidate types the missing letters, so the visible letters are part of the item
    // and the {{placeholder}} sits between them. Without the placeholder the gap is never
    // drawn, which is why every completeWords item is re-authored per generation rather
    // than pasted as flat text.
    const wordSets = [
      {
        passage: 'The earliest public libraries were not free to enter. Most charged a subscription, which {{w1}} excluded poorer readers. When the first rate-funded library opened in 1850, it {{w2}} anyone who walked in, and within a decade the model had {{w3}} across the industrial cities.',
        blanks: [
          { id: 'w1', kind: 'partial' as const, stem: 'effect', tail: 'ly', correct: ['ively'], maxLength: 8 },
          { id: 'w2', kind: 'partial' as const, stem: 'acce', tail: 'd', correct: ['pte', 'pted'], maxLength: 8 },
          { id: 'w3', kind: 'partial' as const, stem: 'sp', tail: '', correct: ['read'], maxLength: 8 },
        ],
      },
      {
        passage: 'Migratory birds navigate by two independent systems. The first depends on the position of the sun, and the second on the earth\u2019s magnetic {{c1}}. When one system is {{c2}} by cloud, the other compensates, which is why the birds rarely {{c3}} their route entirely.',
        blanks: [
          { id: 'c1', kind: 'partial' as const, stem: 'fie', tail: 'd', correct: ['l'], maxLength: 6 },
          { id: 'c2', kind: 'partial' as const, stem: 'obsc', tail: 'd', correct: ['ure'], maxLength: 8 },
          { id: 'c3', kind: 'partial' as const, stem: 'aband', tail: '', correct: ['on'], maxLength: 8 },
        ],
      },
      {
        passage: 'The experiment was repeated four times because the first reading was {{e1}} by a faulty sensor. Once the sensor was {{e2}}, the measurements agreed to within one per cent, and the team could {{e3}} the earlier result.',
        blanks: [
          { id: 'e1', kind: 'partial' as const, stem: 'dist', tail: 'ed', correct: ['ort'], maxLength: 8 },
          { id: 'e2', kind: 'partial' as const, stem: 'rep', tail: 'ed', correct: ['lac'], maxLength: 8 },
          { id: 'e3', kind: 'partial' as const, stem: 'conf', tail: '', correct: ['irm'], maxLength: 8 },
        ],
      },
      {
        passage: 'The bridge reopened after engineers {{b1}} the cracks in the supports. Traffic was {{b2}} to one lane for six weeks, and the repairs were {{b3}} to cost two million pounds.',
        blanks: [
          { id: 'b1', kind: 'partial' as const, stem: 'rep', tail: 'ed', correct: ['air'], maxLength: 8 },
          { id: 'b2', kind: 'partial' as const, stem: 'restri', tail: 'ed', correct: ['ct'], maxLength: 8 },
          { id: 'b3', kind: 'partial' as const, stem: 'est', tail: 'ed', correct: ['imat'], maxLength: 8 },
        ],
      },
      {
        passage: 'The archive was {{a1}} in 1974 and now holds more than a million items. Most of the collection can be {{a2}} on request, and photography is {{a3}} in the reading room.',
        blanks: [
          { id: 'a1', kind: 'partial' as const, stem: 'fou', tail: 'ed', correct: ['nd'], maxLength: 8 },
          { id: 'a2', kind: 'partial' as const, stem: 'consul', tail: 'ed', correct: ['t'], maxLength: 8 },
          { id: 'a3', kind: 'partial' as const, stem: 'perm', tail: 'ed', correct: ['itt'], maxLength: 8 },
        ],
      },
    ];
    const set = wordSets[variant % wordSets.length];
    return {
      id: baseId, type, text: 'Complete the words in the passage. Type the missing letters of each incomplete word.', scoringWeight: weight,
      templateHtml: set.passage,
      blanks: set.blanks,
      audioScript: LISTENING_SCRIPTS.completeWords![variant % LISTENING_SCRIPTS.completeWords!.length],
      strategyTips: 'Work out the whole word from the sentence first, then type only the letters that are missing.',
      explanation: 'Each partial word is marked on its own, so a near miss for one word still leaves the others scoring.',
    };
  }

  if (type === 'multipleSelect') {
    return { id: baseId, type, text: `Which TWO statements about ${focus} are supported by the task material? (Select all that apply)`, scoringWeight: weight, options: [{ id: 'a', text: 'It is explicitly stated in the source' }, { id: 'b', text: 'It is supported by implied evidence' }, { id: 'c', text: 'It contradicts the source' }, { id: 'd', text: 'It is never mentioned' }], correctAnswers: ['a', 'b'], strategyTips: 'Select only what the material supports; partial credit is not awarded.', explanation: 'Exactly two options are supported, and both are required for the mark.' };
  }
  if (type === 'likert') {
    return { id: baseId, type, text: `How confident are you about ${focus}?`, scoringWeight: weight, options: [{ id: '1', text: 'Not confident' }, { id: '2', text: 'Slightly confident' }, { id: '3', text: 'Confident' }, { id: '4', text: 'Very confident' }], strategyTips: 'This is a survey item with no right answer.', explanation: 'Likert items feed confidence analytics rather than the score.' };
  }
  // multipleChoice and the bare listening type (which is rendered inside a listening section).
  if (kind === 'listening') {
    const entry = LISTENING_CHOICE_BANK[variant % LISTENING_CHOICE_BANK.length];
    // The correct option is always placed second, so the answer key stays readable.
    const options = [
      { id: 'a', text: entry.wrong[0] },
      { id: 'b', text: entry.correct },
      { id: 'c', text: entry.wrong[1] },
      { id: 'd', text: entry.wrong[2] },
    ];
    return {
      id: baseId, type, text: `According to the recording, what is said about ${entry.focus || focus}?`, scoringWeight: weight,
      options: options, correctAnswers: ['b'],
      // The recording plays this script, and it states the supported option.
      audioScript: entry.script,
      strategyTips: 'Eliminate distractors before selecting an answer; the recording states only one of the four.',
      explanation: `"${entry.correct}" is the statement the recording supports.`,
    };
  }
  return {
    id: baseId, type,
    text: `Choose the best answer concerning ${focus}.`,
    scoringWeight: weight,
    options: [{ id: 'a', text: 'A detail given in the source' }, { id: 'b', text: 'The main point of the source' }, { id: 'c', text: 'A plausible but unsupported idea' }, { id: 'd', text: 'The opposite of the source' }],
    correctAnswers: ['b'],
    strategyTips: 'Eliminate distractors before selecting an answer.',
    explanation: 'Option B is the best-supported answer.',
  };
};

/**
 * buildQuestion wraps the payload above and attaches the recording for a listening
 * item, so the audio and the marked answers cannot drift apart: the same (type,
 * index) pair selects both.
 */
/**
 * `variant` is the number of times this question type has ALREADY appeared in the
 * section. Selecting the stimulus by item position instead let the same note-completion
 * task (and the same recording) appear twice in a long section, so a thirteen-item
 * section contained two identical items; the section builder now passes the occurrence
 * ordinal.
 */
export const buildQuestion = (testId: string, sectionId: string, index: number, type: ExamQuestionType, kind: SectionKind = 'general', variant = 0) => {
  const built = buildQuestionPayload(testId, sectionId, index, type, kind, variant) as Record<string, unknown>;
  if (kind === 'listening') {
    const stems = SECTION_STEMS.listening;
    const focus = stems[(index - 1) % stems.length];
    built.audioText = (built.audioScript as string) || `This recording concerns ${focus}. Listen for the detail the question asks about, and note that only one of the options is stated in the recording.`;
    delete built.audioScript;
  }
  return built as any;
};

export const createMockExamForPreset = (preset: InternationalTestPreset, tutorEmail?: string): ExamJSONSchema => {
  if (preset.id === 'english-placement') {
    return {
      metadata: {
        title: 'English Placement Diagnostic Test',
        language: 'en-US',
        examFamily: preset.family,
        testInfo: preset.summary,
        examInstances: 1,
        adaptiveFlag: true,
        practiceModeFlag: false,
        timeLimitMinutes: preset.totalMinutes,
        timerMode: 'section',
        passingScorePercent: preset.passingScorePercent,
        tutorEmail: tutorEmail || 'placement@example.org',
        shuffleQuestions: true,
        taskBlueprints: DEFAULT_FRAMEWORKS.map((fw) => ({ ...fw, enabled: true })),
        voiceSettings: DEFAULT_VOICE_SETTINGS,
        environmentVariables: preset.environment,
        branding: DEFAULT_BRANDING,
        aiMode: 'mockTest',
        peerJsEnabled: false,
      },
      proctoring: {
        webcamRequired: true,
        maxWarnings: 3,
        tabSwitchPenalty: true,
        pauseTimerOnWarning: true,
        enforceFullscreen: true,
        reproctorOnResume: true,
        aiProctorLog: true,
        gazeTracking: true,
        keystrokeDynamics: true,
        waveformVisualization: true,
        silenceAlerts: true,
        fillerWordTracking: true,
      },
      sections: [
        {
          id: 'placement-grammar',
          title: 'Grammar and Vocabulary',
          description: 'Diagnostic coverage of tenses, verb forms, collocations, prepositions and lexical precision.',
          instructions: 'Choose the best answer, complete the blank, and identify vocabulary usage accurately.',
          timeLimitMinutes: 28,
          questions: [
            { id: 'pg1', type: 'multipleChoice', text: 'Choose the best option: She ____ to school every day.', scoringWeight: 5, options: [{ id: 'a', text: 'go' }, { id: 'b', text: 'goes' }, { id: 'c', text: 'going' }, { id: 'd', text: 'gone' }], correctAnswers: ['b'], strategyTips: 'Subject-verb agreement in the present simple.', explanation: 'Third-person singular takes -s.' },
            { id: 'pg2', type: 'fillInBlank', text: 'Complete the sentence: I have been working here ____ 2022.', scoringWeight: 5, correctAnswers: ['since'], strategyTips: 'Use since with a starting point in time.', explanation: 'Since + point in time is correct.' },
            { id: 'pg3', type: 'matching', text: 'Match the word to the closest synonym.', scoringWeight: 10, matchingPairs: [{ left: 'rapid', right: 'fast' }, { left: 'accurate', right: 'correct' }, { left: 'purchase', right: 'buy' }], strategyTips: 'Use meaning, not spelling similarity.', explanation: 'Synonym matching tests lexical knowledge.' },
            { id: 'pg4', type: 'ordering', text: 'Put the words in natural sentence order.', scoringWeight: 10, options: [{ id: 'o1', text: 'often' }, { id: 'o2', text: 'She' }, { id: 'o3', text: 'late' }, { id: 'o4', text: 'is' }], correctAnswers: ['o2', 'o4', 'o1', 'o3'], strategyTips: 'Place subject and verb before adverbs.', explanation: 'She is often late.' },
          ]
        },
        {
          id: 'placement-reading',
          title: 'Reading Comprehension',
          description: 'Main idea, detail scanning, inference, and reference tracking.',
          instructions: 'Read the passage carefully and answer the questions using evidence from the text.',
          timeLimitMinutes: 32,
          readingPassages: [{ id: 'rp1', title: 'Digital Learning Passage', content: 'Digital learning has changed how students access materials, collaborate, and receive feedback. While some learners prefer in-person discussion, others benefit from flexible online environments that can be revisited at any time.', vocabulary: [{ word: 'flexible', definition: 'able to change or be adjusted easily' }, { word: 'collaborate', definition: 'to work together with others' }] }],
          questions: [
            { id: 'pr1', type: 'multipleChoice', text: 'What is the main idea of the passage?', scoringWeight: 8, options: [{ id: 'a', text: 'Online learning is useless' }, { id: 'b', text: 'Digital learning changes access and feedback' }, { id: 'c', text: 'Students dislike all technology' }, { id: 'd', text: 'Only teachers benefit from feedback' }], correctAnswers: ['b'], strategyTips: 'Look for repeated ideas in the passage.', explanation: 'The passage describes broad benefits and changes.' },
            { id: 'pr2', type: 'multipleSelect', text: 'Which benefits are mentioned or implied? (Select all that apply)', scoringWeight: 8, options: [{ id: 'a', text: 'Flexible access' }, { id: 'b', text: 'Revisiting materials' }, { id: 'c', text: 'Less collaboration' }, { id: 'd', text: 'Instant feedback' }], correctAnswers: ['a', 'b', 'd'], strategyTips: 'Select only ideas supported by the text.', explanation: 'The passage explicitly or implicitly supports these benefits.' },
            { id: 'pr3', type: 'fillInBlank', text: 'The passage suggests that some learners benefit from environments that can be ____ at any time.', scoringWeight: 6, correctAnswers: ['revisited'], strategyTips: 'Use the exact wording from the passage.', explanation: 'Revisited matches the text.' },
            { id: 'pr4', type: 'matching', text: 'Match the idea to the passage reference.', scoringWeight: 10, matchingPairs: [{ left: 'Flexible online environments', right: 'Can be revisited at any time' }, { left: 'In-person discussion', right: 'Preferred by some learners' }, { left: 'Feedback', right: 'Received from the learning process' }], strategyTips: 'Match paraphrases, not identical wording.', explanation: 'Reading tests paraphrase recognition.' },
          ]
        },
        {
          id: 'placement-listening',
          title: 'Listening Comprehension',
          description: 'Monologue and dialogue audio with accent tags.',
          instructions: 'Listen carefully and answer the questions. Use the play button for browser read-aloud.',
          timeLimitMinutes: 30,
          listeningActivities: [{
            id: 'la1',
            title: 'Placement dialogue',
            mode: 'dialogue',
            accent: 'British',
            transcript: 'The training session has been moved to Wednesday because the hall is unavailable on Tuesday.',
            cast: { Tutor: 'male-gb', Student: 'female-au' },
            lines: [
              { speaker: 'Tutor', text: 'The hall is unavailable on Tuesday, so the session moves to Wednesday.', gender: 'male', accent: 'British', voiceLanguage: 'en-GB' },
              { speaker: 'Student', text: 'Thank you, I will update my calendar.', gender: 'female', accent: 'Australian', voiceLanguage: 'en-AU' },
            ],
          }],
          questions: [
            { id: 'pl1', type: 'multipleChoice', text: 'When is the training session now scheduled?', scoringWeight: 8, options: [{ id: 'a', text: 'Tuesday' }, { id: 'b', text: 'Wednesday' }, { id: 'c', text: 'Friday' }, { id: 'd', text: 'Saturday' }], correctAnswers: ['b'], audioText: 'The session has been moved to Wednesday.', voiceLanguage: 'en-GB', accent: 'British', strategyTips: 'Listen for the updated date.', explanation: 'Wednesday is explicitly stated.' },
            { id: 'pl2', type: 'fillInBlank', text: 'The hall is not available on ____.', scoringWeight: 6, correctAnswers: ['tuesday'], audioText: 'The hall is unavailable on Tuesday.', voiceLanguage: 'en-GB', accent: 'British', strategyTips: 'Write the day you hear.', explanation: 'Tuesday is the unavailable day.' },
            { id: 'pl3', type: 'ordering', text: 'Put the steps in the order they were mentioned.', scoringWeight: 8, options: [{ id: 'l1', text: 'Hall unavailable' }, { id: 'l2', text: 'Session moved' }, { id: 'l3', text: 'Student updates calendar' }], correctAnswers: ['l1', 'l2', 'l3'], strategyTips: 'Follow the sequence in the dialogue.', explanation: 'The conversation moves from problem to solution to action.' },
          ]
        },
        {
          id: 'placement-writing',
          title: 'Writing',
          description: 'Paragraph control, coherence, range, grammar and task response.',
          instructions: 'Write a clear, organised response with an introduction, body and conclusion.',
          timeLimitMinutes: 30,
          questions: [
            { id: 'pw1', type: 'writing', text: 'Write 180-220 words describing whether online learning or classroom learning is better for language study.', scoringWeight: 20, maxRecordingSeconds: 0, strategyTips: 'State your opinion, give two reasons, and support each with examples.', explanation: 'Writing is scored on task response, coherence, lexical range and accuracy.', feedbackDetail: 'In practice mode, detailed writing feedback should comment on cohesion, grammar range, vocabulary choice and punctuation.' },
            { id: 'pw2', type: 'essay', text: 'Write a short response about a time you learned something difficult. Describe the challenge and what helped you improve.', scoringWeight: 12, strategyTips: 'Use one clear example and strong sequencing words.', explanation: 'Narrative writing is evaluated for structure and expression.' },
          ]
        },
        {
          id: 'placement-speaking',
          title: 'Speaking',
          description: 'Pronunciation, fluency, vocabulary, and confidence under time pressure.',
          instructions: 'Speak naturally, keep your ideas moving, and avoid long pauses.',
          timeLimitMinutes: 30,
          questions: [
            { id: 'ps1', type: 'speaking', text: 'Describe your hometown and explain why you like or dislike living there.', scoringWeight: 15, maxRecordingSeconds: 90, strategyTips: 'Talk about place, people, activities and your personal opinion.', explanation: 'Speaking responses are judged on fluency, pronunciation, grammar and lexical variety.' },
            { id: 'ps2', type: 'speaking', text: 'Compare a book you read recently with a film you watched recently.', scoringWeight: 15, maxRecordingSeconds: 90, strategyTips: 'Use comparison language and give specific details.', explanation: 'Good answers compare two things clearly and accurately.' },
          ]
        }
      ],
      adaptiveLogic: {
        enabled: true,
        rulesDescription: 'Use lower difficulty items after weak diagnostic sections and higher difficulty items after strong ones.',
        difficultyProgression: [
          { thresholdCorrectPercent: 80, nextDifficulty: 'hard' },
          { thresholdCorrectPercent: 0, nextDifficulty: 'medium' },
        ],
      },
    };
  }

  const enabledFrameworks = DEFAULT_FRAMEWORKS.map((fw) => ({
    ...fw,
    enabled: preset.taskTypes.includes(fw.questionType),
    estimatedQuestions: preset.taskTypes.includes(fw.questionType) ? fw.estimatedQuestions : 0,
  }));

  const sectionKinds = preset.sections.map(classifySection);
  const hasListeningSection = sectionKinds.includes('listening');

  /**
   * Item count per section. The preset's own `estimatedQuestions` (IELTS 44, TOEFL
   * 54, ...) used to be ignored entirely: every section got a fixed five items
   * taken from the front of the task list, so a "44 item" IELTS form shipped six
   * items per section and nothing ever referenced the promised scale.
   */
  const perSection = Math.max(
    3,
    Math.round((preset.estimatedQuestions || preset.sections.length * 5) / Math.max(1, preset.sections.length)),
  );

  return {
    metadata: {
      title: `${preset.name} Complete Mock Test`,
      language: 'en-US',
      examFamily: preset.family,
      testInfo: preset.summary,
      examInstances: 1,
      adaptiveFlag: preset.adaptiveMode,
      practiceModeFlag: false,
      timeLimitMinutes: preset.totalMinutes,
      timerMode: preset.timerMode,
      passingScorePercent: preset.passingScorePercent,
      tutorEmail: tutorEmail || 'examiner@example.org',
      shuffleQuestions: true,
      taskBlueprints: enabledFrameworks,
      // Read aloud is on for any form with a listening section, otherwise the audio
      // player renders with nothing behind it.
      voiceSettings: { ...DEFAULT_VOICE_SETTINGS, enabled: hasListeningSection || DEFAULT_VOICE_SETTINGS.enabled },
      // Branding was only ever emitted by the English Placement branch, so the whole
      // Brand stage silently had no effect on the other twelve presets.
      branding: DEFAULT_BRANDING,
      environmentVariables: preset.environment,
    },
    proctoring: {
      webcamRequired: true,
      maxWarnings: 3,
      tabSwitchPenalty: true,
      pauseTimerOnWarning: true,
      enforceFullscreen: true,
      reproctorOnResume: true,
      aiProctorLog: true,
      gazeTracking: false,
      keystrokeDynamics: false,
      waveformVisualization: true,
      silenceAlerts: true,
      fillerWordTracking: false,
    },
    sections: preset.sections.map((sectionName, sectionIndex) => {
      const kind = sectionKinds[sectionIndex];
      /** Only types the preset offers AND that suit this section. */
      const suited = SECTION_TASK_PROFILE[kind].filter((type) => preset.taskTypes.includes(type));
      let sectionTypes = suited.length ? suited : preset.taskTypes;
      // PTE, for example, offers only two listening task types, so a seventeen-item
      // listening section used to be nine multiple-choice items and eight sentence
      // completions - the same stimulus nine times over. A section is widened to enough
      // distinct types that no single task type has to appear more often than the number
      // of authored variants available for it (MAX_VARIANTS_PER_TYPE).
      const MAX_VARIANTS_PER_TYPE = 5;
      const typesNeeded = Math.ceil(perSection / MAX_VARIANTS_PER_TYPE);
      if (sectionTypes.length < typesNeeded) {
        // Widening must not put an essay or a speaking prompt into a listening paper, so
        // the productive skills are held back for the single-skill sections.
        const receptive = kind === 'listening' || kind === 'reading' || kind === 'useOfEnglish';
        const blocked = receptive ? ['speaking', 'essay', 'writing', 'likert'] : [];
        const renderable = QUESTION_TYPE_KEYS.filter((t) => !UNRENDERABLE_QUESTION_TYPES.includes(t) && !blocked.includes(t));
        const widened = [
          ...sectionTypes,
          ...SECTION_TASK_PROFILE[kind].filter((t) => !sectionTypes.includes(t)),
          ...preset.taskTypes.filter((t) => !sectionTypes.includes(t)),
          ...renderable.filter((t) => !sectionTypes.includes(t)),
        ].filter((t) => !blocked.includes(t));
        sectionTypes = widened.slice(0, Math.max(typesNeeded, sectionTypes.length));
      }
      const isListening = kind === 'listening';
      const readsPassage = kind === 'reading' || kind === 'mixed';
      // Papers written for younger candidates (A2 Key, B1 Preliminary, the A1-C2
      // placement diagnostic) get the child speaker. Adult papers do not.
      const youngLearner = preset.id === 'ket' || preset.id === 'pet' || preset.id === 'english-placement';

      return {
        id: `${preset.id}-sec-${sectionIndex + 1}`,
        title: `${sectionName} - ${preset.name}`,
        description: `Authentic mock section aligned to ${preset.name} standards. Replace placeholders with up-to-date official-style content generated by AI.` ,
        instructions: `Complete the ${sectionName} tasks under official-style timing conditions. Use the audio player if a listening script is provided.`,
        timeLimitMinutes: Math.max(8, Math.round(preset.totalMinutes / preset.sections.length)),
        // The identical placeholder script used to be attached to EVERY section of every
        // form - including Reading, Writing and Speaking. Only a listening section gets
        // audio now, and only its questions carry an audio stem.
        // A genuine three-hander, cast across three personas. Every line used to carry the
        // same language hint and no voiceName, so all of it came out in one voice and a
        // dialogue read as a monologue.
        listeningActivities: isListening
          ? [{
              id: `${preset.id}-listen-${sectionIndex + 1}`,
              title: `${sectionName} audio script`,
              mode: 'dialogue',
              transcript: youngLearner
                ? 'A tutor, an international student and a younger pupil discuss an assessment deadline, the room booking, and the paperwork that still has to be handed in.'
                : 'A tutor, an international student and the course administrator discuss an assessment deadline, the room booking, and the paperwork that still has to be handed in.',
              voiceLanguage: 'en-GB',
              accent: 'British',
              cast: (youngLearner
                ? { Tutor: 'male-gb', Student: 'female-us', Pupil: 'child-gb' }
                : { Tutor: 'male-gb', Student: 'female-us', Administrator: 'male-ie' }) as Record<string, string>,
              lines: youngLearner
                ? [
                    { speaker: 'Tutor', gender: 'male', accent: 'British', voiceLanguage: 'en-GB', text: 'Good morning. Today we need to confirm the updated assessment deadline and the final submission rules.' },
                    { speaker: 'Student', gender: 'female', accent: 'American', voiceLanguage: 'en-US', text: 'Could you clarify whether the deadline has changed for everyone, or only for our group?' },
                    { speaker: 'Tutor', gender: 'male', accent: 'British', voiceLanguage: 'en-GB', text: 'It applies to everyone. The online portal will accept files until Friday evening.' },
                    { speaker: 'Pupil', gender: 'child', accent: 'British', voiceLanguage: 'en-GB', text: 'Do I have to hand in the paper form as well, or is the online copy enough?' },
                    { speaker: 'Student', gender: 'female', accent: 'American', voiceLanguage: 'en-US', text: 'I will upload mine tonight and keep a copy of the receipt.' },
                  ]
                : [
                    { speaker: 'Tutor', gender: 'male', accent: 'British', voiceLanguage: 'en-GB', text: 'Good morning. Today we need to confirm the updated assessment deadline and the final submission rules.' },
                    { speaker: 'Student', gender: 'female', accent: 'American', voiceLanguage: 'en-US', text: 'Could you clarify whether the deadline has changed for everyone, or only for our group?' },
                    { speaker: 'Tutor', gender: 'male', accent: 'British', voiceLanguage: 'en-GB', text: 'It applies to everyone. The online portal will accept files until Friday evening.' },
                    { speaker: 'Administrator', gender: 'male', accent: 'Irish', voiceLanguage: 'en-IE', text: 'And the paper form still has to be handed in as well. An online copy on its own is not enough.' },
                    { speaker: 'Student', gender: 'female', accent: 'American', voiceLanguage: 'en-US', text: 'I will upload mine tonight and keep a copy of the receipt.' },
                  ],
            }]
          : [],
        // Reading and combined reading/writing sections now ship the text their questions
        // refer to. Every generated form used to ask "according to the passage" with no
        // passage anywhere on the page.
        readingPassages: readsPassage
          ? [{
              id: `${preset.id}-passage-${sectionIndex + 1}`,
              ...READING_PASSAGE_BANK[sectionIndex % READING_PASSAGE_BANK.length],
            }]
          : [],
        questions: Array.from({ length: perSection }, (_, i) => {
          const type = sectionTypes[i % sectionTypes.length];
          // How many times this type has already been used in this section, which is what
          // picks a distinct variant of the stimulus rather than repeating the first one.
          const occurrence = Math.floor(i / sectionTypes.length);
          const built = buildQuestion(preset.id, `s${sectionIndex + 1}`, i + 1, type, kind, occurrence) as Record<string, unknown>;
          if (isListening || type === 'listening') {
            // The audio stem is what makes a choice or completion item a listening item.
            // The persona alternates so the stems do not all sound like one narrator, but
            // the child persona is reserved for papers written for younger candidates -
            // an IELTS or OET listening paper read by a child is not a plausible recording.
            const stemPersonas = youngLearner
              ? [
                  { profile: 'male-gb', accent: 'British', voiceLanguage: 'en-GB', gender: 'male' },
                  { profile: 'female-us', accent: 'American', voiceLanguage: 'en-US', gender: 'female' },
                  { profile: 'child-gb', accent: 'British', voiceLanguage: 'en-GB', gender: 'child' },
                ]
              : [
                  { profile: 'male-gb', accent: 'British', voiceLanguage: 'en-GB', gender: 'male' },
                  { profile: 'female-us', accent: 'American', voiceLanguage: 'en-US', gender: 'female' },
                  { profile: 'female-gb', accent: 'British', voiceLanguage: 'en-GB', gender: 'female' },
                ];
            const persona = stemPersonas[i % stemPersonas.length];
            // audioText is already attached by buildQuestion, where the (type, index)
            // pair selects a script that contains this item's answers. Overwriting it
            // here with one shared sentence is what made every item play the same audio.
            built.voiceLanguage = persona.voiceLanguage;
            built.accent = persona.accent;
            built.profile = persona.profile;
            built.gender = persona.gender;
          }
          return built as any;
        }),
      };
    }),
    adaptiveLogic: {
      enabled: preset.adaptiveMode,
      rulesDescription: preset.adaptiveMode ? 'Increase difficulty after strong accuracy and supply easier support questions after weak accuracy.' : 'No adaptive routing for this official-style mock.',
      difficultyProgression: [
        { thresholdCorrectPercent: 75, nextDifficulty: 'hard' },
        { thresholdCorrectPercent: 0, nextDifficulty: 'medium' },
      ],
    },
  };
};
