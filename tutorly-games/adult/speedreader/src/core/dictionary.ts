/* Free Dictionary API + Datamuse — IPA, native audio, definitions, rhymes. */
export interface DictEntry { word: string; ipa?: string; audio?: string; defs: string[]; }
const dictCache = new Map<string, DictEntry | null>();
const rhymeCache = new Map<string, string[]>();

export async function lookup(raw: string): Promise<DictEntry | null> {
  const word = raw.toLowerCase().replace(/[^a-z'-]/g, "");
  if (word.length < 2) return null;
  if (dictCache.has(word)) return dictCache.get(word)!;
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!r.ok) { dictCache.set(word, null); return null; }
    const j = await r.json();
    const e = j[0];
    const ph = (e.phonetics || []).find((p: any) => p.text) || e.phonetics?.[0];
    const audio = (e.phonetics || []).map((p: any) => p.audio).find((a: string) => a);
    const defs: string[] = [];
    for (const m of e.meanings || []) for (const d of m.definitions || []) if (defs.length < 2) defs.push(d.definition);
    const entry: DictEntry = { word: e.word || word, ipa: ph?.text || e.phonetic, audio, defs };
    dictCache.set(word, entry); return entry;
  } catch { dictCache.set(word, null); return null; }
}

export async function lookupMany(words: string[], n = 8): Promise<DictEntry[]> {
  const uniq: string[] = [];
  for (const w of words) { const k = w.toLowerCase().replace(/[^a-z'-]/g, ""); if (k.length > 2 && !uniq.includes(k)) uniq.push(k); if (uniq.length >= n) break; }
  const out = await Promise.all(uniq.map(lookup));
  return out.filter((x): x is DictEntry => !!x);
}

export async function rhymes(raw: string): Promise<string[]> {
  const word = raw.toLowerCase().replace(/[^a-z'-]/g, "");
  if (word.length < 3) return [];
  if (rhymeCache.has(word)) return rhymeCache.get(word)!;
  try {
    const r = await fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(word)}&max=6`);
    const j = await r.json();
    const list = (j as { word: string }[]).map((x) => x.word).filter((w) => w !== word);
    rhymeCache.set(word, list); return list;
  } catch { return []; }
}

export async function soundsLike(raw: string): Promise<string[]> {
  const word = raw.toLowerCase().replace(/[^a-z'-]/g, "");
  if (word.length < 3) return [];
  try {
    const r = await fetch(`https://api.datamuse.com/words?sl=${encodeURIComponent(word)}&max=6`);
    const j = await r.json();
    return (j as { word: string }[]).map((x) => x.word).filter((w) => w !== word);
  } catch { return []; }
}

export function playAudio(url: string) { try { const a = new Audio(url); a.volume = 0.9; a.play(); } catch {} }
