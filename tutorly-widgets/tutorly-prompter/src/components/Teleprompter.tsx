import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store/useStore";
import type { CueCard, LessonPlan, LessonSentence } from "../types";
import { SentenceView } from "./SentenceView";
import { countWords, plainText } from "../utils/annotations";
import { createSpeechController, type SpeechController } from "../speech/speechController";
import { Button, Pill } from "./ui";
import { cn } from "../utils/cn";
import {
  Play, Pause, Mic, MicOff, Maximize2, Minimize2, ExternalLink, RotateCcw,
  ZoomIn, ZoomOut, Bookmark, ChevronUp, ChevronDown, Sun, Moon,
  Timer as TimerIcon, X, Focus, Lock, Unlock, Settings as Cog,
  Copy, Video, VideoOff, Minus, Plus, Gauge, HelpCircle,
} from "lucide-react";
import { TimerStack, type ActiveTimer } from "./TimerStack";
import { CuePanel } from "./CuePanel";

export interface FlatSentence {
  globalIndex: number;
  sectionIndex: number;
  sentenceIndex: number;
  sentence: LessonSentence;
  sectionTitle: string;
  isSectionStart: boolean;
}

function flatten(lesson: LessonPlan): FlatSentence[] {
  const out: FlatSentence[] = [];
  let g = 0;
  lesson.sections.forEach((sec, si) => {
    sec.sentences.forEach((sn, ii) => {
      out.push({
        globalIndex: g++,
        sectionIndex: si,
        sentenceIndex: ii,
        sentence: sn,
        sectionTitle: sec.title,
        isSectionStart: ii === 0,
      });
    });
  });
  return out;
}

export interface TeleprompterProps {
  onBack?: () => void;
  embedded?: boolean;
}

