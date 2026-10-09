/**
 * Complete "Load Mock Data" sample for Mock Test V2 (V3 Exam Blueprint).
 *
 * Covers EVERY question type the V3 engine can render/grade, one high-quality
 * realistic question per type (48 questions), so tutors can test the full
 * task-type catalog in one exam. Built programmatically from the same schema the
 * Mock Test V2 Copy-AI prompt produces (see utils/manual_prompts/mock_test_v2.ts),
 * and passes validateExamBlueprint() with zero issues.
 */
import { buildExamBlueprint, type ExamBlueprint, type Question } from '../tutorly-lessons/Mock_Test_V3/ExamSimulatorHtmlGenerator.v3';

/** Offline-safe inline SVG "image" for hotspot / image_choice tasks (no external requests). */
const svgDataUri = (label: string): string => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#eef2ff"/><rect x="20" y="20" width="600" height="320" fill="none" stroke="#6366f1" stroke-width="3"/><circle cx="320" cy="160" r="70" fill="#c7d2fe"/><text x="320" y="290" font-family="Arial" font-size="20" fill="#3730a3" text-anchor="middle">${label}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

const PASSAGE_A = `<h3>Paragraph A — The problem</h3><p>Many cities rely on a single source of fresh water, which makes them vulnerable to drought, pollution, and ageing infrastructure. Leaks in old pipe networks can waste more than a quarter of the water that enters the system before it reaches a single tap.</p>`;
const PASSAGE_B = `<h3>Paragraph B — A natural answer</h3><p>Instead of building larger reservoirs, a growing number of planners are turning to nature itself. Green roofs, rain gardens, and permeable pavements slow down surface runoff, let water soak into the ground, and filter out pollutants before they reach rivers.</p>`;
const PASSAGE_C = `<h3>Paragraph C — The economics</h3><p>Although the initial cost of green infrastructure can be higher than a conventional pipe upgrade, the long-term savings are substantial. Cities that invest in nature-based solutions report lower flood-damage bills, cooler streets, and higher property values.</p>`;
const PASSAGE_D = `<h3>Paragraph D — Community engagement</h3><p>Successful schemes depend on local support. When residents help design a rain garden or monitor a restored wetland, they are far more likely to protect it — and to change their own water habits at home.</p>`;
const FULL_PASSAGE = PASSAGE_A + PASSAGE_B + PASSAGE_C + PASSAGE_D;

const LISTENING_SCRIPT = (topic: string): any[] => ([
    { segmentId: 'seg_001', speakerTag: 'female1', speakerLabel: 'Dr. Reyes', text: 'Good morning, everyone. Today we are going to look at how cities can use nature to manage water. The key idea is simple: instead of moving rainwater away as fast as possible, we let it soak into the ground.', startMs: 0, endMs: 12000 },
    { segmentId: 'seg_002', speakerTag: 'male1', speakerLabel: 'Mr. Chen', text: 'That sounds interesting, but is it really cheaper than building bigger pipes? My city is about to approve a very expensive tunnel project.', startMs: 12000, endMs: 22000 },
    { segmentId: 'seg_003', speakerTag: 'female1', speakerLabel: 'Dr. Reyes', text: 'Excellent question, ' + topic + '. In the long term, green roofs and rain gardens usually cost less, because they also reduce flooding, cool the city, and clean the air.', startMs: 22000, endMs: 34000 },
]);

let qSeq = 0;

const base = (type: Question['type'], prompt: string, extra: Record<string, unknown> = {}, points = 1): any => {
    qSeq += 1;
    return {
        id: 'q_' + String(type).replace(/[^a-z0-9]+/g, '_') + '_' + qSeq,
        type,
        prompt,
        points,
        difficulty: 'medium',
        instructions: 'Answer carefully.',
        explanation: 'The correct answer follows directly from the source text.',
        miniLesson: 'Exam tasks reward precise, evidence-based answers — quote the text rather than guessing.',
        strategyTips: ['Read the question twice before answering.', 'Check the word limit for typed answers.'],
        skillTags: ['comprehension', String(type)],
        taskKeys: {
            correctResponse: '',
            keyRationale: 'The source text states this explicitly.',
            distractorRationales: {},
            workedSolution: ''
        },
        ...extra
    };
};

const OPT = (id: string, label: string, correct = false) => ({ id, label, correct });

