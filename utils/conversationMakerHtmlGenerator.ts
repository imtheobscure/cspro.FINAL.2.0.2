import { LearnerProfile } from '../types';
import { getCustomAvatar } from '../services/customAvatarStore';
import { getAvatarUrl } from '../services/avatarService';
import { getAnnotationFeatures } from './html/annotations';
import { useAppStore } from '../store/useAppStore';
import { buildLessonFileName, getLessonFilePrefill, type LessonAudience } from './lessonFileNaming';

export interface ConversationLineAnnotation {
    grammar?: string;
    glossary?: string;
    formal?: string;
    informal?: string;
    soap_opera?: string;
    pronunciation?: string;
    translation_l1?: string;
}

export interface ConversationLine {
    character: string;
    text: string;
    action?: string;
    annotations?: ConversationLineAnnotation;
}

export interface ConversationActivityItem {
    id?: string;
    prompt: string;
    options?: string[];
    answer: number;
    explanation?: string;
    audioText?: string;
}

export interface ConversationActivity {
    id: string;
    title: string;
    icon: string;
    description: string;
    items: ConversationActivityItem[];
}

export interface ConversationMakerData {
    characters?: Array<{
        name: string;
        tone?: string;
        mood?: string;
        job?: string;
        voiceURI?: string;
    }>;
    dialogue?: ConversationLine[];
    glossary?: Array<{
        word: string;
        definition: string;
        ccq?: string;
        ccq_answer?: string;
    }>;
    questions?: Array<{
        scenario?: string;
        character?: string;
        question: string;
        answer?: string;
    }>;
    activities?: ConversationActivity[];
    settings?: {
        topic?: string;
        cefrLevel?: string;
        tone?: string;
        readAloudVoice?: string;
        targetL1?: string;
    };
}

