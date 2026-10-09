"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ConsoleGame } from "@/data/catalog";
import { soundEffects } from "@/utils/audio";
import {
  detectProxy,
  failoverProxy,
  proxiedGameUrl,
  resetProxyProbe,
  resolvePlayable,
} from "@/lib/proxy";
import MagicPenOverlay from "./MagicPenOverlay";
import CheatDrawer from "./CheatDrawer";
import { describeReset, hardResetGame, productNameFrom } from "@/lib/gameReset";
import { installGameStorageRecorder, rememberGameHost, storageKeyFor } from "@/lib/gameKeys";
import {
  ExternalLink,
  RotateCcw,
  Maximize2,
  Volume2,
  VolumeX,
  Loader2,
  AlertTriangle,
  Brush,
  Eraser,
  Sparkles,
  Play,
} from "lucide-react";

export interface SdkEvent {
  type: string;
  at: number;
  detail?: string;
}

interface PlayableStageProps {
  game: ConsoleGame;
  soundEnabled: boolean;
  onToggleSound?: () => void;
  onScoreReported: (score: number, auto: boolean) => void;
  onSdkEvent?: (event: SdkEvent) => void;
  /**
   * Bumped when the console is about to delete what the running game is holding.
   *
   * Unity keeps `PlayerPrefs` in an IndexedDB database and its build files in
   * another, both open for as long as its frame lives. A delete issued against an
   * open database is `blocked`: the browser answers nothing, the database stays,
   * and the game carries on from where it was — which is exactly what happened
   * when `CLEAR CACHE` ran with a game on screen. So the frame is taken down first,
   * and the tutor gets a stopped game with a PLAY button rather than a frozen one.
   */
  stopSignal?: number;
}

type Status = "resolving" | "loading" | "ready" | "error" | "stopped";

/**
 * How a proxy is judged, without ever guessing whether the game is just slow.
 *
 * A proxy can pass the handshake and still not serve the build — a folder that is
 * half-uploaded, a host that reaches the Playables page but not the asset CDN, a
 * firewall that allows small requests and drops 30 MB ones. In that case the frame
 * either never finishes arriving, or arrives as something that is not the build.
 *
 * The two questions asked here are answered by evidence, not by a stopwatch on the
 * game: did the page arrive at all, and did the game's own SDK start running in it?
 * The `ytgame` shim is injected by the proxy into the build's HTML, so if it has
 * executed, this proxy really did serve and rewrite the game. Unity then takes as
 * long as it takes, and the player waits for it without moving.
 */
const DOC_PATIENCE_MS = 15_000;
/** The document arrived; the shim must have run soon after for this to be the build. */
const START_PATIENCE_MS = 9_000;
/** While no proxy answers at all, look again this often. A deploy can land mid-lesson. */
const REPROBE_EVERY_MS = 6_000;
/** How often the frame is asked whether it is still making progress. */
const WATCH_EVERY_MS = 1_500;

