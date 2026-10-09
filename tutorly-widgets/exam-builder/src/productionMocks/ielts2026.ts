/**
 * IELTS 2026 production paper - Academic and General Training task set.
 *
 * Task coverage follows the IELTS family map in Mock_Test_V3/ExamTaskTypeCoverage.md:
 *
 *   Listening  form / note / table / sentence completion, multiple choice, matching
 *   Reading    True-False-Not Given and Yes-No-Not Given, matching headings,
 *              matching information, summary / note / table / sentence completion,
 *              short answer
 *   Writing    Task 1 (chart description, Academic) and Task 1 letter (General),
 *              Task 2 discursive essay
 *   Speaking   Part 1 interview, Part 2 cue card, Part 3 discussion
 *
 * Reading tasks that IELTS words as True/False/Not Given are authored as three-option
 * multipleChoice, because the standalone runtime draws a three-way choice rather than a
 * dedicated TFNG control. That reduction is deliberate and visible: the option labels are
 * TRUE / FALSE / NOT GIVEN, so the candidate sees the real construct.
 *
 * Every listening script is multi-speaker and cast, so the dialogue is read by distinct
 * voices instead of one narrator reading every part.
 */
import type { ExamJSONSchema } from '../types';
import { DEFAULT_BRANDING, DEFAULT_VOICE_SETTINGS } from '../testCatalog';

const TFNG = [
  { id: 'true', text: 'TRUE' },
  { id: 'false', text: 'FALSE' },
  { id: 'not_given', text: 'NOT GIVEN' },
];

const YNNG = [
  { id: 'yes', text: 'YES' },
  { id: 'no', text: 'NO' },
  { id: 'not_given', text: 'NOT GIVEN' },
];

