import { useEffect, useRef } from "react";
import { useStore, store, bus, useBus } from "../state/store";
import AvatarWidget from "./AvatarWidget";
import SidePanel from "./SidePanel";
import { AnnotationOverlay } from "./AnnotationsPanel";
import CanvasTabs from "./CanvasTabs";
import Leaderboard from "./Leaderboard";
import Reactions from "./Reactions";
import PollDisplay from "./PollDisplay";
import { ClassTimerWidget, CountdownTimerWidget } from "./Timers";
import CompanionCat from "./CompanionCat";
import { useState } from "react";
import { onVoicesReady, speak, stopSpeech, pauseSpeech, resumeSpeech } from "../lib/speech";
import { startChatter, stopChatter, reactionFanfare } from "../lib/sounds";
import { addMessage } from "./SidePanel";
import { hasRecentSpeech, postSpeechBubble } from "../chat/messages";
import { Btn } from "../ui/primitives";

const TUTOR_WIN_NAME = "tutor-control-window";

export default function Classroom() {
  const settings = useStore((s) => s.settings);
  const speaker = useStore((s) => s.speaker);
  const npcs = useStore((s) => s.npcs);
  const tutorWinRef = useRef<Window | null>(null);

  // Init speech voices
  useEffect(() => {
    onVoicesReady(() => {});
  }, []);

  // Auto-open Share panel for join links
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("join")) {
      store.set((s) => { s.settings.panelOpen = true; return { ...s }; });
    }
  }, []);

  // Live viewer fluctuation
  useEffect(() => {
    if (!settings.liveAuto) return;
    const id = setInterval(() => {
      store.set((s) => {
        if (!s.settings.liveAuto) return s;
        const delta = Math.round((Math.random() - 0.5) * 6);
        const next = Math.max(5, Math.min(50, s.settings.liveViewerCount + delta));
        s.settings.liveViewerCount = next;
        return { ...s };
      });
    }, 10000 + Math.random() * 20000);
    return () => clearInterval(id);
  }, [settings.liveAuto]);

  // Background chatter toggle
  useEffect(() => {
    if (settings.backgroundChatter) startChatter();
    else stopChatter();
    return () => stopChatter();
  }, [settings.backgroundChatter]);

  // Speech events
  useBus((ev) => {
    if (ev.type === "speak-request") {
      const { npcId, text, emoji, replay } = ev.payload;
      const npc = store.get().npcs.find((n) => n.id === npcId);
      if (!npc) return;

      // Cancel any current speech before switching to the next speaker.
      stopSpeech();

      // Immediately mark this NPC as the active visible speaker.
      store.set((s) => ({
        ...s,
        speaker: { npcId, text, emoji: emoji || null, speaking: true },
      }));

      // A character who speaks must show up in the chat: the bubble carries their
      // round photo, the transcript and a replay button. Two cases must NOT post
      // one: a replay of a line that is already in the log (read-aloud, or the
      // tutor re-speaking an earlier bubble), and a line the tutor's tools posted
      // a moment ago.
      if (!replay && !hasRecentSpeech(npcId, text)) postSpeechBubble(npc, text, emoji);

      speak({
        text,
        voiceURI: npc.voiceURI,
        rate: npc.speechSpeed,
        pitch: npc.pitch,
        onStart: () => {
          // Re-assert speaker at speech start in case another flow touched it.
          store.set((s) => ({
            ...s,
            speaker: { npcId, text, emoji: emoji || null, speaking: true },
          }));
          if (emoji) {
            for (let i = 0; i < 3; i++) {
              setTimeout(() => bus.emit("floating-emoji", { emoji }), i * 250);
            }
          }
        },
        onEnd: () => {
          // Only clear if this exact NPC is still the active speaker.
          const cur = store.get().speaker;
          if (cur.npcId === npcId) {
            store.set((s) => ({
              ...s,
              speaker: { npcId: null, text: "", emoji: null, speaking: false },
            }));
          }
          bus.emit("speech-ended", { npcId });
        },
      });
    } else if (ev.type === "speak-pause") {
      pauseSpeech();
      // Preserve npcId/text so the widget stays on the paused speaker.
      store.set((s) => ({
        ...s,
        speaker: { ...s.speaker, speaking: !!s.speaker.npcId },
      }));
    } else if (ev.type === "speak-resume") {
      resumeSpeech();
      // Preserve npcId/text so the same speaker remains visible.
      store.set((s) => ({
        ...s,
        speaker: { ...s.speaker, speaking: !!s.speaker.npcId },
      }));
    } else if (ev.type === "speak-stop") {
      stopSpeech();
      store.set((s) => ({
        ...s,
        speaker: { npcId: null, text: "", emoji: null, speaking: false },
      }));
    } else if (ev.type === "reaction-start") {
      if (store.get().settings.soundEffects) reactionFanfare();
    } else if (ev.type === "raise-hand") {
      const { name } = ev.payload;
      store.set((s) => {
        s.raisedHands = [...s.raisedHands, { id: Math.random().toString(36).slice(2), name, ts: Date.now() }];
        return { ...s };
      });
      bus.emit("floating-emoji", { emoji: "✋" });
      // Auto-remove after 30s
      setTimeout(() => {
        store.set((s) => {
          s.raisedHands = s.raisedHands.slice(1);
          return { ...s };
        });
      }, 30000);
    } else if (ev.type === "open-panel") {
      store.set((s) => { s.settings.panelOpen = true; return { ...s }; });
    } else if (ev.type === "close-panel") {
      store.set((s) => { s.settings.panelOpen = false; return { ...s }; });
    } else if (ev.type === "host-start") {
      store.set((s) => { s.peer.hosting = true; return { ...s }; });
    }
  });

  function openTutor() {
    const url = new URL(window.location.href);
    url.hash = "tutor-control";
    url.searchParams.delete("join");
    const w = 1200, h = 820;
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;
    const features = `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`;
    const newWin = window.open(url.toString(), TUTOR_WIN_NAME, features);
    if (!newWin) {
      alert("Popup blocked. Please allow popups for this site.");
      return;
    }
    tutorWinRef.current = newWin;
    try { newWin.focus(); } catch {}
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 overflow-hidden text-slate-800">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle at 25% 25%, #6366f1 1px, transparent 1px), radial-gradient(circle at 75% 75%, #ec4899 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Top bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        {settings.goLive && (
          <div className="flex items-center gap-1.5 bg-rose-600 text-white px-3 py-1.5 rounded-full shadow-lg shadow-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-bold tracking-wider">LIVE</span>
            <span className="text-xs">·</span>
            <span className="text-xs font-semibold">👁 {settings.liveViewerCount}</span>
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
        <CompanionCat />
        <TimerWidgets />
        <Btn variant="primary" size="md" onClick={openTutor} title="Open Tutor Control (popup)">
          ⚙️ Tutor Control
        </Btn>
      </div>

      {/* Main split: Canvas + Leaderboard */}
      <div className="absolute inset-0 pt-20 pb-4 flex" style={{ paddingLeft: settings.panelOpen ? `calc(var(--panel-w,380px) + 16px)` : 16, paddingRight: 16, transition: "padding 0.3s" }}>
        <div className="flex-1 flex gap-4 min-w-0">
          <div className="flex-1 min-w-0 rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-white">
            <CanvasTabs />
          </div>
          <div className="w-80 rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-white">
            <Leaderboard />
          </div>
        </div>
      </div>

      <PollDisplay />
      <Reactions />
      <AnnotationOverlay />

      {settings.panelOpen && <SidePanel onClose={() => store.set((s) => { s.settings.panelOpen = false; return { ...s }; })} onOpenTutor={openTutor} />}

      <AvatarWidget onOpenPanel={() => {}} onOpenTutor={openTutor} />

      <PanelSizeBinding />
      <NpcAnnounce npcCount={npcs.length} />
      <SpeechBoundaryHider speaker={speaker} />
    </div>
  );
}

