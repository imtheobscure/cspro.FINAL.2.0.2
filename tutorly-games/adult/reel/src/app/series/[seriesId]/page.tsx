import Link from "next/link";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog, getEpisodeLites } from "@/lib/queries";
import { formatTime } from "@/modules/lessons/types";
import { Button, ProgressBar } from "@/components/ui";

export default async function SeriesPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  const { user } = await getCurrentUser();
  const catalog = await getCatalog();
  const s = catalog.series.find((x) => x.id === seriesId);
  if (!s) notFound();
  const course = catalog.courses.find((c) => c.id === s.courseId)!;
  const seasonsOf = catalog.seasons.filter((se) => se.seriesId === s.id);
  const lites = await getEpisodeLites(user.id, seasonsOf.map((se) => se.id));
  const all = seasonsOf.flatMap((se) => lites.get(se.id) ?? []);
  const next = all.find((e) => !e.completed) ?? all[0];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <nav className="text-xs text-zinc-400" aria-label="Breadcrumb">
        <Link href="/courses" className="hover:text-white">Courses</Link> › <Link href={`/courses/${course.id}`} className="hover:text-white">{course.title}</Link> › <span className="text-zinc-200">{s.title}</span>
      </nav>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{s.title}</h1>
          <p className="mt-2 max-w-3xl text-zinc-400">{s.description}</p>
          {next && (
            <Link href={`/watch/${next.id}`} className="mt-4 inline-block">
              <Button size="lg"><Play size={18} /> {next.progress > 0 ? `Continue E${next.episodeNumber}` : `Play E${next.episodeNumber}`}</Button>
            </Link>
          )}
        </div>
        <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">{s.thumbnail && <img src={s.thumbnail} alt="" className="h-full w-full object-cover" />}</div>
      </div>

      {seasonsOf.map((se) => {
        const eps = lites.get(se.id) ?? [];
        return (
          <section key={se.id} className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold">Season {se.seasonNumber} · {se.title}</h2>
                <p className="text-sm text-zinc-400">{se.description}</p>
              </div>
              <span className="text-xs text-zinc-500">{eps.filter((e) => e.completed).length}/{eps.length} completed</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {eps.map((e) => (
                <Link key={e.id} href={`/watch/${e.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/25">
                  <div className="relative aspect-video bg-zinc-900">
                    {e.thumbnail && <img src={e.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}
                    <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100"><Play size={34} /></div>
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 text-[11px]">E{e.episodeNumber}</span>
                    <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 text-[11px]">{formatTime(e.duration)}</span>
                    {e.completed && <span className="absolute right-2 top-2 rounded bg-emerald-500/80 px-1.5 text-[11px] font-semibold">✓</span>}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold">{e.title}</div>
                    <div className="mt-1 flex gap-1 text-[10px]">
                      {e.hasSubtitles ? <span className="rounded bg-white/10 px-1.5 py-0.5">CC · transcript</span> : <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-500">no transcript</span>}
                      {e.hasLesson && <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-fuchsia-200">Lesson</span>}
                    </div>
                    <ProgressBar value={e.progress} className="mt-2" height={4} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
