/**
 * CLASSMATE CHAT ENGINE — "Telegram 2026" premium chat screen (LIGHT theme).
 * ------------------------------------------------------------------------
 * ONE canonical renderer for the AI Classmate companion. It is used by:
 *
 *   1. The in-lesson Classmate widget  (utils/html/mediaManager.ts → the
 *      `window.getDefaultClassmateHtml` bridge that the annotations toolbar and
 *      the Media Manager side panel call).
 *   2. The Classmate lesson type in Lesson Creator → the standalone HTML5 file
 *      (utils/classmateStandalone.ts) that tutors paste straight into
 *      Media Manager → Classmate → "Inject Custom HTML5 / JSON".
 *
 * ⚠️ getClassmateChatHtml() is serialized into the generated lesson HTML with
 * Function.prototype.toString(), so it MUST stay completely self-contained:
 * no imports, no module-level constants, no sibling helper functions, and no
 * backticks or ${...} inside the returned template. Every helper lives inside
 * the function body on purpose. Breaking that rule silently breaks the widget
 * inside every exported lesson.
 *
 * Supported scenario JSON (only activities[].steps[] is required):
 *   { title, character:{id,name,avatar,avatarFallback,voice,title},
 *     friendshipInitial, activities:[ { id, title, steps:[ step ] } ] }
 *
 * step: { id, sender, type, text, readAloudText, mediaType, mediaUrl,
 *         mediaContent, mediaCaption, mediaHeight, gameType, pairs, word, hint,
 *         correctOrder, explanation, feedbackSpeech, freeReply,
 *         options:[ { id, text, isCorrect, friendshipChange, feedbackSpeech,
 *                     nextStepId, percent, term, definition, showRecap } ] }
 *
 * step.type: message · quiz_single · quiz_multi · true_false · sorting · poll ·
 *            branching   (anything else renders as a plain message)
 *
 * step.mediaType:
 *   image · gif · video · youtube · vimeo · audio · voice · table · sticker ·
 *   soundcloud · spotify · embed (any website: BBC, Cambridge, …) · code · link ·
 *   game (gameType: match | memory | scramble)
 */
