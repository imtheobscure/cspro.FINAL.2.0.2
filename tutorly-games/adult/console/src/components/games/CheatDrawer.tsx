"use client";

/**
 * Cheat Engine: read what the game keeps, work out what can be changed, change it.
 *
 * The panel is deliberately honest about what it does. Every cheat names the field
 * it writes and the value that was there before, and nothing is applied until the
 * tutor presses the button — a class is watching, and a game that suddenly holds a
 * hundred million coins should be something the tutor chose, not something a panel
 * did on its own.
 *
 * ── Easy by default ────────────────────────────────────────────────────────
 * One button does the whole job: **Max everything** runs every cheat the engine
 * found and reloads the game onto the result. The per-field list below it is for a
 * tutor who wants one thing and not another, and the save editor at the bottom is
 * for the case no engine can infer (a binary save, a field named in the game's own
 * private language).
 *
 * ── Effective, whatever engine the game is ─────────────────────────────────
 * Three kinds of game reach this console, and they do not keep their state in the
 * same place:
 *
 *   · **Rewarded ads** work for all of them and need no button. The shim answers the
 *     SDK's ad request with `{ rewardGranted: true }`, so the game's own "watch an
 *     ad for coins" hands over its reward the moment it is pressed.
 *   · **The `ytgame` save** (Unity builds that use the SDK): decoded, edited,
 *     written back, game reloaded onto it. That is what a purchase would leave
 *     behind — the game sees the item as owned because its own save says so.
 *   · **Keys the game wrote itself.** A Cocos or Phaser Playable never calls the SDK
 *     at all; it keeps its progress in its own `localStorage`, under a name that
 *     says nothing about which game it belongs to. `lib/gameKeys.ts` watches those
 *     writes as they happen, so this panel can list them and cheat them the same way
 *     — which is what makes it work on games the save-based path cannot touch.
 *
 *   · **The build scan** reads the build's own files for the mechanisms and currency
 *     names it really uses, so a tutor can see what a game calls its money before
 *     deciding what to do about it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConsoleGame } from "@/data/catalog";
import { saveKeyFor, saveKeyForFrameUrl } from "@/lib/gameReset";
import { keysWrittenBy, storageKeyFor } from "@/lib/gameKeys";
import {
  BUILD_INTEL_NEEDLES,
  CHEAT_MONEY,
  applyCheatActions,
  decodeSave,
  describeSaveFormat,
  encodeSave,
  flipWalletValue,
  listCheatActions,
  listDayShiftActions,
  listSaveFields,
  listSectionSynthesis,
  readSavePath,
  scanBinaryFor,
  scanTextFor,
  summariseIntel,
  type BuildIntel,
  type CheatAction,
  walletShapeOf,
  type DecodedSave,
  type WalletShape,
} from "@/lib/cheats";
import { DAY_MS, describeTimeOffset, readTimeOffset, writeTimeOffset } from "@/lib/timeShift";
import MemoryEditor from "./MemoryEditor";
import { AlertTriangle, Clock, Coins, Copy, Loader2, RefreshCw, Sparkles, Undo2, Unlock, X } from "lucide-react";
import { frameUrlLooksCrossOrigin } from "@/lib/memoryScan";

interface CheatDrawerProps {
  game: ConsoleGame;
  /** The frame's current URL, used as the base for reading the build's files. */
  frameUrl: string;
  /**
   * The game key the shim itself reported, when it has reported one.
   *
   * Authoritative, because it is the key the *game* is writing to: the shim posts it on
   * every message. Reading it beats deriving it, so when it has arrived it wins; the
   * derived value is the fallback for the games that never call the SDK at all.
   */
  sdkGameKey?: string;
  /** The live frame element, so the Memory Editor can search the running game. */
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  /**
   * Re-mount the game frame on its current URL, so it re-reads what was written.
   *
   * Deliberately *not* the same callback as the rig's reload button: that one re-runs
   * the whole resolve (proxy probe included), which is right for "this build is broken"
   * and wrong for "I changed the save" — it can leave the frame unmounted waiting for a
   * proxy, which is what made “Write & reload” look like it did nothing.
   *
   * The optional `write` is run by the rig *after* the old frame has been taken down.
   * A Unity build saves its own state while it unloads, so anything written before the
   * reload can be replaced by the game's dying write — the save editor worked and the
   * game still came back with its old numbers. Handing the write over means it lands
   * last, and the remount boots from exactly the payload the tutor asked for.
   */
  onReload: (write?: () => void) => void;
  onClose: () => void;
  onNote: (text: string) => void;
}

/** A read of one build file, capped so a 40 MB wasm cannot freeze the tab. */
const MAX_TEXT_BYTES = 3 * 1024 * 1024;
const MAX_BINARY_BYTES = 14 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

const fetchWithCap = async (url: string, binary: boolean): Promise<string | ArrayBuffer | null> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, credentials: "omit" });
    if (!res.ok) return null;
    if (binary) {
      const buf = await res.arrayBuffer();
      return buf.byteLength > MAX_BINARY_BYTES ? buf.slice(0, MAX_BINARY_BYTES) : buf;
    }
    const text = await res.text();
    return text.length > MAX_TEXT_BYTES ? text.slice(0, MAX_TEXT_BYTES) : text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** `…/v/assets/index.html?token` → `…/v/assets/`, so sibling build files can be asked for. */
