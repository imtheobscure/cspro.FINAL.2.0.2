// Lazy Web Speech API wrapper.
// Uses webkitSpeechRecognition (Chrome/Edge) or SpeechRecognition (Firefox).
// When neither is available, the controller reports "unsupported" but does NOT crash.

export interface SpeechEvents {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onWPM?: (wpm: number) => void;
  onTranscript?: (text: string) => void;
  onError?: (err: string) => void;
  onState?: (state: "idle" | "listening" | "denied" | "unsupported") => void;
}

export interface SpeechController {
  start: () => Promise<void>;
  stop: () => void;
  destroy: () => void;
}

function getSpeechRecognitionClass(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  // Check multiple globals for broader browser support
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || w.mozSpeechRecognition || w.msSpeechRecognition || null;
}

export function createSpeechController(
  opts: SpeechEvents & { silenceMs?: number },
): SpeechController {
  const SilenceMs = opts.silenceMs ?? 1600;
  const SRClass = getSpeechRecognitionClass();

  let rec: any = null;
  let silenceTimer: number | null = null;
  let speaking = false;
  let wordBuffer: { t: number; n: number }[] = [];
  let intentionalStop = false;

  function emitWPM() {
    const now = performance.now();
    wordBuffer = wordBuffer.filter((b) => now - b.t < 8000);
    if (wordBuffer.length === 0) return;
    const totalWords = wordBuffer.reduce((s, b) => s + b.n, 0);
    const span = (now - wordBuffer[0].t) / 1000;
    if (span < 0.6) return;
    const wpm = Math.round((totalWords / span) * 60);
    opts.onWPM?.(wpm);
  }

  function armSilenceTimer() {
    if (silenceTimer) window.clearTimeout(silenceTimer);
    silenceTimer = window.setTimeout(() => {
      if (speaking) {
        speaking = false;
        opts.onSpeechEnd?.();
      }
    }, SilenceMs);
  }

  function markSpeech(words: number, transcript?: string) {
    wordBuffer.push({ t: performance.now(), n: words });
    if (!speaking) {
      speaking = true;
      opts.onSpeechStart?.();
    }
    if (transcript) opts.onTranscript?.(transcript);
    emitWPM();
    armSilenceTimer();
  }

  async function start() {
    if (!SRClass) {
      opts.onState?.("unsupported");
      opts.onError?.(
        "Web Speech API is not supported in this browser. Please use Chrome, Edge, or a Chromium-based browser for voice mode. Falling back to manual scroll.",
      );
      return;
    }

    // Request microphone permission explicitly first
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the tracks — we just needed to prompt the permission dialog
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      opts.onState?.("denied");
      opts.onError?.(
        "Microphone permission denied. Please allow microphone access in your browser settings and try again. Falling back to manual scroll.",
      );
      return;
    }

    intentionalStop = false;
    rec = new SRClass();
    rec.continuous = true;
    rec.interimResults = true;
    // Force English for English teaching context
    rec.lang = "en-US";

    rec.onresult = (ev: any) => {
      let interim = "";
      let finalAdd = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalAdd += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      const newText = (finalAdd + " " + interim).trim();
      const wc = newText ? newText.split(/\s+/).length : 0;
      if (wc > 0) markSpeech(Math.max(1, Math.round(wc / 3)), newText);
    };

    rec.onerror = (ev: any) => {
      const errorType = ev.error;
      if (errorType === "not-allowed" || errorType === "service-not-allowed") {
        opts.onState?.("denied");
        opts.onError?.("Microphone permission denied. Please allow mic access.");
      } else if (errorType === "no-speech") {
        // This is benign — user was quiet. Don't report error.
      } else if (errorType === "network") {
        opts.onError?.("Network error: speech recognition requires an internet connection in some browsers (Chrome sends audio to Google servers for processing).");
      } else if (errorType === "aborted") {
        // User or system aborted, benign
      } else {
        opts.onError?.(`Speech recognition error: ${errorType}`);
      }
    };

    rec.onend = () => {
      // Auto-restart unless user explicitly stopped
      if (!intentionalStop && rec) {
        try {
          rec.start();
        } catch {
          // ignore — might already be running
        }
      }
    };

    try {
      rec.start();
      opts.onState?.("listening");
    } catch (e: any) {
      opts.onError?.(`Could not start speech recognition: ${e.message}`);
      opts.onState?.("unsupported");
    }
  }

  function stop() {
    intentionalStop = true;
    if (silenceTimer) { window.clearTimeout(silenceTimer); silenceTimer = null; }
    if (rec) {
      rec.onend = null;
      rec.onerror = null;
      rec.onresult = null;
      try { rec.stop(); } catch { /* ignore */ }
      try { rec.abort(); } catch { /* ignore */ }
      rec = null;
    }
    speaking = false;
    wordBuffer = [];
    opts.onState?.("idle");
  }

  return {
    start,
    stop,
    destroy: stop,
  };
}
