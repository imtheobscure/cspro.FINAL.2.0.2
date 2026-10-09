import React, { FC, useState, useEffect, useRef } from 'react';
import type { Activity, LearnerProfile } from '../../types';
import ReadAloudButton from './ReadAloudButton';
import { cleanTextForSpeech } from '../../utils/textFormatters';

export function safeParseJSON(content: any): any {
    if (typeof content !== 'string') return content;
    let raw = content.trim();
    // Legacy exports sometimes embed the JSON string HTML-escaped (e.g. inside attributes).
    if (raw.startsWith('&quot;')) {
        raw = raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    }
    for (let depth = 0; depth < 3; depth++) {
        if (raw.startsWith("'") && raw.endsWith("'")) {
            raw = raw.slice(1, -1).trim();
        }
        // Strip markdown / <code> fences that AI pastes wrap JSON in.
        const fence = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
        if (fence) raw = fence[1].trim();
        const codeTag = raw.match(/^<code[^>]*>([\s\S]*?)<\/code>$/i);
        if (codeTag) raw = codeTag[1].trim();
        const jsonShaped = (raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('"') && raw.endsWith('"'));
        if (!jsonShaped) return content;
        try {
            const parsed = JSON.parse(raw);
            // Double-encoded JSON (a JSON string that itself holds JSON) — parse again.
            if (typeof parsed === 'string' && (parsed.trim().startsWith('{') || parsed.trim().startsWith('['))) {
                raw = parsed.trim();
                continue;
            }
            return parsed;
        } catch (e) {
            // Entity-wrapped JSON string with unescaped inner quotes, e.g. &quot;{&quot;a&quot;:1}&quot;
            // → "{"a":1}" — strip the outer JSON-string quotes and retry.
            if (raw.startsWith('"') && raw.endsWith('"') && raw.length > 2) {
                try {
                    const inner = JSON.parse(raw.slice(1, -1));
                    if (typeof inner === 'string' && (inner.trim().startsWith('{') || inner.trim().startsWith('['))) {
                        raw = inner.trim();
                        continue;
                    }
                    return inner;
                } catch (e2) { return content; }
            }
            return content;
        }
    }
    return content;
}

export function cleanTableHtml(html: string): string {
    if (typeof html !== 'string') return html;
    return html.replace(/<table([\s\S]*?)>([\s\S]*?)<\/table>/gi, (match, attrs, inner) => {
        let cleanedInner = inner
            .replace(/<br\s*\/?>\s*(?=<tr|<thead|<tbody|<tfoot|<\/tr|<\/thead|<\/tbody|<\/tfoot)/gi, '')
            .replace(/(<tr[^>]*>)\s*<br\s*\/?>/gi, '$1')
            .replace(/(<\/tr>)\s*<br\s*\/?>/gi, '$1')
            .replace(/(<thead[^>]*>)\s*<br\s*\/?>/gi, '$1')
            .replace(/(<\/thead>)\s*<br\s*\/?>/gi, '$1')
            .replace(/(<tbody[^>]*>)\s*<br\s*\/?>/gi, '$1')
            .replace(/(<\/tbody>)\s*<br\s*\/?>/gi, '$1')
            .replace(/(<tfoot[^>]*>)\s*<br\s*\/?>/gi, '$1')
            .replace(/(<\/tfoot>)\s*<br\s*\/?>/gi, '$1')
            .replace(/<br\s*\/?>\s*(?=<\/td>|<\/th>)/gi, '')
            .replace(/(<td[^>]*>)\s*<br\s*\/?>/gi, '$1')
            .replace(/(<\/td>)\s*<br\s*\/?>/gi, '$1')
            .replace(/(<th[^>]*>)\s*<br\s*\/?>/gi, '$1')
            .replace(/(<\/th>)\s*<br\s*\/?>/gi, '$1');
        return `<table${attrs}>${cleanedInner}</table>`;
    });
}

/** Normalize conversational / AI free-form + legacy shorthand type labels to our canonical interactive set. */
const canonicalType = (type: string): string => {
    const t = (type || '').toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/^_|_$/g, '');
    const aliases: Record<string, string> = {
        dialogue: 'conversation_roleplay',
        dialogue_model: 'conversation_roleplay',
        model_dialogue: 'conversation_roleplay',
        conversation_model: 'conversation_roleplay',
        roleplay: 'conversation_roleplay',
        roleplay_scenario: 'conversation_roleplay',
        conversation_roleplay_scenario: 'conversation_roleplay',
        conversation: 'conversation_roleplay',
        role_play: 'conversation_roleplay',
        speaking_challenge: 'speaking_jam',
        speaking_discussion: 'speaking_jam',
        discussion: 'speaking_jam',
        discussion_prompt: 'speaking_jam',
        speaking_prompt: 'speaking_jam',
        speaking_game: 'speaking_game',
        truth_or_dare: 'speaking_game',
        would_you_rather: 'would_you_rather',
        truth: 'would_you_rather',
        dare: 'speaking_game',
        key_phrases: 'flashcard',
        phrase_match: 'matching',
        conversation_check: 'multiple_choice',
        best_response: 'multiple_choice',
        true_false: 'true_false',
        true_or_false: 'true_false',
        voice_recording: 'voice_recording',
        record_yourself: 'voice_recording',
        my_turn: 'voice_recording',
        // Legacy export / pasted-JSON shorthand labels.
        mcq: 'multiple_choice',
        mc: 'multiple_choice',
        mc_quiz: 'multiple_choice',
        mcq_quiz: 'multiple_choice',
        multiple_choice_quiz: 'multiple_choice',
        choose_the_answer: 'multiple_choice',
        vocabulary: 'vocabulary_table',
        vocab: 'vocabulary_table',
        word_list: 'vocabulary_table',
        vocabulary_words: 'vocabulary_table',
        word_match: 'matching',
        word_matching: 'matching',
        matching_pairs: 'matching',
        match_terms: 'matching',
        fill_blanks: 'gap_fill',
        fill_in_the_blanks: 'gap_fill',
        fill_in_the_blank: 'gap_fill',
        fill_blank: 'gap_fill',
        cloze: 'gap_fill',
        complete_the_sentence: 'gap_fill',
        flashcards: 'flashcard',
        flash_cards: 'flashcard',
        spot_the_error: 'error_correction',
        find_the_mistake: 'error_correction',
        typing_test: 'typing_speed',
        categorize: 'sorting',
        categorization: 'sorting',
        group_sort: 'sorting',
        grammar_box: 'grammar_reference',
        grammar_guide: 'grammar_reference',
        grammar_rules: 'grammar_reference',
        grammar_point: 'grammar_reference',
        record: 'voice_recording',
        audio_recording: 'voice_recording',
        record_audio: 'voice_recording',
        taboo: 'taboo',
        taboo_cards: 'taboo',
        taboo_game: 'taboo',
        crossword: 'crossword',
        cross_word: 'crossword',
        crossword_puzzle: 'crossword',
        listening_script: 'conversation_roleplay',
        audio_script: 'conversation_roleplay',
        listening_dialogue: 'conversation_roleplay',
    };
    return aliases[t] || type;
};

