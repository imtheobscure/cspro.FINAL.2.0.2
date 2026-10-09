/**
 * CEFR-BASED GRAMMAR DICTIONARY
 * ---------------------------------
 * 8 levels (A1, A2, A2+, B1, B1+, B2, C1, C2). Every level's topics are kept
 * in the official order (easiest → hardest) and split into 3 consecutive
 * tiers: Tier 1 = first chunk, Tier 2 = middle chunk, Tier 3 = last chunk.
 *
 * Selecting a tier allows ALL topics of that tier plus every level/tier that
 * comes BEFORE it (cumulative ceiling). Topics at or below the ceiling may be
 * USED by the AI; topics above it are forbidden unless they are explicitly
 * taught in the lesson content the tutor provides.
 */

export type CefrLevelKey = 'A1' | 'A2' | 'A2+' | 'B1' | 'B1+' | 'B2' | 'C1' | 'C2';

export const CEFR_LEVEL_ORDER: CefrLevelKey[] = ['A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'C1', 'C2'];

export const CEFR_LEVEL_LABELS: Record<CefrLevelKey, string> = {
    A1: 'A1 (Beginner — Breakthrough)',
    A2: 'A2 (Elementary — Waystage)',
    'A2+': 'A2+ (Elementary Plus)',
    B1: 'B1 (Intermediate — Threshold)',
    'B1+': 'B1+ (Intermediate Plus)',
    B2: 'B2 (Upper Intermediate — Vantage)',
    C1: 'C1 (Advanced — Effective Operational)',
    C2: 'C2 (Mastery — Native-Like Proficiency)',
};

/**
 * Human names, legacy CourseLevel enum values and partial labels that all mean
 * one of the 8 CEFR levels above. Used so every screen in the app (Lesson
 * Customization, learner profiles, the Oral Interview review board) shows and
 * stores the SAME level code instead of disagreeing with each other.
 */
export const CEFR_LEVEL_ALIASES: Record<string, CefrLevelKey> = {
    'pre-a1': 'A1', 'starter': 'A1', 'beginner': 'A1', 'breakthrough': 'A1',
    'a1': 'A1', 'novice': 'A1', 'basic': 'A1',
    'elementary': 'A2', 'waystage': 'A2', 'a2': 'A2',
    'pre-intermediate': 'A2', 'pre intermediate': 'A2', 'lower elementary': 'A2',
    'a2+': 'A2+', 'elementary plus': 'A2+', 'elementary+': 'A2+',
    'intermediate': 'B1', 'threshold': 'B1', 'b1': 'B1',
    'lower intermediate': 'B1', 'lower-intermediate': 'B1',
    'b1+': 'B1+', 'intermediate plus': 'B1+', 'intermediate+': 'B1+',
    'upper-intermediate': 'B2', 'upper intermediate': 'B2', 'b2': 'B2',
    'vantage': 'B2', 'advanced intermediate': 'B2',
    'advanced': 'C1', 'c1': 'C1', 'effective operational': 'C1', 'upper advanced': 'C1',
    'expert': 'C2', 'c2': 'C2', 'master': 'C2', 'mastery': 'C2',
    'proficient': 'C2', 'native': 'C2', 'native-like': 'C2',
};

/**
 * Normalises any CEFR-ish string ('Upper-Intermediate', 'B2 (Vantage)', 'b2')
 * into one of the exact CEFR_LEVEL_ORDER codes. Returns `fallback` when the
 * value cannot be understood.
 */
export function normalizeCefrLevel(value: any, fallback: CefrLevelKey = 'B1'): CefrLevelKey {
    if (value === undefined || value === null || value === '') return fallback;
    const text = String(value).trim();
    const upper = text.toUpperCase();
    if ((CEFR_LEVEL_ORDER as string[]).includes(upper)) return upper as CefrLevelKey;
    // Labels such as "B2 (Upper Intermediate — Vantage)"
    const head = (text.split(/[\s(\u2014-]/)[0] || '').toUpperCase();
    if ((CEFR_LEVEL_ORDER as string[]).includes(head)) return head as CefrLevelKey;
    const lower = text.toLowerCase();
    if (CEFR_LEVEL_ALIASES[lower]) return CEFR_LEVEL_ALIASES[lower];
    if (CEFR_LEVEL_ALIASES[head.toLowerCase()]) return CEFR_LEVEL_ALIASES[head.toLowerCase()];
    const prefixed = lower.match(/^(pre-a1|a1|a2\+|a2|b1\+|b1|b2|c1|c2)\b/);
    if (prefixed && (CEFR_LEVEL_ORDER as string[]).includes(prefixed[1].toUpperCase())) {
        return prefixed[1].toUpperCase() as CefrLevelKey;
    }
    return fallback;
}

/** Official grammar topics per level, in the original easy → difficult order. */
const RAW_TOPICS: Record<CefrLevelKey, string[]> = {
    A1: [
        'Statements with be',
        'Articles a/an',
        'Regular plural nouns',
        'Need and have',
        'Possessive adjectives',
        'Questions with who and what',
        'Negative statements with be',
        'Yes/no questions with be',
        'Live and work',
        'Adjective + noun placement',
        'Prepositions of location',
        'There is/There are',
        'Questions with where + be',
        'Prepositions of placement',
        'Questions with when + be',
        'Prepositions of time',
        'The imperative: Affirmative and negative',
        'Regular and irregular plurals',
        'Simple present: Affirmative and negative statements',
        'Simple present: Yes/no questions and short answers',
        'Simple present: Wh-question and answers',
        'Count / Non-count nouns',
        'Some, any',
        'Can and could for requests',
        'Some and any as indefinite pronouns',
        'Like, want, need + infinitive',
        'Prepositions of place: At, on, in',
        'Possessive nouns',
        'This/that/these/those',
        'Present continuous: Statements and questions',
        'Adverbs of frequency',
        'Simple past with be',
        'Simple past: Statements and yes/no questions',
        'Simple past: Wh-questions and irregular verbs',
    ],
    A2: [
        'Questions with who and what; Answers',
        'Be vs. have for description',
        'Can for ability',
        'Verbs + infinitives and gerunds',
        'Questions with whose',
        'Possessive nouns and pronouns',
        'Comparative adjectives: Regular and irregular',
        'Present continuous for the future',
        'Object pronouns',
        'Will for future intention',
        'Should for advice and suggestions',
        'Prepositions of movement',
        'Questions with How much and How many',
        'Some / any with count and non-count nouns',
        'Would like for preferences and polite requests',
        'Simple past, yes/no and wh-questions',
        'Future plans with be going to',
    ],
    'A2+': [
        'Present continuous for temporary situations',
        'Simple past + when, before, and after',
        "Suggestions with Let's and Why don't",
        'Sensory verbs + like',
        'Be + adjective + infinitive',
        'Adverbs of degree and manner',
        'Participial adjectives',
        'Present perfect for past experiences',
        'Ability / Inability in the past',
        'Count and non-count nouns with some, any, and no',
        'Much / Many / A lot of and How much / How many',
        'Enough and Too much / Too many + nouns',
        'Could and should for suggestions',
        'Will, may, and might to express likelihood',
        'Have to / Need to for obligation and necessity',
        'Too and enough + adjectives',
        'Verbs + two objects',
        'Past continuous; past continuous with when',
        'Gerunds as objects of prepositions',
        'Would like / love / hate + infinitive',
        'Superlative adjectives',
        'Questions about the subject and object',
        'So / Because (of) to show cause and effect',
        'Time expressions',
        'Future with will, be going to, present continuous, and simple present',
        'Indirect questions',
        'Adverbs and adverbial phrases of place',
        'Tag questions',
        'Present perfect with for and since; how long and ever',
        'Information questions with the present perfect',
    ],
    B1: [
        'No article',
        'Restrictive relative clauses',
        'Sequence of adjectives',
        'Must / may / might / could for conclusions',
        'Present perfect and present perfect continuous',
        'Expressing cause and effect with so / such...that',
        'Object complements',
        'Making suggestions',
        'Imperatives in reported speech',
        'Used to and would',
        'So, neither, too, and either with simple present action verbs',
        'Simple present and simple past passives',
        'Expressing preference with would rather and would prefer',
        'Quantifiers',
        'Gerunds as subjects and objects',
        'Past forms of be + going to for past intentions',
        'Embedded wh-questions',
        'Comparisons with as...as',
        'Phrasal verbs with objects',
        'May / might / could with the continuous to show possibility',
        'Subordinating conjunctions in time clauses',
        'Future real conditional',
        'Reflexive pronouns',
        'Past continuous with while and when',
        'Infinitives of purpose',
        'Noun clauses with that',
        'Present unreal conditional',
        'Past perfect',
    ],
    'B1+': [
        'Get to express change',
        'So and such',
        'Though, although, and even though',
        'Reported speech',
        'Defining relative clauses',
        'So and therefore',
        'Negative questions',
        'Adverbial intensifiers with adjectives',
        'Think, imagine, and wonder for requests',
        'While and whereas',
        'Past intentions',
        'So, too, neither, and either',
        'Plans and intentions for the future',
        'Past perfect',
        'Present perfect passive',
        'Do / did as a verb substitute',
        'Reduced defining relative clauses',
        'Passive causatives',
        'Would rather (than)',
        'Wish / If only to express regrets',
        'Showing purpose',
        'Even to emphasize a point',
        'Causative verbs: get, have, and make',
        'Advice, obligation, and expectation',
        'Unless',
        'Embedded yes/no questions',
        'Questions with final prepositions',
        'Repeated and parallel comparatives',
    ],
    B2: [
        'What clauses for emphasis',
        'By to explain how',
        'As long as, providing (that), unless',
        'Past unreal conditional',
        'Connectives to express contrast and surprise',
        'Not only...but also',
        'Be supposed to',
        'Future continuous',
        'Reduced restrictive relative clauses',
        'Past perfect continuous',
        'Need with gerunds and passive infinitives',
        'Infinitives as subject complements',
        "You, they, can/can't, could/couldn't for general truths",
        'Comparisons with gerund and noun phrases',
        'It + past passive',
        'Modals for past regrets and possibilities',
        'Comparisons between clauses',
        'Would / Do you mind for permission and requests',
        'Modals with the passive',
        'Likely and certain + infinitive',
        'Do or did for emphasis',
        'Non-restrictive relative clauses for comments',
    ],
    C1: [
        'Present perfect vs. simple past',
        'Indefinite pronouns',
        'Types of adverbs',
        'Present and future unreal conditional',
        'Present real conditional',
        'Verb + gerund vs. infinitive',
        'Gerund usage',
        'Verb + object + infinitive',
        'Articles for general and specific nouns',
        'Quantifiers with singular vs. plural verbs',
        'Articles for known and unknown information',
        'Reported speech patterns',
        'Changes in reported speech',
        'Common reporting verbs',
        'Probability and certainty in the future',
        'Expressing future time',
        'Passive voice: Form and use',
        'Passive voice: Reporting structures',
        'Passive infinitives and causatives',
        'Modifying relative clauses',
        'Particle clauses',
        'Infinitive clauses',
        'Modals for speculation and expectation',
        'Expressing necessity and obligation',
        'Permission, strong advice, and prohibition',
        'Future in the past',
        'Past perfect and past perfect continuous',
    ],
    C2: [
        'Noun clauses as subjects, objects, and complements',
        'More ways to express future time',
        'Preparatory subjects: it, here, and there',
        'Passive voice: agent versus no agent',
        'Causative verbs',
        'Active versus passive reporting',
        'Modals for speculation about the past',
        'Modals for expectation',
        'Passive modals',
        'Restrictive and non-restrictive relative clauses',
        'Relative clauses after prepositions and quantity expressions',
        'Reducing relative clauses to phrases',
        'Negative gerunds and infinitives',
        'Perfect gerunds and infinitives',
        'Reduced adverb time clauses',
        'Cause and effect in participial phrases',
        'Participial adjectives and nouns as adjectives',
        'Implied conditionals',
        'Inverted conditionals',
        'Hope and wish',
        'Articles',
        'Too and enough',
        'Adverbs',
    ],
};

/** Split an ordered topic list into 3 consecutive tiers (easy → difficult). */
const splitIntoTiers = (topics: string[]): string[][] => {
    const n = topics.length;
    const t1 = Math.ceil(n / 3);
    const t2 = Math.ceil((n - t1) / 2);
    return [topics.slice(0, t1), topics.slice(t1, t1 + t2), topics.slice(t1 + t2)];
};

/** level -> tier index (0,1,2) -> topics */
export const CEFR_GRAMMAR_TIERS: Record<CefrLevelKey, string[][]> = Object.fromEntries(
    CEFR_LEVEL_ORDER.map(level => [level, splitIntoTiers(RAW_TOPICS[level])])
) as Record<CefrLevelKey, string[][]>;

export const TIER_NAMES = ['Tier 1 · Easy', 'Tier 2 · Medium', 'Tier 3 · Advanced'] as const;

/** Topics of one specific tier of one level (non-cumulative). */
export const getCefrTierTopics = (level: string, tier: number): string[] => {
    const lvl = CEFR_GRAMMAR_TIERS[level as CefrLevelKey];
    if (!lvl) return [];
    const idx = Math.min(Math.max(tier - 1, 0), 2);
    return lvl[idx] || [];
};

export interface CefrAllowedRange {
    level: CefrLevelKey;
    tier: number; // 1..3 (only meaningful for the selected level)
    topics: string[];
    isSelectedTier: boolean;
}

/**
 * Cumulative allowed grammar: every topic of the selected tier of the selected
 * level PLUS every topic of every level/tier before it.
 */
export const getCumulativeCefrTopics = (level: string, tier: number): CefrAllowedRange[] => {
    const selectedIdx = CEFR_LEVEL_ORDER.indexOf(level as CefrLevelKey);
    if (selectedIdx === -1) return [];
    const ranges: CefrAllowedRange[] = [];
    for (let i = 0; i <= selectedIdx; i++) {
        const lvl = CEFR_LEVEL_ORDER[i];
        const tierTopics = CEFR_GRAMMAR_TIERS[lvl];
        if (i < selectedIdx) {
            ranges.push({ level: lvl, tier: 3, topics: tierTopics.flat(), isSelectedTier: false });
        } else {
            const idx = Math.min(Math.max(tier - 1, 0), 2);
            const topics = tierTopics.slice(0, idx + 1).flat();
            ranges.push({ level: lvl, tier: Math.min(Math.max(tier, 1), 3), topics, isSelectedTier: true });
        }
    }
    return ranges;
};

export const countCumulativeCefrTopics = (level: string, tier: number): number =>
    getCumulativeCefrTopics(level, tier).reduce((sum, r) => sum + r.topics.length, 0);

/** Human-readable grouped list, used by the hover popup in the Lesson Creator. */
export const formatCefrAllowedForHover = (level: string, tier: number): string => {
    const ranges = getCumulativeCefrTopics(level, tier);
    const lines: string[] = [];
    ranges.forEach(r => {
        const tierTag = r.isSelectedTier ? ` · through Tier ${r.tier}` : ' · all tiers';
        lines.push(`📘 ${r.level}${tierTag}: ${r.topics.join(' · ')}`);
    });
    return lines.join('\n');
};

/**
 * LEVEL GUARD — the most common above-level structures that are FORBIDDEN at each
 * ceiling level (i.e. structures that belong to levels ABOVE the ceiling). Each
 * list is curated for the ceiling level: ceiling A1 bans almost everything above
 * A1; ceiling B2 only bans C1/C2 traps; ceiling C2 bans nothing.
 */
export const LEVEL_GUARD_BANS: Record<CefrLevelKey, string[]> = {
    A1: [
        'The word "would" in ANY form ("would like", "I would", "would you")',
        'Future forms: "will", "going to", "shall"',
        'Obligation / speculation modals: "should", "must", "have to", "may", "might"',
        'Perfect tenses: "have/has done", "had done" (present perfect, past perfect)',
        'Passive voice ("is made", "was built")',
        'Reported speech ("He said that…", "She told me…")',
        'Relative clauses with who / which / that',
        'Gerunds (…ing) as a subject or after prepositions — only the present continuous is allowed',
        'Comparatives and superlatives (-er / more / -est / most, "better", "best")',
        'Conditionals ("if … will/would")',
        '"used to"',
        'Tag questions ("…, isn\'t it?")',
        'Embedded questions ("Do you know where…?")',
        '"too / enough + adjective", "so … that"',
        '"either / neither", "so do I"',
    ],
    A2: [
        'Perfect tenses: present perfect, past perfect, present perfect continuous',
        'Passive voice',
        'Reported speech',
        'Relative clauses with who / which / that',
        'Conditionals ("if … will/would")',
        'Superlatives (-est / most, "the best")',
        'Past continuous ("was doing")',
        'Tag questions ("…, isn\'t it?")',
        'Embedded questions ("Do you know where…?")',
        '"used to", "would" for past habits',
        'Speculation modals: "must / may / might / could" for conclusions or likelihood',
        '"have to / need to" for obligation',
        '"too / enough + adjective", "so / such … that"',
        '"unless"',
        'Gerunds as subjects ("Swimming is fun")',
    ],
    'A2+': [
        'Passive voice',
        'Reported speech',
        'Relative clauses (defining or non-defining)',
        'Conditionals ("if … will/would")',
        'Past perfect ("had done")',
        '"used to", "would" for past habits',
        '"wish / if only"',
        'Causative verbs ("get/have/make someone do something")',
        '"unless"',
        '"though / although / even though"',
        '"so … that / such … that"',
        'Echo responses ("so do I", "neither do I")',
        '"must" for strong obligation',
        'Modals for conclusions ("must be", "could be")',
        'Comparisons with "as … as"',
    ],
    B1: [
        'Reported speech ("He said that…")',
        '"wish / if only" for regrets',
        'Causative verbs ("get/have/make someone do something")',
        '"unless"',
        '"though / although / even though"',
        'Reduced relative clauses ("the man standing there")',
        'Past perfect continuous',
        'Future continuous ("will be doing")',
        'Past unreal conditional ("If I had known…")',
        '"be supposed to"',
        'Passive modals ("must be done", "can be found")',
        '"not only … but also"',
        '"would / do you mind" for permission and requests',
        '"as long as / providing (that)"',
        'Emphatic "do/did" ("I do like it")',
    ],
    'B1+': [
        'Past unreal conditional ("If I had known…")',
        'Future continuous ("will be doing")',
        'Past perfect continuous',
        'Non-restrictive relative clauses ("My brother, who lives…")',
        'Passive modals ("must be done", "can be found")',
        '"not only … but also"',
        '"be supposed to"',
        '"would / do you mind" for permission and requests',
        '"as long as / providing (that)"',
        'Passive reporting with the infinitive ("is believed to be", "is said to have")',
        'Advanced reporting verbs ("admit", "deny", "insist")',
        'Inverted conditionals ("Had I known…")',
        'Perfect gerunds and infinitives ("having done", "to have done")',
    ],
    B2: [
        'Passive reporting structures with the infinitive ("is believed to be", "is said to have")',
        'Advanced reporting verbs ("admit", "deny", "insist" + patterns)',
        'Future in the past ("would go on to", "was to become")',
        'Modals for speculation about the past ("must have done", "could have been")',
        'Inverted conditionals ("Had I known…")',
        'Perfect gerunds and infinitives ("having done", "to have done")',
        'Negative gerunds and infinitives ("not having", "not to be")',
        'Reduced adverb time clauses ("While walking home…")',
        'Implied conditionals ("Without your help…")',
        'Relative clauses after prepositions or quantity expressions ("the people with whom…", "some of whom…")',
        'Cause and effect in participial phrases ("Being tired, she…")',
        'Passive modals of speculation ("may have been done")',
    ],
    C1: [
        'Inverted conditionals ("Had I known…")',
        'Perfect gerunds and infinitives ("having done", "to have done")',
        'Passive modals for past speculation ("must have been done")',
        'Reduced adverb time clauses ("While walking home…")',
        'Implied conditionals ("Without your help…")',
        'Relative clauses after prepositions or quantity expressions',
        'Cause and effect in participial phrases ("Being tired, she…")',
        'Preparatory "it" subjects ("It is important to…", "It seems that…")',
    ],
    C2: [],
};

/** Banned above-level structures for the given ceiling level (LEVEL GUARD checklist). */
export const buildLevelGuardChecklist = (level: string): string[] =>
    LEVEL_GUARD_BANS[level as CefrLevelKey] || [];

// ─────────────────────────────────────────────────────────────────────────────
// SYLLABUS CHAPTER LEVEL GUARD
// ─────────────────────────────────────────────────────────────────────────────

const TOPIC_STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'with', 'for', 'in', 'on', 'at', 'to', 'of', 'no', 'so', 'as', 'be', 'by', 'vs']);