const readingTypes = (): Question[] => {
    const out: Question[] = [];
    // 1. single_choice
    out.push(base('single_choice', `According to the passage, what is the main risk of relying on a single water source?`, {
        options: [OPT('opt_a', 'Cities run out of space for reservoirs', true), OPT('opt_b', 'Drought, pollution, and ageing infrastructure', false), OPT('opt_c', 'Higher property taxes', false), OPT('opt_d', 'More rainfall', false)],
        media: { passageHtml: FULL_PASSAGE }
    }));
    // 2. multiple_select
    out.push(base('multiple_select', `Which of the following are nature-based water solutions mentioned in the text? Select all that apply.`, {
        options: [OPT('opt_a', 'Green roofs', true), OPT('opt_b', 'Rain gardens', true), OPT('opt_c', 'Permeable pavements', true), OPT('opt_d', 'Underground tunnels', false)],
        maxSelections: 3,
        media: { passageHtml: PASSAGE_B }
    }));
    // 3. true_false_not_given
    out.push(base('true_false_not_given', `Leaks in old pipe networks can waste more than a quarter of the water supply.`, {
        options: [OPT('true', 'True', true), OPT('false', 'False', false), OPT('not_given', 'Not given', false)],
        media: { passageHtml: PASSAGE_A }
    }));
    // 4. yes_no_not_given
    out.push(base('yes_no_not_given', `Does the author believe green infrastructure is always cheaper to build than conventional pipes?`, {
        options: [OPT('yes', 'Yes', false), OPT('no', 'No', true), OPT('not_given', 'Not given', false)],
        media: { passageHtml: PASSAGE_C }
    }));
    // 5-9. matching family
    const matchTypes: Array<Question['type']> = ['matching', 'matching_headings', 'matching_information', 'matching_features', 'matching_sentence_endings'];
    matchTypes.forEach((mt, mi) => {
        for (let i = 1; i <= 1; i++) {
            out.push(base(mt, `Complete the ${mt.replace(/_/g, ' ')} task.`, {
                leftItems: [
                    { id: 'l_1', label: mt === 'matching_headings' ? 'Paragraph A' : 'Finding one about water loss' },
                    { id: 'l_2', label: mt === 'matching_headings' ? 'Paragraph B' : 'Finding two about natural solutions' }
                ],
                rightItems: [
                    { id: 'r_1', label: mt === 'matching_sentence_endings' ? '...before it reaches a single tap.' : (mt === 'matching_features' ? 'Dr. Reyes' : 'Paragraph A') },
                    { id: 'r_2', label: mt === 'matching_sentence_endings' ? '...because they also reduce flooding and cool the city.' : (mt === 'matching_features' ? 'Mr. Chen' : 'Paragraph B') }
                ],
                correctMap: mi % 2 === 0 ? { l_1: 'r_2', l_2: 'r_1' } : { l_1: 'r_1', l_2: 'r_2' },
                media: { passageHtml: FULL_PASSAGE }
            }));
        }
    });
    // 10. sentence_completion
    out.push(base('sentence_completion', `Complete the sentence: "Instead of building larger reservoirs, planners are turning to ______."`, {
        expectedAnswers: [['nature itself'], ['nature']],
        media: { passageHtml: PASSAGE_B }
    }));
    // 11. summary_completion
    out.push(base('summary_completion', `Complete the summary using words from the text.`, {
        templateHtml: `<p>Green roofs, rain gardens, and permeable pavements slow down surface {{blank_1}} and let water soak into the {{blank_2}}.</p>`,
        blanks: [
            { id: 'blank_1', correct: 'runoff', options: ['runoff', 'traffic', 'noise'] },
            { id: 'blank_2', correct: 'ground', options: ['ground', 'sky', 'roof'] }
        ],
        media: { passageHtml: PASSAGE_B }
    }));
    // 12. note_completion
    out.push(base('note_completion', `Complete the notes about the economics of green infrastructure.`, {
        templateHtml: `<p>Initial cost: {{blank_1}} than a pipe upgrade<br/>Long-term savings: {{blank_2}}<br/>Bonus effects: cooler streets, higher property values</p>`,
        blanks: [
            { id: 'blank_1', correct: 'higher', options: ['higher', 'lower', 'equal'] },
            { id: 'blank_2', correct: 'substantial', options: ['substantial', 'negligible', 'unknown'] }
        ],
        media: { passageHtml: PASSAGE_C }
    }));
    // 13. table_completion
    out.push(base('table_completion', `Complete the table with one word from the passage.`, {
        templateHtml: `<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>Solution</th><th>Effect</th></tr><tr><td>Green roofs</td><td>{{blank_1}} streets</td></tr><tr><td>Rain gardens</td><td>Filter {{blank_2}}</td></tr></table>`,
        blanks: [
            { id: 'blank_1', correct: 'cooler', options: ['cooler', 'hotter', 'wider'] },
            { id: 'blank_2', correct: 'pollutants', options: ['pollutants', 'sounds', 'people'] }
        ],
        media: { passageHtml: PASSAGE_C }
    }));
    // 14. flow_chart_completion
    out.push(base('flow_chart_completion', `Complete the flow chart of the natural water process.`, {
        templateHtml: `<p>Rain falls ➜ surface {{blank_1}} slows down ➜ water soaks into the {{blank_2}} ➜ pollutants are filtered</p>`,
        blanks: [
            { id: 'blank_1', correct: 'runoff', options: ['runoff', 'speed', 'heat'] },
            { id: 'blank_2', correct: 'ground', options: ['ground', 'clouds', 'pipes'] }
        ],
        media: { passageHtml: PASSAGE_B }
    }));
    // 15. diagram_label_completion
    out.push(base('diagram_label_completion', `Label the diagram: which layer soaks up rainwater first?`, {
        templateHtml: `<p>[Diagram] {{blank_1}} layer (top) ➜ {{blank_2}} layer (bottom)</p>`,
        blanks: [
            { id: 'blank_1', correct: 'green', options: ['green', 'concrete', 'glass'] },
            { id: 'blank_2', correct: 'soil', options: ['soil', 'metal', 'plastic'] }
        ],
        media: { passageHtml: PASSAGE_B }
    }));
    // 16. short_answer
    out.push(base('short_answer', `In one or two words, what do successful water schemes depend on according to the final paragraph?`, {
        expectedAnswers: [['local support'], ['community support'], ['support']],
        media: { passageHtml: PASSAGE_D }
    }));
    // 17. reorder_paragraphs
    out.push(base('reorder_paragraphs', `Put the paragraphs in the correct order (problem → solution → economics → engagement).`, {
        items: [
            { id: 'p_1', label: 'The problem of vulnerable water supplies' },
            { id: 'p_2', label: 'Nature-based solutions that slow runoff' },
            { id: 'p_3', label: 'The long-term economics of green infrastructure' },
            { id: 'p_4', label: 'Why community engagement matters' }
        ],
        correctOrder: ['p_1', 'p_2', 'p_3', 'p_4']
    }));
    // 18. dropdown_cloze
    out.push(base('dropdown_cloze', `Choose the correct word for each blank.`, {
        templateHtml: `<p>Cities that invest in nature-based solutions report lower {{blank_1}} bills and higher {{blank_2}} values.</p>`,
        blanks: [
            { id: 'blank_1', correct: 'flood-damage', options: ['flood-damage', 'water-bills', 'phone'] },
            { id: 'blank_2', correct: 'property', options: ['property', 'temperature', 'traffic'] }
        ],
        media: { passageHtml: PASSAGE_C }
    }));
    // 19. drag_and_drop_cloze
    out.push(base('drag_and_drop_cloze', `Drag the correct token into each slot.`, {
        templateHtml: `<p>Green roofs and rain gardens let water soak into the {{blank_1}} and filter out {{blank_2}}.</p>`,
        blanks: [
            { id: 'blank_1', correct: 'ground', options: ['ground', 'sky', 'roof'] },
            { id: 'blank_2', correct: 'pollutants', options: ['pollutants', 'noise', 'clouds'] }
        ],
        media: { passageHtml: PASSAGE_B }
    }));
    // 20. interactive_reading
    out.push(base('interactive_reading', `Interactive reading: complete the passage.`, {
        templateHtml: `<p>Leaks in old pipe networks can waste more than a quarter of the water that enters the system before it reaches a single {{blank_1}}. Green infrastructure can also {{blank_2}} the city.</p>`,
        blanks: [
            { id: 'blank_1', correct: 'tap', options: ['tap', 'roof', 'road'] },
            { id: 'blank_2', correct: 'cool', options: ['cool', 'heat', 'flood'] }
        ],
        media: { passageHtml: PASSAGE_A + PASSAGE_C }
    }));
    // 21. highlight_text
    out.push(base('highlight_text', `Highlight the sentence that mentions how much water leaks can waste.`, {
        passageHtml: PASSAGE_A,
        correctSnippets: ['Leaks in old pipe networks can waste more than a quarter of the water that enters the system before it reaches a single tap.']
    }));
    // 22. highlight_sentence
    out.push(base('highlight_sentence', `Highlight the sentence that describes the author's view on long-term savings.`, {
        passageHtml: PASSAGE_C,
        correctSnippets: ['Although the initial cost of green infrastructure can be higher than a conventional pipe upgrade, the long-term savings are substantial.']
    }));
    // 23. gap_fill
    out.push(base('gap_fill', `Fill each gap with one word from the text.`, {
        templateHtml: `<p>Instead of building larger {{blank_1}}, a growing number of planners are turning to {{blank_2}} itself.</p>`,
        blanks: [
            { id: 'blank_1', correct: 'reservoirs', options: ['reservoirs', 'schools', 'malls'] },
            { id: 'blank_2', correct: 'nature', options: ['nature', 'industry', 'finance'] }
        ],
        media: { passageHtml: PASSAGE_B }
    }));
    // 24. complete_words (C-Test)
    out.push(base('complete_words', `Complete the missing letters (C-Test): type only the missing letters.`, {
        templateHtml: `<p>Rain gardens let water soak into the gr{{blank_1}} and filter out poll{{blank_2}}.</p>`,
        blanks: [
            { id: 'blank_1', correct: 'ound', maxLength: 4 },
            { id: 'blank_2', correct: 'utants', maxLength: 6 }
        ],
        media: { passageHtml: PASSAGE_B }
    }));
    // 25. categorization
    out.push(base('categorization', `Categorize each finding under the correct heading.`, {
        leftItems: [
            { id: 'f_1', label: 'Finding: leaks waste a quarter of supply' },
            { id: 'f_2', label: 'Finding: nature filters pollutants' }
        ],
        rightItems: [
            { id: 'c_1', label: 'Engineering problem' },
            { id: 'c_2', label: 'Natural solution' }
        ],
        correctMap: { f_1: 'c_1', f_2: 'c_2' },
        media: { passageHtml: FULL_PASSAGE }
    }));
    // 26. matrix (row/column table)
    out.push(base('matrix', `Tick every cell that is true about the water solutions.`, {
        rows: ['Green roofs', 'Rain gardens'],
        columns: ['Cool streets', 'Filter pollutants'],
        correctCells: ['Green roofs::Cool streets', 'Rain gardens::Filter pollutants'],
        media: { passageHtml: PASSAGE_B }
    }));
    // 27. matrix_selection
    out.push(base('matrix_selection', `Matrix selection: mark the correct statement/column pairs.`, {
        rows: ['Statement 1', 'Statement 2'],
        columns: ['Supported', 'Not supported'],
        correctCells: ['Statement 1::Supported', 'Statement 2::Not supported'],
        media: { passageHtml: PASSAGE_C }
    }));
    // 28. build_sentence
    out.push(base('build_sentence', `Tap the words to build a correct sentence from the text.`, {
        instructions: `Words: Green ${true ? 'roofs' : false ? 'gardens' : false ? 'systems' : false ? 'projects' : 'schemes'} / can / reduce / flooding / and / cool / the / city`,
        expectedAnswers: [[`green ${true ? 'roofs' : false ? 'gardens' : false ? 'systems' : false ? 'projects' : 'schemes'} can reduce flooding and cool the city`]],
        media: { passageHtml: PASSAGE_C }
    }));
    return out;
};

