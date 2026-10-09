import { ClassmateCharacter, CLASSMATE_CHARACTERS, getClassmateCharacterById, getFriendshipMeterStatus } from './classmateCharacters';
import { getClassmateChatHtml } from './classmateChatEngine';

/**
 * CLASSMATE STANDALONE EXPORT
 * ---------------------------
 * Turns a generated Classmate scenario (the JSON the Classmate lesson type
 * returns) into the standalone HTML5 companion chat that tutors paste into
 * Media Manager → Classmate → "Inject Custom HTML5 / JSON", or open as a file.
 *
 * The rendering itself lives in utils/classmateChatEngine.ts — the same engine
 * the in-lesson widget uses — so what you preview inside a lesson and what you
 * paste into the Classmate tool can never drift apart.
 */

function characterToEngineChar(character: ClassmateCharacter): any {
    return {
        id: character.id,
        code: character.code,
        name: character.name,
        avatarUrl: character.avatarUrl,
        avatarFallback: character.avatarFallback,
        voice: character.voice,
        gender: character.gender,
        title: character.role,
        nationality: character.nationality
    };
}

function learnerL1(learner?: any): string {
    if (!learner) return 'Spanish';
    return learner.l1Name || learner.nativeLanguage || learner.l1 || learner.l1Language || 'Spanish';
}

/**
 * Full standalone HTML5 document for a scenario object. `frame: true` gives the
 * export the premium device frame when opened in its own browser tab; the frame
 * collapses automatically below 720px so it also fills the Classmate side panel.
 */
export function generateClassmateHtml5(rawScenario: any, customChar?: ClassmateCharacter, learner?: any): string {
    const scenario = rawScenario || {};
    const charId = (scenario.character && scenario.character.id) || customChar?.id || 'maya_lin';
    const character: ClassmateCharacter = customChar || getClassmateCharacterById(charId);

    const engineChar = characterToEngineChar(character);
    // A generated scenario may carry its own character override — respect it.
    if (scenario.character) {
        if (scenario.character.name) engineChar.name = scenario.character.name;
        if (scenario.character.avatar) engineChar.avatarUrl = scenario.character.avatar;
        if (scenario.character.avatarFallback) engineChar.avatarFallback = scenario.character.avatarFallback;
        if (scenario.character.voice) engineChar.voice = scenario.character.voice;
        if (scenario.character.tone) engineChar.tone = scenario.character.tone;
        if (scenario.character.title) engineChar.title = scenario.character.title;
    }

    const initialFriendship = (scenario && scenario.friendshipInitial !== undefined)
        ? scenario.friendshipInitial
        : character.initialFriendship;

    return getClassmateChatHtml(engineChar, {
        frame: true,
        scenario: scenario,
        appletHtml: '',
        learnerName: (learner && learner.name) || 'Alex',
        learnerL1: learnerL1(learner),
        translationLevel: learner?.translationLevel || 'minimal',
        friendshipLevel: initialFriendship,
        mode: 'explainer'
    });
}

/** Backwards-compatible alias — the engine above is the single renderer now. */
export function generateStandaloneClassmateHtml(scenarioData: any, customChar?: ClassmateCharacter, learner?: any): string {
    return generateClassmateHtml5(scenarioData, customChar, learner);
}

export function handleSaveClassmateAsHtml(scenarioData: any, learner: any, charObj?: ClassmateCharacter, filename?: string) {
    const char = charObj || getClassmateCharacterById(scenarioData?.character?.id || 'maya_lin');
    const safeName = (learner?.name || 'Student').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    const charName = char.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    const actualFilename = filename || `Classmate_${charName}_${safeName}.html`;

    const html = generateClassmateHtml5(scenarioData, char, learner);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = actualFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Learner-ready ZIP alongside the plain HTML file
    import('./htmlZip').then(m => m.downloadZipOfHtml(html, actualFilename)).catch(() => {});
}

/**
 * Copies the paste-ready HTML5 straight to the clipboard so the tutor can drop
 * it into the Classmate panel without ever touching the filesystem.
 */
export async function copyClassmateHtml5(scenarioData: any, charObj?: ClassmateCharacter, learner?: any): Promise<boolean> {
    const html = generateClassmateHtml5(scenarioData, charObj, learner);
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(html);
            return true;
        }
    } catch (e) { /* falls through to the textarea trick */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = html;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch (e) {
        return false;
    }
}

