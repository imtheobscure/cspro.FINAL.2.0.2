

// --- Audio Decoding ---

/**
 * Decodes a base64 string into a Uint8Array.
 * @param base64 The base64 encoded string.
 * @returns A Uint8Array of the decoded data.
 */
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer for playback.
 * The browser's native `decodeAudioData` cannot be used as it expects a full audio file format (like WAV or MP3), not a raw stream.
 * @param data The raw PCM audio data as a Uint8Array.
 * @param ctx The AudioContext to use for creating the buffer.
 * @param sampleRate The sample rate of the audio (e.g., 24000 for TTS, 16000 for Live input).
 * @param numChannels The number of audio channels (typically 1).
 * @returns A Promise that resolves to an AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // The raw data is 16-bit PCM, so we create an Int16Array view on the buffer.
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize the 16-bit integer samples to the -1.0 to 1.0 range for the Web Audio API.
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


// --- Audio Encoding ---

/**
 * Encodes a Uint8Array into a base64 string.
 * @param bytes The Uint8Array to encode.
 * @returns A base64 encoded string.
 */
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Adds a WAV header to raw PCM data.
 * @param pcmData The raw PCM audio data.
 * @param sampleRate The sample rate (e.g., 24000).
 * @returns A Uint8Array containing the full WAV file (header + data).
 */
export function pcmToWav(pcmData: Uint8Array, sampleRate: number): Uint8Array {
    const headerLen = 44;
    const totalLen = headerLen + pcmData.length;
    const buffer = new ArrayBuffer(totalLen);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + pcmData.length, true);
    // WAVE identifier
    writeString(view, 8, 'WAVE');
    // fmt chunk identifier
    writeString(view, 12, 'fmt ');
    // fmt chunk length
    view.setUint32(16, 16, true);
    // Sample format (1 is PCM)
    view.setUint16(20, 1, true);
    // Channel count (1 for mono)
    view.setUint16(22, 1, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate (sampleRate * blockAlign)
    view.setUint32(28, sampleRate * 2, true);
    // Block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // Bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, pcmData.length, true);

    const wavBytes = new Uint8Array(buffer);
    wavBytes.set(pcmData, 44);
    return wavBytes;
}

/**
 * Plays a success "beep" sound using the Web Audio API.
 */
export const playSuccessSound = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        console.error("Failed to play success sound", e);
    }
};

/**
 * Plays a customizable synthesized alarm sound using the Web Audio API. This avoids loading slow mp3 files
 * and ensures 100% offline accuracy inside sandboxed iframes.
 */
export const playSynthAlarm = (type: string) => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;
        
        switch (type) {
            case 'zen': {
                // Mystical Tibetan Temple Bell Chime
                const osc = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now); // Fundamental A4
                osc.frequency.exponentialRampToValueAtTime(110, now + 3);
                
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(554.37, now); // Warm major-third high harmonic
                osc2.frequency.exponentialRampToValueAtTime(220, now + 2.5);
                
                gainNode.gain.setValueAtTime(0.4, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
                
                osc.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                osc.start(now);
                osc2.start(now);
                osc.stop(now + 3.5);
                osc2.stop(now + 3.5);
                break;
            }
            case 'digital': {
                // High-fidelity contemporary digital electronic beep-beep-beep
                const playBeep = (startTime: number, pitch: number) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(pitch, startTime);
                    gain.gain.setValueAtTime(0.25, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + 0.15);
                };
                playBeep(now, 880);
                playBeep(now + 0.18, 987.77);
                playBeep(now + 0.36, 1046.5);
                break;
            }
            case 'classic': {
                // Rapid nostalgic alarm bell rings with rapid frequency modulation (metallic)
                const playClash = (startTime: number) => {
                    const osc = ctx.createOscillator();
                    const modulator = ctx.createOscillator();
                    const modGain = ctx.createGain();
                    const gain = ctx.createGain();
                    
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(1100, startTime);
                    
                    modulator.frequency.setValueAtTime(120, startTime);
                    modGain.gain.setValueAtTime(200, startTime);
                    
                    gain.gain.setValueAtTime(0.3, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
                    
                    modulator.connect(modGain);
                    modGain.connect(osc.frequency);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    modulator.start(startTime);
                    osc.start(startTime);
                    modulator.stop(startTime + 0.45);
                    osc.stop(startTime + 0.45);
                };
                
                for (let i = 0; i < 4; i++) {
                    playClash(now + (i * 0.15));
                }
                break;
            }
            case 'synth': {
                // Beautiful retro cyber-punk arpeggio sweep
                const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major
                
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const biquadFilter = ctx.createBiquadFilter();
                    const noteStartTime = now + (idx * 0.08);
                    
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, noteStartTime);
                    
                    biquadFilter.type = 'lowpass';
                    biquadFilter.Q.setValueAtTime(6, noteStartTime);
                    biquadFilter.frequency.setValueAtTime(freq * 3, noteStartTime);
                    biquadFilter.frequency.exponentialRampToValueAtTime(freq, noteStartTime + 0.25);
                    
                    gain.gain.setValueAtTime(0.12, noteStartTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, noteStartTime + 0.25);
                    
                    osc.connect(biquadFilter);
                    biquadFilter.connect(gain);
                    gain.connect(ctx.destination);
                    
                    osc.start(noteStartTime);
                    osc.stop(noteStartTime + 0.3);
                });
                break;
            }
            default:
                break;
        }
    } catch (e) {
        console.error("Audio synth error:", e);
    }
};
