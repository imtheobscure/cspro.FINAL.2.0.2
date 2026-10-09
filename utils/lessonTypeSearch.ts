/*
 * Step 1 · Content-type search.
 *
 * A tutor does not always know the name of the format they want — they know the *need*:
 * "speaking", "conversation", "general English", "exams". So one query has to do three jobs:
 *
 *   1. match a lesson's own name, its group ("Core Learning", "Assignments") and its tier;
 *   2. match a learner *theme* — name, tagline or description — because the descriptions are
 *      where the words a tutor actually types live ("speaking confidence", "job interviews",
 *      "IELTS, TOEFL, Cambridge");
 *   3. surface every lesson type those matched themes recommend, so a search for a skill
 *      returns a shortlist instead of nothing.
 *
 * Kept pure and separate from `ManualGenerator` so it can be tested on its own — the component
 * owns the query state, this owns what the query means.
 */

import { LEARNER_CATEGORIES, type LearnerCategory } from '../data/learnerCategories';

/** The shape Step 1's grid needs — a subset of ManualGenerator's inline `contentTypes`. */
export interface LessonTypeLike {
    id: string;
    label: string;
    category: string;
    rarity: string;
}

export interface LessonTypeSearchResult<T extends LessonTypeLike> {
    /** True when a query is actually in force (an empty query shows everything). */
    searching: boolean;
    matchedThemes: LearnerCategory[];
    /** Lesson ids recommended by any matched theme. */
    themeRecommendedIds: Set<string>;
    /** The lesson types to render, in their original order. */
    results: T[];
}

/** Split a query into lowercase tokens; `""` yields no tokens. */
export function parseQuery(query: string): string[] {
    return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every token must appear somewhere in the haystack, so word order never matters. */
function matchesAllTokens(haystack: string, tokens: string[]): boolean {
    return tokens.every((token) => haystack.includes(token));
}

/** The words that should make a theme findable. */
function themeHaystack(cat: LearnerCategory): string {
    // `id` is split on dashes so "everyday conversation" matches "everyday-conversation".
    return `${cat.name} ${cat.id.replace(/-/g, ' ')} ${cat.tagline} ${cat.description}`.toLowerCase();
}

/** The words that should make a lesson type findable. */
function typeHaystack(t: LessonTypeLike): string {
    return `${t.label} ${t.category} ${t.rarity}`.toLowerCase();
}

export function searchLessonTypes<T extends LessonTypeLike>(
    query: string,
    contentTypes: T[],
    categories: LearnerCategory[] = LEARNER_CATEGORIES
): LessonTypeSearchResult<T> {
    const tokens = parseQuery(query);
    if (tokens.length === 0) {
        return { searching: false, matchedThemes: [], themeRecommendedIds: new Set(), results: contentTypes };
    }

    const matchedThemes = categories.filter((cat) => matchesAllTokens(themeHaystack(cat), tokens));
    const themeRecommendedIds = new Set(matchedThemes.flatMap((cat) => cat.recommendedLessonTypeIds));

    return {
        searching: true,
        matchedThemes,
        themeRecommendedIds,
        results: contentTypes.filter(
            (t) => matchesAllTokens(typeHaystack(t), tokens) || themeRecommendedIds.has(t.id)
        ),
    };
}
