import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { store, useGameState } from "../../engine/store";
import { setSessionPanelOpen, switchChapter } from "../../engine/actions";
import { audio } from "../../engine/audio";
import { interpretTriggers } from "../../engine/triggers";
import type { EffectCard, WireMessage } from "../../engine/types";
import { Leaderboard } from "./Leaderboard";
import { SceneHost } from "./SceneHost";
import { Celebration, Countdown, EffectOverlay, JumpScare, Weather } from "./Overlays";
import { ChapterTabs } from "./ChapterTabs";
import { Pointers } from "./Pointers";
import { SessionPanel } from "./SessionPanel";

export function CanvasView({ openGM }: { openGM?: () => void }) {
  const state = useGameState();
  const activeChapter = state.chapters.find((c) => c.id === state.activeChapterId);

  const [activeEffect, setActiveEffect] = useState<EffectCard | null>(null);
  const [countdown, setCountdown] = useState(false);
  const [weather, setWeather] = useState(state.environment?.manualWeather ?? "clear");
  const [scare, setScare] = useState<{ emoji: string } | null>(null);
  const [celebrations, setCelebrations] = useState<{ id: string; emoji: string }[]>([]);
  const [prompts, setPrompts] = useState<{ entityId: string; hints: string[] }[]>([]);
  const pendingHtml = useRef<string | null>(null);

  const runScene = useCallback(
    (html: string) => {
      const res = interpretTriggers(html, store.getSnapshot());
      // visuals — environment is ALWAYS clear unless the GM sets it manually,
      // so we deliberately ignore AI weather triggers here.
      res.visuals.forEach((v) => {
        if (v.kind === "ring") audio.ring();
      });
      // celebrations
      if (res.celebrations.length) {
        const cs = res.celebrations.map((c) => ({ id: nanoid(5), emoji: c.emoji }));
        setCelebrations(cs);
        setTimeout(() => setCelebrations([]), 1500);
      }
      // prompts — DEDUPE by entityId so a player never appears twice.
      const seen = new Set<string>();
      const uniquePrompts = res.prompts.filter((p) => {
        if (seen.has(p.entityId)) return false;
        seen.add(p.entityId);
        return true;
      });
      // prompts are surfaced through the leaderboard "What do you do?" modal now.
      setPrompts(uniquePrompts);
      // Per user request: do NOT auto-read on deploy. Generated scenes should
      // speak only when their own code calls awRead(), or when the GM sends a
      // Conversation turn. data-aw="speak" is still parsed for inspection, but
      // it no longer auto-plays and interrupts the game.
      audio.stopSpeaking();
    },
    [],
  );



  // Wire listener: countdown, deploy, effects, speak
  useEffect(() => {
    const off = store.onWire((m: WireMessage) => {
      switch (m.type) {
        case "COUNTDOWN":
          setCountdown(true);
          break;
        case "DEPLOY_HTML":
          pendingHtml.current = m.html;
          // if no countdown was requested, run immediately
          setTimeout(() => {
            if (pendingHtml.current) {
              runScene(pendingHtml.current);
              pendingHtml.current = null;
            }
          }, 50);
          break;
        case "TRIGGER_EFFECT":
          setActiveEffect(m.effect);
          if (m.effect.soundUrl) audio.playFx(m.effect.soundUrl);
          // For jump-scare effects, also fire the canvas scare overlay
          if (m.effect.animation === "flash" && (m.effect.name || "").toLowerCase().includes("scare")) {
            setScare({ emoji: m.effect.emoji });
          }
          break;
        case "SPEAK":
          audio.speak(m.text, m.voiceURI);
          break;
        case "ENVIRONMENT":
          if (m.weather) setWeather(m.weather);
          break;
      }
    });
    return off;
  }, [runScene]);

  // Apply active soundscape
  useEffect(() => {
    const ss = state.soundscapes.find((s) => s.id === state.activeSoundscapeId);
    if (ss?.url) audio.playAmbient(ss.url, ss.volume, ss.loop);
    else audio.stopAmbient();
  }, [state.activeSoundscapeId, state.soundscapes]);

  // Pause handling
  useEffect(() => {
    if (state.paused) audio.pauseAll();
    else audio.resumeAll();
  }, [state.paused]);

  useEffect(() => {
    if (state.environment?.manualWeather) setWeather(state.environment.manualWeather);
  }, [state.environment?.manualWeather]);

  const onCountdownDone = useCallback(() => {
    setCountdown(false);
    if (pendingHtml.current) {
      runScene(pendingHtml.current);
      pendingHtml.current = null;
    } else if (activeChapter) {
      runScene(activeChapter.html);
    }
  }, [runScene, activeChapter]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#05070f] text-slate-100">
      <button
        onClick={() => setSessionPanelOpen(!state.sessionPanelOpen)}
        className="absolute right-4 top-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-violet-600/90 to-fuchsia-600/90 text-2xl font-black text-white shadow-[0_0_30px_rgba(139,92,246,.5)] ring-1 ring-white/20 backdrop-blur-xl transition hover:scale-105 hover:brightness-110"
        title="Join session / collaboration panel"
      >
        🌐
      </button>
      
      <Leaderboard entities={state.entities} settings={state.settings} prompts={prompts} />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <ChapterTabs />
        
        {state.chapters.length > 1 && (
          <div className="flex items-center justify-center gap-3 border-b border-white/10 bg-slate-950/60 px-4 py-1.5">
            <button 
              onClick={() => {
                const idx = state.chapters.findIndex(c => c.id === state.activeChapterId);
                if (idx > 0) switchChapter(state.chapters[idx - 1].id);
              }}
              disabled={state.chapters.findIndex(c => c.id === state.activeChapterId) <= 0}
              className="rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10 disabled:opacity-30 hover:bg-white/10"
            >
              ◀ Prev Chapter
            </button>
            <span className="text-xs text-slate-400">
              Chapter {state.chapters.findIndex(c => c.id === state.activeChapterId) + 1} / {state.chapters.length}
            </span>
            <button 
              onClick={() => {
                const idx = state.chapters.findIndex(c => c.id === state.activeChapterId);
                if (idx < state.chapters.length - 1) switchChapter(state.chapters[idx + 1].id);
              }}
              disabled={state.chapters.findIndex(c => c.id === state.activeChapterId) >= state.chapters.length - 1}
              className="rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10 disabled:opacity-30 hover:bg-white/10"
            >
              Next Chapter ▶
            </button>
          </div>
        )}

        <div className="relative flex-1 overflow-hidden">
          <div key={`${activeChapter?.id ?? "empty"}-${state.sceneReloadKey ?? 0}`} className="h-full w-full aw-scene-fade">
            <SceneHost html={activeChapter?.html ?? ""} paused={state.paused} openingImageUrl={state.environment?.openingImageUrl} />
          </div>
          <Weather kind={weather} />
          <EffectOverlay effect={activeEffect} onDone={() => setActiveEffect(null)} />
          <JumpScare data={scare} onDone={() => setScare(null)} />
          <Celebration items={celebrations} />
          <Countdown active={countdown} onDone={onCountdownDone} />
          {!state.sessionPanelOpen && <Pointers />}

          {state.paused && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/50 backdrop-blur-sm">
              <div className="text-4xl font-black tracking-widest text-white/80">⏸ PAUSED</div>
            </div>
          )}
        </div>

      </main>

      {openGM && (
        <button
          onClick={openGM}
          title="Open GM Control Panel"
          className="absolute bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-xl shadow-indigo-900/50 hover:brightness-110"
        >
          🎛️ GM Panel
        </button>
      )}

      {state.sessionPanelOpen && <SessionPanel />}
    </div>
  );
}

// expose for GM to trigger effect locally too
export function triggerEffect(effect: EffectCard) {
  store.command({ type: "TRIGGER_EFFECT", effect });
}
