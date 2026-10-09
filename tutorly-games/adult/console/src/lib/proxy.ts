/**
 * Getting a YouTube Playable to run inside the rig, with more than one way in.
 *
 * A Playables build lives on `<id>.playables.usercontent.goog` and its response
 * carries `frame-ancestors https://*.youtube.com …`, so a plain `<iframe>` from
 * your origin is refused by the browser. The only way in is to fetch the build
 * through your own origin and hand the browser a document whose CSP you control —
 * which needs code that runs on a server, because a browser cannot read (or
 * rewrite) another origin's HTML.
 *
 * ── Several proxies, tried in order ─────────────────────────────────────────
 * That server code can be sitting in more than one place, and *which* place is
 * live depends on how this copy happens to be deployed: the bundled `play.php`
 * next to the console, a copy at the site root, the Node server's own route, or
 * a proxy hosted somewhere else entirely that the tutor points at with `?proxy=`.
 *
 * So the console does not ask one address whether it is a proxy. It holds an
 * ordered list of candidate proxies and walks it until one answers the handshake,
 * then remembers the winner for the rest of the page. If the game then fails to
 * render through that winner, the player advances to the next candidate and tries
 * again — automatically. A tutor should never have to know that `play.php` was in
 * the wrong folder; the console should just find the copy that works.
 *
 * Each candidate speaks the same three-call contract:
 *
 *   GET <base>/<buildHost>/<path>   stream an asset (HTML is rewritten)
 *   GET <base>/__probe__            {"ok":true,…} handshake
 *   GET <base>?resolve=<id>         look up a Playable's build location
 *
 * ── What is deliberately NOT a candidate ────────────────────────────────────
 * Public "CORS proxy" services. They look like an easy fallback and they are not
 * one: they would serve the build from *their* origin, where the relative `.data`
 * and `.wasm` URLs inside Unity's HTML resolve to their server, not to YouTube's
 * build host. The game would open as a black rectangle, or a 404 on a `.wasm`
 * nobody can explain. A proxy that cannot serve the assets is worse than saying
 * which copy is missing, so every candidate here is one that can serve the whole
 * build: the bundled `play.php`, a copy at the site root, the Node route, or a
 * URL the tutor configured.
 */

import { appUrl, BASE_PATH } from "./basePath";

export type ProxyKind = "node" | "php" | "override" | "none";

export interface ProxyInfo {
  kind: ProxyKind;
  /** Where the proxy lives; empty string when there is none. */
  base: string;
  /** True when a Playable can be framed in the rig. */
  available: boolean;
  /** The proxy's own version, shown in the rig so a deployment can be confirmed. */
  version: number;
  /**
   * Which proxy this is, said the way a tutor would: "bundled play.php",
   * "site-root play.php", "proxy from ?proxy=". Shown in the player so a working
   * deployment can be identified without opening a network tab.
   */
  label: string;
  /** Its position in the candidate list, and how many there are. */
  index: number;
  total: number;
  /**
   * The candidates that were tried before this one, each with its reason for
   * failing (`play.php/__probe__ → HTTP 404`). Kept so the player can show real
   * progress — "tried 2 of 4" — instead of a single opaque failure.
   */
  tried: string[];
  /**
   * Why the last probe failed, when none worked. Every candidate's reason is in
   * `tried`; this is the summary line.
   */
  detail?: string;
}

const NOTHING: ProxyInfo = {
  kind: "none",
  base: "",
  available: false,
  version: 0,
  label: "no proxy",
  index: -1,
  total: 0,
  tried: [],
  detail: "not probed yet",
};

/** One place the proxy might be. */
export interface ProxyCandidate {
  label: string;
  /** Ends at the contract root (`.php`), no trailing slash. */
  base: string;
  kind: ProxyKind;
}

/** `<base>` for a game frame / asset: the proxy root, always with a trailing slash. */
export function proxyRoot(info: ProxyInfo): string {
  if (!info.available) return "";
  return info.base.endsWith("/") ? info.base : `${info.base}/`;
}

