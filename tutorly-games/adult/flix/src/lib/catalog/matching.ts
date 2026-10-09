/**
 * Matching a real catalog title to a TMDB entry.
 *
 * Wikimedia and Internet Archive titles are written for humans and carry the
 * description inside the name: "His Girl Friday (1940) by Howard Hawks, Trailer"
 * matches nothing, while "His Girl Friday" matches instantly. This module turns
 * one into the other, and scores candidate years so a remake is never mistaken
 * for the original (Night of the Living Dead exists as 1968, 1990, 2006 and 2012;
 * only 1968 is the public-domain film).
 */

// Multi-word phrases are matched *without* a trailing word boundary because these
// catalogs glue the next word on: "SafetyLastHaroldLloyd1923.FullMovieexcellent…".
// Single words keep the boundary so "short" cannot truncate "shortcut".
const DESCRIPTOR =
  /\b((?:full|end|behind|the)\s*(?:movie|film|episode|credits|scenes)\w*|(?:trailer|teaser|official|complete|restored|remastered|remaster|version|versions|clip|clips|scene|excerpt|ending|credits|interview|documentary|short|hd|uhd|4k|1080p|720p|480p|silent|colorized)\b)[\s\S]*$/i;

/** Trailing words that qualify a title rather than name it. */
const TRAILING_QUALIFIER =
  /^(version|versions|edition|english|spanish|french|german|italian|portuguese|dubbed|subtitled|subs|restored|remastered|remaster|hd|uhd|4k|1080p|720p|480p|full|complete|movie|film|cut|original|colorized|extended|uncut|the|of|and|&|\d{1,4})$/i;

/** Room for a handful of readings — each one costs a request, so keep it tight. */
const MAX_CANDIDATES = 10;

/** The title strings to try against TMDB, most specific first. */
export function titleCandidates(raw: string): string[] {
  const out: string[] = [];
  const push = (value: string) => {
    const cleaned = value
      .replace(/\([^)]*\)/g, " ")
      .replace(/[_.]/g, " ") // these catalogs use underscores and dots for spaces
      .replace(/\b(19|20)\d{2}\b/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s,;:|\-–—]+|[\s,;:|\-–—]+$/g, "")
      .trim();
    if (cleaned.length >= 3 && !out.includes(cleaned)) out.push(cleaned);
  };
  /** Peel qualifying words off the end: "Metropolis English Version" → "Metropolis". */
  const trimTrailing = (value: string) => {
    let words = value.replace(/[_.]/g, " ").split(/\s+/).filter(Boolean);
    for (let i = 0; i < 6 && words.length > 1; i++) {
      const last = words[words.length - 1].replace(/[^\w&]+$/g, "");
      if (!TRAILING_QUALIFIER.test(last)) break;
      words = words.slice(0, -1);
      push(words.join(" "));
    }
  };

  const variants = new Set<string>([raw]);
  for (const separator of [/\s*[|–—]\s*/, /\s*,\s*/, /\s+by\s+/i, /\s+-\s+/, /-/]) variants.add(raw.split(separator)[0]);
  // archive.org identifiers arrive run together — "HisGirlFriday 1940" and
  // "Nosferatu1922HD" are real published titles, and they match TMDB only once the
  // word boundaries inside them are restored.
  variants.add(raw.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Za-z])(\d+)/g, "$1 $2").replace(/(\d)([A-Z])/g, "$1 $2"));
  variants.add(raw.replace(/-/g, " "));
  for (const variant of [...variants]) variants.add(variant.replace(DESCRIPTOR, ""));

  for (const variant of variants) {
    push(variant);
    trimTrailing(variant);
  }
  return out.slice(0, MAX_CANDIDATES);
}

export function normalizedTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * How well a candidate matches — lower is better.
 *
 * Returns null when it should be rejected outright. `yearTolerance` is 3 because
 * re-releases and festival dates drift by a year or two, while a remake is
 * decades away.
 */
export function matchScore(input: { candidate: string; candidateTitle: string; candidateYear: number | null; year: number | null; kindMatches: boolean }): number | null {
  const a = normalizedTitle(input.candidateTitle);
  const b = normalizedTitle(input.candidate);
  if (!a || !b) return null;
  const exact = a === b;
  const contains = a.includes(b) || b.includes(a);
  if (!exact && !contains) return null;
  const yearDistance = input.year && input.candidateYear ? Math.abs(input.candidateYear - input.year) : 0;
  // A partial title match still has to agree on the year, or "Full Movie With Cary
  // Grant" would drag in anything. An *exact* title match is strong enough to
  // survive a disagreeing year, because these catalogs frequently report the upload
  // year instead of the film's — a 1940 film uploaded in 2015 says 2015.
  if (!exact && input.year && input.candidateYear && yearDistance > 3) return null;
  return yearDistance * 10 + (exact ? 0 : 1) + (input.kindMatches ? 0 : 4);
}
