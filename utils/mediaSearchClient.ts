/**
 * Client-side media search with automatic server fallback.
 * ---------------------------------
 * The "Find / Replace with similar" features of the Add Media studio normally call
 * the Node server's /api/media-search route. On static/shared hosting the Node
 * server may be unavailable, so this helper tries the server first and, when it is
 * unreachable (404 / network error), searches CORS-friendly public providers
 * DIRECTLY from the browser so the feature keeps working everywhere.
 */

export interface MediaSearchResult {
    id: string;
    url: string;
    preview?: string;
    title?: string;
    caption?: string;
    artist?: string;
    externalUrl?: string;
}

const fetchJson = async (url: string, timeoutMs = 15000): Promise<any | null> => {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await fetch(url, { signal: ctrl.signal });
            if (!res.ok) return null;
            return await res.json();
        } finally {
            clearTimeout(t);
        }
    } catch (e) {
        return null;
    }
};

const stripHtml = (s: string) => String(s || '').replace(/<[^>]*>/g, '').trim();
const clip = (s: string, n = 25) => (s.length > n ? s.slice(0, n - 2) + '…' : s);

/** Wikimedia Commons (origin=* makes it browser-callable, no API key). */
const searchWikimediaImages = async (query: string): Promise<MediaSearchResult[]> => {
    const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6'
        + '&gsrsearch=' + encodeURIComponent(query) + '&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&format=json&origin=*';
    const data = await fetchJson(url);
    if (!data || !data.query || !data.query.pages) return [];
    const results: MediaSearchResult[] = [];
    Object.values<any>(data.query.pages).forEach(page => {
        const info = page.imageinfo && page.imageinfo[0];
        if (!info) return;
        const meta = info.extmetadata || {};
        const caption = stripHtml(meta.ImageDescription?.value) || '';
        const artist = stripHtml(meta.Artist?.value) || '';
        results.push({
            id: 'wiki_' + String(page.pageid || Date.now() + Math.random()),
            url: info.thumburl || info.url,
            preview: info.thumburl || info.url,
            title: clip(caption || page.title.replace('File:', '').split('.')[0] || query),
            caption: caption || 'Visual depiction of "' + query + '"',
            artist: artist || 'Wikimedia Commons Contributor',
            externalUrl: info.descriptionurl || info.url,
        });
    });
    return results;
};

/** Openverse (open CORS, no key). */
const searchOpenverseImages = async (query: string): Promise<MediaSearchResult[]> => {
    const data = await fetchJson('https://api.openverse.org/v1/images/?q=' + encodeURIComponent(query) + '&page_size=12');
    if (!data || !Array.isArray(data.results)) return [];
    return data.results.map((item: any) => ({
        id: 'openverse_' + item.id,
        url: item.url,
        preview: item.thumbnail || item.url,
        title: clip(item.title || query),
        caption: item.title || query,
        artist: item.creator || 'Openverse Creator',
        externalUrl: item.detail_url || item.url,
    }));
};

/** GIPHY public beta key — CORS is enabled for api.giphy.com. */
const searchGiphyGifs = async (query: string): Promise<MediaSearchResult[]> => {
    const keys = ['dc6zaTOxFJmzC', 'L8S9Nz9uS6pL9GzG0NToTHev5h44D4M2'];
    for (const key of keys) {
        const data = await fetchJson('https://api.giphy.com/v1/gifs/search?api_key=' + key + '&q=' + encodeURIComponent(query) + '&limit=12&rating=g');
        if (data && Array.isArray(data.data) && data.data.length > 0) {
            return data.data.map((item: any) => {
                const original = item.images?.original?.url;
                const preview = item.images?.fixed_height_small?.url || original;
                return {
                    id: 'giphy_' + item.id,
                    url: original,
                    preview,
                    title: clip(item.title || query + ' GIF'),
                    caption: query + ' Animated GIF',
                };
            });
        }
    }
    return [];
};

/** Tenor (CORS enabled). */
const searchTenorGifs = async (query: string): Promise<MediaSearchResult[]> => {
    const data = await fetchJson('https://tenor.googleapis.com/v2/search?q=' + encodeURIComponent(query) + '&key=LIVDTRZ6A9WA&limit=12');
    if (!data || !Array.isArray(data.results)) return [];
    return data.results.map((item: any) => {
        const f = item.media_formats || {};
        const gif = f.gif;
        if (!gif) return null;
        return {
            id: 'tenor_' + item.id,
            url: gif.url,
            preview: (f.tinygif && f.tinygif.url) || gif.url,
            title: clip(item.title || query + ' GIF'),
            caption: 'Animated Clip: ' + query,
        };
    }).filter(Boolean) as MediaSearchResult[];
};

