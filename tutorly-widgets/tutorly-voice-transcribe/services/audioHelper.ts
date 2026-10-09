/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Encode AudioBuffer to standard PCM WAV format in memory
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 1) {
    result = buffer.getChannelData(0);
  } else {
    // Interleave channels
    const ch1 = buffer.getChannelData(0);
    const ch2 = buffer.getChannelData(1);
    result = interleave(ch1, ch2);
  }
  
  const bufferLength = result.length * 2;
  const bufferArray = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(bufferArray);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + bufferLength, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* chunk length */
  view.setUint32(40, bufferLength, true);
  
  // Write interleaved audio data as 16-bit signed PCM
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([view], { type: 'audio/wav' });
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Trims silence from an AudioBuffer using simple threshold gating.
 * It identifies blocks where amplitude does not cross the threshold.
 * If silent blocks are consecutive and long, they are skipped.
 */
export async function trimSilence(
  audioBlob: Blob,
  thresholdDb: number = -45, // dB threshold
  silenceMinDurationMs: number = 1500 // Min silence to trim in ms
): Promise<Blob> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    const chData = audioBuffer.getChannelData(0); // Use channel 0 for analysis
    
    // Convert Db to linear amplitude threshold
    const thresholdLinear = Math.pow(10, thresholdDb / 20);
    const minSilenceSamples = (silenceMinDurationMs / 1000) * sampleRate;
    
    // Analyze in segments of 50ms (window size)
    const windowSizeMs = 50;
    const windowSamples = Math.floor((windowSizeMs / 1000) * sampleRate);
    
    const segmentsToKeep: Array<{ start: number; end: number }> = [];
    let isSilentBlockActive = false;
    let currentBlockStart = 0;
    
    for (let i = 0; i < chData.length; i += windowSamples) {
      const windowEnd = Math.min(i + windowSamples, chData.length);
      
      // Calculate Peak Amplitude in window
      let peak = 0;
      for (let j = i; j < windowEnd; j++) {
        const val = Math.abs(chData[j]);
        if (val > peak) peak = val;
      }
      
      const isWindowSilent = peak < thresholdLinear;
      
      if (isWindowSilent) {
        if (!isSilentBlockActive) {
          isSilentBlockActive = true;
          currentBlockStart = i;
        }
      } else {
        if (isSilentBlockActive) {
          const silentDurationSamples = i - currentBlockStart;
          if (silentDurationSamples >= minSilenceSamples) {
            // Yes, this was a long silent gap! We keep the speech prior to this.
            if (currentBlockStart > (segmentsToKeep[segmentsToKeep.length - 1]?.end || 0)) {
              segmentsToKeep.push({
                start: segmentsToKeep[segmentsToKeep.length - 1]?.end || 0,
                end: currentBlockStart
              });
            }
          }
          isSilentBlockActive = false;
        }
      }
    }
    
    // Wrap up trailing segment
    if (!isSilentBlockActive) {
      const lastEnd = segmentsToKeep[segmentsToKeep.length - 1]?.end || 0;
      if (chData.length > lastEnd) {
        segmentsToKeep.push({ start: lastEnd, end: chData.length });
      }
    } else {
      // If trailing silence is long, drop it
      const silentSamples = chData.length - currentBlockStart;
      const lastEnd = segmentsToKeep[segmentsToKeep.length - 1]?.end || 0;
      if (silentSamples < minSilenceSamples && chData.length > lastEnd) {
        segmentsToKeep.push({ start: lastEnd, end: chData.length });
      } else if (currentBlockStart > lastEnd) {
        segmentsToKeep.push({ start: lastEnd, end: currentBlockStart });
      }
    }
    
    // If we have nothing to keep, return the original audio
    if (segmentsToKeep.length === 0) {
      return audioBlob;
    }
    
    // Calculate total keep samples
    let totalSamples = 0;
    for (const seg of segmentsToKeep) {
      totalSamples += (seg.end - seg.start);
    }
    
    // Create new AudioBuffer
    const trimmedBuffer = audioContext.createBuffer(channels, totalSamples, sampleRate);
    for (let ch = 0; ch < channels; ch++) {
      const originalChannel = audioBuffer.getChannelData(ch);
      const trimmedChannel = trimmedBuffer.getChannelData(ch);
      let writePointer = 0;
      
      for (const seg of segmentsToKeep) {
        const length = seg.end - seg.start;
        for (let j = 0; j < length; j++) {
          trimmedChannel[writePointer + j] = originalChannel[seg.start + j];
        }
        writePointer += length;
      }
    }
    
    return audioBufferToWav(trimmedBuffer);
  } catch (error) {
    console.error("Failed to trim silence from audio:", error);
    return audioBlob; // Return original on error
  } finally {
    audioContext.close();
  }
}

/**
 * Capture microphone audio and screen share audio from a Shared Tab, and mix them together.
 * Returns the mixed stream and allows the tracks to be recorded.
 */
export async function createMixedSpeechStream(
  micStream: MediaStream,
  tabStream: MediaStream
): Promise<{ mixedStream: MediaStream; micOnlyTrack: MediaStreamTrack; tabOnlyTrack: MediaStreamTrack | null }> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const dest = audioContext.createMediaStreamDestination();
  
  // Microphone source
  const micSource = audioContext.createMediaStreamSource(micStream);
  const micTrack = micStream.getAudioTracks()[0];
  
  // Tab Source (System Audio)
  let tabTrack: MediaStreamTrack | null = null;
  const tabAudioTracks = tabStream.getAudioTracks();
  if (tabAudioTracks.length > 0) {
    tabTrack = tabAudioTracks[0];
    const tabSource = audioContext.createMediaStreamSource(tabStream);
    tabSource.connect(dest);
  }
  
  micSource.connect(dest);
  
  return {
    mixedStream: dest.stream,
    micOnlyTrack: micTrack,
    tabOnlyTrack: tabTrack
  };
}