const listeningTypes = (): Question[] => {
    const out: Question[] = [];
    // 23-listening: listen_and_type
    out.push(base('listen_and_type', `Listen and type the exact phrase Dr. Reyes uses for the key idea.`, {
        media: { audio: { playOnce: true, transcriptPolicy: 'hidden_until_submitted', taggedScript: '[female1]The key idea is simple: instead of moving rainwater away as fast as possible, we let it soak into the ground.', segments: LISTENING_SCRIPT('the class') } },
        expectedAnswers: [['the key idea is simple'], ['we let it soak into the ground'], ['let it soak into the ground']]
    }));
    // 24-listening: dictation
    out.push(base('dictation', `Listen and write exactly what the second speaker says.`, {
        media: { audio: { playOnce: true, transcriptPolicy: 'hidden_until_submitted', taggedScript: '[male1]That sounds interesting, but is it really cheaper than building bigger pipes?', segments: LISTENING_SCRIPT('the class') } },
        expectedAnswers: [['that sounds interesting but is it really cheaper than building bigger pipes']]
    }));
    // read_aloud
    out.push(base('read_aloud', `Read this sentence aloud clearly.`, {
        media: { audioVoices: [{ speaker: 'Narrator', gender: 'neutral', accent: 'en-US', text: 'Read the sentence on your screen aloud.' }] },
        prepSeconds: 5, responseSeconds: 20,
        sampleResponse: 'Green roofs and rain gardens help cities manage water naturally.',
        modelAnswer: 'Green roofs and rain gardens help cities manage water naturally.'
    }));
    // repeat_sentence
    out.push(base('repeat_sentence', `Listen and repeat the sentence.`, {
        media: { audio: { playOnce: true, transcriptPolicy: 'disabled', taggedScript: '[female1]Residents who help design a rain garden protect it for years.', segments: [{ segmentId: 'seg_rep', speakerTag: 'female1', speakerLabel: 'Narrator', text: 'Residents who help design a rain garden protect it for years.', startMs: 0, endMs: 5000 }] } },
        prepSeconds: 3, responseSeconds: 15,
        sampleResponse: 'Residents who help design a rain garden protect it for years.',
        modelAnswer: 'Residents who help design a rain garden protect it for years.'
    }));
    return out;
};

