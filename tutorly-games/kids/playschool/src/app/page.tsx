"use client";

import { useEffect, useState } from "react";
import { THEMES, TOTAL_WORDS, UNITS } from "@/lib/data";
import { LANGS } from "@/lib/data/types";
import { reinstallSavedLessons, reinstallSavedPacks } from "@/lib/customPack";
import { href, navigate, useRoute } from "@/lib/route";
import { Splash } from "@/lib/shell";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { PackStudio } from "@/components/screens/PackStudio";
import { PlayScreen } from "@/components/screens/PlayScreen";
import { TeacherScreen } from "@/components/screens/TeacherScreen";
import { VoiceLab } from "@/components/screens/VoiceLab";

/**
 * One route, one static page.
 *
 * PlaySchool is exported as files, so instead of a route per screen every screen
 * is a hash screen: `#/`, `#/play`, `#/teacher`, `#/pack`, `#/voices`. The splash
 * screen comes first, exactly like every adult Tutorly game, and the tutor's
 * saved themes and pasted lesson plans are put back into the library before
 * anything renders.
 */
export default function Page() {
  const route = useRoute();
  // A deep link (a shared /#/play, or a refresh) skips the splash.
  const [phase, setPhase] = useState<"splash" | "app">(() =>
    typeof window !== "undefined" && window.location.hash.replace(/^#\/?/, "") ? "app" : "splash",
  );
  // Re-render the counts after saved packs are re-installed from localStorage.
  const [, setVersion] = useState(0);

  useEffect(() => {
    const words = reinstallSavedPacks();
    const lessons = reinstallSavedLessons();
    if (words || lessons) setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    // A hash link — pasted, shared, or the browser's back button — leaves the splash.
    const onHash = () => {
      if (window.location.hash.replace(/^#\/?/, "")) setPhase("app");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (phase === "splash") {
    return (
      <Splash
        stats={{ themes: THEMES.length, words: TOTAL_WORDS, categories: UNITS.length, languages: LANGS.length }}
        onPlay={() => {
          setPhase("app");
          navigate(href.play);
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
          title: "PlaySchool",
          emoji: "🛝",
          tagline: `${THEMES.length} themes · ${UNITS.length} units · ${TOTAL_WORDS} illustrated first words in ${LANGS.length} languages — letters, phonics, numbers, counting and ten playground games for ages 3–6.`,
          chips: [
            { icon: "🧒", label: "Ages 3–6" },
            { icon: "🌍", label: "EN · 中文 · FR · IT · DE · TR" },
            { icon: "🔤", label: "Letters & phonics" },
            { icon: "🔢", label: "Numbers & counting" },
            { icon: "✍️", label: "Sand-tray tracing" },
            { icon: "🎙️", label: "Natural kid voices" },
            { icon: "📚", label: `${UNITS.length} lesson plans` },
            { icon: "🤖", label: "AI prompt → new themes & lessons" },
          ],
          floaters: ["🛝", "🎈", "⚽", "🧸", "🪁", "🔤", "🔢", "🖍️"],
          howTo: [
            "Press Play, then choose the language you speak and the language the child is learning.",
            "Pick a theme in the left dock, then one or more units — letters, numbers, pets, food, feelings and more.",
            "Choose a game along the top: Lesson, Sand Tracing, Echo Monsters, Word Smoothie, Magic Camera Hunt, Face Mirror, Charades, Sentence Train, Dollhouse or Dressing Room.",
            "Everything is read aloud in the child's language — plus yours, when you keep both languages on.",
            "The Tutor panel (📊) keeps each child's stars, quiz results and saved lesson plans.",
            "Open 📚 Lesson mode for a full timed plan with your script — or use 📋 AI Prompt & JSON to have an AI write a brand-new theme or a bespoke lesson plan and paste it straight in.",
          ],
          playLabel: "▶ Play — start the lesson",
        }}
      />
    );
  }

  return (
    <>
      {route.name === "home" && <HomeScreen />}
      {route.name === "play" && <PlayScreen />}
      {route.name === "teacher" && <TeacherScreen />}
      {route.name === "pack" && <PackStudio />}
      {route.name === "voices" && <VoiceLab />}
    </>
  );
}
