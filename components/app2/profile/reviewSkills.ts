/*
 * The four teaching-quality ratings that sit under "Rate the Class".
 *
 * These are the questions the tutor is really asking about their own lesson — clarity,
 * whether the learner felt they moved, whether the plan was visibly prepared, and whether
 * the class felt safe. They are deliberately separate from the overall star rating: a five
 * at the end of a session says a learner enjoyed it, and says nothing at all about which of
 * these four carried it or which one dropped.
 *
 * They are defined once, here, because three places have to agree on them or the numbers
 * become meaningless: the survey that collects them (`ReviewSurveyModal`), the aggregate in
 * the Reviews tab (`LearnerProfile`) and the prompt text the AI analyser reads
 * (`ProfileHeader`, `EmailContentPreview`). A typo in one of those three would silently
 * drop a whole rating out of the average rather than fail loudly.
 *
 * The wording is English (this is the tutor-facing dashboard) and each line is the learner's
 * own experience, not a description of the metric — the tutor is being asked, not audited.
 */
export const REVIEW_SKILLS = [
  {
    key: "clarity",
    label: "Clarity",
    question: "Were my explanations simple, structured and easy to follow?",
  },
  {
    key: "progress",
    label: "Progress",
    question: "Did the learner feel they are growing and their skills improving?",
  },
  {
    key: "preparation",
    label: "Preparation",
    question: "Was it clear I came with a precise, well-organised lesson plan?",
  },
  {
    key: "reassurance",
    label: "Reassurance",
    question: "Was I patient, did I normalise mistakes and build their confidence?",
  },
] as const;

export type ReviewSkillKey = (typeof REVIEW_SKILLS)[number]["key"];

/**
 * One rating per skill, 1–5.
 *
 * Every key is optional: reviews written before these four existed have none of them, and a
 * half-filled survey must still save. `undefined` means "not rated", which is different from
 * a 1 and must never be counted as one — otherwise an old review would drag an average down.
 */
export type SkillRatings = Partial<Record<ReviewSkillKey, number>>;

/** Anything carrying a review, in the shapes this dashboard uses. */
export type ReviewLike = { review?: { skillRatings?: SkillRatings | null } | null } | null | undefined;

/**
 * One average per skill across however many reviews were handed in.
 *
 * `null` rather than 0 when nothing has been rated, so the tab can print "—" instead of a
 * confident zero that reads as a bad score.
 */
export function averageSkillRatings(reviews: ReviewLike[] | undefined): Record<ReviewSkillKey, number | null> {
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const entry of reviews ?? []) {
    const ratings = entry?.review?.skillRatings;
    if (!ratings) continue;
    for (const { key } of REVIEW_SKILLS) {
      const value = Number(ratings[key]);
      if (!Number.isFinite(value) || value <= 0) continue;
      const bucket = (totals[key] ??= { sum: 0, count: 0 });
      bucket.sum += value;
      bucket.count += 1;
    }
  }
  const out = {} as Record<ReviewSkillKey, number | null>;
  for (const { key } of REVIEW_SKILLS) {
    const bucket = totals[key];
    out[key] = bucket && bucket.count > 0 ? bucket.sum / bucket.count : null;
  }
  return out;
}

/** How many reviews carry a rating for at least one of the four skills. */
export function countRatedReviews(reviews: ReviewLike[] | undefined): number {
  return (reviews ?? []).filter((entry) => {
    const ratings = entry?.review?.skillRatings;
    if (!ratings) return false;
    return REVIEW_SKILLS.some(({ key }) => {
      const value = Number(ratings[key]);
      return Number.isFinite(value) && value > 0;
    });
  }).length;
}

/**
 * The four ratings as one line of text, for the AI analyser and the email.
 *
 * Returns an empty string when nothing was rated, so callers can append it unconditionally
 * without leaving a dangling label with no numbers after it.
 */
export function formatSkillRatings(ratings: SkillRatings | null | undefined): string {
  if (!ratings) return "";
  const parts = REVIEW_SKILLS.map(({ key, label }) => {
    const value = Number(ratings[key]);
    return Number.isFinite(value) && value > 0 ? `${label} ${value}/5` : null;
  }).filter(Boolean);
  return parts.length ? parts.join(", ") : "";
}
