import { useEffect, useRef } from "react";
import { sanitizeForCanvas } from "../../engine/triggers";
import { SANDBOX_RUNTIME_CSS, SANDBOX_RUNTIME_JS } from "./SandboxRuntime";
import { applyCanvasAction } from "../../engine/actions";
import { store } from "../../engine/store";
import { audio } from "../../engine/audio";

/** Extract the first ambient audio URL from the AI HTML (data-aw-ambient, data-ambient, or any <audio src>). */
function extractAmbientUrl(html: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const tagged = doc.querySelector("audio[data-aw-ambient], audio[data-ambient]") as HTMLAudioElement | null;
    const any = tagged || (doc.querySelector("audio[src], audio source[src]") as HTMLElement | null);
    if (!any) return null;
    const src = (any as HTMLAudioElement).src || any.getAttribute("src") || "";
    return src || null;
  } catch {
    return null;
  }
}

/** Extract ALL ambient audio URLs so the parent engine can play them on a user-gesture-unlocked audio context. */
function extractAllAmbientUrls(html: string): string[] {
  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const audios = Array.from(doc.querySelectorAll("audio[src], source[src]"));
    const out: string[] = [];
    audios.forEach((el) => {
      const src = (el as HTMLAudioElement).src || el.getAttribute("src") || "";
      if (src && !out.includes(src)) out.push(src);
    });
    return out;
  } catch {
    return [];
  }
}

export function SceneHost({ html, paused, openingImageUrl }: { html: string; paused: boolean; openingImageUrl?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const ambientUrlRef = useRef<string | null>(null);

  // Bridge: receive postMessages from the sandboxed iframe.
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const m = ev.data;
      if (!m || m.source !== "aw-scene") return;
      switch (m.kind) {
        case "read": {
          const s = store.getSnapshot();
          // If a voiceURI was given, use it; else default narrator voice.
          const voiceURI = m.voiceURI || s.settings.narratorVoiceURI;
          audio.speak(String(m.text || ""), voiceURI);
          break;
        }
        case "stop":
          audio.stopSpeaking();
          break;
        case "give-item":
          applyCanvasAction({ kind: "give-item", emoji: m.emoji, name: m.name, rarity: m.rarity });
          break;
        case "stat":
          applyCanvasAction({ kind: "stat", key: m.key, op: m.op === "set" ? "set" : "add", val: Number(m.val) || 0, targetId: m.targetId });
          break;
        case "powerup":
          applyCanvasAction({ kind: "powerup", name: m.name });
          break;
        case "status":
          applyCanvasAction({ kind: "status", emoji: m.emoji, label: m.label, turns: Number(m.turns) || -1 });
          break;
        case "decision":
          applyCanvasAction({ kind: "decision", action: String(m.action || "") });
          break;
        case "evolution": {
          // AI can request "evolve this character" -> +1 level.
          const s = store.getSnapshot();
          const target = m.entityId
            ? s.entities.find((e) => e.id === m.entityId)
            : s.entities.find((e) => e.kind === "player" && !e.dead);
          if (target) {
            const lvl = Math.max(0, Math.min(5, (target.evolutionLevel ?? 0) + 1));
            store.set((cur) => ({
              ...cur,
              entities: cur.entities.map((e) => (e.id === target.id ? { ...e, evolutionLevel: lvl } : e)),
            }));
          }
          break;
        }
        case "play-sfx":
          if (m.url) audio.playFx(String(m.url), Number(m.volume) || 1);
          break;
        case "play-ambient": {
          // AI requests the parent engine to play an ambient URL.
          if (m.url) audio.playAmbient(String(m.url), Number(m.volume) || 0.5, true);
          break;
        }
        case "stop-ambient":
          audio.stopAmbient();
          break;
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Render the scene into the iframe. The iframe is intentionally permissive so
  // the AI's JS, timers, audio elements, and forms all work.
  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    const { visible } = sanitizeForCanvas(html);
    // CRITICAL: SandboxRuntime is injected in <head> BEFORE the AI's HTML so
    // the global helpers (awTimer, awItem, awRead, awGoPhase, awVote, etc.)
    // are defined the moment the AI's inline <script>s and onclick handlers
    // execute. Without this ordering, the AI's timers and button handlers
    // silently fail because the helpers aren't on window yet.
    const doc = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        html,body{margin:0;height:100%;background:#070a14;color:#e2e8f0;
          font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif;overflow:auto}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#334155;border-radius:8px}
        .aw-scene{min-height:100%;}
        body.aw-frozen *{animation-play-state:paused!important;transition:none!important}
        img{max-width:100%}
        .aw-opening{display:none}
      </style>
      <style>${SANDBOX_RUNTIME_CSS}</style>
      <script>${SANDBOX_RUNTIME_JS}<\/script>
      </head>
      <body class="${paused ? "aw-frozen" : ""}">${
        visible || `<div style="display:grid;place-items:center;height:100%;text-align:center;opacity:.5;position:relative">
          <div style="position:absolute;inset:0;background:${openingImageUrl ? `url('${openingImageUrl}') center/cover` : "radial-gradient(circle at 50% 30%, #312e81, #070a14 60%)"};opacity:.5"></div>
          <div style="position:relative;z-index:1"><div style="font-size:84px;text-shadow:0 0 40px #a78bfa">📖</div><p style="font-size:28px;font-weight:900">Awaiting the first scene</p><small>Deploy a scene from the control panel.</small></div></div>`
      }</body></html>`;
    iframe.srcdoc = doc;

    // Ambient audio: play the FIRST <audio src> we find through the parent
    // engine (which is already gesture-unlocked from the GM's Deploy click).
    const first = extractAmbientUrl(html);
    if (first && first !== ambientUrlRef.current) {
      ambientUrlRef.current = first;
      audio.playAmbient(first, 0.45, true);
    } else if (!first && ambientUrlRef.current) {
      ambientUrlRef.current = null;
      audio.stopAmbient();
    }
    // Additionally forward ALL audio URLs to the parent (for "play-ambient" call
    // coming from the iframe). We don't autoplay them here to avoid duplicate audio.
    void extractAllAmbientUrls(html);
  }, [html, paused, openingImageUrl]);

  return (
    <iframe
      ref={ref}
      title="scene"
      allow="autoplay; fullscreen; picture-in-picture; microphone; camera; midi; encrypted-media"
      className="h-full w-full border-0 bg-[#070a14]"
    />
  );
}
