import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vocabularyItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";
import { askTutor, type TutorContext, type TutorTurn } from "@/modules/ai/tutor";

type Body = { context: Omit<TutorContext, "learner" | "savedVocabulary">; history?: TutorTurn[]; question: string };

export async function POST(req: Request) {
  const { user, profile } = await getCurrentUser();
  const body = await readJson<Body>(req);
  if (!body.question?.trim()) return error("question required");
  const saved = await db.select({ word: vocabularyItems.word, translation: vocabularyItems.translation, definition: vocabularyItems.definition }).from(vocabularyItems).where(eq(vocabularyItems.userId, user.id));
  const ctx: TutorContext = {
    ...(body.context ?? {}),
    learner: { cefrLevel: profile.cefrLevel, nativeLanguage: profile.nativeLanguage, targetLanguage: profile.targetLanguage, interests: profile.interests },
    savedVocabulary: saved,
  };
  const result = await askTutor(ctx, body.history ?? [], body.question.slice(0, 2000));
  return json(result);
}
