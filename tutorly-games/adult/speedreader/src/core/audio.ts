/* Procedural Web Audio engine: layered BGM sequencer + synthesized SFX. */
type Theme = "race" | "rocket" | "boxing" | "heist" | "kids" | "arena" | "debate" | "hub" | "neon" | "snow" | "storm" | "none";

let ctx: AudioContext | null = null;
let master: GainNode, musicBus: GainNode, sfxBus: GainNode, comp: DynamicsCompressorNode;
let enabled = { bgm: true, sfx: true };
let currentTheme: Theme = "none";
let seqTimer: number | null = null;
let step = 0, nextTime = 0, tempo = 120, intensity = 0.5;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.9;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    musicBus = ctx.createGain(); musicBus.gain.value = 0.35;
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8;
    musicBus.connect(comp); sfxBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
export const unlockAudio = () => ac();
export const setAudioEnabled = (bgm: boolean, sfx: boolean) => {
  enabled = { bgm, sfx };
  if (ctx) { musicBus.gain.setTargetAtTime(bgm ? 0.35 : 0, ctx.currentTime, 0.2); }
  if (!bgm) stopMusic(); else if (currentTheme !== "none") playMusic(currentTheme, true);
};
export const setIntensity = (v: number) => { intensity = Math.max(0, Math.min(1, v)); };

// ---------- SYNTH HELPERS ----------
const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
function osc(type: OscillatorType, freq: number, t: number, dur: number, vol: number, bus: GainNode, opts: { attack?: number; release?: number; detune?: number; slide?: number; filter?: number } = {}) {
  const c = ac(); const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
  if (opts.detune) o.detune.value = opts.detune;
  const a = opts.attack ?? 0.005, r = opts.release ?? 0.05;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.setValueAtTime(vol, t + Math.max(a, dur - r)); g.gain.linearRampToValueAtTime(0, t + dur);
  let node: AudioNode = o;
  if (opts.filter) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = opts.filter; f.Q.value = 6; o.connect(f); node = f; }
  node.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(t: number, dur: number, vol: number, bus: GainNode, hp = 4000) {
  const c = ac(); const len = Math.ceil(c.sampleRate * dur); const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur);
}
function kick(t: number, vol = 0.9) { osc("sine", 150, t, 0.25, vol, musicBus, { slide: 40, release: 0.2 }); }
function snare(t: number, vol = 0.5) { noise(t, 0.15, vol, musicBus, 1500); osc("triangle", 200, t, 0.08, vol * 0.5, musicBus, { slide: 120 }); }
function hat(t: number, vol = 0.25, open = false) { noise(t, open ? 0.2 : 0.05, vol, musicBus, 7000); }

