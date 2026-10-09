"use client";

import { useEffect, useState } from "react";
import { SUBTHEMES, THEMES, WORD_COUNT } from "@/data/dictionary";
import { LANGS } from "@/data/languages";
import { reinstallSavedLessons, reinstallSavedPacks } from "@/lib/customPack";
import { href, navigate, useRoute } from "@/lib/route";
import { Splash } from "@/lib/shell";
import { HomeClient } from "@/components/HomeClient";
import { PackStudio } from "@/components/screens/PackStudio";
import { StudioScreen } from "@/components/screens/StudioScreen";
import { LessonScreen } from "@/components/screens/LessonScreen";
import { VoiceLab } from "@/components/screens/VoiceLab";

/**
 * One route, one static page.
 *
 * The old build was a server component reading Postgres, with `/studio` as a
 * second route. The static build is one file with hash screens — `#/`,
 * `#/studio?theme=…`, `#/pack`, `#/voices` — so the Game Hub can serve it from a
 * folder, and the tutor's saved themes are back in the dictionary before anything
 * renders.
 */
export default function Page() {
  const route = useRoute();
  const [phase, setPhase] = useState<"splash" | "app">(() =>
    typeof window !== "undefined" && window.location.hash.replace(/^#\/?/, "") ? "app" : "splash",
  );
  const [, setVersion] = useState(0);

  useEffect(() => {
    const words = reinstallSavedPacks();
    // Lesson plans the tutor pasted in from an external AI live in localStorage;
    // re-attach them on boot so 📚 Lesson plan shows their own plan, not the one
    // BiliBuddies writes. Themes need no re-attach — they are read live.
    reinstallSavedLessons();
    if (words) setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.replace(/^#\/?/, "")) setPhase("app");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (phase === "splash") {
    return (
      <Splash
        stats={{ themes: THEMES.length, words: WORD_COUNT, categories: SUBTHEMES.length, languages: LANGS.length }}
        onPlay={() => {
          setPhase("app");
          navigate(href.studio());
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
          title: "BiliBuddies",
          emoji: "🧸",
          tagline: `${THEMES.length} themes · ${SUBTHEMES.length} subthemes · ${WORD_COUNT} words in ${LANGS.length} languages — flashcards, chants, quizzes, drag-&-drop, sorting baskets and CCQ talk time.`,
          chips: [
            { icon: "🧒", label: "Ages 3–6" },
            { icon: "🌍", label: "EN · 中文 · FR · IT · DE · TR" },
            { icon: "🎙️", label: "Natural kid voices" },
            { icon: "🎶", label: "Theme chants" },
            { icon: "🧺", label: "Sorting baskets" },
            { icon: "🤖", label: "AI prompt → new themes" },
          ],
          floaters: ["🃏", "🎯", "🧲", "🧺", "🎶", "💬", "🔤", "🔢"],
          howTo: [
            "Pick the language the child is learning, and (optionally) a bridge language to show underneath each card.",
            "Choose a child — stars and the lesson log are kept per child on this device.",
            "Tap a theme and a subtheme to land straight in the studio with the deck loaded.",
            "Use the rail on the right (or keys 1–8) to switch mode: Learn, Quiz, Match, Sort, Chant, Talk, ABC, Count.",
            "Space replays the word, S gives a star, R reshuffles, C hides the controls for a clean shared screen.",
            "New subject? Open 📋 AI Prompt & JSON, copy the prompt into ChatGPT/Claude and paste the JSON back.",
            "Teaching a real lesson? 📚 Lesson plan turns any word set into a timed plan — the words to say out loud, the theme's chant, the questions to ask and what to expect back — and 📋 AI Prompt & JSON can generate one with any external AI.",
          ],
          playLabel: "▶ Open the studio",
        }}
      />
    );
  }

  return (
    <>
      {route.name === "home" && <HomeClient />}
      {route.name === "studio" && <StudioScreen theme={route.theme} sub={route.sub} mode={route.mode} />}
      {route.name === "pack" && <PackStudio />}
      {route.name === "voices" && <VoiceLab />}
      {route.name === "lesson" && <LessonScreen setId={route.set} />}
    </>
  );
}