// Binds CSS var for layout when panel resizes
function PanelSizeBinding() {
  useEffect(() => {
    function read() {
      try {
        const w = Number(localStorage.getItem("panel-w") || "380");
        document.documentElement.style.setProperty("--panel-w", w + "px");
      } catch {}
    }
    read();
    const id = setInterval(read, 250);
    return () => clearInterval(id);
  }, []);
  return null;
}

function NpcAnnounce({ npcCount }: { npcCount: number }) {
  // when first launches, add system message about how to start
  useEffect(() => {
    const m = store.get().messages;
    if (m.length === 0 && npcCount === 0) {
      addMessage({
        html: "👋 Welcome!",
        authorName: "System",
        system: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function SpeechBoundaryHider(_: { speaker: any }) {
  return null;
}

function TimerWidgets() {
  const [show, setShow] = useState(false);
  if (!show) {
    return <Btn size="sm" variant="ghost" onClick={() => setShow(true)} title="Timers">⏱ Timers</Btn>;
  }
  return (
    <div className="flex items-center gap-2 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl px-2 py-1 shadow-lg">
      <ClassTimerWidget />
      <CountdownTimerWidget />
      <Btn size="sm" variant="ghost" onClick={() => setShow(false)} title="Hide timers">✕</Btn>
    </div>
  );
}