// ---------- THEMES ----------
interface ThemeDef { tempo: number; bass: number[]; lead: number[][]; chords: number[][]; drums: (s: number, t: number) => void; leadType: OscillatorType; bassType: OscillatorType; }
const THEMES: Record<Exclude<Theme, "none">, ThemeDef> = {
  race: { tempo: 148, bassType: "sawtooth", leadType: "square",
    bass: [40, 40, 52, 40, 43, 43, 55, 43, 45, 45, 57, 45, 38, 38, 50, 50],
    lead: [[64, 67, 71, 74], [67, 71, 74, 79], [69, 72, 76, 81], [62, 65, 69, 74]],
    chords: [[52, 55, 59], [55, 59, 62], [57, 60, 64], [50, 53, 57]],
    drums: (s, t) => { if (s % 4 === 0) kick(t); if (s % 8 === 4) snare(t); hat(t, s % 2 ? 0.15 : 0.3, s % 8 === 6); } },
  rocket: { tempo: 128, bassType: "triangle", leadType: "sine",
    bass: [36, 36, 36, 48, 41, 41, 41, 53, 43, 43, 43, 55, 39, 39, 39, 51],
    lead: [[72, 76, 79, 84], [77, 81, 84, 89], [79, 83, 86, 91], [75, 79, 82, 87]],
    chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [63, 67, 70]],
    drums: (s, t) => { if (s % 4 === 0) kick(t, 0.7); if (s % 8 === 4) snare(t, 0.35); if (s % 2 === 0) hat(t, 0.15); } },
  boxing: { tempo: 96, bassType: "sawtooth", leadType: "sawtooth",
    bass: [33, 33, 33, 36, 33, 33, 39, 38, 33, 33, 33, 36, 41, 40, 39, 38],
    lead: [[57, 60, 63, 60], [57, 60, 64, 63], [57, 60, 63, 60], [60, 63, 67, 64]],
    chords: [[45, 48, 52], [45, 48, 52], [48, 51, 55], [44, 48, 51]],
    drums: (s, t) => { if (s % 8 === 0 || s % 16 === 10) kick(t, 1); if (s % 8 === 4) snare(t, 0.7); hat(t, 0.2); } },
  heist: { tempo: 110, bassType: "square", leadType: "triangle",
    bass: [38, 38, 50, 38, 41, 38, 50, 44, 38, 38, 50, 38, 45, 44, 41, 38],
    lead: [[62, 65, 69, 65], [62, 66, 69, 66], [65, 68, 72, 68], [60, 65, 68, 65]],
    chords: [[50, 53, 57], [50, 54, 57], [53, 56, 60], [48, 53, 56]],
    drums: (s, t) => { if (s % 4 === 0) kick(t, 0.6); if (s % 8 === 4) snare(t, 0.3); if (s % 2 === 1) hat(t, 0.12); } },
  kids: { tempo: 132, bassType: "triangle", leadType: "square",
    bass: [48, 48, 55, 55, 53, 53, 55, 55, 48, 48, 55, 55, 50, 50, 55, 55],
    lead: [[72, 76, 79, 76], [77, 81, 84, 81], [79, 77, 76, 74], [72, 74, 76, 79]],
    chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]],
    drums: (s, t) => { if (s % 4 === 0) kick(t, 0.5); if (s % 8 === 4) snare(t, 0.3); if (s % 2 === 0) hat(t, 0.12); } },
  arena: { tempo: 118, bassType: "sawtooth", leadType: "triangle",
    bass: [36, 36, 43, 36, 41, 41, 48, 41, 39, 39, 46, 39, 43, 43, 50, 43],
    lead: [[60, 63, 67, 70], [65, 68, 72, 75], [63, 67, 70, 74], [67, 70, 74, 77]],
    chords: [[48, 51, 55], [53, 56, 60], [51, 55, 58], [55, 58, 62]],
    drums: (s, t) => { if (s % 4 === 0) kick(t, 0.7); if (s % 8 === 4) snare(t, 0.4); if (s % 2 === 0) hat(t, 0.15); } },
  debate: { tempo: 92, bassType: "sine", leadType: "sine",
    bass: [43, 43, 43, 43, 38, 38, 38, 38, 41, 41, 41, 41, 45, 45, 45, 45],
    lead: [[67, 71, 74, 71], [62, 66, 69, 66], [65, 69, 72, 69], [69, 72, 76, 72]],
    chords: [[55, 59, 62], [50, 54, 57], [53, 57, 60], [57, 60, 64]],
    drums: (s, t) => { if (s % 8 === 0) kick(t, 0.4); if (s % 4 === 2) hat(t, 0.08); } },
  hub: { tempo: 104, bassType: "triangle", leadType: "sine",
    bass: [45, 45, 45, 45, 41, 41, 41, 41, 43, 43, 43, 43, 40, 40, 40, 40],
    lead: [[69, 72, 76, 72], [65, 69, 72, 69], [67, 71, 74, 71], [64, 67, 71, 67]],
    chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
    drums: (s, t) => { if (s % 8 === 0) kick(t, 0.35); if (s % 4 === 2) hat(t, 0.06); } },
  neon: { tempo: 164, bassType: "sawtooth", leadType: "square",
    bass: [35, 35, 47, 35, 38, 38, 50, 38, 40, 40, 52, 40, 33, 33, 45, 45],
    lead: [[71, 74, 78, 83], [74, 78, 83, 86], [76, 79, 83, 88], [69, 73, 76, 81]],
    chords: [[47, 50, 54], [50, 54, 57], [52, 55, 59], [45, 49, 52]],
    drums: (s, t) => { if (s % 4 === 0) kick(t, 0.95); if (s % 8 === 4) snare(t, 0.55); hat(t, s % 2 ? 0.18 : 0.35, s % 4 === 3); } },
  snow: { tempo: 138, bassType: "triangle", leadType: "sawtooth",
    bass: [41, 41, 41, 53, 44, 44, 44, 56, 46, 46, 46, 58, 39, 39, 51, 51],
    lead: [[72, 75, 79, 84], [73, 77, 80, 85], [75, 79, 82, 87], [70, 73, 77, 82]],
    chords: [[53, 56, 60], [56, 60, 63], [58, 61, 65], [51, 55, 58]],
    drums: (s, t) => { if (s % 4 === 0) kick(t, 0.7); if (s % 8 === 4) snare(t, 0.4); if (s % 2 === 0) hat(t, 0.14); } },
  storm: { tempo: 108, bassType: "sawtooth", leadType: "triangle",
    bass: [31, 31, 31, 34, 31, 31, 38, 36, 31, 31, 31, 34, 39, 38, 36, 34],
    lead: [[55, 58, 62, 58], [55, 58, 63, 62], [58, 62, 65, 62], [53, 58, 62, 58]],
    chords: [[43, 46, 50], [43, 47, 50], [46, 50, 53], [41, 46, 49]],
    drums: (s, t) => { if (s % 8 === 0 || s % 16 === 11) kick(t, 1); if (s % 8 === 4) snare(t, 0.65); hat(t, 0.18, s % 8 === 6); } },
};