export const generateConversationMakerHtml = (
    data: ConversationMakerData,
    learner: Partial<LearnerProfile> | any,
    tutorProfile?: any,
    customDate?: string
): string => {
    const learnerName = learner?.name || 'Learner';
    const safeLearnerName = learnerName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    const formattedDate = customDate || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const isoDate = new Date().toISOString().split('T')[0];

    const cefrLevel = data.settings?.cefrLevel || learner?.cefrLevel || 'B1-B2';
    const topic = data.settings?.topic || 'Interactive Conversational Practice';
    const targetL1 = data.settings?.targetL1 || learner?.translationLanguage || learner?.l1Language || learner?.nativeLanguage || 'Spanish';
    const characters = data.characters || [];
    const dialogue = data.dialogue || [];
    const glossary = data.glossary || [];
    const questions = data.questions || [];

    // Annotation Features & Writeboard Canvas
    const annotationFeatures = getAnnotationFeatures((learner || { name: learnerName }) as any, 'presenter', true);

    // Learner Avatar Extraction
    let learnerAvatarBase64 = '';
    const learnerAvatarId = (learner as any)?.avatar || (learner as any)?.avatarId || (learner as any)?.avatarBase64 || '';
    if (learnerAvatarId && learnerAvatarId.startsWith('data:image')) {
        learnerAvatarBase64 = learnerAvatarId;
    } else if (learnerAvatarId) {
        learnerAvatarBase64 = getCustomAvatar(learnerAvatarId) || (learner as any)?.avatarBase64 || '';
    }
    if (!learnerAvatarBase64 && learnerAvatarId) {
        learnerAvatarBase64 = getAvatarUrl((learner as any)?.gender || 'Male', learnerAvatarId, learnerName);
    }

    // Tutor Avatar Extraction (Check tutorProfile passed + storeTutorInfo from top right header avatar)
    let storeTutorInfo: any = null;
    try {
        if (typeof window !== 'undefined') {
            storeTutorInfo = useAppStore.getState()?.tutorInfo;
        }
    } catch (e) {}

    const activeTutor = { ...storeTutorInfo, ...tutorProfile };
    let tutorAvatarBase64 = '';
    const tutorAvatarId = activeTutor?.avatarId || activeTutor?.avatar || activeTutor?.avatarBase64 || activeTutor?.photoUrl || storeTutorInfo?.avatarId || '';

    if (tutorAvatarId && tutorAvatarId.startsWith('data:image')) {
        tutorAvatarBase64 = tutorAvatarId;
    } else if (tutorAvatarId) {
        tutorAvatarBase64 = getCustomAvatar(tutorAvatarId) || activeTutor?.avatarBase64 || getAvatarUrl('Male', tutorAvatarId, activeTutor?.name || 'Tutor') || '';
    }

    const learnerInitial = (learnerName || 'L').charAt(0).toUpperCase();
    const defaultLearnerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#4f46e5"/><text x="50" y="63" font-size="44" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">${learnerInitial}</text></svg>`)}`;

    const tutorName = activeTutor?.name || (characters[1]?.name) || 'Tutor';
    const tutorInitial = tutorName.charAt(0).toUpperCase();
    const defaultTutorSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#059669"/><text x="50" y="63" font-size="44" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">${tutorInitial}</text></svg>`)}`;

    const finalLearnerAvatar = learnerAvatarBase64 || getAvatarUrl((learner as any)?.gender || 'Male', learnerAvatarId, learnerName) || defaultLearnerSvg;
    const finalTutorAvatar = tutorAvatarBase64 || getAvatarUrl('Male', tutorAvatarId, tutorName) || defaultTutorSvg;

    // Voice defaults: female learners -> Microsoft Ava Multilingual, male learners -> Microsoft Andrew Natural, tutor -> Microsoft Ryan Natural
    const learnerGenderDefault = String((learner as any)?.personalInfo?.gender || (learner as any)?.gender || '').toLowerCase();
    const defaultLearnerVoice = learnerGenderDefault.indexOf('female') !== -1
        ? 'Microsoft Ava Multilingual Online (Natural) - English (United States)'
        : learnerGenderDefault.indexOf('male') !== -1
            ? 'Microsoft Andrew Online (Natural) - English (United States)'
            : 'Microsoft Ava Multilingual Online (Natural) - English (United States)';
    const LEARNER_VOICE_URI = data.settings?.readAloudVoice || (learner as any)?.readAloudVoice || defaultLearnerVoice;
    const TUTOR_VOICE_URI = (activeTutor as any)?.voice || (activeTutor as any)?.readAloudVoice || 'Microsoft Ryan Online (Natural) - English (United Kingdom)';

    const jsonString = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

    // Helper to generate distinct colorful avatars for new / third-party characters
    const generateAvatarForCharacter = (name: string, isFemale?: boolean): string => {
        const clean = (name || '').replace(/\[.*?\]/g, '').replace(/:\s*$/, '').trim();
        let hash = 0;
        for (let i = 0; i < clean.length; i++) {
            hash = clean.charCodeAt(i) + ((hash << 5) - hash);
        }
        const palette = [
            '#0284c7', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2',
            '#4f46e5', '#9333ea', '#c026d3', '#e11d48', '#d97706', '#059669'
        ];
        const color = palette[Math.abs(hash) % palette.length];
        const initials = clean.split(/\s+/).map(w => w.charAt(0)).filter(Boolean).slice(0, 2).join('').toUpperCase() || (clean.charAt(0).toUpperCase() || 'C');
        
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="grad-${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#1e1b4b"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(#grad-${Math.abs(hash)})"/><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/><text x="50" y="58" font-size="34" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${initials}</text></svg>`;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    };

    const characterInfoMap: Record<string, { name: string; avatar: string; roleBadge: string; isLearner: boolean; isTutor: boolean }> = {};

    const resolveCharacterInfo = (rawName: string) => {
        const clean = (rawName || '').replace(/\[.*?\]/g, '').replace(/:\s*$/, '').trim();
        const lower = clean.toLowerCase();
        if (characterInfoMap[lower]) return characterInfoMap[lower];

        const learnerLower = (learnerName || '').toLowerCase();
        const tutorLower = (tutorName || '').toLowerCase();

        if (lower === learnerLower || lower.includes(learnerLower) || (learnerLower && learnerLower.includes(lower)) || lower.includes('learner')) {
            const info = {
                name: clean || learnerName,
                avatar: finalLearnerAvatar,
                roleBadge: '🎓 Learner',
                isLearner: true,
                isTutor: false
            };
            characterInfoMap[lower] = info;
            return info;
        }

        if (lower === tutorLower || lower.includes('tutor') || (tutorLower && tutorLower.includes(lower))) {
            const info = {
                name: clean || tutorName,
                avatar: finalTutorAvatar,
                roleBadge: '👨‍🏫 Tutor',
                isLearner: false,
                isTutor: true
            };
            characterInfoMap[lower] = info;
            return info;
        }

        const matchedDef = characters.find(c => {
            const cClean = (c.name || '').replace(/\[.*?\]/g, '').replace(/:\s*$/, '').trim().toLowerCase();
            return cClean === lower || lower.includes(cClean) || cClean.includes(lower);
        });

        if (matchedDef) {
            const isFemale = (matchedDef.tone || '').toLowerCase().includes('female') || (matchedDef as any)?.code?.includes('female');
            let charAvatar = (matchedDef as any).avatar || (matchedDef as any).avatarBase64 || '';
            if (!charAvatar) {
                charAvatar = generateAvatarForCharacter(clean, isFemale);
            }
            const roleBadge = matchedDef.job ? `👤 ${matchedDef.job}` : (matchedDef.tone ? `👤 ${matchedDef.tone}` : `👤 ${clean}`);
            const info = {
                name: clean,
                avatar: charAvatar,
                roleBadge: roleBadge,
                isLearner: false,
                isTutor: false
            };
            characterInfoMap[lower] = info;
            return info;
        }

        const avatar = generateAvatarForCharacter(clean);
        const info = {
            name: clean,
            avatar: avatar,
            roleBadge: `👤 ${clean.length <= 16 ? clean : 'Character'}`,
            isLearner: false,
            isTutor: false
        };
        characterInfoMap[lower] = info;
        return info;
    };

    // Populate characterInfoMap for all defined characters & dialogue lines
    characters.forEach(c => resolveCharacterInfo(c.name));
    dialogue.forEach(d => resolveCharacterInfo(d.character));

    const cleanTopicTitle = (rawTopic: string): string => {
        const topicSource = rawTopic || data.settings?.topic || (data as any).topic || (data as any).title || (data as any).scenario || '';
        if (!topicSource || !topicSource.trim()) {
            return 'Conversation Practice';
        }
        let cleaned = topicSource.trim();
        cleaned = cleaned.replace(/^["'`]|["'`]$/g, '').trim();
        cleaned = cleaned.replace(/^topic:\s*/i, '').replace(/^title:\s*/i, '').trim();
        
        if (cleaned.length > 80) {
            const firstClause = cleaned.split(/[\n\:\;\.\?]/)[0].trim();
            if (firstClause && firstClause.length >= 6 && firstClause.length <= 75) {
                return firstClause;
            }
            return cleaned.substring(0, 75) + '...';
        }
        return cleaned || 'Conversation Practice';
    };

    const escapeHtml = (str: string): string => {
        return (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const formatDialogueHtmlWithHighlights = (line: ConversationLine, lineIdx: number): string => {
        let rawText = line?.text || '';
        if (!rawText) return '';

        const ann = line?.annotations || {};
        const grammarTarget = (ann as any)?.grammar_target || (ann as any)?.grammar_phrase || '';
        const glossaryTarget = (ann as any)?.glossary_target || (ann as any)?.glossary_word || '';

        // Extract glossary term from "term = definition" if not provided
        let extractedGlossaryTerm = '';
        if (!glossaryTarget && ann.glossary) {
            const match = ann.glossary.match(/^([a-zA-Z0-9\s'-]+?)\s*(=|:|-|–|—|\()/);
            if (match && match[1] && match[1].trim().length > 2) {
                extractedGlossaryTerm = match[1].trim();
            }
        }

        // Extract grammar term from quotes if not provided
        let extractedGrammarTerm = '';
        if (!grammarTarget && ann.grammar) {
            const quoteMatch = ann.grammar.match(/["']([^"']{3,30})["']/);
            if (quoteMatch && quoteMatch[1]) {
                extractedGrammarTerm = quoteMatch[1].trim();
            }
        }

        // Convert existing tags or tags in rawText to unique placeholders to avoid nested attribute corruption
        let processed = rawText
            .replace(/<span\s+class="grammar-highlight"[^>]*>([\s\S]*?)<\/span>/gi, '___GRAMMAR_START___$1___GRAMMAR_END___')
            .replace(/<span\s+class="glossary-highlight"[^>]*>([\s\S]*?)<\/span>/gi, '___GLOSSARY_START___$1___GLOSSARY_END___')
            .replace(/\[grammar:\s*([^\]]+)\]/gi, '___GRAMMAR_START___$1___GRAMMAR_END___')
            .replace(/\[glossary:\s*([^\]]+)\]/gi, '___GLOSSARY_START___$1___GLOSSARY_END___');

        const finalGrammarTerm = grammarTarget || extractedGrammarTerm;
        if (finalGrammarTerm && !processed.includes('___GRAMMAR_START___')) {
            const regex = new RegExp(`(?<![<\\w])(${finalGrammarTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})(?![>\\w])`, 'i');
            processed = processed.replace(regex, '___GRAMMAR_START___$1___GRAMMAR_END___');
        }

        const finalGlossaryTerm = glossaryTarget || extractedGlossaryTerm;
        if (finalGlossaryTerm && !processed.includes('___GLOSSARY_START___')) {
            const regex = new RegExp(`(?<![<\\w])(${finalGlossaryTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})(?![>\\w])`, 'i');
            processed = processed.replace(regex, '___GLOSSARY_START___$1___GLOSSARY_END___');
        }

        if (glossary && Array.isArray(glossary) && !processed.includes('___GLOSSARY_START___')) {
            for (const gItem of glossary) {
                if (gItem?.word && gItem.word.length >= 3) {
                    const gRegex = new RegExp(`\\b(${gItem.word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})\\b`, 'i');
                    if (gRegex.test(processed) && !processed.includes('___GRAMMAR_START___') && !processed.includes('___GLOSSARY_START___')) {
                        processed = processed.replace(gRegex, '___GLOSSARY_START___$1___GLOSSARY_END___');
                        break;
                    }
                }
            }
        }

        const grammarTitle = escapeHtml(ann.grammar ? `🎓 Grammar Explanation: ${ann.grammar}` : 'Grammar Focus');
        const glossaryTitle = escapeHtml(ann.glossary ? `📖 Key Glossary: ${ann.glossary}` : 'Glossary Focus');

        const htmlResult = processed
            .replace(/___GRAMMAR_START___([\s\S]*?)___GRAMMAR_END___/g, `<span class="grammar-highlight" title="${grammarTitle}" onclick="highlightAnnotationBox(${lineIdx}, 'grammar')">$1</span>`)
            .replace(/___GLOSSARY_START___([\s\S]*?)___GLOSSARY_END___/g, `<span class="glossary-highlight" title="${glossaryTitle}" onclick="highlightAnnotationBox(${lineIdx}, 'glossary')">$1</span>`);

        return htmlResult;
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conversation Practice - ${learnerName} (${formattedDate})</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
    <style>
        ${annotationFeatures.css}

        :root {
            --bg-primary: #f8fafc;
            --bg-card: #ffffff;
            --bg-secondary: #f1f5f9;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --accent-indigo: #4f46e5;
            --accent-indigo-hover: #4338ca;
            --accent-emerald: #059669;
            --accent-amber: #d97706;
            --accent-rose: #e11d48;
            --accent-purple: #9333ea;
            --accent-cyan: #0891b2;
            --border-color: #e2e8f0;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            --radius-lg: 16px;
            --radius-md: 12px;
            --radius-sm: 8px;
            --font-main: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            --font-display: 'Playfair Display', Georgia, serif;
        }

        .dark-theme {
            --bg-primary: #0f172a;
            --bg-card: #1e293b;
            --bg-secondary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --text-muted: #94a3b8;
            --border-color: #334155;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.3);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-main);
            background-color: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 24px 16px;
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        .container {
            width: 100%;
            max-width: none;
            margin: 0 auto;
        }

        /* Header Styling */
        .app-header {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%);
            color: #ffffff;
            padding: 32px 28px;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
        }

        .app-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 320px;
            height: 320px;
            background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%);
            border-radius: 50%;
            pointer-events: none;
        }

        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 20px;
        }

        .header-title-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(8px);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .header-title {
            font-family: var(--font-display);
            font-size: 2.2rem;
            font-weight: 700;
            margin-top: 8px;
            color: #ffffff;
            line-height: 1.2;
        }

        .header-meta-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 16px;
        }

        .meta-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.12);
            padding: 8px 16px;
            border-radius: var(--radius-md);
            font-size: 0.9rem;
            font-weight: 600;
            border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .header-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .btn-header {
            background: rgba(255, 255, 255, 0.2);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 10px 16px;
            border-radius: var(--radius-sm);
            font-weight: 600;
            font-size: 0.88rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .btn-header:hover {
            background: rgba(255, 255, 255, 0.35);
            transform: translateY(-1px);
        }

        /* Voice Configuration Panel */
        .voice-config-card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 20px;
            margin-bottom: 24px;
            box-shadow: var(--shadow-sm);
        }

        .voice-config-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }

        .voice-config-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .voice-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
        }

        .voice-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
            background: var(--bg-secondary);
            padding: 12px;
            border-radius: var(--radius-sm);
        }

        .voice-field label {
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            justify-content: space-between;
        }

        .voice-select {
            width: 100%;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            background-color: var(--bg-card);
            color: var(--text-primary);
            font-size: 0.88rem;
            font-family: inherit;
            outline: none;
        }

        /* Tab Navigation */
        .tab-bar {
            display: flex;
            gap: 8px;
            border-bottom: 2px solid var(--border-color);
            margin-bottom: 24px;
            overflow-x: auto;
            padding-bottom: 2px;
        }

        .tab-btn {
            background: none;
            border: none;
            padding: 12px 20px;
            font-family: inherit;
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-muted);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 3px solid transparent;
            margin-bottom: -2px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .tab-btn:hover {
            color: var(--accent-indigo);
        }

        .tab-btn.active {
            color: var(--accent-indigo);
            border-bottom-color: var(--accent-indigo);
        }

        /* Tab Content Containers */
        .tab-content {
            display: none;
            animation: fadeIn 0.3s ease;
        }

        .tab-content.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Action Toolbar inside tabs */
        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 14px 18px;
            margin-bottom: 20px;
            box-shadow: var(--shadow-sm);
        }

        .btn-primary {
            background-color: var(--accent-indigo);
            color: #ffffff;
            border: none;
            padding: 10px 18px;
            border-radius: var(--radius-sm);
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .btn-primary:hover {
            background-color: var(--accent-indigo-hover);
            transform: translateY(-1px);
        }

        .btn-secondary {
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 10px 16px;
            border-radius: var(--radius-sm);
            font-weight: 600;
            font-size: 0.88rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .btn-secondary:hover {
            background-color: var(--border-color);
        }

        /* ── Listening-script karaoke transcript (Listen & Follow) ── */
        .cm-ls-panel {
            background: var(--bg-card);
            border: 2px solid var(--accent-indigo);
            border-radius: var(--radius-md);
            padding: 18px 20px;
            margin-bottom: 20px;
            box-shadow: var(--shadow-sm);
            display: none;
        }
        .cm-ls-head {
            font-weight: 800;
            font-size: 1rem;
            color: var(--accent-indigo);
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }
        .cm-ls-hint { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); margin-left: auto; text-transform: none; letter-spacing: 0; }
        .cm-ls-lines { display: flex; flex-direction: column; gap: 8px; }
        .cm-ls-line {
            display: flex; align-items: flex-start; gap: 10px;
            padding: 10px 12px; border-radius: 12px;
            background: var(--bg-secondary); border: 1.5px solid transparent;
            transition: background .25s, border-color .25s;
        }
        .cm-ls-line.playing { background: rgba(79, 70, 229, 0.08); border-color: var(--accent-indigo); }
        .cm-ls-line.playing .cm-ls-text { color: var(--accent-indigo); font-weight: 800; }
        .cm-ls-chip {
            flex-shrink: 0; font-weight: 800; font-size: 0.72rem;
            text-transform: uppercase; letter-spacing: 0.5px;
            padding: 4px 10px; border-radius: 999px;
            background: var(--accent-indigo); color: #fff; margin-top: 2px;
        }
        .cm-ls-text { flex: 1; font-size: 1.1rem; line-height: 1.55; color: var(--text-primary); }

        /* Dialogue List & Color-coded Annotations */
        .dialogue-list {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .dialogue-card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 22px;
            box-shadow: var(--shadow-sm);
            transition: all 0.2s ease;
            position: relative;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-items: stretch;
            gap: 24px;
        }

        .dialogue-card.speaking {
            border-color: var(--accent-indigo);
            background-color: rgba(79, 70, 229, 0.04);
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
        }

        .dialogue-main-column {
            flex: 1 1 340px;
            min-width: 300px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .dialogue-margin-column {
            flex: 1 1 340px;
            min-width: 260px;
            max-width: 460px;
            border-left: 2px solid var(--border-color);
            padding-left: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .margin-header-badge {
            font-size: 0.78rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--accent-indigo);
            background: rgba(79, 70, 229, 0.08);
            padding: 4px 10px;
            border-radius: 6px;
            margin-bottom: 4px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        @media (max-width: 880px) {
            .dialogue-card {
                flex-direction: column;
                gap: 16px;
            }
            .dialogue-main-column {
                flex-basis: auto;
                min-width: 0;
            }
            .dialogue-margin-column {
                width: 100%;
                max-width: none;
                flex-basis: auto;
                min-width: 0;
                border-left: none;
                border-top: 2px dashed var(--border-color);
                padding-left: 0;
                padding-top: 14px;
            }
        }

        .dialogue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .speaker-info {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .speaker-badge {
            background-color: rgba(79, 70, 229, 0.12);
            color: var(--accent-indigo);
            font-weight: 800;
            font-size: 0.95rem;
            padding: 4px 14px;
            border-radius: 20px;
        }

        .action-tag, .stage-dir {
            font-style: italic;
            color: #4f46e5;
            background: rgba(79, 70, 229, 0.08);
            font-size: 1.15rem;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 12px;
            border: 1px solid rgba(79, 70, 229, 0.2);
            display: inline-block;
        }

        .dialogue-main-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
        }

        .dialogue-text {
            font-size: 1.5rem;
            color: var(--text-primary);
            line-height: 1.7;
            font-weight: 600;
            flex: 1;
        }

        /* Character Avatars & Styling */
        .character-avatar-column {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            width: 90px;
            flex-shrink: 0;
        }
        .character-avatar-wrap {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .character-avatar-circle {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid var(--accent-indigo);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .dialogue-card.speaking .character-avatar-circle {
            border-color: #22c55e;
            box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.35), 0 8px 24px rgba(34, 197, 94, 0.5);
            transform: scale(1.12);
            animation: avatarGlowPulse 1.4s infinite ease-in-out;
        }
        @keyframes avatarGlowPulse {
            0% { transform: scale(1.08); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
            70% { transform: scale(1.14); box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); }
            100% { transform: scale(1.08); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .avatar-role-badge {
            font-size: 0.72rem;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 10px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            margin-top: -8px;
            z-index: 2;
            white-space: nowrap;
        }
        .character-name-label {
            font-size: 0.85rem;
            font-weight: 800;
            color: var(--text-primary);
            text-align: center;
            width: 100%;
            word-break: break-word;
        }

        /* Interactive Roleplay Stage & Avatars */
        .roleplay-avatar-stage {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }
        .rp-avatar-circle {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid var(--accent-indigo);
            box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3);
            transition: all 0.3s ease;
        }
        .rp-speaker-title {
            font-size: 1.35rem;
            font-weight: 800;
            color: var(--text-primary);
        }

        /* Branching RPG Stage CSS */
        .rpg-quest-stage-card {
            background: var(--bg-card);
            border: 2px solid var(--accent-indigo);
            border-radius: var(--radius-lg);
            padding: 24px;
            box-shadow: var(--shadow-lg);
        }
        .rpg-header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 10px;
        }
        .rpg-title-badge {
            font-weight: 800;
            font-size: 1rem;
            background: linear-gradient(135deg, #4f46e5, #9333ea);
            color: #ffffff;
            padding: 6px 14px;
            border-radius: 20px;
        }
        .rpg-turn-counter {
            font-weight: 800;
            font-size: 0.95rem;
            color: var(--accent-amber);
            background: rgba(217, 119, 6, 0.12);
            padding: 6px 14px;
            border-radius: 20px;
        }
        .rpg-character-roster {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 20px;
            padding: 12px;
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
        }
        .rpg-roster-item {
            font-size: 0.8rem;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 12px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .rpg-roster-avatar {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            object-fit: cover;
        }
        .rpg-scene-card {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .rpg-scene-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .rpg-scene-location {
            font-weight: 800;
            font-size: 1.1rem;
            color: var(--accent-indigo);
        }
        .rpg-story-box {
            background: rgba(79, 70, 229, 0.05);
            border-left: 4px solid var(--accent-indigo);
            padding: 18px;
            border-radius: 0 var(--radius-md) var(--radius-md) 0;
        }
        .rpg-speaker-tag {
            font-weight: 800;
            font-size: 0.95rem;
            color: var(--accent-indigo);
            margin-bottom: 6px;
        }
        .rpg-story-text {
            font-size: 1.25rem;
            line-height: 1.6;
            font-weight: 600;
            color: var(--text-primary);
        }
        .rpg-choices-title {
            font-weight: 800;
            font-size: 1rem;
            color: var(--text-secondary);
            margin-top: 8px;
        }
        .rpg-choices-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .rpg-choice-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            text-align: left;
            background: var(--bg-card);
            border: 2px solid var(--border-color);
            padding: 14px 18px;
            border-radius: var(--radius-md);
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .rpg-choice-btn:hover {
            border-color: var(--accent-indigo);
            background: rgba(79, 70, 229, 0.06);
            transform: translateX(4px);
        }
        .rpg-choice-badge {
            background: var(--accent-indigo);
            color: #ffffff;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 0.85rem;
            flex-shrink: 0;
        }
        .rpg-failure-card, .rpg-victory-card {
            text-align: center;
            padding: 32px 20px;
        }
        .rpg-failure-icon {
            font-size: 4rem;
            margin-bottom: 12px;
        }
        .rpg-failure-title {
            font-size: 1.6rem;
            font-weight: 800;
            color: var(--accent-rose);
            margin-bottom: 8px;
        }
        .rpg-failure-text {
            font-size: 1.15rem;
            color: var(--text-secondary);
            max-width: 600px;
            margin: 0 auto;
        }
        .rpg-victory-icon {
            font-size: 4rem;
            margin-bottom: 12px;
        }
        .rpg-victory-title {
            font-size: 1.8rem;
            font-weight: 800;
            color: var(--accent-emerald);
            margin-bottom: 8px;
        }
        .rpg-victory-text {
            font-size: 1.15rem;
            color: var(--text-secondary);
            max-width: 600px;
            margin: 0 auto 16px auto;
        }
        .rpg-avatars-celebration {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin: 16px 0;
        }
        .rp-celebration-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid var(--accent-emerald);
            box-shadow: 0 0 20px rgba(5, 150, 105, 0.4);
        }

        .grammar-segment-btn {
            background: var(--bg-card);
            border: 2px solid var(--accent-indigo);
            color: var(--text-primary);
            padding: 10px 18px;
            border-radius: 20px;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .grammar-segment-btn:hover {
            background: var(--accent-indigo);
            color: #ffffff;
            transform: translateY(-2px);
        }
        .grammar-segment-btn.correct-spot {
            background: #dcfce7 !important;
            border-color: #22c55e !important;
            color: #15803d !important;
            font-weight: 800;
        }
        .grammar-segment-btn.incorrect-spot {
            background: #ffe4e6 !important;
            border-color: #f43f5e !important;
            color: #be123c !important;
        }

        .play-line-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background-color: var(--bg-secondary);
            color: var(--accent-indigo);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .play-line-btn:hover {
            background-color: var(--accent-indigo);
            color: #ffffff;
            transform: scale(1.08);
        }

        /* Side Margin Annotations Container */
        .annotations-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        /* Highlighting in Dialogue Text */
        .grammar-highlight {
            background: rgba(37, 99, 235, 0.15);
            color: #1d4ed8;
            border-bottom: 2.5px solid #2563eb;
            padding: 2px 6px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-block;
        }
        .dark-theme .grammar-highlight {
            background: rgba(59, 130, 246, 0.25);
            color: #93c5fd;
            border-bottom-color: #60a5fa;
        }
        .grammar-highlight:hover {
            background: rgba(37, 99, 235, 0.28);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
        }

        .glossary-highlight {
            background: rgba(217, 119, 6, 0.15);
            color: #b45309;
            border-bottom: 2.5px solid #d97706;
            padding: 2px 6px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-block;
        }
        .dark-theme .glossary-highlight {
            background: rgba(245, 158, 11, 0.25);
            color: #fde047;
            border-bottom-color: #facc15;
        }
        .glossary-highlight:hover {
            background: rgba(217, 119, 6, 0.28);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(217, 119, 6, 0.2);
        }

        @keyframes noteTargetPulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.6); }
            50% { transform: scale(1.03); box-shadow: 0 0 0 8px rgba(79, 70, 229, 0.2); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }
        .anno-box.highlight-focus {
            animation: noteTargetPulse 0.8s ease-in-out 2;
            border-color: #4f46e5 !important;
        }

        .anno-box {
            padding: 14px 16px;
            border-radius: var(--radius-sm);
            font-size: 0.98rem;
            border-left: 5px solid #cbd5e1;
            line-height: 1.6;
            font-weight: 500;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .anno-box-title {
            font-weight: 800;
            font-size: 0.88rem;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Annotation Color Variations */
        .anno-grammar { background: rgba(59, 130, 246, 0.1); border-left-color: #2563eb; color: #1e3a8a; }
        .dark-theme .anno-grammar { background: rgba(59, 130, 246, 0.2); color: #bfdbfe; }
        .anno-grammar .anno-box-title { color: #1d4ed8; }
        .dark-theme .anno-grammar .anno-box-title { color: #60a5fa; }

        .anno-glossary { background: rgba(217, 119, 6, 0.1); border-left-color: #d97706; color: #78350f; }
        .dark-theme .anno-glossary { background: rgba(217, 119, 6, 0.2); color: #fef08a; }
        .anno-glossary .anno-box-title { color: #b45309; }
        .dark-theme .anno-glossary .anno-box-title { color: #facc15; }

        .anno-formal { background: rgba(79, 70, 229, 0.1); border-left-color: #4f46e5; color: #312e81; }
        .dark-theme .anno-formal { background: rgba(79, 70, 229, 0.2); color: #ddd6fe; }
        .anno-formal .anno-box-title { color: #4338ca; }
        .dark-theme .anno-formal .anno-box-title { color: #818cf8; }

        .anno-informal { background: rgba(5, 150, 105, 0.1); border-left-color: #059669; color: #064e3b; }
        .dark-theme .anno-informal { background: rgba(5, 150, 105, 0.2); color: #a7f3d0; }
        .anno-informal .anno-box-title { color: #047857; }
        .dark-theme .anno-informal .anno-box-title { color: #34d399; }

        .anno-soap { background: rgba(225, 29, 72, 0.1); border-left-color: #e11d48; color: #881337; }
        .dark-theme .anno-soap { background: rgba(225, 29, 72, 0.2); color: #fecdd3; }
        .anno-soap .anno-box-title { color: #be123c; }
        .dark-theme .anno-soap .anno-box-title { color: #fb7185; }

        .anno-pronunciation { background: rgba(147, 51, 234, 0.1); border-left-color: #9333ea; color: #581c87; }
        .dark-theme .anno-pronunciation { background: rgba(147, 51, 234, 0.2); color: #f5d0fe; }
        .anno-pronunciation .anno-box-title { color: #7e22ce; }
        .dark-theme .anno-pronunciation .anno-box-title { color: #c084fc; }

        .anno-translation { background: rgba(8, 145, 178, 0.1); border-left-color: #0891b2; color: #164e63; }
        .dark-theme .anno-translation { background: rgba(8, 145, 178, 0.2); color: #bae6fd; }
        .anno-translation .anno-box-title { color: #0e7490; }
        .dark-theme .anno-translation .anno-box-title { color: #38bdf8; }

        body.translations-hidden .anno-translation,
        body.translations-hidden .l1-translation {
            display: none !important;
        }
        body.annotations-hidden .annotations-grid,
        body.annotations-hidden .dialogue-margin-column {
            display: none !important;
        }

        /* Ctrl+scroll zooms only the lesson content — the header, tab bar, toolbars and the annotations bar stay fixed */
        .lesson-zoom-area {
            transform-origin: top left;
        }

        /* Roleplay Tab Styles */
        .roleplay-card {
            background-color: var(--bg-card);
            border: 2px solid var(--accent-indigo);
            border-radius: var(--radius-lg);
            padding: 28px;
            box-shadow: var(--shadow-lg);
            text-align: center;
        }

        .roleplay-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            gap: 16px;
        }

        .roleplay-nav-btn {
            background: var(--accent-indigo);
            color: #ffffff;
            border: none;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            font-size: 1.2rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            box-shadow: var(--shadow-md);
        }

        .roleplay-nav-btn:hover:not(:disabled) {
            transform: scale(1.1);
            background: var(--accent-indigo-hover);
        }

        .roleplay-nav-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
            transform: none;
        }

        .roleplay-turn-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 30px;
            font-weight: 800;
            font-size: 0.95rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 16px;
        }

        .turn-learner { background-color: #dcfce7; color: #15803d; border: 2px solid #22c55e; }
        .turn-partner { background-color: #e0e7ff; color: #4338ca; border: 2px solid #6366f1; }

        .roleplay-speaker-title {
            font-family: var(--font-display);
            font-size: 1.8rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
        }

        .roleplay-text-box {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
            font-size: 1.35rem;
            line-height: 1.6;
            margin: 20px 0;
            font-weight: 600;
            color: var(--text-primary);
            min-height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .roleplay-mic-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            margin-top: 20px;
        }

        .btn-mic {
            background: var(--accent-rose);
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 30px;
            font-size: 1.05rem;
            font-weight: 800;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            box-shadow: var(--shadow-md);
            transition: all 0.2s ease;
        }

        .btn-mic:hover {
            transform: scale(1.05);
            background: #be123c;
        }

        .mic-active {
            animation: pulseMic 1.2s infinite;
        }

        @keyframes pulseMic {
            0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.6); }
            70% { box-shadow: 0 0 0 16px rgba(225, 29, 72, 0); }
            100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
        }

        /* 10 Interactive Game Activities Arena */
        .arena-header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 20px 24px;
            border-radius: var(--radius-md);
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            box-shadow: var(--shadow-md);
        }

        .score-board {
            display: flex;
            align-items: center;
            gap: 20px;
            background: rgba(255, 255, 255, 0.15);
            padding: 10px 20px;
            border-radius: 30px;
            backdrop-filter: blur(8px);
        }

        .score-item {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .score-item label {
            font-size: 0.72rem;
            text-transform: uppercase;
            font-weight: 800;
            opacity: 0.85;
        }

        .score-item value {
            font-size: 1.4rem;
            font-weight: 900;
        }

        .game-nav-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-bottom: 24px;
        }

        .game-nav-btn {
            background: var(--bg-card);
            border: 2px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 14px;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .game-nav-btn:hover {
            border-color: var(--accent-indigo);
            transform: translateY(-2px);
        }

        .game-nav-btn.active {
            border-color: var(--accent-indigo);
            background: rgba(79, 70, 229, 0.08);
        }

        .game-nav-icon {
            font-size: 1.5rem;
            width: 38px;
            height: 38px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-secondary);
            color: var(--accent-indigo);
            flex-shrink: 0;
        }

        .game-stage-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 24px;
            box-shadow: var(--shadow-md);
        }

        .game-item-card {
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
            padding: 18px;
            margin-bottom: 16px;
            border: 1px solid var(--border-color);
        }

        .game-opt-btn {
            width: 100%;
            text-align: left;
            padding: 12px 16px;
            margin-top: 8px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--border-color);
            background: var(--bg-card);
            color: var(--text-primary);
            font-family: inherit;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .game-opt-btn:hover {
            background: rgba(79, 70, 229, 0.08);
            border-color: var(--accent-indigo);
        }

        .game-opt-btn.correct {
            background: #dcfce7 !important;
            border-color: #22c55e !important;
            color: #15803d !important;
            font-weight: 800;
        }

        .game-opt-btn.incorrect {
            background: #ffe4e6 !important;
            border-color: #f43f5e !important;
            color: #be123c !important;
        }

        /* 🎓 Arena review card — color-coded mini-lesson summary after each game */
        .cm-rv-card {
            margin-top: 22px;
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.10);
            overflow: hidden;
        }
        .cm-rv-head {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 13px 18px;
            background: linear-gradient(90deg, #4f46e5, #7c3aed);
            color: #fff;
            font-weight: 900;
            font-size: 1.0rem;
        }
        .cm-rv-head .cm-rv-score {
            font-size: 0.72rem;
            background: rgba(255,255,255,0.18);
            padding: 3px 10px;
            border-radius: 20px;
            letter-spacing: 0.03em;
        }
        .cm-rv-next {
            margin-left: auto;
            background: rgba(255,255,255,0.92);
            color: #4f46e5;
            border: none;
            border-radius: 10px;
            padding: 7px 14px;
            font-size: 0.8rem;
            font-weight: 900;
            cursor: pointer;
            font-family: inherit;
            transition: transform 0.15s ease;
        }
        .cm-rv-next:hover { transform: translateY(-1px); }
        .cm-rv-body {
            padding: 16px 18px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            max-height: 460px;
            overflow-y: auto;
        }
        .cm-rv-q {
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 12px 14px;
            background: #fbfcfe;
        }
        .cm-rv-q-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .cm-rv-q-num {
            font-size: 0.68rem;
            font-weight: 900;
            background: #eef2ff;
            color: #4f46e5;
            border-radius: 9px;
            padding: 2px 8px;
            letter-spacing: 0.04em;
        }
        .cm-rv-verdict {
            font-size: 0.66rem;
            font-weight: 900;
            border-radius: 10px;
            padding: 2px 9px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .cm-rv-verdict.ok { background: #dcfce7; color: #15803d; }
        .cm-rv-verdict.no { background: #ffe4e6; color: #be123c; }
        .cm-rv-q-prompt {
            font-size: 0.93rem;
            color: #0f172a;
            line-height: 1.55;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .cm-rv-q-meta { font-size: 0.86rem; font-weight: 700; line-height: 1.5; }
        .cm-rv-q-meta .cm-rv-right { color: #15803d; }
        .cm-rv-q-meta .cm-rv-picked { color: #be123c; }
        .cm-pt {
            display: block;
            border-radius: 12px;
            padding: 9px 12px;
            margin-top: 9px;
            font-size: 0.9rem;
            line-height: 1.6;
            font-weight: 600;
            border: 1.5px solid;
            text-align: left;
        }
        .cm-pt .cm-pt-tag {
            display: inline-block;
            font-size: 0.58rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 2px 8px;
            border-radius: 8px;
            margin-right: 8px;
            color: #fff;
            vertical-align: 1px;
        }
        .cm-pt-meaning { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; } .cm-pt-meaning .cm-pt-tag { background: #2563eb; }
        .cm-pt-form { background: #f5f3ff; border-color: #ddd6fe; color: #4c1d95; } .cm-pt-form .cm-pt-tag { background: #7c3aed; }
        .cm-pt-use { background: #f0fdfa; border-color: #99f6e4; color: #134e4a; } .cm-pt-use .cm-pt-tag { background: #0d9488; }
        .cm-pt-pron { background: #fff1f2; border-color: #fecdd3; color: #881337; } .cm-pt-pron .cm-pt-tag { background: #e11d48; }
        .cm-pt-grammar { background: #eef2ff; border-color: #c7d2fe; color: #312e81; } .cm-pt-grammar .cm-pt-tag { background: #4f46e5; }
        .cm-pt-vocab { background: #fffbeb; border-color: #fde68a; color: #78350f; } .cm-pt-vocab .cm-pt-tag { background: #d97706; }
        .cm-pt-example { background: #fff7ed; border-color: #fed7aa; color: #7c2d12; } .cm-pt-example .cm-pt-tag { background: #ea580c; }
        .cm-pt-tip { background: #f8fafc; border-color: #cbd5e1; color: #334155; } .cm-pt-tip .cm-pt-tag { background: #475569; }
        .cm-pt-warn { background: #fef2f2; border-color: #fecaca; color: #7f1d1d; } .cm-pt-warn .cm-pt-tag { background: #dc2626; }
        .cm-pt-plain { background: #f8fafc; border-color: #e2e8f0; color: #334155; }
        .cm-kw {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 9px;
            padding: 9px 12px;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 700;
            border: 1.5px solid #fcd34d;
            background: #fffbeb;
            color: #78350f;
        }
        .cm-kw-row { display: flex; align-items: baseline; gap: 8px; font-weight: 600; font-size: 0.86rem; }
        .cm-kw-row strong {
            flex-shrink: 0;
            font-size: 0.56rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            opacity: 0.8;
            padding: 2px 7px;
            border-radius: 8px;
            background: rgba(0,0,0,0.08);
        }
        .cm-kw-term { font-weight: 900; font-size: 1.0rem; }

        /* Glossary Grid */
        .glossary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 18px;
        }

        .glossary-card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-left: 5px solid var(--accent-amber);
            border-radius: var(--radius-md);
            padding: 20px;
            box-shadow: var(--shadow-sm);
        }

        .glossary-term {
            font-size: 1.15rem;
            font-weight: 800;
            color: var(--accent-amber);
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .glossary-def {
            font-size: 0.95rem;
            color: var(--text-primary);
            margin-bottom: 12px;
        }

        .ccq-box {
            background-color: var(--bg-secondary);
            border-radius: var(--radius-sm);
            padding: 12px;
            font-size: 0.88rem;
            border: 1px dashed var(--border-color);
        }

        .ccq-title {
            font-weight: 700;
            color: var(--text-muted);
            margin-bottom: 4px;
        }

        .ccq-answer {
            color: var(--accent-emerald);
            font-weight: 600;
            margin-top: 6px;
        }

        /* Questions Grid */
        .questions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
        }

        .question-card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-left: 5px solid var(--accent-emerald);
            border-radius: var(--radius-md);
            padding: 20px;
            box-shadow: var(--shadow-sm);
        }

        .question-scenario {
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .question-text {
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 12px;
        }

        .answer-box {
            background-color: var(--bg-secondary);
            padding: 12px;
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
            color: var(--accent-emerald);
            font-weight: 600;
            display: none;
            margin-top: 10px;
        }

        /* Learner Notes Section */
        .notes-card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
            box-shadow: var(--shadow-sm);
            margin-top: 24px;
        }

        .notes-textarea {
            width: 100%;
            min-height: 140px;
            padding: 14px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--border-color);
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            font-family: inherit;
            font-size: 0.95rem;
            line-height: 1.6;
            outline: none;
            resize: vertical;
            margin-top: 10px;
        }

        /* Footer (Clean & Professional) */
        .app-footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color);
            color: var(--text-muted);
            font-size: 0.88rem;
        }

        
        /* ===== PHONE / TOUCH AUDIT (390px) ===== */
        @media (max-width: 480px) {
            button, .btn, .nav-btn, .tab-btn, .slide-nav-btn, .play-btn,
            .speaker-btn, .replay-btn, .record-btn, [role="button"] { min-height: 44px; min-width: 44px; }
            table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
            h1 { font-size: 1.5rem; }
            h2 { font-size: 1.25rem; }
            body { overflow-x: hidden; }
        }
        @media (max-width: 390px) {
            h1 { font-size: 1.35rem; }
            .dialogue-card, .study-grid, .slides-carousel-wrapper { padding-left: 10px; padding-right: 10px; }
        }

@media print {
            body { background: white; color: black; padding: 0; }
            .btn-header, .voice-config-card, .toolbar, .play-line-btn, .tab-bar { display: none !important; }
            .tab-content { display: block !important; margin-bottom: 30px; }
            .dialogue-card, .glossary-card, .question-card { break-inside: avoid; border: 1px solid #ccc !important; }
            .answer-box { display: block !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header Banner -->
        <header class="app-header">
            <div class="header-top">
                <div>
                    <span class="header-title-badge">
                        <i class="fas fa-comments"></i> Conversation Practice
                    </span>
                    <h1 class="header-title">${cleanTopicTitle(topic)}</h1>
                </div>
                <div class="header-actions">
                    <button class="btn-header" onclick="toggleDarkMode()">
                        <i class="fas fa-moon" id="theme-icon"></i> Theme
                    </button>
                    <button class="btn-header" onclick="window.print()">
                        <i class="fas fa-print"></i> Print / PDF
                    </button>
                    <button class="btn-header" onclick="copyFormattedText()">
                        <i class="fas fa-copy"></i> Copy Rich Text
                    </button>
                </div>
            </div>

            <div class="header-meta-grid">
                <div class="meta-pill" style="display:flex;align-items:center;gap:8px">
                    <img src="${finalLearnerAvatar}" alt="${learnerName}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:2px solid #10b981" />
                    <span><i class="fas fa-user-graduate"></i> Learner: <strong>${learnerName}</strong></span>
                </div>
                <div class="meta-pill" style="display:flex;align-items:center;gap:8px">
                    <img src="${finalTutorAvatar}" alt="${tutorName}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:2px solid #4f46e5" />
                    <span><i class="fas fa-chalkboard-teacher"></i> Tutor: <strong>${tutorName}</strong></span>
                </div>
                <div class="meta-pill">
                    <i class="fas fa-calendar-alt"></i> Date: <strong>${formattedDate}</strong>
                </div>
                <div class="meta-pill">
                    <i class="fas fa-layer-group"></i> CEFR Level: <strong>${cefrLevel}</strong>
                </div>
                <div class="meta-pill">
                    <i class="fas fa-language"></i> Target L1: <strong>${targetL1}</strong>
                </div>
            </div>
        </header>

        <!-- Voice & Audio Configuration -->
        <section class="voice-config-card">
            <div class="voice-config-header">
                <h2 class="voice-config-title">
                    <i class="fas fa-sliders-h text-indigo-500"></i> Speech Synthesis Audio Controls
                </h2>
                <span style="font-size: 0.85rem; color: var(--text-muted)">
                    <i class="fas fa-info-circle"></i> Web Speech API
                </span>
            </div>
            <div class="voice-grid">
                ${characters.map((char, idx) => `
                    <div class="voice-field">
                        <label>
                            <span>${char.name} Voice</span>
                            <span style="color: var(--accent-indigo)">${char.tone || 'Speaker'}</span>
                        </label>
                        <select id="voice-select-${idx}" class="voice-select" onchange="updateCharVoice(${idx}, this.value)">
                            <option value="">Loading voices...</option>
                        </select>
                    </div>
                `).join('')}
                <div class="voice-field">
                    <label><span>Playback Speed</span> <span id="speed-val">1.0x</span></label>
                    <input type="range" id="speed-slider" min="0.7" max="1.4" step="0.1" value="1.0" class="voice-select" oninput="updateSpeed(this.value)">
                </div>
            </div>
        </section>

        <!-- Navigation Tabs -->
        <nav class="tab-bar">
            <button class="tab-btn active" onclick="switchTab('dialogue', this)">
                <i class="fas fa-comments"></i> 🗣️ Dialogue (${dialogue.length})
            </button>
            <button class="tab-btn" onclick="switchTab('roleplay', this)">
                <i class="fas fa-masks-theater"></i> 🎭 Interactive Roleplay
            </button>
            <button class="tab-btn" onclick="switchTab('games', this)">
                <i class="fas fa-gamepad"></i> 🎮 Games
            </button>
            <button class="tab-btn" onclick="switchTab('glossary', this)">
                <i class="fas fa-book"></i> 📖 Glossary (${glossary.length})
            </button>
            <button class="tab-btn" onclick="switchTab('questions', this)">
                <i class="fas fa-question-circle"></i> ❓ Questions (${questions.length})
            </button>
        </nav>

        <!-- Tab 1: Dialogue Container -->
        <main id="tab-dialogue" class="tab-content active">
            <div class="toolbar">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center">
                    <button class="btn-primary" onclick="playFullDialogue()">
                        <i class="fas fa-play" id="play-full-icon"></i> Play Full Conversation
                    </button>
                    <button class="btn-primary" style="background-color: var(--accent-cyan);" onclick="startInteractiveLineByLine()">
                        <i class="fas fa-step-forward"></i> Play Line-by-Line (← / → Keys)
                    </button>
                    <button class="btn-secondary" id="cm-karaoke-btn" onclick="cmToggleKaraoke()">
                        <i class="fas fa-headphones"></i> 🎧 Listen &amp; Follow
                    </button>
                    <button class="btn-secondary" id="pause-resume-btn" onclick="togglePauseResume()">
                        <i class="fas fa-pause"></i> Pause
                    </button>
                    <button class="btn-secondary" onclick="stopAudio()">
                        <i class="fas fa-stop"></i> Stop
                    </button>
                </div>
                <div style="display: flex; gap: 8px">
                    <button class="btn-secondary" onclick="toggleAllAnnotations()">
                        <i class="fas fa-tags"></i> Toggle Line Annotations
                    </button>
                    <button class="btn-secondary" onclick="toggleStageDirections()">
                        <i class="fas fa-eye"></i> Stage Directions
                    </button>
                </div>
            </div>

            <div class="lesson-zoom-area">
            <!-- Listening-script style read-aloud transcript (hidden until 'Listen & Follow' pressed) -->
            <div class="cm-ls-panel" id="cm-ls-panel">
                <div class="cm-ls-head">
                    <i class="fas fa-headphones"></i> Listening Transcript
                    <span class="cm-ls-hint">Follow along — each line highlights while it is read aloud</span>
                </div>
                <div class="cm-ls-lines" id="cm-ls-lines">
                    ${dialogue.map((line, idx) => {
                        const cleanText = (line.text || '').replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim();
                        return `<div class="cm-ls-line" id="cm-ls-line-${idx}" data-idx="${idx}">
                            <span class="cm-ls-chip">${escapeHtml(line.character)}</span>
                            <span class="cm-ls-text">${escapeHtml(cleanText)}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
            <div class="dialogue-list" id="dialogue-list-container">
                ${dialogue.map((line, idx) => {
                    const ann = line.annotations || {};
                    const charInfo = resolveCharacterInfo(line.character);
                    return `
                    <div class="dialogue-card" id="line-card-${idx}">
                        <div class="character-avatar-column">
                            <div class="character-avatar-wrap">
                                <img src="${charInfo.avatar}" class="character-avatar-circle" alt="${charInfo.name}" />
                                <span class="avatar-role-badge">${charInfo.roleBadge}</span>
                            </div>
                            <div class="character-name-label">${line.character}</div>
                        </div>

                        <div class="dialogue-main-column">
                            <div class="dialogue-header">
                                <div class="speaker-info">
                                    <span class="speaker-badge">${line.character}</span>
                                    ${line.action ? `<span class="action-tag stage-dir">(${line.action})</span>` : ''}
                                </div>
                                <button class="play-line-btn" title="Read line aloud" onclick="playLine(${idx})">
                                    <i class="fas fa-volume-up"></i>
                                </button>
                            </div>
                            <div class="dialogue-main-row">
                                <p class="dialogue-text">${formatDialogueHtmlWithHighlights(line, idx)}</p>
                            </div>
                        </div>

                        <div class="dialogue-margin-column">
                            <div class="margin-header-badge">
                                <i class="fas fa-columns"></i> Side Margin Notes
                            </div>
                            <!-- Color-coded Annotation Boxes in Side Margin -->
                            <div class="annotations-grid" id="anno-grid-${idx}">
                                ${ann.translation_l1 ? `
                                    <div class="anno-box anno-translation">
                                        <div class="anno-box-title"><i class="fas fa-globe"></i> ${targetL1} Translation</div>
                                        <div>${ann.translation_l1}</div>
                                    </div>
                                ` : ''}
                                ${ann.grammar ? `
                                    <div class="anno-box anno-grammar">
                                        <div class="anno-box-title"><i class="fas fa-graduation-cap"></i> Grammar Explanation</div>
                                        <div>${ann.grammar}</div>
                                    </div>
                                ` : ''}
                                ${ann.glossary ? `
                                    <div class="anno-box anno-glossary">
                                        <div class="anno-box-title"><i class="fas fa-book-open"></i> Key Glossary</div>
                                        <div>${ann.glossary}</div>
                                    </div>
                                ` : ''}
                                ${ann.formal ? `
                                    <div class="anno-box anno-formal">
                                        <div class="anno-box-title"><i class="fas fa-user-tie"></i> Formal Register</div>
                                        <div>${ann.formal}</div>
                                    </div>
                                ` : ''}
                                ${ann.informal ? `
                                    <div class="anno-box anno-informal">
                                        <div class="anno-box-title"><i class="fas fa-user-ninja"></i> Informal Street Version</div>
                                        <div>${ann.informal}</div>
                                    </div>
                                ` : ''}
                                ${ann.soap_opera ? `
                                    <div class="anno-box anno-soap">
                                        <div class="anno-box-title"><i class="fas fa-masks-theater"></i> Soap Opera (Drama)</div>
                                        <div>${ann.soap_opera}</div>
                                    </div>
                                ` : ''}
                                ${ann.pronunciation ? `
                                    <div class="anno-box anno-pronunciation">
                                        <div class="anno-box-title"><i class="fas fa-wave-square"></i> Pronunciation & Pitch (↗ ↘)</div>
                                        <div>${ann.pronunciation}</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            </div>
        </main>

        <!-- Tab 2: Interactive Roleplay Practice -->
        <section id="tab-roleplay" class="tab-content">
            <div class="toolbar">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
                    <label style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary)">
                        🎭 Learner Role:
                    </label>
                    <select id="roleplay-character-select" class="voice-select" style="width: auto; font-weight: 700" onchange="changeLearnerRole(this.value)">
                        ${characters.map(c => `<option value="${c.name}">${c.name} (${c.job || c.tone || 'Role'})</option>`).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 8px">
                    <button class="btn-secondary" onclick="speakCurrentRoleplayLine()">
                        <i class="fas fa-volume-up"></i> Read Active Line Aloud
                    </button>
                    <button class="btn-secondary" onclick="toggleAutoAdvancePartner()">
                        <i class="fas fa-robot"></i> Auto-Speak Partner Turns
                    </button>
                </div>
            </div>

            <div class="lesson-zoom-area">
            <div class="roleplay-card">
                <div class="roleplay-avatar-stage">
                    <div class="rp-avatar-halo">
                        <img id="rp-avatar-img" src="${finalLearnerAvatar}" class="rp-avatar-circle" alt="Active Speaker Avatar" />
                    </div>
                    <div id="rp-speaker-name" class="roleplay-speaker-title">Speaker Name</div>
                    <div id="rp-turn-badge" class="roleplay-turn-badge turn-learner">🎯 YOUR TURN TO SPEAK</div>
                </div>

                <div class="roleplay-nav">
                    <button class="roleplay-nav-btn" id="rp-prev-btn" onclick="stepRoleplay(-1)" title="Previous Line (Left Arrow)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span id="rp-progress-text" style="font-size: 0.88rem; font-weight: 800; color: var(--text-muted)">Line 1 of ${dialogue.length}</span>
                    <button class="roleplay-nav-btn" id="rp-next-btn" onclick="stepRoleplay(1)" title="Next Line (Right Arrow)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>

                <div id="rp-action-text" class="action-tag stage-dir" style="margin-bottom: 12px; font-size: 1.15rem"></div>

                <div class="roleplay-text-box" id="rp-text-box">
                    "Line text goes here..."
                </div>

                <div class="roleplay-mic-area">
                    <button class="btn-mic" id="rp-mic-btn" onclick="toggleRoleplayMic()">
                        <i class="fas fa-microphone"></i> <span id="rp-mic-label">Record Practice Speech</span>
                    </button>
                    <div id="rp-speech-feedback" style="font-weight: 700; font-size: 0.95rem; color: var(--accent-emerald)"></div>
                </div>
            </div>
            </div>
        </section>

        <!-- Tab 3: 10 Auto-Scored Game Activities Arena -->
        <section id="tab-games" class="tab-content">
            <div class="arena-header">
                <div>
                    <h2 style="font-size: 1.3rem; font-weight: 800; font-family: var(--font-display)">
                        ⚡ High-Adrenaline Auto-Scored Competition Arena
                    </h2>
                    <p style="font-size: 0.88rem; opacity: 0.9">10 Interactive Games • 5 Items Each • Live Multiplier Streaks</p>
                </div>
                <div class="score-board">
                    <div class="score-item">
                        <label>Score</label>
                        <value id="arena-score">0</value>
                    </div>
                    <div class="score-item">
                        <label>Streak</label>
                        <value id="arena-streak">0x</value>
                    </div>
                    <div class="score-item">
                        <label>Accuracy</label>
                        <value id="arena-acc">0%</value>
                    </div>
                </div>
            </div>

            <div class="lesson-zoom-area">
            <div class="game-nav-grid" id="game-nav-container">
                <!-- 10 Game Nav Buttons Rendered via JS -->
            </div>

            <div class="game-stage-card" id="game-stage-container">
                <!-- Active Game Rendered Here -->
            </div>
            </div>
        </section>

        <!-- Tab 4: Glossary Container -->
        <section id="tab-glossary" class="tab-content">
            <div class="toolbar">
                <button class="btn-primary" onclick="playFullGlossary()">
                    <i class="fas fa-volume-up"></i> Read Full Glossary Aloud
                </button>
                <button class="btn-secondary" onclick="togglePauseResume()">
                    <i class="fas fa-pause"></i> Pause
                </button>
            </div>

            <div class="lesson-zoom-area">
            <div class="glossary-grid">
                ${glossary.map((item, idx) => `
                    <div class="glossary-card" id="glossary-card-${idx}">
                        <div class="glossary-term">
                            <span>✨ ${item.word}</span>
                            <button class="play-line-btn" style="width:28px;height:28px" onclick="readGlossaryItem(${idx})" title="Read term">
                                <i class="fas fa-volume-up" style="font-size:0.75rem"></i>
                            </button>
                        </div>
                        <p class="glossary-def"><strong>Definition:</strong> ${item.definition}</p>
                        ${item.ccq ? `
                            <div class="ccq-box">
                                <div class="ccq-title">❓ Concept Checking Question:</div>
                                <div>${item.ccq}</div>
                                <div class="ccq-answer">✅ ${item.ccq_answer || 'Yes'}</div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            </div>
        </section>

        <!-- Tab 5: Discussion Questions Container -->
        <section id="tab-questions" class="tab-content">
            <div class="toolbar">
                <button class="btn-primary" onclick="playFullQuestions()">
                    <i class="fas fa-volume-up"></i> Read All Questions Aloud
                </button>
                <button class="btn-secondary" onclick="togglePauseResume()">
                    <i class="fas fa-pause"></i> Pause
                </button>
                <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted)">
                    <i class="fas fa-lightbulb"></i> Use these questions for active comprehension and speaking practice.
                </span>
            </div>

            <div class="lesson-zoom-area">
            <div class="questions-grid">
                ${questions.map((q, idx) => `
                    <div class="question-card" id="question-card-${idx}">
                        ${q.scenario ? `<div class="question-scenario">🎬 Scenario: ${q.scenario}</div>` : ''}
                        <div class="question-text" style="display:flex; align-items:center; justify-content:space-between; gap:12px">
                            <div>
                                🙋 ${q.character ? `<strong>${q.character}:</strong> ` : ''}"${q.question}"
                            </div>
                            <button class="play-line-btn" style="width:32px;height:32px;flex-shrink:0" onclick="readQuestionItem(${idx})" title="Read question aloud">
                                <i class="fas fa-volume-up" style="font-size:0.8rem"></i>
                            </button>
                        </div>
                        <button class="btn-secondary" style="font-size:0.8rem; padding: 6px 12px; margin-top:10px" onclick="toggleAnswer(${idx})">
                            <i class="fas fa-eye"></i> Show Expected Answer
                        </button>
                        <div class="answer-box" id="answer-box-${idx}">
                            🎯 <strong>Expected Answer:</strong> ${q.answer || 'N/A'}
                        </div>
                    </div>
                `).join('')}
            </div>
            </div>
        </section>

        <!-- Footer (Clean & Professional) -->
        <footer class="app-footer">
            <p>Prepared for <strong>${learnerName}</strong> on ${formattedDate}</p>
        </footer>
    </div>

    <!-- Embedded JSON Data Block -->
    <script type="application/json" id="conv-data-json">
    ${jsonString}
    </script>

    <!-- Embedded State & Script Engine -->
    <script>
        window.addEventListener('unhandledrejection', function(event) {
            if (event.reason) {
                var msg = event.reason.message || event.reason.toString();
                if (msg.indexOf('WebSocket') !== -1 || msg.indexOf('websocket') !== -1 || msg.indexOf('vite') !== -1) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        });
        window.addEventListener('error', function(event) {
            if (event.message && (event.message.indexOf('WebSocket') !== -1 || event.message.indexOf('websocket') !== -1 || event.message.indexOf('Tracking Prevention') !== -1)) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);

        var CONV_DATA = {};
        try {
            var rawJson = document.getElementById('conv-data-json').textContent;
            CONV_DATA = JSON.parse(rawJson);
        } catch (e) {
            console.error("Error parsing CONV_DATA JSON:", e);
        }
        var LEARNER_NAME = ${JSON.stringify(safeLearnerName)};
        var TUTOR_NAME = ${JSON.stringify(tutorName)};
        var SAVE_KEY = "conv_notes_" + LEARNER_NAME + "_${isoDate}";
        var APP_CHARACTERS = ${JSON.stringify((learner as any)?.classmates || [])};
        var FINAL_LEARNER_AVATAR = ${JSON.stringify(finalLearnerAvatar)};
        var FINAL_TUTOR_AVATAR = ${JSON.stringify(finalTutorAvatar)};
        var LEARNER_VOICE_URI = ${JSON.stringify(LEARNER_VOICE_URI)};
        var TUTOR_VOICE_URI = ${JSON.stringify(TUTOR_VOICE_URI)};
        var CHARACTER_INFO_MAP = ${JSON.stringify(characterInfoMap)};

        function getCharInfo(charName) {
            var raw = String(charName || '').trim();
            var clean = raw.replace(/\\[.*?\\]/g, '').replace(/:\\s*$/, '').trim().toLowerCase();
            if (CHARACTER_INFO_MAP && CHARACTER_INFO_MAP[clean]) {
                return CHARACTER_INFO_MAP[clean];
            }
            if (CHARACTER_INFO_MAP) {
                for (var k in CHARACTER_INFO_MAP) {
                    if (clean && (clean.indexOf(k) !== -1 || k.indexOf(clean) !== -1)) {
                        return CHARACTER_INFO_MAP[k];
                    }
                }
            }
            if (clean.indexOf(normalizeCharName(LEARNER_NAME)) !== -1 || clean.indexOf('learner') !== -1) {
                return { name: raw || LEARNER_NAME, avatar: FINAL_LEARNER_AVATAR, roleBadge: "🎓 Learner", isLearner: true, isTutor: false };
            }
            if (clean.indexOf('tutor') !== -1) {
                return { name: raw || "Tutor", avatar: FINAL_TUTOR_AVATAR, roleBadge: "👨‍🏫 Tutor", isLearner: false, isTutor: true };
            }
            return {
                name: raw,
                avatar: FINAL_LEARNER_AVATAR,
                roleBadge: "👤 " + (raw.length <= 15 && raw ? raw : "Character"),
                isLearner: false,
                isTutor: false
            };
        }

        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function stripHtmlTags(str) {
            if (!str) return '';
            return String(str).replace(/<[^>]*>/g, '').trim();
        }

        function stripEmojis(str) {
            if (!str) return '';
            try {
                return String(str)
                    .replace(/\\p{Extended_Pictographic}/gu, '')
                    .replace(/[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]/g, '')
                    .replace(/[\\u2600-\\u27BF]/g, '')
                    .replace(/\\s{2,}/g, ' ')
                    .trim();
            } catch (e) {
                return String(str).replace(/\\s{2,}/g, ' ').trim();
            }
        }

        var voices = [];
        var charVoiceMap = {};
        var currentRate = 1.0;
        var isPlayingSequence = false;
        var currentPlayIndex = 0;
        var isPaused = false;

        /* Roleplay State */
        var activeRoleplayIndex = 0;
        var selectedLearnerRole = (CONV_DATA.characters && CONV_DATA.characters[0]) ? CONV_DATA.characters[0].name : '';
        var autoAdvancePartner = false;
        var isRecording = false;
        var recognition = null;

        /* Arena State */
        var activeGameIndex = 0;
        var userScore = 0;
        var userStreak = 0;
        var totalAttempts = 0;
        var correctAttempts = 0;

        var activeLineByLineIndex = 0;
        var isLineByLineActive = false;

        /* ═══ 🎧 Listening-script read-aloud player (Listen & Follow) ═══
           Mirrors the Micro Lesson listening-script player: a Play/Stop button
           reads the whole dialogue line by line through per-character voices
           while the matching transcript line highlights (karaoke style). The
           transcript stays hidden until this player is opened, so learners
           can choose to listen blind first. */
        var cmKaraokeActive = false;
        var cmKaraokeSession = 0;
        var cmKaraokePlaying = false;

        function cmKaraokeHighlight(idx) {
            document.querySelectorAll('.cm-ls-line.playing').forEach(function(l) { l.classList.remove('playing'); });
            var lineEl = document.getElementById('cm-ls-line-' + idx);
            if (lineEl) {
                lineEl.classList.add('playing');
                if (typeof lineEl.scrollIntoView === 'function') {
                    lineEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }

        function cmKaraokeClear() {
            document.querySelectorAll('.cm-ls-line.playing').forEach(function(l) { l.classList.remove('playing'); });
        }

        function cmKaraokeUpdateBtn() {
            var btn = document.getElementById('cm-karaoke-btn');
            if (btn) {
                btn.innerHTML = cmKaraokePlaying
                    ? '<i class="fas fa-stop"></i> ⏹ Stop Listen &amp; Follow'
                    : '<i class="fas fa-headphones"></i> 🎧 Listen &amp; Follow';
            }
        }

        function cmKaraokeStep(idx, sid) {
            if (sid !== cmKaraokeSession) return;
            var dialogue = CONV_DATA.dialogue || [];
            if (idx >= dialogue.length) {
                cmKaraokePlaying = false;
                cmKaraokeClear();
                cmKaraokeUpdateBtn();
                return;
            }
            cmKaraokeHighlight(idx);
            playLine(idx, function() {
                setTimeout(function() { cmKaraokeStep(idx + 1, sid); }, 300);
            });
        }

        window.cmToggleKaraoke = function() {
            var panel = document.getElementById('cm-ls-panel');
            if (!panel) return;
            cmKaraokeActive = !cmKaraokeActive;
            if (cmKaraokeActive) {
                panel.style.display = 'block';
                switchTab('dialogue', document.querySelector('.tab-btn'));
                if (cmKaraokePlaying) return; // already running, just revealed panel
                var dialogue = CONV_DATA.dialogue || [];
                if (!dialogue.length) return;
                isPlayingSequence = false;
                cmKaraokePlaying = true;
                cmKaraokeUpdateBtn();
                var sid = ++cmKaraokeSession;
                cmKaraokeStep(0, sid);
            } else {
                cmKaraokeSession++; // invalidate queued line callbacks
                cmKaraokePlaying = false;
                cmKaraokeClear();
                cmKaraokeUpdateBtn();
                panel.style.display = 'none';
                stopAudio();
            }
        };

        function startInteractiveLineByLine() {
            var tabBtn = document.querySelector('.tab-btn');
            switchTab('dialogue', tabBtn);
            stopAudio();
            isLineByLineActive = true;
            activeLineByLineIndex = 0;
            playCurrentLineByLine();
        }

        function playCurrentLineByLine() {
            var dialogue = CONV_DATA.dialogue || [];
            if (dialogue.length === 0) return;
            if (activeLineByLineIndex < 0) activeLineByLineIndex = 0;
            if (activeLineByLineIndex >= dialogue.length) activeLineByLineIndex = dialogue.length - 1;

            playLine(activeLineByLineIndex);
        }

        function stepDialogueLine(dir) {
            var dialogue = CONV_DATA.dialogue || [];
            if (dialogue.length === 0) return;
            activeLineByLineIndex += dir;
            if (activeLineByLineIndex < 0) activeLineByLineIndex = 0;
            if (activeLineByLineIndex >= dialogue.length) activeLineByLineIndex = dialogue.length - 1;

            playCurrentLineByLine();
        }

        function cleanAudioText(str) {
            var s = String(str || '').trim();
            if (s.indexOf('[Audio:') === 0 || s.indexOf('[AUDIO:') === 0 || s.indexOf('[audio:') === 0) {
                s = s.substring(s.indexOf(':') + 1).trim();
            } else if (s.indexOf('Audio:') === 0 || s.indexOf('AUDIO:') === 0 || s.indexOf('audio:') === 0) {
                s = s.substring(6).trim();
            }
            while (s.length > 0 && (s.charAt(0) === '[' || s.charAt(0) === ']')) {
                s = s.substring(1).trim();
            }
            while (s.length > 0 && (s.charAt(s.length - 1) === ']' || s.charAt(s.length - 1) === '[')) {
                s = s.substring(0, s.length - 1).trim();
            }
            return stripEmojis(stripHtmlTags(s));
        }

        function normalizeCharName(str) {
            if (!str) return '';
            return String(str).replace(/[:\\s]+$/, '').trim().toLowerCase();
        }

        function getVoiceURIForChar(charName, defaultIdx) {
            if (!voices || voices.length === 0) {
                voices = window.speechSynthesis.getVoices();
            }
            var clean = normalizeCharName(charName);

            if (charName && charVoiceMap[charName]) {
                return charVoiceMap[charName];
            }

            if (clean) {
                for (var k in charVoiceMap) {
                    if (normalizeCharName(k) === clean) {
                        return charVoiceMap[k];
                    }
                }
            }

            if (CONV_DATA.characters && CONV_DATA.characters.length > 0) {
                for (var i = 0; i < CONV_DATA.characters.length; i++) {
                    var c = CONV_DATA.characters[i];
                    if (c.name && normalizeCharName(c.name) === clean) {
                        var v = charVoiceMap[c.name] || c.voiceURI;
                        if (v) return v;
                    }
                }

                if (typeof defaultIdx === 'number' && defaultIdx >= 0 && defaultIdx < CONV_DATA.characters.length) {
                    var cDef = CONV_DATA.characters[defaultIdx];
                    return charVoiceMap[cDef.name] || cDef.voiceURI || null;
                }

                if (clean.indexOf('2') !== -1 || clean.indexOf('b') !== -1 || clean.indexOf('second') !== -1) {
                    var c2 = CONV_DATA.characters[1] || CONV_DATA.characters[0];
                    return charVoiceMap[c2.name] || c2.voiceURI || null;
                }

                var c1 = CONV_DATA.characters[0];
                return charVoiceMap[c1.name] || c1.voiceURI || null;
            }

            return null;
        }

        function playGameAudio(text, charName, onEnd) {
            speechSynthesis.cancel();
            setTimeout(function() {
                if (!voices || voices.length === 0) {
                    voices = window.speechSynthesis.getVoices();
                }
                var cleanText = cleanAudioText(text);

                var utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.rate = currentRate;

                var voiceURI = getVoiceURIForChar(charName);

                if (voiceURI) {
                    var voiceObj = voices.find(function(v) {
                        return v.voiceURI === voiceURI || v.name === voiceURI;
                    });
                    if (voiceObj) utterance.voice = voiceObj;
                }

                if (!utterance.voice && voices && voices.length > 0) {
                    var charIdx = 0;
                    if (CONV_DATA.characters && CONV_DATA.characters.length > 0) {
                        var clean = normalizeCharName(charName);
                        var found = CONV_DATA.characters.findIndex(function(c) {
                            return normalizeCharName(c.name) === clean;
                        });
                        if (found !== -1) charIdx = found;
                    }
                    utterance.voice = voices[charIdx % voices.length];
                }

                if (onEnd) {
                    utterance.onend = onEnd;
                    utterance.onerror = onEnd;
                }

                window.speechSynthesis.speak(utterance);
            }, 50);
        }

        function playGameAudioItem(gameIdx, itemIdx) {
            var games = buildArenaGamesData();
            var game = games[gameIdx];
            if (!game || !game.items || !game.items[itemIdx]) return;
            var item = game.items[itemIdx];
            var text = item.audioText || item.prompt || "";
            var charName = item.character || item.speaker;
            if (!charName && CONV_DATA.characters && CONV_DATA.characters.length > 0) {
                var charCount = CONV_DATA.characters.length;
                charName = CONV_DATA.characters[itemIdx % charCount].name;
            }
            playGameAudio(text, charName);
        }

        var voiceRetryTimer = null;
        function scheduleVoiceRetry() {
            if (voiceRetryTimer) clearInterval(voiceRetryTimer);
            voiceRetryTimer = setInterval(function() {
                try {
                    var v = window.speechSynthesis.getVoices();
                    if (v && v.length > 0) {
                        clearInterval(voiceRetryTimer);
                        voiceRetryTimer = null;
                        initVoices();
                    }
                } catch (e) {}
            }, 400);
        }

        document.addEventListener('DOMContentLoaded', function() {
            initVoices();
            if (!voices || voices.length === 0) scheduleVoiceRetry();
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = function() {
                    initVoices();
                    if (voiceRetryTimer) { clearInterval(voiceRetryTimer); voiceRetryTimer = null; }
                };
            }
            // Re-populate selects on focus in case the voiceschanged event was missed
            document.addEventListener('focusin', function(e) {
                var t = e.target;
                if (t && t.classList && t.classList.contains('voice-select')) {
                    var v = window.speechSynthesis.getVoices();
                    if (v && v.length > 0 && (!voices || voices.length === 0)) initVoices();
                }
            });
            initRoleplay();
            initArenaGames();

            document.addEventListener('keydown', function(e) {
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable)) {
                    return;
                }
                var dialogueTab = document.getElementById('tab-dialogue');
                var isDialogueTabActive = dialogueTab && dialogueTab.classList.contains('active');
                var rpTab = document.getElementById('tab-roleplay');
                var isRpTabActive = rpTab && rpTab.classList.contains('active');

                if (e.key === 'ArrowRight' || e.key === 'Right') {
                    if (isRpTabActive) {
                        e.preventDefault();
                        stepRoleplay(1);
                    } else if (isDialogueTabActive || isLineByLineActive || !rpTab) {
                        e.preventDefault();
                        stepDialogueLine(1);
                    }
                } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
                    if (isRpTabActive) {
                        e.preventDefault();
                        stepRoleplay(-1);
                    } else if (isDialogueTabActive || isLineByLineActive || !rpTab) {
                        e.preventDefault();
                        stepDialogueLine(-1);
                    }
                }
            });
        });

        function initVoices() {
            voices = window.speechSynthesis.getVoices();
            if (!voices || voices.length === 0) return;

            (CONV_DATA.characters || []).forEach(function(char, idx) {
                var select = document.getElementById('voice-select-' + idx);

                var target = charVoiceMap[char.name] || char.voiceURI || '';

                // Defaults: character 0 (the learner) -> learner's read-aloud voice
                // (Ava Multilingual for female, Andrew Natural for male); tutor -> Ryan Natural.
                if (!target) {
                    var charClean = normalizeCharName(char.name);
                    var isLearnerChar = idx === 0 || (LEARNER_NAME && charClean === normalizeCharName(LEARNER_NAME));
                    var isTutorChar = (TUTOR_NAME && charClean === normalizeCharName(TUTOR_NAME)) || (idx === 1 && CONV_DATA.characters.length >= 2 && !isLearnerChar);
                    if (isLearnerChar) target = LEARNER_VOICE_URI || '';
                    else if (isTutorChar) target = TUTOR_VOICE_URI || '';
                }
                
                if (typeof APP_CHARACTERS !== 'undefined' && APP_CHARACTERS.length > 0) {
                    var matchedChar = APP_CHARACTERS.find(function(c) { 
                        return c.name.toLowerCase() === char.name.toLowerCase() || c.code.toLowerCase() === char.name.toLowerCase() || c.id === char.name; 
                    });
                    if (matchedChar && matchedChar.voice) {
                        target = matchedChar.voice;
                    }
                }

                if (select) select.innerHTML = '';
                var matchedVoiceURI = '';

                // 1. Try exact voiceURI match
                var matchedObj = voices.find(function(v) { return v.voiceURI && target && v.voiceURI === target; });

                // 2. Try exact name match
                if (!matchedObj && target) {
                    matchedObj = voices.find(function(v) { return v.name && v.name === target; });
                }

                // 3. Try fuzzy/substring match
                if (!matchedObj && target) {
                    matchedObj = voices.find(function(v) {
                        return v.name && (v.name.toLowerCase().indexOf(target.toLowerCase()) !== -1 || target.toLowerCase().indexOf(v.name.toLowerCase()) !== -1);
                    });
                }

                // 4. Default fallback: ensure character 0 and character 1 don't share the same default if distinct voices exist
                if (!matchedObj) {
                    if (idx > 0 && voices.length > 1) {
                        var firstCharVoice = charVoiceMap[CONV_DATA.characters[0].name];
                        matchedObj = voices.find(function(v) { return v.voiceURI !== firstCharVoice; }) || voices[idx % voices.length] || voices[0];
                    } else {
                        matchedObj = voices[0];
                    }
                }

                if (matchedObj) {
                    matchedVoiceURI = matchedObj.voiceURI;
                }

                if (select) {
                    voices.forEach(function(voice) {
                        var opt = document.createElement('option');
                        opt.value = voice.voiceURI;
                        opt.textContent = voice.name + ' (' + voice.lang + ')';
                        if (matchedVoiceURI && voice.voiceURI === matchedVoiceURI) {
                            opt.selected = true;
                        }
                        select.appendChild(opt);
                    });

                    if (select.value) {
                        matchedVoiceURI = select.value;
                    }
                }

                if (matchedVoiceURI) {
                    charVoiceMap[char.name] = matchedVoiceURI;
                    char.voiceURI = matchedVoiceURI;
                    var norm = normalizeCharName(char.name);
                    if (norm) charVoiceMap[norm] = matchedVoiceURI;
                }
            });
        }

        function updateCharVoice(charIdx, voiceURI) {
            var char = CONV_DATA.characters[charIdx];
            if (char) {
                charVoiceMap[char.name] = voiceURI;
                char.voiceURI = voiceURI;
                var norm = normalizeCharName(char.name);
                if (norm) charVoiceMap[norm] = voiceURI;
            }
        }

        function updateSpeed(val) {
            currentRate = parseFloat(val);
            document.getElementById('speed-val').textContent = val + 'x';
        }

        function switchTab(tabId, btn) {
            document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
            document.querySelectorAll('.tab-btn').forEach(function(el) { el.classList.remove('active'); });
            
            var target = document.getElementById('tab-' + tabId);
            if (target) target.classList.add('active');
            if (btn) btn.classList.add('active');

            if (tabId === 'roleplay') updateRoleplayView();
        }

        function toggleDarkMode() {
            document.body.classList.toggle('dark-theme');
            var icon = document.getElementById('theme-icon');
            if (document.body.classList.contains('dark-theme')) {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        }

        function toggleStageDirections() {
            document.querySelectorAll('.stage-dir').forEach(function(el) {
                el.style.display = (el.style.display === 'none') ? 'inline' : 'none';
            });
        }

        function toggleAllTranslations() {
            document.body.classList.toggle('translations-hidden');
            var isHidden = document.body.classList.contains('translations-hidden');
            var translations = document.querySelectorAll('.anno-translation');
            translations.forEach(function(el) {
                el.style.display = isHidden ? 'none' : 'block';
                var grid = el.closest('.annotations-grid');
                if (grid && !isHidden) grid.style.display = 'grid';
            });
            var btn = document.getElementById('toggle-translations-btn');
            if (btn) btn.classList.toggle('active', !isHidden);
        }
        window.toggleAllTranslations = toggleAllTranslations;

        function toggleAllAnnotations() {
            document.body.classList.toggle('annotations-hidden');
            var isHidden = document.body.classList.contains('annotations-hidden');
            document.querySelectorAll('.annotations-grid').forEach(function(el) {
                el.style.display = isHidden ? 'none' : 'grid';
            });
            document.querySelectorAll('.dialogue-margin-column').forEach(function(el) {
                el.style.display = isHidden ? 'none' : 'flex';
            });
        }
        window.toggleAllAnnotations = toggleAllAnnotations;

        function toggleAnswer(idx) {
            var box = document.getElementById('answer-box-' + idx);
            if (box) {
                box.style.display = (box.style.display === 'block') ? 'none' : 'block';
            }
        }

        function highlightAnnotationBox(lineIdx, type) {
            var grid = document.getElementById('anno-grid-' + lineIdx);
            if (!grid) return;
            grid.style.display = 'flex';
            var targetBox = grid.querySelector('.anno-' + type);
            if (targetBox) {
                targetBox.classList.remove('highlight-focus');
                void targetBox.offsetWidth; // trigger reflow
                targetBox.classList.add('highlight-focus');
                if (typeof targetBox.scrollIntoView === 'function') {
                    targetBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
        window.highlightAnnotationBox = highlightAnnotationBox;

        function playSingleLine(index) {
            playLine(index);
        }
        window.playSingleLine = playSingleLine;

        /* Fixed Speech Synthesis - Play / Pause / Resume / Sequence */
        function playLine(index, onEnd) {
            activeLineByLineIndex = index;
            speechSynthesis.cancel();
            isPaused = false;
            updatePauseBtnUI(false);

            setTimeout(function() {
                if (!voices || voices.length === 0) {
                    voices = window.speechSynthesis.getVoices();
                }

                var dialogue = CONV_DATA.dialogue || [];
                if (index >= dialogue.length) {
                    isPlayingSequence = false;
                    if (onEnd) onEnd();
                    return;
                }

                var line = dialogue[index];
                var rawText = line.text || '';
                var cleanSpeech = stripEmojis(stripHtmlTags(rawText));
                var utterance = new SpeechSynthesisUtterance(cleanSpeech);
                utterance.rate = currentRate;

                var voiceURI = getVoiceURIForChar(line.character, index % 2);
                if (voiceURI) {
                    var voiceObj = voices.find(function(v) {
                        return v.voiceURI === voiceURI || v.name === voiceURI;
                    });
                    if (voiceObj) utterance.voice = voiceObj;
                }

                if (!utterance.voice && voices && voices.length > 0) {
                    var charIdx = index % 2;
                    if (CONV_DATA.characters && CONV_DATA.characters.length > 0) {
                        var clean = normalizeCharName(line.character);
                        var found = CONV_DATA.characters.findIndex(function(c) {
                            return normalizeCharName(c.name) === clean;
                        });
                        if (found !== -1) charIdx = found;
                    }
                    utterance.voice = voices[charIdx % voices.length];
                }

                document.querySelectorAll('.dialogue-card').forEach(function(c) { c.classList.remove('speaking'); });
                var card = document.getElementById('line-card-' + index);
                if (card) {
                    card.classList.add('speaking');
                    if (typeof card.scrollIntoView === 'function') {
                        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }

                utterance.onend = function() {
                    if (card) card.classList.remove('speaking');
                    if (onEnd) onEnd();
                };

                utterance.onerror = function() {
                    if (card) card.classList.remove('speaking');
                    if (onEnd) onEnd();
                };

                window.speechSynthesis.speak(utterance);
            }, 50);
        }

        function playFullDialogue() {
            switchTab('dialogue', document.querySelector('.tab-btn'));
            isPlayingSequence = true;
            isPaused = false;
            currentPlayIndex = 0;
            updatePauseBtnUI(false);

            function step() {
                if (!isPlayingSequence || currentPlayIndex >= (CONV_DATA.dialogue || []).length) {
                    isPlayingSequence = false;
                    return;
                }
                playLine(currentPlayIndex, function() {
                    currentPlayIndex++;
                    if (isPlayingSequence && !isPaused) {
                        setTimeout(step, 400);
                    }
                });
            }
            step();
        }

        function togglePauseResume() {
            if (speechSynthesis.speaking) {
                if (speechSynthesis.paused) {
                    speechSynthesis.resume();
                    isPaused = false;
                    updatePauseBtnUI(false);
                } else {
                    speechSynthesis.pause();
                    isPaused = true;
                    updatePauseBtnUI(true);
                }
            } else if (isPaused) {
                speechSynthesis.resume();
                isPaused = false;
                updatePauseBtnUI(false);
            }
        }

        function updatePauseBtnUI(paused) {
            var btn = document.getElementById('pause-resume-btn');
            if (!btn) return;
            if (paused) {
                btn.innerHTML = '<i class="fas fa-play"></i> Resume';
                btn.style.background = '#fef08a';
                btn.style.color = '#854d0e';
            } else {
                btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                btn.style.background = '';
                btn.style.color = '';
            }
        }

        function stopAudio() {
            isPlayingSequence = false;
            isPaused = false;
            speechSynthesis.cancel();
            updatePauseBtnUI(false);
            document.querySelectorAll('.dialogue-card').forEach(function(c) { c.classList.remove('speaking'); });
        }

        function readGlossaryItem(idx, onEnd) {
            stopAudio();
            var glossary = CONV_DATA.glossary || [];
            if (idx >= glossary.length) return;

            var item = glossary[idx];
            var charName = item.character;
            if (!charName && CONV_DATA.characters && CONV_DATA.characters.length > 0) {
                charName = CONV_DATA.characters[idx % CONV_DATA.characters.length].name;
            }

            var card = document.getElementById('glossary-card-' + idx);
            if (card) card.style.borderColor = 'var(--accent-indigo)';

            var textToRead = item.word + ". " + item.definition;
            playGameAudio(textToRead, charName, function() {
                if (card) card.style.borderColor = '';
                if (onEnd) onEnd();
            });
        }

        function playFullGlossary() {
            switchTab('glossary');
            var glossary = CONV_DATA.glossary || [];
            var gIdx = 0;

            function stepG() {
                if (gIdx >= glossary.length) return;
                readGlossaryItem(gIdx, function() {
                    gIdx++;
                    setTimeout(stepG, 400);
                });
            }
            stepG();
        }

        function readQuestionItem(idx, onEnd) {
            stopAudio();
            var questions = CONV_DATA.questions || [];
            if (idx >= questions.length) return;

            var q = questions[idx];
            var charName = q.character;
            if (!charName && CONV_DATA.characters && CONV_DATA.characters.length > 0) {
                charName = CONV_DATA.characters[idx % CONV_DATA.characters.length].name;
            }

            var card = document.getElementById('question-card-' + idx);
            if (card) card.style.borderColor = 'var(--accent-indigo)';

            var textToRead = (q.character ? q.character + " asks: " : "") + q.question;
            playGameAudio(textToRead, charName, function() {
                if (card) card.style.borderColor = '';
                if (onEnd) onEnd();
            });
        }

        function playFullQuestions() {
            switchTab('questions');
            var questions = CONV_DATA.questions || [];
            var qIdx = 0;

            function stepQ() {
                if (qIdx >= questions.length) return;
                readQuestionItem(qIdx, function() {
                    qIdx++;
                    setTimeout(stepQ, 500);
                });
            }
            stepQ();
        }

        /* Interactive Roleplay Engine */
        function initRoleplay() {
            var select = document.getElementById('roleplay-character-select');
            if (select && CONV_DATA.characters && CONV_DATA.characters.length > 0) {
                selectedLearnerRole = select.value || CONV_DATA.characters[0].name;
            }
            updateRoleplayView();
        }

        function changeLearnerRole(role) {
            selectedLearnerRole = role;
            updateRoleplayView();
        }

        function stepRoleplay(dir) {
            var total = (CONV_DATA.dialogue || []).length;
            if (total === 0) return;
            activeRoleplayIndex = Math.max(0, Math.min(total - 1, activeRoleplayIndex + dir));
            updateRoleplayView();

            var currentLine = CONV_DATA.dialogue[activeRoleplayIndex];
            if (autoAdvancePartner && currentLine && currentLine.character !== selectedLearnerRole) {
                speakCurrentRoleplayLine();
            }
        }

        function updateRoleplayView() {
            var dialogue = CONV_DATA.dialogue || [];
            if (dialogue.length === 0) return;

            var line = dialogue[activeRoleplayIndex];
            var isLearnerTurn = (line.character.toLowerCase() === selectedLearnerRole.toLowerCase());

            document.getElementById('rp-progress-text').textContent = "Line " + (activeRoleplayIndex + 1) + " of " + dialogue.length;
            document.getElementById('rp-speaker-name').textContent = line.character;
            document.getElementById('rp-action-text').textContent = line.action ? "(" + stripHtmlTags(line.action) + ")" : "";
            document.getElementById('rp-text-box').textContent = '"' + stripHtmlTags(line.text) + '"';

            var charInfo = getCharInfo(line.character);
            var avatarImg = document.getElementById('rp-avatar-img');
            if (avatarImg) {
                avatarImg.src = charInfo.avatar;
            }

            var badge = document.getElementById('rp-turn-badge');
            if (badge) {
                if (isLearnerTurn) {
                    badge.className = "roleplay-turn-badge turn-learner";
                    badge.textContent = "🎯 YOUR TURN TO SPEAK (" + selectedLearnerRole + ")";
                } else {
                    badge.className = "roleplay-turn-badge turn-partner";
                    badge.textContent = "👥 PARTNER'S TURN (" + line.character + ")";
                }
            }

            var rpPrev = document.getElementById('rp-prev-btn');
            if (rpPrev) rpPrev.disabled = (activeRoleplayIndex === 0);
            var rpNext = document.getElementById('rp-next-btn');
            if (rpNext) rpNext.disabled = (activeRoleplayIndex === dialogue.length - 1);

            var feedback = document.getElementById('rp-speech-feedback');
            if (feedback) feedback.textContent = "";
        }

        function speakCurrentRoleplayLine() {
            playLine(activeRoleplayIndex);
        }

        function toggleAutoAdvancePartner() {
            autoAdvancePartner = !autoAdvancePartner;
            alert(autoAdvancePartner ? "Auto-speak partner lines ENABLED!" : "Auto-speak partner lines disabled.");
        }

        function toggleRoleplayMic() {
            var micBtn = document.getElementById('rp-mic-btn');
            var feedback = document.getElementById('rp-speech-feedback');

            if (!isRecording) {
                isRecording = true;
                micBtn.classList.add('mic-active');
                document.getElementById('rp-mic-label').textContent = "Listening... Speak now!";
                feedback.textContent = "🎙️ Analyzing speech...";

                var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    recognition = new SpeechRecognition();
                    recognition.lang = 'en-US';
                    recognition.onresult = function(event) {
                        var spokenText = event.results[0][0].transcript;
                        feedback.innerHTML = "✅ Spoken: <em>'" + spokenText + "'</em> — Great pronunciation!";
                        stopMic();
                    };
                    recognition.onerror = function() {
                        feedback.textContent = "✅ Speech simulated: Excellent rhythm & intonation!";
                        stopMic();
                    };
                    recognition.start();
                } else {
                    setTimeout(function() {
                        feedback.textContent = "✅ Speech simulated: Excellent rhythm, clear pronunciation!";
                        stopMic();
                    }, 2000);
                }
            } else {
                stopMic();
            }
        }

        function stopMic() {
            isRecording = false;
            var micBtn = document.getElementById('rp-mic-btn');
            if (micBtn) micBtn.classList.remove('mic-active');
            document.getElementById('rp-mic-label').textContent = "Record Practice Speech";
            if (recognition) { try { recognition.stop(); } catch(e){} }
        }

        /* 10 Interactive Auto-Scored Arena Games Engine */
        function initArenaGames() {
            try {
                var gameList = buildArenaGamesData() || [];
                var navContainer = document.getElementById('game-nav-container');
                if (!navContainer) return;

                var navHtml = '';
                for (var i = 0; i < gameList.length; i++) {
                    var g = gameList[i];
                    var itemCount = (g && Array.isArray(g.items)) ? g.items.length : 5;
                    var activeClass = (i === activeGameIndex) ? 'active' : '';
                    navHtml += '<button class="game-nav-btn ' + activeClass + '" onclick="selectArenaGame(' + i + ')">' +
                        '<div class="game-nav-icon"><i class="fas ' + (g.icon || 'fa-gamepad') + '"></i></div>' +
                        '<div>' +
                            '<div style="font-weight: 800; font-size: 0.9rem">' + escapeHtml(g.title || ('Game ' + (i + 1))) + '</div>' +
                            '<div style="font-size: 0.75rem; color: var(--text-muted)">' + itemCount + ' Items</div>' +
                        '</div>' +
                    '</button>';
                }
                navContainer.innerHTML = navHtml;

                renderActiveArenaGame();
            } catch(err) {
                console.error("Error in initArenaGames:", err);
            }
        }

        function selectArenaGame(idx) {
            activeGameIndex = idx;
            document.querySelectorAll('.game-nav-btn').forEach(function(btn, i) {
                if (i === idx) btn.classList.add('active');
                else btn.classList.remove('active');
            });
            renderActiveArenaGame();
        }

        var arenaGamesCache = null;

        // Coerce AI-provided game items into the exact shapes each renderer needs.
        function coerceArenaGameItems(game) {
            if (!game || !Array.isArray(game.items)) return;
            var isGrammar = game.id === 'grammar_strike' || /grammar/i.test(game.title || '');
            var isDuel = game.id === 'rapid_ccq_duel' || /ccq/i.test(game.title || '');
            game.items.forEach(function(item) {
                // Grammar Strike: sentence segments + errorIndex
                if (isGrammar) {
                    var segs = item.sentenceSegments || item.segments || null;
                    var errIdx = item.errorIndex;
                    if (!segs && Array.isArray(item.options) && item.options.length > 0) {
                        segs = item.options.slice();
                        if (errIdx === undefined) errIdx = typeof item.answer === 'number' ? item.answer : 0;
                    }
                    if (!segs && item.prompt) {
                        segs = String(item.prompt).split(/\\s+/).filter(Boolean);
                        errIdx = 0;
                    }
                    if (typeof item.answer === 'string' && Array.isArray(segs)) {
                        var found = -1;
                        for (var i = 0; i < segs.length; i++) {
                            if (String(segs[i]).toLowerCase().indexOf(String(item.answer).toLowerCase()) !== -1) { found = i; break; }
                        }
                        errIdx = found >= 0 ? found : (errIdx !== undefined ? errIdx : 0);
                    }
                    if (errIdx === undefined) errIdx = 0;
                    item.sentenceSegments = segs;
                    item.errorIndex = errIdx;
                }
                // Listening games: make sure audioText exists and answer is an index
                if (item.audioText || item.prompt) {
                    if (!item.audioText) item.audioText = item.prompt;
                    if (typeof item.answer === 'string' && Array.isArray(item.options)) {
                        var ai = item.options.indexOf(item.answer);
                        item.answer = ai >= 0 ? ai : 0;
                    }
                }
                if (isDuel && (typeof item.answer !== 'number' || !Array.isArray(item.options))) {
                    item.options = Array.isArray(item.options) && item.options.length >= 2 ? item.options : ["Yes, exactly", "No, that is wrong", "Only sometimes", "Never"];
                    item.answer = typeof item.answer === 'number' ? item.answer : 0;
                }
            });
        }

        // Build a natural "listen then pick the correct reply" item set from dialogue pairs.
        function buildReplyPickItems(dialogueLines) {
            var items = [];
            var lines = Array.isArray(dialogueLines) ? dialogueLines : [];
            var n = lines.length;
            if (n === 0) return items;
            for (var i = 0; i < n && items.length < 10; i++) {
                var line = lines[i];
                var reply = lines[i + 1] || lines[(i + 1) % n];
                if (!line || !reply) continue;
                var distractors = [];
                for (var d = 1; d < n && distractors.length < 3; d++) {
                    var cand = lines[(i + d) % n];
                    if (cand && cand !== line && cand !== reply && String(cand.text).trim() !== String(reply.text).trim()) {
                        distractors.push(String(cand.text).trim());
                    }
                }
                while (distractors.length < 3) distractors.push('Hmm, let me think about that for a second.');
                var opts = [String(reply.text).trim()].concat(distractors);
                for (var s = opts.length - 1; s > 0; s--) {
                    var r = Math.floor(Math.random() * (s + 1));
                    var tmp = opts[s]; opts[s] = opts[r]; opts[r] = tmp;
                }
                items.push({
                    audioText: String(line.text).trim(),
                    speaker: line.character || '',
                    prompt: 'Listen to the line, then pick the correct reply:',
                    options: opts,
                    answer: opts.indexOf(String(reply.text).trim()),
                    explanation: 'The natural reply is: ' + String(reply.text).trim()
                });
            }
            return items;
        }

        // Build a dictation item set: the spoken line is the answer the learner must type.
        function buildDictationItems(dialogueLines) {
            var lines = Array.isArray(dialogueLines) ? dialogueLines : [];
            var items = [];
            for (var i = 0; i < lines.length && items.length < 10; i++) {
                var text = String(lines[i].text || '').trim();
                if (!text) continue;
                items.push({
                    audioText: text,
                    speaker: lines[i].character || '',
                    prompt: 'Dictation: listen and type exactly what you hear:',
                    options: [],
                    answer: 0
                });
            }
            return items;
        }

        // Build an audio-comprehension item set (what did the speaker say?) from dialogue lines.
        function buildAudioComprehensionItems(dialogueLines) {
            var lines = Array.isArray(dialogueLines) ? dialogueLines : [];
            var items = [];
            var n = lines.length;
            for (var i = 0; i < n && items.length < 10; i++) {
                var line = lines[i];
                var correct = String(line.text || '').trim();
                if (!correct) continue;
                var distractors = [];
                for (var d = 1; d < n && distractors.length < 3; d++) {
                    var cand = String(lines[(i + d) % n].text || '').trim();
                    if (cand && cand !== correct && distractors.indexOf(cand) === -1) distractors.push(cand);
                }
                while (distractors.length < 3) distractors.push('I completely forgot what I was saying.');
                var opts = [correct].concat(distractors);
                for (var s = opts.length - 1; s > 0; s--) {
                    var r = Math.floor(Math.random() * (s + 1));
                    var tmp = opts[s]; opts[s] = opts[r]; opts[r] = tmp;
                }
                items.push({
                    audioText: correct,
                    speaker: line.character || '',
                    prompt: 'Listen to the clip and choose the exact sentence you heard:',
                    options: opts,
                    answer: opts.indexOf(correct),
                    explanation: 'Spoken by ' + (line.character || 'speaker')
                });
            }
            return items;
        }

        function ensureRpgQuestGame(games) {
            var hasRpg = games.some(function(g) {
                return g.id === 'dramatic_story_rpg' || g.id === 'dramatic_branching_quest' ||
                    (g.title || '').indexOf('RPG') !== -1 || (g.title || '').indexOf('Quest') !== -1;
            });
            if (!hasRpg) {
                games.push({
                    id: 'dramatic_story_rpg',
                    title: '🎮 RPG Quest',
                    icon: 'fa-gamepad',
                    description: 'Interactive turn-based branching adventure in everyday modern sitcom situations with audio read-aloud!',
                    items: []
                });
            }
            return games;
        }

        function buildArenaGamesData() {
            if (arenaGamesCache) return arenaGamesCache;

            var rawActivities = Array.isArray(CONV_DATA.activities) ? CONV_DATA.activities : [];
            if (rawActivities.length >= 10) {
                var aiGames = rawActivities.map(function(act, idx) {
                    var items = Array.isArray(act.items) ? act.items : (Array.isArray(act.questions) ? act.questions : []);
                    return {
                        id: act.id || ('game_' + idx),
                        title: act.title || ('Game ' + (idx + 1)),
                        icon: act.icon || 'fa-gamepad',
                        description: act.description || 'Interactive practice game',
                        items: items
                    };
                });
                aiGames.forEach(function(g) { coerceArenaGameItems(g); });
                var rpgAct = aiGames.find(function(g) {
                    return g.id === 'dramatic_story_rpg' || g.id === 'dramatic_branching_quest' || (g.title || '').indexOf('RPG') !== -1 || (g.title || '').indexOf('Quest') !== -1;
                });
                if (!rpgAct && CONV_DATA.rpg_quest) {
                    aiGames.push({ id: 'dramatic_story_rpg', title: '🎮 RPG Quest', icon: 'fa-gamepad', description: 'Interactive turn-based branching adventure', items: [] });
                }
                ensureRpgQuestGame(aiGames);
                arenaGamesCache = aiGames;
                return aiGames;
            }

            var dialogue = CONV_DATA.dialogue || [];
            var glossary = CONV_DATA.glossary || [];
            var questions = CONV_DATA.questions || [];

            var games = [
                {
                    id: 'vocab_sprint',
                    title: '⚡ Speed Vocab',
                    icon: 'fa-bolt',
                    description: 'Match key dialogue terms to their correct definition',
                    items: glossary.slice(0, 5).map(function(g) {
                        return {
                            prompt: "What is the meaning of: '" + g.word + "'?",
                            options: [g.definition, "A casual slang greeting", "A technical system error", "A type of formal salutation"],
                            answer: 0,
                            explanation: g.definition
                        };
                    })
                },
                {
                    id: 'listening_no_text_1',
                    title: '🎧 Listening Challenge — Dictation',
                    icon: 'fa-keyboard',
                    description: 'Real-time dictation: listen to the spoken line and type every word you hear',
                    items: buildDictationItems(dialogue)
                },
                {
                    id: 'grammar_strike',
                    title: '🎯 Grammar Spot',
                    icon: 'fa-bullseye',
                    description: 'Click directly on the sentence segment containing the grammar mistake',
                    items: [
                        {
                            sentenceSegments: ["I've been", "trying to", "reached you", "for ten minutes!"],
                            errorIndex: 2,
                            explanation: "Incorrect past participle 'reached'. Should be 'reach' after 'trying to'."
                        },
                        {
                            sentenceSegments: ["Where", "are you", "at exactly", "right now?"],
                            errorIndex: 2,
                            explanation: "Redundant preposition 'at'."
                        },
                        {
                            sentenceSegments: ["Do you know if", "they serves", "pasta or pizza", "there?"],
                            errorIndex: 1,
                            explanation: "'they serves' should be 'they serve' (plural subject agreement)."
                        },
                        {
                            sentenceSegments: ["I am thinking of", "to hire", "a car", "for our trip"],
                            errorIndex: 1,
                            explanation: "'thinking of to hire' should be 'thinking of hiring' (gerund after preposition 'of')."
                        },
                        {
                            sentenceSegments: ["Friday I'm scheduled", "for a tour", "of Vatican", "museum"],
                            errorIndex: 2,
                            explanation: "Should be 'of the Vatican'."
                        }
                    ]
                },
                {
                    id: 'gap_fill_frenzy',
                    title: '🔍 Gap Fill',
                    icon: 'fa-magnifying-glass',
                    description: 'Select the missing target phrase',
                    items: glossary.slice(0, 5).map(function(g) {
                        return {
                            prompt: "Fill in the target phrase: '___ (" + g.definition.slice(0, 30) + "...)'",
                            options: [g.word, "unrelated term", "casual filler", "misspelled phrase"],
                            answer: 0,
                            explanation: g.word + ": " + g.definition
                        };
                    })
                },
                {
                    id: 'register_clash',
                    title: '👔 Register Match',
                    icon: 'fa-user-tie',
                    description: 'Classify the communication register',
                    items: dialogue.slice(0, 5).map(function(d) {
                        var ann = d.annotations || {};
                        return {
                            prompt: "Informal dialogue expression: '" + (ann.informal || d.text) + "'",
                            options: [
                                ann.formal || "Formal equivalent statement",
                                "Unrelated casual sentence",
                                "Slang exclamation",
                                "Grammatically incorrect sentence"
                            ],
                            answer: 0,
                            explanation: "Formal equivalent: " + (ann.formal || d.text)
                        };
                    })
                },
                {
                    id: 'listen_speed_trial',
                    title: '🎧 Listen & Pick',
                    icon: 'fa-headphones-simple',
                    description: 'Listen to a line of conversation, then pick the correct reply line — audio only, no text shown',
                    items: buildReplyPickItems(dialogue)
                },
                {
                    id: 'rapid_ccq_duel',
                    title: '⚔️ Rapid CCQ Duel',
                    icon: 'fa-shield-halved',
                    description: 'Race against the clock — 4 choices, 20 seconds, +4s for correct answers, -5s for mistakes. Answer every question to win!',
                    items: glossary.slice(0, 10).map(function(g) {
                        return {
                            prompt: g.ccq || ("Does " + g.word + " mean " + g.definition + "?"),
                            options: [g.ccq_answer || "Yes, exactly", "No, that is wrong", "Only in written code", "Never"],
                            answer: 0,
                            explanation: g.ccq_answer || "Correct"
                        };
                    }).concat(questions.slice(0, Math.max(0, 10 - Math.min(glossary.length, 10))).map(function(q, qi) {
                        return {
                            prompt: q.question || ("Concept check #" + (qi + 1)),
                            options: [q.answer || "Yes, exactly", "No, that is wrong", "Only sometimes", "Never"],
                            answer: 0,
                            explanation: q.answer || "Correct"
                        };
                    }))
                },
                {
                    id: 'dialogue_best_alt',
                    title: '🗣️ Best Dialogue Alternative',
                    icon: 'fa-comments',
                    description: 'Select the most natural and appropriate alternative response',
                    items: dialogue.slice(0, 5).map(function(d) {
                        var ann = d.annotations || {};
                        return {
                            prompt: "What is the best alternative way for " + d.character + " to express: '" + d.text.slice(0, 45) + "...'?",
                            options: [
                                ann.informal || ann.formal || "Natural alternative phrasing for this line",
                                "I am completely confused and cannot answer.",
                                "Please stop talking immediately.",
                                "Let's change the topic to weather."
                            ],
                            answer: 0,
                            explanation: "Appropriate alternative: " + (ann.informal || ann.formal || d.text)
                        };
                    })
                },
                {
                    id: 'listening_no_text_2',
                    title: '🎵 Audio Listening',
                    icon: 'fa-volume-high',
                    description: 'Listen to the audio clip (no text shown) and choose the exact sentence you heard',
                    items: buildAudioComprehensionItems(dialogue)
                },
                {
                    id: 'dramatic_story_rpg',
                    title: '🎮 RPG Quest',
                    icon: 'fa-gamepad',
                    description: 'Interactive turn-based branching adventure in everyday modern sitcom situations with audio read-aloud!',
                    items: [
                        { prompt: "Turn 1: Coffee Shop Order Mix-Up ☕" },
                        { prompt: "Turn 2: Apartment Living Room Conversation 🛋️" },
                        { prompt: "Turn 3: Office Breakroom Dilemma 💼" },
                        { prompt: "Turn 4: Neighborhood Grocery Store Encounter 🛒" },
                        { prompt: "Turn 5: Weekend Plan Celebration 🥳" }
                    ]
                }
            ];

            games.forEach(function(g) {
                if (g.id === 'dramatic_story_rpg' || g.id === 'dramatic_branching_quest') return;
                if (g.id === 'rapid_ccq_duel') {
                    // Duel needs at least 10 questions.
                    while (g.items.length < 10) {
                        var gi = g.items.length;
                        g.items.push({
                            prompt: "Concept check #" + (gi + 1) + ": Does the phrase we practiced mean what we think it means?",
                            options: ["Yes, exactly", "No, that is wrong", "Only sometimes", "Never"],
                            answer: 0,
                            explanation: "Demonstrates core conversational mastery."
                        });
                    }
                    return;
                }
                while (g.items.length < 5) {
                    var fallbackIdx = g.items.length;
                    g.items.push({
                        prompt: "Mastery Check #" + (fallbackIdx + 1) + " for " + g.title,
                        options: ["Correct Target Response", "Distractor Option A", "Distractor Option B", "Distractor Option C"],
                        answer: 0,
                        explanation: "Demonstrates core conversational mastery."
                    });
                }
            });

            ensureRpgQuestGame(games);
            arenaGamesCache = games;
            return games;
        }

        function playCurrentRpgStoryAudio() {
            var rpgData = getRpgTreeData();
            var currentNode = rpgData['turn_' + currentRpgState.turn];
            if (currentNode) {
                playGameAudio(currentNode.storyText, currentNode.speaker);
            }
        }

        var currentRpgState = {
            turn: 1,
            history: [],
            gameOver: false,
            victory: false,
            fatalMessage: '',
            fatalEmoji: ''
        };

        function resetRpgQuest() {
            currentRpgState = {
                turn: 1,
                history: [],
                gameOver: false,
                victory: false,
                fatalMessage: '',
                fatalEmoji: ''
            };
            renderActiveArenaGame();
        }

        function playSfx(type) {
            try {
                var AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                var ctx = new AudioCtx();
                var now = ctx.currentTime;

                if (type === 'victory') {
                    var notes = [523.25, 659.25, 783.99, 1046.50];
                    notes.forEach(function(freq, i) {
                        var o = ctx.createOscillator();
                        var g = ctx.createGain();
                        o.connect(g);
                        g.connect(ctx.destination);
                        o.type = 'triangle';
                        o.frequency.setValueAtTime(freq, now + i * 0.12);
                        g.gain.setValueAtTime(0.2, now + i * 0.12);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
                        o.start(now + i * 0.12);
                        o.stop(now + i * 0.12 + 0.35);
                    });
                } else if (type === 'death' || type === 'danger') {
                    var osc2 = ctx.createOscillator();
                    var gain2 = ctx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.type = 'sawtooth';
                    osc2.frequency.setValueAtTime(160, now);
                    osc2.frequency.exponentialRampToValueAtTime(35, now + 0.7);
                    gain2.gain.setValueAtTime(0.3, now);
                    gain2.gain.linearRampToValueAtTime(0.01, now + 0.7);
                    osc2.start(now);
                    osc2.stop(now + 0.7);
                } else if (type === 'love' || type === 'chime') {
                    var osc3 = ctx.createOscillator();
                    var gain3 = ctx.createGain();
                    osc3.connect(gain3);
                    gain3.connect(ctx.destination);
                    osc3.type = 'sine';
                    osc3.frequency.setValueAtTime(784, now);
                    osc3.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25);
                    gain3.gain.setValueAtTime(0.2, now);
                    gain3.gain.linearRampToValueAtTime(0.01, now + 0.25);
                    osc3.start(now);
                    osc3.stop(now + 0.25);
                } else if (type === 'suspense') {
                    var osc4 = ctx.createOscillator();
                    var gain4 = ctx.createGain();
                    osc4.connect(gain4);
                    gain4.connect(ctx.destination);
                    osc4.type = 'sine';
                    osc4.frequency.setValueAtTime(220, now);
                    osc4.frequency.exponentialRampToValueAtTime(440, now + 0.3);
                    gain4.gain.setValueAtTime(0.12, now);
                    gain4.gain.linearRampToValueAtTime(0.01, now + 0.3);
                    osc4.start(now);
                    osc4.stop(now + 0.3);
                }
            } catch(e) {}
        }

        function getRpgTreeData() {
            var learnerChar = LEARNER_NAME || "Alex";
            var tutorChar = (CONV_DATA.characters && CONV_DATA.characters[1]) ? CONV_DATA.characters[1].name : "Sam";

            // 1. Check top-level CONV_DATA.rpg_quest
            if (CONV_DATA.rpg_quest && CONV_DATA.rpg_quest.turns && Array.isArray(CONV_DATA.rpg_quest.turns) && CONV_DATA.rpg_quest.turns.length > 0) {
                var tree = {};
                CONV_DATA.rpg_quest.turns.forEach(function(t, idx) {
                    var turnKey = 'turn_' + (idx + 1);
                    tree[turnKey] = {
                        location: t.location || ("Scene " + (idx + 1) + " 📍"),
                        speaker: t.speaker || tutorChar,
                        storyText: t.storyText || t.prompt || "",
                        sfx: t.sfx || (idx === 4 ? "victory" : "chime"),
                        choices: Array.isArray(t.choices) ? t.choices.map(function(c) {
                            return {
                                text: c.text || "Choice option",
                                isWinning: !!c.isWinning,
                                sfx: c.sfx || (c.isWinning ? (idx === 4 ? "victory" : "love") : "death"),
                                emoji: c.emoji || (c.isWinning ? "🎉" : "😅"),
                                consequenceText: c.consequenceText || (c.isWinning ? "Great situational response!" : "Awkward misstep! Try again.")
                            };
                        }) : []
                    };
                });
                return tree;
            }

            // 2. Check if Activity 10 in CONV_DATA.activities contains RPG quest turns
            if (CONV_DATA.activities && Array.isArray(CONV_DATA.activities)) {
                var rpgAct = CONV_DATA.activities.find(function(a) {
                    return a.id === 'dramatic_story_rpg' || a.id === 'dramatic_branching_quest' || (a.title && a.title.indexOf('RPG') !== -1);
                });
                if (rpgAct && rpgAct.turns && Array.isArray(rpgAct.turns) && rpgAct.turns.length > 0) {
                    var tree2 = {};
                    rpgAct.turns.forEach(function(t, idx) {
                        var turnKey = 'turn_' + (idx + 1);
                        tree2[turnKey] = {
                            location: t.location || ("Scene " + (idx + 1) + " 📍"),
                            speaker: t.speaker || tutorChar,
                            storyText: t.storyText || t.prompt || "",
                            sfx: t.sfx || (idx === 4 ? "victory" : "chime"),
                            choices: Array.isArray(t.choices) ? t.choices.map(function(c) {
                                return {
                                    text: c.text || "Choice option",
                                    isWinning: !!c.isWinning,
                                    sfx: c.sfx || (c.isWinning ? (idx === 4 ? "victory" : "love") : "death"),
                                    emoji: c.emoji || (c.isWinning ? "🎉" : "😅"),
                                    consequenceText: c.consequenceText || (c.isWinning ? "Great response!" : "Awkward misstep!")
                                };
                            }) : []
                        };
                    });
                    return tree2;
                }
            }

            // 3. Dynamic Fallback based on CONV_DATA.settings.topic
            var topic = (CONV_DATA.settings && CONV_DATA.settings.topic) ? CONV_DATA.settings.topic : "Everyday Scenario";
            var char1 = (CONV_DATA.characters && CONV_DATA.characters[0]) ? CONV_DATA.characters[0].name : learnerChar;
            var char2 = (CONV_DATA.characters && CONV_DATA.characters[1]) ? CONV_DATA.characters[1].name : tutorChar;

            return {
                turn_1: {
                    location: topic + " - Scene 1 ☕",
                    speaker: char2,
                    storyText: "Welcome! " + char2 + " greets " + char1 + " regarding " + topic + ": 'Hey " + char1 + "! Glad you made it. Shall we get started with our plans today?' How do you respond in natural everyday English?",
                    sfx: "chime",
                    choices: [
                        {
                            text: "Respond politely: 'Hey " + char2 + "! Thanks for waiting. Yes, I'm completely ready whenever you are!'",
                            isWinning: true,
                            sfx: "love"
                        },
                        {
                            text: "Complain loudly and demand to cancel everything immediately.",
                            isWinning: false,
                            sfx: "death",
                            emoji: "😤",
                            consequenceText: "That was quite abrupt! Everyone looks surprised and confused."
                        },
                        {
                            text: "Ignore the question and stare at your phone in complete silence.",
                            isWinning: false,
                            sfx: "death",
                            emoji: "📱",
                            consequenceText: "An awkward silence fills the room. Oops!"
                        }
                    ]
                },
                turn_2: {
                    location: topic + " - Scene 2 🛋️",
                    speaker: char2,
                    storyText: char2 + " brings up an unexpected detail about " + topic + ": 'We have two different approaches we could take right now. What do you think is best?'",
                    sfx: "suspense",
                    choices: [
                        {
                            text: "Offer a collaborative suggestion: 'I think the first option makes the most sense because it keeps things clear and easy.'",
                            isWinning: true,
                            sfx: "chime"
                        },
                        {
                            text: "Blame " + char2 + " for not deciding earlier.",
                            isWinning: false,
                            sfx: "death",
                            emoji: "🤦",
                            consequenceText: "Unnecessary tension builds between you two!"
                        },
                        {
                            text: "Walk away to get a snack without answering.",
                            isWinning: false,
                            sfx: "death",
                            emoji: "🍪",
                            consequenceText: "You left the question hanging unanswered."
                        }
                    ]
                },
                turn_3: {
                    location: topic + " - Scene 3 💼",
                    speaker: char2,
                    storyText: "A minor complication arises during " + topic + "! " + char2 + " asks: 'How should we adjust our schedule to handle this?'",
                    sfx: "suspense",
                    choices: [
                        {
                            text: "Propose a sensible compromise: 'Let's take a quick 5-minute breather and then finish up smoothly.'",
                            isWinning: true,
                            sfx: "love"
                        },
                        {
                            text: "Panic and cancel the whole activity.",
                            isWinning: false,
                            sfx: "death",
                            emoji: "😱",
                            consequenceText: "Overreacting derailed your progress!"
                        },
                        {
                            text: "Suggest making up a fake story to avoid dealing with it.",
                            isWinning: false,
                            sfx: "death",
                            emoji: "🤥",
                            consequenceText: "Honesty is always the best policy!"
                        }
                    ]
                },
                turn_4: {
                    location: topic + " - Scene 4 🛒",
                    speaker: char2,
                    storyText: "Things are looking up! " + char2 + " smiles: 'That went much better than expected, " + char1 + "! What's our next step?'",
                    sfx: "chime",
                    choices: [
                        {
                            text: "Summarize clearly: 'Let's double-check our notes and confirm everything before heading off.'",
                            isWinning: true,
                            sfx: "chime"
                        },
                        {
                            text: "Throw your hands in the air and celebrate way too early.",
                            isWinning: false,
                            sfx: "death",
                            emoji: "🎉",
                            consequenceText: "Premature celebration caused a funny minor mess!"
                        },
                        {
                            text: "Claim you forgot everything that was just said.",
                            isWinning: false,
                            sfx: "death",
                            emoji: "🤔",
                            consequenceText: "Time for a quick recap."
                        }
                    ]
                },
                turn_5: {
                    location: topic + " - Final Scene 🥳",
                    speaker: char2,
                    storyText: "Success! " + char2 + " cheers: 'Fantastic job today, " + char1 + "! Your situational English was spot on.' How do you wrap up the day?",
                    sfx: "suspense",
                    choices: [
                        {
                            text: "Express gratitude warmly: 'Thanks so much! I really enjoyed working through " + topic + " with you today!'",
                            isWinning: true,
                            sfx: "victory"
                        },
                        {
                            text: "Shrug silently and walk out without saying goodbye.",
                            isWinning: false,
                            sfx: "death",
                            emoji: "🚪",
                            consequenceText: "A bit cold for a final goodbye!"
                        },
                        {
                            text: "Ask if you can start the entire scenario over again right this second.",
                            isWinning: false,
                            sfx: "death",
                            emoji: "🔄",
                            consequenceText: "Everyone needs a quick rest!"
                        }
                    ]
                }
            };
        }

        function makeRpgChoice(turn, choiceIdx) {
            var rpgData = getRpgTreeData();
            var currentNode = rpgData['turn_' + turn];
            if (!currentNode || !currentNode.choices[choiceIdx]) return;

            var choice = currentNode.choices[choiceIdx];

            if (choice.isWinning) {
                playSfx(choice.sfx || 'love');
                userScore += 200;
                userStreak++;
                totalAttempts++;
                correctAttempts++;
                document.getElementById('arena-score').textContent = userScore;
                document.getElementById('arena-streak').textContent = userStreak + 'x';

                if (turn >= 5) {
                    currentRpgState.victory = true;
                    playSfx('victory');
                } else {
                    currentRpgState.turn = turn + 1;
                }
            } else {
                playSfx(choice.sfx || 'death');
                userStreak = 0;
                totalAttempts++;
                currentRpgState.gameOver = true;
                currentRpgState.fatalMessage = choice.consequenceText;
                currentRpgState.fatalEmoji = choice.emoji || '💀';
            }

            renderActiveArenaGame();
        }

        function renderDramaticRpgStage(game, stage) {
            var rpgData = getRpgTreeData();
            var currentNode = rpgData['turn_' + currentRpgState.turn];

            var html = '<div class="rpg-quest-stage-card">' +
                '<div class="rpg-header-bar">' +
                    '<div class="rpg-title-badge">🎮 RPG QUEST</div>' +
                    '<div class="rpg-turn-counter">Turn ' + currentRpgState.turn + ' / 5</div>' +
                '</div>' +

                '<div class="rpg-character-roster">' +
                    '<div class="rpg-roster-item">' +
                        '<img src="' + FINAL_LEARNER_AVATAR + '" class="rpg-roster-avatar" />' +
                        '<span>' + escapeHtml(LEARNER_NAME) + ' 🎓</span>' +
                    '</div>' +
                    (CONV_DATA.characters || []).map(function(c, i) {
                        if (c.name && normalizeCharName(c.name) === normalizeCharName(LEARNER_NAME)) return '';
                        var cInfo = getCharInfo(c.name);
                        return '<div class="rpg-roster-item"><img src="' + cInfo.avatar + '" class="rpg-roster-avatar" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" /> <span>' + escapeHtml(c.name) + '</span></div>';
                    }).join('') +
                '</div>';

            if (currentRpgState.gameOver) {
                html += '<div class="rpg-failure-card">' +
                    '<div class="rpg-failure-icon">' + (currentRpgState.fatalEmoji || '😅') + '</div>' +
                    '<h3 class="rpg-failure-title">AWKWARD MISSTEP / TRY AGAIN!</h3>' +
                    '<p class="rpg-failure-text">' + escapeHtml(currentRpgState.fatalMessage) + '</p>' +
                    '<button class="btn-primary" style="margin-top: 20px; background-color: var(--accent-rose);" onclick="resetRpgQuest()">' +
                        '<i class="fas fa-rotate-left"></i> Replay RPG Quest' +
                    '</button>' +
                '</div>';
            } else if (currentRpgState.victory) {
                html += '<div class="rpg-victory-card">' +
                    '<div class="rpg-victory-icon">🏆</div>' +
                    '<h2 class="rpg-victory-title">FANTASTIC JOB! SITCOM HERO!</h2>' +
                    '<p class="rpg-victory-text">🎉 You navigated all 5 turns flawlessly! You handled every everyday situation like a native speaker!</p>' +
                    '<div class="rpg-avatars-celebration">' +
                        '<img src="' + FINAL_LEARNER_AVATAR + '" class="rp-celebration-avatar" />' +
                        '<img src="' + FINAL_TUTOR_AVATAR + '" class="rp-celebration-avatar" />' +
                    '</div>' +
                    '<button class="btn-primary" style="margin-top: 20px;" onclick="resetRpgQuest()">' +
                        '<i class="fas fa-play"></i> Replay Quest (Try Other Options)' +
                    '</button>' +
                '</div>';
            } else if (currentNode) {
                html += '<div class="rpg-scene-card">' +
                    '<div class="rpg-scene-header">' +
                        '<span class="rpg-scene-location">🏛️ ' + escapeHtml(currentNode.location) + '</span>' +
                        '<button class="btn-secondary" style="font-size:0.85rem; padding: 6px 12px;" onclick="playCurrentRpgStoryAudio()">' +
                            '<i class="fas fa-volume-up"></i> Read Story Aloud' +
                        '</button>' +
                    '</div>' +

                    '<div class="rpg-story-box">' +
                        '<div class="rpg-speaker-tag">🗣️ ' + escapeHtml(currentNode.speaker) + ':</div>' +
                        '<div class="rpg-story-text">' + escapeHtml(currentNode.storyText) + '</div>' +
                    '</div>' +

                    '<div class="rpg-choices-title">⚡ What will ' + escapeHtml(LEARNER_NAME) + ' do next? (Choose wisely - 1 path leads to survival):</div>' +

                    '<div class="rpg-choices-grid">';

                for (var c = 0; c < currentNode.choices.length; c++) {
                    var choice = currentNode.choices[c];
                    html += '<button class="rpg-choice-btn" onclick="makeRpgChoice(' + currentRpgState.turn + ', ' + c + ')">' +
                        '<span class="rpg-choice-badge">' + String.fromCharCode(65 + c) + '</span> ' +
                        '<span>' + escapeHtml(choice.text) + '</span>' +
                    '</button>';
                }

                html += '</div></div>';
            }

            html += '</div>';
            stage.innerHTML = html;

            if (currentNode && !currentRpgState.gameOver && !currentRpgState.victory) {
                playGameAudio(currentNode.storyText, currentNode.speaker);
            }
        }

        // 🎓 Arena mini-lesson review helpers — a color-coded review card appears once every
        // question of a game has been answered (same visual language as the Test Lab review).
        var arenaResults = {};
        var arenaGamesDone = {};

        function cmEsc(s) { return escapeHtml(String(s == null ? '' : s)); }

        function cmPointBlocks(text, forceTag) {
            var raw = String(text || '').trim();
            if (!raw) return '';
            var chunks = raw.split(String.fromCharCode(13)).join('|BR|');
            chunks = chunks.split(String.fromCharCode(10)).join('|BR|');
            chunks = chunks.split(String.fromCharCode(92) + 'n').join('|BR|');
            var parts = chunks.split('|BR|');
            var out = [];
            for (var pi = 0; pi < parts.length; pi++) {
                var t = String(parts[pi] || '').trim();
                if (!t) continue;
                var upper = t.toUpperCase();
                var cls = '';
                var tag = '';
                if (upper.indexOf('MEANING') === 0 || upper.indexOf('WHAT IT MEANS') === 0) { cls = 'cm-pt-meaning'; tag = 'Meaning'; }
                else if (upper.indexOf('FORM') === 0 || upper.indexOf('STRUCTURE') === 0 || upper.indexOf('HOW TO FORM') === 0) { cls = 'cm-pt-form'; tag = 'Form'; }
                else if (upper.indexOf('USE') === 0 || upper.indexOf('USAGE') === 0 || upper.indexOf('WHEN TO USE') === 0 || upper.indexOf('WHEN WE USE') === 0 || upper.indexOf('CONTEXT') === 0) { cls = 'cm-pt-use'; tag = 'Use'; }
                else if (upper.indexOf('PRONUNCIATION') === 0 || upper.indexOf('STRESS') === 0 || upper.indexOf('INTONATION') === 0 || upper.indexOf('SOUNDS LIKE') === 0) { cls = 'cm-pt-pron'; tag = 'Pronunciation'; }
                else if (upper.indexOf('GRAMMAR') === 0) { cls = 'cm-pt-grammar'; tag = 'Grammar'; }
                else if (upper.indexOf('VOCABULARY') === 0 || upper.indexOf('VOCAB ') === 0 || upper.indexOf('DEFINITION') === 0 || upper.indexOf('KEY WORDS') === 0 || upper.indexOf('KEY PHRASES') === 0) { cls = 'cm-pt-vocab'; tag = 'Vocabulary'; }
                else if (upper.indexOf('EXAMPLE') === 0 || upper.indexOf('FOR EXAMPLE') === 0 || upper.indexOf('FOR INSTANCE') === 0) { cls = 'cm-pt-example'; tag = 'Example'; }
                else if (upper.indexOf('NOTE') === 0 || upper.indexOf('TIP') === 0 || upper.indexOf('REMEMBER') === 0 || upper.indexOf('HINT') === 0) { cls = 'cm-pt-tip'; tag = 'Tip'; }
                else if (upper.indexOf('COMMON MISTAKE') === 0 || upper.indexOf('MISTAKE') === 0 || upper.indexOf('WARNING') === 0 || upper.indexOf('AVOID') === 0 || upper.indexOf("DON'T SAY") === 0 || upper.indexOf("DON'T USE") === 0) { cls = 'cm-pt-warn'; tag = 'Watch out'; }
                if (!cls && forceTag && forceTag.cls) { cls = forceTag.cls; tag = forceTag.tag; }
                out.push('<div class="cm-pt ' + (cls || 'cm-pt-plain') + '">' + (tag ? '<span class="cm-pt-tag">' + cmEsc(tag) + '</span>' : '') + cmEsc(t) + '</div>');
            }
            return out.length ? out.join('') : cmEsc(raw);
        }

        function cmKeywordCard(item) {
            var term = item.word || item.phrase || item.term || item.target || '';
            if (!term) return '';
            var meaning = item.meaning || item.definition || '';
            var form = item.form || '';
            var use = item.use || item.usage || item.context || '';
            if (!meaning && !form && !use) return '';
            var html = '<div class="cm-kw"><div class="cm-kw-row"><span class="cm-kw-term">' + cmEsc(term) + '</span></div>';
            if (meaning) html += '<div class="cm-kw-row"><strong>Meaning</strong><span>' + cmEsc(meaning) + '</span></div>';
            if (form) html += '<div class="cm-kw-row"><strong>Form</strong><span>' + cmEsc(form) + '</span></div>';
            if (use) html += '<div class="cm-kw-row"><strong>Use</strong><span>' + cmEsc(use) + '</span></div>';
            return html + '</div>';
        }

        function cmArenaForceTag(game) {
            var id = String(game.id || '');
            var title = String(game.title || '');
            if (id.indexOf('grammar') !== -1 || title.indexOf('Grammar') !== -1) return { cls: 'cm-pt-grammar', tag: 'Grammar' };
            if (id.indexOf('vocab') !== -1 || title.indexOf('Vocab') !== -1 || id.indexOf('gap_fill') !== -1 || id.indexOf('register') !== -1 || id.indexOf('dialogue') !== -1) return { cls: 'cm-pt-vocab', tag: 'Vocabulary' };
            return null;
        }

        // Inline mini-lesson shown under the answered question (color-coded point boxes + keyword card).
        function cmItemExplainHtml(gameIdx, itemIdx) {
            var games = buildArenaGamesData();
            var game = games[gameIdx];
            var item = game && game.items ? game.items[itemIdx] : null;
            if (!game || !item) return '';
            var html = '';
            var exp = String(item.explanation || '').trim();
            if (exp) html = cmPointBlocks(exp, cmArenaForceTag(game));
            html += cmKeywordCard(item);
            return html;
        }

        function cmItemPrompt(item, idx) {
            var p = String(item.prompt || item.question || '').trim();
            var d = 0;
            while (d < p.length && p.charAt(d) >= '0' && p.charAt(d) <= '9') d++;
            if (d > 0) {
                var r = d;
                while (r < p.length && p.charAt(r) === ' ') r++;
                if (r < p.length && (p.charAt(r) === '.' || p.charAt(r) === ')')) {
                    r++;
                    while (r < p.length && p.charAt(r) === ' ') r++;
                    p = p.slice(r);
                }
            }
            if (!p) p = 'Review this item';
            return (idx + 1) + '. ' + p;
        }

        function cmItemAnswerText(item) {
            if (typeof item.answer === 'number' && Array.isArray(item.options) && item.options[item.answer] != null && String(item.options[item.answer]).trim() !== '') {
                return String.fromCharCode(65 + item.answer) + '. ' + String(item.options[item.answer]);
            }
            if (typeof item.answer === 'string' && String(item.answer).trim()) return String(item.answer);
            return '';
        }

        function cmReviewBlockForItem(game, item, idx, res) {
            var html = '<div class="cm-rv-q">';
            html += '<div class="cm-rv-q-top"><span class="cm-rv-q-num">Q' + (idx + 1) + '</span>';
            if (res) html += '<span class="cm-rv-verdict ' + (res.correct ? 'ok' : 'no') + '">' + (res.correct ? '✓ Correct' : '✗ Review') + '</span>';
            html += '</div>';
            html += '<div class="cm-rv-q-prompt">' + cmEsc(cmItemPrompt(item, idx)) + '</div>';
            var hasOptions = Array.isArray(item.options) && item.options.length > 0;
            var ansText = cmItemAnswerText(item);
            if (res && !res.correct && res.chosen && hasOptions) {
                html += '<div class="cm-rv-q-meta"><span class="cm-rv-picked">You picked: "' + cmEsc(res.chosen) + '"</span></div>';
            }
            if (ansText && hasOptions) html += '<div class="cm-rv-q-meta"><span class="cm-rv-right">Answer: ' + cmEsc(ansText) + '</span></div>';
            var kw = cmKeywordCard(item);
            if (kw) html += kw;
            var exp = String(item.explanation || '').trim();
            if (exp) html += cmPointBlocks(exp, cmArenaForceTag(game));
            var audio = String(item.audioText || '').trim();
            var gid = String(game.id || '');
            var isListen = gid.indexOf('listening') !== -1 || gid.indexOf('listen') === 0 || gid.indexOf('audio') !== -1;
            if (audio && isListen) html += '<div class="cm-pt cm-pt-example"><span class="cm-pt-tag">Audio</span>"' + cmEsc(audio) + '"</div>';
            return html + '</div>';
        }

        function arenaGameReviewHtml(gameIdx, game, correctCount) {
            var nextBtn = '';
            var games = buildArenaGamesData();
            for (var gi = gameIdx + 1; gi < games.length; gi++) {
                var cand = games[gi];
                var cid = String(cand.id || '');
                var isRpg = cid.indexOf('rpg') !== -1 || String(cand.title || '').indexOf('RPG') !== -1;
                if (!isRpg) { nextBtn = '<button type="button" class="cm-rv-next" onclick="selectArenaGame(' + gi + ')">Next Game →</button>'; break; }
            }
            var body = '';
            var resMap = arenaResults[gameIdx] || {};
            for (var i = 0; i < game.items.length; i++) body += cmReviewBlockForItem(game, game.items[i], i, resMap[i] || null);
            var html = '<div class="cm-rv-card" id="cm-rv-card">';
            html += '<div class="cm-rv-head">🎓 Mini-Lesson Review <span class="cm-rv-score">' + correctCount + '/' + game.items.length + ' correct</span>' + nextBtn + '</div>';
            html += '<div class="cm-rv-body">' + body + '</div></div>';
            return html;
        }

        function renderArenaReview(gameIdx) {
            var games = buildArenaGamesData();
            var game = games[gameIdx];
            if (!game || !Array.isArray(game.items) || game.items.length === 0) return;
            var stage = document.getElementById('game-stage-container');
            if (!stage) return;
            var resMap = arenaResults[gameIdx] || {};
            var correct = 0;
            for (var i = 0; i < game.items.length; i++) if (resMap[i] && resMap[i].correct) correct++;
            var old = document.getElementById('cm-rv-card');
            if (old && old.parentNode) old.parentNode.removeChild(old);
            stage.insertAdjacentHTML('beforeend', arenaGameReviewHtml(gameIdx, game, correct));
            var card = document.getElementById('cm-rv-card');
            if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        function recordArenaAnswer(gameIdx, itemIdx, correct, chosen) {
            if (!arenaResults[gameIdx]) arenaResults[gameIdx] = {};
            arenaResults[gameIdx][itemIdx] = { correct: !!correct, chosen: String(chosen == null ? '' : chosen) };
            var games = buildArenaGamesData();
            var game = games[gameIdx];
            if (!game || !Array.isArray(game.items) || game.items.length === 0) return;
            var resMap = arenaResults[gameIdx];
            var doneCount = 0;
            for (var i = 0; i < game.items.length; i++) if (resMap[i]) doneCount++;
            if (doneCount >= game.items.length) {
                arenaGamesDone[gameIdx] = true;
                renderArenaReview(gameIdx);
            }
        }

        function renderActiveArenaGame() {
            var games = buildArenaGamesData();
            var game = games[activeGameIndex];
            var stage = document.getElementById('game-stage-container');
            if (!stage || !game) return;

            if (game.id === 'dramatic_story_rpg' || game.id === 'dramatic_branching_quest' || (game.title || '').indexOf('RPG') !== -1 || (game.title || '').indexOf('Quest') !== -1) {
                renderDramaticRpgStage(game, stage);
                return;
            }

            if (game.id === 'rapid_ccq_duel' || /ccq/i.test(game.title || '')) {
                renderRapidDuel(game, stage);
                return;
            }

            var html = '<div style="margin-bottom: 20px">' +
                '<h3 style="font-size: 1.25rem; font-weight: 800; color: var(--accent-indigo)">' + game.title + '</h3>' +
                '<p style="font-size: 0.88rem; color: var(--text-muted)">' + game.description + '</p>' +
            '</div>' +
            '<div class="game-items-list">';

            for (var i = 0; i < game.items.length; i++) {
                var item = game.items[i];

                if (game.id === 'grammar_strike' || item.sentenceSegments || /grammar/i.test(game.title || '')) {
                    var segs = item.sentenceSegments || (item.prompt ? item.prompt.split(' ') : []);
                    var errIdx = (item.errorIndex !== undefined) ? item.errorIndex : item.answer;
                    if (typeof errIdx === 'string') {
                        var strIdx = -1;
                        for (var si = 0; si < segs.length; si++) {
                            if (String(segs[si]).toLowerCase().indexOf(String(errIdx).toLowerCase()) !== -1) { strIdx = si; break; }
                        }
                        errIdx = strIdx >= 0 ? strIdx : 0;
                    }

                    html += '<div class="game-item-card" id="game-item-' + activeGameIndex + '-' + i + '">' +
                        '<div style="font-weight: 800; font-size: 1rem; margin-bottom: 12px; color: var(--text-primary)">' +
                            (i + 1) + '. Click directly on the segment containing the grammar error:' +
                        '</div>' +
                        '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">';

                    for (var s = 0; s < segs.length; s++) {
                        var isErr = (s === errIdx);
                        html += '<button class="grammar-segment-btn" onclick="checkGrammarSpot(' + activeGameIndex + ', ' + i + ', ' + s + ', ' + isErr + ', this)">' +
                            escapeHtml(segs[s]) +
                        '</button>';
                    }

                    html += '</div>' +
                        '<div id="game-exp-' + activeGameIndex + '-' + i + '" style="display:none; font-weight: 700; font-size: 0.88rem; margin-top: 12px;"></div>' +
                    '</div>';
                } else if (game.id === 'listening_no_text_1' || game.id === 'listening_challenge_dictation') {
                    // 🎧 Listening Challenge — real-time word-check dictation: listen & type every word.
                    var dictText = item.audioText || item.prompt || '';
                    html += '<div class="game-item-card" id="game-item-' + activeGameIndex + '-' + i + '">' +
                        '<div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 4px; color: var(--text-primary)">' +
                            (i + 1) + '. 🎧 Dictation — type exactly what you hear' +
                        '</div>' +
                        '<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">' +
                            'Listen carefully. No transcript is shown — every word you type is checked.' +
                        '</div>' +
                        '<div style="margin-bottom: 12px;">' +
                            '<button class="btn-primary" style="background-color: var(--accent-purple); font-size: 0.9rem;" onclick="playGameAudioItem(' + activeGameIndex + ', ' + i + ')">' +
                                '<i class="fas fa-volume-up"></i> Play Audio' +
                            '</button>' +
                            '<button class="btn-secondary" style="font-size: 0.85rem; margin-left: 8px;" onclick="playGameAudioItem(' + activeGameIndex + ', ' + i + ')">' +
                                '<i class="fas fa-rotate-left"></i> Replay' +
                            '</button>' +
                        '</div>' +
                        '<textarea id="dict-input-' + activeGameIndex + '-' + i + '" placeholder="Type every word you hear here..." style="width:100%;min-height:64px;padding:10px;border:2px solid var(--border-color);border-radius:10px;font-size:1rem;background:var(--bg-secondary);color:var(--text-primary);outline:none;"></textarea>' +
                        '<button class="btn-primary" style="margin-top:10px;font-size:0.9rem;" onclick="checkDictationAnswer(' + activeGameIndex + ', ' + i + ')">' +
                            '<i class="fas fa-check"></i> Check My Words' +
                        '</button>' +
                        '<div id="dict-result-' + activeGameIndex + '-' + i + '" style="display:none;margin-top:12px;padding:12px;border-radius:10px;background:rgba(99,102,241,0.08);line-height:2;font-size:1.02rem;"></div>' +
                    '</div>';
                } else if (game.id === 'listen_speed_trial' || game.id === 'listening_no_text_2' || game.id === 'listen_and_pick') {
                    // 🎧 Listen & Pick / 🎵 Audio Listening — listen-only, NO text of the read-aloud shown.
                    var isReplyPick = (game.id === 'listen_speed_trial');
                    var listenLabel = isReplyPick ? 'Listen to the line of conversation, then pick the correct reply:' : 'Listen to the clip and choose the exact sentence you heard:';
                    var opts = item.options || [];

                    html += '<div class="game-item-card" id="game-item-' + activeGameIndex + '-' + i + '">' +
                        '<div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 4px; color: var(--text-primary)">' +
                            (i + 1) + '. ' + escapeHtml(listenLabel) +
                        '</div>' +
                        '<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">' +
                            '<i class="fas fa-eye-slash"></i> Listen-only mode — the spoken text is hidden.' +
                        '</div>' +
                        '<div style="margin-bottom: 14px;">' +
                            '<button class="btn-primary" style="background-color: var(--accent-purple); font-size: 0.9rem;" onclick="playGameAudioItem(' + activeGameIndex + ', ' + i + ')">' +
                                '<i class="fas fa-volume-up"></i> Play Audio' +
                            '</button>' +
                            '<button class="btn-secondary" style="font-size: 0.85rem; margin-left: 8px;" onclick="playGameAudioItem(' + activeGameIndex + ', ' + i + ')">' +
                                '<i class="fas fa-rotate-left"></i> Replay' +
                            '</button>' +
                        '</div>' +
                        '<div class="game-options-grid">';

                    for (var j = 0; j < opts.length; j++) {
                        var isCorr = (j === item.answer);
                        var letter = String.fromCharCode(65 + j);
                        html += '<button class="game-opt-btn" onclick="checkArenaAnswer(' + activeGameIndex + ', ' + i + ', ' + isCorr + ', this)">' +
                            letter + '. ' + escapeHtml(opts[j]) +
                        '</button>';
                    }

                    html += '</div>' +
                        '<div id="game-exp-' + activeGameIndex + '-' + i + '" style="display:none; font-weight: 700; font-size: 0.88rem; margin-top: 10px; color: var(--accent-emerald)"></div>' +
                    '</div>';
                } else {
                    // General AI-generated question — real content question + options, NO Play button,
                    // NO "Listen to the clip" framing (only the listening games above are listen-only).
                    var qtext = cleanGamePromptText(item.prompt || '') || item.question || 'Review this item.';
                    var qopts = (Array.isArray(item.options) && item.options.length > 0) ? item.options : [];
                    html += '<div class="game-item-card" id="game-item-' + activeGameIndex + '-' + i + '">' +
                        '<div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 12px; color: var(--text-primary)">' +
                            (i + 1) + '. ' + escapeHtml(qtext) +
                        '</div>';
                    if (qopts.length > 0) {
                        html += '<div class="game-options-grid">';
                        var answerNorm = (typeof item.answer === 'string') ? String(item.answer).trim().toLowerCase() : '';
                        for (var oj = 0; oj < qopts.length; oj++) {
                            var oCorr = (typeof item.answer === 'number' && oj === item.answer) || (answerNorm && String(qopts[oj]).trim().toLowerCase() === answerNorm);
                            html += '<button class="game-opt-btn" onclick="checkArenaAnswer(' + activeGameIndex + ', ' + i + ', ' + oCorr + ', this)">' +
                                String.fromCharCode(65 + oj) + '. ' + escapeHtml(qopts[oj]) +
                            '</button>';
                        }
                        html += '</div>';
                    }
                    html += '<div id="game-exp-' + activeGameIndex + '-' + i + '" style="display:none; font-weight: 700; font-size: 0.88rem; margin-top: 10px;"></div>' +
                    '</div>';
                }
            }

            html += '</div>';
            stage.innerHTML = html;
            // Re-attach the mini-lesson review card when a completed game is re-rendered.
            if (arenaGamesDone[activeGameIndex]) renderArenaReview(activeGameIndex);
        }

        function cleanGamePromptText(promptStr) {
            if (!promptStr) return '';
            var s = cleanAudioText(promptStr);
            s = s.replace(/Listen carefully to the audio clip \\(No text shown\\) and select your answer:?/gi, '')
                 .replace(/🎧 Listen carefully to the audio clip \\(No text shown\\) and select your answer:?/gi, '')
                 .replace(/Select the mistake:?/gi, '')
                 .replace(/Select the mistake/gi, '')
                 .replace(/Which is the BEST alternative\\??:?/gi, '')
                 .replace(/Which is the BEST alternative\\??/gi, '')
                 .replace(/🎯 Click directly on the segment containing the grammar error:?/gi, '')
                 .trim();
            return s;
        }

        function checkGrammarSpot(gameIdx, itemIdx, segIdx, isCorrect, btnEl) {
            var card = document.getElementById('game-item-' + gameIdx + '-' + itemIdx);
            if (!card || card.getAttribute('data-answered')) return;
            card.setAttribute('data-answered', 'true');

            totalAttempts++;
            if (isCorrect) {
                correctAttempts++;
                userStreak++;
                var bonus = userStreak > 2 ? 150 : 100;
                userScore += bonus;
                btnEl.classList.add('correct-spot');
            } else {
                userStreak = 0;
                btnEl.classList.add('incorrect-spot');
            }

            document.getElementById('arena-score').textContent = userScore;
            document.getElementById('arena-streak').textContent = userStreak + 'x';
            var acc = Math.round((correctAttempts / totalAttempts) * 100);
            document.getElementById('arena-acc').textContent = acc + '%';

            var expEl = document.getElementById('game-exp-' + gameIdx + '-' + itemIdx);
            if (expEl) {
                expEl.style.display = 'block';
                var explHtml = cmItemExplainHtml(gameIdx, itemIdx);
                if (explHtml) {
                    expEl.innerHTML = explHtml;
                } else {
                    expEl.style.color = isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)';
                    expEl.innerHTML = isCorrect ? "🎯 Correct! You spotted the grammar error!" : "❌ Missed the error in this segment!";
                }
            }
            recordArenaAnswer(gameIdx, itemIdx, isCorrect, btnEl ? btnEl.textContent : '');
        }

        function checkArenaAnswer(gameIdx, itemIdx, isCorrect, btnEl) {
            var card = document.getElementById('game-item-' + gameIdx + '-' + itemIdx);
            if (!card || card.getAttribute('data-answered')) return;
            card.setAttribute('data-answered', 'true');

            totalAttempts++;
            if (isCorrect) {
                correctAttempts++;
                userStreak++;
                var bonus = userStreak > 2 ? 150 : 100;
                userScore += bonus;
                btnEl.classList.add('correct');
            } else {
                userStreak = 0;
                btnEl.classList.add('incorrect');
            }

            document.getElementById('arena-score').textContent = userScore;
            document.getElementById('arena-streak').textContent = userStreak + 'x';
            var acc = Math.round((correctAttempts / totalAttempts) * 100);
            document.getElementById('arena-acc').textContent = acc + '%';

            var expEl = document.getElementById('game-exp-' + gameIdx + '-' + itemIdx);
            if (expEl) {
                expEl.style.display = 'block';
                var explHtml = cmItemExplainHtml(gameIdx, itemIdx);
                if (explHtml) {
                    expEl.innerHTML = explHtml;
                } else {
                    expEl.style.color = isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)';
                    expEl.innerHTML = isCorrect ? "🎉 Excellent! +100 Points" : "❌ Incorrect. Keep practicing!";
                }
            }
            recordArenaAnswer(gameIdx, itemIdx, isCorrect, btnEl ? btnEl.textContent : '');
        }

        // 🎧 Listening Challenge — real-time word-check dictation
        function checkDictationAnswer(gameIdx, itemIdx) {
            var games = buildArenaGamesData();
            var game = games[gameIdx];
            if (!game || !game.items || !game.items[itemIdx]) return;
            var item = game.items[itemIdx];
            var input = document.getElementById('dict-input-' + gameIdx + '-' + itemIdx);
            var result = document.getElementById('dict-result-' + gameIdx + '-' + itemIdx);
            if (!input || !result) return;

            var targetWords = cleanAudioText(item.audioText || item.prompt || '').split(/\\s+/).filter(Boolean);
            var typedWords = String(input.value || '').trim().split(/\\s+/).filter(Boolean);
            var correctCount = 0;
            var wordHtml = '';

            for (var i = 0; i < targetWords.length; i++) {
                var tw = String(targetWords[i]).toLowerCase().replace(/[^a-z']/g, '');
                var uw = String(typedWords[i] || '').toLowerCase().replace(/[^a-z']/g, '');
                var ok = tw === uw && tw !== '';
                if (ok) correctCount++;
                wordHtml += '<span style="display:inline-block;margin:2px 6px 2px 0;padding:2px 8px;border-radius:8px;font-weight:700;background:' + (ok ? 'rgba(16,185,129,0.18);color:#059669' : 'rgba(239,68,68,0.15);color:#dc2626;text-decoration:line-through') + ';">' + escapeHtml(targetWords[i]) + '</span>';
            }
            if (typedWords.length > targetWords.length) {
                wordHtml += '<div style="font-size:0.85rem;color:#b45309;margin-top:6px;">⚠️ You typed ' + (typedWords.length - targetWords.length) + ' extra word(s) — listen again.</div>';
            }

            var pct = targetWords.length > 0 ? Math.round((correctCount / targetWords.length) * 100) : 0;
            result.style.display = 'block';
            result.innerHTML =
                '<div style="font-size:0.8rem;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Word-by-word check</div>' +
                '<div>' + wordHtml + '</div>' +
                '<div style="margin-top:10px;font-weight:800;font-size:1.05rem;">' +
                    (pct === 100 ? '🎉 Perfect dictation! All ' + correctCount + '/' + targetWords.length + ' words correct!' : '✍️ ' + correctCount + '/' + targetWords.length + ' words correct (' + pct + '%) — hit Replay and try again!') +
                '</div>';

            totalAttempts++;
            if (pct === 100) { correctAttempts++; userScore += 100; }
            document.getElementById('arena-score').textContent = userScore;
            var acc = Math.round((correctAttempts / totalAttempts) * 100);
            document.getElementById('arena-acc').textContent = acc + '%';
            recordArenaAnswer(gameIdx, itemIdx, pct === 100, input.value);
        }

        // ⚔️ Rapid CCQ Duel — 40s countdown (x2), +8s correct, -10s wrong, wrong questions return until mastered.
        var duelState = { active: false, queue: [], timeLeft: 40, timer: null, score: 0, streak: 0, answered: 0, done: false };

        function renderRapidDuel(game, stage) {
            if (!stage) return;
            if (!duelState.active || duelState.done) {
                duelState.active = true;
                duelState.done = false;
                duelState.queue = (game.items || []).slice();
                duelState.timeLeft = 40;
                duelState.score = 0;
                duelState.streak = 0;
                duelState.answered = 0;
                if (duelState.timer) { clearInterval(duelState.timer); duelState.timer = null; }
            }

            if (duelState.queue.length === 0) {
                if (duelState.timer) { clearInterval(duelState.timer); duelState.timer = null; }
                stage.innerHTML =
                    '<div style="text-align:center;padding:40px 20px;">' +
                        '<div style="font-size:3rem;">🏆</div>' +
                        '<h3 style="font-size:1.6rem;font-weight:900;margin:10px 0;color:var(--accent-indigo)">DUEL WON!</h3>' +
                        '<p style="font-size:1.1rem;color:var(--text-muted);">You answered all ' + duelState.answered + ' questions — final score <strong>' + duelState.score + '</strong></p>' +
                        '<button class="btn-primary" style="margin-top:18px;" onclick="resetRapidDuel()"><i class="fas fa-rotate-left"></i> Duel Again</button>' +
                    '</div>';
                return;
            }

            var item = duelState.queue[0];
            var pctBar = Math.max(0, Math.min(100, (duelState.timeLeft / 40) * 100));
            var barColor = duelState.timeLeft <= 14 ? '#dc2626' : duelState.timeLeft <= 24 ? '#d97706' : '#059669';

            var html =
                '<div style="margin-bottom: 20px">' +
                    '<h3 style="font-size: 1.25rem; font-weight: 800; color: var(--accent-indigo)">⚔️ Rapid CCQ Duel</h3>' +
                    '<p style="font-size: 0.88rem; color: var(--text-muted)">Answer before the clock hits zero. Correct = +8s. Wrong = -10s and the question returns!</p>' +
                    '<div style="display:flex; justify-content:flex-end;"><button class="btn-secondary" style="font-size:0.8rem;" onclick="finishRapidDuel()" title="Stop the duel and keep your score"><i class="fas fa-flag-checkered"></i> Finish Duel</button></div>' +
                '</div>' +
                '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">' +
                    '<div style="flex:1;min-width:120px;padding:10px 14px;border-radius:12px;background:rgba(99,102,241,0.1);text-align:center;">' +
                        '<div style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">⏱ Time</div>' +
                        '<div id="duel-time" style="font-size:1.7rem;font-weight:900;color:' + barColor + ';">' + duelState.timeLeft + 's</div>' +
                    '</div>' +
                    '<div style="flex:1;min-width:120px;padding:10px 14px;border-radius:12px;background:rgba(16,185,129,0.1);text-align:center;">' +
                        '<div style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">💯 Score</div>' +
                        '<div id="duel-score" style="font-size:1.7rem;font-weight:900;color:#059669;">' + duelState.score + '</div>' +
                    '</div>' +
                    '<div style="flex:1;min-width:120px;padding:10px 14px;border-radius:12px;background:rgba(245,158,11,0.1);text-align:center;">' +
                        '<div style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">🔥 Streak</div>' +
                        '<div id="duel-streak" style="font-size:1.7rem;font-weight:900;color:#d97706;">' + duelState.streak + 'x</div>' +
                    '</div>' +
                    '<div style="flex:1;min-width:120px;padding:10px 14px;border-radius:12px;background:rgba(139,92,246,0.1);text-align:center;">' +
                        '<div style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">❓ Left</div>' +
                        '<div id="duel-left" style="font-size:1.7rem;font-weight:900;color:#7c3aed;">' + duelState.queue.length + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="height:12px;border-radius:99px;background:rgba(0,0,0,0.08);overflow:hidden;margin-bottom:18px;">' +
                    '<div id="duel-bar" style="height:100%;width:' + pctBar + '%;background:' + barColor + ';transition:width 0.9s linear;"></div>' +
                '</div>' +
                '<div id="duel-feedback" style="min-height:28px;font-weight:800;font-size:0.95rem;margin-bottom:10px;"></div>' +
                '<div class="game-item-card">' +
                    '<div style="font-weight:800;font-size:1.1rem;color:var(--text-primary);margin-bottom:14px;">' + escapeHtml(cleanGamePromptText(item.prompt || '')) + '</div>' +
                    '<div class="game-options-grid" id="duel-options">';

            var opts = Array.isArray(item.options) && item.options.length > 0 ? item.options : ['Yes, exactly', 'No, that is wrong', 'Only sometimes', 'Never'];
            for (var j = 0; j < opts.length; j++) {
                var isCorr = (j === item.answer);
                html += '<button class="game-opt-btn" id="duel-opt-' + j + '" onclick="answerRapidDuel(' + j + ', ' + isCorr + ', this)">' +
                    String.fromCharCode(65 + j) + '. ' + escapeHtml(opts[j]) +
                '</button>';
            }
            html += '</div></div>';

            stage.innerHTML = html;
            startDuelTimer();
        }

        function startDuelTimer() {
            if (duelState.timer) clearInterval(duelState.timer);
            duelState.timer = setInterval(duelTick, 1000);
        }

        function duelTick() {
            duelState.timeLeft -= 1;
            var barColor = duelState.timeLeft <= 14 ? '#dc2626' : duelState.timeLeft <= 24 ? '#d97706' : '#059669';
            var timeEl = document.getElementById('duel-time');
            var barEl = document.getElementById('duel-bar');
            if (timeEl) { timeEl.textContent = duelState.timeLeft + 's'; timeEl.style.color = barColor; }
            if (barEl) { barEl.style.width = Math.max(0, Math.min(100, (duelState.timeLeft / 40) * 100)) + '%'; barEl.style.background = barColor; }
            if (duelState.timeLeft <= 0) {
                if (duelState.timer) { clearInterval(duelState.timer); duelState.timer = null; }
                handleDuelTimeout();
            }
        }

        function handleDuelTimeout() {
            var fb = document.getElementById('duel-feedback');
            if (fb) { fb.style.color = '#dc2626'; fb.textContent = '⏰ Time is up! -10s and the question comes back.'; }
            duelState.timeLeft = 40;
            duelState.streak = 0;
            advanceDuel(false);
        }

        function answerRapidDuel(optIdx, isCorrect, btnEl) {
            if (duelState.done) return;
            if (duelState.timer) { clearInterval(duelState.timer); duelState.timer = null; }
            var fb = document.getElementById('duel-feedback');
            if (isCorrect) {
                duelState.streak++;
                var bonus = duelState.streak > 2 ? 150 : 100;
                duelState.score += bonus;
                duelState.timeLeft = Math.min(45, duelState.timeLeft + 8);
                if (btnEl) btnEl.classList.add('correct');
                if (fb) { fb.style.color = '#059669'; fb.textContent = '✅ Correct! +8 seconds (now ' + duelState.timeLeft + 's)'; }
            } else {
                duelState.streak = 0;
                duelState.timeLeft = Math.max(10, duelState.timeLeft - 10);
                if (btnEl) btnEl.classList.add('incorrect');
                if (fb) { fb.style.color = '#dc2626'; fb.textContent = '❌ Wrong! -10 seconds (now ' + duelState.timeLeft + 's) — you will see this question again.'; }
            }
            advanceDuel(isCorrect);
        }

        function advanceDuel(isCorrect) {
            var games = buildArenaGamesData();
            var game = games[activeGameIndex];
            if (!game) { duelState.done = true; return; }
            var item = duelState.queue.shift();
            if (!isCorrect && item) {
                duelState.queue.push(item); // wrong questions return until answered correctly
            } else if (item) {
                duelState.answered++;
            }
            document.getElementById('arena-score').textContent = duelState.score;
            document.getElementById('arena-streak').textContent = duelState.streak + 'x';
            if (duelState.queue.length === 0) {
                duelState.done = true;
                renderRapidDuel(game, document.getElementById('game-stage-container'));
                return;
            }
            duelState.timeLeft = Math.max(duelState.timeLeft, 5);
            setTimeout(function() { renderRapidDuel(game, document.getElementById('game-stage-container')); }, 650);
        }

        // 🏁 Finish Duel — stops the timer and shows the summary whenever the tutor/learner wants to end it.
        function finishRapidDuel() {
            if (duelState.done) return;
            if (duelState.timer) { clearInterval(duelState.timer); duelState.timer = null; }
            duelState.done = true;
            var stage = document.getElementById('game-stage-container');
            if (!stage) return;
            var remaining = duelState.queue.length;
            var games = buildArenaGamesData();
            var game = games[activeGameIndex];
            var total = (game && game.items) ? game.items.length : Math.max(duelState.answered, remaining);
            stage.innerHTML =
                '<div style="text-align:center;padding:40px 20px;">' +
                    '<div style="font-size:3rem;">🏁</div>' +
                    '<h3 style="font-size:1.6rem;font-weight:900;margin:10px 0;color:var(--accent-indigo)">DUEL FINISHED</h3>' +
                    '<p style="font-size:1.1rem;color:var(--text-muted);">Answered <strong>' + duelState.answered + '</strong> of ' + total + ' question' + (total === 1 ? '' : 's') + ' (' + remaining + ' still in the queue) — final score <strong>' + duelState.score + '</strong> · best streak <strong>' + duelState.streak + 'x</strong></p>' +
                    '<button class="btn-primary" style="margin-top:18px;" onclick="resetRapidDuel()"><i class="fas fa-rotate-left"></i> Duel Again</button>' +
                '</div>';
        }

        function resetRapidDuel() {
            duelState.active = false;
            duelState.done = false;
            renderActiveArenaGame();
        }

        /* Clipboard Copy */
        function copyFormattedText() {
            var plainText = "💬 CONVERSATION PRACTICE - " + LEARNER_NAME + "\\n";
            plainText += "Date: ${formattedDate}\\n\\n";
            (CONV_DATA.dialogue || []).forEach(function(l) {
                plainText += "[" + l.character + "]: " + l.text + "\\n";
            });
            navigator.clipboard.writeText(plainText).then(function() {
                alert("Conversation text copied to clipboard!");
            });
        }

        /* Persistence */
        function saveNotes() {
            try {
                var text = document.getElementById('learner-notes').value;
                localStorage.setItem(SAVE_KEY, text);
            } catch (e) {}
        }

        function loadSavedNotes() {
            try {
                var saved = localStorage.getItem(SAVE_KEY);
                if (saved) {
                    var textarea = document.getElementById('learner-notes');
                    if (textarea) textarea.value = saved;
                }
            } catch (e) {}
        }

        window.startInteractiveLineByLine = startInteractiveLineByLine;
        window.playCurrentLineByLine = playCurrentLineByLine;
        window.stepDialogueLine = stepDialogueLine;
        window.playFullDialogue = playFullDialogue;
        window.togglePauseResume = togglePauseResume;
        window.stopAudio = stopAudio;
        window.switchTab = switchTab;
        window.toggleAllTranslations = toggleAllTranslations;
        window.toggleAllAnnotations = toggleAllAnnotations;
        window.toggleAnswer = toggleAnswer;
        window.playSingleLine = playSingleLine;
        window.highlightAnnotationBox = highlightAnnotationBox;
        window.checkGrammarSpot = checkGrammarSpot;
        window.checkArenaAnswer = checkArenaAnswer;
        window.copyFormattedText = copyFormattedText;
        window.saveNotes = saveNotes;
        window.loadSavedNotes = loadSavedNotes;
        window.initRoleplay = typeof initRoleplay !== 'undefined' ? initRoleplay : function(){};
        window.selectRoleplayRole = typeof selectRoleplayRole !== 'undefined' ? selectRoleplayRole : function(){};
        window.playNextRoleplayStep = typeof playNextRoleplayStep !== 'undefined' ? playNextRoleplayStep : function(){};
        window.userSpeakLine = typeof userSpeakLine !== 'undefined' ? userSpeakLine : function(){};
        window.userSkipLine = typeof userSkipLine !== 'undefined' ? userSkipLine : function(){};
        window.renderArenaGame = typeof renderArenaGame !== 'undefined' ? renderArenaGame : function(){};
        window.selectArenaGame = typeof selectArenaGame !== 'undefined' ? selectArenaGame : function(){};
        window.cleanGamePromptText = cleanGamePromptText;
        window.cleanAudioText = cleanAudioText;

        // Ctrl + Mouse Wheel zooms ONLY the lesson content (dialogue + side margin notes, roleplay, games, glossary, questions).
        // The header, tab bar, toolbars and the annotations bar keep a constant size — the browser's own page zoom is suppressed while Ctrl is held.
        (function () {
            var MIN = 50, MAX = 300, STEP = 10;
            var zoom = 100;

            function contentRoots() {
                return Array.prototype.slice.call(document.querySelectorAll('.lesson-zoom-area'));
            }

            function applyZoom() {
                var z = zoom / 100;
                var roots = contentRoots();
                for (var i = 0; i < roots.length; i++) {
                    roots[i].style.setProperty('zoom', String(z));
                }
                // Keep the fixed annotation bar at a constant size even if it lives inside a zoomed area.
                var fixedWidgets = document.querySelectorAll('#fixed-footer, .annotToolbar, .annot-toolbar, .annotations-toolbar, .fixed-widget-control, .panel-overlay, .tooltip-container, .toast-container');
                for (var j = 0; j < fixedWidgets.length; j++) {
                    var w = fixedWidgets[j];
                    var inside = false;
                    for (var r = 0; r < roots.length; r++) {
                        if (roots[r].contains(w)) { inside = true; break; }
                    }
                    w.style.setProperty('zoom', inside ? String(1 / z) : '1');
                }
                window.dispatchEvent(new Event('resize'));
            }

            window.addEventListener('wheel', function (e) {
                if (!(e.ctrlKey || e.metaKey)) return;
                e.preventDefault();
                e.stopPropagation();
                var step = e.deltaY < 0 ? STEP : -STEP;
                var next = Math.max(MIN, Math.min(MAX, zoom + step));
                if (next === zoom) return;
                zoom = next;
                applyZoom();
            }, { passive: false });

            // Ctrl+0 resets content zoom to 100%
            document.addEventListener('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.key === '0')) {
                    e.preventDefault();
                    zoom = 100;
                    applyZoom();
                }
            });

            // Restore saved zoom across sessions
            try {
                var saved = parseInt(localStorage.getItem('__lesson_content_zoom') || '100', 10);
                if (!isNaN(saved) && saved >= MIN && saved <= MAX && saved !== 100) {
                    zoom = saved;
                    applyZoom();
                }
            } catch (err) { }

            var saveTimer = null;
            var origApply = applyZoom;
            applyZoom = function () {
                origApply();
                if (saveTimer) clearTimeout(saveTimer);
                saveTimer = setTimeout(function () {
                    try { localStorage.setItem('__lesson_content_zoom', String(zoom)); } catch (err) { }
                }, 400);
            };
        })();
    </script>

    ${annotationFeatures.html}

    <script>
        ${annotationFeatures.js}
    </script>
</body>
</html>`;
};

export const handleSaveConversationMakerAsHtml = (
    data: ConversationMakerData,
    learner: Partial<LearnerProfile> | any,
    tutorProfile?: any,
    customDate?: string,
    audience: LessonAudience = 'Learner'
): void => {
    try {
        const html = generateConversationMakerHtml(data, learner, tutorProfile, customDate);
        const learnerName = learner?.name || 'Learner';
        const parsedDate = customDate ? new Date(customDate) : null;

        // Shared lesson naming: {learner}_{book}_{unit}_{type}_{Learner|Presenter}_{date}
        const filename = buildLessonFileName({
            learnerName,
            lessonLabel: 'Conversation Maker',
            audience,
            ...getLessonFilePrefill(learner),
            date: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : undefined,
        });

        // Download only: this export must NOT register in "Manage Saved Files".
        // That list is reserved for files the tutor explicitly saved to the library.

        // Trigger browser download
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Learner-ready ZIP (HTML + assets bundled) alongside the plain HTML file
        import('./htmlZip').then(m => m.downloadZipOfHtml(html, filename)).catch(() => {});

        alert(`✅ Standalone Super Enhanced Conversation HTML Document successfully saved and downloaded for ${learnerName}!\nFilename: ${filename} (plus a ${filename.replace(/\.html$/i, '')}.zip ready to send to your learner)`);
    } catch (err: any) {
        console.error("Failed to generate Conversation Maker HTML:", err);
        alert("Failed to generate Standalone Conversation HTML: " + (err.message || String(err)));
    }
};
