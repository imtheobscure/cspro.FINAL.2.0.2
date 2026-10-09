"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_PACK, isPackEmpty, normalizePack, type ContentPack } from "@/content/tutolingo";
import { coercePackText } from "@/lib/pack-repair";
import { clearLocalPack, readLocalPack, saveLocalPack, type LocalPackRecord } from "@/lib/local-pack";

/**
 * Lingo loads ALL of its material from one file:
 *   content/tutolingo-content.json  (next to index.html once exported)
 * The AI-content prompt page tells the agent exactly how to build that file.
 *
 * For testing there is also a bundled sample file:
 *   content/tutolingo-content.mock.json
 * Switch between them in Profile → Demo data, or load the app with
 * "?pack=mock" to try the sample data without touching your content.
 *
 * And for anyone who cannot edit the web root — a phone, a deployed site — a pack
 * can be loaded straight into the browser (dropped on Home, pasted on the AI Prompt
 * page, sent over by the Checker). That one lives in IndexedDB and wins until the
 * learner switches back: see src/lib/local-pack.ts.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The learner's own pack (produced by the AI content prompt). */
export const CONTENT_URL = `${BASE_PATH}/content/tutolingo-content.json`;
/** The bundled mock pack, for testing and demos. */
export const MOCK_CONTENT_URL = `${BASE_PATH}/content/tutolingo-content.mock.json`;

export type ContentSource = "default" | "mock" | "local";

const SOURCE_KEY = "tutolingo-content-source";
const SOURCES: ContentSource[] = ["default", "mock", "local"];

function readStoredSource(): ContentSource {
  if (typeof window === "undefined") return "default";
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("pack");
    if (fromUrl && (SOURCES as string[]).includes(fromUrl)) return fromUrl as ContentSource;
  } catch {
    /* ignore */
  }
  try {
    const stored = window.localStorage.getItem(SOURCE_KEY);
    return stored && (SOURCES as string[]).includes(stored) ? (stored as ContentSource) : "default";
  } catch {
    return "default";
  }
}

function persistSource(source: ContentSource): void {
  try {
    window.localStorage.setItem(SOURCE_KEY, source);
  } catch {
    /* storage blocked — the choice simply lasts this session */
  }
}

export type LoadPackResult =
  | {
      ok: true;
      pack: ContentPack;
      /** Coercion steps applied to the AI agent's answer (fences, smart quotes, …). */
      adjustments: string[];
      /** True when the file parses but carries nothing teachable. */
      empty: boolean;
      name: string;
    }
  | { ok: false; error: string };

export interface ContentState {
  pack: ContentPack;
  loading: boolean;
  error: string | null;
  /** Which file the app is reading right now. */
  source: ContentSource;
  /** The pack the learner loaded from their own computer, when there is one. */
  localPack: LocalPackRecord | null;
  /** Switch between the learner's pack, the bundled sample data and the uploaded file. */
  setSource: (s: ContentSource) => void;
  /**
   * Open a JSON file/pasted text as the course, immediately and in this browser only.
   * Never throws: the result tells the caller whether the text could be read.
   */
  loadPack: (text: string, name?: string) => LoadPackResult;
  /** Forget the uploaded pack (the published file is used again). */
  removePack: () => void;
  reload: () => void;
}

