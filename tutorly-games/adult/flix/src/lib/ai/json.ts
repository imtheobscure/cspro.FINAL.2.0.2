/**
 * JSON hygiene for AI output.
 *
 * Every model eventually wraps its answer in a code fence, adds a friendly
 * sentence before it, or leaves a trailing comma. `safeJson` recovers the object
 * from all three without ever throwing — the caller validates the shape anyway,
 * so a `null` here simply means "show the teacher the problem".
 */

export function safeJson(text: string): unknown {
  const clean = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  const body = start >= 0 && end > start ? clean.slice(start, end + 1) : clean;
  try {
    return JSON.parse(body);
  } catch {
    // Last resort: strip trailing commas before } or ] (the most common slip).
    try {
      return JSON.parse(body.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

/** Pretty, stable stringify for downloads and the "copy clean JSON" button. */
export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
