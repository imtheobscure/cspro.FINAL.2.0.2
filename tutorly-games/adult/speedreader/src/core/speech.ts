/* ---------- TEXT TO SPEECH ---------- */
let voicesCache: SpeechSynthesisVoice[] = [];
export function getVoices(): SpeechSynthesisVoice[] {
  if (!("speechSynthesis" in window)) return [];
  const v = speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}
if ("speechSynthesis" in window) { speechSynthesis.onvoiceschanged = () => getVoices(); getVoices(); }

export function rankedVoices(): SpeechSynthesisVoice[] {
  const en = getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const score = (v: SpeechSynthesisVoice) => (/natural/i.test(v.name) ? 100 : 0) + (/microsoft/i.test(v.name) ? 40 : 0) + (/google/i.test(v.name) ? 30 : 0) + (/online/i.test(v.name) ? 10 : 0) + (v.localService ? 0 : 5);
  return [...en].sort((a, b) => score(b) - score(a));
}
export function voiceByName(name: string) { return getVoices().find((v) => v.name === name); }
export function guessGender(v: SpeechSynthesisVoice): "f" | "m" | "?" {
  const n = v.name.toLowerCase();
  const f = ["aria", "jenny", "michelle", "ana", "libby", "sonia", "natasha", "emma", "ava", "zira", "samantha", "female", "susan", "hazel", "clara", "olivia", "molly", "karen", "moira", "tessa", "fiona", "victoria", "leah", "luna", "sara", "nancy", "elizabeth"];
  const m = ["guy", "davis", "tony", "christopher", "eric", "jacob", "roger", "steffan", "ryan", "thomas", "william", "brian", "andrew", "liam", "david", "mark", "male", "george", "daniel", "alex", "fred", "james", "oliver", "connor", "neerja", "prabhat"];
  if (f.some((k) => n.includes(k))) return "f"; if (m.some((k) => n.includes(k))) return "m"; return "?";
}
export function stopSpeaking() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
export function speak(text: string, opts: { voice?: string; rate?: number; pitch?: number; onEnd?: () => void; interrupt?: boolean } = {}): Promise<void> {
  return new Promise((res) => {
    if (!("speechSynthesis" in window)) { opts.onEnd?.(); res(); return; }
    if (opts.interrupt !== false) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = opts.voice ? voiceByName(opts.voice) : rankedVoices()[0];
    if (v) u.voice = v;
    u.rate = opts.rate ?? 1; u.pitch = opts.pitch ?? 1;
    u.onend = () => { opts.onEnd?.(); res(); }; u.onerror = () => { opts.onEnd?.(); res(); };
    speechSynthesis.speak(u);
  });
}
/** Speak a multi-character script sequentially with per-speaker voices. Returns a cancel function. */
export function speakScript(lines: { speaker: string; line: string }[], cast: Record<string, string>, narrator: string, rate: number, onLine?: (i: number) => void): () => void {
  let cancelled = false;
  (async () => {
    stopSpeaking();
    for (let i = 0; i < lines.length; i++) {
      if (cancelled) break; onLine?.(i);
      await speak(lines[i].line, { voice: cast[lines[i].speaker] || narrator, rate, interrupt: false });
    }
    if (!cancelled) onLine?.(-1);
  })();
  return () => { cancelled = true; stopSpeaking(); };
}
/** Auto-cast distinct voices to a list of character names. */
export function autoCast(names: string[], narrator: string, shuffle = false): Record<string, string> {
  let pool = rankedVoices().filter((v) => v.name !== narrator);
  if (!pool.length) pool = rankedVoices();
  if (shuffle) pool = [...pool].sort(() => Math.random() - 0.5);
  const cast: Record<string, string> = {};
  names.forEach((n, i) => { if (pool.length) cast[n] = pool[i % pool.length].name; });
  return cast;
}

/* ---------- SPEECH RECOGNITION ---------- */
export const sttSupported = () => !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
export interface Recognizer { start: () => void; stop: () => void; }
export function createRecognizer(onResult: (finalText: string, interim: string) => void, onEnd: () => void, lang = "en-US"): Recognizer | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = lang; r.maxAlternatives = 3;
  let finalText = ""; let running = false; let wantRunning = false;
  r.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const alt = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += " " + alt; else interim += " " + alt;
    }
    onResult(finalText, interim);
  };
  r.onend = () => { running = false; if (wantRunning) { try { r.start(); running = true; } catch {} } else onEnd(); };
  r.onerror = (e: any) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { wantRunning = false; onEnd(); } };
  return {
    start: () => { wantRunning = true; if (!running) { try { r.start(); running = true; } catch {} } },
    stop: () => { wantRunning = false; try { r.stop(); } catch {} },
  };
}

