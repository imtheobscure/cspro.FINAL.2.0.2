/**
 * Cheat mode — what a Playables build will actually let you change.
 *
 * A Unity Playable keeps its whole economy inside its own save payload: the
 * `ytgame.game.saveData(...)` string, which this console stores under
 * `tutorly:ytgame:save:<gameKey>`. That string is the game's own money: coins,
 * gems, unlocked items, level progress. Reading it tells you precisely what this
 * game calls those things — which is worth more than any keyword list, because the
 * build's own vocabulary is what the player sees on screen.
 *
 * Three levers exist, in descending order of how well they hold up:
 *
 *   1. **Rewarded ads.** The game asks the SDK for an ad and grants the reward when
 *      it is told the ad was watched. The shim now answers `{ rewardGranted: true }`,
 *      so the game's own "watch an ad for coins" button works — no patching, and
 *      nothing in the build is touched.
 *   2. **The save payload.** Parse it, add money to the fields that hold money,
 *      flip the flags that gate store items, then reload the game against the
 *      rewritten save. This is the honest equivalent of a purchase: the game sees
 *      the item as owned because its own save says so.
 *   3. **The build's own strings.** Scanning the build tells you which mechanisms
 *      it uses (rewarded ads, interstitial ads, a store) and what it names its
 *      currency — useful when the save is empty because the game has not written
 *      one yet.
 *
 * Everything here is deliberately side-effect free: parsing, scoring, listing and
 * applying all operate on plain values, so the tricky part (recognising which
 * number in an unknown game's save is money) is unit-testable without a browser.
 */

import LZString from "lz-string";

/**
 * How the save payload was encoded on the way in, so it goes back out the same way.
 *
 * Most games hand the SDK one JSON string, base64-encoded or not. The rest need a
 * named format because the *structure* is not a JSON object of their fields:
 *
 *   · `sections` — `Name:::JSON` joined by `|||`. This is the shape a Unity build
 *     with a per-subsystem data service writes (Cup Heroes saves every subsystem
 *     this way). Decoding it is what makes a game like that cheat-able at all:
 *     before, the whole payload was refused, so nothing inside it — money included —
 *     was even visible to MAX EVERYTHING.
 *   · `lz-string-*` — LZString output, the compressor most HTML5 (Phaser, Cocos,
 *     plain canvas) builds use for their own key. The dependency is already in the
 *     project, so this costs nothing to support.
 */
export type SaveFormat =
  | "json"
  | "base64-json"
  | "sections"
  | "base64-sections"
  | "lz-string-json"
  | "lz-string-sections";

export interface DecodedSave {
  /** The parsed JSON the game saved. */
  data: unknown;
  format: SaveFormat;
}

/**
 * Field names that mean "money" in a game's own save.
 *
 * Ordered by how sure the name is: `coins` is money, `points` might just be a
 * score. The score decides what gets offered first, never what is allowed — a
 * tutor looking at their own game knows better than a word list.
 */
const CURRENCY_WORDS: { re: RegExp; score: number; label: string }[] = [
  { re: /^(coins?|moneys?|cash|gold|gems?|diamonds?|crystals?|credits?|tokens?|bucks?|rubies|emeralds)$/i, score: 100, label: "currency" },
  { re: /(coins?|gold|gems?|diamonds?|crystals?|credits|tokens|bucks|money|currency|bank|wallet|balance)/i, score: 80, label: "currency" },
  { re: /^(stars?|points?|xp|score|hints?|spins?|tickets?|keys?|boosts?|boosters?|powerups?|lives|hearts|energy|ammo|arrows|bombs)$/i, score: 60, label: "resource" },
  { re: /(stars?|points|hint|spin|ticket|key|boost|powerup|life|lives|heart|energy|ammo|arrow|bomb)/i, score: 45, label: "resource" },
];

/** Flags the game uses to mean "you own this" — the thing a store purchase would set. */
const UNLOCK_WORDS = /(owned|unlocked|unlock|purchased|bought|premium|vip|ad ?free|no ?ads|remove ?ads|unlimited|purchased|hasitem|claimed|isfree|isopen|achieved)/i;

