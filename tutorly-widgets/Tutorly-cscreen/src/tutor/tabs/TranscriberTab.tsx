import { useEffect, useRef, useState } from "react";
import { useStore, store, uid } from "../../state/store";
import { Btn } from "../../ui/primitives";
import { Section, Field } from "../shared";
import { listAudioInputs } from "../../lib/sounds";
import { getNaturalVoices, onVoicesReady, speak, stopSpeech } from "../../lib/speech";

// ─── Transcriber ─────────────────────────────────────────────────────────────
// Uses Web Speech API (SpeechRecognition) which works in Chrome/Edge on HTTPS.
// The microphone MediaStream is ONLY used for the level-meter & speaking timer —
// it is NOT passed to SpeechRecognition (the browser manages that internally).
// Tab-audio mode captures display-media audio ONLY for the meter; recognition
// still uses the default mic. This is a browser limitation we document clearly.

type Source = "mic" | "tab";

export default function TranscriberTab() {
  const transcripts = useStore((s) => s.transcripts);
  const templates = useStore((s) => s.transcriptTemplates);

  const [source, setSource] = useState<Source>("mic");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [lang, setLang] = useState<string>(() => navigator.language || "en-US");
  const [running, setRunning] = useState(false);
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [speakingTime, setSpeakingTime] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [selected, setSelected] = useState<string>("");
  const [searchEngine, setSearchEngine] = useState<"google" | "bing">("google");
  const [voiceURI, setVoiceURI] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getNaturalVoices());

  const recRef = useRef<any>(null);
  const meterStreamRef = useRef<MediaStream | null>(null);
  const analyserStopRef = useRef<(() => void) | null>(null);
  const speakingActiveRef = useRef(false);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const speakTimerRef = useRef<number | null>(null);

  // Common supported languages
  const LANGS = [
    { code: "en-US", label: "English (US)" },
    { code: "en-GB", label: "English (UK)" },
    { code: "ar-SA", label: "Arabic" },
    { code: "fr-FR", label: "French" },
    { code: "de-DE", label: "German" },
    { code: "es-ES", label: "Spanish" },
    { code: "it-IT", label: "Italian" },
    { code: "pt-PT", label: "Portuguese" },
    { code: "zh-CN", label: "Chinese (Mandarin)" },
    { code: "ja-JP", label: "Japanese" },
    { code: "ko-KR", label: "Korean" },
    { code: "tr-TR", label: "Turkish" },
    { code: "ru-RU", label: "Russian" },
  ];

  useEffect(() => {
    listAudioInputs().then(setDevices);
    onVoicesReady(() => setVoices(getNaturalVoices()));
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcripts.length, interim]);

  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const srSupported = !!SR;

  // ── Start ──────────────────────────────────────────────────────────────────
  async function start() {
    if (!srSupported) {
      setStatus("⛔ Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (running) return;

    setSpeakingTime(0);
    setStatus("Starting…");

    // ── Meter stream (optional, never blocks SR) ───────────────────────────
    try {
      let meterStream: MediaStream | null = null;
      if (source === "mic") {
        meterStream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          video: false,
        });
        setStatus("🎙 Microphone ready · Recognition starting…");
      } else {
        // Tab audio — best-effort only
        try {
          const dm: any = await (navigator.mediaDevices as any).getDisplayMedia({
            video: { frameRate: 1 },
            audio: true,
          });
          const audioTracks = dm.getAudioTracks();
          dm.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());
          if (audioTracks.length) {
            meterStream = new MediaStream(audioTracks);
            setStatus("🖥 Tab audio captured for level meter. Recognition uses mic (browser limitation).");
          } else {
            dm.getTracks().forEach((t: MediaStreamTrack) => t.stop());
            setStatus("⚠ No audio track from tab share. Recognition uses mic.");
          }
        } catch (err: any) {
          setStatus("⚠ Tab share cancelled or denied. Recognition uses mic.");
        }
      }
      if (meterStream) {
        meterStreamRef.current = meterStream;
        startMeter(meterStream);
      }
    } catch (err: any) {
      // Mic denied — still try SR (it will prompt its own permission)
      setStatus(`⚠ Meter access failed: ${err.message}. Trying recognition anyway…`);
    }

    // ── SpeechRecognition ─────────────────────────────────────────────────
    const r: any = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.lang = lang;

    r.onstart = () => {
      setRunning(true);
      setStatus(`● Recording · ${lang}`);
      // start speaking timer
      speakTimerRef.current = window.setInterval(() => {
        if (speakingActiveRef.current) {
          setSpeakingTime((t) => t + 1);
        }
      }, 1000);
    };

    r.onresult = (ev: any) => {
      let interimText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          const text = autoPunctuate(transcript.trim());
          if (text) {
            store.set((s) => ({
              ...s,
              transcripts: [...s.transcripts, { id: uid("t_"), text, ts: Date.now() }],
            }));
            // mark speaking active for the timer
            speakingActiveRef.current = true;
            setTimeout(() => { speakingActiveRef.current = false; }, 1500);
          }
        } else {
          interimText += transcript;
          if (interimText.trim()) {
            speakingActiveRef.current = true;
            setTimeout(() => { speakingActiveRef.current = false; }, 800);
          }
        }
      }
      setInterim(interimText);
    };

    r.onerror = (ev: any) => {
      const code = ev.error;
      if (code === "no-speech") return; // ignore, auto-restarts
      if (code === "aborted") return;   // user stopped
      if (code === "not-allowed") {
        setStatus("⛔ Microphone permission denied. Enable mic access in browser settings and refresh.");
        stop();
        return;
      }
      if (code === "network") {
        setStatus("⚠ Network error (Speech API needs internet). Retrying…");
        return;
      }
      setStatus(`⚠ Recognition error: ${code}`);
    };

    r.onend = () => {
      // Auto-restart for continuous experience
      if (recRef.current === r) {
        try { r.start(); } catch {
          setStatus("⚠ Could not restart. Click Stop then Start again.");
        }
      }
    };

    recRef.current = r;
    try {
      r.start();
    } catch (e: any) {
      setStatus(`⛔ Could not start recognition: ${e.message}`);
    }
  }

  // ── Stop ───────────────────────────────────────────────────────────────────
  function stop() {
    // Null out ref first so onend doesn't restart
    const r = recRef.current;
    recRef.current = null;
    if (r) {
      try { r.onend = null; r.stop(); } catch {}
    }
    // Stop meter stream
    if (meterStreamRef.current) {
      meterStreamRef.current.getTracks().forEach((t) => t.stop());
      meterStreamRef.current = null;
    }
    analyserStopRef.current?.();
    analyserStopRef.current = null;
    // Stop timer
    if (speakTimerRef.current) {
      clearInterval(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    setRunning(false);
    setInterim("");
    setLevel(0);
    setStatus("Stopped.");
    speakingActiveRef.current = false;
  }

  // ── Level meter from MediaStream ───────────────────────────────────────────
  function startMeter(stream: MediaStream) {
    analyserStopRef.current?.();
    try {
      const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let stopped = false;
      function tick() {
        if (stopped) return;
        analyser.getByteFrequencyData(data);
        const sum = data.reduce((a, b) => a + b, 0);
        const avg = sum / data.length;
        const normalized = Math.min(100, Math.round(avg * 2.2));
        setLevel(normalized);
        requestAnimationFrame(tick);
      }
      tick();
      analyserStopRef.current = () => {
        stopped = true;
        try { src.disconnect(); ctx.close(); } catch {}
      };
    } catch {}
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function clearAll() {
    if (!confirm("Clear all transcripts?")) return;
    store.set((s) => ({ ...s, transcripts: [] }));
    setSpeakingTime(0);
  }

  function copyAll() {
    const text = transcripts.map((t) => t.text).join("\n");
    navigator.clipboard.writeText(text).then(() => alert("Transcript copied ✓")).catch(() => alert("Copy failed"));
  }

  function readSelection() {
    const txt = window.getSelection()?.toString().trim() || "";
    if (txt) setSelected(txt);
  }

  function openSearch() {
    // If a template is active, prepend its prompt to the search so the user searches
    // "prompt + selected text" on Google/Bing in one click.
    const promptPrefix = activePrompt ? activePrompt.prompt + " " : "";
    const q = encodeURIComponent(promptPrefix + selected);
    const url = searchEngine === "google"
      ? `https://www.google.com/search?q=${q}`
      : `https://www.bing.com/search?q=${q}`;
    window.open(url, "_blank");
  }

  function applyTemplate(prompt: string) {
    const text = (selected || transcripts.at(-1)?.text || "").trim();
    if (!text) { alert("Select some text first, or wait for a transcription."); return; }
    navigator.clipboard.writeText(`${prompt}\n\n"${text}"`).then(() => alert("Copied prompt + text ✓"));
  }

  function testVoice() {
    stopSpeech();
    speak({ text: "This is the selected read-back voice. How does it sound?", voiceURI, rate: 1, pitch: 1 });
  }

  // ── Template CRUD ─────────────────────────────────────────────────────────
  const [showVoiceSection, setShowVoiceSection] = useState(false);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const activePrompt = templates.find((t) => t.id === activePromptId) ?? null;
  const [tplEdit, setTplEdit] = useState<{ id: string; label: string; prompt: string } | null>(null);
  const [tplNew, setTplNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  function saveNewTemplate() {
    if (!newLabel.trim() || !newPrompt.trim()) return;
    store.set((s) => ({
      ...s,
      transcriptTemplates: [...s.transcriptTemplates, { id: uid("tp_"), label: newLabel.trim(), prompt: newPrompt.trim() }],
    }));
    setNewLabel(""); setNewPrompt(""); setTplNew(false);
  }

  function saveEditTemplate() {
    if (!tplEdit) return;
    store.set((s) => ({
      ...s,
      transcriptTemplates: s.transcriptTemplates.map((x) =>
        x.id === tplEdit.id ? { ...x, label: tplEdit.label, prompt: tplEdit.prompt } : x
      ),
    }));
    setTplEdit(null);
  }

  function rmTemplate(id: string) {
    store.set((s) => ({ ...s, transcriptTemplates: s.transcriptTemplates.filter((t) => t.id !== id) }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const mm = Math.floor(speakingTime / 60);
  const ss = String(speakingTime % 60).padStart(2, "0");

  return (
    <div className="space-y-4">
      {/* ── Status banner ── */}
      {!srSupported && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          ⛔ <strong>Speech Recognition not supported.</strong> Please use Chrome or Edge (desktop).
        </div>
      )}
      {srSupported && !window.isSecureContext && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠ Page must be served over <strong>HTTPS</strong> (or localhost) for microphone access.
        </div>
      )}

      {/* ── Controls ── */}
      <Section title="Transcription controls">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Recognition language">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              disabled={running}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
            >
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>

          <Field label="Source">
            <div className="flex gap-1">
              <button
                onClick={() => { if (!running) setSource("mic"); }}
                disabled={running}
                className={"flex-1 px-2 py-1.5 text-sm rounded-lg border transition " + (source === "mic" ? "bg-indigo-500 text-white border-indigo-600" : "bg-white border-slate-200 hover:border-slate-300")}
              >
                🎙 Microphone
              </button>
              <button
                onClick={() => { if (!running) setSource("tab"); }}
                disabled={running}
                className={"flex-1 px-2 py-1.5 text-sm rounded-lg border transition " + (source === "tab" ? "bg-indigo-500 text-white border-indigo-600" : "bg-white border-slate-200 hover:border-slate-300")}
              >
                🖥 Tab audio
              </button>
            </div>
          </Field>

          {source === "mic" && (
            <Field label="Microphone">
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                disabled={running}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">Default</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {/* Level meter */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Audio level</span>
            <span>{running ? `Speaking: ${mm}:${ss}` : "—"}</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${level}%`,
                background: level > 70 ? "#ef4444" : level > 30 ? "#22c55e" : "#6366f1",
              }}
            />
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className={`mt-2 text-xs px-3 py-1.5 rounded-lg border ${running ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
            {status}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {!running ? (
            <Btn variant="success" onClick={start} disabled={!srSupported}>
              ● Start transcribing
            </Btn>
          ) : (
            <Btn variant="danger" onClick={stop}>⏹ Stop</Btn>
          )}
          <Btn variant="ghost" onClick={copyAll} disabled={!transcripts.length}>📋 Copy all</Btn>
          <Btn variant="ghost" onClick={clearAll} disabled={!transcripts.length}>🗑 Clear</Btn>
        </div>
      </Section>

      {/* ── Live transcript ── */}
      <Section
        title="Live transcript"
        right={
          running
            ? <span className="text-xs text-emerald-600 font-semibold">● LIVE · {mm}:{ss} speaking</span>
            : null
        }
      >
        <div
          ref={transcriptScrollRef}
          onMouseUp={readSelection}
          className="bg-slate-50 border border-slate-200 rounded-xl p-3 h-64 overflow-y-auto text-sm leading-relaxed select-text"
        >
          {transcripts.length === 0 && !interim && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
              <div className="text-3xl">🎙</div>
              <div>No transcription yet.</div>
              <div className="text-[11px] text-slate-300">Click "Start transcribing" then speak clearly.</div>
            </div>
          )}
          {transcripts.map((t) => (
            <div key={t.id} className="mb-1.5 flex gap-2">
              <span className="text-[10px] text-slate-400 mt-0.5 flex-shrink-0">
                {new Date(t.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="text-slate-800">{t.text}</span>
            </div>
          ))}
          {interim && (
            <div className="flex gap-2 opacity-60">
              <span className="text-[10px] text-slate-400 mt-0.5 flex-shrink-0">…</span>
              <span className="italic text-slate-500">{interim}</span>
            </div>
          )}
        </div>

        {selected && (
          <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-indigo-700 font-semibold flex-shrink-0 mt-0.5">Selected text:</span>
              <span className="flex-1 text-slate-700 break-words min-w-0 italic">"{selected}"</span>
              <button onClick={() => setSelected("")} className="flex-shrink-0 text-slate-400 hover:text-rose-500 text-base leading-none">✕</button>
            </div>
            {activePrompt && (
              <div className="flex items-center gap-2 p-1.5 bg-white border border-indigo-200 rounded-lg">
                <span className="text-indigo-600 font-bold flex-shrink-0">🔎 Prompt:</span>
                <span className="flex-1 text-slate-600 truncate">{activePrompt.label}</span>
                <button
                  onClick={() => setActivePromptId(null)}
                  className="flex-shrink-0 text-slate-400 hover:text-rose-500"
                  title="Clear active prompt"
                >✕</button>
              </div>
            )}
            {!activePrompt && (
              <div className="text-slate-400 italic">
                No prompt selected — click a template below to use it with Search.
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={searchEngine}
                onChange={(e) => setSearchEngine(e.target.value as any)}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="google">Google</option>
                <option value="bing">Bing</option>
              </select>
              <Btn size="sm" variant="primary" onClick={openSearch}>
                🔍 {activePrompt ? `Search with "${activePrompt.label}"` : "Search selected text"}
              </Btn>
            </div>
          </div>
        )}
      </Section>

      {/* ── Read-back voice ── */}
      <Section
        title="Read-back voice"
        right={
          <button
            onClick={() => setShowVoiceSection((v) => !v)}
            className={
              "px-3 py-1 text-xs rounded-full border font-medium transition " +
              (showVoiceSection
                ? "bg-indigo-500 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")
            }
          >
            {showVoiceSection ? "▲ Hide" : "▼ Show"}
          </button>
        }
      >
        {showVoiceSection ? (
          <>
            <div className="flex gap-2">
              <select
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">Default natural voice</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
              <Btn variant="soft" onClick={testVoice}>▶ Test</Btn>
              <Btn variant="danger" onClick={stopSpeech}>⏹ Stop</Btn>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">This voice reads back the selected text or is used when you click ▶ on a template.</p>
          </>
        ) : (
          <p className="text-[11px] text-slate-400">Click <strong>Show</strong> to select and test a read-back voice.</p>
        )}
      </Section>

      {/* ── Prompt templates ── */}
      <Section
        title="Prompt templates"
        right={
          <Btn variant="primary" size="sm" onClick={() => { setTplNew(true); setNewLabel(""); setNewPrompt(""); }}>
            ＋ Add template
          </Btn>
        }
      >
        <p className="text-xs text-slate-500 mb-2">
          <strong>Click a template row</strong> to set it as active (it will be used with the 🔍 Search button). Click <strong>▶</strong> to copy <em>prompt + selected text</em> to clipboard. Click <strong>🔍 Search</strong> in the transcript area to search Google/Bing with the active prompt prepended.
        </p>

        {/* New template inline form */}
        {tplNew && (
          <div className="mb-3 p-3 border border-indigo-200 bg-indigo-50 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-indigo-700">New template</div>
            <input
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Label e.g. Simplify explanation"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Prompt e.g. Explain this simply for a beginner:"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
            />
            <div className="flex gap-1">
              <Btn variant="primary" size="sm" onClick={saveNewTemplate}>Save</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setTplNew(false)}>Cancel</Btn>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {templates.map((t) => (
            <div key={t.id}>
              {tplEdit?.id === t.id ? (
                <div className="p-3 border border-indigo-200 bg-indigo-50 rounded-xl space-y-2">
                  <input
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    value={tplEdit.label}
                    onChange={(e) => setTplEdit({ ...tplEdit, label: e.target.value })}
                  />
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    value={tplEdit.prompt}
                    onChange={(e) => setTplEdit({ ...tplEdit, prompt: e.target.value })}
                  />
                  <div className="flex gap-1">
                    <Btn variant="primary" size="sm" onClick={saveEditTemplate}>Save</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setTplEdit(null)}>Cancel</Btn>
                  </div>
                </div>
              ) : (() => {
                const isActive = activePromptId === t.id;
                return (
                  <div
                    className={
                      "flex items-center gap-2 p-2 border rounded-lg transition cursor-pointer " +
                      (isActive
                        ? "border-indigo-400 bg-indigo-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50")
                    }
                    onClick={() => setActivePromptId(isActive ? null : t.id)}
                    title={isActive ? "Click to deselect this prompt" : "Click to select this prompt for Search"}
                  >
                    {/* Active indicator */}
                    <span className={"w-2 h-2 rounded-full flex-shrink-0 " + (isActive ? "bg-indigo-500" : "bg-slate-200")} />
                    <Btn
                      size="sm"
                      variant={isActive ? "primary" : "soft"}
                      onClick={(e) => { e.stopPropagation(); applyTemplate(t.prompt); }}
                      title="Copy prompt + selected text to clipboard"
                    >
                      ▶
                    </Btn>
                    <div className="flex-1 min-w-0">
                      <div className={"text-sm font-medium " + (isActive ? "text-indigo-700" : "text-slate-800")}>
                        {t.label}
                        {isActive && <span className="ml-2 text-[10px] font-bold text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{t.prompt}</div>
                    </div>
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); setTplEdit({ id: t.id, label: t.label, prompt: t.prompt }); }}
                    >
                      ✏️
                    </Btn>
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); rmTemplate(t.id); }}
                    >
                      🗑
                    </Btn>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function autoPunctuate(text: string): string {
  if (!text) return text;
  let out = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?]$/.test(out)) {
    const isQ = /^(what|where|why|how|when|who|whose|whom|which|do|does|did|is|are|was|were|can|could|should|would|will|may|might)\b/i.test(out);
    out += isQ ? "?" : ".";
  }
  return out;
}

// silence unused import warning
void uid;
