/**
 * TOEFL iBT production paper - post-21 January 2026 format.
 *
 * The task set here is the twelve public categories the January 2026 revision uses
 * (see Mock-Test/TaskTypeCoverageAudit.md, item 8):
 *
 *   Reading   Complete the Words | Read in Daily Life | Read an Academic Passage
 *   Listening Listen and Choose a Response | Listen to a Conversation |
 *             Listen to an Announcement | Listen to an Academic Talk
 *   Speaking  Listen and Repeat | Take an Interview
 *   Writing   Build a Sentence | Write an Email | Write for an Academic Discussion
 *
 * Everything is authored content, not placeholder text, so this paper doubles as the
 * regression fixture for the completion family: Complete the Words is the task that
 * exposes a missing stimulus fastest, because the partial words ARE the question.
 */
import type { ExamJSONSchema } from '../types';
import { DEFAULT_BRANDING, DEFAULT_VOICE_SETTINGS } from '../testCatalog';

export const buildToefl2026 = (tutorEmail?: string): ExamJSONSchema => ({
  metadata: {
    title: 'TOEFL iBT 2026 - Full Production Paper',
    language: 'en-US',
    examFamily: 'English proficiency',
    testInfo:
      'Post-21 January 2026 TOEFL iBT: Complete the Words, Read in Daily Life, Read an Academic Passage, Listen and Choose a Response, Listen to a Conversation, Listen to an Announcement, Listen to an Academic Talk, Listen and Repeat, Take an Interview, Build a Sentence, Write an Email, Academic Discussion. Score scale 0-120.',
    examInstances: 1,
    adaptiveFlag: false,
    practiceModeFlag: false,
    timeLimitMinutes: 116,
    timerMode: 'section',
    passingScorePercent: 72,
    tutorEmail: tutorEmail || 'examiner@example.org',
    shuffleQuestions: false,
    voiceSettings: { ...DEFAULT_VOICE_SETTINGS, enabled: true, readInstructions: false },
    branding: DEFAULT_BRANDING,
    environmentVariables: { scoreScale: '0-120', formatVersion: '2026-01-21', noteTaking: true },
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
    // ------------------------------------------------------------------ READING
    {
      id: 'toefl-reading',
      title: 'Reading',
      description: 'Complete the Words, Read in Daily Life and Read an Academic Passage.',
      instructions:
        'In Complete the Words you have a short passage with letters missing from some words. Type the missing letters. In the other reading tasks choose the best answer for each question. You may take notes.',
      timeLimitMinutes: 35,
      readingPassages: [
        {
          id: 'toefl-passage-1',
          title: 'Read an Academic Passage: Urban Heat Islands',
          content:
            'Cities are consistently warmer than the countryside that surrounds them, often by three to five degrees at night. The effect is produced by dark surfaces, which absorb solar radiation during the day and release it slowly after sunset, and by the geometry of tall buildings, which trap heat that would otherwise escape upwards.\n\nPlanting street trees addresses both causes at once. The canopy intercepts sunlight before it reaches the pavement, and the leaves cool the surrounding air as water evaporates from their surfaces. A study of four mid-sized European cities found that a ten per cent increase in canopy cover lowered peak afternoon temperatures by roughly one degree, with the largest reductions recorded in districts that had previously held the least vegetation.\n\nThe benefits are not distributed evenly. Trees need space for roots and a reliable water supply, and both are scarce in the densest neighbourhoods, which are frequently the hottest. Without deliberate planning, therefore, greening programmes can widen the gap between the coolest and warmest parts of a city even as they lower the average temperature.',
          vocabulary: [
            { word: 'canopy', definition: 'the layer of leaves and branches formed by trees' },
            { word: 'evaporates', definition: 'changes from a liquid into a vapour' },
            { word: 'scarce', definition: 'not available in sufficient quantity' },
          ],
        },
        {
          id: 'toefl-passage-2',
          title: 'Read in Daily Life: Library Notice',
          content:
            'NOTICE TO ALL MEMBERS\n\nThe East Wing reading room will close for recarpeting from Monday 3 March and will reopen on Monday 17 March. During this period the West Wing remains open until 21:00 on weekdays and until 17:00 on Saturdays.\n\nItems reserved online may still be collected from the West Wing desk, but the self-service machines will be out of use because they share the East Wing power supply. Please allow an extra day for any reservation placed after 14:00.\n\nWorkshops scheduled in the East Wing during the closure have been moved to the seminar room on the second floor. Attendees will be emailed a new room number; no action is required from you.',
        },
      ],
      questions: [
        {
          id: 'toefl-cw-1',
          type: 'completeWords',
          text: 'Complete the words in the passage. Type the missing letters of each incomplete word.',
          scoringWeight: 8,
          templateHtml:
            'The earliest public libraries were not free to enter. Most charged a subscription, which {{w1}} excluded poorer readers from the collection. When the first rate-funded library opened in 1850, it {{w2}} anyone who walked in, and within a decade the model had {{w3}} across the industrial cities.',
          blanks: [
            { id: 'w1', kind: 'partial', stem: 'effect', tail: 'ly', correct: ['ively'], maxLength: 8 },
            { id: 'w2', kind: 'partial', stem: 'acce', tail: 'd', correct: ['pte', 'pted'], maxLength: 8 },
            { id: 'w3', kind: 'partial', stem: 'sp', tail: '', correct: ['read'], maxLength: 8 },
          ],
          strategyTips:
            'Decide what the whole word must be from the sentence, then type only the letters that are missing. Do not retype the letters already shown.',
          explanation: 'effectively / accepted / spread. Each partial word is marked on its own.',
        },
        {
          id: 'toefl-cw-2',
          type: 'completeWords',
          text: 'Complete the words in the passage. Type the missing letters of each incomplete word.',
          scoringWeight: 8,
          templateHtml:
            'Migratory birds navigate by two independent systems. The first depends on the position of the sun, and the second on the earth\u2019s magnetic {{c1}}. When one system is {{c2}} by heavy cloud, the other compensates, which is why the birds rarely {{c3}} their route entirely.',
          blanks: [
            { id: 'c1', kind: 'partial', stem: 'fie', tail: 'd', correct: ['l'], maxLength: 6 },
            { id: 'c2', kind: 'partial', stem: 'obsc', tail: 'd', correct: ['ure'], maxLength: 8 },
            { id: 'c3', kind: 'partial', stem: 'aband', tail: '', correct: ['on'], maxLength: 8 },
          ],
          strategyTips: 'A single missing letter still counts as a full mark for that word.',
        },
        {
          id: 'toefl-rdl-1',
          type: 'multipleChoice',
          text: 'According to the library notice, why will the self-service machines be unavailable?',
          scoringWeight: 6,
          options: [
            { id: 'a', text: 'They are being replaced during the closure.' },
            { id: 'b', text: 'They share a power supply with the East Wing.' },
            { id: 'c', text: 'They are needed at the West Wing collection desk.' },
            { id: 'd', text: 'They are only serviced during the summer.' },
          ],
          correctAnswers: ['b'],
          strategyTips: 'Scan for the reason, not the consequence. The notice explains the cause in one clause.',
          explanation: 'The notice states the machines are out of use "because they share the East Wing power supply".',
        },
        {
          id: 'toefl-rdl-2',
          type: 'tableCompletion',
          text: 'Complete the table about the library closure. Write ONE WORD OR NUMBER for each gap.',
          scoringWeight: 8,
          templateHtml:
            '<table><thead><tr><th>Item</th><th>Detail</th></tr></thead><tbody>' +
            '<tr><td>East Wing reopens on</td><td>{{t1}} March</td></tr>' +
            '<tr><td>West Wing weekday closing time</td><td>{{t2}}</td></tr>' +
            '<tr><td>Extra time needed for reservations after 14:00</td><td>{{t3}} day</td></tr>' +
            '</tbody></table>',
          blanks: [
            { id: 't1', correct: ['17', 'seventeen'], maxLength: 12 },
            { id: 't2', correct: ['21:00', '9pm', '9 pm', '2100'], maxLength: 8 },
            { id: 't3', correct: ['one', '1', 'a'], maxLength: 6 },
          ],
          strategyTips: 'The table follows the order of the notice, but the closing time is written as a number rather than words.',
          explanation: '17 March / 21:00 / one day. Each cell is marked separately.',
        },
        {
          id: 'toefl-academic-1',
          type: 'multipleChoice',
          text: 'According to the academic passage, what is the main reason cities stay warmer than the surrounding countryside at night?',
          scoringWeight: 6,
          options: [
            { id: 'a', text: 'Street trees release stored heat after sunset.' },
            { id: 'b', text: 'Dark surfaces release absorbed radiation slowly.' },
            { id: 'c', text: 'Reservoirs trap warm air above the rooftops.' },
            { id: 'd', text: 'Traffic produces most of the heat after dark.' },
          ],
          correctAnswers: ['b'],
          strategyTips: 'The first paragraph gives two causes; the question asks for the main one linked to night-time warmth.',
          explanation: 'Dark surfaces absorb radiation by day and release it slowly after sunset.',
        },
        {
          id: 'toefl-academic-2',
          type: 'multipleChoice',
          text: 'According to the academic passage, what did the study of four European cities find?',
          scoringWeight: 6,
          options: [
            { id: 'a', text: 'A ten per cent increase in canopy cover lowered peak afternoon temperatures by about one degree.' },
            { id: 'b', text: 'Canopy cover raised night-time temperatures in the densest districts.' },
            { id: 'c', text: 'The greatest cooling occurred where vegetation was already plentiful.' },
            { id: 'd', text: 'Water supply had no measurable effect on the results.' },
          ],
          correctAnswers: ['a'],
          strategyTips: 'Watch for answer options that reverse a detail: the passage says the largest reductions were where vegetation was scarcest.',
          explanation: 'Option A restates the sentence; option C reverses it.',
        },
        {
          id: 'toefl-academic-3',
          type: 'summaryCompletion',
          text: 'Complete the summary of the academic passage. Write NO MORE THAN TWO WORDS for each gap.',
          scoringWeight: 8,
          templateHtml:
            '<p>Greening programmes can reduce a city\u2019s average temperature while still widening the difference between its coolest and warmest districts, because trees need root space and a reliable supply of {{s1}}, and both are in short supply in the {{s2}} neighbourhoods. The authors therefore argue that cooling programmes need deliberate {{s3}} rather than an even distribution of planting.</p>',
          blanks: [
            { id: 's1', correct: ['water', 'water supply'], maxLength: 14 },
            { id: 's2', correct: ['densest', 'dense', 'hottest'], maxLength: 14 },
            { id: 's3', correct: ['planning'], maxLength: 12 },
          ],
          strategyTips: 'The summary paraphrases the last paragraph, so match the meaning rather than the exact words.',
          explanation: 'water / densest / planning. Two words maximum per gap.',
        },
        {
          id: 'toefl-academic-4',
          type: 'multipleSelect',
          text: 'Which TWO statements about the greening study are supported by the academic passage? (Select all that apply)',
          scoringWeight: 8,
          options: [
            { id: 'a', text: 'The canopy intercepts sunlight before it reaches the pavement.' },
            { id: 'b', text: 'Evaporation from leaves cools the surrounding air.' },
            { id: 'c', text: 'Taller trees always produce greater cooling.' },
            { id: 'd', text: 'Greening removes the need for deliberate planning.' },
          ],
          correctAnswers: ['a', 'b'],
          strategyTips: 'Only two options are supported, and both are required for the mark.',
          explanation: 'A and B are stated in the second paragraph; C and D are not supported.',
        },
      ],
    },

    // ---------------------------------------------------------------- LISTENING
    {
      id: 'toefl-listening',
      title: 'Listening',
      description: 'Listen and Choose a Response, a Conversation, an Announcement and an Academic Talk.',
      instructions:
        'You can play each recording once. Take notes while you listen, then answer the questions that follow the recording.',
      timeLimitMinutes: 36,
      listeningActivities: [
        {
          id: 'toefl-listen-conversation',
          title: 'Listen to a Conversation: registration problem',
          mode: 'dialogue',
          accent: 'North American',
          voiceLanguage: 'en-US',
          cast: { Adviser: 'male-us', Student: 'female-us', Technician: 'male-in' },
          transcript:
            'A student cannot register for a laboratory course because the system reports a scheduling clash that does not exist. The adviser checks the timetable and then calls the technician.',
          lines: [
            { speaker: 'Student', gender: 'female', accent: 'American', voiceLanguage: 'en-US', text: 'I have been trying to register for the chemistry laboratory all morning, but the system says it clashes with a lecture I am not taking.' },
            { speaker: 'Adviser', gender: 'male', accent: 'American', voiceLanguage: 'en-US', text: 'Let me look at your record. The lecture is still listed from last term. It was cancelled in November, so the timetable simply never updated.' },
            { speaker: 'Student', gender: 'female', accent: 'American', voiceLanguage: 'en-US', text: 'So I have been blocked by a course that does not exist any more.' },
            { speaker: 'Adviser', gender: 'male', accent: 'American', voiceLanguage: 'en-US', text: 'Exactly. I will remove it. Register again this afternoon and the clash should be gone. If it is not, call the technician and ask them to rebuild your timetable.' },
            { speaker: 'Technician', gender: 'male', accent: 'Indian', voiceLanguage: 'en-IN', text: 'And if you phone me, give me your student number first. That is the one thing I cannot look up for you.' },
          ],
        },
        {
          id: 'toefl-listen-talk',
          title: 'Listen to an Academic Talk: coral bleaching',
          mode: 'monologue',
          accent: 'British',
          voiceLanguage: 'en-GB',
          cast: { Lecturer: 'female-gb' },
          transcript:
            'A lecture on why corals expel their symbiotic algae when water temperatures rise, and why recovery depends on how long the stress lasts.',
          lines: [
            { speaker: 'Lecturer', gender: 'female', accent: 'British', voiceLanguage: 'en-GB', text: 'Corals are animals, but most of the energy they use comes from microscopic algae that live inside their tissue. The algae give the coral its colour, and the coral gives the algae shelter and nutrients. When water temperatures rise by even one degree above the summer maximum for a fortnight, the partnership breaks down, and the coral expels the algae. What you see then is the white skeleton showing through, which is why we call it bleaching.' },
            { speaker: 'Lecturer', gender: 'female', accent: 'British', voiceLanguage: 'en-GB', text: 'Bleaching is not automatically fatal. If the water cools within a few weeks, the coral can take the algae back and recover. Beyond about eight weeks, however, the coral has usually starved, and the reef structure begins to erode because the coral is no longer building it.' },
          ],
        },
      ],
      questions: [
        {
          id: 'toefl-lcn-1',
          type: 'noteCompletion',
          text: 'Complete the notes below. Write ONE WORD OR NUMBER for each answer.',
          scoringWeight: 8,
          audioText:
            'I have been trying to register for the chemistry laboratory all morning, but the system says it clashes with a lecture I am not taking. The lecture is still listed from last term. It was cancelled in November, so the timetable simply never updated. I will remove it. Register again this afternoon and the clash should be gone. If it is not, call the technician and ask them to rebuild your timetable. And if you phone me, give me your student number first.',
          voiceLanguage: 'en-US',
          accent: 'North American',
          profile: 'male-us',
          gender: 'male',
          templateHtml:
            '<h4>Registration problem - conversation notes</h4><ul>' +
            '<li>The system reports a clash with a lecture cancelled in {{n1}}.</li>' +
            '<li>The adviser will {{n2}} the old lecture from the record.</li>' +
            '<li>The student should register again in the {{n3}}.</li>' +
            '<li>If the clash remains, the technician will rebuild the {{n4}}.</li>' +
            '</ul>',
          blanks: [
            { id: 'n1', correct: ['november', 'nov'], maxLength: 12 },
            { id: 'n2', correct: ['remove', 'delete'], maxLength: 12 },
            { id: 'n3', correct: ['afternoon'], maxLength: 12 },
            { id: 'n4', correct: ['timetable', 'schedule'], maxLength: 14 },
          ],
          strategyTips: 'The notes follow the order of the conversation. Write the word you hear, spelled correctly.',
          explanation: 'November / remove / afternoon / timetable. Each gap is marked separately.',
        },
        {
          id: 'toefl-lcn-2',
          type: 'multipleChoice',
          text: 'What does the technician ask the student to do first when phoning?',
          scoringWeight: 6,
          audioText: 'And if you phone me, give me your student number first. That is the one thing I cannot look up for you.',
          voiceLanguage: 'en-IN',
          accent: 'Indian',
          profile: 'male-in',
          gender: 'male',
          options: [
            { id: 'a', text: 'Explain the timetable error in writing.' },
            { id: 'b', text: 'Give the student number.' },
            { id: 'c', text: 'Contact the adviser again.' },
            { id: 'd', text: 'Wait until the afternoon.' },
          ],
          correctAnswers: ['b'],
          strategyTips: 'Listen for the explicitly sequenced instruction, not the general topic.',
          explanation: 'The technician asks for the student number first because it cannot be looked up.',
        },
        {
          id: 'toefl-ltalk-1',
          type: 'tableCompletion',
          text: 'Complete the table about coral bleaching. Write ONE WORD OR NUMBER for each gap.',
          scoringWeight: 8,
          audioText:
            'When water temperatures rise by even one degree above the summer maximum for a fortnight, the partnership breaks down, and the coral expels the algae. Bleaching is not automatically fatal. If the water cools within a few weeks, the coral can take the algae back and recover. Beyond about eight weeks, however, the coral has usually starved.',
          voiceLanguage: 'en-GB',
          accent: 'British',
          profile: 'female-gb',
          gender: 'female',
          templateHtml:
            '<table><thead><tr><th>Stage</th><th>What happens</th></tr></thead><tbody>' +
            '<tr><td>Temperature above summer maximum by {{t1}} degree for two weeks</td><td>The coral expels the algae</td></tr>' +
            '<tr><td>Water cools within a few weeks</td><td>The coral can {{t2}}</td></tr>' +
            '<tr><td>Stress continues beyond about {{t3}} weeks</td><td>The coral starves and the reef erodes</td></tr>' +
            '</tbody></table>',
          blanks: [
            { id: 't1', correct: ['one', '1'], maxLength: 8 },
            { id: 't2', correct: ['recover', 'recover take the algae back'], maxLength: 12 },
            { id: 't3', correct: ['eight', '8'], maxLength: 8 },
          ],
          strategyTips: 'The lecture gives the recovery window and the fatal window as two separate numbers.',
          explanation: 'one / recover / eight. Each cell is marked separately.',
        },
        {
          id: 'toefl-ltalk-2',
          type: 'multipleChoice',
          text: 'According to the talk, why does the reef structure begin to erode?',
          scoringWeight: 6,
          audioText: 'Beyond about eight weeks the coral has usually starved, and the reef structure begins to erode because the coral is no longer building it.',
          voiceLanguage: 'en-GB',
          accent: 'British',
          profile: 'female-gb',
          gender: 'female',
          options: [
            { id: 'a', text: 'The algae release an acid that dissolves the skeleton.' },
            { id: 'b', text: 'The coral is no longer building the structure.' },
            { id: 'c', text: 'Currents carry away the sand around the reef.' },
            { id: 'd', text: 'Fish graze on the bleached tissue.' },
          ],
          correctAnswers: ['b'],
          strategyTips: 'The cause is given as a clause after "because", so listen to the end of the sentence.',
          explanation: 'The lecture states the coral is no longer building the reef.',
        },
        {
          id: 'toefl-lresp-1',
          type: 'listening',
          text: 'Listen and choose the best response to what you hear.',
          instructions: 'You will hear a short question. Choose the response that best fits the situation.',
          scoringWeight: 6,
          audioText: 'Excuse me, do you know whether the laboratories are open during the vacation?',
          voiceLanguage: 'en-US',
          accent: 'North American',
          profile: 'female-us',
          gender: 'female',
          options: [
            { id: 'a', text: 'Yes, but only with a supervisor present.' },
            { id: 'b', text: 'I studied chemistry last year.' },
            { id: 'c', text: 'The laboratory is on the second floor.' },
            { id: 'd', text: 'No, I have not read it yet.' },
          ],
          correctAnswers: ['a'],
          strategyTips: 'Only one option answers the question that was asked.',
          explanation: 'A directly answers a yes/no question about access conditions.',
        },
      ],
    },

    // ----------------------------------------------------------------- SPEAKING
    {
      id: 'toefl-speaking',
      title: 'Speaking',
      description: 'Listen and Repeat, then Take an Interview.',
      instructions:
        'For each task press Record when you are ready, speak clearly for the time allowed, then press Stop. Your recordings are saved in this page.',
      timeLimitMinutes: 16,
      questions: [
        {
          id: 'toefl-sp-repeat-1',
          type: 'speaking',
          text: 'Listen and Repeat: repeat the sentence you hear as accurately as you can, including the intonation.',
          instructions: 'Play the audio, then record your repetition immediately. You may play the audio once.',
          audioText: 'The committee agreed to postpone the decision until the funding review was complete.',
          voiceLanguage: 'en-US',
          accent: 'North American',
          profile: 'male-us',
          gender: 'male',
          scoringWeight: 15,
          maxRecordingSeconds: 25,
          strategyTips: 'Accuracy matters more than speed. Keep the word order exact.',
          explanation: 'Marked on accurate reproduction of content words and word order.',
        },
        {
          id: 'toefl-sp-repeat-2',
          type: 'speaking',
          text: 'Listen and Repeat: repeat the sentence you hear as accurately as you can.',
          instructions: 'Play the audio, then record your repetition immediately.',
          audioText: 'Although the initial results were encouraging, the sample was too small to support a firm conclusion.',
          voiceLanguage: 'en-GB',
          accent: 'British',
          profile: 'female-gb',
          gender: 'female',
          scoringWeight: 15,
          maxRecordingSeconds: 25,
          strategyTips: 'Keep the contrast structure intact: the concession comes first, the limitation second.',
        },
        {
          id: 'toefl-sp-interview-1',
          type: 'speaking',
          text: 'Take an Interview: describe a skill you learned outside a classroom and explain how you learned it. Speak for 45 to 60 seconds.',
          instructions: 'Press Record, answer the question, then press Stop.',
          scoringWeight: 20,
          maxRecordingSeconds: 60,
          strategyTips: 'Name the skill in one sentence, then give two specific stages and one result.',
          explanation: 'Marked on delivery, language use and topic development.',
        },
        {
          id: 'toefl-sp-interview-2',
          type: 'speaking',
          text: 'Take an Interview: a tutor has suggested that all first-year students should take a study-skills course. Do you agree? Give reasons.',
          instructions: 'Press Record, answer the question, then press Stop.',
          scoringWeight: 20,
          maxRecordingSeconds: 60,
          strategyTips: 'State a clear position in the first sentence, then give two reasons with an example for each.',
          explanation: 'Marked on delivery, language use and topic development.',
        },
      ],
    },

    // ------------------------------------------------------------------ WRITING
    {
      id: 'toefl-writing',
      title: 'Writing',
      description: 'Build a Sentence, Write an Email and Write for an Academic Discussion.',
      instructions: 'Type your answers. The word count for each response is shown under the box.',
      timeLimitMinutes: 29,
      questions: [
        {
          id: 'toefl-wr-build-1',
          type: 'ordering',
          text: 'Build a sentence: put the words and phrases into the correct order.',
          scoringWeight: 6,
          options: [
            { id: 'b1', text: 'the study' },
            { id: 'b2', text: 'because of its small sample' },
            { id: 'b3', text: 'was criticised' },
            { id: 'b4', text: 'by two reviewers' },
          ],
          correctAnswers: ['b1', 'b3', 'b4', 'b2'],
          strategyTips: 'Build the core clause first (subject, verb, agent), then attach the reason.',
          explanation: 'The study was criticised by two reviewers because of its small sample.',
        },
        {
          id: 'toefl-wr-build-2',
          type: 'ordering',
          text: 'Build a sentence: put the words and phrases into the correct order.',
          scoringWeight: 6,
          options: [
            { id: 'c1', text: 'Although attendance improved' },
            { id: 'c2', text: 'the organisers' },
            { id: 'c3', text: 'cancelled' },
            { id: 'c4', text: 'the second workshop' },
          ],
          correctAnswers: ['c1', 'c2', 'c3', 'c4'],
          strategyTips: 'The concession clause comes first and is followed by a comma.',
          explanation: 'Although attendance improved, the organisers cancelled the second workshop.',
        },
        {
          id: 'toefl-wr-email-1',
          type: 'essay',
          text: 'Write an Email: write 120 to 150 words to your department administrator. A required laboratory session clashes with a lecture you must attend, and you want to move to a different session.',
          instructions: 'Include a greeting, the request, the reason, and a closing line. Write 120-150 words.',
          minWords: 10,
          scoringWeight: 20,
          strategyTips: 'State the request early, give the reason briefly, and propose a specific alternative session.',
          explanation: 'Marked on task fulfilment, register and accuracy. Completion credit only in the standalone file.',
        },
        {
          id: 'toefl-wr-discussion-1',
          type: 'essay',
          text: 'Write for an Academic Discussion: your class is debating whether universities should record all lectures. Write 150 to 200 words stating your position and responding to the point that recordings reduce attendance.',
          instructions: 'Write 150-200 words. Refer to at least one other view in the discussion.',
          minWords: 10,
          scoringWeight: 25,
          strategyTips: 'Answer the discussion question directly, then engage with the opposing point rather than listing your own views.',
          explanation: 'Marked on position, contribution to the discussion and language. Completion credit only in the standalone file.',
        },
      ],
    },
  ],
  adaptiveLogic: {
    enabled: false,
    rulesDescription: 'TOEFL iBT 2026 is delivered as a fixed-form paper in this build; the official test is section-adaptive and requires an item pool.',
    difficultyProgression: [{ thresholdCorrectPercent: 75, nextDifficulty: 'hard' }],
  },
});