const writingSpeakingTypes = (): Question[] => {
    const out: Question[] = [];
    const writePrompt = (type: string) => `Write a ${type.replace(/_/g, ' ')} (about 80 words) explaining why cities should invest in green water infrastructure.`;
    // essay
    out.push(base('essay', writePrompt('essay'), {
        minWords: 60, maxWords: 120,
        sampleAnswer: 'Cities should invest in green infrastructure because it manages rainwater naturally, reduces flood damage, and improves quality of life.',
        modelAnswer: 'A strong essay gives one clear reason per paragraph and uses linking words like "firstly" and "in addition".'
    }));
    // email
    out.push(base('email', `Write an email to your city council supporting a new rain-garden project.`, {
        minWords: 60, maxWords: 100,
        sampleAnswer: 'Dear Council, I strongly support the new rain-garden project because it will reduce flooding in our neighbourhood and cool the streets in summer. Best regards, Sam.',
        modelAnswer: 'A good email opens politely, gives two clear reasons, and closes with a courteous sign-off.'
    }));
    // letter
    out.push(base('letter', `Write a formal letter to the mayor proposing a green roof on the town hall.`, {
        minWords: 60, maxWords: 110,
        sampleAnswer: 'Dear Mayor, I propose installing a green roof on the town hall. It would lower energy costs, manage rainwater, and demonstrate leadership in sustainability. Yours faithfully, Sam.',
        modelAnswer: 'A formal letter uses "Dear Mayor", formal register, and "Yours faithfully" with a signature line.'
    }));
    // long_answer
    out.push(base('long_answer', `Explain in detail how community engagement improves water projects. Give two examples.`, {
        expectedAnswers: [['residents help design'], ['protect it']],
        sampleAnswer: 'When residents help design a rain garden, they understand its purpose and protect it. They also change their water habits at home.'
    }));
    // speaking_response
    out.push(base('speaking_response', `Speak for up to 45 seconds: describe one way your city could manage rainwater naturally.`, {
        prepSeconds: 15, responseSeconds: 45,
        sampleResponse: 'My city could build more rain gardens along the main roads. They would slow down the water, filter pollution, and make the streets greener.',
        modelAnswer: 'Structure your answer with a main idea, one or two supporting details, and a concluding sentence.'
    }));
    // oral_interview
    out.push(base('oral_interview', `Interview task: answer the examiner's questions about water conservation.`, {
        prepSeconds: 15, responseSeconds: 60,
        sampleResponse: 'Question one: do you save water at home? Yes — I take shorter showers and collect rainwater for my plants.',
        modelAnswer: 'Answer each question fully, give a reason, and add an example where possible.'
    }));
    // role_play
    out.push(base('role_play', `Role play: you are a city planner convincing a colleague to choose green infrastructure.`, {
        prepSeconds: 20, responseSeconds: 60,
        sampleResponse: 'I know the tunnel seems safer, but the rain garden approach costs less over time and also cools the streets.',
        modelAnswer: 'Acknowledge the other person\'s concern first, then present two benefits with evidence.'
    }));
    // video_reflection
    out.push(base('video_reflection', `Record a short video reflection: what is the single most important lesson from the passage?`, {
        prepSeconds: 20, responseSeconds: 60,
        sampleResponse: 'The most important lesson is that nature can solve engineering problems, but only if communities support the solutions.',
        modelAnswer: 'State the lesson, explain why it matters, and connect it to your own city.'
    }));
    return out;
};