/** Numbers the game uses to gate content behind progress. */
const PROGRESS_WORDS = /^(level|stage|chapter|world|rank|tier|wave|progress|completed|upgrade|lvl|maxlevel)$/i;

/** Booleans that should stay false — setting these is not a cheat, it is a bug. */
const NEVER_TOUCH = /(tutorial|firstrun|first_run|seen|consent|privacy|age|locale|mute|muted|sound|music|volume|haptic|vibrate|difficulty)/i;

/** What a one-click cheat will do, and the exact edit it makes so the UI can explain it. */
export interface CheatAction {
  id: string;
  /** What the player is being handed, in their words ("Coins", "Unlock everything"). */
  label: string;
  /** The dotted path in the save this edits, for the honest "this is what it changes" line. */
  path: string;
  kind: "currency" | "progress" | "unlock" | "day";
  /** The value written. Strings are timestamps moved by the day simulator. */
  next: number | boolean | string;
  /** The value found before — shown so nothing changes silently. */
  before: number | boolean | string;
  score: number;
  /**
   * True when the field does not exist in the save yet and this action writes it.
   *
   * Only such an action may create a container on the way. An ordinary action that
   * points at a path the game has not written is refused rather than invented (a
   * typo must not add a field the game never reads); a synthesized wallet section
   * is the one case where creating the path *is* the edit.
   */
  created?: boolean;
}

export interface SaveField {
  path: string;
  key: string;
  value: unknown;
  kind: "number" | "boolean" | "string";
}

/** Walks a saved JSON value and lists every primitive with its dotted path. */
export function listSaveFields(data: unknown, prefix = "", depth = 0, out: SaveField[] = []): SaveField[] {
  if (depth > 8 || out.length > 400) return out;
  if (Array.isArray(data)) {
    // Array indices matter for save files (a slot per level, one entry per upgrade),
    // but only the first few are worth editing by hand — the rest are reached by the
    // "fill every currency" action. Primitives reached *through* an array have to be
    // recorded here: there is no object branch below them to do it.
    data.slice(0, 40).forEach((item, i) => {
      const path = prefix ? `${prefix}.${i}` : String(i);
      if (item !== null && typeof item === "object") {
        listSaveFields(item, path, depth + 1, out);
      } else if (item !== null && item !== undefined) {
        const key = prefix ? prefix.split(".").pop() || path : path;
        out.push({
          path,
          key,
          value: item,
          kind: typeof item === "number" ? "number" : typeof item === "boolean" ? "boolean" : "string",
        });
      }
    });
    return out;
  }
  if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object") {
        listSaveFields(value, path, depth + 1, out);
      } else if (value !== null && value !== undefined) {
        out.push({
          path,
          key,
          value,
          kind: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string",
        });
      }
    }
  }
  return out;
}

/** A big round number, so the game reads it as "rich" rather than "corrupted". */
export const CHEAT_MONEY = 100_000_000;

/**
 * Fields whose whole name means "how much of it there is".
 *
 * `Amount` on its own says nothing about what it counts — but `DiamondsData.Amount`
 * does, and so does `CoinsData.Value`. Matching the *path* as well as the leaf is
 * what makes a game whose currency fields are all called `Amount` cheat-able: Cup
 * Heroes keeps every currency under `<Name>Data.Amount`, so a leaf-only rule saw
 * nothing to raise on the whole save.
 */
const HOLDER_WORDS = /^(amount|value|count|total|balance|quantity|qty|current|free|owned|num|number|wallet|money|coins?|gems?|diamonds?|gold|cash|crystals?|credits?|tokens?)$/i;

/** A number that *is a price or a transaction counter* is not a balance. */
const COST_WORDS = /(cost|price|spent|paid|payment|purchase|transaction|revenue|received|purchased)/i;

/**
 * Does this field hold money?
 *
 * The leaf name decides first (`coins` is money, in any container). When the leaf is
 * a generic holder (`Amount`), the containers above it are asked instead — that is
 * the `DiamondsData.Amount` case. Each answer is checked against the words that mean
 * "this is a cost, a purchase or a counted transaction", because maxing
 * `AmountOfArenaEntryTicketsPurchasedForDiamonds` is not a cheat, it is a wrong edit.
 */
