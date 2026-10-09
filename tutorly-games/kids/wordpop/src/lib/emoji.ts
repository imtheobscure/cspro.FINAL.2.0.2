/** Convert an emoji string to a Twemoji code-point filename (same rules as twemoji.js). */
export function emojiToCodePoints(emoji: string): string {
  const hasZwj = emoji.includes("\u200d");
  const cps: string[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0)!;
    // Drop variation selector-16 when there is no ZWJ sequence (twemoji convention)
    if (cp === 0xfe0f && !hasZwj) continue;
    cps.push(cp.toString(16));
  }
  return cps.join("-");
}

const CDN = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/";

export function twemojiUrl(emoji: string): string {
  return `${CDN}${emojiToCodePoints(emoji)}.svg`;
}
