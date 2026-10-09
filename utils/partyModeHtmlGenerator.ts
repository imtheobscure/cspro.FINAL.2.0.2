
import type { PartyModeOutput, LearnerProfile } from '../types';
import { escapeHtml } from './textFormatters';
import { matchCefrTopicInText, normalizeCefrLevel } from './cefrGrammarDictionary';
import { getCustomAvatar } from '../services/customAvatarStore';
import { getAvatarUrl } from '../services/avatarService';
import { BUILTIN_ALIBI, BUILTIN_SPYFALL } from './partyMode/builtinSpecials';
import { useAppStore } from '../store/useAppStore';
import { 
    getPartyModeStyle, 
    getPartyModeScript, 
    getSetupViewHtml, 
    getModeSelectViewHtml, 
    getGameLayoutHtml, 
    getQuestionModalHtml, 
    getPowerupOverlayHtml, 
    getLuckyOverlayHtml 
} from './partyMode/partyModeEngine';

const fallbackInitialAvatar = (name: string, color: string): string => {
    const initial = (name || 'P').charAt(0).toUpperCase();
    return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="${color}"/><text x="50" y="63" font-size="44" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">${initial}</text></svg>`)}`;
};


export const generatePartyModeHtml = (
    partyData: PartyModeOutput,
    learner: LearnerProfile,
    tutor?: { name?: string; avatar?: string } | any
) => {
    // Learner photo (saved on disk / custom avatar store) — real photo, never a cartoon.
    let learnerAvatar = '';
    const learnerAvatarId = (learner as any)?.avatar || (learner as any)?.avatarId || (learner as any)?.avatarBase64 || '';
    if (learnerAvatarId && learnerAvatarId.startsWith('data:image')) {
        learnerAvatar = learnerAvatarId;
    } else if (learnerAvatarId) {
        learnerAvatar = getCustomAvatar(learnerAvatarId) || (learner as any)?.avatarBase64 || '';
    }
    if (!learnerAvatar) learnerAvatar = getAvatarUrl((learner as any)?.gender || 'Male', learnerAvatarId, learner.name);
    if (!learnerAvatar) learnerAvatar = fallbackInitialAvatar(learner.name, '#059669');

    /*
     * The tutor. Party Mode has an «Add Tutor» button in the setup screen, and that
     * button needs a name and a photo. Both are read from the Adult Dashboard
     * (App Store → tutorInfo) whenever the caller did not hand one over, so the
     * button works on every lesson, not only the ones that remembered to pass a
     * tutor in. The same profile supplies the narrator's voice: the read-aloud
     * voice chosen in Lessons → Step 2 · Customization & Lesson Structure is what
     * the learner hears throughout the party game, so the narrator matches the
     * rest of that tutor's lessons instead of the browser's default robot.
     */
    let tutorInfo: any = null;
    try { tutorInfo = useAppStore.getState().tutorInfo; } catch (e) { /* store unavailable */ }

    const tutorName = String((tutor && tutor.name) || tutorInfo?.name || '').trim();
    const tutorAvatarSource = String(
        (tutor && (tutor.avatar || tutor.avatarId || tutor.photoUrl)) || tutorInfo?.avatarId || tutorInfo?.avatar || ''
    );
    let tutorAvatar = '';
    if (tutorAvatarSource.startsWith('data:image')) tutorAvatar = tutorAvatarSource;
    else if (tutorAvatarSource) tutorAvatar = getCustomAvatar(tutorAvatarSource) || (tutor && tutor.avatarBase64) || '';
    if (!tutorAvatar && tutorInfo?.avatarId) tutorAvatar = getCustomAvatar(tutorInfo.avatarId) || '';
    if (tutorName && !tutorAvatar) tutorAvatar = fallbackInitialAvatar(tutorName, '#4f46e5');

    /** The voice chosen for read-aloud in Lesson Settings → Step 2 (learner's pick,
     *  else the tutor's own voice). Left empty when the tutor never chose one, in
     *  which case the game falls back to the first voice the browser offers. */
    const readAloudVoice = String(
        (learner as any)?.readAloudVoice || (tutor && tutor.voice) || tutorInfo?.voice || ''
    );

    (partyData as any).learnerAvatar = learnerAvatar;
    (partyData as any).learnerName = learner.name;
    (partyData as any).readAloudVoice = readAloudVoice;
    (partyData as any).tutor = tutorName ? { name: tutorName, avatar: tutorAvatar } : null;

    /*
     * The learner's CEFR ceiling, carried into the lesson so the end-of-game report
     * can say *this class is weak at past simple (A2)* rather than only *they lost
     * 300 points*. `cefrTier` is optional on the profile, so it is read defensively.
     */
    const learnerLevel = normalizeCefrLevel((learner as any)?.cefrLevel, 'B1');
    const learnerTier = Number((learner as any)?.cefrTier) || undefined;
    (partyData as any).cefrLevel = learnerLevel;
    (partyData as any).cefrTier = learnerTier;

    /*
     * Tag every card with the CEFR grammar point it actually tests.
     *
     * The AI is asked for a `skill` ("Grammar") and a `difficultyLevel`, neither of
     * which is a CEFR point — so the report could only ever say "Grammar". Running
     * the card through the same dictionary the level guard uses gives the grouping
     * something real to say: which grammar topic, at which level, and whether it is
     * inside the learner's current tier. Cards that match nothing keep both fields
     * empty and fall back to their `skill` in the report.
     */
    (partyData.questions || []).forEach((q) => {
        if (!q) return;
        // The feedback block is where the grammar rule actually lives — a card whose
        // stem is generic ("choose the correct option") is only identifiable by its
        // explanation, so tagging from the stem alone finds almost nothing.
        const fb: any = (q as any).feedback || {};
        const haystack = [
            q.question, q.answer, q.explanation, q.deepDive, (q.examples || []).join(' '), q.skill,
            fb.headline, fb.correct, fb.wrong, fb.rule, fb.vocab,
            (fb.steps || []).join(' '), (fb.examples || []).join(' '), fb.speak,
        ]
            .filter(Boolean)
            .join(' \n ');
        const guess = matchCefrTopicInText(haystack);
        if (guess.topic) {
            (q as any).cefrTopic = guess.topic;
            (q as any).cefrLevel = guess.level || learnerLevel;
        }
    });
    
    /*
     * Spyfall and Alibi are the two modes that need a whole cast before they can
     * be played at all: one needs a location with six people who each speak, the
     * other a situation with five suspects who each tell a long story. Everything
     * else in the arena runs off a question card, which the lesson always has.
     *
     * The Copy-AI prompt asks for that cast, but it is best-effort — a lesson that
     * came back without it left the Spyfall tile showing nothing and the Alibi tile
     * with an empty row, which reads as a broken game rather than a missing field.
     * So: fill in whatever is missing from the built-in library, and when a lesson
     * has none of these rounds at all, add three of each so both games are playable
     * out of the box. The added cards are deliberately NOT grid cards (the board
     * filters these types out), so the 8×8 board is untouched by this.
     */
    if (!partyData.questions) partyData.questions = [];
    {
        const hasAlibiCast = partyData.questions.some((q: any) => q && q.type === 'alibi_puzzle'
            && Array.isArray(q.suspects) && q.suspects.filter((s: any) => s && s.name && s.alibi).length >= 2);
        const hasSpyCast = partyData.questions.some((q: any) => q && q.type === 'spyfall'
            && q.spyfallData && Array.isArray(q.spyfallData.players) && q.spyfallData.players.length >= 3);
        let alibiRound = 0;
        let spyRound = 0;

        partyData.questions.forEach((q: any) => {
            if (!q) return;
            if (q.type === 'alibi_puzzle') {
                const cast = Array.isArray(q.suspects) ? q.suspects.filter((s: any) => s && s.name && s.alibi) : [];
                if (cast.length < 2) {
                    const round = BUILTIN_ALIBI[alibiRound++ % BUILTIN_ALIBI.length];
                    q.suspects = round.suspects;
                    if (!q.context || String(q.context).length < 60) q.context = round.context;
                    if (!q.question || String(q.question).length < 12) q.question = round.question;
                }
                // The guilty name is what the tutor is shown on a correct accusation.
                if (!q.answer) {
                    const guilty = (q.suspects || []).filter((s: any) => s && s.isGuilty)[0];
                    if (guilty) q.answer = guilty.name;
                }
            }
            if (q.type === 'spyfall') {
                const players = q.spyfallData && Array.isArray(q.spyfallData.players) ? q.spyfallData.players : [];
                if (players.length < 3) {
                    const round = BUILTIN_SPYFALL[spyRound++ % BUILTIN_SPYFALL.length];
                    q.spyfallData = { location: round.location, job: round.job, players: round.players };
                    if (!q.question || String(q.question).length < 8) q.question = 'Who is the spy?';
                }
            }
        });

        if (!hasAlibiCast) {
            BUILTIN_ALIBI.forEach((round) => {
                const guilty = round.suspects.filter((s) => s.isGuilty)[0];
                partyData.questions.push({
                    id: round.id,
                    type: 'alibi_puzzle',
                    question: round.question,
                    answer: guilty ? guilty.name : '',
                    context: round.context,
                    points: 10,
                    skill: 'Speaking · questions',
                    difficultyLevel: learnerLevel,
                    hint: 'Ask about times, places and people — a true story keeps the same details the second time.',
                    explanation: 'The liar is the suspect whose account cannot be true of the situation you just read. Ask one precise question to two suspects and compare the answers.',
                    /* The cast travels WITH the card: this loop runs after the one that
                       hydrates cards, so a round pushed without its suspects would open
                       onto an empty row. */
                    suspects: round.suspects,
                    builtIn: true,
                } as any);
            });
        }
        if (!hasSpyCast) {
            BUILTIN_SPYFALL.forEach((round) => {
                partyData.questions.push({
                    id: round.id,
                    type: 'spyfall',
                    question: 'Who is the spy?',
                    answer: (round.players.filter((p) => p.isSpy)[0] || { name: '' }).name,
                    skill: 'Speaking · questions',
                    points: 10,
                    difficultyLevel: learnerLevel,
                    hint: 'Ask a question that only somebody who really knows the place could answer safely.',
                    explanation: 'Everyone can hear the statements; the spy is the one who cannot give a specific detail without inventing it.',
                    spyfallData: { location: round.location, job: round.job, players: round.players },
                    builtIn: true,
                } as any);
            });
        }
    }
    
    if (partyData.questions.length === 0) {
        partyData.questions.push({
            id: 'fallback_q',
            type: 'multiple_choice',
            question: 'Are you ready?',
            options: ['Yes', 'No'],
            answer: 'Yes',
            points: 10,
            skill: 'General'
        });
    }

    // Fill to 64 if needed
    while (partyData.questions.length < 64) {
        const randomQ = partyData.questions[Math.floor(Math.random() * partyData.questions.length)];
        partyData.questions.push({ ...randomQ, id: randomQ.id + '_clone_' + partyData.questions.length });
    }
    
    const celebratoryPhrases = [
        "Outstanding move, {name}!",
        "{name} is on fire!",
        "Perfect answer!",
        "You nailed it, {name}!",
        "Impressive work!",
        "Grammar champion!",
        "That was brilliant, {name}!"
    ];

    const tauntPhrases = [
        "Not quite, {name}.",
        "Try harder next time!",
        "Ouch! That hurt.",
        "{name} needs to study more.",
        "Better luck next round!",
        "Is that your final answer?",
        "Don't give up, {name}!"
    ];
    
    const bodyHtml = `
        ${getSetupViewHtml(partyData)}
        ${getModeSelectViewHtml()}
        ${getGameLayoutHtml(partyData)}
        ${getQuestionModalHtml()}
        ${getPowerupOverlayHtml()}
        ${getLuckyOverlayHtml()}
    `;
    
    const css = getPartyModeStyle();
    const js = getPartyModeScript(partyData, celebratoryPhrases, tauntPhrases, learner);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>${escapeHtml(partyData.gameTitle)}</title>

    <!-- The interface typeface. Loaded with a system fallback in the stylesheet, so
         an offline classroom still renders cleanly instead of falling back to a
         bare sans-serif; display=swap keeps first paint instant either way. -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@600;700;800&family=JetBrains+Mono:wght@400;600&display=swap">
    <!-- The toolbar buttons, streak badges and transport controls are drawn with
         Font Awesome glyphs. The markup has always been there; the library was
         not, so 33 icons rendered as nothing at all. -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css">

    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" defer></script>
    <!-- Fabric.js is the Pictionary drawing board: a real object model with
         select / move / scale / rotate, so the tutor draws with pro tools rather
         than raw pixels. It only powers that one game. -->
    <script src="https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js" defer></script>
    <!-- PeerJS powers the phone room (?room=CODE). It is the only network dependency
         and it only loads a signalling library — answers travel phone-to-laptop over
         WebRTC. If it cannot load (offline classroom), the lesson still runs and the
         room panel says so instead of failing silently. -->
    <script src="https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js" defer></script>
    <style>
        ${css}
    </style>
</head>
<body>
    ${bodyHtml}
    <script>
        ${js}
    </script>
</body>
</html>`;
};

export const handleSavePartyModeAsHtml = (
    partyData: PartyModeOutput,
    learner: LearnerProfile,
    filename: string,
    tutor?: { name?: string; avatar?: string } | any
) => {
    const html = generatePartyModeHtml(partyData, learner, tutor);
    import('./htmlLessonSaver').then(({ saveAndExportHtmlLesson }) => {
        saveAndExportHtmlLesson({
            htmlContent: html,
            fileName: filename,
            learnerName: learner.name,
            type: 'Party Mode Game',
            title: filename,
            triggerDownload: true,
            alsoZip: true
        });
    }).catch(() => {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            try { document.body.removeChild(link); } catch(e) {}
            URL.revokeObjectURL(url);
        }, 1000);
    });
};
