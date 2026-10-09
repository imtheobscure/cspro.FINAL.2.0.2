"use client";

import { useCallback, useEffect } from "react";
import { useTutor } from "./store";
import { speak, stopSpeaking, azureStatus } from "./speech";
import { setSfxEnabled, sfxSpeak } from "./sfx";
import type { Lang, Word } from "./data/types";
import { label } from "./data";

export function useVoice() {
  const muted = useTutor((s) => s.muted);
  const slow = useTutor((s) => s.slow);
  const voice = useTutor((s) => s.voice);
  const local = useTutor((s) => s.useLocalVoice);

  const say = useCallback(
    (text: string, lang: Lang) => {
      if (!muted) sfxSpeak();
      return speak(text, { lang, slow, voice: voice || undefined, local, muted });
    },
    [muted, slow, voice, local],
  );

  /** Say the word in the target language (and the home language when bilingual). */
  const sayWord = useCallback(
    async (word: Word, targetLang: Lang, homeLang: Lang, mono: boolean) => {
      if (muted) return;
      sfxSpeak();
      await speak(label(word, targetLang), { lang: targetLang, slow, voice: voice || undefined, local, muted });
      if (!mono && homeLang !== targetLang) {
        await speak(label(word, homeLang), { lang: homeLang, slow, voice: voice || undefined, local, muted });
      }
    },
    [muted, slow, voice, local],
  );

  return { say, sayWord, stop: stopSpeaking, muted };
}

/** Keeps the synthesised sound-effect engine in sync with tutor toggles + rehydrates saved settings. */
export function useSfxSync() {
  const sfx = useTutor((s) => s.sfx);
  const muted = useTutor((s) => s.muted);
  useEffect(() => {
    setSfxEnabled(sfx && !muted);
    void useTutor.persist.rehydrate();
  }, [sfx, muted]);
}

export function useAzureBadge() {
  const local = useTutor((s) => s.useLocalVoice);
  return { status: azureStatus(), local };
}
