import Link from "next/link";
import { desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { episodes, videoLessons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLearnerDashboard } from "@/lib/queries";
import { ACTIVITY_META, lessonActivityCount } from "@/modules/lessons/types";
import { Card, CEFR_COLORS, Pill, ProgressBar, SectionTitle } from "@/components/ui";

export default async function LessonsPage() {
  const { user } = await getCurrentUser();
  const rows = await db
    .select({ lesson: videoLessons, episode: episodes })
    .from(videoLessons)
    .leftJoin(episodes, eq(episodes.id, videoLessons.episodeId))
    .where(or(isNull(videoLessons.forUserId), eq(videoLessons.forUserId, user.id)))
    .orderBy(desc(videoLessons.updatedAt));
  const dash = await getLearnerDashboard(user.id);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <SectionTitle sub="Video lessons are stored as validated JSON and rendered by the lesson engine — activities fire at real timestamps inside the video.">Lessons</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ lesson, episode }) => {
          const progress = dash.lessons.find((l) => l.lesson.id === lesson.id)?.progress;
          const types = new Set(lesson.data.segments.flatMap((s) => s.activities.map((a) => a.type)));
          return (
            <Card key={lesson.id} className="flex flex-col">
              <div className="flex flex-wrap gap-1.5">
                <Pill color={CEFR_COLORS[lesson.cefrLevel]}>{lesson.cefrLevel}</Pill>
                <Pill color="#94a3b8">{lesson.generatedBy === "ai" ? "AI" : lesson.generatedBy === "rules" ? "Transcript rules" : "Curated"}</Pill>
                {lesson.forUserId && <Pill color="#f472b6">Personal</Pill>}
                <Pill color="#fbbf24">{lesson.lessonType}</Pill>
              </div>
              <h2 className="mt-2 text-lg font-bold leading-tight">{lesson.title}</h2>
              <p className="mt-1 text-xs text-zinc-400">
                {lesson.data.segments.length} segments · {lessonActivityCount(lesson.data)} activities · {Math.round(lesson.estimatedDurationSeconds / 60)} min
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {Array.from(types).slice(0, 12).map((t) => (
                  <span key={t} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-300" title={ACTIVITY_META[t].label}>
                    {ACTIVITY_META[t].emoji} {ACTIVITY_META[t].label}
                  </span>
                ))}
              </div>
              <ul className="mt-3 list-disc space-y-0.5 pl-4 text-xs text-zinc-400">
                {lesson.data.objectives.slice(0, 3).map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <div className="mt-auto pt-4">
                {progress && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
                    <ProgressBar value={progress.percentage} className="flex-1" /> {progress.percentage}% · {progress.xp} XP
                  </div>
                )}
                {episode ? (
                  <Link href={`/watch/${episode.id}`} className="text-sm font-semibold text-violet-300 hover:underline">
                    Open with “{episode.title}” →
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-500">Standalone lesson</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
