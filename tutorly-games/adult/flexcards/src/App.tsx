import { useEffect, useState } from "react";
import { BrandMark, Icon, StreakFlame, UI } from "./components/Glyphs";
import { TutorlySplash } from "./components/TutorlySplash";
import { FlexcardsTool } from "./components/tools/FlexcardsTool";
import { useTheme } from "./lib/theme";
import { useTutorlyBranding } from "./lib/tutorlyBranding";

/**
 * The frame the lesson sits in.
 *
 * Two things changed here beyond the theme. The header used to be a hard-coded dark bar with
 * a live dot, a "LIVE" pill and an "Advanced English Vocabulary" caption — furniture that
 * carried no information a tutor could act on, and that all read `text-white/30` and
 * `text-white/15` on a near-black stage, which measured under 2:1. What is left is what the
 * shell actually needs: who you are, which deck you're in, and the two controls a tutor
 * reaches for mid-lesson — the theme and the sound.
 *
 * The ambient grid and the three drifting orbs are kept because they are the app's texture,
 * but they read their alpha from tokens now: the old values were tuned for a near-black stage,
 * and on paper the same 4%-white grid drew a lattice of pure white lines across a white page.
 */
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [soundOn, setSoundOn] = useState(true);
  /*
   * The Adult Dashboard's splash settings (Settings → Splash Screen Text / Subtext, the
   * tutor logo, and the on/off switch), read from the same origin. With the switch off this
   * app opens straight into the word exactly as it did before.
   */
  const branding = useTutorlyBranding();
  const [showSplash, setShowSplash] = useState(true);

  /* Let the rest of the app read the mute state without threading it through every face. */
  useEffect(() => {
    document.documentElement.dataset.sound = soundOn ? "on" : "off";
  }, [soundOn]);

  return (
    <div
      className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden text-fg-1"
      style={{ background: "var(--stage-bg)" }}
    >
      {/*
       * The Tutorly opening screen, once per page load.
       *
       * Rendered outside the header so it covers the app rather than sitting inside it, and
       * dismissible before the word is on screen — the same step every shell game has.
       */}
      {showSplash && branding.enabled ? (
        <TutorlySplash
          branding={branding}
          gameName="FlexCards"
          tagline="One word, twelve ways — real definitions, audio and photographs for whatever the lesson brought."
          mark={<BrandMark size={64} />}
          onStart={() => setShowSplash(false)}
        />
      ) : null}

      {/* Ambient grid, at the surface's own contrast rather than a fixed 4% white. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--stage-grid) 1px, transparent 1px), linear-gradient(90deg, var(--stage-grid) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.5,
        }}
      />

      {/* Ambient orbs. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[10%] left-[10%] h-72 w-72 rounded-full blur-3xl animate-float" style={{ background: "var(--stage-orb-1)" }} />
        <div className="absolute bottom-[10%] right-[5%] h-96 w-96 rounded-full blur-3xl animate-float" style={{ background: "var(--stage-orb-2)", animationDelay: "1.5s" }} />
        <div className="absolute left-[60%] top-[50%] h-64 w-64 rounded-full blur-3xl animate-float" style={{ background: "var(--stage-orb-3)", animationDelay: "3s" }} />
      </div>

      <header className="sticky top-0 z-30 border-b border-line-1 glass">
        <div className="mx-auto flex w-full max-w-[1800px] items-center gap-3 px-4 py-3 sm:px-6">
          {/*
            * The tutor's logo replaces the game's own mark when one is uploaded, which is
            * the rule every Tutorly game follows: the lesson a tutor projects carries their
            * branding. With no logo set this is the drawn brand mark, never a placeholder.
            */}
          <span className="shrink-0 drop-shadow-sm">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt=""
                className="h-9 w-9 rounded-xl object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <BrandMark size={36} />
            )}
          </span>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-black leading-none tracking-tight text-fg-1">FlexCards</h1>
            <p className="mt-0.5 truncate text-2xs font-medium leading-none text-fg-3">
              One word, twelve ways · Advanced English
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-line-1 bg-inset px-3 py-1.5 text-xs font-bold text-fg-2 sm:inline-flex">
              <StreakFlame streak={0} size={16} />
              Vocabulary studio
            </span>

            <button
              type="button"
              onClick={() => setSoundOn((on) => !on)}
              aria-pressed={!soundOn}
              aria-label={soundOn ? "Mute sound" : "Unmute sound"}
              className="grid h-10 w-10 place-items-center rounded-full border border-line-1 bg-control text-fg-2 transition-colors hover:text-fg-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info"
            >
              <Icon as={soundOn ? UI.Volume : UI.Mute} size={18} />
            </button>

            {/*
             * The theme switch sits in the header rather than in a settings sheet: a tutor
             * reaches for it *during* a lesson, when a projector washes the stage out, and
             * hunting through settings mid-card is the wrong moment to make someone think.
             */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line-1 bg-control px-3 text-xs font-bold text-fg-2 transition-colors hover:text-fg-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info"
            >
              <Icon as={theme === "dark" ? UI.Sun : UI.Moon} size={18} />
              <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </div>
      </header>

      {/*
       * Full-bleed, with only a sanity cap. The old main was `py-6 px-3` around a 664px card,
       * which on a 1440px screen threw away 54% of the viewport while the twelve section tabs
       * wrapped onto two rows.
       */}
      <main className="relative z-10 mx-auto w-full max-w-[1800px] flex-1 px-3 py-5 sm:px-6 sm:py-7">
        <FlexcardsTool soundOn={soundOn} />
      </main>

      <footer className="relative z-10 px-4 pb-5 text-center text-2xs font-medium text-fg-3">
        FlexCards · Word data from Wiktionary, Wiktionary audio, Wikiquote and Wikimedia Commons
      </footer>
    </div>
  );
}
