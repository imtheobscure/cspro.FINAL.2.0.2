import { useCallback, useEffect, useState } from "react";
import { LessonComposer } from "./components/LessonComposer";
import { Teleprompter } from "./components/Teleprompter";
import { PodcastMaker } from "./components/PodcastMaker";
import { SplashScreen } from "./components/SplashScreen";
import { useStore } from "./store/useStore";
import { Button } from "./components/ui";
import { BookOpenCheck, Presentation, Trash2, HelpCircle, X, Mic } from "lucide-react";

type View = "compose" | "teleprompter" | "podcast";

export default function App() {
  const lesson = useStore((s) => s.lesson);
  const resetAll = useStore((s) => s.resetAll);
  const [view, setView] = useState<View>("compose");
  const [isDetached, setIsDetached] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Skip splash for detached windows
  useEffect(() => {
    if (window.location.hash === "#detached") setSplashDone(true);
  }, []);

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  // Request permissions early (mic + cam) on first load
  useEffect(() => {
    if (window.location.hash === "#detached") return;
    // Prompt browser permission dialogs early so they're ready when needed
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch { /* user can deny — that's fine */ }
    })();
  }, []);

  // Detached popup mode
  useEffect(() => {
    function check() {
      const d = window.location.hash === "#detached";
      setIsDetached(d);
      if (d) {
        document.body.style.background = "transparent";
        document.documentElement.style.background = "transparent";
      }
    }
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  // Cross-window sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("tutorly-prompter")) {
        useStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Splash screen
  if (!splashDone) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Detached: only teleprompter
  if (isDetached) {
    return (
      <div className="h-screen w-screen bg-transparent text-white">
        {lesson ? (
          <Teleprompter embedded />
        ) : (
          <div className="flex h-full items-center justify-center bg-black/70 p-6 text-center text-sm text-slate-400">
            Open the main window and load a lesson — this detached prompter will follow.
            <br />Tip: keep this window below your webcam.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow shadow-blue-900/40">
              <Presentation className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-base font-semibold leading-tight text-white">Tutorly Prompter</h1>
          </div>

          <nav className="flex items-center gap-1.5">
            <Button
              variant={view === "compose" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setView("compose")}
            >
              <BookOpenCheck className="h-4 w-4" /> Compose
            </Button>
            <Button
              variant={view === "teleprompter" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setView("teleprompter")}
              disabled={!lesson}
              title={!lesson ? "Load a lesson first" : "Open teleprompter"}
            >
              <Presentation className="h-4 w-4" /> Teleprompter
            </Button>
            <Button
              variant={view === "podcast" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setView("podcast")}
              title="Podcast maker"
            >
              <Mic className="h-4 w-4" /> Podcast
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)} title="Keyboard shortcuts">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Reset all settings, learner facts, lesson and bookmarks?")) resetAll();
              }}
              title="Reset everything"
            >
              <Trash2 className="h-4 w-4 text-rose-400" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {view === "compose" ? (
          <>
            <Intro />
            <LessonComposer onLessonReady={() => setView("teleprompter")} />
          </>
        ) : view === "podcast" ? (
          <PodcastMaker />
        ) : (
          <div className="h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
            <Teleprompter onBack={() => setView("compose")} />
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 bg-slate-950/70 py-3 text-center text-[11px] text-slate-500">
        100% offline · No accounts · Your lesson, your data — stored locally in your browser.
      </footer>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

const Intro: React.FC = () => (
  <div className="mb-6 grid gap-3 md:grid-cols-3">
    {[
      { n: 1, t: "Configure & paste", d: "Pick a profile, fill learner facts, paste your raw lesson notes." },
      { n: 2, t: "Copy prompt → AI", d: "Click Copy prompt. Paste into ChatGPT. Copy the JSON it returns." },
      { n: 3, t: "Paste & teach", d: "Paste JSON, hit Load lesson, open the teleprompter. Voice-aware scrolling does the rest." },
    ].map((s) => (
      <div key={s.n} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-500/20 text-xs font-semibold text-blue-300">{s.n}</span>
          <h3 className="text-sm font-semibold text-slate-100">{s.t}</h3>
        </div>
        <p className="text-xs text-slate-400">{s.d}</p>
      </div>
    ))}
  </div>
);

const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Keyboard shortcuts & guide</h2>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-4 text-sm md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-400">Controls</h3>
          <ul className="space-y-1 text-slate-300">
            <li><kbd>Space</kbd> play / pause auto-scroll</li>
            <li><kbd>↑</kbd> / <kbd>↓</kbd> previous / next sentence</li>
            <li><kbd>Home</kbd> / <kbd>End</kbd> jump to start / end</li>
            <li><kbd>Ctrl</kbd>+<kbd>+</kbd> / <kbd>-</kbd> zoom font</li>
            <li><kbd>Ctrl</kbd>+<kbd>B</kbd> bookmark current line</li>
            <li><kbd>Ctrl</kbd>+<kbd>1</kbd>…<kbd>9</kbd> trigger cue card</li>
            <li><kbd>F</kbd> toggle fullscreen</li>
            <li>Mouse wheel: manual scroll (resumes auto in 800 ms)</li>
            <li>Speed: <kbd>−</kbd> / <kbd>+</kbd> buttons in toolbar</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-400">Annotations</h3>
          <ul className="space-y-1 text-slate-300">
            <li><code>*WORD*</code> — primary stress</li>
            <li><code>^word</code> — secondary stress</li>
            <li><code>~word</code> — reduced (unstressed)</li>
            <li><code>word_word</code> — linking (‿)</li>
            <li><code>/</code> short pause · <code>//</code> longer pause</li>
            <li><code>↑</code> rise · <code>↓</code> fall</li>
            <li><code>{`{{Student}}`}</code> learner name</li>
            <li><code>[smile]</code> [serious] [excited] etc.</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
        <strong>Voice mode:</strong> Requires Chrome/Edge/Chromium. The mic button will ask for permission — if denied, you can still use manual scroll. Speech recognition may require an internet connection on Chrome (audio is processed via Google servers).
      </div>
    </div>
  </div>
);


