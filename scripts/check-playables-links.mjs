/**
 * Is the Playables link this app stores still the one YouTube serves?
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * A Playables game's build does not live at a stable address. YouTube hands each
 * published build its own numeric host (`<id>.playables.usercontent.goog`), and a
 * game that is re-published gets a **new** one. `playables.json` records the host
 * that was live when the catalogue was scraped, so after a re-publish the stored
 * address is stale: the rig asks for a build that is gone, shows a dead frame, and
 * the game looks "corrupt" when in fact only the address is.
 *
 * That suspicion is worth being able to settle in one command, per game or for the
 * whole catalogue, without opening a browser:
 *
 *   node scripts/check-playables-links.mjs                 # 12-game sample
 *   node scripts/check-playables-links.mjs --id=UgkxyKs3…  # one game (id or title)
 *   node scripts/check-playables-links.mjs --all           # every entry
 *   node scripts/check-playables-links.mjs --all --fix     # repair stale hosts in place
 *
 * `--fix` rewrites only `buildHost` and `entryPath` of the entries that answered with
 * a different live host, and only after that live build has answered 200 — a bad
 * network minute cannot leave a worse address in the catalogue than the one it
 * started with. Rebuild the console afterwards (`npm run build` in
 * `tutorly-games/adult/console`), because the bundled copy of the catalogue is what
 * the app actually reads.
 *
 * An exit code of 1 means at least one entry is stale, so it can gate a deploy.
 */
import { readFile, writeFile } from "node:fs/promises";

const CATALOG = "tutorly-games/adult/console/src/data/playables.json";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === `--${name}`);
const value = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : "";
};
const FIX = flag("fix");
const ALL = flag("all");
const ONLY = value("id");
const LIMIT = ALL ? Infinity : Number(value("limit") || 12);

/** One flaky host must not end the run — it is a data point, not a verdict. */
const tryFetch = async (url, init) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (attempt === 2) return { status: 0, text: async () => "", error: err.message };
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
};

/**
 * The address YouTube serves for one Playable today.
 *
 * The page carries the build as a trusted resource URL; the host and the entry path
 * are read out of it exactly as `play.php` and the console do, so this script and the
 * running app never disagree about what an entry means.
 */
const resolveLiveBuild = async (id) => {
  const res = await tryFetch(`https://www.youtube.com/playables/${encodeURIComponent(id)}?hl=en`, {
    headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" },
  });
  const html = await res.text();
  const source =
    /"privateDoNotAccessOrElseTrustedResourceUrlWrappedValue":"(https:[^"]*playables\.usercontent\.goog[^"]*)"/.exec(html)?.[1] ||
    /https:\/\/(\d+)\.playables\.usercontent\.goog\/([^"\\]+)/.exec(html)?.[0] ||
    "";
  // The fragment is YouTube's own build flag (`#flags={…}`), which the catalogue keeps
  // in its `hash` field. Comparing it as part of the path would report a perfectly
  // current entry as stale, so the two are split here.
  const [path, fragment = ""] = (/usercontent\.goog\/([^"?]*)/.exec(source)?.[1] || "").split("#");
  return {
    status: res.status,
    error: res.error,
    host: /(\d+)\.playables\.usercontent\.goog/.exec(source)?.[1] || "",
    entry: path,
    fragment: fragment ? `#${fragment}` : "",
  };
};

const catalog = JSON.parse(await readFile(CATALOG, "utf8"));

let targets;
if (ONLY) {
  const needle = ONLY.toLowerCase();
  targets = catalog.filter((g) => g.id === ONLY || String(g.title).toLowerCase().includes(needle));
  if (!targets.length) {
    // A game this console deliberately leaves out is not in the catalogue, so there is
    // no stored address to check — say which list it is on rather than "no match",
    // which reads like a typo.
    const excluded = await readFile("tutorly-games/adult/console/src/data/catalog.ts", "utf8")
      .then((src) => src.includes(ONLY))
      .catch(() => false);
    console.error(
      `No catalogue entry matches "${ONLY}".` +
        (excluded
          ? `\nIt is on the exclusion list in src/data/catalog.ts (EXCLUDED_PLAYABLES), so it is\noffered nowhere in the console and has no stored address to check.`
          : "")
    );
    process.exit(2);
  }
} else if (ALL) {
  targets = catalog;
} else {
  const step = Math.max(1, Math.floor(catalog.length / LIMIT));
  targets = catalog.filter((_, i) => i % step === 0).slice(0, LIMIT);
}

console.log(
  `Checking ${targets.length} of ${catalog.length} Playables entr${catalog.length === 1 ? "y" : "ies"}${
    FIX ? " (repairing stale hosts)" : ""
  }…\n`
);

const stale = [];
const unreachable = [];
const fixes = new Map();

for (const game of targets) {
  const live = await resolveLiveBuild(game.id);
  const storedHost = String(game.buildHost || "");
  const sameHost = !!live.host && live.host === storedHost;
  const sameEntry = !!live.entry && live.entry === String(game.entryPath || "");
  const current = sameHost && sameEntry;

  let liveStatus = "-";
  if (live.host && live.entry) {
    const probe = await tryFetch(
      `https://${live.host}.playables.usercontent.goog/${live.entry}`,
      { headers: { "user-agent": UA } }
    );
    liveStatus = probe.error ? `net:${String(probe.error).slice(0, 20)}` : String(probe.status);
  }

  if (!live.host) unreachable.push(game);
  else if (!current) stale.push(game);
  if (!current && live.host && live.entry && liveStatus === "200") {
    fixes.set(game.id, { buildHost: live.host, entryPath: live.entry });
  }

  console.log(
    `${current ? "ok      " : live.host ? "STALE   " : "UNKNOWN "}` +
      `${String(game.title).slice(0, 26).padEnd(27)} stored ${storedHost.padEnd(21)} ` +
      `live ${String(live.host || "-").padEnd(21)} entry ${liveStatus}` +
      (current ? "" : `  ${String(game.entryPath || "-")} → ${String(live.entry || "-")}`)
  );
}

console.log(
  `\n${targets.length - stale.length - unreachable.length}/${targets.length} current · ` +
    `${stale.length} stale · ${unreachable.length} unreachable`
);

if (FIX && fixes.size) {
  const next = catalog.map((g) => (fixes.has(g.id) ? { ...g, ...fixes.get(g.id) } : g));
  await writeFile(CATALOG, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Repaired ${fixes.size} entr${fixes.size === 1 ? "y" : "ies"} in ${CATALOG}.`);
  console.log("Rebuild the console so the bundled catalogue picks the change up.");
} else if (fixes.size && !FIX) {
  console.log(`Run again with --fix to update ${fixes.size} entr${fixes.size === 1 ? "y" : "ies"}.`);
}

if (unreachable.length) {
  console.log(
    `\nUnreachable (no build address in the page — usually rate-limiting; retry before "fixing" these):` +
      unreachable.map((g) => `\n  ${g.id} ${g.title}`).join("")
  );
}

process.exit(stale.length || unreachable.length ? 1 : 0);
