/**
 * The other game platforms, as console games.
 *
 * `playables.json` is YouTube's index — every entry carries a build host on
 * `*.playables.usercontent.goog`, which is what makes those games proxied and
 * score-captured. Nothing else on the web looks like that, so each platform here
 * carries the one thing it does expose (see `scripts/crawl-platform-catalogue.mjs`):
 *
 *   · CrazyGames — the build is framable as-is, so the game plays directly.
 *
 * Poki and itch are deliberately absent, and the crawler still records their
 * numbers (`--only=poki,itch`): each was loaded in the built console and refused
 * to appear — Poki's build host answers 403 + `X-Frame-Options: SAMEORIGIN` to a
 * foreign referer, and itch serves a hotlink interstitial in a frame (its widget
 * embed is only a "Play on itch.io" link). Indexing either would produce cards
 * that do nothing, which is exactly what this list must not contain.
 *
 * The catalogue is written by the crawler into `./platforms/` (both here and in
 * `shared/platforms/`, which is the copy every app reads). Re-run it to refresh —
 * nothing in this file is hand-maintained.
 */
import index from "./platforms/index.json";
import crazygames from "./platforms/crazygames.json";
import type { ConsoleGame, GameSource } from "./catalog";

export interface CrawledGame {
  id: string;
  title: string;
  thumb: string;
  pageUrl: string;
  categories?: string[];
  play:
    | { kind: "direct"; url: string }
    | { kind: "proxied"; buildHost: string; entryPath: string };
}

export interface CrawledPlatform {
  platform: { id: string; name: string };
  generatedAt: string;
  source: unknown;
  playCheck?: { kind: string; note: string; sample?: { sampled: number; ok: number } };
  listed: number;
  count: number;
  games: CrawledGame[];
}

const FILES: CrawledPlatform[] = [crazygames as CrawledPlatform];

export interface PlatformSource {
  id: GameSource;
  name: string;
  count: number;
  listed: number;
  /** How this platform's games reach the console: framed as-is, or via the proxy. */
  kind: "direct" | "proxied";
  note: string;
  sample?: { sampled: number; ok: number };
  games: ConsoleGame[];
}

const titleCase = (value: string) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

function toConsoleGame(file: CrawledPlatform, game: CrawledGame): ConsoleGame {
  const name = file.platform.name;
  const categories = game.categories || [];
  return {
    id: game.id,
    title: game.title,
    // Poki ships real categories, so its games can be found by genre; the other
    // two platforms publish none, and "Arcade" is the honest default there.
    genre: categories.length ? titleCase(categories[0]) : "Arcade",
    thumbnailUrl: game.thumb,
    plays: "",
    playsNumeric: 0,
    developer: name,
    publisher: name,
    publishDate: "",
    publishedAt: 0,
    description: `${game.title} — a ${name} game${
      categories.length ? ` (${categories.slice(0, 4).map(titleCase).join(", ")})` : ""
    }.`,
    source: file.platform.id as GameSource,
    pageUrl: game.pageUrl,
    directUrl: game.play.kind === "direct" ? game.play.url : undefined,
    buildHost: game.play.kind === "proxied" ? game.play.buildHost : undefined,
    entryPath: game.play.kind === "proxied" ? game.play.entryPath : undefined,
  };
}

export const PLATFORM_SOURCES: PlatformSource[] = FILES.filter((file) => file.games?.length).map((file) => ({
  id: file.platform.id as GameSource,
  name: file.platform.name,
  count: file.count,
  listed: file.listed,
  kind: file.playCheck?.kind === "proxied" ? "proxied" : "direct",
  note: file.playCheck?.note || "",
  sample: file.playCheck?.sample,
  games: file.games.map((game) => toConsoleGame(file, game)),
}));

/** Every platform game, ready to sit beside `YOUTUBE_CATALOG`. */
export const PLATFORM_CATALOG: ConsoleGame[] = PLATFORM_SOURCES.flatMap((source) => source.games);

export const PLATFORM_IDS: GameSource[] = PLATFORM_SOURCES.map((source) => source.id);

export const isPlatformSource = (source: string): source is GameSource =>
  PLATFORM_IDS.includes(source as GameSource);

/** Totals for the console's own status line: crawled, listed, and when. */
export const PLATFORM_INDEX = {
  generatedAt: String((index as { generatedAt?: string }).generatedAt || ""),
  total: PLATFORM_SOURCES.reduce((sum, source) => sum + source.count, 0),
  platforms: (index as { platforms?: unknown[] }).platforms || [],
};