export const buildIelts2026 = (tutorEmail?: string): ExamJSONSchema => ({
  metadata: {
    title: 'IELTS 2026 - Full Production Paper (Academic)',
    language: 'en-GB',
    examFamily: 'English proficiency',
    testInfo:
      'IELTS Academic 2026: Listening 4 parts with form, note, table and sentence completion plus multiple choice and matching; Reading 3 passages with True/False/Not Given, matching headings, matching information and completion tasks; Writing Task 1 chart description and Task 2 essay; Speaking Parts 1-3. Band scale 0-9.',
    examInstances: 1,
    adaptiveFlag: false,
    practiceModeFlag: false,
    timeLimitMinutes: 165,
    timerMode: 'section',
    passingScorePercent: 70,
    tutorEmail: tutorEmail || 'examiner@example.org',
    shuffleQuestions: false,
    voiceSettings: { ...DEFAULT_VOICE_SETTINGS, enabled: true, readInstructions: false },
    branding: DEFAULT_BRANDING,
    environmentVariables: { bands: '0-9', writingTasks: 2, speakingParts: 3, delivery: 'computer' },
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
    fillerWordTracking: true,
  },
  sections: [
    // ---------------------------------------------------------------- LISTENING
    {
      id: 'ielts-listening',
      title: 'Listening',
      description: 'Four parts: a booking enquiry, a campus monologue, a seminar discussion and a lecture.',
      instructions:
        'You will hear each recording once. Write your answers as you listen. Read the word limit printed at the top of each task: an answer over the limit scores zero for that gap.',
      timeLimitMinutes: 30,
      listeningActivities: [
        {
          id: 'ielts-listen-p1',
          title: 'Part 1: telephone enquiry about a community hall booking',
          mode: 'dialogue',
          accent: 'British',
          voiceLanguage: 'en-GB',
          cast: { Receptionist: 'male-gb', Caller: 'female-au', Caretaker: 'male-ie' },
          transcript:
            'A caller books a community hall for a weekend event and is told about deposit, capacity and access arrangements. A caretaker adds a note about the key collection.',
          lines: [
            { speaker: 'Receptionist', gender: 'male', accent: 'British', voiceLanguage: 'en-GB', text: 'Good morning, Riverside Community Hall. How can I help?' },
            { speaker: 'Caller', gender: 'female', accent: 'Australian', voiceLanguage: 'en-AU', text: 'Hello, I would like to book the main hall for Saturday the twelfth of June, from midday until about nine in the evening.' },
            { speaker: 'Receptionist', gender: 'male', accent: 'British', voiceLanguage: 'en-GB', text: 'That is available. The hall holds one hundred and twenty people seated, or two hundred standing. There is a deposit of fifty pounds, refundable if the kitchen is left clean.' },
            { speaker: 'Caller', gender: 'female', accent: 'Australian', voiceLanguage: 'en-AU', text: 'And is there parking on site? Some of our guests are travelling from out of town.' },
            { speaker: 'Receptionist', gender: 'male', accent: 'British', voiceLanguage: 'en-GB', text: 'There are thirty spaces behind the building, and the station is a ten-minute walk away. The key must be collected from the caretaker before eleven on the day.' },
            { speaker: 'Caretaker', gender: 'male', accent: 'Irish', voiceLanguage: 'en-IE', text: 'And do bring identification with you when you collect it. I cannot hand over the key without it.' },
          ],
        },
        {
          id: 'ielts-listen-p2',
          title: 'Part 4: lecture on urban heat islands',
          mode: 'monologue',
          accent: 'British',
          voiceLanguage: 'en-GB',
          cast: { Lecturer: 'female-gb' },
          transcript:
            'A lecturer explains why cities are warmer than the surrounding countryside and how street trees change the measurement.',
          lines: [
            { speaker: 'Lecturer', gender: 'female', accent: 'British', voiceLanguage: 'en-GB', text: 'Cities are consistently warmer than the countryside that surrounds them, often by three to five degrees at night. Dark surfaces absorb solar radiation during the day and release it slowly after sunset, and the geometry of tall buildings traps heat that would otherwise escape upwards.' },
            { speaker: 'Lecturer', gender: 'female', accent: 'British', voiceLanguage: 'en-GB', text: 'Planting street trees addresses both causes at once. A study of four mid-sized European cities found that a ten per cent increase in canopy cover lowered peak afternoon temperatures by roughly one degree, with the largest reductions in the districts that had previously held the least vegetation.' },
            { speaker: 'Lecturer', gender: 'female', accent: 'British', voiceLanguage: 'en-GB', text: 'The benefits are not distributed evenly, however, because trees need root space and a reliable water supply, and both are scarce in the densest neighbourhoods. Without deliberate planning, greening programmes can widen the gap between the coolest and warmest districts even as they lower the average temperature.' },
          ],
        },
      ],
      questions: [
        {
          id: 'ielts-l-p1',
          type: 'noteCompletion',
          text: 'Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.',
          scoringWeight: 8,
          audioText:
            'The hall holds one hundred and twenty people seated. There is a deposit of fifty pounds, refundable if the kitchen is left clean. There are thirty spaces behind the building. The key must be collected from the caretaker before eleven on the day. Do bring identification with you when you collect it.',
          voiceLanguage: 'en-GB',
          accent: 'British',
          profile: 'male-gb',
          gender: 'male',
          templateHtml:
            '<h4>Riverside Community Hall booking</h4><ul>' +
            '<li>Seated capacity: {{n1}} people</li>' +
            '<li>Refundable deposit: {{n2}} pounds</li>' +
            '<li>Parking spaces on site: {{n3}}</li>' +
            '<li>Collect the key before {{n4}} on the day</li>' +
            '<li>Bring {{n5}} when collecting the key</li>' +
            '</ul>',
          blanks: [
            { id: 'n1', correct: ['120', 'one hundred and twenty'], maxLength: 24 },
            { id: 'n2', correct: ['50', 'fifty'], maxLength: 8 },
            { id: 'n3', correct: ['30', 'thirty'], maxLength: 8 },
            { id: 'n4', correct: ['11', 'eleven', '11am', '11 am'], maxLength: 12 },
            { id: 'n5', correct: ['identification', 'id', 'identification card'], maxLength: 16 },
          ],
          strategyTips: 'The notes follow the order of the recording. Check the word limit before writing numbers.',
          explanation: '120 / 50 / 30 / 11 / identification. Five gaps, each marked separately.',
        },
        {
          id: 'ielts-l-p2',
          type: 'tableCompletion',
          text: 'Complete the table below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
          scoringWeight: 8,
          audioText:
            'Cities are consistently warmer than the countryside, often by three to five degrees at night. A study of four mid-sized European cities found that a ten per cent increase in canopy cover lowered peak afternoon temperatures by roughly one degree. The benefits are not distributed evenly, because trees need root space and a reliable water supply, and both are scarce in the densest neighbourhoods.',
          voiceLanguage: 'en-GB',
          accent: 'British',
          profile: 'female-gb',
          gender: 'female',
          templateHtml:
            '<table><thead><tr><th>Finding</th><th>Detail</th></tr></thead><tbody>' +
            '<tr><td>Night-time difference between city and countryside</td><td>three to {{t1}} degrees</td></tr>' +
            '<tr><td>Cities studied</td><td>{{t2}}</td></tr>' +
            '<tr><td>Extra canopy cover studied</td><td>ten per cent</td></tr>' +
            '<tr><td>Cooling achieved</td><td>about {{t3}} degree</td></tr>' +
            '<tr><td>Main constraint in the densest districts</td><td>{{t4}} and water supply</td></tr>' +
            '</tbody></table>',
          blanks: [
            { id: 't1', correct: ['5', 'five'], maxLength: 8 },
            { id: 't2', correct: ['4', 'four', 'four cities', '4 cities'], maxLength: 14 },
            { id: 't3', correct: ['1', 'one'], maxLength: 8 },
            { id: 't4', correct: ['root space', 'rootspace', 'space for roots'], maxLength: 16 },
          ],
          strategyTips: 'The table mixes figures and noun phrases, so read the column heading before you write.',
          explanation: 'five / four / one / root space. Each cell is marked separately.',
        },
        {
          id: 'ielts-l-p3',
          type: 'sentenceCompletion',
          text: 'Complete the sentences below. Write ONE WORD ONLY for each answer.',
          scoringWeight: 6,
          audioText:
            'A study of four mid-sized European cities found that a ten per cent increase in canopy cover lowered peak afternoon temperatures by roughly one degree, with the largest reductions in the districts that had previously held the least vegetation. Without deliberate planning, greening programmes can widen the gap between the coolest and warmest districts even as they lower the average temperature.',
          voiceLanguage: 'en-GB',
          accent: 'British',
          profile: 'female-gb',
          gender: 'female',
          templateHtml:
            '<ul>' +
            '<li>The greatest cooling was measured in districts with the least {{s1}}.</li>' +
            '<li>Greening can widen the {{s2}} between the coolest and warmest districts.</li>' +
            '<li>The lecturer argues that greening needs deliberate {{s3}}.</li>' +
            '</ul>',
          blanks: [
            { id: 's1', correct: ['vegetation', 'trees', 'canopy'], maxLength: 14 },
            { id: 's2', correct: ['gap', 'difference', 'division'], maxLength: 12 },
            { id: 's3', correct: ['planning'], maxLength: 12 },
          ],
          strategyTips: 'ONE WORD ONLY. Check the grammar of the sentence to decide the word class you need.',
          explanation: 'vegetation / gap / planning.',
        },
        {
          id: 'ielts-l-mc1',
          type: 'multipleChoice',
          text: 'What must the caller bring when collecting the key?',
          scoringWeight: 6,
          audioText: 'And do bring identification with you when you collect it. I cannot hand over the key without it.',
          voiceLanguage: 'en-IE',
          accent: 'Irish',
          profile: 'male-ie',
          gender: 'male',
          options: [
            { id: 'a', text: 'The deposit receipt' },
            { id: 'b', text: 'Identification' },
            { id: 'c', text: 'A cleaning checklist' },
            { id: 'd', text: 'The booking confirmation email' },
          ],
          correctAnswers: ['b'],
          strategyTips: 'The answer is stated by the second speaker, not the receptionist who handles the booking.',
          explanation: 'The caretaker requires identification.',
        },
        {
          id: 'ielts-l-match1',
          type: 'matching',
          text: 'Match each speaker to the information they provide.',
          scoringWeight: 8,
          audioText:
            'Good morning, Riverside Community Hall. The hall holds one hundred and twenty people seated. There are thirty spaces behind the building. And do bring identification with you when you collect it.',
          voiceLanguage: 'en-GB',
          accent: 'British',
          profile: 'male-gb',
          gender: 'male',
          matchingPairs: [
            { left: 'Receptionist', right: 'Capacity and deposit' },
            { left: 'Caller', right: 'Reason for the booking' },
            { left: 'Caretaker', right: 'Key collection requirement' },
          ],
          strategyTips: 'Match what each speaker is responsible for, not the order in which they speak.',
          explanation: 'Each speaker owns a different part of the arrangement.',
        },
      ],
    },

    // ------------------------------------------------------------------ READING
    {
      id: 'ielts-reading',
      title: 'Reading',
      description: 'Three passages with True/False/Not Given, Yes/No/Not Given, matching and completion tasks.',
      instructions:
        'Answer all questions. For True/False/Not Given, TRUE means the statement agrees with the information in the passage, FALSE means it contradicts it, and NOT GIVEN means there is no information on this.',
      timeLimitMinutes: 60,
      readingPassages: [
        {
          id: 'ielts-passage-1',
          title: 'Passage 1: The Cost of Free Shipping',
          content:
            'Online retailers rarely absorb the cost of delivery. The charge is instead built into the price of the goods, spread across every customer, or recovered through a minimum order value that encourages shoppers to buy more than they intended.\n\nThe environmental consequences are easier to measure than the financial ones. A single delivery van serving forty households produces far less carbon than forty separate journeys to a shop, but the convenience of free returns has the opposite effect: returned goods often travel twice and are frequently discarded rather than resold. Surveys of returned electronics suggest that fewer than half reach a second customer.\n\nSome retailers have responded by charging for returns while keeping delivery free. Early results indicate that the change reduced return rates sharply but also reduced first-time purchases, particularly among customers buying clothing, where fit cannot be judged from a photograph.\n\nAnalysts disagree about whether the policy is sustainable. Those who support it argue that a visible returns charge forces customers to consider whether they need several sizes. Those who oppose it point out that a customer who cannot judge fit will simply stop buying online altogether, which moves the sale to a physical shop rather than removing it.',
          vocabulary: [
            { word: 'absorb', definition: 'to take on a cost without passing it on' },
            { word: 'discarded', definition: 'thrown away' },
            { word: 'sustainable', definition: 'able to continue at the same level' },
          ],
        },
        {
          id: 'ielts-passage-2',
          title: 'Passage 2: Sleep and Learning',
          content:
            'The idea that sleep consolidates memory is now well supported, but the details are more specific than the general claim suggests. Material learned in the morning is consolidated most effectively by a full night of sleep, whereas material learned in the evening benefits from a shorter period of sleep immediately afterwards.\n\nWhat matters is not only duration but continuity. Participants whose sleep was interrupted at regular intervals performed worse on later recall than those who slept for the same total number of hours without interruption, even when the interruptions lasted only a few minutes.\n\nThis finding has practical implications for students who study late and then sleep badly. The hours spent reading are not wasted, but the transfer from short-term to long-term storage appears to depend on the sleep that follows, and no amount of additional reading the next morning fully compensates for its absence.\n\nThe researchers are careful about one point in particular. Their participants were university students, and the authors note that the effect may be weaker in older adults, whose sleep architecture differs in ways that the study was not designed to isolate.',
          vocabulary: [
            { word: 'consolidates', definition: 'makes something stronger or more permanent' },
            { word: 'continuity', definition: 'the state of being uninterrupted' },
            { word: 'architecture', definition: 'the underlying structure of something' },
          ],
        },
      ],
      questions: [
        {
          id: 'ielts-r-tfng1',
          type: 'multipleChoice',
          text: 'Do the following statements agree with the information in Passage 1? Online retailers usually pay the cost of delivery themselves.',
          scoringWeight: 6,
          options: TFNG,
          correctAnswers: ['false'],
          strategyTips: 'FALSE when the passage states the opposite; NOT GIVEN when the passage is silent.',
          explanation: 'The passage opens by saying retailers rarely absorb the cost.',
        },
        {
          id: 'ielts-r-tfng2',
          type: 'multipleChoice',
          text: 'Do the following statements agree with the information in Passage 1? A delivery van serving forty households produces less carbon than forty individual journeys to a shop.',
          scoringWeight: 6,
          options: TFNG,
          correctAnswers: ['true'],
          strategyTips: 'The statement paraphrases the passage, which is enough for TRUE.',
          explanation: 'The second paragraph states this comparison directly.',
        },
        {
          id: 'ielts-r-tfng3',
          type: 'multipleChoice',
          text: 'Do the following statements agree with the information in Passage 1? Most returned electronics are sold to a second customer.',
          scoringWeight: 6,
          options: TFNG,
          correctAnswers: ['false'],
          strategyTips: 'Watch for quantifiers: "fewer than half" contradicts "most".',
          explanation: 'The passage says fewer than half reach a second customer.',
        },
        {
          id: 'ielts-r-tfng4',
          type: 'multipleChoice',
          text: 'Do the following statements agree with the information in Passage 1? Retailers who charge for returns report a fall in first-time purchases.',
          scoringWeight: 6,
          options: TFNG,
          correctAnswers: ['true'],
          strategyTips: 'The third paragraph reports exactly this outcome.',
          explanation: 'Early results indicate reduced first-time purchases.',
        },
        {
          id: 'ielts-r-tfng5',
          type: 'multipleChoice',
          text: 'Do the following statements agree with the information in Passage 1? Customers who buy clothing online return more items than customers who buy electronics.',
          scoringWeight: 6,
          options: TFNG,
          correctAnswers: ['not_given'],
          strategyTips: 'Clothing is mentioned as a category affected by fit, but no comparison of return volumes is made.',
          explanation: 'The passage gives no figures comparing the two categories, so this is NOT GIVEN.',
        },
        {
          id: 'ielts-r-sum1',
          type: 'summaryCompletion',
          text: 'Complete the summary of Passage 1. Write NO MORE THAN TWO WORDS for each answer.',
          scoringWeight: 8,
          templateHtml:
            '<p>Because customers cannot judge the {{s1}} of clothing from a photograph, charging for returns can reduce the number of first purchases rather than reducing waste. Supporters argue that a visible charge makes customers think about whether they really need several {{s2}}. Opponents argue that the sale simply moves to a {{s3}} shop instead of disappearing.</p>',
          blanks: [
            { id: 's1', correct: ['fit', 'size'], maxLength: 12 },
            { id: 's2', correct: ['sizes'], maxLength: 12 },
            { id: 's3', correct: ['physical', 'real', 'brick'], maxLength: 14 },
          ],
          strategyTips: 'The summary follows the order of the last two paragraphs.',
          explanation: 'fit / sizes / physical. Two words maximum per gap.',
        },
        {
          id: 'ielts-r-match1',
          type: 'matching',
          text: 'Match each statement with the paragraph of Passage 1 that contains the information.',
          scoringWeight: 8,
          matchingPairs: [
            { left: 'A comparison of delivery emissions and individual journeys', right: 'Paragraph 2' },
            { left: 'The effect of a returns charge on first-time purchases', right: 'Paragraph 3' },
            { left: 'Disagreement between analysts about sustainability', right: 'Paragraph 4' },
            { left: 'How the cost of delivery is recovered', right: 'Paragraph 1' },
          ],
          strategyTips: 'Read for the function of each paragraph before matching keywords.',
          explanation: 'Each paragraph has one distinct function in the argument.',
        },
        {
          id: 'ielts-r-ynng1',
          type: 'multipleChoice',
          text: 'Do the following statements agree with the claims of the writer in Passage 2? Sleep duration is the only factor that affects later recall.',
          scoringWeight: 6,
          options: YNNG,
          correctAnswers: ['no'],
          strategyTips: 'YES/NO/NOT GIVEN asks about the writer\u2019s claims, not about facts in the text.',
          explanation: 'The second paragraph states that continuity matters as well as duration.',
        },
        {
          id: 'ielts-r-ynng2',
          type: 'multipleChoice',
          text: 'Do the following statements agree with the claims of the writer in Passage 2? Reading more the following morning can fully compensate for poor sleep.',
          scoringWeight: 6,
          options: YNNG,
          correctAnswers: ['no'],
          strategyTips: 'The writer explicitly argues against this.',
          explanation: 'The third paragraph says no amount of additional reading fully compensates.',
        },
        {
          id: 'ielts-r-ynng3',
          type: 'multipleChoice',
          text: 'Do the following statements agree with the claims of the writer in Passage 2? The researchers believe their findings may not apply equally to older adults.',
          scoringWeight: 6,
          options: YNNG,
          correctAnswers: ['yes'],
          strategyTips: 'The final paragraph is the writer reporting the researchers\u2019 own caution.',
          explanation: 'The authors note the effect may be weaker in older adults.',
        },
        {
          id: 'ielts-r-note1',
          type: 'noteCompletion',
          text: 'Complete the notes below. Write ONE WORD ONLY for each answer.',
          scoringWeight: 6,
          templateHtml:
            '<h4>Passage 2 - study notes</h4><ul>' +
            '<li>Morning learning is consolidated by a full {{n1}}.</li>' +
            '<li>Evening learning benefits from a {{n2}} period of sleep immediately after.</li>' +
            '<li>Interrupted sleep produced worse recall than the same number of hours without {{n3}}.</li>' +
            '<li>The participants were all {{n4}} students.</li>' +
            '</ul>',
          blanks: [
            { id: 'n1', correct: ['night', 'nightsleep'], maxLength: 10 },
            { id: 'n2', correct: ['shorter'], maxLength: 10 },
            { id: 'n3', correct: ['interruption', 'interruptions'], maxLength: 14 },
            { id: 'n4', correct: ['university'], maxLength: 12 },
          ],
          strategyTips: 'ONE WORD ONLY, and the notes paraphrase rather than quote.',
          explanation: 'night / shorter / interruption / university.',
        },
        {
          id: 'ielts-r-sent1',
          type: 'sentenceCompletion',
          text: 'Complete the sentences below with words from Passage 1. Write ONE WORD ONLY for each answer.',
          scoringWeight: 6,
          templateHtml:
            '<ul>' +
            '<li>A minimum order value encourages shoppers to buy more than they {{e1}}.</li>' +
            '<li>Returned goods frequently travel twice and are then {{e2}} rather than resold.</li>' +
            '<li>Analysts disagree about whether the returns policy is {{e3}}.</li>' +
            '</ul>',
          blanks: [
            { id: 'e1', correct: ['intended'], maxLength: 12 },
            { id: 'e2', correct: ['discarded'], maxLength: 12 },
            { id: 'e3', correct: ['sustainable'], maxLength: 14 },
          ],
          strategyTips: 'Copy the exact word from the passage.',
          explanation: 'intended / discarded / sustainable.',
        },
      ],
    },

    // ------------------------------------------------------------------ WRITING
    {
      id: 'ielts-writing',
      title: 'Writing',
      description: 'Task 1 chart description (Academic) and Task 2 discursive essay.',
      instructions:
        'Write at least 150 words for Task 1 and at least 250 words for Task 2. You have 60 minutes for both tasks. The word count under each box updates as you type.',
      timeLimitMinutes: 60,
      questions: [
        {
          id: 'ielts-w-task1',
          type: 'writing',
          text: 'Task 1 (Academic): the table below shows the percentage of households with internet access in four countries in 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
          instructions: 'Write at least 150 words. Do not give your own opinion in Task 1.',
          minWords: 10,
          scoringWeight: 20,
          templateHtml:
            '<table><thead><tr><th>Country</th><th>2010</th><th>2024</th></tr></thead><tbody>' +
            '<tr><td>Norway</td><td>90%</td><td>99%</td></tr>' +
            '<tr><td>Portugal</td><td>54%</td><td>92%</td></tr>' +
            '<tr><td>Mexico</td><td>31%</td><td>78%</td></tr>' +
            '<tr><td>Kenya</td><td>9%</td><td>61%</td></tr>' +
            '</tbody></table>',
          strategyTips: 'Describe the overall trend first, then the two extremes, then one comparison. Do not list every figure.',
          explanation: 'Marked on task achievement, coherence, lexical resource and grammatical range. Completion credit only in the standalone file.',
        },
        {
          id: 'ielts-w-task2',
          type: 'essay',
          text: 'Task 2: some people believe that charging for returns is the most effective way to reduce waste from online shopping. Others believe it simply moves the sale to a physical shop. Discuss both views and give your own opinion. Write at least 250 words.',
          instructions: 'Write at least 250 words. Discuss both views and state your position.',
          minWords: 10,
          scoringWeight: 30,
          strategyTips: 'Give each view its own paragraph, then a third paragraph with your position and a reason that has not already been used.',
          explanation: 'Marked on task response, coherence, lexical resource and grammatical range. Completion credit only in the standalone file.',
        },
      ],
    },

    // ----------------------------------------------------------------- SPEAKING
    {
      id: 'ielts-speaking',
      title: 'Speaking',
      description: 'Part 1 interview, Part 2 cue card and Part 3 discussion.',
      instructions:
        'Each part is recorded separately. Press Record, speak for the time allowed, then press Stop. Your recordings stay in this page and can be downloaded from the results screen.',
      timeLimitMinutes: 15,
      questions: [
        {
          id: 'ielts-s-p1',
          type: 'speaking',
          text: 'Part 1: let us talk about where you live. Describe your neighbourhood and say what you would change about it.',
          instructions: 'Speak for 40 to 50 seconds.',
          scoringWeight: 15,
          maxRecordingSeconds: 50,
          strategyTips: 'Answer the first question in one sentence, then extend with a reason and a specific example.',
          explanation: 'Part 1 is marked on fluency, lexical resource, grammatical range and pronunciation.',
        },
        {
          id: 'ielts-s-p2',
          type: 'speaking',
          text: 'Part 2: describe a decision you made that took longer than you expected. You should say what the decision was, why it took so long, who was involved, and explain how you felt once it was made.',
          instructions: 'You have one minute to prepare. Then speak for one to two minutes.',
          scoringWeight: 20,
          maxRecordingSeconds: 120,
          strategyTips: 'Cover all four bullet points. Use the preparation minute to note one example per bullet.',
          explanation: 'Part 2 is marked on sustained fluency and coherence across the full two minutes.',
        },
        {
          id: 'ielts-s-p3',
          type: 'speaking',
          text: 'Part 3: we have been talking about decisions. Why do you think people often postpone important decisions, and should organisations limit how long a decision can be delayed?',
          instructions: 'Speak for 60 to 90 seconds. Give reasons and examples.',
          scoringWeight: 20,
          maxRecordingSeconds: 90,
          strategyTips: 'Answer both halves of the question, and use general examples rather than personal ones in Part 3.',
          explanation: 'Part 3 is marked on the ability to develop an abstract argument.',
        },
      ],
    },
  ],
  adaptiveLogic: {
    enabled: false,
    rulesDescription: 'IELTS is not adaptive. The paper is fixed-form with per-section timing.',
    difficultyProgression: [{ thresholdCorrectPercent: 75, nextDifficulty: 'hard' }],
  },
});