function currencyMatch(key: string, path: string): { score: number; label: string } | null {
  const leaf = CURRENCY_WORDS.find((w) => w.re.test(key));
  if (leaf && !COST_WORDS.test(key)) return leaf;
  if (!HOLDER_WORDS.test(key)) return null;
  const containers = path.split(".").slice(0, -1).filter((s) => !/^\d+$/.test(s));
  for (let i = containers.length - 1; i >= 0; i -= 1) {
    const container = containers[i];
    const found = CURRENCY_WORDS.find((w) => w.re.test(container));
    if (!found) continue;
    if (COST_WORDS.test(container) || /(shop|store|offer|sale)/i.test(container)) return null;
    return { score: Math.max(45, found.score - 20), label: found.label };
  }
  return null;
}

/**
 * Turns a save into the list of things worth cheating, in the order they are worth
 * trying: money first, then store unlocks, then progress gates.
 *
 * Only fields that are *already* the right shape are offered — a boolean flag is
 * only unlocked if it exists, and money is only topped up on a number. Nothing is
 * invented (except by `listSectionSynthesis`, which says so with `created: true`),
 * so an applied cheat can never introduce a field the game does not read.
 */
export function listCheatActions(data: unknown): CheatAction[] {
  const fields = listSaveFields(data);
  const actions: CheatAction[] = [];

  for (const f of fields) {
    if (NEVER_TOUCH.test(f.key)) continue;

    if (f.kind === "number") {
      const currency = currencyMatch(f.key, f.path);
      if (currency) {
        const before = Number(f.value);
        // Already generous? Then this field is not the bottleneck and can wait.
        if (!Number.isFinite(before)) continue;
        actions.push({
          id: `money:${f.path}`,
          label: `${currency.label === "currency" ? "Money" : "Resource"} · ${f.key}`,
          path: f.path,
          kind: "currency",
          // Idempotent on purpose. This used to multiply (`before * 1000`), which is
          // wrong twice over: pressing the button again compounded the value toward
          // infinity — a save holding `1e104` coins is a number most games cast into
          // an `int` and arrive at a negative — and "maxed" stopped meaning maxed.
          // Already at or above the target means it is left exactly as it is.
          next: before >= CHEAT_MONEY ? before : CHEAT_MONEY,
          before,
          score: currency.score + (before > 0 ? 10 : 0),
        });
        continue;
      }
      if (PROGRESS_WORDS.test(f.key)) {
        const before = Number(f.value);
        if (!Number.isFinite(before)) continue;
        actions.push({
          id: `progress:${f.path}`,
          label: `Progress · ${f.key}`,
          path: f.path,
          kind: "progress",
          // Also idempotent: pressing "skip ahead" twice must not walk a game's level
          // counter off the end of its own content (it reached level 1699 once).
          next: before >= 99 ? before : 99,
          before,
          score: 55,
        });
      }
      continue;
    }

    if (f.kind === "boolean" && UNLOCK_WORDS.test(f.key) && f.value === false) {
      actions.push({
        id: `unlock:${f.path}`,
        label: `Unlock · ${f.key}`,
        path: f.path,
        kind: "unlock",
        next: true,
        before: false,
        score: 70,
      });
    }
  }

  return actions.sort((a, b) => b.score - a.score).slice(0, 24);
}

/** Reads a dotted path out of a save. */
const readPath = (data: any, path: string): any =>
  path.split(".").reduce((node: any, key) => (node == null ? node : node[/^\d+$/.test(key) ? Number(key) : key]), data);

/**
 * Writes a dotted path into a save, in place, and returns the save.
 *
 * `create` is off by default: an action pointing at a path the game has never
 * written must not invent it, or a bug in the name matching would add a field the
 * game ignores and report a cheat that did nothing. A synthesized wallet section
 * passes `create: true`, because creating that path is exactly the edit.
 */