/**
 * URL to drop in the `<iframe>` for a proxied Unity build.
 *
 * `fresh` is what a hard reset sends. The proxy folds it into the token it stamps
 * every build URL with, so asking for a fresh copy produces URLs the browser has
 * never requested — the only way to get past a cache a page cannot clear (and past
 * Unity's own `UnityCache`, which ordinary storage clearing does not reach).
 */
export function proxiedGameUrl(
  info: ProxyInfo,
  buildHost: string,
  entryPath: string,
  hash = "",
  fresh = ""
): string {
  const base = `${proxyRoot(info)}${buildHost}/${entryPath.replace(/^\/+/, "")}`;
  const query = fresh ? `${base.includes("?") ? "&" : "?"}fresh=${encodeURIComponent(fresh)}` : "";
  return `${base}${query}${hash || ""}`;
}

/**
 * `?proxy=<url>` (comma-separate for several) wins, then the build-time
 * `NEXT_PUBLIC_CONSOLE_PROXY_URL`, then the bundled `play.php` and a copy at the
 * site root. Overrides come first because they are the only candidates that were
 * chosen on purpose.
 */
function configuredProxies(): ProxyCandidate[] {
  const out: ProxyCandidate[] = [];
  const push = (raw: string, label: string) => {
    String(raw || "")
      .split(",")
      .map((part) => part.trim().replace(/\/$/, ""))
      .filter(Boolean)
      .forEach((base, i) => {
        // `https://host/proxy` and `https://host/proxy/play.php` are both accepted;
        // the contract root is the `.php`, so an extension-less URL gets one.
        const root = /\.php$/i.test(base) ? base : `${base}/play.php`;
        out.push({ base: root, kind: "override", label: out.length === 0 && i === 0 ? label : `${label} #${i + 1}` });
      });
  };

  if (typeof window !== "undefined") {
    try {
      const q = new URLSearchParams(window.location.search).get("proxy");
      if (q) push(decodeURIComponent(q), "proxy from the URL");
    } catch {
      /* malformed query — fall through to the bundled proxy */
    }
  }
  push(process.env.NEXT_PUBLIC_CONSOLE_PROXY_URL || "", "proxy from the build env");

  const bundled = appUrl("play.php");
  out.push({ base: bundled, kind: "php", label: "bundled play.php" });

  // A copy dropped at the site root, which is where someone who did not know about
  // the sub-folder would put it. Same file, same contract, different address.
  if (BASE_PATH && bundled !== "/play.php") {
    out.push({ base: "/play.php", kind: "php", label: "site-root play.php" });
  }

  // Deduplicate by base, keeping the first (i.e. the most intentional) label.
  const seen = new Set<string>();
  return out.filter((c) => {
    const key = c.base.replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The ordered list this deployment will try. Exported for the status line and tests. */
export function proxyCandidates(): ProxyCandidate[] {
  return configuredProxies();
}

/**
 * A failed probe is remembered for a few seconds only.
 *
 * It used to be cached for the life of the page, which made any retry a no-op:
 * the effect re-ran, got the same remembered failure back, and the game stayed
 * unavailable until a full reload — even after the host had started answering.
 * A success is still cached forever (one probe per page, not one per game).
 */
const FAILED_TTL_MS = 8000;
/** A proxy that accepts a connection and then says nothing must not stall the walk. */
const PROBE_TIMEOUT_MS = 4500;
const ATTEMPTS_PER_CANDIDATE = 2;

let cached: ProxyInfo | null = null;
let pending: Promise<ProxyInfo> | null = null;
let probedAt = 0;
/** The candidate that worked last (its position in the same list). */
let workingIndex = -1;

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => {
    try {
      controller?.abort();
    } catch {
      /* ignore */
    }
  }, ms);
  return fetch(url, { cache: "no-store", signal: controller?.signal }).finally(() => clearTimeout(timer));
}

/**
 * Probe one candidate. Returns the info on success, or null with `reason` set to
 * something a tutor could act on.
 */
/**
 * How a candidate is named in a failure line: its label, plus the host it lives on.
 *
 * Two proxies configured from the environment both read as "proxy from the build
 * env", which is no help at all when one of them is the broken one. The host is
 * the part a tutor can act on, so it is always included.
 */
function whereIs(candidate: ProxyCandidate): string {
  try {
    const base = typeof location !== "undefined" ? location.origin : "http://localhost";
    return new URL(candidate.base, base).host;
  } catch {
    return "";
  }
}

async function probeCandidate(
  candidate: ProxyCandidate,
  index: number,
  total: number,
  tried: string[]
): Promise<ProxyInfo | null> {
  const url = `${candidate.base.replace(/\/+$/, "")}/__probe__`;
  const host = whereIs(candidate);
  let reason = "no answer";

  for (let attempt = 0; attempt < ATTEMPTS_PER_CANDIDATE; attempt++) {
    try {
      const res = await fetchWithTimeout(url, PROBE_TIMEOUT_MS);
      if (!res.ok) {
        // A host can 404 the very first request (deploy still copying, rewrite
        // warming up), which is what the second attempt is for.
        reason = `HTTP ${res.status}`;
      } else {
        try {
          const data = (await res.json()) as { ok?: boolean; proxy?: string; version?: number };
          if (data?.ok) {
            return {
              kind: data.proxy === "node" ? "node" : candidate.kind === "override" ? "override" : "php",
              base: candidate.base,
              available: true,
              version: Number(data.version) || 0,
              label: candidate.label,
              index,
              total,
              tried,
              detail: "",
            };
          }
          reason = "answered, but not with the proxy handshake";
        } catch {
          reason = "did not answer with JSON (is PHP running in this folder?)";
        }
      }
    } catch (e) {
      // `AbortError` here means the probe timed out, which is a real answer about a
      // proxy: it is reachable but not serving.
      reason = (e as Error)?.name === "AbortError" ? `no answer in ${PROBE_TIMEOUT_MS / 1000}s` : "network error";
    }
    if (attempt < ATTEMPTS_PER_CANDIDATE - 1) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }

  tried.push(`${candidate.label}${host ? ` (${host})` : ""} — ${reason}`);
  return null;
}

/** Walk the candidate list from `start` (wrapping once) and return the first that answers. */
async function walk(start: number, skipWorking: boolean): Promise<ProxyInfo> {
  const candidates = configuredProxies();
  const total = candidates.length;
  const tried: string[] = [];
  const order: number[] = [];
  for (let i = 0; i < total; i++) order.push((start + i) % total);

  for (const index of order) {
    if (skipWorking && index === workingIndex) continue;
    const info = await probeCandidate(candidates[index], index, total, tried);
    if (info) {
      workingIndex = index;
      return info;
    }
  }

  return {
    ...NOTHING,
    total,
    tried,
    detail: tried.length ? tried.join("; ") : "no proxy candidates were configured",
  };
}

/**
 * The working proxy, probing the candidates in order. Cached while it works.
 *
 * If a previous probe failed, the next call forgets it after `FAILED_TTL_MS` so a
 * game loaded later in the same lesson still finds a proxy that has since come up.
 */
export function detectProxy(): Promise<ProxyInfo> {
  if (cached && (cached.available || Date.now() - probedAt < FAILED_TTL_MS)) return Promise.resolve(cached);
  if (!pending) {
    pending = walk(0, false).then((info) => {
      cached = info;
      probedAt = Date.now();
      pending = null;
      return info;
    });
  }
  return pending;
}

/**
 * Move on to the next proxy that answers, skipping the one that just failed.
 *
 * Called when a game does not open through the current proxy: the probe can
 * succeed while the *build* still fails (a proxy that cannot reach YouTube's
 * build host, a half-uploaded folder, a firewall that allows the handshake but
 * not the assets). Rather than showing the YouTube fallback, the player walks to
 * the next candidate and loads the game again.
 *
 * Returns the current info unchanged when nothing else answers, so the caller can
 * tell "found another" from "this was the last one" via `info.base`.
 */
export async function failoverProxy(): Promise<ProxyInfo> {
  const candidates = configuredProxies();
  if (candidates.length < 2) return cached ?? NOTHING;
  const current = cached;
  const start = workingIndex >= 0 ? (workingIndex + 1) % candidates.length : 0;
  const carried = current?.tried ? [...current.tried] : [];
  const next = await walk(start, true);
  if (!next.available) {
    // Nothing else answers: keep the one that at least completed the handshake, so
    // the player does not regress to "no proxy" and lose the frame it had.
    if (current?.available) {
      return { ...current, tried: [...carried, ...next.tried], detail: next.detail };
    }
    return next;
  }
  // Carry the reasons collected along the way into the new info, so the status
  // line can show the whole story rather than only the last hop.
  cached = { ...next, tried: [...carried, ...next.tried] };
  return cached;
}

/** Forget the last probe so the next `detectProxy()` really asks the hosts again. */
export function resetProxyProbe(): void {
  cached = null;
  pending = null;
  probedAt = 0;
  workingIndex = -1;
}

export interface ResolvedPlayable {
  id: string;
  title: string;
  genre: string;
  developer: string;
  description: string;
  thumbnailUrl: string;
  buildHost: string;
  entryPath: string;
  hash: string;
  proxyUrl?: string;
  error?: string;
}

/**
 * Ask YouTube for a Playable's build location, through a working proxy.
 *
 * Only needed for an ID that is NOT in the bundled 1,649-game catalog — the
 * catalog has its build host baked in. Without a proxy this cannot work in the
 * browser at all (youtube.com sends no CORS headers), so the caller gets a message
 * that says what to do instead — see `LoadUnityGameModal`.
 */
export async function resolvePlayable(id: string, info: ProxyInfo): Promise<ResolvedPlayable> {
  const blank = {
    id,
    title: id,
    genre: "",
    developer: "",
    description: "",
    thumbnailUrl: "",
    buildHost: "",
    entryPath: "",
    hash: "",
  };

  if (!info.available) {
    return {
      ...blank,
      error:
        "Only the proxy can read a Playable's build location (YouTube blocks it from the browser). Pick a game from the catalog, or open youtube.com/playables/" +
        id +
        " in a new tab.",
    };
  }

  // One resolve per candidate: an unlisted ID is exactly the case where the first
  // proxy may answer the handshake and still not be able to reach YouTube.
  let attemptInfo = info;
  for (let hop = 0; hop < 4; hop++) {
    try {
      const res = await fetch(`${proxyRoot(attemptInfo)}?resolve=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = (await res.json()) as Partial<ResolvedPlayable> & { error?: string };
      if (res.ok && !data.error && data.buildHost) {
        return {
          id: data.id || id,
          title: data.title || id,
          genre: data.genre || "Arcade",
          developer: data.developer || "",
          description: data.description || "Loaded from YouTube Playables",
          thumbnailUrl: data.thumbnailUrl || "",
          buildHost: data.buildHost,
          entryPath: data.entryPath || "index.html",
          hash: data.hash || "",
        };
      }
      if (hop === 3) return { ...blank, error: data.error || "Could not find a game build on that Playables page." };
    } catch (e) {
      if (hop === 3) return { ...blank, error: (e as Error).message };
    }
    const next = await failoverProxy();
    if (!next.available || next.base === attemptInfo.base) {
      return { ...blank, error: "Could not find a game build on that Playables page." };
    }
    attemptInfo = next;
  }
  return { ...blank, error: "Could not find a game build on that Playables page." };
}

/** `https://www.youtube.com/playables/<id>` — the game, on YouTube's own page. */
export function youtubePlayableUrl(id: string): string {
  return `https://www.youtube.com/playables/${encodeURIComponent(id)}`;
}
