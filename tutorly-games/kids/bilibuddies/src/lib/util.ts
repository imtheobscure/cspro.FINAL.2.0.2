export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** n distinct items from arr (fewer if arr is short) */
export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length)));
}

/** arr with n-1 random distractors taken from pool, shuffled */
export function withDistractors<T>(target: T, pool: T[], n: number, key: (x: T) => string): T[] {
  const others = pool.filter((x) => key(x) !== key(target));
  return shuffle([target, ...sample(others, n - 1)]);
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
