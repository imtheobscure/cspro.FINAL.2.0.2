"use client";

import { useEffect, useState } from "react";
import { SettingsProvider } from "@/lib/settings";
import { href, navigate, useRoute } from "@/lib/route";
import { Splash } from "@/lib/shell";
import { useCatalogue, themeIn } from "@/lib/catalogue";
import { reinstallSavedLessons } from "@/lib/customPack";
import { LANGS } from "@/lib/types";
import { TutorBar } from "@/components/TutorBar";
import { Home } from "@/components/Home";
import { ThemeHub } from "@/components/ThemeHub";
import { ActivityView } from "@/components/ActivityView";
import { PackStudio } from "@/components/PackStudio";
import { LessonScreen } from "@/components/LessonScreen";
import { VoiceLab } from "@/components/VoiceLab";
import { BigButton } from "@/components/ui";
import { ui } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

/**
 * One route, one static page.
 *
 * The game is exported as files, so instead of a route per theme (which could
 * never include a category the tutor installs later) every screen is a hash
 * screen: `#/`, `#/theme/<id>`, `#/theme/<id>/<activity>`, `#/pack`, `#/voices`.
 * The splash screen comes first, exactly like the adult games.
 */
export default function Page() {
  return (
    <SettingsProvider>
      <SayTheWord />
    </SettingsProvider>
  );
}

function SayTheWord() {
  const route = useRoute();
  const catalogue = useCatalogue();
  const s = useSettings();
  // A deep link (someone shared /#/theme/pets, or a refresh) skips the splash.
  const [phase, setPhase] = useState<"splash" | "app">(() =>
    typeof window !== "undefined" && window.location.hash.replace(/^#\/?/, "") ? "app" : "splash",
  );

  useEffect(() => {
    // Keep the tab title in step with the language the tutor is teaching in.
    document.documentElement.lang = s.target;
  }, [s.target]);

  useEffect(() => {
    // Lesson plans the tutor pasted in from an external AI live in localStorage;
    // re-attach them on boot so 📚 Lesson plan shows their own plan, not the one
    // WordPop writes. Categories need no re-attach — they are read live.
    reinstallSavedLessons();
  }, []);

  useEffect(() => {
    // A hash link — pasted, shared, or the browser's back button — leaves the
    // splash without needing the Play button.
    const onHash = () => {
      if (window.location.hash.replace(/^#\/?/, "")) setPhase("app");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (phase === "splash") {
    return (
      <Splash
        stats={{
          themes: catalogue.themes.length,
          words: catalogue.words,
          categories: catalogue.categories.length,
          languages: LANGS.length,
        }}
        onPlay={() => {
          setPhase("app");
          navigate(href.home);
        }}
        onPack={() => {
          setPhase("app");
          navigate(href.pack);
        }}
        onVoices={() => {
          setPhase("app");
          navigate(href.voices);
        }}
        copy={{
          title: "WordPop",
          emoji: "🗣️",
          tagline: `${catalogue.categories.length} topic areas · ${catalogue.themes.length} themes · ${catalogue.words} words in ${LANGS.length} languages — read-aloud, chants, quizzes, matching and talk time.`,
          chips: [
            { icon: "🔤", label: "Ages 3–6" },
            { icon: "🌍", label: "EN · 中文 · FR · IT · DE · TR" },
            { icon: "🗣️", label: "Natural read-aloud voices" },
            { icon: "🎵", label: "Chants & clap-along" },
            { icon: "⭐", label: "Stars per learner" },
            { icon: "🤖", label: "AI prompt → new categories" },
          ],
          floaters: ["🗣️", "🔤", "🎵", "🧩", "⭐", "👂", "🌈", "🧸"],
          howTo: [
            "Pick a learner (or play as Guest) — stars are saved per learner on this device.",
            "Choose a topic area, then a theme, then one of six activities: Learn, Chant, Quiz, Match, Memory or Touch it!",
            "Every card reads the word aloud. Tap the card or 🔊 to hear it again, 🐢 for the slow voice.",
            "Talk time (💬) gives you concept-checking questions in the target language — great for screen-shared lessons.",
            "Teaching a real lesson? 📚 Lesson plan turns any topic into a timed plan — the words to say out loud, the questions to ask and what to expect back — and 📋 AI Prompt & JSON can generate one with any external AI.",
            "Set the support language (Tutor ▸ support) to show a second language underneath: perfect for bilingual kids.",
            "Need a new topic that is not here? Open 📋 AI Prompt & JSON, copy the prompt into ChatGPT/Claude and paste the JSON back — the whole category appears instantly.",
          ],
          playLabel: "▶ Play — Pick a Learner",
        }}
      />
    );
  }

  const theme = route.name === "theme" || route.name === "activity" ? themeIn(catalogue, route.themeId) : undefined;

  return (
    <>
      <TutorBar />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-6">
        {route.name === "home" && <Home />}
        {route.name === "pack" && <PackStudio />}
        {route.name === "voices" && <VoiceLab />}
        {route.name === "lesson" && <LessonScreen themeId={route.themeId} />}
        {(route.name === "theme" || route.name === "activity") &&
          (theme ? (
            route.name === "theme" ? <ThemeHub theme={theme} /> : <ActivityView theme={theme} activity={route.activity} />
          ) : (
            <div className="card-soft mx-auto max-w-xl px-6 py-10 text-center">
              <div className="text-6xl">🧐</div>
              <h1 className="font-display mt-3 text-3xl font-bold">That topic is not here</h1>
              <p className="mt-2 text-lg text-ink-soft">
                The link may point at a category that has since been removed from this device.
              </p>
              <div className="mt-4 flex justify-center">
                <BigButton tone="sky" href={href.home}>← {ui(s.target, "pickTheme")}</BigButton>
              </div>
            </div>
          ))}
      </main>
    </>
  );
}
