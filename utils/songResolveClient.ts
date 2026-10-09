/**
 * Browser-side song resolution for the Lyrics and AI Karaoke widgets.
 * ---------------------------------
 * Both widgets used to POST to /api/ai/lyrics-search and /api/ai/karaoke-search
 * and report "Could not retrieve lyrics. Please try another track." whenever the
 * answer was not a 2xx. On the static/PHP deployment every /api/* path answers
 * 404 — the Node server is simply not running there — so both widgets failed for
 * every track a tutor picked.
 *
 * This loader keeps the Node route as the preferred path (it is richer: it adds a
 * Gemini study summary and verifies YouTube embeds) and, when that route is
 * missing or unreachable, resolves the exact same song entirely in the browser
 * through CORS-enabled public services:
 *
 *   - LRCLIB          → plain + timestamped (LRC) lyrics, instrumental flag
 *   - lyrics.ovh      → plain-lyrics backstop
 *   - Piped (YouTube) → embeddable video candidates with real thumbnails
 *
 * It mirrors utils/mediaSearchClient.ts, which already solves the same
 * "static hosting has no backend" problem for the media studio.
 */

import type { SongPayload, VideoCandidate } from './lyricSync';

export type SongMode = 'lyrics' | 'karaoke';

/** One row of the "pick your song" list. */
export interface TrackCandidate {
  id: string;
  song: string;
  artist: string;
  album: string;
  durationSeconds: number;
  instrumental: boolean;
  /** True when the track ships line timings (a real sing-along). */
  timed: boolean;
}

export interface LoadSongOptions {
  query?: string;
  song?: string;
  artist?: string;
  mode?: SongMode;
}

export interface LoadSongResult {
  payload: SongPayload;
  /** False when the song service was unavailable and we resolved in the browser. */
  viaServer: boolean;
  /** Human-readable provenance line for the UI. */
  notice: string;
}

const LRCLIB_HEADERS = { Accept: 'application/json' };
const REQUEST_TIMEOUT_MS = 9000;

/** Piped mirrors answer plain JSON with `Access-Control-Allow-Origin: *`. */
const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.ducks.party',
  'https://pipedapi.adminforge.de',
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * LRCLIB is community-run and answers 503 "ServerOverloaded" under load, so every
 * request is retried with a small backoff instead of silently losing the lyrics.
 */