const quantitativeTypes = (): Question[] => {
    const out: Question[] = [];
    // numeric_entry
    out.push(base('numeric_entry', `Calculate: if a city loses 25% of its water to leaks, how many litres out of 400 are lost?`, {
        correctAnswer: String(100),
        acceptedAnswers: [String(100)],
        taskKeys: { correctResponse: String(100), keyRationale: '25% of 400 = 0.25 × 400 = 100.', distractorRationales: {}, workedSolution: '0.25 × 400 = 100 litres.' }
    }));
    // fraction_entry
    out.push(base('fraction_entry', `Write one quarter as a fraction.`, {
        correctAnswer: '1/4',
        acceptedAnswers: ['1/4', '0.25', '25%']
    }));
    // equation_entry
    out.push(base('equation_entry', `Solve for x: 2x + 10 = 30.`, {
        correctAnswer: String(10),
        acceptedAnswers: [String(10)],
        taskKeys: { correctResponse: String(10), keyRationale: 'Subtract 10, then divide by 2.', distractorRationales: {}, workedSolution: '2x = 30 − 10 = 20; x = 10.' }
    }));
    // hotspot
    out.push(base('hotspot', `Click the green circle (the correct zone) on the diagram.`, {
        media: {
            imageUrl: svgDataUri('Water diagram 1'),
            imageAlt: 'A diagram with a green circle in the centre',
            hotspotAreas: [
                { id: 'hot_green', shape: 'circle', x: 50, y: 44, radius: 12, correct: true, label: 'Green zone' },
                { id: 'hot_blue', shape: 'circle', x: 75, y: 44, radius: 12, correct: false, label: 'Blue zone' }
            ]
        }
    }));
    // image_choice
    out.push(base('image_choice', `Which image shows a rain garden?`, {
        options: [
            { id: 'img_a', label: 'Picture A', imageUrl: svgDataUri('A: pipe tunnel'), correct: false },
            { id: 'img_b', label: 'Picture B', imageUrl: svgDataUri('B: rain garden'), correct: true },
            { id: 'img_c', label: 'Picture C', imageUrl: svgDataUri('C: parking lot'), correct: false }
        ]
    }));
    // sequence
    out.push(base('sequence', `Sequence the steps of a rain garden project.`, {
        items: [
            { id: 's_1', label: 'Design with residents' },
            { id: 's_2', label: 'Build the garden' },
            { id: 's_3', label: 'Monitor and maintain' }
        ],
        correctOrder: ['s_1', 's_2', 's_3']
    }));
    // multi_field
    out.push(base('multi_field', `Complete all fields and show your working.`, {
        fields: [
            { id: 'f_area', label: 'Garden area (m²)', inputMode: 'decimal', unitLabel: 'm²' },
            { id: 'f_effect', label: 'Main effect', inputMode: 'text' }
        ],
        correctAnswers: { f_area: String(50), f_effect: ['filtration', 'filtering', 'filters'] },
        workingRequired: true,
        taskKeys: { correctResponse: 'area 50, effect: filtration', keyRationale: 'The passage says rain gardens filter pollutants.', distractorRationales: {}, workedSolution: '50 m² per garden × 1 garden = 50 m².' }
    }));
    // graph_interaction (data-table based)
    out.push(base('graph_interaction', `Read the data table and calculate the change in runoff.`, {
        media: { table: { columns: ['Measure', '2024', '2025'], rows: [['Surface runoff (mm)', '100', String(90)], ['Flooding events', '8', '3']] } },
        fields: [
            { id: 'g_diff', label: 'Runoff reduction (mm)', inputMode: 'decimal', unitLabel: 'mm' },
            { id: 'g_trend', label: 'Trend', inputMode: 'text' }
        ],
        correctAnswers: { g_diff: String(10), g_trend: ['decreasing', 'declining', 'falls', 'falling'] },
        workingRequired: true,
        taskKeys: { correctResponse: 'reduction 10 mm, trend: decreasing', keyRationale: '2024 runoff minus 2025 runoff equals the reduction.', distractorRationales: {}, workedSolution: '100 − 90 = 10 mm.' }
    }));
    return out;
};

