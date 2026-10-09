import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes, vocabularyItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { SectionTitle } from "@/components/ui";
import { VocabularyTrainer } from "@/components/VocabularyTrainer";

export default async function VocabularyPage() {
  const { user } = await getCurrentUser();
  const items = await db.select().from(vocabularyItems).where(eq(vocabularyItems.userId, user.id)).orderBy(asc(vocabularyItems.nextReviewAt));
  const eps = await db.select({ id: episodes.id, title: episodes.title }).from(episodes);
  const titles = Object.fromEntries(eps.map((e) => [e.id, e.title]));
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <SectionTitle sub="Every word remembers where you met it. Reviews follow an SM-2 spaced-repetition schedule.">Vocabulary</SectionTitle>
      <VocabularyTrainer
        initial={items.map((i) => ({
          id: i.id,
          word: i.word,
          translation: i.translation,
          definition: i.definition,
          example: i.example,
          status: i.status,
          mastery: i.mastery,
          cefr: i.cefr,
          sourceEpisodeId: i.sourceEpisodeId,
          sourceTimestamp: i.sourceTimestamp,
          nextReviewAt: i.nextReviewAt ? i.nextReviewAt.toISOString() : null,
          reviewCount: i.reviewCount,
          intervalDays: i.intervalDays,
        }))}
        episodeTitles={titles}
      />
    </div>
  );
}