function scheduleStep(def: ThemeDef, s: number, t: number) {
  const sixteenth = 60 / tempo / 4; const bar = Math.floor(s / 16) % 4; const inBar = s % 16;
  // bass
  osc(def.bassType, NOTE(def.bass[inBar]), t, sixteenth * 0.9, 0.22, musicBus, { filter: 400 + intensity * 900, release: 0.02 });
  // chords (pad) on beats 1 and 3
  if (inBar % 8 === 0) def.chords[bar].forEach((n, i) => osc("triangle", NOTE(n), t, sixteenth * 7.5, 0.06, musicBus, { attack: 0.1, release: 0.4, detune: i * 4 - 4 }));
  // lead arpeggio (denser with intensity)
  if (inBar % 4 === 0 || (intensity > 0.5 && inBar % 2 === 0) || (intensity > 0.85 && inBar % 1 === 0)) {
    const arp = def.lead[bar]; const n = arp[(inBar / 2 | 0) % arp.length];
    osc(def.leadType, NOTE(n), t, sixteenth * 1.6, 0.09 + intensity * 0.06, musicBus, { filter: 1200 + intensity * 2500, release: 0.08 });
  }
  def.drums(s, t);
}
function tick() {
  if (!ctx || currentTheme === "none") return;
  const def = THEMES[currentTheme]; const sixteenth = 60 / tempo / 4;
  while (nextTime < ctx.currentTime + 0.25) { scheduleStep(def, step, nextTime); nextTime += sixteenth; step = (step + 1) % 64; }
}
export function playMusic(theme: Theme, force = false) {
  if (theme === "none") { stopMusic(); return; }
  if (!enabled.bgm) { currentTheme = theme; return; }
  if (theme === currentTheme && !force && seqTimer) return;
  const c = ac(); currentTheme = theme; tempo = THEMES[theme].tempo; step = 0; nextTime = c.currentTime + 0.05;
  if (seqTimer) clearInterval(seqTimer);
  seqTimer = window.setInterval(tick, 80);
}
export function stopMusic() { if (seqTimer) clearInterval(seqTimer); seqTimer = null; currentTheme = "none"; }

