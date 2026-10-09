import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Emotion } from "../data/activities";

const EMOTIONS: { e: Emotion; label: string }[] = [
  { e: "😺", label: "Happy" },
  { e: "😸", label: "Grinning" },
  { e: "😹", label: "Joyful" },
  { e: "😻", label: "Loving" },
  { e: "😼", label: "Sly" },
  { e: "😽", label: "Kissing" },
  { e: "🙀", label: "Surprised" },
  { e: "😿", label: "Sad" },
  { e: "😾", label: "Grumpy" },
  { e: "🐱", label: "Neutral" },
];

export function CatCompanion() {
  const { cat, setCat, speech, sfx } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState("");
  const [showVoiceList, setShowVoiceList] = useState(false);

  const filteredVoices = useMemo(() => {
    const q = voiceQuery.trim().toLowerCase();
    if (!q) return speech.voices;
    return speech.voices.filter(v =>
      v.name.toLowerCase().includes(q) || v.lang.toLowerCase().includes(q)
    );
  }, [speech.voices, voiceQuery]);

  // Random idle expression every 8s if cat isn't speaking
  useEffect(() => {
    if (!cat.visible) return;
    const id = window.setInterval(() => {
      if (!speech.speaking) {
        const pick = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)].e;
        setCat({ emotion: pick });
      }
    }, 8000);
    return () => window.clearInterval(id);
  }, [cat.visible, speech.speaking, setCat]);

  if (!cat.visible) {
    return (
      <button
        onClick={() => { setCat({ visible: true }); sfx.play("open"); }}
        className="fixed bottom-6 right-6 z-50 text-5xl drop-shadow-2xl hover:scale-110 transition-transform"
        title="Bring back the cat"
        aria-label="Show cat companion"
      >
        🐱
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none">
      {/* Speech bubble */}
      <div className="relative max-w-xs sm:max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl px-5 py-4 shadow-2xl border-2 border-white/80"
        style={{ boxShadow: "0 20px 60px rgba(168,85,247,0.35), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-xs font-bold tracking-wider text-purple-600 uppercase">
            Whisker {speech.speaking ? "• speaking" : ""}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => { speech.setMuted(!speech.muted); sfx.play("click"); }}
              className="text-sm hover:scale-110 transition"
              title={speech.muted ? "Unmute cat" : "Mute cat"}
              aria-label="Toggle mute"
            >
              {speech.muted ? "🔇" : "🔊"}
            </button>
            <button
              onClick={() => { setShowSettings(s => !s); sfx.play("click"); }}
              className="text-sm hover:rotate-90 transition-transform duration-300"
              title="Voice settings"
              aria-label="Open settings"
            >
              ⚙️
            </button>
            <button
              onClick={() => { speech.stop(); setCat({ visible: false }); sfx.play("close"); }}
              className="text-sm hover:scale-110 transition"
              title="Hide cat"
              aria-label="Hide cat"
            >
              ✖️
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-800 leading-snug font-medium">{cat.message}</p>
        {/* Tail of bubble */}
        <div className="absolute -bottom-3 right-12 w-6 h-6 bg-white/90 border-r-2 border-b-2 border-white/80 rotate-45" />
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white w-80 max-w-[90vw]">
          <h3 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
            <span>⚙️</span> Cat Voice Settings
          </h3>

          {/* Voice picker (searchable dropdown) */}
          <label className="block text-xs font-semibold text-slate-600 mb-1">Voice ({speech.voices.length})</label>
          <div className="relative mb-3">
            <input
              type="text"
              value={voiceQuery || (speech.voice?.name ?? "")}
              onChange={(e) => { setVoiceQuery(e.target.value); setShowVoiceList(true); }}
              onFocus={() => { setShowVoiceList(true); setVoiceQuery(""); }}
              placeholder="Search voices…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            {showVoiceList && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                {filteredVoices.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-500">No voices match.</div>
                )}
                {filteredVoices.slice(0, 80).map(v => (
                  <button
                    key={v.name}
                    onClick={() => {
                      speech.setVoiceByName(v.name);
                      setShowVoiceList(false);
                      setVoiceQuery("");
                      speech.speak(`Hello! I am ${v.name}. I'll be your reading voice.`);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 ${
                      speech.voice?.name === v.name ? "bg-purple-100 font-semibold" : ""
                    }`}
                  >
                    <div>{v.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{v.lang}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sliders */}
          <SliderRow label={`Speed: ${speech.rate.toFixed(2)}x`}
            min={0.5} max={2} step={0.05} value={speech.rate} onChange={speech.setRate} />
          <SliderRow label={`Pitch: ${speech.pitch.toFixed(2)}`}
            min={0.5} max={2} step={0.05} value={speech.pitch} onChange={speech.setPitch} />
          <SliderRow label={`Volume: ${Math.round(speech.volume * 100)}%`}
            min={0} max={1} step={0.05} value={speech.volume} onChange={speech.setVolume} />

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={sfx.enabled} onChange={e => sfx.setEnabled(e.target.checked)} />
              Sound effects
            </label>
            <button
              onClick={() => speech.speak("Meow! All systems are purring perfectly.")}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
            >Test 🐾</button>
          </div>

          {/* Emotion picker */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-600 mb-2">Cat Mood</div>
            <div className="flex flex-wrap gap-1">
              {EMOTIONS.map(({ e, label }) => (
                <button
                  key={e}
                  onClick={() => setCat({ emotion: e })}
                  title={label}
                  className={`text-2xl p-1 rounded-lg hover:scale-125 transition ${
                    cat.emotion === e ? "bg-purple-100 ring-2 ring-purple-400" : ""
                  }`}
                >{e}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Glossy giant cat emoji */}
      <button
        onClick={() => {
          if (speech.speaking) speech.stop();
          else speech.speak(cat.message);
          sfx.play("click");
        }}
        className="relative text-[110px] leading-none cursor-pointer hover:scale-110 active:scale-95 transition-transform"
        style={{
          filter: "drop-shadow(0 12px 16px rgba(168,85,247,0.55)) drop-shadow(0 4px 6px rgba(0,0,0,0.25))",
          animation: speech.speaking ? "catBounce 0.4s ease-in-out infinite" : "catFloat 3s ease-in-out infinite",
        }}
        aria-label="Cat companion - click to repeat"
        title="Click to repeat / stop"
      >
        {cat.emotion}
      </button>
    </div>
  );
}

function SliderRow({ label, min, max, step, value, onChange }: {
  label: string; min: number; max: number; step: number; value: number; onChange: (n: number) => void;
}) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-purple-600"
      />
    </div>
  );
}