export default function PlayableStage({
  game,
  soundEnabled,
  onToggleSound,
  onScoreReported,
  onSdkEvent,
  stopSignal,
}: PlayableStageProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<Status>("resolving");
  const [frameUrl, setFrameUrl] = useState<string>("");
  const [buildHost, setBuildHost] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [sdkLoaded, setSdkLoaded] = useState(false);
  /**
   * The game key the shim reported.
   *
   * The shim names the save slot from the frame's own path and posts that name on every
   * message, so this is the one value that is certainly the key the game reads. The Cheat
   * Engine prefers it over anything it could derive — see `CheatDrawer`.
   */
  const [sdkGameKey, setSdkGameKey] = useState<string>("");
  const [gameReady, setGameReady] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  /**
   * A soft reload: re-mounts the frame on the URL it already has — and, when the Cheat
   * Engine hands one along, runs a save write at the only moment it survives.
   *
   * ── Why this is separate from `reloadNonce` ─────────────────────────────────
   * `reloadNonce` re-runs the whole resolve — tear the frame down, probe for a proxy,
   * build a new URL — which is right for "this build is broken, try the next proxy" and
   * wrong for "I just rewrote the game's save". On a deployment with no proxy answering
   * the resolve ends by *returning without setting a frame URL*, so the frame stayed
   * unmounted and the game never came back: the tutor pressed “Write & reload”, the save
   * was written correctly, and the only visible result was that their game vanished.
   * That is the bug this exists to fix. A frame re-mounted on its own URL re-runs the
   * game's own boot code, which is exactly what re-reads a save, and it cannot fail for
   * a reason that has nothing to do with the save.
   *
   * ── Why the frame is killed *before* the write ───────────────────────────────
   * A Unity build saves its own state as it unloads. The old order — write the save,
   * then bump the nonce — left the dying game writing its *old* numbers into the same
   * key a moment after the edit landed, so the game came back showing exactly what it
   * showed before. It looked like the Save editor did nothing; it was doing everything
   * and being overwritten. Navigating the frame to `about:blank` first makes the
   * game's final write happen before ours, and the remount then boots from a payload
   * that is certainly the one the tutor asked for.
   */
  const [frameNonce, setFrameNonce] = useState(0);
  const reloadGame = useCallback((write?: () => void) => {
    try {
      iframeRef.current?.contentWindow?.location.replace("about:blank");
      iframeRef.current?.setAttribute("src", "about:blank");
    } catch {
      /* a cross-origin frame refuses location access; React teardown still runs */
    }
    setSdkLoaded(false);
    setGameReady(false);
    // Long enough for the game's unload write to have happened, short enough that the
    // reload still reads as immediate on a projector.
    window.setTimeout(() => {
      try {
        write?.();
      } catch {
        /* the drawer reports a failed write itself */
      }
      setFrameNonce((n) => n + 1);
    }, 500);
  }, []);
  const [penActive, setPenActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [unityError, setUnityError] = useState<string | null>(null);
  /**
   * Errors the GAME itself reports while it plays.
   *
   * A Unity Playable runs its own code and its failures are silent in the rig: the
   * console prints `NullReferenceException: Object reference not set…` into the
   * browser console and the game simply carries on with a section that does not
   * work. Nobody teaching a class has a devtools console open, so the frame's own
   * `console.error`, `error` and `unhandledrejection` are collected here and shown
   * under the rig with a Copy button — the exact text to paste when asking the
   * game's publisher what broke.
   */
  const [gameErrors, setGameErrors] = useState<string[]>([]);
  const gameErrorsRef = useRef<string[]>([]);
  /**
   * Whether the failure details are open.
   *
   * A wall of red text above the game is the wrong shape for a classroom: it takes
   * the screen for something the tutor may not need, and a game that reports one
   * recoverable error looks as broken as one that died. The rig therefore shows a
   * single badge next to the build line, and the text is one click away.
   */
  const [errorsOpen, setErrorsOpen] = useState(false);
  /** Cheat Engine: the drawer that reads this game's save and writes cheats back. */
  const [cheatOpen, setCheatOpen] = useState(false);
  // Hard reset runs from one deliberate click; the browser confirmation is less
  // error-prone than a hidden two-tap state when a class is watching.
  const [resetNote, setResetNote] = useState<string>("");
  /**
   * Set while a hard reset is running, so the rig can say what it is doing rather
   * than looking frozen: the frame is taken down first, which takes a moment.
   */
  const [resetting, setResetting] = useState(false);
  /**
   * The freshness marker the hard reset puts in the game's URL.
   *
   * A page cannot clear the browser's HTTP cache, and it cannot evict Unity's own
   * `UnityCache` reliably either. It *can* ask for the build under a URL nothing
   * has ever requested: the proxy folds this value into the token stamped onto
   * every build file, so a reset really is a fresh download of a fresh set.
   */
  const [freshNonce, setFreshNonce] = useState("");
  /** Which proxy the current attempt is using, said the way a tutor would. */
  const [proxyNote, setProxyNote] = useState<string>("");
  /**
   * The proxy that is actually streaming the game on screen.
   *
   * Kept separate from `proxyNote` (which is only shown while loading) because the
   * useful fact after a lesson starts is simply *which* copy of the proxy is doing
   * the work: a tutor comparing two deployments can read it off the rig.
   */
  const [proxyLabel, setProxyLabel] = useState<string>("");
  const [proxyTried, setProxyTried] = useState<string[]>([]);
  const [reprobing, setReprobing] = useState(false);

  /** The proxy the frame on screen was built from, so failover can tell it changed. */
  const currentBaseRef = useRef<string>("");
  /** Failover hops for the current game, reset whenever the game changes. */
  const hopsRef = useRef(0);
  /** When the current frame URL was handed to the browser. */
  const frameAtRef = useRef(0);
  /** When that frame's own document finished arriving (0 = not yet). */
  const frameLoadedRef = useRef(0);
  /** True once a different proxy has already been tried for this game. */
  const servedByRef = useRef(false);
  const sdkLoadedRef = useRef(false);
  /** Guards against two failovers starting at once. */
  const hoppingRef = useRef(false);

  const emit = useCallback(
    (type: string, detail?: string) => {
      onSdkEvent?.({ type, at: Date.now(), detail });
    },
    [onSdkEvent]
  );

  /**
   * Move to the next proxy that answers and load the game again through it.
   *
   * Central to the whole feature: rather than ever telling the class that a game
   * cannot be played here, the player tries the next place the proxy could be. It
   * only gives up on the *hop* — the loading overlay stays up and keeps retrying,
   * because a proxy that is missing at 09:00 is often there at 09:20.
   */
  const advanceProxy = useCallback(
    async (reason: string): Promise<boolean> => {
      hopsRef.current += 1;
      emit("proxyFailover", `${reason} — trying the next proxy`);
      const next = await failoverProxy();
      setProxyTried([...(next.tried || [])]);
      if (next.available && next.base !== currentBaseRef.current) {
        currentBaseRef.current = next.base;
        servedByRef.current = true;
        sdkLoadedRef.current = false;
        setProxyNote(`${next.label} (${next.index + 1} of ${next.total})`);
        setStatus("resolving");
        setReloadNonce((n) => n + 1);
        return true;
      }
      // Nothing new answered. Forget what was cached so the next pass really asks
      // every candidate again, and keep the overlay up.
      resetProxyProbe();
      setReprobing(true);
      setProxyNote("looking for a proxy…");
      return false;
    },
    [emit]
  );

  // Resolve the game into an iframe-able URL
  useEffect(() => {
    let cancelled = false;
    setStatus("resolving");
    setErrorMsg("");
    setFrameUrl("");
    setSdkLoaded(false);
    setGameReady(false);
    setElapsed(0);

    async function run() {
      if (game.source !== "youtube") {
        // A platform game (CrazyGames, itch) carries its own framable build URL.
        // Poki used to arrive here as a proxied build instead, but its real build
        // host refuses foreign frames (403 + X-Frame-Options: SAMEORIGIN), so no
        // platform is indexed through the proxy today.
        if (!cancelled) {
          setFrameUrl(game.directUrl || "");
          setBuildHost(game.source === "local" ? "local build" : "external host");
          setStatus("loading");
        }
        return;
      }

      // A build on a host that allows framing (not YouTube's CDN) needs no proxy.
      if (game.prebuiltUrl) {
        if (!cancelled) {
          setBuildHost(game.buildHost || "");
          setFrameUrl(game.prebuiltUrl!);
          setStatus("loading");
          emit("resolved", `${game.buildHost} (direct embed)`);
        }
        return;
      }

      const info = await detectProxy();
      if (cancelled) return;

      setProxyNote(info.available ? `${info.label} (${info.index + 1} of ${info.total})` : "looking for a proxy…");
      setProxyTried([...(info.tried || [])]);
      setReprobing(false);

      // Catalog games carry their build location, so the frame URL is built here.
      if (game.buildHost && game.entryPath) {
        setBuildHost(game.buildHost);
        if (!info.available) {
          // No proxy answering *yet*. Stay in the loading state and keep looking:
          // the alternative used to be a "Play this game on YouTube" screen, which
          // hands a tutor a dead end in front of a class.
          setStatus("resolving");
          emit("proxyWaiting", info.detail || "no proxy answering yet");
          return;
        }
        currentBaseRef.current = info.base;
        servedByRef.current = info.index > 0;
        setProxyLabel(info.index > 0 ? info.label : "");
        frameAtRef.current = Date.now();
        frameLoadedRef.current = 0;
        setFrameUrl(proxiedGameUrl(info, game.buildHost, game.entryPath, game.hash, freshNonce));
        setStatus("loading");
        emit("resolved", `${game.buildHost}.playables.usercontent.goog (indexed, ${info.kind} via ${info.label})`);
        return;
      }

      // Not in the catalog: ask YouTube through the proxy.
      const resolved = await resolvePlayable(game.id, info);
      if (cancelled) return;
      if (resolved.error || !resolved.buildHost) {
        setErrorMsg(resolved.error || "Unable to resolve this Playable.");
        setStatus("error");
        return;
      }
      const via = await detectProxy();
      if (cancelled) return;
      currentBaseRef.current = via.base;
      servedByRef.current = hopsRef.current > 0;
      setProxyLabel(via.index > 0 ? via.label : "");
      frameAtRef.current = Date.now();
      frameLoadedRef.current = 0;
      setBuildHost(resolved.buildHost);
      setFrameUrl(proxiedGameUrl(via, resolved.buildHost, resolved.entryPath, resolved.hash, freshNonce));
      setStatus("loading");
      emit("resolved", `${resolved.buildHost}.playables.usercontent.goog (live via ${via.label})`);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [game.id, game.source, game.directUrl, game.prebuiltUrl, game.buildHost, game.entryPath, game.hash, reloadNonce, freshNonce, emit]);

  /**
   * The watchdog that makes the failover real.
   *
   * Two things are watched while a game is loading:
   *   · no proxy answered at all → look again every few seconds;
   *   · a frame is on screen whose page or game never arrived → advance to the
   *     next proxy.
   * Both paths keep the class in the loading state. Neither shows an error.
   */
  useEffect(() => {
    if (game.source !== "youtube" || game.prebuiltUrl) return;

    // Nothing answered at all: keep asking, behind the loading overlay.
    if (status === "resolving" && !frameUrl) {
      const t = setTimeout(() => {
        setReprobing(true);
        void advanceProxy("no proxy answered");
      }, REPROBE_EVERY_MS);
      return () => clearTimeout(t);
    }

    // A frame is on screen but the game is not confirmed to be in it. Ask the two
    // questions above, and hop when the answer is "this proxy is not serving it".
    if (status === "loading" && frameUrl && !sdkLoaded) {
      const check = () => {
        if (hoppingRef.current) return;
        const loaded = frameLoadedRef.current;
        const stalled = loaded
          ? Date.now() - loaded > START_PATIENCE_MS
          : Date.now() - frameAtRef.current > DOC_PATIENCE_MS;
        if (!stalled) return;
        hoppingRef.current = true;
        void advanceProxy(
          loaded
            ? "the page arrived but the game inside it never started"
            : "the page never finished arriving"
        ).then((moved) => {
          hoppingRef.current = false;
          // Every candidate has now been tried for this game. Reloading again would
          // only restart a download that may well be nearly finished, so whatever
          // is on screen is handed over as usable — Unity's own loader is usually
          // still working in it — with the proxy note left visible as the reason.
          if (moved || !currentBaseRef.current) return;
          setProxyNote("no other proxy answered — playing through this one");
          setStatus("ready");
        });
      };
      const t = setInterval(check, WATCH_EVERY_MS);
      check();
      return () => clearInterval(t);
    }
    return undefined;
  }, [status, frameUrl, sdkLoaded, game.source, game.prebuiltUrl, advanceProxy]);

  // A Unity build that dies inside the frame is a *this proxy, this build* failure:
  // try the next proxy once before assuming the build itself is broken.
  useEffect(() => {
    if (!unityError) return;
    if (hopsRef.current > 0) return;
    void advanceProxy("the build stopped inside the frame");
  }, [unityError, advanceProxy]);

  // Listen to ytgame shim events from the game frame
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data;
      if (!d || d.source !== "tutorly-ytgame") return;
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;

      // Recorded before the switch: every shim message carries it, so whichever event
      // arrives first is enough to know where this game's save lives.
      if (typeof d.gameKey === "string" && d.gameKey) setSdkGameKey(d.gameKey);

      switch (d.type) {
        case "sdkLoaded":
          // The shim is injected by the proxy, so its execution is proof that this
          // proxy served and rewrote the actual build. Unity's own loading from
          // here on is normal waiting, not a broken proxy.
          sdkLoadedRef.current = true;
          setSdkLoaded(true);
          setStatus((s) => (s === "loading" ? "ready" : s));
          emit("sdkLoaded", `ytgame shim attached${servedByRef.current ? " (after a proxy change)" : ""}`);
          break;
        case "firstFrameReady":
          setStatus("ready");
          setProxyTried([]);
          emit("firstFrameReady");
          break;
        case "gameReady":
          setGameReady(true);
          setStatus("ready");
          emit("gameReady", "game reports ready");
          soundEffects.playCoin();
          break;
        case "score": {
          const v = Number(d.value);
          if (Number.isFinite(v)) {
            onScoreReported(v, true);
            emit("score", v.toLocaleString());
          }
          break;
        }
        case "saveData":
          emit("saveData", `${d.bytes} bytes`);
          break;
        case "loadData":
          emit("loadData", `${d.bytes} bytes`);
          break;
        case "ad":
          // Rewarded ads are simulated as *watched*, so the game has just handed over
          // its reward. Saying "skipped" would read as if the player lost it.
          emit("ad", d.kind === "rewarded" ? (d.granted === false ? "rewarded (not granted)" : "rewarded · reward granted") : `${d.kind} · skipped`);
          break;
        case "runtimeError":
          setUnityError(String(d.message || "Runtime error in the game frame"));
          emit("runtimeError", d.message);
          break;
        default:
          emit(d.type);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [emit, onScoreReported]);

  /**
   * Unity reports a fatal error in a dialog of its own INSIDE the frame, which
   * reads "An error occurred running the Unity content on this page" followed by
   * the exception. The console can read it (the proxied frame is same-origin), so
   * the player gets an explanation and a way out instead of a dead canvas.
   *
   * The common cause is a half-updated build: a Unity build only works as a set
   * (one function table shared by the loader `.js`, the `.wasm` and the `.data`),
   * so if the browser kept one file from cache while fetching the others after a
   * Playable was updated, the first JS→wasm call through a stale table index dies
   * with `RuntimeError: null function or function signature mismatch`. The proxy
   * now revalidates those files instead of caching them blind (`playablesCacheControl`
   * in server.ts, `tutorly_cache_control` in play.php), so a reload fixes it.
   */
  useEffect(() => {
    if (status !== "loading" && status !== "ready") return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > 60000) {
        clearInterval(timer);
        return;
      }
      try {
        const text = iframeRef.current?.contentDocument?.body?.innerText || "";
        if (/An error occurred running the Unity content/i.test(text)) {
          const line = text
            .split("\n")
            .map((l) => l.trim())
            .find((l) => /^(RuntimeError|RangeError|TypeError|Error):/.test(l));
          setUnityError(line || "Unity stopped with a runtime error.");
          clearInterval(timer);
        }
      } catch {
        // A cross-origin frame (a direct-embed game) cannot be read — stop asking.
        clearInterval(timer);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [status, game.id, reloadNonce]);

  useEffect(() => {
    setUnityError(null);
    hopsRef.current = 0;
    hoppingRef.current = false;
    sdkLoadedRef.current = false;
    frameLoadedRef.current = 0;
    // The reported key belongs to the frame that was on screen; a new game means the
    // old name is worse than no name at all.
    setSdkGameKey("");
  }, [game.id, reloadNonce]);

  /**
   * Stop, on purpose, because the console is about to delete what this frame holds.
   *
   * A Unity build keeps `PlayerPrefs` in IndexedDB and its own build cache in a
   * second database, both open while the frame lives. Deleting an open database is
   * `blocked` — the browser stays silent, the data stays, and the game carries on
   * from the level it was on. That is why a cleared cache used to leave a game at
   * level 4. The frame goes first; the tutor gets a stopped game and a PLAY button
   * instead of a game that pretends nothing happened.
   */
  useEffect(() => {
    if (!stopSignal) return;
    try {
      iframeRef.current?.contentWindow?.location.replace("about:blank");
      iframeRef.current?.setAttribute("src", "about:blank");
    } catch {
      /* a cross-origin frame refuses location access; React teardown still runs */
    }
    setFrameUrl("");
    setSdkLoaded(false);
    setGameReady(false);
    setStatus("stopped");
  }, [stopSignal]);

  /** Remember a game error once, keeping the newest few. */
  const noteGameError = useCallback((raw: string) => {
    const text = raw.replace(/\s+/g, " ").trim().slice(0, 400);
    if (!text) return;
    if (gameErrorsRef.current.includes(text)) return;
    gameErrorsRef.current = [...gameErrorsRef.current, text].slice(-4);
    setGameErrors(gameErrorsRef.current);
  }, []);

  /**
   * Listen inside the frame. A proxied build is same-origin, so the parent can wrap
   * the frame's own console and catch its uncaught errors; a direct-embed game on
   * another origin cannot be read at all, and is simply not listened to.
   */
  useEffect(() => {
    if (!frameUrl) return;
    let wrapped: { win: any; original: any } | null = null;
    const attach = () => {
      try {
        const win = iframeRef.current?.contentWindow as any;
        if (!win || wrapped?.win === win) return;
        const original = win.console?.error?.bind(win.console);
        wrapped = { win, original };
        if (win.console) {
          win.console.error = (...args: any[]) => {
            noteGameError(args.map((a) => (typeof a === "string" ? a : (a?.message ?? String(a)))).join(" "));
            original?.(...args);
          };
        }
        win.addEventListener?.("error", (e: any) => noteGameError(String(e?.message || e?.error?.message || "Script error")));
        win.addEventListener?.("unhandledrejection", (e: any) => noteGameError(String(e?.reason?.message || e?.reason || "Unhandled rejection")));
      } catch {
        // A cross-origin frame cannot be listened to; nothing to do.
      }
    };
    attach();
    const timer = setInterval(attach, 1200);
    return () => {
      clearInterval(timer);
      try {
        if (wrapped && wrapped.original && wrapped.win?.console) wrapped.win.console.error = wrapped.original;
      } catch {
        /* the frame is gone; nothing to restore */
      }
    };
  }, [frameUrl, reloadNonce, noteGameError]);

  // Session timer
  useEffect(() => {
    if (status !== "ready" && status !== "loading") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // Forward audio toggles to the game (ytgame.system.onAudioEnabledChange)
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: "tutorly-host", type: "audio", enabled: soundEnabled },
      "*"
    );
  }, [soundEnabled, status]);

  const handleFrameLoad = () => {
    // The document arrived. For a proxied Playable that is only half the question —
    // whether the *game* is in there is answered by the shim (see `sdkLoaded`) — so
    // the timestamp is recorded and the watchdog keeps working. A game that needs no
    // proxy is ready as soon as its page is.
    frameLoadedRef.current = Date.now();
    // Watch what the game writes from here on. Its progress may live under a name
    // that says nothing about the game (`playerLevel`, `save`), and no rule that
    // matches by name can ever find those keys again — so they are written down as
    // they are created, and a reset clears exactly the keys this game made.
    installGameStorageRecorder(iframeRef.current, storageKeyFor(game));
    // Write down the name this game is using today. A Playable's save is keyed by build
    // host and YouTube changes that host when a game is republished, so without this
    // list an older save is a level the reset cannot name (and therefore cannot clear).
    rememberGameHost(game.id, storageKeyFor(game));
    if (game.source !== "youtube" || game.prebuiltUrl) setStatus("ready");
  };

  /**
   * Start this game over from nothing.
   *
   * A plain reload fetches the page again but leaves the game's own state in place,
   * and it reuses whatever the browser and Unity have already cached. This does
   * three things in the only order that works:
   *
   *   1. Take the frame down. Deleting an IndexedDB database while the page holding
   *      it is still open blocks the delete, and a blocked delete does nothing —
   *      this was the reason an earlier version of this button appeared to run and
   *      changed nothing. The game's page has to be gone first.
   *   2. Clear: the `ytgame` save payload, any key or database named after the
   *      game, Unity's Cache Storage caches (by name and by URL) and Unity's
   *      `UnityCache` rows for this build.
   *   3. Load the game again under a URL that carries a freshness marker, which
   *      makes the proxy stamp every build file with a new token — so the set comes
   *      off the network, not out of a cache nobody can reach.
   *
   * The note afterwards is the report: what was actually cleared, and anything that
   * could not be, rather than an optimistic "done".
   */
  const hardReset = async () => {
    if (resetting) return;
    setResetting(true);
    setResetNote("Clearing this game's saved data and cached files…");
    soundEffects.playClick();

    // Both of these have to be read while the frame is still there.
    const productName = productNameFrom(iframeRef.current);
    let crossOrigin = false;
    try {
      crossOrigin = !!frameUrl && new URL(frameUrl).origin !== window.location.origin;
    } catch {
      crossOrigin = false;
    }

    // 1. Navigate the iframe away synchronously, then remove it from React's
    // tree. This closes Unity's IndexedDB connection before deletion is attempted;
    // merely changing React state and waiting a few hundred milliseconds was not
    // enough for Chromium and caused a blocked delete to be reopened by level 4.
    try {
      iframeRef.current?.contentWindow?.location.replace("about:blank");
      iframeRef.current?.setAttribute("src", "about:blank");
    } catch {
      /* cross-origin frames may reject location access; React teardown still runs */
    }
    setFrameUrl("");
    setStatus("resolving");
    await new Promise((resolve) => setTimeout(resolve, 900));

    // 2. Clear what is genuinely this game's.
    const report = await hardResetGame({
      gameKey: storageKeyFor(game),
      id: game.id,
      buildHost: game.buildHost,
      productName,
      crossOrigin,
      // A folder the tutor uploaded is the game itself, not a cache of it: clearing
      // its `.wasm`/`.data` would leave nothing to start over *from*.
      preserveLocalBuild: game.source === "local",
    });

    gameErrorsRef.current = [];
    setGameErrors([]);
    setUnityError(null);
    setResetNote(describeReset(report));
    soundEffects.playCoin();
    setResetting(false);

    // 3. A URL nothing has ever requested, so the build is fetched, not recalled.
    // Date.now() can be frozen by a browser restore/session replay; the random
    // suffix makes every reset unambiguously different even in that situation.
    const fresh = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    setFreshNonce(fresh);
    setReloadNonce((n) => n + 1);
    setTimeout(() => setResetNote(""), 14000);
  };

  const fullscreen = () => {
    const el = iframeRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    el.focus();
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const busy = status === "resolving" || status === "loading";

  return (
    <div className="relative w-full bg-black flex flex-col">
      {/*
        Console top bar.

        ── Why it is allowed to grow and wrap ──────────────────────────────────────
        It used to be one locked 44-pixel row (`h-11`) holding the game's name on the
        left and the whole control set on the right, with the controls marked
        `shrink-0`. On a phone that row is ~250 pixels wide and the controls need ~350,
        so the row simply overflowed and the last buttons — Fullscreen, and “Open on
        YouTube” on a Playable — sat outside the bar and, at 320px, outside the screen
        altogether. Nothing about that failure was visible in the layout: the bar kept
        its height, so it looked deliberate.

        A tutor on a phone is not a smaller desktop. So the bar now grows (`min-h-11`,
        never a fixed height), its two halves wrap onto separate rows below `sm`, and
        the control strip itself wraps — which is what makes "the last button is
        always reachable" a property of the layout rather than a hope about widths.
      */}
      <div className="min-h-11 bg-slate-950 border-b border-slate-800 px-2 sm:px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-300 z-20 gap-x-2 gap-y-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              status === "ready" ? "bg-emerald-400 animate-pulse" : status === "error" ? "bg-red-500" : "bg-amber-400 animate-pulse"
            }`}
          />
          <span className="font-bold text-white uppercase truncate">{game.title}</span>              <span className="hidden md:inline text-slate-500 truncate">
            {game.source === "youtube" ? `unity build • ${buildHost || "resolving"}` : buildHost}
          </span>
          {(unityError || gameErrors.length > 0) && (
            <button
              onClick={() => {
                setErrorsOpen((open) => !open);
                soundEffects.playClick();
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono shrink-0 transition ${
                unityError
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
                  : "border-red-500/50 bg-red-500/15 text-red-200"
              }`}
              title={
                unityError
                  ? `Unity stopped: ${unityError} — click for the details`
                  : `The game reported ${gameErrors.length} error${gameErrors.length === 1 ? "" : "s"} — click for the text`
              }
            >
              <AlertTriangle className="w-3 h-3" />
              {gameErrors.length > 0 ? gameErrors.length : "!"}
            </button>
          )}
          {proxyLabel && (
            <span
              className="hidden lg:inline text-cyan-500/80 truncate"
              title="This game is streaming through a proxy other than the first one tried"
            >
              via {proxyLabel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto sm:justify-end">
          <span
            className={`hidden xs:inline sm:inline px-2 py-0.5 rounded border text-[10px] ${
              sdkLoaded ? "border-cyan-500/40 text-cyan-300 bg-cyan-950/50" : "border-slate-700 text-slate-500"
            }`}
            title="YouTube Playables SDK (ytgame) status"
          >
            SDK {sdkLoaded ? "LINKED" : "—"}
          </span>
          <span
            className={`hidden sm:inline px-2 py-0.5 rounded border text-[10px] ${
              gameReady ? "border-emerald-500/40 text-emerald-300 bg-emerald-950/50" : "border-slate-700 text-slate-500"
            }`}
          >
            {gameReady ? "GAME READY" : status.toUpperCase()}
          </span>
          <span className="px-2 py-0.5 rounded border border-slate-700 text-slate-400 text-[10px]">
            {mm}:{ss}
          </span>
          <button
            onClick={onToggleSound}
            className="p-2 sm:p-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
            title={soundEnabled ? "Mute the game" : "Unmute the game"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          <button
            onClick={() => {
              setPenActive((a) => !a);
              soundEffects.playClick();
            }}
            className={`p-2 sm:p-1.5 rounded border transition ${
              penActive
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                : "border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
            }`}
            title="Whiteboard — draw with the pencil, or write text on the game"
          >
            <Brush className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setCheatOpen((open) => !open);
              soundEffects.playClick();
            }}
            className={`p-2 sm:p-1.5 rounded border transition ${
              cheatOpen
                ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-300"
                : "border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
            }`}
            title="Cheat Engine — read this game's save, add money, unlock everything"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setReloadNonce((n) => n + 1);
              soundEffects.playClick();
            }}
            className="p-2 sm:p-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
            title="Reload game (keeps your saved progress)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={hardReset}
            disabled={resetting}
            className={`p-2 sm:p-1.5 rounded border transition ${
              resetting
                ? "border-red-400 bg-red-500/25 text-red-200 animate-pulse"
                : "border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-50"
            }`}
            title={
              resetting
                ? "Clearing this game's data and cache…"
                : "Hard reset — clear this game's saved data, Unity cache, PlayerPrefs and download a fresh copy"
            }
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fullscreen}
            className="p-2 sm:p-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {game.youtubeUrl && (
            <a
              href={game.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:p-1.5 rounded border border-red-500/40 bg-red-950/40 hover:bg-red-900/50 text-red-300"
              title="Open on YouTube Playables"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/*
        Unity stopped — say what is actually known, and offer the two things that
        can still change the outcome.

        This used to blame "a half-updated build in the browser cache", which is a
        guess that reads as a fix and is not one: the console walks every proxy
        before it gets here, and the files it fetched are byte-identical to the
        publisher's own. Saying so, and offering the one lever that is genuinely
        ours (start the game over from no data at all), is more use to a tutor than
        a suggestion to reload.
      */}
      {errorsOpen && unityError && (
        <div className="bg-amber-500/15 border-y border-amber-500/40 px-3 sm:px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-amber-100">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="min-w-0 flex-1">
            Unity stopped inside the rig: <span className="font-mono text-amber-200">{unityError}</span> — every proxy has been tried and
            the build files came back identical to the publisher's own, so this is the game failing in itself. The only thing on this side
            that can change it is starting over from no saved data: the eraser clears this game's state and asks for a freshly stamped copy.
          </span>
          <button
            onClick={hardReset}
            disabled={resetting}
            className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold flex items-center gap-1.5 disabled:opacity-60"
          >
            <Eraser className="w-3 h-3" /> {resetting ? "Clearing…" : "Start fresh"}
          </button>
          <button
            onClick={() => {
              setReloadNonce((n) => n + 1);
              soundEffects.playClick();
            }}
            className="px-3 py-1 rounded-lg border border-amber-400/60 text-amber-100 font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" /> Reload game
          </button>
        </div>
      )}

      {/* What the game itself complained about, with the text a tutor can copy */}
      {errorsOpen && gameErrors.length > 0 && (
        <div className="bg-red-500/10 border-y border-red-500/40 px-3 sm:px-4 py-2 text-[11px] text-red-100">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-red-200">
                The game reported {gameErrors.length === 1 ? "an error" : `${gameErrors.length} errors`} — a section of it may not work.
              </p>
              <ul className="mt-1 space-y-0.5 font-mono text-red-200/90">
                {gameErrors.map((msg) => (
                  <li key={msg} className="truncate" title={msg}>
                    • {msg}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(gameErrors.join("\n")).catch(() => {});
                  soundEffects.playClick();
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200"
                title="Copy these messages"
              >
                Copy
              </button>
              <button
                onClick={() => {
                  gameErrorsRef.current = [];
                  setGameErrors([]);
                  setErrorsOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400"
                title="Hide until the game reports something new"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* What a hard reset just did, or is waiting for. */}
      {resetNote && (
        <div
          className={`px-3 sm:px-4 py-1.5 text-[11px] font-mono border-y ${
            resetting ? "bg-red-500/10 border-red-500/40 text-red-200" : "bg-slate-900/80 border-slate-800 text-slate-300"
          }`}
        >
          {resetNote}
        </div>
      )}

      {/* Game viewport */}
      <div className="relative w-full aspect-[16/9] min-h-[420px] max-h-[720px] bg-black">
        {cheatOpen && (
          <CheatDrawer
            game={game}
            frameUrl={frameUrl}
            sdkGameKey={sdkGameKey}
            frameRef={iframeRef}
            onReload={reloadGame}
            onClose={() => setCheatOpen(false)}
            onNote={(text) => emit("cheat", text)}
          />
        )}
        {frameUrl && status !== "error" && (
          <iframe
            key={`${game.id}-${reloadNonce}-${frameNonce}`}
            ref={iframeRef}
            src={frameUrl}
            title={game.title}
            className="absolute inset-0 w-full h-full border-0 bg-black"
            allow="autoplay; fullscreen; gamepad; pointer-lock; accelerometer; gyroscope; clipboard-write"
            allowFullScreen
            onLoad={handleFrameLoad}
          />
        )}

        {/* Resolving / loading / waiting-for-a-proxy overlay */}
        {busy && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90 backdrop-blur-sm z-10 ${
              status === "loading" ? "pointer-events-none" : ""
            }`}
          >
            <img
              src={game.thumbnailUrl}
              alt=""
              className="w-24 h-24 rounded-2xl object-cover border border-slate-700 shadow-2xl opacity-90"
            />
            <div className="flex items-center gap-2 text-cyan-300 font-mono text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {status === "resolving"
                ? reprobing && !frameUrl
                  ? "Finding a proxy that can stream this game…"
                  : "Resolving Unity build from YouTube Playables…"
                : "Streaming Unity WebGL build through Tutorly proxy…"}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {status === "resolving"
                ? proxyNote || `youtube.com/playables/${game.id}`
                : "Downloading .data / .wasm / framework — first run can take ~10-30s"}
            </div>
            {status === "loading" && (
              <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-gradient-to-r from-cyan-400 to-purple-500 animate-[pulse_1.2s_ease-in-out_infinite]" />
              </div>
            )}

            {/*
             * A proxy that cannot be found is a *condition*, not an error: the copy
             * that works may appear a moment later, and the console keeps asking.
             * The tutor gets the real reasons underneath — which candidate was
             * tried and what each one said — because that is the thing that can be
             * fixed, and it never takes the class away from the game.
             */}
            {status === "resolving" && !frameUrl && proxyTried.length > 0 && (
              <div className="max-w-lg w-full px-6">
                <div className="text-[10px] font-mono uppercase text-slate-500 mb-1.5 text-center">
                  Tried {proxyTried.length} {proxyTried.length === 1 ? "proxy" : "proxies"} — still looking
                </div>
                <ul className="text-[10px] font-mono text-slate-500 space-y-0.5 max-h-24 overflow-y-auto">
                  {proxyTried.slice(-4).map((t) => (
                    <li key={t} className="truncate">
                      • {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      resetProxyProbe();
                      hopsRef.current = 0;
                      setReprobing(true);
                      setReloadNonce((n) => n + 1);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Try every proxy again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/*
         * Stopped by a cache clear. Said plainly, because the alternative — a black
         * rectangle with no explanation — reads as the game having crashed.
         */}
        {status === "stopped" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-10 p-8 text-center">
            <img
              src={game.thumbnailUrl}
              alt=""
              className="w-20 h-20 rounded-2xl object-cover border border-slate-700 shadow-2xl opacity-90"
            />
            <h4 className="text-white font-bold">Game stopped</h4>
            <p className="text-xs text-slate-400 max-w-md">
              The console cleared every stored build and save. This game was closed for that, because the data
              being deleted was the data it was holding open. Start it again and it streams a fresh copy from the
              beginning.
            </p>
            <button
              onClick={() => {
                hopsRef.current = 0;
                setStatus("resolving");
                setReloadNonce((n) => n + 1);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Play again
            </button>
          </div>
        )}

        {/* Error overlay — only for a Playable that could not be *identified* */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-10 p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <h4 className="text-white font-bold">Couldn&apos;t load this Playable</h4>
            <p className="text-xs text-slate-400 max-w-md">{errorMsg}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  resetProxyProbe();
                  hopsRef.current = 0;
                  setReloadNonce((n) => n + 1);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          </div>
        )}

        {/* Whiteboard over the game: pencil ink plus movable, resizable writing */}
        <MagicPenOverlay active={penActive} iframeRef={iframeRef} />
      </div>
    </div>
  );
}
