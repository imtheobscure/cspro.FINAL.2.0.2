import React, { FC, useMemo, useState } from 'react';
import type { LessonMediaItem, LessonMediaType } from '../../types';
import {
    LESSON_MEDIA_CSS,
    detectMediaProvider,
    extractYoutubeId,
    mediaBlockHtml,
    planMediaPlacement,
    visibleTextLength,
    type MediaOutlineSection,
    type MediaPlacement,
} from '../../utils/lessonMedia';
import { searchMediaWithFallback } from '../../utils/mediaSearchClient';

type MediaFindKind = 'image' | 'gif' | 'video' | 'audio' | 'podcast';
type CheckStatus = 'checking' | 'ok' | 'broken' | 'warning';
type MediaCheck = { status: CheckStatus; message: string };

export interface StudioSection {
    id?: string | number;
    title: string;
    subtitle?: string;
    /**
     * The section's activities, in the order the lesson renders them.
     *
     * Needed for the placement preview: "where will this land" is answered in
     * section → activity terms, and the plan has to be computed over the same
     * outline the renderer will read out of the generated HTML. Without this the
     * studio could only promise a section, not the card inside it.
     */
    activities?: { title?: string; type?: string; content?: unknown }[];
}

interface Props {
    items: LessonMediaItem[];
    sections?: StudioSection[];
    lessonName?: string;
    lessonTypeLabel?: string;
    learnerName?: string;
    onChange: (items: LessonMediaItem[]) => void;
    onChecksChange?: (counts: { broken: number; total: number }) => void;
}