/* ---------- ALIGNMENT / SCORING ---------- */
export const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
const NUMS: Record<string, string> = { "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten", "20": "twenty", "50": "fifty", "100": "hundred", "1000": "thousand" };
export function tokenize(text: string) { return text.split(/\s+/).filter(Boolean); }
function sim(a: string, b: string): number {
  if (a === b) return 1; if (!a.length || !b.length) return 0;
  const m = a.length, n = b.length; const d: number[] = Array.from({ length: n + 1 }, (_, j) => j); let prev: number;
  for (let i = 1; i <= m; i++) { prev = d[0]; d[0] = i; for (let j = 1; j <= n; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } }
  return 1 - d[n] / Math.max(m, n);
}
export function metaphoneLite(w: string) {
  return w.replace(/ph/g, "f").replace(/ck/g, "k").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/q/g, "k").replace(/x/g, "ks").replace(/wr/g, "r").replace(/kn/g, "n").replace(/gh/g, "").replace(/(.)\1+/g, "$1").replace(/[aeiouy]/g, (m, i) => (i === 0 ? m : ""));
}
export function wordMatch(target: string, heard: string, strict = 0.72) {
  const a = norm(target), b = norm(heard);
  if (!a || !b) return false; if (a === b) return true;
  if (NUMS[a] === b || NUMS[b] === a) return true;
  if (sim(a, b) >= strict) return true;
  return a.length > 3 && metaphoneLite(a) === metaphoneLite(b);
}
export type WordState = "pending" | "ok" | "close" | "missed";
/** Greedy forward alignment of heard tokens against target tokens (karaoke pointer). */
export function align(targetWords: string[], heardText: string, strict: number, prevStates?: WordState[]): { states: WordState[]; cursor: number; heardAt: (string | null)[] } {
  const heard = tokenize(heardText); const states: WordState[] = targetWords.map(() => "pending"); const heardAt: (string | null)[] = targetWords.map(() => null);
  let ti = 0;
  for (let hi = 0; hi < heard.length && ti < targetWords.length; hi++) {
    const h = heard[hi]; let found = -1;
    for (let k = ti; k < Math.min(targetWords.length, ti + 4); k++) { if (wordMatch(targetWords[k], h, strict)) { found = k; break; } }
    if (found >= 0) {
      for (let k = ti; k < found; k++) { states[k] = "missed"; heardAt[k] = heard[hi - 1] ?? null; }
      const exact = norm(targetWords[found]) === norm(h); states[found] = exact ? "ok" : "close"; heardAt[found] = h; ti = found + 1;
    }
  }
  if (prevStates) for (let i = 0; i < states.length; i++) if (states[i] === "pending" && prevStates[i] !== "pending" && i < ti) states[i] = prevStates[i];
  return { states, cursor: ti, heardAt };
}
export interface AttemptResult { wpm: number; accuracy: number; fluency: number; seconds: number; words: number; ok: number; close: number; missed: number; problem: { word: string; heard: string | null; state: WordState }[]; score: number; }
export function scoreAttempt(target: string[], states: WordState[], heardAt: (string | null)[], seconds: number, pauses: number): AttemptResult {
  const ok = states.filter((s) => s === "ok").length, close = states.filter((s) => s === "close").length, missed = states.length - ok - close;
  const accuracy = (ok + close * 0.6) / Math.max(1, states.length); const wpm = seconds > 0 ? (ok + close) / (seconds / 60) : 0;
  const fluency = Math.max(0, Math.min(1, 1 - pauses * 0.08 - Math.max(0, 90 - wpm) / 200 - (missed / Math.max(1, states.length)) * 0.15));
  const problem = target.map((w, i) => ({ word: w, heard: heardAt[i], state: states[i] })).filter((p) => p.state !== "ok");
  const score = Math.round(accuracy * 55 + fluency * 25 + Math.min(1, wpm / 155) * 20);
  return { wpm: Math.round(wpm), accuracy, fluency, seconds, words: states.length, ok, close, missed, problem, score };
}

/** Model karaoke using SpeechSynthesis word-boundary events (Chrome/Edge). */
export function speakKaraoke(text: string, words: string[], opts: { voice?: string; rate?: number; onWord?: (i: number) => void; onEnd?: () => void }): () => void {
  if (!("speechSynthesis" in window)) { opts.onEnd?.(); return () => {}; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = opts.voice ? voiceByName(opts.voice) : rankedVoices()[0];
  if (v) u.voice = v;
  u.rate = opts.rate ?? 0.95;
  let idx = 0;
  u.onboundary = (e: SpeechSynthesisEvent) => {
    if (e.name !== "word" && (e as any).name !== "Word") return;
    const slice = text.slice(0, e.charIndex + 1);
    const n = tokenize(slice).length - 1;
    idx = Math.max(0, Math.min(words.length - 1, n));
    opts.onWord?.(idx);
  };
  u.onend = () => { opts.onWord?.(words.length); opts.onEnd?.(); };
  u.onerror = () => opts.onEnd?.();
  speechSynthesis.speak(u);
  return () => { speechSynthesis.cancel(); };
}

export function createRecorder(): { start: () => Promise<void>; stop: () => Promise<string | null> } {
  let rec: MediaRecorder | null = null; let chunks: Blob[] = []; let stream: MediaStream | null = null;
  return {
    async start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec = new MediaRecorder(stream);
        chunks = [];
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        rec.start();
      } catch { rec = null; }
    },
    stop() {
      return new Promise((res) => {
        const finish = () => { stream?.getTracks().forEach((t) => t.stop()); res(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: rec?.mimeType || "audio/webm" })) : null); };
        if (!rec || rec.state === "inactive") { finish(); return; }
        rec.onstop = finish; rec.stop();
      });
    },
  };
}

export function phraseChunks(words: string[]): number[][] {
  const out: number[][] = []; let cur: number[] = [];
  words.forEach((w, i) => { cur.push(i); if (/[.,;:!?]$/.test(w) || cur.length >= 6) { out.push(cur); cur = []; } });
  if (cur.length) out.push(cur);
  return out;
}