export function writeSavePath<T>(data: T, path: string, value: unknown, create = false): T {
  const keys = path.split(".");
  let node: any = data;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = /^\d+$/.test(keys[i]) ? Number(keys[i]) : keys[i];
    if (node == null || typeof node !== "object") return data;
    if (node[key] == null || typeof node[key] !== "object") {
      if (!create) return data;
      // A numeric next segment means a list, so a path that came out of a list is
      // rebuilt as one rather than as an object the game cannot read.
      node[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    node = node[key];
  }
  const last = keys[keys.length - 1];
  if (node != null && typeof node === "object") {
    node[/^\d+$/.test(last) ? Number(last) : last] = value;
  }
  return data;
}

/** Reads a dotted path out of a save (the counterpart of `writeSavePath`). */
export function readSavePath(data: unknown, path: string): unknown {
  let node: any = data;
  for (const key of path.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[/^\d+$/.test(key) ? Number(key) : key];
  }
  return node;
}

/**
 * Applies one action, or the whole list, to a save.
 *
 * A deep clone is taken first because the caller keeps the original: the drawer
 * shows what the save said before, and "undo" has to mean something.
 */
export function applyCheatActions(data: unknown, actions: CheatAction[]): unknown {
  const clone = JSON.parse(JSON.stringify(data));
  actions.forEach((a) => writeSavePath(clone, a.path, a.next, !!a.created));
  return clone;
}

/** A section body that is not JSON, kept verbatim so a rewrite cannot lose it. */
export const RAW_SECTION_KEY = "__tutorlyRawSection";

/**
 * Reads the `Name:::JSON|||Name:::JSON` shape a Unity data-service build writes.
 *
 * A section whose body does not parse is kept under `RAW_SECTION_KEY` rather than
 * dropped: a game may keep one section in a binary or encrypted form, and a rewrite
 * has to put it back exactly as it was or that state is lost.
 */
export function decodeSections(raw: string): DecodedSave | null {
  if (!raw.includes(":::")) return null;
  const data: Record<string, unknown> = {};
  let parsedAny = false;
  for (const part of raw.split("|||")) {
    if (!part) continue;
    const at = part.indexOf(":::");
    if (at <= 0) return null;
    const name = part.slice(0, at).trim();
    if (!name) return null;
    const body = part.slice(at + 3);
    try {
      data[name] = JSON.parse(body);
      parsedAny = true;
    } catch {
      data[name] = { [RAW_SECTION_KEY]: body };
    }
  }
  // Every section unreadable is not a save this engine understands; refusing is more
  // honest than presenting a page of raw strings as if it were decoded data.
  return parsedAny ? { data, format: "sections" } : null;
}

/** Writes the sectioned shape back, raw bodies included, byte for byte. */
export function encodeSections(data: unknown): string {
  const sections = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  return Object.entries(sections)
    .map(([name, value]) => {
      const raw =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)[RAW_SECTION_KEY]
          : undefined;
      return `${name}:::${typeof raw === "string" ? raw : JSON.stringify(value)}`;
    })
    .join("|||");
}

/** JSON if it parses as an object, otherwise the sectioned shape. */
function decodeStructured(text: string): DecodedSave | null {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object") return { data, format: "json" };
  } catch {
    /* not JSON — the sectioned shape below is the other possibility */
  }
  return decodeSections(raw);
}

/** Names the transport an inner decode arrived in, so the rewrite matches it. */
function wrappedFormat(inner: DecodedSave, kind: "base64" | "lz"): SaveFormat {
  const sections = inner.format === "sections";
  if (kind === "base64") return sections ? "base64-sections" : "base64-json";
  return sections ? "lz-string-sections" : "lz-string-json";
}

/**
 * Decodes a save payload.
 *
 * Saves arrive in four shapes in practice: the JSON a game wrote directly; that JSON
 * base64-encoded (the usual Unity wrapper case); a `Name:::JSON|||…` section list
 * (Cup Heroes and other data-service builds); and LZString output, which is what
 * HTML5 engines reach for. All four are returned with the format they came in, so a
 * rewrite goes back out the way it arrived. The order is cheapest-first, and none of
 * the steps can half-read: a payload is either recognised or refused.
 */
