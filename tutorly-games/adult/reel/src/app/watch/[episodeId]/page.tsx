import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { chapters, courses, episodes, lessonProgress, seasons, series, skipSegments, subtitleCues, subtitleTracks, subtitleWords, userPlayerPreferences, userStreaks, videoSources, vocabularyItems, watchProgress } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getEpisodeLites } from "@/lib/queries";
import { getLessonForEpisode } from "@/modules/lessons/repository";
import type { RuntimeCue } from "@/modules/subtitles/engine";
import { WatchExperience } from "@/components/watch/WatchExperience";
import type { TrackData, WatchData } from "@/components/watch/types";

export const dynamic = "force-dynamic";

export default async function WatchPage({ params, searchParams }: { params: Promise<{ episodeId: string }>; searchParams: Promise<{ party?: string }> }) {
  const { episodeId } = await params;
  const { party } = await searchParams;
  const { user, profile, isGuest } = await getCurrentUser();

  const [row] = await db
    .select({ episode: episodes, season: seasons, series: series, course: courses })
    .from(episodes)
    .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
    .innerJoin(series, eq(series.id, seasons.seriesId))
    .innerJoin(courses, eq(courses.id, series.courseId))
    .where(eq(episodes.id, episodeId))
    .limit(1);
  if (!row) notFound();

  const [sources, chapterRows, skipRows, trackRows, lessonRow, seasonRows, vocab, streakRow] = await Promise.all([
    db.select().from(videoSources).where(eq(videoSources.episodeId, episodeId)).orderBy(asc(videoSources.priority)),
    db.select().from(chapters).where(eq(chapters.episodeId, episodeId)).orderBy(asc(chapters.sortOrder)),
    db.select().from(skipSegments).where(eq(skipSegments.episodeId, episodeId)),
    db.select().from(subtitleTracks).where(and(eq(subtitleTracks.episodeId, episodeId), eq(subtitleTracks.available, true))),
    getLessonForEpisode(episodeId, user.id),
    db.select().from(seasons).where(eq(seasons.seriesId, row.series.id)).orderBy(asc(seasons.seasonNumber)),
    db.select({ lemma: vocabularyItems.lemma }).from(vocabularyItems).where(eq(vocabularyItems.userId, user.id)),
    db.select().from(userStreaks).where(eq(userStreaks.userId, user.id)).limit(1),
  ]);

  // Subtitle tracks → cues → words
  const trackIds = trackRows.map((t) => t.id);
  const cueRows = trackIds.length ? await db.select().from(subtitleCues).where(inArray(subtitleCues.trackId, trackIds)).orderBy(asc(subtitleCues.cueIndex)) : [];
  const cueIds = cueRows.map((c) => c.id);
  const wordRows = cueIds.length ? await db.select().from(subtitleWords).where(inArray(subtitleWords.cueId, cueIds)).orderBy(asc(subtitleWords.wordIndex)) : [];
  const wordsByCue = new Map<string, RuntimeCue["words"]>();
  for (const w of wordRows) {
    if (!wordsByCue.has(w.cueId)) wordsByCue.set(w.cueId, []);
    wordsByCue.get(w.cueId)!.push({ id: w.id, text: w.text, startTime: w.startTime, endTime: w.endTime });
  }
  const tracks: TrackData[] = trackRows.map((t) => ({
    id: t.id,
    language: t.language,
    label: t.label,
    isOriginal: t.isOriginal,
    isTranslation: t.isTranslation,
    alignment: t.alignment,
    source: t.source,
    cues: cueRows
      .filter((c) => c.trackId === t.id)
      .map((c) => ({ id: c.id, index: c.cueIndex, startTime: c.startTime, endTime: c.endTime, text: c.text, speaker: c.speaker, words: wordsByCue.get(c.id) ?? [] })),
  }));

  // Progress, prefs
  const [wp] = await db.select().from(watchProgress).where(and(eq(watchProgress.userId, user.id), eq(watchProgress.episodeId, episodeId))).limit(1);
  const lp = lessonRow ? (await db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lessonRow.id))).limit(1))[0] : undefined;
  let [prefs] = await db.select().from(userPlayerPreferences).where(eq(userPlayerPreferences.userId, user.id)).limit(1);
  if (!prefs) [prefs] = await db.insert(userPlayerPreferences).values({ id: randomUUID(), userId: user.id }).returning();

  // Episode navigation
  const liteMap = await getEpisodeLites(user.id, seasonRows.map((s) => s.id));
  const ordered = seasonRows.flatMap((s) => liteMap.get(s.id) ?? []);
  const idx = ordered.findIndex((e) => e.id === episodeId);

  const data: WatchData = {
    episode: { id: row.episode.id, title: row.episode.title, description: row.episode.description, episodeNumber: row.episode.episodeNumber, duration: row.episode.duration, poster: row.episode.poster, attribution: row.episode.attribution, license: row.episode.license },
    season: { id: row.season.id, seasonNumber: row.season.seasonNumber, title: row.season.title },
    series: { id: row.series.id, title: row.series.title },
    course: { id: row.course.id, title: row.course.title },
    seasons: seasonRows.map((s) => ({ id: s.id, seasonNumber: s.seasonNumber, title: s.title, episodes: liteMap.get(s.id) ?? [] })),
    sources: sources.map((s) => ({ id: s.id, url: s.url, type: s.type, label: s.label, qualityLabel: s.quality, qualities: s.qualities, audioTracks: s.audioTracks, authorizationType: s.authorizationType, availability: s.availability, downloadable: s.downloadable })),
    tracks,
    chapters: chapterRows.map((c) => ({ id: c.id, title: c.title, type: c.type, startTime: c.startTime, endTime: c.endTime })),
    skipSegments: skipRows.map((s) => ({ id: s.id, type: s.type, label: s.label, startTime: s.startTime, endTime: s.endTime })),
    lesson: lessonRow ? { id: lessonRow.id, data: lessonRow.data, generatedBy: lessonRow.generatedBy, personal: lessonRow.forUserId === user.id } : null,
    lessonProgress: lp ? { status: lp.status, activityStates: lp.activityStates, percentage: lp.percentage, xp: lp.xp } : null,
    watchProgress: wp ? { position: wp.position, percentage: wp.percentage, completed: wp.completed } : null,
    prefs: {
      subtitleMode: prefs.subtitleMode,
      playbackRate: prefs.playbackRate,
      volume: prefs.volume,
      autoSkipIntro: prefs.autoSkipIntro,
      autoSkipRecap: prefs.autoSkipRecap,
      autoSkipOutro: prefs.autoSkipOutro,
      autoSkipCredits: prefs.autoSkipCredits,
      autoplayNext: prefs.autoplayNext,
      subtitleFontSize: prefs.subtitleFontSize,
      subtitleBackground: prefs.subtitleBackground,
      theaterMode: prefs.theaterMode,
    },
    neighbors: { prev: idx > 0 ? ordered[idx - 1] : null, next: idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null },
    learner: { userId: user.id, name: user.name, cefrLevel: profile.cefrLevel, nativeLanguage: profile.nativeLanguage, targetLanguage: profile.targetLanguage, xp: profile.xp, level: profile.level, dailyStreak: streakRow[0]?.currentDaily ?? 0 },
    savedWords: vocab.map((v) => v.lemma),
    partyCode: party ?? null,
    isGuest,
  };

  return <WatchExperience data={data} />;
}
