#!/usr/bin/env node
/**
 * Builds the platform catalogue: every Poki, CrazyGames and itch.io game that
 * can be *played inside the Tutorly console*.
 *
 * The question this answers is a platform question, not a per-game one:
 * "can this platform's games load in our console, and at what address?" Each
 * platform is solved differently because each exposes a different door:
 *
 *   • CrazyGames  — one XML sitemap already carries every game URL *and* its
 *                   cover image. The build sits at a derivable address
 *                   (`games.crazygames.com/en_US/<slug>/index.html`) that sends
 *                   no framing headers, so it plays directly in the console.
 *   • Poki        — sitemap for the full list, category pages for real titles,
 *                   thumbnails and categories. The build
 *                   (`games.poki.com/<id>/<slug>`) is Referer-gated, so the
 *                   console plays it through `play.php`; the address only exists
 *                   on the game's own page, so that one field is read per game
 *                   (address lookup, not per-game verification).
 *   • itch.io     — its `games.xml` is 50 000 URLs in one file of ~22 (a million
 *                   entries, most of them downloads, tools and asset packs), so
 *                   the browser-playable HTML5 listings are crawled instead. Each
 *                   game page also names its browser build, and both are recorded
 *                   (`--only=itch`) — but itch serves a hotlink interstitial to
 *                   foreign frames, so it is crawled and NOT indexed.
 *
 * Two of the three crawl, one gets indexed. The bar is the one that matters here:
 * the game has to actually appear inside the console rig, which was checked by
 * loading real games from each platform in the built console:
 *
 *   · Poki — the shell loads through play.php, then the shell nests its real build
 *     on `<uuid>.gdn.poki.com`, which answers `403` + `X-Frame-Options: SAMEORIGIN`
 *     to a foreign referer. The browser refuses it (net::ERR_BLOCKED_BY_RESPONSE)
 *     and the game never appears.
 *   · itch — the browser build answers 200 to a plain request but renders
 *     "you tried to steal or hotlink it" in a frame; its `embed-upload` player is
 *     black; its widget embed is just a card with a "Play on itch.io" link.
 *
 * Both keep their builders (and their data can be regenerated with `--only=`),
 * because the way to be wrong here is to index cards that do nothing.
 *
 * `--verify-sample=N` asks N games per platform whether their address answers
 * (a platform-level sanity check, off by default). Nothing in the main flow
 * depends on it: the pipeline trusts the platform check, not a per-game sweep.
 *
 * Usage:
 *   node scripts/crawl-platform-catalogue.mjs                      # all three
 *   node scripts/crawl-platform-catalogue.mjs --only=poki,itch      # a subset
 *   node scripts/crawl-platform-catalogue.mjs --itch-pages=20       # deeper itch
 *   node scripts/crawl-platform-catalogue.mjs --verify-sample=12    # + a sample check
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Canonical catalogue, shared by every app in the repo. */
const SHARED_DIR = path.join(ROOT, "shared", "platforms");
/** The copy the console bundles (its Next build stays inside its own root). */
const CONSOLE_DIR = path.join(ROOT, "tutorly-games", "adult", "console", "src", "data", "platforms");
const CACHE_DIR = path.join(ROOT, ".freebuff", "catalog-cache");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const TIMEOUT_MS = 25000;
const RETRIES = 2;

const args = new Map(
  process.argv.slice(2).map((raw) => {
    const [key, value = "true"] = raw.replace(/^--/, "").split("=");
    return [key, value];
  })
);
// Only the platform whose games genuinely play in the console — see the header.
const ONLY = String(args.get("only") || "crazy")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const ITCH_PAGES = Number(args.get("itch-pages") || 10);
const CONCURRENCY = Number(args.get("concurrency") || 8);
const VERIFY_SAMPLE = Number(args.get("verify-sample") || 0);
const want = (id) => ONLY.includes(id);

