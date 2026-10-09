/**
 * The sound of the app.
 *
 * Everything here is synthesised at runtime. That is a constraint the project chose
 * deliberately (a single-file build that works with no network has nowhere to fetch a
 * sample from) but it is not the reason the first version of this file sounded bad. It
 * sounded bad because it was made of bare oscillators: a raw `triangle` at 988 Hz with a
 * linear fade is a *test tone*, not a coin. Nothing in the real world is a single
 * harmonic with a symmetric envelope, so nothing here is either.
 *
 * Four things do most of the work of making a synthesised sound read as a real one:
 *
 *  1. **A transient.** Real impacts have a few milliseconds of broadband noise before any
 *     pitch appears. Every percussive cue here is built as noise-burst-then-body, which is
 *     why the card flip sounds like card rather than like a hiss.
 *  2. **Inharmonic, unequal partials.** A struck bell or a coin is a set of partials whose
 *     frequencies are not whole multiples of one another and whose decay times differ —
 *     the high ones die first. `partials()` encodes exactly that, and it is the single
 *     biggest difference between a chime and a beep.
 *  3. **Space.** A shared convolution reverb, fed by a *send* so dry transients stay
 *     crisp while tails bloom. One impulse response, generated once.
 *  4. **Glue.** A compressor on the master bus, so a stacked chord does not clip and quiet
 *     cues sit at the same perceived level as loud ones.
 *  5. **Tone.** The whole mix passes through the air and cabinet shelves described on
 *     `getBus`. This is the layer that separates "synthesised" from "recorded" on a laptop
 *     speaker, and it is what the first version was missing entirely: raw oscillators and
 *     noise bursts carry most of their energy at 6–10 kHz, which is exactly where no
 *     acoustic instrument is loudest and where small speakers are at their worst.
 *
 * The context is created lazily and reused, and the noise source is one cached buffer
 * rather than a fresh allocation per call — the previous version allocated a buffer on
 * every footstep, which is real garbage-collector pressure during a lesson.
 */

let audioCtx: AudioContext | null = null;

/** The master chain, built once per context. */
type Bus = {
  master: GainNode;
  dry: GainNode;
  reverbSend: GainNode;
  noise: AudioBuffer;
};

let bus: Bus | null = null;

/**
 * The audio context, or null in an environment without Web Audio.
 *
 * Returning null rather than throwing is deliberate: a blocked or absent context must
 * degrade to a silent game, never to a broken one.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    // A suspended context is the normal state before the first user gesture.
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * An impulse response for the reverb.
 *
 * Noise multiplied by an exponential decay is the standard trick, and it is a good one:
 * it produces the dense, frequency-flat early reflections of a real room without shipping
 * an audio file. The 6 ms ramp at the start keeps the onset from clicking, and the stereo
 * decorrelation stops the tail collapsing into the centre of the image.
 */
function buildImpulse(ctx: AudioContext, seconds = 1.15, decay = 3.9): AudioBuffer {
  const frames = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, frames, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    /*
     * A one-pole lowpass inside the tail generator.
     *
     * A real room's decay is *markedly darker* than its early reflections — high
     * frequencies are absorbed first, which is why a big hall sounds warm and a tiled
     * bathroom sounds brittle. Generating the impulse from white noise gives a tail whose
     * high end decays at the same rate as its low end, and that bright, even tail is the
     * single most recognisable "this is a plugin" artefact. Filtering as the impulse is
     * built, rather than on playback, costs nothing per cue.
     */
    let last = 0;
    for (let i = 0; i < frames; i++) {
      const t = i / frames;
      const white = Math.random() * 2 - 1;
      last += 0.30 * (white - last);
      data[i] = last * Math.pow(1 - t, decay) * Math.min(1, i / (ctx.sampleRate * 0.006));
    }
  }
  return buffer;
}

