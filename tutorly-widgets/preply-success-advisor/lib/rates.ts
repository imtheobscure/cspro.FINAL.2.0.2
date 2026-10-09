/**
 * The live USD → Toman rate.
 *
 * Two things make this harder than a `fetch`, and both are handled here rather than
 * hidden:
 *
 * 1. **The official rate is not the real one.** The free-market dollar (what a tutor
 *    actually gets) trades many times above the official/aggregated rate that most FX
 *    APIs publish. Silently using the wrong one would make every income figure in the
 *    app look catastrophic, so every provider here declares whether it is a *market*
 *    rate or an *aggregated reference*, and only market rates are ever applied
 *    automatically.
 * 2. **CORS decides what is reachable.** `call1.tgju.org` — the host this app used to
 *    ask — serves its JSON without an `Access-Control-Allow-Origin` header, so a browser
 *    cannot read it directly at all. That is why the rate "did not work": the one usable
 *    source was reached through public relays, and those relays are slow and frequently
 *    answer 522. `call2.tgju.org` serves the same document WITH `Access-Control-Allow-Origin: *`
 *    (re-verified while fixing this), so it is now the first provider and needs no relay.
 *
 * Measured on 2026-09-19, from this machine, so the next person does not re-add them:
 *   · call2.tgju.org — 200 in ~1.5 s, ACAO `*`, `current.price_dollar_rl.p = "2,295,150"`
 *   · call1.tgju.org — 200 in ~1.5 s, no ACAO (relay only)
 *   · api.nobitex.ir — dead: DNS does not resolve (ENOTFOUND)
 *   · api.wallex.ir — dead: TLS connection reset (ECONNRESET)
 *   · api.allorigins.win / api.codetabs.com — work, then answer HTTP 522 under load; kept
 *     as a last resort for call1 with a longer timeout, never as the primary path
 *   · open.er-api.com — reachable, but it is an aggregated reference, far below the market
 */

export type RateKind = "market" | "reference";

export interface RateQuote {
  id: string;
  label: string;
  kind: RateKind;
  /** Rials per US dollar. */
  rialPerUsd: number;
  /** Where the number came from. */
  source: string;
  /** When it was read. */
  fetchedAt: string;
  /** True when it arrived through a third-party proxy. */
  viaProxy?: boolean;
}

export interface RateAttempt {
  id: string;
  label: string;
  kind: RateKind;
  ok: boolean;
  rialPerUsd?: number;
  /** Why it failed, in words a person can act on. */
  error?: string;
  ms: number;
  viaProxy?: boolean;
}

export interface RateResult {
  /** Every provider we tried, in the order they were tried. */
  attempts: RateAttempt[];
  /** The best quote found: a market rate beats a reference, then fastest. */
  best?: RateQuote;
}

/** Long enough for a direct provider on a slow day; the usual answer is about 1.5 s. */
const TIMEOUT_MS = 9000;

/**
 * A much tighter budget for the relays, because they are only ever a cross-check.
 *
 * Measured while fixing this: both public relays answer HTTP 522 under load, and the
 * whole relay leg was costing 9 s per relay *sequentially* — 18 s of waiting for a
 * number that had already arrived in 341 ms. A relay that cannot produce a small JSON
 * document in 6 s is not going to be trusted as a source, so it is given 6 s and then
 * dropped.
 */
const RELAY_TIMEOUT_MS = 6000;

/** Free CORS relays, tried only for sources that block browser reads directly. */
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

export interface Provider {
  id: string;
  label: string;
  kind: RateKind;
  /** Direct URL the browser would use. */
  url: string;
  /** Extract rials-per-dollar from the parsed body. */
  parse: (body: unknown) => number | null;
  /** Also try read-only proxies when the direct call is refused (tgju does this). */
  allowProxy?: boolean;
  note?: string;
}

/** Numbers arrive as "2,303,000" or "2303000.0" or 2303000 — all become a number. */
const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

/** `current.price_dollar_rl.p` is the free-market dollar, in rials, as "2,295,150". */
const parseTgju = (body: unknown): number | null => {
  const current = asRecord(asRecord(body).current);
  const rial = toNumber(asRecord(current.price_dollar_rl).p);
  return rial || null;
};

export const PROVIDERS: Provider[] = [
  {
    id: "tgju-call2",
    label: "tgju.org — free-market dollar",
    kind: "market",
    // The same document as call1, but served WITH `Access-Control-Allow-Origin: *`, so the
    // browser can read it directly. This is the provider that makes the feature work.
    url: "https://call2.tgju.org/ajax.json?rev=true",
    parse: parseTgju,
    note: "The reference rate for the free market, readable straight from the browser.",
  },
  {
    id: "tgju",
    label: "tgju.org (call1) — free-market dollar",
    kind: "market",
    url: "https://call1.tgju.org/ajax.json?rev=true",
    parse: parseTgju,
    allowProxy: true,
    note: "The same number from a second host. It blocks browser reads, so it goes through a relay — slower, but a good cross-check when call2 is unreachable.",
  },
  {
    id: "er-api",
    label: "exchangerate-api — aggregated reference",
    kind: "reference",
    url: "https://open.er-api.com/v6/latest/USD",
    parse: (body) => toNumber(asRecord(asRecord(body).rates).IRR) || null,
    note: "Reads well below the free market. Kept for a sanity check, never applied automatically.",
  },
];

