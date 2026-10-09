/**
 * Memory Editor — find a value the running game is holding, and change it.
 *
 * ── What this is, and what it is not ────────────────────────────────────────
 * A desktop memory editor (Cheat Engine, GameGuardian) reads another process's
 * address space, so it can find a number it was never told the name of: you search
 * for `25`, the trainer reports four addresses, you spend coins, you search for `20`,
 * and one address is left — that is the money. Write to it and the game changes on
 * its next frame, because the game *is* that number.
 *
 * A browser tab cannot read another origin's address space, and it cannot read its
 * own raw memory either. What it *can* do — for a frame on its own origin, which is
 * what the proxy gives us — is reach everything the game can reach: the same global
 * objects, the same arrays, the same typed arrays, and for a WebAssembly build the
 * same linear memory the game reads every frame. Walking that reachable graph and
 * matching numbers is the browser's honest equivalent of an address scan, and it
 * finds what a trainer finds: the actual object the game's money lives in. Writing to
 * it is a real, immediate change — not a save file that has to be reloaded and read.
 *
 * ── Why narrowing is the whole trick ────────────────────────────────────────
 * A first scan for `25` matches every 25 in the game — positions, timers, array
 * lengths, colours. That is not useful on its own, and it is exactly how a real
 * editor behaves: change the value in the game, search again, and the candidates
 * collapse to the one address whose value followed the change. This module therefore
 * keeps the *addresses* (holder and key, or the view and index) between scans rather
 * than only the numbers, which is what makes the second search a narrowing pass
 * instead of a fresh look.
 *
 * ── The three kinds of address ─────────────────────────────────────────────
 *   · **slot** — a named property on a live object (`game.money`). The most readable
 *     match, and the one a JS build usually has. It goes stale if the game replaces
 *     that object, which is honest: a real editor has the same problem with a freed
 *     pointer, and the narrowing pass drops it rather than lying about it.
 *   · **typed** — one element of a typed array (`Int32Array[412]`). WASM module
 *     builds, Emscripten heaps and canvas games that keep private buffers all look
 *     like this, and the address is stable for the life of the array.
 *   · **buffer** — a word inside an `ArrayBuffer` or a `WebAssembly.Memory`, reached
 *     through a view built for the scan. This is a Unity build's real memory: the game
 *     reads its heap every frame, so a write is live on the next one.
 *
 * ── Deliberately out of reach ───────────────────────────────────────────────
 * Three things are never walked, each for a reason about being *right* rather than
 * being thorough:
 *
 *   · **`window.parent` / `top` / `frames`.** The parent is the console itself. A scan
 *     crossing that edge would offer to rewrite the console's own React state and the
 *     tutor's saved scores — a cheat panel damaging the app it lives in.
 *   · **The DOM.** `document.documentElement` is an enormous cyclic graph, and entering
 *     it would spend the whole node budget before reaching any game state. Numbers that
 *     matter to a game live in its own objects, so DOM nodes are skipped by `nodeType`
 *     rather than by a name list.
 *   · **Map and Set entries.** Their *objects* are walked, but an entry is not offered
 *     as an address: a Map value cannot be written through a property path, and
 *     pretending otherwise would report a successful write that changed nothing.
 *
 * Everything here operates on a caller-supplied root, so the scanner is unit-testable
 * in Node against a plain object graph — no browser, no frame, no game.
 */

/** How a matched number is stored, so a write puts the same shape back. */
export type NumericKind = "int" | "float";

/** Where a match lives, and therefore how it is read and written. */
export type MemoryRegion = "slot" | "typed" | "buffer";

export interface MemoryMatch {
  region: MemoryRegion;
  /** `slot`: the object holding the value. Otherwise: the view to write through. */
  holder: object;
  /** `slot`: the property name or array index. Otherwise: the element index. */
  key?: string | number;
  /** Bytes one value occupies — the stride this address was found on. */
  width: number;
  /** Whether the value reads back whole or fractional. */
  numeric: NumericKind;
  /** The value at this address when the scan ran. */
  value: number;
  /** Something short and stable to print in a list ("money", "heap@0x1f40"). */
  label: string;
  /** Which object the address was reached through, so the list is readable. */
  path: string;
}