/** Every type the renderer switch below can render as a rich interactive card. */
const KNOWN_CANONICAL_TYPES = new Set<string>([
    'grammar_reference', 'grammar_explanation', 'grammar',
    'scramble', 'jumble', 'unscramble', 'text_reconstruction', 'paragraph_organizer',
    'paragraph', 'list', 'questions',
    'vocabulary_table', 'vocab_table',
    'gap_fill', 'gap_fill_dropdown', 'gap_fill_drag', 'gap-fill', 'dictation',
    'error_correction', 'error-correction', 'error_correction_detect', 'find_mistake', 'spot_error',
    'typing-speed', 'typing_speed',
    'matching', 'flashcard',
    'multiple_choice', 'contextual_mc', 'conversation_check', 'best_response',
    'true_false', 'true_or_false', 'sorting',
    'speaking_jam', 'speaking_game', 'would_you_rather', 'conversation_roleplay',
    'voice_recording', 'code_block',
    'taboo', 'crossword',
]);

const present = (v: any) => v !== undefined && v !== null && v !== '';
const hasAny = (obj: any, keys: string[]) => keys.some((k) => present(obj?.[k]));
const isBoolish = (v: any) => /^(true|false|t|f)$/i.test(String(v ?? '').trim());

/** Structural inference over parsed legacy content (raw JSON strings) whose shape implies a known card. */
const detectTypeFromShape = (data: any): { type: string; data: any } => {
    if (Array.isArray(data)) {
        if (data.length === 0) return { type: '', data };
        if (data.every((x) => typeof x === 'string')) return { type: 'questions', data };
        const anyHas = (keys: string[]) => data.some((x) => x && typeof x === 'object' && hasAny(x, keys));
        const allBoolish = (key: string) => data.every((x) => !x || typeof x !== 'object' || (present(x[key]) && isBoolish(x[key])));
        if (anyHas(['question', 'prompt', 'text']) && anyHas(['options', 'choices'])) return { type: 'multiple_choice', data };
        // H5P-style MC: { question, answers: [{ text, correct }] }
        if (anyHas(['question', 'prompt', 'text']) && anyHas(['answers'])) return { type: 'multiple_choice', data };
        if (anyHas(['target']) && anyHas(['forbidden'])) return { type: 'taboo', data };
        if (anyHas(['grid']) && anyHas(['across', 'down', 'clues'])) return { type: 'crossword', data };
        if (anyHas(['front', 'back'])) return { type: 'flashcard', data };
        if (anyHas(['left', 'right'])) return { type: 'matching', data };
        if (anyHas(['optionA', 'optionB'])) return { type: 'would_you_rather', data };
        if (anyHas(['question', 'statement', 'text']) && anyHas(['answer']) && allBoolish('answer')) return { type: 'true_false', data };
        if (anyHas(['question', 'statement', 'text']) && anyHas(['correct']) && data.every((x: any) => !x || typeof x !== 'object' || (present(x.correct) && isBoolish(x.correct)))) return { type: 'true_false', data };
        if (anyHas(['sentence', 'text']) && anyHas(['correction', 'error', 'errorWord'])) return { type: 'error_correction', data };
        if (anyHas(['sentence', 'text']) && anyHas(['answer', 'correctAnswer', 'correct'])) return { type: 'gap_fill', data };
        if (anyHas(['word', 'term']) && anyHas(['definition', 'meaning', 'translation', 'ipa', 'example'])) return { type: 'vocabulary_table', data };
        if (anyHas(['speaker', 'role', 'name']) && anyHas(['text', 'line', 'content'])) return { type: 'conversation_roleplay', data };
        return { type: '', data };
    }
    if (data && typeof data === 'object') {
        const qs = data.questions;
        if (Array.isArray(qs) && qs.length > 0) {
            if (qs.some((q: any) => q && typeof q === 'object' && (Array.isArray(q.options) || Array.isArray(q.choices) || Array.isArray(q.answers)))) return { type: 'multiple_choice', data };
            if (qs.every((q: any) => q && typeof q === 'object' && present(q.answer) && isBoolish(q.answer))) return { type: 'true_false', data };
            return { type: 'questions', data: qs };
        }
        // Single H5P-style question object: { question, answers: [...] }
        if (present(data.question) && (Array.isArray(data.options) || Array.isArray(data.choices) || Array.isArray(data.answers))) return { type: 'multiple_choice', data };
        if (present(data.target) && Array.isArray(data.forbidden)) return { type: 'taboo', data };
        if (present(data.grid) && (present(data.across) || present(data.down) || Array.isArray(data.clues))) return { type: 'crossword', data };
        if (present(data.cards) && Array.isArray(data.cards) && data.cards.some((c: any) => c && typeof c === 'object' && present(c.target) && Array.isArray(c.forbidden))) return { type: 'taboo', data };
        const ss = data.sentences;
        if (Array.isArray(ss) && ss.length > 0 && ss.every((s: any) => s && typeof s === 'object')) {
            if (ss.some((s: any) => present(s.correction) || present(s.error) || present(s.errorWord))) return { type: 'error_correction', data };
            if (ss.some((s: any) => present(s.answer) || present(s.correctAnswer) || present(s.correct))) return { type: 'gap_fill', data };
        }
        if (Array.isArray(data.pairs) && data.pairs.length > 0) return { type: 'matching', data };
        if (Array.isArray(data.cards) && data.cards.length > 0 && data.cards.some((c: any) => c && typeof c === 'object' && hasAny(c, ['front', 'back', 'term', 'word']))) return { type: 'flashcard', data };
        if (Array.isArray(data.words) && data.words.length > 0) return { type: 'vocabulary_table', data };
        if (Array.isArray(data.rows) && data.rows.length > 0) return { type: 'vocabulary_table', data };
        if (Array.isArray(data.categories) && Array.isArray(data.items) && data.items.length > 0) return { type: 'sorting', data };
        if (Array.isArray(data.lines) && data.lines.length > 0) return { type: 'conversation_roleplay', data };
        if (Array.isArray(data.dialogue) && data.dialogue.length > 0) return { type: 'conversation_roleplay', data };
        if (Array.isArray(data.script) && data.script.length > 0) return { type: 'conversation_roleplay', data };
        if (present(data.topic)) return { type: 'speaking_jam', data };
        if (Array.isArray(data.prompts) && data.prompts.length > 0) return { type: 'speaking_game', data };
        if (present(data.prompt) && !present(data.minWords)) return { type: 'voice_recording', data };
        if (present(data.explanation) || present(data.rule)) return { type: 'grammar_reference', data };
        if (Array.isArray(data.items) && data.items.length > 0 && data.items.every((i: any) => typeof i === 'string')) return { type: 'questions', data: data.items };
        return { type: '', data };
    }
    return { type: '', data };
};

/**
 * Auto-detect + normalize the canonical interactive type for an activity before rendering.
 * Handles legacy exports / pasted JSON where the outer `type` label is missing, generic
 * ('activity', 'content', 'json'…), or a legacy alias, and the content is a raw JSON string
 * that embeds its own `type` field or whose shape implies a known interactive card.
 * Returns the canonical type plus the parsed data (unwrapped when content was keyed by type).
 */
