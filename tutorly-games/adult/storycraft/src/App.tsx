import { useEffect, useRef, useState } from "react";
import "./ui/effects.css";
import { CanvasView } from "./ui/canvas/CanvasView";
import { GMPanel } from "./ui/gm/GMPanel";
import { store } from "./engine/store";

type View = "launcher" | "canvas" | "gm";

function detectView(): View {
  const hash = window.location.hash.replace("#", "");
  if (hash === "gm") return "gm";
  if (hash === "canvas") return "canvas";
  return "launcher";
}

export default function App() {
  const [view, setView] = useState<View>(detectView());

  useEffect(() => {
    const onHash = () => setView(detectView());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Keep windows alive / request fresh state when GM/canvas mount
  useEffect(() => {
    if (view === "gm" || view === "canvas") store.broadcast({ type: "REQUEST_STATE", origin: store.origin });
  }, [view]);

  const openGM = () => {
    const win = window.open(
      window.location.pathname + "#gm",
      "aw-gm",
      "width=520,height=900,menubar=no,toolbar=no,location=no,status=no",
    );
    if (!win) {
      // popup blocked → navigate in-place
      window.location.hash = "gm";
      setView("gm");
    }
  };

  if (view === "gm") return <GMPanel />;

  if (view === "canvas") return <CanvasView openGM={openGM} />;

  return <Launcher onBoth={() => { openGM(); window.location.hash = "canvas"; setView("canvas"); }} />;
}

/**
 * StoryCraft's splash — the card the Game Hub tile lands on.
 *
 * It used to auto-redirect after 4 seconds and start looping background music on
 * mount. Both were wrong for a classroom: the timer fires while a tutor is still
 * setting up the projector, and a browser blocks `autoPlay` audio that the page
 * did not ask for, so half the time the music simply never started. A click is
 * the one thing that both waits for the tutor AND unlocks audio on every browser,
 * so the splash now says what the game is and waits to be tapped — the same
 * pattern the other classroom games use.
 */
function Launcher({ onBoth }: { onBoth: () => void }) {
  const [armed, setArmed] = useState(false);
  const music = useRef<HTMLAudioElement>(null);

  const enter = () => {
    if (armed) return;
    setArmed(true);
    // The click is what lets this play; start it here and open the two windows
    // immediately rather than after a fake delay.
    void music.current?.play().catch(() => {});
    onBoth();
  };

  return (
    <button
      type="button"
      onClick={enter}
      className="relative flex min-h-screen w-full cursor-pointer items-center justify-center overflow-hidden bg-[#000] p-6 text-slate-100"
    >
      <audio ref={music} loop src="https://assets.mixkit.co/music/preview/mixkit-ethereal-fairy-win-2019.mp3" />
      <div className="pointer-events-none absolute inset-0 opacity-80"
        style={{ background: "radial-gradient(1000px circle at 50% 50%, #1e1b4b, #000)" }} />

      <div className="relative z-10 space-y-8 text-center">
        <div className="animate-in fade-in zoom-in duration-1000">
          <div className="mx-auto mb-6 flex h-32 w-32 animate-bounce items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-amber-400 to-fuchsia-600 text-7xl shadow-[0_0_100px_rgba(217,70,239,0.5)]">📖</div>
          <div className="text-[11px] uppercase tracking-[0.45em] text-violet-300">Tutorly · GM-run storytelling</div>
          <h1 className="mt-2 text-7xl sm:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
            STORY<span className="text-fuchsia-500">CRAFT</span>
          </h1>
          <div className="h-1 w-64 mx-auto bg-gradient-to-r from-transparent via-violet-500 to-transparent mt-2" />
          <p className="mt-4 text-base sm:text-lg font-light tracking-[0.2em] text-slate-400 uppercase">Interactive Story Engine</p>
        </div>

        <div className="mx-auto inline-block rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-600 px-10 py-3 font-black uppercase tracking-widest text-black shadow-[0_0_40px_rgba(217,70,239,0.6)] animate-pulse">
          Tap to enter
        </div>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Opens the player canvas for the class and the GM panel in a second window — music, effects and the mic are enabled by this tap.
        </p>
      </div>
    </button>
  );
}


