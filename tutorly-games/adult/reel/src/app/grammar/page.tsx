import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes, grammarItems, pronunciationTargets } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { Card, CEFR_COLORS, Pill, ProgressBar, SectionTitle } from "@/components/ui";

const STATUS_COLOR: Record<string, string> = { introduced: "#94a3b8", practiced: "#60a5fa", mastered: "#c084fc", needsReview: "#fb7185" };

export default async function GrammarPage() {
  const { user } = await getCurrentUser();
  const [grammar, pron, eps] = await Promise.all([
    db.select().from(grammarItems).where(eq(grammarItems.userId, user.id)).orderBy(desc(grammarItems.lastPracticedAt)),
    db.select().from(pronunciationTargets).where(eq(pronunciationTargets.userId, user.id)),
    db.select({ id: episodes.id, title: episodes.title }).from(episodes),
  ]);
  const titles = Object.fromEntries(eps.map((e) => [e.id, e.title]));
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <SectionTitle sub="Grammar points are tracked automatically from the activities you answer. Mastery rises with correct answers and flags items that need review.">Grammar</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {grammar.map((g) => (
          <Card key={g.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{g.name}</h2>
              <div className="flex gap-1">
                <Pill color={CEFR_COLORS[g.level] ?? "#94a3b8"}>{g.level}</Pill>
                <Pill color={STATUS_COLOR[g.status]}>{g.status === "needsReview" ? "needs review" : g.status}</Pill>
              </div>
            </div>
            <p className="text-sm text-zinc-300">{g.description}</p>
            {g.examples.length > 0 && (
              <ul className="space-y-0.5 text-xs italic text-zinc-400">
                {g.examples.slice(0, 3).map((e) => (
                  <li key={e}>“{e}”</li>
                ))}
              </ul>
            )}
            <div className="mt-auto flex items-center gap-2 text-[11px] text-zinc-500">
              <ProgressBar value={g.mastery} className="w-24" height={4} color={STATUS_COLOR[g.status]} /> {g.mastery}% · ✓ {g.correctCount} · ✗ {g.incorrectCount}
              {g.sourceEpisodeId && (
                <Link href={`/watch/${g.sourceEpisodeId}`} className="ml-auto text-violet-300 hover:underline">
                  {titles[g.sourceEpisodeId] ?? "Episode"}
                </Link>
              )}
            </div>
          </Card>
        ))}
        {!grammar.length && <p className="text-sm text-zinc-500">Answer grammar activities in a lesson to start building your grammar history.</p>}
      </div>

      <div className="mt-12">
        <SectionTitle sub="Connected speech, stress, intonation and reductions — tracked from speaking and voice-over activities.">Pronunciation targets</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pron.map((p) => (
            <Card key={p.id}>
              <h3 className="font-bold">{p.target}</h3>
              <p className="mt-1 text-sm text-zinc-300">{p.description}</p>
              <ProgressBar value={p.mastery} className="mt-2" height={4} />
            </Card>
          ))}
          {!pron.length && (
            <Card>
              <p className="text-sm text-zinc-400">The Sprite Fright lesson targets: linking (“a bit more”), reductions (gonna / gotta / wanna), sentence stress and polite rising intonation. Complete the speaking and voice-over activities to track them here.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
