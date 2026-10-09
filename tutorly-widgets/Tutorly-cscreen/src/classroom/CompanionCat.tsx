import { useEffect, useRef, useState } from "react";
import { Btn } from "../ui/primitives";
import { getNaturalVoices, getPreferredDefaultVoiceURI, onVoicesReady, speak, stopSpeech } from "../lib/speech";
import { store, useStore } from "../state/store";

const CATS = ["😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🐱"];

export default function CompanionCat() {
  const cat = useStore((s) => s.catSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getNaturalVoices());

  // ── Always-current refs so event handlers never capture stale closure values
  const enabledRef = useRef(cat.enabled);
  const modeRef = useRef(cat.mode);
  const voiceURIRef = useRef(cat.voiceURI);
  const rateRef = useRef(cat.rate);
  const pitchRef = useRef(cat.pitch);

  // Keep refs in sync with store on every render
  enabledRef.current = cat.enabled;
  modeRef.current = cat.mode;
  voiceURIRef.current = cat.voiceURI;
  rateRef.current = cat.rate;
  pitchRef.current = cat.pitch;

  const hoverTimerRef = useRef<number | null>(null);
  const lastHoverTextRef = useRef<string>("");

  useEffect(() => {
    const applyVoices = () => {
      const natural = getNaturalVoices();
      setVoices(natural);
      // Hard-force the cat's default voice to preferred Ava US when available.
      const preferred = getPreferredDefaultVoiceURI();
      if (!preferred) return;
      store.set((s) => ({ ...s, catSettings: { ...s.catSettings, voiceURI: preferred } }));
    };
    onVoicesReady(applyVoices);
    applyVoices();
  }, []);

  function update(patch: Partial<typeof cat>) {
    store.set((s) => ({ ...s, catSettings: { ...s.catSettings, ...patch } }));
  }

  function testVoice() {
    stopSpeech();
    speak({
      text: "Meow! I can read text aloud for you. Just hover over any text or select it.",
      voiceURI: voiceURIRef.current,
      rate: rateRef.current,
      pitch: pitchRef.current,
      volume: 0.9,
    });
  }

  function readText(text: string) {
    if (!text || text.length < 2) return;
    const snippet = text.slice(0, 200);
    stopSpeech();
    speak({
      text: snippet,
      voiceURI: voiceURIRef.current,
      rate: rateRef.current,
      pitch: pitchRef.current,
      volume: 0.85,
    });
  }

  // ── Event listeners — mounted once, read from refs ─────────────────────────
  useEffect(() => {
    function handleMouseOver(e: MouseEvent) {
      if (!enabledRef.current || modeRef.current !== "hover") return;

      // Walk up to find the best text-bearing element (not the whole document body)
      let el = e.target as HTMLElement | null;
      while (el && el !== document.body) {
        const tag = el.tagName.toLowerCase();
        // Only read text from concrete leaf-ish elements
        if (["p", "span", "li", "td", "th", "label", "h1", "h2", "h3", "h4", "h5", "h6", "button", "a", "div"].includes(tag)) {
          // Get only direct text, not all descendant text
          const directText = Array.from(el.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent?.trim() || "")
            .join(" ")
            .trim();
          if (directText && directText.length >= 3 && directText.length <= 300) {
            if (directText === lastHoverTextRef.current) return;
            lastHoverTextRef.current = directText;
            if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = window.setTimeout(() => {
              if (enabledRef.current && modeRef.current === "hover") {
                readText(directText);
              }
            }, 500);
            return;
          }
        }
        el = el.parentElement;
      }
    }

    function handleMouseOut() {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    }

    function handleMouseUp() {
      if (!enabledRef.current || modeRef.current !== "select") return;
      // Small delay so selection is finalised
      setTimeout(() => {
        const sel = window.getSelection()?.toString().trim() || "";
        if (sel.length >= 2 && sel.length <= 800) {
          readText(sel);
        }
      }, 50);
    }

    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("mouseup", handleMouseUp, true);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    };
  }, []); // ← intentionally empty: refs always current, no re-subscribe needed

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!cat.enabled) {
    return (
      <Btn size="sm" variant="ghost" onClick={() => update({ enabled: true })} title="Enable Companion Cat read-aloud">
        😺 Cat
      </Btn>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-white border border-violet-200 rounded-full pl-2 pr-1 py-1 shadow-lg max-w-sm">
      {/* Cat emoji — click to randomise */}
      <span
        className="text-xl cursor-pointer flex-shrink-0"
        onClick={() => update({ catEmoji: CATS[Math.floor(Math.random() * CATS.length)] })}
        title="Click to change cat"
      >
        {cat.catEmoji}
      </span>

      {/* Voice selector */}
      <select
        value={cat.voiceURI}
        onChange={(e) => update({ voiceURI: e.target.value })}
        className="w-36 px-1.5 py-0.5 text-[10px] border border-slate-200 rounded-full bg-white truncate"
        title="Cat read-aloud voice"
      >
        <option value="">Default voice</option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>

      {/* Mode buttons */}
      <div className="flex items-center gap-0.5 text-[10px]">
        <button
          onClick={() => update({ mode: "hover" })}
          className={
            "px-2 py-0.5 rounded-full transition " +
            (cat.mode === "hover" ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
          }
          title="Read text on mouse hover"
        >
          Hover
        </button>
        <button
          onClick={() => update({ mode: "select" })}
          className={
            "px-2 py-0.5 rounded-full transition " +
            (cat.mode === "select" ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
          }
          title="Read selected text"
        >
          Select
        </button>
      </div>

      {/* Test */}
      <Btn
        size="sm"
        variant="ghost"
        onClick={testVoice}
        className="!px-1.5 !py-0.5 !text-xs flex-shrink-0"
        title="Test voice"
      >
        ▶
      </Btn>

      {/* Close */}
      <Btn
        size="sm"
        variant="ghost"
        onClick={() => { update({ enabled: false }); stopSpeech(); }}
        className="!px-1.5 !py-0.5 !text-xs flex-shrink-0"
        title="Disable cat"
      >
        ✕
      </Btn>
    </div>
  );
}
