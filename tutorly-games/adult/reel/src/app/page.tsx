import Link from "next/link";
import { Flame, Play, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog, getContinueWatching, getEpisodeLites, getLearnerDashboard } from "@/lib/queries";
import { formatTime } from "@/modules/lessons/types";
import { Button, Card, CEFR_COLORS, Pill, ProgressBar, SectionTitle, Stat } from "@/components/ui";

export default async function HomePage() {
  const { user, profile } = await getCurrentUser();
  const [catalog, continueWatching, dash] = await Promise.all([getCatalog(), getContinueWatching(user.id), getLearnerDashboard(user.id)]);
  const lites = await getEpisodeLites(user.id, catalog.seasons.map((s) => s.id));
  const allEpisodes = catalog.seasons.flatMap((s) => lites.get(s.id) ?? []);
  const featured = allEpisodes.find((e) => e.hasLesson) ?? allEpisodes[0];
  const featuredRow = catalog.episodes.find((e) => e.id === featured?.id);
  const completedEpisodes = allEpisodes.filter((e) => e.completed).length;
  const levelInto = profile.xp % 500;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 sm:px-6">
      {/* Hero */}
      {featured && featuredRow && (
        <section className="hero-glow relative mt-4 overflow-hidden rounded-3xl border border-white/10">
          <div className="absolute inset-0 -z-10">
            {featuredRow.poster && <img src={featuredRow.poster} alt="" className="h-full w-full object-cover opacity-40" />}
            <div className="absolute inset-0 bg-gradient-to-r from-[#08080c] via-[#08080c]/80 to-transparent" />
          </div>
          <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill color="#f472b6">Featured video lesson</Pill>
                <Pill color={CEFR_COLORS[profile.cefrLevel]}>{profile.cefrLevel}</Pill>
                <Pill color="#94a3b8">{formatTime(featured.duration)}</Pill>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{featuredRow.title}</h1>
              <p className="mt-3 max-w-xl text-sm text-zinc-300 sm:text-base">{featuredRow.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/watch/${featured.id}`}>
                  <Button size="lg">
                    <Play size={18} /> {featured.progress > 0 && !featured.completed ? "Continue" : "Start learning"}
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button size="lg" variant="outline">Browse courses</Button>
                </Link>
              </div>
              {featured.progress > 0 && <ProgressBar value={featured.progress} className="mt-4 max-w-sm" />}
            </div>
            <div className="grid grid-cols-2 gap-3 self-end">
              <Stat label="Level" value={`Lv ${profile.level}`} hint={`${levelInto}/500 XP to next`} icon="⭐" />
              <Stat label="Daily streak" value={`${dash.streak?.currentDaily ?? 0}d`} hint={`best ${dash.streak?.longestDaily ?? 0}`} icon={<Flame className="text-orange-400" />} />
              <Stat label="Words saved" value={dash.vocab.length} hint={`${dash.dueVocab.length} due for review`} icon="📚" />
              <Stat label="Badges" value={dash.earned.length} hint={`of ${dash.allBadges.length}`} icon="🏅" />
            </div>
          </div>
        </section>
      )}

      {/* Review + continue */}
      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle sub="Spaced repetition keeps yesterday's words alive.">Review queue</SectionTitle>
          {dash.dueVocab.length ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {dash.dueVocab.slice(0, 8).map((v) => (
                  <span key={v.id} className="rounded-lg bg-fuchsia-500/15 px-2 py-1 text-xs text-fuchsia-100">{v.word}</span>
                ))}
              </div>
              <Link href="/vocabulary" className="mt-4 inline-block"><Button size="sm"><Sparkles size={14} /> Review {dash.dueVocab.length} words</Button></Link>
            </>
          ) : (
            <p className="text-sm text-zinc-400">Nothing due right now. Save words while you watch and they'll show up here.</p>
          )}
          {dash.grammar.filter((g) => g.status === "needsReview").length > 0 && (
            <p className="mt-4 text-xs text-zinc-400">Grammar to revisit: {dash.grammar.filter((g) => g.status === "needsReview").map((g) => g.name).join(", ")}</p>
          )}
        </Card>
        <div className="lg:col-span-2">
          <SectionTitle sub="Pick up exactly where you left off.">Continue watching</SectionTitle>
          {continueWatching.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {continueWatching.map(({ progress, episode, season, series }) => (
                <Link key={episode.id} href={`/watch/${episode.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/25">
                  <div className="relative aspect-video bg-zinc-900">
                    {episode.thumbnail && <img src={episode.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}
                    <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100"><Play className="text-white" size={36} /></div>
                    <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 text-[11px]">Resume {formatTime(progress.position)}</span>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20"><div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${progress.percentage}%` }} /></div>
                  </div>
                  <div className="p-3">
                    <div className="text-[11px] text-zinc-400">{series.title} · S{season.seasonNumber} E{episode.episodeNumber}</div>
                    <div className="font-semibold">{episode.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Card><p className="text-sm text-zinc-400">You haven't started an episode yet. Everything you watch will be resumable from here.</p></Card>
          )}
        </div>
      </section>

      {/* Courses */}
      <section className="mt-12">
        <SectionTitle sub="Video-first courses organised as series → seasons → episodes." action={<Link href="/courses" className="text-sm text-violet-300 hover:underline">All courses →</Link>}>Courses</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalog.courses.map((c) => {
            const seriesCount = catalog.series.filter((s) => s.courseId === c.id).length;
            return (
              <Link key={c.id} href={`/courses/${c.id}`} className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:border-white/25">
                <div className="relative aspect-[16/7] bg-zinc-900">{c.thumbnail && <img src={c.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}<div className="absolute inset-0 bg-gradient-to-t from-[#08080c] to-transparent" /></div>
                <div className="-mt-10 relative p-5">
                  <div className="flex gap-2"><Pill color={CEFR_COLORS[c.level]}>{c.level}</Pill><Pill color="#94a3b8">{c.language} → {c.targetLanguage}</Pill></div>
                  <h3 className="mt-2 text-xl font-bold">{c.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{c.description}</p>
                  <p className="mt-3 text-xs text-zinc-500">{seriesCount} series · {completedEpisodes}/{allEpisodes.length} episodes completed</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Episodes */}
      <section className="mt-12">
        <SectionTitle sub="Every episode carries subtitles, transcript, chapters and a timestamped lesson.">Episodes</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {allEpisodes.map((e) => (
            <Link key={e.id} href={`/watch/${e.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/25">
              <div className="relative aspect-video bg-zinc-900">
                {e.thumbnail && <img src={e.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 text-[11px]">{formatTime(e.duration)}</span>
                {e.completed && <span className="absolute left-2 top-2 rounded bg-emerald-500/80 px-1.5 text-[11px] font-semibold">Completed</span>}
                {e.progress > 0 && <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20"><div className="h-full bg-violet-400" style={{ width: `${e.progress}%` }} /></div>}
              </div>
              <div className="p-3">
                <div className="text-[11px] text-zinc-400">Episode {e.episodeNumber}</div>
                <div className="font-semibold">{e.title}</div>
                <div className="mt-1 flex gap-1 text-[10px]">
                  {e.hasSubtitles && <span className="rounded bg-white/10 px-1.5 py-0.5">CC</span>}
                  {e.hasLesson ? <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-fuchsia-200">Lesson ready</span> : <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-400">Generate lesson</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