/** Two seconds of white noise, reused by every transient. */
function buildNoise(ctx: AudioContext): AudioBuffer {
  const frames = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function getBus(ctx: AudioContext): Bus {
  if (bus && bus.master.context === ctx) return bus;

  // Glue first: everything downstream sees a controlled signal.
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 24;
  compressor.ratio.value = 3.2;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.22;

  const master = ctx.createGain();
  // Headroom, not volume: the compressor does the loudness work from here.
  master.gain.value = 0.72;

  const dry = ctx.createGain();
  dry.gain.value = 1;

  const convolver = ctx.createConvolver();
  convolver.buffer = buildImpulse(ctx);
  const reverbSend = ctx.createGain();
  // A single quiet return into the master, so anything can be placed in the same room.
  reverbSend.gain.value = 1;
  const wetReturn = ctx.createGain();
  /*
   * 0.24, down from 0.26 *and* into a shorter, darker room.
   *
   * The old tail was 1.9 s. On headphones that sounded grand; on the laptop speaker this
   * app is actually used on, it smeared every cue into the next one, which reads as
   * "muddy" and then as "cheap". A small bright room keeps the cues separate.
   */
  wetReturn.gain.value = 0.24;

  /*
   * The tone stage — air and cabinet.
   *
   * A high-shelf cut above 5.5 kHz stands in for air absorption and for the fact that a
   * laptop's tweeter is far brighter and less accurate than its midrange; a small
   * low-shelf lift under 190 Hz restores the body that small speakers cannot produce, so
   * a thud still reads as a thud instead of as a click. Every cue in the library passes
   * through this, which is why the fix is here rather than in one cue.
   */
  const airCut = ctx.createBiquadFilter();
  airCut.type = "highshelf";
  airCut.frequency.value = 5500;
  airCut.gain.value = -5.5;

  const cabinet = ctx.createBiquadFilter();
  cabinet.type = "lowshelf";
  cabinet.frequency.value = 190;
  cabinet.gain.value = 2.2;

  dry.connect(master);
  reverbSend.connect(convolver).connect(wetReturn).connect(master);
  // Tone first, then glue: the compressor should be levelling the mix the listener
  // actually hears, not the raw synthesis.
  master.connect(cabinet).connect(airCut).connect(compressor).connect(ctx.destination);

  bus = { master: dry, dry, reverbSend, noise: buildNoise(ctx) };
  return bus;
}

/**
 * Route a finished voice into the mix.
 *
 * `reverb` is a send level rather than a wet/dry pair on each voice, which is what lets a
 * crisp transient and a long tail coexist: the transient goes to `dry`, the send adds the
 * room on top.
 */
function out(ctx: AudioContext, node: AudioNode, reverb = 0): void {
  const b = getBus(ctx);
  node.connect(b.dry);
  if (reverb > 0) {
    const send = ctx.createGain();
    send.gain.value = reverb;
    node.connect(send).connect(b.reverbSend);
  }
}

/** Percussive envelope: instant-ish attack, exponential decay, honest about zero. */
function decayEnvelope(
  param: AudioParam,
  t0: number,
  peak: number,
  attack: number,
  duration: number,
  curve = 1
): void {
  param.setValueAtTime(0.0001, t0);
  param.linearRampToValueAtTime(peak, t0 + attack);
  if (curve === 1) {
    param.exponentialRampToValueAtTime(0.0001, t0 + duration);
  } else {
    // A hold-then-decay shape, for sounds with body rather than just an attack.
    param.setValueAtTime(peak, t0 + attack);
    param.exponentialRampToValueAtTime(0.0001, t0 + duration);
  }
}

/** A shaped burst of noise — the transient under every impact, and the substance of every swoosh. */
export function burst(
  ctx: AudioContext,
  opts: {
    duration?: number;
    gain?: number;
    from?: number;
    to?: number;
    type?: BiquadFilterType;
    q?: number;
    delay?: number;
    reverb?: number;
    /** 0 = flat hiss, 1 = amplitude concentrated in the middle (a swoosh). */
    swell?: number;
  }
): void {
  const {
    duration = 0.1,
    gain = 0.2,
    from = 3200,
    to = 900,
    type = "bandpass",
    q = 1,
    delay = 0,
    reverb = 0,
    swell = 0,
  } = opts;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = getBus(ctx).noise;
  // Start somewhere random in the cached buffer so repeated cues are not sample-identical.
  src.loop = true;

  /*
   * Every noise burst gets a ceiling at 7 kHz, whatever the caller asks for.
   *
   * The callers sweep their bandpass *upward* — a swipe runs 420→3000 Hz — and a
   * bandpass with a low Q passes a great deal above its centre, so the top of that sweep
   * used to put a lot of energy at 8–12 kHz. That is hiss, and hiss is what "cheap"
   * sounds like. A fixed lowpass here means no individual cue can reintroduce it.
   */
  const ceiling = ctx.createBiquadFilter();
  ceiling.type = "lowpass";
  ceiling.frequency.value = 7000;
  ceiling.Q.value = 0.6;

  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(Math.max(40, from), t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + duration);

  const amp = ctx.createGain();
  if (swell > 0) {
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + duration * 0.42);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  } else {
    decayEnvelope(amp.gain, t0, gain, Math.min(0.004, duration / 4), duration);
  }

  src.connect(filter).connect(ceiling).connect(amp);
  out(ctx, amp, reverb);
  /*
   * `start(when, offset)` — the offset, not a delayed `when`.
   *
   * Starting the source late and stopping it early is not a valid range and silently
   * produces nothing. Reading from a random point in the looped buffer gives the same
   * "no two hits are sample-identical" result with a correct timeline.
   */
  src.start(t0, Math.random() * 1.5);
  src.stop(t0 + duration + 0.03);
}

