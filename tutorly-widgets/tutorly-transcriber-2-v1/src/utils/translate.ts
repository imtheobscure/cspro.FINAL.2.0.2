// Translation: works online (multiple strategies) and offline (local WASM).
//
// WHY THIS EXISTS — when you host only the static build (no Node server, e.g.
// nginx / Netlify / Vercel / GitHub Pages), the browser must call a
// translation API directly. That requires the API to send CORS headers
// (`Access-Control-Allow-Origin: *`), otherwise the browser blocks the
// response even though the request succeeds at the network level. That is
// exactly why "Translation failed" appears on a self-hosted build.
//
// Resilience strategy (tried in order, first success wins):
//   1. OFFLINE model  – if offlineMode is on and the model is loaded/ready.
//   2. MYMEMORY       – free, no-key, sends proper CORS headers. This is the
//      PRIMARY path for static hosting and works from any origin.
//   3. GOOGLE DIRECT  – translate.googleapis.com (gtx). Works in many regions
//      but CORS is inconsistent; treated as a secondary fallback.
//   4. BACKEND proxy  – `/api/translate` served by the bundled Node server
//      (only present when you run `npm start` / host the Node app).
//   5. LINGVA         – public Lingva instances (CORS JSON), often down.
//   6. OFFLINE model  – last-ditch lazy load even when nominally online.

import {
  translateOffline,
  recognizeOffline,
  isTaskReady,
  ensureModelsLoaded,
  isWorkerDead,
} from '../workers/aiWorkerClient';

export { initAIWorker } from '../workers/aiWorkerClient';

export type TranslationProvider = 'backend' | 'google-direct' | 'lingva' | 'mymemory';

export interface TranslationResult {
  translatedText: string;
  provider: TranslationProvider | 'offline';
}

// ── Endpoint resolution (robust across root + subpath hosts) ────────────────

function buildBackendEndpoints(): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const add = (p: string) => { if (p && !seen.has(p)) { seen.add(p); candidates.push(p); } };

  // 1. Absolute path from the document root — always resolves to origin root.
  add(new URL('/api/translate', window.location.href).pathname);

  // 2. Server may be mounted at BASE_URL (dev proxy / subpath host).
  const base = import.meta.env.BASE_URL || '/';
  add(new URL('api/translate', window.location.href.replace(/\/$/, '') + base).pathname);

  // 3. Raw relative path.
  add('api/translate');

  return candidates;
}

const BACKEND_ENDPOINTS = buildBackendEndpoints();

function langPart(lang: string): string {
  return (lang || 'auto').split('-')[0];
}

// ── Provider: MyMemory — CORS-safe, no key, the reliable static-host path ───
// api.mymemory.translated.net returns `Access-Control-Allow-Origin: *` so the
// browser accepts the response from ANY origin. Free tier: ~5k words/day per
// IP, which is plenty for live subtitles. GET only, keep URL < 500 chars.
async function fetchViaMyMemory(
  text: string,
  targetLang: string,
  sourceLang: string,
): Promise<string> {
  const sl = sourceLang === 'auto' ? 'autodetect' : langPart(sourceLang);
  const tl = langPart(targetLang);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (typeof translated !== 'string' || !translated.trim()) {
    throw new Error('MyMemory: empty translation');
  }
  // MyMemory sometimes returns a quota/quota warning INSIDE a 200 response.
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(translated)) {
    throw new Error(`MyMemory: ${translated.slice(0, 80)}`);
  }
  // Decode HTML entities MyMemory returns (&#39; etc.) for clean output.
  return decodeEntities(translated);
}

