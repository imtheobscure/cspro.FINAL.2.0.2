import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog, getEpisodeLites } from "@/lib/queries";
import { CEFR_COLORS, Pill, ProgressBar, SectionTitle } from "@/components/ui";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { user } = await getCurrentUser();
  const catalog = await getCatalog();
  const course = catalog.courses.find((c) => c.id === courseId);
  if (!course) notFound();
  const seriesList = catalog.series.filter((s) => s.courseId === course.id);
  const lites = await getEpisodeLites(user.id, catalog.seasons.filter((se) => seriesList.some((s) => s.id === se.seriesId)).map((se) => se.id));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <nav className="text-xs text-zinc-400" aria-label="Breadcrumb">
        <Link href="/courses" className="hover:text-white">Courses</Link> › <span className="text-zinc-200">{course.title}</span>
      </nav>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill color={CEFR_COLORS[course.level]}>{course.level}</Pill>
        <Pill color="#94a3b8">{course.language} → {course.targetLanguage}</Pill>
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-tight">{course.title}</h1>
      <p className="mt-2 max-w-3xl text-zinc-400">{course.description}</p>

      <div className="mt-10">
        <SectionTitle>Series</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {seriesList.map((s) => {
            const seasonsOf = catalog.seasons.filter((se) => se.seriesId === s.id);
            const eps = seasonsOf.flatMap((se) => lites.get(se.id) ?? []);
            const done = eps.filter((e) => e.completed).length;
            return (
              <Link key={s.id} href={`/series/${s.id}`} className="group flex gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/25">
                <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-2xl bg-zinc-900">{s.thumbnail && <img src={s.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">{s.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{s.description}</p>
                  <p className="mt-2 text-xs text-zinc-500">{seasonsOf.length} season{seasonsOf.length === 1 ? "" : "s"} · {eps.length} episodes · {done} completed</p>
                  <ProgressBar value={eps.length ? (done / eps.length) * 100 : 0} className="mt-2" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