const log = (...parts) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...parts);

// ---------------------------------------------------------------- http

async function pool(items, limit, worker, label) {
  const queue = [...items];
  let done = 0;
  let failed = 0;
  const results = [];
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, queue.length || 1)) }, async () => {
      for (;;) {
        const item = queue.shift();
        if (item === undefined) return;
        try {
          results.push(await worker(item));
        } catch (err) {
          failed++;
          if (failed <= 8) log(`  ${label}: failed on ${JSON.stringify(item).slice(0, 90)} — ${err.message}`);
        }
        done++;
        if (done % 300 === 0) log(`  ${label}: ${done}/${items.length}, ${failed} failed`);
      }
    })
  );
  log(`  ${label}: ${done} attempted, ${failed} failed`);
  return results;
}

async function fetchPage(url, { referer, method = "GET" } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
          ...(referer ? { referer } : {}),
        },
      });
      return { status: res.status, body: method === "HEAD" ? "" : await res.text() };
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------- text helpers

/** "space-invaders" -> "Space Invaders" — used where the source carries no title. */
function titleFromSlug(slug) {
  const small = new Set(["a", "an", "and", "the", "of", "in", "on", "to", "vs", "for", "with", "at", "by", "or", "is"]);
  return slug
    // CrazyGames publishes a page per build technology; the suffix is not a name.
    .replace(/-(html-?5|unity|webgl|flash)$/i, "")
    .replace(/[_+]+/g, " ")
    .split("-")
    .filter(Boolean)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (lower === "io" || lower === "3d" || lower === "2d") return lower.toUpperCase();
      if (small.has(lower) && i > 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ")
    .replace(/\bIo\b/g, "io")
    .replace(/\b3D\b/g, "3D")
    .replace(/\bHtml5\b|\bHtml 5\b/g, "HTML5");
}

const unescapeHtml = (s) =>
  String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

const clean = (s) => unescapeHtml(String(s || "").replace(/\s+/g, " ")).trim();

const thumbFor = (url, size) => (url ? unescapeHtml(url).replace(/width=\d+/, `width=${size}`) : "");

// ---------------------------------------------------------------- poki

async function pokiSlugs() {
  const { body } = await fetchPage("https://poki.com/en/sitemaps/games.xml");
  const out = new Set();
  for (const m of body.matchAll(/<loc>https:\/\/poki\.com\/en\/g\/([a-z0-9-]+)<\/loc>/g)) out.add(m[1]);
  return [...out].sort();
}

async function pokiCategorySlugs() {
  const { body } = await fetchPage("https://poki.com/en/sitemaps/categories.xml");
  return [...new Set([...body.matchAll(/<loc>https:\/\/poki\.com\/en\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]))].filter(
    (c) => c !== "categories"
  );
}

/**
 * Tiles are server-rendered and stable:
 *   <a class="summaryTile …" href="/en/g/<slug>" … data-tile-id="31150" …>
 *     <img class="image" src="https://img.poki-cdn.com/cdn-cgi/image/…/<hash>/<slug>-logo.png" alt="Title">
 */
function parsePokiTiles(html, category) {
  const tiles = [];
  const anchors = [];
  const anchor = /<a\b[^>]*class="[^"]*summaryTile[^"]*"[^>]*>/g;
  let match;
  while ((match = anchor.exec(html))) anchors.push({ tag: match[0], at: match.index });
  anchors.forEach((entry, i) => {
    const block = html.slice(entry.at, i + 1 < anchors.length ? anchors[i + 1].at : html.length);
    const slug = /href="\/en\/g\/([a-z0-9-]+)"/.exec(entry.tag)?.[1];
    if (!slug) return;
    const img = /<img\b[^>]*src="(https:\/\/img\.poki-cdn\.com\/[^"]+)"/.exec(block)?.[1];
    const spanTitle = /<span[^>]*summaryTile__title[^>]*>([^<]{1,140})<\/span>/.exec(block)?.[1];
    const alt = /<img\b[^>]*alt="([^"]{1,140})"/.exec(block)?.[1];
    tiles.push({
      slug,
      // Same CDN file, asked for at console size instead of a 204px tile.
      thumb: img ? img.replace(/width=\d+,height=\d+/, "width=512,height=512") : "",
      title: clean(spanTitle || alt || ""),
      category,
    });
  });
  return tiles;
}

