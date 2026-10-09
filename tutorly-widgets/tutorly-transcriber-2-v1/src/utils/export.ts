import type { TranscriptEntry, SpeakerConfig } from '../types';

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function exportAsTxt(
  entries: TranscriptEntry[],
  speakers: SpeakerConfig[]
): void {
  const speakerMap = Object.fromEntries(speakers.map(s => [s.role, s.label]));
  
  const lines: string[] = [
    `Lesson Transcript`,
    `Generated: ${formatDate(Date.now())} at ${formatTime(Date.now())}`,
    `${'='.repeat(60)}`,
    '',
  ];

  for (const entry of entries) {
    const label = speakerMap[entry.speaker] ?? entry.speaker;
    const time = formatTime(entry.timestamp);
    lines.push(`[${time}] ${label}:`);
    lines.push(entry.text);
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `transcript_${formatFilename()}.txt`);
}

export function exportAsCsv(
  entries: TranscriptEntry[],
  speakers: SpeakerConfig[]
): void {
  const speakerMap = Object.fromEntries(speakers.map(s => [s.role, s.label]));
  
  const header = ['Timestamp', 'Speaker', 'Role', 'Text'];
  const rows = entries.map(e => [
    new Date(e.timestamp).toISOString(),
    speakerMap[e.speaker] ?? e.speaker,
    e.speaker,
    `"${e.text.replace(/"/g, '""')}"`,
  ]);

  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `transcript_${formatFilename()}.csv`);
}

export function copyToClipboard(
  entries: TranscriptEntry[],
  speakers: SpeakerConfig[]
): Promise<void> {
  const speakerMap = Object.fromEntries(speakers.map(s => [s.role, s.label]));
  const text = entries
    .map(e => `[${formatTime(e.timestamp)}] ${speakerMap[e.speaker] ?? e.speaker}: ${e.text}`)
    .join('\n');
  return navigator.clipboard.writeText(text);
}

function formatFilename(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
