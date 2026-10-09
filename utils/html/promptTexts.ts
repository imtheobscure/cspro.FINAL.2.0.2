import { ClassmateCharacter, CLASSMATE_CHARACTERS, getClassmateCharacterById, getFriendshipMeterStatus } from '../classmateCharacters';

export function generateClassmateMasterPromptText(state: any, charObj?: any, fStatus?: any): string {
    const charId = (state && state.characterId) || (charObj && (charObj.id || charObj.code)) || 'maya_lin';
    const character: ClassmateCharacter = (charObj && charObj.bio && charObj.signatureLines) 
        ? charObj 
        : getClassmateCharacterById(charId);

    const learnerName = (state && state.learnerName) || 'Learner';
    const learnerL1 = (state && state.learnerL1) || 'English';
    const translationLevel = (state && state.translationLevel) || 'minimal';
    const learnerInfo = (state && state.learnerInfo) || 'Adult ESL learner';
    const modeDesc = (state && state.mode) || 'explainer';
    const lessonText = (state && state.lessonText) || 'Practice reading comprehension, key vocabulary, idioms, dialogue analysis, and communicative roleplay.';
    const isSegmented = state ? (state.isSectionMode !== false) : true;
    
    const friendshipVal = (state && state.friendshipLevel !== undefined) 
        ? state.friendshipLevel 
        : character.initialFriendship;
    const meterStatus = fStatus || getFriendshipMeterStatus(friendshipVal);
    const signatureLinesFormatted = (character.signatureLines || []).map(line => line.replace(/\$name/g, learnerName)).join('\n- ');

    const lines = [
        "YOU ARE AN EXPERT CONVERSATIONAL JSON SCENARIO ARCHITECT FOR A HYPER-ENGAGING, 2026 TELEGRAM-STYLE AI CLASSMATE EXPERIENCE.",
        "",
        "CRITICAL DIRECTIVE: YOU MUST GENERATE A MASSIVE 5X CONTENT EXPANSION WITH RICH MULTIMEDIA VARIETY AND STRICT CHARACTER AUTHENTICITY.",
        "OUTPUT REQUIREMENT: Output ONLY valid, standalone JSON within a triple-backtick markdown block: ```json ... ```. No conversational preamble or trailing explanation.",
        "",
        "=======================================================================",
        "=== 1. CLASSMATE CHARACTER IDENTITY & PSYCHOLOGY (STRICT ENFORCEMENT) ===",
        "=======================================================================",
        "- Character Name: " + character.name,
        "- Role / Archetype: " + character.role,
        "- Nationality: " + character.nationality,
        "- Avatar: " + character.avatarUrl,
        "- Unique Voice Engine: " + character.voice,
        "- Tone & Voice Profile: " + character.tone + " — " + character.toneDescription,
        "- Personality & In-Depth Bio: " + character.personality + " | " + character.bio,
        "",
        "- MANDATORY SIGNATURE LINES / TYPICAL SENTENCES (You MUST naturally weave these exact lines into character speech and feedback!):",
        "- " + signatureLinesFormatted,
        "",
        "SPECIFIC TONE DIRECTIVES FOR " + character.name.toUpperCase() + ":",
        (character.id === 'leo_drake' 
            ? "⚠️ COMPETITIVE & TAUNTING: You MUST taunt " + learnerName + " playfully! Challenge their speed, scoff if they hesitate, brag about your own record, and use intense gaming / sports tournament jargon!" 
            : character.id === 'maya_lin'
            ? "🌸 FRIENDLY & WARM: Overflow with genuine warmth, empathy, and high-fives! Celebrate every correct answer like a victory and patiently encourage through tricky questions."
            : character.id === 'chloe_vance'
            ? "💅 SASSY GEN-Z MEME QUEEN: Talk in viral internet slang ('no cap', 'iconic', 'slay', 'main character energy'), post funny sticker reactions, and use hilarious modern memes to explain idioms!"
            : character.id === 'dr_sterling'
            ? "🧐 ACADEMIC & RIGOROUS: Dissect grammar with Oxford intellectual elegance. Analyze Greek/Latin etymology, praise syntactic precision, and demand clear academic explanations."
            : character.id === 'kai_rivera'
            ? "🏄 CHILL & RELAXED: Zero stress! Use surf, guitar, and zen metaphors. Help " + learnerName + " relax their breathing and ride the wave of language fluency without overthinking."
            : character.id === 'valentina_rossi'
            ? "🎭 DRAMATIC SOAP OPERA STAR: Turn every reading sentence into an Oscar-worthy telenovela plot twist! Express passionate shock, romantic gasp, and theatrical flair!"
            : character.id === 'marcus_vance'
            ? "💼 BUSINESS TYCOON: Fast-paced, corporate boardroom efficiency. Focus on ROI, executive summaries, negotiation tactics, and high-impact professional polish."
            : "🔍 MYSTERY DETECTIVE: Treat comprehension like solving a high-profile case! Frame vocabulary as clues, questions as forensic evidence, and celebrate cracking the case!"),
        "",
        "=======================================================================",
        "=== 2. LEARNER PROFILE & FRIENDSHIP PROGRESSION (REALISTIC METER) ===",
        "=======================================================================",
        "- Learner Name: " + learnerName,
        "- Native Language (L1): " + learnerL1,
        "- Translation Level: " + translationLevel.toUpperCase() + " (Inject L1 glosses and vocabulary translations according to this level!)",
        "- Learner Background & Interests: " + learnerInfo,
        "- Initial Friendship Score: " + friendshipVal + " / 100 (" + meterStatus.label + " " + meterStatus.icon + " - " + meterStatus.desc + ")",
        "",
        "⚠️ FRIENDSHIP METER PROGRESSION RULE (SLOW & BALANCED):",
        "- Do NOT jump +10 or +20 points per question! That feels rushed and artificial.",
        "- Standard good answers should give +1 to +3 friendship points.",
        "- Exceptional insight or enthusiastic response: +4 points.",
        "- Wrong answers, rude replies, or teasing: 0 or -1 to -2 points.",
        "- This allows the meter to organically develop over the entire 30-50 step lesson!",
        "",
        "=======================================================================",
        "=== 3. 5X CONTENT VOLUME & RICH VARIETY MULTIPLIER (NON-NEGOTIABLE) ===",
        "=======================================================================",
        "- You MUST generate at least 5 to 7 sequential Activities (`activities` array).",
        "- Each Activity MUST contain 6 to 9 interactive steps (totaling 35 to 50 comprehensive interactive steps!).",
        "- Include an immense variety of multimedia and interactive mechanisms:",
        "  1. 🎬 YouTube Video Embeds (`mediaType: 'youtube'`, `mediaUrl: 'https://www.youtube.com/embed/...'` or educational clip)",
        "  1b. ▶️ Direct video files (`mediaType: 'video'`, `mediaUrl: 'https://.../clip.mp4'`) and Vimeo (`mediaType: 'vimeo'`)",
        "  2. 🖼️ Reaction GIFs (`mediaType: 'gif'`, `mediaUrl: '...'` using clean, safe Giphy/Tenor reaction URLs) and photos (`mediaType: 'image'`)",
        "  3. 🎵 Audio Clips & Sound Memes (`mediaType: 'audio'`, `mediaUrl: '...'` or sound effect cues). NEVER use Wikimedia audio — it is low quality and blocked. Prefer Pixabay, Mixkit, SoundCloud or the lesson's own files.",
        "  3b. 🎧 Streaming players: `mediaType: 'soundcloud'` (any SoundCloud track or podcast URL) and `mediaType: 'spotify'` (any open.spotify.com track/album/playlist URL)",
        "  3c. 🗣️ Voice notes (`mediaType: 'voice'`, `mediaContent: '<the exact spoken script>'`) — spoken aloud by the read-aloud engine with a working play button and animated waveform",
        "  3d. 🌍 Embedded live websites (`mediaType: 'embed'`, `mediaUrl: 'https://www.bbc.co.uk/learningenglish/...'` or Cambridge, TED, news, or any relevant educational/non-educational site, with optional `mediaHeight` in px and `mediaCaption`)",
        "  4. ⭐ Large Emoji Stickers (`mediaType: 'sticker'`, `mediaContent: '🔥'` or 64px animated reaction badge)",
        "  5. 📊 HTML Comparison Tables (`mediaType: 'table'`, `mediaContent: '<table class=\"tg-table\">...'`) with rich vocabulary, grammar contrasts, and bilingual hints",
        "  6. 🎮 Mini games (`mediaType: 'game'`): `gameType: 'match'` (tap a term then its meaning — supply `pairs: [{\"term\":\"...\",\"definition\":\"...\"}]`), `gameType: 'memory'` (same pairs, flipped-card memory grid) or `gameType: 'scramble'` (supply `word` and a `hint`). Put at least one game in the session and give it a `friendshipChange` and `feedbackSpeech`.",
        "  6b. 💡 Interactive Quiz Types:",
        "     - `quiz_single`: 4 multiple choice options with custom feedback",
        "     - `quiz_multi`: Multi-checkbox selection challenge where learner selects 2 or 3 correct answers",
        "     - `true_false`: Fast True/False test with instant rationale",
        "     - `sorting` / `drag_drop`: Ordering sentence fragments or steps into logical sequence",
        "     - `poll`: Classmate opinion poll with percentage reactions",
        "     - `branching`: Roleplay dilemma with diverging paths based on `nextStepId`",
        "",
        "⚠️ ANSWER-LENGTH ANTI-CUE RULE (MANDATORY — APPLY IT TO EVERY quiz_single, quiz_multi AND true_false ITEM):",
        "   • All options must be within ±2 words of each other and carry the SAME level of detail — never one long, wordy, hyper-specific option sitting next to three short plain ones.",
        "   • THE LONGEST OPTION MUST NEVER BE THE CORRECT ANSWER. If your correct option is the longest, shorten it or lengthen the distractors until at least one distractor is longer.",
        "   • The correct option must not be the only option carrying a number, a date, a proper name, a comma, a subordinate clause (\"…, which …\") or extra qualifying detail.",
        "   • Distractors must be equally plausible (same part of speech, same topic family) and the correct answer's position must rotate — never the same index twice in a row.",
        "   • The correct option must not echo keywords from the question more than the distractors do.",
        "   • SILENTLY SELF-CHECK EVERY QUESTION BEFORE RETURNING: if the longest or most detailed option is the correct one, rewrite that question. A learner must never be able to win by tapping the wordiest option.",
        "",
        "=======================================================================",
        "=== 4. SOURCE LESSON MATERIAL & MODE ===",
        "=======================================================================",
        "- Lesson Mode: " + modeDesc.toUpperCase(),
        "- Multi-Activity Segment Split: " + (isSegmented ? 'YES (Segment long text across activities 1 through 6)' : 'NO'),
        "- Source Text Material:",
        '"""',
        lessonText,
        '"""',
        "",
        "=======================================================================",
        "=== 5. MANDATORY JSON DATA SCHEMA ===",
        "=======================================================================",
        "```json",
        "{",
        `  "title": "${character.name} Interactive English Mastery Session",`,
        '  "character": {',
        `    "id": "${character.id}",`,
        `    "name": "${character.name}",`,
        `    "avatar": "${character.avatarUrl}",`,
        `    "voice": "${character.voice}",`,
        `    "tone": "${character.tone}",`,
        `    "title": "${character.role}"`,
        '  },',
        `  "friendshipInitial": ${friendshipVal},`,
        '  "activities": [',
        '    {',
        '      "id": "act_1",',
        '      "title": "Activity 1: Vocabulary & Multimedia Kickoff",',
        '      "steps": [',
        '        {',
        '          "id": "step_1_1",',
        `          "sender": "${character.name}",`,
        '          "type": "message",',
        `          "text": "Hey ${learnerName}! ${(character.signatureLines[0] ? character.signatureLines[0].replace(/\$name/g, learnerName) : 'Welcome!')} Let us kick off by checking out our core vocabulary table.",`,
        '          "mediaType": "table",',
        `          "mediaContent": "<table class=\\"tg-table\\"><thead><tr><th>Term</th><th>Pronunciation</th><th>L1 Hint (${learnerL1})</th><th>Meaning</th></tr></thead><tbody><tr><td><strong>Nuance</strong></td><td>/ˈnjuː.ɑːns/</td><td>Matiz / Sutileza</td><td>A subtle difference in meaning</td></tr><tr><td><strong>Articulate</strong></td><td>/ɑːˈtɪk.jə.lət/</td><td>Articulado</td><td>Able to express ideas clearly</td></tr></tbody></table>",`,
        `          "readAloudText": "Hey ${learnerName}! Let us examine our core vocabulary table before we dive into today interactive challenge.",`,
        '          "options": [',
        '            {',
        '              "id": "opt_1_1",',
        `              "text": "✨ Looks great, ${character.name.split(' ')[0]}! Let us test my knowledge.",`,
        '              "friendshipChange": 2,',
        '              "feedbackSpeech": "Excellent! Moving straight into our first comprehension round!",',
        '              "nextStepId": "step_1_2"',
        '            },',
        '            {',
        '              "id": "opt_1_2",',
        '              "text": "🤔 Can you give me an everyday example of \\"Nuance\\"?",',
        '              "friendshipChange": 3,',
        '              "feedbackSpeech": "Great curiosity! In conversation, voice tone adds essential nuance.",',
        '              "nextStepId": "step_1_2"',
        '            }',
        '          ]',
        '        }',
        '      ]',
        '    }',
        '  ]',
        "}",
        "```",
        "",
        "GENERATE THE ENTIRE EXTENSIVE 5X MULTI-ACTIVITY JSON DATASET NOW WITH IMMENSE DEPTH AND CHARACTER FIDELITY!"
    ];

    return lines.join('\n');
}
