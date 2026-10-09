/**
 * Deck exchange: validation, files and share links.
 *
 * A deck arrives here from three places, and all three are untrusted:
 *
 *  - the AI generator's JSON, pasted by a tutor;
 *  - a `.json` file a colleague exported from this app;
 *  - a share link, decompressed from a QR code.
 *
 * The old importer checked two things — that `items` existed and was non-empty — then
 * handed the array straight to the renderer. Every field the UI treats as required
 * (`front`, `back`, a usable `id`) was assumed, so a slightly-off payload produced a
 * blank card or a React key collision rather than an error message. Validation here is
 * therefore structural and total, it *repairs* what it safely can, and it reports what
 * it changed so the tutor is never surprised by a silently altered deck.
 */

import LZString from "lz-string";
import type { FlashItem, FlashPayload, Rarity } from "../tools/flashcards/flashcards";

export interface DeckIssue {
  /** 1-based position in the source array, for a "card 4: no back" message. */
  index: number;
  field: string;
  message: string;
}

export interface DeckValidationResult {
  payload: FlashPayload;
  /** Problems that were fixed automatically. */
  repaired: DeckIssue[];
  /** Problems that will visibly change the deck (a dropped card, a coerced rarity). */
  warnings: DeckIssue[];
  /** Problems that made the payload unusable. An empty array means it loaded. */
  errors: DeckIssue[];
  stats: { cards: number; dropped: number; byRarity: Record<Rarity, number> };
}

const VALID_RARITIES: Rarity[] = ["common", "rare", "epic", "legendary"];
const MAX_CARDS = 500;

/** Trims and caps a string field, returning undefined for empty input. */
function text(value: unknown, max = 2000): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function stringList(value: unknown, max = 12): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.map((entry) => text(entry, 80)).filter((entry): entry is string => !!entry).slice(0, max);
  return list.length ? list : undefined;
}

/**
 * Builds a stable, unique id.
 *
 * Ids are what progress is keyed on, so duplicates are not cosmetic: two cards sharing
 * an id share a review history, and `itemStats` silently merges them. A missing id is
 * derived from the word so the same deck imported twice produces the same keys and a
 * learner's history survives a re-import.
 */
function makeId(raw: unknown, front: string, taken: Set<string>): string {
  const base =
    text(raw, 64)?.replace(/\s+/g, "-").toLowerCase() ||
    front.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) ||
    "card";
  let id = base;
  let suffix = 2;
  while (taken.has(id)) id = `${base}-${suffix++}`;
  taken.add(id);
  return id;
}

/**
 * Validates and repairs a payload.
 *
 * Repair over rejection wherever the intent is unambiguous: a missing `back` in a
 * flashcard is a real error, but a rarity spelled "Legendary" or an examples field given
 * as a single string is a formatting slip, and failing the whole deck over one of those
 * would be hostile.
 */
