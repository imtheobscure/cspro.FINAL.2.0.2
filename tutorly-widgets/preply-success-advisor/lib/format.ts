/**
 * Formatting, including the Toman layer.
 *
 * The mentors this app is built for price their work in dollars and live in Toman,
 * so every amount in the app is rendered through here: the USD figure first, the
 * Toman equivalent right after it. When the rate changes in Settings, every number
 * on every screen moves with it, because nothing else in the app is allowed to call
 * `toLocaleString` on a currency value itself.
 */

export const DEFAULT_RIAL_PER_USD = 1_000_000; // a placeholder until the mentor sets the real rate

export function usd(amount: number, options: { cents?: boolean } = {}): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: options.cents ? 2 : 0,
    maximumFractionDigits: options.cents ? 2 : 0,
  });
}

/** Toman = rial ÷ 10 — the unit people actually quote. */
export function toToman(usdAmount: number, rialPerUsd: number): number {
  return (usdAmount * rialPerUsd) / 10;
}

/**
 * Toman with the market's own shorthand.
 *
 * Iranians read large amounts in millions and billions of Toman ("۲۵ میلیون"), so
 * anything above a million is written as "25.4M Toman" with the exact figure in the
 * tooltip — that is how a mentor would say it out loud.
 */
export function toman(usdAmount: number, rialPerUsd: number, options: { compact?: boolean } = {}): string {
  const value = toToman(usdAmount, rialPerUsd);
  if (!Number.isFinite(value) || value === 0) return "0 Toman";
  if (options.compact === false) return `${Math.round(value).toLocaleString("en-US")} Toman`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B Toman`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M Toman`;
  if (value >= 1_000) return `${Math.round(value / 1_000).toLocaleString("en-US")}k Toman`;
  return `${Math.round(value).toLocaleString("en-US")} Toman`;
}

/** "$12 · 12.0M Toman" — the pair used everywhere a price appears. */
export function moneyPair(usdAmount: number, rialPerUsd: number): string {
  return `${usd(usdAmount)} · ${toman(usdAmount, rialPerUsd)}`;
}

export function num(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function pct(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

/** Midnight of a given day, in the mentor's own timezone. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "3 days ago", "in 2 weeks" — used by the nudge engine and the follow-up list. */
export function relativeDate(iso: string): string {
  if (!iso) return "no date";
  const then = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(then.getTime())) return "no date";
  /*
   * Calendar days, not elapsed hours.
   *
   * Rounding the elapsed milliseconds called a task due today "yesterday" after lunch,
   * and a conversation held at 20:00 last night "today". Both read as wrong to the person
   * looking at them, because a mentor counts days on a calendar, not in hours: the only
   * question is which date it was. `Math.round` on local midnights absorbs the hour that
   * daylight saving adds or removes.
   */
  const days = Math.round((startOfDay(then) - startOfDay(new Date())) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) {
    const n = Math.abs(days);
    if (n < 30) return `${n} days ago`;
    if (n < 365) return `${Math.round(n / 30)} months ago`;
    return `${Math.round(n / 365)} years ago`;
  }
  if (days < 30) return `in ${days} days`;
  return `in ${Math.round(days / 30)} months`;
}

export function daysBetween(from: string, to: string | Date = new Date()): number {
  if (!from) return 0;
  const start = new Date(from.length === 10 ? `${from}T00:00:00` : from).getTime();
  const end = typeof to === "string" ? new Date(to).getTime() : to.getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.floor((end - start) / 86_400_000);
}

export function shortDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "14 Aug" — for dense tables and chart axes. */
export function tinyDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