const directoryOf = (url: string): string => {
  const clean = (url || "").split("?")[0].split("#")[0];
  return clean.slice(0, clean.lastIndexOf("/") + 1);
};

/** Scripts, styles and data files a page points at — the build's own parts list. */
const referencedFiles = (html: string): string[] => {
  const refs = new Set<string>();
  const push = (value: string) => {
    if (!value) return;
    const clean = value.split("?")[0].trim();
    if (/\.(js|json|data|wasm|framework\.js|css|txt)$/i.test(clean) && !/^https?:/i.test(clean)) refs.add(value.trim());
  };
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) push(m[1]);
  return [...refs].slice(0, 10);
};

const isBinary = (url: string) => /\.(data|wasm)$/i.test(url.split("?")[0]);

export default function CheatDrawer({ game, frameUrl, sdkGameKey, frameRef, onReload, onClose, onNote }: CheatDrawerProps) {
  /**
   * The key the game's own save lives under.
   *
   * Three sources, in order of authority: what the shim reported (it *is* the writer),
   * the frame URL's own path (the same rule the shim applies — see `gameKeyFromPath`),
   * and the catalog's build host as a last resort. The middle one is what fixes the case
   * that made Write & reload a no-op: for a folder the tutor uploaded or a URL they
   * pasted, `game.buildHost` is the literal string `"external host"`, so the panel used
   * to write a key the game has never read.
   */
  const derived = saveKeyForFrameUrl(frameUrl);
  const gameKey = sdkGameKey || (game.buildHost && game.source === "youtube" ? game.buildHost : derived.gameKey);
  const saveKey = saveKeyFor(gameKey);

  /** Where the save from before the last edit is kept, so a cheat can be undone. */
  const backupKey = `tutorly:console:save-backup:${gameKey}`;

  const [raw, setRaw] = useState<string>("");
  const [decoded, setDecoded] = useState<DecodedSave | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string>("");
  const [analysing, setAnalysing] = useState(false);
  /** What the scan is reading right now, so a slow build does not look like a hang. */
  const [scanStep, setScanStep] = useState<string>("");
  const [intel, setIntel] = useState<BuildIntel | null>(null);
  const [applied, setApplied] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  /**
   * What the last write did, confirmed after the game had a chance to come back.
   *
   * A note that says "written" is only half the answer: the question a tutor actually
   * has is whether the game is *running on it*. The panel therefore says which of the
   * two happened, rather than letting a reload that silently reverted look like a
   * success.
   */
  const [writeStatus, setWriteStatus] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  /** How far ahead of real time the game's clock is being told it is. */
  const [dayOffset, setDayOffset] = useState(0);
  /** Whether a pre-edit save is kept, so a wrong edit can be undone from here. */
  const [backupAvailable, setBackupAvailable] = useState(false);
  const verifyTimer = useRef<number | null>(null);
  /**
   * The one retry a write is allowed.
   *
   * A game reads an amount as a number or as text, and the panel cannot know which
   * before the game has spoken. `listSectionSynthesis` writes the shape the save already
   * uses; if the game replaces the new values anyway, `retryWrite` is the same edit with
   * the invented wallets typed the other way. Once per write, so a game that refuses both
   * is reported rather than reloaded forever.
   */
  const retryWrite = useRef<(() => void) | null>(null);
  const retryUsed = useRef(false);
  /**
   * Whether the game frame is on this page's own origin.
   *
   * A proxied game shares this origin, so its save really is `localStorage[saveKey]`
   * and a reload really does re-read it. A game embedded straight from another host
   * does not: the write lands in *this* origin's storage, the game never looks there,
   * and the honest thing is to say so rather than let a tutor keep pressing a button
   * that cannot work.
   *
   * Decided from the frame URL during render rather than from the frame element in an
   * effect: the fact is known before anything is touched, and reading `contentWindow`
   * just to be told it throws is the exception, not the answer.
   */
  const frameReadable = !frameUrlLooksCrossOrigin(frameUrl);
  /**
   * Storage keys this game was seen writing under a name of its own.
   *
   * A Cocos or Phaser build keeps its progress here rather than in the SDK save, and
   * the key carries no game's name — `playerLevel`, `save`, a bare hash — so the
   * only way to find it is to have watched it being written.
   */
  const [gameKeys, setGameKeys] = useState<{ key: string; store: "localStorage" | "sessionStorage"; value: string }[]>([]);

  const refreshGameKeys = useCallback(() => {
    const found: { key: string; store: "localStorage" | "sessionStorage"; value: string }[] = [];
    for (const key of keysWrittenBy(storageKeyFor(game))) {
      for (const store of ["localStorage", "sessionStorage"] as const) {
        try {
          const value = store === "localStorage" ? localStorage.getItem(key) : sessionStorage.getItem(key);
          if (value === null) continue;
          found.push({ key, store, value });
        } catch {
          /* an unreadable store simply contributes nothing */
        }
      }
    }
    setGameKeys(found.slice(0, 12));
  }, [game]);

  /** Reads the game's save out of storage, exactly where the shim writes it. */
  const loadSave = useCallback(() => {
    let payload = "";
    try {
      payload = localStorage.getItem(saveKey) || "";
    } catch {
      payload = "";
    }
    setRaw(payload);
    setDecoded(null);
    setDecodeError(null);
    setEditing("");
    if (!payload) return;
    const parsed = decodeSave(payload);
    if (parsed) {
      setDecoded(parsed);
      setEditing(JSON.stringify(parsed.data, null, 2));
    } else {
      setDecodeError("This game's save is not JSON this panel can read (it may be a binary format). The build scan below still works.");
      setEditing(payload);
    }
  }, [saveKey]);

  useEffect(() => {
    loadSave();
    refreshGameKeys();
  }, [loadSave, refreshGameKeys]);

  /** The simulated clock and the backup belong to one game; follow the game, not the mount. */
  useEffect(() => {
    setDayOffset(readTimeOffset(gameKey));
    try {
      setBackupAvailable(!!localStorage.getItem(backupKey));
    } catch {
      setBackupAvailable(false);
    }
  }, [gameKey, backupKey]);

  useEffect(
    () => () => {
      if (verifyTimer.current) window.clearTimeout(verifyTimer.current);
    },
    []
  );

  /**
   * Cheat one store the game wrote itself.
   *
   * Read with the same decoder and the same rules as the SDK save, so a Cocos game
   * whose key holds `{"coins":120}` gets the identical treatment a Unity build's
   * save gets — no separate code path, no second set of guesses.
   */
  const cheatOwnKey = (entry: { key: string; store: "localStorage" | "sessionStorage"; value: string }) => {
    const parsed = decodeSave(entry.value);
    const list = parsed ? listCheatActions(parsed.data) : [];
    if (!parsed || !list.length) {
      onNote(`“${entry.key}” is not a save this engine can read — open it in the save editor below.`);
      return;
    }
    const next = applyCheatActions(parsed.data, list);
    const payload = encodeSave(next, parsed.format);
    try {
      window[entry.store].setItem(entry.key, payload);
    } catch {
      onNote("Storage refused the write — nothing was changed.");
      return;
    }
    setApplied((prev) => [`${entry.key}: ${list.length} field(s) maxed`, ...prev].slice(0, 6));
    refreshGameKeys();
    onNote(`“${entry.key}” maxed — reloading the game so it reads it.`);
    // Written again after the old frame is gone: a game that keeps progress in its own
    // key rewrites that key as it unloads, and that write would otherwise win.
    onReload(() => {
      try {
        window[entry.store].setItem(entry.key, payload);
      } catch {
        /* the first write already succeeded; this is the re-assert */
      }
    });
  };

  const actions: CheatAction[] = useMemo(() => (decoded ? listCheatActions(decoded.data) : []), [decoded]);
  const money = actions.filter((a) => a.kind === "currency");
  const unlocks = actions.filter((a) => a.kind === "unlock");
  const progress = actions.filter((a) => a.kind === "progress");
  const fields = useMemo(() => (decoded ? listSaveFields(decoded.data).length : 0), [decoded]);
  /**
   * Wallets the game has not written into its save yet.
   *
   * A section-format game writes a wallet section only once the money changes, so a
   * fresh profile has no field to raise and MAX EVERYTHING finds nothing. Offering
   * the section is what makes the first press on such a game do something — see
   * `listSectionSynthesis` for the names and how they were verified.
   */
  const walletShape: WalletShape = useMemo(() => (decoded ? walletShapeOf(decoded.data) : "number"), [decoded]);
  const synthesis = useMemo(
    () =>
      decoded?.format.includes("sections")
        ? listSectionSynthesis(decoded.data, intel?.words.map((w) => w.word) ?? [], walletShape)
        : [],
    [decoded, intel, walletShape]
  );
  /** Every cheat the engine found, in the order it would apply them. */
  const allActions = useMemo(() => [...actions, ...synthesis].sort((a, b) => b.score - a.score), [actions, synthesis]);

  /**
   * Writes a rewritten save back where the shim reads it, then reloads the game onto it.
   *
   * ── The bug this used to have ───────────────────────────────────────────────
   * It began `if (!decoded) return;`, so on a game that had not written a save yet the
   * button did nothing at all: no write, no reload, no message. The Save editor's own
   * placeholder invites exactly that — a tutor types `{"coins": 999}` into an empty
   * panel, presses Write & reload, and the panel answers with silence. There was no
   * requirement for an existing save to write one, only a guard that made it look like
   * one, so the guard is gone and the format is now inferred from whatever the game
   * *did* leave behind (defaulting to plain JSON when it left nothing).
   */
  const writeSave = (
    data: unknown,
    why: string,
    format?: DecodedSave["format"],
    checks: { path: string; next: unknown; created?: boolean }[] = [],
    retry?: () => void
  ) => {
    retryWrite.current = retry ?? null;
    retryUsed.current = false;
    const payload = encodeSave(data, format ?? decoded?.format ?? "json");
    try {
      // Keep the pre-edit save once, so a cheat that turns out wrong can be undone
      // here instead of by starting the game over.
      if (raw && raw !== payload && !localStorage.getItem(backupKey)) localStorage.setItem(backupKey, raw);
      setBackupAvailable(Boolean(raw && raw !== payload) || Boolean(localStorage.getItem(backupKey)));
      localStorage.setItem(saveKey, payload);
    } catch {
      onNote("Storage refused the write — the save could not be changed.");
      return;
    }
    // Reflect what was just written, so the panel is not showing a stale save after a
    // successful write (it used to keep the old text and look like nothing happened).
    setRaw(payload);
    const reread = decodeSave(payload);
    if (reread) {
      setDecoded(reread);
      setDecodeError(null);
      setEditing(JSON.stringify(reread.data, null, 2));
    } else {
      setEditing(payload);
    }
    setApplied((prev) => [why, ...prev].slice(0, 6));
    setWriteStatus({ tone: "ok", text: `${why} — written. Reloading the game…` });
    onNote(`${why} — written to ${saveKey}, reloading the game onto it.`);
    // The write that matters: handed to the rig, which runs it *after* the old frame
    // has been navigated away. A Unity game saves its own state as it unloads, and a
    // write that lands before that is simply replaced by the game's old numbers.
    onReload(() => {
      try {
        localStorage.setItem(saveKey, payload);
      } catch {
        /* the first write already succeeded; this is the re-assert */
      }
    });
    watchWriteBack(payload, why, checks);
  };

  /**
   * Confirms, after the reload, that the game is really running on the new save.
   *
   * "Written" is not the end of the sentence — the game gets the last word, and a game
   * that rewrites its own save at boot would otherwise leave the panel claiming a
   * success while the screen shows the old numbers. Each changed path is read back out
   * of whatever is in storage a few seconds later; the status line says which of the two
   * happened, paths and all.
   */
  const watchWriteBack = (payload: string, why: string, checks: { path: string; next: unknown; created?: boolean }[]) => {
    if (verifyTimer.current) window.clearTimeout(verifyTimer.current);
    const started = Date.now();
    const tick = () => {
      let current = "";
      try {
        current = localStorage.getItem(saveKey) || "";
      } catch {
        current = "";
      }
      const alive = current === payload;
      if (alive && Date.now() - started > 6_000) {
        setWriteStatus({ tone: "ok", text: `${why} — the game is running on the edited save.` });
        return;
      }
      if (!alive && current) {
        const reread = decodeSave(current);
        const kept = checks.length
          ? checks.filter((c) => JSON.stringify(readSavePath(reread?.data, c.path)) === JSON.stringify(c.next))
          : [];
        if (checks.length && kept.length === checks.length) {
          setWriteStatus({ tone: "ok", text: `${why} — the game rewrote its save and kept every new value.` });
        } else if (retryWrite.current && !retryUsed.current && checks.some((c) => c.created)) {
          // The game looked at the section the panel invented and threw it away — most
          // often because the amount is typed wrongly for it (a game that parses
          // `Amount` as text rejects a number with an InvalidCastException and drops
          // the section). Same edit, other shape, one more reload; the note says why.
          const again = retryWrite.current;
          retryUsed.current = true;
          retryWrite.current = null;
          setWriteStatus({
            tone: "warn",
            text: `${why} — the game did not keep it; writing the new wallet as ${checks.some((c) => c.created && typeof c.next === "string") ? "a number" : "text"} and reloading again.`,
          });
          again();
          return;
        } else {
          setWriteStatus({
            tone: "warn",
            text: `${why} — the game rewrote its save on boot; ${checks.length ? `${checks.length - kept.length} of ${checks.length} value(s) were replaced by its own` : "the edit may have been replaced"}.`,
          });
        }
        return;
      }
      verifyTimer.current = window.setTimeout(tick, 1_200);
    };
    verifyTimer.current = window.setTimeout(tick, 1_500);
  };

  /**
   * The same edit again with the *invented* wallets typed the other way.
   *
   * Only invented ones: a field the save already carried has a shape the game itself
   * chose, and retyping it would be a different (wronger) edit rather than a retry.
   * `undefined` when there is nothing to retype, which is the common case.
   */
  const shapeRetry = (base: unknown, list: CheatAction[], why: string) => {
    const invented = list.filter((a) => a.created);
    if (!invented.length) return undefined;
    return () => {
      const flipped = invented.map((a) => ({ path: a.path, next: flipWalletValue(a.next), created: true }));
      const next = applyCheatActions(
        base,
        invented.map((a) => ({ ...a, before: a.next, next: flipWalletValue(a.next) }))
      );
      setDecoded((prev) => (prev ? { ...prev, data: next } : prev));
      setEditing(JSON.stringify(next, null, 2));
      writeSave(
        next,
        `${why} — the same wallet as ${typeof flipWalletValue(invented[0].next) === "string" ? "text" : "a number"}`,
        undefined,
        flipped
      );
    };
  };

  const applyOne = (action: CheatAction) => {
    if (!decoded) return;
    const next = applyCheatActions(decoded.data, [action]);
    setDecoded({ ...decoded, data: next });
    setEditing(JSON.stringify(next, null, 2));
    writeSave(
      next,
      `${action.label} → ${String(action.next)}`,
      undefined,
      [{ path: action.path, next: action.next, created: action.created }],
      shapeRetry(decoded.data, [action], action.label)
    );
  };

  const applyBulk = (list: CheatAction[], why: string) => {
    if (!decoded || !list.length) return;
    const base = decoded.data;
    const next = applyCheatActions(base, list);
    setDecoded({ ...decoded, data: next });
    setEditing(JSON.stringify(next, null, 2));
    writeSave(
      next,
      why,
      undefined,
      list.map((a) => ({ path: a.path, next: a.next, created: a.created })),
      shapeRetry(base, list, why)
    );
  };

  const applyEdited = () => {
    const parsed = decodeSave(editing);
    if (!parsed) {
      onNote("That is not a save this panel can read — it takes JSON, base64 JSON, or the game's own `Name:::JSON|||…` section format.");
      return;
    }
    // A save that could not be decoded was almost certainly not JSON, so writing JSON
    // over it replaces the game's format with ours. Say so, once, at the moment it
    // matters — silently swapping the format is how a game ends up unable to load its
    // own save at all.
    if (!decoded && raw) {
      onNote("This game's save was not a format the panel could read — writing what you typed in its place.");
    }
    if (!frameReadable) {
      onNote("Written to this origin's storage. This game is embedded from another site, so it reads a different one — it will not see this.");
    }
    // Keep the encoding the game itself uses. A tutor edits the *decoded* text, which
    // parses as plain JSON; writing that over a sectioned or base64 save would hand the
    // game a payload it cannot read — the exact opposite of the point.
    writeSave(parsed.data, "Save edited by hand", decoded?.format ?? parsed.format);
  };

  /**
   * One press = a day of game time, for the rewards that only reset daily.
   *
   * Both halves of "a day passed" happen together, because either alone leaves a
   * whole class of games out: the frame's clock is moved forward (the shim applies it
   * at boot, so daily checks computed live all pass), and every timestamp the save
   * *stores* is moved back a day (so a game that compares its own recorded time
   * agrees). Then one reload. It is deliberately the same shape as the rest of the
   * panel: what it will change is on screen before the press, and the result is
   * confirmed after.
   */
  const simulateDay = () => {
    const next = dayOffset + DAY_MS;
    writeTimeOffset(gameKey, next);
    setDayOffset(next);
    const days = Math.round(next / DAY_MS);
    if (!frameReadable) {
      onNote("This game is embedded from another site, so its clock cannot be moved from here — the save's own timestamps are still shifted.");
    }
    const shifts = decoded ? listDayShiftActions(decoded.data) : [];
    if (decoded && shifts.length) {
      const shifted = applyCheatActions(decoded.data, shifts);
      setDecoded({ ...decoded, data: shifted });
      setEditing(JSON.stringify(shifted, null, 2));
      writeSave(
        shifted,
        `A day passed (+${days}) — ${shifts.length} stored date${shifts.length === 1 ? "" : "s"} moved back`,
        undefined,
        shifts.map((s) => ({ path: s.path, next: s.next }))
      );
      return;
    }
    onNote(`The game's clock is now ${days} day${days === 1 ? "" : "s"} ahead — reloading it so every daily timer believes a day passed.`);
    onReload();
  };

  /** Back to the real clock. The game notices on the next boot. */
  const resetClock = () => {
    writeTimeOffset(gameKey, 0);
    setDayOffset(0);
    onNote("The game's clock is back to real time — reloading it.");
    onReload();
  };

  /** Put back the save as it was before the last edit, and reload onto it. */
  const restoreBackup = () => {
    let payload = "";
    try {
      payload = localStorage.getItem(backupKey) || "";
    } catch {
      payload = "";
    }
    if (!payload) {
      onNote("There is no earlier save kept for this game.");
      return;
    }
    try {
      localStorage.setItem(saveKey, payload);
    } catch {
      onNote("Storage refused the write — the save could not be restored.");
      return;
    }
    const parsed = decodeSave(payload);
    setRaw(payload);
    setDecoded(parsed ?? null);
    setEditing(parsed ? JSON.stringify(parsed.data, null, 2) : payload);
    onReload(() => {
      try {
        localStorage.setItem(saveKey, payload);
      } catch {
        /* already reported */
      }
    });
    setWriteStatus({ tone: "ok", text: "Restored the save from before the last edit." });
    onNote("Restored the save from before the last edit — reloading the game onto it.");
  };

  /**
   * Reads the build's own files: the entry page, the scripts it points at, and the
   * data/wasm payload where the game keeps its strings.
   */
  const analyse = async () => {
    setAnalysing(true);
    setIntel(null);
    const hits = new Map<string, number>();
    const files: string[] = [];
    const dir = directoryOf(frameUrl);
    const entry = frameUrl ? (frameUrl.split("?")[0].split("/").pop() || "index.html") : "index.html";

    const merge = (found: Map<string, number>) => found.forEach((count, word) => hits.set(word, (hits.get(word) || 0) + count));

    try {
      if (dir) {
        setScanStep(`reading ${entry}`);
        const html = await fetchWithCap(`${dir}${entry}`, false);
        if (typeof html === "string") {
          files.push(entry);
          merge(scanTextFor(html, BUILD_INTEL_NEEDLES));
          const refs = referencedFiles(html);
          for (const ref of refs) {
            setScanStep(`reading ${ref.split("/").pop()}`);
            const url = /^\.?\//.test(ref) ? `${dir}${ref.replace(/^\.?\//, "")}` : `${dir}${ref}`;
            const body = await fetchWithCap(url, isBinary(ref));
            if (!body) continue;
            files.push(url.split("/").pop() || ref);
            if (typeof body === "string") merge(scanTextFor(body, BUILD_INTEL_NEEDLES));
            else merge(scanBinaryFor(new Uint8Array(body), BUILD_INTEL_NEEDLES));
          }
        }
      }
    } finally {
      setScanStep("");
      setIntel(summariseIntel(files, hits, Boolean(raw)));
      setAnalysing(false);
    }
  };

  const intelRows: { label: string; on: boolean; note: string }[] = intel
    ? [
        { label: "Rewarded ads", on: intel.rewardedAd, note: intel.rewardedAd ? "the game's own ad button now always pays out" : "this game never asks the SDK for a rewarded ad" },
        { label: "Interstitial ads", on: intel.interstitialAd, note: intel.interstitialAd ? "skipped instantly, no video plays" : "not used by this game" },
        { label: "Store / purchases", on: intel.store, note: intel.store ? "unlock the ownership flags below — that is what a purchase leaves behind" : "no store strings found in the build" },
      ]
    : [];

  const chip = "px-2 py-0.5 rounded-full border text-[10px] font-mono";

  return (
    /*
      Anchored inside the stage, so its width has to be a share of the *stage*, not
      of the viewport. `94vw` measured the whole window: on a phone the stage is
      ~318px wide while 94vw is ~366, and an absolutely-positioned box pinned to the
      right then has to spill left — 56px of the drawer ended up outside the stage's
      `overflow-hidden` frame, so the left column was simply invisible.
    */
    <div className="absolute right-2 top-2 z-30 w-[min(420px,94%)] max-h-[min(560px,86%)] overflow-y-auto rounded-xl border border-fuchsia-500/40 bg-slate-950/95 shadow-2xl shadow-fuchsia-500/10 backdrop-blur">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-800 bg-slate-950/95 px-3 py-2">
        <Sparkles className="w-4 h-4 text-fuchsia-400 shrink-0" />
        <span className="text-xs font-black tracking-wide text-fuchsia-200 uppercase">Cheat Engine</span>
        <span className="text-[10px] font-mono text-slate-500 truncate">{game.title}</span>
        <button onClick={onClose} className="ml-auto p-1 rounded border border-slate-700 text-slate-400 hover:text-slate-200" title="Close the Cheat Engine">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* ── one press, everything ────────────────────────────────────────── */}
        <button
          onClick={() => applyBulk(allActions, allActions.map((a) => a.label).join(", "))}
          disabled={!allActions.length}
          className="w-full rounded-lg border border-fuchsia-400/60 bg-fuchsia-500/25 px-3 py-2.5 text-left hover:bg-fuchsia-500/35 disabled:opacity-50"
        >
          <span className="block text-sm font-black tracking-wide text-fuchsia-100">⚡ MAX EVERYTHING</span>
          <span className="mt-0.5 block text-[11px] text-fuchsia-200/80">
            {allActions.length
              ? `Runs all ${allActions.length} cheat${allActions.length === 1 ? "" : "s"} found in this game's save${synthesis.length ? ` (including ${synthesis.length} wallet section${synthesis.length === 1 ? "" : "s"} it has not written yet)` : ""} and reloads it — money, unlocks and progress together.`
              : "Nothing to max yet — this game has not written a save. Ads always work; the day simulator and the lists below cover the rest."}
          </span>
        </button>

        {/* ── ads: nothing to press, so say so ─────────────────────────────── */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-[11px] text-emerald-100">
          <b className="text-emerald-300">Ads are already simulated.</b> Any “watch an ad for coins / a power-up” button in the game pays out the instant it is
          pressed — the ad never plays. Purchases become owned items through the save fields below.
        </div>

        {/* ── the save ─────────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
          <div className="flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">This game's save</span>
            <span className={`${chip} ml-auto ${raw ? "border-emerald-500/40 text-emerald-300" : "border-slate-700 text-slate-500"}`}>
              {raw ? `${raw.length.toLocaleString()} chars` : "empty"}
            </span>
            <button onClick={loadSave} className="p-1 rounded border border-slate-700 text-slate-400 hover:text-slate-200" title="Re-read the save">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          <p className="mt-1 text-[10px] font-mono text-slate-500 break-all">{saveKey}</p>
          {decoded ? (
            <p className="mt-1 text-[11px] text-slate-400">
              {fields} editable field{fields === 1 ? "" : "s"} · stored as {describeSaveFormat(decoded.format)}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-amber-200/90">
              {raw ? decodeError : "No save yet — play a round first, or paste one into the editor below."}
            </p>
          )}

          {/*
           * Which of the two things happened after a write.
           *
           * Shown next to the save rather than buried: for the games where the game
           * itself rewrites its save at boot, "it did not stick" is the answer the
           * tutor needs, and it has to be visible without opening anything.
           */}
          {writeStatus && (
            <p
              className={`mt-1.5 rounded border px-2 py-1 text-[10px] ${
                writeStatus.tone === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-100"
              }`}
            >
              {writeStatus.tone === "ok" ? "✓" : "⚠"} {writeStatus.text}
            </p>
          )}

          {backupAvailable && (
            <button
              onClick={restoreBackup}
              className="mt-1.5 px-2 py-1 rounded-lg border border-slate-700 text-slate-300 text-[10px] font-bold hover:border-slate-500"
              title="Write back the save this game had before the last cheat and reload onto it"
            >
              <Undo2 className="w-3 h-3 inline" /> Undo the last edit
            </button>
          )}

          {/*
           * The wallet a section-format game has not written yet.
           *
           * A game like this saves a currency section only once the currency changes,
           * so on a fresh profile the whole save has nothing money-shaped in it and
           * MAX EVERYTHING honestly answers "nothing to max". This is the button that
           * makes the first press pay out: the section names come from the build's own
           * class names (`DiamondsData`) and the field from its currency service
           * (`Amount`) — verified against a live build, not guessed.
           */}
          {synthesis.length > 0 && (
            <button
              onClick={() => applyBulk(synthesis, `Added ${synthesis.length} wallet section(s) the game had not written`)}
              className="mt-2 w-full rounded-lg bg-amber-500/15 border border-amber-500/40 px-2 py-1.5 text-left text-[11px] font-bold text-amber-200 hover:bg-amber-500/25"
            >
              💰 Add the wallet this game has not saved yet ({synthesis.map((a) => a.path.split(".")[0]).join(", ")})
              <span className="mt-0.5 block font-normal text-[10px] text-amber-200/80">
                These sections are where this kind of save keeps its money; the game reads them on the next boot.
                Written as {walletShape === "string" ? "text, the way this game writes its own amounts" : "a number"} — if the game
                drops the value instead, the panel writes it the other way once and says so.
              </span>
            </button>
          )}

          {decoded && (money.length > 0 || unlocks.length > 0 || progress.length > 0) && (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {money.length > 0 && (
                  <button
                    onClick={() => applyBulk(money, `${money.length} money field(s) set to ${CHEAT_MONEY.toLocaleString()}`)}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[11px] font-bold hover:bg-amber-500/30"
                  >
                    💰 Fill every currency
                  </button>
                )}
                {unlocks.length > 0 && (
                  <button
                    onClick={() => applyBulk(unlocks, `${unlocks.length} ownership flag(s) unlocked`)}
                    className="px-2 py-1 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200 text-[11px] font-bold hover:bg-fuchsia-500/30"
                  >
                    🔓 Emulate buying everything ({unlocks.length})
                  </button>
                )}
                {progress.length > 0 && (
                  <button
                    onClick={() => applyBulk(progress, `${progress.length} progress field(s) advanced`)}
                    className="px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-[11px] font-bold hover:bg-cyan-500/30"
                  >
                    ⏭️ Skip ahead ({progress.length})
                  </button>
                )}
              </div>

              <ul className="mt-2 space-y-1">
                {[...money, ...unlocks, ...progress].slice(0, 10).map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-[11px]">
                    {a.kind === "unlock" ? <Unlock className="w-3 h-3 text-fuchsia-400 shrink-0" /> : <Coins className="w-3 h-3 text-amber-400 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate text-slate-300" title={a.path}>
                      {a.label} <span className="font-mono text-slate-500">{a.path}</span>
                    </span>
                    <span className="font-mono text-slate-500">{a.created ? "new" : String(a.before)} →</span>
                    <button
                      onClick={() => applyOne(a)}
                      className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-200 font-mono hover:border-slate-500"
                      title={`Write ${String(a.next)} into ${a.path} and reload the game`}
                    >
                      {String(a.next)}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/*
         * ── a day passing ──────────────────────────────────────────────────
         *
         * The one cheat a save editor alone cannot deliver, because a game decides
         * "has a day passed?" from a clock, not from a boolean. Moving the clock is the
         * lever that works on any of these builds; moving the stored dates back is the
         * half that covers games comparing their own recorded time. Both at once.
         */}
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">Simulate a day passing</span>
            <span className="ml-auto text-[10px] font-mono text-cyan-300">{describeTimeOffset(dayOffset)}</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            For the rewards that only come round once a day. The game&apos;s clock is moved forward and the dates in its
            save are moved back, then it reloads — daily gifts, free currency, energy, streaks and spins all act as if a
            day passed. One press is one day; press again for two.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              onClick={simulateDay}
              className="px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-100 text-[11px] font-bold hover:bg-cyan-500/30"
            >
              ⏩ Simulate one day
            </button>
            {dayOffset > 0 && (
              <button
                onClick={resetClock}
                className="px-2 py-1 rounded-lg border border-slate-700 text-slate-300 text-[11px] font-bold hover:border-slate-500"
                title="Put the game's clock back to real time"
              >
                ↺ Back to real time
              </button>
            )}
          </div>
        </div>

        {/*
         * ── stores the game wrote itself ───────────────────────────────────
         *
         * This is the half that works on a game which never touches the Playables
         * SDK — a Cocos, Phaser or plain HTML5 build keeping its progress in its own
         * `localStorage`. Without it, “Cheat Engine” was a save editor for Unity
         * titles and a dead panel for everything else.
         */}
        {gameKeys.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
            <div className="flex items-center gap-2">
              <Coins className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">Stores this game wrote</span>
              <button onClick={refreshGameKeys} className="ml-auto p-1 rounded border border-slate-700 text-slate-400 hover:text-slate-200" title="Re-read what the game wrote">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {gameKeys.map((entry) => {
                const parsed = decodeSave(entry.value);
                const list = parsed ? listCheatActions(parsed.data) : [];
                return (
                  <li key={`${entry.store}:${entry.key}`} className="flex items-center gap-2 text-[11px]">
                    <span
                      className="min-w-0 flex-1 truncate text-slate-300"
                      title={`${entry.store}: ${entry.value.slice(0, 300)}`}
                    >
                      <span className="font-mono">{entry.key}</span>{" "}
                      <span className="font-mono text-slate-500">{entry.value.slice(0, 40)}</span>
                    </span>
                    <button
                      onClick={() => cheatOwnKey(entry)}
                      disabled={!list.length}
                      title={
                        list.length
                          ? `Max ${list.map((a) => a.path).join(", ")} in ${entry.key}, then reload the game`
                          : `${entry.key} is not a save this engine can read`
                      }
                      className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-200 font-mono hover:border-slate-500 disabled:opacity-40"
                    >
                      {list.length ? `max ${list.length}` : "—"}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-[10px] text-slate-500">
              Recorded as the game wrote them. “max” fills the money and ownership fields inside, the same way as the save above.
            </p>
          </div>
        )}

        {/* ── build analysis ───────────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">Analyse the game</span>
            <button
              onClick={analyse}
              disabled={analysing || !frameUrl}
              className="ml-auto px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-[11px] font-bold hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {analysing ? <Loader2 className="w-3 h-3 inline animate-spin" /> : "🔍 Scan the build files"}
            </button>
          </div>
          {!frameUrl && <p className="mt-1 text-[11px] text-slate-500">The game has not started yet, so there is no build to read.</p>}
          {analysing && <p className="mt-1 text-[11px] font-mono text-cyan-300">{scanStep || "reading the build…"}</p>}
          {intel && (
            <>
              <ul className="mt-2 space-y-1">
                {intelRows.map((row) => (
                  <li key={row.label} className="flex items-start gap-2 text-[11px]">
                    <span className={row.on ? "text-emerald-400" : "text-slate-600"}>{row.on ? "✅" : "—"}</span>
                    <span className="text-slate-300 font-semibold">{row.label}</span>
                    <span className="min-w-0 flex-1 text-slate-500">{row.note}</span>
                  </li>
                ))}
              </ul>
              {intel.words.length > 0 && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Currency words in the build:{" "}
                  <span className="font-mono text-slate-300">{intel.words.map((w) => `${w.word}×${w.count}`).join(", ")}</span>
                </p>
              )}
              {intel.notes.map((note) => (
                <p key={note} className="mt-1 text-[11px] text-amber-200/90">
                  {note}
                </p>
              ))}
            </>
          )}
        </div>

        {/* ── the save editor, for anything the scan cannot infer ───────────── */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">Save editor</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(editing).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="ml-auto px-2 py-1 rounded-lg border border-slate-700 text-slate-300 text-[11px] font-bold hover:border-slate-500"
            >
              <Copy className="w-3 h-3 inline" /> {copied ? "copied" : "copy"}
            </button>
            <button
              onClick={applyEdited}
              disabled={!editing.trim()}
              className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold hover:bg-emerald-500/30 disabled:opacity-50"
            >
              ✅ Write & reload
            </button>
          </div>
          <textarea
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
            spellCheck={false}
            placeholder='{"coins": 0, "level": 1}'
            className="mt-2 h-40 w-full resize-y rounded-lg border border-slate-800 bg-slate-950 p-2 font-mono text-[11px] text-slate-200 outline-none focus:border-cyan-500/50"
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Written to <span className="font-mono">{saveKey}</span>, then the game is reloaded onto it. Reloading first is what makes the game read it.
          </p>
          {!frameReadable && (
            <p className="mt-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100">
              This game is embedded straight from another site. Its save lives on that site&apos;s origin, so writing here cannot
              reach it — the Memory Editor below cannot read it either. Load the game through the console&apos;s proxy to use both.
            </p>
          )}
        </div>

        {/*
         * The Memory Editor — the other half of the Cheat Engine.
         *
         * The Save editor above rewrites what a game *saved*; this finds and changes
         * what it is *holding*, live, with no reload. They are separate tools because
         * they answer different questions, and a tutor diagnosing a stubborn game
         * wants both — see MemoryEditor.tsx for the full reasoning.
         */}
        <MemoryEditor game={game} frameRef={frameRef} crossOrigin={!frameReadable} onReload={onReload} onNote={onNote} />

        {applied.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <p className="text-[10px] font-mono text-slate-500 uppercase">Applied this session</p>
            <ul className="mt-1 space-y-0.5">
              {applied.map((a, i) => (
                <li key={`${a}-${i}`} className="text-[11px] text-emerald-200">
                  ✓ {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
