"use client";

import { useEffect, useState } from "react";
import { THEMES, TOTAL_WORDS, UNITS } from "@/lib/data";
import { LANGS } from "@/lib/data/types";
import { reinstallSavedLessons, reinstallSavedPacks } from "@/lib/customPack";
import { href, navigate, useRoute } from "@/lib/route";
import { Splash } from "@/lib/shell";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { LessonScreen } from "@/components/screens/LessonScreen";
import { PackStudio } from "@/components/screens/PackStudio";
import { PlayScreen } from "@/components/screens/PlayScreen";
import { TeacherScreen } from "@/components/screens/TeacherScreen";
import { VoiceLab } from "@/components/screens/VoiceLab";

/**
 * One route, one static page.
 *
 * LearnLoop is exported as files, so instead of a route per screen every screen
 * is a hash screen: `#/`, `#/play`, `#/teacher`, `#/pack`, `#/voices`. The splash
 * screen comes first, exactly like every adult Tutorly game, and the tutor's
 * saved themes are put back into the library before anything renders.
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
    const plans = reinstallSavedLessons();
    if (words || plans) setVersion((v) => v + 1);
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
        onLesson={() => {
          setPhase("app");
          navigate(href.lesson());
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
          title: "LearnLoop",
          emoji: "🔁",
          tagline: `${THEMES.length} themes · ${UNITS.length} units · ${TOTAL_WORDS} illustrated words in ${LANGS.length} languages — eleven tutor-led modes, from flashcards and chants to drag-&-drop and talk time.`,
          chips: [
            { icon: "🔤", label: "Ages 3–6" },
            { icon: "🌍", label: "EN · 中文 · FR · IT · DE · TR" },
            { icon: "🎙️", label: "Natural kid voices" },
            { icon: "💬", label: "CCQ talk time" },
            { icon: "↔️", label: "Opposites & sorting" },
            { icon: "📚", label: "Timed lesson plans" },
            { icon: "🤖", label: "AI prompt → new themes" },
          ],
          floaters: ["🃏", "💬", "🧲", "🂠", "🗂️", "🎵", "🔢", "🔤"],
          howTo: [
            "Press Play, then choose the language you speak and the language the child is learning.",
            "Pick a theme in the left dock, then one or more units (or hand-pick single words).",
            "Choose a mode along the top: Learn, Talk, Listen, Quiz, Match, Memory, Sort, Opposites, Chant, Count, ABC.",
            "Everything is read aloud in the child's language — plus yours, when you keep both languages on.",
            "The Tutor panel (📊) keeps each child's stars and quiz results.",
            "Teaching from a plan? Open 📚 Lesson plan — every unit already has a timed one, with the tutor's script and CCQs; paste your own from 📋 AI Prompt & JSON.",
            "Need a theme that is not here? Open 📋 AI Prompt & JSON, copy the prompt into ChatGPT/Claude and paste the JSON back — the theme appears instantly.",
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
      {route.name === "lesson" && <LessonScreen unitId={route.unitId} />}
      {route.name === "teacher" && <TeacherScreen />}
      {route.name === "pack" && <PackStudio />}
      {route.name === "voices" && <VoiceLab />}
    </>
  );
}
