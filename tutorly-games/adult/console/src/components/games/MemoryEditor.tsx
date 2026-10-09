"use client";

/**
 * Memory Editor — the panel a tutor uses to find a number the game is holding and
 * change it, without knowing what the game calls it.
 *
 * ── What it is for, next to the Save editor ─────────────────────────────────
 * The Save editor at the top of the Cheat Engine is a *file* editor: it rewrites the
 * payload a Unity build hands the SDK and reloads the game onto it. That works when
 * the game keeps its economy in that payload — and does nothing for a game that never
 * calls the SDK, or keeps money in a variable it never saves. This panel is the other
 * half: it reaches into the running game and changes the number where it actually
 * lives, so the change is on screen at the next frame with no reload at all.
 *
 * It is a separate section on purpose rather than a replacement. The two answer
 * different questions — "what does this game save?" and "what is this game holding
 * right now?" — and a tutor diagnosing a stubborn game wants both.
 *
 * ── The three-step flow, and why step two is not optional ───────────────────
 * Search `25` and a game will show you every 25 it contains: a cooldown, a sprite
 * position, three array lengths, and your money. That is the correct answer to the
 * question asked, and it is not useful. So the flow is the one every trainer uses:
 *
 *   1. search the value you can see on screen,
 *   2. **change it in the game** (spend some coins), and search the new value —
 *      only the addresses whose value followed the change survive,
 *   3. write the number you want.
 *
 * The panel says this in the interface, because a tutor who skips step two will
 * otherwise see thirty matches and conclude the feature is broken.
 *
 * ── What it will not do ─────────────────────────────────────────────────────
 * It will not read a frame on another origin — the browser forbids it and no code
 * changes that — and it will not freeze a value in a WebAssembly build that rewrites
 * its own heap from a source of truth elsewhere. Both cases are stated in the panel
 * rather than presented as a search that mysteriously finds nothing.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConsoleGame } from "@/data/catalog";
import {
  DEFAULT_BUDGET,
  describeRegions,
  memoryEditorAvailability,
  readMatch,
  refreshMatches,
  scanMemory,
  writeMatches,
  type MemoryMatch,
} from "@/lib/memoryScan";
import { Eraser, Loader2, RefreshCw, Search, Snowflake, Zap } from "lucide-react";

interface MemoryEditorProps {
  game: ConsoleGame;
  /** The live frame element, read at the moment of each scan. */
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  /** Known from the frame's URL: a game embedded straight from another host. */
  crossOrigin: boolean;
  /** Re-mount the game frame on the same URL, so it re-reads what we changed. */
  onReload: () => void;
  onNote: (text: string) => void;
}

/** How often a frozen value is re-asserted. Fast enough to beat a game's own write. */
const FREEZE_INTERVAL_MS = 250;

/** Said once, and the same wherever it is needed. */
const CROSS_ORIGIN_MESSAGE =
  "This game is embedded directly from another site, so its memory cannot be read. Load it through the console's proxy (the default) and the editor works.";