/** iTunes Search API — CORS is enabled. */
const searchItunes = async (query: string, kind: 'audio' | 'podcast'): Promise<MediaSearchResult[]> => {
    const media = kind === 'podcast' ? 'podcast' : 'music';
    const entity = kind === 'podcast' ? 'podcastEpisode' : 'song';
    const data = await fetchJson('https://itunes.apple.com/search?term=' + encodeURIComponent(query) + '&media=' + media + '&entity=' + entity + '&limit=12');
    if (!data || !Array.isArray(data.results)) return [];
    const results: MediaSearchResult[] = [];
    data.results.forEach((t: any) => {
        if (kind === 'audio' && t.kind !== 'song') return;
        const trackName = t.trackName || t.collectionName || query;
        const artist = t.artistName || '';
        const previewUrl = t.previewUrl || t.episodeUrl || '';
        if (!trackName) return;
        results.push({
            id: 'itunes_' + t.trackId,
            url: previewUrl || t.trackViewUrl || t.collectionViewUrl || '',
            preview: t.artworkUrl100 ? t.artworkUrl100.replace('100x100', '300x300') : '',
            title: clip(trackName + ' - ' + artist, 40),
            caption: trackName + ' · ' + artist + (previewUrl ? ' (preview)' : ''),
            artist,
            externalUrl: t.trackViewUrl || t.collectionViewUrl || '',
        });
    });
    return results;
};

const fallbackGifs: MediaSearchResult[] = [
    { id: 'gif_fb_1', url: 'https://media.giphy.com/media/l0ExdHf1LaN8FymfC/giphy.gif', preview: 'https://media.giphy.com/media/l0ExdHf1LaN8FymfC/giphy.gif', title: 'Study & Learn Animation', caption: 'GIF: Dynamic class learn loops' },
    { id: 'gif_fb_2', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', preview: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', title: 'Amazing Idea', caption: 'GIF: Inspired idea burst' },
];

const fallbackImages: MediaSearchResult[] = [
    { id: 'fb_img_1', url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=600&auto=format&fit=crop', preview: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=200&auto=format&fit=crop', title: 'Visual Study Flashcard', caption: 'Illustrative premium scene' },
    { id: 'fb_img_2', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600&auto=format&fit=crop', preview: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=200&auto=format&fit=crop', title: 'Learning Session', caption: 'Learning prompt workspace image' },
    { id: 'fb_img_3', url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop', preview: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=200&auto=format&fit=crop', title: 'Insightful visual memory', caption: 'Concept associations' },
];

/** Provider search executed entirely in the browser (no server needed). */
export const searchMediaClientSide = async (kind: string, query: string): Promise<MediaSearchResult[]> => {
    const q = String(query || '').trim();
    if (!q) return [];

    if (kind === 'gif') {
        const [giphy, tenor] = await Promise.all([searchGiphyGifs(q), searchTenorGifs(q)]);
        const results = [...giphy, ...tenor];
        return results.length > 0 ? results : fallbackGifs;
    }

    if (kind === 'audio' || kind === 'podcast') {
        const itunes = await searchItunes(q, kind === 'podcast' ? 'podcast' : 'audio');
        if (itunes.length > 0) return itunes;
        // Helper rows: open the provider in a new tab so the tutor can paste a real link back.
        return [
            { id: 'sc_fallback_1', url: '', title: 'Search "' + q + '" on SoundCloud', caption: 'Open SoundCloud search and paste the share link here', externalUrl: 'https://soundcloud.com/search?q=' + encodeURIComponent(q) },
            { id: 'spot_fallback_1', url: '', title: 'Search "' + q + '" on Spotify', caption: 'Open Spotify search and paste the track/podcast link here', externalUrl: 'https://open.spotify.com/search/' + encodeURIComponent(q) },
        ];
    }

    if (kind === 'video') {
        // No keyless browser-callable YouTube search API exists; open the search page instead.
        return [
            { id: 'yt_fallback_1', url: '', title: 'Search "' + q + '" on YouTube', caption: 'Open YouTube search, copy a video link, and paste it back here', externalUrl: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q) },
        ];
    }

    // images (default)
    const [wiki, openverse] = await Promise.all([searchWikimediaImages(q), searchOpenverseImages(q)]);
    const results = [...wiki, ...openverse];
    return results.length > 0 ? results : fallbackImages;
};

/**
 * Best-effort search: server endpoint first, browser-side providers as fallback.
 * Returns results plus a flag telling the caller whether the server was used —
 * so the UI can still show a subtle notice when running without a backend.
 */
export const searchMediaWithFallback = async (kind: string, query: string): Promise<{ results: MediaSearchResult[]; viaServer: boolean }> => {
    const q = String(query || '').trim();
    if (!q) return { results: [], viaServer: false };
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 20000);
        let res: Response;
        try {
            res = await fetch('/api/media-search?type=' + kind + '&q=' + encodeURIComponent(q), { signal: ctrl.signal });
        } finally {
            clearTimeout(timer);
        }
        if (res.ok) {
            const data = await res.json();
            return { results: Array.isArray(data) ? data as MediaSearchResult[] : [], viaServer: true };
        }
    } catch (e) {
        // server unreachable — fall through to browser-side providers
    }
    const results = await searchMediaClientSide(kind, q);
    return { results, viaServer: false };
};