/** One enveloped oscillator, optionally swept through a filter. */
export function tone(
  ctx: AudioContext,
  opts: {
    freq: number;
    startAt?: number;
    duration?: number;
    type?: OscillatorType;
    gain?: number;
    endFreq?: number;
    delay?: number;
    reverb?: number;
    attack?: number;
    /** Detune in cents — a few cents of beat is what stops stacked voices phasing hard. */
    detune?: number;
    lowpass?: number;
  }
): void {
  const {
    freq,
    startAt = ctx.currentTime,
    duration = 0.15,
    type = "sine",
    gain = 0.15,
    endFreq,
    delay = 0,
    reverb = 0,
    attack = 0.008,
    detune = 0,
    lowpass,
  } = opts;
  const t0 = startAt + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + duration);

  const amp = ctx.createGain();
  decayEnvelope(amp.gain, t0, gain, Math.min(attack, duration / 3), duration);

  let tail: AudioNode = amp;
  if (lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    filter.Q.value = 0.7;
    amp.connect(filter);
    tail = filter;
  }

  osc.connect(amp);
  out(ctx, tail, reverb);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

/**
 * A struck body: a fundamental plus inharmonic partials, each with its own decay.
 *
 * This is the workhorse for anything metal or wood — coins, bells, chimes, marimba. The
 * `ratios` are deliberately not integers for the bright timbres: a real bell's upper
 * partials are stretched, and copying that is what makes it read as metal instead of as
 * a synthesiser.
 */
export function partials(
  ctx: AudioContext,
  opts: {
    base: number;
    ratios?: number[];
    decays?: number[];
    gains?: number[];
    duration?: number;
    delay?: number;
    gain?: number;
    type?: OscillatorType;
    reverb?: number;
    /** Random detune in cents applied per partial, so no two strikes are identical. */
    jitter?: number;
  }
): void {
  const {
    base,
    ratios = [1, 2.76, 5.4, 8.93],
    decays = [1, 0.66, 0.44, 0.3],
    gains = [1, 0.5, 0.3, 0.18],
    duration = 1,
    delay = 0,
    gain = 0.12,
    type = "sine",
    reverb = 0.2,
    jitter = 6,
  } = opts;
  const t0 = ctx.currentTime + delay;
  // One output stage for the whole body, so the partials share a single reverb send.
  const body = ctx.createGain();
  body.gain.value = 1;
  out(ctx, body, reverb);

  ratios.forEach((ratio, index) => {
    const partialGain = gains[index] ?? 0.2;
    const partialDecay = duration * (decays[index] ?? 0.4);
    if (partialGain <= 0 || partialDecay <= 0) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = base * ratio;
    osc.detune.value = (Math.random() * 2 - 1) * jitter;
    const amp = ctx.createGain();
    // A very short attack: struck, not bowed.
    decayEnvelope(amp.gain, t0, gain * partialGain, 0.003, partialDecay);
    osc.connect(amp).connect(body);
    osc.start(t0);
    osc.stop(t0 + partialDecay + 0.03);
  });
}

