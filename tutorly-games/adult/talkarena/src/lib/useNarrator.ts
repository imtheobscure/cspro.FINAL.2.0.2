import { useCallback, useEffect, useState } from 'react';
import { loadVoices, speak, speakCast, stopSpeaking, type VoiceInfo } from './speech';
import { useGame } from '../store/GameContext';
import { audio } from './audio';

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export function useNarrator() {
  const { settings, update } = useGame();
  const [voices, setVoices] = useState<VoiceInfo[]>([]);

  useEffect(() => {
    let dead = false;
    loadVoices().then((v) => {
      if (dead) return;
      setVoices(v);
      if (!settings.narrator && v.length) {
        const pick = v.find((x) => x.natural && /en[-_]/i.test(x.lang)) ?? v.find((x) => /en[-_]/i.test(x.lang)) ?? v[0];
        update({ narrator: pick.uri });
      }
    });
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const english = voices.filter((v) => /en[-_]/i.test(v.lang));
  const pool = english.length ? english : voices;

  const castFor = useCallback(
    (character: string) => {
      const chosen = settings.cast[character];
      if (chosen) return chosen;
      if (!pool.length) return undefined;
      return pool[hash(character) % pool.length].uri;
    },
    [settings.cast, pool],
  );

  const say = useCallback(
    (text: string, voiceURI?: string) => {
      if (!text) return;
      audio.duck(0.22, Math.min(20000, 700 + text.length * 62));
      stopSpeaking();
      speak(text, { voiceURI: voiceURI ?? (settings.narrator || undefined), rate: settings.rate });
    },
    [settings.narrator, settings.rate],
  );

  const sayCast = useCallback(
    (lines: { character: string; text: string }[], onLine?: (i: number) => void, onDone?: () => void) => {
      audio.duck(0.18, Math.min(60000, 1200 + lines.reduce((a, l) => a + l.text.length, 0) * 62));
      stopSpeaking();
      speakCast(
        lines.map((l, i) => ({ text: l.text, voiceURI: castFor(l.character), rate: settings.rate, pitch: 0.92 + ((i * 7) % 5) * 0.06 })),
        onLine,
        onDone,
      );
    },
    [castFor, settings.rate],
  );

  const mixVoices = useCallback(
    (characters: string[]) => {
      if (!pool.length) return;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const cast: Record<string, string> = { ...settings.cast };
      characters.forEach((c, i) => {
        cast[c] = shuffled[i % shuffled.length].uri;
      });
      update({ cast });
    },
    [pool, settings.cast, update],
  );

  return { voices, pool, say, sayCast, castFor, mixVoices, stop: stopSpeaking };
}