export const MOCK_V3_SAMPLE_BLUEPRINT: ExamBlueprint = buildExamBlueprint({
    examId: 'exam_mock_v3_full_catalog_001',
    examName: 'English Proficiency Practice Test',
    examFamily: 'General English',
    provider: '',
    candidate: { reference: 'Sample Learner', name: 'Sample Learner' },
    locale: 'en',
    deliveryMode: 'computer',
    totalDurationMinutes: 120,
    passPercent: 65,
    qualityAssurance: {
        reviewedBy: 'QA Lead',
        validationDate: '2026-09-01',
        approvedBy: 'Assessment Team',
        standards: ['V3 blueprint schema', '2026 task-type catalog']
    },
    sourceRegistry: [
        { sourceId: 'src_water_001', title: 'Urban Water & Sustainable Cities (sample source text)', url: 'https://example.com/urban-water', retrievedAt: '2026-09-01', license: 'Sample — replace with your own source' }
    ],
    sections: [
        {
            id: 'sec_reading', title: 'Section 1 — Reading & Vocabulary', type: 'reading',
            instructions: 'Read the passages about urban water systems and complete the tasks. One question per task type, 15 minutes — just like a real exam section.',
            durationMinutes: 55, itemCount: 140,
            allowBackNavigation: true, allowFlagging: true, allowHighlighting: true, allowNotepad: true, allowCalculator: true,
            questions: readingTypes()
        },
        {
            id: 'sec_listening', title: 'Section 2 — Listening', type: 'listening',
            instructions: 'Play the audio and complete the listening tasks. Transcripts are revealed after submission.',
            durationMinutes: 25, itemCount: 20,
            audio: { globalIntroText: 'You will hear a short lecture with two speakers.', playOnce: false, calibrationRequired: true },
            allowBackNavigation: true, allowFlagging: true, allowHighlighting: true, allowNotepad: true, allowCalculator: false,
            questions: listeningTypes()
        },
        {
            id: 'sec_writing_speaking', title: 'Section 3 — Writing & Speaking', type: 'writing',
            instructions: 'Complete the writing tasks and record your speaking responses.',
            durationMinutes: 25, itemCount: 40,
            writing: { minWords: 60, recommendedWords: 90, rubric: ['Task achievement', 'Coherence and cohesion', 'Vocabulary', 'Grammar'] },
            speaking: { prepSeconds: 15, responseSeconds: 60, allowRerecord: true },
            allowBackNavigation: true, allowFlagging: true, allowHighlighting: true, allowNotepad: true, allowCalculator: false,
            questions: writingSpeakingTypes()
        },
        {
            id: 'sec_quant', title: 'Section 4 — Quantitative & Interactive', type: 'math',
            instructions: 'Answer the numeric, diagram, and interactive tasks.',
            durationMinutes: 15, itemCount: 40,
            allowBackNavigation: true, allowFlagging: true, allowHighlighting: true, allowNotepad: true, allowCalculator: true,
            questions: quantitativeTypes()
        }
    ],
    scoring: {
        scale: 'percent',
        passingLogic: 'overall',
        partialCredit: true,
        sectionWeights: { sec_reading: 1, sec_listening: 1, sec_writing_speaking: 1, sec_quant: 1 },
        bandMapping: [
            { minPercent: 90, label: 'Excellent' },
            { minPercent: 75, label: 'Strong' },
            { minPercent: 60, label: 'Competent' },
            { minPercent: 0, label: 'Developing' }
        ],
        writingRubrics: [
            { id: 'task', label: 'Task Achievement', max: 5, descriptors: [{ score: 5, description: 'Fully addresses the task with well-developed ideas.' }, { score: 3, description: 'Addresses the task but ideas need development.' }, { score: 1, description: 'Does not address the task.' }] }
        ],
        speakingRubrics: [
            { id: 'fluency', label: 'Fluency & Coherence', max: 5, descriptors: [{ score: 5, description: 'Fluent with minimal hesitation.' }, { score: 3, description: 'Some hesitation and repetition.' }, { score: 1, description: 'Frequent halting.' }] }
        ]
    }
});

export const MOCK_V3_SAMPLE_JSON = JSON.stringify(MOCK_V3_SAMPLE_BLUEPRINT, null, 2);