export function detectActivityType(rawType: string, data: any): { type: string; data: any } {
    // 1. The outer label is already a canonical interactive type → trust it.
    const outer = canonicalType(rawType || '');
    if (KNOWN_CANONICAL_TYPES.has(outer)) return { type: outer, data };

    // 2. The content JSON may carry its own type field (old exports embed it).
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const embedded = data.type ?? data.activityType ?? data.kind ?? data.format ?? data.quizType;
        if (present(embedded)) {
            const embeddedType = canonicalType(String(embedded));
            if (KNOWN_CANONICAL_TYPES.has(embeddedType)) return { type: embeddedType, data };
        }
    }

    // 3. Structural inference over the parsed data.
    const shaped = detectTypeFromShape(data);
    if (shaped.type) return shaped;

    // 4. Legacy content keyed by its canonical type, e.g. {"multiple_choice": [...], "matching": [...]}.
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        for (const key of Object.keys(data)) {
            const keyed = canonicalType(key);
            if (KNOWN_CANONICAL_TYPES.has(keyed)) return { type: keyed, data: data[key] };
        }
    }

    // 5. Nothing detected → keep the outer label (fallback path stays for genuinely unknown content).
    return { type: outer, data };
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Tiny record/play widget used by voice activities (graceful when getUsermedia is unavailable). */
const RecorderButton: FC<{ label?: string; compact?: boolean }> = ({ label = '🎙 Record me', compact }) => {
    const [recording, setRecording] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [url, setUrl] = useState<string>('');
    const [err, setErr] = useState('');
    const recRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const stopTracks = () => {
        if (recRef.current && recRef.current.stream) {
            recRef.current.stream.getTracks().forEach((t: any) => t.stop());
        }
    };

    const toggle = async () => {
        if (recording) {
            try { recRef.current && recRef.current.stop(); } catch (e) {}
            setRecording(false);
            return;
        }
        setErr('');
        try {
            if (!navigator.mediaDevices || !(window as any).MediaRecorder) {
                setErr('Recording isn’t available in this browser — say your answer out loud, then play the model audio to compare.');
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const rec = new MediaRecorder(stream);
            chunksRef.current = [];
            rec.ondataavailable = (e: any) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
            rec.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
                if (url) URL.revokeObjectURL(url);
                setUrl(URL.createObjectURL(blob));
                stopTracks();
            };
            recRef.current = rec;
            rec.start();
            setRecording(true);
        } catch (e: any) {
            setErr('Microphone blocked — practise aloud and use the replay below as a model.');
        }
    };

    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={toggle}
                className={`text-xs font-bold rounded-lg px-3 py-1.5 transition cursor-pointer ${recording ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                {recording ? '⏹ Stop recording' : label}
            </button>
            {url && !recording && (
                <button type="button" onClick={() => setPlaying((p) => !p)}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 transition cursor-pointer">
                    {playing ? '⏸ Pause' : '▶ Play my recording'}
                </button>
            )}
            {url && (
                <audio controls src={url} className={`h-9 ${compact ? 'w-32' : 'w-52'}`} />
            )}
            {err && <p className="text-[11px] text-amber-700">{err}</p>}
        </div>
    );
};

const ActivityRenderer: FC<{ activity: Activity; learner: LearnerProfile; disableReadAloud?: boolean; isLesson?: boolean; inlineAction?: Activity; }> = ({ activity, learner, disableReadAloud, isLesson, inlineAction }) => {

    const renderContent = () => {
        const { type, data } = detectActivityType(activity.type, safeParseJSON(activity.content));
        const contentStr = typeof activity.content === 'string' ? activity.content : JSON.stringify(activity.content, null, 2);

        switch (type) {
            case 'grammar_reference':
            case 'grammar_explanation':
            case 'grammar': {
                let cards: any[] = [];
                if (Array.isArray(data)) {
                    cards = data.length > 0 && Array.isArray(data[0].cards) ? data.flatMap((d: any) => d.cards || []) : data;
                } else if (data && typeof data === 'object') {
                    cards = data.cards || [{ title: data.title || 'Grammar Rule', content: data.explanation || data.content || data.rule || '', examples: data.examples }];
                }
                return (
                    <div className="space-y-4">
                        {cards.map((c: any, i: number) => (
                            <details key={i} className="bg-white border border-emerald-200 rounded-lg shadow-sm group">
                                <summary className="bg-emerald-50 px-4 py-3 cursor-pointer font-bold text-emerald-800 list-none flex justify-between items-center rounded-t-lg group-open:border-b border-emerald-200">
                                    <span>📚 {c.title || c.rule || 'Grammar Rule'}</span>
                                </summary>
                                <div className="p-4 text-gray-700">
                                    <div dangerouslySetInnerHTML={{ __html: c.content || c.description || '' }} />
                                    {c.examples && (
                                        <div className="mt-3 pt-3 border-t border-emerald-100">
                                            <p className="font-semibold text-emerald-800 text-xs uppercase tracking-wider mb-2">Examples:</p>
                                            <ul className="list-disc pl-4 space-y-1 text-gray-600 italic">
                                                {(Array.isArray(c.examples) ? c.examples : [c.examples]).map((ex: string, idx: number) => (
                                                    <li key={idx} dangerouslySetInnerHTML={{ __html: ex }} />
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>
                );
            }
            case 'scramble':
            case 'jumble':
            case 'unscramble':
            case 'text_reconstruction':
            case 'paragraph_organizer': {
                let sentences = Array.isArray(data) ? (data.length > 0 && Array.isArray(data[0].sentences) ? data.flatMap((d: any) => d.sentences || []) : data) : (data?.sentences || data?.items || []);
                return (
                    <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                        <p className="font-bold text-cyan-800 mb-3">🔀 Unscramble Activity</p>
                        <div className="space-y-4">
                            {sentences.map((s: any, i: number) => {
                                const correct = s.correctOrder || s.answer || s.correct || (s.sentence || s.text || '').replace(/\|/g, ' ');
                                return (
                                    <div key={i} className="p-3 bg-white border border-cyan-300 rounded">
                                        <p className="text-gray-500 text-sm mb-2 font-mono">{s.words ? s.words.join(' / ') : (s.sentence || s.text || '').split('|').join(' / ')}</p>
                                        {s.hint && <p className="text-xs text-cyan-600 mb-1">💡 {s.hint}</p>}
                                        <details className="mt-2">
                                            <summary className="text-sm font-medium text-cyan-600 cursor-pointer">Show Correct Order</summary>
                                            <p className="mt-2 text-green-700 font-semibold">{correct}</p>
                                        </details>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
            case 'paragraph':
            case 'list':
            case 'questions': {
                if (Array.isArray(data) && data.every((x) => typeof x === 'string')) {
                    return (
                        <ul className="prose max-w-none text-gray-800 lesson-paragraph list-disc pl-5 space-y-1">
                            {data.map((line: string, i: number) => <li key={i} dangerouslySetInnerHTML={{ __html: cleanTableHtml(line) }} />)}
                        </ul>
                    );
                }
                return (
                    <div className="prose max-w-none text-gray-800 lesson-paragraph" dangerouslySetInnerHTML={{ __html: cleanTableHtml(contentStr) }} />
                );
            }
            case 'vocabulary_table':
            case 'vocab_table': {
                const rows = Array.isArray(data) ? data : (data?.words || data?.rows || (data?.vocab ? data.vocab : []));
                return (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm text-left text-gray-700">
                            <thead className="bg-emerald-50 text-emerald-900">
                                <tr>
                                    <th className="px-3 py-2">Word</th>
                                    {(rows[0]?.ipa || data?.rows?.[0]?.ipa) && <th className="px-3 py-2">IPA</th>}
                                    <th className="px-3 py-2">Definition</th>
                                    {rows.some((r: any) => r.translation || r.l1) && <th className="px-3 py-2">L1</th>}
                                    <th className="px-3 py-2">Example</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r: any, i: number) => (
                                    <tr key={i} className="border-t border-gray-100 align-top">
                                        <td className="px-3 py-2 font-bold text-gray-900">{r.word || r.term}</td>
                                        {rows[0]?.ipa && <td className="px-3 py-2 italic text-gray-500">/{r.ipa}/</td>}
                                        <td className="px-3 py-2">{r.definition || r.meaning}</td>
                                        {rows.some((x: any) => x.translation || x.l1) && <td className="px-3 py-2 text-gray-600">{r.translation || r.l1}</td>}
                                        <td className="px-3 py-2 italic text-gray-600">{r.example}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            case 'gap_fill':
            case 'gap_fill_dropdown':
            case 'gap_fill_drag':
            case 'gap-fill':
            case 'dictation': {
                let sentences = Array.isArray(data) ? data : (data?.sentences || data?.items || []);
                if (!Array.isArray(sentences) && data && typeof data === 'object') sentences = [data];
                return (
                    <GapFill sentences={sentences} />
                );
            }
            case 'error_correction':
            case 'error-correction':
            case 'error_correction_detect':
            case 'find_mistake':
            case 'spot_error':
            case 'typing-speed':
            case 'typing_speed':
                return <TypingErrorWorkbench type={type} data={data} />;
            case 'matching': {
                let pairs = Array.isArray(data) ? data : (data?.pairs || []);
                return <MatchingGame pairs={pairs} />;
            }
            case 'flashcard': {
                const cards = Array.isArray(data) ? data : (data?.cards || []);
                return <FlashcardDeck cards={cards} />;
            }
            case 'taboo': {
                const cards = Array.isArray(data) ? data : (data?.cards || []);
                return <TabooCards cards={cards} />;
            }
            case 'crossword': {
                return <CrosswordGrid data={data} />;
            }
            case 'multiple_choice':
            case 'contextual_mc':
            case 'conversation_check':
            case 'best_response':
                return <MultipleChoiceQuiz data={data} />;
            case 'true_false':
            case 'true_or_false':
                return <TrueFalseQuiz data={data} contentStr={contentStr} />;
            case 'sorting': {
                const categories = data?.categories || data?.groups || [];
                const items = data?.items || data?.words || [];
                return <SortingGame categories={categories} items={items} />;
            }
            case 'speaking_jam':
                return <SpeakingJam data={data} />;
            case 'speaking_game':
                return <SpeakingGameDeck data={data} />;
            case 'would_you_rather':
                return <WouldYouRather data={data} />;
            case 'conversation_roleplay':
                return <DialogueRoleplay data={data} />;
            case 'voice_recording': {
                const prompt = typeof data === 'string' ? data : (data?.prompt || data?.instruction || data?.task || '');
                return (
                    <div className="space-y-3">
                        {prompt && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-900">
                                <p className="font-semibold mb-1">🎤 Your turn</p>
                                <p className="whitespace-pre-wrap">{prompt}</p>
                                {data?.minWords && <p className="text-xs text-indigo-600 mt-1">✍️ Aim for at least {data.minWords} words.</p>}
                            </div>
                        )}
                        <RecorderButton />
                    </div>
                );
            }
            case 'code_block':
                return (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-slate-100 rounded-lg p-3 overflow-x-auto">{contentStr}</pre>
                );
            default: {
                // Friendly structured fallback — no raw code dump for unknown activity JSON
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    const entries = Object.entries(data as Record<string, any>).filter(([, v]) => v !== null && v !== undefined && v !== '');
                    if (entries.length > 0) {
                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {entries.map(([k, v], i) => (
                                    <div key={i} className="bg-white border border-slate-200 rounded-lg p-2">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{k.replace(/([A-Z])/g, ' $1')}</p>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                                    </div>
                                ))}
                            </div>
                        );
                    }
                }
                if (typeof activity.content === 'string') {
                    return <div className="prose max-w-none text-gray-800 lesson-paragraph" dangerouslySetInnerHTML={{ __html: cleanTableHtml(contentStr) }} />;
                }
                return <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{contentStr}</pre>;
            }
        }
    };

    return (
        <div className="activity-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className="text-xl font-bold text-gray-900" dangerouslySetInnerHTML={{ __html: activity.title }} />
                    {!disableReadAloud && isLesson && (
                        <ReadAloudButton text={cleanTextForSpeech(activity.title)} />
                    )}
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

/* ────────── Interactive building blocks ────────── */

const GapFill: FC<{ sentences: any[] }> = ({ sentences }) => {
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [checked, setChecked] = useState<Record<number, boolean>>({});
    const [reveal, setReveal] = useState<Record<number, boolean>>({});

    const answerOf = (s: any) => String(s?.answer || s?.correctAnswer || s?.correct || '').trim();
    const clean = (s: any) => String(s?.text || s?.sentence || '');

    return (
        <div className="space-y-3">
            {sentences.map((s: any, i: number) => {
                const answer = answerOf(s);
                const isCorrect = checked[i] && (answers[i] || '').trim().toLowerCase() === answer.toLowerCase();
                const isWrong = checked[i] && !isCorrect;
                return (
                    <div key={i} className={`p-3 rounded-lg border ${isCorrect ? 'border-emerald-300 bg-emerald-50' : isWrong ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                        <p className="text-gray-800 text-sm mb-2">{clean(s).replace(/_{3,}/g, '____')}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                value={answers[i] || ''}
                                onChange={(e) => setAnswers((p) => ({ ...p, [i]: e.target.value }))}
                                placeholder="Type your answer…"
                                disabled={checked[i]}
                                className="flex-1 min-w-40 text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white disabled:opacity-70"
                            />
                            {!checked[i] ? (
                                <button type="button" onClick={() => answer && setChecked((p) => ({ ...p, [i]: true }))}
                                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 transition cursor-pointer">Check</button>
                            ) : (
                                <span className="text-sm font-bold">{isCorrect ? '✅ Correct!' : `❌ Answer: ${answer}`}</span>
                            )}
                            <button type="button" onClick={() => setReveal((p) => ({ ...p, [i]: !p[i] }))}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline cursor-pointer">Hint</button>
                        </div>
                        {reveal[i] && <p className="text-xs text-slate-500 mt-1">💡 {s?.hint || 'Think about the lesson vocabulary and grammar from this section.'}</p>}
                    </div>
                );
            })}
            {sentences.length === 0 && <p className="text-sm text-slate-500">Add sentences to this gap-fill activity.</p>}
        </div>
    );
};

