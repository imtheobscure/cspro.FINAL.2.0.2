export const getPedagogicalHistoryPromptBlock = (learner: any): string => {
    if (!learner) return '';
    
    const topics: string[] = [];
    const grammar: string[] = [];
    const vocabulary: string[] = [];
    const pronunciation: string[] = [];

    // Extract from sessions
    if (learner.sessions && Array.isArray(learner.sessions)) {
        learner.sessions.forEach((s: any) => {
            if (s.topics && Array.isArray(s.topics)) {
                s.topics.forEach((t: string) => t && topics.push(t));
            }
            if (s.skillsLearned && Array.isArray(s.skillsLearned)) {
                s.skillsLearned.forEach((sk: string) => sk && topics.push(sk));
            }
            if (s.grammarPoints && Array.isArray(s.grammarPoints)) {
                s.grammarPoints.forEach((g: string) => g && grammar.push(g));
            }
            if (s.vocabularyPoints && Array.isArray(s.vocabularyPoints)) {
                s.vocabularyPoints.forEach((v: string) => v && vocabulary.push(v));
            }
            if (s.pronunciationPoints && Array.isArray(s.pronunciationPoints)) {
                s.pronunciationPoints.forEach((p: string) => p && pronunciation.push(p));
            }
            if (s.sectionFocus && Array.isArray(s.sectionFocus)) {
                s.sectionFocus.forEach((sec: any) => {
                    if (sec.grammar) grammar.push(sec.grammar);
                    if (sec.vocabulary) vocabulary.push(sec.vocabulary);
                    if (sec.pronunciation) pronunciation.push(sec.pronunciation);
                });
            }
        });
    }

    // Extract from lessonHistory
    if (learner.lessonHistory && Array.isArray(learner.lessonHistory)) {
        learner.lessonHistory.forEach((lh: any) => {
            if (lh.title) topics.push(lh.title);
            if (lh.headings && Array.isArray(lh.headings)) {
                lh.headings.forEach((h: string) => h && topics.push(h));
            }
            if (lh.sectionFocus && Array.isArray(lh.sectionFocus)) {
                lh.sectionFocus.forEach((sec: any) => {
                    if (sec.grammar) grammar.push(sec.grammar);
                    if (sec.vocabulary) vocabulary.push(sec.vocabulary);
                    if (sec.pronunciation) pronunciation.push(sec.pronunciation);
                });
            }
        });
    }

    const uniqueTopics = Array.from(new Set(topics.map(t => t.trim()))).filter(Boolean);
    const uniqueGrammar = Array.from(new Set(grammar.map(g => g.trim()))).filter(Boolean);
    const uniqueVocab = Array.from(new Set(vocabulary.map(v => v.trim()))).filter(Boolean);
    const uniquePronunciation = Array.from(new Set(pronunciation.map(p => p.trim()))).filter(Boolean);

    let historyText = `\n\n=================================================================\n`;
    historyText += `🚨 PEDAGOGICAL HISTORY & CONTENT DIVERSITY INSTRUCTIONS (CRITICAL & NON-NEGOTIABLE):\n`;
    historyText += `=================================================================\n`;
    
    if (uniqueTopics.length > 0 || uniqueGrammar.length > 0 || uniqueVocab.length > 0 || uniquePronunciation.length > 0) {
        historyText += `STUDENT'S PREVIOUSLY COMPLETED LESSON HISTORY:\n`;
        if (uniqueTopics.length > 0) historyText += `- Previous Lesson Topics/Units: ${uniqueTopics.join(' | ')}\n`;
        if (uniqueGrammar.length > 0) historyText += `- Previous Grammar Targets: ${uniqueGrammar.join(' | ')}\n`;
        if (uniqueVocab.length > 0) historyText += `- Previous Vocabulary Learned: ${uniqueVocab.join(' | ')}\n`;
        if (uniquePronunciation.length > 0) historyText += `- Previous Pronunciation Points: ${uniquePronunciation.join(' | ')}\n`;
    } else {
        historyText += `- PREVIOUS LESSON HISTORY: Initial lesson generation.\n`;
    }

    historyText += `\nSTRICT CONTENT GENERATION MANDATES:\n`;
    historyText += `1. **DO NOT REPEAT PRESENT SIMPLE OR OLD TOPICS AS MAIN TARGET**: Unless explicitly requested by the user, DO NOT generate another lesson focusing on "Present Simple" or any of the exact main topics previously covered (${uniqueTopics.slice(-10).join(', ') || 'none'}). Always create FRESH, NEW, UNIQUE topics, grammar points, vocabulary items, and pronunciation points appropriate for the student's CEFR level!\n`;
    historyText += `2. **RECYCLE & REINFORCE PREVIOUS CONCEPTS ("As you learned in unit...")**: Actively reference, recycle, and re-test previously learned vocabulary and grammar in warmups, roleplay dialogues, or review activities. Explicitly use phrasing such as "As you learned in Unit X: [previous item], let's now build upon it..." to encourage spaced repetition and active recall.\n`;
    historyText += `3. **SECTION FOCUS ATTRIBUTES**: In the generated JSON, for every section include explicit concise section-level focus metadata ("grammar", "vocabulary", "pronunciation") so the system logs and visualizes them on the student's Learning path timeline.\n`;
    historyText += `=================================================================\n\n`;

    return historyText;
};
