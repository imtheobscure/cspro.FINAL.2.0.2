import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppState, Platform, Snapshot, Task, Tutor } from "../types";
import {
  FolderSync,
  coerceState,
  folderPermission,
  folderSharedWithMainApp,
  folderSyncSupported,
  loadState,
  pickFolder,
  readFromFolder,
  reconnectFolder,
  saveLocal,
  storedFolder,
  forgetFolder,
} from "./storage";
import { newTask, newTutor } from "./domain";
import { fetchLiveRate, tomanPerUsd, type RateAttempt } from "./rates";

/** How long a stored rate stays "fresh" before the app re-checks it on open. */
const RATE_FRESH_HOURS = 12;

/**
 * The app's state, and the only place it changes.
 *
 * Every mutation goes through `mutate`, which stamps `updatedAt`, saves to
 * localStorage and queues the folder write. That means there is exactly one code
 * path that can lose data, and it is four lines long.
 */

export interface SyncStatus {
  folderName?: string;
  permission: "granted" | "prompt" | "denied" | "none";
  lastWriteAt?: string;
  lastFile?: string;
  error?: string;
  supported: boolean;
  /** The chosen folder is also the main tutor app's backup folder. */
  sharedWithMainApp?: boolean;
}

export interface Toast {
  id: string;
  message: string;
  tone: "ok" | "error" | "info";
}

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sync, setSync] = useState<SyncStatus>({
    permission: "none",
    supported: folderSyncSupported(),
  });
  const syncRef = useRef<FolderSync | null>(null);

  /* -------------------------------------------------------------- toasts -- */

  const toast = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  /* -------------------------------------------------------- folder syncing -- */

  const attachFolder = useCallback(
    async (handle: Awaited<ReturnType<typeof storedFolder>>, name?: string) => {
      if (!handle) return;
      const permission = await folderPermission(handle);
      syncRef.current?.attach(permission === "granted" ? handle : null);
      // Is this also the main tutor app's backup folder? One folder for both apps is
      // the setup we want; say so rather than making the mentor guess.
      const sharedWithMainApp = await folderSharedWithMainApp(handle);
      syncRef.current?.setShared(sharedWithMainApp);
      setSync((s) => ({
        ...s,
        folderName: name ?? handle.name,
        permission,
        sharedWithMainApp,
        error: permission === "granted" ? undefined : "Reconnect to resume automatic saving.",
      }));
      if (permission === "granted") {
        // The folder may hold a newer file than this browser — never silently
        // overwrite it. The mentor chooses, in Settings.
      }
    },
    [],
  );

  useEffect(() => {
    syncRef.current = new FolderSync((status) => {
      if ("error" in status) {
        setSync((s) => ({ ...s, error: status.error, permission: "prompt" }));
      } else {
        setSync((s) => ({ ...s, lastWriteAt: status.at, lastFile: status.file, sharedWithMainApp: status.shared, error: undefined }));
      }
    });
    void (async () => {
      const handle = await storedFolder();
      if (handle) await attachFolder(handle);
    })();
  }, [attachFolder]);

  /* -------------------------------------------------------------- persist -- */

  const stateRef = useRef(state);
  stateRef.current = state;

  const persist = useCallback((next: AppState) => {
    saveLocal(next);
    syncRef.current?.schedule(next);
  }, []);

  const mutate = useCallback(
    (updater: (draft: AppState) => AppState) => {
      setState((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /* --------------------------------------------------------------- tutors -- */

  const tutorById = useMemo(() => {
    const map = new Map<string, Tutor>();
    for (const t of state.tutors) map.set(t.id, t);
    return map;
  }, [state.tutors]);

  const updateTutor = useCallback(
    (id: string, updater: (tutor: Tutor) => Tutor) =>
      mutate((s) => ({
        ...s,
        tutors: s.tutors.map((t) => (t.id === id ? { ...updater(t), updatedAt: new Date().toISOString() } : t)),
      })),
    [mutate],
  );

  const patchTutor = useCallback(
    (id: string, patch: Partial<Tutor>) => updateTutor(id, (t) => ({ ...t, ...patch })),
    [updateTutor],
  );

  const addTutors = useCallback(
    (tutors: Tutor[]) =>
      mutate((s) => ({ ...s, tutors: [...s.tutors, ...tutors] })),
    [mutate],
  );

  const deleteTutor = useCallback(
    (id: string) => mutate((s) => ({ ...s, tutors: s.tutors.filter((t) => t.id !== id) })),
    [mutate],
  );

  /**
   * Moving a tutor between phases also restarts the "stuck here" clock — that clock
   * is what the nudge engine reads, so it must never carry over from the last phase.
   */
  const setPhase = useCallback(
    (id: string, phase: Tutor["phase"]) =>
      updateTutor(id, (t) => ({
        ...t,
        phase,
        phaseSince: t.phase === phase ? t.phaseSince : new Date().toISOString().slice(0, 10),
      })),
    [updateTutor],
  );

  const addSnapshot = useCallback(
    (id: string, snapshot: Snapshot) =>
      updateTutor(id, (t) => ({
        ...t,
        snapshots: [...t.snapshots.filter((s) => s.weekOf !== snapshot.weekOf), snapshot].sort((a, b) =>
          a.weekOf < b.weekOf ? -1 : 1,
        ),
      })),
    [updateTutor],
  );

  /* ---------------------------------------------------------------- tasks -- */

  /**
   * The mentor's own notes-to-self.
   *
   * Ticking one off stamps `doneAt` instead of deleting it, so "I said I would chase
   * this last month and I did" stays in the file rather than disappearing — but the
   * name goes with the tutor: a task only ever holds a `tutorId`, never a copy of a
   * name, so renaming someone cannot leave stale text on the board.
   */
  const addTask = useCallback(
    (partial: Partial<Task>) => {
      const task = newTask(partial);
      mutate((s) => ({ ...s, tasks: [...(s.tasks ?? []), task] }));
      return task;
    },
    [mutate],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) =>
      mutate((s) => ({ ...s, tasks: (s.tasks ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    [mutate],
  );

  const toggleTask = useCallback(
    (id: string) =>
      mutate((s) => ({
        ...s,
        tasks: (s.tasks ?? []).map((t) =>
          t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : undefined } : t,
        ),
      })),
    [mutate],
  );

  const deleteTask = useCallback(
    (id: string) => mutate((s) => ({ ...s, tasks: (s.tasks ?? []).filter((t) => t.id !== id) })),
    [mutate],
  );

  /* ------------------------------------------------------------ platforms -- */

  const upsertPlatform = useCallback(
    (platform: Platform) =>
      mutate((s) => {
        const existing = s.customPlatforms.find((p) => p.id === platform.id);
        return {
          ...s,
          customPlatforms: existing
            ? s.customPlatforms.map((p) => (p.id === platform.id ? { ...p, ...platform } : p))
            : [...s.customPlatforms, platform],
        };
      }),
    [mutate],
  );

  /** Any platform color can be corrected, including the built-in ones. */
  const setPlatformColor = useCallback(
    (platformId: string, color: string, fallbackName: string) =>
      mutate((s) => {
        const existing = s.customPlatforms.find((p) => p.id === platformId);
        if (existing) {
          return { ...s, customPlatforms: s.customPlatforms.map((p) => (p.id === platformId ? { ...p, color } : p)) };
        }
        // A built-in platform is shadowed by a custom record carrying the new color.
        const base = { ...newPlatformStub(platformId, fallbackName), color };
        return { ...s, customPlatforms: [...s.customPlatforms, base] };
      }),
    [mutate],
  );

  const removeCustomPlatform = useCallback(
    (platformId: string) =>
      mutate((s) => ({ ...s, customPlatforms: s.customPlatforms.filter((p) => p.id !== platformId) })),
    [mutate],
  );

  /* --------------------------------------------------------------- toman -- */

  /**
   * Set the rate, and record *where it came from*.
   *
   * A number you typed and a number a live provider quoted are not the same thing, so
   * Settings can say which one is on file and when the live check last ran. Silently
   * overwriting your typed rate with a fetched one would be worse than not fetching at
   * all, which is why `live` is only ever set by a fetch.
   */
  const setRate = useCallback(
    (rialPerUsd: number, meta?: { source?: string; live?: boolean }) =>
      mutate((s) => ({
        ...s,
        toman: {
          rialPerUsd,
          updatedAt: new Date().toISOString(),
          source: meta?.source ?? "you",
          live: meta?.live ?? false,
        },
      })),
    [mutate],
  );

  /**
   * Ask the providers now — the header's refresh button and Settings both use this.
   *
   * Applies only a free-market quote (`market`), never the aggregated reference: that
   * number sits far below the real dollar, and writing it in without being asked would
   * quietly shrink every Toman figure in the app. The full result is returned so the
   * caller can show what each provider answered.
   */
  const checkRate = useCallback(
    async (options?: { apply?: boolean }): Promise<{ applied?: number; label?: string; attempts: RateAttempt[] }> => {
      const result = await fetchLiveRate();
      const market = result.attempts
        .filter((a): a is RateAttempt & { rialPerUsd: number } => a.ok && a.kind === "market" && !!a.rialPerUsd)
        .sort((a, b) => a.ms - b.ms)[0];
      if (market && (options?.apply ?? true)) setRate(market.rialPerUsd, { source: market.label, live: true });
      return { applied: market?.rialPerUsd, label: market?.label, attempts: result.attempts };
    },
    [setRate],
  );

  /* ---------------------------------------------------------------- prefs -- */

  const setPrefs = useCallback(
    (patch: Partial<AppState["prefs"]>) => mutate((s) => ({ ...s, prefs: { ...s.prefs, ...patch } })),
    [mutate],
  );

  /**
   * One live-rate check per app open.
   *
   * It runs only when auto-refresh is on and the rate on file is more than half a day
   * old, it never blocks the first paint, and a failure is silent — the manual check in
   * Settings is where you go to see *why* a provider did not answer. A number a mentor
   * typed by hand is never replaced by a stale cache on open; only a real answer from a
   * live provider updates it.
   */
  const rateChecked = useRef(false);
  useEffect(() => {
    if (rateChecked.current) return;
    rateChecked.current = true;
    if (!stateRef.current.prefs.autoRateRefresh) return;
    const last = Date.parse(stateRef.current.toman.updatedAt || "");
    const ageHours = Number.isFinite(last) ? (Date.now() - last) / 3_600_000 : Number.POSITIVE_INFINITY;
    if (ageHours < RATE_FRESH_HOURS) return;
    void (async () => {
      const result = await fetchLiveRate();
      /**
       * A free-market quote or nothing.
       *
       * `result.best` falls back to an aggregated reference when no exchange answers,
       * and that number sits many times below the free market — applying it on open
       * would quietly cut every Toman figure in the app by two thirds, with no click and
       * no way to tell why. Only an exchange may overwrite the rate without you asking.
       */
      const market = result.attempts
        .filter((a): a is typeof a & { rialPerUsd: number } => a.ok && a.kind === "market" && !!a.rialPerUsd)
        .sort((a, b) => a.ms - b.ms)[0];
      if (!market) return;
      setRate(market.rialPerUsd, { source: market.label, live: true });
      toast(
        `Rate refreshed from ${market.label}: 1 USD = ${Math.round(tomanPerUsd(market.rialPerUsd)).toLocaleString("en-US")} Toman.`,
        "info",
      );
    })();
  }, [setRate, toast]);

  /* ------------------------------------------------------------- storage -- */

  const replaceState = useCallback(
    async (next: AppState) => {
      const coerced = coerceState(next);
      setState(coerced);
      persist(coerced);
      await syncRef.current?.flushNow(coerced);
    },
    [persist],
  );

  const connectFolder = useCallback(async () => {
    const picked = await pickFolder();
    if (!picked) {
      toast("No folder chosen — nothing changed.", "info");
      return;
    }
    await attachFolder(picked.handle, picked.name);
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    const written = await syncRef.current?.flushNow(stateRef.current);
    void written;
    toast(`Saving automatically into ${picked.name}/ now.`);
  }, [attachFolder, toast]);

  const reconnect = useCallback(async () => {
    const handle = await storedFolder();
    if (!handle) {
      toast("No folder is remembered — choose one first.", "error");
      return;
    }
    const ok = await reconnectFolder(handle);
    if (ok) {
      syncRef.current?.attach(handle);
      setSync((s) => ({ ...s, permission: "granted", error: undefined }));
      await syncRef.current?.flushNow(stateRef.current);
      toast("Folder reconnected — automatic saving is back on.");
    } else {
      toast("Permission was refused. Try choosing the folder again.", "error");
    }
  }, [toast]);

  const disconnectFolder = useCallback(async () => {
    await forgetFolder();
    syncRef.current?.attach(null);
    setSync((s) => ({ ...s, folderName: undefined, permission: "none", lastWriteAt: undefined, lastFile: undefined, error: undefined }));
    toast("Folder sync turned off. Your data is still saved in this browser.", "info");
  }, [toast]);

  /** Load the file that lives in the chosen folder — used when moving machines. */
  const loadFromFolder = useCallback(async () => {
    const handle = await storedFolder();
    if (!handle) {
      toast("Choose a folder first.", "error");
      return;
    }
    const loaded = await readFromFolder(handle);
    if (!loaded) {
      toast("No tutorly-advisor-data.json in that folder yet.", "error");
      return;
    }
    await replaceState(loaded);
    toast(`Loaded ${loaded.tutors.length} tutors from ${handle.name}.`);
  }, [replaceState, toast]);

  const addManualTutor = useCallback(
    (partial: Partial<Tutor>) => {
      const tutor = newTutor(partial);
      addTutors([tutor]);
      return tutor;
    },
    [addTutors],
  );

  return {
    state,
    tutors: state.tutors,
    customPlatforms: state.customPlatforms,
    toman: state.toman,
    tutorById,
    toasts,
    toast,
    dismissToast,
    sync,
    mutate,
    updateTutor,
    patchTutor,
    addTutors,
    addManualTutor,
    deleteTutor,
    setPhase,
    addSnapshot,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    upsertPlatform,
    setPlatformColor,
    removeCustomPlatform,
    setRate,
    checkRate,
    setPrefs,
    replaceState,
    connectFolder,
    reconnect,
    disconnectFolder,
    loadFromFolder,
  };
}

function newPlatformStub(id: string, name: string): Platform {
  return {
    id,
    name,
    color: "#7A5CFF",
    colorSource: "Set by you",
    emoji: "🟣",
    commission: 0.15,
    signupUrl: "",
    rules: [],
    accountFields: [],
    logoUrl: "",
    custom: true,
  };
}