async function crawlPoki() {
  log("poki: reading sitemaps");
  const [slugs, categories] = await Promise.all([pokiSlugs(), pokiCategorySlugs()]);
  log(`poki: ${slugs.length} games listed, ${categories.length} categories`);

  const pages = await pool(
    categories,
    Math.min(CONCURRENCY, 5),
    async (category) => {
      const { body, status } = await fetchPage(`https://poki.com/en/${category}`);
      return status === 200 ? parsePokiTiles(body, category) : [];
    },
    "poki category pages"
  );

  const meta = new Map();
  for (const tile of pages.flat()) {
    const prev = meta.get(tile.slug);
    if (!prev) meta.set(tile.slug, { ...tile, categories: [tile.category] });
    else {
      if (!prev.categories.includes(tile.category)) prev.categories.push(tile.category);
      if (!prev.thumb && tile.thumb) prev.thumb = tile.thumb;
      if (!prev.title && tile.title) prev.title = tile.title;
    }
  }
  log(`poki: titles/thumbnails for ${meta.size}/${slugs.length} games`);

  // The build address is published nowhere but the game's own page, where the
  // page ships its own player URL inside its JSON:
  //   "file":{"content":"\/\/games.poki.com\/458768\/<token>", …}
  // The trailing token is not always the slug — it is `2048` for 2048 but a
  // normalised slug (`subwayclash3d`) or a UUID (`5e9643be-…`) elsewhere — so
  // the address is read verbatim rather than rebuilt from the slug.
  log("poki: reading each game page for its build address");
  const withIds = await pool(
    slugs,
    CONCURRENCY,
    async (slug) => {
      const found = meta.get(slug);
      const { body, status } = await fetchPage(`https://poki.com/en/g/${slug}`, { referer: "https://poki.com/" });
      if (status !== 200) return { slug, buildHost: "", entryPath: "" };
      const decoded = body.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
      const address = /\/\/games\.poki\.com\/(\d+)\/([A-Za-z0-9_-]+)/.exec(decoded);
      const ogTitle = /<meta property="og:title" content="([^"]{1,140})"/.exec(body)?.[1];
      const ogImage = /<meta property="og:image" content="([^"]{1,300})"/.exec(body)?.[1];
      return {
        slug,
        buildHost: address ? `games.poki.com/${address[1]}` : "",
        entryPath: address ? address[2] : "",
        title: clean(ogTitle) || found?.title || titleFromSlug(slug),
        thumb: found?.thumb || thumbFor(ogImage, 512),
        categories: found?.categories || [],
      };
    },
    "poki game pages"
  );

  const games = withIds
    .filter((g) => g.entryPath)
    .map((g) => ({
      id: `poki-${g.slug}`,
      title: g.title,
      thumb: g.thumb,
      categories: g.categories,
      pageUrl: `https://poki.com/en/g/${g.slug}`,
      play: { kind: "proxied", buildHost: g.buildHost, entryPath: g.entryPath },
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  log(`poki: ${games.length} games with a build address, ${withIds.length - games.length} pages exposed none`);

  return {
    platform: { id: "poki", name: "Poki" },
    generatedAt: new Date().toISOString(),
    source: { list: "https://poki.com/en/sitemaps/games.xml", meta: "category pages + game pages" },
    playCheck: {
      kind: "proxied",
      note: "The build lives on games.poki.com and is Referer-gated, so it is fetched through play.php with a poki.com referer.",
    },
    listed: slugs.length,
    count: games.length,
    games,
  };
}

// ---------------------------------------------------------------- crazygames

async function crawlCrazy() {
  log("crazygames: reading the sitemap");
  const { body } = await fetchPage("https://www.crazygames.com/sitemap");
  const entries = [];
  // A <url> block is big: after each <loc> comes the cover image and one
  // <xhtml:link> per language (~130 of them), so the window must clear ~25 KB.
  for (const m of body.matchAll(
    /<loc>https:\/\/www\.crazygames\.com\/game\/([a-z0-9-]+)<\/loc>([\s\S]{0,60000}?)<\/url>/g
  )) {
    entries.push({
      slug: m[1],
      thumb: thumbFor(/<image:loc>([^<]+)<\/image:loc>/.exec(m[2])?.[1], 768),
    });
  }
  const unique = [...new Map(entries.map((e) => [e.slug, e])).values()];
  log(`crazygames: ${unique.length} games (sitemap carries the covers, so no per-game requests)`);

  const games = unique
    .map((g) => ({
      id: `crazy-${g.slug}`,
      title: titleFromSlug(g.slug),
      thumb: g.thumb,
      categories: [],
      pageUrl: `https://www.crazygames.com/game/${g.slug}`,
      play: { kind: "direct", url: `https://games.crazygames.com/en_US/${g.slug}/index.html` },
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    platform: { id: "crazygames", name: "CrazyGames" },
    generatedAt: new Date().toISOString(),
    source: { list: "https://www.crazygames.com/sitemap" },
    playCheck: {
      kind: "direct",
      note: "Builds sit on games.crazygames.com and send no framing headers, so the console frames them directly.",
    },
    listed: unique.length,
    count: games.length,
    games,
  };
}

// ---------------------------------------------------------------- itch.io

/**
 * Listing URLs that actually carry game cells.
 *
 * `/games/html5/top-rated` and `/most-popular` look plausible but return a page
 * with no cells at all (that was one source of a catalogue that shrank between
 * runs); the forms below are the ones that answer, and the sort is a query so the
 * page number has to be appended with the right separator.
 */
const ITCH_LISTINGS = [
  "https://itch.io/games/html5",
  "https://itch.io/games/html5?sort=top-rated",
  "https://itch.io/games/tag-html5",
];

/** Listing cells carry the game id, title, cover and page URL — everything needed. */
function parseItchCells(html) {
  const cells = [];
  for (const m of html.matchAll(/<div class="game_cell[\s\S]*?(?=<div class="game_cell|$)/g)) {
    const block = m[0];
    const gameId = /data-game_id="(\d+)"/.exec(block)?.[1];
    const pageUrl = /<a class="title game_link"[^>]*href="(https:\/\/[^"]+\.itch\.io\/[^"]+)"/.exec(block)?.[1];
    const title = /<a class="title game_link"[^>]*>([\s\S]{0,140}?)<\/a>/.exec(block)?.[1];
    const cover = /data-lazy_src="(https:\/\/img\.itch\.zone\/[^"]+)"/.exec(block)?.[1];
    if (!gameId || !pageUrl) continue;
    cells.push({
      gameId,
      pageUrl,
      title: clean(title),
      // Used exactly as given: itch signs `<hash>/<size>/<file>`, so asking for a
      // different size rewrites the path and the signature stops matching (404).
      thumb: cover || "",
    });
  }
  return cells;
}

async function crawlItch() {
  log(`itch: crawling HTML5 listings (${ITCH_PAGES} pages × ${ITCH_LISTINGS.length} sorts)`);
  const listingUrls = [];
  for (const base of ITCH_LISTINGS) {
    for (let page = 1; page <= ITCH_PAGES; page++) {
      if (page === 1) listingUrls.push(base);
      else listingUrls.push(`${base}${base.includes("?") ? "&" : "?"}page=${page}`);
    }
  }

  const pages = await pool(
    listingUrls,
    Math.min(CONCURRENCY, 4),
    async (url) => {
      const { body, status } = await fetchPage(url);
      return status === 200 ? parseItchCells(body) : [];
    },
    "itch listing pages"
  );

  const byId = new Map();
  for (const cell of pages.flat()) if (!byId.has(cell.gameId)) byId.set(cell.gameId, cell);
  log(`itch: ${byId.size} distinct browser-playable games`);

  // The play address is on the game page: the browser build is
  // `html-classic.itch.zone/html/<upload>/index.html?…`, which is framable and is
  // the game itself. itch's `embed-upload` player is only a fallback — it renders
  // black inside the rig (tested), and the widget embed needs its own play click.
  // The page is also where a full-size cover can be read: `og:image` (or the
  // page's own cover) is signed correctly, unlike a size we rewrite ourselves.
  log("itch: reading each game page for its play address and cover");
  const withAddress = await pool(
    [...byId.values()],
    CONCURRENCY,
    async (game) => {
      const { body } = await fetchPage(game.pageUrl);
      const decoded = unescapeHtml(body);
      const direct = /https:\/\/html-classic\.itch\.zone\/html\/\d+\/index\.html[^"'\\ ]*/.exec(decoded)?.[0];
      const upload = /html-classic\.itch\.zone\/html\/(\d+)\//.exec(decoded)?.[1];
      const ogImage = /<meta property="og:image" content="([^"]+)"/.exec(decoded)?.[1];
      const pageCover = /https:\/\/img\.itch\.zone\/[A-Za-z0-9=+/]+\/(?:\d+x\d+|original)[^"'\\ ]*/.exec(decoded)?.[0];
      return {
        ...game,
        thumb: ogImage || pageCover || game.thumb,
        play: direct
          ? { kind: "direct", url: direct }
          : upload
            ? { kind: "direct", url: `https://itch.io/embed-upload/${upload}?color=000000&play=1` }
            : { kind: "direct", url: `https://itch.io/embed/${game.gameId}` },
      };
    },
    "itch game pages"
  );

  const games = withAddress
    .map((g) => ({
      id: `itch-${g.gameId}`,
      title: g.title || titleFromSlug(g.pageUrl.split("/").pop()),
      thumb: g.thumb,
      categories: [],
      pageUrl: g.pageUrl,
      play: g.play,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    platform: { id: "itch", name: "itch" },
    generatedAt: new Date().toISOString(),
    source: { list: ITCH_LISTINGS.join(" + "), pages: ITCH_PAGES },
    playCheck: {
      kind: "direct",
      note: "Only browser-playable HTML5 games are listed; each plays through itch's embed, which is framable.",
    },
    listed: byId.size,
    count: games.length,
    games,
  };
}

// ---------------------------------------------------------------- sample check

/**
 * A platform-level sanity check on N games, not a sweep: it answers "does this
 * platform's address pattern still work?" and reports the answer. Never used to
 * filter the catalogue.
 */
async function sampleCheck(games, { referer, label }) {
  if (!VERIFY_SAMPLE || !games.length) return null;
  const step = Math.max(1, Math.floor(games.length / VERIFY_SAMPLE));
  const sample = games.filter((_, i) => i % step === 0).slice(0, VERIFY_SAMPLE);
  let ok = 0;
  const failures = [];
  await pool(
    sample,
    Math.min(CONCURRENCY, 6),
    async (game) => {
      const url = game.play.kind === "direct" ? game.play.url : `https://${game.play.buildHost}/${game.play.entryPath}`;
      try {
        const res = await fetchPage(url, { referer, method: "HEAD" });
        if (res.status === 200) ok++;
        else failures.push(`${game.id}:${res.status}`);
      } catch {
        failures.push(`${game.id}:network`);
      }
      return null;
    },
    `${label} sample`
  );
  const result = { sampled: sample.length, ok, failures: failures.slice(0, 10) };
  log(`${label}: sample check ${ok}/${sample.length} answered 200${failures.length ? ` — e.g. ${failures.slice(0, 5).join(", ")}` : ""}`);
  return result;
}

// ---------------------------------------------------------------- output

function slim(catalogue, sample) {
  const games = catalogue.games.map((game) => {
    const out = { id: game.id, title: game.title, thumb: game.thumb, pageUrl: game.pageUrl, play: game.play };
    if (game.categories?.length) out.categories = game.categories;
    return out;
  });
  return {
    platform: catalogue.platform,
    generatedAt: catalogue.generatedAt,
    source: catalogue.source,
    playCheck: { ...catalogue.playCheck, ...(sample ? { sample } : {}) },
    listed: catalogue.listed,
    count: catalogue.count,
    games,
  };
}

const BUILDERS = { poki: crawlPoki, crazy: crawlCrazy, itch: crawlItch };
const REFERERS = { poki: "https://poki.com/" };

async function main() {
  await mkdir(SHARED_DIR, { recursive: true });
  await mkdir(CONSOLE_DIR, { recursive: true });
  const summary = [];

  for (const [id, build] of Object.entries(BUILDERS)) {
    if (!want(id)) {
      log(`skipping ${id} (not in --only)`);
      continue;
    }
    const started = Date.now();
    const catalogue = await build();
    const sample = await sampleCheck(catalogue.games, { referer: REFERERS[id], label: `${id} builds` });
    const payload = slim(catalogue, sample);

    // Named after the platform id, not the builder key, so `crazygames` writes
    // `crazygames.json` — the file the console loader imports.
    const fileId = payload.platform.id;
    await writeFile(path.join(SHARED_DIR, `${fileId}.json`), JSON.stringify(payload, null, 1) + "\n");
    await writeFile(path.join(CONSOLE_DIR, `${fileId}.json`), JSON.stringify(payload) + "\n");

    log(`${id}: wrote ${payload.count} games in ${Math.round((Date.now() - started) / 1000)}s`);
    summary.push({
      id: payload.platform.id,
      name: payload.platform.name,
      count: payload.count,
      listed: payload.listed,
      kind: payload.playCheck.kind,
      sample: sample ? `${sample.ok}/${sample.sampled}` : null,
      file: `shared/platforms/${payload.platform.id}.json`,
    });
  }

  // The index merges with whatever was already published so a `--only=crazy` run
  // never wipes another platform's numbers — but only for platforms whose file is
  // still on disk, so deleting a catalogue (an unplayable platform) really removes
  // it instead of leaving a stale row behind.
  const indexPath = path.join(SHARED_DIR, "index.json");
  let platforms = summary;
  if (existsSync(indexPath)) {
    try {
      const previous = JSON.parse(await readFile(indexPath, "utf8"));
      const byId = new Map(
        (previous.platforms || [])
          .filter((p) => existsSync(path.join(SHARED_DIR, `${p.id}.json`)))
          .map((p) => [p.id, p])
      );
      for (const entry of summary) byId.set(entry.id, entry);
      platforms = [...byId.values()].sort((a, b) => b.count - a.count);
    } catch {
      /* stale index — replace it */
    }
  }
  const index = { generatedAt: new Date().toISOString(), platforms };
  await writeFile(indexPath, JSON.stringify(index, null, 1) + "\n");
  await writeFile(path.join(CONSOLE_DIR, "index.json"), JSON.stringify(index) + "\n");

  log(`index: ${platforms.map((p) => `${p.name} ${p.count}`).join(", ")}`);
  log(`wrote ${path.relative(ROOT, SHARED_DIR)} and ${path.relative(ROOT, CONSOLE_DIR)}`);
}

main().catch((err) => {
  console.error("crawl failed:", err);
  process.exit(1);
});