export interface ScanBudget {
  /** Objects to visit before giving up. */
  maxNodes: number;
  /** Matches to keep. The 5,001st is not more useful than the 5,000th. */
  maxMatches: number;
  /** Milliseconds to spend. A blocked tab in front of a class is worse than no match. */
  maxMillis: number;
  /**
   * Bytes of raw memory to scan.
   *
   * The cap that stops the freeze: a Unity heap is routinely 256 MB, and reading it
   * three ways is 190 million reads. 48 MB is more memory than any Playable's economy
   * lives in, and keeps a scan inside the millisecond budget.
   */
  maxBytes: number;
}

/**
 * Defaults chosen from what a real game looks like, not from theory.
 *
 * 120k nodes covers a busy JS game's graph several times over while staying far below
 * the point where a scan takes longer than a tutor will wait, and the 2.5 s ceiling is
 * the backstop for the case a cap alone cannot cover — a graph that is wide rather
 * than deep, where each node is cheap and they never stop arriving.
 */
export const DEFAULT_BUDGET: ScanBudget = { maxNodes: 120_000, maxMatches: 5_000, maxMillis: 2_500, maxBytes: 48 * 1024 * 1024 };

export interface ScanResult {
  matches: MemoryMatch[];
  /** Objects visited, so the UI can say how hard it looked. */
  nodes: number;
  /** Bytes of raw memory read. */
  bytes: number;
  /** True when a cap stopped the scan early — reported, never hidden. */
  truncated: boolean;
  /** Regions that contributed at least one match. */
  regions: MemoryRegion[];
  /** Why the scan could not run at all, when that is the case. */
  blocked?: string;
}

export interface ScanOptions {
  /** Treat a float match as equal within this much (0 = exact, like a trainer). */
  tolerance?: number;
  budget?: Partial<ScanBudget>;
  /**
   * Set for a narrowing pass: only these addresses are re-read, and an address whose
   * value is no longer a number is dropped rather than resurrected.
   */
  within?: MemoryMatch[];
}

