import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog, getEpisodeLites, getLearnerDashboard } from "@/lib/queries";
import { ACTIVITY_META, CEFR_LEVELS, type ActivityType } from "@/modules/lessons/types";
import { Card, CEFR_COLORS, Pill, ProgressBar, SectionTitle, Stat, cx } from "@/components/ui";

export default async function ProgressPage() {
  const { user, profile } = await getCurrentUser();
  const [catalog, dash] = await Promise.all([getCatalog(), getLearnerDashboard(user.id)]);
  const lites = await getEpisodeLites(user.id, catalog.seasons.map((s) => s.id));
  const allEps = catalog.seasons.flatMap((s) => lites.get(s.id) ?? []);
  const levelInto = profile.xp % 500;
  const skillAgg = new Map<string, { total: number; correct: number }>();
  for (const s of dash.skills) {
    const skill = ACTIVITY_META[s.type as ActivityType]?.skill ?? "comprehension";
    const cur = skillAgg.get(skill) ?? { total: 0, correct: 0 };
    skillAgg.set(skill, { total: cur.total + s.total, correct: cur.correct + s.correct });
  }
  const lessonMap = new Map(dash.lessons.map((l) => [l.lesson.id, l]));
  const currentLesson = dash.lessons.find((l) => l.progress.status === "in_progress");
  const weakGrammar = dash.grammar.filter((g) => g.status === "needsReview" || g.mastery < 40);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <SectionTitle sub="Your path through courses, series, episodes and skills — with CEFR progression, XP, streaks and review recommendations.">Learning path</SectionTitle>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Level" value={`Lv ${profile.level}`} hint={`${levelInto}/500 XP`} icon="⭐" />
        <Stat label="Total XP" value={profile.xp} hint={`${dash.attempts.total} activities · ${dash.attempts.total ? Math.round((dash.attempts.correct / dash.attempts.total) * 100) : 0}% correct`} icon="⚡" />
        <Stat label="Daily streak" value={`${dash.streak?.currentDaily ?? 0} days`} hint={`best ${dash.streak?.longestDaily ?? 0} · lessons ${dash.streak?.lessonStreak ?? 0}`} icon="🔥" />
        <Stat label="Episodes" value={`${allEps.filter((e) => e.completed).length}/${allEps.length}`} hint={`${dash.lessons.filter((l) => l.progress.status === "completed").length} lessons completed`} icon="🎬" />
      </div>

      {/* CEFR progression */}
      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">CEFR progression</h2>
          <Link href="/profile" className="text-xs text-violet-300 hover:underline">Change level</Link>
        </div>
        <div className="mt-3 flex gap-1">
          {CEFR_LEVELS.map((l) => {
            const idx = CEFR_LEVELS.indexOf(l);
            const cur = CEFR_LEVELS.indexOf(profile.cefrLevel as (typeof CEFR_LEVELS)[number]);
            return (
              <div key={l} className={cx("flex-1 rounded-xl border py-3 text-center text-sm font-bold", idx < cur ? "border-white/10 bg-white/5 text-zinc-400" : idx === cur ? "border-transparent text-black" : "border-white/5 text-zinc-600")} style={idx === cur ? { background: CEFR_COLORS[l] } : undefined}>
                {l}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-400">Lesson difficulty adapts within {profile.cefrLevel}; the level itself only changes when you decide to change it.</p>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Path */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-bold">Course path</h2>
          {catalog.series.map((s) => {
            const seasonsOf = catalog.seasons.filter((se) => se.seriesId === s.id);
            return (
              <Card key={s.id} className="mb-4">
                <div className="text-xs text-zinc-400">{catalog.courses.find((c) => c.id === s.courseId)?.title}</div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                {seasonsOf.map((se) => {
                  const eps = lites.get(se.id) ?? [];
                  return (
                    <div key={se.id} className="mt-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                        <span>Season {se.seasonNumber}</span>
                        <span>{eps.filter((e) => e.completed).length}/{eps.length}</span>
                      </div>
                      <ol className="relative space-y-2 border-l border-white/10 pl-4">
                        {eps.map((e) => {
                          const lesson = dash.lessons.find((l) => l.lesson.episodeId === e.id);
                          const state = e.completed ? "done" : e.progress > 0 || lesson ? "current" : "upcoming";
                          return (
                            <li key={e.id} className="relative">
                              <span className={cx("absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full", state === "done" ? "bg-emerald-400" : state === "current" ? "bg-violet-400 ring-4 ring-violet-400/30" : "bg-zinc-600")} />
                              <Link href={`/watch/${e.id}`} className="flex flex-wrap items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
                                <span className="text-sm font-semibold">E{e.episodeNumber} · {e.title}</span>
                                <span className="text-[11px] text-zinc-500">{state === "done" ? "Completed" : state === "current" ? "In progress" : "Upcoming"}</span>
                                {lesson && <Pill color="#f472b6">lesson {lesson.progress.percentage}%</Pill>}
                                <ProgressBar value={e.progress} className="ml-auto w-24" height={4} />
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  );
                })}
              </Card>
            );
          })}
        </div>

        {/* Skills + recommendations */}
        <div className="space-y-4">
          <Card>
            <h2 className="font-bold">Skills practised</h2>
            <div className="mt-3 space-y-2">
              {["listening", "speaking", "reading", "writing", "vocabulary", "grammar", "comprehension", "pronunciation"].map((skill) => {
                const s = skillAgg.get(skill);
                const pct = s && s.total ? Math.round((s.correct / s.total) * 100) : 0;
                return (
                  <div key={skill}>
                    <div className="flex justify-between text-xs"><span className="capitalize text-zinc-300">{skill}</span><span className="text-zinc-500">{s ? `${s.correct}/${s.total}` : "—"}</span></div>
                    <ProgressBar value={s ? Math.max(pct, s.total ? 8 : 0) : 0} height={5} color={pct >= 70 ? "#34d399" : pct >= 40 ? "#fbbf24" : "#fb7185"} />
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">Review recommendations</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {dash.dueVocab.length > 0 && <li>📚 <Link href="/vocabulary" className="text-violet-300 hover:underline">{dash.dueVocab.length} words due</Link> for spaced review.</li>}
              {weakGrammar.map((g) => (
                <li key={g.id}>🧠 Revisit <b>{g.name}</b> ({g.mastery}% mastery){g.sourceEpisodeId && <> — <Link href={`/watch/${g.sourceEpisodeId}`} className="text-violet-300 hover:underline">rewatch the scene</Link></>}</li>
              ))}
              {dash.weakActivities.slice(0, 4).map((w) => {
                const l = lessonMap.get(w.lessonId);
                return (
                  <li key={`${w.lessonId}-${w.activityId}`}>🎯 {ACTIVITY_META[w.type as ActivityType]?.label ?? w.type} “{w.activityId}” missed {w.wrong}× {l?.lesson.episodeId && <Link href={`/watch/${l.lesson.episodeId}`} className="text-violet-300 hover:underline">retry</Link>}</li>
                );
              })}
              {currentLesson && <li>▶ Continue <Link href={`/watch/${currentLesson.lesson.episodeId}`} className="text-violet-300 hover:underline">{currentLesson.lesson.title}</Link> ({currentLesson.progress.percentage}%).</li>}
              {!dash.dueVocab.length && !weakGrammar.length && !dash.weakActivities.length && !currentLesson && <li className="text-zinc-400">Nothing urgent — start the next episode to unlock new material with 20–30% built-in review.</li>}
            </ul>
          </Card>
          <Card>
            <h2 className="font-bold">Recent activity</h2>
            <ul className="mt-2 space-y-1.5 text-xs text-zinc-300">
              {dash.history.slice(0, 12).map((h) => (
                <li key={h.id} className="flex justify-between gap-2">
                  <span>
                    {h.type === "activity_attempt" && `${(h.payload as { correct?: boolean | null }).correct === false ? "✗" : "✓"} ${(h.payload as { type?: string }).type} · +${(h.payload as { points?: number }).points ?? 0} XP`}
                    {h.type === "vocab_saved" && `📚 saved “${(h.payload as { word?: string }).word}”`}
                    {h.type === "badge_earned" && `🏅 badge ${(h.payload as { badgeId?: string }).badgeId}`}
                    {h.type === "lesson_started" && `▶ started ${(h.payload as { title?: string }).title ?? "a lesson"}`}
                    {h.type === "lesson_completed" && `🏆 completed ${(h.payload as { title?: string }).title ?? "a lesson"}`}
                    {h.type === "review" && `🔁 review session`}
                  </span>
                  <span className="shrink-0 text-zinc-500">{h.createdAt.toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