const TYPE_META: Record<LessonMediaType, { label: string; icon: string; chip: string; chipCls: string }> = {
    image:    { label: 'Image',   icon: '🖼️', chip: 'bg-blue-50 text-blue-700 border-blue-200', chipCls: '' },
    gif:      { label: 'GIF',     icon: '✨', chip: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', chipCls: '' },
    youtube:  { label: 'YouTube', icon: '▶️', chip: 'bg-red-50 text-red-700 border-red-200', chipCls: '' },
    vimeo:    { label: 'Vimeo',   icon: '🎞️', chip: 'bg-cyan-50 text-cyan-700 border-cyan-200', chipCls: '' },
    video:    { label: 'Video',   icon: '🎬', chip: 'bg-orange-50 text-orange-700 border-orange-200', chipCls: '' },
    audio:    { label: 'Audio',   icon: '🎧', chip: 'bg-amber-50 text-amber-700 border-amber-200', chipCls: '' },
    podcast:  { label: 'Podcast', icon: '🎙️', chip: 'bg-violet-50 text-violet-700 border-violet-200', chipCls: '' },
    embed:    { label: 'Embed',   icon: '🔗', chip: 'bg-gray-100 text-gray-700 border-gray-300', chipCls: '' },
};

const ADD_OPTIONS: { type: LessonMediaType; label: string; icon: string }[] = [
    { type: 'image',   label: 'Image',   icon: '🖼️' },
    { type: 'gif',     label: 'GIF',     icon: '✨' },
    { type: 'youtube', label: 'YouTube', icon: '▶️' },
    { type: 'video',   label: 'Video/MP4', icon: '🎬' },
    { type: 'vimeo',   label: 'Vimeo',   icon: '🎞️' },
    { type: 'audio',   label: 'Audio',   icon: '🎧' },
    { type: 'podcast', label: 'Podcast', icon: '🎙️' },
    { type: 'embed',   label: 'Embed',   icon: '🔗' },
];

const uid = () => 'med-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

const fmt = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;

const isYoutubeUrl = (url: string) => /youtube\.com|youtu\.be/i.test(url || '');
const isDirectAudio = (url: string) => /\.(mp3|m4a|ogg|wav|aac|opus|flac)(\?|#|$)/i.test(url || '');
const isDirectVideo = (url: string) => /\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(url || '');

const findKindForItem = (item: LessonMediaItem): MediaFindKind => {
    switch (item.type) {
        case 'gif': return 'gif';
        case 'youtube': return 'video';
        case 'video':
        case 'vimeo': return 'video';
        case 'audio': return 'audio';
        case 'podcast': return 'podcast';
        default: return 'image';
    }
};

const resolveTypeFromUrl = (url: string): LessonMediaType => {
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

/** Map an arbitrary AI/paste JSON entry into a clean LessonMediaItem. */
const normalizeItem = (raw: any, index: number): LessonMediaItem | null => {
    const url = String(raw?.url || raw?.link || raw?.href || '').trim();
    if (!url && !raw?.externalUrl) return null;
    const type = (['image', 'gif', 'youtube', 'vimeo', 'video', 'audio', 'podcast', 'embed'].includes(raw?.type)
        ? raw.type
        : resolveTypeFromUrl(url)) as LessonMediaType;
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

/**
 * "Where will this land?", answered with the same function the renderer uses.
 *
 * The preview is a real media block — built by the lesson's own block builder and
 * styled by the lesson's own stylesheet — inside a sandboxed frame, next to text that
 * wraps around it. So what the tutor approves here is what the lesson will show: the
 * float, the size class, the caption chrome and the wrap are not a mock-up.
 */
const PlacementPreview: FC<{
    item: LessonMediaItem;
    index: number;
    placement?: MediaPlacement;
    outline: MediaOutlineSection[];
    onPick: (patch: Partial<LessonMediaItem>) => void;
}> = ({ item, index, placement, outline, onPick }) => {
    const block = useMemo(
        () => (item.url ? mediaBlockHtml(item, index, placement?.layout) : ''),
        [item, index, placement?.layout],
    );
    const srcdoc = useMemo(() => {
        if (!block) {
            return `<!doctype html><meta charset="utf-8">${LESSON_MEDIA_CSS}<style>body{margin:0;padding:12px;font:13px/1.6 system-ui;color:#94a3b8}</style><p>Paste a URL to see how it will sit in the lesson.</p>`;
        }
        const lead =
            'The lesson text runs here so you can see the wrap. A floated picture pulls the copy around its edge, the way a magazine page does, and the card keeps its caption and its source link.';
        return `<!doctype html><meta charset="utf-8">${LESSON_MEDIA_CSS}<style>body{margin:0;padding:10px 12px;background:#fff;font:13px/1.65 system-ui,-apple-system,sans-serif;color:#1e293b}p{margin:0 0 10px}</style><p>${lead}</p>${block}<p>${lead}</p><div class="lesson-media-clear"></div>`;
    }, [block]);

    const section = placement && placement.sectionIndex !== -1 ? outline[placement.sectionIndex] : undefined;
    const activities = section?.activities || [];
    const where = !placement || placement.sectionIndex === -1
        ? 'at the end of the lesson (no sections to aim at)'
        : placement.targeted
        ? `section ${placement.sectionNumber}. ${placement.sectionTitle}`
        : `section ${placement.sectionNumber}. ${placement.sectionTitle} — the lightest one, chosen automatically`;
    const land = placement && placement.activityIndex >= 0
        ? `activity ${placement.activityIndex + 1} of ${placement.activityCount}${placement.activityTitle ? ` · ${placement.activityTitle}` : ''}`
        : 'the top of the section (it has no activity cards)';

    return (
        <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-2">
            <div className="flex items-start gap-1.5 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500 shrink-0 mt-0.5">Lands in</span>
                <p className="text-[10px] leading-snug text-slate-700">
                    <strong className="text-slate-900">{where}</strong>
                    {' → '}
                    <span className="text-indigo-700 font-semibold">{land}</span>
                </p>
            </div>

            {/* One-click targeting: the card inside the section, which used to be luck. */}
            {activities.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mb-1.5">
                    <span className="text-[9px] font-bold text-slate-500">Activity:</span>
                    <button type="button"
                        onClick={() => onPick({ targetActivity: undefined })}
                        className={`text-[9px] font-semibold rounded px-1.5 py-0.5 border transition cursor-pointer ${item.targetActivity === undefined || item.targetActivity === '' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                        title="Let the studio spread several items across activities, one per card">
                        Auto
                    </button>
                    {activities.map((a, ai) => (
                        <button key={ai} type="button"
                            onClick={() => onPick({ targetActivity: ai + 1 })}
                            className={`text-[9px] font-semibold rounded px-1.5 py-0.5 border transition max-w-[190px] truncate cursor-pointer ${Number(item.targetActivity) === ai + 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                            title={a.title || `Activity ${ai + 1}`}>
                            {ai + 1}. {(a.title || `Activity ${ai + 1}`).slice(0, 26)}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-1 mb-1.5">
                <span className="text-[9px] font-bold text-slate-500">Align:</span>
                {([['left', '◧ Left'], ['right', '◨ Right'], ['center', '⇪ Center'], ['full', '⤢ Full'], ['auto', '↕︎ Auto']] as const).map(([value, label]) => (
                    <button key={value} type="button"
                        onClick={() => onPick({ align: value })}
                        className={`text-[9px] font-semibold rounded px-1.5 py-0.5 border transition cursor-pointer ${(item.align || 'auto') === value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                        title={value === 'left' || value === 'right' ? 'Floats, so the lesson text wraps around it' : 'Sits across the column' }>
                        {label}
                    </button>
                ))}
                <span className="text-[9px] font-bold text-slate-500 ml-1">Size:</span>
                {([['sm', 'S'], ['md', 'M'], ['lg', 'L'], ['full', 'Full']] as const).map(([value, label]) => (
                    <button key={value} type="button"
                        onClick={() => onPick({ width: value })}
                        className={`text-[9px] font-semibold rounded px-1.5 py-0.5 border transition cursor-pointer ${(item.width || 'md') === value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                        {label}
                    </button>
                ))}
            </div>

            <iframe
                title={`Placement preview for media ${index + 1}`}
                srcDoc={srcdoc}
                sandbox="allow-scripts allow-same-origin allow-presentation"
                className="w-full h-40 bg-white border border-slate-200 rounded-lg"
            />
            <p className="text-[9px] text-slate-400 mt-1 leading-snug">
                A phone-width preview of the lesson body. On screens under 700px a float becomes a full-width block, so nothing
                squeezes the text on a phone.
            </p>
        </div>
    );
};

const AddMediaStudio: FC<Props> = ({ items, sections = [], lessonName, lessonTypeLabel, learnerName, onChange, onChecksChange }) => {
    const [checks, setChecks] = useState<Record<string, MediaCheck>>({});
    const [verifyingAll, setVerifyingAll] = useState(false);

    // Search-and-replace state
    const [findQuery, setFindQuery] = useState<Record<string, string>>({});
    const [searchOpen, setSearchOpen] = useState<Record<string, boolean>>({});
    const [searchLoading, setSearchLoading] = useState<Record<string, boolean>>({});
    const [searchError, setSearchError] = useState<Record<string, string>>({});
    const [searchResults, setSearchResults] = useState<Record<string, any[]>>({});
    const [searchKind, setSearchKind] = useState<Record<string, MediaFindKind>>({});

    // Batch “Fix all broken” — auto-search every broken item's caption, show alternatives grouped by provider
    const [batchOpen, setBatchOpen] = useState(false);
    const [batchQuery, setBatchQuery] = useState<Record<string, string>>({});
    const [batchLoading, setBatchLoading] = useState<Record<string, boolean>>({});
    const [batchError, setBatchError] = useState<Record<string, string>>({});
    const [batchResults, setBatchResults] = useState<Record<string, any[]>>({});

    // AI prompt + paste state
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [aiCopied, setAiCopied] = useState<'idle' | 'copied'>('idle');
    const [pasteJson, setPasteJson] = useState('');
    const [pasteError, setPasteError] = useState('');
    const [pastePreview, setPastePreview] = useState<LessonMediaItem[]>([]);

    /**
     * The outline the *renderer* will read out of the generated HTML, built from the
     * lesson's own section and activity list. Same shape, same numbers: `planMediaPlacement`
     * decides placement for both, which is what stops the preview from promising a card the
     * lesson will not use.
     */
    const outline: MediaOutlineSection[] = useMemo(
        () =>
            sections.map((s, i) => ({
                index: Number(s.id ?? i) - 1 >= 0 ? Number(s.id ?? i) - 1 : i,
                number: i + 1,
                title: String(s.title || `Section ${i + 1}`),
                activities: (s.activities || []).map((a, ai) => ({
                    index: ai,
                    title: String(a.title || `Activity ${ai + 1}`),
                    // Same measure the renderer takes out of the generated HTML, so a card
                    // too short to wrap copy around a float is demoted to full width here too.
                    textLength:
                        typeof a.content === 'string'
                            ? visibleTextLength(a.content)
                            : a.content && typeof a.content === 'object'
                              ? visibleTextLength(JSON.stringify(a.content))
                              : undefined,
                })),
            })),
        [sections],
    );
    /** Where every item lands, in section → activity terms. */
    const plan: MediaPlacement[] = useMemo(() => planMediaPlacement(items, outline), [items, outline]);
    const planById = useMemo(() => new Map(plan.map((p) => [p.id, p])), [plan]);

    const counts = useMemo(() => {
        const c = { image: 0, gif: 0, youtube: 0, video: 0, audio: 0, podcast: 0, embed: 0 };
        items.forEach((it) => {
            if (it.type === 'vimeo') c.video++;
            else if (c[it.type] !== undefined) c[it.type]++;
        });
        return c;
    }, [items]);

    const brokenCount = useMemo(() => Object.values(checks).filter((c) => c.status === 'broken').length, [checks]);
    const brokenItems = useMemo(() => items.filter((it) => checks[it.id]?.status === 'broken'), [items, checks]);

    // ───────── Link verification ─────────
    const verifyItem = (item: LessonMediaItem): Promise<MediaCheck> => {
        const url = (item.url || '').trim();
        if (!url) return Promise.resolve({ status: 'warning', message: 'Empty URL — add a link' });
        if (item.type === 'youtube' || isYoutubeUrl(url)) {
            const id = extractYoutubeId(url);
            if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
                return Promise.resolve({ status: 'broken', message: 'Not a valid YouTube URL (11-character ID required)' });
            }
            return new Promise((resolve) => {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 8000);
                fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json', { signal: ctrl.signal })
                    .then((res) => {
                        clearTimeout(t);
                        resolve(res.ok ? { status: 'ok', message: 'Video found on YouTube' } : { status: 'broken', message: 'YouTube HTTP ' + res.status + ' (removed / private?)' });
                    })
                    .catch(() => {
                        clearTimeout(t);
                        resolve({ status: 'warning', message: 'Valid ID, could not confirm (offline / network blocked)' });
                    });
            });
        }
        if (item.type === 'image' || item.type === 'gif') {
            return new Promise((resolve) => {
                const img = new Image();
                let done = false;
                const t = setTimeout(() => finish({ status: 'broken', message: 'Timed out loading media' }), 15000);
                const finish = (r: MediaCheck) => { if (!done) { done = true; clearTimeout(t); resolve(r); } };
                img.referrerPolicy = 'no-referrer';
                img.onload = () => finish({ status: 'ok', message: 'Media loads successfully' });
                img.onerror = () => finish({ status: 'broken', message: 'Media failed to load (404 / removed / blocked)' });
                img.src = url;
            });
        }
        // Videos / audio / podcast / embeds: reachability probe
        return new Promise((resolve) => {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 12000);
            fetch(url, { method: 'HEAD', signal: ctrl.signal })
                .then((res) => {
                    clearTimeout(t);
                    if (res.ok || res.status < 400) resolve({ status: 'ok', message: 'Reachable (HTTP ' + res.status + ')' });
                    else resolve({ status: 'broken', message: 'HTTP ' + res.status });
                })
                .catch(() => {
                    clearTimeout(t);
                    fetch(url, { method: 'HEAD', mode: 'no-cors' })
                        .then(() => resolve({ status: 'warning', message: 'Reachable, status unverified (CORS blocked)' }))
                        .catch(() => resolve({ status: 'broken', message: 'URL is not reachable' }));
                });
        });
    };

    // Keep the Lesson Settings tab badge in sync with our verification results
    React.useEffect(() => {
        if (!onChecksChange) return;
        const vals = Object.values(checks);
        onChecksChange({ broken: vals.filter((c) => c.status === 'broken').length, total: vals.filter((c) => c.status !== 'checking').length });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checks]);

    const runCheck = (item: LessonMediaItem) => {
        setChecks((prev) => ({ ...prev, [item.id]: { status: 'checking', message: 'Checking…' } }));
        verifyItem(item).then((r) => setChecks((prev) => ({ ...prev, [item.id]: r })));
    };

    const verifyAll = async () => {
        if (!items.length) return;
        setVerifyingAll(true);
        setChecks((prev) => {
            const next = { ...prev };
            items.forEach((it) => { next[it.id] = { status: 'checking', message: 'Checking…' }; });
            return next;
        });
        for (const it of items) {
            const r = await verifyItem(it);
            setChecks((prev) => ({ ...prev, [it.id]: r }));
        }
        setVerifyingAll(false);
    };

    // ───────── Search & replace (alternatives in similar provider services) ─────────
    const kindFor = (item: LessonMediaItem): MediaFindKind => searchKind[item.id] || findKindForItem(item);

    const searchMedia = async (item: LessonMediaItem, q: string) => {
        const kind = kindFor(item);
        if (!q.trim()) return;
        setSearchLoading((prev) => ({ ...prev, [item.id]: true }));
        setSearchError((prev) => ({ ...prev, [item.id]: '' }));
        setSearchResults((prev) => ({ ...prev, [item.id]: [] }));
        setSearchOpen((prev) => ({ ...prev, [item.id]: true }));
        try {
            // Server API first; when the host has no backend (static/shared hosting returns 404),
            // falls back to browser-side provider searches so the feature always works.
            const { results } = await searchMediaWithFallback(kind, q.trim());
            setSearchResults((prev) => ({ ...prev, [item.id]: results }));
        } catch (e: any) {
            setSearchError((prev) => ({ ...prev, [item.id]: String(e?.message || e) }));
        } finally {
            setSearchLoading((prev) => ({ ...prev, [item.id]: false }));
        }
    };

    const providerName = (id: string) => {
        if (/^unsplash_/.test(id)) return 'Unsplash';
        if (/^wiki_/.test(id)) return 'Wikimedia';
        if (/^openverse_/.test(id)) return 'Openverse';
        if (/^tenor_/.test(id)) return 'Tenor';
        if (/^giphy_/.test(id)) return 'GIPHY';
        if (/^yt_/.test(id)) return 'YouTube';
        if (/^itunes_/.test(id)) return 'Apple / iTunes';
        if (/^sc_/.test(id)) return 'SoundCloud';
        if (/^spot_/.test(id)) return 'Spotify';
        if (id && id.length > 0 && !/^(unsplash|wiki|openverse|tenor|giphy|yt|itunes|sc|spot)_/.test(id)) return 'Free source';
        return 'Free source';
    };

    const replaceWith = (item: LessonMediaItem, kind: MediaFindKind, r: any) => {
        const url = String(r?.url || '').trim();
        // Search-page rows (SoundCloud/Spotify/Unsplash listing links) are helpers, not replacements:
        // clicking them opens the provider so the tutor can grab a real share link and paste it back.
        const openOnly = !url || /search\?q=|open\.spotify\.com\/search|soundcloud\.com\/search|youtube\.com\/results/i.test(url);
        if (openOnly && r?.externalUrl) { window.open(r.externalUrl, '_blank', 'noopener,noreferrer'); return; }
        if (!url) return;
        let finalUrl = url;
        let newType: LessonMediaType | undefined;
        if (kind === 'video') {
            const vid = String(r?.id || '').replace(/^yt_/, '');
            if (/^[a-zA-Z0-9_-]{11}$/.test(vid)) {
                finalUrl = 'https://www.youtube.com/watch?v=' + vid;
                newType = 'youtube';
            } else if (isYoutubeUrl(url)) newType = 'youtube';
            else if (url.includes('vimeo.com')) newType = 'vimeo';
            else newType = 'video';
        } else if (kind === 'gif') newType = 'gif';
        else if (kind === 'image') newType = 'image';
        else if (kind === 'audio' || kind === 'podcast') newType = kind === 'podcast' ? 'podcast' : 'audio';
        const caption = String(r?.title || r?.caption || '').trim();
        onChange(items.map((it) => it.id === item.id
            ? { ...it, url: finalUrl, type: newType || it.type, caption: caption || it.caption, altText: r?.caption || caption || it.altText, sourceUrl: r?.externalUrl || it.sourceUrl || finalUrl, title: caption || it.title }
            : it));
        setChecks((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
        setSearchOpen((prev) => ({ ...prev, [item.id]: false }));
    };

    const defaultFindQuery = (item: LessonMediaItem) => (item.caption || item.altText || '').replace(/^[“”"'“].*?[”"'”]\s*/, '').trim() || (lessonName || 'lesson topic').replace(/(^|:)\s*Unit.*/i, '');

    // ───────── Batch “Fix all broken” — auto-search every broken caption at once ─────────
    const searchOneBroken = async (item: LessonMediaItem) => {
        const kind = kindFor(item);
        const q = String(batchQuery[item.id] ?? defaultFindQuery(item)).trim();
        if (!q) {
            setBatchError((prev) => ({ ...prev, [item.id]: 'Nothing to search — add a caption on the media card or type one below.' }));
            return;
        }
        setBatchLoading((prev) => ({ ...prev, [item.id]: true }));
        setBatchError((prev) => ({ ...prev, [item.id]: '' }));
        setBatchResults((prev) => ({ ...prev, [item.id]: [] }));
        try {
            // Server API first; falls back to browser-side provider searches on static/shared hosting.
            const { results } = await searchMediaWithFallback(kind, q);
            setBatchResults((prev) => ({ ...prev, [item.id]: results }));
        } catch (e: any) {
            setBatchError((prev) => ({ ...prev, [item.id]: String(e?.message || e) }));
        } finally {
            setBatchLoading((prev) => ({ ...prev, [item.id]: false }));
        }
    };

    const runBatchSearchAll = async () => {
        const broken = items.filter((it) => checks[it.id]?.status === 'broken');
        if (!broken.length) return;
        setBatchResults({});
        setBatchError({});
        for (const it of broken) {
            await searchOneBroken(it);
        }
    };

    const openBatchFix = async () => {
        if (!items.some((it) => checks[it.id]?.status === 'broken')) return;
        setBatchOpen(true);
        await runBatchSearchAll();
    };

    const batchReplaceAndVerify = (item: LessonMediaItem, kind: MediaFindKind, r: any) => {
        replaceWith(item, kind, r);
        const url = String(r?.url || '').trim();
        if (!url || /search\?q=|open\.spotify\.com\/search|soundcloud\.com\/search|youtube\.com\/results/i.test(url)) return;
        let chkUrl = url;
        if (kind === 'video') {
            const vid = String(r?.id || '').replace(/^yt_/, '');
            if (/^[a-zA-Z0-9_-]{11}$/.test(vid)) chkUrl = 'https://www.youtube.com/watch?v=' + vid;
        }
        const nextType: LessonMediaType = kind === 'image' ? 'image' : kind === 'gif' ? 'gif' : kind === 'audio' ? 'audio' : kind === 'podcast' ? 'podcast' : resolveTypeFromUrl(chkUrl);
        runCheck({ ...item, url: chkUrl, type: nextType, caption: item.caption || String(r?.title || '') });
    };

    const groupResults = (res: any[]) => {
        const groups: { provider: string; items: any[] }[] = [];
        (res || []).forEach((r) => {
            const prov = providerName(String(r?.id || ''));
            let g = groups.find((x) => x.provider === prov);
            if (!g) { g = { provider: prov, items: [] }; groups.push(g); }
            g.items.push(r);
        });
        return groups;
    };

    // ───────── AI prompt builder ─────────
    const buildPrompt = () => {
        const lines = sections && sections.length
            ? sections.map((s, i) => `   ${i + 1}. “${s.title}”${s.subtitle ? ' — ' + s.subtitle : ''}`).join('\n')
            : '   (sections are not listed — leave targetSection empty to distribute evenly, or type the exact heading title where the media belongs)';
        const prompt =
`You are a media curator for a FINISHED English lesson${lessonName ? ` titled “${lessonName}”` : ''}${lessonTypeLabel ? ` (${lessonTypeLabel})` : ''} for learner “${learnerName || 'the learner'}”.

The lesson content was already generated. It contains these sections (each one shows what that section actually covers — its detailed Table of Contents):
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
1. Decide how many media items each section genuinely needs — as many as are truly useful, and ZERO if a section needs none. There is NO fixed count.
2. Place each item in the section where it best fits (vocabulary visuals, listening clips next to the listening task, a YouTube explainer inside the deep-dive, etc.). Put targetSection correctly.
3. VERIFY EVERY LINK before returning it — it must actually work right now (2026). Never invent, guess, or hallucinate URLs or video IDs. YouTube IDs must be exactly 11 characters [A-Za-z0-9_-]; image URLs must be direct image files (images.unsplash.com/…, images.pexels.com/…, upload.wikimedia.org/…, media.giphy.com/…, media.tenor.com/…); audio = SoundCloud / Spotify / podcast episode / direct .mp3.
4. Use reputable, current sources (official channels, 2020–2026 material) and caption every item descriptively.
5. align: images, GIFs and small audio players float best as "left"/"right" (text wraps around them magazine-style); videos/embeds should be "full".
6. If you cannot verify that a link works, OMIT that item. Do not return broken, private, geo-blocked or dead links.
7. Repeat: return ONLY the JSON object. No preamble, no code fences.`;
        return prompt;
    };

    const copyAiPrompt = async () => {
        try {
            await navigator.clipboard.writeText(buildPrompt());
            setAiCopied('copied');
            setTimeout(() => setAiCopied('idle'), 2000);
        } catch (e) {
            setAiCopied('idle');
            alert('Could not copy — select and copy the prompt manually.');
        }
    };

    // ───────── Paste & validate the AI JSON ─────────
    const handlePasteChange = (v: string) => {
        setPasteJson(v);
        setPasteError('');
        setPastePreview([]);
        if (!v.trim()) return;
        try {
            const parsed = JSON.parse(v);
            const list = Array.isArray(parsed) ? parsed : (parsed.media || parsed.lessonMedia || parsed.items || []);
            if (!Array.isArray(list)) throw new Error('expected an array under "media"');
            const mapped = list.map(normalizeItem).filter(Boolean) as LessonMediaItem[];
            if (mapped.length === 0) throw new Error('no valid media entries found (each needs a "url")');
            setPastePreview(mapped);
        } catch (e: any) {
            setPasteError('⚠ ' + (e?.message || 'Invalid JSON'));
        }
    };

    const applyPaste = () => {
        if (!pastePreview.length) return;
        onChange([...items, ...pastePreview]);
        setPasteJson('');
        setPastePreview([]);
        setPasteError('');
    };

    // ───────── Editors ─────────
    const patchItem = (id: string, p: Partial<LessonMediaItem>) => onChange(items.map((it) => it.id === id ? { ...it, ...p } : it));
    const removeItem = (id: string) => onChange(items.filter((it) => it.id !== id));
    const moveItem = (id: string, dir: -1 | 1) => {
        const idx = items.findIndex((it) => it.id === id);
        const j = idx + dir;
        if (idx < 0 || j < 0 || j >= items.length) return;
        const next = [...items];
        [next[idx], next[j]] = [next[j], next[idx]];
        onChange(next);
    };

    const badge = (id: string) => {
        const c = checks[id];
        if (!c) return null;
        const cls = c.status === 'ok' ? 'bg-green-600' : c.status === 'broken' ? 'bg-red-600' : c.status === 'warning' ? 'bg-amber-500' : 'bg-blue-600';
        const icon = c.status === 'checking' ? <span className="inline-block w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" /> : c.status === 'ok' ? '✓' : c.status === 'broken' ? '✗' : '!';
        const label = c.status === 'checking' ? 'Check' : c.status === 'ok' ? 'OK' : c.status === 'broken' ? 'Broken' : 'Caution';
        return (
            <button type="button" onClick={() => undefined} title={c.message}
                className={`${cls} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1`}>
                {icon}{label}
            </button>
        );
    };

    const miniPreview = (item: LessonMediaItem) => {
        const url = (item.url || '').trim();
        if (!url) {
            return (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-semibold bg-gray-50">
                    Paste a URL ↓
                </div>
            );
        }
        if (item.type === 'image' || item.type === 'gif' || item.type === 'embed') {
            const isImg = item.type !== 'embed';
            return (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 relative overflow-hidden">
                    {isImg && item.type !== 'embed' ? (
                        <img src={url} alt={item.caption || ''} loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                    ) : (
                        <span className="text-xs text-gray-500">🔗 external embed — preview in the final HTML</span>
                    )}
                    {!isImg && url && (
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white rounded-full px-2 py-0.5">embed</span>
                    )}
                </div>
            );
        }
        if (item.type === 'youtube') {
            const id = extractYoutubeId(url);
            if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
                return (
                    <div className="w-full h-full flex items-center justify-center bg-black relative">
                        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt={item.caption || 'video'} className="w-full h-full object-cover opacity-80" loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                        <span className="absolute text-white text-xl">▶</span>
                    </div>
                );
            }
            return <div className="w-full h-full flex items-center justify-center text-[10px] text-red-600 bg-red-50 font-bold p-2 text-center">Invalid YouTube link — need an 11-character ID</div>;
        }
        if (isDirectAudio(url)) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-amber-50 px-2">
                    <span className="text-lg">🎧</span>
                    <audio controls preload="none" className="w-full" style={{ height: 34 }}>
                        <source src={url} />
                    </audio>
                </div>
            );
        }
        if (item.type === 'audio' || item.type === 'podcast') {
            const prov = detectMediaProvider(item);
            const label = prov === 'soundcloud' ? 'SoundCloud' : prov === 'spotify' ? 'Spotify' : prov === 'direct-audio' ? 'Audio file' : 'Podcast / audio';
            return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 bg-gradient-to-br from-amber-50 to-orange-50">
                    <span className="text-xl">{item.type === 'podcast' ? '🎙️' : '🎧'}</span>
                    <span className="text-[9px] font-bold text-amber-800">{label}</span>
                </div>
            );
        }
        return (
            <div className="w-full h-full flex items-center justify-center gap-1 text-gray-500 bg-gray-100">
                <span className="text-base">{item.type === 'vimeo' ? '🎞️' : '🎬'}</span>
                <span className="text-[9px] font-bold uppercase">{item.type === 'vimeo' ? 'Vimeo' : 'Video'}</span>
            </div>
        );
    };

    const resultsPanel = (item: LessonMediaItem) => {
        if (!searchOpen[item.id]) return null;
        const kind = kindFor(item);
        const loading = searchLoading[item.id];
        const results = searchResults[item.id] || [];
        const err = searchError[item.id] || '';
        return (
            <div className="mt-1.5 bg-slate-50 border border-slate-200 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wide">
                        {kind === 'video' ? '🎬 Video alternatives' : kind === 'gif' ? '✨ GIF alternatives' : kind === 'audio' ? '🎧 Audio alternatives' : kind === 'podcast' ? '🎙️ Podcast alternatives' : '🖼️ Image alternatives'}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-slate-400">similar providers</span>
                        <button type="button" onClick={() => setSearchOpen((prev) => ({ ...prev, [item.id]: false }))}
                            className="text-slate-400 hover:text-slate-700 text-[10px] font-bold">✕</button>
                    </div>
                </div>
                {loading ? (
                    <p className="text-[10px] text-slate-500 py-2 text-center">⏳ Searching provider services…</p>
                ) : err ? (
                    <p className="text-[10px] text-red-600 py-1">⚠ {err}</p>
                ) : results.length === 0 ? (
                    <p className="text-[10px] text-slate-500 py-1">No results — try a different caption.</p>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                        {results.map((r, ri) => (
                            <button key={ri} type="button"
                                onClick={() => replaceWith(item, kind, r)}
                                title={(r.title || r.caption || 'Replace with this media') + (r.externalUrl && !r.url ? ' — opens on the provider (paste back the share link)' : ' — click to replace')}
                                className="relative group rounded overflow-hidden border border-slate-200 hover:border-blue-500 transition cursor-pointer p-0 bg-white flex flex-col">
                                {r.preview ? (
                                    <img src={r.preview} alt={r.title || 'result'} className="w-full h-14 object-cover bg-slate-100" loading="lazy"
                                        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                                ) : (
                                    <div className="w-full h-14 flex items-center justify-center text-lg bg-slate-100">{r.title?.includes('SoundCloud') ? '🎧' : r.title?.includes('Spotify') ? '🎵' : '🎵'}</div>
                                )}
                                <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] font-semibold px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                    {r.title || r.caption || 'Replace'}
                                </span>
                                <span className="absolute top-0 left-0 bg-black/50 text-white text-[7px] font-bold px-1 py-0.5 rounded-br">
                                    {providerName(String(r.id || ''))}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                <p className="text-[8px] text-slate-400 mt-1">Click any result to replace this media instantly. Results with only ↗ open the provider so you can copy a share link back here.</p>
            </div>
        );
    };

    const findBox = (item: LessonMediaItem) => {
        const q = findQuery[item.id] ?? defaultFindQuery(item);
        const isImageish = item.type === 'image' || item.type === 'gif';
        const isAudioish = item.type === 'audio' || item.type === 'podcast';
        return (
            <div className="mt-1 space-y-1">
                <div className="flex gap-1">
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => setFindQuery((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchMedia(item, q); } }}
                        placeholder={isAudioish ? 'Search podcast / track / episode…' : 'Search caption…'}
                        className="flex-1 min-w-0 p-1 text-[10px] border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                    />
                    {isImageish && (
                        <select
                            value={kindFor(item) === 'gif' ? 'gif' : 'image'}
                            onChange={(e) => setSearchKind((prev) => ({ ...prev, [item.id]: e.target.value as MediaFindKind }))}
                            className="shrink-0 text-[10px] font-semibold px-1 py-1 border border-slate-300 rounded-md bg-white text-slate-700 cursor-pointer"
                        >
                            <option value="image">🖼 Image</option>
                            <option value="gif">✨ GIF</option>
                        </select>
                    )}
                    {isAudioish && (
                        <select
                            value={kindFor(item)}
                            onChange={(e) => setSearchKind((prev) => ({ ...prev, [item.id]: e.target.value as MediaFindKind }))}
                            className="shrink-0 text-[10px] font-semibold px-1 py-1 border border-slate-300 rounded-md bg-white text-slate-700 cursor-pointer"
                        >
                            <option value="audio">🎧 Audio</option>
                            <option value="podcast">🎙️ Podcast</option>
                        </select>
                    )}
                    <button type="button" onClick={() => searchMedia(item, q)} disabled={searchLoading[item.id]}
                        title="Search similar providers and show alternatives"
                        className="shrink-0 text-[9px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded px-2 py-1 transition disabled:opacity-60 cursor-pointer">
                        {searchLoading[item.id] ? '⏳…' : '🔎 Find'}
                    </button>
                </div>
                {resultsPanel(item)}
            </div>
        );
    };

    return (
        <div className="pt-3 border-t border-gray-200">
            {/* Section header + summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <label className="font-bold text-gray-800 text-sm flex items-center gap-1.5">🎨 Add Media</label>
                    <span className="text-[10px] text-gray-400">one studio — images, GIFs, YouTube, audio & any embed</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                    {(counts.image + counts.gif) > 0 && <span className="text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-0.5">🖼 {fmt(counts.image + counts.gif, 'image')}</span>}
                    {(counts.youtube + counts.video) > 0 && <span className="text-[10px] font-bold bg-red-50 border border-red-200 text-red-700 rounded-full px-2 py-0.5">🎬 {fmt(counts.youtube + counts.video, 'video')}</span>}
                    {(counts.audio + counts.podcast) > 0 && <span className="text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2 py-0.5">🎧 {fmt(counts.audio + counts.podcast, 'audio')}</span>}
                    {counts.embed > 0 && <span className="text-[10px] font-bold bg-gray-100 border border-gray-300 text-gray-700 rounded-full px-2 py-0.5">🔗 {fmt(counts.embed, 'embed')}</span>}
                    {brokenCount > 0 && <span className="text-[10px] font-bold bg-red-100 border border-red-300 text-red-700 rounded-full px-2 py-0.5">⚠ {brokenCount} broken — verify & fix</span>}
                    {items.length > 0 && (
                        <button type="button" onClick={verifyAll} disabled={verifyingAll}
                            className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-2.5 py-1 transition disabled:opacity-60 cursor-pointer">
                            {verifyingAll ? '⏳ Checking…' : '🔗 Verify Links'}
                        </button>
                    )}
                    {brokenCount > 0 && (
                        <button type="button" onClick={() => openBatchFix()}
                            className="text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-full px-2.5 py-1 transition cursor-pointer">
                            🩹 Fix all broken ({brokenCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Add buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {ADD_OPTIONS.map((o) => (
                    <button key={o.type} type="button"
                        onClick={() => onChange([...items, { id: uid(), type: o.type, url: '', caption: '', sourceUrl: '', align: o.type === 'youtube' || o.type === 'video' || o.type === 'vimeo' || o.type === 'embed' ? 'full' : 'auto', width: 'md' }])}
                        title={'Add ' + o.label}
                        className="inline-flex items-center gap-1 text-[11px] font-bold border border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-700 hover:shadow-sm rounded-lg px-2 py-1 transition cursor-pointer">
                        <span>{o.icon}</span> + {o.label}
                    </button>
                ))}
                <span className="self-center text-[10px] text-gray-400 pl-1">…then paste a URL & pick its section ↓</span>
            </div>

            {/* Media items */}
            {items.length === 0 ? (
                <div className="mb-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 text-center">
                    <p className="text-sm text-slate-500 mb-1">No media yet.</p>
                    <p className="text-[11px] text-slate-400">Add media above, or paste a media list from the AI prompt below (targets exact lesson sections & wraps text magazine-style).</p>
                </div>
            ) : (
                <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {items.map((item, idx) => {
                        const meta = TYPE_META[item.type] || TYPE_META.embed;
                        const chk = checks[item.id];
                        const isFloatable = item.type === 'image' || item.type === 'gif' || item.type === 'audio' || item.type === 'podcast';
                        return (
                            <div key={item.id} className={`relative group border rounded-xl overflow-hidden bg-white shadow-sm flex flex-col ${chk?.status === 'broken' ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'}`}>
                                {/* Preview strip */}
                                <div className="relative">
                                    {badge(item.id)}
                                    <button type="button" onClick={() => removeItem(item.id)}
                                        title="Remove media"
                                        className="absolute top-1 right-1 w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs flex items-center justify-center shadow-md z-10 cursor-pointer">
                                        <i className="fas fa-times"></i>
                                    </button>
                                    <div className="absolute top-1 left-10 z-10 flex items-center gap-1">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta.chip}`}>{meta.icon} {meta.label}</span>
                                        <span className="text-[9px] font-semibold bg-black/60 text-white rounded-full px-1.5 py-0.5">{detectMediaProvider(item)}</span>
                                    </div>
                                    <div className="h-24 bg-white overflow-hidden">
                                        {miniPreview(item)}
                                    </div>
                                </div>

                                <div className="p-2 space-y-1.5 flex-1">
                                    <div className="flex gap-1">
                                        <input type="text" value={item.url} placeholder="Media URL (youtube / image / soundcloud / mp3…)"
                                            onChange={(e) => patchItem(item.id, { url: e.target.value })}
                                            className="flex-1 min-w-0 p-1 text-[10px] border border-slate-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                                        <select value={item.type}
                                            onChange={(e) => patchItem(item.id, { type: e.target.value as LessonMediaType })}
                                            title="Media kind"
                                            className="shrink-0 p-1 text-[10px] border border-slate-200 rounded bg-white text-slate-700 cursor-pointer">
                                            {(Object.keys(TYPE_META) as LessonMediaType[]).map((t) => (
                                                <option key={t} value={t}>{TYPE_META[t].label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                        <input type="text" value={item.caption || ''} placeholder="Caption (also used to find alternatives)"
                                            onChange={(e) => patchItem(item.id, { caption: e.target.value })}
                                            className="p-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                                        <input type="text" value={item.altText || ''} placeholder="Alt text (accessibility)"
                                            onChange={(e) => patchItem(item.id, { altText: e.target.value })}
                                            className="p-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                                        <select value={String(item.targetSection ?? '')}
                                            onChange={(e) => patchItem(item.id, { targetSection: e.target.value === '' ? undefined : e.target.value })}
                                            title="Lesson section to inject into"
                                            className="col-span-2 p-1 text-[10px] border border-slate-200 rounded bg-white text-slate-700 cursor-pointer">
                                            {(() => {
                                                const v = String(item.targetSection ?? '');
                                                const matched = sections.some((s, i) => String(s.id ?? i) === v);
                                                return [
                                                    <option key="auto" value="">📍 Auto section (even spread)</option>,
                                                    ...(sections.length === 0 ? [<option key="s0" value="0">Section 1</option>] : []),
                                                    ...sections.map((s, i) => (
                                                        <option key={String(s.id ?? i)} value={String(s.id ?? i)}>{i + 1}. {s.title}</option>
                                                    )),
                                                    ...(v !== '' && !matched ? [<option key="custom" value={v}>📍 {item.targetSection}</option>] : []),
                                                ];
                                            })()}
                                        </select>
                                        <select value={item.align || (isFloatable ? 'auto' : 'full')}
                                            onChange={(e) => patchItem(item.id, { align: e.target.value as LessonMediaItem['align'] })}
                                            title="Layout — float wraps text magazine-style"
                                            className="p-1 text-[10px] border border-slate-200 rounded bg-white text-slate-700 cursor-pointer">
                                            <option value="auto">↕️ Auto</option>
                                            <option value="left">◧ Float left</option>
                                            <option value="right">◨ Float right</option>
                                            <option value="center">⇪ Center</option>
                                            <option value="full">⤢ Full width</option>
                                        </select>
                                        <select value={item.width || 'md'}
                                            onChange={(e) => patchItem(item.id, { width: e.target.value as LessonMediaItem['width'] })}
                                            title="Size"
                                            className="p-1 text-[10px] border border-slate-200 rounded bg-white text-slate-700 cursor-pointer">
                                            <option value="sm">Size: Small</option>
                                            <option value="md">Size: Medium</option>
                                            <option value="lg">Size: Large</option>
                                            <option value="full">Size: Full</option>
                                        </select>
                                    </div>
                                    <PlacementPreview
                                        item={item}
                                        index={idx}
                                        placement={planById.get(item.id)}
                                        outline={outline}
                                        onPick={(patch) => patchItem(item.id, patch)}
                                    />
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                        <button type="button" onClick={() => runCheck(item)}
                                            title="Verify this link is reachable"
                                            className="text-[9px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded px-2 py-1 transition cursor-pointer">
                                            ✓ Check link
                                        </button>
                                        <button type="button" onClick={() => setSearchOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                                            title="Find alternatives on similar provider services"
                                            className="text-[9px] font-bold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded px-2 py-1 transition cursor-pointer">
                                            🔎 Replace with similar
                                        </button>
                                        {(chk?.status === 'broken' || chk?.status === 'warning') && (
                                            <button type="button" onClick={() => { setSearchOpen((prev) => ({ ...prev, [item.id]: true })); }}
                                                title="Auto-fill the caption as the search query"
                                                className="text-[9px] font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded px-2 py-1 transition cursor-pointer">
                                                ⚠ Fix
                                            </button>
                                        )}
                                        <span className="flex-1" />
                                        <button type="button" onClick={() => moveItem(item.id, -1)} disabled={idx === 0}
                                            title="Move earlier" className="text-slate-400 hover:text-slate-700 text-xs disabled:opacity-30 cursor-pointer"><i className="fas fa-arrow-up"></i></button>
                                        <button type="button" onClick={() => moveItem(item.id, 1)} disabled={idx === items.length - 1}
                                            title="Move later" className="text-slate-400 hover:text-slate-700 text-xs disabled:opacity-30 cursor-pointer"><i className="fas fa-arrow-down"></i></button>
                                        <a href={item.url || item.sourceUrl} target="_blank" rel="noopener noreferrer"
                                            title="Open media source" className="text-slate-400 hover:text-blue-600 text-xs cursor-pointer"><i className="fas fa-external-link-alt"></i></a>
                                    </div>
                                    {chk && chk.status !== 'checking' && (
                                        <p className={`text-[9px] font-semibold ${chk.status === 'ok' ? 'text-green-600' : chk.status === 'broken' ? 'text-red-600' : 'text-amber-600'}`}>{chk.status === 'ok' ? '✓' : chk.status === 'broken' ? '✗' : '!'} {chk.message}</p>
                                    )}
                                    {findBox(item)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* AI prompt + paste JSON */}
            <div className="border border-indigo-200 rounded-xl overflow-hidden">
                <button type="button"
                    onClick={() => setAiPanelOpen((v) => !v)}
                    className="w-full px-3 py-2 bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 text-left text-xs font-extrabold text-indigo-900 flex items-center justify-between transition cursor-pointer">
                    <span className="flex items-center gap-2"><i className="fas fa-wand-magic-sparkles text-indigo-500"></i> AI Media Curator — Copy Prompt</span>
                    <i className={`fas fa-chevron-down text-indigo-400 transition-transform ${aiPanelOpen ? 'rotate-180' : ''}`}></i>
                </button>
                {aiPanelOpen && (
                <div className="bg-white p-3 space-y-2">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">① Copy Prompt — includes the {sections.length} lesson sections &amp; what each one covers</span>
                            <button type="button" onClick={copyAiPrompt}
                                className={`text-[10px] font-bold ${aiCopied === 'copied' ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'} rounded-lg px-2.5 py-1 transition cursor-pointer`}>
                                {aiCopied === 'copied' ? '✅ Copied!' : '📋 Copy Prompt'}
                            </button>
                        </div>
                        <textarea readOnly value={buildPrompt()} rows={6}
                            className="w-full p-2 bg-slate-50 text-[10px] font-mono text-slate-700 border border-slate-200 rounded-lg resize-y focus:outline-none" />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">② Paste the AI's JSON media list</span>
                            <span className="text-[9px] text-slate-400">media → section mapping · previews below</span>
                        </div>
                        <textarea value={pasteJson} onChange={(e) => handlePasteChange(e.target.value)} rows={4}
                            placeholder='{"media":[{"type":"image","url":"…","caption":"…","targetSection":2,"align":"right"}]}'
                            className="w-full p-2 bg-white text-[10px] font-mono text-slate-700 border border-slate-300 rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                        {pasteError && <p className="text-[10px] text-red-600 mt-1 font-semibold">{pasteError}</p>}
                        {pastePreview.length > 0 && (
                            <div className="mt-2 border border-emerald-200 rounded-lg p-2 bg-emerald-50/50">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold text-emerald-800">✅ {pastePreview.length} validated media item{pastePreview.length === 1 ? '' : 's'} ready — click to add:</span>
                                    <button type="button" onClick={applyPaste}
                                        className="text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1 transition cursor-pointer">
                                        + Add all to media list
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto">
                                    {pastePreview.map((p, i) => {
                                        const sec = sections.find((s, si) => String(s.id ?? si) === String(p.targetSection) || String(si) === String(p.targetSection));
                                        const meta = TYPE_META[p.type] || TYPE_META.embed;
                                        return (
                                            <div key={i} className="bg-white border border-emerald-200 rounded-lg p-1.5 flex items-center gap-1.5">
                                                {p.type === 'image' || p.type === 'gif' ? (
                                                    <img src={p.url} alt={p.caption || ''} className="w-10 h-10 rounded object-cover bg-slate-100 shrink-0"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                                                ) : (
                                                    <div className="w-10 h-10 rounded flex items-center justify-center bg-slate-100 text-base shrink-0">{meta.icon}</div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-bold text-slate-700 truncate">{meta.label}{p.caption ? ' · ' + p.caption : ''}</p>
                                                    <p className="text-[8px] text-slate-500 truncate font-mono">{p.url}</p>
                                                    <span className="text-[8px] font-bold text-indigo-600">📍 {p.targetSection === undefined || p.targetSection === '' ? 'Auto' : (sec ? sec.title : p.targetSection)} · {p.align || 'auto'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                )}
            </div>

            {/* 🩹 Batch fix-all modal — every broken item searched once, alternatives grouped by provider */}
            {batchOpen && (
                <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6" onClick={() => setBatchOpen(false)}>
                    <div className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between gap-3 shrink-0">
                            <div className="min-w-0">
                                <h4 className="text-sm font-extrabold flex items-center gap-2">🩹 Fix broken media — search &amp; replace all at once</h4>
                                <p className="text-[10px] text-slate-300 mt-0.5 truncate">Each broken item was searched by its caption; pick any alternative and it replaces the dead link instantly (then re-verifies itself).</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {brokenItems.length > 0 && (
                                    <span className="text-[10px] font-bold bg-white/15 border border-white/20 rounded-full px-2 py-1">{brokenItems.length} left</span>
                                )}
                                <button type="button" onClick={() => setBatchOpen(false)} className="text-slate-300 hover:text-white text-sm font-bold cursor-pointer">✕</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                            {brokenItems.length === 0 ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                                    <p className="text-sm font-extrabold text-emerald-800">✅ All broken media replaced &amp; re-verified — nothing left to fix!</p>
                                    <button type="button" onClick={() => setBatchOpen(false)} className="mt-3 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 transition cursor-pointer">Done</button>
                                </div>
                            ) : brokenItems.map((it) => {
                                const kind = kindFor(it);
                                const kindLabel = kind === 'video' ? 'YouTube / video' : kind === 'gif' ? 'GIF' : kind === 'audio' ? 'audio' : kind === 'podcast' ? 'podcast' : 'image';
                                const q = batchQuery[it.id] ?? defaultFindQuery(it);
                                const chk = checks[it.id];
                                return (
                                    <div key={it.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${(TYPE_META[it.type] || TYPE_META.embed).chip}`}>{(TYPE_META[it.type] || TYPE_META.embed).icon} {it.type} · {kindLabel}</span>
                                            <span className="text-[10px] font-semibold text-slate-600 min-w-0 flex-1 truncate">{it.caption || it.altText || 'Untitled media'}</span>
                                            <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 truncate max-w-[45%]" title={chk?.message}>{chk?.message || 'broken'}</span>
                                        </div>
                                        <p className="text-[9px] font-mono text-slate-400 truncate mt-1">{it.url}</p>

                                        <div className="flex gap-1.5 mt-2">
                                            <input
                                                type="text"
                                                value={q}
                                                onChange={(e) => setBatchQuery((prev) => ({ ...prev, [it.id]: e.target.value }))}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchOneBroken(it); } }}
                                                placeholder="Search caption to find working alternatives…"
                                                className="flex-1 min-w-0 p-1.5 text-[11px] border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white"
                                            />
                                            <button type="button" onClick={() => searchOneBroken(it)} disabled={batchLoading[it.id]}
                                                className="shrink-0 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3 py-1.5 transition disabled:opacity-60 cursor-pointer">
                                                {batchLoading[it.id] ? '⏳…' : '🔎 Search'}
                                            </button>
                                        </div>

                                        {batchLoading[it.id] ? (
                                            <p className="text-[10px] text-slate-500 py-2 text-center">⏳ Searching {kindLabel} alternatives…</p>
                                        ) : batchError[it.id] ? (
                                            <p className="text-[10px] text-red-600 py-1 font-semibold">⚠ {batchError[it.id]}</p>
                                        ) : !batchResults[it.id] ? null : (batchResults[it.id] || []).length === 0 ? (
                                            <p className="text-[10px] text-slate-500 py-1">No alternatives found — try a different caption, or edit the URL on the card manually.</p>
                                        ) : (
                                            <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                                                {groupResults(batchResults[it.id]).map((g, gi) => (
                                                    <div key={gi}>
                                                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                                                            {g.provider} <span className="text-[8px] text-slate-400 bg-slate-100 rounded-full px-1.5">{g.items.length}</span>
                                                        </p>
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                                                            {g.items.map((r, ri) => (
                                                                <button key={ri} type="button"
                                                                    onClick={() => batchReplaceAndVerify(it, kind, r)}
                                                                    title={(r.title || r.caption || 'Replace with this media') + (r.externalUrl && !r.url ? ' — opens the provider (paste the link back)' : ' — click to replace')}
                                                                    className="relative group rounded-lg overflow-hidden border border-slate-200 hover:border-rose-500 hover:ring-1 hover:ring-rose-300 transition bg-white cursor-pointer">
                                                                    {r.preview ? (
                                                                        <img src={r.preview} alt={r.title || 'result'} loading="lazy" className="w-full h-14 object-cover bg-slate-100"
                                                                            onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                                                                    ) : (
                                                                        <div className="w-full h-14 flex items-center justify-center text-lg bg-slate-100">{(g.provider === 'SoundCloud' || g.provider === 'Spotify' || g.provider === 'Apple / iTunes') ? '🎧' : '🖼️'}</div>
                                                                    )}
                                                                    <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] font-semibold px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{r.title || r.caption || 'Replace'}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {brokenItems.length > 0 && (
                            <div className="px-4 py-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                                <p className="text-[9px] text-slate-500">Clicking an alternative replaces the broken link &amp; re-checks it. Search-page helpers (↗) open the provider instead.</p>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => runBatchSearchAll()}
                                        className="text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg px-3 py-1.5 transition cursor-pointer">🔄 Re-run search for all</button>
                                    <button type="button" onClick={() => setBatchOpen(false)}
                                        className="text-[10px] font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-4 py-1.5 transition cursor-pointer">Done</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddMediaStudio;
