import { useEffect, useMemo, useState } from "react";
import { SplashScreen, ThemeToggle, TutorlyBrand, SHELL_CSS } from "./components/onboarding/shell";
import { ACCENT, LearnerSetup } from "./components/onboarding/LearnerSetup";
import { LibraryView } from "./components/library/LibraryView";
import { WatchView } from "./components/watch/WatchView";
import { SettingsModal } from "./components/settings/SettingsModal";
import { CatalogView } from "./components/catalog/CatalogView";
import { useProfileStore } from "./store/profile";
import { Button } from "./components/ui";
import { warmVoices } from "./lib/audio/tts";

type View = "splash" | "setup" | "library" | "watch" | "catalog";

/**
 * Flix.
 *
 * Same shell as every other Tutorly game — splash → setup → content — but the
 * content here is a streaming service: a library of episodes, an interactive
 * player with dual subtitles, a timestamped lesson engine and the AI lesson
 * maker. The learner profile collected in the setup step is what personalises
 * every prompt the maker produces.
 */
export default function App() {
  const theme = useProfileStore((s) => s.theme);
  const toggleTheme = useProfileStore((s) => s.toggleTheme);
  const ready = useProfileStore((s) => s.ready);

  const [view, setView] = useState<View>(() => (useProfileStore.getState().showSplash ? "splash" : useProfileStore.getState().ready ? "library" : "setup"));
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const darkMode = theme === "dark";

  /* The light theme is the Tutorly default; the class lands on <body>. */
  useEffect(() => {
    document.body.classList.toggle("tf-light", !darkMode);
    document.body.style.background = darkMode ? "#08090d" : "#f6f7fb";
  }, [darkMode]);

  /* Voices load lazily in most browsers — ask once so the first activity is instant. */
  useEffect(() => {
    warmVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = () => warmVoices();
  }, []);

  /* A deep link (#/watch?episode=…) opens straight into an episode. */
  useEffect(() => {
    const hash = window.location.hash;
    const match = /episode=([^&]+)/.exec(hash);
    if (match && ready) {
      setEpisodeId(decodeURIComponent(match[1]));
      setView("watch");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const splashConfig = useMemo(
    () => ({
      gameTitle: "Flix",
      gameEmoji: "🎬",
      tagline: "Watch, understand, discuss — streaming that teaches.",
      accent: ACCENT,
      features: [
        { icon: "🎞", label: "Adaptive streaming (HLS/DASH)" },
        { icon: "💬", label: "Dual subtitles + word tracking" },
        { icon: "🎓", label: "Activities on the timeline" },
        { icon: "🤖", label: "AI lesson maker from the subtitles" },
        { icon: "👥", label: "Watch party for the whole class" },
      ],
      howToPlay: [
        "Add a video (HLS, DASH or mp4) with its subtitles in the library.",
        "Open the AI Maker tab — the prompt already contains the subtitles with real timestamps.",
        "Copy the prompt, paste it into any AI chat, paste the JSON back.",
        "Press play: activities pause the video exactly where they teach, and score the answer.",
        "Use the transcript to replay any line, and the party tab to watch together.",
      ],
    }),
    [],
  );

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: darkMode ? "#08090d" : "#f6f7fb", color: "var(--color-tf-text)" }}>
      <style>{SHELL_CSS}</style>

      {view === "splash" && (
        <SplashScreen
          config={splashConfig}
          darkMode={darkMode}
          onToggleDark={toggleTheme}
          onPlay={() => setView(ready ? "library" : "setup")}
          hasSavedGame={ready}
          onContinue={() => setView("library")}
        />
      )}

      {view === "setup" && (
        <LearnerSetup
          darkMode={darkMode}
          onToggleDark={toggleTheme}
          onBack={() => setView("splash")}
          onDone={(openedEpisodeId) => {
            if (openedEpisodeId) {
              setEpisodeId(openedEpisodeId);
              setView("watch");
            } else {
              setView("library");
            }
          }}
        />
      )}

      {(view === "library" || view === "watch" || view === "catalog") && (
        <>
          <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)" }}>
            <button onClick={() => setView("library")} className="shrink-0" aria-label="Flix home">
              <TutorlyBrand darkMode={darkMode} size="sm" />
            </button>
            <span className="text-lg font-black tracking-tight">Flix</span>
            {view === "watch" && <span className="text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>· lesson player</span>}
            <div className="ml-auto flex items-center gap-1.5">
              <Button size="sm" onClick={() => setView(view === "catalog" ? "library" : "catalog")} title="Find any movie or TV series, read about it, and play the licensed copies">
                {view === "catalog" ? "🎬 Library" : "🔎 Discover"}
              </Button>
              <Button size="sm" onClick={() => setView("setup")} title="Edit the learner profile — it feeds the AI prompt">
                🎓 Learner
              </Button>
              <Button size="sm" onClick={() => setSettingsOpen(true)}>
                ⚙️ Settings
              </Button>
              <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
            </div>
          </header>

          {view === "library" ? (
            <LibraryView
              darkMode={darkMode}
              onToggleDark={toggleTheme}
              onOpen={(id) => {
                setEpisodeId(id);
                setView("watch");
              }}
            />
          ) : view === "catalog" ? (
            <CatalogView
              onOpen={(id) => {
                setEpisodeId(id);
                setView("watch");
              }}
            />
          ) : episodeId ? (
            <WatchView episodeId={episodeId} onBack={() => setView("library")} />
          ) : (
            <div className="grid flex-1 place-items-center text-sm" style={{ color: "var(--color-tf-sub)" }}>
              Pick an episode from the library.
            </div>
          )}
        </>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