export function decodeSave(payload: string): DecodedSave | null {
  const raw = String(payload || "").trim();
  if (!raw) return null;

  const direct = decodeStructured(raw);
  if (direct) return direct;

  try {
    // `atob` answers latin1, so multi-byte characters (sha256 keys, a tutor's own
    // words in a non-Latin script) would come back as mojibake and fail to parse.
    // Round-tripping through the UTF-8 escape pair restores the original text.
    const inner = decodeStructured(decodeURIComponent(escape(atob(raw))));
    if (inner) return { data: inner.data, format: wrappedFormat(inner, "base64") };
  } catch {
    /* not base64 — fall through */
  }

  // LZString. The three variants are tried because the game decides which it used;
  // the rewrite goes back out as base64, by far the most common and what their own
  // loader reads.
  for (const decompress of [LZString.decompressFromBase64, LZString.decompressFromEncodedURIComponent, LZString.decompressFromUTF16]) {
    try {
      const inner = decodeStructured(decompress(raw) || "");
      if (inner) return { data: inner.data, format: wrappedFormat(inner, "lz") };
    } catch {
      /* try the next variant */
    }
  }

  return null;
}

/** Puts a rewritten save back into the shape the game wrote it in. */
export function encodeSave(data: unknown, format: SaveFormat): string {
  const sections = format.includes("sections");
  const body = sections ? encodeSections(data) : JSON.stringify(data);
  if (format.startsWith("lz-string")) return LZString.compressToBase64(body);
  // btoa needs latin1; the round-trip below keeps unicode keys intact.
  if (format.startsWith("base64")) return btoa(unescape(encodeURIComponent(body)));
  return body;
}

/** The save format said the way the panel should say it. */
export function describeSaveFormat(format: SaveFormat): string {
  switch (format) {
    case "sections":
      return "the game's own section format";
    case "base64-sections":
      return "base64-wrapped sections";
    case "lz-string-json":
      return "LZString-compressed JSON";
    case "lz-string-sections":
      return "LZString-compressed sections";
    case "base64-json":
      return "base64 JSON";
    default:
      return "plain JSON";
  }
}

/**
 * Wallet sections worth adding to a save that names its parts.
 *
 * ── The gap this closes ─────────────────────────────────────────────────────
 * A game that keeps its money in a section writes that section only once the money
 * changes. On a profile that has never earned any, the save simply has no
 * `DiamondsData` — and MAX EVERYTHING, which may only edit fields that already
 * exist, has nothing to raise. The player sees "no cheats found" on a game that very
 * much has money, which is exactly what was reported for Cup Heroes.
 *
 * The names are not guesses about a random game: a data-service build names its
 * currency classes after the currency (`CupHeroes.Features.Currencies.Diamonds.Data`
 * → `DiamondsData`) and its repositories expose `Amount` (`SetAmount`, `AddAmount`,
 * `OnAmountChanged`). Verified on Cup Heroes — injecting `DiamondsData:::{"Amount":N}`
 * into a live save puts N in the game's own memory — and harmless elsewhere: a game
 * loads the sections it knows and ignores the rest (checked: Cup Heroes still boots
 * with extra sections present).
 *
 * `Diamonds` and `Coins` are always offered for a sectioned save because they are the
 * two every one of these games has; the rest only when the save or the build scan
 * mentions the word. A section that already exists is never offered — its real fields
 * are found by `listCheatActions` instead.
 */
const SYNTHETIC_WALLETS: { section: string; label: string; word: RegExp; always?: boolean }[] = [
  { section: "DiamondsData", label: "Diamonds", word: /diamond/i, always: true },
  { section: "CoinsData", label: "Coins", word: /coin/i, always: true },
  { section: "GemsData", label: "Gems", word: /gem/i },
  { section: "GoldData", label: "Gold", word: /gold/i },
  { section: "CashData", label: "Cash", word: /cash/i },
  { section: "CrystalsData", label: "Crystals", word: /crystal/i },
  { section: "CreditsData", label: "Credits", word: /credit/i },
  { section: "TokensData", label: "Tokens", word: /token/i },
  { section: "HeroTokensData", label: "Hero tokens", word: /hero/i },
];