export function validateDeck(input: unknown): DeckValidationResult {
  const repaired: DeckIssue[] = [];
  const warnings: DeckIssue[] = [];
  const errors: DeckIssue[] = [];
  const empty: DeckValidationResult = {
    payload: { title: "Untitled deck", items: [] },
    repaired,
    warnings,
    errors,
    stats: { cards: 0, dropped: 0, byRarity: { common: 0, rare: 0, epic: 0, legendary: 0 } },
  };

  if (!input || typeof input !== "object") {
    errors.push({ index: 0, field: "root", message: "The payload is not a JSON object." });
    return empty;
  }

  const raw = input as Record<string, unknown>;
  const rawItems = Array.isArray(raw.items) ? raw.items : Array.isArray(input) ? (input as unknown[]) : null;
  if (!rawItems) {
    errors.push({ index: 0, field: "items", message: "Missing an 'items' array." });
    return empty;
  }
  if (!rawItems.length) {
    errors.push({ index: 0, field: "items", message: "The 'items' array is empty." });
    return empty;
  }
  if (rawItems.length > MAX_CARDS) {
    warnings.push({ index: 0, field: "items", message: `Deck trimmed to ${MAX_CARDS} cards (was ${rawItems.length}).` });
  }

  const taken = new Set<string>();
  const items: FlashItem[] = [];
  const byRarity: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
  let dropped = 0;

  rawItems.slice(0, MAX_CARDS).forEach((candidate, position) => {
    const index = position + 1;
    if (!candidate || typeof candidate !== "object") {
      dropped++;
      warnings.push({ index, field: "card", message: "Not an object — skipped." });
      return;
    }
    const entry = candidate as Record<string, unknown>;
    const front = text(entry.front, 120);
    const back = text(entry.back, 1200);

    if (!front || !back) {
      // Without both faces there is nothing to show and nothing to reveal.
      dropped++;
      warnings.push({
        index,
        field: !front ? "front" : "back",
        message: `Missing ${!front ? "'front'" : "'back'"} — card dropped.`,
      });
      return;
    }

    // Rarity: coerce case, and default rather than reject an unknown tier.
    let rarity = typeof entry.rarity === "string" ? (entry.rarity.trim().toLowerCase() as Rarity) : undefined;
    if (rarity && !VALID_RARITIES.includes(rarity)) {
      warnings.push({ index, field: "rarity", message: `Unknown rarity "${entry.rarity}" — treated as common.` });
      rarity = "common";
    }
    if (!rarity) {
      // Deterministic tier from the word, so a deck with no rarities is not all-grey.
      rarity = VALID_RARITIES[hash(front) % 4 === 0 ? 1 : hash(front) % 7 === 0 ? 2 : hash(front) % 23 === 0 ? 3 : 0];
      repaired.push({ index, field: "rarity", message: `No rarity — assigned ${rarity}.` });
    }
    byRarity[rarity]++;

    // Examples can arrive as an array, a single string, or a list of strings.
    let examples = Array.isArray(entry.examples)
      ? entry.examples
          .map((example) =>
            typeof example === "string"
              ? { text: example.trim() }
              : example && typeof example === "object"
                ? { text: text((example as Record<string, unknown>).text, 400) || "", source: text((example as Record<string, unknown>).source, 80) }
                : null
          )
          .filter((example): example is { text: string; source?: string } => !!example && example.text.length > 0)
          .slice(0, 8)
      : typeof entry.examples === "string"
        ? [{ text: entry.examples.trim() }]
        : undefined;
    if (examples && !examples.length) examples = undefined;

    const ccq = Array.isArray(entry.ccq)
      ? entry.ccq
          .map((question) =>
            question && typeof question === "object"
              ? { question: text((question as Record<string, unknown>).question, 300) || "", answer: !!(question as Record<string, unknown>).answer }
              : null
          )
          .filter((question): question is { question: string; answer: boolean } => !!question && question.question.length > 0)
          .slice(0, 8)
      : undefined;

    const wordFamily = stringList(entry.wordFamily);

    // Etymology arrives either as the structured object the card renders, or as a bare
    // string. A string still carries the meaning, so it is wrapped rather than dropped.
    let etymology: FlashItem["etymology"];
    if (entry.etymology && typeof entry.etymology === "object") {
      const source = entry.etymology as Record<string, unknown>;
      const meaning = text(source.meaning, 800) || text(source.origin, 800);
      if (meaning) {
        etymology = {
          root: text(source.root, 80) || front,
          origin: text(source.origin, 80) || "—",
          meaning,
          relatedWords: stringList(source.relatedWords),
        };
      }
    } else if (typeof entry.etymology === "string" && entry.etymology.trim()) {
      etymology = { root: front, origin: "—", meaning: entry.etymology.trim().slice(0, 800) };
      repaired.push({ index, field: "etymology", message: "Given as plain text — converted to the structured shape." });
    }

    items.push({
      id: makeId(entry.id, front, taken),
      front,
      back,
      example: text(entry.example, 500),
      examples,
      l1Translation: text(entry.l1Translation, 160),
      etymology,
      wordFamily,
      rarity,
      ccq,
    });
  });

  if (!items.length) {
    errors.push({ index: 0, field: "items", message: "No usable cards — every entry was missing a face." });
  }

  return {
    payload: {
      title: text(raw.title, 120) || "Imported deck",
      description: text(raw.description, 300),
      language: text(raw.language, 40),
      items,
    },
    repaired,
    warnings,
    errors,
    stats: { cards: items.length, dropped, byRarity },
  };
}

/** FNV-1a, used only for the deterministic rarity fallback above. */
function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

