/**
 * Character categories and their 5-level evolution ladders.
 *
 * Each category is identified by an emoji (the "base" emoji used as the
 * character icon when the level is 0). The ladders determine the visible
 * emoji of the character at level 1..4 (level 5 restores the base).
 *
 * These 20 categories are the only ones available in the GM Players tab.
 * Adding a character whose base emoji is one of the baseEmojis below
 * automatically gives them a category and the full evolution ladder.
 */

export interface CharacterLadderLevel {
  level: number; // 1..5
  emoji: string;
  title: string;
}

export interface CharacterCategory {
  id: string;
  baseEmoji: string;
  displayName: string;
  gender: "F" | "M" | "X";
  ladder: [CharacterLadderLevel, CharacterLadderLevel, CharacterLadderLevel, CharacterLadderLevel];
  /** The final (level 5) emoji. Defaults to baseEmoji. */
  finalEmoji: string;
}

const mk = (
  id: string,
  baseEmoji: string,
  displayName: string,
  gender: "F" | "M" | "X",
  a: string,
  b: string,
  c: string,
  d: string,
  finalEmoji: string = baseEmoji,
): CharacterCategory => ({
  id,
  baseEmoji,
  displayName,
  gender,
  ladder: [
    { level: 1, emoji: a, title: displayName + " I" },
    { level: 2, emoji: b, title: displayName + " II" },
    { level: 3, emoji: c, title: displayName + " III" },
    { level: 4, emoji: d, title: displayName + " IV" },
  ],
  finalEmoji,
});

export const CHARACTER_CATEGORIES: CharacterCategory[] = [
  // Princess (F)
  mk("princess-f", "👸", "Princess", "F", "👶", "🌸", "💖", "💎"),
  // Prince (M)
  mk("prince-m", "🤴", "Prince", "M", "🤴", "🌿", "💠", "🔥"),
  // Ninja (F)
  mk("ninja-f", "🥷", "Ninja", "F", "🥷", "🌑", "🗡️", "🔥"),
  // Ninja (M) — different emoji on each tier
  mk("ninja-m", "🥷", "Ninja", "M", "🥷", "🌑", "🗡️", "🔥"),
  // Mermaid (F)
  mk("mermaid-f", "🧜‍♀️", "Mermaid", "F", "🧜‍♀️", "🐚", "🌊", "💙"),
  // Merman (M)
  mk("merman-m", "🧜", "Merman", "M", "🧜", "🐚", "🌊", "💙"),
  // Witch (F) — base is the female witch
  mk("witch-f", "🧙", "Witch", "F", "🧙", "📜", "🔥", "🌟"),
  // Wizard (M)
  mk("wizard-m", "🧙‍♂️", "Wizard", "M", "🧙‍♂️", "📜", "🔥", "🌟"),
  // Vampire (F)
  mk("vampire-f", "🧛‍♀️", "Vampire", "F", "🧛‍♀️", "🩸", "🌙", "🦇"),
  // Vampire (M)
  mk("vampire-m", "🧛", "Vampire", "M", "🧛", "🩸", "🌙", "🦇"),
  // Zombie (F)
  mk("zombie-f", "🧟‍♀️", "Zombie", "F", "🧟‍♀️", "🦴", "🧠", "💀"),
  // Zombie (M)
  mk("zombie-m", "🧟", "Zombie", "M", "🧟", "🦴", "🧠", "💀"),
  // Supervillain (F)
  mk("villain-f", "🦹‍♀️", "Supervillain", "F", "🦹‍♀️", "💣", "🧨", "🔥"),
  // Supervillain (M)
  mk("villain-m", "🦹", "Supervillain", "M", "🦹", "💣", "🧨", "🔥"),
  // Werewolf (F)
  mk("werewolf-f", "🐺", "Werewolf", "F", "🐺", "🌕", "🐾", "🔥"),
  // Werewolf (M)
  mk("werewolf-m", "🐺", "Werewolf", "M", "🐺", "🌕", "🐾", "🔥"),
  // Elf (F)
  mk("elf-f", "🧝", "Elf", "F", "🧝", "🍃", "🌙", "✨"),
  // Elf (M)
  mk("elf-m", "🧝‍♂️", "Elf", "M", "🧝‍♂️", "🍃", "🌙", "✨"),
  // Superhero (F)
  mk("hero-f", "🦸‍♀️", "Superhero", "F", "🦸‍♀️", "💫", "🛡️", "💥"),
  // Superhero (M)
  mk("hero-m", "🦸", "Superhero", "M", "🦸", "💫", "🛡️", "💥"),
  // Dragon (F)
  mk("dragon-f", "🐉", "Dragon", "F", "🐉", "🐣", "🔥", "💨"),
  // Dragon (M)
  mk("dragon-m", "🐉", "Dragon", "M", "🐉", "🐣", "🔥", "💨"),
];

/** Map a baseEmoji to its category (if any). */
export const BASE_EMOJI_TO_CATEGORY: Record<string, CharacterCategory> = Object.fromEntries(
  CHARACTER_CATEGORIES.map((c) => [c.baseEmoji, c]),
);

/**
 * Return the visible emoji for a character at a given level (0..5).
 *  - 0 = baby/base (level 0 = the base emoji).
 *  - 1..4 = ladder levels.
 *  - 5 = the "final" form (usually the base emoji, i.e. the adult).
 */
export function emojiForLevel(category: CharacterCategory | undefined, level: number): string {
  if (!category) return "";
  if (level <= 0) return category.ladder[0].emoji;
  if (level >= 5) return category.finalEmoji;
  return category.ladder[Math.max(0, level - 1)].emoji;
}

/** Get the title for a level. */
export function titleForLevel(category: CharacterCategory | undefined, level: number): string {
  if (!category) return "";
  if (level <= 0) return category.ladder[0].title;
  if (level >= 5) return category.displayName;
  return category.ladder[Math.max(0, level - 1)].title;
}

/** All base emojis that the catalog supports (deduplicated). */
export const SUPPORTED_BASE_EMOJIS: { emoji: string; displayName: string; gender: "F" | "M" | "X" }[] = (() => {
  const seen = new Set<string>();
  return CHARACTER_CATEGORIES.filter((c) => {
    if (seen.has(c.baseEmoji)) return false;
    seen.add(c.baseEmoji);
    return true;
  }).map((c) => ({ emoji: c.baseEmoji, displayName: c.displayName, gender: c.gender }));
})();