/** Enough to read a number out of an address, whichever kind it is. */
export function readMatch(m: MemoryMatch): number | null {
  try {
    const v =
      m.region === "slot"
        ? (m.holder as Record<string | number, unknown>)[m.key as string | number]
        : (m.holder as unknown as ArrayLike<number>)[m.key as number];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Writes a number back to an address, rounding for an int-shaped one. */
export function writeMatch(m: MemoryMatch, value: number): boolean {
  try {
    const stored = m.numeric === "int" ? Math.round(value) : value;
    const target = m.region === "slot" ? (m.holder as Record<string | number, unknown>) : (m.holder as unknown as Record<number, number>);
    target[m.key as never] = stored as never;
    return true;
  } catch {
    return false;
  }
}

/** Equality with an optional float tolerance — a trainer's "exact value" search. */
const same = (a: number, b: number, tolerance: number): boolean => {
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  if (tolerance <= 0) return a === b;
  return Math.abs(a - b) <= tolerance;
};

/**
 * Keys never followed from the game's window.
 *
 * `parent`/`top`/`frames` cross into the console (see the header). `document` and the
 * DOM are skipped by shape as well — `nodeType` catches every node, including ones
 * reached through a game's own object, which a name list would miss. The rest are
 * browser singletons whose numeric fields are never the game's money, and some of
 * whose accessors are deliberately slow or noisy.
 */
const NEVER_FOLLOW = new Set([
  "parent",
  "top",
  "frames",
  "domWindow",
  "document",
  "location",
  "navigator",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "caches",
  "history",
  "screen",
  "performance",
  "cookieStore",
  "speechSynthesis",
]);

/** The same names, where they appear as a property on some nested object. */
const NEVER_FOLLOW_NESTED = new Set(["document", "parent", "top", "frames", "location", "navigator", "localStorage", "sessionStorage"]);

const isDomNode = (value: object): boolean => typeof (value as { nodeType?: unknown }).nodeType === "number";

/** A readable name for the object an address was found on. */
function pathOf(chain: string[], key: string | number): string {
  const tail = chain.length ? chain[chain.length - 1] : "window";
  return `${tail}.${String(key)}`;
}

/** Typed-array element readers — the ones a game really uses, and their strides. */
const TYPED_READERS: Record<string, [NumericKind, number]> = {
  Int8Array: ["int", 1],
  Uint8Array: ["int", 1],
  Uint8ClampedArray: ["int", 1],
  Int16Array: ["int", 2],
  Uint16Array: ["int", 2],
  Int32Array: ["int", 4],
  Uint32Array: ["int", 4],
  Float32Array: ["float", 4],
  Float64Array: ["float", 8],
};

const ctorName = (v: object): string => {
  try {
    return (v as { constructor?: { name?: string } }).constructor?.name || "";
  } catch {
    return "";
  }
};

/** Views built over raw memory, cached so a narrowing pass writes through the same one. */
interface BufferViews {
  i32?: Int32Array;
  f32?: Float32Array;
  f64?: Float64Array;
}

/** A scratch pool, so one scan does not build a new view per byte offset. */
const viewCache = new WeakMap<ArrayBuffer, BufferViews>();

function viewsFor(buffer: ArrayBuffer): BufferViews {
  let views = viewCache.get(buffer);
  if (!views) {
    views = {};
    viewCache.set(buffer, views);
  }
  return views;
}

/**
 * Scan a reachable object graph for a value, or narrow a previous scan.
 *
 * Two modes and one entry point, because they are the same operation from the caller's
 * point of view: find the addresses whose value is now this number. With `within`,
 * only those addresses are considered — which is what turns a useless first scan into
 * a single answer after the second.
 */
export function scanMemory(root: unknown, target: number, options: ScanOptions = {}): ScanResult {
  const tolerance = options.tolerance ?? 0;
  const budget: ScanBudget = { ...DEFAULT_BUDGET, ...(options.budget || {}) };
  const started = Date.now();
  const regions = new Set<MemoryRegion>();
  let truncated = false;

  // ── Narrowing pass ────────────────────────────────────────────────────────
  // Re-reads the addresses that survived and keeps those that still equal the value.
  // An address that is no longer a number is dropped: the game moved on, and keeping
  // it would mean offering to write to something that is no longer the value the
  // tutor is chasing.
  if (options.within) {
    const kept: MemoryMatch[] = [];
    for (const m of options.within) {
      if (kept.length >= budget.maxMatches) {
        truncated = true;
        break;
      }
      const now = readMatch(m);
      if (now === null || !same(now, target, tolerance)) continue;
      kept.push({ ...m, value: now });
      regions.add(m.region);
    }
    return { matches: kept, nodes: options.within.length, bytes: 0, truncated, regions: [...regions] };
  }

  if (typeof root !== "object" || root === null) {
    return { matches: [], nodes: 0, bytes: 0, truncated: false, regions: [], blocked: "there is no game on screen to search" };
  }

  const seen = new WeakSet<object>();
  const queue: { value: object; chain: string[] }[] = [{ value: root as object, chain: [] }];
  const matches: MemoryMatch[] = [];
  let nodes = 0;
  let bytesRead = 0;
  let cursor = 0;
  /** Set once the match cap fills, so long scans stop early instead of grinding. */
  let full = false;

  /** Record a number if it is the one being hunted. */
  const consider = (m: MemoryMatch) => {
    if (full) return;
    if (!same(m.value, target, tolerance)) return;
    if (matches.length >= budget.maxMatches) {
      full = true;
      truncated = true;
      return;
    }
    matches.push(m);
    regions.add(m.region);
  };

  const outOfTime = () => Date.now() - started > budget.maxMillis;

  while (cursor < queue.length) {
    if (full || nodes >= budget.maxNodes || outOfTime()) {
      truncated = true;
      break;
    }
    const { value: node, chain } = queue[cursor++];
    if (typeof node !== "object" || node === null) continue;
    if (seen.has(node)) continue;
    seen.add(node);
    nodes += 1;

    // Arrays first: they are where a game keeps its real state, and a plain key walk
    // would reach them but read them as opaque indexed properties.
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i += 1) {
        const v = node[i];
        if (typeof v === "number") {
          consider({ region: "slot", holder: node, key: i, width: 8, numeric: Number.isInteger(v) ? "int" : "float", value: v, label: `[${i}]`, path: pathOf(chain, `[${i}]`) });
        } else if (v && typeof v === "object") {
          queue.push({ value: v, chain: [...chain, "[]"] });
        }
      }
      continue;
    }

    const name = ctorName(node);

    // Map and Set: their objects are walked, their entries are not offered as
    // addresses — see the header for why.
    if (name === "Map" || name === "WeakMap") {
      try {
        for (const [k, v] of node as Map<unknown, unknown>) {
          if (v && typeof v === "object") queue.push({ value: v as object, chain: [...chain, "map value"] });
          if (k && typeof k === "object") queue.push({ value: k as object, chain: [...chain, "map key"] });
        }
      } catch {
        /* an unreadable Map contributes nothing */
      }
      continue;
    }
    if (name === "Set" || name === "WeakSet") {
      try {
        for (const v of node as Set<unknown>) if (v && typeof v === "object") queue.push({ value: v as object, chain: [...chain, "set"] });
      } catch {
        /* ignore */
      }
      continue;
    }

    const typed = TYPED_READERS[name];

    if (ArrayBuffer.isView(node) && typed) {
      const [numeric, width] = typed;
      const view = node as unknown as ArrayLike<number>;
      // A view can be enormous; the byte budget applies to it exactly as it does to a
      // raw buffer, so a 200 MB heap view cannot walk past the ceiling.
      const limit = Math.min(view.length, Math.floor(budget.maxBytes / width));
      for (let i = 0; i < limit; i += 1) {
        if (full) break;
        if (outOfTime()) {
          truncated = true;
          break;
        }
        let v: number;
        try {
          v = view[i];
        } catch {
          continue;
        }
        if (typeof v !== "number" || !Number.isFinite(v)) continue;
        consider({ region: "typed", holder: node, key: i, width, numeric, value: v, label: `[${i}]`, path: `${pathOf(chain, name)}[${i}]` });
      }
      bytesRead += Math.min(view.length, limit) * width;
      continue;
    }

    // Raw memory: an `ArrayBuffer`, or a `WebAssembly.Memory` (which is not itself a
    // buffer but *has* one), or a `DataView` over either. All three are read through
    // freshly built views, which is both far faster than `DataView.getFloat32` per
    // offset and what a write needs anyway.
    const rawBuffer: ArrayBuffer | null =
      name === "ArrayBuffer" || name === "SharedArrayBuffer"
        ? (node as ArrayBuffer)
        : (node as { buffer?: unknown }).buffer instanceof ArrayBuffer
        ? ((node as { buffer: ArrayBuffer }).buffer)
        : null;

    if (rawBuffer) {
      const total = rawBuffer.byteLength;
      const usable = Math.min(total, budget.maxBytes);
      const views = viewsFor(rawBuffer);

      // Word-sized ints and floats on a 4-byte grid, then doubles on an 8-byte grid:
      // the three shapes game state takes. Scanning every byte offset would triple
      // the work and, for a double, report the same address three times over.
      const passes: [NumericKind, number, () => ArrayLike<number> | undefined][] = [
        ["int", 4, () => (views.i32 ||= new Int32Array(rawBuffer, 0, Math.floor(usable / 4)))],
        ["float", 4, () => (views.f32 ||= new Float32Array(rawBuffer, 0, Math.floor(usable / 4)))],
        ["float", 8, () => (views.f64 ||= new Float64Array(rawBuffer, 0, Math.floor(usable / 8)))],
      ];

      for (const [numeric, width, makeView] of passes) {
        if (full || outOfTime()) break;
        let view: ArrayLike<number> | undefined;
        try {
          view = makeView();
        } catch {
          continue;
        }
        if (!view) continue;
        const heapLabel = name === "ArrayBuffer" || name === "SharedArrayBuffer" ? "buffer" : "heap";
        for (let i = 0; i < view.length; i += 1) {
          if (full) break;
          // A time check per element would cost more than the read; every 64k words is
          // frequent enough that a huge heap still stops inside the budget.
          if ((i & 0xffff) === 0 && outOfTime()) {
            truncated = true;
            break;
          }
          const v = view[i];
          if (typeof v !== "number" || !Number.isFinite(v)) continue;
          const offset = i * width;
          consider({
            region: "buffer",
            holder: view as unknown as object,
            key: i,
            width,
            numeric,
            value: v,
            label: `${heapLabel}@0x${offset.toString(16)}`,
            path: `${pathOf(chain, `${heapLabel}@0x${offset.toString(16)}`)}`,
          });
        }
        bytesRead += Math.min(view.length * width, usable);
      }
      continue;
    }

    if (isDomNode(node)) continue;

    let keys: string[];
    try {
      keys = Object.keys(node);
    } catch {
      continue;
    }

    for (const key of keys) {
      if (chain.length === 0) {
        if (NEVER_FOLLOW.has(key)) continue;
      } else if (NEVER_FOLLOW_NESTED.has(key)) {
        continue;
      }
      let child: unknown;
      try {
        child = (node as Record<string, unknown>)[key];
      } catch {
        continue;
      }
      if (typeof child === "number") {
        consider({
          region: "slot",
          holder: node,
          key,
          width: 8,
          numeric: Number.isInteger(child) ? "int" : "float",
          value: child,
          label: key,
          path: pathOf(chain, key),
        });
      } else if (child && typeof child === "object") {
        queue.push({ value: child as object, chain: [...chain, key] });
      }
    }
  }

  return { matches, nodes, bytes: bytesRead, truncated, regions: [...regions] };
}