const Ctx = createContext<ContentState>({
  pack: EMPTY_PACK,
  loading: true,
  error: null,
  source: "default",
  localPack: null,
  setSource: () => {},
  loadPack: () => ({ ok: false, error: "not ready" }),
  removePack: () => {},
  reload: () => {},
});

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [pack, setPack] = useState<ContentPack>(EMPTY_PACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSourceState] = useState<ContentSource>("default");
  const [localPack, setLocalPack] = useState<LocalPackRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [nonce, setNonce] = useState(0);
  const sourceRef = useRef<ContentSource>("default");

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const setSource = useCallback((s: ContentSource) => {
    setSourceState(s);
    persistSource(s);
  }, []);

  // Pick up "?pack=…", the saved choice and any pack stored in this browser.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readLocalPack();
      if (cancelled) return;
      setLocalPack(stored);
      const wanted = readStoredSource();
      // An uploaded pack that is gone (cleared storage / another browser) must not
      // leave the app pointing at a file that no longer exists.
      const next: ContentSource = wanted === "local" && !stored ? "default" : wanted;
      if (next !== wanted) persistSource(next);
      setSourceState(next);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the active file. The uploaded pack is not fetched: it is already here.
  useEffect(() => {
    if (!hydrated || source === "local") return;
    let cancelled = false;

    setLoading(true);
    fetch(source === "mock" ? MOCK_CONTENT_URL : CONTENT_URL, { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPack(normalizePack(data));
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setPack(EMPTY_PACK);
        setError(e instanceof Error ? e.message : "Could not load the content file");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, nonce, hydrated]);

  /**
   * Open whatever the AI agent produced: fences, smart quotes and surrounding
   * prose are forgiven (`coercePackText`), then the pack is normalised and stored
   * in this browser so a reload keeps it.
   */
  const loadPack = useCallback((text: string, name = "pasted pack"): LoadPackResult => {
    if (!text.trim()) return { ok: false, error: "Nothing to read — paste the JSON or choose a file first." };

    let value: unknown;
    let adjustments: string[] = [];
    try {
      const coerced = coercePackText(text);
      value = coerced.value;
      adjustments = coerced.adjustments;
    } catch (e) {
      return { ok: false, error: fixable(e instanceof Error ? e.message : "the file is not valid JSON") };
    }

    const next = normalizePack(value);
    const record: LocalPackRecord = { name: name.trim() || "pasted pack", json: JSON.stringify(next, null, 2), savedAt: Date.now() };

    setLocalPack(record);
    setSourceState("local");
    sourceRef.current = "local";
    persistSource("local");

    void saveLocalPack(record).catch((e: unknown) => {
      console.warn("[tutolingo] the pack could not be stored in this browser — it stays loaded until you reload", e);
    });

    return { ok: true, pack: next, adjustments, empty: isPackEmpty(next), name: record.name };
  }, []);

  const removePack = useCallback(() => {
    setLocalPack(null);
    void clearLocalPack();
    if (sourceRef.current === "local") {
      setSourceState("default");
      persistSource("default");
    }
  }, []);

  const reload = useCallback(() => {
    if (sourceRef.current === "local") {
      // Re-read from IndexedDB: another tab may have loaded a newer file.
      void readLocalPack().then((record) => setLocalPack(record));
      return;
    }
    setNonce((n) => n + 1);
  }, []);

  /**
   * The uploaded pack is parsed during render (there is nothing to fetch), which is
   * memoised per stored record: loading one is a plain state update, with no second
   * parse and no effect.
   */
  const uploaded = useMemo(() => {
    if (source !== "local") return null;
    if (!localPack) {
      return { pack: EMPTY_PACK, error: "No content file has been loaded into this browser yet. Load one from Home or the AI Prompt page." };
    }
    try {
      return { pack: normalizePack(JSON.parse(localPack.json)), error: null };
    } catch {
      return { pack: EMPTY_PACK, error: `The file stored in this browser could not be read (${localPack.name}). Load it again.` };
    }
  }, [source, localPack]);

  const state: ContentState = useMemo(
    () => ({
      pack: uploaded ? uploaded.pack : pack,
      loading: uploaded ? false : loading,
      error: uploaded ? uploaded.error : error,
      source,
      localPack,
      setSource,
      loadPack,
      removePack,
      reload,
    }),
    [uploaded, pack, loading, error, source, localPack, setSource, loadPack, removePack, reload],
  );

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useContent(): ContentState {
  return useContext(Ctx);
}

/** `JSON.parse` messages are cryptic; point at the Checker, which names the real problem. */
function fixable(message: string): string {
  const position = /position (\d+)/.exec(message);
  const where = position ? ` (around character ${position[1]})` : "";
  return `The text is not valid JSON${where}: ${message}. Open the Checker page to see exactly what is wrong — it also fixes the usual agent mistakes.`;
}