/**
 * Whether a game writes an amount as a JSON number or as text in quotes.
 *
 * Both are real: `DiamondsData.Amount` on Cup Heroes is a number, but the same build
 * throws `InvalidCastException: Unable to cast object of type 'Int64' to type 'String'`
 * when a wallet it reads with `Value<string>()` arrives as one. Guessing wrong costs the
 * whole section, so the shape is read off the save instead of being hard-coded per game:
 * a game whose existing `Amount` fields are quoted text gets invented wallets quoted too,
 * and a number is written as a number. Nothing to go on → number, the commoner shape.
 */
export type WalletShape = "number" | "string";

/** A field whose whole job is to hold an amount — the vocabulary `currencyMatch` uses. */
const AMOUNT_ONLY = /^(amount|value|balance|quantity|qty|total|sum|money|count|coins?|gems?|cash|gold|crystals?|credits?|tokens?|diamonds?|stars?|keys?)$/i;

/** The shape this game already writes its amounts in. */
export function walletShapeOf(data: unknown): WalletShape {
  if (!data || typeof data !== "object") return "number";
  let numeric = 0;
  let textual = 0;
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 3) return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === "number") {
        if (AMOUNT_ONLY.test(key) && Number.isFinite(value)) numeric += 1;
      } else if (typeof value === "string") {
        if (AMOUNT_ONLY.test(key) && /^-?\d+$/.test(value.trim())) textual += 1;
      } else {
        visit(value, depth + 1);
      }
    }
  };
  visit(data, 0);
  return textual > numeric ? "string" : "number";
}

/** The same amount in the other shape — the one retry a refused wallet gets. */
export function flipWalletValue(value: unknown): string | number | boolean {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value ?? "");
}

/**
 * The wallet actions that would be added to a save that does not carry them yet.
 *
 * `hints` are currency words the build scan found, so a game whose *save* has no
 * currency word in any section name can still be matched through its own build.
 */
export function listSectionSynthesis(
  data: unknown,
  hints: string[] = [],
  shape: WalletShape = walletShapeOf(data)
): CheatAction[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const sections = data as Record<string, unknown>;
  const present = new Set(Object.keys(sections));
  const vocabulary = `${Object.keys(sections).join(" ")} ${hints.join(" ")}`;
  const out: CheatAction[] = [];
  for (const wallet of SYNTHETIC_WALLETS) {
    if (present.has(wallet.section)) continue;
    if (!wallet.always && !wallet.word.test(vocabulary)) continue;
    const amount = shape === "string" ? String(CHEAT_MONEY) : CHEAT_MONEY;
    out.push({
      id: `new:${wallet.section}.Amount`,
      label: `Add ${wallet.label}`,
      path: `${wallet.section}.Amount`,
      kind: "currency",
      before: 0,
      next: amount,
      // Below a real field found in the save (score 60+), above nothing: MAX
      // EVERYTHING runs it last, after everything the game itself named.
      score: 50,
      created: true,
    });
    if (out.length >= 4) break;
  }
  return out;
}

/** One day, the amount every daily counter in every game is waiting for. */
export const DAY_MS = 86_400_000;
/** One day in .NET ticks (100 ns each), which is how a serialised `DateTime` counts. */
const DAY_TICKS = 864_000_000_000;

/** A path that talks about time. `day` alone is included: `DailyGiftData`, `SavedDay`. */
const TIME_WORD = /(last|next|prev|start|end|expire|expir|reset|refresh|claim|daily|day|date|time|clock|cooldown|until|deadline|gift|bonus|streak|login|activity|ticks)/i;
/** A span, not a moment: "how long something takes" must not be moved. */
const DURATION_WORD = /(duration|delta|elapsed|interval|hours|seconds|minutes|remaining|timeout|period|length)/i;

/**
 * The fields a "one day passed" click moves back by a day.
 *
 * ── Why the clock alone is not enough ────────────────────────────────────────
 * The console also moves the frame's own clock (see `lib/timeShift.ts` and the shim),
 * which is the lever that works on a game whose daily logic is computed live. But a
 * game that stores "you last claimed at T" only unlocks a reward when T is old
 * enough — and if it compares T against a cached value or its own recorded time, the
 * frame clock cannot help. Moving the stored timestamps back is the save-side half,
 * and the two together are what make the button work across different games. Cup
 * Heroes needed both: `DailyGiftData.LastLoginDateTime` is a .NET `{Ticks}` object
 * while `DiamondsShopData.FreeDimondsResetTime` is an ISO string with a +03:30
 * offset, and those are exactly the daily gift and the free diamonds.
 *
 * Only values that really are timestamps are touched — magnitude decides, not the
 * name: a field called `day` holding `3` is a counter, and subtracting a day from it
 * would corrupt it. Durations are left alone on purpose.
 */