// ---------- SFX ----------
export const sfx = {
  click() { if (!enabled.sfx) return; const t = ac().currentTime; osc("square", 880, t, 0.06, 0.15, sfxBus); },
  correct() { if (!enabled.sfx) return; const t = ac().currentTime; [523, 659, 784, 1047].forEach((f, i) => osc("sine", f, t + i * 0.07, 0.18, 0.3, sfxBus)); },
  wrong() { if (!enabled.sfx) return; const t = ac().currentTime; osc("sawtooth", 220, t, 0.25, 0.25, sfxBus, { slide: 110 }); osc("sawtooth", 233, t, 0.25, 0.2, sfxBus, { slide: 100 }); },
  word() { if (!enabled.sfx) return; const t = ac().currentTime; osc("sine", 1200 + Math.random() * 300, t, 0.04, 0.08, sfxBus); },
  miss() { if (!enabled.sfx) return; const t = ac().currentTime; osc("triangle", 300, t, 0.12, 0.15, sfxBus, { slide: 200 }); },
  boost() { if (!enabled.sfx) return; const t = ac().currentTime; osc("sawtooth", 200, t, 0.6, 0.3, sfxBus, { slide: 1800, filter: 3000 }); noise(t, 0.6, 0.3, sfxBus, 800); },
  countdown(final = false) { if (!enabled.sfx) return; const t = ac().currentTime; osc("square", final ? 1320 : 660, t, final ? 0.5 : 0.15, 0.3, sfxBus); },
  fanfare() { if (!enabled.sfx) return; const t = ac().currentTime; [[0, 523], [0.12, 523], [0.24, 523], [0.36, 659], [0.6, 784], [0.72, 659], [0.84, 784]].forEach(([d, f]) => { osc("square", f, t + d, 0.22, 0.2, sfxBus); osc("triangle", f / 2, t + d, 0.22, 0.2, sfxBus); }); noise(t + 0.9, 1.2, 0.25, sfxBus, 2000); },
  crowd() { if (!enabled.sfx) return; const t = ac().currentTime; for (let i = 0; i < 8; i++) noise(t + i * 0.15, 0.6, 0.12, sfxBus, 600 + Math.random() * 800); },
  engine(rpm: number) { if (!enabled.sfx) return; const t = ac().currentTime; osc("sawtooth", 60 + rpm * 140, t, 0.12, 0.08, sfxBus, { filter: 500 }); },
  punch() { if (!enabled.sfx) return; const t = ac().currentTime; noise(t, 0.12, 0.6, sfxBus, 300); osc("sine", 120, t, 0.15, 0.6, sfxBus, { slide: 40 }); },
  alarm() { if (!enabled.sfx) return; const t = ac().currentTime; for (let i = 0; i < 3; i++) osc("square", 900, t + i * 0.25, 0.12, 0.2, sfxBus); },
  pop() { if (!enabled.sfx) return; const t = ac().currentTime; osc("sine", 600, t, 0.08, 0.3, sfxBus, { slide: 1400 }); noise(t, 0.05, 0.2, sfxBus, 3000); },
  reveal() { if (!enabled.sfx) return; const t = ac().currentTime; [392, 494, 587, 784].forEach((f, i) => osc("triangle", f, t + i * 0.05, 0.3, 0.2, sfxBus)); },
  tick() { if (!enabled.sfx) return; const t = ac().currentTime; osc("square", 1500, t, 0.02, 0.1, sfxBus); },
  gong() { if (!enabled.sfx) return; const t = ac().currentTime; osc("sine", 196, t, 2.5, 0.4, sfxBus, { release: 2 }); osc("sine", 294, t, 2, 0.2, sfxBus, { release: 1.8 }); noise(t, 0.3, 0.3, sfxBus, 1000); },
  whoosh() { if (!enabled.sfx) return; const t = ac().currentTime; noise(t, 0.35, 0.3, sfxBus, 1200); },
  beep() { if (!enabled.sfx) return; const t = ac().currentTime; osc("sine", 880, t, 0.35, 0.45, sfxBus); osc("sine", 1760, t + 0.02, 0.2, 0.2, sfxBus); },
  combo(n = 1) { if (!enabled.sfx) return; const t = ac().currentTime; [659, 784, 988, 1175].slice(0, Math.min(4, 1 + n)).forEach((f, i) => osc("square", f, t + i * 0.05, 0.12, 0.18, sfxBus)); },
  thunder() { if (!enabled.sfx) return; const t = ac().currentTime; noise(t, 1.4, 0.55, sfxBus, 80); osc("sine", 60, t, 1.2, 0.5, sfxBus, { slide: 28, release: 0.8 }); },
  splash() { if (!enabled.sfx) return; const t = ac().currentTime; noise(t, 0.4, 0.4, sfxBus, 400); osc("triangle", 180, t, 0.3, 0.2, sfxBus, { slide: 90 }); },
  ski() { if (!enabled.sfx) return; const t = ac().currentTime; noise(t, 0.2, 0.15, sfxBus, 2500); },
  cannon() { if (!enabled.sfx) return; const t = ac().currentTime; osc("sine", 90, t, 0.35, 0.7, sfxBus, { slide: 40 }); noise(t, 0.28, 0.55, sfxBus, 200); },
};