export const Teleprompter: React.FC<TeleprompterProps> = ({ onBack, embedded }) => {
  const {
    lesson, display, voice, learner, studentRoster, bookmarks, toggleBookmark,
    setDisplay, setVoice,
  } = useStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechController | null>(null);
  // (auto timers removed — user manually controls all timers now)
  const userInteractingRef = useRef(false);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMul, setSpeedMul] = useState(1);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "denied" | "unsupported">("idle");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [lessonStartAt, setLessonStartAt] = useState<number | null>(null);
  const [pacingMsg, setPacingMsg] = useState<string | null>(null);
  const [activeCue, setActiveCue] = useState<{ cue: CueCard; expiresAt: number } | null>(null);
  const [copiedSection, setCopiedSection] = useState<number | null>(null);
  const [showAnnotationGuide, setShowAnnotationGuide] = useState(false);
  // Webcam drag position
  const [webcamPos, setWebcamPos] = useState({ x: 16, y: 80 });
  const webcamDragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const flat = useMemo(() => (lesson ? flatten(lesson) : []), [lesson]);
  const totalWords = useMemo(
    () => flat.reduce((s, f) => s + countWords(f.sentence.text), 0),
    [flat],
  );
  const _estimatedMin = totalWords / Math.max(40, voice.baseWPM); void _estimatedMin;

  const studentName = (studentRoster[0] || learner.name || "").trim() || undefined;
  const anchorRatio = display.anchor === "third" ? 1 / 3 : 1 / 2;

  const scrollToIndex = useCallback((idx: number, smooth = true) => {
    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return;
    const el = stage.querySelector<HTMLDivElement>(`[data-sentence-idx="${idx}"]`);
    if (!el) return;
    const anchor = container.clientHeight * anchorRatio;
    const target = el.offsetTop - anchor + el.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior: smooth ? "smooth" : "auto" });
  }, [anchorRatio]);

  const updateCurrentFromScroll = useCallback(() => {
    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return;
    const anchorY = container.scrollTop + container.clientHeight * anchorRatio;
    const nodes = stage.querySelectorAll<HTMLDivElement>("[data-sentence-idx]");
    let best = 0;
    let bestDist = Infinity;
    nodes.forEach((n) => {
      const center = n.offsetTop + n.clientHeight / 2;
      const d = Math.abs(center - anchorY);
      if (d < bestDist) {
        bestDist = d;
        best = Number(n.dataset.sentenceIdx);
      }
    });
    if (!Number.isNaN(best)) setCurrentIdx(best);
  }, [anchorRatio]);

  // Scroll speed multiplier from display settings
  const effectiveSpeed = display.scrollSpeed * speedMul;

  // Auto-scroll RAF loop
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const scrollRemainderRef = useRef<number>(0); // Accumulate fractional pixels
  useEffect(() => {
    function loop(ts: number) {
      const container = containerRef.current;
      if (!container) { rafRef.current = requestAnimationFrame(loop); return; }
      const dt = lastTsRef.current ? (ts - lastTsRef.current) / 1000 : 0;
      lastTsRef.current = ts;
      if (isPlaying && !userInteractingRef.current) {
        // Calculate effective WPM (base WPM × speed multiplier)
        const effectiveWPM = Math.max(20, voice.baseWPM * effectiveSpeed);
        
        // Calculate how many pixels to scroll per second:
        // 1. Each line is fontSizePx × lineHeight pixels tall
        // 2. Average word is ~5 chars + space = 6 chars
        // 3. Lines fit maxWidthCh / 6 words
        // 4. At effectiveWPM, we scroll through (effectiveWPM / wordsPerLine) lines per minute
        // 5. Convert to pixels per second
        
        const lineHeightPx = display.fontSizePx * display.lineHeight;
        const approxWordsPerLine = Math.max(3, display.maxWidthCh / 6);
        const linesPerMinute = effectiveWPM / approxWordsPerLine;
        const pixelsPerSecond = (linesPerMinute * lineHeightPx) / 60;
        
        // Boost factor: 1.0× should feel like comfortable natural reading speed
        // Empirically, we need ~3.5× boost for teleprompter to feel natural
        const naturalReadingBoost = 3.5;
        const finalPxPerSec = pixelsPerSecond * naturalReadingBoost;
        
        // Accumulate fractional pixels to avoid browser rounding issues at slow speeds
        scrollRemainderRef.current += finalPxPerSec * dt;
        const wholePixels = Math.floor(scrollRemainderRef.current);
        if (wholePixels > 0) {
          container.scrollTop += wholePixels;
          scrollRemainderRef.current -= wholePixels;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
      scrollRemainderRef.current = 0;
    };
  }, [isPlaying, voice.baseWPM, effectiveSpeed, display.fontSizePx, display.lineHeight, display.maxWidthCh]);

  // Scroll listener
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onScroll = () => { updateCurrentFromScroll(); };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, [updateCurrentFromScroll]);

  // Mouse wheel: intercept to scroll exactly one sentence at a time
  const wheelAccRef = useRef(0);
  const wheelTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // stop native scroll
      userInteractingRef.current = true;
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => { userInteractingRef.current = false; }, 1200);

      // Accumulate delta — trigger a sentence jump once threshold is crossed
      wheelAccRef.current += e.deltaY;
      const THRESHOLD = 80; // pixels of delta before jumping one sentence
      if (wheelAccRef.current >= THRESHOLD) {
        wheelAccRef.current = 0;
        const next = Math.min(flat.length - 1, currentIdx + 1);
        setCurrentIdx(next);
        scrollToIndex(next, true);
      } else if (wheelAccRef.current <= -THRESHOLD) {
        wheelAccRef.current = 0;
        const next = Math.max(0, currentIdx - 1);
        setCurrentIdx(next);
        scrollToIndex(next, true);
      }
    };
    c.addEventListener("wheel", onWheel, { passive: false });

    const onTouchMove = () => {
      userInteractingRef.current = true;
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => { userInteractingRef.current = false; }, 800);
    };
    c.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      c.removeEventListener("wheel", onWheel);
      c.removeEventListener("touchmove", onTouchMove);
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
    };
  }, [flat.length, currentIdx, scrollToIndex]);

  // Snap to paragraph
  useEffect(() => {
    if (!display.snapToParagraph) return;
    const c = containerRef.current;
    if (!c) return;
    let t: number | null = null;
    const onScroll = () => {
      if (!userInteractingRef.current) return;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        if (!userInteractingRef.current) scrollToIndex(currentIdx, true);
      }, 200);
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => { c.removeEventListener("scroll", onScroll); if (t) window.clearTimeout(t); };
  }, [display.snapToParagraph, scrollToIndex, currentIdx]);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
      if (e.key === " ") { e.preventDefault(); setIsPlaying((p) => !p); return; }
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); jump(1); return; }
      if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); jump(-1); return; }
      if (e.key === "Home") { e.preventDefault(); scrollToIndex(0); return; }
      if (e.key === "End") { e.preventDefault(); scrollToIndex(flat.length - 1); return; }
      if ((e.key === "+" || e.key === "=") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); setDisplay({ fontSizePx: Math.min(96, display.fontSizePx + 2) }); return;
      }
      if (e.key === "-" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); setDisplay({ fontSizePx: Math.max(14, display.fontSizePx - 2) }); return;
      }
      if (e.key === "b" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); toggleBookmark(currentIdx); return;
      }
      if (e.key === "f" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); toggleFullscreen(); return;
      }
      if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) {
        e.preventDefault(); triggerNearbyCue(Number(e.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIdx, display.fontSizePx, flat.length, scrollToIndex, setDisplay, toggleBookmark]);

  function jump(dir: 1 | -1) {
    const next = Math.max(0, Math.min(flat.length - 1, currentIdx + dir));
    setCurrentIdx(next);
    scrollToIndex(next, true);
  }

  // Speed adjustment
  function adjustScrollSpeed(delta: number) {
    const next = Math.max(0.1, Math.min(2.0, display.scrollSpeed + delta));
    setDisplay({ scrollSpeed: Math.round(next * 20) / 20 });
  }

  // ===== Speech =====
  function toggleMic() {
    if (speechRef.current) {
      speechRef.current.destroy();
      speechRef.current = null;
      setVoiceState("idle");
      setVoice({ enabled: false });
      return;
    }
    setVoice({ enabled: true });
    const ctrl = createSpeechController({
      silenceMs: Math.round(voice.autoPauseSec * 1000),
      onState: (s) => setVoiceState(s),
      onError: () => {},
      onSpeechStart: () => { setIsPlaying(true); },
      onSpeechEnd: () => { setIsPlaying(false); },
      onWPM: (wpm) => {
        const target = Math.max(voice.minWPM, Math.min(voice.maxWPM, wpm)) / voice.baseWPM;
        setSpeedMul((cur) => cur * 0.7 + target * 0.3);
      },
    });
    speechRef.current = ctrl;
    ctrl.start();
  }

  useEffect(() => () => { speechRef.current?.destroy(); }, []);

  // ===== Webcam =====
  async function toggleWebcam() {
    if (display.showWebcam) {
      // Turn off
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
      setDisplay({ showWebcam: false });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      webcamStreamRef.current = stream;
      setDisplay({ showWebcam: true });
    } catch {
      alert("Camera access denied. Please allow camera in browser settings.");
    }
  }

  // Re-attach stream when video ref mounts or when webcam is toggled on
  useEffect(() => {
    if (display.showWebcam && webcamStreamRef.current && webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = webcamStreamRef.current;
    }
  }, [display.showWebcam]);

  useEffect(() => {
    return () => {
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ===== Timers — max 5 =====
  function startTimer(label: string, seconds: number, kind: "activity" | "wait" | "custom" = "activity") {
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setActiveTimers((cur) => {
      const next = [...cur, { id, label, totalSec: seconds, remainingSec: seconds, running: true, kind }];
      // Keep only 5 most recent
      if (next.length > 5) return next.slice(next.length - 5);
      return next;
    });
  }

  // Auto-show cues when scrolling into a sentence that has them
  useEffect(() => {
    if (!flat[currentIdx]) return;
    const sn = flat[currentIdx].sentence;
    const popCue = sn.ann?.cues?.[0];
    if (popCue) setActiveCue({ cue: popCue, expiresAt: Date.now() + 10_000 });
  }, [currentIdx, flat]);

  // Auto-hide cue
  useEffect(() => {
    if (!activeCue) return;
    const t = window.setTimeout(() => {
      setActiveCue((c) => (c && Date.now() >= c.expiresAt ? null : c));
    }, Math.max(500, activeCue.expiresAt - Date.now()));
    return () => window.clearTimeout(t);
  }, [activeCue]);

  function triggerNearbyCue(slot: number) {
    for (let i = 0; i < 5; i++) {
      const sn = flat[currentIdx + i];
      if (!sn) break;
      const cues = sn.sentence.ann?.cues || [];
      const byHot = cues.find((c) => c.hotkey === slot);
      if (byHot) { setActiveCue({ cue: byHot, expiresAt: Date.now() + 10_000 }); if (byHot.durationSec) startTimer(byHot.text, byHot.durationSec); return; }
      const byIdx = cues[slot - 1];
      if (byIdx) { setActiveCue({ cue: byIdx, expiresAt: Date.now() + 10_000 }); if (byIdx.durationSec) startTimer(byIdx.text, byIdx.durationSec); return; }
    }
  }

  // ===== Copy section text (plain, no annotations) =====
  async function copySectionText(sectionIndex: number) {
    if (!lesson) return;
    const section = lesson.sections[sectionIndex];
    if (!section) return;
    const text = section.sentences
      .map((s) => plainText(s.text, studentName))
      .join(" ");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionIndex);
      setTimeout(() => setCopiedSection(null), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedSection(sectionIndex);
      setTimeout(() => setCopiedSection(null), 1500);
    }
  }

  // ===== Pacing =====
  useEffect(() => {
    if (!isPlaying) return;
    if (lessonStartAt === null) setLessonStartAt(Date.now());
  }, [isPlaying, lessonStartAt]);

  useEffect(() => {
    if (!lesson || lessonStartAt === null) { setPacingMsg(null); return; }
    const elapsedMin = (Date.now() - lessonStartAt) / 60000;
    const plannedMin = (currentIdx / Math.max(1, flat.length - 1)) * lesson.targetMinutes;
    const diff = elapsedMin - plannedMin;
    if (Math.abs(diff) < 0.5) setPacingMsg(null);
    else if (diff < -1.2) setPacingMsg("⏩ You're ahead — slow down");
    else if (diff > 1.2) setPacingMsg("⏪ You're behind — pick up the pace");
    else setPacingMsg(null);
  }, [currentIdx, flat.length, lesson, lessonStartAt, isPlaying]);

  // ===== Fullscreen =====
  function toggleFullscreen() {
    const el = embedded ? document.documentElement : containerRef.current?.parentElement?.parentElement;
    if (!document.fullscreenElement) {
      el?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ===== Detached window =====
  const detachedRef = useRef<Window | null>(null);
  function openDetached() {
    if (detachedRef.current && !detachedRef.current.closed) {
      detachedRef.current.focus();
      return;
    }
    const features = "popup=yes,width=520,height=720,toolbar=no,menubar=no,location=no,status=no,resizable=yes,directories=no,titlebar=no";
    const url = new URL(window.location.href);
    url.hash = "detached";
    const w = window.open(url.toString(), "tutorly-prompter", features);
    if (!w) { alert("Pop-up blocked. Please allow pop-ups for this site."); return; }
    detachedRef.current = w;
    // Try to go fullscreen in the popup after a delay
    setTimeout(() => {
      try { w.document.documentElement.requestFullscreen(); } catch { /* fine */ }
    }, 500);
  }

  // ===== Theme =====
  const schemeClass =
    display.scheme === "light" ? "tp-theme-light"
    : display.scheme === "highContrastWB" ? "tp-theme-hcwb"
    : display.scheme === "highContrastYB" ? "tp-theme-hcyb"
    : "tp-theme-dark";

  if (!lesson) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-slate-400">
        No lesson loaded. Go back and paste your JSON.
      </div>
    );
  }

  const progressPct = flat.length ? ((currentIdx + 1) / flat.length) * 100 : 0;

  const sectionMarkers = useMemo(() => {
    const marks: { pct: number; title: string }[] = [];
    let g = 0;
    lesson.sections.forEach((s) => {
      marks.push({ pct: (g / flat.length) * 100, title: s.title });
      g += s.sentences.length;
    });
    return marks;
  }, [lesson, flat.length]);

  const WINDOW = 30;
  const renderStart = Math.max(0, currentIdx - WINDOW);
  const renderEnd = Math.min(flat.length, currentIdx + WINDOW);
  const approxLineHeight = display.fontSizePx * display.lineHeight + 16;
  const topSpacer = renderStart * approxLineHeight;
  const bottomSpacer = (flat.length - renderEnd) * approxLineHeight;

  return (
    <div
      className={cn(
        "tp-root relative flex h-full w-full flex-col overflow-hidden",
        schemeClass,
        display.fullscreenLock && "tp-locked",
      )}
      style={{
        ["--tp-font-size" as string]: `${display.fontSizePx}px`,
        ["--tp-lh" as string]: display.lineHeight,
        ["--tp-letter" as string]: `${display.letterSpacingEm}em`,
        ["--tp-max" as string]: `${display.maxWidthCh}ch`,
        ["--tp-bg-alpha" as string]: (display.opacity / 100).toString(),
        fontFamily: display.fontFamily,
      }}
    >
      {/* TOP BAR */}
      <div className="tp-topbar relative z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 py-2 text-xs backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && !embedded && (
            <Button size="sm" variant="ghost" onClick={onBack}><RotateCcw className="h-3.5 w-3.5" /> Editor</Button>
          )}
          {voiceState === "listening" && <Pill color="emerald">🎙 Listening</Pill>}
          {voiceState === "denied" && <Pill color="rose">Mic denied — manual</Pill>}
          {voiceState === "unsupported" && <Pill color="amber">Use Chrome for voice</Pill>}
        </div>
        <div className="flex items-center gap-1">
          {/* Play/pause with speed controls */}
          <Button size="sm" variant={isPlaying ? "primary" : "subtle"} onClick={() => setIsPlaying((p) => !p)} title="Space">
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          {/* Speed controls */}
          <Button size="sm" variant="ghost" onClick={() => adjustScrollSpeed(-0.1)} title="Slower">
            <Minus className="h-3 w-3" />
          </Button>
          <button
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-white/10 min-w-[60px] justify-center"
            onClick={() => setDisplay({ scrollSpeed: 1 })}
            title="Reset speed to 1×"
          >
            <Gauge className="h-3 w-3" /> {display.scrollSpeed.toFixed(1)}×
          </button>
          <Button size="sm" variant="ghost" onClick={() => adjustScrollSpeed(0.1)} title="Faster">
            <Plus className="h-3 w-3" />
          </Button>
          {/* Speed presets */}
          <div className="flex gap-0.5 ml-1">
            {[0.5, 1.0, 1.5, 2.0].map((preset) => (
              <button
                key={preset}
                onClick={() => setDisplay({ scrollSpeed: preset })}
                className={`rounded px-1 py-0.5 text-[10px] transition ${
                  Math.abs(display.scrollSpeed - preset) < 0.05
                    ? "bg-blue-500/30 text-blue-200"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
                title={`Set speed to ${preset}×`}
              >
                {preset}×
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <Button size="sm" variant="ghost" onClick={() => jump(-1)} title="↑"><ChevronUp className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => jump(1)} title="↓"><ChevronDown className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDisplay({ fontSizePx: Math.max(14, display.fontSizePx - 2) })}><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="w-8 text-center text-slate-400">{display.fontSizePx}</span>
          <Button size="sm" variant="ghost" onClick={() => setDisplay({ fontSizePx: Math.min(96, display.fontSizePx + 2) })}><ZoomIn className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => toggleBookmark(currentIdx)} title="Ctrl+B"><Bookmark className={cn("h-3.5 w-3.5", bookmarks.includes(currentIdx) && "fill-amber-400 text-amber-400")} /></Button>
          <Button size="sm" variant={voice.enabled ? "primary" : "subtle"} onClick={toggleMic} title="Voice mode">
            {voice.enabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant={display.showWebcam ? "primary" : "ghost"} onClick={toggleWebcam} title="Webcam preview">
            {display.showWebcam ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAnnotationGuide(true)} title="Annotation guide">
            <HelpCircle className="h-3.5 w-3.5" /> Guide
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDisplay({ focusMode: !display.focusMode })} title="Focus mode">
            <Focus className={cn("h-3.5 w-3.5", display.focusMode && "text-blue-400")} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDisplay({ fullscreenLock: !display.fullscreenLock })}
            title={display.fullscreenLock ? "Unlock UI" : "Lock UI"}
          >
            {display.fullscreenLock ? <Lock className="h-3.5 w-3.5 text-rose-400" /> : <Unlock className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={cycleScheme} title="Theme">
            {display.scheme === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
          {!embedded && (
            <Button size="sm" variant="ghost" onClick={openDetached} title="Open detached window"><ExternalLink className="h-3.5 w-3.5" /></Button>
          )}
          <Button size="sm" variant="ghost" onClick={toggleFullscreen} title="F">
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSettings((s) => !s)} title="Settings"><Cog className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="relative h-1.5 w-full bg-white/5">
        <div className="absolute inset-y-0 left-0 bg-blue-500/70" style={{ width: `${progressPct}%` }} />
        {sectionMarkers.map((m, i) => (
          <div key={i} className="absolute inset-y-0 w-px bg-white/30" style={{ left: `${m.pct}%` }} title={m.title} />
        ))}
      </div>

      {/* MAIN */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Vertical ruler */}
        <div className="hidden md:flex w-2 shrink-0 bg-black/30 relative">
          <div className="absolute inset-x-0 top-0 bg-blue-500/40" style={{ height: `${progressPct}%` }} />
        </div>

        {/* Stage */}
        <div
          ref={containerRef}
          className={cn("tp-stage relative flex-1 overflow-y-auto", display.focusMode && "tp-focus")}
          tabIndex={0}
        >
          <div ref={stageRef} className="tp-content mx-auto" style={{ maxWidth: "var(--tp-max)", padding: "30vh 1.25rem 50vh" }}>
            <div style={{ height: topSpacer }} aria-hidden />
            {flat.slice(renderStart, renderEnd).map((f) => (
              <React.Fragment key={f.globalIndex}>
                {f.isSectionStart && (
                  <div className="tp-section-head my-6 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-sm uppercase tracking-widest text-slate-400">§ {f.sectionTitle}</span>
                    <button
                      onClick={() => copySectionText(f.sectionIndex)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-400 hover:bg-white/10 hover:text-white transition"
                      title="Copy section text (plain) for your learner's board"
                    >
                      {copiedSection === f.sectionIndex ? "✓ Copied" : <><Copy className="h-3 w-3" /> Copy</>}
                    </button>
                  </div>
                )}
                <SentenceView
                  sentence={f.sentence}
                  index={f.globalIndex}
                  studentName={studentName}
                  isCurrent={f.globalIndex === currentIdx}
                  isBookmarked={bookmarks.includes(f.globalIndex)}
                  showTranslations={display.showTranslations}
                  showPronunciation={display.showPronunciation}
                  showBloom={display.showBloom}
                  showEmotion={display.showEmotion}
                  showPitchContour={display.showPitchContour}
                  onClick={() => { setCurrentIdx(f.globalIndex); scrollToIndex(f.globalIndex, true); }}
                />
              </React.Fragment>
            ))}
            <div style={{ height: bottomSpacer }} aria-hidden />
          </div>

          {/* Anchor line */}
          <div className="pointer-events-none absolute inset-x-0 z-10 h-px bg-blue-400/40" style={{ top: `calc(${anchorRatio * 100}%)` }} />

          {/* Pacing toast */}
          {pacingMsg && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs text-amber-200 shadow">
              {pacingMsg}
            </div>
          )}

          {/* Active cue popover */}
          {activeCue && (
            <div
              className="absolute right-3 top-3 z-20 max-w-xs rounded-xl border border-white/15 bg-black/70 p-3 text-xs text-slate-100 shadow-xl backdrop-blur"
              onMouseEnter={() => setActiveCue((c) => c && ({ ...c, expiresAt: Date.now() + 30_000 }))}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <Pill color={cueColor(activeCue.cue.category)}>{activeCue.cue.category}</Pill>
                <button className="text-slate-400 hover:text-white" onClick={() => setActiveCue(null)}><X className="h-3 w-3" /></button>
              </div>
              <div className="text-sm">{activeCue.cue.text}</div>
              {activeCue.cue.imageQuery && (
                <a className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-300 hover:underline" target="_blank" rel="noreferrer"
                   href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(activeCue.cue.imageQuery)}`}>
                  🔎 image: {activeCue.cue.imageQuery}
                </a>
              )}
              {activeCue.cue.durationSec && (
                <Button size="sm" className="mt-2 w-full" onClick={() => startTimer(activeCue.cue.text, activeCue.cue.durationSec!)}>
                  <TimerIcon className="h-3 w-3" /> Start timer ({activeCue.cue.durationSec}s)
                </Button>
              )}
            </div>
          )}
        </div>

        {/* CUE PANEL */}
        {!display.fullscreenLock && (
          <CuePanel
            lesson={lesson}
            flat={flat}
            currentIdx={currentIdx}
            onJump={(i) => { setCurrentIdx(i); scrollToIndex(i, true); }}
            bookmarks={bookmarks}
            onStartTimer={startTimer}
          />
        )}

        {/* Webcam preview - draggable overlay, always visible */}
        {display.showWebcam && (
          <div
            className="tp-webcam-draggable"
            style={{ left: webcamPos.x, top: webcamPos.y }}
            onMouseDown={(e) => {
              e.preventDefault();
              webcamDragRef.current = {
                dragging: true,
                startX: e.clientX,
                startY: e.clientY,
                origX: webcamPos.x,
                origY: webcamPos.y,
              };
              const onMove = (ev: MouseEvent) => {
                if (!webcamDragRef.current.dragging) return;
                setWebcamPos({
                  x: Math.max(0, webcamDragRef.current.origX + ev.clientX - webcamDragRef.current.startX),
                  y: Math.max(0, webcamDragRef.current.origY + ev.clientY - webcamDragRef.current.startY),
                });
              };
              const onUp = () => {
                webcamDragRef.current.dragging = false;
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
              };
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp);
            }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              webcamDragRef.current = {
                dragging: true,
                startX: t.clientX,
                startY: t.clientY,
                origX: webcamPos.x,
                origY: webcamPos.y,
              };
              const onMove = (ev: TouchEvent) => {
                if (!webcamDragRef.current.dragging) return;
                const tt = ev.touches[0];
                setWebcamPos({
                  x: Math.max(0, webcamDragRef.current.origX + tt.clientX - webcamDragRef.current.startX),
                  y: Math.max(0, webcamDragRef.current.origY + tt.clientY - webcamDragRef.current.startY),
                });
              };
              const onUp = () => {
                webcamDragRef.current.dragging = false;
                document.removeEventListener("touchmove", onMove);
                document.removeEventListener("touchend", onUp);
              };
              document.addEventListener("touchmove", onMove, { passive: true });
              document.addEventListener("touchend", onUp);
            }}
          >
            <video ref={webcamVideoRef} autoPlay muted playsInline />
            <div className="tp-webcam-handle" title="Drag to move webcam">
              ⟺
            </div>
          </div>
        )}
      </div>

      {/* TIMER STACK */}
      <TimerStack
        timers={activeTimers}
        lessonStartAt={lessonStartAt}
        targetMinutes={lesson.targetMinutes}
        onChange={setActiveTimers}
        onAdd={(label, sec, kind) => startTimer(label, sec, kind)}
      />

      {/* SETTINGS DRAWER */}
      {showSettings && (
        <div className="absolute inset-y-0 right-0 z-30 w-80 overflow-y-auto border-l border-white/10 bg-black/80 p-4 text-xs backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Display</h3>
            <button onClick={() => setShowSettings(false)}><X className="h-4 w-4" /></button>
          </div>
          <SettingsDrawer />
        </div>
      )}

      {/* ANNOTATION GUIDE MODAL */}
      {showAnnotationGuide && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/80" onClick={() => setShowAnnotationGuide(false)}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Annotation Guide — how your script looks</h2>
              <button onClick={() => setShowAnnotationGuide(false)} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            {/* Live preview — exactly how the teleprompter renders */}
            <div className="mb-4 rounded-xl border border-white/10 bg-black/60 px-4 py-3" style={{ fontFamily: "system-ui, sans-serif", fontSize: 22, lineHeight: 1.6 }}>
              <span style={{ color: "#f8fafc" }}>Now let's </span>
              <span style={{ fontWeight: 800, color: "#ef4444", textDecoration: "underline", textDecorationThickness: "0.1em", textUnderlineOffset: "0.18em" }}>look</span>
              <span style={{ color: "#f8fafc" }}> at this example </span>
              <span style={{ color: "#94a3b8", fontSize: "0.5em", verticalAlign: "middle" }}> · </span>
              <span style={{ color: "#f8fafc" }}> do you </span>
              <span style={{ fontWeight: 800, color: "#ef4444", textDecoration: "underline", textDecorationThickness: "0.1em", textUnderlineOffset: "0.18em" }}>see</span>
              <span style={{ color: "#f8fafc" }}> it </span>
              <span style={{ color: "#c084fc" }}>↗</span>
              <span style={{ fontSize: "0.6em", marginLeft: "0.3em" }}>🤔</span>
            </div>
            <p className="mb-3 text-[11px] text-slate-400">Above is exactly how your teleprompter looks. No symbols — only colors, bold, and underlines.</p>

            {/* Legend */}
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-2.5">
                <div className="w-32 shrink-0 text-center">
                  <span style={{ fontWeight: 800, color: "#ef4444", textDecoration: "underline", textDecorationThickness: "0.1em", textUnderlineOffset: "0.18em", fontSize: 16 }}>stressed</span>
                </div>
                <div className="text-slate-300">
                  <strong className="text-white">Nuclear stress</strong> — the word receiving highest emphasis in a thought group. Usually the last content word or new information. Bold + red + underline.
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-2.5">
                <div className="w-32 shrink-0 text-center">
                  <span style={{ color: "#34d399", fontSize: 16 }}>let‿me</span>
                </div>
                <div className="text-slate-300">
                  <strong className="text-white">Linking</strong> — connected speech. Words blend together naturally: not‿at‿all, want‿to. Green curve symbol.
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-2.5">
                <div className="w-32 shrink-0 text-center">
                  <span style={{ color: "#94a3b8", fontSize: 11 }}> · </span>
                  <span className="text-slate-400 mx-1">and</span>
                  <span style={{ color: "#94a3b8", fontSize: 13 }}> ▪ </span>
                </div>
                <div className="text-slate-300">
                  <strong className="text-white">Pauses</strong> — small dot for breath pause, larger dot for topic transition. No slashes visible.
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-2.5">
                <div className="w-32 shrink-0 text-center">
                  <span style={{ color: "#c084fc", fontSize: 18 }}>↗ ↘</span>
                </div>
                <div className="text-slate-300">
                  <strong className="text-white">Intonation</strong> — ↗ rising (questions), ↘ falling (statements). Shows pitch direction at phrase boundaries.
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-2.5">
                <div className="w-32 shrink-0 text-center">
                  <span style={{ color: "#c084fc", fontStyle: "italic", fontSize: 15 }}>Maria</span>
                </div>
                <div className="text-slate-300">
                  <strong className="text-white">Student name</strong> — auto-replaced with the learner's actual name. Shown in purple italic.
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-2.5">
                <div className="w-32 shrink-0 text-center text-lg">🙂 🤗 🤩</div>
                <div className="text-slate-300">
                  <strong className="text-white">Body language cues</strong> — emoji reminders for facial expressions/gestures. Smile, warm, excited, serious, curious, encouraging.
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-2.5">
                <div className="w-32 shrink-0 text-center">
                  <span className="text-[11px]">🔊</span>
                </div>
                <div className="text-slate-300">
                  <strong className="text-white">Speaker button</strong> — hover over any sentence and click the 🔊 icon. The browser reads the text aloud so you can check pronunciation.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function cycleScheme() {
    const order: ("dark" | "light" | "highContrastWB" | "highContrastYB")[] = ["dark", "light", "highContrastWB", "highContrastYB"];
    const i = order.indexOf(display.scheme);
    setDisplay({ scheme: order[(i + 1) % order.length] });
  }
};

