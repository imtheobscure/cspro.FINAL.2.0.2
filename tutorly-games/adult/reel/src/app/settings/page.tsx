import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { userPlayerPreferences } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { SettingsForm } from "@/components/SettingsForm";
import { Card, SectionTitle } from "@/components/ui";

export default async function SettingsPage() {
  const { user, profile } = await getCurrentUser();
  let [prefs] = await db.select().from(userPlayerPreferences).where(eq(userPlayerPreferences.userId, user.id)).limit(1);
  if (!prefs) [prefs] = await db.insert(userPlayerPreferences).values({ id: randomUUID(), userId: user.id }).returning();
  const hasAi = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <SectionTitle sub="Player and lesson preferences persist across episodes and devices.">Settings</SectionTitle>
      <SettingsForm
        player={{ subtitleMode: prefs.subtitleMode, playbackRate: prefs.playbackRate, autoSkipIntro: prefs.autoSkipIntro, autoSkipRecap: prefs.autoSkipRecap, autoSkipOutro: prefs.autoSkipOutro, autoSkipCredits: prefs.autoSkipCredits, autoplayNext: prefs.autoplayNext, subtitleFontSize: prefs.subtitleFontSize, subtitleBackground: prefs.subtitleBackground, theaterMode: prefs.theaterMode }}
        learner={{ feedbackDetail: profile.preferences.feedbackDetail ?? "detailed", suspenseSounds: profile.preferences.suspenseSounds ?? true, activityPauseMode: profile.preferences.activityPauseMode ?? "pause", dailyGoalXp: profile.preferences.dailyGoalXp ?? 100 }}
      />
      <Card className="mt-6">
        <h2 className="font-bold">AI engine</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {hasAi ? "An AI provider is configured: lesson generation and the tutor use the model, with strict JSON validation and repair before anything is stored." : "No AI key is configured (OPENAI_API_KEY or ANTHROPIC_API_KEY). Lesson generation falls back to the transcript-grounded rules engine and the tutor answers from on-screen context. Add a key to the environment to enable model-generated lessons."}
        </p>
        <p className="mt-2 text-xs text-zinc-500">Media: Vidstack-style UI on a native media engine; adaptive HLS/DASH sources are listed and play where the browser supports them natively — plug Shaka in as the engine for full ABR. Transcripts: import VTT/SRT or WhisperX word-level JSON via <code className="rounded bg-white/5 px-1">/api/subtitles/import</code>. Watch Party: room state is host-authoritative with latency-aware drift correction; LiveKit can replace polling as the transport.</p>
      </Card>
    </div>
  );
}