/** A short resonant blip: woodblock, tick, click. */
function click(ctx: AudioContext, opts: { freq?: number; q?: number; gain?: number; duration?: number; delay?: number }): void {
  const { freq = 1200, q = 14, gain = 0.16, duration = 0.05, delay = 0 } = opts;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  const amp = ctx.createGain();
  decayEnvelope(amp.gain, t0, gain, 0.001, duration);
  osc.connect(filter).connect(amp);
  out(ctx, amp, 0.08);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

/** A soft low impact — something being set down. */
function thud(ctx: AudioContext, opts: { freq?: number; gain?: number; delay?: number; duration?: number }): void {
  const { freq = 120, gain = 0.22, delay = 0, duration = 0.22 } = opts;
  tone(ctx, { freq, endFreq: freq * 0.55, duration, type: "sine", gain, delay, attack: 0.002 });
  burst(ctx, { duration: 0.05, gain: gain * 0.5, from: 1400, to: 260, type: "lowpass", delay });
}

// ═══════════════════════════════════════════════════════════
// THE CUE LIBRARY
// ═══════════════════════════════════════════════════════════

/**
 * One named cue, layered.
 *
 * Each case composes the primitives rather than calling a single one, which is the whole
 * point: a coin is a transient *and* a metal body *and* a little room. The comments record
 * what real thing each layer stands in for, because that is the review question later.
 */
function cue(ctx: AudioContext, name: string): void {
  switch (name) {
    // ── Cards ────────────────────────────────────────────────
    case "cardFlip":
    case "flip":
      // A card being turned over: the edge of paper ticks, then the face slaps down.
      // Paper ticks sit near 2 kHz, not 2.6: the higher figure is what made this read as
      // a mouse click rather than as card stock.
      click(ctx, { freq: 1900, q: 8, gain: 0.075, duration: 0.035 });
      burst(ctx, { duration: 0.12, gain: 0.15, from: 3600, to: 900, q: 0.9, swell: 0.6, reverb: 0.12 });
      thud(ctx, { freq: 165, gain: 0.06, delay: 0.07, duration: 0.11 });
      break;

    case "swipe":
      // Air past a moving card: a broadband sweep with a bell-shaped amplitude.
      burst(ctx, { duration: 0.3, gain: 0.19, from: 420, to: 2900, q: 0.7, swell: 1, reverb: 0.2 });
      burst(ctx, { duration: 0.24, gain: 0.085, from: 170, to: 820, type: "lowpass", swell: 1 });
      break;

    case "swipeBack":
      burst(ctx, { duration: 0.26, gain: 0.15, from: 2900, to: 420, q: 0.7, swell: 1, reverb: 0.16 });
      break;

    case "place":
      // Put down decisively: low body, paper transient on top.
      thud(ctx, { freq: 130, gain: 0.2, duration: 0.16 });
      burst(ctx, { duration: 0.06, gain: 0.1, from: 3600, to: 1400, q: 1 });
      break;

    // ── Feedback ─────────────────────────────────────────────
    case "coin":
      // A coin on a table: two bright metal bodies a beat apart, plus the click of contact.
      click(ctx, { freq: 3200, q: 10, gain: 0.05, duration: 0.02 });
      partials(ctx, { base: 1568, ratios: [1, 2.4, 3.83, 5.6], decays: [1, 0.7, 0.48, 0.3], gains: [1, 0.55, 0.32, 0.18], duration: 0.5, gain: 0.1, reverb: 0.4 });
      partials(ctx, { base: 2093, ratios: [1, 2.2, 4.1], decays: [1, 0.6, 0.35], gains: [0.8, 0.4, 0.2], duration: 0.42, delay: 0.055, gain: 0.08, reverb: 0.4 });
      break;

    case "tick":
      // A woodblock: mostly a resonant click, with a grain of noise for the mallet.
      click(ctx, { freq: 1150, q: 16, gain: 0.13, duration: 0.04 });
      burst(ctx, { duration: 0.02, gain: 0.05, from: 3000, to: 2000, q: 2 });
      break;

    case "whoosh":
      // Air moving: a wide sweep under a thinner, brighter layer.
      burst(ctx, { duration: 0.4, gain: 0.15, from: 260, to: 2800, q: 0.6, swell: 1, reverb: 0.3 });
      burst(ctx, { duration: 0.34, gain: 0.07, from: 800, to: 4300, q: 0.5, swell: 1 });
      break;

    case "buzz":
      // A soft electric buzzer. Deliberately *not* harsh: this fires on every wrong answer,
      // and a sound that punishes is the wrong sound for a learner.
      {
        const t0 = ctx.currentTime;
        const body = ctx.createGain();
        body.gain.setValueAtTime(0.0001, t0);
        body.gain.linearRampToValueAtTime(0.9, t0 + 0.01);
        body.gain.setValueAtTime(0.9, t0 + 0.3);
        body.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.44);

        // Two detuned saws an octave apart through a lowpass: the classic mechanism tone.
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 820;
        filter.Q.value = 0.9;
        ([{ f: 198, g: 0.07, det: -6 }, { f: 99, g: 0.05, det: 9 }] as const).forEach(({ f, g, det }) => {
          const osc = ctx.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(f, t0);
          osc.frequency.exponentialRampToValueAtTime(f * 0.76, t0 + 0.44);
          osc.detune.value = det;
          const amp = ctx.createGain();
          amp.gain.value = g;
          osc.connect(amp).connect(body);
          osc.start(t0);
          osc.stop(t0 + 0.47);
        });

        /*
         * A 22 Hz tremolo on the body gain.
         *
         * A held note is the difference between "a buzzer" and "a synth pad"; the wobble
         * is what makes it read as a mechanical relay rather than a chord.
         */
        const lfo = ctx.createOscillator();
        const lfoDepth = ctx.createGain();
        lfo.frequency.value = 22;
        lfoDepth.gain.value = 6;
        lfo.connect(lfoDepth).connect(body.gain);
        lfo.start(t0);
        lfo.stop(t0 + 0.47);

        body.connect(filter);
        out(ctx, filter, 0.12);
      }
      break;

    case "love":
      // A warm marimba-ish major arpeggio, held in the room.
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) =>
        partials(ctx, { base: freq, ratios: [1, 4.02], decays: [1, 0.3], gains: [1, 0.16], duration: 0.75, delay: index * 0.062, gain: 0.085, reverb: 0.45, jitter: 3 })
      );
      break;

    case "angry":
      /*
       * A low, soft growl: a falling saw under a breath of noise.
       *
       * This is the most-heard negative cue in the app, and the darkest: 150 Hz down to
       * 66 Hz at a gain that used to sit at 0.085 made it the loudest thing in a session.
       * Pulled back and lowpassed harder, it now lands as disappointment rather than as
       * a buzzer going off at a learner who got a word wrong.
       */
      tone(ctx, { freq: 150, endFreq: 70, duration: 0.42, type: "sawtooth", gain: 0.065, lowpass: 520, reverb: 0.2 });
      tone(ctx, { freq: 78, endFreq: 55, duration: 0.46, type: "triangle", gain: 0.06 });
      burst(ctx, { duration: 0.22, gain: 0.04, from: 800, to: 170, type: "lowpass", swell: 0.5 });
      break;

    // ── Reward ───────────────────────────────────────────────
    case "gacha":
      // A riser, so the pull has somewhere to go: chimes climbing into the reverb.
      [659.25, 830.61, 1046.5, 1318.51, 1661.22].forEach((freq, index) =>
        partials(ctx, { base: freq, ratios: [1, 2.9], decays: [1, 0.35], gains: [1, 0.22], duration: 0.7, delay: index * 0.075, gain: 0.06, reverb: 0.5 })
      );
      burst(ctx, { duration: 0.6, gain: 0.055, from: 700, to: 4600, q: 0.5, swell: 1, reverb: 0.4 });
      break;

    case "match":
      /*
       * The match moment.
       *
       * Two struck bells a major third apart with the second one ringing on — the same
       * shape as the chime every dating app uses, and for the same reason: a rising major
       * third is the shortest possible way to say "good news" without words. The noise
       * transient underneath is the mallet hitting metal.
       */
      burst(ctx, { duration: 0.07, gain: 0.07, from: 2600, to: 1100, q: 1.1 });
      partials(ctx, { base: 783.99, ratios: [1, 2.76, 5.4], decays: [1, 0.6, 0.34], gains: [1, 0.5, 0.22], duration: 0.9, gain: 0.085, reverb: 0.5, jitter: 4 });
      partials(ctx, { base: 987.77, ratios: [1, 2.76, 5.4, 8.9], decays: [1, 0.7, 0.45, 0.28], gains: [1, 0.5, 0.28, 0.14], duration: 2, delay: 0.13, gain: 0.095, reverb: 0.6, jitter: 4 });
      break;

    case "legendary":
      // A brass stab, then a bell chord with a long tail. The stack is saw + square through
      // a filter envelope, which is what gives the attack its bite without a sample.
      [261.63, 329.63, 392.0, 523.25].forEach((freq, index) => {
        const delay = index * 0.028;
        tone(ctx, { freq, duration: 1.1, type: "sawtooth", gain: 0.055, delay, lowpass: 2600, reverb: 0.5, detune: -4 });
        tone(ctx, { freq, duration: 1.1, type: "square", gain: 0.03, delay, lowpass: 1800, detune: 5 });
      });
      [523.25, 783.99, 1046.5, 1567.98].forEach((freq, index) =>
        partials(ctx, { base: freq, ratios: [1, 2.76, 5.4], decays: [1, 0.6, 0.34], gains: [1, 0.5, 0.24], duration: 2.2, delay: 0.34 + index * 0.05, gain: 0.075, reverb: 0.6, jitter: 5 })
      );
      break;

    case "levelup":
      // Pentatonic rising chimes, then a bell on the landing note.
      [523.25, 587.33, 659.25, 783.99, 880.0].forEach((freq, index) =>
        partials(ctx, { base: freq, ratios: [1, 3.9], decays: [1, 0.28], gains: [1, 0.18], duration: 0.8, delay: index * 0.085, gain: 0.07, reverb: 0.5, jitter: 4 })
      );
      partials(ctx, { base: 1046.5, ratios: [1, 2.76, 5.4, 8.9], decays: [1, 0.7, 0.45, 0.28], gains: [1, 0.5, 0.28, 0.14], duration: 2.4, delay: 0.44, gain: 0.085, reverb: 0.6 });
      break;

    case "victory":
      // The end of a battle: a rising fourth, then a wide major chord.
      [392.0, 523.25, 659.25].forEach((freq, index) =>
        partials(ctx, { base: freq, ratios: [1, 2.01, 4.1], decays: [1, 0.5, 0.25], gains: [1, 0.4, 0.16], duration: 1.6, delay: index * 0.13, gain: 0.075, reverb: 0.55 })
      );
      [523.25, 659.25, 783.99, 1046.5].forEach((freq) =>
        partials(ctx, { base: freq, ratios: [1, 2.8], decays: [1, 0.4], gains: [1, 0.25], duration: 2.6, delay: 0.46, gain: 0.06, reverb: 0.65 })
      );
      break;

    default:
      // An unknown cue is a programmer error, not a user-facing one: make it audible and
      // dull so it is noticed in development and harmless in production.
      click(ctx, { freq: 660, q: 6, gain: 0.08, duration: 0.06 });
  }
}

export class SoundEngine {
  private muted = false;

  /** Kept for API compatibility: nothing to preload when the sound is generated. */
  preload(_name?: string): void {}
  preloadAll(): void {}

  setMuted(muted: boolean): void {
    this.muted = !!muted;
  }

  /**
   * Play a cue.
   *
   * Warm the bus up once so the compressor and the impulse response are ready before the
   * first cue fires, otherwise the very first sound of a session is slightly flat.
   */
  play(name: string): void {
    if (this.muted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      getBus(ctx);
      cue(ctx, name);
    } catch {
      // A blocked or exhausted audio context must never stop the game.
    }
  }
}
