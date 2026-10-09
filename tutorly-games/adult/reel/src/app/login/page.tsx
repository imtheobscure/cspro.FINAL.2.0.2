import { redirect } from "next/navigation";

/**
 * Sign-in is gone from this build: the platform resolves every request to the local
 * learner profile. The route stays only so an old bookmark lands somewhere sensible.
 */
export default function LoginPage() {
  redirect("/");
  return (
    <div className="hero-glow min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Learn a language from the shows you actually want to watch.</h1>
          <p className="mt-4 text-zinc-300">Word-level subtitles, an interactive transcript, timestamped lesson activities that pause the video at the right moment, an AI tutor that sees what you see — and a learner profile that remembers everything.</p>
          <ul className="mt-6 space-y-2 text-sm text-zinc-300">
            <li>🎬 Premium player with chapters, dual subtitles and sentence replay</li>
            <li>🎓 19 activity types wired to the video timeline</li>
            <li>🧠 CEFR-aware lesson generation grounded in the real transcript</li>
            <li>🔥 XP, streaks, badges, spaced-repetition vocabulary</li>
            <li>👥 Watch Party with synchronized playback</li>
          </ul>
          <p className="mt-6 text-xs text-zinc-500">Demo account: demo@lingua.tv / demo1234 — or just keep exploring as a guest.</p>
        </div>
        {null}
      </div>
    </div>
  );
}