function cueColor(c: string): "blue" | "amber" | "rose" | "emerald" | "violet" | "slate" {
  switch (c) {
    case "question": return "blue";
    case "slide": return "violet";
    case "poll": return "amber";
    case "activity": return "emerald";
    case "joke": return "rose";
    case "transition": return "slate";
    case "image": return "violet";
    case "whiteboard": return "amber";
    default: return "slate";
  }
}

const SettingsDrawer: React.FC = () => {
  const { display, voice, setDisplay, setVoice } = useStore();
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-2">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      {children}
    </div>
  );
  return (
    <div className="space-y-2">
      <Row label="Font size">
        <input type="range" min={14} max={96} value={display.fontSizePx}
          onChange={(e) => setDisplay({ fontSizePx: Number(e.target.value) })} className="w-full" />
        <div className="text-right">{display.fontSizePx}px</div>
      </Row>
      <Row label="Line height">
        <input type="range" min={1.1} max={2.2} step={0.05} value={display.lineHeight}
          onChange={(e) => setDisplay({ lineHeight: Number(e.target.value) })} className="w-full" />
        <div className="text-right">{display.lineHeight.toFixed(2)}</div>
      </Row>
      <Row label="Letter spacing">
        <input type="range" min={-0.02} max={0.1} step={0.005} value={display.letterSpacingEm}
          onChange={(e) => setDisplay({ letterSpacingEm: Number(e.target.value) })} className="w-full" />
        <div className="text-right">{display.letterSpacingEm.toFixed(3)}em</div>
      </Row>
      <Row label="Max width">
        <input type="range" min={24} max={80} value={display.maxWidthCh}
          onChange={(e) => setDisplay({ maxWidthCh: Number(e.target.value) })} className="w-full" />
        <div className="text-right">{display.maxWidthCh}ch</div>
      </Row>
      <Row label="Scroll speed">
        <input type="range" min={0.1} max={2.0} step={0.05} value={display.scrollSpeed}
          onChange={(e) => setDisplay({ scrollSpeed: Number(e.target.value) })} className="w-full" />
        <div className="text-right">{display.scrollSpeed.toFixed(2)}×</div>
      </Row>
      <Row label="Opacity (detached)">
        <input type="range" min={20} max={100} value={display.opacity}
          onChange={(e) => setDisplay({ opacity: Number(e.target.value) })} className="w-full" />
        <div className="text-right">{display.opacity}%</div>
      </Row>
      <Row label="Anchor">
        <select value={display.anchor} onChange={(e) => setDisplay({ anchor: e.target.value as "third" | "half" })}
          className="w-full rounded bg-slate-900 px-2 py-1">
          <option value="third">1/3 from top</option>
          <option value="half">Center</option>
        </select>
      </Row>
      <Row label="Scheme">
        <select value={display.scheme} onChange={(e) => setDisplay({ scheme: e.target.value as any })}
          className="w-full rounded bg-slate-900 px-2 py-1">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="highContrastWB">High contrast — White on Black</option>
          <option value="highContrastYB">High contrast — Yellow on Black</option>
        </select>
      </Row>

      <h3 className="mt-3 text-sm font-semibold">Voice</h3>
      <Row label="Base WPM">
        <input type="number" min={60} max={260} value={voice.baseWPM}
          onChange={(e) => setVoice({ baseWPM: Number(e.target.value) || 140 })}
          className="w-full rounded bg-slate-900 px-2 py-1" />
      </Row>
      <Row label={`Auto-pause after silence (${voice.autoPauseSec.toFixed(1)}s)`}>
        <input type="range" min={0.6} max={5} step={0.1} value={voice.autoPauseSec}
          onChange={(e) => setVoice({ autoPauseSec: Number(e.target.value) })} className="w-full" />
      </Row>
      <Row label={`Wait-time after question (${voice.waitTimeSec}s)`}>
        <input type="range" min={1} max={10} step={1} value={voice.waitTimeSec}
          onChange={(e) => setVoice({ waitTimeSec: Number(e.target.value) })} className="w-full" />
      </Row>

      <h3 className="mt-3 text-sm font-semibold">Show</h3>
      {([
        ["showPitchContour","Pitch contour preview"],
        ["showTranslations","Translations"],
        ["showPronunciation","IPA pronunciation"],
        ["showBloom","Bloom tags"],
        ["showEmotion","Emotion icons"],
        ["snapToParagraph","Snap to paragraph"],
      ] as const).map(([k, label]) => (
        <label key={k} className="flex items-center justify-between rounded bg-white/5 px-2 py-1">
          <span>{label}</span>
          <input type="checkbox" checked={(display as any)[k]} onChange={(e) => setDisplay({ [k]: e.target.checked } as any)} />
        </label>
      ))}
    </div>
  );
};
