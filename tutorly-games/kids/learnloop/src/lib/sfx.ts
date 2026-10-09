/**
 * Soft, low-stimulation sound effects synthesised with the Web Audio API.
 * No downloads, no loud jingles — gentle xylophone-ish tones only.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.28;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setSfxEnabled(v: boolean) {
  enabled = v;
}
export function setSfxVolume(v: number) {
  if (master) master.gain.value = v;
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.6,
) {
  const c = ac();
  if (!c || !master || !enabled) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.05);
}

function sweep(from: number, to: number, dur: number, vol = 0.35, type: OscillatorType = "sine") {
  const c = ac();
  if (!c || !master || !enabled) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.03);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.connect(g);
  g.connect(master);
  osc.start();
  osc.stop(c.currentTime + dur + 0.05);
}

/** tiny click when a tile is tapped */
export const sfxTap = () => tone(660, 0, 0.09, "triangle", 0.3);
/** lifting / dropping a drag item */
export const sfxPick = () => sweep(420, 720, 0.14, 0.25, "triangle");
export const sfxDrop = () => sweep(720, 380, 0.16, 0.3, "triangle");
/** correct answer — warm major third */
export const sfxCorrect = () => {
  tone(523.25, 0, 0.34, "sine", 0.5);
  tone(659.25, 0.09, 0.34, "sine", 0.45);
  tone(783.99, 0.18, 0.5, "sine", 0.4);
};
/** gentle "not yet" — never harsh, just a soft low note */
export const sfxWrong = () => {
  tone(330, 0, 0.22, "sine", 0.28);
  tone(294, 0.12, 0.28, "sine", 0.22);
};
/** earning a star */
export const sfxStar = () => {
  tone(880, 0, 0.16, "sine", 0.4);
  tone(1174.66, 0.08, 0.2, "sine", 0.35);
  tone(1567.98, 0.16, 0.4, "sine", 0.3);
};
/** flipping a memory card */
export const sfxFlip = () => sweep(300, 520, 0.1, 0.22, "square");
/** page / card turn */
export const sfxPage = () => sweep(500, 260, 0.18, 0.18, "sine");
/** chant beat */
export const sfxBeat = (i: number) => tone(i % 2 === 0 ? 392 : 523.25, 0, 0.12, "triangle", 0.3);
/** round complete */
export const sfxWin = () => {
  [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.1, 0.45, "sine", 0.42));
};
/** spoken-word chime used next to the speaker button */
export const sfxSpeak = () => tone(988, 0, 0.1, "sine", 0.22);