const TypingErrorWorkbench: FC<{ type: string; data: any }> = ({ type, data }) => {
    if (type === 'typing_speed' || type === 'typing-speed') {
        const target = typeof data === 'string' ? data : (data?.text || data?.passage || '');
        const [typed, setTyped] = useState('');
        const [done, setDone] = useState(false);
        if (!target) return <p className="text-sm text-slate-500">Add a passage to practise typing.</p>;
        const score = done && target ? Math.max(0, Math.round((target.split(/\s+/).filter(Boolean).length * 1) * (1 - (levenshtein(target, typed) / Math.max(target.length, 1))))) : 0;
        return (
            <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">⌨️ Type the text as fast and accurately as you can:</p>
                <p className="bg-slate-100 rounded-lg p-3 text-sm text-slate-700">{target}</p>
                <textarea value={typed} onChange={(e) => { setTyped(e.target.value); setDone(false); }} rows={2}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2" placeholder="Start typing…" />
                {!done ? (
                    <button type="button" onClick={() => setDone(true)} className="text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg px-3 py-1.5 transition cursor-pointer">Finish & check accuracy</button>
                ) : (
                    <p className="text-sm font-bold text-cyan-800">🎯 Accuracy: {Math.max(0, Math.min(100, score))}% — keep practising!</p>
                )}
            </div>
        );
    }
    // error correction
    let sentences = Array.isArray(data) ? data : (data?.sentences || []);
    const [open, setOpen] = useState<Record<number, boolean>>({});
    return (
        <div className="space-y-3">
            {sentences.map((s: any, i: number) => {
                const text = s?.sentence || s?.text || '';
                const wrong = s?.error || s?.errorWord || (s?.correction ? extractError(text, s.correction) : '');
                const fix = s?.correction || s?.correctSentence || (wrong ? text.replace(wrong, s?.correction || '___') : '');
                const full = s?.correctSentence || (s?.correction ? text.replace(wrong || '', s.correction) : '');
                return (
                    <div key={i} className={`p-3 rounded-lg border ${open[i] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                        <p className="text-gray-800 text-sm">{text}</p>
                        {s?.explanation && open[i] && <p className="text-xs text-slate-500 mt-1">💡 {s.explanation}</p>}
                        <button type="button" onClick={() => setOpen((p) => ({ ...p, [i]: !p[i] }))}
                            className="mt-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 transition cursor-pointer">
                            {open[i] ? '✍️ Hide the fix' : '🔍 Show the fix'}
                        </button>
                        {open[i] && (
                            <p className="mt-2 text-sm text-emerald-800 font-semibold">✅ {full || fix}</p>
                        )}
                    </div>
                );
            })}
            {sentences.length === 0 && <p className="text-sm text-slate-500">Add sentences with errors to correct.</p>}
        </div>
    );
};

const extractError = (sentence: string, correction: string): string => {
    // naive: first word in sentence whose lowercase equals the lowercase correction is not "the error" — placeholder:
    return '';
};

function levenshtein(a: string, b: string): number {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cur = dp[j];
            dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = cur;
        }
    }
    return dp[b.length];
}

const MatchingGame: FC<{ pairs: any[] }> = ({ pairs }) => {
    const [selLeft, setSelLeft] = useState<number | null>(null);
    const [matched, setMatched] = useState<number[]>([]);
    const lefts = pairs.map((p) => p?.left ?? p?.term ?? p?.word ?? p?.a);
    const rights = pairs.map((p) => p?.right ?? p?.match ?? p?.meaning ?? p?.b);
    const pick = (side: 'L' | 'R', idx: number) => {
        if (matched.includes(idx)) return;
        if (side === 'L') setSelLeft(idx === selLeft ? null : idx);
        else if (selLeft === idx) { setMatched((m) => [...m, idx]); setSelLeft(null); }
    };
    const done = matched.length === pairs.length && pairs.length > 0;
    const style = (active: boolean, ok: boolean) => `w-full text-left text-xs px-2.5 py-2 rounded-lg border transition cursor-pointer ${ok ? 'bg-emerald-100 border-emerald-300 text-emerald-900 opacity-50' : active ? 'bg-indigo-100 border-indigo-400 text-indigo-900' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'}`;
    return (
        <div className="space-y-3">
            {done && <p className="text-sm font-bold text-emerald-700">🎉 All {pairs.length} matched — well done!</p>}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Terms</p>
                    {lefts.map((l, i) => (
                        <button key={i} type="button" onClick={() => pick('L', i)} className={style(selLeft === i, matched.includes(i))} disabled={matched.includes(i)}>{l}</button>
                    ))}
                </div>
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Meanings</p>
                    {rights.map((r, i) => (
                        <button key={i} type="button" onClick={() => pick('R', i)} className={style(selLeft === i, matched.includes(i))} disabled={matched.includes(i)}>{r}</button>
                    ))}
                </div>
            </div>
            {pairs.length > 0 && !done && <p className="text-[11px] text-slate-400">Tap a term, then tap its meaning.</p>}
        </div>
    );
};

const FlashcardDeck: FC<{ cards: any[] }> = ({ cards }) => {
    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    if (!cards.length) return <p className="text-sm text-slate-500">Add flashcards to review.</p>;
    const card = cards[idx];
    return (
        <div className="space-y-3">
            <div onClick={() => setFlipped((f) => !f)} className="cursor-pointer select-none min-h-28 flex items-center justify-center p-5 rounded-xl border-2 text-center transition-all"
                style={flipped ? { background: '#ecfdf5', borderColor: '#34d399' } : { background: '#eff6ff', borderColor: '#93c5fd' }}>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{flipped ? 'Definition' : 'Term'}</p>
                    <p className="text-lg font-bold text-gray-900">{flipped ? (card.back || card.meaning || card.definition || '') : (card.front || card.term || card.word || '')}</p>
                    {flipped && card.example && <p className="text-xs italic text-slate-500 mt-1">“{card.example}”</p>}
                </div>
            </div>
            <div className="flex items-center justify-between">
                <button type="button" disabled={idx === 0} onClick={() => { setIdx((v) => v - 1); setFlipped(false); }} className="text-xs font-bold bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-700 rounded-lg px-3 py-1.5 transition cursor-pointer">← Prev</button>
                <span className="text-xs text-slate-500">{idx + 1} / {cards.length} · tap card to flip</span>
                <button type="button" disabled={idx === cards.length - 1} onClick={() => { setIdx((v) => v + 1); setFlipped(false); }} className="text-xs font-bold bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 transition cursor-pointer">Next →</button>
            </div>
        </div>
    );
};

const TabooCards: FC<{ cards: any[] }> = ({ cards }) => {
    if (!cards.length) return <p className="text-sm text-slate-500">Add taboo cards to play.</p>;
    const [revealed, setRevealed] = useState<Record<number, boolean>>({});
    return (
        <div className="space-y-3">
            {cards.map((c: any, i: number) => {
                const target = c?.target || c?.word || '';
                const forbidden: any[] = Array.isArray(c?.forbidden) ? c.forbidden : [];
                const open = revealed[i];
                return (
                    <div key={i} className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                        {open ? (
                            <>
                                <p className="text-center font-black text-rose-900 text-lg mb-1">🎯 {target}</p>
                                <p className="text-center text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-2">Describe it WITHOUT saying:</p>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {forbidden.map((f, fi) => (
                                        <span key={fi} className="text-xs font-bold bg-white border border-rose-300 text-rose-700 rounded-full px-2.5 py-1">🚫 {f}</span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-rose-900">Card {i + 1} of {cards.length}</p>
                                <span className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3 py-1.5 cursor-pointer" onClick={() => setRevealed((p) => ({ ...p, [i]: true }))}>
                                    🎴 Reveal card
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const CrosswordGrid: FC<{ data: any }> = ({ data }) => {
    const grid = Array.isArray(data) ? data : (data?.grid || []);
    const across = Array.isArray(data) ? [] : (data?.across || []);
    const down = Array.isArray(data) ? [] : (data?.down || []);
    const clues = Array.isArray(data) ? data : (data?.clues || []);
    const rows = grid.length ? (Array.isArray(grid[0]) ? grid : grid.map((r: any) => (typeof r === 'string' ? r.split('') : r))) : [];
    const clueList = clues.length
        ? clues
        : [...(Array.isArray(across) ? across.map((c: any) => ({ dir: 'Across', text: typeof c === 'string' ? c : c?.text || c?.clue || '' })) : []),
           ...(Array.isArray(down) ? down.map((c: any) => ({ dir: 'Down', text: typeof c === 'string' ? c : c?.text || c?.clue || '' })) : [])];
    return (
        <div className="space-y-4">
            {rows.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="mx-auto border-collapse">
                        <tbody>
                            {rows.map((row: any[], ri: number) => (
                                <tr key={ri}>
                                    {row.map((cell: any, ci: number) => {
                                        const empty = cell === null || cell === undefined || cell === '' || cell === '#' || cell === 0;
                                        return (
                                            <td key={ci} className={`w-7 h-7 text-center text-sm font-bold border border-slate-400 ${empty ? 'bg-slate-800' : 'bg-white text-slate-800'}`}>
                                                {empty ? '' : String(cell)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {clueList.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Across', 'Down'].map((dir) => {
                        const items = clueList.filter((c: any) => (c?.dir || '').toLowerCase() === dir.toLowerCase());
                        if (!items.length) return null;
                        return (
                            <div key={dir} className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-sky-700 mb-2">{dir}</p>
                                <ul className="space-y-1">
                                    {items.map((c: any, i: number) => (
                                        <li key={i} className="text-sm text-slate-700">
                                            <span className="font-bold text-sky-700 mr-1">{c?.number ?? i + 1}.</span>
                                            {c?.text || c?.clue || c}
                                            {c?.answer ? <span className="text-slate-400 italic ml-1">({c.answer})</span> : null}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}
            {!rows.length && !clueList.length && <p className="text-sm text-slate-500">Add a crossword grid and clues to solve.</p>}
        </div>
    );
};

const MultipleChoiceQuiz: FC<{ data: any }> = ({ data }) => {
    const questions: any[] = Array.isArray(data) ? data : (data?.questions || (data?.question ? [data] : []));
    const [picked, setPicked] = useState<Record<number, number>>({});
    const normalize = (v: any) => String(v || '').trim().toLowerCase();
    // H5P-style: { question, answers: [{ text, correct }] } or { question, answers: ['a','b'], correctAnswer: 0 }
    const resolveOptions = (q: any): { options: any[]; answer: string } => {
        let options: any[] = q?.options || q?.choices || [];
        let answer = q?.answer !== undefined ? String(q.answer) : '';
        if ((!options || options.length === 0) && Array.isArray(q?.answers) && q.answers.length > 0) {
            const ans = q.answers;
            if (ans.every((a: any) => typeof a === 'string')) {
                options = ans;
                const idx = q.correctAnswer;
                if (/^\d+$/.test(String(idx ?? ''))) answer = String(ans[Number(idx)]);
            } else {
                options = ans.map((a: any) => (a && typeof a === 'object' ? (a?.text ?? a?.label ?? a?.content ?? '') : String(a)));
                const idx = ans.findIndex((a: any) => a && typeof a === 'object' ? a.correct === true : false);
                if (idx >= 0) answer = String(options[idx]);
                else if (q?.correctAnswer !== undefined) answer = String(q.correctAnswer);
            }
        }
        return { options, answer };
    };
    return (
        <div className="space-y-4">
            {questions.map((q, qi) => {
                const { options, answer } = resolveOptions(q);
                const pickIdx = picked[qi];
                const correctIdx = options.findIndex((o) => normalize(o) === normalize(answer));
                const numericIdx = answer !== '' && /^\d+$/.test(answer) ? Number(answer) : -1;
                const answered = pickIdx !== undefined;
                const right = answered && (pickIdx === correctIdx || pickIdx === numericIdx || normalize(options[pickIdx]) === normalize(answer));
                const correctOpt = correctIdx >= 0 ? options[correctIdx] : (numericIdx >= 0 && options[numericIdx] !== undefined ? options[numericIdx] : answer);
                return (
                    <div key={qi} className={`p-3 rounded-lg border ${answered ? (right ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50') : 'border-slate-200 bg-white'}`}>
                        <p className="font-semibold text-gray-900 text-sm mb-2">{qi + 1}. {q?.question || q?.prompt || q?.text}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {options.map((opt: any, oi: number) => (
                                <button key={oi} type="button" disabled={answered} onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                                    className={`text-left text-xs px-3 py-2 rounded-lg border transition cursor-pointer ${answered ? (oi === correctIdx || oi === numericIdx || normalize(opt) === normalize(answer) ? 'border-emerald-400 bg-emerald-100 text-emerald-900' : normalize(opt) === normalize(options[pickIdx]) ? 'border-red-400 bg-red-100 text-red-800' : 'bg-white border-slate-200 text-slate-400') : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400'}`}>
                                    {String.fromCharCode(65 + oi)}. {opt}
                                </button>
                            ))}
                        </div>
                        {answered && (
                            <p className={`text-xs font-bold mt-2 ${right ? 'text-emerald-700' : 'text-red-700'}`}>
                                {right ? '✅ Correct!' : `❌ Correct answer: ${correctOpt}`}{q?.explanation ? ` — ${q.explanation}` : ''}
                            </p>
                        )}
                    </div>
                );
            })}
            {questions.length === 0 && <p className="text-sm text-slate-500">Add questions with options.</p>}
        </div>
    );
};

const TrueFalseQuiz: FC<{ data: any; contentStr: string }> = ({ data, contentStr }) => {
    let items: any[] = [];
    if (Array.isArray(data)) items = data;
    else if (data && typeof data === 'object') items = data?.questions || data?.items || [];
    // plain-text format "1. ... (True)"
    if (items.length === 0) {
        items = contentStr.split(/\n+/).map((l) => {
            const m = l.match(/^\s*\d+[.)]\s*(.*?)\s*\(?\s*(True|False|T|F)\s*\)?\s*$/i);
            return m ? { question: m[1], answer: /^t/i.test(m[2]) } : null;
        }).filter((x) => x && x.question);
    }
    const [picked, setPicked] = useState<Record<number, boolean | null>>({});
    return (
        <div className="space-y-3">
            {items.map((it: any, i: number) => {
                const truthy = it?.answer === true || /^true|^t$/i.test(String(it?.answer || '')) || String(it?.answer || '').toLowerCase().startsWith('true');
                const ans = picked[i];
                const answered = ans !== undefined && ans !== null;
                const right = answered && ans === truthy;
                return (
                    <div key={i} className={`p-3 rounded-lg border ${answered ? (right ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50') : 'border-slate-200 bg-white'}`}>
                        <p className="text-sm text-gray-800 mb-2">{it?.question || it?.statement || it?.text}</p>
                        <div className="flex gap-2">
                            {[true, false].map((v) => (
                                <button key={String(v)} type="button" disabled={answered} onClick={() => setPicked((p) => ({ ...p, [i]: v }))}
                                    className={`text-xs font-bold px-4 py-1.5 rounded-lg border transition cursor-pointer ${answered ? (v === truthy ? 'border-emerald-400 bg-emerald-100 text-emerald-800' : v === ans ? 'border-red-400 bg-red-100 text-red-700' : 'bg-white border-slate-200 text-slate-300') : v ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' : 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500'}`}>
                                    {v ? '✅ True' : '❌ False'}
                                </button>
                            ))}
                        </div>
                        {answered && <p className="text-xs font-bold mt-1.5 text-slate-700">{right ? '✅ Correct!' : '❌ Not quite.'}{it?.explanation ? ` ${it.explanation}` : ''}</p>}
                    </div>
                );
            })}
            {items.length === 0 && <p className="text-sm text-slate-500">Add True/False statements.</p>}
        </div>
    );
};

const SortingGame: FC<{ categories: any[]; items: any[] }> = ({ categories, items }) => {
    const cats: string[] = categories.map((c) => (typeof c === 'string' ? c : c?.name || c?.label || String(c)));
    const [placed, setPlaced] = useState<Record<number, string>>({});
    const [selItem, setSelItem] = useState<number | null>(null);
    if (!cats.length || !items.length) return <p className="text-sm text-slate-500">Add categories and items to sort.</p>;
    const done = Object.keys(placed).length === items.length;
    const correctCount = items.filter((it: any, i) => placed[i] && placed[i].toLowerCase() === String(it?.category || it?.group || '').toLowerCase()).length;
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {items.map((it: any, i: number) => {
                    if (placed[i]) return null;
                    const active = selItem === i;
                    return (
                        <button key={i} type="button" onClick={() => setSelItem(active ? null : i)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition cursor-pointer ${active ? 'border-indigo-500 bg-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'}`}>
                            {it?.text || it?.word || it?.item}
                        </button>
                    );
                })}
            </div>
            {selItem !== null && !placed[selItem] && <p className="text-[11px] text-indigo-500">Tap a category below to drop “{(items[selItem] as any)?.text || (items[selItem] as any)?.word || (items[selItem] as any)?.item}” into it.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cats.map((c, ci) => (
                    <button key={ci} type="button" disabled={selItem === null || !!placed[selItem as number]}
                        onClick={() => { if (selItem !== null) setPlaced((p) => ({ ...p, [selItem]: c })); setSelItem(null); }}
                        className={`text-left border rounded-lg p-2 min-h-16 transition ${selItem !== null ? 'cursor-pointer hover:border-indigo-400 bg-indigo-50/40' : 'bg-slate-50 cursor-default'} border-slate-200`}>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">{c}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {items.map((it: any, i: number) => placed[i] && placed[i] === c ? (
                                <span key={i} className="text-xs bg-emerald-100 text-emerald-800 rounded-full px-2.5 py-1 flex items-center gap-1">
                                    {it?.text || it?.word || it?.item}
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setPlaced((p) => { const n = { ...p }; delete n[i]; return n; }); }} className="text-emerald-600 hover:text-red-600 font-bold cursor-pointer">✕</button>
                                </span>
                            ) : null)}
                        </div>
                    </button>
                ))}
            </div>
            {done && <p className="text-sm font-bold text-emerald-700">🎉 Sorted {correctCount}/{items.length} correctly!</p>}
        </div>
    );
};

const SpeakingJam: FC<{ data: any }> = ({ data }) => {
    const topic = typeof data === 'string' ? data : (data?.topic || '');
    const rawDur = data && typeof data === 'object' ? String(data?.duration ?? data?.seconds ?? '') : '';
    const bullets = (data && typeof data === 'object' ? (data?.bullets || data?.points || data?.prompts || []) : []) as string[];
    let secs = 180;
    const mm = rawDur.match(/(\d+):(\d+)/);
    if (mm) secs = Number(mm[1]) * 60 + Number(mm[2]);
    else if (rawDur && !isNaN(Number(rawDur))) { const n = Number(rawDur); secs = n <= 15 ? Math.round(n * 60) : Math.round(n); }
    const [left, setLeft] = useState(secs || 180);
    const [running, setRunning] = useState(false);
    useEffect(() => {
        if (!running) return;
        const t = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
        return () => clearInterval(t);
    }, [running]);
    const reset = () => { setRunning(false); setLeft(secs || 180); };
    return (
        <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-indigo-900 mb-1">⏱️ Speak for {secs >= 60 ? secs / 60 : secs} {secs >= 60 ? 'minute' + (secs > 60 ? 's' : '') : 'seconds'}</p>
                <p className="text-xl font-black text-indigo-700 font-mono tabular-nums">{fmtTime(left)}</p>
                <div className="flex gap-2 justify-center mt-2">
                    {!running ? (
                        <button type="button" onClick={() => { setRunning(true); }} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-1.5 transition cursor-pointer">{left < (secs || 180) ? '▶ Resume' : '▶ Start timer'}</button>
                    ) : (
                        <button type="button" onClick={() => setRunning(false)} className="text-xs font-bold bg-slate-600 hover:bg-slate-700 text-white rounded-lg px-4 py-1.5 transition cursor-pointer">⏸ Pause</button>
                    )}
                    <button type="button" onClick={reset} className="text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg px-4 py-1.5 transition cursor-pointer">↺ Restart</button>
                </div>
            </div>
            {topic && <p className="text-sm font-semibold text-gray-800">💬 {topic}</p>}
            {bullets.length > 0 && (
                <ul className="space-y-1">
                    {bullets.map((b: string, i: number) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-indigo-500">▸</span>{b}</li>)}
                </ul>
            )}
            {!topic && !bullets.length && <p className="text-sm text-slate-500">Add a topic to discuss.</p>}
        </div>
    );
};

const SpeakingGameDeck: FC<{ data: any }> = ({ data }) => {
    const prompts = typeof data === 'string' ? [data] : (Array.isArray(data) ? data : (data?.prompts || []));
    const rounds: any[] = (Array.isArray(data) ? [] : (data?.rounds || []));
    const [idx, setIdx] = useState(0);
    const [opened, setOpened] = useState(false);
    const deck = rounds.length ? rounds.map((r) => ({
        kind: r?.type || 'challenge',
        text: r?.question || r?.prompt || r?.text || '',
        follow: r?.followUp || r?.extra || '',
    })) : prompts.map((p: any) => ({ kind: 'discussion', text: typeof p === 'string' ? p : (p?.question || p?.prompt || ''), follow: '' }));
    if (!deck.length) return <p className="text-sm text-slate-500">Add game cards (truth / dare / would-you-rather…).</p>;
    const badge = (k: string) => {
        if (/would/i.test(k)) return { label: '⚖️ Would You Rather', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
        if (/dare/i.test(k)) return { label: '😈 Dare', cls: 'bg-rose-100 text-rose-800 border-rose-200' };
        if (/truth|two_truths/i.test(k)) return { label: k.includes('two_truths') ? '🃏 Two Truths, One Lie' : '😇 Truth', cls: 'bg-sky-100 text-sky-800 border-sky-200' };
        return { label: '💬 Discussion', cls: 'bg-violet-100 text-violet-800 border-violet-200' };
    };
    const card = deck[idx];
    const meta = badge(card.kind);
    const next = () => { setOpened(false); setIdx((v) => (v + 1) % deck.length); };
    return (
        <div className="space-y-3">
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Card {idx + 1} of {deck.length}</p>
                <div className={`inline-block text-[10px] font-bold border rounded-full px-3 py-0.5 ${meta.cls}`}>{meta.label}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 min-h-24 flex flex-col items-center justify-center text-center">
                {opened ? (
                    <>
                        <p className="text-base font-bold text-gray-900">{card.text}</p>
                        {card.follow && <p className="text-xs text-slate-500 mt-1">{card.follow}</p>}
                    </>
                ) : (
                    <p className="text-slate-400 text-sm">🎴 Tap to flip your card…</p>
                )}
            </div>
            <div className="flex justify-center gap-2">
                {!opened ? (
                    <button type="button" onClick={() => setOpened(true)} className="text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-5 py-2 transition cursor-pointer">Flip card</button>
                ) : (
                    <>
                        <RecorderButton label="🎙 Answer it" compact />
                        <button type="button" onClick={next} className="text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-5 py-2 transition cursor-pointer">Next card →</button>
                    </>
                )}
            </div>
        </div>
    );
};

const WouldYouRather: FC<{ data: any }> = ({ data }) => {
    let list: any[] = [];
    if (Array.isArray(data)) list = data;
    else if (data && typeof data === 'object') list = data?.questions || data?.pairs || [];
    const [pick, setPick] = useState<Record<number, number>>({});
    const optsOf = (q: any): string[] => {
        if (q?.optionA && q?.optionB) return [q.optionA, q.optionB];
        if (q?.a && q?.b) return [q.a, q.b];
        if (q?.options) return q.options;
        return [String(q?.question || q?.text || '')];
    };
    return (
        <div className="space-y-4">
            {list.map((q: any, qi: number) => {
                const opts = optsOf(q);
                if (opts.length === 1) return (
                    <div key={qi} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800">⚖️ {opts[0]}</div>
                );
                return (
                    <div key={qi} className="p-3 rounded-lg border border-slate-200 bg-white">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">⚖️ Would you rather…</p>
                        <div className="grid grid-cols-2 gap-2">
                            {opts.map((o: string, oi: number) => (
                                <button key={oi} type="button" onClick={() => setPick((p) => ({ ...p, [qi]: oi }))}
                                    className={`text-xs p-3 rounded-xl border-2 transition cursor-pointer text-left ${pick[qi] === oi ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'}`}>
                                    {pick[qi] === oi ? '✅ ' : ''}{o}
                                </button>
                            ))}
                        </div>
                        {pick[qi] !== undefined && <p className="text-[11px] text-slate-400 mt-2">Now explain why — 30 seconds each!</p>}
                    </div>
                );
            })}
            {list.length === 0 && <p className="text-sm text-slate-500">Add would-you-rather questions.</p>}
        </div>
    );
};

const DialogueRoleplay: FC<{ data: any }> = ({ data }) => {
    const context = data && typeof data === 'object' ? (data?.context || data?.setting || data?.situation || '') : '';
    let lines: any[] = [];
    const rawLines = data && typeof data === 'object' ? (data?.lines || data?.dialogue || data?.script || (data?.model ? data.model : [])) : [];
    if (Array.isArray(rawLines)) {
        lines = rawLines.map((l: any) => (typeof l === 'string' ? { speaker: '', text: l } : { speaker: l?.speaker || l?.name || l?.role || '', text: l?.text || l?.line || l?.content || '' }));
    } else if (typeof data === 'string') {
        lines = data.split(/\n+/).map((l) => {
            const m = l.match(/^([A-Za-z]+):\s*(.*)$/);
            return m ? { speaker: m[1], text: m[2] } : { speaker: '', text: l };
        });
    }
    const yourTurns = (data && typeof data === 'object' ? (data?.yourTurn || data?.youSay || data?.learnerLines || data?.challenges || []) : []) as any[];
    const colorOf = (name: string) => {
        const i = Math.max(0, name.length % 4);
        return ['bg-sky-100 text-sky-900 border-sky-200', 'bg-emerald-100 text-emerald-900 border-emerald-200', 'bg-violet-100 text-violet-900 border-violet-200', 'bg-amber-100 text-amber-900 border-amber-200'][i];
    };
    return (
        <div className="space-y-3">
            {context && <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">📍 {context}</p>}
            <div className="space-y-2">
                {lines.map((l: any, i: number) => (
                    <div key={i} className={`flex ${l.speaker ? 'justify-start' : 'justify-start'} gap-2`}>
                        {l.speaker ? (
                            <>
                                <span className={`shrink-0 text-[10px] font-black self-end px-2 py-1 rounded-full border ${colorOf(l.speaker)}`}>{l.speaker}</span>
                                <div className="max-w-[78%] bg-slate-100 border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">{l.text}</div>
                            </>
                        ) : (
                            <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">{l.text}</div>
                        )}
                    </div>
                ))}
                {lines.length === 0 && <p className="text-sm text-slate-500">Add the dialogue lines for the model conversation.</p>}
            </div>
            {yourTurns.length > 0 && (
                <div className="border-t border-dashed border-slate-300 pt-3 mt-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-2">🎤 Now you say…</p>
                    <div className="space-y-2">
                        {yourTurns.map((y: any, i: number) => {
                            const prompt = typeof y === 'string' ? y : (y?.prompt || y?.text || y?.instruction || y?.line || '');
                            return (
                                <div key={i} className="flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
                                    <p className="text-sm text-indigo-900 flex-1">💬 {prompt}</p>
                                    <RecorderButton label="🎙" compact />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityRenderer;
