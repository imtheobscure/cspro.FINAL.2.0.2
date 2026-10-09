/**
 * Coherent artwork for every dictionary item: Twemoji SVG (CC-BY 4.0) from jsDelivr.
 * One illustration family across every device, crisp at any projector size, and it
 * degrades to the native emoji glyph if the CDN is unreachable.
 */
const CDN = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/";
const CDN_LEGACY = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/";

function toCodePoints(emoji: string, keepVs16: boolean): string {
  const src = keepVs16 ? emoji.replace(/\uFE0E/g, "") : emoji.replace(/[\uFE0E\uFE0F]/g, "");
  const points: string[] = [];
  for (const ch of src) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    points.push(cp.toString(16));
  }
  return points.join("-");
}

export function emojiToCodePoint(emoji: string): string {
  return toCodePoints(emoji, false);
}

/** every candidate URL for one emoji, best first */
export function emojiVariants(emoji: string): string[] {
  const stripped = toCodePoints(emoji, false);
  const kept = toCodePoints(emoji, true);
  const urls = [`${CDN}${stripped}.svg`];
  if (kept !== stripped) urls.push(`${CDN}${kept}.svg`);
  urls.push(`${CDN_LEGACY}${stripped}.svg`);
  return urls;
}

export function emojiSvgUrl(emoji: string): string {
  return emojiVariants(emoji)[0];
}