/**
 * Write a value into every address in a scan.
 *
 * Returns the addresses that actually changed rather than a count, so the caller can
 * narrow the list to what is live — writing to five of six addresses and reporting
 * "wrote 6" is the kind of quiet inaccuracy that makes a cheat panel feel broken when
 * it is not. Every write is verified by reading the address back, because a typed-array
 * element clamps and a frozen object ignores assignment in sloppy mode.
 */
export function writeMatches(matches: MemoryMatch[], value: number): { written: MemoryMatch[]; failed: MemoryMatch[] } {
  const written: MemoryMatch[] = [];
  const failed: MemoryMatch[] = [];
  for (const m of matches) {
    if (readMatch(m) === null || !writeMatch(m, value)) {
      failed.push(m);
      continue;
    }
    const after = readMatch(m);
    const wanted = m.numeric === "int" ? Math.round(value) : value;
    if (after === null || !same(after, wanted, Math.max(1e-6, Math.abs(wanted) * 1e-9))) {
      failed.push(m);
      continue;
    }
    written.push({ ...m, value: after });
  }
  return { written, failed };
}

/** Re-read every address, dropping the ones that are no longer numbers. */
export function refreshMatches(matches: MemoryMatch[]): MemoryMatch[] {
  const out: MemoryMatch[] = [];
  for (const m of matches) {
    const now = readMatch(m);
    if (now === null) continue;
    out.push({ ...m, value: now });
  }
  return out;
}

