import type { Learner } from '../types';

/**
 * Speak a random dialogue card as a specific learner using their unique voice.
 * Falls back to a natural English voice if no learner voice is set.
 * NEVER uses Microsoft David.
 */
export function speakAsLearner(learner: Learner, voices: SpeechSynthesisVoice[]) {
  if (!window.speechSynthesis || !learner.voiceCards.length) return;
  window.speechSynthesis.cancel();

  const card = learner.voiceCards[Math.floor(Math.random() * learner.voiceCards.length)];
  const utterance = new SpeechSynthesisUtterance(card.text);

  // 1. Try learner's assigned voice
  if (learner.learnerVoice) {
    const v = voices.find(v => v.name === learner.learnerVoice);
    if (v) { utterance.voice = v; }
  }

  // 2. Fallback: find a natural-sounding voice, NEVER David
  if (!utterance.voice) {
    const natural =
      voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
      voices.find(v => v.lang.startsWith('en') && v.name.includes('Online')) ||
      voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
      voices.find(v => v.lang.startsWith('en-US') && !v.name.includes('David') && !v.name.includes('Zira')) ||
      voices.find(v => v.lang.startsWith('en') && !v.name.includes('David')) ||
      voices.find(v => v.lang.startsWith('en'));
    if (natural) utterance.voice = natural;
  }

  utterance.pitch = 1;
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