// ── Provider: backend proxy (only if a Node server is running) ──────────────
async function fetchViaBackend(
  text: string,
  targetLang: string,
  sourceLang: string,
  apiPref: string,
): Promise<string> {
  const sl = sourceLang === 'auto' ? 'auto' : langPart(sourceLang);
  const tl = langPart(targetLang);
  const query = `?sl=${sl}&tl=${tl}&api=${apiPref}&q=${encodeURIComponent(text)}`;

  let lastErr: unknown = null;
  for (const endpoint of BACKEND_ENDPOINTS) {
    try {
      const res = await fetch(endpoint + query, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        // Google-direct shape (array of arrays)
        if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
          return data[0].map((item: unknown) => (item as string[])[0]).join('');
        }
        // Lingva shape
        if (data && typeof data.translation === 'string') return data.translation;
      } else {
        lastErr = new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Backend proxy unavailable');
}

// ── Provider: Google direct (gtx) — no key, CORS inconsistent ───────────────
async function fetchViaGoogleDirect(
  text: string,
  targetLang: string,
  sourceLang: string,
): Promise<string> {
  const sl = sourceLang === 'auto' ? 'auto' : langPart(sourceLang);
  const tl = langPart(targetLang);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Google direct HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !data[0] || !Array.isArray(data[0])) {
    throw new Error('Google direct: unexpected response shape');
  }
  return data[0].map((item: unknown) => (item as string[])[0]).join('');
}

// ── Provider: Lingva — CORS JSON, often down ────────────────────────────────
const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://translate.plausibility.cloud',
  'https://lingva.lunar.icu',
];