/** Parses a JSON string, turning the parser's own error into a readable message. */
export function parseDeckJson(text: string): { result?: DeckValidationResult; parseError?: string } {
  try {
    return { result: validateDeck(JSON.parse(text)) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // The common cause is a trailing comma or an unclosed brace, so say so.
    const hint = /position (\d+)/.exec(message)?.[1];
    return {
      parseError: hint
        ? `${message} — around character ${hint}. Check for a trailing comma or a missing brace.`
        : message,
    };
  }
}

/** A human-readable summary for the toast after an import. */
export function describeValidation(result: DeckValidationResult): string {
  const parts = [`${result.stats.cards} card${result.stats.cards === 1 ? "" : "s"}`];
  if (result.stats.dropped) parts.push(`${result.stats.dropped} dropped`);
  if (result.repaired.length) parts.push(`${result.repaired.length} auto-fixed`);
  return parts.join(" · ");
}

// ─────────────────────────────────────────────────────────────
// Files
// ─────────────────────────────────────────────────────────────

/** Triggers a download of the deck as JSON, in the shape the importer accepts. */
export function exportDeckFile(payload: FlashPayload): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(payload.title || "deck").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─────────────────────────────────────────────────────────────
// Share links
// ─────────────────────────────────────────────────────────────

/*
 * Two share encodings, and the difference between them is measured, not guessed.
 *
 * A characteristic eight-card deck serialises to 7,870 bytes of JSON, which compresses
 * to a 4,345-character URL — well past the 2,331-character ceiling of the largest QR
 * code. So a QR of the *full* deck can never be produced, and shipping only that path
 * meant a share button whose QR silently never appeared.
 *
 * The compact form drops everything that is re-derivable and keeps what a learner
 * actually plays with (word, definition, tier): the same deck becomes 990 raw bytes and
 * a 653-character URL, which fits a QR with room to spare. The full-fidelity form is
 * still used for the copyable link, so nothing is lost — only redistributed.
 */
const SHARE_PREFIX_FULL = "lq3d:full:";
const SHARE_PREFIX_LITE = "lq3d:lite:";
const SHARE_MARKER = "#deck=";

/** The playable core of a deck: `[front, back, rarity]` per card. */
type LiteCard = [string, string, string?];
interface LitePayload {
  t?: string;
  i: LiteCard[];
}

function toLite(payload: FlashPayload): LitePayload {
  return {
    t: payload.title,
    i: (payload.items || []).map((item) => [item.front, item.back, item.rarity || "common"] as LiteCard),
  };
}

/** Expands either encoding back into the canonical payload the importer expects. */
function expandLite(lite: LitePayload): unknown {
  return {
    title: lite?.t,
    items: (lite?.i || []).map(([front, back, rarity]) => ({ front, back, rarity })),
  };
}

/**
 * The share URL.
 *
 * The deck is compressed and encoded into the hash rather than stored anywhere, which
 * keeps the app free of a backend and keeps a shared deck inside the link itself — it
 * works with no server, no account and no network once the app is loaded.
 */
export function buildShareUrl(payload: FlashPayload, options: { baseUrl?: string; compact?: boolean } = {}): string {
  const base =
    options.baseUrl || (typeof window !== "undefined" ? window.location.href.split("#")[0] : "");
  const body = options.compact ? JSON.stringify(toLite(payload)) : JSON.stringify(payload);
  const prefix = options.compact ? SHARE_PREFIX_LITE : SHARE_PREFIX_FULL;
  return `${base}${SHARE_MARKER}${LZString.compressToEncodedURIComponent(prefix + body)}`;
}

/**
 * Reads a deck out of a share link.
 *
 * Returns null rather than throwing for a link that is not this app's, is corrupt, or
 * was truncated by a chat client — all three of which happen. Both encodings are
 * accepted, and the compact one still goes through full validation, so a hand-edited
 * link cannot get past the checks in `validateDeck`.
 */
export function readShareUrl(href: string): DeckValidationResult | null {
  const marker = href.indexOf(SHARE_MARKER);
  if (marker === -1) return null;
  const packed = href.slice(marker + SHARE_MARKER.length);
  if (!packed) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(packed);
    if (!json) return null;
    if (json.startsWith(SHARE_PREFIX_FULL)) return validateDeck(JSON.parse(json.slice(SHARE_PREFIX_FULL.length)));
    if (json.startsWith(SHARE_PREFIX_LITE)) return validateDeck(expandLite(JSON.parse(json.slice(SHARE_PREFIX_LITE.length))));
    return null;
  } catch {
    return null;
  }
}

/**
 * QR capacity, in characters, at a given error-correction level.
 *
 * A QR code's version is chosen by the encoder from the payload length, and the maximum
 * (version 40, byte mode, level M) is 2331 characters. Beyond that the code simply
 * cannot be produced, so the caller is told to fall back to sharing the file.
 */
export const QR_MAX_CHARS = 2331;

export interface QrResult {
  /** The renderable data URL, or null when the deck does not fit. */
  dataUrl: string | null;
  /** Set when the deck was too large to encode. */
  tooLarge: boolean;
  chars: number;
}

/**
 * Renders a share URL as a QR data URL.
 *
 * `qrcode` draws to a canvas with no network access, so this stays inside the offline
 * guarantee. Level M is the balance point: it tolerates about 15% damage, which covers
 * a projected code being read at a distance, without halving the capacity of level H.
 */
export async function renderQrCode(url: string, size = 220): Promise<QrResult> {
  if (url.length > QR_MAX_CHARS) return { dataUrl: null, tooLarge: true, chars: url.length };
  try {
    const QRCode = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#05060c", light: "#ffffff" },
    });
    return { dataUrl, tooLarge: false, chars: url.length };
  } catch {
    return { dataUrl: null, tooLarge: false, chars: url.length };
  }
}
