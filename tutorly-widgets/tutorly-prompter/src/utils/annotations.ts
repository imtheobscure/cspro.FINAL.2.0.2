// Parse inline annotation conventions into renderable tokens.
// DESIGN: All markers (*stress*, ^content, ~reduced, /, //, ↑, ↓, _, [], {{}})
// are STRIPPED from display — they become purely visual styling.
// No raw symbols ever appear on the teleprompter screen.

export type Token =
  | { kind: "word"; text: string; stress?: "primary" | "secondary" | "reduced"; linkNext?: boolean }
  | { kind: "pause"; long: boolean }
  | { kind: "arrow"; dir: "up" | "down" }
  | { kind: "placeholder"; name: string }
  | { kind: "emotion"; tag: string }
  | { kind: "space" };

export function tokenize(input: string, studentName?: string): Token[] {
  const tokens: Token[] = [];
  const text = input ?? "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    // Whitespace
    if (/\s/.test(ch)) {
      tokens.push({ kind: "space" });
      while (i < text.length && /\s/.test(text[i])) i++;
      continue;
    }

    // Arrows — rendered visually, no raw symbol shown
    if (ch === "↑") { tokens.push({ kind: "arrow", dir: "up" }); i++; continue; }
    if (ch === "↓") { tokens.push({ kind: "arrow", dir: "down" }); i++; continue; }

    // Pauses (// before /) — rendered as visual spacing, no slash shown
    if (ch === "/" && text[i + 1] === "/") {
      tokens.push({ kind: "pause", long: true }); i += 2; continue;
    }
    if (ch === "/") {
      const prev = text[i - 1];
      const next = text[i + 1];
      if ((!prev || /\s/.test(prev)) && (!next || /\s/.test(next))) {
        tokens.push({ kind: "pause", long: false }); i++; continue;
      }
    }

    // Placeholder {{Name}} — rendered as the student's actual name
    if (ch === "{" && text[i + 1] === "{") {
      const end = text.indexOf("}}", i + 2);
      if (end !== -1) {
        const name = text.slice(i + 2, end).trim();
        if (studentName) {
          tokens.push({ kind: "word", text: studentName });
        } else {
          tokens.push({ kind: "placeholder", name });
        }
        i = end + 2; continue;
      }
    }

    // Emotion [smile] — rendered as emoji icon
    if (ch === "[") {
      const end = text.indexOf("]", i + 1);
      if (end !== -1) {
        tokens.push({ kind: "emotion", tag: text.slice(i + 1, end).trim() });
        i = end + 1; continue;
      }
    }

    // Word chunk: capture a run of non-space characters
    let j = i;
    while (j < text.length && !/[\s↑↓\[\{]/.test(text[j])) {
      if (text[j] === "/" && (text[j + 1] === "/" || /\s/.test(text[j + 1]) || j + 1 === text.length)) {
        if (j === i) break;
        break;
      }
      j++;
    }
    let chunk = text.slice(i, j);
    i = j;
    if (!chunk) { i++; continue; }

    // Split on underscore for linking
    const parts = chunk.split("_");
    parts.forEach((part, idx) => {
      const linkNext = idx < parts.length - 1;
      let stress: "primary" | "secondary" | "reduced" | undefined;

      // Primary: *WORD* — strip the asterisks, mark as primary
      const primary = part.match(/^\*(.+)\*([^\w]*)$/);
      if (primary) {
        stress = "primary";
        part = primary[1] + (primary[2] || "");
      } else if (part.startsWith("^")) {
        // Secondary — strip the caret
        stress = "secondary";
        part = part.slice(1);
      } else if (part.startsWith("~")) {
        // Reduced — strip the tilde
        stress = "reduced";
        part = part.slice(1);
      }

      // Strip any remaining stray markers from the word text
      part = part.replace(/[\*\^~]/g, "");

      if (part) tokens.push({ kind: "word", text: part, stress, linkNext });
    });
  }
  return tokens;
}

/** Approximate spoken word count. */
export function countWords(text: string): number {
  if (!text) return 0;
  const clean = text
    .replace(/\{\{[^}]+\}\}/g, "X")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/[\*~^↑↓\/]/g, "")
    .replace(/_/g, " ");
  const m = clean.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/** Plain text for TTS — all markers stripped, just readable text. */
export function plainText(text: string, studentName?: string): string {
  return text
    .replace(/\{\{([^}]+)\}\}/g, () => studentName || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/[\*~^↑↓]/g, "")
    .replace(/\s*\/\/?\s*/g, ", ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