export function getClassmateChatHtml(charObj?: any, state?: any): string {
    // ─────────────────────────────────────────────────────────────────────
    // 1. Character + session state
    // ─────────────────────────────────────────────────────────────────────
    var character: any = charObj || {};
    var cState: any = state || {};

    var name: string = character.name || 'Sophia Chen';
    var avatar: string = character.avatarUrl || character.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
    var avatarFallback: string = character.avatarFallback || '';
    var roleTitle: string = character.title || character.role || ((character.nationality || 'American') + ' ESL Classmate');
    var voiceName: string = character.voice || '';
    var gender: string = character.gender || 'female';
    var charId: string = character.id || character.code || 'classmate';

    var learnerName: string = cState.learnerName || 'Alex';
    var learnerL1: string = cState.learnerL1 || 'Spanish';
    var translationLevel: string = cState.translationLevel || 'minimal';
    var friendshipInitial: number = (typeof cState.friendshipLevel === 'number' && isFinite(cState.friendshipLevel)) ? cState.friendshipLevel : 35;
    var framed: boolean = !!cState.frame;
    // When the widget lives inside the Classmate side panel the panel renders the
    // ONE header (avatar · name · online role · relationship meter), so the chat
    // template must not print a second copy of it.
    var headerless: boolean = !!cState.headerless;

    // ─────────────────────────────────────────────────────────────────────
    // 2. A complete HTML document pasted by a tutor wins outright — the
    //    Classmate panel accepts either raw HTML5 or scenario JSON.
    // ─────────────────────────────────────────────────────────────────────
    var rawApplet: string = (typeof cState.appletHtml === 'string') ? cState.appletHtml.trim() : '';
    if (/^<!DOCTYPE\s+html/i.test(rawApplet) || /^<html\b/i.test(rawApplet)) {
        return rawApplet;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. Pull scenario JSON out of whatever the tutor pasted: a plain object,
    //    a ```json fence, prose with JSON buried in it, smart quotes, trailing
    //    commas — all of it has to survive, because tutors paste raw AI replies.
    // ─────────────────────────────────────────────────────────────────────
    function extractJson(source: any): any {
        if (!source) return null;
        if (typeof source === 'object') return source;

        var text = String(source).trim();
        if (!text) return null;

        if (text.indexOf('```') !== -1) {
            var fenced = text.match(/```(?:json|javascript|js)?\s*([\s\S]*?)\s*```/i);
            if (fenced && fenced[1]) {
                text = fenced[1].trim();
            } else {
                var firstFence = text.indexOf('```');
                var lastFence = text.lastIndexOf('```');
                if (firstFence !== -1 && lastFence > firstFence) {
                    text = text.substring(firstFence, lastFence).replace(/^```(?:json|javascript|js)?\s*/i, '').trim();
                }
            }
        } else {
            var firstBrace = text.indexOf('{');
            var firstBracket = text.indexOf('[');
            var startIdx = -1;
            if (firstBrace !== -1 && firstBracket !== -1) startIdx = Math.min(firstBrace, firstBracket);
            else if (firstBrace !== -1) startIdx = firstBrace;
            else if (firstBracket !== -1) startIdx = firstBracket;

            if (startIdx !== -1) {
                var lastBrace = text.lastIndexOf('}');
                var lastBracket = text.lastIndexOf(']');
                var endIdx = Math.max(lastBrace, lastBracket);
                if (endIdx > startIdx) text = text.substring(startIdx, endIdx + 1).trim();
            }
        }

        text = text.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

        try {
            return JSON.parse(text);
        } catch (e1) {
            try {
                return JSON.parse(text.replace(/,\s*([\}\]])/g, '$1'));
            } catch (e2) {
                return null;
            }
        }
    }

    function normalizeScenario(data: any): any {
        if (!data) return null;

        var activities: any[] = [];
        if (Array.isArray(data)) {
            if (data.length && data[0] && Array.isArray(data[0].steps)) {
                activities = data.slice();
            } else {
                activities = [{ id: 'act_1', title: 'Interactive Session', steps: data.slice() }];
            }
        } else if (Array.isArray(data.activities) && data.activities.length) {
            activities = data.activities.slice();
        } else if (Array.isArray(data.steps) && data.steps.length) {
            activities = [{ id: 'act_1', title: data.title || 'Interactive Session', steps: data.steps.slice() }];
        }

        activities = activities
            .filter(function (act: any) { return act && Array.isArray(act.steps) && act.steps.length; })
            .map(function (act: any, idx: number) {
                return {
                    id: act.id || ('act_' + (idx + 1)),
                    title: act.title || ('Segment ' + (idx + 1)),
                    steps: act.steps.map(function (step: any, sIdx: number) {
                        if (!step || typeof step !== 'object') step = { text: String(step || '') };
                        if (!step.id) step.id = 'step_' + (idx + 1) + '_' + (sIdx + 1);
                        if (!step.type) step.type = 'message';
                        if (!Array.isArray(step.options)) step.options = [];
                        return step;
                    })
                };
            });

        if (!activities.length) return null;

        return {
            title: (data && !Array.isArray(data) && data.title) || (activities[0] && activities[0].title) || 'Interactive Session',
            character: (data && !Array.isArray(data) && data.character) || {},
            friendshipInitial: (data && !Array.isArray(data) && data.friendshipInitial !== undefined) ? data.friendshipInitial : undefined,
            activities: activities
        };
    }

    var parsedScenario = normalizeScenario(extractJson(cState.scenario)) || normalizeScenario(extractJson(cState.appletHtml));

    // ─────────────────────────────────────────────────────────────────────
    // 4. Sample scenario — shown when no JSON is injected yet. It deliberately
    //    exercises EVERY capability (table, gif, image, audio, voice note,
    //    YouTube, video, SoundCloud, website embed, sticker, all four graded
    //    test types, a poll, a memory game, a word scramble, a branching
    //    roleplay and the recap) so a tutor can see what the prompt produces.
    // ─────────────────────────────────────────────────────────────────────
    var firstName = (name.split(' ')[0] || name);

    function buildSampleScenario(): any {
        return {
            title: name + ' Interactive Study Session',
            character: { id: charId, name: name, avatar: avatar, voice: voiceName, title: roleTitle },
            friendshipInitial: friendshipInitial,
            activities: [
                {
                    id: 'act_1',
                    title: '1 · Kickoff & Keyword Table',
                    steps: [
                        {
                            id: 'step_1_1',
                            sender: name,
                            type: 'message',
                            text: 'Hey ' + learnerName + '! 👋 Welcome back — today we are building real fluency with <b>six keywords</b>, rich media and a quick test lab. Here is the vocabulary we will recycle all session:',
                            readAloudText: 'Hey ' + learnerName + '! Welcome back. Today we are building real fluency with six keywords, rich media and a quick test lab. Here is the vocabulary we will recycle all session.',
                            mediaType: 'table',
                            mediaContent: '<table class="tg-table"><thead><tr><th>Key term</th><th>Say it</th><th>L1 hint (' + learnerL1 + ')</th><th>Meaning</th></tr></thead><tbody>' +
                                '<tr><td><b>Recall</b></td><td>/rɪˈkɔːl/</td><td>Recordar</td><td>To bring something back to mind on purpose</td></tr>' +
                                '<tr><td><b>Chunk</b></td><td>/tʃʌŋk/</td><td>Bloque</td><td>A small group of words learned as one unit</td></tr>' +
                                '<tr><td><b>Retrieval</b></td><td>/rɪˈtriː.vəl/</td><td>Recuperación</td><td>The act of pulling information out of memory</td></tr>' +
                                '<tr><td><b>Spacing</b></td><td>/ˈspeɪ.sɪŋ/</td><td>Espaciamiento</td><td>Studying in short sessions spread over days</td></tr>' +
                                '<tr><td><b>Interleave</b></td><td>/ˌɪn.təˈliːv/</td><td>Alternar</td><td>Mixing different topics inside one session</td></tr>' +
                                '<tr><td><b>Fluency</b></td><td>/ˈfluː.ən.si/</td><td>Fluidez</td><td>Speaking smoothly without stopping to translate</td></tr>' +
                                '</tbody></table>',
                            mediaCaption: 'Core vocabulary — we recycle every one of these before we finish.',
                            options: [
                                { id: 'opt_1_1a', text: '✨ Looks clear! Let us test my memory.', friendshipChange: 2, feedbackSpeech: 'Love that energy — straight into the test lab later!', nextStepId: 'step_1_2' },
                                { id: 'opt_1_1b', text: '🤔 Can you use "retrieval" in a real sentence?', friendshipChange: 3, feedbackSpeech: 'Sure! Retrieval means pulling a word out of memory instead of re-reading it.', nextStepId: 'step_1_2' }
                            ]
                        },
                        {
                            id: 'step_1_2',
                            sender: name,
                            type: 'message',
                            text: 'Look at the reaction here — that is exactly the feeling we want today 😄',
                            readAloudText: 'Look at the reaction here. That is exactly the feeling we want today.',
                            mediaType: 'gif',
                            mediaUrl: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
                            mediaCaption: 'Confidence unlocked.',
                            options: [
                                { id: 'opt_1_2a', text: '🔥 Ready for the first test.', friendshipChange: 2, feedbackSpeech: 'Perfect — here comes your first graded test.', nextStepId: 'step_1_3' }
                            ]
                        },
                        {
                            id: 'step_1_3',
                            sender: name,
                            type: 'quiz_single',
                            text: '📝 <b>Test 1 · Quick check.</b> Which word means studying in short sessions spread over several days?',
                            readAloudText: 'Test one, quick check. Which word means studying in short sessions spread over several days?',
                            explanation: 'Spacing = spreading short sessions over days. It beats one long cram.',
                            options: [
                                { id: 'q1_a', text: 'A) Fluency', isCorrect: false, friendshipChange: -1, feedbackSpeech: 'Not quite — fluency is about speaking smoothly. The answer is spacing.' },
                                { id: 'q1_b', text: 'B) Spacing', isCorrect: true, friendshipChange: 3, feedbackSpeech: 'Yes! Spacing is short sessions spread over several days.' },
                                { id: 'q1_c', text: 'C) Interleave', isCorrect: false, friendshipChange: -1, feedbackSpeech: 'Close! Interleaving is mixing topics inside one session.' }
                            ]
                        }
                    ]
                },
                {
                    id: 'act_2',
                    title: '2 · Listen, Watch & Read',
                    steps: [
                        {
                            id: 'step_2_1',
                            sender: name,
                            type: 'message',
                            text: 'Time to train your ear. Press play on this voice note and shadow me — copy my rhythm exactly.',
                            readAloudText: 'Time to train your ear. Press play on this voice note and shadow me. Copy my rhythm exactly.',
                            mediaType: 'voice',
                            mediaContent: 'I used to read my notes five times. Nothing stuck. Then I started testing myself first — ugly, slow, and honestly a bit annoying — and suddenly the words stayed.',
                            mediaCaption: 'Voice note · tap play, then shadow it',
                            options: [
                                { id: 'opt_2_1a', text: '🎧 Shadowed it twice — the rhythm feels natural now.', friendshipChange: 3, feedbackSpeech: 'Beautiful. Shadowing is how pronunciation locks in.', nextStepId: 'step_2_2' },
                                { id: 'opt_2_1b', text: '🔊 Play it again a little slower, please.', friendshipChange: 1, feedbackSpeech: 'Of course — every bubble has a replay button. Let us keep going.', nextStepId: 'step_2_2' }
                            ]
                        },
                        {
                            id: 'step_2_2',
                            sender: name,
                            type: 'message',
                            text: 'Here is a real audio file to work with — listen for the stressed syllables.',
                            readAloudText: 'Here is a real audio file to work with. Listen for the stressed syllables.',
                            mediaType: 'audio',
                            mediaUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=inspiring-cinematic-ambient-116199.mp3',
                            mediaCaption: 'Ambient study track · free Pixabay audio',
                            options: [
                                { id: 'opt_2_2a', text: '🎵 Nice — the music makes the vocabulary stick faster.', friendshipChange: 2, feedbackSpeech: 'Music plus repetition is a real memory trick.', nextStepId: 'step_2_3' }
                            ]
                        },
                        {
                            id: 'step_2_3',
                            sender: name,
                            type: 'message',
                            text: 'And a SoundCloud embed, so you can drop any podcast or song into a lesson the same way.',
                            readAloudText: 'And a SoundCloud embed, so you can drop any podcast or song into a lesson the same way.',
                            mediaType: 'soundcloud',
                            mediaUrl: 'https://soundcloud.com/forss/flickermood',
                            mediaCaption: 'SoundCloud player · swap the URL for any track',
                            options: [
                                { id: 'opt_2_3a', text: '🎧 Love it — I will bring my own track next time.', friendshipChange: 2, feedbackSpeech: 'Do that. Bring a song and I will build a whole lesson around it.', nextStepId: 'step_2_4' }
                            ]
                        },
                        {
                            id: 'step_2_4',
                            sender: name,
                            type: 'message',
                            text: 'Here is a video explainer on the same idea — note how the speaker repeats "retrieval" three times.',
                            readAloudText: 'Here is a video explainer on the same idea. Note how the speaker repeats retrieval three times.',
                            mediaType: 'youtube',
                            mediaUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
                            mediaCaption: 'Watch 0:00–1:00 only. We review it together.',
                            options: [
                                { id: 'opt_2_4a', text: '👀 Got it — the repetition is the point.', friendshipChange: 2, feedbackSpeech: 'Exactly. Repetition with effort is the whole trick.', nextStepId: 'step_2_5' }
                            ]
                        },
                        {
                            id: 'step_2_5',
                            sender: name,
                            type: 'message',
                            text: 'A direct video file works too — no ads, no cookie banners, just the clip.',
                            readAloudText: 'A direct video file works too. No ads and no cookie banners, just the clip.',
                            mediaType: 'video',
                            mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
                            mediaCaption: 'Video file · watch the pause at 0:04',
                            options: [
                                { id: 'opt_2_5a', text: '🎬 Those pauses gave me time to think in English.', friendshipChange: 2, feedbackSpeech: 'That pause is your thinking time — use it in real conversations too.', nextStepId: 'step_2_6' }
                            ]
                        },
                        {
                            id: 'step_2_6',
                            sender: name,
                            type: 'message',
                            text: 'And because we can embed a live site, here is a real BBC Learning English page inside the chat. Scroll it, then come back to me.',
                            readAloudText: 'And because we can embed a live site, here is a real BBC Learning English page inside the chat. Scroll it, then come back to me.',
                            mediaType: 'embed',
                            mediaUrl: 'https://www.bbc.co.uk/learningenglish/',
                            mediaHeight: '300',
                            mediaCaption: 'Live website embed · BBC Learning English',
                            options: [
                                { id: 'opt_2_6a', text: '🌍 That is brilliant — real reading material inside the chat.', friendshipChange: 3, feedbackSpeech: 'Any site that allows embedding works: BBC, Cambridge, news, your own exercises.', nextStepId: 'step_3_1' }
                            ]
                        }
                    ]
                },
                {
                    id: 'act_3',
                    title: '3 · Test Lab',
                    steps: [
                        {
                            id: 'step_3_1',
                            sender: name,
                            type: 'quiz_multi',
                            text: '📝 <b>Test 2 · Select all that apply.</b> Which TWO habits actually make vocabulary stick?',
                            readAloudText: 'Test two. Select all that apply. Which two habits actually make vocabulary stick?',
                            explanation: 'Retrieval (testing yourself) and spacing (short sessions over days) are the two evidence-backed winners.',
                            options: [
                                { id: 'm1', text: 'Testing yourself before re-reading the notes', isCorrect: true, feedbackSpeech: 'Yes — retrieval first.' },
                                { id: 'm2', text: 'Re-reading your notes five times in a row', isCorrect: false, feedbackSpeech: 'That one feels productive but it is the weakest method.' },
                                { id: 'm3', text: 'Spreading short sessions across several days', isCorrect: true, feedbackSpeech: 'Correct — that is spacing.' }
                            ]
                        },
                        {
                            id: 'step_3_2',
                            sender: name,
                            type: 'true_false',
                            text: '⚡ <b>Test 3 · True or False.</b> "Interleaving" means studying one single topic for three hours without a break.',
                            readAloudText: 'Test three. True or false. Interleaving means studying one single topic for three hours without a break.',
                            explanation: 'False. Interleaving means mixing different topics inside one session.',
                            options: [
                                { id: 'tf_true', text: 'TRUE', isCorrect: false, friendshipChange: -1, feedbackSpeech: 'Hmm, that is the definition of blocking, not interleaving.' },
                                { id: 'tf_false', text: 'FALSE', isCorrect: true, friendshipChange: 3, feedbackSpeech: 'Correct! Interleaving mixes topics inside one session.' }
                            ]
                        },
                        {
                            id: 'step_3_3',
                            sender: name,
                            type: 'sorting',
                            text: '📝 <b>Test 4 · Put the study routine in the right order.</b> What should happen first?',
                            readAloudText: 'Test four. Put the study routine in the right order. What should happen first?',
                            explanation: 'Test first → review what you missed → schedule the next spaced session.',
                            correctOrder: ['s1', 's2', 's3'],
                            options: [
                                { id: 's2', text: 'Review only the items you got wrong' },
                                { id: 's1', text: 'Test yourself with the page closed' },
                                { id: 's3', text: 'Schedule the next short session' }
                            ]
                        },
                        {
                            id: 'step_3_4',
                            sender: name,
                            type: 'poll',
                            text: '💬 <b>Quick poll.</b> Which habit do you want to try this week?',
                            readAloudText: 'Quick poll. Which habit do you want to try this week?',
                            options: [
                                { id: 'p1', text: 'Testing myself first', percent: 48, friendshipChange: 2, feedbackSpeech: 'Most learners pick this one — and it is the strongest single change.' },
                                { id: 'p2', text: 'Short daily sessions', percent: 37, friendshipChange: 2, feedbackSpeech: 'Spacing is the quiet hero. Consistency beats intensity.' },
                                { id: 'p3', text: 'Interleaving two subjects', percent: 15, friendshipChange: 1, feedbackSpeech: 'Ambitious choice — try it once your routine is stable.' }
                            ]
                        }
                    ]
                },
                {
                    id: 'act_4',
                    title: '4 · Game Break',
                    steps: [
                        {
                            id: 'step_4_1',
                            sender: name,
                            type: 'message',
                            text: 'Break time 🎮 Match each keyword with its meaning. Take your time — wrong pairs just bounce back.',
                            readAloudText: 'Break time. Match each keyword with its meaning. Take your time — wrong pairs just bounce back.',
                            mediaType: 'game',
                            gameType: 'match',
                            pairs: [
                                { term: 'Recall', definition: 'Bringing something back to mind' },
                                { term: 'Spacing', definition: 'Short sessions spread over days' },
                                { term: 'Interleave', definition: 'Mixing topics inside one session' },
                                { term: 'Fluency', definition: 'Speaking smoothly without translating' }
                            ],
                            friendshipChange: 4,
                            feedbackSpeech: 'Every pair matched — that is real recall under a little pressure. Well done!'
                        },
                        {
                            id: 'step_4_2',
                            sender: name,
                            type: 'message',
                            text: 'One more game: rebuild the word from the letters. First clue: it is how you pull a word out of memory.',
                            readAloudText: 'One more game. Rebuild the word from the letters. First clue — it is how you pull a word out of memory.',
                            mediaType: 'game',
                            gameType: 'scramble',
                            word: 'RETRIEVAL',
                            hint: 'R _ T R _ _ V _ L',
                            friendshipChange: 4,
                            feedbackSpeech: 'R-E-T-R-I-E-V-A-L. Perfect spelling under pressure!'
                        }
                    ]
                },
                {
                    id: 'act_5',
                    title: '5 · Roleplay & Wrap-Up',
                    steps: [
                        {
                            id: 'step_5_1',
                            sender: name,
                            type: 'branching',
                            text: '🌟 <b>Roleplay.</b> Your manager asks why your English feels better in meetings lately. What do you say?',
                            readAloudText: 'Roleplay. Your manager asks why your English feels better in meetings lately. What do you say?',
                            options: [
                                { id: 'br_a', text: '🙂 "I test myself with the key terms before every meeting — retrieval, then review."', friendshipChange: 5, feedbackSpeech: 'Confident, professional, and two target words used correctly. Beautifully done.', nextStepId: 'step_5_2' },
                                { id: 'br_b', text: '😅 "Honestly? I stopped reading my notes and started getting them wrong on purpose first."', friendshipChange: 4, feedbackSpeech: 'Honest and effective. Add the word retrieval next time and it sounds even sharper.', nextStepId: 'step_5_2' },
                                { id: 'br_c', text: '🤨 "I do not know — it just happens."', friendshipChange: -1, feedbackSpeech: 'Let us make that answer stronger. Name the habit and you sound twice as prepared.', nextStepId: 'step_5_2' }
                            ]
                        },
                        {
                            id: 'step_5_2',
                            sender: name,
                            type: 'message',
                            text: 'Look at you go! 🎉 Six keywords recycled, four tests, two games, and one very good roleplay answer.',
                            readAloudText: 'Look at you go! Six keywords recycled, four tests, two games, and one very good roleplay answer.',
                            mediaType: 'sticker',
                            mediaContent: '🎉',
                            options: [
                                { id: 'opt_5_2a', text: '📊 Show me my session recap.', friendshipChange: 3, feedbackSpeech: 'Here comes your recap — reopen it any time from the chart button above.', nextStepId: null, showRecap: true }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    var scenario = parsedScenario || buildSampleScenario();
    // A scenario that was injected but could not be read must never be silently
    // replaced by the built-in demo — the tutor gets told instead.
    var rawInjected = (typeof cState.appletHtml === 'string') ? cState.appletHtml.trim() : '';
    var injectionFailed = !parsedScenario && rawInjected.length > 0 && rawInjected.indexOf('<') !== 0;

    var scenarioName = (scenario.character && scenario.character.name) || name;
    var scenarioAvatar = (scenario.character && scenario.character.avatar) || avatar;
    var scenarioAvatarFallback = (scenario.character && scenario.character.avatarFallback) || avatarFallback;
    var scenarioTitle = (scenario.character && scenario.character.title) || roleTitle;
    var scenarioFriendship = (scenario.friendshipInitial !== undefined && isFinite(scenario.friendshipInitial)) ? scenario.friendshipInitial : friendshipInitial;

    var safeJson = JSON.stringify({
        title: scenario.title,
        character: { name: scenarioName, avatar: scenarioAvatar, avatarFallback: scenarioAvatarFallback, title: scenarioTitle },
        friendshipInitial: scenarioFriendship,
        activities: scenario.activities
    }).replace(/<\/script/gi, '<\\/script').replace(new RegExp('<' + '!--', 'g'), '<\\!--');

    var classmateMasterPrompt = [
        'You are the Classmate scenario architect for a 2026 Telegram-style AI companion.',
        'Learner: ' + learnerName + ' · L1: ' + learnerL1 + ' · translation level: ' + translationLevel + '.',
        'Companion: ' + scenarioName + ' — ' + scenarioTitle + '.',
        'Return ONLY one JSON object inside a ```json fence matching the Lesson Creator schema:',
        '{ "title", "character": { "name", "avatar", "voice", "title" }, "friendshipInitial",',
        '  "activities": [ { "id", "title", "steps": [ { "id", "sender", "type", "text", "readAloudText",',
        '  "mediaType", "mediaUrl", "mediaContent", "mediaCaption", "mediaHeight", "gameType", "pairs",',
        '  "word", "hint", "explanation", "correctOrder",',
        '  "options": [ { "id", "text", "isCorrect", "friendshipChange", "feedbackSpeech", "nextStepId", "percent" } ] } ] } ] }',
        'mediaType may be: image · gif · video (direct file) · youtube · vimeo · audio (direct file) · voice',
        '(spoken voice note) · table · sticker · soundcloud · spotify · embed (any website such as BBC or',
        'Cambridge) · game (gameType match, memory or scramble) · code · link.',
        'Rules: quiz_single / quiz_multi / true_false options carry "isCorrect"; sorting steps carry',
        '"correctOrder" with the option ids in the right sequence; friendshipChange is -2 to +5 per answer.',
        'Never use wikimedia audio — prefer Pixabay, SoundCloud or the lesson\'s own files.',
        'Source guidance (hosts that allow hotlinking and look premium): photos → Unsplash or Pixabay,',
        'gifs → Giphy or Tenor, free music and sound effects → Pixabay or SoundCloud, video → YouTube or',
        'Vimeo, live reading/exercise pages → BBC Learning English, Cambridge, British Council or',
        'Breaking News English. Always give a full https URL, never a relative path or a placeholder.'
    ].join('\n');

    var escapedRole = roleTitle.replace(/[<>&]/g, function (c: string) {
        return c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;';
    });
    var safeNameAttr = String(scenarioName).replace(/"/g, '&quot;');

    var scriptOpen = '<' + 'script>';
    var scriptClose = '<' + '/script>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${scenarioName} • Classmate 2026</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; }
    body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #eef2f8;
        color: #0f172a;
        font-size: 16px;
        -webkit-font-smoothing: antialiased;
    }
    body.tg-framed {
        display: flex; align-items: center; justify-content: center; padding: 22px;
        background:
            radial-gradient(1100px 620px at 10% -10%, rgba(59,130,246,.16), transparent 60%),
            radial-gradient(900px 520px at 110% 110%, rgba(16,185,129,.13), transparent 55%),
            linear-gradient(160deg, #f7fafd, #e7eef8 60%, #f4f8fd);
    }
    body.tg-framed .tg-shell {
        width: 100%; max-width: 620px; height: min(94vh, 940px);
        border-radius: 26px; border: 1px solid rgba(148,163,184,.35);
        box-shadow: 0 40px 90px rgba(15,23,42,.22), 0 0 0 1px rgba(255,255,255,.6) inset;
        overflow: hidden;
    }
    body.tg-fill .tg-shell { width: 100%; height: 100%; border: none; border-radius: 0; }
    @media (max-width: 720px) {
        body.tg-framed { padding: 0; }
        body.tg-framed .tg-shell { max-width: none; height: 100%; border-radius: 0; border: none; box-shadow: none; }
    }

    .tg-shell { position: relative; display: flex; flex-direction: column; background: #ffffff; overflow: hidden; }

    /* ── Wallpaper (light, Telegram-2026) ──────────────────────── */
    .tg-wallpaper {
        position: absolute; inset: 0; z-index: 0; pointer-events: none;
        background:
            radial-gradient(680px 420px at 88% 4%, rgba(59,130,246,.13), transparent 62%),
            radial-gradient(620px 380px at 6% 96%, rgba(16,185,129,.11), transparent 60%),
            linear-gradient(180deg, #f8fbff 0%, #eef4fb 52%, #f6fafd 100%);
    }
    .tg-wallpaper::after {
        content: ''; position: absolute; inset: 0; opacity: .75;
        background-image:
            radial-gradient(rgba(100,116,139,.14) 1px, transparent 1.5px),
            radial-gradient(rgba(100,116,139,.09) 1px, transparent 1.5px);
        background-size: 28px 28px, 28px 28px;
        background-position: 0 0, 14px 14px;
    }

    /* ── Header ────────────────────────────────────────────────── */
    .tg-header {
        position: relative; z-index: 4; display: flex; align-items: center; gap: 12px; padding: 12px 14px;
        background: rgba(255,255,255,.94); backdrop-filter: blur(14px);
        border-bottom: 1px solid #e4ebf4;
    }
    .tg-avatar-wrap { position: relative; width: 50px; height: 50px; flex: none; }
    .tg-avatar-ring {
        position: absolute; inset: -3px; border-radius: 50%;
        background: conic-gradient(from 210deg, #3b82f6, #10b981, #8b5cf6, #3b82f6);
        animation: tgRing 8s linear infinite;
    }
    @keyframes tgRing { to { transform: rotate(360deg); } }
    .tg-avatar { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid #ffffff; background: #e2e8f0; }
    .tg-online-dot { position: absolute; right: -1px; bottom: -1px; width: 14px; height: 14px; border-radius: 50%; background: #22c55e; border: 3px solid #ffffff; }
    .tg-online-dot::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: #22c55e; animation: tgPulse 2.2s ease-out infinite; }
    @keyframes tgPulse { 0% { opacity: .75; transform: scale(1); } 100% { opacity: 0; transform: scale(2.4); } }

    .tg-head-text { flex: 1; min-width: 0; }
    .tg-name { display: flex; align-items: center; gap: 7px; font-weight: 800; font-size: 17px; letter-spacing: -.2px; color: #0f172a; }
    .tg-name .fa-circle-check { color: #2563eb; font-size: 13px; }
    .tg-sub { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b; font-weight: 600; margin-top: 2px; }
    .tg-sub.tg-speaking { color: #0f9d6b; }
    .tg-eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
    .tg-eq i { display: block; width: 3px; background: #0f9d6b; border-radius: 2px; animation: tgEq .9s ease-in-out infinite; }
    .tg-eq i:nth-child(1) { height: 5px; }
    .tg-eq i:nth-child(2) { height: 11px; animation-delay: .15s; }
    .tg-eq i:nth-child(3) { height: 7px; animation-delay: .3s; }
    .tg-eq i:nth-child(4) { height: 9px; animation-delay: .45s; }
    @keyframes tgEq { 0%, 100% { transform: scaleY(.5); } 50% { transform: scaleY(1); } }

    /* ── Relationship meter ────────────────────────────────────── */
    .tg-meter-chip {
        flex: none; display: flex; flex-direction: column; gap: 5px; align-items: flex-end; min-width: 136px;
        background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 7px 11px; cursor: pointer;
        box-shadow: 0 4px 14px rgba(15,23,42,.06);
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .tg-meter-chip:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(15,23,42,.12); }
    .tg-meter-top { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 800; color: #334155; white-space: nowrap; }
    .tg-meter-score { font-size: 12.5px; font-weight: 900; color: #0f766e; }
    .tg-meter-track { width: 100%; height: 7px; border-radius: 99px; background: #eef2f7; overflow: hidden; }
    .tg-meter-fill { height: 100%; width: 0%; border-radius: 99px; background: linear-gradient(90deg, #f87171, #fbbf24 35%, #34d399 70%, #3b82f6); transition: width .7s cubic-bezier(.2,.9,.2,1); }

    /* ── Progress + stat bar ───────────────────────────────────── */
    .tg-progress { position: relative; z-index: 4; height: 3px; background: #eef2f7; }
    .tg-progress span { display: block; height: 100%; width: 0%; background: linear-gradient(90deg, #3b82f6, #10b981); transition: width .5s ease; }

    .tg-bar { position: relative; z-index: 4; display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: rgba(255,255,255,.86); border-bottom: 1px solid #eaf0f7; backdrop-filter: blur(10px); }
    .tg-pills { display: flex; gap: 6px; overflow-x: auto; overflow-y: hidden; flex: 1; scroll-behavior: smooth; scrollbar-width: thin; scrollbar-color: #b6c4d6 transparent; padding: 1px 0 3px; }
    .tg-pills::-webkit-scrollbar { height: 6px; }
    .tg-pills::-webkit-scrollbar-track { background: transparent; }
    .tg-pills::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
    .tg-pill {
        flex: none; border: 1px solid #dde5ef; background: #ffffff; color: #64748b;
        font-size: 12px; font-weight: 700; padding: 6px 11px; border-radius: 99px; cursor: pointer;
        transition: all .18s ease; white-space: nowrap;
    }
    .tg-pill:hover { color: #1e293b; border-color: #93c5fd; }
    .tg-pill.active { background: linear-gradient(135deg, #3b82f6, #0ea5e9); color: #ffffff; border-color: #2563eb; box-shadow: 0 6px 16px rgba(59,130,246,.28); }
    .tg-pill.done::after { content: ' ✓'; font-weight: 900; }
    .tg-stats { display: flex; align-items: center; gap: 6px; flex: none; }
    .tg-stat { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 800; color: #334155; background: #ffffff; border: 1px solid #e6ecf4; padding: 5px 9px; border-radius: 10px; white-space: nowrap; }
    .tg-icon-btn { background: #ffffff; border: 1px solid #e2e8f0; color: #64748b; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .18s ease; flex: none; }
    .tg-icon-btn:hover { color: #0f172a; border-color: #93c5fd; background: #f0f7ff; }
    .tg-icon-btn.tg-on { color: #0f766e; border-color: #99e6d3; background: #ecfdf5; }

    /* ── Chat stream ───────────────────────────────────────────── */
    .tg-chat { position: relative; z-index: 2; flex: 1; overflow-y: auto; padding: 18px 14px 6px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
    .tg-chat::-webkit-scrollbar { width: 8px; }
    .tg-chat::-webkit-scrollbar-thumb { background: #cfd9e6; border-radius: 99px; }

    .tg-day { align-self: center; font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #64748b; background: rgba(255,255,255,.92); border: 1px solid #e6ecf4; padding: 4px 12px; border-radius: 99px; }
    .tg-system { align-self: center; max-width: 88%; text-align: center; font-size: 12.5px; font-weight: 700; color: #1d4ed8; background: #eaf3ff; border: 1px solid #cfe2fb; padding: 6px 14px; border-radius: 12px; }

    .tg-row { display: flex; gap: 9px; align-items: flex-end; max-width: 88%; animation: tgIn .32s cubic-bezier(.2,.9,.2,1); }
    .tg-row.tg-out { align-self: flex-end; flex-direction: row-reverse; }
    .tg-row.tg-in { align-self: flex-start; }
    .tg-row.tg-noavatar { padding-left: 45px; max-width: 92%; }
    @keyframes tgIn { from { opacity: 0; transform: translateY(10px) scale(.99); } to { opacity: 1; transform: none; } }

    .tg-msg-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex: none; border: 2px solid #e2e8f0; background: #eef2f7; }
    .tg-avatar-spacer { width: 36px; flex: none; }

    .tg-bubble {
        position: relative; min-width: 0; background: #ffffff; border: 1px solid #e8eef6;
        border-radius: 18px 18px 18px 6px; padding: 11px 14px 8px;
        box-shadow: 0 6px 18px rgba(15,23,42,.06);
    }
    .tg-bubble::after {
        content: ''; position: absolute; left: -6px; bottom: 8px; width: 12px; height: 12px;
        background: #ffffff; border-left: 1px solid #e8eef6; border-bottom: 1px solid #e8eef6;
        transform: rotate(45deg); border-radius: 0 0 0 3px;
    }
    .tg-row.tg-out .tg-bubble {
        background: linear-gradient(135deg, #e9fbdc, #e2f7e8);
        border-color: #cdeec2;
    }
    .tg-row.tg-out .tg-bubble::after { left: auto; right: -6px; background: #e6f8e4; border: none; border-right: 1px solid #cdeec2; border-top: 1px solid #cdeec2; border-radius: 0 3px 0 0; }
    .tg-row.tg-noavatar.tg-in .tg-bubble { border-radius: 14px 18px 18px 14px; }
    .tg-row.tg-noavatar.tg-in .tg-bubble::after { display: none; }

    .tg-sender { font-size: 12.5px; font-weight: 800; color: #2563eb; margin-bottom: 4px; }
    .tg-text { font-size: 15.5px; line-height: 1.6; color: #16233a; word-wrap: break-word; overflow-wrap: anywhere; }
    .tg-text b, .tg-text strong { color: #0b1220; font-weight: 800; }
    .tg-text s { color: #94a3b8; }
    .tg-text a { color: #2563eb; font-weight: 700; }
    .tg-text em { color: #b45309; font-style: italic; }
    .tg-text code { background: #eef2f7; padding: 1px 5px; border-radius: 5px; font-size: 14px; }
    .tg-meta { display: flex; align-items: center; justify-content: flex-end; gap: 5px; font-size: 11px; color: #94a3b8; margin-top: 5px; }
    .tg-meta .fa-check-double { color: #3b82f6; }

    .tg-typing { display: inline-flex; gap: 4px; align-items: center; padding: 4px 2px; }
    .tg-typing i { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; opacity: .6; animation: tgTy .9s infinite; }
    .tg-typing i:nth-child(2) { animation-delay: .18s; }
    .tg-typing i:nth-child(3) { animation-delay: .36s; }
    @keyframes tgTy { 0%, 100% { transform: translateY(0); opacity: .45; } 50% { transform: translateY(-4px); opacity: 1; } }

    /* ── Media ─────────────────────────────────────────────────── */
    .tg-media { margin-top: 9px; border-radius: 14px; overflow: hidden; border: 1px solid #e6ecf4; background: #ffffff; position: relative; box-shadow: 0 4px 14px rgba(15,23,42,.05); }
    .tg-media img, .tg-media video { display: block; width: 100%; max-height: 300px; object-fit: cover; cursor: zoom-in; background: #f1f5f9; }
    .tg-media.tg-gif img { cursor: default; }
    .tg-tag { position: absolute; top: 8px; left: 8px; z-index: 3; font-size: 10.5px; font-weight: 900; letter-spacing: .08em; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,.92); color: #b45309; border: 1px solid #fde4c7; box-shadow: 0 2px 8px rgba(15,23,42,.08); }
    .tg-tag.tg-tag-site { color: #1d4ed8; border-color: #cfe2fb; }
    .tg-embed { position: relative; width: 100%; padding-top: 56.25%; background: #f8fafc; }
    .tg-embed.tg-embed-fixed { padding-top: 0; }
    .tg-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .tg-embed-note { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 11px; font-size: 11.5px; font-weight: 700; color: #64748b; background: #f8fafc; border-top: 1px solid #eef2f7; }
    .tg-embed-note a { color: #2563eb; text-decoration: none; font-weight: 800; }
    .tg-caption { padding: 8px 12px 10px; font-size: 13.5px; color: #475569; line-height: 1.5; border-top: 1px solid #eef2f7; }

    .tg-table-wrap { margin-top: 9px; border-radius: 14px; max-height: min(320px, 44vh); overflow: auto; overscroll-behavior: contain; border: 1px solid #e6ecf4; background: #ffffff; }
    .tg-table-wrap::-webkit-scrollbar { height: 9px; width: 9px; }
    .tg-table-wrap::-webkit-scrollbar-thumb { background: #cfd9e6; border-radius: 99px; }
    .tg-table { border-collapse: collapse; font-size: 13.5px; min-width: 100%; }
    .tg-table th { position: sticky; top: 0; z-index: 2; background: #f1f6fd; color: #1e3a8a; padding: 9px 11px; text-align: left; font-weight: 800; border-bottom: 1px solid #dbe8f8; white-space: nowrap; }
    .tg-table td { padding: 9px 11px; color: #334155; border-bottom: 1px solid #eef2f7; vertical-align: top; }
    .tg-table tr:last-child td { border-bottom: none; }
    .tg-table td:first-child, .tg-table th:first-child { position: sticky; left: 0; z-index: 1; background: #f1f6fd; font-weight: 700; }

    .tg-sticker { font-size: 74px; line-height: 1; text-align: center; padding: 6px 4px; animation: tgSticker .6s cubic-bezier(.18,.9,.3,1.4); filter: drop-shadow(0 10px 20px rgba(15,23,42,.18)); }
    @keyframes tgSticker { 0% { transform: scale(.35) rotate(-14deg); opacity: 0; } 70% { transform: scale(1.12) rotate(4deg); } 100% { transform: scale(1) rotate(0); opacity: 1; } }

    /* Voice note + audio player */
    .tg-voice { display: flex; align-items: center; gap: 12px; padding: 11px 13px; }
    .tg-play { flex: none; width: 42px; height: 42px; border-radius: 50%; border: none; cursor: pointer; color: #fff; background: linear-gradient(135deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 8px 18px rgba(59,130,246,.3); transition: transform .16s ease; }
    .tg-play:hover { transform: scale(1.06); }
    .tg-wave { flex: 1; display: flex; align-items: center; gap: 3px; height: 30px; }
    .tg-wave i { flex: 1; background: #dbe3ed; border-radius: 99px; min-height: 4px; }
    .tg-voice.tg-playing .tg-wave i { background: linear-gradient(180deg, #34d399, #3b82f6); animation: tgWave .9s ease-in-out infinite; }
    .tg-voice.tg-playing .tg-wave i:nth-child(odd) { animation-delay: .16s; }
    @keyframes tgWave { 0%, 100% { transform: scaleY(.55); } 50% { transform: scaleY(1.15); } }
    .tg-voice-time { flex: none; font-size: 12.5px; font-weight: 700; color: #64748b; }

    .tg-audio-card { padding: 12px 13px; display: flex; flex-direction: column; gap: 8px; }
    .tg-audio-top { display: flex; align-items: center; gap: 11px; }
    .tg-audio-title { font-size: 13px; font-weight: 800; color: #1e293b; }
    .tg-audio-sub { font-size: 11.5px; color: #64748b; }
    .tg-audio-bar { height: 6px; border-radius: 99px; background: #eef2f7; overflow: hidden; }
    .tg-audio-bar span { display: block; height: 100%; width: 0%; background: linear-gradient(90deg, #3b82f6, #10b981); }

    /* ── Bubbles action bar ────────────────────────────────────── */
    .tg-actions { display: flex; align-items: center; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e8eef6; }
    .tg-mini { background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 12px; font-weight: 700; padding: 3px 7px; border-radius: 7px; display: inline-flex; align-items: center; gap: 5px; transition: all .15s ease; font-family: inherit; }
    .tg-mini:hover { color: #0f172a; background: #f1f5f9; }

    /* ── Dock: choices + composer ──────────────────────────────── */
    /* The reactions live in the HEADER, beside the relationship meter: three small
       chips that never steal width from the reply row (they used to sit in the
       composer and pushed the input, the mic and Send out of the frame). */
    .tg-head-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; flex: 0 1 auto; min-width: 0; }
    .tg-reacts { display: inline-flex; align-items: center; gap: 2px; background: #f8fafc; border: 1px solid #e6ecf4; border-radius: 99px; padding: 2px; flex: none; }
    .tg-react {
        display: inline-flex; align-items: center; gap: 3px; font-size: 13px; line-height: 1;
        background: transparent; border: none; border-radius: 99px; padding: 5px 7px; cursor: pointer;
        font-family: inherit; transition: background .16s ease, transform .16s ease;
    }
    .tg-react i { font-style: normal; font-size: 9.5px; font-weight: 900; color: #0f766e; }
    .tg-react.tg-down i { color: #b91c1c; }
    .tg-react:hover { background: #e8f2ff; transform: translateY(-1px); }
    .tg-react:active { transform: translateY(0) scale(.96); }
    .tg-sec-chip { flex: none; margin-left: auto; font-size: 10.5px; font-weight: 800; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 3px 9px; border-radius: 99px; white-space: nowrap; }

    .tg-dock { position: relative; z-index: 5; border-top: 1px solid #e8eef6; background: rgba(255,255,255,.97); backdrop-filter: blur(14px); }
    .tg-choices { display: flex; flex-direction: column; gap: 8px; padding: 12px 13px 4px; max-height: 46vh; overflow-y: auto; }
    .tg-choices::-webkit-scrollbar { width: 7px; }
    .tg-choices::-webkit-scrollbar-thumb { background: #cfd9e6; border-radius: 99px; }
    .tg-hint { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; color: #64748b; padding: 2px 3px 8px; }
    .tg-opt {
        display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; cursor: pointer;
        background: #ffffff; border: 1px solid #dfe7f1; color: #16233a;
        padding: 13px 14px; border-radius: 14px; font-size: 15px; font-weight: 600; font-family: inherit;
        transition: transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease;
    }
    .tg-opt:hover { transform: translateY(-1px); border-color: #93c5fd; background: #f4f9ff; box-shadow: 0 10px 22px rgba(15,23,42,.08); }
    .tg-opt:disabled { cursor: default; }
    .tg-opt .tg-key { flex: none; width: 26px; height: 26px; border-radius: 8px; background: #eef2f7; color: #64748b; font-weight: 900; font-size: 12.5px; display: flex; align-items: center; justify-content: center; }
    .tg-opt .tg-opt-text { flex: 1; }
    .tg-opt .tg-mark { flex: none; font-size: 15px; }
    .tg-opt.tg-correct { background: #eafaf3; border-color: #6ee7b7; color: #065f46; }
    .tg-opt.tg-correct .tg-key { background: #a7f3d0; color: #064e3b; }
    .tg-opt.tg-wrong { background: #fdecec; border-color: #fca5a5; color: #991b1b; }
    .tg-opt.tg-wrong .tg-key { background: #fecaca; color: #7f1d1d; }
    .tg-opt.tg-picked { outline: 2px solid rgba(59,130,246,.55); outline-offset: 1px; }
    .tg-opt.tg-dim { opacity: .55; }
    .tg-verdict { display: flex; align-items: center; gap: 9px; font-size: 13.5px; font-weight: 700; padding: 10px 12px; border-radius: 12px; margin-top: 2px; line-height: 1.5; }
    .tg-verdict.good { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
    .tg-verdict.bad { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .tg-verdict.info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
    .tg-submit { background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; color: #fff; font-weight: 800; font-size: 14.5px; padding: 12px 16px; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; box-shadow: 0 10px 22px rgba(59,130,246,.26); }
    .tg-submit:hover { filter: brightness(1.06); }
    .tg-sort-row { display: flex; align-items: center; gap: 9px; background: #ffffff; border: 1px solid #dfe7f1; border-radius: 14px; padding: 10px 12px; }
    .tg-sort-num { flex: none; width: 24px; height: 24px; border-radius: 8px; background: #eaf3ff; color: #1d4ed8; font-weight: 900; font-size: 12px; display: flex; align-items: center; justify-content: center; }
    .tg-sort-text { flex: 1; font-size: 14.5px; font-weight: 600; color: #16233a; }
    .tg-sort-move { flex: none; display: flex; flex-direction: column; gap: 3px; }
    .tg-sort-move button { width: 28px; height: 20px; border-radius: 6px; border: 1px solid #dfe7f1; background: #f8fafc; color: #475569; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .tg-sort-move button:hover { background: #eaf3ff; color: #1d4ed8; }
    .tg-sort-row.tg-correct { border-color: #6ee7b7; background: #ecfdf5; }
    .tg-sort-row.tg-wrong { border-color: #fca5a5; background: #fef2f2; }
    .tg-poll { display: flex; flex-direction: column; gap: 7px; }
    .tg-poll-row { position: relative; overflow: hidden; border-radius: 12px; border: 1px solid #dfe7f1; background: #ffffff; }
    .tg-poll-text { position: relative; z-index: 2; display: flex; justify-content: space-between; gap: 10px; padding: 11px 13px; font-size: 14.5px; font-weight: 700; color: #16233a; }
    .tg-poll-fill { position: absolute; inset: 0 auto 0 0; width: 0%; background: linear-gradient(90deg, rgba(59,130,246,.28), rgba(16,185,129,.2)); transition: width .8s cubic-bezier(.2,.9,.2,1); }

    /* ── Games ─────────────────────────────────────────────────── */
    .tg-game-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .tg-game-title { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 900; color: #1e293b; }
    .tg-game-title .tg-badge { font-size: 10px; font-weight: 900; letter-spacing: .08em; padding: 3px 7px; border-radius: 6px; background: #eef2ff; color: #4338ca; border: 1px solid #dcdffb; }
    .tg-game-meta { font-size: 12px; font-weight: 800; color: #64748b; }
    .tg-match-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .tg-match-col { display: flex; flex-direction: column; gap: 7px; }
    .tg-card {
        border: 1px solid #dfe7f1; background: #ffffff; color: #16233a; border-radius: 12px; padding: 11px 12px;
        font-size: 14px; font-weight: 700; text-align: left; cursor: pointer; font-family: inherit; line-height: 1.4;
        transition: transform .15s ease, border-color .15s ease, background .15s ease;
    }
    .tg-card:hover { border-color: #93c5fd; background: #f6faff; transform: translateY(-1px); }
    .tg-card.tg-selected { border-color: #3b82f6; background: #eff6ff; box-shadow: 0 0 0 2px rgba(59,130,246,.25); }
    .tg-card.tg-matched { border-color: #6ee7b7; background: #ecfdf5; color: #065f46; cursor: default; opacity: .95; }
    .tg-card.tg-miss { border-color: #fca5a5; background: #fef2f2; animation: tgShake .4s ease; }
    @keyframes tgShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
    .tg-memory-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
    .tg-memory-card {
        position: relative; aspect-ratio: 1 / 1; border-radius: 12px; border: 1px solid #dfe7f1; background: linear-gradient(135deg,#eef4fb,#e2ecf8);
        cursor: pointer; font-family: inherit; font-size: 11.5px; font-weight: 700; color: transparent; padding: 6px; line-height: 1.25;
        display: flex; align-items: center; justify-content: center; text-align: center; transition: transform .15s ease, background .2s ease;
        overflow: hidden;
    }
    .tg-memory-card::before { content: '❔'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #94a3b8; }
    .tg-memory-card:hover { transform: translateY(-2px); }
    .tg-memory-card.tg-flipped { background: #ffffff; color: #16233a; border-color: #93c5fd; }
    .tg-memory-card.tg-flipped::before { display: none; }
    .tg-memory-card.tg-matched { background: #ecfdf5; border-color: #6ee7b7; color: #065f46; cursor: default; }
    .tg-memory-card.tg-matched::before { display: none; }
    .tg-scramble-slots { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; min-height: 46px; padding: 10px; border-radius: 12px; border: 1px dashed #cfd9e6; background: #f8fafc; }
    .tg-scramble-slot { width: 32px; height: 38px; border-radius: 8px; background: #ffffff; border: 1px solid #dfe7f1; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; color: #16233a; text-transform: uppercase; }
    .tg-tiles { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .tg-tile { width: 38px; height: 42px; border-radius: 9px; border: 1px solid #cfe0f5; background: #ffffff; color: #16233a; font-weight: 900; font-size: 17px; cursor: pointer; font-family: inherit; text-transform: uppercase; box-shadow: 0 3px 8px rgba(15,23,42,.07); transition: transform .14s ease, background .14s ease; }
    .tg-tile:hover { transform: translateY(-2px); background: #f0f7ff; }
    .tg-tile.tg-used { visibility: hidden; }
    .tg-game-tools { display: flex; gap: 7px; }
    .tg-game-tools button { flex: 1; border: 1px solid #dfe7f1; background: #ffffff; color: #475569; font-weight: 800; font-size: 13px; padding: 10px; border-radius: 12px; cursor: pointer; font-family: inherit; }
    .tg-game-tools button:hover { border-color: #93c5fd; color: #1d4ed8; background: #f6faff; }
    .tg-game-tools button.tg-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; border-color: #2563eb; }
    .tg-game-hint { font-size: 12.5px; font-weight: 700; color: #64748b; text-align: center; }

    .tg-composer { display: flex; align-items: center; gap: 8px; padding: 10px 12px 12px; }
    .tg-input-wrap { flex: 1; display: flex; align-items: center; gap: 9px; background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 10px 13px; transition: border-color .18s ease, background .18s ease; }
    .tg-input-wrap:focus-within { border-color: #93c5fd; background: #ffffff; }
    .tg-input { flex: 1; background: transparent; border: none; outline: none; color: #16233a; font-size: 15px; font-family: inherit; }
    .tg-input::placeholder { color: #94a3b8; }
    .tg-round-btn { flex: none; width: 42px; height: 42px; border-radius: 50%; border: none; cursor: pointer; color: #fff; background: linear-gradient(135deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 18px rgba(59,130,246,.28); font-size: 15px; }
    .tg-round-btn.tg-mic { background: #ffffff; border: 1px solid #e2e8f0; box-shadow: none; color: #64748b; }
    .tg-round-btn.tg-mic.tg-recording { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; animation: tgRec 1.4s infinite; }
    @keyframes tgRec { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.45); } 50% { box-shadow: 0 0 0 12px rgba(239,68,68,0); } }

    /* ── Overlays ──────────────────────────────────────────────── */
    .tg-overlay { position: absolute; inset: 0; z-index: 30; display: none; }
    .tg-overlay.tg-open { display: block; }
    .tg-scrim { position: absolute; inset: 0; background: rgba(15,23,42,.34); backdrop-filter: blur(3px); }
    .tg-sheet {
        position: absolute; right: 0; top: 0; bottom: 0; width: min(410px, 94%);
        background: #ffffff; border-left: 1px solid #e6ecf4; box-shadow: -22px 0 60px rgba(15,23,42,.2);
        padding: 16px; overflow-y: auto; animation: tgSheet .3s cubic-bezier(.2,.9,.2,1);
    }
    @keyframes tgSheet { from { transform: translateX(30px); opacity: .4; } to { transform: none; opacity: 1; } }
    .tg-sheet h3 { margin: 0 0 4px; font-size: 16px; font-weight: 900; color: #0f172a; }
    .tg-sheet p { margin: 0 0 14px; font-size: 13px; color: #64748b; line-height: 1.55; }
    .tg-ladder { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
    .tg-ladder-row { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 11px; border: 1px solid #eef2f7; background: #fbfdff; font-size: 13px; }
    .tg-ladder-row.tg-now { border-color: #93c5fd; background: #eff6ff; font-weight: 800; }
    .tg-lvl-name { flex: 1; }
    .tg-lvl-range { color: #94a3b8; font-size: 11.5px; font-weight: 700; }
    .tg-log { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
    .tg-log-row { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; color: #475569; background: #fbfdff; border: 1px solid #eef2f7; border-radius: 10px; padding: 7px 10px; }
    .tg-log-row b.up { color: #0f9d6b; }
    .tg-log-row b.down { color: #dc2626; }
    .tg-recap { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(430px, 93%); background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; box-shadow: 0 30px 70px rgba(15,23,42,.28); animation: tgIn .3s ease; }
    .tg-recap h3 { margin: 0 0 3px; font-size: 19px; font-weight: 900; color: #0f172a; }
    .tg-recap p.tg-recap-sub { margin: 0 0 14px; font-size: 13px; color: #64748b; }
    .tg-recap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
    .tg-recap-cell { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 13px; padding: 11px; }
    .tg-recap-cell span { display: block; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #94a3b8; }
    .tg-recap-cell b { font-size: 21px; font-weight: 900; color: #0f172a; }
    .tg-recap-list { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; margin-bottom: 14px; }
    .tg-recap-item { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; line-height: 1.45; color: #334155; background: #fbfdff; border: 1px solid #eef2f7; border-radius: 10px; padding: 8px 10px; }
    .tg-recap-item .fa-check { color: #10b981; margin-top: 2px; }
    .tg-recap-item .fa-xmark { color: #ef4444; margin-top: 2px; }

    .tg-lightbox { position: absolute; inset: 0; z-index: 60; display: none; align-items: center; justify-content: center; background: rgba(15,23,42,.9); padding: 20px; cursor: zoom-out; }
    .tg-lightbox.tg-open { display: flex; }
    .tg-lightbox img { max-width: 100%; max-height: 100%; border-radius: 12px; box-shadow: 0 30px 80px rgba(15,23,42,.5); }

    .tg-toast { position: absolute; left: 50%; bottom: 96px; transform: translate(-50%, 12px); z-index: 70; background: rgba(15,23,42,.92); color: #f8fafc; font-size: 13px; font-weight: 700; padding: 9px 15px; border-radius: 12px; opacity: 0; transition: all .25s ease; pointer-events: none; }
    .tg-toast.tg-show { opacity: 1; transform: translate(-50%, 0); }
    .tg-fly { position: absolute; right: 18px; top: 74px; z-index: 70; font-size: 15px; font-weight: 900; color: #0f9d6b; text-shadow: 0 2px 10px rgba(255,255,255,.9); pointer-events: none; animation: tgFly 1.5s ease-out forwards; }
    .tg-fly.down { color: #dc2626; }
    @keyframes tgFly { 0% { opacity: 0; transform: translateY(8px) scale(.85); } 20% { opacity: 1; transform: translateY(0) scale(1.06); } 100% { opacity: 0; transform: translateY(-44px) scale(1); } }

    @media (max-width: 700px) {
        /* Narrow landlords (the 380px side panel, a phone): the reaction values drop
           away and the emoji keep their tooltips, so the meter never gets squeezed. */
        .tg-reacts .tg-react i { display: none; }
        .tg-react { padding: 4px 6px; }
    }
    @media (max-width: 560px) {
        .tg-text { font-size: 15px; }
        .tg-meter-chip { min-width: 106px; padding: 6px 9px; }
        .tg-meter-top { font-size: 11.5px; }
        .tg-head-actions { gap: 6px; }
        .tg-stats .tg-stat.tg-hide-sm { display: none; }
        .tg-match-grid { grid-template-columns: 1fr; }
        .tg-memory-grid { grid-template-columns: repeat(3, 1fr); }
    }
    /* The Classmate side panel prints the single header (name · online role ·
       relationship meter · window buttons) so the chat screen drops its own. */
    body.tg-headerless .tg-header { display: none !important; }
</style>
</head>
<body class="${framed ? 'tg-framed' : 'tg-fill'}${headerless ? ' tg-headerless' : ''}">
<div class="tg-shell" id="tg-shell">
    <div class="tg-wallpaper"></div>

    <div class="tg-header">
        <div class="tg-avatar-wrap">
            <div class="tg-avatar-ring"></div>
            <img class="tg-avatar" id="tg-avatar" src="${scenarioAvatar}" alt="${safeNameAttr}" data-fallback="${scenarioAvatarFallback}" />
            <div class="tg-online-dot"></div>
        </div>
        <div class="tg-head-text">
            <div class="tg-name"><span id="tg-name">${scenarioName}</span><i class="fas fa-circle-check" title="Verified companion"></i></div>
            <div class="tg-sub" id="tg-sub"><span style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;"></span> online · ${escapedRole}</div>
        </div>
        <div class="tg-head-actions">
            <div class="tg-reacts" id="tg-reacts" title="Tutor reaction — tap to raise or drop the friendship">
                <button class="tg-react" type="button" data-react="5" title="Learner answered well (+5 friendship)" aria-label="Learner answered well, plus 5 friendship">👍<i>+5</i></button>
                <button class="tg-react" type="button" data-react="15" title="Fallen in love moment (+15 friendship)" aria-label="Fallen in love moment, plus 15 friendship">❤️<i>+15</i></button>
                <button class="tg-react tg-down" type="button" data-react="-10" title="Disagreed / offended (-10 friendship)" aria-label="Disagreed or offended, minus 10 friendship">💔<i>-10</i></button>
            </div>
            <div class="tg-meter-chip" id="tg-meter-chip" title="Open the relationship meter" role="button" tabindex="0">
                <div class="tg-meter-top"><span id="tg-meter-icon">🤝</span><span id="tg-meter-label">Classmate</span><span class="tg-meter-score" id="tg-meter-score">0</span></div>
                <div class="tg-meter-track"><div class="tg-meter-fill" id="tg-meter-fill"></div></div>
            </div>
        </div>
    </div>

    <div class="tg-progress"><span id="tg-progress-fill"></span></div>

    <div class="tg-bar">
        <div class="tg-pills" id="tg-pills"></div>
        <div class="tg-stats">
            <div class="tg-stat" id="tg-score-chip" title="Correct answers"><i class="fas fa-circle-check" style="color:#10b981;"></i> <span id="tg-score-val">0/0</span></div>
            <div class="tg-stat tg-hide-sm" id="tg-streak-chip" title="Current streak"><i class="fas fa-fire" style="color:#f97316;"></i> <span id="tg-streak-val">0</span></div>
            <button class="tg-icon-btn tg-on" id="tg-voice-btn" title="Auto voice (read every message aloud)"><i class="fas fa-volume-high"></i></button>
            <button class="tg-icon-btn" id="tg-recap-btn" title="Session recap"><i class="fas fa-chart-simple"></i></button>
            <button class="tg-icon-btn" id="tg-restart-btn" title="Restart this scenario"><i class="fas fa-rotate-left"></i></button>
        </div>
    </div>

    <div class="tg-chat" id="tg-chat"></div>

    <div class="tg-dock">
        <div class="tg-choices" id="tg-choices"></div>
        <div class="tg-composer">
            <div class="tg-input-wrap">
                <i class="fas fa-paperclip" style="color:#94a3b8;font-size:14px;" title="Media is delivered by your tutor inside the lesson"></i>
                <input class="tg-input" id="tg-input" type="text" placeholder="Type your own reply to ${scenarioName}…" autocomplete="off" />
                <span class="tg-sec-chip" id="tg-sec-chip" title="Current segment / total segments">1/1</span>
            </div>
            <button class="tg-round-btn tg-mic" id="tg-mic" title="Dictate your reply"><i class="fas fa-microphone"></i></button>
            <button class="tg-round-btn" id="tg-send" title="Send"><i class="fas fa-paper-plane"></i></button>
        </div>
    </div>

    <div class="tg-overlay" id="tg-meter-overlay">
        <div class="tg-scrim" data-close="1"></div>
        <div class="tg-sheet" id="tg-meter-sheet"></div>
    </div>

    <div class="tg-overlay" id="tg-recap-overlay">
        <div class="tg-scrim" data-close="1"></div>
        <div class="tg-recap" id="tg-recap-card"></div>
    </div>

    <div class="tg-lightbox" id="tg-lightbox"><img id="tg-lightbox-img" alt="Media preview" /></div>
    <div class="tg-toast" id="tg-toast"></div>
</div>

${scriptOpen}
(function () {
    'use strict';

    // ── Static configuration baked in at generation time ────────────────
    var CHARACTER = { name: ${JSON.stringify(scenarioName)}, avatar: ${JSON.stringify(scenarioAvatar)}, avatarFallback: ${JSON.stringify(scenarioAvatarFallback)}, title: ${JSON.stringify(scenarioTitle)}, voice: ${JSON.stringify(voiceName)}, gender: ${JSON.stringify(gender)}, id: ${JSON.stringify(charId)} };
    var LEARNER = { name: ${JSON.stringify(learnerName)}, l1: ${JSON.stringify(learnerL1)}, translationLevel: ${JSON.stringify(translationLevel)} };
    var MASTER_PROMPT = ${JSON.stringify(classmateMasterPrompt)};
    var scenarioData = ${safeJson};
    var INJECT_FAILED = ${JSON.stringify(injectionFailed)};

    var currentActivityIdx = 0;
    var currentStepId = null;
    var friendship = (typeof scenarioData.friendshipInitial === 'number' && isFinite(scenarioData.friendshipInitial)) ? scenarioData.friendshipInitial : ${scenarioFriendship};
    var friendshipStart = friendship;
    var meterLog = [];
    var stats = { correct: 0, asked: 0, answered: 0, streak: 0, best: 0, xp: 0, games: 0, gamesWon: 0 };
    var answeredSteps = {};
    var answerReview = [];
    var autoVoice = readPref('autoVoice', true);
    var lastSpokenBy = {};
    var isSpeaking = false;
    var typingTimer = null;
    var recognition = null;
    var visitedActivities = {};
    var activeTimers = [];

    // ── Tiny helpers ────────────────────────────────────────────────────
    function el(id) { return document.getElementById(id); }
    function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
    function plain(value) { return String(value == null ? '' : value).replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim(); }
    function readPref(key, fallback) { try { var v = localStorage.getItem('classmate_' + key); return v === null ? fallback : v === '1'; } catch (e) { return fallback; } }
    function writePref(key, value) { try { localStorage.setItem('classmate_' + key, value ? '1' : '0'); } catch (e) {} }
    function fmtTime(d) { try { return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
    function fmtDur(seconds) { var s = Math.max(0, Math.round(seconds || 0)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
    function later(fn, ms) { var t = setTimeout(fn, ms); activeTimers.push(t); return t; }
    function monogramUrl(label) {
        var initial = String(label || '?').trim().charAt(0).toUpperCase() || '?';
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#dbeafe"/><text x="50" y="63" font-size="46" font-family="Inter,Arial,sans-serif" font-weight="700" fill="#1d4ed8" text-anchor="middle">' + initial + '</text></svg>';
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }
    function fallbackFor(img) {
        var given = img.getAttribute('data-fallback');
        if (given && given.length > 8) return given;
        return monogramUrl(CHARACTER.name);
    }
    function escapeAttr(value) { return esc(value); }

    function activityStepIndex() {
        var act = getCurrentActivity();
        if (!act) return 0;
        for (var i = 0; i < act.steps.length; i++) { if (act.steps[i].id === currentStepId) return i; }
        return 0;
    }
    function getCurrentActivity() {
        if (!scenarioData.activities || !scenarioData.activities.length) return null;
        return scenarioData.activities[currentActivityIdx] || scenarioData.activities[0];
    }
    function getStepById(id) {
        if (!scenarioData.activities) return null;
        for (var a = 0; a < scenarioData.activities.length; a++) {
            var steps = scenarioData.activities[a].steps || [];
            for (var s = 0; s < steps.length; s++) { if (steps[s].id === id) return { step: steps[s], actIdx: a }; }
        }
        return null;
    }
    function getCurrentStep() {
        var act = getCurrentActivity();
        if (!act || !act.steps || !act.steps.length) return null;
        for (var i = 0; i < act.steps.length; i++) { if (act.steps[i].id === currentStepId) return act.steps[i]; }
        return act.steps[0];
    }

    // ── Relationship ladder (single source of truth for the meter) ──────
    var LEVELS = [
        { min: -100, max: -60, label: 'Arch Nemesis', icon: '😡', color: '#ef4444' },
        { min: -60, max: -20, label: 'Competitive Rival', icon: '😒', color: '#f97316' },
        { min: -20, max: 15, label: 'New Acquaintance', icon: '🤝', color: '#94a3b8' },
        { min: 15, max: 40, label: 'Classmate', icon: '💬', color: '#3b82f6' },
        { min: 40, max: 65, label: 'Study Partner', icon: '😊', color: '#10b981' },
        { min: 65, max: 85, label: 'Close Friend', icon: '💛', color: '#f59e0b' },
        { min: 85, max: 98, label: 'Best Friend', icon: '💖', color: '#ec4899' },
        { min: 98, max: 100, label: 'Inseparable Duo', icon: '💕', color: '#d946ef' }
    ];
    function levelFor(val) {
        var v = Math.max(-100, Math.min(100, val || 0));
        for (var i = 0; i < LEVELS.length; i++) { if (v >= LEVELS[i].min && v < LEVELS[i].max) return LEVELS[i]; }
        return LEVELS[LEVELS.length - 1];
    }
    function nextLevelFor(val) {
        for (var i = 0; i < LEVELS.length; i++) { if (val < LEVELS[i].min) return LEVELS[i]; }
        return null;
    }
    function pct(val) { return Math.round(((Math.max(-100, Math.min(100, val)) + 100) / 200) * 100); }

    // ── Host bridge ─────────────────────────────────────────────────────
    function getHostWindow() {
        try { if (window.parent && window.parent !== window && typeof window.parent.adjustClassmateFriendship === 'function') return window.parent; } catch (e) {}
        try { if (window.opener && typeof window.opener.adjustClassmateFriendship === 'function') return window.opener; } catch (e) {}
        try { if (window.top && window.top !== window && typeof window.top.adjustClassmateFriendship === 'function') return window.top; } catch (e) {}
        return null;
    }
    function notifyFriendship(delta) {
        var host = getHostWindow();
        if (host) { try { host.adjustClassmateFriendship(delta); return; } catch (e) {} }
        try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'classmate_friendship_delta', delta: delta }, '*'); } catch (e) {}
        try { localStorage.setItem('classmate_standalone_friendship', String(friendship)); } catch (e) {}
    }
    function loadStandaloneFriendship() {
        try {
            var saved = localStorage.getItem('classmate_standalone_friendship');
            if (saved !== null && !getHostWindow() && scenarioData.friendshipInitial === undefined) {
                var n = parseFloat(saved);
                if (isFinite(n)) { friendship = n; friendshipStart = n; }
            }
        } catch (e) {}
    }

    // ── Voice engine ────────────────────────────────────────────────────
    function pickVoice(senderName) {
        if (!('speechSynthesis' in window)) return null;
        var voices = window.speechSynthesis.getVoices() || [];
        if (!voices.length) return null;
        var wanted = CHARACTER.voice;
        var g = CHARACTER.gender;
        var all = window.__APP_CHARACTERS || [];
        if (senderName) {
            for (var i = 0; i < all.length; i++) {
                var c = all[i];
                var matches = c && ((c.name && c.name.toLowerCase() === String(senderName).toLowerCase()) || c.code === senderName || c.id === senderName);
                if (matches) { if (c.voice) wanted = c.voice; if (c.gender) g = c.gender; break; }
            }
        }
        if (wanted) {
            for (var v = 0; v < voices.length; v++) {
                if (voices[v].voiceURI === wanted || (voices[v].name || '').toLowerCase().indexOf(String(wanted).toLowerCase()) !== -1) return voices[v];
            }
        }
        var natural = [];
        for (var j = 0; j < voices.length; j++) {
            var nm = voices[j].name || '';
            if (/natural|neural|online|premium|enhanced|google|siri/i.test(nm) || /^en(-|_)/i.test(voices[j].lang || '')) natural.push(voices[j]);
        }
        var isMale = g === 'male';
        for (var k = 0; k < natural.length; k++) {
            var n2 = natural[k].name || '';
            if (isMale && /guy|david|ryan|christopher|george|daniel|male/i.test(n2)) return natural[k];
            if (!isMale && /aria|jenny|samantha|victoria|karen|serena|ava|zira|female/i.test(n2)) return natural[k];
        }
        for (var m = 0; m < natural.length; m++) { if (/^en/i.test(natural[m].lang || '')) return natural[m]; }
        return voices[0] || null;
    }
    function setSubstate(mode) {
        var sub = el('tg-sub');
        if (!sub) return;
        if (mode === 'speaking') {
            sub.className = 'tg-sub tg-speaking';
            sub.innerHTML = '<span class="tg-eq"><i></i><i></i><i></i><i></i></span> speaking…';
        } else if (mode === 'typing') {
            sub.className = 'tg-sub';
            sub.innerHTML = '<span class="tg-eq"><i></i><i></i><i></i><i></i></span> typing…';
        } else {
            sub.className = 'tg-sub';
            sub.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;"></span> online · ' + ${JSON.stringify(escapedRole)};
        }
    }
    function speak(text, sender, onDone) {
        var clean = plain(text);
        if (!clean || !('speechSynthesis' in window)) { if (onDone) onDone(); return; }
        lastSpokenBy[sender || CHARACTER.name] = text;
        try { window.speechSynthesis.cancel(); } catch (e) {}
        var utter = new SpeechSynthesisUtterance(clean);
        var voice = pickVoice(sender);
        if (voice) utter.voice = voice;
        utter.rate = 0.96;
        utter.pitch = 1.0;
        isSpeaking = true;
        setSubstate('speaking');
        function finish() { isSpeaking = false; setSubstate('idle'); if (onDone) onDone(); }
        utter.onend = finish;
        utter.onerror = finish;
        try { window.speechSynthesis.speak(utter); } catch (e) { finish(); }
    }

    // ── Meter UI ────────────────────────────────────────────────────────
    function renderMeter(delta, reason) {
        var level = levelFor(friendship);
        var chip = el('tg-meter-chip');
        if (chip) chip.style.borderColor = level.color + '55';
        var icon = el('tg-meter-icon'); if (icon) icon.textContent = level.icon;
        var label = el('tg-meter-label'); if (label) { label.textContent = level.label; label.style.color = level.color; }
        var score = el('tg-meter-score'); if (score) score.textContent = Math.round(friendship);
        var fill = el('tg-meter-fill'); if (fill) fill.style.width = pct(friendship) + '%';
        var scoreChip = el('tg-score-val'); if (scoreChip) scoreChip.textContent = stats.correct + '/' + stats.asked;
        var streakChip = el('tg-streak-val'); if (streakChip) streakChip.textContent = String(stats.streak);
        if (delta) {
            meterLog.unshift({ delta: delta, value: Math.round(friendship), reason: reason || 'Reply', at: fmtTime(new Date()) });
            if (meterLog.length > 14) meterLog.pop();
            flyScore(delta);
        }
    }
    function flyScore(delta) {
        var node = document.createElement('div');
        node.className = 'tg-fly' + (delta < 0 ? ' down' : '');
        node.textContent = (delta > 0 ? '+' : '') + delta + ' friendship';
        var shell = el('tg-shell') || document.body;
        shell.appendChild(node);
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1600);
    }
    function adjustFriendship(delta, reason) {
        if (!delta) { renderMeter(0); return; }
        var before = friendship;
        friendship = Math.max(-100, Math.min(100, friendship + delta));
        var applied = Math.round(friendship - before);
        if (applied !== 0) { notifyFriendship(applied); renderMeter(applied, reason); } else { renderMeter(0); }
    }
    function renderMeterSheet() {
        var sheet = el('tg-meter-sheet');
        if (!sheet) return;
        var level = levelFor(friendship);
        var next = nextLevelFor(friendship);
        var gained = Math.round(friendship - friendshipStart);
        var rows = LEVELS.map(function (lv) {
            var now = lv.label === level.label;
            return '<div class="tg-ladder-row' + (now ? ' tg-now' : '') + '">' +
                '<span style="font-size:17px;">' + lv.icon + '</span>' +
                '<span class="tg-lvl-name" style="color:' + lv.color + ';">' + lv.label + '</span>' +
                '<span class="tg-lvl-range">' + lv.min + '…' + lv.max + '</span></div>';
        }).join('');
        var log = meterLog.length ? meterLog.map(function (entry) {
            return '<div class="tg-log-row"><span>' + esc(entry.reason) + ' · ' + entry.at + '</span><b class="' + (entry.delta > 0 ? 'up' : 'down') + '">' + (entry.delta > 0 ? '+' : '') + entry.delta + ' → ' + entry.value + '</b></div>';
        }).join('') : '<div class="tg-log-row"><span>No changes yet — answer a question to move the meter.</span></div>';
        sheet.innerHTML =
            '<h3>' + level.icon + ' ' + level.label + '</h3>' +
            '<p>' + esc(CHARACTER.name) + ' and ' + esc(LEARNER.name) + ' are at <b style="color:' + level.color + ';">' + Math.round(friendship) + ' / 100</b>' +
            (next ? '. Next level: <b>' + next.icon + ' ' + next.label + '</b> in ' + Math.max(1, Math.round(next.min - friendship)) + ' point' + (Math.max(1, Math.round(next.min - friendship)) === 1 ? '' : 's') + '.' : '. This is the highest level in the scenario.') +
            '</p>' +
            '<div class="tg-meter-track" style="height:12px;"><div class="tg-meter-fill" style="width:' + pct(friendship) + '%;"></div></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:700;color:#64748b;margin-top:6px;"><span>Session change: ' + (gained > 0 ? '+' : '') + gained + '</span><span>' + stats.correct + '/' + stats.asked + ' correct · best streak ' + stats.best + '</span></div>' +
            '<h3 style="margin-top:18px;">Relationship ladder</h3>' +
            '<div class="tg-ladder">' + rows + '</div>' +
            '<h3 style="margin-top:18px;">Recent changes</h3>' +
            '<div class="tg-log">' + log + '</div>';
    }
    function openOverlay(id) { var o = el(id); if (o) o.classList.add('tg-open'); }
    function closeOverlay(id) { var o = el(id); if (o) o.classList.remove('tg-open'); }

    // ── Chat rendering ──────────────────────────────────────────────────
    function chatContainer() { return el('tg-chat'); }
    function scrollChat() { var c = chatContainer(); if (c) c.scrollTop = c.scrollHeight; }
    function smartScroll(row) {
        var c = chatContainer();
        if (!c || !row) { scrollChat(); return; }
        try {
            if (row.offsetHeight > c.clientHeight * 0.7) c.scrollTop = Math.max(0, row.offsetTop - 14);
            else c.scrollTop = c.scrollHeight;
        } catch (e) { scrollChat(); }
    }
    function systemChip(text) {
        var c = chatContainer(); if (!c) return;
        var d = document.createElement('div');
        d.className = 'tg-system';
        d.textContent = text;
        c.appendChild(d);
        scrollChat();
    }
    function dayDivider() {
        var c = chatContainer(); if (!c) return;
        if (c.querySelector('.tg-day')) return;
        var d = document.createElement('div');
        d.className = 'tg-day';
        d.textContent = 'Today';
        c.appendChild(d);
    }

    function isTestType(type) { return type === 'quiz_single' || type === 'quiz_multi' || type === 'true_false' || type === 'sorting' || type === 'drag_drop'; }
    function isGameStep(step) { return !!step && step.mediaType === 'game' && (step.gameType || step.pairs || step.word); }

    // The option letter is already rendered as a key chip, so an authored "A) "
    // prefix would show up twice. Strip it for display only.
    /**
     * Inline markdown → HTML. AI scenarios arrive with **bold**, ~~strike~~ and
     * line breaks; the engine used to print the asterisks literally. Existing
     * HTML (<b>, <br>, tables …) is deliberately left untouched so every older
     * scenario keeps rendering exactly as before. Built without regex literals
     * because this whole function is serialized inside a template literal.
     */
    function richText(value) {
        var s = String(value == null ? '' : value);
        if (s.indexOf('**') !== -1) {
            var b = s.split('**');
            var jb = '';
            for (var i = 0; i < b.length; i++) {
                jb += (i % 2 === 1 && i + 1 < b.length) ? '<b>' + b[i] + '</b>' : b[i];
            }
            s = jb;
        }
        if (s.indexOf('~~') !== -1) {
            var t = s.split('~~');
            var jt = '';
            for (var k = 0; k < t.length; k++) {
                jt += (k % 2 === 1 && k + 1 < t.length) ? '<s>' + t[k] + '</s>' : t[k];
            }
            s = jt;
        }
        if (s.indexOf('*') !== -1) {
            var it = s.split('*');
            var ji = '';
            for (var m = 1; m + 1 < it.length; m += 2) {
                it[m] = '<em>' + it[m] + '</em>';
            }
            ji = it.join('');
            s = ji;
        }
        s = s.split('\\n').join('<br/>');
        return s;
    }

    function optionLabelText(text) {
        var out = String(text == null ? '' : text);
        var patterns = [/^\\s*\\**\\s*\\(?([A-Ha-h])[).:\\-]\\s*\\**\\s*/, /^\\s*\\**\\s*([A-Ha-h])[).:\\-]\\s*\\**\\s*/];
        for (var i = 0; i < patterns.length; i++) {
            var m = out.match(patterns[i]);
            if (m) return out.slice(m[0].length);
        }
        return out;
    }

    function youtubeEmbedUrl(url) {
        var u = String(url || '');
        if (u.indexOf('/embed/') !== -1) return u;
        u = u.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/').replace('youtube.com/shorts/', 'youtube.com/embed/');
        return u;
    }
    function soundcloudSrc(url) {
        return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(String(url || '')) + '&color=%232563eb&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true';
    }
    function spotifySrc(url) {
        var u = String(url || '');
        if (u.indexOf('/embed/') !== -1) return u;
        return u.replace('open.spotify.com/', 'open.spotify.com/embed/');
    }
    function vimeoSrc(url) {
        var u = String(url || '');
        if (u.indexOf('player.vimeo.com') !== -1) return u;
        var m = u.match(/vimeo\\.com\\/(\\d+)/);
        return m ? 'https://player.vimeo.com/video/' + m[1] : u;
    }
    function mediaFor(step) {
        var type = step.mediaType;
        if (!type || type === 'game') return '';
        var caption = step.mediaCaption ? '<div class="tg-caption">' + step.mediaCaption + '</div>' : '';
        var height = step.mediaHeight ? String(step.mediaHeight) : '';

        if (type === 'table' && step.mediaContent) {
            return '<div class="tg-table-wrap">' + step.mediaContent + '</div>' + caption;
        }
        if (type === 'sticker') {
            var stickers = String(step.mediaContent || step.mediaUrl || '⭐');
            var parts = stickers.indexOf(' ') !== -1 ? stickers.split(/\\s+/) : [stickers];
            var html = parts.map(function (s) { return '<span class="tg-sticker">' + s + '</span>'; }).join('');
            return '<div style="text-align:center;">' + html + '</div>' + caption;
        }
        if (type === 'youtube' && step.mediaUrl) {
            /* The frame can stay black with no internet (a lesson opened straight
               from a saved file), so every host video also carries its own
               "open in a new tab" button - the player is then loaded by the
               browser itself, where the network and the codecs are the real
               ones. Same for Vimeo below. */
            return '<div class="tg-media"><span class="tg-tag">▶ YOUTUBE</span>'
                + '<div class="tg-embed"><iframe src="' + esc(youtubeEmbedUrl(step.mediaUrl)) + '" title="YouTube video" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>'
                + '<div class="tg-embed-note"><span>' + esc(plain(step.mediaCaption || 'No video in an offline lesson? Open it in a tab.')) + '</span>'
                + '<button class="tg-mini" data-open-url="' + esc(step.mediaUrl) + '" title="Open this video in a new browser tab"><i class="fas fa-up-right-from-square"></i> Open in a new tab</button></div></div>' + caption;
        }
        if (type === 'vimeo' && step.mediaUrl) {
            return '<div class="tg-media"><span class="tg-tag">▶ VIMEO</span>'
                + '<div class="tg-embed"><iframe src="' + esc(vimeoSrc(step.mediaUrl)) + '" title="Vimeo video" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>'
                + '<div class="tg-embed-note"><span>' + esc(plain(step.mediaCaption || 'No video in an offline lesson? Open it in a tab.')) + '</span>'
                + '<button class="tg-mini" data-open-url="' + esc(step.mediaUrl) + '" title="Open this video in a new browser tab"><i class="fas fa-up-right-from-square"></i> Open in a new tab</button></div></div>' + caption;
        }
        if (type === 'video' && step.mediaUrl) {
            return '<div class="tg-media"><span class="tg-tag">▶ VIDEO</span><video controls preload="metadata" src="' + esc(step.mediaUrl) + '"></video></div>' + caption;
        }
        if (type === 'gif' && step.mediaUrl) {
            return '<div class="tg-media tg-gif"><span class="tg-tag">GIF</span><img src="' + esc(step.mediaUrl) + '" alt="GIF" /></div>' + caption;
        }
        if (type === 'image' && step.mediaUrl) {
            return '<div class="tg-media"><img src="' + esc(step.mediaUrl) + '" alt="Image" data-zoom="' + esc(step.mediaUrl) + '" /></div>' + caption;
        }
        if ((type === 'audio' || type === 'sound' || type === 'music') && (step.mediaUrl || step.mediaContent)) {
            var aTitle = step.mediaCaption || step.mediaTitle || 'Audio clip';
            return '<div class="tg-media tg-audio-card">' +
                '<div class="tg-audio-top"><button class="tg-play" data-audio-play="1" title="Play"><i class="fas fa-play"></i></button>' +
                '<div style="flex:1;min-width:0;"><div class="tg-audio-title">' + esc(plain(aTitle)) + '</div><div class="tg-audio-sub" data-audio-time>0:00 / 0:00</div></div>' +
                '<button class="tg-mini" data-audio-open="' + esc(step.mediaUrl || '') + '" title="Open audio in a new tab"><i class="fas fa-up-right-from-square"></i></button></div>' +
                '<div class="tg-audio-bar"><span></span></div>' +
                '<audio preload="metadata" src="' + esc(step.mediaUrl || '') + '" style="display:none;"></audio></div>';
        }
        if (type === 'soundcloud' && step.mediaUrl) {
            return '<div class="tg-media"><span class="tg-tag">🎧 SOUNDCLOUD</span>' +
                '<div class="tg-embed tg-embed-fixed" style="height:' + (height || '170') + 'px;"><iframe src="' + esc(soundcloudSrc(step.mediaUrl)) + '" title="SoundCloud player" allow="autoplay"></iframe></div>' +
                '<div class="tg-embed-note"><span>' + esc(plain(step.mediaCaption || 'SoundCloud track')) + '</span><a href="' + esc(step.mediaUrl) + '" target="_blank" rel="noopener">Open ↗</a></div></div>';
        }
        if (type === 'spotify' && step.mediaUrl) {
            return '<div class="tg-media"><span class="tg-tag">🎵 SPOTIFY</span>' +
                '<div class="tg-embed tg-embed-fixed" style="height:' + (height || '172') + 'px;"><iframe src="' + esc(spotifySrc(step.mediaUrl)) + '" title="Spotify player" allow="autoplay; clipboard-write; encrypted-media"></iframe></div>' +
                '<div class="tg-embed-note"><span>' + esc(plain(step.mediaCaption || 'Spotify player')) + '</span><a href="' + esc(step.mediaUrl) + '" target="_blank" rel="noopener">Open ↗</a></div></div>';
        }
        if ((type === 'embed' || type === 'iframe' || type === 'site' || type === 'website') && step.mediaUrl) {
            var frameHeight = height || '320';
            return '<div class="tg-media"><span class="tg-tag tg-tag-site">🌍 LIVE SITE</span>' +
                '<div class="tg-embed" style="padding-top:0;height:' + frameHeight + 'px;"><iframe src="' + esc(step.mediaUrl) + '" title="Embedded site" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"></iframe></div>' +
                '<div class="tg-embed-note"><span>' + esc(plain(step.mediaCaption || 'Some sites refuse to be embedded — use the link if the frame stays empty.')) + '</span><a href="' + esc(step.mediaUrl) + '" target="_blank" rel="noopener">Open ↗</a></div></div>';
        }
        if (type === 'voice') {
            var spokenScript = step.mediaContent || step.text || '';
            var seconds = Math.max(6, Math.round(plain(spokenScript).split(/\\s+/).length / 2.6));
            var bars = '';
            for (var b = 0; b < 26; b++) { bars += '<i style="height:' + (5 + ((b * 37) % 22)) + 'px;"></i>'; }
            return '<div class="tg-media tg-voice" data-voice-note="' + esc(spokenScript) + '">' +
                '<button class="tg-play" data-voice-play="1" title="Play voice note"><i class="fas fa-play"></i></button>' +
                '<div class="tg-wave">' + bars + '</div>' +
                '<div class="tg-voice-time">0:' + (seconds < 10 ? '0' : '') + seconds + '</div></div>' + caption;
        }
        if (type === 'code' && (step.mediaContent || step.mediaUrl)) {
            return '<div class="tg-media" style="padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13.5px;color:#0f766e;white-space:pre-wrap;">' + esc(step.mediaContent || step.mediaUrl) + '</div>' + caption;
        }
        if (type === 'link' && step.mediaUrl) {
            return '<a class="tg-media" style="display:block;padding:12px;text-decoration:none;color:#1d4ed8;font-size:14px;font-weight:700;" href="' + esc(step.mediaUrl) + '" target="_blank" rel="noopener"><i class="fas fa-link"></i> ' + esc(step.mediaCaption || step.mediaUrl) + '</a>';
        }
        return '';
    }

    function actionBar(step) {
        return '<div class="tg-actions">' +
            '<button class="tg-mini" data-replay="' + esc(step.id) + '"><i class="fas fa-volume-high"></i> Replay</button>' +
            '<button class="tg-mini" data-copy="' + esc(step.id) + '"><i class="fas fa-copy"></i> Copy</button>' +
            '</div>';
    }

    function appendIncomingMessage(step, showAvatar) {
        var c = chatContainer(); if (!c) return null;
        var row = document.createElement('div');
        row.className = 'tg-row tg-in' + (showAvatar ? '' : ' tg-noavatar');
        row.setAttribute('data-step-id', step.id);
        var bubble =
            '<div class="tg-text">' + richText(step.text) + '</div>' +
            mediaFor(step) +
            '<div class="tg-meta">' + (isTestType(step.type) ? '<span style="color:#b45309;font-weight:800;">TEST</span>' : '') + (isGameStep(step) ? '<span style="color:#4338ca;font-weight:800;">GAME</span>' : '') + '<span>' + fmtTime(new Date()) + '</span></div>' +
            actionBar(step);
        row.innerHTML = (showAvatar ? '<img class="tg-msg-avatar" src="' + esc(CHARACTER.avatar) + '" alt="' + escapeAttr(CHARACTER.name) + '" data-fallback="' + escapeAttr(CHARACTER.avatarFallback) + '" />' : '<div class="tg-avatar-spacer"></div>') +
            '<div class="tg-bubble">' + bubble + '</div>';
        c.appendChild(row);
        smartScroll(row);
        return row;
    }

    function appendOutgoingMessage(text, meta) {
        var c = chatContainer(); if (!c) return null;
        var row = document.createElement('div');
        row.className = 'tg-row tg-out';
        row.innerHTML = '<div class="tg-bubble"><div class="tg-text">' + text + '</div>' +
            '<div class="tg-meta">' + (meta ? '<span style="color:#b45309;font-weight:800;">' + meta + '</span>' : '') + '<span>' + fmtTime(new Date()) + '</span><i class="fas fa-check-double"></i></div></div>';
        c.appendChild(row);
        scrollChat();
        return row;
    }

    function showTyping() {
        var c = chatContainer(); if (!c) return;
        setSubstate('typing');
        var row = document.createElement('div');
        row.className = 'tg-row tg-in';
        row.id = 'tg-typing-row';
        row.innerHTML = '<img class="tg-msg-avatar" src="' + esc(CHARACTER.avatar) + '" alt="" data-fallback="' + escapeAttr(CHARACTER.avatarFallback) + '" /><div class="tg-bubble"><div class="tg-typing"><i></i><i></i><i></i></div></div>';
        c.appendChild(row);
        scrollChat();
    }
    function hideTyping() {
        var row = el('tg-typing-row');
        if (row && row.parentNode) row.parentNode.removeChild(row);
        if (!isSpeaking) setSubstate('idle');
    }

    function renderStep(step) {
        if (!step) return;
        var choices = el('tg-choices');
        if (choices) choices.innerHTML = '<div class="tg-hint"><i class="fas fa-ellipsis fa-fade" style="color:#94a3b8;"></i> ' + esc(CHARACTER.name) + ' is writing…</div>';

        var seenBefore = !!answeredSteps[step.id];
        hideTyping();
        clearTimers();

        function present() {
            appendIncomingMessage(step, true);
            if (autoVoice && !seenBefore) speak(step.readAloudText || step.text, step.sender);
            if (seenBefore) {
                if (choices) {
                    choices.innerHTML = '';
                    var note = document.createElement('div');
                    note.className = 'tg-verdict info';
                    note.innerHTML = '<i class="fas fa-circle-check"></i> You already answered this one. Use the segment pills above to keep going, or press <b>Restart</b> for a clean run.';
                    choices.appendChild(note);
                    offerAdvance(step, step.nextStepId, 0);
                }
                return;
            }
            if (isGameStep(step)) renderGame(step);
            else renderChoices(step);
        }

        if (seenBefore) { present(); return; }

        showTyping();
        clearTimeout(typingTimer);
        typingTimer = setTimeout(function () {
            hideTyping();
            present();
        }, Math.min(1400, 520 + Math.round(plain(step.text || '').length / 12) * 4));
        updateProgress();
    }

    function clearTimers() {
        for (var i = 0; i < activeTimers.length; i++) { clearTimeout(activeTimers[i]); }
        activeTimers = [];
    }

    function nextStepAfter(step) {
        var act = getCurrentActivity();
        if (!act) return null;
        for (var i = 0; i < act.steps.length; i++) {
            if (act.steps[i].id === step.id) return act.steps[i + 1] ? { id: act.steps[i + 1].id, actIdx: currentActivityIdx } : null;
        }
        return null;
    }
    function nextActivityAfter() {
        for (var i = currentActivityIdx + 1; i < (scenarioData.activities || []).length; i++) {
            var act = scenarioData.activities[i];
            if (act && act.steps && act.steps.length) return i;
        }
        return -1;
    }

    /**
     * ONE way forward. AI scenarios routinely leave nextStepId off quiz steps, so
     * the learner must never end up in a dead end: fall back to the next step in
     * the segment, then the next segment, then the session recap.
     */
    function offerAdvance(step, explicitNextId, delay) {
        var choices = el('tg-choices'); if (!choices) return;
        var target = explicitNextId ? getStepById(explicitNextId) : null;
        var label, handler;

        if (target) {
            label = 'Continue · ' + plain(target.step.text).slice(0, 62) + '…';
            handler = function () { goToStep(target.step.id, target.actIdx); };
        } else {
            var inline = nextStepAfter(step);
            if (inline) {
                label = 'Continue to the next task';
                handler = function () { goToStep(inline.id, inline.actIdx); };
            } else {
                var nextAct = nextActivityAfter();
                if (nextAct !== -1) {
                    label = 'Next segment · ' + plain(scenarioData.activities[nextAct].title);
                    handler = function () { selectActivity(nextAct); };
                } else {
                    label = '📊 See your session recap';
                    handler = openRecap;
                }
            }
        }

        var btn = document.createElement('button');
        btn.className = 'tg-opt';
        btn.innerHTML = '<span class="tg-key"><i class="fas fa-arrow-right"></i></span><span class="tg-opt-text">' + esc(label) + '</span>';
        btn.onclick = handler;
        choices.appendChild(btn);
        if (delay) later(function () { if (btn.parentNode && !btn.disabled) btn.click(); }, delay);
    }

    // ── Choices + grading ───────────────────────────────────────────────
    function renderChoices(step) {
        var choices = el('tg-choices'); if (!choices) return;
        choices.innerHTML = '';
        var options = step.options || [];

        if (!options.length) {
            var done = document.createElement('div');
            done.className = 'tg-verdict good';
            done.innerHTML = '<i class="fas fa-flag-checkered"></i> Segment complete! Pick the next segment above, open your <b>recap</b>, or type your own reply below.';
            choices.appendChild(done);
            offerAdvance(step, step.nextStepId, 0);
            return;
        }

        if (step.type === 'sorting' || step.type === 'drag_drop') { renderSorting(step); return; }
        if (step.type === 'quiz_multi' || step.type === 'multiple_answers') { renderMulti(step); return; }
        if (step.type === 'poll') { renderPoll(step); return; }

        var key = 0;
        options.forEach(function (opt) {
            key += 1;
            var btn = document.createElement('button');
            btn.className = 'tg-opt';
            btn.type = 'button';
            btn.innerHTML = '<span class="tg-key">' + String.fromCharCode(64 + key) + '</span><span class="tg-opt-text">' + richText(optionLabelText(opt.text)) + '</span><span class="tg-mark"></span>';
            btn.onclick = function () { resolveSingle(step, opt, btn, options); };
            choices.appendChild(btn);
        });
    }

    function resolveSingle(step, opt, btn, options) {
        var graded = typeof opt.isCorrect === 'boolean';
        var good = graded ? !!opt.isCorrect : true;
        stats.answered += 1;
        if (graded) {
            stats.asked += 1;
            if (good) { stats.correct += 1; stats.streak += 1; stats.xp += 10; if (stats.streak > stats.best) stats.best = stats.streak; }
            else { stats.streak = 0; }
        }
        answeredSteps[step.id] = true;
        answerReview.push({ q: plain(step.text).slice(0, 110), a: plain(opt.text), good: good, graded: graded });

        appendOutgoingMessage(esc(plain(opt.text)), graded ? (good ? 'CORRECT' : 'WRONG') : '');

        var buttons = el('tg-choices') ? el('tg-choices').querySelectorAll('.tg-opt') : [];
        for (var i = 0; i < buttons.length; i++) { buttons[i].disabled = true; }
        if (graded) {
            for (var j = 0; j < buttons.length; j++) {
                var optForBtn = options[j];
                var isRight = optForBtn && optForBtn.isCorrect === true;
                var isPicked = optForBtn === opt;
                buttons[j].classList.add(isRight ? 'tg-correct' : (isPicked ? 'tg-wrong' : 'tg-dim'));
                buttons[j].querySelector('.tg-mark').innerHTML = isRight ? '<i class="fas fa-circle-check" style="color:#10b981;"></i>' : (isPicked ? '<i class="fas fa-circle-xmark" style="color:#ef4444;"></i>' : '');
            }
        } else {
            btn.classList.add('tg-picked');
        }

        var delta = (typeof opt.friendshipChange === 'number') ? opt.friendshipChange : (graded ? (good ? 2 : -1) : 1);
        adjustFriendship(graded && !good ? Math.min(0, delta) : delta, graded ? (good ? 'Correct answer' : 'Wrong answer') : 'Reply');

        var verdict = document.createElement('div');
        verdict.className = 'tg-verdict ' + (!graded ? 'info' : (good ? 'good' : 'bad'));
        var explanation = opt.feedbackSpeech || step.explanation || '';
        verdict.innerHTML = (graded
            ? (good ? '<i class="fas fa-circle-check" style="color:#10b981;"></i>' : '<i class="fas fa-circle-xmark" style="color:#ef4444;"></i>')
            : '<i class="fas fa-comment-dots" style="color:#3b82f6;"></i>') +
            '<span>' + richText(explanation || (good ? 'Nice work — that is correct.' : 'Not this time — check the marked answer above.')) + '</span>';
        if (el('tg-choices')) el('tg-choices').appendChild(verdict);

        if (explanation) speak(explanation, step.sender);
        offerAdvance(step, opt.nextStepId || step.nextStepId, 1300);
        if (opt.showRecap) later(openRecap, 900);
        updateProgress();
        renderMeter(0);
    }

    function renderMulti(step) {
        var choices = el('tg-choices');
        var picked = {};
        (step.options || []).forEach(function (opt) {
            var btn = document.createElement('button');
            btn.className = 'tg-opt';
            btn.type = 'button';
            btn.innerHTML = '<span class="tg-key"><i class="far fa-square"></i></span><span class="tg-opt-text">' + richText(optionLabelText(opt.text)) + '</span>';
            btn.onclick = function () {
                picked[opt.id] = !picked[opt.id];
                btn.classList.toggle('tg-picked', !!picked[opt.id]);
                btn.querySelector('.tg-key').innerHTML = picked[opt.id] ? '<i class="fas fa-square-check"></i>' : '<i class="far fa-square"></i>';
            };
            choices.appendChild(btn);
        });
        var submit = document.createElement('button');
        submit.className = 'tg-submit';
        submit.innerHTML = '<i class="fas fa-paper-plane"></i> Submit answers';
        submit.onclick = function () { resolveMulti(step, picked); };
        choices.appendChild(submit);
    }

    function resolveMulti(step, picked) {
        var options = step.options || [];
        var rightIds = options.filter(function (o) { return o.isCorrect === true; }).map(function (o) { return o.id; });
        var chosen = Object.keys(picked).filter(function (k) { return picked[k]; });
        var good = chosen.length > 0 && chosen.length === rightIds.length && chosen.every(function (id) { return rightIds.indexOf(id) !== -1; });

        stats.answered += 1;
        stats.asked += 1;
        if (good) { stats.correct += 1; stats.streak += 1; stats.xp += 15; if (stats.streak > stats.best) stats.best = stats.streak; }
        else { stats.streak = 0; }
        answeredSteps[step.id] = true;
        function labelFor(id) {
            var m = options.filter(function (o) { return o.id === id; })[0];
            return m ? plain(m.text) : id;
        }
        answerReview.push({ q: plain(step.text).slice(0, 110), a: chosen.map(labelFor).join(' + '), good: good, graded: true });
        appendOutgoingMessage(chosen.map(function (id) { return '• ' + esc(labelFor(id)); }).join('<br/>'), good ? 'CORRECT' : 'WRONG');

        var buttons = el('tg-choices').querySelectorAll('.tg-opt');
        for (var i = 0; i < buttons.length; i++) { buttons[i].disabled = true; }
        for (var j = 0; j < buttons.length; j++) {
            var opt = options[j];
            var isRight = opt && opt.isCorrect === true;
            var isPicked = opt && chosen.indexOf(opt.id) !== -1;
            buttons[j].classList.add(isRight ? 'tg-correct' : (isPicked ? 'tg-wrong' : 'tg-dim'));
            buttons[j].querySelector('.tg-key').innerHTML = isRight ? '<i class="fas fa-circle-check"></i>' : (isPicked ? '<i class="fas fa-circle-xmark"></i>' : '<i class="far fa-square"></i>');
        }
        var submitBtn = el('tg-choices').querySelector('.tg-submit');
        if (submitBtn) submitBtn.remove();

        var perOption = options.filter(function (o) { return o.isCorrect === true && o.feedbackSpeech; })[0];
        var explanation = step.explanation || (perOption && perOption.feedbackSpeech) || '';
        var verdict = document.createElement('div');
        verdict.className = 'tg-verdict ' + (good ? 'good' : 'bad');
        verdict.innerHTML = (good ? '<i class="fas fa-circle-check" style="color:#10b981;"></i>' : '<i class="fas fa-triangle-exclamation" style="color:#d97706;"></i>') +
            '<span>' + richText(explanation || (good ? 'Perfect — every correct choice selected.' : 'Check the marked answers above.')) + '</span>';
        el('tg-choices').appendChild(verdict);

        adjustFriendship(good ? 3 : -1, good ? 'Multi-answer correct' : 'Multi-answer wrong');
        if (explanation) speak(explanation, step.sender);
        offerAdvance(step, step.nextStepId, 1500);
        updateProgress();
    }

    function renderSorting(step) {
        var choices = el('tg-choices');
        var items = (step.options || []).slice();
        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:7px;';

        function paint() {
            wrap.innerHTML = '';
            items.forEach(function (item, idx) {
                var row = document.createElement('div');
                row.className = 'tg-sort-row';
                row.innerHTML = '<span class="tg-sort-num">' + (idx + 1) + '</span>' +
                    '<span class="tg-sort-text">' + richText(item.text) + '</span>' +
                    '<span class="tg-sort-move">' +
                    (idx > 0 ? '<button data-move="up" title="Move up"><i class="fas fa-chevron-up"></i></button>' : '') +
                    (idx < items.length - 1 ? '<button data-move="down" title="Move down"><i class="fas fa-chevron-down"></i></button>' : '') +
                    '</span>';
                var up = row.querySelector('[data-move="up"]');
                var down = row.querySelector('[data-move="down"]');
                if (up) up.onclick = function () { var t = items[idx - 1]; items[idx - 1] = items[idx]; items[idx] = t; paint(); };
                if (down) down.onclick = function () { var t = items[idx + 1]; items[idx + 1] = items[idx]; items[idx] = t; paint(); };
                wrap.appendChild(row);
            });
        }
        paint();
        choices.appendChild(wrap);

        var submit = document.createElement('button');
        submit.className = 'tg-submit';
        submit.style.marginTop = '8px';
        submit.innerHTML = '<i class="fas fa-check-double"></i> Submit order';
        submit.onclick = function () {
            var expected = (step.correctOrder && step.correctOrder.length) ? step.correctOrder : items.map(function (o) { return o.id; });
            var actual = items.map(function (o) { return o.id; });
            var good = expected.length === actual.length && expected.every(function (id, i) { return id === actual[i]; });

            var rows = wrap.querySelectorAll('.tg-sort-row');
            for (var i = 0; i < rows.length; i++) {
                rows[i].classList.add(items[i] && items[i].id === expected[i] ? 'tg-correct' : 'tg-wrong');
            }
            var ordered = expected.map(function (id, i) {
                var m = (step.options || []).filter(function (o) { return o.id === id; })[0];
                return (i + 1) + '. ' + esc(m ? plain(m.text) : id);
            }).join('<br/>');
            appendOutgoingMessage('Order submitted:<br/>' + ordered, good ? 'CORRECT' : 'WRONG');

            stats.answered += 1; stats.asked += 1;
            if (good) { stats.correct += 1; stats.streak += 1; stats.xp += 15; if (stats.streak > stats.best) stats.best = stats.streak; } else { stats.streak = 0; }
            answeredSteps[step.id] = true;
            answerReview.push({ q: plain(step.text).slice(0, 110), a: actual.join(' → '), good: good, graded: true });

            submit.remove();
            var verdict = document.createElement('div');
            verdict.className = 'tg-verdict ' + (good ? 'good' : 'bad');
            verdict.style.marginTop = '8px';
            verdict.innerHTML = (good ? '<i class="fas fa-circle-check" style="color:#10b981;"></i>' : '<i class="fas fa-triangle-exclamation" style="color:#d97706;"></i>') +
                '<span>' + richText(step.explanation || (good ? 'Perfect sequence!' : 'Here is the correct order — read it once out loud.')) + '</span>';
            choices.appendChild(verdict);
            adjustFriendship(good ? 3 : -1, good ? 'Sequence correct' : 'Sequence wrong');
            if (step.feedbackSpeech) speak(step.feedbackSpeech, step.sender);
            offerAdvance(step, step.nextStepId, 1500);
            updateProgress();
        };
        choices.appendChild(submit);
    }

    function renderPoll(step) {
        var choices = el('tg-choices');
        var already = !!step.__polled;
        (step.options || []).forEach(function (opt) {
            var row = document.createElement('div');
            row.className = 'tg-poll-row';
            var percent = typeof opt.percent === 'number' ? opt.percent : 0;
            row.innerHTML = '<div class="tg-poll-fill" style="width:' + (already ? percent : 0) + '%;"></div>' +
                '<div class="tg-poll-text"><span>' + richText(opt.text) + '</span><span>' + (already ? percent + '%' : '<i class="far fa-circle"></i>') + '</span></div>';
            if (!already) {
                row.style.cursor = 'pointer';
                row.onclick = function () {
                    step.__polled = true;
                    appendOutgoingMessage(esc(plain(opt.text)), 'VOTED');
                    var all = choices.querySelectorAll('.tg-poll-row');
                    for (var i = 0; i < all.length; i++) { all[i].style.cursor = 'default'; }
                    (step.options || []).forEach(function (o, idx) {
                        var p = typeof o.percent === 'number' ? o.percent : 0;
                        all[idx].querySelector('.tg-poll-fill').style.width = p + '%';
                        all[idx].querySelector('.tg-poll-text').lastChild.innerHTML = p + '%';
                        if (o === opt) { all[idx].style.borderColor = '#6ee7b7'; all[idx].style.background = '#ecfdf5'; }
                    });
                    stats.answered += 1; stats.asked += 1; stats.correct += 1; stats.streak += 1; stats.xp += 5;
                    if (stats.streak > stats.best) stats.best = stats.streak;
                    answeredSteps[step.id] = true;
                    answerReview.push({ q: plain(step.text).slice(0, 110), a: plain(opt.text), good: true, graded: false });
                    adjustFriendship(typeof opt.friendshipChange === 'number' ? opt.friendshipChange : 2, 'Poll answer');
                    if (opt.feedbackSpeech) speak(opt.feedbackSpeech, step.sender);
                    var verdict = document.createElement('div');
                    verdict.className = 'tg-verdict info';
                    verdict.style.marginTop = '8px';
                    verdict.innerHTML = '<i class="fas fa-chart-simple"></i><span>' + richText(opt.feedbackSpeech || 'Thanks — that is your plan for this week.') + '</span>';
                    choices.appendChild(verdict);
                    offerAdvance(step, step.nextStepId, 1500);
                    updateProgress();
                };
            }
            choices.appendChild(row);
        });
    }

    // ── Mini games ──────────────────────────────────────────────────────
    function pairsFor(step) {
        var raw = [];
        if (Array.isArray(step.pairs) && step.pairs.length) raw = step.pairs.slice();
        else if (Array.isArray(step.options) && step.options.length) raw = step.options.slice();

        var pairs = [];
        raw.forEach(function (item) {
            if (!item) return;
            if (typeof item === 'string') item = { text: item };
            var term = item.term || item.left || '';
            var definition = item.definition || item.match || item.right || '';
            if (!term && item.text) {
                var text = String(item.text);
                var split = text.split('|');
                if (split.length < 2) split = text.split('=');
                if (split.length < 2) split = text.split(' - ');
                term = split[0];
                definition = split[1] || '';
            }
            term = String(term || '').trim();
            definition = String(definition || '').trim();
            if (term && definition) pairs.push({ term: term, definition: definition, id: item.id || term });
        });
        return pairs;
    }
    function shuffled(list) {
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = out[i]; out[i] = out[j]; out[j] = t;
        }
        return out;
    }
    function gameHeader(step, title, meta) {
        return '<div class="tg-game-head"><div class="tg-game-title"><span class="tg-badge">GAME</span> ' + esc(title) + '</div><div class="tg-game-meta">' + esc(meta) + '</div></div>';
    }
    function finishGame(step, solved, detail) {
        stats.games += 1;
        if (solved) {
            stats.gamesWon += 1;
            stats.answered += 1; stats.asked += 1; stats.correct += 1; stats.streak += 1; stats.xp += 20;
            if (stats.streak > stats.best) stats.best = stats.streak;
        } else {
            stats.answered += 1; stats.asked += 1; stats.streak = 0;
        }
        answeredSteps[step.id] = true;
        answerReview.push({ q: plain(step.text).slice(0, 110), a: detail, good: solved, graded: true });
        var delta = typeof step.friendshipChange === 'number' ? step.friendshipChange : (solved ? 3 : 1);
        adjustFriendship(solved ? delta : Math.min(1, delta), solved ? 'Game won' : 'Game finished');
        var verdict = document.createElement('div');
        verdict.className = 'tg-verdict ' + (solved ? 'good' : 'info');
        verdict.style.marginTop = '8px';
        verdict.innerHTML = (solved ? '<i class="fas fa-trophy" style="color:#d97706;"></i>' : '<i class="fas fa-lightbulb" style="color:#3b82f6;"></i>') +
            '<span>' + richText(step.feedbackSpeech || (solved ? 'Solved it — nicely done!' : 'Here is the answer, keep it in mind.')) + '</span>';
        if (el('tg-choices')) el('tg-choices').appendChild(verdict);
        if (step.feedbackSpeech) speak(step.feedbackSpeech, step.sender);
        offerAdvance(step, step.nextStepId, 2200);
        updateProgress();
    }

    function renderGame(step) {
        var choices = el('tg-choices'); if (!choices) return;
        choices.innerHTML = '';
        var type = String(step.gameType || (step.word ? 'scramble' : 'match')).toLowerCase();
        if (type === 'memory') renderMemoryGame(step);
        else if (type === 'scramble' || type === 'word') renderScrambleGame(step);
        else renderMatchGame(step);
    }

    function renderMatchGame(step) {
        var choices = el('tg-choices');
        var pairs = pairsFor(step);
        if (!pairs.length) {
            var note = document.createElement('div');
            note.className = 'tg-verdict info';
            note.innerHTML = '<i class="fas fa-circle-info"></i> This match game needs "pairs": [{ "term": "...", "definition": "..." }].';
            choices.appendChild(note);
            offerAdvance(step, step.nextStepId, 0);
            return;
        }
        var terms = shuffled(pairs);
        var definitions = shuffled(pairs);
        var selected = null;
        var matched = {};
        var wrongTries = 0;

        var head = document.createElement('div');
        head.innerHTML = gameHeader(step, 'Match the pairs', '0 / ' + pairs.length + ' matched');
        choices.appendChild(head);
        var meta = head.querySelector('.tg-game-meta');

        var grid = document.createElement('div');
        grid.className = 'tg-match-grid';
        var left = document.createElement('div');
        left.className = 'tg-match-col';
        var right = document.createElement('div');
        right.className = 'tg-match-col';
        grid.appendChild(left);
        grid.appendChild(right);
        choices.appendChild(grid);

        function paint() {
            left.innerHTML = '';
            right.innerHTML = '';
            terms.forEach(function (pair) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'tg-card' + (matched[pair.id] ? ' tg-matched' : (selected && selected.id === pair.id && selected.side === 'term' ? ' tg-selected' : ''));
                btn.innerHTML = esc(pair.term) + (matched[pair.id] ? ' <i class="fas fa-circle-check" style="color:#10b981;"></i>' : '');
                btn.onclick = function () { pick(pair, 'term', btn); };
                left.appendChild(btn);
            });
            definitions.forEach(function (pair) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'tg-card' + (matched[pair.id] ? ' tg-matched' : (selected && selected.id === pair.id && selected.side === 'definition' ? ' tg-selected' : ''));
                btn.innerHTML = esc(pair.definition) + (matched[pair.id] ? ' <i class="fas fa-circle-check" style="color:#10b981;"></i>' : '');
                btn.onclick = function () { pick(pair, 'definition', btn); };
                right.appendChild(btn);
            });
            var done = Object.keys(matched).length;
            meta.textContent = done + ' / ' + pairs.length + ' matched';
            if (done === pairs.length) {
                later(function () { finishGame(step, wrongTries <= 2, 'Matched all ' + pairs.length + ' pairs'); }, 520);
            }
        }

        function pick(pair, side, node) {
            if (matched[pair.id]) return;
            if (!selected) { selected = { id: pair.id, side: side }; paint(); return; }
            if (selected.id === pair.id && selected.side === side) { selected = null; paint(); return; }
            if (selected.id === pair.id && selected.side !== side) {
                matched[pair.id] = true;
                selected = null;
                paint();
                return;
            }
            wrongTries += 1;
            selected = null;
            paint();
            var cards = choices.querySelectorAll('.tg-card');
            for (var i = 0; i < cards.length; i++) { cards[i].classList.add('tg-miss'); }
            later(function () {
                var again = choices.querySelectorAll('.tg-card');
                for (var k = 0; k < again.length; k++) { again[k].classList.remove('tg-miss'); }
            }, 420);
        }

        paint();
        var skip = document.createElement('button');
        skip.className = 'tg-submit';
        skip.style.background = '#f8fafc';
        skip.style.color = '#475569';
        skip.style.boxShadow = 'none';
        skip.style.border = '1px solid #dfe7f1';
        skip.style.marginTop = '8px';
        skip.innerHTML = '<i class="fas fa-forward"></i> Skip game';
        skip.onclick = function () { finishGame(step, false, 'Skipped the matching game'); };
        choices.appendChild(skip);
    }

    function renderMemoryGame(step) {
        var choices = el('tg-choices');
        var pairs = pairsFor(step);
        if (!pairs.length) { offerAdvance(step, step.nextStepId, 0); return; }
        var cards = [];
        pairs.forEach(function (p) {
            cards.push({ id: p.id, face: p.term, kind: 'term' });
            cards.push({ id: p.id, face: p.definition, kind: 'definition' });
        });
        cards = shuffled(cards);
        var open = [];
        var matched = {};
        var moves = 0;

        var head = document.createElement('div');
        head.innerHTML = gameHeader(step, 'Memory pairs', '0 / ' + pairs.length + ' pairs');
        choices.appendChild(head);
        var meta = head.querySelector('.tg-game-meta');
        var grid = document.createElement('div');
        grid.className = 'tg-memory-grid';
        choices.appendChild(grid);

        function paint() {
            grid.innerHTML = '';
            cards.forEach(function (card, idx) {
                var btn = document.createElement('button');
                btn.type = 'button';
                var isOpen = open.indexOf(idx) !== -1 || matched[card.id];
                btn.className = 'tg-memory-card' + (isOpen ? ' tg-flipped' : '') + (matched[card.id] ? ' tg-matched' : '');
                btn.innerHTML = esc(card.face);
                btn.onclick = function () { flip(idx); };
                grid.appendChild(btn);
            });
            meta.textContent = Object.keys(matched).length + ' / ' + pairs.length + ' pairs · ' + moves + ' moves';
        }

        function flip(idx) {
            if (open.indexOf(idx) !== -1) return;
            var card = cards[idx];
            if (matched[card.id]) return;
            open.push(idx);
            if (open.length === 2) {
                moves += 1;
                var a = cards[open[0]];
                var b = cards[open[1]];
                if (a.id === b.id && a.kind !== b.kind) {
                    matched[a.id] = true;
                    open = [];
                    paint();
                    if (Object.keys(matched).length === pairs.length) {
                        later(function () { finishGame(step, moves <= pairs.length + 2, 'Memory cleared in ' + moves + ' moves'); }, 500);
                    }
                    return;
                }
                paint();
                later(function () { open = []; paint(); }, 760);
                return;
            }
            paint();
        }
        paint();
    }

    function renderScrambleGame(step) {
        var choices = el('tg-choices');
        var answer = String(step.word || step.answer || step.mediaContent || (step.options[0] && step.options[0].text) || '').toUpperCase().replace(/[^A-Z]/g, '');
        if (!answer) { offerAdvance(step, step.nextStepId, 0); return; }
        var letters = shuffled(answer.split(''));
        var used = [];
        var built = [];

        var head = document.createElement('div');
        head.innerHTML = gameHeader(step, 'Word scramble', answer.length + ' letters');
        choices.appendChild(head);

        var slots = document.createElement('div');
        slots.className = 'tg-scramble-slots';
        choices.appendChild(slots);
        var hint = document.createElement('div');
        hint.className = 'tg-game-hint';
        hint.textContent = step.hint ? ('Hint: ' + step.hint) : 'Tap the letters in the right order.';
        choices.appendChild(hint);
        var tiles = document.createElement('div');
        tiles.className = 'tg-tiles';
        tiles.style.marginTop = '10px';
        choices.appendChild(tiles);
        var tools = document.createElement('div');
        tools.className = 'tg-game-tools';
        tools.style.marginTop = '10px';
        choices.appendChild(tools);

        function paint() {
            slots.innerHTML = '';
            for (var i = 0; i < answer.length; i++) {
                var cell = document.createElement('span');
                cell.className = 'tg-scramble-slot';
                cell.textContent = built[i] || '';
                slots.appendChild(cell);
            }
            tiles.innerHTML = '';
            letters.forEach(function (letter, idx) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'tg-tile' + (used.indexOf(idx) !== -1 ? ' tg-used' : '');
                btn.textContent = letter;
                btn.onclick = function () {
                    if (used.indexOf(idx) !== -1) return;
                    if (built.length >= answer.length) return;
                    used.push(idx);
                    built.push(letter);
                    paint();
                };
                tiles.appendChild(btn);
            });
            tools.innerHTML = '';
            var undo = document.createElement('button');
            undo.innerHTML = '<i class="fas fa-delete-left"></i> Undo';
            undo.onclick = function () {
                if (!built.length) return;
                built.pop();
                used.pop();
                paint();
            };
            var check = document.createElement('button');
            check.className = 'tg-primary';
            check.innerHTML = '<i class="fas fa-check"></i> Check word';
            check.onclick = function () {
                var attempt = built.join('');
                appendOutgoingMessage(esc(attempt || '—'), attempt === answer ? 'CORRECT' : 'WRONG');
                if (attempt === answer) {
                    finishGame(step, true, 'Spelled ' + answer);
                } else {
                    hint.textContent = 'Not yet — ' + answer.length + ' letters, starting with ' + answer.charAt(0) + '. Try again.';
                    built = [];
                    used = [];
                    paint();
                }
            };
            tools.appendChild(undo);
            tools.appendChild(check);
        }
        paint();
    }

    // ── Navigation ──────────────────────────────────────────────────────
    function goToStep(stepId, activityIdx) {
        clearTimers();
        if (typeof activityIdx === 'number' && activityIdx !== currentActivityIdx) {
            currentActivityIdx = activityIdx;
            if (scenarioData.activities[currentActivityIdx]) {
                visitedActivities[currentActivityIdx] = true;
                systemChip('Segment ' + (currentActivityIdx + 1) + ' · ' + scenarioData.activities[currentActivityIdx].title);
            }
            renderPills();
        }
        currentStepId = stepId;
        renderStep(getCurrentStep());
    }

    function selectActivity(idx) {
        clearTimers();
        currentActivityIdx = idx;
        visitedActivities[idx] = true;
        var act = scenarioData.activities[idx];
        if (!act || !act.steps || !act.steps.length) return;
        currentStepId = act.steps[0].id;
        var c = chatContainer();
        if (c) c.innerHTML = '';
        dayDivider();
        systemChip('Segment ' + (idx + 1) + ' · ' + act.title);
        renderPills();
        renderStep(getCurrentStep());
    }

    function renderPills() {
        var pills = el('tg-pills'); if (!pills) return;
        pills.innerHTML = '';
        (scenarioData.activities || []).forEach(function (act, idx) {
            var btn = document.createElement('button');
            btn.className = 'tg-pill' + (idx === currentActivityIdx ? ' active' : '') + (visitedActivities[idx] ? ' done' : '');
            btn.textContent = (idx + 1) + ' · ' + plain(act.title || ('Segment ' + (idx + 1)));
            btn.onclick = function () { selectActivity(idx); };
            pills.appendChild(btn);
        });
        var current = pills.querySelector('.tg-pill.active');
        if (current && current.scrollIntoView) {
            try { current.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
        }
        var secChip = el('tg-sec-chip');
        if (secChip) secChip.textContent = (currentActivityIdx + 1) + '/' + ((scenarioData.activities || []).length || 1);
    }

    function updateProgress() {
        var total = 0, position = 0;
        (scenarioData.activities || []).forEach(function (act, aIdx) {
            (act.steps || []).forEach(function (step, sIdx) {
                total += 1;
                if (aIdx < currentActivityIdx) position += 1;
                else if (aIdx === currentActivityIdx && sIdx <= activityStepIndex()) position += 1;
            });
        });
        var fill = el('tg-progress-fill');
        if (fill) fill.style.width = (total ? Math.round((position / total) * 100) : 0) + '%';
        renderMeter(0);
    }

    // ── Recap ───────────────────────────────────────────────────────────
    function openRecap() {
        renderMeterSheet();
        var card = el('tg-recap-card');
        if (!card) return;
        var percent = stats.asked ? Math.round((stats.correct / stats.asked) * 100) : 0;
        var gained = Math.round(friendship - friendshipStart);
        var level = levelFor(friendship);
        var badge = percent >= 90 ? '🏆 Flawless recall' : percent >= 70 ? '🎯 Solid session' : percent >= 50 ? '📈 Getting there' : '🌱 Keep digging';
        var items = answerReview.length ? answerReview.map(function (item) {
            return '<div class="tg-recap-item"><i class="fas ' + (item.good ? 'fa-check' : 'fa-xmark') + '"></i><span>' +
                (item.q ? '<b>' + esc(item.q) + '</b><br/>' : '') + esc(item.a) + '</span></div>';
        }).join('') : '<div class="tg-recap-item"><span>Nothing answered yet — pick a segment above.</span></div>';
        card.innerHTML =
            '<h3>Session recap</h3>' +
            '<p class="tg-recap-sub">' + esc(plain(scenarioData.title || 'Interactive Session')) + ' · ' + esc(CHARACTER.name) + '</p>' +
            '<div class="tg-recap-grid">' +
                '<div class="tg-recap-cell"><span>Score</span><b>' + stats.correct + '/' + stats.asked + ' · ' + percent + '%</b></div>' +
                '<div class="tg-recap-cell"><span>XP earned</span><b>' + stats.xp + '</b></div>' +
                '<div class="tg-recap-cell"><span>Best streak</span><b>' + stats.best + '</b></div>' +
                '<div class="tg-recap-cell"><span>Games won</span><b>' + stats.gamesWon + '/' + stats.games + '</b></div>' +
            '</div>' +
            '<div style="font-size:13.5px;font-weight:800;color:#1e293b;margin-bottom:8px;">' + badge + ' · ' + level.icon + ' ' + level.label + ' (' + (gained > 0 ? '+' : '') + gained + ' friendship)</div>' +
            '<div class="tg-recap-list">' + items + '</div>' +
            '<div style="display:flex;gap:8px;">' +
                '<button class="tg-submit" style="flex:1;" id="tg-recap-close"><i class="fas fa-check"></i> Keep going</button>' +
                '<button class="tg-round-btn tg-mic" style="width:46px;height:46px;" id="tg-recap-transcript" title="Copy transcript"><i class="fas fa-copy"></i></button>' +
            '</div>';
        openOverlay('tg-recap-overlay');
        var close = el('tg-recap-close');
        if (close) close.onclick = function () { closeOverlay('tg-recap-overlay'); };
        var transcript = el('tg-recap-transcript');
        if (transcript) transcript.onclick = function () {
            var lines = [];
            var rows = chatContainer() ? chatContainer().querySelectorAll('.tg-bubble') : [];
            for (var i = 0; i < rows.length; i++) { lines.push(plain(rows[i].textContent)); }
            copyText(lines.join('\\n'), 'Transcript copied');
        };
    }

    // ── Composer (free replies + dictation) ─────────────────────────────
    function typeToggle(on) {
        var btn = el('tg-voice-btn');
        if (btn) btn.classList.toggle('tg-on', !!on);
    }
    function toggleAutoVoice() {
        autoVoice = !autoVoice;
        writePref('autoVoice', autoVoice);
        typeToggle(autoVoice);
        toast(autoVoice ? 'Auto voice on' : 'Auto voice off');
        if (!autoVoice && 'speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    }
    function toast(message) {
        var t = el('tg-toast');
        if (!t) return;
        t.textContent = message;
        t.classList.add('tg-show');
        setTimeout(function () { t.classList.remove('tg-show'); }, 1800);
    }
    function copyText(text, message) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () { toast(message || 'Copied'); }).catch(function () { fallbackCopy(text, message); });
            } else { fallbackCopy(text, message); }
        } catch (e) { fallbackCopy(text, message); }
    }
    function fallbackCopy(text, message) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            toast(message || 'Copied');
        } catch (e) { toast('Copy failed'); }
    }

    function sendFreeReply() {
        var input = el('tg-input');
        if (!input) return;
        var value = (input.value || '').trim();
        if (!value) { toast('Type something first'); return; }
        input.value = '';
        appendOutgoingMessage(esc(value), '');
        adjustFriendship(1, 'Your own words');
        stats.xp += 2;
        var step = getCurrentStep();
        var candidate = step && step.freeReply ? step.freeReply : null;
        var reply = 'Great effort using your own words — that is exactly how the new vocabulary becomes active. Now choose one of the options below so I can check your understanding.';
        showTyping();
        later(function () {
            hideTyping();
            var c = chatContainer();
            var row = document.createElement('div');
            row.className = 'tg-row tg-in';
            row.innerHTML = '<img class="tg-msg-avatar" src="' + esc(CHARACTER.avatar) + '" alt="" data-fallback="' + escapeAttr(CHARACTER.avatarFallback) + '" /><div class="tg-bubble"><div class="tg-text">' +
                (candidate ? richText(candidate) : reply) + '</div><div class="tg-meta"><span>' + fmtTime(new Date()) + '</span></div></div>';
            if (c) c.appendChild(row);
            scrollChat();
            if (autoVoice) speak(candidate ? plain(candidate) : reply, CHARACTER.name);
        }, 620);
    }

    function setupDictation() {
        var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        var mic = el('tg-mic');
        if (!Rec) { if (mic) mic.style.display = 'none'; return; }
        recognition = new Rec();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        var listening = false;
        recognition.onstart = function () { listening = true; if (mic) mic.classList.add('tg-recording'); };
        recognition.onend = function () { listening = false; if (mic) mic.classList.remove('tg-recording'); };
        recognition.onerror = function () { listening = false; if (mic) mic.classList.remove('tg-recording'); toast('Dictation stopped'); };
        recognition.onresult = function (event) {
            try {
                var text = event.results[0][0].transcript;
                var input = el('tg-input');
                if (input) { input.value = (input.value ? input.value + ' ' : '') + text; input.focus(); }
            } catch (e) {}
        };
        if (mic) {
            mic.onclick = function () {
                if (listening) { try { recognition.stop(); } catch (e) {} return; }
                try { recognition.start(); toast('Listening… speak now'); } catch (e) { toast('Dictation unavailable'); }
            };
        }
    }

    // ── Wiring ──────────────────────────────────────────────────────────
    function wireDelegatedEvents() {
        // Avatar / media images that fail to load fall back to the SVG monogram.
        document.addEventListener('error', function (event) {
            var img = event.target;
            if (!img || !img.tagName || img.tagName !== 'IMG') return;
            if (img.dataset.fallbackApplied === '1') return;
            img.dataset.fallbackApplied = '1';
            img.src = fallbackFor(img);
        }, true);

        var chat = chatContainer();
        if (chat && chat.dataset.wired !== '1') {
            chat.dataset.wired = '1';
            chat.addEventListener('click', function (event) {
                var target = event.target;
                var zoom = target.closest ? target.closest('[data-zoom]') : null;
                if (zoom) {
                    var box = el('tg-lightbox');
                    var img = el('tg-lightbox-img');
                    if (img) img.src = zoom.getAttribute('data-zoom');
                    if (box) box.classList.add('tg-open');
                    return;
                }
                var replay = target.closest ? target.closest('[data-replay]') : null;
                if (replay) {
                    var found = getStepById(replay.getAttribute('data-replay'));
                    if (found) speak(found.step.readAloudText || found.step.text, found.step.sender);
                    return;
                }
                var copyBtn = target.closest ? target.closest('[data-copy]') : null;
                if (copyBtn) {
                    var f2 = getStepById(copyBtn.getAttribute('data-copy'));
                    if (f2) copyText(plain(f2.step.readAloudText || f2.step.text), 'Message copied');
                    return;
                }
                var audioOpen = target.closest ? target.closest('[data-audio-open]') : null;
                if (audioOpen) {
                    var url = audioOpen.getAttribute('data-audio-open');
                    if (url) window.open(url, '_blank');
                    return;
                }
                /* "Open in a new tab" on a YouTube / Vimeo embed: a saved lesson
                   has no network of its own, so the browser tab is where the video
                   actually plays. */
                var openUrl = target.closest ? target.closest('[data-open-url]') : null;
                if (openUrl) {
                    var openHref = openUrl.getAttribute('data-open-url');
                    if (openHref) window.open(openHref, '_blank', 'noopener');
                    return;
                }
                var voiceBtn = target.closest ? target.closest('[data-voice-play]') : null;
                if (voiceBtn) {
                    var note = voiceBtn.closest('.tg-voice');
                    if (note) {
                        var playing = note.classList.contains('tg-playing');
                        note.classList.toggle('tg-playing', !playing);
                        voiceBtn.innerHTML = playing ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
                        if (playing) { try { window.speechSynthesis.cancel(); } catch (e) {} }
                        else speak(note.getAttribute('data-voice-note'), CHARACTER.name, function () {
                            note.classList.remove('tg-playing');
                            voiceBtn.innerHTML = '<i class="fas fa-play"></i>';
                        });
                    }
                    return;
                }
                var audioBtn = target.closest ? target.closest('[data-audio-play]') : null;
                if (audioBtn) {
                    var card = audioBtn.closest('.tg-audio-card');
                    var audio = card ? card.querySelector('audio') : null;
                    if (!audio) return;
                    var bar = card.querySelector('.tg-audio-bar span');
                    var time = card.querySelector('[data-audio-time]');
                    if (audio.paused) {
                        audio.play().then(function () { audioBtn.innerHTML = '<i class="fas fa-pause"></i>'; }).catch(function () { toast('Audio could not play'); });
                    } else {
                        audio.pause();
                        audioBtn.innerHTML = '<i class="fas fa-play"></i>';
                    }
                    audio.ontimeupdate = function () {
                        var d = audio.duration || 0;
                        if (bar && d) bar.style.width = ((audio.currentTime / d) * 100) + '%';
                        if (time) time.textContent = fmtDur(audio.currentTime) + ' / ' + fmtDur(d);
                    };
                    audio.onended = function () { audioBtn.innerHTML = '<i class="fas fa-play"></i>'; };
                    return;
                }
                var scrim = target.closest ? target.closest('[data-close]') : null;
                if (scrim) { closeOverlay('tg-meter-overlay'); closeOverlay('tg-recap-overlay'); return; }
            });
        }

        var lightbox = el('tg-lightbox');
        if (lightbox && lightbox.dataset.wired !== '1') {
            lightbox.dataset.wired = '1';
            lightbox.onclick = function () { lightbox.classList.remove('tg-open'); };
        }

        var chip = el('tg-meter-chip');
        if (chip) {
            chip.onclick = function () { renderMeterSheet(); openOverlay('tg-meter-overlay'); };
            chip.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { renderMeterSheet(); openOverlay('tg-meter-overlay'); } };
        }
        var voiceBtnEl = el('tg-voice-btn');
        if (voiceBtnEl) voiceBtnEl.onclick = toggleAutoVoice;
        var recapBtn = el('tg-recap-btn');
        if (recapBtn) recapBtn.onclick = openRecap;
        var restartBtn = el('tg-restart-btn');
        if (restartBtn) restartBtn.onclick = restart;
        var sendBtn = el('tg-send');
        if (sendBtn) sendBtn.onclick = sendFreeReply;
        var input = el('tg-input');
        if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendFreeReply(); });

        document.addEventListener('keydown', function (e) {
            if (e.target && /input|textarea/i.test(e.target.tagName || '')) return;
            var overlayOpen = (el('tg-meter-overlay') && el('tg-meter-overlay').classList.contains('tg-open')) ||
                (el('tg-recap-overlay') && el('tg-recap-overlay').classList.contains('tg-open'));
            if (e.key === 'Escape') { closeOverlay('tg-meter-overlay'); closeOverlay('tg-recap-overlay'); return; }
            if (overlayOpen) return;
            if (e.key === 'r' || e.key === 'R') {
                var step = getCurrentStep();
                if (step) speak(step.readAloudText || step.text, step.sender);
                return;
            }
            var n = parseInt(e.key, 10);
            if (n >= 1 && n <= 9) {
                var options = el('tg-choices') ? el('tg-choices').querySelectorAll('.tg-opt') : [];
                var btn = options[n - 1];
                if (btn && !btn.disabled) btn.click();
            }
        });
    }

    function restart() {
        try { window.speechSynthesis.cancel(); } catch (e) {}
        clearTimers();
        currentActivityIdx = 0;
        currentStepId = null;
        friendship = friendshipStart;
        meterLog = [];
        stats = { correct: 0, asked: 0, answered: 0, streak: 0, best: 0, xp: 0, games: 0, gamesWon: 0 };
        answeredSteps = {};
        answerReview = [];
        visitedActivities = {};
        (scenarioData.activities || []).forEach(function (act) {
            (act.steps || []).forEach(function (s) { if (s.__polled !== undefined) s.__polled = false; });
        });
        var c = chatContainer();
        if (c) c.innerHTML = '';
        dayDivider();
        systemChip('Session restarted · ' + plain(scenarioData.title || 'Interactive Session'));
        renderPills();
        var first = (scenarioData.activities[0] && scenarioData.activities[0].steps[0]) ? scenarioData.activities[0].steps[0].id : null;
        if (first) { currentStepId = first; renderStep(getCurrentStep()); }
        updateProgress();
        toast('Restarted');
    }

    // ── Boot ────────────────────────────────────────────────────────────
    loadStandaloneFriendship();
    typeToggle(autoVoice);
    dayDivider();
    systemChip('Scenario · ' + plain(scenarioData.title || 'Interactive Session'));
    if (INJECT_FAILED) systemChip('⚠️ The pasted content could not be read as a scenario — the built-in demo is showing instead. Copy the JSON from Lesson Creator again and press Load Content.');
    renderPills();
    var firstStep = (scenarioData.activities[0] && scenarioData.activities[0].steps[0]) ? scenarioData.activities[0].steps[0].id : null;
    if (firstStep) { currentStepId = firstStep; visitedActivities[0] = true; renderStep(getCurrentStep()); }
    updateProgress();
    wireDelegatedEvents();
    setupDictation();

    // Tutor reactions now live in the composer bar (the separate Reaction footer was
    // removed from the panel so the chat keeps its vertical space).
    var reactButtons = document.querySelectorAll('.tg-react');
    for (var rb = 0; rb < reactButtons.length; rb++) {
        (function (btn) {
            btn.addEventListener('click', function () {
                var delta = parseInt(btn.getAttribute('data-react'), 10) || 0;
                if (!delta) return;
                adjustFriendship(delta, 'Tutor reaction');
                toast((delta > 0 ? '+' : '') + delta + ' friendship');
            });
        })(reactButtons[rb]);
    }

    // Expose a small API so lessons, tests and the Media Manager can drive it.
    // Hover-scrolling the activity strip moves it sideways, so every segment is
    // reachable without a horizontal trackpad gesture.
    var pillsScroller = el('tg-pills');
    if (pillsScroller) {
        pillsScroller.addEventListener('wheel', function (e) {
            var dy = e.deltaY || 0;
            var dx = e.deltaX || 0;
            if (!dy || Math.abs(dy) <= Math.abs(dx)) return;
            pillsScroller.scrollLeft += dy;
            e.preventDefault();
        }, { passive: false });
    }

    window.ClassmateChat = {
        version: '2026.2',
        scenario: scenarioData,
        masterPrompt: MASTER_PROMPT,
        getFriendship: function () { return friendship; },
        setFriendship: function (value) { friendship = Math.max(-100, Math.min(100, value)); renderMeter(0); renderMeterSheet(); },
        adjustFriendship: adjustFriendship,
        replay: function () { var step = getCurrentStep(); if (step) speak(step.readAloudText || step.text, step.sender); },
        recap: openRecap,
        restart: restart,
        stats: function () { return stats; },
        goToStep: goToStep,
        games: function () { return { played: stats.games, won: stats.gamesWon }; },
        mediaTypes: ['image', 'gif', 'video', 'youtube', 'vimeo', 'audio', 'voice', 'table', 'sticker', 'soundcloud', 'spotify', 'embed', 'game', 'code', 'link']
    };
})();
${scriptClose}
</body>
</html>`;
}
