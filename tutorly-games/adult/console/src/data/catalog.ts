import rawCatalog from "./playables.json";

export interface IndexedPlayable {
  id: string;
  title: string;
  genre: string;
  thumb: string;
  bigThumb: string;
  plays: string;
  developer: string;
  publisher: string;
  publishDate: string;
  description: string;
  buildHost?: string;
  entryPath?: string;
  hash?: string;
  directUrl?: string;
}

/**
 * Where a game came from.
 *
 * `youtube` is the indexed Playables catalogue (proxied Unity builds with score
 * capture); `custom-url` and `local` are the tutor's own uploads; the rest are the
 * crawled platforms in `./platforms.ts`, which play either directly or through the
 * host's proxy depending on the platform.
 */
export type GameSource = "youtube" | "custom-url" | "local" | "poki" | "crazygames" | "itch";

export interface ConsoleGame {
  id: string;
  title: string;
  genre: string;
  thumbnailUrl: string;
  plays: string;
  playsNumeric: number;
  developer: string;
  publisher: string;
  publishDate: string;
  publishedAt: number;
  description: string;
  source: GameSource;
  youtubeUrl?: string;
  /** For custom / local games: URL that can be iframed directly */
  directUrl?: string;
  /**
   * A build that allows being framed as-is (its host is not YouTube's CDN), so it
   * skips the proxy entirely. Proxied games leave this undefined and carry
   * `buildHost` + `entryPath` instead — the frame URL is then built at runtime in
   * `lib/proxy.ts`, because it depends on whether a proxy exists on this host.
   */
  prebuiltUrl?: string;
  /** Build host id on playables.usercontent.goog (when proxied) */
  buildHost?: string;
  /** Path of the build entry inside the build host, e.g. "v/assets/index.html" */
  entryPath?: string;
  /** Trailing hash the build needs (the Playables launch flags) */
  hash?: string;
  /**
   * The page a platform game belongs to (its Poki/CrazyGames/itch address).
   * Kept for the library and for "open on the platform" links, since a proxied
   * build has no URL of its own.
   */
  pageUrl?: string;
}

export function parsePlays(plays: string): number {
  const m = plays.match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = (m[2] || "").toUpperCase();
  const mult = unit === "B" ? 1e9 : unit === "M" ? 1e6 : unit === "K" ? 1e3 : 1;
  return Math.round(n * mult);
}

export function formatPlays(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

/**
 * Games the console deliberately does not offer, and why.
 *
 * `playables.json` is scraped, so deleting a row there only lasts until the next crawl —
 * this list is the durable half. Nothing here is a judgement about the game; each entry
 * is a build a class cannot get through.
 *
 * **Build a Queen** — its published build cannot finish a run. Entering level 4 it tries
 * to dress the level's required queen and every part is missing from its own parts
 * database (`bopeep_hair`, `bopeep_hat`, `bopeep_shoe`, plus the typo'd `bopeed_outfit`
 * and `bopeed_skirt`), so it throws
 * `BabeRequirements SetUpCharacter ERROR System.NullReferenceException`, the camera
 * reports `no visual_renderers to frame`, and the character stands at the level-4 arch
 * forever.
 *
 * This is not the console's state and not a stale cache. Measured after a hard reset —
 * empty PlayerPrefs, a complete `.data` file, every part fetched fresh from YouTube's
 * live host — the identical error returns, which is what moved the diagnosis off "old
 * copy" and onto the build itself. The stored address was verified current before the
 * row was deleted (`node scripts/check-playables-links.mjs`), so a stale link was never
 * the explanation either; the build is the thing that is broken.
 *
 * The row is also gone from `playables.json`, so nothing ships it — this entry is what
 * survives a re-crawl, which would otherwise put the game straight back.
 */
export const EXCLUDED_PLAYABLES: Record<string, string> = {
  UgkxyKs3Ve_RG1PMcTKDbdNtSTCmpKj2kDKj:
    "level 4 cannot build its required queen — NullReferenceException in the publisher's own build",
};

export const YOUTUBE_CATALOG: ConsoleGame[] = (rawCatalog as IndexedPlayable[])
  .filter((g) => !EXCLUDED_PLAYABLES[g.id])
  .map((g) => ({
  id: g.id,
  title: g.title,
  genre: g.genre || "Arcade",
  thumbnailUrl: g.bigThumb ? `${g.bigThumb}=s512` : g.thumb,
  plays: g.plays,
  playsNumeric: parsePlays(g.plays || ""),
  developer: g.developer,
  publisher: g.publisher,
  publishDate: g.publishDate,
  publishedAt: g.publishDate ? Date.parse(g.publishDate) || 0 : 0,
  description: g.description,
  source: "youtube" as const,
  youtubeUrl: `https://www.youtube.com/playables/${g.id}`,
  prebuiltUrl: g.directUrl ? g.directUrl : undefined,
  buildHost: g.buildHost || (g.directUrl ? new URL(g.directUrl).hostname : undefined),
  entryPath: g.entryPath,
  hash: g.hash,
}));

export const GENRES: string[] = [
  "All",
  ...Array.from(new Set(YOUTUBE_CATALOG.map((g) => g.genre).filter(Boolean))).sort(),
];

/**
 * The game the console opens on, when the URL does not ask for another one.
 *
 * Chosen for what the first thirty seconds look like: this one starts a run of its
 * own accord and plays from level 1 with the rig's default input, so a tutor who opens
 * the console sees a game rather than a title card waiting to be understood. A Playable
 * that stalls on its own intro makes a poor first impression even when the fault is the
 * publisher's — which is why the one that did is listed in `EXCLUDED_PLAYABLES` rather
 * than featured.
 */
export const FEATURED_ID = "UgkxWYxG29y8GASEQHhWfPBFlUdwNwfCQEUK";

export function findGame(id: string): ConsoleGame | undefined {
  return YOUTUBE_CATALOG.find((g) => g.id === id);
}
