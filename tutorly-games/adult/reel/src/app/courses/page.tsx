import Link from "next/link";
import { getCatalog } from "@/lib/queries";
import { CEFR_COLORS, Pill, SectionTitle } from "@/components/ui";

export default async function CoursesPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <SectionTitle sub="Each course is a curated set of series. Lessons are generated per episode and personalised to your CEFR level.">Courses</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.courses.map((c) => {
          const s = catalog.series.filter((x) => x.courseId === c.id);
          const episodes = catalog.episodes.filter((e) => catalog.seasons.some((se) => se.id === e.seasonId && s.some((x) => x.id === se.seriesId))).length;
          return (
            <Link key={c.id} href={`/courses/${c.id}`} className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:border-white/25">
              <div className="relative aspect-[16/8] bg-zinc-900">
                {c.thumbnail && <img src={c.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}
                <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] to-transparent" />
              </div>
              <div className="relative -mt-8 p-5">
                <div className="flex gap-2">
                  <Pill color={CEFR_COLORS[c.level]}>{c.level}</Pill>
                  <Pill color="#94a3b8">{c.language} → {c.targetLanguage}</Pill>
                </div>
                <h2 className="mt-2 text-xl font-bold">{c.title}</h2>
                <p className="mt-1 text-sm text-zinc-400">{c.description}</p>
                <p className="mt-3 text-xs text-zinc-500">{s.length} series · {episodes} episodes</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