async function lrclibJson(url: string, attempts = 3): Promise<any | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: LRCLIB_HEADERS, signal: ctrl.signal });
      if (res.status === 429 || res.status >= 500) {
        await delay(350 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await delay(250 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/** Strip "(Official Video)", "[Remastered 2015]" … the same way the server does. */
export function cleanTrackText(s: string): string {
  return String(s || '')
    .replace(/\s*[([][^)\]]*(official|audio|video|lyric|lyrics|remaster(ed)?|hd|hq|4k|mv|music)[^)\]]*[)\]]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `12670` → `[00:12.67]`. */
function msToLrcStamp(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const cs = Math.round((total - Math.floor(total)) * 100);
  return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}]`;
}

/**
 * LRCLIB also returns a `lyricsfile` (line/start_ms YAML). When a track has no
 * `syncedLyrics` but does have a lyricsfile, those timings are still a real
 * sing-along, so they are converted into LRC for the shared parser.
 */
function lyricsFileToLrc(yaml: string | undefined | null): string {
  const text = String(yaml || '');
  if (!text || !text.includes('start_ms')) return '';
  const out: string[] = [];
  let pending = '';
  for (const raw of text.split(/\r?\n/)) {
    const t = raw.match(/^\s*-\s*text:\s*(.*)$/);
    if (t) {
      pending = t[1].trim().replace(/^["']|["']$/g, '').replace(/''/g, "'");
      continue;
    }
    const start = raw.match(/^\s*start_ms:\s*(\d+)/);
    if (start && pending) {
      out.push(`${msToLrcStamp(Number(start[1]))} ${pending}`);
      pending = '';
    }
  }
  return out.join('\n');
}

/**
 * Community-tagged rows regularly put the artist inside the title
 * ("Bohemian Rhapsody - Queen", "The Beatles - Let It Be") or report the whole
 * "Song - Artist" string as the artist. Split that back apart for the UI.
 */
function splitTitleArtist(trackName: string, artistName: string): { song: string; artist: string } {
  let song = String(trackName || '').trim();
  let artist = String(artistName || '').trim();

  if (artist.includes(' - ')) {
    const tail = artist.split(' - ').pop()!.trim();
    if (tail && song.toLowerCase().endsWith(` - ${artist.toLowerCase()}`)) {
      song = song.slice(0, song.length - artist.length - 3).trim();
    }
    if (tail) artist = tail;
  }

  if (artist) {
    const prefix = `${artist.toLowerCase()} - `;
    while (song.length > prefix.length && song.toLowerCase().startsWith(prefix)) {
      song = song.slice(prefix.length).trim();
    }
    const suffix = ` - ${artist.toLowerCase()}`;
    while (song.length > suffix.length && song.toLowerCase().endsWith(suffix)) {
      song = song.slice(0, song.length - suffix.length).trim();
    }
  }

  return { song: song || String(trackName || '').trim(), artist };
}

interface ResolvedLyrics {
  plain: string;
  synced: string;
  source: string;
  trackName: string;
  artistName: string;
  instrumental: boolean;
  duration: number;
}

function rowToLyrics(row: any): ResolvedLyrics | null {
  if (!row || typeof row !== 'object') return null;
  const plain = String(row.plainLyrics || '').trim();
  const synced = String(row.syncedLyrics || '').trim() || lyricsFileToLrc(row.lyricsfile);
  if (!plain && !synced) return null;
  return {
    plain,
    synced,
    source: 'LRCLIB',
    trackName: String(row.trackName || ''),
    artistName: String(row.artistName || ''),
    instrumental: !!row.instrumental,
    duration: Number(row.duration || 0),
  };
}

/** Score LRCLIB rows the same way the server does, so the best match wins. */
function pickBest(rows: any, song: string, artist: string): any | null {
  if (!Array.isArray(rows) || !rows.length) return null;
  const want = String(song || '').toLowerCase();
  const wantArtist = String(artist || '').toLowerCase();
  const scored = rows
    .map((r) => {
      let s = 0;
      const tn = String(r.trackName || '').toLowerCase();
      const an = String(r.artistName || '').toLowerCase();
      if (tn === want) s += 6;
      else if (want && tn.includes(want)) s += 3;
      if (wantArtist && an.includes(wantArtist)) s += 3;
      if (r.syncedLyrics) s += 4;
      if (r.plainLyrics) s += 2;
      if (r.instrumental) s -= 4;
      return { s, r };
    })
    .sort((a, b) => b.s - a.s);
  return scored.length ? scored[0].r : null;
}

/**
 * Resolve lyrics for a song in the browser: exact LRCLIB lookup and a free-text
 * search run in parallel (the query carries the artist more often than not), then
 * narrower searches, then lyrics.ovh as a last resort.
 */
async function resolveLyricsClient(song: string, artist: string, rawQuery: string): Promise<ResolvedLyrics> {
  const s0 = cleanTrackText(song) || String(song || '').trim();
  const a0 = cleanTrackText(artist) || String(artist || '').trim();
  const q = rawQuery || [s0, a0].filter(Boolean).join(' ');

  const [byGet, byQuery, byTrack] = await Promise.all([
    s0
      ? lrclibJson(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(a0)}&track_name=${encodeURIComponent(s0)}`)
      : Promise.resolve(null),
    q ? lrclibJson(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`) : Promise.resolve(null),
    s0
      ? lrclibJson(
          `https://lrclib.net/api/search?track_name=${encodeURIComponent(s0)}${a0 ? `&artist_name=${encodeURIComponent(a0)}` : ''}`,
        )
      : Promise.resolve(null),
  ]);

  for (const candidate of [byGet, pickBest(byQuery, s0, a0), pickBest(byTrack, s0, a0)]) {
    const hit = rowToLyrics(candidate);
    if (hit) return hit;
  }

  // A free-text query like "let it be beatles" carries the artist inside the
  // track name, so retry with the leading words only ("let it be").
  const words = s0.split(/\s+/).filter(Boolean);
  if (!a0 && words.length > 2) {
    for (let n = Math.min(words.length - 1, 4); n >= 2; n--) {
      const rows = await lrclibJson(`https://lrclib.net/api/search?track_name=${encodeURIComponent(words.slice(0, n).join(' '))}`);
      const hit = rowToLyrics(pickBest(rows, s0, a0));
      if (hit) return hit;
    }
  }

  if (s0) {
    const ovh = await fetchJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(a0 || 'Unknown')}/${encodeURIComponent(s0)}`);
    const lyrics = ovh && ovh.lyrics ? String(ovh.lyrics).trim() : '';
    if (lyrics) {
      return { plain: lyrics, synced: '', source: 'lyrics.ovh', trackName: s0, artistName: a0, instrumental: false, duration: 0 };
    }
  }

  return { plain: '', synced: '', source: '', trackName: s0 || q, artistName: a0, instrumental: false, duration: 0 };
}

/**
 * Community-contributed rows include album rips and playlist dumps
 * ("0062. Let It Be", "… .flac [6](1)", 35-minute "songs"). They are perfectly
 * good lyrics sources but make a messy picker, so the list drops them.
 */
function looksLikeRip(trackName: string, album: string, durationSeconds: number): boolean {
  const haystack = `${trackName} ${album}`;
  if (/\b(mp3|flac|m4a|wav|ogg|aac|opus|320kbps|hq)\b/i.test(haystack)) return true;
  if (/^\s*\d{2,4}\s*[.\-)]\s*\S/.test(trackName)) return true;
  if (trackName.length > 70) return true;
  if (durationSeconds > 1200) return true;
  return false;
}

/** Candidate tracks for the "pick your song" list, straight from LRCLIB. */
export async function searchTracksClient(query: string): Promise<TrackCandidate[]> {
  const q = String(query || '').trim();
  if (!q) return [];
  const rows = await lrclibJson(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
  if (!Array.isArray(rows)) return [];

  const want = cleanTrackText(q).toLowerCase();
  const scored = rows
    .filter((r: any) => r && (r.plainLyrics || r.syncedLyrics || r.lyricsfile))
    .filter(
      (r: any) =>
        !looksLikeRip(
          String(r.trackName || ''),
          String(r.albumName || ''),
          Math.round(Number(r.duration || 0)),
        ),
    )
    .map((r: any) => {
      const tn = String(r.trackName || '').toLowerCase();
      const an = String(r.artistName || '').toLowerCase();
      let s = 0;
      if (tn === want) s += 8;
      else if (want && tn.includes(want)) s += 4;
      if (want && an && want.includes(an)) s += 3;
      if (r.syncedLyrics || (r.lyricsfile && String(r.lyricsfile).includes('start_ms'))) s += 3;
      if (r.instrumental) s -= 2;
      return { s, r };
    })
    .sort((a: any, b: any) => b.s - a.s);

  const seen = new Set<string>();
  const out: TrackCandidate[] = [];
  for (const { r } of scored) {
    const song = String(r.trackName || '').trim();
    const artist = String(r.artistName || '').trim();
    if (!song) continue;
    const key = `${song}|${artist}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: String(r.id ?? key),
      song,
      artist: artist || 'Unknown artist',
      album: String(r.albumName || ''),
      durationSeconds: Math.round(Number(r.duration || 0)),
      instrumental: !!r.instrumental,
      timed: !!r.syncedLyrics || (!!r.lyricsfile && String(r.lyricsfile).includes('start_ms')),
    });
    if (out.length >= 12) break;
  }
  return out;
}

