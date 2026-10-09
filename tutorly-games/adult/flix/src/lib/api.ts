/**
 * The app's data layer.
 *
 * Flix ships as a static game inside the hub, so "the server" is an
 * IndexedDB store in the browser — but every read and write goes through these
 * async functions and TanStack Query, exactly as it would against a REST API.
 * When the deployment gains a real backend (the FFmpeg/WhisperX endpoints in
 * `media/processor.ts` already assume one), only this file changes: the queries,
 * mutations, caching and invalidation in the components stay identical.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Episode, Lesson, ProgressRecord } from "../types";
import { DEMO_EPISODE, DEMO_LESSON } from "./lesson/demo";

const DB_NAME = "tutoflix";
const DB_VERSION = 1;
const STORES = { episodes: "episodes", lessons: "lessons", progress: "progress" } as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function readAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function readOne<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function write<T extends { id: string }>(store: StoreName, value: T): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readwrite").objectStore(store).put(value);
    request.onsuccess = () => resolve(value);
    request.onerror = () => reject(request.error);
  });
}

async function remove(store: StoreName, id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readwrite").objectStore(store).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/* ─────────────────────────────── seeding ─────────────────────────────── */

const SEED_FLAG = "tutoflix-seeded-v1";

/** First run: install the demo pack so the library is never empty. */
export async function ensureSeedData(): Promise<void> {
  if (localStorage.getItem(SEED_FLAG)) return;
  const existing = await readAll<Episode>(STORES.episodes);
  if (!existing.length) {
    await write(STORES.episodes, DEMO_EPISODE);
    await write(STORES.lessons, { ...DEMO_LESSON, id: DEMO_EPISODE.id });
  }
  localStorage.setItem(SEED_FLAG, "1");
}

/* ─────────────────────────── queries & mutations ─────────────────────────── */

export const queryKeys = {
  episodes: ["episodes"] as const,
  episode: (id: string) => ["episode", id] as const,
  lessons: ["lessons"] as const,
  lesson: (episodeId: string) => ["lesson", episodeId] as const,
  progress: (episodeId: string) => ["progress", episodeId] as const,
};

export function useEpisodes() {
  return useQuery({
    queryKey: queryKeys.episodes,
    queryFn: async () => {
      await ensureSeedData();
      return (await readAll<Episode>(STORES.episodes)).sort((a, b) => b.createdAt - a.createdAt);
    },
    staleTime: 30_000,
  });
}

export function useEpisode(id: string | null) {
  return useQuery({
    queryKey: queryKeys.episode(id ?? "none"),
    enabled: !!id,
    queryFn: async () => (id ? (await readOne<Episode>(STORES.episodes, id)) ?? null : null),
  });
}

export function useLesson(episodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.lesson(episodeId ?? "none"),
    enabled: !!episodeId,
    queryFn: async () => {
      if (!episodeId) return null;
      const lesson = await readOne<Lesson & { id: string }>(STORES.lessons, episodeId);
      return lesson ?? null;
    },
  });
}

export function useProgress(episodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.progress(episodeId ?? "none"),
    enabled: !!episodeId,
    queryFn: async () => (episodeId ? (await readOne<ProgressRecord>(STORES.progress, episodeId)) ?? null : null),
  });
}

export function useSaveEpisode() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (episode: Episode) => write(STORES.episodes, episode),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.episodes });
    },
  });
}

export function useDeleteEpisode() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await remove(STORES.episodes, id);
      await remove(STORES.lessons, id);
      await remove(STORES.progress, id);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.episodes });
      void client.invalidateQueries({ queryKey: queryKeys.lessons });
    },
  });
}

export function useSaveLesson() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ lesson, episodeId }: { lesson: Lesson; episodeId: string }) => {
      const record = { ...lesson, id: episodeId };
      await write(STORES.lessons, record);
      const episode = await readOne<Episode>(STORES.episodes, episodeId);
      if (episode) await write(STORES.episodes, { ...episode, lessonId: episodeId });
      return record;
    },
    onSuccess: (_record, variables) => {
      void client.invalidateQueries({ queryKey: queryKeys.lesson(variables.episodeId) });
      void client.invalidateQueries({ queryKey: queryKeys.episodes });
    },
  });
}

export function useSaveProgress() {
  const client = useQueryClient();
  return useMutation({
    // The store's keyPath is `id`, so the episode id is the record key.
    mutationFn: (record: ProgressRecord) => write(STORES.progress, { ...record, id: record.episodeId }),
    onSuccess: (_record, variables) => {
      void client.invalidateQueries({ queryKey: queryKeys.progress(variables.episodeId) });
    },
  });
}

/* ────────────────────────────── import / export ────────────────────────────── */

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(filename, blob);
}

export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readTextFile(file: File): Promise<string> {
  return file.text();
}
