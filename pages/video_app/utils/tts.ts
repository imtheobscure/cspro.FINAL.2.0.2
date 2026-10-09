let selectedVoice: SpeechSynthesisVoice | null = null;

export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

export function getBestNaturalVoice(lang = 'en'): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (!voices.length) return null;

  // Priority: natural/premium voices, then any English voice
  const preferred = ['Google', 'Samantha', 'Karen', 'Moira', 'Daniel', 'Tessa', 'Veena', 'Rishi', 'Fiona', 'Alex'];
  const bad = ['Microsoft David', 'Microsoft Mark', 'Microsoft Zira'];

  const langVoices = voices.filter(v => v.lang.startsWith(lang) && !bad.some(b => v.name.includes(b)));
  
  for (const name of preferred) {
    const v = langVoices.find(v => v.name.includes(name));
    if (v) return v;
  }
  
  // Return first non-bad English voice
  return langVoices[0] ?? voices.find(v => !bad.some(b => v.name.includes(b))) ?? voices[0];
}

export function setGlobalVoice(voice: SpeechSynthesisVoice) {
  selectedVoice = voice;
}

export function getGlobalVoice(): SpeechSynthesisVoice | null {
  return selectedVoice;
}

export function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '')
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speak(
  text: string,
  voiceOverride?: SpeechSynthesisVoice | null,
  rate = 1,
  onEnd?: () => void
): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = stripEmojis(text);
  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate = rate;
  utter.pitch = 1;
  utter.volume = 1;

  const voice = voiceOverride ?? selectedVoice ?? getBestNaturalVoice();
  if (voice) utter.voice = voice;

  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel();
}

export function speakWithCatVoice(
  text: string,
  catVoiceName: string,
  muted: boolean,
  onEnd?: () => void
): void {
  if (muted || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = stripEmojis(text);
  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate = 1.05;
  utter.pitch = 1.1;

  const voices = getVoices();
  let voice: SpeechSynthesisVoice | null = null;
  if (catVoiceName) {
    voice = voices.find(v => v.name === catVoiceName) ?? null;
  }
  if (!voice) voice = getBestNaturalVoice();
  if (voice) utter.voice = voice;

  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
}