/**
 * The sample scenario tutors load in Lesson Creator → 🤝 Classmate. It walks
 * through every capability the engine renders (table, gif, image, voice note,
 * audio, YouTube, video, sticker, all four graded test types, a poll, a
 * branching roleplay and the recap) using the selected companion's identity.
 */
export function getDefaultClassmateSampleJson(characterId: string = 'maya_lin', learnerName: string = 'Learner', customList?: any[]): any {
    const char = getClassmateCharacterById(characterId, customList);
    const first = char.name.split(' ')[0];
    const l1 = 'Spanish';

    return {
        title: `${char.name} Interactive ESL Session`,
        character: {
            id: char.id,
            name: char.name,
            avatar: char.avatarUrl,
            voice: char.voice,
            tone: char.tone,
            title: char.role
        },
        friendshipInitial: char.initialFriendship,
        activities: [
            {
                id: 'act_1',
                title: '1. Kickoff & Keyword Table',
                steps: [
                    {
                        id: 'step_1_1',
                        sender: char.name,
                        type: 'message',
                        text: `Hey ${learnerName}! 👋 Let's open with the six keywords we will recycle for the rest of the session.`,
                        mediaType: 'table',
                        mediaContent: `<table class="tg-table"><thead><tr><th>Key term</th><th>Say it</th><th>L1 hint (${l1})</th><th>Meaning</th></tr></thead><tbody><tr><td><b>Recall</b></td><td>/rɪˈkɔːl/</td><td>Recordar</td><td>Bringing something back to mind on purpose</td></tr><tr><td><b>Nuance</b></td><td>/ˈnjuː.ɑːns/</td><td>Matiz</td><td>A small but important difference in meaning</td></tr><tr><td><b>Articulate</b></td><td>/ɑːˈtɪk.jə.lət/</td><td>Elocuente</td><td>Able to express ideas clearly and fluently</td></tr><tr><td><b>Paraphrase</b></td><td>/ˈpær.ə.freɪz/</td><td>Parafrasear</td><td>Saying the same idea with different words</td></tr><tr><td><b>Collocation</b></td><td>/ˌkɒl.əˈkeɪ.ʃən/</td><td>Colocación</td><td>Words that naturally go together</td></tr><tr><td><b>Register</b></td><td>/ˈredʒ.ɪ.stər/</td><td>Registro</td><td>How formal or casual the language is</td></tr></tbody></table>`,
                        mediaCaption: 'Recycle these six words in every activity — we test them at the end.',
                        readAloudText: `Hey ${learnerName}! Let's open with the six keywords we will recycle for the rest of the session.`,
                        options: [
                            {
                                id: 'opt_1_1_a',
                                text: `✨ Crystal clear, ${first} — let's test my memory.`,
                                friendshipChange: 2,
                                feedbackSpeech: 'Love that energy. We have a full test lab waiting for you.',
                                nextStepId: 'step_1_2'
                            },
                            {
                                id: 'opt_1_1_b',
                                text: `🤔 Which of these do I already use without noticing?`,
                                friendshipChange: 3,
                                feedbackSpeech: 'Great question. Most learners already say recall and paraphrase — they just do not name them yet.',
                                nextStepId: 'step_1_2'
                            }
                        ]
                    },
                    {
                        id: 'step_1_2',
                        sender: char.name,
                        type: 'message',
                        text: `That is exactly the energy I like to see 🔥`,
                        mediaType: 'gif',
                        mediaUrl: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
                        mediaCaption: 'Confidence level: unlocked.',
                        readAloudText: 'That is exactly the energy I like to see.',
                        options: [
                            {
                                id: 'opt_1_2_a',
                                text: '📝 Bring on the first test.',
                                friendshipChange: 2,
                                feedbackSpeech: 'Straight to it — here comes your first graded test.',
                                nextStepId: 'step_1_3'
                            }
                        ]
                    },
                    {
                        id: 'step_1_3',
                        sender: char.name,
                        type: 'quiz_single',
                        text: '📝 <b>Test 1 · Quick check.</b> Which word means a small but important difference in meaning?',
                        readAloudText: 'Test one. Which word means a small but important difference in meaning?',
                        explanation: 'Nuance — a small but important difference. Ask for nuance when a detail changes the whole meaning.',
                        options: [
                            { id: 'q1_a', text: 'A) Register', isCorrect: false, friendshipChange: -1, feedbackSpeech: 'Register is about how formal the language is. The answer is nuance.' },
                            { id: 'q1_b', text: 'B) Nuance', isCorrect: true, friendshipChange: 3, feedbackSpeech: 'Exactly — nuance, a small but important difference in meaning.' },
                            { id: 'q1_c', text: 'C) Recall', isCorrect: false, friendshipChange: -1, feedbackSpeech: 'Close — recall is memory retrieval. Nuance is the meaning difference.' }
                        ]
                    }
                ]
            },
            {
                id: 'act_2',
                title: '2. Listen, Watch & Shadow',
                steps: [
                    {
                        id: 'step_2_1',
                        sender: char.name,
                        type: 'message',
                        text: 'Press play on this voice note and shadow me — copy my rhythm sentence by sentence.',
                        mediaType: 'voice',
                        mediaContent: 'I used to read my notes five times and still forget everything. Then I started paraphrasing out loud between sessions, and the words finally stayed.',
                        mediaCaption: 'Voice note · shadow it twice',
                        readAloudText: 'Press play on this voice note and shadow me. Copy my rhythm sentence by sentence.',
                        options: [
                            {
                                id: 'opt_2_1_a',
                                text: '🎧 Shadowed it twice — paraphrasing feels natural now.',
                                friendshipChange: 3,
                                feedbackSpeech: 'Beautiful. Shadowing plus paraphrasing is how pronunciation and meaning lock together.',
                                nextStepId: 'step_2_2'
                            }
                        ]
                    },
                    {
                        id: 'step_2_2',
                        sender: char.name,
                        type: 'message',
                        text: 'Here is a short clip on the same topic — notice how the speaker pauses before every keyword.',
                        mediaType: 'youtube',
                        mediaUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
                        mediaCaption: 'Watch 0:00–1:00 only. We review it together after.',
                        readAloudText: 'Here is a short clip on the same topic. Notice how the speaker pauses before every keyword.',
                        options: [
                            {
                                id: 'opt_2_2_a',
                                text: '👀 Those pauses gave me time to paraphrase in my head.',
                                friendshipChange: 2,
                                feedbackSpeech: 'That pause is your thinking time — use it in real conversations too.',
                                nextStepId: 'step_2_3'
                            }
                        ]
                    },
                    {
                        id: 'step_2_3',
                        sender: char.name,
                        type: 'message',
                        text: 'And the video version, so you hear the same ideas at natural speed.',
                        mediaType: 'video',
                        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
                        mediaCaption: 'Video · watch the gesture at 0:06.',
                        readAloudText: 'And the video version, so you hear the same ideas at natural speed.',
                        options: [
                            {
                                id: 'opt_2_3_a',
                                text: '🎬 I caught the gesture — it replaces a whole sentence.',
                                friendshipChange: 3,
                                feedbackSpeech: 'Exactly. Gesture plus collocation is what makes you sound fluent, not perfect grammar.',
                                nextStepId: 'step_2_4'
                            }
                        ]
                    },
                    {
                        id: 'step_2_4',
                        sender: char.name,
                        type: 'message',
                        text: 'One image to anchor the whole method: one page, one timer, one idea.',
                        mediaType: 'image',
                        mediaUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80',
                        mediaCaption: 'Describe this in one sentence using "collocation".',
                        readAloudText: 'One image to anchor the whole method. One page, one timer, one idea.',
                        options: [
                            {
                                id: 'opt_2_4_a',
                                text: '🪑 "A strong collocation with this desk is a focused study session."',
                                friendshipChange: 4,
                                feedbackSpeech: 'That is a genuinely natural sentence — reuse it in your next lesson.',
                                nextStepId: 'step_3_1'
                            }
                        ]
                    }
                ]
            },
            {
                id: 'act_3',
                title: '3. Test Lab',
                steps: [
                    {
                        id: 'step_3_1',
                        sender: char.name,
                        type: 'quiz_multi',
                        text: '📝 <b>Test 2 · Select all that apply.</b> Which TWO habits make new vocabulary stick?',
                        readAloudText: 'Test two. Select all that apply. Which two habits make new vocabulary stick?',
                        explanation: 'Paraphrasing out loud and spacing short sessions over days are the two evidence-backed winners.',
                        options: [
                            { id: 'm1', text: 'Paraphrasing the new words out loud', isCorrect: true, feedbackSpeech: 'Yes — producing the language beats re-reading it.' },
                            { id: 'm2', text: 'Re-reading the same notes five times', isCorrect: false, feedbackSpeech: 'That feels productive but it is the weakest method.' },
                            { id: 'm3', text: 'Spacing short sessions across several days', isCorrect: true, feedbackSpeech: 'Correct — that is spacing.' }
                        ]
                    },
                    {
                        id: 'step_3_2',
                        sender: char.name,
                        type: 'true_false',
                        text: '⚡ <b>Test 3 · True or False.</b> "Register" means how formal or casual the language is.',
                        readAloudText: 'Test three. True or false. Register means how formal or casual the language is.',
                        explanation: 'True. Register is exactly that — the formality level you choose.',
                        options: [
                            { id: 'tf_true', text: 'TRUE', isCorrect: true, friendshipChange: 3, feedbackSpeech: 'Correct! Register is the formality level of your language.' },
                            { id: 'tf_false', text: 'FALSE', isCorrect: false, friendshipChange: -1, feedbackSpeech: 'Not this time — register really does mean formality level.' }
                        ]
                    },
                    {
                        id: 'step_3_3',
                        sender: char.name,
                        type: 'sorting',
                        text: '📝 <b>Test 4 · Put the study routine in the right order.</b> What happens first?',
                        readAloudText: 'Test four. Put the study routine in the right order. What happens first?',
                        explanation: 'Test first → review only what you missed → schedule the next spaced session.',
                        correctOrder: ['s1', 's2', 's3'],
                        options: [
                            { id: 's2', text: 'Review only the items you got wrong' },
                            { id: 's1', text: 'Test yourself with the page closed' },
                            { id: 's3', text: 'Schedule the next short session' }
                        ]
                    },
                    {
                        id: 'step_3_4',
                        sender: char.name,
                        type: 'poll',
                        text: '💬 <b>Quick poll.</b> Which habit will you try this week?',
                        readAloudText: 'Quick poll. Which habit will you try this week?',
                        options: [
                            { id: 'p1', text: 'Paraphrasing out loud', percent: 46, friendshipChange: 2, feedbackSpeech: 'The most popular choice — and the strongest single change.' },
                            { id: 'p2', text: 'Short daily sessions', percent: 38, friendshipChange: 2, feedbackSpeech: 'Spacing is the quiet hero. Consistency beats intensity.' },
                            { id: 'p3', text: 'Recording myself and comparing', percent: 16, friendshipChange: 1, feedbackSpeech: 'Ambitious — do it once your routine is stable.' }
                        ]
                    }
                ]
            },
            {
                id: 'act_4',
                title: '4. Roleplay',
                steps: [
                    {
                        id: 'step_4_1',
                        sender: char.name,
                        type: 'branching',
                        text: `🌟 <b>Roleplay.</b> Your manager asks why your English sounds sharper in meetings. What do you say?`,
                        readAloudText: 'Roleplay. Your manager asks why your English sounds sharper in meetings. What do you say?',
                        options: [
                            { id: 'br_a', text: '🙂 "I paraphrase the key terms out loud before every meeting, so the register stays professional."', friendshipChange: 5, feedbackSpeech: 'Confident, professional, and two target words used correctly. Excellent.', nextStepId: 'step_5_1' },
                            { id: 'br_b', text: '😅 "Honestly? I test myself first and get things wrong on purpose."', friendshipChange: 4, feedbackSpeech: 'Honest and effective. Add the word retrieval next time and it sounds even sharper.', nextStepId: 'step_5_1' },
                            { id: 'br_c', text: '🤨 "I have no idea, it just happens."', friendshipChange: -1, feedbackSpeech: 'Let us make that answer stronger — name the habit and you sound twice as prepared.', nextStepId: 'step_5_1' }
                        ]
                    }
                ]
            },
            {
                id: 'act_5',
                title: '5. Wrap-Up & Recap',
                steps: [
                    {
                        id: 'step_5_1',
                        sender: char.name,
                        type: 'message',
                        text: `Look at you go! 🎉 Six keywords recycled, four graded tests, and one genuinely good roleplay answer.`,
                        mediaType: 'sticker',
                        mediaContent: '🎉',
                        readAloudText: 'Look at you go! Six keywords recycled, four graded tests, and one genuinely good roleplay answer.',
                        options: [
                            {
                                id: 'opt_5_1_a',
                                text: '📊 Show me my session recap.',
                                friendshipChange: 3,
                                feedbackSpeech: 'Here comes your recap — you can reopen it any time from the chart button above.',
                                nextStepId: null,
                                showRecap: true
                            }
                        ]
                    }
                ]
            }
        ]
    };
}