async function fetchViaLingva(
  text: string,
  targetLang: string,
  sourceLang: string,
): Promise<string> {
  const sl = sourceLang === 'auto' ? 'auto' : langPart(sourceLang);
  const tl = langPart(targetLang);
  let lastErr: unknown = null;
  for (const base of LINGVA_INSTANCES) {
    try {
      const url = `${base}/api/v1/${sl}/${tl}/${encodeURIComponent(text)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const d = await res.json();
        if (d && typeof d.translation === 'string' && d.translation) return d.translation;
      }
      lastErr = new Error(`Lingva ${base} HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All Lingva instances failed');
}

// Decode the common HTML entities that translation APIs return in text.
function decodeEntities(s: string): string {
  if (typeof window === 'undefined') {
    return s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
            .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

function readSettingsOfflineMode(): boolean {
  try {
    const raw = localStorage.getItem('tutorly_settings');
    if (!raw) return false;
    return !!JSON.parse(raw).offlineMode;
  } catch {
    return false;
  }
}

function readSettingsTranslationApi(): string {
  try {
    const raw = localStorage.getItem('tutorly_settings');
    if (!raw) return 'auto';
    return (JSON.parse(raw).translationApi as string) || 'auto';
  } catch {
    return 'auto';
  }
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'auto',
  apiPref?: string,
): Promise<TranslationResult> {
  if (!text.trim()) return { translatedText: '', provider: 'offline' };

  const pref = apiPref || readSettingsTranslationApi();
  const offlineMode = readSettingsOfflineMode();

  // ── OFFLINE first (only if requested and model ready) ──────────────────
  if (offlineMode && !isWorkerDead() && isTaskReady('translate')) {
    try {
      const out = await translateOffline(text, targetLang, sourceLang);
      if (out) return { translatedText: out, provider: 'offline' };
    } catch (err) {
      console.warn('[translate] offline path failed, falling back to online:', err);
    }
  }

  // ── ONLINE providers, tried in best-first order ────────────────────────
  const errors: string[] = [];

  const tryProvider = async (
    name: string,
    fn: () => Promise<string>,
    provider: TranslationProvider,
  ): Promise<TranslationResult | null> => {
    try {
      const out = await fn();
      if (out) return { translatedText: out, provider };
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
    return null;
  };

  // 1) MyMemory — CORS-safe, the reliable path for static hosting. Always try.
  {
    const r = await tryProvider('mymemory', () => fetchViaMyMemory(text, targetLang, sourceLang), 'mymemory');
    if (r) return r;
  }

  // 2) Google direct (client-side). CORS is region/browser dependent.
  if (pref === 'auto' || pref === 'direct') {
    const r = await tryProvider('google-direct', () => fetchViaGoogleDirect(text, targetLang, sourceLang), 'google-direct');
    if (r) return r;
  }

  // 3) Backend proxy (only present when the Node server is running).
  {
    const r = await tryProvider('backend', () => fetchViaBackend(text, targetLang, sourceLang, pref), 'backend');
    if (r) return r;
  }

  // 4) Lingva instances (client-side, CORS JSON).
  if (pref === 'auto' || pref === 'lingva') {
    const r = await tryProvider('lingva', () => fetchViaLingva(text, targetLang, sourceLang), 'lingva');
    if (r) return r;
  }

  // 5) Last-ditch: lazy-load the offline model and use it even if nominally online.
  if (!isWorkerDead()) {
    try {
      await ensureModelsLoaded(['translate']);
      if (isTaskReady('translate')) {
        const out = await translateOffline(text, targetLang, sourceLang);
        if (out) return { translatedText: out, provider: 'offline' };
      }
    } catch (e) {
      errors.push(`offline-fallback: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(`All translation providers failed — ${errors.join(' | ')}`);
}

// ── In-memory cache ─────────────────────────────────────────────────────────
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

export async function translateWithCache(
  text: string,
  targetLang: string,
  sourceLang: string = 'auto',
  apiPref: string = 'auto',
): Promise<string> {
  const cacheKey = `${sourceLang}:${targetLang}:${text}:${apiPref}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const result = await translateText(text, targetLang, sourceLang, apiPref);
    if (result.translatedText) {
      if (translationCache.size >= MAX_CACHE_SIZE) {
        const firstKey = translationCache.keys().next().value;
        if (firstKey) translationCache.delete(firstKey);
      }
      translationCache.set(cacheKey, result.translatedText);
      return result.translatedText;
    }
    return text; // graceful fallback: show original text
  } catch (err) {
    console.error('Translation error:', err);
    return text; // graceful fallback: show original text
  }
}

export async function testOfflineModels(): Promise<{ success: boolean; message: string }> {
  try {
    const hasTranslate = isTaskReady('translate');
    const hasRecognize = isTaskReady('recognize');

    // Test whatever is available — user may only have transcription (no translation)
    const results: string[] = [];

    if (hasTranslate) {
      const out = await translateOffline('Hello', 'es', 'en');
      if (out) {
        results.push(`Translation OK: "Hello" → "${out}"`);
      } else {
        results.push('Translation returned empty.');
      }
    }

    if (hasRecognize) {
      // Test recognition with a known language to avoid empty results on short audio
      // Just verify the recognizer responds without crashing — we'll test with
      // a short silent buffer. If it doesn't throw, the model is loaded and functional.
      const silentAudio = new Float32Array(16000); // 1 second of silence
      try {
        await recognizeOffline(silentAudio, 'en');
        results.push('Transcription model loaded and responsive.');
      } catch (recErr: any) {
        results.push(`Transcription error: ${recErr.message}`);
      }
    }

    if (!hasTranslate && !hasRecognize) {
      return { success: false, message: 'No offline models are loaded. Download at least one model first.' };
    }

    const message = results.join(' | ');
    // Consider success if at least one model is loaded and responsive
    const success = results.some(r => !r.includes('empty') && !r.includes('error') && !r.includes('Error'));
    return {
      success,
      message: success
        ? `Offline models verified! ${message}`
        : `Offline model test issues: ${message}`,
    };
  } catch (err: unknown) {
    return { success: false, message: 'Error during test: ' + (err instanceof Error ? err.message : String(err)) };
  }
}

export function clearTranslationCache(): void {
  translationCache.clear();
}

// ── Diagnostic probe (used by Settings > Language) ──────────────────────────
export interface ProbeResult {
  ok: boolean;
  provider: TranslationProvider | 'offline' | 'none';
  translated: string;
  message: string;
}

export async function probeTranslation(targetLang: string, sourceLang: string = 'en'): Promise<ProbeResult> {
  const sample = 'Hello, how are you?';
  try {
    const r = await translateText(sample, targetLang, sourceLang, readSettingsTranslationApi());
    return { ok: true, provider: r.provider, translated: r.translatedText, message: `OK via ${r.provider}` };
  } catch (err) {
    return { ok: false, provider: 'none', translated: '', message: err instanceof Error ? err.message : String(err) };
  }
}
