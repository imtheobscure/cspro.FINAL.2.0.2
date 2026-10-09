"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { planUnits, totalUnits, totalLessons, lessonById, leagueForXp, LESSON_TEMPLATES, type LessonType } from "@/content/units";
import { isPackEmpty } from "@/content/tutolingo";
import { useContent } from "@/lib/content-provider";
import { useStore } from "@/lib/store";
import { lessonRefs } from "@/lib/lesson-refs";
import { REF_TAB_ICON, refHref } from "@/lib/ref-link";
import { PageShell, Mascot, ProgressBar, EmptyPackNotice, PackSummary, ContentStatus, APP_NAME } from "@/components/ui";
import { PwaHomeInstallCard } from "@/components/PwaBoot";

const UNITS_PER_SECTION = 10;

const TYPE_ICON: Record<LessonType, string> = {
  vocab: "📚",
  grammar: "📝",
  speaking: "🎤",
  idiom: "🎭",
  review: "🏆",
};

const TYPE_LABEL: Record<LessonType, string> = {
  vocab: "Vocabulary",
  grammar: "Grammar",
  speaking: "Listening & Speaking",
  idiom: "Idioms",
  review: "Review",
};

const ENCOURAGE = [
  "Let's crush today! 🔥",
  "One step every day! 🚀",
  "You've got this! 💪",
  "Keep going, champion! ⭐",
  "Your language is getting sharper! 🌟",
];