/** Too generic to identify a grammar topic when found alone. */
const GENERIC_TOPIC_WORDS = new Set([
    'present', 'past', 'future', 'simple', 'questions', 'time', 'place', 'work', 'live', 'going',
    'will', 'do', 'did', 'make', 'get', 'even', 'think', 'want', 'like', 'love', 'need', 'plans',
    'used', 'may', 'might', 'must', 'should', 'would', 'could', 'can', 'adverbs', 'adjectives',
    'nouns', 'verbs', 'prepositions', 'clauses', 'phrases', 'expressions', 'pronouns', 'sentences',
]);

/**
 * Best-effort CEFR guess: finds the dictionary topic whose content words appear
 * most completely (in order) inside the given text. Returns the best match or
 * null when nothing recognizable is found.
 */
export const matchCefrTopicInText = (text: string): { level: CefrLevelKey | null; topic: string | null; score: number } => {
    const t = ' ' + String(text || '').toLowerCase().replace(/\s+/g, ' ').trim() + ' ';
    let best: { level: CefrLevelKey; topic: string; score: number } | null = null;
    for (const level of CEFR_LEVEL_ORDER) {
        for (const topic of RAW_TOPICS[level]) {
            const words = topic.toLowerCase().split(/[^a-z']+/).filter(w => w.length > 2 && !TOPIC_STOP_WORDS.has(w));
            if (words.length < 2) continue;
            // Count topic words found in the text in order, and also in reverse order
            // (handles swaps like "present simple" vs "simple present").
            const countOrdered = (rev: boolean) => {
                let found = 0;
                let idx = rev ? t.length : -1;
                const seq = rev ? [...words].reverse() : words;
                for (const w of seq) {
                    const pos = rev ? t.lastIndexOf(w, idx - 1) : t.indexOf(w, idx + 1);
                    if (pos === -1) break;
                    idx = pos;
                    found++;
                }
                return found;
            };
            const found = Math.max(countOrdered(false), countOrdered(true));
            // All topic words present anywhere in the text (any order) — used for scoring
            // so a real "simple present" hit beats a "present perfect vs simple past"
            // topic that merely contains the same words scattered around.
            const matchedWords = words.filter(w => t.includes(w));
            // Accept 2+ words in order, or at least 1 DISTINCTIVE word (a single-word hit
            // like "conditional" still flags the chapter as above-level). Generic words
            // like "present"/"future" alone are ignored.
            const hasDistinctive = matchedWords.some(w => !GENERIC_TOPIC_WORDS.has(w));
            if (found >= 2 || (found >= 1 && matchedWords.length >= 1 && hasDistinctive)) {
                // A single distinctive word of a short topic is a weak signal — cap its
                // score so a real 2+ word match on the correct level wins.
                const rawScore = matchedWords.length / words.length;
                const score = matchedWords.length === 1 ? Math.min(rawScore, 0.3) : rawScore;
                if (!best || score > best.score || (score === best.score && CEFR_LEVEL_ORDER.indexOf(level) < CEFR_LEVEL_ORDER.indexOf(best.level))) {
                    best = { level, topic, score };
                }
            }
        }
    }
    return best ? best : { level: null, topic: null, score: 0 };
};

export type ChapterCefrRelation = 'below' | 'allowed' | 'above' | 'unknown';

export interface ChapterCefrGuard {
    level: CefrLevelKey | null;
    topic: string | null;
    relation: ChapterCefrRelation;
}

/**
 * Level-guard position of a syllabus chapter relative to the selected ceiling.
 * - below:   chapter grammar belongs to a level BELOW the ceiling → preferred, use freely
 * - allowed: chapter grammar is inside the cumulative allowed topics of the ceiling → fine
 * - above:   chapter grammar is ABOVE the ceiling → topic/vocabulary only, grammar blocked
 * - unknown: no dictionary topic recognizable → keep everything within the ceiling
 */
export const getChapterCefrGuard = (chapter: any, ceilingLevel: string, ceilingTier?: number): ChapterCefrGuard => {
    const tier = typeof ceilingTier === 'number' && ceilingTier >= 1 && ceilingTier <= 3 ? ceilingTier : 1;
    const text = [
        chapter?.grammar,
        chapter?.title,
        chapter?.description,
        Array.isArray(chapter?.vocabulary) ? chapter.vocabulary.join(' ') : '',
    ].filter(Boolean).join(' | ');
    const { level, topic } = matchCefrTopicInText(text);
    if (!level) return { level: null, topic: null, relation: 'unknown' };

    const selectedIdx = CEFR_LEVEL_ORDER.indexOf(ceilingLevel as CefrLevelKey);
    if (selectedIdx === -1) return { level, topic, relation: 'unknown' };
    const levelIdx = CEFR_LEVEL_ORDER.indexOf(level);
    if (levelIdx < selectedIdx) return { level, topic, relation: 'below' };
    if (levelIdx > selectedIdx) return { level, topic, relation: 'above' };
    // Same level → only allowed when the matched topic is inside the selected tier's cumulative range.
    const allowed = new Set(getCumulativeCefrTopics(ceilingLevel, tier).flatMap(r => r.topics));
    return allowed.has(topic as string)
        ? { level, topic, relation: 'allowed' }
        : { level, topic, relation: 'above' };
};

/** Priority rank used to order chapters (below-ceiling first, above-ceiling last). */
export const chapterGuardRank = (relation: ChapterCefrRelation): number =>
    relation === 'below' ? 0 : relation === 'allowed' ? 1 : relation === 'unknown' ? 2 : 3;


/**
 * NON-NEGOTIABLE prompt block injected into every Copy AI prompt.
 * The dictionary acts as a strict CEILING: the AI may USE the allowed grammar,
 * must NEVER use grammar above it, and must NOT teach/explain the listed topics.
 */
export const buildCefrGrammarConstraintBlock = (level: string, tier: number): string => {
    const ranges = getCumulativeCefrTopics(level, tier);
    if (ranges.length === 0) return '';
    const totalTopics = ranges.reduce((s, r) => s + r.topics.length, 0);

    const listText = ranges.map(r => {
        const tierTag = r.isSelectedTier ? `[Tier 1-${r.tier}]` : '[Tier 1-3]';
        return `- ${r.level} ${tierTag}: ${r.topics.join('; ')}`;
    }).join('\n');

    const bans = buildLevelGuardChecklist(level);
    const guardText = bans.length > 0
        ? `\n\n--- 🚧 LEVEL GUARD — FINAL SELF-AUDIT CHECKLIST (${level} · Tier ${tier}/3) ---
Before you write ANY sentence of ANY section, run this checklist. If any item below appears in your output and it is NOT reproduced exactly as it appears in the lesson content, REWRITE that sentence at the allowed level. This is the last thing you check before returning the lesson.
1. ❌ VOCABULARY GUARD: Build the word list ONLY from the lesson content (PDF / text / sample dialogue) the tutor provides — every word you write must already appear in it, used in the same sense. Never "upgrade" a word to a higher-register synonym, never add a rare or advanced word to "enrich" the text, never use idiomatic expressions that are not in the content. When NO lesson content is provided, use only the most frequent, everyday words of ${level} and below.
2. ❌ BANNED STRUCTURES — the most common above-level slips, ALL FORBIDDEN:
   - ${bans.join('\n   - ')}
3. ❌ SENTENCE STRUCTURE: every sentence must be a structure the lesson content itself uses (same length, same word order, same clause types). Never write a sentence whose grammar exceeds the ceiling, even if the words are simple.
`
        : '';

    return `\n\n--- 🔒 CEFR GRAMMAR DICTIONARY — NON-NEGOTIABLE LANGUAGE CEILING (${level} · Tier ${tier}/3) ---
A strict grammar dictionary is ACTIVE for this learner. It is a HARD, NON-NEGOTIABLE constraint on the language YOU may produce. It is NOT content to teach.

WHAT THIS MEANS:
1. GRAMMAR CEILING: You may ONLY use grammar covered by the allowed topics below: every topic of the selected tier (Tier ${tier} of ${level}) PLUS every topic of all levels and tiers before it. NEVER use any grammar structure from a level above this ceiling — in ANY part of the lesson: dialogues, examples, questions, answer options, explanations, feedback, instructions, activities, quizzes, homework, titles, or the settings JSON. For example, if the ceiling is A1, the word "would" and any conditional, perfect, or passive structure is FORBIDDEN everywhere.
2. THE ONLY EXCEPTION: grammar that is EXPLICITLY taught or that actually appears in the lesson content (PDF / text / sample dialogue) the tutor provides MAY be reproduced exactly as it appears there — never extend it into new structures above the ceiling.
3. WORD CEILING: Recycle the lesson's own language. Every word you write MUST come from the lesson content when content is provided. Without content, use only the most frequent, everyday words of ${level} and below. Never introduce above-level vocabulary to "enrich" the lesson.
4. SENTENCE STRUCTURE: Use only sentence structures that match ${level} Tier ${tier}: short simple sentences with basic word order at beginner tiers, gradually longer and more complex sentences only as the tier rises. Never write sentences whose grammar exceeds the ceiling.
5. RECYCLING PRINCIPLE: Mirror the exact language level of the lesson content — same words, same structures, same register. If the content uses simple present and short sentences, every generated sentence must too.
6. ANTI-CONFUSION (CRITICAL): The topics below are a CONSTRAINT ONLY. DO NOT teach, explain, define, demonstrate, list, or create exercises ABOUT these grammar topics. Do not add a grammar section for them, do not name them in titles or instructions, and do not mention this grammar dictionary anywhere in the lesson output. Generate the lesson as if the dictionary did not exist — simply let it silently limit your language.${guardText}

ALLOWED GRAMMAR (${totalTopics} topics, cumulative):
${listText}
`;
};