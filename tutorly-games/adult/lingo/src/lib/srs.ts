// FSRS-lite spaced repetition (inspired by FSRS-4.5 simplified)
// stability/difficulty model with intervals 1d, 3d, 7d, 14d, 30d progression

export interface CardState {
  stability: number; // days
  difficulty: number; // 1-10
  reps: number;
  lapses: number;
  nextReview: string; // ISO
  state: "new" | "learning" | "review" | "relearning";
}

export type Grade = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export function initialCard(): CardState {
  return { stability: 1, difficulty: 5, reps: 0, lapses: 0, nextReview: new Date().toISOString(), state: "new" };
}

export function reviewCard(card: CardState, grade: Grade): CardState {
  let { stability: S, difficulty: D, reps, lapses, state } = card;
  // difficulty update
  D = D - 0.2 * (grade - 3);
  D = Math.min(10, Math.max(1, D + (grade === 1 ? 0.6 : 0)));

  if (grade === 1) {
    lapses += 1;
    S = Math.max(0.2, S * 0.25);
    state = "relearning";
  } else {
    reps += 1;
    const gain = grade === 4 ? 1.9 : grade === 3 ? 1.45 : 1.15;
    S = S * gain * (1.05 - D / 60);
    // snap toward classic ladder early
    if (reps === 1) S = Math.max(S, 1);
    else if (reps === 2) S = Math.max(S, 3);
    else if (reps === 3) S = Math.max(S, 7);
    else if (reps === 4) S = Math.max(S, 14);
    else if (reps >= 5) S = Math.max(S, 30);
    state = reps < 2 ? "learning" : "review";
  }

  const next = new Date(Date.now() + S * 24 * 60 * 60 * 1000);
  return { stability: S, difficulty: D, reps, lapses, nextReview: next.toISOString(), state };
}

export function dueCards<T extends { nextReview: string }>(cards: T[]): T[] {
  const now = Date.now();
  return cards.filter((c) => new Date(c.nextReview).getTime() <= now);
}

export function formatNextReview(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Due now!";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.floor(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