async function fetchJson(url: string, timeoutMs: number = TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store", mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Try the direct call, and — for a source that refuses browser reads — one proxy.
 * The attempt record says which route worked, because "via proxy" is information the
 * mentor deserves when they are trusting the number.
 */
async function tryProvider(provider: Provider): Promise<RateAttempt> {
  const started = Date.now();
  const finish = (patch: Partial<RateAttempt>): RateAttempt => ({
    id: provider.id,
    label: provider.label,
    kind: provider.kind,
    ok: false,
    ms: Date.now() - started,
    ...patch,
  });

  try {
    const rialPerUsd = provider.parse(await fetchJson(provider.url));
    if (rialPerUsd) return finish({ ok: true, rialPerUsd: Math.round(rialPerUsd) });
    return finish({ error: "answered, but without a usable rate" });
  } catch (error) {
    const directError = error instanceof Error && error.name === "AbortError" ? `no answer in ${TIMEOUT_MS / 1000}s` : (error as Error)?.message ?? "blocked";

    if (!provider.allowProxy) return finish({ error: directError });

    // Both relays at once, first usable answer wins: one bad relay no longer doubles the
    // wait, and a relay that hangs is dropped by its own timer instead of holding the
    // whole check open.
    const viaRelays = PROXIES.map(async (proxy) => {
      const rialPerUsd = provider.parse(await fetchJson(proxy(provider.url), RELAY_TIMEOUT_MS));
      if (!rialPerUsd) throw new Error("the relay answered without a rate");
      return Math.round(rialPerUsd);
    });

    try {
      return finish({ ok: true, rialPerUsd: await Promise.any(viaRelays), viaProxy: true });
    } catch {
      return finish({ error: `${directError} — and no relay could fetch it` });
    }
  }
}

/**
 * The winner among whatever has answered so far: a market rate beats a reference, then
 * the fastest of the same kind wins.
 *
 * Exported because the Settings screen calls it on *partial* results too — the good
 * answer usually lands in about 1.5 s while a relay can take 20 s, and waiting for the
 * slowest source before showing anything made the whole check feel broken.
 */
export function pickBest(attempts: RateAttempt[]): RateQuote | undefined {
  const usable = attempts.filter((a): a is RateAttempt & { rialPerUsd: number } => a.ok && !!a.rialPerUsd);
  const market = usable.filter((a) => a.kind === "market").sort((a, b) => a.ms - b.ms);
  const reference = usable.filter((a) => a.kind === "reference").sort((a, b) => a.ms - b.ms);
  const winner = market[0] ?? reference[0];
  if (!winner) return undefined;

  return {
    id: winner.id,
    label: winner.label,
    kind: winner.kind,
    rialPerUsd: winner.rialPerUsd,
    source: PROVIDERS.find((p) => p.id === winner.id)?.url ?? "",
    fetchedAt: new Date().toISOString(),
    viaProxy: winner.viaProxy,
  };
}

/**
 * Ask every provider at once and return the best answer.
 *
 * Running them together means one slow or blocked source costs nothing. `onAttempt`
 * fires each time a source answers, so the caller can paint the rate as soon as it is
 * known and leave the stragglers spinning — the returned `attempts` list is then the
 * whole picture, including the sources that failed and why.
 */
export async function fetchLiveRate(
  onAttempt?: (landed: RateAttempt[], stillWaiting: Provider[]) => void,
): Promise<RateResult> {
  const landed: RateAttempt[] = [];
  const waiting = new Set(PROVIDERS.map((p) => p.id));

  const attempts = await Promise.all(
    PROVIDERS.map(async (provider) => {
      const attempt = await tryProvider(provider);
      waiting.delete(provider.id);
      landed.push(attempt);
      onAttempt?.([...landed], PROVIDERS.filter((p) => waiting.has(p.id)));
      return attempt;
    }),
  );

  return { attempts, best: pickBest(attempts) };
}

/** Toman per dollar, for the "1 USD = …" line. */
export const tomanPerUsd = (rialPerUsd: number): number => rialPerUsd / 10;

export const rateKindLabel = (kind: RateKind): string =>
  kind === "market" ? "free-market rate" : "aggregated reference (below the free market)";

/** tgju in a new tab, for the paste-it-by-hand path. */
export const TGJU_URL = "https://www.tgju.org/profile/price_dollar_rl";
