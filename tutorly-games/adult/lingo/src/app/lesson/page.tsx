"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { lessonById, LESSON_TEMPLATES } from "@/content/units";
import { buildLessonExercises, exercisesPerLesson } from "@/lib/lesson-engine";
import LessonPlayer from "@/components/LessonPlayer";
import { useContent } from "@/lib/content-provider";
import { useStore } from "@/lib/store";
import { Mascot } from "@/components/ui";

function LessonScreen() {
  const params = useSearchParams();
  const { pack, loading } = useContent();
  const { state } = useStore();
  const lessonId = parseInt(params.get("lesson") || "1", 10);

  const plan = useMemo(() => lessonById(pack, lessonId), [pack, lessonId]);
  const [exercises, setExercises] = useState<ReturnType<typeof buildLessonExercises>>([]);

  useEffect(() => {
    if (!plan) {
      setExercises([]);
      return;
    }
    setExercises(buildLessonExercises(pack, plan, exercisesPerLesson(pack)));
  }, [pack, plan]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <Mascot size={100} message="Loading your course…" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-6xl">🚧</div>
        <h1 className="mt-4 text-2xl font-black text-slate-800">That lesson does not exist</h1>
        <p className="mt-2 text-slate-500">It may belong to a longer path than the loaded content provides.</p>
        <Link href="/" className="btn-3d mt-6 inline-block rounded-2xl border-[#46A302] bg-[#58CC02] px-6 py-3 font-black text-white">
          Back to the path
        </Link>
      </div>
    );
  }

  if (state.hearts <= 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-7xl">💔</div>
        <h1 className="mt-4 text-2xl font-black text-slate-800">You are out of hearts!</h1>
        <p className="mt-2 text-slate-500">Hearts refill every 30 minutes, or refill them with 50 gems on the home page.</p>
        <Link href="/" className="btn-3d mt-6 block rounded-2xl border-[#46A302] bg-[#58CC02] py-3 font-black text-white">
          Back home
        </Link>
      </div>
    );
  }

  if (!exercises.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-6xl">🗂️</div>
        <h1 className="mt-4 text-2xl font-black text-slate-800">No exercises for this lesson yet</h1>
        <p className="mt-2 text-slate-500">
          The loaded content pack has nothing the engine can turn into activities. Add vocabulary, grammar, idioms or
          conversations with the AI prompt.
        </p>
        <Link href="/prompt" className="btn-3d mt-6 block rounded-2xl border-[#46A302] bg-[#58CC02] py-3 font-black text-white">
          Open the AI content prompt
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <LessonPlayer
        exercises={exercises}
        lessonId={plan.id}
        lessonTitle={`Unit ${plan.unitId} · ${LESSON_TEMPLATES[plan.order - 1].title}`}
        accent="#58CC02"
        onExit={`/?unit=${plan.unitId}`}
      />
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-white">
          <Mascot size={100} message="Getting your lesson ready…" />
        </div>
      }
    >
      <LessonScreen />
    </Suspense>
  );
}
