import type { SubtitleCue } from '../types';

function timeToSeconds(timeStr: string): number {
  const clean = timeStr.trim();
  // Support HH:MM:SS.mmm and MM:SS.mmm
  const parts = clean.split(':');
  let hours = 0, minutes = 0, seconds = 0;
  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  } else {
    seconds = parseFloat(parts[0]);
  }
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseVTT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = content.split('\n');
  let i = 0;

  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes('-->')) i++;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim().split(' ')[0]);
      const startTime = timeToSeconds(startStr);
      const endTime = timeToSeconds(endStr);
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        // Remove VTT tags like <b>, <i>, <c>
        textLines.push(lines[i].replace(/<[^>]+>/g, '').trim());
        i++;
      }
      const text = textLines.join(' ').trim();
      if (text) {
        cues.push({
          id: `cue-${cues.length}`,
          startTime,
          endTime,
          text,
        });
      }
    }
    i++;
  }
  return cues;
}

export function parseSRT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = content.split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;
    // Find the line with -->
    let timeLine = -1;
    for (let j = 0; j < lines.length; j++) {
      if (lines[j].includes('-->')) { timeLine = j; break; }
    }
    if (timeLine === -1) continue;
    const [startStr, endStr] = lines[timeLine].split('-->').map(s => s.trim().replace(',', '.'));
    const startTime = timeToSeconds(startStr);
    const endTime = timeToSeconds(endStr);
    const text = lines.slice(timeLine + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (text) {
      cues.push({ id: `cue-${cues.length}`, startTime, endTime, text });
    }
  }
  return cues;
}

export function parseSubtitles(content: string, filename?: string): SubtitleCue[] {
  const ext = filename?.toLowerCase().split('.').pop();
  if (ext === 'srt') return parseSRT(content);
  return parseVTT(content); // default to VTT
}