/** Prefer the titles a karaoke/lyrics teacher actually wants, like the server does. */
function rankVideos(videos: VideoCandidate[], prefer: string[]): VideoCandidate[] {
  const terms = prefer.map((t) => t.toLowerCase()).filter(Boolean);
  return [...videos].sort((a, b) => {
    const score = (v: VideoCandidate) => {
      const t = `${v.title} ${v.author}`.toLowerCase();
      let s = 0;
      terms.forEach((term, i) => {
        if (t.includes(term)) s += 10 - i;
      });
      if (t.includes('topic')) s -= 2;
      return s;
    };
    return score(b) - score(a);
  });
}

/**
 * Embeddable video candidates without a backend.
 *
 * No keyless browser-callable YouTube search API exists (the app says so in
 * utils/mediaSearchClient.ts), so this asks the public Piped mirrors, which do
 * send CORS headers. Thumbnails are rebuilt from i.ytimg.com so a flaky mirror
 * proxy can never break the images.
 */
export async function searchVideosClient(query: string, prefer: string[] = [], limit = 6): Promise<VideoCandidate[]> {
  const q = String(query || '').trim();
  if (!q) return [];
  for (const base of PIPED_INSTANCES) {
    const data = await fetchJson(`${base}/search?q=${encodeURIComponent(q)}&filter=videos`);
    const items = data && Array.isArray(data.items) ? data.items : [];
    const out: VideoCandidate[] = [];
    for (const item of items) {
      const url = String(item?.url || '');
      const id = url.match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] || (url.match(/^([A-Za-z0-9_-]{11})$/) || [])[1];
      if (!id) continue;
      if (out.some((v) => v.id === id)) continue;
      out.push({
        id,
        title: String(item?.title || ''),
        author: String(item?.uploaderName || ''),
        thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${id}`,
      });
    }
    if (out.length) return rankVideos(out, prefer).slice(0, limit);
  }
  return [];
}

/**
 * A genuinely computed study summary — used when the Gemini route is not
 * available. Nothing is invented: it reports the numbers a teacher can act on.
 */
function buildStudyNotes(lyrics: string): string {
  const text = String(lyrics || '').trim();
  if (!text) return '';
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  const unique = new Set(words);
  const counts = new Map<string, number>();
  for (const w of words) {
    if (w.length > 3) counts.set(w, (counts.get(w) || 0) + 1);
  }
  const repeated = [...counts.entries()]
    .filter(([, n]) => n > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w, n]) => `${w} ×${n}`);
  const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), '');

  const parts = [`${lines.length} lines · ${words.length} words · ${unique.size} unique words`];
  if (repeated.length) parts.push(`Frequent words: ${repeated.join(', ')}`);
  if (longest) parts.push(`Longest line (${longest.length} characters): “${longest}”`);
  return parts.join('\n');
}

/** Resolve a song with no server at all. */
export async function resolveSongClient(opts: LoadSongOptions): Promise<SongPayload> {
  const mode: SongMode = opts.mode === 'karaoke' ? 'karaoke' : 'lyrics';
  const query = String(opts.query || '').trim();
  const song = String(opts.song || '').trim();
  const artist = String(opts.artist || '').trim();
  const rawQuery = query || [song, artist].filter(Boolean).join(' ');

  const prefer =
    mode === 'karaoke'
      ? ['karaoke', 'instrumental', 'sing along', 'backing track', 'lyrics']
      : ['official audio', 'topic', 'official', 'lyrics', 'remaster'];

  const [lyr, firstPass] = await Promise.all([
    resolveLyricsClient(song, artist, rawQuery),
    searchVideosClient(mode === 'karaoke' ? `${rawQuery} karaoke instrumental` : `${rawQuery} official audio`, prefer),
  ]);

  // A name the tutor picked from the list is always shown as-is; a free-text match
  // is tidied so "The Beatles - The Beatles - Let It Be" reads as "Let It Be".
  const display = splitTitleArtist(lyr.trackName, lyr.artistName);
  const songName = song || display.song || cleanTrackText(rawQuery) || rawQuery;
  const artistName = artist || display.artist || 'Unknown Artist';
  const videos = firstPass.length ? firstPass : await searchVideosClient(`${songName} ${artistName}`, prefer);
  const best = videos[0] || null;

  return {
    song: songName,
    artist: artistName,
    lyrics: lyr.plain,
    syncedLyrics: lyr.synced,
    lyricsSource: lyr.source,
    instrumental: lyr.instrumental,
    durationSeconds: Math.round(lyr.duration || 0),
    youtubeVideoId: best ? best.id : '',
    video: best,
    videos,
    meaning: mode === 'lyrics' ? buildStudyNotes(lyr.plain) : '',
  };
}

/**
 * Ask the Node song routes first (richer result), and only fall back when they
 * are missing, unreachable, or came back empty.
 */
async function loadFromServer(mode: SongMode, body: Record<string, unknown>): Promise<SongPayload | null> {
  const endpoint = mode === 'karaoke' ? '/api/ai/karaoke-search' : '/api/ai/lyrics-search';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    // A static host answers 404 — or rewrites to index.html, which is not JSON.
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== 'object' || data.error) return null;
    return {
      song: String(data.song || ''),
      artist: String(data.artist || ''),
      lyrics: String(data.lyrics || ''),
      syncedLyrics: String(data.syncedLyrics || ''),
      lyricsSource: String(data.lyricsSource || ''),
      instrumental: !!data.instrumental,
      durationSeconds: Number(data.durationSeconds || 0),
      youtubeVideoId: String(data.youtubeVideoId || ''),
      video: data.video || null,
      videos: Array.isArray(data.videos) ? data.videos : [],
      meaning: String(data.meaning || ''),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Load a song for either widget. Never throws for "no backend" — only when the
 * track genuinely has neither lyrics nor a playable video anywhere.
 */
export async function loadSong(opts: LoadSongOptions): Promise<LoadSongResult> {
  const mode: SongMode = opts.mode === 'karaoke' ? 'karaoke' : 'lyrics';
  const query = String(opts.query || '').trim();
  const song = String(opts.song || '').trim();
  const artist = String(opts.artist || '').trim();
  if (!query && !song && !artist) {
    throw new Error('Type a song title and artist first.');
  }

  const fromServer = await loadFromServer(mode, { query, song, artist });

  // A server answer only counts when it actually carries the words. The route
  // happily answers 200 with an empty lyric body ("Yellow Submarine Beatles" did)
  // and the browser resolver finds those lyrics, so "has words" is the test.
  if (fromServer && (fromServer.lyrics || fromServer.syncedLyrics)) {
    return { payload: fromServer, viaServer: true, notice: '' };
  }

  const payload = await resolveSongClient({ query, song, artist, mode });

  // Keep anything the server did know: its study summary and any video it verified.
  if (fromServer) {
    if (!payload.meaning && fromServer.meaning) payload.meaning = fromServer.meaning;
    if (!payload.videos.length && fromServer.videos.length) {
      payload.videos = fromServer.videos;
      payload.video = fromServer.video;
      payload.youtubeVideoId = fromServer.youtubeVideoId;
    }
    if (!payload.lyricsSource && fromServer.lyricsSource) payload.lyricsSource = fromServer.lyricsSource;
  }

  const usable = !!payload.lyrics || !!payload.syncedLyrics || !!payload.video || payload.videos.length > 0;
  if (!usable) {
    throw new Error(
      `Nothing was found for “${query || song || artist}”. Check the spelling, or paste a YouTube link and the lyrics by hand.`,
    );
  }
  return {
    payload,
    viaServer: false,
    notice: fromServer ? '' : 'Looked up in your browser — the app is running without its song service.',
  };
}