export default function HomePage() {
  const { pack, loading } = useContent();
  const { state, claimQuest, buyFreeze, update } = useStore();
  const router = useRouter();
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [resumed, setResumed] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [section, setSection] = useState(0);
  const [jump, setJump] = useState("");

  const unitsCount = totalUnits(pack);
  const lessonsCount = totalLessons(pack);
  const empty = isPackEmpty(pack);

  const firstIncomplete = useMemo(() => {
    const done = new Set(state.completedLessons);
    for (let id = 1; id <= lessonsCount; id++) if (!done.has(id)) return id;
    return 1;
  }, [state.completedLessons, lessonsCount]);

  /**
   * "Where I left off": a lesson the learner was in the middle of wins over the
   * next untouched one, so Continue (and the Gaming Hub deep link) reopens it at
   * the exact exercise they stopped on.
   */
  const inProgress = state.lessonProgress;
  const resumeId = useMemo(() => {
    if (
      inProgress &&
      inProgress.lessonId <= lessonsCount &&
      !state.completedLessons.includes(inProgress.lessonId)
    ) {
      return inProgress.lessonId;
    }
    return firstIncomplete;
  }, [inProgress, state.completedLessons, firstIncomplete]);
  const resumeProgress = inProgress && inProgress.lessonId === resumeId ? inProgress : null;

  const currentUnit = Math.floor((firstIncomplete - 1) / 7) + 1;
  const allDone = lessonsCount > 0 && state.completedLessons.length >= lessonsCount;

  /** The lesson a “Continue” link (or a deep link from the gaming hub) should open. */
  const nextPlan = useMemo(() => lessonById(pack, resumeId), [pack, resumeId]);
  const activePlan = useMemo(
    () => (activeLesson != null ? lessonById(pack, activeLesson) : undefined),
    [pack, activeLesson],
  );
  const activeRefs = useMemo(() => (activePlan ? lessonRefs(pack, activePlan) : []), [pack, activePlan]);
  const continueHref = `/lesson?lesson=${resumeId}`;

  // `?continue=1` (or `?resume=1`) — used by the Gaming Hub tile — drops the
  // learner straight into the next unfinished lesson instead of the path.
  useEffect(() => {
    if (loading || empty || resumed) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("continue") !== "1" && q.get("resume") !== "1") return;
    setResumed(true);
    router.replace(continueHref);
  }, [loading, empty, resumed, router, continueHref]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("unit");
    if (p) setSection(Math.floor((parseInt(p, 10) - 1) / UNITS_PER_SECTION));
  }, []);
  useEffect(() => {
    setSection(Math.floor((currentUnit - 1) / UNITS_PER_SECTION));
  }, [currentUnit]);

  const units = useMemo(() => planUnits(pack, section * UNITS_PER_SECTION + 1, UNITS_PER_SECTION), [pack, section]);
  const totalSections = Math.max(1, Math.ceil(unitsCount / UNITS_PER_SECTION));
  const sectionUnit = units[0];

  const league = leagueForXp(state.xp);
  const encourage = useMemo(() => ENCOURAGE[Math.floor(Date.now() / 86400000) % ENCOURAGE.length], []);
  const completedCount = state.completedLessons.length;

  if (empty && !loading) {
    return (
      <PageShell>
        <ContentStatus />
        <PwaHomeInstallCard />
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
          <div className="card-light flex items-center gap-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
            <Mascot size={84} message={`Hi! I'm Tuto. Feed me a content file and we'll start learning! 🦉`} />
            <div className="flex-1">
              <h1 className="text-lg font-black text-slate-800">Welcome to {APP_NAME}!</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                This course is empty on purpose: everything comes from one AI-generated content file. Drop that file in
                the box below and the path fills itself in.
              </p>
              <Link href="/prompt" className="mt-3 inline-block text-xs font-black text-[#1CB0F6]">
                No file yet? Build one from your own PDF with the AI prompt 🤖
              </Link>
            </div>
          </div>
          <div className="card-light rounded-3xl border-2 border-slate-200 bg-white p-4">
            <p className="font-black text-slate-800">🎯 Today&apos;s quests</p>
            <p className="mt-2 text-xs font-bold text-slate-400">Quests unlock with your first lesson.</p>
          </div>
        </div>

        <div className="mb-4 rounded-3xl border-2 border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-black text-slate-800">📦 Your content pack</h2>
          <PackSummary />
          <p className="mt-3 text-xs text-slate-400">
            Expected path length: {lessonsCount} lessons across {unitsCount} units.
          </p>
        </div>

        <EmptyPackNotice feature="course" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ContentStatus />
      <PwaHomeInstallCard />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="card-light flex items-center gap-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
          <Mascot size={84} message={encourage} />
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-800">Hello! What shall we learn today? 👋</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {completedCount.toLocaleString("en-US")} of {lessonsCount.toLocaleString("en-US")} lessons · {unitsCount.toLocaleString("en-US")} units ·
              current unit: {currentUnit}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={(completedCount / Math.max(1, lessonsCount)) * 100} />
              <span className="text-xs font-black text-slate-500">{((completedCount / Math.max(1, lessonsCount)) * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/lesson?lesson=${firstIncomplete}`} className="btn-3d rounded-xl border-[#46A302] bg-[#58CC02] px-5 py-2 text-sm font-black text-white">
                Continue learning ▶
              </Link>
              <Link href="/practice" className="btn-3d rounded-xl border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-500">
                ⚡ Quick practice
              </Link>
            </div>
          </div>
        </div>

        <div className="card-light rounded-3xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="font-black text-slate-800">🎯 Today&apos;s quests</p>
            <button onClick={() => setShowQuests(true)} className="text-xs font-bold text-blue-500">
              All
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {state.quests.slice(0, 3).map((q) => (
              <div key={q.id}>
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>{q.title}</span>
                  <span>
                    {q.progress}/{q.target}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#FFC800] transition-all" style={{ width: `${(q.progress / q.target) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowShop(true)} className="btn-3d mt-3 w-full rounded-xl border-[#d33131] bg-[#FF4B4B] py-2 text-sm font-black text-white">
            🛒 Shop
          </button>
        </div>
      </div>

      {state.mistakes.filter((m) => !m.resolved).length > 0 && (
        <Link
          href="/practice"
          className="mb-4 flex items-center gap-3 overflow-hidden rounded-3xl border-2 border-purple-200 bg-gradient-to-r from-purple-500 to-indigo-500 p-4 text-white shadow-lg"
        >
          <span className="animate-wiggle text-4xl">⏰</span>
          <div className="flex-1">
            <p className="font-black">Time to review!</p>
            <p className="text-xs opacity-90">Your mistakes and weak words are waiting — practice them with spaced repetition.</p>
          </div>
          <span className="rounded-xl bg-white/20 px-4 py-2 text-sm font-black">Start ▶</span>
        </Link>
      )}

      <Link href="/leaderboard" className="mb-4 flex items-center gap-3 rounded-3xl border-2 border-slate-200 bg-white p-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl text-2xl" style={{ background: league.color + "22" }}>
          🏆
        </span>
        <div className="flex-1">
          <p className="text-sm font-black text-slate-800">
            {league.name} League · {state.xpToday} XP today
          </p>
          <p className="text-xs text-slate-400">The top 10 learners get promoted — check your rank.</p>
        </div>
        <span className="text-slate-300">▶</span>
      </Link>

      {/* Continue where you left off — also where the Gaming Hub deep link lands. */}
      {!allDone && nextPlan && (
        <Link
          href={continueHref}
          className="card-light mb-4 flex items-center gap-3 rounded-3xl border-2 border-[#58CC02] bg-[#F5FFEC] p-3"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#58CC02] text-2xl text-white shadow-[0_3px_0_#46A302]">
            ▶
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800">
              {resumeProgress ? "Pick up where you stopped" : "Continue where you left off"}
            </p>
            <p className="truncate text-xs text-slate-500">
              Unit {nextPlan.unitId} · {LESSON_TEMPLATES[nextPlan.order - 1].title} · lesson {nextPlan.id} of {lessonsCount}
              {resumeProgress ? ` · question ${resumeProgress.index + 1} of ${resumeProgress.total}` : ""}
            </p>
          </div>
          <span className="hidden shrink-0 rounded-xl bg-[#58CC02] px-3 py-2 text-xs font-black text-white sm:block">
            {resumeProgress ? "Resume ▶" : "Continue ▶"}
          </span>
        </Link>
      )}
      {allDone && (
        <Link
          href="/practice"
          className="card-light mb-4 flex items-center gap-3 rounded-3xl border-2 border-[#FFC800] bg-[#FFFBF0] p-3"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFC800] text-2xl shadow-[0_3px_0_#E0A800]">
            🏆
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800">Course finished — keep it sharp!</p>
            <p className="truncate text-xs text-slate-500">Practice your mistakes and review hard words.</p>
          </div>
        </Link>
      )}

      <div className="card-light mb-4 rounded-3xl border-2 border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setSection((x) => Math.max(0, x - 1))}
            disabled={section === 0}
            className="btn-3d rounded-xl border-slate-300 bg-white px-3 py-1.5 text-sm font-black text-slate-500 disabled:opacity-30"
          >
            ◀ Previous
          </button>
          <div className="text-center">
            <p className="text-sm font-black text-slate-800">
              Section {section + 1} of {totalSections} · units {section * UNITS_PER_SECTION + 1}–
              {Math.min(unitsCount, (section + 1) * UNITS_PER_SECTION)}
            </p>
            {sectionUnit && (
              <p className="text-[11px] font-bold text-slate-400">{sectionUnit.subtitle}</p>
            )}
          </div>
          <button
            onClick={() => setSection((x) => Math.min(totalSections - 1, x + 1))}
            disabled={section >= totalSections - 1}
            className="btn-3d rounded-xl border-slate-300 bg-white px-3 py-1.5 text-sm font-black text-slate-500 disabled:opacity-30"
          >
            Next ▶
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            placeholder={`Jump to unit (1–${unitsCount})`}
            inputMode="numeric"
            className="min-w-0 flex-1 basis-40 rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold outline-none focus:border-[#58CC02]"
          />
          <button
            onClick={() => {
              const n = parseInt(jump, 10);
              if (n >= 1 && n <= unitsCount) setSection(Math.floor((n - 1) / UNITS_PER_SECTION));
            }}
            className="btn-3d rounded-xl border-[#46A302] bg-[#58CC02] px-4 py-1.5 text-sm font-black text-white"
          >
            Go
          </button>
          <button
            onClick={() => setSection(Math.floor((currentUnit - 1) / UNITS_PER_SECTION))}
            className="btn-3d rounded-xl border-[#1899D6] bg-[#1CB0F6] px-3 py-1.5 text-sm font-black text-white"
          >
            📍 Current
          </button>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#58CC02] via-[#FFC800] to-[#FF4B4B]"
            style={{ width: `${((section + 1) / totalSections) * 100}%` }}
          />
        </div>
      </div>

      {units.map((unit) => (
        <section key={unit.id} className="mb-6">
          <div className="sticky top-[57px] z-30 rounded-2xl p-3 text-white shadow-md lg:top-[61px]" style={{ background: unit.color }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black">{unit.title}</h2>
                <p className="text-xs opacity-90">
                  {unit.subtitle} · {unit.lessons.length} lessons
                </p>
              </div>
              <Link href={`/lesson?lesson=${unit.lessons[0].id}`} className="btn-3d rounded-xl border-white/30 bg-white/20 px-3 py-1.5 text-xs font-black">
                Start 📖
              </Link>
            </div>
          </div>
          {/* pt reserves the space the lesson popup and the “Start here” bubble need,
              so they always open inside the unit card and never over its header. */}
          <div className="relative mx-auto flex max-w-md flex-col items-center gap-2 pb-8 pt-36">
            {unit.lessons.map((lesson, li) => {
              const done = state.completedLessons.includes(lesson.id);
              const crowns = state.crowns[lesson.id] || 0;
              const isCurrent = lesson.id === firstIncomplete;
              const offset = [0, -46, -70, -46, 0, 46, 70, 46][li % 8];
              const isReview = lesson.type === "review";
              return (
                <div
                  key={lesson.id}
                  className="relative flex flex-col items-center"
                  style={{ transform: `translateX(calc(${offset}px * var(--path-spread, 1)))` }}
                >
                  {isCurrent && !done && activeLesson !== lesson.id && (
                    <div className="animate-bounce-in absolute -top-11 z-10 whitespace-nowrap rounded-xl border-2 border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 shadow">
                      Start here 👇
                    </div>
                  )}
                  <button
                    onClick={() => setActiveLesson(activeLesson === lesson.id ? null : lesson.id)}
                    className={`path-node grid h-[72px] w-[72px] place-items-center rounded-full border-b-8 text-3xl ${done ? "" : isReview ? "bg-[#FFC800]" : "bg-white"} ${isCurrent && !done ? "animate-glow" : ""}`}
                    style={
                      done
                        ? { background: "#FFC800", borderColor: "#E0A800" }
                        : isReview
                          ? { borderColor: "#E0A800" }
                          : { borderColor: "#E5E7EB", background: isCurrent ? unit.color : "#fff" }
                    }
                    title={lesson.title}
                  >
                    <span className={done ? "" : "drop-shadow"}>{done ? "⭐" : TYPE_ICON[lesson.type]}</span>
                  </button>
                  {crowns > 0 && (
                    <span className="absolute -bottom-1 rounded-full bg-[#FFC800] px-1.5 text-[10px] font-black text-white shadow">
                      {"👑".repeat(Math.min(3, crowns))}
                      {crowns > 3 ? ` ${crowns}` : ""}
                    </span>
                  )}
                  {/* Lesson popup — kept compact and rendered ABOVE the lesson circle */}
                  {activeLesson === lesson.id && (
                    <div className="animate-pop-in absolute bottom-[78px] z-40 w-[min(17rem,calc(100vw-4.5rem))] rounded-2xl border-2 border-slate-200 bg-white p-2.5 text-center shadow-xl">
                      <p className="text-[11px] font-bold text-slate-400">
                        {TYPE_LABEL[lesson.type]} · Unit {unit.id} · {lesson.title}
                      </p>
                      {crowns > 0 && <p className="text-[11px] font-bold text-yellow-600">👑 Crown {crowns} of 5</p>}
                      <Link
                        href={`/lesson?lesson=${lesson.id}`}
                        className="btn-3d mt-1.5 block rounded-xl border-[#46A302] bg-[#58CC02] py-2 text-center text-sm font-black text-white"
                      >
                        {done ? "Practice again 🔁" : "Start +20 ⚡"}
                      </Link>
                      {activeRefs.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1 overflow-x-auto pb-0.5">
                          {activeRefs.slice(0, 4).map((r) => (
                            <Link
                              key={`${r.tab}:${r.key}`}
                              href={refHref(r.tab, r.key)}
                              title={`Study “${r.key}” in References`}
                              className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600 hover:bg-[#DDF4FF] hover:text-[#1899D6]"
                            >
                              {REF_TAB_ICON[r.tab]} {r.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="mb-6 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-black text-orange-500">🔥{state.streak}</p>
          <p className="text-[11px] font-bold text-slate-400">Day streak</p>
        </div>
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-black text-yellow-500">⚡{state.xp}</p>
          <p className="text-[11px] font-bold text-slate-400">Total XP</p>
        </div>
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-black text-green-600">📚{completedCount}</p>
          <p className="text-[11px] font-bold text-slate-400">Lessons completed</p>
        </div>
      </div>

      {showQuests && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setShowQuests(false)}>
          <div className="animate-pop-in w-full max-w-md rounded-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800">🎯 Today&apos;s quests</h3>
            <div className="mt-3 space-y-2">
              {state.quests.map((q) => {
                const full = q.progress >= q.target;
                return (
                  <div key={q.id} className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-3">
                    <span className="text-2xl">{q.kind === "xp" ? "⚡" : q.kind === "lessons" ? "📚" : "🔁"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-700">{q.title}</p>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#58CC02]" style={{ width: `${(q.progress / q.target) * 100}%` }} />
                      </div>
                    </div>
                    {q.completed ? (
                      <span className="text-xs font-black text-green-500">✓ Claimed</span>
                    ) : full ? (
                      <button onClick={() => claimQuest(q.id)} className="btn-3d rounded-xl border-[#46A302] bg-[#58CC02] px-3 py-1.5 text-xs font-black text-white">
                        Claim +{q.rewardGems}💎
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        {q.progress}/{q.target}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowQuests(false)} className="mt-3 w-full rounded-2xl py-2 font-bold text-slate-400">
              Close
            </button>
          </div>
        </div>
      )}

      {showShop && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setShowShop(false)}>
          <div className="animate-pop-in w-full max-w-md rounded-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800">🛒 Shop (balance: {state.gems} 💎)</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-3">
                <span className="text-3xl">❄️</span>
                <div className="flex-1">
                  <p className="text-sm font-black">Streak freeze</p>
                  <p className="text-xs text-slate-400">Miss one day without losing your streak.</p>
                </div>
                <button
                  onClick={() => {
                    if (buyFreeze()) window.alert("Streak freeze purchased! ❄️");
                    else window.alert("Not enough gems!");
                  }}
                  className="btn-3d rounded-xl border-[#1899D6] bg-[#1CB0F6] px-3 py-1.5 text-xs font-black text-white"
                >
                  200 💎
                </button>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-3">
                <span className="text-3xl">❤️</span>
                <div className="flex-1">
                  <p className="text-sm font-black">Refill hearts</p>
                  <p className="text-xs text-slate-400">Instantly refill all five hearts.</p>
                </div>
                <button
                  onClick={() =>
                    update((s) => (s.gems >= 50 ? { ...s, gems: s.gems - 50, hearts: 5, heartsRefillAt: 0 } : s))
                  }
                  className="btn-3d rounded-xl border-[#1899D6] bg-[#1CB0F6] px-3 py-1.5 text-xs font-black text-white"
                >
                  50 💎
                </button>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-3">
                <span className="text-3xl">⚡</span>
                <div className="flex-1">
                  <p className="text-sm font-black">Double XP (30 min)</p>
                  <p className="text-xs text-slate-400">Coming soon.</p>
                </div>
                <button disabled className="btn-3d rounded-xl border-slate-300 bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-400">
                  100 💎
                </button>
              </div>
            </div>
            <button onClick={() => setShowShop(false)} className="mt-3 w-full rounded-2xl py-2 font-bold text-slate-400">
              Close
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
