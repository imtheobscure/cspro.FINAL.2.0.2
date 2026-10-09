"use client";

import { useEffect, useState } from "react";

/**
 * Learner profiles and stars.
 *
 * The game is a static export (no server, no database), so everything a tutor
 * used to keep in Postgres now lives in this browser under one key each. That is
 * the same trade every other Tutorly game makes, and it keeps the game working
 * from a plain folder on the host or straight off a USB stick.
 *
 * EVERY KEY IS PREFIXED `wordpop.` ON PURPOSE. All the Tutorly games are served
 * from one origin (`/tutorly-games/kids/<game>/`), so localStorage is shared
 * between them: a generic key would let one game overwrite another's learners.
 * The naming convention for every future kids game is
 * `<game>.learners.v1`, `<game>.stars.v1`, `<game>.settings.v1`, …
 */

export interface Learner {
  id: number;
  name: string;
  avatar: string;
}

export interface StarRow {
  themeId: string;
  activity: string;
  stars: number;
}

const K_LEARNERS = "wordpop.learners.v1";
const K_STARS = "wordpop.stars.v1";
const K_THEMES = "wordpop.customPacks.v1";

/** Broadcast so every mounted view updates when something is written. */
function announce(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("wordpop:store", { detail: key }));
}

export function subscribe(key: string, fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onLocal = () => fn();
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === key) fn();
  };
  window.addEventListener("wordpop:store", onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("wordpop:store", onLocal);
    window.removeEventListener("storage", onStorage);
  };
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the game still runs, stars just do not persist */
  }
  announce(key);
}

/* ─────────────────────────────── learners ─────────────────────────────── */

export function listLearners(): Learner[] {
  const rows = read<Learner[]>(K_LEARNERS, []);
  return Array.isArray(rows) ? rows.filter((l) => l && typeof l.name === "string") : [];
}

export function addLearner(name: string, avatar: string): Learner {
  const clean = name.trim().slice(0, 30);
  const learner: Learner = { id: Date.now(), name: clean || "Learner", avatar: avatar || "🐣" };
  write(K_LEARNERS, [...listLearners(), learner]);
  return learner;
}

export function removeLearner(id: number) {
  write(K_LEARNERS, listLearners().filter((l) => l.id !== id));
  const stars = read<Record<string, number>>(K_STARS, {});
  for (const key of Object.keys(stars)) if (key.startsWith(`${id}|`)) delete stars[key];
  write(K_STARS, stars);
}

/** Live learner list — updates in this tab and in any other tab. */
export function useLearners(): Learner[] {
  const [learners, setLearners] = useState<Learner[]>([]);
  useEffect(() => {
    const load = () => setLearners(listLearners());
    load();
    return subscribe(K_LEARNERS, load);
  }, []);
  return learners;
}

/* ───────────────────────────────── stars ───────────────────────────────── */

const starKey = (learnerId: number, themeId: string, activity: string) => `${learnerId}|${themeId}|${activity}`;

function allStars(): Record<string, number> {
  const rows = read<Record<string, number>>(K_STARS, {});
  return rows && typeof rows === "object" ? rows : {};
}

/** Best score for one learner + theme, per activity. */
export function starsFor(learnerId: number | undefined, themeId: string): Record<string, number> {
  if (!learnerId) return {};
  const out: Record<string, number> = {};
  const rows = allStars();
  for (const [key, value] of Object.entries(rows)) {
    const [id, id_theme, activity] = key.split("|");
    if (Number(id) === learnerId && id_theme === themeId && typeof value === "number") out[activity] = value;
  }
  return out;
}

/** Keep the best result rather than the last one, exactly like the old SQL upsert did. */
export function saveStars(learnerId: number | undefined, themeId: string, activity: string, stars: number) {
  if (!learnerId) return;
  const rows = allStars();
  const key = starKey(learnerId, themeId, activity);
  const best = Math.max(rows[key] ?? 0, Math.max(0, Math.min(3, Math.round(stars))));
  rows[key] = best;
  write(K_STARS, rows);
}

export function totalStars(learnerId: number | undefined): number {
  if (!learnerId) return 0;
  return Object.entries(allStars()).reduce(
    (sum, [key, value]) => (key.startsWith(`${learnerId}|`) ? sum + value : sum),
    0,
  );
}

export { K_THEMES, read as readStore, write as writeStore, announce as announceStore };
