"use client";

import React, { useMemo, useState } from "react";
import { useContent } from "@/lib/content-provider";
import { AZURE_VOICES, assignVoices, speakLine, stopSpeaking, useVoiceConfig } from "@/lib/tts";

/**
 * Voice settings.
 *
 * Dialogues are read with Microsoft Azure *natural* neural voices — one distinct
 * voice per character. There are two ways to get them, and this panel covers both:
 *   1. paste your own Azure Speech key + region (used straight from the browser), or
 *   2. leave the key empty and let the app's server proxy handle it when the app is
 *      served by the Express host (the key then stays on the server).
 * With neither, the app falls back to the browser's built-in voices, still one
 * per character.
 */
export function VoiceSettings() {
  const { pack } = useContent();
  const [config, setConfig] = useVoiceConfig();
  const [showKey, setShowKey] = useState(false);

  /** Every speaker in the pack, with the voice that will perform them. */
  const cast = useMemo(() => {
    const speakers: string[] = [];
    for (const convo of pack.conversations) {
      for (const turn of convo.turns) {
        const name = (turn.name || turn.speaker || "").trim();
        if (name && !speakers.some((s) => s.toLowerCase() === name.toLowerCase())) speakers.push(name);
      }
    }
    const voices = assignVoices(speakers, pack.meta.targetLanguage);
    return speakers.slice(0, 12).map((s) => ({ speaker: s, voice: voices[s] }));
  }, [pack.conversations, pack.meta.targetLanguage]);

  const configured = config.azure && config.key.trim().length > 0;
  const sameVoice = new Set(cast.map((c) => c.voice?.id)).size !== cast.length && cast.length > 1;

  return (
    <div className="card-light mt-3 rounded-3xl border-2 border-blue-200 bg-[#F2FAFF] p-4">
      <h3 className="font-black text-slate-800">🗣️ Dialogue voices</h3>
      <p className="mt-1 text-xs text-slate-500">
        Every character gets their own <b>Microsoft Azure natural voice</b> — two speakers never share one. Voices are chosen
        to match the language being taught
        {pack.meta.targetLanguage ? ` (${pack.meta.targetLanguage})` : ""}. Without Azure the app uses the browser&apos;s own
        voices, still one per character.
      </p>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-white p-3">
        <span className="text-sm font-bold text-slate-600">Use Azure natural voices</span>
        <button
          onClick={() => setConfig({ azure: !config.azure })}
          className={`h-7 w-14 rounded-full p-1 transition ${config.azure ? "bg-[#58CC02]" : "bg-slate-300"}`}
          aria-label="Toggle Azure voices"
        >
          <span className={`block h-5 w-5 rounded-full bg-white transition-all ${config.azure ? "translate-x-7" : ""}`} />
        </button>
      </div>

      {config.azure && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="rounded-2xl bg-white p-3">
            <span className="text-xs font-black text-slate-500">Azure region</span>
            <input
              value={config.region}
              onChange={(e) => setConfig({ region: e.target.value.trim() })}
              placeholder="e.g. westeurope"
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-mono text-xs font-bold outline-none focus:border-[#1CB0F6]"
            />
          </label>
          <label className="rounded-2xl bg-white p-3">
            <span className="text-xs font-black text-slate-500">
              Azure Speech key{" "}
              <button type="button" onClick={() => setShowKey((v) => !v)} className="font-black text-[#1CB0F6]">
                {showKey ? "hide" : "show"}
              </button>
            </span>
            <input
              value={config.key}
              onChange={(e) => setConfig({ key: e.target.value })}
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder="your Speech resource key"
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-mono text-xs font-bold outline-none focus:border-[#1CB0F6]"
            />
          </label>
        </div>
      )}

      {config.azure && (
        <label className="mt-2 block rounded-2xl bg-white p-3">
          <span className="text-xs font-black text-slate-500">Speaking speed — {config.rate.toFixed(2)}×</span>
          <input
            type="range"
            min={0.6}
            max={1.3}
            step={0.05}
            value={config.rate}
            onChange={(e) => setConfig({ rate: Number(e.target.value) })}
            className="mt-2 w-full accent-[#58CC02]"
          />
        </label>
      )}

      <p className="mt-2 rounded-2xl bg-white px-3 py-2 text-[11px] font-bold text-slate-500">
        {configured ? (
          <>✅ Azure is on — your key is stored only in this browser and sent directly to Microsoft.</>
        ) : config.azure ? (
          <>⚠️ No key yet. Add one here, or let the app&apos;s server proxy serve the voices when it is hosted by the Express app.</>
        ) : (
          <>🔈 Azure is off — the browser&apos;s built-in voices are used (they vary by machine).</>
        )}
      </p>

      <label className="mt-3 block rounded-2xl bg-white p-3">
        <span className="text-xs font-black text-slate-500">Voice per character (unique — click to preview)</span>
        {cast.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">This pack has no dialogues yet, so there is no cast to assign.</p>
        ) : (
          <>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {cast.map(({ speaker, voice }) => (
                <li key={speaker}>
                  <button
                    onClick={() => void speakLine(`${speaker}`, { speaker, voice, language: pack.meta.targetLanguage })}
                    className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-left transition hover:bg-blue-50"
                    title={`Preview ${voice?.label ?? "voice"}`}
                  >
                    <span className="text-lg">{voice?.gender === "Female" ? "👩" : "🧑"}</span>
                    <span className="flex-1">
                      <span className="block text-sm font-black text-slate-700">{speaker}</span>
                      <span className="block text-[10px] font-bold text-slate-400">{voice?.label ?? "browser voice"}</span>
                    </span>
                    <span className="text-xs text-blue-400">🔊</span>
                  </button>
                </li>
              ))}
            </ul>
            {sameVoice && (
              <p className="mt-2 text-[10px] font-bold text-amber-600">
                Some characters share a voice — {AZURE_VOICES.length} voices are not enough for this cast, so the app reuses
                the closest fit rather than leaving anyone silent.
              </p>
            )}
          </>
        )}
      </label>

      <button
        onClick={() => stopSpeaking()}
        className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500"
      >
        ⏹ Stop all audio
      </button>
    </div>
  );
}