export function listDayShiftActions(data: unknown): CheatAction[] {
  const out: CheatAction[] = [];
  walkForTime(data, "", out);
  return out.sort((a, b) => a.path.localeCompare(b.path)).slice(0, 12);
}

function walkForTime(node: unknown, path: string, out: CheatAction[]): void {
  if (!node || typeof node !== "object" || out.length > 40) return;
  if (Array.isArray(node)) {
    node.slice(0, 40).forEach((item, i) => walkForTime(item, path ? `${path}.${i}` : String(i), out));
    return;
  }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const childPath = path ? `${path}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      // .NET `DateTime` serialised as `{ Ticks: 639264960000000000 }`. The path in
      // the action has to reach the number, not the wrapper, or the write lands on
      // the object and the game reads back what it wrote.
      const ticks = (value as Record<string, unknown>).Ticks;
      const next = shiftedTime(ticks, `${childPath}.Ticks`, key);
      if (typeof next === "number" && typeof ticks === "number") {
        out.push(timeAction(`${childPath}.Ticks`, key, ticks, next));
        continue;
      }
      walkForTime(value, childPath, out);
      continue;
    }
    const next = shiftedTime(value, childPath, key);
    if (next !== undefined) out.push(timeAction(childPath, key, value as number | string, next));
  }
}

function timeAction(path: string, key: string, before: number | string, next: number | string): CheatAction {
  return { id: `day:${path}`, label: `Day · ${key}`, path, kind: "day", before, next, score: 40 };
}

/** The same timestamp a day earlier, in whatever shape the value already uses. */
function shiftedTime(value: unknown, path: string, key: string): number | string | undefined {
  if (!TIME_WORD.test(path) || DURATION_WORD.test(path) || DURATION_WORD.test(key)) return undefined;
  if (typeof value === "number") {
    const abs = Math.abs(value);
    if (abs > 1e15) return value - DAY_TICKS; // .NET ticks
    if (abs > 1e12) return value - DAY_MS; // epoch milliseconds
    if (abs > 1e9 && abs < 4e9) return value - 86_400; // epoch seconds
    return undefined; // a counter, an index, a level — not a moment
  }
  if (typeof value === "string") {
    if (/^\d{10,13}$/.test(value.trim())) {
      const n = Number(value);
      return String(value.length >= 12 ? n - DAY_MS : n - 86_400);
    }
    const shifted = shiftTextDate(value);
    return shifted === value ? undefined : shifted;
  }
  return undefined;
}

const ISO_LIKE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * One day earlier for an ISO-shaped timestamp, keeping its shape.
 *
 * `2026-10-03T00:00:00+03:30` becomes `2026-10-02T00:00:00+03:30`, a date-only value
 * stays date-only, and a value with no zone keeps the same wall-clock time. The
 * comparison a daily timer makes is against a wall clock, so preserving the shape
 * matters more than re-deriving the exact instant; a rewrite that changed the format
 * could make the game fail to parse a field it wrote itself.
 */
function shiftTextDate(text: string): string {
  const match = ISO_LIKE.exec(String(text).trim());
  if (!match) return text;
  const [, year, month, day, hour, minute, second, fraction, zone] = match;
  if (Number(year) < 2000) return text; // year 1 is "never set", not a date to move
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour || 0),
    Number(minute || 0),
    Number(second || 0),
    Number((fraction || "0").slice(0, 3).padEnd(3, "0"))
  );
  if (!Number.isFinite(base)) return text;
  const moved = new Date(base - DAY_MS);
  const datePart = `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}`;
  if (hour === undefined) return datePart;
  const timePart = `${datePart}T${pad(moved.getUTCHours())}:${pad(moved.getUTCMinutes())}:${pad(moved.getUTCSeconds())}`;
  return `${timePart}${fraction ? `.${fraction}` : ""}${zone || ""}`;
}

/**
 * What the build itself says about its economy.
 *
 * Scanned from the build's own files, so it reports the mechanisms this game really
 * calls — a build that never asks the SDK for an ad has no ad reward to grant, and
 * promising one would be a lie.
 */
export interface BuildIntel {
  rewardedAd: boolean;
  interstitialAd: boolean;
  store: boolean;
  /** Currency-ish words the build contains, with how often each appears. */
  words: { word: string; count: number }[];
  /** Warnings worth showing next to the analysis ("save is empty" and the like). */
  notes: string[];
}

const BUILD_NEEDLES = [
  "requestRewardedAd",
  "requestInterstitialAd",
  "RewardedAd",
  "rewarded",
  "reward",
  "purchase",
  "bought",
  "unlocked",
  "unlock",
  "premium",
  "noAds",
  "removeAds",
  "buy",
  "shop",
  "store",
  "iap",
];

const WORD_NEEDLES = [
  "coin",
  "coins",
  "gem",
  "gems",
  "gold",
  "money",
  "cash",
  "cash",
  "diamond",
  "diamonds",
  "crystal",
  "credit",
  "credits",
  "token",
  "tokens",
  "star",
  "stars",
  "hint",
  "hints",
  "spin",
  "spins",
  "life",
  "lives",
  "energy",
  "booster",
  "powerup",
  "power-up",
  "key",
  "keys",
  "ticket",
  "tickets",
  "gemstone",
  "wallet",
  "balance",
];

/**
 * Counts ASCII runs in a binary payload.
 *
 * `.wasm` and `.data` are binary, but every string the game uses to talk to itself
 * — the same `"coins"` the save uses — sits in them as plain ASCII. Scanning the
 * printable runs finds them without needing to understand the format, and the byte
 * cap keeps a 40 MB build from freezing the tab.
 */
export function scanBinaryFor(bytes: Uint8Array, needles: string[]): Map<string, number> {
  const hits = new Map<string, number>();
  let run = "";
  const flush = () => {
    if (run.length >= 3) {
      const lower = run.toLowerCase();
      for (const needle of needles) {
        if (lower.includes(needle)) hits.set(needle, (hits.get(needle) || 0) + 1);
      }
    }
    run = "";
  };
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (b >= 32 && b < 127) run += String.fromCharCode(b);
    else flush();
  }
  flush();
  return hits;
}

/** Reads a text asset (HTML, JS, JSON) for the same evidence. */
export function scanTextFor(text: string, needles: string[]): Map<string, number> {
  const hits = new Map<string, number>();
  const lower = String(text || "").toLowerCase();
  for (const needle of needles) {
    let index = 0;
    let count = 0;
    const n = needle.toLowerCase();
    while ((index = lower.indexOf(n, index)) !== -1 && count < 500) {
      count += 1;
      index += n.length;
    }
    if (count) hits.set(needle, count);
  }
  return hits;
}

/** Folds every discovery into the report the drawer shows. */
export function summariseIntel(files: string[], hits: Map<string, number>, saveFound: boolean): BuildIntel {
  const has = (n: string) => (hits.get(n) || 0) > 0;
  const words = WORD_NEEDLES.filter((w) => (hits.get(w) || 0) > 0)
    .map((w) => ({ word: w, count: hits.get(w) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const notes: string[] = [];
  if (!saveFound) notes.push("No save yet — play a round, or use the save editor below once the game writes one.");
  if (!files.length) notes.push("Nothing could be read from the build URL; the save below is still editable.");

  return {
    rewardedAd: has("requestRewardedAd") || has("RewardedAd") || has("rewarded"),
    interstitialAd: has("requestInterstitialAd"),
    store: has("purchase") || has("store") || has("shop") || has("buy") || has("iap"),
    words,
    notes,
  };
}

/** The needles the build scan uses, exposed so the drawer and its test agree. */
export const BUILD_INTEL_NEEDLES = [...BUILD_NEEDLES, ...WORD_NEEDLES];