/** Where this search looked, in words a tutor can act on. */
export function describeRegions(regions: MemoryRegion[]): string {
  const names: Record<MemoryRegion, string> = {
    slot: "named values on the game's own objects",
    typed: "typed arrays",
    buffer: "raw buffers and WebAssembly memory",
  };
  if (!regions.length) return "nothing matched, in any of the game's own objects";
  return regions.map((r) => names[r]).join(", ");
}

/**
 * Why a search may be impossible, said plainly.
 *
 * A frame on another origin genuinely cannot be read — that is the browser's rule, and
 * no amount of code gets around it. Saying so before the tutor types a number beats
 * returning "0 matches" from a search that never had a chance.
 */
/**
 * Whether a frame URL points somewhere this page cannot read.
 *
 * Decided from the URL *before* the frame is touched, so a caller can render the warning
 * without an effect and without provoking the very exception it is warning about. The
 * live check below is still the authority at the moment of a search — this is for saying
 * so up front.
 */
export function frameUrlLooksCrossOrigin(frameUrl: string): boolean {
  if (!frameUrl) return false;
  try {
    const origin = typeof location !== "undefined" ? location.origin : "";
    if (!origin) return false;
    return new URL(frameUrl, origin).origin !== origin;
  } catch {
    return false;
  }
}

export function memoryEditorAvailability(frame: { contentWindow?: unknown } | null): string | null {
  if (!frame) return "No game is running yet — start a game, then search it.";
  try {
    const win = frame.contentWindow as { location?: { href?: string } } | null;
    if (!win) return "The game frame is not attached yet.";
    // Reading `location.href` across origins throws, which is exactly the test.
    void win.location?.href;
    return null;
  } catch {
    return "This game is embedded directly from another site, so its memory cannot be read. Load it through the console's proxy (the default) and the editor works.";
  }
}