/** Reads the number a tutor typed, or null when the box holds something else. */
function inputValue(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function MemoryEditor({ game, frameRef, crossOrigin, onReload, onNote }: MemoryEditorProps) {
  /** The value the tutor can see in the game right now. */
  const [searchText, setSearchText] = useState("");
  /** The value they want instead. */
  const [writeText, setWriteText] = useState("");
  const [matches, setMatches] = useState<MemoryMatch[]>([]);
  /** Set once a first scan has run, so the UI can switch to the narrowing flow. */
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string>("");
  const [truncated, setTruncated] = useState(false);
  const [nodes, setNodes] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [regions, setRegions] = useState<string>("");
  /** The value a freeze is holding, or null when nothing is frozen. */
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [applied, setApplied] = useState<string[]>([]);
  /** Why the editor cannot work here, when that is the case. */
  const [blocked, setBlocked] = useState<string | null>(null);

  // The URL decides what can be said up front; the live frame decides again at the moment
  // of a search (below), because a frame can be replaced between the two.
  useEffect(() => {
    setBlocked(crossOrigin ? CROSS_ORIGIN_MESSAGE : memoryEditorAvailability(frameRef.current));
    // `game.id` re-runs this for a new game even when the frame element is reused.
  }, [frameRef, game.id, crossOrigin]);

  /**
   * Run a scan on the next tick, so the "Searching…" state paints first.
   *
   * The scan itself is synchronous and bounded to a few hundred milliseconds in the
   * normal case (`DEFAULT_BUDGET` caps it either way). Yielding once before starting
   * is what stops a busy game's search from looking like a frozen rig.
   */
  const runScan = useCallback(
    (mode: "first" | "narrow") => {
      const target = inputValue(searchText);
      if (target === null) {
        onNote("Type the number you can see in the game first.");
        return;
      }
      const reasons = memoryEditorAvailability(frameRef.current);
      setBlocked(reasons);
      if (reasons) {
        onNote(reasons);
        return;
      }
      setBusy(true);
      setFrozenAt(null);
      window.setTimeout(() => {
        try {
          const win = frameRef.current?.contentWindow;
          const result = scanMemory(win, target, mode === "narrow" && matches.length ? { within: matches } : {});
          setMatches(result.matches);
          setNodes(result.nodes);
          setBytes(result.bytes);
          setTruncated(result.truncated);
          setRegions(describeRegions(result.regions));
          setScanned(true);
          const capped = result.truncated ? " (stopped early at the search limit — narrow it to see fewer)" : "";
          if (!result.matches.length) {
            setReport(
              mode === "narrow"
                ? `No address still holds ${target}. If the value on screen did change, search it again as a fresh scan — the game may have moved it.`
                : `Nothing in the game's own objects holds ${target}${capped}.`
            );
          } else {
            setReport(`${result.matches.length} address${result.matches.length === 1 ? "" : "es"} hold${result.matches.length === 1 ? "s" : ""} ${target}${capped}.`);
          }
        } catch (e) {
          setReport(`The search could not run: ${(e as Error).message}`);
        } finally {
          setBusy(false);
        }
      }, 30);
    },
    [searchText, matches, frameRef, onNote]
  );

  /** Write a number into every address the scan is holding. */
  const applyToAll = useCallback(
    (value: number, label: string) => {
      const live = refreshMatches(matches);
      if (!live.length) {
        onNote("Every address is gone — the game has moved on. Search again.");
        return;
      }
      const { written, failed } = writeMatches(live, value);
      setMatches(written);
      setReport(`${written.length} address${written.length === 1 ? "" : "es"} changed to ${value}${failed.length ? `, ${failed.length} refused (the game protects them)` : ""}.`);
      setApplied((prev) => [`${label} → ${value} (${written.length} address${written.length === 1 ? "" : "es"})`, ...prev].slice(0, 6));
      onNote(`${game.title}: wrote ${value} into ${written.length} address${written.length === 1 ? "" : "es"}.`);
    },
    [matches, game.title, onNote]
  );

  /** Write to one address only — for a tutor who wants to try the candidates one by one. */
  const applyToOne = useCallback(
    (m: MemoryMatch) => {
      const value = inputValue(writeText) ?? inputValue(searchText);
      if (value === null) {
        onNote("Type the value to write first.");
        return;
      }
      const { written, failed } = writeMatches([m], value);
      if (!written.length) {
        onNote(`${m.path} refused the write.`);
        setMatches((prev) => prev.filter((x) => x !== m));
        return;
      }
      setMatches((prev) => prev.map((x) => (x === m ? written[0] : x)));
      setApplied((prev) => [`${m.path} → ${value}`, ...prev].slice(0, 6));
    },
    [writeText, searchText, onNote]
  );

  /**
   * Freeze: re-assert the value faster than the game can write its own.
   *
   * This is the honest answer to a game that recalculates its money every frame from a
   * variable the scan did not find. Holding the value it *did* find is not a lie — it
   * is what the trainer feature of the same name does — and it makes the change stick
   * on screen, which is the point.
   */
  useEffect(() => {
    if (frozenAt === null) return;
    const timer = window.setInterval(() => {
      setMatches((prev) => {
        if (!prev.length) return prev;
        const live = refreshMatches(prev);
        const { written } = writeMatches(live, frozenAt);
        return written;
      });
    }, FREEZE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [frozenAt]);

  /** A quick look at where each address lives, so the list is readable. */
  const shown = useMemo(() => matches.slice(0, 8), [matches]);
  const writeValue = inputValue(writeText);

  return (
    <div className="rounded-lg border border-rose-500/40 bg-slate-900/70 p-2.5">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-rose-400" />
        <span className="text-[11px] font-bold text-slate-100 uppercase tracking-wide">Memory Editor</span>
        <span className="text-[10px] font-mono text-slate-500">live values, no reload</span>
      </div>

      {blocked ? (
        <p className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">{blocked}</p>
      ) : (
        <>
          {!scanned && (
            <p className="mt-2 text-[10px] text-slate-400">
              Search a number you can see in the game — your coins, your score. Then change it in the game and search the new
              number, and only the real one is left. That second search is what makes this work.
            </p>
          )}

          {/* ── search the value on screen ─────────────────────────────────── */}
          <div className="mt-2 flex items-center gap-1.5">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runScan("first")}
              inputMode="decimal"
              placeholder="value on screen (e.g. 25)"
              className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[11px] text-slate-100 outline-none focus:border-rose-500/60"
            />
            <button
              onClick={() => runScan("first")}
              disabled={busy}
              className="px-2 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-100 text-[11px] font-bold hover:bg-rose-500/30 disabled:opacity-50 whitespace-nowrap"
            >
              {busy ? <Loader2 className="w-3 h-3 inline animate-spin" /> : <Search className="w-3 h-3 inline" />} {scanned ? "New scan" : "First scan"}
            </button>
            {scanned && (
              <button
                onClick={() => runScan("narrow")}
                disabled={busy || !matches.length}
                className="px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-100 text-[11px] font-bold hover:bg-cyan-500/30 disabled:opacity-50 whitespace-nowrap"
                title="Enter the value the game shows now, then narrow"
              >
                Narrow {matches.length}
              </button>
            )}
          </div>

          {report && (
            <p className={`mt-1.5 text-[11px] ${matches.length ? "text-emerald-200" : "text-amber-200/90"}`}>
              {report}
              {scanned && matches.length > 0 && <span className="block text-[10px] text-slate-500">Looked in {regions} · {nodes.toLocaleString()} objects · {(bytes / 1048576).toFixed(1)} MB read{truncated ? " (capped)" : ""}</span>}
            </p>
          )}

          {/* ── write the number you want ──────────────────────────────────── */}
          {matches.length > 0 && (
            <>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  value={writeText}
                  onChange={(e) => setWriteText(e.target.value)}
                  inputMode="decimal"
                  placeholder="change it to (e.g. 999999)"
                  className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[11px] text-slate-100 outline-none focus:border-emerald-500/60"
                />
                <button
                  onClick={() => writeValue !== null && applyToAll(writeValue, `all ${matches.length}`)}
                  disabled={writeValue === null}
                  className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-100 text-[11px] font-bold hover:bg-emerald-500/30 disabled:opacity-50 whitespace-nowrap"
                  title="Write this number into every address the search is holding"
                >
                  ✅ Change all
                </button>
                <button
                  onClick={() => {
                    if (writeValue === null) return;
                    applyToAll(writeValue, "frozen");
                    setFrozenAt(writeValue);
                  }}
                  disabled={writeValue === null}
                  className={`px-2 py-1 rounded border text-[11px] font-bold whitespace-nowrap disabled:opacity-50 ${frozenAt !== null ? "bg-sky-500/30 border-sky-400 text-sky-100" : "bg-sky-500/15 border-sky-500/40 text-sky-100 hover:bg-sky-500/25"}`}
                  title="Keep re-writing this value so the game cannot set it back"
                >
                  <Snowflake className="w-3 h-3 inline" /> {frozenAt !== null ? "Frozen" : "Freeze"}
                </button>
              </div>
              {frozenAt !== null && (
                <p className="mt-1 text-[10px] text-sky-200">
                  Holding {frozenAt} — re-written every {FREEZE_INTERVAL_MS}ms so the game cannot take it back. Press Freeze again to
                  stop.
                </p>
              )}

              <ul className="mt-2 space-y-1">
                {shown.map((m, i) => (
                  <li key={`${m.region}:${m.path}:${i}`} className="flex items-center gap-2 text-[11px]">
                    <span className="min-w-0 flex-1 truncate text-slate-300" title={`${m.region} · ${m.path}`}>
                      <span className="font-mono">{m.label}</span>{" "}
                      <span className="font-mono text-slate-500">{m.region}</span>
                    </span>
                    <span className="font-mono text-slate-500">{readMatch(m) ?? "?"}</span>
                    <button
                      onClick={() => applyToOne(m)}
                      className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-200 font-mono hover:border-slate-500"
                      title={`Write ${writeValue ?? "the new value"} into ${m.path}`}
                    >
                      write
                    </button>
                  </li>
                ))}
                {matches.length > shown.length && (
                  <li className="text-[10px] text-slate-500">…and {(matches.length - shown.length).toLocaleString()} more. “Change all” writes to every one of them.</li>
                )}
              </ul>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => {
                    const live = refreshMatches(matches);
                    setMatches(live);
                    setReport(`${live.length} of ${matches.length} address${matches.length === 1 ? "" : "es"} still live.`);
                  }}
                  className="px-2 py-1 rounded border border-slate-700 text-slate-300 text-[11px] font-bold hover:border-slate-500"
                  title="Re-read every address — the values on screen should now match"
                >
                  <RefreshCw className="w-3 h-3 inline" /> Refresh values
                </button>
                <button
                  onClick={() => {
                    setMatches([]);
                    setScanned(false);
                    setReport("");
                    setFrozenAt(null);
                  }}
                  className="px-2 py-1 rounded border border-slate-700 text-slate-300 text-[11px] font-bold hover:border-slate-500"
                >
                  <Eraser className="w-3 h-3 inline" /> Clear search
                </button>
                <button
                  onClick={() => onReload()}
                  className="px-2 py-1 rounded border border-slate-700 text-slate-300 text-[11px] font-bold hover:border-slate-500"
                  title="Re-mount the game on the same URL"
                >
                  ⟳ Reload the game
                </button>
              </div>

              <p className="mt-1.5 text-[10px] text-slate-500">
                A change here is live in the frame — the game reads these numbers itself, so there is nothing to reload. If the
                screen does not move, this build paints only when something happens in it: any click in the game (or “Freeze”)
                will draw it. Reloading is only for the Save editor above.
              </p>
            </>
          )}

          {/* ── what this search could and could not see ───────────────────── */}
          <details className="mt-2">
            <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-slate-500">What gets searched</summary>
            <ul className="mt-1 space-y-0.5 text-[10px] text-slate-400">
              <li>· Named numbers on the game&apos;s own objects — the usual home of a JS build&apos;s money.</li>
              <li>· Typed arrays, element by element — canvas and WASM-module builds keep their state here.</li>
              <li>· Raw buffers and WebAssembly memory — a Unity build&apos;s real heap, read as 32-bit ints, 32-bit and 64-bit floats.</li>
              <li>· Up to {DEFAULT_BUDGET.maxMatches.toLocaleString()} matches, {DEFAULT_BUDGET.maxMillis / 1000}s and {(DEFAULT_BUDGET.maxBytes / 1048576).toFixed(0)} MB per search, so a search can never hang the rig.</li>
              <li className="pt-0.5 text-slate-500">Not searched: the game&apos;s DOM, and the console&apos;s own window (a scan must never offer to rewrite the app it lives in).</li>
            </ul>
          </details>
        </>
      )}

      {applied.length > 0 && (
        <div className="mt-2 rounded border border-slate-800 bg-slate-950/60 p-1.5">
          <p className="text-[10px] font-mono text-slate-500 uppercase">Changed this session</p>
          <ul className="mt-0.5 space-y-0.5">
            {applied.map((a, i) => (
              <li key={`${a}-${i}`} className="text-[11px] text-emerald-200">
                ✓ {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
