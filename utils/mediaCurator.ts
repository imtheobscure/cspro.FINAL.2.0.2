import type { LessonMediaItem, LessonMediaType } from '../types';
import { generateContentWithRetry } from '../services/generation/core';

/** A generated lesson section as understood by the media curator (title + concise coverage). */
export interface CuratorSection {
    id?: string | number;
    title: string;
    /** Concise description of what this section covers (from the lesson's Table of Contents). */
    overview?: string;
    subtitle?: string;
    skills?: string[];
    activityHighlights?: string[];
}

export interface CuratorContext {
    lessonName?: string;
    lessonTypeLabel?: string;
    learnerName?: string;
    sections?: CuratorSection[];
}

const fmtSections = (sections: CuratorSection[] | undefined): string => {
    if (!sections || sections.length === 0) {
        return '   (sections are not listed — leave targetSection empty to distribute evenly, or type the exact heading title where the media belongs)';
    }
    return sections.map((s, i) => {
        const coverage = String(s.overview || s.subtitle || '').trim();
        const base = `   ${i + 1}. “${s.title}”`;
        if (!coverage) return base;
        return `${base}\n      📌 This section covers: ${coverage}${Array.isArray(s.skills) && s.skills.length ? `\n      Skills: ${s.skills.join(', ')}` : ''}`;
    }).join('\n');
};

/**
 * Builds the “AI Media Curator → Copy Prompt” for a finished lesson. Because the lesson
 * was already generated with a detailed per-section Table of Contents, the prompt hands
 * the AI both the exact section titles AND what each section covers, so it can decide
 * which section each picture / GIF / YouTube clip / audio / podcast belongs to.
 */
export const buildMediaCuratorPrompt = (ctx: CuratorContext): string => {
    const lines = fmtSections(ctx.sections);
    const prompt =
`You are a media curator for a FINISHED English lesson${ctx.lessonName ? ` titled “${ctx.lessonName}”` : ''}${ctx.lessonTypeLabel ? ` (${ctx.lessonTypeLabel})` : ''} for learner “${ctx.learnerName || 'the learner'}”.

The lesson content was already generated. It contains these sections — each line lists the section AND a concise description of what it covers (its Table of Contents), so you can judge exactly which media belongs where:
${lines}

YOUR ONLY JOB — find REAL, WORKING, UP-TO-DATE media for the lesson and return STRICT JSON (no markdown fences, no extra text) matching exactly this schema:

{
  "media": [
    {
      "type": "image | gif | youtube | vimeo | video | audio | podcast | embed",
      "url": "direct working URL",
      "caption": "short relevant caption",
      "altText": "accessible description",
      "sourceUrl": "creditable source page for attribution (optional)",
      "targetSection": <exact section number (1-based) or exact section title from the list above>,
      "align": "left | right | center | full",
      "width": "sm | md | lg"
    }
  ]
}

STRICT RULES:
1. Use the per-section descriptions above to pick media that truly teaches that section: vocabulary visuals for vocabulary-heavy sections, a listening clip or podcast inside the listening task, a YouTube explainer inside the deep-dive, etc. Decide how many items each section genuinely needs — as many as are truly useful, and ZERO if a section needs none. There is NO fixed count.
2. Place each item in the section where it best fits and put targetSection correctly (the exact number or exact title from the list above).
3. VERIFY EVERY LINK before returning it — it must actually work right now (2026). Never invent, guess, or hallucinate URLs, video IDs or thumbnails. YouTube IDs must be exactly 11 characters [A-Za-z0-9_-]; image URLs must be direct image files (images.unsplash.com/…, images.pexels.com/…, upload.wikimedia.org/…, media.giphy.com/…, media.tenor.com/…); audio = a real SoundCloud / Spotify track or episode link or a direct .mp3/.m4a file URL.
4. Use reputable, current sources (official channels, 2020–2026 material) and caption every item descriptively.
5. align: images, GIFs and small audio players float best as "left"/"right" (text wraps around them magazine-style); videos/embeds should be "full".
6. If you cannot verify that a link works, OMIT that item. Do not return broken, private, geo-blocked or dead links. Returning an empty "media": [] is always acceptable.
7. Repeat: return ONLY the JSON object. No preamble, no code fences.`;
    return prompt;
};

const isYoutubeUrl = (url: string) => /youtube\.com|youtu\.be/i.test(url || '');
const isDirectAudio = (url: string) => /\.(mp3|m4a|ogg|wav|aac|opus|flac)(\?|#|$)/i.test(url || '');
const isDirectVideo = (url: string) => /\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(url || '');

export const resolveMediaTypeFromUrl = (url: string): LessonMediaType => {
    const u = (url || '').trim().toLowerCase();
    if (isYoutubeUrl(u)) return 'youtube';
    if (u.includes('vimeo.com')) return 'vimeo';
    if (u.includes('soundcloud.com')) return 'audio';
    if (u.includes('spotify.com')) return 'audio';
    if (isDirectAudio(u)) return 'audio';
    if (isDirectVideo(u)) return 'video';
    if (/\.(gif)(\?|#|$)/i.test(u)) return 'gif';
    return 'image';
};

const uid = () => 'med-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

/** Maps one AI-produced media entry to a clean LessonMediaItem (used by the paste-preview AND auto-run). */
export const normalizeCuratedItem = (raw: any, index: number): LessonMediaItem | null => {
    const url = String(raw?.url || raw?.link || raw?.href || '').trim();
    if (!url && !raw?.externalUrl) return null;
    const type = (['image', 'gif', 'youtube', 'vimeo', 'video', 'audio', 'podcast', 'embed'].includes(raw?.type)
        ? raw.type
        : resolveMediaTypeFromUrl(url)) as LessonMediaType;
    const caption = String(raw?.caption || raw?.title || raw?.altText || '').trim();
    return {
        id: String(raw?.id || raw?.uid || '').trim() || uid(),
        type,
        url,
        caption,
        altText: String(raw?.altText || raw?.description || '').trim() || caption,
        sourceUrl: String(raw?.sourceUrl || raw?.source || raw?.externalUrl || '').trim() || url,
        title: String(raw?.title || raw?.caption || '').trim(),
        targetSection: (raw?.targetSection ?? raw?.sectionId ?? raw?.section ?? '') !== ''
            ? (raw.targetSection ?? raw.sectionId ?? raw.section)
            : undefined,
        align: (['left', 'right', 'center', 'full', 'auto']).includes(raw?.align) ? raw.align : 'auto',
        width: (['sm', 'md', 'lg', 'full']).includes(raw?.width) ? raw.width : 'md',
    };
};

/** Parses the AI's JSON answer (fences allowed) into normalized media items. */
export const parseCuratedMediaJson = (text: string): LessonMediaItem[] => {
    let body = String(text || '').trim();
    const fence = body.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence && fence[1]) body = fence[1].trim();
    const parsed = JSON.parse(body);
    const list = Array.isArray(parsed) ? parsed : (parsed.media || parsed.lessonMedia || parsed.items || []);
    if (!Array.isArray(list)) throw new Error('expected an array under "media"');
    const mapped = list.map(normalizeCuratedItem).filter(Boolean) as LessonMediaItem[];
    if (mapped.length === 0) throw new Error('no valid media entries found (each needs a "url")');
    return mapped;
};
