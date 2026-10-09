import { useCallback, useEffect, useState } from 'react';
import { loadVoices, speak, stopSpeaking, type VoiceInfo } from './speech';
import { useSession } from '../store/Session';
import { audio } from './audio';

/**
 * Read a line out loud — always because the tutor tapped, never on its own.
 *
 * A projector screen is read from the back of the room, so the narrator is the
 * accessibility feature a classroom actually uses: "Category: animals. Shout
 * what you see!" before a wave, and the rule reminder when the pace changes.
 */
export function useNarrator() {
  const { settings, update } = useSession();
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

  const say = useCallback(
    (text: string) => {
      if (!text) return;
      audio.duck(0.22, Math.min(20000, 700 + text.length * 62));
      stopSpeaking();
      speak(text, { voiceURI: settings.narrator || undefined, rate: settings.rate });
    },
    [settings.narrator, settings.rate],
  );

  return { voices, pool, say, stop: stopSpeaking };
}
